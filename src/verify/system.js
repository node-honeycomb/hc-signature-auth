'use strict';

const crypto = require('crypto');
const debug = require('debug')('hc-signature-auth');

module.exports = systemVerify;
systemVerify.defaultHeader = 'signature';

/**
 * @param {http.incomingMessage} req
 * @param {String} signatureHeader
 * @param {Promise} getAccessSecret
 * @param {Object} log
 * @return {Promise} isValid
 */
function systemVerify(req, signatureMeta, accessSecretMeta, log) {
  let url = decodeURIComponent(req.originalUrl || req.url);
  let headers = req.headers;
  let date = headers.date;
  let method = req.method;
  let rawStr;

  if (['POST', 'PUT', 'PATCH'].indexOf(method) >= 0) {
    let contentMd5 = req._contentMd5;
    rawStr = `${method}\n${url}\n${date}\n${contentMd5}`;
  } else {
    rawStr = `${method}\n${url}\n${date}`;
  }
  let userSign = signatureMeta.signature;
  let accessKeySecret = accessSecretMeta.accessKeySecret ? accessSecretMeta.accessKeySecret : accessSecretMeta;
  let realSign = crypto.createHmac('sha1', accessKeySecret).update(rawStr, 'utf8').digest('base64');
  if (userSign !== realSign) {
    let msg = `check_sign_error signstr: ${rawStr}`;
    let err = new Error(msg);
    debug(msg + `client_sign: ${signatureMeta.signature}, server_sign: ${realSign}, accessKeyId: ${signatureMeta.accessKeyId}`);
    log.error(msg + `client_sign: ${signatureMeta.signature}, server_sign: ${realSign}, accessKeyId: ${signatureMeta.accessKeyId}`);
    err.status = 401;
    throw err;
  }
  // 标记系统间调用
  req._SYSTEM_CALL_ = true;

  if (accessSecretMeta.tenantCode) {
    req.headers['x-access-tenant'] = accessSecretMeta.tenantCode;
  }
}
