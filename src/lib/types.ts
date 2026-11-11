export interface Product {
	id: string;
	/** Clave principal del producto. */
	key: string;
	/** Clave alterna (opcional). */
	alternateKey?: string;
	/** Descripción del producto. */
	name: string;
	/** Existencia actual en el catálogo. */
	expected: number;
	createdAt: string;
	source?: string;
}

export interface OrderLine {
	id: string;
	productId: string;
	key: string;
	name: string;
	quantity: number;
	addedAt: string;
}

export interface OrderBackup {
	version: 1;
	exportedAt: string;
	app: 'matre-pedidos';
	catalog: Product[];
	order: OrderLine[];
}
