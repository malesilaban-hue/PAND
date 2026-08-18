import { useEffect, useState, type ReactNode } from 'react';
import { Plus, Search, Trash2, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { Modal, Field, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import type { Database, TableName } from '@/lib/supabase';

type FieldDef = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  options?: string[];
  full?: boolean;
  required?: boolean;
};

type ResourceConfig = {
  table: TableName;
  title: string;
  subtitle: string;
  entityLabel: string;
  icon: typeof import('lucide-react').Plus;
  fields: FieldDef[];
  cardTitle: (row: any) => string;
  cardSubtitle?: (row: any) => string;
  cardBadge?: (row: any) => string | null;
  cardFields?: { label: string; value: (row: any) => string | null }[];
  searchFields: string[];
};

export function ResourcePage({ config }: { config: ResourceConfig }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [clients, setClients] = useState<Database['clients'][]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from(config.table).select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setRows(data ?? []);
    const [cRes, pRes] = await Promise.all([
      supabase.from('clients').select('id, name').eq('user_id', user.id),
      supabase.from('projects').select('id, name').eq('user_id', user.id).eq('is_archived', false),
    ]);
    setClients(cRes.data ?? []);
    setProjects(pRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = rows.filter((r) => config.searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(search.toLowerCase())));

  const openCreate = () => {
    setEditing(null);
    const init: Record<string, any> = {};
    config.fields.forEach((f) => {
      if (f.type === 'checkbox') init[f.key] = false;
      else if (f.type === 'number') init[f.key] = 0;
      else if (f.key === 'tags') init[f.key] = [];
      else init[f.key] = '';
    });
    setForm(init);
    setShowForm(true);
  };

  const openEdit = (row: any) => {
    setEditing(row);
    const init: Record<string, any> = {};
    config.fields.forEach((f) => { init[f.key] = row[f.key] ?? (f.type === 'checkbox' ? false : f.type === 'number' ? 0 : ''); });
    setForm(init);
    setShowForm(true);
  };

  const save = async () => {
    if (!user) return;
    const required = config.fields.filter((f) => f.required);
    for (const f of required) {
      if (!form[f.key]) return;
    }
    setSaving(true);
    const payload: Record<string, any> = { ...form };
    config.fields.forEach((f) => {
      if (f.type === 'number') payload[f.key] = parseFloat(payload[f.key]) || 0;
      if (f.key === 'client_id' && !payload[f.key]) payload[f.key] = null;
      if (f.key === 'project_id' && !payload[f.key]) payload[f.key] = null;
      if (f.type === 'date' && !payload[f.key]) payload[f.key] = null;
      if (f.key === 'tags' && Array.isArray(payload[f.key])) payload[f.key] = payload[f.key];
      else if (f.key === 'tags' && typeof payload[f.key] === 'string') payload[f.key] = (payload[f.key] as string).split(',').map((t) => t.trim()).filter(Boolean);
    });

    if (editing) {
      const { id, user_id, created_at, updated_at, ...rest } = editing;
      await supabase.from(config.table).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      await logActivity(user.id, `Updated ${config.entityLabel.toLowerCase()}`, config.entityLabel, editing.id, config.cardTitle(editing));
    } else {
      const { data } = await supabase.from(config.table).insert({ ...payload, user_id: user.id }).select().single();
      if (data) await logActivity(user.id, `Created ${config.entityLabel.toLowerCase()}`, config.entityLabel, data.id, config.cardTitle(data));
    }
    setSaving(false); setShowForm(false); load();
  };

  const remove = async (row: any) => {
    if (!user) return;
    await supabase.from(config.table).delete().eq('id', row.id);
    await logActivity(user.id, `Deleted ${config.entityLabel.toLowerCase()}`, config.entityLabel, row.id, config.cardTitle(row));
    load();
  };

  return (
    <>
      <PageHeader title={config.title} subtitle={config.subtitle} action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> New {config.entityLabel.toLowerCase()}</button>} />

      <div className="panel">
        <div className="project-toolbar">
          <div className="inline-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Filter ${config.entityLabel.toLowerCase()}...`} /></div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner" /></div> :
          filtered.length > 0 ? (
            <div className="card-grid">
              {filtered.map((row) => (
                <div className="data-card" key={row.id}>
                  <div className="data-card-head">
                    <div className="data-card-avatar">{config.cardTitle(row).slice(0, 2).toUpperCase()}</div>
                    <div><strong>{config.cardTitle(row)}</strong>{config.cardSubtitle && <span>{config.cardSubtitle(row)}</span>}</div>
                    {config.cardBadge && config.cardBadge(row) && <StatusBadge status={config.cardBadge(row)!} />}
                  </div>
                  {config.cardFields && (
                    <div className="data-card-body">
                      {config.cardFields.map((cf) => {
                        const v = cf.value(row);
                        return v ? <div key={cf.label}><span>{cf.label}</span><strong>{v}</strong></div> : null;
                      })}
                    </div>
                  )}
                  <div className="data-card-actions">
                    <button onClick={() => openEdit(row)}><Pencil size={14} /> Edit</button>
                    <button onClick={() => remove(row)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={config.icon} title={`No ${config.entityLabel.toLowerCase()} yet`} message={`Add your first ${config.entityLabel.toLowerCase()} to get started.`} action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> Add {config.entityLabel.toLowerCase()}</button>} />
          )
        }
      </div>

      {showForm && (
        <Modal title={editing ? `Edit ${config.entityLabel.toLowerCase()}` : `New ${config.entityLabel.toLowerCase()}`} subtitle={config.entityLabel} onClose={() => setShowForm(false)} wide>
          <div className="form-grid">
            {config.fields.map((f) => {
              if (f.key === 'client_id') {
                return <Field key={f.key} label="Client"><select value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}><option value="">No client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>;
              }
              if (f.key === 'project_id') {
                return <Field key={f.key} label="Project"><select value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}><option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>;
              }
              if (f.type === 'textarea') {
                return <div className={`form-field ${f.full ? 'full' : ''}`} key={f.key}><span>{f.label}</span><textarea value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} rows={3} /></div>;
              }
              if (f.type === 'select') {
                return <Field key={f.key} label={f.label}><select value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}><option value="">Select...</option>{f.options?.map((o) => <option key={o}>{o}</option>)}</select></Field>;
              }
              if (f.type === 'checkbox') {
                return <div className={`form-field ${f.full ? 'full' : ''}`} key={f.key}><label className="checkbox-field"><input type="checkbox" checked={form[f.key] ?? false} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} /><span>{f.label}</span></label></div>;
              }
              return <Field key={f.key} label={f.label}><input type={f.type ?? 'text'} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} /></Field>;
            })}
          </div>
          <div className="form-actions"><button className="ghost-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" onClick={save} disabled={saving}>{saving ? 'Saving...' : `Save ${config.entityLabel.toLowerCase()}`}</button></div>
        </Modal>
      )}
    </>
  );
}
