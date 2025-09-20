const ACTIVE_CLASS = 'animate-border';
const ACTIVE_DURATION = 2000;
const applied = new WeakSet();

export function runBorderAnimation(node) {
  if (!node || applied.has(node)) return;
  node.classList.add(ACTIVE_CLASS);
  applied.add(node);
  setTimeout(() => {
    node.classList.remove(ACTIVE_CLASS);
  }, ACTIVE_DURATION);
}
