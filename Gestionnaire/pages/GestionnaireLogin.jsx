import { useState } from "react";
import "../Gestionnaire.css";

function GestionnaireLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Email ou mot de passe incorrect.");
      }

      if (String(data.user?.role || "").toLowerCase() !== "gestionnaire") {
        throw new Error("Accès refusé. Ce compte n'est pas un compte gestionnaire.");
      }

      if (!data.access_token) {
        throw new Error("Le serveur n'a pas retourné de token de connexion.");
      }

      // GestionnaireApp et son heartbeat utilisent sessionStorage.
      sessionStorage.setItem("gestionnaire_token", data.access_token);
      sessionStorage.setItem("gestionnaire_user", JSON.stringify(data.user));

      // Nettoyer les clés génériques éventuellement laissées par un autre espace.
      sessionStorage.removeItem("access_token");
      sessionStorage.removeItem("current_user");

      onLoginSuccess(data.user, data.access_token);
    } catch (err) {
      setError(err.message || "Une erreur est survenue pendant la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gestionnaire-login-page">
      <div className="gestionnaire-login-card">
        <div className="gestionnaire-login-header">
          <div className="gestionnaire-logo">G</div>
          <span className="gestionnaire-badge">ESPACE GESTIONNAIRE</span>
          <h1>Bienvenue</h1>
          <p>
            Connectez-vous à votre espace de gestion
            des réclamations.
          </p>
        </div>

        {error && (
          <div className="gestionnaire-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="gestionnaire-login-form">
          <div className="gestionnaire-field">
            <label htmlFor="gestionnaire-email">Adresse email</label>
            <input
              id="gestionnaire-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gestionnaire@exemple.com"
              autoComplete="username"
              required
            />
          </div>

          <div className="gestionnaire-field">
            <label htmlFor="gestionnaire-password">Mot de passe</label>
            <div className="gestionnaire-password-wrapper">
              <input
                id="gestionnaire-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez votre mot de passe"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="gestionnaire-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="gestionnaire-login-button"
            disabled={loading}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="gestionnaire-login-footer">
          <span>Accès réservé aux gestionnaires autorisés.</span>
        </div>
      </div>
    </div>
  );
}

export default GestionnaireLogin;
