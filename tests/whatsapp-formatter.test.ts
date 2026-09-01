import { describe, it, expect } from 'vitest';
import {
  compileWhatsAppOrderMessage,
  generateWhatsAppUrl,
  WhatsAppOrderDetails,
} from '../src/lib/checkout/whatsapp-formatter';

describe('WhatsApp Order Message Formatter (ADR-005 & docs/03-modules/checkout.md)', () => {
  const sampleOrder: WhatsAppOrderDetails = {
    storeName: 'متجر العطور الفاخرة',
    orderNumber: 1005,
    customerName: 'سارة خالد',
    customerPhone: '+966501234567',
    customerNotes: 'يرجى الاتصال قبل التوصيل',
    shippingAddress: {
      street: 'طريق الملك فهد، حي الصحافة',
      city: 'الرياض',
      country: 'SA',
    },
    currency: 'SAR',
    subtotalCents: 45000,
    taxCents: 6750,
    shippingCents: 2000,
    totalCents: 53750,
    lineItems: [
      {
        title: 'عطر مسك فاخر',
        variantTitle: '100 مل',
        quantity: 2,
        unitPriceCents: 20000,
        totalPriceCents: 40000,
      },
      {
        title: 'بخور ملكي',
        variantTitle: 'Default',
        quantity: 1,
        unitPriceCents: 5000,
        totalPriceCents: 5000,
      },
    ],
  };

  it('compiles a structured Arabic WhatsApp order message from canonical data', () => {
    const msg = compileWhatsAppOrderMessage(sampleOrder);

    expect(msg).toContain('متجر العطور الفاخرة');
    expect(msg).toContain('#1005');
    expect(msg).toContain('سارة خالد');
    expect(msg).toContain('+966501234567');
    expect(msg).toContain('عطر مسك فاخر');
    expect(msg).toContain('400.00 SAR');
    expect(msg).toContain('بخور ملكي');
    expect(msg).toContain('537.50 SAR');
    expect(msg).toContain('طريق الملك فهد، حي الصحافة');
    expect(msg).toContain('يرجى الاتصال قبل التوصيل');
  });

  it('generates a valid https://wa.me URL with urlencoded text', () => {
    const url = generateWhatsAppUrl('+966509876543', sampleOrder);

    expect(url).toBeDefined();
    expect(url).toContain('https://wa.me/966509876543?text=');
    expect(url).toContain(encodeURIComponent('سارة خالد'));
    expect(url).toContain(encodeURIComponent('#1005'));
  });

  it('returns null if WhatsApp phone is missing or unconfigured', () => {
    const urlNull = generateWhatsAppUrl(null, sampleOrder);
    expect(urlNull).toBeNull();

    const urlEmpty = generateWhatsAppUrl('', sampleOrder);
    expect(urlEmpty).toBeNull();
  });
});
