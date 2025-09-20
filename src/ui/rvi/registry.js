import { render as renderKeypoints } from './templates/keypoints.js';
import { render as renderComparison } from './templates/comparison.js';
import { render as renderSteps } from './templates/steps.js';
import { render as renderChecklist } from './templates/checklist.js';
import { render as renderTimeline } from './templates/timeline.js';
import { render as renderTradeoffs } from './templates/tradeoffs.js';
import { render as renderCauseEffect } from './templates/cause-effect.js';
import { render as renderMetrics } from './templates/metrics.js';
import { render as renderFallback } from './templates/fallback.js';

const registry = new Map([
  ['keypoints', renderKeypoints],
  ['comparison', renderComparison],
  ['steps', renderSteps],
  ['checklist', renderChecklist],
  ['timeline', renderTimeline],
  ['tradeoffs', renderTradeoffs],
  ['cause-effect', renderCauseEffect],
  ['metrics', renderMetrics],
  ['fallback', renderFallback]
]);

export function getRenderer(type) {
  return registry.get(type) || renderFallback;
}

export function isSupportedType(type) {
  return registry.has(type);
}
