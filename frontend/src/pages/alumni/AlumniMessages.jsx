import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient }    from '@tanstack/react-query';
import toast                                        from 'react-hot-toast';
import {
  Send, MessageSquare, GraduationCap, BookOpen, ShieldCheck, Search, X, Hash,
} from 'lucide-react';
import { messagesService }  from '../../services/index.js';
import useAuthStore         from '../../store/authStore.js';
import useSocketMessage     from '../../hooks/useSocketMessage.js';

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

const initials = (u) =>
  ((u?.firstName?.[0] ?? '') + (u?.lastName?.[0] ?? '')).toUpperCase() || '?';

const ROLE_TABS = [
  { key: 'student', label: 'Students', icon: GraduationCap },
  { key: 'faculty', label: 'Faculty',  icon: BookOpen      },
  { key: 'deptAdmin', label: 'HOD',    icon: ShieldCheck   },
];

// ── Conversation panel ────────────────────────────────────────────────────────
const ConversationPanel = ({ contact, myId }) => {
  const qc                 = useQueryClient();
  const [text, setText]    = useState('');
  const [msgs, setMsgs]    = useState([]);
  const bottomRef          = useRef();

  const { data: threadData, isLoading } = useQuery({
    queryKey: ['msg-thread', contact._id],
    queryFn:  () => messagesService.getThread(contact._id),
    select:   r  => r.data?.messages ?? [],
    enabled:  !!contact._id,
  });

  useEffect(() => { if (threadData) setMsgs(threadData); }, [threadData]);

  const handleIncoming = useCallback((msg) => {
    setMsgs(prev => {
      const already = prev.some(m => m._id?.toString() === msg._id?.toString());
      return already ? prev : [...prev, msg];
    });
    qc.invalidateQueries({ queryKey: ['msg-thread', contact._id] });
  }, [contact._id, qc]);

  useSocketMessage({ activeUserId: contact._id, onMessage: handleIncoming });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  const { mutate: send, isPending: sending } = useMutation({
    mutationFn: () => messagesService.send({ receiverId: contact._id, content: text }),
    onSuccess: (res) => {
      const newMsg = res.data?.message;
      if (newMsg) setMsgs(prev => {
        const already = prev.some(m => m._id?.toString() === newMsg._id?.toString());
        return already ? prev : [...prev, newMsg];
      });
      setText('');
      qc.invalidateQueries({ queryKey: ['msg-thread', contact._id] });
    },
    onError: (e) => toast.error(e.response?.data?.message ?? 'Failed to send message'),
  });

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) send();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-50">
      {/* Header */}
      <div className="p-3.5 bg-white border-b border-surface-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-semibold text-xs flex items-center justify-center shrink-0">
          {contact.profileImage?.url ? (
            <img src={contact.profileImage.url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            initials(contact)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-surface-800 truncate">
            {contact.firstName} {contact.lastName}
          </div>
          <div className="text-[11px] text-surface-400 truncate capitalize">
            {contact.role === 'deptAdmin' ? 'Department Head (HOD)' : contact.role}
            {contact.rollNumber ? ` · ${contact.rollNumber}` : ''}
            {contact.designation ? ` · ${contact.designation}` : ''}
          </div>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="text-center py-8 text-xs text-surface-400">Loading messages…</div>
        )}
        {!isLoading && msgs.length === 0 && (
          <div className="text-center py-16">
            <MessageSquare size={32} className="mx-auto mb-2 text-surface-300" />
            <p className="text-xs text-surface-400">No messages yet. Send a greeting to start chatting!</p>
          </div>
        )}
        {msgs.map((m) => {
          const isMe = (m.senderId?._id ?? m.senderId)?.toString() === myId?.toString();
          return (
            <div key={m._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-xs shadow-sm ${
                isMe
                  ? 'bg-primary-600 text-white rounded-br-none'
                  : 'bg-white text-surface-800 border border-surface-200 rounded-bl-none'
              }`}>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-primary-200' : 'text-surface-400'}`}>
                  {fmtTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-surface-100 flex items-center gap-2">
        <input
          type="text"
          className="input flex-1 text-xs py-2"
          placeholder="Type your message… (Press Enter to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          onClick={() => { if (text.trim()) send(); }}
          disabled={!text.trim() || sending}
          className="btn btn-primary btn-sm px-3 py-2"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Main AlumniMessages component ─────────────────────────────────────────────
const AlumniMessages = () => {
  const { user } = useAuthStore();
  const [activeRole, setActiveRole] = useState('student');
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);

  const queryParams = {
    role: activeRole,
    ...(search ? { search } : {}),
  };

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['alumni-contacts', activeRole, search],
    queryFn:  () => messagesService.listContacts(queryParams),
    select:   r  => r.data?.contacts ?? [],
  });

  const currentTab = ROLE_TABS.find(t => t.key === activeRole);
  const TabIcon = currentTab?.icon ?? GraduationCap;

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-surface-200 overflow-hidden bg-white shadow-sm">
      {/* Left sidebar: Contact list */}
      <div className="w-72 shrink-0 border-r border-surface-100 flex flex-col">
        {/* Role tabs */}
        <div className="p-3 border-b border-surface-100">
          <div className="flex gap-1">
            {ROLE_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setActiveRole(key); setSelectedContact(null); }}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
                  activeRole === key
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-surface-600 hover:bg-surface-50'
                }`}
              >
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5 border-b border-surface-100">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="w-full pl-7 pr-7 py-1.5 text-[12px] bg-surface-50 border border-surface-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder={`Search ${activeRole}s…`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Contacts */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-32" />
                    <div className="skeleton h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-10 px-4">
              <TabIcon size={24} className="mx-auto mb-2 text-surface-300" />
              <p className="text-xs text-surface-400">
                {search ? 'No matching contacts' : `No ${activeRole}s found`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-surface-50">
              {contacts.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedContact(c)}
                  className={`w-full p-3 flex items-center gap-3 text-left transition-colors ${
                    selectedContact?._id === c._id
                      ? 'bg-primary-50 border-r-2 border-primary-600'
                      : 'hover:bg-surface-50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-surface-100 text-surface-700 font-semibold text-xs flex items-center justify-center shrink-0">
                    {c.profileImage?.url ? (
                      <img src={c.profileImage.url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      initials(c)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-surface-800 truncate">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-[11px] text-surface-400 truncate">
                      {c.role === 'deptAdmin' ? 'HOD' : c.designation || c.rollNumber || c.role}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Active conversation */}
      {selectedContact ? (
        <ConversationPanel contact={selectedContact} myId={user?._id} />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-surface-50">
          <MessageSquare size={44} className="text-surface-300 mb-3" />
          <h3 className="text-sm font-semibold text-surface-700">Select a conversation</h3>
          <p className="text-xs text-surface-400 mt-1 max-w-xs">
            Choose a contact from the list on the left to start messaging.
          </p>
        </div>
      )}
    </div>
  );
};

export default AlumniMessages;
