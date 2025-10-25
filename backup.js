// データベース自動バックアップスクリプト
const fs = require('fs');
const path = require('path');

const DB_FILE = './requests.db';
const BACKUP_DIR = './backups';
const MAX_BACKUPS = 10; // 保持する最大バックアップ数

function createBackup() {
  try {
    // データベースファイルが存在するか確認
    if (!fs.existsSync(DB_FILE)) {
      console.log('データベースファイルが見つかりません');
      return null;
    }

    // バックアップディレクトリが存在しない場合は作成
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // 日本時間でタイムスタンプを生成
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const timestamp = now.toISOString()
      .replace('T', '_')
      .replace(/:/g, '-')
      .replace(/\..+/, '')
      .substring(0, 19);
    
    const backupFile = path.join(BACKUP_DIR, `requests_${timestamp}.db`);

    // データベースファイルをコピー
    fs.copyFileSync(DB_FILE, backupFile);
    
    const fileSize = fs.statSync(backupFile).size;
    console.log(`バックアップ作成成功: ${backupFile} (${fileSize} bytes)`);

    // 古いバックアップを削除
    cleanOldBackups();

    return backupFile;

  } catch (error) {
    console.error('バックアップエラー:', error);
    return null;
  }
}

function cleanOldBackups() {
  try {
    // バックアップファイル一覧を取得
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('requests_') && file.endsWith('.db'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        time: fs.statSync(path.join(BACKUP_DIR, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // 新しい順にソート

    // 最大数を超えたバックアップを削除
    if (files.length > MAX_BACKUPS) {
      const filesToDelete = files.slice(MAX_BACKUPS);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
        console.log(`古いバックアップを削除: ${file.name}`);
      });
    }

    console.log(`現在のバックアップ数: ${Math.min(files.length, MAX_BACKUPS)}/${MAX_BACKUPS}`);

  } catch (error) {
    console.error('古いバックアップの削除エラー:', error);
  }
}

// バックアップ一覧を表示
function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('バックアップディレクトリが存在しません');
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.startsWith('requests_') && file.endsWith('.db'))
      .map(file => {
        const filePath = path.join(BACKUP_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          time: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.time) - new Date(a.time));

    return files;

  } catch (error) {
    console.error('バックアップ一覧取得エラー:', error);
    return [];
  }
}

// バックアップから復元
function restoreBackup(backupFileName) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFileName);

    if (!fs.existsSync(backupPath)) {
      console.error('指定されたバックアップファイルが見つかりません:', backupFileName);
      return false;
    }

    // 現在のデータベースをバックアップ
    if (fs.existsSync(DB_FILE)) {
      const timestamp = new Date(Date.now() + 9 * 60 * 60 * 1000)
        .toISOString()
        .replace('T', '_')
        .replace(/:/g, '-')
        .replace(/\..+/, '')
        .substring(0, 19);
      const beforeRestoreBackup = path.join(BACKUP_DIR, `before_restore_${timestamp}.db`);
      fs.copyFileSync(DB_FILE, beforeRestoreBackup);
      console.log(`復元前のバックアップを作成: ${beforeRestoreBackup}`);
    }

    // バックアップから復元
    fs.copyFileSync(backupPath, DB_FILE);
    console.log(`復元成功: ${backupFileName} -> ${DB_FILE}`);
    return true;

  } catch (error) {
    console.error('復元エラー:', error);
    return false;
  }
}

// コマンドライン引数を処理
const args = process.argv.slice(2);
const command = args[0];

if (command === 'list') {
  listBackups();
} else if (command === 'restore' && args[1]) {
  restoreBackup(args[1]);
} else if (command === 'backup' || !command) {
  createBackup();
} else {
  console.log('使用方法:');
  console.log('  node backup.js          - バックアップを作成');
  console.log('  node backup.js backup   - バックアップを作成');
  console.log('  node backup.js list     - バックアップ一覧を表示');
  console.log('  node backup.js restore <ファイル名> - バックアップから復元');
}

module.exports = { createBackup, listBackups, restoreBackup };
