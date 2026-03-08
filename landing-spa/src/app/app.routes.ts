import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { loadRemoteModule } from '@angular-architects/native-federation';

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
    // Carga lazy el micro-frontend app-demo-spa como remote de Native Federation.
    // El shell protege la ruta con MsalGuard; los child routes (items, orders)
    // vienen del remote y no necesitan su propio guard.
    path: 'demo',
    canActivate: [MsalGuard],
    loadChildren: () =>
      loadRemoteModule({
        remoteName: 'app-demo',
        exposedModule: './DemoRoutes',
      }).then(m => m.DEMO_ROUTES),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
