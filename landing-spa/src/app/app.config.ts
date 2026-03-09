import {
  ApplicationConfig,
  importProvidersFrom,
  APP_INITIALIZER,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withInterceptorsFromDi,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import {
  MsalModule,
  MsalInterceptor,
  MsalGuard,
  MsalBroadcastService,
  MsalService,
  MSAL_INSTANCE,
  MSAL_GUARD_CONFIG,
  MSAL_INTERCEPTOR_CONFIG,
  MsalInterceptorConfiguration,
  MsalGuardConfiguration,
} from '@azure/msal-angular';
import {
  PublicClientApplication,
  InteractionType,
  LogLevel,
  IPublicClientApplication,
} from '@azure/msal-browser';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { environment } from '../environments/environment';

// ---------------------------------------------------------------------------
// MSAL Public Client Application
// ---------------------------------------------------------------------------
export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: environment.authClientId,
      authority: environment.authAuthority,
      redirectUri: environment.authRedirectUri,
      postLogoutRedirectUri: environment.authRedirectUri,
    },
    cache: {
      cacheLocation: 'sessionStorage',
      storeAuthStateInCookie: false,
    },
    system: {
      loggerOptions: {
        logLevel: environment.production ? LogLevel.Warning : LogLevel.Info,
        loggerCallback: (level, message, containsPii) => {
          if (!containsPii) {
            console.log(`[MSAL][${LogLevel[level]}] ${message}`);
          }
        },
        piiLoggingEnabled: false,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// MsalGuard — redirect flow con PKCE
// ---------------------------------------------------------------------------
export function msalGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: environment.authScopes,
    },
    loginFailedRoute: '/',
  };
}

// ---------------------------------------------------------------------------
// MsalInterceptor — protege /api/* y /session/* del BFF
// ---------------------------------------------------------------------------
export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, string[] | null>([
    [`${environment.bffUrl}/api/`, environment.authScopes],
    [`${environment.bffUrl}/session/`, environment.authScopes],
  ]);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}

// ---------------------------------------------------------------------------
// APP_INITIALIZER — inicializa MSAL y ejecuta el handshake con el BFF
// Lee el menú y la duración de sesión desde Cloud SQL y los guarda en Firestore.
// ---------------------------------------------------------------------------
export function appInitializerFactory(
  msalService: MsalService,
): () => Promise<void> {
  return async () => {
    // 1. Inicializar MSAL (obligatorio en MSAL v3 antes de cualquier llamada)
    await msalService.instance.initialize();

    // 2. Procesar la respuesta OAuth/PKCE si viene de un redirect de Azure AD
    //    Esto debe ocurrir antes de que el router arranque (MsalGuard lo necesita).
    await msalService.instance.handleRedirectPromise();
  };
}

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------
export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(BrowserModule),

    provideRouter(routes),

    // Animaciones async (necesarias para Angular Material en componentes remotos)
    provideAnimationsAsync(),

    // HTTP client: interceptor funcional propio + soporte DI para MsalInterceptor
    provideHttpClient(
      withInterceptors([authInterceptor]),
      withInterceptorsFromDi()
    ),

    // MSAL providers
    {
      provide: MSAL_INSTANCE,
      useFactory: msalInstanceFactory,
    },
    {
      provide: MSAL_GUARD_CONFIG,
      useFactory: msalGuardConfigFactory,
    },
    {
      provide: MSAL_INTERCEPTOR_CONFIG,
      useFactory: msalInterceptorConfigFactory,
    },
    MsalService,
    MsalGuard,
    MsalBroadcastService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MsalInterceptor,
      multi: true,
    },

    // APP_INITIALIZER: inicializa MSAL y procesa el redirect antes del routing
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFactory,
      deps: [MsalService],
      multi: true,
    },
  ],
};
