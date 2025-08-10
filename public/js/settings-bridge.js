// settings-bridge.js - Fixed version with proper null checks

(function() {
    'use strict';
    
    console.log('🔗 Settings Bridge loaded - Fixed version with null checks');
    
    let phpProfileData = null;
    
    // Configuration
    const CONFIG = {
        apiUrl: '/api/profile-data.php',
        updateInterval: 30000,
        debug: true
    };
    
    function log(message, data = null) {
        if (CONFIG.debug) {
            console.log(`[Settings-Bridge] ${message}`, data || '');
        }
    }
    
    // Safe element update with null checks
    function safeUpdateElement(selector, updateFn, description) {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements && elements.length > 0) {
                elements.forEach(el => {
                    if (el && typeof updateFn === 'function') {
                        updateFn(el);
                        el.setAttribute('data-php-updated', 'true');
                    }
                });
                log(`✅ ${description}: ${elements.length} elements updated`);
                return true;
            } else {
                log(`⚠️ ${description}: No elements found for selector "${selector}"`);
                return false;
            }
        } catch (error) {
            log(`❌ Error in ${description}:`, error);
            return false;
        }
    }
    
    // Load PHP profile data with better error handling
    async function loadPhpProfileData() {
        try {
            log('📡 Loading PHP profile data...');
            
            const response = await fetch(CONFIG.apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success && data.user) {
                phpProfileData = data.user;
                log('✅ PHP profile data loaded successfully:', {
                    username: phpProfileData.username,
                    balance: phpProfileData.balance,
                    vip_level: phpProfileData.vip_level
                });
                
                // Update all UI components safely
                updateTelegramSettingsSafely();
                updateWalletDataSafely();
                
                // Dispatch event
                window.dispatchEvent(new CustomEvent('phpProfileUpdated', {
                    detail: phpProfileData
                }));
                
                return true;
            } else {
                throw new Error(data.message || 'Invalid response from PHP system');
            }
            
        } catch (error) {
            log('❌ Failed to load PHP profile:', error);
            
            // Use fallback data to prevent crashes
            phpProfileData = {
                username: 'Demo User',
                balance: 1250000,
                balance_formatted: '1.250.000',
                vip_level: 'Basic',
                credit: 750,
                has_bank: false,
                avatar_url: 'https://ui-avatars.com/api/?name=Demo+User&background=667eea&color=fff&size=200'
            };
            
            log('⚠️ Using fallback data to prevent crashes');
            return false;
        }
    }
    
    // Safely update Telegram Settings UI
    function updateTelegramSettingsSafely() {
        if (!phpProfileData) {
            log('⚠️ No PHP profile data available for settings update');
            return;
        }
        
        log('🔄 Safely updating Telegram Settings with PHP data...');
        
        // Use timeout to ensure DOM is ready
        setTimeout(() => {
            try {
                // Update username/name elements
                safeUpdateElement(
                    '.profile-name, .user-name, [data-profile-name]',
                    (el) => {
                        if (el.textContent && !el.textContent.includes('@')) {
                            el.textContent = phpProfileData.username || phpProfileData.name || 'User';
                        }
                    },
                    'Username update'
                );
                
                // Update avatar elements
                safeUpdateElement(
                    '.profile-avatar img, .user-avatar, img[alt*="avatar"]',
                    (el) => {
                        if (phpProfileData.avatar_url) {
                            if (el.tagName === 'IMG') {
                                el.src = phpProfileData.avatar_url;
                                el.onerror = () => {
                                    el.src = 'https://ui-avatars.com/api/?name=' + 
                                             encodeURIComponent(phpProfileData.username || 'User') + 
                                             '&background=667eea&color=fff&size=200';
                                };
                            } else {
                                el.style.backgroundImage = `url(${phpProfileData.avatar_url})`;
                            }
                        }
                    },
                    'Avatar update'
                );
                
                // Update VIP status elements
                safeUpdateElement(
                    '.vip-status, .premium-status, [data-vip-level]',
                    (el) => {
                        if (phpProfileData.vip_level) {
                            el.textContent = phpProfileData.vip_level;
                        }
                    },
                    'VIP status update'
                );
                
            } catch (error) {
                log('❌ Error in updateTelegramSettingsSafely:', error);
            }
        }, 200);
    }
    
    // Safely update Wallet data
    function updateWalletDataSafely() {
        if (!phpProfileData) {
            log('⚠️ No PHP profile data available for wallet update');
            return;
        }
        
        log('💰 Safely updating wallet data...');
        
        try {
            // Store wallet data globally for other components
            window.phpWalletData = {
                balance: phpProfileData.balance || 0,
                balance_formatted: phpProfileData.balance_formatted || '0',
                username: phpProfileData.username || 'User',
                vip_level: phpProfileData.vip_level || 'Basic',
                credit: phpProfileData.credit || 0,
                has_bank: phpProfileData.has_bank || false,
                bank_info: phpProfileData.bank_info || null,
                address: phpProfileData.username || 'TG' + Date.now().toString(36).toUpperCase(),
                lastUpdated: Date.now()
            };
            
            // Update wallet preview card if it exists
            setTimeout(() => {
                const walletPreview = document.querySelector('.wallet-preview-card');
                if (walletPreview) {
                    try {
                        updateWalletPreviewCardSafely(walletPreview, window.phpWalletData);
                    } catch (error) {
                        log('❌ Error updating wallet preview card:', error);
                    }
                }
                
                // Update balance displays
                safeUpdateElement(
                    '.wallet-balance, .balance-display, [data-balance]',
                    (el) => {
                        const formattedBalance = formatCurrency(window.phpWalletData.balance);
                        el.textContent = formattedBalance;
                    },
                    'Balance display update'
                );
                
                // Update wallet row balance (this was causing the error)
                safeUpdateElement(
                    '.wallet-balance-text, .wallet-row .row-title-right',
                    (el) => {
                        const formattedBalance = formatCurrency(window.phpWalletData.balance);
                        el.textContent = formattedBalance;
                    },
                    'Wallet row balance update'
                );
                
            }, 300);
            
        } catch (error) {
            log('❌ Error in updateWalletDataSafely:', error);
        }
    }
    
    // Safely update wallet preview card
    function updateWalletPreviewCardSafely(card, walletData) {
        if (!card || !walletData) {
            log('⚠️ Missing card or wallet data for preview update');
            return;
        }
        
        try {
            const formattedBalance = formatCurrency(walletData.balance);
            const vipBadge = walletData.vip_level !== 'Basic' ? 
                `<div style="background: linear-gradient(45deg, #FFD700, #FFA500); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; margin-left: 8px;">VIP ${walletData.vip_level}</div>` : '';
            
            card.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 2;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <span style="font-size: 24px;">💰</span>
                            <div>
                                <div style="font-weight: 700; font-size: 18px; display: flex; align-items: center;">
                                    ${walletData.username || 'Telegram Wallet'}
                                    ${vipBadge}
                                </div>
                                <div style="font-size: 12px; opacity: 0.9;">ID: ${walletData.address}</div>
                            </div>
                        </div>
                        <div style="font-size: 28px; font-weight: 800; margin: 8px 0;">
                            ${formattedBalance}
                        </div>
                        <div style="font-size: 13px; opacity: 0.8; display: flex; align-items: center; gap: 12px;">
                            <span>💳 Balance: ${formattedBalance}</span>
                            ${walletData.credit ? `<span>•</span><span>🏆 Credit: ${walletData.credit}</span>` : ''}
                            ${walletData.has_bank ? '<span>•</span><span>🏦 Bank linked</span>' : ''}
                        </div>
                    </div>
                    <div style="color: rgba(255,255,255,0.9); font-size: 18px; margin-left: 10px;">›</div>
                </div>
                
                <!-- Decorative background elements -->
                <div style="position: absolute; top: -30px; right: -30px; width: 120px; height: 120px; background: rgba(255,255,255,0.1); border-radius: 50%; z-index: 1;"></div>
                <div style="position: absolute; bottom: -40px; left: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%; z-index: 1;"></div>
                <div style="position: absolute; top: 20px; right: 100px; width: 40px; height: 40px; background: rgba(255,255,255,0.08); border-radius: 50%; z-index: 1;"></div>
            `;
            
            card.setAttribute('data-php-updated', 'true');
            log('✅ Wallet preview card updated successfully');
            
        } catch (error) {
            log('❌ Error updating wallet preview card:', error);
        }
    }
    
    // Safe currency formatting
    function formatCurrency(amount) {
        try {
            const numAmount = Number(amount) || 0;
            if (numAmount >= 1000000) {
                return (numAmount / 1000000).toFixed(1) + 'M VNĐ';
            } else if (numAmount >= 1000) {
                return (numAmount / 1000).toFixed(0) + 'K VNĐ';
            } else {
                return numAmount.toLocaleString('vi-VN') + ' VNĐ';
            }
        } catch (error) {
            log('❌ Error formatting currency:', error);
            return '0 VNĐ';
        }
    }
    
    // Hook into Settings tab with better detection
    function hookSettingsTabSafely() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            try {
                                // Check for settings container
                                if (node.classList && node.classList.contains('settings-container')) {
                                    log('🔍 Settings container detected, loading PHP data...');
                                    setTimeout(() => {
                                        loadPhpProfileData();
                                    }, 500);
                                }
                                
                                // Check for wallet preview card  
                                if (node.querySelector) {
                                    const walletCard = node.querySelector('.wallet-preview-card');
                                    if (walletCard) {
                                        log('💳 Wallet card detected, updating...');
                                        setTimeout(() => {
                                            if (phpProfileData) {
                                                updateWalletDataSafely();
                                            } else {
                                                loadPhpProfileData();
                                            }
                                        }, 200);
                                    }
                                }
                                
                            } catch (error) {
                                // Silently handle errors to prevent console spam
                                if (CONFIG.debug) {
                                    log('⚠️ Minor error in mutation observer:', error.message);
                                }
                            }
                        }
                    });
                }
            });
        });
        
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            log('✅ DOM observer attached successfully');
        }
    }
    
    // Initialize with better error handling
    function init() {
        log('🚀 Initializing Settings-PHP Bridge (Fixed Version)...');
        
        try {
            // Load initial data
            loadPhpProfileData();
            
            // Hook into settings tab
            hookSettingsTabSafely();
            
            // Auto-refresh with error handling
            setInterval(() => {
                try {
                    log('🔄 Auto-refreshing PHP profile data...');
                    loadPhpProfileData();
                } catch (error) {
                    log('❌ Error in auto-refresh:', error);
                }
            }, CONFIG.updateInterval);
            
            // Listen for manual refresh requests
            window.addEventListener('refreshPhpProfile', () => {
                try {
                    log('🔄 Manual refresh requested');
                    loadPhpProfileData();
                } catch (error) {
                    log('❌ Error in manual refresh:', error);
                }
            });
            
            log('✅ Settings-PHP Bridge initialized successfully');
            
        } catch (error) {
            log('❌ Critical error in initialization:', error);
        }
    }
    
    // Expose global functions with error handling
    window.settingsBridge = {
        loadData: () => {
            try {
                return loadPhpProfileData();
            } catch (error) {
                log('❌ Error in loadData:', error);
                return Promise.resolve(false);
            }
        },
        getCurrentData: () => phpProfileData,
        updateSettings: () => {
            try {
                updateTelegramSettingsSafely();
            } catch (error) {
                log('❌ Error in updateSettings:', error);
            }
        },
        updateWallet: () => {
            try {
                updateWalletDataSafely();
            } catch (error) {
                log('❌ Error in updateWallet:', error);
            }
        }
    };
    
    // Legacy functions
    window.loadPhpSettingsData = window.settingsBridge.loadData;
    window.getPhpSettingsData = window.settingsBridge.getCurrentData;
    
    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 100);
    }
    
    // Debug controls (Ctrl+Shift+S)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            console.log('=== SETTINGS BRIDGE DEBUG (FIXED) ===');
            console.log('PHP Profile Data:', phpProfileData);
            console.log('Wallet Data:', window.phpWalletData);
            console.log('Updated Elements:', document.querySelectorAll('[data-php-updated="true"]').length);
            console.log('Settings Container Present:', !!document.querySelector('.settings-container'));
            console.log('Wallet Card Present:', !!document.querySelector('.wallet-preview-card'));
            console.log('=== END DEBUG ===');
        }
    });
    
    log('✅ Settings Bridge setup complete (Fixed Version)');
    log('💡 Press Ctrl+Shift+S for debug info');
    
})();