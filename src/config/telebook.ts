// src/config/telebook.ts
// ✅ FILE CONFIG CHUNG CHO TELEBOOK - TẠO FILE NÀY

export const TELEBOOK_CONFIG = {
  // ✅ QUAN TRỌNG: Đổi từ 8080 thành 8090
  BASE_URL: 'http://localhost:8090',

  PATHS: {
    HOME: '/home',
    BOOKING: '/booking',
    SERVICE: '/Service',
    REVIEW: '/ReviewDetails',
    TEST: '/test'
  },

  // Full URLs
  get URLS() {
    return {
      HOME: this.BASE_URL + this.PATHS.HOME,
      BOOKING: this.BASE_URL + this.PATHS.BOOKING,
      SERVICE: this.BASE_URL + this.PATHS.SERVICE,
      REVIEW: this.BASE_URL + this.PATHS.REVIEW,
      TEST: this.BASE_URL + this.PATHS.TEST
    };
  },

  // Default settings
  IFRAME_SETTINGS: {
    FRAMEBORDER: '0',
    SCROLLING: 'yes',
    ALLOWFULLSCREEN: 'true',
    ALLOW: 'fullscreen'
  },

  // CSS cho fullscreen
  FULLSCREEN_CSS: `
    width: 100% !important;
    height: 100vh !important;
    border: none !important;
    background: white !important;
    display: block !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
  `,

  // Container CSS
  CONTAINER_CSS: `
    width: 100% !important;
    height: 100vh !important;
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    overflow: hidden !important;
    z-index: 1 !important;
  `
};

// Helper functions
export class TelebookHelper {
  static createIframe(url: string): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = TELEBOOK_CONFIG.FULLSCREEN_CSS;

    // Set attributes
    Object.entries(TELEBOOK_CONFIG.IFRAME_SETTINGS).forEach(([key, value]) => {
      iframe.setAttribute(key.toLowerCase(), value);
    });

    return iframe;
  }

  static createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.style.cssText = TELEBOOK_CONFIG.CONTAINER_CSS;
    return container;
  }

  static logLoad(page: string, url: string) {
    console.log(`✅ Telebook ${page} loaded from: ${url}`);
  }

  static logError(page: string, url: string, error: any) {
    console.error(`❌ Failed to load Telebook ${page} from: ${url}`, error);
  }
}

export default TELEBOOK_CONFIG;
