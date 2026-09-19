import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import {
    DeleteObjectCommand,
    PutObjectCommand,
} from "@aws-sdk/client-s3";

import { requireAdminApi } from "@/lib/require-admin-api";

import {
    r2,
    R2_BUCKET_NAME,
    getR2PublicUrl,
} from "@/lib/r2";

/* =========================================================
   Runtime
========================================================= */

export const runtime = "nodejs";

/* =========================================================
   Constants
========================================================= */


const MAX_FILE_SIZE =
    20 * 1024 * 1024;

const ALLOWED_MIME_TYPES =
    new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
    ]);

const EXTENSIONS: Record<
    string,
    string
> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

/* =========================================================
   JSON Response Helpers
========================================================= */

function jsonSuccess(
    data: Record<string, unknown>,
    status = 200
) {
    return NextResponse.json(
        {
            success: true,
            ...data,
        },
        { status }
    );
}

function jsonError(
    message: string,
    status = 500,
    code = "INTERNAL_SERVER_ERROR"
) {
    return NextResponse.json(
        {
            success: false,
            error: message,
            code,
        },
        { status }
    );
}

/* =========================================================
   Firebase Admin
   ---------------------------------------------------------
   ใช้ Named App โดยเฉพาะสำหรับ Portfolio API
   เพื่อป้องกันการชนกับ Firebase Admin instance
   จากไฟล์อื่นในโปรเจกต์
========================================================= */

const verifyAdmin = requireAdminApi;

function sanitizeId(
    value: string
) {
    return value
        .trim()
        .replace(
            /[^a-zA-Z0-9_-]/g,
            ""
        );
}

/* =========================================================
   Sanitize Filename
========================================================= */

function sanitizeFilename(
    filename: string
) {
    return filename
        .replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        )
        .slice(0, 120);
}

/* =========================================================
   Build Public URL
========================================================= */

function buildPublicUrl(
    key: string
) {
    return getR2PublicUrl(key);
}

/* =========================================================
   POST
   Upload Portfolio Image
========================================================= */

