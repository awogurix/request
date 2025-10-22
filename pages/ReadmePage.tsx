import React from 'react';

const CodeBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre className="bg-gray-800 text-white p-4 rounded-md overflow-x-auto text-sm my-2">
    <code>{children}</code>
  </pre>
);

const ReadmePage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-lg border">
      <h1 className="text-4xl font-bold mb-4 text-gray-800 border-b-2 pb-2">ラジオ曲リクエストアプリ (Firebase版) README</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2 text-radio-blue">1. アプリケーション概要</h2>
        <p className="text-gray-700">
          このアプリケーションは、ラジオ番組のリスナーが曲のリクエストを送信し、そのリクエストをリアルタイムで共有・管理できるWebアプリケーションです。
          データの保存先としてFirebase Firestoreを使用しており、複数人での利用が可能です。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2 text-radio-blue">2. 技術仕様</h2>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li><strong>フロントエンド:</strong> React, TypeScript</li>
          <li><strong>スタイリング:</strong> Tailwind CSS</li>
          <li><strong>データ永続化:</strong> Firebase Firestore (リアルタイムデータベース)</li>
          <li><strong>ホスティング:</strong> Firebase Hosting</li>
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
                <h3 className="text-xl font-semibold text-gray-700 mb-2">ステップ1: Firebaseプロジェクトの作成と設定</h3>
                <ol className="list-decimal list-inside space-y-2 pl-4 text-gray-700">
                    <li><a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Firebaseコンソール</a>にアクセスし、Googleアカウントでログインします。</li>
                    <li>「プロジェクトを追加」をクリックし、新しいFirebaseプロジェクトを作成します。</li>
                    <li>プロジェクトダッシュボードの左側メニューから「ビルド」&gt;「Firestore Database」を選択します。</li>
                    <li>「データベースの作成」をクリックし、「<strong>本番環境モードで開始</strong>」を選択してデータベースを有効にします。(セキュリティルールは次のステップで設定します)</li>
                    <li>次に、プロジェクトの概要ページの歯車アイコン &gt;「プロジェクトの設定」に進みます。</li>
                    <li>「マイアプリ」セクションで、ウェブアプリのアイコン (<code>&lt;/&gt;</code>) をクリックして新しいウェブアプリを登録します。</li>
                    <li>アプリのニックネームを登録後、「アプリを登録」をクリックすると <code>firebaseConfig</code> というオブジェクトが表示されます。<strong>この内容はステップ2で必要になるので、必ずコピーしてください。</strong></li>
                </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">ステップ2: アプリケーションの設定ファイル作成</h3>
              <ol className="list-decimal list-inside space-y-2 pl-4 text-gray-700">
                  <li>プロジェクト内に <code>firebase.ts</code> という名前のファイルを作成します。(もし既にあれば、そのファイルを編集します)</li>
                  <li>以下の内容を <code>firebase.ts</code> に貼り付け、<code>firebaseConfig</code> オブジェクトの部分を、<strong>ステップ1でコピーしたものに完全に置き換えます。</strong></li>
              </ol>
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

