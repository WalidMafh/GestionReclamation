import { useState } from "react";
import PasswordField from "./PasswordField";

function LoginForm({
  onLoginSuccess,
  onCreateAccount,
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Email ou mot de passe incorrect."
        );
      }

      sessionStorage.setItem(
        "access_token",
        data.access_token
      );

      sessionStorage.setItem(
        "current_user",
        JSON.stringify(data.user)
      );

      onLoginSuccess(data.user, data.access_token);

    } catch (error) {
      setError(
        error.message ||
          "Une erreur est survenue pendant la connexion."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="login-form"
      onSubmit={handleSubmit}
    >
      <div className="login-header">
        <span className="login-badge">
          CONNEXION
        </span>

        <h1>Bienvenue 👋</h1>

        <p>
          Connectez-vous pour accéder à votre espace de travail.
        </p>
      </div>

      {error && (
        <div className="auth-error">
          {error}
        </div>
      )}

      <div className="auth-field">
        <label htmlFor="email">
          Adresse email
        </label>

        <input
          id="email"
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

      <button
        type="submit"
        className="login-button"
        disabled={loading}
      >
        {loading
          ? "Connexion..."
          : "Se connecter"}
      </button>

      <div className="auth-switch">
        <span>
          Vous n'avez pas encore de compte ?
        </span>

        <button
          type="button"
          onClick={onCreateAccount}
        >
          Créer un compte
        </button>
      </div>
    </form>
  );
}

export default LoginForm;