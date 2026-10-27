import { useMemo } from "react";
import "./Statistiques.css";

const STATUS_GROUPS = [
  { key: "all", title: "Total des réclamations", color: "blue", icon: "▤", matches: () => true },
  { key: "pending", title: "En attente", color: "orange", icon: "◷", matches: (s) => ["soumise", "en attente", "pending"].includes(s) },
  { key: "processing", title: "Prises en charge", color: "sky", icon: "⚙", matches: (s) => ["en cours", "prise en charge", "pris en charge", "processing", "in progress"].includes(s) },
  { key: "approved", title: "Validées", color: "green", icon: "✓", matches: (s) => ["traitée", "traitee", "validée", "validee", "validée", "approved", "resolved", "clôturée", "cloturee"].includes(s) },
  { key: "cancelled", title: "Annulées", color: "gray", icon: "×", matches: (s) => ["annulée", "annulee", "annulé", "annule", "cancelled", "canceled"].includes(s) },
  { key: "false", title: "Fausses", color: "rose", icon: "!", matches: (s) => ["fausse", "faux", "false"].includes(s) },
];

function normalizeStatus(value) {
  return String(value || "Soumise").trim().toLocaleLowerCase("fr-FR");
}

function getMonthLabel(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "");
}

export default function Statistiques({ reclamations = [], onStatusClick = () => {} }) {
  const stats = useMemo(() => {
    const safeItems = Array.isArray(reclamations) ? reclamations : [];
    return STATUS_GROUPS.map((group) => ({
      ...group,
      count: safeItems.filter((item) => group.matches(normalizeStatus(item?.statut))).length,
    }));
  }, [reclamations]);

  const monthly = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push({ year: date.getFullYear(), month: date.getMonth(), label: date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""), count: 0 });
    }
    (Array.isArray(reclamations) ? reclamations : []).forEach((item) => {
      const rawDate = item?.dateEnregistrement || item?.created_at || item?.createdAt || item?.created_at_iso || item?.dateCreation;
      if (!rawDate) return;
      const date = new Date(rawDate);
      if (Number.isNaN(date.getTime())) return;
      const month = months.find((entry) => entry.year === date.getFullYear() && entry.month === date.getMonth());
      if (month) month.count += 1;
    });
    return months;
  }, [reclamations]);

  const maxMonthly = Math.max(1, ...monthly.map((item) => item.count));
  const total = stats[0].count;

  return (
    <div className="client-stats-page">
      <div className="client-stats-heading">
        <div className="client-stats-title-wrap">
          <div className="client-stats-heading-icon">▥</div>
          <div>
            <h1>Statistiques de mes réclamations</h1>
            <p>Visualisez un résumé de vos réclamations et leur état de traitement.</p>
          </div>
        </div>
        <div className="client-stats-period">▦ <span>Les 6 derniers mois</span></div>
      </div>

      <section className="client-stats-cards" aria-label="Résumé des réclamations">
        {stats.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`client-stats-card ${item.color}`}
            onClick={() => onStatusClick(item.key)}
            title={`Afficher : ${item.title}`}
          >
            <span className="client-stats-icon">{item.icon}</span>
            <span className="client-stats-card-content">
              <strong>{item.count}</strong>
              <span>{item.title}</span>
              <small>{total ? `${Math.round((item.count / total) * 100)}% du total` : "Aucune réclamation"}</small>
              <span className="client-stats-progress"><span style={{ width: `${total ? (item.count / total) * 100 : 0}%` }} /></span>
            </span>
          </button>
        ))}
      </section>

      <div className="client-stats-charts">
        <section className="client-stats-panel">
          <div className="client-stats-panel-heading">
            <span className="client-stats-panel-icon">◔</span>
            <div><h2>Répartition des réclamations</h2><p>Vue d'ensemble de l'état de vos réclamations</p></div>
          </div>
          <div className="client-stats-distribution">
            <div className="client-stats-donut-wrap">
              <div className="client-stats-donut" style={{ background: makeDonut(stats.slice(1).map((item) => ({ count: item.count, color: item.color })), total) }}>
                <div><strong>{total}</strong><span>Réclamations</span></div>
              </div>
            </div>
            <div className="client-stats-legend">
              {stats.slice(1).map((item) => (
                <button key={item.key} type="button" onClick={() => onStatusClick(item.key)}>
                  <span className={`client-stats-dot ${item.color}`} />
                  <span>{item.title}</span><strong>{item.count}</strong>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="client-stats-panel">
          <div className="client-stats-panel-heading">
            <span className="client-stats-panel-icon">▥</span>
            <div><h2>Évolution des réclamations</h2><p>Nombre de réclamations par mois</p></div>
          </div>
          <div className="client-stats-monthly-chart">
            {monthly.map((item) => (
              <div className="client-stats-month-column" key={`${item.year}-${item.month}`}>
                <span className="client-stats-month-value">{item.count || ""}</span>
                <div className="client-stats-bar-track"><div className="client-stats-bar" style={{ height: `${(item.count / maxMonthly) * 100}%` }} /></div>
                <span className="client-stats-month-label">{item.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="client-stats-note">Les statistiques sont calculées à partir des réclamations chargées pour votre compte. Cliquez sur une carte pour filtrer la liste correspondante.</p>
    </div>
  );
}

function makeDonut(items, total) {
  if (!total) return "conic-gradient(#e7edf5 0deg 360deg)";
  const palette = { orange: "#ffb91f", sky: "#3998f5", green: "#27b47e", red: "#ef4444", rose: "#db6475" };
  let start = 0;
  const segments = items.map((item) => {
    const end = start + (item.count / total) * 360;
    const segment = `${palette[item.color] || "#cbd5e1"} ${start}deg ${end}deg`;
    start = end;
    return segment;
  });
  return `conic-gradient(${segments.join(", ")})`;
}
