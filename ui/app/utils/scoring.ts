export type Grade = "A" | "B" | "C" | "D" | "F";

export function computeGrade(score: number): Grade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function clamp(val: number): number {
  return Math.max(0, Math.min(100, val));
}

/**
 * Services / Databases composite score (0–100):
 *   Error Rate (50%) + Response Time (50%)
 */
export function computeServiceScore(
  errorRate: number,
  responseTimeMs: number,
  rtThresholdMs: number = 3000
): number {
  const errorSub = clamp(100 - errorRate * 10);
  const rtSub = clamp(100 - (responseTimeMs / rtThresholdMs) * 100);
  return Math.round(errorSub * 0.5 + rtSub * 0.5);
}

/**
 * Infrastructure composite score (0–100):
 *   CPU (40%) + Memory (30%) + Disk (30%)
 */
export function computeHostScore(
  cpuPct: number,
  memPct: number,
  diskPct: number
): number {
  const cpuSub = clamp(100 - cpuPct);
  const memSub = clamp(100 - memPct);
  const diskSub = clamp(100 - diskPct);
  return Math.round(cpuSub * 0.4 + memSub * 0.3 + diskSub * 0.3);
}

/**
 * Web App composite score (0–100):
 *   Error Rate (40%) + Duration (30%) + Availability (30%)
 */
export function computeWebAppScore(
  errorRate: number,
  durationMs: number,
  durationThresholdMs: number = 5000
): number {
  const errorSub = clamp(100 - errorRate * 10);
  const durSub = clamp(100 - (durationMs / durationThresholdMs) * 100);
  const score = Math.round(errorSub * 0.5 + durSub * 0.5);
  return clamp(score);
}

/**
 * Database composite score (0–100):
 *   Error Rate (50%) + Response Time (50%)
 */
export function computeDatabaseScore(
  errorRate: number,
  responseTimeMs: number,
  rtThresholdMs: number = 500
): number {
  const errorSub = clamp(100 - errorRate * 10);
  const rtSub = clamp(100 - (responseTimeMs / rtThresholdMs) * 100);
  return Math.round(errorSub * 0.5 + rtSub * 0.5);
}

export function gradeColor(grade: Grade): string {
  switch (grade) {
    case "A":
      return "#2bba4e";
    case "B":
      return "#7ec83e";
    case "C":
      return "#ffb700";
    case "D":
      return "#ff8c00";
    case "F":
      return "#dc3545";
  }
}

export function scoreBackground(score: number): string {
  if (score >= 90) return "rgba(43, 186, 78, 0.5)";
  if (score >= 80) return "rgba(126, 200, 62, 0.4)";
  if (score >= 70) return "rgba(255, 183, 0, 0.35)";
  if (score >= 60) return "rgba(255, 140, 0, 0.35)";
  return "rgba(220, 53, 69, 0.35)";
}
