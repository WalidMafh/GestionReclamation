import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import GestionnaireApp from "../Gestionnaire/GestionnaireApp.jsx";
import AdminApp from "../Admin/AdminApp.jsx";

function RootApp() {
  const path = window.location.pathname;
  const managerToken = sessionStorage.getItem("gestionnaire_token");
  const adminEmail = (sessionStorage.getItem("admin_last_email") || "").trim().toLowerCase();
  const adminToken = adminEmail
    ? sessionStorage.getItem(`admin_access_token:${adminEmail}`)
    : null;

  // Chaque URL protégée exige une session du rôle correspondant.
  // Une ancienne session Client ne doit jamais ouvrir /admin ou /gestionnaire.
  if (path === "/admin" || path.startsWith("/admin/")) {
    if (adminToken) return <AdminApp />;
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("current_user");
    sessionStorage.removeItem("client_active_page");
    sessionStorage.removeItem("client_stats_status_filter");
    sessionStorage.removeItem("gestionnaire_token");
    sessionStorage.removeItem("gestionnaire_user");
    return <App />;
  }

  if (path === "/gestionnaire" || path.startsWith("/gestionnaire/")) {
    if (managerToken) return <GestionnaireApp />;
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("current_user");
    sessionStorage.removeItem("client_active_page");
    sessionStorage.removeItem("client_stats_status_filter");
    sessionStorage.removeItem("admin_last_email");
    return <App />;
  }

  return <App />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
