import { useState } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Database, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui';

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState('profile');

  const tabs = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'company', label: 'Company', icon: SettingsIcon },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'data', label: 'Data & Backup', icon: Database },
  ];

  return (
    <>
      <PageHeader title="Settings" subtitle="Workspace" />

      <div className="settings-layout">
        <div className="settings-tabs">
          {tabs.map((t) => (
            <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        <div className="panel settings-content">
          {tab === 'profile' && (
            <>
              <div className="panel-heading"><div><div className="eyebrow">Account</div><h2>Profile</h2></div></div>
              <div className="form-grid">
                <div className="detail-field"><span>Email</span><strong>{user?.email ?? '—'}</strong></div>
                <div className="detail-field"><span>User ID</span><strong>{user?.id ?? '—'}</strong></div>
                <div className="detail-field"><span>Account created</span><strong>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</strong></div>
              </div>
              <div className="form-actions"><button className="ghost-button" onClick={signOut}><LogOut size={16} /> Sign out</button></div>
            </>
          )}

          {tab === 'company' && (
            <>
              <div className="panel-heading"><div><div className="eyebrow">Business</div><h2>Company information</h2></div></div>
              <div className="form-grid">
                <div className="form-field"><span>Company name</span><input placeholder="Panda Studio" /></div>
                <div className="form-field"><span>Currency</span><select><option>USD ($)</option><option>KES (KSh)</option><option>EUR (€)</option><option>GBP (£)</option></select></div>
                <div className="form-field"><span>Timezone</span><select><option>Africa/Nairobi</option><option>UTC</option><option>America/New_York</option><option>Europe/London</option></select></div>
                <div className="form-field"><span>Date format</span><select><option>MMM D, YYYY</option><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option></select></div>
              </div>
              <div className="form-actions"><button className="primary-button">Save changes</button></div>
            </>
          )}

          {tab === 'notifications' && (
            <>
              <div className="panel-heading"><div><div className="eyebrow">Preferences</div><h2>Notifications</h2></div></div>
              <div className="settings-list">
                {['Task due reminders', 'Project deadline alerts', 'Contract expiry warnings', 'Domain & hosting renewals', 'Invoice overdue alerts', 'Payment confirmations'].map((n) => (
                  <div className="settings-row" key={n}><span>{n}</span><label className="toggle"><input type="checkbox" defaultChecked /><i /></label></div>
                ))}
              </div>
            </>
          )}

          {tab === 'security' && (
            <>
              <div className="panel-heading"><div><div className="eyebrow">Protection</div><h2>Security</h2></div></div>
              <div className="settings-list">
                <div className="settings-row"><span>Two-factor authentication</span><label className="toggle"><input type="checkbox" /><i /></label></div>
                <div className="settings-row"><span>Session timeout (30 min)</span><label className="toggle"><input type="checkbox" defaultChecked /><i /></label></div>
                <div className="settings-row"><span>Audit logging</span><label className="toggle"><input type="checkbox" defaultChecked /><i /></label></div>
              </div>
            </>
          )}

          {tab === 'data' && (
            <>
              <div className="panel-heading"><div><div className="eyebrow">Storage</div><h2>Data & Backup</h2></div></div>
              <div className="settings-list">
                <div className="settings-row"><span>Automatic daily backups</span><label className="toggle"><input type="checkbox" defaultChecked /><i /></label></div>
                <div className="settings-row"><span>Export all data (CSV/JSON)</span><button className="ghost-button">Export</button></div>
                <div className="settings-row"><span>Last backup</span><span className="muted-text">Just now</span></div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
