import { useState } from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

import { SiteFooter, SiteHeader } from './components.jsx';
import BENCHMARKS from './benchmarks.js';

const WorkCard = ({ work, navigate }) => {
  const [showStats, setShowStats] = useState(false);
  const linkProps = work.projectUrl
    ? { href: work.projectUrl, target: '_blank', rel: 'noopener noreferrer' }
    : {};
  const Tag = work.projectUrl ? 'a' : 'span';

  const handleImageClick = () => {
    if (work.projectUrl) {
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
        <div
          className='relative cursor-pointer'
          onClick={handleImageClick}
          onMouseEnter={() => work.stats && setShowStats(true)}
          onMouseLeave={() => work.stats && setShowStats(false)}
        >
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
        <div className='absolute left-full top-0 ml-3 z-50 rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-neutral-800 shadow-lg p-4 flex flex-col justify-center gap-3 w-48'>
          {work.stats.flat().map((item, i) => (
            <div key={i} className='text-center rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 py-3 px-2'>
              <p className='text-sm font-bold text-blue-700 dark:text-blue-300'>{item}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const VISIBLE_COUNT = 5;

const BenchmarkGroup = ({ group, navigate }) => {
  const [expanded, setExpanded] = useState(false);
  const hasMore = group.works.length > VISIBLE_COUNT;
  const visibleWorks = expanded ? group.works : group.works.slice(0, VISIBLE_COUNT);

  return (
    <section>
      <h2 className='text-3xl font-bold text-neutral-800 dark:text-neutral-100 mb-4 border-l-4 border-blue-500 pl-3'>
        {group.group}
        <span className='text-base font-normal text-neutral-400 dark:text-neutral-500 ml-3'>({group.works.length})</span>
      </h2>
      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6'>
        {visibleWorks.map(work => (
          <WorkCard key={work.id} work={work} navigate={navigate} />
        ))}
      </div>
      {hasMore && (
        <div className='flex justify-center mt-4'>
          <Button
            type='link'
            onClick={() => setExpanded(prev => !prev)}
          >
            {expanded ? '收起 ▲' : `更多工作 (${group.works.length - VISIBLE_COUNT}) ▼`}
          </Button>
        </div>
      )}
    </section>
  );
};

const IndexPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <SiteHeader />
      <div className='w-full mt-8 sm:mt-10 mb-10 sm:mb-12 px-2'>
        <p className='text-left text-base sm:text-lg leading-loose text-neutral-700 dark:text-neutral-300 mb-10 indent-[2em]'>
          欢迎来到<strong className='font-semibold text-neutral-900 dark:text-neutral-100'>视觉-常识组合推理评测平台</strong>
          ，本平台提供图像内容生成、多模态图文推理和具身环境理解三大方向的统一评测基准。
          请选择下方的评测任务，进行模型评估或对比排行。
        </p>

        <div className='flex flex-col gap-10'>
          {BENCHMARKS.map(group => (
            <BenchmarkGroup key={group.group} group={group} navigate={navigate} />
          ))}
        </div>
      </div>
      <SiteFooter />
    </>
  );
};

export default IndexPage;
