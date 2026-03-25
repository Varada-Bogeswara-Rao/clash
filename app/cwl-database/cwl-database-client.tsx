"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type PlayerHistoryItem = {
  month_label: string;
  month_date: string;
  clan_name: string;
  clan_badge: string | null;
  attacks: string[];
  totals: string;
  league: string | null;
};

type CwlPlayer = {
  player_tag: string;
  player_name: string;
  latest_league: string;
  history: PlayerHistoryItem[];
};

const LEAGUE_IMAGE_MAP: Record<string, string> = {
  "champion 1": "/champion1.png",
  "champion 2": "/champion2.png",
  "champion 3": "/champion3.png",
  "master 1": "/master1.png",
  "master 2": "/master2.png",
  "master 3": "/master3.png"
};

const listItemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } }
};

const historyVariants = {
  collapsed: { opacity: 0, height: 0 },
  open: {
    opacity: 1,
    height: "auto",
    transition: {
      opacity: { duration: 0.2 },
      height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const }
    }
  }
};

function toReadableLeagueLabel(input: string | null | undefined) {
  if (!input) {
    return "Unknown League";
  }

  const cleaned = input
    .trim()
    .replace(/^:+|:+$/g, "")
    .replace(/_/g, " ")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ");

  if (!cleaned) {
    return "Unknown League";
  }

  return cleaned
    .split(" ")
    .map((word) =>
      word.length > 0 ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : ""
    )
    .join(" ")
    .trim();
}

function getLeagueImagePath(league: string) {
  const normalized = league.toLowerCase().replace(/\s+/g, " ").trim();
  return LEAGUE_IMAGE_MAP[normalized] ?? null;
}

function LeagueVisual({
  league,
  size,
  className = ""
}: {
  league: string;
  size: number;
  className?: string;
}) {
  const imagePath = getLeagueImagePath(league);

  if (!imagePath) {
    return (
      <span className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-ink/65">
        {league}
      </span>
    );
  }

  return (
    <div className={["group relative inline-flex", className].join(" ")}>
      <Image
        src={imagePath}
        alt={league}
        title={league}
        width={size}
        height={size}
        className="rounded-full border border-black/10 bg-paper object-contain"
      />
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-black/10 bg-paper px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-ink/70 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {league}
      </span>
    </div>
  );
}

export function CwlDatabaseClient({
  players,
  leagues
}: {
  players: CwlPlayer[];
  leagues: string[];
}) {
  const [selectedLeague, setSelectedLeague] = useState("All Players");
  const [expandedByTag, setExpandedByTag] = useState<Record<string, boolean>>({});

  const filterOptions = ["All Players", ...leagues];
  const filteredPlayers =
    selectedLeague === "All Players"
      ? players
      : players.filter((player) => player.latest_league === selectedLeague);

  return (
    <div className="space-y-8">
      <section className="section-frame space-y-5 px-6 py-6 md:px-8">
        <p className="data-label">Latest League Filter</p>
        <div className="overflow-x-auto pb-1">
          <div className="inline-flex min-w-full gap-2">
            {filterOptions.map((league) => {
              const isActive = selectedLeague === league;

              return (
                <button
                  key={league}
                  type="button"
                  onClick={() => setSelectedLeague(league)}
                  title={league}
                  className={[
                    "inline-flex items-center justify-center rounded-full border px-3 py-2 text-xs uppercase tracking-[0.22em]",
                    isActive
                      ? "border-black/15 bg-ink text-paper"
                      : "border-black/10 bg-paper text-ink/70 hover:bg-parchment"
                  ].join(" ")}
                >
                  {league === "All Players" ? (
                    <span className="whitespace-nowrap">All Players</span>
                  ) : (
                    <LeagueVisual league={league} size={26} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {filteredPlayers.length === 0 ? (
        <section className="section-frame px-6 py-10 text-center text-ink/60">
          <p className="font-serif-display text-3xl text-ink">No players found</p>
          <p className="mt-3 text-base">
            No CWL players match the selected latest league filter.
          </p>
        </section>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filteredPlayers.map((player) => {
              const isExpanded = Boolean(expandedByTag[player.player_tag]);

              return (
                <motion.article
                  layout
                  key={player.player_tag}
                  variants={listItemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="section-frame overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedByTag((current) => ({
                        ...current,
                        [player.player_tag]: !current[player.player_tag]
                      }))
                    }
                    className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left md:px-8"
                  >
                    <div className="space-y-2">
                      <h3 className="font-serif-display text-3xl tracking-tight text-ink">
                        {player.player_name}
                      </h3>
                      <p className="text-xs uppercase tracking-[0.2em] text-ink/55">
                        {player.player_tag}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <LeagueVisual league={player.latest_league} size={34} />
                      <ChevronDown
                        className={[
                          "h-4 w-4 text-ink/60 transition-transform",
                          isExpanded ? "rotate-180" : "rotate-0"
                        ].join(" ")}
                        strokeWidth={1.7}
                      />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded ? (
                      <motion.div
                        key={`${player.player_tag}-history`}
                        variants={historyVariants}
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        className="overflow-hidden border-t border-black/10"
                      >
                        <div className="overflow-x-auto px-4 py-4 md:px-6 md:py-5">
                          <table className="min-w-full border-collapse text-left text-sm">
                            <thead className="border-b border-black/10 text-xs uppercase tracking-[0.2em] text-ink/55">
                              <tr>
                                <th className="px-3 py-3 font-normal">Month</th>
                                <th className="px-3 py-3 font-normal">Clan</th>
                                <th className="px-3 py-3 font-normal">Attacks</th>
                                <th className="px-3 py-3 font-normal">Totals</th>
                              </tr>
                            </thead>
                            <tbody>
                              {player.history.map((entry) => {
                                const entryLeague = toReadableLeagueLabel(
                                  entry.league || entry.clan_badge
                                );

                                return (
                                  <tr
                                    key={`${player.player_tag}-${entry.month_label}-${entry.month_date}`}
                                    className="border-b border-black/10 last:border-b-0"
                                  >
                                    <td className="whitespace-nowrap px-3 py-3 text-base text-ink">
                                      {entry.month_label}
                                    </td>
                                    <td className="px-3 py-3 text-ink">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <LeagueVisual league={entryLeague} size={24} />
                                        <span>{entry.clan_name}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex flex-wrap gap-2">
                                        {entry.attacks.length > 0 ? (
                                          entry.attacks.map((attack, index) => (
                                            <span
                                              key={`${player.player_tag}-${entry.month_label}-${index}`}
                                              className="rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-ink/65"
                                            >
                                              D{index + 1} {attack}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-ink/50">-</span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-ink/70">
                                      {entry.totals}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.article>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
