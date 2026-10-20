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
