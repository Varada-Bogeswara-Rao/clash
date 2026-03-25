"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import type { DashboardHistoryRow } from "@/lib/dashboard";

const bodyVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.08
    }
  }
};

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      ease: [0.22, 1, 0.36, 1] as const
    }
  }
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium"
});

export function OverviewTable({
  rows,
  emptyMessage = "No player history has been stored yet."
}: {
  rows: DashboardHistoryRow[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="section-frame px-4 py-10 text-center text-ink/60 sm:px-6 sm:py-12">
        <p className="font-serif-display text-3xl text-ink">No entries yet</p>
        <p className="mt-3 text-base">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="section-frame overflow-hidden">
      <div className="-mx-1 overflow-x-auto">
        <table className="min-w-[760px] border-collapse text-left text-sm md:min-w-full">
          <thead className="border-b border-black/10 bg-paper">
            <tr className="text-xs uppercase tracking-[0.22em] text-ink/55">
              <th className="px-3 py-3 font-normal sm:px-5 sm:py-4">Date</th>
              <th className="px-3 py-3 font-normal sm:px-5 sm:py-4">Player Name</th>
              <th className="px-3 py-3 font-normal sm:px-5 sm:py-4">Player Tag</th>
              <th className="px-3 py-3 font-normal sm:px-5 sm:py-4">Clan Name</th>
              <th className="px-3 py-3 font-normal sm:px-5 sm:py-4">Status</th>
            </tr>
          </thead>

          <motion.tbody initial="hidden" animate="visible" variants={bodyVariants}>
            {rows.map((row) => {
              const playerHref = `/player/${encodeURIComponent(row.playerTag)}`;

              return (
                <motion.tr
                  key={row.id}
                  variants={rowVariants}
                  className="border-b border-black/10 last:border-b-0 hover:bg-paper"
                >
                  <td className="whitespace-nowrap px-3 py-3 text-ink/70 sm:px-5 sm:py-4">
                    {dateFormatter.format(new Date(`${row.date}T00:00:00`))}
                  </td>
                  <td className="px-3 py-3 text-base text-ink sm:px-5 sm:py-4">
                    <Link
                      href={playerHref}
                      className="border-b border-transparent pb-[1px] transition-colors hover:border-black/25"
                    >
                      {row.playerName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 uppercase tracking-[0.16em] text-ink/60 sm:px-5 sm:py-4">
                    <Link
                      href={playerHref}
                      className="border-b border-transparent pb-[1px] transition-colors hover:border-black/25"
                    >
                      {row.playerTag}
                    </Link>
                  </td>
                  <td className="px-3 py-3 sm:px-5 sm:py-4">
                    {row.clanName ? (
                      <div className="space-y-1">
                        <p className="text-base text-ink">{row.clanName}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink/45">
                          {row.clanTag}
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex rounded-full border border-brick/30 bg-brick/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-brick">
                        Unaffiliated
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 sm:px-5 sm:py-4">
                    <span
                      className={[
                        "inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em]",
                        row.status === "Active"
                          ? "border-sage/30 bg-sage/10 text-sage"
                          : "border-black/10 bg-black/5 text-ink/60"
                      ].join(" ")}
                    >
                      {row.status}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>
    </div>
  );
}

