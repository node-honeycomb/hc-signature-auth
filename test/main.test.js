'use strict';

const signatureAuth = require('../');
const httpServer = require('./server/http_server');
const urllib = require('urllib');
const assert = require('assert');
const debug = require('debug')('hc-signature-auth');
const consts = require('./consts');
const ServiceClient = require('hc-service-client').ServiceClient;
const formstream = require('formstream');
const jwt = require('jsonwebtoken');

describe('开始测试', function () {
  describe('systemCall | enum signatures', function () {
    let httpInstance = null;
    let httpPort = null;
    before((done) => {
      httpInstance = httpServer.start(signatureAuth({
        config: {},
        getLog: () => {
          return {
            debug: console.log.bind(console),
            warn: console.log.bind(console),
            error: console.log.bind(console)
          };
        }
      }, {
          authType: 'systemCall',
          header: 'signature',
          signatures: consts.singleSignature
        }), function () {
          httpPort = httpInstance.address().port;
          done();
        });
    });

    it('GET', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.singleSignature[0].accessKeyId,
        accessKeySecret: consts.singleSignature[0].accessKeySecret,
      }).get('/urllib', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '/urllib');
        done();
      });
    });

    it('POST + querystring', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.singleSignature[0].accessKeyId,
        accessKeySecret: consts.singleSignature[0].accessKeySecret,
      }).post('/urllib?a=b&c=d', {
        foo: 'bar'
      }, {
          dataType: false
        }, function (err, data) {
          assert(err.toString() === '/urllib?a=b&c=d');
          done();
        });
    });

    it('POST upload file', function (done) {
      const form = formstream();
      const buffer = require('fs').readFileSync('./test/main.test.js');
      form.buffer('file', buffer, 'main.test.js');
      form.field('foo', 'bar');
      const headers = form.headers();

      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.singleSignature[0].accessKeyId,
        accessKeySecret: consts.singleSignature[0].accessKeySecret,
      }).post('/upload?a=b&c=d', '', {
        dataType: false,
        headers,
        stream: form
      }, function (err, data) {
        // debug('err, data', err.toString(), data);
        assert(err.toString() === 'main.test.js');
        done();
      });
    });

    it('POST + no signature header', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.singleSignature[0].accessKeyId,
        accessKeySecret: consts.singleSignature[0].accessKeySecret,
        signatureHeader: 'not-found'
      }).post('/urllib?a=b&c=d', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '{"error":"SIGNATURE_HEADER_NOT_FOUND","message":"signature header `signature` not found"}');
        done();
      });
    });

    it('POST + error signature header', function (done) {
      urllib.request('http://localhost:' + httpPort + '/urllib?a=b&c=d', {
        method: 'POST',
        dataType: false,
        data: {
          foo: 'bar'
        },
        headers: {
          signature: 'errorSignatureStructure',
          date: new Date().toUTCString()
        }
      }, function (err, data) {
        const result = JSON.parse(data.toString());
        assert(result.code === 'SIGNATURE_HEADER_STRUCTURE_ERROR');
        done();
      });
    });

    after(() => {
      httpInstance.close();
    });
  });

  describe('userAuth | enum signatures', function () {
    let httpInstance = null;
    let httpPort = null;
    before((done) => {
      httpInstance = httpServer.start(signatureAuth({
        config: {},
        getLog: () => {
          return {
            debug: console.log.bind(console),
            warn: console.log.bind(console),
            error: console.log.bind(console)
          };
        }
      }, {
          authType: 'userAuth',
          header: 'authorization',
          signatures: consts.multipleSignatures
        }), function () {
          httpPort = httpInstance.address().port;
          done();
        });
    });

    it('DELETE', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.multipleSignatures[0].accessKeyId,
        accessKeySecret: consts.multipleSignatures[0].accessKeySecret,
        signatureApproach: 'userAuth'
      }).delete('/urllib', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '/urllib');
        done();
      });
    });

    it('PUT + querystring', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.multipleSignatures[1].accessKeyId,
        accessKeySecret: consts.multipleSignatures[1].accessKeySecret,
        signatureApproach: 'userAuth'
      }).put('/urllib?a=b&c=d', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '/urllib?a=b&c=d');
        done();
      });
    });

    it('POST upload file', function (done) {
      const form = formstream();
      const buffer = Buffer.alloc(5 * 1024 * 1024);
      form.buffer('file', buffer, 'main.test.js');
      form.field('foo', 'bar');
      const headers = form.headers();

      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.multipleSignatures[1].accessKeyId,
        accessKeySecret: consts.multipleSignatures[1].accessKeySecret,
        signatureApproach: 'userAuth'
      }).post('/upload?a=b&c=d', '', {
        dataType: false,
        headers,
        stream: form
      }, function (err, data) {
        assert(err.toString() === 'main.test.js');
        done();
      });
    });

    it('DELETE + not exist accessKeyId', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.multipleSignatures[0].accessKeyId + '1',
        accessKeySecret: consts.multipleSignatures[0].accessKeySecret,
        signatureApproach: 'userAuth'
      }).delete('/urllib', function (err, data) {
        assert(err);
        assert(err.code === 'ACCESS_KEY_ID_NOT_EXIST');
        done();
      });
    });

    after(() => {
      httpInstance.close();
    });
  });

  describe('systemCall | service-client signature | signatureHeader = sign1', function (done) {
    let httpInstance = null;
    let httpPort = null;
    before((done) => {
      httpInstance = httpServer.start(
        signatureAuth({
          config: {},
          getLog: () => {
            return {
              debug: console.log.bind(console),
              warn: console.log.bind(console),
              error: console.log.bind(console)
            };
          }
        }, {
            authType: 'systemCall',
            header: 'sign1',
            accessSecretGetter: 'service-client',
            signatureConfig: {
              serviceClient: {
                accessKeyId: 'system-token',
                accessKeySecret: consts.system.accessKeySecret,
                endpoint: consts.system.endpoint + '/system/api/authinfo'
              },
              method: 'GET',
              genParam: (customerAccessKeyId) => {
                return {
                  accessKeyId: customerAccessKeyId
                };
              },
              getAccessSecret: (d) => {
                return d;
              }
            }
          }), function () {
            httpPort = httpInstance.address().port;
            done();
          });
    });

    it('GET', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.system.userInfo.accessKeyId,
        accessKeySecret: consts.system.userInfo.accessKeySecret,
        signatureHeader: 'sign1'
      }).get('/urllib', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '/urllib');
        done();
      });
    });

    it('POST + querystring', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.system.userInfo.accessKeyId,
        accessKeySecret: consts.system.userInfo.accessKeySecret,
        signatureHeader: 'sign1'
      }).post('/urllib?a=b&c=d', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '/urllib?a=b&c=d');
        done();
      });
    });

    it('POST + no signature header', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.system.userInfo.accessKeyId,
        accessKeySecret: consts.system.userInfo.accessKeySecret,
        signatureHeader: 'sign1'
      }).delete('/urllib?a=b&c=d', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '/urllib?a=b&c=d');
        done();
      });
    });

    after(() => {
      httpInstance.close();
    });
  });

  describe('userAuth | service-client signature | signatureHeader = sign2', function (done) {
    let httpInstance = null;
    let httpPort = null;
    before((done) => {
      httpInstance = httpServer.start(
        signatureAuth({
          config: {},
          getLog: () => {
            return {
              debug: console.log.bind(console),
              warn: console.log.bind(console),
              error: console.log.bind(console)
            };
          }
        }, {
            authType: 'userAuth',
            header: 'sign2',
            accessSecretGetter: 'service-client',
            signatureConfig: {
              serviceClient: {
                accessKeyId: 'system-token',
                accessKeySecret: consts.system.accessKeySecret,
                endpoint: consts.system.endpoint + '/system/api/authinfo'
              },
              method: 'GET',
              genParam: (customerAccessKeyId) => {
                return {
                  accessKeyId: customerAccessKeyId
                };
              },
              getAccessSecret: (d) => {
                return d;
              }
            }
          }), function () {
            httpPort = httpInstance.address().port;
            done();
          });
    });

    it('GET', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.system.userInfo.accessKeyId,
        accessKeySecret: consts.system.userInfo.accessKeySecret,
        signatureHeader: 'sign2',
        signatureApproach: 'userAuth'
      }).get('/urllib', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '/urllib');
        done();
      });
    });

    it('POST + querystring', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.system.userInfo.accessKeyId,
        accessKeySecret: consts.system.userInfo.accessKeySecret,
        signatureHeader: 'sign2',
        signatureApproach: 'userAuth'
      }).post('/urllib?a=b&c=d', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '/urllib?a=b&c=d');
        done();
      });
    });

    it('DELETE', function (done) {
      new ServiceClient({
        endpoint: 'http://localhost:' + httpPort,
        accessKeyId: consts.system.userInfo.accessKeyId,
        accessKeySecret: consts.system.userInfo.accessKeySecret,
        signatureHeader: 'sign2',
        signatureApproach: 'userAuth'
      }).delete('/urllib?a=b&c=d', '', {
        dataType: false
      }, function (err, data) {
        assert(err.toString() === '/urllib?a=b&c=d');
        done();
      });
    });

    after(() => {
      httpInstance.close();
    });
  });

  describe('jwt | enums signatures', function (done) {
    let httpInstance = null;
    let httpPort = null;

    before((done) => {
      httpInstance = httpServer.start(
        signatureAuth({
          config: {},
          getLog: () => {
            return {
              debug: console.log.bind(console),
              warn: console.log.bind(console),
              error: console.log.bind(console)
            };
          }
        }, {
            authType: 'jwt',
            signatures: consts.singleSignature,
          }), function () {
            httpPort = httpInstance.address().port;
            done();
          });
    });

    it('GET success', function (done) {
      const token = jwt.sign({
        hello: 'world'
      }, consts.singleSignature[0].accessKeySecret, {
          algorithm: 'HS256'
        });
      urllib.request('http://localhost:' + httpPort + '/jwt', {
        method: 'GET',
        dataType: false,
        data: {
          foo: 'bar'
        },
        headers: {
          authorization: `jwt ${consts.singleSignature[0].accessKeyId}:${token}`,
        }
      }, function (err, data) {
        const d = JSON.parse(data.toString());
        assert(d.hello === 'world');
        done();
      });
    });

    it('GET error', function (done) {
      urllib.request('http://localhost:' + httpPort + '/jwt', {
        method: 'GET',
        dataType: false,
        data: {
          foo: 'bar'
        },
        headers: {
          authorization: `jwt ${consts.singleSignature[0].accessKeyId}:wrongToken`,
        }
      }, function (err, data) {
        assert(data.toString() === '{"name":"JsonWebTokenError","message":"jwt malformed","code":"HC_SIGNATURE_JSONWEBTOKENERROR","status":401}');
        done();
      });
    });


    it('POST success', function (done) {
      urllib.request('http://localhost:' + httpPort + '/jwt', {
        method: 'POST',
        dataType: false,
        data: {
          foo: 'bar'
        },
        headers: {
          authorization: `jwt ${consts.singleSignature[0].accessKeyId}:wrongToken`,
        }
      }, function (err, data) {
        assert(data.toString() === '{"name":"JsonWebTokenError","message":"jwt malformed","code":"HC_SIGNATURE_JSONWEBTOKENERROR","status":401}');
        done();
      });
    });


    it('PUT success', function (done) {
      urllib.request('http://localhost:' + httpPort + '/jwt', {
        method: 'PUT',
        dataType: false,
        data: {
          foo: 'bar'
        },
        headers: {
          authorization: `jwt ${consts.singleSignature[0].accessKeyId}:wrongToken`,
        }
      }, function (err, data) {
        assert(data.toString() === '{"name":"JsonWebTokenError","message":"jwt malformed","code":"HC_SIGNATURE_JSONWEBTOKENERROR","status":401}');
        done();
      });
    });

    it('DELETE success', function (done) {
      const token = jwt.sign({
        hello: 'world'
      }, consts.singleSignature[0].accessKeySecret, {
          algorithm: 'HS256'
        });
      urllib.request('http://localhost:' + httpPort + '/jwt', {
        method: 'DELETE',
        dataType: false,
        data: {
          foo: 'bar'
        },
        headers: {
          authorization: `jwt ${consts.singleSignature[0].accessKeyId}:${token}`,
        }
      }, function (err, data) {
        const d = JSON.parse(data.toString());
        assert(d.hello === 'world');
        done();
      });
    });

    after(() => {
      httpInstance.close();
    });
  });

  describe('debug mode test', function (done) {
    let httpInstance = null;
    let httpPort = null;

    before((done) => {
      httpInstance = httpServer.start(
        signatureAuth({
          config: {
            debug: true
          },
          getLog: () => {
            return {
              debug: console.log.bind(console),
              warn: console.log.bind(console),
              error: console.log.bind(console)
            };
          }
        }, {
            authType: 'jwt',
            signatures: consts.singleSignature,
          }), function () {
            httpPort = httpInstance.address().port;
            done();
          });
    });

    it('GET success', function (done) {
      urllib.request('http://localhost:' + httpPort + '/urllib', {
        method: 'GET',
        dataType: false,
        data: {
          foo: 'bar'
        },
        headers: {
          authorization: `jwt ${consts.singleSignature[0].accessKeyId}:wrongToken`,
        }
      }, function (err, data) {
        assert(data.toString() === '/urllib?foo=bar');
        done();
      });
    });

    it('GET error', function (done) {
      urllib.request('http://localhost:' + httpPort + '/jwt', {
        method: 'GET',
        dataType: false,
        data: {
          foo: 'bar'
        },
        headers: {
          // authorization: `jwt ${consts.singleSignature[0].accessKeyId}:wrongToken`,
        }
      }, function (err, data) {
        assert(data.toString() === '{"error":"SIGNATURE_HEADER_NOT_FOUND","message":"signature header `authorization` not found"}');
        done();
      });
    });

    after(() => {
      httpInstance.close();
    });
  });
});
