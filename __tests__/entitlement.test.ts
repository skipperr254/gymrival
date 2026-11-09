import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchSubscription } from "@/lib/api/billing";
import { FREE_ENTITLEMENT, isEntitled, type EntitlementSnapshot } from "@/lib/billing/types";
import {
  clearEntitlementCache,
  selectIsPro,
  selectSource,
  useEntitlementStore,
} from "@/store/useEntitlementStore";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
jest.mock("@/lib/api/billing", () => ({
  fetchSubscription: jest.fn(),
  reconcileSubscription: jest.fn(async () => ({ error: null })),
}));

const fetchSub = fetchSubscription as jest.MockedFunction<typeof fetchSubscription>;

const PRO: EntitlementSnapshot = {
  ...FREE_ENTITLEMENT,
  tier: "pro",
  status: "active",
  expiresAt: null,
};
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

const state = () => useEntitlementStore.getState();

beforeEach(async () => {
  state().reset();
  fetchSub.mockReset();
  await AsyncStorage.clear();
});

describe("isEntitled (mirrors public.subscription_is_active)", () => {
  it.each<[string, EntitlementSnapshot | null, boolean]>([
    ["no snapshot", null, false],
    ["free tier", FREE_ENTITLEMENT, false],
    ["pro, never expires (manual grant)", PRO, true],
    ["pro, expires in the future", { ...PRO, expiresAt: future }, true],
    ["pro, already expired by date", { ...PRO, expiresAt: past }, false],
    ["pro, status expired", { ...PRO, status: "expired" }, false],
  ])("%s → %s", (_label, snapshot, expected) => {
    expect(isEntitled(snapshot)).toBe(expected);
  });
});

describe("selectIsPro (union of server, device, cache)", () => {
  it("is free with nothing known", () => {
    expect(selectIsPro(state())).toBe(false);
    expect(selectSource(state())).toBe("none");
  });

  it("server Pro grants", () => {
    useEntitlementStore.setState({ server: PRO, resolved: true });
    expect(selectIsPro(state())).toBe(true);
    expect(selectSource(state())).toBe("server");
  });

  it("device Pro grants while the webhook catches up", () => {
    useEntitlementStore.setState({ server: FREE_ENTITLEMENT, resolved: true, device: PRO });
    expect(selectIsPro(state())).toBe(true);
    expect(selectSource(state())).toBe("device");
  });

  it("cache counts only until the server has answered", () => {
    useEntitlementStore.setState({ cached: PRO, resolved: false });
    expect(selectIsPro(state())).toBe(true);
    useEntitlementStore.setState({ server: FREE_ENTITLEMENT, resolved: true });
    expect(selectIsPro(state())).toBe(false);
  });

  it("the dev override grants in __DEV__ but is never a source", () => {
    state().setDevOverride(true);
    expect(selectIsPro(state())).toBe(true);
    expect(selectSource(state())).toBe("none");
  });
});

describe("setDevOverride", () => {
  it("does nothing outside __DEV__", () => {
    const g = global as unknown as { __DEV__: boolean };
    const was = g.__DEV__;
    g.__DEV__ = false;
    try {
      state().setDevOverride(true);
      expect(state().devOverride).toBe(false);
    } finally {
      g.__DEV__ = was;
    }
  });
});

describe("load / refresh", () => {
  it("replays the cache, then lets the server answer and re-caches", async () => {
    await AsyncStorage.setItem("gymrival:entitlement:u1", JSON.stringify(PRO));
    let resolveFetch!: (v: Awaited<ReturnType<typeof fetchSubscription>>) => void;
    fetchSub.mockReturnValueOnce(new Promise((r) => (resolveFetch = r)));

    const loading = state().load("u1");
    await new Promise((r) => setTimeout(r, 0));
    expect(selectIsPro(state())).toBe(true); // cache speaks first
    expect(selectSource(state())).toBe("cache");

    resolveFetch({ data: FREE_ENTITLEMENT, error: null });
    await loading;
    expect(selectIsPro(state())).toBe(false); // server wins once it answers
    expect(JSON.parse((await AsyncStorage.getItem("gymrival:entitlement:u1"))!)).toEqual(FREE_ENTITLEMENT);
  });

  it("a failed refresh keeps a paying user Pro instead of downgrading", async () => {
    useEntitlementStore.setState({ server: PRO, resolved: true });
    fetchSub.mockResolvedValueOnce({ data: null, error: "offline" });
    await state().refresh("u1");
    expect(selectIsPro(state())).toBe(true);
    expect(state().error).toBe("offline");
  });

  it("clearEntitlementCache removes the persisted tier", async () => {
    await AsyncStorage.setItem("gymrival:entitlement:u1", JSON.stringify(PRO));
    await clearEntitlementCache("u1");
    expect(await AsyncStorage.getItem("gymrival:entitlement:u1")).toBeNull();
  });
});
