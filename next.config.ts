import type { NextConfig } from "next";
import fs from "fs";

// Systems-level monkeypatch to resolve sandbox filesystem readlink bugs
const originalReadlink = fs.readlink;
fs.readlink = function (path: any, options: any, callback: any) {
  const cb = typeof options === 'function' ? options : callback;
  const opts = typeof options === 'function' ? {} : options;
  
  try {
    const stats = fs.lstatSync(path);
    if (!stats.isSymbolicLink()) {
      const err = new Error(`EINVAL: invalid argument, readlink '${path}'`) as any;
      err.code = 'EINVAL';
      if (cb) {
        cb(err);
        return;
      }
      throw err;
    }
  } catch (e) {
    if ((e as any).code === 'EINVAL') {
      if (cb) {
        cb(e);
        return;
      }
      throw e;
    }
  }
  return (originalReadlink as any)(path, opts, cb);
} as any;

const originalReadlinkSync = fs.readlinkSync;
fs.readlinkSync = function (path: any, options: any) {
  try {
    const stats = fs.lstatSync(path);
    if (!stats.isSymbolicLink()) {
      const err = new Error(`EINVAL: invalid argument, readlink '${path}'`) as any;
      err.code = 'EINVAL';
      throw err;
    }
  } catch (e) {
    if ((e as any).code === 'EINVAL') throw e;
  }
  return originalReadlinkSync.call(fs, path, options);
} as any;

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.symlinks = false;
    config.cache = false;
    return config;
  },
};

export default nextConfig;
