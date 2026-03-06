import React, { createContext, useContext, useState } from 'react';
import en, { type TranslationKey } from '../i18n/en';
import hi from '../i18n/hi';

type Lang = 'en' | 'hi';

interface LanguageContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'hi',
  toggleLang: () => {},
  t: (key) => en[key],
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('attashop-lang') as Lang) || 'hi';
  });

  const toggleLang = () => {
    const next: Lang = lang === 'en' ? 'hi' : 'en';
    setLang(next);
    localStorage.setItem('attashop-lang', next);
  };

  const t = (key: TranslationKey): string => {
    const dict = lang === 'hi' ? hi : en;
    return dict[key] ?? en[key] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      <div className={lang === 'hi' ? 'font-hindi' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
