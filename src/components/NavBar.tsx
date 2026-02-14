import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './NavBar.css';

export default function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: '策略' },
    { path: '/backtest/stream', label: '回测' },
    { path: '/favorites', label: '收藏' },
  ];

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-content">
          <Link to="/dashboard" className="navbar-logo">
            Open<span>Trader</span>
          </Link>

          <div className="navbar-links">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`navbar-link ${isActive(item.path) ? 'active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="navbar-user">
            <span className="navbar-username">{user?.username || '用户'}</span>
            <button onClick={handleLogout} className="navbar-logout">
              退出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
