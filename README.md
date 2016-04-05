**Status**: In review. **NOT production ready.**

`webkey`
=====

Webkey is an RSA based single-click web authentication utility.
It allows a web application to allow users to securely authenticate without sending usernames and passwords.
To authenticate on a new website, on a user click (somewhere on the host page) a request is made (via postmessage) to the webkey guest (hosted in an iframe). A confirmation popup comes up that allows the user to auth (or decide not to).
Subsequent authentications can be done automatically if the user leaves "auto-auth" selected.

Webkey uses RSA generated within the browser itself and stored in an encrypted form in the browsers LocalStorage.
Neither the user's private key nor the passphrase used to encrypt their private key is ever transmitted over the wire - even in encrypted form.


Screenshot goes here
===================

Motivation
==========

Passwords are the weakest link in internet security. People use easy-to-crack passwords, they use the same password on many site, its a security nightmare.
Webkey provides a far more secure and convenient way to authenticate users.
The user can use whatever low-entropy key they want to client-side because that key never leaves their machine.
In cryptography, if an attacker has access to your machine, that's already game over.

Authentication Steps
====================

1. On the **server**, generate a 3-20 character `token` (in string form) and send it to the client
2. On the client, send the `token` into webkey's iframe using the `'auth'` postMessage command
3. On the client, receive the signed token (called the `proof`) from webkey and send that `proof` to the server.
4. On the **server**, verify (the server should *still* have the original `token` - do NOT trust any tokens sent to the server by the client)
5. Profit! Your user's now authenticated!

Client Usage
============

See a demo here: https://webkey-auth.github.io/test/host.html

The bare necessities:
```
<body><div id="a">Click to login</div></body>
<script>
    var guestDomain = "https://webkey-auth.github.io"

    var webkeyFrame = document.createElement('iframe')
    webkeyFrame.src = guestDomain+'/guest.html'
    webkeyFrame.style.display = 'none'

    var token = getTokenFromServer() // the server should send down something like Math.random().toString()
    window.addEventListener("message", function(message){
        if (message.origin !== guestDomain) return // not from the right place

        var response = JSON.parse(message.data)
        if(response.ready) {
            document.getElementById('a').addEventListener('click', function() {
                var webkey = webkeyFrame.contentWindow
                webkey.postMessage(JSON.stringify({c:'auth', token: token}),guestDomain)
            })

        } else if(response.response === 'auth') {
            console.log("Got the proof: ")
            console.dir(response)
            verifyProofOnServer(response.proof)// now send the proof to the server to be verified
        } else {
            console.log(response)
        }
    })

    document.body.appendChild(webkeyFrame)

</script>
```

Commands:

Webkey can respond to only one command at the moment, sent to it via `window.postMessage` like this:

```
webkey.postMessage(JSON.stringify({c: commandName, additional:parameters...}),"https://webkey.github.io/")
```

and webkey will respond with a `window` "message" event with some JSON stringified response data as shown above.

* `{command:'auth', token:_}` - Asks webkey for the user's public key and proof of identity. Response will be `{publicKey:_, proof:_}` where `proof` is the `token` encrypted (aka signed) with the user's private key.

Responses:

* `{response:'auth', accepted: true}` - Tells the host that the user accepted the request and is now creating proof of authentication.
* `{response:'auth', proof:_, email:_, publicKey:_}` - The result of an accepted auth command. The `proof` property will hold the token signed with the user's private key, `email` will hold the user's email.
* `{response:'rejected'}` - The user rejected the auth request.
* `{response:'error', message:_}` - An error response. The message will have some hopefully useful message.

Pages
=======

* guest.html - This provides access to the auth command.
* logout.html - Going to this page "logs you out", so that new auth requests will require password re-entry.

Server Usage
============

I don't recommend anyone host their own webkey server, for the sake of the users.

