import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db, loadOrder, readOrderMirror, saveOrder, writeOrderMirror } from './db';
import type { OrderLine } from './types';

function makeLine(n: number, quantity = n): OrderLine {
	return {
		id: `line-p${n}`,
		productId: `p${n}`,
		key: `K${n}`,
		name: `Producto ${n}`,
		quantity,
		addedAt: '2026-11-10T00:00:00.000Z'
	};
}

/** Fotos del pedido tras agregar 1, 2, ... 6 productos (como en la app). */
function snapshots(): OrderLine[][] {
	const snaps: OrderLine[][] = [];
	for (let i = 1; i <= 6; i++) {
		snaps.push(Array.from({ length: i }, (_, j) => makeLine(j + 1)));
	}
	return snaps;
}

// Espejo en memoria para las pruebas (en Node no hay localStorage).
const memoryStore = new Map<string, string>();

beforeAll(() => {
	globalThis.localStorage = {
		getItem: (key: string) => memoryStore.get(key) ?? null,
		setItem: (key: string, value: string) => {
			memoryStore.set(key, String(value));
		},
		removeItem: (key: string) => {
			memoryStore.delete(key);
		},
		clear: () => memoryStore.clear(),
		key: (index: number) => [...memoryStore.keys()][index] ?? null,
		get length() {
			return memoryStore.size;
		}
	} as Storage;
});

beforeEach(async () => {
	memoryStore.clear();
	await db.delete();
	await db.open();
});

describe('el pedido sobrevive a un refresh', () => {
	it('el espejo se escribe en el mismo instante que cambia el pedido', () => {
		const lines = [makeLine(1, 3), makeLine(2, 5)];
		// Sin esperar: la escritura a Dexie todavía no terminó.
		void saveOrder(lines).catch(() => {});
		const mirror = readOrderMirror();
		expect(mirror?.lines.map((line) => line.productId)).toEqual(['p1', 'p2']);
	});

	it('refresh inmediato tras confirmar varios productos, sin esperar las escrituras', async () => {
		const snaps = snapshots();
		// Como hacía la app: escrituras sin esperar. En v0.1.0 esto perdía
		// los 6 productos; el espejo síncrono los conserva.
		const pending = snaps.map((snap) => saveOrder(snap).catch(() => {}));
		void pending;
		await db.close();
		await db.open();
		const loaded = await loadOrder();
		expect(loaded.map((line) => line.productId)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
	});

	it('varios guardados rápidos seguidos terminan con la última foto', async () => {
		const snaps = snapshots();
		await Promise.all(snaps.map((snap) => saveOrder(snap)));
		const loaded = await loadOrder();
		expect(loaded.map((line) => line.productId)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
		expect(loaded.map((line) => line.quantity)).toEqual([1, 2, 3, 4, 5, 6]);
	});

	it('guardar con menos líneas quita las que ya no están', async () => {
		await saveOrder([makeLine(1), makeLine(2), makeLine(3)]);
		await saveOrder([makeLine(2, 9)]);
		const loaded = await loadOrder();
		expect(loaded).toHaveLength(1);
		expect(loaded[0].productId).toBe('p2');
		expect(loaded[0].quantity).toBe(9);
	});

	it('vaciar el pedido también se guarda', async () => {
		await saveOrder([makeLine(1), makeLine(2)]);
		await saveOrder([]);
		expect(await loadOrder()).toEqual([]);
	});

	it('las marcas de dictado también sobreviven a un refresh', async () => {
		const lines = [makeLine(1, 3), makeLine(2, 5), makeLine(3, 1)];
		lines[0].checked = true;
		lines[2].checked = true;
		// Sin esperar: la escritura a Dexie todavía no terminó.
		void saveOrder(lines).catch(() => {});
		await db.close();
		await db.open();
		const loaded = await loadOrder();
		expect(loaded.map((line) => line.checked)).toEqual([true, undefined, true]);
		expect(loaded.map((line) => line.quantity)).toEqual([3, 5, 1]);
	});

	it('el espejo cura Dexie cuando cambia solo una marca', async () => {
		const lines = [makeLine(1, 4), makeLine(2, 2)];
		await saveOrder(lines);
		const marked = [{ ...lines[0], checked: true }, lines[1]];
		writeOrderMirror(marked);
		const loaded = await loadOrder();
		expect(loaded[0].checked).toBe(true);
		expect(loaded[1].checked).not.toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 100));
		const stored = await db.orderLines.toArray();
		expect(stored.find((line) => line.productId === 'p1')?.checked).toBe(true);
	});

	it('sin espejo, carga desde Dexie (datos guardados antes de v0.1.1)', async () => {
		await db.orderLines.bulkAdd([makeLine(1, 4), makeLine(2, 2)]);
		const loaded = await loadOrder();
		expect(loaded.map((line) => line.productId)).toEqual(['p1', 'p2']);
	});

	it('el espejo cura Dexie cuando la escritura no alcanzó a completarse', async () => {
		const lines = [makeLine(1, 7), makeLine(2, 3)];
		writeOrderMirror(lines);
		const loaded = await loadOrder();
		expect(loaded.map((line) => line.productId)).toEqual(['p1', 'p2']);
		// La curación corre en segundo plano: Dexie termina con las líneas del espejo.
		await new Promise((resolve) => setTimeout(resolve, 100));
		const stored = await db.orderLines.toArray();
		expect(stored.map((line) => line.productId)).toEqual(['p1', 'p2']);
	});
});
