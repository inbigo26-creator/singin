import { Training, Attendance, SchoolConfig, Staff } from './types';
import { getLocalDB, saveLocalDB, defaultSampleStaff } from './localStore';

const API_BASE = '/api';

// Helper to test if a response is valid JSON from backend API
async function handleResponse<T>(res: Response, fallbackFn: () => T | Promise<T>): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok || !contentType.includes('application/json')) {
    // If backend returns 404, 502, or HTML (static SPA redirect), fall back to client localStorage
    return fallbackFn();
  }
  try {
    return await res.json();
  } catch {
    return fallbackFn();
  }
}

// ==================== TRAININGS API ====================

export async function fetchTrainings(): Promise<Training[]> {
  try {
    const res = await fetch(`${API_BASE}/trainings`);
    return await handleResponse(res, () => {
      const db = getLocalDB();
      return [...db.trainings].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });
  } catch (err) {
    const db = getLocalDB();
    return [...db.trainings].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

export async function fetchTraining(id: string): Promise<{
  training: Training;
  attendances: Attendance[];
  targetStaff: Staff[];
}> {
  try {
    const res = await fetch(`${API_BASE}/trainings/${id}`);
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const training = db.trainings.find((t) => t.id === id);
      if (!training) throw new Error('연수를 찾을 수 없습니다.');
      const attendances = db.attendances.filter((a) => a.trainingId === id);

      let targetStaff: Staff[] = [];
      if (training.targetStaffIds && training.targetStaffIds.length > 0) {
        targetStaff = training.targetStaffIds
          .map((id) => db.staff.find((s) => s.id === id))
          .filter((s): s is Staff => !!s);
      } else {
        targetStaff = [...db.staff].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
      }
      return { training, attendances, targetStaff };
    });
  } catch (err) {
    const db = getLocalDB();
    const training = db.trainings.find((t) => t.id === id);
    if (!training) throw new Error('연수를 찾을 수 없습니다.');
    const attendances = db.attendances.filter((a) => a.trainingId === id);

    let targetStaff: Staff[] = [];
    if (training.targetStaffIds && training.targetStaffIds.length > 0) {
      targetStaff = training.targetStaffIds
        .map((id) => db.staff.find((s) => s.id === id))
        .filter((s): s is Staff => !!s);
    } else {
      targetStaff = [...db.staff].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    }
    return { training, attendances, targetStaff };
  }
}

