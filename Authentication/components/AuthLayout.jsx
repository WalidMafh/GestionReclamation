import catLogo from "../assets/cat-logo.png";

function AuthLayout({ children }) {
  return (
    <main className="auth-page">
      <section className="auth-left" aria-label="Présentation de CAT">
        <div className="auth-brand">
          <img className="auth-brand-logo" src={catLogo} alt="CAT Assurance & Réassurance" />
        </div>

        <div className="auth-hero">
          <div className="auth-eyebrow"><span />GESTION DES RÉCLAMATIONS</div>
          <h1>
            Gérez vos réclamations
            <span> simplement.</span>
          </h1>
          <p>
            Accédez à votre espace personnel, créez vos réclamations et suivez
            leur traitement en temps réel.
          </p>
        </div>

        <div className="auth-benefits">
          <article className="auth-benefit">
            <div className="benefit-icon" aria-hidden="true">▤</div>
            <strong>Création facile</strong>
            <p>Déposez vos réclamations en quelques clics.</p>
          </article>
          <article className="auth-benefit">
            <div className="benefit-icon" aria-hidden="true">⌕</div>
            <strong>Suivi en temps réel</strong>
            <p>Consultez l’état de vos dossiers à tout moment.</p>
          </article>
          <article className="auth-benefit">
            <div className="benefit-icon" aria-hidden="true">◇</div>
            <strong>Données sécurisées</strong>
            <p>Vos informations sont protégées et confidentielles.</p>
          </article>
        </div>
      </section>

      <section className="auth-right" aria-label="Connexion">
        {children}
      </section>
    </main>
  );
}

export default AuthLayout;