A. If multiple webkey hosts are floating around the internet, its not really single sign-on anymore. A user will have to type a password once for every different webkey host their websites are using.
B. Also, user experience would be worse since the necessary files would be less likely to be cached.

If you do still want to host your own webkey server, all you have to do is host this repository on any webserver over https.
But, please, think of the users! The only reason is if you don't want to trust me or github.

Trust
======

With security, the question is always "who do I have to trust?"
In this case, there are two relevant people/groups you're trusting by using webkey:

1. Me - as the author, you're trusting me not to maliciously change the code on you
2. Github - Since github is currently hosting this, you have to trust them

Hopefully someday browsers will implement this natively so these two pieces of trust can go away.

Tradeoffs
=========

The user's derived AES key is stored in hashed form via pbkdf2 in browser localStorage
* This means they're on the disk, and that if you don't explicitly log out, they will persist on the disk indefinitely past their expiration date if webkey-auth.github.io isn't accessed by the user for a long time.
    * One workaround might be to require that a user keep a webkey window open, and once that window closes they would be logged out. That window could communicate the user's key via temporary use of localStorage or webRTC.
    * If there was a browser storage method like localStorage that was destroyed on browser-quit - that would be ideal. But to my knowledge, that doesn't exist.
* It might not be so bad since the key needs to be kept in plaintext somewhere or you wouldn't be able to auto-auth. Also, if someone has access to your harddrive, they probably also have access to memory. (Please speak up if you think i'm incorrect here)
* Since the key is derived using pbkdf2, which uses HMAC, the user's key can't be found out (this matters if they're using that key for other things, against recommendations)

Recommendations
===============

### Identity Recovery

Just like you need password recovery when a user loses their password, you need identity recovery when a user loses their rsa keys or is using your website from a new device.
To do identity recovery, simply send that person an email with a link to connect their new public key with their old identity. Remember that users can have multiple public keys (at least one for every device).

### Auth on Multiple Devices

When a user auth's on multiple devices, their email can identify them, but they will have a different public key.
This should work exactly like identity recovery.

Todo
========

* unit tests
* Pub back webworkers - looks like long-running code in an iframe blocks its parent's UI thread
* Import and export rsa keys
* Groups - will allow users to have multiple identities with separate emails and rsa keys
* On setup, allow the user to a "secure image" so there's a visual way to tell that you're using the right service. Mitigates phishing attacks.
* Validation tests - Create some files that developers integrating with webkey can use to verify that they're verifying auth correctly and handling edge cases.

In consideration:
    * Temporary authentication - This would be some way to auth on another person's machine. I think a better way of doing this is that the website send you an email with a temporary auth link, and this wouldn't go through webkey at all.
    * Online key storage - Allow users to save their keys online with a password - making sure to warn them that this means they need to trust
the service to keep your keys safe, since even tho the keys are encrypted its only as strong as their password is, which is
orders of magnitude weaker than the RSA keys.
    * Key syncing between devices - I'm currently thinking this isn't worth doing.

How to Contribute!
============

Anything helps:

* Creating issues (aka tickets/bugs/etc). Please feel free to use issues to report bugs, request features, and discuss changes
* Updating the documentation: ie this readme file. Be bold! Help create amazing documentation!
* Submitting pull requests.

How to submit pull requests:

1. Please create an issue and get my input before spending too much time creating a feature. Work with me to ensure your feature or addition is optimal and fits with the purpose of the project.
2. Fork the repository
3. clone your forked repo onto your machine and run `npm install` at its root
4. If you're gonna work on multiple separate things, its best to create a separate branch for each of them
5. edit!
6. If it's a code change, please add to the unit tests (at test/odiffTest.js) to verify that your change
7. When you're done, run the unit tests and ensure they all pass
8. Commit and push your changes
9. Submit a pull request: https://help.github.com/articles/creating-a-pull-request

Change Log
=========

* 0.0.1 - first commit!

License
=======
Released under the MIT license: http://opensource.org/licenses/MIT
