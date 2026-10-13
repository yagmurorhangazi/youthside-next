/**
 * [MODÜL: BUTTON LINK — UI KIT GENİŞLETMESİ]
 * Amaç: Kit'teki Button görünümünü `<a>` elementiyle sunmak.
 * Neden: Sayfa geçişi yapan aksiyonlar semantik olarak link olmalı (erişilebilirlik, SEO,
 *        yeni sekmede açma). Stil `buttonClassName` üzerinden kit ile ortak kalır (DRY).
 */

import type { AnchorHTMLAttributes, ReactNode } from 'react';
import { buttonClassName, type ButtonProps } from '../ui-kit';

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  icon?: ButtonProps['icon'];
  children?: ReactNode;
}

export function ButtonLink({ variant = 'primary', size = 'md', icon: Icon, className = '', children, ...props }: ButtonLinkProps) {
  return (
    <a className={buttonClassName(variant, size, className)} {...props}>
      {Icon && <Icon size={size === 'sm' ? 14 : 18} className={children ? 'mr-2.5' : ''} strokeWidth={2.5} />}
      {children}
    </a>
  );
}
