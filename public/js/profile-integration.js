// profile-integration.js - Replace demo data with real API data

class ProfileIntegration {
    constructor() {
        this.apiBaseURL = '/api';
        this.currentUser = null;
        this.debug = true;
        this.init();
    }

    log(message, data = null) {
        if (this.debug) {
            console.log(`[ProfileIntegration] ${message}`, data || '');
        }
    }

    async init() {
        this.log('🚀 Profile Integration initialized');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.start());
        } else {
            this.start();
        }
    }

    async start() {
        this.log('▶️ Starting profile integration...');
        
        // Load user data
        await this.loadUserData();
        
        // Start replacing demo data
        this.replaceProfileData();
        
        // Monitor for dynamic content
        this.observeChanges();
    }

    async loadUserData() {
        try {
            // Try to get user ID from various sources
            const userId = this.getUserId();
            const telegramId = this.getTelegramId();
            
            this.log('📡 Loading user data...', { userId, telegramId });
            
            let url = `${this.apiBaseURL}/user-info.php`;
            const params = new URLSearchParams();
            
            if (userId) params.append('user_id', userId);
            if (telegramId) params.append('telegram_id', telegramId);
            
            if (params.toString()) {
                url += '?' + params.toString();
            }

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.success && data.user) {
                this.currentUser = data.user;
                this.log('✅ User data loaded successfully', this.currentUser);
                return true;
            } else {
                throw new Error(data.message || 'Failed to load user data');
            }
            
        } catch (error) {
            this.log('❌ Failed to load user data:', error);
            // Use fallback demo data
            this.currentUser = this.getFallbackUserData();
            return false;
        }
    }

    getUserId() {
        // Try to extract user ID from various sources
        const sources = [
            () => localStorage.getItem('userId'),
            () => sessionStorage.getItem('userId'),
            () => new URLSearchParams(window.location.search).get('user_id'),
            () => document.querySelector('[data-user-id]')?.dataset.userId,
            () => window.currentUserId,
            () => '123' // Default demo user
        ];

        for (const source of sources) {
            try {
                const id = source();
                if (id) return id;
            } catch (e) {
                // Ignore errors and try next source
            }
        }

        return null;
    }

    getTelegramId() {
        // Try to get Telegram ID from Telegram WebApp API
        const sources = [
            () => window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
            () => localStorage.getItem('telegramId'),
            () => sessionStorage.getItem('telegramId'),
            () => new URLSearchParams(window.location.search).get('telegram_id')
        ];

        for (const source of sources) {
            try {
                const id = source();
                if (id) return id;
            } catch (e) {
                // Ignore errors and try next source
            }
        }

        return null;
    }

    replaceProfileData() {
        if (!this.currentUser) {
            this.log('⚠️ No user data available for replacement');
            return;
        }

        this.log('🔄 Replacing profile data in UI...');
        
        // Replace user name
        this.replaceText([
            { selectors: ['.user-name', '.profile-name', '[data-user-name]'], value: this.currentUser.name },
            { selectors: ['.username', '.user-username', '[data-username]'], value: '@' + (this.currentUser.username || 'user') },
            { selectors: ['.user-balance', '.balance', '[data-balance]'], value: this.formatCurrency(this.currentUser.balance) },
            { selectors: ['.vip-level', '.user-vip', '[data-vip]'], value: this.currentUser.vip_level },
            { selectors: ['.referral-code', '[data-referral]'], value: this.currentUser.referral_code },
            { selectors: ['.total-bookings', '[data-bookings]'], value: this.currentUser.total_bookings.toString() },
            { selectors: ['.total-spent', '[data-spent]'], value: this.formatCurrency(this.currentUser.total_spent) },
            { selectors: ['.member-since', '[data-member-since]'], value: this.formatDate(this.currentUser.member_since) }
        ]);

        // Replace avatar images
        this.replaceImages([
            { selectors: ['.user-avatar', '.profile-avatar', '[data-avatar]'], src: this.currentUser.avatar_url }
        ]);

        // Replace stats
        if (this.currentUser.stats) {
            this.replaceText([
                { selectors: ['.services-used', '[data-services-used]'], value: this.currentUser.stats.services_used.toString() },
                { selectors: ['.reviews-given', '[data-reviews]'], value: this.currentUser.stats.reviews_given.toString() },
                { selectors: ['.loyalty-points', '[data-points]'], value: this.currentUser.stats.loyalty_points.toString() }
            ]);
        }

        this.log('✅ Profile data replacement completed');
    }

    replaceText(replacements) {
        replacements.forEach(({ selectors, value }) => {
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element && value !== undefined) {
                        element.textContent = value;
                        element.dataset.profileUpdated = 'true';
                        this.log(`📝 Updated ${selector}: ${value}`);
                    }
                });
            });
        });
    }

    replaceImages(replacements) {
        replacements.forEach(({ selectors, src }) => {
            selectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element && src) {
                        if (element.tagName === 'IMG') {
                            element.src = src;
                        } else {
                            element.style.backgroundImage = `url(${src})`;
                        }
                        element.dataset.profileUpdated = 'true';
                        this.log(`🖼️ Updated ${selector} image`);
                    }
                });
            });
        });
    }

    observeChanges() {
        // Watch for new content being added to the page
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    // Check if any added nodes contain profile elements
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const hasProfileElements = node.querySelector && (
                                node.querySelector('.user-name, .profile-name, .user-balance, .balance') ||
                                node.classList.contains('user-name') ||
                                node.classList.contains('profile-name') ||
                                node.classList.contains('user-balance')
                            );
                            
                            if (hasProfileElements) {
                                shouldUpdate = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldUpdate) {
                this.log('🔄 New profile elements detected, updating...');
                setTimeout(() => this.replaceProfileData(), 100);
            }
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('vi-VN');
    }

    getFallbackUserData() {
        return {
            id: 1,
            name: 'Demo User',
            username: 'demo',
            balance: 1000000,
            vip_level: 'Basic',
            referral_code: 'DEMO123',
            total_bookings: 0,
            total_spent: 0,
            member_since: new Date().toISOString().split('T')[0],
            avatar_url: 'https://ui-avatars.com/api/?name=Demo+User&background=667eea&color=fff&size=200',
            stats: {
                services_used: 0,
                reviews_given: 0,
                loyalty_points: 0
            }
        };
    }

    // Public methods for manual updates
    async refreshUserData() {
        this.log('🔄 Manually refreshing user data...');
        await this.loadUserData();
        this.replaceProfileData();
    }

    getCurrentUser() {
        return this.currentUser;
    }

    setUserId(userId) {
        localStorage.setItem('userId', userId);
        this.refreshUserData();
    }
}

// Initialize profile integration
window.ProfileIntegration = new ProfileIntegration();

// Expose helper functions
window.refreshProfile = () => window.ProfileIntegration.refreshUserData();
window.setProfileUserId = (userId) => window.ProfileIntegration.setUserId(userId);
window.getCurrentUser = () => window.ProfileIntegration.getCurrentUser();