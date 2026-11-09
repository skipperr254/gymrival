import fs from "fs";
import path from "path";
import { Routes } from "@/constants/routes";
import { notificationRoute } from "@/lib/notificationRoute";

describe("notificationRoute", () => {
  it("message: opens the chat when the sender is known, else the inbox", () => {
    expect(notificationRoute("new_message", {}, "user-2")).toBe(Routes.chat("user-2"));
    expect(notificationRoute("new_message", {}, null)).toBe(Routes.socialMessages);
    expect(notificationRoute("new_message", undefined)).toBe(Routes.socialMessages);
  });

  it.each(["friend_request", "friend_request_accepted"])("%s → friends", (type) => {
    expect(notificationRoute(type, {}, "user-2")).toBe(Routes.socialFriends);
  });

  it.each(["pr_liked", "friend_pr"])("%s → social feed", (type) => {
    expect(notificationRoute(type, {}, "user-2")).toBe(Routes.social);
  });

  it("challenge won: the challenge when its id is a string, else Compete", () => {
    expect(notificationRoute("challenge_won", { challenge_id: "c1" })).toBe(Routes.challengeDetail("c1"));
    expect(notificationRoute("challenge_won", {})).toBe(Routes.compete);
    expect(notificationRoute("challenge_won", { challenge_id: 42 })).toBe(Routes.compete);
  });

  it("unknown or missing types go nowhere", () => {
    expect(notificationRoute("something_new", {})).toBeNull();
    expect(notificationRoute(undefined, undefined)).toBeNull();
  });

  it("every NotificationType has a destination", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "types", "notification.ts"), "utf8");
    const union = src.match(/export type NotificationType =([^;]+);/)![1];
    const types = [...union.matchAll(/'(\w+)'/g)].map((m) => m[1]);
    expect(types.length).toBeGreaterThan(0);
    for (const type of types) {
      expect({ type, route: notificationRoute(type, { challenge_id: "c1" }, "user-2") }).not.toEqual({
        type,
        route: null,
      });
    }
  });
});
