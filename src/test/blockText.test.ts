import * as assert from 'assert';
import { blockToText } from '../blockText';

suite('blockToText', () => {
	test('code only: returns the code unchanged', () => {
		assert.strictEqual(blockToText({ code: '<button>Hi</button>' }), '<button>Hi</button>');
	});

	test('with css: adds the css in a style element after the code', () => {
		assert.strictEqual(
			blockToText({ code: '<button>Hi</button>', css: 'button { color: red; }' }),
			'<button>Hi</button>\n<style>\nbutton { color: red; }\n</style>'
		);
	});

	test('empty css adds nothing', () => {
		assert.strictEqual(blockToText({ code: '<p>x</p>', css: '' }), '<p>x</p>');
	});

	test('keeps styles that are already inline in the code', () => {
		const code = '<style>.b{color:red}</style><button class="b">Hi</button>';
		assert.strictEqual(blockToText({ code, css: '.b{color:blue}' }), `${code}\n<style>\n.b{color:blue}\n</style>`);
	});
});
