// Firebase SDKから必要な関数をインポート
// Fix: Changed from a named import to a namespace import to work around a module resolution issue.
import * as firebaseApp from "firebase/app";
// Fix: Changed from a named import for `getFirestore` to a namespace import to fix module resolution errors.
import * as firestore from "firebase/firestore";

//
// !!重要!!
// この部分は、ご自身のFirebaseプロジェクトの設定に置き換える必要があります。
// 詳しい手順は、アプリケーションの「README」ページを参照してください。
//
const firebaseConfig = {
  apiKey: "AIzaSyCzX_jvAGGKH_tWy06zPCC9Gtfmuio3erg",
  authDomain: "car-auction-d396a.firebaseapp.com",
  projectId: "car-auction-d396a",
  storageBucket: "car-auction-d396a.firebasestorage.app",
  messagingSenderId: "196992874691",
  appId: "1:196992874691:web:0feda13076dd173f620a76",
  measurementId: "G-BRR47MCFM4"
};
// Firebaseアプリを初期化
const app = firebaseApp.initializeApp(firebaseConfig);

// Firestoreデータベースのインスタンスを取得
export const db = firestore.getFirestore(app);

// 他のファイルで一貫したfirestoreインスタンスを使用できるように、名前空間もエクスポートします
export { firestore };