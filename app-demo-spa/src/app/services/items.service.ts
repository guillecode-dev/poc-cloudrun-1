import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Item } from '../models/item.model';

@Injectable({ providedIn: 'root' })
export class ItemsService {
  private readonly apiUrl = `${environment.bffUrl}/api/items`;

  constructor(private http: HttpClient) {}

  getItems(): Observable<Item[]> {
    return this.http.get<Item[]>(this.apiUrl);
  }
}
