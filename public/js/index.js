// リクエストフォームページのJavaScript

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('requestForm');
  const messageInput = document.getElementById('message');
  const charCount = document.getElementById('charCount');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  const submitBtn = document.getElementById('submitBtn');
  const closedNotice = document.getElementById('closedNotice');

  // 受付状態をチェック
  async function checkRequestStatus() {
    try {
      const response = await fetch('/api/settings/request-status');
      const data = await response.json();
      
      // 0: 停止中, 1: 受付中, 2: 次回配信分、受付中
      const status = data.status;
      
      if (status === '0') {
        // 受付停止中の場合
        // 大きな警告メッセージを表示
        closedNotice.style.display = 'flex';
        
        // フォームを無効化して半透明に
        form.style.opacity = '0.5';
        form.style.pointerEvents = 'none';
        
        // すべての入力欄を無効化
        const inputs = form.querySelectorAll('input, textarea, button');
        inputs.forEach(input => {
          input.disabled = true;
        });
        
        // ページのタイトルも変更
        document.querySelector('.card-header h2').textContent = 'リクエスト受付停止中';
        document.querySelector('.card-header p').textContent = '現在、リクエストの受付を一時停止しています。';
      } else {
        // 受付中の場合は通常表示
        closedNotice.style.display = 'none';
        
        // タイトルを状態に応じて変更
        if (status === '2') {
          document.querySelector('.card-header h2').textContent = '次回配信分のリクエスト受付中';
          document.querySelector('.card-header p').textContent = '次回の配信で流す曲をリクエストしてください。';
        } else {
          document.querySelector('.card-header h2').textContent = 'あなたのリクエストをお待ちしています';
          document.querySelector('.card-header p').textContent = 'お好きな曲をリクエストしてください。番組でご紹介させていただきます。';
        }
      }
      
      // 次回配信情報を読み込み（受付状態を渡す）
      loadNextBroadcastInfo(status);
    } catch (error) {
      console.error('受付状態確認エラー:', error);
    }
  }

  // 次回配信情報を取得（受付停止時は非表示）
  async function loadNextBroadcastInfo(requestStatus) {
    // 受付停止中（status === '0'）の場合は表示しない
    if (requestStatus === '0') {
      document.getElementById('nextBroadcastInfo').style.display = 'none';
      return;
    }
    
    try {
      const response = await fetch('/api/settings/next-broadcast');
      const data = await response.json();
      
      const infoBox = document.getElementById('nextBroadcastInfo');
      const themeItem = document.getElementById('nextTheme');
      const themeValue = document.getElementById('nextThemeValue');
      const timeItem = document.getElementById('nextTime');
      const timeValue = document.getElementById('nextTimeValue');
      
      let hasInfo = false;
      
      // テーマ情報がある場合
      if (data.theme && data.theme.trim()) {
        themeValue.textContent = data.theme;
        themeItem.style.display = 'flex';
        hasInfo = true;
      } else {
        themeItem.style.display = 'none';
      }
      
      // 配信時間情報がある場合
      if (data.time && data.time.trim()) {
        let displayTime = data.time;
        
        // 「日付|時間帯」形式の場合はフォーマット
        if (data.time.includes('|')) {
          const [date, period] = data.time.split('|');
          const broadcastDate = new Date(date);
          if (!isNaN(broadcastDate.getTime())) {
            const formattedDate = `${broadcastDate.getMonth() + 1}月${broadcastDate.getDate()}日`;
            displayTime = `${formattedDate} ${period}`;
          }
        } else if (data.time.includes('T')) {
          // datetime-local形式の場合はフォーマット
          const broadcastDate = new Date(data.time);
          if (!isNaN(broadcastDate.getTime())) {
            displayTime = `${broadcastDate.getMonth() + 1}月${broadcastDate.getDate()}日 ${broadcastDate.getHours()}:${String(broadcastDate.getMinutes()).padStart(2, '0')}`;
          }
        }
        
        timeValue.textContent = displayTime;
        timeItem.style.display = 'flex';
        hasInfo = true;
      } else {
        timeItem.style.display = 'none';
      }
      
      // どちらか一つでも情報があれば表示
      if (hasInfo) {
        infoBox.style.display = 'block';
      } else {
        infoBox.style.display = 'none';
      }
    } catch (error) {
      console.error('次回配信情報取得エラー:', error);
    }
  }

  // 文字数カウント
  messageInput.addEventListener('input', () => {
    const length = messageInput.value.length;
    charCount.textContent = length;
    
    if (length > 300) {
      charCount.style.color = 'var(--error-color)';
    } else {
      charCount.style.color = 'var(--text-light)';
    }
  });

  // CAPTCHA機能は削除されました

  // フォーム送信
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // アラートを非表示
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    // ボタン無効化
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';

    const formData = {
      song_name: document.getElementById('songName').value.trim(),
      artist_name: document.getElementById('artistName').value.trim(),
      nickname: document.getElementById('nickname').value.trim(),
      message: messageInput.value.trim()
    };

    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        // 成功
        successMessage.style.display = 'flex';
        form.reset();
        charCount.textContent = '0';
        loadCaptcha();
        
        // 画面を上にスクロール
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // 3秒後に成功メッセージを非表示
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 5000);
      } else {
        // エラー
        errorText.textContent = data.error || 'リクエストの送信に失敗しました';
        errorMessage.style.display = 'flex';
      }
    } catch (error) {
      console.error('送信エラー:', error);
      errorText.textContent = 'ネットワークエラーが発生しました。もう一度お試しください。';
      errorMessage.style.display = 'flex';
    } finally {
      // ボタンを有効化
      submitBtn.disabled = false;
      submitBtn.textContent = 'リクエストを送信';
    }
  });

  // 受付状態をチェック（次回配信情報も内部で読み込まれる）
  checkRequestStatus();

  // ジングルモーダル機能
  const jingleBtn = document.getElementById('jingleBtn');
  const jingleModal = document.getElementById('jingleModal');
  const jingleModalClose = document.querySelector('.jingle-modal-close');
  const jingleModalOverlay = document.querySelector('.jingle-modal-overlay');
  const jingleVideo = document.getElementById('jingleVideo');
  
  if (jingleBtn && jingleModal) {
    // モーダルを開く
    jingleBtn.addEventListener('click', () => {
      jingleModal.classList.add('active');
      document.body.style.overflow = 'hidden'; // スクロールを無効化
    });

    // モーダルを閉じる関数
    const closeModal = () => {
      jingleModal.classList.remove('active');
      document.body.style.overflow = ''; // スクロールを有効化
      if (jingleVideo) {
        jingleVideo.pause(); // 動画を一時停止
      }
    };

    // 閉じるボタンをクリック
    if (jingleModalClose) {
      jingleModalClose.addEventListener('click', closeModal);
    }

    // オーバーレイをクリック
    if (jingleModalOverlay) {
      jingleModalOverlay.addEventListener('click', closeModal);
    }

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && jingleModal.classList.contains('active')) {
        closeModal();
      }
    });
  }
});
