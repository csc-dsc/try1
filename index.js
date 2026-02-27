// 主题切换功能
class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    init() {
        // 设置初始主题
        this.setTheme(this.currentTheme);
        
        // 添加点击事件
        this.themeToggle.addEventListener('click', () => {
            this.toggleTheme();
        });
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        // 更新按钮图标
        const sunIcon = document.querySelector('.sun-icon');
        const moonIcon = document.querySelector('.moon-icon');
        
        if (theme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'inline';
        } else {
            sunIcon.style.display = 'inline';
            moonIcon.style.display = 'none';
        }
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.currentTheme = newTheme;
        this.setTheme(newTheme);
        
        // 添加切换动画
        this.themeToggle.style.transform = 'rotate(180deg)';
        setTimeout(() => {
            this.themeToggle.style.transform = '';
        }, 300);
    }
}

// 移动端菜单控制
class MobileMenu {
    constructor() {
        this.menuBtn = document.querySelector('.mobile-menu-btn');
        this.mobileMenu = document.querySelector('.mobile-menu');
        this.init();
    }

    init() {
        this.menuBtn.addEventListener('click', () => {
            this.toggleMenu();
        });

        // 点击菜单项关闭菜单
        document.querySelectorAll('.mobile-menu a').forEach(link => {
            link.addEventListener('click', () => {
                this.closeMenu();
            });
        });

        // 点击其他地方关闭菜单
        document.addEventListener('click', (e) => {
            if (!this.mobileMenu.contains(e.target) && 
                !this.menuBtn.contains(e.target) && 
                this.mobileMenu.classList.contains('active')) {
                this.closeMenu();
            }
        });
    }

    toggleMenu() {
        this.mobileMenu.classList.toggle('active');
        this.animateMenuBtn();
    }

    closeMenu() {
        this.mobileMenu.classList.remove('active');
        this.resetMenuBtn();
    }

    animateMenuBtn() {
        const spans = this.menuBtn.querySelectorAll('span');
        if (this.mobileMenu.classList.contains('active')) {
            spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            spans[1].style.opacity = '0';
            spans[2].style.transform = 'rotate(-45deg) translate(7px, -6px)';
        } else {
            this.resetMenuBtn();
        }
    }

    resetMenuBtn() {
        const spans = this.menuBtn.querySelectorAll('span');
        spans.forEach(span => {
            span.style.transform = '';
            span.style.opacity = '';
        });
    }
}

// 返回顶部功能
class BackToTop {
    constructor() {
        this.button = document.getElementById('back-to-top');
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => {
            this.toggleButton();
        });

        this.button.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    toggleButton() {
        if (window.scrollY > 300) {
            this.button.style.display = 'flex';
            setTimeout(() => {
                this.button.style.opacity = '1';
            }, 10);
        } else {
            this.button.style.opacity = '0';
            setTimeout(() => {
                this.button.style.display = 'none';
            }, 300);
        }
    }
}

// 平滑滚动
class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        // 监听所有锚点链接的点击
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                
                if (href === '#') return;
                
                e.preventDefault();
                this.scrollToSection(href);
            });
        });
    }

    scrollToSection(selector) {
        const target = document.querySelector(selector);
        if (target) {
            const offset = 80; // 导航栏高度
            const targetPosition = target.offsetTop - offset;
            
            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    }
}

// 页面加载动画
class PageAnimations {
    constructor() {
        this.init();
    }

    init() {
        // 设置当前年份
        document.getElementById('current-year').textContent = new Date().getFullYear();
        
        // 延迟加载动画
        setTimeout(() => {
            this.animateElements();
        }, 100);
    }

    animateElements() {
        // 头像动画
        const avatar = document.getElementById('avatar-img');
        if (avatar) {
            avatar.style.opacity = '0';
            avatar.style.transform = 'scale(0.8)';
            
            setTimeout(() => {
                avatar.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                avatar.style.opacity = '1';
                avatar.style.transform = 'scale(1)';
            }, 300);
        }

        // 卡片入场动画
        const cards = document.querySelectorAll('.blog-card, .friend-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + index * 100);
        });
    }
}

// 搜索功能（如果需要的话）
class SearchFunction {
    constructor() {
        this.searchInput = document.createElement('input');
        this.init();
    }

    init() {
        // 可以在这里添加搜索框，如果需要的话
        this.addSearchBox();
        this.addKeyboardShortcut();
    }

    addSearchBox() {
        // 创建搜索框
        this.searchInput.type = 'search';
        this.searchInput.placeholder = '搜索文章... (按 / 聚焦)';
        this.searchInput.className = 'search-input';
        
        // 添加到页面
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.appendChild(this.searchInput);
        
        const header = document.querySelector('header');
        if (header) {
            header.appendChild(searchContainer);
        }
    }

    addKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // 按 / 键聚焦搜索框
            if (e.key === '/' && !(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
                e.preventDefault();
                this.searchInput.focus();
            }
            
            // 按 ESC 键取消聚焦
            if (e.key === 'Escape') {
                this.searchInput.blur();
            }
        });
    }
}

// 图片懒加载
class LazyLoadImages {
    constructor() {
        this.init();
    }

    init() {
        if ('IntersectionObserver' in window) {
            this.lazyLoadWithObserver();
        } else {
            this.lazyLoadFallback();
        }
    }

    lazyLoadWithObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    this.loadImage(img);
                    observer.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            observer.observe(img);
        });
    }

    lazyLoadFallback() {
        document.querySelectorAll('img[data-src]').forEach(img => {
            this.loadImage(img);
        });
    }

    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
        }
    }
}

// 应用初始化
document.addEventListener('DOMContentLoaded', () => {
    // 初始化所有功能
    new ThemeManager();
    new MobileMenu();
    new BackToTop();
    new SmoothScroll();
    new PageAnimations();
    new LazyLoadImages();
    
    // 如果需要搜索功能，取消下面的注释
    // new SearchFunction();
});

// 页面可见性变化处理
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // 页面重新可见时的处理
        console.log('页面重新可见');
    }
});