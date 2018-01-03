import * as http from "http";
import * as net from "net";
import {HttpMessage} from "./http-message";

enum AuthenticationState {
    unknown,
    noAuthentication,
    firstRound,
    secondRound
}

class State {
    internalState = AuthenticationState.unknown;

    nextActionOnConnection(req: http.IncomingMessage) : string {
        const headers = req.headers;
        console.info(headers);

        function authenticationRequiredResponse()  {
            let res = new HttpMessage();
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
            let res = new HttpMessage();
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
            console.info('no proxy-authenticate');
            let resp = authenticationRequiredResponse();
            console.info('resp %j', resp);
            return resp.createMessage();
        }
        else {
            switch (this.internalState) {
                case AuthenticationState.unknown:
                    this.internalState = AuthenticationState.firstRound;
                    return firstRoundResponse().createMessage();
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

export class ProxyServer {

    server: http.Server;

    public start(port: number) {
        this.server = http.createServer();

        this.server.on('connection', (socket) => {
            console.info('new socket');
            let s: any = socket;
            s.applicationState = new State();
        });

        this.server.on('connect', (req: http.IncomingMessage, socket: Socket, head: Buffer) => {
            console.info('CONNECT event');
            console.info( 'headers %j', req.headers);
            console.info('state %j', socket.applicationState);

            socket.write(socket.applicationState.nextActionOnConnection(req));
        });

        this.server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
            console.info('Request %j', req);
            const socket: Socket = <Socket>req.socket;
            res.write(socket.applicationState.nextActionOnConnection(req));
        });
        this.server.listen(port);

        console.info(`Server started on {port}`);
    }

    public stop() {
        if (this.server) {
            this.server.close();
        }
    }
}
