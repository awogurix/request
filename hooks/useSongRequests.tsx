import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SongRequest } from '../types';
import { db } from '../firebase'; // Firebase設定をインポート
// Fix: All named imports from 'firebase/firestore' were failing.
// Changed to a namespace import to resolve the module resolution issue,
// consistent with the fix in firebase.ts.
import * as firestore from 'firebase/firestore';

// FirestoreからのデータはtimestampがFirebaseのTimestampオブジェクトになるため、
// アプリケーション内で使いやすいようにstringに変換する前の型を定義
interface FirestoreSongRequest extends Omit<SongRequest, 'timestamp' | 'id'> {
  timestamp: firestore.Timestamp;
}

// コンテキストの型定義
interface RequestContextType {
  requests: SongRequest[];
  addRequest: (request: Omit<SongRequest, 'id' | 'timestamp' | 'isRead'>) => Promise<void>;
  updateRequestStatus: (id: string, isRead: boolean) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

// コンテキストの作成
const RequestContext = createContext<RequestContextType | undefined>(undefined);

// Firestoreの'songRequests'コレクションへの参照
const requestsCollectionRef = firestore.collection(db, 'songRequests');

// コンテキストプロバイダーの作成
export const RequestProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 初回マウント時にFirestoreからデータをリアルタイムで購読する
  useEffect(() => {
    // タイムスタンプの降順でデータをクエリ
    const q = firestore.query(requestsCollectionRef, firestore.orderBy('timestamp', 'desc'));

    const unsubscribe = firestore.onSnapshot(q, (querySnapshot) => {
      const requestsData: SongRequest[] = querySnapshot.docs.map((doc) => {
        const data = doc.data() as FirestoreSongRequest;
        // Firestoreから取得したデータを、アプリケーション内で安全に扱えるプレーンなオブジェクトに変換します。
        // ...data のようなスプレッド構文は、意図しないプロパティや循環参照を持つオブジェクトを
        // stateに含めてしまう可能性があるため、必要なプロパティのみを明示的に抽出します。
        return {
          id: doc.id,
          songTitle: data.songTitle,
          artistName: data.artistName,
          nickname: data.nickname,
          message: data.message || '',
          isRead: data.isRead,
          timestamp: data.timestamp.toDate().toISOString(),
        };
      });
      setRequests(requestsData);
      setLoading(false);
      setError(null);
    }, (err) => {
      console.error("Firestoreからのデータ読み込みに失敗しました:", err.message);
      setError("データベースからのデータ読み込みに失敗しました。Firebaseの設定が正しいか確認してください。（READMEページ参照）");
      setLoading(false);
    });

    // コンポーネントのアンマウント時に購読を解除するクリーンアップ関数
    return () => unsubscribe();
  }, []);

  // 新しいリクエストをFirestoreに追加する関数
  const addRequest = useCallback(async (requestData: Omit<SongRequest, 'id' | 'timestamp' | 'isRead'>) => {
    try {
      await firestore.addDoc(requestsCollectionRef, {
        ...requestData,
        timestamp: firestore.Timestamp.fromDate(new Date()),
        isRead: false,
      });
    } catch (error) {
       console.error("リクエストの追加に失敗しました:", error);
       throw new Error("リクエストの追加に失敗しました。");
    }
  }, []);

  // リクエストの既読/未読ステータスをFirestoreで更新する関数
  const updateRequestStatus = useCallback(async (id: string, isRead: boolean) => {
    try {
      const requestDoc = firestore.doc(db, 'songRequests', id);
      await firestore.updateDoc(requestDoc, { isRead });
    } catch (error) {
      console.error("ステータスの更新に失敗しました:", error);
      throw new Error("ステータスの更新に失敗しました。");
    }
  }, []);

  // リクエストをFirestoreから削除する関数
  const deleteRequest = useCallback(async (id: string) => {
    try {
      const requestDoc = firestore.doc(db, 'songRequests', id);
      await firestore.deleteDoc(requestDoc);
    // Fix: The catch block was missing curly braces, which is a syntax error.
    } catch (error) {
      console.error("リクエストの削除に失敗しました:", error);
      throw new Error("リクエストの削除に失敗しました。");
    }
  }, []);

  const value = { requests, addRequest, updateRequestStatus, deleteRequest, loading, error };

  return (
    <RequestContext.Provider value={value}>
      {children}
    </RequestContext.Provider>
  );
};

// コンテキストを使用するためのカスタムフック
export const useSongRequests = (): RequestContextType => {
  const context = useContext(RequestContext);
  if (context === undefined) {
    throw new Error('useSongRequests must be used within a RequestProvider');
  }
  return context;
};