import { NextResponse } from "next/server";

export function authErrorResponse(error: unknown) {
    const code = error instanceof Error ? error.message : "";
    const status = ["UNAUTHORIZED", "MISSING_TOKEN", "INVALID_TOKEN", "INVALID_AUTH_HEADER"].includes(code)
        ? 401
        : ["FORBIDDEN", "NOT_ADMIN", "ADMIN_DISABLED", "ACCOUNT_DISABLED"].includes(code)
            ? 403 : null;
    return status ? NextResponse.json({ success: false, error: code, code }, {
        status, headers: { "Cache-Control": "private, no-store" },
    }) : null;
}
