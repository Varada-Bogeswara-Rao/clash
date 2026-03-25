import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type ClashWarAttack = {
  attackerTag?: string;
  defenderTag?: string;
  stars?: number;
  destructionPercentage?: number;
  order?: number;
};

type ClashWarMember = {
  tag?: string;
  name?: string;
  mapPosition?: number;
  attacks?: ClashWarAttack[] | null;
};

type ClashWarSide = {
  tag?: string;
  name?: string;
  stars?: number;
  destructionPercentage?: number;
  members?: ClashWarMember[] | null;
};

type ClashWarPayload = {
  state?: string;
  teamSize?: number;
  endTime?: string;
  clan?: ClashWarSide | null;
  opponent?: ClashWarSide | null;
};

type ClanArchiveResult = {
  clanTag: string;
  status: "archived" | "skipped" | "error";
  message: string;
  warId?: string;
  attacksSaved?: number;
  endTime?: string;
};

type ErrorShape = {
  message?: unknown;
  code?: unknown;
  details?: unknown;
  hint?: unknown;
};

const DEFAULT_WAR_CLAN_TAGS = ["#UL22U09R"];

const createTablesSql = `create extension if not exists pgcrypto;

create table if not exists public.war_archives (
  id uuid primary key default gen_random_uuid(),
  clan_tag text not null,
  opponent_name text not null,
  state text not null,
  team_size int not null,
  our_stars int not null,
  our_destruction double precision not null,
  enemy_stars int not null,
  enemy_destruction double precision not null,
  end_time timestamptz not null,
  unique (clan_tag, end_time)
);

create table if not exists public.war_attacks (
  id uuid primary key default gen_random_uuid(),
  war_id uuid not null references public.war_archives(id) on delete cascade,
  attacker_tag text not null,
  attacker_name text not null,
  defender_tag text not null,
  stars int not null,
  destruction_percentage double precision not null,
  attack_order int not null
);`;

