/**
 * [MODÜL: ROBOTS.TXT]
 * Amaç: Arama motorlarına taranacak/taranmayacak alanları ve sitemap adresini bildirmek.
 * Kişisel panel ve kimlik doğrulama sayfaları taranmaz.
 */

import type { APIRoute } from 'astro';
import { ROUTES, SITE } from '@/config/site';

export const GET: APIRoute = ({ site }) => {
  const base = site?.href ?? SITE.url;
  const disallow = [ROUTES.dashboard, ROUTES.login, ROUTES.register, ROUTES.forgotPassword, ROUTES.resetPassword, ROUTES.logout, '/_actions/'];
  const body = ['User-agent: *', 'Allow: /', ...disallow.map((path) => `Disallow: ${path}`), '', `Sitemap: ${new URL('/sitemap.xml', base).href}`, ''].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
};
