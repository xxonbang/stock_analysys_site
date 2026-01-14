/**
 * 외부 알림 전송 시스템
 * 
 * 이메일, Slack, Discord 등 외부 서비스로 알림 전송
 */

import type { Alert } from './alert-system';
import axios from 'axios';

interface NotificationConfig {
  email?: {
    enabled: boolean;
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl?: string;
  };
}

/**
 * 환경 변수에서 알림 설정 로드
 */
function getNotificationConfig(): NotificationConfig {
  return {
    email: {
      enabled: process.env.ALERT_EMAIL_ENABLED === 'true',
    },
    slack: {
      enabled: process.env.ALERT_SLACK_ENABLED === 'true',
      webhookUrl: process.env.ALERT_SLACK_WEBHOOK_URL,
    },
    discord: {
      enabled: process.env.ALERT_DISCORD_ENABLED === 'true',
      webhookUrl: process.env.ALERT_DISCORD_WEBHOOK_URL,
    },
  };
}

/**
 * Slack으로 알림 전송
 */
async function sendSlackNotification(alert: Alert): Promise<void> {
  const config = getNotificationConfig();
  
  if (!config.slack?.enabled || !config.slack.webhookUrl) {
    return;
  }

  const severityColors: Record<Alert['severity'], string> = {
    critical: '#FF0000',
    high: '#FF6B00',
    medium: '#FFA500',
    low: '#0066CC',
  };

  const severityEmoji: Record<Alert['severity'], string> = {
    critical: '🚨',
    high: '🔴',
    medium: '⚠️',
    low: 'ℹ️',
  };

  const payload = {
    text: `${severityEmoji[alert.severity]} *${alert.title}*`,
    attachments: [
      {
        color: severityColors[alert.severity],
        fields: [
          {
            title: '심각도',
            value: alert.severity.toUpperCase(),
            short: true,
          },
          {
            title: '유형',
            value: alert.type,
            short: true,
          },
          {
            title: '데이터 소스',
            value: alert.dataSource,
            short: true,
          },
          ...(alert.symbol
            ? [
                {
                  title: '종목',
                  value: alert.symbol,
                  short: true,
                },
              ]
            : []),
          {
            title: '메시지',
            value: alert.message,
            short: false,
          },
          {
            title: '발생 시간',
            value: new Date(alert.timestamp).toLocaleString('ko-KR'),
            short: true,
          },
        ],
        footer: 'Stock Insight Alert System',
        ts: Math.floor(alert.timestamp / 1000),
      },
    ],
  };

  try {
    await axios.post(config.slack.webhookUrl, payload, {
      timeout: 5000,
    });
    console.log(`[Alert] Slack notification sent for alert: ${alert.id}`);
  } catch (error) {
    console.error(`[Alert] Failed to send Slack notification:`, error);
    throw error;
  }
}

/**
 * Discord로 알림 전송
 */
async function sendDiscordNotification(alert: Alert): Promise<void> {
  const config = getNotificationConfig();
  
  if (!config.discord?.enabled || !config.discord.webhookUrl) {
    return;
  }

  const severityColors: Record<Alert['severity'], number> = {
    critical: 0xff0000, // Red
    high: 0xff6b00, // Orange
    medium: 0xffa500, // Orange
    low: 0x0066cc, // Blue
  };

  const severityEmoji: Record<Alert['severity'], string> = {
    critical: '🚨',
    high: '🔴',
    medium: '⚠️',
    low: 'ℹ️',
  };

  const embed = {
    title: `${severityEmoji[alert.severity]} ${alert.title}`,
    description: alert.message,
    color: severityColors[alert.severity],
    fields: [
      {
        name: '심각도',
        value: alert.severity.toUpperCase(),
        inline: true,
      },
      {
        name: '유형',
        value: alert.type,
        inline: true,
      },
      {
        name: '데이터 소스',
        value: alert.dataSource,
        inline: true,
      },
      ...(alert.symbol
        ? [
            {
              name: '종목',
              value: alert.symbol,
              inline: true,
            },
          ]
        : []),
    ],
    timestamp: new Date(alert.timestamp).toISOString(),
    footer: {
      text: 'Stock Insight Alert System',
    },
  };

  const payload = {
    embeds: [embed],
  };

  try {
    await axios.post(config.discord.webhookUrl, payload, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    console.log(`[Alert] Discord notification sent for alert: ${alert.id}`);
  } catch (error) {
    console.error(`[Alert] Failed to send Discord notification:`, error);
    throw error;
  }
}

/**
 * 이메일로 알림 전송
 * 
 * 이메일 알림을 사용하려면:
 * 1. npm install nodemailer
 * 2. 환경 변수 설정 (ALERT_EMAIL_*)
 * 3. 이 함수의 주석을 해제하고 구현
 * 
 * 현재는 이메일 기능이 비활성화되어 있습니다.
 * 필요시 별도로 구현하거나 nodemailer를 설치한 후 활성화하세요.
 */
async function sendEmailNotification(alert: Alert): Promise<void> {
  const config = getNotificationConfig();
  
  if (!config.email?.enabled) {
    return;
  }

  // 이메일 기능은 nodemailer 설치 후 활성화 가능
  // 현재는 비활성화되어 있음
  console.warn('[Alert] Email notification is not implemented. Install nodemailer and configure email settings to enable.');
  
  // TODO: nodemailer 설치 후 아래 코드 활성화
  /*
  try {
    const nodemailer = await import('nodemailer');
    // 이메일 전송 로직 구현
  } catch (error) {
    console.warn('[Alert] Nodemailer not installed. Install with: npm install nodemailer');
  }
  */
}

/**
 * 모든 활성화된 외부 알림 채널로 알림 전송
 */
export async function sendExternalNotifications(alert: Alert): Promise<void> {
  const promises: Promise<void>[] = [];

  // Critical/High 심각도만 외부 알림 전송 (선택사항)
  const sendOnlyCritical = process.env.ALERT_EXTERNAL_ONLY_CRITICAL === 'true';
  if (sendOnlyCritical && alert.severity !== 'critical' && alert.severity !== 'high') {
    return;
  }

  // Slack 알림
  if (getNotificationConfig().slack?.enabled) {
    promises.push(sendSlackNotification(alert).catch((error) => {
      console.error(`[Alert] Slack notification failed:`, error);
    }));
  }

  // Discord 알림
  if (getNotificationConfig().discord?.enabled) {
    promises.push(sendDiscordNotification(alert).catch((error) => {
      console.error(`[Alert] Discord notification failed:`, error);
    }));
  }

  // 이메일 알림
  if (getNotificationConfig().email?.enabled) {
    promises.push(sendEmailNotification(alert).catch((error) => {
      console.error(`[Alert] Email notification failed:`, error);
    }));
  }

  // 모든 알림을 병렬로 전송 (하나 실패해도 다른 것은 계속)
  await Promise.allSettled(promises);
}
