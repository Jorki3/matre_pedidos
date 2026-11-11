<script lang="ts">
	import { onMount } from 'svelte';
	import { loadCatalog, loadOrder, saveCatalog, saveOrder } from '../lib/db';
	import { searchProducts } from '../lib/search';
	import { addToOrder, orderTotals, removeLine, updateLineQuantity } from '../lib/order';
	import {
		detectColumns,
		importFields,
		previewCatalog,
		readCatalogFile,
		type CatalogRow,
		type ColumnMapping
	} from '../lib/catalog-import';
	import { downloadBackup, downloadOrderExcel, parseBackup } from '../lib/export';
	import QuantitySheet from '../lib/components/QuantitySheet.svelte';
	import type { OrderLine, Product } from '../lib/types';

	type View = 'buscar' | 'pedido' | 'catalogo' | 'respaldo';

	let view = $state<View>('buscar');
	let catalog = $state<Product[]>([]);
	let order = $state<OrderLine[]>([]);
	let query = $state('');
	let selected = $state<Product | null>(null);
	let loaded = $state(false);
	let notice = $state('');
	let confirmClear = $state(false);

	// Importación de catálogo
	let importHeaders = $state<string[]>([]);
	let importRows = $state<CatalogRow[]>([]);
	let importMapping = $state<ColumnMapping>({ key: '', alternateKey: '', name: '', expected: '' });
	let importMode = $state<'append' | 'replace'>('append');
	let importFileName = $state('');

	const results = $derived(searchProducts(catalog, query));
	const totals = $derived(orderTotals(order));
	const shownExact = $derived(results.exact.slice(0, 100));
	const shownSimilar = $derived(results.similar.slice(0, 100));
	const importPreview = $derived(
		importRows.length > 0 ? previewCatalog(importRows, importMapping, catalog, importMode) : null
	);

	onMount(async () => {
		catalog = await loadCatalog();
		order = await loadOrder();
		loaded = true;
	});

	function showNotice(message: string) {
		notice = message;
		window.setTimeout(() => {
			if (notice === message) notice = '';
		}, 4000);
	}

	async function persistOrder(lines: OrderLine[]) {
		order = lines;
		await saveOrder(lines);
	}

	function confirmAdd(quantity: number) {
		if (!selected) return;
		persistOrder(addToOrder(order, selected, quantity));
		showNotice(`${selected.name}: ${quantity} ${quantity === 1 ? 'pieza' : 'piezas'} al pedido.`);
		selected = null;
	}

	async function handleImportFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		try {
			const data = await file.arrayBuffer();
			const { headers, rows } = readCatalogFile(data, file.name);
			if (headers.length === 0 || rows.length === 0) {
				showNotice('El archivo no tiene datos para importar.');
				return;
			}
			importHeaders = headers;
			importRows = rows;
			importMapping = detectColumns(headers);
			importFileName = file.name;
			notice = '';
		} catch {
			showNotice('No se pudo leer el archivo. Revisa que sea Excel o CSV.');
		}
	}

	async function confirmImport() {
		if (!importPreview || !importPreview.mappingValid) return;
		const merged =
			importMode === 'replace' ? importPreview.products : [...catalog, ...importPreview.products];
		await saveCatalog(merged);
		catalog = merged;
		const added = importPreview.products.length;
		const errors = importPreview.errors.length;
		const dups = importPreview.duplicates.length;
		importHeaders = [];
		importRows = [];
		importFileName = '';
		showNotice(
			`Catálogo importado: ${added} ${added === 1 ? 'producto' : 'productos'}` +
				(errors ? `, ${errors} con error` : '') +
				(dups ? `, ${dups} duplicados` : '') +
				'.'
		);
	}

	async function clearCatalog() {
		await saveCatalog([]);
		catalog = [];
		showNotice('Catálogo eliminado.');
	}

	async function handleBackupFile(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		try {
			const text = await file.text();
			const { catalog: restoredCatalog, order: restoredOrder } = parseBackup(text);
			await saveCatalog(restoredCatalog);
			await saveOrder(restoredOrder);
			catalog = restoredCatalog;
			order = restoredOrder;
			showNotice(
				`Respaldo restaurado: ${restoredCatalog.length} productos y ${restoredOrder.length} líneas de pedido.`
			);
		} catch (error) {
			showNotice(error instanceof Error ? error.message : 'No se pudo restaurar el respaldo.');
		}
	}

	function navClass(active: boolean) {
		return active
			? 'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-bold text-accent'
			: 'flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-semibold text-zinc-400';
	}
