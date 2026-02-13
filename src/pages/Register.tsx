import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();
  
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (form.password !== form.confirmPassword) {
      setLocalError('两次输入的密码不一致');
      return;
    }

    if (form.password.length < 6) {
      setLocalError('密码长度不能少于6位');
      return;
    }

    const success = await register({
      username: form.username,
      email: form.email,
      password: form.password,
    });

    if (success) {
      navigate('/login');
    }
  };

  const displayError = localError || error;

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <h1>Open<span>Trader</span></h1>
          <p>AI 驱动的量化交易平台</p>
        </div>

        <div className="card auth-card">
          <h2>创建账号</h2>
          
          {displayError && (
            <div className="error-box">
              {displayError}
              <button onClick={() => { clearError(); setLocalError(''); }}>✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">用户名</label>
              <input
                type="text"
                className="input"
                placeholder="请输入用户名（3-64字符）"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                minLength={3}
                maxLength={64}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">邮箱</label>
              <input
                type="email"
                className="input"
                placeholder="请输入邮箱地址"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">密码</label>
              <input
                type="password"
                className="input"
                placeholder="请输入密码（至少6位）"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">确认密码</label>
              <input
                type="password"
                className="input"
                placeholder="请再次输入密码"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                required
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
              {isLoading ? '注册中...' : '注册'}
            </button>
          </form>

          <div className="auth-footer">
            已有账号？<Link to="/login">立即登录</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
