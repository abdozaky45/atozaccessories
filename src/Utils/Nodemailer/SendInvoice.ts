export const orderInvoiceTemplate = ( customerName: string,
    restaurantName: string,
    items: { name: string; quantity: number; price: number }[],
    deliveryFee: number,
    serviceFee: number,
    total: number,
    orderNumber: string,
    orderDate: string,
    paymentMethod: string)=> `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #F5F5F5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
          <!-- Header -->
          <tr>
            <td style="background-color: #8B4513; padding: 30px; border-radius: 8px 8px 0 0;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <h1 style="color: #FFFFFF; font-size: 24px; font-weight: 300; margin: 0 0 8px 0;">
                      ${customerName},
                    </h1>
                    <p style="color: #FFFFFF; font-size: 14px; margin: 0;">
                      thanks for your order!
                    </p>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <div style="background-color: rgba(255,255,255,0.1); width: 64px; height: 64px; border-radius: 8px; text-align: center; line-height: 64px;">
                      💎
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Order Details -->
          <tr>
            <td style="padding: 30px; border: 1px solid #E5E5E5; border-top: none; border-radius: 0 0 8px 8px;">
              <!-- Restaurant Name -->
              <h2 style="color: #1A1A1A; font-size: 18px; font-weight: 300; margin: 0 0 24px 0;">
                Your order from ${restaurantName}
              </h2>

              <!-- Items -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                ${items
                  .map(
                    (item) => `
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #666666; font-size: 14px; margin-right: 8px;">(${
                        item.quantity
                      })</span>
                      <span style="color: #1A1A1A; font-size: 14px;">${
                        item.name
                      }</span>
                    </td>
                    <td align="right" style="color: #1A1A1A; font-size: 14px; padding: 8px 0;">
                      ${item.price.toFixed(2)}
                    </td>
                  </tr>
                `
                  )
                  .join("")}
              </table>

              <!-- Fees -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #E5E5E5; padding: 16px 0;">
                <tr>
                  <td style="color: #666666; font-size: 14px; padding: 4px 0;">Shipping</td>
                  <td align="right" style="color: #1A1A1A; font-size: 14px;">${deliveryFee.toFixed(
                    2
                  )}</td>
                </tr>
              </table>

              <!-- Total -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #E5E5E5; padding: 16px 0; margin: 16px 0;">
                <tr>
                  <td style="color: #1A1A1A; font-weight: 500;">Sub Total</td>
                  <td align="right" style="color: #1A1A1A; font-weight: 500;">
                    EGP ${total.toFixed(2)}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #E5E5E5; padding: 16px 0; margin: 16px 0;">
                <tr>
                  <td style="color: #1A1A1A; font-weight: 500;">Discount</td>
                  <td align="right" style="color: #1A1A1A; font-weight: 500;">
                    EGP ${total.toFixed(2)}
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #E5E5E5; padding: 16px 0; margin: 16px 0;">
                <tr>
                  <td style="color: #1A1A1A; font-weight: 500;">Total</td>
                  <td align="right" style="color: #1A1A1A; font-weight: 500;">
                    EGP ${total.toFixed(2)}
                  </td>
                </tr>
              </table>

              <!-- Order Info -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="color: #666666; font-size: 14px; padding: 4px 0;">
                    Your order ID: ${orderNumber}
                  </td>
                </tr>
                <tr>
                  <td style="color: #666666; font-size: 14px; padding: 4px 0;">
                    Time of order: ${orderDate}
                  </td>
                </tr>
                <tr>
                  <td style="color: #666666; font-size: 14px; padding: 4px 0;">
                    Paid by: ${paymentMethod}
                  </td>
                </tr>
              </table>

              <!-- Disclaimer -->
              <p style="color: #666666; font-size: 12px; margin: 24px 0 0 0;">
                This is not an invoice. The vendor, being the merchant shall share their official invoice with the customer instead.
              </p>
            </td>
          </tr>
        </table>
      </body>
    </html>`;