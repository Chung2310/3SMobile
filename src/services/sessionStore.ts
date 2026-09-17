import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { Session, User } from '@/types/domain';

const TOKEN_KEY = '3s-gym.token';
const REFRESH_TOKEN_KEY = '3s-gym.refreshToken';
const USER_KEY = '3s-gym.user';

export async function getStoredSession(): Promise<Session | null> {
  try {
    const [token, userRaw] = await Promise.all([
      SecureStore.getItemAsync(TOKEN_KEY),
      AsyncStorage.getItem(USER_KEY),
    ]);

    if (!token || !userRaw) return null;

    const user = JSON.parse(userRaw) as User;
    if (!user?.id) return null;

    const refreshToken = (await SecureStore.getItemAsync(REFRESH_TOKEN_KEY)) ?? undefined;

    return { token, refreshToken, user };
  } catch {
    return null;
  }
}

export async function saveSession(session: Session): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, session.token),
    session.refreshToken
      ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken)
      : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user)),
  ]);
}

export async function clearStoredSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}
