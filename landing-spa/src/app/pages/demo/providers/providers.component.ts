import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-demo-providers',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Proveedores</h1>
      </div>
      <div class="placeholder-card">
        <mat-icon class="placeholder-icon">business</mat-icon>
        <p>Módulo de Proveedores — en construcción.</p>
        <small>Este módulo formará parte de la Demo App en una próxima iteración.</small>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 900px; margin: 0 auto; }
    .page-header { margin-bottom: 1.5rem; }
    .page-title { font-size: 1.75rem; font-weight: 600; color: #0f3460; margin: 0; }
    .placeholder-card {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1rem; padding: 3rem; background: #fff;
      border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08);
      color: #555; text-align: center;
    }
    .placeholder-icon { font-size: 3rem; width: 3rem; height: 3rem; color: #0078d4; }
  `],
})
export class ProvidersComponent {}
