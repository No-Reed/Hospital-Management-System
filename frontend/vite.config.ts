import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const sandboxPreviewHost = '4173-idsperjo5btsekgddey37-1308c624.sg2.manus.computer'

export default defineConfig(({ mode }) => {
  const env = {
    ...loadEnv(mode, '..', ''),
    ...loadEnv(mode, '.', ''),
  }
  const firebaseAliases = {
    VITE_FIREBASE_API_KEY: env.VITE_FIREBASE_API_KEY || env.NEXT_PUBLIC_FIREBASE_API_KEY || env.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: env.VITE_FIREBASE_AUTH_DOMAIN || env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || env.authDomain,
    VITE_FIREBASE_PROJECT_ID: env.VITE_FIREBASE_PROJECT_ID || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || env.projectId,
    VITE_FIREBASE_APP_ID: env.VITE_FIREBASE_APP_ID || env.NEXT_PUBLIC_FIREBASE_APP_ID || env.appId,
  }

  return {
    plugins: [react()],
    define: Object.fromEntries(
      Object.entries({ ...firebaseAliases, VITE_API_URL: env.VITE_API_URL }).map(([key, value]) => [
        `import.meta.env.${key}`,
        JSON.stringify(value || ''),
      ]),
    ),
    server: {
      host: '0.0.0.0',
      allowedHosts: [sandboxPreviewHost],
    },
    preview: {
      host: '0.0.0.0',
      allowedHosts: [sandboxPreviewHost],
    },
  }
})
