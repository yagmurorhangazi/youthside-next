/**
 * @file Ağ istemcilerinin enjeksiyon noktası. Bileşenler somut sınıfa değil arayüze bağlıdır:
 *  - Üretimde `config` verilir; HTTP istemcileri burada kurulur.
 *  - Storybook/testte `shareApiClient` ve `authClient` doğrudan verilir (Mock*).
 *
 * Oturum ve token host projeden gelir: modül kendi giriş ekranını yazmaz.
 */

import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { AuthClient } from './AuthClient';
import { createHttpClient, type AccessTokenProvider } from './http';
import { HttpAuthClient } from './HttpAuthClient';
import { HttpShareApiClient } from './HttpShareApiClient';
import type { ShareApiClient } from './ShareApiClient';
import { ATS_APPS_UPLOAD_PATH, createSingleRequestTransport } from './uploadTransport';

export interface ShareClientsConfig {
  /** Share backend'inin API kökü (ör. `https://share.youthside.co/backend/api`). */
  readonly shareApiBaseUrl: string;
  /** ATS API kökü; dosyalar `{storageApiBaseUrl}/admin/storage/apps/upload` ucuna gider. */
  readonly storageApiBaseUrl: string;
  readonly storageUploadPath?: string;
  /** Her istekte çağrılır; SSO SDK'nın `getToken()`'ı. Token saklanmaz. */
  readonly getAccessToken: AccessTokenProvider;
  /** 401'de çağrılır: host giriş akışını başlatır. */
  readonly onUnauthorized?: () => void;
}

export interface ShareClients {
  readonly shareApi: ShareApiClient;
  readonly auth: AuthClient;
}

export type ShareClientsProviderProps =
  | { readonly config: ShareClientsConfig; readonly shareApiClient?: never; readonly authClient?: never; readonly children: ReactNode }
  | { readonly config?: never; readonly shareApiClient: ShareApiClient; readonly authClient: AuthClient; readonly children: ReactNode };

const ShareClientsContext = createContext<ShareClients | null>(null);

export function createShareClients(config: ShareClientsConfig): ShareClients {
  const shared = { getAccessToken: config.getAccessToken, onUnauthorized: config.onUnauthorized };
  const shareHttp = createHttpClient({ baseUrl: config.shareApiBaseUrl, ...shared });
  const storageHttp = createHttpClient({ baseUrl: config.storageApiBaseUrl, ...shared });
  return {
    shareApi: new HttpShareApiClient(shareHttp, createSingleRequestTransport(storageHttp, config.storageUploadPath ?? ATS_APPS_UPLOAD_PATH)),
    auth: new HttpAuthClient(shareHttp),
  };
}

export function ShareClientsProvider(props: ShareClientsProviderProps) {
  const { config, shareApiClient, authClient, children } = props;
  // config nesnesi her render'da yeniden oluşturulsa bile istemci yalnızca adresler değişince yeniden kurulur;
  // getAccessToken/onUnauthorized ref üzerinden, çağrıldıkları anda en güncel hâlleriyle okunur.
  const latest = useRef(config);
  useEffect(() => {
    latest.current = config;
  });

  const shareApiBaseUrl = config?.shareApiBaseUrl ?? '';
  const storageApiBaseUrl = config?.storageApiBaseUrl ?? '';
  const storageUploadPath = config?.storageUploadPath;

  const clients = useMemo<ShareClients>(() => {
    if (shareApiClient && authClient) return { shareApi: shareApiClient, auth: authClient };
    // Ref yalnızca istek anında (render dışında) okunur; createShareClients bu fonksiyonları kurulumda çağırmaz.
    // React 18 desteği gerektiği için useEffectEvent kullanılamıyor.
    // eslint-disable-next-line react-hooks/refs
    return createShareClients({
      shareApiBaseUrl,
      storageApiBaseUrl,
      storageUploadPath,
      getAccessToken: () => latest.current?.getAccessToken() ?? null,
      onUnauthorized: () => latest.current?.onUnauthorized?.(),
    });
  }, [shareApiClient, authClient, shareApiBaseUrl, storageApiBaseUrl, storageUploadPath]);

  return <ShareClientsContext.Provider value={clients}>{children}</ShareClientsContext.Provider>;
}

function useShareClients(): ShareClients {
  const clients = useContext(ShareClientsContext);
  if (!clients) throw new Error('Paylaşım bileşenleri <ShareClientsProvider> içinde kullanılmalıdır.');
  return clients;
}

export function useShareApiClient(): ShareApiClient {
  return useShareClients().shareApi;
}

export function useAuthClient(): AuthClient {
  return useShareClients().auth;
}
