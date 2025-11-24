import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Calendar,
  PieChart,
  CheckCircle2,
  Circle,
  MoreVertical,
  Clock,
  Sparkles,
  Play,
  Pause,
  BarChart3,
  Trophy,
  Target,
  ChevronRight,
  Edit3
} from 'lucide-react';

/**
 * TimeFlow - A minimalist, voice-powered time management tool.
 * * Features:
 * - Simulated Voice Input for planning and reviewing.
 * - Intelligent parsing of text into a timeline.
 * - Positive reinforcement feedback loop.
 * - Custom SVG/CSS charts for the profile section.
 */

// --- Mock Data & Helpers ---

const MOCK_PLAN_TEXT = "今天上午9点要开个组会，大概一小时。然后我想花两个小时写完项目报告。中午休息一下，下午2点开始做竞品分析，4点去健身房跑个步，晚上读会儿书。";
const MOCK_REVIEW_TEXT = "组会按时开了，但是报告写得比较慢，拖到了下午1点。竞品分析做了一半，健身去了，晚上书读了30分钟。";

const generateSchedule = (text) => {
  // simply logic to mock AI parsing
  return [
    { id: 1, time: '09:00', endTime: '10:00', title: '团队组会', type: 'work', status: 'completed' },
    { id: 2, time: '10:00', endTime: '12:00', title: '撰写项目报告', type: 'work', status: 'completed' },
    { id: 3, time: '12:00', endTime: '13:30', title: '午休 & 午餐', type: 'life', status: 'completed' },
    { id: 4, time: '14:00', endTime: '16:00', title: '竞品分析', type: 'work', status: 'pending' },
    { id: 5, time: '16:00', endTime: '17:30', title: '健身房跑步', type: 'health', status: 'completed' },
    { id: 6, time: '20:00', endTime: '21:00', title: '阅读充电', type: 'growth', status: 'pending' },
  ];
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "早安";
  if (hour < 18) return "午安";
  return "晚安";
};

// Helper to calculate duration accurately (e.g. 1.5 hours)
const calculateDuration = (start, end) => {
  try {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const diffInMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = diffInMinutes / 60;
    return hours % 1 === 0 ? hours : hours.toFixed(1);
  } catch (e) {
    return 1;
  }
};

// --- Components ---

const TabButton = ({ active, icon: Icon, label, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-300 ${
      active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'
    }`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    {/* Wrap text in span to protect against translation extension DOM manipulation */}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const TimelineItem = ({ item, isLast, onToggle }) => {
  const getTypeColor = (type) => {
    switch (type) {
      case 'work':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'life':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'health':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'growth':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="flex group relative pl-4">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[27px] top-8 bottom-[-16px] w-[2px] bg-slate-100 group-hover:bg-slate-200 transition-colors" />
      )}
      
      {/* Time Column */}
      <div className="w-14 flex-shrink-0 flex flex-col items-end mr-4 pt-1">
        <span className="text-sm font-bold text-slate-700">{item.time}</span>
        <span className="text-xs text-slate-400">{item.endTime}</span>
      </div>

      {/* Node */}
      <div className="relative z-10 pt-1.5 mr-4">
        <button 
          onClick={() => onToggle(item.id)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            item.status === 'completed' 
              ? 'bg-indigo-600 border-indigo-600' 
              : 'bg-white border-slate-300 hover:border-indigo-400'
          }`}
        >
          {item.status === 'completed' && <CheckCircle2 size={14} className="text-white" />}
        </button>
      </div>

      {/* Card */}
      <div className={`flex-1 mb-6 p-4 rounded-2xl border transition-all duration-300 hover:shadow-md cursor-pointer ${
         item.status === 'completed' ? 'opacity-60 grayscale-[0.5]' : 'bg-white border-slate-100 shadow-sm'
      }`}>
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-medium text-slate-800 ${item.status === 'completed' ? 'line-through' : ''}`}>
            {item.title}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getTypeColor(item.type)}`}>
            {item.type === 'work' ? '工作' : item.type === 'life' ? '生活' : item.type === 'health' ? '健康' : '成长'}
          </span>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-1">
          <Clock size={12} />
          {/* Use calculated duration */}
          <span>{calculateDuration(item.time, item.endTime)} 小时</span>
        </div>
      </div>
    </div>
  );
};

