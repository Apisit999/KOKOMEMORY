import { S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!accountId) {
    throw new Error("Missing CLOUDFLARE_ACCOUNT_ID");
}

if (!process.env.R2_ACCESS_KEY_ID) {
    throw new Error("Missing R2_ACCESS_KEY_ID");
}

if (!process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error("Missing R2_SECRET_ACCESS_KEY");
}

export const r2 = new S3Client({
    region: "auto",

    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,

    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

export const R2_BUCKET_NAME =
    process.env.R2_BUCKET_NAME || "koko-memory-storage";