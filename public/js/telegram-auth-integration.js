/**
 * Tích hợp xác thực Telegram cho Telebook
 * Frontend JavaScript - Bridge giữa Telegram WebApp và Backend
 */

class TelebookTelegramAuth {
    constructor() {
        this.config = {
            apiEndpoint: '/telebook/api/telegram-auth.php',
            adminApiEndpoint: '/telebook/admin/controllers/telegram-sync.php',
            botToken: '', // Sẽ được set từ config
            debug: true
        };
        
        this.user = null;
        this.isAuthenticated = false;
        this.authCallbacks = [];
        
        this.init();
    }

    /**
     * Khởi tạo hệ thống xác thực
     */
    init() {
        // Kiểm tra xem có phải Telegram WebApp không
        if (window.Telegram && window.Telegram.WebApp) {
            this.setupTelegramWebApp();
        } else {
            // Fallback cho web thường
            this.setupWebAuth();
        }
        
        // Lắng nghe sự kiện từ Telegram
        this.setupEventListeners();
    }

    /**
     * Setup cho Telegram WebApp
     */
    setupTelegramWebApp() {
        const tg = window.Telegram.WebApp;
        
        // Cấu hình WebApp
        tg.ready();
        tg.expand();
        
        // Lấy thông tin user từ Telegram
        if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
            this.handleTelegramAuth(tg.initDataUnsafe);
        }
        
