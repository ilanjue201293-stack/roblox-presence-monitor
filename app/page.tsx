"use client";

import { useCallback, useEffect, useState } from "react";

type Status = {
  ok: boolean;
  username?: string | null;
  userId: number;
  isInTargetGame: boolean;
  presenceType: number;
  placeId?: number | null;
  rootPlaceId?: number | null;
  gameName?: string | null;
  checkedAt: string;
  error?: string;
  notificationConfigured?: boolean;
};

const TARGETS = [
  { id: 99567941238278, label: "Jeu 1" },
  { id: 76172769094087, label: "Jeu 2" },
  { id: 90407707718652, label: "Jeu 3" }
];

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de récupérer le statut.");
      setStatus(data);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const runTest = async () => {
    setTestLoading(true);
    setTestResult("");
    try {
      const response = await fetch("/api/test", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Le test a échoué.");
      setTestResult(data.message || "Notification de test envoyée sur Discord.");
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Erreur pendant le test.");
    } finally {
      setTestLoading(false);
    }
  };

  const activeTarget = status
    ? TARGETS.find((target) => target.id === status.placeId || target.id === status.rootPlaceId)
    : undefined;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brandIcon">R</span><span>Presence<span className="muted">Monitor</span></span></div>
        <div className="live"><span className="pulse" /> SURVEILLANCE</div>
      </header>

      <section className="hero">
        <p className="eyebrow">ROBLOX / PLAYER TRACKER</p>
        <h1>Présence du joueur</h1>
        <p className="subtitle">Suivi du compte Roblox <strong>4020848968</strong> sur trois expériences ciblées.</p>
      </section>

      <section className="statusCard">
        <div className="cardHead">
          <div><p className="label">STATUT ACTUEL</p><h2>{status?.username || "Joueur Roblox"}</h2><p className="id">ID : 4020848968</p></div>
          <span className={status?.isInTargetGame ? "statusBadge online" : "statusBadge offline"}>
            <span className="dot" />{loading ? "Vérification…" : status?.isInTargetGame ? "DANS UN JEU CIBLÉ" : "NON DÉTECTÉ"}
          </span>
        </div>
        <div className="gamePanel">
          <div className="gameIcon">⌖</div>
          <div className="gameText">
            <p className="label">EXPÉRIENCE DÉTECTÉE</p>
            <strong>{status?.isInTargetGame ? activeTarget?.label || "Expérience ciblée" : "Aucune expérience ciblée"}</strong>
            <span>{status?.isInTargetGame ? `Place ID : ${status.placeId ?? "inconnu"}` : "En attente d'une correspondance…"}</span>
          </div>
        </div>
        <div className="cardFoot">
          <span>Dernière vérification</span>
          <strong>{status?.checkedAt ? new Date(status.checkedAt).toLocaleTimeString("fr-FR") : "—"}</strong>
          <button onClick={() => { setLoading(true); void refresh(); }} disabled={loading}>Actualiser</button>
        </div>
      </section>

      <section className="targets">
        <div className="sectionHead"><div><p className="label">FILTRES DE SURVEILLANCE</p><h2>Jeux suivis</h2></div><span>03 CIBLES</span></div>
        <div className="targetList">
          {TARGETS.map((target, index) => {
            const selected = status?.isInTargetGame && (target.id === status.placeId || target.id === status.rootPlaceId);
            return <div className="target" key={target.id}>
              <span className="targetNumber">0{index + 1}</span>
              <div><strong>{target.label}</strong><span>ID : {target.id}</span></div>
              <span className={selected ? "targetState found" : "targetState"}>{selected ? "DÉTECTÉ" : "EN VEILLE"}</span>
            </div>;
          })}
        </div>
      </section>

      <section className="targets testSection">
        <div className="sectionHead"><div><p className="label">VÉRIFICATION MANUELLE</p><h2>Tester les notifications</h2></div></div>
        <p className="subtitle">Recherche le joueur Roblox 11702703065 et envoie son statut actuel sur Discord.</p>
        <button onClick={() => void runTest()} disabled={testLoading} className="testButton">{testLoading ? "Recherche en cours…" : "Tester maintenant"}</button>
        {testResult && <p className="testResult" role="status">{testResult}</p>}
      </section>

      <section className="notice">
        <span className="noticeIcon">i</span>
        <p>Le tableau de bord actualise le statut toutes les 30 secondes lorsqu'il est ouvert. Les alertes Discord sont déclenchées automatiquement toutes les 5 minutes par GitHub Actions. La configuration Discord et Redis doit être terminée pour activer les notifications.</p>
      </section>
      {error && <p className="error">{error}</p>}
      {status?.error && <p className="error">{status.error}</p>}
      <footer>ROBLOX PRESENCE MONITOR <span>•</span> Actualisation automatique : 30 s</footer>
    </main>
  );
}