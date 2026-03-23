"use client";

import React, { useMemo, useState } from "react";
import { formatCheatReason } from "@/src/lib/anti-cheat";

type ScoreApiItem = {
    id: number;
    player_id: string;
    payment_hash: string;
    playerName: string | null;
    time_ms: number;
    visible: boolean;
    createdAt: string;
    source: "score";
    isCheater: boolean;
    cheatReasons: string[];
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

function shortHash(hash: string, head = 12, tail = 8) {
    if (hash.length <= head + tail + 3) {
        return hash;
    }
    return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}

type RiskStatus = "NORMAL" | "WARNING" | "CHEATER";

function getRiskStatus(isCheater: boolean, reasons: string[]): RiskStatus {
    if (!isCheater) {
        return "NORMAL";
    }

    const hasOnlyIdleReason = reasons.length > 0 && reasons.every((reason) => reason === "idle_time_too_long");
    if (hasOnlyIdleReason) {
        return "WARNING";
    }

    return "CHEATER";
}

function getRiskBadgeClass(status: RiskStatus): string {
    if (status === "CHEATER") {
        return "bg-red-500 text-white";
    }
    if (status === "WARNING") {
        return "bg-amber-400 text-black";
    }
    return "bg-lime-400 text-black";
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

    const [selectedRoundKey, setSelectedRoundKey] = useState<string>("");
    const [visibilityOverrides, setVisibilityOverrides] = useState<Map<number, boolean>>(new Map());
    const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

    // Update selectedRoundKey when roundOptions changes
    React.useEffect(() => {
        if (roundOptions.length > 0 && !selectedRoundKey) {
            setSelectedRoundKey(roundOptions[0].key);
        }
    }, [roundOptions]);

    type GroupedScore = {
        paymentHash: string;
        playerName: string | null;
        playerId: string;
        items: ScoreApiItem[];
        bestTime: number;
        bestTimeSubmittedAt: string;
        count: number;
        isCheater: boolean;
        cheatReasons: string[];
        isExpanded: boolean;
    };

    const handleToggleVisible = async (scoreId: number, currentVisible: boolean) => {
        const next = !currentVisible;
        setVisibilityOverrides((prev) => new Map(prev).set(scoreId, next));
        try {
            const res = await fetch(`/api/score/${scoreId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ visible: next })
            });
            if (!res.ok) {
                // Revert on error
                setVisibilityOverrides((prev) => new Map(prev).set(scoreId, currentVisible));
            }
        } catch {
            setVisibilityOverrides((prev) => new Map(prev).set(scoreId, currentVisible));
        }
    };

    const toggleExpandInvoice = (paymentHash: string) => {
        const newExpanded = new Set(expandedInvoices);
        if (newExpanded.has(paymentHash)) {
            newExpanded.delete(paymentHash);
        } else {
            newExpanded.add(paymentHash);
        }
        setExpandedInvoices(newExpanded);
    };

    const groupedAndFilteredScores = useMemo(() => {
        if (!selectedRoundKey) {
            return [];
        }

        const roundScores = scores.filter(
            (score) =>
                getRoundMonthKeyByThaiCutoff(new Date(score.createdAt)) === selectedRoundKey && score.payment_hash
        );
        // Group by payment_hash
        const groups: Record<string, GroupedScore> = {};

        roundScores.forEach((score) => {
            const key = score.payment_hash;
            if (!groups[key]) {
                groups[key] = {
                    paymentHash: key,
                    playerName: score.playerName,
                    playerId: score.player_id,
                    items: [],
                    bestTime: Infinity,
                    bestTimeSubmittedAt: "",
                    count: 0,
                    isCheater: false,
                    cheatReasons: [],
                    isExpanded: expandedInvoices.has(key)
                };
            }
            groups[key].items.push(score);
            groups[key].count = groups[key].items.length;

            if (score.time_ms < groups[key].bestTime) {
                groups[key].bestTime = score.time_ms;
                groups[key].bestTimeSubmittedAt = score.createdAt;
            }

            if (score.isCheater) {
                groups[key].isCheater = true;
            }

            score.cheatReasons.forEach((reason) => {
                if (!groups[key].cheatReasons.includes(reason)) {
                    groups[key].cheatReasons.push(reason);
                }
            });
        });

        // Sort by best time
        return Object.values(groups)
            .map((group) => ({
                ...group,
                isExpanded: expandedInvoices.has(group.paymentHash ?? "")
            }))
            .sort((a, b) => a.bestTime - b.bestTime);
    }, [scores, selectedRoundKey, expandedInvoices]);

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

                {groupedAndFilteredScores.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-zinc-500">ยังไม่มีข้อมูลคะแนนในรอบเดือนที่เลือก</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[560px] text-left text-sm">
                            <thead className="bg-zinc-950/70 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                                <tr>
                                    <th className="px-3 py-2">Expand</th>
                                    <th className="px-3 py-2">Rank</th>
                                    <th className="px-3 py-2">Invoice</th>
                                    <th className="px-3 py-2">Player</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Best Time</th>
                                    <th className="px-3 py-2">Submissions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedAndFilteredScores.flatMap((group, groupIndex) => {
                                    const rows: React.ReactNode[] = [];
                                    const groupStatus = getRiskStatus(group.isCheater, group.cheatReasons);
                                    const hiddenCount = group.items.reduce((count, item) => {
                                        const isVisible = visibilityOverrides.has(item.id)
                                            ? (visibilityOverrides.get(item.id) as boolean)
                                            : item.visible;
                                        return isVisible ? count : count + 1;
                                    }, 0);
                                    const hiddenSummary =
                                        hiddenCount === 0
                                            ? "All Show"
                                            : hiddenCount === group.count
                                              ? "All Hide"
                                              : `Hide ${hiddenCount}/${group.count}`;
                                    const hiddenSummaryClass =
                                        hiddenCount === 0
                                            ? "text-lime-300"
                                            : hiddenCount === group.count
                                              ? "text-red-300"
                                              : "text-amber-300";

                                    // Collapsed row
                                    rows.push(
                                        <tr
                                            key={`header-${group.paymentHash ?? "unknown"}`}
                                            className="border-t border-zinc-800 bg-zinc-900/50 cursor-pointer hover:bg-zinc-800/50"
                                        >
                                            <td className="px-3 py-2 text-center">
                                                <button
                                                    onClick={() => toggleExpandInvoice(group.paymentHash ?? "")}
                                                    className="text-xs text-zinc-300 hover:text-zinc-100"
                                                >
                                                    {group.isExpanded ? "▼" : "▶"}
                                                </button>
                                            </td>
                                            <td className="px-3 py-2 font-semibold text-orange-300">
                                                #{groupIndex + 1}
                                            </td>
                                            <td className="px-3 py-2 text-[10px] text-zinc-400 font-mono">
                                                {shortHash(group.paymentHash ?? "UNKNOWN")}
                                            </td>
                                            <td className="px-3 py-2 text-zinc-200">
                                                {group.playerName ?? `PLAYER #${group.playerId}`}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-block px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getRiskBadgeClass(groupStatus)}`}
                                                >
                                                    {groupStatus}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-lime-300 font-semibold">
                                                {formatDurationFromMs(group.bestTime)}
                                            </td>
                                            <td className="px-3 py-2 text-zinc-400">
                                                <p>
                                                    {group.count} submission{group.count > 1 ? "s" : ""}
                                                </p>
                                                <p
                                                    className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${hiddenSummaryClass}`}
                                                >
                                                    {hiddenSummary}
                                                </p>
                                            </td>
                                        </tr>
                                    );

                                    // Expanded rows (all submissions)
                                    if (group.isExpanded) {
                                        const sortedItems = [...group.items].sort((a, b) => {
                                            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                                        });

                                        sortedItems.forEach((score, itemIndex) => {
                                            const currentVisible = visibilityOverrides.has(score.id)
                                                ? (visibilityOverrides.get(score.id) as boolean)
                                                : score.visible;
                                            const scoreStatus = getRiskStatus(score.isCheater, score.cheatReasons);

                                            rows.push(
                                                <tr
                                                    key={`${group.paymentHash ?? "unknown"}-${score.id}`}
                                                    className={`border-t border-zinc-700 ${!currentVisible ? "opacity-50" : ""}`}
                                                >
                                                    <td className="px-3 py-2"></td>
                                                    <td colSpan={6} className="px-4 py-3">
                                                        <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                                                                    submission {itemIndex + 1} | id #{score.id}
                                                                </span>
                                                                <span
                                                                    className={`px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getRiskBadgeClass(scoreStatus)}`}
                                                                >
                                                                    {scoreStatus}
                                                                </span>
                                                                <button
                                                                    onClick={() =>
                                                                        handleToggleVisible(score.id, currentVisible)
                                                                    }
                                                                    className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] transition-colors ${
                                                                        currentVisible
                                                                            ? "bg-lime-400 text-black hover:bg-lime-300"
                                                                            : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                                                                    }`}
                                                                >
                                                                    {currentVisible ? "SHOW" : "HIDE"}
                                                                </button>
                                                            </div>

                                                            <div className="mt-2 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
                                                                <p>
                                                                    Time:{" "}
                                                                    <span className="font-semibold text-lime-300">
                                                                        {formatDurationFromMs(score.time_ms)}
                                                                    </span>
                                                                </p>
                                                                <p>
                                                                    Created:{" "}
                                                                    <span className="font-semibold text-cyan-300">
                                                                        {formatThaiDateTime(new Date(score.createdAt))}
                                                                    </span>
                                                                </p>
                                                                <p>Status: {scoreStatus}</p>
                                                                <p>Visible: {currentVisible ? "YES" : "NO"}</p>
                                                            </div>

                                                            {score.isCheater && score.cheatReasons.length > 0 ? (
                                                                <div className="mt-2 border-t border-zinc-800 pt-2">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {score.cheatReasons.map((reason) => (
                                                                            <span
                                                                                key={`${score.id}-${reason}`}
                                                                                className="px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] bg-red-500/20 text-red-200 border border-red-500/40"
                                                                            >
                                                                                {formatCheatReason(reason)}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    }

                                    return rows;
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
