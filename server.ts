import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { Training, Attendance, SchoolConfig, Staff } from './src/types.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';

// Data storage file path
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  staff: Staff[];
  trainings: Training[];
  attendances: Attendance[];
  config: SchoolConfig;
  adminPassword?: string;
}

const defaultSampleStaff: Staff[] = [
  { id: 'stf-01', code: '101', name: '김진수', department: '교육과정연구부', position: '부장교사', order: 1 },
  { id: 'stf-02', code: '102', name: '박미영', department: '생활안전부', position: '부장교사', order: 2 },
  { id: 'stf-03', code: '103', name: '최윤아', department: '교무기획부', position: '부장교사', order: 3 },
  { id: 'stf-04', code: '104', name: '정승호', department: '비즈니스정보부', position: '부장교사', order: 4 },
  { id: 'stf-05', code: '105', name: '이수진', department: '진로진학상담부', position: '부장교사', order: 5 },
  { id: 'stf-06', code: '106', name: '김민지', department: '1학년부', position: '교사', order: 6 },
  { id: 'stf-07', code: '201', name: '박철민', department: '2학년부', position: '부장교사', order: 7 },
  { id: 'stf-08', code: '202', name: '이도윤', department: '2학년부', position: '교사', order: 8 },
  { id: 'stf-09', code: '301', name: '강하은', department: '3학년부', position: '부장교사', order: 9 },
  { id: 'stf-10', code: '302', name: '박서준', department: '3학년부', position: '교사', order: 10 },
  { id: 'stf-11', code: '401', name: '정예은', department: '1학년부', position: '교사', order: 11 },
  { id: 'stf-12', code: '402', name: '김민지', department: '교육과정연구부', position: '교사', order: 12 },
  { id: 'stf-13', code: '501', name: '조시우', department: '비즈니스정보부', position: '교사', order: 13 },
  { id: 'stf-14', code: '502', name: '윤지우', department: '생활안전부', position: '교사', order: 14 },
  { id: 'stf-15', code: '601', name: '장서연', department: '진로진학상담부', position: '교사', order: 15 },
  { id: 'stf-16', code: '602', name: '임도현', department: '체육예술부', position: '교사', order: 16 },
  { id: 'stf-17', code: '701', name: '한지민', department: '체육예술부', position: '부장교사', order: 17 },
  { id: 'stf-18', code: '702', name: '오유진', department: '특수교육부', position: '교사', order: 18 },
  { id: 'stf-19', code: '801', name: '서준호', department: '보건실', position: '보건교사', order: 19 },
  { id: 'stf-20', code: '802', name: '신소율', department: '도서실', position: '사서교사', order: 20 },
  { id: 'stf-21', code: '803', name: '권민서', department: '상담실', position: '전문상담교사', order: 21 },
  { id: 'stf-22', code: '804', name: '황준서', department: '영양실', position: '영양교사', order: 22 },
  { id: 'stf-23', code: '805', name: '송하린', department: '외국어과', position: '교사', order: 23 },
  { id: 'stf-24', code: '901', name: '문성호', department: '교무실', position: '교감', order: 24 },
  { id: 'stf-25', code: '902', name: '홍길동', department: '교장실', position: '교장', order: 25 },
];

