import React, { Fragment, useMemo } from 'react';
import {
  buildIndustryMapForest,
  splitPrefixAndBranches,
} from '../utils/industryMapPathTree';

const PILL_BASE =
  'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border whitespace-nowrap';

const LABEL_STYLES = {
  업종: 'bg-wealth-gold/20 text-wealth-gold border-wealth-gold/50',
  섹터: 'bg-blue-500/20 text-blue-300 border-blue-400/40',
  소분류1: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
  소분류2: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
  소분류3: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
  소분류4: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
};

function pillClassName(label) {
  return `${PILL_BASE} ${LABEL_STYLES[label] || 'bg-gray-700/40 text-white border-gray-600'}`;
}

function PathArrow({ className = '' }) {
  return (
    <span className={`text-wealth-muted text-xs shrink-0 ${className}`.trim()}>→</span>
  );
}

function PathPill({ segment }) {
  return (
    <span className={pillClassName(segment.label)} title={segment.label}>
      {segment.name}
    </span>
  );
}

function PathRow({ segments, className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`.trim()}>
      {segments.map((seg, idx) => (
        <Fragment key={`${seg.label}-${seg.name}-${idx}`}>
          {idx > 0 && <PathArrow />}
          <PathPill segment={seg} />
        </Fragment>
      ))}
    </div>
  );
}

function TreeNodeView({ node }) {
  const { prefix, branches } = splitPrefixAndBranches(node);

  if (branches.length === 0) {
    return <PathRow segments={prefix} />;
  }

  return (
    <div className="flex items-start gap-2 min-w-0">
      <PathRow segments={prefix} className="self-center shrink-0" />
      <PathArrow className="self-center" />
      <div className="flex flex-col gap-1.5 border-l border-gray-700/80 pl-3 min-w-0">
        {branches.map((branch) => (
          <TreeNodeView key={branch.key} node={branch} />
        ))}
      </div>
    </div>
  );
}

function IndustryMapPathTree({ paths }) {
  const forest = useMemo(() => buildIndustryMapForest(paths), [paths]);

  if (forest.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex flex-col gap-3">
        {forest.map((root) => (
          <TreeNodeView key={root.key} node={root} />
        ))}
      </div>
    </div>
  );
}

export default IndustryMapPathTree;
