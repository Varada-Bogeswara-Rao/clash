import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type TrackedPlayer = {
  tag: string;
  name: string;
};

type PlayerHistoryRecord = {
  id: string;
  player_tag: string;
  date: string;
  clan_tag: string | null;
  clan_name: string | null;
};

export type DashboardHistoryRow = {
  id: string;
  date: string;
  playerTag: string;
  playerName: string;
  clanTag: string | null;
  clanName: string | null;
  status: "Active" | "Unaffiliated";
  isLatest: boolean;
};

export type DashboardData = {
  totalPlayers: number;
  activeClans: number;
  rows: DashboardHistoryRow[];
  error: string | null;
};

export async function getDashboardData(limit = 18): Promise<DashboardData> {
  try {
    const supabase = getSupabaseAdmin();
    const historyWindow = Math.max(limit, 2000);

    const [playersResult, historyResult] = await Promise.all([
      supabase.from("tracked_players").select("tag, name").order("name", {
        ascending: true
      }),
      supabase
        .from("player_history")
        .select("id, player_tag, date, clan_tag, clan_name")
        .order("date", { ascending: false })
        .limit(historyWindow)
    ]);

    if (playersResult.error) {
      throw playersResult.error;
    }

    if (historyResult.error) {
      throw historyResult.error;
    }

    const players = (playersResult.data ?? []) as TrackedPlayer[];
    const history = (historyResult.data ?? []) as PlayerHistoryRecord[];
    const playerNames = new Map(players.map((player) => [player.tag, player.name]));
    const latestPlayerTags = new Set<string>();

    const rows = history.map((entry) => {
      const isLatest = !latestPlayerTags.has(entry.player_tag);
      latestPlayerTags.add(entry.player_tag);

      return {
        id: entry.id,
        date: entry.date,
        playerTag: entry.player_tag,
        playerName: playerNames.get(entry.player_tag) ?? "Unknown Player",
        clanTag: entry.clan_tag,
        clanName: entry.clan_name,
        status: entry.clan_tag ? "Active" : "Unaffiliated",
        isLatest
      } satisfies DashboardHistoryRow;
    });

    const activeClans = new Set(
      rows
        .filter((row) => row.isLatest && row.clanTag)
        .map((row) => row.clanTag as string)
    ).size;

    return {
      totalPlayers: players.length,
      activeClans,
      rows: rows.slice(0, limit),
      error: null
    };
  } catch (error) {
    return {
      totalPlayers: 0,
      activeClans: 0,
      rows: [],
      error:
        error instanceof Error
          ? error.message
          : "Unable to load dashboard data from Supabase."
    };
  }
}

