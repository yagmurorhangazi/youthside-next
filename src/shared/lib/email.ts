/**
 * [MODÜL: E-POSTA KURALLARI]
 * Amaç: E-posta adresinin İngiliz alfabesiyle (ASCII) yazılmasını sağlamak ve kullanıcıya
 *       "neden geçersiz" olduğunu açıkça söylemek.
 * Neden ayrı modül: Aynı kural sunucuda (Astro Action şeması) ve tarayıcıda (form alanından
 *       çıkınca anlık uyarı) kullanılır; mesaj ve kural tek yerde kalır (DRY).
 *
 * Not: Türkçe karakterli adresler (ayşe@gmail.com) e-posta sağlayıcılarının çoğunda geçersizdir;
 *      kullanıcı genelde klavye nedeniyle yanlışlıkla yazar. Bu yüzden genel "geçersiz" mesajı yerine
 *      hangi karakterin sorun olduğu söylenir.
 */

export const EMAIL_MESSAGES = {
  required: 'E-posta adresini gir.',
  nonAscii: 'E-posta adresinde Türkçe karakter (ç, ğ, ı, ö, ş, ü) kullanılamaz. İngiliz alfabesiyle yaz.',
  invalid: 'Geçerli bir e-posta adresi gir (ör. ad@ornek.com).',
} as const;

/** ASCII dışı karakterler (Türkçe harfler, emoji vb.). */
const NON_ASCII = /[^\x00-\x7F]/;

/** Tarayıcıdaki ön kontrol için kaba biçim kontrolü; kesin doğrulama sunucudaki şemadadır. */
const BASIC_FORMAT = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

export function hasNonAsciiCharacters(value: string): boolean {
  return NON_ASCII.test(value);
}

/** Anlık uyarı için: sorun yoksa null, varsa kullanıcıya gösterilecek mesaj. */
export function emailIssue(value: string): string | null {
  const email = value.trim();
  if (!email) return EMAIL_MESSAGES.required;
  if (hasNonAsciiCharacters(email)) return EMAIL_MESSAGES.nonAscii;
  if (!BASIC_FORMAT.test(email)) return EMAIL_MESSAGES.invalid;
  return null;
}
