/** @typedef {{ label: string, name: string }} PathSegment */
/** @typedef {{ label: string, name: string, key: string, children: TreeNode[] }} TreeNode */

/**
 * @param {PathSegment} seg
 * @returns {string}
 */
function segmentKey(seg) {
  return `${seg.label}:${seg.name}`;
}

/**
 * @param {TreeNode[]} level
 * @param {PathSegment} seg
 * @returns {TreeNode}
 */
function findOrCreateNode(level, seg) {
  const key = segmentKey(seg);
  let node = level.find((n) => n.key === key);
  if (!node) {
    node = { label: seg.label, name: seg.name, key, children: [] };
    level.push(node);
  }
  return node;
}

/**
 * API paths → trie forest (업종 루트별 분리)
 * @param {{ segments?: PathSegment[] }[]} paths
 * @returns {TreeNode[]}
 */
export function buildIndustryMapForest(paths) {
  /** @type {TreeNode[]} */
  const roots = [];

  for (const path of paths || []) {
    const segments = path.segments || [];
    if (segments.length === 0) continue;

    /** @type {TreeNode[]} */
    let level = roots;
    for (const seg of segments) {
      const node = findOrCreateNode(level, seg);
      level = node.children;
    }
  }

  return roots;
}

/**
 * 선형 prefix와 분기 branches로 분리
 * @param {TreeNode} node
 * @returns {{ prefix: PathSegment[], branches: TreeNode[] }}
 */
export function splitPrefixAndBranches(node) {
  /** @type {PathSegment[]} */
  const prefix = [{ label: node.label, name: node.name }];
  let current = node;

  while (current.children.length === 1) {
    current = current.children[0];
    prefix.push({ label: current.label, name: current.name });
  }

  return { prefix, branches: current.children };
}
