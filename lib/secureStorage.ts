import "react-native-get-random-values";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as aesjs from "aes-js";

/**
 * Supabase auth storage adapter that keeps session/token data out of plain
 * AsyncStorage. expo-secure-store (iOS Keychain / Android Keystore) has a
 * ~2KB per-item limit that a full Supabase session object can exceed, so the
 * session itself stays in AsyncStorage — but AES-encrypted, with the
 * encryption key (small, fixed-size) held in SecureStore. An attacker with
 * filesystem/backup access to AsyncStorage alone gets ciphertext; the key
 * only lives in the OS-backed secure enclave.
 */
class LargeSecureStore {
  // A fresh random key per write is intentional, not incidental: CTR mode
  // always starts from Counter(1), so reusing one key across two different
  // plaintexts (e.g. two token refreshes) would reuse the same keystream and
  // leak information via a classic two-time-pad XOR — rotating the key is
  // what keeps that safe. The failure mode this couldn't handle was an app
  // kill between the SecureStore key write and the AsyncStorage ciphertext
  // write leaving the two desynced; decrypt() below now degrades that to "no
  // session" instead of throwing, so a desynced write can no longer crash
  // the app (see getSession().catch() in useAuthStore.ts) — it just costs
  // the user a re-login, with no weakening of the encryption itself.
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(32));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));

    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    try {
      const encryptionKeyHex = await SecureStore.getItemAsync(key);
      if (!encryptionKeyHex) return null;

      const cipher = new aesjs.ModeOfOperation.ctr(
        aesjs.utils.hex.toBytes(encryptionKeyHex),
        new aesjs.Counter(1)
      );
      const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));

      return aesjs.utils.utf8.fromBytes(decryptedBytes);
    } catch {
      // Ciphertext doesn't match the key (a pre-existing corrupt entry from
      // before this fix, or any other decrypt failure). Treat it as "no
      // session" instead of throwing so callers like Supabase's getSession()
      // never see an unhandled rejection — and clear the corrupt entry so it
      // doesn't keep failing on every future launch.
      await this.removeItem(key).catch(() => {});
      return null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return null;
    return this.decrypt(key, encrypted);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}

export const secureStorage = new LargeSecureStore();
