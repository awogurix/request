// プレイリストページのJavaScript

document.addEventListener('DOMContentLoaded', () => {
  const playlistsList = document.getElementById('playlistsList');
  const noPlaylists = document.getElementById('noPlaylists');
  const calendarViewBtn = document.getElementById('calendarViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  const calendarView = document.getElementById('calendarView');
  const listView = document.getElementById('listView');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const currentMonthTitle = document.getElementById('currentMonth');
  const calendarContainer = document.getElementById('calendarContainer');
  const selectedDatePlaylists = document.getElementById('selectedDatePlaylists');
  const selectedDateTitle = document.getElementById('selectedDateTitle');
  const selectedDateContent = document.getElementById('selectedDateContent');

  let allPlaylists = [];
  let currentDate = new Date();
  let selectedDate = null;

  // 表示切り替え
  calendarViewBtn.addEventListener('click', () => {
    calendarViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    calendarView.style.display = 'block';
    listView.style.display = 'none';
  });

  listViewBtn.addEventListener('click', () => {
    listViewBtn.classList.add('active');
    calendarViewBtn.classList.remove('active');
    listView.style.display = 'block';
    calendarView.style.display = 'none';
  });

  // 月の切り替え
  prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  // カレンダーを描画
  function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 月のタイトルを更新
    currentMonthTitle.textContent = `${year}年${month + 1}月`;

    // 月の最初の日と最後の日
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    // 前月の最後の日
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    // カレンダーグリッドをクリア（ヘッダーは保持）
    // 最初の7つの要素（曜日ヘッダー）を保持して、それ以外を削除
    while (calendarContainer.children.length > 7) {
      calendarContainer.removeChild(calendarContainer.lastChild);
    }

    // 前月の日付を埋める
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const dayCell = createDayCell(dayNum, true, year, month - 1);
      calendarContainer.appendChild(dayCell);
    }

    // 当月の日付
    for (let day = 1; day <= daysInMonth; day++) {
      const dayCell = createDayCell(day, false, year, month);
      calendarContainer.appendChild(dayCell);
    }

    // 次月の日付を埋める（6週間分表示するため）
    const totalCells = calendarContainer.children.length - 7; // ヘッダー7つを除外
    const remainingCells = 42 - totalCells; // 6週間 x 7日 = 42
    for (let day = 1; day <= remainingCells; day++) {
      const dayCell = createDayCell(day, true, year, month + 1);
      calendarContainer.appendChild(dayCell);
    }
  }

  // 日付セルを作成
  function createDayCell(day, isOtherMonth, year, month) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    
    if (isOtherMonth) {
      cell.classList.add('other-month');
    }

    const dayNumber = document.createElement('div');
    dayNumber.className = 'calendar-day-number';
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    // 日付オブジェクトを作成
    const cellDate = new Date(year, month, day);
    const dateString = formatDateString(cellDate);

    // 今日かチェック
    const today = new Date();
    if (cellDate.toDateString() === today.toDateString()) {
      cell.classList.add('today');
    }

    // プレイリストがあるかチェック
    const hasPlaylist = allPlaylists.some(playlist => {
      if (!playlist.playlist_date) return false;
      const playlistDate = new Date(playlist.playlist_date);
      return playlistDate.toDateString() === cellDate.toDateString();
    });

    if (hasPlaylist) {
      cell.classList.add('has-playlist');
    }

    // クリックイベント（他の月の日付はクリック不可）
    if (!isOtherMonth) {
      cell.addEventListener('click', () => {
        selectDate(cellDate);
      });
    }

    return cell;
  }

  // 日付を選択
  function selectDate(date) {
    selectedDate = date;
    
    // すべてのセルから選択状態を解除
    document.querySelectorAll('.calendar-day').forEach(cell => {
      cell.classList.remove('selected');
    });

    // 選択されたセルに選択状態を追加
    const dayCells = Array.from(document.querySelectorAll('.calendar-day'));
    dayCells.forEach(cell => {
      const dayNum = parseInt(cell.querySelector('.calendar-day-number').textContent);
      const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNum);
      
      if (cellDate.toDateString() === date.toDateString() && !cell.classList.contains('other-month')) {
        cell.classList.add('selected');
      }
    });

    // 選択された日付のプレイリストを表示
    showPlaylistsForDate(date);
  }

  // 指定された日付のプレイリストを表示
  function showPlaylistsForDate(date) {
    const dateString = date.toDateString();
    const matchingPlaylists = allPlaylists.filter(playlist => {
      if (!playlist.playlist_date) return false;
      const playlistDate = new Date(playlist.playlist_date);
      return playlistDate.toDateString() === dateString;
    });

    selectedDateTitle.textContent = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日のプレイリスト`;

    if (matchingPlaylists.length === 0) {
      selectedDateContent.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-light);">
          <p>この日のプレイリストはありません</p>
        </div>
      `;
    } else {
      selectedDateContent.innerHTML = matchingPlaylists.map(playlist => 
        renderPlaylistItem(playlist)
      ).join('');
    }

    selectedDatePlaylists.style.display = 'block';
    
    // スクロールしてプレイリスト表示エリアを表示
    selectedDatePlaylists.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // プレイリストアイテムをレンダリング
  function renderPlaylistItem(playlist) {
    // playlist_dateがあればそれを使用、なければcreated_atを使用
    const dateStr = playlist.playlist_date || playlist.created_at;
    const date = new Date(dateStr);
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
  }

  // プレイリスト一覧を取得して表示（リストビュー用）
  async function loadPlaylists() {
    try {
      const response = await fetch('/api/playlists');
      const playlists = await response.json();
      
      allPlaylists = playlists;

      // リストビュー用の表示
      if (playlists.length === 0) {
        playlistsList.style.display = 'none';
        noPlaylists.style.display = 'flex';
        noPlaylists.style.flexDirection = 'column';
        noPlaylists.style.alignItems = 'center';
      } else {
        noPlaylists.style.display = 'none';
        playlistsList.style.display = 'flex';

        playlistsList.innerHTML = playlists.map(playlist => 
          renderPlaylistItem(playlist)
        ).join('');
      }

      // カレンダーを描画
      renderCalendar();

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

  // 日付を文字列にフォーマット（YYYY-MM-DD）
  function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ジングルモーダルの制御
  const jingleBtn = document.getElementById('jingleBtn');
  const jingleModal = document.getElementById('jingleModal');
  const jingleVideo = document.getElementById('jingleVideo');
  
  if (jingleBtn && jingleModal) {
    const modalClose = jingleModal.querySelector('.jingle-modal-close');
    const modalOverlay = jingleModal.querySelector('.jingle-modal-overlay');
    
    // モーダルを開く
    jingleBtn.addEventListener('click', () => {
      jingleModal.classList.add('show');
      jingleVideo.play();
    });
    
    // モーダルを閉じる
    const closeModal = () => {
      jingleModal.classList.remove('show');
      jingleVideo.pause();
      jingleVideo.currentTime = 0;
    };
    
    modalClose.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);
    
    // Escキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && jingleModal.classList.contains('show')) {
        closeModal();
      }
    });
  }

  // デバイスに応じたデフォルト表示を設定
  function setDefaultView() {
    const isMobile = window.innerWidth <= 768;
    
    if (isMobile) {
      // スマホ: カレンダー表示（デフォルト）
      calendarViewBtn.classList.add('active');
      listViewBtn.classList.remove('active');
      calendarView.style.display = 'block';
      listView.style.display = 'none';
    } else {
      // PC/タブレット: リスト表示
      listViewBtn.classList.add('active');
      calendarViewBtn.classList.remove('active');
      listView.style.display = 'block';
      calendarView.style.display = 'none';
    }
  }

  // 初回読み込み
  setDefaultView();
  loadPlaylists();
});
