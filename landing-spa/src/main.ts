import { setRemoteDefinitions } from '@angular-architects/native-federation';

// La URL del remote se resuelve en tiempo de ejecución desde env-config.js,
// que es generado por nginx en el Dockerfile con la variable de entorno DEMO_APP_URL.
// Esto permite cambiar la URL del micro-frontend sin reconstruir la imagen.
declare const window: Window & {
  __env?: { DEMO_APP_URL?: string };
};

const demoAppUrl: string = window?.__env?.DEMO_APP_URL ?? 'http://localhost:4300';

// Registra el remote ANTES de arrancar Angular para que loadRemoteModule()
// pueda resolver 'app-demo' → <url>/remoteEntry.json al navegar a /demo.
setRemoteDefinitions({
  'app-demo': `${demoAppUrl}/remoteEntry.json`,
});

import('./bootstrap').catch(err => console.error('[main] Bootstrap error', err));
