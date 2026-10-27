import { useEffect, useMemo, useState } from "react";

function GestionnaireReclamations({ initialFilter = "Tous", onViewReclamation, }) {
  const [reclamations, setReclamations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [typeFilter, setTypeFilter] = useState("Tous");

  // Nouveau : tri par date
  const [sortOrder, setSortOrder] = useState("recent");

  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 8;

  const loadReclamations = async () => {
    try {
      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("gestionnaire_token");

      if (!token) {
        throw new Error("Session gestionnaire introuvable.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/gestionnaire/reclamations",
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
          data.detail ||
            "Impossible de charger les réclamations."
        );
      }

      setReclamations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.message ||
          "Une erreur est survenue lors du chargement."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReclamations();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter, sortOrder]);

  const types = useMemo(() => {
    const uniqueTypes = new Set();

    reclamations.forEach((reclamation) => {
      if (reclamation.typeReclamation) {
        uniqueTypes.add(
          reclamation.typeReclamation
        );
      }

      if (reclamation.type) {
        uniqueTypes.add(reclamation.type);
      }
    });

    return ["Tous", ...Array.from(uniqueTypes)];
  }, [reclamations]);

  const filteredReclamations = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    const filtered = reclamations.filter(
      (reclamation) => {
        const client =
          reclamation.client || {};

        const numero =
          reclamation.numeroReclamation ||
          reclamation.numero ||
          reclamation.reference ||
          reclamation._id ||
          "";

        const clientName =
          `${client.prenom || ""} ${
            client.nom || ""
          }`.trim();

        const clientEmail =
          client.email || "";

        const type =
          reclamation.typeReclamation ||
          reclamation.type ||
          "";

        const status =
          reclamation.statut || "Soumise";

        const searchContent = `
          ${numero}
          ${clientName}
          ${clientEmail}
          ${type}
          ${status}
        `.toLowerCase();

        const matchesSearch =
          !normalizedSearch ||
          searchContent.includes(
            normalizedSearch
          );

        const matchesStatus =
          statusFilter === "Tous" ||
          status === statusFilter;

        const matchesType =
          typeFilter === "Tous" ||
          type === typeFilter;

        return (
          matchesSearch &&
          matchesStatus &&
          matchesType
        );
      }
    );

    // TRI PAR DATE
    return [...filtered].sort(
      (a, b) => {
        const dateA = new Date(
          a.dateEnregistrement || 0
        ).getTime();

        const dateB = new Date(
          b.dateEnregistrement || 0
        ).getTime();

        if (sortOrder === "recent") {
          return dateB - dateA;
        }

        return dateA - dateB;
      }
    );
  }, [
    reclamations,
    search,
    statusFilter,
    typeFilter,
    sortOrder,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredReclamations.length /
        rowsPerPage
    )
  );

  const paginatedReclamations =
    filteredReclamations.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    );

  const getStatusClass = (status) => {
    switch (status) {
      case "Soumise":
        return "status-badge status-submitted";

      case "En cours":
        return "status-badge status-progress";

      case "Traitée":
        return "status-badge status-treated";

      case "Fausse":
        return "status-badge status-false";

      case "Annulée":
        return "status-badge status-cancelled";

      default:
        return "status-badge";
    }
  };

  // Libellés visibles harmonisés, sans modifier les valeurs internes de l'API.
  const getStatusLabel = (status) => {
    const labels = {
      "Soumise": "En attente",
      "En cours": "Prise en charge",
      "Traitée": "Validée",
      "Fausse": "Fausse",
      "Annulée": "Annulée",
    };
    return labels[status] || status || "En attente";
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "-";
    }

    return parsedDate.toLocaleDateString(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  const getClientName = (reclamation) => {
    const client =
      reclamation.client || {};

    const fullName =
      `${client.prenom || ""} ${
        client.nom || ""
      }`.trim();

    return (
      fullName || "Client inconnu"
    );
  };

  const getType = (reclamation) => {
    return (
      reclamation.typeReclamation ||
      reclamation.type ||
      "-"
    );
  };

  const getNumero = (reclamation) => {
    return (
      reclamation.numeroReclamation ||
      reclamation.numero ||
      reclamation.reference ||
      reclamation._id ||
      "-"
    );
  };

  return (
    <div className="reclamations-page">

      {/* HEADER */}
      <div className="reclamations-header">

        <div>
          <span className="reclamations-eyebrow">
            ESPACE GESTIONNAIRE
          </span>

          <h1>Réclamations</h1>

          <p>
            Gestion et suivi des réclamations
            clients.
          </p>
        </div>

        <button
          className="reclamations-refresh-button"
          onClick={loadReclamations}
        >
          ↻ Actualiser
        </button>

      </div>

      {/* FILTERS */}
      <div className="reclamations-toolbar">

        <div className="reclamations-search-wrapper">

          <span className="reclamations-search-icon">
            ⌕
          </span>

          <input
            type="text"
            placeholder="Rechercher une réclamation, un client..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
          className="reclamations-filter"
        >
          <option value="Tous">
            Tous les statuts
          </option>

          <option value="Soumise">
            En attente
          </option>

          <option value="En cours">
            Prise en charge
          </option>

          <option value="Traitée">
            Validées
          </option>

          <option value="Fausse">
            Fausses
          </option>

          <option value="Annulée">
            Annulées
          </option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value)
          }
          className="reclamations-filter"
        >
          {types.map((type) => (
            <option
              key={type}
              value={type}
            >
              {type === "Tous"
                ? "Tous les types"
                : type}
            </option>
          ))}
        </select>

        {/* TRI */}
        <select
          value={sortOrder}
          onChange={(e) =>
            setSortOrder(e.target.value)
          }
          className="reclamations-filter"
        >
          <option value="recent">
            Plus récentes
          </option>

          <option value="oldest">
            Plus anciennes
          </option>
        </select>

      </div>

      {/* RESULT INFO */}
      <div className="reclamations-result-info">

        <div>
          <strong>
            {filteredReclamations.length}
          </strong>{" "}
          réclamation
          {filteredReclamations.length !== 1
            ? "s"
            : ""}{" "}
          trouvée
          {filteredReclamations.length !== 1
            ? "s"
            : ""}
        </div>

        {(search ||
          statusFilter !== "Tous" ||
          typeFilter !== "Tous" ||
          sortOrder !== "recent") && (
          <button
            className="clear-filters-button"
            onClick={() => {
              setSearch("");
              setStatusFilter("Tous");
              setTypeFilter("Tous");
              setSortOrder("recent");
            }}
          >
            Réinitialiser les filtres
          </button>
        )}

      </div>

      {/* ERROR */}
      {error && (
        <div className="reclamations-error">

          <strong>
            Impossible de charger les réclamations
          </strong>

          <span>{error}</span>

          <button onClick={loadReclamations}>
            Réessayer
          </button>

        </div>
      )}

      {/* TABLE */}
      {!error && (
        <div className="reclamations-table-card">

          {loading ? (
            <div className="reclamations-loading">

              <div className="reclamations-spinner"></div>

              <p>
                Chargement des réclamations...
              </p>

            </div>
          ) : filteredReclamations.length ===
            0 ? (
            <div className="reclamations-empty">

              <div className="reclamations-empty-icon">
                —
              </div>

              <h3>
                Aucune réclamation trouvée
              </h3>

              <p>
                Aucune réclamation ne correspond
                aux critères sélectionnés.
              </p>

            </div>
          ) : (
            <>
              <div className="reclamations-table-wrapper">

                <table className="reclamations-table">

                  <thead>
                    <tr>
                      <th>ACTION</th>
                      <th>N° RÉCLAMATION</th>
                      <th>CLIENT</th>
                      <th>EMAIL</th>
                      <th>TYPE</th>
                      <th>STATUT</th>
                      <th>DATE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedReclamations.map(
                      (reclamation) => (
                        <tr
                          key={
                            reclamation._id
                          }
                        >

                          <td>

                            <button
                            className="reclamation-action-button"
                            title="Voir la réclamation"
                            onClick={() =>
                                onViewReclamation(
                                reclamation._id
                                )
                            }
                              aria-label={`Ouvrir la réclamation ${getNumero(reclamation)}`}
                            >
                              <svg
                                className="reclamation-action-icon"
                                viewBox="0 0 24 24"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M5 12h13M12 5l7 7-7 7"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>

                          </td>

                          <td>
                            <span className="reclamation-number">
                              {getNumero(
                                reclamation
                              )}
                            </span>
                          </td>

                          <td>

                            <div className="client-cell">

                              <div className="client-avatar">
                                {getClientName(
                                  reclamation
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>

                                <strong>
                                  {getClientName(
                                    reclamation
                                  )}
                                </strong>

                                <small>
                                  Client
                                </small>

                              </div>

                            </div>

                          </td>

                          <td>

                            <span className="client-email">
                              {reclamation.client
                                ?.email ||
                                reclamation.clientEmail ||
                                "-"}
                            </span>

                          </td>

                          <td>

                            <span className="type-text">
                              {getType(
                                reclamation
                              )}
                            </span>

                          </td>



                          <td>
                            <div className="reclamation-status-cell">
                              <span
                                className={getStatusClass(
                                  reclamation.statut || "Soumise"
                                )}
                              >
                                <span className="status-dot"></span>
                                {getStatusLabel(reclamation.statut || "Soumise")}
                              </span>
                            </div>
                          </td>

                          <td>
                            <span className="date-text">
                              {formatDate(reclamation.dateEnregistrement)}
                            </span>
                          </td>



                        </tr>
                      )
                    )}
                  </tbody>

                </table>

              </div>

              {/* PAGINATION */}
              <div className="reclamations-pagination">

                <span>
                  Page {currentPage} sur{" "}
                  {totalPages}
                </span>

                <div className="pagination-buttons">

                  <button
                    disabled={
                      currentPage === 1
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.max(
                            1,
                            page - 1
                          )
                      )
                    }
                  >
                    ‹
                  </button>

                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) =>
                      index + 1
                  ).map((page) => (
                    <button
                      key={page}
                      className={
                        page === currentPage
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setCurrentPage(
                          page
                        )
                      }
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onClick={() =>
                      setCurrentPage(
                        (page) =>
                          Math.min(
                            totalPages,
                            page + 1
                          )
                      )
                    }
                  >
                    ›
                  </button>

                </div>

              </div>
            </>
          )}

        </div>
      )}

    </div>
  );
}

export default GestionnaireReclamations;