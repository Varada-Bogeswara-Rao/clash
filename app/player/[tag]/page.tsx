import Link from "next/link";
import { notFound } from "next/navigation";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type TrackedPlayerRow = {
  tag: string;
  name: string;
};

type PlayerHistoryRow = {
  id: string;
  date: string;
  clan_tag: string | null;
  clan_name: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium"
});

function normalizeTag(tag: string | null | undefined) {
  if (!tag) {
    return "";
  }

  const cleaned = tag
    .toUpperCase()
    .replace(/["']/g, "")
    .replace(/\s+/g, "")
    .replace(/[^#A-Z0-9]/g, "");

  if (!cleaned) {
    return "";
  }

  return cleaned.startsWith("#") ? cleaned : `#${cleaned}`;
}

export default async function PlayerProfilePage({
  params
}: {
  params: Promise<{ tag: string }>;
}) {
  const resolvedParams = await params;
  let decodedTag: string;

  try {
    decodedTag = decodeURIComponent(resolvedParams.tag);
  } catch {
    notFound();
  }

  const playerTag = normalizeTag(decodedTag);

  if (!playerTag) {
    notFound();
  }

  const supabase = getSupabaseAdmin();
  const thresholdDateObj = new Date();
  thresholdDateObj.setUTCDate(thresholdDateObj.getUTCDate() - 30);
  const thresholdDate = thresholdDateObj.toISOString().slice(0, 10);

  const [playerResult, historyResult] = await Promise.all([
    supabase
      .from("tracked_players")
      .select("tag, name")
      .eq("tag", playerTag)
      .maybeSingle(),
    supabase
      .from("player_history")
      .select("id, date, clan_tag, clan_name")
      .eq("player_tag", playerTag)
      .gte("date", thresholdDate)
      .order("date", { ascending: false })
      .limit(30)
  ]);

  if (playerResult.error) {
    throw new Error(playerResult.error.message);
  }

  if (historyResult.error) {
    throw new Error(historyResult.error.message);
  }

  const player = playerResult.data as TrackedPlayerRow | null;
  const history = (historyResult.data ?? []) as PlayerHistoryRow[];

  if (!player && history.length === 0) {
    notFound();
  }

  const targetClanTag = normalizeTag(process.env.NEXT_PUBLIC_TARGET_CLAN_TAG);

  return (
    <div className="space-y-10">
      <section className="section-frame space-y-6 px-4 py-7 sm:px-6 md:px-8 md:py-10">
        <Link
          href="/player-ledger"
          className="inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-ink/70 hover:bg-paper"
        >
          Back to Ledger
        </Link>

        <div className="space-y-3">
          <p className="eyebrow">Player Profile</p>
          <h1 className="font-serif-display text-4xl leading-[0.98] tracking-tight text-ink sm:text-5xl md:text-7xl">
            {player?.name ?? "Unknown Player"}
          </h1>
          <p className="text-sm uppercase tracking-[0.22em] text-ink/55">{playerTag}</p>
        </div>
      </section>

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="eyebrow">30-Day Timeline</p>
          <h2 className="font-serif-display text-4xl tracking-tight text-ink">
            Clan membership history
          </h2>
        </div>

        {history.length === 0 ? (
          <div className="section-frame px-4 py-10 text-center text-ink/60 sm:px-6 sm:py-12">
            <p className="font-serif-display text-3xl text-ink">No recent history</p>
            <p className="mt-3 text-base">
              This player has no snapshots in the retained 30-day window.
            </p>
          </div>
        ) : (
          <div className="section-frame overflow-hidden">
            <div className="-mx-1 overflow-x-auto">
              <table className="min-w-[700px] border-collapse text-left text-sm md:min-w-full">
                <thead className="border-b border-black/10 bg-paper">
                  <tr className="text-xs uppercase tracking-[0.22em] text-ink/55">
                    <th className="px-3 py-3 font-normal sm:px-5 sm:py-4">Date</th>
                    <th className="px-3 py-3 font-normal sm:px-5 sm:py-4">Clan Name</th>
                    <th className="px-3 py-3 font-normal sm:px-5 sm:py-4">Clan Tag</th>
                    <th className="px-3 py-3 font-normal sm:px-5 sm:py-4">In Home Clan?</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const clanTag = normalizeTag(row.clan_tag);
                    const inHomeClan =
                      targetClanTag.length > 0 && clanTag.length > 0 && clanTag === targetClanTag;

                    return (
                      <tr
                        key={row.id}
                        className="border-b border-black/10 last:border-b-0 hover:bg-paper"
                      >
                        <td className="whitespace-nowrap px-3 py-3 text-ink/70 sm:px-5 sm:py-4">
                          {dateFormatter.format(new Date(`${row.date}T00:00:00`))}
                        </td>
                        <td className="px-3 py-3 text-base text-ink sm:px-5 sm:py-4">
                          {row.clan_name ? (
                            row.clan_name
                          ) : (
                            <span className="inline-flex rounded-full border border-brick/30 bg-brick/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-brick">
                              Unaffiliated
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 uppercase tracking-[0.16em] text-ink/60 sm:px-5 sm:py-4">
                          {row.clan_tag ?? "-"}
                        </td>
                        <td className="px-3 py-3 sm:px-5 sm:py-4">
                          <span
                            className={[
                              "inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em]",
                              inHomeClan
                                ? "border-sage/30 bg-sage/10 text-sage"
                                : "border-black/10 bg-black/5 text-ink/60"
                            ].join(" ")}
                          >
                            {inHomeClan ? "YES" : "NO"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

