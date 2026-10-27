import { Block } from '../storage';

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export const TILE_SIZES = ['small', 'medium', 'large'] as const;
export type TileSize = typeof TILE_SIZES[number];

export function toTileSize(value: unknown): TileSize {
	return TILE_SIZES.find(size => size === value) ?? 'small';
}

export interface PageOptions {
	cspSource: string;
	nonce: string;
	styleUri: string;
	scriptUri: string;
	codiconUri: string;
	tileSize: TileSize;
}

// Block data is put in a JSON script element, which the browser never runs. "<" is escaped so
// the data cannot close the element early.
export function jsonForScript(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

function page(body: string, options: PageOptions, withScript = false): string {
	const csp = [
		`default-src 'none'`,
		// Preview iframes (srcdoc) inherit this policy, so inline styles must be allowed for block CSS to apply.
		`style-src ${options.cspSource} 'unsafe-inline'`,
		`img-src data:`,
		`font-src ${options.cspSource} data:`,
		`script-src 'nonce-${options.nonce}'`
	].join('; ');
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="${csp}">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="${escapeHtml(options.codiconUri)}">
	<link rel="stylesheet" href="${escapeHtml(options.styleUri)}">
	<title>Blockboard</title>
</head>
<body class="tiles-${options.tileSize}">
${body}${withScript ? `
<script nonce="${options.nonce}" src="${escapeHtml(options.scriptUri)}"></script>` : ''}
</body>
</html>`;
}

export const CODE_CARD_MAX_LINES = 8;
export const CODE_CARD_MAX_CHARS = 400;

export function truncateCode(code: string, maxLines = CODE_CARD_MAX_LINES, maxChars = CODE_CARD_MAX_CHARS): string {
	let text = code.length > maxChars ? code.slice(0, maxChars) : code;
	const lines = text.split('\n');
	if (lines.length > maxLines) {
		text = lines.slice(0, maxLines).join('\n');
	}
	return text.length < code.length ? `${text}\n…` : text;
}

function previewFor(block: Block): string {
	if (block.language === 'html') {
		// sandbox="" turns every restriction on: no scripts and no same-origin access.
		return `<iframe class="preview-frame" sandbox="" tabindex="-1" title="Preview of ${escapeHtml(block.name)}" srcdoc="${escapeHtml(composePreviewSrcdoc(block))}"></iframe>`;
	}
	if (block.language === 'css') {
		return '<div class="preview-placeholder" role="img" aria-label="CSS only, nothing to preview">X</div>';
	}
	return `<pre class="preview-code">${escapeHtml(truncateCode(block.code))}</pre>`;
}

const ACTIONS = [
	{ cls: 'edit-button', label: 'Edit', icon: 'edit' },
	{ cls: 'copy-button', label: 'Copy', icon: 'copy' },
	{ cls: 'insert-button', label: 'Insert', icon: 'insert' },
	{ cls: 'delete-button', label: 'Delete', icon: 'trash' }
];

// Icon-only buttons: the title is the tooltip and the aria-label names the block for screen readers.
function actionButtons(block: Block): string {
	const id = escapeHtml(block.id);
	const name = escapeHtml(block.name);
	return ACTIONS
		.map(a => `<button type="button" class="${a.cls}" data-id="${id}" title="${a.label}" aria-label="${a.label} ${name}"><span class="codicon codicon-${a.icon}" aria-hidden="true"></span></button>`)
		.join('');
}

// HTML is the usual case, so only other languages get a badge.
function languageBadge(block: Block): string {
	return block.language === 'html' ? '' : `<span class="card-language">${escapeHtml(block.language)}</span>`;
}

function cardFor(block: Block): string {
	return `\t<li class="card" title="${escapeHtml(block.name)}">
\t\t<div class="card-thumb">
\t\t\t<div class="preview">${previewFor(block)}</div>${languageBadge(block)}
\t\t\t<div class="card-actions">${actionButtons(block)}</div>
\t\t</div>
\t\t<div class="card-info"><span class="card-name">${escapeHtml(block.name)}</span></div>
\t</li>`;
}

const EDIT_MODAL = `<div id="edit-modal" class="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" hidden>
	<form id="edit-form" class="modal-body">
		<h2 id="edit-title">Edit block</h2>
		<div id="edit-preview-box" class="modal-preview"><iframe id="edit-preview" class="modal-frame" sandbox="" tabindex="-1" title="Live preview"></iframe></div>
		<label>Name<input id="edit-name" type="text" autocomplete="off" aria-describedby="edit-error"></label>
		<label id="edit-code-label"><span id="edit-code-title">HTML</span><textarea id="edit-code" class="field-code" rows="8" spellcheck="false"></textarea></label>
		<label id="edit-css-label">CSS<textarea id="edit-css" class="field-css" rows="5" spellcheck="false"></textarea></label>
		<p id="edit-error" class="error" role="alert"></p>
		<div class="modal-actions"><button type="submit" class="primary">Save</button><button type="button" id="edit-cancel" class="secondary">Cancel</button></div>
	</form>
</div>`;

export function buildSidebarHtml(blocks: Block[], options: PageOptions): string {
	if (blocks.length === 0) {
		return page('<p class="empty">No blocks saved yet. Select some code and run "Blockboard: Save Block".</p>', options);
	}
	const data = blocks.map(b => ({ id: b.id, name: b.name, language: b.language, code: b.code, css: b.css ?? '' }));
	const body = `<ul class="cards">\n${blocks.map(cardFor).join('\n')}\n</ul>
${EDIT_MODAL}
<script id="blocks-data" type="application/json">${jsonForScript(data)}</script>`;
	return page(body, options, true);
}

export function buildErrorHtml(message: string, options: PageOptions): string {
	return page(`<p class="error">${escapeHtml(message)}</p>`, options);
}

export const PREVIEW_CSP = `default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:`;

// Plain high-contrast canvas so previews look the same regardless of the VS Code theme.
const PREVIEW_BASE_CSS = 'html, body { margin: 0; padding: 8px; background: #ffffff; color: #000000; font-family: sans-serif; }';

export function composePreviewSrcdoc(block: Pick<Block, 'code' | 'css'>): string {
	// The css field is appended after the code so it can override styles that are inline in the code.
	// A literal "</style" in the css would end the style element early, so it is broken up.
	const css = block.css ? `\n<style>${block.css.replace(/<\/style/gi, '<\\/style')}</style>` : '';
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${PREVIEW_CSP}">
<style>${PREVIEW_BASE_CSS}</style>
</head>
<body>
${block.code}${css}
</body>
</html>`;
}
