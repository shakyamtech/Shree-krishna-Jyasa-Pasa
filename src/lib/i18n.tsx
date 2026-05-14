import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "ne";

interface Translations {
  // Navigation sidebar
  dashboard: string;
  products_stock: string;
  sales_billing: string;
  purchases: string;
  customers: string;
  suppliers: string;
  credits_dues: string;
  cashbook: string;
  reports: string;
  shop_settings: string;
  logout: string;
  owner_account: string;

  // Dashboard specific
  refresh_prices: string;
  products_count: string;
  customers_count: string;
  sales_today: string;
  total_today: string;
  live_gold_rates: string;
  silver_rate_fine: string;
  per_tola: string;
  per_10_gram: string;
  last_updated: string;
}

const en: Translations = {
  dashboard: "Dashboard",
  products_stock: "Products & Stock",
  sales_billing: "Sales / Billing",
  purchases: "Purchases",
  customers: "Customers",
  suppliers: "Suppliers",
  credits_dues: "Credits / Dues",
  cashbook: "Cashbook",
  reports: "Reports",
  shop_settings: "Shop Settings",
  logout: "Log out",
  owner_account: "Owner Account",

  refresh_prices: "Refresh prices",
  products_count: "Products Count",
  customers_count: "Customers Count",
  sales_today: "Sales Today",
  total_today: "Total Today",
  live_gold_rates: "Live Gold Rates",
  silver_rate_fine: "Silver Rate (Fine Pure)",
  per_tola: "per tola",
  per_10_gram: "per 10 gram",
  last_updated: "Last updated",
};

const ne: Translations = {
  dashboard: "ड्यासबोर्ड",
  products_stock: "सामान र स्टक",
  sales_billing: "बिक्री / बिलिङ",
  purchases: "खरिदहरू",
  customers: "ग्राहकहरू",
  suppliers: "वितरकहरू",
  credits_dues: "बाँकी / उधारो",
  cashbook: "नगद खाता",
  reports: "रिपोर्टहरू",
  shop_settings: "पसल सेटिङहरू",
  logout: "लग आउट",
  owner_account: "मुख्य खाता",

  refresh_prices: "मूल्य ताजा गर्नुहोस्",
  products_count: "जम्मा सामान",
  customers_count: "जम्मा ग्राहक",
  sales_today: "आजको बिक्री संख्या",
  total_today: "आजको जम्मा रकम",
  live_gold_rates: "सुनको प्रत्यक्ष मूल्य",
  silver_rate_fine: "चाँदीको प्रत्यक्ष मूल्य",
  per_tola: "प्रति तोला",
  per_10_gram: "प्रति १० ग्राम",
  last_updated: "पछिल्लो अपडेट",
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("app_lang") as Language;
    if (saved === "en" || saved === "ne") {
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem("app_lang", l);
  };

  const t = lang === "ne" ? ne : en;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    return { lang: "en" as Language, setLang: () => {}, t: en };
  }
  return context;
}
