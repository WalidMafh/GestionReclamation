import { useEffect, useState } from "react";

function GestionnaireReclamationDetails({
  reclamationId,
  onBack,
}) {
  const [reclamation, setReclamation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReclamation = async () => {
      try {
        setLoading(true);
        setError("");

        const token = sessionStorage.getItem(
          "gestionnaire_token"
        );

        if (!token) {
          throw new Error("Session gestionnaire introuvable.");
        }

        const response = await fetch(
          `http://127.0.0.1:8000/gestionnaire/reclamations/${reclamationId}`,
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
              "Impossible de récupérer la réclamation."
          );
        }

        setReclamation(data);
      } catch (err) {
        console.error(
          "Erreur récupération réclamation :",
          err
        );

        setError(
          err.message ||
            "Une erreur est survenue."
        );
      } finally {
        setLoading(false);
      }
    };

    if (reclamationId) {
      fetchReclamation();
    }
  }, [reclamationId]);

  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const updateStatut = async (nouveauStatut) => {
    if (!reclamation || updatingStatus) return;
    try {
      setUpdatingStatus(true);
      setActionMessage("");
      setActionError("");
      const token = sessionStorage.getItem("gestionnaire_token");
      if (!token) throw new Error("Session gestionnaire introuvable.");

      const response = await fetch(
        `http://127.0.0.1:8000/gestionnaire/reclamations/${reclamationId}/statut`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ statut: nouveauStatut }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Impossible de modifier le statut.");

      setReclamation((current) => ({
        ...current,
        statut: data.statut || nouveauStatut,
        gestionnaire_id: data.gestionnaire_id ?? current.gestionnaire_id,
        gestionnaire_nom: data.gestionnaire_nom ?? current.gestionnaire_nom,
        datePriseEnCharge: data.datePriseEnCharge ?? current.datePriseEnCharge,
        isAssignedToCurrentUser: data.isAssignedToCurrentUser ?? current.isAssignedToCurrentUser,
      }));
      setActionMessage(`Statut modifié : ${statusLabels[data.statut || nouveauStatut] || data.statut || nouveauStatut}`);
    } catch (err) {
      setActionError(err.message || "Une erreur est survenue.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filesName = (fileIndex) =>
    reclamation?.files?.[fileIndex]?.name || "piece-jointe";

  const handleFileAction = async (fileIndex, download = false) => {
    try {
      setActionMessage("");
      setActionError("");
      const token = sessionStorage.getItem("gestionnaire_token");
      if (!token) throw new Error("Session gestionnaire introuvable.");

      const response = await fetch(
        `http://127.0.0.1:8000/gestionnaire/reclamations/${reclamationId}/files/${fileIndex}?download=${download}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) {
        let message = "Impossible d'ouvrir la pièce jointe.";
        try {
          const data = await response.json();
          message = data.detail || message;
        } catch {}
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement("a");
        link.href = url;
        link.download = filesName(fileIndex);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (err) {
      setActionError(err.message || "Une erreur est survenue.");
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    try {
      return new Date(date).toLocaleString(
        "fr-FR"
      );
    } catch {
      return date;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <button
          onClick={onBack}
          style={styles.backButton}
        >
          ← Retour
        </button>

        <div style={styles.card}>
          <p>Chargement des détails...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <button
          onClick={onBack}
          style={styles.backButton}
        >
          ← Retour
        </button>

        <div style={styles.errorCard}>
          <h2>Erreur</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!reclamation) {
    return (
      <div style={styles.container}>
        <button
          onClick={onBack}
          style={styles.backButton}
        >
          ← Retour
        </button>

        <div style={styles.card}>
          <p>Réclamation introuvable.</p>
        </div>
      </div>
    );
  }

  const client = reclamation.client || {};
  const files = Array.isArray(reclamation.files) ? reclamation.files : [];
  const status = reclamation.statut || "Soumise";
  const statusLabels = {
    Soumise: "En attente",
    "En cours": "Prise en charge",
    "Traitée": "Validée",
    Fausse: "Fausse",
    Annulée: "Annulée",
  };
  const statusLabel = statusLabels[status] || status;
  const managerName = reclamation.gestionnaire_nom || reclamation.gestionnaireNom || "Non attribuée";
  const isAssignedToOther = Boolean(reclamation.gestionnaire_id && !reclamation.isAssignedToCurrentUser);
  const isClosed = ["Traitée", "Fausse", "Annulée"].includes(status);
  const submittedAt = reclamation.dateEnregistrement || reclamation.dateCreation;
  const assignedAt = reclamation.datePriseEnCharge;
  const canProcess = !isAssignedToOther && !isClosed;

  return (
    <div className="reclamation-details-page" style={styles.page}>
      <main style={styles.main}>
        <div style={styles.pageHeading}>
          <div>
            <button onClick={onBack} style={styles.backButton}>← Retour à la liste</button>
            <div style={styles.titleLine}><h1 style={styles.title}>Détails de la réclamation</h1><span style={styles.reference}>{reclamation.reference || `#${String(reclamation._id || reclamationId).slice(-6)}`}</span></div>
          </div>
          <button type="button" style={styles.printButton} onClick={() => window.print()}>▣ Imprimer</button>
        </div>

        {(actionMessage || actionError) && <div role={actionError ? "alert" : "status"} style={{ ...styles.notice, ...(actionError ? styles.noticeError : styles.noticeSuccess) }}>{actionError || actionMessage}</div>}

        <div className="detail-grid" style={styles.topGrid}>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Informations client</h2>
            <div style={styles.clientRow}><div style={styles.clientAvatar}>♙</div><div style={{ minWidth: 0 }}><strong style={styles.clientName}>{[client.prenom, client.nom].filter(Boolean).join(" ") || "Client non renseigné"}</strong><div style={styles.muted}>{client.email || "Email non renseigné"}</div><div style={styles.contactLine}>☎ {client.telephone || client.phone || reclamation.clientTelephone || "Téléphone non renseigné"}</div><div style={styles.contactLine}>⌖ {client.adresse || client.address || reclamation.clientAdresse || "Adresse non renseignée"}</div></div></div>
          </section>

          <section style={styles.statusCard}>
            <h2 style={styles.sectionTitle}>Statut actuel</h2>
            <span style={{ ...styles.statusBadge, ...(status === "Soumise" ? styles.pending : status === "En cours" ? styles.inProgress : status === "Traitée" ? styles.done : status === "Fausse" ? styles.falseStatus : styles.cancelled) }}>{status === "En cours" ? "◉ " : ""}{statusLabel}</span>
            <div style={styles.managerInfo}><strong>Prise en charge par :</strong><div>{managerName}</div></div>
            <div style={styles.managerInfo}><strong>Depuis le :</strong><div>{assignedAt ? formatDate(assignedAt) : "En attente de prise en charge"}</div></div>
            {isAssignedToOther && <p style={styles.lockMessage}>🔒 Cette réclamation est déjà prise en charge par un autre gestionnaire.</p>}
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Actions</h2>
            <div style={styles.actionStack}>
              {status === "Soumise" && <button type="button" style={{ ...styles.actionButton, ...styles.takeButton }} disabled={updatingStatus || isAssignedToOther} onClick={() => updateStatut("En cours")}>{updatingStatus ? "Enregistrement…" : "♧ Prise en charge"}</button>}
              {status === "En cours" && <button type="button" style={{ ...styles.actionButton, ...styles.takeButton, opacity: 0.65 }} disabled>✓ Réclamation prise en charge</button>}
              {!isClosed && <button type="button" style={{ ...styles.actionButton, ...styles.doneButton }} disabled={updatingStatus || !canProcess} onClick={() => updateStatut("Traitée")}>✓ Marquer comme validée</button>}
              {!isClosed && <button type="button" style={{ ...styles.actionButton, ...styles.falseButton }} disabled={updatingStatus || !canProcess} onClick={() => updateStatut("Fausse")}>⊘ Marquer comme fausse</button>}
              {!isClosed && <button type="button" style={{ ...styles.actionButton, ...styles.cancelButton }} disabled={updatingStatus || !canProcess} onClick={() => updateStatut("Annulée")}>▣ Annuler</button>}
              {isClosed && <div style={styles.closedMessage}>Cette réclamation est clôturée.</div>}
            </div>
          </section>
        </div>

        <div className="detail-grid" style={styles.detailsGrid}>
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Détails de la réclamation</h2>
            <div style={styles.detailRows}>
              <DetailRow label="Objet" value={reclamation.objet || reclamation.sujet || reclamation.type || "—"} />
              <DetailRow label="Catégorie" value={reclamation.categorie || reclamation.type || "—"} />
              <DetailRow label="Police" value={reclamation.police || "—"} />
              <DetailRow label="Attestation" value={reclamation.attestation || "—"} />
              <DetailRow label="Type d'immatriculation" value={reclamation.matriculeType || "—"} />
              <DetailRow label="Immatriculation" value={reclamation.matricule || "—"} />
              <DetailRow label="Description" value={reclamation.commentaire || reclamation.description || "Aucune description fournie."} multiline />
              <DetailRow label="Date de soumission" value={formatDate(submittedAt)} />
            </div>
          </section>

          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Pièces jointes <span style={styles.countBadge}>{files.length}</span></h2>
            {files.length === 0 ? <p style={styles.emptyText}>Aucune pièce jointe.</p> : <div style={styles.filesContainer}>{files.map((file, index) => <div key={`${file.name}-${index}`} style={styles.fileItem}><div style={styles.fileIcon}>▤</div><div style={styles.fileText}><strong>{file.name || `Fichier ${index + 1}`}</strong><small style={{ color: "#718096" }}>{file.type || "Fichier joint"}{file.size !== undefined ? ` · ${formatFileSize(file.size)}` : ""}</small></div><div style={styles.fileActions}><button type="button" style={styles.viewFileButton} onClick={() => handleFileAction(index, false)}>Voir</button><button type="button" style={styles.downloadFileButton} onClick={() => handleFileAction(index, true)}>⇩ Télécharger</button></div></div>)}</div>}
          </section>
        </div>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Historique de traitement</h2>
          <div style={styles.timeline}>
            <div style={styles.timelineItem}><span style={styles.timelineDotActive}></span><div><strong>{assignedAt ? formatDate(assignedAt) : "En attente de prise en charge"}</strong><p>{assignedAt ? `Prise en charge de la réclamation par ${managerName}` : "La réclamation n'a pas encore été prise en charge."}</p></div></div>
            <div style={styles.timelineItem}><span style={styles.timelineDot}></span><div><strong>{formatDate(submittedAt)}</strong><p>Réclamation soumise par {[client.prenom, client.nom].filter(Boolean).join(" ") || "le client"}</p></div></div>
            {reclamation.dateModificationStatut && <div style={styles.timelineItem}><span style={styles.timelineDot}></span><div><strong>{formatDate(reclamation.dateModificationStatut)}</strong><p>Dernière mise à jour du statut : {statusLabel}</p></div></div>}
          </div>
        </section>
      </main>
      <style>{`
        .reclamation-details-page button {
          transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
          -webkit-tap-highlight-color: transparent;
        }
        .reclamation-details-page button:not(:disabled):hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
          box-shadow: 0 5px 12px rgba(23, 48, 80, .14);
        }
        .reclamation-details-page button:not(:disabled):active {
          transform: translateY(0) scale(.98);
          box-shadow: 0 1px 3px rgba(23, 48, 80, .12);
        }
        .reclamation-details-page button:focus-visible {
          outline: 3px solid rgba(37, 99, 235, .3);
          outline-offset: 3px;
        }
        .reclamation-details-page button:disabled {
          cursor: not-allowed;
          box-shadow: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .reclamation-details-page button { transition: none; }
          .reclamation-details-page button:not(:disabled):hover,
          .reclamation-details-page button:not(:disabled):active { transform: none; }
        }
        @media(max-width:900px){.detail-grid{grid-template-columns:1fr!important}}
        @media print{button{display:none!important} body{background:white!important}}
      `}</style>
    </div>
  );
}

/* =========================
   PETIT COMPOSANT INFO
========================= */


function DetailRow({ label, value, multiline = false }) {
  return <div style={styles.detailRow}><strong>{label}</strong><span style={multiline ? styles.multilineValue : undefined}>{value}</span></div>;
}

function InfoItem({ label, value }) {
  return (
    <div style={styles.infoItem}>
      <span style={styles.label}>
        {label}
      </span>

      <span style={styles.value}>
        {value}
      </span>
    </div>
  );
}

/* =========================
   FORMAT TAILLE FICHIER
========================= */

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) {
    return "0 octet";
  }

  const units = [
    "octets",
    "Ko",
    "Mo",
    "Go",
  ];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024)
  );

  const size = bytes / Math.pow(1024, index);

  return `${size.toFixed(
    index === 0 ? 0 : 2
  )} ${units[index]}`;
}

