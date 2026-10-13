/**
 * [MODÜL: UI GENİŞLETME TİPLERİ]
 * Amaç: `.astro` bileşenlerinin paylaştığı tipleri tek yerde tutmak
 * (Astro frontmatter'ından tip dışa aktarmak yerine).
 */

export interface Crumb {
  readonly label: string;
  readonly href?: string;
}
