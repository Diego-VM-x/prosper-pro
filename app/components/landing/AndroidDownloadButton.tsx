'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function DownloadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

interface AndroidDownloadButtonProps {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DownloadButton({
  variant = 'outline',
  size = 'md',
  className = '',
}: AndroidDownloadButtonProps) {
  const { t } = useTranslation('landing');
  const isAndroid = typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
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
        <DownloadIcon size={size === 'lg' ? 22 : size === 'sm' ? 16 : 18} />
        <span>{isAndroid ? t('androidDownload.button', { defaultValue: 'Descargar apk' }) : t('androidDownload.buttonDesktop', { defaultValue: 'Descargar apk' })}</span>
      </a>
      {showHint && (
        <div className="android-download-hint">
          {t('androidDownload.iosHint', { defaultValue: 'El APK es para Android. En iPhone usa la versión web.' })}
        </div>
      )}
    </>
  );
}
