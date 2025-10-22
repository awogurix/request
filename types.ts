
// 曲リクエストのデータ構造を定義するインターフェース
export interface SongRequest {
  id: string; // 一意なID
  songTitle: string; // 曲名
  artistName: string; // アーティスト名
  nickname: string; // ニックネーム
  message?: string; // メッセージ（任意）
  timestamp: string; // ISO 8601形式のタイムスタンプ
  isRead: boolean; // 既読/未読フラグ
}
