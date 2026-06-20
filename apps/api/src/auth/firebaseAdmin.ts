import admin from "firebase-admin";

let initialized = false;

/**
 * firebase-admin を遅延初期化。USE_FIRESTORE か AUTH_REQUIRED が有効な時だけ起動。
 * Cloud Run では ADC（サービスアカウント）で自動認証。projectId は明示してトークン検証を安定化。
 */
export function getAdmin(): typeof admin | null {
  if (process.env.USE_FIRESTORE !== "true" && process.env.AUTH_REQUIRED !== "true") {
    return null;
  }
  if (!initialized) {
    try {
      admin.initializeApp({
        projectId:
          process.env.FIREBASE_PROJECT_ID ||
          process.env.GOOGLE_CLOUD_PROJECT ||
          "gen-lang-client-0136429763",
      });
    } catch {
      // already initialized
    }
    try {
      admin.firestore().settings({ ignoreUndefinedProperties: true });
    } catch {
      // settings can only be set once; ignore
    }
    initialized = true;
  }
  return admin;
}
