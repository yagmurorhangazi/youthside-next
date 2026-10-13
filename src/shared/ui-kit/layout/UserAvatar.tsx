/**
 * @file Yuvarlak kullanıcı/şirket avatarı — rail, header ve mobil çekmecede ortak.
 * Author: Ferhat Cengiz
 *
 * Görsel yoksa veya yüklenemezse (süresi dolmuş imzalı CDN adresleri 403'e düşer)
 * primary gradyanlı baş harf avatarına döner; kırık görsel ikonu gösterilmez.
 */

import { useEffect, useState } from 'react';
import { getInitial } from './navUtils';

export interface UserAvatarProps {
  readonly name: string;
  readonly src?: string | null;
  /** Şirket logoları için `contain`, profil fotoğrafı için `cover`. */
  readonly fit?: 'cover' | 'contain';
  readonly size?: 'sm' | 'md' | 'lg';
  /** Sağ altta yeşil "çevrimiçi" noktası. */
  readonly online?: boolean;
  readonly className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-10 w-10 text-sm',
  lg: 'h-11 w-11 text-base',
} as const;

export function UserAvatar({ name, src, fit = 'cover', size = 'md', online = false, className = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  // Farklı kullanıcı / güncellenmiş adres gelince yeniden denemeye izin ver.
  useEffect(() => setFailed(false), [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <span className={`relative inline-flex shrink-0 ${className}`}>
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={name}
          onError={() => setFailed(true)}
          className={`${SIZE_CLASSES[size]} rounded-full border border-slate-200 bg-white shadow-sm ${
            fit === 'contain' ? 'object-contain p-0.5' : 'object-cover'
          }`}
        />
      ) : (
        <span
          aria-label={name}
          className={`${SIZE_CLASSES[size]} flex items-center justify-center rounded-full bg-gradient-to-br from-primary-100 to-primary-200 font-bold text-primary-700 shadow-sm`}
        >
          {getInitial(name)}
        </span>
      )}
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
      )}
    </span>
  );
}
