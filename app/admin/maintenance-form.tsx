

"use client";

import { FormEvent, useState } from "react";

type MaintenanceFormProps = {
    initialConfig: {
        maintenanceMode: boolean;
        maintenanceWindow: string;
        maintenanceStatus: string;
        maintenanceNote: string;
    };
};

type MaintenanceResponse = {
    success?: boolean;
    error?: string;
    maintenanceMode?: boolean;
    maintenanceWindow?: string;
    maintenanceStatus?: string;
    maintenanceNote?: string;
};

export default function MaintenanceForm({ initialConfig }: MaintenanceFormProps) {
    const [maintenanceMode, setMaintenanceMode] = useState(initialConfig.maintenanceMode);
    const [maintenanceWindow, setMaintenanceWindow] = useState(initialConfig.maintenanceWindow);
    const [maintenanceStatus, setMaintenanceStatus] = useState(initialConfig.maintenanceStatus);
    const [maintenanceNote, setMaintenanceNote] = useState(initialConfig.maintenanceNote);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const response = await fetch("/api/admin/maintenance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    maintenanceMode,
                    maintenanceWindow,
                    maintenanceStatus,
                    maintenanceNote
                })
            });

            const data = (await response.json()) as MaintenanceResponse;

            if (!response.ok) {
                setError(data.error || "Failed to update maintenance config");
                return;
            }

            setMaintenanceMode(Boolean(data.maintenanceMode));
            setMaintenanceWindow(data.maintenanceWindow || "02:00 - 04:00 UTC");
            setMaintenanceStatus(data.maintenanceStatus || "UPGRADING NODES");
            setMaintenanceNote(data.maintenanceNote || "");
            setMessage("Maintenance config updated");
        } catch {
            setError("Unexpected error while updating maintenance config");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="overflow-hidden border border-zinc-800 bg-zinc-900/80">
            <div className="flex items-center justify-between border-b-4 border-zinc-800 bg-zinc-950 px-4 py-3">
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-orange-300">
                    MAINTENANCE_CONFIG.DAT
                </span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                    channel: /api/admin/maintenance
                </span>
            </div>

            <form onSubmit={onSubmit} className="grid gap-4 p-4 sm:grid-cols-2">
                <label className="col-span-2 inline-flex items-center gap-2 text-sm text-zinc-300">
                    <input
                        type="checkbox"
                        checked={maintenanceMode}
                        onChange={(event) => setMaintenanceMode(event.target.checked)}
                        className="h-4 w-4 accent-orange-400"
                    />
                    Enable maintenance mode
                </label>

                <label className="col-span-2 text-xs uppercase tracking-[0.12em] text-zinc-400 sm:col-span-1">
                    Maintenance window
                    <input
                        value={maintenanceWindow}
                        onChange={(event) => setMaintenanceWindow(event.target.value)}
                        className="mt-2 w-full border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-orange-400"
                        placeholder="02:00 - 04:00 UTC"
                    />
                </label>

                <label className="col-span-2 text-xs uppercase tracking-[0.12em] text-zinc-400 sm:col-span-1">
                    Maintenance status
                    <input
                        value={maintenanceStatus}
                        onChange={(event) => setMaintenanceStatus(event.target.value)}
                        className="mt-2 w-full border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-orange-400"
                        placeholder="UPGRADING NODES"
                    />
                </label>

                <label className="col-span-2 text-xs uppercase tracking-[0.12em] text-zinc-400">
                    Maintenance note
                    <textarea
                        value={maintenanceNote}
                        onChange={(event) => setMaintenanceNote(event.target.value)}
                        rows={4}
                        className="mt-2 w-full border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100 outline-none focus:border-orange-400"
                        placeholder="Maintenance details"
                    />
                </label>

                <div className="col-span-2 flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="border border-orange-500 bg-orange-500/20 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-orange-300 hover:bg-orange-500/35 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? "SAVING..." : "SAVE MAINTENANCE"}
                    </button>
                    {message ? <span className="text-xs text-lime-300">{message}</span> : null}
                    {error ? <span className="text-xs text-red-400">{error}</span> : null}
                </div>
            </form>
        </section>
    );
}
