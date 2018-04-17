'use strict';

// const debug = require('debug')('hc-signature-auth');
const jwt = require('jsonwebtoken');

module.exports = jwtVerify;
jwtVerify.defaultHeader = 'authorization';

/**
 * @param {http.incomingMessage} req
 * @param {String} signatureHeader
 * @param {Promise} getAccessSecret
 * @param {Object} log
 * @return {Promise} isValid
 */
function jwtVerify(req, signatureMeta, accessSecretMeta, log) {
  let accessKeySecret = accessSecretMeta.accessKeySecret ? accessSecretMeta.accessKeySecret : accessSecretMeta;
  let signature = signatureMeta.signature;

  return new Promise((resolve, reject) => {
    jwt.verify(signature, accessKeySecret, {
      algorithms: accessKeySecret.algorithms || ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512', 'HS256', 'HS384', 'HS512', 'none']
    }, function (err, decoded) {
      if (err) {
        if (!err.code && err.name) {
          err.code = 'HC_SIGNATURE_' + err.name.toString().toUpperCase();
        }
        err.status = 401;
        return reject(err);
      }

      req._jwtVerified = true;
      req.user = decoded;
      resolve(decoded);
    });
  });
}