export async function createTraining(data: Partial<Training>): Promise<Training> {
  try {
    const res = await fetch(`${API_BASE}/trainings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const now = new Date().toISOString();
      const newTraining: Training = {
        id: `train-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: data.title || '새 교직원 연수',
        date: data.date || '',
        location: data.location || '',
        target: data.target || '전 교직원',
        manager: data.manager || '',
        schoolName: data.schoolName || db.config.schoolName,
        memo: data.memo || '',
        targetStaffIds: data.targetStaffIds || db.staff.map((s) => s.id),
        createdAt: now,
        updatedAt: now,
      };
      db.trainings.unshift(newTraining);
      saveLocalDB(db);
      return newTraining;
    });
  } catch (err) {
    const db = getLocalDB();
    const now = new Date().toISOString();
    const newTraining: Training = {
      id: `train-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: data.title || '새 교직원 연수',
      date: data.date || '',
      location: data.location || '',
      target: data.target || '전 교직원',
      manager: data.manager || '',
      schoolName: data.schoolName || db.config.schoolName,
      memo: data.memo || '',
      targetStaffIds: data.targetStaffIds || db.staff.map((s) => s.id),
      createdAt: now,
      updatedAt: now,
    };
    db.trainings.unshift(newTraining);
    saveLocalDB(db);
    return newTraining;
  }
}

export async function updateTraining(id: string, data: Partial<Training>): Promise<Training> {
  try {
    const res = await fetch(`${API_BASE}/trainings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const idx = db.trainings.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error('연수를 찾을 수 없습니다.');
      db.trainings[idx] = {
        ...db.trainings[idx],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      saveLocalDB(db);
      return db.trainings[idx];
    });
  } catch (err) {
    const db = getLocalDB();
    const idx = db.trainings.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('연수를 찾을 수 없습니다.');
    db.trainings[idx] = {
      ...db.trainings[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    saveLocalDB(db);
    return db.trainings[idx];
  }
}

export async function deleteTraining(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/trainings/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      db.trainings = db.trainings.filter((t) => t.id !== id);
      db.attendances = db.attendances.filter((a) => a.trainingId !== id);
      saveLocalDB(db);
      return { success: true, message: '연수가 삭제되었습니다.' };
    });
  } catch (err) {
    const db = getLocalDB();
    db.trainings = db.trainings.filter((t) => t.id !== id);
    db.attendances = db.attendances.filter((a) => a.trainingId !== id);
    saveLocalDB(db);
    return { success: true, message: '연수가 삭제되었습니다.' };
  }
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
  try {
    const res = await fetch(`${API_BASE}/trainings/${trainingId}/attendances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const now = new Date().toISOString();
      const existingIdx = db.attendances.findIndex(
        (a) =>
          a.trainingId === trainingId &&
          ((data.staffId && a.staffId === data.staffId) ||
            a.name.trim().toLowerCase() === data.name.trim().toLowerCase())
      );

      let savedAtt: Attendance;
      if (existingIdx !== -1) {
        savedAtt = {
          ...db.attendances[existingIdx],
          ...data,
          signedAt: now,
        };
        db.attendances[existingIdx] = savedAtt;
      } else {
        savedAtt = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          trainingId,
          staffId: data.staffId,
          name: data.name,
          department: data.department || '',
          position: data.position || '',
          signature: data.signature,
          signedAt: now,
          deviceInfo: data.deviceInfo || 'Web Browser',
        };
        db.attendances.push(savedAtt);
      }
      saveLocalDB(db);
      const total = db.attendances.filter((a) => a.trainingId === trainingId).length;
      return { success: true, attendance: savedAtt, totalAttendees: total };
    });
  } catch (err) {
    const db = getLocalDB();
    const now = new Date().toISOString();
    const existingIdx = db.attendances.findIndex(
      (a) =>
        a.trainingId === trainingId &&
        ((data.staffId && a.staffId === data.staffId) ||
          a.name.trim().toLowerCase() === data.name.trim().toLowerCase())
    );

    let savedAtt: Attendance;
    if (existingIdx !== -1) {
      savedAtt = {
        ...db.attendances[existingIdx],
        ...data,
        signedAt: now,
      };
      db.attendances[existingIdx] = savedAtt;
    } else {
      savedAtt = {
        id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        trainingId,
        staffId: data.staffId,
        name: data.name,
        department: data.department || '',
        position: data.position || '',
        signature: data.signature,
        signedAt: now,
        deviceInfo: data.deviceInfo || 'Web Browser',
      };
      db.attendances.push(savedAtt);
    }
    saveLocalDB(db);
    const total = db.attendances.filter((a) => a.trainingId === trainingId).length;
    return { success: true, attendance: savedAtt, totalAttendees: total };
  }
}

export async function deleteAttendance(
  trainingId: string,
  attendanceId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/trainings/${trainingId}/attendances/${attendanceId}`, {
      method: 'DELETE',
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      db.attendances = db.attendances.filter(
        (a) => !(a.trainingId === trainingId && a.id === attendanceId)
      );
      saveLocalDB(db);
      return { success: true, message: '참석자 서명이 삭제되었습니다.' };
    });
  } catch (err) {
    const db = getLocalDB();
    db.attendances = db.attendances.filter(
      (a) => !(a.trainingId === trainingId && a.id === attendanceId)
    );
    saveLocalDB(db);
    return { success: true, message: '참석자 서명이 삭제되었습니다.' };
  }
}

