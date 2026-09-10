import { S3Client } from "@aws-sdk/client-s3";

/* =========================================================
   Cloudflare R2 Configuration
========================================================= */

function requiredEnv(name: string) {
    const rawValue = process.env[name];

    if (rawValue === undefined) {
        throw new Error(`Missing ${name}`);
    }

    const trimmedValue = rawValue.trim();
    const hasMatchingQuotes =
        (trimmedValue.startsWith("\"") &&
            trimmedValue.endsWith("\"")) ||
        (trimmedValue.startsWith("'") &&
            trimmedValue.endsWith("'"));

    const value = (
        hasMatchingQuotes
            ? trimmedValue.slice(1, -1)
            : trimmedValue
    ).trim();

    if (!value) {
        throw new Error(`Missing ${name}`);
    }

    return value;
}

const accountId = requiredEnv("R2_ACCOUNT_ID");
const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
const secretAccessKey = requiredEnv(
    "R2_SECRET_ACCESS_KEY"
);

if (!/^[a-f0-9]{32}$/i.test(accountId)) {
    throw new Error(
        "Invalid R2_ACCOUNT_ID"
    );
}

/* =========================================================
   R2 Endpoint
========================================================= */

const endpoint =
    `https://${accountId}.r2.cloudflarestorage.com`;

/* =========================================================
   R2 Client
========================================================= */

export const r2 = new S3Client({
    region: "auto",

    endpoint,

    forcePathStyle: true,

    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

/* =========================================================
   Bucket
========================================================= */

export const R2_BUCKET_NAME = requiredEnv(
    "R2_BUCKET_NAME"
);

/* =========================================================
   Public URL
========================================================= */

export const R2_PUBLIC_URL = requiredEnv(
    "R2_PUBLIC_URL"
).replace(/\/$/, "");

/* =========================================================
   Helpers
========================================================= */

export function getR2PublicUrl(
    key: string
) {
    if (!R2_PUBLIC_URL) {
        throw new Error(
            "Missing R2_PUBLIC_URL"
        );
    }

    return `${R2_PUBLIC_URL}/${key}`;
}