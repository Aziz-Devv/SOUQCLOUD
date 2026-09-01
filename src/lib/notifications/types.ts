/**
 * Notification Domain Types & Interfaces
 * Specification: docs/03-modules/notifications.md, docs/02-database/entities/notifications.md
 */

export type NotificationChannel = 'EMAIL' | 'IN_APP' | 'WEBHOOK';
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED';

export type NotificationEventType =
  | 'CUSTOMER_ORDER_CONFIRMATION'
  | 'MERCHANT_NEW_ORDER_ALERT'
  | 'CUSTOMER_ORDER_FULFILLED'
  | 'AUTH_VERIFY_EMAIL'
  | 'AUTH_PASSWORD_RESET';

export interface NotificationRecord {
  id: string;
  storeId: string | null;
  recipient: string;
  channel: NotificationChannel;
  eventType: NotificationEventType | string;
  status: NotificationStatus;
  subject: string | null;
  payload: Record<string, unknown>;
  errorMessage: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface EmailProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailProviderAdapter {
  sendEmail(message: EmailMessage): Promise<EmailProviderResult>;
}

export interface CustomerOrderConfirmationPayload {
  storeId: string;
  storeName: string;
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  currency: string;
  subtotalFormatted: string;
  deliveryFeeFormatted: string;
  taxFormatted: string;
  totalFormatted: string;
  shippingAddressText?: string;
  items: Array<{
    title: string;
    variantTitle?: string;
    quantity: number;
    priceFormatted: string;
    totalFormatted: string;
  }>;
  orderConfirmationUrl?: string;
}

export interface MerchantNewOrderAlertPayload {
  storeId: string;
  storeName: string;
  merchantEmail: string;
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  orderModeUsed: string;
  currency: string;
  totalFormatted: string;
  itemsSummary: string;
  dashboardOrderUrl: string;
}

export interface CustomerOrderFulfilledPayload {
  storeId: string;
  storeName: string;
  orderId: string;
  orderNumber: number;
  customerName: string;
  customerEmail: string;
  fulfillmentStatus: 'READY' | 'DELIVERED';
  fulfillmentNotes?: string;
  currency: string;
  totalFormatted: string;
}

export interface AuthVerifyEmailPayload {
  userEmail: string;
  verificationUrl?: string;
  otpCode?: string;
}

export interface AuthPasswordResetPayload {
  userEmail: string;
  resetUrl?: string;
}

export type NotificationEventPayloadMap = {
  CUSTOMER_ORDER_CONFIRMATION: CustomerOrderConfirmationPayload;
  MERCHANT_NEW_ORDER_ALERT: MerchantNewOrderAlertPayload;
  CUSTOMER_ORDER_FULFILLED: CustomerOrderFulfilledPayload;
  AUTH_VERIFY_EMAIL: AuthVerifyEmailPayload;
  AUTH_PASSWORD_RESET: AuthPasswordResetPayload;
};

export interface NotificationFilters {
  status?: NotificationStatus | 'ALL';
  eventType?: string;
  page?: number;
  limit?: number;
}
