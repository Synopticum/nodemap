var utils = require('../../libs/util'),
    Anonymous  = require('../../models').Anonymous;

var defaultText = 'Автор поленился набрать текст';

var add = function (req, res) {
    var message = {
        messageId    : 'm' + utils.guid(),
        name         : utils.anonymousName(),
        link         : utils.textValid(req.user.username),
        text         : utils.textValid(req.body.text) || defaultText,
        image        : req.body.image,
        approved     : false
    };

    var messageValid = new Anonymous(message);

    messageValid.save(function (err) {
        if (err) {
            utils.errorHandler(err, 'Anonymous Add Error');
            res.send(400, 'Bad Request');
        }
        res.send('Anonymous saved');
    });
};

var get = function (req, res) {
    Anonymous.find({}).sort('-date').exec(function (err, result) {
        if (err) {
            utils.errorHandler(err, 'Anonymous Get Error');
            res.send(400, 'Bad Request');
        }
        res.end(JSON.stringify(result));
    });
};

var edit = function (req, res) {
    // check for admin
    User.findOne({ status: 'godlike' }, function (err, result){
        var godlike = result.get('_id').toString();

        if (req.user) {
            // if admin
            if (req.session.passport.user === godlike) {
                Anonymous.update({ messageId: utils.textValid(req.body.id) }, { approved: true, text: utils.textValid(req.body.text) || defaultText }, function (err) {
                    if (err) {
                        utils.errorHandler(err, 'Anonymous Edit Error');
                        res.send(400, 'Bad Request');
                    }
                    res.end("Anonymous approved on server");
                });
            }
            else {
                res.send(403, "Access denied");
            }
        }
        // if user
        else {
            res.redirect('/join');
        }
    });
};

var remove = function (req, res) {
    // check for admin
    User.findOne({ status: 'godlike' }, function (err, result){
        var godlike = result.get('_id').toString();

        if (req.user) {
            // if admin
            if (req.session.passport.user === godlike) {
                Anonymous.remove({ messageId: utils.textValid(req.body.id) }, function (err) {
                    if (err) {
                        utils.errorHandler(err, 'Anonymous Remove Error');
                        res.send(400, 'Bad Request');
                    }
                    res.end("Anonymous removed from server");
                });
            }
            else {
                res.send(403, "Access denied");
            }
        }
        // if user
        else {
            res.redirect('/join');
        }
    });
};

// exports
module.exports.get = get;
module.exports.add = add;
module.exports.edit = edit;
module.exports.remove = remove;