function normalizeTag(tag: string) {
  const trimmed = tag.trim().toUpperCase();
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function parseClashTimestamp(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(?:\.(\d{3}))?Z$/
  );

  if (match) {
    const [, year, month, day, hour, minute, second, ms] = match;
    const millisecond = ms ?? "000";
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.${millisecond}Z`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function toFiniteNumber(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toFiniteInt(value: unknown, fallback = 0) {
  const numeric = Number.parseInt(String(value), 10);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function asErrorShape(error: unknown): ErrorShape {
  if (!error || typeof error !== "object") {
    return {};
  }

  return error as ErrorShape;
}

function formatError(prefix: string, error: unknown) {
  const shaped = asErrorShape(error);
  const message = typeof shaped.message === "string" ? shaped.message : "Unknown error";
  const code = typeof shaped.code === "string" ? shaped.code : null;
  return code ? `${prefix} (${code}): ${message}` : `${prefix}: ${message}`;
}

function buildClanTagList() {
  const targetClanTag = process.env.NEXT_PUBLIC_TARGET_CLAN_TAG?.trim() ?? "";
  const envListRaw = process.env.WAR_LEDGER_CLAN_TAGS?.trim() ?? "";
  const envList = envListRaw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const combined = [targetClanTag, ...DEFAULT_WAR_CLAN_TAGS, ...envList].filter(
    (tag) => tag.length > 0
  );

  return Array.from(new Set(combined.map((tag) => normalizeTag(tag))));
}

export async function POST() {
  const clashApiKey = process.env.CLASH_API_KEY;
  const clanTags = buildClanTagList();

  if (clanTags.length === 0) {
    return NextResponse.json(
      {
        error:
          "No clan tags configured. Set NEXT_PUBLIC_TARGET_CLAN_TAG or WAR_LEDGER_CLAN_TAGS."
      },
      { status: 500 }
    );
  }

  if (!clashApiKey) {
    return NextResponse.json(
      { error: "CLASH_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const supabase = getSupabaseAdmin();
  const results: ClanArchiveResult[] = [];

  try {
    for (const clanTag of clanTags) {
      const encodedClanTag = encodeURIComponent(clanTag);
      const response = await fetch(
        `https://api.clashofclans.com/v1/clans/${encodedClanTag}/currentwar`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${clashApiKey}`,
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );

      const rawBody = await response.text();
      let payload: ClashWarPayload;

      try {
        payload = JSON.parse(rawBody) as ClashWarPayload;
      } catch {
        results.push({
          clanTag,
          status: "error",
          message: "Supercell returned a non-JSON payload."
        });
        continue;
      }

      if (!response.ok) {
        results.push({
          clanTag,
          status: "error",
          message: `Failed to fetch current war (HTTP ${response.status}).`
        });
        continue;
      }

      if (payload.state !== "warEnded") {
        results.push({
          clanTag,
          status: "skipped",
          message: "War has not ended yet, or data is unavailable."
        });
        continue;
      }

      const endTime = parseClashTimestamp(payload.endTime);
      if (!endTime) {
        results.push({
          clanTag,
          status: "error",
          message: "Supercell response is missing a valid endTime."
        });
        continue;
      }

      const archiveRow = {
        clan_tag: normalizeTag(payload.clan?.tag || clanTag),
        opponent_name: payload.opponent?.name?.trim() || "Unknown Opponent",
        state: payload.state,
        team_size: toFiniteInt(payload.teamSize, 0),
        our_stars: toFiniteInt(payload.clan?.stars, 0),
        our_destruction: toFiniteNumber(payload.clan?.destructionPercentage, 0),
        enemy_stars: toFiniteInt(payload.opponent?.stars, 0),
        enemy_destruction: toFiniteNumber(payload.opponent?.destructionPercentage, 0),
        end_time: endTime
      };

      const { data: upsertedWarRows, error: warError } = await supabase
        .from("war_archives")
        .upsert([archiveRow], { onConflict: "clan_tag,end_time" })
        .select("id")
        .limit(1);

      if (warError) {
        const isMissingConstraint =
          warError.code === "42P10" ||
          /no unique or exclusion constraint matching the on conflict specification/i.test(
            warError.message ?? ""
          );
        const isMissingTable =
          warError.code === "42P01" ||
          warError.code === "PGRST205" ||
          /could not find the table/i.test(warError.message ?? "");

        if (isMissingConstraint || isMissingTable) {
          return NextResponse.json(
            {
              error:
                "Missing `war_archives`/`war_attacks` schema or unique constraint on `war_archives(clan_tag, end_time)`.",
              sql: createTablesSql,
              code: warError.code ?? null,
              details: warError.details ?? null,
              hint: warError.hint ?? null
            },
            { status: 400 }
          );
        }

        results.push({
          clanTag,
          status: "error",
          message: formatError("Supabase war archive upsert failed", warError)
        });
        continue;
      }

      const warId = upsertedWarRows?.[0]?.id;
      if (!warId) {
        results.push({
          clanTag,
          status: "error",
          message: "War archive upsert succeeded but did not return a war id."
        });
        continue;
      }

      const defenderPositionByTag = new Map<string, number>();
      for (const defender of payload.opponent?.members ?? []) {
        const defenderTag = defender.tag ? normalizeTag(defender.tag) : "";
        if (!defenderTag) {
          continue;
        }

        const mapPosition = toFiniteInt(defender.mapPosition, 0);
        if (mapPosition > 0) {
          defenderPositionByTag.set(defenderTag, mapPosition);
        }
      }

      const attacks = (payload.clan?.members ?? [])
        .flatMap((member) => {
          const attackerTag = member.tag ? normalizeTag(member.tag) : null;
          const attackerName = member.name?.trim() || "Unknown";

          if (!attackerTag) {
            return [];
          }

          return (member.attacks ?? []).map((attack) => {
            const defenderTag = normalizeTag(attack.defenderTag ?? "");
            const defenderMapPosition = defenderPositionByTag.get(defenderTag);
            const defenderCellValue =
              defenderMapPosition && defenderMapPosition > 0
                ? `#${defenderMapPosition} / ${defenderTag}`
                : defenderTag;

            return {
              war_id: warId,
              attacker_tag: attackerTag,
              attacker_name: attackerName,
              defender_tag: defenderCellValue,
              stars: toFiniteInt(attack.stars, 0),
              destruction_percentage: toFiniteNumber(attack.destructionPercentage, 0),
              attack_order: toFiniteInt(attack.order, 0)
            };
          });
        })
        .filter((attack) => attack.defender_tag !== "#")
        .sort((a, b) => a.attack_order - b.attack_order);

      const { error: deleteError } = await supabase
        .from("war_attacks")
        .delete()
        .eq("war_id", warId);

      if (deleteError) {
        results.push({
          clanTag,
          status: "error",
          message: formatError("Supabase war attack cleanup failed", deleteError),
          warId,
          endTime
        });
        continue;
      }

      if (attacks.length > 0) {
        const { error: insertAttacksError } = await supabase
          .from("war_attacks")
          .insert(attacks);

        if (insertAttacksError) {
          results.push({
            clanTag,
            status: "error",
            message: formatError("Supabase war attacks insert failed", insertAttacksError),
            warId,
            endTime
          });
          continue;
        }
      }

      results.push({
        clanTag,
        status: "archived",
        message: "Archived latest ended war.",
        warId,
        attacksSaved: attacks.length,
        endTime
      });
    }

    const archivedCount = results.filter((entry) => entry.status === "archived").length;
    const skippedCount = results.filter((entry) => entry.status === "skipped").length;
    const errorCount = results.filter((entry) => entry.status === "error").length;

    if (archivedCount === 0) {
      const firstErrorMessage =
        results.find((entry) => entry.status === "error")?.message ?? null;
      const summaryError =
        errorCount > 0
          ? `No wars archived. ${errorCount} clan(s) failed.`
          : "No configured clans have a finished war to archive right now.";

      return NextResponse.json(
        {
          error: firstErrorMessage
            ? `${summaryError} ${firstErrorMessage}`
            : summaryError,
          archivedCount,
          skippedCount,
          errorCount,
          clanTags,
          results
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      archivedCount,
      skippedCount,
      errorCount,
      clanTags,
      results
    });
  } catch (error) {
    const shaped = asErrorShape(error);

    return NextResponse.json(
      {
        error: formatError("Failed to archive wars for configured clans", error),
        code: typeof shaped.code === "string" ? shaped.code : null,
        details: typeof shaped.details === "string" ? shaped.details : null,
        hint: typeof shaped.hint === "string" ? shaped.hint : null
      },
      { status: 500 }
    );
  }
}


