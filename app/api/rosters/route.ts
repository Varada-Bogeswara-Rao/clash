import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("saved_rosters")
      .select("id, title, player_tags, updated_at")
      .order("updated_at", { ascending: false });

    if (error) return jsonError(error.message, 500);

    return NextResponse.json(data ?? []);
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to fetch rosters.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { id?: string; title: string; player_tags: string[] };

    if (!body.title?.trim()) return jsonError("title is required.", 400);
    if (!Array.isArray(body.player_tags)) return jsonError("player_tags must be an array.", 400);

    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    let result;

    if (body.id) {
      // Update existing
      result = await supabase
        .from("saved_rosters")
        .update({ title: body.title.trim(), player_tags: body.player_tags, updated_at: now })
        .eq("id", body.id)
        .select("id, title, player_tags, updated_at")
        .single();
    } else {
      // Insert new
      result = await supabase
        .from("saved_rosters")
        .insert({ title: body.title.trim(), player_tags: body.player_tags, updated_at: now })
        .select("id, title, player_tags, updated_at")
        .single();
    }

    if (result.error) return jsonError(result.error.message, 500);
    return NextResponse.json(result.data, { status: body.id ? 200 : 201 });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to save roster.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return jsonError("id query parameter is required.", 400);

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("saved_rosters").delete().eq("id", id);

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ success: true });
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : "Failed to delete roster.", 500);
  }
}
