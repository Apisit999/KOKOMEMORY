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

let client: S3Client | undefined;

function getR2Client() {
    if (client) return client;

    const accountId = requiredEnv("R2_ACCOUNT_ID");
    const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
    const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");

    if (!/^[a-f0-9]{32}$/i.test(accountId)) {
        throw new Error("Invalid R2_ACCOUNT_ID");
    }

    client = new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        forcePathStyle: true,
        credentials: { accessKeyId, secretAccessKey },
    });

    return client;
}

// Keep private R2 credentials out of the build process. The client is created on first use
// inside a server request, when the deployment's runtime environment is available.
export const r2 = new Proxy({} as S3Client, {
    get(_target, property) {
        const service = getR2Client();
        const value = Reflect.get(service, property, service);
        return typeof value === "function" ? value.bind(service) : value;
    },
});

/* =========================================================
   Bucket
========================================================= */

export const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "";

/* =========================================================
   Public URL
========================================================= */

export const R2_PUBLIC_URL = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");

/* =========================================================
   Helpers
========================================================= */

export function getR2PublicUrl(
    key: string
) {
    if (!R2_PUBLIC_URL) throw new Error("Missing R2_PUBLIC_URL");

    return `${R2_PUBLIC_URL}/${key}`;
}
