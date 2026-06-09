import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
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
// Metric definitions. TokenGround is driven by the manifest's
// per-image overall focus score (single composite mask).
// ============================================================

const METRICS = [
  { key: 'BLEU-4',       max: 100, baseline: 28.0, sota: 45.0, decimals: 1, refFree: false,
    desc: 'Modified n-gram precision (n=4) with brevity penalty.' },
  { key: 'METEOR',       max: 100, baseline: 22.0, sota: 32.0, decimals: 1, refFree: false,
    desc: 'Unigram alignment with stem and synonym matching.' },
  { key: 'CIDEr',        max: 200, baseline: 90.0, sota: 145.0, decimals: 1, refFree: false,
    desc: 'tf-idf weighted n-gram cosine similarity.' },
  { key: 'SPICE',        max: 100, baseline: 17.0, sota: 26.0, decimals: 1, refFree: false,
    desc: 'F-score over scene-graph propositions.' },
  { key: 'CLIPScore',    max: 1.0, baseline: 0.700, sota: 0.790, decimals: 3, refFree: true,
    desc: 'CLIP image-text cosine similarity. Reference-free.' },
  { key: 'Fidelity',    max: 1.0, baseline: 0.55, sota: 0.88, decimals: 3, refFree: true,
    desc: 'Precision-side: how much of the caption is visually grounded in the image (penalises hallucination).' },
  { key: 'Adequacy',    max: 1.0, baseline: 0.50, sota: 0.85, decimals: 3, refFree: true,
    desc: 'Recall-side: how well the caption covers the key visual content of the image (penalises omission).' },
  { key: 'Fluency',     max: 1.0, baseline: 0.70, sota: 0.95, decimals: 3, refFree: true,
    desc: 'Linguistic quality of the caption independent of image content (grammar, naturalness).' },
];

// ============================================================
// Deterministic helpers (FNV-1a + mulberry32)
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

// ============================================================
// Mock evaluator
// ============================================================

