"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ParsedMonth = {
  month: string;
  rosterTh: string;
  clanName: string;
  clanBadge: string | null;
  attacks: string[];
  totals: string;
};

type ParsedCwlHistory = {
  playerName: string;
  playerTag: string;
  months: ParsedMonth[];
};

type SaveApiResponse = {
  saved?: number;
  players?: number;
  error?: string;
  sql?: string;
};

const monthNameRegex = "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
const monthHeadPattern = new RegExp(
  `\\b${monthNameRegex}\\s+\\d{4}\\s+\\(#\\d+,\\s*TH\\d+\\)`
);
const monthRowStartPattern = new RegExp(
  `^${monthNameRegex}\\s+\\d{4}\\s+\\(#\\d+,\\s*TH\\d+\\)`
);
const monthMetaPattern = new RegExp(
  `^(${monthNameRegex}\\s+\\d{4})\\s+\\((#[0-9]+,\\s*TH[0-9]+)\\)\\s*(.*)$`
);
const playerPattern = /^(.*?)\s*\((#[A-Z0-9]+)\)$/i;
const totalsPattern = /(\d+\/\d+\s*wars,\s*\d+\s*stars,\s*\d+%)\s*$/i;
const attackPattern = /(?:\d{1,3}%|N\/A|--|-)/gi;
const discordEmojiTokenPattern = /:[A-Za-z0-9_+\-]+:/g;
const discordEmojiPrefixPattern = /^(?::[A-Za-z0-9_+\-]+:\s*)+/;

function stripDiscordEmojiPrefix(input: string) {
  return input.replace(discordEmojiPrefixPattern, "").trim();
}

function leadingEmojiTokens(input: string) {
  const prefixMatch = input.match(discordEmojiPrefixPattern);
  if (!prefixMatch) {
    return [] as string[];
  }

  return prefixMatch[0].match(discordEmojiTokenPattern) ?? [];
}

function parseSingleCwlHistory(rawText: string): ParsedCwlHistory {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("Add the header and at least one month row to parse.");
  }

  const dataLines = lines[0].toLowerCase().startsWith("cwl attack history")
    ? lines.slice(1)
    : lines;

  if (dataLines.length === 0) {
    throw new Error("No CWL data rows were found.");
  }

  let playerName = "";
  let playerTag = "";
  let remainingLines = dataLines;
  const firstLine = dataLines[0];
  const firstLinePlayerMatch = firstLine.match(playerPattern);

  if (firstLinePlayerMatch?.[1] && firstLinePlayerMatch?.[2]) {
    playerName = firstLinePlayerMatch[1].trim();
    playerTag = firstLinePlayerMatch[2].toUpperCase();
    remainingLines = dataLines.slice(1);
  } else {
    const monthStart = firstLine.search(monthHeadPattern);

    if (monthStart < 0) {
      throw new Error("Could not find the first month segment in the first data row.");
    }

    const playerSegment = firstLine.slice(0, monthStart).trim();
    const inlinePlayerMatch = playerSegment.match(playerPattern);

    if (!inlinePlayerMatch?.[1] || !inlinePlayerMatch?.[2]) {
      throw new Error("Could not parse player name/tag from the first data row.");
    }

    playerName = inlinePlayerMatch[1].trim();
    playerTag = inlinePlayerMatch[2].toUpperCase();
    remainingLines = [firstLine.slice(monthStart).trim(), ...dataLines.slice(1)];
  }

  if (remainingLines.length === 0) {
    throw new Error("No monthly CWL rows were found after the player line.");
  }

  const monthBlocks: string[][] = [];
  let currentBlock: string[] | null = null;

  for (const line of remainingLines) {
    if (monthRowStartPattern.test(line)) {
      if (currentBlock) {
        monthBlocks.push(currentBlock);
      }
      currentBlock = [line];
      continue;
    }

    if (!currentBlock) {
      throw new Error(`Unexpected content before first month row: ${line}`);
    }

    currentBlock.push(line);
  }

  if (currentBlock) {
    monthBlocks.push(currentBlock);
  }

  if (monthBlocks.length === 0) {
    throw new Error("No monthly CWL rows were recognized.");
  }

  const months = monthBlocks.map((block) => {
    const header = block[0];
    const meta = header.match(monthMetaPattern);

    if (!meta?.[1] || !meta?.[2]) {
      throw new Error(`Invalid month row format: ${header}`);
    }

    const month = meta[1];
    const rosterTh = meta[2].replace(/\s+/g, " ").trim();
    const contentLines = [meta[3] ?? "", ...block.slice(1)];
    let clanName = "";
    let clanBadge: string | null = null;
    let totals = "";
    const attacks: string[] = [];

    for (const rawLine of contentLines) {
      const emojiTokens = leadingEmojiTokens(rawLine);
      let line = stripDiscordEmojiPrefix(rawLine);

      if (!line) {
        continue;
      }

      const totalsMatch = line.match(totalsPattern);
      if (totalsMatch?.[1]) {
        totals = totalsMatch[1].trim();
        const totalsIndex = line.search(totalsPattern);
        line = (totalsIndex >= 0 ? line.slice(0, totalsIndex) : "").trim();
      }

      if (!line) {
        continue;
      }

      const attackMatches = line.match(attackPattern) ?? [];
      if (attackMatches.length > 0) {
        attacks.push(...attackMatches.map((value) => value.toUpperCase()));
      }

      if (!clanName) {
        const firstAttackIndex = line.search(attackPattern);
        const candidateClan =
          firstAttackIndex >= 0 ? line.slice(0, firstAttackIndex).trim() : line.trim();
        const clanText = stripDiscordEmojiPrefix(candidateClan);

        if (clanText) {
          clanName = clanText;
          clanBadge = emojiTokens.length > 0 ? emojiTokens.join(" ") : null;
        }
      }
    }

    if (!totals) {
      throw new Error(`Totals segment missing in row: ${header}`);
    }

    return {
      month,
      rosterTh,
      clanName: clanName || "Unknown Clan",
      clanBadge,
      attacks,
      totals
    } satisfies ParsedMonth;
  });

  return {
    playerName,
    playerTag,
    months
  };
}

function mergePlayerHistories(histories: ParsedCwlHistory[]) {
  const grouped = new Map<
    string,
    {
      playerName: string;
      playerTag: string;
      monthMap: Map<string, ParsedMonth>;
    }
  >();

  for (const history of histories) {
    const tag = history.playerTag.toUpperCase();
    if (!grouped.has(tag)) {
      grouped.set(tag, {
        playerName: history.playerName,
        playerTag: tag,
        monthMap: new Map<string, ParsedMonth>()
      });
    }

    const current = grouped.get(tag)!;
    if (!current.playerName.trim() && history.playerName.trim()) {
      current.playerName = history.playerName;
    }

    for (const month of history.months) {
      current.monthMap.set(month.month.trim().toUpperCase(), month);
    }
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      playerName: entry.playerName,
      playerTag: entry.playerTag,
      months: Array.from(entry.monthMap.values())
    }))
    .sort((a, b) => a.playerName.localeCompare(b.playerName));
}

