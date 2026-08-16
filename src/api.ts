import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { Training, Attendance, SchoolConfig, Staff } from './types';
import { defaultSampleStaff } from './localStore';

// Collection references
const TRAININGS_COL = 'trainings';
const STAFF_COL = 'staff';
const ATTENDANCES_COL = 'attendances';
const CONFIG_COL = 'config';

const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  schoolName: '인천비즈니스고등학교',
  defaultApprovalLine: ['담당', '부장', '교감', '교장'],
  showApprovalLine: false,
};

// Helper: Ensure initial seed data exists on Firestore if empty
let isStaffSeeded = false;
async function ensureInitialStaffSeeded() {
  if (isStaffSeeded) return;
  try {
    const snap = await getDocs(collection(db, STAFF_COL));
    if (snap.empty) {
      const batch = writeBatch(db);
      defaultSampleStaff.forEach((staff) => {
        const ref = doc(db, STAFF_COL, staff.id);
        batch.set(ref, staff);
      });
      await batch.commit();
    }
    isStaffSeeded = true;
  } catch (err) {
    console.error('Error seeding initial staff into Firestore:', err);
  }
}

// ==================== TRAININGS API ====================

export async function fetchTrainings(): Promise<Training[]> {
  try {
    await ensureInitialStaffSeeded();
    const snap = await getDocs(collection(db, TRAININGS_COL));
    const trainings: Training[] = [];
    snap.forEach((d) => {
      trainings.push({ ...(d.data() as Training), id: d.id });
    });

    return trainings.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } catch (err) {
    console.error('fetchTrainings error:', err);
    return [];
  }
}

export async function fetchTraining(id: string): Promise<{
  training: Training;
  attendances: Attendance[];
  targetStaff: Staff[];
}> {
  try {
    const docRef = doc(db, TRAININGS_COL, id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      throw new Error('연수를 찾을 수 없습니다.');
    }
    const training = { ...(snap.data() as Training), id: snap.id };

    // Fetch attendances for this training
    const attQuery = query(collection(db, ATTENDANCES_COL), where('trainingId', '==', id));
    const attSnap = await getDocs(attQuery);
    const attendances: Attendance[] = [];
    attSnap.forEach((d) => {
      attendances.push({ ...(d.data() as Attendance), id: d.id });
    });

    // Fetch staff
    const allStaff = await fetchStaff();
    let targetStaff: Staff[] = [];
    if (training.targetStaffIds && training.targetStaffIds.length > 0) {
      targetStaff = training.targetStaffIds
        .map((tid) => allStaff.find((s) => s.id === tid))
        .filter((s): s is Staff => !!s);
    } else {
      targetStaff = allStaff;
    }

    return { training, attendances, targetStaff };
  } catch (err) {
    console.error('fetchTraining error:', err);
    throw err;
  }
}

