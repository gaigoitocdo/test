/**
 * Telegram Auth Settings Tab - Fixed Version
 * File: src/components/sidebarLeft/tabs/telegramAuth.ts
 */

import {SliderSuperTab} from '../../slider';
import SettingSection from '../../settingSection';
import Row from '../../row';
import Button from '../../button';
import {i18n} from '../../../lib/langPack';
import {attachClickEvent} from '../../../helpers/dom/clickEvent';
import PopupElement from '../../popups';

// Import telegram auth từ wallet tab - với fallback
let telebookAuth: any;
try {
  const walletModule = require('./wallet');
  telebookAuth = walletModule.telebookAuth;
} catch(e) {
  console.warn('Wallet module not loaded, using mock auth');
  // Mock implementation for development
  telebookAuth = {
    isUserAuthenticated: () => false,
    getCurrentUser: () => null,
    onAuth: (callback: Function) => {},
    refreshUserData: async () => {},
    updateBalance: async () => ({ success: false }),
    getTransactionHistory: async () => ({ success: false, data: [] })
  };
}

interface TelegramAuthSettings {
  auto_login: boolean;
  notifications: boolean;
  sync_profile: boolean;
  backup_enabled: boolean;
  privacy_mode: 'public' | 'private';
}

export default class AppTelegramAuthTab extends SliderSuperTab {
  private settings: TelegramAuthSettings;
  private authStatus: HTMLElement;
  private userInfo: HTMLElement;
  
  public async init() {
    this.container.classList.add('telegram-auth-settings');
    this.setTitle('Cài đặt Telegram');

    await this.loadSettings();
    this.setupInterface();
    this.setupEventListeners();
  }

  private async loadSettings() {
    const saved = sessionStorage.getItem('telegram_auth_settings');
    this.settings = saved ? JSON.parse(saved) : {
      auto_login: true,
      notifications: true,
      sync_profile: true,
      backup_enabled: true,
      privacy_mode: 'private'
    };
  }

  private setupInterface() {
    // Clear container safely
    if (this.scrollable && this.scrollable.container) {
      this.scrollable.container.innerHTML = '';
    }

    // Connection Status Section
    const statusSection = new SettingSection({
      name: 'Trạng thái kết nối'
    });

    this.authStatus = this.createConnectionStatus();
    statusSection.content.appendChild(this.authStatus);

    // User Information Section
    const userSection = new SettingSection({
      name: 'Thông tin tài khoản'
    });

    this.userInfo = this.createUserInfo();
    userSection.content.appendChild(this.userInfo);

    // Settings Section
    const settingsSection = new SettingSection({
      name: 'Cài đặt Telegram'
    });

    const settingsContainer = this.createSettingsOptions();
    settingsSection.content.appendChild(settingsContainer);

    // Actions Section
    const actionsSection = new SettingSection({
      name: 'Hành động'
    });

    const actionsContainer = this.createActionButtons();
    actionsSection.content.appendChild(actionsContainer);

    // Append all sections
    if (this.scrollable) {
      this.scrollable.append(
        statusSection.container,
        userSection.container,
        settingsSection.container,
        actionsSection.container
      );
    }
  }

