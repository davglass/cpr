var fs = require('graceful-fs');
var Stack = require('./stack').Stack;
var path = require('path');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');

var getTree = function(from, options, callback) {
    var stack = new Stack(),
        errors = [],
        results = {};

    options.stats = options.stats || {};
    options.toHash = options.toHash || {};

    fs.readdir(from, stack.add(function(err, dirs) {
        if (err) {
            return errors.push(err);
        }
        dirs.forEach(function (dir) {
            var base = path.join(from, dir);
            fs.stat(base, stack.add(function(err, stat) {
                options.stats[base] = stat;
                options.toHash[base] = path.join(options.to, path.relative(options.from, base));
                if (err) {
                    return errors.push(err);
                }
                if (stat.isDirectory()) {
                    getTree(base, options, stack.add(function(errs, tree) {
                        if (errs && errs.length) {
                            errs.forEach(function(item) {
                                errors.push(item);
                            });
                        }
                        if (tree && tree.length) {
                            tree.forEach(function(item) {
                                results[item] = true;
                            });
                        }
                    }));
                } else if (stat.isFile()) {
                    results[base] = true;
                }
            }));
        });
    }));

    stack.done(function() {
        callback(errors, Object.keys(results).sort());
    });
};

var filterTree = function (tree, options, callback) {
    var t = tree;
    if (options.filter) {
        if (typeof options.filter === 'function') {
            t = tree.filter(options.filter);
        } else if (options.filter instanceof RegExp) {
            t = tree.filter(function(item) {
                return !options.filter.test(item);
            });
        }
    }

    callback(null, t);
};

var splitTree = function (tree, options, callback) {
    var files = {},
        dirs = {};

    tree.forEach(function(item) {
        dirs[path.dirname(item)] = true;
    });

    tree.forEach(function(item) {
        if (!dirs[item]) {
            files[item] = true;
        }
    });

    callback(Object.keys(dirs).sort(), Object.keys(files).sort());
};

var createDirs = function(dirs, to, options, callback) {
    var stack = new Stack();

    dirs.forEach(function(dir) {
        var stat = options.stats[dir],
            to = options.toHash[dir];

        fs.stat(to, stack.add(function(err, s) {
            if (s && s.isDirectory()) {
                if (options.overwrite) {
                    rimraf(to, stack.add(function() {
                        mkdirp(to, stat.mode, stack.add(function(err) {
                            if (err) {
                                options.errors.push(err);
                            }
                        }));
                    }));
                }
            } else {
                mkdirp(to, stat.mode, stack.add(function(err) {
                    if (err) {
                        options.errors.push(err);
                    }
                }));
            }
        }));
    });

    stack.done(function() {
        callback();
    });
};

var createFiles = function(files, to, options, callback) {
    var stack = new Stack(),
        copy = function(from, to, callback) {
            var fromFile = fs.createReadStream(from),
                toFile = fs.createWriteStream(to),
                bail;
            
            fromFile.on('error', function (err) {
                if (/EMFILE/.test(err)) {
                    bail = true;
                    setTimeout(function() {
                        copy(from, to, callback);
                    }, 50);
                } else if (err) {
                    options.errors.push(err);
                }
            });
            fromFile.pipe(toFile);
            fromFile.once('end', function() {
                if (!bail) {
                    callback();
                }
            });
        };

    files.forEach(function(file) {
        var to = options.toHash[file];

        fs.stat(to, stack.add(function(err, s) {
            if (s && s.isFile()) {
                if (options.overwrite) {
                    fs.unlink(to, stack.add(function() {
                        copy(file, to, stack.add(function() {}));
                    }));
                }
            } else {
                copy(file, to, stack.add(function() {}));
            }
        }));
    });

    stack.done(function() {
        callback();
    });
};

var confirm = function(files, callback) {
    var stack = new Stack(),
        errors = [],
        f = [];

    files.forEach(function(file) {
        fs.stat(file, stack.add(function(err, stat) {
            if (err) {
                errors.push(err);
            } else {
                if (stat && (stat.isFile() || stat.isDirectory())) {
                    f.push(file);
                }
            }
        }));
    });

    stack.done(function() {
        callback(errors, f.sort());
    });
};

exports.cpr = function (from, to, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {
            filter: /node_modules/
        };
    }

    options.from = from;
    options.to = to;
    options.errors = [];

    var proc = function() {
        getTree(options.from, options, function(err, tree) {
            filterTree(tree, options, function(err, t) {
                splitTree(t, options, function(dirs, files) {
                    createDirs(dirs, to, options, function() {
                        createFiles(files, to, options, function() {
                            var out = [];
                            Object.keys(options.toHash).forEach(function(k) {
                                out.push(options.toHash[k]);
                            });
                            if (options.confirm) {
                                confirm(out, callback);
                            } else {
                                callback(options.errors, out.sort());
                            }
                        });
                    });
                });
            });
        });
    };

    fs.stat(options.from, function(err, stat) {
        if (err) {
            return callback('From should be a directory');
        }
        if (stat && stat.isDirectory()) {
            if (options.deleteFirst) {
                rimraf(to, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    proc();
                });
            } else {
                proc();
            }
        }
    });
};
