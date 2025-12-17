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
  X          
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
  "재무팀", "인사총무팀", "해외사업팀", "구매물류팀", 
  "IT지원팀", "법무팀", "운영팀", "영업팀", "전략기획팀", "마케팅팀"
];

// 입력 예시 문구
const SECTIONS = [
  { id: 'report', label: '가. 보고사항', icon: FileText, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' },
  { id: 'progress', label: '나. 진행업무', icon: Clock, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' },
  { id: 'discussion', label: '다. 협의업무', icon: MessageSquare, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' }
];

// --- 메인 앱 컴포넌트 ---
function App() {
  const [user, setUser] = useState(null);
  const [minutes, setMinutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); 
  
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
  
  // 수정 모드 상태
  const [editingId, setEditingId] = useState(null);

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

  // 텍스트박스 클릭(포커스) 시 자동 서식 입력
  const handleFocus = (field) => {
    if (!inputData[field] || inputData[field].trim() === '') {
      handleInputChange(field, '     - ');
    }
  };

  // 엔터 키 입력 시 자동 들여쓰기 적용
  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      const { selectionStart, selectionEnd } = e.target;
      const value = inputData[field];
      
      // 현재 커서 위치에 줄바꿈 + 서식 삽입
      const newValue = 
        value.substring(0, selectionStart) + 
        '\n     - ' + 
        value.substring(selectionEnd);

      handleInputChange(field, newValue);

      // 커서 위치 조정
      setTimeout(() => {
        if(e.target) {
          e.target.selectionStart = selectionStart + 8; 
          e.target.selectionEnd = selectionStart + 8;
        }
      }, 0);
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
    setView('write');
    window.scrollTo(0, 0);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setInputData({ report: '', progress: '', discussion: '' });
    setView('list');
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm("정말 이 회의록을 삭제하시겠습니까?\n삭제된 데이터는 복구할 수 없습니다.")) {
      try {
        await deleteDoc(doc(db, "weekly_minutes", id));
        alert("삭제되었습니다.");
      } catch (error) {
        console.error("삭제 오류:", error);
        alert("삭제 중 오류가 발생했습니다.");
      }
    }
  };

  // [수정됨] 저장 시 빈 내용 자동 채움 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("서버 연결 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setIsSubmitting(true);

    // 자동 채움 헬퍼 함수
    const processInput = (text) => {
        const trimmed = text ? text.trim() : '';
        // 1. 아예 비어있거나 ('')
        // 2. 자동완성된 하이픈만 있거나 ('-')
        // 인 경우 "특이사항 없음"으로 대체
        if (trimmed === '' || trimmed === '-') {
            return '     - 특이사항 없음';
        }
        return text;
    };

    const finalReport = processInput(inputData.report);
    const finalProgress = processInput(inputData.progress);
    const finalDiscussion = processInput(inputData.discussion);

    try {
      if (editingId) {
        await updateDoc(doc(db, "weekly_minutes", editingId), {
          date: inputDate,
          department: inputDept,
          report: finalReport,
          progress: finalProgress,
          discussion: finalDiscussion,
          updatedAt: serverTimestamp()
        });
        alert('회의록이 성공적으로 수정되었습니다.');
      } else {
        await addDoc(collection(db, 'weekly_minutes'), {
          date: inputDate,
          department: inputDept,
          report: finalReport,
          progress: finalProgress,
          discussion: finalDiscussion,
          authorId: user.uid,
          createdAt: serverTimestamp()
        });
        alert('회의록이 등록되었습니다.');
      }

      setInputData({ report: '', progress: '', discussion: '' });
      setEditingId(null);
      setView('list');
    } catch (error) {
      console.error("저장 오류: ", error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 데이터 그룹화
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

  // 엑셀 다운로드 기능
  const handleExportCSV = () => {
    let dataToExport = [];
    Object.values(filteredGroups).forEach(group => {
      group.forEach(item => dataToExport.push(item));
    });

    if (dataToExport.length === 0) {
      alert("다운로드할 데이터가 없습니다.");
      return;
    }

    let csvContent = "\uFEFF"; 
    csvContent += "날짜,부서,구분,내용\n";

    // 텍스트 포매팅 함수
    const formatTextForExcel = (text) => {
      if (!text) return "";
      return text.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return ""; 
        if (line.includes("- ")) {
           return `     ${line.trim()}`; 
        }
        return `     - ${trimmed}`;
      }).join('\n');
    };

    dataToExport.forEach(row => {
      const cleanText = (text) => text ? `"${text.replace(/"/g, '""')}"` : "";

      if (row.report && row.report.trim() !== "") {
        const formattedReport = formatTextForExcel(row.report);
        csvContent += `${row.date},${row.department},보고사항,${cleanText(formattedReport)}\n`;
      }
      if (row.progress && row.progress.trim() !== "") {
        const formattedProgress = formatTextForExcel(row.progress);
        csvContent += `${row.date},${row.department},진행업무,${cleanText(formattedProgress)}\n`;
      }
      if (row.discussion && row.discussion.trim() !== "") {
        const formattedDiscussion = formatTextForExcel(row.discussion);
        csvContent += `${row.date},${row.department},협의업무,${cleanText(formattedDiscussion)}\n`;
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
                onClick={() => { setView('list'); setEditingId(null); }}
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
                onClick={() => { 
                  setView('write'); 
                  setEditingId(null); 
                  setInputData({ report: '', progress: '', discussion: '' });
                }}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === 'write' ? (
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className={`px-6 py-4 ${editingId ? 'bg-indigo-600' : 'bg-blue-600'}`}>
              <h2 className="text-xl font-bold text-white flex items-center">
                {editingId ? (
                  <>
                    <Edit className="w-6 h-6 mr-2" />
                    주간회의록 수정
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-6 h-6 mr-2" />
                    주간회의록 작성
                  </>
                )}
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
                      onFocus={() => handleFocus(section.id)} // 클릭 시 자동 서식
                      onKeyDown={(e) => handleKeyDown(e, section.id)} // 엔터 시 자동 서식
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
                  onClick={handleCancelEdit}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 flex items-center"
                >
                  <X className="w-4 h-4 mr-1" />
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white flex items-center ${
                    editingId 
                      ? 'bg-indigo-600 hover:bg-indigo-700' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSubmitting ? '처리 중...' : (
                    editingId ? <><Save className="w-4 h-4 mr-2" />수정 완료</> : <><Save className="w-4 h-4 mr-2" />등록하기</>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
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

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

export default App;
