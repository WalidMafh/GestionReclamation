import { useState } from "react";
import AuthLayout from "../components/AuthLayout";
import PasswordField from "../components/PasswordField";
import "../Authentication.css";

function Register({ onRegisterSuccess, onBackToLogin }) {
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError(
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }

    if (password !== confirmation) {
      setError(
        "Les mots de passe ne correspondent pas."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            nom: nom.trim(),
            prenom: prenom.trim(),
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Impossible de créer le compte."
        );
      }

      setSuccess(
        "Votre compte a été créé avec succès."
      );

      setNom("");
      setPrenom("");
      setEmail("");
      setPassword("");
      setConfirmation("");

      setTimeout(() => {
        onRegisterSuccess();
      }, 1200);

    } catch (error) {
      setError(
        error.message ||
          "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <form
        className="login-form"
        onSubmit={handleSubmit}
      >
        <div className="login-header">
          <span className="login-badge">
            INSCRIPTION
          </span>

          <h1>Créer un compte</h1>

          <p>
            Créez votre espace client pour gérer
            et suivre vos réclamations.
          </p>
        </div>

        {error && (
          <div className="auth-error">
            {error}
          </div>
        )}

        {success && (
          <div className="auth-success">
            {success}
          </div>
        )}

        <div className="register-grid">

          <div className="auth-field">
            <label htmlFor="prenom">
              Prénom
            </label>

            <input
              id="prenom"
              type="text"
              value={prenom}
              onChange={(e) =>
                setPrenom(e.target.value)
              }
              placeholder="Votre prénom"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="nom">
              Nom
            </label>

            <input
              id="nom"
              type="text"
              value={nom}
              onChange={(e) =>
                setNom(e.target.value)
              }
              placeholder="Votre nom"
              required
            />
          </div>

        </div>

        <div className="auth-field">
          <label htmlFor="register-email">
            Adresse email
          </label>

          <input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            placeholder="exemple@email.com"
            required
          />
        </div>

        <PasswordField
          value={password}
          onChange={setPassword}
        />

        <div className="auth-field">
          <label htmlFor="confirmation">
            Confirmer le mot de passe
          </label>

          <input
            id="confirmation"
            type="password"
            value={confirmation}
            onChange={(e) =>
              setConfirmation(e.target.value)
            }
            placeholder="Confirmez votre mot de passe"
            required
          />
        </div>

        <button
          type="submit"
          className="login-button"
          disabled={loading}
        >
          {loading
            ? "Création..."
            : "Créer mon compte"}
        </button>

        <div className="auth-switch">
          <span>
            Vous avez déjà un compte ?
          </span>

          <button
            type="button"
            onClick={onBackToLogin}
          >
            Se connecter
          </button>
        </div>

      </form>
    </AuthLayout>
  );
}

export default Register;