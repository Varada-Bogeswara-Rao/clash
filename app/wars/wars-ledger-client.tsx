"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export type WarArchiveRow = {
  id: string;
  clan_tag: string;
  opponent_name: string;
  state: string;
  team_size: number;
  our_stars: number;
  our_destruction: number;
  enemy_stars: number;
  enemy_destruction: number;
  end_time: string;
};

export type WarAttackRow = {
  id: string;
  war_id: string;
  attacker_tag: string;
  attacker_name: string;
  defender_tag: string;
  stars: number;
  destruction_percentage: number;
  attack_order: number;
};

type StatusBanner = {
  type: "success" | "error";
  message: string;
} | null;

type ArchiveApiResponse = {
  error?: string;
  archivedCount?: number;
  results?: Array<{ clanTag?: string; status?: string; message?: string }>;
};

type WarsLedgerClientProps = {
  wars: WarArchiveRow[];
  attacksByWar: Record<string, WarAttackRow[]>;
};

const expandedVariants = {
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

function parseJsonSafe(text: string) {
  try {
    return JSON.parse(text) as ArchiveApiResponse;
  } catch {
    return null;
  }
}

function formatWarDate(input: string) {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsed);
}

function formatScoreLine(war: WarArchiveRow) {
  return `${war.our_stars}  ${war.our_destruction.toFixed(1)}%  vs  ${war.enemy_stars}  ${war.enemy_destruction.toFixed(1)}%`;
}

function renderStars(stars: number) {
  const safe = Math.max(0, Math.min(3, stars));
  return String.fromCharCode(9733).repeat(safe) + String.fromCharCode(9734).repeat(3 - safe);
}

