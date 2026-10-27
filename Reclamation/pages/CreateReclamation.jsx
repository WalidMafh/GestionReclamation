import { useRef, useState } from "react";
import ProductionForm from "../components/ProductionForm";
import "../components/ProductionForm.css";
import "./CreateReclamation.css";

function SinistreForm({ onReclamationCreated }) {
  const [numeroSinistre, setNumeroSinistre] = useState("");
  const [commentaire, setCommentaire] = useState("");
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    setFiles((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  };

  const removeFile = (indexToRemove) => {
    setFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};

    if (!numeroSinistre.trim()) {
      nextErrors.numeroSinistre = "Veuillez saisir le numéro de sinistre.";
    }
    if (commentaire.trim().length < 5) {
      nextErrors.commentaire = "Veuillez saisir au moins 5 caractères.";
    }

    setErrors(nextErrors);
    setApiError("");
    setSuccess(false);
    if (Object.keys(nextErrors).length > 0) return;

    const referenceLocale = `REC-${Date.now()}`;
    const formData = new FormData();
    formData.append("reference", referenceLocale);
    formData.append("type", "Sinistre");
    formData.append("dateCreation", new Date().toLocaleDateString("fr-FR"));
    formData.append("statut", "Soumise");
    formData.append("numeroSinistre", numeroSinistre.trim());
    formData.append("commentaire", commentaire.trim());
    files.forEach((file) => formData.append("files", file));

    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem("access_token");
      if (!token) throw new Error("Token d'authentification manquant. Reconnectez-vous.");

      const response = await fetch("http://127.0.0.1:8000/reclamations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        const detail = Array.isArray(result.detail)
          ? result.detail.map((item) => item.msg || JSON.stringify(item)).join(" ; ")
          : result.detail;
        throw new Error(detail || "Une erreur est survenue lors de l'enregistrement.");
      }

      const savedReclamation = result.reclamation || {
        reference: referenceLocale,
        type: "Sinistre",
        dateCreation: new Date().toLocaleDateString("fr-FR"),
        statut: "Soumise",
        numeroSinistre: numeroSinistre.trim(),
        commentaire: commentaire.trim(),
        files: files.map((file) => ({ name: file.name, size: file.size, type: file.type })),
      };
      onReclamationCreated?.(savedReclamation);
      setReference(savedReclamation.reference || referenceLocale);
      setSuccess(true);
      setNumeroSinistre("");
      setCommentaire("");
      setFiles([]);
      setErrors({});
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Erreur lors de l'envoi de la réclamation sinistre :", error);
      setApiError(error.message || "Impossible de contacter le serveur. Vérifiez que FastAPI est démarré.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="production-form" onSubmit={handleSubmit} noValidate>
      <div className="production-section">
        <div className="production-section-heading">
          <div className="production-section-icon">01</div>
          <div>
            <h3>Informations du sinistre</h3>
            <p>Veuillez renseigner les informations relatives à votre sinistre.</p>
          </div>
        </div>

        <div className="production-grid sinistre-grid">
          <div className="production-field">
            <label htmlFor="numeroSinistre">Numéro sinistre <span>*</span></label>
            <input
              id="numeroSinistre"
              type="text"
              placeholder="Saisissez le numéro sinistre"
              value={numeroSinistre}
              onChange={(event) => {
                setNumeroSinistre(event.target.value);
                setErrors((current) => ({ ...current, numeroSinistre: "" }));
                setApiError("");
              }}
              className={errors.numeroSinistre ? "input-error" : ""}
            />
            {errors.numeroSinistre && <p className="field-error">{errors.numeroSinistre}</p>}
          </div>
        </div>
      </div>

      <div className="production-section">
        <div className="production-section-heading">
          <div className="production-section-icon">02</div>
          <div>
            <h3>Détails de la réclamation</h3>
            <p>Décrivez votre demande et ajoutez les documents nécessaires.</p>
          </div>
        </div>

        <div className="production-field">
          <label htmlFor="commentaireSinistre">Motif et description <span>*</span></label>
          <textarea
            id="commentaireSinistre"
            rows="5"
            placeholder="Décrivez votre réclamation en détail..."
            value={commentaire}
            onChange={(event) => {
              setCommentaire(event.target.value);
              setErrors((current) => ({ ...current, commentaire: "" }));
              setApiError("");
            }}
            className={errors.commentaire ? "input-error" : ""}
          />
          <div className="textarea-footer">
            <small>Veuillez fournir suffisamment de détails pour faciliter le traitement de votre demande.</small>
            <small>{commentaire.length} caractères</small>
          </div>
          {errors.commentaire && <p className="field-error">{errors.commentaire}</p>}
        </div>

        <div className="production-field">
          <label>Pièces jointes</label>
          <label className="production-upload" htmlFor="documentsSinistre">
            <div className="upload-icon">↑</div>
            <div>
              <strong>Ajouter vos documents</strong>
              <p>Cliquez pour sélectionner vos fichiers depuis votre ordinateur.</p>
              <small>Vous pouvez sélectionner plusieurs fichiers.</small>
            </div>
            <span className="upload-button">Parcourir</span>
          </label>
          <input
            ref={fileInputRef}
            id="documentsSinistre"
            type="file"
            multiple
            hidden
            onChange={handleFileChange}
          />
          {files.length > 0 && (
            <div className="production-file-list">
              {files.map((file, index) => (
                <div className="production-file-item" key={`${file.name}-${index}`}>
                  <div className="file-info">
                    <span className="file-icon">PDF</span>
                    <div>
                      <strong>{file.name}</strong>
                      <small>{(file.size / 1024).toFixed(1)} KB</small>
                    </div>
                  </div>
                  <button type="button" className="remove-file" onClick={() => removeFile(index)} aria-label={`Supprimer ${file.name}`}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="production-actions">
        <p><span>*</span> Champs obligatoires</p>
        {apiError && <p className="field-error" role="alert">{apiError}</p>}
        <button type="submit" className="production-submit" disabled={isSubmitting}>
          {isSubmitting ? "Enregistrement..." : "Envoyer la réclamation"}
          {!isSubmitting && <span>→</span>}
        </button>
      </div>

      {success && (
        <div className="success-overlay" role="dialog" aria-modal="true">
          <div className="success-modal">
            <div className="success-check">✓</div>
            <h2>Réclamation envoyée avec succès !</h2>
            <p>Votre réclamation a bien été enregistrée. Vous pouvez suivre son traitement depuis votre espace client.</p>
            <div className="success-reference">
              <span>Votre référence de réclamation</span>
              <strong>{reference}</strong>
            </div>
            <button type="button" className="success-confirm-button" onClick={() => setSuccess(false)}>Compris</button>
          </div>
        </div>
      )}
    </form>
  );
}

function CreateReclamation({ onReclamationCreated }) {
  const [type, setType] = useState("");

  return (
    <div className="reclamation-page">
      <header className="reclamation-header">
        <div className="header-brand">
          <div className="brand-icon">R</div>
          <div>
            <h2>Gestion des Réclamations</h2>
            <p>Espace client</p>
          </div>
        </div>
        <div className="header-user">
          <span className="user-avatar">U</span>
          <span>Utilisateur</span>
        </div>
      </header>

      <main className="reclamation-container">
        <div className="page-heading">
          <div>
            <span className="page-subtitle">ESPACE RÉCLAMATION</span>
            <h1>Nouvelle Réclamation</h1>
            <p>Remplissez les informations ci-dessous pour soumettre votre réclamation.</p>
          </div>
        </div>

        <section className="reclamation-card">
          <div className="card-heading">
            <div className="step-number">01</div>
            <div>
              <h3>Type de réclamation</h3>
              <p>Sélectionnez le type de réclamation que vous souhaitez déclarer.</p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reclamation-type">Type de réclamation <span className="required">*</span></label>
            <select id="reclamation-type" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">Sélectionner un type</option>
              <option value="production">Réclamation Production</option>
              <option value="sinistre">Réclamation Sinistre</option>
            </select>
            <small>Veuillez choisir le type correspondant à votre demande.</small>
          </div>

          {type === "production" && <ProductionForm onReclamationCreated={onReclamationCreated} />}
          {type === "sinistre" && <SinistreForm onReclamationCreated={onReclamationCreated} />}
        </section>
      </main>
    </div>
  );
}

export default CreateReclamation;
