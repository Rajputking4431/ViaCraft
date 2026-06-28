import { getServerConfig } from "@/config/config.server";

/**
 * Direct REST API request to Resend API using node-fetch or native fetch.
 * Senders must be onboarding@resend.dev during testing/development.
 */
export async function sendEmailDirectly(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const config = getServerConfig();
  const apiKey = config.resendApiKey;

  if (!apiKey) {
    console.log("================================================================================");
    console.log(`[MOCK EMAIL TRIGGERED] (No RESEND_API_KEY in environment)`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("--------------------------------------------------------------------------------");
    console.log(html);
    console.log("================================================================================");
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ViaCraft <onboarding@resend.dev>",
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Resend Error] Status: ${response.status}. Details: ${errText}`);
      return false;
    }

    const result = await response.json();
    console.log(`[Resend Success] Email sent successfully! ID: ${result.id}`);
    return true;
  } catch (error) {
    console.error("[Resend Exception] Failed to send email via API:", error);
    return false;
  }
}

/**
 * Premium layout shell using Wood, Gold, and Resin Verse aesthetic.
 */
function buildHtmlShell(title: string, bodyContent: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #0f172a;
      color: #cbd5e1;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0f172a;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1e293b;
      border: 1px solid #334155;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
    }
    .header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      padding: 30px 40px;
      text-align: center;
      border-bottom: 2px solid #d97706;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.05em;
      color: #ffffff;
    }
    .header h1 span {
      color: #d97706;
    }
    .content {
      padding: 40px;
      line-height: 1.6;
      font-size: 16px;
    }
    .content h2 {
      color: #ffffff;
      font-size: 22px;
      margin-top: 0;
      margin-bottom: 20px;
      border-bottom: 1px solid #334155;
      padding-bottom: 10px;
    }
    .btn {
      display: inline-block;
      background: linear-gradient(to right, #d97706, #b45309);
      color: #000000 !important;
      font-weight: 700;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 9999px;
      margin: 25px 0;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      text-align: center;
      box-shadow: 0 4px 6px -1px rgba(217, 119, 6, 0.2);
    }
    .btn:hover {
      background: linear-gradient(to right, #f59e0b, #d97706);
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      text-align: left;
    }
    .item-table th {
      border-bottom: 2px solid #334155;
      padding: 12px 8px;
      color: #94a3b8;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .item-table td {
      border-bottom: 1px solid #334155;
      padding: 12px 8px;
      color: #e2e8f0;
      font-size: 14px;
    }
    .footer {
      background-color: #0f172a;
      padding: 20px 40px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #334155;
    }
    .footer a {
      color: #d97706;
      text-decoration: none;
    }
    .highlight-box {
      background-color: #1e293b;
      border: 1px solid #d97706;
      border-left: 4px solid #d97706;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
      color: #f8fafc;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>Via<span>Craft</span></h1>
      </div>
      <div class="content">
        ${bodyContent}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ViaCraft. All rights reserved.</p>
        <p>You are receiving this because you registered or placed an order on ViaCraft.</p>
        <p><a href="#">Visit Store</a> | <a href="#">Support Center</a></p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// 1. Welcome Email
export function buildWelcomeEmail(fullName: string): string {
  const content = `
    <h2>Welcome to ViaCraft!</h2>
    <p>Hi ${fullName},</p>
    <p>We are thrilled to welcome you to <strong>ViaCraft</strong>, the ultimate curated marketplace for premium optical-grade resin art, custom preservation keepsakes, and independent artisan crafts.</p>
    <p>Here is what you can do on ViaCraft right now:</p>
    <ul>
      <li><strong>Explore Collections:</strong> Browse thousands of unique handmade geodes, trays, pyramid sculptures, and jewelry.</li>
      <li><strong>Custom Preservation:</strong> Turn your precious memories (wedding bouquets, memorial flowers) into permanent, stunning heirlooms.</li>
      <li><strong>Connect with Artisans:</strong> Chat directly with creators, submit reference images, and track your custom orders live.</li>
    </ul>
    <p>To celebrate your arrival, we hope you find something beautiful that speaks to you!</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/shop" class="btn">Start Exploring</a>
    </div>
    <p>If you have any questions, our support team is always here to assist you.</p>
    <p>Warmly,<br>The ViaCraft Team</p>
  `;
  return buildHtmlShell("Welcome to ViaCraft", content);
}

// 2. Vendor Application Submitted
export function buildVendorAppliedEmail(storeName: string): string {
  const content = `
    <h2>Application Received!</h2>
    <p>Hello Artisan,</p>
    <p>Thank you for submitting your vendor application to open <strong>${storeName}</strong> on ViaCraft!</p>
    <p>Our curation team is dedicated to highlighting premium, authentic craftsmanship. We are currently reviewing your store details, tagline, and portfolio details to ensure alignment with our quality standards.</p>
    <div class="highlight-box">
      <strong>Review Timeline:</strong> We review all applications within <strong>48 hours</strong>. You will receive another notification as soon as your status is updated.
    </div>
    <p>In the meantime, feel free to log in to your vendor panel to preview your shop setup and explore how listings work.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/vendor/dashboard" class="btn">Vendor Dashboard</a>
    </div>
    <p>Best regards,<br>The ViaCraft Curation Board</p>
  `;
  return buildHtmlShell("Vendor Application Received", content);
}

// 3. Vendor Approved
export function buildVendorApprovedEmail(storeName: string): string {
  const content = `
    <h2>Congratulations! Your Shop is Approved 🎉</h2>
    <p>Hello Artisan,</p>
    <p>We are absolutely delighted to inform you that your application for <strong>${storeName}</strong> has been **approved**! Welcome to the ViaCraft artisan community!</p>
    <p>Your shop is now active, and you can start listing your exquisite products, customize your shop banner, and receive custom preservation inquiries directly from customers.</p>
    <p>Here are your next steps to succeed:</p>
    <ol>
      <li><strong>Set Up Your Profile:</strong> Upload a high-resolution logo and shop banner.</li>
      <li><strong>Post Your Listings:</strong> Add rich descriptions, categories, and high-quality product images.</li>
      <li><strong>Link Payout Details:</strong> Ensure your payment information is complete so you can receive payouts smoothly.</li>
    </ol>
    <div style="text-align: center;">
      <a href="https://viacraft.com/vendor/dashboard" class="btn">Add Your First Product</a>
    </div>
    <p>We are excited to showcase your craft to our global community of collectors.</p>
    <p>Warmest regards,<br>The ViaCraft Team</p>
  `;
  return buildHtmlShell("Your Store is Approved!", content);
}

// 4. Vendor Rejected
export function buildVendorRejectedEmail(storeName: string): string {
  const content = `
    <h2>Update on Your Vendor Status</h2>
    <p>Hello Artisan,</p>
    <p>Thank you for your interest in joining the ViaCraft marketplace and sharing your store application for <strong>${storeName}</strong>.</p>
    <p>After careful evaluation of your store details, our team has decided to decline or suspend your seller account at this time. We maintain highly specific criteria regarding catalog distinctiveness, preservation certifications, and setup completeness to serve our collectors.</p>
    <p>If you believe this was in error, or if you have added substantial new details to your craft portfolio, you are welcome to contact our seller appeals desk for a secondary evaluation.</p>
    <div style="text-align: center;">
      <a href="mailto:support@viacraft.com" class="btn">Contact Curation Support</a>
    </div>
    <p>Thank you for your time and understanding.</p>
    <p>Best regards,<br>The ViaCraft Curation Team</p>
  `;
  return buildHtmlShell("Vendor Status Update", content);
}

// 5. Order Confirmation
export interface OrderConfirmItem {
  title: string;
  quantity: number;
  priceCents: number;
}

export function buildOrderConfirmationEmail(
  orderNumber: string,
  items: OrderConfirmItem[],
  totalCents: number,
  shippingAddress: any,
): string {
  const addressHtml = shippingAddress
    ? `
      <p>
        <strong>${shippingAddress.name || "Customer"}</strong><br>
        ${shippingAddress.street || ""}<br>
        ${shippingAddress.city || ""}, ${shippingAddress.state || ""} ${shippingAddress.zip || shippingAddress.postal_code || ""}<br>
        Phone: ${shippingAddress.phone || ""}
      </p>
    `
    : "<p>Standard Shipping Address</p>";

  let itemsHtml = "";
  let subtotal = 0;
  items.forEach((item) => {
    const itemTotal = (item.priceCents * item.quantity) / 100;
    subtotal += itemTotal;
    itemsHtml += `
      <tr>
        <td>${item.title}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">₹${(item.priceCents / 100).toFixed(2)}</td>
        <td style="text-align: right;">₹${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  });

  const content = `
    <h2>Order Confirmed!</h2>
    <p>Thank you for your purchase! Your order <strong>#${orderNumber}</strong> has been successfully placed and is now being processed.</p>
    
    <h3>Order Summary</h3>
    <table class="item-table">
      <thead>
        <tr>
          <th>Item Title</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr>
          <td colspan="3" style="text-align: right; font-weight: bold; border-top: 2px solid #334155; padding-top: 15px;">Subtotal:</td>
          <td style="text-align: right; font-weight: bold; border-top: 2px solid #334155; padding-top: 15px;">₹${subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align: right; font-weight: bold;">Est. Taxes & Shipping:</td>
          <td style="text-align: right; font-weight: bold;">₹${(totalCents / 100 - subtotal).toFixed(2)}</td>
        </tr>
        <tr style="color: #d97706; font-size: 16px;">
          <td colspan="3" style="text-align: right; font-weight: bold; border-top: 1px solid #334155;">Grand Total:</td>
          <td style="text-align: right; font-weight: bold; border-top: 1px solid #334155;">₹${(totalCents / 100).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="highlight-box">
      <h3>Shipping Destination</h3>
      ${addressHtml}
    </div>

    <p>You can track the fulfillment status of your purchase at any time in your collector dashboard.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/dashboard" class="btn">View Order History</a>
    </div>
    <p>Thank you for supporting independent resin artists!</p>
  `;
  return buildHtmlShell(`Order Confirmation #${orderNumber}`, content);
}