export async function seedBulkAttendees(
  trainingId: string,
  count?: number
): Promise<{ success: boolean; addedCount: number; totalCount: number }> {
  try {
    const res = await fetch(`${API_BASE}/trainings/${trainingId}/seed-bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count }),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const training = db.trainings.find((t) => t.id === trainingId);
      const targetStaffList =
        training?.targetStaffIds && training.targetStaffIds.length > 0
          ? db.staff.filter((s) => training.targetStaffIds?.includes(s.id))
          : db.staff;

      const unsignedStaff = targetStaffList.filter(
        (s) => !db.attendances.some((a) => a.trainingId === trainingId && (a.staffId === s.id || a.name === s.name))
      );

      const targetCount = count ? Math.min(count, unsignedStaff.length) : unsignedStaff.length;
      let added = 0;
      const now = new Date().toISOString();

      for (let i = 0; i < targetCount; i++) {
        const staff = unsignedStaff[i];
        db.attendances.push({
          id: `att-gen-${Date.now()}-${i}`,
          trainingId,
          staffId: staff.id,
          name: staff.name,
          department: staff.department,
          position: staff.position,
          signature: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M${20 + (i % 10)},${25 + (i % 15)} Q${50 + (i % 20)},${10 + (i % 20)} ${90 + (i % 20)},${40 - (i % 10)} T${140 - (i % 10)},${30 + (i % 10)}" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
          signedAt: now,
          deviceInfo: 'Sample Generated'
        });
        added++;
      }
      saveLocalDB(db);
      const total = db.attendances.filter((a) => a.trainingId === trainingId).length;
      return { success: true, addedCount: added, totalCount: total };
    });
  } catch (err) {
    const db = getLocalDB();
    const training = db.trainings.find((t) => t.id === trainingId);
    const targetStaffList =
      training?.targetStaffIds && training.targetStaffIds.length > 0
        ? db.staff.filter((s) => training.targetStaffIds?.includes(s.id))
        : db.staff;

    const unsignedStaff = targetStaffList.filter(
      (s) => !db.attendances.some((a) => a.trainingId === trainingId && (a.staffId === s.id || a.name === s.name))
    );

    const targetCount = count ? Math.min(count, unsignedStaff.length) : unsignedStaff.length;
    let added = 0;
    const now = new Date().toISOString();

    for (let i = 0; i < targetCount; i++) {
      const staff = unsignedStaff[i];
      db.attendances.push({
        id: `att-gen-${Date.now()}-${i}`,
        trainingId,
        staffId: staff.id,
        name: staff.name,
        department: staff.department,
        position: staff.position,
        signature: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M${20 + (i % 10)},${25 + (i % 15)} Q${50 + (i % 20)},${10 + (i % 20)} ${90 + (i % 20)},${40 - (i % 10)} T${140 - (i % 10)},${30 + (i % 10)}" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>`,
        signedAt: now,
        deviceInfo: 'Sample Generated'
      });
      added++;
    }
    saveLocalDB(db);
    const total = db.attendances.filter((a) => a.trainingId === trainingId).length;
    return { success: true, addedCount: added, totalCount: total };
  }
}

