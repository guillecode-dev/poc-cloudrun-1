export const environment = {
  production: false,

  // Azure Entra ID / MSAL
  authTenant: 'YOUR_TENANT_ID',
  authClientId: 'YOUR_CLIENT_ID',
  authAuthority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
  authRedirectUri: 'http://localhost:4300',
  authScopes: ['openid', 'profile', 'email', 'api://YOUR_API_CLIENT_ID/access_as_user'],

  // URLs de servicios
  bffUrl: 'http://localhost:3000',
  landingUrl: 'http://localhost:4200',
};
