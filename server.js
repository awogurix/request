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
      { key: 'request_enabled', value: '1' }, // 0: 停止中, 1: 受付中, 2: 次回配信分、受付中
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
    
    // テーマ募集テーブル作成
    db.run(`
      CREATE TABLE IF NOT EXISTS theme_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        theme_title TEXT NOT NULL,
        theme_description TEXT NOT NULL,
        example_songs TEXT,
        nickname TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending'
      )
    `);
    
    // フィードバックテーブル作成
    db.run(`
      CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feedback_type TEXT NOT NULL,
        content TEXT NOT NULL,
        nickname TEXT,
        created_at TEXT NOT NULL,
        is_read INTEGER DEFAULT 0
      )
    `);
    
    // プレイリストテーブルに playlist_date カラムを追加（マイグレーション）
    db.all("PRAGMA table_info(playlists)", (err, columns) => {
      if (err) {
        console.error('テーブル情報取得エラー:', err);
        return;
      }
      
      const hasPlaylistDate = columns.some(col => col.name === 'playlist_date');
      if (!hasPlaylistDate) {
        db.run('ALTER TABLE playlists ADD COLUMN playlist_date TEXT', (err) => {
          if (err) {
            console.error('playlist_dateカラム追加エラー:', err);
          } else {
            console.log('playlist_dateカラムを追加しました');
          }
        });
      }
    });
    
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

// 強制的にキャッシュを無効化
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

app.use(express.static('public', {
  maxAge: 0,
  etag: false,
  lastModified: false
}));
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
    if (err || !row || row.value === '0') {
      return res.status(503).json({ error: '現在、リクエストの受付を停止しています' });
    }
    
    const { song_name, artist_name, nickname, message } = req.body;
    
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
      
      res.json({ 
        success: true, 
        message: 'リクエストを受け付けました！',
        id: this.lastID 
      });
    });
  });
});

// テーマ提案送信
// テーマ募集は曲リクエストの受付状態に関係なく常時受付
app.post('/api/theme-suggestions', requestLimiter, (req, res) => {
  const { theme_title, nickname } = req.body;
  
  // バリデーション
  if (!theme_title || !nickname) {
    return res.status(400).json({ error: '必須項目を入力してください' });
  }

  if (theme_title.length > 100 || nickname.length > 50) {
    return res.status(400).json({ error: '入力文字数が制限を超えています' });
  }
  
  // データベースに保存（日本時間を明示的に指定）
  // theme_descriptionとexample_songsは空文字列で保存（後方互換性のため）
  const sql = 'INSERT INTO theme_suggestions (theme_title, theme_description, example_songs, nickname, created_at) VALUES (?, ?, ?, ?, datetime("now", "+9 hours"))';
  db.run(sql, [theme_title, '', '', nickname], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'テーマの保存に失敗しました' });
    }
    
    res.json({ 
      success: true, 
      message: 'テーマの提案を受け付けました！',
      id: this.lastID 
    });
  });
});

// フィードバック送信
app.post('/api/feedback', requestLimiter, (req, res) => {
  const { feedback_type, content, nickname } = req.body;
  
  // バリデーション
  if (!feedback_type || !content) {
    return res.status(400).json({ error: '必須項目を入力してください' });
  }

  if (content.length > 1000) {
    return res.status(400).json({ error: '内容は1000文字以内で入力してください' });
  }
  
  if (nickname && nickname.length > 50) {
    return res.status(400).json({ error: 'ラジオネームは50文字以内で入力してください' });
  }
  
  // データベースに保存（日本時間を明示的に指定）
  const sql = 'INSERT INTO feedback (feedback_type, content, nickname, created_at) VALUES (?, ?, ?, datetime("now", "+9 hours"))';
  db.run(sql, [feedback_type, content, nickname || '匿名'], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'フィードバックの保存に失敗しました' });
    }
    
    res.json({ 
      success: true, 
      message: 'フィードバックを受け付けました！',
      id: this.lastID 
    });
  });
});

