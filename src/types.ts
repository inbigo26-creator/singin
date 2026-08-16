export interface Staff {
  id: string;
  code?: string; // 교직원 고유번호 (예: 101, 01, 2026-01)
  name: string;
  department: string;
  position?: string;
  order?: number;
}

export interface Training {
  id: string;
  title: string;
  date: string; // e.g. "2026. 8. 20.(목)"
  location?: string;
  target?: string;
  manager?: string;
  schoolName?: string;
  memo?: string;
  notes?: Record<string, string>; // Mapping staffId/name to note (비고)
  targetStaffIds?: string[]; // IDs of assigned teachers (if empty or undefined, all teachers)
  targetStaff?: Staff[];
  createdAt: string;
  updatedAt: string;
  attendanceCount?: number;
  totalTargetCount?: number;
}

export interface Attendance {
  id: string;
  trainingId: string;
  staffId?: string;
  name: string;
  department?: string;
  position?: string;
  signature: string; // base64 PNG data URL or SVG
  signedAt: string;
  note?: string; // 비고
  deviceInfo?: string;
}

export interface SchoolConfig {
  schoolName: string;
  defaultApprovalLine: string[];
  showApprovalLine: boolean;
}

export interface PrintSettings {
  layoutMode: 'auto' | '1col' | '2col';
  fontSize: 'auto' | 'xs' | 'sm' | 'base';
  showApprovalLine: boolean;
  approvalTitles: string[];
  showSchoolHeader: boolean;
  showMemo: boolean;
  schoolName: string;
}
