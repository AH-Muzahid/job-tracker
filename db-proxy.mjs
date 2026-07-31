import net from 'net';

const REMOTE_HOST = 'aws-1-ap-south-1.pooler.supabase.com';
const REMOTE_PORT = 6543;
const LOCAL_PORT = 15432;

const server = net.createServer((localSocket) => {
  const remoteSocket = new net.Socket();
  remoteSocket.connect(REMOTE_PORT, REMOTE_HOST, () => {
    localSocket.pipe(remoteSocket);
    remoteSocket.pipe(localSocket);
  });
  remoteSocket.on('error', () => {
    localSocket.destroy();
  });
  localSocket.on('error', () => {});
});

server.listen(LOCAL_PORT, '127.0.0.1', () => {
  console.log(`⚡ DB Proxy running on 127.0.0.1:${LOCAL_PORT} -> ${REMOTE_HOST}:${REMOTE_PORT}`);
});