// 6 & 7. Order Shipped & Delivered
export function buildOrderStatusEmail(orderNumber: string, status: string): string {
  const isShipped = status.toLowerCase() === "shipped";
  const title = isShipped ? "Your Order is En Route! 🚚" : "Your Package Has Arrived! 🎁";

  const content = `
    <h2>${title}</h2>
    <p>Hello Customer,</p>
    <p>We are writing to update you on the progress of your order <strong>#${orderNumber}</strong>.</p>
    
    <div class="highlight-box" style="text-align: center; border-color: ${isShipped ? "#d97706" : "#10b981"}; border-left-color: ${isShipped ? "#d97706" : "#10b981"};">
      <p style="font-size: 18px; margin: 0; font-weight: bold; text-transform: uppercase; color: ${isShipped ? "#f59e0b" : "#34d399"};">
        Status: ${status}
      </p>
    </div>

    ${
      isShipped
        ? `<p>Your package has been handed over to our premium shipping partner. It is being transported in secure, temperature-controlled packaging to protect the resin integrity.</p>`
        : `<p>According to our logs, your delivery agent has completed the delivery. Please open and inspect the resin item. Remember to keep resin items away from direct, high-temperature sun exposure to prevent yellowing!</p>`
    }

    <p>To view full tracking logs, please log in to your account.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/dashboard" class="btn">Track Order Details</a>
    </div>
    <p>If you have any questions or need courier assistance, feel free to contact us.</p>
  `;
  return buildHtmlShell(`Order #${orderNumber} Status: ${status}`, content);
}