export async function clearAllAttendances(trainingId: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/trainings/${trainingId}/clear-attendances`, {
      method: 'POST',
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      db.attendances = db.attendances.filter((a) => a.trainingId !== trainingId);
      saveLocalDB(db);
      return { success: true, message: '모든 서명이 초기화되었습니다.' };
    });
  } catch (err) {
    const db = getLocalDB();
    db.attendances = db.attendances.filter((a) => a.trainingId !== trainingId);
    saveLocalDB(db);
    return { success: true, message: '모든 서명이 초기화되었습니다.' };
  }
}

// ==================== MASTER STAFF API ====================

export async function fetchStaff(): Promise<Staff[]> {
  try {
    const res = await fetch(`${API_BASE}/staff`);
    return await handleResponse(res, () => {
      const db = getLocalDB();
      return [...db.staff].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    });
  } catch (err) {
    const db = getLocalDB();
    return [...db.staff].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
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
  try {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set('query', params.query);
    if (params.name) searchParams.set('name', params.name);
    if (params.code) searchParams.set('code', params.code);

    const res = await fetch(`${API_BASE}/staff/lookup?${searchParams.toString()}`);
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const q = (params.query || params.name || params.code || '').trim().toLowerCase();
      let candidates: Staff[] = [];

      if (params.code) {
        candidates = db.staff.filter((s) => s.code?.toLowerCase() === params.code?.toLowerCase());
      } else if (params.name) {
        candidates = db.staff.filter((s) => s.name.toLowerCase() === params.name?.toLowerCase());
      } else if (q) {
        // Match code first, then exact name, then partial
        candidates = db.staff.filter((s) => s.code?.toLowerCase() === q);
        if (candidates.length === 0) {
          candidates = db.staff.filter((s) => s.name.toLowerCase() === q);
        }
        if (candidates.length === 0) {
          candidates = db.staff.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.department.toLowerCase().includes(q) ||
              (s.code && s.code.toLowerCase().includes(q))
          );
        }
      } else {
        candidates = db.staff;
      }

      const nameCounts: Record<string, number> = {};
      db.staff.forEach((s) => {
        nameCounts[s.name] = (nameCounts[s.name] || 0) + 1;
      });

      return {
        query: q,
        count: candidates.length,
        isDuplicateName: candidates.some((c) => (nameCounts[c.name] || 0) > 1),
        candidates,
      };
    });
  } catch (err) {
    const db = getLocalDB();
    const q = (params.query || params.name || params.code || '').trim().toLowerCase();
    let candidates: Staff[] = [];

    if (params.code) {
      candidates = db.staff.filter((s) => s.code?.toLowerCase() === params.code?.toLowerCase());
    } else if (params.name) {
      candidates = db.staff.filter((s) => s.name.toLowerCase() === params.name?.toLowerCase());
    } else if (q) {
      candidates = db.staff.filter((s) => s.code?.toLowerCase() === q);
      if (candidates.length === 0) {
        candidates = db.staff.filter((s) => s.name.toLowerCase() === q);
      }
      if (candidates.length === 0) {
        candidates = db.staff.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.department.toLowerCase().includes(q) ||
            (s.code && s.code.toLowerCase().includes(q))
        );
      }
    } else {
      candidates = db.staff;
    }

    const nameCounts: Record<string, number> = {};
    db.staff.forEach((s) => {
      nameCounts[s.name] = (nameCounts[s.name] || 0) + 1;
    });

    return {
      query: q,
      count: candidates.length,
      isDuplicateName: candidates.some((c) => (nameCounts[c.name] || 0) > 1),
      candidates,
    };
  }
}

export async function createStaff(data: Partial<Staff>): Promise<Staff> {
  try {
    const res = await fetch(`${API_BASE}/staff`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const newStaff: Staff = {
        id: `stf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code: data.code?.trim() || undefined,
        name: data.name?.trim() || '',
        department: data.department?.trim() || '',
        position: data.position?.trim() || '',
        order: (db.staff.length ? Math.max(...db.staff.map((s) => s.order ?? 0)) : 0) + 1,
      };
      db.staff.push(newStaff);
      saveLocalDB(db);
      return newStaff;
    });
  } catch (err) {
    const db = getLocalDB();
    const newStaff: Staff = {
      id: `stf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code: data.code?.trim() || undefined,
      name: data.name?.trim() || '',
      department: data.department?.trim() || '',
      position: data.position?.trim() || '',
      order: (db.staff.length ? Math.max(...db.staff.map((s) => s.order ?? 0)) : 0) + 1,
    };
    db.staff.push(newStaff);
    saveLocalDB(db);
    return newStaff;
  }
}

export async function updateStaff(id: string, data: Partial<Staff>): Promise<Staff> {
  try {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const idx = db.staff.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('교직원을 찾을 수 없습니다.');
      db.staff[idx] = { ...db.staff[idx], ...data };
      saveLocalDB(db);
      return db.staff[idx];
    });
  } catch (err) {
    const db = getLocalDB();
    const idx = db.staff.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('교직원을 찾을 수 없습니다.');
    db.staff[idx] = { ...db.staff[idx], ...data };
    saveLocalDB(db);
    return db.staff[idx];
  }
}

export async function deleteStaff(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/staff/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      db.staff = db.staff.filter((s) => s.id !== id);
      saveLocalDB(db);
      return { success: true, message: '교직원이 삭제되었습니다.' };
    });
  } catch (err) {
    const db = getLocalDB();
    db.staff = db.staff.filter((s) => s.id !== id);
    saveLocalDB(db);
    return { success: true, message: '교직원이 삭제되었습니다.' };
  }
}

export async function bulkImportStaff(
  staffList: Partial<Staff>[],
  mode: 'replace' | 'append' = 'append'
): Promise<{ success: boolean; count: number; staff: Staff[] }> {
  try {
    const res = await fetch(`${API_BASE}/staff/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffList, mode }),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      let newStaffList: Staff[] = mode === 'replace' ? [] : [...db.staff];
      let startOrder = newStaffList.length ? Math.max(...newStaffList.map((s) => s.order ?? 0)) + 1 : 1;

      staffList.forEach((item) => {
        if (!item.name || !item.name.trim()) return;
        newStaffList.push({
          id: `stf-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          code: item.code?.trim() || undefined,
          name: item.name.trim(),
          department: item.department?.trim() || '교무부',
          position: item.position?.trim() || '',
          order: startOrder++,
        });
      });

      db.staff = newStaffList;
      saveLocalDB(db);
      return { success: true, count: staffList.length, staff: db.staff };
    });
  } catch (err) {
    const db = getLocalDB();
    let newStaffList: Staff[] = mode === 'replace' ? [] : [...db.staff];
    let startOrder = newStaffList.length ? Math.max(...newStaffList.map((s) => s.order ?? 0)) + 1 : 1;

    staffList.forEach((item) => {
      if (!item.name || !item.name.trim()) return;
      newStaffList.push({
        id: `stf-bulk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        code: item.code?.trim() || undefined,
        name: item.name.trim(),
        department: item.department?.trim() || '교무부',
        position: item.position?.trim() || '',
        order: startOrder++,
      });
    });

    db.staff = newStaffList;
    saveLocalDB(db);
    return { success: true, count: staffList.length, staff: db.staff };
  }
}

