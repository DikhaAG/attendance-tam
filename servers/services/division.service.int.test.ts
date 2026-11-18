import { describe, expect, it } from "vitest";

import { Role } from "@/generated/prisma";
import { DivisionService } from "@/servers/services/division.service";
import { UserService } from "@/servers/services/user.service";

let clerkSeq = 0;

const createUser = (name: string, extra: { role?: Role; position?: string } = {}) =>
  UserService.create({
    clerkId: `user_test_${++clerkSeq}`,
    name,
    email: `${name.toLowerCase().replace(/\s+/g, ".")}@test.local`,
    ...extra,
  });

async function teknisDivision() {
  const division = await DivisionService.createDivision({ name: "Teknis" });
  const teknisi = await DivisionService.createPosition({
    name: "Teknisi",
    divisionId: division.id,
  });
  return { division, teknisi };
}

const positionText = async (userId: string) =>
  (await UserService.getById(userId))?.position;

describe("kolom teks jabatan mengikuti Jabatan (dibaca mobile 1.1.0)", () => {
  it("memberi Jabatan menyalin namanya ke kolom teks", async () => {
    const { teknisi } = await teknisDivision();
    const harry = await createUser("Harry", { position: "teknisi lama" });

    await DivisionService.assignPosition({ userId: harry.id, positionId: teknisi.id });

    expect(await positionText(harry.id)).toBe("Teknisi");
  });

  it("mengganti nama Jabatan memperbarui semua pemegangnya, bukan orang lain", async () => {
    const { teknisi } = await teknisDivision();
    const harry = await createUser("Harry");
    const hery = await createUser("Hery");
    const reza = await createUser("Reza", {
      role: Role.MANAGER,
      position: "Business Development Manager",
    });
    await DivisionService.assignPosition({ userId: harry.id, positionId: teknisi.id });
    await DivisionService.assignPosition({ userId: hery.id, positionId: teknisi.id });

    await DivisionService.renamePosition(teknisi.id, { name: "Teknisi Lapangan" });

    expect(await positionText(harry.id)).toBe("Teknisi Lapangan");
    expect(await positionText(hery.id)).toBe("Teknisi Lapangan");
    expect(await positionText(reza.id)).toBe("Business Development Manager");
  });

  it("mengosongkan Jabatan membiarkan kolom teks apa adanya", async () => {
    const { teknisi } = await teknisDivision();
    const harry = await createUser("Harry");
    await DivisionService.assignPosition({ userId: harry.id, positionId: teknisi.id });

    await DivisionService.assignPosition({ userId: harry.id, positionId: null });

    const user = await UserService.getById(harry.id);
    expect(user?.positionId).toBeNull();
    expect(user?.position).toBe("Teknisi");
  });
});

describe("hapus hanya kalau kosong", () => {
  it("Jabatan yang masih dipegang (termasuk akun nonaktif) tidak bisa dihapus", async () => {
    const { teknisi } = await teknisDivision();
    const mantan = await createUser("Mantan Teknisi");
    await DivisionService.assignPosition({ userId: mantan.id, positionId: teknisi.id });
    await UserService.setActive(mantan.id, false);

    expect(await DivisionService.deletePosition(teknisi.id)).toEqual({
      deleted: false,
      blockers: 1,
    });
  });

  it("Divisi yang masih punya Jabatan tidak bisa dihapus", async () => {
    const { division } = await teknisDivision();

    expect(await DivisionService.deleteDivision(division.id)).toEqual({
      deleted: false,
      blockers: 1,
    });
  });

  it("Jabatan dan Divisi yang sudah kosong bisa dihapus", async () => {
    const { division, teknisi } = await teknisDivision();

    expect(await DivisionService.deletePosition(teknisi.id)).toEqual({ deleted: true });
    expect(await DivisionService.deleteDivision(division.id)).toEqual({ deleted: true });
  });
});
