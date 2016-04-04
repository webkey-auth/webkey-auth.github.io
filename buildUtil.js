var path = require("path")

var webpack = require('webpack')
var buildModule = require("build-modules")
var colors = require("colors/safe")

//var copyright = '/* Copyright (c) 2015 Billy Tetrud - Free to use for any purpose: MIT License*/'

var name = 'webkey'

exports.build = function() {
    doyourthang(false)
}
exports.buildAndWatch = function() {
    doyourthang(true)
}

function doyourthang(watch) {
    build(name, watch, {name: name, output: {path:__dirname+'/dist/', name: name+".umd.js"}})
}

function build(relativeModulePath, watch, options) {
    var emitter = buildModule(path.join(__dirname, relativeModulePath), {
        watch: watch/*, header: copyright*/, name: options.name, minify: false,//options.minify !== false,
        output: options.output, plugins: [
            new webpack.IgnorePlugin(/(io\.js|node12\.js)$/, /node-rsa/)   // ignore
        ]
    })
    emitter.on('done', function() {
       console.log((new Date())+" - Done building "+relativeModulePath+"!")
    })
    emitter.on('error', function(e) {
       console.log(e)
    })
    emitter.on('warning', function(w) {
       console.log(colors.grey(w))
    })
}
