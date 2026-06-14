'use client';

import { useState, useEffect, memo } from 'react';
import { DashboardLayout } from '@/app/components/DashboardLayout';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/lib/contexts/AuthContext';
import { getUserProfile, updateUserProfile, subscribeToUserProfile } from '@/lib/firestore/users';
import { subscribeToDevices, removeDevice } from '@/lib/firestore/devices';
import { useTheme } from '@/app/components/ThemeProvider';
import { useCurrency } from '@/lib/contexts/CurrencyContext';
import { CURRENCY_LIST, CURRENCY_MAP } from '@/lib/currency';
import { safeLocalStorage } from '@/lib/utils/safeStorage';
import { getDeviceInfo, getDeviceIcon } from '@/lib/utils/deviceInfo';
import { getStoredTokens } from '@/lib/contexts/firebase-auth-core';
import { triggerTestNotification, checkNotificationPermissions } from '@/lib/notifications';
import type { UserProfile, CurrencyCode, UserDevice, NotificationType } from '@/types';
import i18n from '@/lib/i18n/client';
import { useTranslation } from 'react-i18next';
import { InlineIcon, IconBadge } from '@/app/components/IconMap';
import { CurrencyFlag } from '@/app/components/CryptoIcons';
import { Check, AlertTriangle, CheckCircle2, XCircle, Globe2, Lock, LogOut, Shield, Mail, Clock, UserCheck } from 'lucide-react';

type TabId = 'perfil' | 'preferencias' | 'notificaciones' | 'seguridad';

