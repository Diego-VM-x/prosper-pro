'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

function AndroidIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0225 3.503C15.5902 8.3277 13.8532 7.8405 12 7.8405c-1.8532 0-3.5902.4872-5.1366 1.3497L4.841 5.6871a.416.416 0 00-.5676-.1521.416.416 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.343 14.6589.343 18.6617h23.314c0-4.0028-2.3459-7.475-5.7755-9.3403"/>
      <path d="M6.0306 20.7367c0 .9203.7463 1.6666 1.6666 1.6666h.3712v2.8108c0 .8284.6716 1.5 1.5 1.5s1.5-.6716 1.5-1.5v-2.8108h1.8637v2.8108c0 .8284.6716 1.5 1.5 1.5s1.5-.6716 1.5-1.5v-2.8108h.3712c.9203 0 1.6666-.7463 1.6666-1.6666V8.5038H6.0306v12.2329zM20.6217 8.5038c-.8284 0-1.5.6716-1.5 1.5v9.7329c0 .8284.6716 1.5 1.5 1.5s1.5-.6716 1.5-1.5V10.0038c0-.8284-.6716-1.5-1.5-1.5M3.3783 8.5038c-.8284 0-1.5.6716-1.5 1.5v9.7329c0 .8284.6716 1.5 1.5 1.5s1.5-.6716 1.5-1.5V10.0038c0-.8284-.6716-1.5-1.5-1.5"/>
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
