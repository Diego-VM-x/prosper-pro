'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  IconSearch,
  IconChevronDown,
  IconArrowForward,
  IconX,
} from '@/app/components/icons';
import { submitFeedback, getFeedbackByOwner } from '@/lib/firestore/feedback';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';

interface QuickLink {
  icon: string;
  title: string;
  route: string;
}

interface Category {
  id: string;
  title: string;
  desc: string;
  icon: string;
  tag?: string;
  tags?: string[];
}

interface Faq {
  categoryId: string;
  q: string;
  a: string;
}

interface VepayStep {
  title: string;
  description: string;
}

const ALL_CATEGORY = '__all__';

export default function AyudaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation('ayuda');

  const quickLinks = useMemo(() => t('quickLinks.items', { returnObjects: true }) as QuickLink[], [t]);
  const categories = useMemo(() => t('categories.items', { returnObjects: true }) as Category[], [t]);
  const faqs = useMemo(() => t('faq.items', { returnObjects: true }) as Faq[], [t]);
  const tutorialSteps = useMemo(() => t('tutorials.steps', { returnObjects: true }) as Record<string, string[]>, [t]);
  const tutorialRoutes = useMemo(() => t('tutorials.routes', { returnObjects: true }) as Record<string, string>, [t]);
  const vepaySteps = useMemo(() => t('vepay.steps', { returnObjects: true }) as VepayStep[], [t]);

  const categoryTitleById = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.id] = c.title; });
    return map;
  }, [categories]);

  const [openFaqCategory, setOpenFaqCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY);
  const [openTutorial, setOpenTutorial] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatType, setChatType] = useState<'suggestion' | 'bug'>('bug');
  const [chatMessages, setChatMessages] = useState<{ type: 'user' | 'system'; text: string; time: string }[]>([]);
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (showChat && user?.uid && chatMessages.length === 0) {
      setLoadingHistory(true);
      getFeedbackByOwner(user.uid).then(history => {
        const messages: { type: 'user' | 'system'; text: string; time: string }[] = [];
        [...history].reverse().forEach(item => {
          const date = new Date(item.createdAt);
          const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          messages.push({ type: 'user', text: item.message, time });
          const label = item.type === 'bug' ? t('chat.bugReported') : t('chat.suggestionSent');
          messages.push({ type: 'system', text: `${label}. ${t('chat.thanks')}`, time });
        });
        setChatMessages(messages);
      }).catch(err => {
        console.error('Error loading feedback history:', err);
      }).finally(() => {
        setLoadingHistory(false);
      });
    }
  }, [showChat, user?.uid, chatMessages.length, t]);

  const allCategories = useMemo(() => [ALL_CATEGORY, ...categories.map((c) => c.id)], [categories]);
  const searchLower = searchQuery.toLowerCase().trim();

  const groupedFaqs = useMemo(() => {
    let filtered = faqs;
    if (searchLower) {
      filtered = faqs.filter((f) =>
        f.q.toLowerCase().includes(searchLower) ||
        f.a.toLowerCase().includes(searchLower) ||
        categoryTitleById[f.categoryId]?.toLowerCase().includes(searchLower)
      );
    }
    if (selectedCategory !== ALL_CATEGORY) {
      filtered = filtered.filter((f) => f.categoryId === selectedCategory);
    }
    const groups: Record<string, { title: string; items: Faq[] }> = {};
    filtered.forEach((f) => {
      const title = categoryTitleById[f.categoryId];
      if (!groups[f.categoryId]) groups[f.categoryId] = { title, items: [] };
      groups[f.categoryId].items.push(f);
    });
    return groups;
  }, [searchLower, selectedCategory, faqs, categoryTitleById]);

  const filteredCategories = useMemo(() => {
    if (!searchLower) return categories;
    return categories.filter((c) => c.title.toLowerCase().includes(searchLower) || c.desc.toLowerCase().includes(searchLower));
  }, [searchLower, categories]);

  const filteredQuickLinks = useMemo(() => {
    if (!searchLower) return quickLinks;
    return quickLinks.filter((l) => l.title.toLowerCase().includes(searchLower));
  }, [searchLower, quickLinks]);

  const totalFaqs = Object.values(groupedFaqs).reduce((sum, arr) => sum + arr.items.length, 0);
  const hasResults = totalFaqs > 0 || filteredCategories.length > 0 || filteredQuickLinks.length > 0;

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !user?.uid) return;
    setSendingFeedback(true);
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    setChatMessages((prev) => [...prev, { type: 'user', text: chatMessage, time }]);

    try {
      await submitFeedback({
        ownerId: user.uid,
        type: chatType,
        message: chatMessage,
        page: '/ayuda',
      });
      const label = chatType === 'bug' ? t('chat.bugReported') : t('chat.suggestionSent');
      setTimeout(() => {
        setChatMessages((prev) => [...prev, {
          type: 'system',
          text: `${label}. ${t('chat.thanks')}`,
          time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
        }]);
      }, 600);
    } catch {
      setChatMessages((prev) => [...prev, {
        type: 'system',
        text: t('chat.error'),
        time: `${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
      }]);
    }

    setChatMessage('');
    setSendingFeedback(false);
  };

  const resultCount = totalFaqs + filteredCategories.length + filteredQuickLinks.length;

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="ayuda-page">
          {/* Hero */}
          <section className="ayuda-hero">
            <div className="ayuda-hero-bg">
              <div className="ayuda-hero-shape ayuda-hero-shape-1" />
              <div className="ayuda-hero-shape ayuda-hero-shape-2" />
            </div>
            <div className="ayuda-hero-content">
              <h1 className="ayuda-hero-title">{t('hero.title')}</h1>
              <p className="ayuda-hero-subtitle">{t('hero.subtitle')}</p>
              <div className="ayuda-search-wrapper">
                <IconSearch className="ayuda-search-icon" width={18} height={18} />
                <input type="text" placeholder={t('hero.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ayuda-search-input" />
                {searchQuery && (
                  <button className="ayuda-search-clear" onClick={() => setSearchQuery('')}>
                    <IconX width={14} height={14} />
                  </button>
                )}
              </div>
            </div>
          </section>

          {searchQuery && (
            <div className="ayuda-search-results">
              <p>{hasResults ? t('search.results', { count: resultCount }) : t('search.noResults', { query: searchQuery })}</p>
              <button className="ayuda-clear-search" onClick={() => setSearchQuery('')}>{t('search.clear')}</button>
            </div>
          )}

          {/* Quick Links */}
          {filteredQuickLinks.length > 0 && (
            <section className="ayuda-section">
              <div className="ayuda-section-header">
                <span className="ayuda-section-icon"><InlineIcon icon="Zap" size={20} /></span>
                <h2 className="ayuda-section-title">{t('quickLinks.title')}</h2>
              </div>
              <div className="ayuda-quick-grid">
                {filteredQuickLinks.map((link, i) => (
                  <button key={i} className="ayuda-quick-card" onClick={() => router.push(link.route)}>
                    <div className="ayuda-quick-card-icon"><InlineIcon icon={link.icon} size={20} /></div>
                    <span className="ayuda-quick-title">{link.title}</span>
                    <IconArrowForward width={14} height={14} className="ayuda-quick-arrow" />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Categories */}
          {filteredCategories.length > 0 && (
            <section className="ayuda-section">
              <div className="ayuda-section-header">
                <span className="ayuda-section-icon"><InlineIcon icon="Library" size={20} /></span>
                <h2 className="ayuda-section-title">{t('categories.title')}</h2>
              </div>
              <div className="ayuda-categories-grid">
                {filteredCategories.map((cat, i) => (
                  <div key={i} className="ayuda-card">
                    <div className="ayuda-card-top">
                      <div className="ayuda-card-icon-wrap">
                        <span className="ayuda-card-emoji"><InlineIcon icon={cat.icon} size={18} /></span>
                      </div>
                      {cat.tag && <span className="ayuda-card-badge">{cat.tag}</span>}
                    </div>
                    <h3 className="ayuda-card-title">{cat.title}</h3>
                    <p className="ayuda-card-desc">{cat.desc}</p>
                    {cat.tags && <div className="ayuda-card-tags">{cat.tags.map((tag, j) => <span key={j} className="ayuda-tag">{tag}</span>)}</div>}
                    <button className="ayuda-tutorial-toggle" onClick={(e) => { e.stopPropagation(); setOpenTutorial(openTutorial === cat.id ? null : cat.id); }}>
                      <IconChevronDown width={14} height={14} className={`ayuda-tutorial-chevron ${openTutorial === cat.id ? 'ayuda-tutorial-chevron-open' : ''}`} />
                      <span>{openTutorial === cat.id ? t('tutorials.hide') : t('tutorials.show')}</span>
                    </button>
                    {openTutorial === cat.id && (
                      <div className="ayuda-tutorial-content">
                        <ol className="ayuda-tutorial-steps">{(tutorialSteps[cat.id] ?? [t('tutorials.notAvailable')]).map((step, j) => (<li key={j}><span className="ayuda-tutorial-step-num">{j + 1}</span><span className="ayuda-tutorial-step-text">{step}</span></li>))}</ol>
                        <button className="ayuda-tutorial-link" onClick={() => router.push(tutorialRoutes[cat.id] ?? '/')}>{t('tutorials.goTo', { category: cat.title })} <IconArrowForward width={12} height={12} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* VEPay Section */}
          <section className="ayuda-section ayuda-vepay-section">
            <div className="ayuda-vepay-card">
              <div className="ayuda-vepay-header">
                <div className="ayuda-vepay-icon-wrap">
                  <span className="ayuda-vepay-icon"><InlineIcon icon="Smartphone" size={20} /></span>
                </div>
                <div className="ayuda-vepay-title-wrap">
                  <h2 className="ayuda-vepay-title">{t('vepay.title')}</h2>
                  <p className="ayuda-vepay-subtitle">{t('vepay.subtitle')}</p>
                </div>
              </div>
              <div className="ayuda-vepay-steps">
                {vepaySteps.map((step, idx) => (
                  <div key={idx} className="ayuda-vepay-step">
                    <div className="ayuda-vepay-step-num">{idx + 1}</div>
                    <div className="ayuda-vepay-step-content">
                      <h4>{step.title}</h4>
                      <p dangerouslySetInnerHTML={{ __html: step.description }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="ayuda-vepay-supported">
                <h4>{t('vepay.supportedBanks')}</h4>
                <div className="ayuda-vepay-banks">
                  {['BDV', 'Mercantil', 'Provincial', 'Banesco', 'Bancamiga', 'Bicentenario', 'Tesoro', 'Caroní', 'Exterior', 'Sofitasa', 'Plaza', 'Activo', 'Del Sur', 'Banfanb'].map((bank) => (
                    <span key={bank} className="ayuda-vepay-bank-tag">{bank}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQ - Grouped by Category */}
          <section className="ayuda-section">
            <div className="ayuda-section-header">
              <span className="ayuda-section-icon"><InlineIcon icon="HelpCircle" size={20} /></span>
              <h2 className="ayuda-section-title">{t('faq.title')}</h2>
            </div>
            <div className="ayuda-faq-filters">
              {allCategories.map((catId) => (<button key={catId} className={`ayuda-filter-btn ${selectedCategory === catId ? 'active' : ''}`} onClick={() => setSelectedCategory(catId)}>{catId === ALL_CATEGORY ? t('faq.filters.all') : categoryTitleById[catId]}</button>))}
            </div>
            <div className="ayuda-faq-grouped">
              {Object.entries(groupedFaqs).map(([categoryId, { title, items }]) => (
                <div key={categoryId} className="ayuda-faq-group">
                  <button className="ayuda-faq-group-header" onClick={() => setOpenFaqCategory(openFaqCategory === categoryId ? null : categoryId)}>
                    <span className="ayuda-faq-group-title">{title}</span>
                    <span className="ayuda-faq-group-count">{items.length}</span>
                    <IconChevronDown width={16} height={16} className={`ayuda-faq-group-chevron ${openFaqCategory === categoryId ? 'ayuda-faq-chevron-open' : ''}`} />
                  </button>
                  {openFaqCategory === categoryId && (
                    <div className="ayuda-faq-group-list">
                      {items.map((faq, i) => (
                        <div key={i} className="ayuda-faq-item">
                          <button className="ayuda-faq-question" onClick={() => setOpenFaqCategory(`${categoryId}-${i}`)}>
                            <span className="ayuda-faq-q">{faq.q}</span>
                            <IconChevronDown width={16} height={16} className={`ayuda-faq-chevron ${openFaqCategory === `${categoryId}-${i}` ? 'ayuda-faq-chevron-open' : ''}`} />
                          </button>
                          {openFaqCategory === `${categoryId}-${i}` && <div className="ayuda-faq-answer"><p>{faq.a}</p></div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {totalFaqs === 0 && <p className="ayuda-faq-empty">{t('faq.empty')}</p>}
            </div>
          </section>

          {/* Support */}
          <section className="ayuda-section">
            <div className="ayuda-section-header">
              <span className="ayuda-section-icon"><InlineIcon icon="MessageSquare" size={20} /></span>
              <h2 className="ayuda-section-title">{t('support.title')}</h2>
            </div>
            <div className="ayuda-support-grid">
              <div className="ayuda-support-card">
                <div className="ayuda-support-icon-wrap">
                  <span className="ayuda-support-emoji"><InlineIcon icon="Mail" size={20} /></span>
                </div>
                <h3 className="ayuda-support-title">{t('support.email.title')} <span style={{fontSize:'0.6rem',marginLeft:'6px',padding:'2px 8px',borderRadius:'999px',background:'rgba(61,204,142,0.15)',color:'#3DCC8E',fontWeight:'700',textTransform:'uppercase',letterSpacing:'0.04em',verticalAlign:'middle'}}>{t('support.email.badge')}</span></h3>
                <p className="ayuda-support-desc">{t('support.email.description')}</p>
                <button className="ayuda-support-btn ayuda-support-btn-primary" onClick={() => window.location.href = 'mailto:soporte@prosperpro.com'}>{t('support.email.button')}</button>
              </div>
              <div className="ayuda-support-card">
                <div className="ayuda-support-icon-wrap">
                  <span className="ayuda-support-emoji"><InlineIcon icon="BookOpen" size={20} /></span>
                </div>
                <h3 className="ayuda-support-title">{t('support.docs.title')}</h3>
                <p className="ayuda-support-desc">{t('support.docs.description')}</p>
                <button className="ayuda-support-btn ayuda-support-btn-secondary" onClick={() => window.open('https://prosper-pro.vercel.app', '_blank')}>{t('support.docs.button')}</button>
              </div>
              <div className="ayuda-support-card ayuda-support-card-chat" onClick={() => setShowChat(true)}>
                <div className="ayuda-support-icon-wrap">
                  <span className="ayuda-support-emoji"><InlineIcon icon="MessageSquare" size={20} /></span>
                </div>
                <h3 className="ayuda-support-title">{t('support.feedback.title')}</h3>
                <p className="ayuda-support-desc">{t('support.feedback.description')}</p>
                <button className="ayuda-support-btn ayuda-support-btn-chat">{t('support.feedback.button')}</button>
              </div>
            </div>
          </section>

          <footer className="ayuda-footer">
            <p className="ayuda-footer-label">{t('footer.label')}</p>
            <div className="ayuda-footer-links"><a href="#">{t('footer.links.systemStatus')}</a><Link href="/ayuda/notas-version">{t('footer.links.releaseNotes')}</Link><a href="#">{t('footer.links.terms')}</a></div>
          </footer>
        </div>

        {/* Floating Chat */}
        {showChat && (
          <div className="chat-overlay" onClick={() => setShowChat(false)}>
            <div className="chat-window" onClick={(e) => e.stopPropagation()}>
              <div className="chat-header">
                <div className="chat-header-info">
                  <span className="chat-header-icon"><InlineIcon icon="MessageSquare" size={18} /></span>
                  <div>
                    <h3 className="chat-header-title">{t('chat.title')}</h3>
                    <p className="chat-header-subtitle">{t('chat.subtitle')}</p>
                  </div>
                </div>
                <button className="chat-close-btn" onClick={() => setShowChat(false)}>
                  <IconX width={16} height={16} />
                </button>
              </div>
              <div className="chat-type-selector">
                <button className={`chat-type-btn ${chatType === 'bug' ? 'active active-bug' : ''}`} onClick={() => setChatType('bug')}>{t('chat.bug')}</button>
                <button className={`chat-type-btn ${chatType === 'suggestion' ? 'active active-suggestion' : ''}`} onClick={() => setChatType('suggestion')}>{t('chat.suggestion')}</button>
              </div>
              <div className="chat-messages">
                {loadingHistory ? (
                  <div className="chat-empty">
                    <p>{t('chat.loading')}</p>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="chat-empty">
                    <span className="chat-empty-icon"><InlineIcon icon={chatType === 'bug' ? 'Bug' : 'Lightbulb'} size={32} /></span>
                    <p>{chatType === 'bug' ? t('chat.bugPlaceholder') : t('chat.suggestionPlaceholder')}</p>
                    <p className="chat-empty-hint">{t('chat.hint')}</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`chat-msg ${msg.type === 'user' ? 'chat-msg-user' : 'chat-msg-system'}`}>
                      <div className={`chat-msg-bubble ${msg.type === 'user' ? 'chat-msg-bubble-user' : 'chat-msg-bubble-system'}`}>
                        <p>{msg.text}</p>
                      </div>
                      <span className="chat-msg-time">{msg.time}</span>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="chat-input-area">
                <input type="text" className="chat-input" placeholder={chatType === 'bug' ? t('chat.inputBugPlaceholder') : t('chat.inputSuggestionPlaceholder')} value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} disabled={sendingFeedback} />
                <button className="chat-send-btn" onClick={handleSendChat} disabled={!chatMessage.trim() || sendingFeedback}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .ayuda-page { max-width: 900px; margin: 0 auto; padding: 24px 16px; }
          .ayuda-section { margin-bottom: 36px; }
          .ayuda-section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
          .ayuda-section-icon { font-size: 1.25rem; }
          .ayuda-section-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }

          /* Hero */
          .ayuda-hero { position: relative; background: linear-gradient(135deg, var(--color-prosper-navy) 0%, #2A5A4E 40%, var(--color-prosper-green) 100%); border-radius: var(--radius-xl, 20px); padding: 32px 28px; margin-bottom: 28px; overflow: hidden; text-align: center; }
          .ayuda-hero-bg { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
          .ayuda-hero-shape { position: absolute; border-radius: 50%; opacity: 0.08; background: white; }
          .ayuda-hero-shape-1 { width: 200px; height: 200px; top: -80px; right: -60px; }
          .ayuda-hero-shape-2 { width: 150px; height: 150px; bottom: -50px; left: 5%; }
          .ayuda-hero-content { position: relative; z-index: 1; }
          .ayuda-hero-title { font-size: clamp(1.375rem, 4vw, 1.75rem); font-weight: 800; color: white; margin: 0 0 8px; }
          .ayuda-hero-subtitle { font-size: clamp(0.8125rem, 2vw, 0.9375rem); color: rgba(255,255,255,0.7); margin: 0 0 20px; }
          .ayuda-search-wrapper { position: relative; max-width: 440px; margin: 0 auto; }
          .ayuda-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--color-prosper-green); pointer-events: none; }
          .ayuda-search-input { width: 100%; padding: 12px 38px 12px 40px; border-radius: var(--radius-lg); border: 2px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.12); color: white; font-size: 0.875rem; outline: none; backdrop-filter: blur(8px); }
          .ayuda-search-input:focus { border-color: rgba(255,255,255,0.5); }
          .ayuda-search-input::placeholder { color: rgba(255,255,255,0.5); }
          .ayuda-search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; cursor: pointer; padding: 4px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          .ayuda-search-results { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); margin-bottom: 20px; }
          .ayuda-search-results p { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
          .ayuda-clear-search { font-size: 0.75rem; color: var(--color-prosper-green); font-weight: 600; background: none; border: none; cursor: pointer; }

          /* Quick Links */
          .ayuda-quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .ayuda-quick-card { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); color: var(--text-primary); transition: all var(--transition-fast); cursor: pointer; font-family: inherit; width: 100%; }
          .ayuda-quick-card:hover { border-color: var(--color-prosper-green); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
          .ayuda-quick-card-icon { font-size: 1.25rem; flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--bg-input); border-radius: var(--radius-md); }
          .ayuda-quick-title { font-size: 0.8125rem; font-weight: 600; flex: 1; text-align: left; }
          .ayuda-quick-arrow { color: var(--text-tertiary); flex-shrink: 0; transition: transform var(--transition-fast); }
          .ayuda-quick-card:hover .ayuda-quick-arrow { transform: translateX(3px); color: var(--color-prosper-green); }

          /* Categories */
          .ayuda-categories-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .ayuda-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 16px; transition: all var(--transition-fast); display: flex; flex-direction: column; }
          .ayuda-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }
          .ayuda-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
          .ayuda-card-icon-wrap { width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(61, 204, 142, 0.12); display: flex; align-items: center; justify-content: center; }
          .ayuda-card-emoji { font-size: 1.125rem; }
          .ayuda-card-badge { font-size: 0.5625rem; font-weight: 700; color: var(--color-prosper-green); background: rgba(61, 204, 142, 0.12); padding: 3px 8px; border-radius: var(--radius-full); text-transform: uppercase; letter-spacing: 0.1em; }
          .ayuda-card-title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
          .ayuda-card-desc { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 10px; }
          .ayuda-card-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 10px; }
          .ayuda-tag { font-size: 0.625rem; padding: 2px 8px; border-radius: var(--radius-full); background: var(--bg-input); color: var(--color-prosper-green); border: 1px solid rgba(61, 204, 142, 0.15); font-weight: 500; }
          .ayuda-tutorial-toggle { display: flex; align-items: center; gap: 4px; padding: 6px 0; background: none; border: none; color: var(--color-prosper-green); font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-top: auto; }
          .ayuda-tutorial-chevron { transition: transform var(--transition-fast); }
          .ayuda-tutorial-chevron-open { transform: rotate(180deg); }
          .ayuda-tutorial-content { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-default); }
          .ayuda-tutorial-steps { list-style: none; padding: 0; margin: 0 0 10px; }
          .ayuda-tutorial-steps li { display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border-default); }
          .ayuda-tutorial-steps li:last-child { border-bottom: none; }
          .ayuda-tutorial-step-num { width: 20px; height: 20px; border-radius: 50%; background: var(--color-prosper-green); color: white; font-size: 0.625rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ayuda-tutorial-step-text { font-size: 0.75rem; color: var(--text-secondary); line-height: 1.4; }
          .ayuda-tutorial-link { display: inline-flex; align-items: center; gap: 4px; font-size: 0.8125rem; font-weight: 600; color: var(--color-prosper-green); background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }

          /* VEPay */
          .ayuda-vepay-section { margin-bottom: 36px; }
          .ayuda-vepay-card { background: linear-gradient(135deg, var(--bg-card) 0%, rgba(61,204,142,0.04) 100%); border: 1px solid var(--border-default); border-radius: var(--radius-xl, 20px); padding: 24px; position: relative; overflow: hidden; }
          .ayuda-vepay-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, var(--color-prosper-green), var(--color-prosper-navy)); }
          .ayuda-vepay-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
          .ayuda-vepay-icon-wrap { width: 44px; height: 44px; border-radius: var(--radius-md); background: linear-gradient(135deg, var(--color-prosper-green), #2BA87A); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ayuda-vepay-icon { font-size: 1.25rem; }
          .ayuda-vepay-title-wrap { flex: 1; }
          .ayuda-vepay-title { font-size: 1.125rem; font-weight: 800; color: var(--text-primary); margin: 0 0 2px; }
          .ayuda-vepay-subtitle { font-size: 0.8125rem; color: var(--text-secondary); margin: 0; }
          .ayuda-vepay-steps { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
          .ayuda-vepay-step { display: flex; gap: 10px; align-items: flex-start; }
          .ayuda-vepay-step-num { width: 28px; height: 28px; border-radius: 50%; background: var(--color-prosper-green); color: white; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .ayuda-vepay-step-content { flex: 1; }
          .ayuda-vepay-step-content h4 { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 2px; }
          .ayuda-vepay-step-content p { font-size: 0.75rem; color: var(--text-secondary); margin: 0; line-height: 1.4; }
          .ayuda-vepay-step-content p strong { color: var(--text-primary); }
          .ayuda-vepay-supported { padding-top: 16px; border-top: 1px solid var(--border-default); }
          .ayuda-vepay-supported h4 { font-size: 0.8125rem; font-weight: 700; color: var(--text-primary); margin: 0 0 10px; }
          .ayuda-vepay-banks { display: flex; flex-wrap: wrap; gap: 6px; }
          .ayuda-vepay-bank-tag { font-size: 0.625rem; padding: 4px 10px; border-radius: var(--radius-full); background: var(--bg-input); color: var(--text-secondary); border: 1px solid var(--border-default); font-weight: 500; }

          /* FAQ Grouped */
          .ayuda-faq-filters { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }
          .ayuda-filter-btn { padding: 6px 12px; border-radius: var(--radius-full); border: 1px solid var(--border-default); background: var(--bg-card); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast); }
          .ayuda-filter-btn.active { background: var(--color-prosper-green); color: white; border-color: var(--color-prosper-green); }
          .ayuda-filter-btn:hover:not(.active) { border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .ayuda-faq-grouped { display: flex; flex-direction: column; gap: 8px; }
          .ayuda-faq-group { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); overflow: hidden; }
          .ayuda-faq-group-header { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: none; border: none; color: var(--text-primary); cursor: pointer; transition: background var(--transition-fast); }
          .ayuda-faq-group-header:hover { background: var(--bg-input); }
          .ayuda-faq-group-title { font-size: 0.875rem; font-weight: 700; flex: 1; text-align: left; }
          .ayuda-faq-group-count { font-size: 0.6875rem; font-weight: 600; color: var(--text-secondary); background: var(--bg-input); padding: 2px 8px; border-radius: var(--radius-full); }
          .ayuda-faq-group-chevron { color: var(--text-tertiary); transition: transform var(--transition-fast); flex-shrink: 0; }
          .ayuda-faq-group-list { padding: 0 12px 8px; }
          .ayuda-faq-item { border-bottom: 1px solid var(--border-default); }
          .ayuda-faq-item:last-child { border-bottom: none; }
          .ayuda-faq-question { width: 100%; display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: none; border: none; color: var(--text-primary); font-size: 0.8125rem; text-align: left; cursor: pointer; }
          .ayuda-faq-q { flex: 1; font-weight: 500; }
          .ayuda-faq-chevron { color: var(--text-tertiary); transition: transform var(--transition-fast); flex-shrink: 0; }
          .ayuda-faq-chevron-open { transform: rotate(180deg); }
          .ayuda-faq-answer { padding: 0 12px 12px 12px; color: var(--text-secondary); font-size: 0.8125rem; line-height: 1.6; }
          .ayuda-faq-empty { text-align: center; padding: 24px; color: var(--text-tertiary); font-size: 0.8125rem; }

          /* Support */
          .ayuda-support-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
          .ayuda-support-card { background: var(--bg-card); border: 1px solid var(--border-default); border-radius: var(--radius-lg); padding: 20px 16px; display: flex; flex-direction: column; align-items: center; text-align: center; transition: all var(--transition-fast); }
          .ayuda-support-card:hover { border-color: var(--color-prosper-green); box-shadow: var(--shadow-sm); transform: translateY(-1px); }
          .ayuda-support-card-chat { cursor: pointer; }
          .ayuda-support-icon-wrap { width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(61, 204, 142, 0.12); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
          .ayuda-support-emoji { font-size: 1.25rem; }
          .ayuda-support-title { font-size: 0.9375rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
          .ayuda-support-desc { font-size: 0.75rem; color: var(--text-secondary); margin: 0 0 14px; flex: 1; }
          .ayuda-support-btn { width: 100%; padding: 10px; border-radius: var(--radius-md); font-size: 0.8125rem; font-weight: 600; cursor: pointer; border: none; transition: all var(--transition-fast); }
          .ayuda-support-btn-primary { background: var(--color-prosper-green); color: white; }
          .ayuda-support-btn-primary:hover { filter: brightness(1.1); }
          .ayuda-support-btn-secondary { background: rgba(61, 204, 142, 0.15); color: var(--color-prosper-green); }
          .ayuda-support-btn-secondary:hover { background: rgba(61, 204, 142, 0.25); }
          .ayuda-support-btn-chat { background: linear-gradient(135deg, var(--color-prosper-green), #2BA87A); color: white; }
          .ayuda-support-btn-chat:hover { filter: brightness(1.1); }

          /* Footer */
          .ayuda-footer { text-align: center; padding: 24px 0 12px; border-top: 1px solid var(--border-default); }
          .ayuda-footer-label { font-size: 0.5625rem; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.15em; margin: 0 0 8px; }
          .ayuda-footer-links { display: flex; justify-content: center; gap: 20px; }
          .ayuda-footer-links a { font-size: 0.6875rem; color: var(--text-secondary); text-decoration: none; }
          .ayuda-footer-links a:hover { color: var(--color-prosper-green); }

          /* Chat */
          .chat-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 10000; display: flex; align-items: flex-end; justify-content: flex-end; padding: 16px; animation: chatFadeIn 0.2s ease; }
          @keyframes chatFadeIn { from { opacity: 0; } to { opacity: 1; } }
          .chat-window { width: 340px; max-width: calc(100vw - 32px); height: 460px; max-height: calc(100dvh - 32px); background: #ffffff; border: 1px solid var(--border-default); border-radius: var(--radius-xl, 20px); display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: chatSlideUp 0.3s ease; }
          [data-theme="dark"] .chat-window { background: #0a1628; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6); }
          [data-theme="amoled"] .chat-window { background: #0a0a0a; border: 1px solid rgba(255, 255, 255, 0.12); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.9); }
          @keyframes chatSlideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
          .chat-header { padding: 16px 18px; background: linear-gradient(135deg, var(--color-prosper-navy), #2A5A4E); display: flex; align-items: center; justify-content: space-between; }
          .chat-header-info { display: flex; align-items: center; gap: 10px; }
          .chat-header-icon { font-size: 1.125rem; }
          .chat-header-title { font-size: 0.875rem; font-weight: 700; color: white; margin: 0; }
          .chat-header-subtitle { font-size: 0.6875rem; color: rgba(255,255,255,0.6); margin: 0; }
          .chat-close-btn { background: rgba(255,255,255,0.15); border: none; color: white; cursor: pointer; padding: 6px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
          .chat-close-btn:hover { background: rgba(255,255,255,0.25); }
          .chat-type-selector { display: flex; gap: 6px; padding: 12px 16px; border-bottom: 1px solid var(--border-default); }
          .chat-type-btn { flex: 1; padding: 8px; border-radius: var(--radius-md); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-secondary); font-size: 0.75rem; font-weight: 600; cursor: pointer; text-align: center; }
          .chat-type-btn.active-bug { background: rgba(239,68,68,0.12); border-color: var(--color-error); color: var(--color-error); }
          .chat-type-btn.active-suggestion { background: rgba(61,204,142,0.12); border-color: var(--color-prosper-green); color: var(--color-prosper-green); }
          .chat-messages { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
          .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px 12px; }
          .chat-empty-icon { font-size: 2rem; margin-bottom: 8px; }
          .chat-empty p { font-size: 0.8125rem; color: var(--text-secondary); margin: 0 0 2px; }
          .chat-empty-hint { font-size: 0.6875rem; color: var(--text-tertiary); }
          .chat-msg { display: flex; flex-direction: column; }
          .chat-msg-user { align-items: flex-end; }
          .chat-msg-system { align-items: flex-start; }
          .chat-msg-bubble { max-width: 85%; padding: 10px 14px; border-radius: var(--radius-lg); }
          .chat-msg-bubble-user { background: var(--color-prosper-green); color: white; border-bottom-right-radius: 4px; }
          .chat-msg-bubble-system { background: var(--bg-input); color: var(--text-primary); border-bottom-left-radius: 4px; }
          .chat-msg-bubble p { margin: 0; font-size: 0.75rem; line-height: 1.4; }
          .chat-msg-time { font-size: 0.5625rem; color: var(--text-tertiary); margin-top: 2px; padding: 0 4px; }
          .chat-input-area { display: flex; gap: 6px; padding: 12px 16px; border-top: 1px solid var(--border-default); }
          .chat-input { flex: 1; padding: 10px 14px; border-radius: var(--radius-xl); border: 1px solid var(--border-default); background: var(--bg-input); color: var(--text-primary); font-size: 0.8125rem; outline: none; font-family: inherit; }
          .chat-input:focus { border-color: var(--color-prosper-green); }
          .chat-input::placeholder { color: var(--text-tertiary); }
          .chat-send-btn { width: 38px; height: 38px; border-radius: 50%; background: var(--color-prosper-green); color: white; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
          .chat-send-btn:hover { filter: brightness(1.1); }
          .chat-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }

          /* Responsive */
          @media (max-width: 768px) {
            .ayuda-page { padding: 16px 12px; }
            .ayuda-hero { padding: 24px 18px; }
            .ayuda-hero-title { font-size: 1.25rem; }
            .ayuda-quick-grid { grid-template-columns: repeat(2, 1fr); }
            .ayuda-categories-grid { grid-template-columns: repeat(2, 1fr); }
            .ayuda-vepay-steps { grid-template-columns: 1fr; }
            .ayuda-support-grid { grid-template-columns: 1fr; }
            .ayuda-faq-question { flex-wrap: wrap; }
            .chat-overlay { padding: 8px; }
            .chat-window { width: 100%; max-width: 100%; height: 75vh; border-radius: var(--radius-xl) var(--radius-xl) 0 0; }
          }
          @media (max-width: 480px) {
            .ayuda-page { padding: 12px 8px; }
            .ayuda-quick-grid { grid-template-columns: 1fr; }
            .ayuda-categories-grid { grid-template-columns: 1fr; }
            .ayuda-hero { padding: 20px 14px; }
            .ayuda-hero-title { font-size: 1.125rem; }
            .ayuda-search-input { padding: 10px 34px 10px 36px; font-size: 0.8125rem; }
            .ayuda-vepay-card { padding: 18px 14px; }
            .ayuda-support-card { padding: 16px 12px; }
          }
        `}</style>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
