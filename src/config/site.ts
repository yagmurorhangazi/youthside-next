/**
 * [MODÜL: SİTE YAPILANDIRMASI]
 * Amaç: Marka varlıkları, rota adresleri, navigasyon ve footer içeriğini tek kaynakta tutmak.
 * Neden: Menü linkleri header, mobil çekmece, footer ve panelde tekrar kullanılır. Burada bir kez
 *        tanımlanıp tüm bileşenlere veri olarak verilir (DRY + OCP: yeni menü öğesi için
 *        bileşen değiştirilmez).
 */

import { Briefcase, Building2, CalendarCheck, CalendarDays, FileText, LayoutDashboard, UserRound, Users } from 'lucide-react';
import type { SocialPlatform } from '@/features/companies/types';
import type { NavIcon } from '@/shared/ui';

export const SITE = {
  name: 'Youthside',
  url: 'https://youthside.co',
  defaultTitle: 'Youthside — Kariyer Platformu',
  defaultDescription: 'Genç yeteneklerin kariyer yolculuğundaki en güçlü destekçisi. Staj, iş ve etkinlik fırsatlarını keşfet.',
  logo: 'https://youthsidecdn.doracdn.com/youthside/YouthSide-Logo-1-e1720009952550.png',
  logoWhite: 'https://youthsidecdn.doracdn.com/youthside/ys-beyaz.png',
  favicon: 'https://avatars.githubusercontent.com/u/185502418?v=4',
  supportEmail: 'hello@youthside.co',
} as const;

export type AgreementTab = 'hizmet-sozlesmesi' | 'kvkk' | 'acik-riza';

/** Uygulama içi rotalar. Adres değişirse yalnızca burası güncellenir. */
export const ROUTES = {
  home: '/',
  companies: '/sirketler',
  clubs: '/kulupler',
  jobs: '/ilanlar',
  events: '/etkinlikler',
  login: '/giris-yap',
  register: '/kayit-ol',
  forgotPassword: '/sifremi-unuttum',
  resetPassword: '/sifre-sifirla',
  logout: '/guvenli-cikis',
  /**
   * LinkedIn yetkilendirmesini başlatan sunucu ucu ve dönüş adresi. Dönüş adresi LinkedIn uygulamasındaki
   * kayıtla BİREBİR aynı olmalı (port ve sondaki "/" dahil); mevcut kayıtlar "/" ile bittiği için öyle.
   */
  linkedinStart: '/oauth/linkedin',
  linkedinCallback: '/linkedin-callback/',
  dashboard: '/panelim',
  myApplications: '/panelim/basvurularim',
  myEvents: '/panelim/etkinliklerim',
  profile: '/panelim/profilim',
  agreements: (tab: AgreementTab = 'hizmet-sozlesmesi') => `/sozlesmeler?tab=${tab}`,
  company: (slug: string) => `/${slug}`,
  companyJobs: (slug: string) => `/${slug}/ilanlar`,
  companyEvents: (slug: string) => `/${slug}/etkinlikler`,
  companyAwards: (slug: string) => `/${slug}/oduller`,
  companyPhotos: (slug: string) => `/${slug}/fotograflar`,
  companyLocations: (slug: string) => `/${slug}/konumlar`,
  jobDetail: (companySlug: string, jobSlug: string) => `/${companySlug}/ilanlar/${jobSlug}`,
  eventDetail: (companySlug: string, eventSlug: string) => `/${companySlug}/etkinlikler/${eventSlug}`,
  /** Şirket slug'ı bilinmediğinde (ör. "Başvurularım" listesi) kullanılan kısa kalıcı linkler. */
  jobPermalink: (jobSlug: string) => `/ilan/${jobSlug}`,
  eventPermalink: (eventSlug: string) => `/etkinlik/${eventSlug}`,
} as const;

/** Giriş gerektiren yollar (middleware misafiri giriş sayfasına yönlendirir). */
const PROTECTED_PREFIXES = [ROUTES.dashboard];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Giriş sonrası dönülecek adresi doğrular. Yalnızca site içi göreli yol kabul edilir;
 * "//kotu.site" veya "https://..." gibi değerler ana sayfaya düşer (open redirect önlemi).
 */
export function safeRedirect(value: string | null | undefined, fallback: string = ROUTES.dashboard): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

export interface NavLink {
  readonly label: string;
  readonly href: string;
  readonly icon: NavIcon;
}

/** Üst menü ve mobil çekmecede gösterilen ana bölümler. */
export const MAIN_NAV: readonly NavLink[] = [
  { label: 'İlanlar', href: ROUTES.jobs, icon: Briefcase },
  { label: 'Etkinlikler', href: ROUTES.events, icon: CalendarDays },
  { label: 'Şirketler', href: ROUTES.companies, icon: Building2 },
  { label: 'Kulüpler', href: ROUTES.clubs, icon: Users },
];

/** Giriş yapmış adayın hesap menüsü (header menüsü, mobil çekmece ve panel kenar çubuğu). */
export const ACCOUNT_NAV: readonly NavLink[] = [
  { label: 'Panelim', href: ROUTES.dashboard, icon: LayoutDashboard },
  { label: 'Başvurularım', href: ROUTES.myApplications, icon: FileText },
  { label: 'Etkinliklerim', href: ROUTES.myEvents, icon: CalendarCheck },
  { label: 'Profilim', href: ROUTES.profile, icon: UserRound },
];

export interface FooterColumn {
  readonly title: string;
  readonly links: readonly { label: string; href: string }[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: 'Keşfet',
    links: [
      { label: 'İş ve Staj İlanları', href: ROUTES.jobs },
      { label: 'Etkinlikler', href: ROUTES.events },
      { label: 'Şirketler', href: ROUTES.companies },
      { label: 'Kulüpler', href: ROUTES.clubs },
    ],
  },
  {
    title: 'Hesabım',
    links: [
      { label: 'Kayıt Ol', href: ROUTES.register },
      { label: 'Giriş Yap', href: ROUTES.login },
      { label: 'Başvurularım', href: ROUTES.myApplications },
      { label: 'Profilim', href: ROUTES.profile },
    ],
  },
  {
    title: 'Destek',
    links: [
      { label: 'İletişim', href: `mailto:${SITE.supportEmail}` },
      { label: 'Kullanım Koşulları', href: ROUTES.agreements('hizmet-sozlesmesi') },
      { label: 'KVKK Aydınlatma Metni', href: ROUTES.agreements('kvkk') },
      { label: 'Açık Rıza Beyanı', href: ROUTES.agreements('acik-riza') },
    ],
  },
];

export const LEGAL_LINKS = [
  { label: 'Kullanım Koşulları', href: ROUTES.agreements('hizmet-sozlesmesi') },
  { label: 'Gizlilik Politikası', href: ROUTES.agreements('kvkk') },
  { label: 'Çerez Politikası', href: ROUTES.agreements('kvkk') },
] as const;

export const SOCIAL_LINKS: readonly { label: string; href: string; platform: SocialPlatform }[] = [
  { label: 'Instagram', href: 'https://www.instagram.com/youthsideco/', platform: 'instagram' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/youthside-co', platform: 'linkedin' },
];
