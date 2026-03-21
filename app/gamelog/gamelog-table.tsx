"use client";

import { useMemo, useState } from "react";

type GameLogItem = {
    id: number;
    userId: string;
    paymentHash: string | null;
    playCount: number;
    paid: boolean;
    scoreSubmitted: boolean;
    lastScore: number | null;
    createdAt: string;
    updatedAt: string;
};

type SortKey = "id" | "lastScore" | "createdAt" | "updatedAt";
type SortDirection = "asc" | "desc";

type GameLogTableProps = {
    logs: GameLogItem[];
};

function formatDurationFromMs(totalMs: number | null) {
    if (totalMs === null) {
        return "-";
    }

    const minutes = Math.floor(totalMs / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
}

export default function GameLogTable({ logs }: GameLogTableProps) {
    const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
    const [submittedFilter, setSubmittedFilter] = useState<"all" | "submitted" | "not_submitted">("all");
    const [sortKey, setSortKey] = useState<SortKey>("createdAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    const rows = useMemo(() => {
        const filtered = logs.filter((log) => {
            if (paidFilter === "paid" && !log.paid) {
                return false;
            }
            if (paidFilter === "unpaid" && log.paid) {
                return false;
            }
            if (submittedFilter === "submitted" && !log.scoreSubmitted) {
                return false;
            }
            if (submittedFilter === "not_submitted" && log.scoreSubmitted) {
                return false;
            }
            return true;
        });

        filtered.sort((a, b) => {
            let result = 0;
            if (sortKey === "id") {
                result = a.id - b.id;
            } else if (sortKey === "lastScore") {
                const aScore = a.lastScore ?? Number.MAX_SAFE_INTEGER;
                const bScore = b.lastScore ?? Number.MAX_SAFE_INTEGER;
                result = aScore - bScore;
            } else if (sortKey === "createdAt") {
                result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            } else if (sortKey === "updatedAt") {
                result = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            }

            return sortDirection === "asc" ? result : -result;
        });

        return filtered;
    }, [logs, paidFilter, submittedFilter, sortKey, sortDirection]);

    return (
        <>
            <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 bg-black/40 px-4 py-3 text-[11px] uppercase tracking-[0.12em]">
                <span className="text-zinc-500">filter:</span>
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
                    <option value="id">ID</option>
                    <option value="lastScore">LAST SCORE</option>
                    <option value="createdAt">CREATED</option>
                    <option value="updatedAt">UPDATED</option>
                </select>
                <select
                    value={sortDirection}
                    onChange={(event) => setSortDirection(event.target.value as SortDirection)}
                    className="border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-200"
                >
                    <option value="desc">DESC</option>
                    <option value="asc">ASC</option>
                </select>
                <span className="ml-auto text-zinc-500">showing: {rows.length}</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] border-collapse text-sm">
                    <thead className="bg-zinc-900 text-left text-zinc-500">
                        <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-[0.14em]">
                            <th className="px-4 py-3">ID</th>
                            <th className="px-4 py-3">User ID</th>
                            <th className="px-4 py-3">Payment Hash</th>
                            <th className="px-4 py-3">Play Count</th>
                            <th className="px-4 py-3">Paid</th>
                            <th className="px-4 py-3">Score Submitted</th>
                            <th className="px-4 py-3">Last Score (Time)</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3">Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((log) => (
                            <tr key={log.id} className="border-t border-zinc-800 bg-black/30 hover:bg-zinc-900/70">
                                <td className="px-4 py-3 text-zinc-300">{log.id}</td>
                                <td className="px-4 py-3 font-medium text-zinc-100">{log.userId}</td>
                                <td className="px-4 py-3 text-zinc-400">{log.paymentHash ?? "-"}</td>
                                <td className="px-4 py-3 text-orange-300">{log.playCount}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                            log.paid ? "bg-lime-400 text-black" : "bg-zinc-800 text-zinc-300"
                                        }`}
                                    >
                                        {log.paid ? "YES" : "NO"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                            log.scoreSubmitted
                                                ? "bg-fuchsia-400 text-black"
                                                : "bg-zinc-800 text-zinc-300"
                                        }`}
                                    >
                                        {log.scoreSubmitted ? "YES" : "NO"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-lime-300">{formatDurationFromMs(log.lastScore)}</td>
                                <td className="px-4 py-3 text-xs text-zinc-400">
                                    {new Date(log.createdAt).toLocaleString("th-TH")}
                                </td>
                                <td className="px-4 py-3 text-xs text-zinc-400">
                                    {new Date(log.updatedAt).toLocaleString("th-TH")}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
