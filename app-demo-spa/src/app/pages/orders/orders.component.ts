import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { OrdersService } from '../../services/orders.service';
import { Order, CreateOrderDto } from '../../models/order.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  template: `
    <div class="page-container">

      <!-- ===== SECCIÓN: Formulario Nueva Orden ===== -->
      <div class="page-card">
        <h2 class="section-title">Nueva Orden</h2>
        <mat-divider style="margin-bottom: 1.25rem;"></mat-divider>

        <form [formGroup]="orderForm" (ngSubmit)="submitOrder()" class="order-form" novalidate>

          <!-- SKU -->
          <mat-form-field appearance="outline">
            <mat-label>SKU</mat-label>
            <input matInput formControlName="sku" placeholder="ej. PROD-001" maxlength="50">
            <mat-error *ngIf="orderForm.get('sku')?.hasError('required')">
              El SKU es requerido.
            </mat-error>
            <mat-error *ngIf="orderForm.get('sku')?.hasError('minlength')">
              Mínimo 2 caracteres.
            </mat-error>
          </mat-form-field>

          <!-- Cantidad -->
          <mat-form-field appearance="outline">
            <mat-label>Cantidad</mat-label>
            <input matInput type="number" formControlName="qty" placeholder="ej. 10" min="1">
            <mat-error *ngIf="orderForm.get('qty')?.hasError('required')">
              La cantidad es requerida.
            </mat-error>
            <mat-error *ngIf="orderForm.get('qty')?.hasError('min')">
              Debe ser al menos 1.
            </mat-error>
          </mat-form-field>

          <!-- Precio unitario -->
          <mat-form-field appearance="outline">
            <mat-label>Precio unitario</mat-label>
            <input matInput type="number" formControlName="price" placeholder="ej. 99.99" min="0.01" step="0.01">
            <mat-icon matPrefix style="font-size:16px; margin-right:4px;">attach_money</mat-icon>
            <mat-error *ngIf="orderForm.get('price')?.hasError('required')">
              El precio es requerido.
            </mat-error>
            <mat-error *ngIf="orderForm.get('price')?.hasError('min')">
              Debe ser mayor a 0.
            </mat-error>
          </mat-form-field>

          <div class="form-actions">
            <button mat-raised-button color="primary"
                    type="submit"
                    [disabled]="orderForm.invalid || submitting">
              <mat-spinner *ngIf="submitting" diameter="16" style="display:inline-block; margin-right:6px;"></mat-spinner>
              <mat-icon *ngIf="!submitting">add_shopping_cart</mat-icon>
              {{ submitting ? 'Creando...' : 'Crear Orden' }}
            </button>
            <button mat-stroked-button type="button" (click)="resetForm()">
              Limpiar
            </button>
          </div>
        </form>
      </div>

      <!-- ===== SECCIÓN: Tabla de Órdenes ===== -->
      <div class="page-header">
        <h1 class="page-title">Órdenes</h1>
        <button mat-icon-button
                matTooltip="Recargar"
                (click)="loadOrders()"
                [disabled]="loading"
                aria-label="Recargar órdenes">
          <mat-icon>refresh</mat-icon>
        </button>
      </div>

      <!-- Estado de carga -->
      <div *ngIf="loading" class="state-message">
        <mat-spinner diameter="24"></mat-spinner>
        <span>Cargando órdenes...</span>
      </div>

      <!-- Error -->
      <div *ngIf="error && !loading" class="state-message error">
        <mat-icon>error_outline</mat-icon>
        <span>{{ error }}</span>
      </div>

      <!-- Tabla -->
      <div class="page-card table-wrapper" *ngIf="!loading && !error">
        <table mat-table [dataSource]="dataSource" matSort aria-label="Tabla de órdenes">

          <!-- Columna ID -->
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
            <td mat-cell *matCellDef="let row">{{ row.id }}</td>
          </ng-container>

          <!-- Columna Nro. Orden -->
          <ng-container matColumnDef="order_no">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Nro. Orden</th>
            <td mat-cell *matCellDef="let row">
              <code class="order-badge">{{ row.order_no }}</code>
            </td>
          </ng-container>

          <!-- Columna Estado -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Estado</th>
            <td mat-cell *matCellDef="let row">
              <span class="status-chip" [ngClass]="'status-' + row.status.toLowerCase()">
                {{ row.status }}
              </span>
            </td>
          </ng-container>

          <!-- Columna Total -->
          <ng-container matColumnDef="total">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Total</th>
            <td mat-cell *matCellDef="let row" class="currency-cell">
              {{ row.total | number:'1.2-2' }}
            </td>
          </ng-container>

          <!-- Columna Fecha -->
          <ng-container matColumnDef="created_at">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Fecha</th>
            <td mat-cell *matCellDef="let row">
              {{ row.created_at | date:'dd/MM/yyyy HH:mm' }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <!-- Sin datos -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell no-data-cell" [attr.colspan]="displayedColumns.length">
              No hay órdenes registradas.
            </td>
          </tr>
        </table>

        <mat-paginator [pageSizeOptions]="[10, 25, 50]"
                       showFirstLastButtons
                       aria-label="Paginación de órdenes">
        </mat-paginator>
      </div>

    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1100px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .page-title {
      font-size: 1.75rem;
      font-weight: 600;
      color: #0f3460;
      margin: 0;
    }

    .section-title {
      font-size: 1.15rem;
      font-weight: 600;
      color: #0f3460;
      margin: 0 0 1rem 0;
    }

    .order-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.75rem 1.25rem;
      align-items: start;
    }

    .form-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
      padding-top: 0.25rem;
      grid-column: 1 / -1;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .order-badge {
      background: #e8f0fe;
      color: #1a3a6b;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-family: monospace;
    }

    .status-chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-pending   { background: #fff3e0; color: #e65100; }
    .status-confirmed { background: #e8f5e9; color: #1b5e20; }
    .status-shipped   { background: #e3f2fd; color: #0d47a1; }
    .status-cancelled { background: #ffebee; color: #b71c1c; }

    .currency-cell {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }

    .no-data-cell {
      padding: 2rem;
      text-align: center;
      color: #666;
      font-style: italic;
    }

    th.mat-header-cell {
      font-weight: 600;
      color: #0f3460;
    }
  `],
})
export class OrdersComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id', 'order_no', 'status', 'total', 'created_at'];
  dataSource = new MatTableDataSource<Order>([]);
  loading = false;
  submitting = false;
  error: string | null = null;

  orderForm!: FormGroup;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private fb: FormBuilder,
    private ordersService: OrdersService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadOrders();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  loadOrders(): void {
    this.loading = true;
    this.error = null;

    this.ordersService.getOrders().subscribe({
      next: orders => {
        this.dataSource.data = orders;
        this.loading = false;
      },
      error: err => {
        console.error('[OrdersComponent] Error cargando órdenes', err);
        this.error = 'No se pudieron cargar las órdenes. Intente nuevamente.';
        this.loading = false;
      },
    });
  }

  submitOrder(): void {
    if (this.orderForm.invalid || this.submitting) return;

    this.submitting = true;
    const dto: CreateOrderDto = {
      sku: this.orderForm.value.sku.trim(),
      qty: Number(this.orderForm.value.qty),
      price: Number(this.orderForm.value.price),
    };

    this.ordersService.createOrder(dto).subscribe({
      next: newOrder => {
        this.dataSource.data = [newOrder, ...this.dataSource.data];
        this.submitting = false;
        this.resetForm();
        this.snackBar.open(`Orden ${newOrder.order_no} creada correctamente.`, 'Cerrar', {
          duration: 4000,
          panelClass: 'snack-success',
        });
      },
      error: err => {
        console.error('[OrdersComponent] Error creando orden', err);
        this.submitting = false;
        this.snackBar.open('Error al crear la orden. Intente nuevamente.', 'Cerrar', {
          duration: 5000,
          panelClass: 'snack-error',
        });
      },
    });
  }

  resetForm(): void {
    this.orderForm.reset();
    this.orderForm.markAsPristine();
    this.orderForm.markAsUntouched();
  }

  private buildForm(): void {
    this.orderForm = this.fb.group({
      sku: [
        '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(50)],
      ],
      qty: [
        null,
        [Validators.required, Validators.min(1)],
      ],
      price: [
        null,
        [Validators.required, Validators.min(0.01)],
      ],
    });
  }
}
