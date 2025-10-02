/// <reference types="vite/client" />

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Contribution } from './utils/parsePaystub';
import { StoredFile } from './App';
import { PaystubRecord } from './types';
import localforage from 'localforage';

// Firebase configuration – expected to be provided via Vite env vars
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Init once
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const stateRef = doc(db, 'state', 'main');

const LOCAL_KEY = 'investments-tracker-state';

export async function uploadFile(file: File, id: string): Promise<string> {
  const storageRef = ref(storage, `paystubs/${id}-${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function loadData(): Promise<{ entries: Contribution[], files: StoredFile[], paystubs: PaystubRecord[] }> {
  console.log('[storage] loadData() called');
  try {
    const snap = await getDoc(stateRef);
    if (!snap.exists()) {
      // Try local fallback
      const local = await localforage.getItem<any>(LOCAL_KEY);
      if (local) {
        console.warn('[storage] Falling back to localForage state');
        return local;
      }
      return { entries: [], files: [], paystubs: [] };
    }
    const data = snap.data();
    const result = {
      entries: (data.entries as Contribution[]) || [],
      files: (data.files as StoredFile[]) || [],
      paystubs: (data.paystubs as PaystubRecord[]) || [],
    };
    console.log('[storage] loaded', result);
    return result;
  } catch (error) {
    console.error('[storage] loadData failed', error);
    const local = await localforage.getItem<any>(LOCAL_KEY);
    if (local) return local;
    return { entries: [], files: [], paystubs: [] };
  }
}

export async function saveData(entries: Contribution[], files: StoredFile[], paystubs: PaystubRecord[]) {
  console.log('[storage] saveData() called', { entriesLen: entries.length, filesLen: files.length, paystubsLen: paystubs.length });
  try {
    const cleanedPaystubs = paystubs.map(p => JSON.parse(JSON.stringify(p))); // remove undefined values
    await setDoc(stateRef, { entries, files, paystubs: cleanedPaystubs });
    await localforage.setItem(LOCAL_KEY, { entries, files, paystubs: cleanedPaystubs });
    console.log('[storage] saveData success');
  } catch (error) {
    console.error('[storage] saveData FAILED', error);
    // at least persist locally
    await localforage.setItem(LOCAL_KEY, { entries, files, paystubs });
  }
} 