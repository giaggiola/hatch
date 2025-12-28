# Mobile App (React Native/Expo)

This document covers the React Native mobile app built with Expo, including setup, development, and platform-specific considerations.

---

## Overview

| Aspect | Details |
|--------|---------|
| **Framework** | Expo SDK 54 |
| **React Native** | 0.81.5 |
| **Router** | expo-router (file-based) |
| **State** | React Query |
| **Auth** | @react-native-google-signin/google-signin |
| **Storage** | expo-secure-store |

---

## Project Structure

```
mobile/
├── app/                    # Routes (file-based routing)
│   ├── (tabs)/             # Tab navigator screens
│   │   ├── _layout.tsx     # Tab bar configuration
│   │   ├── index.tsx       # Home/Swipe screen
│   │   ├── explore.tsx     # Browse names
│   │   ├── history.tsx     # Liked/dismissed names
│   │   └── settings.tsx    # User settings
│   ├── invite/
│   │   └── [code].tsx      # Deep link invite handler
│   ├── name/
│   │   └── [id].tsx        # Name detail screen
│   ├── login.tsx           # Login screen
│   ├── popular.tsx         # Popular names
│   ├── modal.tsx           # Modal screen
│   └── _layout.tsx         # Root layout
├── components/             # Reusable components
│   ├── SwipeCard.tsx       # Swipeable name card
│   ├── MatchModal.tsx      # Match celebration
│   ├── InviteShareModal.tsx# Invite sharing
│   ├── LikeButton.tsx      # Heart button
│   └── ...
├── contexts/
│   └── AuthContext.tsx     # Auth state management
├── lib/
│   └── api.ts              # API client
├── types/                  # TypeScript types
├── assets/                 # Images, fonts
├── ios/                    # iOS native project
├── android/                # Android native project
├── app.json                # Expo configuration
└── package.json
```

---

## Setup

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime |
| npm | 9+ | Package manager |
| Xcode | 15+ | iOS builds (macOS only) |
| CocoaPods | Latest | iOS dependencies |
| Android Studio | Latest | Android builds (optional) |

### Installation

```bash
cd mobile

# Install dependencies
npm install

# iOS: Install CocoaPods
cd ios
pod install
cd ..
```

### Environment Setup

Create `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:8000
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

**Important:** Use your machine's local IP (not `localhost`) for `EXPO_PUBLIC_API_URL` when testing on a physical device.

---

## Development

### Start Development Server

```bash
# Start Expo
npx expo start

# Or with cache cleared
npx expo start --clear
```

### Run on iOS Simulator

```bash
npx expo run:ios
```

### Run on Physical Device

1. Install Expo Go app (for JS-only features)
2. Scan QR code from `npx expo start`

For native modules (Google Sign-In), you need a development build:

```bash
npx expo prebuild
npx expo run:ios --device
```

### Run on Android

```bash
npx expo run:android
```

---

## App Configuration

### `app.json`

```json
{
  "expo": {
    "name": "Hatch",
    "slug": "hatch",
    "version": "1.0.0",
    "scheme": "hatch",
    "ios": {
      "bundleIdentifier": "com.hatch.app",
      "supportsTablet": true,
      "associatedDomains": ["applinks:hatch.name-me.app"]
    },
    "android": {
      "package": "com.hatch.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [{ "scheme": "https", "host": "hatch.name-me.app" }]
        }
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.YOUR-IOS-CLIENT-ID"
        }
      ]
    ]
  }
}
```

---

## Authentication

### Google Sign-In Flow

The mobile app uses native Google Sign-In:

```typescript
// contexts/AuthContext.tsx
import * as Google from 'expo-auth-session/providers/google';

const [request, response, promptAsync] = Google.useAuthRequest({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  redirectUri: makeRedirectUri({ scheme: 'hatch' }),
});

// Trigger sign in
await promptAsync();

// Handle response
if (response?.type === 'success') {
  const { authentication } = response;
  // Send to backend
  const result = await api.exchangeMobileToken(authentication.accessToken);
  await api.setToken(result.access_token);
}
```

### Token Storage

Tokens are stored in **SecureStore**:

```typescript
// lib/api.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

async getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(TOKEN_KEY);
}

async setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

async clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
```

### Dev Login

For simulator testing without Google OAuth:

```typescript
const devSignIn = async () => {
  const response = await fetch(`${apiUrl}/api/auth/dev-login`, {
    method: 'POST',
  });
  const { access_token } = await response.json();
  await api.setToken(access_token);
};
```

Requires `DEBUG=true` on the backend.

---

## Routing

### File-Based Routes

expo-router uses file-based routing similar to Next.js:

| File | Route |
|------|-------|
| `app/index.tsx` | `/` |
| `app/login.tsx` | `/login` |
| `app/(tabs)/index.tsx` | `/` (tab) |
| `app/(tabs)/history.tsx` | `/history` |
| `app/name/[id].tsx` | `/name/:id` |
| `app/invite/[code].tsx` | `/invite/:code` |

### Tab Navigation

```typescript
// app/(tabs)/_layout.tsx
export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Swipe',
          tabBarIcon: ({ color }) => <Heart color={color} />,
        }}
      />
      <Tabs.Screen name="explore" ... />
      <Tabs.Screen name="history" ... />
      <Tabs.Screen name="settings" ... />
    </Tabs>
  );
}
```

### Navigation

```typescript
import { router } from 'expo-router';

