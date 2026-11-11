import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const USER_ID = 4020848968;
const TARGET_IDS = [99567941238278, 76172769094087, 90407707718652];

export async function GET() {
  try {
    const response = await fetch("https://presence.roblox.com/v1/presence/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userIds: [USER_ID] }),
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`API Roblox indisponible (${response.status}).`);
    const data = await response.json();
    const presence = data.userPresences?.[0];
    if (!presence) throw new Error("Aucune donnée de présence renvoyée par Roblox.");

    const placeId = Number(presence.placeId || 0) || null;
    const rootPlaceId = Number(presence.rootPlaceId || 0) || null;
    const targetId = TARGET_IDS.find((id) => id === placeId || id === rootPlaceId) ?? null;

    return NextResponse.json({
      ok: true,
      userId: USER_ID,
      username: null,
      presenceType: presence.userPresenceType,
      isInTargetGame: presence.userPresenceType === 2 && targetId !== null,
      placeId,
      rootPlaceId,
      gameName: presence.lastLocation || null,
      checkedAt: new Date().toISOString()
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({ ok: false, error: message, checkedAt: new Date().toISOString() }, { status: 502 });
  }
}