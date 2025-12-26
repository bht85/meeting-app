import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, FileText, CheckSquare, ChevronRight, Plus, Search, Briefcase, 
  ArrowRight, Save, Clock, LayoutDashboard, Network, Edit3, UserPlus, 
  AlertCircle, CheckCircle2, Paperclip, ArrowRightLeft, MoreHorizontal, X, 
  History, Phone, Mail, Calendar as CalendarIcon, Sparkles, Loader2, Repeat, Timer, Target, 
  Link as LinkIcon, TrendingUp, Settings, CreditCard, Shield, Zap, BarChart3, 
  ChevronDown, Award, Star, MessageSquare, PieChart, LogOut, UserMinus, 
  Briefcase as DeptIcon, RefreshCw, Lock, AlignLeft, Hash, Trash2, ChevronLeft 
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc 
} from "firebase/firestore";

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyBW7PWXA3a0SsHBs9XvdscAwCrbhlpYoGI",
  authDomain: "next-step-app-f7295.firebaseapp.com",
  projectId: "next-step-app-f7295",
  storageBucket: "next-step-app-f7295.firebasestorage.app",
  messagingSenderId: "1045900060970",
  appId: "1:1045900060970:web:ee32a1f45663c92960d653"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- 프랜차이즈 시나리오 더미 데이터 (데이터가 없을 때 사용) ---
const initialUsers = [
  // 1. 대표이사
  { id: 'ceo', name: '김대표', team: '임원실', role: 'CEO', phone: '010-1111-0001', email: 'ceo@franchise.com', status: 'active', joinDate: '2015-03-01' },
  
  // 2. 영업팀 (3명)
  { id: 'sales1', name: '박영업', team: '영업팀', role: '팀장', phone: '010-2222-0001', email: 'park.sales@franchise.com', status: 'active', joinDate: '2018-05-10' },
  { id: 'sales2', name: '최매출', team: '영업팀', role: '과장', phone: '010-2222-0002', email: 'choi.sales@franchise.com', status: 'active', joinDate: '2020-01-15' },
  { id: 'sales3', name: '정개척', team: '영업팀', role: '대리', phone: '010-2222-0003', email: 'jung.sales@franchise.com', status: 'active', joinDate: '2022-08-20' },

  // 3. 운영팀 (10명)
  { id: 'ops1', name: '이운영', team: '운영팀', role: '팀장', phone: '010-3333-0001', email: 'lee.ops@franchise.com', status: 'active', joinDate: '2017-11-01' },
  { id: 'ops2', name: '김슈퍼', team: '운영팀', role: 'SV(슈퍼바이저)', phone: '010-3333-0002', email: 'kim.sv@franchise.com', status: 'active', joinDate: '2019-04-05' },
  { id: 'ops3', name: '박관리', team: '운영팀', role: 'SV(슈퍼바이저)', phone: '010-3333-0003', email: 'park.sv@franchise.com', status: 'active', joinDate: '2021-02-12' },
  { id: 'ops4', name: '최매장', team: '운영팀', role: 'SV(슈퍼바이저)', phone: '010-3333-0004', email: 'choi.sv@franchise.com', status: 'active', joinDate: '2021-06-30' },
  { id: 'ops5', name: '정품질', team: '운영팀', role: 'QSC 담당', phone: '010-3333-0005', email: 'jung.qsc@franchise.com', status: 'active', joinDate: '2020-09-15' },
  { id: 'ops6', name: '강교육', team: '운영팀', role: '교육 담당', phone: '010-3333-0006', email: 'kang.edu@franchise.com', status: 'active', joinDate: '2022-01-10' },
  { id: 'ops7', name: '조순회', team: '운영팀', role: 'SV(슈퍼바이저)', phone: '010-3333-0007', email: 'cho.sv@franchise.com', status: 'active', joinDate: '2023-03-01' },
  { id: 'ops8', name: '윤해결', team: '운영팀', role: 'SV(슈퍼바이저)', phone: '010-3333-0008', email: 'yoon.sv@franchise.com', status: 'active', joinDate: '2023-05-20' },
  { id: 'ops9', name: '장매뉴', team: '운영팀', role: '매뉴얼 담당', phone: '010-3333-0009', email: 'jang.manual@franchise.com', status: 'active', joinDate: '2024-01-02' },
  { id: 'ops10', name: '한신입', team: '운영팀', role: '사원', phone: '010-3333-0010', email: 'han.new@franchise.com', status: 'active', joinDate: '2025-01-01' },

  // 4. 마케팅팀 (2명)
  { id: 'mkt1', name: '임마케', team: '마케팅팀', role: '팀장', phone: '010-4444-0001', email: 'lim.mkt@franchise.com', status: 'active', joinDate: '2019-12-01' },
  { id: 'mkt2', name: '송홍보', team: '마케팅팀', role: '대리', phone: '010-4444-0002', email: 'song.pr@franchise.com', status: 'active', joinDate: '2023-07-01' },

  // 5. 상품개발팀 (3명)
  { id: 'rnd1', name: '최맛나', team: '상품개발팀', role: '팀장(셰프)', phone: '010-5555-0001', email: 'choi.chef@franchise.com', status: 'active', joinDate: '2016-08-20' },
  { id: 'rnd2', name: '김연구', team: '상품개발팀', role: '연구원', phone: '010-5555-0002', email: 'kim.rnd@franchise.com', status: 'active', joinDate: '2021-11-11' },
  { id: 'rnd3', name: '이소스', team: '상품개발팀', role: '연구원', phone: '010-5555-0003', email: 'lee.sauce@franchise.com', status: 'active', joinDate: '2024-02-15' },

  // 6. 경영지원팀 (4명)
  { id: 'fin1', name: '나재무', team: '경영지원팀', role: '팀장(CFO)', phone: '010-6666-0001', email: 'na.cfo@franchise.com', status: 'active', joinDate: '2017-01-05' },
  { id: 'fin2', name: '조회계', team: '경영지원팀', role: '재무 대리', phone: '010-6666-0002', email: 'cho.acct@franchise.com', status: 'active', joinDate: '2022-04-01' },
  { id: 'hr1', name: '박인사', team: '경영지원팀', role: '인사 과장', phone: '010-6666-0003', email: 'park.hr@franchise.com', status: 'active', joinDate: '2020-10-10' },
  { id: 'ga1', name: '이총무', team: '경영지원팀', role: '총무 사원', phone: '010-6666-0004', email: 'lee.ga@franchise.com', status: 'active', joinDate: '2024-09-01' },
];

