import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';

import { SiteFooter, SiteHeader } from './components.jsx';

const IndexPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <SiteHeader />
      <div className='flex flex-col items-stretch justify-center w-full max-w-3xl min-h-[50vh] gap-12 sm:gap-14 mx-auto mt-8 sm:mt-10 mb-10 sm:mb-12'>
        <p className='text-left text-base sm:text-lg leading-loose text-neutral-700 dark:text-neutral-300 px-1 indent-[2em]'>
          Welcome to <strong className='font-semibold text-neutral-900 dark:text-neutral-100'>UniCapEval</strong>
          , a unified platform for image-captioning evaluation. The system has two modules: use{' '}
          <strong className='font-semibold'>Evaluation</strong> to score a candidate caption against an image and references with a wide range of metrics (BLEU, CIDEr, SPICE, CLIPScore, HiFi-Score, …), and use{' '}
          <strong className='font-semibold'>Leaderboard</strong> to browse and compare metrics and reported model results in a side-by-side workflow. Visit our{' '}
          <a
            href='https://github.com/VIPL-VSU/xai-recognition'
            target='_blank'
            rel='noopener noreferrer'
            className='text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-700 dark:hover:text-blue-300'
          >
            GitHub repository
          </a>{' '}
          for the project page.
        </p>
        <div className='flex flex-row gap-6 w-full'>
          <Button
            size='large'
            className='flex-1 !h-32 !text-2xl !font-semibold !bg-blue-100 hover:!bg-blue-200/90 !text-blue-900 !border-blue-200/80 dark:!bg-blue-950/55 dark:hover:!bg-blue-900/55 dark:!text-blue-100 dark:!border-blue-700/80'
            onClick={() => navigate('/generation')}
          >
            Evaluation
          </Button>
          <Button
            size='large'
            className='flex-1 !h-32 !text-2xl !font-semibold !bg-green-100 hover:!bg-green-200/90 !text-green-900 !border-green-200/80 dark:!bg-green-950/55 dark:hover:!bg-green-900/55 dark:!text-green-100 dark:!border-green-700/80'
            onClick={() => navigate('/evaluation')}
          >
            Leaderboard
          </Button>
        </div>
      </div>
      <SiteFooter />
    </>
  );
};

export default IndexPage;
