
var config = require('config');
var twitbot = require('mcccclean-twitterbot');
var bot = new twitbot(config.get('twitterbot'), { allow: "@sww" });
var log = require('pretty-good-log')('main');
var store = require('nedb-promise')({
    filename: 'housecup.db',
    autoload: true
});

var textnumber = require('./lib/textnumber');
function findnumber(text) {
    return textnumber(text);
}

var houses = ['gryffindor', 'ravenclaw', 'slytherin', 'hufflepuff'];
function findtarget(text) {
    var lower = text.toLowerCase();
    var candidate = null;
    var distance = text.length;
    for(var i = 0; i < houses.length; ++i) {
        var idx = lower.indexOf(houses[i]);
        if(idx >= 0 && idx < distance) {
            distance = idx;
            candidate = houses[i];
        }
    }
    return candidate;
}

function hit(text) {
    var parts = text.split('points');
    if(parts.length > 1) {
        var amount = findnumber(parts[0]);
        var target = findtarget(parts[1]);
        if(amount && target) {
            log(text);
            log("PAYOUT:", amount, target);
            store.update(
                    { target: target },
                    { $inc: { amount: amount } },
                    { upsert: true }
            ).then(function() {
                return store.findOne({ target: target });
            }).then(function(doc) {
                log(doc);
            });
        } else {
            log('No payout');
        }
    }
}

function search(term) {
    bot.stream(term, function(t) {
        hit(t.text);  
    });
}

search('points');

