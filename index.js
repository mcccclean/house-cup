
var config = require('config');
var twitbot = require('mcccclean-twitterbot');
var bot = new twitbot(config.get('twitterbot'), { allow: "@sww" });
var log = require('pretty-good-log')('main');
var store = require('nedb-promise')({
    filename: 'housecup.db',
    autoload: true
});
var CronJob = require('cron').CronJob;


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
            return store.update(
                    { type: 'score', target: target },
                    { $inc: { amount: amount } },
                    { upsert: true }
            ).then(function() {
                return store.findOne({ target: target });
            }).then(function(doc) {
                return {
                    target: target,
                    amount: amount,
                    total: doc.amount
                };
            });
        }
    }
    return Promise.resolve(null);
}

function search(term) {
    bot.stream(term, function(t) {
        hit(t.text).then(function(doc) {
            if(doc) {
                log(t.user.screen_name, ': ', t.text);
                log(doc);
            }
        });  
    });
}

search('points');

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

function reportscores(scores) {
    var lines = houses.sort(function(a, b) {
        return scores[a] - scores[b];
    }).map(function(h) {
        return h[0].toUpperCase() + h.slice(1) + ": " + scores[h];
    });
    var tweet = ['Current standings:'].concat(lines).join('\n');
    log(tweet);
    bot.tweet(tweet);
}

function reportwinner() {
    return getscores().then(function(scores) {
        // annouce a winner
        reportscores(scores);
        
        // reset scores
        store.update({ type: 'score' }, { $set: { amount: 0 } });
    });
}

new CronJob('00 00 20 * * *', reportwinner, null, true, 'UTC');