export async function resetSampleStaff(): Promise<{ success: boolean; staff: Staff[] }> {
  try {
    const res = await fetch(`${API_BASE}/staff/reset-sample`, {
      method: 'POST',
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      db.staff = defaultSampleStaff;
      saveLocalDB(db);
      return { success: true, staff: db.staff };
    });
  } catch (err) {
    const db = getLocalDB();
    db.staff = defaultSampleStaff;
    saveLocalDB(db);
    return { success: true, staff: db.staff };
  }
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
  try {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (staffId) params.set('staffId', staffId);

    const res = await fetch(`${API_BASE}/teacher/trainings?${params.toString()}`);
    return await handleResponse(res, () => {
      const db = getLocalDB();
      let teacher: Staff | undefined;
      if (staffId) {
        teacher = db.staff.find((s) => s.id === staffId);
      } else if (name) {
        teacher = db.staff.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
      }

      if (!teacher) {
        teacher = {
          id: staffId || `stf-temp-${Date.now()}`,
          name: name || '선생님',
          department: '교무부',
          position: '교사',
        };
      }

      const assignedTrainings = db.trainings.filter((t) => {
        if (!t.targetStaffIds || t.targetStaffIds.length === 0) return true;
        return t.targetStaffIds.includes(teacher!.id);
      });

      const items: TeacherTrainingItem[] = assignedTrainings.map((t) => {
        const attendance =
          db.attendances.find(
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
          schoolName: t.schoolName || db.config.schoolName,
          isSigned: !!attendance,
          attendance,
        };
      });

      return { teacher, trainings: items };
    });
  } catch (err) {
    const db = getLocalDB();
    let teacher: Staff | undefined;
    if (staffId) {
      teacher = db.staff.find((s) => s.id === staffId);
    } else if (name) {
      teacher = db.staff.find((s) => s.name.trim().toLowerCase() === name.trim().toLowerCase());
    }

    if (!teacher) {
      teacher = {
        id: staffId || `stf-temp-${Date.now()}`,
        name: name || '선생님',
        department: '교무부',
        position: '교사',
      };
    }

    const assignedTrainings = db.trainings.filter((t) => {
      if (!t.targetStaffIds || t.targetStaffIds.length === 0) return true;
      return t.targetStaffIds.includes(teacher!.id);
    });

    const items: TeacherTrainingItem[] = assignedTrainings.map((t) => {
      const attendance =
        db.attendances.find(
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
        schoolName: t.schoolName || db.config.schoolName,
        isSigned: !!attendance,
        attendance,
      };
    });

    return { teacher, trainings: items };
  }
}

// ==================== ADMIN & CONFIG API ====================

export async function verifyAdminPassword(password: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const expectedPassword = db.adminPassword || '1234';
      if (password === expectedPassword) {
        return { success: true, message: '인증 성공' };
      }
      throw new Error('비밀번호가 일치하지 않습니다.');
    });
  } catch (err: any) {
    const db = getLocalDB();
    const expectedPassword = db.adminPassword || '1234';
    if (password === expectedPassword) {
      return { success: true, message: '인증 성공' };
    }
    throw new Error(err.message || '비밀번호가 일치하지 않습니다.');
  }
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch(`${API_BASE}/admin/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      const expectedPassword = db.adminPassword || '1234';
      if (currentPassword !== expectedPassword) {
        throw new Error('현재 비밀번호가 일치하지 않습니다.');
      }
      db.adminPassword = newPassword.trim();
      saveLocalDB(db);
      return { success: true, message: '관리자 비밀번호가 성공적으로 변경되었습니다.' };
    });
  } catch (err: any) {
    const db = getLocalDB();
    const expectedPassword = db.adminPassword || '1234';
    if (currentPassword !== expectedPassword) {
      throw new Error('현재 비밀번호가 일치하지 않습니다.');
    }
    db.adminPassword = newPassword.trim();
    saveLocalDB(db);
    return { success: true, message: '관리자 비밀번호가 성공적으로 변경되었습니다.' };
  }
}

export async function fetchSchoolConfig(): Promise<SchoolConfig> {
  try {
    const res = await fetch(`${API_BASE}/config`);
    return await handleResponse(res, () => {
      const db = getLocalDB();
      return db.config;
    });
  } catch (err) {
    const db = getLocalDB();
    return db.config;
  }
}

export async function updateSchoolConfig(config: Partial<SchoolConfig>): Promise<SchoolConfig> {
  try {
    const res = await fetch(`${API_BASE}/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return await handleResponse(res, () => {
      const db = getLocalDB();
      db.config = { ...db.config, ...config };
      saveLocalDB(db);
      return db.config;
    });
  } catch (err) {
    const db = getLocalDB();
    db.config = { ...db.config, ...config };
    saveLocalDB(db);
    return db.config;
  }
}