// 8. Password Reset
export function buildPasswordResetEmail(recoveryLink: string): string {
  const content = `
    <h2>Reset Your Password</h2>
    <p>Hello,</p>
    <p>We received a request to reset the password for your ViaCraft account. Click the button below to choose a new, secure password.</p>
    <div style="text-align: center;">
      <a href="${recoveryLink}" class="btn">Choose New Password</a>
    </div>
    <p>If you did not make this request, you can safely ignore this email. Your password will remain unchanged.</p>
    <p>Note: This secure link is temporary and will expire in 2 hours for security reasons.</p>
    <p>For your security, never forward this email to anyone.</p>
  `;
  return buildHtmlShell("Reset Your ViaCraft Password", content);
}

// 9. Quote Received
export function buildQuoteReceivedEmail(
  requestNumber: string,
  itemName: string,
  quoteAmount: number,
  vendorName: string,
): string {
  const content = `
    <h2>New Proposal Received!</h2>
    <p>Hello Customer,</p>
    <p>An artisan has submitted a pricing quotation for your custom request <strong>${requestNumber}</strong> (<em>${itemName}</em>).</p>
    
    <div class="highlight-box">
      <p><strong>Artisan:</strong> ${vendorName}</p>
      <p><strong>Quoted Price:</strong> ₹${(quoteAmount / 100).toFixed(2)}</p>
      <p><strong>Status:</strong> Ready for your review</p>
    </div>

    <p>You can check the proposal details, message terms, and portfolio samples, or chat with the artisan directly to adjust specifications before accepting the quote.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/preservation/${requestNumber}" class="btn">Review Proposal Details</a>
    </div>
    <p>Once you accept the quote, you can start the project by paying a 50% advance.</p>
  `;
  return buildHtmlShell(`New Quote for Request ${requestNumber}`, content);
}

