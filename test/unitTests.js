"use strict";

var Unit = require('deadunit/deadunit.browser')
var testUtils = require("./testUtils")
var Service = require("../Service")


Unit.test("Testing keysight", function(t) {
    this.timeout(15*1000)

    //*


    this.test("module tests", function() {
        this.test("Service", function(t) {
            this.count(8)

            var FakeWindow = function(location) {this.location = location}
            FakeWindow.prototype.postMessage = function(message, destination) {
                if(this.location !== destination && destination !== '*') throw new Error("wrong destination")
                this.onmessage({
                    data: message,
                    origin: this.location,
                })
            }

            var sequence = testUtils.sequence()
            function event(event) {
                sequence(
                    function() {t.eq(event, 'readyA')},
                    function() {t.eq(event, 'readyB')},
                    function() {t.eq(event, 'a234')},
                    function() {t.eq(event, 'b3')},
                    function() {t.eq(event, "aErr: There is nothing less than 0")},
                    function() {t.eq(event, "bErr: There is nothing less than 1")}
                )
            }


            var a = new FakeWindow('a')
            var b = new FakeWindow('b')

            var aService = new Service(a,'a')
            var bService = new Service(b,'b')

            a.onmessage = function(message) {
                aService.handleMessage(message)
            }
            b.onmessage = function(message) {
                bService.handleMessage(message)
            }

            aService.registerCommand('a', function(x,y,z, respond) {
                if(x>=0) {
                    respond(undefined, {x:x+1,y:y+1,z:z+1})
                } else {
                    respond(new Error("There is nothing less than 0"))
                }
            })
            bService.registerCommand('b', function(x, respond) {
                if(x[0]>=1) {
                    respond(undefined, x[0]+x[1])
                } else {
                    respond(new Error("There is nothing less than 1"))
                }
            })
            bService.registerCommand('emptyb', function(respond) {
                respond()
            })

            aService.onReady(function() {
                event('readyA')
            })
            bService.onReady(function() {
                event('readyB')
            })

            Service.sendReady(a)
            Service.sendReady(b)

            aService.request('a', 1,2,3, function(err, result,y,z) {
                t.eq(y,undefined)
                t.eq(z,undefined)
                event("a"+result.x+result.y+result.z)
            })
            bService.request('b', [1,2], function(err, x) {
                event("b"+x)
            })

            aService.request('a', -1,2,3, function(err, x) {
                event("aErr: "+err.message)
            })
            bService.request('b', [0,1], function(err, x) {
                event("bErr: "+err.message)
            })

            bService.request('emptyb', function(err, somethingelse) {
                t.eq(err, undefined)
                t.eq(somethingelse, undefined)
            })
        })
    })

//    this.test("success test", function(t) {
//
//    })
//
//    this.test("error test", function(t) {
//
//    })

    //*/

}).writeHtml(document.getElementById('results'))