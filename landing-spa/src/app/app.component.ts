import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import {
  MsalService,
  MsalBroadcastService,
  MSAL_GUARD_CONFIG,
  MsalGuardConfiguration,
} from '@azure/msal-angular';
import { InteractionStatus, RedirectRequest } from '@azure/msal-browser';

import { MenuService, MenuItem } from './services/menu.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  menuItems: MenuItem[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    @Inject(DOCUMENT) private document: Document,
    private msalService: MsalService,
    private broadcastService: MsalBroadcastService,
    private menuService: MenuService,
  ) {}

  ngOnInit(): void {
    // Procesar respuesta de redirección OAuth / PKCE
    this.msalService.instance
      .handleRedirectPromise()
      .then(() => this.syncLoginState())
      .catch(err => console.error('[AppComponent] handleRedirectPromise error', err));

    // Actualizar estado cada vez que termina una interacción MSAL
    this.broadcastService.inProgress$
      .pipe(
        filter(status => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.syncLoginState());

    // Suscribir al menú dinámico (se popula tras el handshake en APP_INITIALIZER)
    this.menuService.menuItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => (this.menuItems = items));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  login(): void {
    const request: RedirectRequest = this.msalGuardConfig.authRequest
      ? { ...(this.msalGuardConfig.authRequest as RedirectRequest) }
      : { scopes: [] };

    this.msalService.loginRedirect(request);
  }

  logout(): void {
    const account =
      this.msalService.instance.getActiveAccount() ??
      this.msalService.instance.getAllAccounts()[0];

    this.msalService.logoutRedirect({
      account,
      postLogoutRedirectUri: this.document.location.origin,
    });
  }

  get userName(): string {
    const account = this.msalService.instance.getActiveAccount();
    return account?.name ?? account?.username ?? '';
  }

  private syncLoginState(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    this.isLoggedIn = accounts.length > 0;

    if (this.isLoggedIn && !this.msalService.instance.getActiveAccount()) {
      this.msalService.instance.setActiveAccount(accounts[0]);
    }
  }
}
