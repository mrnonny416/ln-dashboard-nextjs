import { redirect } from "next/navigation";
import { Space_Grotesk, Manrope } from "next/font/google";
import { auth } from "@/auth";
import { buildPairCheatMap } from "@/src/lib/anti-cheat";
import { prisma } from "@/src/lib/prisma";
import GameLogTable from "./gamelog-table";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["500", "700"]
});

const manrope = Manrope({
    subsets: ["latin"],
    weight: ["400", "500", "700"]
});

export default async function GameLogPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const logs = await prisma.collectLog.findMany({
        orderBy: { start_play: "desc" },
        include: {
            Invoice: {
                select: {
                    status: true
                }
            }
        }
    });

    const uniquePlayerPairs = Array.from(new Set(logs.map((log) => `${log.player_id}:${log.payment_hash}`))).map(
        (key) => {
            const [player_id, payment_hash] = key.split(":");
            return { player_id, payment_hash };
        }
    );

    const players = await prisma.player.findMany({
        where: {
            OR: uniquePlayerPairs
        },
        select: {
            player_id: true,
            payment_hash: true,
            name: true
        }
    });

    const playerNameByPair = new Map(
        players.map((player) => [`${player.player_id}:${player.payment_hash}`, player.name])
    );

    const cheatByPair = buildPairCheatMap(
        logs.map((log) => ({
            player_id: log.player_id,
            payment_hash: log.payment_hash,
            round: log.round,
            time_ms: log.time_ms,
            start_play: log.start_play,
            end_play: log.end_play,
            submitted: log.submitted,
            collect_time: log.collect_time,
            collect_move: log.collect_move,
            collect_fruit: log.collect_fruit
        }))
    );

    const serializableLogs = logs.map((log) => {
        const key = `${log.player_id}:${log.payment_hash}`;
        const cheatResult = cheatByPair.get(key) ?? { isCheater: false, reasons: [] };

        return {
            id: log.id,
            player_id: log.player_id,
            player_name: playerNameByPair.get(`${log.player_id}:${log.payment_hash}`) ?? null,
            payment_hash: log.payment_hash,
            round: log.round,
            time_ms: log.time_ms,
            submitted: log.submitted,
            start_play: log.start_play.toISOString(),
            end_play: log.end_play ? log.end_play.toISOString() : null,
            submitted_at: log.submitted_at ? log.submitted_at.toISOString() : null,
            invoice_status: log.Invoice.status,
            isCheater: cheatResult.isCheater,
            cheatReasons: cheatResult.reasons
        };
    });

    const paidCount = logs.filter((log) => log.Invoice.status === "paid").length;
    const submittedCount = logs.filter((log) => log.submitted).length;

    return (
        <main className={`${manrope.className} relative min-h-screen overflow-hidden bg-[#0b0b0b] pb-20 text-zinc-100`}>
            <div className="crt-overlay pointer-events-none absolute inset-0 z-20" />
            <div className="dither-pattern pointer-events-none absolute inset-0 z-0 opacity-20" />
            <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(26,26,26,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(26,26,26,0.45) 1px, transparent 1px)",
                    backgroundSize: "32px 32px"
                }}
            />

            <header className="relative z-40 border-b-4 border-zinc-800 bg-[#0e0e0e]">
                <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xl text-orange-400">▣</span>
                        <h1
                            className={`${spaceGrotesk.className} text-lg font-black uppercase tracking-[0.14em] text-orange-400`}
                        >
                            BITSTREAM_CMD GAMELOG
                        </h1>
                    </div>
                </div>
            </header>

            <section className="relative z-40 mx-auto mt-6 w-full max-w-7xl space-y-6 px-4">
                <div className="border-l-4 border-orange-400 bg-zinc-900/90 p-6 shadow-[6px_6px_0_0_#2f2f2f]">
                    <h2
                        className={`${spaceGrotesk.className} text-3xl font-black uppercase tracking-tight text-zinc-100 sm:text-5xl`}
                    >
                        GAME LOG TABLE
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">ตารางการเล่นทั้งหมดจาก CollectLog</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="border border-zinc-800 bg-zinc-900/80 p-4">
                        <p
                            className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                        >
                            TOTAL LOGS
                        </p>
                        <p className="mt-2 text-2xl font-bold text-orange-300">{logs.length.toLocaleString()}</p>
                    </div>
                    <div className="border border-zinc-800 bg-zinc-900/80 p-4">
                        <p
                            className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                        >
                            PAID
                        </p>
                        <p className="mt-2 text-2xl font-bold text-lime-300">{paidCount.toLocaleString()}</p>
                    </div>
                    <div className="border border-zinc-800 bg-zinc-900/80 p-4">
                        <p
                            className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                        >
                            SCORE SUBMITTED
                        </p>
                        <p className="mt-2 text-2xl font-bold text-fuchsia-300">{submittedCount.toLocaleString()}</p>
                    </div>
                </div>

                <section className="overflow-hidden border border-zinc-800 bg-zinc-900/80">
                    <div className="flex items-center justify-between border-b-4 border-zinc-800 bg-zinc-950 px-4 py-3">
                        <span
                            className={`${spaceGrotesk.className} text-xs font-bold uppercase tracking-[0.15em] text-orange-300`}
                        >
                            COLLECT_LOG.DAT
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                            records_found: {logs.length.toString().padStart(3, "0")}
                        </span>
                    </div>

                    <GameLogTable logs={serializableLogs} />
                </section>
            </section>

            <div className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden border-t border-zinc-800 bg-zinc-950/95 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                <div className="marquee-track flex min-w-max gap-8 whitespace-nowrap">
                    <span className="font-bold text-orange-300">GAMELOG_STREAM</span>
                    <span>SYNCED</span>
                    <span>AUDIT READY</span>
                    <span>NODE ONLINE</span>
                    <span className="font-bold text-orange-300">GAMELOG_STREAM</span>
                    <span>SYNCED</span>
                    <span>AUDIT READY</span>
                    <span>NODE ONLINE</span>
                </div>
            </div>
        </main>
    );
}
