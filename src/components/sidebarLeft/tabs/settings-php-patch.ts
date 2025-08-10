// settings-php-patch.ts - Patch cho Settings Tab để load PHP data

// Add this to the existing AppSettingsTab class in settings.ts

export class AppSettingsTabExtended extends AppSettingsTab {
  private phpProfileData: any = null;

  public async init() {
    // Call original init
    await super.init();
    
    // Add PHP integration
    await this.initPhpIntegration();
  }

  private async initPhpIntegration() {
    console.log('🔗 Initializing PHP integration in Settings...');
    
    try {
      // Load PHP profile data
      await this.loadPhpProfileData();
      
      // Update existing profile with PHP data
      this.updateProfileWithPhpData();
      
      // Setup auto-refresh
      this.setupPhpDataRefresh();
      
      console.log('✅ PHP integration initialized successfully');
    } catch (error) {
      console.error('❌ PHP integration failed:', error);
    }
  }

  private async loadPhpProfileData() {
    try {
      const response = await fetch('/api/profile-data.php', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.user) {
        this.phpProfileData = data.user;
        console.log('✅ PHP profile data loaded:', this.phpProfileData);
        return true;
      } else {
        throw new Error(data.message || 'Failed to load PHP profile');
      }
    } catch (error) {
      console.error('❌ Failed to load PHP profile:', error);
      return false;
    }
  }

  private updateProfileWithPhpData() {
    if (!this.phpProfileData) return;

    console.log('🔄 Updating profile with PHP data...');

    // Update wallet data with PHP profile info
    if (this.walletPreviewCard) {
      this.updateWalletWithPhpData();
    }

    // Update profile info if accessible
    this.updateProfileInfoWithPhpData();
  }

  private updateWalletWithPhpData() {
    if (!this.phpProfileData || !this.walletPreviewCard) return;

    const walletData = {
      balance: this.phpProfileData.balance || 0,
      username: this.phpProfileData.username || 'User', 
      vip_level: this.phpProfileData.vip_level || 'Basic',
      credit: this.phpProfileData.credit || 0,
      has_bank: this.phpProfileData.has_bank || false,
      address: this.phpProfileData.username || this.generateWalletAddress()
    };

    // Update wallet preview card content
    this.walletPreviewCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 2;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 24px;">💰</span>
            <div>
              <div style="font-weight: 700; font-size: 18px; display: flex; align-items: center;">
                ${walletData.username}
                ${walletData.vip_level !== 'Basic' ? `<div style="background: linear-gradient(45deg, #FFD700, #FFA500); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 8px;">VIP ${walletData.vip_level}</div>` : ''}
              </div>
              <div style="font-size: 12px; opacity: 0.9;">ID: ${walletData.address}</div>
            </div>
          </div>
          <div style="font-size: 28px; font-weight: 800; margin: 8px 0;">
            ${this.formatCurrency(walletData.balance)}
          </div>
          <div style="font-size: 13px; opacity: 0.8; display: flex; align-items: center; gap: 12px;">
            <span>💳 Balance: $${this.phpProfileData.balance_formatted || walletData.balance.toLocaleString()}</span>
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

    // Update wallet row balance
    if (this.walletRow && this.walletRow.titleRight) {
      this.walletRow.titleRight.textContent = this.formatCurrency(walletData.balance);
    }

    console.log('✅ Wallet updated with PHP data');
  }

  // Override the original wallet loading method
  private loadWalletBalance(): number {
    // Return PHP balance if available, otherwise fallback to original method
    if (this.phpProfileData && this.phpProfileData.balance !== undefined) {
      return this.phpProfileData.balance;
    }
    
    // Fallback to original method
    return super.loadWalletBalance ? super.loadWalletBalance() : 0;
  }

  private updateProfileInfoWithPhpData() {
    if (!this.phpProfileData || !this.profile) return;

    // Try to update profile elements
    setTimeout(() => {
      // Update profile name/username
      const profileElements = this.profile.element?.querySelectorAll('.profile-name, .user-name');
      profileElements?.forEach((el: HTMLElement) => {
        if (el && this.phpProfileData.username) {
          el.textContent = this.phpProfileData.username;
        }
      });

      // Update avatar if possible
      const avatarElements = this.profile.element?.querySelectorAll('.profile-avatar img, .user-avatar');
      avatarElements?.forEach((el: HTMLImageElement) => {
        if (el && this.phpProfileData.avatar_url) {
          el.src = this.phpProfileData.avatar_url;
        }
      });

    }, 100);
  }

  private setupPhpDataRefresh() {
    // Auto-refresh every 30 seconds
    setInterval(async () => {
      console.log('🔄 Auto-refreshing PHP profile data...');
      await this.loadPhpProfileData();
      this.updateProfileWithPhpData();
    }, 30000);

    // Listen for manual refresh events
    window.addEventListener('refreshPhpProfile', async () => {
      console.log('🔄 Manual PHP profile refresh requested');
      await this.loadPhpProfileData();
      this.updateProfileWithPhpData();
    });
  }

  // Override updateWallet to use PHP data
  public updateWallet() {
    if (this.phpProfileData) {
      this.updateWalletWithPhpData();
    } else {
      // Fallback to original method
      super.updateWallet();
    }
  }

  // Public method to get PHP profile data
  public getPhpProfileData() {
    return this.phpProfileData;
  }

  // Public method to manually refresh PHP data
  public async refreshPhpData() {
    await this.loadPhpProfileData();
    this.updateProfileWithPhpData();
    return this.phpProfileData;
  }
}

// Helper: Inject PHP bridge script
export function injectPhpBridge() {
  if (document.getElementById('php-settings-bridge')) return;

  const script = document.createElement('script');
  script.id = 'php-settings-bridge';
  script.src = '/js/settings-bridge.js';
  script.onload = () => {
    console.log('✅ PHP Settings Bridge loaded');
  };
  script.onerror = () => {
    console.error('❌ Failed to load PHP Settings Bridge');
  };
  
  document.head.appendChild(script);
}

// Auto-inject bridge when this module is imported
if (typeof window !== 'undefined') {
  injectPhpBridge();
}