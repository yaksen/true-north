
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBA3nzkgykFZFrlYo8P_WDTg59hsr7e49I",
  authDomain: "yaksen-crm.firebaseapp.com",
  projectId: "yaksen-crm",
  storageBucket: "yaksen-crm.firebasestorage.app",
  messagingSenderId: "41964003868",
  appId: "1:41964003868:web:eca64815fea3df34f075d9"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
