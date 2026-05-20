const html = document.documentElement;
const toggle = document.querySelector('[data-theme-toggle]');
const lightLabel = toggle?.dataset.themeLabelLight ?? '라이트 모드로 전환';
const darkLabel = toggle?.dataset.themeLabelDark ?? '다크 모드로 전환';

function applyTheme(theme) {
    html.dataset.theme = theme;
    localStorage.setItem('cdg-theme', theme);
    if (!toggle) return;
    toggle.setAttribute('aria-label', theme === 'dark' ? lightLabel : darkLabel);
    toggle.dataset.themeState = theme;
}

if (toggle) {
    applyTheme(html.dataset.theme || 'light');
    toggle.addEventListener('click', () => {
        applyTheme(html.dataset.theme === 'dark' ? 'light' : 'dark');
    });
}
