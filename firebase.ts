// Firebase SDKから必要な関数をインポート
import * as firebaseApp from "firebase/app";
import * as firestore from "firebase/firestore";

//
// !!重要!!
// この部分は、ご自身のFirebaseプロジェクトの設定に置き換える必要があります。
// 詳しい手順は、アプリケーションの「README」ページを参照してください。
//
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 初期化後のインスタンスとエラーを格納する変数
let db: firestore.Firestore | null = null;
let firebaseInitializationError: string | null = null;

try {
  // 設定がプレースホルダーの値のままであるかを確認
  if (firebaseConfig.apiKey === "YOUR_API_KEY" || firebaseConfig.projectId === "YOUR_PROJECT_ID") {
    throw new Error("Firebase設定が更新されていません。`firebase.ts`ファイルを確認し、ご自身のプロジェクトの値に書き換えてください。");
  }
  // Firebaseアプリを初期化
  const app = firebaseApp.initializeApp(firebaseConfig);
  // Firestoreデータベースのインスタンスを取得
  db = firestore.getFirestore(app);
} catch (error: any) {
  console.error("Firebaseの初期化に失敗しました:", error);
  firebaseInitializationError = `Firebaseの初期化に失敗しました。firebase.tsのfirebaseConfigが正しく設定されているか、READMEを参考に確認してください。エラー: ${error.message}`;
}

// Firestoreのインスタンス、firestoreの名前空間、および初期化エラーをエクスポート
export { db, firestore, firebaseInitializationError };