  private createConnectionStatus(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'telegram-connection-status';
    
    const isAuth = telebookAuth && telebookAuth.isUserAuthenticated();
    const user = isAuth ? telebookAuth.getCurrentUser() : null;
    const isTelegramWebApp = !!(window as any).Telegram?.WebApp;

    // Set styles
    container.style.cssText = `
      background: ${isAuth ? 'linear-gradient(135deg, #4CAF50, #45a049)' : 'linear-gradient(135deg, #f44336, #d32f2f)'};
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin: 16px 0;
      position: relative;
      overflow: hidden;
    `;

    // Create status content
    const statusContent = document.createElement('div');
    statusContent.style.cssText = 'position: relative; z-index: 2;';
    
    // Status header
    const statusHeader = document.createElement('div');
    statusHeader.style.cssText = 'display: flex; align-items: center; gap: 16px; margin-bottom: 16px;';
    
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = 'width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;';
    iconContainer.textContent = isAuth ? '✅' : '❌';
    
    const statusText = document.createElement('div');
    const statusTitle = document.createElement('h3');
    statusTitle.style.cssText = 'margin: 0; font-size: 18px; font-weight: 700;';
    statusTitle.textContent = isAuth ? 'Đã kết nối Telegram' : 'Chưa kết nối Telegram';
    
    const statusSubtitle = document.createElement('p');
    statusSubtitle.style.cssText = 'margin: 4px 0 0 0; opacity: 0.9; font-size: 14px;';
    statusSubtitle.textContent = isAuth && user ? `Xin chào, ${user.first_name}!` : 'Vui lòng đăng nhập để sử dụng';
    
    statusText.appendChild(statusTitle);
    statusText.appendChild(statusSubtitle);
    statusHeader.appendChild(iconContainer);
    statusHeader.appendChild(statusText);
    
    // Status details
    const statusDetails = document.createElement('div');
    statusDetails.style.cssText = 'background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: 12px; padding: 16px;';
    
    const detailsGrid = document.createElement('div');
    detailsGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;';
    
    // Environment detail
    const envDetail = this.createDetailItem('Môi trường:', isTelegramWebApp ? '📱 Telegram App' : '🌐 Web Browser');
    
    // API Status detail
    const apiDetail = this.createDetailItem('Trạng thái API:', isAuth ? '🟢 Hoạt động' : '🔴 Không kết nối');
    
    detailsGrid.appendChild(envDetail);
    detailsGrid.appendChild(apiDetail);
    
    if (isAuth && user) {
      const vipDetail = this.createDetailItem('VIP Level:', `👑 ${user.vip_level || 'Basic'}`);
      const balanceDetail = this.createDetailItem('Số dư:', `💰 ${this.formatCurrency(user.balance || 0)}`);
      detailsGrid.appendChild(vipDetail);
      detailsGrid.appendChild(balanceDetail);
    }
    
    statusDetails.appendChild(detailsGrid);
    statusContent.appendChild(statusHeader);
    statusContent.appendChild(statusDetails);
    container.appendChild(statusContent);
    
    // Background decoration
    const bgDecor = document.createElement('div');
    bgDecor.style.cssText = 'position: absolute; top: -30px; right: -30px; width: 100px; height: 100px; background: rgba(255,255,255,0.1); border-radius: 50%;';
    container.appendChild(bgDecor);
    
    return container;
  }

  private createDetailItem(label: string, value: string): HTMLElement {
    const item = document.createElement('div');
    
    const labelEl = document.createElement('div');
    labelEl.style.cssText = 'opacity: 0.8;';
    labelEl.textContent = label;
    
    const valueEl = document.createElement('div');
    valueEl.style.cssText = 'font-weight: 600;';
    valueEl.innerHTML = value;
    
    item.appendChild(labelEl);
    item.appendChild(valueEl);
    
    return item;
  }

  private createUserInfo(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'telegram-user-info';

    const isAuth = telebookAuth && telebookAuth.isUserAuthenticated();
    const user = isAuth ? telebookAuth.getCurrentUser() : null;

    if (!isAuth || !user) {
      container.style.display = 'none';
      return container;
    }

    container.style.cssText = `
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
    `;

    // User header
    const userHeader = document.createElement('div');
    userHeader.style.cssText = 'display: flex; align-items: center; gap: 16px; margin-bottom: 20px;';
    
    const avatar = document.createElement('div');
    avatar.style.cssText = 'width: 60px; height: 60px; background: var(--accent-color); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;';
    avatar.textContent = user.first_name?.[0]?.toUpperCase() || 'U';
    
    const userDetails = document.createElement('div');
    
    const userName = document.createElement('h4');
    userName.style.cssText = 'margin: 0 0 4px 0; font-size: 18px;';
    userName.textContent = `${user.first_name} ${user.last_name || ''}`;
    
    const userUsername = document.createElement('p');
    userUsername.style.cssText = 'margin: 0; color: var(--secondary-text-color);';
    userUsername.textContent = `@${user.username || 'Chưa có username'}`;
    
    const userId = document.createElement('p');
    userId.style.cssText = 'margin: 4px 0 0 0; font-size: 12px; color: var(--secondary-text-color);';
    userId.textContent = `ID: ${user.telegram_id}`;
    
    userDetails.appendChild(userName);
    userDetails.appendChild(userUsername);
    userDetails.appendChild(userId);
    
    userHeader.appendChild(avatar);
    userHeader.appendChild(userDetails);
    
    // User stats
    const userStats = document.createElement('div');
    userStats.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;';
    
    const creditStat = this.createStatCard(String(user.credit_score || 700), 'Điểm tín nhiệm');
    const transactionStat = this.createStatCard(String(user.total_transactions || 0), 'Tổng giao dịch');
    
    userStats.appendChild(creditStat);
    userStats.appendChild(transactionStat);
    
    container.appendChild(userHeader);
    container.appendChild(userStats);

    return container;
  }

  private createStatCard(value: string, label: string): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = 'text-align: center; padding: 12px; background: var(--background-color); border-radius: 8px;';
    
    const valueEl = document.createElement('div');
    valueEl.style.cssText = 'font-size: 20px; font-weight: bold; color: var(--accent-color);';
    valueEl.textContent = value;
    
    const labelEl = document.createElement('div');
    labelEl.style.cssText = 'font-size: 12px; color: var(--secondary-text-color);';
    labelEl.textContent = label;
    
