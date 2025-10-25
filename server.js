// ラジオ番組用曲リクエスト受付システム - サーバー
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { createBackup, listBackups, restoreBackup } = require('./backup');
const webpush = require('web-push');

// 日本時間（JST）に設定
process.env.TZ = 'Asia/Tokyo';

// VAPID設定（プッシュ通知用）
const VAPID_PUBLIC_KEY = 'BMnp9gePi62evIPkH1_6lhtQrUFhbcjLDiMgT8j78YffvJPaXQNrpwB4BIPHizbUK9VkuC-uWfgCq7BIINIhyxk';
const VAPID_PRIVATE_KEY = 'DC5Zd7z2GlgGPLyDnQkxh8fusks6VGRoKl3EW4Wc2-I';

webpush.setVapidDetails(
  'mailto:radio@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const app = express();
const PORT = process.env.PORT || 3000;

// データベース初期化
const db = new sqlite3.Database('./requests.db', (err) => {
  if (err) {
    console.error('データベース接続エラー:', err);
  } else {
    console.log('データベース接続成功');
    initDatabase();
  }
});

// データベーステーブル作成
function initDatabase() {
  db.serialize(() => {
    // requestsテーブル作成
    db.run(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        song_name TEXT NOT NULL,
        artist_name TEXT NOT NULL,
        nickname TEXT NOT NULL,
        message TEXT,
        created_at TEXT NOT NULL,
        is_read INTEGER DEFAULT 0
      )
    `);
    
    // プレイリストテーブル作成
    db.run(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL
      )
    `);
    
    // 設定テーブル作成
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      )
    `);
    
    // デフォルト設定を追加
    const defaultSettings = [
      { key: 'request_enabled', value: '1' },
      { key: 'next_theme', value: '' },
      { key: 'next_broadcast_time', value: '' }
    ];
    
    defaultSettings.forEach(setting => {
      db.get('SELECT * FROM settings WHERE key = ?', [setting.key], (err, row) => {
        if (!row) {
          db.run('INSERT INTO settings (key, value) VALUES (?, ?)', [setting.key, setting.value]);
        }
      });
    });
    
    // 管理者テーブル作成
    db.run(`
      CREATE TABLE IF NOT EXISTS admin (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        password TEXT NOT NULL
      )
    `);
    
    // お知らせテーブル作成
    db.run(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    
    // プッシュ通知購読テーブル作成
    db.run(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT UNIQUE NOT NULL,
        keys TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    
    // 管理者パスワードのハッシュを作成
    const defaultPassword = 'Wa13kukui';
    const hashedPassword = bcrypt.hashSync(defaultPassword, 10);
    
    db.get('SELECT * FROM admin WHERE id = 1', (err, row) => {
      if (!row) {
        db.run('INSERT INTO admin (password) VALUES (?)', [hashedPassword]);
        console.log('管理者パスワードが設定されました');
      }
    });
  });
}

// 自動バックアップ機能
// サーバー起動時にバックアップを作成
setTimeout(() => {
  console.log('初期バックアップを作成中...');
  createBackup();
}, 3000); // 3秒後に実行（データベース初期化完了を待つ）

// 定期的なバックアップ（6時間ごと）
setInterval(() => {
  console.log('定期バックアップを作成中...');
  createBackup();
}, 6 * 60 * 60 * 1000); // 6時間ごと

// ミドルウェア設定
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'radio-request-secret-key-' + Date.now(),
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24時間
}));

// レート制限（スパム防止）
const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 5, // 15分間に5回まで
  message: 'リクエストが多すぎます。しばらく待ってから再度お試しください。'
});

// 管理者認証チェック
function isAuthenticated(req, res, next) {
  if (req.session.isAdmin) {
    next();
  } else {
    res.status(401).json({ error: '認証が必要です' });
  }
}

// === API エンドポイント ===

// リクエスト送信（簡易CAPTCHA付き）
app.post('/api/requests', requestLimiter, (req, res) => {
  // 受付状態チェック
  db.get('SELECT value FROM settings WHERE key = ?', ['request_enabled'], (err, row) => {
    if (err || !row || row.value !== '1') {
      return res.status(503).json({ error: '現在、リクエストの受付を停止しています' });
    }
    
    const { song_name, artist_name, nickname, message, captcha } = req.body;
    
    // 簡易CAPTCHA検証
    if (!captcha || captcha !== req.session.captchaAnswer) {
      return res.status(400).json({ error: 'CAPTCHAが正しくありません' });
    }
    
    // バリデーション
    if (!song_name || !artist_name || !nickname) {
      return res.status(400).json({ error: '必須項目を入力してください' });
    }
  
  if (song_name.length > 100 || artist_name.length > 100 || nickname.length > 50) {
    return res.status(400).json({ error: '入力文字数が制限を超えています' });
  }
  
    if (message && message.length > 300) {
      return res.status(400).json({ error: 'メッセージは300文字以内で入力してください' });
    }
    
    // データベースに保存（日本時間を明示的に指定）
    const sql = 'INSERT INTO requests (song_name, artist_name, nickname, message, created_at) VALUES (?, ?, ?, ?, datetime("now", "+9 hours"))';
    db.run(sql, [song_name, artist_name, nickname, message || ''], function(err) {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ error: 'リクエストの保存に失敗しました' });
      }
      
      // CAPTCHA答えをクリア
      delete req.session.captchaAnswer;
      
      res.json({ 
        success: true, 
        message: 'リクエストを受け付けました！',
        id: this.lastID 
      });
    });
  });
});

// 今日のリクエスト一覧取得（誰でも閲覧可能）
app.get('/api/requests/today', (req, res) => {
  const sql = `
    SELECT id, song_name, artist_name, nickname, 
           strftime('%H:%M', created_at) as time, is_read
    FROM requests 
    WHERE date(created_at) = date(datetime('now', '+9 hours'))
    ORDER BY created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    res.json(rows);
  });
});