export function WarsLedgerClient({ wars, attacksByWar }: WarsLedgerClientProps) {
  const router = useRouter();
  const [isArchiving, setIsArchiving] = useState(false);
  const [statusBanner, setStatusBanner] = useState<StatusBanner>(null);
  const [expandedByWarId, setExpandedByWarId] = useState<Record<string, boolean>>({});

  const normalizedAttacksByWar = useMemo(() => {
    const grouped: Record<string, WarAttackRow[]> = {};

    for (const war of wars) {
      const rows = attacksByWar[war.id] ?? [];
      grouped[war.id] = [...rows].sort((a, b) => a.attack_order - b.attack_order);
    }

    return grouped;
  }, [attacksByWar, wars]);

  async function handleArchiveLatestWar() {
    setIsArchiving(true);
    setStatusBanner(null);

    try {
      const response = await fetch("/api/wars/archive", { method: "POST" });
      const rawText = await response.text();
      const payload = parseJsonSafe(rawText);

      if (!response.ok) {
        const firstDetailedError = payload?.results?.find((entry) => entry.status === "error")?.message;
        const message =
          payload?.error ||
          firstDetailedError ||
          `Archive failed (${response.status}). ${rawText.slice(0, 120)}` ||
          "Archive failed.";
        setStatusBanner({ type: "error", message });
        return;
      }

      const archivedCount = payload?.archivedCount ?? 0;
      const skippedCount = payload?.results?.filter((entry) => entry.status === "skipped").length ?? 0;
      const errorCount = payload?.results?.filter((entry) => entry.status === "error").length ?? 0;
      const summary = [
        `Archived for ${archivedCount} clan(s).`,
        skippedCount > 0 ? `Skipped: ${skippedCount}.` : "",
        errorCount > 0 ? `Errors: ${errorCount}.` : ""
      ]
        .filter((part) => part.length > 0)
        .join(" ");

      setStatusBanner({ type: "success", message: summary || "War archive completed." });
      router.refresh();
    } catch (error) {
      setStatusBanner({
        type: "error",
        message: error instanceof Error ? error.message : "Archive request failed."
      });
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <div className="space-y-7">
      <section className="section-frame flex flex-wrap items-center justify-between gap-4 px-6 py-5 md:px-8">
        <div>
          <p className="data-label">Action Strip</p>
          <p className="mt-2 text-sm text-ink/62">
            Save the latest finished war before Supercell rotates the live endpoint.
          </p>
        </div>
        <button
          type="button"
          onClick={handleArchiveLatestWar}
          disabled={isArchiving}
          className="rounded-full border border-black/15 bg-ink px-5 py-2 text-xs uppercase tracking-[0.2em] text-paper transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isArchiving ? "Archiving..." : "Archive Latest Ended War"}
        </button>
      </section>

      <AnimatePresence initial={false}>
        {statusBanner ? (
          <motion.section
            key={statusBanner.message}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={[
              "rounded-2xl border px-5 py-4 text-sm",
              statusBanner.type === "success"
                ? "border-sage/30 bg-sage/10 text-sage"
                : "border-brick/30 bg-brick/10 text-brick"
            ].join(" ")}
          >
            {statusBanner.message}
          </motion.section>
        ) : null}
      </AnimatePresence>

      {wars.length === 0 ? (
        <section className="section-frame px-6 py-10 text-center text-ink/60">
          <p className="font-serif-display text-3xl text-ink">No archived wars yet</p>
          <p className="mt-3 text-base">
            Archive a finished war to begin your permanent war timeline.
          </p>
        </section>
      ) : (
        <div className="space-y-3">
          {wars.map((war) => {
            const isExpanded = Boolean(expandedByWarId[war.id]);
            const attacks = normalizedAttacksByWar[war.id] ?? [];

            return (
              <article key={war.id} className="section-frame overflow-hidden">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedByWarId((current) => ({
                      ...current,
                      [war.id]: !current[war.id]
                    }))
                  }
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left md:px-8"
                >
                  <div className="space-y-2">
                    <h3 className="font-serif-display text-3xl tracking-tight text-ink">
                      {war.opponent_name}
                    </h3>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/55">
                      {formatWarDate(war.end_time)} | {war.clan_tag} | {war.team_size}v{war.team_size}
                    </p>
                    <p className="text-sm text-ink/75">{formatScoreLine(war)}</p>
                  </div>

                  <ChevronDown
                    className={[
                      "h-4 w-4 text-ink/60 transition-transform",
                      isExpanded ? "rotate-180" : "rotate-0"
                    ].join(" ")}
                    strokeWidth={1.7}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isExpanded ? (
                    <motion.div
                      key={`${war.id}-attacks`}
                      variants={expandedVariants}
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      className="overflow-hidden border-t border-black/10"
                    >
                      <div className="overflow-x-auto px-4 py-4 md:px-6 md:py-5">
                        <table className="min-w-full border-collapse text-left text-sm">
                          <thead className="border-b border-black/10 text-xs uppercase tracking-[0.2em] text-ink/55">
                            <tr>
                              <th className="px-3 py-3 font-normal">Attacker</th>
                              <th className="px-3 py-3 font-normal">Defender Map/Tag</th>
                              <th className="px-3 py-3 font-normal">Stars</th>
                              <th className="px-3 py-3 font-normal">Destruction</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attacks.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="px-3 py-4 text-ink/55">
                                  No attack entries archived for this war.
                                </td>
                              </tr>
                            ) : (
                              attacks.map((attack) => (
                                <tr key={attack.id} className="border-b border-black/10 last:border-b-0">
                                  <td className="px-3 py-3 text-base text-ink">
                                    <div className="space-y-1">
                                      <p>{attack.attacker_name}</p>
                                      <p className="text-[11px] uppercase tracking-[0.16em] text-ink/55">
                                        {attack.attacker_tag}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3 text-ink/75">
                                    {attack.defender_tag}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-ink">
                                    {renderStars(attack.stars)}
                                  </td>
                                  <td className="whitespace-nowrap px-3 py-3 text-ink/75">
                                    {attack.destruction_percentage.toFixed(1)}%
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}


