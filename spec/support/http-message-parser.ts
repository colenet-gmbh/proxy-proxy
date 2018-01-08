export class HttpMessageParser {

    public parseResponse( responseString: string ) : any {
        const response = {};
        const lines = responseString.split(/\r?\n/);

        const parsedStatusLine = this.parseStatusLine(lines.shift());
        response['protocolVersion'] = parsedStatusLine['protocol'];
        response['statusCode'] = +parsedStatusLine['statusCode'];
        response['statusMessage'] = parsedStatusLine['statusMessage'];
        const headerLines = [];
        while (lines.length > 0) {
            const line = lines.shift();
            if (line === "") {
                break;
            }
            headerLines.push(line);
        }

        response['headers'] = this.parseHeaders(headerLines);
        response['body'] = lines.join('\r\n');
        return response;
    }

    private parseHeaders(headerLines: Array<string>) : any {
        const headers = {};
        for (const line of headerLines) {
            const parts = line.split(':');
            const key = parts.shift().toLowerCase();
            const val = parts.join(':').trim();
            if (headers[key] === undefined ) {
                headers[key] = [val];
            }
            else {
                headers[key].push(val);
            }
        }
        return headers;
    }

    private parseStatusLine( statusLine: string ) : any {
        const parts = statusLine.match(/^(.+) ([0-9]{3}) (.*)$/);
        const parsed = {};
        if (parts != null) {
            parsed['protocol'] = parts[1];
            parsed['statusCode'] = parts[2];
            parsed['statusMessage'] = parts[3];
        }
        return parsed;
    }
}