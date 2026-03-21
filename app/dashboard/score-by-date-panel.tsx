"use client";

import { useMemo, useState } from "react";

type ScoreApiItem = {
    id: number;
    player_id: number;
    playerName: string | null;
    time_ms: number;
    createdAt: string;
    source: "score" | "score_jan_feb_2026";
};

type ScoreByDatePanelProps = {
    scores: ScoreApiItem[];
    headingClassName: string;
};

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;
const CUTOFF_DAY = 21;
const CUTOFF_HOUR = 21;

function formatThaiDateTime(date: Date) {
    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok"
    }).format(date);
}

function toThaiPseudoDate(date: Date) {
    return new Date(date.getTime() + THAI_OFFSET_MS);
}

function formatThaiDateTimeWithMs(date: Date) {
    const thaiDate = toThaiPseudoDate(date);
    const year = thaiDate.getUTCFullYear();
    const month = String(thaiDate.getUTCMonth() + 1).padStart(2, "0");
    const day = String(thaiDate.getUTCDate()).padStart(2, "0");
    const hours = String(thaiDate.getUTCHours()).padStart(2, "0");
    const minutes = String(thaiDate.getUTCMinutes()).padStart(2, "0");
    const seconds = String(thaiDate.getUTCSeconds()).padStart(2, "0");
    const milliseconds = String(thaiDate.getUTCMilliseconds()).padStart(3, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

function getRoundMonthKeyByThaiCutoff(date: Date) {
    const thaiDate = toThaiPseudoDate(date);

    let year = thaiDate.getUTCFullYear();
    let month = thaiDate.getUTCMonth() + 1;

    const day = thaiDate.getUTCDate();
    const hour = thaiDate.getUTCHours();
    const minute = thaiDate.getUTCMinutes();
    const second = thaiDate.getUTCSeconds();
    const millisecond = thaiDate.getUTCMilliseconds();

    const passedCutoff =
        day > CUTOFF_DAY ||
        (day === CUTOFF_DAY &&
            (hour > CUTOFF_HOUR || (hour === CUTOFF_HOUR && (minute > 0 || second > 0 || millisecond > 0))));

    if (passedCutoff) {
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }

    return `${year}-${String(month).padStart(2, "0")}`;
}

function getRoundBoundariesByKey(roundKey: string) {
    const [yearText, monthText] = roundKey.split("-");
    const year = Number(yearText);
    const month = Number(monthText);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return null;
    }

    const endThaiUtc = Date.UTC(year, month - 1, CUTOFF_DAY, CUTOFF_HOUR, 0, 0, 0) - THAI_OFFSET_MS;
    const startThaiUtc = Date.UTC(year, month - 2, CUTOFF_DAY, CUTOFF_HOUR, 0, 0, 1) - THAI_OFFSET_MS;

    return {
        start: new Date(startThaiUtc),
        end: new Date(endThaiUtc)
    };
}

function formatRoundLabel(roundKey: string) {
    const [yearText, monthText] = roundKey.split("-");
    const year = Number(yearText);
    const month = Number(monthText);

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return roundKey;
    }

    return new Intl.DateTimeFormat("th-TH", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Bangkok"
    }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatRoundRangeText(roundKey: string) {
    const boundaries = getRoundBoundariesByKey(roundKey);
    if (!boundaries) {
        return "";
    }

    return `${formatThaiDateTimeWithMs(boundaries.start)} - ${formatThaiDateTimeWithMs(boundaries.end)}`;
}

function formatDurationFromMs(totalMs: number) {
    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

export default function ScoreByDatePanel({ scores, headingClassName }: ScoreByDatePanelProps) {
    const roundOptions = useMemo(() => {
        const roundKeys = new Set<string>();

        for (const score of scores) {
            roundKeys.add(getRoundMonthKeyByThaiCutoff(new Date(score.createdAt)));
        }

        return Array.from(roundKeys)
            .sort((a, b) => b.localeCompare(a))
            .map((key) => ({
                key,
                label: formatRoundLabel(key),
                rangeText: formatRoundRangeText(key)
            }));
    }, [scores]);

    const [selectedRoundKey, setSelectedRoundKey] = useState<string>(roundOptions[0]?.key ?? "");

    const selectedScores = useMemo(() => {
        if (!selectedRoundKey) {
            return [];
        }

        return scores
            .filter((score) => getRoundMonthKeyByThaiCutoff(new Date(score.createdAt)) === selectedRoundKey)
            .sort((a, b) => {
                if (a.time_ms !== b.time_ms) {
                    return a.time_ms - b.time_ms;
                }
                return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            });
    }, [scores, selectedRoundKey]);

    const selectedRoundRangeText = useMemo(() => {
        return formatRoundRangeText(selectedRoundKey);
    }, [selectedRoundKey]);

    return (
        <section className="border-l-4 border-orange-400 bg-zinc-900/90 p-6 shadow-[6px_6px_0_0_#2f2f2f]">
            <h2 className={`${headingClassName} text-xl font-bold uppercase tracking-tight text-orange-300`}>
                SCORE BY MONTH ROUND
            </h2>
            <p className="mt-2 text-xs tracking-[0.08em] text-zinc-500">
                รอบเดือนตัดที่วันที่ 21 เวลา 21:00 ไทย (เริ่มรอบถัดไปที่ 21:00:00.001)
            </p>

            <div className="mt-4 overflow-hidden border border-zinc-800 bg-black/50">
                <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-zinc-950/90 px-3 py-2 text-[11px] uppercase tracking-[0.12em]">
                    <label htmlFor="score-month-round" className={`${headingClassName} font-bold text-orange-300`}>
                        SELECT MONTH ROUND
                    </label>
                    <select
                        id="score-month-round"
                        value={selectedRoundKey}
                        onChange={(event) => setSelectedRoundKey(event.target.value)}
                        className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200 outline-none"
                    >
                        {roundOptions.map((option) => (
                            <option key={option.key} value={option.key}>
                                {option.label} ({option.key})
                            </option>
                        ))}
                    </select>
                    <span className="text-zinc-500">|</span>
                    <span className="text-zinc-400">{selectedRoundRangeText}</span>
                </div>

                {selectedScores.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-zinc-500">ยังไม่มีข้อมูลคะแนนในรอบเดือนที่เลือก</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                            <thead className="bg-zinc-950/70 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                                <tr>
                                    <th className="px-3 py-2">Rank</th>
                                    <th className="px-3 py-2">Player</th>
                                    <th className="px-3 py-2">Time</th>
                                    <th className="px-3 py-2">Submitted (TH)</th>
                                    <th className="px-3 py-2">Source</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedScores.map((score, index) => (
                                    <tr
                                        key={`${score.source}-${score.id}-${score.createdAt}`}
                                        className="border-t border-zinc-800"
                                    >
                                        <td className="px-3 py-2 font-semibold text-orange-300">#{index + 1}</td>
                                        <td className="px-3 py-2 text-zinc-200">
                                            {score.playerName ?? `PLAYER #${score.player_id}`}
                                        </td>
                                        <td className="px-3 py-2 text-lime-300">
                                            {formatDurationFromMs(score.time_ms)}
                                        </td>
                                        <td className="px-3 py-2 text-zinc-400">
                                            {formatThaiDateTime(new Date(score.createdAt))}
                                        </td>
                                        <td className="px-3 py-2 text-fuchsia-300">{score.source}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
