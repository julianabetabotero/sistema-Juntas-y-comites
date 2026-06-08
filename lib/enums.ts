// Valores válidos para los campos que en PostgreSQL serían enums.
// En SQLite se guardan como String; aquí centralizamos los literales y
// helpers de validación para usarlos con Zod y en el código.

export const GlobalRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  MEMBER: "MEMBER",
} as const;
export type GlobalRole = (typeof GlobalRole)[keyof typeof GlobalRole];

export const CommitteeType = {
  BOARD_OF_DIRECTORS: "BOARD_OF_DIRECTORS",
  COMMITTEE: "COMMITTEE",
  ASSEMBLY: "ASSEMBLY",
} as const;
export type CommitteeType = (typeof CommitteeType)[keyof typeof CommitteeType];

export const CommitteeTypeLabel: Record<CommitteeType, string> = {
  BOARD_OF_DIRECTORS: "Junta Directiva",
  COMMITTEE: "Comité",
  ASSEMBLY: "Asamblea",
};

export const CommitteeRole = {
  PRESIDENT: "PRESIDENT",
  SECRETARY: "SECRETARY",
  MEMBER: "MEMBER",
  AUDITOR: "AUDITOR",
} as const;
export type CommitteeRole = (typeof CommitteeRole)[keyof typeof CommitteeRole];

export const CommitteeRoleLabel: Record<CommitteeRole, string> = {
  PRESIDENT: "Presidente",
  SECRETARY: "Secretario",
  MEMBER: "Miembro",
  AUDITOR: "Auditor",
};

// Jerarquía para verificación de rol mínimo (mayor número = más permisos)
export const CommitteeRoleRank: Record<CommitteeRole, number> = {
  AUDITOR: 1,
  MEMBER: 1,
  SECRETARY: 2,
  PRESIDENT: 3,
};

export const SessionStatus = {
  DRAFT: "DRAFT",
  CONVENED: "CONVENED",
  IN_PROGRESS: "IN_PROGRESS",
  CLOSED: "CLOSED",
  APPROVED: "APPROVED",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const SessionStatusLabel: Record<SessionStatus, string> = {
  DRAFT: "Borrador",
  CONVENED: "Convocada",
  IN_PROGRESS: "En curso",
  CLOSED: "Cerrada",
  APPROVED: "Aprobada",
};

export const AttendanceStatus = {
  INVITED: "INVITED",
  CONFIRMED: "CONFIRMED",
  ABSENT: "ABSENT",
  EXCUSED: "EXCUSED",
} as const;
export type AttendanceStatus =
  (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const MinutesStatus = {
  DRAFT: "DRAFT",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
} as const;
export type MinutesStatus = (typeof MinutesStatus)[keyof typeof MinutesStatus];

export const VoteStatus = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;
export type VoteStatus = (typeof VoteStatus)[keyof typeof VoteStatus];

export const VoteValue = {
  YES: "YES",
  NO: "NO",
  ABSTAIN: "ABSTAIN",
} as const;
export type VoteValue = (typeof VoteValue)[keyof typeof VoteValue];

export const VoteValueLabel: Record<VoteValue, string> = {
  YES: "Sí",
  NO: "No",
  ABSTAIN: "Abstención",
};
