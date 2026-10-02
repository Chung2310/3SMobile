import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import type { Session, User } from '@/types/domain';

const TOKEN_KEY = '3s-gym.token';
const REFRESH_TOKEN_KEY = '3s-gym.refreshToken';
const USER_KEY = '3s-gym.user';

let writes: Promise<unknown> = Promise.resolve();
const listeners = new Set<(session: Session | null) => void>();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = writes.then(work, work);
  writes = result.catch(() => undefined);
  return result;
}
export function subscribeSession(listener: (session: Session | null) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export async function getStoredSession(): Promise<Session | null> {
  await writes;
  return readSession();
}
async function readSession(): Promise<Session | null> {
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

async function writeSession(session: Session): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, session.token),
    session.refreshToken
      ? SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken)
      : SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.setItem(USER_KEY, JSON.stringify(session.user)),
  ]);
  for (const listener of listeners) listener(session);
}

export function saveSession(session: Session): Promise<void> {
  return serial(() => writeSession(session));
}
export function updateSessionIfCurrent(token: string, update: (session: Session) => Session): Promise<Session | null> {
  return serial(async () => {
    const current = await readSession();
    if (!current || current.token !== token) return null;
    const updated = update(current);
    await writeSession(updated);
    return updated;
  });
}
export function clearStoredSession(expectedToken?: string): Promise<void> {
  return serial(async () => {
  if (expectedToken && (await readSession())?.token !== expectedToken) return;
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
  for (const listener of listeners) listener(null);
  });
}
