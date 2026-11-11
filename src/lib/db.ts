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

export async function loadOrder(): Promise<OrderLine[]> {
	return db.orderLines.toArray();
}

export async function saveOrder(lines: OrderLine[]): Promise<void> {
	await db.transaction('rw', db.orderLines, async () => {
		await db.orderLines.clear();
		if (lines.length > 0) await db.orderLines.bulkAdd(lines);
	});
}
