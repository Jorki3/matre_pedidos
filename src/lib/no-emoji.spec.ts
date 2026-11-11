import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * La interfaz usa iconos SVG o texto, nunca emojis. Este test lee los
 * componentes y falla si aparece un emoji en la interfaz visible.
 */
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

const UI_FILES = [
	'../routes/+page.svelte',
	'../routes/+layout.svelte',
	'../lib/components/QuantitySheet.svelte'
];

function readUiFile(relativePath: string): string {
	return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
}

describe('sin emojis en la interfaz', () => {
	for (const file of UI_FILES) {
		it(`${file} no tiene emojis`, () => {
			expect(readUiFile(file)).not.toMatch(EMOJI);
		});
	}
});
