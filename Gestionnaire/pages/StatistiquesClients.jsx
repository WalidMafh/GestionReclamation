import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";
const COLORS = { blue: "#2563eb", sky: "#60a5fa", green: "#20b879", red: "#ff626b", purple: "#8b5cf6", gold: "#f5a623", navy: "#111c30", muted: "#71819c", border: "#e4eaf3", bg: "#f4f7fb" };

const card = { background: "#fff", border: `1px solid ${COLORS.border}`, borderRadius: 16, boxShadow: "0 5px 18px rgba(20,40,80,.035)" };
const btn = { border: `1px solid ${COLORS.border}`, background: "#fff", borderRadius: 10, padding: "10px 13px", color: "#1d2b45", fontWeight: 650, cursor: "pointer" };

function normalStatus(value = "") {
  const s = String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  // Keep the exact status categories used by the application/backend.
  if (["fausse", "faux", "false"].includes(s)) return "Fausse";
  if (["annulee", "annule", "cancelled", "canceled"].includes(s)) return "Annulée";
  if (["traitee", "validee", "resolue", "cloturee", "approved", "resolved"].includes(s)) return "Traitée";
  if (["en cours", "prise en charge", "pris en charge", "processing", "in progress"].includes(s)) return "En cours";
  if (["soumise", "en attente", "pending", "submitted"].includes(s) || !s) return "Soumise";
  // Unknown statuses stay separate so they cannot inflate the waiting count.
  return "Autre";
}
function dateOf(r) {
  const raw = r.dateEnregistrement || r.dateCreation || r.created_at || r.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function monthLabel(date) { return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }).replace(".", ""); }
function initials(name) { return String(name || "C").trim().split(/\s+/).slice(0, 2).map(x => x[0] || "").join("").toUpperCase(); }

function TrendChart({ data }) {
  const width = 700, height = 205, left = 36, right = 22, top = 18, bottom = 32;
  const max = Math.max(5, ...data.map(x => x.value));
  const x = i => left + i * (width - left - right) / Math.max(1, data.length - 1);
  const y = v => top + (height - top - bottom) * (1 - v / (max * 1.15));
  const points = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `${left},${height-bottom} ${points} ${x(data.length-1)},${height-bottom}`;
  return <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Évolution mensuelle des réclamations" style={{ width: "100%", display: "block", overflow: "visible" }}>
    {[0, .25, .5, .75, 1].map((v, i) => <g key={i}><line x1={left} x2={width-right} y1={top + (height-top-bottom)*v} y2={top + (height-top-bottom)*v} stroke="#e9eef6" strokeDasharray="4 4"/><text x={left-9} y={top+(height-top-bottom)*v+4} textAnchor="end" fontSize="11" fill="#71819c">{Math.round(max*1.15*(1-v))}</text></g>)}
    <polygon points={area} fill="#2563eb" opacity=".10" />
    <polyline points={points} fill="none" stroke={COLORS.blue} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    {data.map((d, i) => <g key={d.label}><circle cx={x(i)} cy={y(d.value)} r="4.5" fill="#fff" stroke={COLORS.blue} strokeWidth="2.5"/><text x={x(i)} y={y(d.value)-11} textAnchor="middle" fontSize="11" fontWeight="700" fill="#14213b">{d.value}</text><text x={x(i)} y={height-9} textAnchor="middle" fontSize="11" fill="#71819c">{d.label}</text></g>)}
  </svg>;
}