/* =========================
   STYLES
========================= */

const styles = {
  page: { minHeight: "100%", background: "#f4f7fb", color: "#17243b", fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif", margin: "-0px", paddingBottom: 28 },
  topbar: { display: "flex", alignItems: "center", gap: 14, padding: "15px 24px", background: "#fff", borderBottom: "1px solid #e7edf5", position: "relative", top: "auto", zIndex: "auto" },
  brandMark: { width: 46, height: 38, borderRadius: 10, display: "grid", placeItems: "center", background: "#0c253d", color: "#fff", fontWeight: 900, letterSpacing: 1 },
  topbarTitle: { fontSize: 14, fontWeight: 800 }, topbarSub: { fontSize: 11, color: "#718096", marginTop: 3 },
  profile: { display: "flex", alignItems: "center", gap: 9, fontSize: 12 }, avatar: { width: 32, height: 32, borderRadius: "50%", display: "grid", placeItems: "center", background: "#14243d", color: "white", fontWeight: 800 },
  main: { maxWidth: 1450, margin: "0 auto", padding: "8px clamp(14px, 2.2vw, 32px) 24px" },
  pageHeading: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  backButton: { border: "1px solid #e3eaf3", borderRadius: 8, background: "#fff", color: "#475569", cursor: "pointer", fontSize: 12, fontWeight: 700, padding: "9px 12px", marginBottom: 10 },
  titleLine: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }, title: { margin: 0, fontSize: 25, fontWeight: 850, letterSpacing: "-0.7px" }, reference: { borderRadius: 20, padding: "5px 10px", background: "#e3efff", color: "#2160c4", fontWeight: 800, fontSize: 12 },
  printButton: { border: "1px solid #e1e8f0", borderRadius: 8, background: "#fff", color: "#26364c", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  topGrid: { display: "grid", gridTemplateColumns: "minmax(220px, 1.05fr) minmax(220px, 1fr) minmax(190px, .8fr)", gap: 14, alignItems: "stretch", marginBottom: 14 },
  detailsGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.15fr) minmax(300px, .85fr)", gap: 14, marginBottom: 14 },
  card: { minWidth: 0, background: "#fff", border: "1px solid #e8eef6", borderRadius: 13, padding: "18px 18px", boxShadow: "0 4px 16px rgba(24, 48, 82, .035)" },
  statusCard: { minWidth: 0, background: "linear-gradient(145deg,#f0f7ff,#e8f2ff)", border: "1px solid #d8e8fc", borderRadius: 13, padding: "18px", boxShadow: "0 4px 16px rgba(24, 48, 82, .035)" },
  sectionTitle: { margin: "0 0 16px", fontSize: 15, fontWeight: 800, color: "#182943", display: "flex", alignItems: "center", gap: 8 },
  clientRow: { display: "flex", alignItems: "flex-start", gap: 12 }, clientAvatar: { flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: "#e4efff", color: "#2867c7", display: "grid", placeItems: "center", fontSize: 23 }, clientName: { display: "block", fontSize: 13, margin: "1px 0 5px" }, muted: { fontSize: 11, color: "#64748b", overflowWrap: "anywhere" }, contactLine: { fontSize: 11, color: "#52647c", marginTop: 9 },
  statusBadge: { display: "inline-block", padding: "6px 11px", borderRadius: 20, fontSize: 11, fontWeight: 800 }, pending: { background: "#fff0c2", color: "#a05c00" }, inProgress: { background: "#dceaff", color: "#1d5ec4" }, done: { background: "#c9f4e3", color: "#087b59" }, falseStatus: { background: "#ffe0e0", color: "#c32929" }, cancelled: { background: "#e7ebf1", color: "#596579" }, managerInfo: { fontSize: 11, color: "#52647c", marginTop: 13, lineHeight: 1.55 }, lockMessage: { fontSize: 11, color: "#a35a00", lineHeight: 1.5, margin: "12px 0 0" },
  actionStack: { display: "flex", flexDirection: "column", gap: 8 }, actionButton: { border: 0, borderRadius: 7, padding: "10px 10px", color: "#fff", fontSize: 11, fontWeight: 800, cursor: "pointer", textAlign: "center" }, takeButton: { background: "#d8e0e9", color: "#526174" }, doneButton: { background: "#07855f" }, falseButton: { background: "#f8bd32", color: "#fff" }, cancelButton: { background: "#e62929" }, closedMessage: { fontSize: 12, color: "#64748b", background: "#f5f7fa", padding: 12, borderRadius: 8 },
  detailRows: { display: "flex", flexDirection: "column" }, detailRow: { display: "grid", gridTemplateColumns: "minmax(120px, .42fr) minmax(0, 1fr)", gap: 14, padding: "11px 0", borderBottom: "1px solid #edf1f6", fontSize: 12, lineHeight: 1.5 }, multilineValue: { whiteSpace: "pre-wrap", overflowWrap: "anywhere", color: "#52647c" }, countBadge: { borderRadius: 20, padding: "3px 7px", background: "#edf3fb", color: "#52647c", fontSize: 10 },
  filesContainer: { display: "flex", flexDirection: "column", gap: 9 }, fileItem: { display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid #edf1f6", padding: "10px 0", minWidth: 0, flexWrap: "wrap" }, fileIcon: { flexShrink: 0, width: 29, height: 34, borderRadius: 6, display: "grid", placeItems: "center", background: "#f1f5fb", color: "#5a6a81", fontSize: 17 }, fileText: { display: "flex", flex: "1 1 100px", flexDirection: "column", gap: 4, minWidth: 0, fontSize: 11, overflowWrap: "anywhere" }, fileTextSmall: { color: "#718096" }, fileActions: { display: "flex", gap: 5, flexWrap: "wrap" }, viewFileButton: { border: "1px solid #8ab5ff", borderRadius: 6, padding: "6px 9px", color: "#2160c4", background: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer" }, downloadFileButton: { border: "1px solid #8ab5ff", borderRadius: 6, padding: "6px 9px", color: "#2160c4", background: "#fff", fontSize: 10, fontWeight: 800, cursor: "pointer" }, emptyText: { color: "#718096", fontSize: 12 },
  timeline: { display: "flex", flexDirection: "column", gap: 0, paddingLeft: 4 }, timelineItem: { display: "flex", alignItems: "flex-start", gap: 13, padding: "8px 0", fontSize: 11, color: "#64748b" }, timelineDotActive: { flexShrink: 0, marginTop: 3, width: 10, height: 10, borderRadius: "50%", background: "#2563eb", boxShadow: "0 0 0 4px #e5efff" }, timelineDot: { flexShrink: 0, marginTop: 3, width: 10, height: 10, borderRadius: "50%", background: "#a5b4c6", boxShadow: "0 0 0 4px #f0f3f7" },
  notice: { borderRadius: 8, padding: "10px 13px", marginBottom: 14, fontSize: 12, fontWeight: 600 }, noticeError: { background: "#fff0f0", color: "#b91c1c" }, noticeSuccess: { background: "#e8fbf1", color: "#087b4b" }, errorCard: { background: "#fff1f2", borderRadius: 14, padding: 24, marginTop: 20 },
};

export default GestionnaireReclamationDetails;