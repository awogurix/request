// 今日のリクエスト一覧ページのJavaScript

document.addEventListener('DOMContentLoaded', () => {
  const requestsList = document.getElementById('requestsList');
  const noRequests = document.getElementById('noRequests');
  const lastUpdate = document.getElementById('lastUpdate');
  const AUTO_REFRESH_INTERVAL = 30000; // 30秒
  
  let currentPage = 1;
  const itemsPerPage = 10;

  // リクエスト一覧を取得して表示
  async function loadRequests(page = 1) {
    try {
      currentPage = page;
      const response = await fetch(`/api/requests/today?page=${page}&limit=${itemsPerPage}`);
      const data = await response.json();
      const requests = data.requests;
      const pagination = data.pagination;

      // 最終更新時刻を表示
      const now = new Date();
      lastUpdate.textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      if (requests.length === 0) {
        requestsList.style.display = 'none';
        noRequests.style.display = 'flex';
        noRequests.style.flexDirection = 'column';
        noRequests.style.alignItems = 'center';
        
        // ページネーションも非表示
        const paginationEl = document.getElementById('publicPagination');
        if (paginationEl) paginationEl.style.display = 'none';
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

      // ページネーションUIを生成
      renderPagination(pagination);

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

  // ページネーションUIを生成
  function renderPagination(pagination) {
    let paginationEl = document.getElementById('publicPagination');
    
    if (!paginationEl) {
      // ページネーション要素を作成
      paginationEl = document.createElement('div');
      paginationEl.id = 'publicPagination';
      paginationEl.className = 'pagination';
      requestsList.parentNode.insertBefore(paginationEl, requestsList.nextSibling);
    }
    
    if (pagination.totalPages <= 1) {
      paginationEl.style.display = 'none';
      return;
    }
    
    paginationEl.style.display = 'flex';
    
    let html = '<div class="pagination-info">';
    html += `全${pagination.total}件中 ${((pagination.page - 1) * pagination.limit) + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)}件を表示`;
    html += '</div><div class="pagination-buttons">';
    
    // 前へボタン
    if (pagination.page > 1) {
      html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequestsPublic(${pagination.page - 1})">« 前へ</button>`;
    }
    
    // ページ番号
    const maxButtons = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxButtons / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (startPage > 1) {
      html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequestsPublic(1)">1</button>`;
      if (startPage > 2) {
        html += '<span class="pagination-ellipsis">...</span>';
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      if (i === pagination.page) {
        html += `<button class="btn btn-primary btn-sm" disabled>${i}</button>`;
      } else {
        html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequestsPublic(${i})">${i}</button>`;
      }
    }
    
    if (endPage < pagination.totalPages) {
      if (endPage < pagination.totalPages - 1) {
        html += '<span class="pagination-ellipsis">...</span>';
      }
      html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequestsPublic(${pagination.totalPages})">${pagination.totalPages}</button>`;
    }
    
    // 次へボタン
    if (pagination.page < pagination.totalPages) {
      html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequestsPublic(${pagination.page + 1})">次へ »</button>`;
    }
    
    html += '</div>';
    paginationEl.innerHTML = html;
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

  // グローバル関数として公開（ページネーションボタンから呼び出すため）
  window.loadRequestsPublic = loadRequests;

  // 初回読み込み
  loadRequests(1);

  // 自動更新（現在のページを保持）
  setInterval(() => {
    loadRequests(currentPage);
  }, AUTO_REFRESH_INTERVAL);
});
