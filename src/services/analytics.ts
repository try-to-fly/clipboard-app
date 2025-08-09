import { trackEvent } from '@aptabase/tauri';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number>;
}

export const ANALYTICS_EVENTS = {
  // App lifecycle events
  APP_OPENED: 'app_opened',
  APP_CLOSED: 'app_closed',
  SESSION_STARTED: 'session_started',
  SESSION_ENDED: 'session_ended',

  // Feature usage events
  ITEM_COPIED: 'item_copied',
  ITEM_PASTED: 'item_pasted',
  ITEM_FAVORITED: 'item_favorited',
  ITEM_UNFAVORITED: 'item_unfavorited',
  ITEM_DELETED: 'item_deleted',
  HISTORY_CLEARED: 'history_cleared',
  SEARCH_PERFORMED: 'search_performed',

  // Settings events
  SETTINGS_OPENED: 'settings_opened',
  SETTINGS_CHANGED: 'settings_changed',
  THEME_CHANGED: 'theme_changed',
  SHORTCUT_CHANGED: 'shortcut_changed',
  MONITORING_TOGGLED: 'monitoring_toggled',

  // Performance events
  STARTUP_TIME: 'startup_time',
  DATABASE_QUERY_TIME: 'database_query_time',

  // Error events
  ERROR_OCCURRED: 'error_occurred',
  CRASH_OCCURRED: 'crash_occurred',
};

class Analytics {
  private enabled: boolean = true;
  private sessionStartTime: number | null = null;

  constructor() {
    // Load analytics preference from localStorage
    const stored = localStorage.getItem('analytics_enabled');
    if (stored !== null) {
      this.enabled = stored === 'true';
    }

    // Track session start
    if (this.enabled) {
      this.startSession();
    }
  }

  private startSession() {
    this.sessionStartTime = Date.now();
    this.track(ANALYTICS_EVENTS.SESSION_STARTED);
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('analytics_enabled', enabled.toString());

    if (enabled && !this.sessionStartTime) {
      this.startSession();
    } else if (!enabled && this.sessionStartTime) {
      this.endSession();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public track(eventName: string, properties?: Record<string, string | number>) {
    if (!this.enabled) {
      return;
    }

    try {
      // Filter out any sensitive data
      const safeProperties = this.sanitizeProperties(properties);

      // Track the event
      trackEvent(eventName, safeProperties);
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }

  private sanitizeProperties(
    properties?: Record<string, string | number>
  ): Record<string, string | number> | undefined {
    if (!properties) {
      return undefined;
    }

    // Remove any potentially sensitive keys
    const sensitiveKeys = ['content', 'text', 'data', 'password', 'token', 'key', 'secret'];
    const safeProperties: Record<string, string | number> = {};

    for (const [key, value] of Object.entries(properties)) {
      const lowerKey = key.toLowerCase();
      if (!sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        safeProperties[key] = value;
      }
    }

    return Object.keys(safeProperties).length > 0 ? safeProperties : undefined;
  }

  public trackFeatureUsage(feature: string, properties?: Record<string, string | number>) {
    this.track(feature, properties);
  }

  public trackError(error: Error, context?: string) {
    this.track(ANALYTICS_EVENTS.ERROR_OCCURRED, {
      error_type: error.name,
      error_message: error.message.substring(0, 100), // Limit message length
      context: context || 'unknown',
    });
  }

  public trackPerformance(metric: string, duration: number) {
    this.track(metric, { duration_ms: Math.round(duration) });
  }

  public endSession() {
    if (this.sessionStartTime) {
      const sessionDuration = Date.now() - this.sessionStartTime;
      this.track(ANALYTICS_EVENTS.SESSION_ENDED, {
        duration_seconds: Math.round(sessionDuration / 1000),
      });
      this.sessionStartTime = null;
    }
  }
}

// Create singleton instance
export const analytics = new Analytics();

// Track page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    analytics.endSession();
  });
}
