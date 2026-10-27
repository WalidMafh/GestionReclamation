import { useState } from "react";

function PasswordField({ value, onChange }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor="password">Mot de passe</label>

      <div className="password-wrapper">
        <input
          id="password"
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Entrez votre mot de passe"
          required
        />

        <button
          type="button"
          className="password-toggle"
          onClick={() => setShowPassword(!showPassword)}
        >
          {showPassword ? "Masquer" : "Afficher"}
        </button>
      </div>
    </div>
  );
}

export default PasswordField;