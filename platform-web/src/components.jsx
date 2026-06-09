import { createContext, useContext } from 'react';
import { Button, Tooltip } from 'antd';
import { HomeOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const ColorModeContext = createContext(null);

export function ColorModeProvider({ value, children }) {
  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export function useColorMode() {
  const ctx = useContext(ColorModeContext);
  if (ctx == null) {
    throw new Error('useColorMode must be used within ColorModeProvider');
  }
  return ctx;
}

/** Browser tab title and header text */
export const SITE_TITLE = 'UniCapEval';

const headerBadgeClass =
  'shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide text-white';

export const SiteHeader = ({ badge }) => {
  const navigate = useNavigate();
  const { isDark, toggleColorMode } = useColorMode();

  return (
  <header className='flex items-center justify-between gap-3 px-4 py-2 w-full mb-4'>
    <div className='flex items-center gap-2 min-w-0 flex-1'>
    <img src='/评价.png' alt='UniCapEval logo' className='w-16 h-16 shrink-0 object-contain' />
    <div className='flex items-center gap-4 min-w-0 flex-1 ml-3'>
      <p className='text-[2.4em] text-neutral-900 dark:text-neutral-100 truncate min-w-0'>
        {SITE_TITLE}
      </p>
      {badge === 'EVAL' && (
        <span className={`${headerBadgeClass} bg-blue-600 dark:bg-blue-500`} aria-label='Leaderboard'>
          EVAL
        </span>
      )}
      {badge === 'LEAD' && (
        <span className={`${headerBadgeClass} bg-green-600 dark:bg-green-500`} aria-label='Evaluation'>
          LEAD
        </span>
      )}
    </div>
    </div>
    <div className='flex items-center shrink-0 gap-0.5'>
      <Tooltip title='Home'>
        <Button
          type='text'
          size='large'
          icon={<HomeOutlined className='text-lg' />}
          onClick={() => navigate('/')}
          aria-label='Back to home'
          className='text-neutral-700 dark:text-neutral-200'
        />
      </Tooltip>
      <Tooltip title={isDark ? 'Light mode' : 'Dark mode'}>
        <Button
          type='text'
          size='large'
          icon={isDark ? <SunOutlined className='text-lg' /> : <MoonOutlined className='text-lg' />}
          onClick={toggleColorMode}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className='text-neutral-700 dark:text-neutral-200'
        />
      </Tooltip>
    </div>
  </header>
  );
};

export const SiteFooter = () => (
  <footer className='text-center text-gray-500 dark:text-gray-400 text-sm mt-6 mb-4'>
    <p>© 2026 Institute of Computing Technology, University of Chinese Academy of Sciences | Academic Use</p>
  </footer>
);
