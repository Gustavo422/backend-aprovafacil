import nodemailer from 'nodemailer';
import fetch from 'node-fetch';

// Enviar alerta por email
export async function sendEmailAlert(subject: string, message: string, to?: string) {
  const transporter = nodemailer.createTransport({
    host: process.env['ALERT_EMAIL_HOST'],
    port: Number(process.env['ALERT_EMAIL_PORT'] || 587),
    secure: false,
    auth: {
      user: process.env['ALERT_EMAIL_USER'],
      pass: process.env['ALERT_EMAIL_PASS'],
    },
  });

  const mailOptions = {
    from: process.env['ALERT_EMAIL_FROM'] || process.env['ALERT_EMAIL_USER'],
    to: to || process.env['ALERT_EMAIL_TO'],
    subject,
    text: message,
  };

  await transporter.sendMail(mailOptions);
}

// Enviar alerta para Slack via webhook
export async function sendSlackAlert(message: string) {
  const webhookUrl = process.env['ALERT_SLACK_WEBHOOK_URL'];
  if (!webhookUrl) return;
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: message }),
  });
} 



