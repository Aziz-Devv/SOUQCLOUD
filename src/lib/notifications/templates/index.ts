import {
  CustomerOrderConfirmationPayload,
  MerchantNewOrderAlertPayload,
  CustomerOrderFulfilledPayload,
  AuthVerifyEmailPayload,
  AuthPasswordResetPayload,
} from '../types';

/**
 * Base responsive email wrapper with Arabic RTL styling.
 */
function wrapEmailHtml(content: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
      direction: rtl;
      text-align: right;
      color: #0f172a;
    }
    .container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #0284c7;
      color: #ffffff;
      padding: 24px 30px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
    }
    .body {
      padding: 30px;
      line-height: 1.6;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 16px 30px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .btn {
      display: inline-block;
      background-color: #0284c7;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      padding: 12px 24px;
      border-radius: 8px;
      margin-top: 20px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
      margin-bottom: 16px;
    }
    .table th {
      background-color: #f8fafc;
      padding: 10px;
      border-bottom: 2px solid #e2e8f0;
      font-size: 13px;
      color: #475569;
    }
    .table td {
      padding: 10px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
      background-color: #dcfce7;
      color: #166534;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>سوق كلاود — SOUQCLOUD</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>هذا البريد مرسل تلقائياً من منصة سوق كلاود لتجارة التجزئة الإلكترونية.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Customer Order Confirmation Email Template
 */
export function renderCustomerOrderConfirmationEmail(
  payload: CustomerOrderConfirmationPayload
): { subject: string; html: string; text: string } {
  const subject = `تأكيد استلام طلبك #${payload.orderNumber} من ${payload.storeName}`;

  const itemsHtml = payload.items
    .map(
      (item) => `
      <tr>
        <td>
          <strong>${item.title}</strong>
          ${item.variantTitle ? `<br><small style="color:#64748b">${item.variantTitle}</small>` : ''}
        </td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:left">${item.priceFormatted} ${payload.currency}</td>
        <td style="text-align:left"><strong>${item.totalFormatted} ${payload.currency}</strong></td>
      </tr>`
    )
    .join('');

  const htmlContent = `
    <h2>مرحباً ${payload.customerName} 👋</h2>
    <p>شكراً لطلبك من متجر <strong>${payload.storeName}</strong>. تم استلام طلبك بنجاح وجاري العمل على مراجعته وتجهيزه.</p>
    
    <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:20px 0;">
      <h3 style="margin-top:0; font-size:15px; color:#0f172a;">تفاصيل الطلب:</h3>
      <p style="margin:4px 0;"><strong>رقم الطلب:</strong> #${payload.orderNumber}</p>
      <p style="margin:4px 0;"><strong>الاسم:</strong> ${payload.customerName}</p>
      <p style="margin:4px 0;"><strong>الهاتف:</strong> <span dir="ltr">${payload.customerPhone}</span></p>
      ${payload.shippingAddressText ? `<p style="margin:4px 0;"><strong>عنوان التوصيل:</strong> ${payload.shippingAddressText}</p>` : ''}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th style="text-align:right">المنتج</th>
          <th style="text-align:center">الكمية</th>
          <th style="text-align:left">السعر</th>
          <th style="text-align:left">الإجمالي</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="margin-top:16px; border-top:1px solid #e2e8f0; padding-top:12px;">
      <div style="display:flex; justify-content:space-between; margin:4px 0; font-size:13px; color:#64748b;">
        <span>المجموع الفرعي:</span>
        <span>${payload.subtotalFormatted} ${payload.currency}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin:4px 0; font-size:13px; color:#64748b;">
        <span>رسوم التوصيل:</span>
        <span>${payload.deliveryFeeFormatted} ${payload.currency}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin:4px 0; font-size:13px; color:#64748b;">
        <span>ضريبة القيمة المضافة:</span>
        <span>${payload.taxFormatted} ${payload.currency}</span>
      </div>
      <div style="display:flex; justify-content:space-between; margin:8px 0; font-size:16px; font-weight:bold; color:#0f172a; border-top:1px solid #e2e8f0; padding-top:8px;">
        <span>المجموع الكلي:</span>
        <span style="color:#0284c7;">${payload.totalFormatted} ${payload.currency}</span>
      </div>
    </div>

    ${
      payload.orderConfirmationUrl
        ? `<div style="text-align:center; margin-top:24px;">
            <a href="${payload.orderConfirmationUrl}" class="btn">عرض تفاصيل الطلب عبر المتجر</a>
          </div>`
        : ''
    }
  `;

  const textContent = `
مرحباً ${payload.customerName}،
شكراً لطلبك من متجر ${payload.storeName}.
تم استلام طلبك رقم #${payload.orderNumber} بنجاح.

المجموع الكلي: ${payload.totalFormatted} ${payload.currency}

سوق كلاود
  `.trim();

  return {
    subject,
    html: wrapEmailHtml(htmlContent, subject),
    text: textContent,
  };
}

/**
 * 2. Merchant New Order Alert Email Template
 */
export function renderMerchantNewOrderAlertEmail(
  payload: MerchantNewOrderAlertPayload
): { subject: string; html: string; text: string } {
  const subject = `طلب جديد #${payload.orderNumber} في متجر ${payload.storeName}`;

  const htmlContent = `
    <h2>طلب جديد وارد! 🔔</h2>
    <p>تم استلام طلب جديد رقم <strong>#${payload.orderNumber}</strong> في متجرك <strong>${payload.storeName}</strong>.</p>
    
    <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:20px 0;">
      <p style="margin:4px 0;"><strong>العميل:</strong> ${payload.customerName}</p>
      <p style="margin:4px 0;"><strong>رقم الهاتف:</strong> <span dir="ltr">${payload.customerPhone}</span></p>
      ${payload.customerEmail ? `<p style="margin:4px 0;"><strong>البريد:</strong> ${payload.customerEmail}</p>` : ''}
      <p style="margin:4px 0;"><strong>طريقة الطلب:</strong> ${payload.orderModeUsed}</p>
      <p style="margin:4px 0;"><strong>الملخص:</strong> ${payload.itemsSummary}</p>
      <p style="margin:4px 0;"><strong>الإجمالي:</strong> <strong>${payload.totalFormatted} ${payload.currency}</strong></p>
    </div>

    <div style="text-align:center; margin-top:24px;">
      <a href="${payload.dashboardOrderUrl}" class="btn">إدارة الطلب وتحديث الحالة</a>
    </div>
  `;

  const textContent = `
طلب جديد #${payload.orderNumber} في متجرك ${payload.storeName}
العميل: ${payload.customerName} (${payload.customerPhone})
الإجمالي: ${payload.totalFormatted} ${payload.currency}

رابط الطلب في لوحة التحكم: ${payload.dashboardOrderUrl}
  `.trim();

  return {
    subject,
    html: wrapEmailHtml(htmlContent, subject),
    text: textContent,
  };
}

/**
 * 3. Customer Order Fulfilled Email Template
 */
export function renderCustomerOrderFulfilledEmail(
  payload: CustomerOrderFulfilledPayload
): { subject: string; html: string; text: string } {
  const statusArabic =
    payload.fulfillmentStatus === 'READY' ? 'جاهز للتسليم/الشحن' : 'تم التوصيل بنجاح';
  const subject = `تحديث طلبك #${payload.orderNumber}: ${statusArabic}`;

  const htmlContent = `
    <h2>تحديث حالة الطلب ✨</h2>
    <p>مرحباً ${payload.customerName}،</p>
    <p>يسعدنا إبلاغك بأن طلبك رقم <strong>#${payload.orderNumber}</strong> من متجر <strong>${payload.storeName}</strong> أصبح الآن:</p>
    
    <div style="text-align:center; margin:24px 0;">
      <span class="badge" style="font-size:16px; padding:8px 18px;">${statusArabic}</span>
    </div>

    ${
      payload.fulfillmentNotes
        ? `<div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:20px 0;">
            <strong>ملاحظات التوصيل:</strong>
            <p style="margin:6px 0 0 0;">${payload.fulfillmentNotes}</p>
          </div>`
        : ''
    }

    <p>شكراً لتسوقك معنا!</p>
  `;

  const textContent = `
مرحباً ${payload.customerName}،
تم تحديث حالة طلبك رقم #${payload.orderNumber} من متجر ${payload.storeName} إلى: ${statusArabic}.

سوق كلاود
  `.trim();

  return {
    subject,
    html: wrapEmailHtml(htmlContent, subject),
    text: textContent,
  };
}

/**
 * 4. Auth Verify Email Template
 */
export function renderAuthVerifyEmail(
  payload: AuthVerifyEmailPayload
): { subject: string; html: string; text: string } {
  const subject = 'تأكيد البريد الإلكتروني — سوق كلاود';

  const htmlContent = `
    <h2>مرحباً بك في سوق كلاود 👋</h2>
    <p>شكراً لإنشاء حساب تاجر جديد في منصة سوق كلاود.</p>
    <p>يرجى تأكيد بريدك الإلكتروني للبدء في إدارة متاجرك الإلكترونية وتلقي الطلبات.</p>

    ${
      payload.otpCode
        ? `<div style="text-align:center; margin:24px 0;">
            <div style="font-size:28px; font-weight:bold; letter-spacing:4px; color:#0284c7; background-color:#f1f5f9; padding:12px; border-radius:8px; display:inline-block;">
              ${payload.otpCode}
            </div>
          </div>`
        : ''
    }

    ${
      payload.verificationUrl
        ? `<div style="text-align:center; margin-top:24px;">
            <a href="${payload.verificationUrl}" class="btn">تأكيد البريد الإلكتروني الآن</a>
          </div>`
        : ''
    }
  `;

  const textContent = `
مرحباً بك في سوق كلاود!
يرجى تأكيد بريدك الإلكتروني للبدء.
${payload.otpCode ? `رمز التحقق: ${payload.otpCode}` : ''}
${payload.verificationUrl ? `الرابط: ${payload.verificationUrl}` : ''}
  `.trim();

  return {
    subject,
    html: wrapEmailHtml(htmlContent, subject),
    text: textContent,
  };
}

/**
 * 5. Auth Password Reset Email Template
 */
export function renderAuthPasswordResetEmail(
  payload: AuthPasswordResetPayload
): { subject: string; html: string; text: string } {
  const subject = 'إعادة تعيين كلمة المرور — سوق كلاود';

  const htmlContent = `
    <h2>طلب إعادة تعيين كلمة المرور</h2>
    <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في سوق كلاود.</p>
    <p>إذا لم تكن قد طلبت ذلك، يمكنك تجاهل هذا البريد بأمان.</p>

    ${
      payload.resetUrl
        ? `<div style="text-align:center; margin-top:24px;">
            <a href="${payload.resetUrl}" class="btn">إعادة تعيين كلمة المرور</a>
          </div>`
        : ''
    }
  `;

  const textContent = `
طلب إعادة تعيين كلمة المرور في سوق كلاود.
إذا كنت قد طلبت ذلك، استخدم الرابط التالي:
${payload.resetUrl || ''}
  `.trim();

  return {
    subject,
    html: wrapEmailHtml(htmlContent, subject),
    text: textContent,
  };
}
