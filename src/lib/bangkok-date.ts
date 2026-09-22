const BANGKOK_TIME_ZONE = "Asia/Bangkok";

export function todayBangkok(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: BANGKOK_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

export function isIsoDate(value: unknown): value is string {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isIsoDateBefore(value: unknown, reference = todayBangkok()): boolean {
    return isIsoDate(value) && isIsoDate(reference) && value < reference;
}
