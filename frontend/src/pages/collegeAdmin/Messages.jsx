import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Send, Users, MessageSquare, Radio } from 'lucide-react';
import { messagesService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

const Messages = () => {
  const { user }                              = useAuthStore();
  const qc                                    = useQueryClient();
  const [activeId, setActiveId]               = useState(null);
  const [text, setText]                       = useState('');
  const [broadcastText, setBroadcastText]     = useState('');
  const [showBroadcast, setShowBroadcast]     = useState(false);
  const bottomRef                             = useRef();

  const { data: admins = [] } = useQuery({
    queryKey: ['msg-dept-admins'],
    queryFn:  messagesService.listDeptAdmins,
    select:   r => r.data?.admins ?? [],
  });

  const { data: threadData } = useQuery({
    queryKey: ['msg-thread', activeId],
    queryFn:  () => messagesService.getThread(activeId),
    select:   r => r.data,
    enabled:  !!activeId,
    refetchInterval: 5000,
  });

  const messages = threadData?.messages ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const { mutate: send, isPending: sending } = useMutation({
    mutationFn: () => messagesService.send({ receiverId: activeId, content: text }),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['msg-thread', activeId] });
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to send'),
  });

  const { mutate: broadcast, isPending: broadcasting } = useMutation({
    mutationFn: () => messagesService.broadcast({ content: broadcastText }),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Broadcast sent');
      setBroadcastText(''); setShowBroadcast(false);
    },
    onError: e => toast.error(e.response?.data?.message ?? 'Failed to broadcast'),
  });

  const selectedAdmin = admins.find(a => a._id === activeId);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 rounded-2xl border border-surface-200 overflow-hidden bg-white shadow-sm">

      {/* Left panel — admin list */}
      <div className="w-72 shrink-0 border-r border-surface-100 flex flex-col">
        <div className="p-4 border-b border-surface-100">
          <h2 className="font-semibold text-surface-800 text-[13.5px] flex items-center gap-2 mb-3">
            <MessageSquare size={15} className="text-primary-500" />
            HODs (Head of Department)
          </h2>
          <button
            onClick={() => setShowBroadcast(s => !s)}
            className="w-full btn btn-ghost btn-sm gap-1 text-primary-600 border border-primary-100 hover:bg-primary-50">
            <Radio size={13} /> Broadcast to All
          </button>
        </div>

        {showBroadcast && (
          <div className="p-3 border-b border-surface-100 bg-primary-50/50">
            <textarea
              className="input text-sm min-h-[70px] resize-none mb-2"
              placeholder="Message for all HODs…"
              value={broadcastText}
              onChange={e => setBroadcastText(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn btn-ghost btn-sm flex-1" onClick={() => setShowBroadcast(false)}>Cancel</button>
              <button
                className="btn btn-primary btn-sm flex-1 gap-1"
                disabled={!broadcastText.trim() || broadcasting}
                onClick={() => broadcast()}>
                <Send size={12} /> {broadcasting ? 'Sending…' : 'Send All'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {admins.length === 0 && (
            <div className="text-center py-10 px-4">
              <Users size={24} className="mx-auto mb-2 text-surface-300" />
              <p className="text-xs text-surface-400">No HODs assigned yet.</p>
            </div>
          )}
          {admins.map(admin => (
            <button
              key={admin._id}
              onClick={() => setActiveId(admin._id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                ${activeId === admin._id
                  ? 'bg-primary-50 border-r-2 border-primary-500'
                  : 'hover:bg-surface-50 border-r-2 border-transparent'}`}>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-600
                              flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {admin.firstName?.[0]}{admin.lastName?.[0]}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-surface-800 truncate">
                  {admin.firstName} {admin.lastName}
                </div>
                <div className="text-[11px] text-surface-400 truncate">
                  {admin.departmentId?.name ?? 'No dept'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="empty-state">
              <div className="empty-icon">
                <Users size={22} className="text-surface-400" />
              </div>
              <p className="empty-title">No conversation selected</p>
              <p className="empty-body">Select an HOD to start a conversation.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-surface-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-600
                              flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {selectedAdmin?.firstName?.[0]}{selectedAdmin?.lastName?.[0]}
              </div>
              <div>
                <div className="font-semibold text-surface-800 text-[13.5px]">
                  {selectedAdmin?.firstName} {selectedAdmin?.lastName}
                </div>
                <div className="text-[11px] text-surface-400">
                  {selectedAdmin?.departmentId?.name ?? ''}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-10 text-surface-400">
                  <MessageSquare size={28} className="mx-auto mb-2 text-surface-300" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              )}
              {messages.map(msg => {
                const isMe = msg.senderId?.toString() === user?._id?.toString() ||
                             msg.senderId === user?._id;
                return (
                  <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-3.5 py-2.5 rounded-2xl text-sm
                      ${isMe
                        ? 'bg-gradient-to-br from-primary-600 to-accent-600 text-white rounded-br-sm'
                        : 'bg-surface-100 text-surface-800 rounded-bl-sm'}`}>
                      <p className="leading-relaxed">{msg.content}</p>
                      <p className={`text-[10px] mt-1.5 ${isMe ? 'text-primary-200' : 'text-surface-400'}`}>
                        {fmt(msg.createdAt)}
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
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey && text.trim()) {
                    e.preventDefault();
                    send();
                  }
                }} />
              <button
                className="btn btn-primary btn-sm gap-1"
                disabled={!text.trim() || sending}
                onClick={() => send()}>
                <Send size={13} /> Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Messages;
