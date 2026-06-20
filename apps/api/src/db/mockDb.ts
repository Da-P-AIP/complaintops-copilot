// 旧 in-memory 実装は db/store.ts（MemoryStore / FirestoreStore）に統合されました。
// 後方互換のため最小の再エクスポートのみ残します。
export { getStore, genId } from "./store";
