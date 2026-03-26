"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  ScrollText,
  Table2,
  Users,
  Layers3,
  Shield,
  Trophy
} from "lucide-react";

const navigation = [
  {
    href: "/",
    label: "Overview",
    icon: LayoutDashboard
  },
  {
    href: "/player-ledger",
    label: "Player Ledger",
    icon: ScrollText
  },
  {
    href: "/cwl",
    label: "CWL",
    icon: Table2
  },
  {
    href: "/cwl-database",
    label: "CWL DB",
    icon: Users
  },
  {
    href: "/roster-builder",
    label: "Roster",
    icon: Layers3
  },
  {
    href: "/wars",
    label: "Wars",
    icon: Shield
  },
  {
    href: "/esports",
    label: "Esports",
    icon: Trophy
  }
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-black/10 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="eyebrow">Automated Clash of Clans tracking</p>
            <Link
              href="/"
              className="inline-flex items-center gap-3 font-serif-display text-3xl tracking-tight text-ink"
            >
              <Image
                src="/bax.png"
                alt="BAX Ledger logo"
                width={30}
                height={30}
                className="h-[30px] w-[30px] rounded-full border border-black/10"
              />
              BAX Ledger
            </Link>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.22em]",
                    isActive
                      ? "border-black/15 bg-ink text-paper"
                      : "border-black/10 bg-parchment text-ink/70 hover:bg-paper"
                  ].join(" ")}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] as const }}
          className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:py-14"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

