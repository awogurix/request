import React from 'react';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm my-2">
    <code>{children}</code>
  </pre>
);

const ReadmePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg border">
      <h1 className="text-4xl font-bold mb-4 text-gray-800 border-b-2 pb-2">ラジオ曲リクエストアプリ (GitHub Pages版) README</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2 text-radio-blue">1. アプリケーション概要</h2>
        <p className="text-gray-700">
          このアプリケーションは、ラジオ番組のリスナーが曲のリクエストを送信し、そのリクエストをリアルタイムで共有・管理できるWebアプリケーションです。
          データの保存先としてFirebase Firestoreを、ホスティング先としてGitHub Pagesを使用しています。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2 text-radio-blue">2. 技術仕様</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>フロントエンド:</strong> React, TypeScript</li>
          <li><strong>スタイリング:</strong> Tailwind CSS</li>
          <li><strong>データ永続化 (バックエンド):</strong> Firebase Firestore</li>
          <li><strong>ホスティング:</strong> GitHub Pages</li>
        </ul>
      </section>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2 text-radio-blue">3. セットアップ & デプロイ手順</h2>

        <div className="mt-4 p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p className="font-bold">【最重要】設定を完了させてください</p>
          <p>
            このセクションの手順を<strong>すべて正確に</strong>完了しないと、アプリケーションは正しく動作しません。
            エラーが表示される場合、原因はほぼ間違いなくここの設定ミスです。
          </p>
        </div>

        <div className="space-y-8 mt-6">
            <div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">パートA: バックエンドの設定 (Firebase)</h3>
                <p className="text-gray-600 mb-4">
                  アプリのデータ（曲のリクエストなど）を保存するためにFirebaseを設定します。これはホスティングとは別の、データベース側の設定です。
                </p>
                <ol className="list-decimal list-inside space-y-2 pl-4 text-gray-700">
                    <li><a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Firebaseコンソール</a>にアクセスし、Googleアカウントでログインします。</li>
                    <li>「プロジェクトを追加」をクリックし、新しいFirebaseプロジェクトを作成します。</li>
                    <li>プロジェクトダッシュボードの左側メニューから「ビルド」&gt;「Firestore Database」を選択します。</li>
                    <li>「データベースの作成」をクリックし、「<strong>本番環境モードで開始</strong>」を選択してデータベースを有効にします。</li>
                    <li>次に、プロジェクトの概要ページの歯車アイコン &gt;「プロジェクトの設定」に進みます。</li>
                    <li>「マイアプリ」セクションで、ウェブアプリのアイコン (<code>&lt;/&gt;</code>) をクリックして新しいウェブアプリを登録します。</li>
                    <li>アプリのニックネームを登録後、「アプリを登録」をクリックすると <code>firebaseConfig</code> というオブジェクトが表示されます。<strong>この内容は次のステップで必要になるので、必ずコピーしてください。</strong></li>
                    <li>
                        プロジェクト内の <code>firebase.ts</code> というファイルを開き、<code>firebaseConfig</code> の部分をステップ7でコピーしたものに完全に置き換えます。
                        <div className="my-4 p-6 bg-red-100 border-l-8 border-red-600 text-red-900">
                            <p className="text-xl font-extrabold">🚨【最重要警告】この設定は必須です！ 🚨</p>
                            <p className="mt-2">
                                現在表示されているエラーメッセージ <strong>「Firebase設定が更新されていません」</strong> は、このステップが完了していないことが直接の原因です。
                            </p>
                            <p className="mt-2">
                                下のコードブロックの <code>firebaseConfig</code> オブジェクトは、<strong>必ずご自身のFirebaseプロジェクトからコピーしたものに完全に置き換えてください。</strong>
                                この部分を置き換えない限り、アプリケーションは絶対に動作しません。
                            </p>
                        </div>
                        <CodeBlock>{`import * as firebaseApp from "firebase/app";
import * as firestore from "firebase/firestore";

// ▼▼▼▼▼ このfirebaseConfigの部分を、ご自身のFirebaseプロジェクトのものに置き換えてください ▼▼▼▼▼
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
// ▲▲▲▲▲ ここまで ▲▲▲▲▲

// 以下は編集不要です
const app = firebaseApp.initializeApp(firebaseConfig);
export const db = firestore.getFirestore(app);
export { firestore };`}</CodeBlock>
                        <div className="mt-4 p-4 border-2 border-dashed border-gray-400 rounded-lg bg-gray-50">
                            <h4 className="text-lg font-semibold text-center text-gray-700">【コピー＆ペーストのイメージ】</h4>
                            <div className="text-center my-2 font-mono">
                                <div className="inline-block p-4 bg-blue-100 border border-blue-300 rounded">
                                    Firebaseコンソール画面<br/>
                                    (コピー元の<code>firebaseConfig</code>)
                                </div>
                                <div className="text-2xl font-bold text-blue-500 mx-4 inline-block align-middle">→</div>
                                <div className="inline-block p-4 bg-green-100 border border-green-300 rounded">
                                    <code>firebase.ts</code> ファイル内<br/>
                                    (貼り付け先の<code>firebaseConfig</code>)
                                </div>
                            </div>
                        </div>
                    </li>
                    <li>Firebaseコンソールの「Firestore Database」ページに戻り、「ルール」タブをクリックし、エディタの内容を以下のルールに完全に置き換えて「<strong>公開</strong>」をクリックします。
                        <CodeBlock>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /songRequests/{requestId} {
      allow read, write: if true;
    }
  }
}`}</CodeBlock>
                    </li>
                </ol>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2 border-t-2 pt-6 mt-8">パートB: フロントエンドのデプロイ (GitHub Pages)</h3>
               <p className="text-gray-600 mb-4">
                  作成したアプリケーションを、GitHub Pagesを使ってインターネット上に公開します。
                </p>
              <ol className="list-decimal list-inside space-y-4 pl-4 text-gray-700">
                <li>
                  <strong>ステップ1: GitHubリポジトリの作成とプッシュ</strong><br/>
                  <p>GitHub上で新しいリポジトリを作成し、このアプリケーションのコード全体をプッシュします。</p>
                </li>
                <li>
                  <strong>ステップ2: GitHub Pagesの設定</strong><br/>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                      <li>コードをプッシュしたリポジトリのページで、「Settings」タブに移動します。</li>
                      <li>左側のメニューから「Pages」を選択します。</li>
                      <li>「Build and deployment」の「Source」で、「Deploy from a branch」を選択します。</li>
                      <li>「Branch」セクションで、公開したいブランチ（例: <code>main</code> または <code>master</code>）を選択し、フォルダは「<code>/(root)</code>」のままにして「Save」をクリックします。</li>
                  </ul>
                </li>
                <li>
                    <strong>ステップ3: デプロイ完了とURLの確認</strong><br/>
                    <p>
                      設定を保存後、ページの上部に「Your site is live at ...」というメッセージが表示されるまで数分待ちます。
                    </p>
                    <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 my-2">
                       <p className="font-bold">
                        表示されたURLが、あなたのアプリケーションの公開URLです。
                      </p>
                    </div>
                    <p>URLの形式:</p>
                    <CodeBlock>https://&lt;あなたのユーザー名&gt;.github.io/&lt;リポジトリ名&gt;/</CodeBlock>
                     <p className="text-sm text-gray-600">
                       このURLにアクセスして、デプロイされたアプリを確認してください。
                      </p>
                </li>
              </ol>
            </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2 text-red-600">4. トラブルシューティング</h2>
        <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg border">
              <h3 className="text-xl font-semibold text-gray-800">エラー: "Firebase設定が更新されていません..." または "Firestoreからのデータ読み込みに失敗しました..."</h3>
              <p className="text-gray-700 mt-2">
                これは、<code>firebase.ts</code>の<code>firebaseConfig</code>が正しく設定されていないことが原因です。上記「<strong>パートAのステップ8</strong>」に戻り、Firebaseコンソールからコピーしたご自身の<code>firebaseConfig</code>に正しく置き換えられているか、再度、注意深く確認してください。
              </p>
            </div>
            <div className="bg-gray-50 p-6 rounded-lg border">
              <h3 className="text-xl font-semibold text-gray-800">問題: デプロイ後、ページが真っ白になる、または「404 Not Found」と表示される</h3>
              <p className="text-gray-700 mt-2">
                <code>firebase.ts</code>の設定が間違っている場合、ページが真っ白になることがあります。まずは上記のエラー解決策を確認してください。それでも解決しない場合は、以下の点を確認してください。
              </p>
               <ul className="list-disc list-inside ml-6 mt-2 text-sm space-y-1">
                  <li><code>index.html</code> の <code>&lt;script src="./index.tsx"&gt;</code> のパスが <code>./</code> から始まっていることを確認してください。</li>
                  <li>ブラウザの開発者ツール（F12キーで開けます）の「コンソール」タブに、何か赤いエラーメッセージが表示されていないか確認してください。</li>
                  <li>GitHub Pagesの設定で、正しいブランチが選択されているか確認してください。</li>
                </ul>
            </div>
        </div>
      </section>

    </div>
  );
};

export default ReadmePage;