import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchTrainings,
  fetchTraining,
  deleteTraining,
  fetchSchoolConfig,
} from './api';
import { Training, Attendance, SchoolConfig } from './types';
import { Navbar } from './components/Navbar';
import { AdminTrainingList } from './components/AdminTrainingList';
import { TeacherPortal } from './components/TeacherPortal';
import { TrainingFormModal } from './components/TrainingFormModal';
import { StaffManagementModal } from './components/StaffManagementModal';
import { AttendeesModal } from './components/AttendeesModal';
import { QRModal } from './components/QRModal';
import { PrintRegisterModal } from './components/PrintRegisterModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminChangePasswordModal } from './components/AdminChangePasswordModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>({
    schoolName: '인천비즈니스고등학교',
    defaultApprovalLine: ['담당', '부장', '교감', '교장'],
    showApprovalLine: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state: default to 'teacher' (Teacher Sign Portal first)
  const [currentView, setCurrentView] = useState<'teacher' | 'admin'>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasAdminAuth = localStorage.getItem('school_admin_auth') === 'true';
    if (params.get('view') === 'admin' && hasAdminAuth) {
      return 'admin';
    }
    return 'teacher';
  });

  const [activeSignTrainingId, setActiveSignTrainingId] = useState<string | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('school_admin_auth') === 'true';
  });

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [trainingToEdit, setTrainingToEdit] = useState<Training | null>(null);

  // Attendees Modal
  const [selectedTrainingForAttendees, setSelectedTrainingForAttendees] = useState<Training | null>(null);
  const [attendancesForModal, setAttendancesForModal] = useState<Attendance[]>([]);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);

  // QR Modal
  const [selectedTrainingForQR, setSelectedTrainingForQR] = useState<Training | null>(null);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Print Modal
  const [selectedTrainingForPrint, setSelectedTrainingForPrint] = useState<Training | null>(null);
  const [attendancesForPrint, setAttendancesForPrint] = useState<Attendance[]>([]);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Privacy Policy Modal
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Parse URL on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const signId = params.get('sign');
    const viewParam = params.get('view');
    const hasAdminAuth = localStorage.getItem('school_admin_auth') === 'true';

    if (signId) {
      setActiveSignTrainingId(signId);
      setCurrentView('teacher');
    } else if (viewParam === 'admin' && hasAdminAuth) {
      setCurrentView('admin');
    } else {
      setCurrentView('teacher');
    }
  }, []);

  // Fetch initial trainings & school config
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [trainingsData, configData] = await Promise.all([
        fetchTrainings(),
        fetchSchoolConfig().catch(() => ({
          schoolName: '인천비즈니스고등학교',
          defaultApprovalLine: ['담당', '부장', '교감', '교장'],
          showApprovalLine: false,
        })),
      ]);
      setTrainings(trainingsData);
      setSchoolConfig(configData);
    } catch (err: any) {
      console.error('Error fetching initial data:', err);
      setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Navigate to Teacher Sign Portal
  const handleNavigateToSign = (trainingId?: string) => {
    const url = new URL(window.location.href);
    if (trainingId) {
      url.searchParams.set('sign', trainingId);
      setActiveSignTrainingId(trainingId);
    } else {
      url.searchParams.set('view', 'teacher');
      url.searchParams.delete('sign');
      setActiveSignTrainingId(null);
    }
    window.history.pushState({}, '', url.toString());
    setCurrentView('teacher');
  };

  // Request to switch to Admin View (requires password login if not authenticated)
  const handleRequestAdminMode = () => {
    if (isAdminAuthenticated) {
      const url = new URL(window.location.href);
      url.searchParams.delete('sign');
      url.searchParams.set('view', 'admin');
      window.history.pushState({}, '', url.toString());
      setActiveSignTrainingId(null);
      setCurrentView('admin');
      loadInitialData();
    } else {
      setIsLoginModalOpen(true);
    }
  };

  // Admin login verified successfully
  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    const url = new URL(window.location.href);
    url.searchParams.delete('sign');
    url.searchParams.set('view', 'admin');
    window.history.pushState({}, '', url.toString());
    setActiveSignTrainingId(null);
    setCurrentView('admin');
    loadInitialData();
  };

  // Admin Logout
  const handleAdminLogout = () => {
    localStorage.removeItem('school_admin_auth');
    setIsAdminAuthenticated(false);
    handleNavigateToSign();
  };

  // Delete Training Handler
  const handleDeleteTraining = async (training: Training) => {
    if (!window.confirm(`‘${training.title}’ 연수를 삭제하시겠습니까?\n등록된 모든 참석자의 서명 데이터도 함께 삭제됩니다.`)) {
      return;
    }
    try {
      await deleteTraining(training.id);
      loadInitialData();
    } catch (err: any) {
      alert(err.message || '연수 삭제에 실패했습니다.');
    }
  };

  // Open Attendees Modal
  const handleOpenAttendees = async (training: Training) => {
    try {
      const data = await fetchTraining(training.id);
      setSelectedTrainingForAttendees({
        ...data.training,
        targetStaff: data.targetStaff,
      });
      setAttendancesForModal(data.attendances);
      setIsAttendeesModalOpen(true);
    } catch (err: any) {
      alert(err.message || '참석자 목록을 불러올 수 없습니다.');
    }
  };

  const handleRefreshAttendees = async () => {
    if (!selectedTrainingForAttendees) return;
    try {
      const data = await fetchTraining(selectedTrainingForAttendees.id);
      setSelectedTrainingForAttendees({
        ...data.training,
        targetStaff: data.targetStaff,
      });
      setAttendancesForModal(data.attendances);
      loadInitialData();
    } catch (err: any) {
      console.error(err);
    }
  };

  // Open QR Modal
  const handleOpenQR = (training: Training) => {
    setSelectedTrainingForQR(training);
    setIsQRModalOpen(true);
  };

  // Open Print Modal
  const handleOpenPrint = async (training: Training) => {
    try {
      const data = await fetchTraining(training.id);
      setSelectedTrainingForPrint({
        ...data.training,
        targetStaff: data.targetStaff,
      });
      setAttendancesForPrint(data.attendances);
      setIsPrintModalOpen(true);
    } catch (err: any) {
      alert(err.message || '서명부 정보를 불러올 수 없습니다.');
    }
  };

  // If in Teacher Portal View
  if (currentView === 'teacher') {
    return (
      <>
        <TeacherPortal
          schoolName={schoolConfig.schoolName}
          targetTrainingId={activeSignTrainingId}
          onSwitchToAdmin={handleRequestAdminMode}
        />
        <AdminLoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
          onSuccess={handleAdminLoginSuccess}
        />
      </>
    );
  }

  // Admin Dashboard View
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      <Navbar
        currentView="admin"
        schoolName={schoolConfig.schoolName}
        isAdminAuthenticated={isAdminAuthenticated}
        onSwitchToAdmin={handleRequestAdminMode}
        onSwitchToSign={() => handleNavigateToSign()}
        onOpenChangePassword={() => setIsChangePasswordModalOpen(true)}
        onLogoutAdmin={handleAdminLogout}
      />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {loading && trainings.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500 text-xs font-medium">연수 정보를 불러오는 중입니다...</p>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-xs">{error}</p>
            </div>
            <button
              onClick={loadInitialData}
              className="px-3 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 cursor-pointer"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <AdminTrainingList
            trainings={trainings}
            onOpenCreate={() => {
              setTrainingToEdit(null);
              setIsCreateModalOpen(true);
            }}
            onOpenEdit={(training) => {
              setTrainingToEdit(training);
              setIsCreateModalOpen(true);
            }}
            onDelete={handleDeleteTraining}
            onOpenAttendees={handleOpenAttendees}
            onOpenQR={handleOpenQR}
            onOpenPrint={handleOpenPrint}
            onNavigateToSign={(id) => handleNavigateToSign(id)}
            onOpenStaffManagement={() => setIsStaffModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="print:hidden border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-400">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 text-slate-500">
          <span>Version 1.0.0 (2026)</span>
          <span className="hidden sm:inline text-slate-300">·</span>
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="text-slate-600 hover:text-slate-900 underline font-medium cursor-pointer transition-colors"
          >
            개인정보처리방침
          </button>
          <span className="hidden sm:inline text-slate-300">·</span>
          <span>© INBIGO. All Rights Reserved.</span>
        </div>
      </footer>

      {/* Create / Edit Training Modal */}
      <TrainingFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        trainingToEdit={trainingToEdit}
        defaultSchoolName={schoolConfig.schoolName}
        onSuccess={() => {
          loadInitialData();
        }}
      />

      {/* Staff Master Management Modal */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onStaffUpdated={() => {
          loadInitialData();
        }}
      />

      {/* Attendees Management Modal */}
      {selectedTrainingForAttendees && (
        <AttendeesModal
          isOpen={isAttendeesModalOpen}
          onClose={() => setIsAttendeesModalOpen(false)}
          training={selectedTrainingForAttendees}
          attendances={attendancesForModal}
          onRefresh={handleRefreshAttendees}
          onOpenPrint={() => {
            setIsAttendeesModalOpen(false);
            handleOpenPrint(selectedTrainingForAttendees);
          }}
        />
      )}

      {/* QR Code Presentation Modal */}
      {selectedTrainingForQR && (
        <QRModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          training={selectedTrainingForQR}
        />
      )}

      {/* A4 Print Register Modal */}
      {selectedTrainingForPrint && (
        <PrintRegisterModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          training={selectedTrainingForPrint}
          attendances={attendancesForPrint}
          onRefresh={loadInitialData}
        />
      )}

      {/* Admin Login Modal */}
      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />

      {/* Admin Change Password Modal */}
      <AdminChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        isAdmin={isAdminAuthenticated}
      />
    </div>
  );
}
