import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MsalService } from '@azure/msal-angular';
import { AccountInfo } from '@azure/msal-browser';

interface ClaimRow {
  claim: string;
  value: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="profile">
      <header class="profile__header">
        <h1>Mi Perfil</h1>
        <a routerLink="/" class="btn btn--secondary">&#8592; Volver</a>
      </header>

      <div *ngIf="account; else noAccount">
        <section class="profile__summary card">
          <p><strong>Nombre:</strong> {{ account.name }}</p>
          <p><strong>Usuario:</strong> {{ account.username }}</p>
          <p><strong>Tenant:</strong> {{ account.tenantId }}</p>
        </section>

        <section class="profile__claims">
          <h2>Claims del ID Token</h2>
          <table class="claims-table" *ngIf="claims.length > 0; else noClaims">
            <thead>
              <tr>
                <th>Claim</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of claims">
                <td class="claim-key">{{ row.claim }}</td>
                <td class="claim-value">{{ row.value }}</td>
              </tr>
            </tbody>
          </table>
          <ng-template #noClaims>
            <p class="empty">No se encontraron claims en el ID Token.</p>
          </ng-template>
        </section>
      </div>

      <ng-template #noAccount>
        <p class="empty">No hay sesión activa. <a routerLink="/">Ir al inicio</a>.</p>
      </ng-template>
    </div>
  `,
  styles: [`
    .profile {
      max-width: 800px;
      margin: 0 auto;
    }

    .profile__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .profile__header h1 {
      font-size: 1.75rem;
      color: #0f3460;
    }

    .profile__summary {
      margin-bottom: 2rem;
    }

    .profile__summary p {
      margin-bottom: 0.4rem;
      font-size: 0.95rem;
      color: #333;
    }

    .profile__claims h2 {
      font-size: 1.25rem;
      color: #0f3460;
      margin-bottom: 1rem;
    }

    .card {
      background: #ffffff;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .claims-table {
      width: 100%;
      border-collapse: collapse;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .claims-table th {
      background-color: #0f3460;
      color: #ffffff;
      padding: 0.75rem 1rem;
      text-align: left;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .claims-table td {
      padding: 0.65rem 1rem;
      border-bottom: 1px solid #eef0f3;
      font-size: 0.875rem;
    }

    .claims-table tr:last-child td {
      border-bottom: none;
    }

    .claims-table tr:nth-child(even) td {
      background-color: #f9fafb;
    }

    .claim-key {
      font-weight: 600;
      color: #0f3460;
      width: 35%;
    }

    .claim-value {
      color: #444;
      word-break: break-all;
    }

    .empty {
      color: #666;
      font-style: italic;
    }

    .btn {
      display: inline-block;
      padding: 0.45rem 1rem;
      border-radius: 4px;
      border: none;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background-color 0.15s;
    }

    .btn--secondary {
      background-color: transparent;
      color: #0078d4;
      border: 1px solid #0078d4;
    }

    .btn--secondary:hover {
      background-color: rgba(0, 120, 212, 0.05);
      text-decoration: none;
    }
  `],
})
export class ProfileComponent implements OnInit {
  account: AccountInfo | null = null;
  claims: ClaimRow[] = [];

  constructor(private msalService: MsalService) {}

  ngOnInit(): void {
    this.account =
      this.msalService.instance.getActiveAccount() ??
      this.msalService.instance.getAllAccounts()[0] ??
      null;

    if (this.account?.idTokenClaims) {
      this.claims = Object.entries(this.account.idTokenClaims)
        .map(([claim, value]) => ({
          claim,
          value: Array.isArray(value) ? value.join(', ') : String(value),
        }))
        .sort((a, b) => a.claim.localeCompare(b.claim));
    }
  }
}
