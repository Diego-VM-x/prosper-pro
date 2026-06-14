'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function AndroidIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 9c0-3-2.5-5.5-5.5-5.5S6.5 6 6.5 9H5c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h1.5v3h2v-3h7v3h2v-3H19c1.1 0 2-.9 2-2v-6c0-1.1-.9-2-2-2h-1.5z"/>
      <path d="M6 18.5c0 .8.7 1.5 1.5 1.5s1.5-.7 1.5-1.5V13H6v5.5zM16.5 20c.8 0 1.5-.7 1.5-1.5V13h-3v5.5c0 .8.7 1.5 1.5 1.5z"/>
      <circle cx="9.5" cy="11" r="1"/>
      <circle cx="14.5" cy="11" r="1"/>
      <path d="M8.5 5.5 7.5 3M15.5 5.5 16.5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
