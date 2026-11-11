import type { OrderLine, Product } from './types';

export function createId(prefix: string): string {
	return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Agrega un producto al pedido. Si ya está en el pedido, suma la cantidad
 * (nunca se duplica la línea). La cantidad debe ser un entero positivo.
 * No agrega nada sin confirmación: esta función solo se llama desde el
 * botón Confirmar de la hoja de cantidad.
 */
export function addToOrder(lines: OrderLine[], product: Product, quantity: number): OrderLine[] {
	const qty = Math.floor(quantity);
	if (!Number.isFinite(qty) || qty < 1)
		throw new Error('La cantidad debe ser un número entero mayor que cero.');
	const existing = lines.find((line) => line.productId === product.id);
	if (existing) {
		return lines.map((line) =>
			line.productId === product.id ? { ...line, quantity: line.quantity + qty } : line
		);
	}
	return [
		...lines,
		{
			id: createId('line'),
			productId: product.id,
			key: product.key,
			name: product.name,
			quantity: qty,
			addedAt: new Date().toISOString()
		}
	];
}

/** Cambia la cantidad de una línea. Cantidad 0 o menor elimina la línea. */
export function updateLineQuantity(lines: OrderLine[], lineId: string, quantity: number): OrderLine[] {
	const qty = Math.floor(quantity);
	if (!Number.isFinite(qty)) throw new Error('La cantidad debe ser un número.');
	if (qty < 1) return lines.filter((line) => line.id !== lineId);
	return lines.map((line) => (line.id === lineId ? { ...line, quantity: qty } : line));
}

/** Quita una línea del pedido. */
export function removeLine(lines: OrderLine[], lineId: string): OrderLine[] {
	return lines.filter((line) => line.id !== lineId);
}

export interface OrderTotals {
	/** Número de líneas (productos distintos). */
	lines: number;
	/** Suma de piezas de todas las líneas. */
	pieces: number;
}

export function orderTotals(lines: OrderLine[]): OrderTotals {
	return {
		lines: lines.length,
		pieces: lines.reduce((total, line) => total + line.quantity, 0)
	};
}
