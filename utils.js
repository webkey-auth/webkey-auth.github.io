
var rsa = require("node-rsa")
var aes = require('aes-js')
var pbkdf2 = require('pbkdf2/browser')

var hours = 1000*60*60
var rsaBits = 1024

var groupsCache; // keeps the plaintext groups in memory very temporarily (for performance reasons)

var utils = exports
exports.rsa = rsa
exports.aes = aes

try {
    var createProofWorker = new Worker("createProofWorker.js")
    if(document.location.protocol !== 'https:') throw new Error(document.location.protocol+" isn't secure - use https only")
} catch(e) {
    if(!(e instanceof ReferenceError)) throw e
    // ignore ReferenceError - Worker and document won't be defined inside a worker
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
    var pair = new rsa({b: rsaBits, environment: 'browser'});

    var groups = getGroups(password)

    var id = Date.now()+createRandomString(5)
    var group = {id: id, name:name, email:email, autoAuth: autoAuth, keyPair: pair.exportKey('pkcs8')}
    groups.push(group)
    saveGroups(groups, password)

    return group
}

exports.createProof = function(keyPair, token) {
    return keyPair.sign(token,'base64','utf8')
}

exports.createProofWorker = function(serializedKeyPair, token, callback) {
    createProofWorker.onmessage = function(result) {
        callback(undefined, result.data)
    }

    createProofWorker.postMessage([serializedKeyPair, token])
}


exports.acceptAuthRequest = function(origin, group, token, password, callback) {
    var start = Date.now()

    if(group === undefined) {
        group = utils.createNewGroup('primary', 'me@me.me', password, true)
        localStorage.setItem(origin, group.id)
    }

    utils.createProofWorker(group.keyPair, token, function(err, proof) {
        var keyPair = utils.getKeyPair(group.keyPair)
        callback(err, {response:'auth', proof:proof, time:(Date.now()-start), publicKey:keyPair.exportKey('pkcs8-public')})
    })
}

exports.validatePassword = function(password) {
    var groups = localStorage.getItem("groups")
    var salt = localStorage.getItem("salt")
    var derivedKey = createKey(salt, password)
    var decryptedGroups = aesDecrypt(derivedKey, groups)

    try {
        JSON.parse(decryptedGroups)
        return true
    } catch(e) {
        if(e instanceof SyntaxError) {
            return false
        } else {
            throw e
        }
    }
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

exports.getKeyPair = function(privateKeyPem) {
    var pair = new rsa({environment: 'browser'})
    pair.importKey(privateKeyPem, 'pkcs8')
    return pair
}

// gets a random string consisting of 0-9, A-Z, and a-p
function createRandomString(length) {
    if(length%2 === 0) {
        var arrayLength = length/2
    } else {
        var arrayLength = length/2+1
    }

    var array = new Uint8Array(arrayLength);
    crypto.getRandomValues(array);

    var chars = []
    array.forEach(function(value, n) {
        var high4Bits = value >> 4
        chars.push(String.fromCharCode(high4Bits+48))
        if(n*2+1 < length) {
            var low4Bits = value & 0x0F
            chars.push(String.fromCharCode(low4Bits+48))
        }
    })

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
//
//function getSalt() {
//    var salt = localStorage.getItem("salt")
//    if(salt === null) {
//        salt = createRandomString(128)
//        localStorage.setItem("salt", salt)
//    }
//
//    return salt
//}