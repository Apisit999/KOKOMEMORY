"use client";

import { useEffect } from "react";
import { useI18n } from "./context";
import { translateRaw, type Locale } from "./messages";

type OriginalValue = { source: string; rendered: string };
const textValues = new WeakMap<Text, OriginalValue>();
const attributeValues = new WeakMap<Element, Map<string, OriginalValue>>();
const translatedAttributes = ["placeholder", "title", "aria-label", "aria-description", "alt", "content"] as const;

function nextValue(current: string, previous: OriginalValue | undefined, locale: Locale): OriginalValue {
    const source = previous && current === previous.rendered ? previous.source : current;
    return { source, rendered: locale === "en" ? translateRaw("en", source) : source };
}

function translateElement(element: Element, locale: Locale) {
    if (element.closest("[data-i18n-ignore]")) return;
    const values = attributeValues.get(element) ?? new Map<string, OriginalValue>();
    for (const attribute of translatedAttributes) {
        if (attribute === "content" && !element.matches('meta[name="description"], meta[property^="og:"], meta[name^="twitter:"]')) continue;
        const current = element.getAttribute(attribute);
        if (current === null) continue;
        const next = nextValue(current, values.get(attribute), locale);
        values.set(attribute, next);
        if (current !== next.rendered) element.setAttribute(attribute, next.rendered);
    }
    attributeValues.set(element, values);
}

function translateText(node: Text, locale: Locale) {
    if (node.parentElement?.closest("script, style, noscript, textarea, [contenteditable], [data-i18n-ignore]")) return;
    const next = nextValue(node.data, textValues.get(node), locale);
    textValues.set(node, next);
    if (node.data !== next.rendered) node.data = next.rendered;
}

function translateTree(root: Node, locale: Locale) {
    if (root.nodeType === Node.TEXT_NODE) {
        translateText(root as Text, locale);
        return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    const element = root as Element;
    translateElement(element, locale);
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        if (walker.currentNode.nodeType === Node.TEXT_NODE) translateText(walker.currentNode as Text, locale);
        else translateElement(walker.currentNode as Element, locale);
    }
}

export default function DomTranslator() {
    const { locale } = useI18n();

    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver((records) => {
            observer.disconnect();
            for (const record of records) {
                if (record.type === "characterData") translateTree(record.target, locale);
                else if (record.type === "attributes") translateTree(record.target, locale);
                else for (const node of record.addedNodes) translateTree(node, locale);
            }
            observer.observe(root, options);
        });
        const options: MutationObserverInit = {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: [...translatedAttributes],
        };
        translateTree(root, locale);
        observer.observe(root, options);
        return () => observer.disconnect();
    }, [locale]);

    return null;
}
