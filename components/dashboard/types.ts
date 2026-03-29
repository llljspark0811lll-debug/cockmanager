export type DashboardTab =
  | "members"
  | "requests"
  | "fees"
  | "sessions"
  | "attendance"
  | "deleted";

export interface Fee {
  id: number;
  year: number;
  month: number;
  paid: boolean;
}

export interface Member {
  id: number;
  name: string;
  gender: string;
  birth: string | Date | null;
  phone: string;
  level: string;
  createdAt: string | Date;
  deletedAt?: string | Date | null;
  note: string;
  customFieldValue: string;
  deleted?: boolean;
  fees: Fee[];
}

export interface MemberRequest {
  id: number;
  name: string;
  gender: string;
  birth: string | Date | null;
  phone: string;
  level: string;
  customFieldValue: string;
  note: string;
  createdAt: string | Date;
}

export interface SpecialFeePayment {
  id: number;
  paid: boolean;
  paidAt: string | Date | null;
  note: string;
  createdAt: string | Date;
  memberId: number;
  specialFeeId: number;
  member: Member;
}

export interface SpecialFee {
  id: number;
  title: string;
  amount: number;
  description: string;
  dueDate: string | Date | null;
  createdAt: string | Date;
  payments: SpecialFeePayment[];
}

export interface SessionParticipant {
  id: number;
  sessionId: number;
  status: "REGISTERED" | "WAITLIST" | "CANCELED";
  attendanceStatus: "PENDING" | "PRESENT" | "ABSENT" | "LATE";
  checkedInAt: string | Date | null;
  createdAt: string | Date;
  memberId: number | null;
  guestName: string | null;
  hostMemberId: number | null;
  member: Member | null;
  hostMember: Member | null;
}

export interface ClubSession {
  id: number;
  title: string;
  description: string;
  location: string;
  publicToken: string;
  date: string | Date;
  startTime: string;
  endTime: string;
  capacity: number | null;
  status: "OPEN" | "CLOSED" | "CANCELED";
  createdAt: string | Date;
  participants: SessionParticipant[];
}

export interface ClubInfo {
  id: number;
  name: string;
  publicJoinToken: string;
  calculatedStatus: "TRIAL" | "ACTIVE" | "BLOCKED" | "EXPIRED";
  subscriptionEnd?: string | Date | null;
  customFieldLabel: string;
  adminEmail: string;
}

export interface MemberFormState {
  name: string;
  gender: string;
  birth: string;
  phone: string;
  level: string;
  customFieldValue: string;
  note: string;
}
