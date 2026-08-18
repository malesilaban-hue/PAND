import type { ReactNode } from 'react';
import { X } from 'lucide-react';

type FieldProps = {
  label: string;
  children: ReactNode;
};

export function Field({ label, children }: FieldProps) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal-card form-modal ${wide ? 'wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            {subtitle && <div className="eyebrow">{subtitle}</div>}
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }: { icon: typeof import('lucide-react').Plus; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <Icon size={28} />
      <strong>{title}</strong>
      <span>{message}</span>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{subtitle}</div>
        <h1>{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replace(/[\s]+/g, '-');
  return (
    <span className={`status-badge ${normalized}`}>
      <i />
      {status}
    </span>
  );
}
