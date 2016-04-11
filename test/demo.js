
function runDemoCode(guestDomain) {

    var webkey_service = webkeyService.createService(guestDomain) // creates the iframe used to interact with webkey

    window.addEventListener("message", function(message) {
        if(message.origin === guestDomain) {
            webkey_service.handleMessage(message)
        }
    })

    webkey_service.onReady(function() {

        // requestAcceptance creates a popup window, which will likely be blocked unless it happens as a result of user click
        getNode('a').on('click', function() {
            getNode('a').innerText = "Waiting for authorization..."

            webkey_service.requestAcceptance(function(err, acceptanceInfo) {
                if(err) throw err

                getNode('a').innerText = "Logging in..."

                var token = Math.random().toString()
                webkey_service.auth(token, function(err, proof) {
                    getNode('a').innerText = "Logging in... (got proof signature)"
                    console.dir(proof)

                    setTimeout(function() { // do this in a timeout so the above update can be rendered first
                        if(verifyProof(acceptanceInfo.publicKey, token, proof)) {        // WARNING: in a real application, you should verify that user owns that email address
                            getNode('a').innerText = "Logged in!"
                        } else {
                            getNode('a').innerText = "Log in failed : ( . Try again?"
                        }
                    })
                })
            })
        })
    })

    // test verification - IMPORTANT: NEVER VERIFY IN-BROWSER IN A REAL APPLICATION (ie don't trust your client to tell you whether you're logged in), ALWAYS VERIFY SERVER SIDE
    function verifyProof(publicKey, token, proof) {
        var pair = new webkey.utils.rsa({environment: 'browser'})
        pair.importKey(publicKey, 'pkcs8-public')
        return pair.verify(token,proof,'utf8', 'base64')
    }

    function getNode(id) {
        var x = document.getElementById(id)
        x.on = x.addEventListener
        x.off = x.removeEventListener
        return x
    }
}