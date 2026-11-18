import prisma from "@/lib/prisma";
import {
  AttendanceApproval,
  LeaveStage,
  LeaveStatus,
  OvertimeStage,
  Prisma,
  Role,
} from "@/generated/prisma";
import {
  canReviewRequest,
  canViewRequest,
  getApprovalScope,
  type ApprovalScope,
  type RoutingReviewer,
  type RoutingTarget,
} from "@/lib/approval-routing";

/**
 * Filter Prisma untuk pengajuan izin pending sesuai cakupan reviewer.
 */
export function buildLeaveWhereForScope(
  scope: ApprovalScope,
): Prisma.LeaveRequestWhereInput {
  switch (scope.kind) {
    case "none":
      return { id: "__none__" };
    case "all":
      return { status: LeaveStatus.PENDING, stage: LeaveStage.SUPERVISOR };
    case "division":
      return {
        status: LeaveStatus.PENDING,
        stage: LeaveStage.SUPERVISOR,
        OR: [
          { user: { jobPosition: { divisionId: scope.divisionId } } },
          { user: { positionId: null } },
        ],
      };
    case "manager":
      if (scope.orphanDivisionIds.length === 0) {
        return { status: LeaveStatus.PENDING, stage: LeaveStage.MANAGER };
      }
      return {
        status: LeaveStatus.PENDING,
        OR: [
          { stage: LeaveStage.MANAGER },
          {
            stage: LeaveStage.SUPERVISOR,
            user: {
              jobPosition: { divisionId: { in: scope.orphanDivisionIds } },
            },
          },
        ],
      };
  }
}

/**
 * Filter Prisma untuk pengajuan lembur pending sesuai cakupan reviewer.
 */
export function buildOvertimeWhereForScope(
  scope: ApprovalScope,
): Prisma.OvertimeWhereInput {
  switch (scope.kind) {
    case "none":
      return { id: "__none__" };
    case "all":
      return {
        status: AttendanceApproval.PENDING,
        stage: OvertimeStage.SUPERVISOR,
      };
    case "division":
      return {
        status: AttendanceApproval.PENDING,
        stage: OvertimeStage.SUPERVISOR,
        OR: [
          { user: { jobPosition: { divisionId: scope.divisionId } } },
          { user: { positionId: null } },
        ],
      };
    case "manager":
      if (scope.orphanDivisionIds.length === 0) {
        return {
          status: AttendanceApproval.PENDING,
          stage: OvertimeStage.MANAGER,
        };
      }
      return {
        status: AttendanceApproval.PENDING,
        OR: [
          { stage: OvertimeStage.MANAGER },
          {
            stage: OvertimeStage.SUPERVISOR,
            user: {
              jobPosition: { divisionId: { in: scope.orphanDivisionIds } },
            },
          },
        ],
      };
  }
}

/**
 * Filter Prisma untuk daftar pengajuan izin yang boleh dilihat seorang viewer di desktop
 * (termasuk riwayat yang sudah selesai).
 */
export function buildLeaveWhereForViewer(viewer: {
  divisionId?: string | null;
}): Prisma.LeaveRequestWhereInput {
  if (!viewer.divisionId) {
    return {};
  }
  return {
    OR: [
      { user: { jobPosition: { divisionId: viewer.divisionId } } },
      { user: { positionId: null } },
    ],
  };
}

/**
 * Filter Prisma untuk daftar pengajuan lembur yang boleh dilihat seorang viewer di desktop
 * (termasuk riwayat yang sudah selesai).
 */
export function buildOvertimeWhereForViewer(viewer: {
  divisionId?: string | null;
}): Prisma.OvertimeWhereInput {
  if (!viewer.divisionId) {
    return {};
  }
  return {
    OR: [
      { user: { jobPosition: { divisionId: viewer.divisionId } } },
      { user: { positionId: null } },
    ],
  };
}