// Initial default seed data
const initialData: DatabaseSchema = {
  config: {
    schoolName: '인천비즈니스고등학교',
    defaultApprovalLine: ['담당', '부장', '교감', '교장'],
    showApprovalLine: false,
  },
  staff: defaultSampleStaff,
  trainings: [
    {
      id: 'train-20260820-01',
      title: '2026학년도 교직원 AI 활용 및 에듀테크 수업 역량 강화 연수',
      date: '2026. 8. 20.(목)',
      location: '본관 3층 컴퓨터실',
      target: '전 교직원',
      manager: '교육과정연구부장 김진수',
      schoolName: '인천비즈니스고등학교',
      memo: '실습 위주 진행, 태블릿 또는 노트북 지참',
      targetStaffIds: defaultSampleStaff.map((s) => s.id),
      createdAt: '2026-08-13T10:00:00.000Z',
      updatedAt: '2026-08-13T10:00:00.000Z',
    },
    {
      id: 'train-20260827-02',
      title: '2026학년도 2학기 학교폭력 예방 및 학생 생활지도 교원 연수',
      date: '2026. 8. 27.(목)',
      location: '시청각실',
      target: '담임교사 및 연구부',
      manager: '생활안전부장 박미영',
      schoolName: '인천비즈니스고등학교',
      memo: '법정 의무 연수(1시간) 이수 인정',
      // Selected specific staff
      targetStaffIds: [
        'stf-01', 'stf-02', 'stf-03', 'stf-05', 'stf-06', 'stf-07', 'stf-08',
        'stf-09', 'stf-10', 'stf-11', 'stf-12', 'stf-13', 'stf-14', 'stf-15', 'stf-16'
      ],
      createdAt: '2026-08-13T11:00:00.000Z',
      updatedAt: '2026-08-13T11:00:00.000Z',
    }
  ],
  attendances: [
    {
      id: 'att-seed-01',
      trainingId: 'train-20260820-01',
      staffId: 'stf-01',
      name: '김진수',
      department: '연구부',
      position: '부장교사',
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M20,35 Q50,15 70,35 T120,25 Q140,40 150,20" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
      signedAt: '2026-08-13T15:02:10.000Z',
      deviceInfo: 'Chrome / macOS'
    },
    {
      id: 'att-seed-02',
      trainingId: 'train-20260820-01',
      staffId: 'stf-05',
      name: '이수진',
      department: '1학년부',
      position: '부장교사',
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M25,20 Q40,45 60,30 T100,35 Q130,20 145,45" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
      signedAt: '2026-08-13T15:05:22.000Z',
      deviceInfo: 'Mobile Safari / iOS'
    },
    {
      id: 'att-seed-03',
      trainingId: 'train-20260820-01',
      staffId: 'stf-07',
      name: '박철민',
      department: '2학년부',
      position: '부장교사',
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M20,40 Q45,15 80,40 T130,20 Q145,35 155,30" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
      signedAt: '2026-08-13T15:08:45.000Z',
      deviceInfo: 'Samsung Internet / Android'
    },
    {
      id: 'att-seed-04',
      trainingId: 'train-20260820-01',
      staffId: 'stf-03',
      name: '최윤아',
      department: '교무기획부',
      position: '부장교사',
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M30,30 Q60,10 90,45 T140,25" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
      signedAt: '2026-08-13T15:10:00.000Z',
      deviceInfo: 'Chrome / Windows'
    },
    {
      id: 'att-seed-05',
      trainingId: 'train-20260820-01',
      staffId: 'stf-04',
      name: '정승호',
      department: '정보과학부',
      position: '부장교사',
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M20,25 Q50,45 80,20 T135,35 Q145,25 150,40" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
      signedAt: '2026-08-13T15:12:15.000Z',
      deviceInfo: 'Chrome / Android'
    }
  ]
};

// Ensure data directory and file exist
function getDatabase(): DatabaseSchema {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.trainings || !parsed.attendances) {
      return initialData;
    }
    // Auto populate staff if missing or migrate missing code field
    if (!parsed.staff || !Array.isArray(parsed.staff) || parsed.staff.length === 0) {
      parsed.staff = defaultSampleStaff;
      saveDatabase(parsed);
    } else {
      let changed = false;
      parsed.staff = parsed.staff.map((s: Staff, idx: number) => {
        if (!s.code) {
          changed = true;
          return { ...s, code: String(100 + (s.order || idx + 1)) };
        }
        return s;
      });
      if (changed) {
        saveDatabase(parsed);
      }
    }
    return parsed;
  } catch (err) {
    console.error('Error reading database:', err);
    return initialData;
  }
}

