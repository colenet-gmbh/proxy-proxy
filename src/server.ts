import * as http from 'http';
import * as net  from 'net';

enum AuthenticationState {
    unknown,
    noAuthentication,
    firstRound,
    secondRound
}

class Response {
    headers = [];
    statusCode: number;
    statusText: string;
    httpVersion: string;

    addHeader( headerKey: String, value: String ) {
        this.headers.push({'key': headerKey, 'value': value});
    }

    setStatusCode(status: number) {
        this.statusCode = status;
    }

    setStatusText(text: string) {
        this.statusText = text;
    }

    setHttpVersion(version: string) {
        this.httpVersion = version;
    }

    createResponse() {
        let response = '';
        response += 'HTTP/' + this.httpVersion + ' ';
        response += this.statusCode.toString() + ' ' + this.statusText + this.crlf();
        for (const header of this.headers) {
            response += header['key'] + ': ' + header['value'] + this.crlf();
        }
        response += this.crlf();
        return response;
    }

    crlf() {
        return '\r\n';
    }
}

class State {
    internalState = AuthenticationState.unknown;

    nextActionOnConnection(req: http.IncomingMessage) : string {
        const headers = req.headers;
        console.info(headers);

        function authenticationRequiredResponse()  {
            let res = new Response();
            res.setHttpVersion(req.httpVersion);
            res.setStatusCode(407);
            res.setStatusText('ProxyAuthentication required');
            res.addHeader('Proxy-Authenticate', 'Negotiate');
            res.addHeader('Proxy-Authenticate', 'NTLM');
            res.addHeader( 'Connection', 'close');
            res.addHeader( 'Proxy-Connection', 'close');
            return res;
        }

        function firstRoundResponse() {
            let res = new Response();
            res.setHttpVersion(req.httpVersion);
            res.setStatusCode(407);
            res.setStatusText('ProxyAuthentication required');
            res.addHeader('Proxy-Authenticate', 'NTLM #hash');
            res.addHeader( 'Connection', 'keep-alive');
            res.addHeader( 'Proxy-Connection', 'keep-alive');
            return res;
        }

        if (headers['proxy-authenticate'] === undefined) {
            this.internalState = AuthenticationState.noAuthentication;
            return authenticationRequiredResponse().createResponse();
        }
        else {
            switch (this.internalState) {
                case AuthenticationState.unknown:
                    this.internalState = AuthenticationState.firstRound;
                    return firstRoundResponse().createResponse();
                case AuthenticationState.firstRound:
                    this.internalState = AuthenticationState.secondRound
                    break;
                case AuthenticationState.secondRound:
                    break;
            }
        }
    }
}


class Socket extends  net.Socket {
    applicationState: State;
}


let server = http.createServer();

server.on('connection', (socket) => {
   console.info('new socket');
   let s: any = socket;
   s.applicationState = new State();
});

server.on('connect', (req: http.IncomingMessage, socket: Socket, head: Buffer) => {
    console.info('CONNECT event');
    console.info( 'headers %j', req.headers);
    console.info('state %j', socket.applicationState);

    socket.write(socket.applicationState.nextActionOnConnection(req));
});

server.listen(4000);

console.info('Server started on 4000');