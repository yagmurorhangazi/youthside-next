/**
 * @file "E-postanız" alanı. Değer Youthside oturumundaki e-postadır (useCurrentUser); kullanıcı yazmaz, alan salt okunurdur.
 * Not: Backend yükleyenin e-postasını bu alandan değil doğrulanmış token'dan alır; burada yalnızca gösterilir.
 */

import { Mail } from 'lucide-react';
import { useId } from 'react';
import { Skeleton } from '../components/Skeleton';
import { Input } from '../primitives/Input';
import type { CurrentUserStatus } from '../hooks/useCurrentUser';

export interface SenderEmailFieldProps {
  readonly status: CurrentUserStatus;
  readonly email?: string | null;
  readonly errorMessage?: string | null;
  readonly className?: string;
}

export const SENDER_EMAIL_LABEL = 'E-postanız';

export function SenderEmailField({ status, email, errorMessage, className = '' }: SenderEmailFieldProps) {
  const errorId = useId();

  if (status === 'loading') {
    return (
      <div className={`w-full space-y-1.5 ${className}`} aria-busy="true" aria-label={`${SENDER_EMAIL_LABEL} yükleniyor`}>
        <span className="ml-1 text-[11px] font-bold uppercase tracking-widest text-slate-400">{SENDER_EMAIL_LABEL}</span>
        <Skeleton height={46} rounded="2xl" className="w-full" />
      </div>
    );
  }

  const error =
    status === 'unauthorized'
      ? 'Oturum bulunamadı. Transfer için Youthside hesabınızla giriş yapın.'
      : status === 'error'
        ? (errorMessage ?? 'E-posta bilgisi alınamadı.')
        : undefined;

  return (
    <div className={className}>
      <Input
        label={SENDER_EMAIL_LABEL}
        aria-label={SENDER_EMAIL_LABEL}
        icon={Mail}
        type="email"
        value={status === 'ready' ? (email ?? '') : ''}
        placeholder={status === 'ready' ? undefined : 'Giriş yapılmadı'}
        readOnly
        aria-readonly="true"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        error={error}
        errorId={errorId}
        className="cursor-default text-slate-600 focus:bg-slate-50/50"
      />
    </div>
  );
}
