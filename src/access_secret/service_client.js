'use strict';

const ServiceClient = require('hc-service-client').ServiceClient;
const debug = require('debug')('hc-signature-auth');

function defaultGenParam(accessKeyId) {
  return {
    accessKeyId
  };
}

function defaultGetAccessSecret(data) {
  return data.accessKeySecret;
}

module.exports = function (signatureConfig) {
  if (!signatureConfig) {
    throw '[hc-signature-auth]: signatureConfig should be supplied in serviceClient mode, got', signatureConfig;
  }

  const serviceClient = signatureConfig.serviceClient;
  if (!serviceClient) {
    throw '[hc-signature-auth]: signatureConfig.serviceClient should be supplied in serviceClient mode, got', serviceClient;
  }
  let method = signatureConfig.method;
  if (!method) {
    method = 'GET';
    debug('using default signatureConfig.method ' + method);
  }
  method = method.toLowerCase();
  if (['get', 'post', 'delete', 'put'].indexOf(method) === -1) {
    throw '[hc-signature-auth]: signatureConfig.method is invalid, got', method;
  }
  let genParam = signatureConfig.genParam;
  if (!genParam) {
    genParam = defaultGenParam;
    debug('using default signatureConfig.genParam', defaultGenParam);
  }
  let getAccessSecret = signatureConfig.getAccessSecret;
  if (!getAccessSecret) {
    getAccessSecret = defaultGetAccessSecret;
    debug('using default signatureConfig.getAccessSecret', defaultGetAccessSecret);
  }
  const client = new ServiceClient(serviceClient);

  return function (customerAccessKeyId) {
    return new Promise(function (resolve, reject) {
      client[method]('', genParam(customerAccessKeyId), function (err, data) {
        if (err) {
          return reject(err);
        }

        if (!data) {
          return reject({
            code: 'ERR_NO_DATA',
            message: 'no data received.'
          });
        }

        resolve(getAccessSecret(data));
      });
    });
  };
};