function parseCwlHistoryCollection(rawText: string): ParsedCwlHistory[] {
  const normalizedLines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (normalizedLines.length === 0) {
    throw new Error("Paste CWL text before parsing.");
  }

  const playerLineIndexes: number[] = [];

  for (let index = 0; index < normalizedLines.length; index += 1) {
    if (playerPattern.test(normalizedLines[index])) {
      playerLineIndexes.push(index);
    }
  }

  if (playerLineIndexes.length <= 1) {
    return [parseSingleCwlHistory(rawText)];
  }

  const chunks: string[] = [];

  for (let index = 0; index < playerLineIndexes.length; index += 1) {
    const start = playerLineIndexes[index];
    const end = index + 1 < playerLineIndexes.length
      ? playerLineIndexes[index + 1]
      : normalizedLines.length;

    const chunkLines = normalizedLines.slice(start, end);
    if (chunkLines.length > 0) {
      chunks.push(chunkLines.join("\n"));
    }
  }

  const parsed = chunks.map((chunk, chunkIndex) => {
    try {
      return parseSingleCwlHistory(chunk);
    } catch (error) {
      throw new Error(
        `Failed to parse player block ${chunkIndex + 1}: ${
          error instanceof Error ? error.message : "Unknown parse error"
        }`
      );
    }
  });

  return mergePlayerHistories(parsed);
}

const revealVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const }
  },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2 } }
};

const placeholderInput = `CWL attack history (last 3 months)
ghost (#LPVQ0LUPG)

Jan 2026 (#15, TH17)
:Champion3: Punisher
:1:  100%   :17::18:
:2:  100%   :17::18:
:3:  100%   :18::18:
:4:  100%   :13::18:
:5:  100%   :15::18:
:6:  100%   :13::18:
:7:  100%   :10::18:
:CrossSword: 7/7 wars, 21 stars, 700%

CWL attack history (last 3 months)
king (#CUGYYGRG)

Jan 2026 (#3, TH18)
:Champion2: Pabebe Boy's
:1:  100%   :3::18:
:2:  100%   :5::18:
 :CrossSword: 2/2 wars, 6 stars, 200%`;