export const ApprovalRoutingService = {
  /**
   * Menemukan divisionId untuk user (dibaca dari Jabatannya, ADR 0001).
   */
  async getUserDivisionId(user: {
    id?: string;
    positionId?: string | null;
  }): Promise<string | null> {
    if (user.positionId === null) return null;

    if (user.positionId) {
      const position = await prisma.position.findUnique({
        where: { id: user.positionId },
        select: { divisionId: true },
      });
      return position?.divisionId ?? null;
    }

    if (user.id) {
      const u = await prisma.user.findUnique({
        where: { id: user.id },
        select: { jobPosition: { select: { divisionId: true } } },
      });
      return u?.jobPosition?.divisionId ?? null;
    }

    return null;
  },

  /**
   * Himpunan id Divisi yang punya Supervisor Divisi aktif.
   */
  async getActiveSupervisorDivisionIds(): Promise<Set<string>> {
    const supervisors = await prisma.user.findMany({
      where: {
        role: Role.SUPERVISOR,
        isActive: true,
        positionId: { not: null },
      },
      select: {
        jobPosition: { select: { divisionId: true } },
      },
    });

    const divisionIds = new Set<string>();
    for (const spv of supervisors) {
      if (spv.jobPosition?.divisionId) {
        divisionIds.add(spv.jobPosition.divisionId);
      }
    }
    return divisionIds;
  },

  /**
   * Semua id Divisi yang ada di sistem.
   */
  async getAllDivisionIds(): Promise<string[]> {
    const divisions = await prisma.division.findMany({
      select: { id: true },
    });
    return divisions.map((d) => d.id);
  },

  /**
   * Mendapatkan cakupan persetujuan untuk reviewer tertentu.
   */
  async getScopeForReviewer(user: {
    id?: string;
    role: Role | string;
    positionId?: string | null;
  }): Promise<ApprovalScope> {
    const isManager = user.role === Role.MANAGER || user.role === "MANAGER";

    const [divisionId, allDivisionIds, activeSupervisorDivisionIds] =
      await Promise.all([
        this.getUserDivisionId(user),
        isManager ? this.getAllDivisionIds() : Promise.resolve([]),
        isManager ? this.getActiveSupervisorDivisionIds() : Promise.resolve(new Set<string>()),
      ]);

    return getApprovalScope({
      reviewer: { role: user.role, divisionId },
      allDivisionIds,
      activeSupervisorDivisionIds,
    });
  },

  /**
   * Cek apakah reviewer berhak memutuskan pengajuan target.
   */
  async canReview(params: {
    reviewer: {
      id?: string;
      role: Role | string;
      positionId?: string | null;
    };
    target: {
      requesterRole?: Role | string;
      requesterDivisionId?: string | null;
      requesterPositionId?: string | null;
      stage: string;
    };
  }): Promise<boolean> {
    const isManager =
      params.reviewer.role === Role.MANAGER ||
      params.reviewer.role === "MANAGER";

    const [reviewerDivisionId, activeSupervisorDivisionIds] = await Promise.all([
      this.getUserDivisionId(params.reviewer),
      isManager ? this.getActiveSupervisorDivisionIds() : Promise.resolve(new Set<string>()),
    ]);

    let requesterDivisionId = params.target.requesterDivisionId;
    if (
      requesterDivisionId === undefined &&
      params.target.requesterPositionId !== undefined
    ) {
      requesterDivisionId = await this.getUserDivisionId({
        positionId: params.target.requesterPositionId,
      });
    }

    const reviewer: RoutingReviewer = {
      role: params.reviewer.role,
      divisionId: reviewerDivisionId,
    };

    const target: RoutingTarget = {
      requesterRole: params.target.requesterRole,
      requesterDivisionId,
      stage: params.target.stage,
    };

    return canReviewRequest({
      reviewer,
      target,
      activeSupervisorDivisionIds,
    });
  },

  /**
   * Helper ringkas untuk memeriksa hak review pengajuan izin (menghindari data clump).
   */
  async canReviewLeave(
    reviewer: { id?: string; role: Role | string; positionId?: string | null },
    leave: {
      stage: string;
      user: {
        role: Role | string;
        positionId?: string | null;
        jobPosition?: { divisionId?: string | null } | null;
      };
    },
  ): Promise<boolean> {
    return this.canReview({
      reviewer,
      target: {
        requesterRole: leave.user.role,
        requesterDivisionId: leave.user.jobPosition?.divisionId ?? null,
        requesterPositionId: leave.user.positionId,
        stage: leave.stage,
      },
    });
  },

  /**
   * Helper ringkas untuk memeriksa hak review pengajuan lembur (menghindari data clump).
   */
  async canReviewOvertime(
    reviewer: { id?: string; role: Role | string; positionId?: string | null },
    overtime: {
      stage: string;
      user: {
        role: Role | string;
        positionId?: string | null;
        jobPosition?: { divisionId?: string | null } | null;
      };
    },
  ): Promise<boolean> {
    return this.canReview({
      reviewer,
      target: {
        requesterRole: overtime.user.role,
        requesterDivisionId: overtime.user.jobPosition?.divisionId ?? null,
        requesterPositionId: overtime.user.positionId,
        stage: overtime.stage,
      },
    });
  },

  /**
   * Cek apakah viewer boleh melihat detail suatu pengajuan di halaman desktop.
   */
  async canView(
    viewer: {
      role: Role | string;
      positionId?: string | null;
    },
    requester: {
      positionId?: string | null;
      jobPosition?: { divisionId?: string | null } | null;
    },
  ): Promise<boolean> {
    const [viewerDivisionId, requesterDivisionId] = await Promise.all([
      this.getUserDivisionId(viewer),
      requester.jobPosition?.divisionId !== undefined
        ? requester.jobPosition?.divisionId
        : requester.positionId
          ? this.getUserDivisionId({ positionId: requester.positionId })
          : null,
    ]);

    return canViewRequest({
      viewer: { role: viewer.role, divisionId: viewerDivisionId },
      requesterDivisionId,
    });
  },
};
