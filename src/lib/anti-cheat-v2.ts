export type V2CheatResult = {
  isCheater: boolean;
  reasons: string[];
};

export type V2CheatInput = {
  round: number;
  collect_time: string | null;
  collect_move: string | null;
  collect_fruit: string | null;
};

const V2_CONFIG = {
  collectIntervalVarianceMin: 4,
  minCollectEventsForVariance: 5,
  movementStdDevMinMs: 3,
  minMoveIntervalsForRegularity: 8,
  minReactionMs: 35,
  minTooFastIntervals: 3,
  maxIdleMs: 15_000,
  minFruitIntervalMs: 80,
  minFruitTooFastCount: 3,
  minInputEntropy: 0.6,
  pairPatternMatchRatio: 0.995,
  minMovesForPairCompare: 20,
  minPairMatchesForFlag: 2,
  minRoundsForPairCheck: 2,
  minMovesForEntropy: 20,
  minMovesForAlternatingPattern: 12,
};

type MovePoint = {
  t: number;
  x?: number;
  y?: number;
  input?: string;
};

function parseJsonSafe(value: string): unknown {
  const attempts = new Set<string>();
  const raw = value;
  const trimmed = value.trim();

  attempts.add(raw);
  attempts.add(trimmed);

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    attempts.add(trimmed.slice(1, -1));
  }

  attempts.add(trimmed.replace(/""/g, '"'));

  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    attempts.add(trimmed.slice(1, -1).replace(/""/g, '"'));
  }

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      // Continue trying alternative normalized forms.
    }
  }

  return value;
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function normalizeTimeArray(input: string | null): number[] {
  if (!input) {
    return [];
  }

  const raw = parseJsonSafe(input);

  if (Array.isArray(raw)) {
    const out = raw
      .map((item) => {
        if (typeof item === "object" && item !== null) {
          const record = item as Record<string, unknown>;
          return (
            coerceNumber(record.t) ??
            coerceNumber(record.time) ??
            coerceNumber(record.ts) ??
            coerceNumber(record.ms)
          );
        }
        return coerceNumber(item);
      })
      .filter((value): value is number => value !== null);

    return out.sort((a, b) => a - b);
  }

  if (typeof raw === "string") {
    const matches = raw.match(/-?\d+(?:\.\d+)?/g) ?? [];
    const numbers = matches
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));
    return numbers.sort((a, b) => a - b);
  }

  return [];
}

