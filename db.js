import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

initializeApp({
  credentials: applicationDefault(),
});

const db = getFirestore();

export { db };
