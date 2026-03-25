import {
  RosterBuilderClient,
  type PlayerBankEntry,
  type PlayerBankHistoryEntry
} from "@/app/roster-builder/roster-builder-client";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type CwlHistoryRow = {
  player_tag: string | null;
  player_name: string | null;
  month_date: string | null;
  month_label?: string | null;
  roster_th: string | null;
  clan_name?: string | null;
  attacks?: string[] | string | null;
  totals?: string | null;
  league?: string | null;
  clan_badge?: string | null;
};

type PlayerBankGroup = {
  player: PlayerBankEntry;
  months: Array<PlayerBankHistoryEntry & { sort_value: number }>;
};

function normalizeTag(tag: string | null | undefined) {
  if (!tag) {
    return "";
  }

  const trimmed = tag.trim().toUpperCase();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function extractTownHallLevel(rosterTh: string | null | undefined) {
  if (!rosterTh) {
    return 0;
  }

  const match = rosterTh.toUpperCase().match(/TH\s*(\d{1,2})/);
  if (!match) {
    return 0;
  }

  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? 0 : value;
}

function parseDateValue(monthDate: string | null | undefined) {
  if (!monthDate) {
    return 0;
  }

  const parsed = new Date(`${monthDate}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function extractStarsFromTotals(totals: string | null | undefined) {
  if (!totals) {
    return 0;
  }

  const match = totals.match(/(\d+)\s*stars?/i);
  if (!match) {
    return 0;
  }

  const value = Number.parseInt(match[1], 10);
  return Number.isNaN(value) ? 0 : value;
}

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

function parseDivision(leagueLabel: string) {
  const digitMatch = leagueLabel.match(/\b([1-3])\b/);
  if (digitMatch) {
    return Number.parseInt(digitMatch[1], 10);
  }

  const romanMatch = leagueLabel.match(/\b(III|II|I)\b/i);
  if (!romanMatch) {
    return 0;
  }

  const roman = romanMatch[1].toUpperCase();
  if (roman === "I") {
    return 1;
  }
  if (roman === "II") {
    return 2;
  }
  if (roman === "III") {
    return 3;
  }

  return 0;
}

function leagueRankScore(leagueLabel: string) {
  const lower = leagueLabel.toLowerCase();
  let tierBase = 0;

  if (lower.includes("champion")) {
    tierBase = 600;
  } else if (lower.includes("master")) {
    tierBase = 500;
  } else if (lower.includes("crystal")) {
    tierBase = 400;
  } else if (lower.includes("gold")) {
    tierBase = 300;
  } else if (lower.includes("silver")) {
    tierBase = 200;
  } else if (lower.includes("bronze")) {
    tierBase = 100;
  }

  const division = parseDivision(leagueLabel);
  const divisionBonus = division >= 1 && division <= 3 ? (4 - division) * 10 : 0;

  return tierBase + divisionBonus;
}

function extractLeagueRaw(row: CwlHistoryRow) {
  return row.league?.trim() || row.clan_badge?.trim() || "";
}

function normalizeAttacks(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => entry.length > 0);
  }

  return [] as string[];
}

function deriveMonthLabel(row: CwlHistoryRow) {
  if (typeof row.month_label === "string" && row.month_label.trim()) {
    return row.month_label.trim();
  }

  if (typeof row.month_date === "string" && row.month_date.trim()) {
    const parsed = new Date(`${row.month_date.trim()}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString("en-US", {
        month: "short",
        year: "numeric"
      });
    }
  }

  return "Unknown Month";
}

