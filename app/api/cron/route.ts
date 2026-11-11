import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const USER_ID = 4020848968;
const TARGET_IDS = [99567941238278, 76172769094087, 90407707718652];
const STATE_KEY = "roblox-presence-monitor:last-alert";

async function redis(command: string[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis non configuré (UPSTASH_REDIS_REST_URL / TOKEN).");
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Erreur Redis.");
  const data = await response.json();
  return data.result as string | null;
}

async function sendDiscord(message: string) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) throw new Error("Webhook Discord non configuré.");
  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `<@1056529485861761034> ${message}`,
      allowed_mentions: { users: ["1056529485861761034"] }
    }),
    cache: "no-store"
  });
  if (!response.ok) throw new Error(`Discord a répondu ${response.status}.`);
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    const isInTargetGame = presence.userPresenceType === 2 && targetId !== null;

    if (isInTargetGame) {
      const fingerprint = `${targetId}:${presence.gameId || "unknown"}`;
      const previous = await redis(["GET", STATE_KEY]);
      if (previous !== fingerprint) {
        const gameNumber = TARGET_IDS.indexOf(targetId) + 1;
        await sendDiscord(`🟢 Le joueur Roblox **4020848968** vient d'être détecté dans le jeu ciblé ${gameNumber} (ID ${targetId}).`);
        await redis(["SET", STATE_KEY, fingerprint]);
      }
    } else {
      const previous = await redis(["GET", STATE_KEY]);
      if (previous) await redis(["DEL", STATE_KEY]);
    }

    return NextResponse.json({ ok: true, isInTargetGame, placeId, rootPlaceId, checkedAt: new Date().toISOString() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}