import { useEffect, useState } from 'react';
import { Plus, Trash2, Pencil, CircleDollarSign, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { Modal, Field, EmptyState, PageHeader, StatusBadge } from '@/components/ui';
import type { Database } from '@/lib/supabase';

type Invoice = Database['invoices'];
type Payment = Database['payments'];
type Client = Database['clients'];
type Project = Database['projects'];

const PAYMENT_STATUSES = ['Unpaid', 'Partially Paid', 'Paid', 'Overdue', 'Refunded'];

export function InvoicesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<(Invoice & { client_name: string | null; project_name: string | null; payments: Payment[] })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_date: '', payment_method: 'Bank Transfer', reference: '' });
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [invRes, clientRes, projRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('*').eq('user_id', user.id).order('name'),
      supabase.from('projects').select('id, name').eq('user_id', user.id).eq('is_archived', false),
    ]);
    const clientMap = new Map((clientRes.data ?? []).map((c: Client) => [c.id, c.name]));
    const projMap = new Map((projRes.data ?? []).map((p: Project) => [p.id, p.name]));
    const invoicesWithRelations = await Promise.all((invRes.data ?? []).map(async (inv: Invoice) => {
      const { data: payData } = await supabase.from('payments').select('*').eq('invoice_id', inv.id).order('payment_date', { ascending: false });
      return { ...inv, client_name: inv.client_id ? clientMap.get(inv.client_id) ?? null : null, project_name: inv.project_id ? projMap.get(inv.project_id) ?? null : null, payments: payData ?? [] };
    }));
    setInvoices(invoicesWithRelations);
    setClients(clientRes.data ?? []);
    setProjects(projRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const filtered = invoices.filter((i) => `${i.invoice_number} ${i.client_name ?? ''}`.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditing(null);
    setForm({ invoice_number: `INV-${Date.now().toString().slice(-6)}`, client_id: '', project_id: '', issue_date: new Date().toISOString().slice(0, 10), due_date: '', subtotal: 0, tax: 0, discount: 0, total: 0, amount_paid: 0, payment_status: 'Unpaid', notes: '' });
    setShowForm(true);
  };

  const openEdit = (inv: Invoice) => {
    setEditing(inv);
    setForm({ ...inv });
    setShowForm(true);
  };

  const save = async () => {
    if (!user || !form.invoice_number) return;
    setSaving(true);
    const payload = {
      ...form,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      subtotal: parseFloat(form.subtotal) || 0,
      tax: parseFloat(form.tax) || 0,
      discount: parseFloat(form.discount) || 0,
      total: parseFloat(form.total) || 0,
      amount_paid: parseFloat(form.amount_paid) || 0,
    };
    if (editing) {
      await supabase.from('invoices').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editing.id);
      await logActivity(user.id, 'Updated invoice', 'invoice', editing.id, form.invoice_number);
    } else {
      const { data } = await supabase.from('invoices').insert({ ...payload, user_id: user.id }).select().single();
      if (data) await logActivity(user.id, 'Created invoice', 'invoice', data.id, form.invoice_number);
    }
    setSaving(false); setShowForm(false); load();
  };

  const remove = async (inv: Invoice) => {
    await supabase.from('invoices').delete().eq('id', inv.id);
    load();
  };

  const addPayment = async () => {
    if (!user || !selectedInvoice || !paymentForm.amount) return;
    await supabase.from('payments').insert({
      user_id: user.id,
      invoice_id: selectedInvoice.id,
      client_id: selectedInvoice.client_id,
      project_id: selectedInvoice.project_id,
      amount: parseFloat(paymentForm.amount),
      payment_date: paymentForm.payment_date || new Date().toISOString().slice(0, 10),
      payment_method: paymentForm.payment_method,
      reference: paymentForm.reference,
    });
    const newAmountPaid = (selectedInvoice.amount_paid || 0) + parseFloat(paymentForm.amount);
    const newStatus = newAmountPaid >= selectedInvoice.total ? 'Paid' : 'Partially Paid';
    await supabase.from('invoices').update({ amount_paid: newAmountPaid, payment_status: newStatus, updated_at: new Date().toISOString() }).eq('id', selectedInvoice.id);
    await logActivity(user.id, 'Recorded payment', 'payment', null, `$${paymentForm.amount}`, selectedInvoice.project_id ?? undefined, selectedInvoice.client_id ?? undefined);
    setShowPayment(false);
    setPaymentForm({ amount: 0, payment_date: '', payment_method: 'Bank Transfer', reference: '' });
    load();
  };

  return (
    <>
      <PageHeader title="Invoices & Payments" subtitle="Business" action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> New invoice</button>} />

      <div className="metric-grid">
        <div className="metric-card"><div className="metric-icon green"><CircleDollarSign size={18} /></div><div className="metric-label">Total invoiced</div><strong>${invoices.reduce((s, i) => s + i.total, 0).toLocaleString()}</strong><span>{invoices.length} invoices</span></div>
        <div className="metric-card"><div className="metric-icon blue"><CircleDollarSign size={18} /></div><div className="metric-label">Total paid</div><strong>${invoices.reduce((s, i) => s + i.amount_paid, 0).toLocaleString()}</strong><span>Received</span></div>
        <div className="metric-card"><div className="metric-icon orange"><CircleDollarSign size={18} /></div><div className="metric-label">Outstanding</div><strong>${invoices.reduce((s, i) => s + (i.total - i.amount_paid), 0).toLocaleString()}</strong><span>Unpaid balance</span></div>
        <div className="metric-card"><div className="metric-icon brown"><ArrowUpRight size={18} /></div><div className="metric-label">Overdue</div><strong>{invoices.filter((i) => i.payment_status === 'Overdue').length}</strong><span>Need attention</span></div>
      </div>

      <div className="panel">
        <div className="project-toolbar">
          <div className="inline-search"><Plus size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter invoices..." /></div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner" /></div> :
          filtered.length > 0 ? (
            <div className="card-grid">
              {filtered.map((inv) => (
                <div className="data-card" key={inv.id}>
                  <div className="data-card-head">
                    <div className="data-card-avatar">{inv.invoice_number.slice(-2)}</div>
                    <div><strong>{inv.invoice_number}</strong><span>{inv.client_name ?? 'No client'}</span></div>
                    <StatusBadge status={inv.payment_status} />
                  </div>
                  <div className="data-card-body">
                    <div><span>Total</span><strong>${inv.total.toLocaleString()}</strong></div>
                    <div><span>Paid</span><strong>${inv.amount_paid.toLocaleString()}</strong></div>
                    <div><span>Balance</span><strong>${(inv.total - inv.amount_paid).toLocaleString()}</strong></div>
                    <div><span>Due date</span><strong>{inv.due_date ?? '—'}</strong></div>
                  </div>
                  <div className="data-card-actions">
                    <button onClick={() => { setSelectedInvoice(inv); setShowPayment(true); }}><Plus size={14} /> Payment</button>
                    <button onClick={() => openEdit(inv)}><Pencil size={14} /> Edit</button>
                    <button onClick={() => remove(inv)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={CircleDollarSign} title="No invoices yet" message="Create your first invoice to track payments." action={<button className="primary-button" onClick={openCreate}><Plus size={17} /> Create invoice</button>} />
          )
        }
      </div>

      {showForm && (
        <Modal title={editing ? 'Edit invoice' : 'New invoice'} subtitle="Invoice details" onClose={() => setShowForm(false)} wide>
          <div className="form-grid">
            <Field label="Invoice number"><input value={form.invoice_number ?? ''} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} /></Field>
            <Field label="Client"><select value={form.client_id ?? ''} onChange={(e) => setForm({ ...form, client_id: e.target.value })}><option value="">No client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
            <Field label="Project"><select value={form.project_id ?? ''} onChange={(e) => setForm({ ...form, project_id: e.target.value })}><option value="">No project</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Issue date"><input type="date" value={form.issue_date ?? ''} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} /></Field>
            <Field label="Due date"><input type="date" value={form.due_date ?? ''} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></Field>
            <Field label="Subtotal ($)"><input type="number" value={form.subtotal ?? 0} onChange={(e) => setForm({ ...form, subtotal: e.target.value })} /></Field>
            <Field label="Tax ($)"><input type="number" value={form.tax ?? 0} onChange={(e) => setForm({ ...form, tax: e.target.value })} /></Field>
            <Field label="Discount ($)"><input type="number" value={form.discount ?? 0} onChange={(e) => setForm({ ...form, discount: e.target.value })} /></Field>
            <Field label="Total ($)"><input type="number" value={form.total ?? 0} onChange={(e) => setForm({ ...form, total: e.target.value })} /></Field>
            <Field label="Payment status"><select value={form.payment_status ?? 'Unpaid'} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}>{PAYMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
            <div className="form-field full"><span>Notes</span><textarea value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          <div className="form-actions"><button className="ghost-button" onClick={() => setShowForm(false)}>Cancel</button><button className="primary-button" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save invoice'}</button></div>
        </Modal>
      )}

      {showPayment && selectedInvoice && (
        <Modal title="Record payment" subtitle={`Invoice ${selectedInvoice.invoice_number}`} onClose={() => setShowPayment(false)}>
          <div className="form-grid">
            <Field label="Amount ($)"><input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Payment date"><input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /></Field>
            <Field label="Payment method"><select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}><option>Bank Transfer</option><option>Cash</option><option>Credit Card</option><option>Mobile Money</option><option>PayPal</option><option>Other</option></select></Field>
            <Field label="Reference"><input value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} /></Field>
          </div>
          <div className="form-actions"><button className="ghost-button" onClick={() => setShowPayment(false)}>Cancel</button><button className="primary-button" onClick={addPayment}>Record payment</button></div>
        </Modal>
      )}
    </>
  );
}
