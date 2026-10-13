/**
 * @file Layout katmanının (rail, header, mobil nav, menü çekmecesi) ortak veri sözleşmesi.
 * Author: Ferhat Cengiz
 *
 * MİMARİ KARAR:
 *   Layout bileşenleri router'ı, store'u ve yetki sistemini BİLMEZ. Tüketici uygulama
 *   görünür menü öğelerini (yetki filtresi uygulanmış hâlde), aktif öğeyi ve gezinme
 *   callback'ini verir. Böylece aynı rail ATS, admin, çağrı merkezi ve cash
 *   panellerinde farklı router/auth kurulumlarıyla çalışır.
 */

import type { ComponentType } from 'react';

/**
 * lucide-react ikonlarıyla uyumlu, kütüphaneden bağımsız ikon tipi.
 * Aynı imzaya sahip herhangi bir SVG bileşeni de verilebilir.
 */
export type NavIcon = ComponentType<{
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
}>;

/** Rail, alt nav ve menü çekmecesinde gösterilen tek navigasyon öğesi. */
export interface NavItem {
  /** Benzersiz anahtar — `activeKey` bununla karşılaştırılır. */
  readonly key: string;
  readonly label: string;
  readonly icon: NavIcon;
  /** SPA yolu (`/admin/sirketler`) ya da tam URL. */
  readonly href?: string;
  /** true ise `href` yeni sekmede açılır (ör. callcenter/cash gibi izole modüller). */
  readonly external?: boolean;
  /** Küçük sayı rozeti (ör. okunmamış). 0/undefined ise gösterilmez. */
  readonly badge?: number | string;
  /** true ise aynı yolla başlayan alt yollarda aktif sayılmaz. */
  readonly exact?: boolean;
  /** Menü öğesine özel tehlikeli aksiyon görünümü (ör. Çıkış). */
  readonly danger?: boolean;
}

/** Header kullanıcı menüsü ve mobil çekmece başlığında gösterilen kullanıcı özeti. */
export interface UserSummary {
  readonly name: string;
  readonly email?: string;
  /** İsmin altındaki kısa açıklama (ör. "Şirket Hesabı", "Süper Admin"). */
  readonly subtitle?: string;
  /** Kişisel avatar veya şirket logosu. Yüklenemezse baş harfe düşer. */
  readonly avatarSrc?: string | null;
  /** Şirket logoları için `contain`, profil fotoğrafları için `cover`. */
  readonly avatarFit?: 'cover' | 'contain';
  /** Kullanıcı menüsünde isim altında gösterilecek rol etiketleri. */
  readonly roles?: readonly string[];
}

/** Marka alanı (rail üstü). */
export interface NavBrand {
  readonly logoSrc: string;
  readonly alt?: string;
  /** Logo altındaki küçük modül etiketi (ör. "Çağrı Merkezi"). */
  readonly subtitle?: string;
  readonly onClick?: () => void;
}
