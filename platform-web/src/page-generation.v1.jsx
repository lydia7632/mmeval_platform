import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Image,
  Input,
  Progress,
  Row,
  Space,
  Spin,
  Tag,
  Upload,
  message,
} from 'antd';
import { PlayCircleOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';

import { SiteFooter, SiteHeader } from './components.jsx';

// ============================================================
// Mock metric definitions — replace with real API response shape
// when a backend is ready.
// ============================================================

const METRICS = [
  { key: 'BLEU-4',       max: 100, baseline: 28.0, sota: 45.0, decimals: 1, refFree: false,
    desc: 'Modified n-gram precision (n=4) with brevity penalty.' },
  { key: 'METEOR',       max: 100, baseline: 22.0, sota: 32.0, decimals: 1, refFree: false,
    desc: 'Unigram alignment with stem and synonym matching.' },
  { key: 'ROUGE-L',      max: 100, baseline: 50.0, sota: 62.0, decimals: 1, refFree: false,
    desc: 'F-score over the longest common subsequence.' },
  { key: 'CIDEr',        max: 200, baseline:  90.0, sota: 145.0, decimals: 1, refFree: false,
    desc: 'tf-idf weighted n-gram cosine similarity.' },
  { key: 'SPICE',        max: 100, baseline: 17.0, sota: 26.0, decimals: 1, refFree: false,
    desc: 'F-score over scene-graph propositions.' },
  { key: 'BERTScore-F1', max:  1.0, baseline: 0.880, sota: 0.940, decimals: 3, refFree: false,
    desc: 'Contextual embedding cosine F1.' },
  { key: 'CLIPScore',    max:  1.0, baseline: 0.700, sota: 0.790, decimals: 3, refFree: true,
    desc: 'CLIP image-text cosine similarity. Reference-free.' },
  { key: 'RefCLIPScore', max:  1.0, baseline: 0.720, sota: 0.800, decimals: 3, refFree: false,
    desc: 'Harmonic mean of CLIPScore and CLIP text-text similarity.' },
];

// ============================================================
// Deterministic mock evaluator
// Same (caption, references, hasImage) → same scores.
// ============================================================

function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tokenize(s) {
  return (s || '').toLowerCase().match(/[a-z0-9]+/g) || [];
}

function jaccard(aTok, bTok) {
  const sa = new Set(aTok);
  const sb = new Set(bTok);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

function mockEvaluate({ caption, references, hasImage }) {
  const refList = references
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
  const capTok = tokenize(caption);

  // Best Jaccard overlap with any reference (or 0.5 fallback if no refs)
  const overlap = refList.length === 0
    ? 0.5
    : Math.max(...refList.map(r => jaccard(capTok, tokenize(r))));

  // Caption "shape" heuristic: sweet spot around 8-15 tokens
  const lenScore =
    capTok.length === 0 ? 0
      : capTok.length < 8 ? capTok.length / 8
      : capTok.length <= 15 ? 1
      : Math.max(0.55, 1 - (capTok.length - 15) / 30);

  // Composite "quality" in [0, 1] (only used to bias the mock numbers)
  const baseQuality = Math.max(0, Math.min(1, overlap * 0.6 + lenScore * 0.4));

  const seed = hashStr(`${caption}||${references}||${hasImage ? '1' : '0'}`);
  const rnd = mulberry32(seed);

  return METRICS.map(m => {
    let q;
    if (m.refFree) {
      // Ref-free metrics depend on image-text alignment, not on references
      q = hasImage
        ? 0.55 + (rnd() - 0.5) * 0.35 + lenScore * 0.1
        : 0.30 + (rnd() - 0.5) * 0.20;
    } else {
      const noise = (rnd() - 0.5) * 0.18;
      q = baseQuality + noise;
    }
    q = Math.max(0, Math.min(1, q));

    // Map quality [0,1] linearly into [0.5*baseline, 1.1*sota]
    const lo = m.baseline * 0.5;
    const hi = m.sota * 1.1;
    const value = lo + q * (hi - lo);

    return { ...m, value };
  });
}

function verdict(value, m) {
  if (value >= m.sota) return { label: 'Excellent', color: 'green', stroke: '#52c41a' };
  if (value >= m.baseline) return { label: 'Good', color: 'blue', stroke: '#1677ff' };
  if (value >= m.baseline * 0.7) return { label: 'Fair', color: 'orange', stroke: '#faad14' };
  return { label: 'Poor', color: 'red', stroke: '#ff4d4f' };
}

// ============================================================
// Sample input for the "Try sample" button
// ============================================================

const SAMPLE = {
  caption: 'A black cat is sitting on a wooden table next to an open laptop.',
  references: [
    'A cat rests on a desk near a computer.',
    'A dark cat sits beside an open laptop on a wooden surface.',
    'A black cat lies on a table next to a laptop.',
  ].join('\n'),
};

// ============================================================
// Page
// ============================================================

const GenerationPage = () => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [caption, setCaption] = useState('');
  const [references, setReferences] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  const handleBeforeUpload = (file) => {
    if (imageUrl) {
      try { URL.revokeObjectURL(imageUrl); } catch (_) {}
    }
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setImageName(file.name || 'image');
    setResults(null);
    return false; // prevent antd's auto-upload (we keep the file local)
  };

  const handleEvaluate = async () => {
    if (!caption.trim()) {
      messageApi.warning('Please enter a generated caption.');
      return;
    }
    setRunning(true);
    setResults(null);
    await new Promise(r => setTimeout(r, 1200 + Math.random() * 600));
    const out = mockEvaluate({ caption, references, hasImage: !!imageUrl });
    setResults(out);
    setRunning(false);
  };

  const handleReset = () => {
    if (imageUrl) {
      try { URL.revokeObjectURL(imageUrl); } catch (_) {}
    }
    setImageUrl('');
    setImageName('');
    setCaption('');
    setReferences('');
    setResults(null);
  };

  const handleSample = () => {
    setCaption(SAMPLE.caption);
    setReferences(SAMPLE.references);
    setResults(null);
  };

  const compositeScore = useMemo(() => {
    if (!results) return null;
    const norms = results.map(r => Math.min(1, r.value / r.sota));
    return norms.reduce((a, b) => a + b, 0) / norms.length;
  }, [results]);

  const compositeVerdict = useMemo(() => {
    if (compositeScore == null) return null;
    if (compositeScore >= 0.85) return { label: 'Excellent', color: 'green' };
    if (compositeScore >= 0.7)  return { label: 'Good',      color: 'blue'  };
    if (compositeScore >= 0.5)  return { label: 'Fair',      color: 'orange'};
    return { label: 'Poor', color: 'red' };
  }, [compositeScore]);

  return (
    <>
      {contextHolder}
      <SiteHeader badge='GEN' />
      <div className='bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 rounded-lg shadow-md dark:shadow-neutral-950/40 p-2 w-full min-w-0 overflow-x-auto'>
        <div className='p-4'>
          <Space className='w-full' direction='vertical' size='middle'>
            <div>
              <p className='mb-2 text-lg font-medium'>Caption Evaluation Demo</p>
              <p className='text-neutral-500 dark:text-neutral-400 text-sm'>
                Upload an image, paste a generated caption (and optional references), then click
                Evaluate. Scores are <strong>simulated</strong> — deterministic per input but no
                real model runs. Numbers are biased by caption length and reference overlap so
                similar inputs produce similar reports.
              </p>
            </div>

            {/* ====================== Inputs ====================== */}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={10}>
                <Card title='Image' size='small' className='dark:!bg-neutral-800/50'>
                  <Space>
                    <Upload
                      multiple={false}
                      maxCount={1}
                      showUploadList={false}
                      accept='image/*'
                      beforeUpload={handleBeforeUpload}
                    >
                      <Button icon={<UploadOutlined />}>Choose Image</Button>
                    </Upload>
                    {imageName && (
                      <span className='text-xs text-neutral-500 truncate max-w-[200px] inline-block align-middle'>
                        {imageName}
                      </span>
                    )}
                  </Space>
                  <div
                    className='mt-3 w-full overflow-hidden border-2 border-dashed border-gray-300 dark:border-neutral-600 flex items-center justify-center'
                    style={{ aspectRatio: '4/3' }}
                  >
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={imageName}
                        width='100%'
                        height='100%'
                        style={{ objectFit: 'contain' }}
                        preview={false}
                      />
                    ) : (
                      <span className='text-neutral-400'>NO IMAGE UPLOADED</span>
                    )}
                  </div>
                </Card>
              </Col>

              <Col xs={24} md={14}>
                <Card title='Captions' size='small' className='dark:!bg-neutral-800/50'>
                  <p className='mb-2 text-sm font-medium'>Generated caption (required)</p>
                  <Input.TextArea
                    rows={3}
                    placeholder='e.g. A black cat is sitting on a wooden table next to a laptop.'
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                  />
                  <p className='mt-3 mb-2 text-sm font-medium'>
                    Reference captions (optional, one per line)
                  </p>
                  <Input.TextArea
                    rows={4}
                    placeholder={'A cat rests on a desk near a computer.\nA dark cat sits beside an open laptop.'}
                    value={references}
                    onChange={e => setReferences(e.target.value)}
                  />
                  <Space className='mt-4' wrap>
                    <Button
                      type='primary'
                      icon={<PlayCircleOutlined />}
                      loading={running}
                      onClick={handleEvaluate}
                    >
                      Evaluate
                    </Button>
                    <Button onClick={handleSample}>Try sample</Button>
                    <Button icon={<ReloadOutlined />} onClick={handleReset}>
                      Reset
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* ====================== Results ====================== */}
            {(running || results) && (
              <Card title='Evaluation Results' size='small' className='dark:!bg-neutral-800/50'>
                <Spin spinning={running} tip='Running mock evaluation...'>
                  {results && (
                    <Space direction='vertical' size='middle' className='w-full'>
                      {/* Composite */}
                      <div className='rounded-lg border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-4'>
                        <div className='flex items-center justify-between flex-wrap gap-2'>
                          <div>
                            <p className='text-sm text-neutral-500 dark:text-neutral-400 mb-1'>
                              Composite (mean of normalized scores)
                            </p>
                            <p className='text-3xl font-semibold text-blue-700 dark:text-blue-300'>
                              {(compositeScore * 100).toFixed(1)}
                              <span className='text-base text-neutral-500'> / 100</span>
                            </p>
                          </div>
                          {compositeVerdict && (
                            <Tag
                              color={compositeVerdict.color}
                              style={{ fontSize: 14, padding: '4px 12px' }}
                            >
                              {compositeVerdict.label}
                            </Tag>
                          )}
                        </div>
                      </div>

                      {/* Per-metric grid */}
                      <Row gutter={[12, 12]}>
                        {results.map(r => {
                          const v = verdict(r.value, r);
                          const pct = Math.min(100, (r.value / r.max) * 100);
                          return (
                            <Col xs={24} sm={12} md={12} lg={8} key={r.key}>
                              <Card size='small' className='h-full dark:!bg-neutral-900/40'>
                                <div className='flex items-baseline justify-between gap-2'>
                                  <span className='font-medium'>{r.key}</span>
                                  <Space size={4}>
                                    {r.refFree && <Tag color='green' style={{ marginRight: 0 }}>ref-free</Tag>}
                                    <Tag color={v.color} style={{ marginRight: 0 }}>{v.label}</Tag>
                                  </Space>
                                </div>
                                <div className='text-2xl font-semibold mt-1'>
                                  {r.value.toFixed(r.decimals)}
                                  <span className='text-xs text-neutral-500 ml-1'>/ {r.max}</span>
                                </div>
                                <Progress
                                  percent={pct}
                                  showInfo={false}
                                  strokeColor={v.stroke}
                                  size='small'
                                />
                                <p className='text-xs text-neutral-500 dark:text-neutral-400 mt-1'>
                                  baseline {r.baseline.toFixed(r.decimals)} · SOTA {r.sota.toFixed(r.decimals)}
                                </p>
                                <p className='text-xs text-neutral-400 dark:text-neutral-500 mt-1 leading-snug'>
                                  {r.desc}
                                </p>
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>
                    </Space>
                  )}
                </Spin>
              </Card>
            )}
          </Space>
        </div>
      </div>
      <SiteFooter />
    </>
  );
};

export default GenerationPage;
