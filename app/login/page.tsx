"use client";

import Link from "next/link";
import { Space_Grotesk, Manrope } from "next/font/google";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["500", "700"]
});

const manrope = Manrope({
    subsets: ["latin"],
    weight: ["400", "500", "700"]
});

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        const form = new FormData(event.currentTarget);
        const email = String(form.get("email") ?? "").trim();
        const password = String(form.get("password") ?? "");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
            redirectTo: "/dashboard"
        });

        setIsLoading(false);

        if (result?.error) {
            setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
            return;
        }

        window.location.href = result?.url ?? "/dashboard";
    }

    return (
        <main
            className={`${manrope.className} relative min-h-screen overflow-hidden bg-[#0b0b0b] px-6 py-6 text-zinc-100`}
        >
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
            <div className="pointer-events-none absolute -left-8 top-1/4 h-64 w-64 rounded-full bg-orange-500/10 blur-[120px]" />
            <div className="pointer-events-none absolute -right-8 bottom-1/4 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[120px]" />

            <header className="relative z-30 mx-auto flex w-full max-w-5xl items-center justify-between border border-zinc-800 bg-zinc-950/90 px-4 py-3">
                <div className="flex items-center gap-2">
                    <span className="text-orange-400">&gt;_</span>
                    <span className={`${spaceGrotesk.className} text-sm font-bold tracking-[0.15em] text-orange-300`}>
                        BITSTREAM_CMD
                    </span>
                </div>
                <div className="flex items-center gap-2 border border-zinc-800 bg-black px-2 py-1 text-[10px] tracking-[0.12em] text-lime-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> NODE ONLINE
                </div>
            </header>

            <section className="relative z-30 mx-auto mt-12 w-full max-w-5xl">
                <div className="mb-8 text-center">
                    <h1
                        className={`${spaceGrotesk.className} text-5xl font-bold uppercase tracking-tight text-orange-400 sm:text-6xl`}
                    >
                        BIT_SNAKE COMMAND
                    </h1>
                    <p className="mt-2 text-[11px] tracking-[0.28em] text-zinc-500">
                        V2.0.48-STABLE // PROTOCOL_ACTIVE
                    </p>
                </div>

                <div className="border-l-4 border-orange-400 bg-zinc-900/90 p-6 shadow-[6px_6px_0_0_#2f2f2f] sm:p-8">
                    <form onSubmit={onSubmit} className="space-y-5">
                        <label className="block space-y-2">
                            <span
                                className={`${spaceGrotesk.className} text-xs font-bold tracking-[0.14em] text-orange-300`}
                            >
                                OPERATOR_ID
                            </span>
                            <input
                                required
                                type="email"
                                name="email"
                                className="w-full border-b-2 border-zinc-700 bg-black/70 px-4 py-3 text-zinc-100 outline-none transition focus:border-orange-400"
                                placeholder="ENTER_IDENTIFIER..."
                            />
                        </label>

                        <div className="space-y-2">
                            <span
                                className={`${spaceGrotesk.className} text-xs font-bold tracking-[0.14em] text-orange-300`}
                            >
                                SECURE_CODE
                            </span>
                            <div className="flex items-center border-b-2 border-zinc-700 bg-black/70 px-4 py-3 transition-colors focus-within:border-orange-400">
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    minLength={8}
                                    className="w-full bg-transparent tracking-[0.25em] text-zinc-100 outline-none placeholder:text-zinc-600"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className={`${spaceGrotesk.className} ml-2 shrink-0 text-[10px] font-bold tracking-widest text-zinc-500 transition-colors hover:text-orange-400`}
                                >
                                    {showPassword ? "[HIDE]" : "[SHOW]"}
                                </button>
                            </div>
                        </div>

                        {error ? <p className="text-sm text-red-400">{error}</p> : null}

                        <button
                            disabled={isLoading}
                            type="submit"
                            className={`${spaceGrotesk.className} flex w-full items-center justify-between bg-orange-500 px-5 py-4 text-base font-bold uppercase tracking-[0.08em] text-black transition hover:bg-orange-400 disabled:opacity-60`}
                        >
                            <span>{isLoading ? "กำลังเข้าสู่ระบบ..." : "INITIATE_SESSION"}</span>
                            <span>{">"}</span>
                        </button>
                    </form>

                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => signIn("google", { redirectTo: "/dashboard" })}
                            className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:border-fuchsia-400"
                        >
                            Continue with Google
                        </button>
                        <button
                            type="button"
                            onClick={() => signIn("github", { redirectTo: "/dashboard" })}
                            className="border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:border-fuchsia-400"
                        >
                            Continue with GitHub
                        </button>
                    </div>

                    <div className="mt-6 flex items-center justify-between border-t border-zinc-800 pt-4 text-[11px] tracking-[0.12em]">
                        <Link href="/register" className="text-zinc-400 transition hover:text-orange-300">
                            REGISTER_NEW_OPERATOR
                        </Link>
                        <span className="text-lime-300">SECURE_CHANNEL</span>
                    </div>
                </div>

                <div className="mt-6 overflow-hidden border-y border-zinc-800 bg-zinc-950/80 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                    <div className="marquee-track flex min-w-max gap-8 whitespace-nowrap">
                        <span className="font-bold text-orange-300">LATEST_BLOCKS</span>
                        <span>#829104 // 2.4 BTC</span>
                        <span>#829103 // 1.8 BTC</span>
                        <span>#829102 // 0.9 BTC</span>
                        <span>#829101 // 4.2 BTC</span>
                        <span className="font-bold text-orange-300">LATEST_BLOCKS</span>
                        <span>#829104 // 2.4 BTC</span>
                        <span>#829103 // 1.8 BTC</span>
                        <span>#829102 // 0.9 BTC</span>
                        <span>#829101 // 4.2 BTC</span>
                    </div>
                </div>
            </section>
        </main>
    );
}
