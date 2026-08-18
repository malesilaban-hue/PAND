import { useEffect, useState } from 'react';
import { Plus, ListTodo, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { Modal, Field, EmptyState, PageHeader } from '@/components/ui';
import type { Database } from '@/lib/supabase';

type Task = Database['tasks'];
type Project = Database['projects'];

const STATUSES = ['Backlog', 'Todo', 'In Progress', 'Review', 'Blocked', 'Completed', 'Cancelled'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export function TasksPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<(Task & { project_name: string | null })[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', project_id: '', priority: 'Medium', status: 'Todo', due_date: '' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [taskRes, projRes] = await Promise.all([
      supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name').eq('user_id', user.id).eq('is_archived', false),
    ]);
    const projMap = new Map((projRes.data ?? []).map((p: Project) => [p.id, p.name]));
    setTasks((taskRes.data ?? []).map((t: Task) => ({ ...t, project_name: t.project_id ? projMap.get(t.project_id) ?? null : null })));
    setProjects(projRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const save = async () => {
    if (!user || !form.title) return;
    setSaving(true);
    const proj = projects.find((p) => p.id === form.project_id);
    const { data } = await supabase.from('tasks').insert({
      user_id: user.id,
      title: form.title,
      description: form.description || null,
      project_id: form.project_id || null,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
      is_complete: form.status === 'Completed',
    }).select().single();
    if (data) await logActivity(user.id, 'Created task', 'task', data.id, form.title, form.project_id || undefined);
    setSaving(false); setShowForm(false); setForm({ title: '', description: '', project_id: '', priority: 'Medium', status: 'Todo', due_date: '' }); load();
  };

  const toggleComplete = async (t: Task) => {
    const newComplete = !t.is_complete;
    setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, is_complete: newComplete, status: newComplete ? 'Completed' : 'Todo' } : x));
    await supabase.from('tasks').update({ is_complete: newComplete, status: newComplete ? 'Completed' : 'Todo' }).eq('id', t.id);
  };

  const remove = async (t: Task) => {
    await supabase.from('tasks').delete().eq('id', t.id);
    load();
  };

  const moveStatus = async (t: Task, newStatus: string) => {
    setTasks((prev) => prev.map((x) => x.id === t.id ? { ...x, status: newStatus } : x));
    await supabase.from('tasks').update({ status: newStatus, is_complete: newStatus === 'Completed' }).eq('id', t.id);
  };

  if (loading) return <div className="loading-state"><div className="spinner" /></div>;

  return (
    <>
      <PageHeader title="Tasks" subtitle="Workspace" action={
        <div className="header-actions">
          <div className="view-toggle">
            <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button>
            <button className={view === 'kanban' ? 'active' : ''} onClick={() => setView('kanban')}>Kanban</button>
          </div>
          <button className="primary-button" onClick={() => setShowForm(true)}><Plus size={17} /> New task</button>
        </div>
      } />

      {tasks.length === 0 ? (
        <div className="panel"><EmptyState icon={ListTodo} title="No tasks yet" message="Create your first task to get started." action={<button className="primary-button" onClick={() => setShowForm(true)}><Plus size={17} /> Create task</button>} /></div>
      ) : view === 'list' ? (
        <div className="panel">
          <div className="task-list">
            {tasks.map((t) => (
              <div className="task-row" key={t.id}>
                <button className="task-check" onClick={() => toggleComplete(t)}>{t.is_complete && <Check size={13} />}</button>
                <div className="task-copy">
                  <strong style={{ textDecoration: t.is_complete ? 'line-through' : 'none', color: t.is_complete ? '#9daa9e' : '#2a3c31' }}>{t.title}</strong>
                  <span>{t.project_name ?? 'No project'}</span>
                </div>
                <div className="task-meta">
                  <span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
                  <small>{t.due_date ? new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date'}</small>
                </div>
                <button className="row-action" onClick={() => remove(t)}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="kanban-grid">
          {['Backlog', 'Todo', 'In Progress', 'Review', 'Blocked', 'Completed'].map((col) => (
            <div className="kanban-col" key={col}>
              <div className="kanban-col-head"><strong>{col}</strong><span>{tasks.filter((t) => t.status === col).length}</span></div>
              {tasks.filter((t) => t.status === col).map((t) => (
                <div className="kanban-card" key={t.id}>
                  <div className="task-copy"><strong>{t.title}</strong><span>{t.project_name ?? 'No project'}</span></div>
                  <div className="kanban-card-foot">
                    <span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span>
                    <select value={t.status} onChange={(e) => moveStatus(t, e.target.value)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title="New task" subtitle="Task details" onClose={() => setShowForm(false)}>
          <div className="form-grid">
            <Field label="Task title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Review design mockups" /></Field>
            <Field label="Project">
              <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                <option value="">No project</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Priority"><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Due date"><input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <div className="form-field full"><span>Description</span><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
          </div>
          <div className="form-actions"><button className="ghost-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" onClick={save} disabled={saving || !form.title}>{saving ? 'Saving...' : 'Add task'}</button></div>
        </Modal>
      )}
    </>
  );
}
