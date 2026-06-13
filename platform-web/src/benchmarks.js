const placeholder = (id) => ({
  id, title: id, image: `https://placehold.co/400x250/f3f4f6/9ca3af?text=${encodeURIComponent(id)}`,
  projectUrl: null, evalUrl: null, leaderboardUrl: null, stats: null,
});

const BENCHMARKS = [
  {
    group: '图像内容生成',
    works: [
      {
        id: 'ic-1',
        title: 'HiFi-Score',
        image: '/HiFi-Score.png',
        projectUrl: 'https://github.com/lydia7632/HiFi-Score',
        evalUrl: '/generation',
        leaderboardUrl: '/evaluation',
        stats: null,
      },
      {
        id: 'ic-2',
        title: 'UniCapEval',
        image: './UniCapEval.png',
        projectUrl: null,
        evalUrl: null,
        leaderboardUrl: null,
        stats: null,
      },
      {
        id: 'ic-3',
        title: 'ImgNarr-23K',
        image: '/ImgNarr-23K.png',
        projectUrl: null,
        evalUrl: null,
        leaderboardUrl: null,
        stats: null,
      },
      placeholder('IC-Work-4'),
      placeholder('IC-Work-5'),
      placeholder('IC-Work-6'),
      placeholder('IC-Work-7'),
      placeholder('IC-Work-8'),
      placeholder('IC-Work-9'),
      placeholder('IC-Work-10'),
      placeholder('IC-Work-11'),
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
      placeholder('VQA-Work-3'),
      placeholder('VQA-Work-4'),
      placeholder('VQA-Work-5'),
      placeholder('VQA-Work-6'),
      placeholder('VQA-Work-7'),
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
        title: 'STEP-CoT',
        image: '/STEP-CoT.png',
        projectUrl: null,
        evalUrl: null,
        leaderboardUrl: null,
        statsMode: 'overlay',
        stats: [
          [{ num: '6', label: '类空间轨迹推理任务' }, { num: '229K', label: '轨迹推理数据' }],
          [{ num: '145K', label: '空间理解数据' }, { num: '45K', label: '任务分解数据' }],
        ],
      },
      placeholder('Agent-Work-3'),
      placeholder('Agent-Work-4'),
      placeholder('Agent-Work-5'),
      placeholder('Agent-Work-6'),
      placeholder('Agent-Work-7'),
      placeholder('Agent-Work-8'),
      placeholder('Agent-Work-9'),
    ],
  },
];

export default BENCHMARKS;
