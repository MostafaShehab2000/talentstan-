import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FcmService implements OnModuleInit {
  private readonly logger = new Logger(FcmService.name);
  private initialized = false;

  onModuleInit() {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      this.logger.warn('FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
      return;
    }
    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
        });
      }
      this.initialized = true;
      this.logger.log('Firebase Admin initialized ✅');
    } catch (e) {
      this.logger.error('Firebase init failed', e);
    }
  }

  async send(token: string, title: string, body: string, data?: Record<string, string>) {
    if (!this.initialized || !token) return;
    try {
      await admin.messaging().send({
        token,
        notification: { title, body },
        data,
        android: { priority: 'high', notification: { channelId: 'talentstan_high' } },
      });
    } catch (e) {
      this.logger.warn(`FCM send failed for token ${token.substring(0, 10)}...`);
    }
  }

  async sendToMany(tokens: string[], title: string, body: string, data?: Record<string, string>) {
    if (!this.initialized || !tokens.length) return;
    const valid = tokens.filter(Boolean);
    if (!valid.length) return;
    await Promise.allSettled(valid.map(t => this.send(t, title, body, data)));
  }
}
