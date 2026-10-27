import {
  useEffect,
  useState,
} from "react";

import GestionnaireLogin from "./pages/GestionnaireLogin.jsx";
import GestionnaireDashboard from "./pages/GestionnaireDashboard.jsx";
import GestionnaireReclamations from "./pages/GestionnaireReclamations.jsx";
import GestionnaireReclamationDetails from "./pages/GestionnaireReclamationDetails.jsx";
import GestionnaireSuivi from "./pages/GestionnaireSuivi.jsx";
import StatistiquesClients from "./pages/StatistiquesClients.jsx";
import GestionnaireLayout from "./components/GestionnaireLayout.jsx";

import "./Gestionnaire.css";


/* =========================================================
   DÉTERMINER LA PAGE À PARTIR DE L'URL
   ========================================================= */

function getPageFromPath() {
  const path =
    window.location.pathname;


  /* DETAILS D'UNE RÉCLAMATION */

  if (
    path.startsWith(
      "/gestionnaire/reclamations/"
    )
  ) {
    return "reclamation-details";
  }


  /* LISTE DES RÉCLAMATIONS */

  if (
    path ===
    "/gestionnaire/reclamations"
  ) {
    return "reclamations";
  }


  /* SUIVI */

  if (
    path ===
    "/gestionnaire/suivi"
  ) {
    return "suivi";
  }


  /* STATISTIQUES CLIENTS */

  if (
    path ===
    "/gestionnaire/statistiques-clients"
  ) {
    return "statistiques-clients";
  }


  /* CHAT */

  if (
    path ===
    "/gestionnaire/chat"
  ) {
    return "chat";
  }


  /* COMPTE */

  if (
    path ===
    "/gestionnaire/account"
  ) {
    return "account";
  }


  /* PARAMÈTRES */

  if (
    path ===
    "/gestionnaire/settings"
  ) {
    return "settings";
  }


  /* PAR DÉFAUT */

  return "dashboard";
}


/* =========================================================
   RÉCUPÉRER LE FILTRE DEPUIS L'URL
   ========================================================= */

function getFilterFromUrl() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get("filter") ||
    "Tous"
  );
}


/* =========================================================
   RÉCUPÉRER L'ID DE LA RÉCLAMATION
   ========================================================= */

function getReclamationIdFromPath() {
  const prefix =
    "/gestionnaire/reclamations/";

  const path =
    window.location.pathname;


  if (
    !path.startsWith(prefix)
  ) {
    return null;
  }


  return path.substring(
    prefix.length
  );
}


/* =========================================================
   COMPONENT
   ========================================================= */

