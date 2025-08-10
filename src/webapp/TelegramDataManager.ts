export class TelegramDataManager {
    private telegramId: string;
    private userData: any = null;
    
    constructor() {
        this.telegramId = this.getTelegramId();
        this.loadUserData();
        
        // Auto refresh every 30 seconds
        setInterval(() => this.refreshData(), 30000);
    }
    
    private getTelegramId(): string {
        const webApp = (window as any).Telegram?.WebApp;
        return webApp?.initDataUnsafe?.user?.id?.toString() || 'demo_user';
    }
    
    async loadUserData() {
        try {
            const response = await fetch('/api/webapp-user-data.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'get_user_data',
                    telegram_id: this.telegramId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.userData = data.ui_data;
                this.updateUI();
            } else {
                console.error('Failed to load user data:', data.message);
                this.showError(data.message);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Không thể tải dữ liệu');
        }
    }
    
    private updateUI() {
        if (!this.userData) return;
        
        // Update balance
        const balanceElement = document.querySelector('.balance-amount');
        if (balanceElement) {
            balanceElement.textContent = this.userData.formatted_balance;
        }
        
        // Update user info
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = this.userData.user_name;
        }
        
        const vipElement = document.querySelector('.vip-level');
        if (vipElement) {
            vipElement.textContent = this.userData.vip_level;
        }
        
        const creditElement = document.querySelector('.credit-score');
        if (creditElement) {
            creditElement.textContent = `Điểm tín nhiệm: ${this.userData.credit_score}`;
        }
        
        const walletAddressElement = document.querySelector('.wallet-address');
        if (walletAddressElement) {
            walletAddressElement.textContent = this.userData.wallet_address;
        }
        
        // Update member since
        const memberSinceElement = document.querySelector('.member-since');
        if (memberSinceElement) {
            memberSinceElement.textContent = `Thành viên từ ${this.userData.member_since}`;
        }
        
        // Update notification badge
        const notificationBadge = document.querySelector('.notification-badge');
        if (notificationBadge && this.userData.notification_count > 0) {
            notificationBadge.textContent = this.userData.notification_count;
            notificationBadge.style.display = 'block';
        }
        
        // Update service counters
        this.updateServiceCounters();
    }
    
    private updateServiceCounters() {
        // Update transaction history counter
        const transactionCounter = document.querySelector('.transaction-counter');
        if (transactionCounter) {
            transactionCounter.textContent = `${this.userData.transaction_count} lần gần nhất`;
        }
        
        // Update service history counter  
        const serviceCounter = document.querySelector('.service-counter');
        if (serviceCounter) {
            serviceCounter.textContent = `Theo dõi sử dụng`;
        }
    }
    
    async refreshData() {
        await this.loadUserData();
        console.log('Data refreshed at:', new Date().toLocaleTimeString());
    }
    
    private showError(message: string) {
        // Show error notification
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-notification';
        errorDiv.textContent = `Lỗi: ${message}`;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 3000);
    }
    
    getUserData() {
        return this.userData;
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.telegramDataManager = new TelegramDataManager();
});