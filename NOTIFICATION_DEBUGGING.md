# Push Notification Debugging Guide

## Problem: Notifications Not Received on Physical Device

यदि admin side से notification send किया गया है लेकिन physical device पर notification नहीं आ रहा है, तो यह guide follow करें।

## Step 1: Check Device Token Registration

### Option A: Use Debug Endpoint (Recommended)

1. **App में login करें**
2. **API call करें:**
   ```
   GET /api/notifications/debug/my-tokens
   Authorization: Bearer YOUR_AUTH_TOKEN
   ```

3. **Response check करें:**
   - `totalTokens` > 0 होना चाहिए
   - `expoTokens` > 0 होना चाहिए (Expo app के लिए)
   - Token format: `ExponentPushToken[...]` होना चाहिए

### Option B: Check Database Directly

```javascript
// MongoDB query
db.devicetokens.find({ 
  userId: ObjectId("YOUR_USER_ID"), 
  isActive: true 
})
```

## Step 2: Verify Token Format

Token format सही होना चाहिए:
- ✅ Correct: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]`
- ❌ Wrong: `ExpoToken...` या कोई और format

## Step 3: Check Backend Logs When Sending Notification

जब admin notification send करता है, backend logs में देखें:

```
📱 Found X active device token(s) for Y user(s)
📱 Token breakdown: X Expo tokens, Y FCM tokens
📱 Sample tokens: [...]
📤 Sending notification to X device(s)...
📱 Expo API response: X success, Y failed
```

### Common Issues in Logs:

1. **"No device tokens found"**
   - Solution: User को app में "Register Device" button click करना होगा

2. **"Expo API response: 0 success, X failed"**
   - Check error details in logs
   - Common errors:
     - `InvalidCredentials`: Project ID issue
     - `DeviceNotRegistered`: Token expired/invalid
     - `MessageTooBig`: Payload too large

3. **"Token breakdown: 0 Expo tokens"**
   - User ने FCM token register किया है, Expo token नहीं
   - Solution: App में Expo token generate होना चाहिए

## Step 4: Check Expo Push Notification Service

### Verify Project ID

1. Check `app.json` में `extra.eas.projectId` है
2. Backend logs में project ID verify करें

### Test Expo API Directly

```bash
curl -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '[
    {
      "to": "ExponentPushToken[YOUR_TOKEN]",
      "title": "Test",
      "body": "Test notification",
      "sound": "default"
    }
  ]'
```

Response check करें:
- `status: "ok"` = Success
- `status: "error"` = Check error message

## Step 5: Check App Configuration

### Android

1. **Notification Channel:**
   - App में channel create होना चाहिए
   - Channel ID: `default`

2. **Permissions:**
   - Settings → Apps → ExamZen → Notifications → Enabled

3. **Background Restrictions:**
   - Settings → Apps → ExamZen → Battery → Unrestricted

### iOS

1. **Permissions:**
   - Settings → ExamZen → Notifications → Allow Notifications

2. **Background Modes:**
   - `app.json` में `UIBackgroundModes: ["remote-notification"]` होना चाहिए

## Step 6: Common Issues & Solutions

### Issue 1: Token Not Registered

**Symptoms:**
- Backend logs: "No device tokens found"
- Debug endpoint: `totalTokens: 0`

**Solution:**
1. App open करें
2. Profile Screen → "Register Device" button click करें
3. Success message check करें
4. Debug endpoint फिर से check करें

### Issue 2: Token Format Wrong

**Symptoms:**
- Token `ExponentPushToken[...]` format में नहीं है
- Backend logs: "0 Expo tokens"

**Solution:**
1. App में Expo project ID verify करें
2. Token generation check करें
3. "Register Device" फिर से करें

### Issue 3: Expo API Error

**Symptoms:**
- Backend logs: "Expo API response: 0 success, X failed"
- Error: `InvalidCredentials` या `DeviceNotRegistered`

**Solutions:**

**InvalidCredentials:**
- Check `app.json` में `extra.eas.projectId` सही है
- Project ID match करना चाहिए Expo dashboard के साथ

**DeviceNotRegistered:**
- Token expired हो गया है
- App reinstall करें या "Register Device" फिर से करें

### Issue 4: Notification Sent But Not Received

**Symptoms:**
- Backend logs: "Expo API response: X success"
- लेकिन device पर notification नहीं आया

**Solutions:**

1. **App Background में है:**
   - App को foreground में लाएं
   - Notification आना चाहिए

2. **Do Not Disturb Mode:**
   - Device settings में DND check करें

3. **Battery Optimization:**
   - Android: Battery optimization disable करें
   - iOS: Background App Refresh enable करें

4. **Network Issues:**
   - Internet connection check करें
   - Expo service accessible होना चाहिए

## Step 7: Debug Endpoints

### For Users (Check Your Tokens)

```bash
GET /api/notifications/debug/my-tokens
Authorization: Bearer YOUR_TOKEN
```

Response:
```json
{
  "success": true,
  "user": { "id": "...", "name": "...", "email": "..." },
  "totalTokens": 1,
  "expoTokens": 1,
  "fcmTokens": 0,
  "tokens": [
    {
      "id": "...",
      "token": "ExponentPushToken[...]",
      "platform": "android",
      "isActive": true,
      "lastUsedAt": "...",
      "deviceInfo": { ... }
    }
  ]
}
```

### For Admins (Check All Tokens)

```bash
GET /api/notifications/debug/all-tokens
Authorization: Bearer ADMIN_TOKEN
```

### Verify Specific Token

```bash
POST /api/notifications/debug/verify-token
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "token": "ExponentPushToken[...]"
}
```

## Step 8: Testing Checklist

- [ ] Device token registered है (debug endpoint check करें)
- [ ] Token format सही है (`ExponentPushToken[...]`)
- [ ] Backend logs में token found हो रहा है
- [ ] Expo API response success है
- [ ] App permissions granted हैं
- [ ] Notification channel created है (Android)
- [ ] Background restrictions disabled हैं
- [ ] Internet connection है
- [ ] App latest version है

## Step 9: Backend Logs Analysis

जब notification send होता है, logs में यह देखना चाहिए:

```
📱 Found 1 active device token(s) for 1 user(s)
📱 Token breakdown: 1 Expo tokens, 0 FCM tokens
📱 Sample tokens: [ { token: 'ExponentPushToken[...]', platform: 'android', userId: '...' } ]
📤 Sending notification to 1 device(s)...
📱 Token distribution: 0 FCM tokens, 1 Expo tokens
📱 Expo API response: 1 success, 0 failed out of 1 tokens
✅ Expo notification sent successfully to token ExponentPushToken[...]
✅ 1 notification(s) sent successfully
```

अगर कोई step fail हो रहा है, तो उस step का solution apply करें।

## Quick Fix Commands

### Re-register Device Token

1. App में Profile Screen खोलें
2. "Register Device" button click करें
3. Success message check करें

### Check Token Registration

```bash
# Replace YOUR_TOKEN with actual auth token
curl -X GET "https://backendoftestseries.onrender.com/api/notifications/debug/my-tokens" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Notification Manually

Admin panel से notification send करें और backend logs check करें।

---

**Note:** अगर सब कुछ सही है लेकिन फिर भी notification नहीं आ रहा, तो:
1. App को restart करें
2. Device को restart करें
3. App को uninstall और reinstall करें
4. Expo project ID verify करें
