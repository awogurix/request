// フィードバックページのJavaScript

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('feedbackForm');
  const submitBtn = document.getElementById('submitBtn');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  const contentInput = document.getElementById('feedbackContent');
  const contentCharCount = document.getElementById('contentCharCount');
  
  // 文字数カウント
  contentInput.addEventListener('input', () => {
    const length = contentInput.value.length;
    contentCharCount.textContent = length;
    
    if (length > 1000) {
      contentCharCount.style.color = 'var(--error-color)';
    } else {
      contentCharCount.style.color = 'var(--text-light)';
    }
  });
  
  // フォーム送信
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
    
    const formData = {
      feedback_type: document.getElementById('feedbackType').value,
      content: contentInput.value.trim(),
      nickname: document.getElementById('nickname').value.trim() || '匿名'
    };
    
    try {
      const response = await fetch('/api/feedback', {
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
        contentCharCount.textContent = '0';
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 5000);
      } else {
        errorText.textContent = data.error || 'フィードバックの送信に失敗しました';
        errorMessage.style.display = 'flex';
      }
    } catch (error) {
      console.error('送信エラー:', error);
      errorText.textContent = 'ネットワークエラーが発生しました';
      errorMessage.style.display = 'flex';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'フィードバックを送信';
    }
  });
});
