'use strict';

const crypto = require('crypto');
const debug = require('debug')('hc-signature-auth');
const stream = require('stream');
const fs = require('fs');
const os = require('os');
const uuid = require('uuid');
const path = require('path');

module.exports = function (req) {
  return new Promise((resolve, reject) => {
    let hash = crypto.createHash('md5');
    const duplexStream = new stream.Duplex({
      construct(callback) {
        this.MAX_MEMOREY_CACHE_SIZE = 128 * 1024;
        this.fileHander = null;
        this.fileReadHander = null;
        this.fileWriteHander = null;
        this.memoryBuffer = Buffer.alloc(0);
        callback();
      },
      write(chunk, encoding, callback) {
        hash.update(chunk, encoding);
        if (this.memoryBuffer.length + chunk.length > this.MAX_MEMOREY_CACHE_SIZE) {
          if (!this.fileHander) {
            this.fileHander = path.join(os.tmpdir(), uuid.v4());
            this.fileWriteHander = fs.createWriteStream(this.fileHander);
            this.fileWriteHander.on('error', reject);
          }
          this.fileWriteHander.write(chunk, encoding, callback);
        } else {
          this.memoryBuffer = Buffer.concat([this.memoryBuffer, chunk]);
          callback();
        }
      },
      final(callback) {
        if (this.fileWriteHander) {
          this.fileWriteHander.end(callback);
        } else {
          callback();
        }
      },
      read(n) {
        const chunk = this.memoryBuffer.slice(0, n);
        this.memoryBuffer = this.memoryBuffer.slice(chunk.length, this.memoryBuffer.length);
        if (chunk.length !== 0) {
          this.push(chunk);
        } else {
          if (this.fileHander) {
            if (!this.fileReadHander) {
              this.fileReadHander = fs.createReadStream(this.fileHander);
              this.fileReadHander.on('error', reject);
            }
            const r = () => {
              const fChunk = this.fileReadHander.read(n);
              if (fChunk === null) {
                if (this.fileReadHander._readableState.ended === true) {
                  this.push(null);
                } else {
                  setImmediate(r, 0);
                }
              } else {
                this.push(fChunk);
              }
            };
            r();
          } else {
            this.push(null);
            // this.push(null); // push EOF
          }
        }
      }
    });
    req.pipe(duplexStream);
    duplexStream.on('finish', () => {
      req._contentMd5 = hash.digest('base64');
      debug('contentMd5--------------', req._contentMd5);
      setImmediate(() => {
        Object.assign(req, duplexStream);
        resolve(req._contentMd5);
      });
    });
    duplexStream.on('end', () => {
      if (duplexStream.fileHander) {
        fs.unlink(duplexStream.fileHander, (err) => {
          if (err) {
            debug(err);
          }
        });
      }
    });
  });
};
