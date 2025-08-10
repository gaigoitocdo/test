// src/components/sidebarLeft/tabs/telebookHome.ts
import SliderSuperTab from '../../sliderTab';

export default class AppTelebookHomeTab extends SliderSuperTab {
  private iframe: HTMLIFrameElement;
  // Sửa tiêu đề và thêm icon SVG xác minh của Telegram
  private currentTitle: string = 'Được kiểm duyệt bởi Telegram <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align: middle; margin-left: 4px;"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.329 7.676c-.07-.32-.314-.564-.634-.634-.434-.098-.87-.196-1.305-.295-.32-.07-.564-.314-.634-.634-.098-.434-.196-.87-.295-1.305-.07-.32-.314-.564-.634-.634-.434-.098-.87-.196-1.305-.295-.32-.07-.564-.314-.634-.634-.132-.603-.295-1.205-.492-1.808-.098-.3-.392-.494-.692-.494-.3 0-.595.194-.692.494-.197.603-.36 1.205-.492 1.808-.07.32-.314.564-.634.634-.434.098-.87.196-1.305.295-.32.07-.564.314-.634.634-.098.434-.196.87-.295 1.305-.07.32-.314.564-.634.634-.603.132-1.205.295-1.808.492-.3.098-.494.392-.494.692 0 .3.194.595.494.692.603.197 1.205.36 1.808.492.32.07.564.314.634.634.098.434.196.87.295 1.305.07.32.314.564.634.634.434.098.87.196 1.305.295.32.07.564.314.634.634.132.603.295 1.205.492 1.808.098.3.392.494.692.494.3 0 .595-.194.692-.494.197-.603.36-1.205.492-1.808.07-.32.314-.564.634-.634.434-.098.87-.196 1.305-.295.32-.07.564-.314.634-.634.098-.434.196-.87.295-1.305.07-.32.314-.564.634-.634.603-.132 1.205-.295 1.808-.492.3-.098.494-.392.494-.692 0-.3-.194-.595-.494-.692-.603-.197-1.205-.36-1.808-.492z" fill="#0088cc"/></svg>';

