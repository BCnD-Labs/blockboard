import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { BlockStorage } from '../storage';
import { buildErrorHtml, buildSidebarHtml, composePreviewSrcdoc, PageOptions } from './html';
import { applyEdit, messageType, parseEditRequest, parsePreviewRequest } from './edit';

export class SidebarProvider implements vscode.WebviewViewProvider {
	static readonly viewType = 'blockboard.sidebar';

	private view?: vscode.WebviewView;

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
		});
		void this.refresh();
	}

	async refresh(): Promise<void> {
		if (!this.view) {
			return;
		}
		const webview = this.view.webview;
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

	private async handleMessage(message: unknown): Promise<void> {
		switch (messageType(message)) {
			case 'preview':
				return this.handlePreview(message);
			case 'save':
				return this.handleSave(message);
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
