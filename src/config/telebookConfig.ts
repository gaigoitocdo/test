/*
 * File: src/config/telebookConfig.ts
 * Configuration for Telebook Integration
 */

export interface TelebookConfig {
  baseUrl: string;
  apiEndpoint: string;
  authEndpoint: string;
  routes: {
    home: string;
    booking: string;
    services: string;
    review: string;
    profile: string;
    photos: string;
    video: string;
    addCredit: string;
  };
  features: {
    enableAuth: boolean;
    enableNotifications: boolean;
    enableDataSync: boolean;
    enableCORS: boolean;
  };
  iframe: {
    width: string;
    height: string;
    sandbox: string[];
    allow: string[];
  };
}

export const TELEBOOK_CONFIG: TelebookConfig = {
  // Base URL for telebook - adjust to your domain
  baseUrl: window.location.protocol + '//' + window.location.host + '/telebook',

  // API endpoints
  apiEndpoint: '/telebook/api',
  authEndpoint: '/telebook/api/telegram-auth',

  // Route mappings
  routes: {
    home: '/home.html',
    booking: '/booking.html',
    services: '/services.html',
    review: '/review.html',
    profile: '/profile.html',
    photos: '/photos.html',
    video: '/video.html',
    addCredit: '/add-credit.html'
  },

  // Feature flags
  features: {
    enableAuth: true,
    enableNotifications: true,
    enableDataSync: true,
    enableCORS: true
  },

  // Iframe security settings
  iframe: {
    width: '100%',
    height: '100%',
    sandbox: [
      'allow-scripts',
      'allow-forms',
      'allow-same-origin',
      'allow-popups',
      'allow-popups-to-escape-sandbox'
    ],
    allow: [
      'geolocation',
      'microphone',
      'camera',
      'payment',
      'encrypted-media'
    ]
  }
};
