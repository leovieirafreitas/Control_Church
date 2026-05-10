import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff } from 'lucide-react';
import logoImg from '../assets/logo.png';

const Login = () => {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    if (error) {
      setError('E-mail ou senha incorretos. Tente novamente.');
    }
    setLoading(false);
  };

  return (
    <div className="login-bg">
      {/* Orbs decorativos */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      <div className="login-card">
        {/* Logo */}
        <div className="flex items-center justify-center mb-6">
          <img src={logoImg} alt="ChamaChurch Logo" style={{ height: '52px', objectFit: 'contain' }} />
        </div>

        <div className="login-divider" />

        <h2 className="login-heading">Bem-vindo de volta</h2>
        <p className="login-desc">Faça login para acessar o painel</p>

        <form onSubmit={handleSubmit} className="login-form">
          {/* E-mail */}
          <div className="login-field">
            <label className="login-label">E-mail</label>
            <div className="login-input-wrap">
              <Mail size={17} className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                className="login-input"
                placeholder="seu@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Senha */}
          <div className="login-field">
            <label className="login-label">Senha</label>
            <div className="login-input-wrap">
              <Lock size={17} className="login-input-icon" />
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="login-input"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPass(p => !p)}
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* Botão */}
          <button
            id="login-submit"
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        <p className="login-footer">
          ChamaChurch © {new Date().getFullYear()} · Controle de Voluntários
        </p>
      </div>
    </div>
  );
};

export default Login;
