import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDT3Xd_aDFTNKI9OCLD-f4eryCRz5QNS2g",
    authDomain: "koko-wedding.firebaseapp.com",
    projectId: "koko-wedding",
    storageBucket: "koko-wedding.firebasestorage.app",
    messagingSenderId: "545467990571",
    appId: "1:545467990571:web:513dcf094cfe60d800a06e",
    measurementId: "G-YVBBC9F7H9",
};

const app =
    getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

export const storage = getStorage(app);

export default app;