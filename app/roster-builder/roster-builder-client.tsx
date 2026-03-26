"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type PlayerBankHistoryEntry = {
  month_label: string;
  roster_th: string;
  clan_name: string;
  league_label: string;
  totals: string;
  attacks: string[];
};

export type PlayerBankEntry = {
  player_tag: string;
  player_name: string;
  latest_th_level: number;
  latest_stars: number;
  latest_league_label: string;
  latest_league_rank: number;
  recent_cwl_history: PlayerBankHistoryEntry[];
};

type ClanInfoResponse = {
  name: string | null;
  tag: string | null;
  badgeUrls: {
    small?: string;
    medium?: string;
    large?: string;
  } | null;
  warLeague: {
    name: string | null;
  };
};

type SortMode = "th" | "league_stars";

type SavedRoster = {
  id: string;
  title: string;
  player_tags: string[];
  updated_at: string;
};

type Roster = {
  id: string;
  clanName: string;
  clanTag: string;
  clanLeague: string;
  badgeUrl: string | null;
  capacity: number;
  sortMode: SortMode;
  assignedPlayers: PlayerBankEntry[];
};

function sortPlayersForRoster(players: PlayerBankEntry[], sortMode: SortMode) {
  return [...players].sort((a, b) => {
    if (sortMode === "league_stars") {
      if (a.latest_league_rank !== b.latest_league_rank) {
        return b.latest_league_rank - a.latest_league_rank;
      }

      if (a.latest_stars !== b.latest_stars) {
        return b.latest_stars - a.latest_stars;
      }

      if (a.latest_th_level !== b.latest_th_level) {
        return b.latest_th_level - a.latest_th_level;
      }

      return a.player_name.localeCompare(b.player_name);
    }

    if (a.latest_th_level !== b.latest_th_level) {
      return b.latest_th_level - a.latest_th_level;
    }

    return a.player_name.localeCompare(b.player_name);
  });
}

function createRosterId(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function compositionText(players: PlayerBankEntry[]) {
  const thCounts = new Map<number, number>();

  for (const player of players) {
    const key = player.latest_th_level;
    thCounts.set(key, (thCounts.get(key) ?? 0) + 1);
  }

  const entries = Array.from(thCounts.entries()).sort((a, b) => b[0] - a[0]);
  if (entries.length === 0) {
    return "No players drafted";
  }

  return entries
    .map(([th, count]) => (th > 0 ? `TH${th}: ${count}` : `TH?: ${count}`))
    .join(" | ");
}

function formatTag(tag: string) {
  const trimmed = tag.trim().toUpperCase();
  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
}

function sortModeLabel(mode: SortMode) {
  return mode === "league_stars" ? "League + Stars" : "TH Level";
}

type ClanInfoErrorPayload = {
  error?: string;
  details?: string;
};

async function parseJsonFromResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return { payload: null as unknown, rawText: "" };
  }

  try {
    return { payload: JSON.parse(text) as unknown, rawText: text };
  } catch {
    return { payload: null as unknown, rawText: text };
  }
}

