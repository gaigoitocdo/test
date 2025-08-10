// src/components/sidebarLeft/tabs/telebookReview-detail.ts - PRODUCTION FIXED
import SliderSuperTab from '../../sliderTab';

export default class AppTelebookReviewDetailTab extends SliderSuperTab {
  private iframe: HTMLIFrameElement;
  private currentTitle: string = 'Được kiểm duyệt bởi Telegram <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align: middle; margin-left: 4px;"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.329 7.676c-.07-.32-.314-.564-.634-.634-.434-.098-.87-.196-1.305-.295-.32-.07-.564-.314-.634-.634-.098-.434-.196-.87-.295-1.305-.07-.32-.314-.564-.634-.634-.434-.098-.87-.196-1.305-.295-.32-.07-.564-.314-.634-.634-.132-.603-.295-1.205-.492-1.808-.098-.3-.392-.494-.692-.494-.3 0-.595.194-.692.494-.197.603-.36 1.205-.492 1.808-.07.32-.314.564-.634.634-.434.098-.87.196-1.305.295-.32.07-.564.314-.634.634-.098.434-.196.87-.295 1.305-.07.32-.314.564-.634.634-.603.132-1.205.295-1.808.492-.3.098-.494.392-.494.692 0 .3.194.595.494.692.603.197 1.205.36 1.808.492.32.07.564.314.634.634.098.434.196.87.295 1.305.07.32.314.564.634.634.434.098.87.196 1.305.295.32.07.564.314.634.634.132.603.295 1.205.492 1.808.098.3.392.494.692.494.3 0 .595-.194.692-.494.197-.603.36-1.205.492-1.808.07-.32.314-.564.634-.634.434-.098.87-.196 1.305-.295.32-.07.564-.314.634-.634.098-.434.196-.87.295-1.305.07-.32.314-.564.634-.634.603-.132 1.205-.295 1.808-.492.3-.098.494-.392.494-.692 0-.3-.194-.595-.494-.692-.603-.197-1.205-.36-1.808-.492z" fill="#0088cc"/></svg>';
  private reviewId: string | null = null; // Lưu ID của review

  constructor(reviewId: string) {
    super();
    this.reviewId = reviewId; // Lưu reviewId để sử dụng trong URL
  }

  protected init() {
    this.container.id = 'telebook-review-detail-container';
    this.setTitle(this.currentTitle);
    this.setupReviewDetailLayout();
  }

