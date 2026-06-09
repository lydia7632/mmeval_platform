import React, { useMemo, useState } from 'react';
import { Button, Segmented, Select, Space, Table, Tag } from 'antd';

import { SiteFooter, SiteHeader } from './components.jsx';

// ============================================================
// Mock data — replace with real backend response when ready.
// ============================================================

// 指标对比：常用 caption 评价指标的综述
// 分类参考 HiFi-Score (Yao et al., ECCV 2024) Fig. 3：
//   - criteria_type: reference-based vs image-based
//   - granularity:   coarse-grained vs fine-grained
// 选取的具体指标参考该论文 Table 1 (caption-level comparison)；
// `uses_reference` 对应 Table 1 中的 "w/ ref" 列。
const METRICS = [
  {
    id: 'fleur',
    name: 'FLEUR',
    criteria_type: 'image-based',
    granularity: 'fine-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2024,
    venue: 'arXiv 2024',
    paper: 'FLEUR: An Explainable Reference-Free Evaluation Metric for Image Captioning Using a Large Multimodal Model',
    paper_url: 'https://arxiv.org/abs/2406.06004',
    pros: 'Explainable; uses large multimodal model for fine-grained scoring.',
    cons: 'Requires a large multimodal model; computationally expensive.',
  },
  {
    id: 'vce',
    name: 'VCE',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2024,
    venue: 'arXiv 2024',
    paper: 'Vision Language Model-based Caption Evaluation Method Leveraging Visual Context Extraction',
    paper_url: 'https://arxiv.org/abs/2402.17969',
    pros: 'Leverages visual context extraction for better alignment.',
    cons: 'Depends on VLM quality; limited interpretability.',
  },
  {
    id: 'hicescore',
    name: 'HICEScore',
    criteria_type: 'image-based',
    granularity: 'fine-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2024,
    venue: 'ACM MM 2024',
    paper: 'HICEScore: A Hierarchical Metric for Image Captioning Evaluation',
    paper_url: 'https://dl.acm.org/doi/10.1145/3664647.3681358',
    pros: 'Hierarchical evaluation captures multi-level semantics.',
    cons: 'Complex pipeline; slower than flat metrics.',
  },
  {
    id: 'hifi-score',
    name: 'HiFi-Score',
    criteria_type: 'image-based',
    granularity: 'fine-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: true,
    year: 2024,
    venue: 'ECCV 2024',
    paper: 'HiFi-Score: Fine-Grained Image Description Evaluation with Hierarchical Parsing Graphs',
    paper_url: 'https://link.springer.com/chapter/10.1007/978-3-031-73033-7_25',
    pros: 'Reference-free, fine-grained; strong human correlation on Flickr8k-Expert / Composite / THumB1.0.',
    cons: 'Less benefit on short, less-detailed captions.',
  },
  {
    id: 'bridge',
    name: 'BRIDGE',
    criteria_type: 'image-based',
    granularity: 'fine-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2024,
    venue: 'ECCV 2024',
    paper: 'BRIDGE: Bridging Gaps in Image Captioning Evaluation with Stronger Visual Cues',
    paper_url: 'https://arxiv.org/abs/2407.20341',
    pros: 'Stronger visual cues improve alignment with human judgment.',
    cons: 'Requires additional visual processing; heavier than CLIPScore.',
  },
  {
    id: 'polos',
    name: 'Polos',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: true,
    llm_based: null,
    year: 2024,
    venue: 'CVPR 2024',
    paper: 'Polos: Multimodal Metric Learning from Human Feedback for Image Captioning',
    paper_url: 'https://arxiv.org/abs/2402.18091',
    pros: 'Directly optimized on human preference data.',
    cons: 'Requires large annotated preference corpus.',
  },
  {
    id: 'infometic',
    name: 'InfoMetIC',
    criteria_type: 'image-based',
    granularity: 'fine-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2023,
    venue: 'ACL 2023',
    paper: 'InfoMetIC: An Informative Metric for Reference-free Image Caption Evaluation',
    paper_url: 'https://arxiv.org/abs/2305.06002',
    pros: 'Informative: returns local matching besides an overall score.',
    cons: 'Targets single-sentence captions; less suited to long descriptions.',
  },
  {
    id: 'pac-s',
    name: 'PAC-S',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2023,
    venue: 'CVPR 2023',
    paper: 'Positive-Augmented Contrastive Learning for Image and Video Captioning Evaluation',
    paper_url: 'https://arxiv.org/abs/2303.12112',
    pros: 'State-of-the-art human correlation on several benchmarks.',
    cons: 'Requires additional training data; heavier.',
  },
  {
    id: 'clipscore',
    name: 'CLIPScore',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2021,
    venue: 'EMNLP 2021',
    paper: 'CLIPScore: A Reference-free Evaluation Metric for Image Captioning',
    paper_url: 'https://arxiv.org/abs/2104.08718',
    pros: 'Reference-free; correlates well with human judgments.',
    cons: 'Inherits CLIP biases; can reward generic descriptions.',
  },
  {
    id: 'refclipscore',
    name: 'RefCLIPScore',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: true,
    llm_based: null,
    year: 2021,
    venue: 'EMNLP 2021',
    paper: 'CLIPScore: A Reference-free Evaluation Metric for Image Captioning',
    paper_url: 'https://arxiv.org/abs/2104.08718',
    pros: 'Combines visual grounding with reference fidelity.',
    cons: 'Still inherits CLIP biases.',
  },
  {
    id: 'umic',
    name: 'UMIC',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2021,
    venue: 'ACL 2021',
    paper: 'UMIC: An Unreferenced Metric for Image Captioning via Contrastive Learning',
    paper_url: 'https://arxiv.org/abs/2106.14019',
    pros: 'Reference-free; outperforms multi-reference metrics on several benchmarks.',
    cons: 'Performance depends on negative-sample design; provides only an overall score.',
  },
  {
    id: 'faier',
    name: 'FAIEr-4',
    criteria_type: 'image-based',
    granularity: 'fine-grained',
    uses_image: true,
    uses_reference: true,
    llm_based: null,
    year: 2021,
    venue: 'CVPR 2021',
    paper: 'FAIEr: Fidelity and Adequacy Ensured Image Caption Evaluation',
    paper_url: 'https://openaccess.thecvf.com/content/CVPR2021/html/Wang_FAIEr_Fidelity_and_Adequacy_Ensured_Image_Caption_Evaluation_CVPR_2021_paper.html',
    pros: 'Decouples evaluation into fidelity and adequacy; fine-grained scene-graph matching.',
    cons: 'Relies on scene-graph parsing quality; heavier pipeline.',
  },
  {
    id: 'vilbertscore',
    name: 'ViLBERTScore',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2020,
    venue: 'EVAL4NLP 2020',
    paper: 'ViLBERTScore: Evaluating Image Caption Using Vision-and-Language BERT',
    paper_url: 'https://arxiv.org/abs/2102.08759',
    pros: 'Uses vision-language BERT for cross-modal alignment.',
    cons: 'Requires ViLBERT model; slower than CLIP-based metrics.',
  },
  {
    id: 'tiger',
    name: 'TIGEr',
    criteria_type: 'image-based',
    granularity: 'fine-grained',
    uses_image: true,
    uses_reference: true,
    llm_based: null,
    year: 2019,
    venue: 'EMNLP 2019',
    paper: 'TIGEr: Text-to-Image Grounding for Image Caption Evaluation',
    paper_url: 'https://arxiv.org/abs/1909.02050',
    pros: 'Grounds text to image regions for fine-grained evaluation.',
    cons: 'Depends on SCAN model quality; complex pipeline.',
  },
  {
    id: 'reo',
    name: 'REO',
    criteria_type: 'image-based',
    granularity: 'fine-grained',
    uses_image: true,
    uses_reference: true,
    llm_based: null,
    year: 2019,
    venue: 'EMNLP 2019',
    paper: 'REO-Relevance, Extraness, Omission: A Fine-grained Evaluation for Image Captioning',
    paper_url: 'https://arxiv.org/abs/1909.02576',
    pros: 'Decomposes errors into relevance, extraness, and omission.',
    cons: 'Requires reference captions; complex multi-dimensional output.',
  },
  {
    id: 'vifidel',
    name: 'VIFIDEL',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2019,
    venue: 'ACL 2019',
    paper: 'VIFIDEL: Evaluating the Visual Fidelity of Image Descriptions',
    paper_url: 'https://arxiv.org/abs/1907.09340',
    pros: 'Focuses on visual fidelity using object labels.',
    cons: 'Limited to object-level matching; misses relational semantics.',
  },
  {
    id: 'leic',
    name: 'LEIC',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2018,
    venue: 'CVPR 2018',
    paper: 'Learning to Evaluate Image Captioning',
    paper_url: 'https://arxiv.org/abs/1806.06422',
    pros: 'Learned metric; adapts to human judgment patterns.',
    cons: 'Requires training data; may not generalize across domains.',
  },
  {
    id: 'blipscore',
    name: 'BLIPScore',
    criteria_type: 'image-based',
    granularity: 'coarse-grained',
    uses_image: true,
    uses_reference: false,
    llm_based: null,
    year: 2023,
    venue: 'ICML 2023',
    paper: 'BLIP-2: Bootstrapping Language-Image Pre-training (used as a global image–text matching baseline)',
    paper_url: 'https://arxiv.org/abs/2301.12597',
    pros: 'Strong vision-language backbone; reference-free.',
    cons: 'Provides only an overall score; coarse-grained.',
  },
  {
    id: 'clair',
    name: 'CLAIR',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: true,
    year: 2023,
    venue: 'EMNLP 2023',
    paper: 'CLAIR: Evaluating Image Captions with Large Language Models',
    paper_url: 'https://arxiv.org/abs/2310.12971',
    pros: 'High human correlation; handles paraphrases and semantic nuance naturally.',
    cons: 'Requires API access to a proprietary LLM; slow and costly at scale.',
  },
  {
    id: 'smurf',
    name: 'SMURF',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2021,
    venue: 'ACL 2021',
    paper: 'SMURF: SeMantic and linguistic UndeRstanding Fusion for Caption Evaluation via Typicality Analysis',
    paper_url: 'https://arxiv.org/abs/2106.01444',
    pros: 'Combines semantic and linguistic understanding for robust evaluation.',
    cons: 'Complex fusion pipeline; slower than n-gram metrics.',
  },
  {
    id: 'bertscore',
    name: 'BERT-Score',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2019,
    venue: 'ICLR 2020',
    paper: 'BERTScore: Evaluating Text Generation with BERT',
    paper_url: 'https://arxiv.org/abs/1904.09675',
    pros: 'Captures paraphrases via contextual embeddings.',
    cons: 'Slower than n-gram metrics; backbone choice matters.',
  },
  {
    id: 'wembsim',
    name: 'WEmbSim',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2020,
    venue: 'DICTA 2020',
    paper: 'WEmbSim: A Simple yet Effective Metric for Image Captioning',
    paper_url: 'https://arxiv.org/abs/2109.07485',
    pros: 'Simple word-embedding similarity; fast and effective.',
    cons: 'Ignores word order and sentence structure.',
  },
  {
    id: 'lceval',
    name: 'LCEval',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2019,
    venue: 'IJCV 2019',
    paper: 'LCEval: Learned Composite Metric for Caption Evaluation',
    paper_url: 'https://arxiv.org/abs/1901.09765',
    pros: 'Learned combination of multiple metrics improves correlation.',
    cons: 'Requires training; less interpretable than individual metrics.',
  },
  {
    id: 'nneval',
    name: 'NNEval',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2018,
    venue: 'ECCV 2018',
    paper: 'NNEval: Neural Network based Evaluation Metric for Image Captioning',
    paper_url: 'https://arxiv.org/abs/1901.07931',
    pros: 'Neural network learns evaluation patterns from data.',
    cons: 'Requires training data; may overfit to specific caption styles.',
  },
  {
    id: 're-eval',
    name: 'Re-eval',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2017,
    venue: 'EACL 2017',
    paper: 'Re-evaluating Automatic Metrics for Image Captioning',
    paper_url: 'https://arxiv.org/abs/1612.07600',
    pros: 'Systematic analysis of existing metrics; highlights their limitations.',
    cons: 'Analysis paper rather than a new metric; limited direct applicability.',
  },
  {
    id: 'spice',
    name: 'SPICE',
    criteria_type: 'reference-based',
    granularity: 'fine-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2016,
    venue: 'ECCV 2016',
    paper: 'SPICE: Semantic Propositional Image Caption Evaluation',
    paper_url: 'https://arxiv.org/abs/1607.08822',
    pros: 'Captures semantics beyond n-grams.',
    cons: 'Depends on parser quality; slow.',
  },
  {
    id: 'cider',
    name: 'CIDEr',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2015,
    venue: 'CVPR 2015',
    paper: 'CIDEr: Consensus-based Image Description Evaluation',
    paper_url: 'https://arxiv.org/abs/1411.5726',
    pros: 'Dominant captioning metric; strong human correlation on MS-COCO.',
    cons: 'Sensitive to reference quantity; biased to MS-COCO style.',
  },
  {
    id: 'meteor',
    name: 'METEOR',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2005,
    venue: 'ACL 2005',
    paper: 'METEOR: An Automatic Metric for MT Evaluation with Improved Correlation with Human Judgments',
    paper_url: 'https://aclanthology.org/W05-0909/',
    pros: 'Better correlation with human judgment than BLEU.',
    cons: 'Slow; depends on WordNet, English-biased.',
  },
  {
    id: 'rouge-l',
    name: 'ROUGE-L',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2004,
    venue: 'ACL 2004',
    paper: 'ROUGE: A Package for Automatic Evaluation of Summaries',
    paper_url: 'https://aclanthology.org/W04-1013/',
    pros: 'Word-order sensitive without explicit n-grams.',
    cons: 'Still surface-form; weak on paraphrases.',
  },
  {
    id: 'bleu-4',
    name: 'BLEU-4',
    criteria_type: 'reference-based',
    granularity: 'coarse-grained',
    uses_image: false,
    uses_reference: true,
    llm_based: false,
    year: 2002,
    venue: 'ACL 2002',
    paper: 'BLEU: a Method for Automatic Evaluation of Machine Translation',
    paper_url: 'https://aclanthology.org/P02-1040/',
    pros: 'Simple, fast, language-agnostic.',
    cons: 'Surface-form only, ignores synonyms and semantics.',
  },
];

