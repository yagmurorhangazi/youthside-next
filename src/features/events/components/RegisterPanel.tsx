/**
 * [MODÜL: ETKİNLİK KAYIT PANELİ — REACT ISLAND]
 * Amaç: Etkinlik detayında kayıt durumunu göstermek ve kayıt akışını yönetmek.
 *   - Giriş yapmış aday: sözleşme yoksa tek tıkla, varsa onay penceresiyle kayıt
 *   - Misafir: "Giriş yap" veya hesap açmadan hızlı kayıt formu
 * Durum sunucuda `resolveRegistrationState` ile hesaplanır (SRP).
 */

import { useState } from 'react';
import { actions } from 'astro:actions';
import { AlertCircle, CalendarCheck, CheckCircle2, Clock, ExternalLink, LogIn, Ticket, UsersRound } from 'lucide-react';
import { ROUTES } from '@/config/site';
import { allRequiredAccepted, ContractChecklist } from '@/features/common/components/ContractChecklist';
import type { Contract } from '@/features/common/types';
import { toFormErrors } from '@/shared/lib/action-result';
import { Button, ButtonLink, Modal } from '@/shared/ui';
import type { RegistrationState } from '../lib/registration-state';
import { QuickRegisterForm } from './QuickRegisterForm';

interface RegisterPanelProps {
  readonly eventId: string;
  readonly eventTitle: string;
  readonly eventPath: string;
  readonly dateLabel: string;
  readonly initialState: RegistrationState;
  readonly externalUrl: string | null;
  readonly contracts: readonly Contract[];
  /** Kontenjan bilgisi (null = sınırsız). */
  readonly remainingQuota: number | null;
}

const COPY: Record<RegistrationState, { title: string; text: string }> = {
  ended: { title: 'Etkinlik sona erdi', text: 'Bu etkinlik tamamlandı. Yaklaşan etkinliklere göz atabilirsin.' },
  external: { title: 'Kayıt organizatör sitesinde', text: 'Bu etkinliğe kayıtlar organizatörün kendi sayfasından alınıyor.' },
  registered: { title: 'Kaydın alındı', text: 'Etkinlik detayları e-posta adresine gönderilecek. Görüşmek üzere!' },
  full: { title: 'Kontenjan doldu', text: 'Bu etkinliğin kontenjanı doldu. Benzer etkinliklere göz atabilirsin.' },
  guest: { title: 'Etkinliğe katıl', text: 'Ücretsiz kaydol; hesabın yoksa birkaç bilgiyle hemen kaydını oluşturabilirsin.' },
  ready: { title: 'Etkinliğe katıl', text: 'Profil bilgilerinle tek tıkla kaydol.' },
};

