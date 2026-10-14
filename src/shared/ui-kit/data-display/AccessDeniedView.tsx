/**
 * @file Yetki yetersizliği (403) görünümü.
 * Author: Ferhat Cengiz
 *
 * Yetki eksikliği bir sistem hatası değildir; dil sakin ve yönlendiricidir.
 * Gerekli izinlerin başlık/açıklama çözümlemesi tüketici uygulamada yapılır
 * (izin kataloğu uygulamaya özeldir), bileşen yalnızca listeyi çizer.
 */

export interface RequiredPermission {
  /** Teknik anahtar (ör. `campaigns.read`). */
  readonly key: string;
  readonly title: string;
  readonly description?: string;
}

export interface AccessDeniedViewProps {
  readonly title?: string;
  readonly message?: string;
  readonly permissions?: readonly RequiredPermission[];
  /** `any`: listedekilerden biri yeterli; `all`: hepsi gerekli. */
  readonly permissionMode?: 'any' | 'all';
  readonly eyebrow?: string;
  readonly hint?: string;
  /** Sayfa yerine kart içinde, az boşlukla göstermek için. */
  readonly compact?: boolean;
  readonly className?: string;
}

export function AccessDeniedView({
  title = 'Yetki gerekiyor',
  message = 'Bu sayfayı görüntülemek için gerekli yetkiye sahip değilsiniz.',
  permissions = [],
  permissionMode = 'all',
  eyebrow = 'Erişim politikası',
  hint = 'Sistem yöneticinizden bu izni rolünüze eklemesini isteyin.',
  compact = false,
  className = '',
}: AccessDeniedViewProps) {
  const modeText =
    permissionMode === 'any' ? 'Gerekli yetkilerden biri' : permissions.length > 1 ? 'Gerekli yetkiler' : 'Gerekli yetki';

  return (
    <div className={`flex items-center justify-center ${compact ? 'py-6' : 'min-h-[58vh] px-6'} ${className}`}>
      <section className="mx-auto w-full max-w-[680px] overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
        <div className="px-8 py-7">
          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-primary-500">{eyebrow}</p>
          <h2 className="text-[24px] font-black tracking-tight text-slate-800">{title}</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{message}</p>
        </div>

        {permissions.length > 0 && (
          <div className="border-t border-slate-100 px-8 py-6">
            <p className="mb-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{modeText}</p>
            <div className="divide-y divide-slate-100 border-y border-slate-100">
              {permissions.map((permission) => (
                <div key={permission.key} className="flex items-start justify-between gap-6 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800">{permission.title}</p>
                    {permission.description && (
                      <p className="mt-1 text-xs leading-5 text-slate-500">{permission.description}</p>
                    )}
                  </div>
                  <code className="mt-0.5 shrink-0 text-[11px] font-bold text-slate-400">{permission.key}</code>
                </div>
              ))}
            </div>
            {hint && <p className="mt-5 text-xs leading-5 text-slate-400">{hint}</p>}
          </div>
        )}
      </section>
    </div>
  );
}
