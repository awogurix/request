// モバイルメニュートグル機能
document.addEventListener('DOMContentLoaded', () => {
  console.log('Menu script loaded');
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  const menuOverlay = document.getElementById('menuOverlay');

  console.log('menuToggle:', menuToggle);
  console.log('mainNav:', mainNav);
  console.log('menuOverlay:', menuOverlay);

  if (menuToggle && mainNav && menuOverlay) {
    console.log('All elements found, attaching event listeners');
    menuToggle.addEventListener('click', (e) => {
      console.log('Menu toggle clicked!');
      e.preventDefault();
      menuToggle.classList.toggle('active');
      mainNav.classList.toggle('active');
      menuOverlay.classList.toggle('active');
      document.body.style.overflow = mainNav.classList.contains('active') ? 'hidden' : '';
      console.log('Menu state:', mainNav.classList.contains('active') ? 'open' : 'closed');
    });

    menuOverlay.addEventListener('click', () => {
      menuToggle.classList.remove('active');
      mainNav.classList.remove('active');
      menuOverlay.classList.remove('active');
      document.body.style.overflow = '';
    });

    // ナビゲーションリンククリック時にメニューを閉じる
    const navLinks = mainNav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        mainNav.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }
});
