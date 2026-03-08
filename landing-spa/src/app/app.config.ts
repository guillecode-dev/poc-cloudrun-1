import { ApplicationConfig, importProvidersFrom, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';

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
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { environment } from '../environments/environment';

// ---------------------------------------------------------------------------
// MSAL Public Client Application
// cacheLocation: 'memory' — NUNCA localStorage ni sessionStorage
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
      cacheLocation: 'sessionStorage', // usamos sessionStorage como fallback pero sin tokens persistentes
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
// MsalGuard configuration — redirect flow con PKCE (default en MSAL v3)
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
// MsalInterceptor configuration — protege rutas del BFF
// ---------------------------------------------------------------------------
export function msalInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const protectedResourceMap = new Map<string, string[] | null>([
    [`${environment.bffUrl}/api/`, environment.authScopes],
  ]);

  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap,
  };
}

// ---------------------------------------------------------------------------
// App config
// ---------------------------------------------------------------------------
export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(BrowserModule),

    provideRouter(routes),

    // HTTP client con interceptores funcionales + soporte de interceptores DI (MsalInterceptor)
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
    {
      provide: APP_INITIALIZER,
      useFactory: (msalService: MsalService) => () => msalService.instance.initialize(),
      deps: [MsalService],
      multi: true,
    },
  ],
};
