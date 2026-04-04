'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  subscribeToCommunities,
  subscribeToMessages,
  subscribeToMembers,
  sendMessage,
  toggleLike,
  joinCommunity,
  createCommunity,
} from '@/lib/firestore/communityMessages';
import type { Community, CommunityMessage, CommunityRoomMember } from '@/types';

const DEFAULT_COMMUNITIES: Community[] = [
  { id: 'general', name: 'General', description: 'Conversación abierta', icon: '💬', color: 'var(--color-prosper-green)', memberCount: 0, createdBy: 'system', createdAt: 0 },
  { id: 'ahorro', name: 'Ahorro', description: 'Tips para ahorrar mejor', icon: '💰', color: 'var(--color-prosper-navy)', memberCount: 0, createdBy: 'system', createdAt: 1 },
  { id: 'inversion', name: 'Inversión', description: 'Inversiones para todos', icon: '📈', color: '#F59E0B', memberCount: 0, createdBy: 'system', createdAt: 2 },
  { id: 'educacion', name: 'Educación', description: 'Aprende finanzas', icon: '📚', color: '#3B82F6', memberCount: 0, createdBy: 'system', createdAt: 3 },
];

// ==================== MessageItem (React.memo) ====================
const MessageItem = ({ msg, isOwn, onLike }: {
  msg: CommunityMessage;
  isOwn: boolean;
  onLike: () => void;
}) => {
  const liked = msg.likes.includes(msg.senderId);
  const timeStr = useMemo(() => {
    const d = new Date(msg.timestamp);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  }, [msg.timestamp]);

  return (
    <div className={`msg-item ${isOwn ? 'msg-own' : ''}`}>
      {!isOwn && (
        <div className="msg-avatar">
          {msg.senderPhoto ? (
            <img src={msg.senderPhoto} alt={msg.senderName} />
          ) : (
            <div className="msg-avatar-placeholder">{msg.senderName.charAt(0).toUpperCase()}</div>
          )}
        </div>
      )}
      <div className="msg-bubble">
        {!isOwn && <div className="msg-sender">{msg.senderName}</div>}
        <div className="msg-text">{msg.text}</div>
        <div className="msg-footer">
          <span className="msg-time">{timeStr}</span>
          <button className={`msg-like-btn ${liked ? 'liked' : ''}`} onClick={onLike}>
            {liked ? '❤️' : '🤍'} {msg.likes.length > 0 && msg.likes.length}
          </button>
        </div>
      </div>
    </div>
  );
};
MessageItem.displayName = 'MessageItem';
const MemoizedMessageItem = MessageItem;

