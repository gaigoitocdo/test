/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import {SliderSuperTab} from '../../slider';
import ButtonMenuToggle from '../../buttonMenuToggle';
import AppPrivacyAndSecurityTab from './privacyAndSecurity';
import AppGeneralSettingsTab from './generalSettings';
import AppEditProfileTab from './editProfile';
import AppChatFoldersTab from './chatFolders';
import AppNotificationsTab from './notifications';
import AppLanguageTab from './language';
import lottieLoader from '../../../lib/rlottie/lottieLoader';
import PopupPeer from '../../popups/peer';
import AppDataAndStorageTab from './dataAndStorage';
import ButtonIcon from '../../buttonIcon';
import PeerProfile from '../../peerProfile';
import rootScope from '../../../lib/rootScope';
import Row from '../../row';
import AppActiveSessionsTab from './activeSessions';
import {i18n, LangPackKey} from '../../../lib/langPack';
import {SliderSuperTabConstructable, SliderSuperTabEventable} from '../../sliderTab';
import PopupAvatar from '../../popups/avatar';
import {AccountAuthorizations, Authorization} from '../../../layer';
import PopupElement from '../../popups';
import {attachClickEvent} from '../../../helpers/dom/clickEvent';
import SettingSection from '../../settingSection';
import AppStickersAndEmojiTab from './stickersAndEmoji';
import ButtonCorner from '../../buttonCorner';
import PopupPremium from '../../popups/premium';
import appImManager from '../../../lib/appManagers/appImManager';
import apiManagerProxy from '../../../lib/mtproto/mtprotoworker';
import {createEffect, createRoot} from 'solid-js';
import useStars from '../../../stores/stars';
import PopupStars from '../../popups/stars';
// ✅ NEW: Import Wallet components
import AppWalletTab from './wallet';

export default class AppSettingsTab extends SliderSuperTab {
  private buttons: {
    edit: HTMLButtonElement,
    folders: HTMLButtonElement,
    general: HTMLButtonElement,
    notifications: HTMLButtonElement,
    storage: HTMLButtonElement,
    privacy: HTMLButtonElement,
  } = {} as any;
  private profile: PeerProfile;

  private languageRow: Row;
  private devicesRow: Row;
  private premiumRow: Row;
  // ✅ NEW: Wallet row
  private walletRow: Row;
  private walletPreviewCard: HTMLElement;

  private authorizations: Authorization.authorization[];
  private getAuthorizationsPromise: Promise<AccountAuthorizations.accountAuthorizations>;

