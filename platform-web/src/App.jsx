import React, { useEffect, useState } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import GenerationPage from './page-evaluation.jsx';
import IndexPage from './page-index.jsx';
import EvaluationPage from './page-leaderboard.jsx';
import { ColorModeProvider, SITE_TITLE } from './components.jsx';

const COLOR_MODE_STORAGE_KEY = 'xai-color-mode';

function readStoredColorMode() {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
  return v === 'light' || v === 'dark' ? v : null;
}

function getInitialColorMode() {
  const stored = readStoredColorMode();
  if (stored) return stored;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const App = () => {
  const [colorMode, setColorMode] = useState(getInitialColorMode);
  const isDark = colorMode === 'dark';

  useEffect(() => {
    document.title = SITE_TITLE;
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, colorMode);
  }, [colorMode, isDark]);

  const toggleColorMode = () => {
    setColorMode((m) => (m === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ColorModeProvider value={{ colorMode, setColorMode, toggleColorMode, isDark }}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            fontFamily:
              "'Google Sans', ui-sans-serif, system-ui, -apple-system, sans-serif",
          },
        }}
      >
        <BrowserRouter>
          <Routes>
            <Route path='/' element={<IndexPage />} />
            <Route path='/generation' element={<GenerationPage />} />
            <Route path='/evaluation' element={<EvaluationPage />} />
            <Route path='*' element={<Navigate to='/' replace />} />
          </Routes>
        </BrowserRouter>
      </ConfigProvider>
    </ColorModeProvider>
  );
};

export default App;