  private setupReviewDetailLayout() {
    if (this.scrollable && this.scrollable.container) {
      this.scrollable.container.innerHTML = '';
    }

    // Tạo container cho iframe
    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;

    // Xác định môi trường và URL
    const hostname = window.location.hostname;
    const isProduction = !['localhost', '127.0.0.1', '::1'].includes(hostname);
    
    // ✅ Sử dụng URL đúng theo môi trường
    let baseUrl: string;
    if (isProduction) {
      baseUrl = 'https://elitegirls.pro';
    } else {
      baseUrl = 'http://localhost:8090';
    }

    // Tạo iframe cho nội dung chi tiết đánh giá
    this.iframe = document.createElement('iframe');
    this.iframe.src = `${baseUrl}/telebook/review-detail/${this.reviewId}`; // ✅ URL cho chi tiết đánh giá
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: #f8fafc;
    `;

    console.log('⭐ Creating REVIEW DETAIL Tab:', {
      environment: isProduction ? 'production' : 'development',
      hostname: hostname,
      baseUrl: baseUrl,
      reviewId: this.reviewId,
      fullUrl: this.iframe.src
    });

    // Xử lý sự kiện iframe
    this.iframe.onload = () => {
      console.log('✅ Telebook Review Detail loaded successfully at:', this.iframe.src);
      this.setupTelegramIntegration();
    };

    this.iframe.onerror = (error) => {
      console.warn('⚠️ Iframe error (this is normal):', error);
      console.log('🔄 Iframe will continue loading...');
    };

    iframeContainer.appendChild(this.iframe);

    // Thêm vào container cuộn
    if (this.scrollable && this.scrollable.container) {
      this.scrollable.container.appendChild(iframeContainer);
    }

    // Thiết lập giao tiếp message
    this.setupMessageHandling();
  }

  private setupTelegramIntegration() {
    if (!this.iframe?.contentWindow) return;

    try {
      // Gửi context Telegram tới iframe
      const telegramContext = {
        type: 'TELEGRAM_CONTEXT',
        data: {
          hasTopbar: true,
          theme: this.getTheme(),
          colors: this.getTelegramColors(),
          language: 'vi',
          apiEndpoint: '/api/telebook',
          page: 'review-detail', // ✅ Chỉ định trang chi tiết đánh giá
          reviewId: this.reviewId, // Truyền ID đánh giá
          environment: window.location.hostname.includes('sakura.wiki') ? 'production' : 'development',
          parentUrl: window.location.href,
          timestamp: Date.now()
        }
      };

      console.log('📡 Sending Review Detail context to iframe:', telegramContext);
      this.iframe.contentWindow.postMessage(telegramContext, '*');
    } catch (error) {
      console.warn('⚠️ Could not send Telegram integration data:', error);
    }
  }

  private setupMessageHandling() {
    // Lắng nghe message từ iframe
    window.addEventListener('message', (event) => {
      if (event.source !== this.iframe.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;

      console.log('📨 Review Detail Tab received message:', event.data);
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
          console.log('🐛 Review Detail Tab Debug:', data);
          break;

        case 'PRODUCTION_DEBUG':
          console.log('🔧 Production debug info:', data);
          break;

        case 'REVIEW_DETAIL_STATUS':
          this.handleReviewDetailStatus(data);
          break;
      }
    });
  }

  private handleReviewDetailStatus(data: any) {
    console.log('⭐ Review Detail status update:', data);
    // Xử lý trạng thái chi tiết đánh giá
    if (data.status === 'loaded') {
      console.log('✅ Review Detail loaded successfully');
    }
  }

  private updateTelegramTitle(title: string) {
    this.currentTitle = title;
    this.setTitle(title);
    console.log('📝 Review Detail Tab title updated:', title);

    // Cập nhật tiêu đề trình duyệt
    if (document.title.includes('Telebook')) {
      document.title = `${title} - Telegram Web`;
    }
  }

  private updateTelegramSubtitle(subtitle: string) {
    if (subtitle) {
      console.log('📝 Review Detail Tab subtitle:', subtitle);
      this.showTelegramNotification(subtitle, 'info');
    }
  }

  private handleTelegramNavigation(url: string, params: any = {}) {
    console.log('🧭 Review Detail Tab navigation:', url, params);

    const hostname = window.location.hostname;
    const isProduction = !['localhost', '127.0.0.1', '::1'].includes(hostname);
    const baseUrl = isProduction ? 'https://elitegirls.pro' : 'http://localhost:8090';

    if (url.startsWith('/telebook/')) {
      // Điều hướng trong iframe
      const fullUrl = `${baseUrl}${url}`;
      if (params && Object.keys(params).length > 0) {
        const urlParams = new URLSearchParams(params);
        this.iframe.src = `${fullUrl}?${urlParams.toString()}`;
      } else {
        this.iframe.src = fullUrl;
      }
      console.log('🔄 Review Detail Tab navigating to:', this.iframe.src);
    } else if (url.startsWith('telegram://')) {
      this.handleTelegramSpecificUrl(url);
    }
  }

  private handleTelegramSpecificUrl(url: string) {
    console.log('📱 Review Detail Tab handling Telegram URL:', url);

    if (url.includes('telegram://back')) {
      this.onClose();
    } else if (url.includes('telegram://menu')) {
      this.showContextMenu();
    }
  }

  private showTelegramNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    console.log('🔔 Review Detail Tab notification:', message, type);

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
    }, 3000);
  }

  private handleBackButton(enabled: boolean, callback?: string) {
    if (enabled && callback) {
      this.backButtonCallback = callback;
      console.log('⬅️ Review Detail Tab back button enabled:', callback);
    } else {
      this.backButtonCallback = null;
      console.log('⬅️ Review Detail Tab back button disabled');
    }
  }

  private backButtonCallback: string | null = null;

  private handleMenuButton(enabled: boolean, items?: any[]) {
    if (enabled && items) {
      this.contextMenuItems = items;
      console.log('📋 Review Detail Tab menu items set:', items);
    } else {
      this.contextMenuItems = null;
      console.log('📋 Review Detail Tab menu disabled');
    }
  }

  private contextMenuItems: any[] | null = null;

  private showContextMenu() {
    if (!this.contextMenuItems) {
      console.log('📋 No menu items available for Review Detail Tab');
      return;
    }

    console.log('📋 Showing Review Detail Tab context menu');

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
          <span style="font-size: 16px;">${item.icon || '⭐'}</span>
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
        console.log('📋 Review Detail Tab menu action:', item.action, item.id);
        this.iframe.contentWindow?.postMessage({
          type: 'TELEGRAM_MENU_ACTION',
          data: { action: item.action, id: item.id }
        }, '*');

        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
      });

      menu.appendChild(menuItem);
    });

    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
        document.removeEventListener('click', closeMenu);
      }
    };

    document.addEventListener('click', closeMenu);
    document.body.appendChild(menu);
  }

  private showTelegramLoading(show: boolean) {
    const existingLoader = document.querySelector('.telegram-loading-overlay');
    console.log('⏳ Review Detail Tab loading state:', show);

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
    const isDark = document.documentElement.classList.contains('theme-dark');
    const theme = isDark ? 'dark' : 'light';
    console.log('🎨 Review Detail Tab theme:', theme);
    return theme;
  }

  private getTelegramColors() {
    const computedStyle = getComputedStyle(document.documentElement);

    const colors = {
      primary: computedStyle.getPropertyValue('--primary-color') || '#3390EC',
      background: computedStyle.getPropertyValue('--background-color') || '#ffffff',
      text: computedStyle.getPropertyValue('--color-text') || '#000000',
      border: computedStyle.getPropertyValue('--border-color') || '#e0e0e0',
      hover: computedStyle.getPropertyValue('--color-chat-hover') || '#f5f5f5'
    };

    console.log('🎨 Review Detail Tab colors:', colors);
    return colors;
  }

  protected onClose() {
    console.log('❌ Review Detail Tab closing');

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

  public onCloseAfterTimeout() {
    if (this.iframe) {
      this.iframe.src = 'about:blank';
    }
    super.onCloseAfterTimeout();
  }

  public destroy() {
    if (this.iframe) {
      this.iframe.src = 'about:blank';
      this.iframe.remove();
    }
    super.destroy();
  }
}