export default function RegisterPanel(props: RegisterPanelProps) {
  const { eventId, eventTitle, eventPath, dateLabel, externalUrl, contracts, remainingQuota } = props;
  const [state, setState] = useState<RegistrationState>(props.initialState);
  const [dialog, setDialog] = useState<'none' | 'contracts' | 'quick' | 'success'>('none');
  const [accepted, setAccepted] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [newAccount, setNewAccount] = useState(false);

  const complete = (isNewAccount = false) => {
    setNewAccount(isNewAccount);
    setState('registered');
    setDialog('success');
  };

  /** Giriş yapmış aday için kayıt. */
  const register = async () => {
    setMessage(null);
    if (!allRequiredAccepted(contracts, accepted)) {
      setDialog('contracts');
      return;
    }
    setPending(true);
    const { data, error } = await actions.participation.registerEvent({ eventId, acceptedContracts: accepted });
    setPending(false);
    if (error) {
      setMessage(toFormErrors(error).message);
      return;
    }
    if (data.status === 'ok' || data.status === 'already_done') return complete();
    if (data.status === 'contracts_required') return setDialog('contracts');
    setMessage(data.message);
  };

  const loginHref = `${ROUTES.login}?redirect=${encodeURIComponent(eventPath)}`;

  const actionsByState = (() => {
    switch (state) {
      case 'ready':
        return (
          <Button icon={Ticket} className="w-full" isLoading={pending} onClick={register}>
            Hemen Kaydol
          </Button>
        );
      case 'guest':
        return (
          <div className="space-y-2">
            <Button icon={Ticket} className="w-full" onClick={() => setDialog('quick')}>
              Hemen Kaydol
            </Button>
            <ButtonLink href={loginHref} variant="outline" icon={LogIn} className="w-full">
              Giriş yaparak kaydol
            </ButtonLink>
          </div>
        );
      case 'external':
        return (
          <ButtonLink href={externalUrl ?? '#'} target="_blank" rel="noopener noreferrer" icon={ExternalLink} className="w-full">
            Organizatör sayfasında kaydol
          </ButtonLink>
        );
      case 'registered':
        return (
          <ButtonLink href={ROUTES.myEvents} variant="secondary" icon={CalendarCheck} className="w-full">
            Etkinliklerime git
          </ButtonLink>
        );
      default:
        return (
          <ButtonLink href={ROUTES.events} variant="secondary" className="w-full">
            Diğer etkinliklere göz at
          </ButtonLink>
        );
    }
  })();

  const copy = COPY[state];
  const done = state === 'registered';
  const closed = state === 'ended' || state === 'full';
  const StateIcon = done ? CheckCircle2 : closed ? Clock : Ticket;

  return (
    <>
      <section aria-labelledby="register-title" className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 ${done ? 'text-emerald-600' : closed ? 'text-gray-400' : 'text-primary-600'}`}>
            <StateIcon size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 id="register-title" className="font-bold text-gray-900">
              {copy.title}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{copy.text}</p>
          </div>
        </div>
        {actionsByState}
        {message && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            {message}
          </p>
        )}
        {remainingQuota !== null && !closed && !done && (
          <p className="mt-4 flex items-center justify-center gap-1.5 border-t border-gray-100 pt-4 text-xs font-semibold text-gray-500">
            <UsersRound size={14} aria-hidden="true" />
            {remainingQuota <= 20 ? <span className="text-orange-600">Son {remainingQuota} kontenjan!</span> : `${remainingQuota} kişilik kontenjan kaldı`}
          </p>
        )}
      </section>

      {/* Mobil sabit aksiyon çubuğu */}
      {!closed && (
        <div className="animate-slide-up fixed inset-x-0 bottom-0 z-40 border-t border-gray-100 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">{eventTitle}</p>
              <p className="truncate text-xs text-gray-500">{done ? 'Kaydın alındı' : dateLabel}</p>
            </div>
            <div className="w-40 shrink-0">
              {state === 'guest' ? (
                <Button icon={Ticket} className="w-full" onClick={() => setDialog('quick')}>
                  Kaydol
                </Button>
              ) : (
                actionsByState
              )}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={dialog === 'contracts'} onClose={() => setDialog('none')} title="Kayıt onayı" size="md" closeOnOutsideClick={!pending}>
        <div className="space-y-5 px-5 pb-6 sm:px-8 sm:pb-8">
          <ContractChecklist contracts={contracts} accepted={accepted} onChange={setAccepted} showErrors={Boolean(message)} />
          <Button
            className="w-full"
            icon={Ticket}
            isLoading={pending}
            disabled={!allRequiredAccepted(contracts, accepted)}
            onClick={async () => {
              setDialog('none');
              await register();
            }}
          >
            Onayla ve kaydol
          </Button>
        </div>
      </Modal>

      <Modal isOpen={dialog === 'quick'} onClose={() => setDialog('none')} title="Etkinliğe kaydol" size="lg">
        <div className="px-5 pb-6 sm:px-8 sm:pb-8">
          <p className="mb-5 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
            <strong className="text-gray-900">{eventTitle}</strong>
            <br />
            Zaten hesabın var mı?{' '}
            <a href={loginHref} className="font-bold text-primary-600 hover:underline">
              Giriş yap
            </a>
          </p>
          <QuickRegisterForm eventId={eventId} contracts={contracts} onSuccess={complete} onAlreadyRegistered={() => complete()} />
        </div>
      </Modal>

      <Modal isOpen={dialog === 'success'} onClose={() => setDialog('none')} size="sm">
        <div className="px-6 pb-8 pt-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 size={34} aria-hidden="true" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Kaydın tamamlandı!</h3>
          <p className="mt-2 text-sm text-gray-500">
            {newAccount
              ? 'Senin için bir Youthside hesabı oluşturduk. E-postanı doğrulayıp “Şifremi unuttum” ile şifre belirleyerek giriş yapabilirsin.'
              : 'Etkinlik bilgileri e-posta adresine gönderilecek.'}
          </p>
          <Button variant="secondary" className="mt-6 w-full" onClick={() => setDialog('none')}>
            Tamam
          </Button>
        </div>
      </Modal>
    </>
  );
}
