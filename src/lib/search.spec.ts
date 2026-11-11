import { describe, expect, it } from 'vitest';
import {
	combineMixedTokens,
	normalizeText,
	searchProducts,
	splitSearchTokens
} from './search';
import type { Product } from './types';

function product(partial: Partial<Product> & { name: string; key: string }): Product {
	return {
		id: partial.key,
		expected: 0,
		createdAt: '2026-11-10T00:00:00.000Z',
		...partial
	};
}

const catalog: Product[] = [
	product({ name: 'Brocha practica 013mm 1/2 exito', key: 'BRO-012' }),
	product({ name: 'Brocha practica 038mm 11/2', key: 'BRO-038' }),
	product({ name: 'Brocha practica 050mm 2 exito', key: 'BRO-050' }),
	product({ name: 'Pila alcalina AA', key: 'PIL-001' }),
	product({ name: 'Lubricante en aerosol', key: 'A-AZ110' }),
	product({ name: 'Foco 9W', key: 'FOC-009' }),
	product({ name: 'Rondana plana 5/16', key: 'RON-516' }),
	product({ name: 'Codo CPVC 1/2', key: 'CPV-001', alternateKey: 'ALT-77' })
];

describe('normalizeText', () => {
	it('quita acentos, pasa a minúsculas y recorta', () => {
		expect(normalizeText('  Descripción ')).toBe('descripcion');
		expect(normalizeText('BROCHA')).toBe('brocha');
	});
});

describe('splitSearchTokens', () => {
	it('convierte "media pulgada" en la fracción 1/2', () => {
		expect(splitSearchTokens('brocha de media pulgada')).toEqual(['brocha', '1/2']);
	});

	it('convierte "1 y media" en 1 + 1/2', () => {
		expect(splitSearchTokens('brocha de 1 y media')).toEqual(['brocha', '1', '1/2']);
	});

	it('quita palabras vacías', () => {
		expect(splitSearchTokens('el codo de pvc')).toEqual(['codo', 'pvc']);
	});
});

describe('combineMixedTokens', () => {
	it('combina "1" + "1/2" en la mixta "11/2"', () => {
		expect(combineMixedTokens(['brocha', '1', '1/2'])).toEqual(['brocha', '11/2']);
	});
});

describe('searchProducts', () => {
	it('"brocha de media pulgada" coincide exacto solo con la brocha de 1/2', () => {
		const { exact, similar } = searchProducts(catalog, 'brocha de media pulgada');
		expect(exact.map((p) => p.key)).toEqual(['BRO-012']);
		expect(similar.map((p) => p.key)).toContain('BRO-038');
		expect(similar.map((p) => p.key)).toContain('BRO-050');
	});

	it('"brocha 1/2" coincide exacto solo con la brocha de 1/2', () => {
		const { exact } = searchProducts(catalog, 'brocha 1/2');
		expect(exact.map((p) => p.key)).toEqual(['BRO-012']);
	});

	it('"brocha 2" coincide exacto solo con la brocha de 2 pulgadas', () => {
		const { exact } = searchProducts(catalog, 'brocha 2');
		expect(exact.map((p) => p.key)).toEqual(['BRO-050']);
	});

	it('"brocha de 1 y media" coincide exacto con la brocha de 11/2', () => {
		const { exact } = searchProducts(catalog, 'brocha de 1 y media');
		expect(exact.map((p) => p.key)).toEqual(['BRO-038']);
	});

	it('"brocha" sin medida coincide exacto con las tres brochas', () => {
		const { exact } = searchProducts(catalog, 'brocha');
		expect(exact.map((p) => p.key)).toEqual(['BRO-012', 'BRO-038', 'BRO-050']);
	});

	it('"rodillo" no muestra la pila alcalina ni ningún producto', () => {
		const { exact, similar } = searchProducts(catalog, 'rodillo');
		expect(exact).toEqual([]);
		expect(similar).toEqual([]);
	});

	it('"foco 59 watts" es parecido al Foco 9W pero no exacto', () => {
		const { exact, similar } = searchProducts(catalog, 'foco 59 watts');
		expect(exact).toEqual([]);
		expect(similar.map((p) => p.key)).toEqual(['FOC-009']);
	});

	it('"rondana plana 5/16" coincide exacto con la rondana de 5/16', () => {
		const { exact } = searchProducts(catalog, 'rondana plana 5/16');
		expect(exact.map((p) => p.key)).toEqual(['RON-516']);
	});

	it('buscar por clave "CPV-001" coincide exacto con el codo', () => {
		const { exact } = searchProducts(catalog, 'CPV-001');
		expect(exact.map((p) => p.key)).toEqual(['CPV-001']);
	});

	it('buscar por clave alterna "ALT-77" coincide exacto con el codo', () => {
		const { exact } = searchProducts(catalog, 'ALT-77');
		expect(exact.map((p) => p.key)).toEqual(['CPV-001']);
	});

	it('la "a" de la clave A-AZ110 no hace que "brocha" case con el lubricante', () => {
		const { exact, similar } = searchProducts(catalog, 'brocha');
		expect([...exact, ...similar].map((p) => p.key)).not.toContain('A-AZ110');
	});

	it('consulta vacía devuelve todo el catálogo como exacto', () => {
		const { exact, similar } = searchProducts(catalog, '   ');
		expect(exact).toHaveLength(catalog.length);
		expect(similar).toEqual([]);
	});
});
