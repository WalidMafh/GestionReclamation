import { useRef, useState } from "react";
import "./ProductionForm.css";

function ProductionForm({ onReclamationCreated }) {
  const [police, setPolice] = useState("");
  const [attestation, setAttestation] = useState("");

  const [matriculeType, setMatriculeType] = useState("");
  const [matricule, setMatricule] = useState("");

  // Matricule marocain : numéro - lettre - code
  const [matriculeNumero, setMatriculeNumero] = useState("");
  const [matriculeLettre, setMatriculeLettre] = useState("");
  const [matriculeCode, setMatriculeCode] = useState("");

  const [commentaire, setCommentaire] = useState("");
  const [files, setFiles] = useState([]);

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [reference, setReference] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const fileInputRef = useRef(null);

  // Réinitialiser les champs du matricule
  const resetMatricule = () => {
    setMatricule("");
    setMatriculeNumero("");
    setMatriculeLettre("");
    setMatriculeCode("");
  };

  // Numéro de police
  const handlePoliceChange = (e) => {
    const value = e.target.value.toUpperCase();

    setPolice(value);
    setErrors((prev) => ({ ...prev, police: "" }));
    setSuccess(false);
    setApiError("");
  };

  // Numéro d'attestation : chiffres uniquement
  const handleAttestationChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 9);

    setAttestation(value);
    setErrors((prev) => ({ ...prev, attestation: "" }));
    setSuccess(false);
    setApiError("");
  };

  // Première partie du matricule : chiffres uniquement
  const handleMatriculeNumeroChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 5);

    setMatriculeNumero(value);
    setErrors((prev) => ({ ...prev, matricule: "" }));
    setSuccess(false);
    setApiError("");
  };

  // Deuxième partie du matricule : une lettre arabe ou latine
  const handleMatriculeLettreChange = (e) => {
    const value = e.target.value
      .replace(/[^a-zA-Z\u0621-\u064A]/g, "")
      .slice(0, 1);

    setMatriculeLettre(value);
    setErrors((prev) => ({ ...prev, matricule: "" }));
    setSuccess(false);
    setApiError("");
  };

  // Troisième partie du matricule : chiffres uniquement
  const handleMatriculeCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 2);

    setMatriculeCode(value);
    setErrors((prev) => ({ ...prev, matricule: "" }));
    setSuccess(false);
    setApiError("");
  };

  // Matricule WW ou étranger
  const handleMatriculeChange = (e) => {
    setMatricule(e.target.value);

    setErrors((prev) => ({ ...prev, matricule: "" }));
    setSuccess(false);
    setApiError("");
  };

  // Matricule WW : préfixe fixe WW- et 6 chiffres