function mockEvaluate({ caption, references, hasImage, focus }) {
  const refList = references.split('\n').map(s => s.trim()).filter(Boolean);
  const capTok = tokenize(caption);

  const overlap = refList.length === 0
    ? 0.5
    : Math.max(...refList.map(r => jaccard(capTok, tokenize(r))));

  const lenScore =
    capTok.length === 0 ? 0
      : capTok.length < 8 ? capTok.length / 8
      : capTok.length <= 15 ? 1
      : Math.max(0.55, 1 - (capTok.length - 15) / 30);

  const baseQuality = Math.max(0, Math.min(1, overlap * 0.6 + lenScore * 0.4));

  const seed = hashStr(`${caption}||${references}||${hasImage ? '1' : '0'}`);
  const rnd = mulberry32(seed);

  return METRICS.map(m => {
    let q;
    if (m.key === 'Grounding') {
      if (focus == null) {
        q = hasImage ? 0.45 + (rnd() - 0.5) * 0.1 : 0.25 + (rnd() - 0.5) * 0.1;
      } else {
        q = Math.max(0, Math.min(1, focus + (rnd() - 0.5) * 0.06));
      }
    } else if (m.key === 'Fidelity') {
      // precision-side: high overlap + shorter caption → fewer hallucinations
      const precisionBase = hasImage ? overlap * 0.5 + (1 - Math.min(1, capTok.length / 20)) * 0.3 + 0.2 : 0.3;
      q = Math.max(0, Math.min(1, precisionBase + (rnd() - 0.5) * 0.15));
    } else if (m.key === 'Adequacy') {
      // recall-side: overlap + longer caption covers more content
      const recallBase = hasImage ? overlap * 0.5 + Math.min(1, capTok.length / 15) * 0.3 + 0.15 : 0.25;
      q = Math.max(0, Math.min(1, recallBase + (rnd() - 0.5) * 0.15));
    } else if (m.key === 'Fluency') {
      // purely text quality: length score + small noise, image doesn't matter
      q = Math.max(0, Math.min(1, lenScore * 0.7 + 0.25 + (rnd() - 0.5) * 0.1));
    } else if (m.refFree) {
      q = hasImage
        ? 0.55 + (rnd() - 0.5) * 0.35 + lenScore * 0.1
        : 0.30 + (rnd() - 0.5) * 0.20;
    } else {
      const noise = (rnd() - 0.5) * 0.18;
      q = baseQuality + noise;
    }
    q = Math.max(0, Math.min(1, q));
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
// Sample inputs
// ============================================================

const SAMPLES = {
  flight: {
    caption: 'A passenger airplane with two wings flies in a blue sky with white clouds above the runway.',
    references: [
      'An airplane is taking off from a runway under a clear sky.',
      'A jet plane with white wings against blue sky and clouds.',
      'A commercial airplane flies above the runway through the clouds.',
    ].join('\n'),
  },
  women: {
    caption: 'A smiling woman with long hair wearing a red dress poses in front of a soft background.',
    references: [
      'A woman with a smile wears a red dress.',
      'A young woman with long hair and a red dress is smiling.',
      'A woman in a red dress smiles for the camera.',
    ].join('\n'),
  },
  sea: {
    caption: 'A woman in a blue dress sits on a wooden boat on a pebble beach, while a man in a black suit stands facing her near the sea.',
    references: [
      'A woman in a blue dress sits on a boat on the beach as a man in a suit stands nearby.',
      'A young woman sitting on a wooden boat looks at a man standing on a pebble beach by the sea.',
      'A man in a black suit and a woman in a blue dress face each other on a beach beside a wooden boat.',
    ].join('\n'),
  },
};

// ============================================================
// Page
// ============================================================

const MANIFEST_URL = '/samples/manifest.json';

const GenerationPage = () => {
  const [manifest, setManifest] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imageName, setImageName] = useState('');
  const [imageId, setImageId] = useState(null);          // matched manifest key ('flight' / 'women' / null)
  const [imageDims, setImageDims] = useState({ w: 0, h: 0 });
  const [caption, setCaption] = useState('');
  const [references, setReferences] = useState('');
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [showMask] = useState(true);
  const [maskLoading, setMaskLoading] = useState(false);   // simulated segmentation latency
  const [maskReady, setMaskReady] = useState(false);       // becomes true after the fake segment
  const [messageApi, contextHolder] = message.useMessage();

  // Load the mask manifest once
  useEffect(() => {
    let cancelled = false;
    fetch(MANIFEST_URL)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(data => { if (!cancelled) setManifest(data); })
      .catch(err => {
        console.error('manifest load failed', err);
        if (!cancelled) setManifest({});
      });
    return () => { cancelled = true; };
  }, []);

  const matchManifestId = (name) => {
    if (!manifest) return null;
    const low = (name || '').toLowerCase();
    for (const id of Object.keys(manifest)) {
      if (low === id || low.startsWith(id + '.') || low.includes(id)) return id;
    }
    return null;
  };

  const handleBeforeUpload = (file) => {
    if (imageUrl && imageUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(imageUrl); } catch (_) {}
    }
    const url = URL.createObjectURL(file);
    const matchedId = matchManifestId(file.name);
    setImageUrl(url);
    setImageName(file.name || 'image');
    setImageId(matchedId);
    setResults(null);
    setMaskReady(false);
    if (matchedId) {
      setMaskLoading(true);
      window.setTimeout(() => {
        setMaskLoading(false);
        setMaskReady(true);
      }, 1200 + Math.random() * 400);
    } else {
      setMaskLoading(false);
    }
    return false;
  };

  const loadSample = (sampleId) => {
    if (!manifest || !manifest[sampleId]) {
      messageApi.error('manifest not loaded yet, try again');
      return;
    }
    if (imageUrl && imageUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(imageUrl); } catch (_) {}
    }
    setImageUrl('/' + manifest[sampleId].image);
    setImageName(`${sampleId}.${manifest[sampleId].image.split('.').pop()}`);
    setImageId(sampleId);
    setCaption(SAMPLES[sampleId]?.caption ?? '');
    setReferences(SAMPLES[sampleId]?.references ?? '');
    setResults(null);
    setMaskReady(false);
    setMaskLoading(true);
    window.setTimeout(() => {
      setMaskLoading(false);
      setMaskReady(true);
    }, 1200 + Math.random() * 400);
  };

  // Track the natural image size
  useEffect(() => {
    if (!imageUrl) { setImageDims({ w: 0, h: 0 }); return; }
    const probe = new window.Image();
    probe.onload = () => setImageDims({ w: probe.naturalWidth, h: probe.naturalHeight });
    probe.src = imageUrl;
  }, [imageUrl]);

  const handleEvaluate = async () => {
    if (!caption.trim()) {
      messageApi.warning('Please enter a generated caption.');
      return;
    }
    setRunning(true);
    setResults(null);

    // Stage 1: "load mask" (faked latency 600-1000ms)
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    // Stage 2a: text-only metrics first (faster, no image needed)
    const focus = imageId && manifest && manifest[imageId] ? manifest[imageId].focus : null;
    const out = mockEvaluate({ caption, references, hasImage: !!imageUrl, focus });
    await new Promise(r => setTimeout(r, 400 + Math.random() * 200));
    setResults(out.filter(m => !m.refFree));

    // Stage 2b: image-dependent metrics (slower)
    await new Promise(r => setTimeout(r, 500 + Math.random() * 300));
    setResults(out);
    setRunning(false);
  };

  const handleReset = () => {
    if (imageUrl && imageUrl.startsWith('blob:')) {
      try { URL.revokeObjectURL(imageUrl); } catch (_) {}
    }
    setImageUrl('');
    setImageName('');
    setImageId(null);
    setImageDims({ w: 0, h: 0 });
    setCaption('');
    setReferences('');
    setResults(null);
    setMaskLoading(false);
    setMaskReady(false);
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

  const maskUrl = imageId && manifest && manifest[imageId]
    ? '/' + manifest[imageId].mask
    : null;

  const isJsonMask = maskUrl?.endsWith('.json');

  const [polygonMasks, setPolygonMasks] = useState(null);

  useEffect(() => {
    if (!isJsonMask || !maskReady) { setPolygonMasks(null); return; }
    fetch(maskUrl)
      .then(r => r.json())
      .then(data => setPolygonMasks(data))
      .catch(() => setPolygonMasks(null));
  }, [maskUrl, maskReady, isJsonMask]);

  return (
    <>
      {contextHolder}
      <SiteHeader badge='EVAL' />
      <div className='bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 rounded-lg shadow-md dark:shadow-neutral-950/40 p-2 w-full min-w-0 overflow-x-auto'>
        <div className='p-4'>
          <Space className='w-full' direction='vertical' size='middle'>
            <div>
              <p className='mb-2 text-lg font-medium'>Caption Evaluation Demo</p>
              <p className='text-neutral-500 dark:text-neutral-400 text-sm'>
                Upload an image, paste a caption (and optional references), then click Evaluate.
              </p>
            </div>

            {/* ====================== Inputs ====================== */}
            <Row gutter={[16, 16]}>
              <Col xs={24} md={11}>
                <Card title='Image' size='small' className='dark:!bg-neutral-800/50'>
                  <Space wrap>
                    <Upload
                      multiple={false}
                      maxCount={1}
                      showUploadList={false}
                      accept='image/*'
                      beforeUpload={handleBeforeUpload}
                    >
                      <Button icon={<UploadOutlined />}>Choose Image</Button>
                    </Upload>
                    {['flight', 'women', 'sea'].map((id, i) => (
                      manifest?.[id] && (
                        <div key={id} className='flex flex-col items-center gap-0.5'>
                          <span className='text-xs text-neutral-500'>Sample {i + 1}</span>
                          <div
                            onClick={() => loadSample(id)}
                            className='cursor-pointer rounded overflow-hidden border-2 border-transparent hover:border-blue-400 transition-all'
                            style={{ width: 44, height: 44 }}
                            title={id}
                          >
                            <img src={'/' + manifest[id].image} alt={id} className='w-full h-full object-cover' />
                          </div>
                        </div>
                      )
                    ))}
                  </Space>

                  <div className='mt-2 flex items-center justify-between flex-wrap gap-2'>
                    <div className='text-xs text-neutral-500 flex items-center gap-2'>
                      {maskLoading
                        ? <Tag color='blue' icon={<Spin size='small' />} style={{ paddingInline: 8 }}>
                            &nbsp;segmenting...
                          </Tag>
                        : (imageName && !imageId && <Tag>no pre-rendered mask</Tag>)
                      }
                    </div>
                  </div>

                  <div
                    className='mt-3 relative overflow-hidden flex items-center justify-center bg-neutral-50 dark:bg-neutral-900 mx-auto'
                    style={{ aspectRatio: '4/3', width: '45%' }}
                  >
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={imageName}
                          className='absolute inset-0 w-full h-full object-contain'
                          draggable={false}
                        />
                        {maskLoading && (
                          <div className='absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[1px]'>
                            <Spin tip='Segmenting key objects...' />
                          </div>
                        )}
                      </>
                    ) : (
                      <span className='text-neutral-400'>NO IMAGE UPLOADED</span>
                    )}
                  </div>
                  {imageDims.w > 0 && (
                    <div className='mt-2 text-xs text-neutral-400'>
                      natural size: {imageDims.w} × {imageDims.h}
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} md={13}>
                <Card title='Captions' size='small' className='dark:!bg-neutral-800/50'>
                  <p className='mb-2 text-sm font-medium'>Generated caption (required)</p>
                  <Input.TextArea
                    rows={3}
                    placeholder='e.g. A passenger airplane flies through a blue sky with clouds.'
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                  />
                  <p className='mt-3 mb-2 text-sm font-medium'>
                    Reference captions (optional, one per line)
                  </p>
                  <Input.TextArea
                    rows={4}
                    placeholder={'A jet plane against a blue sky.\nAn airplane flies above the runway.'}
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
                    <Button icon={<ReloadOutlined />} onClick={handleReset}>
                      Reset
                    </Button>
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* ====================== Metrics ====================== */}
            {(running || results) && (
              <Card title='Evaluation Results' size='small' className='dark:!bg-neutral-800/50'>
                {running && <Spin spinning tip='Loading mask then computing metrics...' className='mb-3' />}
                {results && (
                    <div className='flex gap-0'>
                      {/* Left: image + Fidelity/Fluency/Adequacy */}
                      <div className='flex gap-3 flex-shrink-0' style={{ width: '42%' }}>
                        {imageUrl && (
                          <div className='relative' style={{ flex: 1 }}>
                            <img src={imageUrl} alt='input' className='w-full h-full object-contain rounded-lg' />
                            {maskUrl && maskReady && showMask && (
                              isJsonMask && polygonMasks ? (
                                <svg
                                  className='absolute inset-0 w-full h-full pointer-events-none'
                                  viewBox={`0 0 ${polygonMasks.info.image_width} ${polygonMasks.info.image_height}`}
                                  preserveAspectRatio='xMidYMid meet'
                                >
                                  {polygonMasks.masks.map(m => (
                                    <polygon
                                      key={m.id}
                                      points={m.polygon.map(p => p.join(',')).join(' ')}
                                      fill='rgba(255,100,0,0.35)'
                                      stroke='rgba(255,140,0,0.9)'
                                      strokeWidth='3'
                                    />
                                  ))}
                                </svg>
                              ) : !isJsonMask && (
                                <img
                                  src={maskUrl}
                                  alt='segmentation mask'
                                  className='absolute inset-0 w-full h-full object-contain pointer-events-none'
                                  draggable={false}
                                />
                              )
                            )}
                          </div>
                        )}
                        <div className='flex flex-col gap-2' style={{ flex: 1 }}>
                          {['Fidelity', 'Fluency', 'Adequacy'].map(key => {
                            const r = results.find(m => m.key === key);
                            if (!r) return <div key={key} className='rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/40 p-2 flex-1 flex items-center justify-center text-neutral-400 text-xs'>{key} computing…</div>;
                            const v = verdict(r.value, r);
                            const pct = Math.min(100, (r.value / r.max) * 100);
                            return (
                              <div key={key} className='rounded-lg border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-2 flex-1'>
                                <div className='flex items-center justify-between gap-1'>
                                  <span className='text-sm font-medium'>{key}</span>
                                  <Tag color={v.color} style={{ marginRight: 0, fontSize: 11 }}>{v.label}</Tag>
                                </div>
                                <div className='text-lg font-semibold mt-0.5'>
                                  {r.value.toFixed(r.decimals)}
                                  <span className='text-xs text-neutral-500 ml-1'>/ {r.max}</span>
                                </div>
                                <Progress percent={pct} showInfo={false} strokeColor={v.stroke} size='small' />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Divider */}
                      <div className='mx-4 self-stretch border-l-2 border-neutral-200 dark:border-neutral-700' />

                      {/* Right: remaining metrics */}
                      <div className='flex-1 grid gap-2' style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {results.filter(r => !['Fidelity', 'Adequacy', 'Fluency'].includes(r.key)).map(r => {
                          const v = verdict(r.value, r);
                          const pct = Math.min(100, (r.value / r.max) * 100);
                          return (
                            <Card key={r.key} size='small' className='dark:!bg-neutral-900/40'>
                              <div className='flex items-baseline justify-between gap-1'>
                                <span className='text-sm font-medium'>{r.key}</span>
                                <Space size={2}>
                                  {r.refFree && <Tag color='green' style={{ marginRight: 0, fontSize: 10, padding: '0 4px' }}>ref-free</Tag>}
                                  <Tag color={v.color} style={{ marginRight: 0, fontSize: 10, padding: '0 4px' }}>{v.label}</Tag>
                                </Space>
                              </div>
                              <div className='text-base font-semibold mt-0.5'>
                                {r.value.toFixed(r.decimals)}
                                <span className='text-xs text-neutral-500 ml-1'>/ {r.max}</span>
                              </div>
                              <Progress percent={pct} showInfo={false} strokeColor={v.stroke} size='small' />
                              <p className='text-xs text-neutral-400 dark:text-neutral-500 mt-1 leading-snug'>
                                {r.desc}
                              </p>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
