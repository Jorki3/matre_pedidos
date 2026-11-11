import Dexie, { type EntityTable } from 'dexie';
import type { OrderLine, Product } from './types';

export const db = new Dexie('matre-pedidos') as Dexie & {
	products: EntityTable<Product, 'id'>;
	orderLines: EntityTable<OrderLine, 'id'>;
};

db.version(1).stores({
	products: 'id, key, alternateKey',
	orderLines: 'id, productId'
});

export async function loadCatalog(): Promise<Product[]> {
	return db.products.toArray();
}

export async function saveCatalog(products: Product[]): Promise<void> {
	await db.transaction('rw', db.products, async () => {
		await db.products.clear();
		if (products.length > 0) await db.products.bulkAdd(products);
	});
}

/**
 * Espejo síncrono del pedido en localStorage. IndexedDB es asíncrono:
 * si la página se actualiza o se cierra mientras una escritura está en
 * vuelo, esa escritura se pierde y la app lo mostraba como guardado.
 * El espejo se escribe en el mismo instante en que cambia el pedido,
 * así que un refresh inmediato ya no puede perderlo; Dexie sigue siendo
 * el almacén principal y se cura desde el espejo cuando hace falta.
 */
export const ORDER_MIRROR_KEY = 'matre-pedidos:order-v1';

interface OrderMirror {
	savedAt: number;
	lines: OrderLine[];
}

function isOrderLine(value: unknown): value is OrderLine {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as OrderLine).id === 'string' &&
		typeof (value as OrderLine).productId === 'string' &&
		typeof (value as OrderLine).name === 'string' &&
		typeof (value as OrderLine).quantity === 'number'
	);
}

export function readOrderMirror(): OrderMirror | null {
	try {
		if (typeof localStorage === 'undefined') return null;
		const raw = localStorage.getItem(ORDER_MIRROR_KEY);
		if (!raw) return null;
		const data: unknown = JSON.parse(raw);
		if (typeof data !== 'object' || data === null) return null;
		const mirror = data as Partial<OrderMirror>;
		if (typeof mirror.savedAt !== 'number' || !Array.isArray(mirror.lines)) return null;
		return { savedAt: mirror.savedAt, lines: mirror.lines.filter(isOrderLine) };
	} catch {
		return null;
	}
}

/** Escritura síncrona del espejo: sobrevive a un refresh inmediato. */
export function writeOrderMirror(lines: OrderLine[]): void {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(ORDER_MIRROR_KEY, JSON.stringify({ savedAt: Date.now(), lines }));
	} catch {
		// Almacenamiento lleno o bloqueado: Dexie sigue siendo el almacén.
	}
}

function sameOrderLines(a: OrderLine[], b: OrderLine[]): boolean {
	if (a.length !== b.length) return false;
	const byId = new Map(a.map((line) => [line.id, line]));
	return b.every((line) => {
		const other = byId.get(line.id);
		return other?.quantity === line.quantity && Boolean(other?.checked) === Boolean(line.checked);
	});
}

/** Escritura en Dexie por líneas: actualiza las que existen, borra las que ya no están. Nunca vacía la tabla para volver a escribirla. */
async function writeOrderToDexie(lines: OrderLine[]): Promise<void> {
	await db.transaction('rw', db.orderLines, async () => {
		const storedIds = (await db.orderLines.toArray()).map((line) => line.id);
		const nextIds = new Set(lines.map((line) => line.id));
		const stale = storedIds.filter((id) => !nextIds.has(id));
		if (stale.length > 0) await db.orderLines.bulkDelete(stale);
		if (lines.length > 0) await db.orderLines.bulkPut(lines);
	});
}

/**
 * Escrituras del pedido en serie: una nunca pisa a otra en vuelo.
 * La cadena sobrevive a un fallo (la siguiente escritura vuelve a
 * guardar el estado completo), pero la promesa devuelta sí rechaza
 * para que la vista pueda avisarle a Eduardo.
 */
let orderWriteChain: Promise<void> = Promise.resolve();

export function saveOrder(lines: OrderLine[]): Promise<void> {
	writeOrderMirror(lines);
	const task = orderWriteChain.then(() => writeOrderToDexie(lines));
	orderWriteChain = task.catch(() => {});
	return task;
}

export async function loadOrder(): Promise<OrderLine[]> {
	const mirror = readOrderMirror();
	const stored = await db.orderLines.toArray();
	if (!mirror) return stored;
	if (!sameOrderLines(stored, mirror.lines)) {
		// El espejo es más nuevo que Dexie: la última escritura no alcanzó
		// a completarse. Se usa el espejo y se cura Dexie en segundo plano.
		void saveOrder(mirror.lines).catch(() => {});
	}
	return mirror.lines;
}
