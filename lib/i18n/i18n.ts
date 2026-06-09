import i18n from 'i18next';
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

export const resources = {
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
  },
};

export function createI18nInstance() {
  const instance = i18n.createInstance();
  instance.use(LanguageDetector).init({
    resources,
    fallbackLng: 'es',
    defaultNS: 'common',
    ns: ['common', 'dashboard', 'finanzas', 'metas', 'calendario', 'configuracion', 'ayuda', 'landing', 'auth'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });
  return instance;
}
