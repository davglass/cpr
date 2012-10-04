var vows = require('vows'),
    assert = require('assert'),
    path = require('path'),
    fs = require('fs'),
    rimraf = require('rimraf'),
    cpr = require('../lib');


var tests = {
    'should be loaded': {
        topic: function () {
            return cpr
        },
        'should have cpr method': function (topic) {
            assert.isFunction(topic.cpr);
        },
        'and should copy node_modules': {
            topic: function() {
                var out = path.join(__dirname, './out')
                rimraf.sync(out);
                this.outDir = out;
                cpr.cpr(path.join(__dirname, '../node_modules'), out, this.callback);
            },
            'has ./out': function(topic) {
                var stat = fs.statSync(this.outDir);
                assert.ok(stat.isDirectory());
            }
        }
    }
};

vows.describe('full').addBatch(tests).export(module);
