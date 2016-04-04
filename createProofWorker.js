importScripts("dist/webkey.umd.js")

onmessage = function(e) {
    var result = webkey.utils.createProof.apply(this, e.data)
    postMessage(result)
}
