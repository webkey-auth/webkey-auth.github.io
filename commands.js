var webkeyUtils = require('./utils')

var currentlyAuthing = false
exports.handle = function(message, getAcceptance, getPassword) {
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

                var onAccept = function() {
                    message.source.postMessage(JSON.stringify({response: 'auth', accepted:true}), message.origin);
                }

                auth(message.origin, params.token, getAcceptance, getPassword, onAccept, callback)
            } else if(message.origin === document.location.origin) {
                if(params.c === 'getAcceptance') {
                    getAcceptance(function(err) {
                        if(err) callback(err)
                        else    callback(undefined, {response: 'getAcceptance', accepted: true})
                    })
                } else if(params.c === 'getPassword') {
                    getPassword(function(err, password) {
                        if(err) callback(err, password)
                        else    callback(undefined, {response: 'getPassword', password: password})
                    })
                }
            } else {
                throw new Error("Invalid command: '"+params.c+"'")
            }
        }
    } catch(e) {
        callback(undefined, {response:'error', message: e.message})
        console.log(e.stack)
    }
}

function auth(origin, token, getAcceptance, getPassword, onAccept, callback) {

    var getProof = function(password) {
        var group = webkeyUtils.getGroup(origin, password)
        if(group !== undefined && group.autoAuth) {
            onAccept()
            webkeyUtils.acceptAuthRequest(origin, group, token, password, callback)
        } else {
            getAcceptance(function(err) {
                if(err) callback(err)
                onAccept()
                webkeyUtils.acceptAuthRequest(origin, group, token, password, callback)
            })
        }
    }

    try {
        getProof()
    } catch(e) {
        if(e.message === "passwordNeeded") {
            return getPassword(function(err, password){
                if(err) callback(err)
                getProof(password)
            })
        } else {
            throw e
        }
    }
}