const PlanView = ({ tasks, setTasks }) => {
  const [isInputMode, setIsInputMode] = useState(tasks.length === 0);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMicClick = () => {
    setIsListening(true);
    // Simulate voice input delay
    setTimeout(() => {
      setInputText(prev => prev ? prev + " " + MOCK_PLAN_TEXT : MOCK_PLAN_TEXT);
      setIsListening(false);
    }, 1500);
  };

  const handleGenerate = () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      setTasks(generateSchedule(inputText));
      setIsProcessing(false);
      setIsInputMode(false);
    }, 1500);
  };

  const toggleTask = (id) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' } : t));
  };

  if (isInputMode) {
    return (
      <div key="input-mode-view" className="h-full flex flex-col p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mt-8 mb-6">
          <h1 className="text-3xl font-light text-slate-800 mb-2">{getGreeting()}，<br/>今天想做些什么？</h1>
          <p className="text-slate-400">点击麦克风，告诉我你今天的安排</p>
        </div>

        <div className="flex-1 bg-white rounded-3xl p-4 shadow-sm border border-slate-100 mb-6 relative overflow-hidden group">
          <textarea
            className="w-full h-full resize-none outline-none text-slate-600 text-lg leading-relaxed placeholder:text-slate-300"
            placeholder="例如：上午9点开会，下午2点写报告..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          {isListening && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center flex-col gap-3 z-10">
              <div className="flex gap-1">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ height: 20 + Math.random() * 20, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
              <span className="text-indigo-600 font-medium">正在聆听...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleMicClick}
            className={`p-4 rounded-full transition-all duration-300 ${
              isListening ? 'bg-red-50 text-red-500 scale-110' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Mic size={24} />
          </button>
          <button 
            onClick={handleGenerate}
            disabled={!inputText}
            className="flex-1 bg-indigo-600 text-white p-4 rounded-full font-medium shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
             {/* PROTECTIVE SPANS: Prevents crashes from browser translation extensions modifying text nodes */}
             {isProcessing ? (
               <>
                <Sparkles size={20} className="animate-spin" /> 
                <span>智能规划中...</span>
               </>
             ) : (
               <>
                <span>生成今日计划</span> 
                <ChevronRight size={20} />
               </>
             )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div key="list-mode-view" className="h-full flex flex-col relative bg-slate-50">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 bg-white sticky top-0 z-20 shadow-sm/50">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Today's Schedule</p>
            <h2 className="text-2xl font-bold text-slate-800">今日安排</h2>
          </div>
          <button 
            onClick={() => setIsInputMode(true)} 
            className="p-2 bg-slate-100 rounded-full text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <Edit3 size={18} />
          </button>
        </div>
        
        {/* Progress Bar */}
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
          <div 
            className="bg-indigo-500 transition-all duration-1000 ease-out"
            style={{ width: `${(tasks.filter(t => t.status === 'completed').length / tasks.length) * 100}%` }}
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {tasks.map((task, index) => (
          <TimelineItem 
            key={task.id} 
            item={task} 
            isLast={index === tasks.length - 1} 
            onToggle={toggleTask}
          />
        ))}
        <div className="h-20" /> {/* Bottom spacer */}
      </div>
    </div>
  );
};

const ReviewView = ({ tasks }) => {
  const [step, setStep] = useState('input'); // input, analyzing, result
  const [reviewText, setReviewText] = useState("");
  const [isListening, setIsListening] = useState(false);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  const handleMicClick = () => {
    setIsListening(true);
    setTimeout(() => {
      setReviewText(prev => prev ? prev + " " + MOCK_REVIEW_TEXT : MOCK_REVIEW_TEXT);
      setIsListening(false);
    }, 1500);
  };

  const handleAnalyze = () => {
    if (!reviewText) return;
    setStep('analyzing');
    setTimeout(() => {
      setStep('result');
    }, 2000);
  };

  if (step === 'input') {
    return (
      <div className="h-full p-6 flex flex-col">
        <div className="mt-8 mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">今日复盘</h2>
          <p className="text-slate-500">
            计划完成 {completedCount}/{totalCount}。跟我说说今天过得怎么样？
          </p>
        </div>

        <div className="flex-1 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6 relative">
          <textarea
            className="w-full h-full resize-none outline-none text-slate-600 leading-relaxed placeholder:text-slate-300"
            placeholder="今天虽然很忙，但是核心任务都搞定了..."
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
           {isListening && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center flex-col gap-3 rounded-3xl">
              <span className="text-indigo-600 font-medium animate-pulse">正在记录你的复盘...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
           <button 
            onClick={handleMicClick}
            className={`p-4 rounded-full transition-all duration-300 ${
              isListening ? 'bg-red-50 text-red-500' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Mic size={24} />
          </button>
          <button 
            onClick={handleAnalyze}
            disabled={!reviewText}
            className="flex-1 bg-indigo-600 text-white p-4 rounded-full font-medium shadow-lg shadow-indigo-200 active:scale-95 transition-all flex justify-center items-center gap-2"
          >
            <Sparkles size={18} /> 
            <span>生成智能建议</span>
          </button>
        </div>
      </div>
    );
  }

  if (step === 'analyzing') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <Sparkles className="text-indigo-600" size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">正在分析时间流...</h3>
        <p className="text-slate-400">对比计划与实际执行情况</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex justify-between items-center mb-6 mt-4">
        <h2 className="text-2xl font-bold text-slate-800">复盘报告</h2>
        <button onClick={() => setStep('input')} className="text-sm text-slate-400 hover:text-indigo-600">重试</button>
      </div>

      {/* Score Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 mb-6 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 bg-white/10 w-32 h-32 rounded-full blur-2xl" />
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <p className="text-indigo-100 mb-1 text-sm">今日效率分</p>
            <div className="text-5xl font-bold tracking-tight">88<span className="text-2xl font-normal opacity-70">/100</span></div>
          </div>
          <Trophy size={48} className="text-yellow-300 opacity-90" />
        </div>
        <div className="mt-6 pt-6 border-t border-white/20">
          <p className="leading-relaxed opacity-95">
            "你今天在<span className="font-bold text-white bg-white/20 px-1 rounded mx-1">深度工作</span>上表现出色！虽然下午有些拖延，但你成功完成了核心报告，这很棒。记得给晚上的阅读时间留出更多缓冲。"
          </p>
        </div>
      </div>

      {/* Optimizations */}
      <div className="space-y-4 mb-20">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">优化建议</h3>
        
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-700 text-sm mb-1">亮点：专注力强</h4>
            <p className="text-xs text-slate-500 leading-relaxed">上午连续两小时的高强度工作不仅完成了报告，还保证了质量。</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock size={20} className="text-amber-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-700 text-sm mb-1">建议：缓冲时间</h4>
            <p className="text-xs text-slate-500 leading-relaxed">下午的任务安排过密，建议在两项工作间预留15分钟作为“脑力切换”时间。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileView = () => {
  return (
    <div className="h-full overflow-y-auto p-6 bg-slate-50">
      <div className="mt-8 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">我的数据</h2>
        <p className="text-slate-400 text-sm">让时间看得见</p>
      </div>

      {/* Focus Ring Chart */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-700">今日专注分布</h3>
          <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500">6.5 小时</span>
        </div>
        
        <div className="flex items-center justify-center py-4">
           {/* Simple SVG Donut */}
           <div className="relative w-48 h-48">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="96" cy="96" r="80" stroke="#f1f5f9" strokeWidth="20" fill="transparent" />
                <circle cx="96" cy="96" r="80" stroke="#6366f1" strokeWidth="20" fill="transparent" strokeDasharray="502" strokeDashoffset="200" strokeLinecap="round" className="drop-shadow-lg" />
                <circle cx="96" cy="96" r="80" stroke="#fbbf24" strokeWidth="20" fill="transparent" strokeDasharray="502" strokeDashoffset="420" strokeLinecap="round" />
                <circle cx="96" cy="96" r="80" stroke="#10b981" strokeWidth="20" fill="transparent" strokeDasharray="502" strokeDashoffset="480" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-slate-800">72%</span>
                <span className="text-xs text-slate-400">高效</span>
              </div>
           </div>
        </div>
        
        <div className="flex justify-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs text-slate-500">工作</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs text-slate-500">生活</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500">健康</span>
          </div>
        </div>
      </div>

      {/* Weekly Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
             <Target size={16} className="text-indigo-600" />
           </div>
           <div className="text-2xl font-bold text-slate-800">85%</div>
           <div className="text-xs text-slate-400">计划完成率</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
           <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center mb-3">
             <BarChart3 size={16} className="text-rose-600" />
           </div>
           <div className="text-2xl font-bold text-slate-800">32h</div>
           <div className="text-xs text-slate-400">本周专注时长</div>
        </div>
      </div>

      {/* Simple Bar Chart */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-20">
         <h3 className="font-bold text-slate-700 mb-6">近七天趋势</h3>
         <div className="flex items-end justify-between h-32 gap-2">
            {[40, 70, 55, 90, 65, 80, 85].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                 <div 
                  className={`w-full rounded-t-lg transition-all duration-500 ${i === 6 ? 'bg-indigo-500' : 'bg-slate-200 group-hover:bg-slate-300'}`} 
                  style={{ height: `${h}%` }} 
                 />
                 <span className={`text-[10px] ${i === 6 ? 'font-bold text-indigo-600' : 'text-slate-400'}`}>
                   {['一', '二', '三', '四', '五', '六', '日'][i]}
                 </span>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('plan');
  const [tasks, setTasks] = useState([]);

  // Initialize with some empty state logic if needed
  useEffect(() => {
    // You could load data from localStorage here
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-200 font-sans">
      {/* Mobile Device Frame Mockup (for desktop viewing) / Full screen container */}
      <div className="w-full max-w-md h-[100dvh] bg-slate-50 md:h-[850px] md:rounded-[40px] md:shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'plan' && <PlanView tasks={tasks} setTasks={setTasks} />}
          {activeTab === 'review' && <ReviewView tasks={tasks} />}
          {activeTab === 'profile' && <ProfileView />}
        </div>

        {/* Bottom Navigation */}
        <div className="h-[88px] bg-white border-t border-slate-100 flex justify-around items-start pt-2 pb-6 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.02)] z-30">
          <TabButton 
            active={activeTab === 'plan'} 
            onClick={() => setActiveTab('plan')} 
            icon={Calendar} 
            label="计划" 
          />
          <TabButton 
            active={activeTab === 'review'} 
            onClick={() => setActiveTab('review')} 
            icon={CheckCircle2} 
            label="复盘" 
          />
          <TabButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={PieChart} 
            label="我的" 
          />
        </div>
      </div>
    </div>
  );
};

export default App;