import { describe, expect, it } from "vitest";

import {
  getWorkDayFor,
  isCheckInClosed,
  isLateAt,
  isNonWorkingDate,
  lateMinutesAt,
  summarizeWeek,
  type WorkDayConfig,
} from "@/lib/work-schedule";

/**
 * Hari Kerja yang berlaku sekarang (Sabtu pulang lebih awal):
 * Senin–Jumat 08:00–17:00, Sabtu 08:00–14:00, Minggu libur.
 */
const WEEK_WITH_SHORT_SATURDAY: WorkDayConfig[] = [
  { dayOfWeek: 0, isWorkingDay: false, checkInTime: "08:00", checkOutTime: "17:00" },
  { dayOfWeek: 1, isWorkingDay: true, checkInTime: "08:00", checkOutTime: "17:00" },
  { dayOfWeek: 2, isWorkingDay: true, checkInTime: "08:00", checkOutTime: "17:00" },
  { dayOfWeek: 3, isWorkingDay: true, checkInTime: "08:00", checkOutTime: "17:00" },
  { dayOfWeek: 4, isWorkingDay: true, checkInTime: "08:00", checkOutTime: "17:00" },
  { dayOfWeek: 5, isWorkingDay: true, checkInTime: "08:00", checkOutTime: "17:00" },
  { dayOfWeek: 6, isWorkingDay: true, checkInTime: "08:00", checkOutTime: "14:00" },
];

const TOLERANCE_MINUTES = 15;

/** Tanggal kerja disimpan sebagai kolom `date` (tengah malam UTC). */
const SATURDAY = new Date("2026-11-14T00:00:00Z");
const SUNDAY = new Date("2026-11-15T00:00:00Z");
const MONDAY = new Date("2026-11-16T00:00:00Z");

const at = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const dayOf = (date: Date) => getWorkDayFor(date, WEEK_WITH_SHORT_SATURDAY);

describe("jadwal per tanggal", () => {
  it("Sabtu pulang 14:00, Senin pulang 17:00", () => {
    expect(dayOf(SATURDAY).checkOutTime).toBe("14:00");
    expect(dayOf(MONDAY).checkOutTime).toBe("17:00");
  });

  it("Minggu libur, Sabtu dan Senin hari kerja", () => {
    expect(isNonWorkingDate(SUNDAY, WEEK_WITH_SHORT_SATURDAY)).toBe(true);
    expect(isNonWorkingDate(SATURDAY, WEEK_WITH_SHORT_SATURDAY)).toBe(false);
    expect(isNonWorkingDate(MONDAY, WEEK_WITH_SHORT_SATURDAY)).toBe(false);
  });

  it("tabel WorkDay kosong jatuh ke default Senin–Jumat 08:00–17:00", () => {
    expect(getWorkDayFor(MONDAY, []).checkOutTime).toBe("17:00");
    expect(isNonWorkingDate(SATURDAY, [])).toBe(true);
  });
});

describe("terlambat (toleransi 15 menit)", () => {
  it("absen masuk tepat di batas toleransi belum terlambat", () => {
    expect(isLateAt(at("08:15"), dayOf(MONDAY), TOLERANCE_MINUTES)).toBe(false);
  });

  it("lewat satu menit dari batas toleransi terlambat", () => {
    expect(isLateAt(at("08:16"), dayOf(MONDAY), TOLERANCE_MINUTES)).toBe(true);
    expect(isLateAt(at("08:16"), dayOf(SATURDAY), TOLERANCE_MINUTES)).toBe(true);
  });

  it("hari libur tidak pernah terlambat", () => {
    expect(isLateAt(at("13:00"), dayOf(SUNDAY), TOLERANCE_MINUTES)).toBe(false);
  });

  it("menit keterlambatan dihitung dari jam masuk, tanpa toleransi", () => {
    expect(lateMinutesAt(at("08:10"), dayOf(MONDAY))).toBe(10);
    expect(lateMinutesAt(at("07:50"), dayOf(MONDAY))).toBe(0);
  });

  it("hari libur tidak punya menit keterlambatan", () => {
    expect(lateMinutesAt(at("09:00"), dayOf(SUNDAY))).toBe(0);
  });
});

describe("absen masuk ditutup begitu lewat jam pulang", () => {
  it("Sabtu ditutup mulai 14:00", () => {
    expect(isCheckInClosed(at("13:59"), dayOf(SATURDAY))).toBe(false);
    expect(isCheckInClosed(at("14:00"), dayOf(SATURDAY))).toBe(true);
  });

  it("Senin 14:00 masih terbuka, ditutup mulai 17:00", () => {
    expect(isCheckInClosed(at("14:00"), dayOf(MONDAY))).toBe(false);
    expect(isCheckInClosed(at("17:00"), dayOf(MONDAY))).toBe(true);
  });
});

describe("ringkasan minggu", () => {
  it("Sabtu pulang lebih awal: 6 hari kerja, 51 jam, Senin–Jumat digabung", () => {
    expect(summarizeWeek(WEEK_WITH_SHORT_SATURDAY)).toEqual({
      workingDays: 6,
      totalMinutes: 5 * 9 * 60 + 6 * 60,
      totalLabel: "51j",
      scheduleLabel: "Senin–Jumat 08:00 – 17:00 · Sabtu 08:00 – 14:00",
    });
  });

  it("tanpa hari kerja sama sekali", () => {
    const allOff = WEEK_WITH_SHORT_SATURDAY.map((day) => ({ ...day, isWorkingDay: false }));

    expect(summarizeWeek(allOff)).toMatchObject({
      workingDays: 0,
      totalLabel: "0j",
      scheduleLabel: "Belum ada hari kerja",
    });
  });
});
