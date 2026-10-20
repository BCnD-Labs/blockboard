import * as vscode from 'vscode';
import { randomBytes } from 'crypto';
import { BlockStorage } from '../storage';
import { buildErrorHtml, buildSidebarHtml, PageOptions } from './html';

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
			enableScripts: false,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'media')]
		};
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
			styleUri: webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'media', 'sidebar.css')).toString()
		};
		try {
			const blocks = await this.createStorage().list();
			webview.html = buildSidebarHtml(blocks, options);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			webview.html = buildErrorHtml(`Could not load blocks: ${message}`, options);
		}
	}
}
