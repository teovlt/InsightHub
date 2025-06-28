import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
  storageBucket: "insighthub-a285a.firebasestorage.app",
});

export const bucket = getStorage().bucket();
