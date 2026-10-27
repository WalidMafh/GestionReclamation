import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import GestionnaireApp from "../Gestionnaire/GestionnaireApp.jsx";
import AdminApp from "../Admin/AdminApp.jsx";

function RootApp() {
  const path = window.location.pathname;
  const managerToken = sessionStorage.getItem("gestionnaire_token");
  const adminEmail = sessionStorage.getItem("admin_last_email");
  const adminToken = adminEmail
    ? sessionStorage.getItem(`admin_access_token:${adminEmail}`)
    : null;

  // Les pages privées ne s'ouvrent que si une session du rôle correspondant existe.
  // Sinon, tous les rôles utilisent la même interface de connexion.
  if (path === "/admin" || path.startsWith("/admin/")) {
    return adminToken ? <AdminApp /> : <App />;
  }

  if (path === "/gestionnaire" || path.startsWith("/gestionnaire/")) {
    return managerToken ? <GestionnaireApp /> : <App />;
  }

  return <App />;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>
);
