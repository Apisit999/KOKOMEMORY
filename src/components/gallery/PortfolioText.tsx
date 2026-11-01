"use client";

import { useI18n, type MessageKey } from "@/i18n";

export default function PortfolioText({ k }: { k: MessageKey }) {
    const { t } = useI18n();
    return t(k);
}