export async function POST(
    request: NextRequest
) {
    try {
        /* -----------------------------------------------------
           1. Verify Admin
        ----------------------------------------------------- */

        const user =
            await verifyAdmin(
                request
            );

        /* -----------------------------------------------------
           2. Parse FormData
        ----------------------------------------------------- */

        let formData: FormData;

        try {
            formData =
                await request.formData();
        } catch (error) {
            console.error(
                "[Portfolio API] FormData error:",
                error
            );

            return jsonError(
                "ไม่สามารถอ่านข้อมูล Upload ได้",
                400,
                "INVALID_FORM_DATA"
            );
        }

        /* -----------------------------------------------------
           3. Portfolio ID
        ----------------------------------------------------- */

        const rawPortfolioId =
            formData.get(
                "portfolioId"
            );

        if (
            typeof rawPortfolioId !==
            "string"
        ) {
            return jsonError(
                "ไม่พบ Portfolio ID",
                400,
                "MISSING_PORTFOLIO_ID"
            );
        }

        const portfolioId =
            sanitizeId(
                rawPortfolioId
            );

        if (!portfolioId) {
            return jsonError(
                "Portfolio ID ไม่ถูกต้อง",
                400,
                "INVALID_PORTFOLIO_ID"
            );
        }

        /* -----------------------------------------------------
           4. File
        ----------------------------------------------------- */

        const file =
            formData.get("file");

        if (
            !(file instanceof File)
        ) {
            return jsonError(
                "ไม่พบไฟล์รูปภาพ",
                400,
                "MISSING_FILE"
            );
        }

        /* -----------------------------------------------------
           5. File Size
        ----------------------------------------------------- */

        if (file.size <= 0) {
            return jsonError(
                "ไฟล์รูปภาพว่างเปล่า",
                400,
                "EMPTY_FILE"
            );
        }

        if (
            file.size >
            MAX_FILE_SIZE
        ) {
            return jsonError(
                "ไฟล์มีขนาดเกิน 20MB",
                413,
                "FILE_TOO_LARGE"
            );
        }

        /* -----------------------------------------------------
           6. MIME Type
        ----------------------------------------------------- */

        if (
            !ALLOWED_MIME_TYPES.has(
                file.type
            )
        ) {
            return jsonError(
                "รองรับเฉพาะ JPG, PNG และ WebP",
                415,
                "UNSUPPORTED_FILE_TYPE"
            );
        }

        const extension =
            EXTENSIONS[
                file.type
            ];

        if (!extension) {
            return jsonError(
                "ไม่สามารถระบุประเภทไฟล์ได้",
                400,
                "INVALID_EXTENSION"
            );
        }

        /* -----------------------------------------------------
           7. File → Buffer
        ----------------------------------------------------- */

        let buffer: Buffer;

        try {
            const arrayBuffer =
                await file.arrayBuffer();

            buffer =
                Buffer.from(
                    arrayBuffer
                );
        } catch (error) {
            console.error(
                "[Portfolio API] File conversion failed:",
                error
            );

            return jsonError(
                "ไม่สามารถอ่านไฟล์รูปภาพได้",
                400,
                "FILE_READ_FAILED"
            );
        }

        /* -----------------------------------------------------
           8. Generate R2 Key
        ----------------------------------------------------- */

        const uuid =
            crypto.randomUUID();

        const timestamp =
            Date.now();

        const safeFilename =
            sanitizeFilename(
                file.name
            );

        const key =
            `portfolio/${portfolioId}/${timestamp}-${uuid}.${extension}`;

        /* -----------------------------------------------------
           9. Upload R2
        ----------------------------------------------------- */

        try {
            await r2.send(
                new PutObjectCommand({
                    Bucket:
                        R2_BUCKET_NAME,

                    Key: key,

                    Body: buffer,

                    ContentType:
                        file.type,

                    ContentLength:
                        buffer.length,

                    CacheControl:
                        "public, max-age=31536000, immutable",

                    Metadata: {
                        portfolioId,

                        uploadedBy:
                            user.uid,

                        originalName:
                            safeFilename,
                    },
                })
            );
        } catch (error) {
            console.error(
                "[Portfolio API] R2 upload failed:",
                error
            );

            return jsonError(
                "ไม่สามารถ Upload รูปไปยัง Cloudflare R2 ได้",
                502,
                "R2_UPLOAD_FAILED"
            );
        }

        /* -----------------------------------------------------
           10. Public URL
        ----------------------------------------------------- */

        let url: string;

        try {
            url =
                buildPublicUrl(
                    key
                );
        } catch (error) {
            console.error(
                "[Portfolio API] Public URL error:",
                error
            );

            /* -------------------------------------------------
               Cleanup uploaded object
            ------------------------------------------------- */

            try {
                await r2.send(
                    new DeleteObjectCommand(
                        {
                            Bucket:
                                R2_BUCKET_NAME,

                            Key: key,
                        }
                    )
                );
            } catch (
                cleanupError
            ) {
                console.error(
                    "[Portfolio API] R2 cleanup failed:",
                    cleanupError
                );
            }

            return jsonError(
                "ระบบ R2 ยังไม่ได้ตั้งค่า Public URL",
                500,
                "MISSING_R2_PUBLIC_URL"
            );
        }

        /* -----------------------------------------------------
           11. Success
        ----------------------------------------------------- */

        return jsonSuccess(
            {
                id: uuid,

                key,

                url,

                name:
                    file.name,

                contentType:
                    file.type,

                size:
                    file.size,

                portfolioId,

                uploadedBy:
                    user.uid,
            },
            201
        );
    } catch (error) {
        console.error(
            "[Portfolio API] Upload error:",
            error
        );

        if (
            error instanceof Error
        ) {
            switch (
                error.message
            ) {
                case "UNAUTHORIZED":
                case "INVALID_AUTH_HEADER":
                case "MISSING_TOKEN":
                case "INVALID_TOKEN":
                    return jsonError(
                        "กรุณาเข้าสู่ระบบ Admin ใหม่",
                        401,
                        error.message
                    );

                case "PROJECT_MISMATCH":
                    return jsonError(
                        "Firebase Project ของบัญชี Login ไม่ตรงกับระบบ",
                        401,
                        "PROJECT_MISMATCH"
                    );

                case "FORBIDDEN":
                case "NOT_ADMIN":
                    return jsonError(
                        "บัญชีนี้ไม่มีสิทธิ์ Admin",
                        403,
                        "NOT_ADMIN"
                    );

                case "ADMIN_DISABLED":
                    return jsonError(
                        "บัญชี Admin ถูกปิดการใช้งาน",
                        403,
                        "ADMIN_DISABLED"
                    );

                case "MISSING_R2_PUBLIC_URL":
                    return jsonError(
                        "ยังไม่ได้ตั้งค่า R2 Public URL",
                        500,
                        "MISSING_R2_PUBLIC_URL"
                    );

                default:
                    break;
            }
        }

        return jsonError(
            error instanceof Error
                ? error.message
                : "เกิดข้อผิดพลาดภายในระบบ",
            500,
            "INTERNAL_SERVER_ERROR"
        );
    }
}

