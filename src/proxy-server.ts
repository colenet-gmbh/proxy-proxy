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
            res.addHeader('Connection', 'close');
            res.addHeader('Proxy-Connection', 'close');
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

        function secondRoundResponse() {
            let res = new HttpMessage();
            res.setHttpVersion(req.httpVersion);
            res.setStatusCode(200);
            res.setStatusText('Connection established');
            return res;
        }

        if (headers['proxy-authorization'] === undefined) {
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
                    this.internalState = AuthenticationState.secondRound;
                    return secondRoundResponse().createMessage();
                case AuthenticationState.secondRound:
                    break;
            }
        }
    }

    shouldClose() {
        return this.internalState === AuthenticationState.noAuthentication;
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
            let s: any = socket;
            if (s.applicationState === undefined) {
                console.info();
                console.info('new socket');
                s.applicationState = new State();
            }
            else {
                console.info('rewirting socket');
            }
        });

        this.server.on('connect', (req: http.IncomingMessage, socket: Socket, head: Buffer) => {
            console.info('CONNECT event');
            console.info( 'headers %j', req.headers);
            console.info('state %j', socket.applicationState);

            socket.write(socket.applicationState.nextActionOnConnection(req));
            console.info('New socket state: %j', socket.applicationState);
            if (socket.applicationState.shouldClose()) {
                console.info('tear down socket');
                socket.destroy();
            }
            else {
                // rewire socket for event emitter
                this.server.emit('connection', socket);
            }
        });

        this.server.on('request', (req: http.IncomingMessage, res: http.ServerResponse) => {
            console.info('REQUEST %j', req);
            const socket: Socket = <Socket>req.socket;
            res.write(socket.applicationState.nextActionOnConnection(req));
        });

        this.server.on('clientError', (exception: Error, socket: Socket) => {
            console.error('ProxyServer: client error: %j', exception.message);
            socket.destroy(exception);
        });

        this.server.on('upgrade', (request: http.IncomingMessage, socket: Socket, head: Buffer) => {
            console.info('Wants to upgrade -> teardown');
            socket.destroy( "No upgrades today");
        });
        this.server.listen(port);

        console.info(`Server started on ${port}`);
    }

    public stop() {
        if (this.server) {
            this.server.close();
        }
    }
}
