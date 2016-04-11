**Status**: In review. **NOT production ready.**

`webkey`
=====

Webkey is an RSA based single-click web authentication utility.
It allows a web application to allow users to securely authenticate without sending usernames and passwords.
To authenticate on a new website, on a user click (somewhere on the host page) a request is made (via postmessage) to the webkey guest (hosted in an iframe).
A confirmation popup comes up that allows the user to auth (or decide not to).
After confirming, the user leaves that popup open to keep their key unlocked in-memory,
which allows the user to accept auth from other websites as well as allowing subsequent authentications on already-authed sites to be done automatically if the user leaves "auto-auth" selected during the original auth acceptance.

Webkey uses RSA generated within the browser itself and stored in an encrypted form in the browsers LocalStorage.
Neither the user's private key nor the passphrase used to encrypt their private key is ever transmitted over the wire - even in encrypted form.

<Screenshot goes here>

Motivation
==========

Webkey is intended as a replacement for traditional username/password auth.

Passwords are the weakest link in internet security. People use easy-to-crack passwords, they use the same password on many sites.
Because of this, even if you store passwords hashed correctly in your database, an insecure website where the user used the same password can compromise your customer's accounts.
Its a security nightmare.

Webkey provides a far more secure and convenient way to authenticate users.
The user can use whatever low-entropy key they want to client-side because that key never leaves their machine.
In cryptography, if an attacker has access to your machine, that's already game over.

### Why not mutual ssl client-side certificates?

