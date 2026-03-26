import { NextResponse } from "next/server";

type ClashClanResponse = {
  name?: string;
  tag?: string;
  badgeUrls?: {
    small?: string;
    medium?: string;
    large?: string;
  };
  warLeague?: {
    name?: string;
  } | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, details?: string | null) {
  return NextResponse.json(
    {
      error: message,
      details: details ?? null
    },
    { status }
  );
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rawTag = (url.searchParams.get("tag") ?? "").trim();
    const clashApiKey = process.env.CLASH_API_KEY;
    const royaleApiKey = process.env.ROYALE_API_KEY ?? clashApiKey;

    if (!rawTag) {
      return jsonError("Missing `tag` query parameter.", 400);
    }

    if (!clashApiKey) {
      return jsonError("CLASH_API_KEY is not configured.", 500);
    }

    const normalizedTag = rawTag.startsWith("#") ? rawTag : `#${rawTag}`;
    const encodedTag = encodeURIComponent(normalizedTag);

    const response = await fetch(`https://cocproxy.royaleapi.dev/v1/clans/${encodedTag}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${clashApiKey}`,
        auth: royaleApiKey,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const bodyText = await response.text();

    if (!response.ok) {
      return jsonError(
        "Failed to fetch clan info from Supercell.",
        response.status,
        bodyText || null
      );
    }

    let clan: ClashClanResponse | null = null;
    try {
      clan = JSON.parse(bodyText) as ClashClanResponse;
    } catch {
      return jsonError(
        "Supercell returned a non-JSON success response.",
        502,
        bodyText.slice(0, 260) || null
      );
    }

    return NextResponse.json({
      name: clan?.name ?? null,
      tag: clan?.tag ?? normalizedTag,
      badgeUrls: clan?.badgeUrls ?? null,
      warLeague: {
        name: clan?.warLeague?.name ?? null
      }
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unable to fetch clan info.", 500);
  }
}

