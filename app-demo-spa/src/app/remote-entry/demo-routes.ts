import { Routes } from '@angular/router';

/**
 * Rutas expuestas por app-demo-spa como micro-frontend remote.
 *
 * El shell (landing-spa) las carga de forma lazy via:
 *   loadChildren: () => loadRemoteModule({ remoteName: 'app-demo', exposedModule: './DemoRoutes' })
 *                         .then(m => m.DEMO_ROUTES)
 *
 * Los guards de autenticación se aplican en el shell sobre la ruta padre /demo,
 * por lo que aquí no se duplican.
 */
export const DEMO_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'items',
    pathMatch: 'full',
  },
  {
    path: 'items',
    loadComponent: () =>
      import('../pages/items/items.component').then(m => m.ItemsComponent),
  },
  {
    path: 'orders',
    loadComponent: () =>
      import('../pages/orders/orders.component').then(m => m.OrdersComponent),
  },
];
