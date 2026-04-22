import type { StatsPayload } from "./types";

export type NormalizedStats = {
  total: number;
  threats: number;
  clear: number;
  avgRisk: number;
  categoryDistribution: Record<string, number>;
};

export function normalizeStats(
  stats: StatsPayload | Record<string, unknown> | null | undefined,
): NormalizedStats {
  const s = (stats ?? {}) as StatsPayload;
  const total = Number(s.total_scanned ?? s.scanned ?? 0) || 0;
  const threats = Number(s.phishing_count ?? s.threats ?? 0) || 0;
  const clearRaw = Number(s.safe_count ?? s.clear ?? NaN);
  const clear = Number.isFinite(clearRaw) ? clearRaw : Math.max(0, total - threats);
  const avgRaw = Number(s.avg_risk ?? s.average_risk ?? 0);
  const avgRisk = Number.isFinite(avgRaw) ? avgRaw : 0;
  const categoryDistribution =
    s.category_distribution ?? s.phishing_by_category ?? {};

  return { total, threats, clear, avgRisk, categoryDistribution };
}
