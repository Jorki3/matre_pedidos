import * as XLSX from 'xlsx';
import type { OrderBackup, OrderLine, Product } from './types';

/**
 * Fecha local (la del dispositivo, p. ej. América/Ciudad de México) en formato
 * AAAA-MM-DD. Nunca usar toISOString() para esto: esa fecha es UTC y pasada
 * la medianoche local ya marca el día siguiente (p. ej. 2026-11-11 cuando aquí
 * todavía es 2026-11-10). El parámetro timeZone solo existe para probar el
 * comportamiento en otra zona; la app lo llama sin él.
 */
export function localDateString(date = new Date(), timeZone?: string): string {
	if (!timeZone) {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(date);
}

/**
 * Fecha y hora local con su zona horaria, p. ej. 2026-11-10T00:40:00-06:00.
 * Representa el mismo instante que el ISO UTC, pero con la fecha local.
 */
export function localTimestamp(date = new Date()): string {
	const offsetMinutes = -date.getTimezoneOffset();
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const abs = Math.abs(offsetMinutes);
	const offsetHours = String(Math.floor(abs / 60)).padStart(2, '0');
	const offsetMins = String(abs % 60).padStart(2, '0');
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${localDateString(date)}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

/** Nombre de archivo con fecha local, p. ej. MATRE_Pedido_2026-11-10.xlsx */
export function orderFileName(date = new Date(), timeZone?: string): string {
	return `MATRE_Pedido_${localDateString(date, timeZone)}.xlsx`;
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

export function backupFileName(date = new Date(), timeZone?: string): string {
	return `MATRE_Pedidos_Respaldo_${localDateString(date, timeZone)}.json`;
}

export function buildBackup(catalog: Product[], order: OrderLine[], date = new Date()): OrderBackup {
	return {
		version: 1,
		exportedAt: localTimestamp(date),
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