const ConfiguracionPage = memo(function ConfiguracionPage() {
  const { user, logout, changePassword, deleteAccount, wipeAllData, enableNotifications, sendVerificationEmail, reloadUser } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const { theme, setTheme } = useTheme();
  const { setDisplayCurrency, rates } = useCurrency();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showUpdateModalPref, setShowUpdateModalPref] = useState<boolean>(true);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [language, setLanguage] = useState('es');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [priceAlerts, setPriceAlerts] = useState(true);
  const [budgetAlerts, setBudgetAlerts] = useState(true);
  const [showProfile, setShowProfile] = useState(true);
  const [planInviteNotif, setPlanInviteNotif] = useState(true);
  const [planContributionNotif, setPlanContributionNotif] = useState(true);
  const [planReminderNotif, setPlanReminderNotif] = useState(true);
  const [planRejectedNotif, setPlanRejectedNotif] = useState(true);
  const [dollarChangeNotif, setDollarChangeNotif] = useState(true);
  const [dailyBalanceNotif, setDailyBalanceNotif] = useState(true);
  const [appUpdateNotif, setAppUpdateNotif] = useState(true);
  const [calendarReminderNotif, setCalendarReminderNotif] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [wipingData, setWipingData] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [removingDevice, setRemovingDevice] = useState<string | null>(null);
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const { t } = useTranslation(['configuracion', 'common']);

  useEffect(() => {
    if (typeof window !== 'undefined' && user?.uid) {
      getDeviceInfo(user.uid).then((info) => setCurrentDeviceId(info.deviceId));
    }
  }, [user?.uid]);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const storedTokens = typeof window !== 'undefined' ? getStoredTokens() : null;
  const isEmailUser = user?.providerData?.some((p: any) => p.providerId === 'password') ||
    (!user?.providerData?.length && storedTokens?.providerId === 'password');

  useEffect(() => {
    // Check permission status on both web and native platforms
    checkNotificationPermissions().then((granted) => setNotifEnabled(granted));
    const uid = user?.uid as string;
    if (!uid) return;
    // Load update modal preference
    try {
      const stored = safeLocalStorage.getItem('prosper_show_update_modal');
      setShowUpdateModalPref(stored !== 'false');
    } catch { setShowUpdateModalPref(true); }

    async function loadProfile() {
      try {
        const p = await getUserProfile(uid);
        if (p) {
          setProfile(p);
          setDisplayName(p.displayName || '');
          setBio((p as any).bio || '');
        }
      } catch (e) {
        console.error('Error loading profile:', e);
      }
    }
    loadProfile();

    const unsub = subscribeToUserProfile(uid, (p) => {
      if (p) {
        setProfile(p);
        setDisplayName(p.displayName || '');
        setBio((p as any).bio || '');
        // Use profile values when present, otherwise fall back to current i18n/localStorage values
        // so users without these fields don't see their selections reset.
        const profileLang = (p as any).language;
        setLanguage(profileLang || i18n.language || 'es');
        const profileCurrency = (p as any).currency as CurrencyCode | undefined;
        setCurrency(profileCurrency || safeLocalStorage.getItem('prosper-display-currency') as CurrencyCode || 'USD');
        setPriceAlerts((p as any).notifications?.priceAlerts ?? true);
        setBudgetAlerts((p as any).notifications?.budgetAlerts ?? true);
        setShowProfile((p as any).showProfile !== false);
        setPlanInviteNotif((p as any).notifications?.planInvite ?? true);
        setPlanContributionNotif((p as any).notifications?.planContribution ?? true);
        setPlanReminderNotif((p as any).notifications?.planReminder ?? true);
        setPlanRejectedNotif((p as any).notifications?.planRejected ?? true);
        setDollarChangeNotif((p as any).notifications?.dollarChange ?? true);
        setDailyBalanceNotif((p as any).notifications?.dailyBalance ?? true);
        setAppUpdateNotif((p as any).notifications?.appUpdate ?? true);
        setCalendarReminderNotif((p as any).notifications?.calendarReminder ?? true);
      }
    });

    // Subscribe a dispositivos
    const unsubDevices = subscribeToDevices(uid, (devs) => {
      setDevices(devs);
    });

    return () => {
      unsub();
      unsubDevices();
    };
  }, [user?.uid]);

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await updateUserProfile(user.uid, {
        displayName: displayName.trim() || user.email?.split('@')[0] || t('fallbacks.userName'),
        bio: bio.trim(),
        language,
        currency,
        customRates: null,
        showProfile,
        notifications: {
          priceAlerts,
          budgetAlerts,
          planInvite: planInviteNotif,
          planContribution: planContributionNotif,
          planReminder: planReminderNotif,
          planRejected: planRejectedNotif,
          dollarChange: dollarChangeNotif,
          dailyBalance: dailyBalanceNotif,
          appUpdate: appUpdateNotif,
          calendarReminder: calendarReminderNotif,
        },
        updatedAt: Date.now(),
      } as any);
      // Also update display currency in context
      setDisplayCurrency(currency);
      setSuccessMsg(t('messages.profileUpdated'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      console.error(e);
      setErrorMsg(t('messages.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== t('seguridad.deleteAccount.placeholder')) return;
    setErrorMsg('');
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.needsReauth) {
        setErrorMsg(t('messages.reauthRequired'));
      } else if (result.error) {
        setErrorMsg(result.error);
      }
    } catch {
      setErrorMsg(t('messages.deleteError'));
    } finally {
      setDeleting(false);
    }
  };

  const handleWipeAllData = async () => {
    if (wipeConfirmText !== t('seguridad.wipeData.placeholder')) return;
    setErrorMsg('');
    setWipingData(true);
    try {
      const result = await wipeAllData();
      if (result.success) {
        setSuccessMsg(t('messages.dataWiped'));
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setErrorMsg(result.error || t('messages.wipeError'));
      }
    } catch {
      setErrorMsg(t('messages.wipeErrorRetry'));
    } finally {
      setWipingData(false);
    }
  };

  const handleRemoveDevice = async (deviceId: string) => {
    if (!user?.uid) return;
    setRemovingDevice(deviceId);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await removeDevice(user.uid, deviceId);
      if (deviceId === currentDeviceId) {
        setSuccessMsg(t('seguridad.deviceRemoved'));
        setTimeout(() => logout(), 1200);
      } else {
        setSuccessMsg(t('seguridad.deviceRemovedRemote'));
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (e) {
      console.error('Error removing device:', e);
      setErrorMsg(t('seguridad.deviceRemoveError'));
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setRemovingDevice(null);
    }
  };

  const handleChangePassword = async () => {
    if (!isEmailUser) {
      setErrorMsg(t('seguridad.passwordChangeNotAvailable', { defaultValue: 'Los usuarios de Google no pueden cambiar su contraseña aquí' }));
      setTimeout(() => setErrorMsg(''), 4000);
      return;
    }
    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMsg(t('seguridad.passwordEmpty', { defaultValue: 'Completa todos los campos' }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg(t('seguridad.passwordMismatch', { defaultValue: 'Las contraseñas nuevas no coinciden' }));
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg(t('seguridad.passwordTooShort', { defaultValue: 'La contraseña debe tener al menos 8 caracteres' }));
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      setErrorMsg(t('seguridad.passwordNoUppercase', { defaultValue: 'La contraseña debe tener al menos una mayúscula' }));
      return;
    }
    if (!/[a-z]/.test(newPassword)) {
      setErrorMsg(t('seguridad.passwordNoLowercase', { defaultValue: 'La contraseña debe tener al menos una minúscula' }));
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      setErrorMsg(t('seguridad.passwordNoNumber', { defaultValue: 'La contraseña debe tener al menos un número' }));
      return;
    }

    setChangingPassword(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const result = await changePassword(currentPassword, newPassword);
      if (result.success) {
        setSuccessMsg(t('seguridad.passwordChanged', { defaultValue: 'Contraseña actualizada correctamente' }));
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setErrorMsg(result.error || t('seguridad.passwordChangeError'));
        setTimeout(() => setErrorMsg(''), 4000);
      }
    } catch (e) {
      setErrorMsg(t('seguridad.passwordChangeError'));
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setChangingPassword(false);
    }
  };

  function formatLastActive(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return t('seguridad.device.activeNow');
    if (minutes < 60) return t('seguridad.device.minutesAgo', { count: minutes });
    if (hours < 24) return t('seguridad.device.hoursAgo', { count: hours });
    return t('seguridad.device.daysAgo', { count: days });
  }

  function isDeviceOnline(device: UserDevice): boolean {
    // Si explícitamente está marcado offline, respetarlo
    if (device.isOnline === false) return false;
    // Si no ha reportado en 5 minutos, considerar offline
    const diff = Date.now() - device.lastActive;
    return diff < 5 * 60 * 1000;
  }

  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : (user?.email ? user.email.charAt(0).toUpperCase() : 'U');
  const userEmail = user?.email || t('fallbacks.email');
  const photoURL = user?.photoURL;

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'perfil', label: t('tabs.perfil'), icon: 'User' },
    { id: 'preferencias', label: t('tabs.preferencias'), icon: 'Settings' },
    { id: 'notificaciones', label: t('tabs.notificaciones'), icon: 'Bell' },
    { id: 'seguridad', label: t('tabs.seguridad'), icon: 'Lock' },
  ];

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="settings-page">
          {/* Toast */}
          {successMsg && <div className="toast toast-success"><Check size={14} /> {successMsg}</div>}
          {errorMsg && <div className="toast toast-error"><AlertTriangle size={14} /> {errorMsg}</div>}

          {/* Header */}
          <div className="settings-header">
            <div>
              <h1 className="settings-title">{t('header.title')}</h1>
              <p className="settings-subtitle">{t('header.subtitle')}</p>
            </div>
          </div>

          {/* Floating Save Bar */}
          <div className="settings-save-bar">
            <div className="settings-save-bar-inner">
              <span className="settings-save-hint">{t('saveBar.hint')}</span>
              <button
                className="btn-save"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <span className="btn-loading">
                    <span className="spinner" /> {t('saveBar.saving')}
                  </span>
                ) : t('saveBar.saveBtn')}
              </button>
            </div>
          </div>

          {/* Mobile Tabs */}
          <div className="mobile-tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="mobile-tab-icon"><InlineIcon icon={tab.icon} size={14} /></span>
                <span className="mobile-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="settings-layout">
            {/* Desktop Sidebar */}
            <aside className="settings-sidebar">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="sidebar-tab-icon"><InlineIcon icon={tab.icon} size={16} /></span>
                  <span className="sidebar-tab-label">{tab.label}</span>
                </button>
              ))}
            </aside>

            {/* Content */}
            <div className="settings-content">
              {/* ===== PERFIL ===== */}
              {activeTab === 'perfil' && (
                <div className="settings-panel">
                  <div className="panel-card">
                    <div className="panel-header">
                      <h2 className="panel-title">{t('perfil.panelTitle')}</h2>
                      <p className="panel-desc">{t('perfil.panelDesc')}</p>
                    </div>

                    <div className="profile-grid">
                      {/* Avatar */}
                      <div className="avatar-section">
                        <div className="avatar-circle">
                          {photoURL ? (
                            <img src={photoURL} alt={t('perfil.avatarAlt')} className="avatar-img" />
                          ) : (
                            <span className="avatar-initial">{userInitial}</span>
                          )}
                        </div>
                        <p className="avatar-hint">{user?.email}</p>
                      </div>

                      {/* Form */}
                      <div className="profile-fields">
                        <div className="field-grid">
                          <div className="field">
                            <label className="field-label">{t('perfil.nameLabel')}</label>
                            <input
                              className="field-input"
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder={t('perfil.namePlaceholder')}
                            />
                          </div>
                          <div className="field">
                            <label className="field-label">{t('perfil.emailLabel')}</label>
                            <input
                              className="field-input field-disabled"
                              type="email"
                              value={userEmail}
                              disabled
                              tabIndex={-1}
                            />
                          </div>
                        </div>
                        <div className="field">
                          <label className="field-label">{t('perfil.bioLabel')}</label>
                          <textarea
                            className="field-textarea"
                            rows={3}
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder={t('perfil.bioPlaceholder')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plan Card */}
                  <div className="panel-card plan-card">
                    <div className="plan-content">
                      <div className="plan-badge">{t('perfil.planBadge')}</div>
                      <div>
                        <h3 className="plan-title">{t('perfil.planTitle')}</h3>
                        <p className="plan-desc">{t('perfil.planDesc')}</p>
                      </div>
                    </div>
                    <div className="plan-features">
                      <div className="plan-feature">
                        <span className="plan-feature-icon"><InlineIcon icon="Target" size={16} /></span>
                        <span>{t('perfil.planFeatures.unlimitedGoals')}</span>
                      </div>
                      <div className="plan-feature">
                        <span className="plan-feature-icon"><InlineIcon icon="BarChart3" size={16} /></span>
                        <span>{t('perfil.planFeatures.fullDashboard')}</span>
                      </div>
                      <div className="plan-feature">
                        <span className="plan-feature-icon"><InlineIcon icon="Library" size={16} /></span>
                        <span>{t('perfil.planFeatures.courses')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== PREFERENCIAS ===== */}
              {activeTab === 'preferencias' && (
                <div className="settings-panel">
                  <div className="panel-card">
                    <div className="panel-header">
                      <h2 className="panel-title">{t('preferencias.languageCurrencyTitle')}</h2>
                      <p className="panel-desc">{t('preferencias.languageCurrencyDesc')}</p>
                    </div>

                    <div className="pref-section">
                      <label className="pref-label">{t('preferencias.languageLabel')}</label>
                      <div className="option-grid">
                        {[
                          { value: 'es', label: 'Español', flag: '🇪🇸' },
                          { value: 'en', label: 'English', flag: '🇺🇸' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            className={`option-btn ${language === opt.value ? 'active' : ''}`}
                            onClick={() => { setLanguage(opt.value); i18n.changeLanguage(opt.value); }}
                          >
                            <span className="option-flag">{opt.flag}</span>
                            <span className="option-text">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Currency Selector */}
                    <div className="pref-section">
                      <label className="pref-label">{t('preferencias.currencyLabel')}</label>
                      <div className="currency-cards-grid">
                        {CURRENCY_LIST.map(code => {
                          const cfg = CURRENCY_MAP[code];
                          const rateToBs = rates.rates[code];
                          const isBs = code === 'BS';
                          const isActive = currency === code;
                          return (
                            <button
                              key={code}
                              className={`currency-card ${isActive ? 'active' : ''}`}
                              onClick={() => {
                                setCurrency(code);
                                setDisplayCurrency(code);
                              }}
                            >
                              <div className="currency-card-header">
                                <CurrencyFlag code={code} size={24} />
                                <span className="currency-card-code">{cfg.code}</span>
                                {isActive && <span className="currency-card-check"><Check size={14} /></span>}
                              </div>
                              <div className="currency-card-body">
                                <span className="currency-card-name">{cfg.name}</span>
                                <span className="currency-card-symbol">{cfg.symbol}</span>
                              </div>
                              {!isBs && rateToBs && rateToBs > 0 && (
                                <div className="currency-card-rate">
                                  1 {cfg.code} ≈ {rateToBs.toLocaleString('es-VE', { minimumFractionDigits: code === 'COP' ? 4 : 2, maximumFractionDigits: code === 'COP' ? 4 : 2 })} Bs.
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Exchange Rates */}
                    {rates.source === 'api' && (
                      <div className="pref-section">
                        <label className="pref-label">{t('preferencias.ratesLabel')}</label>
                        <div className="rates-table">
                          {/* Fiat Header */}
                          <div className="rates-section-title">{t('market.fiat', { defaultValue: 'Fiat' })}</div>
                          <div className="rates-row">
                            <CurrencyFlag code="USD" size={18} />
                            <span className="rates-name">USD</span>
                            <span className="rates-value">{rates.rates.USD?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
                          </div>
                          <div className="rates-row">
                            <CurrencyFlag code="EUR" size={18} />
                            <span className="rates-name">EUR</span>
                            <span className="rates-value">{rates.rates.EUR?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
                          </div>
                          <div className="rates-row">
                            <CurrencyFlag code="COP" size={18} />
                            <span className="rates-name">COP</span>
                            <span className="rates-value">{rates.rates.COP?.toLocaleString('es-VE', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} Bs.</span>
                          </div>

                          {/* Crypto Header */}
                          <div className="rates-section-title" style={{ marginTop: '12px' }}>{t('market.cryptos', { defaultValue: 'Criptomonedas' })}</div>
                          {[
                            { code: 'USDT', usdPrice: rates.rates.USDT / rates.rates.USD, bsPrice: rates.rates.USDT },
                            { code: 'SOL', usdPrice: rates.rates.SOL / rates.rates.USD, bsPrice: rates.rates.SOL },
                            { code: 'BTC', usdPrice: rates.rates.BTC / rates.rates.USD, bsPrice: rates.rates.BTC },
                            { code: 'ETH', usdPrice: rates.rates.ETH / rates.rates.USD, bsPrice: rates.rates.ETH },
                            { code: 'USDC', usdPrice: rates.rates.USDC / rates.rates.USD, bsPrice: rates.rates.USDC },
                          ].map(crypto => (
                            <div className="rates-row" key={crypto.code}>
                              <CurrencyFlag code={crypto.code} size={18} />
                              <span className="rates-name">{crypto.code}</span>
                              <span className="rates-value">
                                ${crypto.usdPrice?.toLocaleString('es-VE', { maximumFractionDigits: 2 })}
                                <span className="rates-sub">≈ {crypto.bsPrice?.toLocaleString('es-VE', { maximumFractionDigits: 2 })} Bs.</span>
                              </span>
                            </div>
                          ))}

                          {/* P2P Rates */}
                          {rates.p2pRates && Object.keys(rates.p2pRates).length > 0 && (
                            <>
                              <div className="rates-section-title" style={{ marginTop: '12px' }}>
                                <span className="rates-p2p-badge">P2P Binance</span>
                              </div>
                              {Object.entries(rates.p2pRates).map(([code, rate]) => (
                                <div className="rates-row" key={`p2p-${code}`}>
                                  <CurrencyFlag code={code} size={18} />
                                  <span className="rates-name">{code}</span>
                                  <span className="rates-value p2p">{rate?.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs.</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="panel-card">
                    <div className="panel-header">
                      <h2 className="panel-title">{t('preferencias.appearanceTitle')}</h2>
                      <p className="panel-desc">{t('preferencias.appearanceDesc')}</p>
                    </div>

                    <div className="theme-selector">
                      <button
                        className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                        onClick={() => setTheme('light')}
                      >
                        <div className="theme-preview theme-preview-light">
                          <div className="theme-preview-bar" />
                          <div className="theme-preview-blocks">
                            <div className="theme-preview-block" />
                            <div className="theme-preview-block" />
                          </div>
                        </div>
                        <span className="theme-label">{t('preferencias.themes.light')}</span>
                      </button>
                      <button
                        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                        onClick={() => setTheme('dark')}
                      >
                        <div className="theme-preview theme-preview-dark">
                          <div className="theme-preview-bar" />
                          <div className="theme-preview-blocks">
                            <div className="theme-preview-block" />
                            <div className="theme-preview-block" />
                          </div>
                        </div>
                        <span className="theme-label">{t('preferencias.themes.dark')}</span>
                      </button>
                      <button
                        className={`theme-option ${theme === 'amoled' ? 'active' : ''}`}
                        onClick={() => setTheme('amoled')}
                      >
                        <div className="theme-preview theme-preview-amoled">
                          <div className="theme-preview-bar" />
                          <div className="theme-preview-blocks">
                            <div className="theme-preview-block" />
                            <div className="theme-preview-block" />
                          </div>
                        </div>
                        <span className="theme-label">{t('preferencias.themes.amoled')}</span>
                      </button>
                    </div>
                    <div className="pref-section" style={{ marginTop: '1rem' }}>
                      <label className="pref-label">{t('preferencias.updateNotesLabel')}</label>
                      <button
                        className={`theme-option ${showUpdateModalPref ? 'active' : ''}`}
                        onClick={() => {
                          const newVal = !showUpdateModalPref;
                          setShowUpdateModalPref(newVal);
                          try { safeLocalStorage.setItem('prosper_show_update_modal', newVal ? 'true' : 'false'); } catch {}
                        }}
                      >
                        {showUpdateModalPref ? <><CheckCircle2 size={14} /> {t('preferencias.yes')}</> : <><XCircle size={14} /> {t('preferencias.no')}</>}
                      </button>
                    </div>

                    <div className="pref-section" style={{ marginTop: '1rem' }}>
                      <label className="pref-label">{t('preferencias.privacyLabel')}</label>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        {t('preferencias.privacyHint')}
                      </p>
                      <button
                        className={`theme-option ${showProfile ? 'active' : ''}`}
                        onClick={() => setShowProfile(!showProfile)}
                      >
                        {showProfile ? <><Globe2 size={14} /> {t('preferencias.publicProfile')}</> : <><Lock size={14} /> {t('preferencias.privateProfile')}</>}
                      </button>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
                        {showProfile
                          ? t('preferencias.publicDesc')
                          : t('preferencias.privateDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== NOTIFICACIONES ===== */}
              {activeTab === 'notificaciones' && (
                <div className="settings-panel">
                  <div className="panel-card">
                    <div className="panel-header">
                      <h2 className="panel-title">{t('notificaciones.panelTitle')}</h2>
                      <p className="panel-desc">{t('notificaciones.panelDesc')}</p>
                    </div>

                    <div className="toggle-list">
                      <ToggleRow
                        icon="Globe2"
                        label={t('notificaciones.toggles.push.label')}
                        desc={t('notificaciones.toggles.push.desc')}
                        checked={notifEnabled}
                        onChange={async () => {
                          if (notifSaving) return;
                          setNotifSaving(true);
                          const result = await enableNotifications();
                          setNotifEnabled(result);
                          setNotifSaving(false);
                        }}
                        disabled={notifSaving}
                      />
                      <ToggleRow
                        icon="TrendingUp"
                        label={t('notificaciones.toggles.priceAlerts.label')}
                        desc={t('notificaciones.toggles.priceAlerts.desc')}
                        checked={priceAlerts}
                        onChange={() => setPriceAlerts(!priceAlerts)}
                      />
                      <ToggleRow
                        icon="Wallet"
                        label={t('notificaciones.toggles.budgetAlerts.label')}
                        desc={t('notificaciones.toggles.budgetAlerts.desc')}
                        checked={budgetAlerts}
                        onChange={() => setBudgetAlerts(!budgetAlerts)}
                      />
                      <ToggleRow
                        icon="ClipboardList"
                        label={t('notificaciones.toggles.planInvite.label')}
                        desc={t('notificaciones.toggles.planInvite.desc')}
                        checked={planInviteNotif}
                        onChange={() => setPlanInviteNotif(!planInviteNotif)}
                      />
                      <ToggleRow
                        icon="Heart"
                        label={t('notificaciones.toggles.planContribution.label')}
                        desc={t('notificaciones.toggles.planContribution.desc')}
                        checked={planContributionNotif}
                        onChange={() => setPlanContributionNotif(!planContributionNotif)}
                      />
                      <ToggleRow
                        icon="Clock"
                        label={t('notificaciones.toggles.planReminder.label')}
                        desc={t('notificaciones.toggles.planReminder.desc')}
                        checked={planReminderNotif}
                        onChange={() => setPlanReminderNotif(!planReminderNotif)}
                      />
                      <ToggleRow
                        icon="XCircle"
                        label={t('notificaciones.toggles.planRejected.label')}
                        desc={t('notificaciones.toggles.planRejected.desc')}
                        checked={planRejectedNotif}
                        onChange={() => setPlanRejectedNotif(!planRejectedNotif)}
                      />
                      <ToggleRow
                        icon="DollarSign"
                        label={t('notificaciones.toggles.dollarChange.label')}
                        desc={t('notificaciones.toggles.dollarChange.desc')}
                        checked={dollarChangeNotif}
                        onChange={() => setDollarChangeNotif(!dollarChangeNotif)}
                      />
                      <ToggleRow
                        icon="BarChart3"
                        label={t('notificaciones.toggles.dailyBalance.label')}
                        desc={t('notificaciones.toggles.dailyBalance.desc')}
                        checked={dailyBalanceNotif}
                        onChange={() => setDailyBalanceNotif(!dailyBalanceNotif)}
                      />
                      <ToggleRow
                        icon="Rocket"
                        label={t('notificaciones.toggles.appUpdate.label')}
                        desc={t('notificaciones.toggles.appUpdate.desc')}
                        checked={appUpdateNotif}
                        onChange={() => setAppUpdateNotif(!appUpdateNotif)}
                      />
                      <ToggleRow
                        icon="CalendarDays"
                        label={t('notificaciones.toggles.calendarReminder.label')}
                        desc={t('notificaciones.toggles.calendarReminder.desc')}
                        checked={calendarReminderNotif}
                        onChange={() => setCalendarReminderNotif(!calendarReminderNotif)}
                      />
                    </div>
                  </div>

                  <div className="panel-card" style={{ marginTop: 16 }}>
                    <div className="panel-header">
                      <h2 className="panel-title">{t('notificaciones.test.title')}</h2>
                      <p className="panel-desc">{t('notificaciones.test.desc')}</p>
                    </div>
                    <div className="notification-test-grid">
                      {([
                        ['plan_invite', 'ClipboardList', 'planInvite'],
                        ['plan_contribution', 'Heart', 'planContribution'],
                        ['plan_reminder', 'Clock', 'planReminder'],
                        ['plan_rejected', 'XCircle', 'planRejected'],
                        ['dollar_change', 'DollarSign', 'dollarChange'],
                        ['daily_balance', 'BarChart3', 'dailyBalance'],
                        ['app_update', 'Rocket', 'appUpdate'],
                        ['calendar_reminder', 'CalendarDays', 'calendarReminder'],
                      ] as [NotificationType, string, string][]).map(([type, icon, i18nKey]) => (
                        <button
                          key={type}
                          className="notification-test-btn"
                          onClick={async () => {
                            if (!user?.uid) return;
                            try {
                              await triggerTestNotification(type, user.uid);
                              setSuccessMsg(t('notificaciones.test.sent'));
                              setTimeout(() => setSuccessMsg(''), 3000);
                            } catch {
                              setErrorMsg(t('notificaciones.test.error'));
                              setTimeout(() => setErrorMsg(''), 3000);
                            }
                          }}
                        >
                          <InlineIcon icon={icon} size={16} />
                          <span>{t(`notificaciones.toggles.${i18nKey}.label`)}</span>
                          <span className="test-badge">{t('notificaciones.test.button')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== SEGURIDAD ===== */}
              {activeTab === 'seguridad' && (
                <div className="settings-panel">
                  <div className="panel-card">
                    <div className="panel-header">
                      <h2 className="panel-title">{t('seguridad.sessionsTitle')}</h2>
                      <p className="panel-desc">{t('seguridad.sessionsDesc')}</p>
                    </div>

                    {devices.length === 0 ? (
                      <div className="session-card">
                        <div className="session-icon"><InlineIcon icon="Laptop" size={20} /></div>
                        <div className="session-info">
                          <span className="session-name">{t('seguridad.thisDevice')}</span>
                          <span className="session-detail">{t('seguridad.sessionDetail')}</span>
                        </div>
                        <span className="session-badge">{t('seguridad.currentBadge')}</span>
                      </div>
                    ) : (
                      <div className="device-list">
                        {[...devices]
                          .sort((a, b) => b.lastActive - a.lastActive)
                          .map((device) => {
                          const isCurrent = device.deviceId === currentDeviceId;
                          const online = isDeviceOnline(device);
                          return (
                            <div
                              key={device.deviceId}
                              className={`session-card ${isCurrent ? 'session-current' : ''} ${!online ? 'session-offline' : ''}`}
                            >
                              <div className="session-main">
                                <div className="session-icon">
                                  <InlineIcon icon={getDeviceIcon(device.deviceType)} size={22} />
                                </div>
                                <div className="session-info">
                                  <span className="session-name">
                                    {device.deviceName}
                                    {isCurrent && (
                                      <span className="session-badge-inline">{t('seguridad.currentBadge')}</span>
                                    )}
                                    {!isCurrent && !online && (
                                      <span className="session-badge-offline">{t('seguridad.device.offlineBadge')}</span>
                                    )}
                                  </span>
                                  <span className="session-detail">
                                    {device.browser} · {device.os}
                                    <span className="session-detail-sep"> · </span>
                                    <span className={online ? 'session-detail-active' : 'session-detail-inactive'}>
                                      {online ? formatLastActive(device.lastActive) : t('seguridad.device.offlineDetail')}
                                    </span>
                                  </span>
                                </div>
                              </div>
                              <div className="session-actions">
                                <button
                                  className={`session-action-btn ${isCurrent ? 'session-action-current' : ''}`}
                                  onClick={() => handleRemoveDevice(device.deviceId)}
                                  disabled={removingDevice === device.deviceId || isCurrent}
                                  title={isCurrent ? t('seguridad.logoutThisDevice') : t('seguridad.logoutDevice')}
                                >
                                  {removingDevice === device.deviceId ? (
                                    <span className="spinner-small" />
                                  ) : (
                                    <>
                                      <LogOut size={14} />
                                      <span className="session-action-text">
                                        {isCurrent ? t('seguridad.logoutThisDevice') : t('seguridad.logoutDevice')}
                                      </span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Password Change Section */}
                  {isEmailUser && (
                    <div className="panel-card">
                      <div className="panel-header">
                        <h2 className="panel-title">
                          <Lock size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
                          {t('seguridad.changePassword.title', { defaultValue: 'Cambiar Contraseña' })}
                        </h2>
                        <p className="panel-desc">{t('seguridad.changePassword.desc', { defaultValue: 'Actualiza tu contraseña de acceso' })}</p>
                      </div>

                      {!showPasswordForm ? (
                        <button
                          className="btn-outline-security"
                          onClick={() => setShowPasswordForm(true)}
                        >
                          <Lock size={14} /> {t('seguridad.changePassword.btn', { defaultValue: 'Cambiar contraseña' })}
                        </button>
                      ) : (
                        <div className="password-change-form">
                          <div className="password-field">
                            <label>{t('seguridad.changePassword.current', { defaultValue: 'Contraseña actual' })}</label>
                            <input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder={t('seguridad.changePassword.currentPlaceholder', { defaultValue: 'Tu contraseña actual' })}
                            />
                          </div>
                          <div className="password-field">
                            <label>{t('seguridad.changePassword.new', { defaultValue: 'Nueva contraseña' })}</label>
                            <input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder={t('seguridad.changePassword.newPlaceholder', { defaultValue: 'Mínimo 8 caracteres' })}
                            />
                            <div className="password-hints-security">
                              <span className={`password-hint ${newPassword.length >= 8 ? 'valid' : ''}`}>
                                {newPassword.length >= 8 ? '✓' : '•'} {t('login.passwordHints.minLength', { defaultValue: 'Mínimo 8 caracteres' })}
                              </span>
                              <span className={`password-hint ${/[A-Z]/.test(newPassword) ? 'valid' : ''}`}>
                                {/[A-Z]/.test(newPassword) ? '✓' : '•'} {t('login.passwordHints.uppercase', { defaultValue: 'Una mayúscula' })}
                              </span>
                              <span className={`password-hint ${/[a-z]/.test(newPassword) ? 'valid' : ''}`}>
                                {/[a-z]/.test(newPassword) ? '✓' : '•'} {t('login.passwordHints.lowercase', { defaultValue: 'Una minúscula' })}
                              </span>
                              <span className={`password-hint ${/[0-9]/.test(newPassword) ? 'valid' : ''}`}>
                                {/[0-9]/.test(newPassword) ? '✓' : '•'} {t('login.passwordHints.number', { defaultValue: 'Un número' })}
                              </span>
                            </div>
                          </div>
                          <div className="password-field">
                            <label>{t('seguridad.changePassword.confirm', { defaultValue: 'Confirmar nueva contraseña' })}</label>
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder={t('seguridad.changePassword.confirmPlaceholder', { defaultValue: 'Repite la nueva contraseña' })}
                            />
                          </div>
                          <div className="password-change-actions">
                            <button
                              className="btn-cancel"
                              onClick={() => {
                                setShowPasswordForm(false);
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                              }}
                            >
                              {t('common:buttons.cancel', { defaultValue: 'Cancelar' })}
                            </button>
                            <button
                              className="btn-save"
                              onClick={handleChangePassword}
                              disabled={changingPassword}
                            >
                              {changingPassword ? (
                                <span className="btn-loading"><span className="spinner" /> {t('seguridad.changePassword.saving', { defaultValue: 'Guardando...' })}</span>
                              ) : (
                                t('seguridad.changePassword.submit', { defaultValue: 'Actualizar contraseña' })
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="panel-card danger-card">
                    <div className="panel-header">
                      <div className="danger-header">
                        <div className="danger-icon-wrap"><InlineIcon icon="AlertTriangle" size={20} /></div>
                        <div>
                          <h2 className="danger-title">{t('seguridad.deleteAccount.title')}</h2>
                          <p className="danger-desc">{t('seguridad.deleteAccount.desc')}</p>
                        </div>
                      </div>
                    </div>

                    {!showDeleteConfirm ? (
                      <button
                        className="btn-danger"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        {t('seguridad.deleteAccount.btn')}
                      </button>
                    ) : (
                      <div className="delete-confirm">
                        <p className="delete-confirm-label">
                          {t('seguridad.deleteAccount.confirmLabel', { defaultValue: 'Esta acción es irreversible. Escribe ELIMINAR para confirmar.' })}
                        </p>
                        <input
                          className="delete-confirm-input"
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                          placeholder={t('seguridad.deleteAccount.placeholder')}
                        />
                        <div className="delete-confirm-actions">
                          <button
                            className="btn-cancel"
                            onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                          >
                            {t('seguridad.deleteAccount.cancel')}
                          </button>
                          <button
                            className="btn-danger-confirm"
                            onClick={handleDeleteAccount}
                            disabled={deleteConfirmText !== t('seguridad.deleteAccount.placeholder') || deleting}
                          >
                            {deleting ? t('seguridad.deleteAccount.deleting') : t('seguridad.deleteAccount.confirmBtn')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="panel-card warning-card">
                    <div className="panel-header">
                      <div className="warning-header">
                        <div className="warning-icon-wrap"><InlineIcon icon="Trash2" size={20} /></div>
                        <div>
                          <h2 className="warning-title">{t('seguridad.wipeData.title')}</h2>
                          <p className="warning-desc">{t('seguridad.wipeData.desc')}</p>
                        </div>
                      </div>
                    </div>

                    {!showWipeConfirm ? (
                      <button
                        className="btn-warning"
                        onClick={() => setShowWipeConfirm(true)}
                      >
                        {t('seguridad.wipeData.btn')}
                      </button>
                    ) : (
                      <div className="delete-confirm">
                        <p className="delete-confirm-label">
                          {t('seguridad.wipeData.confirmLabel', { defaultValue: 'Escribe BORRAR para confirmar que deseas eliminar todos tus datos.' })}
                        </p>
                        <input
                          className="delete-confirm-input"
                          type="text"
                          value={wipeConfirmText}
                          onChange={(e) => setWipeConfirmText(e.target.value.toUpperCase())}
                          placeholder={t('seguridad.wipeData.placeholder')}
                        />
                        <div className="delete-confirm-actions">
                          <button
                            className="btn-cancel"
                            onClick={() => { setShowWipeConfirm(false); setWipeConfirmText(''); }}
                          >
                            {t('seguridad.wipeData.cancel')}
                          </button>
                          <button
                            className="btn-warning-confirm"
                            onClick={handleWipeAllData}
                            disabled={wipeConfirmText !== t('seguridad.wipeData.placeholder') || wipingData}
                          >
                            {wipingData ? t('seguridad.wipeData.wiping') : t('seguridad.wipeData.confirmBtn')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="settings-footer">
            {t('footer')}
          </div>

          <style>{`
            /* ===== BASE ===== */
            .settings-page {
              width: 100%;
              max-width: 960px;
              margin: 0 auto;
              padding: 20px 16px;
            }

            /* Toast */
            .toast {
              padding: 12px 16px;
              border-radius: 10px;
              margin-bottom: 16px;
              display: flex;
              align-items: center;
              gap: 8px;
              animation: toastIn 0.3s ease;
              font-size: 0.8125rem;
              font-weight: 600;
            }
            .toast-success {
              background: rgba(61,204,142,0.1);
              border: 1px solid rgba(61,204,142,0.2);
              color: var(--color-prosper-green);
            }
            .toast-error {
              background: rgba(239,68,68,0.1);
              border: 1px solid rgba(239,68,68,0.2);
              color: #EF4444;
            }
            @keyframes toastIn {
              from { opacity: 0; transform: translateY(-8px); }
              to { opacity: 1; transform: translateY(0); }
            }

            /* Header */
            .settings-header {
              margin-bottom: 24px;
            }
            .settings-title {
              font-size: 1.5rem;
              font-weight: 800;
              color: var(--text-primary);
              margin: 0 0 4px 0;
              letter-spacing: -0.02em;
            }
            .settings-subtitle {
              font-size: 0.8125rem;
              color: var(--text-secondary);
              margin: 0;
            }

            /* Mobile Tabs */
            .mobile-tabs {
              display: flex;
              gap: 6px;
              margin-bottom: 20px;
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
              scrollbar-width: none;
              padding-bottom: 4px;
            }
            .mobile-tabs::-webkit-scrollbar { display: none; }
            .mobile-tab {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 8px 14px;
              border-radius: 10px;
              border: 1px solid var(--border-default);
              background: var(--bg-card);
              color: var(--text-secondary);
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
              white-space: nowrap;
              transition: all 0.2s;
              flex-shrink: 0;
            }
            .mobile-tab:hover {
              border-color: var(--color-prosper-green);
              color: var(--text-primary);
            }
            .mobile-tab.active {
              background: var(--color-prosper-green);
              border-color: var(--color-prosper-green);
              color: white;
            }
            .mobile-tab-icon { font-size: 0.875rem; }

            /* Layout */
            .settings-layout {
              display: flex;
              gap: 24px;
            }

            /* Desktop Sidebar */
            .settings-sidebar {
              display: none;
              flex-direction: column;
              gap: 4px;
              width: 200px;
              flex-shrink: 0;
              position: sticky;
              top: 80px;
              align-self: flex-start;
            }
            .sidebar-tab {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 14px;
              border-radius: 10px;
              border: none;
              background: transparent;
              color: var(--text-secondary);
              font-size: 0.8125rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s;
              text-align: left;
              width: 100%;
            }
            .sidebar-tab:hover {
              background: var(--bg-input);
              color: var(--text-primary);
            }
            .sidebar-tab.active {
              background: rgba(61,204,142,0.1);
              color: var(--color-prosper-green);
            }
            .sidebar-tab-icon { font-size: 1rem; }

            /* Content */
            .settings-content {
              flex: 1;
              min-width: 0;
            }
            .settings-panel {
              display: flex;
              flex-direction: column;
              gap: 20px;
              animation: fadeIn 0.25s ease;
            }
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(6px); }
              to { opacity: 1; transform: translateY(0); }
            }

            /* Panel Card */
            .panel-card {
              background: var(--bg-card);
              border: 1px solid var(--border-default);
              border-radius: 14px;
              padding: 24px;
            }
            .panel-header {
              margin-bottom: 24px;
            }
            .panel-title {
              font-size: 1.0625rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0 0 4px 0;
            }
            .panel-desc {
              font-size: 0.75rem;
              color: var(--text-tertiary);
              margin: 0;
            }

            /* Profile */
            .profile-grid {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 24px;
            }
            .avatar-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
            }
            .avatar-circle {
              width: 96px;
              height: 96px;
              border-radius: 50%;
              background: linear-gradient(135deg, var(--color-prosper-green), var(--color-prosper-navy));
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              position: relative;
              overflow: hidden;
              border: 3px solid rgba(61,204,142,0.15);
              transition: border-color 0.2s, transform 0.2s;
            }
            .avatar-circle:hover {
              border-color: var(--color-prosper-green);
              transform: scale(1.03);
            }
            .avatar-initial {
              font-size: 2.25rem;
              font-weight: 700;
              color: white;
            }
            .avatar-img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .avatar-overlay {
              position: absolute;
              inset: 0;
              background: rgba(0,0,0,0.5);
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 0;
              transition: opacity 0.2s;
            }
            .avatar-circle:hover .avatar-overlay { opacity: 1; }
            .avatar-hint {
              font-size: 0.6875rem;
              color: var(--text-tertiary);
              margin: 0;
            }

            .profile-fields {
              width: 100%;
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .field-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 16px;
            }
            .field {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .field-label {
              font-size: 0.6875rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--text-tertiary);
            }
            .field-input {
              width: 100%;
              padding: 10px 14px;
              border-radius: 10px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-primary);
              font-size: 0.875rem;
              outline: none;
              transition: border-color 0.2s, box-shadow 0.2s;
              font-family: inherit;
              box-sizing: border-box;
            }
            .field-input:focus {
              border-color: var(--color-prosper-green);
              box-shadow: 0 0 0 3px rgba(61,204,142,0.12);
            }
            .field-disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            .field-textarea {
              width: 100%;
              padding: 10px 14px;
              border-radius: 10px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-primary);
              font-size: 0.875rem;
              outline: none;
              resize: none;
              line-height: 1.5;
              transition: border-color 0.2s, box-shadow 0.2s;
              font-family: inherit;
              box-sizing: border-box;
            }
            .field-textarea:focus {
              border-color: var(--color-prosper-green);
              box-shadow: 0 0 0 3px rgba(61,204,142,0.12);
            }

            .btn-save {
              padding: 10px 24px;
              background: var(--color-prosper-green);
              color: white;
              border: none;
              border-radius: 10px;
              font-size: 0.8125rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
              align-self: flex-start;
            }
            .btn-save:hover:not(:disabled) {
              filter: brightness(1.08);
              transform: translateY(-1px);
            }
            .btn-save:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
            .btn-loading {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .spinner {
              width: 14px;
              height: 14px;
              border: 2px solid rgba(255,255,255,0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 0.6s linear infinite;
            }
            @keyframes spin { to { transform: rotate(360deg); } }

            /* Plan Card */
            .plan-card {
              background: linear-gradient(135deg, rgba(61,204,142,0.06), var(--bg-card));
              border-color: rgba(61,204,142,0.15);
            }
            .plan-content {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 16px;
            }
            .plan-badge {
              padding: 4px 12px;
              border-radius: 20px;
              background: rgba(61,204,142,0.12);
              color: var(--color-prosper-green);
              font-size: 0.625rem;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .plan-title {
              font-size: 1rem;
              font-weight: 700;
              color: var(--text-primary);
              margin: 0;
            }
            .plan-desc {
              font-size: 0.75rem;
              color: var(--text-secondary);
              margin: 2px 0 0 0;
            }
            .plan-features {
              display: flex;
              flex-wrap: wrap;
              gap: 12px;
            }
            .plan-feature {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 8px 14px;
              border-radius: 8px;
              background: var(--bg-input);
              font-size: 0.75rem;
              font-weight: 500;
              color: var(--text-secondary);
            }
            .plan-feature-icon { font-size: 1rem; }

            /* Preferences */
            .pref-section {
              margin-bottom: 24px;
            }
            .pref-section:last-child { margin-bottom: 0; }
            .pref-label {
              display: block;
              font-size: 0.6875rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--text-tertiary);
              margin-bottom: 10px;
            }
            .option-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
            }
            .currency-grid {
              grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            }
            .option-btn {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
              padding: 12px 8px;
              border-radius: 10px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-secondary);
              cursor: pointer;
              transition: all 0.2s;
              font-family: inherit;
            }
            .option-btn:hover {
              border-color: var(--color-prosper-green);
              background: var(--bg-card);
            }
            .option-btn.active {
              border-color: var(--color-prosper-green);
              background: rgba(61,204,142,0.08);
              color: var(--color-prosper-green);
            }
            .option-flag { font-size: 1.375rem; line-height: 1; }
            .option-text { font-size: 0.6875rem; font-weight: 600; }

            /* Theme Selector */
            .theme-selector {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            .theme-option {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
              padding: 16px;
              border-radius: 12px;
              border: 2px solid var(--border-default);
              background: transparent;
              cursor: pointer;
              transition: all 0.2s;
              font-family: inherit;
            }
            .theme-option:hover { border-color: var(--color-prosper-green); }
            .theme-option.active {
              border-color: var(--color-prosper-green);
              background: rgba(61,204,142,0.06);
            }
            .theme-preview {
              width: 100%;
              height: 80px;
              border-radius: 8px;
              padding: 8px;
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .theme-preview-light {
              background: #f8f9fa;
              border: 1px solid #e5e7eb;
            }
            .theme-preview-dark {
              background: #1a1a2e;
              border: 1px solid #2d2d44;
            }
            .theme-preview-amoled {
              background: #000000;
              border: 1px solid #333333;
            }
            .theme-preview-bar {
              height: 8px;
              border-radius: 4px;
              width: 40%;
            }
            .theme-preview-light .theme-preview-bar { background: #d1d5db; }
            .theme-preview-dark .theme-preview-bar { background: #3d3d5c; }
            .theme-preview-amoled .theme-preview-bar { background: #555555; }
            .theme-preview-blocks {
              display: flex;
              gap: 6px;
              flex: 1;
            }
            .theme-preview-block {
              flex: 1;
              border-radius: 4px;
            }
            .theme-preview-light .theme-preview-block { background: #e5e7eb; }
            .theme-preview-dark .theme-preview-block { background: #2d2d44; }
            .theme-preview-amoled .theme-preview-block { background: #333333; }
            .theme-label {
              font-size: 0.8125rem;
              font-weight: 600;
              color: var(--text-primary);
            }

            /* Toggle List */
            .toggle-list {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .toggle-section-divider {
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 8px 0;
              margin: 4px 0;
            }
            .toggle-section-divider span {
              font-size: 0.75rem;
              font-weight: 700;
              color: var(--text-tertiary);
              text-transform: uppercase;
              letter-spacing: 0.05em;
              padding: 4px 12px;
              border-radius: 999px;
              background: rgba(61,204,142,0.08);
            }
            .toggle-row {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 14px 16px;
              border-radius: 10px;
              background: var(--bg-input);
              transition: background 0.15s;
            }
            .toggle-row:hover { background: var(--bg-card-hover); }
            .toggle-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .toggle-icon {
              width: 36px;
              height: 36px;
              border-radius: 10px;
              background: rgba(61,204,142,0.08);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1rem;
              color: var(--text-primary);
            }
            .toggle-text { display: flex; flex-direction: column; }
            .toggle-label {
              font-size: 0.8125rem;
              font-weight: 600;
              color: var(--text-primary);
            }
            .toggle-desc {
              font-size: 0.6875rem;
              color: var(--text-tertiary);
            }
            .toggle-switch {
              width: 44px;
              height: 24px;
              border-radius: 12px;
              background: var(--border-default);
              border: none;
              cursor: pointer;
              position: relative;
              transition: background 0.2s;
              flex-shrink: 0;
            }
            .toggle-switch.active { background: var(--color-prosper-green); }
            .notification-test-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
            }
            .notification-test-btn {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 12px;
              border-radius: 10px;
              background: var(--bg-input);
              border: 1px solid transparent;
              color: var(--text-primary);
              font-size: 0.8125rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.15s;
              text-align: left;
            }
            .notification-test-btn:hover {
              background: var(--bg-card-hover);
              border-color: var(--color-prosper-green);
            }
            .notification-test-btn span { flex: 1; }
            .test-badge {
              font-size: 0.65rem;
              font-weight: 600;
              text-transform: uppercase;
              padding: 3px 8px;
              border-radius: 999px;
              background: rgba(61,204,142,0.12);
              color: var(--color-prosper-green);
              flex: 0 0 auto !important;
            }
            @media (max-width: 480px) {
              .notification-test-grid { grid-template-columns: 1fr; }
            }
            .toggle-switch::after {
              content: '';
              position: absolute;
              width: 18px;
              height: 18px;
              border-radius: 50%;
              background: white;
              top: 3px;
              left: 3px;
              transition: transform 0.2s;
              box-shadow: 0 1px 3px rgba(0,0,0,0.15);
            }
            .toggle-switch.active::after { transform: translateX(20px); }

            /* Session / Devices */
            .device-list {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .session-card {
              display: flex;
              align-items: center;
              gap: 14px;
              padding: 16px;
              border-radius: 10px;
              background: var(--bg-input);
              transition: all 0.15s;
            }
            .session-card.session-current {
              border: 1px solid rgba(61,204,142,0.3);
              background: rgba(61,204,142,0.06);
            }
            .session-card.session-offline {
              opacity: 0.65;
              background: var(--bg-card);
            }
            .session-card.session-admin {
              border: 1.5px solid rgba(245, 158, 11, 0.35);
              background: rgba(245, 158, 11, 0.04);
            }
            .session-card.session-pending {
              border: 1px solid rgba(139, 92, 246, 0.25);
              background: rgba(139, 92, 246, 0.03);
            }
            .session-badge-admin-inline {
              padding: 2px 8px;
              border-radius: 4px;
              background: rgba(245, 158, 11, 0.12);
              color: #F59E0B;
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              display: inline-flex;
              align-items: center;
              gap: 3px;
            }
            .session-badge-verified-inline {
              padding: 2px 8px;
              border-radius: 4px;
              background: rgba(61, 204, 142, 0.12);
              color: var(--color-prosper-green);
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              display: inline-flex;
              align-items: center;
              gap: 3px;
            }
            .session-main {
              display: flex;
              align-items: center;
              gap: 14px;
              flex: 1;
              min-width: 0;
            }
            .session-icon { font-size: 1.5rem; color: var(--text-primary); flex-shrink: 0; }
            .session-info {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 2px;
              min-width: 0;
            }
            .session-name {
              font-size: 0.875rem;
              font-weight: 600;
              color: var(--text-primary);
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }
            .session-detail {
              font-size: 0.6875rem;
              color: var(--text-tertiary);
            }
            .session-detail-sep { margin: 0 2px; }
            .session-detail-active { color: var(--color-prosper-green); }
            .session-detail-inactive { color: var(--text-tertiary); font-style: italic; }
            .session-badge {
              padding: 4px 10px;
              border-radius: 6px;
              background: rgba(61,204,142,0.1);
              color: var(--color-prosper-green);
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              flex-shrink: 0;
            }
            .session-badge-inline {
              padding: 2px 8px;
              border-radius: 4px;
              background: rgba(61,204,142,0.12);
              color: var(--color-prosper-green);
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
            }
            .session-badge-offline {
              padding: 2px 8px;
              border-radius: 4px;
              background: rgba(156,163,175,0.15);
              color: var(--text-tertiary);
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
            }
            .session-admin-badge {
              display: flex;
              align-items: center;
              gap: 4px;
              padding: 4px 10px;
              border-radius: 6px;
              background: rgba(245, 158, 11, 0.12);
              color: #F59E0B;
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              flex-shrink: 0;
            }
            .session-actions {
              display: flex;
              align-items: center;
              gap: 8px;
              flex-shrink: 0;
            }

            /* Admin-only badge for restricted sections */
            .admin-only-badge {
              display: inline-flex;
              align-items: center;
              gap: 3px;
              padding: 2px 8px;
              border-radius: 4px;
              background: rgba(245, 158, 11, 0.12);
              color: #F59E0B;
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              margin-left: 8px;
              vertical-align: middle;
            }
            .panel-disabled {
              opacity: 0.6;
              pointer-events: none;
              filter: grayscale(0.3);
            }
            .panel-disabled .btn-outline-security,
            .panel-disabled .btn-danger,
            .panel-disabled .btn-warning {
              opacity: 0.5;
              cursor: not-allowed;
            }
            .session-action-btn {
              display: flex;
              align-items: center;
              gap: 6px;
              padding: 8px 14px;
              border-radius: 8px;
              border: 1px solid var(--border-default);
              background: var(--bg-card);
              color: var(--text-secondary);
              font-size: 0.75rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s;
              flex-shrink: 0;
              white-space: nowrap;
            }
            .session-action-btn:hover {
              border-color: #EF4444;
              color: #EF4444;
              background: rgba(239,68,68,0.06);
            }
            .session-action-btn.session-action-current:hover {
              border-color: #F59E0B;
              color: #F59E0B;
              background: rgba(245,158,11,0.06);
            }
            .session-action-btn.session-action-admin:hover {
              border-color: var(--color-prosper-green);
              color: var(--color-prosper-green);
              background: rgba(61,204,142,0.06);
            }
            .session-action-btn.session-action-request:hover {
              border-color: #3B82F6;
              color: #3B82F6;
              background: rgba(59,130,246,0.06);
            }
            .session-action-btn.session-action-verify:hover {
              border-color: #8B5CF6;
              color: #8B5CF6;
              background: rgba(139,92,246,0.06);
            }
            .session-action-btn.session-action-waiting {
              border-color: rgba(245,158,11,0.3);
              color: #F59E0B;
              background: rgba(245,158,11,0.06);
              cursor: default;
            }
            .session-action-btn.session-action-cancel:hover {
              border-color: #EF4444;
              color: #EF4444;
              background: rgba(239,68,68,0.06);
            }
            .session-action-btn.session-action-disabled {
              opacity: 0.35;
              cursor: not-allowed;
              border-color: var(--border-default);
              color: var(--text-tertiary);
            }
            .session-action-btn:disabled {
              opacity: 0.4;
              cursor: not-allowed;
              border-color: var(--border-default);
              color: var(--text-tertiary);
              background: var(--bg-card);
            }
            .spinner-small {
              width: 14px;
              height: 14px;
              border: 2px solid rgba(255,255,255,0.3);
              border-top-color: currentColor;
              border-radius: 50%;
              animation: spin 0.6s linear infinite;
            }

            /* Admin Info Banner */
            .admin-info-banner {
              display: flex;
              align-items: flex-start;
              gap: 12px;
              padding: 14px 16px;
              border-radius: 10px;
              background: rgba(245, 158, 11, 0.06);
              border: 1px solid rgba(245, 158, 11, 0.15);
              margin-bottom: 16px;
              color: #F59E0B;
            }
            .admin-info-banner svg { flex-shrink: 0; margin-top: 1px; }
            .admin-info-text {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .admin-info-text strong {
              font-size: 0.8125rem;
              font-weight: 600;
              color: var(--text-primary);
            }
            .admin-info-text span {
              font-size: 0.75rem;
              color: var(--text-secondary);
              line-height: 1.4;
            }

            /* Admin Requests Section */
            .admin-requests-section {
              margin-bottom: 16px;
              padding: 14px 16px;
              border-radius: 10px;
              background: var(--bg-card);
              border: 1px solid var(--border-default);
            }
            .admin-requests-title {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 0.8125rem;
              font-weight: 600;
              color: var(--text-primary);
              margin: 0 0 12px 0;
              padding-bottom: 10px;
              border-bottom: 1px solid var(--border-default);
            }
            .admin-request-card {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              padding: 12px;
              border-radius: 8px;
              background: var(--bg-input);
              margin-bottom: 8px;
            }
            .admin-request-card:last-child { margin-bottom: 0; }
            .admin-request-card.verified {
              border: 1px solid rgba(61, 204, 142, 0.2);
              background: rgba(61, 204, 142, 0.04);
            }
            .admin-request-info {
              display: flex;
              align-items: center;
              gap: 12px;
              flex: 1;
              min-width: 0;
            }
            .admin-request-info > div {
              display: flex;
              flex-direction: column;
              gap: 2px;
              min-width: 0;
            }
            .admin-request-name {
              font-size: 0.8125rem;
              font-weight: 600;
              color: var(--text-primary);
            }
            .admin-request-detail {
              font-size: 0.6875rem;
              color: var(--text-tertiary);
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
            }
            .admin-request-status {
              display: inline-flex;
              align-items: center;
              gap: 4px;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
            }
            .admin-request-status.pending {
              background: rgba(139, 92, 246, 0.1);
              color: #8B5CF6;
            }
            .admin-request-status.verified {
              background: rgba(61, 204, 142, 0.1);
              color: var(--color-prosper-green);
            }

            /* Password Change Form */
            .btn-outline-security {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 10px 18px;
              border-radius: 10px;
              border: 1.5px solid var(--border-default);
              background: transparent;
              color: var(--text-secondary);
              font-size: 0.8125rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.15s;
              font-family: inherit;
            }
            .btn-outline-security:hover {
              border-color: var(--color-prosper-green);
              color: var(--color-prosper-green);
              background: rgba(61,204,142,0.06);
            }
            .password-change-form {
              display: flex;
              flex-direction: column;
              gap: 16px;
            }
            .password-field {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            .password-field label {
              font-size: 0.6875rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: var(--text-tertiary);
            }
            .password-field input {
              padding: 10px 14px;
              border-radius: 10px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-primary);
              font-size: 0.875rem;
              outline: none;
              transition: border-color 0.2s, box-shadow 0.2s;
              font-family: inherit;
              box-sizing: border-box;
            }
            .password-field input:focus {
              border-color: var(--color-prosper-green);
              box-shadow: 0 0 0 3px rgba(61,204,142,0.12);
            }
            .password-hints-security {
              display: flex;
              flex-wrap: wrap;
              gap: 6px 12px;
              margin-top: 4px;
            }
            .password-hints-security .password-hint {
              font-size: 0.6875rem;
              font-weight: 500;
              color: var(--text-tertiary);
              transition: color 0.2s;
            }
            .password-hints-security .password-hint.valid {
              color: var(--color-prosper-green);
            }
            .password-change-actions {
              display: flex;
              gap: 10px;
              justify-content: flex-end;
              margin-top: 4px;
            }

            /* Danger */
            .danger-card {
              border-color: rgba(239,68,68,0.15);
              background: rgba(239,68,68,0.03);
            }
            [data-theme="dark"] .danger-card {
              background: rgba(127,29,29,0.08);
              border-color: rgba(239,68,68,0.2);
            }

            /* Warning */
            .warning-card {
              border-color: rgba(245,158,11,0.15);
              background: rgba(245,158,11,0.03);
            }
            [data-theme="dark"] .warning-card {
              background: rgba(120,53,15,0.08);
              border-color: rgba(245,158,11,0.2);
            }
            .warning-header {
              display: flex;
              align-items: flex-start;
              gap: 14px;
            }
            .warning-icon-wrap {
              width: 44px;
              height: 44px;
              border-radius: 10px;
              background: rgba(245,158,11,0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
              flex-shrink: 0;
              color: var(--text-primary);
            }
            .warning-title {
              font-size: 1rem;
              font-weight: 700;
              color: #78350F;
              margin: 0 0 4px 0;
            }
            [data-theme="dark"] .warning-title { color: #FCD34D; }
            .warning-desc {
              font-size: 0.75rem;
              color: #92400E;
              margin: 0;
              line-height: 1.5;
            }
            [data-theme="dark"] .warning-desc { color: #FDE68A; }

            .btn-warning {
              width: 100%;
              padding: 12px;
              background: #F59E0B;
              color: white;
              border: none;
              border-radius: 10px;
              font-size: 0.8125rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
            }
            .btn-warning:hover { background: #D97706; }

            .btn-warning-confirm {
              flex: 1;
              padding: 10px;
              border-radius: 10px;
              border: none;
              background: #F59E0B;
              color: white;
              font-size: 0.8125rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
              font-family: inherit;
            }
            .btn-warning-confirm:hover:not(:disabled) { background: #D97706; }
            .btn-warning-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
            .danger-header {
              display: flex;
              align-items: flex-start;
              gap: 14px;
            }
            .danger-icon-wrap {
              width: 44px;
              height: 44px;
              border-radius: 10px;
              background: rgba(239,68,68,0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
              flex-shrink: 0;
              color: var(--text-primary);
            }
            .danger-title {
              font-size: 1rem;
              font-weight: 700;
              color: #7F1D1D;
              margin: 0 0 4px 0;
            }
            [data-theme="dark"] .danger-title { color: #FCA5A5; }
            .danger-desc {
              font-size: 0.75rem;
              color: #991B1B;
              margin: 0;
              line-height: 1.5;
            }
            [data-theme="dark"] .danger-desc { color: #FECACA; }
            .panel-header { margin-bottom: 20px; }
            .danger-card .panel-header { margin-bottom: 16px; }

            .btn-danger {
              width: 100%;
              padding: 12px;
              background: #EF4444;
              color: white;
              border: none;
              border-radius: 10px;
              font-size: 0.8125rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
            }
            .btn-danger:hover { background: #DC2626; }

            .delete-confirm {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .delete-confirm-label {
              font-size: 0.8125rem;
              color: var(--text-secondary);
              margin: 0;
            }
            .delete-confirm-label strong { color: #EF4444; }
            .delete-confirm-input {
              width: 100%;
              padding: 10px 14px;
              border-radius: 10px;
              border: 1px solid rgba(239,68,68,0.3);
              background: var(--bg-input);
              color: var(--text-primary);
              font-size: 0.875rem;
              outline: none;
              font-family: inherit;
              box-sizing: border-box;
              text-transform: uppercase;
              letter-spacing: 0.1em;
            }
            .delete-confirm-input:focus {
              border-color: #EF4444;
              box-shadow: 0 0 0 3px rgba(239,68,68,0.12);
            }
            .delete-confirm-actions {
              display: flex;
              gap: 10px;
            }
            .btn-cancel {
              flex: 1;
              padding: 10px;
              border-radius: 10px;
              border: 1px solid var(--border-default);
              background: var(--bg-input);
              color: var(--text-secondary);
              font-size: 0.8125rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              font-family: inherit;
            }
            .btn-cancel:hover { background: var(--bg-card-hover); }
            .btn-danger-confirm {
              flex: 1;
              padding: 10px;
              border-radius: 10px;
              border: none;
              background: #EF4444;
              color: white;
              font-size: 0.8125rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
              font-family: inherit;
            }
            .btn-danger-confirm:hover:not(:disabled) { background: #DC2626; }
            .btn-danger-confirm:disabled { opacity: 0.4; cursor: not-allowed; }

            /* Floating Save Bar */
.settings-save-bar {
              position: sticky;
              top: 0;
              left: 0;
              right: 0;
              background: var(--bg-page);
              border-bottom: 1px solid var(--border-default);
              border-radius: 0 0 12px 12px;
              padding: 12px 16px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              z-index: 100;
              max-width: 100%;
              box-sizing: border-box;
              margin-bottom: 16px;
            }
            .settings-save-bar-inner {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              max-width: 100%;
              overflow: hidden;
            }
            .settings-save-hint {
              font-size: 0.6875rem;
              color: var(--text-tertiary);
              white-space: nowrap;
            }
            .settings-save-bar .btn-save {
              flex-shrink: 0;
              min-width: auto;
            }

            /* Footer */
            .settings-footer {
              margin-top: 32px;
              padding-top: 20px;
              border-top: 1px solid var(--border-default);
              text-align: center;
              font-size: 0.625rem;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              color: var(--text-tertiary);
            }

            /* ════════════════════════════════════════════════════════════════════
               CURRENCY CARDS GRID — Clean & Organized
               ════════════════════════════════════════════════════════════════════ */
            .currency-cards-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
              gap: 10px;
            }
            .currency-card {
              display: flex;
              flex-direction: column;
              gap: 8px;
              padding: 14px 12px;
              border-radius: 12px;
              border: 1.5px solid var(--border-default);
              background: var(--bg-input);
              cursor: pointer;
              transition: all 0.2s ease;
              text-align: left;
              font-family: inherit;
              position: relative;
            }
            .currency-card:hover {
              border-color: rgba(61, 204, 142, 0.4);
              transform: translateY(-2px);
              box-shadow: 0 4px 16px rgba(61, 204, 142, 0.08);
            }
            .currency-card.active {
              border-color: var(--color-prosper-green);
              background: rgba(61, 204, 142, 0.06);
              box-shadow: 0 0 0 3px rgba(61, 204, 142, 0.1);
            }
            .currency-card-header {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .currency-card-code {
              font-size: 0.8125rem;
              font-weight: 700;
              color: var(--text-primary);
            }
            .currency-card-check {
              margin-left: auto;
              color: var(--color-prosper-green);
              display: flex;
              align-items: center;
            }
            .currency-card-body {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .currency-card-name {
              font-size: 0.75rem;
              font-weight: 500;
              color: var(--text-secondary);
            }
            .currency-card-symbol {
              font-size: 0.6875rem;
              color: var(--text-tertiary);
            }
            .currency-card-rate {
              font-size: 0.6875rem;
              font-weight: 600;
              color: var(--color-prosper-green);
              margin-top: 2px;
              padding-top: 6px;
              border-top: 1px solid var(--border-default);
            }

            /* ════════════════════════════════════════════════════════════════════
               RATES TABLE — Clean list layout
               ════════════════════════════════════════════════════════════════════ */
            .rates-table {
              display: flex;
              flex-direction: column;
              gap: 4px;
              background: var(--bg-input);
              border-radius: 12px;
              padding: 16px;
              border: 1px solid var(--border-default);
            }
            .rates-section-title {
              font-size: 0.625rem;
              font-weight: 700;
              color: var(--text-tertiary);
              text-transform: uppercase;
              letter-spacing: 0.08em;
              margin-bottom: 6px;
              padding-bottom: 6px;
              border-bottom: 1px solid var(--border-default);
            }
            .rates-row {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 8px 0;
              border-bottom: 1px solid rgba(255,255,255,0.03);
            }
            .rates-row:last-child {
              border-bottom: none;
            }
            .rates-name {
              font-size: 0.8125rem;
              font-weight: 600;
              color: var(--text-primary);
              min-width: 50px;
            }
            .rates-value {
              margin-left: auto;
              font-size: 0.8125rem;
              font-weight: 700;
              color: var(--color-prosper-green);
              text-align: right;
            }
            .rates-value .rates-sub {
              font-size: 0.6875rem;
              font-weight: 500;
              color: var(--text-secondary);
              margin-left: 6px;
            }
            .rates-value.p2p {
              color: #F59E0B;
            }
            .rates-p2p-badge {
              font-size: 0.625rem;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              padding: 3px 8px;
              border-radius: 6px;
              background: rgba(245, 158, 11, 0.15);
              color: #F59E0B;
            }

            /* ===== RESPONSIVE: Tablet (1024px) ===== */
            @media (min-width: 768px) {
              .settings-page { padding: 24px 20px; }
              .settings-title { font-size: 1.75rem; }
              .field-grid { grid-template-columns: 1fr 1fr; }
              .profile-grid {
                flex-direction: row;
                align-items: flex-start;
              }
              .avatar-section { align-items: flex-start; }
              .btn-save { align-self: flex-end; }
            }

            /* ===== RESPONSIVE: Desktop (1024px+) ===== */
            @media (min-width: 1024px) {
              .settings-page { padding: 32px 24px; }
              .mobile-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
              .mobile-tab { padding: 10px 18px; font-size: 0.8125rem; }
              .settings-sidebar { display: none; }
              .settings-title { font-size: 2rem; }
              .panel-card { padding: 28px; }
              .avatar-circle { width: 112px; height: 112px; }
              .avatar-initial { font-size: 2.75rem; }
            }

            /* ===== RESPONSIVE: Small Mobile (480px) ===== */
            @media (max-width: 480px) {
              .settings-page { padding: 12px 10px; }
              .settings-title { font-size: 1.25rem; }
              .settings-subtitle { font-size: 0.75rem; }
              .panel-card { padding: 16px; border-radius: 12px; }
              .panel-title { font-size: 0.9375rem; }
              .panel-desc { font-size: 0.6875rem; }
              .panel-header { margin-bottom: 16px; }
              .avatar-circle { width: 72px; height: 72px; }
              .avatar-initial { font-size: 1.75rem; }
              .field-input, .field-textarea { padding: 8px 12px; font-size: 0.8125rem; }
              .field-label { font-size: 0.625rem; }
              .option-grid { grid-template-columns: repeat(3, 1fr); gap: 6px; }
              .currency-grid { grid-template-columns: repeat(2, 1fr); }
              .option-btn { padding: 10px 6px; }
              .option-flag { font-size: 1.125rem; }
              .option-text { font-size: 0.625rem; }
              .theme-selector { grid-template-columns: 1fr 1fr; gap: 10px; }
              .theme-preview { height: 60px; }
              .currency-cards-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
              .currency-card { padding: 10px; }
              .currency-card-code { font-size: 0.75rem; }
              .currency-card-name { font-size: 0.6875rem; }
              .currency-card-rate { font-size: 0.625rem; }
              .rates-table { padding: 12px; }
              .rates-row { padding: 6px 0; }
              .rates-name { font-size: 0.75rem; }
              .rates-value { font-size: 0.75rem; }
              .toggle-row { padding: 12px; }
              .toggle-icon { width: 32px; height: 32px; font-size: 0.875rem; }
              .toggle-label { font-size: 0.75rem; }
              .toggle-desc { font-size: 0.625rem; }
              .toggle-switch { width: 40px; height: 22px; }
              .toggle-switch::after { width: 16px; height: 16px; }
              .toggle-switch.active::after { transform: translateX(18px); }
              .danger-header { flex-direction: column; gap: 10px; }
              .danger-icon-wrap { width: 36px; height: 36px; font-size: 1rem; }
              .danger-title { font-size: 0.875rem; }
              .danger-desc { font-size: 0.6875rem; }
              .warning-header { flex-direction: column; gap: 10px; }
              .warning-icon-wrap { width: 36px; height: 36px; font-size: 1rem; }
              .warning-title { font-size: 0.875rem; }
              .warning-desc { font-size: 0.6875rem; }
              .delete-confirm-actions { flex-direction: column; }
              .plan-features { flex-direction: column; }
              .plan-feature { padding: 6px 10px; font-size: 0.6875rem; }
              .settings-footer { font-size: 0.5625rem; margin-top: 24px; }
              .mobile-tab { padding: 7px 10px; font-size: 0.6875rem; }
              .mobile-tab-icon { font-size: 0.75rem; }
              .settings-save-bar { padding: 10px; }
              .settings-save-bar-inner { flex-direction: column; align-items: stretch; gap: 8px; }
              .settings-save-hint { text-align: center; }
              .btn-save { width: 100%; text-align: center; }
              /* Device cards mobile */
              .session-card {
                flex-direction: column;
                align-items: stretch;
                gap: 12px;
                padding: 14px;
              }
              .session-main {
                align-items: flex-start;
                gap: 12px;
              }
              .session-icon { font-size: 1.25rem; }
              .session-name {
                font-size: 0.8125rem;
                gap: 6px;
              }
              .session-detail {
                font-size: 0.625rem;
                line-height: 1.4;
              }
              .session-actions {
                flex-wrap: wrap;
                width: 100%;
              }
              .session-action-btn {
                flex: 1 1 auto;
                min-width: 0;
                justify-content: center;
                padding: 8px 10px;
                font-size: 0.75rem;
              }
              .session-action-text {
                display: inline;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .admin-request-card {
                flex-direction: column;
                align-items: stretch;
                gap: 10px;
              }
              .admin-request-info {
                width: 100%;
              }
            }

            /* ===== RESPONSIVE: Very Small (360px) ===== */
            @media (max-width: 360px) {
              .settings-page { padding: 8px 6px; }
              .settings-title { font-size: 1.125rem; }
              .panel-card { padding: 12px; }
              .avatar-circle { width: 60px; height: 60px; }
              .avatar-initial { font-size: 1.5rem; }
              .option-grid { grid-template-columns: repeat(2, 1fr); }
              .currency-grid { grid-template-columns: repeat(2, 1fr); }
              .theme-selector { grid-template-columns: 1fr; }
              .currency-cards-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
              .currency-card { padding: 8px; border-radius: 10px; }
              .rates-table { padding: 10px; border-radius: 10px; }
              .toggle-row { padding: 10px; gap: 10px; }
              .toggle-icon { width: 28px; height: 28px; font-size: 0.75rem; border-radius: 8px; }
              .toggle-label { font-size: 0.6875rem; }
              .toggle-desc { font-size: 0.5625rem; }
              .toggle-switch { width: 36px; height: 20px; }
              .toggle-switch::after { width: 14px; height: 14px; top: 3px; left: 3px; }
              .toggle-switch.active::after { transform: translateX(16px); }
              .btn-save { width: 100%; text-align: center; }
              .plan-content { flex-direction: column; align-items: flex-start; gap: 8px; }
              /* Device cards very small */
              .session-card { padding: 12px; gap: 10px; }
              .session-main { gap: 10px; }
              .session-icon { font-size: 1.125rem; }
              .session-name { font-size: 0.75rem; }
              .session-detail { font-size: 0.5625rem; }
              .session-action-btn { padding: 8px; font-size: 0.75rem; }
            }
          `}</style>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
});

function ToggleRow({ icon, label, desc, checked, onChange, disabled }: { icon: string; label: string; desc: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className="toggle-row">
      <div className="toggle-left">
        <div className="toggle-icon"><InlineIcon icon={icon} size={16} /></div>
        <div className="toggle-text">
          <span className="toggle-label">{label}</span>
          <span className="toggle-desc">{desc}</span>
        </div>
      </div>
      <button
        className={`toggle-switch ${checked ? 'active' : ''}`}
        onClick={onChange}
        disabled={disabled}
      />
    </div>
  );
}
export default ConfiguracionPage;
