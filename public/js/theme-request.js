// テーマリクエストページのJavaScript

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('themeRequestForm');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const successMessage = document.getElementById('successMessage');
  const errorMessage = document.getElementById('errorMessage');
  const errorText = document.getElementById('errorText');
  const closedNotice = document.getElementById('closedNotice');
  
  let currentStep = 1;
  const totalSteps = 4;
  
  // サブカテゴリーの定義
  const subCategories = {
    '気分転換': [
      { value: 'リフレッシュ', label: '頭をスッキリさせたい', desc: '気持ちを切り替えたい時に' },
      { value: 'ストレス発散', label: 'ストレスを発散したい', desc: 'イライラやモヤモヤを解消' },
      { value: '元気を出す', label: '落ち込んだ時に元気になりたい', desc: '前向きな気持ちになれる曲' },
      { value: 'リラックス', label: 'とにかくリラックスしたい', desc: '心を落ち着かせたい時に' }
    ],
    '作業中': [
      { value: '集中作業', label: '集中して作業したい', desc: '邪魔にならない程度のBGM' },
      { value: 'クリエイティブ', label: '創作活動のお供に', desc: 'インスピレーションを刺激' },
      { value: '単純作業', label: '単調な作業を楽しく', desc: 'テンポの良い曲で作業効率UP' },
      { value: '勉強', label: '勉強・読書中に', desc: '集中力を維持したい' }
    ],
    '移動中': [
      { value: 'ドライブ', label: 'ドライブを楽しく', desc: '長距離運転のお供に' },
      { value: '通勤通学', label: '通勤・通学中に', desc: '日々の移動時間を充実させる' },
      { value: '散歩', label: '散歩・ウォーキング中', desc: 'リズムよく歩ける曲' },
      { value: '旅行', label: '旅行気分を盛り上げる', desc: 'ワクワクする冒険気分' }
    ],
    '思い出': [
      { value: '学生時代', label: '学生時代を思い出す', desc: '青春の1ページ' },
      { value: '恋愛', label: '過去の恋愛を振り返る', desc: '甘酸っぱい思い出' },
      { value: '懐かしい', label: '子供の頃を思い出す', desc: '純粋だった頃の記憶' },
      { value: '特別な日', label: '特別な日の思い出', desc: '忘れられない瞬間' }
    ],
    '特定の感情': [
      { value: '嬉しい', label: '嬉しい・幸せな気分', desc: '喜びを表現したい' },
      { value: '切ない', label: '切ない・寂しい気持ち', desc: '涙が出そうな時に' },
      { value: '怒り', label: '怒り・悔しさをぶつける', desc: 'この気持ちをどうにかしたい' },
      { value: '感謝', label: '感謝の気持ちを込めて', desc: '大切な人への思い' },
      { value: '希望', label: '希望・夢を持ちたい', desc: '未来に向かって前進' }
    ],
    '季節・イベント': [
      { value: '春', label: '春の訪れを感じる', desc: '新生活・出会いの季節' },
      { value: '夏', label: '夏の暑さを楽しむ', desc: '海・祭り・青春の夏' },
      { value: '秋', label: '秋の物憂げな雰囲気', desc: '紅葉・夕暮れ・センチメンタル' },
      { value: '冬', label: '冬の寒さと温もり', desc: 'クリスマス・年末・雪景色' },
      { value: 'イベント', label: '特定のイベント', desc: '誕生日・記念日など' }
    ]
  };
  
  // 受付状態をチェック
  async function checkRequestStatus() {
    try {
      const response = await fetch('/api/settings/request-status');
      const data = await response.json();
      
      if (data.status === '0') {
        closedNotice.style.display = 'flex';
        form.style.opacity = '0.5';
        form.style.pointerEvents = 'none';
      }
    } catch (error) {
      console.error('受付状態確認エラー:', error);
    }
  }
  
  // ステップを表示
  function showStep(step) {
    for (let i = 1; i <= totalSteps; i++) {
      const stepEl = document.getElementById(`step${i}`);
      if (stepEl) {
        stepEl.style.display = i === step ? 'block' : 'none';
      }
    }
    
    // ボタンの表示制御
    prevBtn.style.display = step > 1 ? 'inline-block' : 'none';
    nextBtn.style.display = step < totalSteps ? 'inline-block' : 'none';
    submitBtn.style.display = step === totalSteps ? 'inline-block' : 'none';
    
    // スクロールをトップに
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  
  // サブカテゴリーを生成
  function generateSubCategories(mainCategory) {
    const container = document.getElementById('subCategoryContainer');
    const items = subCategories[mainCategory] || [];
    
    container.innerHTML = items.map(item => `
      <label class="subcategory-item">
        <input type="radio" name="subCategory" value="${item.value}" required>
        <div class="subcategory-content">
          <div class="subcategory-label">${item.label}</div>
          <div class="subcategory-desc">${item.desc}</div>
        </div>
      </label>
    `).join('');
  }
  
  // テーマサマリーを更新
  function updateThemeSummary() {
    const mainCategory = document.querySelector('input[name="mainCategory"]:checked')?.value;
    const subCategory = document.querySelector('input[name="subCategory"]:checked')?.value;
    const mood = document.querySelector('input[name="mood"]:checked')?.value;
    
    const summaryContent = document.querySelector('.summary-content');
    summaryContent.innerHTML = `
      <div class="summary-item">
        <strong>シチュエーション:</strong> ${mainCategory} → ${subCategory}
      </div>
      <div class="summary-item">
        <strong>曲の雰囲気:</strong> ${mood}
      </div>
      <div class="summary-hint">
        💡 このテーマにぴったりな曲を選んでください
      </div>
    `;
  }
  
  // メインカテゴリー変更時
  document.querySelectorAll('input[name="mainCategory"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      generateSubCategories(e.target.value);
    });
  });
  
  // 次へボタン
  nextBtn.addEventListener('click', () => {
    const currentStepEl = document.getElementById(`step${currentStep}`);
    const inputs = currentStepEl.querySelectorAll('input[required], select[required], textarea[required]');
    
    let isValid = true;
    inputs.forEach(input => {
      if (input.type === 'radio') {
        const radioGroup = currentStepEl.querySelectorAll(`input[name="${input.name}"]`);
        const checked = Array.from(radioGroup).some(r => r.checked);
        if (!checked) isValid = false;
      } else if (!input.value.trim()) {
        isValid = false;
      }
    });
    
    if (!isValid) {
      alert('必須項目を入力してください');
      return;
    }
    
    if (currentStep < totalSteps) {
      currentStep++;
      showStep(currentStep);
      
      if (currentStep === 4) {
        updateThemeSummary();
      }
    }
  });
  
  // 前へボタン
  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  });
  
  // 文字数カウント
  const reasonInput = document.getElementById('themeReason');
  const reasonCharCount = document.getElementById('reasonCharCount');
  
  reasonInput.addEventListener('input', () => {
    const length = reasonInput.value.length;
    reasonCharCount.textContent = length;
    
    if (length > 300) {
      reasonCharCount.style.color = 'var(--error-color)';
    } else {
      reasonCharCount.style.color = 'var(--text-light)';
    }
  });
  
  // CAPTCHA読み込み
  async function loadCaptcha() {
    try {
      const response = await fetch('/api/captcha');
      const data = await response.json();
      document.getElementById('captchaQuestion').textContent = data.question;
    } catch (error) {
      console.error('CAPTCHA読み込みエラー:', error);
    }
  }
  
  // CAPTCHA更新
  document.getElementById('refreshCaptcha').addEventListener('click', () => {
    loadCaptcha();
    document.getElementById('captcha').value = '';
  });
  
  // フォーム送信
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';
    
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';
    
    const formData = {
      song_name: document.getElementById('songName').value.trim(),
      artist_name: document.getElementById('artistName').value.trim(),
      nickname: document.getElementById('nickname').value.trim(),
      captcha: document.getElementById('captcha').value.trim(),
      theme_request: true,
      theme_main_category: document.querySelector('input[name="mainCategory"]:checked').value,
      theme_sub_category: document.querySelector('input[name="subCategory"]:checked').value,
      theme_mood: document.querySelector('input[name="mood"]:checked').value,
      theme_reason: reasonInput.value.trim()
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
        successMessage.style.display = 'flex';
        form.reset();
        currentStep = 1;
        showStep(1);
        reasonCharCount.textContent = '0';
        loadCaptcha();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
          successMessage.style.display = 'none';
        }, 5000);
      } else {
        errorText.textContent = data.error || 'リクエストの送信に失敗しました';
        errorMessage.style.display = 'flex';
        loadCaptcha();
        document.getElementById('captcha').value = '';
      }
    } catch (error) {
      console.error('送信エラー:', error);
      errorText.textContent = 'ネットワークエラーが発生しました';
      errorMessage.style.display = 'flex';
      loadCaptcha();
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'リクエストを送信';
    }
  });
  
  // 初期化
  checkRequestStatus();
  loadCaptcha();
  showStep(1);
});
