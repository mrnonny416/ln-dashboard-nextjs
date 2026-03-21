import { redirect } from "next/navigation";
import { Space_Grotesk, Manrope } from "next/font/google";
import { auth } from "@/auth";
import ScoreByDatePanel from "./score-by-date-panel";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["500", "700"]
});

const manrope = Manrope({
    subsets: ["latin"],
    weight: ["400", "500", "700"]
});

type ScoreApiItem = {
    id: number;
    player_id: number;
    playerName: string | null;
    time_ms: number;
    createdAt: string;
    source: "score" | "score_jan_feb_2026";
};

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    const appBaseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const response = await fetch(`${appBaseUrl}/api/score`, { cache: "no-store" });
    const scores = (response.ok ? await response.json() : []) as ScoreApiItem[];

    return (
        <main className={`${manrope.className} relative min-h-screen overflow-hidden bg-[#0b0b0b] pb-24 text-zinc-100`}>
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
            <div className="scanline pointer-events-none absolute inset-x-0 top-0 z-30" />

            <header className="relative z-40 border-b-4 border-zinc-700 bg-[#0e0e0e] shadow-[4px_4px_0px_0px_rgba(72,72,71,1)]">
                <div className="mx-auto flex h-16 w-full max-w-6xl items-center px-4">
                    <div className="flex items-center gap-3">
                        <span className="text-xl text-orange-400">▣</span>
                        <h1
                            className={`${spaceGrotesk.className} text-lg font-black uppercase tracking-[0.14em] text-orange-400`}
                        >
                            BITSNAKE COMMAND DASHBOARD
                        </h1>
                    </div>
                    <div className="ml-auto flex items-center gap-2 border border-zinc-800 bg-black px-2 py-1 text-[10px] tracking-[0.12em] text-lime-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> SESSION ACTIVE
                    </div>
                </div>
            </header>

            <section className="relative z-40 mx-auto mt-6 w-full max-w-6xl space-y-6 px-4">
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="border border-zinc-800 bg-zinc-900/90 p-4">
                            <p
                                className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                            >
                                ACCESS LEVEL
                            </p>
                            <p className="mt-2 text-2xl font-bold text-orange-300">{session.user.role}</p>
                        </div>
                        <div className="border border-zinc-800 bg-zinc-900/90 p-4">
                            <p
                                className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                            >
                                NODE STATUS
                            </p>
                            <p className="mt-2 text-2xl font-bold text-lime-300">ONLINE</p>
                        </div>
                        <div className="border border-zinc-800 bg-zinc-900/90 p-4">
                            <p
                                className={`${spaceGrotesk.className} text-[10px] uppercase tracking-[0.14em] text-zinc-500`}
                            >
                                SECURITY CHANNEL
                            </p>
                            <p className="mt-2 text-2xl font-bold text-fuchsia-300">SECURE</p>
                        </div>
                    </div>

                    <ScoreByDatePanel scores={scores} headingClassName={spaceGrotesk.className} />

                    <div className="overflow-hidden border-y border-zinc-800 bg-zinc-950/80 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                        <div className="marquee-track flex min-w-max gap-8 whitespace-nowrap">
                            <span className="font-bold text-orange-300">DASHBOARD_SYNC</span>
                            <span>AUTH NODE VERIFIED</span>
                            <span>SESSION TOKEN VALID</span>
                            <span>PERMISSION MATRIX LOADED</span>
                            <span>CHANNEL ENCRYPTED</span>
                            <span className="font-bold text-orange-300">DASHBOARD_SYNC</span>
                            <span>AUTH NODE VERIFIED</span>
                            <span>SESSION TOKEN VALID</span>
                            <span>PERMISSION MATRIX LOADED</span>
                            <span>CHANNEL ENCRYPTED</span>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
