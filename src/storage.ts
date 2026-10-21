import * as vscode from 'vscode';

export interface Block {
    id: string;
    name: string;
    language: string;
    code:string;
    createdAt: string;
    css?: string;
    updatedAt?: string;
}

export interface BlockStorage {
    list(): Promise<Block[]>;
    save(block: Block): Promise <void>;
    update(block: Block): Promise<void>;
    delete(id:string): Promise<void>;
}

export class GlobalStateStorage implements BlockStorage {
    constructor(private state: vscode.Memento) {}

    async list (): Promise<Block[]> {
        return this.state.get<Block[]>('blocks', []);
    }

    async save(block: Block): Promise <void> {
        const blocks = await this.list();
        await this.state.update('blocks', [...blocks, block]);
    }

    async update(block: Block): Promise<void> {
        const blocks = await this.list();
        if (!blocks.some(b => b.id === block.id)) {
            throw new Error(`Block ${block.id} not found`);
        }
        const updated = { ...block, updatedAt: new Date().toISOString() };
        await this.state.update('blocks', blocks.map(b => b.id === block.id ? updated : b));
    }

    async delete(id:string): Promise<void> {
        const blocks = await this.list();
        await this.state.update('blocks', blocks.filter(b => b.id !== id));
    }
}


function isBlock(value: unknown): value is Block {
    const b = value as Partial<Block> | null;
    return typeof b === 'object' && b !== null
        && typeof b.id === 'string' && typeof b.name === 'string'
        && typeof b.language === 'string' && typeof b.code === 'string';
}

function timeOf(block: Block): number {
    const time = Date.parse(block.createdAt);
    return isNaN(time) ? 0 : time;
}

export class FolderStorage implements BlockStorage {
    constructor(
        private folder: vscode.Uri,
        private onSkip: (file: string, error: unknown) => void = (file, error) => console.warn(`Blockboard: skipped ${file}`, error)
    ) {}

    private fileFor(id:string): vscode.Uri {
        return vscode.Uri.joinPath(this.folder, `${id}.json`);
    }

    private async readAll(): Promise<{ block: Block; file: vscode.Uri }[]> {
        await vscode.workspace.fs.createDirectory(this.folder);
        const entries = await vscode.workspace.fs.readDirectory(this.folder);
        const found: { block: Block; file: vscode.Uri }[] = [];
        for (const [name, type] of entries) {
            if (type !== vscode.FileType.File || !name.endsWith('.json')) {
                continue;
            }
            const file = vscode.Uri.joinPath(this.folder, name);
            try {
                const bytes = await vscode.workspace.fs.readFile(file);
                const parsed: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
                if (!isBlock(parsed)) {
                    throw new Error('Not a valid block file');
                }
                found.push({ block: parsed, file });
            } catch (error) {
                this.onSkip(name, error);
            }
        }
        return found;
    }

    // Block files are normally named <id>.json, but a file renamed or copied by hand
    // still lists, so fall back to looking for the file that holds this id.
    private async findFile(id: string): Promise<vscode.Uri> {
        const expected = this.fileFor(id);
        try {
            const bytes = await vscode.workspace.fs.readFile(expected);
            const parsed: unknown = JSON.parse(Buffer.from(bytes).toString('utf8'));
            if (isBlock(parsed) && parsed.id === id) {
                return expected;
            }
        } catch {
            // Missing or unreadable; search the folder instead.
        }
        const match = (await this.readAll()).find(entry => entry.block.id === id);
        if (!match) {
            throw new Error(`Block ${id} not found`);
        }
        return match.file;
    }

    async list (): Promise<Block[]> {
        const blocks = (await this.readAll()).map(entry => entry.block);
        return blocks.sort((a, b) => timeOf(b) - timeOf(a));
    }

    async save(block: Block): Promise<void> {
        await vscode.workspace.fs.createDirectory(this.folder);
        const bytes = Buffer.from(JSON.stringify(block, null, 2), 'utf8');
        await vscode.workspace.fs.writeFile(this.fileFor(block.id), bytes);
    }

    async update(block: Block): Promise<void> {
        const file = await this.findFile(block.id);
        const updated = { ...block, updatedAt: new Date().toISOString() };
        await vscode.workspace.fs.writeFile(file, Buffer.from(JSON.stringify(updated, null, 2), 'utf8'));
    }

    async delete(id: string): Promise<void> {
        await vscode.workspace.fs.delete(await this.findFile(id));
    }
}