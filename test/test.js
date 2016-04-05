

var webkeyFrame = document.createElement('iframe')

var token = Math.random().toString()
window.addEventListener("message", function(message){
    if (message.origin !== guestDomain) return // not from the right place

    var response = JSON.parse(message.data)
    if(response.ready) {
        document.getElementById('a').addEventListener('click', function() {
            var webkeyWindow = webkeyFrame.contentWindow
            webkeyWindow.postMessage(JSON.stringify({c:'auth', token: token}),guestDomain)
        })

    } else if(response.response === 'auth') {
        if(response.accepted) {
            document.getElementById('a').innerText = "Logging in..."
        } else {
            console.log("Got the proof: ")
            console.dir(response)

            // test verification - IMPORTANT: NEVER VERIFY IN BROWSER IN A REAL APPLICATION (ie don't trust your client to tell you whether you're logged in, always verify server-side)
            var pair = new webkey.utils.rsa({environment: 'browser'})
            pair.importKey(response.publicKey, 'pkcs8-public')
            var x = pair.verify(token,response.proof,'utf8', 'base64')
            if(x) {
                document.getElementById('a').innerText = "Logged in!"
                document.getElementById('logout').style.display = "block"
            } else {
                document.getElementById('a').innerText = "Log in failed : ( . Try again?"
            }
        }
    } else {
        console.log(response)
    }
})

document.getElementById('logout').addEventListener('click', function() {
    var logoutFrame = document.createElement('iframe')
    logoutFrame.src = guestDomain+'/logout.html'
    logoutFrame.style.display = 'none'
    document.body.appendChild(logoutFrame)

    document.getElementById('logout').style.display = "none"
    document.getElementById('a').innerText = "Click me to log in"
})


webkeyFrame.src = guestDomain+'/guest.html'
webkeyFrame.style.display = 'none'
document.body.appendChild(webkeyFrame)