// 全リクエスト取得（管理者のみ）
app.get('/api/admin/requests', isAuthenticated, (req, res) => {
  const { date } = req.query;
  
  let sql = `
    SELECT id, song_name, artist_name, nickname, message, 
           created_at, is_read
    FROM requests
  `;
  
  let params = [];
  if (date) {
    sql += ` WHERE date(created_at) = ?`;
    params.push(date);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    res.json(rows);
  });
});

// 選曲状態の切り替え（管理者のみ）
app.patch('/api/admin/requests/:id/read', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { is_read } = req.body;
  
  db.run('UPDATE requests SET is_read = ? WHERE id = ?', [is_read ? 1 : 0, id], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '更新に失敗しました' });
    }
    res.json({ success: true });
  });
});

// リクエスト削除（管理者のみ）
app.delete('/api/admin/requests/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM requests WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '削除に失敗しました' });
    }
    res.json({ success: true });
  });
});

// CSVエクスポート（管理者のみ）
app.get('/api/admin/export', isAuthenticated, (req, res) => {
  const { date } = req.query;
  
  let sql = `
    SELECT song_name, artist_name, nickname, message, 
           created_at
    FROM requests
  `;
  
  let params = [];
  if (date) {
    sql += ` WHERE date(created_at) = ?`;
    params.push(date);
  }
  
  sql += ' ORDER BY created_at ASC';
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    
    // CSV形式に変換
    let csv = '\uFEFF'; // BOM for Excel
    csv += '曲名,アーティスト名,ラジオネーム,メッセージ,受付日時\n';
    
    rows.forEach(row => {
      csv += `"${row.song_name}","${row.artist_name}","${row.nickname}","${row.message || ''}","${row.created_at}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="requests_${date || 'all'}.csv"`);
    res.send(csv);
  });
});

// CAPTCHA生成
app.get('/api/captcha', (req, res) => {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  
  req.session.captchaAnswer = (num1 + num2).toString();
  
  res.json({ question: `${num1} + ${num2} = ?` });
});

// 管理者ログイン
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  
  db.get('SELECT password FROM admin WHERE id = 1', [], (err, row) => {
    if (err || !row) {
      return res.status(500).json({ error: 'ログインに失敗しました' });
    }
    
    if (bcrypt.compareSync(password, row.password)) {
      req.session.isAdmin = true;
      res.json({ success: true });
    } else {
      res.status(401).json({ error: 'パスワードが正しくありません' });
    }
  });
});

// 管理者ログアウト
app.post('/api/admin/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// 管理者認証状態確認
app.get('/api/admin/check', (req, res) => {
  res.json({ isAuthenticated: !!req.session.isAdmin });
});

// 統計情報取得（管理者のみ）
app.get('/api/admin/stats', isAuthenticated, (req, res) => {
  const queries = {
    total: 'SELECT COUNT(*) as count FROM requests',
    today: "SELECT COUNT(*) as count FROM requests WHERE date(datetime(created_at, '+9 hours')) = date(datetime('now', '+9 hours'))",
    unread: 'SELECT COUNT(*) as count FROM requests WHERE is_read = 0'
  };
  
  const stats = {};
  let completed = 0;
  
  Object.keys(queries).forEach(key => {
    db.get(queries[key], [], (err, row) => {
      if (!err) {
        stats[key] = row.count;
      }
      completed++;
      
      if (completed === Object.keys(queries).length) {
        res.json(stats);
      }
    });
  });
});

// === プレイリスト API ===

// プレイリスト一覧取得（誰でも閲覧可能）
app.get('/api/playlists', (req, res) => {
  const sql = `
    SELECT id, title, url, description,
           created_at
    FROM playlists
    ORDER BY created_at DESC
  `;
  
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    res.json(rows);
  });
});

