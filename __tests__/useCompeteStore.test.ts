/**
 * Behaviour tests for useCompeteStore: leaderboards (Rivals, Global) and
 * challenges behind the Compete tab. They pin the store's public shape and
 * its ordering guards: a slow response must never overwrite a newer one, and
 * a "load more" page must never be appended onto a different search's rows.
 */

type Handler = (payload: Record<string, unknown>) => unknown;
const mockChannels: { name: string; handlers: Handler[] }[] = [];

jest.mock("@/lib/supabase", () => ({
  supabase: {
    channel: jest.fn((name: string) => {
      const entry = { name, handlers: [] as Handler[] };
      mockChannels.push(entry);
      const ch = {
        on: (_t: string, _cfg: unknown, handler: Handler) => {
          entry.handlers.push(handler);
          return ch;
        },
        subscribe: () => ch,
      };
      return ch;
    }),
    removeChannel: jest.fn(),
  },
}));

jest.mock("@/lib/i18n", () => ({ __esModule: true, default: { language: "nl" } }));

jest.mock("@/lib/api", () => ({
  fetchExerciseTypes: jest.fn(),
  fetchRivalsLeaderboard: jest.fn(),
  fetchGlobalLeaderboard: jest.fn(),
  fetchMyGlobalRank: jest.fn(),
  fetchActiveChallenges: jest.fn(),
  fetchChallengeLeaderboard: jest.fn(),
  joinChallenge: jest.fn(),
  leaveChallenge: jest.fn(),
  createFriendChallenge: jest.fn(),
  fetchPendingInvitations: jest.fn(),
  respondToInvitation: jest.fn(),
  createAdminChallenge: jest.fn(),
  fetchAdminCreatedChallenges: jest.fn(),
  cancelChallenge: jest.fn(),
}));

import * as api from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useCompeteStore } from "@/store/useCompeteStore";

const mocked = api as jest.Mocked<typeof api>;
const ME = "me";