  public async init() {
    this.container.classList.add('settings-container');
    this.setTitle('Settings');

    const btnMenu = ButtonMenuToggle({
      listenerSetter: this.listenerSetter,
      direction: 'bottom-left',
      buttons: [{
        icon: 'logout',
        text: 'EditAccount.Logout',
        onClick: () => {
          PopupElement.createPopup(PopupPeer, 'logout', {
            titleLangKey: 'LogOut',
            descriptionLangKey: 'LogOut.Description',
            buttons: [{
              langKey: 'LogOut',
              callback: () => {
                this.managers.apiManager.logOut();
              },
              isDanger: true
            }]
          }).show();
        }
      }]
    });

    this.buttons.edit = ButtonIcon('edit');

    this.header.append(this.buttons.edit, btnMenu);

    this.profile = new PeerProfile(
      this.managers,
      this.scrollable,
      this.listenerSetter,
      false,
      this.container,
      (has) => {
        let last = this.profile.element.lastElementChild;
        if(has) {
          last = last.previousElementSibling;
        }

        last.firstElementChild.append(changeAvatarBtn);
      }
    );
    this.profile.init();
    this.profile.setPeer(rootScope.myId);
    const fillPromise = this.profile.fillProfileElements();

    const changeAvatarBtn = ButtonCorner({icon: 'cameraadd', className: 'profile-change-avatar'});
    attachClickEvent(changeAvatarBtn, () => {
      const canvas = document.createElement('canvas');
      PopupElement.createPopup(PopupAvatar).open(canvas, (upload) => {
        upload().then((inputFile) => {
          return this.managers.appProfileManager.uploadProfilePhoto(inputFile);
        });
      });
    }, {listenerSetter: this.listenerSetter});
    this.profile.element.lastElementChild.firstElementChild.append(changeAvatarBtn);

    const updateChangeAvatarBtn = async() => {
      const user = await this.managers.appUsersManager.getSelf();
      changeAvatarBtn.classList.toggle('hide', user.photo?._ !== 'userProfilePhoto');
    };

    updateChangeAvatarBtn();
    this.listenerSetter.add(rootScope)('avatar_update', ({peerId}) => {
      if(rootScope.myId === peerId) {
        updateChangeAvatarBtn();
      }
    });

    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList.add('profile-buttons');

    type ConstructorP<T> = T extends {
      new (...args: any[]): infer U;
    } ? U : never;

    const m = <T extends SliderSuperTabConstructable>(
      icon: Icon,
      text: LangPackKey,
      c: T,
      getInitArgs?: () => Promise<Parameters<ConstructorP<T>['init']>>
    ): {
      icon: Icon,
      text: LangPackKey,
      tabConstructor: T,
      getInitArgs?: typeof getInitArgs,
      args?: any
    } => {
      if(!getInitArgs) {
        const g = (c as any as typeof SliderSuperTab).getInitArgs;
        if(g) {
          // @ts-ignore
          getInitArgs = () => [g(this)];
        }
      }

      return {
        icon,
        text,
        tabConstructor: c,
        getInitArgs,
        args: getInitArgs?.()
      };
    };

    const b = [
      m('unmute', 'AccountSettings.Notifications', AppNotificationsTab),
      m('data', 'DataSettings', AppDataAndStorageTab),
      m('lock', 'AccountSettings.PrivacyAndSecurity', AppPrivacyAndSecurityTab),
      m('settings', 'Telegram.GeneralSettingsViewController', AppGeneralSettingsTab),
      m('folder', 'AccountSettings.Filters', AppChatFoldersTab),
      m('stickers_face', 'StickersName', AppStickersAndEmojiTab)
    ];

    const rows = b.map((item) => {
      const {icon, text: langPackKey, tabConstructor, getInitArgs} = item;
      return new Row({
        titleLangKey: langPackKey,
        icon,
        clickable: async() => {
          const args = item.args ? await item.args : [];
          const tab = this.slider.createTab(tabConstructor as any);
          tab.open(...args);

          if(tab instanceof SliderSuperTabEventable && getInitArgs) {
            (tab as SliderSuperTabEventable).eventListener.addEventListener('destroyAfter', (promise) => {
              item.args = promise.then(() => getInitArgs() as any);
            });
          }
        },
        listenerSetter: this.listenerSetter
      });
    });

    const languageArgs = AppLanguageTab.getInitArgs();
    rows.push(
      this.devicesRow = new Row({
        titleLangKey: 'Devices',
        titleRightSecondary: ' ',
        icon: 'activesessions',
        clickable: async() => {
          if(!this.authorizations) {
            await this.updateActiveSessions();
          }

          const tab = this.slider.createTab(AppActiveSessionsTab);
          tab.authorizations = this.authorizations;
          tab.eventListener.addEventListener('destroy', () => {
            this.authorizations = undefined;
            this.updateActiveSessions(true);
          }, {once: true});
          tab.open();
        },
        listenerSetter: this.listenerSetter
      }),
      this.languageRow = new Row({
        titleLangKey: 'AccountSettings.Language',
        titleRightSecondary: i18n('LanguageName'),
        icon: 'language',
        clickable: () => {
          this.slider.createTab(AppLanguageTab).open(languageArgs);
        },
        listenerSetter: this.listenerSetter
      })
    );

    buttonsDiv.append(...rows.map((row) => row.container));

    this.premiumRow = new Row({
      titleLangKey: 'Premium.Boarding.Title',
      icon: 'star',
      iconClasses: ['row-icon-premium-color'],
      clickable: () => {
        PopupPremium.show();
      },
      listenerSetter: this.listenerSetter
    });

    const starsRow = new Row({
      titleLangKey: 'MenuTelegramStars',
      titleRightSecondary: true,
      icon: 'star',
      iconClasses: ['row-icon-stars-color'],
      clickable: () => {
        PopupElement.createPopup(PopupStars);
      },
      listenerSetter: this.listenerSetter
    });

    createRoot((dispose) => {
      this.middlewareHelper.onDestroy(dispose);
      const stars = useStars();
      createEffect(() => {
        starsRow.titleRight.textContent = '' + stars();
        starsRow.container.classList.toggle('hide', !stars());
      });
    });

    const giftPremium = new Row({
      titleLangKey: 'GiftPremiumGifting',
      icon: 'gift',
      clickable: () => {
        appImManager.initGifting();
      },
      listenerSetter: this.listenerSetter
    });

    const badge = i18n('New');
    badge.classList.add('row-title-badge');
    giftPremium.title.append(badge);

    // ✅ FIXED: Initialize wallet data first, then create section
    this.initializeWallet();

    // ✅ NEW: Create Wallet Section
    const walletSection = this.createWalletSection();
    const buttonsSection = new SettingSection();
    buttonsSection.content.append(buttonsDiv);

    let premiumSection: SettingSection;
    if(!await apiManagerProxy.isPremiumPurchaseBlocked()) {
      premiumSection = new SettingSection();
      premiumSection.content.append(this.premiumRow.container, starsRow.container, giftPremium.container);
    }

    // ✅ FIXED: Ensure wallet section is properly appended and visible
    this.scrollable.append(...[
      this.profile.element,
      walletSection.container, // ✅ Add wallet section right after profile
      buttonsSection.container,
      premiumSection?.container
    ].filter(Boolean));

    const getEditProfileArgs = () => {
      editProfileArgs = AppEditProfileTab.getInitArgs();
    };
    let editProfileArgs: ReturnType<typeof AppEditProfileTab['getInitArgs']>;
    attachClickEvent(this.buttons.edit, () => {
      const tab = this.slider.createTab(AppEditProfileTab);
      tab.open(editProfileArgs);
    }, {listenerSetter: this.listenerSetter});
    getEditProfileArgs();

    this.listenerSetter.add(rootScope)('user_update', (userId) => {
      if(rootScope.myId.toUserId() === userId) {
        getEditProfileArgs();
      }
    });

    lottieLoader.loadLottieWorkers();
    this.updateActiveSessions();

    (await fillPromise)();

    // ✅ FIXED: Force update wallet display after everything is loaded
    setTimeout(() => {
      this.updateWallet();
    }, 100);
  }

