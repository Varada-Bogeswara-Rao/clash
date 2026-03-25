import "server-only";

export type CwlHistoryRow = {
  player_tag?: unknown;
  player_name?: unknown;
  month_label?: unknown;
  month_date?: unknown;
  clan_name?: unknown;
  clan_badge?: unknown;
  attacks?: unknown;
  totals?: unknown;
  league?: unknown;
};

export type PlayerHistoryItem = {
  month_label: string;
  month_date: string;
  clan_name: string;
  clan_badge: string | null;
  attacks: string[];
  totals: string;
  league: string | null;
};

export type CwlPlayer = {
  player_tag: string;
  player_name: string;
  latest_league: string;
  history: PlayerHistoryItem[];
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function normalizeTag(value: unknown) {
  if (!isString(value)) {
    return "";
  }

  const trimmed = value.trim().toUpperCase();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function normalizeAttacks(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  if (isString(value) && value.trim()) {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [] as string[];
}

function toReadableLeague(input: string | null | undefined) {
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

function normalizedDateString(value: unknown) {
  if (!isString(value)) {
    return "";
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed;
}

function derivedMonthLabel(row: CwlHistoryRow) {
  if (isString(row.month_label) && row.month_label.trim()) {
    return row.month_label.trim();
  }

  if (isString(row.month_date) && row.month_date.trim()) {
    const date = new Date(`${row.month_date.trim()}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString("en-US", {
        month: "short",
        year: "numeric"
      });
    }
  }

  return "Unknown Month";
}

function dateSortValue(value: string) {
  const parsed = new Date(`${value}T00:00:00`).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function deriveLeague(row: CwlHistoryRow) {
  const leagueFromColumn = isString(row.league) ? row.league : null;
  const leagueFromBadge = isString(row.clan_badge) ? row.clan_badge : null;
  return toReadableLeague(leagueFromColumn || leagueFromBadge || null);
}

export function groupCwlHistoryRows(rows: CwlHistoryRow[]) {
  const grouped = new Map<string, CwlPlayer>();

  for (const row of rows) {
    const tag = normalizeTag(row.player_tag);
    if (!tag) {
      continue;
    }

    const name = isString(row.player_name) && row.player_name.trim()
      ? row.player_name.trim()
      : "Unknown Player";

    if (!grouped.has(tag)) {
      grouped.set(tag, {
        player_tag: tag,
        player_name: name,
        latest_league: "Unknown League",
        history: []
      });
    }

    const player = grouped.get(tag)!;
    if (player.player_name === "Unknown Player" && name !== "Unknown Player") {
      player.player_name = name;
    }

    player.history.push({
      month_label: derivedMonthLabel(row),
      month_date: normalizedDateString(row.month_date),
      clan_name:
        isString(row.clan_name) && row.clan_name.trim()
          ? row.clan_name.trim()
          : "Unknown Clan",
      clan_badge:
        isString(row.clan_badge) && row.clan_badge.trim()
          ? row.clan_badge.trim()
          : null,
      attacks: normalizeAttacks(row.attacks),
      totals: isString(row.totals) && row.totals.trim() ? row.totals.trim() : "-",
      league: isString(row.league) && row.league.trim() ? row.league.trim() : null
    });
  }

  const players = Array.from(grouped.values()).map((player) => {
    player.history.sort((a, b) => dateSortValue(b.month_date) - dateSortValue(a.month_date));

    const latestRow = player.history[0];
    player.latest_league = toReadableLeague(
      latestRow?.league || latestRow?.clan_badge || null
    );

    return player;
  });

  players.sort((a, b) => a.player_name.localeCompare(b.player_name));

  const leagues = Array.from(
    new Set(players.map((player) => player.latest_league).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return {
    players,
    leagues
  };
}
