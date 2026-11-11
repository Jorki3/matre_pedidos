<script lang="ts">
	import type { Product } from '../types';

	let {
		product,
		onConfirm,
		onClose
	}: {
		product: Product;
		onConfirm: (quantity: number) => void;
		onClose: () => void;
	} = $props();

	let qty = $state(1);
	let qtyText = $state('1');

	function setQty(value: number) {
		const next = Math.max(1, Math.floor(value) || 1);
		qty = next;
		qtyText = String(next);
	}

	function confirm() {
		const value = Math.floor(Number(qtyText));
		if (!Number.isFinite(value) || value < 1) {
			setQty(1);
			return;
		}
		onConfirm(value);
	}
</script>

<div
	class="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
	role="presentation"
	onclick={(event) => {
		if (event.target === event.currentTarget) onClose();
	}}
>
	<div
		class="w-full max-w-lg rounded-t-3xl border border-zinc-800 bg-zinc-900 p-5 pb-8"
		role="dialog"
		aria-modal="true"
		aria-label="Cantidad a pedir"
		tabindex="-1"
	>
		<p class="text-sm font-semibold text-zinc-400">Agregar al pedido</p>
		<h2 class="mt-1 text-xl font-bold text-zinc-50">{product.name}</h2>
		<p class="mt-1 text-sm text-zinc-400">
			Clave {product.key}{product.alternateKey ? ` · Alterna ${product.alternateKey}` : ''} ·
			Existencia {product.expected}
		</p>

		<div class="mt-6 flex items-center justify-center gap-4">
			<button
				type="button"
				aria-label="Quitar una pieza"
				class="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-zinc-100 active:bg-zinc-700"
				onclick={() => setQty(qty - 1)}
			>
				−
			</button>
			<input
				type="number"
				inputmode="numeric"
				min="1"
				aria-label="Cantidad a pedir"
				class="h-16 w-28 rounded-2xl border border-zinc-700 bg-zinc-950 text-center text-3xl font-bold text-zinc-50 outline-none focus:border-accent"
				bind:value={qtyText}
				onchange={() => setQty(Number(qtyText))}
			/>
			<button
				type="button"
				aria-label="Agregar una pieza"
				class="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-3xl font-bold text-zinc-100 active:bg-zinc-700"
				onclick={() => setQty(qty + 1)}
			>
				+
			</button>
		</div>
		<p class="mt-2 text-center text-sm text-zinc-400">Cantidad a pedir</p>

		<button
			type="button"
			class="mt-6 h-14 w-full rounded-2xl bg-accent text-lg font-bold text-white active:bg-accent-dark"
			onclick={confirm}
		>
			Confirmar · agregar {qty} {qty === 1 ? 'pieza' : 'piezas'}
		</button>
		<button
			type="button"
			class="mt-2 h-12 w-full rounded-2xl text-base font-semibold text-zinc-300 active:bg-zinc-800"
			onclick={onClose}
		>
			Cancelar
		</button>
	</div>
</div>
