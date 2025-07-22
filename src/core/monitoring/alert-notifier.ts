import { PerformanceAlert } from './performance-metrics.js';

/**
 * Interface for alert notification channels
 */
interface AlertNotificationChannel {
  name: string;
  notify(alert: PerformanceAlert): Promise<boolean>;
  isEnabled(): boolean;
  getConfig(): Record<string, unknown>;
}

/**
 * Email notification channel
 */
class EmailAlertChannel implements AlertNotificationChannel {
  public name: string;
  private enabled: boolean;
  private recipients: string[];
  
  constructor(config: { enabled: boolean; recipients: string[] }) {
    this.name = 'email';
    this.enabled = config.enabled;
    this.recipients = config.recipients;
  }
  
  async notify(alert: PerformanceAlert): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      // In a real implementation, this would send an email
      console.log(`[Email Alert] Would send email to ${this.recipients.join(', ')} about: ${alert.message}`);
      return true;
    } catch (error) {
      console.error('Error sending email alert:', error);
      return false;
    }
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  getConfig(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      recipients: this.recipients
    };
  }
}

/**
 * Slack notification channel
 */
class SlackAlertChannel implements AlertNotificationChannel {
  public name: string;
  private enabled: boolean;
  private webhookUrl: string;
  private channel: string;
  
  constructor(config: { enabled: boolean; webhookUrl: string; channel: string }) {
    this.name = 'slack';
    this.enabled = config.enabled;
    this.webhookUrl = config.webhookUrl;
    this.channel = config.channel;
  }
  
  async notify(alert: PerformanceAlert): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      // In a real implementation, this would send a Slack message
      console.log(`[Slack Alert] Would send message to ${this.channel} about: ${alert.message}`);
      return true;
    } catch (error) {
      console.error('Error sending Slack alert:', error);
      return false;
    }
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  getConfig(): Record<string, unknown> {
    return {
      enabled: this.enabled,
      webhookUrl: this.webhookUrl ? '***' : '',
      channel: this.channel
    };
  }
}

/**
 * In-app notification channel
 */
class InAppAlertChannel implements AlertNotificationChannel {
  public name: string;
  private enabled: boolean;
  private alerts: PerformanceAlert[] = [];
  
  constructor(config: { enabled: boolean }) {
    this.name = 'in-app';
    this.enabled = config.enabled;
  }
  
  async notify(alert: PerformanceAlert): Promise<boolean> {
    if (!this.enabled) return false;
    
    try {
      // Store the alert for in-app display
      this.alerts.push(alert);
      
      // Keep only the last 100 alerts
      if (this.alerts.length > 100) {
        this.alerts = this.alerts.slice(-100);
      }
      
      return true;
    } catch (error) {
      console.error('Error storing in-app alert:', error);
      return false;
    }
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
  
  getConfig(): Record<string, unknown> {
    return {
      enabled: this.enabled
    };
  }
  
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }
  
  clearAlerts(): void {
    this.alerts = [];
  }
}

/**
 * Alert notifier service
 */
class AlertNotifier {
  private channels: Map<string, AlertNotificationChannel> = new Map();
  private alertHistory: { alert: PerformanceAlert; notifiedChannels: string[] }[] = [];
  
  constructor() {
    // Initialize default channels
    this.channels.set('email', new EmailAlertChannel({
      enabled: false,
      recipients: []
    }));
    
    this.channels.set('slack', new SlackAlertChannel({
      enabled: false,
      webhookUrl: '',
      channel: ''
    }));
    
    this.channels.set('in-app', new InAppAlertChannel({
      enabled: true
    }));
  }
  
  /**
   * Configure a notification channel
   */
  configureChannel(_name: string, config: Record<string, unknown>): void {
    const channel = this.channels.get(_name);
    
    if (!channel) {
      throw new Error(`Unknown notification channel: ${_name}`);
    }
    
    switch (_name) {
      case 'email':
        this.channels.set('email', new EmailAlertChannel({
          enabled: config.enabled as boolean ?? false,
          recipients: config.recipients as string[] ?? []
        }));
        break;
        
      case 'slack':
        this.channels.set('slack', new SlackAlertChannel({
          enabled: config.enabled as boolean ?? false,
          webhookUrl: config.webhookUrl as string ?? '',
          channel: config.channel as string ?? ''
        }));
        break;
        
      case 'in-app':
        this.channels.set('in-app', new InAppAlertChannel({
          enabled: config.enabled as boolean ?? true
        }));
        break;
        
      default:
        throw new Error(`Unknown notification channel: ${_name}`);
    }
  }
  
  /**
   * Get channel configuration
   */
  getChannelConfig(name: string): unknown {
    const channel = this.channels.get(name);
    return channel ? channel.getConfig() : null;
  }
  
  /**
   * Get all channel configurations
   */
  getAllChannelConfigs(): unknown[] {
    const configs: unknown[] = [];
    
    for (const [, channel] of this.channels.entries()) {
      configs.push(channel.getConfig());
    }
    
    return configs;
  }
  
  /**
   * Notify all enabled channels about an alert
   */
  async notifyAlert(alert: PerformanceAlert): Promise<string[]> {
    const notifiedChannels: string[] = [];
    
    for (const [, channel] of this.channels.entries()) {
      if (channel.isEnabled()) {
        try {
          const success = await channel.notify(alert);
          if (success) {
            // Não adicionar o nome do canal, pois não está sendo usado
          }
        } catch {
          // Não logar o nome do canal, pois não está sendo usado
        }
      }
    }
    
    // Record the notification in history
    this.alertHistory.push({
      alert,
      notifiedChannels
    });
    
    // Keep only the last 1000 notifications
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }
    
    return notifiedChannels;
  }
  
  /**
   * Get in-app alerts
   */
  getInAppAlerts(): PerformanceAlert[] {
    const inAppChannel = this.channels.get('in-app') as InAppAlertChannel;
    return inAppChannel ? inAppChannel.getAlerts() : [];
  }
  
  /**
   * Clear in-app alerts
   */
  clearInAppAlerts(): void {
    const inAppChannel = this.channels.get('in-app') as InAppAlertChannel;
    if (inAppChannel) {
      inAppChannel.clearAlerts();
    }
  }
  
  /**
   * Get alert notification history
   */
  getAlertHistory(): { alert: PerformanceAlert; notifiedChannels: string[] }[] {
    return [...this.alertHistory];
  }
}

// Export singleton instance
export const alertNotifier = new AlertNotifier();