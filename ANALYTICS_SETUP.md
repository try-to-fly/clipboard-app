# Analytics Setup Guide

## Overview
This application uses **Aptabase** for anonymous usage analytics. All data collected is completely anonymous and does not include any clipboard content or personal information.

## Setup Instructions

### 1. Create an Aptabase Account
1. Visit [Aptabase](https://aptabase.com) and create a free account
2. Create a new app in your Aptabase dashboard
3. Copy your App Key (it will look like `A-EU-XXXXXXXXXX` or `A-US-XXXXXXXXXX`)

### 2. Configure Your App Key

#### Option A: Environment Variable (Recommended for Development)
1. Copy the example environment file:
   ```bash
   cp src-tauri/.env.example src-tauri/.env
   ```
2. Edit `src-tauri/.env` and replace `YOUR_APP_KEY_HERE` with your actual Aptabase App Key:
   ```
   APTABASE_APP_KEY=A-EU-XXXXXXXXXX
   ```

#### Option B: Direct Code Modification (For Production Builds)
1. Open `src-tauri/src/lib.rs`
2. Find line 101 and replace `A-DEV-0000000000` with your actual App Key:
   ```rust
   let aptabase_key = std::env::var("APTABASE_APP_KEY")
       .unwrap_or_else(|_| "YOUR_ACTUAL_APP_KEY".to_string());
   ```

### 3. Build and Run
```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Analytics Features

### What We Track (Anonymous)
- **App Lifecycle**: App launches, session duration
- **Feature Usage**: Search, favorites, delete actions
- **Performance**: Startup time, database query performance
- **System Info**: OS version, app version
- **Errors**: Anonymous crash reports

### What We DO NOT Track
- ❌ Clipboard content
- ❌ Personal information
- ❌ File paths or names
- ❌ URLs or specific data
- ❌ Any identifiable information

### User Control
Users can opt-out of analytics at any time:
1. Open Preferences (⌘+,)
2. Navigate to the "统计" (Analytics) tab
3. Toggle "启用匿名使用统计" (Enable Anonymous Usage Statistics)

## Testing Analytics

### Verify Integration
1. Run the app with your App Key configured
2. Open the Preferences and check the Analytics tab
3. Visit your [Aptabase Dashboard](https://app.aptabase.com) to see events

### Debug Mode
To see analytics events in the console during development:
```javascript
// In src/services/analytics.ts, add console logging:
trackEvent(eventName, safeProperties)
console.log('Analytics Event:', eventName, safeProperties) // Add this line
```

## Compliance
- **GDPR Compliant**: No personal data collection
- **CCPA Compliant**: Anonymous tracking only
- **No Cookies**: Desktop app doesn't use cookies
- **No Consent Required**: Fully anonymous data

## Free Tier Limits
- **100,000 events/month** on the free tier
- No overage charges (analytics pauses if limit reached)
- Resets monthly

## Support
For issues with analytics integration:
1. Check the [Aptabase Documentation](https://aptabase.com/docs)
2. Review the [Tauri Plugin Documentation](https://github.com/aptabase/tauri-plugin-aptabase)
3. Check console logs for any errors