import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient }    from '@tanstack/react-query';
import toast                                        from 'react-hot-toast';
import {
  Send, MessageSquare, GraduationCap, BookOpen, Users, Search, X, Hash, Filter,
} from 'lucide-react';
import { messagesService }  from '../../services/index.js';
import useAuthStore         from '../../store/authStore.js';
import useSocketMessage     from '../../hooks/useSocketMessage.js';

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

const initials = (u) =>
  ((u?.firstName?.[0] ?? '') + (u?.lastName?.[0] ?? '')).toUpperCase() || '?';

const ROLE_TABS = [
  { key: 'student', label: 'Students',  icon: GraduationCap },
  { key: 'alumni',  label: 'Alumni',    icon: Users         },
  { key: 'faculty', label: 'Faculty',   icon: BookOpen      },
];

const SEMESTERS = [1,2,3,4,5,6,7,8];

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
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to send'),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-600
                        flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
          {contact.profileImage?.url
            ? <img src={contact.profileImage.url} className="w-full h-full rounded-full object-cover" alt="" />
            : initials(contact)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-surface-800 text-[13.5px] truncate">
            {contact.firstName} {contact.lastName}
          </div>
          <div className="text-[11px] text-surface-400 flex items-center gap-1.5 capitalize">
            {contact.rollNumber && <><Hash size={9} /><span>{contact.rollNumber}</span><span className="opacity-40">·</span></>}
            <span>{contact.role}</span>
            {contact.semester && <><span className="opacity-40">·</span><span>Sem {contact.semester}</span></>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isLoading && [1,2,3].map(i => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className="skeleton h-10 w-48 rounded-2xl" />
          </div>
        ))}
        {!isLoading && msgs.length === 0 && (
          <div className="text-center py-10 text-surface-400">
            <MessageSquare size={28} className="mx-auto mb-2 text-surface-300" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        )}
        {msgs.map(msg => {
          const isMe = msg.senderId?.toString?.() === myId?.toString();
          return (
            <div key={msg._id ?? Math.random()} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs lg:max-w-md px-3.5 py-2.5 rounded-2xl text-sm
                ${isMe
                  ? 'bg-gradient-to-br from-primary-600 to-accent-600 text-white rounded-br-sm'
                  : 'bg-surface-100 text-surface-800 rounded-bl-sm'}`}>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1.5 ${isMe ? 'text-primary-200' : 'text-surface-400'}`}>
                  {fmtTime(msg.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="px-5 py-3.5 border-t border-surface-100 flex gap-3">
        <input
          className="input flex-1 text-sm"
          placeholder="Type a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && text.trim()) { e.preventDefault(); send(); } }}
        />
        <button
          className="btn btn-primary btn-sm gap-1"
          disabled={!text.trim() || sending}
          onClick={() => send()}>
          <Send size={13} />
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
};

// ── Main StudentMessages ───────────────────────────────────────────────────────
const StudentMessages = () => {
  const { user }                       = useAuthStore();
  const [activeRole, setActiveRole]    = useState('student');
  const [activeContact, setContact]    = useState(null);
  const [search, setSearch]            = useState('');
  const [semFilter, setSemFilter]      = useState('');
  const [showFilters, setShowFilters]  = useState(false);

  useEffect(() => { setContact(null); setSearch(''); setSemFilter(''); }, [activeRole]);

  const queryParams = {
    role:     activeRole,
    ...(activeRole === 'student' && semFilter ? { semester: semFilter } : {}),
    ...(search ? { search } : {}),
  };

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['student-contacts', activeRole, semFilter, search],
    queryFn:  () => messagesService.listContacts(queryParams),
    select:   r  => r.data?.contacts ?? [],
  });

  const currentTab = ROLE_TABS.find(t => t.key === activeRole);
  const TabIcon    = currentTab?.icon ?? Users;

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-surface-200 overflow-hidden bg-white shadow-sm">

      {/* Left sidebar */}
      <div className="w-72 shrink-0 border-r border-surface-100 flex flex-col">

        {/* Role tabs */}
        <div className="p-3 border-b border-surface-100">
          <div className="flex gap-1">
            {ROLE_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveRole(key)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold
                  transition-colors
                  ${activeRole === key
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-surface-600 hover:bg-surface-50'}`}>
                <Icon size={11} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search + filter */}
        <div className="px-3 py-2.5 border-b border-surface-100 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              className="w-full pl-7 pr-7 py-1.5 text-[12px] bg-surface-50 border border-surface-200
                         rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300"
              placeholder={
                activeRole === 'student' ? 'Name or roll number…' :
                activeRole === 'faculty' ? 'Search by name…' : 'Name or alumni ID…'
              }
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Semester filter — students only */}
          {activeRole === 'student' && (
            <select
              className="w-full py-1.5 px-2.5 text-[12px] bg-surface-50 border border-surface-200
                         rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300"
              value={semFilter}
              onChange={e => setSemFilter(e.target.value)}>
              <option value="">All Semesters</option>
              {SEMESTERS.map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          )}
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="space-y-1 p-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-32" />
                    <div className="skeleton h-2.5 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isLoading && contacts.length === 0 && (
            <div className="text-center py-10 px-4">
              <TabIcon size={24} className="mx-auto mb-2 text-surface-300" />
              <p className="text-xs text-surface-400">
                {search || semFilter ? 'No matches found' : `No ${activeRole}s available`}
              </p>
            </div>
          )}
          {!isLoading && contacts.map(contact => (
            <button
              key={contact._id}
              onClick={() => setContact(contact)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                ${activeContact?._id === contact._id
                  ? 'bg-primary-50 border-r-2 border-primary-500'
                  : 'hover:bg-surface-50 border-r-2 border-transparent'}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-600
                              flex items-center justify-center text-white font-semibold text-sm shrink-0 overflow-hidden">
                {contact.profileImage?.url
                  ? <img src={contact.profileImage.url} className="w-full h-full object-cover" alt="" />
                  : initials(contact)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-surface-800 truncate">
                  {contact.firstName} {contact.lastName}
                </div>
                <div className="text-[11px] text-surface-400 truncate flex items-center gap-1">
                  {contact.rollNumber && <><Hash size={9} className="shrink-0" /><span>{contact.rollNumber}</span></>}
                  {contact.semester   && <span>· Sem {contact.semester}</span>}
                  {!contact.rollNumber && !contact.semester && (
                    <span className="capitalize">{contact.designation ?? contact.currentRole ?? contact.role}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeContact ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="empty-state">
              <div className="empty-icon">
                <MessageSquare size={22} className="text-surface-400" />
              </div>
              <p className="empty-title">No conversation selected</p>
              <p className="empty-body">
                Pick a {currentTab?.label.toLowerCase() ?? 'contact'} from the list to start chatting.
              </p>
            </div>
          </div>
        ) : (
          <ConversationPanel key={activeContact._id} contact={activeContact} myId={user?._id} />
        )}
      </div>
    </div>
  );
};

export default StudentMessages;
