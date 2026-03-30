import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [tailwindcss(), react()],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        },
        // Allow using either the recommended VITE_* variables or the legacy
        // GEMINI_* ones directly from import.meta.env.
        envPrefix: ['VITE_', 'GEMINI_'],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },
        build: {
            chunkSizeWarningLimit: 500,
            rollupOptions: {
                output: {
                    manualChunks(id) {
                        if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
                            return 'react';
                        }
                        if (id.includes('node_modules/react-router-dom')) {
                            return 'router';
                        }
                        if (id.includes('node_modules/zustand')) {
                            return 'state';
                        }
                        if (id.includes('node_modules/jspdf') || id.includes('html2canvas')) {
                            return 'pdf';
                        }
                        if (id.includes('node_modules/firebase') || id.includes('/src/services/hhrFirebaseService')) {
                            return 'hhr';
                        }
                        if (
                            id.includes('/src/infrastructure/drive/') ||
                            id.includes('/src/services/driveGateway') ||
                            id.includes('/src/hooks/useDrive') ||
                            id.includes('/src/contexts/DriveContext') ||
                            id.includes('/src/infrastructure/auth/') ||
                            id.includes('/src/contexts/AuthContext') ||
                            id.includes('/src/hooks/useGoogleApiBootstrap')
                        ) {
                            return 'google';
                        }
                        if (
                            id.includes('/src/hooks/useAiAssistantController') ||
                            id.includes('/src/components/AIAssistant') ||
                            id.includes('/src/utils/gemini')
                        ) {
                            return 'ai';
                        }
                        if (
                            id.includes('/src/components/cartola/') ||
                            id.includes('/src/components/CartolaMedicamentosView')
                        ) {
                            return 'cartola';
                        }
                    },
                },
            },
        },
    };
});