/** A promise you resolve by hand, to control response order. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

const entries = (n: number, prefix = "u") =>
  Array.from({ length: n }, (_, i) => ({ user_id: `${prefix}${i}` }));

beforeEach(() => {
  jest.clearAllMocks();
  mockChannels.length = 0;
  useCompeteStore.getState().reset();
});

describe("public shape", () => {
  it("exposes the same state keys, initial values and actions", () => {
    const s = useCompeteStore.getState();
    const values: Record<string, unknown> = {};
    const actions: string[] = [];
    for (const [k, v] of Object.entries(s)) {
      if (typeof v === "function") actions.push(k);
      else values[k] = v;
    }
    expect(values).toEqual({
      exercises: [], selectedExercise: "bench", loadingExercises: false,
      rivals: [], loadingRivals: false,
      globalEntries: [], myGlobalRank: null, loadingGlobal: false, loadingMyRank: false,
      globalHasMore: true, globalOffset: 0, globalError: null, myRankError: null,
      challenges: [], loadingChallenges: false, challengesError: null,
      leaderboards: {}, loadingLeaderboard: {}, leaderboardErrors: {},
      pendingInvitations: [], loadingInvitations: false, invitationsError: null,
      myAdminChallenges: [], loadingMyAdminChallenges: false, myAdminChallengesError: null,
      error: null,
    });
    expect(actions.sort()).toEqual(
      [
        "loadExercises", "loadRivals", "setSelectedExercise",
        "loadGlobalLeaderboard", "loadMoreGlobal", "loadMyGlobalRank",
        "loadChallenges", "loadLeaderboard", "joinChallenge", "leaveChallenge",
        "createFriendChallenge", "loadPendingInvitations", "respondToInvitation",
        "loadMyAdminChallenges", "adminCreateChallenge", "cancelChallenge",
        "subscribeToChallengeEvents", "subscribeToInvitationEvents", "reset",
      ].sort()
    );
  });
});

describe("leaderboards", () => {
  it("loadExercises fetches once and then uses the cached list", async () => {
    mocked.fetchExerciseTypes.mockResolvedValue({ data: [{ key: "bench" }], error: null } as never);
    await useCompeteStore.getState().loadExercises();
    await useCompeteStore.getState().loadExercises();
    expect(mocked.fetchExerciseTypes).toHaveBeenCalledTimes(1);
  });

  it("a slow Rivals response can't overwrite a newer exercise's results", async () => {
    const slow = deferred<unknown>();
    mocked.fetchRivalsLeaderboard
      .mockReturnValueOnce(slow.promise as never)
      .mockResolvedValueOnce({ data: [{ user_id: "squat-rival" }], error: null } as never);

    const first = useCompeteStore.getState().setSelectedExercise("bench", ME);
    await useCompeteStore.getState().setSelectedExercise("squat", ME);
    slow.resolve({ data: [{ user_id: "bench-rival" }], error: null });
    await first;

    expect(mocked.fetchRivalsLeaderboard).toHaveBeenLastCalledWith(ME, "squat");
    expect(useCompeteStore.getState().rivals).toEqual([{ user_id: "squat-rival" }]);
    expect(useCompeteStore.getState().selectedExercise).toBe("squat");
  });

  it("loadMoreGlobal appends a page and advances the offset", async () => {
    mocked.fetchGlobalLeaderboard
      .mockResolvedValueOnce({ data: entries(50), error: null } as never)
      .mockResolvedValueOnce({ data: entries(3, "p2-"), error: null } as never);
    await useCompeteStore.getState().loadGlobalLeaderboard(ME);
    expect(useCompeteStore.getState().globalHasMore).toBe(true);
    await useCompeteStore.getState().loadMoreGlobal(ME);
    expect(mocked.fetchGlobalLeaderboard).toHaveBeenLastCalledWith(ME, "", 50, 50);
    const s = useCompeteStore.getState();
    expect(s.globalEntries).toHaveLength(53);
    expect(s.globalOffset).toBe(53);
    expect(s.globalHasMore).toBe(false);
  });

  it("drops a 'load more' page that lands after a new search started", async () => {
    useCompeteStore.setState({ globalEntries: entries(50) as never, globalOffset: 50, globalHasMore: true });
    const slowPage = deferred<unknown>();
    mocked.fetchGlobalLeaderboard.mockReturnValueOnce(slowPage.promise as never);
    const more = useCompeteStore.getState().loadMoreGlobal(ME, "");

    // A new search starts; loadingGlobal is true, so force past the guard
    // the way a fresh search does (it doesn't check loadingGlobal).
    mocked.fetchGlobalLeaderboard.mockResolvedValueOnce({ data: entries(2, "anna-"), error: null } as never);
    await useCompeteStore.getState().loadGlobalLeaderboard(ME, "anna");
    slowPage.resolve({ data: entries(50, "stale-"), error: null });
    await more;

    expect(useCompeteStore.getState().globalEntries).toEqual(entries(2, "anna-"));
  });
});

describe("challenges", () => {
  it("loadChallenges asks for the current language", async () => {
    mocked.fetchActiveChallenges.mockResolvedValueOnce({ data: [], error: null } as never);
    await useCompeteStore.getState().loadChallenges(ME);
    expect(mocked.fetchActiveChallenges).toHaveBeenCalledWith(ME, "nl");
  });

  it("loadLeaderboard keeps the previous rows when a refetch fails", async () => {
    useCompeteStore.setState({ leaderboards: { c1: [{ user_id: "a" }] as never } });
    mocked.fetchChallengeLeaderboard.mockResolvedValueOnce({ data: [], error: "net" } as never);
    await useCompeteStore.getState().loadLeaderboard("c1", ME);
    const s = useCompeteStore.getState();
    expect(s.leaderboards.c1).toEqual([{ user_id: "a" }]);
    expect(s.leaderboardErrors.c1).toBe("net");
    expect(s.loadingLeaderboard.c1).toBe(false);
  });

  it("joinChallenge marks it joined and reloads its leaderboard", async () => {
    useCompeteStore.setState({ challenges: [{ id: "c1", is_joined: false, participant_count: 2 }] as never });
    mocked.joinChallenge.mockResolvedValueOnce({ error: null } as never);
    mocked.fetchChallengeLeaderboard.mockResolvedValueOnce({ data: [], error: null } as never);
    await useCompeteStore.getState().joinChallenge("c1", ME);
    expect(useCompeteStore.getState().challenges[0]).toMatchObject({ is_joined: true, participant_count: 3 });
    expect(mocked.fetchChallengeLeaderboard).toHaveBeenCalledWith("c1", ME);
  });

  it("leaveChallenge clears the user's score and removes them from the board", async () => {
    useCompeteStore.setState({
      challenges: [{ id: "c1", is_joined: true, participant_count: 1, user_score: 5, user_rank: 1 }] as never,
      leaderboards: { c1: [{ user_id: ME }, { user_id: "x" }] as never },
    });
    mocked.leaveChallenge.mockResolvedValueOnce({ error: null } as never);
    const refetch = deferred<unknown>();
    mocked.fetchChallengeLeaderboard.mockReturnValueOnce(refetch.promise as never);
    const leaving = useCompeteStore.getState().leaveChallenge("c1", ME);
    await Promise.resolve();
    await Promise.resolve();
    expect(useCompeteStore.getState().challenges[0]).toMatchObject({
      is_joined: false, participant_count: 0, user_score: null, user_rank: null,
    });
    expect(useCompeteStore.getState().leaderboards.c1).toEqual([{ user_id: "x" }]);
    refetch.resolve({ data: [{ user_id: "x" }], error: null });
    await leaving;
  });

  it("respondToInvitation removes the invite, reloading challenges only on accept", async () => {
    useCompeteStore.setState({ pendingInvitations: [{ id: "i1" }, { id: "i2" }] as never });
    mocked.respondToInvitation.mockResolvedValue({ error: null } as never);
    mocked.fetchActiveChallenges.mockResolvedValue({ data: [], error: null } as never);

    await useCompeteStore.getState().respondToInvitation("i1", "c1", ME, "declined");
    expect(mocked.fetchActiveChallenges).not.toHaveBeenCalled();
    await useCompeteStore.getState().respondToInvitation("i2", "c2", ME, "accepted");
    expect(mocked.fetchActiveChallenges).toHaveBeenCalledTimes(1);
    expect(useCompeteStore.getState().pendingInvitations).toEqual([]);
  });

  it("cancelChallenge reloads the admin's list on success", async () => {
    mocked.cancelChallenge.mockResolvedValueOnce({ error: null } as never);
    mocked.fetchAdminCreatedChallenges.mockResolvedValueOnce({ data: [{ id: "a" }], error: null } as never);
    await useCompeteStore.getState().cancelChallenge("c1", "admin");
    expect(mocked.fetchAdminCreatedChallenges).toHaveBeenCalledWith("admin");
    expect(useCompeteStore.getState().myAdminChallenges).toEqual([{ id: "a" }]);
  });
});

describe("realtime", () => {
  it("any participant change refetches that challenge's leaderboard", async () => {
    mocked.fetchChallengeLeaderboard.mockResolvedValue({ data: [], error: null } as never);
    useCompeteStore.getState().subscribeToChallengeEvents("c1", ME);
    await mockChannels[0].handlers[0]({});
    expect(mocked.fetchChallengeLeaderboard).toHaveBeenCalledWith("c1", ME);
  });

  it("a new invitation reloads pending invitations", async () => {
    mocked.fetchPendingInvitations.mockResolvedValue({ data: [], error: null } as never);
    useCompeteStore.getState().subscribeToInvitationEvents(ME);
    await mockChannels[0].handlers[0]({});
    expect(mocked.fetchPendingInvitations).toHaveBeenCalledWith(ME);
  });

  it("a stale cleanup doesn't tear down a newer subscription; reset removes both", () => {
    const old = useCompeteStore.getState().subscribeToChallengeEvents("c1", ME);
    useCompeteStore.getState().subscribeToChallengeEvents("c2", ME);
    useCompeteStore.getState().subscribeToInvitationEvents(ME);
    (supabase.removeChannel as jest.Mock).mockClear();
    old();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(1);
    useCompeteStore.getState().reset();
    expect(supabase.removeChannel).toHaveBeenCalledTimes(3);
  });
});
