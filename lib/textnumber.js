
var log = require('pretty-good-log')('textnumber');

var values = {
    one: 1, a: 1,
    two: 2, three: 3, four: 4, five: 5, six: 6,
    seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11,
    twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
    sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90,
    hundred: 100, thousand: 1000, million: 1000000, 
    billion: 1000000000, trillion: 1000000000000
};

function value(word) {
    var m = word.match(/^[\d, ]+$/);
    if(m) {
        return parseInt(m[0].replace(/[^\d]/g, ''));
    } else {
        word = word.toLowerCase();
        var v = values[word];
        if(typeof(v) !== "undefined") {
            return v;
        } else {
            return null;
        }
    }
}

module.exports = function(string) {
    var total = 0;
    var prior = null;
    var words = string.split(/[^A-Za-z0-9]+/g);
    for(var i = 0; i < words.length; ++i) {
        var w = words[i];
        var v = value(w);
        if(v !== null) {
            if(prior === null) {
                prior = v;
            } else if(prior > v) {
                prior = prior + v;
            } else {
                prior = prior * v;
            }
            if(v > 100) {
                total += prior;
                prior = null;
            }
        }
    }
    if(prior) {
        total += prior;
    }
    return total;
}
