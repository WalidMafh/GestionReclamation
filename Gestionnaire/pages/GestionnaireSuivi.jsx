import { useEffect, useMemo, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

const STATUS_META = {
  Soumise: { label: "En attente", color: "#a85b00", background: "#fff0c2" },
  "En cours": { label: "Prise en charge", color: "#205fc4", background: "#dceaff" },
  Traitée: { label: "Validée", color: "#087b59", background: "#c9f4e3" },
  Fausse: { label: "Fausse", color: "#c32929", background: "#ffe0e0" },
  Annulée: { label: "Annulée", color: "#596579", background: "#e7ebf1" },
};

function getDateValue(...values) {
  return values.find((value) => value && !Number.isNaN(new Date(value).getTime()));
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getReference(item) {
  return item.numeroReclamation || item.numero || item.reference || item._id || "—";
}

function getClientName(item) {
  const client = item.client || {};
  const directName = item.client_nom || item.clientNom || item.nomClient;
  const fullName = `${client.prenom || item.client_prenom || ""} ${client.nom || item.client_nom || ""}`.trim();
  return fullName || directName || client.name || "Client";
}

function getSubject(item) {
  return item.objet || item.sujet || item.typeReclamation || item.type || "Réclamation";
}

function getManagerId(user) {
  return String(user?._id || user?.id || user?.user_id || user?.userId || "");
}

function getAssignedManagerId(item) {
  return String(item.gestionnaire_id || item.gestionnaireId || item.assigned_manager_id || "");
}

function getAssignedManagerName(item) {
  return item.gestionnaire_nom || item.gestionnaireNom || item.gestionnaire_name || item.assigned_manager_name || "";
}

export default function GestionnaireSuivi({ gestionnaire, onViewReclamation }) {
  const [reclamations, setReclamations] = useState([]);
  const [activeTab, setActiveTab] = useState("mine");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReclamations = async () => {
    setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("gestionnaire_token");
      if (!token) throw new Error("Session gestionnaire introuvable.");

      const response = await fetch(`${API_URL}/gestionnaire/reclamations`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Impossible de charger les réclamations.");
      }
      setReclamations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReclamations();
  }, []);

  const managerId = getManagerId(gestionnaire);
  const managerName = `${gestionnaire?.prenom || ""} ${gestionnaire?.nom || ""}`.trim().toLowerCase();

  const mine = useMemo(() => {
    return reclamations.filter((item) => {
      const assignedId = getAssignedManagerId(item);
      if (managerId && assignedId) return assignedId === managerId;
      const assignedName = getAssignedManagerName(item).trim().toLowerCase();
      return Boolean(managerName && assignedName && assignedName === managerName);
    });
  }, [reclamations, managerId, managerName]);

  const recent = useMemo(() => {
    return [...reclamations].sort((a, b) => {
      const dateA = new Date(getDateValue(a.dateEnregistrement, a.dateCreation, a.dateSoumission) || 0).getTime();
      const dateB = new Date(getDateValue(b.dateEnregistrement, b.dateCreation, b.dateSoumission) || 0).getTime();
      return dateB - dateA;
    });
  }, [reclamations]);

  const tabItems = activeTab === "mine" ? mine : recent;
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tabItems;
    return tabItems.filter((item) => {
      const text = [
        getReference(item),
        getSubject(item),
        getClientName(item),
        item.client?.email,
        STATUS_META[item.statut]?.label || item.statut,
      ].join(" ").toLowerCase();
      return text.includes(query);
    });
  }, [tabItems, search]);

  const styles = {
    page: { padding: "28px clamp(16px, 2.4vw, 40px) 36px", color: "#17243b", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", minWidth: 0 },
    headingRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 },
    title: { fontSize: 27, lineHeight: 1.2, margin: 0, fontWeight: 850, letterSpacing: "-.6px" },
    subtitle: { margin: "8px 0 0", color: "#718096", fontSize: 13 },
    controls: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
    searchWrap: { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e2eaf4", borderRadius: 9, padding: "0 12px", minWidth: 230, flex: "1 1 230px", height: 42 },
    search: { border: 0, outline: 0, background: "transparent", width: "100%", minWidth: 0, color: "#17243b", fontSize: 12 },
    refresh: { border: 0, borderRadius: 9, background: "#2164e8", color: "#fff", padding: "12px 16px", fontWeight: 750, fontSize: 12, cursor: "pointer", transition: "transform .18s, filter .18s, box-shadow .18s" },
    tabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
    tab: { border: "1px solid #e3eaf3", background: "#fff", color: "#53647c", padding: "10px 16px", borderRadius: 9, fontWeight: 750, fontSize: 12, cursor: "pointer", transition: "all .18s" },
    activeTab: { background: "#2164e8", color: "#fff", borderColor: "#2164e8", boxShadow: "0 4px 10px rgba(33,100,232,.16)" },
    tableCard: { background: "#fff", border: "1px solid #e5ebf3", borderRadius: 13, overflow: "hidden", boxShadow: "0 5px 20px rgba(24,48,82,.035)" },
    tableWrap: { overflowX: "auto" },
    table: { borderCollapse: "collapse", width: "100%", minWidth: 850, fontSize: 12 },
    th: { background: "#f4f7fb", color: "#64748b", fontSize: 10, letterSpacing: ".35px", textAlign: "left", padding: "14px 15px", whiteSpace: "nowrap", borderBottom: "1px solid #e7edf5" },
    td: { padding: "15px", borderBottom: "1px solid #edf1f6", verticalAlign: "middle", color: "#33445d" },
    ref: { fontWeight: 800, color: "#17243b", whiteSpace: "nowrap" },
    status: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 20, fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" },
    view: { border: "1px solid #8ab5ff", borderRadius: 7, padding: "7px 12px", background: "#fff", color: "#2160c4", fontWeight: 800, cursor: "pointer", fontSize: 11, transition: "transform .18s, box-shadow .18s, background .18s" },
    state: { padding: 24, textAlign: "center", color: "#718096", fontSize: 13 },
    error: { background: "#fff0f0", color: "#b91c1c", padding: 16, borderRadius: 10, marginBottom: 14, fontSize: 12 },
  };

  return (
    <main style={styles.page}>
      <div style={styles.headingRow}>
        <div>
          <h1 style={styles.title}>Suivi des réclamations</h1>
          <p style={styles.subtitle}>Suivez l’évolution des réclamations prises en charge et consultez les dossiers récents.</p>
        </div>
        <div style={styles.controls}>
          <label style={styles.searchWrap}>
            <span aria-hidden="true" style={{ color: "#718096", fontSize: 18 }}>⌕</span>
            <input
              style={styles.search}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher une réclamation"
            />
          </label>
          <button style={styles.refresh} onClick={loadReclamations} onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.06)"; e.currentTarget.style.transform = "translateY(-1px)"; }} onMouseLeave={(e) => { e.currentTarget.style.filter = ""; e.currentTarget.style.transform = ""; }}>
            ↻ Actualiser
          </button>
        </div>
      </div>

      <div style={styles.tabs}>
        <button style={{ ...styles.tab, ...(activeTab === "mine" ? styles.activeTab : {}) }} onClick={() => setActiveTab("mine")}>
          Mes réclamations <span style={{ opacity: .8 }}>({mine.length})</span>
        </button>
        <button style={{ ...styles.tab, ...(activeTab === "recent" ? styles.activeTab : {}) }} onClick={() => setActiveTab("recent")}>
          Réclamations récentes <span style={{ opacity: .8 }}>({recent.length})</span>
        </button>
      </div>

      {error && <div style={styles.error}><strong>Impossible de charger les réclamations.</strong><div style={{ marginTop: 5 }}>{error}</div><button style={{ ...styles.view, marginTop: 10 }} onClick={loadReclamations}>Réessayer</button></div>}

      <section style={styles.tableCard}>
        {loading ? (
          <div style={styles.state}>Chargement des réclamations...</div>
        ) : filteredItems.length === 0 ? (
          <div style={styles.state}>
            {activeTab === "mine" ? "Vous n’avez pas encore de réclamation prise en charge." : "Aucune réclamation récente trouvée."}
          </div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>N°</th>
                  <th style={styles.th}>Objet</th>
                  <th style={styles.th}>Client</th>
                  <th style={styles.th}>Statut</th>
                  <th style={styles.th}>Date de prise en charge</th>
                  <th style={styles.th}>Dernière mise à jour</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const status = STATUS_META[item.statut] || { label: item.statut || "En attente", color: "#64748b", background: "#edf1f6" };
                  const id = item._id || item.id;
                  const dateAssigned = getDateValue(item.datePriseEnCharge, item.date_prise_en_charge);
                  const dateUpdated = getDateValue(item.dateModificationStatut, item.dateMiseAJour, item.dateEnregistrement, item.dateCreation);
                  return (
                    <tr key={id || getReference(item)}>
                      <td style={styles.td}><span style={styles.ref}>#{getReference(item)}</span></td>
                      <td style={styles.td}>{getSubject(item)}</td>
                      <td style={styles.td}>{getClientName(item)}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.status, color: status.color, background: status.background }}>
                          <span aria-hidden="true">●</span>{status.label}
                        </span>
                      </td>
                      <td style={styles.td}>{formatDate(dateAssigned)}</td>
                      <td style={styles.td}>{formatDate(dateUpdated)}</td>
                      <td style={styles.td}>
                        <button style={styles.view} onClick={() => onViewReclamation?.(id)} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 10px rgba(33,96,196,.14)"; }} onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                          ▣ Voir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
