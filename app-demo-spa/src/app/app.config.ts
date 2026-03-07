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
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { SessionService } from './services/session.service';
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
      postLogoutRedirectUri: environment.landingUrl,
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
// MsalInterceptor — protege /api/* y /session/*
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
// APP_INITIALIZER — procesa el redirect PKCE y ejecuta el handshake con el BFF
// ---------------------------------------------------------------------------
export function appInitializerFactory(
  msalService: MsalService,
  sessionService: SessionService
): () => Promise<void> {
  return async () => {
    // 1. Procesar respuesta OAuth (code + state) si viene de un redirect
    await msalService.instance.handleRedirectPromise();

    // 2. Establecer cuenta activa si hay sesión
    const accounts = msalService.instance.getAllAccounts();
    if (accounts.length === 0) {
      return;
    }

    if (!msalService.instance.getActiveAccount()) {
      msalService.instance.setActiveAccount(accounts[0]);
    }

    // 3. Notificar al BFF — el interceptor adjuntará el Bearer automáticamente
    try {
      await firstValueFrom(sessionService.handshake());
    } catch (err) {
      // El handshake es best-effort; no bloqueamos la carga si falla
      console.warn('[appInitializer] Session handshake failed, continuing', err);
    }
  };
}

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------
export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(BrowserModule),

    provideRouter(routes),

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

    // APP_INITIALIZER: handshake con el BFF al arrancar la app
    {
      provide: APP_INITIALIZER,
      useFactory: appInitializerFactory,
      deps: [MsalService, SessionService],
      multi: true,
    },
  ],
};
