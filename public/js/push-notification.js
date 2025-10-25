// プッシュ通知管理
let isSubscribed = false;
let swRegistration = null;

// Base64文字列をUint8Arrayに変換
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// プッシュ通知をサポートしているかチェック
function isPushNotificationSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

// プッシュ通知の購読状態を確認
async function checkSubscription() {
  if (!isPushNotificationSupported()) {
    console.log('プッシュ通知はサポートされていません');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    swRegistration = registration;
    
    const subscription = await registration.pushManager.getSubscription();
    isSubscribed = !(subscription === null);
    
    updateSubscriptionUI();
    
    if (subscription) {
      console.log('プッシュ通知購読中');
    }
  } catch (error) {
    console.error('購読状態の確認エラー:', error);
  }
}

// プッシュ通知を購読
async function subscribeToPush() {
  if (!isPushNotificationSupported()) {
    alert('お使いのブラウザはプッシュ通知をサポートしていません');
    return;
  }

  try {
    // 通知許可を要求
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      console.log('通知許可が拒否されました');
      alert('通知を有効にするには、ブラウザの設定で通知を許可してください');
      return;
    }

    // VAPID公開鍵を取得
    const response = await fetch('/api/push/vapid-public-key');
    const data = await response.json();
    const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

    // プッシュ通知を購読
    const subscription = await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey
    });

    // サーバーに購読情報を送信
    const subscribeResponse = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription)
    });

    if (subscribeResponse.ok) {
      console.log('プッシュ通知の購読に成功しました');
      isSubscribed = true;
      updateSubscriptionUI();
      
      // 購読成功メッセージ
      if (window.location.pathname === '/') {
        showNotificationMessage('通知を有効にしました', 'お知らせがあるとスマホに通知が届きます');
      }
    } else {
      console.error('購読登録に失敗しました');
    }
  } catch (error) {
    console.error('プッシュ通知購読エラー:', error);
    alert('プッシュ通知の設定に失敗しました');
  }
}

// プッシュ通知を解除
async function unsubscribeFromPush() {
  try {
    const subscription = await swRegistration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      
      // サーバーから購読情報を削除
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });
      
      console.log('プッシュ通知の購読を解除しました');
      isSubscribed = false;
      updateSubscriptionUI();
    }
  } catch (error) {
    console.error('プッシュ通知解除エラー:', error);
  }
}

// 購読状態に応じてUIを更新
function updateSubscriptionUI() {
  const subscribeButton = document.getElementById('push-subscribe-button');
  
  if (subscribeButton) {
    if (isSubscribed) {
      subscribeButton.textContent = '通知をオフにする';
      subscribeButton.classList.remove('btn-primary');
      subscribeButton.classList.add('btn-secondary');
    } else {
      subscribeButton.textContent = '通知をオンにする';
      subscribeButton.classList.remove('btn-secondary');
      subscribeButton.classList.add('btn-primary');
    }
  }
}

// 通知メッセージを表示
function showNotificationMessage(title, message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'notification-message';
  messageDiv.innerHTML = `
    <div class="notification-message-content">
      <strong>${title}</strong>
      <p>${message}</p>
    </div>
  `;
  
  document.body.appendChild(messageDiv);
  
  setTimeout(() => {
    messageDiv.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    messageDiv.classList.remove('show');
    setTimeout(() => {
      messageDiv.remove();
    }, 300);
  }, 3000);
}

// ページ読み込み時に購読状態を確認
if (isPushNotificationSupported()) {
  window.addEventListener('load', () => {
    setTimeout(checkSubscription, 1000);
  });
}

// エクスポート
window.pushNotification = {
  subscribe: subscribeToPush,
  unsubscribe: unsubscribeFromPush,
  isSupported: isPushNotificationSupported,
  checkSubscription: checkSubscription
};