const initialKPIs = [
  { id: 'KPI-CO-25', year: '2025', team: '전사', type: 'QUANT', title: '연 매출 300억 달성', target: 300, current: 185, unit: '억', status: 'warning', description: '기존점 매출 증대 및 신규 출점을 통한 외형 성장' },
  { id: 'KPI-SA-01', year: '2025', team: '영업팀', type: 'QUANT', title: '가맹점 200호점 돌파', target: 200, current: 142, unit: '개', status: 'warning', description: '지방 거점 도시 신규 출점 집중' },
  { id: 'KPI-MK-01', year: '2025', team: '마케팅팀', type: 'QUANT', title: '분기별 시즌 프로모션 실행', target: 4, current: 1, unit: '회', status: 'success', description: '신메뉴 출시 연계 및 브랜드 인지도 제고' },
  { id: 'KPI-OP-01', year: '2025', team: '운영팀', type: 'QUAL', title: '가맹점 관리 프로세스 표준화', target: '완료', current: '진행중', grade: 'B', status: 'warning', description: 'QSC 점검 기준 통일 및 리포트 시스템화' },
  { id: 'KPI-OP-02', year: '2025', team: '운영팀', type: 'QUANT', title: '평균 QSC 점수 90점 달성', target: 90, current: 84, unit: '점', status: 'warning', description: '위생 등급제 인증 확대' },
  { id: 'KPI-RD-01', year: '2025', team: '상품개발팀', type: 'QUANT', title: '시그니처 신메뉴 2종 출시', target: 2, current: 1, unit: '종', status: 'success', description: '매출 견인 핵심 메뉴 개발' },
  { id: 'KPI-MS-01', year: '2025', team: '경영지원팀', type: 'QUAL', title: '신규 ERP/그룹웨어 도입', target: '안정화', current: '선정 완료', grade: 'A', status: 'success', description: '수기 업무 자동화' },
  { id: 'KPI-MS-02', year: '2025', team: '경영지원팀', type: 'QUAL', title: '업무 효율화 캠페인', target: '회의 30% 절감', current: '기획 단계', grade: 'B', status: 'warning', description: '스마트워크 문화 정착' }
];

const initialTasks = [
  { id: 'T-SA-01', ownerId: 'sales1', kpiId: 'KPI-SA-01', title: '창업 박람회 부스 운영', description: '프랜차이즈 박람회 상담 및 DB 확보', docCount: 2, updatedAt: '2025.01.10', timeRequired: '20H', frequency: '분기 1회', history: [] },
  { id: 'T-SA-02', ownerId: 'sales2', kpiId: 'KPI-SA-01', title: '신규 가맹 상담', description: '일일 문의 고객 응대 및 상권 분석', docCount: 5, updatedAt: '2025.01.20', timeRequired: '4H', frequency: '매일', history: [] },
  { id: 'T-OP-01', ownerId: 'ops1', kpiId: 'KPI-OP-01', title: '체크리스트 개편', description: '점검 항목 최적화 및 모바일화', docCount: 1, updatedAt: '2025.01.05', timeRequired: '10H', frequency: '일회성', history: [] },
  { id: 'T-OP-02', ownerId: 'ops2', kpiId: 'KPI-OP-02', title: '권역 순회 점검', description: '가맹점 QSC 점검 및 점주 면담', docCount: 12, updatedAt: '2025.01.22', timeRequired: '6H', frequency: '매일', history: [] },
  { id: 'T-MK-01', ownerId: 'mkt1', kpiId: 'KPI-MK-01', title: '봄 시즌 프로모션 기획', description: '체험단 운영 및 포스터 디자인 발주', docCount: 4, updatedAt: '2025.01.18', timeRequired: '15H', frequency: '시즌별', history: [] },
  { id: 'T-RD-01', ownerId: 'rnd1', kpiId: 'KPI-RD-01', title: '여름 한정 메뉴 테스트', description: '경쟁사 분석 및 블라인드 테스트', docCount: 2, updatedAt: '2025.01.20', timeRequired: '4H', frequency: '주간', history: [] },
  { id: 'T-MS-01', ownerId: 'fin1', kpiId: 'KPI-CO-25', title: '월간 손익 마감', description: '전사 매출 집계 및 로열티 정산', docCount: 10, updatedAt: '2025.01.01', timeRequired: '8H', frequency: '월 1회', history: [] },
  { id: 'T-MS-02', ownerId: 'hr1', kpiId: 'KPI-MS-01', title: '그룹웨어 업체 미팅', description: '주요 솔루션 비교 및 견적 검토', docCount: 3, updatedAt: '2025.01.12', timeRequired: '2H', frequency: '수시', history: [] }
];

const initialOrgChart = {
  name: "김대표 CEO",
  role: "대표이사",
  hasRnR: true,
  children: [
    { name: "영업팀", type: "department", children: [{ name: "박영업", role: "팀장", hasRnR: true, id: 'sales1' }, { name: "최매출", role: "과장", hasRnR: true, id: 'sales2' }, { name: "정개척", role: "대리", hasRnR: true, id: 'sales3' }] },
    { name: "운영팀", type: "department", children: [{ name: "이운영", role: "팀장", hasRnR: true, id: 'ops1' }, { name: "김슈퍼", role: "SV", hasRnR: true, id: 'ops2' }, { name: "...", role: "외 8명", hasRnR: true, id: 'ops_etc' }] },
    { name: "마케팅팀", type: "department", children: [{ name: "임마케", role: "팀장", hasRnR: true, id: 'mkt1' }, { name: "송홍보", role: "대리", hasRnR: true, id: 'mkt2' }] },
    { name: "상품개발팀", type: "department", children: [{ name: "최맛나", role: "팀장", hasRnR: true, id: 'rnd1' }, { name: "김연구", role: "연구원", hasRnR: true, id: 'rnd2' }, { name: "이소스", role: "연구원", hasRnR: true, id: 'rnd3' }] },
    { name: "경영지원팀", type: "department", children: [{ name: "나재무", role: "팀장", hasRnR: true, id: 'fin1' }, { name: "박인사", role: "과장", hasRnR: true, id: 'hr1' }, { name: "조회계", role: "대리", hasRnR: true, id: 'fin2' }, { name: "이총무", role: "사원", hasRnR: true, id: 'ga1' }] }
  ]
};

