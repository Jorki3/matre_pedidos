import type { Product } from './types';

export function normalizeText(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();
}

export interface ProductFraction {
	whole: number;
	numerator: number;
	denominator: number;
	text: string;
}

/**
 * Fracciones en el nombre del producto. "1/2" es media pulgada y
 * "11/2" / "21/2" son mixtas: 1 1/2 y 2 1/2 (así aparecen en el catálogo:
 * Brocha 038mm 11/2, Brocha 064mm 21/2). Se devuelven ambas lecturas
 * para la mixta, por si algún catálogo usa 11/2 como once medios.
 */
export function productFractions(product: Product): ProductFraction[] {
	const fractions: ProductFraction[] = [];
	for (const token of normalizeText(product.name)
		.split(/[^a-z0-9/]+/)
		.filter(Boolean)) {
		const match = token.match(/^(\d+)\/(\d+)$/);
		if (!match) continue;
		const numerator = Number(match[1]);
		const denominator = Number(match[2]);
		fractions.push({ whole: 0, numerator, denominator, text: `${numerator}/${denominator}` });
		if (match[1].length === 2) {
			const whole = Number(match[1][0]);
			const mixedNumerator = Number(match[1][1]);
			if (mixedNumerator > 0 && mixedNumerator < denominator) {
				fractions.push({
					whole,
					numerator: mixedNumerator,
					denominator,
					text: `${whole} ${mixedNumerator}/${denominator}`
				});
			}
		}
	}
	return fractions;
}

/** Pulgadas enteras en el nombre: el "2" de "Brocha practica 050mm 2 exito". */
export function productWholeInches(product: Product): number[] {
	const inches: number[] = [];
	for (const token of normalizeText(product.name)
		.split(/[^a-z0-9/]+/)
		.filter(Boolean)) {
		if (/^\d+$/.test(token)) inches.push(Number(token));
	}
	return inches;
}

function productNameTokens(product: Product): string[] {
	return normalizeText(product.name)
		.split(/[^a-z0-9/]+/)
		.filter(Boolean);
}

function productCodeTokens(product: Product): string[] {
	return normalizeText(`${product.key} ${product.alternateKey ?? ''}`)
		.split(/[^a-z0-9/]+/)
		.filter(Boolean);
}

const SEARCH_STOPWORDS = new Set([
	'de',
	'la',
	'el',
	'los',
	'las',
	'un',
	'una',
	'unos',
	'unas',
	'en',
	'con',
	'por',
	'para',
	'y',
	'o',
	'a',
	'del',
	'pulgada',
	'pulgadas'
]);

const HALF_WORDS = new Set(['media', 'medio', 'medias', 'medios']);

/**
 * Tokens de búsqueda: normaliza, parte, quita palabras vacías y convierte
 * "media (pulgada)" en la fracción "1/2". Así "brocha de media pulgada"
 * busca ["brocha", "1/2"] y "brocha de 1 y media" busca ["brocha", "1", "1/2"].
 */
export function splitSearchTokens(query: string): string[] {
	return normalizeText(query)
		.split(/[^a-z0-9/]+/)
		.filter(Boolean)
		.map((token) => (HALF_WORDS.has(token) ? '1/2' : token))
		.filter((token) => !SEARCH_STOPWORDS.has(token));
}

/**
 * Una palabra coincide solo como palabra completa (con plural en -s o
 * prefijo cuando ambas tienen 4+ letras). Nunca por una letra suelta:
 * antes la "a" de la clave A-AZ110 hacía que "brocha" coincidiera con
 * el Lubricante en aerosol.
 */
function wordMatchesToken(word: string, tokens: string[]): boolean {
	return tokens.some((token) => {
		if (token === word) return true;
		if (token.length >= 2 && word.length >= 2 && (token === `${word}s` || word === `${token}s`))
			return true;
		if (
			token.length >= 4 &&
			word.length >= 4 &&
			(token.startsWith(word) || word.startsWith(token))
		)
			return true;
		return false;
	});
}

/**
 * Un número coincide solo como token entero en el NOMBRE (o su valor en
 * "013mm"/"110ml"). Nunca como subcadena de la clave o el código de
 * barras, y nunca como parte entera de una mixta: el "2" no debe
 * coincidir con "110ml", con "75022..." ni con "21/2" (2 1/2).
 */
