var multipart = require('connect-multiparty'),
    fs = require('fs'),
    multipartMiddleware = multipart( { uploadDir: 'public/tmp' }),
    passport = require('passport'),
    utils = require('../libs/util.js');

var Dot  = require('../models').Dot;
var Message  = require('../models').Message;
var News  = require('../models').News;
var Ads  = require('../models').Ads;
var Anonymous  = require('../models').Anonymous;

var adminId = '257378450';

module.exports = function (app) {
    app.get('/', logged);
    app.get('/join', join);

    // init, send all dots
    app.get('/dots', sendDots);

    // add / update / remove dot
    app.post('/dot', multipartMiddleware, addDot);
    app.put('/dot', multipartMiddleware, editDot);
    app.delete('/dot', multipartMiddleware, removeDot);

    // dot messages
    app.get('/messages', multipartMiddleware, getMessages);
    app.post('/messages', multipartMiddleware, addMessage);
    app.put('/messages', multipartMiddleware, editMessage);
    app.delete('/messages', multipartMiddleware, removeMessage);

    // news
    app.get('/news', multipartMiddleware, getNews);
    app.post('/news', multipartMiddleware, addNews);
    app.put('/news', multipartMiddleware, editNews);
    app.delete('/news', multipartMiddleware, removeNews);

    // ads
    app.get('/ads', multipartMiddleware, getAds);
    app.post('/ads', multipartMiddleware, addAds);
    app.put('/ads', multipartMiddleware, editAds);
    app.delete('/ads', multipartMiddleware, removeAds);

    // anonymous
    app.get('/anonymous', multipartMiddleware, getAnonymous);
    app.post('/anonymous', multipartMiddleware, addAnonymous);
    app.put('/anonymous', multipartMiddleware, editAnonymous);
    app.delete('/anonymous', multipartMiddleware, removeAnonymous);

    // auth
    app.get('/auth',
        passport.authenticate('vkontakte'),
        function(req, res){
            // The request will be redirected to vk.com for authentication, so
            // this function will not be called.
        });

    app.get('/auth/callback',
        passport.authenticate('vkontakte', { failureRedirect: '/site-error' }),
        function(req, res) {
            // Successful authentication, redirect home.
            res.redirect('/');
        });

    app.get('/logout', logout);
};

var logged = function (req, res) {
    if (req.user) {
        // check admin rules
        if (req.user.vkontakteId === adminId) {
            res.render('admin', { title: 'Admin' })
        }
        else res.render('user', { title: ' User' });
    }
    else {
        res.redirect('/join');
    }
};

var join = function (req, res) {
    res.render('login', { title: 'Node Login' });
};

var logout = function(req, res) {
    req.logout();
    res.redirect('/');
};

var sendDots = function (req, res) {
    Dot.find(function (err, result) {
        if (err) throw err;
        res.end(JSON.stringify(result));
    });
};

var addDot = function (req, res) {
    var dotValues = JSON.parse(req.body.json);
    dotValues.id = utils.guid();
    dotValues.image = 'marker-images/' + dotValues.id + '.png';

    // save in db
    var dotValid = new Dot(dotValues);

    // create image
    if (!utils.isEmpty(req.files)) {
        // add image
        if (req.files.markerimage) {
            var tmpFilePath = req.files.markerimage.ws.path;

            fs.readFile(tmpFilePath, function (err, result) {
                if (err) throw err;

                fs.writeFile('public/marker-images/' + dotValues.id + '.png', result, function (err) {
                    if (err) throw err;

                    fs.unlink(tmpFilePath, function (err) {
                        if (err) throw err;
                        console.log('Temporary marker file deleted');
                    })
                });
            });
        }
        else {
            dotValues.image = 'images/q.gif';
        }

        // create gallery dir
        var galleryPath = 'public/galleries/' + dotValues.id;
        utils.mkdir(galleryPath);

        delete req.files.markerimage;

        // create gallery files
        for (var galleryImage in req.files) {
            var tmpGalleryPath = req.files[galleryImage].ws.path;
            var update = { gallery: [] };

            fs.readFile(tmpGalleryPath, function (err, result) {
                var imageName = (Math.random()*31337 | 0) + '.jpg';
                var imagePath = 'galleries/' + dotValues.id + '/' + imageName;

                update.gallery.push(imagePath);

                fs.writeFile('public/galleries/' + dotValues.id + '/' + imageName, result, function (err) {
                    if (err) throw err;

                    Dot.findOneAndUpdate({id: dotValues.id}, update, function (err) {
                        if (err) throw err;
                    });
                });
            });

            fs.unlink(tmpGalleryPath, function (err) {
                if (err) throw err;
                console.log('Temporary gallery image deleted');
            })
        }

        dotValid.save(function (err, dot) {
            if (err) throw err;
            res.send(JSON.stringify(dot));
        });
    }
    else {
        dotValid.image = 'images/q.gif';

        dotValid.save(function (err, dot) {
            if (err) throw err;
            res.end(JSON.stringify(dot));
        });
    }

    console.log("Dot added on server");
};

