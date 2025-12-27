# Subscription System Setup Guide

## Installation

### 1. Install Razorpay Package

```bash
cd Backend
npm install razorpay
```

### 2. Environment Variables

Add these to your `.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Razorpay Dashboard Setup

1. Go to Razorpay Dashboard: https://dashboard.razorpay.com
2. Get your Key ID and Key Secret from Settings → API Keys
3. Create a Webhook:
   - Go to Settings → Webhooks
   - Add webhook URL: `https://your-domain.com/api/payments/webhook`
   - Select events: `payment.captured`, `payment.failed`, `payment.authorized`
   - Copy the webhook secret

## Database Models Created

1. **SubscriptionPlan** - Subscription plans (1 month, 2 months, 1 year, etc.)
2. **UserSubscription** - User's active subscriptions
3. **Payment** - Complete payment tracking (initiated, clicked, success, failed)
4. **PromoCode** - Promo codes with discount values
5. **Referral** - Referral system tracking

## Features Implemented

### ✅ Subscription Plans
- Flexible durations (1 month, 2 months, 1 year, 2 years, lifetime)
- Trial period support
- Plan types: free, basic, premium, lifetime

### ✅ Payment Tracking
- Payment initiated timestamp
- Payment clicked timestamp
- Payment success/failed timestamp
- Attempt number tracking
- Complete payment history

### ✅ Promo Codes
- Admin can create promo codes
- Percentage or fixed discount
- Usage limits (total and per user)
- Valid from/until dates
- Applicable to specific plans

### ✅ Referral System
- Auto-generate referral codes for users
- Referrer and referee rewards
- Track referrals and rewards
- Admin can view all referrals

### ✅ Razorpay Integration
- Order creation
- Payment verification
- Webhook handling
- Signature verification

## API Endpoints

### Subscriptions
- `GET /api/subscriptions/plans` - Get all plans
- `GET /api/subscriptions/current` - Get current subscription
- `POST /api/subscriptions/trial` - Start trial
- `PUT /api/subscriptions/cancel` - Cancel subscription

### Payments
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/track-click` - Track payment click
- `POST /api/payments/webhook` - Razorpay webhook
- `GET /api/payments/history` - Get payment history
- `GET /api/payments` - Get all payments (admin)

### Promo Codes
- `GET /api/promo-codes` - Get all promo codes (admin)
- `POST /api/promo-codes/validate` - Validate promo code
- `POST /api/promo-codes` - Create promo code (admin)
- `PUT /api/promo-codes/:id` - Update promo code (admin)
- `DELETE /api/promo-codes/:id` - Delete promo code (admin)

### Referrals
- `GET /api/referrals/code` - Get referral code
- `GET /api/referrals/stats` - Get referral stats
- `GET /api/referrals` - Get all referrals (admin)

## Next Steps

1. **Frontend Implementation** - Create subscription UI, payment flow, promo code input
2. **Admin Panel** - Create admin UI for managing plans, promo codes, referrals, and viewing payments
3. **Testing** - Test payment flow with Razorpay test keys
4. **Email Notifications** - Add email notifications for payment success, subscription expiry, etc.

## Important Notes

- Payment tracking captures every step: initiated → clicked → success/failed
- All payment attempts are tracked with attempt numbers
- Webhook must be configured correctly for payment verification
- Promo codes and referral codes are applied before payment
- Trial period is automatically handled
- No auto-renewal (as requested)

