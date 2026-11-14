import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient }    from '@tanstack/react-query';
import toast                                        from 'react-hot-toast';
import {
  Send, MessageSquare, Users, GraduationCap,
  BookOpen, ShieldCheck, Search, X, Hash,
} from 'lucide-react';
import { messagesService }  from '../../services/index.js';
import useAuthStore         from '../../store/authStore.js';
import useSocketMessage     from '../../hooks/useSocketMessage.js';

const fmtTime = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

const initials = (u) =>
  ((u?.firstName?.[0] ?? '') + (u?.lastName?.[0] ?? '')).toUpperCase() || '?';

// Identifier label per role
const contactSubtitle = (c) => {
  if (c.role === 'collegeAdmin') return 'College Admin';
  if (c.rollNumber)              return c.rollNumber;
  if (c.designation)             return c.designation;
  return c.role;
};

const TABS = [
  { key: 'admin',   label: 'College Admin', icon: ShieldCheck,   gradient: 'from-violet-500 to-purple-600' },
  { key: 'student', label: 'Students',      icon: GraduationCap, gradient: 'from-blue-500 to-blue-600'    },
  { key: 'faculty', label: 'Faculty',       icon: BookOpen,      gradient: 'from-amber-400 to-orange-500' },
  { key: 'alumni',  label: 'Alumni',        icon: Users,         gradient: 'from-emerald-400 to-teal-500' },
];

// ── Conversation panel ────────────────────────────────────────────────────────
const ConversationPanel = ({ contact, myId }) => {
  const qc                          = useQueryClient();
  const [text, setText]             = useState('');
  const [msgs, setMsgs]             = useState([]);
  const [typing, setTyping]         = useState(false);
  const bottomRef                   = useRef();

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
      if (newMsg) {
        setMsgs(prev => {
          const already = prev.some(m => m._id?.toString() === newMsg._id?.toString());
          return already ? prev : [...prev, newMsg];
        });
      }
      setText('');
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to send'),
  });

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && text.trim()) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
          <div className="text-[11px] text-surface-400 flex items-center gap-1.5">
            {contact.rollNumber && <><Hash size={9} /><span>{contact.rollNumber}</span><span className="opacity-40">·</span></>}
            <span className="capitalize">{contact.role === 'collegeAdmin' ? 'College Admin' : contact.role}</span>
            {typing && <span className="ml-2 text-primary-500 italic">typing…</span>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isLoading && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="skeleton h-10 w-48 rounded-2xl" />
              </div>
            ))}
          </div>
        )}
        {!isLoading && msgs.length === 0 && (
          <div className="text-center py-10 text-surface-400">
            <MessageSquare size={28} className="mx-auto mb-2 text-surface-300" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        )}
        {msgs.map(msg => {
          const senderId = msg.senderId?.toString?.() ?? msg.senderId;
          const isMe     = senderId === myId?.toString();
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

      {/* Input */}
      <div className="px-5 py-3.5 border-t border-surface-100 flex gap-3">
        <input
          className="input flex-1 text-sm"
          placeholder="Type a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
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

// ── Main DeptMessages ──────────────────────────────────────────────────────────
const DeptMessages = () => {
  const { user }                    = useAuthStore();
  const [activeTab, setActiveTab]   = useState('admin');
  const [activeContact, setContact] = useState(null);
  const [search, setSearch]         = useState('');

  // Reset contact + search when tab changes
  useEffect(() => { setContact(null); setSearch(''); }, [activeTab]);

  const { data: collegeAdmins = [] } = useQuery({
    queryKey: ['msg-college-admins'],
    queryFn:  messagesService.listCollegeAdmins,
    select:   r => r.data?.admins ?? [],
  });

  const { data: students = [] } = useQuery({
    queryKey: ['msg-dept-students'],
    queryFn:  () => messagesService.listDeptMembers({ role: 'student' }),
    select:   r => r.data?.members ?? [],
  });

  const { data: faculty = [] } = useQuery({
    queryKey: ['msg-dept-faculty'],
    queryFn:  () => messagesService.listDeptMembers({ role: 'faculty' }),
    select:   r => r.data?.members ?? [],
  });

  const { data: alumni = [] } = useQuery({
    queryKey: ['msg-dept-alumni'],
    queryFn:  () => messagesService.listDeptMembers({ role: 'alumni' }),
    select:   r => r.data?.members ?? [],
  });

  const contactsByTab = {
    admin:   collegeAdmins,
    student: students,
    faculty: faculty,
    alumni:  alumni,
  };

  const allContacts    = contactsByTab[activeTab] ?? [];
  const currentTab     = TABS.find(t => t.key === activeTab);
  const TabIcon        = currentTab?.icon ?? Users;

  // Search: match name, email, rollNumber, designation
  const filtered = search.trim()
    ? allContacts.filter(c => {
        const q = search.toLowerCase();
        return (
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q)) ||
          (c.rollNumber?.toLowerCase().includes(q)) ||
          (c.designation?.toLowerCase().includes(q))
        );
      })
    : allContacts;

  const emptyLabel = {
    admin:   'No college admins found',
    student: 'No students in your department yet',
    faculty: 'No faculty in your department yet',
    alumni:  'No alumni in your department yet',
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-2xl border border-surface-200 overflow-hidden bg-white shadow-sm">

      {/* ── Left sidebar ── */}
      <div className="w-72 shrink-0 border-r border-surface-100 flex flex-col">

        {/* Tab bar */}
        <div className="p-3 border-b border-surface-100">
          <div className="grid grid-cols-2 gap-1.5">
            {TABS.map(({ key, label, icon: Icon, gradient }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[11.5px] font-semibold
                  transition-all duration-150
                  ${activeTab === key
                    ? `bg-gradient-to-r ${gradient} text-white shadow-sm`
                    : 'text-surface-600 hover:bg-surface-50'}`}>
                <Icon size={12} />
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
              className="w-full pl-7 pr-7 py-1.5 text-[12px] bg-surface-50 border border-surface-200
                         rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-300 focus:border-primary-300"
              placeholder={
                activeTab === 'student' ? 'Name or roll number…' :
                activeTab === 'faculty' ? 'Name or employee no…' :
                activeTab === 'alumni'  ? 'Name or alumni ID…' :
                'Search…'
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
        </div>

        {/* Contact list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <TabIcon size={24} className="mx-auto mb-2 text-surface-300" />
              <p className="text-xs text-surface-400">
                {search ? 'No contacts match your search' : emptyLabel[activeTab]}
              </p>
            </div>
          ) : filtered.map(contact => (
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
                <div className="text-[13px] font-medium text-surface-800 truncate flex items-center gap-1.5">
                  {contact.firstName} {contact.lastName}
                  {contact.isVerified === false && (
                    <span className="shrink-0 text-[9px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                      Pending
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-surface-400 truncate flex items-center gap-1">
                  {contact.rollNumber && <><Hash size={9} className="shrink-0" /><span>{contact.rollNumber}</span></>}
                  {!contact.rollNumber && <span className="capitalize">{contactSubtitle(contact)}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right panel ── */}
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
          <ConversationPanel
            key={activeContact._id}
            contact={activeContact}
            myId={user?._id}
          />
        )}
      </div>
    </div>
  );
};

export default DeptMessages;
