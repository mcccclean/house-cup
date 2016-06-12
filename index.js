
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
                return store.findOne({ type: 'score', target: target });
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
        return store.findOne({ type: 'score', target: h }).then(function(doc) {
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

function title(w) {
    return w[0].toUpperCase() + w.slice(1);
}

function scoresort(scores) {
    return houses.map(function(h) {
        return { house: h, score: scores[h] }; 
    }).sort(function(a, b) {
        return b.score - a.score;
    });
}

function reportscores(note, scores) {
    var lines = scoresort(scores).map(function(h) {
        return title(h.house) + ": " + h.score;
    });
    if(typeof(note) === 'string') {
        note = [note];
    }
    var tweet = note.concat(lines).join('\n');
    bot.tweet(tweet);
    log(tweet);
}

function reportwinner() {
    return getscores().then(function(scores) {
        // annouce a winner
        var winner = houses.sort(function(a, b) {
            return scores[b] - scores[a];
        })[0];
        reportscores([
            'The winner is in! Congratulations to...',
            ':sparkles: ' + winner.toUpperCase() + ' :sparkles:',
            '---',
        ], scores);
        
        // reset scores
        store.update(
            { type: 'score' }, 
            { $set: { amount: 0 } }, 
            { multi: true }
        );
    });
}

function reportprogress() {
    return getscores().then(function(scores) {
        // annouce a winner
        reportscores('Current standings:', scores);
    });
}

new CronJob('00 00 20 * * *', reportwinner, null, true, 'UTC');
new CronJob('00 00 0-19/2,22 * * *', reportprogress, null, true, 'UTC');
