const { withNativeFederation, shareAll } = require('@angular-architects/native-federation/config');

/**
 * Configuración de Native Federation para landing-spa como SHELL/HOST.
 *
 * Los remotes se configuran en tiempo de ejecución via setRemoteDefinitions()
 * en main.ts, por lo que aquí no se declaran (permite cambiar URLs sin rebuild).
 *
 * Los paquetes compartidos como singleton garantizan una única instancia de
 * MSAL, Angular core, RxJS y Angular Material entre el shell y los remotes.
 */
module.exports = withNativeFederation({
  name: 'shell',

  remotes: {}, // configurados en runtime via setRemoteDefinitions()

  shared: {
    ...shareAll({ singleton: true, strictVersion: true, requiredVersion: 'auto' }),
  },

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
  ],
});