function GestionnaireApp() {


  /* =======================================================
     UTILISATEUR GESTIONNAIRE
     ======================================================= */

  const [
    gestionnaire,
    setGestionnaire,
  ] = useState(() => {

    const savedUser =
      sessionStorage.getItem(
        "gestionnaire_user"
      );


    if (savedUser) {

      try {

        return JSON.parse(
          savedUser
        );

      } catch {

        sessionStorage.removeItem(
          "gestionnaire_user"
        );

        return null;
      }
    }


    return null;
  });


  /* =======================================================
     PAGE ACTIVE
     ======================================================= */

  const [
    activePage,
    setActivePage,
  ] = useState(
    getPageFromPath()
  );


  /* =======================================================
     FILTRE RÉCLAMATIONS
     ======================================================= */

  const [
    reclamationFilter,
    setReclamationFilter,
  ] = useState(
    getFilterFromUrl()
  );


  /* =======================================================
     RÉCLAMATION SÉLECTIONNÉE
     ======================================================= */

  const [
    selectedReclamationId,
    setSelectedReclamationId,
  ] = useState(
    getReclamationIdFromPath()
  );


  // Signale la présence réelle du gestionnaire au backend toutes les 30 secondes.
  useEffect(() => {
    if (!gestionnaire) return;
    const token = sessionStorage.getItem("gestionnaire_token");
    if (!token) return;
    let active = true;
    const sendHeartbeat = async () => {
      try {
        await fetch("http://127.0.0.1:8000/auth/heartbeat", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        // Une erreur réseau ponctuelle ne doit pas bloquer l'interface.
      }
    };
    sendHeartbeat();
    const interval = window.setInterval(() => { if (active) sendHeartbeat(); }, 30000);
    return () => { active = false; window.clearInterval(interval); };
  }, [gestionnaire]);

  /* =======================================================
     BACK / FORWARD DU NAVIGATEUR
     ======================================================= */

  useEffect(() => {

    const handlePopState = () => {

      const page =
        getPageFromPath();

      const filter =
        getFilterFromUrl();

      const reclamationId =
        getReclamationIdFromPath();


      setActivePage(page);


      setSelectedReclamationId(
        reclamationId
      );


      if (
        page ===
        "reclamations"
      ) {
        setReclamationFilter(
          filter
        );
      }

    };


    window.addEventListener(
      "popstate",
      handlePopState
    );


    return () => {

      window.removeEventListener(
        "popstate",
        handlePopState
      );

    };

  }, []);


  /* =======================================================
     LOGIN SUCCESS
     ======================================================= */

  const handleLoginSuccess = (
    user
  ) => {

    setGestionnaire(user);

    setActivePage(
      "dashboard"
    );

    setReclamationFilter(
      "Tous"
    );

    setSelectedReclamationId(
      null
    );


    /*
     * On remplace l'URL actuelle
     * par /gestionnaire.
     */

    window.location.assign("/");
  };


  /* =======================================================
     LOGOUT
     ======================================================= */

  const handleLogout = () => {

    sessionStorage.removeItem(
      "gestionnaire_token"
    );

    sessionStorage.removeItem(
      "gestionnaire_user"
    );
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("current_user");
    sessionStorage.removeItem("client_active_page");
    sessionStorage.removeItem("client_stats_status_filter");
    sessionStorage.removeItem("admin_last_email");

    setGestionnaire(null);

    setActivePage(
      "dashboard"
    );

    setReclamationFilter(
      "Tous"
    );

    setSelectedReclamationId(
      null
    );


    window.location.assign("/");
  };


  /* =======================================================
     NAVIGATION SIDEBAR
     ======================================================= */

  const handleNavigate = (
    page,
    filter = "Tous"
  ) => {

    setActivePage(page);


    if (
      page ===
      "reclamations"
    ) {

      setReclamationFilter(
        filter
      );
    }


    let newPath =
      "/gestionnaire";

    let search = "";


    switch (page) {


      /* DASHBOARD */

      case "dashboard":

        newPath =
          "/gestionnaire";

        break;


      /* RÉCLAMATIONS */

      case "reclamations":

        newPath =
          "/gestionnaire/reclamations";


        if (
          filter &&
          filter !== "Tous"
        ) {

          search =
            `?filter=${encodeURIComponent(
              filter
            )}`;

        }

        break;


      /* SUIVI */

      case "suivi":

        newPath =
          "/gestionnaire/suivi";

        break;


      /* STATISTIQUES CLIENTS */

      case "statistiques-clients":

        newPath =
          "/gestionnaire/statistiques-clients";

        break;


      /* CHAT */

      case "chat":

        newPath =
          "/gestionnaire/chat";

        break;


      /* COMPTE */

      case "account":

        newPath =
          "/gestionnaire/account";

        break;


      /* SETTINGS */

      case "settings":

        newPath =
          "/gestionnaire/settings";

        break;


      /* DEFAULT */

      default:

        newPath =
          "/gestionnaire";
    }


    /*
     * Ajoute la nouvelle page
     * dans l'historique du navigateur.
     */

    window.history.pushState(
      {},
      "",
      `${newPath}${search}`
    );
  };


  /* =======================================================
     OUVRIR UNE RÉCLAMATION
     ======================================================= */

  const handleViewReclamation = (
    reclamationId
  ) => {

    setSelectedReclamationId(
      reclamationId
    );

    setActivePage(
      "reclamation-details"
    );


    /*
     * URL :
     *
     * /gestionnaire/reclamations/ID
     */

    window.history.pushState(
      {},
      "",
      `/gestionnaire/reclamations/${reclamationId}`
    );
  };


  /* =======================================================
     SI PAS CONNECTÉ
     ======================================================= */

  if (!gestionnaire) {

    return (
      <GestionnaireLogin
        onLoginSuccess={
          handleLoginSuccess
        }
      />
    );
  }


  /* =======================================================
     RENDRE LA PAGE ACTIVE
     ======================================================= */

  const renderPage = () => {

    switch (
      activePage
    ) {


      /* ===================================================
         DASHBOARD
         =================================================== */

      case "dashboard":

        return (
          <GestionnaireDashboard
            onNavigate={
              handleNavigate
            }
          />
        );


      /* ===================================================
         RÉCLAMATIONS
         =================================================== */

      case "reclamations":

        return (
          <GestionnaireReclamations
            initialFilter={
              reclamationFilter
            }
            onViewReclamation={
              handleViewReclamation
            }
          />
        );


      /* ===================================================
         DETAILS RÉCLAMATION
         =================================================== */

      case "reclamation-details":

        return (
          <GestionnaireReclamationDetails
            reclamationId={
              selectedReclamationId
            }
            onBack={() => {
              window.history.back();
            }}
          />
        );


      /* ===================================================
         SUIVI
         =================================================== */

      case "suivi":

        return (
          <GestionnaireSuivi
            gestionnaire={gestionnaire}
            onViewReclamation={handleViewReclamation}
          />
        );


      /* ===================================================
         STATISTIQUES CLIENTS
         =================================================== */

      case "statistiques-clients":

        return (
          <StatistiquesClients />
        );


      /* ===================================================
         CHAT
         =================================================== */

      case "chat":

        return (
          <div>
            <h1>
              Conversations
            </h1>

            <p>
              Gestion des conversations
              avec les clients.
            </p>
          </div>
        );


      /* ===================================================
         COMPTE
         =================================================== */

      case "account":

        return (
          <div>
            <h1>
              Mon compte
            </h1>

            <p>
              <strong>
                Nom :
              </strong>{" "}
              {gestionnaire.nom}
            </p>

            <p>
              <strong>
                Prénom :
              </strong>{" "}
              {gestionnaire.prenom}
            </p>

            <p>
              <strong>
                Email :
              </strong>{" "}
              {gestionnaire.email}
            </p>

            <p>
              <strong>
                Rôle :
              </strong>{" "}
              {gestionnaire.role}
            </p>
          </div>
        );


      /* ===================================================
         SETTINGS
         =================================================== */

      case "settings":

        return (
          <div>
            <h1>
              Paramètres
            </h1>

            <p>
              Paramètres de votre espace
              gestionnaire.
            </p>
          </div>
        );


      /* ===================================================
         DEFAULT
         =================================================== */

      default:

        return (
          <GestionnaireDashboard
            onNavigate={
              handleNavigate
            }
          />
        );
    }
  };


  /* =======================================================
     LAYOUT
     ======================================================= */

  return (
    <GestionnaireLayout
      user={
        gestionnaire
      }
      activePage={
        activePage
      }
      onNavigate={
        handleNavigate
      }
      onLogout={
        handleLogout
      }
    >
      {renderPage()}
    </GestionnaireLayout>
  );
}


export default GestionnaireApp;