/**
 * Telegram WebApp Bridge
 * File: public/js/telegram-webapp-bridge.js
 * Thêm file này vào index.html trước các script khác
 */

(function() {
  'use strict';
  
  // Initialize Telegram WebApp
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    
    // Expand to full height
    tg.ready();
    tg.expand();
    
    // Set theme
    if (tg.themeParams) {
      document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
      document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
      document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
      document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
      document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
      document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
    }
    
    // Auto-authenticate if user data is available
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
      const user = tg.initDataUnsafe.user;
      
      // Send auth data to backend
      fetch('/telebook/api/telegram-auth.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          language_code: user.language_code,
          auth_date: tg.initDataUnsafe.auth_date,
          hash: tg.initDataUnsafe.hash
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.success && data.user) {
          // Store user data in session
          sessionStorage.setItem('telebook_user', JSON.stringify(data.user));
          sessionStorage.setItem('telebook_auth_time', Date.now().toString());
          if (data.token) {
            sessionStorage.setItem('telebook_token', data.token);
          }
          
          // Dispatch custom event for other components
          window.dispatchEvent(new CustomEvent('telegram-auth-success', {
            detail: data.user
          }));
          
          console.log('Telegram authentication successful');
        }
      })
      .catch(error => {
        console.error('Telegram authentication error:', error);
      });
    }
    
    // Make Telegram WebApp globally available
    window.TelegramWebApp = tg;
  } else {
    console.log('Not running in Telegram WebApp environment');
    
    // For development/testing: mock Telegram WebApp
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      window.TelegramWebApp = {
        ready: () => {},
        expand: () => {},
        close: () => {},
        initDataUnsafe: null,
        themeParams: {
          bg_color: '#ffffff',
          text_color: '#000000',
          hint_color: '#999999',
          link_color: '#2481cc',
          button_color: '#2481cc',
          button_text_color: '#ffffff'
        }
      };
    }
  }
  
  // Helper function to check authentication
  window.checkTelegramAuth = function() {
    const userData = sessionStorage.getItem('telebook_user');
    const authTime = sessionStorage.getItem('telebook_auth_time');
    
    if (userData && authTime) {
      const timeElapsed = Date.now() - parseInt(authTime);
      // Session valid for 24 hours
      if (timeElapsed < 24 * 60 * 60 * 1000) {
        return JSON.parse(userData);
      }
    }
    
    return null;
  };
  
  // Helper function to refresh user data
  window.refreshTelegramUser = function() {
    const user = window.checkTelegramAuth();
    if (!user) return Promise.reject('Not authenticated');
    
    return fetch(`/telebook/api/telegram-auth.php?action=get_user&telegram_id=${user.telegram_id}`)
      .then(response => response.json())
      .then(data => {
        if (data.success && data.user) {
          sessionStorage.setItem('telebook_user', JSON.stringify(data.user));
          return data.user;
        }
        throw new Error(data.error || 'Failed to refresh user data');
      });
  };
  
  // Helper function to update balance
  window.updateUserBalance = function(amount, type, description) {
    const user = window.checkTelegramAuth();
    if (!user) return Promise.reject('Not authenticated');
    
    return fetch('/telebook/api/telegram-auth.php?action=update_balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: user.id,
        amount: amount,
        type: type,
        description: description
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Update local user data
        user.balance = data.new_balance;
        sessionStorage.setItem('telebook_user', JSON.stringify(user));
        
        // Dispatch balance update event
        window.dispatchEvent(new CustomEvent('balance-updated', {
          detail: { balance: data.new_balance }
        }));
        
        return data.new_balance;
      }
      throw new Error(data.error || 'Failed to update balance');
    });
  };
  
  // Listen for auth events from iframe or popup
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'telegram-auth') {
      const userData = event.data.user;
      if (userData) {
        sessionStorage.setItem('telebook_user', JSON.stringify(userData));
        sessionStorage.setItem('telebook_auth_time', Date.now().toString());
        
        window.dispatchEvent(new CustomEvent('telegram-auth-success', {
          detail: userData
        }));
      }
    }
  });
  
})();