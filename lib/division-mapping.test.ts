import { describe, expect, it } from "vitest";

import {
  parseDivisionMapping,
  planDivisionMapping,
  type MappingEntry,
  type MappingUser,
} from "@/lib/division-mapping";

/** User rekaan — bukan data karyawan sungguhan. */
const user = (overrides: Partial<MappingUser> & Pick<MappingUser, "id" | "name">): MappingUser => ({
  email: `${overrides.id}@contoh.test`,
  role: "EMPLOYEE",
  isActive: true,
  position: null,
  positionId: null,
  ...overrides,
});

const entry = (target: MappingUser, jabatan: string): MappingEntry => ({
  userId: target.id,
  email: target.email,
  jabatan,
});

const ana = user({ id: "u_ana", name: "Ana Supervisor", role: "SUPERVISOR" });
const budi = user({ id: "u_budi", name: "Budi Admin" });
const citra = user({ id: "u_citra", name: "Citra Admin", role: "ADMIN" });
const dodi = user({ id: "u_dodi", name: "Dodi Supervisor", role: "SUPERVISOR" });
const eko = user({ id: "u_eko", name: "Eko Teknisi", position: "Teknisi" });
const fajar = user({ id: "u_fajar", name: "Fajar EoS", position: "Teknisi" });
const gita = user({ id: "u_gita", name: "Gita Programmer", position: "Programmer" });
const reza = user({ id: "u_reza", name: "Reza Manager", role: "MANAGER", position: "Business Development Manager" });
const admin = user({ id: "u_root", name: "Administrator", role: "ADMIN" });

const empty = { divisions: [], positions: [] };

describe("rencana pemetaan dari database kosong", () => {
  it("membuat Divisi Admin & Teknis beserta Jabatannya, lalu memetakan user sesuai file", () => {
    const plan = planDivisionMapping({
      ...empty,
      users: [ana, budi, citra, dodi, fajar, gita, reza, admin],
      entries: [
        entry(ana, "Supervisor Admin"),
        entry(budi, "Admin"),
        entry(citra, "Admin"),
        entry(dodi, "Supervisor Teknis"),
        entry(fajar, "Teknisi (EoS)"),
        entry(gita, "Programmer"),
      ],
    });

    expect(plan).toMatchObject({
      ok: true,
      createDivisions: ["Admin", "Teknis"],
      createPositions: [
        { division: "Admin", name: "Supervisor Admin" },
        { division: "Admin", name: "Admin" },
        { division: "Teknis", name: "Supervisor Teknis" },
        { division: "Teknis", name: "Teknisi" },
        { division: "Teknis", name: "Teknisi (EoS)" },
        { division: "Teknis", name: "Programmer" },
      ],
      assignments: [
        { userId: "u_ana", name: "Ana Supervisor", jabatan: "Supervisor Admin", division: "Admin", positionId: null },
        { userId: "u_budi", jabatan: "Admin", division: "Admin" },
        { userId: "u_citra", jabatan: "Admin", division: "Admin" },
        { userId: "u_dodi", jabatan: "Supervisor Teknis", division: "Teknis" },
        { userId: "u_fajar", jabatan: "Teknisi (EoS)", division: "Teknis" },
        { userId: "u_gita", jabatan: "Programmer", division: "Teknis" },
      ],
      skipped: [],
    });
  });
});

describe("aturan teks jabatan \"Teknisi\"", () => {
  it("user aktif berteks persis \"Teknisi\" yang tidak ada di file → Jabatan Teknisi; file tetap menang", () => {
    const harry = user({ id: "u_harry", name: "Harry", position: "Teknisi" });
    const lowercase = user({ id: "u_low", name: "Lowercase", position: "teknisi" });
    const keluar = user({ id: "u_out", name: "Sudah Keluar", position: "Teknisi", isActive: false });

    const plan = planDivisionMapping({
      ...empty,
      users: [eko, fajar, harry, lowercase, keluar],
      entries: [entry(fajar, "Teknisi (EoS)")],
    });

    expect(plan.ok && plan.assignments.map(({ userId, jabatan }) => [userId, jabatan])).toEqual([
      ["u_fajar", "Teknisi (EoS)"],
      ["u_eko", "Teknisi"],
      ["u_harry", "Teknisi"],
    ]);
  });
});

