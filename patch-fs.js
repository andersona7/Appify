const fs = require('fs');
const path = require('path');

// Auto-propagate this patch to all child worker processes spawned by Next.js/Webpack
const patchPath = path.resolve(__dirname, 'patch-fs.js');
if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes('patch-fs.js')) {
  process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ` -r "${patchPath}"`;
}

// Systems-level monkeypatch to resolve sandbox filesystem readlink bugs on Windows / exFAT
const originalReadlink = fs.readlink;
fs.readlink = function (targetPath, options, callback) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? {} : options;
  
  try {
    const stats = fs.lstatSync(targetPath);
    if (!stats.isSymbolicLink()) {
      const err = new Error(`EINVAL: invalid argument, readlink '${targetPath}'`);
      err.code = 'EINVAL';
      if (cb) {
        cb(err);
        return;
      }
      throw err;
    }
  } catch (e) {
    if (e.code === 'EINVAL' || e.code === 'EISDIR') {
      const err = new Error(`EINVAL: invalid argument, readlink '${targetPath}'`);
      err.code = 'EINVAL';
      if (cb) {
        cb(err);
        return;
      }
      throw err;
    }
  }
  return originalReadlink(targetPath, opts, cb);
};

const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (targetPath, options) {
  try {
    const stats = fs.lstatSync(targetPath);
    if (!stats.isSymbolicLink()) {
      const err = new Error(`EINVAL: invalid argument, readlink '${targetPath}'`);
      err.code = 'EINVAL';
      throw err;
    }
  } catch (e) {
    if (e.code === 'EINVAL' || e.code === 'EISDIR') {
      const err = new Error(`EINVAL: invalid argument, readlink '${targetPath}'`);
      err.code = 'EINVAL';
      throw err;
    }
  }
  return originalReadlinkSync.call(fs, targetPath, options);
};

console.log(`[FS Monkeypatch] Preloaded successfully in PID ${process.pid}`);