  // ✅ FIXED: Create Wallet Section with better error handling
  private createWalletSection(): SettingSection {
    const walletSection = new SettingSection({
      name: 'Telegram Wallet',
      caption: 'Quản lý tài chính và thanh toán'
    });

    try {
      // Wallet preview card
      this.walletPreviewCard = document.createElement('div');
      this.walletPreviewCard.className = 'wallet-preview-card';
      this.walletPreviewCard.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 20px;
        color: white;
        margin: 12px 0;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        border: none;
        box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
        display: block;
        width: 100%;
      `;

      this.updateWalletPreview();

      // Hover effects
      this.walletPreviewCard.addEventListener('mouseenter', () => {
        this.walletPreviewCard.style.transform = 'translateY(-4px)';
        this.walletPreviewCard.style.boxShadow = '0 8px 30px rgba(102, 126, 234, 0.4)';
      });

      this.walletPreviewCard.addEventListener('mouseleave', () => {
        this.walletPreviewCard.style.transform = 'translateY(0)';
        this.walletPreviewCard.style.boxShadow = '0 4px 20px rgba(102, 126, 234, 0.3)';
      });

      // Click to open wallet
      attachClickEvent(this.walletPreviewCard, () => {
        const tab = this.slider.createTab(AppWalletTab);
        tab.open();
      }, {listenerSetter: this.listenerSetter});

      // Quick action buttons
      const quickActions = document.createElement('div');
      quickActions.style.cssText = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-top: 12px;
      `;

      const createQuickAction = (icon: string, text: string, className: string, action: () => void) => {
        const btn = document.createElement('button');
        btn.className = `wallet-quick-action ${className}`;
        btn.style.cssText = `
          background: var(--surface-color);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 14px 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          font-size: 12px;
          font-weight: 500;
          color: var(--primary-text-color);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        `;

        btn.innerHTML = `
          <div style="font-size: 20px;">${icon}</div>
          <div>${text}</div>
        `;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          action();
        });

        btn.addEventListener('mouseenter', () => {
          btn.style.backgroundColor = 'var(--background-color-active)';
          btn.style.transform = 'translateY(-2px)';
          btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        });

        btn.addEventListener('mouseleave', () => {
          btn.style.backgroundColor = 'var(--surface-color)';
          btn.style.transform = 'translateY(0)';
          btn.style.boxShadow = 'none';
        });

        return btn;
      };

