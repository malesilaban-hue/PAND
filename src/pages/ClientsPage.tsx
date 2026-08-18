import { useEffect, useState } from 'react';
import { Plus, Search, Users, Trash2, Pencil, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { Modal, Field, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import type { Database } from '@/lib/supabase';

type Client = Database['clients'];
type Project = Database['projects'];

const INDUSTRIES = ['Restaurant', 'Retail', 'School', 'Hospital', 'Hotel', 'Church', 'Corporate', 'Government', 'NGO', 'Finance', 'Agriculture', 'Transport', 'Technology', 'Other'];

const emptyClient: Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  name: '', contact_person: '', email: '', phone: '', location: '', website: '', industry: '', status: 'active', notes: '', tags: [],
};

export function ClientsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<(Client & { project_count: number })[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<Omit<Client, 'id' | 'user_id' | 'created_at' | 'updated_at'>>(emptyClient);
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState<(Client & { project_count: number }) | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').eq('user_id', user.id).order('name');
    const projectCounts = await Promise.all((data ?? []).map(async (c: Client) => {
      const { count } = await supabase.from('projects').select('*', { count: 'exact', head: true }).eq('client_id', c.id);
      return { ...c, project_count: count ?? 0 };
    }));
    setClients(projectCounts);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = clients.filter((c) => `${c.name} ${c.contact_person ?? ''} ${c.email ?? ''} ${c.industry ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => { setEditing(null); setForm(emptyClient); setShowForm(true); };
  const openEdit = (c: Client) => { setEditing(c); const { id, user_id, created_at, updated_at, ...rest } = c; setForm(rest); setShowForm(true); };

  const save = async () => {
    if (!user || !form.name) return;
    setSaving(true);
    if (editing) {
      await supabase.from('clients').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id);
      await logActivity(user.id, 'Updated client', 'client', editing.id, form.name);
    } else {
      const { data } = await supabase.from('clients').insert({ ...form, user_id: user.id }).select().single();
      if (data) await logActivity(user.id, 'Created client', 'client', data.id, form.name);
    }
    setSaving(false); setShowForm(false); load();
  };

  const remove = async (c: Client) => {
    if (!user) return;
    await supabase.from('clients').delete().eq('id', c.id);
    await logActivity(user.id, 'Deleted client', 'client', c.id, c.name);
    load();
  };

  if (selectedClient) {
    return <ClientDetail client={selectedClient} onBack={() => { setSelectedClient(null); load(); }} />;
  }

  return (
    <>
      <PageHeader title="Clients" subtitle="CRM" action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> New client</button>} />

      <div className="panel">
        <div className="project-toolbar">
          <div className="inline-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter clients..." /></div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner" /></div> :
          filtered.length > 0 ? (
            <div className="card-grid">
              {filtered.map((c) => (
                <div className="data-card" key={c.id} onClick={() => setSelectedClient(c)}>
                  <div className="data-card-head">
                    <div className="data-card-avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                    <div><strong>{c.name}</strong><span>{c.industry ?? 'No industry'}</span></div>
                    <StatusBadge status={c.status} />
                  </div>
                  <div className="data-card-body">
                    {c.contact_person && <div><span>Contact</span><strong>{c.contact_person}</strong></div>}
                    {c.email && <div><span>Email</span><strong>{c.email}</strong></div>}
                    {c.phone && <div><span>Phone</span><strong>{c.phone}</strong></div>}
                    <div><span>Projects</span><strong>{c.project_count}</strong></div>
                  </div>
                  <div className="data-card-actions">
                    <button onClick={(e) => { e.stopPropagation(); openEdit(c); }}><Pencil size={14} /> Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); remove(c); }}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={Users} title="No clients yet" message="Add your first client to start managing relationships." action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> Add client</button>} />
          )
        }
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit client' : 'New client'} subtitle="Client details" onClose={() => setShowForm(false)} wide>
          <div className="form-grid">
            <Field label="Company / client name"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Northstar Retail" /></Field>
            <Field label="Contact person"><input value={form.contact_person ?? ''} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></Field>
            <Field label="Email"><input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Location"><input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Website"><input value={form.website ?? ''} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
            <Field label="Industry"><select value={form.industry ?? ''} onChange={(e) => setForm({ ...form, industry: e.target.value })}><option value="">Select...</option>{INDUSTRIES.map((i) => <option key={i}>{i}</option>)}</select></Field>
            <Field label="Status"><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></Field>
            <div className="form-field full"><span>Notes</span><textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
            <div className="form-field full"><span>Tags (comma-separated)</span><input value={form.tags.join(', ')} onChange={(e) => setForm({ ...form, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} /></div>
          </div>
          <div className="form-actions"><button className="ghost-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" onClick={save} disabled={saving || !form.name}>{saving ? 'Saving...' : 'Save client'}</button></div>
        </Modal>
      )}
    </>
  );
}

function ClientDetail({ client, onBack }: { client: Client & { project_count: number }; onBack: () => void }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('projects').select('*').eq('client_id', client.id).order('created_at', { ascending: false }).then(({ data }) => setProjects(data ?? []));
  }, [user, client.id]);

  return (
    <>
      <div className="page-header">
        <div>
          <button className="back-button" onClick={onBack}>← Back to clients</button>
          <div className="eyebrow">{client.industry ?? 'Client'}</div>
          <h1>{client.name}</h1>
          <p>{client.contact_person ?? 'No contact person'}</p>
        </div>
      </div>

      <div className="metric-grid">
        <div className="metric-card"><div className="metric-icon green"><Users size={18} /></div><div className="metric-label">Total projects</div><strong>{projects.length}</strong><span>Across all time</span></div>
        <div className="metric-card"><div className="metric-icon blue"><ArrowUpRight size={18} /></div><div className="metric-label">Active projects</div><strong>{projects.filter((p) => !['Completed', 'Cancelled', 'Archived'].includes(p.status)).length}</strong><span>Currently open</span></div>
        <div className="metric-card"><div className="metric-icon orange"><ArrowUpRight size={18} /></div><div className="metric-label">Completed</div><strong>{projects.filter((p) => p.status === 'Completed').length}</strong><span>Delivered</span></div>
        <div className="metric-card"><div className="metric-icon brown"><ArrowUpRight size={18} /></div><div className="metric-label">Total revenue</div><strong>${projects.reduce((s, p) => s + p.amount_charged, 0).toLocaleString()}</strong><span>From all projects</span></div>
      </div>

      <div className="panel">
        <div className="panel-heading"><div><div className="eyebrow">Client information</div><h2>Details</h2></div></div>
        <div className="form-grid">
          {client.email && <div className="detail-field"><span>Email</span><strong>{client.email}</strong></div>}
          {client.phone && <div className="detail-field"><span>Phone</span><strong>{client.phone}</strong></div>}
          {client.location && <div className="detail-field"><span>Location</span><strong>{client.location}</strong></div>}
          {client.website && <div className="detail-field"><span>Website</span><strong>{client.website}</strong></div>}
          <div className="detail-field"><span>Status</span><strong>{client.status}</strong></div>
          <div className="detail-field"><span>Added</span><strong>{new Date(client.created_at).toLocaleDateString()}</strong></div>
          {client.notes && <div className="detail-field full"><span>Notes</span><strong>{client.notes}</strong></div>}
        </div>
      </div>

      <div className="panel">
        <div className="panel-heading"><div><div className="eyebrow">Project history</div><h2>Projects</h2></div></div>
        {projects.length > 0 ? (
          <div className="project-list">
            {projects.map((p) => (
              <div className="project-row" key={p.id}>
                <div className="project-badge">{p.name.slice(0, 2).toUpperCase()}</div>
                <div className="project-info"><strong>{p.name}</strong><span>{p.project_type}</span></div>
                <div className="project-progress"><div className="progress-label"><span>{p.progress}%</span></div><div className="progress-track"><i style={{ width: `${p.progress}%` }} /></div></div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Users} title="No projects" message="This client has no projects yet." />}
      </div>
    </>
  );
}