export async function createTraining(data: Partial<Training>): Promise<Training> {
  const now = new Date().toISOString();
  const id = `train-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const config = await fetchSchoolConfig();
  const allStaff = await fetchStaff();

  const newTraining: Training = {
    id,
    title: data.title?.trim() || '새 교직원 연수',
    date: data.date?.trim() || '',
    location: data.location?.trim() || '',
    target: data.target?.trim() || '전 교직원',
    manager: data.manager?.trim() || '',
    schoolName: data.schoolName?.trim() || config.schoolName,
    memo: data.memo?.trim() || '',
    notes: data.notes || {},
    targetStaffIds: data.targetStaffIds || allStaff.map((s) => s.id),
    createdAt: now,
    updatedAt: now,
  };

  const docRef = doc(db, TRAININGS_COL, id);
  await setDoc(docRef, newTraining);
  return newTraining;
}

export async function updateTraining(id: string, data: Partial<Training>): Promise<Training> {
  const docRef = doc(db, TRAININGS_COL, id);
  const updatedAt = new Date().toISOString();
  const updatePayload = {
    ...data,
    updatedAt,
  };
  await setDoc(docRef, updatePayload, { merge: true });

  const updatedSnap = await getDoc(docRef);
  return { ...(updatedSnap.data() as Training), id: updatedSnap.id };
}

export async function updateTrainingNotes(
  trainingId: string,
  notes: Record<string, string>
): Promise<{ success: boolean; notes: Record<string, string> }> {
  const docRef = doc(db, TRAININGS_COL, trainingId);
  const updatedAt = new Date().toISOString();
  await setDoc(docRef, { notes, updatedAt }, { merge: true });
  return { success: true, notes };
}

export async function deleteTraining(id: string): Promise<{ success: boolean; message: string }> {
  // Delete training document
  await deleteDoc(doc(db, TRAININGS_COL, id));

  // Delete all attendances for this training
  try {
    const attQuery = query(collection(db, ATTENDANCES_COL), where('trainingId', '==', id));
    const attSnap = await getDocs(attQuery);
    if (!attSnap.empty) {
      const batch = writeBatch(db);
      attSnap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (err) {
    console.error('Error deleting training attendances:', err);
  }

  return { success: true, message: '연수가 성공적으로 삭제되었습니다.' };
}

// ==================== ATTENDANCES / SIGNATURES API ====================

export async function submitAttendance(
  trainingId: string,
  data: {
    staffId?: string;
    name: string;
    department?: string;
    position?: string;
    signature: string;
    deviceInfo?: string;
  }
): Promise<{ success: boolean; attendance: Attendance; totalAttendees: number }> {
  const now = new Date().toISOString();

  // Find existing attendance for this staff in this training
  let existingId: string | null = null;
  const attQuery = query(collection(db, ATTENDANCES_COL), where('trainingId', '==', trainingId));
  const attSnap = await getDocs(attQuery);

  attSnap.forEach((d) => {
    const att = d.data() as Attendance;
    if (
      (data.staffId && att.staffId === data.staffId) ||
      att.name?.trim().toLowerCase() === data.name.trim().toLowerCase()
    ) {
      existingId = d.id;
    }
  });

  const attendanceId =
    existingId || `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const savedAtt: Attendance = {
    id: attendanceId,
    trainingId,
    staffId: data.staffId,
    name: data.name.trim(),
    department: data.department?.trim() || '',
    position: data.position?.trim() || '',
    signature: data.signature,
    signedAt: now,
    deviceInfo: data.deviceInfo || 'Web Browser',
  };

  await setDoc(doc(db, ATTENDANCES_COL, attendanceId), savedAtt);

  // Recount total attendees
  const countSnap = await getDocs(attQuery);
  const total = countSnap.size;

  return { success: true, attendance: savedAtt, totalAttendees: total };
}

export async function deleteAttendance(
  trainingId: string,
  attendanceId: string
): Promise<{ success: boolean; message: string }> {
  await deleteDoc(doc(db, ATTENDANCES_COL, attendanceId));
  return { success: true, message: '참석자 서명이 삭제되었습니다.' };
}

export async function seedBulkAttendees(
  trainingId: string,
  count?: number
): Promise<{ success: boolean; addedCount: number; totalCount: number }> {
  const { training, attendances, targetStaff } = await fetchTraining(trainingId);
  const unsignedStaff = targetStaff.filter(
    (s) =>
      !attendances.some(
        (a) => a.staffId === s.id || a.name.trim().toLowerCase() === s.name.trim().toLowerCase()
      )
  );

  const targetCount = count ? Math.min(count, unsignedStaff.length) : unsignedStaff.length;
  let added = 0;
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  for (let i = 0; i < targetCount; i++) {
    const staff = unsignedStaff[i];
    const id = `att-gen-${Date.now()}-${i}`;
    const ref = doc(db, ATTENDANCES_COL, id);
    batch.set(ref, {
      id,
      trainingId,
      staffId: staff.id,
      name: staff.name,
      department: staff.department,
      position: staff.position,
      signature: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M${20 + (i % 10)},${25 + (i % 15)} Q${50 + (i % 20)},${10 + (i % 20)} ${90 + (i % 20)},${40 - (i % 10)} T${140 - (i % 10)},${30 + (i % 10)}" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
      signedAt: now,
      deviceInfo: 'Sample Generated',
    });
    added++;
  }

  if (added > 0) {
    await batch.commit();
  }

  const newAttSnap = await getDocs(
    query(collection(db, ATTENDANCES_COL), where('trainingId', '==', trainingId))
  );

  return { success: true, addedCount: added, totalCount: newAttSnap.size };
}

