export type RiskStatus = "NORMAL" | "WARNING" | "HIGH_RISK" | "CHEATER";

const HARD_REASONS = new Set([
  "invalid_end_play",
  "invalid_start_play",
  "end_before_or_equal_start",
  "invalid_time_ms",
  "time_mismatch",
  "impossible_speed",
  "pattern_repeat_across_rounds",
  "reaction_time_too_fast",
]);

const MEDIUM_REASONS = new Set([
  "movement_interval_too_regular",
  "low_input_entropy",
  "repeating_input_pattern",
  "fruit_interval_too_fast",
  "collect_count_mismatch",
  "collect_time_low_variance",
]);

const LOW_REASONS = new Set([
  "idle_time_too_long",
]);

export function getRiskStatus(isCheater: boolean, reasons: string[]): RiskStatus {
  if (!isCheater || reasons.length === 0) {
    return "NORMAL";
  }

  let mediumScore = 0;
  let lowScore = 0;

  for (const reason of reasons) {
    if (HARD_REASONS.has(reason)) {
      return "CHEATER";
    }
    if (MEDIUM_REASONS.has(reason)) {
      mediumScore += 1;
      continue;
    }
    if (LOW_REASONS.has(reason)) {
      lowScore += 1;
      continue;
    }
    mediumScore += 1;
  }

  const weighted = mediumScore * 2 + lowScore;
  if (weighted >= 3) {
    return "HIGH_RISK";
  }

  return "WARNING";
}

export function getRiskBadgeClass(status: RiskStatus): string {
  if (status === "CHEATER") {
    return "bg-red-500 text-white";
  }
  if (status === "HIGH_RISK") {
    return "bg-orange-500 text-white";
  }
  if (status === "WARNING") {
    return "bg-amber-400 text-black";
  }
  return "bg-lime-400 text-black";
}
