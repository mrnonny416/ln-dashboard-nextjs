"use client";

import React, { useEffect, useMemo, useState } from "react";

type InvoiceRow = {
    id: number;
    player_id: string;
    player_name: string | null;
    payment_hash: string;
    amount_sats: number;
    memo: string | null;
    status: string;
    created_at: string;
    paid_at: string | null;
    round_count: number;
    submitted_count: number;
    score_count: number;
    has_anomaly: boolean;
    anomaly_reasons: string[];
};

type InvoiceTableProps = {
    invoices: InvoiceRow[];
};

type SortKey = "player" | "invoiceCount" | "totalRounds" | "latestCreatedAt";
type SortDirection = "asc" | "desc";

type GroupedInvoice = {
    playerId: string;
    playerName: string | null;
    displayName: string;
    items: InvoiceRow[];
    invoiceCount: number;
    paidCount: number;
    hasGameLogCount: number;
    totalRounds: number;
    anomalyInvoiceCount: number;
    latestCreatedAtMs: number;
    isExpanded: boolean;
};

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;
const CUTOFF_DAY = 21;
const CUTOFF_HOUR = 21;

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

function formatAnomalyReason(reason: string) {
    const map: Record<string, string> = {
        unpaid_with_gamelog: "ยังไม่จ่าย แต่มี GameLog",
        unpaid_with_submitted_round: "ยังไม่จ่าย แต่มีรอบที่ submitted",
        unpaid_with_score: "ยังไม่จ่าย แต่มี Score",
        paid_without_paid_at: "สถานะ paid แต่ไม่มี paid_at",
        unpaid_with_paid_at: "สถานะยังไม่ paid แต่มี paid_at"
    };

    return map[reason] ?? reason;
}

function shortHash(hash: string, head = 12, tail = 8) {
    if (hash.length <= head + tail + 3) {
        return hash;
    }
    return `${hash.slice(0, head)}...${hash.slice(-tail)}`;
}

