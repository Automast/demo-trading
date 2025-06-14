/**
 * Toast Notification System
 * Add this to your main dashboard.js file or create a separate toast.js file
 */

// Toast notification system
class ToastManager {
  constructor() {
    this.container = this.createContainer();
    this.toasts = new Map();
    this.nextId = 1;
  }

  createContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      top: 100px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      pointer-events: none;
    `;
    document.body.appendChild(container);
    return container;
  }

  show(message, type = 'info', duration = 5000) {
    const id = this.nextId++;
    const toast = this.createToast(id, message, type, duration);
    
    this.container.appendChild(toast);
    this.toasts.set(id, toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto remove
    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }

    return id;
  }

  createToast(id, message, type, duration) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: var(--secondary-bg);
      color: var(--text-color);
      padding: 1rem 1.5rem;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      transform: translateX(400px);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      max-width: 400px;
      word-wrap: break-word;
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    `;

    // Add type-specific styling
    const typeStyles = {
      success: 'border-left: 4px solid var(--success-color);',
      error: 'border-left: 4px solid var(--error-color);',
      warning: 'border-left: 4px solid var(--warning-color);',
      info: 'border-left: 4px solid var(--info-color);'
    };

    toast.style.cssText += typeStyles[type] || typeStyles.info;

    // Add icon
    const icon = document.createElement('i');
    icon.className = 'material-icons';
    icon.style.cssText = `
      font-size: 1.25rem;
      flex-shrink: 0;
    `;

    const iconMap = {
      success: 'check_circle',
      error: 'error',
      warning: 'warning',
      info: 'info'
    };

    icon.textContent = iconMap[type] || iconMap.info;

    // Add message
    const messageEl = document.createElement('span');
    messageEl.textContent = message;
    messageEl.style.cssText = `
      flex: 1;
      line-height: 1.4;
    `;

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '<i class="material-icons">close</i>';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    `;

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.remove(id);
    });

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'var(--hover-bg)';
      closeBtn.style.color = 'var(--text-color)';
    });

    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'none';
      closeBtn.style.color = 'var(--text-secondary)';
    });

    // Add progress bar for timed toasts
    if (duration > 0) {
      const progressBar = document.createElement('div');
      progressBar.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        height: 3px;
        background: var(--accent-color);
        width: 100%;
        transform-origin: left;
        animation: toastProgress ${duration}ms linear forwards;
        border-radius: 0 0 8px 8px;
      `;

      // Add CSS animation for progress bar
      if (!document.getElementById('toast-progress-animation')) {
        const style = document.createElement('style');
        style.id = 'toast-progress-animation';
        style.textContent = `
          @keyframes toastProgress {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
        `;
        document.head.appendChild(style);
      }

      toast.appendChild(progressBar);
    }

    toast.appendChild(icon);
    toast.appendChild(messageEl);
    toast.appendChild(closeBtn);

    // Click to dismiss
    toast.addEventListener('click', () => {
      this.remove(id);
    });

    return toast;
  }

  remove(id) {
    const toast = this.toasts.get(id);
    if (!toast) return;

    toast.classList.remove('show');
    toast.style.transform = 'translateX(400px)';
    toast.style.opacity = '0';

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      this.toasts.delete(id);
    }, 300);
  }

  success(message, duration = 5000) {
    return this.show(message, 'success', duration);
  }

  error(message, duration = 7000) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration = 6000) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration = 5000) {
    return this.show(message, 'info', duration);
  }

  clear() {
    this.toasts.forEach((toast, id) => {
      this.remove(id);
    });
  }
}

// Create global toast manager instance
const toastManager = new ToastManager();

// Add CSS for show state
if (!document.getElementById('toast-show-styles')) {
  const style = document.createElement('style');
  style.id = 'toast-show-styles';
  style.textContent = `
    .toast.show {
      transform: translateX(0) !important;
      opacity: 1 !important;
    }
    
    .toast:hover {
      transform: translateX(-5px) scale(1.02);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }
  `;
  document.head.appendChild(style);
}

// Export toast functions globally
window.showToast = (message, type, duration) => toastManager.show(message, type, duration);
window.toast = {
  success: (message, duration) => toastManager.success(message, duration),
  error: (message, duration) => toastManager.error(message, duration),
  warning: (message, duration) => toastManager.warning(message, duration),
  info: (message, duration) => toastManager.info(message, duration),
  clear: () => toastManager.clear()
};

// Add to dashboard initialization
if (typeof window !== 'undefined') {
  console.log('Toast notification system loaded');
}