// 方法模型对比：每条记录代表一个方法；scores 按数据集分组存放各指标得分。
// 数据集下拉切换时，行总数不变；该方法在所选数据集上若无数据，对应指标显示 '—'。
// 数字大致借鉴公开报告，仅作占位演示。
const DATASETS = ['COCO', 'Flickr30k', 'NoCaps', 'TextCaps'];

const MODELS = [
  {
    id: 'show-and-tell',
    method: 'Show and Tell',
    year: 2015,
    venue: 'CVPR 2015',
    backbone: 'CNN + LSTM',
    paper_url: 'https://arxiv.org/abs/1411.4555',
    scores: {
      COCO: { 'BLEU-4': 27.7, METEOR: 23.7, 'ROUGE-L': 50.1, CIDEr: 85.5, SPICE: 16.3, CLIPScore: 0.683, Fidelity: 0.61, Adequacy: 0.55, Fluency: 0.72 },
    },
  },
  {
    id: 'scst',
    method: 'SCST (Att2in)',
    year: 2017,
    venue: 'CVPR 2017',
    backbone: 'CNN + LSTM + RL',
    paper_url: 'https://arxiv.org/abs/1612.00563',
    scores: {
      COCO: { 'BLEU-4': 34.2, METEOR: 26.7, 'ROUGE-L': 55.7, CIDEr: 114.0, SPICE: 19.8, CLIPScore: 0.712, Fidelity: 0.65, Adequacy: 0.60, Fluency: 0.75 },
    },
  },
  {
    id: 'up-down',
    method: 'Up-Down',
    year: 2018,
    venue: 'CVPR 2018',
    backbone: 'Faster R-CNN + LSTM',
    paper_url: 'https://arxiv.org/abs/1707.07998',
    scores: {
      COCO: { 'BLEU-4': 36.3, METEOR: 27.7, 'ROUGE-L': 56.9, CIDEr: 120.1, SPICE: 21.4, CLIPScore: 0.724, Fidelity: 0.68, Adequacy: 0.63, Fluency: 0.77 },
      Flickr30k: { 'BLEU-4': 27.3, METEOR: 21.7, 'ROUGE-L': 50.1, CIDEr: 56.6, SPICE: 16.0, CLIPScore: 0.701, Fidelity: 0.64, Adequacy: 0.58, Fluency: 0.76 },
    },
  },
  {
    id: 'aoanet',
    method: 'AoANet',
    year: 2019,
    venue: 'ICCV 2019',
    backbone: 'Faster R-CNN + Attention-on-Attention',
    paper_url: 'https://arxiv.org/abs/1908.06954',
    scores: {
      COCO: { 'BLEU-4': 38.9, METEOR: 29.2, 'ROUGE-L': 58.8, CIDEr: 129.8, SPICE: 22.4, CLIPScore: 0.731, Fidelity: 0.70, Adequacy: 0.65, Fluency: 0.79 },
    },
  },
  {
    id: 'oscar',
    method: 'Oscar',
    year: 2020,
    venue: 'ECCV 2020',
    backbone: 'BERT + object tags',
    paper_url: 'https://arxiv.org/abs/2004.06165',
    scores: {
      COCO: { 'BLEU-4': 41.7, METEOR: 30.6, 'ROUGE-L': 60.0, CIDEr: 140.0, SPICE: 24.5, CLIPScore: 0.745, Fidelity: 0.73, Adequacy: 0.68, Fluency: 0.82 },
      NoCaps: { 'BLEU-4': null, METEOR: 11.2, 'ROUGE-L': null, CIDEr: 80.9, SPICE: 11.3, CLIPScore: 0.731, Fidelity: 0.69, Adequacy: 0.60, Fluency: 0.81 },
    },
  },
  {
    id: 'vinvl',
    method: 'VinVL',
    year: 2021,
    venue: 'CVPR 2021',
    backbone: 'BERT + improved object features',
    paper_url: 'https://arxiv.org/abs/2101.00529',
    scores: {
      COCO: { 'BLEU-4': 41.0, METEOR: 31.1, 'ROUGE-L': 60.5, CIDEr: 140.9, SPICE: 25.2, CLIPScore: 0.749, Fidelity: 0.74, Adequacy: 0.69, Fluency: 0.83 },
    },
  },
  {
    id: 'blip',
    method: 'BLIP',
    year: 2022,
    venue: 'ICML 2022',
    backbone: 'ViT + BERT (bootstrapped)',
    paper_url: 'https://arxiv.org/abs/2201.12086',
    scores: {
      COCO: { 'BLEU-4': 40.4, METEOR: 31.0, 'ROUGE-L': 60.2, CIDEr: 136.7, SPICE: 24.3, CLIPScore: 0.768, Fidelity: 0.76, Adequacy: 0.71, Fluency: 0.85 },
      Flickr30k: { 'BLEU-4': 31.0, METEOR: 23.6, 'ROUGE-L': 53.0, CIDEr: 65.3, SPICE: 17.1, CLIPScore: 0.752, Fidelity: 0.73, Adequacy: 0.66, Fluency: 0.84 },
    },
  },
  {
    id: 'git',
    method: 'GIT',
    year: 2022,
    venue: 'arXiv 2022',
    backbone: 'ViT + GPT-style decoder',
    paper_url: 'https://arxiv.org/abs/2205.14100',
    scores: {
      COCO: { 'BLEU-4': 44.1, METEOR: 32.2, 'ROUGE-L': 62.0, CIDEr: 144.8, SPICE: 26.1, CLIPScore: 0.772, Fidelity: 0.77, Adequacy: 0.72, Fluency: 0.86 },
      TextCaps: { 'BLEU-4': 40.6, METEOR: 28.4, 'ROUGE-L': 56.2, CIDEr: 138.2, SPICE: 26.0, CLIPScore: 0.738, Fidelity: 0.74, Adequacy: 0.70, Fluency: 0.85 },
    },
  },
  {
    id: 'ofa',
    method: 'OFA',
    year: 2022,
    venue: 'ICML 2022',
    backbone: 'Unified seq2seq Transformer',
    paper_url: 'https://arxiv.org/abs/2202.03052',
    scores: {
      COCO: { 'BLEU-4': 44.9, METEOR: 32.5, 'ROUGE-L': 62.8, CIDEr: 145.3, SPICE: 26.6, CLIPScore: 0.770, Fidelity: 0.78, Adequacy: 0.73, Fluency: 0.87 },
    },
  },
  {
    id: 'blip2',
    method: 'BLIP-2 (OPT-2.7B)',
    year: 2023,
    venue: 'ICML 2023',
    backbone: 'ViT-g + Q-Former + OPT',
    paper_url: 'https://arxiv.org/abs/2301.12597',
    scores: {
      COCO: { 'BLEU-4': 43.7, METEOR: 31.8, 'ROUGE-L': 61.5, CIDEr: 145.8, SPICE: 25.9, CLIPScore: 0.781, Fidelity: 0.80, Adequacy: 0.74, Fluency: 0.88 },
      NoCaps: { 'BLEU-4': null, METEOR: 14.6, 'ROUGE-L': null, CIDEr: 121.6, SPICE: 15.8, CLIPScore: 0.776, Fidelity: 0.78, Adequacy: 0.68, Fluency: 0.87 },
    },
  },
  {
    id: 'llava-1.5',
    method: 'LLaVA-1.5',
    year: 2023,
    venue: 'CVPR 2024',
    backbone: 'CLIP-ViT + Vicuna',
    paper_url: 'https://arxiv.org/abs/2310.03744',
    scores: {
      COCO: { 'BLEU-4': 30.2, METEOR: 28.4, 'ROUGE-L': 55.1, CIDEr: 110.5, SPICE: 23.0, CLIPScore: 0.789, Fidelity: 0.82, Adequacy: 0.70, Fluency: 0.90 },
    },
  },
];

