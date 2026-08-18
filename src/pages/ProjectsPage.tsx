import { useEffect, useState } from 'react';
import { Plus, Search, FolderKanban, ArrowUpRight, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { Modal, Field, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import type { Database } from '@/lib/supabase';

type Project = Database['projects'];
type Client = Database['clients'];
type Task = Database['tasks'];

const STATUSES = ['Idea', 'Lead', 'Quotation', 'Awaiting Approval', 'Approved', 'Planning', 'In Progress', 'Development', 'Testing', 'Client Review', 'Revision', 'Ready for Deployment', 'Deployed', 'Completed', 'Maintenance', 'On Hold', 'Cancelled', 'Archived'];
const TYPES = ['Website', 'Web Application', 'Mobile Application', 'Desktop Application', 'POS System', 'Software Development', 'IT Support', 'Networking', 'Hardware', 'Branding', 'Graphic Design', 'Consulting', 'Maintenance', 'Hosting', 'Domain', 'E-commerce', 'Database', 'API', 'Automation', 'Cybersecurity', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const emptyProject: Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  client_id: null,
  name: '',
  description: '',
  project_type: 'Website',
  status: 'Idea',
  priority: 'Medium',
  progress: 0,
  start_date: null,
  expected_completion_date: null,
  actual_completion_date: null,
  budget: 0,
  amount_charged: 0,
  amount_paid: 0,
  project_manager: '',
  tags: [],
  technologies: [],
  is_archived: false,
  is_pinned: false,
  is_portfolio_public: false,
};

export function ProjectsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<(Project & { client_name: string | null })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<Omit<Project, 'id' | 'user_id' | 'created_at' | 'updated_at'>>(emptyProject);
  const [saving, setSaving] = useState(false);
  const [selectedProject, setSelectedProject] = useState<(Project & { client_name: string | null }) | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [projRes, clientRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('user_id', user.id).order('name'),
    ]);
    const clientMap = new Map((clientRes.data ?? []).map((c: Client) => [c.id, c.name]));
    setProjects((projRes.data ?? []).map((p: Project) => ({ ...p, client_name: p.client_id ? clientMap.get(p.client_id) ?? null : null })));
    setClients(clientRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = projects.filter((p) => {
    const matchesSearch = `${p.name} ${p.client_name ?? ''} ${p.project_type}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyProject);
    setShowForm(true);
  };

  const openEdit = (p: Project) => {
    setEditing(p);
    const { id, user_id, created_at, updated_at, ...rest } = p;
    setForm(rest);
    setShowForm(true);
  };

  const save = async () => {
    if (!user || !form.name) return;
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from('projects').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
      if (!error) await logActivity(user.id, 'Updated project', 'project', editing.id, form.name);
    } else {
      const { data } = await supabase.from('projects').insert({ ...form, user_id: user.id }).select().single();
      if (data) await logActivity(user.id, 'Created project', 'project', data.id, form.name);
    }
    setSaving(false);
    setShowForm(false);
    load();
  };

  const remove = async (p: Project) => {
    if (!user) return;
    await supabase.from('projects').delete().eq('id', p.id);
    await logActivity(user.id, 'Deleted project', 'project', p.id, p.name);
    load();
  };

  if (selectedProject) {
    return <ProjectDetail project={selectedProject} clients={clients} onBack={() => { setSelectedProject(null); load(); }} />;
  }

  return (
    <>
      <PageHeader title="Projects" subtitle="Workspace" action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> New project</button>} />

      <div className="panel">
        <div className="project-toolbar">
          <div className="inline-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter projects..." /></div>
          <div className="filter-buttons">
            {['All', 'In Progress', 'Client Review', 'Completed', 'On Hold'].map((s) => (
              <button key={s} className={statusFilter === s ? 'selected' : ''} onClick={() => setStatusFilter(s)}>{s}</button>
            ))}
          </div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner" /></div> :
          filtered.length > 0 ? (
            <div className="project-list">
              {filtered.map((p) => (
                <div className="project-row" key={p.id} onClick={() => setSelectedProject(p)}>
                  <div className="project-badge">{p.name.slice(0, 2).toUpperCase()}</div>
                  <div className="project-info">
                    <strong>{p.name}</strong>
                    <span>{p.client_name ?? 'No client'} <i /> {p.project_type}</span>
                  </div>
                  <div className="project-progress">
                    <div className="progress-label"><span>{p.progress}%</span><small>{p.expected_completion_date ? new Date(p.expected_completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</small></div>
                    <div className="progress-track"><i style={{ width: `${p.progress}%` }} /></div>
                  </div>
                  <StatusBadge status={p.status} />
                  <div className="project-value">${p.amount_charged.toLocaleString()}<small>charged</small></div>
                  <div className="row-actions">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Pencil size={14} /></button>
                    <button onClick={(e) => { e.stopPropagation(); remove(p); }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={FolderKanban} title="No projects found" message="Create your first project to get started." action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> Create project</button>} />
          )
        }
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit project' : 'New project'} subtitle="Project details" onClose={() => setShowForm(false)} wide>
          <div className="form-grid">
            <Field label="Project name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Atlas Commerce" /></Field>
            <Field label="Client">
              <select value={form.client_id ?? ''} onChange={(e) => setForm({ ...form, client_id: e.target.value || null })}>
                <option value="">No client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Project type">
              <select value={form.project_type} onChange={(e) => setForm({ ...form, project_type: e.target.value })}>
                {TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Progress (%)"><input type="number" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Start date"><input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value || null })} /></Field>
            <Field label="Expected completion"><input type="date" value={form.expected_completion_date ?? ''} onChange={(e) => setForm({ ...form, expected_completion_date: e.target.value || null })} /></Field>
            <Field label="Budget ($)"><input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Amount charged ($)"><input type="number" value={form.amount_charged} onChange={(e) => setForm({ ...form, amount_charged: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Amount paid ($)"><input type="number" value={form.amount_paid} onChange={(e) => setForm({ ...form, amount_paid: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Project manager"><input value={form.project_manager ?? ''} onChange={(e) => setForm({ ...form, project_manager: e.target.value })} /></Field>
            <div className="form-field full">
              <span>Description</span>
              <textarea value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Project description..." />
            </div>
            <div className="form-field full">
              <span>Tags (comma-separated)</span>
              <input value={form.tags.join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} placeholder="website, react, e-commerce" />
            </div>
            <div className="form-field full">
              <span>Technologies (comma-separated)</span>
              <input value={form.technologies.join(', ')} onChange={(e) => setForm({ ...form, technologies: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} placeholder="React, Node.js, PostgreSQL" />
            </div>
          </div>
          <div className="form-actions">
            <button className="ghost-button" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="primary-button" onClick={save} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Save project'}</button>
          </div>
        </Modal>
      )}
    </>
  );
}

function ProjectDetail({ project, clients, onBack }: { project: Project & { client_name: string | null }; clients: Client[]; onBack: () => void }) {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', priority: 'Medium', due_date: '', description: '' });

  const tabs = ['overview', 'tasks', 'timeline', 'notes', 'activity'];

  useEffect(() => {
    if (!user) return;
    supabase.from('tasks').select('*').eq('project_id', project.id).order('created_at', { ascending: false }).then(({ data }) => setTasks(data ?? []));
  }, [user, project.id]);

  const addTask = async () => {
    if (!user || !taskForm.title) return;
    await supabase.from('tasks').insert({
      user_id: user.id,
      project_id: project.id,
      client_id: project.client_id,
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority,
      status: 'Todo',
      due_date: taskForm.due_date || null,
    });
    await logActivity(user.id, 'Created task', 'task', null, taskForm.title, project.id, project.client_id);
    setTaskForm({ title: '', priority: 'Medium', due_date: '', description: '' });
    setShowTaskForm(false);
    const { data } = await supabase.from('tasks').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
    setTasks(data ?? []);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <button className="back-button" onClick={onBack}>← Back to projects</button>
          <div className="eyebrow">{project.project_type}</div>
          <h1>{project.name}</h1>
          <p>{project.client_name ?? 'No client assigned'}</p>
        </div>
        <div className="detail-header-meta">
          <StatusBadge status={project.status} />
          <div className="progress-mini"><div className="progress-track"><i style={{ width: `${project.progress}%` }} /></div><span>{project.progress}%</span></div>
        </div>
      </div>

      <div className="detail-tabs">
        {tabs.map((t) => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      <div className="panel">
        {tab === 'overview' && (
          <div className="form-grid">
            <div className="detail-field"><span>Priority</span><strong>{project.priority}</strong></div>
            <div className="detail-field"><span>Start date</span><strong>{project.start_date ?? '—'}</strong></div>
            <div className="detail-field"><span>Expected completion</span><strong>{project.expected_completion_date ?? '—'}</strong></div>
            <div className="detail-field"><span>Budget</span><strong>${project.budget.toLocaleString()}</strong></div>
            <div className="detail-field"><span>Amount charged</span><strong>${project.amount_charged.toLocaleString()}</strong></div>
            <div className="detail-field"><span>Amount paid</span><strong>${project.amount_paid.toLocaleString()}</strong></div>
            <div className="detail-field"><span>Balance</span><strong>${(project.amount_charged - project.amount_paid).toLocaleString()}</strong></div>
            <div className="detail-field"><span>Project manager</span><strong>{project.project_manager ?? '—'}</strong></div>
            {project.description && <div className="detail-field full"><span>Description</span><strong>{project.description}</strong></div>}
            {project.technologies.length > 0 && <div className="detail-field full"><span>Technologies</span><div className="tag-list">{project.technologies.map((t) => <span key={t} className="tag">{t}</span>)}</div></div>}
            {project.tags.length > 0 && <div className="detail-field full"><span>Tags</span><div className="tag-list">{project.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div></div>}
          </div>
        )}

        {tab === 'tasks' && (
          <>
            <div className="panel-heading"><div><div className="eyebrow">Project tasks</div><h2>{tasks.length} tasks</h2></div><button className="primary-button" onClick={() => setShowTaskForm(true)}><Plus size={16} /> Add task</button></div>
            {tasks.length > 0 ? (
              <div className="task-list">
                {tasks.map((t) => (
                  <div className="task-row" key={t.id}>
                    <div className="task-check" style={{ background: t.is_complete ? '#78a37b' : 'transparent', borderColor: t.is_complete ? '#78a37b' : '#b9c7ba' }}>{t.is_complete && <Check size={13} />}</div>
                    <div className="task-copy"><strong style={{ textDecoration: t.is_complete ? 'line-through' : 'none' }}>{t.title}</strong><span>{t.priority} · {t.due_date ?? 'No due date'}</span></div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={FolderKanban} title="No tasks yet" message="Add a task to this project." />}
          </>
        )}

        {tab === 'timeline' && <EmptyState icon={ArrowUpRight} title="Timeline" message="Project events will appear here as they happen." />}
        {tab === 'notes' && <EmptyState icon={FolderKanban} title="No notes" message="Notes for this project will appear here." />}
        {tab === 'activity' && <EmptyState icon={ArrowUpRight} title="No activity" message="Activity for this project will appear here." />}
      </div>

      {showTaskForm && (
        <Modal title="New task" subtitle="Add to project" onClose={() => setShowTaskForm(false)}>
          <div className="form-grid">
            <Field label="Task title"><input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="e.g. Review design mockups" /></Field>
            <Field label="Priority"><select value={taskForm.priority} onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Due date"><input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })} /></Field>
            <div className="form-field full"><span>Description</span><textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} /></div>
          </div>
          <div className="form-actions"><button className="ghost-button" onClick={() => setShowTaskForm(false)}>Cancel</button><button className="primary-button" onClick={addTask}>Add task</button></div>
        </Modal>
      )}
    </>
  );
}
