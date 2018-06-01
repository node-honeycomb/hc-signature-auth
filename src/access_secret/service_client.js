'use strict';

const ServiceClient = require('hc-service-client').ServiceClient;
const debug = require('debug')('hc-signature-auth');
const util = require('../util');
const _ = require('lodash');

function defaultGenParam(accessKeyId) {
  return {
    accessKeyId
  };
}

function defaultGetAccessSecret(data) {
  return data.accessKeySecret;
}

module.exports = function (signatureConfig, globalConfig) {
  signatureConfig = signatureConfig ? signatureConfig : {};

  // get endpoint
  let endpoint = _.get(signatureConfig, 'serviceClient.endpoint');
  if (!endpoint) {
    const defaultEndpoint = _.get(globalConfig, 'services.system.endpoint') || _.get(globalConfig, 'services.system');

    if (typeof defaultEndpoint !== 'string') {
      throw util.errorWrapper('[hc-signature-auth]: need an system endpoint, you can config it in signatureConfig.serviceClient.endpoint or globalConfig.services.system or globalConfig.services.system.endpoint.');
    } else {
      endpoint = defaultEndpoint + '/system/api/authinfo';
    }
  }
  // get accessKeyId
  const accessKeyId = _.get(signatureConfig, 'serviceClient.accessKeyId', 'hc-service-client');
  // get accessKeySecret
  const globalKeySecret = globalConfig && (globalConfig.systemToken || globalConfig.accessKeySecret);
  let accessKeySecret = _.get(signatureConfig, 'serviceClient.accessKeySecret');
  if (!accessKeySecret && globalKeySecret) {
    accessKeySecret = globalKeySecret;
    debug('[hc-signature-auth]: serviceClient config accessKeySecret using app.config.systemToken.');
  }
  if (!accessKeySecret) {
    throw util.errorWrapper('[hc-signature-auth]: need an accessKeySecret, you can config it in signatureConfig.serviceClient.accessKeySecret or globalConfig.systemToken or globalConfig.accessKeySecret.');
  }

  // make default serviceClient config.
  const serviceClientConfig = {
    endpoint,
    accessKeyId,
    accessKeySecret
  };

  // get method
  let method = _.get(signatureConfig, 'method');
  if (!method) {
    method = 'GET';
    debug('using default signatureConfig.method ' + method);
  }

  method = method.toLowerCase();
  if (['get', 'post', 'delete', 'put'].indexOf(method) === -1) {
    throw util.errorWrapper('[hc-signature-auth]: signatureConfig.method is invalid, got', method);
  }

  // get genParam
  let genParam = signatureConfig.genParam;
  if (!genParam) {
    genParam = defaultGenParam;
    debug('using default signatureConfig.genParam', defaultGenParam);
  }

  // get getAccessSecret
  let getAccessSecret = signatureConfig.getAccessSecret;
  if (!getAccessSecret) {
    getAccessSecret = defaultGetAccessSecret;
    debug('using default signatureConfig.getAccessSecret', defaultGetAccessSecret);
  }

  // generate client
  const client = new ServiceClient(Object.assign(serviceClientConfig, signatureConfig.serviceClient));

  // return accessKeySecret generator
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
