import NavBar from '../components/NavBar';
import './Contact.css';

export default function Contact() {
  return (
    <div className="contact-page">
      <NavBar />

      <div className="contact-container">
        <div className="contact-card">
          <div className="contact-avatar">👤</div>
          <h1 className="contact-title">联系我</h1>
          <p className="contact-subtitle">欢迎交流，一起探索 🚀</p>

          <div className="contact-divider" />

          {/* 邮箱 */}
          <div className="contact-item">
            <span className="contact-icon">📧</span>
            <div className="contact-info">
              <span className="contact-label">邮箱</span>
              <a href="mailto:xinos_zeng@163.com" className="contact-value">
                xinos_zeng@163.com
              </a>
            </div>
          </div>

          {/* 小红书 */}
          <div className="contact-item">
            <span className="contact-icon">📕</span>
            <div className="contact-info">
              <span className="contact-label">小红书 ID</span>
              <span className="contact-value">Xinos</span>
            </div>
          </div>

          {/* 小红书群聊 */}
          <div className="contact-item">
            <span className="contact-icon">💬</span>
            <div className="contact-info">
              <span className="contact-label">群聊</span>
              <span className="contact-value contact-highlight">欢迎加入小红书群聊交流 🎉</span>
            </div>
          </div>

          <div className="contact-divider" />

          {/* 项目链接 */}
          <div className="contact-projects">
            <h2 className="contact-projects-title">🔗 我的项目</h2>
            <a
              href="https://xinos-zeng.github.io/currency.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-project-link"
            >
              <span className="project-icon">💱</span>
              <div className="project-info">
                <span className="project-name">汇率小助手</span>
                <span className="project-url">xinos-zeng.github.io/currency.github.io</span>
              </div>
              <span className="project-arrow">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
