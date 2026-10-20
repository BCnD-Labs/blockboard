import { Block } from '../storage';

export interface EditRequest {
	id: string;
	name: string;
	code: string;
	css?: string;
}

export interface PreviewRequest {
	requestId: number;
	code: string;
	css: string;
}

function asRecord(message: unknown): Record<string, unknown> | undefined {
	return typeof message === 'object' && message !== null ? message as Record<string, unknown> : undefined;
}

export function messageType(message: unknown): string | undefined {
	const type = asRecord(message)?.type;
	return typeof type === 'string' ? type : undefined;
}

// Returns the cleaned request, or the message to show the user when the request is not acceptable.
export function parseEditRequest(message: unknown): EditRequest | string {
	const m = asRecord(message);
	if (!m || typeof m.id !== 'string' || m.id === '' || typeof m.name !== 'string' || typeof m.code !== 'string') {
		return 'Could not read the edit.';
	}
	if (m.css !== undefined && typeof m.css !== 'string') {
		return 'Could not read the edit.';
	}
	const name = m.name.trim();
	if (name === '') {
		return 'Name cannot be empty.';
	}
	return { id: m.id, name, code: m.code, css: m.css as string | undefined };
}

export function parsePreviewRequest(message: unknown): PreviewRequest | undefined {
	const m = asRecord(message);
	if (!m || typeof m.requestId !== 'number' || typeof m.code !== 'string' || typeof m.css !== 'string') {
		return undefined;
	}
	return { requestId: m.requestId, code: m.code, css: m.css };
}

// id, createdAt and language never change. Only html blocks have a css field.
export function applyEdit(block: Block, edit: EditRequest): Block {
	const next: Block = { ...block, name: edit.name, code: edit.code };
	if (block.language === 'html' && edit.css !== undefined) {
		if (edit.css === '') {
			delete next.css;
		} else {
			next.css = edit.css;
		}
	}
	return next;
}

// For messages that only name a block (copy, delete). Returns the block id.
export function parseBlockIdRequest(message: unknown): string | undefined {
	const id = asRecord(message)?.id;
	return typeof id === 'string' && id !== '' ? id : undefined;
}
