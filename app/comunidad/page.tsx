'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  searchUsers,
  getOrCreateConversation,
  subscribeToConversations,
  subscribeToPrivateMessages,
  sendPrivateMessage,
  markMessagesAsRead,
  subscribeToTotalUnreadCount,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriendship,
  subscribeToFriendRequests,
  subscribeToSentRequests,
  subscribeToFriends,
  setUserOnline,
  setUserOffline,
  subscribeToPresence,
} from '@/lib/firestore/privateMessages';
import type { UserProfile, PrivateConversation, PrivateMessage } from '@/types';

type TabType = 'chats' | 'friends' | 'requests';

export default function ComunidadPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [showChat, setShowChat] = useState(false);

  // Friends
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [pendingSent, setPendingSent] = useState<any[]>([]);

  // Requests
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);

  // Chats
  const [conversations, setConversations] = useState<(PrivateConversation & { otherUser?: UserProfile })[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateInput, setPrivateInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  // Presence
  const [otherUserOnline, setOtherUserOnline] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Presence heartbeat
  useEffect(() => {
    if (!user?.uid) return;
    setUserOnline(user.uid);
    const heartbeat = setInterval(() => setUserOnline(user.uid), 30000);
    return () => { clearInterval(heartbeat); setUserOffline(user.uid); };
  }, [user?.uid]);

  // Subscribe to friends
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToFriends(user.uid, (f) => setFriends(f));
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to received requests
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToFriendRequests(user.uid, (r) => setReceivedRequests(r));
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to sent requests
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToSentRequests(user.uid, (r) => setPendingSent(r));
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to conversations
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToConversations(user.uid, (convs) => setConversations(convs));
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to private messages
  useEffect(() => {
    if (!activeConversation || !user?.uid) return;
    const unsub = subscribeToPrivateMessages(activeConversation, user.uid, (msgs) => {
      setPrivateMessages(msgs);
      markMessagesAsRead(activeConversation, user.uid);
    });
    return () => unsub();
  }, [activeConversation, user?.uid]);

  // Subscribe to unread count
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToTotalUnreadCount(user.uid, (count) => setUnreadCount(count));
    return () => unsub();
  }, [user?.uid]);

  // Subscribe to other user presence
  useEffect(() => {
    if (!activeConversation) { setOtherUserOnline(false); return; }
    const conv = conversations.find(c => c.id === activeConversation);
    const otherUserId = conv?.otherUser?.uid;
    if (!otherUserId) return;
    const unsub = subscribeToPresence(otherUserId, (online: boolean) => setOtherUserOnline(online));
    return () => unsub();
  }, [activeConversation, conversations]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [privateMessages]);

  // Search users
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim() || !user?.uid) { setSearchResults([]); return; }
    const results = await searchUsers(searchTerm, user.uid);
    const friendIds = new Set(friends.map(f => f.uid));
    const sentIds = new Set(pendingSent.map(r => r.receiverId));
    const filtered = results.filter(u => !friendIds.has(u.uid) && !sentIds.has(u.uid) && u.uid !== user.uid);
    setSearchResults(filtered);
  }, [searchTerm, user?.uid, friends, pendingSent]);

  useEffect(() => {
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [handleSearch]);

  // Send friend request
  const handleSendRequest = useCallback(async (targetUser: UserProfile) => {
    if (!user) return;
    await sendFriendRequest(user.uid, user.displayName || 'Usuario', targetUser.uid, targetUser.displayName || 'Usuario');
    setSearchTerm('');
    setSearchResults([]);
  }, [user]);

  // Accept request
  const handleAcceptRequest = useCallback(async (request: any) => {
    if (!user) return;
    await acceptFriendRequest(request.id, request.senderId, user.uid);
  }, [user]);

  // Reject request
  const handleRejectRequest = useCallback(async (requestId: string) => {
    await rejectFriendRequest(requestId);
  }, []);

  // Remove friend
  const handleRemoveFriend = useCallback(async (friendId: string) => {
    if (!user) return;
    await removeFriendship(user.uid, friendId);
  }, [user]);

  // Start chat with friend
  const startChat = useCallback(async (friend: UserProfile) => {
    if (!user?.uid) return;
    const convId = await getOrCreateConversation(user.uid, friend.uid);
    setActiveConversation(convId);
    setShowChat(true);
  }, [user?.uid]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!user || !privateInput.trim() || !activeConversation) return;
    const conv = conversations.find(c => c.id === activeConversation);
    if (!conv) return;
    const receiverId = conv.participants.find(p => p !== user.uid);
    if (!receiverId) return;
    await sendPrivateMessage(activeConversation, user.uid, receiverId, privateInput.trim());
    setPrivateInput('');
  }, [user, privateInput, activeConversation, conversations]);

  const activeConv = conversations.find(c => c.id === activeConversation);
  const activeChatUser = activeConv?.otherUser;

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const formatRelative = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  if (!user) return null;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="community-page">
          <style jsx>{`
            .community-page {
              display: flex;
              height: calc(100vh - 140px);
              overflow: hidden;
              background: var(--bg-card);
              position: relative;
            }

            /* Sidebar */
            .sidebar {
              width: 340px;
              min-width: 340px;
              background: var(--bg-input);
              display: flex;
              flex-direction: column;
              border-right: 1px solid var(--border-default);
              transition: transform 0.2s ease;
            }

            /* Tabs */
            .tabs {
              display: flex;
              border-bottom: 1px solid var(--border-default);
              background: var(--bg-card);
            }
            .tab {
              flex: 1;
              padding: 14px 8px;
              text-align: center;
              font-size: 0.75rem;
              font-weight: 600;
              color: var(--text-tertiary);
              cursor: pointer;
              border-bottom: 2px solid transparent;
              transition: all 0.2s;
              position: relative;
            }
            .tab:hover { color: var(--text-primary); background: var(--bg-input); }
            .tab.active { color: var(--color-prosper-green); border-bottom-color: var(--color-prosper-green); }
            .tab-badge {
              position: absolute;
              top: 8px;
              right: 50%;
              margin-right: -20px;
              background: var(--color-prosper-green);
              color: white;
              font-size: 0.625rem;
              min-width: 16px;
              height: 16px;
              line-height: 16px;
              text-align: center;
              border-radius: 8px;
              font-weight: 700;
            }

            /* Search */
            .search-box { padding: 12px; }
            .search-input {
              width: 100%;
              padding: 10px 14px;
              border-radius: 10px;
              border: 1px solid var(--border-default);
              background: var(--bg-card);
              color: var(--text-primary);
              font-size: 0.8125rem;
              outline: none;
              box-sizing: border-box;
            }
            .search-input:focus { border-color: var(--color-prosper-green); box-shadow: 0 0 0 2px rgba(61,204,142,0.1); }

            /* List */
            .list { flex: 1; overflow-y: auto; }
            .list-item {
              padding: 12px 16px;
              cursor: pointer;
              transition: all 0.15s;
              display: flex;
              align-items: center;
              gap: 12px;
              border-bottom: 1px solid var(--border-default);
            }
            .list-item:hover { background: var(--bg-card); }
            .list-item.active { background: var(--bg-card-high); border-left: 3px solid var(--color-prosper-green); }
            .avatar {
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: var(--bg-accent-soft);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              flex-shrink: 0;
              position: relative;
              overflow: hidden;
            }
            .avatar img { width: 100%; height: 100%; object-fit: cover; }
            .status-dot {
              position: absolute;
              bottom: 1px;
              right: 1px;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              border: 2px solid var(--bg-input);
            }
            .status-dot.online { background: var(--color-prosper-green); }
            .status-dot.offline { background: var(--text-tertiary); }
            .item-info { flex: 1; min-width: 0; }
            .item-name { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .item-sub { font-size: 0.75rem; color: var(--text-tertiary); margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .item-time { font-size: 0.6875rem; color: var(--text-tertiary); flex-shrink: 0; }

            /* Action buttons */
            .actions { display: flex; gap: 6px; }
            .btn {
              padding: 6px 12px;
              border-radius: 6px;
              border: none;
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s;
            }
            .btn-primary { background: var(--color-prosper-green); color: white; }
            .btn-primary:hover { filter: brightness(1.1); }
            .btn-secondary { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-default); }
            .btn-danger { background: transparent; color: var(--text-tertiary); padding: 6px; }
            .btn-danger:hover { color: #ef4444; }

            /* Chat main */
            .chat-main {
              flex: 1;
              display: flex;
              flex-direction: column;
              min-width: 0;
              background: var(--bg-card);
            }
            .chat-header {
              height: 60px;
              padding: 0 16px;
              display: flex;
              align-items: center;
              border-bottom: 1px solid var(--border-default);
              background: var(--bg-card);
              flex-shrink: 0;
            }
            .back-btn {
              background: none;
              border: none;
              color: var(--text-primary);
              cursor: pointer;
              padding: 8px;
              margin-right: 8px;
              font-size: 1.25rem;
              display: none;
            }
            .chat-info { display: flex; align-items: center; gap: 12px; }
            .chat-name { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); margin: 0; }
            .chat-status { font-size: 0.6875rem; color: var(--text-tertiary); margin: 0; }
            .chat-status.online { color: var(--color-prosper-green); }

            /* Messages */
            .messages-area {
              flex: 1;
              overflow-y: auto;
              padding: 16px;
              display: flex;
              flex-direction: column;
              gap: 8px;
              background: radial-gradient(circle at center, rgba(61,204,142,0.02) 0%, transparent 70%);
            }
            .date-divider { display: flex; justify-content: center; margin: 12px 0; }
            .date-divider span {
              padding: 4px 12px;
              background: var(--bg-input);
              color: var(--text-tertiary);
              font-size: 0.6875rem;
              font-weight: 600;
              border-radius: 12px;
            }
            .msg-row { display: flex; gap: 8px; max-width: 70%; }
            .msg-row.received { align-self: flex-start; }
            .msg-row.sent { align-self: flex-end; flex-direction: row-reverse; }
            .msg-avatar-sm {
              width: 32px; height: 32px; border-radius: 50%;
              background: var(--bg-accent-soft);
              display: flex; align-items: center; justify-content: center;
              font-size: 0.75rem; font-weight: 700; color: var(--color-prosper-green);
              flex-shrink: 0; overflow: hidden;
            }
            .msg-avatar-sm img { width: 100%; height: 100%; object-fit: cover; }
            .msg-content { display: flex; flex-direction: column; }
            .msg-row.sent .msg-content { align-items: flex-end; }
            .msg-bubble {
              padding: 10px 14px;
              border-radius: 16px;
              font-size: 0.875rem;
              line-height: 1.4;
              word-break: break-word;
            }
            .msg-bubble.received { background: var(--bg-input); color: var(--text-primary); border-bottom-left-radius: 4px; }
            .msg-bubble.sent { background: var(--color-prosper-green); color: white; border-bottom-right-radius: 4px; }
            .msg-time { font-size: 0.625rem; color: var(--text-tertiary); margin-top: 2px; padding: 0 4px; }

            /* Input */
            .input-area {
              padding: 12px 16px;
              background: var(--bg-card);
              border-top: 1px solid var(--border-default);
            }
            .input-wrapper {
              display: flex;
              align-items: center;
              gap: 8px;
              background: var(--bg-input);
              border-radius: 24px;
              padding: 6px 6px 6px 16px;
            }
            .msg-input {
              flex: 1;
              background: none;
              border: none;
              color: var(--text-primary);
              font-size: 0.875rem;
              padding: 8px 0;
              outline: none;
            }
            .msg-input::placeholder { color: var(--text-tertiary); }
            .send-btn {
              width: 40px; height: 40px; border-radius: 50%; border: none;
              background: var(--color-prosper-green); color: white;
              cursor: pointer; display: flex; align-items: center; justify-content: center;
              font-size: 1.125rem;
            }
            .send-btn:hover { filter: brightness(1.1); }

            /* Empty state */
            .empty-state {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: var(--text-tertiary);
              text-align: center;
              padding: 32px;
            }
            .empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
            .empty-title { font-size: 1.125rem; font-weight: 600; color: var(--text-secondary); margin: 0 0 8px; }
            .empty-desc { font-size: 0.8125rem; margin: 0; max-width: 280px; }

            /* Section header */
            .section-header {
              padding: 12px 16px 8px;
              font-size: 0.6875rem;
              font-weight: 700;
              color: var(--text-tertiary);
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }

            /* Mobile */
            @media (max-width: 768px) {
              .sidebar {
                width: 100%;
                min-width: 100%;
                position: absolute;
                inset: 0;
                z-index: 1;
              }
              .sidebar.hidden { transform: translateX(-100%); pointer-events: none; }
              .chat-main {
                width: 100%;
                height: 100%;
                position: absolute;
                inset: 0;
                z-index: 2;
                transform: translateX(100%);
                transition: transform 0.2s ease;
              }
              .chat-main.visible { transform: translateX(0); }
              .chat-header {
                position: sticky;
                top: 0;
                z-index: 10;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              .back-btn { display: block; }
              .msg-row { max-width: 85%; }
            }
            @media (max-width: 480px) {
              .tab { font-size: 0.6875rem; padding: 12px 4px; }
              .msg-bubble { font-size: 0.8125rem; padding: 8px 12px; }
            }
          `}</style>

          {/* Sidebar */}
          <aside className={`sidebar ${showChat ? 'hidden' : ''}`}>
            {/* Tabs */}
            <div className="tabs">
              <div className={`tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
                💬 Chats
                {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
              </div>
              <div className={`tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
                👥 Amigos
              </div>
              <div className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
                📨
                {receivedRequests.length > 0 && <span className="tab-badge">{receivedRequests.length}</span>}
              </div>
            </div>

            {/* Search (friends tab) */}
            {activeTab === 'friends' && (
              <div className="search-box">
                <input
                  className="search-input"
                  placeholder="Buscar personas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}

            {/* List */}
            <div className="list">
              {/* CHATS */}
              {activeTab === 'chats' && (
                <>
                  {conversations.length === 0 && (
                    <div className="empty-state" style={{ padding: '48px 24px' }}>
                      <div className="empty-icon">💬</div>
                      <p className="empty-title">Sin conversaciones</p>
                      <p className="empty-desc">Agrega amigos para empezar a chatear</p>
                    </div>
                  )}
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      className={`list-item ${activeConversation === conv.id ? 'active' : ''}`}
                      onClick={() => { setActiveConversation(conv.id); setShowChat(true); }}
                    >
                      <div className="avatar">
                        {conv.otherUser?.photoURL ? (
                          <img src={conv.otherUser.photoURL} alt="" />
                        ) : (
                          conv.otherUser?.displayName?.charAt(0) || '?'
                        )}
                        <span className={`status-dot ${conv.otherUser ? 'online' : 'offline'}`} />
                      </div>
                      <div className="item-info">
                        <p className="item-name">{conv.otherUser?.displayName || conv.otherUser?.email || 'Usuario'}</p>
                        <p className="item-sub">{conv.lastMessage || 'Sin mensajes aún'}</p>
                      </div>
                      {conv.lastMessageAt && <span className="item-time">{formatRelative(conv.lastMessageAt)}</span>}
                    </div>
                  ))}
                </>
              )}

              {/* FRIENDS */}
              {activeTab === 'friends' && (
                <>
                  {/* Search results */}
                  {searchTerm && searchResults.length > 0 && (
                    <>
                      <div className="section-header">Resultados</div>
                      {searchResults.map(u => (
                        <div key={u.uid} className="list-item">
                          <div className="avatar">
                            {u.photoURL ? <img src={u.photoURL} alt="" /> : u.displayName?.charAt(0) || '?'}
                          </div>
                          <div className="item-info">
                            <p className="item-name">{u.displayName || 'Usuario'}</p>
                            <p className="item-sub">{u.email}</p>
                          </div>
                          <button className="btn btn-primary" onClick={() => handleSendRequest(u)}>Agregar</button>
                        </div>
                      ))}
                    </>
                  )}
                  {searchTerm && searchResults.length === 0 && (
                    <div className="empty-state" style={{ padding: '32px 16px' }}>
                      <p className="empty-desc">No se encontraron usuarios</p>
                    </div>
                  )}

                  {/* Friends list */}
                  {!searchTerm && (
                    <>
                      {friends.length === 0 && (
                        <div className="empty-state" style={{ padding: '48px 24px' }}>
                          <div className="empty-icon">👥</div>
                          <p className="empty-title">Sin amigos aún</p>
                          <p className="empty-desc">Busca personas para agregar como amigos</p>
                        </div>
                      )}
                      {friends.map(f => (
                        <div key={f.uid} className="list-item">
                          <div className="avatar" onClick={() => startChat(f)} style={{ cursor: 'pointer' }}>
                            {f.photoURL ? <img src={f.photoURL} alt="" /> : f.displayName?.charAt(0) || '?'}
                          </div>
                          <div className="item-info" onClick={() => startChat(f)} style={{ cursor: 'pointer' }}>
                            <p className="item-name">{f.displayName || 'Usuario'}</p>
                            <p className="item-sub">Toca para chatear</p>
                          </div>
                          <button className="btn btn-danger" onClick={() => handleRemoveFriend(f.uid)}>✕</button>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* REQUESTS */}
              {activeTab === 'requests' && (
                <>
                  {receivedRequests.length === 0 && (
                    <div className="empty-state" style={{ padding: '48px 24px' }}>
                      <div className="empty-icon">📨</div>
                      <p className="empty-title">Sin solicitudes</p>
                      <p className="empty-desc">No tienes solicitudes de amistad pendientes</p>
                    </div>
                  )}
                  {receivedRequests.map(r => (
                    <div key={r.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.875rem' }}>
                          {r.senderName?.charAt(0) || '?'}
                        </div>
                        <div className="item-info">
                          <p className="item-name">{r.senderName}</p>
                          <p className="item-sub">Quiere ser tu amigo</p>
                        </div>
                      </div>
                      <div className="actions">
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => handleAcceptRequest(r)}>Aceptar</button>
                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => handleRejectRequest(r.id)}>Rechazar</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </aside>

          {/* Chat */}
          <main className={`chat-main ${showChat ? 'visible' : ''}`}>
            {activeConversation && activeChatUser ? (
              <>
                <div className="chat-header">
                  <button onClick={() => { setShowChat(false); setActiveConversation(null); }} className="back-btn">←</button>
                  <div className="chat-info">
                    <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.875rem' }}>
                      {activeChatUser.photoURL ? (
                        <img src={activeChatUser.photoURL} alt="" />
                      ) : (
                        activeChatUser.displayName?.charAt(0) || '?'
                      )}
                      <span className={`status-dot ${otherUserOnline ? 'online' : 'offline'}`} />
                    </div>
                    <div>
                      <p className="chat-name">{activeChatUser.displayName || activeChatUser.email || 'Usuario'}</p>
                      <p className={`chat-status ${otherUserOnline ? 'online' : ''}`}>
                        {otherUserOnline ? 'En línea' : 'Desconectado'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="messages-area">
                  <div className="date-divider"><span>Hoy</span></div>
                  {privateMessages.map(msg => {
                    const isOwn = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id} className={`msg-row ${isOwn ? 'sent' : 'received'}`}>
                        {!isOwn && (
                          <div className="msg-avatar-sm">
                            {activeChatUser.photoURL ? (
                              <img src={activeChatUser.photoURL} alt="" />
                            ) : (
                              activeChatUser.displayName?.charAt(0) || '?'
                            )}
                          </div>
                        )}
                        <div className="msg-content">
                          <div className={`msg-bubble ${isOwn ? 'sent' : 'received'}`}>{msg.text}</div>
                          <span className="msg-time">{formatTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div className="input-area">
                  <div className="input-wrapper">
                    <input
                      className="msg-input"
                      placeholder="Escribe un mensaje..."
                      value={privateInput}
                      onChange={(e) => setPrivateInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button className="send-btn" onClick={handleSend}>➤</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">💬</div>
                <h3 className="empty-title">Selecciona una conversación</h3>
                <p className="empty-desc">Toca un amigo para comenzar a chatear</p>
              </div>
            )}
          </main>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
