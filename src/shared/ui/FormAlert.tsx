/**
 * [MODÜL: FORM BİLDİRİMİ — UI KIT GENİŞLETMESİ]
 * Amaç: Kit'teki Alert'i ekran okuyuculara duyurulacak şekilde sarmak.
 * Hata → role="alert" (hemen okunur), diğerleri → role="status" (sırası gelince okunur).
 */

import type { ReactNode } from 'react';
import { Alert, type AlertVariant } from '../ui-kit';

interface FormAlertProps {
  readonly variant?: AlertVariant;
  readonly title?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function FormAlert({ variant = 'error', title, children, className = '' }: FormAlertProps) {
  return (
    <div role={variant === 'error' ? 'alert' : 'status'} className={className}>
      <Alert variant={variant} title={title}>
        {children}
      </Alert>
    </div>
  );
}
