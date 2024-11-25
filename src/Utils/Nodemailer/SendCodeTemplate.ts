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
