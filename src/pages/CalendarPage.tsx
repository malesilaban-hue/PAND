import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { PageHeader, EmptyState } from '@/components/ui';

type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  type: 'project' | 'task' | 'meeting' | 'invoice' | 'domain' | 'hosting' | 'contract';
};

const EVENT_COLORS: Record<string, string> = {
  project: 'mint',
  task: 'amber',
  meeting: 'sky',
  invoice: 'coral',
  domain: 'mint',
  hosting: 'sky',
  contract: 'amber',
};

export function CalendarPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [projects, tasks, meetings, invoices, domains, hosting, contracts] = await Promise.all([
        supabase.from('projects').select('id, name, expected_completion_date').eq('user_id', user.id).not('expected_completion_date', 'is', null),
        supabase.from('tasks').select('id, title, due_date').eq('user_id', user.id).not('due_date', 'is', null),
        supabase.from('meetings').select('id, title, meeting_date').eq('user_id', user.id),
        supabase.from('invoices').select('id, invoice_number, due_date').eq('user_id', user.id).not('due_date', 'is', null),
        supabase.from('domains').select('id, domain, expiry_date').eq('user_id', user.id).not('expiry_date', 'is', null),
        supabase.from('hosting').select('id, provider, renewal_date').eq('user_id', user.id).not('renewal_date', 'is', null),
        supabase.from('contracts').select('id, title, end_date, renewal_date').eq('user_id', user.id),
      ]);

      const allEvents: CalendarEvent[] = [
        ...(projects.data ?? []).map((p: any) => ({ id: p.id, title: p.name, date: p.expected_completion_date, type: 'project' as const })),
        ...(tasks.data ?? []).map((t: any) => ({ id: t.id, title: t.title, date: t.due_date, type: 'task' as const })),
        ...(meetings.data ?? []).map((m: any) => ({ id: m.id, title: m.title, date: m.meeting_date, type: 'meeting' as const })),
        ...(invoices.data ?? []).map((i: any) => ({ id: i.id, title: `Invoice ${i.invoice_number} due`, date: i.due_date, type: 'invoice' as const })),
        ...(domains.data ?? []).map((d: any) => ({ id: d.id, title: `${d.domain} expires`, date: d.expiry_date, type: 'domain' as const })),
        ...(hosting.data ?? []).map((h: any) => ({ id: h.id, title: `${h.provider} renewal`, date: h.renewal_date, type: 'hosting' as const })),
        ...(contracts.data ?? []).filter((c: any) => c.end_date).map((c: any) => ({ id: c.id, title: `${c.title} ends`, date: c.end_date, type: 'contract' as const })),
        ...(contracts.data ?? []).filter((c: any) => c.renewal_date).map((c: any) => ({ id: `${c.id}-r`, title: `${c.title} renewal`, date: c.renewal_date, type: 'contract' as const })),
      ];
      setEvents(allEvents);
      setLoading(false);
    })();
  }, [user]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [events]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader title="Calendar" subtitle="Workspace" />

      <div className="panel">
        <div className="calendar-header">
          <div className="calendar-nav">
            <button className="icon-button" onClick={prevMonth}><ChevronLeft size={18} /></button>
            <strong>{monthName}</strong>
            <button className="icon-button" onClick={nextMonth}><ChevronRight size={18} /></button>
          </div>
          <div className="calendar-legend">
            {Object.entries(EVENT_COLORS).map(([type, color]) => (
              <span key={type}><i className={`legend-dot ${color}`} /> {type}</span>
            ))}
          </div>
        </div>

        {loading ? <div className="loading-state"><div className="spinner" /></div> : (
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => <div className="calendar-dow" key={d}>{d}</div>)}
            {Array.from({ length: firstDay }).map((_, i) => <div className="calendar-day empty" key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = eventsByDate.get(dateStr) ?? [];
              const isToday = dateStr === today;
              return (
                <div className={`calendar-day ${isToday ? 'today' : ''}`} key={dateStr}>
                  <span className="day-num">{dayNum}</span>
                  {dayEvents.slice(0, 3).map((e) => (
                    <div className={`calendar-event ${EVENT_COLORS[e.type]}`} key={e.id}>{e.title}</div>
                  ))}
                  {dayEvents.length > 3 && <div className="calendar-more">+{dayEvents.length - 3} more</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="panel">
        <div className="panel-heading"><div><div className="eyebrow">All events</div><h2>Upcoming ({events.length})</h2></div></div>
        {events.length > 0 ? (
          <div className="upcoming-list">
            {events.filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10).map((e) => (
              <div className="upcoming-item" key={e.id}>
                <div className={`date-tile ${EVENT_COLORS[e.type]}`}>
                  <strong>{new Date(e.date).getDate()}</strong>
                  <span>{new Date(e.date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</span>
                </div>
                <div><strong>{e.title}</strong><span className="event-type">{e.type}</span></div>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={CalendarDays} title="No events" message="Dates from your projects, tasks, and invoices will appear here." />}
      </div>
    </>
  );
}