const subscriptionData = {
  plan: "Pro", status: "active", price: "50,000원 / 월", nextBilling: "2025.02.15", paymentMethod: "법인카드 (**** 5678)",
  usage: { seats: { used: 23, total: 30 }, storage: { used: 120, total: 500, unit: "GB" }, aiCredits: { used: 4500, total: 10000 } },
  billingHistory: [ { date: "2025.01.15", amount: "50,000원", status: "결제완료" } ]
};

// --- Utils ---
const Badge = ({ children, color = 'blue' }) => {
  const colorClass = {
    blue: 'bg-blue-100 text-blue-800', green: 'bg-green-100 text-green-800', yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-100 text-gray-800', red: 'bg-red-100 text-red-800', purple: 'bg-purple-100 text-purple-800',
    indigo: 'bg-indigo-100 text-indigo-800', orange: 'bg-orange-100 text-orange-800'
  }[color];
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>{children}</span>;
};

const GradeBadge = ({ grade }) => {
  const color = { 'S': 'purple', 'A': 'green', 'B': 'blue', 'C': 'yellow', 'D': 'red' }[grade] || 'gray';
  return <span className={`w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm bg-${color}-100 text-${color}-700 border border-${color}-200`}>{grade}</span>;
};

// Mock AI
const generateAIContent = async (prompt) => new Promise(r => setTimeout(() => r("[Pro 기능] AI가 작성한 스마트한 내용이 여기에 표시됩니다."), 1000));

// --- Team Code Helper ---
const getTeamCode = (teamName) => {
    if (!teamName) return 'ETC'; 
    if (teamName.includes('영업')) return 'SA';
    if (teamName.includes('운영')) return 'OP';
    if (teamName.includes('마케팅')) return 'MK';
    if (teamName.includes('개발') || teamName.includes('R&D')) return 'RD';
    if (teamName.includes('지원') || teamName.includes('재무') || teamName.includes('인사')) return 'MS';
    return 'CO';
};

