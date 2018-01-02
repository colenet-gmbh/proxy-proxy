import * as http from 'http';

let server = http.createServer();


class State {
    state = 0;

    parseHeaders(headers: any) {
        if (headers['proxy-authenticate'] !== '') {
           return true;
        }
        return false;
    }

}

server.on('connection', (socket) => {
   console.info('new socket');
   let s: any = socket;
   s.applicationState = new State();
});

server.on('connect', (req, socket, head) => {
    console.info('CONNECT event');
    console.info( 'headers %j', req.headers);
    console.info('state %j', socket.applicationState);

    if ( socket.applicationState.parseHeaders(req.headers)) {
        socket.write('HTTP/' + req.httpVersion
         + ' 407 ProxyAuthentication Required\r\n'
         + 'Proxy-Authenticate: Negotiate\r\nProxy-Authenticate: NTLM\r\n'
         + 'Connection: close\r\n'
         + 'proxy-Connection: close\r\n'
         + '\r\n'
        );
    }
});

server.listen(4000);

console.info('Server started on 4000');