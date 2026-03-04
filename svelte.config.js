import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      // Disable precompression of all assets in the output folder
      precompress: false,
      // Strict mode for edge runtime
      strict: false
    })
  }
};

export default config;
