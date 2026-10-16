import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { migrateStudio } from "../src/lib/studio/migration.ts";
import { FirestoreStore } from "../src/lib/studio/firestore-store.ts";
// Explicit operation: never mutate existing policy during application startup.
const environment = process.env.STUDIO_ENV;
if (!["local", "staging"].includes(environment ?? "")) throw new Error("Migration is limited to local/staging in this delivery");
if (environment === "local" && (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.GCLOUD_PROJECT?.startsWith("demo-"))) throw new Error("Local migration requires demo project + Firestore emulator");
if (environment === "staging" && process.env.STUDIO_MIGRATION_PROJECT_CONFIRM !== process.env.GCLOUD_PROJECT) throw new Error("Confirm the staging project ID explicitly");
const app = getApps()[0] ?? initializeApp({ projectId: process.env.GCLOUD_PROJECT });
const result = await migrateStudio(new FirestoreStore(getFirestore(app)));
console.log(JSON.stringify(result));
