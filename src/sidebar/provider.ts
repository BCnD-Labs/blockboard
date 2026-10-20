import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { Block, BlockStorage } from '../storage';
import { buildErrorHtml, buildSidebarHtml, composePreviewSrcdoc, PageOptions } from './html';
import { applyEdit, messageType, parseBlockIdRequest, parseEditRequest, parsePreviewRequest } from './edit';
import { copyBlock, deleteBlockWithConfirmation, insertBlock } from '../actions';

export class SidebarProvider implements vscode.WebviewViewProvider {
	static readonly viewType = 'blockboard.sidebar';

	private view?: vscode.WebviewView;
	private pageReady = false;
	private pendingEditId?: string;

	constructor(
		private extensionUri: vscode.Uri,
		private createStorage: () => BlockStorage
	) {}

	resolveWebviewView(view: vscode.WebviewView): void {
		this.view = view;
		view.webview.options = {
			// Scripts run only in this sidebar page. Block previews are sandboxed iframes and cannot run scripts.
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')]
		};
		view.webview.onDidReceiveMessage(message => void this.handleMessage(message));
		view.onDidDispose(() => {
			this.view = undefined;
			this.pageReady = false;
		});
		void this.refresh();
	}

	async refresh(): Promise<void> {
		if (!this.view) {
			return;
		}
		const webview = this.view.webview;
		this.pageReady = false;
		const options: PageOptions = {
			cspSource: webview.cspSource,
			nonce: randomBytes(16).toString('base64'),
			styleUri: webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'sidebar.css')).toString(),
			scriptUri: webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'sidebar.js')).toString()
		};
		try {
			const blocks = await this.createStorage().list();
			webview.html = buildSidebarHtml(blocks, options);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			webview.html = buildErrorHtml(`Could not load blocks: ${message}`, options);
		}
	}

	// Shows the sidebar and opens the edit modal for a block. If the sidebar page is not loaded yet
	// (for example the view was never opened), the request waits until the page says it is ready.
	async edit(id: string): Promise<void> {
		this.pendingEditId = id;
		await vscode.commands.executeCommand(`${SidebarProvider.viewType}.focus`);
		await this.sendPendingEdit();
	}

	private async sendPendingEdit(): Promise<void> {
		if (!this.view || !this.pageReady || this.pendingEditId === undefined) {
			return;
		}
		const id = this.pendingEditId;
		this.pendingEditId = undefined;
		await this.view.webview.postMessage({ type: 'edit', id });
	}

	private async handleMessage(message: unknown): Promise<void> {
		switch (messageType(message)) {
			case 'ready':
				this.pageReady = true;
				return this.sendPendingEdit();
			case 'preview':
				return this.handlePreview(message);
			case 'save':
				return this.handleSave(message);
			case 'copy':
				return this.handleBlockAction(message, block => copyBlock(block));
			case 'insert':
				return this.handleBlockAction(message, async block => void await insertBlock(block));
			case 'delete':
				return this.handleBlockAction(message, async block => {
					if (await deleteBlockWithConfirmation(this.createStorage(), block)) {
						await this.refresh();
					}
				});
		}
	}

	private async handleBlockAction(message: unknown, action: (block: Block) => Promise<void>): Promise<void> {
		const id = parseBlockIdRequest(message);
		if (id === undefined) {
			return;
		}
		try {
			const block = (await this.createStorage().list()).find(b => b.id === id);
			if (!block) {
				vscode.window.showWarningMessage('This block no longer exists.');
				await this.refresh();
				return;
			}
			await action(block);
		} catch (error) {
			vscode.window.showErrorMessage(`Blockboard: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async handlePreview(message: unknown): Promise<void> {
		const request = parsePreviewRequest(message);
		if (request) {
			await this.view?.webview.postMessage({
				type: 'previewHtml',
				requestId: request.requestId,
				srcdoc: composePreviewSrcdoc({ code: request.code, css: request.css })
			});
		}
	}

	private async handleSave(message: unknown): Promise<void> {
		const edit = parseEditRequest(message);
		if (typeof edit === 'string') {
			await this.view?.webview.postMessage({ type: 'error', message: edit });
			return;
		}
		try {
			const storage = this.createStorage();
			const block = (await storage.list()).find(b => b.id === edit.id);
			if (!block) {
				await this.view?.webview.postMessage({ type: 'error', message: 'This block no longer exists.' });
				return;
			}
			await storage.update(applyEdit(block, edit));
			await this.refresh();
		} catch (error) {
			const text = error instanceof Error ? error.message : String(error);
			await this.view?.webview.postMessage({ type: 'error', message: `Could not save: ${text}` });
		}
	}
}
