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
| **Auth** | expo-auth-session (with @react-native-google-signin plugin for iOS URL scheme) |
| **Storage** | expo-secure-store |

---

## Project Structure

```
mobile/
├── app/                    # Routes (file-based routing)
│   ├── (tabs)/             # Tab navigator screens
│   │   ├── _layout.tsx     # Tab bar configuration
│   │   ├── index.tsx       # Home/Swipe screen
│   │   ├── explore.tsx     # Browse names by origin
│   │   ├── history.tsx     # Liked/dismissed/matches tabs
│   │   └── settings.tsx    # User settings
│   ├── explore/
│   │   └── [origin].tsx    # Browse names by specific origin
│   ├── invite/
│   │   └── [code].tsx      # Deep link invite handler
│   ├── name/
│   │   └── [id].tsx        # Name detail modal with facts
│   ├── login.tsx           # Login screen
│   ├── popular.tsx         # Popular names screen
│   ├── modal.tsx           # Modal screen
│   ├── +html.tsx           # Web support
│   ├── +not-found.tsx      # 404 error page
│   └── _layout.tsx         # Root layout
├── components/             # Reusable components
│   ├── SwipeCard.tsx       # Swipeable name card
│   ├── MatchModal.tsx      # Match celebration
│   ├── InviteShareModal.tsx# Invite sharing
│   ├── CreateNameModal.tsx # Add custom names
│   ├── LikeButton.tsx      # Heart button
│   ├── AnimatedSplash.tsx  # Splash screen animation
│   └── ...
├── contexts/
│   ├── AuthContext.tsx     # Auth state management
│   └── ThemeContext.tsx    # Light/dark/system theme
├── lib/
│   ├── api.ts              # API client
│   ├── genderUtils.ts      # Gender display utilities
│   ├── countries.ts        # Country/flag emoji mapping
│   └── regions.ts          # Region definitions
├── constants/
│   ├── Colors.ts           # Theme colors
│   └── theme.ts            # Spacing, fonts, design tokens
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

The mobile app uses `expo-auth-session` for Google Sign-In:

```typescript
// contexts/AuthContext.tsx
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

const redirectUri = makeRedirectUri({ scheme: 'hatch' });

const [request, response, promptAsync] = Google.useAuthRequest({
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  redirectUri,
});

// Trigger sign in
const signIn = async () => {
  await promptAsync();
};

// Handle response in useEffect
useEffect(() => {
  if (response?.type === 'success') {
    const { authentication } = response;
    if (authentication?.accessToken) {
      handleGoogleToken(authentication.accessToken);
    }
  }
}, [response]);

