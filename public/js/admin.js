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

  // 統計情報の要素
  const statTotal = document.getElementById('statTotal');
  const statToday = document.getElementById('statToday');
  const statUnread = document.getElementById('statUnread');

  // 受付状態の要素
  const statusBadge = document.getElementById('statusBadge');
  const toggleStatusBtn = document.getElementById('toggleStatusBtn');
  let requestEnabled = true;

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
    document.body.classList.add('admin-authenticated');
    loginSection.style.display = 'none';
    adminSection.style.display = 'block';
    loadStats();
    loadRequests();
    loadRequestStatus();
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

  // リクエスト一覧を読み込み
  async function loadRequests(date = null) {
    try {
      const url = date ? `/api/admin/requests?date=${date}` : '/api/admin/requests';
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('認証エラー');
      }

      const requests = await response.json();

      if (requests.length === 0) {
        adminRequestsList.style.display = 'none';
        noAdminRequests.style.display = 'flex';
        noAdminRequests.style.flexDirection = 'column';
        noAdminRequests.style.alignItems = 'center';
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

    } catch (error) {
      console.error('リクエスト取得エラー:', error);
      
      // 認証エラーの場合はログイン画面に戻す
      if (error.message === '認証エラー') {
        showLoginSection();
      }
    }
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
        loadRequests(dateFilter.value || null);
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
        loadRequests(dateFilter.value || null);
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
    loadRequests(dateFilter.value);
  });

  // フィルタークリア
  clearFilter.addEventListener('click', () => {
    dateFilter.value = '';
    loadRequests();
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
      requestEnabled = data.enabled;
      updateStatusUI();
    } catch (error) {
      console.error('受付状態取得エラー:', error);
    }
  }

  // 受付状態UIを更新
  function updateStatusUI() {
    if (requestEnabled) {
      statusBadge.textContent = '受付中';
      statusBadge.className = 'status-badge status-enabled';
      toggleStatusBtn.textContent = '受付を停止する';
      toggleStatusBtn.className = 'btn btn-secondary';
    } else {
      statusBadge.textContent = '停止中';
      statusBadge.className = 'status-badge status-disabled';
      toggleStatusBtn.textContent = '受付を再開する';
      toggleStatusBtn.className = 'btn btn-primary';
    }
  }

  // 受付状態切り替え
  if (toggleStatusBtn) {
    toggleStatusBtn.addEventListener('click', async () => {
      if (!confirm(requestEnabled ? 'リクエストの受付を停止しますか？' : 'リクエストの受付を再開しますか？')) {
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
          body: JSON.stringify({ enabled: !requestEnabled })
        });

        const data = await response.json();

        if (response.ok) {
          requestEnabled = !requestEnabled;
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
        toggleStatusBtn.textContent = originalText;
      }
    });
  }

  // === 次回配信情報管理 ===
  const nextBroadcastForm = document.getElementById('nextBroadcastForm');
  const nextThemeInput = document.getElementById('nextThemeInput');
  const nextTimeInput = document.getElementById('nextTimeInput');
  const broadcastSuccess = document.getElementById('broadcastSuccess');
  const broadcastError = document.getElementById('broadcastError');
  const broadcastErrorText = document.getElementById('broadcastErrorText');

  // 次回配信情報を読み込み
  async function loadNextBroadcastInfo() {
    try {
      const response = await fetch('/api/settings/next-broadcast');
      const data = await response.json();
      
      nextThemeInput.value = data.theme || '';
      nextTimeInput.value = data.time || '';
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
      
      try {
        const response = await fetch('/api/admin/settings/next-broadcast', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            theme: nextThemeInput.value.trim(),
            time: nextTimeInput.value.trim()
          })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          broadcastSuccess.style.display = 'flex';
          
          setTimeout(() => {
            broadcastSuccess.style.display = 'none';
          }, 3000);
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
          loadPlaylists();
          
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

  // プレイリスト一覧を読み込み
  async function loadPlaylists() {
    try {
      const response = await fetch('/api/playlists');
      const playlists = await response.json();
      
      if (playlists.length === 0) {
        adminPlaylistsList.style.display = 'none';
        noAdminPlaylists.style.display = 'block';
        return;
      }
      
      noAdminPlaylists.style.display = 'none';
      adminPlaylistsList.style.display = 'flex';
      
      adminPlaylistsList.innerHTML = playlists.map(playlist => {
        const createdDate = new Date(playlist.created_at);
        const formattedDate = `${createdDate.getFullYear()}/${String(createdDate.getMonth() + 1).padStart(2, '0')}/${String(createdDate.getDate()).padStart(2, '0')} ${String(createdDate.getHours()).padStart(2, '0')}:${String(createdDate.getMinutes()).padStart(2, '0')}`;
        
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
                <button class="btn btn-small btn-delete" onclick="deletePlaylist(${playlist.id})">削除</button>
              </div>
            </div>
            <div class="admin-request-meta">
              <div class="meta-item">
                <div class="meta-label">追加日時</div>
                <div class="meta-value">${formattedDate}</div>
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
    } catch (error) {
      console.error('プレイリスト取得エラー:', error);
    }
  }

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
        loadPlaylists();
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

  // バックアップ一覧を読み込む
  async function loadBackups() {
    try {
      const response = await fetch('/api/admin/backups');
      
      if (!response.ok) {
        throw new Error('バックアップ一覧の取得に失敗しました');
      }
      
      const backups = await response.json();
      
      if (backups.length === 0) {
        backupsList.style.display = 'none';
        noBackups.style.display = 'block';
        return;
      }
      
      backupsList.style.display = 'block';
      noBackups.style.display = 'none';
      
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
      
    } catch (error) {
      console.error('バックアップ一覧読み込みエラー:', error);
      backupsList.innerHTML = '<div class="loading">エラーが発生しました</div>';
    }
  }

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
        loadBackups();
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
    loadBackups();
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

  // お知らせ一覧を読み込む
  async function loadAnnouncements() {
    try {
      const response = await fetch('/api/announcements');
      
      if (!response.ok) {
        throw new Error('お知らせ一覧の取得に失敗しました');
      }
      
      const announcements = await response.json();
      
      if (announcements.length === 0) {
        announcementsList.style.display = 'none';
        noAnnouncements.style.display = 'block';
        return;
      }
      
      announcementsList.style.display = 'block';
      noAnnouncements.style.display = 'none';
      
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
      
    } catch (error) {
      console.error('お知らせ一覧読み込みエラー:', error);
      announcementsList.innerHTML = '<div class="loading">エラーが発生しました</div>';
    }
  }

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
          loadAnnouncements();
          
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
        loadAnnouncements();
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
  }

  // 初期化
  checkAuth();
  
  // 認証後にプレイリスト、バックアップ、次回配信情報、お知らせを読み込む
  const originalShowAdminSection = showAdminSection;
  showAdminSection = function() {
    originalShowAdminSection();
    loadPlaylists();
    loadBackups();
    loadNextBroadcastInfo();
    loadAnnouncements();
  };
});
