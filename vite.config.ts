import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

const base = process.env.BASE_PATH
	? (`/${process.env.BASE_PATH.replace(/^\/+|\/+$/g, '')}` as `/${string}`)
	: ('' as const);

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			preprocess: vitePreprocess(),
			adapter: adapter(),
			paths: {
				base
			}
		})
	],
	test: {
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
	}
});
