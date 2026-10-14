/**
 * @file ShareApiClient'ın Storybook ve test uygulaması. Bellekte çalışır, ağa çıkmaz.
 * Yükleme, gerçek motorla (runUploadQueue) yapılır; yalnızca CDN'e gönderim kademeli olarak simüle edilir.
 * Böylece yeniden deneme, bağlantı bekleme ve sıralama Storybook'ta da gerçek davranışla görünür.
 */

import { ApiError, abortError } from './errors';
import { sleep, type Connectivity } from './retry';
import type { ShareApiClient } from './ShareApiClient';
import type {
  DraftSummary,
  ManifestEntry,
  PublicShare,
  RemoteFileState,
  ShareLimits,
  ShareProgressSnapshot,
} from './types';
import { runUploadQueue } from './uploadQueue';
import type { UploadTransport } from './uploadTransport';

export interface MockShareApiClientOptions {
  /** Simüle edilen yükleme hızı. Varsayılan 4 MB/sn. */
  readonly bytesPerSecond?: number;
  readonly tickMs?: number;
  /** Metadata isteklerinin gecikmesi. */
  readonly latencyMs?: number;
  /** 0–1: genel ilerleme bu oranda durur (ör. 0.42 → %42'de bekler). */
  readonly pauseAt?: number;
  /** Bu göreli yollar kalıcı hatayla (422) reddedilir. */
  readonly failPaths?: readonly string[];
  /** 0–1: genel ilerleme bu orana gelince bağlantı bir kez kopar. */
  readonly networkDropAt?: number;
  /** Bağlantının kopuk kaldığı süre. Infinity → hiç geri gelmez. */
  readonly offlineMs?: number;
  /** "Link oluşturuluyor" süresi. Infinity → hiç bitmez. */
  readonly finalizeDelayMs?: number;
  readonly failFinalize?: boolean;
  /** Korumalı her çağrı 401 döner. */
  readonly unauthorized?: boolean;
  readonly onUnauthorized?: () => void;
  readonly drafts?: readonly MockDraft[];
  /** Herkese açık içerik: token → içerik ya da 'expired'. */
  readonly publicShares?: Readonly<Record<string, PublicShare | 'expired'>>;
  readonly limits?: ShareLimits;
}

/** Önceden var olan yarım transfer (kaldığı yerden devam hikayeleri için). */
export interface MockDraft {
  readonly id: number;
  readonly createdAt: string;
  readonly files: readonly RemoteFileState[];
}

export const MOCK_SHARE_LIMITS: ShareLimits = {
  maxFiles: 2000,
  maxFileBytes: 200 * 1024 * 1024,
  maxTotalBytes: 10 * 1024 * 1024 * 1024,
  allowedMimeTypes: [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'video/mp4', 'video/quicktime', 'video/webm',
  ],
};

interface MockShare {
  id: number;
  token: string;
  uploadDirectory: string;
  createdAt: string;
  status: 'draft' | 'ready';
  files: Map<string, { entry: ManifestEntry; done: boolean; mimeType: string; filePath: string | null }>;
}

const MOCK_PUBLIC_BASE = 'https://share.youthside.co/s/';

/** Bağlantının kopup geri gelmesini simüle eder. */
class MockConnectivity implements Connectivity {
  private offline = false;
  private waiters: Array<() => void> = [];

  isOnline(): boolean {
    return !this.offline;
  }

  goOffline(durationMs: number): void {
    this.offline = true;
    if (Number.isFinite(durationMs)) setTimeout(() => this.goOnline(), durationMs);
  }

  goOnline(): void {
    this.offline = false;
    const waiters = this.waiters;
    this.waiters = [];
    waiters.forEach((resolve) => resolve());
  }

  waitForOnline(signal?: AbortSignal): Promise<void> {
    if (!this.offline) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      this.waiters.push(resolve);
      signal?.addEventListener('abort', () => reject(abortError()), { once: true });
    });
  }
}

export class MockShareApiClient implements ShareApiClient {
  private readonly shares = new Map<number, MockShare>();
  private nextId = 1000;
  readonly connectivity = new MockConnectivity();

