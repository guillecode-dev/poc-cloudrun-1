const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

/**
 * Configuración de Native Federation para app-demo-spa como REMOTE.
 *
 * Expone:
 *  - ./DemoRoutes  → rutas de Angular Router con ItemsComponent y OrdersComponent
 *
 * Los paquetes compartidos como singleton (singleton: true) garantizan que
 * el shell (landing-spa) y este remote usen la MISMA instancia de MSAL, Angular, RxJS, etc.
 */
module.exports = withNativeFederation({
  name: 'app-demo',

  exposes: {
    './DemoRoutes': './src/app/remote-entry/demo-routes.ts',
  },

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  // Subentradas de RxJS no utilizadas en runtime: excluir del bundle compartido
  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],
});