describe("akun yang tidak dipetakan dilaporkan", () => {
  it("user aktif selain Manager yang tidak punya dan tidak akan diberi Jabatan", () => {
    const plan = planDivisionMapping({
      ...empty,
      users: [ana, admin, reza, user({ id: "u_x", name: "Nonaktif", isActive: false })],
      entries: [entry(ana, "Supervisor Admin")],
    });

    expect(plan.ok && plan.unmapped).toEqual([{ userId: "u_root", name: "Administrator" }]);
  });
});

describe("idempoten terhadap pemetaan yang sudah ada", () => {
  const existing = {
    divisions: [
      { id: "d_admin", name: "Admin" },
      { id: "d_teknis", name: "Teknis" },
    ],
    positions: [
      { id: "p_spv_admin", name: "Supervisor Admin", divisionId: "d_admin" },
      { id: "p_admin", name: "Admin", divisionId: "d_admin" },
      { id: "p_spv_teknis", name: "Supervisor Teknis", divisionId: "d_teknis" },
      { id: "p_teknisi", name: "Teknisi", divisionId: "d_teknis" },
      { id: "p_eos", name: "Teknisi (EoS)", divisionId: "d_teknis" },
      { id: "p_programmer", name: "Programmer", divisionId: "d_teknis" },
    ],
  };

  it("struktur yang sudah ada tidak dibuat ulang; user berjabatan sama dilewati", () => {
    const plan = planDivisionMapping({
      ...existing,
      users: [{ ...ana, positionId: "p_spv_admin" }, budi, { ...eko, positionId: "p_teknisi" }],
      entries: [entry(ana, "Supervisor Admin"), entry(budi, "Admin")],
    });

    expect(plan).toMatchObject({
      ok: true,
      createDivisions: [],
      createPositions: [],
      assignments: [{ userId: "u_budi", positionId: "p_admin" }],
      skipped: [
        { userId: "u_ana", positionId: "p_spv_admin" },
        { userId: "u_eko", positionId: "p_teknisi" },
      ],
    });
  });

  it("user yang sudah punya Jabatan berbeda → berhenti", () => {
    const plan = planDivisionMapping({
      ...existing,
      users: [{ ...budi, positionId: "p_programmer" }],
      entries: [entry(budi, "Admin")],
    });

    expect(plan).toEqual({
      ok: false,
      errors: ["Budi Admin (u_budi) sudah memegang Jabatan lain (Programmer · Divisi Teknis), bukan Admin."],
    });
  });

  it("Jabatan yang belum ada di Divisi yang sudah ada tetap dibuat", () => {
    const plan = planDivisionMapping({
      divisions: [{ id: "d_admin", name: "Admin" }],
      positions: [{ id: "p_admin", name: "Admin", divisionId: "d_admin" }],
      users: [],
      entries: [],
    });

    expect(plan).toMatchObject({
      ok: true,
      createDivisions: ["Teknis"],
      createPositions: [
        { division: "Admin", name: "Supervisor Admin" },
        { division: "Teknis", name: "Supervisor Teknis" },
        { division: "Teknis", name: "Teknisi" },
        { division: "Teknis", name: "Teknisi (EoS)" },
        { division: "Teknis", name: "Programmer" },
      ],
    });
  });
});

