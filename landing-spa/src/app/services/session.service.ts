import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { MenuService, MenuItem } from './menu.service';

export interface HandshakeResponse {
  sessionId: string;
  userId: string;
  expireAt: string;         // ISO-8601
  sessionDurationMin: number;
  menuItems: MenuItem[];
}

/**
 * Realiza el handshake con el BFF al iniciar sesión.
 * El BFF lee Cloud SQL para obtener el menú y la duración de sesión,
 * los guarda en Firestore y los devuelve en la respuesta.
 * El MenuService almacena los ítems para que el shell los muestre.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly baseUrl = environment.bffUrl;

  constructor(
    private http: HttpClient,
    private menuService: MenuService,
  ) {}

  /**
   * POST /session/handshake
   * El MsalInterceptor adjunta el Bearer token automáticamente.
   * Tras el handshake, los menuItems quedan disponibles en MenuService.
   */
  handshake(): Observable<HandshakeResponse> {
    return this.http
      .post<HandshakeResponse>(`${this.baseUrl}/session/handshake`, {})
      .pipe(
        tap(response => {
          this.menuService.setMenuItems(response.menuItems);
        })
      );
  }
}
