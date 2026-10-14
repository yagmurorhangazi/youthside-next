/**
 * @file AuthClient'ın gerçek uygulaması: share backend'inin `GET /me` ucu.
 * E-posta, token sunucuda doğrulandıktan sonra token'ın kendisinden okunur; istemci bir değer uydurmaz.
 */

import type { AuthClient } from './AuthClient';
import type { HttpClient } from './http';
import type { CurrentUser } from './types';

export class HttpAuthClient implements AuthClient {
  constructor(private readonly http: HttpClient) {}

  getCurrentUser: AuthClient['getCurrentUser'] = (control) =>
    this.http.request<CurrentUser>('/me', { signal: control?.signal });
}
