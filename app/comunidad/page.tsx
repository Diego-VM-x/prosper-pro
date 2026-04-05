'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  subscribeToCommunities,
  subscribeToMessages,
  sendMessage,
  toggleLike,
  joinCommunity,
  createCommunity,
} from '@/lib/firestore/communityMessages';
import {
  searchUsers,
  getOrCreateConversation,
  subscribeToConversations,
  subscribeToPrivateMessages,
  sendPrivateMessage,
  markMessagesAsRead,
  subscribeToTotalUnreadCount,
} from '@/lib/firestore/privateMessages';
import type { Community, CommunityMessage, UserProfile, PrivateConversation, PrivateMessage } from '@/types';

const DEFAULT_COMMUNITIES: Community[] = [
  { id: 'general', name: 'General', description: 'Conversación abierta', icon: '💬', color: 'var(--color-prosper-green)', memberCount: 0, createdBy: 'system', createdAt: 0 },
  { id: 'ahorro', name: 'Ahorro', description: 'Tips para ahorrar mejor', icon: '💰', color: 'var(--color-prosper-navy)', memberCount: 0, createdBy: 'system', createdAt: 1 },
  { id: 'inversion', name: 'Inversión', description: 'Inversiones para todos', icon: '📈', color: '#F59E0B', memberCount: 0, createdBy: 'system', createdAt: 2 },
  { id: 'educacion', name: 'Educación', description: 'Aprende finanzas', icon: '📚', color: '#3B82F6', memberCount: 0, createdBy: 'system', createdAt: 3 },
];

type ChatType = 'public' | 'private';

