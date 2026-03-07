export const environment = {
  production: true,

  // Azure Entra ID / MSAL — valores inyectados en runtime por Cloud Run (env-config.js)
  authTenant: (window as any).__env?.AUTH_TENANT ?? '',
  authClientId: (window as any).__env?.AUTH_CLIENT_ID ?? '',
  authAuthority: (window as any).__env?.AUTH_AUTHORITY ?? '',
  authRedirectUri: (window as any).__env?.AUTH_REDIRECT_URI ?? '',
  authScopes: ((window as any).__env?.AUTH_SCOPES ?? '').split(',').filter(Boolean),

  // URLs de servicios
  bffUrl: (window as any).__env?.BFF_URL ?? '',
  demoAppUrl: (window as any).__env?.DEMO_APP_URL ?? '',
};
