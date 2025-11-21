// テーマ募集ページのJavaScript

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('themeRequestForm');
  const submitBtn = document.getElementById('submitBtn');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  
  // テーマ募集は常時受付中のため、受付状態チェックは不要
  // CAPTCHAは削除されました
  
  // フォーム送信
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
    
    const formData = {
      theme_title: document.getElementById('themeTitle').value.trim(),
      nickname: document.getElementById('nickname').value.trim()
    };
    
    try {
      const response = await fetch('/api/theme-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        successMessage.style.display = 'flex';
        form.reset();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 5000);
      } else {
        errorText.textContent = data.error || 'テーマの送信に失敗しました';
        errorMessage.style.display = 'flex';
      }
    } catch (error) {
      console.error('送信エラー:', error);
      errorText.textContent = 'ネットワークエラーが発生しました';
      errorMessage.style.display = 'flex';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'テーマを送信する';
    }
  });
  
  // 初期化完了
});
