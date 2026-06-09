import { useState } from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

import { SiteFooter, SiteHeader } from './components.jsx';

const BENCHMARKS = [
  {
    group: '图像内容生成',
    works: [
      {
        id: 'ic-1',
        title: 'HiFi-Score',
        image: 'https://placehold.co/400x250/e0f2fe/0369a1?text=Image+Caption+1',
        projectUrl: 'https://github.com/lydia7632/HiFi-Score',
        evalUrl: '/generation',
        leaderboardUrl: '/evaluation',
        stats: null,
      },
      {
        id: 'ic-2',
        title: 'UniCapEval',
        image: 'https://placehold.co/400x250/e0f2fe/0369a1?text=Image+Caption+2',
        projectUrl: null,
        evalUrl: null,
        leaderboardUrl: null,
        stats: null,
      },
      {
        id: 'ic-3',
        title: 'ImgNarr-23K',
        image: 'https://placehold.co/400x250/e0f2fe/0369a1?text=Image+Caption+3',
        projectUrl: null,
        evalUrl: null,
        leaderboardUrl: null,
        stats: null,
      },
    ],
  },
  {
    group: '图文知识推理',
    works: [
      {
        id: 'vqa-1',
        title: 'M4U',
        image: '/M4U.png',
        projectUrl: null,
        evalUrl: null,
        leaderboardUrl: null,
        stats: [
          ['6 种语言', '8,931 个题目'],
          ['64 个学科', '16 个子领域'],
        ],
      },
      {
        id: 'vqa-2',
        title: 'CRIC',
        image: '/CRIC.png',
        projectUrl: null,
        evalUrl: null,
        leaderboardUrl: null,
        statsMode: 'overlay',
        stats: [
          [{ num: '96K', label: '图像' }, { num: '494K', label: '问答对' }],
          [{ num: '11', label: '类关系' }, { num: '3.4K', label: '知识项' }],
        ],
      },
    ],
  },
  {
    group: '具身环境理解',
    works: [
      {
        id: 'agent-1',
        title: 'Env-QA',
        image: '/Env-QA.png',
        projectUrl: null,
        evalUrl: null,
        leaderboardUrl: null,
        statsMode: 'overlay',
        stats: [
          [{ num: '120', label: '种环境' }, { num: '23.3K', label: '视频' }],
          [{ num: '5', label: '大类问题' }, { num: '85.1K', label: '问答对' }],
        ],
      },
      {
        id: 'agent-2',
        title: 'Web Agent',
        image: 'https://placehold.co/400x250/ede9fe/5b21b6?text=Agent+2',
        projectUrl: null,
        evalUrl: null,
        leaderboardUrl: null,
        statsMode: 'overlay',
        stats: null,
      },
    ],
  },
];

const WorkCard = ({ work, navigate }) => {
  const [showStats, setShowStats] = useState(false);
  const linkProps = work.projectUrl
    ? { href: work.projectUrl, target: '_blank', rel: 'noopener noreferrer' }
    : {};
  const Tag = work.projectUrl ? 'a' : 'span';

  const handleImageClick = () => {
    if (work.stats) {
      setShowStats(prev => !prev);
    } else if (work.projectUrl) {
      window.open(work.projectUrl, '_blank');
    }
  };

  const isInline = work.statsMode === 'inline';

  const titleBlock = (
    <p className={`text-base font-semibold text-center text-neutral-800 dark:text-neutral-100 ${isInline ? 'py-2' : ''}`}>
      {work.projectUrl ? (
        <Tag {...linkProps} className='text-neutral-800 dark:text-neutral-100 hover:underline cursor-pointer'>
          {work.title}
        </Tag>
      ) : work.title}
    </p>
  );

  const buttonsBlock = (
    <div className='flex gap-3'>
      <Button type='primary' className='flex-1' onClick={() => work.evalUrl && navigate(work.evalUrl)}>
        Evaluation
      </Button>
      <Button className='flex-1 !bg-emerald-500 hover:!bg-emerald-600 !text-white !border-emerald-500 hover:!border-emerald-600' onClick={() => work.leaderboardUrl && navigate(work.leaderboardUrl)}>
        Leaderboard
      </Button>
    </div>
  );

  return (
    <div className='relative'>
      <div className='rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800/60 shadow-sm overflow-hidden flex flex-col'>
        {isInline && titleBlock}
        <div className='relative cursor-pointer' onClick={handleImageClick}>
          <img
            src={work.image}
            alt={work.title}
            className={`w-full aspect-[16/10] object-contain bg-gray-50 dark:bg-neutral-900 transition-all duration-300 ${work.statsMode === 'overlay' && showStats ? 'brightness-[0.3]' : 'hover:opacity-90'}`}
          />
          {work.statsMode === 'overlay' && work.stats && showStats && (
            <div className='absolute inset-0 grid grid-cols-2 grid-rows-2'>
              {work.stats.flat().map((item, i) => (
                <div key={i} className='flex flex-col items-center justify-center border-2 border-white/40'>
                  {typeof item === 'object' ? (
                    <>
                      <p className='text-3xl font-extrabold text-white drop-shadow-lg'>{item.num}</p>
                      <p className='text-sm font-bold text-white/80 mt-1'>{item.label}</p>
                    </>
                  ) : (
                    <p className='text-lg font-bold text-white drop-shadow-lg'>{item}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {isInline && work.stats && (
          <div className='grid grid-cols-2 gap-2 px-3 py-2 bg-gray-50 dark:bg-neutral-900/50'>
            {work.stats.flat().map((item, i) => (
              <div key={i} className='text-center py-1'>
                <p className='text-xs font-semibold text-neutral-600 dark:text-neutral-300'>{item}</p>
              </div>
            ))}
          </div>
        )}
        <div className='p-4 flex flex-col gap-3'>
          {!isInline && titleBlock}
          {buttonsBlock}
        </div>
      </div>
      {work.stats && work.statsMode !== 'overlay' && work.statsMode !== 'inline' && showStats && (
        <>
          <div className='fixed inset-0 z-40' onClick={() => setShowStats(false)} />
          <div className='absolute left-full top-0 ml-3 z-50 rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-neutral-800 shadow-lg p-4 flex flex-col justify-center gap-3 w-48'>
            {work.stats.flat().map((item, i) => (
              <div key={i} className='text-center rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 py-3 px-2'>
                <p className='text-sm font-bold text-blue-700 dark:text-blue-300'>{item}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const IndexPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <SiteHeader />
      <div className='w-full max-w-5xl mx-auto mt-8 sm:mt-10 mb-10 sm:mb-12 px-4'>
        <p className='text-left text-base sm:text-lg leading-loose text-neutral-700 dark:text-neutral-300 mb-10 indent-[2em]'>
          欢迎来到<strong className='font-semibold text-neutral-900 dark:text-neutral-100'>视觉-常识组合推理评测平台</strong>
          ，本平台提供图像内容生成、多模态图文推理和具身环境理解三大方向的统一评测基准。
          请选择下方的评测任务，进行模型评估或对比排行。
        </p>

        <div className='flex flex-col gap-10'>
          {BENCHMARKS.map(group => (
            <section key={group.group}>
              <h2 className='text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-4 border-l-4 border-blue-500 pl-3'>
                {group.group}
              </h2>
              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                {group.works.map(work => (
                  <WorkCard key={work.id} work={work} navigate={navigate} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      <SiteFooter />
    </>
  );
};

export default IndexPage;
