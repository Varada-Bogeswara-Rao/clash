import React from "react";

type MatchRecord = {
  opponent: string;
  result: "Won" | "Lost" | "Draw";
  offenseStars: number;
  defenseStars: number;
  offensePercent: number;
  defensePercent: number;
};

const matches: MatchRecord[] = [
  {
    opponent: "DoD Esports",
    result: "Lost",
    offenseStars: 10,
    defenseStars: 11,
    offensePercent: 79,
    defensePercent: 86.2,
  },
  {
    opponent: "TOP Esports",
    result: "Won",
    offenseStars: 11,
    defenseStars: 10,
    offensePercent: 79.4,
    defensePercent: 80.6,
  },
  {
    opponent: "xpert champions",
    result: "Won",
    offenseStars: 10,
    defenseStars: 10,
    offensePercent: 83.2,
    defensePercent: 81.8,
  },
  {
    opponent: "VND E-SPORTS",
    result: "Lost",
    offenseStars: 9,
    defenseStars: 10,
    offensePercent: 77.8,
    defensePercent: 71.4,
  },
  {
    opponent: "hst - E-Sport",
    result: "Lost",
    offenseStars: 10,
    defenseStars: 11,
    offensePercent: 78,
    defensePercent: 87.6,
  },
  {
    opponent: "Golden Warriors",
    result: "Won",
    offenseStars: 8,
    defenseStars: 8,
    offensePercent: 65.8,
    defensePercent: 67.4,
  },
];

export default function EsportsPage() {
  return (
    <div className="space-y-10">
      <section className="section-frame grid gap-10 px-4 py-7 sm:px-6 md:px-8 md:py-10">
        <div className="space-y-6">
          <p className="eyebrow">Esports Division</p>
          <div className="space-y-4">
            <h1 className="max-w-4xl font-serif-display text-4xl leading-[0.98] tracking-tight text-ink sm:text-5xl md:text-7xl">
              Competitive Match Log
            </h1>
            <p className="max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-ink/68 font-body">
              A comprehensive ledger matching our offensive capabilities strictly against opposing clan defenses, meticulously grouped by war.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="eyebrow">The Ledger</p>
            <h2 className="font-serif-display text-4xl tracking-tight text-ink">
              Division Records
            </h2>
          </div>
        </div>

        <div className="section-frame overflow-hidden bg-parchment">
          <div className="divide-y divide-black/5">
            {matches.map((match, i) => {
              // using the exact tailwind colors defined in your config (sage vs brick)
              const bgColor =
                match.result === "Won"
                  ? "bg-sage/20 text-sage"
                  : match.result === "Lost"
                  ? "bg-brick/20 text-brick"
                  : "bg-black/10 text-ink/70";

              return (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 hover:bg-black/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4 w-full sm:w-1/2 mb-4 sm:mb-0">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${bgColor}`}
                    >
                      {match.result}
                    </span>
                    <h3 className="font-serif-display text-2xl text-ink pt-1 truncate">
                      {match.opponent}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between sm:w-1/2">
                    <div className="flex flex-col items-center flex-1">
                      <p className="data-label text-ink/50 text-[10px]">Offense</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="font-body text-xl text-ink leading-none">
                          {match.offenseStars}⭐
                        </span>
                        <span className="text-xs text-ink/60 bg-black/5 px-2 py-0.5 rounded-full font-body">
                          {match.offensePercent}%
                        </span>
                      </div>
                    </div>

                    <div className="hidden sm:block h-8 w-[1px] bg-black/5 mx-2"></div>

                    <div className="flex flex-col items-center flex-1">
                      <p className="data-label text-ink/50 text-[10px]">Defense</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="font-body text-xl text-ink leading-none">
                          {match.defenseStars}⭐
                        </span>
                        <span className="text-xs text-ink/60 bg-black/5 px-2 py-0.5 rounded-full font-body">
                          {match.defensePercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
