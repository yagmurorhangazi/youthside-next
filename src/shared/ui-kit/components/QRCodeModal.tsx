/**
 * @file QRCodeModal.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

// @ts-nocheck
// Bu dosyada geçici olarak tip kontrolü kapalıdır; amaç önce eski davranışı bozmadan yorum ve izolasyon sınırlarını görünür yapmaktır.
// Sonraki teknik borç adımında API cevapları ve component props tipleri netleştirilerek bu satır kaldırılmalıdır.

import React, { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Modal } from "./Modal";
import { Button } from '../primitives';
import { Download, ExternalLink } from "lucide-react";
import type { UiTerminology } from "../types";

/**
 * QRCodeModalProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  description?: string;
  companyLogo?: string;
  /** Hesap türüne göre değişen metinler; verilmezse nötr varsayılan kullanılır. */
  terminology?: UiTerminology;
}

/**
 * QR_COLORS, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
const QR_COLORS = [
  { id: "slate", value: "#0f172a" },
  { id: "blue", value: "#2563eb" },
  { id: "indigo", value: "#4f46e5" },
  { id: "violet", value: "#7c3aed" },
  { id: "fuchsia", value: "#c026d3" },
  { id: "rose", value: "#e11d48" },
  { id: "red", value: "#dc2626" },
  { id: "orange", value: "#ea580c" },
  { id: "amber", value: "#d97706" },
  { id: "emerald", value: "#059669" },
  { id: "cyan", value: "#0891b2" },
];

/**
 * QRCodeModal, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  description = "Bu QR kodu okutarak ilana veya etkinliğe mobil cihazınızdan müracaat edebilirsiniz.",
  companyLogo,
  terminology,
}) => {
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [fgColor, setFgColor] = React.useState(QR_COLORS[0].value);
  const [showLogo, setShowLogo] = React.useState(true);

  /**
   * handleDownload, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
   * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
   */
  const handleDownload = () => {
    if (!qrRef.current) return;

    try {
      // SVG yerine doğrudan Canvas'ın kendisini alıyoruz
      const canvas = qrRef.current;
      
      // Data URL (base64) formatına çevir
      const pngUrl = canvas.toDataURL("image/png");
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR_${title.replace(/\s+/g, "_")}.png`;
      downloadLink.href = pngUrl;
      downloadLink.click();
    } catch (error) {
      console.error("[Karekod İndirme Hatası]: Canvas export edilemedi. CORS kaynaklı olabilir.", error);
      alert("Görsel indirilirken bir hata oluştu.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Karekod Özelleştirici"
      size="md"
    >
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start">
        {/* Sol: QR Code Görüntü */}
        <div className="w-full md:w-1/2 flex flex-col items-center">
          <div className="bg-white p-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center justify-center mb-6 w-full max-w-[280px] aspect-square">
            <QRCodeCanvas
              ref={qrRef}
              value={url}
              size={220}
              bgColor={"#ffffff"}
              fgColor={fgColor}
              level={"H"} // Logolu QR kodların yüksek doğrulama seviyesine ihtiyacı var
              includeMargin={false}
              imageSettings={
                showLogo && companyLogo
                  ? {
                      src: companyLogo,
                      x: undefined,
                      y: undefined,
                      height: 50,
                      width: 50,
                      excavate: true, // Logonun arkasındaki QR desenlerini sil (daha okunaklı)
                      crossOrigin: "anonymous" // Çapraz domain indirme sorunlarını engeller
                    }
                  : undefined
              }
            />
          </div>

          <div className="flex flex-col gap-3 w-full max-w-[280px]">
            <Button
              variant="primary"
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold shadow-md shadow-primary-500/20"
            >
              <Download size={18} /> QR Kodu İndir
            </Button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl text-sm font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              <ExternalLink size={18} /> Tarayıcıda Aç
            </a>
          </div>
        </div>

        {/* Sağ: Ayarlar */}
        <div className="w-full md:w-1/2 flex flex-col space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 mb-1 leading-tight">
              {title}
            </h3>
            <p className="text-sm font-medium text-slate-500">{description}</p>
          </div>

          <div className="h-[1px] w-full bg-slate-100"></div>

          {/* Logo Toggle */}
          {companyLogo && (
            <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50/50">
              <div>
                <h4 className="font-bold text-slate-800 text-sm">
                  {terminology?.logo ?? "Logo"}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  QR kodun merkezine ekle
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={showLogo}
                  onChange={() => setShowLogo(!showLogo)}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 pl-[3px]"></div>
              </label>
            </div>
          )}

          {/* Color Picker Grid */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700">
              QR Kodu Rengi
            </label>
            <div className="flex flex-wrap gap-2.5">
              {QR_COLORS.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setFgColor(color.value)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${fgColor === color.value ? "ring-4 ring-offset-2 ring-primary-200 scale-110 shadow-lg" : "hover:scale-110 shadow-sm opacity-90"}`}
                  style={{ backgroundColor: color.value }}
                  title="Tıkla ve Seç"
                >
                  {fgColor === color.value && (
                    <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                  )}
                </button>
              ))}

              <div className="relative">
                <label
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-110 
                                    ${!QR_COLORS.some((c) => c.value === fgColor) ? "ring-4 ring-offset-2 ring-primary-200 scale-110 shadow-lg" : ""}`}
                  title="Özel Kurumsal Renk Seç"
                  style={
                    !QR_COLORS.some((c) => c.value === fgColor)
                      ? { backgroundColor: fgColor }
                      : {
                          backgroundImage:
                            "conic-gradient(from 90deg, #ef4444, #eab308, #22c55e, #3b82f6, #a855f7, #ef4444)",
                        }
                  }
                >
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                  />
                  {/* Orta Kısım */}
                  {!QR_COLORS.some((c) => c.value === fgColor) ? (
                    <div className="w-2.5 h-2.5 bg-white rounded-full z-10 mix-blend-overlay"></div>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white drop-shadow-md z-10"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                  )}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
