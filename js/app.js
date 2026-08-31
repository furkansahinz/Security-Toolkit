/**
 * Security Toolkit - Main Application
 * 
 * Bu dosya üç ayrı tool'u koordine eder:
 * - Request Analyzer (request-analyzer.js)
 * - Encoding Inspector (encoding-inspector.js)
 * - Message Header Analyzer (message-header-analyzer.js)
 */

/**
 * Sayfa yüklendiğinde tüm tool'ları başlat
 */
document.addEventListener('DOMContentLoaded', () => {
    // Desktop gate kontrolü
    initDesktopGate();

    // Theme toggle
    initThemeToggle();

    // Splash ekranı göster
    initSplash();

    // Sidebar navigation
    initSidebar();

    // Request Analyzer'ı başlat
    initRequestAnalyzer();

    // Navigation sistemini başlat (top nav için)
    initNavigation();

    // Encoding Inspector'ı başlat
    initEncodingInspector();

    // Message Header Analyzer'ı başlat
    initMessageHeaderAnalyzer();
    initEventIdLookup();

    // New tools
    initLinkBuilder();
    initDefangRefang();
    initDuplicateDelete();
    initEmailScope();
    initMailAutomation();
    initCaseNotes();
    initTodoList();
    initSubnetCalculator();
    initPano();
    initHomeActions();
    initKeyboardShortcuts();
});

/**
 * Theme Toggle - Dark/Light Mode
 */
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    const THEME_KEY = 'stkV3_theme';

    // Toggle click
    toggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
        localStorage.setItem(THEME_KEY, newTheme);
    });

    // Initial theme is already applied by inline script
    // Just update aria-pressed
    const currentTheme = document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light';
    toggleBtn.setAttribute('aria-pressed', currentTheme === 'dark' ? 'true' : 'false');
}

/**
 * Apply theme
 */
function applyTheme(theme) {
    const root = document.documentElement;
    const toggleBtn = document.getElementById('theme-toggle');

    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add('theme-' + theme);

    if (toggleBtn) {
        toggleBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
}

/**
 * Get initial theme
 */
function getInitialTheme() {
    const stored = localStorage.getItem('stkV3_theme');
    if (stored) {
        return stored;
    }

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }

    return 'light';
}

/**
 * Desktop Gate - minimum genişlik kontrolü
 */
function initDesktopGate() {
    const desktopGate = document.getElementById('desktop-gate');
    const retryBtn = document.getElementById('desktop-gate-retry');
    const MIN_WIDTH = 1200;

    function checkWidth() {
        if (window.innerWidth < MIN_WIDTH) {
            desktopGate.style.display = 'flex';
            return false;
        } else {
            desktopGate.style.display = 'none';
            return true;
        }
    }

    // İlk kontrol
    checkWidth();

    // Resize event
    window.addEventListener('resize', checkWidth);

    // Retry butonu
    retryBtn.addEventListener('click', () => {
        if (checkWidth()) {
            // Başarılı, devam et
        } else {
            alert('Pencere hala 1200px\'den küçük. Lütfen pencereyi genişletin.');
        }
    });

    // Export checkWidth for navigation use
    window.checkDesktopWidth = checkWidth;
}

/**
 * Splash ekranı
 */
function initSplash() {
    const splash = document.getElementById('splash');
    const skipIntro = document.getElementById('skip-intro');
    const SPLASH_SEEN_KEY = 'stkV3_splash_seen';

    // ÖNEMLI: Her sayfa yenilenişinde splash'ı temizle (test için)
    // Production'da bu satırı kaldırarak session'da saklamayı aktif edebilirsiniz
    sessionStorage.removeItem(SPLASH_SEEN_KEY);

    // Session storage kontrolü
    if (sessionStorage.getItem(SPLASH_SEEN_KEY)) {
        // Daha önce görüldü, direkt home göster
        splash.style.display = 'none';
        showTool('home');
        return;
    }

    // Splash'ı göster
    splash.style.display = 'flex';

    // 2.6 saniye sonra otomatik geçiş
    setTimeout(() => {
        hideSplash();
    }, 2600);

    // Skip intro
    skipIntro.addEventListener('click', (e) => {
        e.preventDefault();
        hideSplash();
    });

    function hideSplash() {
        sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
        splash.style.opacity = '0';
        splash.style.transform = 'translateY(-20px)';
        splash.style.transition = 'all 0.6s ease';

        // Animasyon bitsin diye bekle
        setTimeout(() => {
            splash.style.display = 'none';
            showTool('home');
        }, 600);
    }
}

/**
 * Tool ekranları arası geçiş
 */
function showTool(toolId) {
    // Desktop kontrolü
    if (window.checkDesktopWidth && !window.checkDesktopWidth()) {
        return;
    }

    // Tüm ekranları gizle
    document.querySelectorAll('.tool-screen').forEach(screen => {
        screen.style.display = 'none';
        screen.classList.remove('active');
    });

    // Seçili ekranı göster (with animation)
    const targetScreen = document.getElementById('tool-' + toolId);
    if (targetScreen) {
        targetScreen.style.display = 'block';
        // Trigger reflow for animation
        void targetScreen.offsetWidth;
        targetScreen.classList.add('active');
    }

    // Sidebar butonlarını güncelle
    document.querySelectorAll('.sidebar-item').forEach(btn => {
        btn.classList.remove('active');
    });

    const sidebarBtn = document.querySelector(`.sidebar-item[data-tool="${toolId}"]`);
    if (sidebarBtn) {
        sidebarBtn.classList.add('active');
    }

    // Scroll to top
    window.scrollTo(0, 0);
}

/**
 * Home kartları
 */
function initHomeActions() {
    document.querySelectorAll('.home-tool-card').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const el = e.currentTarget;
            const externalUrl = el.getAttribute('data-external-url');
            if (externalUrl) {
                const url = new URL(externalUrl, window.location.href);
                window.open(url.href, '_blank', 'noopener,noreferrer');
                return;
            }
            const tool = el.getAttribute('data-tool');
            if (tool) {
                showTool(tool);
            }
        });
    });
}

/**
 * Keyboard shortcuts
 */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            return;
        }
        const isInputFocused = e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT';
        if (e.key.toLowerCase() === 'h') {
            if (isInputFocused) return;
            e.preventDefault();
            showTool('home');
        }
    });
}

/**
 * Sidebar navigation
 */
function initSidebar() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const sidebarSearch = document.getElementById('sidebar-search');

    // Sidebar item clicks
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            const externalUrl = item.getAttribute('data-external-url');
            if (externalUrl) {
                const url = new URL(externalUrl, window.location.href);
                window.open(url.href, '_blank', 'noopener,noreferrer');
                return;
            }
            const tool = item.getAttribute('data-tool');
            if (tool) {
                showTool(tool);

                // Update sidebar active state
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });

    // Sidebar search filter
    if (sidebarSearch) {
        sidebarSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            sidebarItems.forEach(item => {
                const label = item.querySelector('.sidebar-label')?.textContent.toLowerCase() || '';
                const icon = item.querySelector('.sidebar-icon')?.textContent || '';
                const matches = label.includes(searchTerm) || icon.includes(searchTerm);
                item.style.display = matches ? '' : 'none';
            });
        });
    }
}