const handleWWMatriculeChange = (e) => {
  const value = e.target.value
    .replace(/^WW-/i, "")
    .replace(/\D/g, "")
    .slice(0, 6);

  setMatricule(value);
  setErrors((prev) => ({ ...prev, matricule: "" }));
  setSuccess(false);
  setApiError("");
};

  // Ajouter des fichiers
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    setFiles((prev) => [...prev, ...selectedFiles]);

    // Permet de sélectionner à nouveau le même fichier
    e.target.value = "";
  };

  // Supprimer un fichier
  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation et enregistrement de la réclamation
  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};

    // Validation de la police
    if (!/^C\d{4}\/\d{6}$/.test(police)) {
      newErrors.police =
        "Format invalide. Exemple : C1234/123456";
    }

    // Validation de l'attestation
    if (!/^\d{9}$/.test(attestation)) {
      newErrors.attestation =
        "Le numéro doit contenir exactement 9 chiffres.";
    }

    // Validation du type d'immatriculation
    if (!matriculeType) {
      newErrors.matriculeType =
        "Veuillez sélectionner un type d'immatriculation.";
    }

    // Validation du matricule marocain
    if (matriculeType === "arabe") {
      if (
        !matriculeNumero ||
        !matriculeLettre ||
        !matriculeCode
      ) {
        newErrors.matricule =
          "Veuillez remplir les trois parties du matricule.";
      }
    }

    // Validation du matricule WW
    if (matriculeType === "W" && !/^\d{6}$/.test(matricule)) {
    newErrors.matricule =
        "Le matricule WW doit contenir exactement 6 chiffres après WW-.";
    }

    // Validation du matricule étranger
    if (
      matriculeType === "francais" &&
      !matricule.trim()
    ) {
      newErrors.matricule =
        "Veuillez saisir votre immatriculation.";
    }

    // Validation du commentaire
    if (commentaire.trim().length < 5) {
      newErrors.commentaire =
        "Veuillez saisir un commentaire d'au moins 5 caractères.";
    }

    setErrors(newErrors);
    setSuccess(false);
    setApiError("");

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    // Construire le matricule complet
    const matriculeComplet =
    matriculeType === "arabe"
        ? `${matriculeNumero}-${matriculeLettre}-${matriculeCode}`
        : matriculeType === "W"
        ? `WW-${matricule}`
        : matricule.trim();

    // Préparer les données au format attendu par FastAPI (Form + File)
    const formData = new FormData();
    formData.append("reference", `REC-${Date.now()}`);
    formData.append("type", "Production");
    formData.append("dateCreation", new Date().toLocaleDateString("fr-FR"));
    formData.append("statut", "Soumise");
    formData.append("police", police);
    formData.append("attestation", attestation);
    formData.append("matriculeType", matriculeType);
    formData.append("matricule", matriculeComplet);
    formData.append("commentaire", commentaire.trim());

    // Envoyer les fichiers réels, pas seulement leurs métadonnées
    files.forEach((file) => formData.append("files", file));

    setIsSubmitting(true);

    try {
      const token = sessionStorage.getItem("access_token");

      if (!token) {
        setApiError("Session expirée ou token manquant. Reconnectez-vous.");
        return;
      }

      const response = await fetch("http://127.0.0.1:8000/reclamations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Ne pas définir Content-Type manuellement avec FormData.
          // Le navigateur ajoute automatiquement la boundary multipart.
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        const detail = Array.isArray(result.detail)
          ? result.detail.map((item) => item.msg || JSON.stringify(item)).join(" ; ")
          : result.detail;
        throw new Error(
          detail || "Une erreur est survenue lors de l'enregistrement."
        );
      }

      const savedReclamation = result.reclamation;

      // Actualiser la liste dans App.jsx
      onReclamationCreated?.(savedReclamation);

      // Afficher la confirmation
      setReference(savedReclamation.reference);
      setSuccess(true);

      // Réinitialiser les champs
      setPolice("");
      setAttestation("");
      setMatriculeType("");
      setMatricule("");
      setMatriculeNumero("");
      setMatriculeLettre("");
      setMatriculeCode("");
      setCommentaire("");
      setFiles([]);
      setErrors({});
      setApiError("");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi :", error);

      setApiError(
        error.message ||
          "Impossible de contacter le serveur. Vérifiez que FastAPI est démarré."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      className="production-form"
      onSubmit={handleSubmit}
      noValidate
    >
      {/* SECTION 1 : INFORMATIONS DU CONTRAT */}

      <div className="production-section">
        <div className="production-section-heading">
          <div className="production-section-icon">01</div>

          <div>
            <h3>Informations du contrat</h3>
            <p>
              Veuillez renseigner les informations relatives à votre contrat.
            </p>
          </div>
        </div>

        <div className="production-grid">
          {/* POLICE */}

          <div className="production-field">
            <label htmlFor="police">
              Numéro de police <span>*</span>
            </label>

            <input
              id="police"
              type="text"
              placeholder="C1234/123456"
              value={police}
              onChange={handlePoliceChange}
              maxLength={12}
              className={errors.police ? "input-error" : ""}
            />

            <small>Format : C + 4 chiffres / 6 chiffres</small>

            {errors.police && (
              <p className="field-error">{errors.police}</p>
            )}
          </div>

          {/* ATTESTATION */}

          <div className="production-field">
            <label htmlFor="attestation">
              Numéro d'attestation <span>*</span>
            </label>

            <input
              id="attestation"
              type="text"
              inputMode="numeric"
              placeholder="123456789"
              value={attestation}
              onChange={handleAttestationChange}
              maxLength={9}
              className={errors.attestation ? "input-error" : ""}
            />

            <small>9 chiffres exactement</small>

            {errors.attestation && (
              <p className="field-error">{errors.attestation}</p>
            )}
          </div>

          {/* TYPE D'IMMATRICULATION */}

          <div className="production-field">
            <label htmlFor="matriculeType">
              Type d'immatriculation <span>*</span>
            </label>

            <select
              id="matriculeType"
              value={matriculeType}
              onChange={(e) => {
                setMatriculeType(e.target.value);
                resetMatricule();

                setErrors((prev) => ({
                  ...prev,
                  matriculeType: "",
                  matricule: "",
                }));

                setSuccess(false);
                setApiError("");
              }}
              className={
                errors.matriculeType ? "input-error" : ""
              }
            >
              <option value="">Sélectionner un type</option>
              <option value="arabe">
                Immatriculation marocaine (Arabe)
              </option>
              <option value="W">Immatriculation WW</option>
              <option value="francais">
                Immatriculation étrangère
              </option>
            </select>

            {errors.matriculeType && (
              <p className="field-error">
                {errors.matriculeType}
              </p>
            )}
          </div>

          {/* IMMATRICULATION */}

          <div className="production-field">
            <label>
              Immatriculation <span>*</span>
            </label>

            {/* MATRICULE MAROCAIN */}

            {matriculeType === "arabe" && (
              <>
                <div className="matricule-parts">
                  {/* PREMIÈRE CASE : NUMÉRO */}

                  <div className="matricule-part">
                    <label htmlFor="matriculeNumero">
                      Numéro
                    </label>

                    <input
                      id="matriculeNumero"
                      type="text"
                      inputMode="numeric"
                      placeholder="12345"
                      maxLength={5}
                      value={matriculeNumero}
                      onChange={handleMatriculeNumeroChange}
                      className={
                        errors.matricule ? "input-error" : ""
                      }
                    />

                    <small>Max. 5 chiffres</small>
                  </div>

                  {/* DEUXIÈME CASE : LETTRE ARABE OU LATINE */}

                  <div className="matricule-part">
                    <label htmlFor="matriculeLettre">
                      Lettre
                    </label>

                    <input
                      id="matriculeLettre"
                      type="text"
                      placeholder="A / د"
                      maxLength={1}
                      value={matriculeLettre}
                      onChange={handleMatriculeLettreChange}
                      className={
                        errors.matricule ? "input-error" : ""
                      }
                    />

                    <small>1 lettre arabe ou latine</small>
                  </div>

                  {/* TROISIÈME CASE : CODE */}

                  <div className="matricule-part">
                    <label htmlFor="matriculeCode">
                      Code
                    </label>

                    <input
                      id="matriculeCode"
                      type="text"
                      inputMode="numeric"
                      placeholder="7"
                      maxLength={2}
                      value={matriculeCode}
                      onChange={handleMatriculeCodeChange}
                      className={
                        errors.matricule ? "input-error" : ""
                      }
                    />

                    <small>Max. 2 chiffres</small>
                  </div>
                </div>

                {/* APERÇU DU MATRICULE */}

                {(matriculeNumero ||
                  matriculeLettre ||
                  matriculeCode) && (
                  <div className="matricule-preview">
                    <small>Aperçu du matricule</small>

                    <strong dir="ltr">
                      {matriculeNumero || "_____"}
                      {" - "}
                      {matriculeLettre || "_"}
                      {" - "}
                      {matriculeCode || "__"}
                    </strong>
                  </div>
                )}
              </>
            )}

            {/* MATRICULE WW */}

            {matriculeType === "W" && (
            <input
                id="matricule"
                type="text"
                inputMode="numeric"
                placeholder="WW-999999"
                value={`WW-${matricule}`}
                onChange={handleWWMatriculeChange}
                maxLength={9}
                className={errors.matricule ? "input-error" : ""}
            />
            )}

            {/* MATRICULE ÉTRANGER */}

            {matriculeType === "francais" && (
              <input
                id="matricule"
                type="text"
                placeholder="Saisissez votre immatriculation"
                value={matricule}
                onChange={handleMatriculeChange}
                className={
                  errors.matricule ? "input-error" : ""
                }
              />
            )}

            {!matriculeType && (
              <input
                type="text"
                placeholder="Sélectionnez d'abord un type"
                disabled
              />
            )}

            {errors.matricule && (
              <p className="field-error">{errors.matricule}</p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2 : DÉTAILS DE LA RÉCLAMATION */}

      <div className="production-section">
        <div className="production-section-heading">
          <div className="production-section-icon">02</div>

          <div>
            <h3>Détails de la réclamation</h3>
            <p>
              Décrivez votre demande et ajoutez les documents nécessaires.
            </p>
          </div>
        </div>

        {/* COMMENTAIRE */}

        <div className="production-field">
          <label htmlFor="commentaire">
            Motif et description <span>*</span>
          </label>

          <textarea
            id="commentaire"
            rows="5"
            placeholder="Décrivez votre réclamation en détail..."
            value={commentaire}
            onChange={(e) => {
              setCommentaire(e.target.value);

              setErrors((prev) => ({
                ...prev,
                commentaire: "",
              }));

              setSuccess(false);
              setApiError("");
            }}
            className={
              errors.commentaire ? "input-error" : ""
            }
          />

          <div className="textarea-footer">
            <small>
              Veuillez fournir suffisamment de détails pour faciliter le
              traitement de votre demande.
            </small>

            <small>{commentaire.length} caractères</small>
          </div>

          {errors.commentaire && (
            <p className="field-error">{errors.commentaire}</p>
          )}
        </div>

        {/* PIÈCES JOINTES */}

        <div className="production-field">
          <label>Pièces jointes</label>

          <label
            className="production-upload"
            htmlFor="documents"
          >
            <div className="upload-icon">↑</div>

            <div>
              <strong>Ajouter vos documents</strong>
              <p>
                Cliquez pour sélectionner vos fichiers depuis votre ordinateur.
              </p>
              <small>Vous pouvez sélectionner plusieurs fichiers.</small>
            </div>

            <span className="upload-button">Parcourir</span>
          </label>

          <input
            ref={fileInputRef}
            id="documents"
            type="file"
            multiple
            hidden
            onChange={handleFileChange}
          />

          {files.length > 0 && (
            <div className="production-file-list">
              {files.map((file, index) => (
                <div
                  className="production-file-item"
                  key={`${file.name}-${index}`}
                >
                  <div className="file-info">
                    <span className="file-icon">PDF</span>

                    <div>
                      <strong>{file.name}</strong>
                      <small>
                        {(file.size / 1024).toFixed(1)} KB
                      </small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="remove-file"
                    onClick={() => removeFile(index)}
                    aria-label={`Supprimer ${file.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* BOUTON D'ENVOI */}

      <div className="production-actions">
        <p>
          <span>*</span> Champs obligatoires
        </p>

        {apiError && (
          <p className="field-error" role="alert">
            {apiError}
          </p>
        )}

        <button
          type="submit"
          className="production-submit"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Enregistrement..."
            : "Envoyer la réclamation"}

          {!isSubmitting && <span>→</span>}
        </button>
      </div>

      {/* MODAL DE SUCCÈS */}

      {success && (
        <div
          className="success-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="success-modal">
            <div className="success-check">✓</div>

            <h2>Réclamation envoyée avec succès !</h2>

            <p>
              Votre réclamation a bien été enregistrée. Vous pouvez suivre son
              traitement depuis votre espace client.
            </p>

            <div className="success-reference">
              <span>Votre référence de réclamation</span>
              <strong>{reference}</strong>
            </div>

            <button
              type="button"
              className="success-confirm-button"
              onClick={() => setSuccess(false)}
            >
              Compris
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

export default ProductionForm;