export default function ComunidadPage() {
  const { user } = useAuth();
  const [chatType, setChatType] = useState<ChatType>('private');
  const [showChat, setShowChat] = useState(false);

  // Public channels
  const [communities, setCommunities] = useState<Community[]>(DEFAULT_COMMUNITIES);
  const [activeCommunity, setActiveCommunity] = useState<string>('general');
  const [publicMessages, setPublicMessages] = useState<CommunityMessage[]>([]);
  const [publicInput, setPublicInput] = useState('');

  // Private chats
  const [conversations, setConversations] = useState<(PrivateConversation & { otherUser?: UserProfile })[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateInput, setPrivateInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // UI
  const [loading, setLoading] = useState(true);
  const [showNewCommunity, setShowNewCommunity] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Subscribe to communities
  useEffect(() => {
    const unsub = subscribeToCommunities((comms) => {
      if (comms.length > 0) setCommunities(comms);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to public messages
  useEffect(() => {
    if (chatType !== 'public') return;
    const unsub = subscribeToMessages(activeCommunity, (msgs) => {
      setPublicMessages(msgs);
    });
    return () => unsub();
  }, [activeCommunity, chatType]);

  // Subscribe to conversations
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToConversations(user.uid, (convs) => {
      setConversations(convs);
    });
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to private messages
  useEffect(() => {
    if (!activeConversation || chatType !== 'private') return;
    const unsub = subscribeToPrivateMessages(activeConversation, (msgs) => {
      setPrivateMessages(msgs);
      if (user?.uid) markMessagesAsRead(activeConversation, user.uid);
    });
    return () => unsub();
  }, [activeConversation, chatType, user?.uid]);

  // Subscribe to total unread count
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToTotalUnreadCount(user.uid, (count) => {
      setUnreadCount(count);
    });
    return () => unsub();
  }, [user?.uid]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [publicMessages, privateMessages]);

  // Search users
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim() || !user?.uid) { setSearchResults([]); return; }
    const results = await searchUsers(searchTerm, user.uid);
    setSearchResults(results);
  }, [searchTerm, user?.uid]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  // Start private chat
  const startPrivateChat = useCallback(async (otherUser: UserProfile) => {
    if (!user?.uid) return;
    const convId = await getOrCreateConversation(user.uid, otherUser.uid);
    setActiveConversation(convId);
    setChatType('private');
    setShowChat(true);
    setSearchTerm('');
    setSearchResults([]);
  }, [user?.uid]);

  // Send public message
  const handlePublicSend = useCallback(async () => {
    if (!user || !publicInput.trim()) return;
    await sendMessage(activeCommunity, {
      text: publicInput.trim(),
      senderId: user.uid,
      senderName: user.displayName || 'Usuario',
      senderPhoto: user.photoURL || '',
    });
    setPublicInput('');
  }, [user, publicInput, activeCommunity]);

  // Send private message
  const handlePrivateSend = useCallback(async () => {
    if (!user || !privateInput.trim() || !activeConversation) return;
    const conv = conversations.find(c => c.id === activeConversation);
    if (!conv) return;
    const receiverId = conv.participants.find(p => p !== user.uid);
    if (!receiverId) return;
    try {
      await sendPrivateMessage(activeConversation, user.uid, receiverId, privateInput.trim());
      setPrivateInput('');
    } catch (e) {
      console.error('Error sending private message:', e);
    }
  }, [user, privateInput, activeConversation, conversations]);

  // Handle public like
  const handlePublicLike = useCallback(async (msgId: string) => {
    if (!user) return;
    await toggleLike(activeCommunity, msgId, user.uid);
  }, [user, activeCommunity]);

  // Join community
  const handleSelectCommunity = useCallback(async (commId: string) => {
    setActiveCommunity(commId);
    setChatType('public');
    setShowChat(true);
    if (user) {
      await joinCommunity(commId, {
        uid: user.uid,
        displayName: user.displayName || 'Usuario',
        photoURL: user.photoURL || '',
        role: 'member',
      });
    }
  }, [user]);

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
  const activeConv = conversations.find(c => c.id === activeConversation);
  const activeChatUser = activeConv?.otherUser;

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const filteredConversations = searchTerm
    ? conversations.filter(c =>
        c.otherUser?.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.otherUser?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : conversations;

  const handleBack = () => {
    setShowChat(false);
    setActiveConversation(null);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 140px)' }}>
            <div className="loading-spinner" style={{ width: 32, height: 32, border: '3px solid var(--border-default)', borderTopColor: 'var(--color-prosper-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="chats-page">
          <style jsx>{`
            .chats-page {
              display: flex;
              height: calc(100vh - 140px);
              max-height: calc(100vh - 140px);
              overflow: hidden;
              background: var(--bg-card);
              position: relative;
            }

            /* Conversation List */
            .conv-list {
              width: 320px;
              min-width: 320px;
              background: var(--bg-input);
              display: flex;
              flex-direction: column;
              border-right: 1px solid var(--border-default);
              transition: transform 0.2s ease;
            }
            .conv-list-header {
              padding: 16px;
              border-bottom: 1px solid var(--border-default);
            }
            .conv-list-title {
              font-size: 1.125rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0;
            }
            .conv-search { position: relative; }
            .conv-search-icon {
              position: absolute;
              left: 12px;
              top: 50%;
              transform: translateY(-50%);
              color: var(--text-tertiary);
              font-size: 0.875rem;
            }
            .conv-search-input {
              width: 100%;
              padding: 8px 12px 8px 32px;
              border-radius: 8px;
              border: none;
              background: var(--bg-card);
              color: var(--text-primary);
              font-size: 0.75rem;
              outline: none;
            }
            .conv-search-input:focus { box-shadow: 0 0 0 1px var(--color-prosper-green); }
            .conv-list-body { flex: 1; overflow-y: auto; padding: 8px; }
            .conv-item {
              padding: 10px 12px;
              border-radius: 8px;
              cursor: pointer;
              transition: all 0.15s;
              margin-bottom: 2px;
            }
            .conv-item:hover { background: var(--bg-card); }
            .conv-item.active { background: var(--bg-card-high); }
            .conv-item-row { display: flex; align-items: center; gap: 10px; }
            .conv-avatar { position: relative; flex-shrink: 0; }
            .conv-avatar-img {
              width: 42px;
              height: 42px;
              border-radius: 50%;
              background: var(--bg-accent-soft);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.875rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              overflow: hidden;
            }
            .conv-avatar-img img { width: 100%; height: 100%; object-fit: cover; }
            .conv-status-dot {
              position: absolute;
              bottom: 0;
              right: 0;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              border: 2px solid var(--bg-input);
            }
            .conv-status-dot.online { background: var(--color-prosper-green); }
            .conv-status-dot.offline { background: var(--text-tertiary); }
            .conv-info { flex: 1; min-width: 0; }
            .conv-info-header { display: flex; justify-content: space-between; align-items: flex-start; }
            .conv-name { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .conv-time { font-size: 0.625rem; color: var(--text-tertiary); flex-shrink: 0; }
            .conv-last-msg { font-size: 0.6875rem; color: var(--text-secondary); margin: 2px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .conv-item.active .conv-last-msg { color: var(--color-prosper-green); font-weight: 600; }

            /* Main Chat Window */
            .chat-main {
              flex: 1;
              display: flex;
              flex-direction: column;
              min-width: 0;
              background: var(--bg-card);
            }
            .chat-header {
              height: 56px;
              padding: 0 16px;
              display: flex;
              align-items: center;
              border-bottom: 1px solid var(--border-default);
              background: var(--bg-card);
              flex-shrink: 0;
            }
            .chat-header-left { display: flex; align-items: center; gap: 10px; }
            .mobile-back-btn {
              background: none;
              border: none;
              color: var(--text-primary);
              cursor: pointer;
              padding: 4px;
              margin-right: 8px;
              font-size: 1.25rem;
              display: none;
            }
            .chat-header-avatar { position: relative; }
            .chat-header-avatar-img {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: var(--bg-accent-soft);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              overflow: hidden;
            }
            .chat-header-avatar-img img { width: 100%; height: 100%; object-fit: cover; }
            .chat-header-status { position: absolute; bottom: 0; right: 0; width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--bg-card); }
            .chat-header-status.online { background: var(--color-prosper-green); }
            .chat-header-name { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0; }
            .chat-header-status-text { font-size: 0.625rem; color: var(--text-tertiary); margin: 0; }

            /* Messages Area */
            .messages-area {
              flex: 1;
              overflow-y: auto;
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 8px;
              background: radial-gradient(circle at center, rgba(61,204,142,0.03) 0%, transparent 70%);
              min-height: 0;
            }
            .msg-timestamp { display: flex; justify-content: center; margin: 8px 0; }
            .msg-timestamp span { padding: 4px 10px; background: var(--bg-input); color: var(--text-tertiary); font-size: 0.5625rem; font-weight: 700; border-radius: 9999px; }
            .msg-row { display: flex; gap: 8px; max-width: 65%; }
            .msg-row.received { align-items: flex-end; align-self: flex-start; }
            .msg-row.sent { align-self: flex-end; flex-direction: column; align-items: flex-end; }
            .msg-avatar-small { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-accent-soft); display: flex; align-items: center; justify-content: center; font-size: 0.5625rem; font-weight: 700; color: var(--color-prosper-green); flex-shrink: 0; overflow: hidden; }
            .msg-avatar-small img { width: 100%; height: 100%; object-fit: cover; }
            .msg-bubble { padding: 8px 12px; border-radius: 12px; font-size: 0.8125rem; line-height: 1.4; word-break: break-word; }
            .msg-bubble.received { background: var(--bg-input); color: var(--text-primary); border-bottom-left-radius: 4px; }
            .msg-bubble.sent { background: var(--color-prosper-green); color: white; border-bottom-right-radius: 4px; }
            .msg-meta { display: flex; align-items: center; gap: 4px; margin-top: 2px; }
            .msg-meta.sent { justify-content: flex-end; }
            .msg-time { font-size: 0.5625rem; color: var(--text-tertiary); }
            .msg-check { font-size: 0.625rem; color: rgba(255,255,255,0.7); }

            /* Message Input */
            .msg-input-area { padding: 10px 16px; background: var(--bg-card); border-top: 1px solid var(--border-default); flex-shrink: 0; }
            .msg-input-wrapper { display: flex; align-items: center; gap: 6px; background: var(--bg-input); border-radius: 24px; padding: 4px 4px 4px 12px; }
            .msg-input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 0.8125rem; padding: 6px 0; outline: none; }
            .msg-input::placeholder { color: var(--text-tertiary); }
            .msg-send-btn { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--color-prosper-green); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
            .msg-send-btn:hover { filter: brightness(1.1); }
            .msg-send-btn:active { transform: scale(0.95); }

            /* Empty State */
            .empty-chat { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-tertiary); text-align: center; padding: 24px; }
            .empty-chat-icon { font-size: 3rem; margin-bottom: 12px; opacity: 0.4; }
            .empty-chat-title { font-size: 1rem; font-weight: 700; color: var(--text-secondary); margin: 0 0 4px 0; }
            .empty-chat-desc { font-size: 0.75rem; margin: 0; }

            /* Modal */
            .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
            .modal-card { background: var(--bg-card); border-radius: 12px; padding: 20px; width: 90%; max-width: 340px; border: 1px solid var(--border-default); }
            .modal-title { font-size: 0.9375rem; font-weight: 800; color: var(--text-primary); margin: 0 0 12px 0; }
            .modal-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.75rem; margin-bottom: 10px; outline: none; }
            .modal-actions { display: flex; gap: 6px; }
            .modal-btn { flex: 1; padding: 8px; border-radius: 8px; border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; cursor: pointer; }
            .modal-btn.primary { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }

            /* Mobile - WhatsApp style */
            @media (max-width: 768px) {
              .conv-list {
                width: 100%;
                min-width: 100%;
                position: absolute;
                inset: 0;
                z-index: 1;
                transition: transform 0.2s ease;
              }
              .conv-list.hidden {
                transform: translateX(-100%);
                pointer-events: none;
              }
              .chat-main {
                width: 100%;
                position: absolute;
                inset: 0;
                z-index: 2;
                transform: translateX(100%);
                transition: transform 0.2s ease;
              }
              .chat-main.visible {
                transform: translateX(0);
              }
              .mobile-back-btn {
                display: block !important;
              }
              .msg-row { max-width: 80%; }
            }
            @media (max-width: 480px) {
              .msg-bubble { font-size: 0.75rem; padding: 6px 10px; }
              .conv-name { font-size: 0.75rem; }
              .conv-last-msg { font-size: 0.625rem; }
            }
          `}</style>

          {/* Conversation List */}
          <aside className={`conv-list ${showChat ? 'hidden' : ''}`}>
            <div className="conv-list-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="conv-list-title">
                  {chatType === 'private' ? 'Mensajes' : 'Canales'}
                </h2>
                <button
                  onClick={() => setChatType(chatType === 'private' ? 'public' : 'private')}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 8,
                    padding: '6px 12px',
                    color: 'var(--text-primary)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  {chatType === 'private' ? 'Canales' : 'Mensajes'}
                </button>
              </div>
              <div className="conv-search" style={{ marginTop: 12 }}>
                <span className="conv-search-icon">🔍</span>
                <input
                  className="conv-search-input"
                  placeholder={chatType === 'private' ? 'Buscar usuarios...' : 'Buscar canales...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="conv-list-body">
              {chatType === 'private' ? (
                <>
                  {searchTerm && searchResults.length > 0 ? (
                    searchResults.map(u => (
                      <div key={u.uid} className="conv-item" onClick={() => startPrivateChat(u)}>
                        <div className="conv-item-row">
                          <div className="conv-avatar">
                            <div className="conv-avatar-img">{u.displayName?.charAt(0) || u.email?.charAt(0) || '?'}</div>
                          </div>
                          <div className="conv-info">
                            <p className="conv-name">{u.displayName || 'Usuario'}</p>
                            <p className="conv-last-msg">{u.email}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : searchTerm && searchResults.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                      No se encontraron usuarios
                    </div>
                  ) : (
                    <>
                      {filteredConversations.map(conv => (
                        <div key={conv.id} className={`conv-item ${activeConversation === conv.id ? 'active' : ''}`} onClick={() => { setActiveConversation(conv.id); setChatType('private'); setShowChat(true); }}>
                          <div className="conv-item-row">
                            <div className="conv-avatar">
                              <div className="conv-avatar-img">
                                {conv.otherUser?.photoURL ? (
                                  <img src={conv.otherUser.photoURL} alt={conv.otherUser.displayName || ''} />
                                ) : (
                                  conv.otherUser?.displayName?.charAt(0) || conv.otherUser?.email?.charAt(0) || '?'
                                )}
                              </div>
                              <span className={`conv-status-dot ${conv.otherUser ? 'online' : 'offline'}`} />
                            </div>
                            <div className="conv-info">
                              <div className="conv-info-header">
                                <p className="conv-name">{conv.otherUser?.displayName || conv.otherUser?.email || 'Usuario'}</p>
                                <span className="conv-time">{conv.lastMessageAt ? formatTime(conv.lastMessageAt) : ''}</span>
                              </div>
                              <p className="conv-last-msg">{conv.lastMessage || 'Sin mensajes'}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredConversations.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                          Busca un usuario para chatear
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  {communities.map(comm => (
                    <div key={comm.id} className={`conv-item ${activeCommunity === comm.id ? 'active' : ''}`} onClick={() => handleSelectCommunity(comm.id)}>
                      <div className="conv-item-row">
                        <div className="conv-avatar">
                          <div className="conv-avatar-img" style={{ background: `${comm.color}20` }}>{comm.icon}</div>
                        </div>
                        <div className="conv-info">
                          <p className="conv-name">{comm.name}</p>
                          <p className="conv-last-msg">{comm.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="conv-item" onClick={() => setShowNewCommunity(true)} style={{ textAlign: 'center', color: 'var(--color-prosper-green)', fontWeight: 600 }}>
                    + Nuevo Canal
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Main Chat Window */}
          <main className={`chat-main ${showChat ? 'visible' : ''}`}>
            {chatType === 'private' && activeConversation ? (
              <>
                <div className="chat-header">
                  <button onClick={handleBack} className="mobile-back-btn">←</button>
                  <div className="chat-header-left">
                    <div className="chat-header-avatar">
                      <div className="chat-header-avatar-img">
                        {activeChatUser?.photoURL ? (
                          <img src={activeChatUser.photoURL} alt={activeChatUser.displayName || ''} />
                        ) : (
                          activeChatUser?.displayName?.charAt(0) || '?'
                        )}
                      </div>
                      <span className="chat-header-status online" />
                    </div>
                    <div>
                      <p className="chat-header-name">{activeChatUser?.displayName || activeChatUser?.email || 'Usuario'}</p>
                      <p className="chat-header-status-text">En línea</p>
                    </div>
                  </div>
                </div>

                <div className="messages-area">
                  <div className="msg-timestamp"><span>Hoy</span></div>
                  {privateMessages.map(msg => {
                    const isOwn = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id} className={`msg-row ${isOwn ? 'sent' : 'received'}`}>
                        {!isOwn && activeChatUser && (
                          <div className="msg-avatar-small">
                            {activeChatUser.photoURL ? (
                              <img src={activeChatUser.photoURL} alt="" />
                            ) : (
                              activeChatUser.displayName?.charAt(0) || '?'
                            )}
                          </div>
                        )}
                        <div>
                          <div className={`msg-bubble ${isOwn ? 'sent' : 'received'}`}>{msg.text}</div>
                          <div className={`msg-meta ${isOwn ? 'sent' : ''}`}>
                            <span className="msg-time">{formatTime(msg.timestamp)}</span>
                            {isOwn && <span className="msg-check">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div className="msg-input-area">
                  <div className="msg-input-wrapper">
                    <input className="msg-input" placeholder="Escribe un mensaje..." value={privateInput} onChange={(e) => setPrivateInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePrivateSend()} />
                    <button className="msg-send-btn" onClick={handlePrivateSend}><span style={{ fontSize: '1rem' }}>➤</span></button>
                  </div>
                </div>
              </>
            ) : chatType === 'public' ? (
              <>
                <div className="chat-header">
                  <button onClick={handleBack} className="mobile-back-btn">←</button>
                  <div className="chat-header-left">
                    <div className="chat-header-avatar">
                      <div className="chat-header-avatar-img" style={{ background: `${activeComm?.color}20` }}>{activeComm?.icon}</div>
                    </div>
                    <div>
                      <p className="chat-header-name">{activeComm?.name}</p>
                      <p className="chat-header-status-text">{activeComm?.description}</p>
                    </div>
                  </div>
                </div>

                <div className="messages-area">
                  <div className="msg-timestamp"><span>Hoy</span></div>
                  {publicMessages.map(msg => {
                    const isOwn = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id} className={`msg-row ${isOwn ? 'sent' : 'received'}`}>
                        {!isOwn && (
                          <div className="msg-avatar-small">
                            {msg.senderPhoto ? (
                              <img src={msg.senderPhoto} alt="" />
                            ) : (
                              msg.senderName.charAt(0)
                            )}
                          </div>
                        )}
                        <div>
                          <div className={`msg-bubble ${isOwn ? 'sent' : 'received'}`}>
                            {!isOwn && <div style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--color-prosper-green)', marginBottom: 2 }}>{msg.senderName}</div>}
                            {msg.text}
                          </div>
                          <div className={`msg-meta ${isOwn ? 'sent' : ''}`}>
                            <span className="msg-time">{formatTime(msg.timestamp)}</span>
                            {isOwn && <span className="msg-check">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div className="msg-input-area">
                  <div className="msg-input-wrapper">
                    <input className="msg-input" placeholder="Escribe un mensaje en el canal..." value={publicInput} onChange={(e) => setPublicInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePublicSend()} />
                    <button className="msg-send-btn" onClick={handlePublicSend}><span style={{ fontSize: '1rem' }}>➤</span></button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-chat">
                <div className="empty-chat-icon">💬</div>
                <h3 className="empty-chat-title">Selecciona una conversación</h3>
                <p className="empty-chat-desc">Toca un usuario o canal para comenzar a chatear</p>
              </div>
            )}
          </main>

          {/* New Community Modal */}
          {showNewCommunity && (
            <div className="modal-overlay" onClick={() => setShowNewCommunity(false)}>
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <h3 className="modal-title">Nuevo Canal</h3>
                <input className="modal-input" placeholder="Nombre del canal" value={newCommunityName} onChange={(e) => setNewCommunityName(e.target.value)} />
                <input className="modal-input" placeholder="Descripción (opcional)" value={newCommunityDesc} onChange={(e) => setNewCommunityDesc(e.target.value)} />
                <div className="modal-actions">
                  <button className="modal-btn" onClick={() => setShowNewCommunity(false)}>Cancelar</button>
                  <button className="modal-btn primary" onClick={handleCreateCommunity}>Crear</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
