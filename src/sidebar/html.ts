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
