import { Zap, Play, Clock, History, Settings as SettingsIcon } from 'lucide-react';

export default function Automation() {
  const triggers = [
    { id: 1, name: '每日经营报表', trigger: '每天 08:00', action: '生成报表 → 推送到群聊', status: '运行中' },
    { id: 2, name: '库存预警', trigger: '库存 < 阈值', action: '自动补货建议 → 通知采购', status: '运行中' },
    { id: 3, name: '设备故障告警', trigger: 'IO报警', action: '创建工单 → 派发给运维', status: '待激活' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-6 h-6 text-amber-500" />
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">自动化</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">自动化规则 · 定时任务 · 事件驱动</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{triggers.length}</div>
          <div className="text-xs text-gray-500 mt-1">总规则</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{triggers.filter(t => t.status === '运行中').length}</div>
          <div className="text-xs text-gray-500 mt-1">运行中</div>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="text-2xl font-bold text-gray-400">{triggers.filter(t => t.status === '待激活').length}</div>
          <div className="text-xs text-gray-500 mt-1">待激活</div>
        </div>
      </div>

      {/* 规则列表 */}
      <div className="space-y-3">
        {triggers.map(t => (
          <div key={t.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === '运行中' ? 'bg-green-500' : 'bg-gray-300'}`} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{t.name}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t.trigger}</span>
                <span>{t.action}</span>
              </div>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              t.status === '运行中' ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'
            }`}>{t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
