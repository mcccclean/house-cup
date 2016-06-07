
var config = require('config');
var twitbot = require('mcccclean-twitterbot');
var bot = new twitbot(config.get('twitterbot'), { allow: "@sww" });
var log = require('pretty-good-log')('main');
var store = require('nedb-promise')({
    filename: 'housecup.db',
    autoload: true
});
var moment = require('moment');

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

var HOUR = 1000 * 60 * 60;

function getscores() {
    var scores = {};
    return Promise.all(houses.map(function(h) {
        return store.findOne({ target: h }).then(function(doc) {
            log("H", h, doc);
            if(doc) {
                scores[h] = doc.amount;
            } else {
                scores[h] = 0;
            }
        });
    })).then(function() {
        return scores;
    });
}

function reportscores() {
    return getscores().then(function(scores) {
        var lines = houses.map(function(h) {
            return h[0].toUpperCase() + h.slice(1) + ": " + scores[h];
        });
        lines = ['Current standings:'].concat(lines);
        var tweet = lines.join('\n');
        log(tweet);
        bot.tweet(tweet);
    }).catch(function(e) {
        log("ERR", e);
    });
}

function reportwinner() {
    return getscores().then(function(scores) {
        // annouce a winner
        
        // reset scores
        store.update({}, { $set: { amount: 0 } });
    });
}

reportscores();
setInterval(reportscores, HOUR * 24); 
