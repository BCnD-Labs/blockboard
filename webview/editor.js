// Code box for the editor tab. Bundled by esbuild into media/editor.js (npm run build:webview).
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';

const LANGUAGES = { html, css, javascript, js: javascript };

// Other languages get a plain box with line numbers and no colors.
function languageSupport(language) {
	const make = LANGUAGES[language];
	return make ? [make()] : [];
}

// Returns { getValue, setValue, destroy }. onChange runs after every edit.
window.createCodeBox = function (parent, { doc, language, onChange }) {
	const view = new EditorView({
		parent,
		state: EditorState.create({
			doc,
			extensions: [
				lineNumbers(),
				history(),
				keymap.of([...defaultKeymap, ...historyKeymap]),
				syntaxHighlighting(defaultHighlightStyle),
				languageSupport(language),
				EditorView.updateListener.of(update => {
					if (update.docChanged && onChange) {
						onChange();
					}
				})
			]
		})
	});
	return {
		getValue: () => view.state.doc.toString(),
		setValue: text => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } }),
		destroy: () => view.destroy()
	};
};