export default function InvoiceTable({ invoices }: InvoiceTableProps) {
    const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
    const [gamelogFilter, setGamelogFilter] = useState<"all" | "has" | "none">("all");
    const [anomalyFilter, setAnomalyFilter] = useState<"all" | "anomaly" | "normal">("all");
    const [selectedRoundKey, setSelectedRoundKey] = useState<string>("");
    const [sortKey, setSortKey] = useState<SortKey>("latestCreatedAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(new Set());

    const roundOptions = useMemo(() => {
        const roundKeys = new Set<string>();

        for (const invoice of invoices) {
            roundKeys.add(getRoundMonthKeyByThaiCutoff(new Date(invoice.created_at)));
        }

        return Array.from(roundKeys)
            .sort((a, b) => b.localeCompare(a))
            .map((key) => ({
                key,
                label: formatRoundLabel(key),
                rangeText: formatRoundRangeText(key)
            }));
    }, [invoices]);

    useEffect(() => {
        if (roundOptions.length > 0 && !selectedRoundKey) {
            setSelectedRoundKey(roundOptions[0].key);
        }
    }, [roundOptions, selectedRoundKey]);

    const groupedRows = useMemo(() => {
        if (!selectedRoundKey) {
            return [];
        }

        const filtered = invoices.filter((invoice) => {
            if (getRoundMonthKeyByThaiCutoff(new Date(invoice.created_at)) !== selectedRoundKey) {
                return false;
            }

            const isPaid = invoice.status === "paid";
            if (paidFilter === "paid" && !isPaid) {
                return false;
            }
            if (paidFilter === "unpaid" && isPaid) {
                return false;
            }

            const hasGameLog = invoice.round_count > 0;
            if (gamelogFilter === "has" && !hasGameLog) {
                return false;
            }
            if (gamelogFilter === "none" && hasGameLog) {
                return false;
            }

            if (anomalyFilter === "anomaly" && !invoice.has_anomaly) {
                return false;
            }
            if (anomalyFilter === "normal" && invoice.has_anomaly) {
                return false;
            }

            return true;
        });

        const groups: Record<string, InvoiceRow[]> = {};
        filtered.forEach((invoice) => {
            const key = invoice.player_id;
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(invoice);
        });

        const out: GroupedInvoice[] = Object.entries(groups).map(([playerId, items]) => {
            const sortedItems = [...items].sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            const playerName = sortedItems.find((item) => item.player_name?.trim())?.player_name ?? null;

            return {
                playerId,
                playerName,
                displayName: playerName?.trim() || playerId,
                items: sortedItems,
                invoiceCount: sortedItems.length,
                paidCount: sortedItems.filter((item) => item.status === "paid").length,
                hasGameLogCount: sortedItems.filter((item) => item.round_count > 0).length,
                totalRounds: sortedItems.reduce((sum, item) => sum + item.round_count, 0),
                anomalyInvoiceCount: sortedItems.filter((item) => item.has_anomaly).length,
                latestCreatedAtMs: Math.max(...sortedItems.map((item) => new Date(item.created_at).getTime())),
                isExpanded: expandedPlayers.has(playerId)
            };
        });

        out.sort((a, b) => {
            let result = 0;
            if (sortKey === "player") {
                result = a.displayName.localeCompare(b.displayName);
            } else if (sortKey === "invoiceCount") {
                result = a.invoiceCount - b.invoiceCount;
            } else if (sortKey === "totalRounds") {
                result = a.totalRounds - b.totalRounds;
            } else if (sortKey === "latestCreatedAt") {
                result = a.latestCreatedAtMs - b.latestCreatedAtMs;
            }

            return sortDirection === "asc" ? result : -result;
        });

        return out;
    }, [invoices, selectedRoundKey, paidFilter, gamelogFilter, anomalyFilter, sortKey, sortDirection, expandedPlayers]);

    const selectedRoundRangeText = useMemo(() => formatRoundRangeText(selectedRoundKey), [selectedRoundKey]);

    const toggleExpand = (playerId: string) => {
        const next = new Set(expandedPlayers);
        if (next.has(playerId)) {
            next.delete(playerId);
        } else {
            next.add(playerId);
        }
        setExpandedPlayers(next);
    };

    const displayCount = groupedRows.reduce((count, group) => count + (group.isExpanded ? group.items.length : 1), 0);

    return (
        <>
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-black/40 px-4 py-3 text-[11px] uppercase tracking-[0.12em]">
                <label htmlFor="invoice-month-round" className="font-bold text-orange-300">
                    MONTH ROUND
                </label>
                <select
                    id="invoice-month-round"
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
                    value={gamelogFilter}
                    onChange={(event) => setGamelogFilter(event.target.value as "all" | "has" | "none")}
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                >
                    <option value="all">GAMELOG: ALL</option>
                    <option value="has">GAMELOG: YES</option>
                    <option value="none">GAMELOG: NO</option>
                </select>
                <select
                    value={anomalyFilter}
                    onChange={(event) => setAnomalyFilter(event.target.value as "all" | "anomaly" | "normal")}
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                >
                    <option value="all">ANOMALY: ALL</option>
                    <option value="anomaly">ANOMALY: YES</option>
                    <option value="normal">ANOMALY: NO</option>
                </select>
                <span className="ml-2 text-zinc-500">sort:</span>
                <select
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SortKey)}
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                >
                    <option value="latestCreatedAt">LATEST INVOICE</option>
                    <option value="player">PLAYER</option>
                    <option value="invoiceCount">INVOICE COUNT</option>
                    <option value="totalRounds">TOTAL ROUNDS</option>
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
                            <th className="px-4 py-3">Invoices</th>
                            <th className="px-4 py-3">GameLog</th>
                            <th className="px-4 py-3">Total Rounds</th>
                            <th className="px-4 py-3">Paid</th>
                            <th className="px-4 py-3">Anomaly</th>
                            <th className="px-4 py-3">Latest Invoice</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedRows.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-6 text-center text-zinc-500">
                                    ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                                </td>
                            </tr>
                        ) : (
                            groupedRows.flatMap((group) => [
                                <tr
                                    key={`group-${group.playerId}`}
                                    className="border-t border-zinc-800 bg-black/50 hover:bg-zinc-800/70"
                                >
                                    <td className="px-3 py-3 text-center">
                                        <button
                                            onClick={() => toggleExpand(group.playerId)}
                                            className="text-orange-300 hover:text-orange-100"
                                        >
                                            {group.isExpanded ? "▼" : "▶"}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 font-medium text-zinc-100">{group.displayName}</td>
                                    <td className="px-4 py-3 text-zinc-300">{group.invoiceCount}</td>
                                    <td className="px-4 py-3 text-zinc-300">{group.hasGameLogCount} invoice(s)</td>
                                    <td className="px-4 py-3 text-orange-300">{group.totalRounds}</td>
                                    <td className="px-4 py-3 text-zinc-300">
                                        {group.paidCount}/{group.invoiceCount}
                                    </td>
                                    <td className="px-4 py-3 text-zinc-300">
                                        {group.anomalyInvoiceCount > 0 ? (
                                            <span className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] bg-amber-400 text-black">
                                                WARNING ({group.anomalyInvoiceCount})
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] bg-lime-400 text-black">
                                                NORMAL
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-cyan-300">
                                        {formatThaiDateTime(group.items[0].created_at)}
                                    </td>
                                </tr>,
                                ...(group.isExpanded
                                    ? group.items.map((invoice) => (
                                          <tr
                                              key={`invoice-${invoice.id}`}
                                              className="border-t border-zinc-800 bg-black/20 hover:bg-zinc-900/50"
                                          >
                                              <td className="px-3 py-2"></td>
                                              <td colSpan={7} className="px-4 py-3">
                                                  <div className="rounded border border-zinc-800 bg-zinc-950/70 p-3">
                                                      <div className="flex flex-wrap items-center gap-2">
                                                          <span className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                                                              invoice #{invoice.id}
                                                          </span>
                                                          <span
                                                              className="font-mono text-xs text-zinc-300"
                                                              title={invoice.payment_hash}
                                                          >
                                                              {shortHash(invoice.payment_hash)}
                                                          </span>
                                                          <span
                                                              className={`px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                                                  invoice.status === "paid"
                                                                      ? "bg-lime-400 text-black"
                                                                      : "bg-zinc-800 text-zinc-300"
                                                              }`}
                                                          >
                                                              {invoice.status === "paid" ? "PAID" : "UNPAID"}
                                                          </span>
                                                          <span
                                                              className={`px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                                                  invoice.has_anomaly
                                                                      ? "bg-amber-400 text-black"
                                                                      : "bg-lime-400 text-black"
                                                              }`}
                                                          >
                                                              {invoice.has_anomaly ? "WARNING" : "NORMAL"}
                                                          </span>
                                                      </div>

                                                      <div className="mt-2 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2 lg:grid-cols-4">
                                                          <p>
                                                              GameLog:{" "}
                                                              {invoice.round_count > 0
                                                                  ? `YES (${invoice.round_count})`
                                                                  : "NO"}
                                                          </p>
                                                          <p>Submitted: {invoice.submitted_count}</p>
                                                          <p>Score rows: {invoice.score_count}</p>
                                                          <p>Amount: {invoice.amount_sats.toLocaleString()} sats</p>
                                                          <p>
                                                              Created:{" "}
                                                              <span className="font-semibold text-cyan-300">
                                                                  {formatThaiDateTime(invoice.created_at)}
                                                              </span>
                                                          </p>
                                                          <p>
                                                              Paid at:{" "}
                                                              <span className="font-semibold text-cyan-300">
                                                                  {invoice.paid_at
                                                                      ? formatThaiDateTime(invoice.paid_at)
                                                                      : "-"}
                                                              </span>
                                                          </p>
                                                          <p className="sm:col-span-2 lg:col-span-2">
                                                              Memo: {invoice.memo?.trim() ? invoice.memo : "-"}
                                                          </p>
                                                      </div>

                                                      {invoice.has_anomaly ? (
                                                          <div className="mt-2 border-t border-zinc-800 pt-2">
                                                              <div className="flex flex-wrap gap-1">
                                                                  {invoice.anomaly_reasons.map((reason) => (
                                                                      <span
                                                                          key={`${invoice.id}-${reason}`}
                                                                          className="px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] bg-amber-500/20 text-amber-200 border border-amber-500/40"
                                                                      >
                                                                          {formatAnomalyReason(reason)}
                                                                      </span>
                                                                  ))}
                                                              </div>
                                                          </div>
                                                      ) : null}
                                                  </div>
                                              </td>
                                          </tr>
                                      ))
                                    : [])
                            ])
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
