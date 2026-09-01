import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = 'joinly.idempotency.join.';

// RFC-4122-ish v4. An Idempotency-Key only needs to be unique per join attempt,
// not cryptographically strong, so Math.random is acceptable here.
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

/**
 * One Idempotency-Key per event, reused across retries until the join succeeds
 * (docs/18). A different body under the same key yields 409
 * idempotency_key_conflict, which callers treat as unrecoverable.
 */
export async function getJoinIdempotencyKey(eventId: string): Promise<string> {
  const storageKey = KEY_PREFIX + eventId;
  try {
    const existing = await AsyncStorage.getItem(storageKey);
    if (existing) return existing;
    const fresh = uuidv4();
    await AsyncStorage.setItem(storageKey, fresh);
    return fresh;
  } catch {
    // Storage unavailable: fall back to an in-memory key. Retries within the same
    // session still dedupe because the mutation is not re-created per attempt.
    return uuidv4();
  }
}

export async function clearJoinIdempotencyKey(eventId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY_PREFIX + eventId);
  } catch {
    // ignore
  }
}