  constructor(private readonly options: MockShareApiClientOptions = {}) {
    for (const draft of options.drafts ?? []) {
      this.shares.set(draft.id, {
        id: draft.id,
        token: mockToken(draft.id),
        uploadDirectory: `share/${'d'.repeat(28)}${String(draft.id).padStart(4, '0')}`,
        createdAt: draft.createdAt,
        status: 'draft',
        files: new Map(draft.files.map((f) => [f.relativePath, { entry: f, done: f.status === 'done', mimeType: 'application/pdf', filePath: null }])),
      });
    }
  }

  prepareShare: ShareApiClient['prepareShare'] = async (manifest, control) => {
    await this.latency(control?.signal);
    this.guard();
    const id = this.nextId++;
    const share: MockShare = {
      id,
      token: mockToken(id),
      uploadDirectory: `share/${id.toString(16).padStart(32, 'a')}`,
      createdAt: new Date().toISOString(),
      status: 'draft',
      files: new Map(manifest.map((entry) => [entry.relativePath, { entry, done: false, mimeType: '', filePath: null }])),
    };
    this.shares.set(id, share);
    return { id, uploadDirectory: share.uploadDirectory, limits: this.limits };
  };

  getShareProgress: ShareApiClient['getShareProgress'] = async (shareId, control) => {
    await this.latency(control?.signal);
    this.guard();
    return this.snapshot(this.find(shareId));
  };

  listDrafts: ShareApiClient['listDrafts'] = async (control) => {
    await this.latency(control?.signal);
    this.guard();
    return [...this.shares.values()]
      .filter((s) => s.status === 'draft')
      .map((s): DraftSummary => {
        const files = [...s.files.values()];
        const done = files.filter((f) => f.done);
        return {
          id: s.id,
          createdAt: s.createdAt,
          fileCount: files.length,
          totalSize: files.reduce((sum, f) => sum + f.entry.size, 0),
          uploadedCount: done.length,
          uploadedSize: done.reduce((sum, f) => sum + f.entry.size, 0),
        };
      })
      .filter((d) => d.fileCount > 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  };

  uploadFiles: ShareApiClient['uploadFiles'] = (directory, files, options) => {
    this.guard();
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    const loaded = new Map<string, number>();
    let dropped = false;
    const globalLoaded = () => [...loaded.values()].reduce((a, b) => a + b, 0);
    const { bytesPerSecond = 4 * 1024 * 1024, tickMs = 100, pauseAt, failPaths = [], networkDropAt, offlineMs = 3000 } = this.options;
    const connectivity = this.connectivity;
    const pauseLimit = pauseAt === undefined ? undefined : Math.ceil(pauseAt * totalBytes);

    const transport: UploadTransport = {
      upload: (blob, _dir, { signal, onProgress }) =>
        new Promise((resolve, reject) => {
          const file = files.find((f) => f.file === blob);
          const key = file?.id ?? String(Math.random());
          const size = blob.size;
          let sent = 0;
          loaded.set(key, 0);

          if (!connectivity.isOnline()) {
            reject(ApiError.network());
            return;
          }

          const timer = setInterval(() => {
            if (!connectivity.isOnline()) {
              stop();
              loaded.set(key, 0);
              reject(ApiError.network());
              return;
            }
            // Tam sayı baytlarla ilerlenir; duraklama sınırı yukarı yuvarlanır ki %42 gerçekten %42 görünsün
            let step = Math.max(1, Math.floor((bytesPerSecond * tickMs) / 1000));
            if (pauseLimit !== undefined) step = Math.min(step, pauseLimit - globalLoaded());
            if (step <= 0) return;
            sent = Math.min(size, sent + step);
            loaded.set(key, sent);
            onProgress(sent);

            if (networkDropAt !== undefined && !dropped && totalBytes > 0 && globalLoaded() / totalBytes >= networkDropAt) {
              dropped = true;
              connectivity.goOffline(offlineMs);
              return;
            }
            if (file && failPaths.includes(file.relativePath) && sent >= size / 2) {
              stop();
              reject(new ApiError('Bu dosya türü desteklenmiyor.', 422, 'INVALID_MIME_TYPE'));
              return;
            }
            if (sent >= size) {
              stop();
              resolve({ filePath: `youthside/apps/${directory}/${Date.now()}_${key.length.toString(16)}${Math.floor(Math.random() * 1e8).toString(16)}.bin`, cdnUrl: '' });
            }
          }, tickMs);

          const stop = () => {
            clearInterval(timer);
            signal.removeEventListener('abort', onAbort);
          };
          const onAbort = () => {
            stop();
            reject(abortError());
          };
          signal.addEventListener('abort', onAbort, { once: true });
        }),
    };

    return runUploadQueue(transport, directory, files, { ...options, connectivity: options.connectivity ?? connectivity });
  };

  registerFiles: ShareApiClient['registerFiles'] = async (shareId, files, control) => {
    await this.latency(control?.signal, 0.3);
    this.guard();
    const share = this.find(shareId);
    if (share.status !== 'draft') throw new ApiError('Bu paylaşım tamamlanmış.', 409, 'SHARE_NOT_DRAFT');
    for (const record of files) {
      const file = share.files.get(record.relativePath);
      if (!file) throw new ApiError('Dosya bu paylaşımın listesinde yok.', 422, 'UNKNOWN_FILE');
      file.done = true;
      file.mimeType = record.mimeType;
      file.filePath = record.filePath;
    }
    const pendingCount = [...share.files.values()].filter((f) => !f.done).length;
    return { uploadedCount: files.length, pendingCount };
  };

  createShare: ShareApiClient['createShare'] = async (input, control) => {
    const { finalizeDelayMs = 800, failFinalize } = this.options;
    if (!Number.isFinite(finalizeDelayMs)) return new Promise(() => undefined);
    await sleep(finalizeDelayMs, control?.signal);
    this.guard();
    if (failFinalize) throw new ApiError('Sunucu hatası.', 500, 'SERVER_ERROR');
    const share = this.find(input.shareId);
    const files = [...share.files.values()];
    const pendingCount = files.filter((f) => !f.done).length;
    if (pendingCount > 0) throw new ApiError('Yüklenmeyi bekleyen dosyalar var.', 409, 'FILES_PENDING', { pendingCount });
    share.status = 'ready';
    return {
      token: share.token,
      publicUrl: `${MOCK_PUBLIC_BASE}${share.token}`,
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.entry.size, 0),
    };
  };

