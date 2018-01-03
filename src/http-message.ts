export class HttpMessage {
    headers = [];
    statusCode: number;
    statusText: string;
    httpVersion: string  = "1.1";
    isRequest = false;
    httpMethod: string;
    httpMethodParam: string;

    addHeader(headerKey: String, value: String) {
        this.headers.push({"key": headerKey, "value": value});
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

    setHttpMethod(method: string) {
        this.isRequest = true;
        this.httpMethod = method;
    }

    setHttpMethodParam(param: string) {
        this.isRequest = true;
        this.httpMethodParam = param;
    }

    createMessage() {
        let response = "";
        if (this.isRequest) {
            response += this.httpMethod + ' ' + this.httpMethodParam + ' HTTP/' + this.httpVersion;
            response += this.crlf();
        }
        else {
            response += "HTTP/" + this.httpVersion + " ";
            response += this.statusCode.toString() + " " + this.statusText + this.crlf();
        }
        for (const header of this.headers) {
            response += header["key"] + ": " + header["value"] + this.crlf();
        }
        response += this.crlf();
        return response;
    }

    crlf() {
        return "\r\n";
    }
}