// 最新リクエスト一覧取得（誰でも閲覧可能、ページネーション対応）
app.get('/api/requests/today', (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // カウントクエリ
  const countSql = `SELECT COUNT(*) as total FROM requests`;
  
  // データ取得クエリ
  const sql = `
    SELECT id, song_name, artist_name, nickname, 
           strftime('%Y-%m-%d %H:%M', created_at) as time, is_read
    FROM requests 
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  // 総数を取得
  db.get(countSql, [], (err, countRow) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    
    const total = countRow.total;
    const totalPages = Math.ceil(total / parseInt(limit));
    
    // データを取得
    db.all(sql, [parseInt(limit), offset], (err, rows) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ error: 'データ取得に失敗しました' });
      }
      
      res.json({
        requests: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: totalPages
        }
      });
    });
  });
});

// 全リクエスト取得（管理者のみ、ページネーション対応）
app.get('/api/admin/requests', isAuthenticated, (req, res) => {
  const { date, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // カウントクエリ
  let countSql = `SELECT COUNT(*) as total FROM requests`;
  let countParams = [];
  
  if (date) {
    countSql += ` WHERE date(created_at) = ?`;
    countParams.push(date);
  }
  
  // データ取得クエリ
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
  
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), offset);
  
  // 総数を取得
  db.get(countSql, countParams, (err, countRow) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    
    const total = countRow.total;
    const totalPages = Math.ceil(total / parseInt(limit));
    
    // データを取得
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ error: 'データ取得に失敗しました' });
      }
      
      res.json({
        requests: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: totalPages
        }
      });
    });
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

// テーマ提案一覧取得（管理者のみ、ページネーション対応）
app.get('/api/admin/theme-suggestions', isAuthenticated, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  // カウントクエリ
  const countSql = `SELECT COUNT(*) as total FROM theme_suggestions`;
  
  // データ取得クエリ
  const sql = `
    SELECT id, theme_title, theme_description, example_songs, nickname, 
           created_at, is_read, status
    FROM theme_suggestions
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  // 総数を取得
  db.get(countSql, [], (err, countRow) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'データ取得に失敗しました' });
    }
    
    const total = countRow.total;
    const totalPages = Math.ceil(total / parseInt(limit));
    
    // データを取得
    db.all(sql, [parseInt(limit), offset], (err, rows) => {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ error: 'データ取得に失敗しました' });
      }
      
      res.json({
        suggestions: rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: totalPages
        }
      });
    });
  });
});

// テーマ提案の既読状態切り替え（管理者のみ）
app.patch('/api/admin/theme-suggestions/:id/read', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { is_read } = req.body;
  
  db.run('UPDATE theme_suggestions SET is_read = ? WHERE id = ?', [is_read ? 1 : 0, id], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '更新に失敗しました' });
    }
    res.json({ success: true });
  });
});

// テーマ提案の状態更新（管理者のみ）
app.patch('/api/admin/theme-suggestions/:id/status', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  db.run('UPDATE theme_suggestions SET status = ? WHERE id = ?', [status, id], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '更新に失敗しました' });
    }
    res.json({ success: true });
  });
});

// テーマ提案削除（管理者のみ）
app.delete('/api/admin/theme-suggestions/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM theme_suggestions WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '削除に失敗しました' });
    }
    res.json({ success: true });
  });
});

// フィードバック一覧取得（管理者のみ）
app.get('/api/admin/feedback', isAuthenticated, (req, res) => {
  const sql = `
    SELECT id, feedback_type, content, nickname, created_at, is_read
    FROM feedback
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

// フィードバックの既読状態切り替え（管理者のみ）
app.patch('/api/admin/feedback/:id/read', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { is_read } = req.body;
  
  db.run('UPDATE feedback SET is_read = ? WHERE id = ?', [is_read ? 1 : 0, id], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '更新に失敗しました' });
    }
    res.json({ success: true });
  });
});

// フィードバック削除（管理者のみ）
app.delete('/api/admin/feedback/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  
  db.run('DELETE FROM feedback WHERE id = ?', [id], function(err) {
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
           playlist_date, created_at
    FROM playlists
    ORDER BY playlist_date DESC, created_at DESC
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
// プレイリストのタイトルをURLから抽出する関数
async function extractPlaylistTitle(url) {
  console.log('タイトル抽出開始:', url);
  try {
    const urlObj = new URL(url);
    
    // Spotify
    if (urlObj.hostname.includes('spotify.com')) {
      console.log('Spotifyプレイリストを検出');
      const playlistId = urlObj.pathname.split('/').pop().split('?')[0];
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
        console.log('Spotify oEmbed APIを呼び出し:', oembedUrl);
        const response = await fetch(oembedUrl);
        console.log('Spotify API レスポンス status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Spotify API データ:', data);
          if (data.title) {
            console.log('タイトル抽出成功:', data.title);
            return data.title;
          }
        }
      } catch (e) {
        console.log('Spotify title extraction failed:', e.message);
      }
    }
    
    // Apple Music
    if (urlObj.hostname.includes('music.apple.com')) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (response.ok) {
          const html = await response.text();
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          if (titleMatch && titleMatch[1]) {
            return titleMatch[1].replace(' - Apple Music', '').trim();
          }
        }
      } catch (e) {
        console.log('Apple Music title extraction failed:', e.message);
      }
    }
    
    // YouTube
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        if (response.ok) {
          const html = await response.text();
          const titleMatch = html.match(/<title>([^<]+)<\/title>/);
          if (titleMatch && titleMatch[1]) {
            return titleMatch[1].replace(' - YouTube', '').trim();
          }
        }
      } catch (e) {
        console.log('YouTube title extraction failed:', e.message);
      }
    }
  } catch (e) {
    console.log('Title extraction error:', e.message);
  }
  
  // フォールバック: 日付ベースのタイトル
  console.log('フォールバック: 日付ベースのタイトルを使用');
  const now = new Date();
  now.setHours(now.getHours() + 9); // JST
  const fallbackTitle = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日のプレイリスト`;
  console.log('生成されたタイトル:', fallbackTitle);
  return fallbackTitle;
}

app.post('/api/admin/playlists', isAuthenticated, async (req, res) => {
  console.log('プレイリスト追加リクエスト受信:', req.body);
  const { title: providedTitle, playlist_date, url, description } = req.body;
  
  // バリデーション
  if (!providedTitle || !playlist_date || !url) {
    console.log('エラー: 必須項目が空です');
    return res.status(400).json({ error: 'タイトル、日付、URLは必須です' });
  }
  
  if (providedTitle.length > 200) {
    return res.status(400).json({ error: 'タイトルは200文字以内で入力してください' });
  }
  
  if (url.length > 500) {
    return res.status(400).json({ error: 'URLは500文字以内で入力してください' });
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
  
  // 日付の簡易バリデーション
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playlist_date)) {
    return res.status(400).json({ error: '有効な日付を選択してください' });
  }
  
  // 提供されたタイトルを使用
  const title = providedTitle.trim();
  
  const sql = 'INSERT INTO playlists (title, playlist_date, url, description, created_at) VALUES (?, ?, ?, ?, datetime("now", "+9 hours"))';
  db.run(sql, [title, playlist_date, url, description || ''], async function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'プレイリストの保存に失敗しました' });
    }
    
    // プッシュ通知を送信
    const notificationTitle = '🎶 新しいプレイリスト';
    const notificationBody = `「${title}」が公開されました！`;
    await sendPushNotifications(notificationTitle, notificationBody);
    
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

