import React, { useState, useEffect } from 'react';
// ReactDOM import 제거 (불필요한 중복 실행 방지)
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
  Menu,      
  CheckCircle2, 
  Loader2    
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

// --- [설정] 사용자분의 Firebase 키값 적용 ---
const firebaseConfig = {
  apiKey: "AIzaSyC7H0WiUxskczCLBn53CQANug3aHlDbpMc",
  authDomain: "my-weekly-meeting.firebaseapp.com",
  projectId: "my-weekly-meeting",
  storageBucket: "my-weekly-meeting.firebasestorage.app",
  messagingSenderId: "902190926046",
  appId: "1:902190926046:web:1dbb8dbfdc75c2c17c1a4f",
  measurementId: "G-ZYR53WCRRV"
};

// --- Firebase 초기화 ---
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (error) {
  if (!/already exists/.test(error.message)) {
    console.error('Firebase initialization error', error.stack);
  }
}
const auth = getAuth(app);
const db = getFirestore(app);

// --- 상수 데이터 ---
const DEPARTMENTS = [
  "선택", 
  "재무팀", 
  "재무기획팀",
  "인사총무팀", 
  "해외사업팀", 
  "구매물류팀", 
  "IT지원팀"
];

const SECTIONS = [
  { id: 'report', label: '가. 보고사항', icon: FileText, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' },
  { id: 'progress', label: '나. 진행업무', icon: Clock, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' },
  { id: 'discussion', label: '다. 협의업무', icon: MessageSquare, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' }
];

// 경영지원본부 회의 의견 작성용 팀 리스트
const FEEDBACK_TEAMS = [
  { id: 'finance', label: '재무팀' },
  { id: 'hr', label: '인사총무팀' },
  { id: 'global', label: '해외사업팀' },
  { id: 'logistics', label: '구매물류팀' },
  { id: 'it', label: 'IT지원팀' }
];

// --- 메인 앱 컴포넌트 ---
function App() {
  const [user, setUser] = useState(null);
  
  // 데이터 상태
  const [minutes, setMinutes] = useState([]); // 부서 회의록
  const [feedbacks, setFeedbacks] = useState([]); // 경영본부 회의록
  const [loading, setLoading] = useState(true);
  
  // 뷰 상태 관리 ('minutes': 일반 회의록, 'management': 경영본부)
  const [currentView, setCurrentView] = useState('minutes');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  
  // 필터 상태
  const [selectedDate, setSelectedDate] = useState('recent');
  const [selectedDept, setSelectedDept] = useState('전체');

  // 입력 상태 (부서 회의록)
  const [inputDate, setInputDate] = useState(''); 
  const [inputDept, setInputDept] = useState(DEPARTMENTS[0]); 
  const [inputData, setInputData] = useState({ report: '', progress: '', discussion: '' });
  
  // 입력 상태 (경영본부 회의록)
  const [feedbackInputDate, setFeedbackInputDate] = useState('');
  const [feedbackInputData, setFeedbackInputData] = useState({ finance: '', hr: '', global: '', logistics: '', it: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null);

  // 인증 및 데이터 구독
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (error) {
        console.error("인증 오류:", error);
      }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // 1. 부서 회의록 구독
    const q1 = query(collection(db, 'weekly_minutes'));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loaded.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return DEPARTMENTS.indexOf(a.department) - DEPARTMENTS.indexOf(b.department);
      });
      setMinutes(loaded);
    });

    // 2. 경영본부 회의록 구독
    const q2 = query(collection(db, 'management_feedbacks'));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loaded.sort((a, b) => b.date.localeCompare(a.date));
      setFeedbacks(loaded);
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, [user]);

  // --- 공통 헬퍼 함수 ---
  const validateDate = (dateStr) => {
    if (!dateStr) { alert("날짜를 선택해주세요."); return false; }
    const dateObj = new Date(dateStr);
    if (dateObj.getDay() !== 1) { 
      alert("주간회의는 '월요일' 일자만 선택 가능합니다.");
      return false;
    }
    return true;
  };

  const processText = (text) => {
    const t = text ? text.trim() : '';
    return (t === '' || t === '-') ? '     - 특이사항 없음' : text;
  };

  const autoFormat = (val, setFunc, field, e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const { selectionStart, selectionEnd } = e.target;
        const newVal = val.substring(0, selectionStart) + '\n     - ' + val.substring(selectionEnd);
        setFunc(prev => ({ ...prev, [field]: newVal }));
        setTimeout(() => {
            if(e.target) {
                e.target.selectionStart = selectionStart + 8;
                e.target.selectionEnd = selectionStart + 8;
            }
        }, 0);
    }
  };

  const autoFocus = (val, setFunc, field) => {
    if (!val || val.trim() === '') {
        setFunc(prev => ({ ...prev, [field]: '     - ' }));
    }
  };

  // --- 부서 회의록 핸들러 ---
  const handleMinuteSubmit = async (e) => {
    e.preventDefault();
    if (!validateDate(inputDate)) return;
    if (inputDept === "선택") { alert("부서를 선택해주세요."); return; }
    if (!user) { alert("서버 연결 중입니다."); return; }
    
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
        await updateDoc(doc(db, "weekly_minutes", editingId), { ...payload, updatedAt: serverTimestamp() });
        alert('수정되었습니다.');
      } else {
        await addDoc(collection(db, 'weekly_minutes'), payload);
        alert('등록되었습니다.');
      }
      handleCloseModal();
    } catch (error) {
      console.error("저장 오류:", error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 경영본부 회의록 핸들러 ---
  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!validateDate(feedbackInputDate)) return;
    if (!user) { alert("서버 연결 중입니다."); return; }

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
        await updateDoc(doc(db, "management_feedbacks", editingFeedbackId), { ...payload, updatedAt: serverTimestamp() });
        alert('수정되었습니다.');
      } else {
        await addDoc(collection(db, "management_feedbacks"), payload);
        alert('등록되었습니다.');
      }
      handleCloseFeedbackModal();
    } catch (error) {
      console.error("저장 오류:", error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기 및 초기화
  const handleCloseModal = () => {
    setEditingId(null);
    setInputData({ report: '', progress: '', discussion: '' });
    setInputDate(''); setInputDept(DEPARTMENTS[0]);
    setIsModalOpen(false);
  };

  const handleCloseFeedbackModal = () => {
    setEditingFeedbackId(null);
    setFeedbackInputData({ finance: '', hr: '', global: '', logistics: '', it: '' });
    setFeedbackInputDate('');
    setIsFeedbackModalOpen(false);
  };

  // 지난주 불러오기
  const handleLoadLastWeek = () => {
    if (inputDept === '선택') { alert('부서를 먼저 선택해주세요.'); return; }
    const prev = minutes.filter(m => m.department === inputDept && (!inputDate || m.date < inputDate)).sort((a, b) => b.date.localeCompare(a.date));
    if (prev[0]) {
      if(window.confirm(`${prev[0].date}일자 내용을 불러오시겠습니까?`)) {
        setInputData({ report: prev[0].report || '', progress: prev[0].progress || '', discussion: prev[0].discussion || '' });
      }
    } else { alert('이전 내역이 없습니다.'); }
  };

  // CSV 다운로드 (통합)
  const handleExportCSV = () => {
    let csvContent = "\uFEFF";
    const allDates = [...new Set([...minutes.map(m=>m.date), ...feedbacks.map(f=>f.date)])].sort((a,b)=>b.localeCompare(a));
    const targetDates = selectedDate === 'recent' ? allDates.slice(0, 2) : (selectedDate ? [selectedDate] : allDates);

    const clean = (t) => t ? `"${t.replace(/"/g, '""')}"` : "";
    const format = (t) => t ? t.split('\n').map(l => l.includes('- ') ? `     ${l.trim()}` : `     - ${l.trim()}`).join('\n') : "";

    if (currentView === 'minutes') {
        csvContent += "날짜,부서,구분,내용\n";
        targetDates.forEach(d => {
            minutes.filter(m => m.date === d && (selectedDept === '전체' || m.department === selectedDept)).forEach(m => {
                if(m.report) csvContent += `${m.date},${m.department},보고사항,${clean(format(m.report))}\n`;
                if(m.progress) csvContent += `${m.date},${m.department},진행업무,${clean(format(m.progress))}\n`;
                if(m.discussion) csvContent += `${m.date},${m.department},협의업무,${clean(format(m.discussion))}\n`;
            });
        });
    } else {
        csvContent += "날짜,재무팀,인사총무팀,해외사업팀,구매물류팀,IT지원팀\n";
        targetDates.forEach(d => {
            feedbacks.filter(f => f.date === d).forEach(f => {
                csvContent += `${f.date},${clean(format(f.finance))},${clean(format(f.hr))},${clean(format(f.global))},${clean(format(f.logistics))},${clean(format(f.it))}\n`;
            });
        });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `주간회의록_${currentView}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderText = (text) => {
    if (!text) return <span className="text-gray-400">-</span>;
    return text.split('\n').map((line, i) => (
      <div key={i} className={`whitespace-pre-wrap ${line.trim().startsWith('-') ? '' : 'pl-3'}`}>{line}</div>
    ));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
      <p className="text-gray-500">데이터를 불러오는 중입니다...</p>
    </div>
  );

  const allDates = [...new Set([...minutes.map(m=>m.date), ...feedbacks.map(f=>f.date)])].sort((a,b)=>b.localeCompare(a));
  const filteredDates = selectedDate === 'recent' ? allDates.slice(0, 2) : (selectedDate ? [selectedDate] : allDates);

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800 pb-20">
      {/* 상단 네비게이션 */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center text-blue-700 font-bold text-xl cursor-pointer" onClick={() => setCurrentView('minutes')}>
                <Layout className="w-6 h-6 mr-2" />
                <span className="hidden sm:inline">주간회의 시스템</span>
                <span className="sm:hidden">주간회의</span>
              </div>
              
              {/* PC 탭 메뉴 */}
              <div className="hidden md:flex ml-8 space-x-2">
                <button
                    onClick={() => setCurrentView('minutes')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${currentView === 'minutes' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Users className="w-4 h-4 mr-2"/>부서 회의록
                </button>
                <button
                    onClick={() => setCurrentView('management')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${currentView === 'management' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    <Megaphone className="w-4 h-4 mr-2"/>경영본부 회의
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
                <a href="https://composecoffee1-my.sharepoint.com/:x:/g/personal/choihy_composecoffee_co_kr/IQBRHgvwRo3ZT5ytCTKVpBlRAcE4zXsMEqjohnr8xTI-RJ0?rtime=CQM385lC3kg" 
                   target="_blank" rel="noreferrer"
                   className="hidden md:flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                    <Archive className="w-4 h-4 mr-1"/> 기존 자료
                </a>
                
                <button
                    onClick={() => currentView === 'minutes' ? setIsModalOpen(true) : setIsFeedbackModalOpen(true)}
                    className={`flex items-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-colors ${currentView === 'minutes' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    <PlusCircle className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">{currentView === 'minutes' ? '회의록 작성' : '의견 작성'}</span>
                    <span className="sm:hidden">작성</span>
                </button>

                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-gray-500">
                    <Menu className="w-6 h-6" />
                </button>
            </div>
          </div>
        </div>
        
        {/* 모바일 메뉴 */}
        {isMobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-200">
                <button onClick={() => { setCurrentView('minutes'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 flex items-center ${currentView === 'minutes' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}>
                    <Users className="w-5 h-5 mr-3"/> 부서 회의록
                </button>
                <button onClick={() => { setCurrentView('management'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-3 flex items-center ${currentView === 'management' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}>
                    <Megaphone className="w-5 h-5 mr-3"/> 경영본부 회의
                </button>
            </div>
        )}
      </nav>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* --- [VIEW 1] 부서 회의록 --- */}
        {currentView === 'minutes' && (
            <div className="space-y-6">
                {/* 필터 */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="text-sm border-gray-300 rounded-md shadow-sm p-1.5 border">
                            <option value="recent">최근 2주</option>
                            <option value="">전체 날짜</option>
                            {allDates.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select value={selectedDept} onChange={e => setSelectedDept(e.target.value)} className="text-sm border-gray-300 rounded-md shadow-sm p-1.5 border">
                            <option value="전체">전체 부서</option>
                            {DEPARTMENTS.filter(d => d !== '선택').map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <button onClick={handleExportCSV} className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md shadow-sm">
                        <Download className="w-4 h-4 mr-2" /> 엑셀 다운로드
                    </button>
                </div>

                {/* 리스트 */}
                <div className="space-y-8">
                    {filteredDates.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">등록된 회의록이 없습니다.</p>
                        </div>
                    ) : filteredDates.map(date => {
                        const daysMinutes = minutes.filter(m => m.date === date && (selectedDept === '전체' || m.department === selectedDept));
                        if (daysMinutes.length === 0) return null;

                        return (
                            <div key={date} className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <span className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded-full flex items-center">
                                        <Calendar className="w-3 h-3 mr-1"/> {date}
                                    </span>
                                    <div className="h-px bg-gray-300 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {daysMinutes.map(minute => (
                                        <div key={minute.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all group">
                                            <div className="p-5">
                                                <div className="flex justify-between items-start mb-4">
                                                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                                        <span className="w-1.5 h-6 bg-blue-500 rounded-sm mr-2"></span>
                                                        {minute.department}
                                                    </h3>
                                                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => {
                                                            setEditingId(minute.id); setInputDate(minute.date); setInputDept(minute.department);
                                                            setInputData({ report: minute.report, progress: minute.progress, discussion: minute.discussion });
                                                            setIsModalOpen(true);
                                                        }} className="p-1.5 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                                                        <button onClick={async () => {
                                                            if (window.confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, 'weekly_minutes', minute.id));
                                                        }} className="p-1.5 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                </div>
                                                <div className="space-y-3 text-sm">
                                                    <div className="bg-blue-50 p-3 rounded-lg"><div className="font-bold text-blue-800 text-xs mb-1">보고사항</div><div className="text-gray-700">{renderText(minute.report)}</div></div>
                                                    <div className="bg-emerald-50 p-3 rounded-lg"><div className="font-bold text-emerald-800 text-xs mb-1">진행업무</div><div className="text-gray-700">{renderText(minute.progress)}</div></div>
                                                    <div className="bg-amber-50 p-3 rounded-lg"><div className="font-bold text-amber-800 text-xs mb-1">협의업무</div><div className="text-gray-700">{renderText(minute.discussion)}</div></div>
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

        {/* --- [VIEW 2] 경영본부 회의록 --- */}
        {currentView === 'management' && (
            <div className="space-y-8">
                <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center mb-1"><Megaphone className="w-6 h-6 mr-2"/>경영지원본부 주간회의</h2>
                        <p className="text-indigo-200 text-sm">본부 주관 회의에서 결정된 각 팀별 지시사항 및 협의 내용입니다.</p>
                    </div>
                    <button onClick={handleExportCSV} className="hidden sm:flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-md text-sm font-medium transition-colors">
                        <Download className="w-4 h-4 mr-2"/>전체 다운로드
                    </button>
                </div>

                <div className="space-y-6">
                    {feedbacks.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-indigo-200">
                            <Megaphone className="w-16 h-16 text-indigo-200 mx-auto mb-4" />
                            <p className="text-gray-500">등록된 경영본부 회의록이 없습니다.</p>
                        </div>
                    ) : feedbacks.map(fb => (
                        <div key={fb.id} className="bg-white rounded-xl shadow-md border border-indigo-100 overflow-hidden">
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
                                    }} className="px-3 py-1 bg-white border border-indigo-200 text-indigo-600 rounded text-xs hover:bg-indigo-50">수정</button>
                                    <button onClick={async () => {
                                        if (window.confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, 'management_feedbacks', fb.id));
                                    }} className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded text-xs hover:bg-red-50">삭제</button>
                                </div>
                            </div>
                            
                            {/* 5열 그리드 */}
                            <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-indigo-50">
                                {FEEDBACK_TEAMS.map(team => (
                                    <div key={team.id} className="p-5 hover:bg-gray-50">
                                        <h4 className="font-bold text-indigo-900 mb-2 text-sm border-b-2 border-indigo-100 inline-block pb-1">{team.label}</h4>
                                        <div className="text-sm text-gray-700 min-h-[60px]">{renderText(fb[team.id])}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      {/* 모달 1: 부서 회의록 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-blue-600 p-4 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-white font-bold text-lg flex items-center">
                        {editingId ? <Edit className="w-5 h-5 mr-2"/> : <PlusCircle className="w-5 h-5 mr-2"/>}
                        {editingId ? '회의록 수정' : '주간회의록 작성'}
                    </h3>
                    <button onClick={handleCloseModal} className="text-blue-100 hover:text-white"><X className="w-6 h-6"/></button>
                </div>
                <form onSubmit={handleMinuteSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">날짜 (월요일)</label>
                            <input type="date" required value={inputDate} onChange={e => setInputDate(e.target.value)} className="w-full border-gray-300 rounded-md p-2 border" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">부서</label>
                            <select value={inputDept} onChange={e => setInputDept(e.target.value)} className="w-full border-gray-300 rounded-md p-2 border">
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {SECTIONS.map(s => (
                            <div key={s.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="flex items-center text-sm font-bold text-gray-800 mb-2"><s.icon className="w-4 h-4 mr-2 text-blue-600"/>{s.label}</label>
                                <textarea 
                                    value={inputData[s.id]}
                                    onChange={e => setInputData({...inputData, [s.id]: e.target.value})}
                                    onFocus={() => autoFocus(inputData[s.id], setInputData, s.id)}
                                    onKeyDown={(e) => autoFormat(inputData[s.id], setInputData, s.id, e)}
                                    placeholder={s.placeholder}
                                    className="w-full border-gray-300 rounded-md text-sm p-3 border h-24"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-600 mr-2 hover:bg-gray-100 rounded-md">취소</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold">{isSubmitting ? '저장 중...' : '저장하기'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* 모달 2: 경영본부 회의록 */}
      {isFeedbackModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="bg-indigo-600 p-4 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-white font-bold text-lg flex items-center">
                        <Megaphone className="w-5 h-5 mr-2"/> 경영본부 의견 작성
                    </h3>
                    <button onClick={handleCloseFeedbackModal} className="text-indigo-100 hover:text-white"><X className="w-6 h-6"/></button>
                </div>
                <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">회의 날짜 (월요일)</label>
                        <input type="date" required value={feedbackInputDate} onChange={e => setFeedbackInputDate(e.target.value)} className="w-full max-w-xs border-gray-300 rounded-md p-2 border" />
                    </div>
                    
                    <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
                        <p className="text-indigo-800 font-bold mb-4 flex items-center text-sm"><CheckCircle2 className="w-4 h-4 mr-2"/> 각 팀별 지시사항 및 협의 내용을 입력하세요.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {FEEDBACK_TEAMS.map(team => (
                                <div key={team.id} className="bg-white p-4 rounded-lg shadow-sm border border-indigo-100">
                                    <label className="block text-sm font-bold text-indigo-900 mb-2 border-b border-indigo-50 pb-1">{team.label}</label>
                                    <textarea 
                                        value={feedbackInputData[team.id]}
                                        onChange={e => setFeedbackInputData({...feedbackInputData, [team.id]: e.target.value})}
                                        onFocus={() => autoFocus(feedbackInputData[team.id], setFeedbackInputData, team.id)}
                                        onKeyDown={(e) => autoFormat(feedbackInputData[team.id], setFeedbackInputData, team.id, e)}
                                        placeholder={`${team.label} 의견 입력`}
                                        className="w-full border-gray-200 rounded-md text-sm p-3 border h-24"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button type="button" onClick={handleCloseFeedbackModal} className="px-4 py-2 text-gray-600 mr-2 hover:bg-gray-100 rounded-md">취소</button>
                        <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold">{isSubmitting ? '저장 중...' : '저장하기'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}

// --- 마운트 실행 ---
// const rootElement = document.getElementById('root');
// if (rootElement) {
//   const root = ReactDOM.createRoot(rootElement);
//   root.render(<App />);
// }

export default App;
