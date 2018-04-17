'use strict';

const config = require('./config');

module.exports = {
  singleSignature: [
    {
      accessKeyId: 'aaa',
      accessKeySecret: 'bbb'
    }
  ],
  multipleSignatures: [
    {
      accessKeyId: 'aaa',
      accessKeySecret: 'bbb'
    },
    {
      accessKeyId: 'ccc',
      accessKeySecret: 'ddd'
    }
  ],
  system: {
    endpoint: config.systemEndpoint,
    accessKeySecret: config.accessKeySecret,
    userInfo: {
      accessKeyId: config.customerAccessKeyId,
      accessKeySecret: config.customerAccessKeySecret
    }
  }
};
