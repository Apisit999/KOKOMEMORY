import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { Resend } from "resend";

const resend = new Resend(
    process.env.RESEND_API_KEY,
);

const FROM_EMAIL =
    process.env.RESEND_FROM_EMAIL ||
    "KOKO Memory <onboarding@resend.dev>";

const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";


export async function POST(
    request: Request,
) {
    try {
        /* ========================================================
           CHECK RESEND KEY
        ======================================================== */

        if (!process.env.RESEND_API_KEY) {
            console.error(
                "KOKO PASSWORD RESET: RESEND_API_KEY is missing",
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "RESEND_API_KEY_MISSING",
                },
                {
                    status: 500,
                },
            );
        }


        /* ========================================================
           READ EMAIL
        ======================================================== */

        const body =
            (await request.json()) as {
                email?: unknown;
            };

        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : "";


        if (!email) {
            return NextResponse.json(
                {
                    success: false,
                    error: "INVALID_EMAIL",
                },
                {
                    status: 400,
                },
            );
        }


        /* ========================================================
           GENERATE FIREBASE PASSWORD RESET LINK
        ======================================================== */

        let resetLink: string;

        try {
            resetLink =
                await adminAuth.generatePasswordResetLink(
                    email,
                    {
                        url: `${APP_URL}/account/login`,
                        handleCodeInApp: true,
                    },
                );

        } catch (error: unknown) {
            /*
             * ไม่เปิดเผยว่า Email มีบัญชีหรือไม่
             * เพื่อป้องกัน Account Enumeration
             */

            const errorCode =
                getFirebaseErrorCode(error);

            if (
                errorCode ===
                "auth/user-not-found"
            ) {
                return NextResponse.json({
                    success: true,
                    message:
                        "If the account exists, a reset email has been sent.",
                });
            }

            console.error(
                "KOKO GENERATE RESET LINK ERROR:",
                error,
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "GENERATE_RESET_LINK_FAILED",
                },
                {
                    status: 500,
                },
            );
        }


        /* ========================================================
           SEND WITH RESEND
        ======================================================== */

        const resendResult =
            await resend.emails.send({
                from: FROM_EMAIL,

                to: [email],

                subject:
                    "รีเซ็ตรหัสผ่าน KOKO Memory",

                html: buildPasswordResetEmail(
                    resetLink,
                ),
            });


        if (resendResult.error) {
            console.error(
                "KOKO RESEND PASSWORD RESET ERROR:",
                resendResult.error,
            );

            return NextResponse.json(
                {
                    success: false,
                    error: "RESEND_SEND_FAILED",
                },
                {
                    status: 502,
                },
            );
        }


        /* ========================================================
           SUCCESS
        ======================================================== */

        console.log(
            "KOKO PASSWORD RESET EMAIL SENT:",
            {
                email,
                id: resendResult.data?.id,
            },
        );

        return NextResponse.json({
            success: true,
            message:
                "If the account exists, a reset email has been sent.",
        });

    } catch (error: unknown) {

        console.error(
            "KOKO PASSWORD RESET API ERROR:",
            error,
        );

        return NextResponse.json(
            {
                success: false,
                error: "INTERNAL_SERVER_ERROR",
            },
            {
                status: 500,
            },
        );
    }
}


/* ============================================================
   EMAIL TEMPLATE
============================================================ */

