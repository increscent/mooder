/*
 * How to use:
 *
 * const server = require('./http_server.js');
 *
 * "path" is an array of path components
 * e.g. "/hello/world" -> ['hello', 'world']
 *
 * "query" is an object of query keys/values
 *
 * "body" is the request body in bytes
 *
 * server.get(({path, query, body}, {send, redirect}) => send(data, statusCode, contentType));
 * server.post(({path, query, body}, {send, redirect}) => redirect('/'));
 *
 * server.listen(port);
 */

const http = require('http');

const methods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH'];
const handlers = {};

const server = http.createServer((req, res) => {
    let {path, query} = parseUrl(req.url);

    let send = (data, statusCode, contentType) => {
        res.statusCode = statusCode || 200;
        res.setHeader('Content-Type', contentType || 'text/plain');
        res.end(data);
    };

    let redirect = (url) => {
        res.statusCode = 303;
        res.setHeader('Location', url);
        res.end();
    };

    getBody(req, (body) => {
        try {
            let handler = handlers[req.method];
            if (handler) {
                handler({path, query, body}, {send, redirect});
            } else {
                send('Method Not Allowed', 405);
            }
        } catch (e) {
            console.log(e);
            send('Internal server error', 500);
        }
    });
});

const export_obj = {
    listen: (port) => server.listen(port, '127.0.0.1',
        () => console.log(`HTTP server listening on port ${port}`)),
    getContentType: (filepath) => {
        if (filepath.includes('.html')) return 'text/html';
        if (filepath.includes('.css')) return 'text/css';
        if (filepath.includes('.js')) return 'application/javascript';
        return 'text/plain';
    },
};

for (let method of methods) {
    export_obj[method.toLowerCase()] = (handler) => handlers[method] = handler;
}

module.exports = export_obj;

function parseUrl(url) {
    let [pathStr, queryStr] = url.split('?', 2);

    let query = {};
    if (queryStr) queryStr
        .split('&')
        .map(x => x.split('='))
        .map(x => x.map(y => decodeURIComponent(y)))
        .map(([x, y]) => query[x] = y);

    let path = pathStr
        .replace(/\.\./g, '') // remove upward relative paths
        .split('/')
        .filter(x => x);

    return {path, query};
}

function getBody(req, callback) {
    let body = [];
    req.on('data', (chunk) => body.push(chunk));
    req.on('end', () => callback(Buffer.concat(body)));
}
