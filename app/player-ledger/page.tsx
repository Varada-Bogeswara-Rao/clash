import { OverviewTable } from "@/components/overview-table";
import { getDashboardData } from "@/lib/dashboard";

export default async function PlayerLedgerPage() {
  const data = await getDashboardData(48);
  const latestRows = data.rows.filter((row) => row.isLatest);
  const activePlayers = latestRows.filter((row) => row.clanTag).length;
  const unaffiliatedPlayers = latestRows.filter((row) => !row.clanTag).length;

  return (
    <div className="space-y-10">
      <section className="section-frame grid gap-8 px-4 py-7 sm:px-6 md:grid-cols-[minmax(0,1.25fr)_repeat(2,minmax(0,0.6fr))] md:px-8">
        <div className="space-y-3">
          <p className="eyebrow">Player Ledger</p>
          <h1 className="font-serif-display text-4xl leading-[0.98] tracking-tight text-ink sm:text-5xl">
            A longer look at daily clan affiliation changes.
          </h1>
          <p className="max-w-2xl text-base leading-7 text-ink/66 sm:text-lg sm:leading-8">
            This view stretches the same history feed into a deeper roster log so
            member movement is easier to scan over time.
          </p>
        </div>

        <article className="rounded-[24px] border border-black/10 bg-paper px-5 py-5">
          <p className="data-label">Affiliated Now</p>
          <p className="mt-5 font-serif-display text-5xl leading-none sm:text-6xl">{activePlayers}</p>
        </article>

        <article className="rounded-[24px] border border-black/10 bg-paper px-5 py-5">
          <p className="data-label">Unaffiliated Now</p>
          <p className="mt-5 font-serif-display text-5xl leading-none sm:text-6xl">
            {unaffiliatedPlayers}
          </p>
        </article>
      </section>

      {data.error ? (
        <section className="section-frame border-brick/20 px-4 py-5 text-brick sm:px-6">
          <p>{data.error}</p>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="space-y-2">
          <p className="eyebrow">History Table</p>
          <h2 className="font-serif-display text-4xl tracking-tight text-ink">
            Stored roster snapshots
          </h2>
        </div>

        <OverviewTable
          rows={data.rows}
          emptyMessage="The ledger will populate after the first successful cron run."
        />
      </section>
    </div>
  );
}


