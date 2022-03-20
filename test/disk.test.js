const http = require('http');
const getContentMd5 = require('../src/get_content_md5');
const urllib = require('urllib');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function getMd5(data) {
  return crypto.createHash('md5').update(data).digest('base64');
}

const PORT = 8899;
const URL = `http://localhost:${PORT}`;
describe('开始测试', () => {
  let httpInstance = null;
  before((done) => {
    // 创建服务器,通过getContentMd5获取md5, 然后消费掉req流对象
    httpInstance = http.createServer(async (req, res) => {
      const md5 = await getContentMd5(req);
      res.write(md5, 'utf-8');
      req.pipe(res);
    }).listen(PORT, done);
  });

  it('一个小的请求流', async () => {
    const data = Buffer.alloc(2000);
    const res = await urllib.request(URL, {
      method: 'POST',
      data,
    });
    assert.equal(getMd5(data) + data.toString(), res.data.toString(), '请求异常');
  });
  it.only('一个大的请求流', async () => {
    // const data = Buffer.alloc(3000);
    const data = fs.readFileSync(path.join(__dirname, '../package-lock.json'), 'utf-8');
    const res = await urllib.request(URL, {
      method: 'POST',
      data,
    });
    assert.equal(getMd5(data) + data.toString(), res.data.toString(), '请求异常');
  });

  after(() => {
    httpInstance.close();
  });
});
