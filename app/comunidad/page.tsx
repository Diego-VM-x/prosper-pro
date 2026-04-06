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

type TabType = 'messages' | 'channels' | 'contacts';

export default function ComunidadPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('messages');
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        <div className="comunidad-container" style={{ display: 'flex', height: 'calc(100vh - 140px)', overflow: 'hidden', background: '#0e1511' }}>
          <style jsx>{`
            /* Sidebar navigation */
            .nav-sidebar {
              width: 64px;
              min-width: 64px;
              background: #161d19;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 24px 0;
              gap: 8px;
              border-right: 1px solid rgba(60,74,66,0.1);
            }
            .nav-item {
              width: 48px;
              height: 48px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s;
              color: #91c4a8;
              opacity: 0.7;
              font-size: 1.25rem;
            }
            .nav-item:hover { background: #1a211d; opacity: 1; }
            .nav-item.active { background: rgba(78,222,163,0.1); color: #4edea3; opacity: 1; }
            .nav-badge {
              position: absolute;
              top: 4px;
              right: 4px;
              background: #4edea3;
              color: #003824;
              font-size: 0.5625rem;
              min-width: 14px;
              height: 14px;
              line-height: 14px;
              text-align: center;
              border-radius: 7px;
              font-weight: 700;
            }

            /* Conversation list */
            .conv-list {
              width: 320px;
              min-width: 320px;
              background: #161d19;
              display: flex;
              flex-direction: column;
              border-right: 1px solid rgba(60,74,66,0.05);
            }
            .conv-header { padding: 24px; }
            .conv-title { font-size: 1.25rem; font-weight: 700; color: #dde4dd; margin: 0 0 16px; }
            .search-wrap { position: relative; }
            .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #bbcabf; font-size: 0.875rem; }
            .search-input {
              width: 100%;
              padding: 10px 12px 10px 36px;
              border-radius: 8px;
              border: none;
              background: #1a211d;
              color: #dde4dd;
              font-size: 0.8125rem;
              outline: none;
              box-sizing: border-box;
            }
            .search-input:focus { box-shadow: 0 0 0 1px #4edea3; }
            .conv-scroll { flex: 1; overflow-y: auto; padding: 8px 16px; }
            .conv-item {
              padding: 12px;
              border-radius: 12px;
              cursor: pointer;
              margin-bottom: 8px;
              transition: all 0.15s;
            }
            .conv-item:hover { background: #1a211d; }
            .conv-item.active { background: #242c27; }
            .conv-row { display: flex; align-items: center; gap: 12px; }
            .conv-avatar { position: relative; flex-shrink: 0; }
            .conv-avatar img, .conv-avatar .initials {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              object-fit: cover;
            }
            .conv-avatar .initials {
              background: #1a211d;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1rem;
              font-weight: 700;
              color: #4edea3;
            }
            .status-dot {
              position: absolute;
              bottom: 0;
              right: 0;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              border: 2px solid #1a211d;
            }
            .status-dot.on { background: #4edea3; }
            .status-dot.off { background: #3c4a42; }
            .conv-info { flex: 1; min-width: 0; }
            .conv-top { display: flex; justify-content: space-between; align-items: flex-start; }
            .conv-name { font-size: 0.875rem; font-weight: 700; color: #dde4dd; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .conv-time { font-size: 0.625rem; color: #bbcabf; flex-shrink: 0; }
            .conv-msg { font-size: 0.75rem; color: #4edea3; margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
            .conv-msg.muted { color: #bbcabf; font-weight: 400; }

            /* Chat area */
            .chat-area {
              flex: 1;
              display: flex;
              flex-direction: column;
              min-width: 0;
              background: #0e1511;
              position: relative;
            }
            .chat-header {
              height: 80px;
              padding: 0 32px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid rgba(60,74,66,0.05);
              background: rgba(14,21,17,0.8);
              backdrop-filter: blur(20px);
              flex-shrink: 0;
            }
            .chat-header-left { display: flex; align-items: center; gap: 16px; }
            .chat-avatar { position: relative; }
            .chat-avatar img, .chat-avatar .initials {
              width: 40px;
              height: 40px;
              border-radius: 50%;
              object-fit: cover;
            }
            .chat-avatar .initials {
              background: #1a211d;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.875rem;
              font-weight: 700;
              color: #4edea3;
            }
            .chat-avatar .status-dot { width: 10px; height: 10px; border-color: #0e1511; }
            .chat-name { font-size: 1rem; font-weight: 700; color: #dde4dd; margin: 0; }
            .chat-status { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
            .chat-status span { font-size: 0.625rem; color: #bbcabf; font-weight: 500; }
            .chat-status .encrypted { color: #4edea3; }
            .chat-actions { display: flex; gap: 8px; }
            .chat-action-btn {
              width: 40px;
              height: 40px;
              border-radius: 8px;
              border: none;
              background: transparent;
              color: #bbcabf;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.125rem;
              transition: all 0.15s;
            }
            .chat-action-btn:hover { background: #242c27; color: #dde4dd; }

            /* Messages */
            .msgs {
              flex: 1;
              overflow-y: auto;
              padding: 32px;
              display: flex;
              flex-direction: column;
              gap: 24px;
              background: radial-gradient(circle at center, rgba(16,185,129,0.03) 0%, transparent 70%);
            }
            .date-divider { display: flex; justify-content: center; }
            .date-divider span {
              padding: 4px 12px;
              background: #242c27;
              color: #bbcabf;
              font-size: 0.625rem;
              font-weight: 700;
              border-radius: 9999px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .msg-row { display: flex; gap: 12px; max-width: 70%; }
            .msg-row.received { align-self: flex-start; }
            .msg-row.sent { align-self: flex-end; flex-direction: row-reverse; }
            .msg-avatar-sm {
              width: 32px;
              height: 32px;
              border-radius: 50%;
              object-fit: cover;
              flex-shrink: 0;
            }
            .msg-content { display: flex; flex-direction: column; gap: 4px; }
            .msg-row.sent .msg-content { align-items: flex-end; }
            .msg-bubble {
              padding: 16px;
              border-radius: 16px;
              font-size: 0.875rem;
              line-height: 1.6;
              word-break: break-word;
            }
            .msg-bubble.received { background: #242c27; color: #dde4dd; border-bottom-left-radius: 4px; }
            .msg-bubble.sent { background: #10b981; color: #003824; border-bottom-right-radius: 4px; box-shadow: 0 4px 16px rgba(78,222,163,0.1); }
            .msg-time { font-size: 0.625rem; color: #bbcabf; padding: 0 4px; }
            .msg-check { font-size: 0.75rem; color: #4edea3; }

            /* Input */
            .input-area { padding: 24px 32px; background: #0e1511; }
            .input-wrap {
              max-width: 800px;
              margin: 0 auto;
              display: flex;
              align-items: center;
              gap: 8px;
              background: #1a211d;
              border-radius: 16px;
              padding: 8px 8px 8px 16px;
            }
            .input-wrap:focus-within { box-shadow: 0 0 0 1px #4edea3; }
            .attach-btn, .emoji-btn {
              width: 40px;
              height: 40px;
              border-radius: 8px;
              border: none;
              background: transparent;
              color: #bbcabf;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.125rem;
              transition: color 0.15s;
            }
            .attach-btn:hover, .emoji-btn:hover { color: #4edea3; }
            .msg-input {
              flex: 1;
              background: transparent;
              border: none;
              color: #dde4dd;
              font-size: 0.875rem;
              padding: 8px;
              outline: none;
            }
            .msg-input::placeholder { color: rgba(187,202,191,0.5); }
            .send-btn {
              width: 40px;
              height: 40px;
              border-radius: 12px;
              border: none;
              background: #4edea3;
              color: #003824;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.125rem;
              transition: all 0.15s;
              box-shadow: 0 4px 12px rgba(78,222,163,0.2);
            }
            .send-btn:hover { filter: brightness(1.1); }
            .send-btn:active { transform: scale(0.95); }
            .input-hint { text-align: center; font-size: 0.625rem; color: rgba(187,202,191,0.4); margin-top: 16px; font-weight: 500; }

            /* Empty state */
            .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #bbcabf; text-align: center; padding: 32px; }
            .empty-icon { font-size: 3rem; margin-bottom: 16px; opacity: 0.5; }
            .empty-title { font-size: 1.125rem; font-weight: 600; color: #dde4dd; margin: 0 0 8px; }
            .empty-desc { font-size: 0.75rem; margin: 0; max-width: 240px; }

            /* Contacts list */
            .contact-item {
              padding: 12px;
              border-radius: 12px;
              cursor: pointer;
              margin-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 12px;
              transition: background 0.15s;
            }
            .contact-item:hover { background: #1a211d; }
            .contact-info { flex: 1; min-width: 0; }
            .contact-name { font-size: 0.875rem; font-weight: 600; color: #dde4dd; margin: 0; }
            .contact-email { font-size: 0.6875rem; color: #bbcabf; margin: 2px 0 0; }
            .btn-add {
              padding: 6px 12px;
              border-radius: 6px;
              border: none;
              background: #4edea3;
              color: #003824;
              font-size: 0.6875rem;
              font-weight: 600;
              cursor: pointer;
            }
            .btn-add:hover { filter: brightness(1.1); }

            /* Requests */
            .request-item {
              padding: 12px;
              border-radius: 12px;
              margin-bottom: 8px;
              display: flex;
              flex-direction: column;
              gap: 10px;
              background: #1a211d;
            }
            .request-top { display: flex; align-items: center; gap: 12px; }
            .request-actions { display: flex; gap: 8px; }
            .btn-accept { flex: 1; padding: 8px; border-radius: 8px; border: none; background: #4edea3; color: #003824; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
            .btn-reject { flex: 1; padding: 8px; border-radius: 8px; border: 1px solid #3c4a42; background: transparent; color: #bbcabf; font-size: 0.75rem; font-weight: 600; cursor: pointer; }

            /* Mobile menu button */
            .mobile-menu-btn { display: none; }
            .mobile-overlay { display: none; }
            .comunidad-container { position: relative; }
            @media (max-width: 768px) {
              .comunidad-container {
                height: calc(100dvh - 64px) !important;
                height: -webkit-fill-available;
              }
              .mobile-menu-btn { display: flex !important; }
              .mobile-overlay {
                display: none;
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.5);
                z-index: 40;
              }
              .mobile-overlay.show { display: block; }
              .nav-sidebar {
                position: fixed;
                left: 0;
                top: 0;
                bottom: 0;
                z-index: 50;
                transform: translateX(-100%);
                transition: transform 0.2s ease;
              }
              .nav-sidebar.mobile-open { transform: translateX(0); }
              .conv-list { width: 100%; min-width: 100%; position: absolute; inset: 0; z-index: 10; }
              .conv-list.hide { display: none; }
              .chat-area { position: absolute; inset: 0; z-index: 20; display: none; }
              .chat-area.show { display: flex; }
              .msgs { padding: 16px; }
              .input-area { padding: 12px 16px; }
              .chat-header { padding: 0 16px; height: 60px; }
              .chat-back-btn { display: block !important; }
              .msg-row { max-width: 85%; }
              .conv-header { padding: 16px; }
              .conv-title { font-size: 1rem; }
            }
            @media (max-width: 480px) {
              .comunidad-container {
                height: calc(100dvh - 56px) !important;
              }
              .nav-sidebar { width: 56px; min-width: 56px; }
              .nav-item { width: 40px; height: 40px; font-size: 1rem; }
              .conv-header { padding: 12px; }
              .conv-title { font-size: 0.875rem; margin-bottom: 12px; }
              .search-input { padding: 8px 10px 8px 32px; font-size: 0.75rem; }
              .conv-item { padding: 10px; }
              .conv-avatar img, .conv-avatar .initials { width: 40px; height: 40px; }
              .conv-name { font-size: 0.8125rem; }
              .conv-msg { font-size: 0.6875rem; }
              .chat-header { padding: 0 12px; height: 56px; }
              .chat-avatar img, .chat-avatar .initials { width: 32px; height: 32px; }
              .chat-name { font-size: 0.875rem; }
              .msg-bubble { padding: 12px; font-size: 0.8125rem; }
              .input-area { padding: 8px 12px; }
              .input-wrap { padding: 6px 6px 6px 12px; }
              .msg-input { font-size: 0.8125rem; padding: 6px; }
              .attach-btn, .emoji-btn, .send-btn { width: 36px; height: 36px; }
            }
          `}</style>

          {/* Mobile overlay */}
          <div className={`mobile-overlay ${mobileMenuOpen ? 'show' : ''}`} onClick={() => setMobileMenuOpen(false)} />

          {/* Mobile menu button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              zIndex: 30,
              width: 40,
              height: 40,
              borderRadius: 8,
              border: 'none',
              background: '#1a211d',
              color: '#dde4dd',
              cursor: 'pointer',
              fontSize: '1.25rem',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>

          {/* Navigation sidebar */}
          <div className={`nav-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
            <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => { setActiveTab('messages'); setMobileMenuOpen(false); }} style={{ position: 'relative' }}>
              💬
              {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
            </div>
            <div className={`nav-item ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => { setActiveTab('channels'); setMobileMenuOpen(false); }}>
              📢
            </div>
            <div className={`nav-item ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => { setActiveTab('contacts'); setMobileMenuOpen(false); }}>
              👥
            </div>
          </div>

          {/* Conversation list */}
          <div className={`conv-list ${activeConversation ? 'hide' : ''}`}>
            <div className="conv-header">
              <h2 className="conv-title">
                {activeTab === 'messages' ? 'Mensajes' : activeTab === 'channels' ? 'Canales' : 'Contactos'}
              </h2>
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  className="search-input"
                  placeholder={activeTab === 'contacts' ? 'Buscar personas...' : 'Buscar conversaciones...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="conv-scroll">
              {/* Messages tab */}
              {activeTab === 'messages' && (
                <>
                  {conversations.length === 0 && (
                    <div className="empty" style={{ padding: '40px 16px' }}>
                      <div className="empty-icon">💬</div>
                      <p className="empty-title">Sin conversaciones</p>
                      <p className="empty-desc">Agrega contactos para empezar</p>
                    </div>
                  )}
                  {conversations.map(conv => (
                    <div key={conv.id} className={`conv-item ${activeConversation === conv.id ? 'active' : ''}`} onClick={() => setActiveConversation(conv.id)}>
                      <div className="conv-row">
                        <div className="conv-avatar">
                          {conv.otherUser?.photoURL ? (
                            <img src={conv.otherUser.photoURL} alt="" />
                          ) : (
                            <div className="initials">{conv.otherUser?.displayName?.charAt(0) || '?'}</div>
                          )}
                          <span className={`status-dot ${conv.otherUser ? 'on' : 'off'}`} />
                        </div>
                        <div className="conv-info">
                          <div className="conv-top">
                            <p className="conv-name">{conv.otherUser?.displayName || conv.otherUser?.email || 'Usuario'}</p>
                            {conv.lastMessageAt && <span className="conv-time">{fmtRel(conv.lastMessageAt)}</span>}
                          </div>
                          <p className={`conv-msg ${!conv.lastMessage ? 'muted' : ''}`}>{conv.lastMessage || 'Sin mensajes aún'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {/* Channels tab */}
              {activeTab === 'channels' && (
                <div className="empty" style={{ padding: '40px 16px' }}>
                  <div className="empty-icon">📢</div>
                  <p className="empty-title">Próximamente</p>
                  <p className="empty-desc">Los canales estarán disponibles pronto</p>
                </div>
              )}

              {/* Contacts tab */}
              {activeTab === 'contacts' && (
                <>
                  {searchTerm && searchResults.length > 0 && (
                    <>
                      <p style={{ fontSize: '0.625rem', fontWeight: 700, color: '#bbcabf', textTransform: 'uppercase', padding: '8px 12px 4px', letterSpacing: '0.05em' }}>Resultados</p>
                      {searchResults.map(u => (
                        <div key={u.uid} className="contact-item">
                          <div className="conv-avatar" style={{ width: 40, height: 40 }}>
                            {u.photoURL ? <img src={u.photoURL} alt="" style={{ width: 40, height: 40 }} /> : <div className="initials" style={{ width: 40, height: 40, fontSize: '0.875rem' }}>{u.displayName?.charAt(0) || '?'}</div>}
                          </div>
                          <div className="contact-info">
                            <p className="contact-name">{u.displayName || 'Usuario'}</p>
                            <p className="contact-email">{u.email}</p>
                          </div>
                          <button className="btn-add" onClick={() => handleSendRequest(u)}>Agregar</button>
                        </div>
                      ))}
                    </>
                  )}
                  {searchTerm && searchResults.length === 0 && (
                    <div className="empty" style={{ padding: '24px 16px' }}><p className="empty-desc">No se encontraron usuarios</p></div>
                  )}
                  {!searchTerm && friends.length === 0 && (
                    <div className="empty" style={{ padding: '40px 16px' }}>
                      <div className="empty-icon">👥</div>
                      <p className="empty-title">Sin contactos</p>
                      <p className="empty-desc">Busca personas para agregar</p>
                    </div>
                  )}
                  {!searchTerm && friends.map(f => (
                    <div key={f.uid} className="contact-item">
                      <div className="conv-avatar" style={{ width: 40, height: 40, cursor: 'pointer' }} onClick={() => startChat(f)}>
                        {f.photoURL ? <img src={f.photoURL} alt="" style={{ width: 40, height: 40 }} /> : <div className="initials" style={{ width: 40, height: 40, fontSize: '0.875rem' }}>{f.displayName?.charAt(0) || '?'}</div>}
                      </div>
                      <div className="contact-info" onClick={() => startChat(f)} style={{ cursor: 'pointer' }}>
                        <p className="contact-name">{f.displayName || 'Usuario'}</p>
                        <p className="contact-email">Toca para chatear</p>
                      </div>
                      <button style={{ background: 'transparent', border: 'none', color: '#bbcabf', cursor: 'pointer', fontSize: '0.875rem', padding: '4px' }} onClick={() => handleRemove(f.uid)}>✕</button>
                    </div>
                  ))}
                </>
              )}

              {/* Requests */}
              {receivedRequests.length > 0 && (
                <>
                  <p style={{ fontSize: '0.625rem', fontWeight: 700, color: '#bbcabf', textTransform: 'uppercase', padding: '16px 12px 8px', letterSpacing: '0.05em' }}>Solicitudes</p>
                  {receivedRequests.map(r => (
                    <div key={r.id} className="request-item">
                      <div className="request-top">
                        <div className="conv-avatar" style={{ width: 36, height: 36 }}>
                          <div className="initials" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>{r.senderName?.charAt(0) || '?'}</div>
                        </div>
                        <div className="contact-info">
                          <p className="contact-name">{r.senderName}</p>
                          <p className="contact-email">Quiere ser tu amigo</p>
                        </div>
                      </div>
                      <div className="request-actions">
                        <button className="btn-accept" onClick={() => handleAccept(r)}>Aceptar</button>
                        <button className="btn-reject" onClick={() => handleReject(r.id)}>Rechazar</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className={`chat-area ${activeConversation ? 'show' : ''}`}>
            {activeConversation && activeUser ? (
              <>
                <div className="chat-header">
                  <button
                    onClick={() => setActiveConversation(null)}
                    style={{
                      display: 'none',
                      background: 'none',
                      border: 'none',
                      color: '#dde4dd',
                      cursor: 'pointer',
                      padding: '8px',
                      marginRight: '8px',
                      fontSize: '1.25rem',
                    }}
                    className="chat-back-btn"
                  >
                    ←
                  </button>
                  <div className="chat-header-left">
                    <div className="chat-avatar">
                      {activeUser.photoURL ? (
                        <img src={activeUser.photoURL} alt="" />
                      ) : (
                        <div className="initials">{activeUser.displayName?.charAt(0) || '?'}</div>
                      )}
                      <span className={`status-dot ${otherUserOnline ? 'on' : 'off'}`} />
                    </div>
                    <div>
                      <p className="chat-name">{activeUser.displayName || activeUser.email || 'Usuario'}</p>
                      <div className="chat-status">
                        <span className="encrypted">🔒</span>
                        <span>{otherUserOnline ? 'En línea' : 'Desconectado'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="chat-actions">
                    <button className="chat-action-btn">📞</button>
                    <button className="chat-action-btn">📹</button>
                    <button className="chat-action-btn">⋮</button>
                  </div>
                </div>

                <div className="msgs">
                  <div className="date-divider"><span>Hoy</span></div>
                  {privateMessages.map(msg => {
                    const own = msg.senderId === user?.uid;
                    return (
                      <div key={msg.id} className={`msg-row ${own ? 'sent' : 'received'}`}>
                        {!own && (
                          <div className="conv-avatar" style={{ width: 32, height: 32 }}>
                            {activeUser.photoURL ? (
                              <img src={activeUser.photoURL} alt="" style={{ width: 32, height: 32 }} />
                            ) : (
                              <div className="initials" style={{ width: 32, height: 32, fontSize: '0.6875rem' }}>{activeUser.displayName?.charAt(0) || '?'}</div>
                            )}
                          </div>
                        )}
                        <div className="msg-content">
                          <div className={`msg-bubble ${own ? 'sent' : 'received'}`}>{msg.text}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="msg-time">{fmtTime(msg.timestamp)}</span>
                            {own && <span className="msg-check">✓✓</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>

                <div className="input-area">
                  <div className="input-wrap">
                    <button className="attach-btn" title="Adjuntar">📎</button>
                    <input className="msg-input" placeholder="Escribe un mensaje..." value={privateInput} onChange={(e) => setPrivateInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                    <button className="emoji-btn" title="Emoji">😊</button>
                    <button className="send-btn" onClick={handleSend}>➤</button>
                  </div>
                  <p className="input-hint">Al enviar un mensaje, aceptas las normas de la comunidad de Prosper.</p>
                </div>
              </>
            ) : (
              <div className="empty">
                <div className="empty-icon">💬</div>
                <h3 className="empty-title">Selecciona una conversación</h3>
                <p className="empty-desc">Toca un contacto para comenzar a chatear</p>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
