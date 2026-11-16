import { describe, expect, test } from "bun:test";
import { formatMoney, parseMoney } from "./money";

describe("parseMoney", () => {
	test("parses pt-BR decimal comma into cents", () => {
		expect(parseMoney("12,50", "pt-BR")).toBe(1250);
	});

	test("parses en decimal point into cents", () => {
		expect(parseMoney("12.50", "en")).toBe(1250);
	});

	test("accepts thousand separators and currency symbol", () => {
		expect(parseMoney("R$ 1.234,56", "pt-BR")).toBe(123456);
		expect(parseMoney("R$1,234.56", "en")).toBe(123456);
	});

	test("accepts whole numbers and one decimal digit", () => {
		expect(parseMoney("7", "pt-BR")).toBe(700);
		expect(parseMoney("7,5", "pt-BR")).toBe(750);
		expect(parseMoney("0,05", "pt-BR")).toBe(5);
	});

	test("avoids float rounding errors", () => {
		expect(parseMoney("0.29", "en")).toBe(29);
		expect(parseMoney("1.15", "en")).toBe(115);
	});

	test("parses negative amounts", () => {
		expect(parseMoney("-3,20", "pt-BR")).toBe(-320);
	});

	test("rejects invalid input", () => {
		for (const bad of [
			"",
			"  ",
			"abc",
			"1,2,3",
			"1,234",
			"12.34,5",
			"1.2.3",
			"--1",
			"1-",
		]) {
			expect(parseMoney(bad, "pt-BR")).toBeNull();
		}
		expect(parseMoney("12,50", "en")).toBeNull();
	});

	test("rejects interior spaces and symbols", () => {
		for (const bad of ["1 2", "1R$2", "1 234 56,7", "R$ - 3,20 -", "-R$ -3"]) {
			expect(parseMoney(bad, "pt-BR")).toBeNull();
		}
		expect(parseMoney(" -R$ 3,20 ", "pt-BR")).toBe(-320);
		expect(parseMoney("R$ -3,20", "pt-BR")).toBe(-320);
	});

	test("rejects amounts beyond safe integer range", () => {
		expect(parseMoney("99999999999999999999", "en")).toBeNull();
	});
});

describe("formatMoney", () => {
	test("formats cents as BRL in pt-BR", () => {
		expect(formatMoney(123456, "pt-BR")).toBe("R$ 1.234,56");
	});

	test("formats cents as BRL in en", () => {
		expect(formatMoney(123456, "en")).toBe("R$1,234.56");
	});

	test("formats small and negative amounts", () => {
		expect(formatMoney(5, "pt-BR")).toBe("R$ 0,05");
		expect(formatMoney(-320, "en")).toBe("-R$3.20");
	});

	test("rejects non-integer cents", () => {
		expect(() => formatMoney(12.5, "en")).toThrow();
	});
});

test("parses its own formatted output back to the same cents", () => {
	for (const locale of ["pt-BR", "en"] as const) {
		for (const cents of [0, 5, 123456, -320]) {
			expect(parseMoney(formatMoney(cents, locale), locale)).toBe(cents);
		}
	}
});
