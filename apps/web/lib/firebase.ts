import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";

// 公開してOKの値（Firebase web config）。env で上書き可能。
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBnm1OFZCFOgtStOF9SZpju4BMXP2696Yw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0136429763.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "gen-lang-client-0136429763",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:554218173303:web:d1c7ba080846421cdd6772",
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

function authInstance(): Auth | null {
  if (typeof window === "undefined") return null;
  return getAuth(getFirebaseApp());
}

let signInPromise: Promise<unknown> | null = null;

/**
 * 匿名サインインしてIDトークンを返す。各ブラウザ＝固有uid＝テナント分離。
 * サーバー側(SSR)や未対応環境では null（APIは dev フォールバックで動く）。
 */
export async function getIdToken(): Promise<string | null> {
  const auth = authInstance();
  if (!auth) return null;
  if (!auth.currentUser) {
    if (!signInPromise) {
      signInPromise = signInAnonymously(auth).catch((e) => {
        signInPromise = null;
        throw e;
      });
    }
    try {
      await signInPromise;
    } catch {
      return null;
    }
  }
  return auth.currentUser ? auth.currentUser.getIdToken() : null;
}