function buildPasswordResetEmail(
    resetLink: string,
) {
    return `
<!DOCTYPE html>

<html lang="th">

<head>
    <meta charset="UTF-8" />

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    />

    <title>รีเซ็ตรหัสผ่าน KOKO Memory</title>
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#FFF8FA;
        font-family:Arial,Helvetica,sans-serif;
        color:#3C2430;
    "
>

    <div
        style="
            width:100%;
            padding:40px 16px;
            box-sizing:border-box;
            background:#FFF8FA;
        "
    >

        <div
            style="
                max-width:560px;
                margin:0 auto;
                background:#ffffff;
                border-radius:24px;
                overflow:hidden;
                border:1px solid #F3E3E9;
                box-shadow:0 20px 60px rgba(234,78,128,0.12);
            "
        >

            <!-- HEADER -->

            <div
                style="
                    padding:30px 28px;
                    text-align:center;
                    background:
                        linear-gradient(
                            135deg,
                            #FF6C99,
                            #EA4E80
                        );
                "
            >

                <div
                    style="
                        font-family:Georgia,serif;
                        font-size:26px;
                        font-style:italic;
                        font-weight:600;
                        color:#ffffff;
                    "
                >
                    KOKO MEMORY
                </div>

                <div
                    style="
                        margin-top:6px;
                        font-size:10px;
                        letter-spacing:3px;
                        color:rgba(255,255,255,0.85);
                    "
                >
                    PHOTOBOOTH & EVENT
                </div>

            </div>


            <!-- CONTENT -->

            <div
                style="
                    padding:36px 30px;
                "
            >

                <div
                    style="
                        width:58px;
                        height:58px;
                        margin:0 auto 22px;
                        border-radius:50%;
                        background:#FFF0F5;
                        text-align:center;
                        line-height:58px;
                        font-size:25px;
                    "
                >
                    🔐
                </div>


                <h1
                    style="
                        margin:0;
                        text-align:center;
                        font-family:Georgia,serif;
                        font-size:27px;
                        font-weight:500;
                        color:#3C2430;
                    "
                >
                    รีเซ็ตรหัสผ่าน
                </h1>


                <p
                    style="
                        margin:16px auto 0;
                        max-width:420px;
                        text-align:center;
                        font-size:14px;
                        line-height:1.8;
                        color:#8C6B79;
                    "
                >
                    เราได้รับคำขอให้ตั้งรหัสผ่านใหม่สำหรับบัญชี KOKO Memory ของคุณ
                </p>


                <!-- BUTTON -->

                <div
                    style="
                        margin:30px 0;
                        text-align:center;
                    "
                >

                    <a
                        href="${escapeHtml(
                            resetLink,
                        )}"
                        style="
                            display:inline-block;
                            padding:14px 28px;
                            border-radius:13px;
                            background:#EA4E80;
                            color:#ffffff;
                            text-decoration:none;
                            font-size:14px;
                            font-weight:600;
                        "
                    >
                        ตั้งรหัสผ่านใหม่
                    </a>

                </div>


                <div
                    style="
                        padding:16px;
                        border-radius:13px;
                        background:#FFF8FA;
                        border:1px solid #FFDCE8;
                    "
                >

                    <p
                        style="
                            margin:0;
                            font-size:12px;
                            line-height:1.8;
                            color:#8C6B79;
                        "
                    >
                        หากคุณไม่ได้เป็นผู้ขอรีเซ็ตรหัสผ่าน
                        สามารถละเว้นอีเมลฉบับนี้ได้
                        บัญชีของคุณจะยังคงปลอดภัย
                    </p>

                </div>


                <p
                    style="
                        margin:24px 0 0;
                        font-size:11px;
                        line-height:1.8;
                        color:#B197A2;
                        word-break:break-all;
                    "
                >
                    หากปุ่มไม่ทำงาน ให้เปิดลิงก์นี้ในเบราว์เซอร์:
                    <br />
                    ${escapeHtml(resetLink)}
                </p>

            </div>


            <!-- FOOTER -->

            <div
                style="
                    padding:20px 28px;
                    border-top:1px solid #F3E3E9;
                    text-align:center;
                    background:#FCFAFB;
                "
            >

                <div
                    style="
                        font-family:Georgia,serif;
                        font-size:13px;
                        color:#98506B;
                    "
                >
                    KOKO MEMORY
                </div>

                <div
                    style="
                        margin-top:4px;
                        font-size:10px;
                        color:#B197A2;
                    "
                >
                    เก็บทุกช่วงเวลาไว้ด้วยกัน
                </div>

            </div>

        </div>

    </div>

</body>

</html>
`;
}


/* ============================================================
   HTML ESCAPE
============================================================ */

function escapeHtml(
    value: string,
) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll(
            "'",
            "&#039;",
        );
}


/* ============================================================
   FIREBASE ERROR CODE
============================================================ */

function getFirebaseErrorCode(
    error: unknown,
): string {
    if (
        error &&
        typeof error === "object" &&
        "code" in error
    ) {
        const firebaseError =
            error as {
                code?: unknown;
            };

        return typeof firebaseError.code ===
            "string"
            ? firebaseError.code
            : "";
    }

    return "";
}