// 10. Preservation Status Updates
export function buildPreservationStageUpdateEmail(
  requestNumber: string,
  itemName: string,
  stage: string,
  note: string,
): string {
  const content = `
    <h2>Tracking Update: Custom Keepsake Pipeline</h2>
    <p>Hello Customer,</p>
    <p>We have a progress update regarding your memory preservation request <strong>${requestNumber}</strong> (<em>${itemName}</em>).</p>
    
    <div class="highlight-box" style="border-left-color: #b45309; border-color: #b45309;">
      <p><strong>Current Process Stage:</strong> <span style="text-transform: capitalize; color: #f59e0b; font-weight: bold;">${stage.replace(/_/g, " ")}</span></p>
      <p><strong>Artisan Note:</strong> "${note || "Artisan is actively working on this phase."}"</p>
    </div>

    <p>Your bouquet, flowers, or keepsake items are handled with extreme attention to detail at every step of our professional casting pipeline (drying, layer casting, UV audit, curing, and polishing).</p>
    <p>Check the live interactive timeline to view photographs of the work-in-progress cast!</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/dashboard" class="btn">View Live Pipeline</a>
    </div>
    <p>Thank you for trusting us with your beautiful memories.</p>
  `;
  return buildHtmlShell(`Preservation Progress: ${requestNumber}`, content);
}

// 11. Vendor: New Order Alert
export function buildVendorNewOrderEmail(
  orderNumber: string,
  storeName: string,
  items: Array<{ title: string; quantity: number; priceCents: number }>,
  totalCents: number,
  shippingAddress: any
): string {
  let itemsHtml = "";
  items.forEach((item) => {
    itemsHtml += `
      <tr>
        <td>${item.title}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">₹${(item.priceCents / 100).toFixed(2)}</td>
        <td style="text-align: right;">₹${((item.priceCents * item.quantity) / 100).toFixed(2)}</td>
      </tr>
    `;
  });

  const content = `
    <h2>New Order Received! 💰</h2>
    <p>Hello from ViaCraft, <strong>${storeName}</strong>,</p>
    <p>Good news! A customer has placed a new order containing items from your store. Here are the details:</p>
    
    <h3>Order Summary (Order #${orderNumber})</h3>
    <table class="item-table">
      <thead>
        <tr>
          <th>Item Title</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr style="color: #d97706; font-size: 16px;">
          <td colspan="3" style="text-align: right; font-weight: bold; border-top: 1px solid #334155;">Store Payout Subtotal:</td>
          <td style="text-align: right; font-weight: bold; border-top: 1px solid #334155;">₹${(totalCents / 100).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="highlight-box">
      <h3>Deliver To</h3>
      <p>
        <strong>${shippingAddress?.name || "Customer"}</strong><br>
        ${shippingAddress?.street || ""}<br>
        ${shippingAddress?.city || ""}, ${shippingAddress?.state || ""} ${shippingAddress?.zip || shippingAddress?.postal_code || ""}<br>
      </p>
    </div>

    <p>Please log in to your vendor dashboard to review the order, accept it, and update fulfillment tracking once shipped.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/vendor/dashboard" class="btn">Process Order Now</a>
    </div>
    <p>Keep up the great work!</p>
  `;
  return buildHtmlShell(`New Order #${orderNumber} Received - ${storeName}`, content);
}

// 12. Vendor: Order Cancelled by Customer
export function buildVendorOrderCancelledEmail(
  orderNumber: string,
  storeName: string,
  reason?: string
): string {
  const content = `
    <h2>Order Cancelled by Customer ❌</h2>
    <p>Hello <strong>${storeName}</strong>,</p>
    <p>We are writing to inform you that the customer has cancelled order <strong>#${orderNumber}</strong>.</p>
    
    <div class="highlight-box" style="border-left-color: #ef4444; border-color: #ef4444;">
      <p><strong>Cancellation details:</strong></p>
      <p>Any items in this order associated with your store have been returned to inventory and you do not need to fulfill them.</p>
      ${reason ? `<p><strong>Reason provided:</strong> "${reason}"</p>` : ""}
    </div>

    <p>If you have any questions, please contact our support team.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/vendor/dashboard" class="btn">View Store Dashboard</a>
    </div>
  `;
  return buildHtmlShell(`Order #${orderNumber} Cancelled`, content);
}