// ==================== MAIN PAGE ====================
export default function ComunidadPage() {
  const { user } = useAuth();
  const [communities, setCommunities] = useState<Community[]>(DEFAULT_COMMUNITIES);
  const [activeCommunity, setActiveCommunity] = useState<string>('general');
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [members, setMembers] = useState<CommunityRoomMember[]>([]);
  const [inputText, setInputText] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewCommunity, setShowNewCommunity] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to communities
  useEffect(() => {
    const unsub = subscribeToCommunities((comms) => {
      if (comms.length > 0) setCommunities(comms);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to messages
  useEffect(() => {
    const unsub = subscribeToMessages(activeCommunity, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [activeCommunity]);

  // Subscribe to members
  useEffect(() => {
    const unsub = subscribeToMembers(activeCommunity, (m) => {
      setMembers(m);
    });
    return () => unsub();
  }, [activeCommunity]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Join community on select
  const handleSelectCommunity = useCallback(async (commId: string) => {
    setActiveCommunity(commId);
    if (user) {
      await joinCommunity(commId, {
        uid: user.uid,
        displayName: user.displayName || 'Usuario',
        photoURL: user.photoURL || '',
        role: 'member',
      });
    }
  }, [user]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!user || !inputText.trim()) return;
    await sendMessage(activeCommunity, {
      text: inputText.trim(),
      senderId: user.uid,
      senderName: user.displayName || 'Usuario',
      senderPhoto: user.photoURL || '',
    });
    setInputText('');
    setShowMentions(false);
  }, [user, inputText, activeCommunity]);

  // Handle like
  const handleLike = useCallback(async (msgId: string) => {
    if (!user) return;
    await toggleLike(activeCommunity, msgId, user.uid);
  }, [user, activeCommunity]);

  // Handle mention detection
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    
    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === val.length - 1 || !val.slice(lastAt + 1).includes(' '))) {
      const filter = val.slice(lastAt + 1);
      setMentionFilter(filter);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  }, []);

  // Insert mention
  const insertMention = useCallback((name: string) => {
    const lastAt = inputText.lastIndexOf('@');
    const before = inputText.slice(0, lastAt);
    setInputText(`${before}@${name} `);
    setShowMentions(false);
    inputRef.current?.focus();
  }, [inputText]);

  // Create community
  const handleCreateCommunity = useCallback(async () => {
    if (!user || !newCommunityName.trim()) return;
    await createCommunity({
      name: newCommunityName.trim(),
      description: newCommunityDesc.trim() || 'Grupo de Prosper',
      icon: '🏘️',
      color: 'var(--color-prosper-green)',
      memberCount: 1,
      createdBy: user.uid,
    });
    setNewCommunityName('');
    setNewCommunityDesc('');
    setShowNewCommunity(false);
  }, [user, newCommunityName, newCommunityDesc]);

  const activeComm = communities.find(c => c.id === activeCommunity);
  const filteredMembers = members.filter(m =>
    m.displayName.toLowerCase().includes(mentionFilter.toLowerCase())
  ).slice(0, 5);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="community-page">
          <style jsx>{`
            .community-page {
              display: flex;
              height: calc(100vh - 140px);
              max-height: calc(100vh - 140px);
              overflow: hidden;
              gap: 16px;
            }
            /* Sidebar de grupos */
            .sidebar {
              width: 260px;
              min-width: 260px;
              background: var(--bg-card);
              border-radius: var(--radius-lg);
              border: 1px solid var(--border-default);
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .sidebar-header {
              padding: 14px 16px;
              border-bottom: 1px solid var(--border-default);
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .sidebar-title {
              font-size: 0.875rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0;
            }
            .sidebar-btn {
              width: 28px;
              height: 28px;
              border-radius: 6px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-secondary);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.875rem;
            }
            .sidebar-btn:hover {
              border-color: var(--color-prosper-green);
              color: var(--color-prosper-green);
            }
            .comm-list {
              flex: 1;
              overflow-y: auto;
              padding: 8px;
            }
            .comm-item {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 8px 10px;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.15s;
              border: none;
              background: none;
              width: 100%;
              text-align: left;
            }
            .comm-item:hover {
              background: var(--bg-card-hover);
            }
            .comm-item.active {
              background: var(--bg-accent-soft);
            }
            .comm-icon {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.75rem;
              flex-shrink: 0;
            }
            .comm-info {
              flex: 1;
              min-width: 0;
            }
            .comm-name {
              font-size: 0.75rem;
              font-weight: 600;
              color: var(--text-primary);
              margin: 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .comm-members {
              font-size: 0.625rem;
              color: var(--text-tertiary);
              margin: 0;
            }
            /* Chat Window */
            .chat-window {
              flex: 1;
              display: flex;
              flex-direction: column;
              min-width: 0;
              background: var(--bg-card);
              border-radius: var(--radius-lg);
              border: 1px solid var(--border-default);
              overflow: hidden;
            }
            .chat-header {
              padding: 12px 16px;
              border-bottom: 1px solid var(--border-default);
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .chat-header-icon {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.875rem;
            }
            .chat-header-info {
              flex: 1;
              min-width: 0;
            }
            .chat-header-name {
              font-size: 0.8125rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0;
            }
            .chat-header-desc {
              font-size: 0.625rem;
              color: var(--text-tertiary);
              margin: 0;
            }
            /* Messages */
            .messages-container {
              flex: 1;
              overflow-y: auto;
              padding: 12px;
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .msg-item {
              display: flex;
              gap: 6px;
              align-items: flex-end;
              max-width: 80%;
            }
            .msg-item.msg-own {
              align-self: flex-end;
              flex-direction: row-reverse;
            }
            .msg-avatar {
              width: 24px;
              height: 24px;
              border-radius: 50%;
              overflow: hidden;
              flex-shrink: 0;
            }
            .msg-avatar img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .msg-avatar-placeholder {
              width: 100%;
              height: 100%;
              background: var(--bg-accent-soft);
              color: var(--color-prosper-green);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.625rem;
              font-weight: 700;
            }
            .msg-bubble {
              background: var(--bg-input);
              border: 1px solid var(--border-default);
              border-radius: 10px;
              padding: 6px 10px;
              max-width: 100%;
            }
            .msg-item.msg-own .msg-bubble {
              background: var(--bg-accent-soft);
              border-color: var(--color-prosper-green);
            }
            .msg-sender {
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              margin-bottom: 2px;
            }
            .msg-text {
              font-size: 0.75rem;
              color: var(--text-primary);
              line-height: 1.4;
              word-break: break-word;
            }
            .msg-footer {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-top: 2px;
            }
            .msg-time {
              font-size: 0.5625rem;
              color: var(--text-tertiary);
            }
            .msg-like-btn {
              background: none;
              border: none;
              font-size: 0.625rem;
              cursor: pointer;
              padding: 1px 3px;
              border-radius: 3px;
              transition: background 0.15s;
            }
            .msg-like-btn:hover {
              background: var(--bg-card-hover);
            }
            .msg-like-btn.liked {
              opacity: 0.8;
            }
            /* Input */
            .chat-input-area {
              padding: 10px 12px;
              border-top: 1px solid var(--border-default);
              position: relative;
            }
            .chat-input-row {
              display: flex;
              gap: 6px;
              align-items: center;
            }
            .chat-input {
              flex: 1;
              padding: 8px 12px;
              border-radius: 16px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-primary);
              font-size: 0.75rem;
              outline: none;
            }
            .chat-input:focus {
              border-color: var(--color-prosper-green);
            }
            .chat-send-btn {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              border: none;
              background: var(--color-prosper-green);
              color: white;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.875rem;
              flex-shrink: 0;
            }
            .chat-send-btn:hover {
              opacity: 0.9;
            }
            /* Mentions */
            .mentions-dropdown {
              position: absolute;
              bottom: 100%;
              left: 12px;
              right: 12px;
              background: var(--bg-card);
              border: 1px solid var(--border-default);
              border-radius: 8px;
              padding: 4px;
              max-height: 140px;
              overflow-y: auto;
              box-shadow: var(--shadow-md);
              z-index: 10;
            }
            .mention-item {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 6px 8px;
              border-radius: 5px;
              border: none;
              background: none;
              width: 100%;
              cursor: pointer;
              font-size: 0.75rem;
              color: var(--text-primary);
            }
            .mention-item:hover {
              background: var(--bg-card-hover);
            }
            .mention-avatar {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: var(--bg-accent-soft);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.5625rem;
              color: var(--color-prosper-green);
              font-weight: 700;
              flex-shrink: 0;
            }
            /* New Community Modal */
            .new-comm-modal {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 100;
            }
            .new-comm-card {
              background: var(--bg-card);
              border-radius: var(--radius-lg);
              padding: 20px;
              width: 90%;
              max-width: 320px;
              border: 1px solid var(--border-default);
            }
            .new-comm-title {
              font-size: 0.875rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0 0 12px 0;
            }
            .new-comm-input {
              width: 100%;
              padding: 8px 12px;
              border-radius: 6px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-primary);
              font-size: 0.75rem;
              margin-bottom: 10px;
              outline: none;
            }
            .new-comm-actions {
              display: flex;
              gap: 6px;
              margin-top: 6px;
            }
            .new-comm-btn {
              flex: 1;
              padding: 8px;
              border-radius: 6px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-secondary);
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
            }
            .new-comm-btn.primary {
              background: var(--color-prosper-green);
              color: white;
              border-color: var(--color-prosper-green);
            }
            /* Empty state */
            .empty-messages {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: var(--text-tertiary);
              text-align: center;
              padding: 20px;
            }
            .empty-messages-icon {
              font-size: 2rem;
              margin-bottom: 8px;
            }
            .empty-messages-title {
              font-size: 0.8125rem;
              font-weight: 600;
              color: var(--text-secondary);
              margin: 0 0 2px 0;
            }
            .empty-messages-desc {
              font-size: 0.6875rem;
              margin: 0;
            }
            /* Mobile */
            @media (max-width: 768px) {
              .community-page {
                flex-direction: column;
                height: auto;
                max-height: none;
              }
              .sidebar {
                width: 100%;
                min-width: 100%;
                max-height: 180px;
              }
              .comm-list {
                display: flex;
                gap: 6px;
                overflow-x: auto;
                padding: 8px;
              }
              .comm-item {
                min-width: 120px;
                flex-direction: column;
                text-align: center;
                padding: 8px;
              }
              .comm-icon {
                width: 36px;
                height: 36px;
                font-size: 1rem;
              }
              .chat-window {
                height: calc(100vh - 340px);
                min-height: 300px;
              }
              .msg-item {
                max-width: 90%;
              }
            }
            @media (max-width: 480px) {
              .community-page {
                gap: 8px;
              }
              .msg-text {
                font-size: 0.6875rem;
              }
            }
          `}</style>

          {loading ? (
            <div className="empty-messages">
              <div className="loading-spinner" style={{ width: 28, height: 28, border: '3px solid var(--border-default)', borderTopColor: 'var(--color-prosper-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cargando grupos...</p>
            </div>
          ) : (
            <>
              {/* Sidebar de grupos */}
              <aside className="sidebar">
                <div className="sidebar-header">
                  <h2 className="sidebar-title">Grupos y Chats</h2>
                  <button className="sidebar-btn" onClick={() => setShowNewCommunity(true)} title="Nuevo grupo">+</button>
                </div>
                <div className="comm-list">
                  {communities.map(comm => (
                    <button
                      key={comm.id}
                      className={`comm-item ${activeCommunity === comm.id ? 'active' : ''}`}
                      onClick={() => handleSelectCommunity(comm.id)}
                    >
                      <div className="comm-icon" style={{ background: `${comm.color}20` }}>
                        {comm.icon}
                      </div>
                      <div className="comm-info">
                        <p className="comm-name">{comm.name}</p>
                        <p className="comm-members">{comm.memberCount || 0} miembros</p>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              {/* Chat Window */}
              <main className="chat-window">
                <div className="chat-header">
                  <div className="chat-header-icon" style={{ background: `${activeComm?.color}20` }}>
                    {activeComm?.icon}
                  </div>
                  <div className="chat-header-info">
                    <p className="chat-header-name">{activeComm?.name}</p>
                    <p className="chat-header-desc">{activeComm?.description}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="messages-container">
                  {messages.length === 0 ? (
                    <div className="empty-messages">
                      <div className="empty-messages-icon">💬</div>
                      <h3 className="empty-messages-title">Sé el primero en hablar</h3>
                      <p className="empty-messages-desc">Inicia la conversación en {activeComm?.name}</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <MemoizedMessageItem
                        key={msg.id}
                        msg={msg}
                        isOwn={msg.senderId === user?.uid}
                        onLike={() => handleLike(msg.id)}
                      />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-input-area">
                  {showMentions && filteredMembers.length > 0 && (
                    <div className="mentions-dropdown">
                      {filteredMembers.map(m => (
                        <button key={m.uid} className="mention-item" onClick={() => insertMention(m.displayName)}>
                          <div className="mention-avatar">{m.displayName.charAt(0).toUpperCase()}</div>
                          <span>{m.displayName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="chat-input-row">
                    <input
                      ref={inputRef}
                      className="chat-input"
                      placeholder="Escribe... usa @ para mencionar"
                      value={inputText}
                      onChange={handleInputChange}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button className="chat-send-btn" onClick={handleSend}>➤</button>
                  </div>
                </div>
              </main>

              {/* New Community Modal */}
              {showNewCommunity && (
                <div className="new-comm-modal" onClick={() => setShowNewCommunity(false)}>
                  <div className="new-comm-card" onClick={(e) => e.stopPropagation()}>
                    <h3 className="new-comm-title">Nuevo Grupo</h3>
                    <input
                      className="new-comm-input"
                      placeholder="Nombre del grupo"
                      value={newCommunityName}
                      onChange={(e) => setNewCommunityName(e.target.value)}
                    />
                    <input
                      className="new-comm-input"
                      placeholder="Descripción (opcional)"
                      value={newCommunityDesc}
                      onChange={(e) => setNewCommunityDesc(e.target.value)}
                    />
                    <div className="new-comm-actions">
                      <button className="new-comm-btn" onClick={() => setShowNewCommunity(false)}>Cancelar</button>
                      <button className="new-comm-btn primary" onClick={handleCreateCommunity}>Crear</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
