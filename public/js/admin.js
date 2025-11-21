// 管理画面のJavaScript

document.addEventListener('DOMContentLoaded', () => {
  // 初期状態では認証済みクラスを削除（セキュリティ）
  document.body.classList.remove('admin-authenticated');
  
  const loginSection = document.getElementById('loginSection');
  const adminSection = document.getElementById('adminSection');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginErrorText = document.getElementById('loginErrorText');
  const logoutBtn = document.getElementById('logoutBtn');
  const dateFilter = document.getElementById('dateFilter');
  const clearFilter = document.getElementById('clearFilter');
  const exportBtn = document.getElementById('exportBtn');
  const adminRequestsList = document.getElementById('adminRequestsList');
  const noAdminRequests = document.getElementById('noAdminRequests');

  // タブ切り替え機能は削除（シンプルな1ページレイアウトに変更）

  // 統計情報の要素
  const statTotal = document.getElementById('statTotal');
  const statToday = document.getElementById('statToday');
  const statUnread = document.getElementById('statUnread');

  // 受付状態の要素
  const statusBadge = document.getElementById('statusBadge');
  const toggleStatusBtn = document.getElementById('toggleStatusBtn');
  let requestStatus = '1'; // 0: 停止中, 1: 受付中, 2: 次回配信分、受付中

  // 認証状態をチェック
  async function checkAuth() {
    try {
      const response = await fetch('/api/admin/check');
      const data = await response.json();
      
      if (data.isAuthenticated) {
        showAdminSection();
      } else {
        showLoginSection();
      }
    } catch (error) {
      console.error('認証チェックエラー:', error);
      showLoginSection();
    }
  }

  // ログイン画面を表示
  function showLoginSection() {
    document.body.classList.remove('admin-authenticated');
    loginSection.style.display = 'block';
    adminSection.style.display = 'none';
  }

  // 管理画面を表示
  function showAdminSection() {
    console.log('=== showAdminSection called ===');
    document.body.classList.add('admin-authenticated');
    loginSection.style.display = 'none';
    adminSection.style.display = 'block';
    
    // すべてのセクションのデータを読み込む（シンプルな1ページレイアウト）
    loadStats();
    window.loadRequests();
    loadRequestStatus();
    window.loadPlaylists();
    window.loadAnnouncements();
    window.loadBackups();
    window.loadThemeRequests();
    window.loadFeedback();
    
    console.log('=== showAdminSection complete ===');
  }

  // ログイン処理
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
      });

      if (response.ok) {
        showAdminSection();
        loginForm.reset();
      } else {
        const data = await response.json();
        loginErrorText.textContent = data.error || 'ログインに失敗しました';
        loginError.style.display = 'flex';
      }
    } catch (error) {
      console.error('ログインエラー:', error);
      loginErrorText.textContent = 'ネットワークエラーが発生しました';
      loginError.style.display = 'flex';
    }
  });

  // ログアウト処理
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      showLoginSection();
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  });

  // 統計情報を読み込み
  async function loadStats() {
    try {
      const response = await fetch('/api/admin/stats');
      const stats = await response.json();
      
      statTotal.textContent = stats.total || 0;
      statToday.textContent = stats.today || 0;
      statUnread.textContent = stats.unread || 0;
    } catch (error) {
      console.error('統計情報取得エラー:', error);
    }
  }

  // ページネーション変数
  let currentPage = 1;
  const itemsPerPage = 10;
  let currentDate = null;

  // リクエスト一覧を読み込み（グローバルに公開）
  window.loadRequests = async function(date = null, page = 1) {
    try {
      currentDate = date;
      currentPage = page;
      
      let url = `/api/admin/requests?page=${page}&limit=${itemsPerPage}`;
      if (date) {
        url += `&date=${date}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('認証エラー');
      }

      const data = await response.json();
      const requests = data.requests;
      const pagination = data.pagination;

      if (requests.length === 0) {
        adminRequestsList.style.display = 'none';
        noAdminRequests.style.display = 'flex';
        noAdminRequests.style.flexDirection = 'column';
        noAdminRequests.style.alignItems = 'center';
        
        // ページネーションも非表示
        const paginationEl = document.getElementById('pagination');
        if (paginationEl) paginationEl.style.display = 'none';
        return;
      }

      noAdminRequests.style.display = 'none';
      adminRequestsList.style.display = 'flex';

      // リクエスト一覧を生成
      adminRequestsList.innerHTML = requests.map(request => {
        const createdDate = new Date(request.created_at);
        const formattedDate = `${createdDate.getFullYear()}/${String(createdDate.getMonth() + 1).padStart(2, '0')}/${String(createdDate.getDate()).padStart(2, '0')} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;

        return `
          <div class="admin-request-item ${request.is_read ? 'selected' : ''}" data-id="${request.id}">
            <div class="admin-request-header">
              <div class="admin-request-info">
                <div class="admin-request-song">
                  ${request.is_read ? '<span class="selected-badge">✓ 選曲済</span> ' : ''}
                  ${escapeHtml(request.song_name)}
                </div>
                <div class="admin-request-artist">${escapeHtml(request.artist_name)}</div>
              </div>
              <div class="admin-request-actions">
                <button class="btn btn-small ${request.is_read ? 'btn-unselect' : 'btn-select'}" onclick="toggleRead(${request.id}, ${request.is_read})">
                  ${request.is_read ? '選曲解除' : '選曲する'}
                </button>
                <button class="btn btn-small btn-delete" onclick="deleteRequest(${request.id})">削除</button>
              </div>
            </div>
            <div class="admin-request-meta">
              <div class="meta-item">
                <div class="meta-label">ラジオネーム</div>
                <div class="meta-value">${escapeHtml(request.nickname)}</div>
              </div>
              <div class="meta-item">
                <div class="meta-label">受付日時</div>
                <div class="meta-value">${formattedDate}</div>
              </div>
            </div>
            ${request.message ? `
              <div class="admin-request-message">
                <div class="message-label">メッセージ</div>
                <div class="message-content">${escapeHtml(request.message)}</div>
              </div>
            ` : `
              <div class="admin-request-message">
                <div class="message-content message-empty">メッセージなし</div>
              </div>
            `}
          </div>
        `;
      }).join('');

      // ページネーションUIを生成
      renderPagination(pagination);

    } catch (error) {
      console.error('リクエスト取得エラー:', error);
      
      // 認証エラーの場合はログイン画面に戻す
      if (error.message === '認証エラー') {
        showLoginSection();
      }
    }
  }

  // ページネーションUIを生成
  function renderPagination(pagination) {
    let paginationEl = document.getElementById('pagination');
    
    if (!paginationEl) {
      // ページネーション要素を作成
      paginationEl = document.createElement('div');
      paginationEl.id = 'pagination';
      paginationEl.className = 'pagination';
      adminRequestsList.parentNode.insertBefore(paginationEl, adminRequestsList.nextSibling);
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
      html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequests('${currentDate || ''}', ${pagination.page - 1})">« 前へ</button>`;
    }
    
    // ページ番号
    const maxButtons = 5;
    let startPage = Math.max(1, pagination.page - Math.floor(maxButtons / 2));
    let endPage = Math.min(pagination.totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    if (startPage > 1) {
      html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequests('${currentDate || ''}', 1)">1</button>`;
      if (startPage > 2) {
        html += '<span class="pagination-ellipsis">...</span>';
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      if (i === pagination.page) {
        html += `<button class="btn btn-primary btn-sm" disabled>${i}</button>`;
      } else {
        html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequests('${currentDate || ''}', ${i})">${i}</button>`;
      }
    }
    
    if (endPage < pagination.totalPages) {
      if (endPage < pagination.totalPages - 1) {
        html += '<span class="pagination-ellipsis">...</span>';
      }
      html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequests('${currentDate || ''}', ${pagination.totalPages})">${pagination.totalPages}</button>`;
    }
    
    // 次へボタン
    if (pagination.page < pagination.totalPages) {
      html += `<button class="btn btn-secondary btn-sm" onclick="window.loadRequests('${currentDate || ''}', ${pagination.page + 1})">次へ »</button>`;
    }
    
    html += '</div>';
    paginationEl.innerHTML = html;
  }

  // 既読/未読切り替え
  window.toggleRead = async (id, currentIsRead) => {
    try {
      const response = await fetch(`/api/admin/requests/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_read: !currentIsRead })
      });

      if (response.ok) {
        loadStats();
        window.loadRequests(currentDate, currentPage);
      }
    } catch (error) {
      console.error('既読切り替えエラー:', error);
    }
  };

  // リクエスト削除
  window.deleteRequest = async (id) => {
    if (!confirm('このリクエストを削除してもよろしいですか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/requests/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        loadStats();
        window.loadRequests(currentDate, currentPage);
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
  };

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

  // 日付フィルター
  dateFilter.addEventListener('change', () => {
    window.loadRequests(dateFilter.value, 1);
  });

  // フィルタークリア
  clearFilter.addEventListener('click', () => {
    dateFilter.value = '';
    window.loadRequests(null, 1);
  });

  // CSVエクスポート
  exportBtn.addEventListener('click', () => {
    const date = dateFilter.value || 'all';
    window.location.href = `/api/admin/export?date=${date}`;
  });

  // 今日の日付を設定
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  dateFilter.max = todayStr;

  // === 受付状態管理 ===

  // 受付状態を読み込み
  async function loadRequestStatus() {
    try {
      const response = await fetch('/api/settings/request-status');
      const data = await response.json();
      requestStatus = data.status || '1';
      updateStatusUI();
    } catch (error) {
      console.error('受付状態取得エラー:', error);
    }
  }

  // 受付状態UIを更新
  function updateStatusUI() {
    const statusConfig = {
      '0': {
        text: '停止中',
        className: 'status-badge status-disabled',
        buttonText: '受付状態を変更'
      },
      '1': {
        text: '受付中',
        className: 'status-badge status-enabled',
        buttonText: '受付状態を変更'
      },
      '2': {
        text: '次回配信分、受付中',
        className: 'status-badge status-next',
        buttonText: '受付状態を変更'
      }
    };
    
    const config = statusConfig[requestStatus] || statusConfig['1'];
    statusBadge.textContent = config.text;
    statusBadge.className = config.className;
    toggleStatusBtn.textContent = config.buttonText;
    toggleStatusBtn.className = 'btn btn-primary';
  }

  // 受付状態切り替え
  if (toggleStatusBtn) {
    toggleStatusBtn.addEventListener('click', async () => {
      // 状態選択用のダイアログを表示
      const statusOptions = [
        { value: '0', label: '停止中' },
        { value: '1', label: '受付中' },
        { value: '2', label: '次回配信分、受付中' }
      ];
      
      const currentStatusLabel = statusOptions.find(opt => opt.value === requestStatus)?.label || '受付中';
      const message = `現在の状態: ${currentStatusLabel}\n\n変更したい状態を選択してください：\n0: 停止中\n1: 受付中\n2: 次回配信分、受付中`;
      
      const newStatus = prompt(message, requestStatus);
      
      if (newStatus === null || newStatus === requestStatus) {
        return; // キャンセルまたは同じ状態
      }
      
      if (!['0', '1', '2'].includes(newStatus)) {
        alert('0、1、2のいずれかを入力してください');
        return;
      }

      toggleStatusBtn.disabled = true;
      const originalText = toggleStatusBtn.textContent;
      toggleStatusBtn.textContent = '変更中...';

      try {
        const response = await fetch('/api/admin/settings/request-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        });

        const data = await response.json();

        if (response.ok) {
          requestStatus = newStatus;
          updateStatusUI();
          alert(data.message);
        } else {
          alert(data.error || '状態の変更に失敗しました');
        }
      } catch (error) {
        console.error('状態変更エラー:', error);
        alert('ネットワークエラーが発生しました');
      } finally {
        toggleStatusBtn.disabled = false;
        updateStatusUI();
      }
    });
  }

  // === 次回配信情報管理 ===
  const nextBroadcastForm = document.getElementById('nextBroadcastForm');
  const nextThemeInput = document.getElementById('nextThemeInput');
  const nextTimeInput = document.getElementById('nextTimeInput');
  const nextTimePeriod = document.getElementById('nextTimePeriod');
  const nextPeriodDate = document.getElementById('nextPeriodDate');
  const timeTypeDateTime = document.getElementById('timeTypeDateTime');
  const timeTypePeriod = document.getElementById('timeTypePeriod');
  const dateTimeInput = document.getElementById('dateTimeInput');
  const periodInput = document.getElementById('periodInput');
  const broadcastSuccess = document.getElementById('broadcastSuccess');
  const broadcastError = document.getElementById('broadcastError');
  const broadcastErrorText = document.getElementById('broadcastErrorText');

  // 時間設定タイプの切り替え
  if (timeTypeDateTime && timeTypePeriod) {
    timeTypeDateTime.addEventListener('change', () => {
      if (timeTypeDateTime.checked) {
        dateTimeInput.style.display = 'block';
        periodInput.style.display = 'none';
        nextTimePeriod.value = '';
      }
    });
    
    timeTypePeriod.addEventListener('change', () => {
      if (timeTypePeriod.checked) {
        dateTimeInput.style.display = 'none';
        periodInput.style.display = 'block';
        nextTimeInput.value = '';
      }
    });
  }

  // 次回配信情報を読み込み
  async function loadNextBroadcastInfo() {
    try {
      const response = await fetch('/api/settings/next-broadcast');
      const data = await response.json();
      
      nextThemeInput.value = data.theme || '';
      
      // 時間データの判定（ISO形式か時間帯か）
      if (data.time) {
        const timePeriods = ['朝', '昼', '夕方', '夜', '深夜'];
        
        // 「日付|時間帯」形式かチェック
        if (data.time.includes('|')) {
          const [date, period] = data.time.split('|');
          timeTypePeriod.checked = true;
          dateTimeInput.style.display = 'none';
          periodInput.style.display = 'block';
          nextPeriodDate.value = date;
          nextTimePeriod.value = period;
        } else if (timePeriods.includes(data.time)) {
          // 時間帯のみ（互換性のため）
          timeTypePeriod.checked = true;
          dateTimeInput.style.display = 'none';
          periodInput.style.display = 'block';
          nextTimePeriod.value = data.time;
        } else {
          // 日時（datetime-local形式）
          timeTypeDateTime.checked = true;
          dateTimeInput.style.display = 'block';
          periodInput.style.display = 'none';
          nextTimeInput.value = data.time;
        }
      }
    } catch (error) {
      console.error('次回配信情報取得エラー:', error);
    }
  }

  // 次回配信情報更新フォーム送信
  if (nextBroadcastForm) {
    nextBroadcastForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      broadcastSuccess.style.display = 'none';
      broadcastError.style.display = 'none';
      
      // 選択されている時間タイプに応じてデータを取得
      let timeValue = '';
      if (timeTypeDateTime.checked) {
        timeValue = nextTimeInput.value.trim();
      } else if (timeTypePeriod.checked) {
        const period = nextTimePeriod.value;
        const date = nextPeriodDate.value;
        
        // 日付と時間帯の両方がある場合は「日付|時間帯」形式で結合
        if (date && period) {
          timeValue = `${date}|${period}`;
        } else if (period) {
          // 時間帯のみ（互換性のため）
          timeValue = period;
        }
      }
      
      try {
        const response = await fetch('/api/admin/settings/next-broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            theme: nextThemeInput.value.trim(),
            time: timeValue
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          const successTextEl = document.getElementById('broadcastSuccessText');
          if (data.pushSent) {
            successTextEl.textContent = `次回配信情報を更新し、${data.pushCount}件のプッシュ通知を送信しました`;
          } else {
            successTextEl.textContent = '次回配信情報を更新しました';
          }
          
          broadcastSuccess.style.display = 'flex';
          
          setTimeout(() => {
            broadcastSuccess.style.display = 'none';
          }, 5000);
        } else {
          throw new Error(data.error || '更新に失敗しました');
        }
      } catch (error) {
        broadcastErrorText.textContent = error.message;
        broadcastError.style.display = 'flex';
      }
    });
  }

  // === プレイリスト管理 ===
  const playlistForm = document.getElementById('playlistForm');
  const playlistDescription = document.getElementById('playlistDescription');
  const playlistCharCount = document.getElementById('playlistCharCount');
  const playlistSuccess = document.getElementById('playlistSuccess');
  const playlistError = document.getElementById('playlistError');
  const playlistErrorText = document.getElementById('playlistErrorText');
  const addPlaylistBtn = document.getElementById('addPlaylistBtn');
  const adminPlaylistsList = document.getElementById('adminPlaylistsList');
  const noAdminPlaylists = document.getElementById('noAdminPlaylists');

  // 文字数カウント
  if (playlistDescription) {
    playlistDescription.addEventListener('input', () => {
      const length = playlistDescription.value.length;
      playlistCharCount.textContent = length;
      
      if (length > 500) {
        playlistCharCount.style.color = 'var(--error-color)';
      } else {
        playlistCharCount.style.color = 'var(--text-light)';
      }
    });
  }

  // プレイリスト追加フォーム送信
  if (playlistForm) {
    playlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      playlistSuccess.style.display = 'none';
      playlistError.style.display = 'none';
      
      addPlaylistBtn.disabled = true;
      addPlaylistBtn.textContent = '追加中...';
      
      const formData = {
        title: document.getElementById('playlistTitle').value.trim(),
        url: document.getElementById('playlistUrl').value.trim(),
        description: playlistDescription.value.trim()
      };
      
      try {
        const response = await fetch('/api/admin/playlists', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          playlistSuccess.style.display = 'flex';
          playlistForm.reset();
          playlistCharCount.textContent = '0';
          window.loadPlaylists();
          
          setTimeout(() => {
            playlistSuccess.style.display = 'none';
          }, 5000);
        } else {
          playlistErrorText.textContent = data.error || 'プレイリストの追加に失敗しました';
          playlistError.style.display = 'flex';
        }
      } catch (error) {
        console.error('プレイリスト追加エラー:', error);
        playlistErrorText.textContent = 'ネットワークエラーが発生しました';
        playlistError.style.display = 'flex';
      } finally {
        addPlaylistBtn.disabled = false;
        addPlaylistBtn.textContent = 'プレイリストを追加';
      }
    });
  }

  // プレイリスト一覧を読み込み（グローバルに公開）
  window.loadPlaylists = async function() {
    console.log('[loadPlaylists] Starting...');
    const adminPlaylistsList = document.getElementById('adminPlaylistsList');
    const noAdminPlaylists = document.getElementById('noAdminPlaylists');
    console.log('[loadPlaylists] adminPlaylistsList element:', adminPlaylistsList);
    console.log('[loadPlaylists] noAdminPlaylists element:', noAdminPlaylists);
    
    if (!adminPlaylistsList || !noAdminPlaylists) {
      console.error('[loadPlaylists] Required elements not found!');
      return;
    }
    
    try {
      console.log('[loadPlaylists] Fetching /api/playlists...');
      const response = await fetch('/api/playlists');
      console.log('[loadPlaylists] Response status:', response.status);
      const playlists = await response.json();
      console.log('[loadPlaylists] Playlists count:', playlists.length);
      
      if (playlists.length === 0) {
        adminPlaylistsList.style.display = 'none';
        noAdminPlaylists.style.display = 'block';
        return;
      }
      
      noAdminPlaylists.style.display = 'none';
      adminPlaylistsList.style.display = 'flex';
      
      adminPlaylistsList.innerHTML = playlists.map(playlist => {
        const createdDate = new Date(playlist.created_at);
        const formattedCreatedDate = `${createdDate.getFullYear()}/${String(createdDate.getMonth() + 1).padStart(2, '0')}/${String(createdDate.getDate()).padStart(2, '0')} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;
        
        return `
          <div class="admin-request-item" data-id="${playlist.id}">
            <div class="admin-request-header">
              <div class="admin-request-info">
                <div class="admin-request-song">${escapeHtml(playlist.title)}</div>
                <div class="admin-request-artist">
                  <a href="${escapeHtml(playlist.url)}" target="_blank" rel="noopener noreferrer" style="color: var(--secondary-color);">
                    ${escapeHtml(playlist.url)}
                  </a>
                </div>
              </div>
              <div class="admin-request-actions">
                <button class="btn btn-small btn-secondary" onclick="editPlaylist(${playlist.id})">編集</button>
                <button class="btn btn-small btn-delete" onclick="deletePlaylist(${playlist.id})">削除</button>
              </div>
            </div>
            <div class="admin-request-meta">
              <div class="meta-item">
                <div class="meta-label">追加日時</div>
                <div class="meta-value">${formattedCreatedDate}</div>
              </div>
            </div>
            ${playlist.description ? `
              <div class="admin-request-message">
                <div class="message-label">説明</div>
                <div class="message-content">${escapeHtml(playlist.description)}</div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
      console.log('[loadPlaylists] HTML generated and set successfully');
    } catch (error) {
      console.error('[loadPlaylists] Error:', error);
    }
    console.log('[loadPlaylists] Complete');
  };

  // プレイリスト削除
  window.deletePlaylist = async (id) => {
    if (!confirm('このプレイリストを削除してもよろしいですか？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/playlists/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        window.loadPlaylists();
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
  };

  // === バックアップ管理機能 ===
  const createBackupBtn = document.getElementById('createBackupBtn');
  const refreshBackupsBtn = document.getElementById('refreshBackupsBtn');
  const backupsList = document.getElementById('backupsList');
  const noBackups = document.getElementById('noBackups');
  const backupSuccess = document.getElementById('backupSuccess');
  const backupSuccessText = document.getElementById('backupSuccessText');
  const backupError = document.getElementById('backupError');
  const backupErrorText = document.getElementById('backupErrorText');

  // バックアップ一覧を読み込む（グローバルに公開）
  window.loadBackups = async function() {
    console.log('[loadBackups] Starting...');
    const backupsList = document.getElementById('backupsList');
    const noBackups = document.getElementById('noBackups');
    console.log('[loadBackups] Elements:', { backupsList, noBackups });
    
    if (!backupsList || !noBackups) {
      console.error('[loadBackups] Required elements not found!');
      return;
    }
    
    try {
      console.log('[loadBackups] Fetching /api/admin/backups...');
      const response = await fetch('/api/admin/backups');
      console.log('[loadBackups] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('バックアップ一覧の取得に失敗しました');
      }
      
      const backups = await response.json();
      console.log('[loadBackups] Backups count:', backups.length);
      
      if (backups.length === 0) {
        backupsList.style.display = 'none';
        noBackups.style.display = 'block';
        return;
      }
      
      noBackups.style.display = 'none';
      backupsList.style.display = 'flex';
      
      backupsList.innerHTML = backups.map(backup => {
        const date = new Date(backup.time);
        const formattedDate = date.toLocaleString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        const sizeKB = (backup.size / 1024).toFixed(2);
        
        return `
          <div class="request-item">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <strong style="font-size: 16px;">${backup.name}</strong>
              </div>
              <div style="color: #666; font-size: 14px;">
                <div>作成日時: ${formattedDate}</div>
                <div>サイズ: ${sizeKB} KB</div>
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm restore-backup-btn" data-filename="${backup.name}">
                復元
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      // 復元ボタンのイベントリスナーを設定
      document.querySelectorAll('.restore-backup-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const fileName = btn.dataset.filename;
          if (confirm(`"${fileName}" から復元しますか？\n\n現在のデータベースは上書きされます。\n復元前に自動的にバックアップが作成されます。`)) {
            await restoreBackup(fileName);
          }
        });
      });
      
      console.log('[loadBackups] HTML generated and set successfully');
    } catch (error) {
      console.error('[loadBackups] Error:', error);
      backupsList.innerHTML = '<div class="loading">エラーが発生しました</div>';
    }
    console.log('[loadBackups] Complete');
  };

  // 手動バックアップ作成
  createBackupBtn.addEventListener('click', async () => {
    try {
      createBackupBtn.disabled = true;
      createBackupBtn.textContent = '作成中...';
      
      const response = await fetch('/api/admin/backups/create', {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        backupSuccessText.textContent = data.message;
        backupSuccess.style.display = 'flex';
        backupError.style.display = 'none';
        
        setTimeout(() => {
          backupSuccess.style.display = 'none';
        }, 5000);
        
        // 一覧を更新
        window.loadBackups();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      backupErrorText.textContent = error.message;
      backupError.style.display = 'flex';
      backupSuccess.style.display = 'none';
    } finally {
      createBackupBtn.disabled = false;
      createBackupBtn.textContent = '手動バックアップ作成';
    }
  });

  // バックアップ一覧更新
  refreshBackupsBtn.addEventListener('click', () => {
    window.loadBackups();
  });

  // バックアップから復元
  async function restoreBackup(fileName) {
    try {
      const response = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        backupSuccessText.textContent = data.message;
        backupSuccess.style.display = 'flex';
        backupError.style.display = 'none';
        
        // 5秒後にページをリロード
        setTimeout(() => {
          location.reload();
        }, 3000);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      backupErrorText.textContent = error.message;
      backupError.style.display = 'flex';
      backupSuccess.style.display = 'none';
    }
  }

  // === お知らせ管理機能 ===
  const announcementForm = document.getElementById('announcementForm');
  const announcementTitle = document.getElementById('announcementTitle');
  const announcementMessage = document.getElementById('announcementMessage');
  const announcementCharCount = document.getElementById('announcementCharCount');
  const sendAnnouncementBtn = document.getElementById('sendAnnouncementBtn');
  const announcementSuccess = document.getElementById('announcementSuccess');
  const announcementSuccessText = document.getElementById('announcementSuccessText');
  const announcementError = document.getElementById('announcementError');
  const announcementErrorText = document.getElementById('announcementErrorText');
  const announcementsList = document.getElementById('announcementsList');
  const noAnnouncements = document.getElementById('noAnnouncements');

  // 文字数カウント
  if (announcementMessage) {
    announcementMessage.addEventListener('input', () => {
      const length = announcementMessage.value.length;
      announcementCharCount.textContent = length;
      
      if (length > 500) {
        announcementCharCount.style.color = 'var(--error-color)';
      } else {
        announcementCharCount.style.color = 'var(--text-light)';
      }
    });
  }

  // お知らせ一覧を読み込む（グローバルに公開）
  window.loadAnnouncements = async function() {
    console.log('[loadAnnouncements] Starting...');
    const announcementsList = document.getElementById('announcementsList');
    const noAnnouncements = document.getElementById('noAnnouncements');
    console.log('[loadAnnouncements] Elements:', { announcementsList, noAnnouncements });
    
    if (!announcementsList || !noAnnouncements) {
      console.error('[loadAnnouncements] Required elements not found!');
      return;
    }
    
    try {
      console.log('[loadAnnouncements] Fetching /api/announcements...');
      const response = await fetch('/api/announcements');
      console.log('[loadAnnouncements] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('お知らせ一覧の取得に失敗しました');
      }
      
      const announcements = await response.json();
      console.log('[loadAnnouncements] Announcements count:', announcements.length);
      
      if (announcements.length === 0) {
        announcementsList.style.display = 'none';
        noAnnouncements.style.display = 'block';
        return;
      }
      
      noAnnouncements.style.display = 'none';
      announcementsList.style.display = 'flex';
      
      announcementsList.innerHTML = announcements.map(announcement => {
        return `
          <div class="request-item">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <strong style="font-size: 16px;">${announcement.title}</strong>
                <span class="request-time">${announcement.created_at}</span>
              </div>
              <div style="color: #666; font-size: 14px; white-space: pre-wrap;">
                ${announcement.message}
              </div>
            </div>
            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm delete-announcement-btn" data-id="${announcement.id}">
                削除
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      // 削除ボタンのイベントリスナーを設定
      document.querySelectorAll('.delete-announcement-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (confirm('このお知らせを削除しますか？')) {
            await deleteAnnouncement(btn.dataset.id);
          }
        });
      });
      
      console.log('[loadAnnouncements] HTML generated and set successfully');
    } catch (error) {
      console.error('[loadAnnouncements] Error:', error);
      announcementsList.innerHTML = '<div class="loading">エラーが発生しました</div>';
    }
    console.log('[loadAnnouncements] Complete');
  };

  // お知らせ投稿フォーム送信
  if (announcementForm) {
    announcementForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      announcementSuccess.style.display = 'none';
      announcementError.style.display = 'none';
      
      const title = announcementTitle.value.trim();
      const message = announcementMessage.value.trim();
      
      if (!title || !message) {
        announcementErrorText.textContent = 'タイトルとメッセージは必須です';
        announcementError.style.display = 'flex';
        return;
      }
      
      sendAnnouncementBtn.disabled = true;
      sendAnnouncementBtn.textContent = '送信中...';
      
      try {
        const response = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ title, message })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          announcementSuccessText.textContent = data.message;
          announcementSuccess.style.display = 'flex';
          
          // フォームをクリア
          announcementForm.reset();
          announcementCharCount.textContent = '0';
          
          // 一覧を更新
          window.loadAnnouncements();
          
          setTimeout(() => {
            announcementSuccess.style.display = 'none';
          }, 5000);
        } else {
          throw new Error(data.error || 'お知らせの投稿に失敗しました');
        }
      } catch (error) {
        announcementErrorText.textContent = error.message;
        announcementError.style.display = 'flex';
      } finally {
        sendAnnouncementBtn.disabled = false;
        sendAnnouncementBtn.textContent = 'プッシュ通知を送信';
      }
    });
  }

  // お知らせ削除
  async function deleteAnnouncement(id) {
    try {
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        window.loadAnnouncements();
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
  }

  // === テーマ募集管理機能 ===
  window.loadThemeRequests = async function() {
    console.log('[loadThemeRequests] Starting...');
    const themeRequestsList = document.getElementById('themeRequestsList');
    const noThemeRequests = document.getElementById('noThemeRequests');
    
    if (!themeRequestsList || !noThemeRequests) {
      console.error('[loadThemeRequests] Required elements not found!');
      return;
    }
    
    try {
      console.log('[loadThemeRequests] Fetching /api/admin/theme-suggestions...');
      const response = await fetch('/api/admin/theme-suggestions');
      console.log('[loadThemeRequests] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('テーマ募集一覧の取得に失敗しました');
      }
      
      const data = await response.json();
      const themeRequests = data.suggestions || [];
      console.log('[loadThemeRequests] Theme requests count:', themeRequests.length);
      
      if (themeRequests.length === 0) {
        themeRequestsList.style.display = 'none';
        noThemeRequests.style.display = 'block';
        return;
      }
      
      noThemeRequests.style.display = 'none';
      themeRequestsList.style.display = 'flex';
      
      themeRequestsList.innerHTML = themeRequests.map(theme => {
        const statusBadge = theme.status === 'approved' ? '<span style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">採用</span>' :
                           theme.status === 'rejected' ? '<span style="background: #f44336; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">不採用</span>' :
                           '<span style="background: #FF9800; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">検討中</span>';
        
        const readBadge = theme.is_read ? '' : '<span style="background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">未読</span>';
        
        return `
          <div class="request-item" style="${theme.is_read ? '' : 'background-color: #f0f7ff;'}">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <strong style="font-size: 16px;">${theme.theme_title}</strong>
                ${statusBadge}
                ${readBadge}
                <span class="request-time">${theme.created_at}</span>
              </div>
              <div style="color: #666; font-size: 14px; margin-bottom: 8px;">
                <strong>提案内容:</strong> ${theme.theme_description}
              </div>
              ${theme.example_songs ? `<div style="color: #666; font-size: 14px; margin-bottom: 8px;"><strong>例:</strong> ${theme.example_songs}</div>` : ''}
              <div style="color: #666; font-size: 14px;">
                <strong>提案者:</strong> ${theme.nickname}
              </div>
            </div>
            <div style="display: flex; gap: 10px; flex-direction: column;">
              <select class="form-input" style="width: 120px;" onchange="updateThemeStatus(${theme.id}, this.value)">
                <option value="pending" ${theme.status === 'pending' ? 'selected' : ''}>検討中</option>
                <option value="approved" ${theme.status === 'approved' ? 'selected' : ''}>採用</option>
                <option value="rejected" ${theme.status === 'rejected' ? 'selected' : ''}>不採用</option>
              </select>
              <button class="btn btn-secondary btn-sm" onclick="toggleThemeRead(${theme.id}, ${theme.is_read ? 0 : 1})">
                ${theme.is_read ? '未読にする' : '既読にする'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="deleteThemeRequest(${theme.id})">
                削除
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      console.log('[loadThemeRequests] HTML generated and set successfully');
    } catch (error) {
      console.error('[loadThemeRequests] Error:', error);
      themeRequestsList.innerHTML = '<div class="loading">エラーが発生しました</div>';
    }
    console.log('[loadThemeRequests] Complete');
  };

  window.updateThemeStatus = async function(id, status) {
    try {
      const response = await fetch(`/api/admin/theme-suggestions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        window.loadThemeRequests();
      }
    } catch (error) {
      console.error('ステータス更新エラー:', error);
    }
  };

  window.toggleThemeRead = async function(id, isRead) {
    try {
      const response = await fetch(`/api/admin/theme-suggestions/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: isRead })
      });
      
      if (response.ok) {
        window.loadThemeRequests();
      }
    } catch (error) {
      console.error('既読状態更新エラー:', error);
    }
  };

  window.deleteThemeRequest = async function(id) {
    if (!confirm('このテーマ提案を削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/admin/theme-suggestions/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        window.loadThemeRequests();
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
  };

  // === フィードバック管理機能 ===
  window.loadFeedback = async function() {
    console.log('[loadFeedback] Starting...');
    const feedbackList = document.getElementById('feedbackList');
    const noFeedback = document.getElementById('noFeedback');
    
    if (!feedbackList || !noFeedback) {
      console.error('[loadFeedback] Required elements not found!');
      return;
    }
    
    try {
      console.log('[loadFeedback] Fetching /api/admin/feedback...');
      const response = await fetch('/api/admin/feedback');
      console.log('[loadFeedback] Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('フィードバック一覧の取得に失敗しました');
      }
      
      const feedback = await response.json();
      console.log('[loadFeedback] Feedback count:', feedback.length);
      
      if (feedback.length === 0) {
        feedbackList.style.display = 'none';
        noFeedback.style.display = 'block';
        return;
      }
      
      noFeedback.style.display = 'none';
      feedbackList.style.display = 'flex';
      
      feedbackList.innerHTML = feedback.map(item => {
        const typeLabel = item.feedback_type === 'bug' ? 'バグ報告' :
                         item.feedback_type === 'feature' ? '機能要望' :
                         item.feedback_type === 'other' ? 'その他' : item.feedback_type;
        
        const typeBadgeColor = item.feedback_type === 'bug' ? '#f44336' :
                              item.feedback_type === 'feature' ? '#4CAF50' : '#9E9E9E';
        
        const readBadge = item.is_read ? '' : '<span style="background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: 8px;">未読</span>';
        
        return `
          <div class="request-item" style="${item.is_read ? '' : 'background-color: #f0f7ff;'}">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                <span style="background: ${typeBadgeColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${typeLabel}</span>
                ${readBadge}
                <span class="request-time">${item.created_at}</span>
              </div>
              <div style="color: #333; font-size: 14px; margin-bottom: 8px; white-space: pre-wrap;">
                ${item.content}
              </div>
              <div style="color: #666; font-size: 14px;">
                <strong>投稿者:</strong> ${item.nickname}
              </div>
            </div>
            <div style="display: flex; gap: 10px; flex-direction: column;">
              <button class="btn btn-secondary btn-sm" onclick="toggleFeedbackRead(${item.id}, ${item.is_read ? 0 : 1})">
                ${item.is_read ? '未読にする' : '既読にする'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="deleteFeedback(${item.id})">
                削除
              </button>
            </div>
          </div>
        `;
      }).join('');
      
      console.log('[loadFeedback] HTML generated and set successfully');
    } catch (error) {
      console.error('[loadFeedback] Error:', error);
      feedbackList.innerHTML = '<div class="loading">エラーが発生しました</div>';
    }
    console.log('[loadFeedback] Complete');
  };

  window.toggleFeedbackRead = async function(id, isRead) {
    try {
      const response = await fetch(`/api/admin/feedback/${id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_read: isRead })
      });
      
      if (response.ok) {
        window.loadFeedback();
      }
    } catch (error) {
      console.error('既読状態更新エラー:', error);
    }
  };

  window.deleteFeedback = async function(id) {
    if (!confirm('このフィードバックを削除しますか？')) return;
    
    try {
      const response = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        window.loadFeedback();
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
  };

  // === プレイリスト編集機能 ===
  const editPlaylistModal = document.getElementById('editPlaylistModal');
  const editPlaylistForm = document.getElementById('editPlaylistForm');
  const editPlaylistId = document.getElementById('editPlaylistId');
  const editPlaylistTitle = document.getElementById('editPlaylistTitle');
  const editPlaylistUrl = document.getElementById('editPlaylistUrl');
  const editPlaylistDescription = document.getElementById('editPlaylistDescription');
  const editPlaylistCharCount = document.getElementById('editPlaylistCharCount');
  const editPlaylistSuccess = document.getElementById('editPlaylistSuccess');
  const editPlaylistError = document.getElementById('editPlaylistError');
  const editPlaylistErrorText = document.getElementById('editPlaylistErrorText');
  const closeEditModal = document.getElementById('closeEditModal');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const saveEditBtn = document.getElementById('saveEditBtn');

  // 文字数カウント
  if (editPlaylistDescription) {
    editPlaylistDescription.addEventListener('input', () => {
      const length = editPlaylistDescription.value.length;
      editPlaylistCharCount.textContent = length;
      
      if (length > 500) {
        editPlaylistCharCount.style.color = 'var(--error-color)';
      } else {
        editPlaylistCharCount.style.color = 'var(--text-light)';
      }
    });
  }

  // プレイリスト編集
  window.editPlaylist = async (id) => {
    try {
      // プレイリストデータを取得
      const response = await fetch('/api/playlists');
      const playlists = await response.json();
      const playlist = playlists.find(p => p.id === id);
      
      if (!playlist) {
        alert('プレイリストが見つかりません');
        return;
      }
      
      // フォームに値を設定
      editPlaylistId.value = playlist.id;
      editPlaylistTitle.value = playlist.title;
      editPlaylistUrl.value = playlist.url;
      editPlaylistDescription.value = playlist.description || '';
      editPlaylistCharCount.textContent = (playlist.description || '').length;
      
      // エラー・成功メッセージをリセット
      editPlaylistSuccess.style.display = 'none';
      editPlaylistError.style.display = 'none';
      
      // モーダルを表示
      editPlaylistModal.style.display = 'flex';
    } catch (error) {
      console.error('プレイリスト取得エラー:', error);
      alert('プレイリストの取得に失敗しました');
    }
  };

  // モーダルを閉じる
  function closeModal() {
    editPlaylistModal.style.display = 'none';
  }

  closeEditModal.addEventListener('click', closeModal);
  cancelEditBtn.addEventListener('click', closeModal);
  
  // モーダル背景クリックで閉じる
  editPlaylistModal.addEventListener('click', (e) => {
    if (e.target === editPlaylistModal) {
      closeModal();
    }
  });

  // 編集フォーム送信
  editPlaylistForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    editPlaylistSuccess.style.display = 'none';
    editPlaylistError.style.display = 'none';
    
    saveEditBtn.disabled = true;
    saveEditBtn.textContent = '更新中...';
    
    const id = editPlaylistId.value;
    const formData = {
      title: editPlaylistTitle.value.trim(),
      url: editPlaylistUrl.value.trim(),
      description: editPlaylistDescription.value.trim()
    };
    
    try {
      const response = await fetch(`/api/admin/playlists/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        editPlaylistSuccess.style.display = 'flex';
        window.loadPlaylists();
        
        setTimeout(() => {
          closeModal();
          editPlaylistSuccess.style.display = 'none';
        }, 2000);
      } else {
        editPlaylistErrorText.textContent = data.error || 'プレイリストの更新に失敗しました';
        editPlaylistError.style.display = 'flex';
      }
    } catch (error) {
      console.error('プレイリスト更新エラー:', error);
      editPlaylistErrorText.textContent = 'ネットワークエラーが発生しました';
      editPlaylistError.style.display = 'flex';
    } finally {
      saveEditBtn.disabled = false;
      saveEditBtn.textContent = '更新';
    }
  });

  // 初期化
  checkAuth();
});
