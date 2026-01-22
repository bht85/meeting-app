import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Calendar, FileText, PlusCircle, Save, Users, Clock, Briefcase, 
  MessageSquare, Layout, Filter, Download, Trash2, X, ExternalLink, 
  RotateCcw, Archive, Megaphone, Menu, CheckCircle2, Loader2,
  BarChart3, Code, ShoppingBag, AlertCircle, ArrowLeft, Target, 
  DollarSign, Plus, Edit2, Settings, Edit, Building2, Lock, Scale,
  ChevronDown
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
  deleteDoc,
  setDoc,
  getDocs,
  where
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

// --- 상수 데이터 (회의록용) ---
const DEPARTMENTS = [
  "선택", 
  "재무팀", 
  "재무기획팀",
  "인사총무팀", 
  "해외사업팀", 
  "법무팀", 
  "구매물류팀", 
  "IT지원팀"
];

// --- 부서 메타데이터 (순서 및 아이콘 정의) ---
// KPI 현황판은 이 순서와 정보를 기반으로 표시됩니다.
const DEPARTMENTS_META = [
    { id: 'finance_team', name: '재무팀', icon: 'dollar' },
    { id: 'finance_plan', name: '재무기획팀', icon: 'dollar' },
    { id: 'hr_ga', name: '인사총무팀', icon: 'users' },
    { id: 'global_biz', name: '해외사업팀', icon: 'global' },
    { id: 'legal_team', name: '법무팀', icon: 'legal' },
    { id: 'logistics', name: '구매물류팀', icon: 'truck' },
    { id: 'it_support', name: 'IT지원팀', icon: 'monitor' }
];