// 13. Vendor: Payment Received
export function buildVendorPaymentReceivedEmail(
  orderNumber: string,
  storeName: string,
  amountCents: number
): string {
  const content = `
    <h2>Payment Completed 💰</h2>
    <p>Hello <strong>${storeName}</strong>,</p>
    <p>A customer has successfully completed payment for order <strong>#${orderNumber}</strong>.</p>
    
    <div class="highlight-box" style="border-left-color: #10b981; border-color: #10b981;">
      <p><strong>Payment Details:</strong></p>
      <p>Amount credited to pending balance: <strong>₹${(amountCents / 100).toFixed(2)}</strong></p>
    </div>

    <p>Once you ship and deliver the products, this balance will be moved to your available balance for withdrawal.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/vendor/dashboard" class="btn">Fulfill Order</a>
    </div>
  `;
  return buildHtmlShell(`Payment Received for Order #${orderNumber}`, content);
}

// 14. Customer: Payment Failed
export function buildCustomerPaymentFailedEmail(
  orderNumber: string,
  reason?: string
): string {
  const content = `
    <h2>Payment Transaction Failed ⚠️</h2>
    <p>Hello Customer,</p>
    <p>Your payment attempt for order <strong>#${orderNumber}</strong> could not be completed successfully.</p>
    
    <div class="highlight-box" style="border-left-color: #ef4444; border-color: #ef4444;">
      <p><strong>Transaction Status:</strong> Declined / Failed</p>
      ${reason ? `<p><strong>Failure Reason:</strong> ${reason}</p>` : "<p>Reason: Card declined or network timeout.</p>"}
    </div>

    <p>Don't worry, your cart items are still saved. You can log in and re-attempt checkout at any time.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/cart" class="btn">Retry Checkout</a>
    </div>
    <p>If you noticed funds were debited, they will be automatically refunded by your banking partner within 3-5 business days.</p>
  `;
  return buildHtmlShell(`Action Required: Payment Failed for #${orderNumber}`, content);
}

// 15. Customer: Refund Processed
export function buildCustomerRefundEmail(
  orderNumber: string,
  amountCents: number
): string {
  const content = `
    <h2>Refund Processed Successfully 💰</h2>
    <p>Hello Customer,</p>
    <p>We have successfully processed a refund for your order <strong>#${orderNumber}</strong>.</p>
    
    <div class="highlight-box" style="border-left-color: #10b981; border-color: #10b981;">
      <p><strong>Refund Details:</strong></p>
      <p>Amount Refunded: <strong>₹${(amountCents / 100).toFixed(2)}</strong></p>
      <p>Status: Transferred to original payment source</p>
    </div>

    <p>Depending on your financial institution, it may take 5 to 7 business days for the funds to reflect in your account.</p>
    <p>Thank you for choosing ViaCraft!</p>
  `;
  return buildHtmlShell(`Refund Processed for #${orderNumber}`, content);
}

// 16. Admin: New Vendor Application
export function buildAdminNewVendorEmail(
  storeName: string,
  email: string,
  ownerName: string
): string {
  const content = `
    <h2>New Vendor Registered 👤</h2>
    <p>Hello Administrator,</p>
    <p>A new artisan has submitted their vendor application to sell on ViaCraft.</p>
    
    <div class="highlight-box">
      <p><strong>Store Name:</strong> ${storeName}</p>
      <p><strong>Owner Name:</strong> ${ownerName}</p>
      <p><strong>Email Address:</strong> ${email}</p>
    </div>

    <p>Please log in to the administrative control panel to review their application, tagline, and portfolio items to determine store approval status.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/admin/vendors" class="btn">Review Application</a>
    </div>
  `;
  return buildHtmlShell(`Action Required: New Vendor "${storeName}" Registered`, content);
}

// 17. Admin: High-Value Order Alert
export function buildAdminHighValueOrderEmail(
  orderNumber: string,
  totalCents: number
): string {
  const content = `
    <h2>⚠️ High-Value Order Received</h2>
    <p>Hello Administrator,</p>
    <p>A transaction of significant value has been recorded on the marketplace. Please monitor details for security compliance:</p>
    
    <div class="highlight-box" style="border-left-color: #f59e0b; border-color: #f59e0b;">
      <p><strong>Order Number:</strong> #${orderNumber}</p>
      <p><strong>Total Value:</strong> ₹${(totalCents / 100).toFixed(2)}</p>
    </div>

    <p>Please review order details and ensure RLS / payment validation parameters are secure.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/admin/orders" class="btn">Manage Orders</a>
    </div>
  `;
  return buildHtmlShell(`[High-Value Alert] Order #${orderNumber} Received`, content);
}

