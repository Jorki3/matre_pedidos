import { describe, expect, it } from 'vitest';
import { backupFileName, buildBackup, orderExportRows, orderFileName, parseBackup } from './export';
import type { OrderLine, Product } from './types';

const catalog: Product[] = [
	{
		id: 'BRO-012',
		key: 'BRO-012',
		name: 'Brocha practica 013mm 1/2 exito',
		expected: 5,
		createdAt: '2026-11-10T00:00:00.000Z'
	}
];

const order: OrderLine[] = [
	{
		id: 'line-1',
		productId: 'BRO-012',
		key: 'BRO-012',
		name: 'Brocha practica 013mm 1/2 exito',
		quantity: 4,
		addedAt: '2026-11-10T00:00:00.000Z'
	}
];

describe('orderExportRows', () => {
	it('exporta Clave, Descripción y Cantidad a pedir', () => {
		expect(orderExportRows(order)).toEqual([
			{
				Clave: 'BRO-012',
				Descripción: 'Brocha practica 013mm 1/2 exito',
				'Cantidad a pedir': 4
			}
		]);
	});

	it('pedido vacío exporta cero filas', () => {
		expect(orderExportRows([])).toEqual([]);
	});
});

describe('file names', () => {
	it('el nombre del Excel del pedido lleva la fecha', () => {
		expect(orderFileName(new Date('2026-11-10T12:00:00Z'))).toBe('MATRE_Pedido_2026-11-10.xlsx');
	});

	it('el nombre del respaldo lleva la fecha', () => {
		expect(backupFileName(new Date('2026-11-10T12:00:00Z'))).toBe(
			'MATRE_Pedidos_Respaldo_2026-11-10.json'
		);
	});
});

describe('parseBackup', () => {
	it('acepta un respaldo generado por buildBackup', () => {
		const text = JSON.stringify(buildBackup(catalog, order));
		const parsed = parseBackup(text);
		expect(parsed.catalog).toHaveLength(1);
		expect(parsed.order).toHaveLength(1);
		expect(parsed.order[0].quantity).toBe(4);
	});

	it('rechaza JSON inválido', () => {
		expect(() => parseBackup('no es json')).toThrow();
	});

	it('rechaza respaldos de otra app', () => {
		expect(() => parseBackup(JSON.stringify({ version: 1, app: 'otra-app', catalog: [], order: [] }))).toThrow();
	});

	it('rechaza respaldos incompletos', () => {
		expect(() => parseBackup(JSON.stringify({ version: 1, app: 'matre-pedidos' }))).toThrow();
	});
});
