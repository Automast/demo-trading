// merge.js
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Built-in directories to ignore
const DEFAULT_IGNORE_DIR = new Set(['node_modules', '.next', 'public']);
// Only include these extensions
const ALLOWED_EXT = new Set(['.js', '.html', '.env', '.css', '.ts', '.tsx']);

async function collectFiles(dir, ignoreFiles, ignoreDirs) {
  let results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (let entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // skip any directory in the ignoreDirs set
      if (ignoreDirs.has(entry.name)) continue;
      results = results.concat(await collectFiles(fullPath, ignoreFiles, ignoreDirs));

    } else {
      const ext = path.extname(entry.name).toLowerCase();
      // skip unwanted extensions or explicitly ignored filenames
      if (ALLOWED_EXT.has(ext) && !ignoreFiles.has(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

(async () => {
  try {
    // 1) Ask about files to ignore
    const ansFiles = (await askQuestion('Ignore file names? (y/n): '))
      .trim()
      .toLowerCase();

    const ignoreFiles = new Set();
    if (ansFiles === 'y' || ansFiles === 'yes') {
      const list = await askQuestion(
        'Enter file names to ignore, separated by commas (e.g. dhkm.js, djksm.js): '
      );
      list
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0)
        .forEach(name => ignoreFiles.add(name));
      console.log(`Ignoring files: ${[...ignoreFiles].join(', ')}`);
    }

    // 2) Ask about folders to ignore
    const ansDirs = (await askQuestion('Ignore folder names? (y/n): '))
      .trim()
      .toLowerCase();

    // merge user choices with the defaults
    const ignoreDirs = new Set(DEFAULT_IGNORE_DIR);
    if (ansDirs === 'y' || ansDirs === 'yes') {
      const list = await askQuestion(
        'Enter folder names to ignore, separated by commas (e.g. build, dist): '
      );
      list
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0)
        .forEach(name => ignoreDirs.add(name));
    }
    console.log(`Ignoring folders: ${[...ignoreDirs].join(', ')}`);

    // Determine base directory
    const baseDir = process.argv[2]
      ? path.resolve(process.argv[2])
      : __dirname;
    console.log(`Scanning folder: ${baseDir}`);

    // Collect and filter files
    const files = await collectFiles(baseDir, ignoreFiles, ignoreDirs);

    if (files.length === 0) {
      console.log('No files to merge.');
      process.exit(0);
    }

    // Read and merge contents
    let merged = '';
    for (let filePath of files) {
      const content = await fs.readFile(filePath, 'utf8');
      const rel = path
        .relative(baseDir, filePath)
        .split(path.sep)
        .join('/');
      merged += `${rel}\n${content}\n\n`;
    }

    // Write out merged.txt
    const outPath = path.join(baseDir, 'merged.txt');
    await fs.writeFile(outPath, merged, 'utf8');
    console.log(`✅ Merged ${files.length} files into ${outPath}`);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