    card.appendChild(valueEl);
    card.appendChild(labelEl);
    
    return card;
  }

  private createSettingsOptions(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'telegram-settings-options';

    const options = [
      {
        key: 'auto_login',
        title: 'Tự động đăng nhập',
        subtitle: 'Đăng nhập tự động khi mở từ Telegram',
        icon: '🔐'
      },
      {
        key: 'notifications',
        title: 'Thông báo Telegram',
        subtitle: 'Nhận thông báo qua Telegram Bot',
        icon: '🔔'
      },
      {
        key: 'sync_profile',
        title: 'Đồng bộ hồ sơ',
        subtitle: 'Cập nhật thông tin từ Telegram',
        icon: '🔄'
      },
      {
        key: 'backup_enabled',
        title: 'Sao lưu tự động',
        subtitle: 'Tự động backup dữ liệu định kỳ',
        icon: '💾'
      }
    ];

    if (isAuth) {
      actions.push({
        title: 'Ngắt kết nối',
        subtitle: 'Đăng xuất khỏi Telegram',
        icon: '🔓',
        color: '#F44336',
        action: () => this.logout()
      });
    }

    actions.forEach(action => {
      const button = this.createActionButton(
        action.title,
        action.subtitle,
        action.icon,
        action.color,
        action.action
      );
      container.appendChild(button);
    });

    return container;
  }

  private createActionButton(title: string, subtitle: string, icon: string, color: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.style.cssText = `
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      font-family: inherit;
      width: 100%;
      display: flex;
      align-items: center;
      gap: 16px;
    `;

    // Icon
    const iconEl = document.createElement('div');
    iconEl.style.cssText = `width: 40px; height: 40px; background: ${color}20; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px;`;
    iconEl.textContent = icon;

    // Text content
    const textContent = document.createElement('div');
    textContent.style.cssText = 'flex: 1;';
    
    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight: 600; color: var(--primary-text-color); margin-bottom: 4px;';
    titleEl.textContent = title;
    
    const subtitleEl = document.createElement('div');
    subtitleEl.style.cssText = 'font-size: 13px; color: var(--secondary-text-color);';
    subtitleEl.textContent = subtitle;
    
    textContent.appendChild(titleEl);
    textContent.appendChild(subtitleEl);

    // Arrow
    const arrow = document.createElement('div');
    arrow.style.cssText = `color: ${color};`;
    arrow.textContent = '→';

    button.appendChild(iconEl);
    button.appendChild(textContent);
    button.appendChild(arrow);

    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--background-color-active)';
      button.style.transform = 'translateY(-1px)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'var(--surface-color)';
      button.style.transform = 'translateY(0)';
    });

    attachClickEvent(button, onClick, {listenerSetter: this.listenerSetter});

    return button;
  }

  // Action methods
  private async refreshConnection() {
    try {
      if (telebookAuth && telebookAuth.refreshUserData) {
        await telebookAuth.refreshUserData();
        this.updateInterface();
        this.showNotification('Đã cập nhật thông tin thành công!', 'success');
      }
    } catch (error) {
      this.showNotification('Lỗi cập nhật thông tin', 'error');
    }
  }

  private initiateLogin() {
    // Try to find wallet tab
    const appSidebarLeft = (window as any).appSidebarLeft;
    if (appSidebarLeft && appSidebarLeft.selectTab) {
      const walletTab = appSidebarLeft.tabs?.find((tab: any) => 
        tab.constructor.name === 'AppWalletTab'
      );
      if (walletTab) {
        appSidebarLeft.selectTab(walletTab);
        return;
      }
    }
    
    // Fallback: show login instructions
    this.showNotification('Vui lòng mở tab Ví để đăng nhập', 'info');
  }

  private showLoginHistory() {
    // Mock login history
    const history = [
      { date: '2024-12-08 10:30:15', ip: '192.168.1.100', device: 'Telegram WebApp', status: 'success' },
      { date: '2024-12-07 15:22:08', ip: '192.168.1.100', device: 'Chrome Browser', status: 'success' },
      { date: '2024-12-06 09:15:33', ip: '192.168.1.101', device: 'Mobile Telegram', status: 'success' }
    ];

    // Create popup content
    const content = document.createElement('div');
    content.style.cssText = 'padding: 20px;';
    
    const title = document.createElement('h4');
    title.textContent = 'Các lần đăng nhập gần đây';
    content.appendChild(title);
    
    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'color: var(--secondary-text-color); font-size: 14px;';
    subtitle.textContent = 'Theo dõi bảo mật tài khoản của bạn';
    content.appendChild(subtitle);
    
    history.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.style.cssText = 'display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--surface-color); border-radius: 8px; margin-bottom: 8px;';
      
      const icon = document.createElement('div');
      icon.style.cssText = `width: 32px; height: 32px; background: ${item.status === 'success' ? '#4CAF50' : '#F44336'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 14px;`;
      icon.textContent = item.status === 'success' ? '✓' : '✕';
      
      const details = document.createElement('div');
      details.style.cssText = 'flex: 1;';
      
      const device = document.createElement('div');
      device.style.cssText = 'font-weight: 600; font-size: 14px;';
      device.textContent = item.device;
      
      const date = document.createElement('div');
      date.style.cssText = 'font-size: 12px; color: var(--secondary-text-color);';
      date.textContent = item.date;
      
      const ip = document.createElement('div');
      ip.style.cssText = 'font-size: 12px; color: var(--secondary-text-color);';
      ip.textContent = `IP: ${item.ip}`;
      
      details.appendChild(device);
      details.appendChild(date);
      details.appendChild(ip);
      
      historyItem.appendChild(icon);
      historyItem.appendChild(details);
      
      content.appendChild(historyItem);
    });
    
    // Show in a simple alert (you can replace with proper popup)
    this.showNotification('Lịch sử đăng nhập đã được ghi nhận', 'info');
  }

  private async exportUserData() {
    const user = telebookAuth?.getCurrentUser();
    if (!user) {
      this.showNotification('Chưa đăng nhập', 'error');
      return;
    }

    try {
      // Get transaction history
      const transactions = await telebookAuth.getTransactionHistory(100);
      
      const exportData = {
        user_info: user,
        transactions: transactions.data || [],
        settings: this.settings,
        export_date: new Date().toISOString()
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `telebook_data_${user.telegram_id}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('Đã xuất dữ liệu thành công!', 'success');
    } catch (error) {
      this.showNotification('Lỗi xuất dữ liệu', 'error');
    }
  }

  private logout() {
    if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi Telegram?')) {
      // Clear session data
      sessionStorage.removeItem('telebook_user');
      sessionStorage.removeItem('telebook_auth_time');
      sessionStorage.removeItem('telebook_token');
      
      // Update interface
      this.updateInterface();
      this.showNotification('Đã đăng xuất thành công!', 'success');
    }
  }

  // Utility methods
  private saveSettings() {
    sessionStorage.setItem('telegram_auth_settings', JSON.stringify(this.settings));
  }

  private updateInterface() {
    // Re-create sections with updated data
    this.setupInterface();
  }

  private setupEventListeners() {
    // Listen for auth changes
    if (telebookAuth && telebookAuth.onAuth) {
      telebookAuth.onAuth(() => {
        this.updateInterface();
      });
    }

    // Auto-refresh every 30 seconds
    setInterval(() => {
      if (telebookAuth && telebookAuth.isUserAuthenticated()) {
        this.updateInterface();
      }
    }, 30000);
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 10001;
      transform: translateX(400px);
      transition: transform 0.3s ease;
      max-width: 300px;
      font-family: inherit;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });
    
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  public onCloseAfterTimeout() {
    return super.onCloseAfterTimeout();
  }
}

// Export for other modules
export { telebookAuth };options.forEach(option => {
      const row = new Row({
        title: option.title,
        subtitle: option.subtitle,
        icon: option.icon,
        checkboxField: {
          checked: this.settings[option.key as keyof TelegramAuthSettings] as boolean,
          toggle: true
        }
      });

      // Add event listener for checkbox
      if (row.checkboxField && row.checkboxField.input) {
        row.checkboxField.input.addEventListener('change', () => {
          (this.settings as any)[option.key] = row.checkboxField?.checked;
          this.saveSettings();
        });
      }

      container.appendChild(row.container);
    });

    return container;
  }

  private createActionButtons(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'telegram-actions';
    container.style.cssText = 'display: grid; gap: 12px; margin: 16px 0;';

    const isAuth = telebookAuth && telebookAuth.isUserAuthenticated();

    const actions = [
      {
        title: isAuth ? 'Làm mới kết nối' : 'Kết nối Telegram',
        subtitle: isAuth ? 'Cập nhật thông tin từ Telegram' : 'Đăng nhập bằng tài khoản Telegram',
        icon: '🔄',
        color: '#2196F3',
        action: () => isAuth ? this.refreshConnection() : this.initiateLogin()
      },
      {
        title: 'Xem lịch sử đăng nhập',
        subtitle: 'Theo dõi các lần đăng nhập gần đây',
        icon: '📋',
        color: '#FF9800',
        action: () => this.showLoginHistory()
      },
      {
        title: 'Xuất dữ liệu',
        subtitle: 'Tải xuống dữ liệu tài khoản',
        icon: '📤',
        color: '#4CAF50',
        action: () => this.exportUserData()
      }
    ];