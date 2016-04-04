var webkeyUtils = require('./utils')

var password = "mypassword" // todo: remove this

var currentlyAuthing = false
exports.handle = function(message, getAcceptance) {
    var callback = function(error, response) {
        message.source.postMessage(JSON.stringify(response), message.origin);
        currentlyAuthing = false
    }

    try {
        var params = JSON.parse(message.data)
        if(params.response === undefined && params.ready === undefined) { // ignore responses and the 'ready' message here (responses will be handled somewhere else
            if(params.c === 'auth') {
                if(currentlyAuthing) return // ignore, we're already handling it bro, calm yourself
                currentlyAuthing = true
                auth(message.origin, params.token, getAcceptance, callback)
            } else if(params.c === 'getAcceptance' && message.origin === document.location.origin) {
                getAcceptance(function(err) {
                    if(err) callback(err)
                    else    callback(undefined, {response: 'getAcceptance', accepted: true})
                })
            } else {
                throw new Error("Invalid command: '"+params.c+"'")
            }
        }
    } catch(e) {
        callback(undefined, {response:'error', message: e.message})
        console.log(e.stack)
    }
}

function auth(origin, token, getAcceptance, callback) {

    var getProof = function(password) {
        var group = webkeyUtils.getGroup(origin, password)
        if(group !== undefined && group.autoAuth) {
            webkeyUtils.acceptAuthRequest(origin, group, token, password, callback)
        } else {
            getAcceptance(function(err) {
                if(err) callback(err)
                webkeyUtils.acceptAuthRequest(origin, group, token, password, callback)
            })
        }
    }

    try {
        getProof()
    } catch(e) {
        if(e.message === "passwordNeeded") {
            return getProof(password)
        } else {
            throw e
        }
    }
}