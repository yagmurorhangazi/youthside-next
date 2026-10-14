/**
 * @file ShareApiClient'ın gerçek HTTP uygulaması.
 *  - Metadata: share backend'i (backend/, bkz. INTEGRATION.md).
 *  - Dosya baytları: tarayıcıdan doğrudan ATS → CDN (`UploadTransport`). Share sunucusu bayt görmez.
 */

import type { HttpClient } from './http';
import type { ShareApiClient } from './ShareApiClient';
import type {
  DraftSummary,
  PublicShare,
  RegisterFilesResult,
  ShareDraft,
  ShareLink,
  ShareProgressSnapshot,
} from './types';
import { runUploadQueue } from './uploadQueue';
import type { UploadTransport } from './uploadTransport';

export class HttpShareApiClient implements ShareApiClient {
  constructor(
    private readonly http: HttpClient,
    private readonly transport: UploadTransport,
  ) {}

  prepareShare: ShareApiClient['prepareShare'] = (manifest, control) =>
    this.http.request<ShareDraft>('/shares', { method: 'POST', body: { manifest }, signal: control?.signal });

  getShareProgress: ShareApiClient['getShareProgress'] = (shareId, control) =>
    this.http.request<ShareProgressSnapshot>(`/shares/${shareId}`, { signal: control?.signal });

  listDrafts: ShareApiClient['listDrafts'] = (control) =>
    this.http.request<DraftSummary[]>('/shares', { query: { status: 'draft' }, signal: control?.signal });

  uploadFiles: ShareApiClient['uploadFiles'] = (directory, files, options) =>
    runUploadQueue(this.transport, directory, files, options);

  registerFiles: ShareApiClient['registerFiles'] = (shareId, files, control) =>
    this.http.request<RegisterFilesResult>(`/shares/${shareId}/files`, { method: 'POST', body: { files }, signal: control?.signal });

  createShare: ShareApiClient['createShare'] = (input, control) =>
    this.http.request<ShareLink>(`/shares/${input.shareId}/finalize`, { method: 'POST', body: {}, signal: control?.signal });

  deleteShare: ShareApiClient['deleteShare'] = async (shareId, control) => {
    await this.http.request<null>(`/shares/${shareId}`, { method: 'DELETE', signal: control?.signal });
  };

  getPublicShare: ShareApiClient['getPublicShare'] = (token, control) =>
    this.http.request<PublicShare>(`/public/shares/${encodeURIComponent(token)}`, { auth: false, signal: control?.signal });
}
