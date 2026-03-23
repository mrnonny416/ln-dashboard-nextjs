import { evaluateCollectLogCheatV2, evaluatePairCheatV2 } from "@/src/lib/anti-cheat-v2";

export type AntiCheatInput = {
  player_id: string;
  payment_hash: string;
  round: number;
  time_ms: number | null;
  start_play: Date;
  end_play: Date | null;
  submitted: boolean;
  collect_time: string | null;
  collect_move: string | null;
  collect_fruit: string | null;
};

export type AntiCheatResult = {
  isCheater: boolean;
  reasons: string[];
};

export type CollectLogCheatSource = {
  player_id: string;
  payment_hash: string;
  round: number;
  time_ms: number | null;
  start_play: Date;
  end_play: Date | null;
  submitted: boolean;
  collect_time: string | null;
  collect_move: string | null;
  collect_fruit: string | null;
};

export const ANTI_CHEAT_CONFIG = {
  timeToleranceMs: 1000,
  minTimeMs: 300,
};

const REASON_TEXT: Record<string, string> = {
  invalid_end_play: "end_play ไม่ถูกต้อง",
  invalid_start_play: "start_play ไม่ถูกต้อง",
  end_before_or_equal_start: "end_play ต้องมากกว่า start_play",
  invalid_time_ms: "time_ms ต้องมากกว่า 0 และไม่เป็นค่าว่าง",
  below_min_time_limit: `time_ms ต่ำกว่าเกณฑ์ขั้นต่ำ (${ANTI_CHEAT_CONFIG.minTimeMs}ms)`,
  not_submitted: "submitted ต้องเป็น true",
  time_mismatch: `เวลา server มากกว่า time_ms เกิน ${ANTI_CHEAT_CONFIG.timeToleranceMs}ms`,
  collect_count_mismatch: "จำนวน collect_time และ collect_fruit ไม่เท่ากัน",
  collect_time_low_variance: "collect_time มี variance ต่ำผิดปกติ",
  movement_interval_too_regular: "ช่วงเวลาการเคลื่อนที่สม่ำเสมอเกินไป",
  reaction_time_too_fast: "reaction time เร็วเกินมนุษย์",
  idle_time_too_long: "มีช่วงหยุดนานผิดปกติ",
  fruit_interval_too_fast: "เก็บผลไม้ถี่เกินกว่าที่เป็นไปได้",
  low_input_entropy: "รูปแบบ input ซ้ำสูง (entropy ต่ำ)",
  repeating_input_pattern: "พบรูปแบบกดสลับซ้ำแบบสคริปต์",
  pattern_repeat_across_rounds: "รูปแบบการเล่นซ้ำเดิมข้ามหลายรอบ",
  impossible_speed: "ความเร็วการเคลื่อนที่เกินขีดจำกัด",
};

export function formatCheatReason(reasonCode: string): string {
  return REASON_TEXT[reasonCode] ?? reasonCode;
}

export function formatCheatReasons(reasonCodes: string[]): string[] {
  return reasonCodes.map((reasonCode) => formatCheatReason(reasonCode));
}

function parseArrayPayload(value: string | null): unknown[] | null {
  if (!value) {
    return null;
  }

  const attempts = [value, value.trim(), value.replace(/""/g, '"')];
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    attempts.push(trimmed.slice(1, -1).replace(/""/g, '"'));
  }

  for (const attempt of attempts) {
    try {
      const parsed = JSON.parse(attempt);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // continue
    }
  }
  return null;
}

export function evaluateCollectLogCheat(log: AntiCheatInput): AntiCheatResult {
  const reasons = new Set<string>();

  if (!(log.end_play instanceof Date) || Number.isNaN(log.end_play?.getTime())) {
    reasons.add("invalid_end_play");
  }

  if (!(log.start_play instanceof Date) || Number.isNaN(log.start_play.getTime())) {
    reasons.add("invalid_start_play");
  }

  if (log.end_play && log.start_play && log.end_play.getTime() <= log.start_play.getTime()) {
    reasons.add("end_before_or_equal_start");
  }

  if (log.time_ms === null || log.time_ms <= 0) {
    reasons.add("invalid_time_ms");
  }

  if (log.time_ms !== null && log.time_ms < ANTI_CHEAT_CONFIG.minTimeMs) {
    reasons.add("below_min_time_limit");
  }

  if (!log.submitted) {
    reasons.add("not_submitted");
  }

  if (log.end_play && log.time_ms !== null && log.time_ms > 0) {
    const actualDuration = log.end_play.getTime() - log.start_play.getTime();
    if (actualDuration - log.time_ms > ANTI_CHEAT_CONFIG.timeToleranceMs) {
      reasons.add("time_mismatch");
    }
  }

  const collectTimes = parseArrayPayload(log.collect_time);
  const collectFruits = parseArrayPayload(log.collect_fruit);

  if (collectTimes && collectFruits && collectTimes.length !== collectFruits.length) {
    reasons.add("collect_count_mismatch");
  }

  const v2Result = evaluateCollectLogCheatV2({
    round: log.round,
    collect_time: log.collect_time,
    collect_move: log.collect_move,
    collect_fruit: log.collect_fruit,
  });

  for (const reason of v2Result.reasons) {
    reasons.add(reason);
  }

  return {
    isCheater: reasons.size > 0,
    reasons: Array.from(reasons),
  };
}

export function evaluateSingleLogResult(log: CollectLogCheatSource): AntiCheatResult {
  return evaluateCollectLogCheat({
    player_id: log.player_id,
    payment_hash: log.payment_hash,
    round: log.round,
    time_ms: log.time_ms,
    start_play: log.start_play,
    end_play: log.end_play,
    submitted: log.submitted,
    collect_time: log.collect_time,
    collect_move: log.collect_move,
    collect_fruit: log.collect_fruit,
  });
}

export function buildPairCheatMap(logs: CollectLogCheatSource[]): Map<string, AntiCheatResult> {
  const grouped = new Map<string, CollectLogCheatSource[]>();

  for (const log of logs) {
    const key = `${log.player_id}:${log.payment_hash}`;
    const current = grouped.get(key) ?? [];
    current.push(log);
    grouped.set(key, current);
  }

  const resultByPair = new Map<string, AntiCheatResult>();
  for (const [key, pairLogs] of grouped.entries()) {
    const perLogResult = mergeCheatResults(
      pairLogs.map((pairLog) => evaluateSingleLogResult(pairLog))
    );

    const v2PairResult = evaluatePairCheatV2(
      pairLogs.map((pairLog) => ({
        round: pairLog.round,
        collect_time: pairLog.collect_time,
        collect_move: pairLog.collect_move,
        collect_fruit: pairLog.collect_fruit,
      }))
    );

    resultByPair.set(
      key,
      mergeCheatResults([perLogResult, v2PairResult])
    );
  }

  return resultByPair;
}

export function mergeCheatResults(results: AntiCheatResult[]): AntiCheatResult {
  const reasons = new Set<string>();

  for (const result of results) {
    for (const reason of result.reasons) {
      reasons.add(reason);
    }
  }

  return {
    isCheater: results.some((result) => result.isCheater),
    reasons: Array.from(reasons),
  };
}