// プレイリスト編集（管理者のみ）
app.put('/api/admin/playlists/:id', isAuthenticated, (req, res) => {
  const { id } = req.params;
  const { title, playlist_date, url, description } = req.body;
  
  console.log('プレイリスト編集リクエスト受信:', { id, ...req.body });
  
  // バリデーション
  if (!title || !playlist_date || !url) {
    console.log('エラー: 必須項目が空です');
    return res.status(400).json({ error: 'タイトル、日付、URLは必須です' });
  }
  
  if (title.length > 200) {
    return res.status(400).json({ error: 'タイトルは200文字以内で入力してください' });
  }
  
  if (url.length > 500) {
    return res.status(400).json({ error: 'URLは500文字以内で入力してください' });
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
  
  // 日付の簡易バリデーション
  if (!/^\d{4}-\d{2}-\d{2}$/.test(playlist_date)) {
    return res.status(400).json({ error: '有効な日付を選択してください' });
  }
  
  const sql = 'UPDATE playlists SET title = ?, playlist_date = ?, url = ?, description = ? WHERE id = ?';
  db.run(sql, [title.trim(), playlist_date, url, description || '', id], function(err) {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: 'プレイリストの更新に失敗しました' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'プレイリストが見つかりません' });
    }
    
    res.json({ 
      success: true, 
      message: 'プレイリストを更新しました'
    });
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
    // 0: 停止中, 1: 受付中, 2: 次回配信分、受付中
    res.json({ status: row ? row.value : '0' });
  });
});

