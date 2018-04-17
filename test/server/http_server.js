'use strict';

const debug = require('debug')('hc-signature-auth');
const http = require('http');
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage()
}).any();

exports.start = function (signatureAuth, callback) {
  const server = http.createServer((req, res) => {
    signatureAuth(req, res, function (error) {
      debug('error', error);
      if (error) {
        res.writeHeader(400, {});
        return res.end(JSON.stringify(error));
      }
      if (req.url.startsWith('/upload')) {
        upload(req, res, function () {
          debug('req.files', req.files);
          res.end(req.files.map(f => (f.originalname)).join(','));
        });
      } else if (req.url.startsWith('/jwt')) {
        res.end(JSON.stringify(req.user));
      } else {
        res.end(req.url);
      }
    });
  });

  server.on('upgrade', (req, socket, head) => {
    socket.write('HTTP/1.1 101 Web Socket Protocol Handshake\r\n' +
      'Upgrade: WebSocket\r\n' +
      'Connection: Upgrade\r\n' +
      '\r\n');

    console.log('req.url', req.url);

    socket.pipe(socket);
  });

  server.listen(null, 'localhost', callback);
  return server;
};
