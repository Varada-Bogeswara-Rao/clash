import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ClashPlayerPayload = {
  clan?: {
    tag?: string;
    name?: string;
  } | null;
};

type TrackedPlayer = {
  tag: string;
  name: string;
};

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

async function runDailyFetch(request: Request) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const clashApiKey = process.env.CLASH_API_KEY;

  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 500 }
    );
  }

  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!clashApiKey) {
    return NextResponse.json(
      { error: "CLASH_API_KEY is not configured." },
      { status: 500 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tracked_players")
      .select("tag, name")
      .order("name", { ascending: true });

    if (error) {
      throw error;
    }

    const trackedPlayers = (data ?? []) as TrackedPlayer[];
    const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const inserts: Array<{
      player_tag: string;
      date: string;
      clan_tag: string | null;
      clan_name: string | null;
    }> = [];
    const failures: Array<{
      tag: string;
      status: number;
    }> = [];

    for (const player of trackedPlayers) {
      await delay(100);

      const encodedTag = encodeURIComponent(player.tag);
      const response = await fetch(
        `https://cocproxy.royaleapi.dev/v1/players/${encodedTag}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${clashApiKey}`
          },
          cache: "no-store"
        }
      );

      if (!response.ok) {
        failures.push({
          tag: player.tag,
          status: response.status
        });
        continue;
      }

      const payload = (await response.json()) as ClashPlayerPayload;

      inserts.push({
        player_tag: player.tag,
        date,
        clan_tag: payload.clan?.tag ?? null,
        clan_name: payload.clan?.name ?? null
      });
    }

    if (inserts.length > 0) {
      const { error: insertError } = await supabase
        .from("player_history")
        .upsert(inserts, { onConflict: "player_tag,date" });

      if (insertError) {
        throw insertError;
      }
    }

    const retentionThreshold = new Date();
    retentionThreshold.setUTCDate(retentionThreshold.getUTCDate() - 30);
    const retentionThresholdDate = retentionThreshold.toISOString().slice(0, 10);

    const { error: pruneError, count: prunedRows } = await supabase
      .from("player_history")
      .delete({ count: "exact" })
      .lt("date", retentionThresholdDate);

    if (pruneError) {
      throw pruneError;
    }

    return NextResponse.json({
      snapshotDate: date,
      trackedPlayers: trackedPlayers.length,
      inserted: inserts.length,
      failures,
      retentionThresholdDate,
      prunedRows: prunedRows ?? 0
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The cron fetch failed unexpectedly."
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return runDailyFetch(request);
}

export async function POST(request: Request) {
  return runDailyFetch(request);
}