</script>

<div class="mx-auto flex min-h-dvh w-full max-w-2xl flex-col bg-[#101012] pb-24">
	<header class="sticky top-0 z-40 border-b border-zinc-800 bg-[#101012]/95 px-4 py-3 backdrop-blur">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-xl font-bold leading-tight text-zinc-50">
					MATRE Pedidos <span class="ml-1 rounded-md bg-accent px-1.5 py-0.5 align-middle text-xs font-bold text-white">v0.1.0</span>
				</h1>
				<p class="text-xs text-zinc-400">
					{catalog.length} {catalog.length === 1 ? 'producto' : 'productos'} en catálogo
				</p>
			</div>
			<button
				type="button"
				class="relative rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-white active:bg-accent-dark"
				onclick={() => (view = 'pedido')}
			>
				Mi pedido · {totals.lines}
			</button>
		</div>
	</header>

	{#if notice}
		<p class="mx-4 mt-3 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100" role="status">
			{notice}
		</p>
	{/if}

	<main class="flex-1 px-4 pt-4">
		{#if !loaded}
			<p class="py-10 text-center text-zinc-400">Cargando…</p>
		{:else if view === 'buscar'}
			<label class="block">
				<span class="sr-only">Buscar producto</span>
				<input
					type="search"
					placeholder="Descripción, clave o clave alterna"
					autocomplete="off"
					class="h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-lg text-zinc-50 placeholder:text-zinc-500 outline-none focus:border-accent"
					bind:value={query}
				/>
			</label>

			{#if catalog.length === 0}
				<div class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
					<p class="text-lg font-bold text-zinc-50">Aún no hay catálogo</p>
					<p class="mt-1 text-sm text-zinc-400">
						Importa tu catálogo en Excel o CSV desde la pestaña Catálogo para empezar a buscar.
					</p>
					<button
						type="button"
						class="mt-4 h-12 rounded-2xl bg-accent px-5 text-base font-bold text-white active:bg-accent-dark"
						onclick={() => (view = 'catalogo')}
					>
						Ir a Catálogo
					</button>
				</div>
			{:else if query.trim() === ''}
				<p class="mt-4 text-sm text-zinc-400">
					Escribe para buscar. Sin búsqueda se muestran los primeros 100 productos del catálogo.
				</p>
				<ul class="mt-3 space-y-2">
					{#each shownExact as product (product.id)}
						<li>
							<button
								type="button"
								class="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left active:border-accent"
								onclick={() => (selected = product)}
							>
								<span class="block text-base font-semibold text-zinc-50">{product.name}</span>
								<span class="mt-0.5 block text-sm text-zinc-400">
									Clave {product.key}{product.alternateKey ? ` · Alterna ${product.alternateKey}` : ''} · Existencia {product.expected}
								</span>
							</button>
						</li>
					{/each}
				</ul>
			{:else if results.exact.length === 0 && results.similar.length === 0}
				<p class="mt-8 text-center text-zinc-400">
					Sin resultados para “{query.trim()}”. Revisa la descripción o la clave.
				</p>
			{:else}
				{#if results.exact.length > 0}
					<h2 class="mt-4 text-sm font-bold tracking-wide text-emerald-400 uppercase">Coincide</h2>
					<ul class="mt-2 space-y-2">
						{#each shownExact as product (product.id)}
							<li>
								<button
									type="button"
									class="w-full rounded-2xl border border-emerald-900/60 bg-zinc-900 p-4 text-left active:border-accent"
									onclick={() => (selected = product)}
								>
									<span class="block text-base font-semibold text-zinc-50">{product.name}</span>
									<span class="mt-0.5 block text-sm text-zinc-400">
										Clave {product.key}{product.alternateKey ? ` · Alterna ${product.alternateKey}` : ''} · Existencia {product.expected}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				{#if results.similar.length > 0}
					<h2 class="mt-5 text-sm font-bold tracking-wide text-amber-400 uppercase">Parecido · no exacto</h2>
					<ul class="mt-2 space-y-2">
						{#each shownSimilar as product (product.id)}
							<li>
								<button
									type="button"
									class="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-left active:border-accent"
									onclick={() => (selected = product)}
								>
									<span class="block text-base font-semibold text-zinc-50">{product.name}</span>
									<span class="mt-0.5 block text-sm text-zinc-400">
										Clave {product.key}{product.alternateKey ? ` · Alterna ${product.alternateKey}` : ''} · Existencia {product.expected}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
				{#if results.exact.length > 100 || results.similar.length > 100}
					<p class="mt-3 text-center text-xs text-zinc-500">Mostrando los primeros 100 de cada grupo. Afina la búsqueda para ver más.</p>
				{/if}
			{/if}
		{:else if view === 'pedido'}
			<h2 class="text-lg font-bold text-zinc-50">Mi pedido</h2>
			<p class="mt-1 text-sm text-zinc-400">
				{totals.lines} {totals.lines === 1 ? 'producto' : 'productos'} · {totals.pieces} {totals.pieces === 1 ? 'pieza' : 'piezas'}
			</p>

			{#if order.length === 0}
				<div class="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
					<p class="text-lg font-bold text-zinc-50">Tu pedido está vacío</p>
					<p class="mt-1 text-sm text-zinc-400">
						Busca un producto, toca su tarjeta y confirma la cantidad para agregarlo.
					</p>
					<button
						type="button"
						class="mt-4 h-12 rounded-2xl bg-accent px-5 text-base font-bold text-white active:bg-accent-dark"
						onclick={() => (view = 'buscar')}
					>
						Buscar productos
					</button>
				</div>
			{:else}
				<ul class="mt-4 space-y-2">
					{#each order as line (line.id)}
						<li class="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="text-base font-semibold text-zinc-50">{line.name}</p>
									<p class="mt-0.5 text-sm text-zinc-400">Clave {line.key}</p>
								</div>
								<button
									type="button"
									aria-label="Quitar {line.name} del pedido"
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg text-zinc-300 active:bg-zinc-700"
									onclick={() => persistOrder(removeLine(order, line.id))}
								>
									✕
								</button>
							</div>
							<div class="mt-3 flex items-center gap-3">
								<button
									type="button"
									aria-label="Quitar una pieza"
									class="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-zinc-100 active:bg-zinc-700"
									onclick={() => persistOrder(updateLineQuantity(order, line.id, line.quantity - 1))}
								>
									−
								</button>
								<input
									type="number"
									inputmode="numeric"
									min="1"
									aria-label="Cantidad de {line.name}"
									class="h-11 w-20 rounded-xl border border-zinc-700 bg-zinc-950 text-center text-xl font-bold text-zinc-50 outline-none focus:border-accent"
									value={line.quantity}
									onchange={(event) =>
										persistOrder(
											updateLineQuantity(order, line.id, Number((event.currentTarget as HTMLInputElement).value))
										)}
								/>
								<button
									type="button"
									aria-label="Agregar una pieza"
									class="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-2xl font-bold text-zinc-100 active:bg-zinc-700"
									onclick={() => persistOrder(updateLineQuantity(order, line.id, line.quantity + 1))}
								>
									+
								</button>
								<span class="ml-auto text-sm text-zinc-400">{line.quantity} {line.quantity === 1 ? 'pieza' : 'piezas'}</span>
							</div>
						</li>
					{/each}
				</ul>

				<button
					type="button"
					class="mt-5 h-14 w-full rounded-2xl bg-accent text-lg font-bold text-white active:bg-accent-dark"
					onclick={() => downloadOrderExcel(order)}
				>
					Exportar pedido
				</button>
				<p class="mt-2 text-center text-xs text-zinc-500">
					Descarga un Excel con Clave, Descripción y Cantidad a pedir.
				</p>
				<button
					type="button"
					class="mt-4 h-12 w-full rounded-2xl border border-zinc-700 text-base font-semibold text-red-400 active:bg-zinc-800"
					onclick={() => {
						if (confirmClear) {
							persistOrder([]);
							confirmClear = false;
							showNotice('Pedido vaciado.');
						} else {
							confirmClear = true;
							window.setTimeout(() => (confirmClear = false), 4000);
						}
					}}
				>
					{confirmClear ? 'Toca de nuevo para vaciar el pedido' : 'Vaciar pedido'}
				</button>
			{/if}
		{:else if view === 'catalogo'}
			<h2 class="text-lg font-bold text-zinc-50">Catálogo</h2>
			<p class="mt-1 text-sm text-zinc-400">
				{catalog.length} {catalog.length === 1 ? 'producto' : 'productos'} cargados. Importa un Excel
				(.xls / .xlsx) o CSV con las columnas Clave, Descripción, Existencia y Clave alterna (opcional).
			</p>

			<label class="mt-4 flex h-14 cursor-pointer items-center justify-center rounded-2xl bg-accent text-base font-bold text-white active:bg-accent-dark">
				Elegir archivo Excel o CSV
				<input type="file" accept=".xls,.xlsx,.csv" class="hidden" onchange={handleImportFile} />
			</label>

			{#if importRows.length > 0}
				<div class="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
					<p class="text-base font-bold text-zinc-50">{importFileName}</p>
					<p class="mt-0.5 text-sm text-zinc-400">
						Revisa qué columna es cada dato antes de confirmar.
					</p>
					<div class="mt-4 space-y-3">
						{#each importFields as field (field.id)}
							<label class="block">
								<span class="text-sm font-semibold text-zinc-300">{field.label}</span>
								<select
									class="mt-1 h-12 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-base text-zinc-50 outline-none focus:border-accent"
									bind:value={importMapping[field.id]}
								>
									<option value="">— Sin columna —</option>
									{#each importHeaders as header, index (index)}
										<option value={String(index)}>{header || `Columna ${index + 1}`}</option>
									{/each}
								</select>
							</label>
						{/each}
					</div>

					{#if importPreview}
						<div class="mt-4 rounded-xl bg-zinc-950 p-3 text-sm text-zinc-300">
							{#if !importPreview.mappingValid}
								<p class="font-semibold text-red-400">
									Faltan columnas obligatorias: asigna Clave, Descripción y Existencia.
								</p>
							{:else}
								<p>
									{importPreview.products.length} {importPreview.products.length === 1 ? 'producto' : 'productos'} listos de {importPreview.total} filas.
								</p>
								{#if importPreview.errors.length > 0}
									<p class="mt-1 text-red-400">
										{importPreview.errors.length} {importPreview.errors.length === 1 ? 'fila' : 'filas'} con error
										{#each importPreview.errors.slice(0, 3) as error (error.row)}
											<span class="block text-xs">Fila {error.row}: {error.message}</span>
										{/each}
									</p>
								{/if}
								{#if importPreview.duplicates.length > 0}
									<p class="mt-1 text-amber-400">
										{importPreview.duplicates.length} duplicados (no se importan).
									</p>
								{/if}
								{#if importPreview.products.length > 0}
									<p class="mt-2 font-semibold text-zinc-200">Vista previa:</p>
									<ul class="mt-1 space-y-0.5 text-zinc-400">
										{#each importPreview.products.slice(0, 5) as product (product.id)}
											<li>{product.key} — {product.name} ({product.expected})</li>
										{/each}
									</ul>
								{/if}
							{/if}
						</div>
					{/if}

					<div class="mt-4 flex gap-2">
						<button
							type="button"
							class="h-12 flex-1 rounded-2xl border border-zinc-700 text-base font-semibold text-zinc-200 active:bg-zinc-800 {importMode === 'append' ? 'bg-zinc-800' : ''}"
							onclick={() => (importMode = 'append')}
							aria-pressed={importMode === 'append'}
						>
							Agregar
						</button>
						<button
							type="button"
							class="h-12 flex-1 rounded-2xl border border-zinc-700 text-base font-semibold text-zinc-200 active:bg-zinc-800 {importMode === 'replace' ? 'bg-zinc-800' : ''}"
							onclick={() => (importMode = 'replace')}
							aria-pressed={importMode === 'replace'}
						>
							Reemplazar
						</button>
					</div>
					<button
						type="button"
						disabled={!importPreview?.mappingValid || importPreview.products.length === 0}
						class="mt-3 h-14 w-full rounded-2xl bg-accent text-lg font-bold text-white active:bg-accent-dark disabled:opacity-40"
						onclick={confirmImport}
					>
						Confirmar importación
					</button>
					<button
						type="button"
						class="mt-2 h-11 w-full rounded-2xl text-base font-semibold text-zinc-300 active:bg-zinc-800"
						onclick={() => {
							importHeaders = [];
							importRows = [];
							importFileName = '';
						}}
					>
						Cancelar
					</button>
				</div>
			{/if}

			{#if catalog.length > 0}
				<button
					type="button"
					class="mt-6 h-12 w-full rounded-2xl border border-zinc-700 text-base font-semibold text-red-400 active:bg-zinc-800"
					onclick={clearCatalog}
				>
					Eliminar catálogo
				</button>
			{/if}
		{:else if view === 'respaldo'}
			<h2 class="text-lg font-bold text-zinc-50">Respaldo</h2>
			<p class="mt-1 text-sm text-zinc-400">
				Guarda una copia de tu catálogo y tu pedido en un archivo JSON, y restáurala cuando la necesites.
			</p>
			<p class="mt-3 text-sm text-zinc-300">
				Ahora mismo: {catalog.length} {catalog.length === 1 ? 'producto' : 'productos'} · {totals.lines} {totals.lines === 1 ? 'línea' : 'líneas'} de pedido.
			</p>

			<button
				type="button"
				class="mt-5 h-14 w-full rounded-2xl bg-accent text-lg font-bold text-white active:bg-accent-dark"
				onclick={() => downloadBackup(catalog, order)}
			>
				Exportar respaldo JSON
			</button>
			<label class="mt-3 flex h-14 cursor-pointer items-center justify-center rounded-2xl border border-zinc-700 text-base font-bold text-zinc-100 active:bg-zinc-800">
				Importar respaldo JSON
				<input type="file" accept=".json,application/json" class="hidden" onchange={handleBackupFile} />
			</label>
			<p class="mt-3 text-xs text-zinc-500">
				Importar un respaldo reemplaza el catálogo y el pedido actuales con los del archivo.
			</p>
		{/if}
	</main>

	<nav class="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800 bg-[#101012]/95 backdrop-blur">
		<div class="mx-auto flex w-full max-w-2xl">
			<button type="button" class={navClass(view === 'buscar')} onclick={() => (view = 'buscar')}>
				<span class="text-lg leading-none">🔍</span>Buscar
			</button>
			<button type="button" class={navClass(view === 'pedido')} onclick={() => (view = 'pedido')}>
				<span class="text-lg leading-none">🧾</span>Mi pedido ({totals.lines})
			</button>
			<button type="button" class={navClass(view === 'catalogo')} onclick={() => (view = 'catalogo')}>
				<span class="text-lg leading-none">📦</span>Catálogo
			</button>
			<button type="button" class={navClass(view === 'respaldo')} onclick={() => (view = 'respaldo')}>
				<span class="text-lg leading-none">💾</span>Respaldo
			</button>
		</div>
	</nav>
</div>

{#if selected}
	<QuantitySheet product={selected} onConfirm={confirmAdd} onClose={() => (selected = null)} />
{/if}
