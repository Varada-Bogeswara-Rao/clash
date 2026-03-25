import { ArrowUpRight, ShieldCheck } from "lucide-react";

import { OverviewTable } from "@/components/overview-table";
import { getDashboardData } from "@/lib/dashboard";

const lastUpdatedFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long"
});

export default async function HomePage() {
  const data = await getDashboardData(14);
  const lastUpdated = data.rows[0]?.date
    ? lastUpdatedFormatter.format(new Date(`${data.rows[0].date}T00:00:00`))
    : "Awaiting first sync";

  return (
    <div className="space-y-10">
      <section className="section-frame grid gap-10 px-6 py-8 md:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)] md:px-8 md:py-10">
        <div className="space-y-6">
          <p className="eyebrow">Overview</p>
          <div className="space-y-4">
            <h1 className="max-w-4xl font-serif-display text-5xl leading-[0.94] tracking-tight text-ink md:text-7xl">
              A quieter way to track who stayed, shifted, or vanished from the clan
              ledger.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-ink/68">
              This dashboard records daily clan membership snapshots from the Clash
              of Clans API, stores them in Supabase, and presents the history as a
              restrained editorial ledger.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-ink/60">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-2">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.7} />
              Server-side Supabase reads
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-2">
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.7} />
              Last snapshot {lastUpdated}
            </span>
          </div>
        </div>

        <div className="grid gap-4 self-start">
          <article className="rounded-[24px] border border-black/10 bg-paper px-5 py-5">
            <p className="data-label">Total Players Tracked</p>
            <p className="mt-5 font-serif-display text-6xl leading-none text-ink">
              {data.totalPlayers}
            </p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-ink/62">
              Pulled from the `tracked_players` table and rendered as the current
              monitoring roster.
            </p>
          </article>

          <article className="rounded-[24px] border border-black/10 bg-paper px-5 py-5">
            <p className="data-label">Active Clans</p>
            <p className="mt-5 font-serif-display text-6xl leading-none text-ink">
              {data.activeClans}
            </p>
            <p className="mt-4 max-w-xs text-sm leading-6 text-ink/62">
              Counted from each tracked player&apos;s most recent stored snapshot.
            </p>
          </article>
        </div>
      </section>

      {data.error ? (
        <section className="section-frame border-brick/20 px-6 py-5 text-brick">
          <p className="data-label text-brick/80">Data Connection</p>
          <p className="mt-3 text-lg leading-7">
            {data.error}. Add the required environment variables and ensure the
            Supabase tables exist before loading live data.
          </p>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="eyebrow">The Ledger</p>
            <h2 className="font-serif-display text-4xl tracking-tight text-ink">
              Recent player history
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-ink/62">
            Daily entries from `player_history`, joined with `tracked_players` to
            keep the roster readable.
          </p>
        </div>

        <OverviewTable
          rows={data.rows}
          emptyMessage="Run the daily fetch route once records begin collecting."
        />
      </section>
    </div>
  );
}

