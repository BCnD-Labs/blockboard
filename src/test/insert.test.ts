import * as assert from 'assert';
import * as vscode from 'vscode';
import { insertBlock } from '../actions';
import { Block } from '../storage';

const html: Block = { id: '1', name: 'Button', language: 'html', code: '<button>Hi</button>', css: 'button { color: red; }', createdAt: '2026-01-01T00:00:00.000Z' };
const plain: Block = { id: '2', name: 'Plain', language: 'html', code: '<p>x</p>', createdAt: '2026-01-01T00:00:00.000Z' };

async function openEditor(content: string): Promise<vscode.TextEditor> {
	const document = await vscode.workspace.openTextDocument({ content });
	return vscode.window.showTextDocument(document);
}

suite('Insert Block', () => {
	teardown(async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
	});

	test('inserts at the cursor', async () => {
		const editor = await openEditor('ab');
		editor.selection = new vscode.Selection(0, 1, 0, 1);
		assert.strictEqual(await insertBlock(plain), true);
		assert.strictEqual(editor.document.getText(), 'a<p>x</p>b');
	});

	test('replaces the selection', async () => {
		const editor = await openEditor('one TWO three');
		editor.selection = new vscode.Selection(0, 4, 0, 7);
		await insertBlock(plain);
		assert.strictEqual(editor.document.getText(), 'one <p>x</p> three');
	});

	test('puts the css field in a style element after the markup', async () => {
		const editor = await openEditor('');
		await insertBlock(html);
		assert.strictEqual(editor.document.getText(), '<button>Hi</button>\n<style>\nbutton { color: red; }\n</style>');
	});

	test('warns and inserts nothing when there is no editor', async () => {
		await vscode.commands.executeCommand('workbench.action.closeAllEditors');
		assert.strictEqual(await insertBlock(html), false);
	});
});
