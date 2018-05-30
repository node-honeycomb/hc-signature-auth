# hc-signature-auth

> 支持 系统签名、用户签名、jwt签名

hc-signature-auth 支持三种签名:

- systenCall: 系统签名
- userAuth: 用户签名
- jwt: JsonWebToken签名

## 签名结构及规则设计

调用端在调用中传入签名header进行签名校验,格式如下：

```javascript
{
    '<signatureHeader>': '<protocol> <accessKeyId>:<signaturedString>'
}
```

一般可通过 hc-service-client 进行与本库配套的签名。

## 场景案例

接口需要支持得签名有如下四中:

- 系统签名(systemCall)
- 用户签名(userAuth)
- JsonWebToken(jwt)
- loginAuth(登录校验)

```
/api/systenCall/*           需要支持 系统签名
/api/userAuth/*             需要支持 用户签名
/api/jwt/*                  需要支持 jwt校验
/api/userAuthLoginAuth/*    需要支持 用户签名 / 登录验证
/api/systemCallLoginAuth/*  需要支持 用户签名 / 登录验证
```

在 config/config_default.js 中配置如下

```js
{
  middleware: {
    systemCall: {
      router: '/api/systenCall/*',
      module: 'hc-signature-auth',
      config: {
        authType: 'systemCall',
        signatures: [   // 枚举所有支持的签名密钥
          {
            accessKeyId: 'dtboost-system',        // 默认值，各系统间协商
            // accessKeySecret: '可缺省，缺省时，读取 config.systemToken'
          }
        ]
      }
    },
    userAuth: {
      router: '/api/userAuth/*',
      module: 'hc-signature-auth',
      config: {
        authType: 'userAuth',
        accessSecretGetter: 'service-client',    // 从接口动态拉取密钥
        signatureConfig: {
          serviceClient: {
            accessKeyId: 'dtboost-system',
            endpoint: `${systemEndpoint}/system/api/authinfo`
          },
          method: 'GET',
          getAccessSecret: (d) => {
            return d;
          }
        }
      }
    },
    jwt: {
      router: '/api/jwt/*',
      module: 'hc-signature-auth',
      config: {
        authType: 'jwt',
        signatures: [
          {
            accessKeyId: 'mobile',
            // accessKeySecret: '可缺省，缺省时，读取 config.systemToken'
          }
        ]
      }
    },
    loginAuth: {
      module: 'aliyun-auth',
      config: {
        // some config
      }
    },
    combineUserAuthLoginAuth: {
      router: '/api/userAuthLoginAuth/*',
      module: ['userAuth', 'loginAuth']   // combineMiddleware语法，详见hc-bee文档
    },
    combineSystemCallLoginAuth: {
      router: '/api/systemCallLoginAuth/*',
      module: ['systemCall', 'loginAuth']   // combineMiddleware语法，详见hc-bee文档
    }
  }
}
```

## config中配置详情

```js
{
  authType: 'systemCall',     // optional, default: systemCall,  enum: [ systemCall / userAuth / jwt ]
  header: 'signature',        // optional, systemCall时默认为signature，其它情况默认为 authorization，用户可以自己指定
  accessSecretGetter: 'enum', // optional, 表示签名信息的来源，可以是枚举和通过serviceClient获取，default enum, 取值: [ enum / serviceClient ]
  signatures: [               // optional, accessSecretGetter=enum时必填，枚举出支持的签名对,可支持多对
    {
      accessKeyId: 'dtboost-system',  // required, 签名协议串中使用的accessKeyId
      accessKeySecret: ''             // optional, 与accessKeyId对应的accessKeySecret，可省略，默认使用 config.systemToken / config.accessKeySecret
    }
  ],
  signatureConfig: {          // optional, accessSecretGetter=service-client时必填，填写远程调用的信息。默认使用系统间调用，更多配置可见: https://github.com/node-honeycomb/hc-service-client
    serviceClient: {          // required, 配置service-client调用远程时的签名信息
      accessKeyId: 'system-token',    // required
      accessKeySecret: '',            // optional, 同signatures的accessKeySecret
      endpoint: ''                    // required
    },
    method: 'GET',            // optional, default GET
    genParam: function (accessKeyId) {    // optional, 构造请求参数，不传时就是前面这个函数
      return {
        accessKeyId
      };
    },
    getAccessSecret: function (data) {    // optional, 根据返回结果取得 accessKeySecret，不传时就是前面这个函数
      return data.accessKeySecret;
    }
  }
}
```