// プレイリスト追加（管理者のみ）
app.post('/api/admin/playlists', isAuthenticated, (req, res) => {
  const { title, url, description } = req.body;
  
  // バリデーション
  if (!title || !url) {
    return res.status(400).json({ error: 'タイトルとURLは必須です' });
  }
  
  if (title.length > 200 || url.length > 500) {
    return res.status(400).json({ error: '入力文字数が制限を超えています' });
  }
  
  if (description && description.length > 500) {
    return res.status(400).json({ error: '説明は500文字以内で入力してください' });
  }
  
  // URLの簡易バリデーション
  try {
    new URL(url);
  } catch (e) {
    return res.status(400).json({ error: '有効なURLを入力してください' });
  }
  
  const sql = 'INSERT INTO playlists (title, url, description, created_at) VALUES (?, ?, ?, datetime("now", "+9 hours"))';
  db.run(sql, [title, url, description || ''], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'プレイリストの保存に失敗しました' });
    }
    
    res.json({ 
      success: true, 
      message: 'プレイリストを追加しました',
      id: this.lastID 
    });
  });
});

// プレイリスト削除（管理者のみ）
app.delete('/api/admin/playlists/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM playlists WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '削除に失敗しました' });
    }
    res.json({ success: true });
  });
});

// === 設定 API ===

// 受付状態取得（誰でも閲覧可能）
app.get('/api/settings/request-status', (req, res) => {
  db.get('SELECT value FROM settings WHERE key = ?', ['request_enabled'], (err, row) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    res.json({ enabled: row && row.value === '1' });
  });
});

// 受付状態更新（管理者のみ）
app.post('/api/admin/settings/request-status', isAuthenticated, (req, res) => {
  const { enabled } = req.body;
  const value = enabled ? '1' : '0';
  
  db.run('UPDATE settings SET value = ? WHERE key = ?', [value, 'request_enabled'], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '更新に失敗しました' });
    }
    res.json({ 
      success: true,
      message: enabled ? 'リクエスト受付を再開しました' : 'リクエスト受付を停止しました'
    });
  });
});

// 次回配信情報取得（誰でも閲覧可能）
app.get('/api/settings/next-broadcast', (req, res) => {
  db.all('SELECT key, value FROM settings WHERE key IN (?, ?)', ['next_theme', 'next_broadcast_time'], (err, rows) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    
    const settings = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    res.json({
      theme: settings.next_theme || '',
      time: settings.next_broadcast_time || ''
    });
  });
});

// 次回配信情報更新（管理者のみ）
app.post('/api/admin/settings/next-broadcast', isAuthenticated, (req, res) => {
  const { theme, time } = req.body;
  
  // 両方の設定を更新
  db.serialize(() => {
    db.run('UPDATE settings SET value = ? WHERE key = ?', [theme || '', 'next_theme']);
    db.run('UPDATE settings SET value = ? WHERE key = ?', [time || '', 'next_broadcast_time'], function(err) {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ error: '更新に失敗しました' });
      }
      res.json({ 
        success: true,
        message: '次回配信情報を更新しました'
      });
    });
  });
});

// === バックアップ管理 API ===

// バックアップ一覧取得（管理者のみ）
app.get('/api/admin/backups', isAuthenticated, (req, res) => {
  try {
    const backups = listBackups();
    res.json(backups);
  } catch (error) {
    console.error('バックアップ一覧取得エラー:', error);
    res.status(500).json({ error: 'バックアップ一覧の取得に失敗しました' });
  }
});

// 手動バックアップ作成（管理者のみ）
app.post('/api/admin/backups/create', isAuthenticated, (req, res) => {
  try {
    const backupPath = createBackup();
    if (backupPath) {
      res.json({ 
        success: true, 
        message: 'バックアップを作成しました',
        path: backupPath 
      });
    } else {
      res.status(500).json({ error: 'バックアップの作成に失敗しました' });
    }
  } catch (error) {
    console.error('バックアップ作成エラー:', error);
    res.status(500).json({ error: 'バックアップの作成に失敗しました' });
  }
});

