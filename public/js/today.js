// 今日のリクエスト一覧ページのJavaScript

document.addEventListener('DOMContentLoaded', () => {
  const requestsList = document.getElementById('requestsList');
  const noRequests = document.getElementById('noRequests');
  const lastUpdate = document.getElementById('lastUpdate');
  const AUTO_REFRESH_INTERVAL = 30000; // 30秒

  // リクエスト一覧を取得して表示
  async function loadRequests() {
    try {
      const response = await fetch('/api/requests/today');
      const requests = await response.json();

      // 最終更新時刻を表示
      const now = new Date();
      lastUpdate.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (requests.length === 0) {
        requestsList.style.display = 'none';
        noRequests.style.display = 'flex';
        noRequests.style.flexDirection = 'column';
        noRequests.style.alignItems = 'center';
        return;
      }

      noRequests.style.display = 'none';
      requestsList.style.display = 'flex';

      // リクエスト一覧を生成
      requestsList.innerHTML = requests.map(request => `
        <div class="request-item ${request.is_read ? 'selected' : ''}">
          <div class="request-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18V5l12-2v13M6 14H4c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2zM18 16h-2c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-2c0-1.1-.9-2-2-2z"></path>
            </svg>
          </div>
          <div class="request-content">
            <div class="request-song">
              ${request.is_read ? '<span class="selected-badge">✓ 選曲済</span>' : ''}
              ${escapeHtml(request.song_name)}
            </div>
            <div class="request-artist">${escapeHtml(request.artist_name)}</div>
            <div class="request-meta">
              <span class="request-time">${request.time}</span>
              <span>from ${escapeHtml(request.nickname)}</span>
            </div>
          </div>
        </div>
      `).join('');

    } catch (error) {
      console.error('リクエスト取得エラー:', error);
      requestsList.innerHTML = `
        <div class="alert alert-error" style="display: flex;">
          <svg class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <div>
            <strong>エラー</strong>
            <p>リクエストの取得に失敗しました</p>
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
  loadRequests();

  // 自動更新
  setInterval(loadRequests, AUTO_REFRESH_INTERVAL);
});
