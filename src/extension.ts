import * as vscode from 'vscode';
import { Block, BlockStorage, FolderStorage, GlobalStateStorage, newBlockId } from './storage';
import * as os from 'os';
import { SidebarProvider } from './sidebar/provider';
import { copyBlock, deleteBlockWithConfirmation, insertBlock, targetEditor } from './actions';

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


export function activate(context: vscode.ExtensionContext) {

	const sidebar = new SidebarProvider(context.extensionUri, () => createStorage(context));
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebar),
		vscode.commands.registerCommand('blockboard.refreshSidebar', () => sidebar.refresh()),
		vscode.workspace.onDidChangeConfiguration(e => {
			if (['storageMode', 'libraryPath', 'tileSize', 'previewBackground'].some(key => e.affectsConfiguration(`blockboard.${key}`))) {
				void sidebar.refresh();
			}
		})
	);

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
			id: newBlockId(),
			name,
			language: editor.document.languageId,
			code: text,
			createdAt: new Date().toISOString()
		};

		await storage.save(block);

		await sidebar.refresh();

		vscode.window.showInformationMessage(`Saved "${name}" (${(await storage.list()).length} total) `);
	});

	const listDisposable = vscode.commands.registerCommand('blockboard.listBlocks', async () =>{
		const block = await pickBlock(createStorage(context), 'Search your blocks');
	if (!block) {
		return;
	}
	await copyBlock(block);

	});

	const deleteDisposable = vscode.commands.registerCommand('blockboard.deleteBlock', async () => {
		const storage = createStorage(context);
		const block = await pickBlock(storage, 'Pick a block to delete');
		if (!block) {
			return;
		}
		if (await deleteBlockWithConfirmation(storage, block)) {
			await sidebar.refresh();
		}
	});

	const editDisposable = vscode.commands.registerCommand('blockboard.editBlock', async () => {
		const block = await pickBlock(createStorage(context), 'Pick a block to edit');
		if (!block) {
			return;
		}
		await sidebar.edit(block.id);
	});

	const insertDisposable = vscode.commands.registerCommand('blockboard.insertBlock', async () => {
		if (!targetEditor()) {
			vscode.window.showWarningMessage('Open a file first.');
			return;
		}
		const block = await pickBlock(createStorage(context), 'Pick a block to insert');
		if (!block) {
			return;
		}
		await insertBlock(block);
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(insertDisposable);
	context.subscriptions.push(editDisposable);
	context.subscriptions.push(listDisposable);
	context.subscriptions.push(deleteDisposable);
}

export function deactivate() {}
