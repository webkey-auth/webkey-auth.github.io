
// compares arrays and objects for value equality (all elements and members must match)
exports.equal = function(a,b) {
    if(a instanceof Array) {
        if(!(b instanceof Array))
            return false
        if(a.length !== b.length) {
            return false
        } else {
            for(var n=0; n<a.length; n++) {
                if(!exports.equal(a[n],b[n])) {
                    return false
                }
            }
            // else
            return true
        }
    } else if(a instanceof Object) {
        if(!(b instanceof Object))
            return false

        var aKeys = getKeys(a)
        var bKeys = getKeys(b)

        if(aKeys.length !== bKeys.length) {
            return false
        } else {
            for(var n=0; n<aKeys.length; n++) {
                var key = aKeys[n]
                var aVal = a[key]
                var bVal = b[key]

                if(!exports.equal(aVal,bVal)) {
                    return false
                }
            }
            // else
            return true
        }
    } else {
        return a===b || Number.isNaN(a) && Number.isNaN(b)
    }
}

// counts object keys ignoring properties that are undefined
function getKeys(x) {
    var keys=[]
    for(var k in x) {
        if(x[k] !== undefined) {
            keys.push(k)
        }
    }

    return keys
}

// returns a function that should be passed a bunch of functions as its arguments
// each time that function is called, the next function in the list will be called
// example:
/*  var sequenceX = testUtils.sequence()
 var obj = {a:1,b:2,c:3}

 for(var x in obj) {
     sequenceX(function() {
         t.ok(x === 'a')
     },
     function() {
         t.ok(x === 'b')
     },
     function() {
         t.ok(x === 'c')
     })
 }
 */
exports.sequence = function() {
    var n=-1
    return function() {
        var fns = arguments
        n++
        if(n>=fns.length)
            throw new Error("Unexpected call: "+n)
        // else
        fns[n]()
    }
}



