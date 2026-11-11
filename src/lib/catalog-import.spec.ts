import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
	detectColumns,
	previewCatalog,
	readCatalogFile,
	type ColumnMapping
} from './catalog-import';
import type { Product } from './types';

const mapping: ColumnMapping = { key: '0', alternateKey: '3', name: '1', expected: '2' };

function existingProduct(key: string): Product {
	return {
		id: key,
		key,
		name: `Producto ${key}`,
		expected: 1,
		createdAt: '2026-11-10T00:00:00.000Z'
	};
}

describe('detectColumns', () => {
	it('detecta Clave, Descripción, Existencia y Clave alterna', () => {
		expect(detectColumns(['Clave', 'Descripción', 'Existencia', 'Clave alterna'])).toEqual({
			key: '0',
			alternateKey: '3',
			name: '1',
			expected: '2'
		});
	});

	it('acepta variantes de mayúsculas, acentos y espacios', () => {
		expect(detectColumns(['CLAVE', 'DESCRIPCION', 'EXISTENCIA ACTUAL'])).toEqual({
			key: '0',
			alternateKey: '',
			name: '1',
			expected: '2'
		});
	});

	it('detecta "Clave principal" como clave', () => {
		const found = detectColumns(['Clave principal', 'Producto', 'Stock']);
		expect(found.key).toBe('0');
		expect(found.name).toBe('1');
		expect(found.expected).toBe('2');
	});

	it('deja vacío el campo cuando el encabezado no se reconoce', () => {
		const found = detectColumns(['Codigo', 'Cosa', 'Cantidad']);
		expect(found.key).toBe('');
		expect(found.name).toBe('');
		expect(found.expected).toBe('');
	});
});

describe('previewCatalog', () => {
	it('construye productos con clave alterna', () => {
		const { products, errors, mappingValid } = previewCatalog(
			[['BRO-012', 'Brocha 1/2', 5, 'ALT-1']],
			mapping,
			[]
		);
		expect(mappingValid).toBe(true);
		expect(errors).toEqual([]);
		expect(products).toHaveLength(1);
		expect(products[0].key).toBe('BRO-012');
		expect(products[0].name).toBe('Brocha 1/2');
		expect(products[0].expected).toBe(5);
		expect(products[0].alternateKey).toBe('ALT-1');
	});

	it('salta filas completamente vacías', () => {
		const { products, total } = previewCatalog(
			[['BRO-012', 'Brocha 1/2', 5, ''], ['', '', '', '']],
			mapping,
			[]
		);
		expect(total).toBe(2);
		expect(products).toHaveLength(1);
	});

	it('reporta error cuando falta existencia numérica', () => {
		const { products, errors } = previewCatalog(
			[['BRO-012', 'Brocha 1/2', 'sin dato', '']],
			mapping,
			[]
		);
		expect(products).toHaveLength(0);
		expect(errors).toHaveLength(1);
		expect(errors[0].row).toBe(2);
	});

	it('reporta duplicados dentro del mismo archivo', () => {
		const { products, duplicates } = previewCatalog(
			[
				['BRO-012', 'Brocha 1/2', 5, ''],
				['BRO-012', 'Brocha 1/2', 3, '']
			],
			mapping,
			[]
		);
		expect(products).toHaveLength(1);
		expect(duplicates).toEqual([{ row: 3, key: 'BRO-012' }]);
	});

	it('en modo agregar reporta duplicados contra el catálogo existente', () => {
		const { products, duplicates } = previewCatalog(
			[['BRO-012', 'Brocha 1/2', 5, '']],
			mapping,
			[existingProduct('BRO-012')],
			'append'
		);
		expect(products).toHaveLength(0);
		expect(duplicates).toEqual([{ row: 2, key: 'BRO-012' }]);
	});

	it('mappingValid es falso si falta una columna obligatoria', () => {
		const bad: ColumnMapping = { key: '0', alternateKey: '', name: '', expected: '2' };
		const { mappingValid, products } = previewCatalog(
			[['BRO-012', 'Brocha 1/2', 5, '']],
			bad,
			[]
		);
		expect(mappingValid).toBe(false);
		expect(products).toEqual([]);
	});
});

describe('readCatalogFile', () => {
	it('lee un archivo .xlsx con encabezados y filas', () => {
		const sheet = XLSX.utils.aoa_to_sheet([
			['Clave', 'Descripción', 'Existencia'],
			['BRO-012', 'Brocha 1/2', 5]
		]);
		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, sheet, 'Catalogo');
		const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
		const { headers, rows } = readCatalogFile(buffer, 'catalogo.xlsx');
		expect(headers).toEqual(['Clave', 'Descripción', 'Existencia']);
		expect(rows).toHaveLength(1);
		expect(detectColumns(headers).key).toBe('0');
	});

	it('lee un archivo .csv', () => {
		const csv = 'Clave,Descripción,Existencia\nBRO-012,Brocha 1/2,5\n';
		const buffer = new TextEncoder().encode(csv).buffer as ArrayBuffer;
		const { headers, rows } = readCatalogFile(buffer, 'catalogo.csv');
		expect(headers).toEqual(['Clave', 'Descripción', 'Existencia']);
		expect(rows).toHaveLength(1);
	});
});