// Exchange Google token for app token
const handleGoogleToken = async (googleAccessToken: string) => {
  const response = await fetch(`${apiUrl}/api/auth/google/mobile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: googleAccessToken }),
  });
  const { access_token } = await response.json();
  await api.setToken(access_token);
  const userData = await api.getMe();
  setUser(userData);
};
```

**AuthContext provides:**
- `user` - Current user object
- `isLoading` - Loading state
- `isAuthenticated` - Boolean auth status
- `signIn()` - Trigger Google OAuth
- `signOut()` - Clear session
- `refreshUser()` - Reload user data
- `devSignIn()` - Dev-only login

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
| `app/(tabs)/explore.tsx` | `/explore` |
| `app/(tabs)/history.tsx` | `/history` |
| `app/(tabs)/settings.tsx` | `/settings` |
| `app/name/[id].tsx` | `/name/:id` |
| `app/invite/[code].tsx` | `/invite/:code` |
| `app/explore/[origin].tsx` | `/explore/:origin` |
| `app/popular.tsx` | `/popular` |

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

  // Auth methods
  async getMe(): Promise<User>
  async exchangeCodeForToken(code: string): Promise<{ access_token: string }>
  async logout(): Promise<void>

  // User methods
  async updateUser(data: { display_name?, family_name? }): Promise<User>
  async deleteUser(): Promise<void>
  async getPartner(): Promise<Partner | null>

  // Invite methods
  async createInvite(invited_email?): Promise<Invite>
  async getInvite(code): Promise<InviteDetail>
  async acceptInvite(code): Promise<void>

  // Name methods
  async getNames(limit?): Promise<Name[]>
  async getNameDetails(nameId): Promise<Name>
  async searchNames(query, limit?): Promise<Name[]>
  async getNamesByOrigin(origin, limit?, offset?): Promise<Name[]>
  async getPopularNames(gender?, limit?): Promise<Name[]>
  async getSimilarNames(nameId, limit?, minSimilarity?, gender?): Promise<Name[]>
  async getNamesForSwiping(limit?): Promise<NameWithSimilar[]>
  async getNameFacts(nameId): Promise<NameFacts>
  async getPopularityByRegion(nameId): Promise<RegionPopularity[]>
  async getCountries(): Promise<Country[]>
  async getOrigins(): Promise<Origin[]>

  // Custom names
  async createCustomName(data: { name, gender }): Promise<CustomName>
  async getCustomNames(): Promise<CustomName[]>
  async deleteCustomName(id): Promise<void>

  // Swipes
  async createSwipe(name_id, action): Promise<SwipeResult>
  async createBatchSwipes(swipes): Promise<BatchSwipeResult>
  async getSwipes(action?, limit?, offset?): Promise<Swipe[]>
  async getSwipeCounts(): Promise<{ likes, dismisses }>
  async checkSwipeStatus(nameId): Promise<{ action: 'like' | 'dismiss' | null }>
  async updateSwipe(name_id, action): Promise<SwipeResult>
  async deleteSwipe(name_id): Promise<void>

  // Matches
  async getMatches(limit?, offset?): Promise<Match[]>
  async getCloseCalls(limit?, minSimilarity?): Promise<CloseCall[]>

  // Preferences
  async getPreferences(): Promise<Preferences>
  async updatePreferences(data): Promise<Preferences>
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

### Theme Context

Handles light/dark/system theme switching with persistence:

```typescript
// contexts/ThemeContext.tsx
type ThemeMode = 'light' | 'dark' | 'system';

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const systemColorScheme = useColorScheme();

  // Load persisted theme on mount
  useEffect(() => {
    AsyncStorage.getItem('app_theme').then((saved) => {
      if (saved) setThemeMode(saved as ThemeMode);
    });
  }, []);

  // Persist theme changes
  const updateTheme = async (mode: ThemeMode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('app_theme', mode);
  };

  // Resolve effective color scheme
  const effectiveColorScheme = themeMode === 'system'
    ? systemColorScheme
    : themeMode;

  return (
    <ThemeContext.Provider value={{ themeMode, effectiveColorScheme, setTheme: updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Usage
const { themeMode, effectiveColorScheme, setTheme } = useTheme();
```

---

## Components

### SwipeCard

Swipeable name card with gesture handling:

```typescript
// components/SwipeCard.tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

const SWIPE_THRESHOLD = 100;      // Distance threshold
const VELOCITY_THRESHOLD = 500;   // Velocity threshold (px/s)

export function SwipeCard({ name, onSwipe }) {
  const gesture = Gesture.Pan()
    .onEnd((event) => {
      const swipedRight = event.translationX > SWIPE_THRESHOLD ||
                          event.velocityX > VELOCITY_THRESHOLD;
      const swipedLeft = event.translationX < -SWIPE_THRESHOLD ||
                         event.velocityX < -VELOCITY_THRESHOLD;

      if (swipedRight) {
        onSwipe('like');
      } else if (swipedLeft) {
        onSwipe('dismiss');
      }
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        {/* Card content with name, gender icon, origin */}
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

### CreateNameModal

Modal for adding custom names to the pool:

```typescript
// components/CreateNameModal.tsx
export function CreateNameModal({ visible, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'U'>('U');

  const handleSubmit = async () => {
    await api.createCustomName({ name, gender });
    onSubmit();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TextInput value={name} onChangeText={setName} placeholder="Enter name" />
      <GenderSelector value={gender} onChange={setGender} />
      <Button title="Add Name" onPress={handleSubmit} />
    </Modal>
  );
}
```

---

## Utility Libraries

### Gender Display (lib/genderUtils.ts)

Utilities for consistent gender display across the app:

```typescript
type Gender = 'M' | 'F' | 'U';

// Get gender symbol
getGenderIcon(gender: Gender): string
  // 'M' → '♂', 'F' → '♀', 'U' → '◎'

// Get gender color
getGenderColor(gender: Gender, colors): string
  // 'M' → blue, 'F' → pink, 'U' → purple

// Get human-readable label
getGenderLabel(gender: Gender): string
  // 'M' → 'Boy', 'F' → 'Girl', 'U' → 'Unisex'
```

### Country Utilities (lib/countries.ts)

Maps origin names to country flags:

```typescript
// Convert origin name to flag emoji
getOriginFlag(origin: string): string
  // 'Italian' → '🇮🇹'
  // 'Spanish' → '🇪🇸'
  // 'Japanese' → '🇯🇵'

// Covers 100+ origins with ISO country code mappings
```

### Region Definitions (lib/regions.ts)

Organizes origins into geographic regions:

```typescript
const regions = [
  { name: 'Europe', emoji: '🇪🇺', origins: ['Italian', 'Spanish', ...] },
  { name: 'Americas', emoji: '🌎', origins: ['American', 'Mexican', ...] },
  { name: 'Asia & Oceania', emoji: '🌏', origins: ['Japanese', 'Chinese', ...] },
  { name: 'Middle East & Africa', emoji: '🌍', origins: ['Arabic', 'Hebrew', ...] },
];
```

---

## TypeScript Types

All types are defined in `types/index.ts`:

| Type | Description |
|------|-------------|
| `User` | Current user profile (id, email, display_name, avatar_url, couple_id) |
| `Partner` | Partner in couple (id, display_name, avatar_url) |
| `Invite` | Invite object (code, status, expires_at) |
| `InviteDetail` | Invite with inviter info |
| `Name` | Name record (name, gender, meaning, countries, popularity_rank) |
| `SimilarName` | Related name with similarity score |
| `NameWithSimilar` | Name with array of similar names |
| `Country` | Country with name count |
| `Origin` | Name origin (Italian, Spanish, etc.) with count |
| `Swipe` | User swipe action (like/dismiss) |
| `SwipeResult` | Result with match boolean |
| `BatchSwipeResult` | Batch result with matches array |
| `Match` | Mutually liked name with matched_at date |
| `CloseCall` | Near-match (you liked A, partner liked similar B) |
| `Preferences` | User filter preferences (origins, genders, letters) |
| `RegionPopularity` | Popularity stats by country |
| `NameFacts` | Historical/cultural facts about a name |
| `CustomName` | User-created custom name |

**Helper function:**

```typescript
// Format popularity rank as readable percentage
formatPopularityAsPercentage(rank: number): string
  // 50 → 'Top 0.1%'
  // 500 → 'Top 5%'
  // 5000 → 'Top 50%'
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