const CWL_PARSER_PASSWORD = "bax";

export default function CwlPage() {
  const [rawInput, setRawInput] = useState("");
  const [parsedPlayers, setParsedPlayers] = useState<ParsedCwlHistory[]>([]);
  const [parserPassword, setParserPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  function handleUnlock() {
    if (parserPassword.trim().toLowerCase() !== CWL_PARSER_PASSWORD) {
      setUnlockError("Invalid password.");
      return;
    }

    setIsUnlocked(true);
    setUnlockError(null);
    setParserPassword("");
  }

  function handleParse() {
    try {
      const result = parseCwlHistoryCollection(rawInput);
      setParsedPlayers(result);
      setError(null);
      setSaveState("idle");
      setSaveMessage(null);
    } catch (parseError) {
      setParsedPlayers([]);
      setSaveState("idle");
      setSaveMessage(null);
      setError(
        parseError instanceof Error
          ? parseError.message
          : "Unable to parse the CWL history input."
      );
    }
  }

  async function handleSave() {
    if (parsedPlayers.length === 0) {
      return;
    }

    setSaveState("saving");
    setSaveMessage(null);

    try {
      const response = await fetch("/api/cwl/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ players: parsedPlayers })
      });

      const responseText = await response.text();
      let body: SaveApiResponse = {};
      try {
        body = JSON.parse(responseText) as SaveApiResponse;
      } catch {
        body = { error: responseText || "Unexpected non-JSON response from server." };
      }

      if (!response.ok) {
        const message = body.sql
          ? `${body.error}\n\nRun this SQL in Supabase SQL Editor:\n${body.sql}`
          : body.error || "Failed to save CWL data.";
        throw new Error(message);
      }

      const monthCount = parsedPlayers.reduce((sum, player) => sum + player.months.length, 0);
      setSaveState("saved");
      setSaveMessage(
        `Saved ${body.saved ?? monthCount} month row(s) for ${body.players ?? parsedPlayers.length} player(s).`
      );
    } catch (saveError) {
      setSaveState("error");
      setSaveMessage(
        saveError instanceof Error ? saveError.message : "Failed to save CWL data."
      );
    }
  }

  return (
    <div className="space-y-10">
      <section className="section-frame space-y-5 px-6 py-8 md:px-8 md:py-10">
        <p className="eyebrow">CWL Utility</p>
        <h1 className="font-serif-display text-5xl leading-[0.94] tracking-tight text-ink md:text-7xl">
          CWL Log Parser
        </h1>
        <p className="max-w-3xl text-lg leading-8 text-ink/66">
          Paste raw Discord output for one or many players, parse it, and save structured monthly logs.
        </p>
      </section>

      {isUnlocked ? (
        <>
          <section className="section-frame space-y-5 px-6 py-6 md:px-8 md:py-8">
        <p className="data-label">Raw CWL Text</p>
        <textarea
          value={rawInput}
          onChange={(event) => setRawInput(event.target.value)}
          placeholder={placeholderInput}
          spellCheck={false}
          className="min-h-[240px] w-full resize-y rounded-2xl border border-black/10 bg-paper p-4 text-sm leading-7 text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-black/20"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleParse}
            className="rounded-full border border-black/15 bg-ink px-5 py-2 text-xs uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink/90"
          >
            Parse Data
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={parsedPlayers.length === 0 || saveState === "saving"}
            className="rounded-full border border-black/10 bg-parchment px-5 py-2 text-xs uppercase tracking-[0.22em] text-ink/70 transition-colors hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveState === "saving" ? (
              <span className="inline-flex items-center gap-2 align-middle">
                <Image
                  src="/bax.png"
                  alt="Saving loader"
                  width={16}
                  height={16}
                  className="bax-loader"
                />
                Saving...
              </span>
            ) : (
              "Save to Database"
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setRawInput(placeholderInput);
              setParsedPlayers([]);
              setError(null);
              setSaveState("idle");
              setSaveMessage(null);
            }}
            className="rounded-full border border-black/10 bg-parchment px-5 py-2 text-xs uppercase tracking-[0.22em] text-ink/70 transition-colors hover:bg-paper"
          >
            Load Sample
          </button>
        </div>
        {error ? (
          <p className="rounded-2xl border border-brick/30 bg-brick/10 px-4 py-3 text-sm whitespace-pre-wrap text-brick">
            {error}
          </p>
        ) : null}
        {saveMessage ? (
          <p
            className={[
              "rounded-2xl border px-4 py-3 text-sm whitespace-pre-wrap",
              saveState === "saved"
                ? "border-sage/30 bg-sage/10 text-sage"
                : "border-brick/30 bg-brick/10 text-brick"
            ].join(" ")}
          >
            {saveMessage}
          </p>
        ) : null}
      </section>

      <AnimatePresence mode="wait">
        {parsedPlayers.length > 0 ? (
          <motion.section
            key={`players-${parsedPlayers.length}`}
            variants={revealVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="section-frame space-y-6 px-6 py-6 md:px-8 md:py-8"
          >
            <div className="space-y-2">
              <p className="eyebrow">Parsed Output</p>
              <h2 className="font-serif-display text-4xl tracking-tight text-ink md:text-5xl">
                {parsedPlayers.length} Player{parsedPlayers.length > 1 ? "s" : ""}
              </h2>
            </div>

            <div className="space-y-6">
              {parsedPlayers.map((parsed) => (
                <article key={parsed.playerTag} className="rounded-2xl border border-black/10 bg-paper p-4 md:p-5">
                  <div className="mb-4 space-y-1">
                    <h3 className="font-serif-display text-3xl tracking-tight text-ink">
                      {parsed.playerName}
                    </h3>
                    <p className="text-sm uppercase tracking-[0.22em] text-ink/58">
                      {parsed.playerTag}
                    </p>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-black/10">
                    <table className="min-w-full border-collapse text-left text-sm">
                      <thead className="border-b border-black/10 bg-paper">
                        <tr className="text-xs uppercase tracking-[0.22em] text-ink/55">
                          <th className="px-4 py-3 font-normal">Month</th>
                          <th className="px-4 py-3 font-normal">Roster / TH</th>
                          <th className="px-4 py-3 font-normal">Clan</th>
                          <th className="px-4 py-3 font-normal">Day 1-7 Attacks</th>
                          <th className="px-4 py-3 font-normal">Totals</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.months.map((row) => (
                          <tr
                            key={`${parsed.playerTag}-${row.month}`}
                            className="border-b border-black/10 last:border-b-0 hover:bg-paper"
                          >
                            <td className="whitespace-nowrap px-4 py-4 text-base text-ink">
                              {row.month}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 uppercase tracking-[0.15em] text-ink/65">
                              {row.rosterTh}
                            </td>
                            <td className="px-4 py-4 text-base text-ink">
                              <div className="flex flex-wrap items-center gap-2">
                                {row.clanBadge ? (
                                  <span className="inline-flex rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-[11px] uppercase tracking-[0.16em] text-ink/65">
                                    {row.clanBadge}
                                  </span>
                                ) : null}
                                <span>{row.clanName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex min-w-[280px] flex-wrap gap-2">
                                {row.attacks.length > 0 ? (
                                  row.attacks.map((attack, index) => (
                                    <span
                                      key={`${row.month}-day-${index + 1}-${attack}`}
                                      className="inline-flex rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.17em] text-ink/70"
                                    >
                                      D{index + 1} {attack}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-ink/50">No attack values parsed.</span>
                                )}
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-ink/70">
                              {row.totals}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>
              ))}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
        </>
      ) : (
        <section className="section-frame space-y-4 px-6 py-6 md:px-8 md:py-8">
          <p className="data-label">Parser Locked</p>
          <p className="text-sm leading-7 text-ink/66">
            Enter the password to unlock the CWL parser section.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={parserPassword}
              onChange={(event) => {
                setParserPassword(event.target.value);
                if (unlockError) {
                  setUnlockError(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleUnlock();
                }
              }}
              type="password"
              placeholder="Enter password"
              className="w-full max-w-xs rounded-2xl border border-black/10 bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-black/20"
            />
            <button
              type="button"
              onClick={handleUnlock}
              className="rounded-full border border-black/15 bg-ink px-5 py-2 text-xs uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink/90"
            >
              Unlock Parser
            </button>
          </div>
          {unlockError ? (
            <p className="rounded-2xl border border-brick/30 bg-brick/10 px-4 py-3 text-sm text-brick">
              {unlockError}
            </p>
          ) : null}
        </section>
      )}
    </div>
  );
}






