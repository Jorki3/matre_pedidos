import { describe, expect, it } from 'vitest';
import { addToOrder, orderLineForProduct, orderTotals, removeLine, setOrderProductQuantity, updateLineQuantity } from './order';
import type { OrderLine, Product } from './types';

function product(partial: Partial<Product> & { name: string; key: string }): Product {
	return {
		id: partial.key,
		expected: 0,
		createdAt: '2026-11-10T00:00:00.000Z',
		...partial
	};
}

const brocha = product({ name: 'Brocha practica 013mm 1/2 exito', key: 'BRO-012' });
const codo = product({ name: 'Codo CPVC 1/2', key: 'CPV-001' });
const foco = product({ name: 'Foco 9W', key: 'FOC-009' });

describe('addToOrder', () => {
	it('agrega una línea con la cantidad pedida', () => {
		const lines = addToOrder([], brocha, 3);
		expect(lines).toHaveLength(1);
		expect(lines[0].name).toBe('Brocha practica 013mm 1/2 exito');
		expect(lines[0].key).toBe('BRO-012');
		expect(lines[0].quantity).toBe(3);
	});

	it('agregar el mismo producto suma la cantidad, no duplica la línea', () => {
		const lines = addToOrder(addToOrder([], brocha, 2), brocha, 5);
		expect(lines).toHaveLength(1);
		expect(lines[0].quantity).toBe(7);
	});

	it('rechaza cantidad cero', () => {
		expect(() => addToOrder([], brocha, 0)).toThrow();
	});

	it('rechaza cantidad negativa', () => {
		expect(() => addToOrder([], brocha, -2)).toThrow();
	});

	it('redondea hacia abajo cantidades con decimales', () => {
		const lines = addToOrder([], brocha, 2.7);
		expect(lines[0].quantity).toBe(2);
	});
});

describe('updateLineQuantity', () => {
	it('cambia la cantidad de una línea', () => {
		const lines = addToOrder([], brocha, 2);
		const updated = updateLineQuantity(lines, lines[0].id, 10);
		expect(updated[0].quantity).toBe(10);
		expect(updated).toHaveLength(1);
	});

	it('cantidad 0 elimina la línea', () => {
		const lines = addToOrder([], brocha, 2);
		expect(updateLineQuantity(lines, lines[0].id, 0)).toEqual([]);
	});

	it('rechaza cantidad no numérica', () => {
		const lines = addToOrder([], brocha, 2);
		expect(() => updateLineQuantity(lines, lines[0].id, Number.NaN)).toThrow();
	});
});

describe('orderLineForProduct', () => {
	it('devuelve la línea del producto si ya está en el pedido', () => {
		const lines = addToOrder(addToOrder([], brocha, 2), codo, 1);
		expect(orderLineForProduct(lines, brocha.id)?.quantity).toBe(2);
		expect(orderLineForProduct(lines, codo.id)?.quantity).toBe(1);
	});

	it('devuelve undefined si el producto no está en el pedido', () => {
		const lines = addToOrder([], brocha, 2);
		expect(orderLineForProduct(lines, foco.id)).toBeUndefined();
	});
});

describe('setOrderProductQuantity', () => {
	it('reemplaza la cantidad si el producto ya está, sin duplicar la línea', () => {
		const lines = addToOrder([], brocha, 5);
		const updated = setOrderProductQuantity(lines, brocha, 8);
		expect(updated).toHaveLength(1);
		expect(updated[0].quantity).toBe(8);
	});

	it('agrega el producto si no estaba en el pedido', () => {
		const lines = addToOrder([], brocha, 2);
		const updated = setOrderProductQuantity(lines, codo, 4);
		expect(updated).toHaveLength(2);
		expect(updated[1].key).toBe('CPV-001');
		expect(updated[1].quantity).toBe(4);
	});

	it('rechaza cantidad cero', () => {
		const lines = addToOrder([], brocha, 2);
		expect(() => setOrderProductQuantity(lines, brocha, 0)).toThrow();
	});

	it('rechaza cantidad negativa', () => {
		expect(() => setOrderProductQuantity([], brocha, -1)).toThrow();
	});
});

describe('removeLine', () => {
	it('quita solo la línea indicada', () => {
		const lines = addToOrder(addToOrder([], brocha, 2), codo, 1);
		const remaining = removeLine(lines, lines[0].id);
		expect(remaining).toHaveLength(1);
		expect(remaining[0].key).toBe('CPV-001');
	});
});

describe('orderTotals', () => {
	it('cuenta líneas y piezas', () => {
		const lines: OrderLine[] = [
			...addToOrder([], brocha, 3),
			...addToOrder([], codo, 10),
			...addToOrder([], foco, 5)
		];
		expect(orderTotals(lines)).toEqual({ lines: 3, pieces: 18 });
	});

	it('pedido vacío es 0 productos · 0 piezas', () => {
		expect(orderTotals([])).toEqual({ lines: 0, pieces: 0 });
	});
});
