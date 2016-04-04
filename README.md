
`webkey`
=====

Webkey is an RSA based single-click web authentication utility.
It allows a web application to allow users to securely authenticate without sending usernames and passwords.
To authenticate on a new website, a user would click on a button displayed within an `<iframe>`, and then confirm on a confirmation page.
Subsequent authentications can be done automatically if the user wants.

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


Client Usage
============

Bare necessities:
```
<iframe id='x' style="display:none;" src="https://webkey.github.io/login"></iframe>

<script>
    var webkey = document.getElementById('x').contentWindow
    var token = Math.random().toString()
    window.addEventListener("message", function(message){
        if (message.origin !== "https://webkey.github.io/") return // not from the right place

        var response = JSON.parse(message.data)

        // identify the user using response.publicKey
        // authenticate the user by decrypting response.proof with the public key and ensuring the result is equal to the original `token`
        // this step would almost definitely be done on a server after sending the message data there
    });

    webkey.postMessage(JSON.stringify({c:'auth', token: token}),"https://webkey.github.io/")
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

* `{response:'auth', proof:_, email:_}` - The result of an accepted auth command. The `proof` property will hold the token signed with the user's private key, `email` will hold the user's email.
* `{response:'rejected'}` - The user rejected the auth request.
* `{response:'error', message:_}` - An error response. The message will have some hopefully useful message.

Server Usage
============

If you'd like to *host* your own webkey server, all you have to do is host the file `dist/webkey.html` on any webserver.

Trust
======

With security, the question is always "who do I have to trust?"
In this case, there are two relevant people/groups you're trusting by using webkey:

1. Me - as the author, you're trusting me not to maliciously change the code on you
2. Github - Since github is currently hosting this, you have to trust them

Hopefully someday browsers will implement this natively so these two pieces of trust can go away.

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
