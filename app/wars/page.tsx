import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  WarsLedgerClient,
  type WarArchiveRow,
  type WarAttackRow
} from "@/app/wars/wars-ledger-client";

export const dynamic = "force-dynamic";

function extractErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const shaped = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
    };

    const message = typeof shaped.message === "string" ? shaped.message : null;
    const code = typeof shaped.code === "string" ? shaped.code : null;
    const details = typeof shaped.details === "string" ? shaped.details : null;
    const hint = typeof shaped.hint === "string" ? shaped.hint : null;
    const segments = [message, details, hint].filter((part): part is string => Boolean(part));

    if (segments.length > 0) {
      return code ? `[${code}] ${segments.join(" | ")}` : segments.join(" | ");
    }
  }

  return "Failed to load war archives from Supabase.";
}

function groupAttacksByWar(rows: WarAttackRow[]) {
  const grouped: Record<string, WarAttackRow[]> = {};

  for (const row of rows) {
    if (!grouped[row.war_id]) {
      grouped[row.war_id] = [];
    }

    grouped[row.war_id].push(row);
  }

  return grouped;
}

export default async function WarsPage() {
  let wars: WarArchiveRow[] = [];
  let attacksByWar: Record<string, WarAttackRow[]> = {};
  let errorMessage: string | null = null;

  try {
    const supabase = getSupabaseAdmin();
    const { data: warRows, error: warsError } = await supabase
      .from("war_archives")
      .select(
        "id, clan_tag, opponent_name, state, team_size, our_stars, our_destruction, enemy_stars, enemy_destruction, end_time"
      )
      .order("end_time", { ascending: false });

    if (warsError) {
      throw warsError;
    }

    wars = (warRows ?? []) as WarArchiveRow[];
    const warIds = wars.map((war) => war.id);

    if (warIds.length > 0) {
      const { data: attackRows, error: attacksError } = await supabase
        .from("war_attacks")
        .select(
          "id, war_id, attacker_tag, attacker_name, defender_tag, stars, destruction_percentage, attack_order"
        )
        .in("war_id", warIds);

      if (attacksError) {
        throw attacksError;
      }

      attacksByWar = groupAttacksByWar((attackRows ?? []) as WarAttackRow[]);
    }
  } catch (error) {
    errorMessage = extractErrorMessage(error);
  }

  return (
    <div className="space-y-10">
      <section className="section-frame space-y-5 px-4 py-7 sm:px-6 md:px-8 md:py-10">
        <p className="eyebrow">War Archive</p>
        <h1 className="font-serif-display text-4xl leading-[0.98] tracking-tight text-ink sm:text-5xl md:text-7xl">
          The War Ledger
        </h1>
        <p className="max-w-3xl text-base leading-7 text-ink/66 sm:text-lg sm:leading-8">
          Permanent archival for ended wars, preserving final scores and detailed
          attack timelines before live war data rotates.
        </p>
      </section>

      {errorMessage ? (
        <section className="section-frame border-brick/20 px-4 py-6 text-brick sm:px-6">
          <p className="data-label text-brick/80">Data Source Error</p>
          <p className="mt-3 text-base leading-7">{errorMessage}</p>
          <p className="mt-3 text-sm leading-6 text-brick/85">
            Ensure `war_archives` and `war_attacks` tables exist in Supabase with
            the required columns and foreign key.
          </p>
        </section>
      ) : (
        <WarsLedgerClient wars={wars} attacksByWar={attacksByWar} />
      )}
    </div>
  );
}


