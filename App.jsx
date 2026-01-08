import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Calendar, 
  FileText, 
  PlusCircle, 
  Search, 
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
  Megaphone // [추가] 경영지원본부 아이콘
} from 'lucide-react';

// --- Firebase 라이브러리 ---
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
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

// --- [설정] 사용자분의 Firebase 키값 적용 완료 ---
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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 부서 및 입력 항목 데이터 ---
const DEPARTMENTS = [
  "선택", 
  "재무팀", 
  "재무기획팀",
  "인사총무팀", 
  "해외사업팀", 
  "구매물류팀", 
  "IT지원팀"
];

// 일반 팀 회의록 입력 예시
const SECTIONS = [
  { id: 'report', label: '가. 보고사항', icon: FileText, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' },
  { id: 'progress', label: '나. 진행업무', icon: Clock, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' },
  { id: 'discussion', label: '다. 협의업무', icon: MessageSquare, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' }
];

// [추가] 경영지원본부 회의 의견 작성용 팀 리스트
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
  const [minutes, setMinutes] = useState([]); // 일반 부서 회의록
  const [feedbacks, setFeedbacks] = useState([]); // [추가] 경영지원본부 회의록
  const [loading, setLoading] = useState(true);
  
  // 모달 상태 관리
  const [isModalOpen, setIsModalOpen] = useState(false); // 일반 작성 모달
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false); // [추가] 경영지원본부 작성 모달
  
  // 필터 상태
  const [selectedDate, setSelectedDate] = useState('recent');
  const [selectedDept, setSelectedDept] = useState('전체');

  // 일반 입력 상태
  const [inputDate, setInputDate] = useState(''); 
  const [inputDept, setInputDept] = useState(DEPARTMENTS[0]); 
  const [inputData, setInputData] = useState({
    report: '',
    progress: '',
    discussion: ''
  });
  
  // [추가] 경영지원본부 입력 상태
  const [feedbackInputDate, setFeedbackInputDate] = useState('');
  const [feedbackInputData, setFeedbackInputData] = useState({
    finance: '',
    hr: '',
    global: '',
    logistics: '',
    it: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // 수정 모드 상태
  const [editingId, setEditingId] = useState(null);
  const [editingFeedbackId, setEditingFeedbackId] = useState(null); // [추가] 경영지원본부 수정 ID

  // 인증 및 데이터 불러오기
  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      console.error("인증 오류:", error);
    });

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // 1. 일반 회의록 구독
    const q1 = query(collection(db, 'weekly_minutes'));
    const unsubscribe1 = onSnapshot(q1, (snapshot) => {
      const loadedMinutes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // 정렬: 날짜 내림차순 -> 부서 순서
      loadedMinutes.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return DEPARTMENTS.indexOf(a.department) - DEPARTMENTS.indexOf(b.department);
      });
      setMinutes(loadedMinutes);
    });

    // 2. [추가] 경영지원본부 회의록 구독
    const q2 = query(collection(db, 'management_feedbacks'));
    const unsubscribe2 = onSnapshot(q2, (snapshot) => {
      const loadedFeedbacks = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFeedbacks(loadedFeedbacks);
      setLoading(false);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
    };
  }, [user]);

  // --- 공통 핸들러 ---
  const handleInputChange = (field, value) => {
    setInputData(prev => ({ ...prev, [field]: value }));
  };

  const handleFeedbackInputChange = (field, value) => {
    setFeedbackInputData(prev => ({ ...prev, [field]: value }));
  };

  // 자동 서식 (일반)
  const handleFocus = (field) => {
    if (!inputData[field] || inputData[field].trim() === '') {
      handleInputChange(field, '     - ');
    }
  };
  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      const { selectionStart, selectionEnd } = e.target;
      const value = inputData[field];
      const newValue = value.substring(0, selectionStart) + '\n     - ' + value.substring(selectionEnd);
      handleInputChange(field, newValue);
      setTimeout(() => {
        if(e.target) {
          e.target.selectionStart = selectionStart + 8; 
          e.target.selectionEnd = selectionStart + 8;
        }
      }, 0);
    }
  };

  // 자동 서식 (경영지원본부)
  const handleFeedbackFocus = (field) => {
    if (!feedbackInputData[field] || feedbackInputData[field].trim() === '') {
      handleFeedbackInputChange(field, '     - ');
    }
  };
  const handleFeedbackKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      const { selectionStart, selectionEnd } = e.target;
      const value = feedbackInputData[field];
      const newValue = value.substring(0, selectionStart) + '\n     - ' + value.substring(selectionEnd);
      handleFeedbackInputChange(field, newValue);
      setTimeout(() => {
        if(e.target) {
          e.target.selectionStart = selectionStart + 8; 
          e.target.selectionEnd = selectionStart + 8;
        }
      }, 0);
    }
  };

  // --- 일반 회의록 관련 핸들러 ---
  const handleLoadLastWeek = () => {
    if (inputDept === '선택') {
      alert('지난주 내용을 불러오려면 먼저 [부서]를 선택해주세요.');
      return;
    }
    const previousMinutes = minutes
      .filter(m => m.department === inputDept)
      .filter(m => !inputDate || m.date < inputDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    const lastMinute = previousMinutes[0];

    if (lastMinute) {
      if (window.confirm(`${lastMinute.date}일자 회의록 내용을 불러오시겠습니까?`)) {
        setInputData({
          report: lastMinute.report || '',
          progress: lastMinute.progress || '',
          discussion: lastMinute.discussion || ''
        });
      }
    } else {
      alert('이전 회의록 내역을 찾을 수 없습니다.');
    }
  };

  const handleEditClick = (minute) => {
    setInputDate(minute.date);
    setInputDept(minute.department);
    setInputData({
      report: minute.report,
      progress: minute.progress,
      discussion: minute.discussion
    });
    setEditingId(minute.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingId(null);
    setInputData({ report: '', progress: '', discussion: '' });
    setInputDate(''); 
    setInputDept(DEPARTMENTS[0]); 
    setIsModalOpen(false);
  };

  const handleNewWriteClick = () => {
    setEditingId(null);
    setInputData({ report: '', progress: '', discussion: '' });
    setInputDate('');
    setInputDept(DEPARTMENTS[0]);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("정말 이 회의록을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "weekly_minutes", id));
      } catch (error) {
        console.error("삭제 오류:", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateDate(inputDate)) return;
    if (inputDept === "선택") { alert("부서를 선택해주세요."); return; }
    if (!user) { alert("서버 연결 중입니다."); return; }
    setIsSubmitting(true);

    const processInput = (text) => {
        const trimmed = text ? text.trim() : '';
        if (trimmed === '' || trimmed === '-') return '     - 특이사항 없음';
        return text;
    };

    const payload = {
      date: inputDate,
      department: inputDept,
      report: processInput(inputData.report),
      progress: processInput(inputData.progress),
      discussion: processInput(inputData.discussion),
      authorId: user.uid,
      createdAt: serverTimestamp() // 수정 시에는 updatedAt으로 처리
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
      console.error("저장 오류: ", error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- 경영지원본부 회의록 관련 핸들러 ---
  const handleFeedbackEditClick = (fb) => {
    setFeedbackInputDate(fb.date);
    setFeedbackInputData({
      finance: fb.finance || '',
      hr: fb.hr || '',
      global: fb.global || '',
      logistics: fb.logistics || '',
      it: fb.it || ''
    });
    setEditingFeedbackId(fb.id);
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackDeleteClick = async (id) => {
    if (window.confirm("경영지원본부 회의록을 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, "management_feedbacks", id));
      } catch (error) {
        console.error("삭제 오류:", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  const handleCloseFeedbackModal = () => {
    setEditingFeedbackId(null);
    setFeedbackInputData({ finance: '', hr: '', global: '', logistics: '', it: '' });
    setFeedbackInputDate('');
    setIsFeedbackModalOpen(false);
  };

  const handleNewFeedbackClick = () => {
    setEditingFeedbackId(null);
    setFeedbackInputData({ finance: '', hr: '', global: '', logistics: '', it: '' });
    setFeedbackInputDate('');
    setIsFeedbackModalOpen(true);
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!validateDate(feedbackInputDate)) return;
    if (!user) { alert("서버 연결 중입니다."); return; }
    setIsSubmitting(true);

    const processInput = (text) => {
      const trimmed = text ? text.trim() : '';
      if (trimmed === '' || trimmed === '-') return '     - 특이사항 없음';
      return text;
    };

    const payload = {
      date: feedbackInputDate,
      finance: processInput(feedbackInputData.finance),
      hr: processInput(feedbackInputData.hr),
      global: processInput(feedbackInputData.global),
      logistics: processInput(feedbackInputData.logistics),
      it: processInput(feedbackInputData.it),
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

  // 공통: 날짜 유효성 검사 (월요일 체크)
  const validateDate = (dateStr) => {
    if (!dateStr) {
      alert("회의 일자를 선택해주세요.");
      return false;
    }
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getDay() !== 1) { 
      alert("회의 일자는 '월요일'만 선택 가능합니다.");
      return false;
    }
    return true;
  };

  // 데이터 그룹화 및 필터링
  const groupedMinutes = minutes.reduce((acc, curr) => {
    const date = curr.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(curr);
    return acc;
  }, {});

  // 경영지원본부 데이터 그룹화 (날짜별 매핑용)
  const feedbackByDate = feedbacks.reduce((acc, curr) => {
    acc[curr.date] = curr;
    return acc;
  }, {});

  const allDates = [...new Set([...Object.keys(groupedMinutes), ...Object.keys(feedbackByDate)])].sort((a, b) => b.localeCompare(a));

  const filteredDates = allDates.filter(date => {
    if (selectedDate === 'recent') {
      return allDates.slice(0, 2).includes(date);
    }
    return selectedDate ? date === selectedDate : true;
  });

  const handleExportCSV = () => {
    // (기존 CSV 로직 유지)
    // 경영지원본부 의견도 포함시킬지 여부는 추후 결정, 현재는 일반 회의록만 내보냅니다.
    // 기존 로직 그대로 사용
    let dataToExport = [];
    filteredDates.forEach(date => {
        if(groupedMinutes[date]) {
            groupedMinutes[date].forEach(item => {
                if(selectedDept === '전체' || item.department === selectedDept) {
                    dataToExport.push(item);
                }
            });
        }
    });

    if (dataToExport.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    let csvContent = "\uFEFF"; 
    csvContent += "날짜,부서,구분,내용\n";

    const formatTextForExcel = (text) => {
      if (!text) return "";
      return text.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return ""; 
        if (line.includes("- ")) { return `     ${line.trim()}`; }
        return `     - ${trimmed}`;
      }).join('\n');
    };

    dataToExport.forEach(row => {
      const cleanText = (text) => text ? `"${text.replace(/"/g, '""')}"` : "";
      if (row.report && row.report.trim() !== "") csvContent += `${row.date},${row.department},보고사항,${cleanText(formatTextForExcel(row.report))}\n`;
      if (row.progress && row.progress.trim() !== "") csvContent += `${row.date},${row.department},진행업무,${cleanText(formatTextForExcel(row.progress))}\n`;
      if (row.discussion && row.discussion.trim() !== "") csvContent += `${row.date},${row.department},협의업무,${cleanText(formatTextForExcel(row.discussion))}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `주간회의록_리스트형_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderFormattedText = (text) => {
    if (!text) return <span className="text-gray-400">내용 없음</span>;
    return (
      <div className="flex flex-col space-y-1">
        {text.split('\n').map((line, index) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('-')) {
            return (
              <div key={index} className="flex items-start">
                <span className="mr-1.5 shrink-0 select-none">-</span>
                <span className="whitespace-pre-wrap break-words">{trimmed.substring(1).trim()}</span>
              </div>
            );
          }
          if (!trimmed) return <div key={index} className="h-1"></div>;
          return <div key={index} className="pl-3 whitespace-pre-wrap break-words">{line}</div>;
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      <nav className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Layout className="h-8 w-8 text-blue-600 mr-3" />
              <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">
                경영본부 주간회의록
              </span>
              <span className="font-bold text-xl tracking-tight text-gray-900 sm:hidden">
                주간회의록
              </span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <a
                href="https://composecoffee1-my.sharepoint.com/:x:/g/personal/choihy_composecoffee_co_kr/IQBRHgvwRo3ZT5ytCTKVpBlRAcE4zXsMEqjohnr8xTI-RJ0?rtime=CQM385lC3kg"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <Archive className="w-4 h-4 mr-2 text-gray-600" />
                경영지원본부
              </a>

              {/* [추가] 경영지원본부 작성 버튼 */}
              <button
                onClick={handleNewFeedbackClick}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              >
                <div className="flex items-center">
                  <Megaphone className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">경영지원본부 회의</span>
                  <span className="sm:hidden">본부회의</span>
                </div>
              </button>

              <button
                onClick={handleNewWriteClick}
                className="px-3 py-2 rounded-md text-sm font-medium transition-colors bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                <div className="flex items-center">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">작성하기</span>
                  <span className="sm:hidden">작성</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 필터 영역 */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full md:w-auto">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">필터:</span>
              </div>
              <select 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
              >
                <option value="recent">최근 2주 (기본)</option>
                <option value="">전체 날짜</option>
                {allDates.map(date => (
                  <option key={date} value={date}>{date}</option>
                ))}
              </select>
              <select 
                value={selectedDept} 
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
              >
                <option value="전체">전체 부서</option>
                {DEPARTMENTS.filter(d => d !== "선택").map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <a
                href="https://composecoffee1.sharepoint.com/:x:/s/msteams_36b3c1/IQC40FIO6VJ-Qa9VM4V1p7ZjARvpGPXit21Lw8MYx4Ak7cI?e=boBlK9"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2 text-green-600" />
                컴포즈커피 주간회의록
              </a>
            </div>
            
            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
              <span className="text-sm text-gray-500 hidden lg:inline">
                총 {Object.values(filteredGroups).flat().length}건
              </span>
              <button
                onClick={handleExportCSV}
                className="flex items-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                엑셀(CSV) 다운로드
              </button>
            </div>
          </div>

          <div className="space-y-8">
            {filteredDates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                <FileText className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 회의록이 없습니다</h3>
                <p className="mt-1 text-sm text-gray-500">새로운 회의록을 작성해보세요.</p>
              </div>
            ) : (
              filteredDates.map(date => {
                const dateMinutes = groupedMinutes[date] || [];
                const dateFeedback = feedbackByDate[date];
                // 필터링 적용
                const filteredMinutes = dateMinutes.filter(item => 
                  selectedDept === '전체' ? true : item.department === selectedDept
                );

                // 해당 날짜에 데이터가 없으면 렌더링 안함
                if (!dateFeedback && filteredMinutes.length === 0) return null;

                return (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {date}
                      </div>
                      <div className="h-px bg-gray-300 flex-1"></div>
                    </div>

                    {/* [추가] 경영지원본부 회의 의견 (최상단 가로 배치) */}
                    {dateFeedback && (selectedDept === '전체') && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-xl shadow-sm overflow-hidden relative group">
                        <div className="bg-indigo-600 px-5 py-3 flex justify-between items-center">
                          <h3 className="text-lg font-bold text-white flex items-center">
                            <Megaphone className="w-5 h-5 mr-2" />
                            경영지원본부 주간회의 의견
                          </h3>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleFeedbackEditClick(dateFeedback)}
                              className="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
                              title="수정"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleFeedbackDeleteClick(dateFeedback.id)}
                              className="p-1.5 bg-white/20 hover:bg-red-500/50 text-white rounded transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-5 gap-4">
                          {FEEDBACK_TEAMS.map((team) => (
                            <div key={team.id} className="bg-white p-3 rounded border border-indigo-100">
                              <h4 className="text-xs font-bold text-indigo-800 mb-2 border-b border-indigo-100 pb-1">
                                {team.label}
                              </h4>
                              <div className="text-sm text-gray-800 leading-relaxed min-h-[60px]">
                                {renderFormattedText(dateFeedback[team.id])}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {filteredMinutes.map((minute) => (
                        <div key={minute.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col relative group">
                          <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEditClick(minute)}
                              className="p-2 bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600 rounded-full transition-colors"
                              title="수정"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(minute.id)}
                              className="p-2 bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 rounded-full transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-4">
                              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-blue-500" />
                                {minute.department}
                              </h3>
                            </div>
                            <div className="space-y-4">
                              <div className="bg-blue-50 p-3 rounded-lg">
                                <h4 className="text-xs font-bold text-blue-700 uppercase mb-1 flex items-center">
                                  <FileText className="w-3 h-3 mr-1" /> 보고사항
                                </h4>
                                <div className="text-sm text-gray-800 leading-relaxed">
                                  {renderFormattedText(minute.report)}
                                </div>
                              </div>
                              <div className="bg-green-50 p-3 rounded-lg">
                                <h4 className="text-xs font-bold text-green-700 uppercase mb-1 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" /> 진행업무
                                </h4>
                                <div className="text-sm text-gray-800 leading-relaxed">
                                  {renderFormattedText(minute.progress)}
                                </div>
                              </div>
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <h4 className="text-xs font-bold text-orange-700 uppercase mb-1 flex items-center">
                                  <MessageSquare className="w-3 h-3 mr-1" /> 협의업무
                                </h4>
                                <div className="text-sm text-gray-800 leading-relaxed">
                                  {renderFormattedText(minute.discussion)}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                              <span>작성일: {new Date(minute.createdAt?.toDate()).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 일반 작성 모달 */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
              <div className={`px-6 py-4 sticky top-0 z-10 flex justify-between items-center ${editingId ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                <h2 className="text-xl font-bold text-white flex items-center">
                  {editingId ? <><Edit className="w-6 h-6 mr-2" />주간회의록 수정</> : <><PlusCircle className="w-6 h-6 mr-2" />주간회의록 작성</>}
                </h2>
                <button onClick={handleCloseModal} className="text-white hover:bg-white/20 p-1 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="flex justify-between space-x-3 mb-4">
                  <button type="button" onClick={handleLoadLastWeek} className="px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center">
                    <RotateCcw className="w-4 h-4 mr-2" />지난주 불러오기
                  </button>
                  <div className="flex space-x-3">
                    <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center">
                      <X className="w-4 h-4 mr-1" />취소
                    </button>
                    <button type="submit" disabled={isSubmitting} className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white flex items-center ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                      {isSubmitting ? '처리 중...' : (editingId ? <><Save className="w-4 h-4 mr-2" />수정 완료</> : <><Save className="w-4 h-4 mr-2" />저장하기</>)}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">회의 일자 <span className="text-red-500 text-xs">(월요일만 선택 가능)</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input type="date" required value={inputDate} onChange={(e) => setInputDate(e.target.value)} className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">부서 선택 <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <select value={inputDept} onChange={(e) => setInputDept(e.target.value)} className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white">
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="space-y-6">
                  {SECTIONS.map((section) => (
                    <div key={section.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center"><section.icon className="w-4 h-4 mr-2 text-blue-600" />{section.label}</label>
                      <textarea value={inputData[section.id]} onChange={(e) => handleInputChange(section.id, e.target.value)} onFocus={() => handleFocus(section.id)} onKeyDown={(e) => handleKeyDown(e, section.id)} placeholder={section.placeholder} rows={5} className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-3 text-sm" />
                    </div>
                  ))}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* [추가] 경영지원본부 회의록 작성 모달 */}
        {isFeedbackModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
              <div className="px-6 py-4 sticky top-0 z-10 flex justify-between items-center bg-indigo-600">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <Megaphone className="w-6 h-6 mr-2" />
                  경영지원본부 주간회의 의견 작성
                </h2>
                <button onClick={handleCloseFeedbackModal} className="text-white hover:bg-white/20 p-1 rounded-full"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-6">
                <div className="flex justify-end space-x-3 mb-4">
                  <button type="button" onClick={handleCloseFeedbackModal} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center">
                    <X className="w-4 h-4 mr-1" />취소
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white flex items-center bg-indigo-600 hover:bg-indigo-700">
                    {isSubmitting ? '처리 중...' : (editingFeedbackId ? <><Save className="w-4 h-4 mr-2" />수정 완료</> : <><Save className="w-4 h-4 mr-2" />저장하기</>)}
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">회의 일자 <span className="text-red-500 text-xs">(월요일만 선택 가능)</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input type="date" required value={feedbackInputDate} onChange={(e) => setFeedbackInputDate(e.target.value)} className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <p className="text-sm text-indigo-700 mb-4 font-medium flex items-center">
                      <Briefcase className="w-4 h-4 mr-2" />
                      각 팀별 회의 의견 및 지시사항을 입력하세요. (자동 서식 적용됨)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {FEEDBACK_TEAMS.map((team) => (
                        <div key={team.id} className="bg-white p-3 rounded border border-indigo-100">
                          <label className="block text-sm font-bold text-gray-800 mb-2">{team.label}</label>
                          <textarea
                            value={feedbackInputData[team.id]}
                            onChange={(e) => handleFeedbackInputChange(team.id, e.target.value)}
                            onFocus={() => handleFeedbackFocus(team.id)}
                            onKeyDown={(e) => handleFeedbackKeyDown(e, team.id)}
                            placeholder="의견을 입력하세요."
                            rows={4}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

export default App;
