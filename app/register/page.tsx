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

export default function RegisterPage() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        const form = new FormData(event.currentTarget);
        const name = String(form.get("name") ?? "").trim();
        const email = String(form.get("email") ?? "").trim();
        const password = String(form.get("password") ?? "");

        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as { error?: string };
            setError(payload.error ?? "สมัครสมาชิกไม่สำเร็จ");
            setIsLoading(false);
            return;
        }

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
            redirectTo: "/dashboard"
        });

        setIsLoading(false);

        if (result?.error) {
            setError("สมัครสำเร็จ แต่เข้าสู่ระบบอัตโนมัติไม่สำเร็จ กรุณา Login อีกครั้ง");
            return;
        }

        window.location.href = result?.url ?? "/dashboard";
    }

    return (
        <main className={`${manrope.className} relative min-h-screen overflow-hidden bg-[#0b0b0b] pb-36 text-zinc-100`}>
            {/* Overlays */}
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
            <div className="pointer-events-none absolute -right-8 bottom-1/3 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[120px]" />

            {/* Top Header */}
            <header className="fixed left-0 top-0 z-50 w-full border-b-4 border-[#1a1a1a] bg-[#0e0e0e] shadow-[4px_4px_0px_0px_rgba(72,72,71,1)]">
                <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
                    <Link
                        href="/login"
                        className="flex items-center gap-2 border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-orange-400 transition hover:border-orange-400 hover:bg-orange-950/30"
                    >
                        <span className={`${spaceGrotesk.className} text-xs font-bold tracking-[0.1em]`}>
                            {"< BACK"}
                        </span>
                    </Link>
                    <h1
                        className={`${spaceGrotesk.className} text-lg font-black italic uppercase tracking-tighter text-orange-400`}
                    >
                        OPERATOR REGISTRATION
                    </h1>
                    <div className="ml-auto flex items-center gap-2 border border-zinc-800 bg-black px-2 py-1 text-[10px] tracking-[0.12em] text-lime-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> NODE ONLINE
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <section className="relative z-30 mx-auto mt-20 w-full max-w-5xl space-y-8 px-6 py-8">
                {/* Phase Block */}
                <div className="relative border-l-4 border-orange-400 bg-zinc-900/90 p-6 shadow-[6px_6px_0_0_#2f2f2f]">
                    <div className="mb-4 flex items-start justify-between">
                        <span
                            className={`${spaceGrotesk.className} bg-[#371c00] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-orange-400`}
                        >
                            System Phase 01
                        </span>
                        <span className="text-[10px] tracking-widest text-zinc-500">SECURE_CHANNEL_v4.2</span>
                    </div>
                    <h2
                        className={`${spaceGrotesk.className} mb-2 text-3xl font-black uppercase tracking-tighter text-zinc-100 sm:text-4xl`}
                    >
                        INITIALIZE_NODE
                    </h2>
                    <p className="text-sm text-zinc-400">
                        Create your permanent identity on the BitSnake decentralized network.
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={onSubmit} className="space-y-6">
                    {/* FULL_NAME */}
                    <div>
                        <label
                            className={`${spaceGrotesk.className} mb-2 block text-xs font-bold uppercase tracking-widest text-orange-300`}
                        >
                            FULL_NAME
                        </label>
                        <div className="flex items-center border-b-2 border-zinc-700 bg-black/70 px-4 py-3 transition-colors focus-within:border-orange-400">
                            <span className="mr-3 text-zinc-500 text-sm">@</span>
                            <input
                                type="text"
                                name="name"
                                className="w-full bg-transparent uppercase tracking-wider text-zinc-100 outline-none placeholder:text-zinc-600"
                                placeholder="ENTER_LEGAL_IDENTITY"
                            />
                        </div>
                    </div>

                    {/* EMAIL_ADDRESS */}
                    <div>
                        <label
                            className={`${spaceGrotesk.className} mb-2 block text-xs font-bold uppercase tracking-widest text-orange-300`}
                        >
                            EMAIL_ADDRESS
                        </label>
                        <div className="flex items-center border-b-2 border-zinc-700 bg-black/70 px-4 py-3 transition-colors focus-within:border-orange-400">
                            <span className="mr-3 text-zinc-500 text-sm">✉</span>
                            <input
                                required
                                type="email"
                                name="email"
                                className="w-full bg-transparent uppercase tracking-wider text-zinc-100 outline-none placeholder:text-zinc-600"
                                placeholder="OPERATOR@NETWORK.COM"
                            />
                        </div>
                    </div>

                    {/* SECURE_CODE */}
                    <div>
                        <label
                            className={`${spaceGrotesk.className} mb-2 block text-xs font-bold uppercase tracking-widest text-orange-300`}
                        >
                            SECURE_CODE (8+ CHARS)
                        </label>
                        <div className="flex items-center border-b-2 border-zinc-700 bg-black/70 px-4 py-3 transition-colors focus-within:border-orange-400">
                            <span className="mr-3 text-zinc-500 text-sm">⌘</span>
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

                    {error ? (
                        <p className="border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                            ERROR: {error}
                        </p>
                    ) : null}

                    {/* Submit */}
                    <button
                        disabled={isLoading}
                        type="submit"
                        className={`${spaceGrotesk.className} flex w-full items-center justify-between bg-orange-500 px-5 py-4 text-base font-black uppercase tracking-tighter text-black shadow-[4px_4px_0_0_#484847] transition-all hover:bg-orange-400 active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-60`}
                    >
                        <span>{isLoading ? "กำลังสร้างบัญชี..." : "FINALIZE_REGISTRATION"}</span>
                        <span className="text-xl">⚡</span>
                    </button>
                </form>

                {/* Ticker */}
                <div className="overflow-hidden border-y border-zinc-800 bg-zinc-950/80 px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-zinc-400">
                    <div className="marquee-track flex min-w-max gap-8 whitespace-nowrap">
                        <span className="font-bold text-orange-300/60">CAUTION: DO NOT SHARE CREDENTIALS</span>
                        <span>•</span>
                        <span>ENCRYPTION: AES-256</span>
                        <span>•</span>
                        <span>SYSTEM_STATUS: SECURE</span>
                        <span>•</span>
                        <span>NODE_READY_FOR_HANDSHAKE</span>
                        <span className="font-bold text-orange-300/60">CAUTION: DO NOT SHARE CREDENTIALS</span>
                        <span>•</span>
                        <span>ENCRYPTION: AES-256</span>
                        <span>•</span>
                        <span>SYSTEM_STATUS: SECURE</span>
                        <span>•</span>
                        <span>NODE_READY_FOR_HANDSHAKE</span>
                    </div>
                </div>

                {/* Login Link */}
                <div className="flex items-center justify-between border-t border-zinc-800 pt-4 text-[11px] tracking-[0.12em]">
                    <Link href="/login" className="text-zinc-400 transition hover:text-orange-300">
                        EXISTING_OPERATOR? LOGIN_HERE
                    </Link>
                    <span className="text-lime-300">SECURE_CHANNEL</span>
                </div>
            </section>

            {/* Fixed Footer Status Bar */}
            <footer className="fixed bottom-0 left-0 z-50 w-full border-t-4 border-[#1a1a1a] bg-[#0e0e0e]">
                <div className="flex h-6 items-center bg-[#1a1a1a] px-4">
                    <div className="flex items-center gap-2">
                        <span className="h-2 w-2 bg-lime-400" />
                        <span
                            className={`${spaceGrotesk.className} text-[10px] font-bold uppercase tracking-widest text-lime-300`}
                        >
                            KERNEL_INITIALIZING...
                        </span>
                    </div>
                    <div className={`${spaceGrotesk.className} ml-auto text-[10px] text-zinc-500`}>v1.0.8-ALPHA</div>
                </div>
            </footer>
        </main>
    );
}