describe("berhenti total kalau ada yang tidak cocok", () => {
  const errorsFor = (entries: MappingEntry[], users: MappingUser[] = [ana, budi, citra, dodi, eko, reza]) => {
    const plan = planDivisionMapping({ ...empty, users, entries });
    return plan.ok ? [] : plan.errors;
  };

  it.each<[string, MappingEntry, string]>([
    [
      "id tidak ada di database",
      { userId: "u_hilang", email: "hilang@contoh.test", jabatan: "Admin" },
      "Baris u_hilang: user tidak ada di database.",
    ],
    [
      "email tidak sama dengan email user ber-id itu",
      { userId: "u_budi", email: "orang-lain@contoh.test", jabatan: "Admin" },
      "Baris u_budi: email tidak cocok dengan user Budi Admin.",
    ],
    [
      "Jabatan tidak ada di struktur",
      { ...entry(budi, "Kasir") },
      "Baris u_budi: Jabatan \"Kasir\" tidak ada di struktur (Supervisor Admin, Admin, Supervisor Teknis, Teknisi, Teknisi (EoS), Programmer).",
    ],
    [
      "Supervisor Admin bukan Role SUPERVISOR",
      entry(budi, "Supervisor Admin"),
      "Budi Admin (u_budi) ber-Role EMPLOYEE, padahal Supervisor Admin diduga SUPERVISOR.",
    ],
    [
      "Supervisor dipetakan ke Jabatan anggota",
      entry(dodi, "Teknisi"),
      "Dodi Supervisor (u_dodi) ber-Role SUPERVISOR, padahal Teknisi diduga EMPLOYEE.",
    ],
    [
      "Manager tidak punya Jabatan",
      entry(reza, "Admin"),
      "Reza Manager (u_reza) ber-Role MANAGER, padahal Admin diduga EMPLOYEE/ADMIN.",
    ],
  ])("%s", (_, bad, message) => {
    expect(errorsFor([entry(ana, "Supervisor Admin"), bad])).toEqual([message]);
  });

  it("akun nonaktif tidak dipetakan", () => {
    const keluar = user({ id: "u_out", name: "Sudah Keluar", isActive: false });
    expect(errorsFor([entry(keluar, "Admin")], [keluar])).toEqual([
      "Sudah Keluar (u_out) nonaktif — akun nonaktif tidak dipetakan.",
    ]);
  });

  it("user yang sama disebut dua kali", () => {
    expect(errorsFor([entry(budi, "Admin"), entry(budi, "Admin")])).toEqual([
      "Baris u_budi: user disebut lebih dari sekali di file.",
    ]);
  });

  it("aturan teks \"Teknisi\" juga memeriksa Role", () => {
    const spv = user({ id: "u_spv", name: "Supervisor Berteks Teknisi", role: "SUPERVISOR", position: "Teknisi" });
    expect(errorsFor([], [spv])).toEqual([
      "Supervisor Berteks Teknisi (u_spv) ber-Role SUPERVISOR, padahal Teknisi diduga EMPLOYEE.",
    ]);
  });

  it("semua ketidakcocokan dilaporkan sekaligus", () => {
    expect(
      errorsFor([
        { userId: "u_hilang", email: "x@contoh.test", jabatan: "Admin" },
        entry(budi, "Supervisor Teknis"),
      ]),
    ).toHaveLength(2);
  });
});

describe("file pemetaan lokal (CSV atau JSON)", () => {
  const expected = [
    { userId: "u_ana", email: "ana@contoh.test", jabatan: "Supervisor Admin" },
    { userId: "u_fajar", email: "fajar@contoh.test", jabatan: "Teknisi (EoS)" },
  ];

  it("CSV ber-header userId,email,jabatan; baris kosong & komentar # dilewati", () => {
    const csv = [
      "﻿userId,email,jabatan",
      "# Divisi Admin",
      "u_ana, ana@contoh.test ,Supervisor Admin",
      "",
      "u_fajar,fajar@contoh.test,Teknisi (EoS)",
      "",
    ].join("\r\n");

    expect(parseDivisionMapping(csv, "pemetaan-divisi.csv")).toEqual({ ok: true, entries: expected });
  });

  it("JSON berupa array objek", () => {
    expect(parseDivisionMapping(JSON.stringify(expected), "pemetaan-divisi.json")).toEqual({
      ok: true,
      entries: expected,
    });
  });

  it.each<[string, string, string, RegExp]>([
    ["header CSV salah", "id,email,jabatan\nu_ana,a@b,Admin", "x.csv", /header.*userId,email,jabatan/],
    ["kolom CSV kurang", "userId,email,jabatan\nu_ana,a@b", "x.csv", /Baris 2: harus 3 kolom/],
    ["kolom kosong", "userId,email,jabatan\nu_ana,,Admin", "x.csv", /Baris 2: userId, email, dan jabatan wajib diisi/],
    ["JSON rusak", "[{", "x.json", /JSON tidak terbaca/],
    ["JSON bukan array objek lengkap", '[{"userId":"u_ana"}]', "x.json", /Baris 1: userId, email, dan jabatan wajib diisi/],
    ["ekstensi lain", "", "x.txt", /\.csv atau \.json/],
    ["file tanpa baris", "userId,email,jabatan\n", "x.csv", /tidak berisi baris pemetaan/],
  ])("%s → berhenti", (_, content, fileName, message) => {
    const parsed = parseDivisionMapping(content, fileName);
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.errors.join("\n")).toMatch(message);
  });
});
