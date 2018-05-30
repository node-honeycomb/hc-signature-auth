'use strict';

const debug = require('debug')('hc-signature-auth');
const util = require('../util');

module.exports = function (signatures, globalConfig) {
  if (!signatures) {
    throw util.errorWrapper(`[hc-signature-auth]: config.signatures should be supplied in enum mode, got ${signatures}`);
  }
  if (!signatures.length) {
    throw util.errorWrapper('[hc-signature-auth]: config.signatures should be an array, got ' + JSON.stringify(signatures));
  }
  const map = {};
  signatures.forEach(s => {
    const globalKeySecret = globalConfig && (globalConfig.systemToken || globalConfig.accessKeySecret);
    if (!s.accessKeySecret && globalKeySecret) {
      s.accessKeySecret = globalKeySecret;
      debug('[hc-signature-auth]: enum signatures config accessKeySecret using app.config.systemToken.')
    }
    if (!s.accessKeyId || !s.accessKeySecret) {
      throw util.errorWrapper('[hc-signature-auth]: config.signatures[i] should have key accessKeyId and accessKeySecret, got ' + JSON.stringify(s));
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
