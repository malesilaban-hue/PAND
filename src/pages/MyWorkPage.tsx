import { useEffect, useState } from 'react';
import { ListTodo, Check, Clock3, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PageHeader, EmptyState } from '@/components/ui';
import type { Database } from '@/lib/supabase';

type Task = Database['tasks'];
type Project = Database['projects'];

export function MyWorkPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<(Task & { project_name: string | null })[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [taskRes, projRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('is_complete', false).order('due_date', { ascending: true }),
        supabase.from('projects').select('*').eq('user_id', user.id).eq('is_archived', false).neq('status', 'Completed').order('updated_at', { ascending: false }),
      ]);
      const projMap = new Map((projRes.data ?? []).map((p: Project) => [p.id, p.name]));
      setTasks((taskRes.data ?? []).map((t: Task) => ({ ...t, project_name: t.project_id ? projMap.get(t.project_id) ?? null : null })));
      setProjects(projRes.data ?? []);
      setLoading(false);
    })();
  }, [user]);

  const toggleTask = async (t: Task) => {
    setTasks((prev) => prev.filter((x) => x.id !== t.id));
    await supabase.from('tasks').update({ is_complete: true, status: 'Completed' }).eq('id', t.id);
  };

  if (loading) return <div className="loading-state"><div className="spinner" /></div>;

  const dueToday = tasks.filter((t) => t.due_date === new Date().toISOString().slice(0, 10));
  const overdue = tasks.filter((t) => t.due_date && t.due_date < new Date().toISOString().slice(0, 10));

  return (
    <>
      <PageHeader title="My Work" subtitle="Personal" />

      <div className="metric-grid">
        <div className="metric-card"><div className="metric-icon orange"><ListTodo size={18} /></div><div className="metric-label">Due today</div><strong>{dueToday.length}</strong><span>Tasks</span></div>
        <div className="metric-card"><div className="metric-icon coral"><Clock3 size={18} /></div><div className="metric-label">Overdue</div><strong>{overdue.length}</strong><span>Needs attention</span></div>
        <div className="metric-card"><div className="metric-icon green"><Zap size={18} /></div><div className="metric-label">Active projects</div><strong>{projects.length}</strong><span>In progress</span></div>
      </div>

      <div className="dashboard-grid">
        <div className="panel">
          <div className="panel-heading"><div><div className="eyebrow">Focus</div><h2>Due today</h2></div></div>
          {dueToday.length > 0 ? (
            <div className="task-list">
              {dueToday.map((t) => (
                <div className="task-row" key={t.id}>
                  <button className="task-check" onClick={() => toggleTask(t)}><Check size={13} /></button>
                  <div className="task-copy"><strong>{t.title}</strong><span>{t.project_name ?? 'No project'}</span></div>
                  <span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Check} title="Nothing due today" message="You are all caught up." />}
        </div>

        <div className="panel">
          <div className="panel-heading"><div><div className="eyebrow">Urgent</div><h2>Overdue</h2></div></div>
          {overdue.length > 0 ? (
            <div className="task-list">
              {overdue.map((t) => (
                <div className="task-row" key={t.id}>
                  <button className="task-check" onClick={() => toggleTask(t)}><Check size={13} /></button>
                  <div className="task-copy"><strong>{t.title}</strong><span>{t.project_name ?? 'No project'}</span></div>
                  <span className="priority high">{t.priority}</span>
                </div>
              ))}
            </div>
          ) : <EmptyState icon={Check} title="No overdue tasks" message="Everything is on track." />}
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading"><div><div className="eyebrow">My projects</div><h2>Active projects</h2></div></div>
        {projects.length > 0 ? (
          <div className="project-list">
            {projects.map((p) => (
              <div className="project-row" key={p.id}>
                <div className="project-badge">{p.name.slice(0, 2).toUpperCase()}</div>
                <div className="project-info"><strong>{p.name}</strong><span>{p.project_type}</span></div>
                <div className="project-progress"><div className="progress-label"><span>{p.progress}%</span></div><div className="progress-track"><i style={{ width: `${p.progress}%` }} /></div></div>
                <span className={`status-badge ${p.status.toLowerCase().replace(/[\s]+/g, '-')}`}><i />{p.status}</span>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Zap} title="No active projects" message="All projects are completed." />}
      </div>
    </>
  );
}
