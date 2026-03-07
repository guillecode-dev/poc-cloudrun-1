import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
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
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;

  readonly landingUrl = environment.landingUrl;

  private readonly destroy$ = new Subject<void>();

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    @Inject(DOCUMENT) private document: Document,
    private msalService: MsalService,
    private broadcastService: MsalBroadcastService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.broadcastService.inProgress$
      .pipe(
        filter(status => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.syncLoginState();
      });

    this.syncLoginState();
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
      postLogoutRedirectUri: environment.landingUrl,
    });
  }

  private syncLoginState(): void {
    const accounts = this.msalService.instance.getAllAccounts();
    this.isLoggedIn = accounts.length > 0;

    if (this.isLoggedIn && !this.msalService.instance.getActiveAccount()) {
      this.msalService.instance.setActiveAccount(accounts[0]);
    }

    // Redirigir a /items tras login si estamos en la raíz
    if (this.isLoggedIn && this.router.url === '/') {
      this.router.navigate(['/items']);
    }
  }

  get userName(): string {
    const account = this.msalService.instance.getActiveAccount();
    return account?.name ?? account?.username ?? '';
  }
}
