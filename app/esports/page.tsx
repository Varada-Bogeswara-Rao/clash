import React from "react";

type PlayerStats = {
  name: string;
  offStars: number;
  offPercent: number;
  defStars: number;
  defPercent: number;
};

type MatchRecord = {
  opponent: string;
  result: "Won" | "Lost" | "Draw";
  offenseStars: number;
  defenseStars: number;
  offensePercent: number;
  defensePercent: number;
  players: PlayerStats[];
};

const ALL_PLAYERS = [
  "BAX⚡<V.A.B 15>™",
  "J@Y",
  "⚡Vulfric⚡",
  "Bunny",
  "King Ibrahim",
  "LA⚡3li 7ijazi",
  "SUPREME",
  "Thanus",
  "DW KING BOLTE",
  "kronos",
  "T.A✨Peanut"
];

// The freshly parsed data encompassing all 11 players across all 6 matches
const matches: MatchRecord[] = [
  {
    "opponent": "DoD Esports",
    "result": "Lost",
    "offenseStars": 10,
    "defenseStars": 11,
    "offensePercent": 79,
    "defensePercent": 86.2,
    "players": [
      { "name": "BAX⚡<V.A.B 15>™", "offStars": 2, "offPercent": 69, "defStars": 2, "defPercent": 78 },
      { "name": "J@Y", "offStars": 2, "offPercent": 85, "defStars": 3, "defPercent": 100 },
      { "name": "⚡Vulfric⚡", "offStars": 2, "offPercent": 81, "defStars": 2, "defPercent": 78 },
      { "name": "LA⚡3li 7ijazi", "offStars": 2, "offPercent": 77, "defStars": 2, "defPercent": 87 },
      { "name": "SUPREME", "offStars": 2, "offPercent": 83, "defStars": 2, "defPercent": 88 }
    ]
  },
  {
    "opponent": "TOP Esports",
    "result": "Won",
    "offenseStars": 11,
    "defenseStars": 10,
    "offensePercent": 79.4,
    "defensePercent": 80.6,
    "players": [
      { "name": "J@Y", "offStars": 2, "offPercent": 61, "defStars": 2, "defPercent": 65 },
      { "name": "⚡Vulfric⚡", "offStars": 2, "offPercent": 77, "defStars": 3, "defPercent": 100 },
      { "name": "Bunny", "offStars": 2, "offPercent": 79, "defStars": 2, "defPercent": 86 },
      { "name": "King Ibrahim", "offStars": 2, "offPercent": 80, "defStars": 1, "defPercent": 80 },
      { "name": "LA⚡3li 7ijazi", "offStars": 3, "offPercent": 100, "defStars": 2, "defPercent": 72 }
    ]
  },
  {
    "opponent": "xpert champions",
    "result": "Won",
    "offenseStars": 10,
    "defenseStars": 10,
    "offensePercent": 83.2,
    "defensePercent": 81.8,
    "players": [
      { "name": "BAX⚡<V.A.B 15>™", "offStars": 2, "offPercent": 69, "defStars": 2, "defPercent": 97 },
      { "name": "J@Y", "offStars": 2, "offPercent": 89, "defStars": 2, "defPercent": 82 },
      { "name": "Bunny", "offStars": 2, "offPercent": 78, "defStars": 2, "defPercent": 74 },
      { "name": "LA⚡3li 7ijazi", "offStars": 2, "offPercent": 85, "defStars": 2, "defPercent": 82 },
      { "name": "SUPREME", "offStars": 2, "offPercent": 95, "defStars": 2, "defPercent": 74 }
    ]
  },
  {
    "opponent": "VND E-SPORTS",
    "result": "Lost",
    "offenseStars": 9,
    "defenseStars": 10,
    "offensePercent": 77.8,
    "defensePercent": 71.4,
    "players": [
      { "name": "BAX⚡<V.A.B 15>™", "offStars": 1, "offPercent": 86, "defStars": 2, "defPercent": 69 },
      { "name": "J@Y", "offStars": 2, "offPercent": 85, "defStars": 2, "defPercent": 78 },
      { "name": "Bunny", "offStars": 2, "offPercent": 65, "defStars": 2, "defPercent": 72 },
      { "name": "LA⚡3li 7ijazi", "offStars": 2, "offPercent": 90, "defStars": 2, "defPercent": 69 },
      { "name": "SUPREME", "offStars": 2, "offPercent": 63, "defStars": 2, "defPercent": 69 }
    ]
  },
  {
    "opponent": "hst - E-Sport",
    "result": "Lost",
    "offenseStars": 10,
    "defenseStars": 11,
    "offensePercent": 78,
    "defensePercent": 87.6,
    "players": [
      { "name": "BAX⚡<V.A.B 15>™", "offStars": 2, "offPercent": 72, "defStars": 2, "defPercent": 83 },
      { "name": "⚡Vulfric⚡", "offStars": 2, "offPercent": 85, "defStars": 2, "defPercent": 98 },
      { "name": "King Ibrahim", "offStars": 2, "offPercent": 77, "defStars": 3, "defPercent": 100 },
      { "name": "LA⚡3li 7ijazi", "offStars": 2, "offPercent": 80, "defStars": 2, "defPercent": 79 },
      { "name": "SUPREME", "offStars": 2, "offPercent": 76, "defStars": 2, "defPercent": 78 }
    ]
  },
  {
    "opponent": "Golden Warriors",
    "result": "Won",
    "offenseStars": 8,
    "defenseStars": 8,
    "offensePercent": 65.8,
    "defensePercent": 67.4,
    "players": [
      { "name": "J@Y", "offStars": 2, "offPercent": 72, "defStars": 2, "defPercent": 77 },
      { "name": "Bunny", "offStars": 2, "offPercent": 88, "defStars": 2, "defPercent": 78 },
      { "name": "LA⚡3li 7ijazi", "offStars": 2, "offPercent": 90, "defStars": 2, "defPercent": 94 },
      { "name": "Thanus", "offStars": 2, "offPercent": 79, "defStars": 2, "defPercent": 88 },
      { "name": "DW KING BOLTE", "offStars": 2, "offPercent": 87, "defStars": 0, "defPercent": 0 }
    ]
  },
  {
    "opponent": "blue whales",
    "result": "Won",
    "offenseStars": 10,
    "defenseStars": 10,
    "offensePercent": 0,
    "defensePercent": 0,
    "players": [
      { "name": "J@Y", "offStars": 2, "offPercent": 83, "defStars": 2, "defPercent": 62 },
      { "name": "Bunny", "offStars": 2, "offPercent": 91, "defStars": 2, "defPercent": 75 },
      { "name": "LA⚡3li 7ijazi", "offStars": 1, "offPercent": 69, "defStars": 2, "defPercent": 68 },
      { "name": "SUPREME", "offStars": 3, "offPercent": 100, "defStars": 2, "defPercent": 98 },
      { "name": "DW KING BOLTE", "offStars": 2, "offPercent": 78, "defStars": 2, "defPercent": 74 }
    ]
  },
  {
    "opponent": "blue whales",
    "result": "Lost",
    "offenseStars": 10,
    "defenseStars": 11,
    "offensePercent": 0,
    "defensePercent": 0,
    "players": [
      { "name": "BAX⚡<V.A.B 15>™", "offStars": 2, "offPercent": 89, "defStars": 2, "defPercent": 94 },
      { "name": "Bunny", "offStars": 2, "offPercent": 77, "defStars": 3, "defPercent": 100 },
      { "name": "LA⚡3li 7ijazi", "offStars": 2, "offPercent": 59, "defStars": 2, "defPercent": 71 },
      { "name": "SUPREME", "offStars": 2, "offPercent": 91, "defStars": 2, "defPercent": 75 },
      { "name": "kronos", "offStars": 2, "offPercent": 63, "defStars": 2, "defPercent": 88 }
    ]
  },
  {
    "opponent": "FF esports",
    "result": "Lost",
    "offenseStars": 9,
    "defenseStars": 11,
    "offensePercent": 0,
    "defensePercent": 0,
    "players": [
      { "name": "J@Y", "offStars": 2, "offPercent": 70, "defStars": 2, "defPercent": 64 },
      { "name": "⚡Vulfric⚡", "offStars": 2, "offPercent": 69, "defStars": 2, "defPercent": 77 },
      { "name": "LA⚡3li 7ijazi", "offStars": 2, "offPercent": 89, "defStars": 2, "defPercent": 83 },
      { "name": "SUPREME", "offStars": 1, "offPercent": 76, "defStars": 2, "defPercent": 75 },
      { "name": "T.A✨Peanut", "offStars": 2, "offPercent": 99, "defStars": 3, "defPercent": 100 }
    ]
  },
  {
    "opponent": "spark assassin",
    "result": "Lost",
    "offenseStars": 9,
    "defenseStars": 10,
    "offensePercent": 0,
    "defensePercent": 0,
    "players": [
      { "name": "J@Y", "offStars": 2, "offPercent": 85, "defStars": 2, "defPercent": 79 },
      { "name": "⚡Vulfric⚡", "offStars": 1, "offPercent": 54, "defStars": 3, "defPercent": 100 },
      { "name": "LA⚡3li 7ijazi", "offStars": 2, "offPercent": 75, "defStars": 2, "defPercent": 89 },
      { "name": "SUPREME", "offStars": 2, "offPercent": 80, "defStars": 2, "defPercent": 87 },
      { "name": "T.A✨Peanut", "offStars": 2, "offPercent": 78, "defStars": 1, "defPercent": 89 }
    ]
  }
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

        <div className="space-y-8">
          {matches.map((match, i) => {
            const bgColor =
              match.result === "Won"
                ? "bg-[#8E9B88]/20 text-[#8E9B88]" // sage
                : match.result === "Lost"
                ? "bg-[#8E6A62]/20 text-[#8E6A62]" // brick
                : "bg-black/10 text-ink/70";

            return (
              <article
                key={i}
                className="section-frame bg-parchment flex flex-col p-4 sm:p-6 transition-colors shadow-sm"
              >
                {/* Clan vs Clan Top Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-black/5">
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

                {/* All 11 Players Sub-Table */}
                <div className="mt-2 pt-2">
                  <p className="data-label mb-3 mt-2 px-1">Roster Performance</p>
                  <div className="overflow-x-auto rounded-xl border border-black/5 bg-paper">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <tbody className="divide-y divide-black/5">
                        {match.players.length > 0 ? (
                          match.players.map((stats) => (
                            <tr key={stats.name} className="hover:bg-black/[0.02] transition-colors">
                              <td className="py-2.5 px-4 font-body text-ink font-medium w-1/3 border-r border-black/5">
                                {stats.name}
                              </td>
                              <td className="py-2.5 px-4 font-body text-ink">
                                <span className="text-[11px] text-ink/50 uppercase tracking-widest mr-2 inline-block w-8">Off</span>
                                {stats.offStars}⭐ 
                                <span className="text-[10px] text-ink/60 bg-black/5 px-1.5 py-0.5 rounded ml-1.5">{stats.offPercent}%</span>
                              </td>
                              <td className="py-2.5 px-4 font-body text-ink border-l border-black/5">
                                <span className="text-[11px] text-ink/50 uppercase tracking-widest mr-2 inline-block w-8">Def</span>
                                {stats.defStars}⭐ 
                                <span className="text-[10px] text-ink/60 bg-black/5 px-1.5 py-0.5 rounded ml-1.5">{stats.defPercent}%</span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="py-4 px-4 font-body text-ink/50 text-sm text-center italic">
                              No participant data available for this match.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
