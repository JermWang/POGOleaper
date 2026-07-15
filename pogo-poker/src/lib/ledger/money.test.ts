import { describe, expect, it } from "vitest";
import {
  formatBaseUnitsToUsdc,
  formatWeiToEth,
  parseEthToWei,
  parseUsdcToBaseUnits,
  MoneyParseError,
  formatAmountWithSymbol,
} from "./money";

describe("ETH <-> wei", () => {
  it("parses whole and fractional ETH without float error", () => {
    expect(parseEthToWei("1")).toBe(1_000_000_000_000_000_000n);
    expect(parseEthToWei("0.1")).toBe(100_000_000_000_000_000n);
    expect(parseEthToWei("0.000000000000000001")).toBe(1n);
    expect(parseEthToWei("1.5")).toBe(1_500_000_000_000_000_000n);
  });

  it("round-trips", () => {
    expect(formatWeiToEth(1_500_000_000_000_000_000n)).toBe("1.5");
    expect(formatWeiToEth(1n)).toBe("0.000000000000000001");
    expect(formatWeiToEth(1_000_000_000_000_000_000n)).toBe("1");
    expect(formatWeiToEth(0n)).toBe("0");
  });

  it("rejects too many decimals", () => {
    expect(() => parseEthToWei("0.0000000000000000001")).toThrow(
      MoneyParseError,
    );
  });

  it("rejects garbage", () => {
    expect(() => parseEthToWei("abc")).toThrow(MoneyParseError);
    expect(() => parseEthToWei("")).toThrow(MoneyParseError);
    expect(() => parseEthToWei("-1")).toThrow(MoneyParseError);
  });
});

describe("USDC <-> base units", () => {
  it("parses 6-decimal USDC", () => {
    expect(parseUsdcToBaseUnits("1")).toBe(1_000_000n);
    expect(parseUsdcToBaseUnits("25.5")).toBe(25_500_000n);
    expect(parseUsdcToBaseUnits("0.000001")).toBe(1n);
  });

  it("formats base units", () => {
    expect(formatBaseUnitsToUsdc(25_500_000n)).toBe("25.5");
    expect(formatBaseUnitsToUsdc(1_000_000n)).toBe("1");
  });

  it("rejects > 6 decimals", () => {
    expect(() => parseUsdcToBaseUnits("0.0000001")).toThrow(MoneyParseError);
  });
});

describe("display helpers", () => {
  it("adds symbol", () => {
    expect(formatAmountWithSymbol("ETH", 1_500_000_000_000_000_000n)).toBe(
      "1.5 ETH",
    );
    expect(formatAmountWithSymbol("USDC", 25_000_000n)).toBe("25 USDC");
  });
});

describe("no float anywhere", () => {
  it("0.1 + 0.2 style sums are exact via bigint", () => {
    const a = parseEthToWei("0.1");
    const b = parseEthToWei("0.2");
    expect(formatWeiToEth(a + b)).toBe("0.3");
  });
});
