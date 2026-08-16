import { Training, Attendance, SchoolConfig, Staff } from './types';

const STORAGE_KEY = 'school_training_local_db_v1';

export const defaultSampleStaff: Staff[] = [
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

export interface LocalDatabaseSchema {
  config: SchoolConfig;
  staff: Staff[];
  trainings: Training[];
  attendances: Attendance[];
  adminPassword?: string;
}

const initialLocalData: LocalDatabaseSchema = {
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      targetStaffIds: [
        'stf-01', 'stf-02', 'stf-03', 'stf-05', 'stf-06', 'stf-07', 'stf-08',
        'stf-09', 'stf-10', 'stf-11', 'stf-12', 'stf-13', 'stf-14', 'stf-15', 'stf-16'
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ],
  attendances: [
    {
      id: 'att-seed-01',
      trainingId: 'train-20260820-01',
      staffId: 'stf-01',
      name: '김진수',
      department: '교육과정연구부',
      position: '부장교사',
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M20,35 Q50,15 70,35 T120,25 Q140,40 150,20" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
      signedAt: new Date().toISOString(),
      deviceInfo: 'Chrome'
    },
    {
      id: 'att-seed-02',
      trainingId: 'train-20260820-01',
      staffId: 'stf-05',
      name: '이수진',
      department: '진로진학상담부',
      position: '부장교사',
      signature: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="60" viewBox="0 0 160 60"><path d="M25,20 Q40,45 60,30 T100,35 Q130,20 145,45" stroke="%231e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
      signedAt: new Date().toISOString(),
      deviceInfo: 'Mobile Safari'
    }
  ]
};

export function getLocalDB(): LocalDatabaseSchema {
  try {
    const item = localStorage.getItem(STORAGE_KEY);
    if (!item) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialLocalData));
      return JSON.parse(JSON.stringify(initialLocalData));
    }
    const parsed = JSON.parse(item);
    // Automatic migration to 인천비즈니스고등학교
    if (!parsed.config || parsed.config.schoolName === '가온초등학교') {
      parsed.config = {
        ...parsed.config,
        schoolName: '인천비즈니스고등학교',
      };
    }
    if (parsed.trainings) {
      parsed.trainings.forEach((t: Training) => {
        if (!t.schoolName || t.schoolName === '가온초등학교') {
          t.schoolName = '인천비즈니스고등학교';
        }
      });
    }
    if (!parsed.staff || parsed.staff.length === 0) {
      parsed.staff = defaultSampleStaff;
    }
    if (!parsed.trainings) parsed.trainings = [];
    if (!parsed.attendances) parsed.attendances = [];
    saveLocalDB(parsed);
    return parsed;
  } catch (err) {
    return JSON.parse(JSON.stringify(initialLocalData));
  }
}

export function saveLocalDB(data: LocalDatabaseSchema): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save localStorage:', err);
  }
}

