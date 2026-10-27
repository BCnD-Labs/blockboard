import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension commands', () => {
	suiteSetup(async () => {
		const extension = vscode.extensions.all.find(e => e.packageJSON.name === 'blockboard');
		assert.ok(extension, 'the extension is loaded');
		await extension.activate();
	});

	test('registers the original three commands plus Edit Block, Insert Block and the internal refresh', async () => {
		const commands = await vscode.commands.getCommands(true);
		for (const id of ['saveBlock', 'listBlocks', 'deleteBlock', 'editBlock', 'insertBlock', 'refreshSidebar']) {
			assert.ok(commands.includes(`blockboard.${id}`), `blockboard.${id} is registered`);
		}
	});

	test('contributes Insert Block with the Blockboard category', () => {
		const extension = vscode.extensions.all.find(e => e.packageJSON.name === 'blockboard');
		const insert = extension?.packageJSON.contributes.commands.find((c: { command: string }) => c.command === 'blockboard.insertBlock');
		assert.deepStrictEqual({ title: insert.title, category: insert.category }, { title: 'Insert Block', category: 'Blockboard' });
	});

	test('contributes Edit Block with the Blockboard category and keeps refresh out of the palette', () => {
		const extension = vscode.extensions.all.find(e => e.packageJSON.name === 'blockboard');
		const contributes = extension?.packageJSON.contributes;
		const edit = contributes.commands.find((c: { command: string }) => c.command === 'blockboard.editBlock');
		assert.deepStrictEqual({ title: edit.title, category: edit.category }, { title: 'Edit Block', category: 'Blockboard' });
		const hidden = contributes.menus.commandPalette.find((m: { command: string }) => m.command === 'blockboard.refreshSidebar');
		assert.strictEqual(hidden.when, 'false');
	});

	test('shows Save Block and Refresh as buttons in the sidebar title bar', () => {
		const extension = vscode.extensions.all.find(e => e.packageJSON.name === 'blockboard');
		const contributes = extension?.packageJSON.contributes;
		const inTitleBar = contributes.menus['view/title']
			.filter((m: { when: string }) => m.when === 'view == blockboard.sidebar')
			.map((m: { command: string }) => m.command);
		assert.deepStrictEqual(inTitleBar, ['blockboard.saveBlock', 'blockboard.refreshSidebar']);
		for (const id of inTitleBar) {
			const command = contributes.commands.find((c: { command: string }) => c.command === id);
			assert.ok(command.icon, `${id} has an icon`);
		}
	});
});
