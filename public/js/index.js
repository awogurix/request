// リクエストフォームページのJavaScript

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('requestForm');
  const messageInput = document.getElementById('message');
  const charCount = document.getElementById('charCount');
  const captchaQuestion = document.getElementById('captchaQuestion');
  const refreshCaptchaBtn = document.getElementById('refreshCaptcha');
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
      
      if (!data.enabled) {
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
      }
    } catch (error) {
      console.error('受付状態確認エラー:', error);
    }
  }

  // 次回配信情報を取得
  async function loadNextBroadcastInfo() {
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
        timeValue.textContent = data.time;
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

  // CAPTCHA読み込み
  async function loadCaptcha() {
    try {
      const response = await fetch('/api/captcha');
      const data = await response.json();
      captchaQuestion.textContent = data.question;
    } catch (error) {
      console.error('CAPTCHA読み込みエラー:', error);
      captchaQuestion.textContent = 'エラー';
    }
  }

  // CAPTCHA更新ボタン
  refreshCaptchaBtn.addEventListener('click', () => {
    loadCaptcha();
    document.getElementById('captcha').value = '';
  });

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
      message: messageInput.value.trim(),
      captcha: document.getElementById('captcha').value.trim()
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
        
        // CAPTCHAを再読み込み
        loadCaptcha();
        document.getElementById('captcha').value = '';
      }
    } catch (error) {
      console.error('送信エラー:', error);
      errorText.textContent = 'ネットワークエラーが発生しました。もう一度お試しください。';
      errorMessage.style.display = 'flex';
      loadCaptcha();
    } finally {
      // ボタンを有効化
      submitBtn.disabled = false;
      submitBtn.textContent = 'リクエストを送信';
    }
  });

  // 初期CAPTCHA読み込み
  loadCaptcha();
  
  // 受付状態をチェック
  checkRequestStatus();
  
  // 次回配信情報を読み込み
  loadNextBroadcastInfo();
});
