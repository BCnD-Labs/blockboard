import * as assert from 'assert';
import { Block } from '../storage';
import { buildErrorHtml, buildSidebarHtml, composePreviewSrcdoc, escapeHtml, PageOptions } from '../sidebar/html';

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

suite('Preview srcdoc', () => {
	const bodyOf = (html: string) => /<body>\n([\s\S]*)\n<\/body>/.exec(html)?.[1] ?? '';

	test('inline-only: keeps the code (with its own <style>) and adds no extra style block', () => {
		const code = '<style>.b { color: red; }</style><button class="b">Hi</button>';
		assert.strictEqual(bodyOf(composePreviewSrcdoc({ code })), code);
	});

	test('inline style attributes are kept as they are', () => {
		const code = '<button style="color: red">Hi</button>';
		assert.ok(composePreviewSrcdoc({ code }).includes(code));
	});

	test('css-only field: the css is added in a style element after the code', () => {
		const body = bodyOf(composePreviewSrcdoc({ code: '<button>Hi</button>', css: 'button { color: red; }' }));
		assert.strictEqual(body, '<button>Hi</button>\n<style>button { color: red; }</style>');
	});

	test('both: inline styles come first and the css field is appended after the code', () => {
		const code = '<style>.b { color: red; }</style><button class="b">Hi</button>';
		const body = bodyOf(composePreviewSrcdoc({ code, css: '.b { color: blue; }' }));
		assert.strictEqual(body, `${code}\n<style>.b { color: blue; }</style>`);
		assert.ok(body.indexOf('color: red') < body.indexOf('color: blue'));
	});

	test('an empty or missing css field adds no style element', () => {
		assert.strictEqual(bodyOf(composePreviewSrcdoc({ code: '<p>x</p>', css: '' })), '<p>x</p>');
		assert.strictEqual(bodyOf(composePreviewSrcdoc({ code: '<p>x</p>' })), '<p>x</p>');
	});

	test('a </style> inside the css cannot close the style element early', () => {
		const html = composePreviewSrcdoc({ code: '<p>x</p>', css: 'a{}</style><img src=x>' });
		assert.ok(!html.includes('</style><img'));
		assert.strictEqual(html.match(/<\/style>/g)?.length, 2);
	});

	test('has a strict CSP: no scripts and no remote resources', () => {
		const html = composePreviewSrcdoc({ code: '<script>alert(1)</script>' });
		const csp = /Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? '';
		assert.ok(csp.includes(`default-src 'none'`));
		assert.ok(!csp.includes('script-src'));
		assert.ok(!/https?:/.test(csp));
	});

	test('uses a plain white background with black text', () => {
		const html = composePreviewSrcdoc({ code: '' });
		assert.ok(html.includes('background: #ffffff'));
		assert.ok(html.includes('color: #000000'));
	});
});
