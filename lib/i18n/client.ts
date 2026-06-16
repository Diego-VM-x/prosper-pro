'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonES from './locales/es/common.json';
import commonEN from './locales/en/common.json';

import dashboardES from './locales/es/dashboard.json';
import dashboardEN from './locales/en/dashboard.json';

import finanzasES from './locales/es/finanzas.json';
import finanzasEN from './locales/en/finanzas.json';

import metasES from './locales/es/metas.json';
import metasEN from './locales/en/metas.json';

import calendarioES from './locales/es/calendario.json';
import calendarioEN from './locales/en/calendario.json';

import configuracionES from './locales/es/configuracion.json';
import configuracionEN from './locales/en/configuracion.json';

import ayudaES from './locales/es/ayuda.json';
import ayudaEN from './locales/en/ayuda.json';

import landingES from './locales/es/landing.json';
import landingEN from './locales/en/landing.json';

import authES from './locales/es/auth.json';
import authEN from './locales/en/auth.json';

import cursosES from './locales/es/cursos.json';
import cursosEN from './locales/en/cursos.json';

import legalES from './locales/es/legal.json';
import legalEN from './locales/en/legal.json';

const resources = {
  es: {
    common: commonES,
    dashboard: dashboardES,
    finanzas: finanzasES,
    metas: metasES,
    calendario: calendarioES,
    configuracion: configuracionES,
    ayuda: ayudaES,
    landing: landingES,
    auth: authES,
    cursos: cursosES,
    legal: legalES,
  },
  en: {
    common: commonEN,
    dashboard: dashboardEN,
    finanzas: finanzasEN,
    metas: metasEN,
    calendario: calendarioEN,
    configuracion: configuracionEN,
    ayuda: ayudaEN,
    landing: landingEN,
    auth: authEN,
    cursos: cursosEN,
    legal: legalEN,
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: 'es',
      defaultNS: 'common',
      ns: ['common', 'dashboard', 'finanzas', 'metas', 'calendario', 'configuracion', 'ayuda', 'landing', 'auth', 'cursos', 'legal'],
      interpolation: {
        escapeValue: false,
      },
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
      },
    });
}

export default i18n;
