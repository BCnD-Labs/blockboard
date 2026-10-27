(function () {
	const vscode = acquireVsCodeApi();
	const byId = id => document.getElementById(id);

	const blocks = new Map(JSON.parse(byId('blocks-data').textContent).map(b => [b.id, b]));
	const modal = byId('edit-modal');
	const form = byId('edit-form');
	const nameInput = byId('edit-name');
	const codeInput = byId('edit-code');
	const cssInput = byId('edit-css');
	const preview = byId('edit-preview');
	const errorText = byId('edit-error');

	let editing;
	let opener;
	let requestId = 0;
	let previewTimer;

	function isHtml() {
		return editing && editing.language === 'html';
	}

	function open(id) {
		const block = blocks.get(id);
		if (!block) {
			return;
		}
		editing = block;
		opener = document.activeElement;
		nameInput.value = block.name;
		codeInput.value = block.code;
		cssInput.value = block.css;
		showError('');
		byId('edit-code-title').textContent = isHtml() ? 'HTML' : 'Code (' + block.language + ')';
		// Only html blocks have a css field and a live preview.
		byId('edit-css-label').hidden = !isHtml();
		byId('edit-preview-box').hidden = !isHtml();
		preview.srcdoc = '';
		modal.hidden = false;
		nameInput.focus();
		requestPreview();
	}

	function close() {
		editing = undefined;
		modal.hidden = true;
		// Put focus back on the button that opened the modal, if it is still on the page.
		if (opener && opener.isConnected) {
			opener.focus();
		}
		opener = undefined;
	}

	function showError(text) {
		errorText.textContent = text;
		nameInput.toggleAttribute('aria-invalid', text !== '');
	}

	function requestPreview() {
		if (!isHtml()) {
			return;
		}
		clearTimeout(previewTimer);
		previewTimer = setTimeout(function () {
			requestId += 1;
			vscode.postMessage({ type: 'preview', requestId: requestId, code: codeInput.value, css: cssInput.value });
		}, 150);
	}

	document.addEventListener('click', function (event) {
		const target = event.target.closest && event.target.closest('button[data-id]');
		if (!target) {
			return;
		}
		if (target.classList.contains('edit-button')) {
			open(target.dataset.id);
		} else if (target.classList.contains('copy-button')) {
			vscode.postMessage({ type: 'copy', id: target.dataset.id });
		} else if (target.classList.contains('insert-button')) {
			vscode.postMessage({ type: 'insert', id: target.dataset.id });
		} else if (target.classList.contains('delete-button')) {
			// The extension asks the user to confirm before anything is deleted.
			vscode.postMessage({ type: 'delete', id: target.dataset.id });
		}
	});

	// The extension stores the choice in settings and reloads the page with the new background.
	byId('background-toggle').addEventListener('click', function () {
		vscode.postMessage({ type: 'togglePreviewBackground' });
	});

	byId('edit-cancel').addEventListener('click', close);
	document.addEventListener('keydown', function (event) {
		if (event.key === 'Escape' && !modal.hidden) {
			close();
		}
	});

	nameInput.addEventListener('input', function () {
		if (errorText.textContent !== '') {
			showError('');
		}
	});
	codeInput.addEventListener('input', requestPreview);
	cssInput.addEventListener('input', requestPreview);

	form.addEventListener('submit', function (event) {
		event.preventDefault();
		if (!editing) {
			return;
		}
		if (nameInput.value.trim() === '') {
			showError('Name cannot be empty.');
			nameInput.focus();
			return;
		}
		const message = { type: 'save', id: editing.id, name: nameInput.value, code: codeInput.value };
		if (isHtml()) {
			message.css = cssInput.value;
		}
		vscode.postMessage(message);
	});

	window.addEventListener('message', function (event) {
		const message = event.data;
		if (message.type === 'previewHtml' && editing && message.requestId === requestId) {
			preview.srcdoc = message.srcdoc;
		} else if (message.type === 'error' && editing) {
			showError(message.message);
		} else if (message.type === 'edit') {
			open(message.id);
		}
	});

	// Tells the extension this page can receive messages (for example an Edit Block request).
	vscode.postMessage({ type: 'ready' });
})();
