// Reusable branded email for order lifecycle milestones (confirmed, shipped,
// delivered, cancelled, …). The same layout is reused for every stage — only the
// headline / message / badge / accent change. Used for both customer and admin
// notifications.
export const generateOrderStatusEmail = ({
  brandName,
  recipientName,
  orderNumber,
  headline,
  message,
  badge,
  accent,
  total,
  orderDate,
}: {
  brandName: string;
  recipientName: string;
  orderNumber: string;
  headline: string;
  message: string;
  badge: string;
  accent: string;
  total: number;
  orderDate: string;
}) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${headline}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EEE8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F5EEE8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#51311B;border-radius:12px 12px 0 0;padding:34px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:2px;color:#DECBBA;font-family:Georgia,serif;">
                ${brandName}
              </h1>
            </td>
          </tr>

          <!-- STATUS -->
          <tr>
            <td style="background-color:#ffffff;padding:44px 40px 28px;text-align:center;">
              <span style="display:inline-block;background-color:${accent};color:#ffffff;font-size:12px;font-weight:700;letter-spacing:1px;padding:7px 18px;border-radius:999px;margin-bottom:22px;">
                ${badge}
              </span>
              <h2 style="margin:0 0 14px;font-size:24px;font-weight:700;color:#51311B;font-family:Georgia,serif;">
                ${headline}
              </h2>
              <p style="margin:0;font-size:15px;line-height:1.9;color:#706257;">
                ${recipientName ? `أهلاً ${recipientName}،<br>` : ""}${message}
              </p>
            </td>
          </tr>

          <!-- ORDER BOX -->
          <tr>
            <td style="background-color:#ffffff;padding:0 40px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF6F1;border:1px solid #EFE6DC;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;font-size:13px;color:#9A8B7C;border-bottom:1px solid #EFE6DC;">رقم الطلب</td>
                  <td align="left" style="padding:16px 20px;font-size:14px;font-weight:700;color:#51311B;border-bottom:1px solid #EFE6DC;">#${orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;font-size:13px;color:#9A8B7C;border-bottom:1px solid #EFE6DC;">التاريخ</td>
                  <td align="left" style="padding:16px 20px;font-size:14px;color:#51311B;border-bottom:1px solid #EFE6DC;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;font-size:13px;color:#9A8B7C;">الإجمالي</td>
                  <td align="left" style="padding:16px 20px;font-size:16px;font-weight:800;color:#51311B;">EGP ${Number(total ?? 0).toFixed(2)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#DECBBA;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#51311B;">${brandName}</p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:#706257;">
                &copy; ${new Date().getFullYear()} ${brandName}. جميع الحقوق محفوظة.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
