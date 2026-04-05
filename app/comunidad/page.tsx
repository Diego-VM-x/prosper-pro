'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
import {
  searchUsers,
  subscribeToAllUsers,
  getOrCreateConversation,
  subscribeToConversations,
  subscribeToPrivateMessages,
  sendPrivateMessage,
  markMessagesAsRead,
  subscribeToTotalUnreadCount,
} from '@/lib/firestore/privateMessages';
import type { Community, CommunityMessage, CommunityRoomMember, UserProfile, PrivateConversation, PrivateMessage } from '@/types';

const DEFAULT_COMMUNITIES: Community[] = [
  { id: 'general', name: 'General', description: 'Conversación abierta', icon: '💬', color: 'var(--color-prosper-green)', memberCount: 0, createdBy: 'system', createdAt: 0 },
  { id: 'ahorro', name: 'Ahorro', description: 'Tips para ahorrar mejor', icon: '💰', color: 'var(--color-prosper-navy)', memberCount: 0, createdBy: 'system', createdAt: 1 },
  { id: 'inversion', name: 'Inversión', description: 'Inversiones para todos', icon: '📈', color: '#F59E0B', memberCount: 0, createdBy: 'system', createdAt: 2 },
  { id: 'educacion', name: 'Educación', description: 'Aprende finanzas', icon: '📚', color: '#3B82F6', memberCount: 0, createdBy: 'system', createdAt: 3 },
];

type TabType = 'public' | 'private';

