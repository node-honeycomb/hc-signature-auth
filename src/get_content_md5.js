'use strict';
const crypto = require('crypto');
const debug = require('debug')('hc-signature-auth');
const stream = require('stream');
const fs = require('fs');
const os = require('os');
const {nanoid} = require('nanoid');
const path = require('path');
class LinearDuplex extends stream.Duplex {
 constructor(dataLinstener) {
  super();
  if (dataLinstener && typeof dataLinstener !== 'function') {
   throw new Error('invaild argument dataLinstener, must be a function');
  }
  this.dataLinstener = dataLinstener;
  // 修改此处决定内存缓存数据的最大值,超过部分将存储到磁盘
  this.MAX_MEMOREY_CACHE_SIZE = 128 * 1024;
  this.fileHander = null;
  this.fileReadHander = null;
  this.fileWriteHander = null;
  this.memoryBuffer = Buffer.alloc(0);
 }
 _write(chunk, encoding, callback) {
  if (this.dataLinstener) {
   this.dataLinstener(chunk, encoding);
  }
  if (this.memoryBuffer.length + chunk.length > this.MAX_MEMOREY_CACHE_SIZE) {
   if (!this.fileHander) {
    this.fileHander = path.join(os.tmpdir(), nanoid());
    this.fileWriteHander = fs.createWriteStream(this.fileHander);
    this.fileWriteHander.on('error', (e) => {
     this.emit('error', e);
    });
   }
   this.fileWriteHander.write(chunk, encoding, callback);
  } else {
   this.memoryBuffer = Buffer.concat([this.memoryBuffer, chunk]);
   callback();
  }
 }
 _final(callback) {
  if (this.fileWriteHander) {
   debug('file stream catched to disk:', this.fileHander);
   this.fileWriteHander.end(callback);
  } else {
   callback();
  }
 }
 _read(n) {
  const chunk = this.memoryBuffer.slice(0, n);
  this.memoryBuffer = this.memoryBuffer.slice(chunk.length, this.memoryBuffer.length);
  if (chunk.length !== 0) {
   this.push(chunk);
  } else if (this.fileHander) {
   if (!this.fileReadHander) {
    this.fileReadHander = fs.createReadStream(this.fileHander);
    this.fileReadHander.on('error', (e) => {
     this.emit('error', e);
    });
   }
   const readFun = () => {
    const fChunk = this.fileReadHander.read(n);
    if (fChunk === null) {
     if (this.fileReadHander._readableState.ended === true) {
      this.push(null);
     } else {
      setImmediate(readFun, 0);
     }
    } else {
     this.push(fChunk);
    }
   };
   readFun();
  } else {
   this.push(null);
  }
 }
 _destroy(error, callback) {
  if (error) {
   debug('destory linearDuplex error', error);
  }
  if (this.fileHander) {
   fs.unlink(this.fileHander, callback);
  }
 }
}
module.exports = function (req) {
 return new Promise((resolve, reject) => {
  const hash = crypto.createHash('md5');
  const linearDuplex = new LinearDuplex(hash.update.bind(hash));
  req.pipe(linearDuplex);
  req.on('error', reject);
  linearDuplex.on('error', reject);
  linearDuplex.on('finish', () => {
   req._contentMd5 = hash.digest('base64');
   debug('contentMd5--------------', req._contentMd5);
   setImmediate(() => {
    Object.assign(req, linearDuplex);
    req._read = linearDuplex._read;
    const pototypeDestory = req._destroy.bind(req);
    req._destroy = (...args) => {
      linearDuplex._destroy(...args);
      pototypeDestory(...args);
    }
    resolve(req._contentMd5);
   });
  });
 });
};