      const depositBtn = createQuickAction('💳', 'Nạp tiền', 'deposit', () => {
        const tab = this.slider.createTab(AppWalletTab);
        tab.open();
        setTimeout(() => {
          (tab as any).openDepositModal?.();
        }, 300);
      });

      const withdrawBtn = createQuickAction('💸', 'Rút tiền', 'withdraw', () => {
        const tab = this.slider.createTab(AppWalletTab);
        tab.open();
        setTimeout(() => {
          (tab as any).openWithdrawModal?.();
        }, 300);
      });

      const historyBtn = createQuickAction('📊', 'Lịch sử', 'history', () => {
        const tab = this.slider.createTab(AppWalletTab);
        tab.open();
        setTimeout(() => {
          (tab as any).showTransactionHistory?.();
        }, 300);
      });

      quickActions.appendChild(depositBtn);
      quickActions.appendChild(withdrawBtn);
      quickActions.appendChild(historyBtn);

      // Wallet row for settings list
      this.walletRow = new Row({
        title: 'Cài đặt Ví',
        subtitle: 'Quản lý bảo mật và giới hạn',
        icon: 'wallet',
        clickable: () => {
          const tab = this.slider.createTab(AppWalletTab);
          tab.open();
        },
        listenerSetter: this.listenerSetter
      });

      // Add balance indicator to wallet row
      this.updateWalletRowBalance();

