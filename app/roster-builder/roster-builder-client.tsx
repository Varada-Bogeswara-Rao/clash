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
  clan_tag: string | null;
  badge_url: string | null;
  updated_at: string;
};

type Roster = {
  id: string;
  editingDraftId?: string;  // set when editing an existing saved draft
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
  const [showOverview, setShowOverview] = useState(false);
  const [expandedRosterHistoryByTag, setExpandedRosterHistoryByTag] = useState<Record<string, boolean>>({});
  const [expandedOverviewHistoryByTag, setExpandedOverviewHistoryByTag] = useState<Record<string, boolean>>({});

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
          ...(roster.editingDraftId ? { id: roster.editingDraftId } : {}),
          title: title.trim(),
          player_tags: roster.assignedPlayers.map((p) => p.player_tag),
          clan_tag: roster.clanTag !== "—" ? roster.clanTag : null,
          badge_url: roster.badgeUrl ?? null
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

  function handleEditDraft(draft: SavedRoster) {
    const playersToLoad = draft.player_tags
      .map((tag) => initialPlayers.find((p) => p.player_tag === tag))
      .filter((p): p is PlayerBankEntry => p !== undefined);

    // Prompt to save current active roster if one exists
    if (rosters.length > 0 && rosters[0].assignedPlayers.length > 0) {
      const ok = window.confirm(`Discard current active roster "${rosters[0].clanName}" and load "${draft.title}" for editing?`);
      if (!ok) return;
    }

    // Remove from savedRosters so its players are unlocked in the bank
    setSavedRosters((curr) => curr.filter((r) => r.id !== draft.id));
    setExpandedRosterHistoryByTag({});

    const newRoster: Roster = {
      id: createRosterId(draft.id),
      editingDraftId: draft.id,
      clanName: draft.title,
      clanTag: draft.clan_tag ?? "—",
      clanLeague: "—",
      badgeUrl: draft.badge_url ?? null,
      capacity: Math.max(playersToLoad.length, 15),
      sortMode: "th",
      assignedPlayers: sortPlayersForRoster(playersToLoad, "th")
    };
    setRosters([newRoster]);
    setShowOverview(false);
    pushToast(`Loaded "${draft.title}" for editing — ${playersToLoad.length} players. Save Draft when done.`);
  }

  async function handleDeleteDraft(id: string, title: string) {
    const pwd = window.prompt(`Enter password to delete "${title}":`);
    if (pwd === null) return; // cancelled
    if (pwd.trim().toLowerCase() !== "bax") {
      pushToast("Error: Incorrect password.");
      return;
    }
    try {
      await fetch(`/api/rosters?id=${id}`, { method: "DELETE" });
      setSavedRosters((curr) => curr.filter((r) => r.id !== id));
      pushToast(`Deleted "${title}".`);
    } catch {
      pushToast("Error: Could not delete draft.");
    }
  }

  function handleLoadDraft(draft: SavedRoster) {
    const playersToLoad = draft.player_tags
      .map((tag) => initialPlayers.find((p) => p.player_tag === tag))
      .filter((p): p is PlayerBankEntry => p !== undefined);

    if (playersToLoad.length === 0) {
      pushToast("No matching players found in the current player bank.");
      return;
    }

    // Auto-create a roster board if none exist
    if (rosters.length === 0) {
      const newRoster: Roster = {
        id: createRosterId(draft.id),
        clanName: draft.title,
        clanTag: draft.clan_tag ?? "—",
        clanLeague: "—",
        badgeUrl: draft.badge_url ?? null,
        capacity: Math.max(playersToLoad.length, 15),
        sortMode: "th",
        assignedPlayers: sortPlayersForRoster(playersToLoad, "th")
      };
      setRosters([newRoster]);
      pushToast(`Loaded "${draft.title}" — ${playersToLoad.length} players populated into new roster.`);
      return;
    }

    const targetRoster = rosters[0];
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

    // If rosters already exist, prompt to save then replace
    if (rosters.length > 0) {
      const existing = rosters[0];
      const shouldSave = window.confirm(
        `Save the current roster for "${existing.clanName}" before switching clans?`
      );
      if (shouldSave && existing.assignedPlayers.length > 0) {
        const draftTitle = window.prompt("Save current roster as:", existing.clanName);
        if (draftTitle?.trim()) {
          try {
            const res = await fetch("/api/rosters", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: draftTitle.trim(),
                player_tags: existing.assignedPlayers.map((p) => p.player_tag),
                clan_tag: existing.clanTag !== "—" ? existing.clanTag : null,
                badge_url: existing.badgeUrl ?? null
              })
            });
            if (res.ok) {
              const saved = await res.json() as SavedRoster;
              setSavedRosters((curr) => [saved, ...curr.filter((r) => r.id !== saved.id)]);
              pushToast(`Saved "${draftTitle.trim()}" — switching to new clan.`);
            }
          } catch { /* silent */ }
        }
      }
      // Replace rosters entirely
      setRosters([]);
      setExpandedRosterHistoryByTag({});
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

  // Map player_tag -> saved roster title for all players already saved to a completed roster
  const savedAssignedMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const draft of savedRosters) {
      for (const tag of draft.player_tags) {
        if (!map.has(tag)) map.set(tag, draft.title);
      }
    }
    return map;
  }, [savedRosters]);

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
      pushToast(`Error: ${player.player_name} is already drafted in ${existingRoster.clanName}.`);
      return;
    }

    if (existingRoster && existingRoster.id === targetRoster.id) {
      pushToast(`Error: ${player.player_name} is already in ${targetRoster.clanName}.`);
      return;
    }

    // Block if already saved in a completed roster
    const savedIn = savedAssignedMap.get(player.player_tag);
    if (savedIn) {
      pushToast(`Error: ${player.player_name} is already assigned to "${savedIn}".`);
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

  function handleChangeCapacity(rosterId: string, newCapacity: number | "") {
    setRosters((current) =>
      current.map((roster) =>
        roster.id !== rosterId ? roster : { ...roster, capacity: typeof newCapacity === "number" && newCapacity > 0 ? newCapacity : roster.capacity }
      )
    );
  }

  return (
    <div className="space-y-8">

      {/* ─── Overview Button ─── */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowOverview((v) => !v)}
          className="rounded-full border border-black/15 bg-ink px-5 py-2 text-xs uppercase tracking-[0.22em] text-paper transition-colors hover:bg-ink/90"
        >
          {showOverview ? "Hide Overview" : `Roster Overview${savedRosters.length > 0 ? ` (${savedRosters.length})` : ""}`}
        </button>
      </div>

      {/* ─── Overview Panel — shows saved/completed rosters from DB ─── */}
      {showOverview && (
        <section className="section-frame px-4 py-6 sm:px-8 sm:py-8 space-y-8">
          <div className="space-y-2">
            <p className="eyebrow">Completed Rosters</p>
            <h2 className="font-serif-display text-4xl tracking-tight text-ink">Overview</h2>
            <p className="text-sm text-ink/60">{savedRosters.length} saved roster{savedRosters.length !== 1 ? "s" : ""}</p>
          </div>
          {savedRosters.length === 0 ? (
            <p className="text-sm text-ink/50 italic">No saved rosters yet. Build a roster and click "Save Draft" to archive it here.</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {savedRosters.map((draft) => {
                const players = draft.player_tags
                  .map((tag) => initialPlayers.find((p) => p.player_tag === tag))
                  .filter((p): p is PlayerBankEntry => p !== undefined);
                return (
                  <div key={`ov-${draft.id}`} className="space-y-3">
                    <div className="flex items-center gap-3 border-b border-black/8 pb-3">
                      {draft.badge_url && (
                        <Image src={draft.badge_url} alt={draft.title} width={32} height={32} className="h-8 w-8 rounded-full border border-black/10" />
                      )}
                      <div className="min-w-0">
                        <p className="font-serif-display text-2xl text-ink truncate">{draft.title}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-ink/50">
                          {draft.clan_tag ?? "—"} · {draft.player_tags.length} players · {new Date(draft.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="ml-auto shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditDraft(draft)}
                          className="text-[10px] uppercase tracking-[0.16em] text-ink/60 hover:text-ink transition-colors border border-black/10 rounded-lg px-2 py-1"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(draft.id, draft.title)}
                          className="text-[10px] uppercase tracking-[0.16em] text-brick/60 hover:text-brick transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-black/5">
                      {players.map((p, idx) => {
                        const ovKey = `ov-${draft.id}-${p.player_tag}`;
                        const isOpen = Boolean(expandedOverviewHistoryByTag[ovKey]);
                        return (
                          <div key={p.player_tag} className="py-2 space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-ink/40 w-5 text-right shrink-0">{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setExpandedOverviewHistoryByTag((curr) => ({ ...curr, [ovKey]: !curr[ovKey] }))}
                                className="min-w-0 text-left"
                              >
                                <p className="text-sm text-ink underline-offset-2 hover:underline truncate">{p.player_name}</p>
                                <p className="text-[10px] uppercase tracking-wider text-ink/45">TH{p.latest_th_level || "?"} · {p.latest_league_label}</p>
                              </button>
                            </div>
                            <AnimatePresence initial={false}>
                              {isOpen && p.recent_cwl_history.length > 0 && (
                                <motion.div
                                  key={ovKey}
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden ml-8 space-y-1"
                                >
                                  {p.recent_cwl_history.map((entry, ei) => (
                                    <div key={ei} className="rounded-lg border border-black/10 bg-paper px-3 py-2">
                                      <p className="text-xs uppercase tracking-[0.14em] text-ink/60">{entry.month_label} | {entry.roster_th} | {entry.clan_name}</p>
                                      <p className="text-[11px] uppercase tracking-[0.12em] text-ink/45">{entry.league_label} · {entry.totals}</p>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                              {isOpen && p.recent_cwl_history.length === 0 && (
                                <motion.p key={`${ovKey}-empty`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                  className="ml-8 text-xs text-ink/40 italic"
                                >No CWL history.</motion.p>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                      {players.length === 0 && (
                        <p className="text-xs text-ink/40 italic py-2">No matching players found in bank.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

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
                  const savedIn = savedAssignedMap.get(player.player_tag);
                  const isLocked = Boolean(draftedIn ?? savedIn);
                  const lockedLabel = draftedIn
                    ? `✓ ${draftedIn.clanName}`
                    : savedIn
                    ? `✓ ${savedIn}`
                    : null;
                  const selectedTarget =
                    draftTargetByPlayer[player.player_tag] || rosters[0]?.id || "";
                  const isHistoryOpen = Boolean(expandedHistoryByTag[player.player_tag]);

                  return (
                    <div
                      key={player.player_tag}
                      className={`rounded-2xl border px-3 py-3 transition-opacity ${
                        isLocked
                          ? "border-sage/20 bg-sage/5 opacity-60"
                          : "border-black/10 bg-paper"
                      }`}
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

                        {lockedLabel ? (
                          <span className="shrink-0 rounded-full border border-sage/30 bg-sage/15 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-sage">
                            {lockedLabel}
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
                        {isLocked ? (
                          <p className="flex-1 rounded-xl border border-sage/20 bg-sage/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-sage/80 text-center">
                            {lockedLabel}
                          </p>
                        ) : (
                          <>
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
                          </>
                        )}
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
                      <div className="flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-3 py-1">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-ink/65">
                          {roster.assignedPlayers.length} /
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={200}
                          value={roster.capacity}
                          onChange={(e) => handleChangeCapacity(roster.id, e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-10 bg-transparent text-[11px] uppercase tracking-[0.2em] text-ink/65 outline-none text-center"
                        />
                        <span className="text-[11px] uppercase tracking-[0.2em] text-ink/65">Players</span>
                      </div>
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
                              className="rounded-2xl border border-black/10 bg-paper px-3 py-3"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedRosterHistoryByTag((curr) => ({
                                        ...curr,
                                        [`${roster.id}-${player.player_tag}`]: !curr[`${roster.id}-${player.player_tag}`]
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
                                <button
                                  type="button"
                                  onClick={() => handleRemovePlayer(roster.id, player.player_tag)}
                                  className="rounded-xl border border-brick/30 bg-brick/10 px-3 py-2 text-xs uppercase tracking-[0.16em] text-brick transition-colors hover:bg-brick/15"
                                >
                                  Remove
                                </button>
                              </div>

                              <AnimatePresence initial={false}>
                                {expandedRosterHistoryByTag[`${roster.id}-${player.player_tag}`] && (
                                  <motion.div
                                    key={`rh-${roster.id}-${player.player_tag}`}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 overflow-hidden rounded-xl border border-black/10 bg-black/5"
                                  >
                                    <div className="space-y-2 p-3">
                                      <p className="text-[10px] uppercase tracking-[0.18em] text-ink/55">Past 3 Months CWL</p>
                                      {player.recent_cwl_history.length === 0 ? (
                                        <p className="text-xs text-ink/60">No CWL history available.</p>
                                      ) : (
                                        player.recent_cwl_history.map((entry, idx) => (
                                          <div key={`${player.player_tag}-rh-${idx}`} className="rounded-lg border border-black/10 bg-paper px-3 py-2">
                                            <p className="text-xs uppercase tracking-[0.16em] text-ink/60">{entry.month_label} | {entry.roster_th}</p>
                                            <p className="text-sm text-ink">{entry.clan_name}</p>
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-ink/55">{entry.league_label}</p>
                                            <p className="text-[11px] text-ink/60">{entry.totals}</p>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
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
