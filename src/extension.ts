// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Block, FolderStorage, GlobalStateStorage } from './storage';
import * as os from 'os';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "blockboard" is now active!');

	const storage = new FolderStorage(vscode.Uri.joinPath(vscode.Uri.file(os.homedir()), 'Blockboard'));

	const disposable = vscode.commands.registerCommand('blockboard.saveBlock', async () => {

		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			vscode.window.showWarningMessage('Open a file first.');
			return;
		}
		const text = editor.document.getText(editor.selection);
		if (!text) {
			vscode.window.showWarningMessage('Select some code first.');
			return;
		}

		const name = await vscode.window.showInputBox({ prompt: 'Name this Block'});
		if (!name) {
			return;
		}

		const block: Block = {
			id: Date.now().toString(),
			name,
			language: editor.document.languageId,
			code: text,
			createdAt: new Date().toISOString()
		};

		await storage.save(block);

		vscode.window.showInformationMessage(`Saved "${name}" (${(await storage.list()).length} total) `);
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
