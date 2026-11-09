import { Colors, withAlpha } from "@/constants/theme";

describe("withAlpha", () => {
  it("converts a hex token to rgba at the given opacity", () => {
    expect(withAlpha(Colors.accent, 0.1)).toBe("rgba(230, 48, 48, 0.1)");
    expect(withAlpha(Colors.black, 0.6)).toBe("rgba(0, 0, 0, 0.6)");
  });

  it("matches the old hex-alpha suffix it replaced (#rrggbb + '33')", () => {
    expect(withAlpha(Colors.friend, 0.2)).toBe("rgba(74, 158, 255, 0.2)");
  });
});
