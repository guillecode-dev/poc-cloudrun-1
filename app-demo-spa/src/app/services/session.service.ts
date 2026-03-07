import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly baseUrl = environment.bffUrl;

  constructor(private http: HttpClient) {}

  /**
   * Notifica al BFF que el usuario completó el flujo PKCE.
   * El BFF crea o renueva la sesión en Firestore.
   * El Bearer token se adjunta automáticamente via MsalInterceptor.
   */
  handshake(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/session/handshake`, {});
  }
}
