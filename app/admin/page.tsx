import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Space_Grotesk, Manrope } from "next/font/google";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

const spaceGrotesk = Space_Grotesk({
    subsets: ["latin"],
    weight: ["500", "700"]
});

const manrope = Manrope({
    subsets: ["latin"],
    weight: ["400", "500", "700"]
});

async function updateUserRole(formData: FormData) {
    "use server";

    const session = await auth();
    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    const userId = String(formData.get("userId") ?? "");
    const role = String(formData.get("role") ?? "");

    if (!userId || (role !== "USER" && role !== "ADMIN")) {
        return;
    }

    await prisma.user.update({
        where: { id: userId },
        data: { role }
    });

    revalidatePath("/admin");
}

export default async function AdminPage() {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    if (session.user.role !== "ADMIN") {
        redirect("/dashboard");
    }

    // Repair legacy/invalid role values so Prisma enum parsing does not fail.
    await prisma.$executeRawUnsafe(
        "UPDATE `User` SET `role` = 'USER' WHERE `role` IS NULL OR `role` = '' OR `role` NOT IN ('USER','ADMIN')"
    );

    const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        }
    });

    const adminCount = users.filter((user) => user.role === "ADMIN").length;
    const userCount = users.filter((user) => user.role === "USER").length;

    const percent = (count: number) => {
        if (users.length === 0) {
            return 0;
        }
        return Math.max(6, Math.round((count / users.length) * 100));
    };

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
                            BITSTREAM_CMD ADMIN
                        </h1>
                    </div>
                    <div className="ml-auto flex gap-2">
                        <Link
                            href="/gamelog"
                            className="border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-orange-400 hover:text-orange-300"
                        >
                            GameLog
                        </Link>
                        <Link
                            href="/dashboard"
                            className="border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-orange-400 hover:text-orange-300"
                        >
                            Dashboard
                        </Link>
                        <Link
                            href="/"
                            className="border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-200 hover:border-orange-400 hover:text-orange-300"
                        >
                            Home
                        </Link>
                    </div>
                </div>
            </header>

            <section className="relative z-40 mx-auto mt-6 grid w-full max-w-7xl gap-6 px-4 xl:grid-cols-12">
                <div className="space-y-6 xl:col-span-9">
                    <div className="border-l-4 border-orange-400 bg-zinc-900/90 p-6 shadow-[6px_6px_0_0_#2f2f2f]">
                        <div className="inline-flex items-center gap-2 border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-lime-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-lime-400" /> node_status: online
                        </div>
                        <h2
                            className={`${spaceGrotesk.className} mt-3 text-3xl font-black uppercase tracking-tight text-zinc-100 sm:text-5xl`}
                        >
                            USER ROLE MANAGEMENT
                        </h2>
                        <p className="mt-2 text-sm text-zinc-400">จัดการสิทธิ์ผู้ใช้แบบทันที (USER / ADMIN)</p>
                    </div>

                    <section className="overflow-hidden border border-zinc-800 bg-zinc-900/80">
                        <div className="flex items-center justify-between border-b-4 border-zinc-800 bg-zinc-950 px-4 py-3">
                            <span
                                className={`${spaceGrotesk.className} text-xs font-bold uppercase tracking-[0.15em] text-orange-300`}
                            >
                                ACCESS_CONTROL_LIST.DAT
                            </span>
                            <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                                records_found: {users.length.toString().padStart(3, "0")}
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[780px] border-collapse text-sm">
                                <thead className="bg-zinc-900 text-left text-zinc-500">
                                    <tr className="border-b border-zinc-800 text-[11px] uppercase tracking-[0.14em]">
                                        <th className="px-4 py-3">User Identity</th>
                                        <th className="px-4 py-3">Current Role</th>
                                        <th className="px-4 py-3">Timestamp</th>
                                        <th className="px-4 py-3">Privilege Shift</th>
                                        <th className="px-4 py-3">Execute</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="border-t border-zinc-800 bg-black/30 hover:bg-zinc-900/70"
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center border border-zinc-700 bg-zinc-950 text-orange-300">
                                                        ◉
                                                    </div>
                                                    <div>
                                                        <p
                                                            className={`${spaceGrotesk.className} font-bold uppercase tracking-tight text-zinc-100`}
                                                        >
                                                            {user.name ?? "UNKNOWN"}
                                                        </p>
                                                        <p className="text-xs text-zinc-500">{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                                                        user.role === "ADMIN"
                                                            ? "bg-lime-400 text-black"
                                                            : "bg-zinc-800 text-zinc-200"
                                                    }`}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-zinc-400">
                                                {user.createdAt.toLocaleString("th-TH")}
                                            </td>
                                            <td className="px-4 py-3">
                                                <form action={updateUserRole} className="flex items-center gap-2">
                                                    <input type="hidden" name="userId" value={user.id} />
                                                    <select
                                                        name="role"
                                                        defaultValue={user.role}
                                                        className="border-b-2 border-zinc-700 bg-zinc-950 px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-100 outline-none focus:border-orange-400"
                                                    >
                                                        <option value="USER">USER</option>
                                                        <option value="ADMIN">ADMIN</option>
                                                    </select>
                                                    <button
                                                        type="submit"
                                                        className="border border-orange-500 bg-orange-500/20 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-orange-300 hover:bg-orange-500/35"
                                                    >
                                                        SAVE
                                                    </button>
                                                </form>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-zinc-500">write</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>

                <aside className="space-y-6 xl:col-span-3">
                    <div className="border-l-4 border-fuchsia-400 bg-zinc-900/90 p-5">
                        <h3
                            className={`${spaceGrotesk.className} text-sm font-black uppercase tracking-[0.14em] text-fuchsia-300`}
                        >
                            SECURITY_ADVISORY
                        </h3>
                        <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                            Role elevation should be reviewed. All changes are recorded in audit logs.
                        </p>
                    </div>

                    <div className="border border-zinc-800 bg-zinc-900/80 p-5">
                        <h3
                            className={`${spaceGrotesk.className} text-xs font-bold uppercase tracking-[0.16em] text-orange-300`}
                        >
                            ROLE_DISTRIBUTION
                        </h3>
                        <div className="mt-4 space-y-4">
                            <div>
                                <div className="mb-1 flex justify-between text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                                    <span>ADMIN</span>
                                    <span>{adminCount}</span>
                                </div>
                                <div className="h-1.5 bg-zinc-800">
                                    <div
                                        className="h-full bg-orange-400"
                                        style={{ width: `${percent(adminCount)}%` }}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="mb-1 flex justify-between text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                                    <span>USER</span>
                                    <span>{userCount}</span>
                                </div>
                                <div className="h-1.5 bg-zinc-800">
                                    <div className="h-full bg-lime-400" style={{ width: `${percent(userCount)}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>
            </section>

            <div className="fixed bottom-0 left-0 right-0 z-40 overflow-hidden border-t border-zinc-800 bg-zinc-950/95 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500 xl:pl-[calc((100vw-80rem)/2+1rem)]">
                <div className="marquee-track flex min-w-max gap-8 whitespace-nowrap">
                    <span className="font-bold text-orange-300">REAL-TIME_AUDIT</span>
                    <span>ROLE_UPDATED</span>
                    <span>ACCESS_GRANTED</span>
                    <span>NODE_ONLINE</span>
                    <span>BLK_HT: 842911</span>
                    <span className="font-bold text-orange-300">REAL-TIME_AUDIT</span>
                    <span>ROLE_UPDATED</span>
                    <span>ACCESS_GRANTED</span>
                    <span>NODE_ONLINE</span>
                    <span>BLK_HT: 842911</span>
                </div>
            </div>
        </main>
    );
}
