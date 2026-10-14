import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { en, TranslationKey } from './en';
import { hi } from './hi';

export type Language = 'en' | 'hi';

interface LocalizationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LANGUAGE_STORAGE_KEY = '@neeros_language';

const LocalizationContext = createContext<LocalizationContextType>({
  language: 'hi', // Default to Hindi as specified for Patil Brothers
  setLanguage: () => {},
  t: (key) => en[key] || key,
});

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('hi');

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'hi') {
        setLanguageState(stored);
      }
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang).catch(() => {});
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = language === 'hi' ? hi : en;
    let str = dict[key] || en[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        str = str.replace(new RegExp(`{${paramKey}}`, 'g'), String(val));
      });
    }
    return str;
  };

  return (
    <LocalizationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useTranslation = () => useContext(LocalizationContext);
export * from './en';
