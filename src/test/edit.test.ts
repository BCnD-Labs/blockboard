import * as assert from 'assert';
import { Block } from '../storage';
import { applyEdit, messageType, parseEditRequest, parsePreviewRequest } from '../sidebar/edit';

const html: Block = { id: '1', name: 'Old', language: 'html', code: '<p>old</p>', css: 'p { color: red; }', createdAt: '2026-01-01T00:00:00.000Z' };
const python: Block = { id: '2', name: 'Py', language: 'python', code: 'print(1)', createdAt: '2026-01-01T00:00:00.000Z' };

suite('Edit requests', () => {
	test('parseEditRequest accepts a good request and trims the name', () => {
		assert.deepStrictEqual(parseEditRequest({ type: 'save', id: '1', name: '  New  ', code: 'x', css: 'y' }), { id: '1', name: 'New', code: 'x', css: 'y' });
	});

	test('parseEditRequest rejects an empty or blank name', () => {
		assert.strictEqual(parseEditRequest({ type: 'save', id: '1', name: '   ', code: 'x' }), 'Name cannot be empty.');
		assert.strictEqual(parseEditRequest({ type: 'save', id: '1', name: '', code: 'x' }), 'Name cannot be empty.');
	});

	test('parseEditRequest rejects malformed messages', () => {
		for (const bad of [undefined, null, 'x', {}, { id: 1, name: 'a', code: 'x' }, { id: '', name: 'a', code: 'x' }, { id: '1', name: 'a', code: 5 }, { id: '1', name: 'a', code: 'x', css: 5 }]) {
			assert.strictEqual(parseEditRequest(bad), 'Could not read the edit.');
		}
	});

	test('parsePreviewRequest accepts only the expected shape', () => {
		assert.deepStrictEqual(parsePreviewRequest({ type: 'preview', requestId: 3, code: 'a', css: 'b' }), { requestId: 3, code: 'a', css: 'b' });
		assert.strictEqual(parsePreviewRequest({ requestId: '3', code: 'a', css: 'b' }), undefined);
		assert.strictEqual(parsePreviewRequest(null), undefined);
	});

	test('messageType reads the type safely', () => {
		assert.strictEqual(messageType({ type: 'save' }), 'save');
		assert.strictEqual(messageType({ type: 5 }), undefined);
		assert.strictEqual(messageType(undefined), undefined);
	});
});

suite('applyEdit', () => {
	test('changes name, code and css of an html block but not id, createdAt or language', () => {
		const next = applyEdit(html, { id: '1', name: 'New', code: '<p>new</p>', css: 'p { color: blue; }' });
		assert.deepStrictEqual(next, { ...html, name: 'New', code: '<p>new</p>', css: 'p { color: blue; }' });
	});

	test('does not modify the block it was given', () => {
		const copy = { ...html };
		applyEdit(html, { id: '1', name: 'New', code: 'x', css: '' });
		assert.deepStrictEqual(html, copy);
	});

	test('an empty css removes the css field', () => {
		assert.ok(!('css' in applyEdit(html, { id: '1', name: 'Old', code: html.code, css: '' })));
	});

	test('a missing css keeps the existing one', () => {
		assert.strictEqual(applyEdit(html, { id: '1', name: 'Old', code: 'x' }).css, 'p { color: red; }');
	});

	test('non-html blocks only change name and code, even if css is sent', () => {
		const next = applyEdit(python, { id: '2', name: 'Py2', code: 'print(2)', css: 'a{}' });
		assert.deepStrictEqual(next, { ...python, name: 'Py2', code: 'print(2)' });
		assert.ok(!('css' in next));
	});
});
