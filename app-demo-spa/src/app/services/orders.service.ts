import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Order, CreateOrderDto } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly apiUrl = `${environment.bffUrl}/api/orders`;

  constructor(private http: HttpClient) {}

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.apiUrl);
  }

  createOrder(dto: CreateOrderDto): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, dto);
  }
}
