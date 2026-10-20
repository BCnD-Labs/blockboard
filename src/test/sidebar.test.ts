import * as assert from 'assert';
import { Block } from '../storage';
import { buildErrorHtml, buildSidebarHtml, escapeHtml, PageOptions } from '../sidebar/html';

const options: PageOptions = { cspSource: 'vscode-resource:', nonce: 'abc123', styleUri: 'vscode-resource:/sidebar.css' };

function makeBlock(overrides: Partial<Block> = {}): Block {
	return { id: '1', name: 'Button', language: 'html', code: '<button>Hi</button>', createdAt: '2026-01-01T00:00:00.000Z', ...overrides };
}

suite('Sidebar html', () => {
	test('escapeHtml escapes markup characters', () => {
		assert.strictEqual(escapeHtml(`<a href="x" onclick='y'>&</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
	});

	test('shows an empty state when there are no blocks', () => {
		const html = buildSidebarHtml([], options);
		assert.ok(html.includes('No blocks saved yet'));
		assert.ok(!html.includes('class="blocks"'));
	});

	test('lists every block by name and language', () => {
		const html = buildSidebarHtml([makeBlock({ name: 'One' }), makeBlock({ id: '2', name: 'Two', language: 'css' })], options);
		assert.ok(html.includes('One') && html.includes('Two'));
		assert.ok(html.includes('>css<'));
	});

	test('escapes block names and languages', () => {
		const html = buildSidebarHtml([makeBlock({ name: '<script>alert(1)</script>', language: '"><img>' })], options);
		assert.ok(!html.includes('<script>alert'));
		assert.ok(!html.includes('<img>'));
		assert.ok(html.includes('&lt;script&gt;'));
	});

	test('sets a strict CSP with the nonce and no remote sources', () => {
		const html = buildSidebarHtml([], options);
		const csp = /Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? '';
		assert.ok(csp.includes(`default-src 'none'`));
		assert.ok(csp.includes(`script-src 'nonce-abc123'`));
		assert.ok(!/https?:/.test(csp));
		assert.ok(!csp.includes('unsafe-'));
	});

	test('escapes error messages', () => {
		const html = buildErrorHtml('<b>bad</b>', options);
		assert.ok(html.includes('&lt;b&gt;bad&lt;/b&gt;'));
	});
});
