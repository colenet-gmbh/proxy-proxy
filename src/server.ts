import * as http from 'http';

let server = http.createServer();


class State {
    state = 0;

}

server.on('connection', (socket) => {
   console.info('new socket');
   let s: any = socket;
   s.applicationState = new State();
});


server.on('connect', (req, socket, head) => {
    console.info('CONNECT event');
    console.info( 'head %j', head);
    console.info('state %j', socket.applicationState);

    if ( socket.applicationState.state === 0 ) {
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