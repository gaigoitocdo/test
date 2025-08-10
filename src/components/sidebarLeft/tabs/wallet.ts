/**
 * Enhanced Telegram Wallet Tab Component with FULL PHP Integration
 * Complete solution for Telegram User -> PHP Backend sync
 */

import {SliderSuperTab} from '../../slider';
import SettingSection from '../../settingSection';
import Row from '../../row';
import Button from '../../button';
import {i18n} from '../../../lib/langPack';
import {attachClickEvent} from '../../../helpers/dom/clickEvent';
import rootScope from '../../../lib/rootScope';



interface TelegramUser {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  language_code?: string;
}

interface PhpUserProfile {
  user_id: number;
  telegram_id: number;
  username: string;
  full_name: string;
  vip_level: string;
  credit_score: number;
  wallet_balance: number;
  member_since: string;
  total_transactions: number;
  phone_number?: string;
  email?: string;
  avatar_url?: string;
  is_verified: boolean;
  last_login: string;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'transfer_in' | 'transfer_out';
  amount: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  description: string;
  balance_before?: number;
  balance_after?: number;
  method?: string;
  account?: string;
}

export default class AppWalletTab extends SliderSuperTab {
  private currentBalance: number = 0;
  private walletAddress: string = '';
  private transactionHistory: WalletTransaction[] = [];
  private userProfile: PhpUserProfile | null = null;
  private telegramUser: TelegramUser | null = null;
  private balanceDisplay: HTMLElement;
  private addressDisplay: HTMLElement;
  private historyContainer: HTMLElement;
  private isPhpConnected: boolean = false;

  // API endpoints
  private readonly API_BASE = '/public/telebook/api';
  private readonly endpoints = {
    userProfile: `${this.API_BASE}/user-profile.php`,
    walletData: `${this.API_BASE}/wallet-data.php`,
    transactions: `${this.API_BASE}/transactions.php`,
    syncUser: `${this.API_BASE}/sync-user.php`
  };

  public async init() {
    this.container.classList.add('wallet-container');
    this.setTitle('Dịch vụ & Quản lý');

    console.log('🚀 Wallet Tab Initializing...');

    // Step 1: Get Telegram User Info
    this.telegramUser = await this.getCurrentTelegramUser();
    console.log('📱 Telegram User:', this.telegramUser);

    // Step 2: Sync with PHP Backend
    await this.syncWithPhpBackend();

    // Step 3: Load all data
    await this.loadWalletData();
    await this.loadUserProfile();

    // Step 4: Setup UI
    this.setupWalletInterface();
    this.initializeEventListeners();

    console.log('✅ Wallet Tab Ready!', {
      telegramUser: this.telegramUser,
      phpProfile: this.userProfile,
      phpConnected: this.isPhpConnected
    });
  }

  /**
   * GET CURRENT TELEGRAM USER INFO
   * Multiple fallback methods to ensure we get user data
   */
  private async getCurrentTelegramUser(): Promise<TelegramUser | null> {
    try {
      console.log('🔍 Getting Telegram user info...');

      let user: TelegramUser | null = null;

      // Method 1: From rootScope.myId (most common)
      if(rootScope.myId) {
        console.log('📍 Method 1: rootScope.myId =', rootScope.myId);
        
        try {
          const userInfo = await managers.appUsersManager.getUser(rootScope.myId);
          if(userInfo) {
            user = {
              id: rootScope.myId,
              username: userInfo.username,
              first_name: userInfo.first_name,
              last_name: userInfo.last_name,
              phone_number: userInfo.phone,
              language_code: userInfo.lang_code || 'vi'
            };
            console.log('✅ Method 1 Success:', user);
          }
        } catch(error) {
          console.log('❌ Method 1 Failed:', error);
        }
      }

      // Method 2: From managers.appPeersManager
      if(!user && managers.appPeersManager) {
        try {
          console.log('📍 Method 2: appPeersManager');
          const myPeerId = managers.appPeersManager.peerId;
          if(myPeerId) {
            const userInfo = await managers.appUsersManager.getUser(myPeerId);
            if(userInfo) {
              user = {
                id: myPeerId,
                username: userInfo.username,
                first_name: userInfo.first_name,
                last_name: userInfo.last_name
              };
              console.log('✅ Method 2 Success:', user);
            }
          }
        } catch(error) {
          console.log('❌ Method 2 Failed:', error);
        }
      }

      // Method 3: From window/global objects
      if(!user) {
        try {
          console.log('📍 Method 3: Global objects');
          
          // Check Telegram WebApp
          if((window as any).Telegram?.WebApp?.initDataUnsafe?.user) {
            const webAppUser = (window as any).Telegram.WebApp.initDataUnsafe.user;
            user = {
              id: webAppUser.id,
              username: webAppUser.username,
              first_name: webAppUser.first_name,
              last_name: webAppUser.last_name,
              language_code: webAppUser.language_code
            };
            console.log('✅ Method 3 WebApp Success:', user);
          }
          
          // Check if stored in localStorage (backup)
          else if(localStorage.getItem('telegram_user')) {
            user = JSON.parse(localStorage.getItem('telegram_user'));
            console.log('✅ Method 3 localStorage Success:', user);
          }
          
          // Check sessionStorage
          else if(sessionStorage.getItem('telegram_user')) {
            user = JSON.parse(sessionStorage.getItem('telegram_user'));
            console.log('✅ Method 3 sessionStorage Success:', user);
          }
        } catch(error) {
          console.log('❌ Method 3 Failed:', error);
        }
      }

      // Method 4: From URL parameters (if launched via web link)
      if(!user) {
        try {
          console.log('📍 Method 4: URL parameters');
          const urlParams = new URLSearchParams(window.location.search);
          const userParam = urlParams.get('user');
          if(userParam) {
            user = JSON.parse(decodeURIComponent(userParam));
            console.log('✅ Method 4 Success:', user);
          }
        } catch(error) {
          console.log('❌ Method 4 Failed:', error);
        }
      }

      // Store user info for future use
      if(user) {
        try {
          localStorage.setItem('telegram_user', JSON.stringify(user));
          sessionStorage.setItem('telegram_user', JSON.stringify(user));
        } catch(error) {
          console.log('⚠️ Cannot store user info:', error);
        }
      } else {
        console.error('❌ No Telegram user found with any method!');
      }

      return user;

    } catch(error) {
      console.error('💥 Error getting Telegram user:', error);
      return null;
    }
  }

