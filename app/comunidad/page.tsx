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

  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [pendingSent, setPendingSent] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [conversations, setConversations] = useState<(PrivateConversation & { otherUser?: UserProfile })[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
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
    setShowChat(true);
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
        <div style={{ display: 'flex', height: 'calc(100vh - 140px)', overflow: 'hidden', background: 'var(--bg-card)', position: 'relative' }}>
          <style jsx>{`
            .sidebar { width: 340px; min-width: 340px; background: var(--bg-input); display: flex; flex-direction: column; border-right: 1px solid var(--border-default); }
            .tabs { display: flex; border-bottom: 1px solid var(--border-default); background: var(--bg-card); }
            .tab { flex: 1; padding: 14px 8px; text-align: center; font-size: 0.75rem; font-weight: 600; color: var(--text-tertiary); cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; position: relative; }
            .tab:hover { color: var(--text-primary); background: var(--bg-input); }
            .tab.active { color: var(--color-prosper-green); border-bottom-color: var(--color-prosper-green); }
            .badge { position: absolute; top: 6px; right: 50%; margin-right: -18px; background: var(--color-prosper-green); color: white; font-size: 0.625rem; min-width: 16px; height: 16px; line-height: 16px; text-align: center; border-radius: 8px; font-weight: 700; }
            .search-box { padding: 12px; }
            .search-input { width: 100%; padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-primary); font-size: 0.8125rem; outline: none; box-sizing: border-box; }
            .search-input:focus { border-color: var(--color-prosper-green); }
            .list { flex: 1; overflow-y: auto; }
            .item { padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-default); transition: background 0.15s; }
            .item:hover { background: var(--bg-card); }
            .item.active { background: var(--bg-card-high); border-left: 3px solid var(--color-prosper-green); }
            .avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--bg-accent-soft); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; color: var(--color-prosper-green); flex-shrink: 0; position: relative; overflow: hidden; }
            .avatar img { width: 100%; height: 100%; object-fit: cover; }
            .dot { position: absolute; bottom: 1px; right: 1px; width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--bg-input); }
            .dot.on { background: var(--color-prosper-green); }
            .dot.off { background: var(--text-tertiary); }
            .info { flex: 1; min-width: 0; }
            .name { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .sub { font-size: 0.75rem; color: var(--text-tertiary); margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .time { font-size: 0.6875rem; color: var(--text-tertiary); flex-shrink: 0; }
            .btn { padding: 6px 12px; border-radius: 6px; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
            .btn-g { background: var(--color-prosper-green); color: white; }
            .btn-g:hover { filter: brightness(1.1); }
            .btn-s { background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-default); }
            .btn-x { background: transparent; color: var(--text-tertiary); padding: 6px; border: none; cursor: pointer; font-size: 1rem; }
            .btn-x:hover { color: #ef4444; }
            .chat { flex: 1; display: flex; flex-direction: column; min-width: 0; background: var(--bg-card); }
            .header { height: 60px; padding: 0 16px; display: flex; align-items: center; border-bottom: 1px solid var(--border-default); background: var(--bg-card); flex-shrink: 0; }
            .back { background: none; border: none; color: var(--text-primary); cursor: pointer; padding: 8px; margin-right: 8px; font-size: 1.25rem; display: none; }
            .hinfo { display: flex; align-items: center; gap: 12px; }
            .hname { font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); margin: 0; }
            .hstatus { font-size: 0.6875rem; color: var(--text-tertiary); margin: 0; }
            .hstatus.on { color: var(--color-prosper-green); }
            .msgs { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
            .divider { display: flex; justify-content: center; margin: 12px 0; }
            .divider span { padding: 4px 12px; background: var(--bg-input); color: var(--text-tertiary); font-size: 0.6875rem; font-weight: 600; border-radius: 12px; }
            .row { display: flex; gap: 8px; max-width: 70%; }
            .row.r { align-self: flex-start; }
            .row.s { align-self: flex-end; flex-direction: row-reverse; }
            .av-sm { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-accent-soft); display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: var(--color-prosper-green); flex-shrink: 0; overflow: hidden; }
            .av-sm img { width: 100%; height: 100%; object-fit: cover; }
            .content { display: flex; flex-direction: column; }
            .row.s .content { align-items: flex-end; }
            .bubble { padding: 10px 14px; border-radius: 16px; font-size: 0.875rem; line-height: 1.4; word-break: break-word; }
            .bubble.r { background: var(--bg-input); color: var(--text-primary); border-bottom-left-radius: 4px; }
            .bubble.s { background: var(--color-prosper-green); color: white; border-bottom-right-radius: 4px; }
            .mt { font-size: 0.625rem; color: var(--text-tertiary); margin-top: 2px; padding: 0 4px; }
            .input-area { padding: 12px 16px; background: var(--bg-card); border-top: 1px solid var(--border-default); }
            .input-wrap { display: flex; align-items: center; gap: 8px; background: var(--bg-input); border-radius: 24px; padding: 6px 6px 6px 16px; }
            .input { flex: 1; background: none; border: none; color: var(--text-primary); font-size: 0.875rem; padding: 8px 0; outline: none; }
            .input::placeholder { color: var(--text-tertiary); }
            .send { width: 40px; height: 40px; border-radius: 50%; border: none; background: var(--color-prosper-green); color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.125rem; }
            .send:hover { filter: brightness(1.1); }
            .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-tertiary); text-align: center; padding: 32px; }
            .empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
            .empty-title { font-size: 1.125rem; font-weight: 600; color: var(--text-secondary); margin: 0 0 8px; }
            .empty-desc { font-size: 0.8125rem; margin: 0; max-width: 280px; }
            .sec { padding: 12px 16px 8px; font-size: 0.6875rem; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.05em; }
            @media (max-width: 768px) {
              .sidebar { width: 100%; min-width: 100%; position: absolute; inset: 0; z-index: 1; }
              .sidebar.hide { transform: translateX(-100%); pointer-events: none; }
              .chat { width: 100%; height: 100%; position: absolute; inset: 0; z-index: 2; transform: translateX(100%); transition: transform 0.2s ease; }
              .chat.show { transform: translateX(0); }
              .header { position: sticky; top: 0; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
              .back { display: block; }
              .row { max-width: 85%; }
            }
          `}</style>

          {/* Sidebar */}
          <div className={`sidebar ${showChat ? 'hide' : ''}`}>
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
                <input className="search-input" placeholder="Buscar personas..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            )}

            <div className="list">
              {activeTab === 'chats' && (
                <>
                  {conversations.length === 0 && (
                    <div className="empty" style={{ padding: '48px 24px' }}>
                      <div className="empty-icon">💬</div>
                      <p className="empty-title">Sin conversaciones</p>
                      <p className="empty-desc">Agrega amigos para empezar a chatear</p>
                    </div>
                  )}
                  {conversations.map(conv => (
                    <div key={conv.id} className={`item ${activeConversation === conv.id ? 'active' : ''}`} onClick={() => { setActiveConversation(conv.id); setShowChat(true); }}>
                      <div className="avatar">
                        {conv.otherUser?.photoURL ? <img src={conv.otherUser.photoURL} alt="" /> : conv.otherUser?.displayName?.charAt(0) || '?'}
                        <span className={`dot ${conv.otherUser ? 'on' : 'off'}`} />
                      </div>
                      <div className="info">
                        <p className="name">{conv.otherUser?.displayName || conv.otherUser?.email || 'Usuario'}</p>
                        <p className="sub">{conv.lastMessage || 'Sin mensajes aún'}</p>
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
                          <button className="btn btn-g" onClick={() => handleSendRequest(u)}>Agregar</button>
                        </div>
                      ))}
                    </>
                  )}
                  {searchTerm && searchResults.length === 0 && (
                    <div className="empty" style={{ padding: '32px 16px' }}><p className="empty-desc">No se encontraron usuarios</p></div>
                  )}
                  {!searchTerm && friends.length === 0 && (
                    <div className="empty" style={{ padding: '48px 24px' }}>
                      <div className="empty-icon">👥</div>
                      <p className="empty-title">Sin amigos aún</p>
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
                    <div className="empty" style={{ padding: '48px 24px' }}>
                      <div className="empty-icon">📨</div>
                      <p className="empty-title">Sin solicitudes</p>
                      <p className="empty-desc">No tienes solicitudes pendientes</p>
                    </div>
                  )}
                  {receivedRequests.map(r => (
                    <div key={r.id} className="item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.875rem' }}>{r.senderName?.charAt(0) || '?'}</div>
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
          <div className={`chat ${showChat ? 'show' : ''}`}>
            {activeConversation && activeUser ? (
              <>
                <div className="header">
                  <button onClick={() => { setShowChat(false); setActiveConversation(null); }} className="back">←</button>
                  <div className="hinfo">
                    <div className="avatar" style={{ width: 40, height: 40, fontSize: '0.875rem' }}>
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
                    <input className="input" placeholder="Escribe un mensaje..." value={privateInput} onChange={(e) => setPrivateInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                    <button className="send" onClick={handleSend}>➤</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty">
                <div className="empty-icon">💬</div>
                <h3 className="empty-title">Selecciona una conversación</h3>
                <p className="empty-desc">Toca un amigo para comenzar a chatear</p>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
