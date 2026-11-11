<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { asset } from '$app/paths';
	import '../app.css';

	let { children }: { children: Snippet } = $props();

	onMount(() => {
		if ('serviceWorker' in navigator) {
			navigator.serviceWorker.register(asset('sw.js')).catch(() => {});
		}
	});
</script>

{@render children()}
