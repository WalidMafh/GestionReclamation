import { useEffect, useMemo, useRef, useState } from "react";
import Login from "../Authentication/pages/Login.jsx";
import "./Admin.css";

const API = "http://127.0.0.1:8000";
const STATUS = {
  Soumise: ["En attente", "pending"],
  "En cours": ["Prise en charge", "progress"],
  Traitée: ["Validée", "done"],
  Fausse: ["Fausse", "false"],
  Annulée: ["Annulée", "cancelled"],
};
const emptyUser = { prenom: "", nom: "", email: "", password: "" };
const emptyAdmin = { ...emptyUser, confirmation: "" };
const msg = (data, fallback) => data?.detail || data?.message || fallback;
const dateLabel = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleDateString("fr-FR") : "—";
const dateTimeLabel = value => value && !Number.isNaN(new Date(value).getTime()) ? new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
const refOf = r => r.numeroReclamation || r.numero || r.reference || r._id || "—";
const clientOf = r => `${r.client?.prenom || r.clientPrenom || ""} ${r.client?.nom || r.clientNom || ""}`.trim() || "Client";

export default function AdminApp() {
  const [token, setToken] = useState(() => {
    const e = (sessionStorage.getItem("admin_last_email") || "").toLowerCase();
    // Compatibilité avec les deux formats de stockage utilisés par les écrans de connexion.
    return (e ? sessionStorage.getItem(`admin_access_token:${e}`) : "") ||
      sessionStorage.getItem("access_token") || "";
  });
  const [admin, setAdmin] = useState(() => {
    const e = (sessionStorage.getItem("admin_last_email") || "").toLowerCase();
    try { return e ? JSON.parse(sessionStorage.getItem(`admin_user:${e}`) || "null") : null; } catch { return null; }
  });
  const validPages = new Set(["dashboard", "gestionnaires", "create-admin", "create-gestionnaire", "reclamations", "suivi", "client-statistics", "statistics", "chat", "activity", "account", "settings"]);
  const pageFromUrl = () => {
    const value = window.location.hash.replace(/^#\/?/, "");
    return validPages.has(value) ? value : "dashboard";
  };
  const [page, setPageState] = useState(pageFromUrl);
  function setPage(next) {
    const target = typeof next === "function" ? next(page) : next;
    setPageState(target);
    if (window.location.hash !== `#${target}`) window.history.pushState({ adminPage: target }, "", `#${target}`);
  }
  useEffect(() => {
    const sync = () => setPageState(pageFromUrl());
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); };
  }, []);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [gestionnaires, setGestionnaires] = useState([]);
  const [reclamations, setReclamations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [selectedStatsManagerId, setSelectedStatsManagerId] = useState("");
  const managerDetailsRef = useRef(null);
  const [assigning, setAssigning] = useState(false);
  const [newUser, setNewUser] = useState(emptyUser);
  const [newAdmin, setNewAdmin] = useState(emptyAdmin);
  const [query, setQuery] = useState("");
  const [managerQuery, setManagerQuery] = useState("");
  const [filter, setFilter] = useState("Tous");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Scroll automatiquement vers les détails après la sélection d’un gestionnaire.
  useEffect(() => {
    if (!selectedStatsManagerId) return;
    const frame = requestAnimationFrame(() => {
      managerDetailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedStatsManagerId]);

  function normalizeToken(value) {
    if (typeof value === "string") return value.trim();
    if (value && typeof value === "object") {
      return normalizeToken(value.access_token || value.token || value.accessToken);
    }
    return "";
  }

  async function api(path, options = {}, authToken = token) {
    const usableToken =
      normalizeToken(authToken) ||
      normalizeToken(sessionStorage.getItem("access_token"));

    if (!usableToken) {
      throw new Error("Session expirée ou jeton absent. Déconnectez-vous puis reconnectez-vous.");
    }

    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
        Authorization: `Bearer ${usableToken}`,
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(msg(data, "Une erreur est survenue."));
    return data;
  }
  async function loadGestionnaires(authToken = token) {
    if (!authToken) return;
    setLoading(true); setError("");
    try { setGestionnaires(await api("/admin/gestionnaires", {}, authToken)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  async function loadReclamations(authToken = token) {
    if (!authToken) return;
    setLoading(true); setError("");
    try { setReclamations(await api("/admin/reclamations", {}, authToken)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  async function loadAll(authToken = token) { await Promise.all([loadGestionnaires(authToken), loadReclamations(authToken)]); }
  
useEffect(() => {
  if (!token || admin?.role !== "admin") return;

  // Chargement initial
  loadAll(token);

  // Actualisation automatique chaque 5 secondes
  const intervalId = setInterval(async () => {
    try {
      const data = await api("/admin/gestionnaires", {}, token);
      setGestionnaires(data);
    } catch (error) {
      console.error(
        "Erreur d'actualisation des gestionnaires :",
        error
      );
    }
  }, 5000);

  // Nettoyage à la fermeture du composant
  return () => clearInterval(intervalId);
}, [token, admin?.role]);

  

const loginSuccess = (user, accessToken) => {
  // Extraire le vrai token si une réponse complète est reçue
  const token =
    typeof accessToken === "string"
      ? accessToken
      : typeof user === "string"
        ? user
        : accessToken?.access_token ||
          accessToken?.token ||
          user?.access_token ||
          user?.token;

  const adminUser =
    user && typeof user === "object" && !Array.isArray(user)
      ? user
      : accessToken?.user;

  if (typeof token !== "string" || !token.trim()) {
    console.error("Login response:", {
      userType: typeof user,
      accessTokenType: typeof accessToken,
    });
    setError("Le token reçu après connexion est invalide.");
    return;
  }

  if (!adminUser || typeof adminUser !== "object") {
    setError("Les informations du compte sont invalides.");
    return;
  }

  const cleanToken = token.trim();

  const adminEmail = String(adminUser.email || "").trim().toLowerCase();
  sessionStorage.setItem("access_token", cleanToken);
  sessionStorage.setItem("current_user", JSON.stringify(adminUser));
  sessionStorage.setItem("admin_last_email", adminEmail);
  if (adminEmail) {
    sessionStorage.setItem(`admin_access_token:${adminEmail}`, cleanToken);
    sessionStorage.setItem(`admin_user:${adminEmail}`, JSON.stringify(adminUser));
  }

  setToken(cleanToken);
  setAdmin(adminUser);
  setError("");
  setSuccess("");

  loadAll(cleanToken);
};


  async function createGestionnaire(e) {
    e.preventDefault(); setError(""); setSuccess("");
    if (newUser.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    setSaving(true);
    try {
      const d = await api("/admin/gestionnaires", { method: "POST", body: JSON.stringify(newUser) });
      setSuccess(d.message || "Compte gestionnaire créé avec succès."); setNewUser(emptyUser); await loadGestionnaires();
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function createAdmin(e) {
    e.preventDefault(); setError(""); setSuccess("");
    if (newAdmin.password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (newAdmin.password !== newAdmin.confirmation) return setError("Les mots de passe ne correspondent pas.");
    setSaving(true);
    try {
      const { confirmation, ...payload } = newAdmin;
      const d = await api("/admin/admins", { method: "POST", body: JSON.stringify(payload) });
      setSuccess(d.message || "Compte administrateur créé avec succès."); setNewAdmin(emptyAdmin);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  }
  async function deleteGestionnaire(g) {
    if (!window.confirm(`Supprimer le compte de ${g.prenom} ${g.nom} (${g.email}) ?`)) return;
    setError(""); setSuccess("");
    try {
      const d = await api(`/admin/gestionnaires/${g.id}`, { method: "DELETE" });
      setGestionnaires(old => old.filter(x => x.id !== g.id)); setSuccess(d.message || "Compte supprimé.");
    } catch (err) { setError(err.message); }
  }
  async function viewReclamation(id) {
    setError(""); setSelected(null);
    try { setSelected(await api(`/admin/reclamations/${id}`)); } catch (err) { setError(err.message); }
  }
  async function updateStatus(r, statut) {
    setError(""); setSuccess("");
    try {
      const d = await api(`/admin/reclamations/${r._id}/statut`, { method: "PATCH", body: JSON.stringify({ statut }) });
      setReclamations(old => old.map(x => x._id === r._id ? { ...x, statut: d.statut || statut } : x));
      setSelected(old => old?._id === r._id ? { ...old, statut: d.statut || statut } : old);
      setSuccess("Statut de la réclamation mis à jour.");
    } catch (err) { setError(err.message); }
  }
  async function reassignGestionnaire() {
    if (!assignTarget || !selectedManagerId) {
      setError("Choisissez un gestionnaire.");
      return;
    }
    setAssigning(true); setError(""); setSuccess("");
    try {
      const d = await api(`/admin/reclamations/${assignTarget._id}/affectation`, {
        method: "PATCH",
        body: JSON.stringify({ gestionnaire_id: selectedManagerId }),
      });
      const updated = { ...assignTarget, ...d.reclamation };
      setReclamations(old => old.map(r => r._id === updated._id ? { ...r, ...updated } : r));
      setSelected(old => old?._id === updated._id ? { ...old, ...updated } : old);
      setAssignTarget(null); setSelectedManagerId("");
      setSuccess(d.message || "Gestionnaire réaffecté avec succès.");
    } catch (err) { setError(err.message); }
    finally { setAssigning(false); }
  }

  async function handleAdminFile(reclamation, fileIndex, download = false) {
    try {
      const usableToken = normalizeToken(token) || normalizeToken(sessionStorage.getItem("access_token"));
      if (!usableToken) throw new Error("Session expirée ou jeton absent. Reconnectez-vous.");
      const response = await fetch(`${API}/admin/reclamations/${reclamation._id}/files/${fileIndex}?download=${download}`, {
        headers: { Authorization: `Bearer ${usableToken}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || "Impossible d’ouvrir cette pièce jointe.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement("a"); link.href = url;
        link.download = reclamation.files?.[fileIndex]?.name || "piece-jointe";
        document.body.appendChild(link); link.click(); link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (err) { setError(err.message || "Une erreur est survenue."); }
  }

  function logout() {
    const e = String(admin?.email || sessionStorage.getItem("admin_last_email") || "").toLowerCase();
    if (e) { sessionStorage.removeItem(`admin_access_token:${e}`); sessionStorage.removeItem(`admin_user:${e}`); }
    ["admin_last_email", "access_token", "current_user", "gestionnaire_token", "gestionnaire_user"].forEach(k => sessionStorage.removeItem(k));
    setToken(""); setAdmin(null); window.location.assign("/");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reclamations.filter(r => (filter === "Tous" || (r.statut || "Soumise") === filter) &&
      (!q || `${refOf(r)} ${clientOf(r)} ${r.client?.email || ""} ${r.typeReclamation || r.type || ""} ${r.statut || ""}`.toLowerCase().includes(q)));
  }, [reclamations, query, filter]);
  const filteredGestionnaires = useMemo(() => {
    const q = managerQuery.trim().toLowerCase();
    return gestionnaires.filter(g => `${g.prenom || ""} ${g.nom || ""} ${g.email || ""}`.toLowerCase().includes(q));
  }, [gestionnaires, managerQuery]);
  const stats = {
    total: reclamations.length,
    pending: reclamations.filter(r => (r.statut || "Soumise") === "Soumise").length,
    progress: reclamations.filter(r => r.statut === "En cours").length,
    done: reclamations.filter(r => r.statut === "Traitée").length,
    managers: gestionnaires.length,
  };
  if (!(token && admin?.role === "admin")) return <Login onLoginSuccess={loginSuccess} onCreateAccount={() => window.location.assign("/")} />;

  const menu = [["dashboard","Tableau de bord","⌂"],["gestionnaires","Gestion des gestionnaires","♧"],["create-admin","Créer un compte Admin","♙+"],["reclamations","Gestion des réclamations","▤"],["suivi","Suivi des gestionnaires","◷"],["client-statistics","Statistiques clients","▥"],["statistics","Statistiques globales","▤"],["chat","Conversations","◌"],["activity","Journal d'activité","⌁"]];
  const accountMenu = [["account","Mon compte","♙"],["settings","Paramètres","⚙"]];
  const heading = (tag, title, description) => <div className="admin-page-heading"><span className="admin-eyebrow">{tag}</span><h1>{title}</h1><p>{description}</p></div>;
  const form = (isAdmin = false) => {
    const values = isAdmin ? newAdmin : newUser, setter = isAdmin ? setNewAdmin : setNewUser;
    const fields = [["prenom","Prénom","text","Entrez le prénom"],["nom","Nom","text","Entrez le nom"],["email","Adresse email","email","Entrez l’adresse email"],["password","Mot de passe","password","8 caractères minimum"],...(isAdmin ? [["confirmation","Confirmer le mot de passe","password","Confirmez le mot de passe"]] : [])];
    return <form className="admin-form" onSubmit={isAdmin ? createAdmin : createGestionnaire}><div className="admin-form-grid">
      {fields.map(([key,label,type,placeholder]) => <label className={`admin-field ${key === "email" ? "full" : ""}`} key={key}><span>{label} <b>*</b></span><input required type={type} minLength={key === "password" ? 8 : undefined} autoComplete={type === "password" ? "new-password" : undefined} placeholder={placeholder} value={values[key]} onChange={e => setter({ ...values, [key]: e.target.value })}/>{key === "password" && <small>Le mot de passe doit contenir au moins 8 caractères.</small>}</label>)}
    </div><button className="admin-primary-button" disabled={saving}>{saving ? "Enregistrement..." : isAdmin ? "♙+  Créer l’administrateur" : "+  Créer le compte gestionnaire"}</button></form>;
  };

  return <div className="admin-shell">
    <aside className={`admin-sidebar ${sidebarOpen ? "" : "is-collapsed"}`}>
      <div className="admin-logo-wrap"><img src="/cat-logo.png" alt="CAT Assurance & Réassurance" onError={e => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "block"; }}/><div className="admin-logo-fallback">CAT<small>Assurance & Réassurance</small></div></div>
      <div className="admin-menu-caption">{sidebarOpen ? "MENU PRINCIPAL" : "MENU"}</div>
      <nav className="admin-nav">{menu.map(([id,label,icon]) => <button key={id} className={`admin-nav-item ${page === id ? "active" : ""}`} onClick={() => { setPage(id); setError(""); setSuccess(""); setSelected(null); }} title={label}><span className="admin-nav-icon">{icon}</span>{sidebarOpen && <span>{label}</span>}</button>)}</nav>
      <div className="admin-menu-caption admin-account-caption">{sidebarOpen ? "MON ESPACE" : "ESPACE"}</div>
      <nav className="admin-nav">{accountMenu.map(([id,label,icon]) => <button key={id} className={`admin-nav-item ${page === id ? "active" : ""}`} onClick={() => setPage(id)} title={label}><span className="admin-nav-icon">{icon}</span>{sidebarOpen && <span>{label}</span>}</button>)}</nav>
      <div className="admin-sidebar-bottom"><div className="admin-user-avatar">{(admin.prenom || "A").slice(0,1).toUpperCase()}</div>{sidebarOpen && <div className="admin-user-copy"><strong>{admin.prenom} {admin.nom}</strong><span>{admin.email}</span></div>}<button className="admin-logout" onClick={logout}>↪ {sidebarOpen ? "Se déconnecter" : ""}</button></div>
    </aside>
    <div className="admin-main-column">
      <header className="admin-topbar"><div className="admin-topbar-left"><button className="admin-menu-toggle" onClick={() => setSidebarOpen(v => !v)} aria-label="Afficher ou masquer le menu">☰</button><div><strong>Gestion des Réclamations</strong><span>Espace administrateur</span></div></div><div className="admin-topbar-user"><div className="admin-top-avatar">{(admin.prenom || "A").slice(0,1).toUpperCase()}</div><div><strong>{admin.prenom} {admin.nom}</strong><span>Administrateur</span></div></div></header>
      <main className="admin-main">
        {error && <div className="admin-alert error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
        {success && <div className="admin-alert success" role="status">{success}<button onClick={() => setSuccess("")}>×</button></div>}
        {page === "dashboard" && <>
          {heading("ESPACE ADMINISTRATEUR","Tableau de bord","Vue globale des réclamations et des opérations de la plateforme.")}
          <section className="admin-welcome admin-welcome-hero">
            <div className="admin-welcome-mark">CAT</div>
            <div className="admin-welcome-copy">
              <span>CAT ASSURANCE &amp; RÉASSURANCE</span>
              <h2>Bonjour {admin.prenom || "Salah"}, bienvenue dans votre espace administrateur 👋</h2>
              <p>Supervisez les équipes et les réclamations depuis un seul endroit.</p>
            </div>
            <span className="admin-live-pill"><i /> Espace opérationnel</span>
          </section>
          <div className="admin-dashboard-total">
            <div className="admin-dashboard-total-icon">#</div>
            <div>
              <span>TOTAL</span>
              <strong>{stats.total}</strong>
              <small>Réclamations enregistrées</small>
            </div>
          </div>
          <div className="admin-dashboard-section-head">
            <div>
              <span>VUE SYNTHÉTIQUE</span>
              <h2>Réclamations par statut</h2>
              <p>Cliquez sur une carte pour consulter les dossiers correspondants.</p>
            </div>
            <button className="admin-soft-button" onClick={() => loadAll()} disabled={loading}>
              {loading ? "Chargement..." : "↻ Actualiser"}
            </button>
          </div>
          <div className="admin-status-cards">
            {[
              ["pending", "!", "EN ATTENTE", stats.pending, "En attente de traitement", "Soumise"],
              ["progress", "◷", "PRISE EN CHARGE", stats.progress, "Traitement en cours", "En cours"],
              ["done", "✓", "VALIDÉES", stats.done, "Réclamations validées", "Traitée"],
              ["false", "×", "FAUSSES", reclamations.filter(r => r.statut === "Fausse").length, "Réclamations signalées", "Fausse"],
              ["cancelled", "−", "ANNULÉES", reclamations.filter(r => r.statut === "Annulée").length, "Dossiers annulés", "Annulée"]
            ].map(([tone, icon, label, value, description, status]) => (
              <button
                type="button"
                className={`admin-status-card ${tone}`}
                key={tone}
                onClick={() => {
                  setFilter(status);
                  setPage("reclamations");
                  setSelected(null);
                }}
              >
                <span className="admin-status-icon">{icon}</span>
                <span className="admin-status-copy">
                  <small>{label}</small>
                  <strong>{value}</strong>
                  <em>{description}</em>
                </span>
                <span className="admin-status-arrow">↗</span>
              </button>
            ))}
          </div>
        </>}
        {page === "gestionnaires" && <>
          {heading("GESTION DES COMPTES", "Gestion des gestionnaires", "Consultez les comptes et vérifiez leur disponibilité en temps réel.")}
          <section className="admin-card">
            <div className="admin-card-heading admin-manager-list-heading">
              <div><h2>Liste des gestionnaires</h2><p>{gestionnaires.length} compte(s) enregistré(s)</p></div>
              <div className="admin-manager-toolbar">
                <button className="admin-soft-button" disabled={loading} onClick={loadGestionnaires}>{loading ? "Chargement..." : "↻ Actualiser"}</button>
                <button className="admin-manager-create-button" onClick={() => { setPage("create-gestionnaire"); setError(""); setSuccess(""); }}>＋ Créer un compte gestionnaire</button>
              </div>
            </div>
            <label className="admin-search admin-manager-search">⌕ <input placeholder="Rechercher par nom ou email..." value={managerQuery} onChange={e => setManagerQuery(e.target.value)} /></label>
            {loading ? <p className="admin-empty">Chargement des gestionnaires...</p> : <div className="admin-table-wrap"><table className="admin-table admin-manager-table"><thead><tr><th>Gestionnaire</th><th>Adresse email</th><th>Statut actuel</th><th>Dernière activité</th><th>Date de création</th><th>Action</th></tr></thead><tbody>
              {filteredGestionnaires.map(g => <tr key={g.id}>
                <td><div className="admin-manager-person"><span className="admin-manager-avatar">{(g.prenom || g.nom || "G").slice(0,1).toUpperCase()}</span><strong>{g.prenom} {g.nom}</strong></div></td>
                <td>{g.email}</td>
                <td><span className={`admin-online-status ${g.enLigne ? "is-online" : "is-offline"}`}><i />{g.enLigne ? "En ligne" : "Hors ligne"}</span></td>
                <td>{g.derniereActivite ? dateTimeLabel(g.derniereActivite) : "Aucune activité récente"}</td>
                <td>{dateLabel(g.dateCreation)}</td>
                <td><button className="admin-danger-button" onClick={() => deleteGestionnaire(g)}>Supprimer</button></td>
              </tr>)}
            </tbody></table>{!filteredGestionnaires.length && <p className="admin-empty">{managerQuery ? "Aucun résultat pour cette recherche." : "Aucun gestionnaire à afficher."}</p>}</div>}
            <p className="admin-online-note">Le statut est calculé à partir du dernier signal envoyé par l’application du gestionnaire. Un compte est considéré en ligne si son signal date de moins de 90 secondes.</p>
          </section>
        </>}
        {page === "create-gestionnaire" && <>
          {heading("GESTION DES COMPTES", "Créer un compte gestionnaire", "Ajoutez un membre à votre équipe en renseignant ses informations.")}
          <section className="admin-card admin-create-layout"><div>
            <div className="admin-card-heading"><div className="admin-section-title"><span>01</span><div><h2>Informations du compte</h2><p>Les champs marqués d’un astérisque sont obligatoires.</p></div></div><button className="admin-soft-button" onClick={() => setPage("gestionnaires")}>← Retour à la liste</button></div>
            {form(false)}
          </div><aside className="admin-info-column"><div className="admin-info-box"><h3>ⓘ &nbsp; À propos du compte</h3><p>Le gestionnaire pourra se connecter à son espace pour consulter et traiter les réclamations qui lui sont accessibles.</p><ul><li>Utilisez une adresse email unique</li><li>Le mot de passe doit contenir au moins 8 caractères</li><li>Le statut en ligne sera basé sur l’activité réelle de sa session</li></ul></div><div className="admin-security-box"><h3>⬟ &nbsp; Sécurité</h3><p>Transmettez les identifiants uniquement au gestionnaire concerné.</p></div></aside></section>
        </>}
        {page === "create-admin" && <>{heading("ESPACE ADMINISTRATEUR","Créer un compte Admin","Ajoutez un nouvel administrateur à la plateforme avec les informations ci-dessous.")}<section className="admin-card admin-create-layout"><div><div className="admin-section-title"><span>01</span><div><h2>Informations du compte</h2><p>Remplissez les informations pour créer un nouvel administrateur.</p></div></div>{form(true)}</div><aside className="admin-info-column"><div className="admin-info-box"><h3>ⓘ &nbsp; Informations importantes</h3><p>L’administrateur aura un accès complet à la plateforme et pourra :</p><ul><li>Gérer les gestionnaires</li><li>Créer d’autres administrateurs</li><li>Accéder à toutes les réclamations</li><li>Voir les statistiques globales</li><li>Gérer les paramètres du système</li></ul></div><div className="admin-security-box"><h3>⬟ &nbsp; Sécurité</h3><p>Créez des comptes administrateurs uniquement pour les personnes autorisées.</p></div></aside></section></>}
        {page === "reclamations" && <>
          {!selected && heading("ESPACE ADMINISTRATEUR", "Réclamations", "Gestion et suivi de toutes les réclamations clients.")}
          {!selected && <><div className="admin-reclamations-head"><button className="admin-soft-button" onClick={loadReclamations} disabled={loading}>{loading ? "Chargement..." : "↻ Actualiser"}</button></div>
          <section className="admin-card admin-reclamations-card">
            <div className="admin-reclamations-toolbar">
              <label className="admin-search admin-reclamations-search">⌕ <input placeholder="Rechercher une réclamation, un client..." value={query} onChange={e => setQuery(e.target.value)} /></label>
              <select value={filter} onChange={e => setFilter(e.target.value)} className="admin-reclamation-filter"><option value="Tous">Tous les statuts</option>{Object.keys(STATUS).map(st => <option key={st} value={st}>{STATUS[st][0]}</option>)}</select>
            </div>
            <div className="admin-reclamations-count"><strong>{filtered.length}</strong> réclamation{filtered.length !== 1 ? "s" : ""} trouvée{filtered.length !== 1 ? "s" : ""}</div>
            {loading ? <p className="admin-empty">Chargement des réclamations...</p> : <ReclamationTable items={filtered} onView={viewReclamation} />}
          </section></>}
          {selected && <section className="admin-reclamation-detail">
            <div className="admin-detail-heading"><div><button className="admin-back-button" onClick={() => setSelected(null)}>← Retour à la liste</button><div className="admin-detail-title-line"><h2>Détails de la réclamation</h2><span className="admin-reference-pill">{refOf(selected)}</span></div></div><button className="admin-soft-button" onClick={() => window.print()}>▣ Imprimer</button></div>
            <div className="admin-detail-top-grid">
              <section className="admin-detail-panel"><h3>Informations client</h3><div className="admin-detail-client"><span className="admin-detail-avatar">{clientOf(selected).slice(0,1).toUpperCase()}</span><div><strong>{clientOf(selected)}</strong><span>{selected.client?.email || "Email non renseigné"}</span><span>☎ {selected.client?.telephone || selected.clientTelephone || "Téléphone non renseigné"}</span><span>⌖ {selected.client?.adresse || selected.clientAdresse || "Adresse non renseignée"}</span></div></div></section>
              <section className="admin-detail-panel admin-detail-status-panel"><h3>Statut actuel</h3><span className={`admin-status ${(STATUS[selected.statut] || STATUS.Soumise)[1]}`}>{(STATUS[selected.statut] || STATUS.Soumise)[0]}</span><div className="admin-manager-current"><strong>Prise en charge par :</strong><span>{selected.gestionnaire_nom || selected.gestionnaireNom || "Non attribuée"}</span></div><div className="admin-manager-current"><strong>Depuis le :</strong><span>{selected.datePriseEnCharge ? dateTimeLabel(selected.datePriseEnCharge) : "En attente de prise en charge"}</span></div></section>
              <section className="admin-detail-panel admin-detail-actions"><h3>Actions</h3><label className="admin-field"><span>Modifier le statut</span><select value={selected.statut || "Soumise"} onChange={e => updateStatus(selected,e.target.value)}>{Object.entries(STATUS).map(([key,value]) => <option key={key} value={key}>{value[0]}</option>)}</select></label><button className="admin-reassign-button" onClick={() => { setAssignTarget(selected); setSelectedManagerId(selected.gestionnaire_id || ""); setError(""); }}>♙ Réaffecter le gestionnaire</button></section>
            </div>
            <div className="admin-detail-lower-grid">
              <section className="admin-detail-panel"><h3>Détails de la réclamation</h3><div className="admin-detail-rows">
                {[['Objet', selected.objet || selected.sujet || selected.type || '—'],['Catégorie', selected.categorie || selected.type || '—'],['Police', selected.police || '—'],['Attestation', selected.attestation || '—'],["Type d'immatriculation", selected.matriculeType || '—'],['Immatriculation', selected.matricule || '—'],['Date de soumission', dateTimeLabel(selected.dateEnregistrement || selected.dateCreation)]].map(([label,value]) => <div className="admin-detail-row" key={label}><strong>{label}</strong><span>{value}</span></div>)}
                <div className="admin-detail-row admin-description-row"><strong>Description</strong><span>{selected.commentaire || selected.description || selected.message || "Aucune description fournie."}</span></div>
              </div></section>
              <section className="admin-detail-panel"><h3>Pièces jointes <span className="admin-files-count">{Array.isArray(selected.files) ? selected.files.length : 0}</span></h3>{!selected.files?.length ? <p className="admin-empty">Aucune pièce jointe.</p> : <div className="admin-files-list">{selected.files.map((file,index) => <div className="admin-file-row" key={`${file.name}-${index}`}><span className="admin-file-icon">▤</span><div className="admin-file-name"><strong>{file.name || `Fichier ${index+1}`}</strong><small>{file.type || "Fichier joint"}{file.size !== undefined ? ` · ${(file.size/1024).toFixed(2)} Ko` : ""}</small></div><div className="admin-file-actions"><button onClick={() => handleAdminFile(selected,index,false)}>Voir</button><button onClick={() => handleAdminFile(selected,index,true)}>⇩ Télécharger</button></div></div>)}</div>}</section>
            </div>
          </section>}
        </>}
        {assignTarget && <div className="admin-modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !assigning) setAssignTarget(null); }}><section className="admin-assign-modal" role="dialog" aria-modal="true" aria-labelledby="admin-assign-title"><button className="admin-modal-close" onClick={() => setAssignTarget(null)} aria-label="Fermer">×</button><span className="admin-eyebrow">GESTION DES DOSSIERS</span><h2 id="admin-assign-title">Réaffecter le gestionnaire</h2><p>Choisissez le nouveau responsable de la réclamation <strong>{refOf(assignTarget)}</strong>.</p><label className="admin-field"><span>Nouveau gestionnaire</span><select value={selectedManagerId} onChange={e => setSelectedManagerId(e.target.value)} required><option value="">Sélectionner un gestionnaire</option>{gestionnaires.map(g => <option key={g.id} value={g.id}>{g.prenom} {g.nom} — {g.email}</option>)}</select></label><div className="admin-modal-actions"><button className="admin-soft-button" disabled={assigning} onClick={() => setAssignTarget(null)}>Annuler</button><button className="admin-primary-button" disabled={assigning || !selectedManagerId} onClick={reassignGestionnaire}>{assigning ? "Enregistrement..." : "Confirmer la réaffectation"}</button></div></section></div>}
        {page === "suivi" && (() => {
          const managerStats = gestionnaires.map(g => {
            const managerClaims = reclamations.filter(r =>
              (r.gestionnaire_id && String(r.gestionnaire_id) === String(g.id)) ||
              (!r.gestionnaire_id && r.gestionnaire_nom &&
                String(r.gestionnaire_nom).trim().toLowerCase() ===
                `${g.prenom || ""} ${g.nom || ""}`.trim().toLowerCase())
            );
            const validated = managerClaims.filter(r => r.statut === "Traitée").length;
            const refused = managerClaims.filter(r => ["Fausse", "Annulée"].includes(r.statut)).length;
            const inProgress = managerClaims.filter(r => r.statut === "En cours").length;
            const pending = managerClaims.filter(r => !r.statut || r.statut === "Soumise").length;
            return { ...g, claims: managerClaims, total: managerClaims.length, validated, refused, inProgress, pending,
              rate: managerClaims.length ? Math.round(validated / managerClaims.length * 100) : 0 };
          });
          const chosenManager = managerStats.find(g => g.id === selectedStatsManagerId);
          const allAssigned = managerStats.reduce((sum, g) => sum + g.total, 0);
          const allValidated = managerStats.reduce((sum, g) => sum + g.validated, 0);
          const allRefused = managerStats.reduce((sum, g) => sum + g.refused, 0);
          return <>
            <style>{`
              .admin-stats-grid { gap: 18px; }
              .admin-stat-card {
                border: 1px solid #e2e8f5;
                border-radius: 20px;
                box-shadow: 0 8px 24px rgba(23, 42, 79, .045);
                transition: transform .2s ease, box-shadow .2s ease;
              }
              .admin-stat-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px rgba(23, 42, 79, .09); }
              .manager-performance-row { cursor: pointer; transition: background .18s ease, box-shadow .18s ease; }
              .manager-performance-row:hover { background: #f0f6ff !important; }
              .manager-performance-row:focus-visible { outline: 2px solid #4385ff; outline-offset: -2px; }
              .manager-performance-row.is-selected { background: #edf4ff !important; box-shadow: inset 4px 0 #3478f6; }
              .manager-performance-row td { transition: color .18s ease; }
              .manager-details-button { white-space: nowrap; }
              .manager-performance-row .admin-manager-avatar { transition: transform .2s ease, box-shadow .2s ease; }
              .manager-performance-row:hover .admin-manager-avatar { transform: scale(1.07); box-shadow: 0 5px 12px rgba(103, 54, 220, .14); }
              .admin-card { box-shadow: 0 12px 36px rgba(20, 37, 70, .045); }
              .manager-metric-card { position:relative; overflow:hidden; border-top:3px solid var(--metric-color,#3478f6); background:linear-gradient(145deg,#fff 0%,var(--metric-tint,#f5f8ff) 100%); }
              .manager-metric-card::after { content:""; position:absolute; width:76px; height:76px; right:-24px; top:-25px; border-radius:50%; background:var(--metric-tint,#eef4ff); opacity:.9; }
              .manager-metric-label { display:flex; align-items:center; gap:9px; position:relative; z-index:1; }
              .manager-metric-icon { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; flex:0 0 34px; border-radius:11px; background:var(--metric-tint,#eef4ff); color:var(--metric-color,#3478f6); font-size:17px; box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--metric-color,#3478f6) 12%,transparent); }
              .manager-metric-card strong { display:block; color:var(--metric-color,#1c2a42); position:relative; z-index:1; }
              .manager-metric-card small { position:relative; z-index:1; }
              .manager-section-title { display:flex; align-items:center; gap:10px; }
              .manager-section-title .manager-section-icon { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:13px; background:#edf4ff; color:#3478f6; font-size:20px; }
              .manager-table-icon { display:inline-flex; align-items:center; justify-content:center; width:25px; height:25px; border-radius:8px; margin-right:7px; background:#eef4ff; color:#3478f6; }
              .manager-detail-enter {
                scroll-margin-top: 28px;
                border: 1px solid #dce8fb;
                background: linear-gradient(145deg, #ffffff 0%, #fbfdff 70%, #f5f8ff 100%);
                box-shadow: 0 18px 44px rgba(42, 83, 151, .10);
                overflow: hidden;
                position: relative;
              }
              .manager-detail-enter::before {
                content: "";
                position: absolute;
                inset: 0 auto 0 0;
                width: 4px;
                background: linear-gradient(180deg, #7c3aed, #3478f6, #16b890);
              }
              .manager-detail-enter .admin-card-heading { padding-bottom: 18px; border-bottom: 1px solid #edf1f8; }
              .manager-detail-enter .admin-stats-grid { margin: 18px 0 22px; }
              .manager-detail-enter .admin-stat-card { background: rgba(255,255,255,.94); }
              .manager-detail-enter .admin-table-wrap { border-radius: 16px; overflow: hidden; }
              .manager-detail-enter .admin-table tbody tr { transition: background .18s ease; }
              .manager-detail-enter .admin-table tbody tr:hover { background: #f1f6ff; }
              .manager-detail-enter .admin-soft-button { transition: transform .18s ease, box-shadow .18s ease; }
              .manager-detail-enter .admin-soft-button:hover { transform: translateY(-1px); box-shadow: 0 7px 16px rgba(52,120,246,.12); }
              .manager-detail-enter { animation: managerDetailIn .3s cubic-bezier(.2,.75,.25,1) both; }
              @keyframes managerDetailIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
              @media (prefers-reduced-motion: reduce) {
                .admin-stat-card, .manager-performance-row, .manager-performance-row .admin-manager-avatar { transition: none; }
                .manager-detail-enter { animation: none; }
              }
            `}</style>
            {heading("PERFORMANCE DE L’ÉQUIPE","Suivi des gestionnaires","Consultez les dossiers pris en charge, validés et refusés par chaque gestionnaire.")}
            <div className="admin-stats-grid">
              <div className="admin-stat-card manager-metric-card" style={{"--metric-color":"#7c3aed","--metric-tint":"#f3eaff"}}><span className="manager-metric-label"><i className="manager-metric-icon">♙</i>Gestionnaires</span><strong>{gestionnaires.length}</strong><small>Comptes enregistrés</small></div>
              <div className="admin-stat-card manager-metric-card" style={{"--metric-color":"#3478f6","--metric-tint":"#eaf2ff"}}><span className="manager-metric-label"><i className="manager-metric-icon">▣</i>Dossiers affectés</span><strong>{allAssigned}</strong><small>Réclamations attribuées à l’équipe</small></div>
              <div className="admin-stat-card manager-metric-card" style={{"--metric-color":"#079669","--metric-tint":"#e5fbf2"}}><span className="manager-metric-label"><i className="manager-metric-icon">✓</i>Dossiers validés</span><strong>{allValidated}</strong><small>Statut : Traitée</small></div>
              <div className="admin-stat-card manager-metric-card" style={{"--metric-color":"#dc4545","--metric-tint":"#fff0f0"}}><span className="manager-metric-label"><i className="manager-metric-icon">!</i>Dossiers refusés / annulés</span><strong>{allRefused}</strong><small>Statut : Fausse ou Annulée</small></div>
            </div>
            <section className="admin-card">
              <div className="admin-card-heading">
                <div className="manager-section-title"><span className="manager-section-icon">▥</span><div><h2>Performance par gestionnaire</h2><p>Les chiffres sont calculés à partir des réclamations actuellement affectées à chaque compte.</p></div></div>
                <button className="admin-soft-button" onClick={() => loadAll()} disabled={loading}>{loading ? "Chargement..." : "↻ Actualiser"}</button>
              </div>
              <label className="admin-search admin-manager-search">⌕ <input placeholder="Rechercher un gestionnaire par nom ou email..." value={managerQuery} onChange={e => setManagerQuery(e.target.value)} /></label>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th><span className="manager-table-icon">♙</span>Gestionnaire</th><th><span className="manager-table-icon">▣</span>Total affecté</th><th><span className="manager-table-icon" style={{background:"#e5fbf2",color:"#079669"}}>✓</span>Validées</th><th><span className="manager-table-icon" style={{background:"#fff0f0",color:"#dc4545"}}>!</span>Refusées / annulées</th><th><span className="manager-table-icon" style={{background:"#fff6df",color:"#b77905"}}>◷</span>En cours</th><th><span className="manager-table-icon">◌</span>En attente</th><th><span className="manager-table-icon" style={{background:"#e5fbf2",color:"#079669"}}>↗</span>Taux de validation</th><th><span className="manager-table-icon">⌕</span>Détails</th></tr></thead>
                  <tbody>
                    {managerStats.filter(g => `${g.prenom || ""} ${g.nom || ""} ${g.email || ""}`.toLowerCase().includes(managerQuery.trim().toLowerCase())).map(g => (
                      <tr
                        key={g.id}
                        className={`manager-performance-row ${selectedStatsManagerId === g.id ? "is-selected" : ""}`}
                        onClick={() => setSelectedStatsManagerId(old => old === g.id ? "" : g.id)}
                        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedStatsManagerId(old => old === g.id ? "" : g.id); } }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Afficher les détails de ${g.prenom || ""} ${g.nom || ""}`}
                        title="Cliquer pour afficher les détails du gestionnaire"
                      >
                        <td><div className="admin-manager-person"><span className="admin-manager-avatar">{(g.prenom || g.nom || "G").slice(0,1).toUpperCase()}</span><div><strong>{g.prenom} {g.nom}</strong><br/><small>{g.email}</small></div></div></td>
                        <td><strong>{g.total}</strong></td><td><strong style={{color:"#07845e"}}>{g.validated}</strong></td>
                        <td><strong style={{color:"#c2413b"}}>{g.refused}</strong></td><td>{g.inProgress}</td><td>{g.pending}</td>
                        <td><div style={{minWidth:110}}><strong>{g.rate}%</strong><div style={{height:7,background:"#e8edf5",borderRadius:99,overflow:"hidden",marginTop:6}}><div style={{height:"100%",width:`${g.rate}%`,background:"#16a779",borderRadius:99}} /></div></div></td>
                        <td><button className="admin-soft-button manager-details-button" onClick={e => { e.stopPropagation(); setSelectedStatsManagerId(old => old === g.id ? "" : g.id); }}>{selectedStatsManagerId === g.id ? "Masquer" : "Voir détails"} ↗</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!managerStats.filter(g => `${g.prenom || ""} ${g.nom || ""} ${g.email || ""}`.toLowerCase().includes(managerQuery.trim().toLowerCase())).length && <p className="admin-empty">Aucun gestionnaire trouvé.</p>}
              </div>
              <p className="admin-online-note">Les dossiers sont comptés selon leur affectation actuelle. « Refusées / annulées » regroupe les statuts « Fausse » et « Annulée ». Les dossiers sans gestionnaire affecté ne sont pas inclus dans les statistiques individuelles.</p>
            </section>
            {chosenManager && <section ref={managerDetailsRef} className="admin-card manager-detail-enter" style={{marginTop:24}} tabIndex={-1}>
              <div className="admin-card-heading"><div><h2>Détails — {chosenManager.prenom} {chosenManager.nom}</h2><p>{chosenManager.email} · {chosenManager.total} dossier(s) affecté(s)</p></div><button className="admin-soft-button" onClick={() => setSelectedStatsManagerId("")}>Fermer</button></div>
              <div className="admin-stats-grid">
                <div className="admin-stat-card"><span>Total affecté</span><strong>{chosenManager.total}</strong><small>Tous les statuts</small></div>
                <div className="admin-stat-card"><span>Validées</span><strong>{chosenManager.validated}</strong><small>Traitée</small></div>
                <div className="admin-stat-card"><span>Refusées / annulées</span><strong>{chosenManager.refused}</strong><small>Fausse ou Annulée</small></div>
                <div className="admin-stat-card"><span>En cours</span><strong>{chosenManager.inProgress}</strong><small>Prise en charge</small></div>
              </div>
              <ReclamationTable items={[...chosenManager.claims].sort((a,b) => new Date(b.dateEnregistrement || b.dateCreation || 0) - new Date(a.dateEnregistrement || a.dateCreation || 0))} onView={viewReclamation}/>
            </section>}
          </>;
        })()}
        {page === "client-statistics" && (() => {
          const clientRows = Object.entries(reclamations.reduce((acc, r) => {
            const email = r.client?.email || r.clientEmail || r.email || "Email non renseigné";
            const name = clientOf(r);
            if (!acc[email]) acc[email] = { name, email, total: 0, pending: 0, progress: 0, done: 0, refused: 0, claims: [] };
            const item = acc[email]; item.total += 1; item.claims.push(r);
            const status = r.statut || "Soumise";
            if (status === "Traitée") item.done += 1;
            else if (["Fausse", "Annulée"].includes(status)) item.refused += 1;
            else if (status === "En cours" || status === "Prise en charge") item.progress += 1;
            else item.pending += 1;
            return acc;
          }, {})).map(([email, item]) => ({ ...item, email, rate: item.total ? Math.round(item.done / item.total * 100) : 0 }))
            .sort((a, b) => b.total - a.total);
          const uniqueClients = clientRows.length;
          const totalTreated = clientRows.reduce((sum, c) => sum + c.done, 0);
          const totalPending = clientRows.reduce((sum, c) => sum + c.pending, 0);
          const validationRate = reclamations.length ? Math.round(totalTreated / reclamations.length * 100) : 0;
          return <>
            <style>{`
              .client-metric-card { position:relative; overflow:hidden; border:1px solid #e2e8f5; border-top:3px solid var(--metric-color); border-radius:20px; background:linear-gradient(145deg,#fff 0%,var(--metric-tint) 100%); box-shadow:0 8px 24px rgba(23,42,79,.045); transition:transform .2s ease,box-shadow .2s ease; }
              .client-metric-card:hover { transform:translateY(-4px); box-shadow:0 16px 34px rgba(23,42,79,.10); }
              .client-metric-card::after { content:""; position:absolute; width:100px; height:100px; right:-30px; top:-36px; border-radius:50%; background:var(--metric-tint); opacity:.9; }
              .client-metric-label { display:flex; align-items:center; gap:10px; position:relative; z-index:1; color:#71829d; font-weight:650; }
              .client-metric-icon { display:inline-flex; align-items:center; justify-content:center; width:40px; height:40px; flex:0 0 40px; border-radius:13px; background:var(--metric-tint); color:var(--metric-color); font-size:20px; box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--metric-color) 13%,transparent); }
              .client-metric-card strong { display:block; position:relative; z-index:1; color:#172742; font-size:34px; line-height:1.25; margin-top:10px; }
              .client-metric-card small { position:relative; z-index:1; display:block; margin-top:7px; color:#8798b2; }
              .client-stat-section { border:1px solid #e2eaf7; border-radius:24px; background:linear-gradient(145deg,#fff 0%,#fbfdff 100%); box-shadow:0 14px 38px rgba(20,37,70,.055); }
              .client-table-avatar { display:inline-flex; align-items:center; justify-content:center; width:36px; height:36px; margin-right:10px; border-radius:12px; color:#7c3aed; background:#f2e9ff; font-weight:800; vertical-align:middle; }
              .client-count-pill { display:inline-flex; align-items:center; gap:7px; padding:7px 11px; border-radius:12px; background:#eaf2ff; color:#3478f6; font-weight:750; }
              .client-count-track { height:6px; width:100%; max-width:145px; margin-top:7px; overflow:hidden; border-radius:99px; background:#edf1f8; }
              .client-count-track span { display:block; height:100%; border-radius:99px; background:linear-gradient(90deg,#7c3aed,#3478f6); }
              .client-stat-table tbody tr { transition:background .18s ease; }
              .client-stat-table tbody tr:hover { background:#f1f6ff; }
              .client-stat-table tbody tr td { padding-top:15px; padding-bottom:15px; }
              .client-stat-refresh { transition:transform .18s ease,box-shadow .18s ease; }
              .client-stat-refresh:hover { transform:translateY(-2px); box-shadow:0 8px 18px rgba(52,120,246,.14); }
              @media (prefers-reduced-motion: reduce) { .client-metric-card,.client-stat-table tbody tr,.client-stat-refresh { transition:none; } }
            `}</style>
            {heading("ANALYSE & PERFORMANCE","Statistiques des clients","Analysez l’activité des clients et l’évolution des réclamations.")}
            <div className="admin-stats-grid">
              <div className="admin-stat-card client-metric-card" style={{"--metric-color":"#3478f6","--metric-tint":"#eaf2ff"}}><span className="client-metric-label"><i className="client-metric-icon">♟</i>Clients identifiés</span><strong>{uniqueClients}</strong><small>Clients distincts ayant soumis un dossier</small></div>
              <div className="admin-stat-card client-metric-card" style={{"--metric-color":"#7c3aed","--metric-tint":"#f3eaff"}}><span className="client-metric-label"><i className="client-metric-icon">▤</i>Réclamations reçues</span><strong>{reclamations.length}</strong><small>Tous les dossiers chargés</small></div>
              <div className="admin-stat-card client-metric-card" style={{"--metric-color":"#d99018","--metric-tint":"#fff4dd"}}><span className="client-metric-label"><i className="client-metric-icon">◷</i>En attente</span><strong>{totalPending}</strong><small>Dossiers à examiner</small></div>
              <div className="admin-stat-card client-metric-card" style={{"--metric-color":"#079669","--metric-tint":"#e5fbf2"}}><span className="client-metric-label"><i className="client-metric-icon">✓</i>Taux de validation</span><strong>{validationRate}%</strong><small>{totalTreated} dossier(s) traité(s)</small></div>
            </div>
            <section className="admin-card client-stat-section" style={{marginTop:24}}>
              <div className="admin-card-heading"><div><div className="manager-section-title"><span className="manager-section-icon">▥</span><div><h2>Activité par client</h2><p>Consultez le volume et le statut des réclamations de chaque client.</p></div></div></div><button className="admin-soft-button client-stat-refresh" onClick={loadReclamations}>↻ Actualiser</button></div>
              <div className="admin-table-wrap"><table className="admin-table client-stat-table"><thead><tr><th>Client</th><th>Email</th><th>Total</th><th>En attente</th><th>En cours</th><th>Validées</th><th>Refusées / annulées</th><th>Taux de validation</th></tr></thead><tbody>
                {clientRows.map((info) => <tr key={info.email}><td><span className="client-table-avatar">{(info.name || "C").trim().slice(0,1).toUpperCase()}</span><strong>{info.name}</strong></td><td>{info.email}</td><td><span className="client-count-pill">▤ {info.total}</span></td><td><strong style={{color:"#c58a16"}}>{info.pending}</strong></td><td><strong style={{color:"#3478f6"}}>{info.progress}</strong></td><td><strong style={{color:"#079669"}}>{info.done}</strong></td><td><strong style={{color:"#dc4545"}}>{info.refused}</strong></td><td><strong>{info.rate}%</strong><div className="client-count-track"><span style={{width:`${info.rate}%`}} /></div></td></tr>)}
                {clientRows.length === 0 && <tr><td colSpan={8}><div className="admin-empty">Aucune statistique client disponible pour le moment.</div></td></tr>}
              </tbody></table></div>
              <p style={{margin:"16px 2px 0",fontSize:12,color:"#8798b2"}}>Les statistiques sont calculées à partir des réclamations actuellement chargées. Les dossiers sans email client sont regroupés sous « Email non renseigné ».</p>
            </section>
          </>;
        })()}
        {page === "chat" && <>{heading("ESPACE DE COMMUNICATION","Conversations","Accédez aux échanges avec les clients.")}<section className="admin-card"><div className="admin-section-title"><span>◌</span><div><h2>Conversations</h2><p>Le backend actuel ne contient pas encore d’API de messagerie. Cette page est prête visuellement, mais les messages ne peuvent pas encore être affichés ni envoyés.</p></div></div><div className="admin-empty">La messagerie devra être reliée à un modèle de conversations et à des routes API avant d’être opérationnelle.</div></section></>}
        {page === "statistics" && <>{heading("ANALYSE DE L’ACTIVITÉ","Statistiques globales","Indicateurs calculés à partir des réclamations chargées.")}<div className="admin-stats-grid">{[["Total",stats.total],["En attente",stats.pending],["En cours",stats.progress],["Validées",stats.done]].map(([label,value]) => <div className="admin-stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>Réclamations</small></div>)}</div><section className="admin-card"><div className="admin-card-heading"><div><h2>Répartition par statut</h2><p>Nombre de réclamations dans chaque catégorie.</p></div><button className="admin-soft-button" onClick={loadReclamations}>↻ Actualiser</button></div><div className="admin-bars">{Object.entries(STATUS).map(([key,value]) => { const count = reclamations.filter(r => (r.statut || "Soumise") === key).length; return <div className="admin-bar-row" key={key}><div><span>{value[0]}</span><strong>{count}</strong></div><div className="admin-bar-track"><span className={`bar-${value[1]}`} style={{width:`${stats.total ? Math.max(3,count/stats.total*100) : 0}%`}}/></div></div>; })}</div></section></>}
        {page === "activity" && <>{heading("SÉCURITÉ & TRAÇABILITÉ","Journal d'activité","Aperçu de la traçabilité des opérations administratives.")}<section className="admin-card"><div className="admin-section-title"><span>i</span><div><h2>Journal d'activité</h2><p>Le backend fourni ne possède pas encore de collection d'audit persistante. Pour l'instant, cette page explique cette limite.</p></div></div><div className="admin-empty">Pour enregistrer les opérations après déconnexion, il faudra ajouter une collection d’audit dans MongoDB.</div></section></>}
        {page === "account" && <>{heading("MON ESPACE","Mon compte","Informations du compte administrateur connecté.")}<section className="admin-card admin-profile"><div className="admin-profile-avatar">{(admin.prenom || "A").slice(0,1).toUpperCase()}</div><div><h2>{admin.prenom} {admin.nom}</h2><p>{admin.email}</p><span className="admin-role-chip">Administrateur</span></div></section></>}
        {page === "settings" && <>{heading("MON ESPACE","Paramètres","Options de sécurité de l’espace administrateur.")}<section className="admin-card"><div className="admin-section-title"><span>✓</span><div><h2>Connexion sécurisée</h2><p>Les opérations d’administration utilisent le jeton d’accès et les routes protégées du backend.</p></div></div><button className="admin-danger-button" onClick={logout}>Se déconnecter de cet appareil</button></section></>}
      </main>
    </div>
  </div>;
}

function ReclamationTable({ items, onView }) {
  if (!items?.length) return <div className="admin-empty">Aucune réclamation à afficher.</div>;
  return <div className="admin-table-wrap admin-reclamations-table-wrap"><table className="admin-table admin-reclamations-table"><thead><tr><th>ACTION</th><th>N° RÉCLAMATION</th><th>CLIENT</th><th>EMAIL</th><th>TYPE</th><th>STATUT</th><th>DATE</th></tr></thead><tbody>{items.map(r => { const st = STATUS[r.statut || "Soumise"] || STATUS.Soumise; return <tr key={r._id || refOf(r)}><td><button className="admin-reclamation-arrow" title="Voir les détails" onClick={() => onView(r._id)} aria-label={`Ouvrir la réclamation ${refOf(r)}`}>→</button></td><td><span className="admin-reference-cell">{refOf(r)}</span></td><td><div className="admin-reclamation-client"><span className="admin-client-avatar">{clientOf(r).slice(0,1).toUpperCase()}</span><div><strong>{clientOf(r)}</strong><small>Client</small></div></div></td><td><span className="admin-reclamation-email">{r.client?.email || "—"}</span></td><td><strong className="admin-reclamation-type">{r.typeReclamation || r.type || "—"}</strong></td><td><span className={`admin-status ${st[1]}`}>{st[0]}</span></td><td>{dateLabel(r.dateEnregistrement || r.dateCreation)}</td></tr>; })}</tbody></table></div>;
}
