import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import {
  MsalService,
  MsalBroadcastService,
  MSAL_GUARD_CONFIG,
  MsalGuardConfiguration,
} from '@azure/msal-angular';
import { InteractionStatus, RedirectRequest } from '@azure/msal-browser';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="home">
      <section class="home__hero">
        <h1 class="home__heading">Plataforma Corporativa</h1>
        <p class="home__sub">
          Arquitectura estándar sobre GCP Cloud Run con autenticación Azure Entra ID.
        </p>

        <div class="home__actions">
          <button *ngIf="!isLoggedIn" class="btn btn--primary" (click)="login()">
            Iniciar sesión con Microsoft
          </button>

          <ng-container *ngIf="isLoggedIn">
            <a routerLink="/profile" class="btn btn--primary">Ver mi perfil</a>
            <button class="btn btn--secondary" (click)="logout()">Cerrar sesión</button>
          </ng-container>
        </div>
      </section>

      <section class="home__info">
        <div class="card">
          <h2>Autenticación PKCE</h2>
          <p>Authorization Code + PKCE vía Azure Entra ID. Tokens solo en memoria.</p>
        </div>
        <div class="card">
          <h2>BFF seguro</h2>
          <p>Backend For Frontend en Node.js valida JWT con JWKS antes de cada operación.</p>
        </div>
        <div class="card">
          <h2>Cloud Run</h2>
          <p>Contenedores multi-stage, usuario no-root, variables via Secret Manager.</p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .home {
      max-width: 960px;
      margin: 0 auto;
    }

    .home__hero {
      text-align: center;
      padding: 4rem 1rem 3rem;
    }

    .home__heading {
      font-size: 2.5rem;
      font-weight: 700;
      color: #0f3460;
      margin-bottom: 1rem;
    }

    .home__sub {
      font-size: 1.125rem;
      color: #555;
      margin-bottom: 2rem;
    }

    .home__actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .home__info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      padding: 1rem 0 3rem;
    }

    .card {
      background: #ffffff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .card h2 {
      font-size: 1.125rem;
      color: #0f3460;
      margin-bottom: 0.5rem;
    }

    .card p {
      color: #666;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .btn {
      display: inline-block;
      padding: 0.6rem 1.4rem;
      border-radius: 4px;
      border: none;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s;
      text-decoration: none;
    }

    .btn--primary {
      background-color: #0078d4;
      color: #ffffff;
    }

    .btn--primary:hover {
      background-color: #006cbe;
      text-decoration: none;
    }

    .btn--secondary {
      background-color: transparent;
      color: #0078d4;
      border: 1px solid #0078d4;
    }

    .btn--secondary:hover {
      background-color: rgba(0, 120, 212, 0.05);
    }
  `],
})
export class HomeComponent implements OnInit, OnDestroy {
  isLoggedIn = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    @Inject(DOCUMENT) private document: Document,
    private msalService: MsalService,
    private broadcastService: MsalBroadcastService
  ) {}

  ngOnInit(): void {
    this.broadcastService.inProgress$
      .pipe(
        filter(status => status === InteractionStatus.None),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.isLoggedIn = this.msalService.instance.getAllAccounts().length > 0;
      });

    this.isLoggedIn = this.msalService.instance.getAllAccounts().length > 0;
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
}
