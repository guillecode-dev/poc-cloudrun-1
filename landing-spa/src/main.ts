import { initFederation } from '@angular-architects/native-federation';

// La URL del remote se resuelve en runtime desde env-config.js,
// generado por nginx con la variable de entorno DEMO_APP_URL.
declare const window: Window & {
  __env?: { DEMO_APP_URL?: string };
};

const demoAppUrl: string = window?.__env?.DEMO_APP_URL ?? 'http://localhost:4300';

// initFederation registra los remotes y configura los módulos compartidos
// ANTES de arrancar Angular, para que loadRemoteModule() funcione al navegar.
initFederation({
  'app-demo': `${demoAppUrl}/remoteEntry.json`,
})
  .catch(err => console.error('[federation] Init error', err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error('[main] Bootstrap error', err));