// バックアップから復元（管理者のみ）
app.post('/api/admin/backups/restore', isAuthenticated, (req, res) => {
  const { fileName } = req.body;
  
  if (!fileName) {
    return res.status(400).json({ error: 'ファイル名が指定されていません' });
  }
  
  try {
    const success = restoreBackup(fileName);
    if (success) {
      res.json({ 
        success: true, 
        message: 'バックアップから復元しました。サーバーを再起動してください。' 
      });
    } else {
      res.status(500).json({ error: 'バックアップの復元に失敗しました' });
    }
  } catch (error) {
    console.error('バックアップ復元エラー:', error);
    res.status(500).json({ error: 'バックアップの復元に失敗しました' });
  }
});

// === プッシュ通知 API ===

// VAPID公開鍵を取得
app.get('/api/push/vapid-public-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// プッシュ通知購読登録
app.post('/api/push/subscribe', (req, res) => {
  const subscription = req.body;
  
  try {
    const subscriptionData = {
      endpoint: subscription.endpoint,
      keys: JSON.stringify(subscription.keys)
    };
    
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
    
    db.run(
      'INSERT OR REPLACE INTO push_subscriptions (endpoint, keys, created_at) VALUES (?, ?, ?)',
      [subscriptionData.endpoint, subscriptionData.keys, now],
      (err) => {
        if (err) {
          console.error('購読登録エラー:', err);
          return res.status(500).json({ error: '購読登録に失敗しました' });
        }
        console.log('プッシュ通知購読が登録されました');
        res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('購読登録エラー:', error);
    res.status(500).json({ error: '購読登録に失敗しました' });
  }
});

// プッシュ通知購読解除
app.post('/api/push/unsubscribe', (req, res) => {
  const { endpoint } = req.body;
  
  db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint], (err) => {
    if (err) {
      console.error('購読解除エラー:', err);
      return res.status(500).json({ error: '購読解除に失敗しました' });
    }
    res.json({ success: true });
  });
});

// === お知らせ API ===

// お知らせ一覧取得（誰でも閲覧可能）
app.get('/api/announcements', (req, res) => {
  db.all(
    'SELECT id, title, message, created_at FROM announcements ORDER BY created_at DESC LIMIT 10',
    [],
    (err, rows) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ error: 'データ取得に失敗しました' });
      }
      res.json(rows);
    }
  );
});

// お知らせ投稿（管理者のみ）
app.post('/api/admin/announcements', isAuthenticated, async (req, res) => {
  const { title, message } = req.body;
  
  if (!title || !message) {
    return res.status(400).json({ error: 'タイトルとメッセージは必須です' });
  }
  
  if (title.length > 100 || message.length > 500) {
    return res.status(400).json({ error: '文字数制限を超えています' });
  }
  
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);
  
  db.run(
    'INSERT INTO announcements (title, message, created_at) VALUES (?, ?, ?)',
    [title, message, now],
    async function(err) {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ error: 'お知らせの保存に失敗しました' });
      }
      
      // プッシュ通知を送信
      await sendPushNotifications(title, message);
      
      res.json({
        success: true,
        message: 'お知らせを投稿し、プッシュ通知を送信しました',
        id: this.lastID
      });
    }
  );
});

// お知らせ削除（管理者のみ）
app.delete('/api/admin/announcements/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM announcements WHERE id = ?', [id], (err) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '削除に失敗しました' });
    }
    res.json({ success: true });
  });
});

// プッシュ通知を全購読者に送信する関数
async function sendPushNotifications(title, body) {
  db.all('SELECT endpoint, keys FROM push_subscriptions', [], async (err, subscriptions) => {
    if (err) {
      console.error('購読者取得エラー:', err);
      return;
    }
    
    const payload = JSON.stringify({
      title: title,
      body: body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'announcement',
      requireInteraction: true
    });
    
    let successCount = 0;
    let failCount = 0;
    
    for (const sub of subscriptions) {
      try {
        const subscription = {
          endpoint: sub.endpoint,
          keys: JSON.parse(sub.keys)
        };
        
        await webpush.sendNotification(subscription, payload);
        successCount++;
      } catch (error) {
        failCount++;
        console.error('プッシュ通知送信エラー:', error.message);
        
        // エンドポイントが無効な場合は削除
        if (error.statusCode === 410) {
          db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
        }
      }
    }
    
    console.log(`プッシュ通知送信完了: 成功 ${successCount}件, 失敗 ${failCount}件`);
  });
}

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
