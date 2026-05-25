import React from 'react';
import ReactDOM from 'react-dom/client';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'antd/dist/reset.css';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

dayjs.locale('zh-cn');

// 清除所有 jingzong.* 数据，恢复软件初始化状态
(function resetData() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('jingzong.')) {
        keysToRemove.push(key);
      }
    }
    // 保留主题和性能设置
    const keepKeys = ['jingzong.darkMode', 'jingzong.lowPerfMode', 'jingzong.sidebar.collapsed'];
    keysToRemove.forEach(key => {
      if (!keepKeys.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    console.log('[DataReset] Cleared', keysToRemove.length, 'storage keys');
  } catch (e) {
    console.warn('[DataReset] Failed:', e);
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
