//import GestionnaireApp from "../Gestionnaire/GestionnaireApp";
import { useEffect, useState } from "react";
import CreateReclamation from "./pages/CreateReclamation";
import Login from "../Authentication/pages/Login";
import "./App.css";
import Register from "../Authentication/pages/Register";

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [reclamations, setReclamations] = useState([]);
  const [activePage, setActivePage] = useState("create");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [authPage, setAuthPage] = useState("login");  

  const [loadingReclamations, setLoadingReclamations] = useState(false);
  const [loadError, setLoadError] = useState("");

  // =====================================================
  // VERIFIER SI UN CLIENT EST DEJA CONNECTE
  // =====================================================

  useEffect(() => {
    const savedUser = sessionStorage.getItem("current_user");
    const token = sessionStorage.getItem("access_token");

    if (savedUser && token) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Erreur utilisateur :", error);

        sessionStorage.removeItem("current_user");
        sessionStorage.removeItem("access_token");
      }
    }
  }, []);

  // =====================================================
  // RECUPERER LES RECLAMATIONS DU CLIENT CONNECTE
  // =====================================================

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    fetchReclamations();
  }, [currentUser]);

  const fetchReclamations = async () => {
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      return;
    }

    setLoadingReclamations(true);
    setLoadError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/reclamations",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleLogout();
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.detail || "Impossible de récupérer les réclamations."
        );
      }

      setReclamations(data);
    } catch (error) {
      console.error(error);

      setLoadError(
        error.message ||
          "Une erreur est survenue lors du chargement des réclamations."
      );
    } finally {
      setLoadingReclamations(false);
    }
  };

  // =====================================================
  // APRES LOGIN
  // =====================================================

  const handleLoginSuccess = (user, token) => {
    const role = String(user?.role || "").toLowerCase();
    const email = String(user?.email || "").trim().toLowerCase();

    if (!token || !role) {
      throw new Error("Les informations de connexion sont incomplètes.");
    }

    if (role === "client") {
      sessionStorage.setItem("access_token", token);
      sessionStorage.setItem("current_user", JSON.stringify(user));
      setCurrentUser(user);
      setActivePage("create");
      return;
    }

    if (role === "gestionnaire") {
      sessionStorage.setItem("gestionnaire_token", token);
      sessionStorage.setItem("gestionnaire_user", JSON.stringify(user));
      window.location.assign("/gestionnaire");
      return;
    }

    if (role === "admin") {
      sessionStorage.setItem(`admin_access_token:${email}`, token);
      sessionStorage.setItem(`admin_user:${email}`, JSON.stringify(user));
      sessionStorage.setItem("admin_last_email", email);
      window.location.assign("/admin");
      return;
    }

    throw new Error("Le rôle de ce compte n'est pas reconnu.");
  };

  // =====================================================
  // APRES CREATION D'UNE RECLAMATION
  // =====================================================

  const handleReclamationCreated = (newReclamation) => {
    setReclamations((prev) => [
      newReclamation,
      ...prev,
    ]);

    //setActivePage("suivi");
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("current_user");

    setCurrentUser(null);
    setReclamations([]);
    setActivePage("create");
  };

  // =====================================================
  // SI PAS CONNECTE → LOGIN
  // =====================================================

  if (!currentUser) {
    if (authPage === "register") {
      return (
        <Register
          onRegisterSuccess={() => {
            setAuthPage("login");
          }}
          onBackToLogin={() => {
            setAuthPage("login");
          }}
        />
      );
    }

    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onCreateAccount={() => {
          setAuthPage("register");
        }}
      />
    );
  }
  // =====================================================
  // PAGE PRINCIPALE
  // =====================================================

  const renderPage = () => {
    switch (activePage) {
      case "create":
        return (
          <CreateReclamation
            onReclamationCreated={handleReclamationCreated}
          />
        );

      case "suivi":
        return (
          <SuiviReclamations
            reclamations={reclamations}
            loading={loadingReclamations}
            error={loadError}
            onNewClick={() => setActivePage("create")}
            onRefresh={fetchReclamations}
          />
        );

      case "account":
        return (
          <AccountPage
            user={currentUser}
          />
        );

      case "settings":
        return (
          <PlaceholderPage
            title="Paramètres"
          />
        );

      default:
        return (
          <CreateReclamation
            onReclamationCreated={handleReclamationCreated}
          />
        );
    }
  };

  return (
    <div className="client-layout">

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside className={`client-sidebar ${sidebarOpen ? "open" : "closed"}`}>

        <div className="sidebar-brand">
          <img
            className="sidebar-brand-logo-image"
            src="/cat-logo.png"
            alt="CAT Assurance & Réassurance"
          />

        </div>

        {sidebarOpen && (
          <div className="sidebar-section-title">
            MENU PRINCIPAL
          </div>
        )}

        <nav className="sidebar-nav">

          <button
            className={`sidebar-link ${
              activePage === "create"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("create")
            }
          >
            <span className="sidebar-link-icon">
              ＋
            </span>

            <span>
              Nouvelles réclamations
            </span>
          </button>

          <button
            className={`sidebar-link ${
              activePage === "suivi"
                ? "active"
                : ""
            }`}
            onClick={() => {
              setActivePage("suivi");
              fetchReclamations();
            }}
          >
            <span className="sidebar-link-icon">
              ▤
            </span>

            <span>
              Suivi des réclamations
            </span>
          </button>

        </nav>

        {sidebarOpen && (
          <div className="sidebar-section-title sidebar-secondary-title">
            MON ESPACE
          </div>
        )}

        <nav className="sidebar-nav">

          <button
            className={`sidebar-link ${
              activePage === "account"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("account")
            }
          >
            <span className="sidebar-link-icon">
              ♙
            </span>

            <span>
              Mon compte
            </span>
          </button>

          <button
            className={`sidebar-link ${
              activePage === "settings"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("settings")
            }
          >
            <span className="sidebar-link-icon">
              ⚙
            </span>

            <span>
              Paramètres
            </span>
          </button>

        </nav>

        {/* =================================================
            USER
        ================================================= */}

        <div className="sidebar-user">

          <div className="sidebar-user-avatar">
            {currentUser.prenom
              ? currentUser.prenom.charAt(0).toUpperCase()
              : "U"}
          </div>

          {sidebarOpen && (
            <div className="sidebar-user-info">
              <strong>
                {currentUser.prenom}{" "}
                {currentUser.nom}
              </strong>

              <span>
                {currentUser.email}
              </span>
            </div>
          )}

        </div>

        {/* =================================================
            LOGOUT
        ================================================= */}

        <button
          className="sidebar-logout"
          onClick={handleLogout}
          title="Se déconnecter"
        >
          <span>↪</span>
          {sidebarOpen && <span>Se déconnecter</span>}
        </button>

      </aside>

      {/* =================================================
          MAIN
      ================================================= */}

      <div className="client-main-wrapper">
        <header className="client-header">
          <div className="client-header-left">
            <button
              type="button"
              className="client-menu-button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? "Masquer le menu" : "Afficher le menu"}
              title={sidebarOpen ? "Masquer le menu" : "Afficher le menu"}
            >
              ☰
            </button>
            <div className="client-header-title" aria-label="Gestion des Réclamations, Espace client">
              <strong>Gestion des Réclamations</strong>
              <span>Espace client</span>
            </div>
          </div>

          <div className="client-header-user">
            <div className="client-header-avatar">
              {currentUser.prenom
                ? currentUser.prenom.charAt(0).toUpperCase()
                : "U"}
            </div>
            <div className="client-header-user-info">
              <strong>{currentUser.prenom} {currentUser.nom}</strong>
              <span>Client</span>
            </div>
          </div>
        </header>

        <main className="client-main">
          {renderPage()}
        </main>
      </div>

    </div>
  );
}


// =======================================================
// SUIVI DES RECLAMATIONS
// =======================================================

function getClientStatusStyle(statut) {
  const styles = {
    "Soumise": {
      label: "En attente",
      background: "#fff0c2",
      color: "#a05c00",
      border: "1px solid #fedf8a",
      description: "Votre réclamation est en attente de prise en charge.",
    },
    "En cours": {
      label: "Prise en charge",
      background: "#dceaff",
      color: "#1d5ec4",
      border: "1px solid #bfdbfe",
      description: "Votre réclamation est prise en charge et en cours de traitement.",
    },
    "Traitée": {
      label: "Validée",
      background: "#c9f4e3",
      color: "#087b59",
      border: "1px solid #a7f3d0",
      description: "Le traitement de votre réclamation est terminé : elle est validée.",
    },
    "Fausse": {
      label: "Fausse",
      background: "#ffe0e0",
      color: "#c32929",
      border: "1px solid #fecaca",
      description: "Cette réclamation a été déclarée fausse.",
    },
    "Annulée": {
      label: "Annulée",
      background: "#e7ebf1",
      color: "#596579",
      border: "1px solid #d1d5db",
      description: "Cette réclamation a été annulée.",
    },
  };

  return styles[statut] || styles["Soumise"];
}

function SuiviReclamations({
  reclamations,
  loading,
  error,
  onNewClick,
  onRefresh,
}) {
  return (
    <div className="suivi-page">

      <div className="suivi-heading">

        <span className="suivi-eyebrow">
          ESPACE CLIENT
        </span>

        <h1>
          Suivi des réclamations
        </h1>

        <p>
          Consultez l’état d’avancement de vos
          réclamations et accédez à leurs détails.
        </p>

      </div>

      <section className="suivi-card">

        <div className="suivi-card-heading">

          <div>
            <h2>
              Mes réclamations
            </h2>

            <p>
              Retrouvez ici les réclamations
              que vous avez soumises.
            </p>
          </div>

          <button
            className="suivi-new-button"
            onClick={onNewClick}
          >
            + Nouvelle réclamation
          </button>

        </div>

        {error && (
          <div
            style={{
              padding: "15px",
              marginBottom: "15px",
              background: "#fff1f0",
              color: "#b42318",
              borderRadius: "10px",
            }}
          >
            {error}
          </div>
        )}

        <div className="suivi-table-wrapper">

          <table className="suivi-table">

            <thead>
              <tr>
                <th>Référence</th>
                <th>Type</th>
                <th>Date de création</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td
                    colSpan="5"
                    className="suivi-empty"
                  >
                    <div className="suivi-empty-icon">
                      ⟳
                    </div>

                    <strong>
                      Chargement...
                    </strong>

                    <p>
                      Récupération de vos réclamations.
                    </p>
                  </td>
                </tr>

              ) : reclamations.length === 0 ? (

                <tr>
                  <td
                    colSpan="5"
                    className="suivi-empty"
                  >
                    <div className="suivi-empty-icon">
                      ▤
                    </div>

                    <strong>
                      Aucune réclamation pour le moment
                    </strong>

                    <p>
                      Vos réclamations apparaîtront ici
                      après leur soumission.
                    </p>

                  </td>
                </tr>

              ) : (

                reclamations.map(
                  (reclamation) => (

                    <tr
                      key={
                        reclamation._id ||
                        reclamation.reference
                      }
                    >

                      <td>
                        <strong>
                          {reclamation.reference}
                        </strong>
                      </td>

                      <td>
                        {reclamation.type}
                      </td>

                      <td>
                        {reclamation.dateCreation ||
                          (
                            reclamation.dateEnregistrement
                              ? new Date(
                                  reclamation.dateEnregistrement
                                ).toLocaleDateString(
                                  "fr-FR"
                                )
                              : "-"
                          )}
                      </td>

                      <td>
                        {(() => {
                          const statut = reclamation.statut || "Soumise";
                          const statusStyle = getClientStatusStyle(statut);

                          return (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "6px", minWidth: "170px" }}>
                              <span
                                className="reclamation-status"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  padding: "6px 10px",
                                  borderRadius: "999px",
                                  fontSize: "12px",
                                  fontWeight: 700,
                                  background: statusStyle.background,
                                  color: statusStyle.color,
                                  border: statusStyle.border,
                                }}
                              >
                                <span
                                  aria-hidden="true"
                                  style={{
                                    width: "7px",
                                    height: "7px",
                                    borderRadius: "50%",
                                    background: statusStyle.color,
                                    marginRight: "7px",
                                  }}
                                />
                                {statusStyle.label}
                              </span>
                              <small style={{ color: "#6b7280", lineHeight: 1.4, maxWidth: "210px" }}>
                                {statusStyle.description}
                              </small>
                            </div>
                          );
                        })()}
                      </td>

                      <td>

                        <button
                          className="reclamation-detail-button"
                          onClick={() =>
                            alert(
                              `Détails de ${reclamation.reference}\n\n${
                                reclamation.commentaire ||
                                "Aucun commentaire"
                              }`
                            )
                          }
                        >
                          Voir détails
                        </button>

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

        <button
          onClick={onRefresh}
          style={{
            marginTop: "15px",
            padding: "8px 14px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            background: "white",
            cursor: "pointer",
          }}
        >
          ↻ Actualiser
        </button>

      </section>

    </div>
  );
}


// =======================================================
// MON COMPTE
// =======================================================

function AccountPage({ user }) {
  return (
    <div className="suivi-page">

      <div className="suivi-heading">

        <span className="suivi-eyebrow">
          ESPACE CLIENT
        </span>

        <h1>
          Mon compte
        </h1>

        <p>
          Consultez les informations de votre compte.
        </p>

      </div>

      <section className="suivi-card">

        <h2>
          Informations personnelles
        </h2>

        <div style={{ marginTop: "25px" }}>

          <p>
            <strong>Prénom :</strong>{" "}
            {user.prenom}
          </p>

          <p>
            <strong>Nom :</strong>{" "}
            {user.nom}
          </p>

          <p>
            <strong>Email :</strong>{" "}
            {user.email}
          </p>

        </div>

      </section>

    </div>
  );
}


// =======================================================
// PLACEHOLDER
// =======================================================

function PlaceholderPage({ title }) {
  return (
    <div className="suivi-page">

      <div className="suivi-heading">

        <span className="suivi-eyebrow">
          ESPACE CLIENT
        </span>

        <h1>
          {title}
        </h1>

        <p>
          Cette section sera configurée dans
          une prochaine étape.
        </p>

      </div>

    </div>
  );
}


export default App;