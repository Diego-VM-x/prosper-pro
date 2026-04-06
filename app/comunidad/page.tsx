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
  clearConversationMessages,
  deleteConversation,
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    setActiveConversation(null);
    setShowMenu(false);
  }, [user]);

  const handleClearChat = useCallback(async () => {
    if (!activeConversation) return;
    await clearConversationMessages(activeConversation);
    setPrivateMessages([]);
    setShowMenu(false);
  }, [activeConversation]);

  const handleDeleteChat = useCallback(async () => {
    if (!activeConversation) return;
    const conv = conversations.find(c => c.id === activeConversation);
    const friendId = conv?.participants?.find((p: string) => p !== user?.uid);
    if (friendId) await removeFriendship(user!.uid, friendId);
    await deleteConversation(activeConversation);
    setActiveConversation(null);
    setShowMenu(false);
  }, [activeConversation, conversations, user?.uid]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const [chatError, setChatError] = useState<string | null>(null);

  const startChat = useCallback(async (f: UserProfile) => {
    if (!user?.uid) return;
    setChatError(null);
    const cid = await getOrCreateConversation(user.uid, f.uid);
    if (!cid) {
      setChatError('Debes ser amigo de este usuario para chatear');
      return;
    }
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
        <div className="comunidad-container" style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', background: 'transparent' }}>
          <style jsx>{`
            /* Comunidad - variables heredadas de globals.css (--comm-*) */
            /* Sidebar navigation (desktop) */
            .nav-sidebar {
              width: 64px;
              min-width: 64px;
              background: var(--comm-bg-secondary);
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 24px 0;
              gap: 8px;
              border: 1px solid rgba(59,130,246,0.15);
              border-radius: 24px;
              margin: 8px 4px 8px 8px;
              box-shadow: 0 0 16px rgba(59,130,246,0.08), 0 0 0 1px rgba(59,130,246,0.1);
            }
            .nav-item {
              width: 48px;
              height: 48px;
              border-radius: 14px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s;
              color: var(--comm-text-secondary);
              opacity: 0.7;
              font-size: 1.25rem;
              border: 1px solid transparent;
            }
            .nav-item:hover { background: var(--comm-bg-tertiary); opacity: 1; box-shadow: 0 2px 8px rgba(59,130,246,0.08); }
            .nav-item.active { background: var(--comm-bg-card); color: #60a5fa; opacity: 1; border: 1px solid rgba(59,130,246,0.2); box-shadow: 0 2px 12px rgba(59,130,246,0.12); }
            .nav-badge {
              position: absolute;
              top: 4px;
              right: 4px;
              background: var(--comm-accent);
              color: var(--comm-accent-dark);
              font-size: 0.5625rem;
              min-width: 14px;
              height: 14px;
              line-height: 14px;
              text-align: center;
              border-radius: 7px;
              font-weight: 700;
            }

            /* Bottom navigation (mobile) */
            .bottom-nav {
              display: none;
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 60px;
              background: var(--comm-bg-secondary);
              border-top: 1px solid var(--comm-border);
              z-index: 100;
              padding: 0 8px;
              padding-bottom: env(safe-area-inset-bottom, 0);
            }
            .bottom-nav-inner {
              display: flex;
              align-items: center;
              justify-content: space-around;
              height: 100%;
              max-width: 500px;
              margin: 0 auto;
            }
            .bottom-nav-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 2px;
              padding: 6px 16px;
              border-radius: 16px;
              cursor: pointer;
              transition: all 0.2s;
              color: var(--comm-text-secondary);
              opacity: 0.6;
              position: relative;
              min-width: 64px;
              border: 1px solid transparent;
            }
            .bottom-nav-item:hover { opacity: 0.8; box-shadow: 0 2px 8px rgba(59,130,246,0.08); }
            .bottom-nav-item.active { opacity: 1; color: #60a5fa; border: 1px solid rgba(59,130,246,0.15); box-shadow: 0 2px 12px rgba(59,130,246,0.1); }
            .bottom-nav-item .nav-icon { font-size: 1.25rem; line-height: 1; }
            .bottom-nav-item .nav-label { font-size: 0.625rem; font-weight: 600; }
            .bottom-nav-badge {
              position: absolute;
              top: 2px;
              right: 12px;
              background: rgba(59,130,246,0.3);
              color: #60a5fa;
              font-size: 0.5rem;
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
              background: var(--comm-bg-secondary);
              display: flex;
              flex-direction: column;
              border: 1px solid rgba(59,130,246,0.12);
              border-radius: 24px;
              overflow: hidden;
              margin: 8px 4px 8px 0;
              box-shadow: 0 0 20px rgba(59,130,246,0.06), 0 0 0 1px rgba(59,130,246,0.08);
            }
            .conv-header { padding: 24px; }
            .conv-title { font-size: 1.25rem; font-weight: 700; color: var(--comm-text-primary); margin: 0 0 16px; }
            .search-wrap { position: relative; }
            .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--comm-text-muted); font-size: 0.875rem; }
            .search-input {
              width: 100%;
              padding: 10px 12px 10px 36px;
              border-radius: 14px;
              border: 1px solid rgba(59,130,246,0.08);
              background: var(--comm-bg-tertiary);
              color: var(--comm-text-primary);
              font-size: 0.8125rem;
              outline: none;
              box-sizing: border-box;
              transition: all 0.2s;
            }
            .search-input:focus { box-shadow: 0 0 0 2px rgba(59,130,246,0.15), 0 2px 8px rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.2); }
            .conv-scroll { flex: 1; overflow-y: auto; padding: 8px 16px; }
            .conv-item {
              padding: 12px;
              border-radius: 16px;
              cursor: pointer;
              margin-bottom: 8px;
              transition: all 0.2s;
              border: 1px solid transparent;
            }
            .conv-item:hover { background: var(--comm-bg-tertiary); border-color: rgba(59,130,246,0.1); box-shadow: 0 2px 8px rgba(59,130,246,0.06); }
            .conv-item.active { background: var(--comm-bg-card); border-color: rgba(59,130,246,0.15); box-shadow: 0 2px 12px rgba(59,130,246,0.1); }
            .conv-row { display: flex; align-items: center; gap: 12px; }
            .conv-avatar { position: relative; flex-shrink: 0; }
            .conv-avatar img, .conv-avatar .initials {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              object-fit: cover;
            }
            .conv-avatar .initials {
              background: var(--comm-bg-tertiary);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1rem;
              font-weight: 700;
              color: #60a5fa;
            }
            .status-dot {
              position: absolute;
              bottom: 0;
              right: 0;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              border: 2px solid var(--comm-bg-tertiary);
            }
            .status-dot.on { background: #60a5fa; box-shadow: 0 0 6px rgba(59,130,246,0.4); }
            .status-dot.off { background: var(--comm-text-muted); }
            .conv-info { flex: 1; min-width: 0; }
            .conv-top { display: flex; justify-content: space-between; align-items: flex-start; }
            .conv-name { font-size: 0.875rem; font-weight: 600; color: var(--comm-text-primary); margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .conv-time { font-size: 0.625rem; color: var(--comm-text-muted); flex-shrink: 0; }
            .conv-avatar .initials {
              background: var(--comm-bg-tertiary);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1rem;
              font-weight: 700;
              color: #60a5fa;
              border: 1px solid rgba(59,130,246,0.1);
              box-shadow: 0 2px 8px rgba(59,130,246,0.08);
            }
            .conv-msg { font-size: 0.75rem; color: var(--comm-text-secondary); margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 400; }
            .conv-msg.muted { color: var(--comm-text-muted); font-weight: 400; }

            /* Chat area */
            .chat-area {
              flex: 1;
              display: flex;
              flex-direction: column;
              min-width: 0;
              background: var(--comm-bg-primary);
              position: relative;
              border-radius: 24px;
              overflow: hidden;
              margin: 8px 8px 8px 0;
              border: 1px solid rgba(59,130,246,0.1);
              box-shadow: 0 0 24px rgba(59,130,246,0.06), 0 0 0 1px rgba(59,130,246,0.08);
            }
            .chat-header {
              height: 80px;
              padding: 0 32px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid var(--comm-border);
              background: var(--comm-gradient-header);
              backdrop-filter: blur(20px);
              flex-shrink: 0;
            }
            .chat-header-left { display: flex; align-items: center; gap: 16px; }
            .chat-avatar { position: relative; }
            .chat-avatar img, .chat-avatar .initials {
              width: 44px;
              height: 44px;
              border-radius: 50%;
              object-fit: cover;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .chat-avatar .initials {
              background: var(--comm-gradient-bg);
              border: 1px solid rgba(59,130,246,0.08);
              box-shadow: 0 2px 12px rgba(59,130,246,0.06);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1rem;
              font-weight: 700;
              color: #4edea3;
            }
            .chat-avatar .status-dot { width: 12px; height: 12px; border-color: var(--comm-bg-primary); box-shadow: 0 0 6px rgba(59,130,246,0.3); }
            .chat-name { font-size: 1rem; font-weight: 700; color: var(--comm-text-primary); margin: 0; }
            .chat-status { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
            .chat-status span { font-size: 0.6875rem; color: var(--comm-text-secondary); font-weight: 500; }
            .chat-status .online { color: #60a5fa; }
            .chat-status .offline { color: var(--comm-text-muted); }
            .chat-status .encrypted { color: #60a5fa; }
            .chat-actions { display: flex; gap: 8px; position: relative; }
            .chat-action-btn {
              width: 40px;
              height: 40px;
              border-radius: 12px;
              border: 1px solid rgba(59,130,246,0.1);
              background: var(--comm-bg-tertiary);
              color: var(--comm-text-secondary);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.125rem;
              transition: all 0.2s;
              box-shadow: 0 1px 4px rgba(59,130,246,0.05);
            }
            .chat-action-btn:hover { background: var(--comm-bg-card); color: #60a5fa; border-color: rgba(59,130,246,0.2); transform: scale(1.08); box-shadow: 0 2px 8px rgba(59,130,246,0.12); }
            .chat-action-btn:active { transform: scale(0.95); }

            /* Dropdown menu */
            .chat-dropdown {
              position: absolute;
              top: calc(100% + 8px);
              right: 0;
              width: 200px;
              background: var(--comm-bg-secondary);
              border: 1px solid rgba(59,130,246,0.15);
              border-radius: 16px;
              box-shadow: 0 8px 32px rgba(59,130,246,0.12), 0 0 0 1px rgba(59,130,246,0.08);
              overflow: hidden;
              z-index: 50;
            }
            .chat-dropdown-item {
              display: flex;
              align-items: center;
              gap: 10px;
              width: 100%;
              padding: 12px 16px;
              border: none;
              background: transparent;
              color: var(--comm-text-primary);
              font-size: 0.8125rem;
              cursor: pointer;
              transition: background 0.15s;
              text-align: left;
            }
            .chat-dropdown-item:hover { background: var(--comm-bg-tertiary); }
            .chat-dropdown-item:not(.danger) { color: var(--comm-text-secondary); }
            .chat-dropdown-item:not(.danger):hover { color: #60a5fa; }
            .chat-dropdown-item.danger { color: #ef4444; }
            .chat-dropdown-item.danger:hover { background: rgba(239,68,68,0.1); }

            /* Messages */
            .msgs {
              flex: 1;
              overflow-y: auto;
              padding: 24px 32px;
              display: flex;
              flex-direction: column;
              gap: 16px;
              background: radial-gradient(ellipse at top, rgba(16,185,129,0.04) 0%, transparent 60%);
            }
            .msgs::-webkit-scrollbar { width: 6px; }
            .msgs::-webkit-scrollbar-track { background: transparent; }
            .msgs::-webkit-scrollbar-thumb { background: #3c4a42; border-radius: 3px; }
            .msgs::-webkit-scrollbar-thumb:hover { background: #4edea3; }
            .date-divider { display: flex; justify-content: center; }
            .date-divider span {
              padding: 6px 16px;
              background: var(--comm-gradient-bg);
              color: var(--comm-text-secondary);
              border: 1px solid rgba(59,130,246,0.08);
              font-size: 0.625rem;
              font-weight: 700;
              border-radius: 9999px;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            }
            .msg-row { display: flex; gap: 10px; max-width: 75%; }
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
              padding: 12px 18px;
              border-radius: 24px;
              font-size: 0.875rem;
              line-height: 1.5;
              word-break: break-word;
              transition: all 0.2s;
            }
            .msg-bubble:hover { transform: scale(1.02); }
            .msg-bubble.received { background: var(--comm-bg-card); color: var(--comm-text-primary); border-radius: 24px 24px 24px 8px; box-shadow: 0 2px 12px rgba(59,130,246,0.08), 0 0 0 1px rgba(59,130,246,0.1); }
            .msg-bubble.sent { background: var(--comm-bg-tertiary); color: var(--comm-text-primary); border-radius: 24px 24px 8px 24px; box-shadow: 0 2px 12px rgba(59,130,246,0.12), 0 0 0 1px rgba(59,130,246,0.15); }
            .msg-time { font-size: 0.625rem; color: var(--comm-text-muted); padding: 0 4px; }
            .msg-check { font-size: 0.75rem; color: #60a5fa; }

            /* Input */
            .input-area { padding: 12px 32px 16px; background: var(--comm-bg-primary); flex-shrink: 0; }
            .input-wrap {
              max-width: 800px;
              margin: 0 auto;
              display: flex;
              align-items: center;
              gap: 8px;
              background: var(--comm-gradient-bg);
              border-radius: 28px;
              padding: 8px 8px 8px 16px;
              box-shadow: 0 4px 20px rgba(59,130,246,0.08), 0 0 0 1px rgba(59,130,246,0.1);
              transition: all 0.3s;
            }
            .input-wrap:focus-within { box-shadow: 0 4px 24px rgba(59,130,246,0.15), 0 0 0 2px rgba(59,130,246,0.3), 0 0 20px rgba(59,130,246,0.1); }
            .msg-input {
              flex: 1;
              background: transparent;
              border: none;
              color: var(--comm-text-primary);
              font-size: 0.875rem;
              padding: 8px;
              outline: none;
            }
            .msg-input::placeholder { color: var(--comm-text-muted); }
            .send-btn {
              width: 48px;
              height: 48px;
              border-radius: 16px;
              border: 1px solid rgba(59,130,246,0.2);
              background: var(--comm-bg-tertiary);
              color: var(--comm-text-primary);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
              transition: all 0.25s;
              box-shadow: 0 2px 8px rgba(59,130,246,0.1), 0 0 0 1px rgba(59,130,246,0.08);
            }
            .send-btn:hover { background: rgba(59,130,246,0.15); color: #60a5fa; border-color: rgba(59,130,246,0.4); transform: scale(1.08); box-shadow: 0 4px 16px rgba(59,130,246,0.2), 0 0 12px rgba(59,130,246,0.15); }
            .send-btn:active { transform: scale(0.95); }
            .send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
            .input-hint { text-align: center; font-size: 0.625rem; color: var(--comm-text-muted); margin-top: 12px; font-weight: 500; opacity: 0.5; }

            /* Empty state */
            .empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--comm-text-secondary); text-align: center; padding: 32px; }
            .empty-icon { font-size: 3.5rem; margin-bottom: 20px; opacity: 0.4; }
            .empty-title { font-size: 1.125rem; font-weight: 700; color: var(--comm-text-primary); margin: 0 0 8px; }
            .empty-desc { font-size: 0.8125rem; margin: 0; max-width: 280px; line-height: 1.5; color: var(--comm-text-muted); }

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
            .contact-name { font-size: 0.875rem; font-weight: 600; color: var(--comm-text-primary); margin: 0; }
            .contact-email { font-size: 0.6875rem; color: var(--comm-text-muted); margin: 2px 0 0; }
            .btn-add {
              padding: 6px 12px;
              border-radius: 6px;
              border: none;
              background: var(--comm-bg-card);
              color: var(--comm-text-primary);
              border: 1px solid rgba(59,130,246,0.12);
              border-radius: 10px;
              box-shadow: 0 1px 4px rgba(59,130,246,0.05);
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
              background: var(--comm-bg-tertiary);
            }
            .request-top { display: flex; align-items: center; gap: 12px; }
            .request-actions { display: flex; gap: 8px; }
            .btn-accept { flex: 1; padding: 8px; border-radius: 12px; border: 1px solid rgba(59,130,246,0.15); background: var(--comm-bg-card); color: var(--comm-text-primary); font-size: 0.75rem; font-weight: 600; cursor: pointer; box-shadow: 0 2px 8px rgba(59,130,246,0.06); }
            .btn-accept:hover { border-color: rgba(59,130,246,0.3); box-shadow: 0 2px 12px rgba(59,130,246,0.12); }
            .btn-reject { flex: 1; padding: 8px; border-radius: 12px; border: 1px solid rgba(59,130,246,0.1); background: transparent; color: var(--comm-text-muted); font-size: 0.75rem; font-weight: 600; cursor: pointer; }
            .btn-reject:hover { border-color: rgba(239,68,68,0.3); color: #ef4444; }

            /* Mobile styles */
            .comunidad-container { position: relative; }
            @media (max-width: 768px) {
              .comunidad-container {
                height: calc(100dvh - 64px) !important;
                height: -webkit-fill-available;
                padding-bottom: 0;
              }
              .nav-sidebar { display: none; }
              .bottom-nav { display: block; position: fixed; bottom: 0; left: 0; right: 0; z-index: 100; }
              .bottom-nav.hidden { display: none; }
              .conv-list { width: 100%; min-width: 100%; position: absolute; inset: 0; z-index: 10; display: flex; flex-direction: column; }
              .conv-list.hide { display: none; }
              .conv-header { flex-shrink: 0; position: sticky; top: 0; z-index: 5; background: var(--comm-bg-secondary); }
              .conv-scroll { flex: 1; overflow-y: auto; }
              .chat-area { position: absolute; inset: 0; z-index: 20; display: none; flex-direction: column; }
              .chat-area.show { display: flex; }
              .chat-header { flex-shrink: 0; position: sticky; top: 0; z-index: 5; }
              .msgs { flex: 1; overflow-y: auto; padding: 16px; gap: 12px; }
              .input-area { flex-shrink: 0; padding: 8px 12px 12px; }
              .chat-back-btn { display: flex !important; align-items: center; justify-content: center; }
              .msg-row { max-width: 85%; }
              .conv-header { padding: 16px; }
              .conv-title { font-size: 1rem; }
              .chat-avatar img, .chat-avatar .initials { width: 40px; height: 40px; }
              .chat-name { font-size: 0.9375rem; }
              .chat-status span { font-size: 0.6875rem; }
              .chat-actions { gap: 4px; }
              .chat-action-btn { width: 36px; height: 36px; font-size: 1rem; }
            }
            @media (max-width: 480px) {
              .comunidad-container {
                height: calc(100dvh - 56px) !important;
                padding-bottom: 0;
              }
              .bottom-nav { height: 56px; }
              .bottom-nav-item { min-width: 56px; padding: 4px 12px; }
              .bottom-nav-item .nav-icon { font-size: 1.125rem; }
              .bottom-nav-item .nav-label { font-size: 0.5625rem; }
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
              .chat-status span { font-size: 0.625rem; }
              .msg-bubble { padding: 12px; font-size: 0.8125rem; }
              .msg-row { gap: 8px; }
              .input-area { padding: 8px 12px; }
              .input-wrap { padding: 6px 6px 6px 12px; border-radius: 16px; }
              .msg-input { font-size: 0.8125rem; padding: 6px; }
              .send-btn { width: 40px; height: 40px; }
              .date-divider span { font-size: 0.5625rem; padding: 4px 12px; }
              .empty-icon { font-size: 3rem; }
              .empty-title { font-size: 1rem; }
              .empty-desc { font-size: 0.75rem; }
            }
          `}</style>

          {/* Navigation sidebar (desktop) */}
          <div className="nav-sidebar">
            <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')} style={{ position: 'relative' }}>
              💬
              {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
            </div>
            <div className={`nav-item ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => setActiveTab('channels')}>
              📢
            </div>
            <div className={`nav-item ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
              👥
            </div>
          </div>

          {/* Bottom navigation (mobile) */}
          <div className={`bottom-nav ${activeConversation ? 'hidden' : ''}`}>
            <div className="bottom-nav-inner">
              <div className={`bottom-nav-item ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
                <span className="nav-icon">👥</span>
                <span className="nav-label">Amigos</span>
              </div>
              <div className={`bottom-nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')} style={{ position: 'relative' }}>
                <span className="nav-icon">💬</span>
                <span className="nav-label">Mensajes</span>
                {unreadCount > 0 && <span className="bottom-nav-badge">{unreadCount}</span>}
              </div>
              <div className={`bottom-nav-item ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => setActiveTab('channels')}>
                <span className="nav-icon">📢</span>
                <span className="nav-label">Canales</span>
              </div>
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
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--comm-text-muted)', cursor: 'pointer', fontSize: '0.875rem', padding: '4px' }} onClick={() => handleRemove(f.uid)}>✕</button>
                    </div>
                  ))}
                </>
              )}

              {/* Requests */}
              {receivedRequests.length > 0 && (
                <>
                  <p style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--comm-text-muted)', textTransform: 'uppercase', padding: '16px 12px 8px', letterSpacing: '0.05em' }}>Solicitudes</p>
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
                    onClick={() => { setActiveConversation(null); setShowMenu(false); }}
                    style={{
                      display: 'none',
                      background: 'none',
                      border: 'none',
                      color: 'var(--comm-text-primary)',
                      cursor: 'pointer',
                      padding: '8px',
                      marginRight: '8px',
                      fontSize: '1.25rem',
                    }}
                    className="chat-back-btn"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
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
                        <span className={otherUserOnline ? 'online' : 'offline'}>
                          {otherUserOnline ? 'En línea' : 'Desconectado'}
                        </span>
                        <span className="encrypted">Cifrado</span>
                      </div>
                    </div>
                  </div>
                  <div className="chat-actions" ref={menuRef}>
                    <button className="chat-action-btn" onClick={() => setShowMenu(!showMenu)} title="Opciones">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
                    </button>
                    {showMenu && (
                      <div className="chat-dropdown">
                        <button className="chat-dropdown-item danger" onClick={() => {
                          const friendId = activeConv?.participants?.find((p: string) => p !== user?.uid);
                          if (friendId) handleRemove(friendId);
                        }}>
                          <span className="chat-dropdown-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>
                          Eliminar de amigos
                        </button>
                        <button className="chat-dropdown-item" onClick={handleClearChat}>
                          <span className="chat-dropdown-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>
                          Vaciar chat
                        </button>
                        <button className="chat-dropdown-item danger" onClick={handleDeleteChat}>
                          <span className="chat-dropdown-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>
                          Eliminar chat y amigo
                        </button>
                      </div>
                    )}
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
                    <input className="msg-input" placeholder="Escribe un mensaje..." value={privateInput} onChange={(e) => setPrivateInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                    <button className="send-btn" onClick={handleSend}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                  </div>
                </div>
              </>
            ) : chatError ? (
              <div className="empty">
                <div className="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
                <h3 className="empty-title">No puedes chatear</h3>
                <p className="empty-desc">{chatError}</p>
                <button onClick={() => setChatError(null)} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid var(--comm-border)', background: 'var(--comm-bg-tertiary)', color: 'var(--comm-text-primary)', cursor: 'pointer' }}>Cerrar</button>
              </div>
            ) : (
              <div className="empty">
                <div className="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
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
