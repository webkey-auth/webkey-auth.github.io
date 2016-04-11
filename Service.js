
var Service = module.exports = function(window, windowOrigin) {
    this.counter = 0
    this.window = window
    this.windowOrigin = windowOrigin
    this.pendingRequests = {}
    this.registeredCommands = {}
}

// static methods

Service.sendReady = function(windowToInform) {
    windowToInform.postMessage(JSON.stringify({ready:true}), "*")
}

// instance methods


// convenience methods for integrators
Service.prototype.requestAcceptance = function(cb) {
    this.request('acceptance', cb)
}
Service.prototype.auth = function(token, cb) {
    this.request('auth', token, cb)
}

Service.prototype.handleMessage = function(messageEvent) {
    var that = this

    if(this.windowOrigin === undefined) {
        this.windowOrigin = messageEvent.origin // set the origin as soon as its available (since you can't get it cross-domain without a postmessage message)
    }

    var message = JSON.parse(messageEvent.data)
    if(message.ready) {
        this.readyCalled = true
        if(this.readyCallback) {
            this.readyCallback()
            this.readyCallback = undefined
        }
    } else if(message.error) {
        throw new Error(message.errorMessage)
    } else {
        var type = message[0] // either 'request', 'response', or 'errorResponse'
        var id = message[1]

        if(type === 'response' || type === 'errorResponse') {
            var reqCallback = this.pendingRequests[id]
            if(reqCallback === undefined) {
                throw new Error("No pending request with id "+id)
            }

            if(type === 'response') {
                var result = message[2]
                reqCallback(undefined, result)
            } else {
                var errMsg = message[2]
                reqCallback(new Error(errMsg))
            }

            delete this.pendingRequests[id]
        } else if(type === 'request') {
            var command = message[2]
            var args = message[3]
            var handler = this.registeredCommands[command]
            if(handler !== undefined) {
                if(args === undefined) {
                    args = []
                } else if(!(args instanceof Array)) {
                    args = [args]
                }

                try {
                    handler.apply(messageEvent, args.concat([function(err, result) {
                        if(err) {
                            if(!(err instanceof Error))
                                throw new Error("Not instance of Error: "+JSON.stringify(err))
                            makeErrorResponse(that, messageEvent.origin, id, err.message)
                        } else {
                            makeResponse(that, messageEvent.origin, id, result)
                        }
                    }]))
                } catch(e) {
                    makeErrorResponse(that, messageEvent.origin, id, "Error completing command - check the console")
                    throw e
                }
            } else {
                makeErrorResponse(that, messageEvent.origin, id, "Unregistered command: '"+command+"'")
            }
        } else {
            throw new Error("Unrecognized message: "+message)
        }
    }
}
Service.prototype.registerCommand = function(name, handler) {
    this.registeredCommands[name] = handler
}

// called only once
Service.prototype.onReady = function(cb) {
    if(this.readyCalled) {
        cb()
    } else {
        this.readyCallback = cb
    }
}
Service.prototype.responseHook = function(cb) {
    this.responseHookHandler = cb
}
Service.prototype.requestHook = function(cb) {
    this.requestHookHandler = cb
}

Service.prototype.request = function(command) {
    var args = Array.prototype.slice.call(arguments, 1, arguments.length-1)
    var cb = arguments[arguments.length-1]

    var id = this.counter
    this.pendingRequests[id] = cb
    this.counter++

    if(this.windowOrigin === undefined) {
        var origin = '*'
    } else {
        var origin = this.windowOrigin
    }

    var request = ['request',id,command,args]
    if(this.requestHookHandler) {
        this.requestHookHandler(request)
    }
    this.window.postMessage(JSON.stringify(request), origin)
}

function makeResponse(that, requestDomain, id, result) {
    if(that.windowOrigin === null) requestDomain = undefined  // for the shared worker
    var response = ['response',id]
    if(result !== undefined) {
        response.push(result)
    }
    sendResponse(that, response, requestDomain)
}
function makeErrorResponse(that, requestDomain, id, message) {
    if(that.windowOrigin === null) requestDomain = undefined  // for the shared worker
    sendResponse(that, ['errorResponse',id,message], requestDomain)
}
function sendResponse(that, response,requestDomain) {
    if(that.responseHookHandler) {
        that.responseHookHandler(response)
    }

    that.window.postMessage(JSON.stringify(response),requestDomain)
}