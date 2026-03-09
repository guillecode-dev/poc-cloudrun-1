import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Item {
  id: number;
  sku: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private readonly baseUrl = environment.bffUrl;

  constructor(private http: HttpClient) {}

  getItems(): Observable<Item[]> {
    return this.http.get<Item[]>(`${this.baseUrl}/api/items`);
  }
}
