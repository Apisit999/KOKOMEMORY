import { config } from "dotenv";

config({
    path: ".env.local",
});

async function main() {
    try {
        const { adminAuth } = await import(
            "../src/lib/firebase-admin"
        );

        const ADMIN_EMAIL =
            "kokomemory.admin@gmail.com";

        console.log("");
        console.log("========================================");
        console.log(" KOKO Memory - Admin Setup");
        console.log("========================================");
        console.log("");

        console.log(
            "FIREBASE_PROJECT_ID:",
            process.env.FIREBASE_PROJECT_ID
                ? "OK"
                : "MISSING"
        );

        console.log(
            "FIREBASE_CLIENT_EMAIL:",
            process.env.FIREBASE_CLIENT_EMAIL
                ? "OK"
                : "MISSING"
        );

        console.log(
            "FIREBASE_PRIVATE_KEY:",
            process.env.FIREBASE_PRIVATE_KEY
                ? "OK"
                : "MISSING"
        );

        console.log("");

        const user =
            await adminAuth.getUserByEmail(
                ADMIN_EMAIL
            );

        console.log("พบผู้ใช้:");
        console.log("Email:", user.email);
        console.log("UID:", user.uid);
        console.log(
            "Current Claims:",
            user.customClaims ?? {}
        );

        console.log("");
        console.log("กำลังตั้ง Admin Claim...");

        await adminAuth.setCustomUserClaims(
            user.uid,
            {
                ...(user.customClaims ?? {}),
                admin: true,
            }
        );

        const updatedUser =
            await adminAuth.getUser(user.uid);

        console.log("");
        console.log("========================================");
        console.log(" RESULT");
        console.log("========================================");
        console.log("Email:", updatedUser.email);
        console.log("UID:", updatedUser.uid);
        console.log(
            "Claims:",
            updatedUser.customClaims
        );

        if (
            updatedUser.customClaims?.admin === true
        ) {
            console.log("");
            console.log(
                "✅ ADMIN CLAIM = TRUE"
            );
            console.log(
                "ตอนนี้ Logout แล้ว Login ใหม่ได้เลย"
            );
        } else {
            console.log("");
            console.log(
                "❌ ADMIN CLAIM ยังไม่ถูกตั้ง"
            );
        }

        console.log("");
    } catch (error) {
        console.error("");
        console.error(
            "========================================"
        );
        console.error(
            "❌ ADMIN SETUP FAILED"
        );
        console.error(
            "========================================"
        );
        console.error(error);
        console.error("");
        process.exit(1);
    }
}

main();