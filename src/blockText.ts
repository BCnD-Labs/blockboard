import { Block } from './storage';

// The text a block turns into when it is copied or inserted: the code, then the css field (if any)
// in a <style> element after it.
export function blockToText(block: Pick<Block, 'code' | 'css'>): string {
	return block.css ? `${block.code}\n<style>\n${block.css}\n</style>` : block.code;
}
