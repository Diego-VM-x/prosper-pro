'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function AndroidIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.6 9.2c-.7 0-1.4.2-2 .6l-1.1-2c1.3-.8 2.9-1.2 4.5-1.1 2.8.2 5.2 2 6.3 4.5l-2.1 1.2c-.7-1.5-2.2-2.5-3.9-2.6-.6 0-1.1.1-1.7.4zM6.4 9.2c-.6-.3-1.1-.4-1.7-.4-1.7.1-3.2 1.1-3.9 2.6L-1.3 9.8C-.2 7.3 2.2 5.5 5 5.3c1.6-.1 3.2.3 4.5 1.1l-1.1 2c-.6-.4-1.3-.6-2-.6z"/>
      <path d="M6 11h12v8c0 1.1-.9 2-2 2h-1v3h-2v-3h-2v3H9v-3H8c-1.1 0-2-.9-2-2v-8z"/>
      <path d="M17 11c0-2.8-2.2-5-5-5s-5 2.2-5 5h10z"/>
      <circle cx="9" cy="14" r="1"/>
      <circle cx="15" cy="14" r="1"/>
      <path d="M5 13c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2s2-.9 2-2v-3c0-1.1-.9-2-2-2zM19 13c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2s2-.9 2-2v-3c0-1.1-.9-2-2-2z"/>
    </svg>
  );
}

interface AndroidDownloadButtonProps {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AndroidDownloadButton({
  variant = 'outline',
  size = 'md',
  className = '',
}: AndroidDownloadButtonProps) {
  const { t } = useTranslation('landing');
  const [showHint, setShowHint] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // En iOS o desktop el .apk no sirve directamente; mostramos un mensaje
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    if (isIOS) {
      e.preventDefault();
      setShowHint(true);
      setTimeout(() => setShowHint(false), 4000);
      return;
    }
    if (!isAndroid) {
      // En desktop dejamos que descargue el archivo igual; el usuario lo pasará al móvil
      return;
    }
  };

  const sizeClasses = {
    sm: 'android-download-btn-sm',
    md: 'android-download-btn-md',
    lg: 'android-download-btn-lg',
  };

  const variantClasses = {
    primary: 'android-download-btn-primary',
    outline: 'android-download-btn-outline',
    ghost: 'android-download-btn-ghost',
  };

  return (
    <>
      <a
        href="/prosper-pro.apk"
        download
        className={`android-download-btn ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        onClick={handleClick}
      >
        <AndroidIcon size={size === 'lg' ? 22 : size === 'sm' ? 16 : 18} />
        <span>{t('androidDownload.button', { defaultValue: 'Descargar apk' })}</span>
      </a>
      {showHint && (
        <div className="android-download-hint">
          {t('androidDownload.iosHint', { defaultValue: 'El APK es para Android. En iPhone usa la versión web.' })}
        </div>
      )}
    </>
  );
}
