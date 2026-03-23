"use client";

import React, { useEffect, useMemo, useState } from "react";
import { formatCheatReason } from "@/src/lib/anti-cheat";

type GameLogItem = {
    id: number;
    player_id: string;
    player_name: string | null;
    payment_hash: string;
    round: number;
    time_ms: number | null;
    submitted: boolean;
    start_play: string;
    end_play: string | null;
    submitted_at: string | null;
    invoice_status: string;
    isCheater: boolean;
    cheatReasons: string[];
};

type SortKey = "player_id" | "payment_hash" | "latestRound" | "count";
type SortDirection = "asc" | "desc";

type GameLogTableProps = {
    logs: GameLogItem[];
};

type GroupedLog = {
    groupKey: string;
    player_id: string;
    player_name: string | null;
    payment_hash: string;
    invoice_status: string;
    items: GameLogItem[];
    latestRound: number;
    isExpanded: boolean;
    isCheater: boolean;
    cheatReasons: string[];
};

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;
const CUTOFF_DAY = 21;
const CUTOFF_HOUR = 21;

function formatDurationFromMs(totalMs: number | null) {
    if (totalMs === null) {
        return "-";
    }

    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

function getServerDurationMs(startPlay: string, endPlay: string | null) {
    if (!endPlay) {
        return null;
    }

    const startMs = new Date(startPlay).getTime();
    const endMs = new Date(endPlay).getTime();

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
        return null;
    }

    return endMs - startMs;
}

function getServerDiffMs(serverDurationMs: number | null, reportedTimeMs: number | null) {
    if (serverDurationMs === null || reportedTimeMs === null) {
        return null;
    }

    return serverDurationMs - reportedTimeMs;
}

function formatSignedDurationFromMs(totalMs: number | null) {
    if (totalMs === null) {
        return "-";
    }

    const sign = totalMs > 0 ? "+" : totalMs < 0 ? "-" : "";
    return `${sign}${formatDurationFromMs(Math.abs(totalMs))}`;
}

function shortHash(hash: string, head = 12, tail = 8) {
    if (hash.length <= head + tail + 3) {
        return hash;
    }
    return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}

function formatThaiDateTime(value: string) {
    return new Date(value).toLocaleString("th-TH");
}

