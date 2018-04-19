# signature-auth

本次设计主要解决几个问题

1. 支持多个key+token同时存在
2. 验证不通过时，返回4xx
3. 专有云签名时，缓存用户的 key 和 token，避免多次调用system
4. tenant信息经过校验
5. 用户信息直接放在session/redis中，尝试恢复；

## 支持的签名方式

1. 各个系统间签名；
2. 数加过来的签名；
3. 用户专有云调用签名；

## 配置详情

```js
const SignatureAuth = require('hc-signature-auth');
const userAuthMiddleware = SignatureAuth({
  authType: 'userAuth',
  header: 'signature',
  signatures: [{
    accessKeyId: 'aaa',
    accessKeySecret: 'yyy'
  }]
});
const userAuthMiddleware = SignatureAuth({
  authType: 'jwt',
  header: 'authorization',
  accessSecretGetter: 'service-client',        // enum(default), service-client
  signatureConfig: {
    serviceClient: {
      accessKeyId: 'system-token',
      accessKeySecret: 'xxx',
      endpoint: 'http://localhost:8000/system/api/userinfo'
    },
    method: 'GET',
    genParam: (customerAccessKeyId) => {
      return {
        accessKeyId: customerAccessKeyId
      };
    },
    getAccessSecret: (d) => {
      return d.data;
    }
  }
});
const userAuthMiddleware = SignatureAuth({
  authType: 'systemCall',
  header: 'signature',
  signatures: [{
    accessKeyId: 'aaa',
    accessKeySecret: 'yyy'
  }]
});

// 同时支持多个signature时使用 hc-bee 的combineMiddleware 语法
```
