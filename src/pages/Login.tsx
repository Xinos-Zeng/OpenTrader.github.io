import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './Auth.css';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [form, setForm] = useState({
    username: '',
    password: '',
  });

  // 当表单内容改变时，清除错误（用户开始重新输入）
  useEffect(() => {
    if (error && (form.username || form.password)) {
      // 给用户足够时间看到错误消息
      const timer = setTimeout(() => {
        clearError();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [form.username, form.password, error, clearError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError(); // 提交前先清除旧错误
    const success = await login(form);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <h1>Open<span>Trader</span></h1>
          <p>你的Agent量化交易助手</p>
        </div>

        <div className="card auth-card">
          <h2>登录</h2>
          
          {error && (
            <div className="error-box">
              {error}
              <button onClick={clearError}>✕</button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">用户名</label>
              <input
                type="text"
                className="input"
                placeholder="请输入用户名"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">密码</label>
              <input
                type="password"
                className="input"
                placeholder="请输入密码"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary btn-block">
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="auth-footer">
            还没有账号？<Link to="/register">立即注册</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
