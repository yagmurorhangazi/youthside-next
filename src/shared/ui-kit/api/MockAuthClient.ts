/**
 * @file AuthClient'ın Storybook ve test uygulaması. Ağ çağrısı yapmaz.
 */

import type { AuthClient } from './AuthClient';
import { ApiError } from './errors';
import { sleep } from './retry';
import type { CurrentUser } from './types';

export type MockAuthMode = 'ready' | 'unauthorized' | 'error' | 'pending';

export interface MockAuthClientOptions {
  readonly user?: CurrentUser;
  readonly mode?: MockAuthMode;
  readonly delayMs?: number;
  /** Gerçek HTTP istemcisi gibi 401'de çağrılır. */
  readonly onUnauthorized?: () => void;
}

export const MOCK_CURRENT_USER: CurrentUser = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'ayse.yilmaz@youthside.co',
  name: 'Ayşe Yılmaz',
  picture: null,
};

export class MockAuthClient implements AuthClient {
  constructor(private readonly options: MockAuthClientOptions = {}) {}

  getCurrentUser: AuthClient['getCurrentUser'] = async (control) => {
    const { mode = 'ready', delayMs = 400, user = MOCK_CURRENT_USER } = this.options;
    if (mode === 'pending') return new Promise<CurrentUser>(() => undefined);
    await sleep(delayMs, control?.signal);
    if (mode === 'unauthorized') {
      this.options.onUnauthorized?.();
      throw ApiError.unauthorized();
    }
    if (mode === 'error') throw ApiError.network();
    return user;
  };
}
