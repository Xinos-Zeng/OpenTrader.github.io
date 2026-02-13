import './StatsCard.css';

interface StatsCardProps {
  label: string;
  value: string | number;
  type?: 'default' | 'profit' | 'loss';
  icon?: string;
}

export default function StatsCard({ label, value, type = 'default', icon }: StatsCardProps) {
  return (
    <div className="card stats-card">
      <div className="stats-header">
        <span className="stats-label">{label}</span>
        {icon && <span className="stats-icon">{icon}</span>}
      </div>
      <div className={`stats-value ${type}`}>
        {value}
      </div>
    </div>
  );
}
