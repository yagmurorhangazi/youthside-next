/**
 * [MODÜL: SÖZLEŞME ONAY LİSTESİ]
 * Amaç: Başvuru/kayıt öncesi şirketin sözleşmelerini (KVKK, açık rıza…) onay kutularıyla göstermek.
 * Kullanım: İlan başvurusu ve etkinlik kaydı formları (DRY). Belge yeni sekmede açılır.
 */

import { ExternalLink } from '@/shared/ui';
import type { Contract } from '../types';

interface ContractChecklistProps {
  readonly contracts: readonly Contract[];
  readonly accepted: readonly string[];
  readonly onChange: (accepted: string[]) => void;
  readonly showErrors?: boolean;
}

/** Zorunlu sözleşmelerin tamamı onaylandı mı? */
export function allRequiredAccepted(contracts: readonly Contract[], accepted: readonly string[]): boolean {
  return contracts.every((contract) => !contract.isRequired || accepted.includes(contract.id));
}

export function ContractChecklist({ contracts, accepted, onChange, showErrors = false }: ContractChecklistProps) {
  if (contracts.length === 0) return null;

  const toggle = (id: string) => onChange(accepted.includes(id) ? accepted.filter((item) => item !== id) : [...accepted, id]);

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-bold text-gray-900">Sözleşmeler</legend>
      {contracts.map((contract) => {
        const checked = accepted.includes(contract.id);
        const invalid = showErrors && contract.isRequired && !checked;
        return (
          <label
            key={contract.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition ${
              invalid ? 'border-red-300 bg-red-50' : checked ? 'border-primary-200 bg-primary-50/50' : 'border-gray-200 hover:bg-gray-50'
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggle(contract.id)}
              aria-invalid={invalid || undefined}
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary-600"
            />
            <span className="text-gray-700">
              {contract.fileUrl ? (
                <a
                  href={contract.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="inline-flex items-center gap-1 font-semibold text-primary-700 underline-offset-2 hover:underline"
                >
                  {contract.title}
                  <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : (
                <span className="font-semibold text-gray-900">{contract.title}</span>
              )}{' '}
              metnini okudum ve kabul ediyorum.
              {contract.isRequired && <span className="ml-1 text-xs font-semibold text-gray-400">(zorunlu)</span>}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
