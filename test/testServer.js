var https = require('https');
var fs = require('fs')
var url = require('url')
var path = require("path")

//var pem = require("pem")

var buildUtils = require('../buildUtil')
buildUtils.buildAndWatch() // build the bundles

var root = path.resolve(__dirname, '..')

//pem.createCertificate({days:365*10, selfSigned:true}, function(err, keys) {

//    console.log(keys)
//    if(err) throw err

    var keys = {
        certificate: '-----BEGIN CERTIFICATE-----\nMIICpDCCAYwCCQCp36/xIvl39TANBgkqhkiG9w0BAQsFADAUMRIwEAYDVQQDDAls\nb2NhbGhvc3QwHhcNMTYwNDA1MjI0OTA1WhcNMjYwNDAzMjI0OTA1WjAUMRIwEAYD\nVQQDDAlsb2NhbGhvc3QwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDT\n4MJDLXS/Po75EC5T8sJIgPgV7CIGOTGRht9M19hcHR7r6DCbWdw+UHhaI58fgyVb\n1Q5qDUKfelpdSyO0PY1H+2AuwVdS4onOFXv1uQ6ai3byOO8YlhyvcD/m4/FBqz0O\n3GwydvQvdD/0UK2q/iloWgQc7R8xRW6Xci6GkRE4vtcycESL4OMrCTZB8CmTxJz8\n/EJ0y6/afqH+V5DBxJy7PYEI6RhVGmM9NMgl2bo9y8eozoRKWHEOut74CUOCTVtI\nLKXlBLq8CCpklJ2/PkO2ZRk10laUS6mOiQLzTSpmAy8nhJGO7lsoLSEjhy7gTpeR\nzPMtLCwCxN0coolsuHPfAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAH/+UkP4lY3d\nX1qdjp1j+qs4YtJE/lQiMqDohDcxUXQ1FbK8uDAHBDIatwLshG7XsIBSGQ7KffjD\n+llnB2DBatw5z14xs0rISv21LAGc3gJ2STnAO91vrEzPKzYf5qiww2fjk8d6UOcu\nnd91Lon+2/yvwfflr0UuSAz2T69qgkn0IWzvDGzavNMBn1c1hwZCKbVCCbmfceQ6\nIv1M80kjDB44E6TEWjFeg5koL4TIvKp3OFNR0X65BGUVGM6coxQSZM/O1Rm/S+7j\nwLxphJj4DOG8myHEXEgH+r4XaQgWr/dusMvUSHGlDS6lG7CW8dQt2ZScuQQopf+y\nrgoB21gEBDI=\n-----END CERTIFICATE-----',
        serviceKey:  '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0+DCQy10vz6O+RAuU/LCSID4FewiBjkxkYbfTNfYXB0e6+gw\nm1ncPlB4WiOfH4MlW9UOag1Cn3paXUsjtD2NR/tgLsFXUuKJzhV79bkOmot28jjv\nGJYcr3A/5uPxQas9DtxsMnb0L3Q/9FCtqv4paFoEHO0fMUVul3IuhpEROL7XMnBE\ni+DjKwk2QfApk8Sc/PxCdMuv2n6h/leQwcScuz2BCOkYVRpjPTTIJdm6PcvHqM6E\nSlhxDrre+AlDgk1bSCyl5QS6vAgqZJSdvz5DtmUZNdJWlEupjokC800qZgMvJ4SR\nju5bKC0hI4cu4E6XkczzLSwsAsTdHKKJbLhz3wIDAQABAoIBAFG0AjVVegelYAy7\nKKJGopTC5ufNPvGXbH3pvIItWclrkVj3GIdPh5agAUkBI4NLV0SqS/ypUF+fFumS\n6BnBApIXZWeiNsJHiUxnDH4c9nyx+xQ80DZy7GzapEms7IOePNVWOoLbTB5gfakA\n03d0uxL6Y0ukRLsDQzozVa2ekz2F5dlTIGfGJqTeGxCyCgWDQOE6mOEiuML5HPbW\n8aNVj1TZIfb4FbIn9oVKT4hFUGmNFkl1CN1gO70kspEJZ9aZYvk2p85saqouZ8Ba\nUyOR6DYmz2326MgEVbaxNRgtW1qc0VSmMrkQDUA9uqFDrSxZLnQsAdUUd4RRy0By\nWPsBoQECgYEA+/OOX1jNcbIAl7vp224GMYje4YSks2O73S/4odySpXFPu9/sFCEw\nXaQlPn/LU75o8kofddTA1ru15BdP7/Kf+oUGtUa7HAbCiiWyKtaNf4CjQ2YnlCqE\nCaPMLFyQBJZ7yl6im4i6piN019K110zCgbAr0fgZce79ZSm3FFU+b+8CgYEA10ha\nn/ai0OfD0YI+wu2cpJ8Ho5hFMbq7o1Z5wISvypy+x6vYLYJ2x06ou3YIUMpz7yeg\nCnbL8TlTbZHqGkRhWR5MvzbrxD43QznrkiFI/8XFqyL9wV7ea1+bFoOWx+M4Legr\nEF6BcJ6AGQbtjysbAjdDEICeOm8Yl5y4JUu4SxECgYBimvqghE+7bI/g0pF+6HuS\nDWA1YMVY0/KlaW3kY0AdcdBj1go+ApM8Qs60vC0mdEH8eVgAtKhYIhTY1OrbHNjR\nohhy/+Cg4mBm0sP9EgVE3mKHMUbSLSWJ5Eo3Hm7a7M478HexaXyrIvtKsFOslIUX\nXox326KRvZf8bKwTUB1kjwKBgQCnfMAc0XosQxPirIz9hHUo0hzUVwQGQ3v2ALIq\naFCHtljq6TP/fA/C0dyOM68Wg9uchVyKp4/VNT9F8I6MLwT5m4wj+6uDes/tumMe\nxkyPySMXGNsJFTC/opr68hddndY4SPcv/gaAQp/wWKZ7ixKxL6M6dIYlegdM9P2C\n7p0LsQKBgQCK+QX7SnIUoCM6rktXKup5HPKVJe/ruyW0WkDp9GI876bfstlommfg\n31GeXdkv1czXLei6FUy+nGSSSiw45F1XVh+LPqjjDzq8AYehFPSogODGaI7fp6aO\nJM2k23gKCq+MSw6r8sGVjr+cqs6V+xLLc27sFmuZAPJpvSuHz+500A==\n-----END RSA PRIVATE KEY-----'
    }

    var server = https.createServer({key: keys.serviceKey, cert: keys.certificate}, function (request, res) {
        try {
            var requestUrl = url.parse(request.url)
            var requestPath = decodeURIComponent(requestUrl.pathname)

            if(requestPath !== '/favicon.ico') {
                console.log("got request for: "+requestPath)

                if(requestPath === '/') {
                    requestPath = '/test/localhost.html'
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
//})