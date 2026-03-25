import { CwlDatabaseClient } from "@/app/cwl-database/cwl-database-client";
import { groupCwlHistoryRows, type CwlHistoryRow } from "@/lib/cwl-database";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function CwlDatabasePage() {
  let rows: CwlHistoryRow[] = [];
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
        rows = (data ?? []) as CwlHistoryRow[];
        sourceTable = tableName;
        lastError = null;
        break;
      }

      const isMissingTable =
        error.code === "PGRST205" ||
        error.code === "42P01" ||
        /could not find the table/i.test(error.message ?? "");

      if (isMissingTable) {
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
        : "Failed to load CWL history from Supabase.";
  }

  const { players, leagues } = groupCwlHistoryRows(rows);

  return (
    <div className="space-y-10">
      <section className="section-frame space-y-5 px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">CWL Directory</p>
        <h1 className="font-serif-display text-5xl leading-[0.94] tracking-tight text-ink md:text-7xl">
          CWL Player Database
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-ink/66">
          Master roster view grouped by player, with latest league filtering and
          expandable monthly timelines.
        </p>
        {sourceTable ? (
          <p className="text-xs uppercase tracking-[0.2em] text-ink/45">
            Source table: {sourceTable}
          </p>
        ) : null}
      </section>

      {errorMessage ? (
        <section className="section-frame border-brick/20 px-6 py-6 text-brick">
          <p className="data-label text-brick/80">Data Source Error</p>
          <p className="mt-3 text-base leading-7">{errorMessage}</p>
          <p className="mt-3 text-sm leading-6 text-brick/85">
            Ensure either `cwl_history` or `cwl_monthly_history` exists and contains rows in Supabase.
          </p>
        </section>
      ) : (
        <CwlDatabaseClient players={players} leagues={leagues} />
      )}
    </div>
  );
}
