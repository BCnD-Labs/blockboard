import * as vscode from 'vscode';

export interface Block {
    id: string;
    name: string;
    language: string;
    code:string;
    createdAt: string;
}

export interface BlockStorage {
    list(): Promise<Block[]>;
    save(block: Block): Promise <void>;
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

    async delete(id:string): Promise<void> {
        const blocks = await this.list();
        await this.state.update('blocks', blocks.filter(b => b.id !== id));
    }
}