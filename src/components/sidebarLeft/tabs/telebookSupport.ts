// src/components/sidebarLeft/tabs/telebookSupport.ts
// CLEAN VERSION - NO LOCALHOST REFERENCES

import SliderSuperTab from '../../sliderTab';

export default class AppTelebookSupportTab extends SliderSuperTab {
  private iframe: HTMLIFrameElement;
  private currentTitle: string = 'Được kiểm duyệt bởi Telegram <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align: middle; margin-left: 4px;"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.329 7.676c-.07-.32-.314-.564-.634-.634-.434-.098-.87-.196-1.305-.295-.32-.07-.564-.314-.634-.634-.098-.434-.196-.87-.295-1.305-.07-.32-.314-.564-.634-.634-.434-.098-.87-.196-1.305-.295-.32-.07-.564-.314-.634-.634-.132-.603-.295-1.205-.492-1.808-.098-.3-.392-.494-.692-.494-.3 0-.595.194-.692.494-.197.603-.36 1.205-.492 1.808-.07.32-.314.564-.634.634-.434.098-.87.196-1.305.295-.32.07-.564.314-.634.634-.098.434-.196.87-.295 1.305-.07.32-.314.564-.634.634-.603.132-1.205.295-1.808.492-.3.098-.494.392-.494.692 0 .3.194.595.494.692.603.197 1.205.36 1.808.492.32.07.564.314.634.634.098.434.196.87.295 1.305.07.32.314.564.634.634.434.098.87.196 1.305.295.32.07.564.314.634.634.132.603.295 1.205.492 1.808.098.3.392.494.692.494.3 0 .595-.194.692-.494.197-.603.36-1.205.492-1.808.07-.32.314-.564.634-.634.434-.098.87-.196 1.305-.295.32-.07.564-.314.634-.634.098-.434.196-.87.295-1.305.07-.32.314-.564.634-.634.603-.132 1.205-.295 1.808-.492.3-.098.494-.392.494-.692 0-.3-.194-.595-.494-.692-.603-.197-1.205-.36-1.808-.492z" fill="#0088cc"/></svg>';

  protected init() {
    this.container.id = 'telebook-support-container';
    this.setTitle(this.currentTitle);
    this.setupTelebookLayout();
  }

  private setupTelebookLayout() {
    if (this.scrollable && this.scrollable.container) {
      this.scrollable.container.innerHTML = '';
    }

    // Create iframe container
    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;

    // FIXED: Only sakura.wiki URL - NO localhost anywhere
    this.iframe = document.createElement('iframe');
    this.iframe.src = `https://elitegirls.pro/telebook/support?t=${Date.now()}`;
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    `;

    // Enhanced event handlers
    this.iframe.onload = () => {
      console.log('✅ Telebook Support loaded from sakura.wiki');
      this.setupTelegramIntegration();
    };

    this.iframe.onerror = (error) => {
      console.error('❌ Failed to load from sakura.wiki:', error);
      this.showErrorState();
    };

    iframeContainer.appendChild(this.iframe);

    if (this.scrollable && this.scrollable.container) {
      this.scrollable.container.appendChild(iframeContainer);
    }

    this.setupMessageHandling();
  }

  private setupTelegramIntegration() {
    const telegramContext = {
      type: 'TELEGRAM_CONTEXT',
      data: {
        hasTopbar: true,
        theme: this.getTheme(),
        colors: this.getTelegramColors(),
        language: 'vi',
        apiEndpoint: 'https://elitegirls.pro/telebook/api'
      }
    };

    this.iframe.contentWindow?.postMessage(telegramContext, '*');
  }

  private setupMessageHandling() {
    window.addEventListener('message', (event) => {
      if (event.source !== this.iframe.contentWindow) return;

      const { type, data } = event.data;

      switch (type) {
        case 'TELEGRAM_SET_TITLE':
          this.updateTelegramTitle(data.title);
          break;

        case 'TELEGRAM_NAVIGATE':
          this.handleTelegramNavigation(data.url, data.params);
          break;

        case 'TELEGRAM_NOTIFICATION':
          this.showTelegramNotification(data.message, data.type);
          break;
      }
    });
  }

  private updateTelegramTitle(title: string) {
    this.currentTitle = title;
    this.setTitle(title);

    if (document.title.includes('Telebook')) {
      document.title = `${title} - Telegram Web`;
    }
  }

  private handleTelegramNavigation(url: string, params: any = {}) {
    if (url.startsWith('/telebook/')) {
      // FIXED: Always use sakura.wiki - NO localhost
      const fullUrl = `https://elitegirls.pro${url}`;
      if (params && Object.keys(params).length > 0) {
        const urlParams = new URLSearchParams(params);
        this.iframe.src = `${fullUrl}?${urlParams.toString()}`;
      } else {
        this.iframe.src = fullUrl;
      }
    } else if (url.includes('telegram://back')) {
      this.onClose();
    }
  }

  private showTelegramNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
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
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  private getTheme() {
    const isDark = document.documentElement.classList.contains('theme-dark');
    return isDark ? 'dark' : 'light';
  }

  private getTelegramColors() {
    const computedStyle = getComputedStyle(document.documentElement);

    return {
      primary: computedStyle.getPropertyValue('--primary-color') || '#3390EC',
      background: computedStyle.getPropertyValue('--background-color') || '#ffffff',
      text: computedStyle.getPropertyValue('--color-text') || '#000000',
      border: computedStyle.getPropertyValue('--border-color') || '#e0e0e0',
      hover: computedStyle.getPropertyValue('--color-chat-hover') || '#f5f5f5'
    };
  }

  private showErrorState() {
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
        <div style="font-size: 64px; margin-bottom: 20px;">⚙️</div>
        <h2 style="color: #f44336; margin-bottom: 16px; font-size: 18px; font-weight: 500;">
          Không thể kết nối Telebook Service
        </h2>
        <p style="color: #666; margin-bottom: 30px; line-height: 1.5;">
          Vui lòng kiểm tra kết nối tới <strong>sakura.wiki</strong>
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
        ">Thử lại</button>
      </div>
    `;

    if (this.scrollable && this.scrollable.container) {
      this.scrollable.container.innerHTML = '';
      this.scrollable.container.appendChild(errorContainer);
    }
  }

  protected onClose() {
    if (this.iframe) {
      this.iframe.src = 'about:blank';
    }
    super.onClose();
  }
}