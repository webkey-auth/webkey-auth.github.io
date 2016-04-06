**Status**: In review. **NOT production ready.**

`webkey`
=====

Webkey is an RSA based single-click web authentication utility.
It allows a web application to allow users to securely authenticate without sending usernames and passwords.
To authenticate on a new website, on a user click (somewhere on the host page) a request is made (via postmessage) to the webkey guest (hosted in an iframe). A confirmation popup comes up that allows the user to auth (or decide not to).
Subsequent authentications can be done automatically if the user leaves "auto-auth" selected.

Webkey uses RSA generated within the browser itself and stored in an encrypted form in the browsers LocalStorage.
Neither the user's private key nor the passphrase used to encrypt their private key is ever transmitted over the wire - even in encrypted form.

<Screenshot goes here>

Motivation
==========

Passwords are the weakest link in internet security. People use easy-to-crack passwords, they use the same password on many site, its a security nightmare.
Webkey provides a far more secure and convenient way to authenticate users.
The user can use whatever low-entropy key they want to client-side because that key never leaves their machine.
In cryptography, if an attacker has access to your machine, that's already game over.

### Why not mutual ssl client-side certificates?

Browsers have absolutely awful UI for client-side certs, which is why almost [no one uses them](https://web.archive.org/web/20160304045556/http://pilif.github.io/2008/05/why-is-nobody-using-ssl-client-certificates/).
While mutual ssl certs can be password protected, the UI doesn't encourage it. By contrast, webkey requires it.
Where mutual ssl certs are confusing for normal users to manage, webkey isn't.
The advantages of client-side certs is that it has access to a secure store (webkey currently has to use localStorage), it uses a clearly non-webpage UI and so has a marginally lower chance of successful phishing attacks, and its faster.
But since browser client-side certs have failed to make headway thus far, usability is a huge security win because it means people will actually do the more secure thing.

### Why not Oauth?

[Oauth](http://stackoverflow.com/questions/4727226/on-a-high-level-how-does-oauth-2-work) is really all about giving restricted access to your account to a third party.
Webkey is only about identifying and authenticating a user. Its much less complicated.

With oauth, even if you 100% trust your oauth provider (which you still have to do with webkey), you still have to give your oauth provider a username and password.
Its ironic that the same "password-antipattern" that oauth solves itself has to use the password anti-pattern.
Webkey also requires a password, but that password is never sent over the internet and webkey doesn't make you input a username - one less thing to type in and think about for users.

And oauth is a complicated protocol with a lot of moving parts and multiple flows. Webkey has one flow and no private credentials being passed around.
There's a reason we use ssh keys for terminal access and not oauth.

Also, a lot of people just don't want google and facebook to manage their identities.
Some people don't want google or facebook to know what websites they go to for example.
And yet people still use oauth because they hate remembering and entering passwords.
As a statically hosted open-source application, webkey can solve both problems.

### Why not `%3Ckeygen>`

The keygen html5 tag is [deprecated](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen).

Authentication Steps
====================

1. On the client, request the user's acceptance (`requestAcceptance` command) and send the resulting email and public key to the server
2. On the **server**,
    * if that email is not already in the system with that public key, send them a verification email (if you want) and once verified, associate the email and public key in your database and skip to step 7
    * if that email *is* in the system with that public key, continue to step 3
3. On the **server**, generate a 16-32 character `token` (in string form) and send it to the client
4. On the client, send the `token` into webkey's iframe using the `'auth'` postMessage command
5. On the client, receive the signed token (called the `proof`) from webkey and send that `proof` to the server.
6. On the **server**, verify that the token with the given public key (the server should *still* have the original `token` - do NOT trust any tokens sent to the server by the client)
7. Profit! Your user's now authenticated!

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

    var token = getTokenFromServer()               // the server should send down something like Math.random().toString()
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
            verifyProofOnServer(response.proof)    // now send the proof to the server to be verified
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

**requestAcceptance**:
Request: `{command:'requestAcceptance'}` - Asks webkey for the user's public key and proof of identity. Response will be `{publicKey:_, proof:_}` where `proof` is the `token` encrypted (aka signed) with the user's private key.
Success response:

**auth**:
Request: `{command:'auth', token:_}` - Asks webkey for the user's public key and proof of identity. Response will be `{publicKey:_, proof:_}` where `proof` is the `token` encrypted (aka signed) with the user's private key.
Responses:
* `{response:'auth', accepted: true, email:_, publicKey:_}` - Tells the host that the user accepted the request.
* `{response:'auth', proof:_}` - The result of an accepted auth command. The `proof` property will hold the token signed with the user's private key, `email` will hold the user's email.
Errors:
* `message: 'rejected'` - The user rejected the auth request.

Errors:

Error responses have the following form:

`{response:'error', message:_}` - The message will have some hopefully useful message.

Other Messages:

* `{ready:true}` - Sent by webkey when the page is ready to receive commands

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

1. Github - Since github is currently hosting this, you have to trust them
2. Me - as the author, you're trusting me not to maliciously change the code on you. However you don't have to trust me *as much* since the repo is open source and github will keep a record of all changes to the site.

Hopefully someday browsers will implement this natively so these two pieces of trust can go away.

Tradeoffs
=========

The user's auth is stored permanently somewhere on the machine, rather than being permanently stored only in a person's head like a password.
* This makes webkey more vulnerable to brute force and heuristic attacks than server-based password auth. Using an additional PIN can mitigate this.

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

Note that sending to a person's email address is only *one* way of doing this.
Webkey will always give authed apps an email address, but an applications is, of course, free to ask for any other type of 2nd factor authentication they want to, including phone numbers, oauth, security questions, or whatever.

### Auth on Multiple Devices

When a user auth's on multiple devices, their email can identify them, but they will have a different public key.
This should work exactly like identity recovery.

### Additional security

Since brute force attacks are far more unlikely to succeed on servers that limit the number of password attempts for a user,
a PIN can provide additional security that covers this drawback of webkey.

### Login / Sign Up

An application won't know whether the user has authed with that application before they request auth, so the best messaging to the user is probably to include both in the same button: "Login/Sign-up".

Browser features I wish existed
===============================

1. #1 is obviously native webkey. Since browser client-side certs aren't in a usable state at the moment, if they were, webkey wouldn't even be necessary.
2. Secure in-memory storage. I wish this had gotten off the ground: https://www.nczonline.net/blog/2010/04/13/towards-more-secure-client-side-data-storage/

What about NCC Group's "Javascript Cryptography Considered Harmful" article?
============================================================================

Man have I seen a link to [this article](https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2011/august/javascript-cryptography-considered-harmful/) a lot lately.
Here are its arguments distilled down:

1. Secure delivery of javascript over SSL is "hard" - "You have to send all the page contentover SSL/TLS. Otherwise, attackers will hijack the crypto code"
2. Page resources loaded from various places around the internet can change the execution environment, including crypto functions
3. Lack of systems programming primitives needed to implement crypto, like a secure random number generator, secure erase, a secure keystore, and "functions with known timing characteristics".
4. The ability to reliably identify which clients can be safely communicated with "is unsolved even in the academic literature"
5. The ability to fall back on a worse-but-acceptable solution implies that you should just always use that worse solution.

I should note that the article considers non-browser javascript "perilous, but not doomed" - ie not considered necessarily harmful.

I'll take these point. If I've missed any points from the article in my above list, please let me know.

1. Webkey sends all its page content over SSL, just like that page says you need to.
2. Webkey doesn't load any external resources, so there's no uncontrolled code that could change the execution environment unless github.com itself decided to hijack webkey.
3. Its not 2011 anymore. Javascript now has a [secure random number generator](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues) and various cryptography functions implemented natively and accessible via the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
And a secure keystore can be created by keeping a window open and using a [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker).
Javascript still doesn't have secure erase, but this has the same security implications with your usernames and passwords as it does for `webkey` key-pairs.
So if anything, webkey is at worst just as bad as current username/password solutions in this regard.
4. An application server using webkey can verify that a client can be safely communicated with by virtue of the client sending back a signature verifiable on the server. Perhaps I'm misunderstanding what exactly is "unsolved even in the academic literature", so I'd appreciate some clarification there.
5. Worse options are worse, even in security. In this case, not only is the worse option (username/password auth) less secure, but its also less convenient for users. I think this is the only argument in that article that I don't think holds any water even in the world of 2011 javascript crytpo.

In short, there are no valid arguments in that article that make webkey less secure than traditional username/password auth.

Todo
========

* Use a SharedWorker to keep the key in memory. The key will be automatically gone if the browser or all the tabs are closed.
* unit tests
* Import and export rsa keys
* Groups - will allow users to have multiple identities with separate emails and rsa keys
* On setup, allow the user to a "secure image" so there's a visual way to tell that you're using the right service. Mitigates phishing attacks.
* Validation tests - Create some files that developers integrating with webkey can use to verify that they're verifying auth correctly and handling edge cases.
* Once `crypto.subtle` becomes more widely available, use those methods instead of the user-space libraries (for speed and probably security)
* Add helper functions to

In consideration:

* Temporary authentication - This would be some way to auth on another person's machine. I think a better way of doing this is that the website send you an email with a temporary auth link, and this wouldn't go through webkey at all.
* Key syncing between devices - I'm currently thinking this isn't worth doing.
* Online key storage - Allow users to save their keys online with a password - making sure to warn them that this means they need to trust
the service to keep your keys safe, since even tho the keys are encrypted its only as strong as their password is, which is
orders of magnitude weaker than the RSA keys. Also don't think this is worth it.
* A command that allows the application to ask if the user has authed with this site before

How to Contribute!
============

I'm looking for contributors, especially security experts. Please create an issue or contact me some other way if you'd like to contribute.

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