const SECTIONS = [
  { id: 'report', label: '가. 보고사항', icon: FileText, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' },
  { id: 'progress', label: '나. 진행업무', icon: Clock, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' },
  { id: 'discussion', label: '다. 협의업무', icon: MessageSquare, placeholder: '내용이 없으면 자동으로 \'특이사항 없음\'으로 저장됩니다.' }
];

const FEEDBACK_TEAMS = [
  { id: 'finance', label: '재무팀' },
  { id: 'finance_plan', label: '재무기획팀' },
  { id: 'hr', label: '인사총무팀' },
  { id: 'global', label: '해외사업팀' },
  { id: 'legal', label: '법무팀' },
  { id: 'logistics', label: '구매물류팀' },
  { id: 'it', label: 'IT지원팀' }
];

const YEARS = ['2024', '2025', '2026', '2027'];
const PERIODS = [
    { id: '1H', label: '상반기 (1H)' },
    { id: '2H', label: '하반기 (2H)' }
];

// --- 아이콘 매핑 헬퍼 ---
const getIconComponent = (iconName) => {
  switch (iconName) {
    case 'dollar': return <DollarSign className="w-5 h-5" />;
    case 'bag': return <ShoppingBag className="w-5 h-5" />;
    case 'code': return <Code className="w-5 h-5" />;
    case 'users': return <Users className="w-5 h-5" />;
    case 'global': return <RotateCcw className="w-5 h-5" />; 
    case 'truck': return <Archive className="w-5 h-5" />; 
    case 'monitor': return <Layout className="w-5 h-5" />; 
    case 'legal': return <Scale className="w-5 h-5" />;
    default: return <Briefcase className="w-5 h-5" />;
  }
};

// ==========================================
// [KPI 대시보드 컴포넌트] (Firestore 연동 - 기간별)
// ==========================================
const KPIDashboard = () => {
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommonKpiModalOpen, setIsCommonKpiModalOpen] = useState(false);
  const [isCommonFormOpen, setIsCommonFormOpen] = useState(false);
  
  // 기간 상태 관리
  const [currentYear, setCurrentYear] = useState('2025');
  const [currentPeriod, setCurrentPeriod] = useState('1H');

  const [editingKpi, setEditingKpi] = useState(null);
  
  // 데이터 상태
  const [deptDataMap, setDeptDataMap] = useState({}); // { deptId: { kpis: [] } }
  const [commonKpis, setCommonKpis] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. 데이터 구독 (선택된 연도/반기에 따라)
  useEffect(() => {
    setLoading(true);
    
    // (A) 부서별 KPI 구독 (kpi_records 컬렉션 사용)
    // 쿼리: year == currentYear AND period == currentPeriod
    const q = query(
        collection(db, 'kpi_records'), 
        where('year', '==', currentYear),
        where('period', '==', currentPeriod)
    );

    const unsubRecords = onSnapshot(q, (snapshot) => {
        const newDataMap = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            newDataMap[data.deptId] = data;
        });
        setDeptDataMap(newDataMap);
        setLoading(false);
    });

    // (B) 전사 공통 KPI 구독 (kpi_commons 컬렉션 사용)
    // 문서 ID: year_period (예: 2025_1H)
    const commonDocId = `${currentYear}_${currentPeriod}`;
    const unsubCommon = onSnapshot(doc(db, 'kpi_commons', commonDocId), (docSnap) => {
        if (docSnap.exists()) {
            setCommonKpis(docSnap.data().kpis || []);
        } else {
            setCommonKpis([]); // 해당 기간 데이터 없으면 빈 배열
        }
    });

    return () => {
        unsubRecords();
        unsubCommon();
    };
  }, [currentYear, currentPeriod]);

  // --- Firestore 업데이트 함수들 ---

  // 공통 헬퍼: 해당 기간/부서의 문서 ID 생성
  const getRecordDocId = (deptId) => `${currentYear}_${currentPeriod}_${deptId}`;
  const getCommonDocId = () => `${currentYear}_${currentPeriod}`;

  // 실적 업데이트 (부서 개별)
  const handleUpdateKPIValue = async (deptId, kpiId, newValue) => {
    const docId = getRecordDocId(deptId);
    const currentData = deptDataMap[deptId];
    
    if (!currentData) return; // 데이터가 없으면 업데이트 불가 (생성 필요)

    const newKpis = currentData.kpis.map(k => k.id === kpiId ? { ...k, current: Number(newValue) } : k);
    
    await updateDoc(doc(db, 'kpi_records', docId), { kpis: newKpis });
  };

  // KPI 삭제 (부서 개별)
  const handleDeleteKPI = async (deptId, kpiId) => {
    if (!window.confirm('삭제하시겠습니까?')) return;
    const docId = getRecordDocId(deptId);
    const currentData = deptDataMap[deptId];
    
    if (!currentData) return;

    const newKpis = currentData.kpis.filter(k => k.id !== kpiId);
    await updateDoc(doc(db, 'kpi_records', docId), { kpis: newKpis });
  };

  // KPI 저장 (부서 개별 추가/수정)
  const handleSaveKPI = async (deptId, kpiData) => {
    const docId = getRecordDocId(deptId);
    const currentData = deptDataMap[deptId];
    let newKpis = currentData ? [...currentData.kpis] : [];

    if (kpiData.id) {
      // 수정
      newKpis = newKpis.map(k => k.id === kpiData.id ? { 
          ...kpiData, 
          current: Number(kpiData.current), 
          target: Number(kpiData.target), 
          weight: Number(kpiData.weight) 
      } : k);
    } else {
      // 추가
      newKpis.push({ 
        ...kpiData, 
        id: Date.now().toString(), 
        current: Number(kpiData.current), 
        target: Number(kpiData.target), 
        weight: Number(kpiData.weight) 
      });
    }

    // 문서가 없으면 생성(set), 있으면 수정(update)
    // setDoc with merge is safer here
    await setDoc(doc(db, 'kpi_records', docId), {
        deptId: deptId,
        year: currentYear,
        period: currentPeriod,
        kpis: newKpis,
        updatedAt: serverTimestamp()
    }, { merge: true });

    setIsModalOpen(false);
  };

  // --- 공통 KPI 관련 함수들 ---
  const handleSaveCommonKPI = async (kpiData) => {
      const docId = getCommonDocId();
      let newCommonKpis = [...commonKpis];
      
      if (kpiData.id) {
          newCommonKpis = newCommonKpis.map(k => k.id === kpiData.id ? {
              ...kpiData,
              current: Number(kpiData.current),
              target: Number(kpiData.target),
              weight: Number(kpiData.weight)
          } : k);
      } else {
          newCommonKpis.push({
              ...kpiData,
              id: `common_${Date.now()}`,
              current: Number(kpiData.current),
              target: Number(kpiData.target),
              weight: Number(kpiData.weight),
              isCommon: true 
          });
      }
      
      await setDoc(doc(db, 'kpi_commons', docId), { 
          year: currentYear,
          period: currentPeriod,
          kpis: newCommonKpis 
      }, { merge: true });
      
      setIsCommonFormOpen(false);
  };

  const handleDeleteCommonKPI = async (kpiId) => {
      if (!window.confirm('전사 공통 KPI를 삭제하시겠습니까?')) return;
      const docId = getCommonDocId();
      const newCommonKpis = commonKpis.filter(k => k.id !== kpiId);
      await updateDoc(doc(db, 'kpi_commons', docId), { kpis: newCommonKpis });
  };

  // --- 계산 로직 ---
  const calculateAchievement = (target, current, lowerIsBetter = false) => {
    if (lowerIsBetter) {
      if (current <= target) return 100;
      return Math.max(0, ((2 * target - current) / target) * 100);
    }
    if (target === 0) return 0;
    return Math.min(100, (current / target) * 100);
  };

  const getDeptScore = (deptKpis) => {
    const allKpis = [...(deptKpis || []), ...commonKpis];
    if (allKpis.length === 0) return 0;

    let totalScore = 0; let totalWeight = 0;
    allKpis.forEach(kpi => {
      totalScore += calculateAchievement(kpi.target, kpi.current, kpi.lowerIsBetter) * kpi.weight;
      totalWeight += kpi.weight;
    });
    
    return totalWeight === 0 ? 0 : Math.round(totalScore / totalWeight);
  };

  const getStatusColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };
  
  const getProgressBarColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 현재 선택된 부서의 KPI 데이터 가져오기 (DB데이터 없으면 빈 배열)
  const selectedDeptKpis = selectedDeptId ? (deptDataMap[selectedDeptId]?.kpis || []) : [];
  const selectedDeptMeta = DEPARTMENTS_META.find(d => d.id === selectedDeptId);

  if (loading) return <div className="p-10 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600"/></div>;

  return (
    <div className="bg-gray-50 min-h-screen p-4 rounded-xl">
      {/* 헤더: 타이틀 + 연도/반기 선택 */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" /> KPI 현황판
          </h2>
          <p className="text-sm text-slate-500 mt-1">부서별 성과 + 전사 공통 지표 (연도/반기별 관리)</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* 연도 선택 */}
            <div className="relative">
                <select 
                    value={currentYear} 
                    onChange={(e) => setCurrentYear(e.target.value)}
                    className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-8 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                >
                    {YEARS.map(y => <option key={y} value={y}>{y}년</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/>
            </div>

            {/* 반기 선택 */}
            <div className="relative">
                <select 
                    value={currentPeriod} 
                    onChange={(e) => setCurrentPeriod(e.target.value)}
                    className="appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-8 rounded-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                >
                    {PERIODS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/>
            </div>

            <div className="w-px h-6 bg-slate-300 mx-1 hidden md:block"></div>

            <button 
                onClick={() => setIsCommonKpiModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 shadow-sm transition-colors"
            >
                <Building2 className="w-4 h-4" /> 전사 지표 관리
            </button>
        </div>
      </div>

      {selectedDeptId === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {DEPARTMENTS_META.map((dept) => {
            // 해당 부서의 현재 연도/반기 데이터 조회
            const deptRecord = deptDataMap[dept.id] || { kpis: [] };
            const score = getDeptScore(deptRecord.kpis);
            
            return (
              <div key={dept.id} onClick={() => setSelectedDeptId(dept.id)}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
              >
                {/* 상단 장식 바 (점수에 따라 색상 변경) */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${score >= 90 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg bg-indigo-50 text-indigo-600`}>
                      {getIconComponent(dept.icon)}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600">{dept.name}</h2>
                      <p className="text-xs text-slate-500">개별 {deptRecord.kpis.length}건 / 공통 {commonKpis.length}건</p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(score)}`}>
                    {score >= 90 ? '우수' : score >= 70 ? '보통' : '위험'}
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1 text-slate-600">
                    <span className="font-semibold">종합 달성률</span>
                    <span className="font-bold">{score}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(score)}`} style={{ width: `${score}%` }}></div>
                  </div>
                </div>

                {/* KPI 미리보기 (최대 2개) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {/* 공통 KPI 1개 */}
                    {commonKpis.slice(0, 1).map(kpi => (
                        <div key={kpi.id} className="flex justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1 text-slate-400"><Building2 className="w-3 h-3"/> {kpi.name}</span>
                            <span>{Math.round(calculateAchievement(kpi.target, kpi.current, kpi.lowerIsBetter))}%</span>
                        </div>
                    ))}
                    {/* 부서 KPI 1개 */}
                    {deptRecord.kpis.slice(0, commonKpis.length > 0 ? 1 : 2).map(kpi => (
                        <div key={kpi.id} className="flex justify-between text-xs text-slate-500">
                            <span>{kpi.name}</span>
                            <span>{Math.round(calculateAchievement(kpi.target, kpi.current, kpi.lowerIsBetter))}%</span>
                        </div>
                    ))}
                    {deptRecord.kpis.length === 0 && commonKpis.length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-1">등록된 KPI 없음</div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // 상세 보기 화면
        selectedDeptMeta && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden min-h-[500px]">
           <div className="bg-slate-50 border-b border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button onClick={() => setSelectedDeptId(null)} className="p-2 hover:bg-white rounded-full border border-transparent hover:border-slate-300">
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded border border-indigo-100">{getIconComponent(selectedDeptMeta.icon)}</div>
                  <div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedDeptMeta.name}</h2>
                      <p className="text-xs text-slate-500 font-medium">{currentYear}년 {PERIODS.find(p=>p.id===currentPeriod)?.label}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <div className="text-right mr-2">
                    <span className="text-xs text-slate-500 block">종합 점수</span>
                    <span className={`text-2xl font-bold ${getDeptScore(selectedDeptKpis) >= 70 ? 'text-indigo-600' : 'text-red-500'}`}>
                        {getDeptScore(selectedDeptKpis)}점
                    </span>
                </div>
                <button onClick={() => { setEditingKpi(null); setIsModalOpen(true); }} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm shadow-sm">
                  <Plus className="w-4 h-4" /> 팀 지표 추가
                </button>
              </div>
           </div>
           
           <div className="divide-y divide-slate-100">
             {/* 1. 공통 KPI 섹션 */}
             {commonKpis.length > 0 && (
                 <div className="bg-slate-50/50">
                     {commonKpis.map((kpi) => {
                        const achievement = calculateAchievement(kpi.target, kpi.current, kpi.lowerIsBetter);
                        return (
                          <div key={kpi.id} className="p-4 border-l-4 border-slate-300 bg-slate-50">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-300">전사공통</span>
                                  <h3 className="font-bold text-slate-800">{kpi.name}</h3>
                                  {kpi.lowerIsBetter && <span className="text-[10px] bg-white px-1 rounded border border-slate-200">낮을수록 좋음</span>}
                                </div>
                                <div className="text-xs text-slate-500 space-x-2">
                                  <span>목표: {kpi.target.toLocaleString()}{kpi.unit}</span>
                                  <span>비중: {kpi.weight * 100}%</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="text-right">
                                   <div className="text-[10px] text-slate-400 font-bold uppercase">현재 실적</div>
                                   <div className="font-bold text-slate-700 text-lg">
                                     {kpi.current.toLocaleString()} <span className="text-xs font-normal text-slate-500">{kpi.unit}</span>
                                   </div>
                                 </div>
                                 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400" title="전사 공통 지표는 관리 메뉴에서 수정 가능">
                                    <Lock className="w-4 h-4" />
                                 </div>
                                 <div className="w-24 text-right hidden md:block">
                                    <div className={`font-bold text-sm ${achievement < 70 ? 'text-red-500' : 'text-green-600'}`}>{Math.round(achievement)}%</div>
                                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                                      <div className={`h-full rounded-full ${achievement < 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(achievement, 100)}%` }}></div>
                                    </div>
                                 </div>
                              </div>
                            </div>
                          </div>
                        );
                     })}
                 </div>
             )}

             {/* 2. 부서 개별 KPI 섹션 */}
             {selectedDeptKpis.length === 0 && commonKpis.length === 0 && (
                <div className="p-12 text-center text-slate-400">
                    <p>{currentYear}년 {currentPeriod} 지표가 없습니다.</p>
                    <p className="text-sm mt-2">상단의 '팀 지표 추가' 버튼을 눌러보세요.</p>
                </div>
             )}
             {selectedDeptKpis.map((kpi) => {
                const achievement = calculateAchievement(kpi.target, kpi.current, kpi.lowerIsBetter);
                return (
                  <div key={kpi.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-indigo-500" />
                          <h3 className="font-bold text-slate-800">{kpi.name}</h3>
                          {kpi.lowerIsBetter && <span className="text-[10px] bg-slate-100 px-1 rounded border">낮을수록 좋음</span>}
                        </div>
                        <div className="text-xs text-slate-500 space-x-2">
                          <span>목표: {kpi.target.toLocaleString()}{kpi.unit}</span>
                          <span>비중: {kpi.weight * 100}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <div className="text-right">
                           <div className="text-[10px] text-slate-400 font-bold uppercase">실적</div>
                           <div className="flex items-center gap-1 justify-end">
                             <input type="number" value={kpi.current} 
                               onChange={(e) => handleUpdateKPIValue(selectedDeptId, kpi.id, e.target.value)}
                               className="w-20 text-right font-bold border-b border-indigo-200 focus:border-indigo-500 outline-none bg-transparent" 
                             />
                             <span className="text-xs text-slate-500">{kpi.unit}</span>
                           </div>
                         </div>
                         <div className="flex flex-col gap-1 border-l pl-3 border-slate-200">
                            <button onClick={() => { setEditingKpi(kpi); setIsModalOpen(true); }} className="text-slate-400 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteKPI(selectedDeptId, kpi.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                         </div>
                         <div className="w-24 text-right hidden md:block">
                            <div className={`font-bold text-sm ${achievement < 70 ? 'text-red-500' : 'text-green-600'}`}>{Math.round(achievement)}%</div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                              <div className={`h-full rounded-full ${achievement < 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${Math.min(achievement, 100)}%` }}></div>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                );
             })}
           </div>
        </div>
        )
      )}

      {/* 부서 개별 KPI Modal */}
      {isModalOpen && (
        <KPIFormModal 
            kpi={editingKpi} 
            title={editingKpi ? "팀 지표 수정" : "새 팀 지표 추가"}
            onClose={() => setIsModalOpen(false)} 
            onSave={(data) => handleSaveKPI(selectedDeptId, data)} 
        />
      )}

      {/* 전사 공통 KPI 관리 Modal */}
      {isCommonKpiModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[70] backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
                  <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
                      <div>
                          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-indigo-600"/> 전사 공통 지표 관리
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">{currentYear}년 {currentPeriod} 기준 (모든 부서에 공통 적용)</p>
                      </div>
                      <button onClick={() => setIsCommonKpiModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                      <div className="flex justify-between items-center mb-4">
                          <span className="font-bold text-sm text-slate-700">등록된 공통 지표 ({commonKpis.length})</span>
                          <button 
                            onClick={() => { setEditingKpi(null); setIsCommonFormOpen(true); }}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 flex items-center gap-1"
                          >
                              <Plus className="w-3 h-3"/> 지표 추가
                          </button>
                      </div>

                      {/* 리스트 표시 */}
                      <div className="space-y-3">
                          {commonKpis.map(kpi => (
                              <div key={kpi.id} className="border border-slate-200 rounded-lg p-4 flex justify-between items-center bg-white">
                                  <div>
                                      <h4 className="font-bold text-slate-800">{kpi.name}</h4>
                                      <div className="text-xs text-slate-500 mt-1 flex gap-3">
                                          <span>목표: {kpi.target.toLocaleString()}{kpi.unit}</span>
                                          <span>현재: <strong>{kpi.current.toLocaleString()}</strong></span>
                                          <span>비중: {kpi.weight * 100}%</span>
                                      </div>
                                  </div>
                                  <div className="flex gap-2">
                                      <button onClick={() => { setEditingKpi(kpi); setIsCommonFormOpen(true); }} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded"><Edit2 className="w-4 h-4"/></button>
                                      <button onClick={() => handleDeleteCommonKPI(kpi.id)} className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                              </div>
                          ))}
                          {commonKpis.length === 0 && <p className="text-center text-sm text-slate-400 py-4">이 기간에 등록된 전사 공통 지표가 없습니다.</p>}
                      </div>
                  </div>
              </div>
              
              {/* 중첩 모달: 공통 KPI 폼 */}
              {isCommonFormOpen && (
                  <KPIFormModal 
                    kpi={editingKpi} 
                    title={editingKpi ? "공통 지표 수정" : "새 공통 지표 추가"}
                    onClose={() => setIsCommonFormOpen(false)}
                    onSave={handleSaveCommonKPI}
                    isCommon={true}
                  />
              )}
          </div>
      )}
    </div>
  );
};

// KPI 입력/수정 폼 컴포넌트
const KPIFormModal = ({ kpi, title, onClose, onSave, isCommon = false }) => {
  const [formData, setFormData] = useState(kpi || { name: '', target: '', current: 0, unit: '', weight: 0.1, lowerIsBetter: false });
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90] backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in duration-200">
        <h3 className="font-bold text-lg flex items-center gap-2">
            {isCommon ? <Building2 className="w-5 h-5 text-indigo-600"/> : <Target className="w-5 h-5 text-indigo-600"/>}
            {title}
        </h3>
        
        {isCommon && <div className="bg-indigo-50 p-2 rounded text-xs text-indigo-700">전사 공통 지표는 모든 부서의 점수에 합산됩니다.</div>}

        <div className="space-y-3">
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">지표명</label>
                <input name="name" value={formData.name} onChange={handleChange} placeholder="예: 매출액, 고객만족도" className="w-full border border-slate-300 p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">목표값</label>
                    <input name="target" type="number" value={formData.target} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">단위</label>
                    <input name="unit" value={formData.unit} onChange={handleChange} placeholder="원, %, 건" className="w-full border border-slate-300 p-2 rounded-lg" />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">가중치 (0~1.0)</label>
                    <input name="weight" type="number" step="0.1" value={formData.weight} onChange={handleChange} placeholder="0.1" className="w-full border border-slate-300 p-2 rounded-lg" />
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">현재 실적</label>
                    <input name="current" type="number" value={formData.current} onChange={handleChange} className="w-full border border-slate-300 p-2 rounded-lg font-bold text-slate-700" />
                </div>
            </div>

            <div className="flex items-center gap-2 p-2 border rounded-lg bg-slate-50">
               <input type="checkbox" id="lib" name="lowerIsBetter" checked={formData.lowerIsBetter} onChange={handleChange} className="w-4 h-4 text-indigo-600 rounded" />
               <label htmlFor="lib" className="text-sm text-slate-600">낮을수록 좋은 지표 (예: 불량률, 비용)</label>
            </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">취소</button>
          <button onClick={() => onSave(formData)} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors">저장</button>
        </div>
      </div>
    </div>
  );
};


// --- 메인 앱 컴포넌트 ---
function App() {
  const [user, setUser] = useState(null);
  const [appMode, setAppMode] = useState('meeting');
  
  // --- Meeting States ---
  const [minutes, setMinutes] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('minutes');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); 
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('recent');
  const [selectedDept, setSelectedDept] = useState('전체');
  const [inputDate, setInputDate] = useState(''); 
  const [inputDept, setInputDept] = useState(DEPARTMENTS[0]); 
  const [inputData, setInputData] = useState({ report: '', progress: '', discussion: '' });
  const [feedbackInputDate, setFeedbackInputDate] = useState('');
  const [feedbackInputData, setFeedbackInputData] = useState({ 
      finance: '', finance_plan: '', hr: '', global: '', legal: '', logistics: '', it: '' 
  });
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
    const q1 = query(collection(db, 'weekly_minutes'));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // 회의록 순서는 작성일 기준 내림차순, 같은 날짜면 부서 순서
      loaded.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return DEPARTMENTS.indexOf(a.department) - DEPARTMENTS.indexOf(b.department);
      });
      setMinutes(loaded);
    });

    const q2 = query(collection(db, 'management_feedbacks'));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      loaded.sort((a, b) => b.date.localeCompare(a.date));
      setFeedbacks(loaded);
      setLoading(false);
    });
    return () => { unsub1(); unsub2(); };
  }, [user]);

  // --- Helpers ---
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

  const handleLoadLastWeek = () => {
    if (inputDept === '선택') { alert('부서를 먼저 선택해주세요.'); return; }
    const prev = minutes
      .filter(m => m.department === inputDept && (!inputDate || m.date < inputDate))
      .sort((a, b) => b.date.localeCompare(a.date));
      
    if (prev.length > 0) {
      const lastDoc = prev[0];
      if(window.confirm(`${lastDoc.date}일자 (${lastDoc.department}) 내용을 불러오시겠습니까?\n현재 작성 중인 내용은 덮어씌워집니다.`)) {
        setInputData({ 
          report: lastDoc.report || '', 
          progress: lastDoc.progress || '', 
          discussion: lastDoc.discussion || '' 
        });
      }
    } else { 
      alert('이전 회의록 내역이 없습니다.'); 
    }
  };

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

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!validateDate(feedbackInputDate)) return;
    if (!user) { alert("서버 연결 중입니다."); return; }

    setIsSubmitting(true);
    const payload = {
      date: feedbackInputDate,
      finance: processText(feedbackInputData.finance),
      finance_plan: processText(feedbackInputData.finance_plan),
      hr: processText(feedbackInputData.hr),
      global: processText(feedbackInputData.global),
      legal: processText(feedbackInputData.legal),
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

  const handleCloseModal = () => {
    setEditingId(null);
    setInputData({ report: '', progress: '', discussion: '' });
    setInputDate(''); setInputDept(DEPARTMENTS[0]);
    setIsModalOpen(false);
  };

  const handleCloseFeedbackModal = () => {
    setEditingFeedbackId(null);
    setFeedbackInputData({ finance: '', finance_plan: '', hr: '', global: '', legal: '', logistics: '', it: '' });
    setFeedbackInputDate('');
    setIsFeedbackModalOpen(false);
  };

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
        csvContent += "날짜,재무팀,재무기획팀,인사총무팀,해외사업팀,법무팀,구매물류팀,IT지원팀\n";
        targetDates.forEach(d => {
            feedbacks.filter(f => f.date === d).forEach(f => {
                csvContent += `${f.date},${clean(format(f.finance))},${clean(format(f.finance_plan))},${clean(format(f.hr))},${clean(format(f.global))},${clean(format(f.legal))},${clean(format(f.logistics))},${clean(format(f.it))}\n`;
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
      {/* 상단 네비게이션 (헤더) */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center text-slate-800 font-bold text-xl cursor-pointer" onClick={() => setAppMode('meeting')}>
                <Layout className="w-6 h-6 mr-2 text-indigo-600" />
                <span className="hidden sm:inline">그룹웨어</span>
                <span className="sm:hidden">GW</span>
              </div>
              <div className="hidden md:flex space-x-1 bg-gray-100 p-1 rounded-lg">
                <button
                    onClick={() => setAppMode('meeting')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${appMode === 'meeting' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <span className="flex items-center"><FileText className="w-4 h-4 mr-2"/>회의록 관리</span>
                </button>
                <button
                    onClick={() => setAppMode('kpi')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${appMode === 'kpi' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <span className="flex items-center"><BarChart3 className="w-4 h-4 mr-2"/>KPI 대시보드</span>
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
                {appMode === 'meeting' && (
                    <>
                         <a href="https://composecoffee1-my.sharepoint.com/:x:/g/personal/choihy_composecoffee_co_kr/IQBRHgvwRo3ZT5ytCTKVpBlRAcE4zXsMEqjohnr8xTI-RJ0?rtime=CQM385lC3kg" 
                            target="_blank" rel="noreferrer"
                            className="hidden md:flex items-center px-3 py-2 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors border border-gray-200"
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
                    </>
                )}
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-gray-500">
                    <Menu className="w-6 h-6" />
                </button>
            </div>
          </div>
        </div>
        
        {isMobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-gray-200">
                <div className="p-2 space-y-1">
                    <p className="px-4 py-2 text-xs font-bold text-gray-400">메뉴 이동</p>
                    <button onClick={() => { setAppMode('meeting'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 rounded-md flex items-center ${appMode === 'meeting' ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}>
                        <FileText className="w-5 h-5 mr-3"/> 회의록 관리
                    </button>
                    <button onClick={() => { setAppMode('kpi'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 rounded-md flex items-center ${appMode === 'kpi' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600'}`}>
                        <BarChart3 className="w-5 h-5 mr-3"/> KPI 대시보드
                    </button>
                </div>
            </div>
        )}
      </nav>

      {/* ======================= */}
      {/* 메인 컨텐츠 영역     */}
      {/* ======================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* [MODE 1] KPI 대시보드 */}
        {appMode === 'kpi' && (
            <KPIDashboard />
        )}

        {/* [MODE 2] 회의록 시스템 */}
        {appMode === 'meeting' && (
            <>
                <div className="flex space-x-4 border-b border-gray-200 mb-6">
                     <button
                        onClick={() => setCurrentView('minutes')}
                        className={`pb-3 text-sm font-medium transition-colors flex items-center border-b-2 ${currentView === 'minutes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Users className="w-4 h-4 mr-2"/>부서 회의록
                    </button>
                    <button
                        onClick={() => setCurrentView('management')}
                        className={`pb-3 text-sm font-medium transition-colors flex items-center border-b-2 ${currentView === 'management' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Megaphone className="w-4 h-4 mr-2"/>경영본부 회의
                    </button>
                </div>

                {currentView === 'minutes' && (
                    <div className="space-y-6">
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
                                                // [수정] 7개 팀 필드 모두 로드
                                                setFeedbackInputData({ 
                                                    finance: fb.finance, finance_plan: fb.finance_plan, hr: fb.hr, 
                                                    global: fb.global, legal: fb.legal, logistics: fb.logistics, it: fb.it 
                                                });
                                                setIsFeedbackModalOpen(true);
                                            }} className="px-3 py-1 bg-white border border-indigo-200 text-indigo-600 rounded text-xs hover:bg-indigo-50">수정</button>
                                            <button onClick={async () => {
                                                if (window.confirm("삭제하시겠습니까?")) await deleteDoc(doc(db, 'management_feedbacks', fb.id));
                                            }} className="px-3 py-1 bg-white border border-red-200 text-red-600 rounded text-xs hover:bg-red-50">삭제</button>
                                        </div>
                                    </div>
                                    
                                    {/* [수정] 7개 컬럼 그리드 대응 (반응형) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:gap-px bg-indigo-50 border-t border-indigo-100">
                                        {FEEDBACK_TEAMS.map(team => (
                                            <div key={team.id} className="p-5 bg-white hover:bg-gray-50 h-full">
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
            </>
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

                    <div className="flex justify-end">
                        <button 
                            type="button" 
                            onClick={handleLoadLastWeek}
                            className="flex items-center text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors"
                        >
                            <RotateCcw className="w-4 h-4 mr-1.5"/> 지난주 내용 불러오기
                        </button>
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
                        {/* [수정] 7개 팀 입력 필드 그리드 */}
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

const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
}

export default App;
