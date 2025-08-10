// /js/wallet-bridge.js - Improved version with robust error handling

class WalletBridge {
    constructor() {
        this.apiBase = '/telebook/api/';
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.isLoading = false;
        
        console.log('💳 Wallet Bridge FIXED - Enhanced version loaded');
        this.init();
    }
    
    async makeRequest(endpoint, options = {}) {
        const url = this.apiBase + endpoint;
        
        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                console.log(`🔄 API Request (attempt ${attempt}): ${url}`);
                
                const response = await fetch(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    ...options
                });
                
                // Check if response is ok
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const text = await response.text();
                    console.error('❌ Non-JSON response:', text);
                    throw new Error('Server returned non-JSON response');
                }
                
                const data = await response.json();
                console.log(`✅ API Success (attempt ${attempt}):`, data);
                return data;
                
            } catch (error) {
                console.error(`❌ API Error (attempt ${attempt}):`, error);
                
                if (attempt === this.retryAttempts) {
                    throw error;
                } else {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
                }
            }
        }
    }
    
    async testConnection() {
        try {
            const result = await this.makeRequest('profile-data.php?test=1');
            console.log('✅ Wallet API connection test passed:', result);
            return true;
        } catch (error) {
            console.error('❌ Wallet API connection test failed:', error);
            return false;
        }
    }
    
    async loadData(user = null) {
        if (this.isLoading) {
            console.log('⏳ Load already in progress, skipping...');
            return;
        }
        
        this.isLoading = true;
        console.log('[Wallet-Bridge-Fixed] 📡 Loading profile data for wallet...', user);
        
        try {
            let profileData;
            
            if (user && user.telegram_id) {
                // Try to get fresh data from API
                profileData = await this.makeRequest('profile-data.php', {
                    method: 'POST',
                    body: JSON.stringify({
                        telegram_id: user.telegram_id,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        username: user.username
                    })
                });
            } else {
                // Fallback to GET request
                profileData = await this.makeRequest('profile-data.php');
            }
            
            if (profileData && profileData.ok && profileData.data) {
                console.log('✅ Profile data loaded successfully:', profileData.data);
                this.updateWalletUI(profileData.data);
                return profileData.data;
            } else {
                throw new Error('Invalid profile data response');
            }
            
        } catch (error) {
            console.error('❌ Failed to load profile data:', error);
            
            // Show error to user
            if (window.showTelebookNotification) {
                window.showTelebookNotification(`❌ Lỗi tải dữ liệu: ${error.message}`, 'error');
            }
            
            // Try to use cached user data as fallback
            if (user) {
                console.log('📋 Using cached user data as fallback');
                this.updateWalletUI(user);
                return user;
            }
            
            throw error;
        } finally {
            this.isLoading = false;
        }
    }
    
    updateWalletUI(userData) {
        console.log('🎨 Updating wallet UI with data:', userData);
        
        // Update balance displays
        const balanceElements = document.querySelectorAll('[id*="balance"], .balance-display, .wallet-balance');
        balanceElements.forEach(el => {
            if (el && userData.balance !== undefined) {
                const formattedBalance = new Intl.NumberFormat('vi-VN', {
                    style: 'currency',
                    currency: 'VND'
                }).format(userData.balance);
                
                el.textContent = formattedBalance;
                console.log('💰 Updated balance element:', el, formattedBalance);
            }
        });
        
        // Update user name displays
        const userElements = document.querySelectorAll('.user-name, .user-info, .username-display');
        userElements.forEach(el => {
            if (el) {
                el.textContent = userData.full_name || `${userData.first_name} ${userData.last_name || ''}`.trim();
            }
        });
        
        // Hide auth screens, show wallet content
        const authElements = document.querySelectorAll('.wallet-auth, .telegram-auth, .auth-required');
        authElements.forEach(el => {
            if (el) {
                el.style.display = userData.telegram_id ? 'none' : 'block';
            }
        });
        
        const walletContent = document.querySelectorAll('.wallet-content, .authenticated-content');
        walletContent.forEach(el => {
            if (el) {
                el.style.display = userData.telegram_id ? 'block' : 'none';
            }
        });
    }
    
    async init() {
        console.log('[Wallet-Bridge-Fixed] 🚀 Initializing Enhanced Wallet Bridge...');
        
        // Test API connection first
        const apiWorking = await this.testConnection();
        if (!apiWorking) {
            console.warn('⚠️ API not working, wallet will run in limited mode');
            return;
        }
        
        // Set up observers
        this.setupObservers();
        
        // Load initial data if user is authenticated
        const user = window.telebookTelegram?.getUser();
        if (user && window.telebookTelegram?.isAuthenticated()) {
            await this.loadData(user);
        }
        
        console.log('[Wallet-Bridge-Fixed] ✅ Enhanced Wallet Bridge initialized');
    }
    
    setupObservers() {
        // Observe for wallet tab changes
        const observer = new MutationObserver(() => {
            if (window.location.hash.includes('wallet') || 
                document.querySelector('.wallet-container, .wallet-tab.active')) {
                
                const user = window.telebookTelegram?.getUser();
                if (user) {
                    this.loadData(user);
                }
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        
        console.log('[Wallet-Bridge-Fixed] 👁️ Wallet observer attached');
    }
}

// Initialize wallet bridge
window.walletBridge = new WalletBridge();

// Global function for compatibility
window.loadPhpProfileData = async function(user) {
    return await window.walletBridge.loadData(user);
};

console.log('[Wallet-Bridge-Fixed] 📦 Enhanced Wallet Bridge module loaded');