exports.utils = require("./utils")
exports.Service = require("./Service")


var secureWorker, secureWorkerService;

exports.requestFromSecureWorker = function(/*command, args..., respond*/) {
    var respond = arguments[arguments.length-1]
    var requestArgs = Array.prototype.slice.call(arguments,0,-1)

    if(secureWorker === undefined) {
        secureWorker = new SharedWorker("sharedWorker.js")
        secureWorker.onerror = function(e) {
            throw e
        }

        secureWorkerService = new webkey.Service(secureWorker.port, null)
        secureWorkerService.registerCommand('log', function(message, respond) {
            console.log("-SharedWorker: "+message)
            respond()
        })

        secureWorker.port.addEventListener("message", function(result) {
            secureWorkerService.handleMessage(result)
        }, false)
        secureWorker.port.addEventListener("error", function(e) {
            throw e
        }, false)


        secureWorkerService.requestHook(function(request) {
            if(request[2] === 'log') {
                logIds[request[1]] = true
            } else {
                console.log("Sending request: "+JSON.stringify(request))
            }
        })
        secureWorkerService.responseHook(function(response) {
            console.log("Sending response: "+JSON.stringify(response))
        })

        secureWorker.port.start()
    }

    secureWorkerService.onReady(function() {
        secureWorkerService.request.apply(secureWorkerService, requestArgs.concat([function() {
            respond.apply(respond, arguments)
        }]))
    })
}
exports.registerCommandOnSecureWorker = function(command, callback) {
    secureWorkerService.registerCommand(command, callback)
}
