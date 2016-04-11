var Service = require("./Service")

var guestDomainDefault = "https://webkey-auth.github.io"

exports.createService = function(guestDomain) {
    if(guestDomain === undefined) guestDomain = guestDomainDefault

    var webkeyFrame = document.createElement('iframe')
    webkeyFrame.src = guestDomain+'/guest.html'
    webkeyFrame.style.display = 'none'
    document.body.appendChild(webkeyFrame)

    return new Service(webkeyFrame.contentWindow)
}