function toThaiPseudoDate(date: Date) {
    return new Date(date.getTime() + THAI_OFFSET_MS);
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

function formatRoundRangeText(roundKey: string) {
    const boundaries = getRoundBoundariesByKey(roundKey);
    if (!boundaries) {
        return "";
    }

    return `${formatThaiDateTime(boundaries.start.toISOString())} - ${formatThaiDateTime(boundaries.end.toISOString())}`;
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

export default function GameLogTable({ logs }: GameLogTableProps) {
    const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
    const [submittedFilter, setSubmittedFilter] = useState<"all" | "submitted" | "not_submitted">("all");
    const [selectedRoundKey, setSelectedRoundKey] = useState<string>("");
    const [sortKey, setSortKey] = useState<SortKey>("latestRound");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

    const roundOptions = useMemo(() => {
        const roundKeys = new Set<string>();

        for (const log of logs) {
            roundKeys.add(getRoundMonthKeyByThaiCutoff(new Date(log.start_play)));
        }

        return Array.from(roundKeys)
            .sort((a, b) => b.localeCompare(a))
            .map((key) => ({
                key,
                label: formatRoundLabel(key),
                rangeText: formatRoundRangeText(key)
            }));
    }, [logs]);

    useEffect(() => {
        if (roundOptions.length > 0 && !selectedRoundKey) {
            setSelectedRoundKey(roundOptions[0].key);
        }
    }, [roundOptions, selectedRoundKey]);

    const groupedRows = useMemo(() => {
        if (!selectedRoundKey) {
            return [];
        }

        const roundLogs = logs.filter(
            (log) => getRoundMonthKeyByThaiCutoff(new Date(log.start_play)) === selectedRoundKey
        );

        // Step 1: Group by player_id + payment_hash
        const groups: Record<string, GameLogItem[]> = {};

        roundLogs.forEach((log) => {
            const key = `${log.player_id}:${log.payment_hash}`;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(log);
        });

        // Step 2: Create GroupedLog items and apply filter
        let groupedItems: GroupedLog[] = Object.entries(groups).map(([key, items]) => ({
            groupKey: key,
            player_id: items[0].player_id,
            player_name: items[0].player_name,
            payment_hash: items[0].payment_hash,
            invoice_status: items[0].invoice_status,
            items: items,
            latestRound: Math.max(...items.map((i) => i.round)),
            isExpanded: expandedGroups.has(key),
            isCheater: items.some((i) => i.isCheater),
            cheatReasons: Array.from(new Set(items.flatMap((i) => i.cheatReasons)))
        }));

        // Step 3: Apply filters (use latest/any item for filtering)
        groupedItems = groupedItems.filter((group) => {
            const isPaid = group.invoice_status === "paid";
            if (paidFilter === "paid" && !isPaid) {
                return false;
            }
            if (paidFilter === "unpaid" && isPaid) {
                return false;
            }
            // For status filter, check if any item in the group matches
            if (submittedFilter === "submitted" && !group.items.some((i) => i.submitted)) {
                return false;
            }
            if (submittedFilter === "not_submitted" && !group.items.every((i) => !i.submitted)) {
                return false;
            }
            return true;
        });

        // Step 4: Sort groups
        groupedItems.sort((a, b) => {
            let result = 0;
            if (sortKey === "player_id") {
                result = a.player_id.localeCompare(b.player_id);
            } else if (sortKey === "payment_hash") {
                result = a.payment_hash.localeCompare(b.payment_hash);
            } else if (sortKey === "latestRound") {
                result = a.latestRound - b.latestRound;
            } else if (sortKey === "count") {
                result = a.items.length - b.items.length;
            }

            return sortDirection === "asc" ? result : -result;
        });

        return groupedItems;
    }, [logs, selectedRoundKey, paidFilter, submittedFilter, sortKey, sortDirection, expandedGroups]);

    const selectedRoundRangeText = useMemo(() => formatRoundRangeText(selectedRoundKey), [selectedRoundKey]);

    const toggleExpand = (groupKey: string) => {
        const newExpanded = new Set(expandedGroups);
        if (newExpanded.has(groupKey)) {
            newExpanded.delete(groupKey);
        } else {
            newExpanded.add(groupKey);
        }
        setExpandedGroups(newExpanded);
    };

    const displayCount = groupedRows.reduce((count, group) => count + (group.isExpanded ? group.items.length : 1), 0);

    return (
        <>
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-black/40 px-4 py-3 text-[11px] uppercase tracking-[0.12em]">
                <label htmlFor="gamelog-month-round" className="font-bold text-orange-300">
                    MONTH ROUND
                </label>
                <select
                    id="gamelog-month-round"
                    value={selectedRoundKey}
                    onChange={(event) => setSelectedRoundKey(event.target.value)}
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                >
                    {roundOptions.map((option) => (
                        <option key={option.key} value={option.key}>
                            {option.label} ({option.key})
                        </option>
                    ))}
                </select>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-400">{selectedRoundRangeText}</span>
                <span className="ml-2 text-zinc-500">filter:</span>
                <select
                    value={paidFilter}
                    onChange={(event) => setPaidFilter(event.target.value as "all" | "paid" | "unpaid")}
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                >
                    <option value="all">PAID: ALL</option>
                    <option value="paid">PAID: YES</option>
                    <option value="unpaid">PAID: NO</option>
                </select>
                <select
                    value={submittedFilter}
                    onChange={(event) =>
                        setSubmittedFilter(event.target.value as "all" | "submitted" | "not_submitted")
                    }
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                >
                    <option value="all">SUBMITTED: ALL</option>
                    <option value="submitted">SUBMITTED: YES</option>
                    <option value="not_submitted">SUBMITTED: NO</option>
                </select>
                <span className="ml-2 text-zinc-500">sort:</span>
                <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SortKey)}
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                >
                    <option value="player_id">PLAYER ID</option>
                    <option value="payment_hash">INVOICE</option>
                    <option value="latestRound">LATEST ROUND</option>
                    <option value="count">ROUND COUNT</option>
                </select>
                <select
                    value={sortDirection}
                    onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                >
                    <option value="desc">DESC</option>
                    <option value="asc">ASC</option>
                </select>
                <span className="ml-auto text-zinc-500">rows: {displayCount}</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] border-collapse text-sm">
                    <thead className="bg-zinc-900 text-left text-zinc-500">
                        <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-[0.14em]">
                            <th className="w-12 px-4 py-3"></th>
                            <th className="px-4 py-3">Player</th>
                            <th className="px-4 py-3">Payment Hash</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3"># Rounds</th>
                            <th className="px-4 py-3">Latest Round</th>
                            <th className="px-4 py-3">Paid</th>
                            <th className="px-4 py-3">Submitted</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedRows.flatMap((group) => {
                            const groupStatus = getRiskStatus(group.isCheater, group.cheatReasons);

                            return [
                                <tr
                                    key={`group-${group.groupKey}`}
                                    className="border-t border-zinc-800 bg-black/50 hover:bg-zinc-800/70 cursor-pointer"
                                >
                                    <td className="px-3 py-3 text-center">
                                        <button
                                            onClick={() => toggleExpand(group.groupKey)}
                                            className="text-orange-300 hover:text-orange-100"
                                        >
                                            {group.isExpanded ? "▼" : "▶"}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-zinc-100">
                                        {group.player_name?.trim() || group.player_id}
                                    </td>
                                    <td
                                        className="max-w-[200px] truncate px-4 py-3 text-zinc-400"
                                        title={group.payment_hash}
                                    >
                                        {shortHash(group.payment_hash)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="space-y-1">
                                            <span
                                                className={`inline-block px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getRiskBadgeClass(groupStatus)}`}
                                            >
                                                {groupStatus}
                                            </span>
                                            {group.isCheater && group.cheatReasons.length > 0 ? (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {group.cheatReasons.map((reason) => (
                                                        <span
                                                            key={`${group.groupKey}-${reason}`}
                                                            className="px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] bg-red-500/20 text-red-200 border border-red-500/40"
                                                        >
                                                            {formatCheatReason(reason)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[10px] leading-tight text-zinc-500">-</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center text-zinc-300">{group.items.length}</td>
                                    <td className="px-4 py-3 text-orange-300">{group.latestRound}</td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                                group.invoice_status === "paid"
                                                    ? "bg-lime-400 text-black"
                                                    : "bg-zinc-800 text-zinc-300"
                                            }`}
                                        >
                                            {group.invoice_status === "paid" ? "YES" : "NO"}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                                group.items.some((i) => i.submitted)
                                                    ? "bg-fuchsia-400 text-black"
                                                    : "bg-zinc-800 text-zinc-300"
                                            }`}
                                        >
                                            {group.items.some((i) => i.submitted) ? "YES" : "NO"}
                                        </span>
                                    </td>
                                </tr>,
                                ...(group.isExpanded
                                    ? group.items
                                          .sort((a, b) => b.round - a.round)
                                          .map((log) => (
                                              <tr
                                                  key={log.id}
                                                  className="border-t border-zinc-800 bg-black/20 hover:bg-zinc-900/50"
                                              >
                                                  <td className="px-3 py-2"></td>
                                                  <td colSpan={7} className="px-4 py-3">
                                                      {(() => {
                                                          const serverDurationMs = getServerDurationMs(
                                                              log.start_play,
                                                              log.end_play
                                                          );
                                                          const serverDiffMs = getServerDiffMs(
                                                              serverDurationMs,
                                                              log.time_ms
                                                          );

                                                          return (
                                                              <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3">
                                                                  <div className="flex flex-wrap items-center gap-2">
                                                                      <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                                                                          round {log.round} | id #{log.id}
                                                                      </span>
                                                                      <span
                                                                          className={`px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                                                              log.submitted
                                                                                  ? "bg-fuchsia-400 text-black"
                                                                                  : "bg-zinc-800 text-zinc-300"
                                                                          }`}
                                                                      >
                                                                          {log.submitted
                                                                              ? "SUBMITTED"
                                                                              : "NOT SUBMITTED"}
                                                                      </span>
                                                                  </div>

                                                                  <div className="mt-2 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
                                                                      <p>
                                                                          Client Time:{" "}
                                                                          <span className="font-semibold text-lime-300">
                                                                              {formatDurationFromMs(log.time_ms)}
                                                                          </span>
                                                                      </p>
                                                                      <p>
                                                                          Server Duration:{" "}
                                                                          <span className="font-semibold text-cyan-300">
                                                                              {formatDurationFromMs(serverDurationMs)}
                                                                          </span>
                                                                      </p>
                                                                      <p>
                                                                          Server Diff:{" "}
                                                                          <span
                                                                              className={
                                                                                  serverDiffMs === null
                                                                                      ? "text-zinc-400"
                                                                                      : Math.abs(serverDiffMs) > 1000
                                                                                        ? "text-red-300"
                                                                                        : "text-orange-300"
                                                                              }
                                                                          >
                                                                              {formatSignedDurationFromMs(serverDiffMs)}
                                                                          </span>
                                                                      </p>
                                                                      <p>Payment: {shortHash(log.payment_hash)}</p>
                                                                      <p>
                                                                          Started:{" "}
                                                                          <span className="font-semibold text-cyan-300">
                                                                              {formatThaiDateTime(log.start_play)}
                                                                          </span>
                                                                      </p>
                                                                      <p>
                                                                          Ended:{" "}
                                                                          <span className="font-semibold text-cyan-300">
                                                                              {log.end_play
                                                                                  ? formatThaiDateTime(log.end_play)
                                                                                  : "-"}
                                                                          </span>
                                                                      </p>
                                                                      <p className="sm:col-span-2 lg:col-span-2">
                                                                          Submitted At:{" "}
                                                                          <span className="font-semibold text-cyan-300">
                                                                              {log.submitted_at
                                                                                  ? formatThaiDateTime(log.submitted_at)
                                                                                  : "-"}
                                                                          </span>
                                                                      </p>
                                                                  </div>
                                                              </div>
                                                          );
                                                      })()}
                                                  </td>
                                              </tr>
                                          ))
                                    : [])
                            ];
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
}
