importScripts("dist/webkey.umd.js")

onmessage = function(e) {
    var serializedKeypair = e.data[0]
    var token = e.data[1]

    var keyPair = webkey.utils.getKeyPair(serializedKeypair)
    var result = webkey.utils.createProof(keyPair, token)
    postMessage(result)
}