// ============================================================
// UI
// ============================================================

const dimensionPanelClass =
  'rounded-lg border-2 border-[#0B54D8] bg-blue-50/90 dark:bg-blue-950/35 dark:border-[#17B8FF] p-4';

const dimensionBadgeClass =
  'inline-block rounded-md bg-[#0B54D8] dark:bg-[#0B54D8] px-2 py-0.5 text-xs font-semibold tracking-wide text-white mb-3';

const dimensionSegmentedClass = {
  metric:
    '[&_.ant-segmented-item-selected_.ant-segmented-item-label]:!text-emerald-600 [&_.ant-segmented-item-selected_.ant-segmented-item-label]:!font-semibold',
  model:
    '[&_.ant-segmented-item-selected_.ant-segmented-item-label]:!text-amber-600 [&_.ant-segmented-item-selected_.ant-segmented-item-label]:!font-semibold',
};

const sectionCardClass = {
  metric:
    'rounded-xl border-2 border-emerald-400 dark:border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/20 p-5 shadow-sm',
  model:
    'rounded-xl border-2 border-amber-400 dark:border-amber-500 bg-amber-50/60 dark:bg-amber-950/20 p-5 shadow-sm',
};

const DIMENSIONS = [
  { value: 'metric', label: 'Metric Comparison' },
  { value: 'model', label: 'Model Comparison' },
];

