/**
 * @file Skeleton.tsx dosyası, kendi sorumluluğundaki TypeScript sürecini izole eder.
 * Author: Ferhat Cengiz
 */

/**
 * Dosya akışı: Bu dosya ortak UI bileşeni olarak çalışır; üst katmandan aldığı veriyi kendi sorumluluğu içinde işler.
 * Buradaki yorumlar özellikle yeni admin ekranlarında aynı parçanın ne zaman ve neden kullanılacağını göstermek için yazıldı.
 */

import React from "react";

/**
 * [MODÜL: SKELETON BİLEŞENLERİ]
 * Amaç: Sunucu yoğunken kullanıcıya anlamlı yükleniyor feedback'i sağlamak.
 * Mimar Notu: Shimmer animasyonu CSS ile yapıldı (JS tick yok = sıfır performans maliyeti).
 * Tüm skeleton'lar mevcut kartların layout yapısını birebir taklit eder.
 */

// ─── Base Skeleton ─────────────────────
export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

/**
 * Skeleton, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  width,
  height,
  rounded = "lg",
}) => (
  <div
    className={`skeleton-shimmer bg-slate-100 ${`rounded-${rounded}`} ${className}`}
    style={{ width, height }}
  />
);

// ─── Pipeline Kart Skeleton (Kanban) ──────────
export const PipelineCardSkeleton: React.FC = () => (
  <div className="bg-white p-4 rounded-2xl border border-slate-100/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] h-[155px] flex flex-col animate-pulse">
    {/* Header: Avatar + Icon */}
    <div className="flex justify-between items-start mb-3 shrink-0">
      <Skeleton className="w-9 h-9" rounded="full" />
      <Skeleton className="w-8 h-4" rounded="md" />
    </div>
    {/* İsim */}
    <Skeleton className="w-3/4 h-3.5 mb-2" rounded="md" />
    {/* Üniversite bilgisi */}
    <Skeleton className="w-full h-2.5" rounded="sm" />
    {/* Footer: Yıldız + Tarih */}
    <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-3 h-3" rounded="sm" />
        ))}
      </div>
      <Skeleton className="w-12 h-2.5" rounded="sm" />
    </div>
  </div>
);

// ─── Pipeline Kolon Skeleton (Kanban Tab yüklenirken) ──────
export interface PipelineColumnSkeletonProps {
  cardCount?: number;
}

/**
 * PipelineColumnSkeleton, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const PipelineColumnSkeleton: React.FC<PipelineColumnSkeletonProps> = ({
  cardCount = 3,
}) => (
  <div className="flex-1 min-w-[320px] max-w-[320px] rounded-[32px] p-4 flex flex-col h-[calc(100vh-280px)] border bg-slate-50/50 border-slate-100 animate-pulse">
    {/* Kolon Header */}
    <div className="flex items-center justify-between mb-4 px-1">
      <div className="flex items-center gap-2">
        <Skeleton className="w-2.5 h-2.5" rounded="full" />
        <Skeleton className="w-24 h-3" rounded="md" />
      </div>
      <Skeleton className="w-6 h-4" rounded="lg" />
    </div>
    {/* Skeleton Kartlar */}
    <div className="flex flex-col gap-3 flex-1">
      {Array.from({ length: cardCount }).map((_, i) => (
        <PipelineCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// ─── Başvuru Satır Skeleton (Liste Tab) ──────────
export const ApplicationRowSkeleton: React.FC = () => (
  <div
    className="flex items-center justify-between px-6 py-4 border-b border-slate-50 animate-pulse"
    style={{ height: "88px" }}
  >
    <div className="flex items-center gap-5 flex-1 min-w-0">
      {/* Checkbox */}
      <Skeleton className="w-5 h-5" rounded="lg" />
      {/* Avatar */}
      <Skeleton className="w-10 h-10 shrink-0" rounded="full" />
      {/* İsim + Üniversite */}
      <div className="min-w-0 flex-1">
        <Skeleton className="w-40 h-3.5 mb-2" rounded="md" />
        <Skeleton className="w-56 h-2.5" rounded="sm" />
      </div>
    </div>
    <div className="flex items-center gap-8">
      {/* Yıldızlar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="w-4 h-4" rounded="sm" />
        ))}
      </div>
      {/* Pipeline Badge */}
      <Skeleton className="w-20 h-6" rounded="lg" />
      {/* Aksiyon butonları */}
      <div className="flex gap-2">
        <Skeleton className="w-8 h-8" rounded="xl" />
        <Skeleton className="w-8 h-8" rounded="xl" />
      </div>
      {/* Favori */}
      <Skeleton className="w-8 h-8" rounded="xl" />
      {/* Tarih */}
      <Skeleton className="w-16 h-3" rounded="sm" />
    </div>
  </div>
);

// ─── Başvuru Tablo Skeleton (Toolbar + Satırlar) ──────────
export interface ApplicationListSkeletonProps {
  rowCount?: number;
}

/**
 * ApplicationListSkeleton, ortak UI bileşeni için izole edilmiş render parçasıdır.
 * Component sınırı, ekranda görünen parçayı kendi sorumluluğunda tutar ve üst sayfanın sadece veri/aksiyon vermesini sağlar.
 */
export const ApplicationListSkeleton: React.FC<
  ApplicationListSkeletonProps
> = ({ rowCount = 8 }) => (
  <div className="space-y-0 animate-fade-in">
    {/* Toolbar Skeleton */}
    <div className="px-8 py-4 border-b border-slate-50 flex items-center gap-4 bg-slate-50/20 min-h-[72px]">
      <Skeleton className="w-5 h-5" rounded="lg" />
      <Skeleton className="w-20 h-3" rounded="md" />
      <div className="h-6 w-[1px] bg-slate-100 mx-2" />
      <Skeleton className="w-[200px] h-9" rounded="xl" />
    </div>
    {/* Row Skeletons */}
    {Array.from({ length: rowCount }).map((_, i) => (
      <ApplicationRowSkeleton key={i} />
    ))}
  </div>
);
