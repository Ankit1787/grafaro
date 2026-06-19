import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const faroConfig = config.public.faro
  initializeFaro({
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
      ...getWebInstrumentations(),
      new TracingInstrumentation(),
    ],
  });
});
  