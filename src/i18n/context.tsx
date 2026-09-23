"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getMessage, translateRaw, type Locale, type MessageKey } from "./messages";

type I18nContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: MessageKey) => string; translate: (value: string) => string };
const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "koko-locale";
export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("th");
    const [localeReady, setLocaleReady] = useState(false);
    const localeRef = useRef(locale);
    localeRef.current = locale;

    useEffect(() => {
        try {
            const saved = window.localStorage.getItem(STORAGE_KEY);
            if (saved === "th" || saved === "en") setLocaleState(saved);
        } catch {
            // Keep the default locale when browser storage is unavailable.
        } finally {
            setLocaleReady(true);
        }
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
        if (localeReady) {
            try {
                window.localStorage.setItem(STORAGE_KEY, locale);
            } catch {
                // The in-memory locale still works when storage is unavailable.
            }
        }
    }, [locale, localeReady]);

    useEffect(() => {
        const nativeAlert = window.alert.bind(window);
        const nativeConfirm = window.confirm.bind(window);
        const nativePrompt = window.prompt.bind(window);
        window.alert = (message?: unknown) => nativeAlert(translateRaw(localeRef.current, String(message ?? "")));
        window.confirm = (message?: string) => nativeConfirm(translateRaw(localeRef.current, message ?? ""));
        window.prompt = (message?: string, defaultValue?: string) => nativePrompt(translateRaw(localeRef.current, message ?? ""), defaultValue);
        return () => {
            window.alert = nativeAlert;
            window.confirm = nativeConfirm;
            window.prompt = nativePrompt;
        };
    }, []);

    const value = useMemo<I18nContextValue>(() => ({
        locale,
        setLocale: (next) => setLocaleState(next),
        t: (key) => getMessage(locale, key),
        translate: (value) => translateRaw(locale, value),
    }), [locale]);

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
    const value = useContext(I18nContext);
    if (!value) throw new Error("useI18n must be used inside I18nProvider");
    return value;
}
