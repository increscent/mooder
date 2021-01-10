const fs = require('fs');
const moment = require('./lib/moment.js');
const mustache = require('./lib/mustache.js');
const server = require('./lib/http_server.js');

const MOODFILE = `${__dirname}/data/moods.csv`;
const MOODS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PORT = 14351;
const TEMPLATE = `${__dirname}/mooder.html`;


server.get(({path}, {send}) => {
    if (path.length)
        serveStatic(path, send);
    else
        renderPage(send);
});

server.post(({path}, {send, redirect}) => {
    if (path.length !== 1 || !MOODS.includes(parseInt(path[0])))
        return send('Bad Request -- Invalid mood specified', 400, 'text/plain');

    fs.appendFile(MOODFILE, `\n${path[0]},${(new Date()).toISOString()}`, (err) => {
        if (err)
            return send('Internal Server Error -- could not edit moodfile', 500, 'text/plain');

        redirect('/');
    });
});

server.listen(PORT);

var url = `http://localhost:${PORT}`;
var start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
require('child_process').exec(start + ' ' + url);

function renderPage(send) {
    fs.readFile(MOODFILE, (err, data) => {
        if (err)
            return send('Internal Server Error -- could not open moodfile', 500, 'text/plain');

        let moodData = data.toString()
            .split('\n')
            .filter(x => x)
            .map(x => x.split(',').map(y => y.trim()))
            .map(([mood, date]) => ({
                mood,
                date,
                displayDate: moment(date).format('MMMM Do, h:mm a'),
            }));

        fs.readFile(TEMPLATE, (err, data) => {
            if (err)
                return send('Internal Server Error -- could not open template file', 500, 'text/plain');

            send(mustache.render(data.toString(), {moodData, moods: MOODS}), 200, 'text/html');
        });
    });
}

function serveStatic(path, send) {
    // TODO: caching
    let filepath = path.join('/');
    fs.readFile(`${__dirname}/${filepath}`, (err, data) => {
        if (err)
            return send('Not found', 404, 'text/plain');

        send(data, 200, server.getContentType(filepath));
    });
}
