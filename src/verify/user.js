'use strict';

const crypto = require('crypto');
const debug = require('debug')('hc-signature-auth');

module.exports = userVerify;
userVerify.defaultHeader = 'authorization';

/**
 * @param {http.incomingMessage} req
 * @param {String} signatureHeader
 * @param {Promise} getAccessSecret
 * @param {Object} log
 * @return {Promise} isValid
 */
function userVerify(req, signatureMeta, accessSecretMeta, log) {
  let headers   = req.headers;
  let date      = headers.date;
  let userSign = signatureMeta.signature;
  let accessKeySecret = accessSecretMeta.accessKeySecret ? accessSecretMeta.accessKeySecret : accessSecretMeta;
  let method = req.method;
  let url = req.originalUrl || req.url;
  let accept = headers.accept;
  let contentType = headers['content-type'];
  let stringToSign;

  if (['POST', 'PUT', 'PATCH'].indexOf(method) >= 0) {
    let contentMd5 = req._contentMd5;
    stringToSign = `${method}\n${accept}\n${contentMd5}\n${contentType}\n${date}\n${url}`;
  } else {
    // 没有content也需要用\n补齐
    stringToSign = `${method}\n${accept}\n\n${contentType}\n${date}\n${url}`;
  }
  let realSign = crypto.createHmac('sha1', accessKeySecret).update(stringToSign, 'utf8').digest('base64');

  if (userSign !== realSign) {
    debug('server side to sign string:', stringToSign);
    let msg = `check_sign_error, signstr: ${stringToSign}`;
    let err = new Error(msg);
    log.error('toSignStr', stringToSign);
    debug(msg + `client_sign: ${signatureMeta.signature}, server_sign: ${realSign}, accessKeyId: ${signatureMeta.accessKeyId}`);
    log.error(msg + `client_sign: ${signatureMeta.signature}, server_sign: ${realSign}, accessKeyId: ${signatureMeta.accessKeyId}`);
    err.status = 401;
    err.code = 'check_sign_error';
    err.message = msg;
    throw err;
  }

  if (accessSecretMeta.tenantCode) {
    req.headers['x-access-tenant'] = accessSecretMeta.tenantCode;
  }
}
