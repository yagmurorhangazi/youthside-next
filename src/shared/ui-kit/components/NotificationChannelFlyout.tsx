/**
 * @file NotificationChannelFlyout.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React from "react";
import { ChevronRight, Lock } from "lucide-react";

/**
 * NotificationChannelMode, ortak UI bileşeni içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export type NotificationChannelMode = "ALL" | "INCLUDE" | "NONE";

/**
 * ModeOption, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
type ModeOption = {
  id: NotificationChannelMode;
  label: string;
};

/**
 * NotificationChannelFlyoutItem, ortak UI bileşeni içinde kullanılan veri sözleşmesini tek yerde toplar.
 * Bu tipin ayrı tutulması, admin sayfasında aynı veriyi kullanan componentlerin birbirine gevşek bağlı kalmasını sağlar.
 */
export interface NotificationChannelFlyoutItem {
  id: string;
  label: string;
  Icon: React.ElementType;
  mode: NotificationChannelMode;
  disabled?: boolean;
  onModeChange?: (mode: NotificationChannelMode) => void;
  options?: ModeOption[];
}

/**
 * NotificationChannelFlyoutProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface NotificationChannelFlyoutProps {
  items: NotificationChannelFlyoutItem[];
}

/**
 * DEFAULT_OPTIONS, ekranda veya iş kuralında tekrar kullanılan seçenekleri tek kaynakta toplar.
 * Sabit listenin ayrı durması, yeni admin ekranı aynı seçenekleri kullanırken tutarsızlık oluşmasını engeller.
 */
const DEFAULT_OPTIONS: ModeOption[] = [
  { id: "ALL", label: "Tümü" },
  { id: "INCLUDE", label: "E-posta Gönderilen" },
  { id: "NONE", label: "E-posta Gönderilmeyen" },
];

/**
 * NotificationChannelFlyout, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export function NotificationChannelFlyout({
  items,
}: NotificationChannelFlyoutProps) {
  const [openItemId, setOpenItemId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!openItemId) return;
    const stillEnabled = items.some((i) => i.id === openItemId && !i.disabled);
    if (!stillEnabled) {
      setOpenItemId(null);
    }
  }, [items, openItemId]);

  /**
   * handleOpen, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
   * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
   */
  const handleOpen = React.useCallback((itemId: string, disabled?: boolean) => {
    if (disabled) return;
    setOpenItemId(itemId);
  }, []);

  /**
   * handleClose, kullanıcı aksiyonunu tek noktada yakalayıp UI davranışını kontrollü şekilde değiştirir.
   * Handler ayrı durduğu için JSX sadece ekrana odaklanır; iş kuralı okunabilir ve tekrar düzenlenebilir kalır.
   */
  const handleClose = React.useCallback((itemId: string, disabled?: boolean) => {
    if (disabled) return;
    setOpenItemId((prev) => (prev === itemId ? null : prev));
  }, []);

  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        const isOpen = !item.disabled && openItemId === item.id;
        const modeOptions = item.options ?? DEFAULT_OPTIONS;

        return (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => handleOpen(item.id, item.disabled)}
            onMouseLeave={() => handleClose(item.id, item.disabled)}
          >
            <button
              type="button"
              disabled={item.disabled}
              onMouseEnter={() => handleOpen(item.id, item.disabled)}
              onFocus={() => handleOpen(item.id, item.disabled)}
              onClick={() => handleOpen(item.id, item.disabled)}
              className={`w-full px-3 py-2 text-left text-[11px] font-medium flex items-center justify-between transition-colors
                ${
                  item.disabled
                    ? "opacity-40 cursor-not-allowed text-slate-400"
                    : "text-slate-600 hover:bg-slate-50"
                }
                ${isOpen ? "bg-slate-50" : ""}
              `}
            >
              <span className="flex items-center gap-2">
                <item.Icon size={12} className="text-slate-400" />
                {item.label}
              </span>

              {item.disabled ? (
                <Lock size={10} className="text-slate-300" />
              ) : (
                <ChevronRight size={12} className="text-slate-300" />
              )}
            </button>

            {isOpen && (
              <div className="absolute left-full -ml-px top-0 w-44 max-h-[min(50vh,320px)] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-[90]">
                {modeOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => item.onModeChange?.(opt.id)}
                    className={`w-full text-left px-3 py-2 text-[11px] font-medium flex items-center gap-2 transition-colors
                      ${
                        item.mode === opt.id
                          ? "bg-primary-50 text-primary-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }
                    `}
                  >
                    <span
                      className={`h-2.5 w-2.5 rounded-full border transition-colors
                        ${
                          item.mode === opt.id
                            ? "bg-primary-500 border-primary-500"
                            : "bg-white border-slate-300"
                        }
                      `}
                    />
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
