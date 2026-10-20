import * as assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Block, BlockStorage, FolderStorage, GlobalStateStorage } from '../storage';

class MemoryMemento implements vscode.Memento {
	private data = new Map<string, unknown>();

	keys(): readonly string[] {
		return [...this.data.keys()];
	}

	get<T>(key: string, defaultValue?: T): T | undefined {
		return this.data.has(key) ? this.data.get(key) as T : defaultValue;
	}

	async update(key: string, value: unknown): Promise<void> {
		this.data.set(key, value);
	}
}

function makeBlock(id: string, overrides: Partial<Block> = {}): Block {
	return {
		id,
		name: `Block ${id}`,
		language: 'html',
		code: '<button>Hi</button>',
		createdAt: '2026-01-01T00:00:00.000Z',
		...overrides
	};
}

function ids(blocks: Block[]): string[] {
	return blocks.map(b => b.id).sort();
}

function runStorageTests(label: string, makeStorage: () => Promise<BlockStorage>) {
	suite(`${label} (shared behavior)`, () => {
		let storage: BlockStorage;

		setup(async () => {
			storage = await makeStorage();
		});

		test('list is empty for a new library', async () => {
			assert.deepStrictEqual(await storage.list(), []);
		});

		test('save then list returns the block', async () => {
			const block = makeBlock('1', { css: 'button { color: red; }' });
			await storage.save(block);
			assert.deepStrictEqual(await storage.list(), [block]);
		});

		test('save keeps several blocks', async () => {
			await storage.save(makeBlock('1'));
			await storage.save(makeBlock('2'));
			assert.deepStrictEqual(ids(await storage.list()), ['1', '2']);
		});

		test('update changes the fields and sets updatedAt', async () => {
			const original = makeBlock('1');
			await storage.save(original);
			await storage.update({ ...original, name: 'Renamed', code: '<a>x</a>', css: 'a { color: blue; }' });

			const [updated] = await storage.list();
			assert.strictEqual(updated.name, 'Renamed');
			assert.strictEqual(updated.code, '<a>x</a>');
			assert.strictEqual(updated.css, 'a { color: blue; }');
			assert.ok(updated.updatedAt && !isNaN(Date.parse(updated.updatedAt)));
		});

		test('update keeps id and createdAt and leaves other blocks alone', async () => {
			const first = makeBlock('1');
			const second = makeBlock('2');
			await storage.save(first);
			await storage.save(second);
			await storage.update({ ...first, name: 'Renamed' });

			const blocks = await storage.list();
			assert.strictEqual(blocks.length, 2);
			const updated = blocks.find(b => b.id === '1');
			assert.strictEqual(updated?.createdAt, first.createdAt);
			assert.deepStrictEqual(blocks.find(b => b.id === '2'), second);
		});

		test('update of a missing block rejects and does not create it', async () => {
			await assert.rejects(storage.update(makeBlock('missing')));
			assert.deepStrictEqual(await storage.list(), []);
		});

		test('delete removes only that block', async () => {
			await storage.save(makeBlock('1'));
			await storage.save(makeBlock('2'));
			await storage.delete('1');
			assert.deepStrictEqual(ids(await storage.list()), ['2']);
		});

		test('v0.1 blocks (no css, no updatedAt) load unchanged', async () => {
			const v01 = makeBlock('old');
			assert.ok(!('css' in v01) && !('updatedAt' in v01));
			await storage.save(v01);
			assert.deepStrictEqual(await storage.list(), [v01]);
		});
	});
}

suite('GlobalStateStorage', () => {
	runStorageTests('GlobalStateStorage', async () => new GlobalStateStorage(new MemoryMemento()));
});

suite('FolderStorage', () => {
	const folders: vscode.Uri[] = [];

	async function makeFolder(): Promise<vscode.Uri> {
		const folder = vscode.Uri.file(path.join(os.tmpdir(), `blockboard-test-${Date.now()}-${Math.random().toString(36).slice(2)}`));
		folders.push(folder);
		return folder;
	}

	teardown(async () => {
		for (const folder of folders.splice(0)) {
			await vscode.workspace.fs.delete(folder, { recursive: true, useTrash: false }).then(undefined, () => undefined);
		}
	});

	runStorageTests('FolderStorage', async () => new FolderStorage(await makeFolder()));

	test('reads a hand-written v0.1 block file from disk', async () => {
		const folder = await makeFolder();
		await vscode.workspace.fs.createDirectory(folder);
		const v01 = '{"id":"123","name":"Old","language":"html","code":"<p>old</p>","createdAt":"2025-01-01T00:00:00.000Z"}';
		await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, '123.json'), Buffer.from(v01, 'utf8'));

		const blocks = await new FolderStorage(folder).list();
		assert.deepStrictEqual(blocks, [JSON.parse(v01)]);
	});

	test('ignores files that are not .json', async () => {
		const folder = await makeFolder();
		await vscode.workspace.fs.createDirectory(folder);
		await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'notes.txt'), Buffer.from('hello', 'utf8'));

		const storage = new FolderStorage(folder);
		await storage.save(makeBlock('1'));
		assert.deepStrictEqual(ids(await storage.list()), ['1']);
	});
});