Browsers have absolutely [awful UI](http://www.browserauth.net/tls-client-authentication) for client-side certs, which is why almost [no one uses them](https://web.archive.org/web/20160304045556/http://pilif.github.io/2008/05/why-is-nobody-using-ssl-client-certificates/).
While mutual ssl certs can be password protected, the UI doesn't encourage it. By contrast, webkey requires it.
Where mutual ssl certs are confusing for normal users to manage, webkey isn't.
While client-certs have no built-in way of connecting multiple devices, webkey does (by requiring a common identifier - the user's email).

The advantage of client-side certs is that it uses a clearly non-webpage UI and so has a marginally lower chance of successful phishing attacks, it probably does secure erase, and its faster.
But since browser client-side certs have failed to make headway thus far, usability is a huge security win because it means people will actually do the more secure thing - cert based auth rather than password based auth.

### Why not Oauth?

[Oauth](http://stackoverflow.com/questions/4727226/on-a-high-level-how-does-oauth-2-work) is really all about giving restricted access to your account to a third party.
Webkey is only about identifying and authenticating a user. Its much less complicated, but essentially a different problem. Oauth could use webkey to implement the end-user authentication rather than username/password credentials.

With oauth, even if you 100% trust your oauth provider (which you still have to do with webkey), you still have to give your oauth provider a username and password.
Its ironic that the same "password-antipattern" that oauth solves itself has to use the password anti-pattern.
Webkey also requires a password, but that password is never sent over the internet and webkey doesn't make you input a username - one less thing to type in and think about for users.

And oauth is a complicated protocol with a lot of moving parts and multiple flows. Webkey has one flow and no private credentials being passed around.
There's a reason we use ssh keys for terminal access and not oauth.

Also, a lot of people just don't want google and facebook to manage their identities.
Some people don't want google or facebook to know what websites they go to for example.
And yet people still use oauth because they hate remembering and entering passwords.
As a statically hosted open-source application, webkey can solve both problems.

### Why not the `keygen` html5 tag?

The keygen html5 tag is [deprecated](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/keygen).

Client Usage
============

See a demo here: https://webkey-auth.github.io/test/host.html

The bare necessities:
```
<body><div id="a">Click to login</div></body>
<script src="https://webkey-auth.github.io/dist/webkeyService.umd.js"></script>
<script>
    // creates the iframe used to interact with webkey - nothing is stored in a way that the application host domain can directly access
    var webkey = webkeyService.createService()

    window.addEventListener("message", function(message) {
        if(message.origin === "https://webkey-auth.github.io") {
            webkey.handleMessage(message)
        }
    })

    webkey.onReady(function() {

        // requestAcceptance creates a popup window, which will likely be blocked unless it happens as a result of user click
        document.getElementById('a').addEventListener('click', function() {

            webkey.requestAcceptance(function(err, email, publicKey) {
                getTokenFromServer(email, publicKey, function(err, token){

                    // the server should send down a token like Math.random().toString()
                    webkey.auth(token, function(err, proof) {
                        verifyProofOnServer(proof)    // now send the proof to the server to be verified
                    })

                })
            })

        }) // fun fact: use bluebird promises to avoid callback hell

    })
</script>
```

###Authentication Steps

1. On the client, request the user's acceptance (`requestAcceptance` method) and send the resulting email and public key to the server
2. On the **server**,
    * if that email is not already in the system with that public key, send them a verification email (if you want) and once verified, associate the email and public key in your database and skip to step 7
    * if that email *is* in the system with that public key, continue to step 3
3. On the **server**, generate a 16-32 character `token` (in string form) and send it to the client
4. On the client, send the `token` into webkey's iframe using the `auth` method
5. On the client, receive the signed token (called the `proof`) from webkey and send that `proof` to the server.
6. On the **server**, verify that the `proof` signature matches with the `token` and the user's public key (the server should *still* have the original `token` - do NOT trust any tokens sent to the server by the client)
7. Profit! Your user's now authenticated!

### `webkeyService` API:

`var webkey = createService()` - Creates an abstract service you can use to access the webkey utility (an iframe under the hood). The iframe allows restricted access to a limited set of commands issued via `postMessage` - localStorage is only used in the `https://webkey-auth.github.io` domain.

`webkey.handleMessage(message)` - Handles a message from webkey. The `message` argument should be a message from `window.addEventListener('message',cb)`.

`webkey.onReady(errback)` - The callback is called once the underlying service is ready to be called. The `requestAcceptance` and `auth` methods should only be done after the `onReady` callback is called. The callback will only called one time.

* `errback(error)` - An error "unsupported" will be passed as the first parameter if the browser environment doesn't support webkey.

`webkey.requestAcceptance(errback)` - Requests that the user accept authing the current domain.
 * `errback(error, info)` - Called when the user accepts or rejects authing. The `error` will be an error object. The `info` argument will be an object with the form `{email:_, publicKey:_}`

`webkey.auth(token, errback)` - Requests a token signature from webkey. This should only be called after a successful `requestAcceptance` call.
 * `errback(error, proof)` - Called when the proof has been created. Error will be an error object.

Errors:
* 'rejected'` - The user rejected the `requestAcceptance` request. Note that `auth` can also see this error if the user closes the webkey window before the proof has been sent.

### Pages

* guest.html - This provides access to the auth command.

Server Usage
============

I don't recommend anyone host their own webkey server, for the sake of the users.

A. If multiple webkey hosts are floating around the internet, its not really single sign-on anymore. A user will have to type a password once for every different webkey host their websites are using.
B. Also, user experience would be worse since the necessary files would be less likely to be cached.

If you do still want to host your own webkey server, all you have to do is host this repository on any webserver over https.
But, please, think of the users! The only reason is if you don't want to trust me or github.

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
It's important that failed PIN attempts be limited (eg 5 attempts per minute) and tracked (so that too many attempts triggers an account lock and escalation).

### Login / Sign Up

An application won't know whether the user has authed with that application before they request auth, so the best messaging to the user is probably to include both in the same button: "Login/Sign-up".

How Webkey Works
================

There are a couple different important actors in webkey's flow:
A. *Application server* - The server who's services the user is trying to authenticate for.
B. *Application client* - The local browser page used as an interface to the application server.
C. *Webkey service* - The local browser page that does all the webkey security processes.
D. *Webkey popup* - The local browser page that asks for any user-input.
E. *Webkey SharedWorker* - The [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) that keeps decrypted RSA keys in memory and creates signatures.

The *webkey service* is run locally in the browser as a page loaded in an iframe.
The *Webkey popup* is also run locally in the browser as a popup window.
The *Webkey SharedWorker* is a SharedWorker shared by the the *webkey service* and *webkey popup*.
The *webkey service*, *webkey popup*, and *Webkey SharedWorker* are in a domain that is inaccessible to the *application client* or *application server* (ie `https://webkey-auth.github.io`) and loaded via SSL.
This domain separation is important because it means localStorage and the SharedWorker's memory space is inaccessible from pages running in the client's browser outside of the separate domain (again ie `https://webkey-auth.github.io`)

The user creates an identity with an email and a password.
The *webkey service* directs the user's browser to create an RSA keypair to go along with the email,
encrypts that data using AES and a pbkdf2 key derived from the user's password, and stores that encrypted data in localStorage (again, under the `https://webkey-auth.github.io` domain).

When the first website requests user authentication, a popup in the `https://webkey-auth.github.io` domain comes up asking for the user's password.
When the user puts in their password, it's used to decrypt the user's private key from localStorage and that private key is given
to a [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) which keeps the decrypted key for as long as the webkey popup remains open.
The user can then choose to auth with the website requesting it (or reject it) with any identity they've created.

When a user first accepts authing for a website, webkey sends the user's email and public key for their chosen identity to the *application server*, which records both.
It is recommended that the *application server* verify that the user owns that email address.

Regardless of whether the auth request is first-time or not, the *application server* must validate that the user owns the private key associated with the passed public key by doing the following.
The *application server* creates a secret ephemeral token and sends it to the *application client*, which sends it to the *webkey service*, which in turn sends it to the *webkey SharedWorker*.
The *webkey SharedWorker* then signs the token with the RSA private key associated with the user's chosen identity and sends that token all the way back up the chain to the *application server*
The *application server* then validates that the signature matches with the secret token and the user's recorded public key.
At that point, the user is authenticated.

On-close of the *webkey popup*, on browser crash, or on machine crash, the decrypted key is destroyed (since it was only ever stored in memory - see ''caveats'' for the execption to this in browsers that don't support SharedWorkers).

### Data transfer diagrams

Note that `App Client` is the only page operating outside of a webkey domain.

```
Request Acceptance:

      ,----------.        ,---------.              ,----------------.                           ,--------.
      |App Client|        |WK Guest |              |WK Shared Worker|                           |WK Popup|
      `----+-----'        `-----+---'              `-----+----------'                           `-----+--'
           |   acceptance()     |                        |                                            |
           | ------------------->  acceptanceFor(origin) |                                            |
           |                    | -----------------------> <|                                         |
          *?*                  *?*                      *?* |                                        *?*
           .                    .                        .  |                                         .
           .                    .       ... Need Popup ...  |                                         .
           .                    .                        .  |                                         .
           .                    .                        .  |                                         .
           |                    |  acceptanceFor(origin) |  |                                         |
           |                    | -----------------------> <|                                         |
          *?*                  *?*                      *?* |                                        *?*
           |                    |                        |  |    data()                               |
           |                    |                        | -|----------------------------------------->
           |                    |                        |  |                                         |
           |                    |                        |  |           [drvdKey,idents,origins]      |
           |                    |                        <--|---------------------------------------- |
          *?*                  *?*                      *?* |                                        *?*
           |                    |                        |  | acceptanceFor(orgn,drvKey,idns,orgns)   |
           |                    |                        | -|--------------------------------------> <|
          *?*                  *?*                      *?* |                                        *?* |
           |                    |                        |  |                 [Error: rejected]       |  |
           |                    |    [Error: rejected]   <------------------------------------------- | <|
           |  [Error: rejected] <----------------------- | <|                                         |  |
           <------------------- |                        |  |                                         |  |
          *?*                  *?*                      *?* |                                        *?* |
           |                    |                        |  |                 [email,publicKey]       |  |
           |                    |                        <--|---------------------------------------- | <|
          *?*                  *?*                      *?* |                                        *?*
           |                    |    [email,publicKey]   |  |                                         |
             [email,publicKey]  <----------------------- | <|                                         |
           <------------------- |                        |                                            |


Auth

      ,----------.        ,---------.              ,----------------.                     ,--------.
      |App Client|        |WK Guest |              |WK Shared Worker|                     |WK Popup|
      `----+-----'        `-----+---'              `-----+----------'                     `-----+--'
           |   auth(token)      |                        |                                      |
           | ------------------->   proof(origin)        |                                      |
           |                    | -----------------------> <|                                   |
          *?*                  *?*                      *?* |                                  *?*
           .                    .                        .  |                                   .
           .                    .         ... Need Popup ...|                                   .
           .                    .                        .  |                                   .
           .                    .                        .  |                                   .
           |                    |   proof(origin)        |  |                                   |
           |                    | -----------------------> <|                                   |
          *?*                  *?*                      *?* |                                  *?*
           |                    |                        |  |      data()                       |
           |                    |                        | -|----------------------------------->
           |                    |                        |  |                                   |
           |                    |                        |  |       [drvdKey,idents,origins]    |
           |                    |                        <--|---------------------------------- |
           |                    |              [proof]   |  |                                   |
                       [proof]  <----------------------- | <|                                   |
           <------------------- |                        |                                      |


Need Popup:

      ,----------.        ,---------.              ,----------------.                     ,--------.
      |App Client|        |WK Guest |              |WK Shared Worker|                     |WK Popup|
      `----+-----'        `-----+---'              `-----+----------'                     `-----+--'
           |                    |                        |                                      |
           |                    |   [Error: needPopup]   |                                      |
           |                    <----------------------- |                                      |
           |              (opens popup)                  |                                      |
           |                    |    waitForPopup        |                                      |
           |                    | ----------------------->             registerAsPopup()        |
           |                    |                        <------------------------------------- |
           |                    |                        | ------------------------------------->
           |                    <----------------------- |                                      |


```


Trust
======

With security, the question is always "who do I have to trust?"
In this case, there are two relevant people/groups you're trusting by using webkey:

1. Github - Since github is currently hosting this, you have to trust them to not be comprommised.
2. Webkey maintainers - By using webkey, you're trusting the maintainers not to maliciously change the code on you. However you don't have to trust the maintainers *as much* since the repo is open source and github will keep a record of all changes to the site - you at least can know the site hasn't been compromised in the past.

Hopefully someday browsers will implement this UI natively so these two pieces of trust can go away.

Caveats
=========

The user's private rsa keys are stored permanently somewhere on the machine's disk (via localStorage), rather than being permanently stored only in a person's head like a password.
In the case that the user's machine has been permanently stolen, webkey by-itself is more vulnerable to brute force and heuristic attacks than server-based password auth (*on the other hand, if the machine only has a program installed on it without the user's knowledge, username/password auth is no better*).
Using an additional short 4-number PIN can mitigate this.

On browsers that don't support SharedWorkers (ahem IE), the user's RSA keys are transferred using localStorage, and so may get onto the disk briefly, and could stay on the disk indefinitely if the user's machine is unsafely powered off at the wrong moment.

Because javascript doesn't have a way to ensure that data has been erased, data might persist in memory until the machine is shut down.
This is also a problem for traditional auth using username/password credentials.

Browser features I wish existed
===============================

1. #1 is obviously native webkey. Since browser client-side certs aren't in a usable state at the moment, if they were, webkey wouldn't even be necessary.
2. Secure in-memory storage. I wish [this secure storage idea](https://www.nczonline.net/blog/2010/04/13/towards-more-secure-client-side-data-storage/) had gotten off the ground so I didn't have to use `SharedWorkers` as an in-memory storage. Better yet, it would be amazing if computers came standard with an HSM that could be accessed via javascript in a domain-segmented way.

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

I'll take these point by point. If I've missed any points from the article in my above list, please let me know.

1. Webkey sends all its page content over SSL, just like that article says you need to.
2. Webkey doesn't load any external resources, so there's no uncontrolled code that could change the execution environment unless github.com itself decided to hijack webkey.
3. Its not 2011 anymore. Javascript now has a [secure random number generator](https://developer.mozilla.org/en-US/docs/Web/API/RandomSource/getRandomValues) and various cryptography functions implemented natively and accessible via the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API).
And a standard in-memory secure keystore can be created by keeping a window open and using a [SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker) to communicate with that window from others, tho browser javascript doesn't have the ability to access any potentially available [HSM](https://en.wikipedia.org/wiki/Hardware_security_module).
Javascript still doesn't have secure erase, but this has the same security implications with your usernames and passwords as it does for `webkey` key-pairs.
So if anything, webkey is at worst just as bad as current username/password solutions in this regard.
4. An application server using webkey can verify that a client can be safely communicated with by virtue of the client sending back a signature verifiable on the server. Perhaps I'm misunderstanding what exactly is "unsolved even in the academic literature", so I'd appreciate some clarification there.
5. Worse options are worse, even in security. In this case, not only is the worse option (username/password auth) less secure, but its also less convenient for users. I think this is the only argument in that article that I don't think holds any water even in the world of 2011 javascript crytpo.

In short, there are no valid arguments in that article that make webkey less secure than traditional username/password auth, and there are a bunch of ways its much more secure.

Webkey Cracking Challenge
===============

Up to 3 people who successfully crack a webkey version will have their name or preferred handle permanently recorded in the *Hall of Fame* section.
The rules are as follows:

* A "webkey crack" is defined as a process that discovers a way to generate valid token signatures for a victim (including deriving the victim's private keys), or gain access to a victim's running session
* Only versions that have been the latest version within the past month are eligible for cracking (no point in cracking versions no one's using anymore).
* The first 3 people to crack a version will be written down.
* Cracking methods, code, and tools must be given in a github repository so others can reproduce the crack.
* The date of cracking will be considered as the date of the last commit to that github repo.
* The crack must use the actual online version of webkey hosted by this repo (not a copy running somewhere else).
* The application server created for being compromised in the crack must be implemented as recommended in this readme.
* A crack must:
  * NOT require beginning with physical, OS root, or OS user-space access to the victim's machine (tho if those things can be accessed via other means given in the crack, its acceptable).
  * take less than 2 weeks to run
* A crack that gains access to a running session but can't generate valid tokens for new sessions must also:
  * NOT require access to the application server or the application browser client's javascript (since both of those things would already compromise the session), and
  * take less than 1 day to run

### Hall of Fame

*No one here yet ; )*

Todo
========

!!!!!* The SHARED FUCKING WORKER NEEDS to store the derived key so the identities and origins can be updated without more password entry

* Use subtle crypto where available, lazy load large crypto libraries
* unit tests
* Multiple identities - will allow users to have multiple identities with separate emails and rsa keys
* On setup, allow the user to a "secure image" so there's a visual way to tell that you're using the right service. Mitigates phishing attacks.
* Validation tests - Create some files that developers integrating with webkey can use to verify that they're verifying auth correctly and handling edge cases.
* Once `crypto.subtle` becomes more widely available, use those methods instead of the user-space libraries (for speed and probably security)

In consideration:

* Import and export rsa keys
* Key syncing between devices - Would cut down on the amount email has to be used to connect new devices
* Temporary authentication - This would be some way to auth on another person's machine. I think a better way of doing this is that the website send you an email with a temporary auth link, and this wouldn't go through webkey at all. If key syncing is implemented, this becomes much more important.
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

* 0.0.2
    * Using a SharedWorker to store decrypted keys so that localStorage never has to
    * Requires the user to keep the original popup open (closing it loses the decrypted keys - logging that user out of webkey)
* 0.0.1 - first commit!

License
=======
Released under the MIT license: http://opensource.org/licenses/MIT
