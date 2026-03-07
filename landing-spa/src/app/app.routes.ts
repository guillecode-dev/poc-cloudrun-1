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
    path: '**',
    redirectTo: '',
  },
];
