import React from "react";

export const revalidate = 60;

// TODO: Replace with the actual Google Sheet CSV URL provided by the user
const CSV_URL = process.env.ESPORTS_CSV_URL || "";

/**
 * Utility function to parse raw CSV text into an array of JavaScript objects.
 * Assumes the first row contains headers.
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const parseLine = (line: string) => {
    const values = [];
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

  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || "";
      return obj;
    }, {} as Record<string, string>);
  });
}

export default async function EsportsPage() {
  let data: Record<string, string>[] = [];
  let error = null;

  try {
    if (!CSV_URL) {
      error = "Missing CSV_URL. Please provide the Google Sheet CSV URL via ESPORTS_CSV_URL environment variable or update the constant directly.";
    } else {
      // Native Next.js fetch API
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error("Failed to fetch CSV data. Status: " + res.status);
      const text = await res.text();
      data = parseCSV(text);
    }
  } catch (err: any) {
    error = err.message || "An error occurred while fetching the CSV.";
  }

  const headers = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="space-y-10">
      <section className="section-frame grid gap-10 px-4 py-7 sm:px-6 md:px-8 md:py-10">
        <div className="space-y-6">
          <p className="eyebrow">Division Overview</p>
          <div className="space-y-4">
            <h1 className="max-w-4xl font-serif-display text-4xl leading-[0.98] tracking-tight text-ink sm:text-5xl md:text-7xl">
              Esports Division
            </h1>
            <p className="max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 text-ink/68 font-body">
              A meticulously maintained ledger of our competitive roster and their active statistics, pulled directly from our synchronized records.
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="section-frame border-brick/20 px-4 py-5 text-brick sm:px-6">
          <p className="data-label text-brick/80">Data Connection Error</p>
          <p className="mt-3 text-lg leading-7 font-body">
            {error}
          </p>
        </section>
      ) : null}

      {!error && data.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <p className="eyebrow">The Ledger</p>
              <h2 className="font-serif-display text-4xl tracking-tight text-ink">
                Division Records
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-ink/62">
              Refreshing from external records every 60 seconds.
            </p>
          </div>

          <div className="section-frame overflow-hidden bg-parchment">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-black/10">
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="p-4 sm:px-6 text-xs font-medium text-ink/60 uppercase tracking-widest whitespace-nowrap data-label"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {data.map((row, i) => (
                    <tr key={i} className="hover:bg-black/[0.02] transition-colors">
                      {headers.map((header) => (
                        <td
                          key={`${i}-${header}`}
                          className="p-4 sm:px-6 text-base text-ink font-body whitespace-nowrap"
                        >
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {!error && data.length === 0 && CSV_URL && (
        <section className="section-frame px-4 py-10 text-center sm:px-6">
          <p className="text-ink/60 font-body">No records found in the provided dataset.</p>
        </section>
      )}
    </div>
  );
}
