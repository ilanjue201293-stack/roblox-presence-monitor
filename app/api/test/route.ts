import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TEST_USER_ID = 11702703065;
const DISCORD_USER_ID = "1056529485861761034";

export async function POST() {
  try {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) throw new Error("Webhook Discord non configuré.");

    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) throw new Error("Redis non configuré pour sécuriser le bouton test.");
    const lockResponse = await fetch(redisUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${redisToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(["SET", "roblox-presence-monitor:test-lock", "1", "NX", "EX", "30"]),
      cache: "no-store"
    });
    if (!lockResponse.ok) throw new Error("Impossible de vérifier le délai de sécurité du test.");
    const lock = await lockResponse.json();
    if (lock.result !== "OK") return NextResponse.json({ ok: false, error: "Attends 30 secondes avant de relancer le test." }, { status: 429 });

    const [presenceResponse, userResponse] = await Promise.all([
      fetch("https://presence.roblox.com/v1/presence/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [TEST_USER_ID] }),
        cache: "no-store"
      }),
      fetch(`https://users.roblox.com/v1/users/${TEST_USER_ID}`, { cache: "no-store" })
    ]);

    if (!presenceResponse.ok) throw new Error(`API de présence Roblox indisponible (${presenceResponse.status}).`);
    const presenceData = await presenceResponse.json();
    const presence = presenceData.userPresences?.[0];
    if (!presence) throw new Error("Roblox n'a renvoyé aucune présence pour ce joueur.");

    let username = `ID ${TEST_USER_ID}`;
    if (userResponse.ok) {
      const user = await userResponse.json();
      username = user.displayName || user.name || username;
    }

    const presenceLabels: Record<number, string> = {
      0: "Hors ligne",
      1: "En ligne",
      2: "En jeu",
      3: "En Studio"
    };
    const state = presenceLabels[presence.userPresenceType] || "Statut inconnu";
    const location = presence.lastLocation ? `\nActivité : ${presence.lastLocation}` : "";
    const message = `🧪 **TEST DU MONITOR**\nJoueur : **${username}** (ID ${TEST_USER_ID})\nStatut Roblox : **${state}**${location}\n\nLa recherche Roblox et l'envoi Discord fonctionnent.`;

    const discordResponse = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `<@${DISCORD_USER_ID}> ${message}`,
        allowed_mentions: { users: [DISCORD_USER_ID] }
      }),
      cache: "no-store"
    });
    if (!discordResponse.ok) throw new Error(`Discord a répondu ${discordResponse.status}.`);

    return NextResponse.json({ ok: true, message: `Recherche terminée : ${username} est « ${state} ». Notification envoyée sur Discord.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
