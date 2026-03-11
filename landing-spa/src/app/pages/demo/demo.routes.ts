import { Routes } from '@angular/router';

export const DEMO_ROUTES: Routes = [
  { path: '', redirectTo: 'items', pathMatch: 'full' },
  {
    path: 'items',
    loadComponent: () =>
      import('./items/items.component').then(m => m.ItemsComponent),
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('./orders/orders.component').then(m => m.OrdersComponent),
  },
  {
    path: 'providers',
    loadComponent: () =>
      import('./providers/providers.component').then(m => m.ProvidersComponent),
  },
];
