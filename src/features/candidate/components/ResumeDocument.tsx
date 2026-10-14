/**
 * [MODÜL: OTOMATİK CV ŞABLONU — REACT-PDF]
 * Amaç: Aday profil bilgilerinden tek sayfalık, metin tabanlı A4 CV üretmek.
 *
 * Neden react-pdf: CV JSX ile tanımlanır, çıktı metin tabanlıdır (seçilebilir, ATS/AI analizinin
 * okuyabildiği, ~30-60 KB). 2026-ui'deki html2canvas + jsPDF çıktısı resim tabanlıydı.
 * Bu modül yalnızca `generate-resume.ts` içinden tembel (dynamic import) yüklenir; sayfa
 * bundle'larına girmez. Türkçe glifler için Inter TTF `public/fonts/`'tan okunur.
 * Renkler `global.css` token'larından çalışma anında okunup prop olarak verilir (DRY).
 * Referans: youthside-2026-ui/panelim/profilim → #cv-template-hidden
 */

import { Document, Font, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { ResumeData } from '../types';

export interface ResumePalette {
  readonly accent: string;
  readonly ink: string;
  readonly muted: string;
}

const FONT_FAMILY = 'Inter';
let fontsRegistered = false;

/** Font dosyaları site kökünden okunur (Apache/Node bunları uzun önbellekle sunar). */
export function registerResumeFonts(origin: string) {
  if (fontsRegistered) return;
  Font.register({
    family: FONT_FAMILY,
    fonts: [
      { src: `${origin}/fonts/Inter-Regular.ttf`, fontWeight: 400 },
      { src: `${origin}/fonts/Inter-Bold.ttf`, fontWeight: 700 },
    ],
  });
  // Kelimeler hecelenmesin (Türkçe kelimelerde yanlış tirelemeyi önler).
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

function createStyles({ accent, ink, muted }: ResumePalette) {
  return StyleSheet.create({
    page: { fontFamily: FONT_FAMILY, fontSize: 10.5, color: ink, paddingVertical: 48, paddingHorizontal: 52, lineHeight: 1.45 },
    accentBar: { width: 48, height: 4, backgroundColor: accent, marginBottom: 14, borderRadius: 2 },
    name: { fontSize: 26, fontWeight: 700, color: ink, lineHeight: 1.2, marginBottom: 8 },
    contact: { flexDirection: 'row', flexWrap: 'wrap', color: muted, fontSize: 10 },
    contactItem: { marginRight: 14, marginBottom: 2 },
    section: { marginTop: 26 },
    // textTransform kullanılmaz: Türkçe büyük harf kuralını bilmez ("Eğitim" → "EĞITIM" olurdu).
    sectionTitle: { fontSize: 11, fontWeight: 700, color: accent, letterSpacing: 1.2, marginBottom: 8 },
    row: { flexDirection: 'row', marginBottom: 4 },
    label: { width: 120, color: muted },
    value: { flex: 1, fontWeight: 700 },
    link: { color: ink, textDecoration: 'none' },
    footer: { position: 'absolute', bottom: 28, left: 52, right: 52, fontSize: 8, color: muted, textAlign: 'center' },
  });
}

const upper = (text: string) => text.toLocaleUpperCase('tr-TR');

function Row({ label, value, styles }: { label: string; value: string | null; styles: ReturnType<typeof createStyles> }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function ResumeDocument({ data, palette }: { data: ResumeData; palette: ResumePalette }) {
  const styles = createStyles(palette);
  const hasEducation = Boolean(data.university || data.department || data.grade || data.graduationYear);
  const links = [
    { label: 'LinkedIn', url: data.linkedinUrl },
    { label: 'GitHub / Portfolyo', url: data.githubUrl },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url));

  return (
    <Document title={`${data.fullName} — CV`} author={data.fullName} creator="Youthside" producer="Youthside" language="tr-TR">
      <Page size="A4" style={styles.page}>
        <View style={styles.accentBar} />
        <Text style={styles.name}>{data.fullName}</Text>
        <View style={styles.contact}>
          <Text style={styles.contactItem}>{data.email}</Text>
          {data.phone && <Text style={styles.contactItem}>{data.phone}</Text>}
        </View>

        {hasEducation && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{upper('Eğitim')}</Text>
            <Row label="Üniversite" value={data.university} styles={styles} />
            <Row label="Bölüm" value={data.department} styles={styles} />
            <Row label="Sınıf / durum" value={data.grade} styles={styles} />
            <Row label="Mezuniyet yılı" value={data.graduationYear} styles={styles} />
          </View>
        )}

        {links.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{upper('Bağlantılar')}</Text>
            {links.map((item) => (
              <View key={item.label} style={styles.row}>
                <Text style={styles.label}>{item.label}</Text>
                <Link src={item.url} style={[styles.value, styles.link]}>
                  {item.url}
                </Link>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>
          Bu özgeçmiş Youthside profil bilgilerinden otomatik oluşturulmuştur.
        </Text>
      </Page>
    </Document>
  );
}
