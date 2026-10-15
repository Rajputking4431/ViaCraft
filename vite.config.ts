import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import crypto from "node:crypto";
import fs from "node:fs";

// CCAvenue local development handler plugin
function ccavenueDevPlugin() {
  const CCAVENUE_MERCHANT_ID = process.env.CCAVENUE_MERCHANT_ID || "4473425";
  const CCAVENUE_ACCESS_CODE = process.env.CCAVENUE_ACCESS_CODE || "AVBT96NI70AW39TBWA";
  const CCAVENUE_WORKING_KEY = process.env.CCAVENUE_WORKING_KEY || "20E65B6263E5925C07BAC6EBD3FA293D";
  const CCAVENUE_ENV = process.env.CCAVENUE_ENV || "test";

  const GATEWAY_URL =
    CCAVENUE_ENV === "production"
      ? "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction"
      : "https://test.ccavenue.com/transaction/transaction.do?command=initiateTransaction";

  const CCAVENUE_IV = Buffer.from([
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
    0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f,
  ]);

  function encrypt(plainText: string, workingKey: string) {
    const m = crypto.createHash("md5").update(workingKey).digest();
    const cipher = crypto.createCipheriv("aes-128-cbc", m, CCAVENUE_IV);
    let encoded = cipher.update(plainText, "utf8", "hex");
    encoded += cipher.final("hex");
    return encoded;
  }

  function decrypt(encText: string, workingKey: string) {
    const m = crypto.createHash("md5").update(workingKey).digest();
    const decipher = crypto.createDecipheriv("aes-128-cbc", m, CCAVENUE_IV);
    let decoded = decipher.update(encText, "hex", "utf8");
    decoded += decipher.final("utf8");
    return decoded;
  }

  return {
    name: "ccavenue-dev-plugin",
    configureServer(server: any) {
      // 1. Initiate Payment: Encrypt order details
      server.middlewares.use("/api/ccavenue/initiate", (req: any, res: any) => {
        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const data = JSON.parse(body || "{}");
              const host = req.headers.host || "localhost:5173";
              const protocol = req.headers["x-forwarded-proto"] || "http";

              const orderParams = new URLSearchParams({
                merchant_id: CCAVENUE_MERCHANT_ID,
                order_id: String(data.order_id || `ord_${Date.now()}`),
                currency: "INR",
                amount: Number(data.amount || 0).toFixed(2),
                redirect_url: `${protocol}://${host}/api/ccavenue/response`,
                cancel_url: `${protocol}://${host}/api/ccavenue/response`,
                language: "EN",
                billing_name: data.customer_name || "Customer",
                billing_address: data.billing_address || "Address",
                billing_city: data.billing_city || "City",
                billing_state: data.billing_state || "State",
                billing_zip: data.billing_zip || "000000",
                billing_country: data.billing_country || "India",
                billing_tel: data.customer_phone || "",
                billing_email: data.customer_email || "",
                merchant_param1: data.customer_id || "",
                merchant_param2: data.payment_type || "full",
                merchant_param3: data.preservation_request_id || "",
                merchant_param4: data.vendor_id || "",
                merchant_param5: String(data.order_id || ""),
              }).toString();

              const encRequest = encrypt(orderParams, CCAVENUE_WORKING_KEY);
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  encRequest,
                  accessCode: CCAVENUE_ACCESS_CODE,
                  actionUrl: GATEWAY_URL,
                }),
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end("Method Not Allowed");
        }
      });

      // 2. Response Callback: Decrypt CCAvenue encResp and redirect to success/failure page
      server.middlewares.use("/api/ccavenue/response", (req: any, res: any) => {
        let body = "";
        req.on("data", (chunk: any) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const parsed = new URLSearchParams(body);
            const encResp = parsed.get("encResp") || "";
            if (!encResp) {
              res.writeHead(302, { Location: "/payment/failure?error=Missing+response" });
              return res.end();
            }

            const decrypted = decrypt(encResp, CCAVENUE_WORKING_KEY);
            const respParams = Object.fromEntries(new URLSearchParams(decrypted).entries());

            const orderStatus = respParams.order_status;
            const orderId = respParams.order_id || respParams.merchant_param5;
            const trackingId = respParams.tracking_id || "";

            if (orderStatus === "Success") {
              res.writeHead(302, {
                Location: `/payment/success?order_id=${orderId}&tracking_id=${trackingId}&status=Success`,
              });
              res.end();
            } else {
              res.writeHead(302, {
                Location: `/payment/failure?order_id=${orderId}&status=${orderStatus}&message=${encodeURIComponent(respParams.status_message || "")}`,
              });
              res.end();
            }
          } catch (e: any) {
            res.writeHead(302, {
              Location: `/payment/failure?error=${encodeURIComponent(e.message)}`,
            });
            res.end();
          }
        });
      });
    },
  };
}

