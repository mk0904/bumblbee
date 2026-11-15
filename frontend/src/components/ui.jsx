import { Route } from 'lucide-react';
export function Badge({ children, tone = 'green' }) {
  return (
    <span className={`badge ${tone}`}>
      <span />
      {children}
    </span>
  );
}
export function PanelHeading({ number, title, children }) {
  return (
    <div className="panel-heading">
      <h2>
        <span>{number}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}
export function Empty({ icon: Icon = Route, title, children, action }) {
  return (
    <div className="empty-state">
      <Icon size={27} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
