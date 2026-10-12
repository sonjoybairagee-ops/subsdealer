# Adobe Permanent Account System - Setup Guide

This guide explains how to set up the complete permanent email & password generation system with Cloudflare Email Worker integration for real-time OTP reception.

## Architecture Overview

```
1. Admin Panel → Generate Account → Supabase (adobe_accounts table)
2. Customer uses credentials → Adobe sends OTP
3. Cloudflare Email Worker receives email → Extracts OTP
4. Worker forwards to webhook → Updates adobe_accounts.last_otp
5. Admin Panel shows live OTP for each account
```

## Step 1: Database Setup

Run the SQL migration to create the `adobe_accounts` table:

```bash
# Copy the SQL file
cat scripts/create_adobe_accounts_table.sql

# Run it in your Supabase SQL Editor
# Open: https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new
# Paste the entire content and click "Run"
```

The table includes:
- `email` - Permanent email address (e.g., adobe_abc123@subsdealer.com)
- `password` - Strong permanent password
- `is_used` - Track if account is assigned to a customer
- `last_otp` - Latest OTP code received
- `last_otp_time` - Timestamp of latest OTP

## Step 2: Environment Variables

Add these to your `.env.local` file:

```bash
# Cloudflare Email Worker Integration
WEBHOOK_SECRET=your-random-secret-here
WEBHOOK_URL=https://subsdealer.com/api/webhook/email-receiver
```

Generate a secure secret:
```bash
openssl rand -hex 32
```

## Step 3: Cloudflare Email Worker Setup

### 3.1 Create Email Worker

1. Go to Cloudflare Dashboard → Email Routing
2. Click "Create email worker"
3. Name it (e.g., `subsdealer-otp-worker`)
4. Set environment variables:
   - `WEBHOOK_SECRET` = (your secret from Step 2)
   - `WEBHOOK_URL` = (your production webhook URL)

### 3.2 Paste Worker Code

Copy the code from `scripts/cloudflare_email_worker_adobe.js` and paste it into the worker editor.

### 3.3 Configure Email Routing

1. In Cloudflare Email Routing, add a catch-all rule:
   - `*@subsdealer.com` → Your Email Worker
2. This ensures all emails to your domain are processed by the worker

### 3.4 Test the Worker

Send a test email to `test@subsdealer.com` from Adobe. Check the worker logs:
```
✓ Successfully forwarded OTP [123456] for test@subsdealer.com (Adobe Creative Cloud)
```

## Step 4: Using the Admin Panel

### 4.1 Access the Page

Navigate to: `https://your-domain.com/admin/adobe-accounts`

### 4.2 Generate Accounts

- **Single Account**: Click "Generate 1 Account"
- **Bulk Generation**: Enter count (1-50) and click "Generate X Accounts"

Each account has:
- Email: `adobe_<random>@subsdealer.com`
- Password: `Ad@<random>!9` (strong, auto-generated)

### 4.3 Manage Accounts

- **View Password**: Click 👁️ icon to show/hide password
- **Copy**: Click 📋 to copy email or password
- **Mark Used/Available**: Toggle status when assigning to customers
- **Delete**: Remove account from stock

### 4.4 Monitor OTPs

When Adobe sends OTP to an account:
1. Cloudflare Worker receives it instantly
2. OTP is extracted and forwarded to webhook
3. `last_otp` field updates in database
4. Admin panel shows OTP in green text with timestamp

## Step 5: Complete Workflow

### Selling an Adobe Account

1. **Generate Stock**: Use admin panel to create accounts in bulk
2. **Create Adobe User**: Use credentials to create user in Adobe Console
3. **Customer Purchase**: When customer buys, mark account as "Used"
4. **Delivery**: Share credentials with customer
5. **OTP Handling**: 
   - Customer tries to log in → Adobe sends OTP
   - OTP appears in admin panel automatically
   - Share OTP with customer via WhatsApp/email

### Automation Note

You can automate the OTP delivery by:
- Creating a webhook listener that triggers on `last_otp` update
- Automatically sending OTP to customer's WhatsApp/email
- This requires additional API integration

## API Endpoints

### Generate Single Account
```bash
POST /api/admin/adobe-accounts
Response: { success: true, account: { email, password } }
```

### Generate Bulk Accounts
```bash
POST /api/admin/adobe-accounts/bulk
Body: { count: 10 }
Response: { success: true, accounts: [...] }
```

### List All Accounts
```bash
GET /api/admin/adobe-accounts
Response: { success: true, accounts: [...] }
```

### Update Account Status
```bash
PATCH /api/admin/adobe-accounts
Body: { id: "uuid", is_used: true }
Response: { success: true, account: {...} }
```

### Delete Account
```bash
DELETE /api/admin/adobe-accounts?id=uuid
Response: { success: true, message: "Account deleted" }
```

## Security Considerations

1. **Webhook Secret**: Never commit `WEBHOOK_SECRET` to git
2. **Password Encryption**: Consider encrypting passwords in database (like existing `sub_credentials` table)
3. **Access Control**: Only admins can access `/admin/adobe-accounts`
4. **Rate Limiting**: Consider adding rate limiting to account generation
5. **Audit Logging**: All actions should be logged to `admin_logs` table

## Troubleshooting

### OTP Not Appearing

1. Check Cloudflare Worker logs for errors
2. Verify `WEBHOOK_SECRET` matches between worker and backend
3. Check webhook URL is correct and accessible
4. Verify email routing rule is active in Cloudflare

### Account Generation Fails

1. Check Supabase connection in API route
2. Verify `adobe_accounts` table exists
3. Check RLS policies allow service role access

### Worker Not Receiving Emails

1. Verify MX records point to Cloudflare
2. Check email routing rules are active
3. Test with simple email before Adobe

## Next Steps

1. **Run the SQL migration** in Supabase
2. **Set environment variables** in `.env.local`
3. **Configure Cloudflare Worker** with the provided script
4. **Test the flow** by generating an account and sending a test email
5. **Deploy to production** and update webhook URL

## Files Created/Modified

- `scripts/create_adobe_accounts_table.sql` - Database migration
- `src/app/api/admin/adobe-accounts/route.ts` - Single account API
- `src/app/api/admin/adobe-accounts/bulk/route.ts` - Bulk generation API
- `scripts/cloudflare_email_worker_adobe.js` - Enhanced Cloudflare Worker
- `src/app/api/webhook/email-receiver/route.ts` - Updated webhook (links OTPs to accounts)
- `src/app/admin/adobe-accounts/page.tsx` - Admin panel UI
- `src/app/admin/layout.tsx` - Added navigation link
- `.env.example` - Added new environment variables
