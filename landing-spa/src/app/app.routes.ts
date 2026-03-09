import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';

import { HomeComponent } from './pages/home/home.component';
import { ProfileComponent } from './pages/profile/profile.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [MsalGuard],
  },
  {
    // Rutas del módulo Demo cargadas de forma lazy.
    // El shell protege con MsalGuard; los componentes (items, orders) se
    // despliegan independientemente en app-demo-spa y aquí se replican en el
    // shell para ofrecer la experiencia de aplicación unificada.
    path: 'demo',
    canActivate: [MsalGuard],
    loadChildren: () =>
      import('./pages/demo/demo.routes').then(m => m.DEMO_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
