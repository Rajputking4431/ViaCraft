// Shiprocket Third-Party Integration Client

export async function getShiprocketToken(): Promise<string | null> {
  const email = import.meta.env.VITE_SHIPROCKET_EMAIL || process.env.SHIPROCKET_EMAIL;
  const password = import.meta.env.VITE_SHIPROCKET_PASSWORD || process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    return null; // Mock mode
  }

  try {
    const res = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Shiprocket Auth Failed");
    const json = await res.json();
    return json.token || null;
  } catch (e) {
    console.warn("Failed to authenticate with Shiprocket API, using Mock:", e);
    return null;
  }
}

export async function createShiprocketOrder(token: string, payload: any): Promise<any> {
  const res = await fetch(
    "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shiprocket Order Creation Failed: ${errText}`);
  }
  return res.json();
}

export async function assignShiprocketAwb(token: string, shipmentId: string): Promise<any> {
  const res = await fetch(
    "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ shipment_id: shipmentId }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shiprocket AWB Assignment Failed: ${errText}`);
  }
  return res.json();
}

export async function generateShiprocketPickup(token: string, shipmentId: string): Promise<any> {
  const res = await fetch(
    "https://apiv2.shiprocket.in/v1/external/courier/generate/pickup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ shipment_id: [shipmentId] }),
    }
  );
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shiprocket Pickup Generation Failed: ${errText}`);
  }
  return res.json();
}

export async function cancelShiprocketOrder(token: string, orderId: string): Promise<any> {
  const res = await fetch("https://apiv2.shiprocket.in/v1/external/orders/cancel", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ids: [orderId] }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Shiprocket Order Cancellation Failed: ${errText}`);
  }
  return res.json();
}
