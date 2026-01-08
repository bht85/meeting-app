import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  FileText, 
  PlusCircle, 
  Save, 
  Users, 
  Clock, 
  Briefcase, 
  MessageSquare, 
  Layout, 
  Filter, 
  Download,
  Edit,      
  Trash2,    
  X,
  ExternalLink,
  RotateCcw,
  Archive,
  Megaphone,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Menu
} from 'lucide-react';

// --- Firebase 라이브러리 ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  onSnapshot,
  serverTimestamp,
  doc,          
  updateDoc,    
  deleteDoc     
} from 'firebase/firestore';

// --- [설정] 사용자 Firebase 키값 ---
const firebaseConfig = {
  apiKey: "AIzaSyC7H0WiUxskczCLBn53CQANug3aHlDbpMc",
  authDomain: "my-weekly-meeting.firebaseapp.com",
  projectId: "my-weekly-meeting",
  storageBucket: "my-weekly-meeting.firebasestorage.app",
  messagingSenderId: "902190926046",
  appId: "1:902190926046:web:1dbb8dbfdc75c2c17c1a4f",
  measurementId: "G-ZYR53WCRRV"
};

// --- Firebase 초기화 (안전장치 추가) ---
let app, auth, db;
let firebaseError = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase Init Error:", error);
  // 이미 초기화된 경우를 대비한 처리 (Hot Reloading 등)
  if (!/already exists/.test(error.message)) {
    firebaseError = "Firebase 초기화 실패: 설정값을 확인해주세요.";
  }
}

// --- 상수 데이터 ---
const DEPARTMENTS = ["선택", "재무팀", "재무기획팀", "인사총무팀", "해외사업팀", "구매물류팀", "IT지원팀"];

const SECTIONS = [
  { id: 'report', label: '가. 보고사항', icon: FileText, placeholder: '내용 입력 (특이사항 없을 시 자동 처리)' },
  { id: 'progress', label: '나. 진행업무', icon: Clock, placeholder: '내용 입력' },
  { id: 'discussion', label: '다. 협의업무', icon: MessageSquare, placeholder: '내용 입력' }
];

const FEEDBACK_TEAMS = [
  { id: 'finance', label: '재무팀' },
  { id: 'hr', label: '인사총무팀' },
  { id: 'global', label: '해외사업팀' },
  { id: 'logistics', label: '구매물류팀' },
  { id: 'it', label: 'IT지원팀' }
];

