'use strict';

// signature structure
// `<protocol> <accessKeyId>:<signature>`

exports.parseSignatureStructure = function (signature) {
  // const result = {
  //   protocol: '',
  //   accessKeyId: '',
  //   signature: ''
  // };
  if (typeof signature !== 'string') {
    const error = new Error('[hc-signature-auth] signature structure error:\n signature should be a string.');
    throw error;
  }
  const protocolSplits = signature.split(' ');
  if (!protocolSplits[0] || !protocolSplits[1]) {
    const error = new Error('[hc-signature-auth] signature structure error:\n signature needed: `<protocol> <accessKeyId>:<signature>`, got: `' + signature + '`');
    throw error;
  }

  const signatureSplits = protocolSplits[1].split(':');

  return {
    protocol: protocolSplits[0],
    accessKeyId: signatureSplits[0],
    signature: signatureSplits[1]
  };
};

exports.errorWrapper = function (message) {
  const err = new Error(message);
  err.code = 'HC_SIGNATURE_AUTH_ERROR';

  return err;
};

