import * as vscode from 'vscode';
import { blockToText } from './blockText';
import { Block, BlockStorage } from './storage';

export async function copyBlock(block: Block): Promise<void> {
	await vscode.env.clipboard.writeText(blockToText(block));
	vscode.window.showInformationMessage(`Copied "${block.name}"`);
}

// Asks first. Returns true if the block was deleted.
export async function deleteBlockWithConfirmation(storage: BlockStorage, block: Block): Promise<boolean> {
	const answer = await vscode.window.showWarningMessage(`Delete "${block.name}"?`, { modal: true }, 'Delete');
	if (answer !== 'Delete') {
		return false;
	}
	await storage.delete(block.id);
	vscode.window.showInformationMessage(`Deleted "${block.name}"`);
	return true;
}

// The editor Insert Block writes into. The active editor when there is one, otherwise a visible
// text editor (clicking the sidebar can leave no active text editor). Output panels are skipped.
export function targetEditor(): vscode.TextEditor | undefined {
	return vscode.window.activeTextEditor
		?? vscode.window.visibleTextEditors.find(e => e.document.uri.scheme !== 'output');
}

// Inserts at the cursor, replacing any selection. Returns true if the text was inserted.
export async function insertBlock(block: Block): Promise<boolean> {
	const editor = targetEditor();
	if (!editor) {
		vscode.window.showWarningMessage('Open a file first.');
		return false;
	}
	const text = blockToText(block);
	const inserted = await editor.edit(edit => {
		for (const selection of editor.selections) {
			edit.replace(selection, text);
		}
	});
	if (inserted) {
		vscode.window.showInformationMessage(`Inserted "${block.name}"`);
	} else {
		vscode.window.showWarningMessage(`Could not insert "${block.name}" here.`);
	}
	return inserted;
}
