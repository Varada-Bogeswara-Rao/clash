import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ParsedMonthPayload = {
  month?: unknown;
  rosterTh?: unknown;
  clanName?: unknown;
  clanBadge?: unknown;
  attacks?: unknown;
  totals?: unknown;
};

type SavePayload = {
  playerName?: unknown;
  playerTag?: unknown;
  months?: unknown;
};

type SaveRequestPayload = SavePayload & {
  players?: unknown;
};

type SupabaseWriteError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

const monthNumberMap: Record<string, string> = {
  Jan: "01",
  Feb: "02",
  Mar: "03",
  Apr: "04",
  May: "05",
  Jun: "06",
  Jul: "07",
  Aug: "08",
  Sep: "09",
  Oct: "10",
  Nov: "11",
  Dec: "12"
};

function parseMonthToDate(monthLabel: string) {
  const match = monthLabel.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/
  );

  if (!match) {
    return null;
  }

  const month = monthNumberMap[match[1]];
  const year = match[2];

  return `${year}-${month}-01`;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isSupabaseWriteError(error: unknown): error is SupabaseWriteError {
  return (
    typeof error === "object" &&
    error !== null &&
    ("code" in error || "message" in error)
  );
}

function normalizeTag(tag: string) {
  const trimmed = tag.trim().toUpperCase();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function normalizePlayersFromBody(body: SaveRequestPayload) {
  if (Array.isArray(body.players)) {
    return body.players as SavePayload[];
  }

  return [body as SavePayload];
}

const createTableSql = `create extension if not exists pgcrypto;

create table if not exists public.cwl_monthly_history (
  id uuid primary key default gen_random_uuid(),
  player_tag text not null,
  player_name text not null,
  month_label text not null,
  month_date date not null,
  roster_th text not null,
  clan_name text not null,
  clan_badge text null,
  attacks text[] not null default '{}',
  totals text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_tag, month_label)
);`;

export async function POST(request: Request) {
  let body: SaveRequestPayload;

  try {
    body = (await request.json()) as SaveRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const players = normalizePlayersFromBody(body);

  if (players.length === 0) {
    return NextResponse.json({ error: "No players found in request body." }, { status: 400 });
  }

  const rows = players.flatMap((player, playerIndex) => {
    if (!isString(player.playerName) || !player.playerName.trim()) {
      throw new Error(`playerName is required for player index ${playerIndex}.`);
    }

    if (!isString(player.playerTag) || !player.playerTag.trim()) {
      throw new Error(`playerTag is required for player index ${playerIndex}.`);
    }

    if (!Array.isArray(player.months) || player.months.length === 0) {
      throw new Error(`months must be a non-empty array for player index ${playerIndex}.`);
    }

    return player.months.map((entry, monthIndex) => {
      const monthEntry = entry as ParsedMonthPayload;

      if (
        !isString(monthEntry.month) ||
        !isString(monthEntry.rosterTh) ||
        !isString(monthEntry.clanName) ||
        !Array.isArray(monthEntry.attacks) ||
        !isString(monthEntry.totals)
      ) {
        throw new Error(
          `Invalid month payload at player index ${playerIndex}, month index ${monthIndex}.`
        );
      }

      const monthDate = parseMonthToDate(monthEntry.month.trim());
      if (!monthDate) {
        throw new Error(
          `Invalid month value at player index ${playerIndex}, month index ${monthIndex}: ${monthEntry.month}`
        );
      }

      const attacks = monthEntry.attacks
        .filter((attack): attack is string => typeof attack === "string")
        .map((attack) => attack.trim().toUpperCase())
        .filter((attack) => attack.length > 0);

      return {
        player_tag: normalizeTag(player.playerTag as string),
        player_name: (player.playerName as string).trim(),
        month_label: monthEntry.month.trim(),
        month_date: monthDate,
        roster_th: monthEntry.rosterTh.trim(),
        clan_name: monthEntry.clanName.trim(),
        clan_badge:
          isString(monthEntry.clanBadge) && monthEntry.clanBadge.trim()
            ? monthEntry.clanBadge.trim()
            : null,
        attacks,
        totals: monthEntry.totals.trim(),
        updated_at: new Date().toISOString()
      };
    });
  });

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("cwl_monthly_history")
      .upsert(rows, { onConflict: "player_tag,month_label" });

    if (error) {
      const isMissingTable =
        error.code === "42P01" ||
        error.code === "PGRST205" ||
        /could not find the table/i.test(error.message ?? "");
      const isMissingConstraint =
        error.code === "42P10" ||
        /no unique or exclusion constraint matching the on conflict specification/i.test(
          error.message ?? ""
        );

      if (isMissingTable || isMissingConstraint) {
        return NextResponse.json(
          {
            error:
              "Missing `cwl_monthly_history` table or unique constraint on (player_tag, month_label).",
            sql: createTableSql,
            code: error.code ?? null,
            details: error.details ?? null,
            hint: error.hint ?? null
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: error.message || "Supabase rejected the CWL upsert request.",
          code: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      saved: rows.length,
      players: players.length
    });
  } catch (error) {
    if (isSupabaseWriteError(error)) {
      return NextResponse.json(
        {
          error: error.message || "Supabase write failed.",
          code: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save CWL history."
      },
      { status: 500 }
    );
  }
}
