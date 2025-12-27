# FCM (Firebase Cloud Messaging) Setup Guide

This guide will help you set up Firebase Cloud Messaging for push notifications in your application.

## Prerequisites

1. A Google account
2. Access to Firebase Console (https://console.firebase.google.com/)

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter project name
   - Enable/disable Google Analytics (optional)
   - Click "Create project"

## Step 2: Add Android App to Firebase

1. In Firebase Console, click the Android icon or "Add app"
2. Enter your Android package name from `app.json`:
   - Check `frontend/app.json` → `android.package`
   - Example: `com.examzen.app` (from your current config)
3. Register the app
4. **Note:** For Expo, you don't need to download `google-services.json` manually
   - Expo handles FCM configuration automatically through EAS Build
   - The file will be added automatically during the build process

## Step 3: Add iOS App to Firebase (if needed)

1. In Firebase Console, click the iOS icon or "Add app"
2. Enter your iOS bundle ID from `app.json`:
   - Check `frontend/app.json` → `ios.bundleIdentifier`
   - Example: `com.examzen.app` (from your current config)
3. Register the app
4. **Note:** For Expo, you don't need to download `GoogleService-Info.plist` manually
   - Expo handles APNS configuration automatically through EAS Build
   - The file will be added automatically during the build process

## Step 4: Generate Service Account Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Go to **Service Accounts** tab
3. Click **Generate New Private Key**
4. Download the JSON file (this contains your credentials)

## Step 5: Extract Required Credentials

From the downloaded JSON file, extract the following values:

```json
{
  "project_id": "your-project-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
}
```

## Step 6: Add Environment Variables

Add the following environment variables to your `Backend/.env` file:

```env
# Firebase Cloud Messaging (FCM) Configuration
FCM_PROJECT_ID=your-project-id
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
```

**Important Notes:**
- Keep the `FCM_PRIVATE_KEY` in quotes and preserve the `\n` characters
- The private key should include the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` lines
- Never commit these credentials to version control

## Step 7: Configure Expo for Push Notifications

**Important:** Since you're using Expo, the setup is different from native React Native.

### Option A: Using Expo Managed Workflow (Current Setup)

1. Your `app.json` already has EAS project ID configured:
   ```json
   "extra": {
     "eas": {
       "projectId": "dfe356e3-db7f-4619-9578-60b7aa05efd5"
     }
   }
   ```

2. **For Development (Expo Go):**
   - Push notifications work with Expo Go for testing
   - No additional configuration needed
   - Just install `expo-notifications` when ready

3. **For Production (EAS Build):**
   - When you build with EAS, Firebase config files are added automatically
   - You need to configure Firebase credentials in EAS:
     ```bash
     cd frontend
     eas build:configure
     ```
   - During build, EAS will automatically add `google-services.json` and `GoogleService-Info.plist`

### Option B: Using Development Build (Recommended for Production)

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Login to Expo:
   ```bash
   eas login
   ```

3. Configure EAS Build:
   ```bash
   cd frontend
   eas build:configure
   ```

4. Add Firebase credentials to EAS:
   - Go to [Expo Dashboard](https://expo.dev)
   - Select your project
   - Go to Credentials → Android → Add Firebase credentials
   - Upload `google-services.json` (downloaded from Firebase Console)

5. Build the app:
   ```bash
   eas build --platform android
   eas build --platform ios
   ```

### Current Status

**Note:** Currently, `expo-notifications` is disabled in your app to prevent native module crashes. To enable:

1. Build a development build (not Expo Go):
   ```bash
   eas build --profile development --platform android
   ```

2. Install the development build on your device

3. Re-enable notifications in `frontend/src/utils/pushNotifications.ts`:
   - Change `NOTIFICATIONS_ENABLED = true`
   - Or remove the stub and use actual implementation

## Step 8: Test Push Notifications

1. Start your backend server
2. Start your frontend app
3. Login to the app (this will automatically register the device token)
4. Go to Admin Panel → Notifications
5. Create a test notification
6. Click "Send" to send it immediately

## Troubleshooting

### Issue: "Firebase Admin SDK not initialized"
- Check that all environment variables are set correctly
- Verify the private key format (should include `\n` characters)
- Make sure the private key is wrapped in quotes in `.env` file

### Issue: "No push token available"
- Make sure you're testing on a physical device (not emulator/simulator)
- Check that notification permissions are granted
- Verify Expo project ID is configured correctly

### Issue: Notifications not received
- Check device token is registered in database
- Verify FCM credentials are correct
- Check Firebase Console for delivery reports
- Ensure app is not in background (for testing)

## Security Best Practices

1. **Never commit credentials**: Add `.env` to `.gitignore`
2. **Use environment variables**: Never hardcode credentials
3. **Rotate keys regularly**: Generate new service account keys periodically
4. **Limit permissions**: Service account should only have necessary permissions
5. **Monitor usage**: Check Firebase Console for unusual activity

## Additional Resources

- [Firebase Console](https://console.firebase.google.com/)
- [FCM Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

## Support

If you encounter any issues, check:
1. Firebase Console → Project Settings → Service Accounts
2. Backend logs for FCM initialization errors
3. Frontend logs for token registration errors

