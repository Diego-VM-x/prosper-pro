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
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [pendingSent, setPendingSent] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [conversations, setConversations] = useState<(PrivateConversation & { otherUser?: UserProfile })[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateInput, setPrivateInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [otherUserOnline, setOtherUserOnline] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.uid) return;
    setUserOnline(user.uid);
    const hb = setInterval(() => setUserOnline(user.uid), 30000);
    return () => { clearInterval(hb); setUserOffline(user.uid); };
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const u = subscribeToFriends(user.uid, setFriends);
    return () => u();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const u = subscribeToFriendRequests(user.uid, setReceivedRequests);
    return () => u();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const u = subscribeToSentRequests(user.uid, setPendingSent);
    return () => u();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const u = subscribeToConversations(user.uid, setConversations);
    return () => u();
  }, [user?.uid]);

  useEffect(() => {
    if (!activeConversation || !user?.uid) return;
    const u = subscribeToPrivateMessages(activeConversation, user.uid, (msgs) => {
      setPrivateMessages(msgs);
      markMessagesAsRead(activeConversation, user.uid);
    });
    return () => u();
  }, [activeConversation, user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    const u = subscribeToTotalUnreadCount(user.uid, setUnreadCount);
    return () => u();
  }, [user?.uid]);

  useEffect(() => {
    if (!activeConversation) { setOtherUserOnline(false); return; }
    const conv = conversations.find(c => c.id === activeConversation);
    const oid = conv?.otherUser?.uid;
    if (!oid) return;
    const u = subscribeToPresence(oid, setOtherUserOnline);
    return () => u();
  }, [activeConversation, conversations]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [privateMessages]);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim() || !user?.uid) { setSearchResults([]); return; }
    const results = await searchUsers(searchTerm, user.uid);
    const fIds = new Set(friends.map(f => f.uid));
    const sIds = new Set(pendingSent.map(r => r.receiverId));
    setSearchResults(results.filter(u => !fIds.has(u.uid) && !sIds.has(u.uid) && u.uid !== user.uid));
  }, [searchTerm, user?.uid, friends, pendingSent]);

  useEffect(() => {
    const t = setTimeout(handleSearch, 300);
    return () => clearTimeout(t);
  }, [handleSearch]);

  const handleSendRequest = useCallback(async (u: UserProfile) => {
    if (!user) return;
    await sendFriendRequest(user.uid, user.displayName || 'Usuario', u.uid, u.displayName || 'Usuario');
    setSearchTerm(''); setSearchResults([]);
  }, [user]);

  const handleAccept = useCallback(async (r: any) => {
    if (!user) return;
    await acceptFriendRequest(r.id, r.senderId, user.uid);
  }, [user]);

  const handleReject = useCallback(async (id: string) => {
    await rejectFriendRequest(id);
  }, []);

  const handleRemove = useCallback(async (fid: string) => {
    if (!user) return;
    await removeFriendship(user.uid, fid);
  }, [user]);

  const startChat = useCallback(async (f: UserProfile) => {
    if (!user?.uid) return;
    const cid = await getOrCreateConversation(user.uid, f.uid);
    setActiveConversation(cid);
  }, [user?.uid]);

  const handleSend = useCallback(async () => {
    if (!user || !privateInput.trim() || !activeConversation) return;
    const conv = conversations.find(c => c.id === activeConversation);
    if (!conv) return;
    const rid = conv.participants.find(p => p !== user.uid);
    if (!rid) return;
    await sendPrivateMessage(activeConversation, user.uid, rid, privateInput.trim());
    setPrivateInput('');
  }, [user, privateInput, activeConversation, conversations]);

  const activeConv = conversations.find(c => c.id === activeConversation);
  const activeUser = activeConv?.otherUser;

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false });
  const fmtRel = (ts: number) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return 'Ahora';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  };

  if (!user) return null;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div style={{ display: 'flex', height: 'calc(100vh - 140px)', overflow: 'hidden' }}>
          <style jsx>{`
            .sidebar {
              width: 300px;
              min-width: 300px;
              background: var(--bg-input);
              display: flex;
              flex-direction: column;
              border-right: 1px solid var(--border-default);
            }
            .tabs { display: flex; border-bottom: 1px solid var(--border-default); background: var(--bg-card); flex-shrink: 0; }
            .tab { flex: 1; padding: 12px 4px; text-align: center; font-size: 0.6875rem; font-weight: 600; color: var(--text-tertiary); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; position: relative; }
            .tab:hover { color: var(--text-primary); }
            .tab.active { color: var(--color-prosper-green); border-bottom-color: var(--color-prosper-green); }
            .badge { position: absolute; top: 4px; right: 50%; margin-right: -16px; background: var(--color-prosper-green); color: white; font-size: 0.5625rem; min-width: 14px; height: 14px; line-height: 14px; text-align: center; border-radius: 7px; font-weight: 700; }
            .search-box { padding: 10px 12px; flex-shrink: 0; }
            .search-input { width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-primary); font-size: 0.75rem; outline: none; box-sizing: border-box; }
            .search-input:focus { border-color: var(--color-prosper-green); }
            .list { flex: 1; overflow-y: auto; }
            .item { padding: 10px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-default); transition: background 0.15s; }
            .item:hover { background: var(--bg-card); }
            .item.active { background: var(--bg-card-high); }
            .avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--bg-accent-soft); display: flex; align-items: center; justify-content: center; font-size: 0.875rem; font-weight: 700; color: var(--color-prosper-green); flex-shrink: 0; position: relative; overflow: hidden; }
            .avatar img { width: 100%; height: 100%; object-fit: cover; }
            .dot { position: absolute; bottom: 0; right: 0; width: 8px; height: 8px; border-radius: 50%; border: 2px solid var(--bg-input); }
            .dot.on { background: var(--color-prosper-green); }
            .dot.off { background: var(--text-tertiary); }
            .info { flex: 1; min-width: 0; }
            .name { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .sub { font-size: 0.6875rem; color: var(--text-tertiary); margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .time { font-size: 0.625rem; color: var(--text-tertiary); flex-shrink: 0; }
            .btn { padding: 5px 10px; border-radius: 6px; border: none; font-size: 0.6875rem; font-weight: 600; cursor: pointer; }
            .btn-g { background: var(--color-prosper-green); color: white; }
            .btn-s { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-default); }
            .btn-x { background: transparent; color: var(--text-tertiary); padding: 4px; border: none; cursor: pointer; font-size: 0.875rem; }
            .btn-x:hover { color: #ef4444; }
            .sec { padding: 10px 12px 6px; font-size: 0.625rem; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; }

            .chat { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--bg-card); }
            .chat-header { height: 56px; padding: 0 16px; display: flex; align-items: center; border-bottom: 1px solid var(--border-default); background: var(--bg-card); flex-shrink: 0; gap: 10px; }
            .hinfo { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
            .hname { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .hstatus { font-size: 0.625rem; color: var(--text-tertiary); margin: 0; }
            .hstatus.on { color: var(--color-prosper-green); }
            .msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
            .divider { display: flex; justify-content: center; margin: 10px 0; }
            .divider span { padding: 3px 10px; background: var(--bg-input); color: var(--text-tertiary); font-size: 0.625rem; font-weight: 600; border-radius: 10px; }
            .row { display: flex; gap: 6px; max-width: 75%; }
            .row.r { align-self: flex-start; }
            .row.s { align-self: flex-end; flex-direction: row-reverse; }
            .av-sm { width: 28px; height: 28px; border-radius: 50%; background: var(--bg-accent-soft); display: flex; align-items: center; justify-content: center; font-size: 0.6875rem; font-weight: 700; color: var(--color-prosper-green); flex-shrink: 0; overflow: hidden; }
            .av-sm img { width: 100%; height: 100%; object-fit: cover; }
            .content { display: flex; flex-direction: column; }
            .row.s .content { align-items: flex-end; }
            .bubble { padding: 8px 12px; border-radius: 14px; font-size: 0.8125rem; line-height: 1.4; word-break: break-word; }
            .bubble.r { background: var(--bg-input); color: var(--text-primary); border-bottom-left-radius: 4px; }
            .bubble.s { background: var(--color-prosper-green); color: white; border-bottom-right-radius: 4px; }
            .mt { font-size: 0.5625rem; color: var(--text-tertiary); margin-top: 2px; padding: 0 4px; }
            .input-area { padding: 10px 16px; background: var(--bg-card); border-top: 1px solid var(--border-default); flex-shrink: 0; }
            .input-wrap { display: flex; align-items: center; gap: 6px; background: var(--bg-input); border-radius: 20px; padding: 4px 4px 4px 12px; }
            .input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 0.8125rem; padding: 6px 0; outline: none; }
            .input::placeholder { color: var(--text-tertiary); }
            .send { width: 36px; height: 36px; border-radius: 50%; border: none; background: var(--color-prosper-green); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
            .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-tertiary); text-align: center; padding: 24px; }
            .empty-icon { font-size: 2.5rem; margin-bottom: 12px; opacity: 0.5; }
            .empty-title { font-size: 1rem; font-weight: 600; color: var(--text-secondary); margin: 0 0 6px; }
            .empty-desc { font-size: 0.75rem; margin: 0; max-width: 240px; }

            @media (max-width: 768px) {
              .sidebar { width: 100%; min-width: 100%; position: absolute; inset: 0; z-index: 10; }
              .sidebar.hide { display: none; }
              .chat { position: absolute; inset: 0; z-index: 20; display: none; }
              .chat.show { display: flex; }
              .row { max-width: 85%; }
            }
          `}</style>

          {/* Sidebar */}
          <div className={`sidebar ${activeConversation ? 'hide' : ''}`}>
            <div className="tabs">
              <div className={`tab ${activeTab === 'chats' ? 'active' : ''}`} onClick={() => setActiveTab('chats')}>
                💬 Chats
                {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
              </div>
              <div className={`tab ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}>
                👥 Amigos
              </div>
              <div className={`tab ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
                📨
                {receivedRequests.length > 0 && <span className="badge">{receivedRequests.length}</span>}
              </div>
            </div>

            {activeTab === 'friends' && (
              <div className="search-box">
                <input className="search-input" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            )}

            <div className="list">
              {activeTab === 'chats' && (
                <>
                  {conversations.length === 0 && (
                    <div className="empty" style={{ padding: '40px 16px' }}>
                      <div className="empty-icon">💬</div>
                      <p className="empty-title">Sin conversaciones</p>
                      <p className="empty-desc">Agrega amigos para chatear</p>
                    </div>
                  )}
                  {conversations.map(conv => (
                    <div key={conv.id} className={`item ${activeConversation === conv.id ? 'active' : ''}`} onClick={() => setActiveConversation(conv.id)}>
                      <div className="avatar">
                        {conv.otherUser?.photoURL ? <img src={conv.otherUser.photoURL} alt="" /> : conv.otherUser?.displayName?.charAt(0) || '?'}
                        <span className={`dot ${conv.otherUser ? 'on' : 'off'}`} />
                      </div>
                      <div className="info">
                        <p className="name">{conv.otherUser?.displayName || conv.otherUser?.email || 'Usuario'}</p>
                        <p className="sub">{conv.lastMessage || 'Sin mensajes'}</p>
                      </div>
                      {conv.lastMessageAt && <span className="time">{fmtRel(conv.lastMessageAt)}</span>}
                    </div>
                  ))}
                </>
              )}

              {activeTab === 'friends' && (
                <>
                  {searchTerm && searchResults.length > 0 && (
                    <>
                      <div className="sec">Resultados</div>
                      {searchResults.map(u => (
                        <div key={u.uid} className="item">
                          <div className="avatar">{u.photoURL ? <img src={u.photoURL} alt="" /> : u.displayName?.charAt(0) || '?'}</div>
                          <div className="info">
                            <p className="name">{u.displayName || 'Usuario'}</p>
                            <p className="sub">{u.email}</p>
                          </div>
                          <button className="btn btn-g" onClick={() => handleSendRequest(u)}>+</button>
                        </div>
                      ))}
                    </>
                  )}
                  {searchTerm && searchResults.length === 0 && (
                    <div className="empty" style={{ padding: '24px 16px' }}><p className="empty-desc">No encontrado</p></div>
                  )}
                  {!searchTerm && friends.length === 0 && (
                    <div className="empty" style={{ padding: '40px 16px' }}>
                      <div className="empty-icon">👥</div>
                      <p className="empty-title">Sin amigos</p>
                      <p className="empty-desc">Busca personas para agregar</p>
                    </div>
                  )}
                  {!searchTerm && friends.map(f => (
                    <div key={f.uid} className="item">
                      <div className="avatar" onClick={() => startChat(f)} style={{ cursor: 'pointer' }}>
                        {f.photoURL ? <img src={f.photoURL} alt="" /> : f.displayName?.charAt(0) || '?'}
                      </div>
                      <div className="info" onClick={() => startChat(f)} style={{ cursor: 'pointer' }}>
                        <p className="name">{f.displayName || 'Usuario'}</p>
                        <p className="sub">Toca para chatear</p>
                      </div>
                      <button className="btn-x" onClick={() => handleRemove(f.uid)}>✕</button>
                    </div>
                  ))}
                </>
              )}

              {activeTab === 'requests' && (
                <>
                  {receivedRequests.length === 0 && (
                    <div className="empty" style={{ padding: '40px 16px' }}>
                      <div className="empty-icon">📨</div>
                      <p className="empty-title">Sin solicitudes</p>
                      <p className="empty-desc">No hay solicitudes pendientes</p>
                    </div>
                  )}
                  {receivedRequests.map(r => (
                    <div key={r.id} className="item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>{r.senderName?.charAt(0) || '?'}</div>
                        <div className="info">
                          <p className="name">{r.senderName}</p>
                          <p className="sub">Quiere ser tu amigo</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-g" style={{ flex: 1 }} onClick={() => handleAccept(r)}>Aceptar</button>
                        <button className="btn btn-s" style={{ flex: 1 }} onClick={() => handleReject(r.id)}>Rechazar</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className={`chat ${activeConversation ? 'show' : ''}`}>
            {activeConversation && activeUser ? (
              <>
                <div className="chat-header">
                  <button onClick={() => setActiveConversation(null)} style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: '6px', fontSize: '1.125rem', display: 'none' }} className="back-btn">←</button>
                  <div className="hinfo">
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>
                      {activeUser.photoURL ? <img src={activeUser.photoURL} alt="" /> : activeUser.displayName?.charAt(0) || '?'}
                      <span className={`dot ${otherUserOnline ? 'on' : 'off'}`} />
                    </div>
                    <div>
                      <p className="hname">{activeUser.displayName || activeUser.email || 'Usuario'}</p>
                      <p className={`hstatus ${otherUserOnline ? 'on' : ''}`}>{otherUserOnline ? 'En línea' : 'Desconectado'}</p>
                    </div>
                  </div>
                </div>
                <div className="msgs">
                  <div className="divider"><span>Hoy</span></div>
                  {privateMessages.map(msg => {
                    const own = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id} className={`row ${own ? 's' : 'r'}`}>
                        {!own && <div className="av-sm">{activeUser.photoURL ? <img src={activeUser.photoURL} alt="" /> : activeUser.displayName?.charAt(0) || '?'}</div>}
                        <div className="content">
                          <div className={`bubble ${own ? 's' : 'r'}`}>{msg.text}</div>
                          <span className="mt">{fmtTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
                <div className="input-area">
                  <div className="input-wrap">
                    <input className="input" placeholder="Mensaje..." value={privateInput} onChange={(e) => setPrivateInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                    <button className="send" onClick={handleSend}>➤</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty">
                <div className="empty-icon">💬</div>
                <h3 className="empty-title">Selecciona una conversación</h3>
                <p className="empty-desc">Toca un amigo para chatear</p>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
