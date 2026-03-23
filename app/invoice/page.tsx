import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Space_Grotesk, Manrope } from "next/font/google";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import InvoiceTable from "./invoice-table";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["500", "700"]
});

const manrope = Manrope({
    subsets: ["latin"],
    weight: ["400", "500", "700"]
});

async function clearStaleUnusedInvoices() {
    "use server";

    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

    await prisma.invoice.deleteMany({
        where: {
            created_at: { lt: cutoff },
            status: { notIn: ["paid", "PAID"] },
            CollectLog: { none: {} },
            Score: { none: {} }
        }
    });

    revalidatePath("/invoice");
}

export default async function InvoicePage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const invoices = await prisma.invoice.findMany({
        orderBy: { created_at: "desc" },
        select: {
            id: true,
            player_id: true,
            payment_hash: true,
            amount_sats: true,
            memo: true,
            status: true,
            created_at: true,
            paid_at: true,
            _count: {
                select: {
                    CollectLog: true,
                    Score: true
                }
            }
        }
    });

    const paymentHashes = invoices.map((invoice) => invoice.payment_hash);
    const submittedLogCounts =
        paymentHashes.length > 0
            ? await prisma.collectLog.groupBy({
                  by: ["payment_hash"],
                  where: {
                      payment_hash: { in: paymentHashes },
                      submitted: true
                  },
                  _count: {
                      _all: true
                  }
              })
            : [];

    const submittedCountByPaymentHash = new Map(
        submittedLogCounts.map((entry) => [entry.payment_hash, entry._count._all])
    );

    const uniquePairs = Array.from(
        new Set(invoices.map((invoice) => `${invoice.player_id}:${invoice.payment_hash}`))
    ).map((key) => {
        const [player_id, payment_hash] = key.split(":");
        return { player_id, payment_hash };
    });

    const players =
        uniquePairs.length > 0
            ? await prisma.player.findMany({
                  where: {
                      OR: uniquePairs
                  },
                  select: {
                      player_id: true,
                      payment_hash: true,
                      name: true
                  }
              })
            : [];

    const playerNameByPair = new Map(
        players.map((player) => [`${player.player_id}:${player.payment_hash}`, player.name])
    );

    const invoiceRows = invoices.map((invoice) => {
        const playerName = playerNameByPair.get(`${invoice.player_id}:${invoice.payment_hash}`) ?? null;
        const roundCount = invoice._count.CollectLog;
        const scoreCount = invoice._count.Score;
        const submittedCount = submittedCountByPaymentHash.get(invoice.payment_hash) ?? 0;
        const isPaid = invoice.status === "paid";
        const anomalyReasons: string[] = [];

        if (!isPaid && roundCount > 0) {
            anomalyReasons.push("unpaid_with_gamelog");
        }
        if (!isPaid && submittedCount > 0) {
            anomalyReasons.push("unpaid_with_submitted_round");
        }
        if (!isPaid && scoreCount > 0) {
            anomalyReasons.push("unpaid_with_score");
        }
        if (isPaid && !invoice.paid_at) {
            anomalyReasons.push("paid_without_paid_at");
        }
        if (!isPaid && invoice.paid_at) {
            anomalyReasons.push("unpaid_with_paid_at");
        }

        return {
            id: invoice.id,
            player_id: invoice.player_id,
            player_name: playerName,
            payment_hash: invoice.payment_hash,
            amount_sats: invoice.amount_sats,
            memo: invoice.memo,
            status: invoice.status,
            created_at: invoice.created_at.toISOString(),
            paid_at: invoice.paid_at ? invoice.paid_at.toISOString() : null,
            round_count: roundCount,
            submitted_count: submittedCount,
            score_count: scoreCount,
            has_anomaly: anomalyReasons.length > 0,
            anomaly_reasons: anomalyReasons
        };
    });

    const paidCount = invoices.filter((invoice) => invoice.status === "paid").length;
    const hasGameLogCount = invoices.filter((invoice) => invoice._count.CollectLog > 0).length;
    const totalRounds = invoices.reduce((sum, invoice) => sum + invoice._count.CollectLog, 0);
    const anomalyCount = invoiceRows.filter((invoice) => invoice.has_anomaly).length;
    const cutoffMs = Date.now() - 30 * 60 * 1000;
    const clearableCount = invoices.filter((invoice) => {
        const isPaid = invoice.status.trim().toLowerCase() === "paid";
        const isOlderThan30Minutes = invoice.created_at.getTime() < cutoffMs;
        const hasUsage = invoice._count.CollectLog > 0 || invoice._count.Score > 0;
        return !isPaid && isOlderThan30Minutes && !hasUsage;
    }).length;

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
                            BITSTREAM_CMD INVOICE
                        </h1>
                    </div>
                </div>
            </header>

            <section className="relative z-40 mx-auto mt-6 w-full max-w-7xl space-y-6 px-4">
                <div className="border-l-4 border-orange-400 bg-zinc-900/90 p-6 shadow-[6px_6px_0_0_#2f2f2f]">
                    <h2
                        className={`${spaceGrotesk.className} text-3xl font-black uppercase tracking-tight text-zinc-100 sm:text-5xl`}
                    >
                        INVOICE STATUS TABLE
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">
                        ตรวจสอบสถานะ Invoice ราย Player พร้อม GameLog และจำนวนรอบ
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="border border-zinc-800 bg-zinc-900/80 p-4">
                        <p
                            className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                        >
                            TOTAL INVOICES
                        </p>
                        <p className="mt-2 text-2xl font-bold text-orange-300">{invoices.length.toLocaleString()}</p>
                    </div>
                    <div className="border border-zinc-800 bg-zinc-900/80 p-4">
                        <p
                            className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                        >
                            PAID INVOICES
                        </p>
                        <p className="mt-2 text-2xl font-bold text-lime-300">{paidCount.toLocaleString()}</p>
                    </div>
                    <div className="border border-zinc-800 bg-zinc-900/80 p-4">
                        <p
                            className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                        >
                            ANOMALY INVOICES
                        </p>
                        <p className="mt-2 text-2xl font-bold text-amber-300">{anomalyCount.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                            with gamelog: {hasGameLogCount.toLocaleString()} | total rounds:{" "}
                            {totalRounds.toLocaleString()}
                        </p>
                    </div>
                </div>

                <section className="border border-zinc-800 bg-zinc-900/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p
                                className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                            >
                                CLEAR STALE UNUSED INVOICES
                            </p>
                            <p className="mt-1 text-sm text-zinc-300">
                                ลบเฉพาะ invoice ที่ยังไม่จ่าย, ไม่มี game log/score, และเก่ากว่า 30 นาที
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                                eligible now: {clearableCount.toLocaleString()} invoice(s)
                            </p>
                        </div>

                        <form action={clearStaleUnusedInvoices}>
                            <button
                                type="submit"
                                disabled={clearableCount === 0}
                                className={`border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                                    clearableCount > 0
                                        ? "border-red-500 bg-red-500/20 text-red-200 hover:bg-red-500/35"
                                        : "cursor-not-allowed border-zinc-700 bg-zinc-900 text-zinc-500"
                                }`}
                            >
                                Clear Invoice ({clearableCount})
                            </button>
                        </form>
                    </div>
                </section>

                <section className="overflow-hidden border border-zinc-800 bg-zinc-900/80">
                    <div className="flex items-center justify-between border-b-4 border-zinc-800 bg-zinc-950 px-4 py-3">
                        <span
                            className={`${spaceGrotesk.className} text-xs font-bold uppercase tracking-[0.15em] text-orange-300`}
                        >
                            INVOICE_STATUS.DAT
                        </span>
                        <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                            records_found: {invoices.length.toString().padStart(3, "0")}
                        </span>
                    </div>

                    <InvoiceTable invoices={invoiceRows} />
                </section>
            </section>
        </main>
    );
}
