export function getAuthRedirectTarget(search: string): string {
    const value = new URLSearchParams(search).get("redirect");

    return value &&
        value.startsWith("/") &&
        !value.startsWith("//") &&
        !value.includes("\\")
        ? value
        : "/account";
}
