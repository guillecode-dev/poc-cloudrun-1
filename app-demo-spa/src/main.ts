import { initFederation } from '@angular-architects/native-federation';

// Inicializa el runtime de Native Federation antes de arrancar Angular.
// Cuando app-demo-spa se carga como remote dentro del shell (landing-spa),
// esta función registra los módulos compartidos (MSAL, Angular, RxJS, etc.).
initFederation()
  .catch(err => console.error('[federation] Init error', err))
  .then(() => import('./bootstrap'))
  .catch(err => console.error('[main] Bootstrap error', err));
