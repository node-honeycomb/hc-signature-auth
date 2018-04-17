'use strict';

// const debug = require('debug')('hc-signature-auth');

module.exports = function (signatures) {
  if (!signatures) {
    throw `[hc-signature-auth]: config.signatures should be supplied in enum mode, got ${signatures}`;
  }
  if (!signatures.length) {
    throw '[hc-signature-auth]: config.signatures should be an array, got ' + JSON.stringify(signatures);
  }
  const map = {};
  signatures.forEach(s => {
    if (!s.accessKeyId || !s.accessKeySecret) {
      throw '[hc-signature-auth]: config.signatures[i] should have key accessKeyId and accessKeySecret, got ' + JSON.stringify(s);
    }
    map[s.accessKeyId] = s.accessKeySecret;
  });
  return function (customerAccessKeyId) {
    if (map[customerAccessKeyId]) {
      return Promise.resolve(map[customerAccessKeyId]);
    } else {
      return Promise.reject({
        code: 'ACCESS_KEY_ID_NOT_EXIST',
        message: 'accessKeyId `' + customerAccessKeyId + '` is not exist.'
      });
    }
  };
};
