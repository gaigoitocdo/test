// src/components/telegramBridge.ts - Enhanced Telegram Bridge

interface TelegramUser {
  id: number;
  telegram_id?: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  balance?: number;
  vip_level?: number;
  is_premium?: boolean;
}

interface TelegramAuthData {
  auth_token?: string;
  theme?: 'light' | 'dark';
  user?: TelegramUser;
}

interface TelebookResponse {
  success: boolean;
  message?: string;
  data?: any;
  user?: TelegramUser;
}

class TelegramBridge {
  private telegramData: TelegramAuthData | null = null;
  private isReady = false;
  private apiBase = __TELEGRAM_API_URL__ || '/api';
  private telebookBase = __TELEBOOK_URL__ || '/telebook';
  private authToken: string | null = null;
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.init();
  }

  private init() {
    console.log('🚀 Initializing Enhanced Telegram Bridge...');
    
    // Listen for messages from Telegram Web
    window.addEventListener('message', this.handleMessage.bind(this));
    
    // Auto-authenticate if we have session data
    this.loadSessionData();
    
    // Setup periodic sync
    this.setupPeriodicSync();
    
    // Notify that bridge is ready
    this.postMessage('TELEBOOK_READY', {
      url: window.location.href,
      timestamp: Date.now(),
      version: '2.0.0'
    });

    // Test API connection
    this.testConnection();
  }

  private handleMessage(event: MessageEvent) {
    try {
      const { type, data } = event.data;
      console.log('📨 Received from Telegram:', type, data);

      switch (type) {
        case 'TELEGRAM_INIT':
          this.telegramData = data;
          this.isReady = true;
          this.handleTelegramInit(data);
          break;

        case 'TELEGRAM_THEME_CHANGE':
          this.applyTheme(data.theme);
          break;

        case 'TELEGRAM_USER_UPDATE':
          this.handleUserUpdate(data);
          break;

        case 'TELEGRAM_BALANCE_UPDATE':
          this.handleBalanceUpdate(data);
          break;

        case 'TELEGRAM_VIP_UPDATE':
          this.handleVipUpdate(data);
          break;

        case 'TELEGRAM_COMMAND':
          this.handleCommand(data);
          break;

        default:
          console.log('Unknown message type:', type);
      }
    } catch (error) {
      console.error('Error handling Telegram message:', error);
    }
  }

  private async handleTelegramInit(data: TelegramAuthData) {
    console.log('✅ Telegram bridge ready:', data);
    
    this.telegramData = data;
    this.authToken = data.auth_token || null;
    
    // Apply theme
    if (data.theme) {
      this.applyTheme(data.theme);
    }
    
    // Auto-login
    if (data.auth_token && data.user) {
      await this.authenticateWithTelegram(data);
    }
    
    // Emit ready event
    this.emit('ready', data);
  }

  private async authenticateWithTelegram(data: TelegramAuthData): Promise<boolean> {
    try {
      const response = await this.apiCall('telegram-auth', {
        action: 'telegram_login',
        user: data.user
      });

      if (response.success) {
        console.log('✅ Auto-login successful:', response.user);
        this.authToken = response.token;
        this.saveSessionData(response);
        this.updateUserInterface(response.user);
        this.emit('authenticated', response.user);
        return true;
      } else {
        console.warn('⚠️ Auto-login failed:', response.message);
        this.emit('auth-failed', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      this.emit('auth-error', error);
      return false;
    }
  }

  private updateUserInterface(user: TelegramUser) {
    console.log('👤 Updating UI with user data:', user);
    
    // Update avatar
    document.querySelectorAll('[data-telegram="avatar"]').forEach((el: HTMLImageElement) => {
      if (user.avatar_url) el.src = user.avatar_url;
    });

    // Update name
    document.querySelectorAll('[data-telegram="name"]').forEach((el: HTMLElement) => {
      if (user.first_name) el.textContent = user.first_name;
    });

    // Update balance
    document.querySelectorAll('[data-telegram="balance"]').forEach((el: HTMLElement) => {
      if (user.balance !== undefined) {
        el.textContent = new Intl.NumberFormat('vi-VN').format(user.balance) + ' ₫';
      }
    });

    // Update VIP level
    document.querySelectorAll('[data-telegram="vip"]').forEach((el: HTMLElement) => {
      if (user.vip_level !== undefined) {
        el.textContent = `VIP ${user.vip_level}`;
      }
    });

    // Show/hide premium features
    document.querySelectorAll('[data-telegram="premium"]').forEach((el: HTMLElement) => {
      el.style.display = user.is_premium ? 'block' : 'none';
    });

    // Dispatch update event
    this.emit('user-updated', user);
  }

  private applyTheme(theme: 'light' | 'dark') {
    console.log('🎨 Applying theme:', theme);
    
    document.body.classList.remove('light-theme', 'dark-theme');
    document.body.classList.add(`${theme}-theme`);

    const root = document.documentElement;
    if (theme === 'dark') {
      root.style.setProperty('--tg-bg-color', '#1a1a1a');
      root.style.setProperty('--tg-text-color', '#ffffff');
      root.style.setProperty('--tg-accent-color', '#2481cc');
      root.style.setProperty('--tg-card-bg', '#2a2a2a');
    } else {
      root.style.setProperty('--tg-bg-color', '#ffffff');
      root.style.setProperty('--tg-text-color', '#000000');
      root.style.setProperty('--tg-accent-color', '#2481cc');
      root.style.setProperty('--tg-card-bg', '#f8f9fa');
    }

    this.emit('theme-changed', theme);
  }

  private handleUserUpdate(data: any) {
    if (this.telegramData?.user) {
      Object.assign(this.telegramData.user, data);
      this.updateUserInterface(this.telegramData.user);
    }
  }

  private handleBalanceUpdate(data: { balance: number }) {
    console.log('💰 Balance updated:', data.balance);
    
    if (this.telegramData?.user) {
      this.telegramData.user.balance = data.balance;
      this.updateUserInterface(this.telegramData.user);
    }

    this.emit('balance-updated', data.balance);
  }

  private handleVipUpdate(data: { vip_level: number }) {
    console.log('👑 VIP updated:', data.vip_level);
    
    if (this.telegramData?.user) {
      this.telegramData.user.vip_level = data.vip_level;
      this.updateUserInterface(this.telegramData.user);
    }

    this.emit('vip-updated', data.vip_level);
  }

  private handleCommand(data: any) {
    switch (data.command) {
      case 'refresh':
        window.location.reload();
        break;
      case 'navigate':
        if (data.url) window.location.href = data.url;
        break;
      case 'logout':
        this.logout();
        break;
    }
  }

  // Public API Methods
  public async apiCall(endpoint: string, data: any = {}, method: string = 'POST'): Promise<TelebookResponse> {
    const url = `${this.apiBase}/${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    };

    if (this.authToken) {
      options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${this.authToken}`
      };
    }

    if (method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      
      console.log(`📡 API ${method} ${endpoint}:`, result);
      return result;
    } catch (error) {
      console.error(`❌ API error:`, error);
      throw error;
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.apiCall('test', {}, 'GET');
      if (result.success) {
        console.log('✅ API connection successful');
        return true;
      } else {
        console.warn('⚠️ API test failed:', result);
        return false;
      }
    } catch (error) {
      console.error('❌ API connection error:', error);
      return false;
    }
  }

  public async getUserInfo(): Promise<TelegramUser | null> {
    try {
      const result = await this.apiCall('user-info', {}, 'GET');
      return result.success ? result.user : null;
    } catch (error) {
      console.error('Failed to get user info:', error);
      return null;
    }
  }

  public async updateBalance(amount: number, type: string = 'topup'): Promise<boolean> {
    try {
      const result = await this.apiCall('update-balance', { amount, type });
      if (result.success) {
        this.handleBalanceUpdate({ balance: result.new_balance });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update balance:', error);
      return false;
    }
  }

  public openTelebookPage(page: string, params: Record<string, string> = {}) {
    const url = new URL(`${this.telebookBase}/${page}`, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    url.searchParams.set('iframe', '1');
    url.searchParams.set('telegram', '1');

    this.postMessage('TELEBOOK_NAVIGATE', {
      url: url.toString(),
      page,
      params
    });
  }

  public showNotification(message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') {
    this.postMessage('TELEBOOK_NOTIFICATION', { message, type });
  }

  public logout() {
    this.authToken = null;
    this.telegramData = null;
    this.clearSessionData();
    this.postMessage('TELEGRAM_LOGOUT', {});
    this.emit('logout');
  }

  public navigate(route: string, external: boolean = false) {
    this.postMessage('TELEBOOK_NAVIGATE', { route, external });
  }

  // Event system
  public on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Session management
  private saveSessionData(data: any) {
    try {
      sessionStorage.setItem('telegram_auth', JSON.stringify({
        token: data.token,
        user: data.user,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save session data:', error);
    }
  }

  private loadSessionData() {
    try {
      const saved = sessionStorage.getItem('telegram_auth');
      if (saved) {
        const data = JSON.parse(saved);
        const age = Date.now() - data.timestamp;
        
        // Check if session is still valid (24 hours)
        if (age < 24 * 60 * 60 * 1000) {
          this.authToken = data.token;
          this.telegramData = { user: data.user, auth_token: data.token };
          this.updateUserInterface(data.user);
          return true;
        } else {
          this.clearSessionData();
        }
      }
    } catch (error) {
      console.warn('Failed to load session data:', error);
    }
    return false;
  }

  private clearSessionData() {
    try {
      sessionStorage.removeItem('telegram_auth');
    } catch (error) {
      console.warn('Failed to clear session data:', error);
    }
  }

  private setupPeriodicSync() {
    // Sync user data every 5 minutes
    setInterval(async () => {
      if (this.isAuthenticated()) {
        try {
          const user = await this.getUserInfo();
          if (user) {
            this.updateUserInterface(user);
          }
        } catch (error) {
          console.warn('Periodic sync failed:', error);
        }
      }
    }, 5 * 60 * 1000);
  }

  private postMessage(type: string, data: any = {}) {
    try {
      if (window.parent !== window) {
        window.parent.postMessage({ type, data }, '*');
        console.log('📤 Sent to Telegram:', type, data);
      }
    } catch (error) {
      console.error('Failed to post message to Telegram:', error);
    }
  }

  // Utility methods
  public isAuthenticated(): boolean {
    return !!(this.authToken && this.telegramData?.user);
  }

  public getUser(): TelegramUser | null {
    return this.telegramData?.user || null;
  }

  public getTheme(): 'light' | 'dark' {
    return this.telegramData?.theme || 'light';
  }

  public isPremium(): boolean {
    return this.telegramData?.user?.is_premium || false;
  }

  public isInTelegram(): boolean {
    return this.isReady && window.parent !== window;
  }

  public getBalance(): number {
    return this.telegramData?.user?.balance || 0;
  }

  public getVipLevel(): number {
    return this.telegramData?.user?.vip_level || 0;
  }
}

// Initialize global bridge instance
const telegramBridge = new TelegramBridge();

// Make globally available
declare global {
  interface Window {
    telegramBridge: TelegramBridge;
    TelegramBridge: typeof TelegramBridge;
  }
}

window.telegramBridge = telegramBridge;
window.TelegramBridge = TelegramBridge;

// Convenience functions for backward compatibility
window.navigateInTelegram = (route: string, external?: boolean) => 
  telegramBridge.navigate(route, external);

window.notifyTelegram = (message: string, type?: string) => 
  telegramBridge.showNotification(message, type as any);

window.getTelegramUser = () => telegramBridge.getUser();

window.isInTelegram = () => telegramBridge.isInTelegram();

window.autoLoginWithTelegram = async (data: TelegramAuthData) => {
  return await telegramBridge.authenticateWithTelegram(data);
};

// Auto-hide elements in Telegram context
document.addEventListener('DOMContentLoaded', () => {
  if (telegramBridge.isInTelegram()) {
    const hideSelectors = [
      '.main-header',
      '.main-navigation', 
      '.main-footer',
      '.telegram-hide',
      '[data-hide-in-telegram]'
    ];
    
    hideSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach((el: HTMLElement) => {
        el.style.display = 'none';
      });
    });
  }

  // Add telegram context class
  document.body.classList.add('telegram-context');
});

export default telegramBridge;
export { TelegramBridge, type TelegramUser, type TelegramAuthData, type TelebookResponse };