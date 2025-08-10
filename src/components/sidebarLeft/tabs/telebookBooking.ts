// src/components/sidebarLeft/tabs/telebookBooking.ts - PRODUCTION FIXED
import SliderSuperTab from '../../sliderTab';

export default class AppTelebookBookingTab extends SliderSuperTab {
  private iframe: HTMLIFrameElement;
  private currentTitle: string = 'Được kiểm duyệt bởi Telegram <svg width="16" height="16" viewBox="0 0 24 24" style="vertical-align: middle; margin-left: 4px;"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.329 7.676c-.07-.32-.314-.564-.634-.634-.434-.098-.87-.196-1.305-.295-.32-.07-.564-.314-.634-.634-.098-.434-.196-.87-.295-1.305-.07-.32-.314-.564-.634-.634-.434-.098-.87-.196-1.305-.295-.32-.07-.564-.314-.634-.634-.132-.603-.295-1.205-.492-1.808-.098-.3-.392-.494-.692-.494-.3 0-.595.194-.692.494-.197.603-.36 1.205-.492 1.808-.07.32-.314.564-.634.634-.434.098-.87.196-1.305.295-.32.07-.564.314-.634.634-.098.434-.196.87-.295 1.305-.07.32-.314.564-.634.634-.603.132-1.205.295-1.808.492-.3.098-.494.392-.494.692 0 .3.194.595.494.692.603.197 1.205.36 1.808.492.32.07.564.314.634.634.098.434.196.87.295 1.305.07.32.314.564.634.634.434.098.87.196 1.305.295.32.07.564.314.634.634.132.603.295 1.205.492 1.808.098.3.392.494.692.494.3 0 .595-.194.692-.494.197-.603.36-1.205.492-1.808.07-.32.314-.564.634-.634.434-.098.87-.196 1.305-.295.32-.07.564-.314.634-.634.098-.434.196-.87.295-1.305.07-.32.314-.564.634-.634.603-.132 1.205-.295 1.808-.492.3-.098.494-.392.494-.692 0-.3-.194-.595-.494-.692-.603-.197-1.205-.36-1.808-.492z" fill="#0088cc"/></svg>';

  protected init() {
    this.container.id = 'telebook-booking-container';
    this.setTitle(this.currentTitle);
    this.setupTelebookLayout();
  }

  private setupTelebookLayout() {
    if(this.scrollable && this.scrollable.container) {
      this.scrollable.container.innerHTML = '';
    }

    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
    `;

    // ✅ FIXED: Auto-detect environment and use correct URL
    const hostname = window.location.hostname;
    const isProduction = !['localhost', '127.0.0.1', '::1'].includes(hostname);
    
    // ✅ PRODUCTION: Use correct URLs based on environment
    let baseUrl: string;
    if (isProduction) {
      baseUrl = 'https://elitegirls.pro';
    } else {
      baseUrl = 'http://localhost:8090';
    }

    this.iframe = document.createElement('iframe');
    this.iframe.src = `${baseUrl}/telebook/booking`;
    this.iframe.style.cssText = `
      width: 100%;
      height: 100%;
      border: none;
      background: white;
    `;

    console.log('📅 Creating BOOKING Tab:', {
      environment: isProduction ? 'production' : 'development',
      hostname: hostname,
      baseUrl: baseUrl,
      fullUrl: this.iframe.src
    });

    this.iframe.onload = () => {
      console.log('✅ Telebook BOOKING loaded successfully:', this.iframe.src);
      this.setupTelegramIntegration();
    };

    this.iframe.onerror = (error) => {
      console.error('❌ Failed to load Telebook BOOKING:', error);
      console.error('❌ Environment details:', {
        hostname: hostname,
        isProduction: isProduction,
        attemptedUrl: this.iframe.src,
        baseUrl: baseUrl
      });
    };

    // Add timeout check with longer duration for production
    const timeoutDuration = isProduction ? 15000 : 10000; // 15s for production, 10s for dev
    let loadTimeout = setTimeout(() => {
      console.error('⏰ BOOKING Tab load timeout after', timeoutDuration + 'ms');
      console.error('🌐 Environment:', {
        hostname: hostname,
        isProduction: isProduction,
        url: this.iframe.src
      });
    }, timeoutDuration);

    this.iframe.addEventListener('load', () => {
      clearTimeout(loadTimeout);
    });

    iframeContainer.appendChild(this.iframe);

    if(this.scrollable && this.scrollable.container) {
      this.scrollable.container.appendChild(iframeContainer);
    }

    this.setupMessageHandling();
  }

  private setupTelegramIntegration() {
    if (!this.iframe?.contentWindow) return;

    try {
      // Send Telegram-specific data to iframe
      const telegramData = {
        type: 'TELEGRAM_INTEGRATION',
        data: {
          environment: window.location.hostname.includes('elitegirls.pro') ? 'production' : 'development',
          parentUrl: window.location.href,
          timestamp: Date.now()
        }
      };

      this.iframe.contentWindow.postMessage(telegramData, '*');
      console.log('📱 Telegram integration data sent to booking iframe');
    } catch (error) {
      console.warn('⚠️ Could not send Telegram integration data:', error);
    }
  }

  private setupMessageHandling() {
    window.addEventListener('message', (event) => {
      if (!event.data || typeof event.data !== 'object') return;

      console.log('📨 BOOKING Tab received message:', event.data);

      switch (event.data.type) {
        case 'TELEGRAM_NOTIFICATION':
          this.handleNotification(event.data.data);
          break;
        
        case 'TELEGRAM_SET_TITLE':
          this.setTitle(event.data.data.title || this.currentTitle);
          break;
        
        case 'TELEGRAM_NAVIGATE':
          this.handleNavigation(event.data.data);
          break;
        
        case 'BOOKING_STATUS':
          this.handleBookingStatus(event.data.data);
          break;

        case 'PRODUCTION_DEBUG':
          console.log('🔧 Production debug info:', event.data.data);
          break;
      }
    });
  }

  private handleNotification(data: any) {
    console.log('🔔 Booking notification:', data);
    // Handle notifications from booking iframe
    if (data.message) {
      // You can integrate with your app's notification system here
      console.log('📢 Notification:', data.message);
    }
  }

  private handleNavigation(data: any) {
    console.log('🧭 Navigation request:', data);
    if (data.url) {
      // Handle navigation requests from booking iframe
      console.log('🔄 Navigating to:', data.url);
    }
  }

  private handleBookingStatus(data: any) {
    console.log('📋 Booking status update:', data);
    // Handle booking status updates
    if (data.status === 'completed') {
      console.log('✅ Booking completed successfully');
    }
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