import { useState, type ReactNode } from 'react';
import {
  Activity,
  Archive,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  ChevronDown,
  Command,
  CreditCard,
  Database,
  FileText,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  ListTodo,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

type IconType = typeof LayoutDashboard;

export type NavItem = { label: string; icon: IconType; key: string };

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Main',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
      { label: 'My Work', icon: Zap, key: 'my-work' },
      { label: 'Projects', icon: FolderKanban, key: 'projects' },
      { label: 'Tasks', icon: ListTodo, key: 'tasks' },
      { label: 'Calendar', icon: CalendarDays, key: 'calendar' },
      { label: 'Clients', icon: Users, key: 'clients' },
      { label: 'Team', icon: BriefcaseBusiness, key: 'team' },
      { label: 'Communications', icon: Activity, key: 'communications' },
    ],
  },
  {
    title: 'Project assets',
    items: [
      { label: 'Websites', icon: Globe2, key: 'websites' },
      { label: 'Applications', icon: CreditCard, key: 'applications' },
      { label: 'POS Systems', icon: Database, key: 'pos' },
      { label: 'Repositories', icon: Database, key: 'repositories' },
      { label: 'Domains & Hosting', icon: ShieldCheck, key: 'domains-hosting' },
    ],
  },
  {
    title: 'Documents & records',
    items: [
      { label: 'Documents', icon: FileText, key: 'documents' },
      { label: 'Contracts', icon: FileText, key: 'contracts' },
      { label: 'Invoices & Payments', icon: CreditCard, key: 'invoices' },
      { label: 'Meeting Notes', icon: BookOpen, key: 'meetings' },
      { label: 'Knowledge Base', icon: LifeBuoy, key: 'knowledge-base' },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Archive', icon: Archive, key: 'archive' },
      { label: 'Settings', icon: Settings, key: 'settings' },
    ],
  },
];

export function AppLayout({
  activePage,
  onNavigate,
  children,
  onQuickCreate,
}: {
  activePage: string;
  onNavigate: (key: string) => void;
  children: ReactNode;
  onQuickCreate: () => void;
}) {
  const { user, signOut } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleNavigate = (key: string) => {
    onNavigate(key);
    setMobileNavOpen(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={17} strokeWidth={2.6} /></div>
          <div><strong>PANDA</strong><span>Business OS</span></div>
          <button className="mobile-close" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-avatar">P</div>
          <div className="workspace-copy"><strong>Panda Studio</strong><span>{user?.email ?? 'Personal workspace'}</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {group.items.map((item) => (
                <button
                  className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                  key={item.key}
                  onClick={() => handleNavigate(item.key)}
                >
                  <item.icon size={17} strokeWidth={activePage === item.key ? 2.3 : 1.8} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="storage-card">
            <div className="storage-head"><span>Storage</span><span>24%</span></div>
            <div className="storage-bar"><i /></div>
            <small>2.4 GB of 10 GB used</small>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">{(user?.email ?? 'U')[0].toUpperCase()}</div>
            <div className="profile-copy">
              <strong>{user?.email ?? 'User'}</strong>
              <span>Owner</span>
            </div>
            <button className="icon-button" onClick={signOut} title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      {mobileNavOpen && <button className="sidebar-scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close menu" />}

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-menu-wrap">
            <button className="icon-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          </div>
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronDown size={14} />
            <strong>{navGroups.flatMap((g) => g.items).find((i) => i.key === activePage)?.label ?? 'Dashboard'}</strong>
          </div>
          <div className="topbar-actions">
            <button className="command-trigger" onClick={() => setSearchOpen(true)}>
              <Search size={16} />
              <span>Search anything...</span>
              <kbd><Command size={12} /> K</kbd>
            </button>
            <button className="icon-button notification-button" aria-label="Notifications"><Bell size={19} /><i /></button>
            <button className="top-avatar">{(user?.email ?? 'U')[0].toUpperCase()}</button>
          </div>
        </header>

        <div className="content-wrap">{children}</div>
      </main>

      {searchOpen && (
        <div className="modal-backdrop" onMouseDown={() => setSearchOpen(false)}>
          <div className="command-modal modal-card" onMouseDown={(e) => e.stopPropagation()}>
            <div className="command-input">
              <Search size={18} />
              <input autoFocus placeholder="Search projects, clients, documents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <kbd>ESC</kbd>
            </div>
            <div className="command-section">
              <span>Jump to</span>
              {navGroups.flatMap((g) => g.items)
                .filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((item) => (
                  <button key={item.key} onClick={() => { handleNavigate(item.key); setSearchOpen(false); setSearchQuery(''); }}>
                    <span><item.icon size={16} /></span>
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <button className="fab" onClick={onQuickCreate} title="Quick create"><Plus size={22} /></button>
    </div>
  );
}
