import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RequestBody = {
  clanTag?: unknown;
};

type ClanMember = {
  tag?: string;
  name?: string;
};

type ClanResponse = {
  memberList?: ClanMember[];
};

export async function POST(request: Request) {
  const clashApiKey = process.env.CLASH_API_KEY;

  if (!clashApiKey) {
    return NextResponse.json(
      { error: "CLASH_API_KEY is not configured." },
      { status: 500 }
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body. Expected { clanTag: string }." },
      { status: 400 }
    );
  }

  const clanTagInput = typeof body.clanTag === "string" ? body.clanTag.trim() : "";

  if (!clanTagInput) {
    return NextResponse.json(
      { error: "Missing clanTag in request body." },
      { status: 400 }
    );
  }

  const normalizedClanTag = clanTagInput.startsWith("#")
    ? clanTagInput
    : `#${clanTagInput}`;
  const encodedClanTag = encodeURIComponent(normalizedClanTag);

  try {
    const clanResponse = await fetch(
      `https://api.clashofclans.com/v1/clans/${encodedClanTag}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${clashApiKey}`
        },
        cache: "no-store"
      }
    );

    if (!clanResponse.ok) {
      const errorText = await clanResponse.text();

      return NextResponse.json(
        {
          error: "Failed to fetch clan from Supercell.",
          status: clanResponse.status,
          details: errorText || null
        },
        { status: clanResponse.status }
      );
    }

    const clanPayload = (await clanResponse.json()) as ClanResponse;
    const memberList = Array.isArray(clanPayload.memberList)
      ? clanPayload.memberList
      : [];

    const players = memberList
      .map((member) => ({
        tag: typeof member.tag === "string" ? member.tag : "",
        name: typeof member.name === "string" ? member.name : ""
      }))
      .filter((member) => member.tag.length > 0 && member.name.length > 0);

    if (players.length === 0) {
      return NextResponse.json({
        clanTag: normalizedClanTag,
        synced: 0
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tracked_players")
      .upsert(players, { onConflict: "tag" })
      .select("tag");

    if (error) {
      throw error;
    }

    return NextResponse.json({
      clanTag: normalizedClanTag,
      synced: data?.length ?? players.length
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Clan sync failed unexpectedly."
      },
      { status: 500 }
    );
  }
}
