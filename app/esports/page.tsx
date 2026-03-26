import React from "react";

export const revalidate = 60;

// TODO: Replace with the actual Google Sheet CSV URL provided by the user
const CSV_URL = process.env.ESPORTS_CSV_URL || "";

type PlayerPerformance = {
  name: string;
  offStars: string;
  offPercent: string;
  defStars: string;
  defPercent: string;
};

type WarRecord = {
  opponent: string;
  offenseStars: string;
  defenseStars: string;
  players: PlayerPerformance[];
};

/**
 * Utility function to parse the specific wide-format CSV into an array of WarRecords.
 * Columns:
 * A: [Misc]
 * B: Opponent Clan (1)
 * C: Total Offense Stars (2)
 * D: Total Defense Stars (3)
 * E (4): User Name, F (5): Off Stars, G (6): Off %, H (7): Def Stars, I (8): Def %
 * J (9): User Name... (repeats every 5 cols)
 */
function parseEsportsCSV(text: string): WarRecord[] {
  const lines = text.trim().split("\n").filter((line) => line.trim() !== "");
  if (lines.length <= 1) return [];

  const parseLine = (line: string) => {
    const values: string[] = [];
    let currentValue = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        values.push(currentValue);
        currentValue = "";
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue);
    return values.map((val) => val.trim());
  };

  const wars: WarRecord[] = [];

  // Start from line 1 assuming line 0 contains headers (Opponent, Stars, etc.)
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (!values[1]) continue; // Skip if no Opponent Clan is listed

    const war: WarRecord = {
      opponent: values[1],
      offenseStars: values[2] || "0",
      defenseStars: values[3] || "0",
      players: [],
    };

    // Parse every 5 columns for player performances starting at index 4 (Column E)
    for (let c = 4; c < values.length; c += 5) {
      const name = values[c];
      if (!name || name.trim() === "") break;

      war.players.push({
        name,
        offStars: values[c + 1] || "0",
        offPercent: values[c + 2] || "0",
        defStars: values[c + 3] || "0",
        defPercent: values[c + 4] || "0",
      });
    }

    wars.push(war);
  }

  // Reverse so newest records (assuming bottom of CSV) show first, if preferable
  return wars.reverse();
}

function getGoogleSheetCsvUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    
    // If it's a published html link, convert to csv output
    if (url.pathname.endsWith('/pubhtml')) {
      url.pathname = url.pathname.replace('/pubhtml', '/pub');
      url.searchParams.set('output', 'csv');
      return url.toString();
    }
    
    // If it's an edit link, convert to direct export
    const match = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && !url.pathname.endsWith('/export') && !url.pathname.endsWith('/pub')) {
      const docId = match[1];
      let gid = "0";
      if (url.hash.includes('gid=')) {
        const hashParams = new URLSearchParams(url.hash.replace('#', '?'));
        gid = hashParams.get('gid') || "0";
      } else if (url.searchParams.has('gid')) {
        gid = url.searchParams.get('gid') || "0";
      }
      return `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;
    }
  } catch (e) {
    // Ignore invalid URLs, return raw
  }
  return rawUrl;
}

export default async function EsportsPage() {
  let wars: WarRecord[] = [];
  let error = null;

  try {
    if (!CSV_URL) {
      error = "Missing CSV_URL. Please provide the Google Sheet CSV URL via ESPORTS_CSV_URL environment variable or update the constant directly.";
    } else {
      const finalUrl = getGoogleSheetCsvUrl(CSV_URL);
      const res = await fetch(finalUrl);
      if (!res.ok) throw new Error("Failed to fetch CSV data. Status: " + res.status);
      
      const text = await res.text();
      // Prevent parsing an HTML page if Google returns the viewer instead of CSV
      if (text.trim().startsWith('<')) {
        throw new Error("The URL provided returned an HTML webpage instead of a raw CSV file. Please ensure it is a direct CSV export link.");
      }
      
      wars = parseEsportsCSV(text);
    }
  } catch (err: any) {
    error = err.message || "An error occurred while fetching the CSV.";
  }

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

      {error ? (
        <section className="section-frame border-brick/20 px-4 py-5 text-brick sm:px-6">
          <p className="data-label text-brick/80">Data Connection Error</p>
          <p className="mt-3 text-lg leading-7 font-body">{error}</p>
        </section>
      ) : null}

      {!error && wars.length > 0 && (
        <div className="space-y-8">
          {wars.map((war, i) => (
            <article key={i} className="section-frame bg-parchment px-4 py-6 sm:px-8 sm:py-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between border-b border-black/10 pb-4 gap-4">
                <div>
                  <p className="eyebrow">War Matchup</p>
                  <h3 className="font-serif-display text-3xl sm:text-4xl mt-2 text-ink">
                    vs. {war.opponent}
                  </h3>
                </div>
                <div className="sm:text-right">
                  <p className="data-label">Final Score Output</p>
                  <p className="font-serif-display text-4xl text-ink mt-2 tracking-tight">
                    {war.offenseStars} <span className="text-2xl text-ink/40 font-body mx-1">–</span> {war.defenseStars}
                  </p>
                </div>
              </div>

              {war.players.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-black/5">
                        <th className="py-3 pr-4 font-medium text-ink/50 data-label">Player</th>
                        <th className="py-3 px-4 font-medium text-ink/50 data-label">Offense</th>
                        <th className="py-3 px-4 font-medium text-ink/50 data-label">Defense</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {war.players.map((p, idx) => (
                        <tr key={idx} className="hover:bg-black/[0.02] transition-colors">
                          <td className="py-4 pr-4 font-body text-lg text-ink space-y-1">
                            {p.name}
                          </td>
                          <td className="py-4 px-4 font-body text-base text-ink flex items-center gap-2">
                            <span>{p.offStars}⭐</span>
                            <span className="text-sm text-ink/50 bg-black/5 px-2 py-0.5 rounded-full">{p.offPercent}%</span>
                          </td>
                          <td className="py-4 px-4 font-body text-base text-ink">
                            <div className="flex items-center gap-2">
                              <span>{p.defStars}⭐</span>
                              <span className="text-sm text-ink/50 bg-black/5 px-2 py-0.5 rounded-full">{p.defPercent}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-ink/50 font-body py-2">No individual player data recorded.</p>
              )}
            </article>
          ))}
        </div>
      )}

      {!error && wars.length === 0 && CSV_URL && (
        <section className="section-frame px-4 py-10 text-center sm:px-6">
          <p className="text-ink/60 font-body">No war logs recorded yet.</p>
        </section>
      )}
    </div>
  );
}
