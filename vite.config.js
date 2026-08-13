import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    build: {
        rolldownOptions: {
            output: {
                // Without this the bundler inlines dynamic imports into the main
                // chunk, so the Lottie player (~50 KB gzipped) would ship to
                // every guest whether or not their card has an animation.
                codeSplitting: true,
            },
        },
    },
    resolve: {
        dedupe: ['react', 'react-dom'],
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