  protected init() {
    this.container.id = 'telebook-home-container';
    // Sử dụng innerHTML để render tiêu đề có SVG
    this.setTitle(this.currentTitle);
    this.setupTelebookLayout();
  }
  private setupTelebookLayout() {
    if (this.scrollable && this.scrollable.container) {
      this.scrollable.container.innerHTML = '';
    }

    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;

    // ✅ FIXED: Use consistent URL structure with booking
    this.iframe = document.createElement('iframe');
    this.iframe.src = 'https://elitegirls.pro/telebook/home'; // ✅ Matches router structure
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    `;

    console.log('🏠 Creating HOME Tab with URL:', this.iframe.src);

    this.iframe.onload = () => {
      console.log('✅ Telebook HOME loaded successfully at:', this.iframe.src);
      this.setupTelegramIntegration();
    };

    this.iframe.onerror = (error) => {
      console.error('❌ Failed to load Telebook HOME:', error);
      console.error('❌ Attempted URL:', this.iframe.src);
      this.showErrorState();
    };

    iframeContainer.appendChild(this.iframe);

    if (this.scrollable && this.scrollable.container) {
      this.scrollable.container.appendChild(iframeContainer);
    }

    this.setupMessageHandling();
  }

  private setupTelegramIntegration() {
    // Send Telegram context to iframe
    const telegramContext = {
      type: 'TELEGRAM_CONTEXT',
      data: {
        hasTopbar: true,
        theme: this.getTheme(),
        colors: this.getTelegramColors(),
        language: 'vi',
        apiEndpoint: '/api/telebook',
        page: 'home' // ✅ Specify this is home page
      }
    };

    console.log('📡 Sending HOME context to iframe:', telegramContext);
    this.iframe.contentWindow?.postMessage(telegramContext, '*');
  }

  private setupMessageHandling() {
    // Listen for messages from iframe
    window.addEventListener('message', (event) => {
      if (event.source !== this.iframe.contentWindow) return;

      console.log('📨 HOME Tab received message:', event.data);
      const { type, data } = event.data;

      switch (type) {
        case 'TELEGRAM_SET_TITLE':
          this.updateTelegramTitle(data.title);
          break;

        case 'TELEGRAM_SET_SUBTITLE':
          this.updateTelegramSubtitle(data.subtitle);
          break;

        case 'TELEGRAM_NAVIGATE':
          this.handleTelegramNavigation(data.url, data.params);
          break;

        case 'TELEGRAM_NOTIFICATION':
          this.showTelegramNotification(data.message, data.type);
          break;

        case 'TELEGRAM_BACK_BUTTON':
          this.handleBackButton(data.enabled, data.callback);
          break;

        case 'TELEGRAM_MENU_BUTTON':
          this.handleMenuButton(data.enabled, data.items);
          break;

        case 'TELEGRAM_LOADING':
          this.showTelegramLoading(data.show);
          break;

        case 'TELEGRAM_DEBUG':
          console.log('🐛 HOME Tab Debug:', data);
          break;
      }
    });
  }

  private updateTelegramTitle(title: string) {
    this.currentTitle = title;
    this.setTitle(title);
    console.log('📝 HOME Tab title updated:', title);

    // Update browser title if needed
    if (document.title.includes('Telebook')) {
      document.title = `${title} - Telegram Web`;
    }
  }

  private updateTelegramSubtitle(subtitle: string) {
    // Telegram doesn't have subtitle in topbar, but we can show it as a notification
    if (subtitle) {
      console.log('📝 HOME Tab subtitle:', subtitle);
      this.showTelegramNotification(subtitle, 'info');
    }
  }

  private handleTelegramNavigation(url: string, params: any = {}) {
    console.log('🧭 HOME Tab navigation:', url, params);

    if (url.startsWith('/telebook/')) {
      // Navigate within iframe
      const fullUrl = `https://elitegirls.pro${url.replace('/telebook', '')}`;
      if (params && Object.keys(params).length > 0) {
        const urlParams = new URLSearchParams(params);
        this.iframe.src = `${fullUrl}?${urlParams.toString()}`;
      } else {
        this.iframe.src = fullUrl;
      }
      console.log('🔄 HOME Tab navigating to:', this.iframe.src);
    } else if (url.startsWith('telegram://')) {
      // Handle Telegram-specific URLs
      this.handleTelegramSpecificUrl(url);
    }
  }

  private handleTelegramSpecificUrl(url: string) {
    // Handle special Telegram URLs like telegram://chat, telegram://user, etc.
    console.log('📱 HOME Tab handling Telegram URL:', url);

    if (url.includes('telegram://back')) {
      this.onClose();
    } else if (url.includes('telegram://menu')) {
      this.showContextMenu();
    }
  }

  private showTelegramNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    console.log('🔔 HOME Tab notification:', message, type);

    // Create Telegram-style toast notification
    const notification = document.createElement('div');
    notification.className = 'telegram-toast';

    const bgColor = {
      success: '#4CAF50',
      error: '#F44336',
      warning: '#FF9800',
      info: '#3390EC'
    }[type];

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${bgColor};
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transform: translateX(400px);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      max-width: 300px;
      word-wrap: break-word;
    `;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // Auto remove
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  private handleBackButton(enabled: boolean, callback?: string) {
    // Telegram automatically handles back button, we just need to register callback
    if (enabled && callback) {
      this.backButtonCallback = callback;
      console.log('⬅️ HOME Tab back button enabled:', callback);
    } else {
      this.backButtonCallback = null;
      console.log('⬅️ HOME Tab back button disabled');
    }
  }

  private backButtonCallback: string | null = null;

  private handleMenuButton(enabled: boolean, items?: any[]) {
    // Store menu items for context menu
    if (enabled && items) {
      this.contextMenuItems = items;
      console.log('📋 HOME Tab menu items set:', items);
    } else {
      this.contextMenuItems = null;
      console.log('📋 HOME Tab menu disabled');
    }
  }

  private contextMenuItems: any[] | null = null;

  private showContextMenu() {
    if (!this.contextMenuItems) {
      console.log('📋 No menu items available for HOME Tab');
      return;
    }

    console.log('📋 Showing HOME Tab context menu');

    // Create context menu (simplified implementation)
    const menu = document.createElement('div');
    menu.className = 'telegram-context-menu';
    menu.style.cssText = `
      position: fixed;
      top: 60px;
      right: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 1001;
      overflow: hidden;
      min-width: 200px;
    `;

    this.contextMenuItems.forEach((item, index) => {
      const menuItem = document.createElement('div');
      menuItem.className = 'telegram-menu-item';
      menuItem.style.cssText = `
        padding: 12px 16px;
        cursor: pointer;
        transition: background-color 0.15s;
        border-bottom: ${index < this.contextMenuItems!.length - 1 ? '1px solid #f0f0f0' : 'none'};
      `;

      menuItem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 16px;">${item.icon || '🏠'}</span>
          <span style="font-size: 14px;">${item.title}</span>
        </div>
      `;

      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = '#f5f5f5';
      });

      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });

      menuItem.addEventListener('click', () => {
        console.log('📋 HOME Tab menu action:', item.action, item.id);

        // Send action back to iframe
        this.iframe.contentWindow?.postMessage({
          type: 'TELEGRAM_MENU_ACTION',
          data: { action: item.action, id: item.id }
        }, '*');

        document.body.removeChild(menu);
      });

      menu.appendChild(menuItem);
    });

    // Close menu when clicking outside
    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        document.body.removeChild(menu);
        document.removeEventListener('click', closeMenu);
      }
    };

    document.addEventListener('click', closeMenu);
    document.body.appendChild(menu);
  }

  private showTelegramLoading(show: boolean) {
    const existingLoader = document.querySelector('.telegram-loading-overlay');
    console.log('⏳ HOME Tab loading state:', show);

    if (show && !existingLoader) {
      const loader = document.createElement('div');
      loader.className = 'telegram-loading-overlay';
      loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255,255,255,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
      `;

      loader.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          border: 3px solid #e0e0e0;
          border-top: 3px solid #3390EC;
          border-radius: 50%;
          animation: telegram-spin 1s linear infinite;
        "></div>
      `;

      // Add spin animation
      if (!document.querySelector('#telegram-loading-styles')) {
        const style = document.createElement('style');
        style.id = 'telegram-loading-styles';
        style.textContent = `
          @keyframes telegram-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(loader);
    } else if (!show && existingLoader) {
      document.body.removeChild(existingLoader);
    }
  }

  private getTheme() {
    // Get current Telegram theme
    const isDark = document.documentElement.classList.contains('theme-dark');
    const theme = isDark ? 'dark' : 'light';
    console.log('🎨 HOME Tab theme:', theme);
    return theme;
  }

  private getTelegramColors() {
    // Extract Telegram CSS variables
    const computedStyle = getComputedStyle(document.documentElement);

    const colors = {
      primary: computedStyle.getPropertyValue('--primary-color') || '#3390EC',
      background: computedStyle.getPropertyValue('--background-color') || '#ffffff',
      text: computedStyle.getPropertyValue('--color-text') || '#000000',
      border: computedStyle.getPropertyValue('--border-color') || '#e0e0e0',
      hover: computedStyle.getPropertyValue('--color-chat-hover') || '#f5f5f5'
    };

    console.log('🎨 HOME Tab colors:', colors);
    return colors;
  }

  private showErrorState() {
    console.error('❌ HOME Tab showing error state');

    const errorContainer = document.createElement('div');
    errorContainer.style.cssText = `
      padding: 40px 20px;
      text-align: center;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: white;
    `;

    errorContainer.innerHTML = `
      <div style="max-width: 400px;">
        <div style="font-size: 64px; margin-bottom: 20px;">🏠</div>
        <h2 style="color: #f44336; margin-bottom: 16px; font-size: 18px; font-weight: 500;">
          Không thể kết nối Telebook Home
        </h2>
        <p style="color: #666; margin-bottom: 20px; line-height: 1.5;">
          URL: <code style="background: #f5f5f5; padding: 2px 6px; border-radius: 4px;">https://elitegirls.pro/</code>
        </p>
        <p style="color: #666; margin-bottom: 30px; line-height: 1.5;">
          Vui lòng kiểm tra server PHP đang chạy và route <strong>/</strong> (home) có hoạt động
        </p>
        <button onclick="location.reload()" style="
          background: #3390EC;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-right: 10px;
        ">Thử lại</button>
        <button onclick="window.open('https://elitegirls.pro/', '_blank')" style="
          background: #666;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Mở trong tab mới</button>
      </div>
    `;

    if (this.scrollable && this.scrollable.container) {
      this.scrollable.container.innerHTML = '';
      this.scrollable.container.appendChild(errorContainer);
    }
  }

  protected onClose() {
    console.log('❌ HOME Tab closing');

    // Handle back button callback from PHP
    if (this.backButtonCallback) {
      console.log('⬅️ Executing back button callback:', this.backButtonCallback);
      this.iframe.contentWindow?.postMessage({
        type: 'TELEGRAM_BACK_ACTION',
        data: { callback: this.backButtonCallback }
      }, '*');
    }

    if (this.iframe) {
      this.iframe.src = 'about:blank';
    }
    super.onClose();
  }
}