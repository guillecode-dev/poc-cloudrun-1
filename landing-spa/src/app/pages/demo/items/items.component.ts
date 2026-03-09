import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ItemsService, Item } from '../../../services/items.service';

@Component({
  selector: 'app-demo-items',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Artículos</h1>
        <button mat-icon-button matTooltip="Recargar" (click)="loadItems()" [disabled]="loading">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <div *ngIf="loading" class="state-message">
        <mat-spinner diameter="24"></mat-spinner>
        <span>Cargando artículos...</span>
      </div>

      <div *ngIf="error && !loading" class="state-message error">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error }}</span>
      </div>

      <div class="page-card table-wrapper" *ngIf="!loading && !error">
        <table mat-table [dataSource]="dataSource" matSort aria-label="Tabla de artículos">
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
            <td mat-cell *matCellDef="let row">{{ row.id }}</td>
          </ng-container>
          <ng-container matColumnDef="sku">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>SKU</th>
            <td mat-cell *matCellDef="let row"><code class="sku-badge">{{ row.sku }}</code></td>
          </ng-container>
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Nombre</th>
            <td mat-cell *matCellDef="let row">{{ row.name }}</td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data-cell" [attr.colspan]="displayedColumns.length">
              No hay artículos disponibles.
            </td>
          </tr>
        </table>
        <mat-paginator [pageSizeOptions]="[10, 25, 50]" showFirstLastButtons></mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .page-container { max-width: 960px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    .page-title { font-size: 1.75rem; font-weight: 600; color: #0f3460; margin: 0; }
    .table-wrapper { overflow-x: auto; }
    .page-card { background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .sku-badge { background: #e8f0fe; color: #1a3a6b; padding: 2px 6px; border-radius: 4px; font-size: .8rem; font-family: monospace; }
    .no-data-cell { padding: 2rem; text-align: center; color: #666; font-style: italic; }
    .state-message { display: flex; align-items: center; gap: .75rem; padding: 1rem; color: #555; }
    .state-message.error { color: #c62828; }
    th.mat-header-cell { font-weight: 600; color: #0f3460; }
  `],
})
export class ItemsComponent implements OnInit, AfterViewInit {
  displayedColumns = ['id', 'sku', 'name'];
  dataSource = new MatTableDataSource<Item>([]);
  loading = false;
  error: string | null = null;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private itemsService: ItemsService) {}

  ngOnInit(): void { this.loadItems(); }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadItems(): void {
    this.loading = true;
    this.error = null;
    this.itemsService.getItems().subscribe({
      next: items => { this.dataSource.data = items; this.loading = false; },
      error: () => { this.error = 'No se pudieron cargar los artículos.'; this.loading = false; },
    });
  }
}
