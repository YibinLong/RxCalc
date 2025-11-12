import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Using adapter-node for deployment to Cloud Run
		// See https://svelte.dev/docs/kit/adapter-node for more information.
		adapter: adapter({
			out: 'build'
		})
	}
};

export default config;
