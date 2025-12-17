import React, { useState, useEffect } from 'react';
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
  Download
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
  serverTimestamp 
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
  "재무팀", "인사총무팀", "해외사업팀", "구매물류팀", 
  "IT지원팀", "법무팀", "운영팀", "영업팀", "전략기획팀", "마케팅팀"
];

const SECTIONS = [
  { id: 'report', label: '가. 보고사항', icon: FileText, placeholder: '- 주요 보고사항을 입력하세요.\n- 줄바꿈으로 내용을 구분합니다.' },
  { id: 'progress', label: '나. 진행업무', icon: Clock, placeholder: '- 현재 진행 중인 업무를 입력하세요.' },
  { id: 'discussion', label: '다. 협의업무', icon: MessageSquare, placeholder: '- 타 부서 협조나 논의가 필요한 사항을 입력하세요.' }
];

// --- 메인 앱 컴포넌트 ---
function App() {
  const [user, setUser] = useState(null);
  const [minutes, setMinutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'write'
  
  // 필터 상태
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('전체');

  // 입력 상태
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
  const [inputDept, setInputDept] = useState(DEPARTMENTS[0]);
  const [inputData, setInputData] = useState({
    report: '',
    progress: '',
    discussion: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 인증 및 데이터 불러오기
  useEffect(() => {
    // 1. 익명 로그인 시도
    signInAnonymously(auth).catch((error) => {
      console.error("인증 오류:", error);
    });

    // 2. 로그인 상태 확인
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    // 3. 데이터 실시간 구독 (weekly_minutes 컬렉션)
    const q = query(collection(db, 'weekly_minutes'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMinutes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 날짜 내림차순 -> 부서순 정렬
      loadedMinutes.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return DEPARTMENTS.indexOf(a.department) - DEPARTMENTS.indexOf(b.department);
      });

      setMinutes(loadedMinutes);
      setLoading(false);
    }, (error) => {
      console.error("데이터 로드 오류:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 핸들러 함수들
  const handleInputChange = (field, value) => {
    setInputData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("서버 연결 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'weekly_minutes'), {
        date: inputDate,
        department: inputDept,
        report: inputData.report,
        progress: inputData.progress,
        discussion: inputData.discussion,
        authorId: user.uid,
        createdAt: serverTimestamp()
      });

      setInputData({ report: '', progress: '', discussion: '' });
      alert('회의록이 등록되었습니다.');
      setView('list');
    } catch (error) {
      console.error("저장 오류: ", error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 데이터 그룹화 및 필터링
  const groupedMinutes = minutes.reduce((acc, curr) => {
    const date = curr.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(curr);
    return acc;
  }, {});

  const filteredGroups = Object.keys(groupedMinutes)
    .filter(date => selectedDate ? date === selectedDate : true)
    .sort((a, b) => b.localeCompare(a))
    .reduce((acc, date) => {
      const items = groupedMinutes[date].filter(item => 
        selectedDept === '전체' ? true : item.department === selectedDept
      );
      if (items.length > 0) acc[date] = items;
      return acc;
    }, {});

  // --- [수정됨] 엑셀 다운로드 기능 (세로 리스트 형태) ---
  const handleExportCSV = () => {
    let dataToExport = [];
    Object.values(filteredGroups).forEach(group => {
      group.forEach(item => dataToExport.push(item));
    });

    if (dataToExport.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    // 엑셀에서 한글 깨짐 방지용 BOM
    let csvContent = "\uFEFF"; 
    
    // 헤더 (가로형이 아닌 세로형 리스트 구조)
    csvContent += "날짜,부서,구분,내용\n";

    dataToExport.forEach(row => {
      // 엑셀 셀 내 줄바꿈이나 콤마 처리를 위한 텍스트 정리 함수
      const cleanText = (text) => text ? `"${text.replace(/"/g, '""')}"` : "";

      // 각 항목(보고/진행/협의)이 내용이 있을 때만 한 줄씩 추가
      if (row.report && row.report.trim() !== "") {
        csvContent += `${row.date},${row.department},보고사항,${cleanText(row.report)}\n`;
      }
      if (row.progress && row.progress.trim() !== "") {
        csvContent += `${row.date},${row.department},진행업무,${cleanText(row.progress)}\n`;
      }
      if (row.discussion && row.discussion.trim() !== "") {
        csvContent += `${row.date},${row.department},협의업무,${cleanText(row.discussion)}\n`;
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      {/* 상단 네비게이션 */}
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
              <button
                onClick={() => setView('list')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">회의록 조회</span>
                  <span className="sm:hidden">조회</span>
                </div>
              </button>
              <button
                onClick={() => setView('write')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'write' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
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

      {/* 메인 컨텐츠 영역 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'write' ? (
          /* --- 작성 모드 --- */
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center">
                <PlusCircle className="w-6 h-6 mr-2" />
                주간회의록 작성
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">회의 일자</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="date"
                      required
                      value={inputDate}
                      onChange={(e) => setInputDate(e.target.value)}
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">부서 선택</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select
                      value={inputDept}
                      onChange={(e) => setInputDept(e.target.value)}
                      className="pl-10 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2 bg-white"
                    >
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
                    <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center">
                      <section.icon className="w-4 h-4 mr-2 text-blue-600" />
                      {section.label}
                    </label>
                    <textarea
                      value={inputData[section.id]}
                      onChange={(e) => handleInputChange(section.id, e.target.value)}
                      placeholder={section.placeholder}
                      rows={5}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-3 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center"
                >
                  {isSubmitting ? '저장 중...' : <><Save className="w-4 h-4 mr-2" />등록하기</>}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* --- 조회 모드 --- */
          <div className="space-y-6">
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
                  <option value="">전체 날짜</option>
                  {Object.keys(groupedMinutes).sort((a,b) => b.localeCompare(a)).map(date => (
                    <option key={date} value={date}>{date}</option>
                  ))}
                </select>
                <select 
                  value={selectedDept} 
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm border p-1.5"
                >
                  <option value="전체">전체 부서</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
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
              {Object.keys(filteredGroups).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
                  <FileText className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 회의록이 없습니다</h3>
                  <p className="mt-1 text-sm text-gray-500">새로운 회의록을 작성해보세요.</p>
                </div>
              ) : (
                Object.entries(filteredGroups).map(([date, dateMinutes]) => (
                  <div key={date} className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {date}
                      </div>
                      <div className="h-px bg-gray-300 flex-1"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {dateMinutes.map((minute) => (
                        <div key={minute.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col">
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
                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                  {minute.report || "내용 없음"}
                                </p>
                              </div>
                              <div className="bg-green-50 p-3 rounded-lg">
                                <h4 className="text-xs font-bold text-green-700 uppercase mb-1 flex items-center">
                                  <Clock className="w-3 h-3 mr-1" /> 진행업무
                                </h4>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                  {minute.progress || "내용 없음"}
                                </p>
                              </div>
                              <div className="bg-orange-50 p-3 rounded-lg">
                                <h4 className="text-xs font-bold text-orange-700 uppercase mb-1 flex items-center">
                                  <MessageSquare className="w-3 h-3 mr-1" /> 협의업무
                                </h4>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                                  {minute.discussion || "내용 없음"}
                                </p>
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
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

export default App;