export async function clearAllAttendances(
  trainingId: string
): Promise<{ success: boolean; message: string }> {
  const attQuery = query(collection(db, ATTENDANCES_COL), where('trainingId', '==', trainingId));
  const attSnap = await getDocs(attQuery);
  if (!attSnap.empty) {
    const batch = writeBatch(db);
    attSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return { success: true, message: '모든 서명이 초기화되었습니다.' };
}

// ==================== MASTER STAFF API ====================

export async function fetchStaff(): Promise<Staff[]> {
  try {
    await ensureInitialStaffSeeded();
    const snap = await getDocs(collection(db, STAFF_COL));
    const staffList: Staff[] = [];
    snap.forEach((d) => {
      staffList.push({ ...(d.data() as Staff), id: d.id });
    });

    return staffList.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  } catch (err) {
    console.error('fetchStaff error:', err);
    return defaultSampleStaff;
  }
}

export async function lookupStaff(params: {
  query?: string;
  name?: string;
  code?: string;
}): Promise<{
  query: string;
  count: number;
  isDuplicateName: boolean;
  candidates: Staff[];
}> {
  const allStaff = await fetchStaff();
  const q = (params.query || params.name || params.code || '').trim().toLowerCase();
  let candidates: Staff[] = [];

  if (params.code) {
    candidates = allStaff.filter((s) => s.code?.toLowerCase() === params.code?.toLowerCase());
  } else if (params.name) {
    candidates = allStaff.filter((s) => s.name.toLowerCase() === params.name?.toLowerCase());
  } else if (q) {
    candidates = allStaff.filter((s) => s.code?.toLowerCase() === q);
    if (candidates.length === 0) {
      candidates = allStaff.filter((s) => s.name.toLowerCase() === q);
    }
    if (candidates.length === 0) {
      candidates = allStaff.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.department.toLowerCase().includes(q) ||
          (s.code && s.code.toLowerCase().includes(q))
      );
    }
  } else {
    candidates = allStaff;
  }

  const nameCounts: Record<string, number> = {};
  allStaff.forEach((s) => {
    nameCounts[s.name] = (nameCounts[s.name] || 0) + 1;
  });

  return {
    query: q,
    count: candidates.length,
    isDuplicateName: candidates.some((c) => (nameCounts[c.name] || 0) > 1),
    candidates,
  };
}

export async function createStaff(data: Partial<Staff>): Promise<Staff> {
  const allStaff = await fetchStaff();
  const newStaff: Staff = {
    id: `stf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    code: data.code?.trim() || undefined,
    name: data.name?.trim() || '',
    department: data.department?.trim() || '',
    position: data.position?.trim() || '',
    order: (allStaff.length ? Math.max(...allStaff.map((s) => s.order ?? 0)) : 0) + 1,
  };

  await setDoc(doc(db, STAFF_COL, newStaff.id), newStaff);
  return newStaff;
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
  const docRef = doc(db, STAFF_COL, id);
  await setDoc(docRef, data, { merge: true });
  const updated = await getDoc(docRef);
  return { ...(updated.data() as Staff), id: updated.id };
}

export async function deleteStaff(id: string): Promise<{ success: boolean; message: string }> {
  await deleteDoc(doc(db, STAFF_COL, id));
  return { success: true, message: '교직원이 삭제되었습니다.' };
}

export async function bulkImportStaff(
  staffList: Partial<Staff>[],
  mode: 'replace' | 'append' = 'append'
): Promise<{ success: boolean; count: number; staff: Staff[] }> {
  const allStaff = await fetchStaff();
  const batch = writeBatch(db);

  if (mode === 'replace') {
    // Delete all existing staff
    const snap = await getDocs(collection(db, STAFF_COL));
    snap.forEach((d) => batch.delete(d.ref));
  }

  let startOrder =
    mode === 'replace' ? 1 : (allStaff.length ? Math.max(...allStaff.map((s) => s.order ?? 0)) : 0) + 1;

  const createdStaff: Staff[] = [];
  staffList.forEach((item) => {
    if (!item.name || !item.name.trim()) return;
    const newStaff: Staff = {
      id: `stf-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: item.code?.trim() || undefined,
      name: item.name.trim(),
      department: item.department?.trim() || '교무부',
      position: item.position?.trim() || '',
      order: startOrder++,
    };
    const ref = doc(db, STAFF_COL, newStaff.id);
    batch.set(ref, newStaff);
    createdStaff.push(newStaff);
  });

  await batch.commit();
  const refreshed = await fetchStaff();
  return { success: true, count: createdStaff.length, staff: refreshed };
}

