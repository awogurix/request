// PNG形式のアイコンを生成
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// SVG文字列（シンプルなラジオアイコン）
const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 背景 -->
  <rect width="512" height="512" fill="url(#grad)" rx="100"/>
  
  <!-- ラジオアイコン -->
  <g transform="translate(256,256)">
    <!-- 電波マーク左 -->
    <path d="M -150,-100 Q -150,-150 -100,-150" stroke="white" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M -120,-80 Q -120,-110 -90,-110" stroke="white" stroke-width="20" fill="none" stroke-linecap="round"/>
    
    <!-- 電波マーク右 -->
    <path d="M 150,-100 Q 150,-150 100,-150" stroke="white" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M 120,-80 Q 120,-110 90,-110" stroke="white" stroke-width="20" fill="none" stroke-linecap="round"/>
    
    <!-- ラジオ本体 -->
    <rect x="-130" y="-40" width="260" height="160" rx="20" fill="white" opacity="0.95"/>
    
    <!-- アンテナ -->
    <line x1="-90" y1="-40" x2="-120" y2="-120" stroke="white" stroke-width="15" stroke-linecap="round"/>
    <circle cx="-120" cy="-120" r="10" fill="white"/>
    
    <!-- スピーカー -->
    <circle cx="-60" cy="30" r="35" fill="#667eea" opacity="0.3"/>
    <circle cx="-60" cy="30" r="25" fill="#667eea" opacity="0.3"/>
    <circle cx="-60" cy="30" r="15" fill="#667eea"/>
    
    <!-- ディスプレイ -->
    <rect x="10" y="-10" width="100" height="40" rx="5" fill="#667eea" opacity="0.8"/>
    <line x1="25" y1="5" x2="45" y2="5" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <line x1="55" y1="5" x2="75" y2="5" stroke="white" stroke-width="3" stroke-linecap="round"/>
    <line x1="85" y1="5" x2="95" y2="5" stroke="white" stroke-width="3" stroke-linecap="round"/>
    
    <!-- ダイヤル -->
    <circle cx="60" cy="70" r="30" fill="#764ba2" opacity="0.6"/>
    <circle cx="60" cy="70" r="20" fill="#764ba2"/>
    <line x1="60" y1="70" x2="60" y2="55" stroke="white" stroke-width="4" stroke-linecap="round"/>
  </g>
  
  <!-- 音符 -->
  <g transform="translate(380,130)" fill="white" opacity="0.7">
    <ellipse cx="0" cy="25" rx="12" ry="10" transform="rotate(-20)"/>
    <rect x="-2" y="-15" width="4" height="40" rx="2"/>
    <path d="M 2,-15 Q 15,-15 15,0" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
  </g>
</svg>
`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

async function generateIcons() {
  console.log('PNG形式のアイコンを生成中...');
  
  for (const size of sizes) {
    try {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(Buffer.from(svgIcon))
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ icon-${size}x${size}.png を生成しました`);
    } catch (error) {
      console.error(`✗ icon-${size}x${size}.png の生成に失敗:`, error.message);
    }
  }
  
  console.log('\n全てのPNGアイコンを生成しました！');
}

generateIcons().catch(console.error);
