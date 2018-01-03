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
       });

       socket.on('close', (had_error => {
           expect(socket.destroyed).toBeTruthy('Connection should be teared down by proxy');
           done();
       }));

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

    it('should establish channel if 2nd round succeeds', async (done) => {
        const socket = new net.Socket();
        await socket.connect(port);
        const msg = new HttpMessage();

        let round = 1;

        socket.on('data', (buffer) => {
            const parser = new HttpMessageParser();
            const res = parser.parseResponse(buffer.toString());
            if (round === 1) {
                expect(res.statusCode).toEqual(407);
                expect(res.headers['proxy-authenticate']).toBeDefined();
                expect(res.headers['proxy-authenticate']).toMatch(/NTLM\s+.*/);
                expect(socket.destroyed).toBeFalsy();
                const msg = new HttpMessage();

                msg.setHttpMethod('CONNECT');
                msg.setHttpMethodParam('http://example.com');
                msg.addHeader('proxy-Connection', 'keep-alive');
                msg.addHeader('Proxy-Authenticate', 'NTLM 2ndroundhash');
                const buffer = msg.createMessage();
                socket.write(buffer, () => {
                    round = 2;
                });
            }
            else {
                expect(res.statusCode).toEqual(200);
                done();
            }
        });

        socket.on('error', (err: Error) => {
           done.fail(err);
        });

        socket.on('end', () => {
           done.fail('socket closed');
        });
        msg.setHttpMethod('CONNECT');
        msg.setHttpMethodParam('http://example.com');
        msg.addHeader('proxy-Connection', 'keep-alive');
        msg.addHeader('Proxy-Authenticate', 'NTLM 1stroundhash');
        msg.addHeader('Content-Length', '0');
        const buffer = msg.createMessage();
        socket.write(buffer);
    }, 5000);
});