  /**
   * SYNC WITH PHP BACKEND
   * Send Telegram user info to PHP and create/update user record
   */
  private async syncWithPhpBackend(): Promise<void> {
    try {
      if(!this.telegramUser) {
        console.error('❌ No Telegram user to sync');
        this.isPhpConnected = false;
        return;
      }

      console.log('🔄 Syncing with PHP backend...');

      const syncData = {
        action: 'sync_user',
        telegram_user: this.telegramUser,
        timestamp: Date.now(),
        client_info: {
          user_agent: navigator.userAgent,
          language: navigator.language,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          platform: navigator.platform
        }
      };

      const response = await fetch(this.endpoints.syncUser, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Client': 'tweb',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(syncData)
      });

      console.log('📡 Sync response status:', response.status);

      if(response.ok) {
        const result = await response.json();
        console.log('✅ PHP Sync Success:', result);
        
        this.isPhpConnected = true;
        
        // Store PHP session info if provided
        if(result.session_token) {
          sessionStorage.setItem('php_session_token', result.session_token);
        }
        
        if(result.user_profile) {
          this.userProfile = result.user_profile;
        }

      } else {
        const errorText = await response.text();
        console.error('❌ PHP Sync Failed:', response.status, errorText);
        this.isPhpConnected = false;
      }

    } catch(error) {
      console.error('💥 Error syncing with PHP:', error);
      this.isPhpConnected = false;
    }
  }

  /**
   * LOAD USER PROFILE FROM PHP
   */
  private async loadUserProfile(): Promise<void> {
    try {
      if(!this.isPhpConnected || !this.telegramUser) {
        console.log('⚠️ PHP not connected, using demo profile');
        this.loadDemoProfile();
        return;
      }

      console.log('📥 Loading user profile from PHP...');

      const requestData = {
        action: 'get_profile',
        telegram_id: this.telegramUser.id,
        include_wallet: true,
        include_transactions: true
      };

      const response = await fetch(this.endpoints.userProfile, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('php_session_token')}`,
          'X-Telegram-ID': this.telegramUser.id.toString()
        },
        body: JSON.stringify(requestData)
      });

      if(response.ok) {
        const data = await response.json();
        console.log('✅ Profile loaded from PHP:', data);
        
        if(data.profile) {
          this.userProfile = data.profile;
          this.currentBalance = data.profile.wallet_balance || 0;
        }
        
        if(data.transactions) {
          this.transactionHistory = data.transactions;
        }

      } else {
        throw new Error(`PHP profile request failed: ${response.status}`);
      }

    } catch(error) {
      console.error('❌ Error loading PHP profile:', error);
      this.loadDemoProfile();
    }
  }

  /**
   * LOAD WALLET DATA FROM PHP
   */
  private async loadWalletData(): Promise<void> {
    try {
      if(!this.isPhpConnected || !this.telegramUser) {
        this.loadDemoWalletData();
        return;
      }

      console.log('💰 Loading wallet data from PHP...');

      const response = await fetch(this.endpoints.walletData, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('php_session_token')}`,
          'X-Telegram-ID': this.telegramUser.id.toString()
        },
        body: JSON.stringify({
          action: 'get_wallet',
          telegram_id: this.telegramUser.id
        })
      });

      if(response.ok) {
        const data = await response.json();
        console.log('✅ Wallet loaded from PHP:', data);
        
        this.currentBalance = data.balance || 0;
        this.walletAddress = data.address || this.generateWalletAddress();
        
        if(data.transactions) {
          this.transactionHistory = data.transactions;
        }

      } else {
        throw new Error(`Wallet data request failed: ${response.status}`);
      }

    } catch(error) {
      console.error('❌ Error loading wallet data:', error);
      this.loadDemoWalletData();
    }
  }

  /**
   * SEND TRANSACTION TO PHP
   */
  private async processTransactionWithPhp(type: 'deposit' | 'withdraw', amount: number): Promise<boolean> {
    try {
      if(!this.isPhpConnected || !this.telegramUser) {
        console.error('❌ PHP not connected for transaction');
        return false;
      }

      console.log(`💸 Processing ${type} transaction:`, amount);

      const transactionData = {
        action: 'process_transaction',
        telegram_id: this.telegramUser.id,
        type: type,
        amount: amount,
        timestamp: Date.now(),
        client_ip: await this.getClientIP(),
        user_agent: navigator.userAgent
      };

      const response = await fetch(this.endpoints.transactions, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('php_session_token')}`,
          'X-Telegram-ID': this.telegramUser.id.toString()
        },
        body: JSON.stringify(transactionData)
      });

      if(response.ok) {
        const result = await response.json();
        console.log('✅ Transaction processed:', result);
        
        if(result.success) {
          // Update local data
          this.currentBalance = result.new_balance;
          this.transactionHistory.unshift(result.transaction);
          this.updateBalanceDisplay();
          this.renderTransactionHistory();
          
          this.showNotification(`${type === 'deposit' ? 'Nạp' : 'Rút'} ${this.formatCurrency(amount)} thành công!`, 'success');
          return true;
        } else {
          this.showNotification(result.message || 'Giao dịch thất bại', 'error');
          return false;
        }

      } else {
        throw new Error(`Transaction failed: ${response.status}`);
      }

    } catch(error) {
      console.error('💥 Transaction error:', error);
      this.showNotification('Lỗi kết nối. Vui lòng thử lại!', 'error');
      return false;
    }
  }

  /**
   * ENHANCED TRANSACTION PROCESSING
   */
  private async processDeposit(amount: number) {
    const success = await this.processTransactionWithPhp('deposit', amount);
    if(!success && !this.isPhpConnected) {
      // Fallback to demo mode
      this.processDepositDemo(amount);
    }
  }

  private async processWithdraw(amount: number) {
    if(amount > this.currentBalance) {
      this.showNotification('Số dư không đủ', 'error');
      return;
    }

    const success = await this.processTransactionWithPhp('withdraw', amount);
    if(!success && !this.isPhpConnected) {
      // Fallback to demo mode
      this.processWithdrawDemo(amount);
    }
  }

  /**
   * DEMO FALLBACK METHODS
   */
  private loadDemoProfile(): void {
    console.log('📋 Loading demo profile...');
    this.userProfile = {
      user_id: 999,
      telegram_id: this.telegramUser?.id || 123456789,
      username: this.telegramUser?.username || 'demo_user',
      full_name: this.telegramUser?.first_name ? 
        `${this.telegramUser.first_name} ${this.telegramUser.last_name || ''}`.trim() : 
        'Người dùng Telegram',
      vip_level: 'Premium',
      credit_score: 750,
      wallet_balance: 1250000,
      member_since: '2023-01-15',
      total_transactions: 47,
      is_verified: true,
      last_login: new Date().toISOString(),
      created_at: '2023-01-15T00:00:00Z',
      updated_at: new Date().toISOString()
    };
  }

  private loadDemoWalletData(): void {
    console.log('💳 Loading demo wallet data...');
    this.walletAddress = this.generateWalletAddress();
    this.currentBalance = 1250000;
    this.transactionHistory = this.generateDemoTransactions();
  }

  private processDepositDemo(amount: number): void {
    const transaction: WalletTransaction = {
      id: 'tx_demo_' + Date.now(),
      type: 'deposit',
      amount: amount,
      timestamp: Date.now(),
      status: 'completed',
      description: 'Nạp tiền từ ngân hàng (Demo)',
      balance_before: this.currentBalance,
      balance_after: this.currentBalance + amount,
      method: 'bank_transfer',
      account: 'VCB **** 1234'
    };

    this.currentBalance += amount;
    this.transactionHistory.unshift(transaction);
    this.updateBalanceDisplay();
    this.renderTransactionHistory();
    this.showNotification(`Nạp ${this.formatCurrency(amount)} thành công! (Demo)`, 'success');
  }

  private processWithdrawDemo(amount: number): void {
    const transaction: WalletTransaction = {
      id: 'tx_demo_' + Date.now(),
      type: 'withdraw',
      amount: amount,
      timestamp: Date.now(),
      status: 'completed',
      description: 'Rút tiền về tài khoản ngân hàng (Demo)',
      balance_before: this.currentBalance,
      balance_after: this.currentBalance - amount,
      method: 'bank_transfer',
      account: 'VCB **** 1234'
    };

    this.currentBalance -= amount;
    this.transactionHistory.unshift(transaction);
    this.updateBalanceDisplay();
    this.renderTransactionHistory();
    this.showNotification(`Rút ${this.formatCurrency(amount)} thành công! (Demo)`, 'success');
  }

  /**
   * UTILITY METHODS
   */
  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch(error) {
      return 'unknown';
    }
  }

  private generateWalletAddress(): string {
    const prefix = 'TG';
    const randomPart = Math.random().toString(36).substring(2, 15).toUpperCase();
    return `${prefix}${randomPart}`;
  }

  private generateDemoTransactions(): WalletTransaction[] {
    return [
      {
        id: 'tx_demo_1',
        type: 'deposit',
        amount: 500000,
        timestamp: Date.now() - 86400000,
        status: 'completed',
        description: 'Nạp tiền từ ngân hàng VCB',
        balance_before: 750000,
        balance_after: 1250000,
        method: 'bank_transfer',
        account: 'VCB **** 1234'
      },
      {
        id: 'tx_demo_2',
        type: 'transfer_out',
        amount: 150000,
        timestamp: Date.now() - 172800000,
        status: 'completed',
        description: 'Chuyển tiền cho @user123',
        balance_before: 900000,
        balance_after: 750000
      },
      {
        id: 'tx_demo_3',
        type: 'withdraw',
        amount: 200000,
        timestamp: Date.now() - 259200000,
        status: 'completed',
        description: 'Rút tiền về tài khoản VCB',
        balance_before: 1100000,
        balance_after: 900000,
        method: 'bank_transfer',
        account: 'VCB **** 1234'
      }
    ];
  }

  /**
   * UI SETUP (Reusing your existing awesome UI code)
   */
  private setupWalletInterface() {
    this.scrollable.container.innerHTML = '';

    // Connection Status Indicator
    const statusSection = this.createConnectionStatusSection();
    
    // Balance Overview Section
    const overviewSection = new SettingSection({
      name: 'Tổng quan tài khoản'
    });

    const overviewCard = this.createOverviewCard();
    overviewSection.content.appendChild(overviewCard);

    // Quick Actions Section
    const actionsSection = new SettingSection({
      name: 'Thao tác nhanh'
    });

    const actionsContainer = this.createQuickActions();
    actionsSection.content.appendChild(actionsContainer);

    // Profile Services Section
    const servicesSection = new SettingSection({
      name: 'Dịch vụ & Quản lý'
    });

    const servicesContainer = this.createProfileServices();
    servicesSection.content.appendChild(servicesContainer);

    // Transaction History Section
    const historySection = new SettingSection({
      name: 'Giao dịch gần đây'
    });

    this.historyContainer = document.createElement('div');
    this.historyContainer.className = 'wallet-history-container';
    this.renderTransactionHistory();
    historySection.content.appendChild(this.historyContainer);

    // Append all sections
    this.scrollable.append(
      statusSection,
      overviewSection.container,
      actionsSection.container,
      servicesSection.container,
      historySection.container
    );
  }

  private createConnectionStatusSection(): HTMLElement {
    const statusContainer = document.createElement('div');
    statusContainer.style.cssText = `
      margin: 16px 0;
      padding: 12px 16px;
      border-radius: var(--border-radius-default);
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      ${this.isPhpConnected ? 
        'background: rgba(76, 175, 80, 0.1); border: 1px solid rgba(76, 175, 80, 0.3); color: #4CAF50;' :
        'background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); color: #FF9800;'
      }
    `;

    statusContainer.innerHTML = `
      <div style="width: 8px; height: 8px; border-radius: 50%; background: ${this.isPhpConnected ? '#4CAF50' : '#FF9800'};"></div>
      <span>
        ${this.isPhpConnected ? 
          '✅ Kết nối PHP thành công - Dữ liệu thực' : 
          '⚠️ Chế độ Demo - Kết nối PHP không khả dụng'
        }
      </span>
      ${this.telegramUser ? `
        <span style="margin-left: auto; font-size: 12px; opacity: 0.8;">
          ID: ${this.telegramUser.id}
        </span>
      ` : ''}
    `;

    return statusContainer;
  }

  private createOverviewCard(): HTMLElement {
    const card = document.createElement('div');
    card.className = 'wallet-overview-card';
    card.style.cssText = `
      background: var(--accent-color);
      border-radius: var(--border-radius-big);
      padding: 24px;
      color: white;
      position: relative;
      overflow: hidden;
      margin: 16px 0;
      box-shadow: 0 8px 32px rgba(var(--accent-color-rgb), 0.3);
    `;

    const userName = this.userProfile?.full_name || 
                     (this.telegramUser ? `${this.telegramUser.first_name || ''} ${this.telegramUser.last_name || ''}`.trim() : '') ||
                     'Người dùng Telegram';

    card.innerHTML = `
      <div style="position: relative; z-index: 2;">
        <!-- Balance Section -->
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 16px;">
            <div style="width: 32px; height: 32px; color: white;">
              ${this.getSvgIcon('wallet')}
            </div>
            <div style="text-align: left;">
              <div style="font-size: 16px; font-weight: 600;">Số dư khả dụng</div>
              <div style="font-size: 12px; opacity: 0.8;">Available Balance</div>
            </div>
          </div>
          
          <div id="balance-display" style="font-size: 36px; font-weight: 800; margin: 20px 0; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
            ${this.formatCurrency(this.currentBalance)}
          </div>
        </div>

        <!-- User Profile Summary -->
        <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: var(--border-radius-default); padding: 20px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div>
              <div style="font-size: 14px; font-weight: 600;">${userName}</div>
              <div style="font-size: 12px; opacity: 0.9;">
                VIP ${this.userProfile?.vip_level || 'Basic'} • 
                Điểm tín nhiệm: ${this.userProfile?.credit_score || 0}
                ${this.isPhpConnected ? '' : ' (Demo)'}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 12px; opacity: 0.9;">Thành viên từ</div>
              <div style="font-size: 14px; font-weight: 600;">
                ${this.userProfile?.member_since ? 
                  new Date(this.userProfile.member_since).toLocaleDateString('vi-VN') : 
                  new Date().toLocaleDateString('vi-VN')
                }
              </div>
            </div>
          </div>
          
          <!-- Credit Score Bar -->
          <div style="background: rgba(255,255,255,0.2); border-radius: 10px; height: 8px; overflow: hidden;">
            <div style="background: ${this.getCreditColor()}; height: 100%; width: ${((this.userProfile?.credit_score || 0) / 850) * 100}%; border-radius: 10px; transition: width 0.3s;"></div>
          </div>
        </div>

        <!-- Wallet Address & Telegram Info -->
        <div style="background: rgba(255,255,255,0.15); backdrop-filter: blur(10px); border-radius: var(--border-radius-default); padding: 16px;">
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 4px;">Địa chỉ ví</div>
          <div id="address-display" style="font-family: var(--font-monospace); font-size: 14px; font-weight: 600; letter-spacing: 1px; margin-bottom: 8px;">
            ${this.walletAddress}
          </div>
          ${this.telegramUser?.username ? `
            <div style="font-size: 12px; opacity: 0.8;">
              Telegram: @${this.telegramUser.username}
            </div>
          ` : ''}
        </div>
      </div>
      
      <!-- Animated background elements -->
      <div style="position: absolute; top: -50px; right: -50px; width: 200px; height: 200px; background: rgba(255,255,255,0.1); border-radius: 50%; animation: float 6s ease-in-out infinite;"></div>
      <div style="position: absolute; bottom: -30px; left: -30px; width: 120px; height: 120px; background: rgba(255,255,255,0.05); border-radius: 50%; animation: float 8s ease-in-out infinite reverse;"></div>
    `;

    this.balanceDisplay = card.querySelector('#balance-display');
    this.addressDisplay = card.querySelector('#address-display');

    return card;
  }

  // Reuse your existing UI methods with minor PHP integration adjustments
  private createQuickActions(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin: 16px 0;
    `;

    const depositBtn = this.createActionButton(
      this.getSvgIcon('deposit'), 
      'Nạp tiền', 
      '#4CAF50', 
      () => this.openDepositModal()
    );

    const withdrawBtn = this.createActionButton(
      this.getSvgIcon('withdraw'), 
      'Rút tiền', 
      '#FF5722', 
      () => this.openWithdrawModal()
    );

    container.appendChild(depositBtn);
    container.appendChild(withdrawBtn);

    return container;
  }

  private createActionButton(icon: string, text: string, color: string, onClick: () => void): HTMLElement {
    const button = document.createElement('button');
    button.style.cssText = `
      background: ${color};
      color: white;
      border: none;
      border-radius: var(--border-radius-big);
      padding: 18px 20px;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      position: relative;
      overflow: hidden;
    `;

    button.innerHTML = `
      <div style="width: 24px; height: 24px;">
        ${icon}
      </div>
      <span>${text}</span>
    `;

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
    });

    attachClickEvent(button, onClick, {listenerSetter: this.listenerSetter});
    return button;
  }

  private createProfileServices(): HTMLElement {
    const container = document.createElement('div');
    container.style.cssText = `
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 16px 0;
    `;

    const services = [
      {
        icon: this.getSvgIcon('bank'),
        title: 'Tài khoản ngân hàng',
        subtitle: 'Quản lý thẻ & TK',
        color: '#2196F3',
        onClick: () => this.openBankAccountModal()
      },
      {
        icon: this.getSvgIcon('ranking'),
        title: 'Lịch sử xếp hạng',
        subtitle: '10 lần gần nhất',
        color: '#9C27B0',
        onClick: () => this.openRankingHistoryModal()
      },
      {
        icon: this.getSvgIcon('history'),
        title: 'Lịch sử dịch vụ',
        subtitle: 'Theo dõi sử dụng',
        color: '#FF9800',
        onClick: () => this.openServiceHistoryModal()
      },
      {
        icon: this.getSvgIcon('user'),
        title: 'Trung tâm cá nhân',
        subtitle: 'Thông tin & VIP',
        color: '#4CAF50',
        onClick: () => this.openPersonalCenterModal()
      },
      {
        icon: this.getSvgIcon('notification'),
        title: 'Thông báo',
        subtitle: 'Tin nhắn hệ thống',
        color: '#F44336',
        onClick: () => this.openNotificationModal()
      },
      {
        icon: this.getSvgIcon('support'),
        title: 'Liên hệ CSKH',
        subtitle: 'Hỗ trợ 24/7',
        color: '#607D8B',
        onClick: () => this.openSupportModal()
      }
    ];

    services.forEach(service => {
      const serviceCard = this.createServiceCard(
        service.icon,
        service.title,
        service.subtitle,
        service.color,
        service.onClick
      );
      container.appendChild(serviceCard);
    });

    return container;
  }

  private createServiceCard(icon: string, title: string, subtitle: string, color: string, onClick: () => void): HTMLElement {
    const card = document.createElement('button');
    card.style.cssText = `
      background: var(--surface-color);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-default);
      padding: 16px 12px;
      cursor: pointer;
      transition: all 0.3s;
      text-align: center;
      font-family: inherit;
      position: relative;
      overflow: hidden;
      min-height: 100px;
    `;

    card.innerHTML = `
      <div style="width: 24px; height: 24px; margin: 0 auto 8px auto; color: ${color};">
        ${icon}
      </div>
      <div style="font-size: 13px; font-weight: 600; color: var(--primary-text-color); margin-bottom: 4px; line-height: 1.2;">
        ${title}
      </div>
      <div style="font-size: 11px; color: var(--secondary-text-color); line-height: 1.2;">
        ${subtitle}
      </div>
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: ${color};"></div>
    `;

    card.addEventListener('mouseenter', () => {
      card.style.transform = 'translateY(-2px)';
      card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      card.style.backgroundColor = 'var(--background-color-active)';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'translateY(0)';
      card.style.boxShadow = 'none';
      card.style.backgroundColor = 'var(--surface-color)';
    });

    attachClickEvent(card, onClick, {listenerSetter: this.listenerSetter});
    return card;
  }

  // Transaction UI Methods
  public openDepositModal() {
    this.showTransactionModal('deposit', 'Nạp tiền vào ví', 'Nhập số tiền muốn nạp', (amount) => {
      this.processDeposit(amount);
    });
  }

  public openWithdrawModal() {
    if(this.currentBalance <= 0) {
      this.showNotification('Số dư không đủ để rút tiền', 'error');
      return;
    }
    this.showTransactionModal('withdraw', 'Rút tiền từ ví', 'Nhập số tiền muốn rút', (amount) => {
      this.processWithdraw(amount);
    });
  }

  private showTransactionModal(type: 'deposit' | 'withdraw', title: string, placeholder: string, onConfirm: (amount: number) => void) {
    const modalContainer = document.createElement('div');
    modalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--background-color);
      border-radius: var(--border-radius-big);
      padding: 32px;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      position: relative;
    `;

    const iconSvg = type === 'deposit' ? this.getSvgIcon('deposit') : this.getSvgIcon('withdraw');

    modal.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 48px; height: 48px; margin: 0 auto 16px auto; color: ${type === 'deposit' ? '#4CAF50' : '#FF5722'};">
          ${iconSvg}
        </div>
        <h3 style="font-size: 20px; font-weight: 700; color: var(--primary-text-color); margin: 0;">${title}</h3>
        ${!this.isPhpConnected ? `
          <div style="background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); color: #FF9800; padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-top: 8px;">
            ⚠️ Chế độ Demo - Giao dịch không thực
          </div>
        ` : ''}
      </div>

      <div style="margin-bottom: 24px;">
        <label style="display: block; font-size: 14px; font-weight: 600; color: var(--primary-text-color); margin-bottom: 8px;">
          Số tiền (VNĐ)
        </label>
        <input type="number" id="amount-input" placeholder="Nhập số tiền..." style="
          width: 100%;
          padding: 16px;
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius-default);
          font-size: 16px;
          background: var(--surface-color);
          color: var(--primary-text-color);
          box-sizing: border-box;
          font-family: inherit;
        " min="10000" max="${type === 'withdraw' ? this.currentBalance : 50000000}">
        <div style="font-size: 12px; color: var(--secondary-text-color); margin-top: 8px;">
          ${type === 'withdraw' ? `Số dư khả dụng: ${this.formatCurrency(this.currentBalance)}` : 'Số tiền tối thiểu: 10,000 VNĐ'}
        </div>
      </div>

      <!-- Quick amount buttons -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 24px;">
        ${type === 'deposit' ? `
          <button class="quick-amount" data-amount="100000">100K</button>
          <button class="quick-amount" data-amount="500000">500K</button>
          <button class="quick-amount" data-amount="1000000">1M</button>
        ` : `
          <button class="quick-amount" data-amount="${Math.min(100000, this.currentBalance)}">100K</button>
          <button class="quick-amount" data-amount="${Math.min(500000, this.currentBalance)}">500K</button>
          <button class="quick-amount" data-amount="${this.currentBalance}">Tất cả</button>
        `}
      </div>

      <div style="display: flex; gap: 12px;">
        <button id="cancel-btn" style="
          flex: 1;
          padding: 16px;
          border: 2px solid var(--border-color);
          border-radius: var(--border-radius-default);
          background: transparent;
          color: var(--primary-text-color);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        ">Hủy</button>
        <button id="confirm-btn" style="
          flex: 1;
          padding: 16px;
          border: none;
          border-radius: var(--border-radius-default);
          background: ${type === 'deposit' ? '#4CAF50' : '#FF5722'};
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        ">${this.isPhpConnected ? 'Xác nhận' : 'Demo'}</button>
      </div>
    `;

    this.setupTransactionModalEvents(modal, modalContainer, onConfirm);
    modalContainer.appendChild(modal);
    document.body.appendChild(modalContainer);
  }

  private setupTransactionModalEvents(modal: HTMLElement, modalContainer: HTMLElement, onConfirm: (amount: number) => void) {
    const amountInput = modal.querySelector('#amount-input') as HTMLInputElement;
    const confirmBtn = modal.querySelector('#confirm-btn') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('#cancel-btn') as HTMLButtonElement;
    const quickAmountBtns = modal.querySelectorAll('.quick-amount');

    // Add styles for quick amount buttons
    const style = document.createElement('style');
    style.textContent = `
      .quick-amount {
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-default);
        background: var(--surface-color);
        color: var(--primary-text-color);
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 14px;
        font-family: inherit;
      }
      .quick-amount:hover {
        background: var(--background-color-active);
        border-color: var(--accent-color);
      }
      .quick-amount.selected {
        background: var(--accent-color);
        color: white;
        border-color: var(--accent-color);
      }
    `;
    document.head.appendChild(style);

    // Quick amount selection
    quickAmountBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        quickAmountBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        amountInput.value = btn.getAttribute('data-amount') || '';
      });
    });

    // Input validation
    amountInput.addEventListener('input', () => {
      quickAmountBtns.forEach(b => b.classList.remove('selected'));
      const amount = parseFloat(amountInput.value);
      const isValid = amount >= 10000 && amount <= this.currentBalance;
      confirmBtn.disabled = !isValid;
      confirmBtn.style.opacity = isValid ? '1' : '0.5';
    });

    confirmBtn.addEventListener('click', () => {
      const amount = parseFloat(amountInput.value);
      if(amount >= 10000) {
        onConfirm(amount);
        document.body.removeChild(modalContainer);
        document.head.removeChild(style);
      }
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(modalContainer);
      document.head.removeChild(style);
    });

    modalContainer.addEventListener('click', (e) => {
      if(e.target === modalContainer) {
        document.body.removeChild(modalContainer);
        document.head.removeChild(style);
      }
    });

    setTimeout(() => amountInput.focus(), 100);
  }

  // Profile Modal Methods (stub implementations)
  private openBankAccountModal() { this.showComingSoonModal('Tài khoản ngân hàng'); }
  private openRankingHistoryModal() { this.showComingSoonModal('Lịch sử xếp hạng'); }
  private openServiceHistoryModal() { this.showComingSoonModal('Lịch sử dịch vụ'); }
  private openPersonalCenterModal() { this.showComingSoonModal('Trung tâm cá nhân'); }
  private openNotificationModal() { this.showComingSoonModal('Thông báo'); }
  private openSupportModal() { this.showComingSoonModal('Liên hệ CSKH'); }

  private showComingSoonModal(feature: string) {
    const modalContainer = document.createElement('div');
    modalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(4px);
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
      background: var(--background-color);
      border-radius: var(--border-radius-big);
      padding: 32px;
      max-width: 300px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;

    modal.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px;">🚧</div>
      <h3 style="margin: 0 0 16px 0; color: var(--primary-text-color);">${feature}</h3>
      <p style="color: var(--secondary-text-color); margin-bottom: 24px;">
        Tính năng đang được phát triển.<br>
        ${this.isPhpConnected ? 'Sẽ có trong phiên bản tiếp theo!' : 'Cần kết nối PHP để sử dụng.'}
      </p>
      <button id="close-btn" style="
        padding: 12px 24px;
        background: var(--accent-color);
        color: white;
        border: none;
        border-radius: var(--border-radius-default);
        font-weight: 600;
        cursor: pointer;
        font-family: inherit;
      ">Đóng</button>
    `;

    modalContainer.appendChild(modal);
    document.body.appendChild(modalContainer);

    const closeBtn = modal.querySelector('#close-btn');
    closeBtn.addEventListener('click', () => document.body.removeChild(modalContainer));
    modalContainer.addEventListener('click', (e) => {
      if(e.target === modalContainer) document.body.removeChild(modalContainer);
    });
  }

  // Transaction History
  private renderTransactionHistory(limit: number = 5) {
    if(!this.historyContainer) return;

    this.historyContainer.innerHTML = '';

    if(this.transactionHistory.length === 0) {
      this.historyContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--secondary-text-color);">
          <div style="width: 48px; height: 48px; margin: 0 auto 16px auto; opacity: 0.5; color: var(--secondary-text-color);">
            ${this.getSvgIcon('document')}
          </div>
          <div style="font-size: 16px; font-weight: 500;">Chưa có giao dịch nào</div>
          <div style="font-size: 14px; margin-top: 8px;">Giao dịch của bạn sẽ xuất hiện ở đây</div>
        </div>
      `;
      return;
    }

    const recentTransactions = this.transactionHistory.slice(0, limit);
    recentTransactions.forEach(transaction => {
      const item = this.createTransactionItem(transaction);
      this.historyContainer.appendChild(item);
    });

    if(this.transactionHistory.length > limit) {
      const viewAllBtn = document.createElement('button');
      viewAllBtn.style.cssText = `
        width: 100%;
        padding: 16px;
        background: var(--surface-color);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-default);
        color: var(--accent-color);
        font-weight: 600;
        cursor: pointer;
        margin-top: 12px;
        transition: all 0.2s;
        font-family: inherit;
      `;
      viewAllBtn.textContent = `Xem tất cả (${this.transactionHistory.length} giao dịch)`;
      attachClickEvent(viewAllBtn, () => this.renderTransactionHistory(this.transactionHistory.length), {listenerSetter: this.listenerSetter});
      this.historyContainer.appendChild(viewAllBtn);
    }
  }

  private createTransactionItem(transaction: WalletTransaction): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      padding: 16px;
      margin: 8px 0;
      background: var(--surface-color);
      border-radius: var(--border-radius-default);
      border-left: 4px solid ${this.getTransactionColor(transaction.type)};
      transition: all 0.2s;
      cursor: pointer;
      border: 1px solid var(--border-color);
    `;

    const icon = this.getTransactionIcon(transaction.type);
    const sign = ['deposit', 'transfer_in'].includes(transaction.type) ? '+' : '-';
    const color = ['deposit', 'transfer_in'].includes(transaction.type) ? '#4CAF50' : '#FF5722';

    item.innerHTML = `
      <div style="width: 28px; height: 28px; margin-right: 16px; padding: 8px; background: ${color}20; border-radius: 8px; color: ${color};">
        ${icon}
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; color: var(--primary-text-color); margin-bottom: 4px;">${transaction.description}</div>
        <div style="font-size: 13px; color: var(--secondary-text-color); display: flex; align-items: center; gap: 8px;">
          <span>${new Date(transaction.timestamp).toLocaleString('vi-VN')}</span>
          <span style="width: 4px; height: 4px; background: var(--secondary-text-color); border-radius: 50%;"></span>
          <span style="color: ${this.getStatusColor(transaction.status)};">${this.getStatusText(transaction.status)}</span>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: bold; font-size: 16px; color: ${color};">
          ${sign}${this.formatCurrency(transaction.amount)}
        </div>
        ${transaction.balance_after !== undefined ? `
          <div style="font-size: 12px; color: var(--secondary-text-color);">
            Số dư: ${this.formatCurrency(transaction.balance_after)}
          </div>
        ` : ''}
      </div>
    `;

    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'var(--background-color-active)';
      item.style.transform = 'translateY(-1px)';
      item.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
    });

    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'var(--surface-color)';
      item.style.transform = 'translateY(0)';
      item.style.boxShadow = 'none';
    });

    return item;
  }

  // Utility Methods
  private updateBalanceDisplay() {
    if(this.balanceDisplay) {
      this.balanceDisplay.textContent = this.formatCurrency(this.currentBalance);
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  private getCreditColor(): string {
    const score = this.userProfile?.credit_score || 0;
    if(score >= 750) return '#4CAF50';
    if(score >= 700) return '#8BC34A';
    if(score >= 650) return '#FFC107';
    if(score >= 600) return '#FF9800';
    return '#F44336';
  }

  private getTransactionIcon(type: string): string {
    const icons = {
      'deposit': this.getSvgIcon('deposit'),
      'withdraw': this.getSvgIcon('withdraw'),
      'transfer_in': this.getSvgIcon('transfer'),
      'transfer_out': this.getSvgIcon('transfer')
    };
    return icons[type] || this.getSvgIcon('wallet');
  }

  private getTransactionColor(type: string): string {
    const colors = {
      'deposit': '#4CAF50',
      'withdraw': '#FF5722',
      'transfer_in': '#2196F3',
      'transfer_out': '#FF9800'
    };
    return colors[type] || '#666';
  }

  private getStatusColor(status: string): string {
    const colors = {
      'completed': '#4CAF50',
      'pending': '#FF9800',
      'failed': '#F44336'
    };
    return colors[status] || '#666';
  }

  private getStatusText(status: string): string {
    const texts = {
      'completed': 'Hoàn thành',
      'pending': 'Đang xử lý',
      'failed': 'Thất bại'
    };
    return texts[status] || status;
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
      color: white;
      padding: 16px 20px;
      border-radius: var(--border-radius-default);
      font-weight: 600;
      z-index: 10001;
      transform: translateX(400px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 300px;
      font-family: inherit;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 18px; height: 18px;">
          ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
        </div>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);
    requestAnimationFrame(() => notification.style.transform = 'translateX(0)');

    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if(document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  private initializeEventListeners() {
    this.addWalletAnimations();
  }

  private addWalletAnimations() {
    const styleId = 'wallet-animations';
    if(document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(180deg); }
      }
    `;
    document.head.appendChild(style);
  }

  // SVG Icons
  private getSvgIcon(name: string): string {
    const icons = {
      wallet: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="6" width="18" height="12" rx="3" stroke="currentColor" stroke-width="1.8"/>
        <path d="M17 10h-1a2 2 0 0 0-2 2v0a2 2 0 0 0 2 2h1" stroke="currentColor" stroke-width="1.8"/>
        <circle cx="16.5" cy="12" r="0.8" fill="currentColor"/>
        <path d="M6 6V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="1.8"/>
      </svg>`,
      bank: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3l9 4v2H3V7l9-4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <path d="M5 10v7h2V10M9 10v7h2V10M13 10v7h2V10M17 10v7h2V10" stroke="currentColor" stroke-width="2"/>
        <path d="M3 19h18v2H3z" stroke="currentColor" stroke-width="2"/>
      </svg>`,
      deposit: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2v6m0 0l-3-3m3 3l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
      </svg>`,
      withdraw: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 22v-6m0 0l-3 3m3-3l3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="2" y="6" width="20" height="12" rx="3" stroke="currentColor" stroke-width="2"/>
      </svg>`,
      transfer: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 16l3-3-3-3M14 8l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
      </svg>`,
      ranking: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
      </svg>`,
      history: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3v5h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3.05 13a9 9 0 1 0 3.3-8.92L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 7v5l4 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      user: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="2"/>
      </svg>`,
      notification: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`,
      support: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="17" r="1" fill="currentColor"/>
      </svg>`,
      document: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2"/>
        <polyline points="14,2 14,8 20,8" stroke="currentColor" stroke-width="2"/>
        <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" stroke-width="2"/>
        <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" stroke-width="2"/>
      </svg>`
    };
    return icons[name] || icons.wallet;
  }

  public onCloseAfterTimeout() {
    return super.onCloseAfterTimeout();
  }
}