        // Setup theme
        this.setupTelegramTheme(tg);
    }

    /**
     * Setup theme từ Telegram
     */
    setupTelegramTheme(tg) {
        const themeParams = tg.themeParams;
        if (themeParams) {
            document.documentElement.style.setProperty('--tg-bg-color', themeParams.bg_color);
            document.documentElement.style.setProperty('--tg-text-color', themeParams.text_color);
            document.documentElement.style.setProperty('--tg-hint-color', themeParams.hint_color);
            document.documentElement.style.setProperty('--tg-link-color', themeParams.link_color);
            document.documentElement.style.setProperty('--tg-button-color', themeParams.button_color);
            document.documentElement.style.setProperty('--tg-button-text-color', themeParams.button_text_color);
        }
    }

    /**
     * Setup cho web thường (không phải Telegram WebApp)
     */
    setupWebAuth() {
        // Tạo nút đăng nhập Telegram
        this.createTelegramLoginButton();
    }

    /**
     * Tạo nút đăng nhập Telegram cho web
     */
    createTelegramLoginButton() {
        const container = document.getElementById('telegram-login-container');
        if (!container) return;

        const loginButton = document.createElement('div');
        loginButton.innerHTML = `
            <div class="telegram-login-widget">
                <button id="telegram-login-btn" class="btn btn-primary">
                    <i class="fab fa-telegram-plane"></i>
                    Đăng nhập với Telegram
                </button>
            </div>
        `;
        
        container.appendChild(loginButton);
        
        // Xử lý click
        document.getElementById('telegram-login-btn').addEventListener('click', () => {
            this.showTelegramLoginModal();
        });
    }

    /**
     * Hiển thị modal đăng nhập Telegram
     */
    showTelegramLoginModal() {
        const modal = document.createElement('div');
        modal.className = 'telegram-auth-modal';
        modal.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Đăng nhập Telegram</h3>
                        <button class="close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Để đăng nhập, vui lòng:</p>
                        <ol>
                            <li>Mở Telegram</li>
                            <li>Tìm bot @TelebookBot</li>
                            <li>Gửi lệnh /login</li>
                            <li>Nhập mã xác nhận</li>
                        </ol>
                        <div class="auth-code-input">
                            <input type="text" id="auth-code" placeholder="Nhập mã xác nhận" maxlength="6">
                            <button id="verify-code-btn" class="btn btn-success">Xác nhận</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Xử lý sự kiện
        modal.querySelector('.close-btn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        modal.querySelector('#verify-code-btn').addEventListener('click', () => {
            const code = modal.querySelector('#auth-code').value;
            this.verifyAuthCode(code);
        });
    }

    /**
     * Xác thực mã từ Telegram Bot
     */
    async verifyAuthCode(code) {
        try {
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'verify_code',
                    code: code
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.handleAuthSuccess(result.user);
            } else {
                this.showError(result.error || 'Mã xác nhận không đúng');
            }
            
        } catch (error) {
            this.showError('Lỗi kết nối server');
            console.error('Auth error:', error);
        }
    }

    /**
     * Xử lý xác thực Telegram thành công
     */
    async handleTelegramAuth(initData) {
        try {
            // Chuẩn bị dữ liệu để gửi lên server
            const authData = {
                id: initData.user.id,
                first_name: initData.user.first_name || '',
                last_name: initData.user.last_name || '',
                username: initData.user.username || '',
                language_code: initData.user.language_code || 'vi',
                auth_date: initData.auth_date,
                hash: initData.hash
            };
            
            // Gửi lên server để xác thực
            const response = await fetch(this.config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(authData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.handleAuthSuccess(result.user);
            } else {
                this.handleAuthError(result.error);
            }
            
        } catch (error) {
            this.handleAuthError('Lỗi xác thực Telegram');
            console.error('Telegram auth error:', error);
        }
    }

    /**
     * Xử lý khi xác thực thành công
     */
    handleAuthSuccess(user) {
        this.user = user;
        this.isAuthenticated = true;
        
        // Lưu thông tin user vào localStorage
        localStorage.setItem('telebook_user', JSON.stringify(user));
        localStorage.setItem('telebook_auth_time', Date.now().toString());
        
        // Cập nhật UI
        this.updateUserInterface();
        
        // Gọi callbacks
        this.authCallbacks.forEach(callback => {
            try {
                callback(user);
            } catch (error) {
                console.error('Auth callback error:', error);
            }
        });
        
        // Hiển thị thông báo chào mừng
        this.showWelcomeMessage(user);
        
        // Đóng modal nếu có
        const modal = document.querySelector('.telegram-auth-modal');
        if (modal) {
            document.body.removeChild(modal);
        }
    }

    /**
     * Xử lý lỗi xác thực
     */
    handleAuthError(error) {
        this.showError(error);
        this.logout();
    }

    /**
     * Cập nhật giao diện người dùng
     */
    updateUserInterface() {
        if (!this.user) return;
        
        // Cập nhật thông tin user trong header
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                <div class="user-profile">
                    <div class="user-avatar">
                        <img src="/telebook/assets/assets/Images/default-avatar.jpg" alt="Avatar">
                    </div>
                    <div class="user-details">
                        <div class="user-name">${this.user.first_name} ${this.user.last_name || ''}</div>
                        <div class="user-balance">Số dư: ${this.formatBalance(this.user.balance)} VNĐ</div>
                        <div class="user-vip">VIP: ${this.user.vip_level}</div>
                        <div class="user-credit">Tín nhiệm: ${this.user.credit_score}</div>
                    </div>
                </div>
            `;
        }
        
        // Hiển thị/ẩn các phần tử theo trạng thái đăng nhập
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = 'block';
        });
        
        document.querySelectorAll('.auth-hidden').forEach(el => {
            el.style.display = 'none';
        });
    }

    /**
     * Hiển thị thông báo chào mừng
     */
    showWelcomeMessage(user) {
        const message = `Chào mừng ${user.first_name}! 🎉\n` +
                       `Số dư: ${this.formatBalance(user.balance)} VNĐ\n` +
                       `VIP: ${user.vip_level}\n` +
                       `Điểm tín nhiệm: ${user.credit_score}`;
        
        this.showNotification(message, 'success');
    }

    /**
     * Hiển thị thông báo
     */
    showNotification(message, type = 'info') {
        // Sử dụng thư viện toast có sẵn hoặc tạo custom
        if (typeof toastr !== 'undefined') {
            toastr[type](message);
        } else {
            alert(message);
        }
    }

    /**
     * Hiển thị lỗi
     */
    showError(error) {
        this.showNotification(error, 'error');
    }

    /**
     * Format số tiền
     */
    formatBalance(balance) {
        return new Intl.NumberFormat('vi-VN').format(balance);
    }

    /**
     * Đăng xuất
     */
    logout() {
        this.user = null;
        this.isAuthenticated = false;
        
        // Xóa dữ liệu local
        localStorage.removeItem('telebook_user');
        localStorage.removeItem('telebook_auth_time');
        
        // Cập nhật UI
        this.updateLogoutInterface();
        
        // Chuyển về trang đăng nhập
        window.location.href = '/telebook/';
    }

    /**
     * Cập nhật UI khi đăng xuất
     */
    updateLogoutInterface() {
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.innerHTML = '<button class="btn btn-primary" onclick="telebookAuth.init()">Đăng nhập</button>';
        }
        
        document.querySelectorAll('.auth-required').forEach(el => {
            el.style.display = 'none';
        });
        
        document.querySelectorAll('.auth-hidden').forEach(el => {
            el.style.display = 'block';
        });
    }

    /**
     * Kiểm tra xem user đã đăng nhập chưa
     */
    checkAuthStatus() {
        const userData = localStorage.getItem('telebook_user');
        const authTime = localStorage.getItem('telebook_auth_time');
        
        if (userData && authTime) {
            // Kiểm tra thời gian hết hạn (24h)
            const timeElapsed = Date.now() - parseInt(authTime);
            if (timeElapsed < 24 * 60 * 60 * 1000) {
                this.user = JSON.parse(userData);
                this.isAuthenticated = true;
                this.updateUserInterface();
                return true;
            } else {
                // Hết hạn
                this.logout();
            }
        }
        
        return false;
    }

    /**
     * Lấy thông tin user hiện tại
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * Kiểm tra quyền VIP
     */
    hasVIPAccess(requiredLevel = 'Premium') {
        if (!this.user) return false;
        
        const vipLevels = ['Basic', 'Premium', 'VIP', 'SVIP'];
        const userLevel = vipLevels.indexOf(this.user.vip_level);
        const requiredLevelIndex = vipLevels.indexOf(requiredLevel);
        
        return userLevel >= requiredLevelIndex;
    }

    /**
     * Cập nhật số dư
     */
    async updateBalance(amount, type, description) {
        try {
            const response = await fetch(`${this.config.apiEndpoint}?action=update_balance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.user.id,
                    amount: amount,
                    type: type,
                    description: description
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.user.balance = result.new_balance;
                this.updateUserInterface();
                this.showNotification(`${description}: ${this.formatBalance(amount)} VNĐ`, 'success');
            } else {
                this.showError(result.error);
            }
            
            return result;
            
        } catch (error) {
            this.showError('Lỗi cập nhật số dư');
            console.error('Balance update error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Lấy lịch sử giao dịch
     */
    async getTransactionHistory(limit = 10) {
        try {
            const response = await fetch(`${this.config.apiEndpoint}?action=get_transactions&user_id=${this.user.id}&limit=${limit}`);
            const result = await response.json();
            
            return result;
            
        } catch (error) {
            console.error('Transaction history error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Lấy thông báo
     */
    async getNotifications(limit = 10) {
        try {
            const response = await fetch(`${this.config.apiEndpoint}?action=get_notifications&user_id=${this.user.id}&limit=${limit}`);
            const result = await response.json();
            
            return result;
            
        } catch (error) {
            console.error('Notifications error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Đăng ký callback khi xác thực thành công
     */
    onAuth(callback) {
        this.authCallbacks.push(callback);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Lắng nghe sự kiện từ Telegram WebApp
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Sự kiện khi theme thay đổi
            tg.onEvent('themeChanged', () => {
                this.setupTelegramTheme(tg);
            });
            
            // Sự kiện khi viewport thay đổi
            tg.onEvent('viewportChanged', (data) => {
                if (this.config.debug) {
                    console.log('Viewport changed:', data);
                }
            });
        }
        
        // Lắng nghe sự kiện refresh balance từ admin
        window.addEventListener('message', (event) => {
            if (event.data.type === 'balance_updated') {
                this.refreshUserData();
            }
        });
    }

    /**
     * Refresh dữ liệu user từ server
     */
    async refreshUserData() {
        if (!this.user) return;
        
        try {
            const response = await fetch(`${this.config.apiEndpoint}?action=get_user&telegram_id=${this.user.telegram_id}`);
            const result = await response.json();
            
            if (result.success) {
                this.user = result.user;
                localStorage.setItem('telebook_user', JSON.stringify(this.user));
                this.updateUserInterface();
            }
            
        } catch (error) {
            console.error('Refresh user data error:', error);
        }
    }

    /**
     * Admin function: Cộng điểm cho user
     */
    async adminAddPoints(telegramId, points, reason) {
        try {
            const response = await fetch(this.config.adminApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'add_points',
                    telegram_id: telegramId,
                    points: points,
                    reason: reason
                })
            });
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Admin add points error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Admin function: Nâng cấp VIP
     */
    async adminUpgradeVIP(telegramId, vipLevel, reason) {
        try {
            const response = await fetch(this.config.adminApiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'upgrade_vip',
                    telegram_id: telegramId,
                    vip_level: vipLevel,
                    reason: reason
                })
            });
            
            const result = await response.json();
            return result;
            
        } catch (error) {
            console.error('Admin upgrade VIP error:', error);
            return { success: false, error: error.message };
        }
    }
}

// Khởi tạo global instance
window.telebookAuth = new TelebookTelegramAuth();

// Auto-check auth status khi load trang
document.addEventListener('DOMContentLoaded', () => {
    window.telebookAuth.checkAuthStatus();
});

// Export để sử dụng như module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TelebookTelegramAuth;
}