import {ProxyServer} from '../src/proxy-server';
import * as net from 'net';
import {HttpMessage} from "../src/http-message";
import {HttpMessageParser} from "./support/http-message-parser";

describe( 'Proxy', () => {
    let proxy: ProxyServer = new ProxyServer();
    const port = 40000;
    beforeAll( (done) => {
        proxy.start(port);
        done();
    });

    afterAll(proxy.stop);


   it('should reject non authorized requests', async (done) => {
       const socket = new net.Socket();
       await socket.connect(port);
       const msg = new HttpMessage();
       socket.on('data', (buffer) => {
           const parser = new HttpMessageParser();
           const res = parser.parseResponse(buffer.toString());
           expect(res.statusCode).toEqual(407);
           expect(socket.destroyed).toBeTruthy('Connection should be teared down by proxy');
           done();
       });
       msg.setHttpMethod('CONNECT');
       msg.setHttpMethodParam('http://example.com');
       msg.addHeader('proxy-Connection', 'keep-alive');
       const buffer = msg.createMessage();
       console.info(buffer);
       socket.write(buffer);
   });


    it('should initiate "2nd round authorization if header is present', async (done) => {
        const socket = new net.Socket();
        await socket.connect(port);
        const msg = new HttpMessage();
        socket.on('data', (buffer) => {
            const parser = new HttpMessageParser();
            const res = parser.parseResponse(buffer.toString());
            expect(res.statusCode).toEqual(407);
            expect(res.headers['proxy-authenticate']).toBeDefined();
            expect(res.headers['proxy-authenticate']).toMatch(/NTLM\s+.*/);
            done();
        });
        msg.setHttpMethod('CONNECT');
        msg.setHttpMethodParam('http://example.com');
        msg.addHeader('proxy-Connection', 'keep-alive');
        msg.addHeader('Proxy-Authenticate', 'NTLM myhas');
        const buffer = msg.createMessage();
        console.info(buffer);
        socket.write(buffer);
    });
});