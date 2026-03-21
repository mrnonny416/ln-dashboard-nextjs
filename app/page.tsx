import Link from "next/link";
import { Space_Grotesk, Manrope } from "next/font/google";
import { auth, signOut } from "@/auth";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["500", "700"]
});

const manrope = Manrope({
    subsets: ["latin"],
    weight: ["400", "500", "700"]
});

export default async function Home() {
    const session = await auth();

    return (
        <main
            className={`${manrope.className} relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0b0b] px-6 py-14 text-zinc-100`}
        >
            <div className="crt-overlay pointer-events-none absolute inset-0 z-20" />
            <div className="dither-pattern pointer-events-none absolute inset-0 z-0 opacity-20" />
            <div className="scanline pointer-events-none absolute inset-x-0 top-0 z-10" />
            <div
                className="pointer-events-none absolute inset-0 z-0 opacity-30"
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 20% 20%, rgba(254,152,33,0.18), transparent 50%), radial-gradient(circle at 80% 30%, rgba(96,255,115,0.12), transparent 45%), linear-gradient(110deg, rgba(255,255,255,0.03) 0%, transparent 38%)"
                }}
            />

            <div className="relative z-30 w-full max-w-5xl">
                <header className="mb-12 text-center">
                    <div className="mb-3 inline-flex items-center gap-3 border border-zinc-700/70 bg-zinc-900/70 px-3 py-1.5 text-[11px] font-bold tracking-[0.2em] text-orange-300">
                        <span className="h-2 w-2 rounded-full bg-lime-400" /> LIVE_CONNECTION
                    </div>
                    <h1
                        className={`${spaceGrotesk.className} text-4xl font-bold tracking-tight text-orange-400 sm:text-6xl lg:text-7xl`}
                    >
                        WELCOME COMMANDER
                    </h1>
                    <p
                        className={`${spaceGrotesk.className} mt-4 inline-block border-y border-zinc-700/80 px-4 py-2 text-[11px] tracking-[0.2em] text-fuchsia-300 sm:text-sm`}
                    >
                        SECURE PROTOCOL ESTABLISHED // AUTHORIZATION PORTAL
                    </p>
                </header>

                {!session?.user ? (
                    <section className="grid gap-5 md:grid-cols-2">
                        <Link
                            href="/login"
                            className="group flex flex-col border-r-4 border-b-4 border-zinc-700 bg-zinc-900/85 p-6 transition hover:bg-zinc-800/90"
                        >
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">ID: 0x82A</p>
                            <h2 className={`${spaceGrotesk.className} mt-3 text-2xl font-bold text-orange-300`}>
                                INITIATE LOGIN
                            </h2>
                            <p className="mt-3 text-sm text-zinc-300">
                                Access existing node data and validate encrypted account credentials.
                            </p>
                            <p className="mt-6 text-xs font-bold tracking-[0.14em] text-orange-300 transition group-hover:translate-x-1">
                                EXECUTE ENTRY -&gt;
                            </p>
                        </Link>

                        <Link
                            href="/register"
                            className="group flex flex-col border-r-4 border-b-4 border-zinc-700 bg-zinc-950/85 p-6 transition hover:bg-zinc-900/95"
                        >
                            <p className="text-[10px] font-semibold tracking-[0.2em] text-zinc-400">PRT: NEW</p>
                            <h2 className={`${spaceGrotesk.className} mt-3 text-2xl font-bold text-lime-300`}>
                                REGISTER OPERATOR
                            </h2>
                            <p className="mt-3 text-sm text-zinc-300">
                                Initialize a new profile and generate a secure access identity.
                            </p>
                            <p className="mt-6 text-xs font-bold tracking-[0.14em] text-lime-300 transition group-hover:translate-x-1">
                                GENERATE CREDENTIALS -&gt;
                            </p>
                        </Link>
                    </section>
                ) : (
                    <section className="border border-zinc-700/80 bg-zinc-950/90 p-6">
                        <p className="text-sm text-zinc-300">Signed in as {session.user.email}</p>
                        <p className="mt-1 text-xs tracking-[0.12em] text-orange-300">ROLE: {session.user.role}</p>

                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link
                                href="/dashboard"
                                className="border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-orange-400"
                            >
                                Open Dashboard
                            </Link>
                            {session.user.role === "ADMIN" ? (
                                <Link
                                    href="/admin"
                                    className="border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-fuchsia-400"
                                >
                                    Open Admin
                                </Link>
                            ) : null}
                            <form
                                action={async () => {
                                    "use server";
                                    await signOut({ redirectTo: "/" });
                                }}
                            >
                                <button
                                    type="submit"
                                    className="border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-red-400"
                                >
                                    Logout
                                </button>
                            </form>
                        </div>
                    </section>
                )}

                <section className="mt-10 overflow-hidden border border-zinc-700/70 bg-black/60 px-4 py-3 text-[11px]">
                    <div className="marquee-track flex min-w-max items-center gap-4 whitespace-nowrap">
                        <span className="font-bold tracking-[0.15em] text-orange-300">NETWORK STATUS:</span>
                        <span className="text-lime-300">SYNCING BLOCK 829,341</span>
                        <span className="text-zinc-600">{"//"}</span>
                        <span className="text-zinc-300">HASH RATE 540.2 EH/S</span>
                        <span className="text-zinc-600">{"//"}</span>
                        <span className="text-zinc-300">NODES ONLINE 15,294</span>
                        <span className="text-zinc-600">{"//"}</span>
                        <span className="text-red-400">VOLATILITY DETECTED</span>
                        <span className="font-bold tracking-[0.15em] text-orange-300">NETWORK STATUS:</span>
                        <span className="text-lime-300">SYNCING BLOCK 829,341</span>
                        <span className="text-zinc-600">{"//"}</span>
                        <span className="text-zinc-300">HASH RATE 540.2 EH/S</span>
                        <span className="text-zinc-600">{"//"}</span>
                        <span className="text-zinc-300">NODES ONLINE 15,294</span>
                        <span className="text-zinc-600">{"//"}</span>
                        <span className="text-red-400">VOLATILITY DETECTED</span>
                    </div>
                </section>
            </div>
        </main>
    );
}
