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


export class FolderStorage implements BlockStorage {
    constructor(private folder: vscode.Uri) {}

    private fileFor(id:string): vscode.Uri {
        return vscode.Uri.joinPath(this.folder, `${id}.json`);
    }

    async list (): Promise<Block[]> {
        await vscode.workspace.fs.createDirectory(this.folder);
        const entries = await vscode.workspace.fs.readDirectory(this.folder);
        const blocks: Block[] = [];
        for (const [name, type] of entries) {
            if (type !== vscode.FileType.File || !name.endsWith('.json')) {
                continue;
            }
            const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.folder, name));
            blocks.push(JSON.parse(Buffer.from(bytes).toString('utf8')) as Block);
        }
        return blocks;
    }

    async save(block: Block): Promise<void> {
        await vscode.workspace.fs.createDirectory(this.folder);
        const bytes = Buffer.from(JSON.stringify(block, null, 2), 'utf8');
        await vscode.workspace.fs.writeFile(this.fileFor(block.id), bytes);
    }

    async update(block: Block): Promise<void> {
        const file = this.fileFor(block.id);
        await vscode.workspace.fs.stat(file);
        const updated = { ...block, updatedAt: new Date().toISOString() };
        await vscode.workspace.fs.writeFile(file, Buffer.from(JSON.stringify(updated, null, 2), 'utf8'));
    }

    async delete(id: string): Promise<void> {
        await vscode.workspace.fs.delete(this.fileFor(id));
    }
}