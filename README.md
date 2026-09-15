# 3S Gym Mobile

Customer-facing native app built with Expo, React Native and Expo Router.

## Run locally

```bash
npm install
copy .env.example .env
npm start
```

For a physical device, set `EXPO_PUBLIC_API_URL` to the backend address reachable from the same network, for example:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3008
```

The app currently supports customer login, journey overview, workouts, nutrition plans, progress/InBody data, schedule, in-app notifications and profile/logout. Data is read from the existing `/api` endpoints and the JWT is stored in Expo SecureStore.

## Checks

```bash
npm run typecheck
npm run lint
```

## Build with EAS

```bash
npx eas build --platform android --profile preview
npx eas build --platform ios --profile preview
```

Customer write actions, device-token push notifications and offline mutation queues are intentionally left for the next backend/mobile phase.
