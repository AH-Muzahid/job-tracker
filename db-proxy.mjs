import net from 'net';

const REMOTE_HOST = '2406:da1a:314:7101:d9cf:9c9b:42bf:8d3c';
const REMOTE_PORT = 5432;
const LOCAL_PORT = 15432;

const server = net.createServer((localSocket) => {
  const remoteSocket = new net.Socket();
  remoteSocket.connect(REMOTE_PORT, REMOTE_HOST, () => {
    localSocket.pipe(remoteSocket);
    remoteSocket.pipe(localSocket);
  });
  remoteSocket.on('error', (err) => {
    console.error('Remote error:', err.message);
    localSocket.destroy();
  });
  localSocket.on('error', () => {});
});

server.listen(LOCAL_PORT, '127.0.0.1', () => {
  console.log(`Proxy listening on 127.0.0.1:${LOCAL_PORT} -> [${REMOTE_HOST}]:${REMOTE_PORT}`);
});
