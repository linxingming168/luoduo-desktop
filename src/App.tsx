import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import TaskHall from './pages/TaskHall';
import Projects from './pages/Projects';
import Chat from './pages/Chat';
import Knowledge from './pages/Knowledge';
import Skills from './pages/Skills';
import LocalConsole from './pages/LocalConsole';
import RemoteWorker from './pages/RemoteWorker';
import Settings from './pages/Settings';
import { useServerHealth } from './hooks/useServerHealth';
import { Bot } from 'lucide-react';

export default function App() {
  const [page, setPage] = useState('dashboard');
  const [chatAgent, setChatAgent] = useState<string | undefined>();
  const [darkMode, setDarkMode] = useState(false);
  const { online } = useServerHealth();

  // 初始化暗色模式
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const handleChat = (agentId: string) => {
    setChatAgent(agentId);
    setPage('chat');
  };

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900">
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        online={online}
        darkMode={darkMode}
        onToggleDark={toggleDark}
      />
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Small header bar on mobile */}
        <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <Bot className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">落朵大脑 · AI军团</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {page === 'dashboard' && <Dashboard onChat={handleChat} />}
          {page === 'taskhall' && <TaskHall />}
          {page === 'projects' && <Projects />}
          {page === 'chat' && <Chat initialAgent={chatAgent} />}
          {page === 'knowledge' && <Knowledge />}
          {page === 'skills' && <Skills />}
          {page === 'local' && <LocalConsole />}
          {page === 'remote' && <RemoteWorker />}
          {page === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}
