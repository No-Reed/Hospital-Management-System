import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const sandboxPreviewHost = '4173-idsperjo5btsekgddey37-1308c624.sg2.manus.computer'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [sandboxPreviewHost],
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: [sandboxPreviewHost],
  },
})
