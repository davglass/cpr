var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    rimraf = require('rimraf'),
    cpr = require('../lib'),
    to = path.join(__dirname, './out/'),
    from = path.join(__dirname, '../node_modules');


var tests = {
    'should be loaded': {
        topic: function () {
            rimraf.sync(to);
            return cpr;
        },
        'should have cpr method': function (topic) {
            assert.isFunction(topic.cpr);
        },
        'and should copy node_modules': {
            topic: function() {
                var out = path.join(to, '0'),
                    self = this;

                this.outDir = out;
                cpr.cpr(from, out, function(err, status) {
                    var t = {
                        status: status,
                        dirs: {
                            from: fs.readdirSync(from).sort(),
                            to: fs.readdirSync(out).sort()
                        }
                    };
                    self.callback(err, t);
                });
            },
            'has ./out': function(topic) {
                var stat = fs.statSync(this.outDir);
                assert.ok(stat.isDirectory());
                assert.deepEqual(topic.dirs.to, topic.dirs.from);
            },
            'and from directory has graceful-fs dir': function(topic) {
                var fromHasGFS = topic.dirs.from.some(function(item) {
                    return (item === 'graceful-fs');
                });
                assert.isTrue(fromHasGFS);
            },
            'and to directory has graceful-fs dir': function(topic) {
                var toHasGFS = topic.dirs.to.some(function(item) {
                    return (item === 'graceful-fs');
                });
                assert.isTrue(toHasGFS);
            }
        },
        'and should NOT copy node_modules': {
            topic: function() {
                var out = path.join(to, '1'),
                    self = this;

                this.outDir = out;
                cpr.cpr(from, out, {
                    filter: /node_modules/
                }, function(err) {
                    fs.stat(out, function(e, stat) {
                        var t = {
                            err: err,
                            stat: e
                        };
                        self.callback(null, t);
                    });
                });
            },
            'has ./out': function(topic) {
                assert.ok(topic.err); //Should be an error
                assert.ok(topic.stat); //Should be an error
            }
        },
        'and should not copy yui-lint from regex': {
            topic: function() {
                var out = path.join(to, '2'),
                    self = this;

                this.outDir = out;
                cpr.cpr(from, out, {
                    filter: /yui-lint/
                }, function(err, status) {
                    var t = {
                        status: status,
                        dirs: {
                            from: fs.readdirSync(from).sort(),
                            to: fs.readdirSync(out).sort()
                        }
                    };
                    self.callback(err, t);
                });
            },
            'and has ./out': function(topic) {
                var stat = fs.statSync(this.outDir);
                assert.ok(stat.isDirectory());
            },
            'and dirs are not equal': function(topic) {
                assert.notDeepEqual(topic.dirs.to, topic.dirs.from);
            },
            'and from directory has yui-lint dir': function(topic) {
                var fromHasLint = topic.dirs.from.some(function(item) {
                    return (item === 'yui-lint');
                });
                assert.isTrue(fromHasLint);
            },
            'and to directory does not have yui-lint dir': function(topic) {
                var toHasLint = topic.dirs.to.some(function(item) {
                    return (item === 'yui-lint');
                });
                assert.isFalse(toHasLint);
            }
        },
        'and should not copy graceful-fs from function': {
            topic: function() {
                var out = path.join(to, '3'),
                    self = this;

                this.outDir = out;
                cpr.cpr(from, out, {
                    filter: function (item) {
                        return !(/graceful-fs/.test(item));
                    }
                }, function(err, status) {
                    var t = {
                        status: status,
                        dirs: {
                            from: fs.readdirSync(from).sort(),
                            to: fs.readdirSync(out).sort()
                        }
                    };
                    self.callback(err, t);
                });
            },
            'and has ./out': function(topic) {
                var stat = fs.statSync(this.outDir);
                assert.ok(stat.isDirectory());
            },
            'and dirs are not equal': function(topic) {
                assert.notDeepEqual(topic.dirs.to, topic.dirs.from);
            },
            'and from directory has graceful-fs dir': function(topic) {
                var fromHasGFS = topic.dirs.from.some(function(item) {
                    return (item === 'graceful-fs');
                });
                assert.isTrue(fromHasGFS);
            },
            'and to directory does not have graceful-fs dir': function(topic) {
                var toHasGFS = topic.dirs.to.some(function(item) {
                    return (item === 'graceful-fs');
                });
                assert.isFalse(toHasGFS);
            }
        }
    }
};

vows.describe('full').addBatch(tests).export(module);
