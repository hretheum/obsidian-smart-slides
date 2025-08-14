import fs from 'fs';

const LIMITS = {
  main: 300 * 1024,
  total: 450 * 1024,
};

function format(bytes) {
  return `${(bytes / 1024).toFixed(1)}KB`;
}

function getFileSize(path) {
  try {
    const stat = fs.statSync(path);
    return stat.size;
  } catch {
    return 0;
  }
}

function main() {
  const mainSize = getFileSize('main.js');
  const styleSize = getFileSize('styles.css');
  const total = mainSize + styleSize;

  const errors = [];
  if (mainSize > LIMITS.main) {
    errors.push(`Main bundle too large: ${format(mainSize)} > ${format(LIMITS.main)}`);
  }
  if (total > LIMITS.total) {
    errors.push(`Total bundle too large: ${format(total)} > ${format(LIMITS.total)}`);
  }

  if (errors.length) {
    console.error(errors.join('\n'));
    process.exit(1);
  }
  console.log(`Bundle sizes OK: main=${format(mainSize)}, total=${format(total)}`);
}

main();