function saveDatabase(data: DatabaseSchema): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

async function startServer() {
  const app = express();

  // Middleware for parsing JSON with increased limit for base64 signature images
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Routes
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Admin Verification
  app.post('/api/admin/verify', (req: Request, res: Response) => {
    const { password } = req.body;
    const db = getDatabase();
    const currentAdminPassword = db.adminPassword || ADMIN_PASSWORD;
    if (password === currentAdminPassword) {
      return res.json({ success: true, message: '인증 성공' });
    }
    return res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
  });

  // Admin Change Password
  app.post('/api/admin/change-password', (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length === 0) {
      return res.status(400).json({ success: false, message: '새 비밀번호를 입력해 주세요.' });
    }
    const db = getDatabase();
    const currentAdminPassword = db.adminPassword || ADMIN_PASSWORD;
    if (currentPassword !== currentAdminPassword) {
      return res.status(401).json({ success: false, message: '현재 비밀번호가 일치하지 않습니다.' });
    }
    db.adminPassword = newPassword.trim();
    saveDatabase(db);
    return res.json({ success: true, message: '관리자 비밀번호가 성공적으로 변경되었습니다.' });
  });

  // Get School Config
  app.get('/api/config', (req: Request, res: Response) => {
    const db = getDatabase();
    res.json(db.config || initialData.config);
  });

  // Update School Config
  app.put('/api/config', (req: Request, res: Response) => {
    const db = getDatabase();
    db.config = { ...db.config, ...req.body };
    saveDatabase(db);
    res.json(db.config);
  });

  // ==================== MASTER STAFF MANAGEMENT ====================

  // Get all staff members
  app.get('/api/staff', (req: Request, res: Response) => {
    const db = getDatabase();
    const staffList = [...(db.staff || [])];
    staffList.sort((a, b) => (a.order || 999) - (b.order || 999));
    res.json(staffList);
  });

  // Lookup / Search staff candidates (supports duplicate names / 동명이인 and code lookup)
  app.get('/api/staff/lookup', (req: Request, res: Response) => {
    const query = typeof req.query.query === 'string' ? req.query.query.trim().toLowerCase() : '';
    const name = typeof req.query.name === 'string' ? req.query.name.trim().toLowerCase() : '';
    const code = typeof req.query.code === 'string' ? req.query.code.trim().toLowerCase() : '';

    const db = getDatabase();
    const staffList = [...(db.staff || [])];

    let matches: Staff[] = [];

    if (code) {
      matches = staffList.filter((s) => s.code && s.code.toLowerCase() === code);
    } else if (name) {
      matches = staffList.filter((s) => s.name.trim().toLowerCase() === name);
      if (matches.length === 0) {
        matches = staffList.filter((s) => s.name.trim().toLowerCase().includes(name));
      }
    } else if (query) {
      matches = staffList.filter((s) => {
        const sCode = s.code ? s.code.toLowerCase() : '';
        const sName = s.name.trim().toLowerCase();
        const sDept = s.department.trim().toLowerCase();
        return sCode === query || sName === query || sName.includes(query) || sDept.includes(query);
      });
    } else {
      matches = staffList;
    }

    matches.sort((a, b) => (a.order || 999) - (b.order || 999));
    res.json({
      query: query || name || code,
      count: matches.length,
      isDuplicateName: matches.length > 1,
      candidates: matches,
    });
  });

  // Add a single staff member
  app.post('/api/staff', (req: Request, res: Response) => {
    const { code, name, department, position, order } = req.body;
    if (!name) {
      return res.status(400).json({ error: '성명은 필수 입력 항목입니다.' });
    }

    const db = getDatabase();
    const id = `stf-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newStaff: Staff = {
      id,
      code: code ? code.trim() : String(100 + db.staff.length + 1),
      name: name.trim(),
      department: department ? department.trim() : '일반',
      position: position ? position.trim() : '교사',
      order: order !== undefined ? Number(order) : (db.staff.length + 1),
    };

    db.staff.push(newStaff);
    saveDatabase(db);
    res.status(201).json(newStaff);
  });

  // Update a staff member
  app.put('/api/staff/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { code, name, department, position, order } = req.body;
    const db = getDatabase();
    const index = db.staff.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: '교직원 정보를 찾을 수 없습니다.' });
    }

    db.staff[index] = {
      ...db.staff[index],
      code: code !== undefined ? code.trim() : db.staff[index].code,
      name: name !== undefined ? name.trim() : db.staff[index].name,
      department: department !== undefined ? department.trim() : db.staff[index].department,
      position: position !== undefined ? position.trim() : db.staff[index].position,
      order: order !== undefined ? Number(order) : db.staff[index].order,
    };

    saveDatabase(db);
    res.json(db.staff[index]);
  });

  // Delete a staff member
  app.delete('/api/staff/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getDatabase();
    const beforeCount = db.staff.length;
    db.staff = db.staff.filter((s) => s.id !== id);

    if (db.staff.length === beforeCount) {
      return res.status(404).json({ error: '교직원 정보를 찾을 수 없습니다.' });
    }

    saveDatabase(db);
    res.json({ success: true, message: '교직원이 삭제되었습니다.' });
  });

  // Bulk import staff members (replace or append)
  app.post('/api/staff/bulk', (req: Request, res: Response) => {
    const { staffList, mode = 'append' } = req.body;
    if (!Array.isArray(staffList)) {
      return res.status(400).json({ error: '유효한 교직원 목록 데이터가 아닙니다.' });
    }

    const db = getDatabase();
    const formatted: Staff[] = staffList
      .filter((item: any) => item && item.name && item.name.trim())
      .map((item: any, idx: number) => ({
        id: item.id || `stf-${Date.now().toString(36)}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
        code: item.code ? String(item.code).trim() : String(100 + idx + 1),
        name: item.name.trim(),
        department: (item.department || '일반').trim(),
        position: (item.position || '교사').trim(),
        order: item.order !== undefined ? Number(item.order) : idx + 1,
      }));

    if (mode === 'replace') {
      db.staff = formatted;
    } else {
      db.staff = [...db.staff, ...formatted];
    }

    saveDatabase(db);
    res.json({ success: true, count: db.staff.length, staff: db.staff });
  });

  // Reset staff to default sample list
  app.post('/api/staff/reset-sample', (req: Request, res: Response) => {
    const db = getDatabase();
    db.staff = defaultSampleStaff;
    saveDatabase(db);
    res.json({ success: true, staff: db.staff });
  });

  // ==================== TRAINING MANAGEMENT ====================

  // Get All Trainings (with attendance counts and target staff count)
  app.get('/api/trainings', (req: Request, res: Response) => {
    const db = getDatabase();
    const totalStaffCount = db.staff.length;

    const trainingsWithCount = db.trainings.map((t) => {
      const attendances = db.attendances.filter((a) => a.trainingId === t.id);
      const targetCount = (t.targetStaffIds && t.targetStaffIds.length > 0)
        ? t.targetStaffIds.length
        : totalStaffCount;

      return {
        ...t,
        attendanceCount: attendances.length,
        totalTargetCount: targetCount,
      };
    });

    // Sort recent first
    trainingsWithCount.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(trainingsWithCount);
  });

  // Get Single Training Details + Attendances + Target Staff
  app.get('/api/trainings/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getDatabase();
    const training = db.trainings.find((t) => t.id === id);

    if (!training) {
      return res.status(404).json({ error: '해당 연수를 찾을 수 없습니다.' });
    }

    const attendances = db.attendances
      .filter((a) => a.trainingId === id)
      .sort((a, b) => new Date(a.signedAt).getTime() - new Date(b.signedAt).getTime());

    // Resolve target staff objects in the exact order specified in targetStaffIds
    let targetStaff: Staff[] = [];
    if (training.targetStaffIds && training.targetStaffIds.length > 0) {
      targetStaff = training.targetStaffIds
        .map((id) => db.staff.find((s) => s.id === id))
        .filter((s): s is Staff => !!s);
    } else {
      targetStaff = [...db.staff].sort((a, b) => (a.order || 999) - (b.order || 999));
    }

    res.json({
      training: {
        ...training,
        attendanceCount: attendances.length,
        totalTargetCount: targetStaff.length,
      },
      attendances,
      targetStaff,
    });
  });

  // Create New Training
  app.post('/api/trainings', (req: Request, res: Response) => {
    const { title, date, location, target, manager, schoolName, memo, targetStaffIds } = req.body;

    if (!title || !date) {
      return res.status(400).json({ error: '연수 주제와 날짜는 필수 항목입니다.' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const id = `train-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    // Default targetStaffIds to all staff if not specified
    const finalTargetIds = (Array.isArray(targetStaffIds) && targetStaffIds.length > 0)
      ? targetStaffIds
      : db.staff.map((s) => s.id);

    const newTraining: Training = {
      id,
      title: title.trim(),
      date: date.trim(),
      location: location ? location.trim() : '교내',
      target: target ? target.trim() : '지정 교직원',
      manager: manager ? manager.trim() : '연수 담당자',
      schoolName: schoolName ? schoolName.trim() : (db.config.schoolName || '가온초등학교'),
      memo: memo ? memo.trim() : '',
      targetStaffIds: finalTargetIds,
      createdAt: now,
      updatedAt: now,
    };

    db.trainings.unshift(newTraining);
    saveDatabase(db);

    res.status(201).json({
      ...newTraining,
      attendanceCount: 0,
      totalTargetCount: finalTargetIds.length,
    });
  });

  // Update Training
  app.put('/api/trainings/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, date, location, target, manager, schoolName, memo, targetStaffIds } = req.body;

    const db = getDatabase();
    const index = db.trainings.findIndex((t) => t.id === id);

    if (index === -1) {
      return res.status(404).json({ error: '연수 정보를 찾을 수 없습니다.' });
    }

    db.trainings[index] = {
      ...db.trainings[index],
      title: title !== undefined ? title.trim() : db.trainings[index].title,
      date: date !== undefined ? date.trim() : db.trainings[index].date,
      location: location !== undefined ? location.trim() : db.trainings[index].location,
      target: target !== undefined ? target.trim() : db.trainings[index].target,
      manager: manager !== undefined ? manager.trim() : db.trainings[index].manager,
      schoolName: schoolName !== undefined ? schoolName.trim() : db.trainings[index].schoolName,
      memo: memo !== undefined ? memo.trim() : db.trainings[index].memo,
      targetStaffIds: targetStaffIds !== undefined ? targetStaffIds : db.trainings[index].targetStaffIds,
      updatedAt: new Date().toISOString(),
    };

    saveDatabase(db);
    const count = db.attendances.filter((a) => a.trainingId === id).length;
    const targetCount = (db.trainings[index].targetStaffIds && db.trainings[index].targetStaffIds!.length > 0)
      ? db.trainings[index].targetStaffIds!.length
      : db.staff.length;

    res.json({
      ...db.trainings[index],
      attendanceCount: count,
      totalTargetCount: targetCount,
    });
  });

  // Delete Training
  app.delete('/api/trainings/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getDatabase();

    db.trainings = db.trainings.filter((t) => t.id !== id);
    db.attendances = db.attendances.filter((a) => a.trainingId !== id);

    saveDatabase(db);
    res.json({ success: true, message: '연수 및 참석자 정보가 삭제되었습니다.' });
  });

  // ==================== TEACHER PORTAL ====================

  // Get trainings for a specific teacher by name or staffId
  app.get('/api/teacher/trainings', (req: Request, res: Response) => {
    const { name, staffId } = req.query;
    if (!name && !staffId) {
      return res.status(400).json({ error: '선생님 성명 또는 ID가 필요합니다.' });
    }

    const db = getDatabase();
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanStaffId = typeof staffId === 'string' ? staffId.trim() : '';

    // Find staff record from master list
    const staffMember = db.staff.find((s) => {
      if (cleanStaffId && s.id === cleanStaffId) return true;
      if (!cleanStaffId && cleanName && s.name.trim().toLowerCase() === cleanName.toLowerCase()) return true;
      return false;
    });

    const targetStaffId = staffMember?.id || cleanStaffId;
    const teacherName = staffMember?.name || cleanName;

    // Filter trainings where teacher is assigned
    const eligibleTrainings = db.trainings.filter((t) => {
      // 1. If targetStaffIds is empty or not defined, it applies to ALL teachers
      if (!t.targetStaffIds || t.targetStaffIds.length === 0) return true;
      
      // 2. If targetStaffId matches an ID in targetStaffIds
      if (targetStaffId && t.targetStaffIds.includes(targetStaffId)) return true;

      // 3. If targetStaffId is not provided but any staff in targetStaffIds has the same name
      if (!targetStaffId) {
        const hasMatchingStaffInTarget = t.targetStaffIds.some((id) => {
          const s = db.staff.find((st) => st.id === id);
          return s && s.name.trim().toLowerCase() === teacherName.toLowerCase();
        });
        if (hasMatchingStaffInTarget) return true;
      }

      // 4. If the teacher already has an attendance in this training
      const hasAttendance = db.attendances.some((a) => {
        if (targetStaffId) {
          return a.trainingId === t.id && a.staffId === targetStaffId;
        }
        return a.trainingId === t.id && a.name.trim().toLowerCase() === teacherName.toLowerCase();
      });
      if (hasAttendance) return true;

      return false;
    });

    // Attach signed status and attendance record for each training
    const result = eligibleTrainings.map((t) => {
      const attendance = db.attendances.find((a) => {
        if (targetStaffId) {
          return a.trainingId === t.id && a.staffId === targetStaffId;
        }
        return a.trainingId === t.id && a.name.trim().toLowerCase() === teacherName.toLowerCase();
      });

      return {
        id: t.id,
        title: t.title,
        date: t.date,
        location: t.location || '교내',
        target: t.target || '전 교직원',
        manager: t.manager || '연수 담당자',
        schoolName: t.schoolName || db.config.schoolName || '가온초등학교',
        memo: t.memo || '',
        isSigned: !!attendance,
        attendance: attendance ? {
          id: attendance.id,
          trainingId: attendance.trainingId,
          staffId: attendance.staffId,
          name: attendance.name,
          department: attendance.department,
          position: attendance.position,
          signature: attendance.signature,
          signedAt: attendance.signedAt,
          deviceInfo: attendance.deviceInfo,
        } : null,
      };
    });

    // Sort recent first
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    res.json({
      teacher: staffMember || {
        id: targetStaffId || `stf-${Date.now().toString(36)}`,
        name: teacherName,
        department: '교원',
        position: '선생님'
      },
      trainings: result,
    });
  });

  // Submit Signature / Attendance
  app.post('/api/trainings/:id/attendances', (req: Request, res: Response) => {
    const { id } = req.params;
    const { staffId, name, department, position, signature, deviceInfo } = req.body;

    if (!name || !signature) {
      return res.status(400).json({ error: '성명과 서명은 필수 항목입니다.' });
    }

    const db = getDatabase();
    const training = db.trainings.find((t) => t.id === id);

    if (!training) {
      return res.status(404).json({ error: '연수를 찾을 수 없습니다.' });
    }

    const cleanName = name.trim();
    // Check if staff exists in staff list
    let matchedStaff = db.staff.find((s) => s.id === staffId);
    if (!matchedStaff) {
      matchedStaff = db.staff.find((s) => s.name.trim().toLowerCase() === cleanName.toLowerCase());
    }

    // Remove existing signature for this specific teacher in this training if re-submitting
    db.attendances = db.attendances.filter((a) => {
      if (a.trainingId !== id) return true;
      if (matchedStaff && a.staffId) {
        return a.staffId !== matchedStaff.id;
      }
      if (staffId && a.staffId) {
        return a.staffId !== staffId;
      }
      return a.name.trim().toLowerCase() !== cleanName.toLowerCase();
    });

    const attendanceId = `att-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const newAttendance: Attendance = {
      id: attendanceId,
      trainingId: id,
      staffId: matchedStaff ? matchedStaff.id : (staffId || ''),
      name: cleanName,
      department: department ? department.trim() : (matchedStaff?.department || ''),
      position: position ? position.trim() : (matchedStaff?.position || '교사'),
      signature: signature,
      signedAt: new Date().toISOString(),
      deviceInfo: deviceInfo || req.headers['user-agent'] || '',
    };

    db.attendances.push(newAttendance);
    saveDatabase(db);

    res.status(201).json({
      success: true,
      attendance: newAttendance,
      totalAttendees: db.attendances.filter((a) => a.trainingId === id).length,
    });
  });

  // Delete Specific Attendance
  app.delete('/api/trainings/:id/attendances/:attendanceId', (req: Request, res: Response) => {
    const { id, attendanceId } = req.params;
    const db = getDatabase();

    const beforeCount = db.attendances.length;
    db.attendances = db.attendances.filter((a) => !(a.trainingId === id && a.id === attendanceId));

    if (db.attendances.length === beforeCount) {
      return res.status(404).json({ error: '참석자 기록을 찾을 수 없습니다.' });
    }

    saveDatabase(db);
    res.json({ success: true, message: '참석자 서명이 삭제되었습니다.' });
  });

  // Clear attendances for training
  app.post('/api/trainings/:id/clear-attendances', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getDatabase();
    db.attendances = db.attendances.filter((a) => a.trainingId !== id);
    saveDatabase(db);
    res.json({ success: true, message: '모든 참석자 서명이 초기화되었습니다.' });
  });

  // Seed sample attendees for testing
  app.post('/api/trainings/:id/seed-bulk', (req: Request, res: Response) => {
    const { id } = req.params;
    const db = getDatabase();
    const training = db.trainings.find((t) => t.id === id);
    if (!training) {
      return res.status(404).json({ error: '연수를 찾을 수 없습니다.' });
    }

    // Get target staff for this training
    let targetStaff = db.staff;
    if (training.targetStaffIds && training.targetStaffIds.length > 0) {
      const set = new Set(training.targetStaffIds);
      targetStaff = db.staff.filter((s) => set.has(s.id));
    }

    const newItems: Attendance[] = [];
    targetStaff.forEach((stf, i) => {
      // Check if already signed
      const already = db.attendances.some((a) => a.trainingId === id && a.staffId === stf.id);
      if (!already) {
        const signId = `att-seed-${Date.now().toString(36)}-${i}`;
        const waveY = 20 + ((i * 7) % 25);
        const waveX = 40 + ((i * 11) % 30);
        const svg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="50" viewBox="0 0 160 50"><path d="M15,${waveY} Q${waveX},10 ${waveX + 30},35 T${waveX + 70},20 Q140,${45 - (i % 15)} 150,25" stroke="%231e293b" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;

        newItems.push({
          id: signId,
          trainingId: id,
          staffId: stf.id,
          name: stf.name,
          department: stf.department,
          position: stf.position,
          signature: svg,
          signedAt: new Date(Date.now() - (targetStaff.length - i) * 60000).toISOString(),
          deviceInfo: '샘플 서명 생성',
        });
      }
    });

    db.attendances = [...db.attendances, ...newItems];
    saveDatabase(db);

    res.json({
      success: true,
      addedCount: newItems.length,
      totalCount: db.attendances.filter((a) => a.trainingId === id).length,
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[School Training App] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
