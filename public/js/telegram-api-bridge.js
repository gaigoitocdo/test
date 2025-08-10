/**
 * 🔗 Telegram Web to PHP Backend API Bridge
 * Successfully connects Telegram Web with PHP APIs
 */

class TelegramAPI {
    constructor() {
        this.baseURL = '/api';
        this.debug = true;
        this.init();
    }

    async init() {
        console.log('🔗 Telegram API Bridge initializing...');
        
        // Test connection
        try {
            const result = await this.testConnection();
            if (result.success) {
                console.log('✅ PHP Backend connected successfully!');
                console.log('📊 Server info:', result.server_info);
                
                // Load user data automatically
                this.loadUserProfile();
            }
        } catch (error) {
            console.error('❌ Backend connection failed:', error);
        }
    }

    /**
     * 🧪 Test API connection
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/test.php`);
            const data = await response.json();
            
            if (this.debug) {
                console.log('🧪 Test API Response:', data);
            }
            
            return data;
        } catch (error) {
            console.error('❌ Test connection failed:', error);
            throw error;
        }
    }

    /**
     * 👤 Get user profile data
     */
    async getUserInfo(userId = null) {
        try {
            const url = `${this.baseURL}/user-info.php${userId ? `?user_id=${userId}` : ''}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (this.debug) {
                console.log('👤 User Info:', data);
            }
            
            return data;
        } catch (error) {
            console.error('❌ Get user info failed:', error);
            throw error;
        }
    }

    /**
     * 🔄 Load and update user profile in UI
     */
    async loadUserProfile() {
        try {
            const userData = await this.getUserInfo();
            
            if (userData.success) {
                this.updateProfileUI(userData.user);
                this.updateDashboardStats(userData.dashboard_stats);
                this.updateRecentActivity(userData.recent_activity);
                
                console.log('✅ Profile UI updated successfully');
            }
        } catch (error) {
            console.error('❌ Failed to load profile:', error);
        }
    }

    /**
     * 🎨 Update profile UI elements
     */
    updateProfileUI(user) {
        // Update balance
        const balanceElements = document.querySelectorAll('.balance-amount, .user-balance');
        balanceElements.forEach(el => {
            if (el) el.textContent = this.formatVND(user.balance);
        });

        // Update user name
        const nameElements = document.querySelectorAll('.user-name, .profile-name');
        nameElements.forEach(el => {
            if (el) el.textContent = user.name;
        });

        // Update VIP status
        const vipElements = document.querySelectorAll('.vip-level, .vip-status');
        vipElements.forEach(el => {
            if (el) el.textContent = user.vip_level;
        });

        // Update referral code
        const referralElements = document.querySelectorAll('.referral-code');
        referralElements.forEach(el => {
            if (el) el.textContent = user.referral_code;
        });

        console.log('🎨 Profile UI elements updated');
    }

    /**
     * 📊 Update dashboard statistics
     */
    updateDashboardStats(stats) {
        if (!stats) return;

        const statsMapping = {
            '.monthly-bookings': stats.this_month_bookings,
            '.monthly-spent': this.formatVND(stats.this_month_spent),
            '.loyalty-points': stats.loyalty_points,
            '.vip-progress': stats.next_vip_progress + '%'
        };

        Object.entries(statsMapping).forEach(([selector, value]) => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el) el.textContent = value;
            });
        });

        console.log('📊 Dashboard stats updated');
    }

    /**
     * 📋 Update recent activity
     */
    updateRecentActivity(activities) {
        if (!activities || !Array.isArray(activities)) return;

        const container = document.querySelector('.recent-activities, .activity-list');
        if (!container) return;

        const activitiesHTML = activities.map(activity => `
            <div class="activity-item" data-activity-id="${activity.id}">
                <div class="activity-icon ${activity.type}">
                    ${this.getActivityIcon(activity.type)}
                </div>
                <div class="activity-info">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-date">${this.formatDate(activity.date)}</div>
                </div>
                <div class="activity-amount ${activity.amount >= 0 ? 'positive' : 'negative'}">
                    ${activity.amount !== 0 ? this.formatVND(activity.amount) : ''}
                </div>
            </div>
        `).join('');

        container.innerHTML = activitiesHTML;
        console.log('📋 Recent activities updated');
    }

    /**
     * 🎭 Get activity type icon
     */
    getActivityIcon(type) {
        const icons = {
            'booking': '📅',
            'topup': '💰',
            'withdraw': '💸',
            'review': '⭐',
            'reward': '🎁'
        };
        return icons[type] || '📋';
    }

    /**
     * 💰 Format Vietnamese currency
     */
    formatVND(amount) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(amount);
    }

    /**
     * 📅 Format date
     */
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * 🔔 Show notification
     */
    showNotification(message, type = 'info') {
        console.log(`🔔 ${type.toUpperCase()}: ${message}`);
        
        // Try to integrate with Telegram Web notification system
        if (window.appNotificationsManager) {
            window.appNotificationsManager.show({
                title: message,
                type: type
            });
        }
    }

    /**
     * 🔄 Refresh all data
     */
    async refresh() {
        console.log('🔄 Refreshing all data...');
        await this.loadUserProfile();
        this.showNotification('Dữ liệu đã được cập nhật', 'success');
    }
}

// ✨ Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📱 Initializing Telegram API Bridge...');
    window.TelegramAPI = new TelegramAPI();
});

// 🔄 Auto-refresh every 5 minutes
setInterval(() => {
    if (window.TelegramAPI) {
        window.TelegramAPI.refresh();
    }
}, 5 * 60 * 1000);

console.log('📦 Telegram API Bridge loaded successfully');