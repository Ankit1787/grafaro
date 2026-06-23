import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const faroConfig = config.public.faro

  if (!faroConfig.url || faroConfig.url === 'uri' || faroConfig.url === '') {
    console.warn('[Faro SDK] Collector URL is not set. Faro Observability is disabled.');
    return;
  }

  let faroInstance = (window as any).__faro_instance__;

  if (!faroInstance) {
    faroInstance = initializeFaro({
      preventGlobalExposure: true,
      url: faroConfig.url,
      app: {
        name: faroConfig.appName,
        version: '1.0.0',
        environment: faroConfig.environment,
      },
      sessionTracking: {
        samplingRate: 1,
        persistent: true,
      },
      instrumentations: [
        ...getWebInstrumentations({
          captureConsole: true,
          captureConsoleDisabledLevels: [],
        }),
        new TracingInstrumentation({
          instrumentationOptions: {
            propagateTraceHeaderCorsUrls: [
              /localhost/,
              /127\.0\.0\.1/,
            ],
          },
        }),
      ],
    });
    
    // Bind to a safe, writable custom property to avoid colliding with read-only 'window.faro'
    (window as any).__faro_instance__ = faroInstance;
  }

  // Inject Vue error boundaries into Faro
  nuxtApp.vueApp.config.errorHandler = (error: unknown, instance: any, info: string) => {
    const componentName = instance?.$options?.name || instance?.$options?.__name || 'AnonymousComponent';
    const context = {
      origin: 'vue-lifecycle',
      componentName,
      errorInfo: info,
    };

    // Print to server/console for dev
    console.error(`[Vue Error Boundary] [${componentName}]:`, error);

    if (faroInstance?.api) {
      const err = error instanceof Error ? error : new Error(String(error));
      faroInstance.api.pushError(err, { context });
    }
  };

  return {
    provide: {
      faro: faroInstance,
    },
  };
});

  