var editDot = function (req, res) {
    if (req.user.vkontakteId === adminId) {
        var dotValues = JSON.parse(req.body.json);
        dotValues.image = 'marker-images/' + dotValues.id + '.png';

        // check files exists
        if (!utils.isEmpty(req.files)) {
            console.log('Dot update have files');
            // add image
            if (req.files.markerimage) {
                var tmpFilePath = req.files.markerimage.ws.path;

                fs.readFile(tmpFilePath, function (err, result) {
                    if (err) throw err;

                    fs.writeFile('public/marker-images/' + dotValues.id + '.png', result, function (err) {
                        if (err) throw err;

                        fs.unlink(tmpFilePath, function (err) {
                            if (err) throw err;
                            console.log('tmp file deleted');
                        })
                    });
                });
            }

            // create gallery files
            var galleryPath = 'public/galleries/' + dotValues.id;

            delete req.files.markerimage;

            fs.stat(galleryPath, function (err) {
                if (err) {
                    utils.mkdir(galleryPath);
                    console.log('Marker gallery created');
                }

                for (var galleryImage in req.files) {
                    var tmpGalleryPath = req.files[galleryImage].ws.path;
                    var update = { gallery: dotValues.gallery };
                    utils.mkdir('public/tmp');

                    fs.readFile(tmpGalleryPath, function (err, result) {
                        var imageName = (Math.random() * 31337 | 0) + '.jpg';
                        var imagePath = 'galleries/' + dotValues.id + '/' + imageName;

                        update.gallery.push(imagePath);

                        fs.writeFile('public/galleries/' + dotValues.id + '/' + imageName, result, function (err) {
                            if (err) throw err;

                            Dot.findOneAndUpdate({id: dotValues.id}, update, function (err, result) {
                                if (err) throw err;
                                console.log('Marker gallery updated');
                                res.end(JSON.stringify(result));
                            });
                        });
                    });

                    fs.unlink(tmpGalleryPath, function (err) {
                        if (err) throw err;
                        console.log('Temporary gallery image deleted');
                    })
                }
            });

            // save in db
            Dot.findOneAndUpdate({id: dotValues.id}, dotValues, function (err, result) {
                if (err) throw err;
                res.end(JSON.stringify(result));
            });

            console.log('image updated');
        }
        else {
            console.log('Dot update dont have files');
            delete dotValues.gallery;

            Dot.findOneAndUpdate({id: dotValues.id}, dotValues, function (err, result) {
                if (err) throw err;
                res.end(JSON.stringify(result));
            });
        }
    }
    else {
        res.end("Access denied");
        console.log("User access error");
    }

    console.log("Dot updated on server");
};

var removeDot = function (req, res) {
    req.on("data", function (data) {
        if (req.user.vkontakteId === adminId) {
            var dotId = data.toString();

            // remove from db
            Dot.remove({ id: dotId }, function (err) {
                if (err) throw err;
                res.end("Dot removed from server");
            });

            // remove dot files if exists
            var markerPath = 'public/marker-images/' + dotId + '.png';
            var galleryPath = 'public/galleries/' + dotId;

            fs.stat(galleryPath, function (err) {
                if (err) {
                    console.log('Marker gallery don\'t exists');
                    return;
                }
                utils.deleteFolderRecursive(galleryPath, function (err) {
                    if (err) throw err;
                    console.log('Dot gallery deleted');
                });
            });

            fs.stat(markerPath, function (err) {
                if (err) {
                    console.log('Marker image don\'t exists');
                    return;
                }
                fs.unlink(markerPath, function (err) {
                    if (err) throw err;
                    console.log('Dot marker image deleted');
                });
            });
        }
        else {
            res.end("Access denied");
            console.log("User access error");
        }
    });

    console.log("Dot removed from server");
};

// messages
var addMessage = function (req, res) {
    var message = {
        messageId    : 'm' + utils.guid(),
        dotId        : req.body.id,
        name         : req.user.displayName,
        link         : req.user.username,
        text         : req.body.text,
        avatar       : req.user.avatar,
        approved     : false
    };

    var messageValid = new Message(message);

    messageValid.save(function (err) {
        if (err) throw err;
        res.send('saved');
    });
};

