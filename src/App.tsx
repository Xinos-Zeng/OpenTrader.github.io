import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useStrategyStore } from './stores/strategyStore';

// Components
import Toast from './components/Toast';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import BacktestStream from './pages/backtest/BacktestStream';
import Favorites from './pages/Favorites';
import FavoriteDetail from './pages/FavoriteDetail';

// 路由守卫组件
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// 全局 Toast 组件
function GlobalToast() {
  const { toast, clearToast } = useStrategyStore();
  
  if (!toast) return null;
  
  return (
    <Toast
      message={toast.text}
      type={toast.type}
      onClose={clearToast}
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <GlobalToast />
      <Routes>
        {/* 公开路由 */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* 私有路由 */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        {/* 回测路由 - 统一使用流式回测页面 */}
        <Route
          path="/backtest/stream"
          element={
            <PrivateRoute>
              <BacktestStream />
            </PrivateRoute>
          }
        />
        <Route
          path="/backtest"
          element={<Navigate to="/backtest/stream" replace />}
        />
        <Route
          path="/favorites"
          element={
            <PrivateRoute>
              <Favorites />
            </PrivateRoute>
          }
        />
        <Route
          path="/favorites/:id"
          element={
            <PrivateRoute>
              <FavoriteDetail />
            </PrivateRoute>
          }
        />

        {/* 默认重定向 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
