export const welcomeEmailText = () =>
`أهلاً وسهلاً بك في A to Z Accessory!

يسعدنا انضمامك إلى عائلتنا. الآن يمكنك استعراض أحدث الإكسسوارات وأجمل القطع المختارة بعناية لك.

تسوق الآن: https://www.atozaccessory.com

---
A to Z Accessory
© ${new Date().getFullYear()} جميع الحقوق محفوظة.
لإلغاء الاشتراك: mailto:atozaccessories0@gmail.com?subject=unsubscribe`;

export const welcomeEmailTemplate = () =>
  `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>أهلاً بك في A to Z Accessory</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EEE8;font-family:Arial,Helvetica,sans-serif;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F5EEE8;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#51311B;border-radius:12px 12px 0 0;padding:40px 40px 32px;text-align:center;">
              <h1 style="margin:0 0 10px;font-size:30px;font-weight:800;letter-spacing:2px;color:#DECBBA;font-family:Georgia,serif;">
                A to Z Accessory
              </h1>
              <p style="margin:0;font-size:14px;color:#BD8958;letter-spacing:1px;">
                اكتشف ستايلك — من A إلى Z
              </p>
            </td>
          </tr>

          <!-- HERO -->
          <tr>
            <td style="background-color:#ffffff;padding:48px 40px 36px;text-align:center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="width:64px;height:64px;background-color:#DECBBA;border-radius:50%;text-align:center;vertical-align:middle;font-size:28px;line-height:64px;">
                    🎁
                  </td>
                </tr>
              </table>
              <h2 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#51311B;font-family:Georgia,serif;">
                أهلاً وسهلاً بك!
              </h2>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.9;color:#706257;">
                يسعدنا انضمامك إلى عائلة
                <strong style="color:#51311B;">A to Z Accessory</strong>.<br>
                الآن يمكنك استعراض أحدث الإكسسوارات<br>
                وأجمل القطع المختارة بعناية خصيصاً لك.
              </p>
              <a href="https://www.atozaccessory.com"
                 style="display:inline-block;background-color:#51311B;color:#DECBBA;text-decoration:none;font-size:15px;font-weight:700;padding:14px 44px;border-radius:8px;letter-spacing:1px;">
                تسوق الآن
              </a>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="background-color:#ffffff;padding:0 40px;">
              <div style="height:1px;background-color:#DECBBA;"></div>
            </td>
          </tr>

          <!-- FEATURES -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 24px 44px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="33%" style="text-align:center;padding:0 12px;">
                    <p style="margin:0 0 8px;font-size:26px;">✨</p>
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#51311B;">إكسسوارات مختارة</p>
                    <p style="margin:0;font-size:12px;color:#706257;">جودة عالية</p>
                  </td>
                  <td width="33%" style="text-align:center;padding:0 12px;border-right:1px solid #DECBBA;border-left:1px solid #DECBBA;">
                    <p style="margin:0 0 8px;font-size:26px;">🚚</p>
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#51311B;">توصيل سريع</p>
                    <p style="margin:0;font-size:12px;color:#706257;">لباب بيتك</p>
                  </td>
                  <td width="33%" style="text-align:center;padding:0 12px;">
                    <p style="margin:0 0 8px;font-size:26px;">💎</p>
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#51311B;">عروض حصرية</p>
                    <p style="margin:0;font-size:12px;color:#706257;">لأعضائنا فقط</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#DECBBA;border-radius:0 0 12px 12px;padding:28px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#51311B;">A to Z Accessory</p>
              <p style="margin:0 0 12px;font-size:12px;color:#706257;">
                © ${new Date().getFullYear()} A to Z Accessory. جميع الحقوق محفوظة.
              </p>
              <p style="margin:0;font-size:11px;color:#706257;">
                إذا لم تقم بإنشاء هذا الحساب، يمكنك تجاهل هذا البريد.<br>
                <a href="mailto:atozaccessories0@gmail.com?subject=unsubscribe"
                   style="color:#BD8958;text-decoration:none;">إلغاء الاشتراك</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;

export const activeCodeTemplate = (activeCode: string) =>
  `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Code</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #000000;
            font-family: Arial, sans-serif;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
            text-align: center;
            background-color: #111111;
        }
        .logo {
            color: #ffffff;
            font-size: 20px;
            margin-bottom: 30px;
        }
        .message {
            color: #ffffff;
            font-size: 16px;
            margin-bottom: 20px;
        }
        .code {
            color: #ffffff;
            font-size: 32px;
            letter-spacing: 8px;
            margin: 30px 0;
            font-family: monospace;
        }
        .footer {
            color: #666666;
            font-size: 12px;
            margin-top: 40px;
        }
        .expiry {
            color: #ffffff;
            font-size: 14px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">
            a.to.zaccessories
        </div>
        <div class="message">
            Your login code:
        </div>
        <div class="code">
            ${activeCode}
        </div>
        <div class="expiry">
            This code can only be used once. It expires in 15 minutes.
        </div>
        <div class="footer">
            © a.to.zaccessories<br>
            123 Business Street, City, Country<br>
            Reference: 000000123
        </div>
    </div>
</body>
</html>`;
