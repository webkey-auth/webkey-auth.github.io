var http = require('http');
var fs = require('fs')
var url = require('url')
var path = require("path")

var buildUtils = require('../buildUtil')
buildUtils.buildAndWatch() // build the bundles

var root = path.resolve(__dirname, '..')

var server = http.createServer(function (request, res) {
    try {
        var requestUrl = url.parse(request.url)
        var requestPath = decodeURIComponent(requestUrl.pathname)

        if(requestPath !== '/favicon.ico') {
            console.log("got request for: "+requestPath)

            if(requestPath === '/') {
                requestPath = '/test/host.html'
            }

            res.writeHead(200)
            res.write(fs.readFileSync(root+requestPath))
        }
    } catch(e) {
        console.log(e.message)
    } finally {
        res.end()
    }
})

var port = 8100
server.listen(port)
console.log("listening on port "+port)