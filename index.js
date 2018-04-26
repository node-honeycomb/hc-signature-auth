'use strict';

const authMap = {
  userAuth: require('./src/verify/user'),
  systemCall: require('./src/verify/system'),
  jwt: require('./src/verify/jwt')
};
const defaultAuthType = 'systemCall';
const defaultAccessSecretGetter = 'enum';
const enumAccessSecretGetterGen = require('./src/access_secret/enum');
const serviceCelintAccessSecretGetter = require('./src/access_secret/service_client');
const getContentMd5 = require('./src/get_content_md5');
const pathToRegexp = require('path-to-regexp');
const util = require('./src/util');
const debug = require('debug')('hc-signature-auth');

module.exports = function (app, config) {
  const signExpire  = app.config.signExpire || config && config.signExpire || 300000; // default: 5 min
  const log = app.getLog();

  let authType = config.authType;
  if (!authType) {
    debug('use default authType: ', defaultAuthType);
    authType = defaultAuthType;
  }
  const verifyApproach = authMap[authType];
  if (!verifyApproach) {
    throw `[hc-signature-auth], authType: ${authType} is not supported.`;
  }
  let header = config.header;
  if (!header) {
    header = verifyApproach.defaultHeader;
    debug('use defaultHeader: ' + header);
  }
  let accessSecretGetter = config.accessSecretGetter;
  if (!accessSecretGetter) {
    debug('use default authType: ', defaultAccessSecretGetter);
    accessSecretGetter = defaultAccessSecretGetter;
  }

  let getSecret;
  try {
    getSecret = accessSecretGetter === 'enum' ? enumAccessSecretGetterGen(config.signatures, app.config) : serviceCelintAccessSecretGetter(config.signatureConfig, app.config);
  } catch (e) {
    debug('error occured when generate getSecret.');
    throw e;
  }
  const ignoreHandler = ignoreHandlerGenerator(config.ignore || '');

  function middleware(req, res, next) {
    function nextWrapper(...args) {
      // TODO 老版framework req.getUser 方法，待讨论放此处是否合理
      let headers = req.headers;
      let query = req.query || {};
      let tenant = headers['x-access-tenantcode'] || headers['x-access-tenant'] || headers['x-dataplus-org-code'] || query.tenant;
      let userId = headers['x-access-userid'];
      let user = {
        tenant: tenant
      };
      if (userId) {
        user.id = userId;
      }
      let session = req.session;
      if (session && session.user && session.user.tenant) {
        user = session.user;
      }
      // 登陆后取session.user里的值，接口调用只有tenant
      req.getUser = function () {
        return user;
      };

      next(...args);
    }

    // ignore path
    if (ignoreHandler(req.path)) {
      debug('ignored', req.path);
      return nextWrapper();
    }

    // check header exist.
    if (!req.headers[header]) {
      return nextWrapper({
        error: 'SIGNATURE_HEADER_NOT_FOUND',
        message: 'signature header `' + header + '` not found'
      });
    }

    // check expired if there is date header.
    if (req.headers.date) {
      let error = checkSignExpired(req.headers.date || 0, signExpire, log);
      if (error) {
        error.status = 401;
        return nextWrapper(error);
      }
    }

    // parse header
    let signatureMeta;
    try {
      signatureMeta = util.parseSignatureStructure(req.headers[header]);
    } catch (e) {
      return nextWrapper({
        code: 'SIGNATURE_HEADER_STRUCTURE_ERROR',
        message: e.message
      });
    }

    // get content first
    Promise.all([
      getContentMd5(req),
      getSecret(signatureMeta.accessKeyId)
    ]).then((result) => {
      const accessSecretMeta = result[1];
      // verify signature, empty function wrapper make verify logic excute in promise(not in current context), so errors can be catched.
      return verifyApproach(req, signatureMeta, accessSecretMeta, log);
    }).then(() => {
      nextWrapper();
    }).catch(e => {
      debug('verifyApproach error: ', e);
      nextWrapper(e);
    });
  }
  middleware.match = function (req) {
    return !!req.headers[header];
  };
  return middleware;
};

function ignoreHandlerGenerator(rules) {
  if (rules.length) {
    let re = pathToRegexp(rules, {
      sensitive: true,
      end: false
    });

    debug('ignore', re);

    return function (path) {
      return re.test(path);
    };
  } else {
    return function () {
      return false;
    };
  }
}

function checkSignExpired(date, signExpire, log) {
  let now = Date.now();
  let timestamp = (new Date(date)).getTime();
  if (Math.abs(now - timestamp) > signExpire) {
    let msg = `system timestamp: ${now}, user timestamp: ${timestamp}, user date: ${date}, expire time: ${signExpire}`;
    let err = new Error('Signature expired.  ' + msg);
    err.code = 'SIGNATURE_AUTH_EXPIRED';
    log.error(err);
    return err;
  } else {
    return false;
  }
}
