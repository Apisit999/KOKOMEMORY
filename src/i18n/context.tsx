"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getMessage, translateRaw, type Locale, type MessageKey } from "./messages";

type I18nContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: MessageKey) => string; translate: (value: string) => string };
const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "koko-locale";
const originalText = new WeakMap<Text, string>();
const lastTranslatedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();
const lastTranslatedAttributes = new WeakMap<Element, Record<string, string>>();

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("th");

    useEffect(() => {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved === "th" || saved === "en") setLocaleState(saved);
    }, []);

    useEffect(() => {
        document.documentElement.lang = locale;
        window.localStorage.setItem(STORAGE_KEY, locale);
        const nativeAlert = window.alert.bind(window);
        const nativeConfirm = window.confirm.bind(window);
        window.alert = (message?: unknown) => nativeAlert(translateRaw(locale, String(message ?? "")));
        window.confirm = (message?: string) => nativeConfirm(translateRaw(locale, message ?? ""));

        const translate = () => {
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            const nodes: Text[] = [];
            let node = walker.nextNode();
            while (node) { nodes.push(node as Text); node = walker.nextNode(); }
            nodes.forEach((text) => {
                const parent = text.parentElement;
                if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName)) return;
                const current = text.nodeValue ?? "";
                const previousTranslation = lastTranslatedText.get(text);
                const original = originalText.get(text);
                // A value different from both the source and our last output
                // came from React. Refresh the source before translating it.
                if (original === undefined || (previousTranslation !== undefined && current !== previousTranslation && current !== original)) {
                    originalText.set(text, current);
                }
                const translated = translateRaw(locale, originalText.get(text) ?? "");
                lastTranslatedText.set(text, translated);
                if (translated !== current) text.nodeValue = translated;
            });
            document.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title]").forEach((element) => {
                if (!originalAttributes.has(element)) {
                    const values: Record<string, string> = {};
                    ["placeholder", "aria-label", "title"].forEach((attribute) => {
                        const value = element.getAttribute(attribute);
                        if (value) values[attribute] = value;
                    });
                    originalAttributes.set(element, values);
                }
                const originals = originalAttributes.get(element) ?? {};
                const previousTranslations = lastTranslatedAttributes.get(element) ?? {};
                ["placeholder", "aria-label", "title"].forEach((attribute) => {
                    const current = element.getAttribute(attribute) ?? "";
                    const previousTranslation = previousTranslations[attribute];
                    if (originals[attribute] !== undefined && previousTranslation !== undefined && current !== previousTranslation && current !== originals[attribute]) {
                        originals[attribute] = current;
                    }
                    const value = originals[attribute];
                    if (value) {
                        const translated = translateRaw(locale, value);
                        previousTranslations[attribute] = translated;
                        element.setAttribute(attribute, translated);
                    }
                });
                lastTranslatedAttributes.set(element, previousTranslations);
            });
        };
        translate();
        const observer = new MutationObserver(translate);
        // React owns text updates. Observing characterData causes the
        // translator to race React during interpolation and locale changes.
        observer.observe(document.body, { childList: true, subtree: true });
        return () => {
            observer.disconnect();
            window.alert = nativeAlert;
            window.confirm = nativeConfirm;
        };
    }, [locale]);

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
