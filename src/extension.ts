// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Block, BlockStorage, FolderStorage, GlobalStateStorage } from './storage';
import * as os from 'os';

function createStorage(context: vscode.ExtensionContext): BlockStorage {

	const config = vscode.workspace.getConfiguration('blockboard');
	if (config.get<string>('storageMode') === 'globalState') {

		return new GlobalStateStorage(context.globalState);
	}

	const libraryPath = config.get<string>('libraryPath') || os.homedir() + '/Blockboard';
	return new FolderStorage(vscode.Uri.file(libraryPath));

}

async function pickBlock(storage: BlockStorage, placeHolder: string): Promise<Block | undefined> {
	const blocks = await storage.list();
	if (blocks.length === 0) {
		vscode.window.showInformationMessage('No blocks saved yet.');
		return undefined;
	}
	const picked = await vscode.window.showQuickPick(
		blocks.map(b => ({
			label: b.name,
			description: b.language, 
			detail: b.code.replace(/\s+/g, ' ').slice(0, 80),
			block: b
		})),
		{ placeHolder, matchOnDetail: true }
	);
	return picked?.block;
}


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	console.log('Congratulations, your extension "blockboard" is now active!');


	const disposable = vscode.commands.registerCommand('blockboard.saveBlock', async () => {
		const storage = createStorage(context);

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

	const listDisposable = vscode.commands.registerCommand('blockboard.listBlocks', async () =>{
		const block = await pickBlock(createStorage(context), 'Search your blocks');
	if (!block) {
		return;
	}
	await vscode.env.clipboard.writeText(block.code);
	vscode.window.showInformationMessage(`Copied "${block.name}"`);

	});

	const deleteDisposable = vscode.commands.registerCommand('blockboard.deleteBlock', async () => {
		const storage = createStorage(context);
		const block = await pickBlock(storage, 'Pick a block to delete');
		if (!block) {
			return;
		}
		const answer = await vscode.window.showWarningMessage(`Delete "${block.name}"?`, { modal: true }, 'Delete');
		if (answer !== 'Delete') {
			return;
		}
		await storage.delete(block.id);
		vscode.window.showInformationMessage(`Deleted "${block.name}"`);
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(listDisposable);
	context.subscriptions.push(deleteDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
