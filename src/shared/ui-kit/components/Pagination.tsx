/**
 * @file Pagination.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from '../primitives';

/**
 * PaginationProps, bu dosyanın UI davranışını izole eden yardımcı parçasıdır.
 * Ayrı isimlendirilmesi, kodu okuyan kişinin bu davranışın nerede başladığını ve nerede bittiğini hızlıca görmesini sağlar.
 */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  totalItems?: number;
  perPage?: number;
  onPageSizeChange?: (perPage: number) => void;
  pageSizeOptions?: number[];
}

/**
 * Pagination, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
  totalItems,
  perPage,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) => {
  // Sayfa numaralarını hesapla
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5; // Aktif sayfa etrafında kaç sayfa gösterilecek

    if (totalPages <= maxVisiblePages + 2) {
      // Az sayfa varsa hepsini göster
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Çok sayfa varsa ellipsis (...) kullan
      // Her zaman ilk ve son sayfayı göster
      // Aktif sayfanın etrafındaki sayfaları göster

      // Başlangıç
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Orta kısım
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      // Kenar durumları düzeltme
      if (currentPage <= 3) {
        end = 4; // 1 2 3 4 ... 20
      }
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3; // 1 ... 17 18 19 20
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Bitiş
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1 && !onPageSizeChange && !totalItems) return null;

  const startItem = totalItems && perPage ? Math.min((currentPage - 1) * perPage + 1, totalItems) : null;
  const endItem = totalItems && perPage ? Math.min(currentPage * perPage, totalItems) : null;

  return (
    <div
      className={`flex items-center justify-between border-t border-slate-50 p-4 bg-white ${className}`}
    >
      <div className="flex-1 text-sm text-slate-500 font-medium">
        {startItem !== null && endItem !== null && totalItems ? (
          <span>{startItem}-{endItem} / {totalItems} kayıt</span>
        ) : (
          <span>Sayfa {currentPage} / {totalPages}</span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onPageSizeChange && perPage && (
          <select
            value={perPage}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 rounded-xl border border-slate-100 bg-white px-3 text-xs font-bold text-slate-500 outline-none transition-colors hover:border-slate-200 focus:border-primary-300"
            aria-label="Sayfa başına kayıt sayısı"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option} kayıt
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft size={16} className="mr-1" />
          Önceki
        </Button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === "..." ? (
                <span className="w-8 h-8 flex items-center justify-center text-slate-400">
                  <MoreHorizontal size={16} />
                </span>
              ) : (
                <button
                  onClick={() => onPageChange(page as number)}
                  className={`
                    w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all
                    ${
                      currentPage === page
                        ? "bg-primary-600 text-white shadow-sm shadow-primary-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-primary-600"
                    }
                  `}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="text-slate-500 hover:text-slate-900"
        >
          Sonraki
          <ChevronRight size={16} className="ml-1" />
        </Button>
        </div>
      </div>
    </div>
  );
};
