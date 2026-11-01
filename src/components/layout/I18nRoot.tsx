"use client";

import { I18nProvider } from "@/i18n";
import DomTranslator from "@/i18n/DomTranslator";

export default function I18nRoot({ children }: { children: React.ReactNode }) {
    return <I18nProvider><DomTranslator />{children}</I18nProvider>;
}
