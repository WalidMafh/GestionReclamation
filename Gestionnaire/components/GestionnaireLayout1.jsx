import { useState } from "react";

function GestionnaireLayout({
  user,
  activePage,
  onNavigate,
  onLogout,
  children,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    {
      id: "dashboard",
      label: "Tableau de bord",
      icon: "⌂",
    },
    {
      id: "reclamations",
      label: "Réclamations",
      icon: "▤",
    },
    {
      id: "suivi",
      label: "Suivi",
      icon: "◷",
    },
    {
      id: "chat",
      label: "Conversations",
      icon: "◌",
    },
  ];

  const accountItems = [
    {
      id: "account",
      label: "Mon compte",
      icon: "♙",
    },
    {
      id: "settings",
      label: "Paramètres",
      icon: "⚙",
    },
  ];

  return (
    <div className="gestionnaire-layout">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside
        className={`gestionnaire-sidebar ${
          sidebarOpen ? "open" : "closed"
        }`}
      >

        {/* Logo */}

        <div className="gestionnaire-sidebar-brand">

          <img
            className="gestionnaire-sidebar-logo-image"
            src="/cat-logo.png"
            alt="CAT Assurance & Réassurance"
          />


        </div>


        {/* Menu principal */}

        {sidebarOpen && (
          <div className="gestionnaire-sidebar-title">
            MENU PRINCIPAL
          </div>
        )}

        <nav className="gestionnaire-sidebar-nav">

          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`gestionnaire-sidebar-link ${
                activePage === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <span className="gestionnaire-sidebar-icon">
                {item.icon}
              </span>

              {sidebarOpen && (
                <span>{item.label}</span>
              )}
            </button>
          ))}

        </nav>


        {/* Mon espace */}

        {sidebarOpen && (
          <div className="gestionnaire-sidebar-title gestionnaire-sidebar-secondary-title">
            MON ESPACE
          </div>
        )}

        <nav className="gestionnaire-sidebar-nav">

          {accountItems.map((item) => (
            <button
              key={item.id}
              className={`gestionnaire-sidebar-link ${
                activePage === item.id
                  ? "active"
                  : ""
              }`}
              onClick={() => onNavigate(item.id)}
              title={item.label}
            >
              <span className="gestionnaire-sidebar-icon">
                {item.icon}
              </span>

              {sidebarOpen && (
                <span>{item.label}</span>
              )}
            </button>
          ))}

        </nav>


        {/* User */}

        <div className="gestionnaire-sidebar-bottom">

          <div className="gestionnaire-sidebar-user">

            <div className="gestionnaire-user-avatar">
              {user?.prenom
                ? user.prenom
                    .charAt(0)
                    .toUpperCase()
                : "G"}
            </div>

            {sidebarOpen && (
              <div className="gestionnaire-user-info">

                <strong>
                  {user?.prenom} {user?.nom}
                </strong>

                <span>
                  {user?.email}
                </span>

              </div>
            )}

          </div>


          {/* Logout */}

          <button
            className="gestionnaire-sidebar-logout"
            onClick={onLogout}
            title="Se déconnecter"
          >
            <span>↪</span>

            {sidebarOpen && (
              <span>Se déconnecter</span>
            )}
          </button>

        </div>

      </aside>


      {/* =========================
          MAIN CONTENT
      ========================= */}

      <div className="gestionnaire-main-wrapper">

        {/* Header */}

        <header className="gestionnaire-header">

          <div className="gestionnaire-header-left">
            <button
              className="gestionnaire-menu-button"
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
              title="Afficher / masquer le menu"
            >
              ☰
            </button>

            <div className="gestionnaire-header-brand">
              <strong>Gestion des Réclamations</strong>
            </div>
          </div>

          <div className="gestionnaire-header-right">

            <div className="gestionnaire-header-user">

              <div className="gestionnaire-header-avatar">
                {user?.prenom
                  ? user.prenom
                      .charAt(0)
                      .toUpperCase()
                  : "G"}
              </div>

              <div>
                <strong>
                  {user?.prenom} {user?.nom}
                </strong>

              </div>

            </div>

          </div>

        </header>


        {/* Page */}

        <main className="gestionnaire-main">
          {children}
        </main>

      </div>

    </div>
  );
}

export default GestionnaireLayout;