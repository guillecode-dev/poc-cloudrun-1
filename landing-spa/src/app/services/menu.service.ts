import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface MenuItem {
  id: number;
  label: string;
  route: string;
  targetUrl: string | null;
  isEmbedded: boolean;
  icon: string | null;
  requiredRole: string;
  sortOrder: number;
  parentId: number | null;
  children: MenuItem[];
}

/**
 * Mantiene en memoria las opciones de menú cargadas desde Cloud SQL
 * durante el handshake de sesión.
 * El AppComponent suscribe a menuItems$ para renderizar la navegación dinámica.
 */
@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly _menuItems$ = new BehaviorSubject<MenuItem[]>([]);
  readonly menuItems$: Observable<MenuItem[]> = this._menuItems$.asObservable();

  setMenuItems(items: MenuItem[]): void {
    this._menuItems$.next(items);
  }

  getMenuItems(): MenuItem[] {
    return this._menuItems$.getValue();
  }
}
