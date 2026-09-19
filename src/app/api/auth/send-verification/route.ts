import { NextResponse } from "next/server";
import { Resend } from "resend";
import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
    try {
        // ============================================================
        // Check Authorization Header
        // ============================================================

        const authorization =
            request.headers.get("authorization");

        if (
            !authorization ||
            !authorization.startsWith("Bearer ")
        ) {
            return NextResponse.json(
                {
                    success: false,
                    error: "UNAUTHORIZED",
                },
                { status: 401 }
            );
        }

        const idToken =
            authorization.slice(7).trim();

        if (!idToken) {
            return NextResponse.json(
                {
                    success: false,
                    error: "MISSING_TOKEN",
                },
                { status: 401 }
            );
        }

        // ============================================================
        // Verify Firebase User
        // ============================================================

        const decodedToken =
            await adminAuth.verifyIdToken(idToken, true);

        const user =
            await adminAuth.getUser(decodedToken.uid);

        if (user.disabled) return NextResponse.json({ error: "USER_DISABLED" }, { status: 403 });

        if (!user.email) {
            return NextResponse.json(
                {
                    success: false,
                    error: "NO_EMAIL",
                },
                { status: 400 }
            );
        }

        // ============================================================
        // Already Verified
        // ============================================================

        if (user.emailVerified) {
            return NextResponse.json({
                success: true,
                alreadyVerified: true,
                message:
                    "Email นี้ได้รับการยืนยันแล้ว",
            });
        }

        // ============================================================
        // Check Resend API Key
        // ============================================================

        if (!process.env.RESEND_API_KEY) {
            console.error(
                "RESEND_API_KEY is missing"
            );

            return NextResponse.json(
                {
                    success: false,
                    error:
                        "RESEND_API_KEY_MISSING",
                },
                { status: 500 }
            );
        }

        // ============================================================
        // Generate Firebase Verification Link
        // ============================================================

        const appUrl = (
            process.env.NEXT_PUBLIC_APP_URL ||
            "http://localhost:3000"
        ).replace(/\/$/, "");

        const verificationLink =
            await adminAuth.generateEmailVerificationLink(
                user.email,
                {
                    url: `${appUrl}/account/security`,
                    handleCodeInApp: false,
                }
            );

        // ============================================================
        // Resend
        // ============================================================

        const resend =
            new Resend(
                process.env.RESEND_API_KEY
            );

        const fromEmail =
            process.env.RESEND_FROM_EMAIL ||
            "KOKO Memory <onboarding@resend.dev>";

        const displayName =
            user.displayName ||
            "สมาชิก KOKO Memory";

        // ============================================================
        // Send Email
        // ============================================================

        const { data, error } =
            await resend.emails.send({
                from: fromEmail,
                to: [user.email],
                subject:
                    "ยืนยัน Email ของคุณกับ KOKO Memory",
                html: `
<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8" />

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    />

    <title>
        ยืนยัน Email - KOKO Memory
    </title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#fff5f9;
        font-family:
            Arial,
            Helvetica,
            sans-serif;
        color:#24151d;
    "
>

    <div
        style="
            max-width:620px;
            margin:0 auto;
            padding:40px 20px;
        "
    >

        <div
            style="
                background:#ffffff;
                border-radius:24px;
                padding:40px 32px;
                box-shadow:
                    0 15px 50px
                    rgba(255,79,163,.12);
            "
        >

            <!-- Logo -->

            <div
                style="
                    text-align:center;
                    margin-bottom:28px;
                "
            >

                <div
                    style="
                        display:inline-block;
                        padding:10px 18px;
                        border-radius:999px;
                        background:#fff0f7;
                        color:#ff4fa3;
                        font-weight:700;
                        font-size:14px;
                        letter-spacing:.5px;
                    "
                >
                    KOKO MEMORY
                </div>

            </div>

            <!-- Title -->

            <h1
                style="
                    margin:0 0 16px;
                    text-align:center;
                    font-size:28px;
                    line-height:1.3;
                "
            >
                ยืนยัน Email ของคุณ
            </h1>

            <!-- Greeting -->

            <p
                style="
                    margin:0 0 14px;
                    font-size:16px;
                    line-height:1.7;
                "
            >
                สวัสดี ${escapeHtml(displayName)}
            </p>

            <!-- Description -->

            <p
                style="
                    margin:0 0 28px;
                    font-size:16px;
                    line-height:1.7;
                    color:#665963;
                "
            >
                กรุณากดปุ่มด้านล่างเพื่อยืนยัน Email
                และเปิดใช้งานบัญชี KOKO Memory
                สำหรับการจองบริการ
            </p>

            <!-- Button -->

            <div
                style="
                    text-align:center;
                    margin:30px 0;
                "
            >

                <a
                    href="${verificationLink}"
                    style="
                        display:inline-block;
                        padding:15px 28px;
                        border-radius:14px;
                        background:#ff4fa3;
                        color:#ffffff;
                        text-decoration:none;
                        font-size:16px;
                        font-weight:700;
                    "
                >
                    ยืนยัน Email
                </a>

            </div>

            <!-- Fallback Link -->

            <p
                style="
                    margin:28px 0 8px;
                    font-size:13px;
                    color:#8b7c84;
                    line-height:1.6;
                "
            >
                หากปุ่มด้านบนไม่สามารถใช้งานได้
                สามารถเปิดลิงก์นี้ใน Browser:
            </p>

            <p
                style="
                    word-break:break-all;
                    font-size:12px;
                    line-height:1.6;
                    color:#ff4fa3;
                "
            >
                ${escapeHtml(verificationLink)}
            </p>

            <!-- Divider -->

            <hr
                style="
                    border:0;
                    border-top:1px solid #f1e5eb;
                    margin:30px 0;
                "
            />

            <!-- Footer -->

            <p
                style="
                    margin:0;
                    text-align:center;
                    font-size:12px;
                    color:#9b8c94;
                    line-height:1.6;
                "
            >
                หากคุณไม่ได้สมัครสมาชิก
                KOKO Memory
                สามารถละเว้น Email นี้ได้
            </p>

        </div>

        <p
            style="
                margin:20px 0 0;
                text-align:center;
                font-size:12px;
                color:#a08f98;
            "
        >
            © KOKO Memory
        </p>

    </div>

</body>

</html>
                `,
            });

        // ============================================================
        // Resend Error
        // ============================================================

        if (error) {
            console.error(
                "RESEND VERIFICATION ERROR:",
                error
            );

            return NextResponse.json(
                {
                    success: false,
                    error:
                        "RESEND_SEND_FAILED",
                    detail: error.message,
                },
                { status: 500 }
            );
        }

        // ============================================================
        // Success
        // ============================================================

        return NextResponse.json({
            success: true,
            email: user.email,
            emailId: data?.id || null,
            message:
                "ส่ง Email ยืนยันตัวตนเรียบร้อยแล้ว",
        });
    } catch (error) {
        if (error && typeof error === "object" && "code" in error && String(error.code).startsWith("auth/")) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }
        console.error(
            "SEND VERIFICATION ERROR:",
            error
        );

        return NextResponse.json(
            {
                success: false,
                error:
                    "SEND_VERIFICATION_FAILED",
            },
            { status: 500 }
        );
    }
}
