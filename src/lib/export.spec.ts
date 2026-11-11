import { describe, expect, it } from 'vitest';
import {
	backupFileName,
	buildBackup,
	localDateString,
	localTimestamp,
	orderExportRows,
	orderFileName,
	parseBackup
} from './export';
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

describe('fecha local, no UTC', () => {
	// El caso que reportó Eduardo: a las 00:40 en Ciudad de México ya es
	// 2026-11-11 en UTC. La fecha exportada debe ser la local (2026-11-10).
	const madrugada = new Date('2026-11-11T02:00:00Z');

	it('localDateString usa la fecha de la zona pedida, no la de UTC', () => {
		expect(localDateString(madrugada, 'America/Mexico_City')).toBe('2026-11-10');
		expect(localDateString(madrugada, 'UTC')).toBe('2026-11-11');
	});

	it('el respaldo JSON lleva la fecha local en el nombre', () => {
		expect(backupFileName(madrugada, 'America/Mexico_City')).toBe(
			'MATRE_Pedidos_Respaldo_2026-11-10.json'
		);
	});

	it('el Excel del pedido lleva la fecha local en el nombre', () => {
		expect(orderFileName(madrugada, 'America/Mexico_City')).toBe('MATRE_Pedido_2026-11-10.xlsx');
	});

	it('exportedAt del respaldo tiene fecha local y el mismo instante', () => {
		const date = new Date('2026-11-11T02:00:00Z');
		const backup = buildBackup(catalog, order, date);
		expect(backup.exportedAt.startsWith(localDateString(date))).toBe(true);
		expect(new Date(backup.exportedAt).getTime()).toBe(date.getTime());
	});

	it('localTimestamp incluye la zona horaria local', () => {
		expect(localTimestamp(new Date('2026-11-10T12:00:00Z'))).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/
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
