var webkeyPopupService, killDataTimeout;
var derivedKey, identities, origins;

var webkeyLib;

self.addEventListener("connect", function (e) {
    var port = e.ports[0]
    try {

        if(webkeyLib === undefined) {
            importScripts('dist/webkey.umd.js') // done here so we can catch and return any errors that result from this
            webkeyLib = webkey
        }

        var service = new webkeyLib.Service(port, null)

        //service.request('log', "testing", function() {})

        service.registerCommand('acceptanceFor', function(origin, respond) {

            var getAcceptanceInfo = function(callback) {
                webkeyPopupService.request('acceptanceFor', origin, derivedKey, identities, origins, function(err, newData) {
                    if(err) return callback(err)

                    if(newData) {
                        derivedKey = newData.derivedKey
                        identities = newData.identities
                        origins = newData.origins
                    }

                    var originData = origins[origin]
                    var identity = identities[originData.identity]

                    service.request('log', "HERE: "+JSON.stringify(newData), function() {})

                    var publicKey = webkey.utils.getKeyPair(identity.keyPair).exportKey('pkcs8-public')

                    callback(undefined, {email:identity.email, publicKey:publicKey})
                })
            }

            if(webkeyPopupService === undefined) {
                respond(new Error("needPopup"))
            } else if(derivedKey === undefined) {
                getData(function(err) {
                    service.request('log', "got Data: "+JSON.stringify([derivedKey, identities, origins]), function() {})
                    if(err) return respond(err)
                    getAcceptanceInfo(respond)
                })
            } else {
                getAcceptanceInfo(respond)
            }
        })

        service.registerCommand('proof', function(origin, token, respond) {

            var getProof = function() {
                var originData = origins[origin]
                var identity = identities[originData.identity]
                var keyPair = webkey.utils.getKeyPair(identity.keyPair)

                return webkeyLib.utils.createProof(keyPair, token)
            }

            if(webkeyPopupService === undefined) {
                respond(new Error("needPopup"))
            } else if(derivedKey === undefined) {
                getData(function(err) {
                    if(err) return respond(err)
                    respond(undefined, getProof(respond))
                })
            } else {
                respond(undefined, getProof(respond))
            }
        })


        service.registerCommand('registerAsPopup', function(respond) {
            if(killDataTimeout !== undefined) {
                clearTimeout(killDataTimeout) // cancel data killing (assume its a reload of the popup)
            }
            webkeyPopupService = service
            // todo: how do you know when the popup has been closed?
            respond()
        })
        service.registerCommand('killData', function(respond) {
            killDataTimeout = setTimeout(function() {
                service.request('log', "killing data", function() {})
                killDataTimeout = undefined
                derivedKey = identities = origins = webkeyPopupService = undefined
            },1000)

            respond()
        })

        var logIds = {}
        service.requestHook(function(request) {
            if(request[2] === 'log') {
                logIds[request[1]] = true
            } else {
                service.request('log', "Sending request: "+JSON.stringify(request), function() {})
            }
        })
        service.responseHook(function(response) {
            service.request('log', "Sending response: "+JSON.stringify(response)+' '+JSON.stringify(logIds), function() {})
        })

        port.addEventListener('message', function(message) {
            try {
                var stuff = JSON.parse(message.data)
                if(!(stuff[1] in logIds)) { // don't log about log responses
                    service.request('log', "Got message: "+message.data, function() {})
                }
                service.handleMessage(message)
            } catch(e) {
                port.postMessage(e.stack.toString())
            }
        })

        port.start()
        port.postMessage(JSON.stringify({ready:true}))//webkeyLib.Service.sendReady(port) - the second parameter to postMessages causes problems in a shared worker
    } catch(e) {
        port.postMessage(e.stack.toString())
    }
}, false)

function getData(callback) {
    webkeyPopupService.request('data', function(err, data) {
        if(err) {
            if(err.message === 'closed') {

            } else {
                return callback(err)
            }
        }

        derivedKey = data.derivedKey
        identities = data.identities
        origins = data.origins

        callback()
    })
}

function log() {
    if(webkeyPopupService) {
        webkeyPopupService.request('log', "testing", function() {})
    }
}

//self.addEventListener("connect", function (e) {
//    var port = e.ports[0]
//    port.addEventListener('message', function(e) {
//        port.postMessage('I hear you')
//    })
//
//    port.postMessage('Im here')
//    port.start()
//}, false)