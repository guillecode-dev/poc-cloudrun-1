import { Routes } from '@angular/router';
import { MsalGuard, MsalRedirectComponent } from '@azure/msal-angular';

import { ItemsComponent } from './pages/items/items.component';
import { OrdersComponent } from './pages/orders/orders.component';

export const routes: Routes = [
  // Ruta raíz: MsalRedirectComponent procesa el código de autorización OAuth/PKCE
  {
    path: '',
    component: MsalRedirectComponent,
  },
  {
    path: 'items',
    component: ItemsComponent,
    canActivate: [MsalGuard],
  },
  {
    path: 'orders',
    component: OrdersComponent,
    canActivate: [MsalGuard],
  },
  {
    path: '**',
    redirectTo: 'items',
  },
];
