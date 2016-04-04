var https = require('https');
var fs = require('fs')
var url = require('url')
var path = require("path")

var pem = require("pem")

var buildUtils = require('../buildUtil')
buildUtils.buildAndWatch() // build the bundles

var root = path.resolve(__dirname, '..')

pem.createCertificate({days:365*10, selfSigned:true}, function(err, keys) {
    if(err) throw err

    var server = https.createServer({key: keys.serviceKey, cert: keys.certificate}, function (request, res) {
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
})