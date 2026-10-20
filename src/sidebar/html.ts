import { Block } from '../storage';

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export interface PageOptions {
	cspSource: string;
	nonce: string;
	styleUri: string;
}

function page(body: string, options: PageOptions): string {
	const csp = [
		`default-src 'none'`,
		`style-src ${options.cspSource}`,
		`script-src 'nonce-${options.nonce}'`
	].join('; ');
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta http-equiv="Content-Security-Policy" content="${csp}">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<link rel="stylesheet" href="${escapeHtml(options.styleUri)}">
	<title>Blockboard</title>
</head>
<body>
${body}
</body>
</html>`;
}

export function buildSidebarHtml(blocks: Block[], options: PageOptions): string {
	if (blocks.length === 0) {
		return page('<p class="empty">No blocks saved yet. Select some code and run "Blockboard: Save Block".</p>', options);
	}
	const items = blocks.map(b =>
		`\t<li class="block"><span class="block-name">${escapeHtml(b.name)}</span><span class="block-language">${escapeHtml(b.language)}</span></li>`
	).join('\n');
	return page(`<ul class="blocks">\n${items}\n</ul>`, options);
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
