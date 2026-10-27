import AuthLayout from "../components/AuthLayout";
import LoginForm from "../components/LoginForm";
import "../Authentication.css";

function Login({
  onLoginSuccess,
  onCreateAccount,
}) {
  return (
    <AuthLayout>
      <LoginForm
        onLoginSuccess={onLoginSuccess}
        onCreateAccount={onCreateAccount}
      />
    </AuthLayout>
  );
}

export default Login;