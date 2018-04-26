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

module.exports = function (signatureConfig, globalConfig) {
  if (!signatureConfig) {
    throw '[hc-signature-auth]: signatureConfig should be supplied in serviceClient mode, got', signatureConfig;
  }

  const globalKeySecret = globalConfig && (globalConfig.systemToken || globalConfig.accessKeySecret);
  const serviceClientConfig = signatureConfig.serviceClient;
  if (!serviceClientConfig) {
    throw '[hc-signature-auth]: signatureConfig.serviceClient should be supplied in serviceClient mode, got', serviceClientConfig;
  }
  if (!serviceClientConfig.accessKeySecret) {
    serviceClientConfig.accessKeySecret = globalKeySecret;
    debug('[hc-signature-auth]: serviceClient config accessKeySecret using app.config.systemToken.')
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
  const client = new ServiceClient(serviceClientConfig);

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
