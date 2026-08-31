/* eslint-disable import/no-named-as-default-member */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { es } from '@/i18n/es';

// Spanish only for the pilot. Keys are namespaced so more locales can be added
// later without touching call sites (see docs/18).
if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: { es: { translation: es } },
    lng: 'es',
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
    returnNull: false,
    // Resources are inline, so translations are ready on first render; no
    // Suspense fallback and no post-mount state update from react-i18next.
    react: { useSuspense: false },
  });
}

export default i18n;