var getMessages = function (req, res) {
    Message.find(function (err, result) {
        if (err) throw err;
        res.end(JSON.stringify(result));
    });
};

var editMessage = function (req, res) {
    if (req.user.vkontakteId === adminId) {
        Message.update({ messageId: req.body.id }, { approved: true, text: req.body.text }, function (err) {
            if (err) throw err;
            res.end("Message updated on server");
        });

        console.log("Message updated on server");
    }
    else {
        res.end("Access denied");
        console.log("User access error");
    }
};

var removeMessage = function (req, res) {
    if (req.user.vkontakteId === adminId) {
        Message.remove({ messageId: req.body.id }, function (err) {
            if (err) throw err;
            res.end("Message removed from server");
        });

        console.log("Message removed from server");
    }
    else {
        res.end("Access denied");
        console.log("User access error");
    }
};

// news
var addNews = function (req, res) {
    var message = {
        messageId    : 'm' + utils.guid(),
        name         : req.user.displayName,
        link         : req.user.username,
        text         : req.body.text,
        avatar       : req.user.avatar,
        approved     : false
    };

    var messageValid = new News(message);

    messageValid.save(function (err) {
        if (err) throw err;
        res.send('saved');
    });
};

var getNews = function (req, res) {
    News.find(function (err, result) {
        if (err) throw err;
        res.end(JSON.stringify(result));
    });
};

var editNews = function (req, res) {
    if (req.user.vkontakteId === adminId) {
        console.log(req.body.id);

        News.update({ messageId: req.body.id }, { approved: true, text: req.body.text }, function (err) {
            if (err) throw err;
            res.end("Message updated on server");
        });

        console.log("Message updated on server");
    }
    else {
        res.end("Access denied");
        console.log("User access error");
    }
};

var removeNews = function (req, res) {
    if (req.user.vkontakteId === adminId) {
        News.remove({ messageId: req.body.id }, function (err) {
            if (err) throw err;
            res.end("Message removed from server");
        });

        console.log("Message removed from server");
    }
    else {
        res.end("Access denied");
        console.log("User access error");
    }
};

// ads
var addAds = function (req, res) {
    var message = {
        messageId    : 'm' + utils.guid(),
        name         : req.user.displayName,
        link         : req.user.username,
        text         : req.body.text,
        avatar       : req.user.avatar,
        approved     : false
    };

    var messageValid = new Ads(message);
    console.log(messageValid);

    messageValid.save(function (err) {
        if (err) throw err;
        res.send('Ad saved');
    });
};

var getAds = function (req, res) {
    Ads.find(function (err, result) {
        if (err) throw err;
        res.end(JSON.stringify(result));
    });
};

var editAds = function (req, res) {
    if (req.user.vkontakteId === adminId) {

        Ads.update({ messageId: req.body.id }, { approved: true, text: req.body.text }, function (err) {
            if (err) throw err;
            res.end("Ad approved on server");
        });

        console.log("Ad approved on server");
    }
    else {
        res.end("Access denied");
        console.log("User access error");
    }
};

var removeAds = function (req, res) {
    if (req.user.vkontakteId === adminId) {
        Ads.remove({ messageId: req.body.id }, function (err) {
            if (err) throw err;
            res.end("Ad removed from server");
        });

        console.log("Ad removed from server");
    }
    else {
        res.end("Access denied");
        console.log("User access error");
    }
};

// ads
var addAnonymous = function (req, res) {
    var message = {
        messageId    : 'm' + utils.guid(),
        name         : utils.anonymousName(),
        link         : req.user.username,
        text         : req.body.text,
        approved     : false
    };

    var messageValid = new Anonymous(message);

    messageValid.save(function (err) {
        if (err) throw err;
        res.send('Anonymous saved');
    });
};

var getAnonymous = function (req, res) {
    Anonymous.find(function (err, result) {
        if (err) throw err;
        res.end(JSON.stringify(result));
    });
};

var editAnonymous = function (req, res) {
    if (req.user.vkontakteId === adminId) {
        Anonymous.update({ messageId: req.body.id }, { approved: true, text: req.body.text }, function (err) {
            if (err) throw err;
            res.end("Anonymous approved on server");
        });

        console.log("Anonymous approved on server");
    }
    else {
        res.end("Access denied");
        console.log("User access error");
    }
};

var removeAnonymous = function (req, res) {
    if (req.user.vkontakteId === adminId) {
        Anonymous.remove({ messageId: req.body.id }, function (err) {
            if (err) throw err;
            res.end("Anonymous removed from server");
        });

        console.log("Anonymous removed from server");
    }
    else {
        res.end("Access denied");
        console.log("User access error");
    }
};