export default function ComunidadPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('public');

  // Public channels
  const [communities, setCommunities] = useState<Community[]>(DEFAULT_COMMUNITIES);
  const [activeCommunity, setActiveCommunity] = useState<string>('general');
  const [publicMessages, setPublicMessages] = useState<CommunityMessage[]>([]);
  const [members, setMembers] = useState<CommunityRoomMember[]>([]);
  const [publicInput, setPublicInput] = useState('');

  // Private chats
  const [conversations, setConversations] = useState<(PrivateConversation & { otherUser?: UserProfile })[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [privateInput, setPrivateInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // UI
  const [loading, setLoading] = useState(true);
  const [showNewCommunity, setShowNewCommunity] = useState(false);
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDesc, setNewCommunityDesc] = useState('');

  const publicEndRef = useRef<HTMLDivElement>(null);
  const privateEndRef = useRef<HTMLDivElement>(null);

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
    const unsub = subscribeToMessages(activeCommunity, (msgs) => {
      setPublicMessages(msgs);
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

  // Subscribe to all users
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeToAllUsers(user.uid, (users) => {
      setAllUsers(users);
    });
    return () => unsub();
  }, [user?.uid]);

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
    if (!activeConversation) return;
    const unsub = subscribeToPrivateMessages(activeConversation, (msgs) => {
      setPrivateMessages(msgs);
      // Mark as read
      if (user?.uid) {
        markMessagesAsRead(activeConversation, user.uid);
      }
    });
    return () => unsub();
  }, [activeConversation, user?.uid]);

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
    publicEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [publicMessages]);

  useEffect(() => {
    privateEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [privateMessages]);

  // Search users
  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    if (!user?.uid) return;
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
    setShowSearch(false);
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

    await sendPrivateMessage(activeConversation, user.uid, receiverId, privateInput.trim());
    setPrivateInput('');
  }, [user, privateInput, activeConversation, conversations]);

  // Handle public like
  const handlePublicLike = useCallback(async (msgId: string) => {
    if (!user) return;
    await toggleLike(activeCommunity, msgId, user.uid);
  }, [user, activeCommunity]);

  // Join community
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

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="comunidad-page">
          <style jsx>{`
            .comunidad-page {
              display: flex;
              flex-direction: column;
              height: calc(100vh - 140px);
              max-height: calc(100vh - 140px);
              overflow: hidden;
            }

            /* Tabs */
            .tabs {
              display: flex;
              gap: 0;
              padding: 0 16px;
              border-bottom: 1px solid var(--border-default);
              flex-shrink: 0;
            }
            .tab-btn {
              padding: 12px 24px;
              background: none;
              border: none;
              border-bottom: 2px solid transparent;
              color: var(--text-secondary);
              font-size: 0.875rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .tab-btn:hover {
              color: var(--text-primary);
            }
            .tab-btn.active {
              color: var(--color-prosper-green);
              border-bottom-color: var(--color-prosper-green);
            }
            .tab-badge {
              background: var(--color-prosper-green);
              color: white;
              font-size: 0.625rem;
              font-weight: 700;
              padding: 1px 6px;
              border-radius: 9999px;
            }

            /* Main layout */
            .main-layout {
              display: flex;
              flex: 1;
              overflow: hidden;
            }

            /* Sidebar */
            .sidebar {
              width: 260px;
              min-width: 260px;
              background: var(--bg-card);
              border-right: 1px solid var(--border-default);
              display: flex;
              flex-direction: column;
              overflow: hidden;
            }
            .sidebar-header {
              padding: 12px 16px;
              border-bottom: 1px solid var(--border-default);
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .sidebar-title {
              font-size: 0.8125rem;
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
            .comm-desc {
              font-size: 0.625rem;
              color: var(--text-tertiary);
              margin: 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .comm-unread {
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              background: rgba(61,204,142,0.1);
              padding: 1px 6px;
              border-radius: 9999px;
            }

            /* Search */
            .search-box {
              padding: 8px;
              border-bottom: 1px solid var(--border-default);
            }
            .search-input {
              width: 100%;
              padding: 8px 12px;
              border-radius: 8px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-primary);
              font-size: 0.75rem;
              outline: none;
            }
            .search-input:focus {
              border-color: var(--color-prosper-green);
            }
            .search-results {
              max-height: 200px;
              overflow-y: auto;
              padding: 4px;
            }
            .search-result-item {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 8px;
              border-radius: 6px;
              cursor: pointer;
              transition: background 0.15s;
              border: none;
              background: none;
              width: 100%;
              text-align: left;
            }
            .search-result-item:hover {
              background: var(--bg-card-hover);
            }
            .search-avatar {
              width: 28px;
              height: 28px;
              border-radius: 50%;
              background: var(--bg-accent-soft);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              flex-shrink: 0;
            }
            .search-name {
              font-size: 0.75rem;
              font-weight: 600;
              color: var(--text-primary);
              margin: 0;
            }
            .search-email {
              font-size: 0.625rem;
              color: var(--text-tertiary);
              margin: 0;
            }

            /* Chat window */
            .chat-window {
              flex: 1;
              display: flex;
              flex-direction: column;
              min-width: 0;
              background: var(--bg-card);
              overflow: hidden;
            }
            .chat-header {
              padding: 12px 16px;
              border-bottom: 1px solid var(--border-default);
              display: flex;
              align-items: center;
              gap: 10px;
              flex-shrink: 0;
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
            }
            .msg-like-btn:hover {
              background: var(--bg-card-hover);
            }

            /* Input */
            .chat-input-area {
              padding: 10px 12px;
              border-top: 1px solid var(--border-default);
              flex-shrink: 0;
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

            /* Empty state */
            .empty-state {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: var(--text-tertiary);
              text-align: center;
              padding: 20px;
            }
            .empty-state-icon {
              font-size: 2rem;
              margin-bottom: 8px;
            }
            .empty-state-title {
              font-size: 0.8125rem;
              font-weight: 600;
              color: var(--text-secondary);
              margin: 0 0 2px 0;
            }
            .empty-state-desc {
              font-size: 0.6875rem;
              margin: 0;
            }

            /* New Community Modal */
            .modal-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 100;
            }
            .modal-card {
              background: var(--bg-card);
              border-radius: 12px;
              padding: 20px;
              width: 90%;
              max-width: 320px;
              border: 1px solid var(--border-default);
            }
            .modal-title {
              font-size: 0.875rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0 0 12px 0;
            }
            .modal-input {
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
            .modal-actions {
              display: flex;
              gap: 6px;
              margin-top: 6px;
            }
            .modal-btn {
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
            .modal-btn.primary {
              background: var(--color-prosper-green);
              color: white;
              border-color: var(--color-prosper-green);
            }

            /* Mobile */
            @media (max-width: 768px) {
              .comunidad-page {
                height: auto;
                max-height: none;
              }
              .main-layout {
                flex-direction: column;
              }
              .sidebar {
                width: 100%;
                min-width: 100%;
                max-height: 180px;
                border-right: none;
                border-bottom: 1px solid var(--border-default);
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
              .msg-text {
                font-size: 0.6875rem;
              }
            }
          `}</style>

          {loading ? (
            <div className="empty-state">
              <div className="loading-spinner" style={{ width: 28, height: 28, border: '3px solid var(--border-default)', borderTopColor: 'var(--color-prosper-green)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cargando...</p>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="tabs">
                <button
                  className={`tab-btn ${activeTab === 'public' ? 'active' : ''}`}
                  onClick={() => setActiveTab('public')}
                >
                  💬 Canales Públicos
                </button>
                <button
                  className={`tab-btn ${activeTab === 'private' ? 'active' : ''}`}
                  onClick={() => setActiveTab('private')}
                >
                  🔒 Chats Privados
                  {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
                </button>
              </div>

              {/* Main Layout */}
              <div className="main-layout">
                {/* Sidebar */}
                <aside className="sidebar">
                  <div className="sidebar-header">
                    <h2 className="sidebar-title">
                      {activeTab === 'public' ? 'Canales' : 'Conversaciones'}
                    </h2>
                    {activeTab === 'public' ? (
                      <button className="sidebar-btn" onClick={() => setShowNewCommunity(true)} title="Nuevo canal">+</button>
                    ) : (
                      <button className="sidebar-btn" onClick={() => setShowSearch(!showSearch)} title="Buscar usuario">🔍</button>
                    )}
                  </div>

                  {/* Search users */}
                  {activeTab === 'private' && (
                    <div className="search-box">
                      <input
                        className="search-input"
                        placeholder="Buscar por nombre o email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Comm/Conv list */}
                  <div className="comm-list">
                    {activeTab === 'public' ? (
                      communities.map(comm => (
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
                            <p className="comm-desc">{comm.description}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <>
                        {/* Search results */}
                        {searchTerm && searchResults.length > 0 ? (
                          searchResults.map(u => (
                            <button key={u.uid} className="comm-item" onClick={() => startPrivateChat(u)}>
                              <div className="comm-icon" style={{ background: 'var(--bg-accent-soft)' }}>
                                {u.displayName?.charAt(0) || u.email?.charAt(0) || '?'}
                              </div>
                              <div className="comm-info">
                                <p className="comm-name">{u.displayName || 'Usuario'}</p>
                                <p className="comm-desc">{u.email}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <>
                            {/* All users */}
                            {allUsers.map(u => (
                              <button key={u.uid} className="comm-item" onClick={() => startPrivateChat(u)}>
                                <div className="comm-icon" style={{ background: 'var(--bg-accent-soft)' }}>
                                  {u.displayName?.charAt(0) || u.email?.charAt(0) || '?'}
                                </div>
                                <div className="comm-info">
                                  <p className="comm-name">{u.displayName || 'Usuario'}</p>
                                  <p className="comm-desc">{u.email}</p>
                                </div>
                              </button>
                            ))}
                            {/* Existing conversations */}
                            {conversations.map(conv => (
                              <button
                                key={conv.id}
                                className={`comm-item ${activeConversation === conv.id ? 'active' : ''}`}
                                onClick={() => setActiveConversation(conv.id)}
                              >
                                <div className="comm-icon" style={{ background: 'var(--bg-accent-soft)' }}>
                                  {conv.otherUser?.displayName?.charAt(0) || conv.otherUser?.email?.charAt(0) || '💬'}
                                </div>
                                <div className="comm-info">
                                  <p className="comm-name">{conv.otherUser?.displayName || conv.otherUser?.email || 'Usuario'}</p>
                                  <p className="comm-desc">{conv.lastMessage || 'Sin mensajes'}</p>
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                      </>
                    )}
                    {activeTab === 'private' && conversations.length === 0 && (
                      <div className="empty-state" style={{ padding: '20px' }}>
                        <p className="empty-state-icon">💬</p>
                        <p className="empty-state-title">Sin conversaciones</p>
                        <p className="empty-state-desc">Busca un usuario para chatear</p>
                      </div>
                    )}
                  </div>
                </aside>

                {/* Chat Window */}
                <main className="chat-window">
                  {activeTab === 'public' ? (
                    <>
                      {/* Header */}
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
                        {publicMessages.length === 0 ? (
                          <div className="empty-state">
                            <div className="empty-state-icon">💬</div>
                            <h3 className="empty-state-title">Sé el primero en hablar</h3>
                            <p className="empty-state-desc">Inicia la conversación en {activeComm?.name}</p>
                          </div>
                        ) : (
                          publicMessages.map(msg => (
                            <div key={msg.id} className={`msg-item ${msg.senderId === user?.uid ? 'msg-own' : ''}`}>
                              {msg.senderId !== user?.uid && (
                                <div className="msg-avatar">
                                  {msg.senderPhoto ? (
                                    <img src={msg.senderPhoto} alt={msg.senderName} />
                                  ) : (
                                    <div className="msg-avatar-placeholder">{msg.senderName.charAt(0).toUpperCase()}</div>
                                  )}
                                </div>
                              )}
                              <div className="msg-bubble">
                                {msg.senderId !== user?.uid && <div className="msg-sender">{msg.senderName}</div>}
                                <div className="msg-text">{msg.text}</div>
                                <div className="msg-footer">
                                  <span className="msg-time">{new Date(msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <button className={`msg-like-btn ${msg.likes.includes(user?.uid || '') ? 'liked' : ''}`} onClick={() => handlePublicLike(msg.id)}>
                                    {msg.likes.includes(user?.uid || '') ? '❤️' : '🤍'} {msg.likes.length > 0 && msg.likes.length}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={publicEndRef} />
                      </div>

                      {/* Input */}
                      <div className="chat-input-area">
                        <div className="chat-input-row">
                          <input
                            className="chat-input"
                            placeholder="Escribe un mensaje..."
                            value={publicInput}
                            onChange={(e) => setPublicInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePublicSend()}
                          />
                          <button className="chat-send-btn" onClick={handlePublicSend}>➤</button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {activeConversation ? (
                        <>
                          {/* Header */}
                          <div className="chat-header">
                            <div className="chat-header-icon" style={{ background: 'var(--bg-accent-soft)' }}>
                              {activeConv?.otherUser?.displayName?.charAt(0) || '👤'}
                            </div>
                            <div className="chat-header-info">
                              <p className="chat-header-name">{activeConv?.otherUser?.displayName || 'Usuario'}</p>
                              <p className="chat-header-desc">Chat privado</p>
                            </div>
                          </div>

                          {/* Messages */}
                          <div className="messages-container">
                            {privateMessages.length === 0 ? (
                              <div className="empty-state">
                                <div className="empty-state-icon">🔒</div>
                                <h3 className="empty-state-title">Inicio de conversación</h3>
                                <p className="empty-state-desc">Envía el primer mensaje</p>
                              </div>
                            ) : (
                              privateMessages.map(msg => (
                                <div key={msg.id} className={`msg-item ${msg.senderId === user?.uid ? 'msg-own' : ''}`}>
                                  {msg.senderId !== user?.uid && activeConv?.otherUser && (
                                    <div className="msg-avatar">
                                      {activeConv.otherUser.photoURL ? (
                                        <img src={activeConv.otherUser.photoURL} alt={activeConv.otherUser.displayName || ''} />
                                      ) : (
                                        <div className="msg-avatar-placeholder">{activeConv.otherUser.displayName?.charAt(0) || '?'}</div>
                                      )}
                                    </div>
                                  )}
                                  <div className="msg-bubble">
                                    <div className="msg-text">{msg.text}</div>
                                    <div className="msg-footer">
                                      <span className="msg-time">{new Date(msg.timestamp).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                            <div ref={privateEndRef} />
                          </div>

                          {/* Input */}
                          <div className="chat-input-area">
                            <div className="chat-input-row">
                              <input
                                className="chat-input"
                                placeholder="Escribe un mensaje privado..."
                                value={privateInput}
                                onChange={(e) => setPrivateInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePrivateSend()}
                              />
                              <button className="chat-send-btn" onClick={handlePrivateSend}>➤</button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="empty-state">
                          <div className="empty-state-icon">🔒</div>
                          <h3 className="empty-state-title">Chats Privados</h3>
                          <p className="empty-state-desc">Selecciona una conversación o busca un usuario</p>
                        </div>
                      )}
                    </>
                  )}
                </main>
              </div>

              {/* New Community Modal */}
              {showNewCommunity && (
                <div className="modal-overlay" onClick={() => setShowNewCommunity(false)}>
                  <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                    <h3 className="modal-title">Nuevo Canal</h3>
                    <input
                      className="modal-input"
                      placeholder="Nombre del canal"
                      value={newCommunityName}
                      onChange={(e) => setNewCommunityName(e.target.value)}
                    />
                    <input
                      className="modal-input"
                      placeholder="Descripción (opcional)"
                      value={newCommunityDesc}
                      onChange={(e) => setNewCommunityDesc(e.target.value)}
                    />
                    <div className="modal-actions">
                      <button className="modal-btn" onClick={() => setShowNewCommunity(false)}>Cancelar</button>
                      <button className="modal-btn primary" onClick={handleCreateCommunity}>Crear</button>
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
