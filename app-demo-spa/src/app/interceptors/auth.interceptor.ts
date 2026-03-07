import { HttpInterceptorFn, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { from } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

/**
 * Interceptor funcional que adjunta el Bearer token de MSAL a las peticiones
 * dirigidas a los endpoints protegidos del BFF: /api/* y /session/*.
 * Los tokens se obtienen siempre desde la caché en memoria de MSAL.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const protectedPrefixes = [
    `${environment.bffUrl}/api/`,
    `${environment.bffUrl}/session/`,
  ];

  const isProtected = protectedPrefixes.some(prefix => req.url.startsWith(prefix));
  if (!isProtected) {
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
      console.error('[authInterceptor] Token acquisition failed:', err);
      return next(req);
    })
  );
};
