import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileText,
  FolderKanban,
  ListTodo,
  Users,
  Sparkles,
  Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { EmptyState } from '@/components/ui';

type ProjectRow = {
  id: string;
  name: string;
  client_id: string | null;
  project_type: string;
  status: string;
  progress: number;
  expected_completion_date: string | null;
  amount_charged: number;
};

type TaskRow = {
  id: string;
  title: string;
  project_id: string | null;
  due_date: string | null;
  priority: string;
  is_complete: boolean;
};

type ActivityRow = {
  id: string;
  action: string;
  entity_name: string | null;
  created_at: string;
};

type ClientRow = { id: string; name: string };
type MeetingRow = { id: string; title: string; meeting_date: string; meeting_time: string | null };

export function DashboardPage({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ activeProjects: 0, openTasks: 0, outstanding: 0, activeClients: 0 });
  const [projects, setProjects] = useState<(ProjectRow & { client_name: string | null })[]>([]);
  const [tasks, setTasks] = useState<(TaskRow & { project_name: string | null })[]>([]);
  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [projectsRes, tasksRes, clientsRes, activitiesRes, meetingsRes, invoicesRes] = await Promise.all([
        supabase.from('projects').select('*').eq('user_id', user.id).eq('is_archived', false).order('updated_at', { ascending: false }).limit(5),
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('is_complete', false).order('due_date', { ascending: true }).limit(5),
        supabase.from('clients').select('id, name').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6),
        supabase.from('meetings').select('id, title, meeting_date, meeting_time').eq('user_id', user.id).order('meeting_date', { ascending: true }).limit(3),
        supabase.from('invoices').select('total, amount_paid').eq('user_id', user.id).neq('payment_status', 'Paid'),
      ]);

      const clientMap = new Map<string, string>();
      (clientsRes.data ?? []).forEach((c: ClientRow) => clientMap.set(c.id, c.name));

      const projectsWithClients = (projectsRes.data ?? []).map((p: ProjectRow) => ({
        ...p,
        client_name: p.client_id ? clientMap.get(p.client_id) ?? null : null,
      }));

      const projectMap = new Map<string, string>();
      (projectsRes.data ?? []).forEach((p: ProjectRow) => projectMap.set(p.id, p.name));

      const tasksWithProjects = (tasksRes.data ?? []).map((t: TaskRow) => ({
        ...t,
        project_name: t.project_id ? projectMap.get(t.project_id) ?? null : null,
      }));

      const outstanding = (invoicesRes.data ?? []).reduce((sum: number, inv: { total: number; amount_paid: number }) => sum + (inv.total - inv.amount_paid), 0);

      setStats({
        activeProjects: (projectsRes.data ?? []).filter((p: ProjectRow) => !['Completed', 'Archived', 'Cancelled'].includes(p.status)).length,
        openTasks: tasksRes.data?.length ?? 0,
        outstanding,
        activeClients: clientsRes.data?.length ?? 0,
      });
      setProjects(projectsWithClients);
      setTasks(tasksWithProjects);
      setActivities(activitiesRes.data ?? []);
      setMeetings(meetingsRes.data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const toggleTask = async (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_complete: true } : t)));
    await supabase.from('tasks').update({ is_complete: true, status: 'Completed' }).eq('id', taskId);
  };

  if (loading) return <div className="loading-state"><div className="spinner" /></div>;

  return (
    <>
      <section className="welcome-row">
        <div>
          <div className="eyebrow"><span className="pulse-dot" /> {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
          <h1>Welcome back.</h1>
          <p>Here is the pulse of your business today.</p>
        </div>
      </section>

      <section className="metric-grid">
        <button className="metric-card" onClick={() => onNavigate('projects')}>
          <div className="metric-icon green"><FolderKanban size={18} /></div>
          <div className="metric-label">Active projects <ArrowUpRight size={14} /></div>
          <strong>{stats.activeProjects}</strong>
          <span>Currently in progress</span>
        </button>
        <button className="metric-card" onClick={() => onNavigate('tasks')}>
          <div className="metric-icon orange"><ListTodo size={18} /></div>
          <div className="metric-label">Open tasks <ArrowUpRight size={14} /></div>
          <strong>{stats.openTasks}</strong>
          <span>Needs attention</span>
        </button>
        <button className="metric-card" onClick={() => onNavigate('invoices')}>
          <div className="metric-icon blue"><CircleDollarSign size={18} /></div>
          <div className="metric-label">Outstanding <ArrowUpRight size={14} /></div>
          <strong>${stats.outstanding.toLocaleString()}</strong>
          <span>Unpaid invoices</span>
        </button>
        <button className="metric-card" onClick={() => onNavigate('clients')}>
          <div className="metric-icon brown"><Users size={18} /></div>
          <div className="metric-label">Active clients <ArrowUpRight size={14} /></div>
          <strong>{stats.activeClients}</strong>
          <span>In your workspace</span>
        </button>
      </section>

      <div className="dashboard-grid">
        <section className="panel projects-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Portfolio</div><h2>Recent projects</h2></div>
            <button className="text-button" onClick={() => onNavigate('projects')}>View all <ArrowUpRight size={15} /></button>
          </div>
          {projects.length > 0 ? (
            <div className="project-list">
              {projects.map((p) => (
                <div className="project-row" key={p.id} onClick={() => onNavigate('projects')}>
                  <div className="project-badge">{p.name.slice(0, 2).toUpperCase()}</div>
                  <div className="project-info">
                    <strong>{p.name}</strong>
                    <span>{p.client_name ?? 'No client'} <i /> {p.project_type}</span>
                  </div>
                  <div className="project-progress">
                    <div className="progress-label"><span>{p.progress}%</span></div>
                    <div className="progress-track"><i style={{ width: `${p.progress}%` }} /></div>
                  </div>
                  <span className={`status-badge ${p.status.toLowerCase().replace(/[\s]+/g, '-')}`}><i />{p.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={FolderKanban} title="No projects yet" message="Create your first project to get started." />
          )}
        </section>

        <section className="panel tasks-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Focus list</div><h2>My tasks</h2></div>
          </div>
          {tasks.length > 0 ? (
            <div className="task-list">
              {tasks.map((t) => (
                <div className="task-row" key={t.id}>
                  <button className="task-check" onClick={() => toggleTask(t.id)}><Check size={13} /></button>
                  <div className="task-copy">
                    <strong>{t.title}</strong>
                    <span>{t.project_name ?? 'No project'}</span>
                  </div>
                  <div className="task-meta">
                    <span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
                    <small>{t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={ListTodo} title="No open tasks" message="All caught up. Create a new task to get started." />
          )}
        </section>
      </div>

      <div className="lower-grid">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">Live feed</div><h2>Recent activity</h2></div>
          </div>
          {activities.length > 0 ? (
            <div className="activity-list">
              {activities.map((a) => (
                <div className="activity-row" key={a.id}>
                  <div className="activity-icon success"><CheckCircle2 size={16} /></div>
                  <div className="activity-copy">
                    <strong>{a.action}</strong>
                    <span>{a.entity_name ?? ''}</span>
                  </div>
                  <time>{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</time>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Clock3} title="No activity yet" message="Actions across your workspace will appear here." />
          )}
        </section>

        <section className="panel calendar-panel">
          <div className="panel-heading">
            <div><div className="eyebrow">This week</div><h2>Upcoming</h2></div>
            <button className="text-button" onClick={() => onNavigate('calendar')}>Calendar <ArrowUpRight size={15} /></button>
          </div>
          {meetings.length > 0 ? (
            <div className="upcoming-list">
              {meetings.map((m) => (
                <div className="upcoming-item" key={m.id}>
                  <div className="date-tile mint">
                    <strong>{new Date(m.meeting_date).getDate()}</strong>
                    <span>{new Date(m.meeting_date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                  </div>
                  <div>
                    <strong>{m.title}</strong>
                    <span>{m.meeting_time ?? ''}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Sparkles} title="No upcoming meetings" message="Schedule a meeting to see it here." />
          )}
        </section>
      </div>
    </>
  );
}
