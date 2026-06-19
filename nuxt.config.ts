// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
   vite: {
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ]
    }
  },
   runtimeConfig: {
    public: {
      faro: {
        url: process.env.NUXT_PUBLIC_FARO_URL||"uri", // Overridden by NUXT_PUBLIC_FARO_URL
        appName: process.env.NUXT_PUBLIC_FARO_APP_NAME||"appname", // Overridden by NUXT_PUBLIC_FARO_APP_NAME
        environment: process.env.NUXT_PUBLIC_FARO_ENVIRONMENT||"development" // Overridden by NUXT_PUBLIC_FARO_ENVIRONMENT
      }
    }
  },
})
