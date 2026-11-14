import { useState, useRef, useEffect }           from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast                                     from 'react-hot-toast';
import {
  LifeBuoy, Send, ChevronRight, Inbox,
  Clock, CheckCircle2, AlertCircle, MessageCircle, Check,
} from 'lucide-react';
import { supportService }  from '../../services/index.js';
import useAuthStore        from '../../store/authStore.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META = {
  open:        { label: 'Open',        color: 'bg-blue-100 text-blue-700',      icon: AlertCircle  },
  in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700',    icon: Clock        },
  resolved:    { label: 'Resolved',    color: 'bg-green-100 text-green-700',    icon: CheckCircle2 },
  closed:      { label: 'Closed',      color: 'bg-surface-100 text-surface-500', icon: CheckCircle2 },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] ?? STATUS_META.open;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
      <Icon size={10} /> {meta.label}
    </span>
  );
};

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

// ── Ticket Thread ─────────────────────────────────────────────────────────────

const TicketThread = ({ ticket, onReply, onStatusChange }) => {
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await onReply(reply.trim());
      setReply('');
    } finally {
      setSending(false);
    }
  };

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-surface-100">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="font-semibold text-surface-800 text-[13.5px] leading-snug">{ticket.subject}</div>
            <div className="text-[11px] text-surface-400 mt-0.5">
              {ticket.collegeId?.name ?? 'Unknown College'} · Raised on {fmtDate(ticket.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={ticket.status} />
            {/* Status controls */}
            {ticket.status === 'open' && (
              <button
                onClick={() => onStatusChange('in_progress')}
                className="btn btn-ghost btn-sm text-xs gap-1 text-amber-600 hover:bg-amber-50">
                Mark In Progress
              </button>
            )}
            {(ticket.status === 'open' || ticket.status === 'in_progress') && (
              <button
                onClick={() => onStatusChange('resolved')}
                className="btn btn-ghost btn-sm text-xs gap-1 text-green-600 hover:bg-green-50">
                <Check size={11} /> Resolve
              </button>
            )}
            {ticket.status !== 'closed' && (
              <button
                onClick={() => onStatusChange('closed')}
                className="btn btn-ghost btn-sm text-xs gap-1 text-surface-500 hover:bg-surface-100">
                Close
              </button>
            )}
          </div>
        </div>

        {/* Original description */}
        <div className="mt-3 p-3 rounded-xl bg-surface-50 border border-surface-100">
          <p className="text-[11px] text-surface-400 mb-1 font-semibold uppercase tracking-wide">Original Query</p>
          <p className="text-sm text-surface-700 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {ticket.messages.length === 0 && (
          <div className="text-center py-10 text-surface-400">
            <MessageCircle size={28} className="mx-auto mb-2 text-surface-300" />
            <p className="text-sm">No replies yet. Reply below to respond.</p>
          </div>
        )}

        {ticket.messages.map((msg, i) => {
          const isOwner = msg.senderRole === 'owner';
          const senderName = isOwner
            ? 'You (Support)'
            : `${msg.senderId?.firstName ?? 'College'} ${msg.senderId?.lastName ?? ''}`.trim();

          return (
            <div key={i} className={`flex flex-col ${isOwner ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm
                ${isOwner
                  ? 'bg-gradient-to-br from-primary-600 to-accent-600 text-white rounded-br-sm'
                  : 'bg-surface-100 text-surface-800 rounded-bl-sm'}`}>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                <p className={`text-[10px] mt-1.5 ${isOwner ? 'text-primary-200' : 'text-surface-400'}`}>
                  {senderName} · {fmtTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      {!isClosed ? (
        <div className="p-4 border-t border-surface-100 flex gap-3">
          <textarea
            className="input flex-1 text-sm resize-none min-h-[44px] max-h-[120px]"
            placeholder="Type your reply…"
            rows={1}
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && reply.trim()) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className="btn btn-primary btn-sm gap-1 self-end"
            disabled={!reply.trim() || sending}
            onClick={handleSend}>
            <Send size={13} /> {sending ? '…' : 'Send'}
          </button>
        </div>
      ) : (
        <div className="p-3 border-t border-surface-100 text-center text-xs text-surface-400">
          This ticket is {ticket.status}.
        </div>
      )}
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const OwnerQueries = () => {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [filter, setFilter]     = useState('all');

  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['owner-support-tickets', filter],
    queryFn:  () => supportService.listAll(filter !== 'all' ? { status: filter } : {}),
    select:   r => r.data,
  });

  const { data: ticketDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['support-ticket', activeId],
    queryFn:  () => supportService.getById(activeId),
    select:   r => r.data?.ticket,
    enabled:  !!activeId,
    refetchInterval: 8000,
  });

  const { mutate: sendReply } = useMutation({
    mutationFn: (body) => supportService.reply(activeId, { body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-ticket', activeId] });
      qc.invalidateQueries({ queryKey: ['owner-support-tickets'] });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to send reply'),
  });

  const { mutate: changeStatus } = useMutation({
    mutationFn: (status) => supportService.updateStatus(activeId, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['support-ticket', activeId] });
      qc.invalidateQueries({ queryKey: ['owner-support-tickets'] });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to update status'),
  });

  const tickets = ticketsData?.tickets ?? [];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-2xl border border-surface-200 overflow-hidden bg-white shadow-sm">

      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-surface-100 flex flex-col">
        <div className="p-4 border-b border-surface-100">
          <h2 className="font-semibold text-surface-800 text-[13.5px] flex items-center gap-2 mb-3">
            <LifeBuoy size={15} className="text-primary-500" /> Support Queries
          </h2>

          {/* Filter tabs */}
          <div className="flex gap-1 bg-surface-100 p-0.5 rounded-lg">
            {[
              { key: 'all',         label: 'All'        },
              { key: 'open',        label: 'Open'       },
              { key: 'in_progress', label: 'Active'     },
              { key: 'resolved',    label: 'Resolved'   },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex-1 text-[10px] py-1 rounded-md font-medium transition-colors
                  ${filter === f.key
                    ? 'bg-white text-surface-800 shadow-sm'
                    : 'text-surface-500 hover:text-surface-700'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="skeleton h-3 w-3/4" />
                  <div className="skeleton h-3 w-1/2" />
                </div>
              ))}
            </div>
          )}

          {!isLoading && tickets.length === 0 && (
            <div className="text-center py-12 text-surface-400 px-4">
              <Inbox size={28} className="mx-auto mb-2 text-surface-300" />
              <p className="text-sm font-medium text-surface-500">No queries</p>
            </div>
          )}

          {tickets.map(t => (
            <button
              key={t._id}
              onClick={() => setActiveId(t._id)}
              className={`w-full text-left px-4 py-3 border-b border-surface-50 transition-colors
                ${activeId === t._id
                  ? 'bg-primary-50 border-r-2 border-r-primary-500'
                  : 'hover:bg-surface-50 border-r-2 border-transparent'}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-[13px] font-medium text-surface-800 truncate leading-snug">
                  {t.subject}
                </div>
                <ChevronRight size={13} className="text-surface-300 shrink-0 mt-0.5" />
              </div>
              <div className="text-[11px] text-surface-400 truncate mb-1.5">
                {t.collegeId?.name ?? 'Unknown College'}
              </div>
              <div className="flex items-center justify-between gap-2">
                <StatusBadge status={t.status} />
                <span className="text-[10px] text-surface-400">{fmtDate(t.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeId ? (
          loadingDetail ? (
            <div className="flex-1 flex items-center justify-center text-sm text-surface-400">Loading…</div>
          ) : ticketDetail ? (
            <TicketThread
              ticket={ticketDetail}
              onReply={(body) => sendReply(body)}
              onStatusChange={(status) => changeStatus(status)}
            />
          ) : null
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="empty-state">
              <div className="empty-icon">
                <LifeBuoy size={22} className="text-surface-400" />
              </div>
              <p className="empty-title">No query selected</p>
              <p className="empty-body">Select a query from the list to view and respond.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerQueries;