  deleteShare: ShareApiClient['deleteShare'] = async (shareId, control) => {
    await this.latency(control?.signal, 0.3);
    this.guard();
    this.find(shareId);
    this.shares.delete(shareId);
  };

  getPublicShare: ShareApiClient['getPublicShare'] = async (token, control) => {
    await this.latency(control?.signal);
    const preset = this.options.publicShares?.[token];
    if (preset === 'expired') throw new ApiError('Bu paylaşımın süresi dolmuş.', 410, 'SHARE_EXPIRED');
    if (preset) return preset;

    const share = [...this.shares.values()].find((s) => s.token === token && s.status === 'ready');
    if (!share) throw new ApiError('Paylaşım bulunamadı.', 404, 'SHARE_NOT_FOUND');
    const files = [...share.files.values()].sort((a, b) => a.entry.relativePath.localeCompare(b.entry.relativePath));
    return {
      token,
      createdAt: share.createdAt,
      expiresAt: null,
      fileCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.entry.size, 0),
      files: files.map((f, index) => ({
        id: index + 1,
        relativePath: f.entry.relativePath,
        size: f.entry.size,
        mimeType: f.mimeType,
        downloadUrl: `https://youthsidecdn.doracdn.com/${f.filePath ?? ''}`,
      })),
    };
  };

  private get limits(): ShareLimits {
    return this.options.limits ?? MOCK_SHARE_LIMITS;
  }

  private snapshot(share: MockShare): ShareProgressSnapshot {
    return {
      id: share.id,
      status: share.status,
      uploadDirectory: share.uploadDirectory,
      createdAt: share.createdAt,
      limits: this.limits,
      files: [...share.files.values()].map(({ entry, done }) => ({ ...entry, status: done ? 'done' : 'pending' })),
    };
  }

  private find(shareId: number): MockShare {
    const share = this.shares.get(shareId);
    if (!share) throw new ApiError('Paylaşım bulunamadı.', 404, 'SHARE_NOT_FOUND');
    return share;
  }

  private guard(): void {
    if (!this.options.unauthorized) return;
    this.options.onUnauthorized?.();
    throw ApiError.unauthorized();
  }

  private latency(signal?: AbortSignal, factor = 1): Promise<void> {
    return sleep((this.options.latencyMs ?? 300) * factor, signal);
  }
}

function mockToken(id: number): string {
  return `mock${String(id).padStart(18, '0')}`;
}
