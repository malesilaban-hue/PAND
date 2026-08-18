import { useEffect, useState } from 'react';
import { Plus, Search, Trash2, Pencil, Globe2, Server } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { Modal, Field, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import type { Database } from '@/lib/supabase';

type Domain = Database['domains'];
type Hosting = Database['hosting'];
type Client = Database['clients'];

export function DomainsHostingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'domains' | 'hosting'>('domains');
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<(Domain & { client_name: string | null })[]>([]);
  const [hosting, setHosting] = useState<(Hosting & { client_name: string | null })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [domRes, hostRes, clientRes] = await Promise.all([
      supabase.from('domains').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('hosting').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').eq('user_id', user.id),
    ]);
    const clientMap = new Map((clientRes.data ?? []).map((c: Client) => [c.id, c.name]));
    setDomains((domRes.data ?? []).map((d: Domain) => ({ ...d, client_name: d.client_id ? clientMap.get(d.client_id) ?? null : null })));
    setHosting((hostRes.data ?? []).map((h: Hosting) => ({ ...h, client_name: h.client_id ? clientMap.get(h.client_id) ?? null : null })));
    setClients(clientRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const openCreate = () => {
    setEditing(null);
    if (tab === 'domains') setForm({ domain: '', client_id: '', registrar: '', registration_date: '', expiry_date: '', auto_renewal: true, dns_provider: '', nameservers: '', ssl_status: 'Active', notes: '' });
    else setForm({ provider: '', client_id: '', server: '', plan: '', start_date: '', renewal_date: '', cost: 0, status: 'Active', server_location: '', notes: '' });
    setShowForm(true);
  };

  const openEdit = (row: any) => { setEditing(row); setForm({ ...row }); setShowForm(true); };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const table = tab === 'domains' ? 'domains' : 'hosting';
    const payload = { ...form, client_id: form.client_id || null, cost: parseFloat(form.cost) || 0 };
    if (editing) {
      await supabase.from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
    } else {
      const { data } = await supabase.from(table).insert({ ...payload, user_id: user.id }).select().single();
      if (data) await logActivity(user.id, `Created ${tab === 'domains' ? 'domain' : 'hosting'}`, tab, data.id, tab === 'domains' ? form.domain : form.provider);
    }
    setSaving(false); setShowForm(false); load();
  };

  const remove = async (row: any) => {
    const table = tab === 'domains' ? 'domains' : 'hosting';
    await supabase.from(table).delete().eq('id', row.id);
    load();
  };

  const filteredDomains = domains.filter((d) => `${d.domain} ${d.registrar ?? ''} ${d.client_name ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  const filteredHosting = hosting.filter((h) => `${h.provider} ${h.server ?? ''} ${h.client_name ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <PageHeader title="Domains & Hosting" subtitle="Project assets" action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> New {tab === 'domains' ? 'domain' : 'hosting'}</button>} />

      <div className="detail-tabs">
        <button className={tab === 'domains' ? 'active' : ''} onClick={() => setTab('domains')}>Domains</button>
        <button className={tab === 'hosting' ? 'active' : ''} onClick={() => setTab('hosting')}>Hosting</button>
      </div>

      <div className="panel">
        <div className="project-toolbar">
          <div className="inline-search"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Filter ${tab}...`} /></div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner" /></div> :
          tab === 'domains' ? (
            filteredDomains.length > 0 ? (
              <div className="card-grid">
                {filteredDomains.map((d) => (
                  <div className="data-card" key={d.id}>
                    <div className="data-card-head">
                      <div className="data-card-avatar"><Globe2 size={16} /></div>
                      <div><strong>{d.domain}</strong><span>{d.registrar ?? 'No registrar'}</span></div>
                      <StatusBadge status={d.ssl_status} />
                    </div>
                    <div className="data-card-body">
                      <div><span>Client</span><strong>{d.client_name ?? '—'}</strong></div>
                      <div><span>Expires</span><strong>{d.expiry_date ?? '—'}</strong></div>
                      <div><span>Auto-renew</span><strong>{d.auto_renewal ? 'Yes' : 'No'}</strong></div>
                      <div><span>DNS</span><strong>{d.dns_provider ?? '—'}</strong></div>
                    </div>
                    <div className="data-card-actions">
                      <button onClick={() => openEdit(d)}><Pencil size={14} /> Edit</button>
                      <button onClick={() => remove(d)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={Globe2} title="No domains yet" message="Add your first domain to track renewals." action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> Add domain</button>} />
          ) : (
            filteredHosting.length > 0 ? (
              <div className="card-grid">
                {filteredHosting.map((h) => (
                  <div className="data-card" key={h.id}>
                    <div className="data-card-head">
                      <div className="data-card-avatar"><Server size={16} /></div>
                      <div><strong>{h.provider}</strong><span>{h.plan ?? 'No plan'}</span></div>
                      <StatusBadge status={h.status} />
                    </div>
                    <div className="data-card-body">
                      <div><span>Client</span><strong>{h.client_name ?? '—'}</strong></div>
                      <div><span>Server</span><strong>{h.server ?? '—'}</strong></div>
                      <div><span>Renewal</span><strong>{h.renewal_date ?? '—'}</strong></div>
                      <div><span>Cost</span><strong>${h.cost.toLocaleString()}</strong></div>
                    </div>
                    <div className="data-card-actions">
                      <button onClick={() => openEdit(h)}><Pencil size={14} /> Edit</button>
                      <button onClick={() => remove(h)}><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState icon={Server} title="No hosting yet" message="Add your first hosting record." action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> Add hosting</button>} />
          )
        }
      </div>

      {showForm && (
        <Modal title={editing ? `Edit ${tab === 'domains' ? 'domain' : 'hosting'}` : `New ${tab === 'domains' ? 'domain' : 'hosting'}`} subtitle={tab} onClose={() => setShowForm(false)} wide>
          {tab === 'domains' ? (
            <div className="form-grid">
              <Field label="Domain name"><input value={form.domain ?? ''} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.com" /></Field>
              <Field label="Client"><select value={form.client_id ?? ''} onChange={(e) => setForm({ ...form, client_id: e.target.value })}><option value="">No client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Registrar"><input value={form.registrar ?? ''} onChange={(e) => setForm({ ...form, registrar: e.target.value })} /></Field>
              <Field label="DNS provider"><input value={form.dns_provider ?? ''} onChange={(e) => setForm({ ...form, dns_provider: e.target.value })} /></Field>
              <Field label="Registration date"><input type="date" value={form.registration_date ?? ''} onChange={(e) => setForm({ ...form, registration_date: e.target.value })} /></Field>
              <Field label="Expiry date"><input type="date" value={form.expiry_date ?? ''} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></Field>
              <Field label="SSL status"><select value={form.ssl_status ?? 'Active'} onChange={(e) => setForm({ ...form, ssl_status: e.target.value })}><option>Active</option><option>Expiring Soon</option><option>Expired</option><option>None</option></select></Field>
              <Field label="Nameservers"><input value={form.nameservers ?? ''} onChange={(e) => setForm({ ...form, nameservers: e.target.value })} /></Field>
              <div className="form-field full"><label className="checkbox-field"><input type="checkbox" checked={form.auto_renewal ?? true} onChange={(e) => setForm({ ...form, auto_renewal: e.target.checked })} /><span>Auto-renewal enabled</span></label></div>
              <div className="form-field full"><span>Notes</span><textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </div>
          ) : (
            <div className="form-grid">
              <Field label="Provider"><input value={form.provider ?? ''} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="e.g. DigitalOcean" /></Field>
              <Field label="Client"><select value={form.client_id ?? ''} onChange={(e) => setForm({ ...form, client_id: e.target.value })}><option value="">No client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
              <Field label="Server"><input value={form.server ?? ''} onChange={(e) => setForm({ ...form, server: e.target.value })} /></Field>
              <Field label="Plan"><input value={form.plan ?? ''} onChange={(e) => setForm({ ...form, plan: e.target.value })} /></Field>
              <Field label="Start date"><input type="date" value={form.start_date ?? ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
              <Field label="Renewal date"><input type="date" value={form.renewal_date ?? ''} onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} /></Field>
              <Field label="Cost ($)"><input type="number" value={form.cost ?? 0} onChange={(e) => setForm({ ...form, cost: e.target.value })} /></Field>
              <Field label="Status"><select value={form.status ?? 'Active'} onChange={(e) => setForm({ ...form, status: e.target.value })}><option>Active</option><option>Expiring Soon</option><option>Expired</option><option>Suspended</option><option>Cancelled</option></select></Field>
              <Field label="Server location"><input value={form.server_location ?? ''} onChange={(e) => setForm({ ...form, server_location: e.target.value })} /></Field>
              <div className="form-field full"><span>Notes</span><textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            </div>
          )}
          <div className="form-actions"><button className="ghost-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button></div>
        </Modal>
      )}
    </>
  );
}