// 18. Admin: New Complaint Raised
export function buildAdminComplaintEmail(
  complaintId: string,
  email: string,
  subject: string,
  message: string
): string {
  const content = `
    <h2>🚨 New Complaint Raised</h2>
    <p>Hello Administrator,</p>
    <p>A user has raised a customer complaint/ticket. Here are the details:</p>
    
    <div class="highlight-box" style="border-left-color: #ef4444; border-color: #ef4444;">
      <p><strong>Ticket ID:</strong> #${complaintId}</p>
      <p><strong>User Email:</strong> ${email}</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>Message:</strong></p>
      <p style="font-style: italic;">"${message}"</p>
    </div>


    <p>Please investigate and respond directly or assign a support representative to resolve this ticket.</p>
  `;
  return buildHtmlShell(`[Support Ticket #${complaintId}] ${subject}`, content);
}

// 19. Customer: Shipment Dispatched
export function buildShipmentDispatchedEmail(
  orderNumber: string,
  trackingNumber: string,
  courier: string,
  trackingUrl: string
): string {
  const content = `
    <h2>Your Order has been Dispatched! 🚚</h2>
    <p>Hello Customer,</p>
    <p>Great news! Your package for order <strong>#${orderNumber}</strong> has been handed over to the courier and is on its way to you.</p>
    
    <div class="highlight-box" style="border-left-color: #d97706; border-color: #d97706;">
      <p><strong>Courier:</strong> ${courier}</p>
      <p><strong>Tracking Number:</strong> ${trackingNumber}</p>
    </div>

    <p>You can track the progress of your shipment using the button below:</p>
    <div style="text-align: center;">
      <a href="${trackingUrl || '#'}" class="btn">Track Package</a>
    </div>

    <p>Thank you for choosing ViaCraft!</p>
  `;
  return buildHtmlShell(`Order #${orderNumber} Dispatched`, content);
}

// 20. Customer: Shipment Out For Delivery
export function buildShipmentOutForDeliveryEmail(
  orderNumber: string,
  courier: string
): string {
  const content = `
    <h2>Package Out for Delivery! 📦</h2>
    <p>Hello Customer,</p>
    <p>Your package for order <strong>#${orderNumber}</strong> is out for delivery today with <strong>${courier}</strong>.</p>
    
    <div class="highlight-box" style="border-left-color: #d97706; border-color: #d97706;">
      <p>Please ensure someone is available at the shipping address to receive the delivery.</p>
    </div>

    <p>Thank you for choosing ViaCraft!</p>
  `;
  return buildHtmlShell(`Out for Delivery: Order #${orderNumber}`, content);
}

// 21. Customer: Shipment Delivered
export function buildShipmentDeliveredEmail(
  orderNumber: string
): string {
  const content = `
    <h2>Package Delivered successfully! 🎉</h2>
    <p>Hello Customer,</p>
    <p>Your package for order <strong>#${orderNumber}</strong> has been successfully delivered.</p>
    
    <div class="highlight-box" style="border-left-color: #10b981; border-color: #10b981;">
      <p>If you have not received this package, please contact our support desk immediately.</p>
    </div>

    <p>We hope you love your custom keepsake! Please take a moment to leave a review for the artisan on your dashboard.</p>
    <div style="text-align: center;">
      <a href="https://viacraft.com/dashboard" class="btn">Write a Review</a>
    </div>
  `;
  return buildHtmlShell(`Delivered: Order #${orderNumber}`, content);
}

// 22. Customer: Shipment Delay
export function buildShipmentDelayEmail(
  orderNumber: string,
  reason: string
): string {
  const content = `
    <h2>Logistics Delay Notice ⚠️</h2>
    <p>Hello Customer,</p>
    <p>We wanted to inform you that your shipment for order <strong>#${orderNumber}</strong> has encountered a temporary logistics delay.</p>
    
    <div class="highlight-box" style="border-left-color: #f59e0b; border-color: #f59e0b;">
      <p><strong>Delay Update:</strong> ${reason}</p>
    </div>

    <p>Our team is working with the courier to resolve the issue as quickly as possible. We will update you with new details shortly.</p>
    <p>We appreciate your patience and apologize for any inconvenience caused.</p>
  `;
  return buildHtmlShell(`Shipping Delay: Order #${orderNumber}`, content);
}


