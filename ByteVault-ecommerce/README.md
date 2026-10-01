# ByteVault — Premium Hardware Store

A responsive, functional starter e-commerce site for HDD, SSD, RAM and storage hardware.

## Included
- Premium dark/glassmorphism UI
- Product search, filters and sorting
- Storage Finder recommendation flow
- Product details with optional drive-health data
- Cart, wishlist, comparison and recently-viewed products
- Checkout form
- SQLite product/order database
- Server-side order creation
- Resend transactional email integration
- SEO-friendly metadata and semantic HTML
- No secrets in frontend code

## Run locally

1. Install Node.js 20+.
2. In this folder run:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env`.
4. Add your Resend API key and a verified sender domain/email.
5. Start:
   ```bash
   npm start
   ```
6. Open `http://localhost:3000`

If `RESEND_API_KEY` is missing, orders are still stored in SQLite for development, but the email notification is skipped and the API response tells you that email delivery is not configured.

## Production notes
- Use HTTPS.
- Use a verified domain in Resend.
- Put the database on persistent storage.
- Add authentication/admin routes before exposing product management.
- Add a real payment gateway before accepting online payments.
- Replace placeholder product images with your own licensed product photography.
- Add rate limiting, CSRF protection where applicable, validation, backups and monitoring before production.
