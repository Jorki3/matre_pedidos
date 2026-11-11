import * as XLSX from 'xlsx';
import type { OrderBackup, OrderLine, Product } from './types';

/** Nombre de archivo con fecha, p. ej. MATRE_Pedido_2026-11-10.xlsx */
export function orderFileName(date = new Date()): string {
	return `MATRE_Pedido_${date.toISOString().slice(0, 10)}.xlsx`;
}

/** Filas del Excel del pedido: Clave, Descripción, Cantidad a pedir. */
export function orderExportRows(lines: OrderLine[]) {
	return lines.map((line) => ({
		Clave: line.key,
		Descripción: line.name,
		'Cantidad a pedir': line.quantity
	}));
}

export function downloadOrderExcel(lines: OrderLine[]): void {
	const sheet = XLSX.utils.json_to_sheet(orderExportRows(lines));
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, sheet, 'Pedido');
	XLSX.writeFile(workbook, orderFileName());
}

export function backupFileName(date = new Date()): string {
	return `MATRE_Pedidos_Respaldo_${date.toISOString().slice(0, 10)}.json`;
}

export function buildBackup(catalog: Product[], order: OrderLine[]): OrderBackup {
	return {
		version: 1,
		exportedAt: new Date().toISOString(),
		app: 'matre-pedidos',
		catalog,
		order
	};
}

export function downloadBackup(catalog: Product[], order: OrderLine[]): void {
	const blob = new Blob([JSON.stringify(buildBackup(catalog, order), null, 2)], {
		type: 'application/json'
	});
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = backupFileName();
	link.click();
	URL.revokeObjectURL(url);
}

/** Valida un respaldo JSON importado. Devuelve catálogo y pedido, o lanza error. */
export function parseBackup(text: string): { catalog: Product[]; order: OrderLine[] } {
	let data: unknown;
	try {
		data = JSON.parse(text);
	} catch {
		throw new Error('El archivo no es un JSON válido.');
	}
	if (typeof data !== 'object' || data === null) throw new Error('Respaldo inválido.');
	const backup = data as Partial<OrderBackup>;
	if (backup.app !== 'matre-pedidos' || backup.version !== 1)
		throw new Error('Este respaldo no es de MATRE Pedidos.');
	if (!Array.isArray(backup.catalog) || !Array.isArray(backup.order))
		throw new Error('Respaldo incompleto: falta el catálogo o el pedido.');
	const catalog = backup.catalog.filter(
		(p): p is Product =>
			typeof p === 'object' &&
			p !== null &&
			typeof (p as Product).id === 'string' &&
			typeof (p as Product).key === 'string' &&
			typeof (p as Product).name === 'string' &&
			typeof (p as Product).expected === 'number'
	);
	const order = backup.order.filter(
		(l): l is OrderLine =>
			typeof l === 'object' &&
			l !== null &&
			typeof (l as OrderLine).id === 'string' &&
			typeof (l as OrderLine).productId === 'string' &&
			typeof (l as OrderLine).name === 'string' &&
			typeof (l as OrderLine).quantity === 'number'
	);
	return { catalog, order };
}
