// プレイリストページのJavaScript

document.addEventListener('DOMContentLoaded', () => {
  const playlistsList = document.getElementById('playlistsList');
  const noPlaylists = document.getElementById('noPlaylists');

  // プレイリスト一覧を取得して表示
  async function loadPlaylists() {
    try {
      const response = await fetch('/api/playlists');
      const playlists = await response.json();

      if (playlists.length === 0) {
        playlistsList.style.display = 'none';
        noPlaylists.style.display = 'flex';
        noPlaylists.style.flexDirection = 'column';
        noPlaylists.style.alignItems = 'center';
        return;
      }

      noPlaylists.style.display = 'none';
      playlistsList.style.display = 'flex';

      // プレイリスト一覧を生成
      playlistsList.innerHTML = playlists.map(playlist => {
        const date = new Date(playlist.created_at);
        const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        
        // URLからプラットフォームを判定
        let platform = '外部リンク';
        let platformIcon = '🔗';
        
        if (playlist.url.includes('spotify.com')) {
          platform = 'Spotify';
          platformIcon = '🎵';
        } else if (playlist.url.includes('music.apple.com')) {
          platform = 'Apple Music';
          platformIcon = '🍎';
        } else if (playlist.url.includes('youtube.com') || playlist.url.includes('youtu.be')) {
          platform = 'YouTube';
          platformIcon = '▶️';
        } else if (playlist.url.includes('music.youtube.com')) {
          platform = 'YouTube Music';
          platformIcon = '🎵';
        } else if (playlist.url.includes('amazon.co.jp/music') || playlist.url.includes('music.amazon.com')) {
          platform = 'Amazon Music';
          platformIcon = '🎧';
        }

        return `
          <div class="playlist-item">
            <div class="playlist-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polygon points="10 8 16 12 10 16 10 8"></polygon>
              </svg>
            </div>
            <div class="playlist-content">
              <div class="playlist-title">${escapeHtml(playlist.title)}</div>
              ${playlist.description ? `<div class="playlist-description">${escapeHtml(playlist.description)}</div>` : ''}
              <div class="playlist-meta">
                <span class="playlist-platform">${platformIcon} ${platform}</span>
                <span class="playlist-date">${formattedDate}</span>
              </div>
            </div>
            <div class="playlist-action">
              <a href="${escapeHtml(playlist.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-small">
                聴く
              </a>
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error('プレイリスト取得エラー:', error);
      playlistsList.innerHTML = `
        <div class="alert alert-error" style="display: flex;">
          <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>エラー</strong>
            <p>プレイリストの取得に失敗しました</p>
          </div>
        </div>
      `;
    }
  }

  // HTMLエスケープ関数
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  // 初回読み込み
  loadPlaylists();
});