function normalizeFruitCount(input: string | null): number {
  if (!input) {
    return 0;
  }

  const raw = parseJsonSafe(input);
  if (Array.isArray(raw)) {
    return raw.length;
  }

  if (typeof raw === "string") {
    const pieces = raw
      .split(/[\n,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    return pieces.length;
  }

  return 0;
}

function normalizeMoves(input: string | null): MovePoint[] {
  if (!input) {
    return [];
  }

  const raw = parseJsonSafe(input);
  const points: MovePoint[] = [];

  if (Array.isArray(raw)) {
    raw.forEach((item, index) => {
      if (typeof item === "object" && item !== null) {
        const record = item as Record<string, unknown>;
        const t =
          coerceNumber(record.t) ??
          coerceNumber(record.time) ??
          coerceNumber(record.ts) ??
          coerceNumber(record.ms) ??
          index;
        const x = coerceNumber(record.x) ?? coerceNumber(record.col);
        const y = coerceNumber(record.y) ?? coerceNumber(record.row);
        const inputToken =
          typeof record.input === "string"
            ? record.input
            : typeof record.key === "string"
              ? record.key
              : typeof record.dir === "string"
                ? record.dir
                : typeof record.move === "string"
                  ? record.move
                  : undefined;

        points.push({ t, x: x ?? undefined, y: y ?? undefined, input: inputToken?.toLowerCase() });
        return;
      }

      const asNumber = coerceNumber(item);
      if (asNumber !== null) {
        points.push({ t: asNumber });
      }
    });
  } else if (typeof raw === "string") {
    const tokens = raw
      .split(/[\n,;|\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    tokens.forEach((token, index) => {
      points.push({ t: index, input: token.toLowerCase() });
    });
  }

  return points.sort((a, b) => a.t - b.t);
}

function diffs(values: number[]): number[] {
  if (values.length < 2) {
    return [];
  }
  const out: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    out.push(values[i] - values[i - 1]);
  }
  return out;
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  const m = mean(values);
  return values.reduce((acc, value) => acc + (value - m) ** 2, 0) / values.length;
}

function stdDev(values: number[]): number {
  return Math.sqrt(variance(values));
}

function entropy(tokens: string[]): number {
  if (tokens.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const total = tokens.length;
  let ent = 0;
  for (const count of counts.values()) {
    const p = count / total;
    ent -= p * Math.log2(p);
  }
  return ent;
}

function normalizedInputToken(input: string | undefined): string {
  if (!input) {
    return "?";
  }
  const token = input.toLowerCase().replace(/[^a-z]/g, "");
  if (!token) {
    return "?";
  }
  if (token.startsWith("u")) {
    return "U";
  }
  if (token.startsWith("d")) {
    return "D";
  }
  if (token.startsWith("l")) {
    return "L";
  }
  if (token.startsWith("r")) {
    return "R";
  }
  return token;
}

function detectAlternatingPattern(tokens: string[]): boolean {
  if (tokens.length < V2_CONFIG.minMovesForAlternatingPattern) {
    return false;
  }

  const a = tokens[0];
  const b = tokens[1];
  if (!a || !b || a === b) {
    return false;
  }

  let matches = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    const expected = i % 2 === 0 ? a : b;
    if (tokens[i] === expected) {
      matches += 1;
    }
  }

  return matches / tokens.length >= 0.9;
}

function sequenceSimilarity(a: string[], b: string[]): number {
  const minLen = Math.min(a.length, b.length);
  if (minLen === 0) {
    return 0;
  }
  let matches = 0;
  for (let i = 0; i < minLen; i += 1) {
    if (a[i] === b[i]) {
      matches += 1;
    }
  }
  return matches / minLen;
}

export function evaluateCollectLogCheatV2(log: V2CheatInput): V2CheatResult {
  const reasons = new Set<string>();

  const collectTimes = normalizeTimeArray(log.collect_time);
  const movePoints = normalizeMoves(log.collect_move);
  const fruitCount = normalizeFruitCount(log.collect_fruit);

  if (collectTimes.length >= V2_CONFIG.minCollectEventsForVariance) {
    const fruitDiffs = diffs(collectTimes);
    const varCollectIntervals = variance(fruitDiffs);
    if (varCollectIntervals <= V2_CONFIG.collectIntervalVarianceMin) {
      reasons.add("collect_time_low_variance");
    }

    const tooFastFruitCount = fruitDiffs.filter((delta) => delta < V2_CONFIG.minFruitIntervalMs).length;
    if (tooFastFruitCount >= V2_CONFIG.minFruitTooFastCount) {
      reasons.add("fruit_interval_too_fast");
    }
  }

  if (collectTimes.length > 0 && fruitCount > 0 && fruitCount !== collectTimes.length) {
    reasons.add("collect_count_mismatch");
  }

  const moveTimes = movePoints.map((point) => point.t);
  const moveIntervals = diffs(moveTimes);

  if (moveIntervals.length >= V2_CONFIG.minMoveIntervalsForRegularity) {
    const intervalsStd = stdDev(moveIntervals);
    if (intervalsStd <= V2_CONFIG.movementStdDevMinMs) {
      reasons.add("movement_interval_too_regular");
    }

    const tooFastCount = moveIntervals.filter((interval) => interval < V2_CONFIG.minReactionMs).length;
    if (tooFastCount >= V2_CONFIG.minTooFastIntervals) {
      reasons.add("reaction_time_too_fast");
    }

    const maxInterval = Math.max(...moveIntervals);
    if (maxInterval > V2_CONFIG.maxIdleMs) {
      reasons.add("idle_time_too_long");
    }
  }

  const tokens = movePoints
    .map((point) => normalizedInputToken(point.input))
    .filter((token) => token !== "?");

  if (tokens.length >= V2_CONFIG.minMovesForEntropy && entropy(tokens) < V2_CONFIG.minInputEntropy) {
    reasons.add("low_input_entropy");
  }

  if (tokens.length >= V2_CONFIG.minMovesForAlternatingPattern && detectAlternatingPattern(tokens)) {
    reasons.add("repeating_input_pattern");
  }

  return {
    isCheater: reasons.size > 0,
    reasons: Array.from(reasons),
  };
}

export function evaluatePairCheatV2(logs: V2CheatInput[]): V2CheatResult {
  const reasons = new Set<string>();
  if (logs.length < V2_CONFIG.minRoundsForPairCheck) {
    return { isCheater: false, reasons: [] };
  }

  const sequences = [...logs]
    .sort((a, b) => a.round - b.round)
    .map((log) => normalizeMoves(log.collect_move).map((point) => normalizedInputToken(point.input)))
    .filter((sequence) => sequence.length >= V2_CONFIG.minMovesForPairCompare);

  if (sequences.length < V2_CONFIG.minRoundsForPairCheck) {
    return { isCheater: false, reasons: [] };
  }

  let matchingPairs = 0;
  for (let i = 1; i < sequences.length; i += 1) {
    const sim = sequenceSimilarity(sequences[i - 1], sequences[i]);
    if (sim >= V2_CONFIG.pairPatternMatchRatio) {
      matchingPairs += 1;
    }
  }

  if (matchingPairs >= V2_CONFIG.minPairMatchesForFlag) {
    reasons.add("pattern_repeat_across_rounds");
  }

  return {
    isCheater: reasons.size > 0,
    reasons: Array.from(reasons),
  };
}