const app = firebaseApp.initializeApp(firebaseConfig);
export const db = firestore.getFirestore(app);`}</CodeBlock>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">ステップ3: Firestoreセキュリティルールの設定 (エラー最頻出箇所)</h3>
              <p className="text-gray-700 mb-2">
                「本番環境モード」では、初期設定ですべてのデータベースアクセスがブロックされます。このままではアプリがデータを読み書きできず、「Missing or insufficient permissions」エラーが必ず発生します。
              </p>
              <ol className="list-decimal list-inside space-y-2 pl-4 text-gray-700">
                <li>Firebaseコンソールの「Firestore Database」ページに戻り、「ルール」タブをクリックします。</li>
                <li>エディタに表示されている内容を、<strong>以下のルールに完全に置き換えます。</strong></li>
              </ol>
              <CodeBlock>{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // songRequestsコレクションへのアクセスを許可します。
    match /songRequests/{requestId} {
      // 誰でもリクエストの読み取り、作成、更新、削除が可能です。
      // これによりアプリケーションが正常に動作しますが、
      // 本番環境ではより厳格なルールを設定することを強く推奨します。
      allow read, write: if true;
    }
  }
}`}</CodeBlock>
              <ol className="list-decimal list-inside space-y-2 pl-4 text-gray-700" start={3}>
                <li>「<strong className="text-blue-600">公開</strong>」ボタンをクリックして、新しいルールを保存します。</li>
              </ol>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2 border-t-2 pt-4 mt-8">🚨 ステップ4: Firebaseへのデプロイ (最重要) 🚨</h3>
              <p className="text-gray-700 mb-4">
                ここが最もエラーの発生しやすいステップです。以下の手順を正確に実行してください。
              </p>
              <ol className="list-decimal list-inside space-y-4 pl-4 text-gray-700">
                <li>
                  <strong>4.1: Firebase CLIのインストールとログイン</strong><br/>
                  ターミナル（コマンドプロンプト）を開き、以下のコマンドを実行します。
                  <CodeBlock>npm install -g firebase-tools{"\n"}firebase login</CodeBlock>
                  <p className="text-sm text-gray-600">既にインストール・ログイン済みの場合はこの手順をスキップできます。</p>
                </li>
                <li>
                  <strong className="text-red-600">4.2: 【重要】プロジェクトの紐付け</strong><br/>
                  <p className="mb-2">このプロジェクトには、正しいデプロイ設定が書かれた <code>firebase.json</code> が既に含まれています。
                  そのため、<strong className="font-bold"><code>firebase init</code> コマンドは絶対に実行しないでください。</strong>実行すると設定が上書きされ、エラーの原因になります。</p>
                  以下のコマンドを実行して、このプロジェクトとあなたのFirebaseプロジェクトを紐付けます。
                  <CodeBlock>firebase use --add</CodeBlock>
                  <ul className="list-disc list-inside ml-6 mt-1 text-sm space-y-1">
                      <li>表示されたプロジェクト一覧から、キーボードの矢印キーでステップ1で作成したプロジェクトを選択し、Enterキーを押します。</li>
                      <li>次に「What alias do you want to use for this project?」と尋ねられます。これは設定に付ける名前（エイリアス）です。 <br/><strong className="text-blue-600"><code>default</code> と入力してEnterキーを押してください。</strong></li>
                  </ul>
                </li>
                <li>
                  <strong>4.3: 設定ファイルの最終確認</strong><br/>
                  <p>デプロイする前に、以下の2つのファイルがプロジェクトのルートに正しく存在することを確認してください。</p>
                  <ul className="list-disc list-inside ml-6 mt-2 text-sm space-y-2">
                    <li>
                      <strong><code>.firebaserc</code></strong>: ステップ4.2で自動生成されたファイルです。中身は <code>{`{ "projects": { "default": "あなたのプロジェクトID" } }`}</code> のようになっています。
                    </li>
                    <li>
                      <strong><code>firebase.json</code></strong>: プロジェクトに最初から含まれているファイルです。内容が<strong>以下のものと完全に一致しているか</strong>、必ず確認してください。
                      <CodeBlock>{`{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}`}</CodeBlock>
                    </li>
                  </ul>
                </li>
                <li>
                    <strong>4.4: デプロイの実行</strong><br/>
                    準備が整いました。以下のコマンドでデプロイを実行します。
                    <CodeBlock>firebase deploy</CodeBlock>
                    <p className="text-sm text-gray-600">
                      デプロイ時に「found XXXX files in .」と表示されるファイル数が、数百程度であれば正常です。もし数万〜数十万になっている場合は、<code>firebase.json</code>の設定が間違っているため、ステップ4.3を再確認してください。<br/>
                      "Deploy complete!" と表示されれば成功です！Hosting URLにアクセスしてアプリを確認できます。
                    </p>
                </li>
              </ol>
            </div>
        </div>
      </section>

      <section className="mb-6">
        <h2 className="text-2xl font-semibold mb-2 text-red-600">5. トラブルシューティング</h2>
        <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg border">
                <h3 className="text-xl font-semibold text-gray-800">エラー: "firebase deploy" 時に "An unexpected error has occurred" が発生する</h3>
                <p className="text-gray-700 mt-2">
                    これは、デプロイ設定が間違っており、不要なファイル（特に<code>node_modules</code>フォルダ）までアップロードしようとしていることが原因です。
                </p>
                <p className="text-gray-700 mt-2 font-bold">解決策:</p>
                <p className="text-gray-700 mt-1">
                  このエラーは、おそらく誤って <code>firebase init</code> を実行し、<code>firebase.json</code> の内容を上書きしてしまったために発生しています。
                  上記「<strong>ステップ4.3: 設定ファイルの最終確認</strong>」の指示に従って、<code>firebase.json</code> の内容を正しいものに修正してから、再度デプロイしてください。
                </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg border">
              <h3 className="text-xl font-semibold text-gray-800">エラー: "Firestoreからのデータ読み込みに失敗しました: Missing or insufficient permissions."</h3>
              <p className="text-gray-700 mt-2">
                これは、Firestoreのセキュリティルールが正しく設定されていないことが原因です。上記「<strong>ステップ3: Firestoreセキュリティルールの設定</strong>」に戻り、手順を正確に実行したか再度確認してください。特に、ルールを貼り付けた後に「<strong>公開</strong>」ボタンを押し忘れていないか注意してください。
              </p>
            </div>
        </div>
      </section>

    </div>
  );
};

export default ReadmePage;