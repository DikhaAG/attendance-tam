"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { confirmMissedCheckout } from "@/app/action/attendance.action";
import type { MissedCheckoutDay } from "@/lib/missed-checkout";
import { missedCheckoutTimeError } from "@/lib/work-schedule";

/**
 * Dialog pemblokir: muncul kalau ada hari sebelumnya yang sudah absen masuk
 * tapi belum absen pulang. Tidak bisa ditutup tanpa memutuskan — server juga
 * menolak absen masuk baru selama masih ada hari yang menggantung.
 *
 * Karyawan cukup menekan "Otomatis pukul HH:mm" (Jam Pulang Hari Kerja hari
 * itu, mis. Sabtu 14:00) tanpa memilih jam sendiri; memilih jam manual tetap
 * tersedia kalau pulangnya memang berbeda. Judul menyebut hari yang
 * dikonfirmasi dan jam masuknya ditampilkan, supaya karyawan tidak mengira
 * yang diminta adalah jam saat ini. Jam harus sesudah jam masuk — aturan yang
 * sama (`missedCheckoutTimeError`) dicek lagi di server sebagai penentu.
 */
export default function MissedCheckoutDialog({
  days,
}: {
  days: MissedCheckoutDay[];
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState(false);
  /** null = belum diubah, ikut jam otomatis hari yang sedang dikonfirmasi. */
  const [pickedTime, setPickedTime] = useState<string | null>(null);

  const current = days[0];

  if (!current) return null;

  const busy = saving || refreshing;
  const time = pickedTime ?? current.autoCheckOutTime;
  // Jam otomatis bisa jatuh sebelum jam masuk (mis. masuk di hari libur
  // sesudah Jam Pulang) — kalau begitu karyawan wajib memilih jam sendiri.
  const autoError = missedCheckoutTimeError(
    current.autoCheckOutTime,
    current.checkInTime,
  );
  const showCustom = custom || autoError !== null;
  const timeError = time
    ? missedCheckoutTimeError(time, current.checkInTime)
    : null;

  async function confirm(chosenTime: string) {
    if (!current) return;

    setSaving(true);

    // `time` kosong = server memakai Jam Pulang Hari Kerja tanggal itu.
    const result = await confirmMissedCheckout({
      workDate: current.workDate,
      time: chosenTime,
    });

    setSaving(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(result.message);
    setCustom(false);
    setPickedTime(null);
    startRefresh(() => router.refresh());
  }

  return (
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Absen pulang hari {current.dayLabel}</DialogTitle>
          <DialogDescription>
            Kamu absen masuk pukul {current.checkInTime} tapi belum absen pulang
            hari itu. Isi jam pulang hari {current.dayLabel}, bukan jam
            sekarang, sebelum absen masuk hari ini.
            {days.length > 1 && ` (${days.length} hari belum dikonfirmasi)`}
          </DialogDescription>
        </DialogHeader>

        {showCustom && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="missed-checkout-time">
              Jam pulang hari {current.dayLabel}
            </Label>
            <Input
              id="missed-checkout-time"
              type="time"
              value={time}
              onChange={(event) => setPickedTime(event.target.value)}
              disabled={busy}
              aria-invalid={timeError !== null}
              aria-describedby="missed-checkout-time-hint"
            />
            <p
              id="missed-checkout-time-hint"
              className={
                timeError
                  ? "text-destructive text-sm"
                  : "text-muted-foreground text-sm"
              }
            >
              {timeError ?? `Jam masuk ${current.checkInTime}`}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:flex-col sm:space-x-0">
          {showCustom ? (
            <Button
              type="button"
              disabled={busy || !time || timeError !== null}
              onClick={() => void confirm(time)}
            >
              {busy && <Spinner />}
              Konfirmasi pulang {time}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={busy}
              onClick={() => void confirm("")}
            >
              {busy && <Spinner />}
              Otomatis pukul {current.autoCheckOutTime}
            </Button>
          )}

          {autoError === null && (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setCustom((value) => !value)}
            >
              {custom ? "Pakai otomatis saja" : "Pilih jam sendiri"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