// Persistent Admin Vendor & Document Synchronization plugin
function adminSyncPlugin() {
  const dataFile = path.resolve(__dirname, "./data/vendor_admin_state.json");

  function readState() {
    try {
      if (fs.existsSync(dataFile)) {
        return JSON.parse(fs.readFileSync(dataFile, "utf8"));
      }
    } catch (e) {
      console.warn("[AdminSync] Read state note:", e);
    }
    return { vendors: {}, documents: {} };
  }

  function writeState(state: any) {
    try {
      const dir = path.dirname(dataFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dataFile, JSON.stringify(state, null, 2), "utf8");
    } catch (e) {
      console.warn("[AdminSync] Write state note:", e);
    }
  }

  return {
    name: "admin-sync-plugin",
    configureServer(server: any) {
      server.middlewares.use("/api/admin/vendor-sync", (req: any, res: any, next: any) => {
        if (req.method === "GET") {
          const state = readState();
          res.setHeader("Content-Type", "application/json");
          return res.end(JSON.stringify(state));
        }

        if (req.method === "POST") {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const payload = JSON.parse(body || "{}");
              const state = readState();
              if (!state.vendors) state.vendors = {};
              if (!state.documents) state.documents = {};

              if (payload.action === "update_document_status") {
                const { docId, vendorId, status, rejectionReason } = payload;
                state.documents[docId] = {
                  id: docId,
                  vendor_id: vendorId,
                  status,
                  rejection_reason: rejectionReason || null,
                  verified_at: status === "verified" ? new Date().toISOString() : null,
                  updated_at: new Date().toISOString(),
                };
                writeState(state);
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ success: true, document: state.documents[docId] }));
              }

              if (payload.action === "update_vendor_status") {
                const {
                  vendorId,
                  status,
                  onboardingStatus,
                  reviewNotes,
                  rejectionReason,
                  gstExemptionVerified,
                  targetUserId,
                } = payload;

                state.vendors[vendorId] = {
                  ...(state.vendors[vendorId] || {}),
                  id: vendorId,
                  ...(targetUserId ? { user_id: targetUserId } : {}),
                  ...(status ? { status } : {}),
                  ...(onboardingStatus ? { onboarding_status: onboardingStatus } : {}),
                  ...(reviewNotes !== undefined ? { admin_review_notes: reviewNotes } : {}),
                  ...(rejectionReason !== undefined ? { rejection_reason: rejectionReason } : {}),
                  ...(gstExemptionVerified !== undefined ? { gst_exemption_verified: gstExemptionVerified } : {}),
                  updated_at: new Date().toISOString(),
                };
                writeState(state);
                res.setHeader("Content-Type", "application/json");
                return res.end(JSON.stringify({ success: true, vendor: state.vendors[vendorId] }));
              }

              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ error: "Unknown action" }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              return res.end(JSON.stringify({ error: err.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss(), ccavenueDevPlugin(), adminSyncPlugin()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@tanstack/react-router": path.resolve(__dirname, "./src/utils/router-compat.tsx"),
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
});