/* =========================================================
   DELETE
   Future-ready
   ลบ Portfolio Image จาก R2
========================================================= */

export async function DELETE(
    request: NextRequest
) {
    try {
        /* -----------------------------------------------------
           1. Verify Admin
        ----------------------------------------------------- */

        await verifyAdmin(
            request
        );

        /* -----------------------------------------------------
           2. Parse JSON
        ----------------------------------------------------- */

        let body: unknown;

        try {
            body =
                await request.json();
        } catch {
            return jsonError(
                "ข้อมูล Delete ไม่ถูกต้อง",
                400,
                "INVALID_JSON"
            );
        }

        if (
            !body ||
            typeof body !==
                "object"
        ) {
            return jsonError(
                "ข้อมูล Delete ไม่ถูกต้อง",
                400,
                "INVALID_BODY"
            );
        }

        const data =
            body as {
                key?: unknown;
            };

        /* -----------------------------------------------------
           3. Validate Key
        ----------------------------------------------------- */

        if (
            typeof data.key !==
                "string" ||
            !data.key.trim()
        ) {
            return jsonError(
                "ไม่พบ R2 key",
                400,
                "MISSING_KEY"
            );
        }

        const key =
            data.key.trim();

        /* -----------------------------------------------------
           Security:
           อนุญาตเฉพาะ portfolio/
        ----------------------------------------------------- */

        if (
            !key.startsWith(
                "portfolio/"
            )
        ) {
            return jsonError(
                "ไม่อนุญาตให้ลบไฟล์นี้",
                403,
                "INVALID_KEY"
            );
        }

        /* -----------------------------------------------------
           4. Delete R2 Object
        ----------------------------------------------------- */

        try {
            await r2.send(
                new DeleteObjectCommand(
                    {
                        Bucket:
                            R2_BUCKET_NAME,

                        Key: key,
                    }
                )
            );
        } catch (error) {
            console.error(
                "[Portfolio API] R2 delete failed:",
                error
            );

            return jsonError(
                "ไม่สามารถลบรูปจาก Cloudflare R2 ได้",
                502,
                "R2_DELETE_FAILED"
            );
        }

        /* -----------------------------------------------------
           5. Success
        ----------------------------------------------------- */

        return jsonSuccess({
            key,

            deleted: true,
        });
    } catch (error) {
        console.error(
            "[Portfolio API] Delete error:",
            error
        );

        if (
            error instanceof Error
        ) {
            switch (
                error.message
            ) {
                case "UNAUTHORIZED":
                case "INVALID_AUTH_HEADER":
                case "MISSING_TOKEN":
                case "INVALID_TOKEN":
                    return jsonError(
                        "กรุณาเข้าสู่ระบบ Admin ใหม่",
                        401,
                        error.message
                    );

                case "PROJECT_MISMATCH":
                    return jsonError(
                        "Firebase Project ของบัญชี Login ไม่ตรงกับระบบ",
                        401,
                        "PROJECT_MISMATCH"
                    );

                case "FORBIDDEN":
                case "NOT_ADMIN":
                    return jsonError(
                        "บัญชีนี้ไม่มีสิทธิ์ Admin",
                        403,
                        "NOT_ADMIN"
                    );

                case "ADMIN_DISABLED":
                    return jsonError(
                        "บัญชี Admin ถูกปิดการใช้งาน",
                        403,
                        "ADMIN_DISABLED"
                    );

                default:
                    break;
            }
        }

        return jsonError(
            error instanceof Error
                ? error.message
                : "เกิดข้อผิดพลาดภายในระบบ",
            500,
            "INTERNAL_SERVER_ERROR"
        );
    }
}