function buildPlayerBank(rows: CwlHistoryRow[]) {
  const grouped = new Map<string, PlayerBankGroup>();
  const latestByTag = new Map<string, number>();

  for (const row of rows) {
    const tag = normalizeTag(row.player_tag);
    if (!tag) {
      continue;
    }

    const dateValue = parseDateValue(row.month_date);
    const thLevel = extractTownHallLevel(row.roster_th);
    const stars = extractStarsFromTotals(row.totals);
    const leagueLabel = toReadableLeagueLabel(extractLeagueRaw(row));
    const leagueRank = leagueRankScore(leagueLabel);
    const currentLatest = latestByTag.get(tag) ?? -1;
    const rowName = row.player_name?.trim() || "Unknown Player";

    if (!grouped.has(tag)) {
      grouped.set(tag, {
        player: {
          player_tag: tag,
          player_name: rowName,
          latest_th_level: thLevel,
          latest_stars: stars,
          latest_league_label: leagueLabel,
          latest_league_rank: leagueRank,
          recent_cwl_history: []
        },
        months: []
      });
      latestByTag.set(tag, dateValue);
    }

    const currentGroup = grouped.get(tag)!;

    if (currentGroup.player.player_name === "Unknown Player" && rowName !== "Unknown Player") {
      currentGroup.player.player_name = rowName;
    }

    currentGroup.months.push({
      month_label: deriveMonthLabel(row),
      roster_th: row.roster_th?.trim() || "-",
      clan_name: row.clan_name?.trim() || "Unknown Clan",
      league_label: leagueLabel,
      totals: row.totals?.trim() || "-",
      attacks: normalizeAttacks(row.attacks),
      sort_value: dateValue
    });

    if (dateValue >= currentLatest) {
      currentGroup.player.latest_th_level = thLevel > 0 ? thLevel : currentGroup.player.latest_th_level;
      currentGroup.player.latest_stars = stars;
      currentGroup.player.latest_league_label = leagueLabel;
      currentGroup.player.latest_league_rank = leagueRank;
      latestByTag.set(tag, dateValue);
    }
  }

  const players = Array.from(grouped.values()).map((group) => {
    const sortedMonths = [...group.months].sort((a, b) => b.sort_value - a.sort_value);
    const uniqueMonths = new Map<string, PlayerBankHistoryEntry>();

    for (const month of sortedMonths) {
      const dedupeKey = month.month_label.toUpperCase();
      if (!uniqueMonths.has(dedupeKey)) {
        uniqueMonths.set(dedupeKey, {
          month_label: month.month_label,
          roster_th: month.roster_th,
          clan_name: month.clan_name,
          league_label: month.league_label,
          totals: month.totals,
          attacks: month.attacks
        });
      }
    }

    group.player.recent_cwl_history = Array.from(uniqueMonths.values()).slice(0, 3);
    return group.player;
  });

  return players.sort((a, b) => {
    if (a.latest_th_level !== b.latest_th_level) {
      return b.latest_th_level - a.latest_th_level;
    }

    if (a.latest_stars !== b.latest_stars) {
      return b.latest_stars - a.latest_stars;
    }

    return a.player_name.localeCompare(b.player_name);
  });
}

export const dynamic = "force-dynamic";

export default async function RosterBuilderPage() {
  let players: PlayerBankEntry[] = [];
  let errorMessage: string | null = null;
  let sourceTable: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const candidateTables = ["cwl_history", "cwl_monthly_history"];
    let lastError: unknown = null;

    for (const tableName of candidateTables) {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("month_date", { ascending: false });

      if (!error) {
        players = buildPlayerBank((data ?? []) as CwlHistoryRow[]);
        sourceTable = tableName;
        lastError = null;
        break;
      }

      const isMissingTable =
        error.code === "PGRST205" ||
        error.code === "42P01" ||
        /could not find the table/i.test(error.message ?? "");
      const isMissingColumn =
        error.code === "PGRST204" ||
        error.code === "42703" ||
        /could not find the .* column/i.test(error.message ?? "");

      if (isMissingTable || isMissingColumn) {
        lastError = error;
        continue;
      }

      throw error;
    }

    if (!sourceTable && lastError) {
      throw lastError;
    }
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to load CWL player bank from Supabase.";
  }

  return (
    <div className="space-y-10">
      <section className="section-frame space-y-5 px-4 py-7 sm:px-6 md:px-8 md:py-10">
        <p className="eyebrow">CWL Utility</p>
        <h1 className="font-serif-display text-4xl leading-[0.98] tracking-tight text-ink sm:text-5xl md:text-7xl">
          CWL Roster Builder
        </h1>
        <p className="max-w-3xl text-base leading-7 text-ink/66 sm:text-lg sm:leading-8">
          Draft players from your CWL database into multiple clan rosters with
          duplicate checks, capacity limits, and TH composition tracking.
        </p>
        {sourceTable ? (
          <p className="text-xs uppercase tracking-[0.2em] text-ink/45">
            Source table: {sourceTable}
          </p>
        ) : null}
      </section>

      {errorMessage ? (
        <section className="section-frame border-brick/20 px-4 py-6 text-brick sm:px-6">
          <p className="data-label text-brick/80">Data Source Error</p>
          <p className="mt-3 text-base leading-7">{errorMessage}</p>
          <p className="mt-3 text-sm leading-6 text-brick/85">
            Ensure `cwl_history` or `cwl_monthly_history` exists and includes player rows
            with `player_tag`, `player_name`, `month_date`, and `roster_th`.
          </p>
        </section>
      ) : (
        <RosterBuilderClient initialPlayers={players} />
      )}
    </div>
  );
}

