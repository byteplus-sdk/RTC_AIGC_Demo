import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('.', import.meta.url));
const repository = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = mode === 'test' ? {} : { ...loadEnv(mode, repository, ''), ...process.env };
  const host = env.HOST?.trim() || '127.0.0.1';
  const apiHost = { '0.0.0.0': '127.0.0.1', '::': '::1' }[host] || host;
  const target = `http://${apiHost.includes(':') ? `[${apiHost}]` : apiHost}:${env.SERVER_PORT || 3001}`;
  return {
    root,
    envDir: mode === 'test' ? false : repository,
    envPrefix: 'REACT_APP_',
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    css: { preprocessorOptions: { less: { javascriptEnabled: true } } },
    server: {
      forwardConsole: false,
      host,
      port: Number(env.PORT || 5173),
      strictPort: Boolean(env.PORT?.trim()),
      proxy: Object.fromEntries(
        ['/preflight', '/runtimeConfig', '/proxyAIGCFetch', '/generateRtcAccessToken'].map(route => [route, { target }])
      ),
    },
    build: { outDir: 'dist', target: 'es2020' },
    test: {
      environment: 'happy-dom',
      globals: true,
      include: ['src/**/*.test.{js,jsx,ts,tsx}'],
      env: { REACT_APP_MODE: 'flexible', REACT_APP_SESSION_DURATION_SECONDS: '1800' },
    },
  };
});
