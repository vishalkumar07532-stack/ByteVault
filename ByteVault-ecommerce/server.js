require("dotenv").config();

const express = require("express");
const path = require("path");
const { Resend } = require("resend");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/products", (req, res) => {
  const products = db.getProducts();
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const product = db.getProduct(Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

app.post("/api/orders", async (req, res) => {
  try {
    const { customer, items, paymentMethod, notes } = req.body || {};

    if (!customer?.name || !customer?.phone || !customer?.email ||
        !customer?.address || !customer?.city || !customer?.state || !customer?.pincode) {
      return res.status(400).json({ error: "Please complete all required checkout fields." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const productMap = new Map(db.getProducts().map(p => [p.id, p]));
    const normalizedItems = [];

    for (const item of items) {
      const product = productMap.get(Number(item.productId));
      const qty = Math.max(1, Math.min(99, Number(item.quantity) || 1));
      if (!product) return res.status(400).json({ error: "One of the selected products is unavailable." });
      if (product.stock < qty) return res.status(400).json({ error: `${product.name} has only ${product.stock} unit(s) available.` });

      normalizedItems.push({
        productId: product.id,
        name: product.name,
        quantity: qty,
        price: product.price
      });
    }

    const subtotal = normalizedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const delivery = subtotal >= 2500 ? 0 : 99;
    const total = subtotal + delivery;
    const orderId = `BV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    db.createOrder({
      orderId,
      customer,
      items: normalizedItems,
      subtotal,
      delivery,
      total,
      paymentMethod: paymentMethod || "COD",
      notes: notes || ""
    });

    let emailSent = false;
    if (process.env.RESEND_API_KEY && process.env.ORDER_TO_EMAIL && process.env.ORDER_FROM_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const itemRows = normalizedItems.map(i =>
        `<tr><td>${escapeHtml(i.name)}</td><td>${i.quantity}</td><td>₹${i.price.toLocaleString("en-IN")}</td><td>₹${(i.price*i.quantity).toLocaleString("en-IN")}</td></tr>`
      ).join("");

      const html = `
        <h2>New ByteVault Order — ${orderId}</h2>
        <h3>Customer</h3>
        <p><b>Name:</b> ${escapeHtml(customer.name)}<br>
        <b>Phone:</b> ${escapeHtml(customer.phone)}<br>
        <b>Email:</b> ${escapeHtml(customer.email)}<br>
        <b>Address:</b> ${escapeHtml(customer.address)}, ${escapeHtml(customer.city)}, ${escapeHtml(customer.state)} - ${escapeHtml(customer.pincode)}</p>
        <h3>Order</h3>
        <table border="1" cellpadding="8" cellspacing="0">
          <tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Total</th></tr>
          ${itemRows}
        </table>
        <p><b>Delivery:</b> ₹${delivery.toLocaleString("en-IN")}<br>
        <b>Total:</b> ₹${total.toLocaleString("en-IN")}<br>
        <b>Payment:</b> ${escapeHtml(paymentMethod || "COD")}<br>
        <b>Notes:</b> ${escapeHtml(notes || "—")}</p>
      `;

      const result = await resend.emails.send({
        from: process.env.ORDER_FROM_EMAIL,
        to: [process.env.ORDER_TO_EMAIL],
        subject: `ByteVault Order ${orderId}`,
        html
      });

      emailSent = !result.error;
    }

    res.status(201).json({
      success: true,
      orderId,
      subtotal,
      delivery,
      total,
      emailSent,
      message: emailSent
        ? "Order placed and notification email sent."
        : "Order placed. Email notification is not configured yet."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Unable to place the order right now." });
  }
});

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

app.listen(PORT, () => console.log(`ByteVault running at http://localhost:${PORT}`));
