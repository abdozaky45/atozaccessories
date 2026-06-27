export const generateInvoice = ({
  customerName,
  brandName,
  items,
  subTotal,
  discount,
  shippingCost,
  freeShipping,
  total,
  orderNumber,
  orderDate,
  paymentMethod,
}: {
  customerName: string;
  brandName: string;
  items: {
    productName: string;
    quantity: number;
    itemPrice: number;
    totalPrice?: number;
    size?: string;
    color?: string;
  }[];
  subTotal: number;
  discount: number;
  shippingCost: number;
  freeShipping: boolean;
  total: number;
  orderNumber: string;
  orderDate: string;
  paymentMethod: string;
}) => {
  const money = (n: number) => `EGP ${Number(n ?? 0).toFixed(2)}`;

  const itemRows = items
    .map((item) => {
      const lineTotal = item.totalPrice ?? item.itemPrice * item.quantity;
      const meta = [item.color, item.size].filter(Boolean).join(" &bull; ");
      return `
        <tr>
          <td style="padding:14px 0;border-bottom:1px solid #EFE6DC;">
            <span style="display:block;font-size:14px;font-weight:700;color:#51311B;">${item.productName}</span>
            ${meta ? `<span style="display:block;font-size:12px;color:#9A8B7C;margin-top:3px;">${meta}</span>` : ""}
          </td>
          <td align="center" style="padding:14px 0;border-bottom:1px solid #EFE6DC;font-size:13px;color:#706257;white-space:nowrap;">
            &times;${item.quantity}
          </td>
          <td align="right" style="padding:14px 0;border-bottom:1px solid #EFE6DC;font-size:13px;color:#706257;white-space:nowrap;">
            ${money(item.itemPrice)}
          </td>
          <td align="right" style="padding:14px 0 14px 12px;border-bottom:1px solid #EFE6DC;font-size:14px;font-weight:700;color:#51311B;white-space:nowrap;">
            ${money(lineTotal)}
          </td>
        </tr>`;
    })
    .join("");

  const summaryRow = (label: string, value: string, opts: { strong?: boolean; accent?: boolean } = {}) => `
    <tr>
      <td style="padding:7px 0;font-size:${opts.strong ? "14px" : "13px"};color:${opts.strong ? "#51311B" : "#706257"};font-weight:${opts.strong ? "700" : "400"};">${label}</td>
      <td align="right" style="padding:7px 0;font-size:${opts.strong ? "14px" : "13px"};font-weight:${opts.strong ? "700" : "400"};color:${opts.accent ? "#1E7F4F" : opts.strong ? "#51311B" : "#706257"};white-space:nowrap;">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Order Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#F5EEE8;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F5EEE8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">

          <!-- HEADER -->
          <tr>
            <td style="background-color:#51311B;border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
              <h1 style="margin:0 0 6px;font-size:26px;font-weight:800;letter-spacing:2px;color:#DECBBA;font-family:Georgia,serif;">
                ${brandName}
              </h1>
              <p style="margin:0;font-size:13px;color:#BD8958;letter-spacing:2px;text-transform:uppercase;">
                Order Confirmation
              </p>
            </td>
          </tr>

          <!-- GREETING -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 40px 8px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#51311B;font-family:Georgia,serif;">
                Thank you, ${customerName}!
              </h2>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#706257;">
                We have received your order and it is being prepared. Here is a summary of your purchase.
              </p>
            </td>
          </tr>

          <!-- ORDER META -->
          <tr>
            <td style="background-color:#ffffff;padding:20px 40px 4px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#FAF6F1;border:1px solid #EFE6DC;border-radius:10px;">
                <tr>
                  <td style="padding:14px 18px;font-size:12px;color:#9A8B7C;">Order ID</td>
                  <td align="right" style="padding:14px 18px;font-size:13px;font-weight:700;color:#51311B;">#${orderNumber}</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 14px;font-size:12px;color:#9A8B7C;">Date</td>
                  <td align="right" style="padding:0 18px 14px;font-size:13px;color:#51311B;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 14px;font-size:12px;color:#9A8B7C;">Payment</td>
                  <td align="right" style="padding:0 18px 14px;font-size:13px;color:#51311B;">${paymentMethod}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ITEMS -->
          <tr>
            <td style="background-color:#ffffff;padding:24px 40px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:0 0 8px;font-size:11px;font-weight:700;color:#BD8958;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #DECBBA;">Item</td>
                  <td align="center" style="padding:0 0 8px;font-size:11px;font-weight:700;color:#BD8958;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #DECBBA;">Qty</td>
                  <td align="right" style="padding:0 0 8px;font-size:11px;font-weight:700;color:#BD8958;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #DECBBA;">Price</td>
                  <td align="right" style="padding:0 0 8px 12px;font-size:11px;font-weight:700;color:#BD8958;letter-spacing:1px;text-transform:uppercase;border-bottom:2px solid #DECBBA;">Total</td>
                </tr>
                ${itemRows}
              </table>
            </td>
          </tr>

          <!-- SUMMARY -->
          <tr>
            <td style="background-color:#ffffff;padding:16px 40px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${summaryRow("Subtotal", money(subTotal))}
                ${discount > 0 ? summaryRow("Discount", `- ${money(discount)}`, { accent: true }) : ""}
                ${summaryRow("Shipping", freeShipping ? "FREE" : money(shippingCost), { accent: freeShipping })}
              </table>
            </td>
          </tr>

          <!-- TOTAL -->
          <tr>
            <td style="background-color:#ffffff;padding:12px 40px 36px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#51311B;border-radius:10px;">
                <tr>
                  <td style="padding:18px 22px;font-size:15px;font-weight:700;color:#DECBBA;letter-spacing:1px;">TOTAL</td>
                  <td align="right" style="padding:18px 22px;font-size:18px;font-weight:800;color:#ffffff;">${money(total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color:#DECBBA;border-radius:0 0 12px 12px;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#51311B;">${brandName}</p>
              <p style="margin:0;font-size:11px;line-height:1.6;color:#706257;">
                This is an order confirmation, not a tax invoice.<br>
                &copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};
