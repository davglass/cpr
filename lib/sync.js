/*
Copyright (c) 2012, Yahoo! Inc. All rights reserved.
Code licensed under the BSD License:
http://yuilibrary.com/license/
*/
var fs = require('graceful-fs');
var path = require('path');
var mkdirp = require('mkdirp').sync;
var cp = require('cp').sync;

var sync;

// copy a symlink
function symlinkSync(src, dest) {
    var link = fs.readlinkSync(src);
    fs.symlinkSync(link, dest);
}

// copy the contents of a directory
function dirSync(src, dest) {
    mkdirp(dest);
    fs.readdirSync(src).forEach(function (name) {
        sync(path.join(src, name), path.join(dest, name));
    });
}

// synchronous implementation
sync = module.exports = function (src, dest) {
    var stat = fs.lstatSync(src);

    // just copy files
    if (stat.isFile()) {
        return cp(src, dest);
    }

    // read the sym link and create a new one
    if (stat.isSymbolicLink()) {
        return symlinkSync(src, dest);
    }

    // note a file or a symlink?  probably a directory,
    // so we'll copy its contents
    dirSync(src, dest);
};