export default function StatistiquesClients({ onViewAllClients }) {
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("6");

  async function loadData() {
    setLoading(true); setError("");
    const token = sessionStorage.getItem("gestionnaire_token");
    if (!token) { setError("Session gestionnaire introuvable. Reconnectez-vous puis réessayez."); setLoading(false); return; }
    try {
      const response = await fetch(`${API_URL}/gestionnaire/reclamations`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data?.detail || "Impossible de charger les statistiques.");
      setReclamations(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message || "Erreur de connexion au serveur."); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadData(); }, []);

  const analytics = useMemo(() => {
    const now = new Date();
    const months = [];
    const count = Number(period);
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""), value: 0, year: d.getFullYear(), month: d.getMonth() });
    }
    const clients = new Map();
    const statuses = { "Soumise": 0, "En cours": 0, "Traitée": 0, "Fausse": 0, "Annulée": 0, "Autre": 0 };
    reclamations.forEach(r => {
      const d = dateOf(r);
      if (d) { const m = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth()); if (m) m.value++; }
      const status = normalStatus(r.statut || r.status);
      statuses[status] = (statuses[status] || 0) + 1;
      const c = r.client || {};
      const email = String(c.email || r.clientEmail || "email-inconnu").toLowerCase();
      const name = `${c.prenom || r.clientPrenom || ""} ${c.nom || r.clientNom || ""}`.trim() || email;
      if (!clients.has(email)) clients.set(email, {
        email, name, count: 0, last: null,
        statuses: { "Soumise": 0, "En cours": 0, "Traitée": 0, "Fausse": 0, "Annulée": 0, "Autre": 0 },
      });
      const entry = clients.get(email);
      entry.count++;
      // Count this reclamation only in this client’s own status totals.
      entry.statuses[status] = (entry.statuses[status] || 0) + 1;
      if (d && (!entry.last || d > entry.last)) entry.last = d;
    });
    const activeClients = [...clients.values()].filter(c => c.last && (now - c.last) / (1000*60*60*24) <= 90).length;
    return { months, clients: [...clients.values()].sort((a,b) => b.count-a.count).slice(0, 5), totalClients: clients.size, activeClients, total: reclamations.length, statuses, resolvedRate: reclamations.length ? Math.round(statuses["Traitée"] / reclamations.length * 100) : 0 };
  }, [reclamations, period]);

  const filteredClients = analytics.clients.filter(c => `${c.name} ${c.email}`.toLowerCase().includes(search.toLowerCase()));
  const total = analytics.total || 1;
  const donutLabels = { "Soumise": "En attente", "En cours": "Prise en charge", "Traitée": "Validée", "Fausse": "Fausse", "Annulée": "Annulée", "Autre": "Autre statut" };
  const donutColors = { "Soumise": COLORS.blue, "En cours": COLORS.sky, "Traitée": COLORS.green, "Fausse": COLORS.red, "Annulée": COLORS.gold, "Autre": COLORS.purple };
  const donut = Object.entries(analytics.statuses).map(([label, value]) => ({ label: donutLabels[label] || label, key: label, value, pct: Math.round(value / total * 100), color: donutColors[label] || COLORS.purple }));
  let offset = 0;
  const gradient = donut.map(item => { const start = offset; offset += item.value / total * 100; return `${item.color} ${start}% ${offset}%`; }).join(", ");

  return <div style={{ minHeight: "100%", background: COLORS.bg, padding: "28px clamp(16px, 2.4vw, 40px)", color: "#14213b", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", boxSizing: "border-box" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
      <div><div style={{ color: COLORS.blue, fontSize: 12, fontWeight: 800, letterSpacing: 1.5, marginBottom: 7 }}>ANALYSE & PERFORMANCE</div><h1 style={{ fontSize: "clamp(25px, 3vw, 34px)", margin: 0, letterSpacing: "-.8px", fontWeight: 800 }}>Statistiques des clients</h1><p style={{ color: COLORS.muted, margin: "8px 0 0", fontSize: 15 }}>Analysez l’activité des clients et l’évolution des réclamations.</p></div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}><select aria-label="Période" value={period} onChange={e => setPeriod(e.target.value)} style={{ ...btn, minWidth: 150 }}><option value="3">3 derniers mois</option><option value="6">6 derniers mois</option><option value="12">12 derniers mois</option></select><button onClick={loadData} style={{ ...btn, background: COLORS.blue, color: "#fff", borderColor: COLORS.blue }}>↻ Actualiser</button></div>
    </div>

    {error && <div role="alert" style={{ padding: 14, borderRadius: 12, background: "#fff1f2", border: "1px solid #fecdd3", color: "#be123c", marginBottom: 18 }}>{error}</div>}
    {loading && <div style={{ ...card, padding: 18, marginBottom: 18, color: COLORS.muted }}>Chargement des données depuis le serveur…</div>}

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16, marginBottom: 20 }}>
      {[
        { label: "Clients total", value: analytics.totalClients, icon: "♟", color: COLORS.blue, bg: "#e8f1ff", trend: "Comptes identifiés" },
        { label: "Clients actifs", value: analytics.activeClients, icon: "●", color: COLORS.green, bg: "#e7f9ef", trend: "Activité sur 90 jours" },
        { label: "Réclamations reçues", value: analytics.total, icon: "▤", color: COLORS.purple, bg: "#f0eaff", trend: "Toutes périodes confondues" },
        { label: "Taux de validation", value: `${analytics.resolvedRate}%`, icon: "✓", color: COLORS.gold, bg: "#fff4df", trend: "Statut Traitée / total" },
      ].map(item => <div key={item.label} style={{ ...card, padding: 19, display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}><div style={{ width: 48, height: 48, borderRadius: 14, background: item.bg, color: item.color, display: "grid", placeItems: "center", fontSize: 25, fontWeight: 800, flexShrink: 0 }}>{item.icon}</div><div style={{ minWidth: 0 }}><div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 5 }}>{item.label}</div><div style={{ fontSize: 28, lineHeight: 1.15, fontWeight: 800 }}>{loading ? "—" : item.value}</div><div style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>{item.trend}</div></div></div>)}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 390px), 1fr))", gap: 16, marginBottom: 20 }}>
      <section style={{ ...card, padding: "20px 20px 12px", minWidth: 0 }}><div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}><div style={{ width: 38, height: 38, borderRadius: 12, background: "#e8f1ff", color: COLORS.blue, display: "grid", placeItems: "center", fontSize: 21 }}>▥</div><div><h2 style={{ margin: "2px 0 4px", fontSize: 17 }}>Évolution des réclamations</h2><p style={{ margin: 0, color: COLORS.muted, fontSize: 13 }}>Nombre de réclamations reçues par mois</p></div></div><TrendChart data={analytics.months} /></section>
      <section style={{ ...card, padding: 20, minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 17 }}><div style={{ width: 38, height: 38, borderRadius: 12, background: "#e8f1ff", color: COLORS.blue, display: "grid", placeItems: "center", fontSize: 21 }}>◔</div><div><h2 style={{ margin: "2px 0 4px", fontSize: 17 }}>Réclamations par statut</h2><p style={{ margin: 0, color: COLORS.muted, fontSize: 13 }}>Répartition des réclamations par statut</p></div></div><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "clamp(16px, 3vw, 35px)", flexWrap: "wrap", padding: "8px 0 14px" }}><div style={{ width: 170, height: 170, borderRadius: "50%", background: `conic-gradient(${gradient || "#e8edf5 0% 100%"})`, display: "grid", placeItems: "center", flexShrink: 0 }}><div style={{ width: 92, height: 92, borderRadius: "50%", background: "#fff", display: "grid", placeContent: "center", textAlign: "center" }}><strong style={{ fontSize: 24 }}>{analytics.total}</strong><span style={{ fontSize: 11, color: COLORS.muted }}>Réclamations</span><span style={{ fontSize: 11, color: COLORS.muted }}>au total</span></div></div><div style={{ flex: "1 1 180px", minWidth: 160 }}>{donut.map(item => <div key={item.label} style={{ display: "grid", gridTemplateColumns: "10px 1fr auto auto", alignItems: "center", gap: 9, padding: "10px 0", borderBottom: `1px solid ${COLORS.border}`, fontSize: 12 }}><span style={{ width: 9, height: 9, borderRadius: 99, background: item.color }} /><span>{item.label}</span><strong>{item.value}</strong><span style={{ color: COLORS.muted, width: 35, textAlign: "right" }}>{item.pct}%</span></div>)}</div></div></section>
    </div>

    <section style={{ ...card, padding: 18, overflow: "hidden" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}><div style={{ display: "flex", alignItems: "center", gap: 11 }}><div style={{ width: 38, height: 38, borderRadius: 12, background: "#e8f1ff", color: COLORS.blue, display: "grid", placeItems: "center", fontSize: 20 }}>♟</div><div><h2 style={{ margin: "1px 0 4px", fontSize: 17 }}>Clients et réclamations par statut</h2><p style={{ margin: 0, color: COLORS.muted, fontSize: 13 }}>Top 5 des clients avec le détail de chaque statut réel</p></div></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client…" aria-label="Rechercher un client" style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "10px 12px", outlineColor: COLORS.blue, minWidth: 190 }} />{onViewAllClients && <button onClick={onViewAllClients} style={{ ...btn, color: COLORS.blue }}>Voir tous les clients →</button>}</div></div>
      <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 1180, borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}><thead><tr style={{ background: "#f3f6fb", color: "#5c6e89" }}>{["#", "Client", "Email", "Total", "En attente", "Prise en charge", "Validée", "Fausse", "Annulée", "Autre", "Dernière activité"].map(h => <th key={h} style={{ padding: "12px 10px", fontWeight: 750, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead><tbody>{filteredClients.map((c, i) => <tr key={c.email} style={{ borderBottom: `1px solid ${COLORS.border}` }}><td style={{ padding: "12px 10px", color: COLORS.muted }}>{i + 1}</td><td style={{ padding: "12px 10px", fontWeight: 700, whiteSpace: "nowrap" }}><span style={{ display: "inline-grid", placeItems: "center", width: 32, height: 32, borderRadius: 99, background: ["#e8f1ff", "#e7f9ef", "#f0eaff", "#fff4df", "#ffe9ed"][i % 5], color: [COLORS.blue, COLORS.green, COLORS.purple, COLORS.gold, COLORS.red][i % 5], marginRight: 8, fontSize: 11, fontWeight: 800 }}>{initials(c.name)}</span>{c.name}</td><td style={{ padding: "12px 10px", color: COLORS.muted }}>{c.email}</td><td style={{ padding: "12px 10px", fontWeight: 800 }}>{c.count}</td>{[["Soumise", "#dbeafe", "#1d4ed8"], ["En cours", "#e0efff", "#2563eb"], ["Traitée", "#d1fae5", "#047857"], ["Fausse", "#ffe4e6", "#be123c"], ["Annulée", "#fff4df", "#a16207"], ["Autre", "#f0eaff", "#6d28d9"]].map(([key, bg, color]) => <td key={key} style={{ padding: "12px 10px" }}><span style={{ display: "inline-block", minWidth: 28, textAlign: "center", borderRadius: 999, padding: "4px 9px", background: bg, color, fontWeight: 800 }}>{c.statuses[key]}</span></td>)}<td style={{ padding: "12px 10px", color: COLORS.muted, whiteSpace: "nowrap" }}>{c.last ? `${formatDate(c.last)} ${c.last.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "—"}</td></tr>)}{!filteredClients.length && <tr><td colSpan="11" style={{ padding: 24, textAlign: "center", color: COLORS.muted }}>{loading ? "Chargement…" : "Aucun client trouvé pour ces critères."}</td></tr>}</tbody></table></div>
      <div style={{ color: COLORS.muted, fontSize: 11, marginTop: 13 }}>Les chiffres sont calculés depuis les statuts réels renvoyés par le serveur : Soumise = En attente ; En cours = Prise en charge ; Traitée = Validée ; Fausse et Annulée restent des catégories distinctes. Les statuts inconnus sont affichés sous « Autre statut » dans le graphique.</div>
    </section>
  </div>;
}
