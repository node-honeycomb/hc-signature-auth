'use strict';

const crypto = require('crypto');
const debug = require('debug')('hc-signature-auth');
const stream = require('stream');

module.exports = function (req) {
  return new Promise((resolve, reject) => {
    let hash = crypto.createHash('md5');
    const chunks = [];
    const transform = new stream.Transform({
      transform: function (data, encoding, callback) {
        hash.update(data, encoding);
        chunks.push(data);
        // this.push(data); // this will cause stream pipe blocked.
        callback(null);
        req.resume();
      }
    });
    req.pipe(transform);
    req.on('end', function () {
      req._contentMd5 = hash.digest('base64');
      debug('contentMd5--------------', req._contentMd5);
      transform.unshift(Buffer.concat(chunks));
      Object.assign(req, transform);

      resolve(req._contentMd5);
    });
  });
};
