import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppLayout } from '@/components/AppLayout';
import { AuthPage } from '@/pages/AuthPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ClientsPage } from '@/pages/ClientsPage';
import { TasksPage } from '@/pages/TasksPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { InvoicesPage } from '@/pages/InvoicesPage';
import { MyWorkPage } from '@/pages/MyWorkPage';
import { DomainsHostingPage } from '@/pages/DomainsHostingPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ResourcePage } from '@/pages/ResourcePage';
import {
  websitesConfig,
  applicationsConfig,
  posConfig,
  repositoriesConfig,
  documentsConfig,
  contractsConfig,
  meetingsConfig,
  communicationsConfig,
  knowledgeBaseConfig,
  teamConfig,
  archiveConfig,
} from '@/pages/resourceConfigs';
import { Plus, FolderKanban, Users, ListTodo, FileText, CreditCard, Globe2, Database, BookOpen, LifeBuoy, Archive, BriefcaseBusiness, Activity, CalendarDays } from 'lucide-react';
import { Modal } from '@/components/ui';

function QuickCreateModal({ onClose, onNavigate }: { onClose: () => void; onNavigate: (key: string) => void }) {
  const options = [
    { label: 'New project', icon: FolderKanban, key: 'projects' },
    { label: 'New client', icon: Users, key: 'clients' },
    { label: 'New task', icon: ListTodo, key: 'tasks' },
    { label: 'New invoice', icon: CreditCard, key: 'invoices' },
    { label: 'New meeting', icon: CalendarDays, key: 'meetings' },
    { label: 'New contract', icon: FileText, key: 'contracts' },
    { label: 'New website', icon: Globe2, key: 'websites' },
    { label: 'New repository', icon: Database, key: 'repositories' },
  ];
  return (
    <Modal title="Quick create" subtitle="What would you like to add?" onClose={onClose}>
      <div className="quick-grid">
        {options.map(({ label, icon: Icon, key }) => (
          <button key={label} onClick={() => { onNavigate(key); onClose(); }}>
            <span><Icon size={19} /></span>
            <strong>{label}</strong>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [quickCreate, setQuickCreate] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) return <div className="auth-page"><div className="spinner" /></div>;
  if (!user) return <AuthPage />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onNavigate={setPage} />;
      case 'my-work': return <MyWorkPage />;
      case 'projects': return <ProjectsPage />;
      case 'tasks': return <TasksPage />;
      case 'calendar': return <CalendarPage />;
      case 'clients': return <ClientsPage />;
      case 'team': return <ResourcePage config={teamConfig} />;
      case 'communications': return <ResourcePage config={communicationsConfig} />;
      case 'websites': return <ResourcePage config={websitesConfig} />;
      case 'applications': return <ResourcePage config={applicationsConfig} />;
      case 'pos': return <ResourcePage config={posConfig} />;
      case 'repositories': return <ResourcePage config={repositoriesConfig} />;
      case 'domains-hosting': return <DomainsHostingPage />;
      case 'documents': return <ResourcePage config={documentsConfig} />;
      case 'contracts': return <ResourcePage config={contractsConfig} />;
      case 'invoices': return <InvoicesPage />;
      case 'meetings': return <ResourcePage config={meetingsConfig} />;
      case 'knowledge-base': return <ResourcePage config={knowledgeBaseConfig} />;
      case 'archive': return <ResourcePage config={archiveConfig} />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage onNavigate={setPage} />;
    }
  };

  return (
    <AppLayout activePage={page} onNavigate={setPage} onQuickCreate={() => setQuickCreate(true)}>
      {renderPage()}
      {quickCreate && <QuickCreateModal onClose={() => setQuickCreate(false)} onNavigate={setPage} />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