// 受付状態更新（管理者のみ）
app.post('/api/admin/settings/request-status', isAuthenticated, async (req, res) => {
  const { status } = req.body;
  // 0: 停止中, 1: 受付中, 2: 次回配信分、受付中
  const value = String(status);
  
  if (!['0', '1', '2'].includes(value)) {
    return res.status(400).json({ error: '無効な状態値です' });
  }
  
  // 現在の状態を取得
  db.get('SELECT value FROM settings WHERE key = ?', ['request_enabled'], async (err, currentRow) => {
    if (err) {
      console.error('データベースエラー:', err);
      return res.status(500).json({ error: '更新に失敗しました' });
    }
    
    const previousStatus = currentRow ? currentRow.value : '0';
    
    db.run('UPDATE settings SET value = ? WHERE key = ?', [value, 'request_enabled'], async function(err) {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ error: '更新に失敗しました' });
      }
      
      const messages = {
        '0': 'リクエスト受付を停止しました',
        '1': 'リクエスト受付を再開しました',
        '2': '次回配信分のリクエスト受付を開始しました'
      };
      
      // 停止中から受付中/次回配信分に変更された場合、プッシュ通知を送信
      if (previousStatus === '0' && (value === '1' || value === '2')) {
        // 次回配信情報（テーマ）を取得
        db.get('SELECT value FROM settings WHERE key = ?', ['next_theme'], async (err, themeRow) => {
          const theme = themeRow && themeRow.value ? themeRow.value : '';
          
          let notificationTitle = '🎵 リクエスト受付再開';
          let notificationBody = 'リクエストの受付を再開しました！';
          
          if (value === '2') {
            notificationTitle = '🎵 次回配信分リクエスト受付開始';
            notificationBody = '次回配信分のリクエスト受付を開始しました！';
          }
          
          // テーマがある場合は追加
          if (theme) {
            notificationBody += `\n📌 テーマ: ${theme}`;
          }
          
          // プッシュ通知送信
          await sendPushNotifications(notificationTitle, notificationBody);
        });
      }
      
      res.json({ 
        success: true,
        message: messages[value]
      });
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
app.post('/api/admin/settings/next-broadcast', isAuthenticated, async (req, res) => {
  const { theme, time } = req.body;
  
  // 両方の設定を更新
  db.serialize(async () => {
    db.run('UPDATE settings SET value = ? WHERE key = ?', [theme || '', 'next_theme']);
    db.run('UPDATE settings SET value = ? WHERE key = ?', [time || '', 'next_broadcast_time'], async function(err) {
      if (err) {
        console.error('データベースエラー:', err);
        return res.status(500).json({ error: '更新に失敗しました' });
      }
      
      // テーマが設定されている場合、プッシュ通知を送信
      if (theme && theme.trim()) {
        const notificationTitle = '📻 次回配信のお知らせ';
        let notificationBody = `テーマ: ${theme}`;
        
        if (time && time.trim()) {
          // 時間帯または日時の判定
          const timePeriods = ['朝', '昼', '夕方', '夜', '深夜'];
          
          // 「日付|時間帯」形式のチェック
          if (time.includes('|')) {
            const [date, period] = time.split('|');
            const broadcastDate = new Date(date);
            if (!isNaN(broadcastDate.getTime())) {
              const formattedDate = `${broadcastDate.getMonth() + 1}月${broadcastDate.getDate()}日`;
              notificationBody += `\n配信時間: ${formattedDate} ${period}`;
            }
          } else if (timePeriods.includes(time)) {
            // 時間帯のみの場合
            notificationBody += `\n配信時間: ${time}`;
          } else {
            // datetime-localの値をフォーマット
            const broadcastDate = new Date(time);
            if (!isNaN(broadcastDate.getTime())) {
              const formattedDate = `${broadcastDate.getMonth() + 1}月${broadcastDate.getDate()}日 ${broadcastDate.getHours()}:${String(broadcastDate.getMinutes()).padStart(2, '0')}`;
              notificationBody += `\n配信時間: ${formattedDate}`;
            }
          }
        }
        
        const pushResult = await sendPushNotifications(notificationTitle, notificationBody);
        
        res.json({ 
          success: true,
          message: '次回配信情報を更新しました',
          pushSent: true,
          pushCount: pushResult.success
        });
      } else {
        res.json({ 
          success: true,
          message: '次回配信情報を更新しました',
          pushSent: false
        });
      }
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
  return new Promise((resolve, reject) => {
    db.all('SELECT endpoint, keys FROM push_subscriptions', [], async (err, subscriptions) => {
      if (err) {
        console.error('購読者取得エラー:', err);
        reject(err);
        return;
      }
      
      console.log(`\n=== プッシュ通知送信開始 ===`);
      console.log(`タイトル: ${title}`);
      console.log(`本文: ${body}`);
      console.log(`購読者数: ${subscriptions.length}人`);
      
      if (subscriptions.length === 0) {
        console.log('⚠️ プッシュ通知購読者がいません');
        resolve({ success: 0, failed: 0, total: 0 });
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
          console.log(`✓ プッシュ通知送信成功 [${successCount}/${subscriptions.length}]`);
        } catch (error) {
          failCount++;
          console.error(`✗ プッシュ通知送信失敗 [${failCount}/${subscriptions.length}]:`, error.message);
          
          // エンドポイントが無効な場合は削除
          if (error.statusCode === 410) {
            console.log('無効なエンドポイントを削除:', sub.endpoint.substring(0, 50) + '...');
            db.run('DELETE FROM push_subscriptions WHERE endpoint = ?', [sub.endpoint]);
          }
        }
      }
      
      console.log(`\n=== プッシュ通知送信完了 ===`);
      console.log(`成功: ${successCount}件, 失敗: ${failCount}件, 合計: ${subscriptions.length}件\n`);
      resolve({ success: successCount, failed: failCount, total: subscriptions.length });
    });
  });
}

// サーバー起動
app.listen(PORT, '0.0.0.0', () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
