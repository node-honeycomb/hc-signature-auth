'use strict';

const crypto = require('crypto');
const debug = require('debug')('hc-signature-auth');
const stream = require('stream');
const uuid = require('uuid');
const path = require('path');
const os = require('os');
const fs = require('fs');

const MAX_MEMORY_STREAM_LENGTH = 2048;
module.exports = function (req) {
  return new Promise((resolve, reject) => {
    let hash = crypto.createHash('md5');
    const readStream = new stream.Readable({
      read() {},
    });
    let fileWriteStream;
    let fileReadStream;
    let fileTmpPath = path.join(os.tmpdir(), uuid.v4());
    let length = 0;
    function endListener() {
      if (!fileReadStream) {
        readStream.push(null); // push EOF
      }
      req._contentMd5 = hash.digest('base64');
      debug('contentMd5--------------', req._contentMd5);
      Object.assign(req, fileReadStream || readStream);
      resolve(req._contentMd5);
    }
    let memoryPiping = false; // substitute for readable.readableEnded, Node.js v12.9.0
    req.on('end', endListener);
    req.on('data', (chunk) => {
      hash.update(chunk);
      length += chunk.length;
      if (length > MAX_MEMORY_STREAM_LENGTH) {
        if (!fileWriteStream) {
          // pause req stream
          req.pause();
          // remoeve req end listener
          req.removeListener('end', endListener);
          req.on('end', () => {
            fileWriteStream.end();
          });
          readStream.push(null); // push EOF
          // add readStream listener
          readStream.on('end', () => {
            memoryPiping = false;
            fileWriteStream.write(chunk);
            req.resume(); // resum req stream
          });
          readStream.on('error', (err) => {
            readStream.destroy();
            reject(err);
          });
          // create file stream
          fileWriteStream = fs.createWriteStream(fileTmpPath, {highWaterMark: 10});
          fileWriteStream.on('error', (err) => {
            fileWriteStream.destroy();
            reject(err);
          });
          fileWriteStream.on('drain', () => {
            if (!memoryPiping) {
              req.resume();
            }
          });
          fileWriteStream.on('finish', () => {
            fileReadStream = fs.createReadStream(fileTmpPath);
            endListener();
          });
          // pipe
          readStream.pipe(fileWriteStream, {end: false});
          memoryPiping = true;
        } else {
          const ok = fileWriteStream.write(chunk);
          if (!ok) {
            req.pause();
          }
        }
      } else {
        readStream.push(chunk);
      }
    });
  });
};
