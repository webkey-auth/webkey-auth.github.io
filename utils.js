
var rsa = require("node-rsa")
var aes = require('aes-js')
var pbkdf2 = require('pbkdf2/browser')

var hours = 1000*60*60
var rsaBits = 1024

var identitiesCache; // keeps the plaintext identities in memory very temporarily (for performance reasons)
var collectionCaches = {} // keeps the plaintext collections in memory very temporarily (for performance reasons)

var utils = exports
exports.rsa = rsa
exports.aes = aes

try {
    if(document.location.protocol !== 'https:') throw new Error(document.location.protocol+" isn't secure - use https only")
    if(scriptOrigin() !== document.location.origin) throw new Error("Don't load webkey.umd.js from an external domain - it is only safe for internal use only!")
} catch(e) {
    if(!(e instanceof ReferenceError)) throw e
    // ignore ReferenceError - Worker and document won't be defined inside a worker
}

exports.changePassword = function(oldPassword, newPassword) {
    localStorage.setItem("salt", createRandomString(128))

    ;["identities", 'origins'].forEach(function(collectionName) {
        var encryptedCollection = localStorage.getItem(collectionName)
        if(encryptedCollection === null) {
            var collection = {}
        } else {
            var collection = getCollection(collectionName, getDerivedKey(oldPassword))
        }

        updateCollection(collectionName, collection, getDerivedKey(newPassword))
    })
}

//var getIdentities = exports.getIdentities = function(password) {
//    if(identitiesCache === undefined) {
//        var identities = localStorage.getItem("identities")
//        if(identities === null) {
//            identitiesCache = []
//        } else {
//            var key = getKey(password)
//            var decryptedIdentities = aesDecrypt(key, identities)
//            identitiesCache = JSON.parse(decryptedIdentities)
//        }
//
//        setTimeout(function() {
//            identitiesCache = undefined // clear the identities from memory as soon as possible
//        },500)
//    }
//
//    return identitiesCache
//}
//function saveIdentities(identities, password) {
//    var key = getKey(password)
//    var encryptedIdentities = aesEncrypt(key, JSON.stringify(identities))
//
//    localStorage.setItem("identities", encryptedIdentities)
//}

exports.createNewIdentity = function(name, email, derivedKey) {
    var pair = new rsa({b: rsaBits, environment: 'browser'})
    var id = Date.now()+createRandomString(5)
    var newIdentity = {id:id, name:name, email:email, keyPair: pair.exportKey('pkcs8')}

    collectionInsert('identities', id, newIdentity, derivedKey)

    return newIdentity
}
exports.createNewOrigin = function(origin, derivedKey, autoAuth, identityId) {
    collectionInsert('origins', origin, {identity:identityId, autoAuth:autoAuth}, derivedKey)
}

var getCollection = exports.getCollection = function(name, derivedKey) {
    if(collectionCaches[name] === undefined) {
        var collection = localStorage.getItem(name)
        if(collection === null) {
            collectionCaches[name] = {}
        } else {
            var decryptedCollection = aesDecrypt(derivedKey, collection)
            collectionCaches[name] = JSON.parse(decryptedCollection)
        }

        setTimeout(function() {
            collectionCaches[name] = undefined // clear the decrypted data from memory pretty quickly
        },500)
    }

    return collectionCaches[name]
}
var updateCollection = exports.updateCollection = function(name, newCollectionData, derivedKey) {
    var encryptedCollection = aesEncrypt(derivedKey, JSON.stringify(newCollectionData))

    localStorage.setItem(name, encryptedCollection)
}
var collectionInsert = exports.collectionInsert = function(collectionName, key, value, derivedKey) {
    var collection = getCollection(collectionName, derivedKey)

    collection[key] = value
    updateCollection(collectionName, collection, derivedKey)

    return value
}
exports.getCollectionItem = function(collectionName, key, derivedKey) {
    var collection = getCollection(collectionName, derivedKey)
    return collection[key]
}

exports.createProof = function(keyPair, token) {
    return keyPair.sign(token,'base64','utf8')
}

//exports.createProofWorker = function(serializedKeyPair, token, callback) {
//    createProofWorker.onmessage = function(result) {
//        callback(undefined, result.data)
//    }
//
//    createProofWorker.postMessage([serializedKeyPair, token])
//}
//
//
//exports.acceptAuthRequest = function(origin, group, token, password, callback) {
//    var start = Date.now()
//
//    if(group === undefined) {
//        group = utils.createNewIdentity('primary', 'me@me.me', password, true)
//        localStorage.setItem(origin, group.id)
//    }
//
//    utils.createProofWorker(group.keyPair, token, function(err, proof) {
//        var keyPair = utils.getKeyPair(group.keyPair)
//        callback(err, {response:'auth', proof:proof, time:(Date.now()-start), publicKey:keyPair.exportKey('pkcs8-public')})
//    })
//}

exports.validatePassword = function(password) {
    var identities = localStorage.getItem("identities")
    var salt = localStorage.getItem("salt")
    var derivedKey = createKey(salt, password)
    var decryptedIdentities = aesDecrypt(derivedKey, identities)

    try {
        JSON.parse(decryptedIdentities)
        return true
    } catch(e) {
        if(e instanceof SyntaxError) {
            return false
        } else {
            throw e
        }
    }
}

//// returns the group for the passed origin
//exports.getIdentity = function(origin,password) {
//    var identities = getIdentities(password)
//    return getIdentityForOrigin(origin, identities)
//}

exports.getKeyPair = function(privateKeyPem) {
    var pair = new rsa({environment: 'browser'})
    pair.importKey(privateKeyPem, 'pkcs8')
    return pair
}

var getDerivedKey = exports.getDerivedKey = function(password) {
    if(password === undefined)
        throw new Error("passwordNeeded")

    var salt = localStorage.getItem("salt")
    return createKey(salt, password)
}

// returns the group for the passed origin
var getIdentityForOrigin = exports.getIdentityForOrigin = function(origins, origin, identities) {
    var identityId = origins[origin]
    for(var n=0;  n<identities.length; n++) {
        if(identities[n].id === identityId)
            return identities[n]
    }
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
function scriptOrigin() {
    var a = document.createElement('a')
    a.href = document.currentScript.src
    return a.origin
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