export async function resetSampleStaff(): Promise<{ success: boolean; staff: Staff[] }> {
  const batch = writeBatch(db);
  const snap = await getDocs(collection(db, STAFF_COL));
  snap.forEach((d) => batch.delete(d.ref));

  defaultSampleStaff.forEach((staff) => {
    const ref = doc(db, STAFF_COL, staff.id);
    batch.set(ref, staff);
  });

  await batch.commit();
  const refreshed = await fetchStaff();
  return { success: true, staff: refreshed };
}

// ==================== TEACHER PORTAL API ====================

export interface TeacherTrainingItem {
  id: string;
  title: string;
  date: string;
  location?: string;
  schoolName?: string;
  isSigned: boolean;
  attendance: Attendance | null;
}

export async function fetchTeacherTrainings(
  name?: string,
  staffId?: string
): Promise<{ teacher: Staff; trainings: TeacherTrainingItem[] }> {
  const allStaff = await fetchStaff();
  const allTrainings = await fetchTrainings();
  const config = await fetchSchoolConfig();

  let teacher: Staff | undefined;
  if (staffId) {
    teacher = allStaff.find((s) => s.id === staffId);
  } else if (name) {
    teacher = allStaff.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  }

  if (!teacher) {
    teacher = {
      id: staffId || `stf-temp-${Date.now()}`,
      name: name || '선생님',
      department: '교무부',
      position: '교사',
    };
  }

  // Fetch all attendances for matching
  const attSnap = await getDocs(collection(db, ATTENDANCES_COL));
  const allAttendances: Attendance[] = [];
  attSnap.forEach((d) => allAttendances.push({ ...(d.data() as Attendance), id: d.id }));

  const assignedTrainings = allTrainings.filter((t) => {
    if (!t.targetStaffIds || t.targetStaffIds.length === 0) return true;
    return t.targetStaffIds.includes(teacher!.id);
  });

  const items: TeacherTrainingItem[] = assignedTrainings.map((t) => {
    const attendance =
      allAttendances.find(
        (a) =>
          a.trainingId === t.id &&
          ((teacher!.id && a.staffId === teacher!.id) ||
            a.name.trim().toLowerCase() === teacher!.name.trim().toLowerCase())
      ) || null;

    return {
      id: t.id,
      title: t.title,
      date: t.date,
      location: t.location,
      schoolName: t.schoolName || config.schoolName,
      isSigned: !!attendance,
      attendance,
    };
  });

  return { teacher, trainings: items };
}

// ==================== ADMIN & CONFIG API ====================

export async function verifyAdminPassword(password: string): Promise<{ success: boolean; message: string }> {
  try {
    const authRef = doc(db, CONFIG_COL, 'auth');
    const snap = await getDoc(authRef);
    const expectedPassword = snap.exists() ? snap.data().adminPassword || '1234' : '1234';

    if (password === expectedPassword) {
      return { success: true, message: '인증 성공' };
    }
    throw new Error('비밀번호가 일치하지 않습니다.');
  } catch (err: any) {
    throw new Error(err.message || '비밀번호가 일치하지 않습니다.');
  }
}

export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const authRef = doc(db, CONFIG_COL, 'auth');
  const snap = await getDoc(authRef);
  const expectedPassword = snap.exists() ? snap.data().adminPassword || '1234' : '1234';

  if (currentPassword !== expectedPassword) {
    throw new Error('현재 비밀번호가 일치하지 않습니다.');
  }

  await setDoc(authRef, { adminPassword: newPassword.trim() }, { merge: true });
  return { success: true, message: '관리자 비밀번호가 성공적으로 변경되었습니다.' };
}

export async function fetchSchoolConfig(): Promise<SchoolConfig> {
  try {
    const configRef = doc(db, CONFIG_COL, 'school');
    const snap = await getDoc(configRef);
    if (!snap.exists()) {
      await setDoc(configRef, DEFAULT_SCHOOL_CONFIG);
      return DEFAULT_SCHOOL_CONFIG;
    }
    return { ...DEFAULT_SCHOOL_CONFIG, ...(snap.data() as SchoolConfig) };
  } catch (err) {
    console.error('fetchSchoolConfig error:', err);
    return DEFAULT_SCHOOL_CONFIG;
  }
}

export async function updateSchoolConfig(config: Partial<SchoolConfig>): Promise<SchoolConfig> {
  const configRef = doc(db, CONFIG_COL, 'school');
  await setDoc(configRef, config, { merge: true });
  const snap = await getDoc(configRef);
  return { ...DEFAULT_SCHOOL_CONFIG, ...(snap.data() as SchoolConfig) };
}
