import * as assert from 'assert';
import { Block } from '../storage';
import { toPreviewBackground, buildErrorHtml, buildSidebarHtml, composePreviewSrcdoc, escapeHtml, jsonForScript, PageOptions, toTileSize, truncateCode } from '../sidebar/html';

const options: PageOptions = { cspSource: 'vscode-resource:', nonce: 'abc123', styleUri: 'vscode-resource:/sidebar.css', scriptUri: 'vscode-resource:/sidebar.js', codiconUri: 'vscode-resource:/codicon.css', tileSize: 'small', previewBackground: 'light' };

function makeBlock(overrides: Partial<Block> = {}): Block {
	return { id: '1', name: 'Button', language: 'html', code: '<button>Hi</button>', createdAt: '2026-01-01T00:00:00.000Z', ...overrides };
}

suite('Sidebar html', () => {
	test('escapeHtml escapes markup characters', () => {
		assert.strictEqual(escapeHtml(`<a href="x" onclick='y'>&</a>`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
	});

	test('shows an empty state when there are no blocks', () => {
		const html = buildSidebarHtml([], options);
		assert.ok(html.includes('No blocks yet'));
		assert.ok(html.includes('select some code'));
		assert.ok(html.includes('href="command:blockboard.saveBlock"'));
		assert.ok(!html.includes('<script'));
		assert.ok(!html.includes('class="cards"'));
	});

	test('lists every block by name, with a language badge only for non-html blocks', () => {
		const html = buildSidebarHtml([makeBlock({ name: 'One' }), makeBlock({ id: '2', name: 'Two', language: 'css' })], options);
		assert.ok(html.includes('One') && html.includes('Two'));
		assert.ok(html.includes('<span class="card-language">css</span>'));
		assert.ok(!html.includes('>html<'));
		assert.strictEqual(html.match(/class="card"/g)?.length, 2);
	});

	test('the body carries the tile size class', () => {
		assert.ok(buildSidebarHtml([makeBlock()], options).includes('<body class="tiles-small bg-light">'));
		assert.ok(buildSidebarHtml([makeBlock()], { ...options, tileSize: 'large' }).includes('<body class="tiles-large bg-light">'));
	});

	test('the body carries the preview background and the toggle names the other one', () => {
		const dark = buildSidebarHtml([makeBlock()], { ...options, previewBackground: 'dark' });
		assert.ok(dark.includes('bg-dark"'));
		assert.ok(dark.includes('id="background-toggle" title="Preview on a light background"'));
		assert.ok(buildSidebarHtml([makeBlock()], options).includes('title="Preview on a dark background"'));
	});

	test('toPreviewBackground accepts light and dark and falls back to light', () => {
		assert.strictEqual(toPreviewBackground('dark'), 'dark');
		assert.strictEqual(toPreviewBackground('purple'), 'light');
		assert.strictEqual(toPreviewBackground(undefined), 'light');
	});

	test('toTileSize accepts the known sizes and falls back to small', () => {
		assert.strictEqual(toTileSize('medium'), 'medium');
		assert.strictEqual(toTileSize('huge'), 'small');
		assert.strictEqual(toTileSize(undefined), 'small');
	});

	test('loads the codicon stylesheet and allows fonts from the extension', () => {
		const html = buildSidebarHtml([makeBlock()], options);
		assert.ok(html.includes('<link rel="stylesheet" href="vscode-resource:/codicon.css">'));
		const csp = /Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? '';
		assert.ok(csp.includes('font-src vscode-resource: data:'));
	});

	test('escapes block names and languages', () => {
		const html = buildSidebarHtml([makeBlock({ name: '<script>alert(1)</script>', language: '"><img>' })], options);
		assert.ok(!html.includes('<script>alert'));
		assert.ok(!html.includes('<img>'));
		assert.ok(html.includes('&lt;script&gt;'));
	});

	test('html blocks render in a sandboxed iframe with no allow-* permissions', () => {
		const html = buildSidebarHtml([makeBlock()], options);
		assert.ok(html.includes('<iframe class="preview-frame" sandbox=""'));
		assert.ok(!html.includes('allow-scripts') && !html.includes('allow-same-origin'));
		assert.ok(html.includes('&lt;button&gt;Hi&lt;/button&gt;'));
	});

	test('the srcdoc attribute cannot be broken out of by block content', () => {
		const html = buildSidebarHtml([makeBlock({ code: '"><script>alert(1)</script><b x="' })], options);
		assert.ok(!html.includes('<script>alert'));
		assert.strictEqual(html.match(/<iframe class="preview-frame"/g)?.length, 1);
		assert.ok(html.includes('&quot;&gt;&lt;script&gt;'));
	});

	test('the srcdoc is composed from code plus css', () => {
		const html = buildSidebarHtml([makeBlock({ css: 'button { color: red; }' })], options);
		assert.ok(html.includes('button { color: red; }'));
	});

	test('css-only blocks show the placeholder X and no iframe', () => {
		const html = buildSidebarHtml([makeBlock({ language: 'css', code: 'a { color: red; }' })], options);
		assert.ok(html.includes('class="preview-placeholder"'));
		assert.ok(!html.includes('<iframe class="preview-frame"'));
		assert.ok(!html.includes('class="preview-code"'));
	});

	test('other languages show an escaped, truncated code card and no iframe', () => {
		const code = Array.from({ length: 30 }, (_, i) => `line ${i} <b>`).join('\n');
		const html = buildSidebarHtml([makeBlock({ language: 'python', code })], options);
		assert.ok(!html.includes('<iframe class="preview-frame"'));
		const card = /<pre class="preview-code">([\s\S]*?)<\/pre>/.exec(html)?.[1] ?? '';
		assert.ok(card.includes('line 0 &lt;b&gt;'));
		assert.ok(!card.includes('line 29'));
		assert.ok(html.includes('<span class="card-language">python</span>'));
	});

	test('every card has the same structure whatever the language', () => {
		const html = buildSidebarHtml([makeBlock(), makeBlock({ id: '2', language: 'css' }), makeBlock({ id: '3', language: 'ts' })], options);
		assert.strictEqual(html.match(/<div class="preview">/g)?.length, 3);
		assert.strictEqual(html.match(/class="card-info"/g)?.length, 3);
	});

	test('sets a strict CSP with the nonce and no remote sources', () => {
		const html = buildSidebarHtml([], options);
		const csp = /Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? '';
		assert.ok(csp.includes(`default-src 'none'`));
		assert.ok(csp.includes(`script-src 'nonce-abc123'`));
		assert.ok(!/https?:/.test(csp));
		assert.ok(!csp.includes('unsafe-eval'));
		const scriptSrc = /script-src ([^;]*)/.exec(csp)?.[1] ?? '';
		assert.ok(!scriptSrc.includes('unsafe-'));
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

suite('Preview background', () => {
	test('dark previews use a dark canvas with light text', () => {
		const html = composePreviewSrcdoc({ code: '<p>x</p>' }, 'dark');
		assert.ok(html.includes('background: #1e1e1e'));
		assert.ok(html.includes('color: #e6e6e6'));
	});
});

suite('truncateCode', () => {
	test('leaves short code alone', () => {
		assert.strictEqual(truncateCode('a\nb'), 'a\nb');
	});

	test('cuts to the line limit and marks it', () => {
		assert.strictEqual(truncateCode('1\n2\n3\n4', 2, 100), '1\n2\n…');
	});

	test('cuts to the character limit and marks it', () => {
		assert.strictEqual(truncateCode('abcdefghij', 8, 4), 'abcd\n…');
	});
});

suite('Sidebar edit UI markup', () => {
	test('every card has an Edit button carrying the block id', () => {
		const html = buildSidebarHtml([makeBlock({ id: 'a1' }), makeBlock({ id: 'b2', language: 'css' })], options);
		assert.strictEqual(html.match(/class="edit-button"/g)?.length, 2);
		assert.ok(html.includes('data-id="a1"') && html.includes('data-id="b2"'));
	});

	test('every card has Copy and Delete buttons carrying the block id', () => {
		const html = buildSidebarHtml([makeBlock({ id: 'a1' }), makeBlock({ id: 'b2', language: 'python' })], options);
		assert.strictEqual(html.match(/class="copy-button" data-id="[^"]+" title="Copy"/g)?.length, 2);
		assert.strictEqual(html.match(/class="delete-button" data-id="[^"]+" title="Delete"/g)?.length, 2);
	});

	test('every card has an Insert button, placed before Delete', () => {
		const html = buildSidebarHtml([makeBlock({ id: 'a1' }), makeBlock({ id: 'b2', language: 'python' })], options);
		assert.strictEqual(html.match(/class="insert-button" data-id="[^"]+" title="Insert"/g)?.length, 2);
		assert.ok(html.indexOf('class="insert-button"') < html.indexOf('class="delete-button"'));
	});

	test('action buttons are icons with a tooltip and a label naming the block', () => {
		const html = buildSidebarHtml([makeBlock({ name: 'Hero <b>' })], options);
		for (const [label, icon] of [['Edit', 'edit'], ['Copy', 'copy'], ['Insert', 'insert'], ['Delete', 'trash']]) {
			assert.ok(html.includes(`title="${label}" aria-label="${label} Hero &lt;b&gt;"><span class="codicon codicon-${icon}" aria-hidden="true"></span></button>`), label);
		}
	});

	test('button ids are escaped', () => {
		const html = buildSidebarHtml([makeBlock({ id: '"><b>' })], options);
		assert.ok(!html.includes('"><b>'));
	});

	test('includes the modal with a sandboxed preview iframe', () => {
		const html = buildSidebarHtml([makeBlock()], options);
		assert.ok(html.includes('id="edit-modal"'));
		assert.ok(/<iframe id="edit-preview"[^>]*sandbox=""/.test(html));
		assert.ok(html.indexOf('id="edit-preview-box"') < html.indexOf('id="edit-name"'), 'preview comes before the fields');
		assert.ok(html.includes('role="dialog"') && html.includes('id="edit-error" class="error" role="alert"'));
		assert.ok(!html.includes('allow-scripts') && !html.includes('allow-same-origin'));
	});

	test('loads the sidebar script only with the nonce, and only when there are blocks', () => {
		const withBlocks = buildSidebarHtml([makeBlock()], options);
		assert.ok(withBlocks.includes('<script nonce="abc123" src="vscode-resource:/sidebar.js"></script>'));
		assert.strictEqual(withBlocks.match(/<script/g)?.length, 2);
		const empty = buildSidebarHtml([], options);
		assert.ok(!empty.includes('<script'));
	});

	test('block data is embedded as inert JSON that cannot close its script element', () => {
		const html = buildSidebarHtml([makeBlock({ code: '</script><script>alert(1)</script>' })], options);
		assert.ok(html.includes('<script id="blocks-data" type="application/json">'));
		assert.ok(!html.includes('</script><script>alert'));
		const json = /<script id="blocks-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
		assert.strictEqual(JSON.parse(json)[0].code, '</script><script>alert(1)</script>');
	});

	test('jsonForScript round-trips and escapes <', () => {
		const value = { a: '<b>', c: 1 };
		assert.ok(!jsonForScript(value).includes('<'));
		assert.deepStrictEqual(JSON.parse(jsonForScript(value)), value);
	});

	test('the data includes css, defaulting to an empty string', () => {
		const html = buildSidebarHtml([makeBlock(), makeBlock({ id: '2', css: 'a{}' })], options);
		const json = /<script id="blocks-data" type="application\/json">([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
		assert.deepStrictEqual(JSON.parse(json).map((b: { css: string }) => b.css), ['', 'a{}']);
	});
});