const GRANULARITY_OPTIONS = [
  { label: 'Coarse-grained', value: 'coarse-grained' },
  { label: 'Fine-grained', value: 'fine-grained' },
];

const REF_OPTIONS = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

const LLM_OPTIONS = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
];

const EvaluationPage = () => {
  const [dimension, setDimension] = useState('metric');
  const [granularityFilter, setGranularityFilter] = useState(undefined);
  const [imageFilter, setImageFilter] = useState(undefined); // 'yes' | 'no' | undefined
  const [llmFilter, setLlmFilter] = useState(undefined); // 'yes' | 'no' | undefined
  const [refFilter, setRefFilter] = useState(undefined); // 'yes' | 'no' | undefined

  // Flatten: one row per (method, dataset) combination it has scores for.
  const flatModels = useMemo(() => {
    const rows = MODELS.flatMap(m =>
      Object.entries(m.scores).map(([dataset, s]) => ({
        ...m,
        rowKey: `${m.id}__${dataset}`,
        dataset,
        'BLEU-4': s['BLEU-4'] ?? null,
        METEOR: s.METEOR ?? null,
        'ROUGE-L': s['ROUGE-L'] ?? null,
        CIDEr: s.CIDEr ?? null,
        SPICE: s.SPICE ?? null,
        CLIPScore: s.CLIPScore ?? null,
      })),
    );

    // Compute per-metric min/max for normalization (ignore nulls)
    const minMax = key => {
      const vals = rows.map(r => r[key]).filter(v => v != null);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      return { min, max };
    };
    const norm = (v, { min, max }) =>
      min === max ? 0.5 : (v - min) / (max - min);

    const ranges = {
      CLIPScore: minMax('CLIPScore'),
      SPICE: minMax('SPICE'),
      CIDEr: minMax('CIDEr'),
      METEOR: minMax('METEOR'),
      'ROUGE-L': minMax('ROUGE-L'),
      'BLEU-4': minMax('BLEU-4'),
    };

    // Map a [0,1] normalized score to [0.50, 0.95]
    const scale = x => +(0.50 + x * 0.45).toFixed(2);

    return rows.map(r => {
      const n = key => r[key] != null ? norm(r[key], ranges[key]) : null;

      // Fidelity: visual alignment (CLIPScore) + semantic propositions (SPICE)
      const fidParts = [n('CLIPScore') != null && [n('CLIPScore'), 0.6], n('SPICE') != null && [n('SPICE'), 0.4]].filter(Boolean);
      const fid = fidParts.length ? fidParts.reduce((s, [v, w]) => s + v * w, 0) / fidParts.reduce((s, [, w]) => s + w, 0) : null;

      // Adequacy: consensus coverage (CIDEr) + semantic (SPICE) + recall (METEOR)
      const adqParts = [n('CIDEr') != null && [n('CIDEr'), 0.4], n('SPICE') != null && [n('SPICE'), 0.35], n('METEOR') != null && [n('METEOR'), 0.25]].filter(Boolean);
      const adq = adqParts.length ? adqParts.reduce((s, [v, w]) => s + v * w, 0) / adqParts.reduce((s, [, w]) => s + w, 0) : null;

      // Fluency: language quality (METEOR) + sentence structure (ROUGE-L) + n-gram (BLEU-4)
      const fluParts = [n('METEOR') != null && [n('METEOR'), 0.45], n('ROUGE-L') != null && [n('ROUGE-L'), 0.3], n('BLEU-4') != null && [n('BLEU-4'), 0.25]].filter(Boolean);
      const flu = fluParts.length ? fluParts.reduce((s, [v, w]) => s + v * w, 0) / fluParts.reduce((s, [, w]) => s + w, 0) : null;

      return {
        ...r,
        Fidelity: fid != null ? scale(fid) : null,
        Adequacy: adq != null ? scale(adq) : null,
        Fluency: flu != null ? scale(flu) : null,
      };
    });
  }, []);

  const filteredMetrics = useMemo(() => {
    return METRICS.filter(m => {
      if (granularityFilter && m.granularity !== granularityFilter) return false;
      if (imageFilter === 'yes' && !m.uses_image) return false;
      if (imageFilter === 'no' && m.uses_image) return false;
      if (refFilter === 'yes' && !m.uses_reference) return false;
      if (refFilter === 'no' && m.uses_reference) return false;
      if (llmFilter === 'yes' && m.llm_based !== true) return false;
      if (llmFilter === 'no' && m.llm_based !== false) return false;
      return true;
    });
  }, [granularityFilter, imageFilter, refFilter, llmFilter]);

  const filtersActive =
    granularityFilter !== undefined ||
    imageFilter !== undefined ||
    refFilter !== undefined ||
    llmFilter !== undefined;

  const metricColumns = useMemo(() => {
    const boolTag = (v, yesColor) =>
      v
        ? <Tag color={yesColor} style={{ fontSize: 13, padding: '2px 10px' }}>Yes</Tag>
        : <Tag style={{ fontSize: 13, padding: '2px 10px' }}>No</Tag>;
    return [
      {
        title: 'Metric',
        dataIndex: 'name',
        key: 'name',
        width: 140,
        render: t => <span className='font-semibold text-base'>{t}</span>,
      },
      {
        title: 'Granularity',
        dataIndex: 'granularity',
        key: 'granularity',
        width: 130,
        render: g => (
          <Tag
            color={g === 'fine-grained' ? 'magenta' : 'blue'}
            style={{ fontSize: 13, padding: '2px 10px' }}
          >
            {g}
          </Tag>
        ),
      },
      {
        title: 'Image-based',
        dataIndex: 'uses_image',
        key: 'uses_image',
        width: 110,
        render: v => boolTag(v, 'green'),
      },
      {
        title: 'Reference-based',
        dataIndex: 'uses_reference',
        key: 'uses_reference',
        width: 120,
        render: v => boolTag(v, 'orange'),
      },
      {
        title: 'LLM-based',
        dataIndex: 'llm_based',
        key: 'llm_based',
        width: 100,
        render: v => v === null
          ? <span className='text-neutral-400'>N/A</span>
          : boolTag(v, 'purple'),
      },
      {
        title: 'Year',
        dataIndex: 'year',
        key: 'year',
        width: 75,
        sorter: (a, b) => a.year - b.year,
        defaultSortOrder: 'ascend',
      },
      {
        title: 'Venue',
        dataIndex: 'venue',
        key: 'venue',
        width: 110,
        render: v => <Tag color='geekblue' style={{ fontSize: 13, padding: '2px 10px' }}>{v}</Tag>,
      },
      {
        title: 'Paper',
        key: 'paper_url',
        width: 80,
        render: (_, row) => (
          <a
            className='text-blue-600 dark:text-blue-400 text-base'
            href={row.paper_url}
            target='_blank'
            rel='noopener noreferrer'
          >
            Open
          </a>
        ),
      },
    ];
  }, []);

  const modelColumns = useMemo(() => {
    const numCmp = key => (a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;
      return av - bv;
    };
    const numCell = v => (v == null ? <span className='text-neutral-400'>—</span> : v);
    return [
      { title: 'Method', dataIndex: 'method', key: 'method', width: 180, fixed: 'left' },
      { title: 'Backbone', dataIndex: 'backbone', key: 'backbone', width: 230, ellipsis: true },
      {
        title: 'Year',
        dataIndex: 'year',
        key: 'year',
        width: 90,
        sorter: (a, b) => a.year - b.year,
        defaultSortOrder: 'descend',
      },
      {
        title: 'Venue',
        dataIndex: 'venue',
        key: 'venue',
        width: 130,
        render: v => <Tag color='geekblue' style={{ fontSize: 13, padding: '2px 10px' }}>{v}</Tag>,
      },
      {
        title: 'Dataset',
        dataIndex: 'dataset',
        key: 'dataset',
        width: 150,
        filters: DATASETS.map(d => ({ text: d, value: d })),
        filterMultiple: false,
        defaultFilteredValue: ['COCO'],
        onFilter: (value, record) => record.dataset === value,
        render: d => <Tag color='purple' style={{ fontSize: 13, padding: '2px 10px' }}>{d}</Tag>,
      },
      {
        title: 'Fidelity',
        dataIndex: 'Fidelity',
        key: 'Fidelity',
        width: 100,
        render: numCell,
        sorter: numCmp('Fidelity'),
      },
      {
        title: 'Adequacy',
        dataIndex: 'Adequacy',
        key: 'Adequacy',
        width: 100,
        render: numCell,
        sorter: numCmp('Adequacy'),
      },
      {
        title: 'Fluency',
        dataIndex: 'Fluency',
        key: 'Fluency',
        width: 100,
        render: numCell,
        sorter: numCmp('Fluency'),
      },
      {
        title: 'BLEU-4',
        dataIndex: 'BLEU-4',
        key: 'BLEU-4',
        width: 100,
        render: numCell,
        sorter: numCmp('BLEU-4'),
      },
      {
        title: 'METEOR',
        dataIndex: 'METEOR',
        key: 'METEOR',
        width: 100,
        render: numCell,
        sorter: numCmp('METEOR'),
      },
      {
        title: 'ROUGE-L',
        dataIndex: 'ROUGE-L',
        key: 'ROUGE-L',
        width: 110,
        render: numCell,
        sorter: numCmp('ROUGE-L'),
      },
      {
        title: 'CIDEr',
        dataIndex: 'CIDEr',
        key: 'CIDEr',
        width: 100,
        render: numCell,
        sorter: numCmp('CIDEr'),
      },
      {
        title: 'SPICE',
        dataIndex: 'SPICE',
        key: 'SPICE',
        width: 90,
        render: numCell,
        sorter: numCmp('SPICE'),
      },
      {
        title: 'CLIPScore',
        dataIndex: 'CLIPScore',
        key: 'CLIPScore',
        width: 120,
        render: numCell,
        sorter: numCmp('CLIPScore'),
      },
      {
        title: 'Paper',
        key: 'paper_url',
        width: 90,
        render: (_, row) => (
          <a
            className='text-blue-600 dark:text-blue-400'
            href={row.paper_url}
            target='_blank'
            rel='noopener noreferrer'
          >
            Open
          </a>
        ),
      },
    ];
  }, []);

  return (
    <>
      <SiteHeader badge='LEAD' />
      <div className='bg-white dark:bg-neutral-900 border-2 border-gray-200 dark:border-neutral-700 rounded-lg shadow-md dark:shadow-neutral-950/40 p-2 w-full min-w-0 overflow-x-auto'>
        <div className='p-4'>
          <Space className='w-full' direction='vertical' size='middle'>
            <div>
              <p className='mb-2'>Model evaluation</p>
              <p className='text-neutral-500 dark:text-neutral-400 text-sm mb-4'>
                Compare and analyze related work from the two dimensions of metrics and models.
              </p>
              <div className={dimensionPanelClass}>
                <div className={dimensionBadgeClass}>Dimension</div>
                <Segmented
                  className={dimensionSegmentedClass[dimension]}
                  options={DIMENSIONS}
                  value={dimension}
                  onChange={setDimension}
                  block
                />
              </div>
            </div>

            {dimension === 'metric' && (
              <div className={sectionCardClass.metric}>
                <p className='text-neutral-600 dark:text-neutral-300 text-base mb-4'>
                  Survey of common image-captioning evaluation metrics. Click a paper link for the
                  original definition.
                </p>

                {/* Filters */}
                <div className='rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white/70 dark:bg-neutral-900/40 p-3 mb-4'>
                  <Space size='middle' wrap align='start'>
                    <div>
                      <p className='mb-1 text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-400'>
                        GRANULARITY
                      </p>
                      <Select
                        allowClear
                        placeholder='Any'
                        value={granularityFilter}
                        onChange={v => setGranularityFilter(v)}
                        options={GRANULARITY_OPTIONS}
                        style={{ minWidth: 200 }}
                      />
                    </div>
                    <div>
                      <p className='mb-1 text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-400'>
                        IMAGE-BASED
                      </p>
                      <Select
                        allowClear
                        placeholder='Any'
                        value={imageFilter}
                        onChange={v => setImageFilter(v)}
                        options={REF_OPTIONS}
                        style={{ minWidth: 200 }}
                      />
                    </div>
                    <div>
                      <p className='mb-1 text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-400'>
                        REFERENCE-BASED
                      </p>
                      <Select
                        allowClear
                        placeholder='Any'
                        value={refFilter}
                        onChange={v => setRefFilter(v)}
                        options={REF_OPTIONS}
                        style={{ minWidth: 200 }}
                      />
                    </div>
                    <div>
                      <p className='mb-1 text-xs font-semibold tracking-wide text-emerald-700 dark:text-emerald-400'>
                        LLM-BASED
                      </p>
                      <Select
                        allowClear
                        placeholder='Any'
                        value={llmFilter}
                        onChange={v => setLlmFilter(v)}
                        options={LLM_OPTIONS}
                        style={{ minWidth: 200 }}
                      />
                    </div>
                    <div>
                      <p className='mb-1 text-xs font-semibold tracking-wide text-transparent select-none'>
                        .
                      </p>
                      <Button
                        disabled={!filtersActive}
                        onClick={() => {
                          setGranularityFilter(undefined);
                          setImageFilter(undefined);
                          setRefFilter(undefined);
                          setLlmFilter(undefined);
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                    <div className='ml-auto self-end'>
                      <span className='text-sm text-neutral-500 dark:text-neutral-400'>
                        Showing <strong>{filteredMetrics.length}</strong> / {METRICS.length}
                      </span>
                    </div>
                  </Space>
                </div>

                <Table
                  className='dark:[&_.ant-table]:bg-neutral-900'
                  size='small'
                  rowKey='id'
                  columns={metricColumns}
                  dataSource={filteredMetrics}
                  pagination={{ pageSize: 50 }}                  scroll={{ x: 1500 }}
                  locale={{ emptyText: 'No metrics match the current filters.' }}
                />
              </div>
            )}

            {dimension === 'model' && (
              <div className={sectionCardClass.model}>
                <p className='text-neutral-600 dark:text-neutral-300 text-base mb-4'>
                  Reported scores of representative captioning methods. Click the Dataset column
                  header to filter by dataset (Reset = all datasets); click any other header to
                  sort. Numbers are illustrative placeholders.
                </p>

                <Table
                  className='dark:[&_.ant-table]:bg-neutral-900'
                  size='small'
                  rowKey='rowKey'
                  columns={modelColumns}
                  dataSource={flatModels}
                  pagination={{ pageSize: 50 }}                  scroll={{ x: 1500 }}
                  locale={{ emptyText: 'No rows match the current filters.' }}
                />
              </div>
            )}
          </Space>
        </div>
      </div>
      <SiteFooter />
    </>
  );
};

export default EvaluationPage;
