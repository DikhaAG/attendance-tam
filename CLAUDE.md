# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

Scripts live in `package.json`. Before committing, run `npm run check`: the same
gate CI runs (Prisma schema + migrations, lint, typecheck, Vitest unit and integration
tests). For offline or sandboxed checks without a local Postgres, run `npm run check:unit`.
Production migrations: `npx prisma migrate deploy`.

**Running the app** (dev server, seed, parity loop) needs `.env`: copy
`.env.example`, then fill `DATABASE_URL` (local Postgres) and the Clerk dev keys
(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`). Prisma CLI reads only
`.env`, never `.env.local`. Check for `.env` when a task starts; when it is
missing, say so up front and name the done-criteria (visual checks, parity) that
will stay unverified.

## Architecture

Sistem absensi karyawan (MVP, ~30 karyawan): absen masuk/pulang dengan foto +
verifikasi wajah + GPS, absen luar kantor (Approval Absensi) yang butuh
approval admin, penugasan dinas luar (`FieldAssignment`) yang direncanakan
supervisor & disetujui admin, pengajuan izin/cuti, dan rekap untuk admin.
Tidak ada WFH — tidak diperbolehkan di sistem ini.
Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind v4, Prisma 7 + PostgreSQL,
Clerk (email+password), TanStack Query + Table, shadcn/ui.

### Route groups

- `app/(auth)/` — `/login` (redirect ke dashboard sesuai role kalau sudah login)
- `app/(employee)/` — `/dashboard`, `/riwayat`, `/izin` — butuh session role `EMPLOYEE`
- `app/(admin)/` — `/admin/dashboard`, `/admin/kehadiran`, `/admin/daftar-pekerja` (data master pekerja + buat akun), `/admin/rekapan-kehadiran` (rekap kehadiran, dulu bernama `/admin/rekapan-karyawan`), `/admin/izin`, `/admin/verifikasi`, `/admin/laporan`, `/admin/lokasi`, `/admin/waktu-kerja`, `/admin/hari-libur` — butuh session role `ADMIN`
- `app/(account)/` — `/profil` — cukup `requireUser()`, dipakai kedua role
- `app/action/` — Next.js Server Actions (semua file `"use server"`)
- `app/api/images/[filename]/` — serve foto absensi dari `uploads/images/` di disk
- `app/api/laporan/` — download rekap absensi CSV (cek role ADMIN sendiri, balas 403 bukan redirect)

`proxy.ts` (Next 16 menggantikan `middleware.ts`) hanya memastikan sudah login
(Clerk); redirect berdasarkan role dilakukan `requireRole()` di tiap layout.

### Server-side layers

```
app/action/          ← Server Actions: validate input → call Service → revalidatePath
servers/validators/  ← Zod schemas + DTO types (naming: CODING_STANDARDS.md)
servers/services/    ← DB access via Prisma (XService.list / getById / create / update / delete)
lib/prisma.ts        ← singleton PrismaClient (uses PrismaPg adapter)
```

Actions import validators and services. Services import from `lib/prisma`. Nothing else should touch Prisma directly.

Helper domain (dipakai action, bukan service):

Setiap modul `lib/` otomatis dijaga bebas Prisma/DB/Clerk oleh `no-restricted-imports`
di `eslint.config.mjs`; modul yang memang butuh Prisma masuk daftar `ignores` di sana.
Uji modul aturan lewat `lib/**/*.test.ts` (`npm test`); aturan yang hidup di DB
(transaksi, FK, sinkron kolom) lewat `servers/**/*.int.test.ts` (`npm run test:int`).

- `lib/geo.ts` — `haversineDistance()` (meter) + `formatDistance()`. Bebas Prisma, jadi
  `AttendanceDialog` ikut memakainya di client untuk tahu lebih awal kalau absennya di luar radius.
- `lib/date.ts` — semua konversi timezone: `getWorkDate()`, `getMinutesOfDay()`, `parseTimeToMinutes()`, `formatTime()`, `formatWorkDate()`, `workDateTimeToUtc()` (tanggal kerja + "HH:mm" → timestamp UTC, dipakai pencatatan absensi manual admin)
- `lib/leave.ts` — label & varian badge untuk `LeaveType`/`LeaveStatus` + `countLeaveDays()`
- `lib/csv.ts` — `toCsv()` (pemisah `;` + BOM UTF-8 supaya rapi di Excel id-ID)
- `lib/work-schedule.ts` — hari kerja mingguan: `getWorkDayFor()`, `isNonWorkingDate()`,
  `isLateAt()`, `summarizeWeek()`, `orderWeek()`, `DAY_LABEL`. Bebas Prisma supaya bisa dipakai form client juga.
  `isLateAt()` adalah satu-satunya definisi "terlambat" — dipakai absen langsung maupun koreksi.
- `lib/holiday.ts` — hari libur tanggalan: `findHoliday()`, `indexHolidays()`, label & varian badge.
  Bebas Prisma, seperti `work-schedule.ts`.
- `lib/work-mode.ts` — label, varian badge, dan penjelasan untuk `WorkMode` + `AttendanceApproval`,
  `APPROVAL_MODES` (mode final yang boleh dipilih admin saat menyetujui — karyawan sendiri
  tidak memilih mode apa pun), dan `isLateEligible()`. Bebas Prisma seperti `work-schedule.ts`.
- `lib/storage.ts` — `saveImage()` (foto absensi, gambar saja) dan `saveAttachment()`
  (lampiran izin, gambar + PDF). `MAX_SIZE` di sini harus selaras dengan
  `experimental.serverActions.bodySizeLimit` di `next.config.ts`.
- `lib/division.ts` — struktur organisasi: `buildDivisionTree()`, `isDivisionSupervisor()`, `canHavePosition()`, `normalizePositionId()`.
- `lib/approval-routing.ts` — aturan routing pengajuan saat review: `canReviewRequest()`, `isTurnToReview()`, `canViewRequest()`, `getApprovalScope()`.

`lib/daily-recap.ts` — `buildDailyRecap()` + `countRecapStatus()`: rekap satu hari
(satu baris per karyawan aktif), dipakai bersama `/admin/dashboard` dan `/admin/kehadiran`.

`servers/services/report.service.ts` menyusun rekap per karyawan per hari
(`buildRecap()`), dipakai bersama oleh halaman `/admin/laporan`, endpoint CSV, dan
halaman karyawan supaya angka di layar dan di file selalu sama. `buildRecap()`
sendiri yang menentukan status `LIBUR` (pola mingguan `WorkDay` + tabel `Holiday`)
dan `missingCheckOut` — konsumennya tinggal memakai hasilnya.

**Aturan absensi & rekap** (klasifikasi `RecapStatus`, approval absen luar radius,
penambahan/koreksi admin, akurasi GPS, absen pulang, absensi menggantung): baca
`docs/attendance-rules.md` sebelum menyentuh absensi, rekap, atau approval.

Format tanggal/jam selalu dilakukan di server lalu dikirim ke client sebagai string,
supaya timezone tidak bergeser mengikuti perangkat karyawan.

### Prisma

The client is generated to `generated/prisma/` (not the default location). Always import types and the client from `@/generated/prisma`, not from `@prisma/client`:

```ts
import { Prisma, Role } from "@/generated/prisma";
import prisma from "@/lib/prisma"; // or: import { prisma } from "@/lib/prisma"
```

Run `npm run db:generate` after any schema change. Migrations live in `prisma/migrations/`. Prisma config (`prisma.config.ts`) sets `schema`, `migrations.path`, and `migrations.seed`.

### Domain models

- **User** — profil/role aplikasi (`email`, `role` `EMPLOYEE`/`ADMIN`, `isActive`); identitas & password sepenuhnya di Clerk, dihubungkan lewat `clerkId` (unik)
- **OfficeLocation** — titik kantor (lat/long) + `radiusMeters`; dipakai untuk validasi jarak (haversine)
- **WorkSchedule** — kebijakan global: `lateToleranceMinutes` (satu baris aktif)
- **WorkDay** — selalu 7 baris, `dayOfWeek` unik (0 = Minggu … 6 = Sabtu, sama dengan `Date#getUTCDay()`) + `isWorkingDay` + jam masuk/pulang (`"HH:mm"`). Menentukan `isLate` dan hari libur — tidak ada lagi asumsi Sabtu/Minggu di kode
- **Attendance** — satu baris per `CHECK_IN`/`CHECK_OUT`; unik per (`userId`, `workDate`, `type`) supaya tidak dobel; simpan foto, koordinat, `distanceMeters`, `isWithinRadius`, `isLate`, `workMode`, `workModeDetail`, `approvalStatus`, `approvedMode`. `photoUrl` / `latitude` / `longitude` / `isWithinRadius` **nullable** — absensi yang dicatat manual (`isManual`) memang tidak punya foto & GPS, jadi jangan perlakukan null sebagai "di luar radius". Jejak admin: `createdByAdminId` (ditambahkan admin), `editedById`/`editedAt`/`originalTimestamp`/`editNote` (jam dikoreksi admin). `Overtime` punya jejak koreksi yang sama (`editedById`, `originalStartAt`, `originalEndAt`, `editNote`)
- **LeaveRequest** — pengajuan izin/sakit/cuti; status `PENDING` → `APPROVED`/`REJECTED` beserta `reviewedBy` / `reviewedAt` / `reviewNote`. Satu-satunya jalur untuk `SAKIT`/`IZIN`/`CUTI`
- **Holiday** — tanggal merah, cuti bersama, dan libur internal (`date` unik). Melengkapi `WorkDay` yang hanya mengatur pola mingguan

`servers/services/notification.service.ts` menghitung angka merah di sidebar
(`NotificationService.forUser()`), dipanggil sekali di `DashboardShell` supaya
ketiga layout tidak menghitungnya sendiri-sendiri. Isinya sengaja hanya hal yang
perlu ditindak orang yang sedang login: antrean Admin (semua antrean), Supervisor
(izin & lembur anggota divisi yang dipimpin), dan Manager (seluruh organisasi +
divisi yatim). Karyawan tidak punya antrean review, jadi badge-nya kosong.

`workDate`, `startDate`, dan `endDate` disimpan sebagai kolom `date` (tanpa jam) dan dihitung
memakai timezone `APP_TIMEZONE` (default `Asia/Jakarta`).

### Auth

Clerk (email + password only — sign-up dimatikan di Clerk Dashboard, akun karyawan
cuma bisa dibuat admin lewat `/admin/daftar-pekerja/baru`). Prisma `User` tidak
menyimpan password sama sekali; identitas & kredensial sepenuhnya di Clerk,
dihubungkan lewat `User.clerkId`.

```
proxy.ts         ← clerkMiddleware: cuma jamin sudah login, redirect ke /login kalau belum
lib/session.ts   ← DAL: getCurrentUser / requireUser / requireRole — auth() dari Clerk untuk
                   identitas, lalu role & isActive tetap dicek ulang ke Prisma tiap request
lib/role.ts      ← defaultRouteForRole()
app/(auth)/account-disabled/page.tsx ← sesi Clerk valid tapi user tidak ada/nonaktif di DB:
                   cabut sesi Clerk (client) lalu lempar ke /login, supaya tidak loop redirect
components/auth/LoginForm.tsx        ← useSignIn() dari @clerk/nextjs/legacy (custom UI, bukan <SignIn/> bawaan)
app/action/user.action.ts            ← createEmployee/updateEmployee/setEmployeeActive
                                        juga memanggil Clerk Backend API (clerkClient().users)
                                        supaya akun Clerk & baris Prisma selalu sinkron
```

Layout `(employee)` dan `(admin)` memanggil `requireRole()`, jadi user yang dinonaktifkan
(di-ban di Clerk **dan** `isActive=false` di Prisma) langsung kehilangan akses walau
sesi Clerk-nya masih valid. Ganti password dilakukan client-side lewat
`user.updatePassword()` (Clerk memverifikasi password lama sendiri) — tidak ada
server action untuk itu.

### Components

- `components/ui/` — shadcn/ui primitives (radix-ui based); do not edit these manually, use the `shadcn` CLI
- `components/dashboard/` — shared dashboard pieces: `DataTable`, `TablePagination`, `TableSorter`, `SearchDataTable`, `DashboardSidebar`, `Navbar`, `PageHeader`
- `components/auth/` — login form dan layout pieces
- `components/admin/LocationMap.tsx` — peta Leaflet + OpenStreetMap (pin bisa digeser, lingkaran radius). Leaflet menyentuh `window` saat modul dimuat, jadi selalu diimpor lewat `next/dynamic` dengan `ssr: false`
- Form pekerja: `CreateEmployeeForm` (baru) & `EditEmployeeAccountForm` (edit) di `components/admin/`, aksi di `app/action/user.action.ts`

### Providers

`providers/Providers.tsx` wraps the app in `QueryClientProvider` → `ThemeProvider` (next-themes, default dark). Both are client components.

### Styling

Tailwind v4 (PostCSS plugin). Use `cn()` from `lib/utils.ts` (clsx + tailwind-merge) for conditional classes.

## Mobile-parity project

The `md:hidden` (<768px) web tree is a clone of the sibling Expo app
`../mobile-tam`. Before touching `components/mobile/` or any `md:hidden` markup,
read `MOBILE_PARITY.md` §0: hard rules, RN → web conversions, and the mandatory
visual-verification loop.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