export default function NextStepApp() {
  const [currentPlan, setCurrentPlan] = useState('PRO'); 
  const [activeTab, setActiveTab] = useState('rnr'); 
  
  // Data State (LocalStorage + Firebase Placeholder)
  const [users, setUsers] = useState(() => JSON.parse(localStorage.getItem('ns_users_v2')) || initialUsers);
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('ns_tasks_v2')) || initialTasks);
  const [kpis, setKpis] = useState(() => JSON.parse(localStorage.getItem('ns_kpis_v2')) || initialKPIs);
  const [reviews, setReviews] = useState(() => JSON.parse(localStorage.getItem('ns_reviews_v2')) || []);
  const [orgData, setOrgData] = useState(() => JSON.parse(localStorage.getItem('ns_orgData_v2')) || initialOrgChart);

  useEffect(() => { localStorage.setItem('ns_users_v2', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('ns_tasks_v2', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('ns_kpis_v2', JSON.stringify(kpis)); }, [kpis]);
  useEffect(() => { localStorage.setItem('ns_reviews_v2', JSON.stringify(reviews)); }, [reviews]);
  useEffect(() => { localStorage.setItem('ns_orgData_v2', JSON.stringify(orgData)); }, [orgData]);

  // UI States
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false); 
  const [showDetailModal, setShowDetailModal] = useState(false); 
  const [rnrViewMode, setRnrViewMode] = useState('team'); 
  const [isOrgEditMode, setIsOrgEditMode] = useState(false);
  const [adminTab, setAdminTab] = useState('hr');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [targetDeptForAdd, setTargetDeptForAdd] = useState("");
  const [selectedTask, setSelectedTask] = useState(null); 

  // Edit Task State
  const [isTaskEditing, setIsTaskEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", timeRequired: "", frequency: "" });

  // Filters
  const [selectedKpiYear, setSelectedKpiYear] = useState('2025');
  const [selectedEvalPeriod, setSelectedEvalPeriod] = useState('2025 1Q');
  const [selectedEvalUser, setSelectedEvalUser] = useState('sales1'); 
  const [evalViewType, setEvalViewType] = useState('team');

  // Form States (New Task)
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [newDocTime, setNewDocTime] = useState(""); 
  const [newDocFreq, setNewDocFreq] = useState("");
  const [selectedKpi, setSelectedKpi] = useState(""); 
  const [newTaskOwnerId, setNewTaskOwnerId] = useState(""); 
  const [isAiWriting, setIsAiWriting] = useState(false);

  // Form States (Member)
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("");
  const [aiInsightOpen, setAiInsightOpen] = useState(false);
  const [aiInsightResult, setAiInsightResult] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Helpers (안전 장치 추가)
  const activeUsers = useMemo(() => users ? users.filter(u => u && u.status !== 'resigned') : [], [users]);
  const teams = useMemo(() => activeUsers.length > 0 ? [...new Set(activeUsers.map(u => u.team))].filter(Boolean) : [], [activeUsers]);
  const years = useMemo(() => kpis ? [...new Set(kpis.map(k => k.year))].sort().reverse() : ['2025'], [kpis]);

  const getUserInfo = (id) => users.find(u => u.id === id) || { name: '미정', role: '-', team: '-' };
  const getKpiInfo = (kpiId) => kpis.find(k => k.id === kpiId);
  const calculateAchievement = (kpi) => {
    if (kpi.type === 'QUAL') return 0;
    const rate = kpi.unit === 'sec' ? (kpi.target >= kpi.current ? 100 : Math.round((kpi.target / kpi.current) * 100)) : Math.round((kpi.current / kpi.target) * 100);
    return Math.min(rate, 100);
  };
  const getYearlyKpiStats = () => years.map(year => {
      const yearKpis = kpis.filter(k => k.year === year && k.type === 'QUANT');
      const rate = yearKpis.length ? Math.round(yearKpis.reduce((acc, k) => acc + calculateAchievement(k), 0) / yearKpis.length) : 0;
      return { year, rate };
  }).sort((a,b) => a.year.localeCompare(b.year));

  // --- Handlers ---
  const handleProFeatureClick = () => { if (currentPlan === 'BASIC') setShowUpgradeModal(true); };
  
  const handleResetData = () => {
      if(window.confirm("모든 데이터를 초기화하고 프랜차이즈 예시 데이터로 복구하시겠습니까?")) {
          localStorage.setItem('ns_users_v2', JSON.stringify(initialUsers));
          localStorage.setItem('ns_tasks_v2', JSON.stringify(initialTasks));
          localStorage.setItem('ns_kpis_v2', JSON.stringify(initialKPIs));
          localStorage.setItem('ns_reviews_v2', JSON.stringify([]));
          localStorage.setItem('ns_orgData_v2', JSON.stringify(initialOrgChart));
          alert("데이터가 초기화되었습니다. 화면을 새로고침합니다.");
          window.location.reload();
      }
  };

  const handleSaveTask = async () => {
    if (!newDocTitle) return alert('제목을 입력해주세요.');
    if (!newTaskOwnerId) return alert('담당자를 선택해주세요.');

    const owner = getUserInfo(newTaskOwnerId);
    const teamPrefix = getTeamCode(owner.team);
    
    // Safety check
    const currentTasks = Array.isArray(tasks) ? tasks : [];
    const teamTaskCount = currentTasks.filter(t => {
        const tOwner = users.find(u => u.id === t.ownerId);
        return tOwner && tOwner.team === owner.team;
    }).length + 1;
    
    const newTaskId = `T-${teamPrefix}-${String(teamTaskCount).padStart(2, '0')}`;

    const newTask = {
      id: newTaskId,
      ownerId: newTaskOwnerId,
      kpiId: selectedKpi || null,
      title: newDocTitle,
      description: newDocContent,
      docCount: 0,
      updatedAt: new Date().toISOString().split('T')[0].replace(/-/g, '.'),
      timeRequired: newDocTime || '미정',
      frequency: newDocFreq || '미정',
      history: [{ date: new Date().toISOString().split('T')[0].replace(/-/g, '.'), type: 'create', user: '관리자', details: '신규 업무 생성' }]
    };
    
    setTasks([newTask, ...currentTasks]);
    try { await addDoc(collection(db, "tasks"), newTask); } catch (e) { console.log("DB Error (Local OK)"); }
    setShowWriteModal(false);
    alert(`업무가 등록되었습니다. (${newTaskId})`);
  };

  const handleAddMember = () => {
      if (!newMemberName || !newMemberRole || !targetDeptForAdd) return alert("정보 입력 필요");
      const newId = `u-${Date.now()}`;
      setUsers([...users, { id: newId, name: newMemberName, role: newMemberRole, team: targetDeptForAdd, status: 'active', joinDate: '2025-01-25', email: 'new@nextstep.com' }]);
      setShowAddMemberModal(false); alert("추가됨");
  };
  const handleResignMember = (userId) => {
      if (!window.confirm("정말 퇴사 처리하시겠습니까?")) return;
      setUsers(users.map(u => u.id === userId ? { ...u, status: 'resigned', leaveDate: '2025-01-25' } : u));
      alert("퇴사 처리가 완료되었습니다.");
  };
  const handleTransfer = (targetUserId) => {
    if (!selectedTask) return;
    const currentUser = users.find(u => u.id === selectedTask.ownerId);
    const targetUser = users.find(u => u.id === targetUserId);
    const updatedTasks = tasks.map(t => t.id === selectedTask.id ? { ...t, ownerId: targetUserId, history: [{ date: '2025.01.25', type: 'transfer', from: currentUser?.name, to: targetUser?.name, details: '담당자 변경' }, ...t.history] } : t);
    setTasks(updatedTasks);
    setTransferModalOpen(false);
    setSelectedTask(null);
    alert('이관 완료');
  };

  const startEditingTask = () => {
    setEditForm({ title: selectedTask.title, description: selectedTask.description, timeRequired: selectedTask.timeRequired, frequency: selectedTask.frequency });
    setIsTaskEditing(true);
  };
  const saveEditedTask = () => {
    const updatedTasks = tasks.map(t => t.id === selectedTask.id ? { ...t, ...editForm, updatedAt: new Date().toISOString().split('T')[0].replace(/-/g,'.') } : t);
    setTasks(updatedTasks);
    setSelectedTask({ ...selectedTask, ...editForm });
    setIsTaskEditing(false);
    alert("수정되었습니다.");
  };

  const handleAiDraft = async () => { if (!newDocTitle) return alert("제목 필요"); setIsAiWriting(true); const r = await generateAIContent(`제목: ${newDocTitle}`); setNewDocContent(r); setIsAiWriting(false); };
  const handleAiInsight = async () => { setAiInsightOpen(true); setIsAiLoading(true); const r = await generateAIContent("분석"); setAiInsightResult(r); setIsAiLoading(false); };

  // --- Views ---

  const NavigationBar = () => {
    const menuItems = [
      { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, proOnly: true },
      { id: 'calendar', label: '일정', icon: CalendarIcon, proOnly: false },
      { id: 'rnr', label: '팀 R&R', icon: Users, proOnly: false },
      { id: 'org', label: '조직도', icon: Network, proOnly: false },
      { id: 'kpi', label: 'KPI 관리', icon: Target, proOnly: true },
      { id: 'eval', label: '성과 평가', icon: Award, proOnly: true },
      { id: 'admin', label: '관리자', icon: Settings, proOnly: false },
    ];
    return (
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex space-x-1 overflow-x-auto no-scrollbar">
          {menuItems.map((item) => {
            const isLocked = item.proOnly && currentPlan === 'BASIC';
            return (
              <button key={item.id} onClick={() => isLocked ? handleProFeatureClick() : setActiveTab(item.id)} className={`flex items-center space-x-2 py-4 px-4 border-b-2 transition font-medium text-sm whitespace-nowrap ${activeTab === item.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <item.icon size={18} /><span>{item.label}</span>{isLocked && <Lock size={12} className="text-gray-400 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const CalendarView = () => {
      const today = new Date();
      return (
          <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center"><CalendarIcon className="mr-2 text-indigo-600"/> {today.getFullYear()}년 {today.getMonth()+1}월 업무 일정</h2>
                  <div className="flex gap-2"><button className="p-1 rounded hover:bg-gray-100"><ChevronLeft/></button><span className="font-bold text-gray-700">Today</span><button className="p-1 rounded hover:bg-gray-100"><ChevronRight/></button></div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="grid grid-cols-7 text-center bg-gray-50 border-b border-gray-200">{['일', '월', '화', '수', '목', '금', '토'].map(d => <div key={d} className="py-2 text-sm font-bold text-gray-500">{d}</div>)}</div>
                  <div className="grid grid-cols-7 h-[600px]">
                      {Array.from({length: 31}).map((_, i) => {
                          const day = i + 1;
                          const dayTasks = tasks.filter((t, idx) => (idx + day) % 7 === 0 || (t.frequency === '매일' && day % 2 === 0)).slice(0, 3);
                          const isToday = day === today.getDate();
                          return (
                              <div key={day} className="border-b border-r border-gray-100 p-2 min-h-[80px] relative hover:bg-gray-50 transition">
                                  <span className={`text-sm font-medium ${isToday ? 'bg-indigo-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-gray-700'}`}>{day}</span>
                                  <div className="mt-2 space-y-1">{dayTasks.map(t => (<div key={t.id} className="text-[10px] bg-indigo-50 text-indigo-700 px-1 py-0.5 rounded truncate cursor-pointer hover:bg-indigo-100" onClick={() => { setSelectedTask(t); setShowDetailModal(true); }}>{t.title}</div>))}</div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      );
  };

  const RnRView = () => {
    const teamGroups = {};
    if (teams && teams.length > 0) {
        teams.forEach(team => {
          const members = activeUsers.filter(u => u.team === team);
          const teamTasks = tasks.filter(t => members.some(m => m.id === t.ownerId));
          teamGroups[team] = { members, tasks: teamTasks };
        });
    }

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center bg-indigo-50 p-6 rounded-xl border border-indigo-100">
          <div><h2 className="text-xl font-bold text-indigo-900 mb-1">팀 업무(R&R) 관리</h2><p className="text-sm text-indigo-700">팀별 업무 분장과 진행 상황을 한눈에 파악하세요.</p></div>
          <div className="flex gap-2">
             <div className="bg-white p-1 rounded-lg flex text-sm shadow-sm">
                <button onClick={() => setRnrViewMode('team')} className={`px-3 py-1.5 rounded transition ${rnrViewMode === 'team' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-500'}`}>팀별</button>
                <button onClick={() => setRnrViewMode('user')} className={`px-3 py-1.5 rounded transition ${rnrViewMode === 'user' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-500'}`}>인원별</button>
             </div>
             <button onClick={() => { setNewDocTitle(""); setNewTaskOwnerId(""); setShowWriteModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition flex items-center shadow-md"><Plus size={18} className="mr-2"/> 업무 추가</button>
          </div>
        </div>

        {rnrViewMode === 'team' ? (
          <div className="grid gap-6">
            {Object.entries(teamGroups).map(([teamName, data]) => (
              <div key={teamName} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                  <h3 className="font-bold text-gray-800 flex items-center text-lg"><Briefcase size={20} className="mr-2 text-gray-500"/> {teamName}</h3>
                  <Badge color="blue">{data.members.length}명 / {data.tasks.length}개 업무</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {data.tasks.map(task => {
                    const owner = activeUsers.find(u => u.id === task.ownerId);
                    return (
                      <div 
                        key={task.id} 
                        onClick={() => { setSelectedTask(task); setIsTaskEditing(false); setShowDetailModal(true); }}
                        className="p-4 border border-gray-100 rounded-lg hover:shadow-md transition bg-gray-50/50 hover:bg-white cursor-pointer group"
                      >
                        <div className="flex justify-between items-start mb-2"><span className="text-xs font-bold text-gray-500">{owner?.name} {owner?.role}</span>{task.kpiId && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">KPI</span>}</div>
                        <div className="text-[10px] text-gray-400 mb-1 font-mono">{task.id}</div>
                        <h4 className="font-bold text-gray-800 text-sm mb-1">{task.title}</h4>
                        <div className="mt-2 flex gap-2 text-[10px] text-gray-400"><Timer size={10}/> {task.timeRequired} <span className="text-gray-300">|</span> <Repeat size={10}/> {task.frequency}</div>
                      </div>
                    );
                  })}
                  {data.tasks.length === 0 && <div className="col-span-3 py-6 text-center text-gray-400 text-sm">등록된 업무가 없습니다.</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {activeUsers.map(u => (
               <div key={u.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-100">
                     <div><div className="font-bold text-gray-800">{u.name}</div><div className="text-xs text-gray-500">{u.team} {u.role}</div></div>
                     <div className="text-xs bg-gray-100 px-2 py-1 rounded">{tasks.filter(t => t.ownerId === u.id).length}건</div>
                  </div>
                  <div className="space-y-2">
                     {tasks.filter(t => t.ownerId === u.id).map(t => (
                        <div 
                            key={t.id} 
                            onClick={() => { setSelectedTask(t); setIsTaskEditing(false); setShowDetailModal(true); }}
                            className="bg-gray-50 p-2 rounded border border-gray-100 text-sm flex justify-between cursor-pointer hover:bg-indigo-50 hover:border-indigo-200 transition"
                        >
                            <span className="truncate">{t.title}</span>
                            <span className="text-xs text-gray-400 ml-2">{t.id}</span>
                        </div>
                     ))}
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>
    );
  };

  const OrgChartView = () => (
    <div className="space-y-4 animate-fade-in">
       <div className="bg-white p-10 rounded-xl border border-gray-200 shadow-sm overflow-x-auto flex justify-center min-h-[600px]">
          <div className="flex flex-col items-center">
             <div className="w-48 bg-indigo-600 text-white p-3 rounded-lg text-center font-bold shadow-md relative z-10">{orgData.name} <span className="text-indigo-200 text-xs">{orgData.role}</span><div className="absolute h-8 w-0.5 bg-gray-300 -bottom-8 left-1/2"></div></div>
             <div className="flex gap-6 mt-8 border-t-2 border-gray-300 pt-8 relative">
                {orgData.children && orgData.children.map((dept, idx) => (
                   <div key={idx} className="flex flex-col items-center relative">
                      <div className="absolute h-8 w-0.5 bg-gray-300 -top-8"></div>
                      <div className="bg-gray-100 px-4 py-2 rounded-lg font-bold text-gray-700 mb-4 border border-gray-200 shadow-sm">{dept.name}</div>
                      <div className="space-y-2">
                         {dept.children && dept.children.map((m, mi) => (
                            <div key={mi} className="bg-white border border-gray-200 p-2 rounded w-40 text-center text-sm shadow-sm"><span className="font-bold">{m.name}</span> <span className="text-gray-500 text-xs">{m.role}</span></div>
                         ))}
                      </div>
                   </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );

  const AdminView = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white shadow-lg flex justify-between items-center">
            <div><h2 className="text-xl font-bold flex items-center"><Settings className="mr-2"/> 관리자 설정 (Demo)</h2><p className="text-gray-400 text-sm">요금제를 변경하여 기능을 테스트해보세요.</p></div>
            <div className="bg-white/20 p-1 rounded-lg flex text-sm"><button onClick={() => setCurrentPlan('BASIC')} className={`px-4 py-2 rounded transition ${currentPlan === 'BASIC' ? 'bg-white text-gray-900 font-bold' : 'text-gray-300'}`}>Basic</button><button onClick={() => setCurrentPlan('PRO')} className={`px-4 py-2 rounded transition ${currentPlan === 'PRO' ? 'bg-indigo-500 text-white font-bold' : 'text-gray-300'}`}>Pro</button></div>
        </div>
        
        <div className="flex space-x-4 border-b border-gray-200 pb-1">
            <button onClick={() => setAdminTab('hr')} className={`pb-2 px-1 text-sm font-medium ${adminTab === 'hr' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>인사 관리</button>
            <button onClick={() => setAdminTab('subscription')} className={`pb-2 px-1 text-sm font-medium ${adminTab === 'subscription' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}>구독 정보</button>
        </div>

        {adminTab === 'hr' ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-700">임직원 리스트 ({activeUsers.length}명)</h3><button onClick={() => { setTargetDeptForAdd(teams[0]); setShowAddMemberModal(true); }} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700">입사자 등록</button></div>
                <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm text-left"><thead className="bg-white text-gray-500 border-b border-gray-100 sticky top-0"><tr><th className="px-4 py-2">이름</th><th className="px-4 py-2">부서/직책</th><th className="px-4 py-2">상태</th><th className="px-4 py-2 text-right">관리</th></tr></thead><tbody className="divide-y divide-gray-50">{users.map(u => (<tr key={u.id}><td className="px-4 py-3 font-medium">{u.name}</td><td className="px-4 py-3 text-gray-500">{u.team} {u.role}</td><td className="px-4 py-3">{u.status === 'active' ? <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">재직</span> : <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded text-xs">퇴사</span>}</td><td className="px-4 py-3 text-right"><button onClick={() => handleResignMember(u.id)} className="text-gray-400 hover:text-red-500 text-xs underline">퇴사 처리</button></td></tr>))}</tbody></table>
                </div>
            </div>
        ) : (
            <div className="bg-white p-10 text-center text-gray-500 rounded-xl border border-gray-200 border-dashed">
                <p className="mb-4">현재 {currentPlan} 플랜 이용 중입니다.</p>
                <button onClick={handleResetData} className="flex items-center mx-auto text-red-500 hover:text-red-700 text-sm font-bold bg-red-50 px-4 py-2 rounded-lg border border-red-200"><Trash2 size={16} className="mr-2"/> 데이터 초기화 (오류 발생 시)</button>
            </div>
        )}
    </div>
  );

  const ProFeatureLocked = ({ title }) => (
    <div className="flex flex-col items-center justify-center h-[500px] bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-center p-6 animate-fade-in">
        <div className="bg-indigo-100 p-4 rounded-full mb-4"><Lock size={48} className="text-indigo-600"/></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title} 기능은 Pro 플랜 전용입니다.</h2>
        <button onClick={() => { setAdminTab('subscription'); setActiveTab('admin'); setCurrentPlan('PRO'); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg mt-4 flex items-center"><Zap size={20} className="mr-2 fill-current"/> Pro 플랜 체험하기</button>
    </div>
  );

  const DashboardView = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white shadow-lg text-center">
            <h2 className="text-3xl font-bold mb-2">2025년 프랜차이즈 목표 달성 현황</h2>
            <p className="text-indigo-100 mb-6">가맹점 200호점, 매출 300억 달성을 위해!</p>
            <div className="flex justify-center gap-8"><div className="bg-white/20 p-4 rounded-lg min-w-[150px]"><div className="text-3xl font-bold">185억</div><div className="text-sm opacity-80">현재 매출</div></div><div className="bg-white/20 p-4 rounded-lg min-w-[150px]"><div className="text-3xl font-bold">142개</div><div className="text-sm opacity-80">가맹점 수</div></div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"><h3 className="font-bold text-gray-700 mb-4">주요 KPI 달성도</h3>{kpis.slice(0, 5).map(kpi => (<div key={kpi.id} className="mb-4 last:mb-0"><div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{kpi.title}</span><span className="font-bold text-indigo-600">{calculateAchievement(kpi)}%</span></div><div className="w-full bg-gray-100 rounded-full h-2"><div className="bg-indigo-500 h-2 rounded-full" style={{width: `${calculateAchievement(kpi)}%`}}></div></div></div>))}</div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center"><Sparkles size={48} className="text-yellow-400 mb-4"/><h3 className="font-bold text-gray-800 text-lg mb-2">AI 인사이트</h3><p className="text-gray-500 text-sm mb-4">현재 영업팀의 신규 출점 속도가 목표 대비 10% 지연되고 있습니다.<br/>마케팅 프로모션과 연계하여 가맹 문의를 늘려보세요.</p><button className="text-indigo-600 font-bold text-sm hover:underline">상세 분석 보기</button></div>
        </div>
    </div>
  );

  const KPIView = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-gray-800">전사 KPI 관리</h2><button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm">새 목표 설정</button></div>
        <div className="grid gap-4">{kpis.map(kpi => (<div key={kpi.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex justify-between items-center"><div><div className="flex items-center gap-2 mb-1"><Badge color="purple">{kpi.team}</Badge><span className="text-xs text-gray-400">{kpi.type}</span></div><h3 className="font-bold text-lg text-gray-800">{kpi.title}</h3><p className="text-sm text-gray-500">{kpi.description}</p></div><div className="text-right"><div className="text-2xl font-bold text-gray-900">{kpi.current} <span className="text-sm font-normal text-gray-400">/ {kpi.target} {kpi.unit}</span></div><Badge color={kpi.status === 'success' ? 'green' : 'yellow'}>{kpi.status === 'success' ? '달성중' : '진행중'}</Badge></div></div>))}</div>
    </div>
  );

  const EvalView = () => (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-2">2025년 1분기 정기 평가</h2>
            <p className="text-gray-500 mb-6">평가 마감까지 D-10</p>
            <div className="flex justify-center gap-4"><div className="p-4 border rounded-lg w-32"><div className="text-2xl font-bold text-indigo-600">{activeUsers.length}명</div><div className="text-xs text-gray-400">대상</div></div><div className="p-4 border rounded-lg w-32"><div className="text-2xl font-bold text-green-600">5명</div><div className="text-xs text-gray-400">완료</div></div></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6"><h3 className="font-bold mb-4">팀별 현황</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{teams.map(t => (<div key={t} className="flex justify-between p-3 bg-gray-50 rounded"><span>{t}</span><span className="text-gray-500 text-sm">진행률 20%</span></div>))}</div></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2"><div className="bg-indigo-600 text-white p-1.5 rounded-lg"><CheckSquare size={20} /></div><h1 className="text-xl font-bold text-gray-900 tracking-tight">Next Step</h1><span className={`text-[10px] px-1.5 py-0.5 rounded border ${currentPlan === 'PRO' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-green-100 text-green-700 border-green-200'}`}>{currentPlan === 'PRO' ? 'PRO' : 'BASIC'}</span></div>
          <div className="flex items-center space-x-4"><div className="text-right hidden sm:block"><div className="text-sm font-bold">김대표 님</div><div className="text-xs text-gray-500">CEO</div></div><div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">김</div></div>
        </div>
      </header>

      <NavigationBar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'rnr' && <RnRView />}
        {activeTab === 'org' && <OrgChartView />}
        {activeTab === 'admin' && <AdminView />}
        {activeTab === 'dashboard' && (currentPlan === 'PRO' ? <DashboardView /> : <ProFeatureLocked title="대시보드" />)}
        {activeTab === 'kpi' && (currentPlan === 'PRO' ? <KPIView /> : <ProFeatureLocked title="KPI 목표 관리" />)}
        {activeTab === 'eval' && (currentPlan === 'PRO' ? <EvalView /> : <ProFeatureLocked title="성과 평가" />)}
        {activeTab === 'calendar' && <CalendarView />}
      </main>

      {/* Write Modal */}
      {showWriteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold text-gray-900">새 업무 등록</h3><button onClick={() => setShowWriteModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div>
            <div className="space-y-4">
               <div><label className="block text-sm font-medium text-gray-700 mb-1">담당자 (Owner)</label><select value={newTaskOwnerId} onChange={(e) => setNewTaskOwnerId(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white font-medium text-gray-800"><option value="">담당자를 선택하세요</option>{teams.map(team => (<optgroup key={team} label={team}>{activeUsers.filter(u => u.team === team).map(u => (<option key={u.id} value={u.id}>{u.name} ({u.role})</option>))}</optgroup>))}</select></div>
               <div><label className="block text-sm font-medium text-gray-700 mb-1">관련 KPI</label><select value={selectedKpi} onChange={(e) => setSelectedKpi(e.target.value)} className="w-full border rounded-lg px-3 py-2"><option value="">선택 안함 (일반 업무)</option>{kpis.filter(k=>k.year==='2025').map(k=><option key={k.id} value={k.id}>[{k.team}] {k.title}</option>)}</select></div>
               <div><label className="block text-sm font-medium text-gray-700 mb-1">업무 제목</label><input type="text" value={newDocTitle} onChange={(e) => setNewDocTitle(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="예: 매장 순회 점검" /></div>
               <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">소요 시간</label><input type="text" value={newDocTime} onChange={(e) => setNewDocTime(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="2H" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">빈도</label><input type="text" value={newDocFreq} onChange={(e) => setNewDocFreq(e.target.value)} className="w-full border rounded-lg px-3 py-2" placeholder="매주" /></div></div>
               <div><div className="flex justify-between items-center mb-1"><label className="block text-sm font-medium text-gray-700">세부 내용</label><button onClick={handleAiDraft} disabled={isAiWriting} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-bold">{isAiWriting ? "작성 중..." : "AI 초안 작성"}</button></div><textarea value={newDocContent} onChange={(e) => setNewDocContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 h-24 resize-none" /></div>
            </div>
            <div className="p-4 bg-gray-50 rounded-b-2xl flex justify-end space-x-3 -mx-6 -mb-6 mt-6"><button onClick={() => setShowWriteModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg">취소</button><button onClick={handleSaveTask} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center space-x-2"><Save size={18} /><span>저장</span></button></div>
          </div>
        </div>
      )}
      
      {showAddMemberModal && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-fade-in"><h3 className="text-lg font-bold mb-4">신규 입사자 등록</h3><div className="bg-gray-50 p-2 mb-4 text-center text-sm font-bold text-indigo-600">{targetDeptForAdd}</div><input className="w-full border p-2 rounded mb-2" placeholder="이름" value={newMemberName} onChange={e=>setNewMemberName(e.target.value)} /><input className="w-full border p-2 rounded mb-4" placeholder="직책" value={newMemberRole} onChange={e=>setNewMemberRole(e.target.value)} /><div className="flex justify-end gap-2"><button onClick={() => setShowAddMemberModal(false)} className="px-4 py-2 text-gray-500">취소</button><button onClick={handleAddMember} className="px-4 py-2 bg-indigo-600 text-white rounded">등록</button></div></div></div>)}

      {showUpgradeModal && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"><div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8 text-center animate-fade-in relative"><button onClick={() => setShowUpgradeModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button><div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Zap size={32} className="text-indigo-600 fill-current"/></div><h2 className="text-2xl font-bold text-gray-900 mb-2">Pro 플랜으로 업그레이드</h2><p className="text-gray-500 mb-6">KPI 관리, 성과 평가, AI 분석 등 회사의 성장을 위한 모든 기능을 잠금 해제하세요.</p><button onClick={() => { setCurrentPlan('PRO'); setShowUpgradeModal(false); alert("Pro 플랜이 활성화되었습니다! (Demo)"); }} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-indigo-700 transition shadow-lg">월 50,000원에 시작하기</button></div></div>)}

      {/* Task Detail Modal */}
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-start">
              <div className="flex-1"><span className="text-xs font-bold text-indigo-600 mb-1 block">업무 상세 정보</span>{isTaskEditing ? (<input className="w-full text-xl font-bold text-gray-900 border-b-2 border-indigo-200 focus:border-indigo-600 outline-none pb-1" value={editForm.title} onChange={(e) => setEditForm({...editForm, title: e.target.value})}/>) : (<h3 className="text-xl font-bold text-gray-900 leading-snug">{selectedTask.title}</h3>)}</div>
              <div className="flex items-center ml-2">{!isTaskEditing && (<button onClick={startEditingTask} className="text-gray-400 hover:text-indigo-600 p-1 mr-1 transition"><Edit3 size={18}/></button>)}<button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 p-1"><X size={24}/></button></div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100"><div className="flex items-center space-x-3"><div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-sm font-bold border border-gray-200 text-gray-600">{getUserInfo(selectedTask.ownerId).name[0]}</div><div><div className="font-bold text-sm text-gray-900">{getUserInfo(selectedTask.ownerId).name}</div><div className="text-xs text-gray-500">{getUserInfo(selectedTask.ownerId).role} | {getUserInfo(selectedTask.ownerId).team}</div></div></div><div className="text-xs font-mono text-gray-400 bg-white px-2 py-1 rounded border border-gray-200">{selectedTask.id}</div></div>
              <div><h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center"><AlignLeft size={16} className="mr-2"/>업무 내용</h4>{isTaskEditing ? (<textarea className="w-full text-sm text-gray-600 leading-relaxed bg-white border border-gray-300 rounded-lg p-3 h-32 outline-none focus:ring-2 focus:ring-indigo-500" value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})}/>) : (<div className="text-sm text-gray-600 leading-relaxed bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">{selectedTask.description}</div>)}</div>
              <div className="grid grid-cols-2 gap-4"><div className="bg-gray-50 p-3 rounded-lg border border-gray-100"><div className="text-xs text-gray-500 mb-1 flex items-center"><Timer size={12} className="mr-1"/> 소요 시간</div>{isTaskEditing ? (<input className="font-bold text-sm text-gray-800 bg-white border border-gray-300 rounded px-2 py-1 w-full" value={editForm.timeRequired} onChange={(e) => setEditForm({...editForm, timeRequired: e.target.value})}/>) : (<div className="font-bold text-sm text-gray-800">{selectedTask.timeRequired}</div>)}</div><div className="bg-gray-50 p-3 rounded-lg border border-gray-100"><div className="text-xs text-gray-500 mb-1 flex items-center"><Repeat size={12} className="mr-1"/> 빈도</div>{isTaskEditing ? (<input className="font-bold text-sm text-gray-800 bg-white border border-gray-300 rounded px-2 py-1 w-full" value={editForm.frequency} onChange={(e) => setEditForm({...editForm, frequency: e.target.value})}/>) : (<div className="font-bold text-sm text-gray-800">{selectedTask.frequency}</div>)}</div></div>
              {selectedTask.kpiId && (<div className="bg-purple-50 p-3 rounded-lg border border-purple-100"><div className="text-xs font-bold text-purple-600 mb-1 flex items-center"><Target size={12} className="mr-1"/> 연동된 KPI</div><div className="text-sm font-medium text-purple-900">{getKpiInfo(selectedTask.kpiId)?.title || '정보 없음'}</div></div>)}
              <div className="flex justify-end space-x-2 pt-2 border-t border-gray-100">{isTaskEditing ? (<><button onClick={() => setIsTaskEditing(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition">취소</button><button onClick={saveEditedTask} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold">저장하기</button></>) : (<><button onClick={() => { setTransferModalOpen(true); setShowDetailModal(false); }} className="flex items-center text-xs font-bold text-gray-500 hover:text-indigo-600 px-3 py-2 rounded hover:bg-gray-100 transition"><ArrowRightLeft size={14} className="mr-1"/> 업무 이관</button><button onClick={() => alert("히스토리 기능 준비중")} className="flex items-center text-xs font-bold text-gray-500 hover:text-indigo-600 px-3 py-2 rounded hover:bg-gray-100 transition"><History size={14} className="mr-1"/> 변경 이력</button></>)}</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Transfer Modal */}
      {transferModalOpen && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl w-full max-w-md p-6"><h3 className="text-lg font-bold mb-4">업무 이관</h3><div className="grid gap-2 max-h-60 overflow-y-auto">{users.filter(u=>u.id!==selectedTask.ownerId && u.status!=='resigned').map(u=>(<button key={u.id} onClick={()=>handleTransfer(u.id)} className="p-3 border rounded hover:bg-gray-50 text-left w-full flex justify-between"><span>{u.name}</span><span className="text-gray-400 text-xs">{u.team}</span></button>))}</div><button onClick={()=>setTransferModalOpen(false)} className="mt-4 w-full py-2 text-gray-500">취소</button></div>
        </div>
      )}
    </div>
  );
}
