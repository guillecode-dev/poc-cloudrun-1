import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Interceptor funcional que adjunta el Bearer token de MSAL
 * a todas las peticiones que apunten a /api/* del BFF.
 * Los tokens se obtienen siempre de la memoria de MSAL (cacheLocation: 'memory').
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  // Solo interceptar rutas del BFF (/api/ y /session/)
  const bffBase = environment.bffUrl;
  const isBffCall = req.url.startsWith(`${bffBase}/api/`) ||
                    req.url.startsWith(`${bffBase}/session/`);
  if (!isBffCall) {
    return next(req);
  }

  const msalService = inject(MsalService);

  const account =
    msalService.instance.getActiveAccount() ??
    msalService.instance.getAllAccounts()[0];

  if (!account) {
    return next(req);
  }

  return from(
    msalService.instance.acquireTokenSilent({
      scopes: environment.authScopes,
      account,
    })
  ).pipe(
    switchMap(result => {
      const authReq = req.clone({
        setHeaders: { Authorization: `Bearer ${result.accessToken}` },
      });
      return next(authReq);
    }),
    catchError(err => {
      // Errores HTTP (401, 403, 500…) no son fallos de adquisición de token — re-lanzar
      if (err instanceof HttpErrorResponse) {
        return throwError(() => err);
      }
      // Error real de acquireTokenSilent (sin cuenta, interacción requerida, etc.)
      console.error('[authInterceptor] acquireTokenSilent failed:', err);
      return next(req);
    })
  );
};