      walletSection.content.append(
        this.walletPreviewCard,
        quickActions,
        this.walletRow.container
      );
    } catch(error) {
      console.error('Error creating wallet section:', error);
      // Fallback: create simple wallet row only
      this.walletRow = new Row({
        title: 'Telegram Wallet',
        subtitle: 'Quản lý tài chính',
        icon: 'wallet',
        clickable: () => {
          const tab = this.slider.createTab(AppWalletTab);
          tab.open();
        },
        listenerSetter: this.listenerSetter
      });
      walletSection.content.append(this.walletRow.container);
    }

    return walletSection;
  }

  // ✅ FIXED: Wallet helper methods with better error handling
  private loadWalletBalance(): number {
    try {
      const walletData = localStorage.getItem('telegram_wallet_data');
      if(walletData) {
        const data = JSON.parse(walletData);
        return data.balance || 0;
      }
    } catch(error) {
      console.error('Error loading wallet balance:', error);
    }
    return 0;
  }

  private formatCurrency(amount: number): string {
    if(amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M VNĐ';
    } else if(amount >= 1000) {
      return (amount / 1000).toFixed(0) + 'K VNĐ';
    } else {
      return amount.toLocaleString('vi-VN') + ' VNĐ';
    }
  }

  private formatCurrencyFull(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  private updateWalletPreview() {
    if(!this.walletPreviewCard) return;

    const balance = this.loadWalletBalance();
    const walletData = this.getWalletData();

    this.walletPreviewCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 2;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 24px;">💰</span>
            <div>
              <div style="font-weight: 700; font-size: 18px;">Telegram Wallet</div>
              <div style="font-size: 12px; opacity: 0.9;">ID: ${walletData.address || 'Generating...'}</div>
            </div>
          </div>
          <div style="font-size: 28px; font-weight: 800; margin: 8px 0;">
            ${this.formatCurrency(balance)}
          </div>
          <div style="font-size: 13px; opacity: 0.8; display: flex; align-items: center; gap: 12px;">
            <span>💳 Nạp tiền</span>
            <span>•</span>
            <span>💸 Rút tiền</span>
            <span>•</span>
            <span>🔄 Chuyển khoản</span>
          </div>
        </div>
        <div style="color: rgba(255,255,255,0.9); font-size: 18px; margin-left: 10px;">›</div>
      </div>
      
      <!-- Decorative background elements -->
      <div style="position: absolute; top: -30px; right: -30px; width: 120px; height: 120px; background: rgba(255,255,255,0.1); border-radius: 50%; z-index: 1;"></div>
      <div style="position: absolute; bottom: -40px; left: -20px; width: 80px; height: 80px; background: rgba(255,255,255,0.05); border-radius: 50%; z-index: 1;"></div>
      <div style="position: absolute; top: 20px; right: 100px; width: 40px; height: 40px; background: rgba(255,255,255,0.08); border-radius: 50%; z-index: 1;"></div>
    `;
  }

  private updateWalletRowBalance() {
    if(!this.walletRow) return;

    const balance = this.loadWalletBalance();
    this.walletRow.titleRight.textContent = this.formatCurrency(balance);
  }

  private getWalletData() {
    try {
      const walletData = localStorage.getItem('telegram_wallet_data');
      if(walletData) {
        return JSON.parse(walletData);
      }
    } catch(error) {
      console.error('Error loading wallet data:', error);
    }

    // Generate default wallet data
    const defaultData = {
      balance: 1250000, // ✅ Default demo balance: 1,250,000 VNĐ
      address: this.generateWalletAddress(),
      transactions: this.generateDemoTransactions(),
      lastUpdated: Date.now()
    };

    localStorage.setItem('telegram_wallet_data', JSON.stringify(defaultData));
    return defaultData;
  }

  // ✅ NEW: Generate demo transactions for initial display
  private generateDemoTransactions() {
    return [
      {
        id: 'tx_' + Date.now() + '_1',
        type: 'deposit',
        amount: 500000,
        timestamp: Date.now() - 86400000, // 1 day ago
        status: 'completed',
        description: 'Nạp tiền từ ngân hàng',
        balance_before: 750000,
        balance_after: 1250000,
        method: 'bank_transfer',
        account: 'VCB **** 1234'
      },
      {
        id: 'tx_' + Date.now() + '_2',
        type: 'transfer_out',
        amount: 150000,
        timestamp: Date.now() - 172800000, // 2 days ago
        status: 'completed',
        description: 'Chuyển tiền cho @user123',
        balance_before: 900000,
        balance_after: 750000
      },
      {
        id: 'tx_' + Date.now() + '_3',
        type: 'withdraw',
        amount: 200000,
        timestamp: Date.now() - 259200000, // 3 days ago
        status: 'completed',
        description: 'Rút tiền về tài khoản',
        balance_before: 1100000,
        balance_after: 900000,
        method: 'bank_transfer',
        account: 'VCB **** 1234'
      }
    ];
  }

  private generateWalletAddress(): string {
    const prefix = 'TG';
    const randomPart = Math.random().toString(36).substring(2, 15).toUpperCase();
    return `${prefix}${randomPart}`;
  }

  // ✅ FIXED: Initialize wallet with better error handling
  private initializeWallet() {
    try {
      // Initialize wallet data if not exists
      this.getWalletData();

      // Listen for wallet updates
      window.addEventListener('storage', (e) => {
        if(e.key === 'telegram_wallet_data') {
          this.updateWalletPreview();
          this.updateWalletRowBalance();
        }
      });

      // Listen for custom wallet events
      window.addEventListener('wallet-update', () => {
        this.updateWalletPreview();
        this.updateWalletRowBalance();
      });

      // Auto-refresh every 30 seconds
      setInterval(() => {
        this.updateWalletPreview();
        this.updateWalletRowBalance();
      }, 30000);

      // Add wallet notification styles
      this.addWalletStyles();

      console.log('✅ Wallet initialized successfully');
    } catch(error) {
      console.error('❌ Error initializing wallet:', error);
    }
  }

  private addWalletStyles() {
    const styleId = 'telegram-wallet-styles';
    if(document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .wallet-preview-card {
        --wallet-primary: #667eea;
        --wallet-secondary: #764ba2;
      }
      
      .wallet-quick-action {
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      }
      
      .wallet-quick-action:active {
        transform: translateY(0px) scale(0.98) !important;
      }
      
      .wallet-notification {
        animation: wallet-pulse 0.6s ease-out;
      }
      
      @keyframes wallet-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .wallet-balance-update {
        animation: wallet-balance-highlight 1s ease-out;
      }
      
      @keyframes wallet-balance-highlight {
        0% { background-color: transparent; }
        50% { background-color: rgba(102, 126, 234, 0.2); }
        100% { background-color: transparent; }
      }
      
      /* Dark mode support */
      .night .wallet-quick-action {
        background: var(--surface-color) !important;
        border-color: var(--border-color) !important;
        color: var(--primary-text-color) !important;
      }
      
      .night .wallet-quick-action:hover {
        background: var(--background-color-active) !important;
      }
      
      /* Responsive design */
      @media (max-width: 480px) {
        .wallet-preview-card {
          padding: 16px !important;
          margin: 8px 0 !important;
        }
        
        .wallet-quick-action {
          padding: 10px 6px !important;
          font-size: 11px !important;
        }
      }

      /* ✅ Ensure wallet section is visible */
      .wallet-preview-card {
        opacity: 1 !important;
        visibility: visible !important;
        display: block !important;
      }
      
      .wallet-quick-action {
        opacity: 1 !important;
        visibility: visible !important;
      }
    `;

    document.head.appendChild(style);
  }

  // ✅ PUBLIC: Methods for external wallet updates
  public updateWallet() {
    try {
      this.updateWalletPreview();
      this.updateWalletRowBalance();

      // Add visual feedback
      if(this.walletPreviewCard) {
        this.walletPreviewCard.classList.add('wallet-notification');
        setTimeout(() => {
          this.walletPreviewCard.classList.remove('wallet-notification');
        }, 600);
      }

      console.log('✅ Wallet display updated');
    } catch(error) {
      console.error('❌ Error updating wallet:', error);
    }
  }

  public showWalletNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#F44336' : '#2196F3'};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      font-weight: 600;
      z-index: 10001;
      transform: translateX(400px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 300px;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 18px;">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if(document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 4000);
  }

  private getAuthorizations(overwrite?: boolean) {
    if(this.getAuthorizationsPromise && !overwrite) return this.getAuthorizationsPromise;

    const promise = this.getAuthorizationsPromise = this.managers.apiManager.invokeApi('account.getAuthorizations')
    .finally(() => {
      if(this.getAuthorizationsPromise === promise) {
        this.getAuthorizationsPromise = undefined;
      }
    });

    return promise;
  }

  public updateActiveSessions(overwrite?: boolean) {
    return this.getAuthorizations(overwrite).then((auths) => {
      this.authorizations = auths.authorizations;
      this.devicesRow.titleRight.textContent = '' + this.authorizations.length;
    });
  }

  public onCloseAfterTimeout() {
    this.profile.destroy();
    return super.onCloseAfterTimeout();
  }
}
