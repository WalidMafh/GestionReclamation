import { useEffect, useState } from "react";

function GestionnaireDashboard({ onNavigate }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("gestionnaire_token");

      if (!token) {
        throw new Error("Session gestionnaire introuvable.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/gestionnaire/dashboard",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Impossible de charger le tableau de bord."
        );
      }

      setDashboard(data);
    } catch (err) {
      setError(
        err.message || "Une erreur est survenue lors du chargement."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const stats = dashboard?.statistiques || {};

  // Récupère le nom du gestionnaire connecté depuis la session.
  const gestionnaireName = (() => {
    const candidateKeys = ["gestionnaire_user", "current_user", "user", "gestionnaire"];
    for (const key of candidateKeys) {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const user = JSON.parse(raw);
        if (!user || typeof user !== "object") continue;

        const fullName =
          user.full_name ||
          user.fullName ||
          user.nomComplet ||
          user.name ||
          [user.prenom, user.nom].filter(Boolean).join(" ") ||
          [user.first_name, user.last_name].filter(Boolean).join(" ") ||
          user.username;

        if (typeof fullName === "string" && fullName.trim()) {
          return fullName.trim();
        }
      } catch {
        // Ignore les clés qui ne contiennent pas un objet JSON utilisateur.
      }
    }

    // Fallback si la session ne contient pas de nom exploitable.
    try {
      const raw = sessionStorage.getItem("gestionnaire_user") || sessionStorage.getItem("current_user");
      if (raw) {
        const user = JSON.parse(raw);
        const email = typeof user?.email === "string" ? user.email : "";
        if (email.includes("@")) {
          const localPart = email.split("@")[0].replace(/[._-]+/g, " ").trim();
          if (localPart) {
            return localPart.replace(/\\b\\w/g, (letter) => letter.toUpperCase());
          }
        }
      }
    } catch {
      // Le nom par défaut est utilisé ci-dessous.
    }

    return "Gestionnaire";
  })();

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="dashboard-spinner"></div>
          <p>Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <div className="dashboard-error-icon">!</div>

          <div>
            <h3>Impossible de charger le tableau de bord</h3>
            <p>{error}</p>

            <button
              className="dashboard-retry-button"
              onClick={loadDashboard}
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">

      {/* HEADER */}
      <div className="dashboard-header-section">
        <div>
          <span className="dashboard-eyebrow">
            ESPACE GESTIONNAIRE
          </span>

          <h1>Tableau de bord</h1>

          <p>
            Vue globale des réclamations clients.
          </p>
        </div>

        <button
          className="dashboard-refresh-button"
          onClick={loadDashboard}
        >
          ↻ Actualiser
        </button>
      </div>

      {/* BANNIÈRE D'ACCUEIL */}
      <section className="dashboard-welcome-banner">
        <div className="dashboard-welcome-brand">
          <div className="dashboard-welcome-mark">CAT</div>
          <div>
            <span className="dashboard-welcome-kicker">CAT ASSURANCE & RÉASSURANCE</span>
            <h2>Bonjour {gestionnaireName}, bienvenue dans votre espace gestionnaire 👋</h2>
            <p>Suivez les réclamations et accédez rapidement aux dossiers à traiter.</p>
          </div>
        </div>
        <div className="dashboard-live-pill"><span></span> Espace opérationnel</div>
      </section>

      {/* TOTAL */}
      <div className="dashboard-total-wrapper">
        <button
        type="button"
        className="dashboard-total-card"
        onClick={() => onNavigate("reclamations", "Tous")}
        >
          <div className="dashboard-total-icon">
            #
          </div>

          <div className="dashboard-total-content">
            <span className="dashboard-total-label">
              TOTAL
            </span>

            <strong className="dashboard-total-number">
              {stats.total ?? 0}
            </strong>

            <span className="dashboard-total-text">
              Réclamations enregistrées
            </span>
          </div>
        </button>
      </div>

      <div className="dashboard-section-intro">
        <div>
          <span className="dashboard-section-kicker">VUE SYNTHÉTIQUE</span>
          <h2>Réclamations par statut</h2>
          <p>Cliquez sur une carte pour consulter les dossiers correspondants.</p>
        </div>
        <span className="dashboard-updated-note">Données actualisées à la demande</span>
      </div>

      {/* 3 PRINCIPALES */}
      <div className="dashboard-primary-grid">

        <button type="button" className="dashboard-status-card dashboard-submitted" onClick={() => onNavigate("reclamations", "Soumise")} title="Afficher les réclamations en attente">
          <div className="dashboard-status-icon">
            !
          </div>

          <div className="dashboard-status-content">
            <span>EN ATTENTE</span>

            <strong>
              {stats.soumises ?? 0}
            </strong>

            <small>
              En attente de traitement
            </small>
          </div>
        </button>

        <button type="button" className="dashboard-status-card dashboard-progress" onClick={() => onNavigate("reclamations", "En cours")} title="Afficher les réclamations prises en charge">
          <div className="dashboard-status-icon">
            ◷
          </div>

          <div className="dashboard-status-content">
            <span>PRISE EN CHARGE</span>

            <strong>
              {stats.enCours ?? 0}
            </strong>

            <small>
              Traitement en cours
            </small>
          </div>
        </button>

        <button type="button" className="dashboard-status-card dashboard-treated" onClick={() => onNavigate("reclamations", "Traitée")} title="Afficher les réclamations validées">
          <div className="dashboard-status-icon">
            ✓
          </div>

          <div className="dashboard-status-content">
            <span>VALIDÉES</span>

            <strong>
              {stats.traitees ?? 0}
            </strong>

            <small>
              Réclamations validées
            </small>
          </div>
        </button>

      </div>

      {/* 2 SECONDAIRES */}
      <div className="dashboard-secondary-grid">

        <button type="button" className="dashboard-status-card dashboard-false" onClick={() => onNavigate("reclamations", "Fausse")} title="Afficher les réclamations fausses">
          <div className="dashboard-status-icon">
            ×
          </div>

          <div className="dashboard-status-content">
            <span>FAUSSES</span>

            <strong>
              {stats.fausses ?? 0}
            </strong>

            <small>
              Réclamations identifiées comme fausses
            </small>
          </div>
        </button>

        <button type="button" className="dashboard-status-card dashboard-cancelled" onClick={() => onNavigate("reclamations", "Annulée")} title="Afficher les réclamations annulées">
          <div className="dashboard-status-icon">
            −
          </div>

          <div className="dashboard-status-content">
            <span>ANNULÉES</span>

            <strong>
              {stats.annulees ?? 0}
            </strong>

            <small>
              Réclamations annulées
            </small>
          </div>
        </button>

      </div>

    </div>
  );
}

export default GestionnaireDashboard;