// Navigate
router.push('/name/abc123');

// Replace
router.replace('/login');

// Back
router.back();
```

---

## Deep Linking

### URL Scheme

The app responds to `hatch://` URLs:

```
hatch://invite/ABC123
```

### Universal Links (iOS)

Associated domains in `app.json`:

```json
{
  "ios": {
    "associatedDomains": ["applinks:hatch.name-me.app"]
  }
}
```

### App Links (Android)

Intent filters in `app.json`:

```json
{
  "android": {
    "intentFilters": [{
      "action": "VIEW",
      "data": [{ "scheme": "https", "host": "hatch.name-me.app" }]
    }]
  }
}
```

### Handling Deep Links

```typescript
// app/invite/[code].tsx
import { useLocalSearchParams } from 'expo-router';

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();

  // Handle invite code...
}
```

---

## API Client

### Structure

```typescript
// lib/api.ts
const API_URL = `${process.env.EXPO_PUBLIC_API_URL}/api`;

class ApiClient {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      await this.clearToken();
      throw new Error('Unauthorized');
    }

    return response.json();
  }

  // API methods...
  async getNames(limit = 20) { ... }
  async createSwipe(nameId, action) { ... }
  async getMatches() { ... }
}

export const api = new ApiClient();
```

---

## State Management

### React Query

```typescript
// Example: Fetching names
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

function SwipeScreen() {
  const { data: names, isLoading } = useQuery({
    queryKey: ['names'],
    queryFn: () => api.getNames(),
  });
}
```

### Auth Context

```typescript
// contexts/AuthContext.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check stored token on mount
  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Components

### SwipeCard

Swipeable name card with gesture handling:

```typescript
// components/SwipeCard.tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

export function SwipeCard({ name, onSwipe }) {
  const gesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX > 100) {
        onSwipe('like');
      } else if (event.translationX < -100) {
        onSwipe('dismiss');
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        {/* Card content */}
      </Animated.View>
    </GestureDetector>
  );
}
```

### MatchModal

Celebration modal when both users like a name:

```typescript
// components/MatchModal.tsx
export function MatchModal({ name, visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <Text style={styles.title}>It's a Match!</Text>
        <Text style={styles.name}>{name}</Text>
        <Button title="Keep Swiping" onPress={onClose} />
      </View>
    </Modal>
  );
}
```

---

## Building for Production

### iOS

```bash
# Generate native project
npx expo prebuild

# Open in Xcode
open ios/hatch.xcworkspace

# Build and archive in Xcode
```

### Android

```bash
# Generate native project
npx expo prebuild

# Build APK
cd android
./gradlew assembleRelease

# Build AAB for Play Store
./gradlew bundleRelease
```

### EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Google Sign-In not working | Rebuild: `npx expo prebuild --clean` |
| API calls fail | Check `EXPO_PUBLIC_API_URL` uses local IP |
| Metro bundler stuck | Clear cache: `npx expo start --clear` |
| iOS build fails | Check signing in Xcode |
| Pod install fails | `cd ios && pod repo update && pod install` |

### Debugging

```bash
# View logs
npx expo start --dev-client

# React Native debugger
# Shake device → Debug
```

### Network Issues

When testing on physical device:

1. Phone and computer must be on same WiFi
2. Use machine's IP (e.g., `192.168.1.100`), not `localhost`
3. Check firewall isn't blocking port 8000

Find your IP:
```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I
```

---

## Platform-Specific Notes

### iOS

- Requires macOS with Xcode
- Google Sign-In needs `iosUrlScheme` in `app.json`
- Associated domains for Universal Links need Apple Developer account

### Android

- Intent filters for App Links
- SHA-256 fingerprint needed for Google Sign-In
- Release builds need signed APK/AAB

---

## Environment Comparison

| Variable | Development | Production |
|----------|-------------|------------|
| `EXPO_PUBLIC_API_URL` | `http://192.168.x.x:8000` | `https://hatch-api.fly.dev` |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Same | Same |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Same | Same |

---

## Related Documentation

- [auth-system.md](auth-system.md) - Mobile auth flow details
- [integrations.md](integrations.md) - Google OAuth setup for mobile
- [local-development.md](local-development.md) - Local setup
- [api-reference.md](api-reference.md) - API endpoints