function numberMatchesToken(numberText: string, product: Product): boolean {
	const value = Number(numberText);
	for (const token of productNameTokens(product)) {
		if (token === numberText) return true;
		const mm = token.match(/^(\d+)(mm|ml)$/);
		if (mm && Number(mm[1]) === value) return true;
	}
	// Códigos sí se pueden buscar por fragmento (clave o clave alterna), pero
	// solo con 4+ caracteres para que un "2" no case con todo.
	if (numberText.length >= 4) {
		return productCodeTokens(product).some((code) => code.includes(numberText));
	}
	return false;
}

/**
 * Una fracción coincide con el mismo token en el nombre, o con la mixta
 * cuando viene precedida de su parte entera: "1" + "1/2" = "11/2".
 */
function fractionMatchesToken(
	fractionText: string,
	prevToken: string | undefined,
	product: Product
): boolean {
	const names = productNameTokens(product);
	if (names.includes(fractionText)) return true;
	if (prevToken !== undefined && /^\d+$/.test(prevToken)) {
		return names.includes(`${prevToken}${fractionText}`);
	}
	return false;
}

/** "1" + "1/2" escritos por separado son la mixta "11/2" del nombre.
 * Se combinan antes de comparar, para que el "1" no tenga que casar
 * solo con la parte entera de la mixta. */
export function combineMixedTokens(tokens: string[]): string[] {
	const combined: string[] = [];
	for (let i = 0; i < tokens.length; i += 1) {
		if (/^\d+$/.test(tokens[i]) && i + 1 < tokens.length && /^\d+\/\d+$/.test(tokens[i + 1])) {
			combined.push(`${tokens[i]}${tokens[i + 1]}`);
			i += 1;
		} else {
			combined.push(tokens[i]);
		}
	}
	return combined;
}

/** ¿Cuántos tokens de la consulta coinciden con el producto? */
export function countTokenMatches(product: Product, tokens: string[]): number {
	const effective = combineMixedTokens(tokens);
	let count = 0;
	for (let i = 0; i < effective.length; i += 1) {
		const token = effective[i];
		const prev = i > 0 ? effective[i - 1] : undefined;
		if (/^\d+\/\d+$/.test(token)) {
			if (fractionMatchesToken(token, prev, product)) count += 1;
		} else if (/^\d+$/.test(token)) {
			if (numberMatchesToken(token, product)) count += 1;
			else if (productCodeTokens(product).some((code) => code === token)) {
				// Números cortos de la clave ("001" de "CPV-001", "77" de
				// "ALT-77"): coincidencia exacta con el token completo del
				// código, nunca por subcadena (un "2" no casa con "110ml"
				// ni con un código "75022...").
				count += 1;
			}
		} else if (wordMatchesToken(token, productNameTokens(product))) {
			count += 1;
		} else if (token.length >= 2 && productCodeTokens(product).some((code) => code === token)) {
			// Códigos: coincidencia exacta con el token completo; 2 letras bastan
			// porque no es subcadena (un "a1" solo casa con la clave "a1").
			count += 1;
		}
	}
	return count;
}

/** Todos los tokens coinciden con el producto (palabra, número o fracción). */
export function allTokensMatch(product: Product, tokens: string[]): boolean {
	const effective = combineMixedTokens(tokens);
	return effective.length > 0 && countTokenMatches(product, tokens) === effective.length;
}

export interface SearchResult {
	/** Coincidencia exacta: TODOS los tokens de la consulta están en el producto. */
	exact: Product[];
	/** Parecido · no exacto: comparte al menos un token, pero no todos. */
	similar: Product[];
}

/**
 * Búsqueda específica: la coincidencia exacta va arriba como "Coincide",
 * los parecidos abajo como "Parecido · no exacto", y lo que no comparte
 * ningún token no aparece. Con la consulta vacía devuelve todo el catálogo
 * como exacto (sin filtro).
 */
export function searchProducts(products: Product[], query: string): SearchResult {
	const tokens = splitSearchTokens(query);
	if (tokens.length === 0) return { exact: [...products], similar: [] };

	const exact: Product[] = [];
	const similar: Product[] = [];
	for (const product of products) {
		const matched = countTokenMatches(product, tokens);
		if (matched === 0) continue;
		if (matched === combineMixedTokens(tokens).length) exact.push(product);
		else similar.push(product);
	}
	return { exact, similar };
}
