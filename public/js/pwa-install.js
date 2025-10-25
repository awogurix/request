// PWAインストールプロンプト
let deferredPrompt;
let installBanner;

window.addEventListener('beforeinstallprompt', (e) => {
  // デフォルトのインストールプロンプトを防ぐ
  e.preventDefault();
  deferredPrompt = e;
  
  // インストールバナーを表示
  showInstallBanner();
});

function showInstallBanner() {
  // すでにインストール済みかチェック
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return; // すでにインストール済み
  }
  
  // 以前に閉じられていたらチェック
  if (localStorage.getItem('pwa-install-dismissed')) {
    return;
  }
  
  // バナーを作成
  installBanner = document.createElement('div');
  installBanner.id = 'pwa-install-banner';
  installBanner.innerHTML = `
    <div class="pwa-banner-content">
      <div class="pwa-banner-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6"/>
          <line x1="2" y1="20" x2="2.01" y2="20"/>
        </svg>
      </div>
      <div class="pwa-banner-text">
        <strong>アプリをインストール</strong>
        <p>ホーム画面に追加してアプリのように使えます</p>
      </div>
      <button class="pwa-banner-button" id="pwa-install-button">インストール</button>
      <button class="pwa-banner-close" id="pwa-banner-close">×</button>
    </div>
  `;
  
  document.body.appendChild(installBanner);
  
  // インストールボタンのイベント
  document.getElementById('pwa-install-button').addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }
    
    // インストールプロンプトを表示
    deferredPrompt.prompt();
    
    // ユーザーの選択を待つ
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWAがインストールされました');
    } else {
      console.log('PWAのインストールがキャンセルされました');
    }
    
    // プロンプトをクリア
    deferredPrompt = null;
    hideInstallBanner();
  });
  
  // 閉じるボタンのイベント
  document.getElementById('pwa-banner-close').addEventListener('click', () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    hideInstallBanner();
  });
  
  // バナーをアニメーション表示
  setTimeout(() => {
    installBanner.classList.add('show');
  }, 1000);
}

function hideInstallBanner() {
  if (installBanner) {
    installBanner.classList.remove('show');
    setTimeout(() => {
      installBanner.remove();
    }, 300);
  }
}

// インストール成功時
window.addEventListener('appinstalled', () => {
  console.log('PWAが正常にインストールされました');
  hideInstallBanner();
  
  // インストール済みフラグをクリア
  localStorage.removeItem('pwa-install-dismissed');
});

// iOS用の手動インストールガイド
function showIOSInstallGuide() {
  // iOSかつSafariかチェック
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  if (isIOS && isSafari && !window.matchMedia('(display-mode: standalone)').matches) {
    // すでに閉じられていたらチェック
    if (localStorage.getItem('ios-install-dismissed')) {
      return;
    }
    
    const iosBanner = document.createElement('div');
    iosBanner.id = 'ios-install-banner';
    iosBanner.innerHTML = `
      <div class="pwa-banner-content">
        <div class="pwa-banner-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
        </div>
        <div class="pwa-banner-text">
          <strong>ホーム画面に追加</strong>
          <p>
            <svg style="width: 16px; height: 16px; display: inline; vertical-align: middle;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="2" width="6" height="20" rx="1"/>
              <path d="M12 18h.01"/>
            </svg>
            をタップして「ホーム画面に追加」を選択
          </p>
        </div>
        <button class="pwa-banner-close" id="ios-banner-close">×</button>
      </div>
    `;
    
    document.body.appendChild(iosBanner);
    
    document.getElementById('ios-banner-close').addEventListener('click', () => {
      localStorage.setItem('ios-install-dismissed', 'true');
      iosBanner.classList.remove('show');
      setTimeout(() => {
        iosBanner.remove();
      }, 300);
    });
    
    setTimeout(() => {
      iosBanner.classList.add('show');
    }, 2000);
  }
}

// ページ読み込み時にiOSガイドを表示
window.addEventListener('load', () => {
  setTimeout(showIOSInstallGuide, 1000);
});
