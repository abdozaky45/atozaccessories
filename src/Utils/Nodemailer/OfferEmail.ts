// Promotional email broadcast to all customers when a new offer goes live.
// Branded to match the rest of the system (welcome / invoice / status emails).
export const generateOfferEmail = ({
  brandName,
  offerTitle,
  offerDescription,
  imageUrl,
  shopUrl,
}: {
  brandName: string;
  offerTitle: string;
  offerDescription?: string;
  imageUrl?: string;
  shopUrl: string;
}) => `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${offerTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EEE8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F5EEE8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#51311B;border-radius:12px 12px 0 0;padding:34px 40px;text-align:center;">
              <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;letter-spacing:2px;color:#DECBBA;font-family:Georgia,serif;">
                ${brandName}
              </h1>
              <p style="margin:0;font-size:12px;color:#BD8958;letter-spacing:2px;text-transform:uppercase;">
                عرض جديد
              </p>
            </td>
          </tr>

          ${imageUrl ? `
          <!-- OFFER IMAGE -->
          <tr>
            <td style="background-color:#ffffff;padding:0;line-height:0;">
              <img src="${imageUrl}" alt="${offerTitle}" width="600" style="display:block;width:100%;max-width:600px;height:auto;">
            </td>
          </tr>` : ""}

          <!-- BODY -->
          <tr>
            <td style="background-color:#ffffff;padding:40px 40px 36px;text-align:center;">
              <span style="display:inline-block;background-color:#DECBBA;color:#51311B;font-size:12px;font-weight:700;letter-spacing:1px;padding:7px 18px;border-radius:999px;margin-bottom:22px;">
                🎉 عرض حصري
              </span>
              <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#51311B;font-family:Georgia,serif;">
                ${offerTitle}
              </h2>
              ${offerDescription ? `
              <p style="margin:0 0 30px;font-size:15px;line-height:1.9;color:#706257;">
                ${offerDescription}
              </p>` : `<div style="height:10px;"></div>`}
              <a href="${shopUrl}"
                 style="display:inline-block;background-color:#51311B;color:#DECBBA;text-decoration:none;font-size:15px;font-weight:700;padding:14px 48px;border-radius:8px;letter-spacing:1px;">
                تسوق الآن
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#DECBBA;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#51311B;">${brandName}</p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:#706257;">
                وصلك هذا البريد لأنك من عملاء ${brandName}.<br>
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
