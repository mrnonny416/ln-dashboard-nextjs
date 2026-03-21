"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Space_Grotesk } from "next/font/google";
import { useEffect, useState } from "react";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["500", "700"]
});

type NavItem = {
    href: string;
    label: string;
    match: (pathname: string) => boolean;
};

const commonNavItems: NavItem[] = [
    { href: "/", label: "HOME", match: (pathname) => pathname === "/" },
    { href: "/dashboard", label: "DASHBOARD", match: (pathname) => pathname.startsWith("/dashboard") }
];

const adminOnlyNavItems: NavItem[] = [
    { href: "/admin", label: "ADMIN", match: (pathname) => pathname.startsWith("/admin") },
    { href: "/gamelog", label: "GAMELOG", match: (pathname) => pathname.startsWith("/gamelog") }
];

const guestNavItems: NavItem[] = [
    { href: "/login", label: "LOGIN", match: (pathname) => pathname.startsWith("/login") },
    { href: "/register", label: "REGISTER", match: (pathname) => pathname.startsWith("/register") }
];

export default function SiteNav() {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadSession() {
            const response = await fetch("/api/auth/session", { cache: "no-store" });
            if (!response.ok) {
                return;
            }

            const session = (await response.json()) as { user?: { role?: string } } | null;
            if (isMounted) {
                setIsAuthenticated(Boolean(session?.user));
                setIsAdmin(session?.user?.role === "ADMIN");
            }
        }

        void loadSession();

        return () => {
            isMounted = false;
        };
    }, []);

    const authedItems = isAdmin ? [...commonNavItems, ...adminOnlyNavItems] : commonNavItems;
    const navItems = isAuthenticated ? authedItems : [...commonNavItems, ...guestNavItems];

    return (
        <nav className="border-b border-zinc-800 bg-[#0e0e0e] px-4 py-3">
            <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-2">
                <span className="mr-2 text-xs font-bold tracking-[0.2em] text-orange-400">BITSTREAM_CMD</span>
                {navItems.map((item) => {
                    const isActive = item.match(pathname);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${spaceGrotesk.className} border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] transition ${
                                isActive
                                    ? "border-orange-500 bg-orange-500/20 text-orange-300"
                                    : "border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-orange-400 hover:text-orange-300"
                            }`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            {item.label}
                        </Link>
                    );
                })}
                {isAuthenticated ? (
                    <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className={`${spaceGrotesk.className} border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-red-300 transition hover:border-red-400 hover:text-red-200`}
                    >
                        LOGOUT
                    </button>
                ) : null}
            </div>
        </nav>
    );
}
