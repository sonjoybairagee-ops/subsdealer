# Adobe Subscription Workflow - Complete Guide

এই গাইডটি Adobe Creative Cloud subscription system-এর complete workflow বুঝিয়ে দেবে।

## Architecture Overview

```
Adobe Accounts Stock → Convert to Credential → Assign to Subscription → Customer Access
```

## Complete Workflow

### Step 1: Database Setup

প্রথমে Adobe product এবং plans add করুন:

```sql
-- Run this in Supabase SQL Editor
-- File: scripts/add_adobe_product.sql
```

এটি যোগ করবে:
- Adobe Creative Cloud product
- 1 Month plan (৳2,499)
- 3 Months plan (৳7,499)
- 4 Months plan (৳9,999)

### Step 2: Generate Adobe Accounts

1. Admin Panel এ যান: `/admin/adobe-accounts`
2. "Generate 1 Account" বাটনে ক্লিক করুন
3. অথবা bulk generate করুন (1-50 accounts)

প্রতিটি account হবে:
- Email: `adobe_<random>@subsdealer.com`
- Password: `Ad@<random>!9`
- Status: Available

### Step 3: Create Adobe User (Optional)

আপনি চাইলে এখনই Adobe-এ user create করতে পারেন:

1. Adobe Console: https://account.adobe.com
2. জেনারেট করা email দিয়ে sign up করুন
3. Verification email আসবে Cloudflare Worker-এ
4. OTP দেখা যাবে admin panel-এ (`/admin/adobe-accounts`)
5. Verify করুন

**Note:** এটি optional। আপনি customer-কে credentials দিয়ে নিজের কাজ করতে দিতে পারেন।

### Step 4: Customer Buys Adobe Subscription

1. Customer Adobe Creative Cloud product কিনবে (1m/3m/4m)
2. Payment approve করবেন
3. Subscription status হবে `pending_credential`

### Step 5: Convert Adobe Account to Credential

1. Admin Panel এ যান: `/admin/adobe-accounts`
2. একটি available account খুঁজুন
3. "Convert" বাটনে ক্লিক করুন
4. Account এখন `sub_credentials` table-এ আসবে
5. Status হবে "Used"

### Step 6: Assign Credential to Subscription

1. Admin Panel এ যান: `/admin/subscriptions`
2. "Needs credential" filter এ যান
3. Adobe subscription খুঁজুন
4. Expand করুন
5. Credential dropdown থেকে select করুন
6. "Assign" বাটনে ক্লিক করুন

Subscription status হবে `active`

### Step 7: Customer Access

1. Customer dashboard এ যাবে
2. "Reveal credential" বাটনে ক্লিক করবে
3. System check করবে:
   - Subscription active?
   - Expiry date passed?
4. যদি valid, তাহলে email/password দেখাবে
5. Expiry হলে আর দেখাবে না

### Step 8: OTP Handling (When Customer Logs In)

1. Customer Adobe-এ login করতে চাইবে
2. Adobe verification email পাঠাবে
3. Cloudflare Email Worker ধরবে
4. OTP আপডেট হবে `adobe_accounts.last_otp` এ
5. Admin panel-এ OTP দেখা যাবে
6. Customer-কে OTP share করুন

### Step 9: Expiry & Renewal

**Expiry:**
- Expiry date পার হলে customer credential দেখতে পারবে না
- Status হবে `expired`

**Renewal:**
- Customer renew করলে expiry date extend হবে
- Customer আবার credential দেখতে পারবে
- `/admin/subscriptions` এ "Extend" বাটন ব্যবহার করুন

## API Endpoints

### Generate Adobe Account
```bash
POST /api/admin/adobe-accounts
Response: { success: true, account: { email, password } }
```

### Convert to Credential
```bash
POST /api/admin/adobe-accounts/convert-to-credential
Body: { adobe_account_id: "uuid" }
Response: { success: true, credential: { id, login_email } }
```

### Assign Credential (Existing System)
```bash
POST /api/admin/sub/subscription-action
Body: { action: "assign_credential", subscriptionId, credentialId }
```

## Security Features

✅ Password encryption (AES-256-GCM)  
✅ Row Level Security (RLS)  
✅ Expiry validation on reveal  
✅ Rate limiting on credential reveal  
✅ Audit logging for all admin actions  
✅ Webhook secret for Cloudflare Worker  

## Troubleshooting

### Credential Not Showing
- Check subscription status (should be `active`)
- Check expiry date
- Check customer has subscription ID

### OTP Not Appearing
- Check Cloudflare Worker logs
- Verify WEBHOOK_SECRET matches
- Check webhook URL is correct
- Test with a simple email first

### Conversion Failed
- Check if account already converted
- Check CREDENTIAL_ENC_KEY is set
- Check sub_credentials table exists

## Files Created/Modified

- `scripts/add_adobe_product.sql` - Adobe product & plans
- `scripts/create_adobe_accounts_table.sql` - Adobe accounts table
- `scripts/cloudflare_email_worker_adobe.js` - Enhanced Cloudflare Worker
- `src/app/api/admin/adobe-accounts/route.ts` - Account generation API
- `src/app/api/admin/adobe-accounts/bulk/route.ts` - Bulk generation API
- `src/app/api/admin/adobe-accounts/convert-to-credential/route.ts` - Conversion API
- `src/app/api/webhook/email-receiver/route.ts` - Updated webhook
- `src/app/admin/adobe-accounts/page.tsx` - Admin panel UI
- `src/app/admin/layout.tsx` - Navigation link
- `.env.example` - Environment variables

## Quick Reference

| Page | Purpose |
|------|---------|
| `/admin/adobe-accounts` | Generate & manage Adobe stock |
| `/admin/subscriptions` | Assign credentials to subscriptions |
| `/admin/credentials` | View all credentials (including Adobe) |
| `/admin/otp-logs` | View all OTPs received |

## Next Steps

1. Run SQL migration for Adobe product
2. Generate test Adobe accounts
3. Test conversion to credential
4. Create test subscription
5. Assign credential
6. Test customer reveal
7. Test OTP flow
