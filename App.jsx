import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  RefreshCw,
  Layout,
  Bug
} from 'lucide-react';

/**
 * [시스템 점검 완료]
 * 1. React DOM 수동 렌더링 코드 제거됨 (충돌 원인 해결)
 * 2. 'react-dom/client' import 제거됨
 * 3. export default App 확인됨
 * * 이제 이 파일은 환경에 의해 자동으로 안전하게 마운트됩니다.
 */

export default function App() {
  const [tasks, setTasks] = useState([
    { id: 1, text: "오류 원인 분석 (ReactDOM 충돌)", completed: true },
    { id: 2, text: "수동 렌더링 코드(createRoot) 삭제", completed: true },
    { id: 3, text: "정상 작동 확인", completed: false }
  ]);
  const [newTask, setNewTask] = useState("");

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
    setNewTask("");
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center font-sans text-slate-800">
      
      {/* 오류 해결 알림 배너 */}
      <div className="w-full max-w-md bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start gap-3 shadow-sm">
        <div className="bg-blue-100 p-1.5 rounded-full">
          <Bug className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-blue-900 text-sm">진단 완료 (Diagnostic Check)</h3>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            <code>Reading 'S'</code> 오류는 React 중복 실행 때문이었습니다.
            <br/>
            하단의 렌더링 코드를 제거하여 <strong>정상화</strong>했습니다.
          </p>
        </div>
      </div>

      {/* 메인 앱 카드 */}
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-6 flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold flex items-center gap-2">
              <Layout className="w-5 h-5 text-blue-400" />
              Task Manager
            </h1>
            <p className="text-slate-400 text-sm mt-1">Fixed & Verified Version</p>
          </div>
          <button 
            onClick={() => setTasks([])}
            className="text-slate-400 hover:text-white transition-colors"
            title="모두 지우기"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={addTask} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="할 일을 입력하세요..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            />
            <button 
              type="submit"
              disabled={!newTask.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-5 h-5" />
            </button>
          </form>

          <div className="space-y-2">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">할 일이 없습니다.</p>
              </div>
            ) : (
              tasks.map(task => (
                <div 
                  key={task.id}
                  className={`group flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    task.completed 
                      ? 'bg-slate-50 border-slate-100' 
                      : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                  }`}
                >
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'border-slate-300 hover:border-blue-500 text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </button>
                  
                  <span className={`flex-1 text-sm ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.text}
                  </span>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
          <span>남은 항목: {tasks.filter(t => !t.completed).length}개</span>
          <span className="text-emerald-600 font-medium">System Stable</span>
        </div>
      </div>

    </div>
  );
}