export function RosterBuilderClient({ initialPlayers }: { initialPlayers: PlayerBankEntry[] }) {
  const [clanTagInput, setClanTagInput] = useState("");
  const [capacityInput, setCapacityInput] = useState<number | "">(15);
  const [sortModeInput, setSortModeInput] = useState<SortMode>("th");
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("All Leagues");
  const [expandedHistoryByTag, setExpandedHistoryByTag] = useState<Record<string, boolean>>({});
  const [isFetchingClan, setIsFetchingClan] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const [draftTargetByPlayer, setDraftTargetByPlayer] = useState<Record<string, string>>({});
  const [savedRosters, setSavedRosters] = useState<SavedRoster[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved drafts on mount
  useEffect(() => {
    fetch("/api/rosters")
      .then((res) => res.json())
      .then((data: unknown) => {
        if (Array.isArray(data)) setSavedRosters(data as SavedRoster[]);
      })
      .catch(() => {}); // silently fail – non-critical
  }, []);

  function pushToast(message: string) {
    setToastMessage(message);
    setToastKey((value) => value + 1);

    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 3600);
  }

  async function handleSaveDraft(roster: Roster) {
    const title = window.prompt("Save as (name this draft):", roster.clanName);
    if (!title?.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/rosters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          player_tags: roster.assignedPlayers.map((p) => p.player_tag)
        })
      });
      const saved = await res.json() as SavedRoster;
      if (!res.ok) { pushToast(`Error saving draft.`); return; }
      setSavedRosters((curr) => [saved, ...curr.filter((r) => r.id !== saved.id)]);
      pushToast(`Saved "${saved.title}" with ${roster.assignedPlayers.length} players.`);
    } catch (err) {
      pushToast(err instanceof Error ? `Error: ${err.message}` : "Error: Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDraft(id: string, title: string) {
    try {
      await fetch(`/api/rosters?id=${id}`, { method: "DELETE" });
      setSavedRosters((curr) => curr.filter((r) => r.id !== id));
      pushToast(`Deleted "${title}".`);
    } catch {
      pushToast("Error: Could not delete draft.");
    }
  }

  function handleLoadDraft(draft: SavedRoster) {
    if (rosters.length === 0) {
      pushToast("Error: Fetch a clan to create a roster board first.");
      return;
    }
    const targetRoster = rosters[0];
    const playersToLoad = draft.player_tags
      .map((tag) => initialPlayers.find((p) => p.player_tag === tag))
      .filter((p): p is PlayerBankEntry => p !== undefined);

    if (playersToLoad.length === 0) {
      pushToast("No matching players found in the current player bank.");
      return;
    }

    setRosters((curr) =>
      curr.map((r) =>
        r.id !== targetRoster.id
          ? r
          : { ...r, assignedPlayers: sortPlayersForRoster(playersToLoad, r.sortMode) }
      )
    );
    pushToast(`Loaded "${draft.title}" into ${targetRoster.clanName} (${playersToLoad.length} players).`);
  }

  async function handleFetchClan() {
    const normalizedTag = formatTag(clanTagInput);
    if (!normalizedTag) {
      pushToast("Error: Enter a clan tag before fetching.");
      return;
    }

    setIsFetchingClan(true);

    try {
      const response = await fetch(`/api/clan-info?tag=${encodeURIComponent(normalizedTag)}`, {
        method: "GET"
      });

      const { payload, rawText } = await parseJsonFromResponse(response);
      const parsedPayload = payload as (ClanInfoResponse & ClanInfoErrorPayload) | null;

      if (!response.ok) {
        const message =
          parsedPayload?.error ||
          (rawText ? `Clan fetch failed (${response.status}): ${rawText.slice(0, 140)}` : null) ||
          "Unable to fetch clan info.";

        pushToast(`Error: ${message}`);
        return;
      }

      if (!parsedPayload || typeof parsedPayload !== "object") {
        pushToast(
          `Error: Clan API returned a non-JSON response (${response.status}). Check server logs.`
        );
        return;
      }

      const rosterTag = parsedPayload.tag || normalizedTag;
      const rosterName = parsedPayload.name || rosterTag;
      const leagueName = parsedPayload.warLeague?.name || "Unranked";
      const badgeUrl = parsedPayload.badgeUrls?.medium || parsedPayload.badgeUrls?.small || null;

      const newRoster: Roster = {
        id: createRosterId(rosterTag),
        clanName: rosterName,
        clanTag: rosterTag,
        clanLeague: leagueName,
        badgeUrl,
        capacity: typeof capacityInput === "number" && capacityInput > 0 ? capacityInput : 15,
        sortMode: sortModeInput,
        assignedPlayers: []
      };

      setRosters((current) => [...current, newRoster]);
      setClanTagInput("");
    } catch (error) {
      pushToast(error instanceof Error ? `Error: ${error.message}` : "Error: Failed to fetch clan.");
    } finally {
      setIsFetchingClan(false);
    }
  }

  const leagueFilterOptions = useMemo(() => {
    const options = Array.from(
      new Set(initialPlayers.map((player) => player.latest_league_label.trim()).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return ["All Leagues", ...options];
  }, [initialPlayers]);

  const filteredPlayers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return initialPlayers.filter((player) => {
      const matchesSearch =
        normalized.length === 0 ||
        player.player_name.toLowerCase().includes(normalized) ||
        player.player_tag.toLowerCase().includes(normalized);

      const matchesLeague =
        leagueFilter === "All Leagues" || player.latest_league_label === leagueFilter;

      return matchesSearch && matchesLeague;
    });
  }, [initialPlayers, searchTerm, leagueFilter]);

  function playerRosterLookup(playerTag: string) {
    for (const roster of rosters) {
      if (roster.assignedPlayers.some((player) => player.player_tag === playerTag)) {
        return roster;
      }
    }

    return null;
  }

  function handleAddPlayer(player: PlayerBankEntry) {
    if (rosters.length === 0) {
      pushToast("Error: Create at least one roster before drafting.");
      return;
    }

    const targetRosterId = draftTargetByPlayer[player.player_tag] || rosters[0].id;
    const targetRoster = rosters.find((roster) => roster.id === targetRosterId);

    if (!targetRoster) {
      pushToast("Error: Select a valid roster destination.");
      return;
    }

    const existingRoster = playerRosterLookup(player.player_tag);
    if (existingRoster && existingRoster.id !== targetRoster.id) {
      pushToast(
        `Error: ${player.player_name} is already drafted in ${existingRoster.clanName}.`
      );
      return;
    }

    if (existingRoster && existingRoster.id === targetRoster.id) {
      pushToast(`Error: ${player.player_name} is already in ${targetRoster.clanName}.`);
      return;
    }

    if (targetRoster.assignedPlayers.length >= targetRoster.capacity) {
      pushToast(`Error: ${targetRoster.clanName} is already at ${targetRoster.capacity} players.`);
      return;
    }

    setRosters((current) =>
      current.map((roster) => {
        if (roster.id !== targetRoster.id) {
          return roster;
        }

        return {
          ...roster,
          assignedPlayers: sortPlayersForRoster([...roster.assignedPlayers, player], roster.sortMode)
        };
      })
    );
  }

  function handleRemovePlayer(rosterId: string, playerTag: string) {
    setRosters((current) =>
      current.map((roster) => {
        if (roster.id !== rosterId) {
          return roster;
        }

        return {
          ...roster,
          assignedPlayers: roster.assignedPlayers.filter((player) => player.player_tag !== playerTag)
        };
      })
    );
  }

  function handleChangeRosterSortMode(rosterId: string, sortMode: SortMode) {
    setRosters((current) =>
      current.map((roster) => {
        if (roster.id !== rosterId) {
          return roster;
        }

        return {
          ...roster,
          sortMode,
          assignedPlayers: sortPlayersForRoster(roster.assignedPlayers, sortMode)
        };
      })
    );
  }

  return (
    <div className="space-y-8">

      {/* ─── Saved Drafts Panel ─── */}
      {savedRosters.length > 0 && (
        <section className="section-frame px-4 py-5 sm:px-6 space-y-4">
          <p className="data-label">Saved Drafts</p>
          <div className="divide-y divide-black/5">
            {savedRosters.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{draft.title}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-ink/48 mt-0.5">
                    {draft.player_tags.length} players · saved {new Date(draft.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleLoadDraft(draft)}
                    className="rounded-xl border border-black/10 bg-parchment px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-ink/70 transition-colors hover:bg-paper"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDraft(draft.id, draft.title)}
                    className="rounded-xl border border-brick/25 bg-brick/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-brick/80 transition-colors hover:bg-brick/15"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── Clan Config ─── */}
      <section className="section-frame space-y-5 px-4 py-6 sm:px-6 md:px-8">
        <p className="data-label">Clan Config</p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_140px_190px_auto]">
          <input
            value={clanTagInput}
            onChange={(event) => setClanTagInput(event.target.value)}
            placeholder="#CLAN_TAG"
            className="rounded-2xl border border-black/10 bg-paper px-4 py-3 text-sm uppercase tracking-[0.14em] text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-black/20"
          />

          <input
            type="number"
            min={1}
            max={100}
            value={capacityInput}
            onChange={(event) => {
              const val = event.target.value;
              setCapacityInput(val === "" ? "" : Number(val));
            }}
            className="rounded-2xl border border-black/10 bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-black/20"
            placeholder="Capacity"
          />

          <select
            value={sortModeInput}
            onChange={(event) =>
              setSortModeInput(event.target.value === "league_stars" ? "league_stars" : "th")
            }
            className="rounded-2xl border border-black/10 bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-black/20"
          >
            <option value="th">Sort: TH Level</option>
            <option value="league_stars">Sort: League + Stars</option>
          </select>

          <button
            type="button"
            onClick={handleFetchClan}
            disabled={isFetchingClan}
            className="w-full rounded-full border border-black/15 bg-ink px-5 py-2 text-xs uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50 md:w-auto"
          >
            {isFetchingClan ? "Fetching..." : "Fetch Clan"}
          </button>
        </div>
      </section>

      <AnimatePresence initial={false}>
        {toastMessage ? (
          <motion.section
            key={toastKey}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-brick/30 bg-brick/10 px-5 py-4 text-sm text-brick"
          >
            {toastMessage}
          </motion.section>
        ) : null}
      </AnimatePresence>

      <section className="grid gap-6 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.45fr)]">
        <article className="section-frame min-h-[420px] overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:h-[70vh]">
          <div className="flex h-full flex-col gap-4">
            <div className="space-y-3">
              <p className="data-label">Player Bank</p>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search player name or tag"
                className="w-full rounded-2xl border border-black/10 bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink/35 focus:border-black/20"
              />
              <select
                value={leagueFilter}
                onChange={(event) => setLeagueFilter(event.target.value)}
                className="w-full rounded-2xl border border-black/10 bg-paper px-4 py-3 text-sm text-ink outline-none transition-colors focus:border-black/20"
              >
                {leagueFilterOptions.map((league) => (
                  <option key={league} value={league}>
                    {league === "All Leagues" ? "All Past-Month Leagues" : league}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-full max-h-[58vh] overflow-y-auto pr-1 lg:max-h-none">
              <div className="space-y-2">
                {filteredPlayers.map((player) => {
                  const draftedIn = playerRosterLookup(player.player_tag);
                  const selectedTarget =
                    draftTargetByPlayer[player.player_tag] || rosters[0]?.id || "";
                  const isHistoryOpen = Boolean(expandedHistoryByTag[player.player_tag]);

                  return (
                    <div
                      key={player.player_tag}
                      className="rounded-2xl border border-black/10 bg-paper px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedHistoryByTag((current) => ({
                                ...current,
                                [player.player_tag]: !current[player.player_tag]
                              }))
                            }
                            className="text-left text-base text-ink underline-offset-2 hover:underline"
                          >
                            {player.player_name}
                          </button>
                          <p className="text-[11px] uppercase tracking-[0.18em] text-ink/55">
                            {player.player_tag} | TH{player.latest_th_level || "?"}
                          </p>
                          <p className="text-[11px] uppercase tracking-[0.16em] text-ink/48">
                            {player.latest_league_label} | {player.latest_stars} Stars
                          </p>
                        </div>

                        {draftedIn ? (
                          <span className="rounded-full border border-sage/30 bg-sage/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-sage">
                            {draftedIn.clanName}
                          </span>
                        ) : null}
                      </div>

                      <AnimatePresence initial={false}>
                        {isHistoryOpen ? (
                          <motion.div
                            key={`${player.player_tag}-history`}
                            initial={{ opacity: 0, y: -6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: "auto" }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-black/5"
                          >
                            <div className="space-y-2 p-3">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-ink/55">
                                Past 3 Months CWL
                              </p>
                              {player.recent_cwl_history.length === 0 ? (
                                <p className="text-xs text-ink/60">No monthly CWL history available.</p>
                              ) : (
                                player.recent_cwl_history.map((entry, index) => (
                                  <div
                                    key={`${player.player_tag}-${entry.month_label}-${index}`}
                                    className="rounded-lg border border-black/10 bg-paper px-3 py-2"
                                  >
                                    <p className="text-xs uppercase tracking-[0.16em] text-ink/60">
                                      {entry.month_label} | {entry.roster_th}
                                    </p>
                                    <p className="text-sm text-ink">{entry.clan_name}</p>
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-ink/55">
                                      {entry.league_label}
                                    </p>
                                    <p className="text-[11px] text-ink/60">{entry.totals}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>

                      <div className="mt-3 flex gap-2">
                        <select
                          value={selectedTarget}
                          onChange={(event) =>
                            setDraftTargetByPlayer((current) => ({
                              ...current,
                              [player.player_tag]: event.target.value
                            }))
                          }
                          disabled={rosters.length === 0}
                          className="min-w-0 flex-1 rounded-xl border border-black/10 bg-paper px-2 py-2 text-xs text-ink outline-none disabled:opacity-50"
                        >
                          {rosters.length === 0 ? (
                            <option value="">No rosters</option>
                          ) : (
                            rosters.map((roster) => (
                              <option key={roster.id} value={roster.id}>
                                {roster.clanName}
                              </option>
                            ))
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddPlayer(player)}
                          className="rounded-xl border border-black/10 bg-parchment px-3 py-2 text-xs uppercase tracking-[0.16em] text-ink/70 transition-colors hover:bg-paper disabled:opacity-50"
                          disabled={rosters.length === 0}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </article>

        <article className="space-y-4">
          {rosters.length === 0 ? (
            <div className="section-frame px-4 py-10 text-center text-ink/60 sm:px-6">
              <p className="font-serif-display text-3xl text-ink">No rosters yet</p>
              <p className="mt-3 text-base">
                Fetch a clan above to create your first roster board.
              </p>
            </div>
          ) : (
            rosters.map((roster) => (
              <section key={roster.id} className="section-frame overflow-hidden">
                <div className="border-b border-black/10 px-4 py-4 sm:px-6 sm:py-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {roster.badgeUrl ? (
                        <Image
                          src={roster.badgeUrl}
                          alt={`${roster.clanName} badge`}
                          width={44}
                          height={44}
                          className="h-11 w-11 rounded-full border border-black/10"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-full border border-black/10 bg-paper" />
                      )}
                      <div>
                        <h3 className="font-serif-display text-3xl tracking-tight text-ink">
                          {roster.clanName}
                        </h3>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink/55">
                          {roster.clanTag} | {roster.clanLeague}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={roster.sortMode}
                        onChange={(event) =>
                          handleChangeRosterSortMode(
                            roster.id,
                            event.target.value === "league_stars" ? "league_stars" : "th"
                          )
                        }
                        className="rounded-xl border border-black/10 bg-paper px-3 py-2 text-xs text-ink outline-none"
                      >
                        <option value="th">TH Level</option>
                        <option value="league_stars">League + Stars</option>
                      </select>
                      <p className="rounded-full border border-black/10 bg-black/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-ink/65">
                        {roster.assignedPlayers.length} / {roster.capacity} Players
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-ink/48">
                    Sort Mode: {sortModeLabel(roster.sortMode)}
                  </p>
                </div>

                <div className="px-5 py-5">
                  <AnimatePresence initial={false}>
                    {roster.assignedPlayers.length === 0 ? (
                      <motion.p
                        key={`${roster.id}-empty`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-2xl border border-black/10 bg-paper px-4 py-4 text-sm text-ink/55"
                      >
                        No drafted players yet.
                      </motion.p>
                    ) : (
                      <motion.div key={`${roster.id}-list`} layout className="space-y-2">
                        <AnimatePresence initial={false}>
                          {roster.assignedPlayers.map((player) => (
                            <motion.div
                              key={`${roster.id}-${player.player_tag}`}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-paper px-3 py-3"
                            >
                              <div>
                                <p className="text-base text-ink">{player.player_name}</p>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-ink/55">
                                  {player.player_tag} | TH{player.latest_th_level || "?"}
                                </p>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-ink/48">
                                  {player.latest_league_label} | {player.latest_stars} Stars
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemovePlayer(roster.id, player.player_tag)}
                                className="rounded-xl border border-brick/30 bg-brick/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-brick transition-colors hover:bg-brick/15"
                              >
                                Remove
                              </button>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="border-t border-black/10 px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-xs uppercase tracking-[0.16em] text-ink/58">
                      {compositionText(roster.assignedPlayers)}
                    </p>
                    {roster.assignedPlayers.length > 0 && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveDraft(roster)}
                        className="rounded-full border border-black/15 bg-ink px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSaving ? "Saving…" : "Save Draft"}
                      </button>
                    )}
                  </div>
                </div>
              </section>
            ))
          )}
        </article>
      </section>
    </div>
  );
}
