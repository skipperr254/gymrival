import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/store/useAuthStore";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(),
    removeChannel: jest.fn(),
  },
  forceLocalSignOut: jest.fn(),
}));
jest.mock("@/lib/api", () => ({ clearPushToken: jest.fn() }));
// The real module loads the RevenueCat SDK, which does not run under Jest.
jest.mock("@/lib/billing", () => ({
  getBillingProvider: () => ({ signOut: jest.fn(async () => {}) }),
}));
jest.mock("@/lib/i18n", () => ({ __esModule: true, default: { language: "en", t: (k: string) => k } }));

const signUp = supabase.auth.signUp as jest.Mock;

beforeEach(() => signUp.mockReset());

describe("signUp", () => {
  const run = () => useAuthStore.getState().signUp("Sam", "sam@example.com", "password123");

  it("passes the name through as user metadata", async () => {
    signUp.mockResolvedValueOnce({ data: { user: { identities: [{ id: "i1" }] } }, error: null });
    await run();
    expect(signUp).toHaveBeenCalledWith({
      email: "sam@example.com",
      password: "password123",
      options: { data: { full_name: "Sam" } },
    });
  });

  it("succeeds for a new email", async () => {
    signUp.mockResolvedValueOnce({ data: { user: { identities: [{ id: "i1" }] } }, error: null });
    expect(await run()).toEqual({ error: null });
  });

  it("flags an already-registered email (Supabase returns a user with no identities)", async () => {
    signUp.mockResolvedValueOnce({ data: { user: { identities: [] } }, error: null });
    expect(await run()).toEqual({ error: null, emailTaken: true });
  });

  it("returns Supabase's error message", async () => {
    signUp.mockResolvedValueOnce({ data: { user: null }, error: { message: "Password is too weak" } });
    expect(await run()).toEqual({ error: "Password is too weak" });
  });

  it("turns a thrown error into a message instead of rejecting", async () => {
    signUp.mockRejectedValueOnce(new Error("Network request failed"));
    const res = await run();
    expect(res.error).toEqual(expect.any(String));
    expect(res.error).not.toBe("");
  });
});
