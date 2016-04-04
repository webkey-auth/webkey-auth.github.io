
var rsa = require("node-rsa")
var aes = require('aes-js')
var pbkdf2 = require('pbkdf2/browser')

var hours = 1000*60*60

var keyCache;    // keeps the derived key in memory for the user specified time
var groupsCache; // keeps the plaintext groups in memory very temporarily (for performance reasons)

var utils = exports

try {
    var createProofWorker = new Worker("createProofWorker.js")
} catch(e) {
    if(!(e instanceof ReferenceError)) throw e
    // ignore ReferenceError - Worker won't be defined inside a worker
}

exports.changePassword = function(oldPassword, newPassword) {
    var groups = getGroups(oldPassword)
    localStorage.setItem("salt", createRandomString(128))
    localStorage.setItem("key", JSON.stringify({derived: getKey(newPassword), expires:Date.now()+24*7*hours}))
    saveGroups(groups, newPassword)
}

var getGroups = exports.getGroups = function(password) {
    if(groupsCache === undefined) {
        var groups = localStorage.getItem("groups")
        if(groups === null) {
            groupsCache = []
        } else {
            var key = getKey(password)
            var decryptedGroups = aesDecrypt(key, groups)
            groupsCache = JSON.parse(decryptedGroups)
        }

        setTimeout(function() {
            groupsCache = undefined // clear the groups from memory as soon as possible
        },500)
    }

    return groupsCache
}

exports.createNewGroup = function(name, email, password, autoAuth) {
    var pair = new rsa({b: 512, environment: 'browser'});

    var groups = getGroups(password)

    var id = Date.now()+createRandomString(5)
    var group = {id: id, name:name, email:email, autoAuth: autoAuth, keyPair: pair.exportKey('pkcs8')}
    groups.push(group)
    saveGroups(groups, password)

    return group
}

exports.createProof = function(keyPair, origin, token) {
    var pair = new rsa({environment: 'browser'})
    pair.importKey(keyPair, 'pkcs8')
    return pair.sign(token,'base64','utf8')
}

exports.createProofWorker = function(keyPair, origin, token, callback) {
    createProofWorker.onmessage = function(result) {
        callback(undefined, result)
    }

    createProofWorker.postMessage([keyPair, origin, token])
}


exports.acceptAuthRequest = function(origin, group, token, password, callback) {
    var start = Date.now()

    if(group === undefined) {
        group = utils.createNewGroup('primary', 'me@me.me', password, true)
        localStorage.setItem(origin, group.id)
    }

    utils.createProofWorker(group.keyPair, origin, token, function(err, proof) {
        alert("took: "+(Date.now()-start)+'ms')
        callback(err, {response:'auth', proof:proof})
    })
}


// returns the group for the passed origin
var getGroup = exports.getGroup = function(origin,password) {
    var groupId = localStorage.getItem(origin)

    var groups = getGroups(password)
    for(var n=0;  n<groups.length; n++) {
        if(groups[n].id === groupId)
            return groups[n]
    }
}

function createRandomString(length) {
    var possible = 122-48
    var chars = []
    for(var n=0; n<length; n++) {
        chars.push(String.fromCharCode(Math.floor(Math.random() * possible)+48))
    }

    return chars.join('')
}

function saveGroups(groups, password) {
    var key = getKey(password)
    var encryptedGroups = aesEncrypt(key, JSON.stringify(groups))

    localStorage.setItem("groups", encryptedGroups)
}

function aesEncrypt(key, text) {
    var textBytes = aes.util.convertStringToBytes(text)
    var encryptedBytes = new aes.ModeOfOperation.ctr(key).encrypt(textBytes)
    return encryptedBytes.toString('base64')
}

function aesDecrypt(key, encryptedText) {
    var encryptedBytes = new Buffer(encryptedText,'base64')
    var decryptedBytes = new aes.ModeOfOperation.ctr(key).decrypt(encryptedBytes)
    return aes.util.convertBytesToString(decryptedBytes);
}

function createKey(salt, password) {
    return pbkdf2.pbkdf2Sync(password, salt, 5, 256 / 8, 'sha512')
}
function getKey(password) {
    var key = localStorage.getItem("key")
    if(key !== null) {
        var key = JSON.parse(key)
    }

    if(key === null || key.expires < Date.now()) {
        if(password === undefined)
            throw new Error("passwordNeeded")

        var salt = localStorage.getItem("salt")
        key = {derived:createKey(salt, password),expires:Date.now()+24*7*hours}
        localStorage.setItem("key", JSON.stringify(key))
    }

    return key.derived
}

//var proof = exports.createProof(origin, token)
//console.log(proof)
//
//    var group = getGroup(origin, password)
//    var pair = new rsa({environment: 'browser'})
//    pair.importKey(group.keyPair, 'pkcs8')
//    var x=pair.verify(token,proof,'utf8', 'base64')
//    console.log(x)