// --- 메인 컴포넌트 ---
export default function App() {
  // 상태 관리
  const [user, setUser] = useState(null);
  const [minutes, setMinutes] = useState([]); 
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(firebaseError);

  // 화면 전환 ('minutes': 부서회의록, 'management': 경영본부)
  const [currentView, setCurrentView] = useState('minutes');

  // 모달(팝업) 상태
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false); 

  // 필터 및 입력 상태
  const [selectedDate, setSelectedDate] = useState('recent');
  const [selectedDept, setSelectedDept] = useState('전체');
  
  const [inputDate, setInputDate] = useState(''); 
  const [inputDept, setInputDept] = useState(DEPARTMENTS[0]); 
  const [inputData, setInputData] = useState({ report: '', progress: '', discussion: '' });
  
  const [feedbackInputDate, setFeedbackInputDate] = useState('');
  const [feedbackInputData, setFeedbackInputData] = useState({ finance: '', hr: '', global: '', logistics: '', it: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);

  // 모바일 메뉴 상태
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- 초기화 및 데이터 로드 ---
  useEffect(() => {
    if (!auth) return;

    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Error:", err);
        setErrorMsg("로그인 연결 실패. 네트워크 상태를 확인하세요.");
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    // 1. 부서 회의록 구독
    const q1 = query(collection(db, 'weekly_minutes'));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return DEPARTMENTS.indexOf(a.department) - DEPARTMENTS.indexOf(b.department);
      });
      setMinutes(loaded);
    }, (err) => {
      console.error("Data Load Error (Minutes):", err);
      setErrorMsg("데이터 로딩 실패 (Firestore 권한 확인 필요)");
    });

    // 2. 경영본부 회의록 구독
    const q2 = query(collection(db, 'management_feedbacks'));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      loaded.sort((a, b) => b.date.localeCompare(a.date));
      setFeedbacks(loaded);
      setLoading(false);
    }, (err) => {
      console.error("Data Load Error (Feedbacks):", err);
    });

    return () => { unsub1(); unsub2(); };
  }, [user]);

  // --- 유틸리티 함수 ---
  const validateDate = (dateStr) => {
    if (!dateStr) { alert("날짜를 선택하세요."); return false; }
    const date = new Date(dateStr);
    if (date.getDay() !== 1) { alert("주간회의는 '월요일' 일자만 선택 가능합니다."); return false; }
    return true;
  };

  const processText = (text) => {
    const t = text ? text.trim() : '';
    return (t === '' || t === '-') ? '     - 특이사항 없음' : text;
  };

  const autoFormat = (val, setFunc, field, e) => {
    // 엔터키 입력 시 자동 들여쓰기
    if (e.key === 'Enter') {
        e.preventDefault();
        const { selectionStart, selectionEnd } = e.target;
        const newVal = val.substring(0, selectionStart) + '\n     - ' + val.substring(selectionEnd);
        setFunc(prev => ({ ...prev, [field]: newVal }));
        // 커서 위치 조정 (React state update 비동기 고려 setTimeout 사용)
        setTimeout(() => {
            e.target.selectionStart = e.target.selectionEnd = selectionStart + 8;
        }, 0);
    }
  };

  const autoFocus = (val, setFunc, field) => {
    if (!val || val.trim() === '') {
        setFunc(prev => ({ ...prev, [field]: '     - ' }));
    }
  };

  // --- 핸들러: 부서 회의록 ---
  const handleMinuteSubmit = async (e) => {
    e.preventDefault();
    if (!validateDate(inputDate)) return;
    if (inputDept === "선택") { alert("부서를 선택하세요."); return; }
    
    setIsSubmitting(true);
    const payload = {
        date: inputDate,
        department: inputDept,
        report: processText(inputData.report),
        progress: processText(inputData.progress),
        discussion: processText(inputData.discussion),
        authorId: user.uid,
        createdAt: serverTimestamp()
    };

    try {
        if (editingId) {
            await updateDoc(doc(db, 'weekly_minutes', editingId), payload);
            alert("수정 완료");
        } else {
            await addDoc(collection(db, 'weekly_minutes'), payload);
            alert("저장 완료");
        }
        setIsModalOpen(false);
        setEditingId(null);
        setInputData({ report: '', progress: '', discussion: '' });
    } catch (err) {
        alert("저장 실패: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- 핸들러: 경영본부 회의록 ---
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!validateDate(feedbackInputDate)) return;

    setIsSubmitting(true);
    const payload = {
        date: feedbackInputDate,
        finance: processText(feedbackInputData.finance),
        hr: processText(feedbackInputData.hr),
        global: processText(feedbackInputData.global),
        logistics: processText(feedbackInputData.logistics),
        it: processText(feedbackInputData.it),
        authorId: user.uid,
        createdAt: serverTimestamp()
    };

    try {
        if (editingFeedbackId) {
            await updateDoc(doc(db, 'management_feedbacks', editingFeedbackId), payload);
            alert("수정 완료");
        } else {
            await addDoc(collection(db, 'management_feedbacks'), payload);
            alert("저장 완료");
        }
        setIsFeedbackModalOpen(false);
        setEditingFeedbackId(null);
        setFeedbackInputData({ finance: '', hr: '', global: '', logistics: '', it: '' });
    } catch (err) {
        alert("저장 실패: " + err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- 렌더링 헬퍼 ---
  const renderText = (text) => {
    if (!text) return <span className="text-gray-400">-</span>;
    return text.split('\n').map((line, i) => (
        <div key={i} className={`whitespace-pre-wrap ${line.trim().startsWith('-') ? 'pl-0' : 'pl-4'}`}>
            {line}
        </div>
    ));
  };

  // --- 데이터 필터링 ---
  const allDates = [...new Set([...minutes.map(m => m.date), ...feedbacks.map(f => f.date)])].sort((a, b) => b.localeCompare(a));
  const filteredDates = selectedDate === 'recent' ? allDates.slice(0, 2) : (selectedDate ? [selectedDate] : allDates);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">시스템 데이터를 불러오는 중...</p>
    </div>
  );

  if (errorMsg) return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">시스템 오류</h2>
            <p className="text-gray-600 mb-4">{errorMsg}</p>
            <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
                새로고침
            </button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 pb-20">
      
      {/* 상단 네비게이션 */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center text-blue-700 font-bold text-xl">
                <Layout className="w-6 h-6 mr-2" />
                <span className="hidden sm:inline">주간회의 시스템</span>
                <span className="sm:hidden">주간회의</span>
              </div>
              
              {/* PC 버전 탭 메뉴 */}
              <div className="hidden md:flex ml-10 space-x-1">
                <button
                    onClick={() => setCurrentView('minutes')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentView === 'minutes' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <div className="flex items-center"><Users className="w-4 h-4 mr-2"/>부서 회의록</div>
                </button>
                <button
                    onClick={() => setCurrentView('management')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        currentView === 'management' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <div className="flex items-center"><Megaphone className="w-4 h-4 mr-2"/>경영본부 회의</div>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
                <a href="https://composecoffee1-my.sharepoint.com/:x:/g/personal/choihy_composecoffee_co_kr/IQBRHgvwRo3ZT5ytCTKVpBlRAcE4zXsMEqjohnr8xTI-RJ0?rtime=CQM385lC3kg" 
                   target="_blank" rel="noreferrer"
                   className="hidden md:flex items-center px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                >
                    <Archive className="w-4 h-4 mr-1"/> 기존 자료
                </a>
                
                {/* 작성 버튼 (현재 뷰에 따라 달라짐) */}
                <button
                    onClick={() => currentView === 'minutes' ? setIsModalOpen(true) : setIsFeedbackModalOpen(true)}
                    className={`flex items-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-colors ${
                        currentView === 'minutes' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{currentView === 'minutes' ? '회의록 작성' : '경영본부 의견 작성'}</span>
                    <span className="sm:hidden">작성</span>
                </button>

                {/* 모바일 메뉴 버튼 */}
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-500">
                    <Menu className="w-6 h-6" />
                </button>
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 드롭다운 */}
        {isMobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-slate-200 p-2 space-y-2 shadow-lg">
                <button onClick={() => { setCurrentView('minutes'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-md flex items-center ${currentView === 'minutes' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}>
                    <Users className="w-5 h-5 mr-3"/> 부서 회의록
                </button>
                <button onClick={() => { setCurrentView('management'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 rounded-md flex items-center ${currentView === 'management' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600'}`}>
                    <Megaphone className="w-5 h-5 mr-3"/> 경영본부 회의
                </button>
            </div>
        )}
      </nav>

      {/* 메인 컨텐츠 영역 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* VIEW 1: 부서 회의록 */}
        {currentView === 'minutes' && (
            <div className="space-y-6">
                {/* 필터 바 */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="form-select text-sm border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            <option value="recent">최근 2주</option>
                            <option value="">전체 날짜</option>
                            {allDates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="form-select text-sm border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            <option value="전체">전체 부서</option>
                            {DEPARTMENTS.filter(d => d !== '선택').map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                </div>

                {/* 회의록 리스트 */}
                <div className="space-y-8">
                    {filteredDates.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                            <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 text-lg">등록된 회의록이 없습니다.</p>
                        </div>
                    ) : filteredDates.map(date => {
                        const daysMinutes = minutes.filter(m => m.date === date && (selectedDept === '전체' || m.department === selectedDept));
                        if (daysMinutes.length === 0) return null;

                        return (
                            <div key={date} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex items-center space-x-3">
                                    <span className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded-full shadow-sm flex items-center">
                                        <Calendar className="w-3 h-3 mr-1"/> {date}
                                    </span>
                                    <div className="h-px bg-slate-300 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {daysMinutes.map(minute => (
                                        <div key={minute.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group overflow-hidden">
                                            <div className="p-5">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-lg font-bold text-slate-800 flex items-center">
                                                        <span className="w-2 h-6 bg-blue-500 rounded-sm mr-2"></span>
                                                        {minute.department}
                                                    </h3>
                                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => {
                                                            setEditingId(minute.id); setInputDate(minute.date); setInputDept(minute.department);
                                                            setInputData({ report: minute.report, progress: minute.progress, discussion: minute.discussion });
                                                            setIsModalOpen(true);
                                                        }} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={async () => {
                                                            if (window.confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, 'weekly_minutes', minute.id));
                                                        }} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="space-y-4 text-sm">
                                                    {[
                                                        { label: '보고사항', bg: 'bg-blue-50', text: 'text-blue-800', val: minute.report },
                                                        { label: '진행업무', bg: 'bg-emerald-50', text: 'text-emerald-800', val: minute.progress },
                                                        { label: '협의업무', bg: 'bg-amber-50', text: 'text-amber-800', val: minute.discussion }
                                                    ].map((section, idx) => (
                                                        <div key={idx} className={`${section.bg} p-3 rounded-lg`}>
                                                            <div className={`font-bold ${section.text} text-xs mb-1`}>{section.label}</div>
                                                            <div className="text-slate-700 leading-relaxed">{renderText(section.val)}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* VIEW 2: 경영본부 회의록 */}
        {currentView === 'management' && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                <div className="bg-indigo-600 rounded-xl p-8 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold mb-2 flex items-center">
                            <Megaphone className="w-8 h-8 mr-3 text-indigo-200" />
                            경영지원본부 주간회의
                        </h2>
                        <p className="text-indigo-100 max-w-2xl">
                            본부 주관 회의에서 결정된 팀별 지시사항 및 협의 내용을 확인하는 공간입니다.
                            날짜별로 각 팀의 핵심 안건을 한눈에 파악할 수 있습니다.
                        </p>
                    </div>
                    <Megaphone className="absolute -bottom-10 -right-10 w-64 h-64 text-indigo-500 opacity-20 transform rotate-12" />
                </div>

                <div className="space-y-8">
                    {feedbacks.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-indigo-200">
                            <Megaphone className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
                            <p className="text-slate-500 text-lg">등록된 경영본부 회의록이 없습니다.</p>
                        </div>
                    ) : feedbacks.map(fb => (
                        <div key={fb.id} className="bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden">
                            <div className="bg-indigo-50 px-6 py-4 flex justify-between items-center border-b border-indigo-100">
                                <h3 className="text-lg font-bold text-indigo-900 flex items-center">
                                    <Calendar className="w-5 h-5 mr-2 text-indigo-500"/>
                                    {fb.date} 회의록
                                </h3>
                                <div className="flex space-x-2">
                                    <button onClick={() => {
                                        setEditingFeedbackId(fb.id); setFeedbackInputDate(fb.date);
                                        setFeedbackInputData({ finance: fb.finance, hr: fb.hr, global: fb.global, logistics: fb.logistics, it: fb.it });
                                        setIsFeedbackModalOpen(true);
                                    }} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded text-xs font-bold transition-colors">
                                        수정
                                    </button>
                                    <button onClick={async () => {
                                        if (window.confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, 'management_feedbacks', fb.id));
                                    }} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded text-xs font-bold transition-colors">
                                        삭제
                                    </button>
                                </div>
                            </div>
                            
                            {/* 5열 가로 배치 (요청사항 반영) */}
                            <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-indigo-50">
                                {FEEDBACK_TEAMS.map(team => (
                                    <div key={team.id} className="p-5 hover:bg-slate-50 transition-colors">
                                        <h4 className="font-bold text-indigo-900 mb-3 text-sm border-b-2 border-indigo-100 pb-2 inline-block">
                                            {team.label}
                                        </h4>
                                        <div className="text-sm text-slate-700 leading-relaxed min-h-[80px]">
                                            {renderText(fb[team.id])}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

      </main>

      {/* 모달 1: 부서 회의록 작성 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-blue-600 p-4 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-white font-bold text-lg flex items-center">
                        {editingId ? <Edit className="w-5 h-5 mr-2"/> : <PlusCircle className="w-5 h-5 mr-2"/>}
                        {editingId ? '회의록 수정' : '주간회의록 작성'}
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-blue-100 hover:text-white"><X className="w-6 h-6"/></button>
                </div>
                <form onSubmit={handleMinuteSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">날짜 (월요일)</label>
                            <input type="date" required value={inputDate} onChange={e => setInputDate(e.target.value)} 
                                   className="w-full border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">부서</label>
                            <select value={inputDept} onChange={e => setInputDept(e.target.value)} 
                                    className="w-full border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {SECTIONS.map(s => (
                            <div key={s.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="flex items-center text-sm font-bold text-slate-800 mb-2">
                                    <s.icon className="w-4 h-4 mr-2 text-blue-600"/> {s.label}
                                </label>
                                <textarea 
                                    value={inputData[s.id]}
                                    onChange={e => setInputData({...inputData, [s.id]: e.target.value})}
                                    onFocus={() => autoFocus(inputData[s.id], setInputData, s.id)}
                                    onKeyDown={(e) => autoFormat(inputData[s.id], setInputData, s.id, e)}
                                    placeholder={s.placeholder}
                                    className="w-full border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 h-24"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 mr-2 hover:bg-slate-100 rounded-md">취소</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold shadow-sm">
                            {isSubmitting ? '저장 중...' : '저장하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* 모달 2: 경영본부 의견 작성 */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="bg-indigo-600 p-4 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-white font-bold text-lg flex items-center">
                        <Megaphone className="w-5 h-5 mr-2"/> 경영지원본부 회의록 작성
                    </h3>
                    <button onClick={() => setIsFeedbackModalOpen(false)} className="text-indigo-100 hover:text-white"><X className="w-6 h-6"/></button>
                </div>
                <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">회의 날짜 (월요일)</label>
                        <input type="date" required value={feedbackInputDate} onChange={e => setFeedbackInputDate(e.target.value)} 
                               className="w-full max-w-xs border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                        <p className="text-indigo-800 font-bold mb-4 flex items-center text-sm">
                            <CheckCircle2 className="w-4 h-4 mr-2"/> 각 팀별 지시사항 및 협의 내용을 입력하세요.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {FEEDBACK_TEAMS.map(team => (
                                <div key={team.id} className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                                    <label className="block text-sm font-bold text-indigo-900 mb-2 border-b border-indigo-50 pb-1">
                                        {team.label}
                                    </label>
                                    <textarea 
                                        value={feedbackInputData[team.id]}
                                        onChange={e => setFeedbackInputData({...feedbackInputData, [team.id]: e.target.value})}
                                        onFocus={() => autoFocus(feedbackInputData[team.id], setFeedbackInputData, team.id)}
                                        onKeyDown={(e) => autoFormat(feedbackInputData[team.id], setFeedbackInputData, team.id, e)}
                                        placeholder={`${team.label} 의견 입력`}
                                        className="w-full border-slate-200 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500 h-24"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsFeedbackModalOpen(false)} className="px-4 py-2 text-slate-600 mr-2 hover:bg-slate-100 rounded-md">취소</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold shadow-sm">
                            {isSubmitting ? '저장 중...' : '저장하기'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}
