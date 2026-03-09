import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Order {
  id: number;
  order_no: string;
  status: string;
  total: number;
  created_at: string;
}

export interface CreateOrderDto {
  sku: string;
  qty: number;
  price: number;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly baseUrl = environment.bffUrl;

  constructor(private http: HttpClient) {}

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/api/orders`);
  }

  createOrder(dto: CreateOrderDto): Observable<{ id: number; order_no: string }> {
    return this.http.post<{ id: number; order_no: string }>(`${this.baseUrl}/api/orders`, dto);
  }
}
