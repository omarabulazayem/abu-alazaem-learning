export type ProgressStatus = "new" | "learning" | "review" | "mastered";

export type ProgressRow = {
  child_id: string;
  surah_number: number;
  surah_name: string;
  memorized_percent: number;
  review_percent: number;
  status: ProgressStatus;
  last_activity_at: string;
};

export const learningSurahs = [
  { number: 1, displayNumber: "١", name: "الفاتحة", ayat: "٧ آيات", demoProgress: 100 },
  { number: 112, displayNumber: "١١٢", name: "الإخلاص", ayat: "٤ آيات", demoProgress: 72 },
  { number: 114, displayNumber: "١١٤", name: "الناس", ayat: "٦ آيات", demoProgress: 48 },
  { number: 113, displayNumber: "١١٣", name: "الفلق", ayat: "٥ آيات", demoProgress: 24 },
  { number: 107, displayNumber: "١٠٧", name: "الماعون", ayat: "٧ آيات", demoProgress: 0 },
  { number: 108, displayNumber: "١٠٨", name: "الكوثر", ayat: "٣ آيات", demoProgress: 0 },
] as const;

export function mergedSurahs(rows: ProgressRow[] | undefined, realChild: boolean) {
  const map = new Map((rows ?? []).map(row => [row.surah_number, row]));
  return learningSurahs.map(surah => {
    const row = map.get(surah.number);
    const progress = row ? Number(row.memorized_percent || 0) : realChild ? 0 : surah.demoProgress;
    const reviewProgress = row ? Number(row.review_percent || 0) : realChild ? 0 : Math.min(progress, 60);
    const status: ProgressStatus = row?.status ?? (progress >= 100 ? "mastered" : progress > 0 ? "learning" : "new");
    return {
      ...surah,
      progress,
      reviewProgress,
      status,
      statusLabel: status === "mastered" ? "متقنة" : progress > 0 ? "جاري حفظها" : "جديدة",
      tone: status === "mastered" ? "" : progress > 0 ? "warm" : "purple",
      lastActivityAt: row?.last_activity_at ?? null,
    };
  });
}

export function dailySourceKey(prefix: "memorize" | "review" | "memory", detail?: string | number) {
  const date = new Date().toISOString().slice(0, 10);
  return detail === undefined ? `${prefix}:${date}` : `${prefix}:${detail}:${date}`;
}

export function formatActivityDate(value: string | null) {
  if (!value) return "لا يوجد نشاط سابق";
  return new Date(value).toLocaleDateString("ar-EG");
}
