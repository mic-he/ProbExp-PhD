(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9wYXRoLWJyb3dzZXJpZnkvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYXN0ID0gcGFydHNbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBwYXJ0cy51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuLy8gU3BsaXQgYSBmaWxlbmFtZSBpbnRvIFtyb290LCBkaXIsIGJhc2VuYW1lLCBleHRdLCB1bml4IHZlcnNpb25cbi8vICdyb290JyBpcyBqdXN0IGEgc2xhc2gsIG9yIG5vdGhpbmcuXG52YXIgc3BsaXRQYXRoUmUgPVxuICAgIC9eKFxcLz98KShbXFxzXFxTXSo/KSgoPzpcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpKD86W1xcL10qKSQvO1xudmFyIHNwbGl0UGF0aCA9IGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gIHJldHVybiBzcGxpdFBhdGhSZS5leGVjKGZpbGVuYW1lKS5zbGljZSgxKTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICB2YXIgcGF0aCA9IChpID49IDApID8gYXJndW1lbnRzW2ldIDogcHJvY2Vzcy5jd2QoKTtcblxuICAgIC8vIFNraXAgZW1wdHkgYW5kIGludmFsaWQgZW50cmllc1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLnJlc29sdmUgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfSBlbHNlIGlmICghcGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICByZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgLy8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBleHBvcnRzLmlzQWJzb2x1dGUocGF0aCksXG4gICAgICB0cmFpbGluZ1NsYXNoID0gc3Vic3RyKHBhdGgsIC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIChpc0Fic29sdXRlID8gJy8nIDogJycpICsgcGF0aDtcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5qb2luIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfSkuam9pbignLycpKTtcbn07XG5cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVsYXRpdmUgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICBmcm9tID0gZXhwb3J0cy5yZXNvbHZlKGZyb20pLnN1YnN0cigxKTtcbiAgdG8gPSBleHBvcnRzLnJlc29sdmUodG8pLnN1YnN0cigxKTtcblxuICBmdW5jdGlvbiB0cmltKGFycikge1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yICg7IHN0YXJ0IDwgYXJyLmxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKGFycltzdGFydF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICB2YXIgZW5kID0gYXJyLmxlbmd0aCAtIDE7XG4gICAgZm9yICg7IGVuZCA+PSAwOyBlbmQtLSkge1xuICAgICAgaWYgKGFycltlbmRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5zbGljZShzdGFydCwgZW5kIC0gc3RhcnQgKyAxKTtcbiAgfVxuXG4gIHZhciBmcm9tUGFydHMgPSB0cmltKGZyb20uc3BsaXQoJy8nKSk7XG4gIHZhciB0b1BhcnRzID0gdHJpbSh0by5zcGxpdCgnLycpKTtcblxuICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oZnJvbVBhcnRzLmxlbmd0aCwgdG9QYXJ0cy5sZW5ndGgpO1xuICB2YXIgc2FtZVBhcnRzTGVuZ3RoID0gbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZyb21QYXJ0c1tpXSAhPT0gdG9QYXJ0c1tpXSkge1xuICAgICAgc2FtZVBhcnRzTGVuZ3RoID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBvdXRwdXRQYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gc2FtZVBhcnRzTGVuZ3RoOyBpIDwgZnJvbVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0UGFydHMucHVzaCgnLi4nKTtcbiAgfVxuXG4gIG91dHB1dFBhcnRzID0gb3V0cHV0UGFydHMuY29uY2F0KHRvUGFydHMuc2xpY2Uoc2FtZVBhcnRzTGVuZ3RoKSk7XG5cbiAgcmV0dXJuIG91dHB1dFBhcnRzLmpvaW4oJy8nKTtcbn07XG5cbmV4cG9ydHMuc2VwID0gJy8nO1xuZXhwb3J0cy5kZWxpbWl0ZXIgPSAnOic7XG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IHNwbGl0UGF0aChwYXRoKSxcbiAgICAgIHJvb3QgPSByZXN1bHRbMF0sXG4gICAgICBkaXIgPSByZXN1bHRbMV07XG5cbiAgaWYgKCFyb290ICYmICFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lIHdoYXRzb2V2ZXJcbiAgICByZXR1cm4gJy4nO1xuICB9XG5cbiAgaWYgKGRpcikge1xuICAgIC8vIEl0IGhhcyBhIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgZGlyID0gZGlyLnN1YnN0cigwLCBkaXIubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gcm9vdCArIGRpcjtcbn07XG5cblxuZXhwb3J0cy5iYXNlbmFtZSA9IGZ1bmN0aW9uKHBhdGgsIGV4dCkge1xuICB2YXIgZiA9IHNwbGl0UGF0aChwYXRoKVsyXTtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIGNvbXBhcmlzb24gY2FzZS1pbnNlbnNpdGl2ZSBvbiB3aW5kb3dzP1xuICBpZiAoZXh0ICYmIGYuc3Vic3RyKC0xICogZXh0Lmxlbmd0aCkgPT09IGV4dCkge1xuICAgIGYgPSBmLnN1YnN0cigwLCBmLmxlbmd0aCAtIGV4dC5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBmO1xufTtcblxuXG5leHBvcnRzLmV4dG5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBzcGxpdFBhdGgocGF0aClbM107XG59O1xuXG5mdW5jdGlvbiBmaWx0ZXIgKHhzLCBmKSB7XG4gICAgaWYgKHhzLmZpbHRlcikgcmV0dXJuIHhzLmZpbHRlcihmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUuc3Vic3RyIC0gbmVnYXRpdmUgaW5kZXggZG9uJ3Qgd29yayBpbiBJRThcbnZhciBzdWJzdHIgPSAnYWInLnN1YnN0cigtMSkgPT09ICdiJ1xuICAgID8gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikgeyByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKSB9XG4gICAgOiBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7XG4gICAgICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gc3RyLmxlbmd0aCArIHN0YXJ0O1xuICAgICAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKTtcbiAgICB9XG47XG4iXX0=
},{"_process":2}],2:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],3:[function(require,module,exports){
(function (process,global){
(function(global) {
  'use strict';
  if (global.$traceurRuntime) {
    return;
  }
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $Object.defineProperties;
  var $defineProperty = $Object.defineProperty;
  var $freeze = $Object.freeze;
  var $getOwnPropertyDescriptor = $Object.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $Object.getOwnPropertyNames;
  var $keys = $Object.keys;
  var $hasOwnProperty = $Object.prototype.hasOwnProperty;
  var $toString = $Object.prototype.toString;
  var $preventExtensions = Object.preventExtensions;
  var $seal = Object.seal;
  var $isExtensible = Object.isExtensible;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var method = nonEnum;
  var counter = 0;
  function newUniqueString() {
    return '__$' + Math.floor(Math.random() * 1e9) + '$' + ++counter + '$__';
  }
  var symbolInternalProperty = newUniqueString();
  var symbolDescriptionProperty = newUniqueString();
  var symbolDataProperty = newUniqueString();
  var symbolValues = $create(null);
  var privateNames = $create(null);
  function isPrivateName(s) {
    return privateNames[s];
  }
  function createPrivateName() {
    var s = newUniqueString();
    privateNames[s] = true;
    return s;
  }
  function isShimSymbol(symbol) {
    return typeof symbol === 'object' && symbol instanceof SymbolValue;
  }
  function typeOf(v) {
    if (isShimSymbol(v))
      return 'symbol';
    return typeof v;
  }
  function Symbol(description) {
    var value = new SymbolValue(description);
    if (!(this instanceof Symbol))
      return value;
    throw new TypeError('Symbol cannot be new\'ed');
  }
  $defineProperty(Symbol.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(Symbol.prototype, 'toString', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    var desc = symbolValue[symbolDescriptionProperty];
    if (desc === undefined)
      desc = '';
    return 'Symbol(' + desc + ')';
  }));
  $defineProperty(Symbol.prototype, 'valueOf', method(function() {
    var symbolValue = this[symbolDataProperty];
    if (!symbolValue)
      throw TypeError('Conversion from symbol to string');
    if (!getOption('symbols'))
      return symbolValue[symbolInternalProperty];
    return symbolValue;
  }));
  function SymbolValue(description) {
    var key = newUniqueString();
    $defineProperty(this, symbolDataProperty, {value: this});
    $defineProperty(this, symbolInternalProperty, {value: key});
    $defineProperty(this, symbolDescriptionProperty, {value: description});
    freeze(this);
    symbolValues[key] = this;
  }
  $defineProperty(SymbolValue.prototype, 'constructor', nonEnum(Symbol));
  $defineProperty(SymbolValue.prototype, 'toString', {
    value: Symbol.prototype.toString,
    enumerable: false
  });
  $defineProperty(SymbolValue.prototype, 'valueOf', {
    value: Symbol.prototype.valueOf,
    enumerable: false
  });
  var hashProperty = createPrivateName();
  var hashPropertyDescriptor = {value: undefined};
  var hashObjectProperties = {
    hash: {value: undefined},
    self: {value: undefined}
  };
  var hashCounter = 0;
  function getOwnHashObject(object) {
    var hashObject = object[hashProperty];
    if (hashObject && hashObject.self === object)
      return hashObject;
    if ($isExtensible(object)) {
      hashObjectProperties.hash.value = hashCounter++;
      hashObjectProperties.self.value = object;
      hashPropertyDescriptor.value = $create(null, hashObjectProperties);
      $defineProperty(object, hashProperty, hashPropertyDescriptor);
      return hashPropertyDescriptor.value;
    }
    return undefined;
  }
  function freeze(object) {
    getOwnHashObject(object);
    return $freeze.apply(this, arguments);
  }
  function preventExtensions(object) {
    getOwnHashObject(object);
    return $preventExtensions.apply(this, arguments);
  }
  function seal(object) {
    getOwnHashObject(object);
    return $seal.apply(this, arguments);
  }
  freeze(SymbolValue.prototype);
  function isSymbolString(s) {
    return symbolValues[s] || privateNames[s];
  }
  function toProperty(name) {
    if (isShimSymbol(name))
      return name[symbolInternalProperty];
    return name;
  }
  function removeSymbolKeys(array) {
    var rv = [];
    for (var i = 0; i < array.length; i++) {
      if (!isSymbolString(array[i])) {
        rv.push(array[i]);
      }
    }
    return rv;
  }
  function getOwnPropertyNames(object) {
    return removeSymbolKeys($getOwnPropertyNames(object));
  }
  function keys(object) {
    return removeSymbolKeys($keys(object));
  }
  function getOwnPropertySymbols(object) {
    var rv = [];
    var names = $getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var symbol = symbolValues[names[i]];
      if (symbol) {
        rv.push(symbol);
      }
    }
    return rv;
  }
  function getOwnPropertyDescriptor(object, name) {
    return $getOwnPropertyDescriptor(object, toProperty(name));
  }
  function hasOwnProperty(name) {
    return $hasOwnProperty.call(this, toProperty(name));
  }
  function getOption(name) {
    return global.traceur && global.traceur.options[name];
  }
  function defineProperty(object, name, descriptor) {
    if (isShimSymbol(name)) {
      name = name[symbolInternalProperty];
    }
    $defineProperty(object, name, descriptor);
    return object;
  }
  function polyfillObject(Object) {
    $defineProperty(Object, 'defineProperty', {value: defineProperty});
    $defineProperty(Object, 'getOwnPropertyNames', {value: getOwnPropertyNames});
    $defineProperty(Object, 'getOwnPropertyDescriptor', {value: getOwnPropertyDescriptor});
    $defineProperty(Object.prototype, 'hasOwnProperty', {value: hasOwnProperty});
    $defineProperty(Object, 'freeze', {value: freeze});
    $defineProperty(Object, 'preventExtensions', {value: preventExtensions});
    $defineProperty(Object, 'seal', {value: seal});
    $defineProperty(Object, 'keys', {value: keys});
  }
  function exportStar(object) {
    for (var i = 1; i < arguments.length; i++) {
      var names = $getOwnPropertyNames(arguments[i]);
      for (var j = 0; j < names.length; j++) {
        var name = names[j];
        if (isSymbolString(name))
          continue;
        (function(mod, name) {
          $defineProperty(object, name, {
            get: function() {
              return mod[name];
            },
            enumerable: true
          });
        })(arguments[i], names[j]);
      }
    }
    return object;
  }
  function isObject(x) {
    return x != null && (typeof x === 'object' || typeof x === 'function');
  }
  function toObject(x) {
    if (x == null)
      throw $TypeError();
    return $Object(x);
  }
  function checkObjectCoercible(argument) {
    if (argument == null) {
      throw new TypeError('Value cannot be converted to an Object');
    }
    return argument;
  }
  function polyfillSymbol(global, Symbol) {
    if (!global.Symbol) {
      global.Symbol = Symbol;
      Object.getOwnPropertySymbols = getOwnPropertySymbols;
    }
    if (!global.Symbol.iterator) {
      global.Symbol.iterator = Symbol('Symbol.iterator');
    }
  }
  function setupGlobals(global) {
    polyfillSymbol(global, Symbol);
    global.Reflect = global.Reflect || {};
    global.Reflect.global = global.Reflect.global || global;
    polyfillObject(global.Object);
  }
  setupGlobals(global);
  global.$traceurRuntime = {
    checkObjectCoercible: checkObjectCoercible,
    createPrivateName: createPrivateName,
    defineProperties: $defineProperties,
    defineProperty: $defineProperty,
    exportStar: exportStar,
    getOwnHashObject: getOwnHashObject,
    getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
    getOwnPropertyNames: $getOwnPropertyNames,
    isObject: isObject,
    isPrivateName: isPrivateName,
    isSymbolString: isSymbolString,
    keys: $keys,
    setupGlobals: setupGlobals,
    toObject: toObject,
    toProperty: toProperty,
    typeof: typeOf
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
(function() {
  'use strict';
  var path;
  function relativeRequire(callerPath, requiredPath) {
    path = path || typeof require !== 'undefined' && require('path');
    function isDirectory(path) {
      return path.slice(-1) === '/';
    }
    function isAbsolute(path) {
      return path[0] === '/';
    }
    function isRelative(path) {
      return path[0] === '.';
    }
    if (isDirectory(requiredPath) || isAbsolute(requiredPath))
      return;
    return isRelative(requiredPath) ? require(path.resolve(path.dirname(callerPath), requiredPath)) : require(requiredPath);
  }
  $traceurRuntime.require = relativeRequire;
})();
(function() {
  'use strict';
  function spread() {
    var rv = [],
        j = 0,
        iterResult;
    for (var i = 0; i < arguments.length; i++) {
      var valueToSpread = $traceurRuntime.checkObjectCoercible(arguments[i]);
      if (typeof valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)] !== 'function') {
        throw new TypeError('Cannot spread non-iterable object.');
      }
      var iter = valueToSpread[$traceurRuntime.toProperty(Symbol.iterator)]();
      while (!(iterResult = iter.next()).done) {
        rv[j++] = iterResult.value;
      }
    }
    return rv;
  }
  $traceurRuntime.spread = spread;
})();
(function() {
  'use strict';
  var $Object = Object;
  var $TypeError = TypeError;
  var $create = $Object.create;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $getOwnPropertyDescriptor = $traceurRuntime.getOwnPropertyDescriptor;
  var $getOwnPropertyNames = $traceurRuntime.getOwnPropertyNames;
  var $getPrototypeOf = Object.getPrototypeOf;
  var $__0 = Object,
      getOwnPropertyNames = $__0.getOwnPropertyNames,
      getOwnPropertySymbols = $__0.getOwnPropertySymbols;
  function superDescriptor(homeObject, name) {
    var proto = $getPrototypeOf(homeObject);
    do {
      var result = $getOwnPropertyDescriptor(proto, name);
      if (result)
        return result;
      proto = $getPrototypeOf(proto);
    } while (proto);
    return undefined;
  }
  function superConstructor(ctor) {
    return ctor.__proto__;
  }
  function superCall(self, homeObject, name, args) {
    return superGet(self, homeObject, name).apply(self, args);
  }
  function superGet(self, homeObject, name) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor) {
      if (!descriptor.get)
        return descriptor.value;
      return descriptor.get.call(self);
    }
    return undefined;
  }
  function superSet(self, homeObject, name, value) {
    var descriptor = superDescriptor(homeObject, name);
    if (descriptor && descriptor.set) {
      descriptor.set.call(self, value);
      return value;
    }
    throw $TypeError(("super has no setter '" + name + "'."));
  }
  function getDescriptors(object) {
    var descriptors = {};
    var names = getOwnPropertyNames(object);
    for (var i = 0; i < names.length; i++) {
      var name = names[i];
      descriptors[name] = $getOwnPropertyDescriptor(object, name);
    }
    var symbols = getOwnPropertySymbols(object);
    for (var i = 0; i < symbols.length; i++) {
      var symbol = symbols[i];
      descriptors[$traceurRuntime.toProperty(symbol)] = $getOwnPropertyDescriptor(object, $traceurRuntime.toProperty(symbol));
    }
    return descriptors;
  }
  function createClass(ctor, object, staticObject, superClass) {
    $defineProperty(object, 'constructor', {
      value: ctor,
      configurable: true,
      enumerable: false,
      writable: true
    });
    if (arguments.length > 3) {
      if (typeof superClass === 'function')
        ctor.__proto__ = superClass;
      ctor.prototype = $create(getProtoParent(superClass), getDescriptors(object));
    } else {
      ctor.prototype = object;
    }
    $defineProperty(ctor, 'prototype', {
      configurable: false,
      writable: false
    });
    return $defineProperties(ctor, getDescriptors(staticObject));
  }
  function getProtoParent(superClass) {
    if (typeof superClass === 'function') {
      var prototype = superClass.prototype;
      if ($Object(prototype) === prototype || prototype === null)
        return superClass.prototype;
      throw new $TypeError('super prototype must be an Object or null');
    }
    if (superClass === null)
      return null;
    throw new $TypeError(("Super expression must either be null or a function, not " + typeof superClass + "."));
  }
  function defaultSuperCall(self, homeObject, args) {
    if ($getPrototypeOf(homeObject) !== null)
      superCall(self, homeObject, 'constructor', args);
  }
  $traceurRuntime.createClass = createClass;
  $traceurRuntime.defaultSuperCall = defaultSuperCall;
  $traceurRuntime.superCall = superCall;
  $traceurRuntime.superConstructor = superConstructor;
  $traceurRuntime.superGet = superGet;
  $traceurRuntime.superSet = superSet;
})();
(function() {
  'use strict';
  if (typeof $traceurRuntime !== 'object') {
    throw new Error('traceur runtime not found.');
  }
  var createPrivateName = $traceurRuntime.createPrivateName;
  var $defineProperties = $traceurRuntime.defineProperties;
  var $defineProperty = $traceurRuntime.defineProperty;
  var $create = Object.create;
  var $TypeError = TypeError;
  function nonEnum(value) {
    return {
      configurable: true,
      enumerable: false,
      value: value,
      writable: true
    };
  }
  var ST_NEWBORN = 0;
  var ST_EXECUTING = 1;
  var ST_SUSPENDED = 2;
  var ST_CLOSED = 3;
  var END_STATE = -2;
  var RETHROW_STATE = -3;
  function getInternalError(state) {
    return new Error('Traceur compiler bug: invalid state in state machine: ' + state);
  }
  function GeneratorContext() {
    this.state = 0;
    this.GState = ST_NEWBORN;
    this.storedException = undefined;
    this.finallyFallThrough = undefined;
    this.sent_ = undefined;
    this.returnValue = undefined;
    this.tryStack_ = [];
  }
  GeneratorContext.prototype = {
    pushTry: function(catchState, finallyState) {
      if (finallyState !== null) {
        var finallyFallThrough = null;
        for (var i = this.tryStack_.length - 1; i >= 0; i--) {
          if (this.tryStack_[i].catch !== undefined) {
            finallyFallThrough = this.tryStack_[i].catch;
            break;
          }
        }
        if (finallyFallThrough === null)
          finallyFallThrough = RETHROW_STATE;
        this.tryStack_.push({
          finally: finallyState,
          finallyFallThrough: finallyFallThrough
        });
      }
      if (catchState !== null) {
        this.tryStack_.push({catch: catchState});
      }
    },
    popTry: function() {
      this.tryStack_.pop();
    },
    get sent() {
      this.maybeThrow();
      return this.sent_;
    },
    set sent(v) {
      this.sent_ = v;
    },
    get sentIgnoreThrow() {
      return this.sent_;
    },
    maybeThrow: function() {
      if (this.action === 'throw') {
        this.action = 'next';
        throw this.sent_;
      }
    },
    end: function() {
      switch (this.state) {
        case END_STATE:
          return this;
        case RETHROW_STATE:
          throw this.storedException;
        default:
          throw getInternalError(this.state);
      }
    },
    handleException: function(ex) {
      this.GState = ST_CLOSED;
      this.state = END_STATE;
      throw ex;
    }
  };
  function nextOrThrow(ctx, moveNext, action, x) {
    switch (ctx.GState) {
      case ST_EXECUTING:
        throw new Error(("\"" + action + "\" on executing generator"));
      case ST_CLOSED:
        if (action == 'next') {
          return {
            value: undefined,
            done: true
          };
        }
        throw x;
      case ST_NEWBORN:
        if (action === 'throw') {
          ctx.GState = ST_CLOSED;
          throw x;
        }
        if (x !== undefined)
          throw $TypeError('Sent value to newborn generator');
      case ST_SUSPENDED:
        ctx.GState = ST_EXECUTING;
        ctx.action = action;
        ctx.sent = x;
        var value = moveNext(ctx);
        var done = value === ctx;
        if (done)
          value = ctx.returnValue;
        ctx.GState = done ? ST_CLOSED : ST_SUSPENDED;
        return {
          value: value,
          done: done
        };
    }
  }
  var ctxName = createPrivateName();
  var moveNextName = createPrivateName();
  function GeneratorFunction() {}
  function GeneratorFunctionPrototype() {}
  GeneratorFunction.prototype = GeneratorFunctionPrototype;
  $defineProperty(GeneratorFunctionPrototype, 'constructor', nonEnum(GeneratorFunction));
  GeneratorFunctionPrototype.prototype = {
    constructor: GeneratorFunctionPrototype,
    next: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'next', v);
    },
    throw: function(v) {
      return nextOrThrow(this[ctxName], this[moveNextName], 'throw', v);
    }
  };
  $defineProperties(GeneratorFunctionPrototype.prototype, {
    constructor: {enumerable: false},
    next: {enumerable: false},
    throw: {enumerable: false}
  });
  Object.defineProperty(GeneratorFunctionPrototype.prototype, Symbol.iterator, nonEnum(function() {
    return this;
  }));
  function createGeneratorInstance(innerFunction, functionObject, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new GeneratorContext();
    var object = $create(functionObject.prototype);
    object[ctxName] = ctx;
    object[moveNextName] = moveNext;
    return object;
  }
  function initGeneratorFunction(functionObject) {
    functionObject.prototype = $create(GeneratorFunctionPrototype.prototype);
    functionObject.__proto__ = GeneratorFunctionPrototype;
    return functionObject;
  }
  function AsyncFunctionContext() {
    GeneratorContext.call(this);
    this.err = undefined;
    var ctx = this;
    ctx.result = new Promise(function(resolve, reject) {
      ctx.resolve = resolve;
      ctx.reject = reject;
    });
  }
  AsyncFunctionContext.prototype = $create(GeneratorContext.prototype);
  AsyncFunctionContext.prototype.end = function() {
    switch (this.state) {
      case END_STATE:
        this.resolve(this.returnValue);
        break;
      case RETHROW_STATE:
        this.reject(this.storedException);
        break;
      default:
        this.reject(getInternalError(this.state));
    }
  };
  AsyncFunctionContext.prototype.handleException = function() {
    this.state = RETHROW_STATE;
  };
  function asyncWrap(innerFunction, self) {
    var moveNext = getMoveNext(innerFunction, self);
    var ctx = new AsyncFunctionContext();
    ctx.createCallback = function(newState) {
      return function(value) {
        ctx.state = newState;
        ctx.value = value;
        moveNext(ctx);
      };
    };
    ctx.errback = function(err) {
      handleCatch(ctx, err);
      moveNext(ctx);
    };
    moveNext(ctx);
    return ctx.result;
  }
  function getMoveNext(innerFunction, self) {
    return function(ctx) {
      while (true) {
        try {
          return innerFunction.call(self, ctx);
        } catch (ex) {
          handleCatch(ctx, ex);
        }
      }
    };
  }
  function handleCatch(ctx, ex) {
    ctx.storedException = ex;
    var last = ctx.tryStack_[ctx.tryStack_.length - 1];
    if (!last) {
      ctx.handleException(ex);
      return;
    }
    ctx.state = last.catch !== undefined ? last.catch : last.finally;
    if (last.finallyFallThrough !== undefined)
      ctx.finallyFallThrough = last.finallyFallThrough;
  }
  $traceurRuntime.asyncWrap = asyncWrap;
  $traceurRuntime.initGeneratorFunction = initGeneratorFunction;
  $traceurRuntime.createGeneratorInstance = createGeneratorInstance;
})();
(function() {
  function buildFromEncodedParts(opt_scheme, opt_userInfo, opt_domain, opt_port, opt_path, opt_queryData, opt_fragment) {
    var out = [];
    if (opt_scheme) {
      out.push(opt_scheme, ':');
    }
    if (opt_domain) {
      out.push('//');
      if (opt_userInfo) {
        out.push(opt_userInfo, '@');
      }
      out.push(opt_domain);
      if (opt_port) {
        out.push(':', opt_port);
      }
    }
    if (opt_path) {
      out.push(opt_path);
    }
    if (opt_queryData) {
      out.push('?', opt_queryData);
    }
    if (opt_fragment) {
      out.push('#', opt_fragment);
    }
    return out.join('');
  }
  ;
  var splitRe = new RegExp('^' + '(?:' + '([^:/?#.]+)' + ':)?' + '(?://' + '(?:([^/?#]*)@)?' + '([\\w\\d\\-\\u0100-\\uffff.%]*)' + '(?::([0-9]+))?' + ')?' + '([^?#]+)?' + '(?:\\?([^#]*))?' + '(?:#(.*))?' + '$');
  var ComponentIndex = {
    SCHEME: 1,
    USER_INFO: 2,
    DOMAIN: 3,
    PORT: 4,
    PATH: 5,
    QUERY_DATA: 6,
    FRAGMENT: 7
  };
  function split(uri) {
    return (uri.match(splitRe));
  }
  function removeDotSegments(path) {
    if (path === '/')
      return '/';
    var leadingSlash = path[0] === '/' ? '/' : '';
    var trailingSlash = path.slice(-1) === '/' ? '/' : '';
    var segments = path.split('/');
    var out = [];
    var up = 0;
    for (var pos = 0; pos < segments.length; pos++) {
      var segment = segments[pos];
      switch (segment) {
        case '':
        case '.':
          break;
        case '..':
          if (out.length)
            out.pop();
          else
            up++;
          break;
        default:
          out.push(segment);
      }
    }
    if (!leadingSlash) {
      while (up-- > 0) {
        out.unshift('..');
      }
      if (out.length === 0)
        out.push('.');
    }
    return leadingSlash + out.join('/') + trailingSlash;
  }
  function joinAndCanonicalizePath(parts) {
    var path = parts[ComponentIndex.PATH] || '';
    path = removeDotSegments(path);
    parts[ComponentIndex.PATH] = path;
    return buildFromEncodedParts(parts[ComponentIndex.SCHEME], parts[ComponentIndex.USER_INFO], parts[ComponentIndex.DOMAIN], parts[ComponentIndex.PORT], parts[ComponentIndex.PATH], parts[ComponentIndex.QUERY_DATA], parts[ComponentIndex.FRAGMENT]);
  }
  function canonicalizeUrl(url) {
    var parts = split(url);
    return joinAndCanonicalizePath(parts);
  }
  function resolveUrl(base, url) {
    var parts = split(url);
    var baseParts = split(base);
    if (parts[ComponentIndex.SCHEME]) {
      return joinAndCanonicalizePath(parts);
    } else {
      parts[ComponentIndex.SCHEME] = baseParts[ComponentIndex.SCHEME];
    }
    for (var i = ComponentIndex.SCHEME; i <= ComponentIndex.PORT; i++) {
      if (!parts[i]) {
        parts[i] = baseParts[i];
      }
    }
    if (parts[ComponentIndex.PATH][0] == '/') {
      return joinAndCanonicalizePath(parts);
    }
    var path = baseParts[ComponentIndex.PATH];
    var index = path.lastIndexOf('/');
    path = path.slice(0, index + 1) + parts[ComponentIndex.PATH];
    parts[ComponentIndex.PATH] = path;
    return joinAndCanonicalizePath(parts);
  }
  function isAbsolute(name) {
    if (!name)
      return false;
    if (name[0] === '/')
      return true;
    var parts = split(name);
    if (parts[ComponentIndex.SCHEME])
      return true;
    return false;
  }
  $traceurRuntime.canonicalizeUrl = canonicalizeUrl;
  $traceurRuntime.isAbsolute = isAbsolute;
  $traceurRuntime.removeDotSegments = removeDotSegments;
  $traceurRuntime.resolveUrl = resolveUrl;
})();
(function() {
  'use strict';
  var types = {
    any: {name: 'any'},
    boolean: {name: 'boolean'},
    number: {name: 'number'},
    string: {name: 'string'},
    symbol: {name: 'symbol'},
    void: {name: 'void'}
  };
  var GenericType = function GenericType(type, argumentTypes) {
    this.type = type;
    this.argumentTypes = argumentTypes;
  };
  ($traceurRuntime.createClass)(GenericType, {}, {});
  var typeRegister = Object.create(null);
  function genericType(type) {
    for (var argumentTypes = [],
        $__1 = 1; $__1 < arguments.length; $__1++)
      argumentTypes[$__1 - 1] = arguments[$__1];
    var typeMap = typeRegister;
    var key = $traceurRuntime.getOwnHashObject(type).hash;
    if (!typeMap[key]) {
      typeMap[key] = Object.create(null);
    }
    typeMap = typeMap[key];
    for (var i = 0; i < argumentTypes.length - 1; i++) {
      key = $traceurRuntime.getOwnHashObject(argumentTypes[i]).hash;
      if (!typeMap[key]) {
        typeMap[key] = Object.create(null);
      }
      typeMap = typeMap[key];
    }
    var tail = argumentTypes[argumentTypes.length - 1];
    key = $traceurRuntime.getOwnHashObject(tail).hash;
    if (!typeMap[key]) {
      typeMap[key] = new GenericType(type, argumentTypes);
    }
    return typeMap[key];
  }
  $traceurRuntime.GenericType = GenericType;
  $traceurRuntime.genericType = genericType;
  $traceurRuntime.type = types;
})();
(function(global) {
  'use strict';
  var $__2 = $traceurRuntime,
      canonicalizeUrl = $__2.canonicalizeUrl,
      resolveUrl = $__2.resolveUrl,
      isAbsolute = $__2.isAbsolute;
  var moduleInstantiators = Object.create(null);
  var baseURL;
  if (global.location && global.location.href)
    baseURL = resolveUrl(global.location.href, './');
  else
    baseURL = '';
  var UncoatedModuleEntry = function UncoatedModuleEntry(url, uncoatedModule) {
    this.url = url;
    this.value_ = uncoatedModule;
  };
  ($traceurRuntime.createClass)(UncoatedModuleEntry, {}, {});
  var ModuleEvaluationError = function ModuleEvaluationError(erroneousModuleName, cause) {
    this.message = this.constructor.name + ': ' + this.stripCause(cause) + ' in ' + erroneousModuleName;
    if (!(cause instanceof $ModuleEvaluationError) && cause.stack)
      this.stack = this.stripStack(cause.stack);
    else
      this.stack = '';
  };
  var $ModuleEvaluationError = ModuleEvaluationError;
  ($traceurRuntime.createClass)(ModuleEvaluationError, {
    stripError: function(message) {
      return message.replace(/.*Error:/, this.constructor.name + ':');
    },
    stripCause: function(cause) {
      if (!cause)
        return '';
      if (!cause.message)
        return cause + '';
      return this.stripError(cause.message);
    },
    loadedBy: function(moduleName) {
      this.stack += '\n loaded by ' + moduleName;
    },
    stripStack: function(causeStack) {
      var stack = [];
      causeStack.split('\n').some((function(frame) {
        if (/UncoatedModuleInstantiator/.test(frame))
          return true;
        stack.push(frame);
      }));
      stack[0] = this.stripError(stack[0]);
      return stack.join('\n');
    }
  }, {}, Error);
  function beforeLines(lines, number) {
    var result = [];
    var first = number - 3;
    if (first < 0)
      first = 0;
    for (var i = first; i < number; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function afterLines(lines, number) {
    var last = number + 1;
    if (last > lines.length - 1)
      last = lines.length - 1;
    var result = [];
    for (var i = number; i <= last; i++) {
      result.push(lines[i]);
    }
    return result;
  }
  function columnSpacing(columns) {
    var result = '';
    for (var i = 0; i < columns - 1; i++) {
      result += '-';
    }
    return result;
  }
  var UncoatedModuleInstantiator = function UncoatedModuleInstantiator(url, func) {
    $traceurRuntime.superConstructor($UncoatedModuleInstantiator).call(this, url, null);
    this.func = func;
  };
  var $UncoatedModuleInstantiator = UncoatedModuleInstantiator;
  ($traceurRuntime.createClass)(UncoatedModuleInstantiator, {getUncoatedModule: function() {
      if (this.value_)
        return this.value_;
      try {
        var relativeRequire;
        if (typeof $traceurRuntime !== undefined) {
          relativeRequire = $traceurRuntime.require.bind(null, this.url);
        }
        return this.value_ = this.func.call(global, relativeRequire);
      } catch (ex) {
        if (ex instanceof ModuleEvaluationError) {
          ex.loadedBy(this.url);
          throw ex;
        }
        if (ex.stack) {
          var lines = this.func.toString().split('\n');
          var evaled = [];
          ex.stack.split('\n').some(function(frame) {
            if (frame.indexOf('UncoatedModuleInstantiator.getUncoatedModule') > 0)
              return true;
            var m = /(at\s[^\s]*\s).*>:(\d*):(\d*)\)/.exec(frame);
            if (m) {
              var line = parseInt(m[2], 10);
              evaled = evaled.concat(beforeLines(lines, line));
              evaled.push(columnSpacing(m[3]) + '^');
              evaled = evaled.concat(afterLines(lines, line));
              evaled.push('= = = = = = = = =');
            } else {
              evaled.push(frame);
            }
          });
          ex.stack = evaled.join('\n');
        }
        throw new ModuleEvaluationError(this.url, ex);
      }
    }}, {}, UncoatedModuleEntry);
  function getUncoatedModuleInstantiator(name) {
    if (!name)
      return;
    var url = ModuleStore.normalize(name);
    return moduleInstantiators[url];
  }
  ;
  var moduleInstances = Object.create(null);
  var liveModuleSentinel = {};
  function Module(uncoatedModule) {
    var isLive = arguments[1];
    var coatedModule = Object.create(null);
    Object.getOwnPropertyNames(uncoatedModule).forEach((function(name) {
      var getter,
          value;
      if (isLive === liveModuleSentinel) {
        var descr = Object.getOwnPropertyDescriptor(uncoatedModule, name);
        if (descr.get)
          getter = descr.get;
      }
      if (!getter) {
        value = uncoatedModule[name];
        getter = function() {
          return value;
        };
      }
      Object.defineProperty(coatedModule, name, {
        get: getter,
        enumerable: true
      });
    }));
    Object.preventExtensions(coatedModule);
    return coatedModule;
  }
  var ModuleStore = {
    normalize: function(name, refererName, refererAddress) {
      if (typeof name !== 'string')
        throw new TypeError('module name must be a string, not ' + typeof name);
      if (isAbsolute(name))
        return canonicalizeUrl(name);
      if (/[^\.]\/\.\.\//.test(name)) {
        throw new Error('module name embeds /../: ' + name);
      }
      if (name[0] === '.' && refererName)
        return resolveUrl(refererName, name);
      return canonicalizeUrl(name);
    },
    get: function(normalizedName) {
      var m = getUncoatedModuleInstantiator(normalizedName);
      if (!m)
        return undefined;
      var moduleInstance = moduleInstances[m.url];
      if (moduleInstance)
        return moduleInstance;
      moduleInstance = Module(m.getUncoatedModule(), liveModuleSentinel);
      return moduleInstances[m.url] = moduleInstance;
    },
    set: function(normalizedName, module) {
      normalizedName = String(normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, (function() {
        return module;
      }));
      moduleInstances[normalizedName] = module;
    },
    get baseURL() {
      return baseURL;
    },
    set baseURL(v) {
      baseURL = String(v);
    },
    registerModule: function(name, deps, func) {
      var normalizedName = ModuleStore.normalize(name);
      if (moduleInstantiators[normalizedName])
        throw new Error('duplicate module named ' + normalizedName);
      moduleInstantiators[normalizedName] = new UncoatedModuleInstantiator(normalizedName, func);
    },
    bundleStore: Object.create(null),
    register: function(name, deps, func) {
      if (!deps || !deps.length && !func.length) {
        this.registerModule(name, deps, func);
      } else {
        this.bundleStore[name] = {
          deps: deps,
          execute: function() {
            var $__0 = arguments;
            var depMap = {};
            deps.forEach((function(dep, index) {
              return depMap[dep] = $__0[index];
            }));
            var registryEntry = func.call(this, depMap);
            registryEntry.execute.call(this);
            return registryEntry.exports;
          }
        };
      }
    },
    getAnonymousModule: function(func) {
      return new Module(func.call(global), liveModuleSentinel);
    },
    getForTesting: function(name) {
      var $__0 = this;
      if (!this.testingPrefix_) {
        Object.keys(moduleInstances).some((function(key) {
          var m = /(traceur@[^\/]*\/)/.exec(key);
          if (m) {
            $__0.testingPrefix_ = m[1];
            return true;
          }
        }));
      }
      return this.get(this.testingPrefix_ + name);
    }
  };
  var moduleStoreModule = new Module({ModuleStore: ModuleStore});
  ModuleStore.set('@traceur/src/runtime/ModuleStore', moduleStoreModule);
  ModuleStore.set('@traceur/src/runtime/ModuleStore.js', moduleStoreModule);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
  };
  $traceurRuntime.ModuleStore = ModuleStore;
  global.System = {
    register: ModuleStore.register.bind(ModuleStore),
    registerModule: ModuleStore.registerModule.bind(ModuleStore),
    get: ModuleStore.get,
    set: ModuleStore.set,
    normalize: ModuleStore.normalize
  };
  $traceurRuntime.getModuleImpl = function(name) {
    var instantiator = getUncoatedModuleInstantiator(name);
    return instantiator && instantiator.getUncoatedModule();
  };
})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : this);
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/utils.js";
  var $ceil = Math.ceil;
  var $floor = Math.floor;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var $pow = Math.pow;
  var $min = Math.min;
  var toObject = $traceurRuntime.toObject;
  function toUint32(x) {
    return x >>> 0;
  }
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function isCallable(x) {
    return typeof x === 'function';
  }
  function isNumber(x) {
    return typeof x === 'number';
  }
  function toInteger(x) {
    x = +x;
    if ($isNaN(x))
      return 0;
    if (x === 0 || !$isFinite(x))
      return x;
    return x > 0 ? $floor(x) : $ceil(x);
  }
  var MAX_SAFE_LENGTH = $pow(2, 53) - 1;
  function toLength(x) {
    var len = toInteger(x);
    return len < 0 ? 0 : $min(len, MAX_SAFE_LENGTH);
  }
  function checkIterable(x) {
    return !isObject(x) ? undefined : x[Symbol.iterator];
  }
  function isConstructor(x) {
    return isCallable(x);
  }
  function createIteratorResultObject(value, done) {
    return {
      value: value,
      done: done
    };
  }
  function maybeDefine(object, name, descr) {
    if (!(name in object)) {
      Object.defineProperty(object, name, descr);
    }
  }
  function maybeDefineMethod(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  function maybeDefineConst(object, name, value) {
    maybeDefine(object, name, {
      value: value,
      configurable: false,
      enumerable: false,
      writable: false
    });
  }
  function maybeAddFunctions(object, functions) {
    for (var i = 0; i < functions.length; i += 2) {
      var name = functions[i];
      var value = functions[i + 1];
      maybeDefineMethod(object, name, value);
    }
  }
  function maybeAddConsts(object, consts) {
    for (var i = 0; i < consts.length; i += 2) {
      var name = consts[i];
      var value = consts[i + 1];
      maybeDefineConst(object, name, value);
    }
  }
  function maybeAddIterator(object, func, Symbol) {
    if (!Symbol || !Symbol.iterator || object[Symbol.iterator])
      return;
    if (object['@@iterator'])
      func = object['@@iterator'];
    Object.defineProperty(object, Symbol.iterator, {
      value: func,
      configurable: true,
      enumerable: false,
      writable: true
    });
  }
  var polyfills = [];
  function registerPolyfill(func) {
    polyfills.push(func);
  }
  function polyfillAll(global) {
    polyfills.forEach((function(f) {
      return f(global);
    }));
  }
  return {
    get toObject() {
      return toObject;
    },
    get toUint32() {
      return toUint32;
    },
    get isObject() {
      return isObject;
    },
    get isCallable() {
      return isCallable;
    },
    get isNumber() {
      return isNumber;
    },
    get toInteger() {
      return toInteger;
    },
    get toLength() {
      return toLength;
    },
    get checkIterable() {
      return checkIterable;
    },
    get isConstructor() {
      return isConstructor;
    },
    get createIteratorResultObject() {
      return createIteratorResultObject;
    },
    get maybeDefine() {
      return maybeDefine;
    },
    get maybeDefineMethod() {
      return maybeDefineMethod;
    },
    get maybeDefineConst() {
      return maybeDefineConst;
    },
    get maybeAddFunctions() {
      return maybeAddFunctions;
    },
    get maybeAddConsts() {
      return maybeAddConsts;
    },
    get maybeAddIterator() {
      return maybeAddIterator;
    },
    get registerPolyfill() {
      return registerPolyfill;
    },
    get polyfillAll() {
      return polyfillAll;
    }
  };
});
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Map.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Map.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      maybeAddIterator = $__0.maybeAddIterator,
      registerPolyfill = $__0.registerPolyfill;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  var deletedSentinel = {};
  function lookupIndex(map, key) {
    if (isObject(key)) {
      var hashObject = getOwnHashObject(key);
      return hashObject && map.objectIndex_[hashObject.hash];
    }
    if (typeof key === 'string')
      return map.stringIndex_[key];
    return map.primitiveIndex_[key];
  }
  function initMap(map) {
    map.entries_ = [];
    map.objectIndex_ = Object.create(null);
    map.stringIndex_ = Object.create(null);
    map.primitiveIndex_ = Object.create(null);
    map.deletedCount_ = 0;
  }
  var Map = function Map() {
    var iterable = arguments[0];
    if (!isObject(this))
      throw new TypeError('Map called on incompatible type');
    if ($hasOwnProperty.call(this, 'entries_')) {
      throw new TypeError('Map can not be reentrantly initialised');
    }
    initMap(this);
    if (iterable !== null && iterable !== undefined) {
      for (var $__2 = iterable[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__3; !($__3 = $__2.next()).done; ) {
        var $__4 = $__3.value,
            key = $__4[0],
            value = $__4[1];
        {
          this.set(key, value);
        }
      }
    }
  };
  ($traceurRuntime.createClass)(Map, {
    get size() {
      return this.entries_.length / 2 - this.deletedCount_;
    },
    get: function(key) {
      var index = lookupIndex(this, key);
      if (index !== undefined)
        return this.entries_[index + 1];
    },
    set: function(key, value) {
      var objectMode = isObject(key);
      var stringMode = typeof key === 'string';
      var index = lookupIndex(this, key);
      if (index !== undefined) {
        this.entries_[index + 1] = value;
      } else {
        index = this.entries_.length;
        this.entries_[index] = key;
        this.entries_[index + 1] = value;
        if (objectMode) {
          var hashObject = getOwnHashObject(key);
          var hash = hashObject.hash;
          this.objectIndex_[hash] = index;
        } else if (stringMode) {
          this.stringIndex_[key] = index;
        } else {
          this.primitiveIndex_[key] = index;
        }
      }
      return this;
    },
    has: function(key) {
      return lookupIndex(this, key) !== undefined;
    },
    delete: function(key) {
      var objectMode = isObject(key);
      var stringMode = typeof key === 'string';
      var index;
      var hash;
      if (objectMode) {
        var hashObject = getOwnHashObject(key);
        if (hashObject) {
          index = this.objectIndex_[hash = hashObject.hash];
          delete this.objectIndex_[hash];
        }
      } else if (stringMode) {
        index = this.stringIndex_[key];
        delete this.stringIndex_[key];
      } else {
        index = this.primitiveIndex_[key];
        delete this.primitiveIndex_[key];
      }
      if (index !== undefined) {
        this.entries_[index] = deletedSentinel;
        this.entries_[index + 1] = undefined;
        this.deletedCount_++;
        return true;
      }
      return false;
    },
    clear: function() {
      initMap(this);
    },
    forEach: function(callbackFn) {
      var thisArg = arguments[1];
      for (var i = 0; i < this.entries_.length; i += 2) {
        var key = this.entries_[i];
        var value = this.entries_[i + 1];
        if (key === deletedSentinel)
          continue;
        callbackFn.call(thisArg, value, key, this);
      }
    },
    entries: $traceurRuntime.initGeneratorFunction(function $__5() {
      var i,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < this.entries_.length) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return [key, value];
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__5, this);
    }),
    keys: $traceurRuntime.initGeneratorFunction(function $__6() {
      var i,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < this.entries_.length) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return key;
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__6, this);
    }),
    values: $traceurRuntime.initGeneratorFunction(function $__7() {
      var i,
          key,
          value;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              i = 0;
              $ctx.state = 12;
              break;
            case 12:
              $ctx.state = (i < this.entries_.length) ? 8 : -2;
              break;
            case 4:
              i += 2;
              $ctx.state = 12;
              break;
            case 8:
              key = this.entries_[i];
              value = this.entries_[i + 1];
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = (key === deletedSentinel) ? 4 : 6;
              break;
            case 6:
              $ctx.state = 2;
              return value;
            case 2:
              $ctx.maybeThrow();
              $ctx.state = 4;
              break;
            default:
              return $ctx.end();
          }
      }, $__7, this);
    })
  }, {});
  Object.defineProperty(Map.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Map.prototype.entries
  });
  function polyfillMap(global) {
    var $__4 = global,
        Object = $__4.Object,
        Symbol = $__4.Symbol;
    if (!global.Map)
      global.Map = Map;
    var mapPrototype = global.Map.prototype;
    if (mapPrototype.entries === undefined)
      global.Map = Map;
    if (mapPrototype.entries) {
      maybeAddIterator(mapPrototype, mapPrototype.entries, Symbol);
      maybeAddIterator(Object.getPrototypeOf(new global.Map().entries()), function() {
        return this;
      }, Symbol);
    }
  }
  registerPolyfill(polyfillMap);
  return {
    get Map() {
      return Map;
    },
    get polyfillMap() {
      return polyfillMap;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Map.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Set.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Set.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      isObject = $__0.isObject,
      maybeAddIterator = $__0.maybeAddIterator,
      registerPolyfill = $__0.registerPolyfill;
  var Map = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Map.js").Map;
  var getOwnHashObject = $traceurRuntime.getOwnHashObject;
  var $hasOwnProperty = Object.prototype.hasOwnProperty;
  function initSet(set) {
    set.map_ = new Map();
  }
  var Set = function Set() {
    var iterable = arguments[0];
    if (!isObject(this))
      throw new TypeError('Set called on incompatible type');
    if ($hasOwnProperty.call(this, 'map_')) {
      throw new TypeError('Set can not be reentrantly initialised');
    }
    initSet(this);
    if (iterable !== null && iterable !== undefined) {
      for (var $__4 = iterable[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__5; !($__5 = $__4.next()).done; ) {
        var item = $__5.value;
        {
          this.add(item);
        }
      }
    }
  };
  ($traceurRuntime.createClass)(Set, {
    get size() {
      return this.map_.size;
    },
    has: function(key) {
      return this.map_.has(key);
    },
    add: function(key) {
      this.map_.set(key, key);
      return this;
    },
    delete: function(key) {
      return this.map_.delete(key);
    },
    clear: function() {
      return this.map_.clear();
    },
    forEach: function(callbackFn) {
      var thisArg = arguments[1];
      var $__2 = this;
      return this.map_.forEach((function(value, key) {
        callbackFn.call(thisArg, key, key, $__2);
      }));
    },
    values: $traceurRuntime.initGeneratorFunction(function $__7() {
      var $__8,
          $__9;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $__8 = this.map_.keys()[Symbol.iterator]();
              $ctx.sent = void 0;
              $ctx.action = 'next';
              $ctx.state = 12;
              break;
            case 12:
              $__9 = $__8[$ctx.action]($ctx.sentIgnoreThrow);
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = ($__9.done) ? 3 : 2;
              break;
            case 3:
              $ctx.sent = $__9.value;
              $ctx.state = -2;
              break;
            case 2:
              $ctx.state = 12;
              return $__9.value;
            default:
              return $ctx.end();
          }
      }, $__7, this);
    }),
    entries: $traceurRuntime.initGeneratorFunction(function $__10() {
      var $__11,
          $__12;
      return $traceurRuntime.createGeneratorInstance(function($ctx) {
        while (true)
          switch ($ctx.state) {
            case 0:
              $__11 = this.map_.entries()[Symbol.iterator]();
              $ctx.sent = void 0;
              $ctx.action = 'next';
              $ctx.state = 12;
              break;
            case 12:
              $__12 = $__11[$ctx.action]($ctx.sentIgnoreThrow);
              $ctx.state = 9;
              break;
            case 9:
              $ctx.state = ($__12.done) ? 3 : 2;
              break;
            case 3:
              $ctx.sent = $__12.value;
              $ctx.state = -2;
              break;
            case 2:
              $ctx.state = 12;
              return $__12.value;
            default:
              return $ctx.end();
          }
      }, $__10, this);
    })
  }, {});
  Object.defineProperty(Set.prototype, Symbol.iterator, {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  Object.defineProperty(Set.prototype, 'keys', {
    configurable: true,
    writable: true,
    value: Set.prototype.values
  });
  function polyfillSet(global) {
    var $__6 = global,
        Object = $__6.Object,
        Symbol = $__6.Symbol;
    if (!global.Set)
      global.Set = Set;
    var setPrototype = global.Set.prototype;
    if (setPrototype.values) {
      maybeAddIterator(setPrototype, setPrototype.values, Symbol);
      maybeAddIterator(Object.getPrototypeOf(new global.Set().values()), function() {
        return this;
      }, Symbol);
    }
  }
  registerPolyfill(polyfillSet);
  return {
    get Set() {
      return Set;
    },
    get polyfillSet() {
      return polyfillSet;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Set.js" + '');
System.registerModule("traceur-runtime@0.0.79/node_modules/rsvp/lib/rsvp/asap.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/node_modules/rsvp/lib/rsvp/asap.js";
  var len = 0;
  function asap(callback, arg) {
    queue[len] = callback;
    queue[len + 1] = arg;
    len += 2;
    if (len === 2) {
      scheduleFlush();
    }
  }
  var $__default = asap;
  var browserGlobal = (typeof window !== 'undefined') ? window : {};
  var BrowserMutationObserver = browserGlobal.MutationObserver || browserGlobal.WebKitMutationObserver;
  var isWorker = typeof Uint8ClampedArray !== 'undefined' && typeof importScripts !== 'undefined' && typeof MessageChannel !== 'undefined';
  function useNextTick() {
    return function() {
      process.nextTick(flush);
    };
  }
  function useMutationObserver() {
    var iterations = 0;
    var observer = new BrowserMutationObserver(flush);
    var node = document.createTextNode('');
    observer.observe(node, {characterData: true});
    return function() {
      node.data = (iterations = ++iterations % 2);
    };
  }
  function useMessageChannel() {
    var channel = new MessageChannel();
    channel.port1.onmessage = flush;
    return function() {
      channel.port2.postMessage(0);
    };
  }
  function useSetTimeout() {
    return function() {
      setTimeout(flush, 1);
    };
  }
  var queue = new Array(1000);
  function flush() {
    for (var i = 0; i < len; i += 2) {
      var callback = queue[i];
      var arg = queue[i + 1];
      callback(arg);
      queue[i] = undefined;
      queue[i + 1] = undefined;
    }
    len = 0;
  }
  var scheduleFlush;
  if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
    scheduleFlush = useNextTick();
  } else if (BrowserMutationObserver) {
    scheduleFlush = useMutationObserver();
  } else if (isWorker) {
    scheduleFlush = useMessageChannel();
  } else {
    scheduleFlush = useSetTimeout();
  }
  return {get default() {
      return $__default;
    }};
});
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Promise.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Promise.js";
  var async = System.get("traceur-runtime@0.0.79/node_modules/rsvp/lib/rsvp/asap.js").default;
  var registerPolyfill = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js").registerPolyfill;
  var promiseRaw = {};
  function isPromise(x) {
    return x && typeof x === 'object' && x.status_ !== undefined;
  }
  function idResolveHandler(x) {
    return x;
  }
  function idRejectHandler(x) {
    throw x;
  }
  function chain(promise) {
    var onResolve = arguments[1] !== (void 0) ? arguments[1] : idResolveHandler;
    var onReject = arguments[2] !== (void 0) ? arguments[2] : idRejectHandler;
    var deferred = getDeferred(promise.constructor);
    switch (promise.status_) {
      case undefined:
        throw TypeError;
      case 0:
        promise.onResolve_.push(onResolve, deferred);
        promise.onReject_.push(onReject, deferred);
        break;
      case +1:
        promiseEnqueue(promise.value_, [onResolve, deferred]);
        break;
      case -1:
        promiseEnqueue(promise.value_, [onReject, deferred]);
        break;
    }
    return deferred.promise;
  }
  function getDeferred(C) {
    if (this === $Promise) {
      var promise = promiseInit(new $Promise(promiseRaw));
      return {
        promise: promise,
        resolve: (function(x) {
          promiseResolve(promise, x);
        }),
        reject: (function(r) {
          promiseReject(promise, r);
        })
      };
    } else {
      var result = {};
      result.promise = new C((function(resolve, reject) {
        result.resolve = resolve;
        result.reject = reject;
      }));
      return result;
    }
  }
  function promiseSet(promise, status, value, onResolve, onReject) {
    promise.status_ = status;
    promise.value_ = value;
    promise.onResolve_ = onResolve;
    promise.onReject_ = onReject;
    return promise;
  }
  function promiseInit(promise) {
    return promiseSet(promise, 0, undefined, [], []);
  }
  var Promise = function Promise(resolver) {
    if (resolver === promiseRaw)
      return;
    if (typeof resolver !== 'function')
      throw new TypeError;
    var promise = promiseInit(this);
    try {
      resolver((function(x) {
        promiseResolve(promise, x);
      }), (function(r) {
        promiseReject(promise, r);
      }));
    } catch (e) {
      promiseReject(promise, e);
    }
  };
  ($traceurRuntime.createClass)(Promise, {
    catch: function(onReject) {
      return this.then(undefined, onReject);
    },
    then: function(onResolve, onReject) {
      if (typeof onResolve !== 'function')
        onResolve = idResolveHandler;
      if (typeof onReject !== 'function')
        onReject = idRejectHandler;
      var that = this;
      var constructor = this.constructor;
      return chain(this, function(x) {
        x = promiseCoerce(constructor, x);
        return x === that ? onReject(new TypeError) : isPromise(x) ? x.then(onResolve, onReject) : onResolve(x);
      }, onReject);
    }
  }, {
    resolve: function(x) {
      if (this === $Promise) {
        if (isPromise(x)) {
          return x;
        }
        return promiseSet(new $Promise(promiseRaw), +1, x);
      } else {
        return new this(function(resolve, reject) {
          resolve(x);
        });
      }
    },
    reject: function(r) {
      if (this === $Promise) {
        return promiseSet(new $Promise(promiseRaw), -1, r);
      } else {
        return new this((function(resolve, reject) {
          reject(r);
        }));
      }
    },
    all: function(values) {
      var deferred = getDeferred(this);
      var resolutions = [];
      try {
        var count = values.length;
        if (count === 0) {
          deferred.resolve(resolutions);
        } else {
          for (var i = 0; i < values.length; i++) {
            this.resolve(values[i]).then(function(i, x) {
              resolutions[i] = x;
              if (--count === 0)
                deferred.resolve(resolutions);
            }.bind(undefined, i), (function(r) {
              deferred.reject(r);
            }));
          }
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    },
    race: function(values) {
      var deferred = getDeferred(this);
      try {
        for (var i = 0; i < values.length; i++) {
          this.resolve(values[i]).then((function(x) {
            deferred.resolve(x);
          }), (function(r) {
            deferred.reject(r);
          }));
        }
      } catch (e) {
        deferred.reject(e);
      }
      return deferred.promise;
    }
  });
  var $Promise = Promise;
  var $PromiseReject = $Promise.reject;
  function promiseResolve(promise, x) {
    promiseDone(promise, +1, x, promise.onResolve_);
  }
  function promiseReject(promise, r) {
    promiseDone(promise, -1, r, promise.onReject_);
  }
  function promiseDone(promise, status, value, reactions) {
    if (promise.status_ !== 0)
      return;
    promiseEnqueue(value, reactions);
    promiseSet(promise, status, value);
  }
  function promiseEnqueue(value, tasks) {
    async((function() {
      for (var i = 0; i < tasks.length; i += 2) {
        promiseHandle(value, tasks[i], tasks[i + 1]);
      }
    }));
  }
  function promiseHandle(value, handler, deferred) {
    try {
      var result = handler(value);
      if (result === deferred.promise)
        throw new TypeError;
      else if (isPromise(result))
        chain(result, deferred.resolve, deferred.reject);
      else
        deferred.resolve(result);
    } catch (e) {
      try {
        deferred.reject(e);
      } catch (e) {}
    }
  }
  var thenableSymbol = '@@thenable';
  function isObject(x) {
    return x && (typeof x === 'object' || typeof x === 'function');
  }
  function promiseCoerce(constructor, x) {
    if (!isPromise(x) && isObject(x)) {
      var then;
      try {
        then = x.then;
      } catch (r) {
        var promise = $PromiseReject.call(constructor, r);
        x[thenableSymbol] = promise;
        return promise;
      }
      if (typeof then === 'function') {
        var p = x[thenableSymbol];
        if (p) {
          return p;
        } else {
          var deferred = getDeferred(constructor);
          x[thenableSymbol] = deferred.promise;
          try {
            then.call(x, deferred.resolve, deferred.reject);
          } catch (r) {
            deferred.reject(r);
          }
          return deferred.promise;
        }
      }
    }
    return x;
  }
  function polyfillPromise(global) {
    if (!global.Promise)
      global.Promise = Promise;
  }
  registerPolyfill(polyfillPromise);
  return {
    get Promise() {
      return Promise;
    },
    get polyfillPromise() {
      return polyfillPromise;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Promise.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/StringIterator.js", [], function() {
  "use strict";
  var $__2;
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/StringIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      createIteratorResultObject = $__0.createIteratorResultObject,
      isObject = $__0.isObject;
  var toProperty = $traceurRuntime.toProperty;
  var hasOwnProperty = Object.prototype.hasOwnProperty;
  var iteratedString = Symbol('iteratedString');
  var stringIteratorNextIndex = Symbol('stringIteratorNextIndex');
  var StringIterator = function StringIterator() {};
  ($traceurRuntime.createClass)(StringIterator, ($__2 = {}, Object.defineProperty($__2, "next", {
    value: function() {
      var o = this;
      if (!isObject(o) || !hasOwnProperty.call(o, iteratedString)) {
        throw new TypeError('this must be a StringIterator object');
      }
      var s = o[toProperty(iteratedString)];
      if (s === undefined) {
        return createIteratorResultObject(undefined, true);
      }
      var position = o[toProperty(stringIteratorNextIndex)];
      var len = s.length;
      if (position >= len) {
        o[toProperty(iteratedString)] = undefined;
        return createIteratorResultObject(undefined, true);
      }
      var first = s.charCodeAt(position);
      var resultString;
      if (first < 0xD800 || first > 0xDBFF || position + 1 === len) {
        resultString = String.fromCharCode(first);
      } else {
        var second = s.charCodeAt(position + 1);
        if (second < 0xDC00 || second > 0xDFFF) {
          resultString = String.fromCharCode(first);
        } else {
          resultString = String.fromCharCode(first) + String.fromCharCode(second);
        }
      }
      o[toProperty(stringIteratorNextIndex)] = position + resultString.length;
      return createIteratorResultObject(resultString, false);
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), Object.defineProperty($__2, Symbol.iterator, {
    value: function() {
      return this;
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), $__2), {});
  function createStringIterator(string) {
    var s = String(string);
    var iterator = Object.create(StringIterator.prototype);
    iterator[toProperty(iteratedString)] = s;
    iterator[toProperty(stringIteratorNextIndex)] = 0;
    return iterator;
  }
  return {get createStringIterator() {
      return createStringIterator;
    }};
});
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/String.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/String.js";
  var createStringIterator = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/StringIterator.js").createStringIterator;
  var $__1 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill;
  var $toString = Object.prototype.toString;
  var $indexOf = String.prototype.indexOf;
  var $lastIndexOf = String.prototype.lastIndexOf;
  function startsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (isNaN(pos)) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    return $indexOf.call(string, searchString, pos) == start;
  }
  function endsWith(search) {
    var string = String(this);
    if (this == null || $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var pos = stringLength;
    if (arguments.length > 1) {
      var position = arguments[1];
      if (position !== undefined) {
        pos = position ? Number(position) : 0;
        if (isNaN(pos)) {
          pos = 0;
        }
      }
    }
    var end = Math.min(Math.max(pos, 0), stringLength);
    var start = end - searchLength;
    if (start < 0) {
      return false;
    }
    return $lastIndexOf.call(string, searchString, start) == start;
  }
  function includes(search) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    if (search && $toString.call(search) == '[object RegExp]') {
      throw TypeError();
    }
    var stringLength = string.length;
    var searchString = String(search);
    var searchLength = searchString.length;
    var position = arguments.length > 1 ? arguments[1] : undefined;
    var pos = position ? Number(position) : 0;
    if (pos != pos) {
      pos = 0;
    }
    var start = Math.min(Math.max(pos, 0), stringLength);
    if (searchLength + start > stringLength) {
      return false;
    }
    return $indexOf.call(string, searchString, pos) != -1;
  }
  function repeat(count) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var n = count ? Number(count) : 0;
    if (isNaN(n)) {
      n = 0;
    }
    if (n < 0 || n == Infinity) {
      throw RangeError();
    }
    if (n == 0) {
      return '';
    }
    var result = '';
    while (n--) {
      result += string;
    }
    return result;
  }
  function codePointAt(position) {
    if (this == null) {
      throw TypeError();
    }
    var string = String(this);
    var size = string.length;
    var index = position ? Number(position) : 0;
    if (isNaN(index)) {
      index = 0;
    }
    if (index < 0 || index >= size) {
      return undefined;
    }
    var first = string.charCodeAt(index);
    var second;
    if (first >= 0xD800 && first <= 0xDBFF && size > index + 1) {
      second = string.charCodeAt(index + 1);
      if (second >= 0xDC00 && second <= 0xDFFF) {
        return (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
      }
    }
    return first;
  }
  function raw(callsite) {
    var raw = callsite.raw;
    var len = raw.length >>> 0;
    if (len === 0)
      return '';
    var s = '';
    var i = 0;
    while (true) {
      s += raw[i];
      if (i + 1 === len)
        return s;
      s += arguments[++i];
    }
  }
  function fromCodePoint() {
    var codeUnits = [];
    var floor = Math.floor;
    var highSurrogate;
    var lowSurrogate;
    var index = -1;
    var length = arguments.length;
    if (!length) {
      return '';
    }
    while (++index < length) {
      var codePoint = Number(arguments[index]);
      if (!isFinite(codePoint) || codePoint < 0 || codePoint > 0x10FFFF || floor(codePoint) != codePoint) {
        throw RangeError('Invalid code point: ' + codePoint);
      }
      if (codePoint <= 0xFFFF) {
        codeUnits.push(codePoint);
      } else {
        codePoint -= 0x10000;
        highSurrogate = (codePoint >> 10) + 0xD800;
        lowSurrogate = (codePoint % 0x400) + 0xDC00;
        codeUnits.push(highSurrogate, lowSurrogate);
      }
    }
    return String.fromCharCode.apply(null, codeUnits);
  }
  function stringPrototypeIterator() {
    var o = $traceurRuntime.checkObjectCoercible(this);
    var s = String(o);
    return createStringIterator(s);
  }
  function polyfillString(global) {
    var String = global.String;
    maybeAddFunctions(String.prototype, ['codePointAt', codePointAt, 'endsWith', endsWith, 'includes', includes, 'repeat', repeat, 'startsWith', startsWith]);
    maybeAddFunctions(String, ['fromCodePoint', fromCodePoint, 'raw', raw]);
    maybeAddIterator(String.prototype, stringPrototypeIterator, Symbol);
  }
  registerPolyfill(polyfillString);
  return {
    get startsWith() {
      return startsWith;
    },
    get endsWith() {
      return endsWith;
    },
    get includes() {
      return includes;
    },
    get repeat() {
      return repeat;
    },
    get codePointAt() {
      return codePointAt;
    },
    get raw() {
      return raw;
    },
    get fromCodePoint() {
      return fromCodePoint;
    },
    get stringPrototypeIterator() {
      return stringPrototypeIterator;
    },
    get polyfillString() {
      return polyfillString;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/String.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/ArrayIterator.js", [], function() {
  "use strict";
  var $__2;
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/ArrayIterator.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      toObject = $__0.toObject,
      toUint32 = $__0.toUint32,
      createIteratorResultObject = $__0.createIteratorResultObject;
  var ARRAY_ITERATOR_KIND_KEYS = 1;
  var ARRAY_ITERATOR_KIND_VALUES = 2;
  var ARRAY_ITERATOR_KIND_ENTRIES = 3;
  var ArrayIterator = function ArrayIterator() {};
  ($traceurRuntime.createClass)(ArrayIterator, ($__2 = {}, Object.defineProperty($__2, "next", {
    value: function() {
      var iterator = toObject(this);
      var array = iterator.iteratorObject_;
      if (!array) {
        throw new TypeError('Object is not an ArrayIterator');
      }
      var index = iterator.arrayIteratorNextIndex_;
      var itemKind = iterator.arrayIterationKind_;
      var length = toUint32(array.length);
      if (index >= length) {
        iterator.arrayIteratorNextIndex_ = Infinity;
        return createIteratorResultObject(undefined, true);
      }
      iterator.arrayIteratorNextIndex_ = index + 1;
      if (itemKind == ARRAY_ITERATOR_KIND_VALUES)
        return createIteratorResultObject(array[index], false);
      if (itemKind == ARRAY_ITERATOR_KIND_ENTRIES)
        return createIteratorResultObject([index, array[index]], false);
      return createIteratorResultObject(index, false);
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), Object.defineProperty($__2, Symbol.iterator, {
    value: function() {
      return this;
    },
    configurable: true,
    enumerable: true,
    writable: true
  }), $__2), {});
  function createArrayIterator(array, kind) {
    var object = toObject(array);
    var iterator = new ArrayIterator;
    iterator.iteratorObject_ = object;
    iterator.arrayIteratorNextIndex_ = 0;
    iterator.arrayIterationKind_ = kind;
    return iterator;
  }
  function entries() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_ENTRIES);
  }
  function keys() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_KEYS);
  }
  function values() {
    return createArrayIterator(this, ARRAY_ITERATOR_KIND_VALUES);
  }
  return {
    get entries() {
      return entries;
    },
    get keys() {
      return keys;
    },
    get values() {
      return values;
    }
  };
});
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Array.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Array.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/ArrayIterator.js"),
      entries = $__0.entries,
      keys = $__0.keys,
      values = $__0.values;
  var $__1 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      checkIterable = $__1.checkIterable,
      isCallable = $__1.isCallable,
      isConstructor = $__1.isConstructor,
      maybeAddFunctions = $__1.maybeAddFunctions,
      maybeAddIterator = $__1.maybeAddIterator,
      registerPolyfill = $__1.registerPolyfill,
      toInteger = $__1.toInteger,
      toLength = $__1.toLength,
      toObject = $__1.toObject;
  function from(arrLike) {
    var mapFn = arguments[1];
    var thisArg = arguments[2];
    var C = this;
    var items = toObject(arrLike);
    var mapping = mapFn !== undefined;
    var k = 0;
    var arr,
        len;
    if (mapping && !isCallable(mapFn)) {
      throw TypeError();
    }
    if (checkIterable(items)) {
      arr = isConstructor(C) ? new C() : [];
      for (var $__2 = items[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__3; !($__3 = $__2.next()).done; ) {
        var item = $__3.value;
        {
          if (mapping) {
            arr[k] = mapFn.call(thisArg, item, k);
          } else {
            arr[k] = item;
          }
          k++;
        }
      }
      arr.length = k;
      return arr;
    }
    len = toLength(items.length);
    arr = isConstructor(C) ? new C(len) : new Array(len);
    for (; k < len; k++) {
      if (mapping) {
        arr[k] = typeof thisArg === 'undefined' ? mapFn(items[k], k) : mapFn.call(thisArg, items[k], k);
      } else {
        arr[k] = items[k];
      }
    }
    arr.length = len;
    return arr;
  }
  function of() {
    for (var items = [],
        $__4 = 0; $__4 < arguments.length; $__4++)
      items[$__4] = arguments[$__4];
    var C = this;
    var len = items.length;
    var arr = isConstructor(C) ? new C(len) : new Array(len);
    for (var k = 0; k < len; k++) {
      arr[k] = items[k];
    }
    arr.length = len;
    return arr;
  }
  function fill(value) {
    var start = arguments[1] !== (void 0) ? arguments[1] : 0;
    var end = arguments[2];
    var object = toObject(this);
    var len = toLength(object.length);
    var fillStart = toInteger(start);
    var fillEnd = end !== undefined ? toInteger(end) : len;
    fillStart = fillStart < 0 ? Math.max(len + fillStart, 0) : Math.min(fillStart, len);
    fillEnd = fillEnd < 0 ? Math.max(len + fillEnd, 0) : Math.min(fillEnd, len);
    while (fillStart < fillEnd) {
      object[fillStart] = value;
      fillStart++;
    }
    return object;
  }
  function find(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg);
  }
  function findIndex(predicate) {
    var thisArg = arguments[1];
    return findHelper(this, predicate, thisArg, true);
  }
  function findHelper(self, predicate) {
    var thisArg = arguments[2];
    var returnIndex = arguments[3] !== (void 0) ? arguments[3] : false;
    var object = toObject(self);
    var len = toLength(object.length);
    if (!isCallable(predicate)) {
      throw TypeError();
    }
    for (var i = 0; i < len; i++) {
      var value = object[i];
      if (predicate.call(thisArg, value, i, object)) {
        return returnIndex ? i : value;
      }
    }
    return returnIndex ? -1 : undefined;
  }
  function polyfillArray(global) {
    var $__5 = global,
        Array = $__5.Array,
        Object = $__5.Object,
        Symbol = $__5.Symbol;
    maybeAddFunctions(Array.prototype, ['entries', entries, 'keys', keys, 'values', values, 'fill', fill, 'find', find, 'findIndex', findIndex]);
    maybeAddFunctions(Array, ['from', from, 'of', of]);
    maybeAddIterator(Array.prototype, values, Symbol);
    maybeAddIterator(Object.getPrototypeOf([].values()), function() {
      return this;
    }, Symbol);
  }
  registerPolyfill(polyfillArray);
  return {
    get from() {
      return from;
    },
    get of() {
      return of;
    },
    get fill() {
      return fill;
    },
    get find() {
      return find;
    },
    get findIndex() {
      return findIndex;
    },
    get polyfillArray() {
      return polyfillArray;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Array.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Object.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Object.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill;
  var $__1 = $traceurRuntime,
      defineProperty = $__1.defineProperty,
      getOwnPropertyDescriptor = $__1.getOwnPropertyDescriptor,
      getOwnPropertyNames = $__1.getOwnPropertyNames,
      isPrivateName = $__1.isPrivateName,
      keys = $__1.keys;
  function is(left, right) {
    if (left === right)
      return left !== 0 || 1 / left === 1 / right;
    return left !== left && right !== right;
  }
  function assign(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      var props = source == null ? [] : keys(source);
      var p,
          length = props.length;
      for (p = 0; p < length; p++) {
        var name = props[p];
        if (isPrivateName(name))
          continue;
        target[name] = source[name];
      }
    }
    return target;
  }
  function mixin(target, source) {
    var props = getOwnPropertyNames(source);
    var p,
        descriptor,
        length = props.length;
    for (p = 0; p < length; p++) {
      var name = props[p];
      if (isPrivateName(name))
        continue;
      descriptor = getOwnPropertyDescriptor(source, props[p]);
      defineProperty(target, props[p], descriptor);
    }
    return target;
  }
  function polyfillObject(global) {
    var Object = global.Object;
    maybeAddFunctions(Object, ['assign', assign, 'is', is, 'mixin', mixin]);
  }
  registerPolyfill(polyfillObject);
  return {
    get is() {
      return is;
    },
    get assign() {
      return assign;
    },
    get mixin() {
      return mixin;
    },
    get polyfillObject() {
      return polyfillObject;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Object.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/Number.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/Number.js";
  var $__0 = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js"),
      isNumber = $__0.isNumber,
      maybeAddConsts = $__0.maybeAddConsts,
      maybeAddFunctions = $__0.maybeAddFunctions,
      registerPolyfill = $__0.registerPolyfill,
      toInteger = $__0.toInteger;
  var $abs = Math.abs;
  var $isFinite = isFinite;
  var $isNaN = isNaN;
  var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
  var MIN_SAFE_INTEGER = -Math.pow(2, 53) + 1;
  var EPSILON = Math.pow(2, -52);
  function NumberIsFinite(number) {
    return isNumber(number) && $isFinite(number);
  }
  ;
  function isInteger(number) {
    return NumberIsFinite(number) && toInteger(number) === number;
  }
  function NumberIsNaN(number) {
    return isNumber(number) && $isNaN(number);
  }
  ;
  function isSafeInteger(number) {
    if (NumberIsFinite(number)) {
      var integral = toInteger(number);
      if (integral === number)
        return $abs(integral) <= MAX_SAFE_INTEGER;
    }
    return false;
  }
  function polyfillNumber(global) {
    var Number = global.Number;
    maybeAddConsts(Number, ['MAX_SAFE_INTEGER', MAX_SAFE_INTEGER, 'MIN_SAFE_INTEGER', MIN_SAFE_INTEGER, 'EPSILON', EPSILON]);
    maybeAddFunctions(Number, ['isFinite', NumberIsFinite, 'isInteger', isInteger, 'isNaN', NumberIsNaN, 'isSafeInteger', isSafeInteger]);
  }
  registerPolyfill(polyfillNumber);
  return {
    get MAX_SAFE_INTEGER() {
      return MAX_SAFE_INTEGER;
    },
    get MIN_SAFE_INTEGER() {
      return MIN_SAFE_INTEGER;
    },
    get EPSILON() {
      return EPSILON;
    },
    get isFinite() {
      return NumberIsFinite;
    },
    get isInteger() {
      return isInteger;
    },
    get isNaN() {
      return NumberIsNaN;
    },
    get isSafeInteger() {
      return isSafeInteger;
    },
    get polyfillNumber() {
      return polyfillNumber;
    }
  };
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/Number.js" + '');
System.registerModule("traceur-runtime@0.0.79/src/runtime/polyfills/polyfills.js", [], function() {
  "use strict";
  var __moduleName = "traceur-runtime@0.0.79/src/runtime/polyfills/polyfills.js";
  var polyfillAll = System.get("traceur-runtime@0.0.79/src/runtime/polyfills/utils.js").polyfillAll;
  polyfillAll(Reflect.global);
  var setupGlobals = $traceurRuntime.setupGlobals;
  $traceurRuntime.setupGlobals = function(global) {
    setupGlobals(global);
    polyfillAll(global);
  };
  return {};
});
System.get("traceur-runtime@0.0.79/src/runtime/polyfills/polyfills.js" + '');

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy90cmFjZXVyL2Jpbi90cmFjZXVyLXJ1bnRpbWUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgaWYgKGdsb2JhbC4kdHJhY2V1clJ1bnRpbWUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyICRPYmplY3QgPSBPYmplY3Q7XG4gIHZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuICB2YXIgJGNyZWF0ZSA9ICRPYmplY3QuY3JlYXRlO1xuICB2YXIgJGRlZmluZVByb3BlcnRpZXMgPSAkT2JqZWN0LmRlZmluZVByb3BlcnRpZXM7XG4gIHZhciAkZGVmaW5lUHJvcGVydHkgPSAkT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuICB2YXIgJGZyZWV6ZSA9ICRPYmplY3QuZnJlZXplO1xuICB2YXIgJGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9ICRPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuICB2YXIgJGdldE93blByb3BlcnR5TmFtZXMgPSAkT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXM7XG4gIHZhciAka2V5cyA9ICRPYmplY3Qua2V5cztcbiAgdmFyICRoYXNPd25Qcm9wZXJ0eSA9ICRPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuICB2YXIgJHRvU3RyaW5nID0gJE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIHZhciAkcHJldmVudEV4dGVuc2lvbnMgPSBPYmplY3QucHJldmVudEV4dGVuc2lvbnM7XG4gIHZhciAkc2VhbCA9IE9iamVjdC5zZWFsO1xuICB2YXIgJGlzRXh0ZW5zaWJsZSA9IE9iamVjdC5pc0V4dGVuc2libGU7XG4gIGZ1bmN0aW9uIG5vbkVudW0odmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH07XG4gIH1cbiAgdmFyIG1ldGhvZCA9IG5vbkVudW07XG4gIHZhciBjb3VudGVyID0gMDtcbiAgZnVuY3Rpb24gbmV3VW5pcXVlU3RyaW5nKCkge1xuICAgIHJldHVybiAnX18kJyArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDFlOSkgKyAnJCcgKyArK2NvdW50ZXIgKyAnJF9fJztcbiAgfVxuICB2YXIgc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICB2YXIgc3ltYm9sRGVzY3JpcHRpb25Qcm9wZXJ0eSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICB2YXIgc3ltYm9sRGF0YVByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xWYWx1ZXMgPSAkY3JlYXRlKG51bGwpO1xuICB2YXIgcHJpdmF0ZU5hbWVzID0gJGNyZWF0ZShudWxsKTtcbiAgZnVuY3Rpb24gaXNQcml2YXRlTmFtZShzKSB7XG4gICAgcmV0dXJuIHByaXZhdGVOYW1lc1tzXTtcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGVQcml2YXRlTmFtZSgpIHtcbiAgICB2YXIgcyA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICAgIHByaXZhdGVOYW1lc1tzXSA9IHRydWU7XG4gICAgcmV0dXJuIHM7XG4gIH1cbiAgZnVuY3Rpb24gaXNTaGltU3ltYm9sKHN5bWJvbCkge1xuICAgIHJldHVybiB0eXBlb2Ygc3ltYm9sID09PSAnb2JqZWN0JyAmJiBzeW1ib2wgaW5zdGFuY2VvZiBTeW1ib2xWYWx1ZTtcbiAgfVxuICBmdW5jdGlvbiB0eXBlT2Yodikge1xuICAgIGlmIChpc1NoaW1TeW1ib2wodikpXG4gICAgICByZXR1cm4gJ3N5bWJvbCc7XG4gICAgcmV0dXJuIHR5cGVvZiB2O1xuICB9XG4gIGZ1bmN0aW9uIFN5bWJvbChkZXNjcmlwdGlvbikge1xuICAgIHZhciB2YWx1ZSA9IG5ldyBTeW1ib2xWYWx1ZShkZXNjcmlwdGlvbik7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFN5bWJvbCkpXG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU3ltYm9sIGNhbm5vdCBiZSBuZXdcXCdlZCcpO1xuICB9XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBub25FbnVtKFN5bWJvbCkpO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sLnByb3RvdHlwZSwgJ3RvU3RyaW5nJywgbWV0aG9kKGZ1bmN0aW9uKCkge1xuICAgIHZhciBzeW1ib2xWYWx1ZSA9IHRoaXNbc3ltYm9sRGF0YVByb3BlcnR5XTtcbiAgICBpZiAoIWdldE9wdGlvbignc3ltYm9scycpKVxuICAgICAgcmV0dXJuIHN5bWJvbFZhbHVlW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIGlmICghc3ltYm9sVmFsdWUpXG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ0NvbnZlcnNpb24gZnJvbSBzeW1ib2wgdG8gc3RyaW5nJyk7XG4gICAgdmFyIGRlc2MgPSBzeW1ib2xWYWx1ZVtzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5XTtcbiAgICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKVxuICAgICAgZGVzYyA9ICcnO1xuICAgIHJldHVybiAnU3ltYm9sKCcgKyBkZXNjICsgJyknO1xuICB9KSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAndmFsdWVPZicsIG1ldGhvZChmdW5jdGlvbigpIHtcbiAgICB2YXIgc3ltYm9sVmFsdWUgPSB0aGlzW3N5bWJvbERhdGFQcm9wZXJ0eV07XG4gICAgaWYgKCFzeW1ib2xWYWx1ZSlcbiAgICAgIHRocm93IFR5cGVFcnJvcignQ29udmVyc2lvbiBmcm9tIHN5bWJvbCB0byBzdHJpbmcnKTtcbiAgICBpZiAoIWdldE9wdGlvbignc3ltYm9scycpKVxuICAgICAgcmV0dXJuIHN5bWJvbFZhbHVlW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIHJldHVybiBzeW1ib2xWYWx1ZTtcbiAgfSkpO1xuICBmdW5jdGlvbiBTeW1ib2xWYWx1ZShkZXNjcmlwdGlvbikge1xuICAgIHZhciBrZXkgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sRGF0YVByb3BlcnR5LCB7dmFsdWU6IHRoaXN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eSwge3ZhbHVlOiBrZXl9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sRGVzY3JpcHRpb25Qcm9wZXJ0eSwge3ZhbHVlOiBkZXNjcmlwdGlvbn0pO1xuICAgIGZyZWV6ZSh0aGlzKTtcbiAgICBzeW1ib2xWYWx1ZXNba2V5XSA9IHRoaXM7XG4gIH1cbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbFZhbHVlLnByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgbm9uRW51bShTeW1ib2wpKTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbFZhbHVlLnByb3RvdHlwZSwgJ3RvU3RyaW5nJywge1xuICAgIHZhbHVlOiBTeW1ib2wucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sVmFsdWUucHJvdG90eXBlLCAndmFsdWVPZicsIHtcbiAgICB2YWx1ZTogU3ltYm9sLnByb3RvdHlwZS52YWx1ZU9mLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pO1xuICB2YXIgaGFzaFByb3BlcnR5ID0gY3JlYXRlUHJpdmF0ZU5hbWUoKTtcbiAgdmFyIGhhc2hQcm9wZXJ0eURlc2NyaXB0b3IgPSB7dmFsdWU6IHVuZGVmaW5lZH07XG4gIHZhciBoYXNoT2JqZWN0UHJvcGVydGllcyA9IHtcbiAgICBoYXNoOiB7dmFsdWU6IHVuZGVmaW5lZH0sXG4gICAgc2VsZjoge3ZhbHVlOiB1bmRlZmluZWR9XG4gIH07XG4gIHZhciBoYXNoQ291bnRlciA9IDA7XG4gIGZ1bmN0aW9uIGdldE93bkhhc2hPYmplY3Qob2JqZWN0KSB7XG4gICAgdmFyIGhhc2hPYmplY3QgPSBvYmplY3RbaGFzaFByb3BlcnR5XTtcbiAgICBpZiAoaGFzaE9iamVjdCAmJiBoYXNoT2JqZWN0LnNlbGYgPT09IG9iamVjdClcbiAgICAgIHJldHVybiBoYXNoT2JqZWN0O1xuICAgIGlmICgkaXNFeHRlbnNpYmxlKG9iamVjdCkpIHtcbiAgICAgIGhhc2hPYmplY3RQcm9wZXJ0aWVzLmhhc2gudmFsdWUgPSBoYXNoQ291bnRlcisrO1xuICAgICAgaGFzaE9iamVjdFByb3BlcnRpZXMuc2VsZi52YWx1ZSA9IG9iamVjdDtcbiAgICAgIGhhc2hQcm9wZXJ0eURlc2NyaXB0b3IudmFsdWUgPSAkY3JlYXRlKG51bGwsIGhhc2hPYmplY3RQcm9wZXJ0aWVzKTtcbiAgICAgICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIGhhc2hQcm9wZXJ0eSwgaGFzaFByb3BlcnR5RGVzY3JpcHRvcik7XG4gICAgICByZXR1cm4gaGFzaFByb3BlcnR5RGVzY3JpcHRvci52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBmcmVlemUob2JqZWN0KSB7XG4gICAgZ2V0T3duSGFzaE9iamVjdChvYmplY3QpO1xuICAgIHJldHVybiAkZnJlZXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cbiAgZnVuY3Rpb24gcHJldmVudEV4dGVuc2lvbnMob2JqZWN0KSB7XG4gICAgZ2V0T3duSGFzaE9iamVjdChvYmplY3QpO1xuICAgIHJldHVybiAkcHJldmVudEV4dGVuc2lvbnMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuICBmdW5jdGlvbiBzZWFsKG9iamVjdCkge1xuICAgIGdldE93bkhhc2hPYmplY3Qob2JqZWN0KTtcbiAgICByZXR1cm4gJHNlYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuICBmcmVlemUoU3ltYm9sVmFsdWUucHJvdG90eXBlKTtcbiAgZnVuY3Rpb24gaXNTeW1ib2xTdHJpbmcocykge1xuICAgIHJldHVybiBzeW1ib2xWYWx1ZXNbc10gfHwgcHJpdmF0ZU5hbWVzW3NdO1xuICB9XG4gIGZ1bmN0aW9uIHRvUHJvcGVydHkobmFtZSkge1xuICAgIGlmIChpc1NoaW1TeW1ib2wobmFtZSkpXG4gICAgICByZXR1cm4gbmFtZVtzeW1ib2xJbnRlcm5hbFByb3BlcnR5XTtcbiAgICByZXR1cm4gbmFtZTtcbiAgfVxuICBmdW5jdGlvbiByZW1vdmVTeW1ib2xLZXlzKGFycmF5KSB7XG4gICAgdmFyIHJ2ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFpc1N5bWJvbFN0cmluZyhhcnJheVtpXSkpIHtcbiAgICAgICAgcnYucHVzaChhcnJheVtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydjtcbiAgfVxuICBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkge1xuICAgIHJldHVybiByZW1vdmVTeW1ib2xLZXlzKCRnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkpO1xuICB9XG4gIGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG4gICAgcmV0dXJuIHJlbW92ZVN5bWJvbEtleXMoJGtleXMob2JqZWN0KSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iamVjdCkge1xuICAgIHZhciBydiA9IFtdO1xuICAgIHZhciBuYW1lcyA9ICRnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHN5bWJvbCA9IHN5bWJvbFZhbHVlc1tuYW1lc1tpXV07XG4gICAgICBpZiAoc3ltYm9sKSB7XG4gICAgICAgIHJ2LnB1c2goc3ltYm9sKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gIGZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpIHtcbiAgICByZXR1cm4gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIHRvUHJvcGVydHkobmFtZSkpO1xuICB9XG4gIGZ1bmN0aW9uIGhhc093blByb3BlcnR5KG5hbWUpIHtcbiAgICByZXR1cm4gJGhhc093blByb3BlcnR5LmNhbGwodGhpcywgdG9Qcm9wZXJ0eShuYW1lKSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3B0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gZ2xvYmFsLnRyYWNldXIgJiYgZ2xvYmFsLnRyYWNldXIub3B0aW9uc1tuYW1lXTtcbiAgfVxuICBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIGRlc2NyaXB0b3IpIHtcbiAgICBpZiAoaXNTaGltU3ltYm9sKG5hbWUpKSB7XG4gICAgICBuYW1lID0gbmFtZVtzeW1ib2xJbnRlcm5hbFByb3BlcnR5XTtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgZGVzY3JpcHRvcik7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbE9iamVjdChPYmplY3QpIHtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZGVmaW5lUHJvcGVydHknLCB7dmFsdWU6IGRlZmluZVByb3BlcnR5fSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2dldE93blByb3BlcnR5TmFtZXMnLCB7dmFsdWU6IGdldE93blByb3BlcnR5TmFtZXN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yJywge3ZhbHVlOiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3J9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgJ2hhc093blByb3BlcnR5Jywge3ZhbHVlOiBoYXNPd25Qcm9wZXJ0eX0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdmcmVlemUnLCB7dmFsdWU6IGZyZWV6ZX0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdwcmV2ZW50RXh0ZW5zaW9ucycsIHt2YWx1ZTogcHJldmVudEV4dGVuc2lvbnN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnc2VhbCcsIHt2YWx1ZTogc2VhbH0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdrZXlzJywge3ZhbHVlOiBrZXlzfSk7XG4gIH1cbiAgZnVuY3Rpb24gZXhwb3J0U3RhcihvYmplY3QpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5hbWVzID0gJGdldE93blByb3BlcnR5TmFtZXMoYXJndW1lbnRzW2ldKTtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmFtZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIG5hbWUgPSBuYW1lc1tqXTtcbiAgICAgICAgaWYgKGlzU3ltYm9sU3RyaW5nKG5hbWUpKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAoZnVuY3Rpb24obW9kLCBuYW1lKSB7XG4gICAgICAgICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZFtuYW1lXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKGFyZ3VtZW50c1tpXSwgbmFtZXNbal0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcbiAgICByZXR1cm4geCAhPSBudWxsICYmICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHggPT09ICdmdW5jdGlvbicpO1xuICB9XG4gIGZ1bmN0aW9uIHRvT2JqZWN0KHgpIHtcbiAgICBpZiAoeCA9PSBudWxsKVxuICAgICAgdGhyb3cgJFR5cGVFcnJvcigpO1xuICAgIHJldHVybiAkT2JqZWN0KHgpO1xuICB9XG4gIGZ1bmN0aW9uIGNoZWNrT2JqZWN0Q29lcmNpYmxlKGFyZ3VtZW50KSB7XG4gICAgaWYgKGFyZ3VtZW50ID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBjb252ZXJ0ZWQgdG8gYW4gT2JqZWN0Jyk7XG4gICAgfVxuICAgIHJldHVybiBhcmd1bWVudDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbFN5bWJvbChnbG9iYWwsIFN5bWJvbCkge1xuICAgIGlmICghZ2xvYmFsLlN5bWJvbCkge1xuICAgICAgZ2xvYmFsLlN5bWJvbCA9IFN5bWJvbDtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBnZXRPd25Qcm9wZXJ0eVN5bWJvbHM7XG4gICAgfVxuICAgIGlmICghZ2xvYmFsLlN5bWJvbC5pdGVyYXRvcikge1xuICAgICAgZ2xvYmFsLlN5bWJvbC5pdGVyYXRvciA9IFN5bWJvbCgnU3ltYm9sLml0ZXJhdG9yJyk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIHNldHVwR2xvYmFscyhnbG9iYWwpIHtcbiAgICBwb2x5ZmlsbFN5bWJvbChnbG9iYWwsIFN5bWJvbCk7XG4gICAgZ2xvYmFsLlJlZmxlY3QgPSBnbG9iYWwuUmVmbGVjdCB8fCB7fTtcbiAgICBnbG9iYWwuUmVmbGVjdC5nbG9iYWwgPSBnbG9iYWwuUmVmbGVjdC5nbG9iYWwgfHwgZ2xvYmFsO1xuICAgIHBvbHlmaWxsT2JqZWN0KGdsb2JhbC5PYmplY3QpO1xuICB9XG4gIHNldHVwR2xvYmFscyhnbG9iYWwpO1xuICBnbG9iYWwuJHRyYWNldXJSdW50aW1lID0ge1xuICAgIGNoZWNrT2JqZWN0Q29lcmNpYmxlOiBjaGVja09iamVjdENvZXJjaWJsZSxcbiAgICBjcmVhdGVQcml2YXRlTmFtZTogY3JlYXRlUHJpdmF0ZU5hbWUsXG4gICAgZGVmaW5lUHJvcGVydGllczogJGRlZmluZVByb3BlcnRpZXMsXG4gICAgZGVmaW5lUHJvcGVydHk6ICRkZWZpbmVQcm9wZXJ0eSxcbiAgICBleHBvcnRTdGFyOiBleHBvcnRTdGFyLFxuICAgIGdldE93bkhhc2hPYmplY3Q6IGdldE93bkhhc2hPYmplY3QsXG4gICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOiAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxuICAgIGdldE93blByb3BlcnR5TmFtZXM6ICRnZXRPd25Qcm9wZXJ0eU5hbWVzLFxuICAgIGlzT2JqZWN0OiBpc09iamVjdCxcbiAgICBpc1ByaXZhdGVOYW1lOiBpc1ByaXZhdGVOYW1lLFxuICAgIGlzU3ltYm9sU3RyaW5nOiBpc1N5bWJvbFN0cmluZyxcbiAgICBrZXlzOiAka2V5cyxcbiAgICBzZXR1cEdsb2JhbHM6IHNldHVwR2xvYmFscyxcbiAgICB0b09iamVjdDogdG9PYmplY3QsXG4gICAgdG9Qcm9wZXJ0eTogdG9Qcm9wZXJ0eSxcbiAgICB0eXBlb2Y6IHR5cGVPZlxuICB9O1xufSkodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgcGF0aDtcbiAgZnVuY3Rpb24gcmVsYXRpdmVSZXF1aXJlKGNhbGxlclBhdGgsIHJlcXVpcmVkUGF0aCkge1xuICAgIHBhdGggPSBwYXRoIHx8IHR5cGVvZiByZXF1aXJlICE9PSAndW5kZWZpbmVkJyAmJiByZXF1aXJlKCdwYXRoJyk7XG4gICAgZnVuY3Rpb24gaXNEaXJlY3RvcnkocGF0aCkge1xuICAgICAgcmV0dXJuIHBhdGguc2xpY2UoLTEpID09PSAnLyc7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzQWJzb2x1dGUocGF0aCkge1xuICAgICAgcmV0dXJuIHBhdGhbMF0gPT09ICcvJztcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNSZWxhdGl2ZShwYXRoKSB7XG4gICAgICByZXR1cm4gcGF0aFswXSA9PT0gJy4nO1xuICAgIH1cbiAgICBpZiAoaXNEaXJlY3RvcnkocmVxdWlyZWRQYXRoKSB8fCBpc0Fic29sdXRlKHJlcXVpcmVkUGF0aCkpXG4gICAgICByZXR1cm47XG4gICAgcmV0dXJuIGlzUmVsYXRpdmUocmVxdWlyZWRQYXRoKSA/IHJlcXVpcmUocGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShjYWxsZXJQYXRoKSwgcmVxdWlyZWRQYXRoKSkgOiByZXF1aXJlKHJlcXVpcmVkUGF0aCk7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLnJlcXVpcmUgPSByZWxhdGl2ZVJlcXVpcmU7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGZ1bmN0aW9uIHNwcmVhZCgpIHtcbiAgICB2YXIgcnYgPSBbXSxcbiAgICAgICAgaiA9IDAsXG4gICAgICAgIGl0ZXJSZXN1bHQ7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZVRvU3ByZWFkID0gJHRyYWNldXJSdW50aW1lLmNoZWNrT2JqZWN0Q29lcmNpYmxlKGFyZ3VtZW50c1tpXSk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlVG9TcHJlYWRbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoU3ltYm9sLml0ZXJhdG9yKV0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IHNwcmVhZCBub24taXRlcmFibGUgb2JqZWN0LicpO1xuICAgICAgfVxuICAgICAgdmFyIGl0ZXIgPSB2YWx1ZVRvU3ByZWFkWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KFN5bWJvbC5pdGVyYXRvcildKCk7XG4gICAgICB3aGlsZSAoIShpdGVyUmVzdWx0ID0gaXRlci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgcnZbaisrXSA9IGl0ZXJSZXN1bHQudmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydjtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUuc3ByZWFkID0gc3ByZWFkO1xufSkoKTtcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgJE9iamVjdCA9IE9iamVjdDtcbiAgdmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG4gIHZhciAkY3JlYXRlID0gJE9iamVjdC5jcmVhdGU7XG4gIHZhciAkZGVmaW5lUHJvcGVydGllcyA9ICR0cmFjZXVyUnVudGltZS5kZWZpbmVQcm9wZXJ0aWVzO1xuICB2YXIgJGRlZmluZVByb3BlcnR5ID0gJHRyYWNldXJSdW50aW1lLmRlZmluZVByb3BlcnR5O1xuICB2YXIgJGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlOYW1lcyA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25Qcm9wZXJ0eU5hbWVzO1xuICB2YXIgJGdldFByb3RvdHlwZU9mID0gT2JqZWN0LmdldFByb3RvdHlwZU9mO1xuICB2YXIgJF9fMCA9IE9iamVjdCxcbiAgICAgIGdldE93blByb3BlcnR5TmFtZXMgPSAkX18wLmdldE93blByb3BlcnR5TmFtZXMsXG4gICAgICBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSAkX18wLmdldE93blByb3BlcnR5U3ltYm9scztcbiAgZnVuY3Rpb24gc3VwZXJEZXNjcmlwdG9yKGhvbWVPYmplY3QsIG5hbWUpIHtcbiAgICB2YXIgcHJvdG8gPSAkZ2V0UHJvdG90eXBlT2YoaG9tZU9iamVjdCk7XG4gICAgZG8ge1xuICAgICAgdmFyIHJlc3VsdCA9ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocHJvdG8sIG5hbWUpO1xuICAgICAgaWYgKHJlc3VsdClcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHByb3RvID0gJGdldFByb3RvdHlwZU9mKHByb3RvKTtcbiAgICB9IHdoaWxlIChwcm90byk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBzdXBlckNvbnN0cnVjdG9yKGN0b3IpIHtcbiAgICByZXR1cm4gY3Rvci5fX3Byb3RvX187XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsIG5hbWUsIGFyZ3MpIHtcbiAgICByZXR1cm4gc3VwZXJHZXQoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSkuYXBwbHkoc2VsZiwgYXJncyk7XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJHZXQoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSkge1xuICAgIHZhciBkZXNjcmlwdG9yID0gc3VwZXJEZXNjcmlwdG9yKGhvbWVPYmplY3QsIG5hbWUpO1xuICAgIGlmIChkZXNjcmlwdG9yKSB7XG4gICAgICBpZiAoIWRlc2NyaXB0b3IuZ2V0KVxuICAgICAgICByZXR1cm4gZGVzY3JpcHRvci52YWx1ZTtcbiAgICAgIHJldHVybiBkZXNjcmlwdG9yLmdldC5jYWxsKHNlbGYpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyU2V0KHNlbGYsIGhvbWVPYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSk7XG4gICAgaWYgKGRlc2NyaXB0b3IgJiYgZGVzY3JpcHRvci5zZXQpIHtcbiAgICAgIGRlc2NyaXB0b3Iuc2V0LmNhbGwoc2VsZiwgdmFsdWUpO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB0aHJvdyAkVHlwZUVycm9yKChcInN1cGVyIGhhcyBubyBzZXR0ZXIgJ1wiICsgbmFtZSArIFwiJy5cIikpO1xuICB9XG4gIGZ1bmN0aW9uIGdldERlc2NyaXB0b3JzKG9iamVjdCkge1xuICAgIHZhciBkZXNjcmlwdG9ycyA9IHt9O1xuICAgIHZhciBuYW1lcyA9IGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgZGVzY3JpcHRvcnNbbmFtZV0gPSAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSk7XG4gICAgfVxuICAgIHZhciBzeW1ib2xzID0gZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc3ltYm9sID0gc3ltYm9sc1tpXTtcbiAgICAgIGRlc2NyaXB0b3JzWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KHN5bWJvbCldID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsICR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KHN5bWJvbCkpO1xuICAgIH1cbiAgICByZXR1cm4gZGVzY3JpcHRvcnM7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlQ2xhc3MoY3Rvciwgb2JqZWN0LCBzdGF0aWNPYmplY3QsIHN1cGVyQ2xhc3MpIHtcbiAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnY29uc3RydWN0b3InLCB7XG4gICAgICB2YWx1ZTogY3RvcixcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDMpIHtcbiAgICAgIGlmICh0eXBlb2Ygc3VwZXJDbGFzcyA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgY3Rvci5fX3Byb3RvX18gPSBzdXBlckNsYXNzO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSAkY3JlYXRlKGdldFByb3RvUGFyZW50KHN1cGVyQ2xhc3MpLCBnZXREZXNjcmlwdG9ycyhvYmplY3QpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBvYmplY3Q7XG4gICAgfVxuICAgICRkZWZpbmVQcm9wZXJ0eShjdG9yLCAncHJvdG90eXBlJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZVxuICAgIH0pO1xuICAgIHJldHVybiAkZGVmaW5lUHJvcGVydGllcyhjdG9yLCBnZXREZXNjcmlwdG9ycyhzdGF0aWNPYmplY3QpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRQcm90b1BhcmVudChzdXBlckNsYXNzKSB7XG4gICAgaWYgKHR5cGVvZiBzdXBlckNsYXNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YXIgcHJvdG90eXBlID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4gICAgICBpZiAoJE9iamVjdChwcm90b3R5cGUpID09PSBwcm90b3R5cGUgfHwgcHJvdG90eXBlID09PSBudWxsKVxuICAgICAgICByZXR1cm4gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4gICAgICB0aHJvdyBuZXcgJFR5cGVFcnJvcignc3VwZXIgcHJvdG90eXBlIG11c3QgYmUgYW4gT2JqZWN0IG9yIG51bGwnKTtcbiAgICB9XG4gICAgaWYgKHN1cGVyQ2xhc3MgPT09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB0aHJvdyBuZXcgJFR5cGVFcnJvcigoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvbiwgbm90IFwiICsgdHlwZW9mIHN1cGVyQ2xhc3MgKyBcIi5cIikpO1xuICB9XG4gIGZ1bmN0aW9uIGRlZmF1bHRTdXBlckNhbGwoc2VsZiwgaG9tZU9iamVjdCwgYXJncykge1xuICAgIGlmICgkZ2V0UHJvdG90eXBlT2YoaG9tZU9iamVjdCkgIT09IG51bGwpXG4gICAgICBzdXBlckNhbGwoc2VsZiwgaG9tZU9iamVjdCwgJ2NvbnN0cnVjdG9yJywgYXJncyk7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzID0gY3JlYXRlQ2xhc3M7XG4gICR0cmFjZXVyUnVudGltZS5kZWZhdWx0U3VwZXJDYWxsID0gZGVmYXVsdFN1cGVyQ2FsbDtcbiAgJHRyYWNldXJSdW50aW1lLnN1cGVyQ2FsbCA9IHN1cGVyQ2FsbDtcbiAgJHRyYWNldXJSdW50aW1lLnN1cGVyQ29uc3RydWN0b3IgPSBzdXBlckNvbnN0cnVjdG9yO1xuICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJHZXQgPSBzdXBlckdldDtcbiAgJHRyYWNldXJSdW50aW1lLnN1cGVyU2V0ID0gc3VwZXJTZXQ7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGlmICh0eXBlb2YgJHRyYWNldXJSdW50aW1lICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBFcnJvcigndHJhY2V1ciBydW50aW1lIG5vdCBmb3VuZC4nKTtcbiAgfVxuICB2YXIgY3JlYXRlUHJpdmF0ZU5hbWUgPSAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlUHJpdmF0ZU5hbWU7XG4gIHZhciAkZGVmaW5lUHJvcGVydGllcyA9ICR0cmFjZXVyUnVudGltZS5kZWZpbmVQcm9wZXJ0aWVzO1xuICB2YXIgJGRlZmluZVByb3BlcnR5ID0gJHRyYWNldXJSdW50aW1lLmRlZmluZVByb3BlcnR5O1xuICB2YXIgJGNyZWF0ZSA9IE9iamVjdC5jcmVhdGU7XG4gIHZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuICBmdW5jdGlvbiBub25FbnVtKHZhbHVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9O1xuICB9XG4gIHZhciBTVF9ORVdCT1JOID0gMDtcbiAgdmFyIFNUX0VYRUNVVElORyA9IDE7XG4gIHZhciBTVF9TVVNQRU5ERUQgPSAyO1xuICB2YXIgU1RfQ0xPU0VEID0gMztcbiAgdmFyIEVORF9TVEFURSA9IC0yO1xuICB2YXIgUkVUSFJPV19TVEFURSA9IC0zO1xuICBmdW5jdGlvbiBnZXRJbnRlcm5hbEVycm9yKHN0YXRlKSB7XG4gICAgcmV0dXJuIG5ldyBFcnJvcignVHJhY2V1ciBjb21waWxlciBidWc6IGludmFsaWQgc3RhdGUgaW4gc3RhdGUgbWFjaGluZTogJyArIHN0YXRlKTtcbiAgfVxuICBmdW5jdGlvbiBHZW5lcmF0b3JDb250ZXh0KCkge1xuICAgIHRoaXMuc3RhdGUgPSAwO1xuICAgIHRoaXMuR1N0YXRlID0gU1RfTkVXQk9STjtcbiAgICB0aGlzLnN0b3JlZEV4Y2VwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmZpbmFsbHlGYWxsVGhyb3VnaCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnNlbnRfID0gdW5kZWZpbmVkO1xuICAgIHRoaXMucmV0dXJuVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy50cnlTdGFja18gPSBbXTtcbiAgfVxuICBHZW5lcmF0b3JDb250ZXh0LnByb3RvdHlwZSA9IHtcbiAgICBwdXNoVHJ5OiBmdW5jdGlvbihjYXRjaFN0YXRlLCBmaW5hbGx5U3RhdGUpIHtcbiAgICAgIGlmIChmaW5hbGx5U3RhdGUgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIGZpbmFsbHlGYWxsVGhyb3VnaCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGkgPSB0aGlzLnRyeVN0YWNrXy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIGlmICh0aGlzLnRyeVN0YWNrX1tpXS5jYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBmaW5hbGx5RmFsbFRocm91Z2ggPSB0aGlzLnRyeVN0YWNrX1tpXS5jYXRjaDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZmluYWxseUZhbGxUaHJvdWdoID09PSBudWxsKVxuICAgICAgICAgIGZpbmFsbHlGYWxsVGhyb3VnaCA9IFJFVEhST1dfU1RBVEU7XG4gICAgICAgIHRoaXMudHJ5U3RhY2tfLnB1c2goe1xuICAgICAgICAgIGZpbmFsbHk6IGZpbmFsbHlTdGF0ZSxcbiAgICAgICAgICBmaW5hbGx5RmFsbFRocm91Z2g6IGZpbmFsbHlGYWxsVGhyb3VnaFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChjYXRjaFN0YXRlICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMudHJ5U3RhY2tfLnB1c2goe2NhdGNoOiBjYXRjaFN0YXRlfSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBwb3BUcnk6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50cnlTdGFja18ucG9wKCk7XG4gICAgfSxcbiAgICBnZXQgc2VudCgpIHtcbiAgICAgIHRoaXMubWF5YmVUaHJvdygpO1xuICAgICAgcmV0dXJuIHRoaXMuc2VudF87XG4gICAgfSxcbiAgICBzZXQgc2VudCh2KSB7XG4gICAgICB0aGlzLnNlbnRfID0gdjtcbiAgICB9LFxuICAgIGdldCBzZW50SWdub3JlVGhyb3coKSB7XG4gICAgICByZXR1cm4gdGhpcy5zZW50XztcbiAgICB9LFxuICAgIG1heWJlVGhyb3c6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuYWN0aW9uID09PSAndGhyb3cnKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uID0gJ25leHQnO1xuICAgICAgICB0aHJvdyB0aGlzLnNlbnRfO1xuICAgICAgfVxuICAgIH0sXG4gICAgZW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICBjYXNlIEVORF9TVEFURTpcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgY2FzZSBSRVRIUk9XX1NUQVRFOlxuICAgICAgICAgIHRocm93IHRoaXMuc3RvcmVkRXhjZXB0aW9uO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IGdldEludGVybmFsRXJyb3IodGhpcy5zdGF0ZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBoYW5kbGVFeGNlcHRpb246IGZ1bmN0aW9uKGV4KSB7XG4gICAgICB0aGlzLkdTdGF0ZSA9IFNUX0NMT1NFRDtcbiAgICAgIHRoaXMuc3RhdGUgPSBFTkRfU1RBVEU7XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIG5leHRPclRocm93KGN0eCwgbW92ZU5leHQsIGFjdGlvbiwgeCkge1xuICAgIHN3aXRjaCAoY3R4LkdTdGF0ZSkge1xuICAgICAgY2FzZSBTVF9FWEVDVVRJTkc6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigoXCJcXFwiXCIgKyBhY3Rpb24gKyBcIlxcXCIgb24gZXhlY3V0aW5nIGdlbmVyYXRvclwiKSk7XG4gICAgICBjYXNlIFNUX0NMT1NFRDpcbiAgICAgICAgaWYgKGFjdGlvbiA9PSAnbmV4dCcpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGRvbmU6IHRydWVcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHRocm93IHg7XG4gICAgICBjYXNlIFNUX05FV0JPUk46XG4gICAgICAgIGlmIChhY3Rpb24gPT09ICd0aHJvdycpIHtcbiAgICAgICAgICBjdHguR1N0YXRlID0gU1RfQ0xPU0VEO1xuICAgICAgICAgIHRocm93IHg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHggIT09IHVuZGVmaW5lZClcbiAgICAgICAgICB0aHJvdyAkVHlwZUVycm9yKCdTZW50IHZhbHVlIHRvIG5ld2Jvcm4gZ2VuZXJhdG9yJyk7XG4gICAgICBjYXNlIFNUX1NVU1BFTkRFRDpcbiAgICAgICAgY3R4LkdTdGF0ZSA9IFNUX0VYRUNVVElORztcbiAgICAgICAgY3R4LmFjdGlvbiA9IGFjdGlvbjtcbiAgICAgICAgY3R4LnNlbnQgPSB4O1xuICAgICAgICB2YXIgdmFsdWUgPSBtb3ZlTmV4dChjdHgpO1xuICAgICAgICB2YXIgZG9uZSA9IHZhbHVlID09PSBjdHg7XG4gICAgICAgIGlmIChkb25lKVxuICAgICAgICAgIHZhbHVlID0gY3R4LnJldHVyblZhbHVlO1xuICAgICAgICBjdHguR1N0YXRlID0gZG9uZSA/IFNUX0NMT1NFRCA6IFNUX1NVU1BFTkRFRDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgZG9uZTogZG9uZVxuICAgICAgICB9O1xuICAgIH1cbiAgfVxuICB2YXIgY3R4TmFtZSA9IGNyZWF0ZVByaXZhdGVOYW1lKCk7XG4gIHZhciBtb3ZlTmV4dE5hbWUgPSBjcmVhdGVQcml2YXRlTmFtZSgpO1xuICBmdW5jdGlvbiBHZW5lcmF0b3JGdW5jdGlvbigpIHt9XG4gIGZ1bmN0aW9uIEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlKCkge31cbiAgR2VuZXJhdG9yRnVuY3Rpb24ucHJvdG90eXBlID0gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGU7XG4gICRkZWZpbmVQcm9wZXJ0eShHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgbm9uRW51bShHZW5lcmF0b3JGdW5jdGlvbikpO1xuICBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUgPSB7XG4gICAgY29uc3RydWN0b3I6IEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLFxuICAgIG5leHQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiBuZXh0T3JUaHJvdyh0aGlzW2N0eE5hbWVdLCB0aGlzW21vdmVOZXh0TmFtZV0sICduZXh0Jywgdik7XG4gICAgfSxcbiAgICB0aHJvdzogZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIG5leHRPclRocm93KHRoaXNbY3R4TmFtZV0sIHRoaXNbbW92ZU5leHROYW1lXSwgJ3Rocm93Jywgdik7XG4gICAgfVxuICB9O1xuICAkZGVmaW5lUHJvcGVydGllcyhHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge2VudW1lcmFibGU6IGZhbHNlfSxcbiAgICBuZXh0OiB7ZW51bWVyYWJsZTogZmFsc2V9LFxuICAgIHRocm93OiB7ZW51bWVyYWJsZTogZmFsc2V9XG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUucHJvdG90eXBlLCBTeW1ib2wuaXRlcmF0b3IsIG5vbkVudW0oZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pKTtcbiAgZnVuY3Rpb24gY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UoaW5uZXJGdW5jdGlvbiwgZnVuY3Rpb25PYmplY3QsIHNlbGYpIHtcbiAgICB2YXIgbW92ZU5leHQgPSBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKTtcbiAgICB2YXIgY3R4ID0gbmV3IEdlbmVyYXRvckNvbnRleHQoKTtcbiAgICB2YXIgb2JqZWN0ID0gJGNyZWF0ZShmdW5jdGlvbk9iamVjdC5wcm90b3R5cGUpO1xuICAgIG9iamVjdFtjdHhOYW1lXSA9IGN0eDtcbiAgICBvYmplY3RbbW92ZU5leHROYW1lXSA9IG1vdmVOZXh0O1xuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cbiAgZnVuY3Rpb24gaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uT2JqZWN0KSB7XG4gICAgZnVuY3Rpb25PYmplY3QucHJvdG90eXBlID0gJGNyZWF0ZShHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUpO1xuICAgIGZ1bmN0aW9uT2JqZWN0Ll9fcHJvdG9fXyA9IEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlO1xuICAgIHJldHVybiBmdW5jdGlvbk9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBBc3luY0Z1bmN0aW9uQ29udGV4dCgpIHtcbiAgICBHZW5lcmF0b3JDb250ZXh0LmNhbGwodGhpcyk7XG4gICAgdGhpcy5lcnIgPSB1bmRlZmluZWQ7XG4gICAgdmFyIGN0eCA9IHRoaXM7XG4gICAgY3R4LnJlc3VsdCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgY3R4LnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgY3R4LnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuICBBc3luY0Z1bmN0aW9uQ29udGV4dC5wcm90b3R5cGUgPSAkY3JlYXRlKEdlbmVyYXRvckNvbnRleHQucHJvdG90eXBlKTtcbiAgQXN5bmNGdW5jdGlvbkNvbnRleHQucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgY2FzZSBFTkRfU1RBVEU6XG4gICAgICAgIHRoaXMucmVzb2x2ZSh0aGlzLnJldHVyblZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFJFVEhST1dfU1RBVEU6XG4gICAgICAgIHRoaXMucmVqZWN0KHRoaXMuc3RvcmVkRXhjZXB0aW9uKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLnJlamVjdChnZXRJbnRlcm5hbEVycm9yKHRoaXMuc3RhdGUpKTtcbiAgICB9XG4gIH07XG4gIEFzeW5jRnVuY3Rpb25Db250ZXh0LnByb3RvdHlwZS5oYW5kbGVFeGNlcHRpb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0YXRlID0gUkVUSFJPV19TVEFURTtcbiAgfTtcbiAgZnVuY3Rpb24gYXN5bmNXcmFwKGlubmVyRnVuY3Rpb24sIHNlbGYpIHtcbiAgICB2YXIgbW92ZU5leHQgPSBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKTtcbiAgICB2YXIgY3R4ID0gbmV3IEFzeW5jRnVuY3Rpb25Db250ZXh0KCk7XG4gICAgY3R4LmNyZWF0ZUNhbGxiYWNrID0gZnVuY3Rpb24obmV3U3RhdGUpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjdHguc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgICAgY3R4LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIG1vdmVOZXh0KGN0eCk7XG4gICAgICB9O1xuICAgIH07XG4gICAgY3R4LmVycmJhY2sgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGhhbmRsZUNhdGNoKGN0eCwgZXJyKTtcbiAgICAgIG1vdmVOZXh0KGN0eCk7XG4gICAgfTtcbiAgICBtb3ZlTmV4dChjdHgpO1xuICAgIHJldHVybiBjdHgucmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIGdldE1vdmVOZXh0KGlubmVyRnVuY3Rpb24sIHNlbGYpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oY3R4KSB7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBpbm5lckZ1bmN0aW9uLmNhbGwoc2VsZiwgY3R4KTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICBoYW5kbGVDYXRjaChjdHgsIGV4KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gaGFuZGxlQ2F0Y2goY3R4LCBleCkge1xuICAgIGN0eC5zdG9yZWRFeGNlcHRpb24gPSBleDtcbiAgICB2YXIgbGFzdCA9IGN0eC50cnlTdGFja19bY3R4LnRyeVN0YWNrXy5sZW5ndGggLSAxXTtcbiAgICBpZiAoIWxhc3QpIHtcbiAgICAgIGN0eC5oYW5kbGVFeGNlcHRpb24oZXgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjdHguc3RhdGUgPSBsYXN0LmNhdGNoICE9PSB1bmRlZmluZWQgPyBsYXN0LmNhdGNoIDogbGFzdC5maW5hbGx5O1xuICAgIGlmIChsYXN0LmZpbmFsbHlGYWxsVGhyb3VnaCAhPT0gdW5kZWZpbmVkKVxuICAgICAgY3R4LmZpbmFsbHlGYWxsVGhyb3VnaCA9IGxhc3QuZmluYWxseUZhbGxUaHJvdWdoO1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5hc3luY1dyYXAgPSBhc3luY1dyYXA7XG4gICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24gPSBpbml0R2VuZXJhdG9yRnVuY3Rpb247XG4gICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZSA9IGNyZWF0ZUdlbmVyYXRvckluc3RhbmNlO1xufSkoKTtcbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gYnVpbGRGcm9tRW5jb2RlZFBhcnRzKG9wdF9zY2hlbWUsIG9wdF91c2VySW5mbywgb3B0X2RvbWFpbiwgb3B0X3BvcnQsIG9wdF9wYXRoLCBvcHRfcXVlcnlEYXRhLCBvcHRfZnJhZ21lbnQpIHtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgaWYgKG9wdF9zY2hlbWUpIHtcbiAgICAgIG91dC5wdXNoKG9wdF9zY2hlbWUsICc6Jyk7XG4gICAgfVxuICAgIGlmIChvcHRfZG9tYWluKSB7XG4gICAgICBvdXQucHVzaCgnLy8nKTtcbiAgICAgIGlmIChvcHRfdXNlckluZm8pIHtcbiAgICAgICAgb3V0LnB1c2gob3B0X3VzZXJJbmZvLCAnQCcpO1xuICAgICAgfVxuICAgICAgb3V0LnB1c2gob3B0X2RvbWFpbik7XG4gICAgICBpZiAob3B0X3BvcnQpIHtcbiAgICAgICAgb3V0LnB1c2goJzonLCBvcHRfcG9ydCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvcHRfcGF0aCkge1xuICAgICAgb3V0LnB1c2gob3B0X3BhdGgpO1xuICAgIH1cbiAgICBpZiAob3B0X3F1ZXJ5RGF0YSkge1xuICAgICAgb3V0LnB1c2goJz8nLCBvcHRfcXVlcnlEYXRhKTtcbiAgICB9XG4gICAgaWYgKG9wdF9mcmFnbWVudCkge1xuICAgICAgb3V0LnB1c2goJyMnLCBvcHRfZnJhZ21lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oJycpO1xuICB9XG4gIDtcbiAgdmFyIHNwbGl0UmUgPSBuZXcgUmVnRXhwKCdeJyArICcoPzonICsgJyhbXjovPyMuXSspJyArICc6KT8nICsgJyg/Oi8vJyArICcoPzooW14vPyNdKilAKT8nICsgJyhbXFxcXHdcXFxcZFxcXFwtXFxcXHUwMTAwLVxcXFx1ZmZmZi4lXSopJyArICcoPzo6KFswLTldKykpPycgKyAnKT8nICsgJyhbXj8jXSspPycgKyAnKD86XFxcXD8oW14jXSopKT8nICsgJyg/OiMoLiopKT8nICsgJyQnKTtcbiAgdmFyIENvbXBvbmVudEluZGV4ID0ge1xuICAgIFNDSEVNRTogMSxcbiAgICBVU0VSX0lORk86IDIsXG4gICAgRE9NQUlOOiAzLFxuICAgIFBPUlQ6IDQsXG4gICAgUEFUSDogNSxcbiAgICBRVUVSWV9EQVRBOiA2LFxuICAgIEZSQUdNRU5UOiA3XG4gIH07XG4gIGZ1bmN0aW9uIHNwbGl0KHVyaSkge1xuICAgIHJldHVybiAodXJpLm1hdGNoKHNwbGl0UmUpKTtcbiAgfVxuICBmdW5jdGlvbiByZW1vdmVEb3RTZWdtZW50cyhwYXRoKSB7XG4gICAgaWYgKHBhdGggPT09ICcvJylcbiAgICAgIHJldHVybiAnLyc7XG4gICAgdmFyIGxlYWRpbmdTbGFzaCA9IHBhdGhbMF0gPT09ICcvJyA/ICcvJyA6ICcnO1xuICAgIHZhciB0cmFpbGluZ1NsYXNoID0gcGF0aC5zbGljZSgtMSkgPT09ICcvJyA/ICcvJyA6ICcnO1xuICAgIHZhciBzZWdtZW50cyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgdmFyIHVwID0gMDtcbiAgICBmb3IgKHZhciBwb3MgPSAwOyBwb3MgPCBzZWdtZW50cy5sZW5ndGg7IHBvcysrKSB7XG4gICAgICB2YXIgc2VnbWVudCA9IHNlZ21lbnRzW3Bvc107XG4gICAgICBzd2l0Y2ggKHNlZ21lbnQpIHtcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgY2FzZSAnLic6XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJy4uJzpcbiAgICAgICAgICBpZiAob3V0Lmxlbmd0aClcbiAgICAgICAgICAgIG91dC5wb3AoKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICB1cCsrO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIG91dC5wdXNoKHNlZ21lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWxlYWRpbmdTbGFzaCkge1xuICAgICAgd2hpbGUgKHVwLS0gPiAwKSB7XG4gICAgICAgIG91dC51bnNoaWZ0KCcuLicpO1xuICAgICAgfVxuICAgICAgaWYgKG91dC5sZW5ndGggPT09IDApXG4gICAgICAgIG91dC5wdXNoKCcuJyk7XG4gICAgfVxuICAgIHJldHVybiBsZWFkaW5nU2xhc2ggKyBvdXQuam9pbignLycpICsgdHJhaWxpbmdTbGFzaDtcbiAgfVxuICBmdW5jdGlvbiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cykge1xuICAgIHZhciBwYXRoID0gcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0gfHwgJyc7XG4gICAgcGF0aCA9IHJlbW92ZURvdFNlZ21lbnRzKHBhdGgpO1xuICAgIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdID0gcGF0aDtcbiAgICByZXR1cm4gYnVpbGRGcm9tRW5jb2RlZFBhcnRzKHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlVTRVJfSU5GT10sIHBhcnRzW0NvbXBvbmVudEluZGV4LkRPTUFJTl0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlBPUlRdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSwgcGFydHNbQ29tcG9uZW50SW5kZXguUVVFUllfREFUQV0sIHBhcnRzW0NvbXBvbmVudEluZGV4LkZSQUdNRU5UXSk7XG4gIH1cbiAgZnVuY3Rpb24gY2Fub25pY2FsaXplVXJsKHVybCkge1xuICAgIHZhciBwYXJ0cyA9IHNwbGl0KHVybCk7XG4gICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgfVxuICBmdW5jdGlvbiByZXNvbHZlVXJsKGJhc2UsIHVybCkge1xuICAgIHZhciBwYXJ0cyA9IHNwbGl0KHVybCk7XG4gICAgdmFyIGJhc2VQYXJ0cyA9IHNwbGl0KGJhc2UpO1xuICAgIGlmIChwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdKSB7XG4gICAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdID0gYmFzZVBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSBDb21wb25lbnRJbmRleC5TQ0hFTUU7IGkgPD0gQ29tcG9uZW50SW5kZXguUE9SVDsgaSsrKSB7XG4gICAgICBpZiAoIXBhcnRzW2ldKSB7XG4gICAgICAgIHBhcnRzW2ldID0gYmFzZVBhcnRzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF1bMF0gPT0gJy8nKSB7XG4gICAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9IGJhc2VQYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXTtcbiAgICB2YXIgaW5kZXggPSBwYXRoLmxhc3RJbmRleE9mKCcvJyk7XG4gICAgcGF0aCA9IHBhdGguc2xpY2UoMCwgaW5kZXggKyAxKSArIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdO1xuICAgIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdID0gcGF0aDtcbiAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICB9XG4gIGZ1bmN0aW9uIGlzQWJzb2x1dGUobmFtZSkge1xuICAgIGlmICghbmFtZSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAobmFtZVswXSA9PT0gJy8nKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgdmFyIHBhcnRzID0gc3BsaXQobmFtZSk7XG4gICAgaWYgKHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0pXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLmNhbm9uaWNhbGl6ZVVybCA9IGNhbm9uaWNhbGl6ZVVybDtcbiAgJHRyYWNldXJSdW50aW1lLmlzQWJzb2x1dGUgPSBpc0Fic29sdXRlO1xuICAkdHJhY2V1clJ1bnRpbWUucmVtb3ZlRG90U2VnbWVudHMgPSByZW1vdmVEb3RTZWdtZW50cztcbiAgJHRyYWNldXJSdW50aW1lLnJlc29sdmVVcmwgPSByZXNvbHZlVXJsO1xufSkoKTtcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgdHlwZXMgPSB7XG4gICAgYW55OiB7bmFtZTogJ2FueSd9LFxuICAgIGJvb2xlYW46IHtuYW1lOiAnYm9vbGVhbid9LFxuICAgIG51bWJlcjoge25hbWU6ICdudW1iZXInfSxcbiAgICBzdHJpbmc6IHtuYW1lOiAnc3RyaW5nJ30sXG4gICAgc3ltYm9sOiB7bmFtZTogJ3N5bWJvbCd9LFxuICAgIHZvaWQ6IHtuYW1lOiAndm9pZCd9XG4gIH07XG4gIHZhciBHZW5lcmljVHlwZSA9IGZ1bmN0aW9uIEdlbmVyaWNUeXBlKHR5cGUsIGFyZ3VtZW50VHlwZXMpIHtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMuYXJndW1lbnRUeXBlcyA9IGFyZ3VtZW50VHlwZXM7XG4gIH07XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEdlbmVyaWNUeXBlLCB7fSwge30pO1xuICB2YXIgdHlwZVJlZ2lzdGVyID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgZnVuY3Rpb24gZ2VuZXJpY1R5cGUodHlwZSkge1xuICAgIGZvciAodmFyIGFyZ3VtZW50VHlwZXMgPSBbXSxcbiAgICAgICAgJF9fMSA9IDE7ICRfXzEgPCBhcmd1bWVudHMubGVuZ3RoOyAkX18xKyspXG4gICAgICBhcmd1bWVudFR5cGVzWyRfXzEgLSAxXSA9IGFyZ3VtZW50c1skX18xXTtcbiAgICB2YXIgdHlwZU1hcCA9IHR5cGVSZWdpc3RlcjtcbiAgICB2YXIga2V5ID0gJHRyYWNldXJSdW50aW1lLmdldE93bkhhc2hPYmplY3QodHlwZSkuaGFzaDtcbiAgICBpZiAoIXR5cGVNYXBba2V5XSkge1xuICAgICAgdHlwZU1hcFtrZXldID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB9XG4gICAgdHlwZU1hcCA9IHR5cGVNYXBba2V5XTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50VHlwZXMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBrZXkgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duSGFzaE9iamVjdChhcmd1bWVudFR5cGVzW2ldKS5oYXNoO1xuICAgICAgaWYgKCF0eXBlTWFwW2tleV0pIHtcbiAgICAgICAgdHlwZU1hcFtrZXldID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIH1cbiAgICAgIHR5cGVNYXAgPSB0eXBlTWFwW2tleV07XG4gICAgfVxuICAgIHZhciB0YWlsID0gYXJndW1lbnRUeXBlc1thcmd1bWVudFR5cGVzLmxlbmd0aCAtIDFdO1xuICAgIGtleSA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25IYXNoT2JqZWN0KHRhaWwpLmhhc2g7XG4gICAgaWYgKCF0eXBlTWFwW2tleV0pIHtcbiAgICAgIHR5cGVNYXBba2V5XSA9IG5ldyBHZW5lcmljVHlwZSh0eXBlLCBhcmd1bWVudFR5cGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVNYXBba2V5XTtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUuR2VuZXJpY1R5cGUgPSBHZW5lcmljVHlwZTtcbiAgJHRyYWNldXJSdW50aW1lLmdlbmVyaWNUeXBlID0gZ2VuZXJpY1R5cGU7XG4gICR0cmFjZXVyUnVudGltZS50eXBlID0gdHlwZXM7XG59KSgpO1xuKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciAkX18yID0gJHRyYWNldXJSdW50aW1lLFxuICAgICAgY2Fub25pY2FsaXplVXJsID0gJF9fMi5jYW5vbmljYWxpemVVcmwsXG4gICAgICByZXNvbHZlVXJsID0gJF9fMi5yZXNvbHZlVXJsLFxuICAgICAgaXNBYnNvbHV0ZSA9ICRfXzIuaXNBYnNvbHV0ZTtcbiAgdmFyIG1vZHVsZUluc3RhbnRpYXRvcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgYmFzZVVSTDtcbiAgaWYgKGdsb2JhbC5sb2NhdGlvbiAmJiBnbG9iYWwubG9jYXRpb24uaHJlZilcbiAgICBiYXNlVVJMID0gcmVzb2x2ZVVybChnbG9iYWwubG9jYXRpb24uaHJlZiwgJy4vJyk7XG4gIGVsc2VcbiAgICBiYXNlVVJMID0gJyc7XG4gIHZhciBVbmNvYXRlZE1vZHVsZUVudHJ5ID0gZnVuY3Rpb24gVW5jb2F0ZWRNb2R1bGVFbnRyeSh1cmwsIHVuY29hdGVkTW9kdWxlKSB7XG4gICAgdGhpcy51cmwgPSB1cmw7XG4gICAgdGhpcy52YWx1ZV8gPSB1bmNvYXRlZE1vZHVsZTtcbiAgfTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVW5jb2F0ZWRNb2R1bGVFbnRyeSwge30sIHt9KTtcbiAgdmFyIE1vZHVsZUV2YWx1YXRpb25FcnJvciA9IGZ1bmN0aW9uIE1vZHVsZUV2YWx1YXRpb25FcnJvcihlcnJvbmVvdXNNb2R1bGVOYW1lLCBjYXVzZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZSArICc6ICcgKyB0aGlzLnN0cmlwQ2F1c2UoY2F1c2UpICsgJyBpbiAnICsgZXJyb25lb3VzTW9kdWxlTmFtZTtcbiAgICBpZiAoIShjYXVzZSBpbnN0YW5jZW9mICRNb2R1bGVFdmFsdWF0aW9uRXJyb3IpICYmIGNhdXNlLnN0YWNrKVxuICAgICAgdGhpcy5zdGFjayA9IHRoaXMuc3RyaXBTdGFjayhjYXVzZS5zdGFjayk7XG4gICAgZWxzZVxuICAgICAgdGhpcy5zdGFjayA9ICcnO1xuICB9O1xuICB2YXIgJE1vZHVsZUV2YWx1YXRpb25FcnJvciA9IE1vZHVsZUV2YWx1YXRpb25FcnJvcjtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoTW9kdWxlRXZhbHVhdGlvbkVycm9yLCB7XG4gICAgc3RyaXBFcnJvcjogZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgcmV0dXJuIG1lc3NhZ2UucmVwbGFjZSgvLipFcnJvcjovLCB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyAnOicpO1xuICAgIH0sXG4gICAgc3RyaXBDYXVzZTogZnVuY3Rpb24oY2F1c2UpIHtcbiAgICAgIGlmICghY2F1c2UpXG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIGlmICghY2F1c2UubWVzc2FnZSlcbiAgICAgICAgcmV0dXJuIGNhdXNlICsgJyc7XG4gICAgICByZXR1cm4gdGhpcy5zdHJpcEVycm9yKGNhdXNlLm1lc3NhZ2UpO1xuICAgIH0sXG4gICAgbG9hZGVkQnk6IGZ1bmN0aW9uKG1vZHVsZU5hbWUpIHtcbiAgICAgIHRoaXMuc3RhY2sgKz0gJ1xcbiBsb2FkZWQgYnkgJyArIG1vZHVsZU5hbWU7XG4gICAgfSxcbiAgICBzdHJpcFN0YWNrOiBmdW5jdGlvbihjYXVzZVN0YWNrKSB7XG4gICAgICB2YXIgc3RhY2sgPSBbXTtcbiAgICAgIGNhdXNlU3RhY2suc3BsaXQoJ1xcbicpLnNvbWUoKGZ1bmN0aW9uKGZyYW1lKSB7XG4gICAgICAgIGlmICgvVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IvLnRlc3QoZnJhbWUpKVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBzdGFjay5wdXNoKGZyYW1lKTtcbiAgICAgIH0pKTtcbiAgICAgIHN0YWNrWzBdID0gdGhpcy5zdHJpcEVycm9yKHN0YWNrWzBdKTtcbiAgICAgIHJldHVybiBzdGFjay5qb2luKCdcXG4nKTtcbiAgICB9XG4gIH0sIHt9LCBFcnJvcik7XG4gIGZ1bmN0aW9uIGJlZm9yZUxpbmVzKGxpbmVzLCBudW1iZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGZpcnN0ID0gbnVtYmVyIC0gMztcbiAgICBpZiAoZmlyc3QgPCAwKVxuICAgICAgZmlyc3QgPSAwO1xuICAgIGZvciAodmFyIGkgPSBmaXJzdDsgaSA8IG51bWJlcjsgaSsrKSB7XG4gICAgICByZXN1bHQucHVzaChsaW5lc1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gYWZ0ZXJMaW5lcyhsaW5lcywgbnVtYmVyKSB7XG4gICAgdmFyIGxhc3QgPSBudW1iZXIgKyAxO1xuICAgIGlmIChsYXN0ID4gbGluZXMubGVuZ3RoIC0gMSlcbiAgICAgIGxhc3QgPSBsaW5lcy5sZW5ndGggLSAxO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gbnVtYmVyOyBpIDw9IGxhc3Q7IGkrKykge1xuICAgICAgcmVzdWx0LnB1c2gobGluZXNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIGNvbHVtblNwYWNpbmcoY29sdW1ucykge1xuICAgIHZhciByZXN1bHQgPSAnJztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbnMgLSAxOyBpKyspIHtcbiAgICAgIHJlc3VsdCArPSAnLSc7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgdmFyIFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yID0gZnVuY3Rpb24gVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IodXJsLCBmdW5jKSB7XG4gICAgJHRyYWNldXJSdW50aW1lLnN1cGVyQ29uc3RydWN0b3IoJFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKS5jYWxsKHRoaXMsIHVybCwgbnVsbCk7XG4gICAgdGhpcy5mdW5jID0gZnVuYztcbiAgfTtcbiAgdmFyICRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvciA9IFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yO1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvciwge2dldFVuY29hdGVkTW9kdWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLnZhbHVlXylcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVfO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHJlbGF0aXZlUmVxdWlyZTtcbiAgICAgICAgaWYgKHR5cGVvZiAkdHJhY2V1clJ1bnRpbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJlbGF0aXZlUmVxdWlyZSA9ICR0cmFjZXVyUnVudGltZS5yZXF1aXJlLmJpbmQobnVsbCwgdGhpcy51cmwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlXyA9IHRoaXMuZnVuYy5jYWxsKGdsb2JhbCwgcmVsYXRpdmVSZXF1aXJlKTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIGlmIChleCBpbnN0YW5jZW9mIE1vZHVsZUV2YWx1YXRpb25FcnJvcikge1xuICAgICAgICAgIGV4LmxvYWRlZEJ5KHRoaXMudXJsKTtcbiAgICAgICAgICB0aHJvdyBleDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXguc3RhY2spIHtcbiAgICAgICAgICB2YXIgbGluZXMgPSB0aGlzLmZ1bmMudG9TdHJpbmcoKS5zcGxpdCgnXFxuJyk7XG4gICAgICAgICAgdmFyIGV2YWxlZCA9IFtdO1xuICAgICAgICAgIGV4LnN0YWNrLnNwbGl0KCdcXG4nKS5zb21lKGZ1bmN0aW9uKGZyYW1lKSB7XG4gICAgICAgICAgICBpZiAoZnJhbWUuaW5kZXhPZignVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IuZ2V0VW5jb2F0ZWRNb2R1bGUnKSA+IDApXG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgdmFyIG0gPSAvKGF0XFxzW15cXHNdKlxccykuKj46KFxcZCopOihcXGQqKVxcKS8uZXhlYyhmcmFtZSk7XG4gICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICB2YXIgbGluZSA9IHBhcnNlSW50KG1bMl0sIDEwKTtcbiAgICAgICAgICAgICAgZXZhbGVkID0gZXZhbGVkLmNvbmNhdChiZWZvcmVMaW5lcyhsaW5lcywgbGluZSkpO1xuICAgICAgICAgICAgICBldmFsZWQucHVzaChjb2x1bW5TcGFjaW5nKG1bM10pICsgJ14nKTtcbiAgICAgICAgICAgICAgZXZhbGVkID0gZXZhbGVkLmNvbmNhdChhZnRlckxpbmVzKGxpbmVzLCBsaW5lKSk7XG4gICAgICAgICAgICAgIGV2YWxlZC5wdXNoKCc9ID0gPSA9ID0gPSA9ID0gPScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZXZhbGVkLnB1c2goZnJhbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGV4LnN0YWNrID0gZXZhbGVkLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBNb2R1bGVFdmFsdWF0aW9uRXJyb3IodGhpcy51cmwsIGV4KTtcbiAgICAgIH1cbiAgICB9fSwge30sIFVuY29hdGVkTW9kdWxlRW50cnkpO1xuICBmdW5jdGlvbiBnZXRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihuYW1lKSB7XG4gICAgaWYgKCFuYW1lKVxuICAgICAgcmV0dXJuO1xuICAgIHZhciB1cmwgPSBNb2R1bGVTdG9yZS5ub3JtYWxpemUobmFtZSk7XG4gICAgcmV0dXJuIG1vZHVsZUluc3RhbnRpYXRvcnNbdXJsXTtcbiAgfVxuICA7XG4gIHZhciBtb2R1bGVJbnN0YW5jZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgbGl2ZU1vZHVsZVNlbnRpbmVsID0ge307XG4gIGZ1bmN0aW9uIE1vZHVsZSh1bmNvYXRlZE1vZHVsZSkge1xuICAgIHZhciBpc0xpdmUgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIGNvYXRlZE1vZHVsZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModW5jb2F0ZWRNb2R1bGUpLmZvckVhY2goKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBnZXR0ZXIsXG4gICAgICAgICAgdmFsdWU7XG4gICAgICBpZiAoaXNMaXZlID09PSBsaXZlTW9kdWxlU2VudGluZWwpIHtcbiAgICAgICAgdmFyIGRlc2NyID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih1bmNvYXRlZE1vZHVsZSwgbmFtZSk7XG4gICAgICAgIGlmIChkZXNjci5nZXQpXG4gICAgICAgICAgZ2V0dGVyID0gZGVzY3IuZ2V0O1xuICAgICAgfVxuICAgICAgaWYgKCFnZXR0ZXIpIHtcbiAgICAgICAgdmFsdWUgPSB1bmNvYXRlZE1vZHVsZVtuYW1lXTtcbiAgICAgICAgZ2V0dGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvYXRlZE1vZHVsZSwgbmFtZSwge1xuICAgICAgICBnZXQ6IGdldHRlcixcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfSkpO1xuICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhjb2F0ZWRNb2R1bGUpO1xuICAgIHJldHVybiBjb2F0ZWRNb2R1bGU7XG4gIH1cbiAgdmFyIE1vZHVsZVN0b3JlID0ge1xuICAgIG5vcm1hbGl6ZTogZnVuY3Rpb24obmFtZSwgcmVmZXJlck5hbWUsIHJlZmVyZXJBZGRyZXNzKSB7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtb2R1bGUgbmFtZSBtdXN0IGJlIGEgc3RyaW5nLCBub3QgJyArIHR5cGVvZiBuYW1lKTtcbiAgICAgIGlmIChpc0Fic29sdXRlKG5hbWUpKVxuICAgICAgICByZXR1cm4gY2Fub25pY2FsaXplVXJsKG5hbWUpO1xuICAgICAgaWYgKC9bXlxcLl1cXC9cXC5cXC5cXC8vLnRlc3QobmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtb2R1bGUgbmFtZSBlbWJlZHMgLy4uLzogJyArIG5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKG5hbWVbMF0gPT09ICcuJyAmJiByZWZlcmVyTmFtZSlcbiAgICAgICAgcmV0dXJuIHJlc29sdmVVcmwocmVmZXJlck5hbWUsIG5hbWUpO1xuICAgICAgcmV0dXJuIGNhbm9uaWNhbGl6ZVVybChuYW1lKTtcbiAgICB9LFxuICAgIGdldDogZnVuY3Rpb24obm9ybWFsaXplZE5hbWUpIHtcbiAgICAgIHZhciBtID0gZ2V0VW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3Iobm9ybWFsaXplZE5hbWUpO1xuICAgICAgaWYgKCFtKVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgdmFyIG1vZHVsZUluc3RhbmNlID0gbW9kdWxlSW5zdGFuY2VzW20udXJsXTtcbiAgICAgIGlmIChtb2R1bGVJbnN0YW5jZSlcbiAgICAgICAgcmV0dXJuIG1vZHVsZUluc3RhbmNlO1xuICAgICAgbW9kdWxlSW5zdGFuY2UgPSBNb2R1bGUobS5nZXRVbmNvYXRlZE1vZHVsZSgpLCBsaXZlTW9kdWxlU2VudGluZWwpO1xuICAgICAgcmV0dXJuIG1vZHVsZUluc3RhbmNlc1ttLnVybF0gPSBtb2R1bGVJbnN0YW5jZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obm9ybWFsaXplZE5hbWUsIG1vZHVsZSkge1xuICAgICAgbm9ybWFsaXplZE5hbWUgPSBTdHJpbmcobm9ybWFsaXplZE5hbWUpO1xuICAgICAgbW9kdWxlSW5zdGFudGlhdG9yc1tub3JtYWxpemVkTmFtZV0gPSBuZXcgVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3Iobm9ybWFsaXplZE5hbWUsIChmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZHVsZTtcbiAgICAgIH0pKTtcbiAgICAgIG1vZHVsZUluc3RhbmNlc1tub3JtYWxpemVkTmFtZV0gPSBtb2R1bGU7XG4gICAgfSxcbiAgICBnZXQgYmFzZVVSTCgpIHtcbiAgICAgIHJldHVybiBiYXNlVVJMO1xuICAgIH0sXG4gICAgc2V0IGJhc2VVUkwodikge1xuICAgICAgYmFzZVVSTCA9IFN0cmluZyh2KTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyTW9kdWxlOiBmdW5jdGlvbihuYW1lLCBkZXBzLCBmdW5jKSB7XG4gICAgICB2YXIgbm9ybWFsaXplZE5hbWUgPSBNb2R1bGVTdG9yZS5ub3JtYWxpemUobmFtZSk7XG4gICAgICBpZiAobW9kdWxlSW5zdGFudGlhdG9yc1tub3JtYWxpemVkTmFtZV0pXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZHVwbGljYXRlIG1vZHVsZSBuYW1lZCAnICsgbm9ybWFsaXplZE5hbWUpO1xuICAgICAgbW9kdWxlSW5zdGFudGlhdG9yc1tub3JtYWxpemVkTmFtZV0gPSBuZXcgVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3Iobm9ybWFsaXplZE5hbWUsIGZ1bmMpO1xuICAgIH0sXG4gICAgYnVuZGxlU3RvcmU6IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIGRlcHMsIGZ1bmMpIHtcbiAgICAgIGlmICghZGVwcyB8fCAhZGVwcy5sZW5ndGggJiYgIWZ1bmMubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJNb2R1bGUobmFtZSwgZGVwcywgZnVuYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJ1bmRsZVN0b3JlW25hbWVdID0ge1xuICAgICAgICAgIGRlcHM6IGRlcHMsXG4gICAgICAgICAgZXhlY3V0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgJF9fMCA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgIHZhciBkZXBNYXAgPSB7fTtcbiAgICAgICAgICAgIGRlcHMuZm9yRWFjaCgoZnVuY3Rpb24oZGVwLCBpbmRleCkge1xuICAgICAgICAgICAgICByZXR1cm4gZGVwTWFwW2RlcF0gPSAkX18wW2luZGV4XTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHZhciByZWdpc3RyeUVudHJ5ID0gZnVuYy5jYWxsKHRoaXMsIGRlcE1hcCk7XG4gICAgICAgICAgICByZWdpc3RyeUVudHJ5LmV4ZWN1dGUuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiByZWdpc3RyeUVudHJ5LmV4cG9ydHM7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gICAgZ2V0QW5vbnltb3VzTW9kdWxlOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICByZXR1cm4gbmV3IE1vZHVsZShmdW5jLmNhbGwoZ2xvYmFsKSwgbGl2ZU1vZHVsZVNlbnRpbmVsKTtcbiAgICB9LFxuICAgIGdldEZvclRlc3Rpbmc6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciAkX18wID0gdGhpcztcbiAgICAgIGlmICghdGhpcy50ZXN0aW5nUHJlZml4Xykge1xuICAgICAgICBPYmplY3Qua2V5cyhtb2R1bGVJbnN0YW5jZXMpLnNvbWUoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgIHZhciBtID0gLyh0cmFjZXVyQFteXFwvXSpcXC8pLy5leGVjKGtleSk7XG4gICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICRfXzAudGVzdGluZ1ByZWZpeF8gPSBtWzFdO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXQodGhpcy50ZXN0aW5nUHJlZml4XyArIG5hbWUpO1xuICAgIH1cbiAgfTtcbiAgdmFyIG1vZHVsZVN0b3JlTW9kdWxlID0gbmV3IE1vZHVsZSh7TW9kdWxlU3RvcmU6IE1vZHVsZVN0b3JlfSk7XG4gIE1vZHVsZVN0b3JlLnNldCgnQHRyYWNldXIvc3JjL3J1bnRpbWUvTW9kdWxlU3RvcmUnLCBtb2R1bGVTdG9yZU1vZHVsZSk7XG4gIE1vZHVsZVN0b3JlLnNldCgnQHRyYWNldXIvc3JjL3J1bnRpbWUvTW9kdWxlU3RvcmUuanMnLCBtb2R1bGVTdG9yZU1vZHVsZSk7XG4gIHZhciBzZXR1cEdsb2JhbHMgPSAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzO1xuICAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzID0gZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICAgc2V0dXBHbG9iYWxzKGdsb2JhbCk7XG4gIH07XG4gICR0cmFjZXVyUnVudGltZS5Nb2R1bGVTdG9yZSA9IE1vZHVsZVN0b3JlO1xuICBnbG9iYWwuU3lzdGVtID0ge1xuICAgIHJlZ2lzdGVyOiBNb2R1bGVTdG9yZS5yZWdpc3Rlci5iaW5kKE1vZHVsZVN0b3JlKSxcbiAgICByZWdpc3Rlck1vZHVsZTogTW9kdWxlU3RvcmUucmVnaXN0ZXJNb2R1bGUuYmluZChNb2R1bGVTdG9yZSksXG4gICAgZ2V0OiBNb2R1bGVTdG9yZS5nZXQsXG4gICAgc2V0OiBNb2R1bGVTdG9yZS5zZXQsXG4gICAgbm9ybWFsaXplOiBNb2R1bGVTdG9yZS5ub3JtYWxpemVcbiAgfTtcbiAgJHRyYWNldXJSdW50aW1lLmdldE1vZHVsZUltcGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGluc3RhbnRpYXRvciA9IGdldFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5hbWUpO1xuICAgIHJldHVybiBpbnN0YW50aWF0b3IgJiYgaW5zdGFudGlhdG9yLmdldFVuY29hdGVkTW9kdWxlKCk7XG4gIH07XG59KSh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIjtcbiAgdmFyICRjZWlsID0gTWF0aC5jZWlsO1xuICB2YXIgJGZsb29yID0gTWF0aC5mbG9vcjtcbiAgdmFyICRpc0Zpbml0ZSA9IGlzRmluaXRlO1xuICB2YXIgJGlzTmFOID0gaXNOYU47XG4gIHZhciAkcG93ID0gTWF0aC5wb3c7XG4gIHZhciAkbWluID0gTWF0aC5taW47XG4gIHZhciB0b09iamVjdCA9ICR0cmFjZXVyUnVudGltZS50b09iamVjdDtcbiAgZnVuY3Rpb24gdG9VaW50MzIoeCkge1xuICAgIHJldHVybiB4ID4+PiAwO1xuICB9XG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcbiAgICByZXR1cm4geCAmJiAodHlwZW9mIHggPT09ICdvYmplY3QnIHx8IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKTtcbiAgfVxuICBmdW5jdGlvbiBpc0NhbGxhYmxlKHgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG4gIH1cbiAgZnVuY3Rpb24gaXNOdW1iZXIoeCkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ251bWJlcic7XG4gIH1cbiAgZnVuY3Rpb24gdG9JbnRlZ2VyKHgpIHtcbiAgICB4ID0gK3g7XG4gICAgaWYgKCRpc05hTih4KSlcbiAgICAgIHJldHVybiAwO1xuICAgIGlmICh4ID09PSAwIHx8ICEkaXNGaW5pdGUoeCkpXG4gICAgICByZXR1cm4geDtcbiAgICByZXR1cm4geCA+IDAgPyAkZmxvb3IoeCkgOiAkY2VpbCh4KTtcbiAgfVxuICB2YXIgTUFYX1NBRkVfTEVOR1RIID0gJHBvdygyLCA1MykgLSAxO1xuICBmdW5jdGlvbiB0b0xlbmd0aCh4KSB7XG4gICAgdmFyIGxlbiA9IHRvSW50ZWdlcih4KTtcbiAgICByZXR1cm4gbGVuIDwgMCA/IDAgOiAkbWluKGxlbiwgTUFYX1NBRkVfTEVOR1RIKTtcbiAgfVxuICBmdW5jdGlvbiBjaGVja0l0ZXJhYmxlKHgpIHtcbiAgICByZXR1cm4gIWlzT2JqZWN0KHgpID8gdW5kZWZpbmVkIDogeFtTeW1ib2wuaXRlcmF0b3JdO1xuICB9XG4gIGZ1bmN0aW9uIGlzQ29uc3RydWN0b3IoeCkge1xuICAgIHJldHVybiBpc0NhbGxhYmxlKHgpO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHZhbHVlLCBkb25lKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGRvbmU6IGRvbmVcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIG1heWJlRGVmaW5lKG9iamVjdCwgbmFtZSwgZGVzY3IpIHtcbiAgICBpZiAoIShuYW1lIGluIG9iamVjdCkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIGRlc2NyKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVEZWZpbmVNZXRob2Qob2JqZWN0LCBuYW1lLCB2YWx1ZSkge1xuICAgIG1heWJlRGVmaW5lKG9iamVjdCwgbmFtZSwge1xuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9XG4gIGZ1bmN0aW9uIG1heWJlRGVmaW5lQ29uc3Qob2JqZWN0LCBuYW1lLCB2YWx1ZSkge1xuICAgIG1heWJlRGVmaW5lKG9iamVjdCwgbmFtZSwge1xuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlXG4gICAgfSk7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVBZGRGdW5jdGlvbnMob2JqZWN0LCBmdW5jdGlvbnMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZ1bmN0aW9ucy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgdmFyIG5hbWUgPSBmdW5jdGlvbnNbaV07XG4gICAgICB2YXIgdmFsdWUgPSBmdW5jdGlvbnNbaSArIDFdO1xuICAgICAgbWF5YmVEZWZpbmVNZXRob2Qob2JqZWN0LCBuYW1lLCB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG1heWJlQWRkQ29uc3RzKG9iamVjdCwgY29uc3RzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb25zdHMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgIHZhciBuYW1lID0gY29uc3RzW2ldO1xuICAgICAgdmFyIHZhbHVlID0gY29uc3RzW2kgKyAxXTtcbiAgICAgIG1heWJlRGVmaW5lQ29uc3Qob2JqZWN0LCBuYW1lLCB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG1heWJlQWRkSXRlcmF0b3Iob2JqZWN0LCBmdW5jLCBTeW1ib2wpIHtcbiAgICBpZiAoIVN5bWJvbCB8fCAhU3ltYm9sLml0ZXJhdG9yIHx8IG9iamVjdFtTeW1ib2wuaXRlcmF0b3JdKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChvYmplY3RbJ0BAaXRlcmF0b3InXSlcbiAgICAgIGZ1bmMgPSBvYmplY3RbJ0BAaXRlcmF0b3InXTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTeW1ib2wuaXRlcmF0b3IsIHtcbiAgICAgIHZhbHVlOiBmdW5jLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9XG4gIHZhciBwb2x5ZmlsbHMgPSBbXTtcbiAgZnVuY3Rpb24gcmVnaXN0ZXJQb2x5ZmlsbChmdW5jKSB7XG4gICAgcG9seWZpbGxzLnB1c2goZnVuYyk7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxBbGwoZ2xvYmFsKSB7XG4gICAgcG9seWZpbGxzLmZvckVhY2goKGZ1bmN0aW9uKGYpIHtcbiAgICAgIHJldHVybiBmKGdsb2JhbCk7XG4gICAgfSkpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZ2V0IHRvT2JqZWN0KCkge1xuICAgICAgcmV0dXJuIHRvT2JqZWN0O1xuICAgIH0sXG4gICAgZ2V0IHRvVWludDMyKCkge1xuICAgICAgcmV0dXJuIHRvVWludDMyO1xuICAgIH0sXG4gICAgZ2V0IGlzT2JqZWN0KCkge1xuICAgICAgcmV0dXJuIGlzT2JqZWN0O1xuICAgIH0sXG4gICAgZ2V0IGlzQ2FsbGFibGUoKSB7XG4gICAgICByZXR1cm4gaXNDYWxsYWJsZTtcbiAgICB9LFxuICAgIGdldCBpc051bWJlcigpIHtcbiAgICAgIHJldHVybiBpc051bWJlcjtcbiAgICB9LFxuICAgIGdldCB0b0ludGVnZXIoKSB7XG4gICAgICByZXR1cm4gdG9JbnRlZ2VyO1xuICAgIH0sXG4gICAgZ2V0IHRvTGVuZ3RoKCkge1xuICAgICAgcmV0dXJuIHRvTGVuZ3RoO1xuICAgIH0sXG4gICAgZ2V0IGNoZWNrSXRlcmFibGUoKSB7XG4gICAgICByZXR1cm4gY2hlY2tJdGVyYWJsZTtcbiAgICB9LFxuICAgIGdldCBpc0NvbnN0cnVjdG9yKCkge1xuICAgICAgcmV0dXJuIGlzQ29uc3RydWN0b3I7XG4gICAgfSxcbiAgICBnZXQgY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoKSB7XG4gICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3Q7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVEZWZpbmUoKSB7XG4gICAgICByZXR1cm4gbWF5YmVEZWZpbmU7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVEZWZpbmVNZXRob2QoKSB7XG4gICAgICByZXR1cm4gbWF5YmVEZWZpbmVNZXRob2Q7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVEZWZpbmVDb25zdCgpIHtcbiAgICAgIHJldHVybiBtYXliZURlZmluZUNvbnN0O1xuICAgIH0sXG4gICAgZ2V0IG1heWJlQWRkRnVuY3Rpb25zKCkge1xuICAgICAgcmV0dXJuIG1heWJlQWRkRnVuY3Rpb25zO1xuICAgIH0sXG4gICAgZ2V0IG1heWJlQWRkQ29uc3RzKCkge1xuICAgICAgcmV0dXJuIG1heWJlQWRkQ29uc3RzO1xuICAgIH0sXG4gICAgZ2V0IG1heWJlQWRkSXRlcmF0b3IoKSB7XG4gICAgICByZXR1cm4gbWF5YmVBZGRJdGVyYXRvcjtcbiAgICB9LFxuICAgIGdldCByZWdpc3RlclBvbHlmaWxsKCkge1xuICAgICAgcmV0dXJuIHJlZ2lzdGVyUG9seWZpbGw7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxBbGwoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxBbGw7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9NYXAuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTWFwLmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgaXNPYmplY3QgPSAkX18wLmlzT2JqZWN0LFxuICAgICAgbWF5YmVBZGRJdGVyYXRvciA9ICRfXzAubWF5YmVBZGRJdGVyYXRvcixcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18wLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciBnZXRPd25IYXNoT2JqZWN0ID0gJHRyYWNldXJSdW50aW1lLmdldE93bkhhc2hPYmplY3Q7XG4gIHZhciAkaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuICB2YXIgZGVsZXRlZFNlbnRpbmVsID0ge307XG4gIGZ1bmN0aW9uIGxvb2t1cEluZGV4KG1hcCwga2V5KSB7XG4gICAgaWYgKGlzT2JqZWN0KGtleSkpIHtcbiAgICAgIHZhciBoYXNoT2JqZWN0ID0gZ2V0T3duSGFzaE9iamVjdChrZXkpO1xuICAgICAgcmV0dXJuIGhhc2hPYmplY3QgJiYgbWFwLm9iamVjdEluZGV4X1toYXNoT2JqZWN0Lmhhc2hdO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpXG4gICAgICByZXR1cm4gbWFwLnN0cmluZ0luZGV4X1trZXldO1xuICAgIHJldHVybiBtYXAucHJpbWl0aXZlSW5kZXhfW2tleV07XG4gIH1cbiAgZnVuY3Rpb24gaW5pdE1hcChtYXApIHtcbiAgICBtYXAuZW50cmllc18gPSBbXTtcbiAgICBtYXAub2JqZWN0SW5kZXhfID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBtYXAuc3RyaW5nSW5kZXhfID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBtYXAucHJpbWl0aXZlSW5kZXhfID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBtYXAuZGVsZXRlZENvdW50XyA9IDA7XG4gIH1cbiAgdmFyIE1hcCA9IGZ1bmN0aW9uIE1hcCgpIHtcbiAgICB2YXIgaXRlcmFibGUgPSBhcmd1bWVudHNbMF07XG4gICAgaWYgKCFpc09iamVjdCh0aGlzKSlcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01hcCBjYWxsZWQgb24gaW5jb21wYXRpYmxlIHR5cGUnKTtcbiAgICBpZiAoJGhhc093blByb3BlcnR5LmNhbGwodGhpcywgJ2VudHJpZXNfJykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01hcCBjYW4gbm90IGJlIHJlZW50cmFudGx5IGluaXRpYWxpc2VkJyk7XG4gICAgfVxuICAgIGluaXRNYXAodGhpcyk7XG4gICAgaWYgKGl0ZXJhYmxlICE9PSBudWxsICYmIGl0ZXJhYmxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvciAodmFyICRfXzIgPSBpdGVyYWJsZVskdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShTeW1ib2wuaXRlcmF0b3IpXSgpLFxuICAgICAgICAgICRfXzM7ICEoJF9fMyA9ICRfXzIubmV4dCgpKS5kb25lOyApIHtcbiAgICAgICAgdmFyICRfXzQgPSAkX18zLnZhbHVlLFxuICAgICAgICAgICAga2V5ID0gJF9fNFswXSxcbiAgICAgICAgICAgIHZhbHVlID0gJF9fNFsxXTtcbiAgICAgICAge1xuICAgICAgICAgIHRoaXMuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShNYXAsIHtcbiAgICBnZXQgc2l6ZSgpIHtcbiAgICAgIHJldHVybiB0aGlzLmVudHJpZXNfLmxlbmd0aCAvIDIgLSB0aGlzLmRlbGV0ZWRDb3VudF87XG4gICAgfSxcbiAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIGluZGV4ID0gbG9va3VwSW5kZXgodGhpcywga2V5KTtcbiAgICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKVxuICAgICAgICByZXR1cm4gdGhpcy5lbnRyaWVzX1tpbmRleCArIDFdO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICB2YXIgb2JqZWN0TW9kZSA9IGlzT2JqZWN0KGtleSk7XG4gICAgICB2YXIgc3RyaW5nTW9kZSA9IHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnO1xuICAgICAgdmFyIGluZGV4ID0gbG9va3VwSW5kZXgodGhpcywga2V5KTtcbiAgICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZW50cmllc19baW5kZXggKyAxXSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLmVudHJpZXNfLmxlbmd0aDtcbiAgICAgICAgdGhpcy5lbnRyaWVzX1tpbmRleF0gPSBrZXk7XG4gICAgICAgIHRoaXMuZW50cmllc19baW5kZXggKyAxXSA9IHZhbHVlO1xuICAgICAgICBpZiAob2JqZWN0TW9kZSkge1xuICAgICAgICAgIHZhciBoYXNoT2JqZWN0ID0gZ2V0T3duSGFzaE9iamVjdChrZXkpO1xuICAgICAgICAgIHZhciBoYXNoID0gaGFzaE9iamVjdC5oYXNoO1xuICAgICAgICAgIHRoaXMub2JqZWN0SW5kZXhfW2hhc2hdID0gaW5kZXg7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RyaW5nTW9kZSkge1xuICAgICAgICAgIHRoaXMuc3RyaW5nSW5kZXhfW2tleV0gPSBpbmRleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnByaW1pdGl2ZUluZGV4X1trZXldID0gaW5kZXg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBsb29rdXBJbmRleCh0aGlzLCBrZXkpICE9PSB1bmRlZmluZWQ7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIG9iamVjdE1vZGUgPSBpc09iamVjdChrZXkpO1xuICAgICAgdmFyIHN0cmluZ01vZGUgPSB0eXBlb2Yga2V5ID09PSAnc3RyaW5nJztcbiAgICAgIHZhciBpbmRleDtcbiAgICAgIHZhciBoYXNoO1xuICAgICAgaWYgKG9iamVjdE1vZGUpIHtcbiAgICAgICAgdmFyIGhhc2hPYmplY3QgPSBnZXRPd25IYXNoT2JqZWN0KGtleSk7XG4gICAgICAgIGlmIChoYXNoT2JqZWN0KSB7XG4gICAgICAgICAgaW5kZXggPSB0aGlzLm9iamVjdEluZGV4X1toYXNoID0gaGFzaE9iamVjdC5oYXNoXTtcbiAgICAgICAgICBkZWxldGUgdGhpcy5vYmplY3RJbmRleF9baGFzaF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc3RyaW5nTW9kZSkge1xuICAgICAgICBpbmRleCA9IHRoaXMuc3RyaW5nSW5kZXhfW2tleV07XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN0cmluZ0luZGV4X1trZXldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLnByaW1pdGl2ZUluZGV4X1trZXldO1xuICAgICAgICBkZWxldGUgdGhpcy5wcmltaXRpdmVJbmRleF9ba2V5XTtcbiAgICAgIH1cbiAgICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZW50cmllc19baW5kZXhdID0gZGVsZXRlZFNlbnRpbmVsO1xuICAgICAgICB0aGlzLmVudHJpZXNfW2luZGV4ICsgMV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuZGVsZXRlZENvdW50XysrO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICAgIGluaXRNYXAodGhpcyk7XG4gICAgfSxcbiAgICBmb3JFYWNoOiBmdW5jdGlvbihjYWxsYmFja0ZuKSB7XG4gICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lbnRyaWVzXy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICB2YXIga2V5ID0gdGhpcy5lbnRyaWVzX1tpXTtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5lbnRyaWVzX1tpICsgMV07XG4gICAgICAgIGlmIChrZXkgPT09IGRlbGV0ZWRTZW50aW5lbClcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgY2FsbGJhY2tGbi5jYWxsKHRoaXNBcmcsIHZhbHVlLCBrZXksIHRoaXMpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZW50cmllczogJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbihmdW5jdGlvbiAkX181KCkge1xuICAgICAgdmFyIGksXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHZhbHVlO1xuICAgICAgcmV0dXJuICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShmdW5jdGlvbigkY3R4KSB7XG4gICAgICAgIHdoaWxlICh0cnVlKVxuICAgICAgICAgIHN3aXRjaCAoJGN0eC5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICBpID0gMDtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoaSA8IHRoaXMuZW50cmllc18ubGVuZ3RoKSA/IDggOiAtMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAga2V5ID0gdGhpcy5lbnRyaWVzX1tpXTtcbiAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmVudHJpZXNfW2kgKyAxXTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKGtleSA9PT0gZGVsZXRlZFNlbnRpbmVsKSA/IDQgOiA2O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDI7XG4gICAgICAgICAgICAgIHJldHVybiBba2V5LCB2YWx1ZV07XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICRjdHgubWF5YmVUaHJvdygpO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gNDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICByZXR1cm4gJGN0eC5lbmQoKTtcbiAgICAgICAgICB9XG4gICAgICB9LCAkX181LCB0aGlzKTtcbiAgICB9KSxcbiAgICBrZXlzOiAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uICRfXzYoKSB7XG4gICAgICB2YXIgaSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdmFsdWU7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChpIDwgdGhpcy5lbnRyaWVzXy5sZW5ndGgpID8gOCA6IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICBrZXkgPSB0aGlzLmVudHJpZXNfW2ldO1xuICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZW50cmllc19baSArIDFdO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gOTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoa2V5ID09PSBkZWxldGVkU2VudGluZWwpID8gNCA6IDY7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMjtcbiAgICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5tYXliZVRocm93KCk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA0O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiAkY3R4LmVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgIH0sICRfXzYsIHRoaXMpO1xuICAgIH0pLFxuICAgIHZhbHVlczogJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbihmdW5jdGlvbiAkX183KCkge1xuICAgICAgdmFyIGksXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHZhbHVlO1xuICAgICAgcmV0dXJuICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShmdW5jdGlvbigkY3R4KSB7XG4gICAgICAgIHdoaWxlICh0cnVlKVxuICAgICAgICAgIHN3aXRjaCAoJGN0eC5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICBpID0gMDtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoaSA8IHRoaXMuZW50cmllc18ubGVuZ3RoKSA/IDggOiAtMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAga2V5ID0gdGhpcy5lbnRyaWVzX1tpXTtcbiAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmVudHJpZXNfW2kgKyAxXTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKGtleSA9PT0gZGVsZXRlZFNlbnRpbmVsKSA/IDQgOiA2O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDI7XG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5tYXliZVRocm93KCk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA0O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiAkY3R4LmVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgIH0sICRfXzcsIHRoaXMpO1xuICAgIH0pXG4gIH0sIHt9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE1hcC5wcm90b3R5cGUsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICB2YWx1ZTogTWFwLnByb3RvdHlwZS5lbnRyaWVzXG4gIH0pO1xuICBmdW5jdGlvbiBwb2x5ZmlsbE1hcChnbG9iYWwpIHtcbiAgICB2YXIgJF9fNCA9IGdsb2JhbCxcbiAgICAgICAgT2JqZWN0ID0gJF9fNC5PYmplY3QsXG4gICAgICAgIFN5bWJvbCA9ICRfXzQuU3ltYm9sO1xuICAgIGlmICghZ2xvYmFsLk1hcClcbiAgICAgIGdsb2JhbC5NYXAgPSBNYXA7XG4gICAgdmFyIG1hcFByb3RvdHlwZSA9IGdsb2JhbC5NYXAucHJvdG90eXBlO1xuICAgIGlmIChtYXBQcm90b3R5cGUuZW50cmllcyA9PT0gdW5kZWZpbmVkKVxuICAgICAgZ2xvYmFsLk1hcCA9IE1hcDtcbiAgICBpZiAobWFwUHJvdG90eXBlLmVudHJpZXMpIHtcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IobWFwUHJvdG90eXBlLCBtYXBQcm90b3R5cGUuZW50cmllcywgU3ltYm9sKTtcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKG5ldyBnbG9iYWwuTWFwKCkuZW50cmllcygpKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSwgU3ltYm9sKTtcbiAgICB9XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbE1hcCk7XG4gIHJldHVybiB7XG4gICAgZ2V0IE1hcCgpIHtcbiAgICAgIHJldHVybiBNYXA7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxNYXAoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxNYXA7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTWFwLmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TZXQuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU2V0LmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgaXNPYmplY3QgPSAkX18wLmlzT2JqZWN0LFxuICAgICAgbWF5YmVBZGRJdGVyYXRvciA9ICRfXzAubWF5YmVBZGRJdGVyYXRvcixcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18wLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciBNYXAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTWFwLmpzXCIpLk1hcDtcbiAgdmFyIGdldE93bkhhc2hPYmplY3QgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duSGFzaE9iamVjdDtcbiAgdmFyICRoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIGZ1bmN0aW9uIGluaXRTZXQoc2V0KSB7XG4gICAgc2V0Lm1hcF8gPSBuZXcgTWFwKCk7XG4gIH1cbiAgdmFyIFNldCA9IGZ1bmN0aW9uIFNldCgpIHtcbiAgICB2YXIgaXRlcmFibGUgPSBhcmd1bWVudHNbMF07XG4gICAgaWYgKCFpc09iamVjdCh0aGlzKSlcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1NldCBjYWxsZWQgb24gaW5jb21wYXRpYmxlIHR5cGUnKTtcbiAgICBpZiAoJGhhc093blByb3BlcnR5LmNhbGwodGhpcywgJ21hcF8nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU2V0IGNhbiBub3QgYmUgcmVlbnRyYW50bHkgaW5pdGlhbGlzZWQnKTtcbiAgICB9XG4gICAgaW5pdFNldCh0aGlzKTtcbiAgICBpZiAoaXRlcmFibGUgIT09IG51bGwgJiYgaXRlcmFibGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9yICh2YXIgJF9fNCA9IGl0ZXJhYmxlWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KFN5bWJvbC5pdGVyYXRvcildKCksXG4gICAgICAgICAgJF9fNTsgISgkX181ID0gJF9fNC5uZXh0KCkpLmRvbmU7ICkge1xuICAgICAgICB2YXIgaXRlbSA9ICRfXzUudmFsdWU7XG4gICAgICAgIHtcbiAgICAgICAgICB0aGlzLmFkZChpdGVtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoU2V0LCB7XG4gICAgZ2V0IHNpemUoKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBfLnNpemU7XG4gICAgfSxcbiAgICBoYXM6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwXy5oYXMoa2V5KTtcbiAgICB9LFxuICAgIGFkZDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICB0aGlzLm1hcF8uc2V0KGtleSwga2V5KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGVsZXRlOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcF8uZGVsZXRlKGtleSk7XG4gICAgfSxcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBfLmNsZWFyKCk7XG4gICAgfSxcbiAgICBmb3JFYWNoOiBmdW5jdGlvbihjYWxsYmFja0ZuKSB7XG4gICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIHZhciAkX18yID0gdGhpcztcbiAgICAgIHJldHVybiB0aGlzLm1hcF8uZm9yRWFjaCgoZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICBjYWxsYmFja0ZuLmNhbGwodGhpc0FyZywga2V5LCBrZXksICRfXzIpO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgdmFsdWVzOiAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uICRfXzcoKSB7XG4gICAgICB2YXIgJF9fOCxcbiAgICAgICAgICAkX185O1xuICAgICAgcmV0dXJuICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShmdW5jdGlvbigkY3R4KSB7XG4gICAgICAgIHdoaWxlICh0cnVlKVxuICAgICAgICAgIHN3aXRjaCAoJGN0eC5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAkX184ID0gdGhpcy5tYXBfLmtleXMoKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgICAgICAgICAgICRjdHguc2VudCA9IHZvaWQgMDtcbiAgICAgICAgICAgICAgJGN0eC5hY3Rpb24gPSAnbmV4dCc7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAkX185ID0gJF9fOFskY3R4LmFjdGlvbl0oJGN0eC5zZW50SWdub3JlVGhyb3cpO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gOTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoJF9fOS5kb25lKSA/IDMgOiAyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgJGN0eC5zZW50ID0gJF9fOS52YWx1ZTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICByZXR1cm4gJF9fOS52YWx1ZTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiAkY3R4LmVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgIH0sICRfXzcsIHRoaXMpO1xuICAgIH0pLFxuICAgIGVudHJpZXM6ICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb24gJF9fMTAoKSB7XG4gICAgICB2YXIgJF9fMTEsXG4gICAgICAgICAgJF9fMTI7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICRfXzExID0gdGhpcy5tYXBfLmVudHJpZXMoKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgICAgICAgICAgICRjdHguc2VudCA9IHZvaWQgMDtcbiAgICAgICAgICAgICAgJGN0eC5hY3Rpb24gPSAnbmV4dCc7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAkX18xMiA9ICRfXzExWyRjdHguYWN0aW9uXSgkY3R4LnNlbnRJZ25vcmVUaHJvdyk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA5O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9ICgkX18xMi5kb25lKSA/IDMgOiAyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgJGN0eC5zZW50ID0gJF9fMTIudmFsdWU7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAtMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgcmV0dXJuICRfXzEyLnZhbHVlO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuICRjdHguZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgfSwgJF9fMTAsIHRoaXMpO1xuICAgIH0pXG4gIH0sIHt9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNldC5wcm90b3R5cGUsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICB2YWx1ZTogU2V0LnByb3RvdHlwZS52YWx1ZXNcbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTZXQucHJvdG90eXBlLCAna2V5cycsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IFNldC5wcm90b3R5cGUudmFsdWVzXG4gIH0pO1xuICBmdW5jdGlvbiBwb2x5ZmlsbFNldChnbG9iYWwpIHtcbiAgICB2YXIgJF9fNiA9IGdsb2JhbCxcbiAgICAgICAgT2JqZWN0ID0gJF9fNi5PYmplY3QsXG4gICAgICAgIFN5bWJvbCA9ICRfXzYuU3ltYm9sO1xuICAgIGlmICghZ2xvYmFsLlNldClcbiAgICAgIGdsb2JhbC5TZXQgPSBTZXQ7XG4gICAgdmFyIHNldFByb3RvdHlwZSA9IGdsb2JhbC5TZXQucHJvdG90eXBlO1xuICAgIGlmIChzZXRQcm90b3R5cGUudmFsdWVzKSB7XG4gICAgICBtYXliZUFkZEl0ZXJhdG9yKHNldFByb3RvdHlwZSwgc2V0UHJvdG90eXBlLnZhbHVlcywgU3ltYm9sKTtcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKG5ldyBnbG9iYWwuU2V0KCkudmFsdWVzKCkpLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LCBTeW1ib2wpO1xuICAgIH1cbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsU2V0KTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgU2V0KCkge1xuICAgICAgcmV0dXJuIFNldDtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbFNldCgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbFNldDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TZXQuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvbm9kZV9tb2R1bGVzL3JzdnAvbGliL3JzdnAvYXNhcC5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L25vZGVfbW9kdWxlcy9yc3ZwL2xpYi9yc3ZwL2FzYXAuanNcIjtcbiAgdmFyIGxlbiA9IDA7XG4gIGZ1bmN0aW9uIGFzYXAoY2FsbGJhY2ssIGFyZykge1xuICAgIHF1ZXVlW2xlbl0gPSBjYWxsYmFjaztcbiAgICBxdWV1ZVtsZW4gKyAxXSA9IGFyZztcbiAgICBsZW4gKz0gMjtcbiAgICBpZiAobGVuID09PSAyKSB7XG4gICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgfVxuICB9XG4gIHZhciAkX19kZWZhdWx0ID0gYXNhcDtcbiAgdmFyIGJyb3dzZXJHbG9iYWwgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDoge307XG4gIHZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG4gIHZhciBpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGltcG9ydFNjcmlwdHMgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG4gIGZ1bmN0aW9uIHVzZU5leHRUaWNrKCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gdXNlTXV0YXRpb25PYnNlcnZlcigpIHtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHtjaGFyYWN0ZXJEYXRhOiB0cnVlfSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgbm9kZS5kYXRhID0gKGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBzZXRUaW1lb3V0KGZsdXNoLCAxKTtcbiAgICB9O1xuICB9XG4gIHZhciBxdWV1ZSA9IG5ldyBBcnJheSgxMDAwKTtcbiAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgICAgdmFyIGNhbGxiYWNrID0gcXVldWVbaV07XG4gICAgICB2YXIgYXJnID0gcXVldWVbaSArIDFdO1xuICAgICAgY2FsbGJhY2soYXJnKTtcbiAgICAgIHF1ZXVlW2ldID0gdW5kZWZpbmVkO1xuICAgICAgcXVldWVbaSArIDFdID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBsZW4gPSAwO1xuICB9XG4gIHZhciBzY2hlZHVsZUZsdXNoO1xuICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VOZXh0VGljaygpO1xuICB9IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgfSBlbHNlIGlmIChpc1dvcmtlcikge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICB9IGVsc2Uge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VTZXRUaW1lb3V0KCk7XG4gIH1cbiAgcmV0dXJuIHtnZXQgZGVmYXVsdCgpIHtcbiAgICAgIHJldHVybiAkX19kZWZhdWx0O1xuICAgIH19O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9Qcm9taXNlLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1Byb21pc2UuanNcIjtcbiAgdmFyIGFzeW5jID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvbm9kZV9tb2R1bGVzL3JzdnAvbGliL3JzdnAvYXNhcC5qc1wiKS5kZWZhdWx0O1xuICB2YXIgcmVnaXN0ZXJQb2x5ZmlsbCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKS5yZWdpc3RlclBvbHlmaWxsO1xuICB2YXIgcHJvbWlzZVJhdyA9IHt9O1xuICBmdW5jdGlvbiBpc1Byb21pc2UoeCkge1xuICAgIHJldHVybiB4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4LnN0YXR1c18gIT09IHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBpZFJlc29sdmVIYW5kbGVyKHgpIHtcbiAgICByZXR1cm4geDtcbiAgfVxuICBmdW5jdGlvbiBpZFJlamVjdEhhbmRsZXIoeCkge1xuICAgIHRocm93IHg7XG4gIH1cbiAgZnVuY3Rpb24gY2hhaW4ocHJvbWlzZSkge1xuICAgIHZhciBvblJlc29sdmUgPSBhcmd1bWVudHNbMV0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzFdIDogaWRSZXNvbHZlSGFuZGxlcjtcbiAgICB2YXIgb25SZWplY3QgPSBhcmd1bWVudHNbMl0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzJdIDogaWRSZWplY3RIYW5kbGVyO1xuICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKHByb21pc2UuY29uc3RydWN0b3IpO1xuICAgIHN3aXRjaCAocHJvbWlzZS5zdGF0dXNfKSB7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yO1xuICAgICAgY2FzZSAwOlxuICAgICAgICBwcm9taXNlLm9uUmVzb2x2ZV8ucHVzaChvblJlc29sdmUsIGRlZmVycmVkKTtcbiAgICAgICAgcHJvbWlzZS5vblJlamVjdF8ucHVzaChvblJlamVjdCwgZGVmZXJyZWQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgKzE6XG4gICAgICAgIHByb21pc2VFbnF1ZXVlKHByb21pc2UudmFsdWVfLCBbb25SZXNvbHZlLCBkZWZlcnJlZF0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgLTE6XG4gICAgICAgIHByb21pc2VFbnF1ZXVlKHByb21pc2UudmFsdWVfLCBbb25SZWplY3QsIGRlZmVycmVkXSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgfVxuICBmdW5jdGlvbiBnZXREZWZlcnJlZChDKSB7XG4gICAgaWYgKHRoaXMgPT09ICRQcm9taXNlKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHByb21pc2VJbml0KG5ldyAkUHJvbWlzZShwcm9taXNlUmF3KSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwcm9taXNlOiBwcm9taXNlLFxuICAgICAgICByZXNvbHZlOiAoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHByb21pc2VSZXNvbHZlKHByb21pc2UsIHgpO1xuICAgICAgICB9KSxcbiAgICAgICAgcmVqZWN0OiAoZnVuY3Rpb24ocikge1xuICAgICAgICAgIHByb21pc2VSZWplY3QocHJvbWlzZSwgcik7XG4gICAgICAgIH0pXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICByZXN1bHQucHJvbWlzZSA9IG5ldyBDKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVzdWx0LnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgICByZXN1bHQucmVqZWN0ID0gcmVqZWN0O1xuICAgICAgfSkpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZVNldChwcm9taXNlLCBzdGF0dXMsIHZhbHVlLCBvblJlc29sdmUsIG9uUmVqZWN0KSB7XG4gICAgcHJvbWlzZS5zdGF0dXNfID0gc3RhdHVzO1xuICAgIHByb21pc2UudmFsdWVfID0gdmFsdWU7XG4gICAgcHJvbWlzZS5vblJlc29sdmVfID0gb25SZXNvbHZlO1xuICAgIHByb21pc2Uub25SZWplY3RfID0gb25SZWplY3Q7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZUluaXQocHJvbWlzZSkge1xuICAgIHJldHVybiBwcm9taXNlU2V0KHByb21pc2UsIDAsIHVuZGVmaW5lZCwgW10sIFtdKTtcbiAgfVxuICB2YXIgUHJvbWlzZSA9IGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICBpZiAocmVzb2x2ZXIgPT09IHByb21pc2VSYXcpXG4gICAgICByZXR1cm47XG4gICAgaWYgKHR5cGVvZiByZXNvbHZlciAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgdmFyIHByb21pc2UgPSBwcm9taXNlSW5pdCh0aGlzKTtcbiAgICB0cnkge1xuICAgICAgcmVzb2x2ZXIoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcHJvbWlzZVJlc29sdmUocHJvbWlzZSwgeCk7XG4gICAgICB9KSwgKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgcHJvbWlzZVJlamVjdChwcm9taXNlLCByKTtcbiAgICAgIH0pKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBwcm9taXNlUmVqZWN0KHByb21pc2UsIGUpO1xuICAgIH1cbiAgfTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoUHJvbWlzZSwge1xuICAgIGNhdGNoOiBmdW5jdGlvbihvblJlamVjdCkge1xuICAgICAgcmV0dXJuIHRoaXMudGhlbih1bmRlZmluZWQsIG9uUmVqZWN0KTtcbiAgICB9LFxuICAgIHRoZW46IGZ1bmN0aW9uKG9uUmVzb2x2ZSwgb25SZWplY3QpIHtcbiAgICAgIGlmICh0eXBlb2Ygb25SZXNvbHZlICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICBvblJlc29sdmUgPSBpZFJlc29sdmVIYW5kbGVyO1xuICAgICAgaWYgKHR5cGVvZiBvblJlamVjdCAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgb25SZWplY3QgPSBpZFJlamVjdEhhbmRsZXI7XG4gICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICB2YXIgY29uc3RydWN0b3IgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgcmV0dXJuIGNoYWluKHRoaXMsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgeCA9IHByb21pc2VDb2VyY2UoY29uc3RydWN0b3IsIHgpO1xuICAgICAgICByZXR1cm4geCA9PT0gdGhhdCA/IG9uUmVqZWN0KG5ldyBUeXBlRXJyb3IpIDogaXNQcm9taXNlKHgpID8geC50aGVuKG9uUmVzb2x2ZSwgb25SZWplY3QpIDogb25SZXNvbHZlKHgpO1xuICAgICAgfSwgb25SZWplY3QpO1xuICAgIH1cbiAgfSwge1xuICAgIHJlc29sdmU6IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICh0aGlzID09PSAkUHJvbWlzZSkge1xuICAgICAgICBpZiAoaXNQcm9taXNlKHgpKSB7XG4gICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb21pc2VTZXQobmV3ICRQcm9taXNlKHByb21pc2VSYXcpLCArMSwgeCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IHRoaXMoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgcmVzb2x2ZSh4KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSxcbiAgICByZWplY3Q6IGZ1bmN0aW9uKHIpIHtcbiAgICAgIGlmICh0aGlzID09PSAkUHJvbWlzZSkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZVNldChuZXcgJFByb21pc2UocHJvbWlzZVJhdyksIC0xLCByKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgdGhpcygoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgcmVqZWN0KHIpO1xuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBhbGw6IGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQodGhpcyk7XG4gICAgICB2YXIgcmVzb2x1dGlvbnMgPSBbXTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBjb3VudCA9IHZhbHVlcy5sZW5ndGg7XG4gICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzb2x1dGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnJlc29sdmUodmFsdWVzW2ldKS50aGVuKGZ1bmN0aW9uKGksIHgpIHtcbiAgICAgICAgICAgICAgcmVzb2x1dGlvbnNbaV0gPSB4O1xuICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMClcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc29sdXRpb25zKTtcbiAgICAgICAgICAgIH0uYmluZCh1bmRlZmluZWQsIGkpLCAoZnVuY3Rpb24ocikge1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3Qocik7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH0sXG4gICAgcmFjZTogZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgICB2YXIgZGVmZXJyZWQgPSBnZXREZWZlcnJlZCh0aGlzKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5yZXNvbHZlKHZhbHVlc1tpXSkudGhlbigoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh4KTtcbiAgICAgICAgICB9KSwgKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyKTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfVxuICB9KTtcbiAgdmFyICRQcm9taXNlID0gUHJvbWlzZTtcbiAgdmFyICRQcm9taXNlUmVqZWN0ID0gJFByb21pc2UucmVqZWN0O1xuICBmdW5jdGlvbiBwcm9taXNlUmVzb2x2ZShwcm9taXNlLCB4KSB7XG4gICAgcHJvbWlzZURvbmUocHJvbWlzZSwgKzEsIHgsIHByb21pc2Uub25SZXNvbHZlXyk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZVJlamVjdChwcm9taXNlLCByKSB7XG4gICAgcHJvbWlzZURvbmUocHJvbWlzZSwgLTEsIHIsIHByb21pc2Uub25SZWplY3RfKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlRG9uZShwcm9taXNlLCBzdGF0dXMsIHZhbHVlLCByZWFjdGlvbnMpIHtcbiAgICBpZiAocHJvbWlzZS5zdGF0dXNfICE9PSAwKVxuICAgICAgcmV0dXJuO1xuICAgIHByb21pc2VFbnF1ZXVlKHZhbHVlLCByZWFjdGlvbnMpO1xuICAgIHByb21pc2VTZXQocHJvbWlzZSwgc3RhdHVzLCB2YWx1ZSk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZUVucXVldWUodmFsdWUsIHRhc2tzKSB7XG4gICAgYXN5bmMoKGZ1bmN0aW9uKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YXNrcy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICBwcm9taXNlSGFuZGxlKHZhbHVlLCB0YXNrc1tpXSwgdGFza3NbaSArIDFdKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZUhhbmRsZSh2YWx1ZSwgaGFuZGxlciwgZGVmZXJyZWQpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHJlc3VsdCA9IGhhbmRsZXIodmFsdWUpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZGVmZXJyZWQucHJvbWlzZSlcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICAgIGVsc2UgaWYgKGlzUHJvbWlzZShyZXN1bHQpKVxuICAgICAgICBjaGFpbihyZXN1bHQsIGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCk7XG4gICAgICBlbHNlXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzdWx0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0cnkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSk7XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgfVxuICB2YXIgdGhlbmFibGVTeW1ib2wgPSAnQEB0aGVuYWJsZSc7XG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcbiAgICByZXR1cm4geCAmJiAodHlwZW9mIHggPT09ICdvYmplY3QnIHx8IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlQ29lcmNlKGNvbnN0cnVjdG9yLCB4KSB7XG4gICAgaWYgKCFpc1Byb21pc2UoeCkgJiYgaXNPYmplY3QoeCkpIHtcbiAgICAgIHZhciB0aGVuO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhlbiA9IHgudGhlbjtcbiAgICAgIH0gY2F0Y2ggKHIpIHtcbiAgICAgICAgdmFyIHByb21pc2UgPSAkUHJvbWlzZVJlamVjdC5jYWxsKGNvbnN0cnVjdG9yLCByKTtcbiAgICAgICAgeFt0aGVuYWJsZVN5bWJvbF0gPSBwcm9taXNlO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgcCA9IHhbdGhlbmFibGVTeW1ib2xdO1xuICAgICAgICBpZiAocCkge1xuICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKGNvbnN0cnVjdG9yKTtcbiAgICAgICAgICB4W3RoZW5hYmxlU3ltYm9sXSA9IGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoZW4uY2FsbCh4LCBkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICAgIH0gY2F0Y2ggKHIpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHg7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxQcm9taXNlKGdsb2JhbCkge1xuICAgIGlmICghZ2xvYmFsLlByb21pc2UpXG4gICAgICBnbG9iYWwuUHJvbWlzZSA9IFByb21pc2U7XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbFByb21pc2UpO1xuICByZXR1cm4ge1xuICAgIGdldCBQcm9taXNlKCkge1xuICAgICAgcmV0dXJuIFByb21pc2U7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxQcm9taXNlKCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsUHJvbWlzZTtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9Qcm9taXNlLmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdJdGVyYXRvci5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgJF9fMjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nSXRlcmF0b3IuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCA9ICRfXzAuY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QsXG4gICAgICBpc09iamVjdCA9ICRfXzAuaXNPYmplY3Q7XG4gIHZhciB0b1Byb3BlcnR5ID0gJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHk7XG4gIHZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciBpdGVyYXRlZFN0cmluZyA9IFN5bWJvbCgnaXRlcmF0ZWRTdHJpbmcnKTtcbiAgdmFyIHN0cmluZ0l0ZXJhdG9yTmV4dEluZGV4ID0gU3ltYm9sKCdzdHJpbmdJdGVyYXRvck5leHRJbmRleCcpO1xuICB2YXIgU3RyaW5nSXRlcmF0b3IgPSBmdW5jdGlvbiBTdHJpbmdJdGVyYXRvcigpIHt9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTdHJpbmdJdGVyYXRvciwgKCRfXzIgPSB7fSwgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRfXzIsIFwibmV4dFwiLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG8gPSB0aGlzO1xuICAgICAgaWYgKCFpc09iamVjdChvKSB8fCAhaGFzT3duUHJvcGVydHkuY2FsbChvLCBpdGVyYXRlZFN0cmluZykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndGhpcyBtdXN0IGJlIGEgU3RyaW5nSXRlcmF0b3Igb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgICB2YXIgcyA9IG9bdG9Qcm9wZXJ0eShpdGVyYXRlZFN0cmluZyldO1xuICAgICAgaWYgKHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIHZhciBwb3NpdGlvbiA9IG9bdG9Qcm9wZXJ0eShzdHJpbmdJdGVyYXRvck5leHRJbmRleCldO1xuICAgICAgdmFyIGxlbiA9IHMubGVuZ3RoO1xuICAgICAgaWYgKHBvc2l0aW9uID49IGxlbikge1xuICAgICAgICBvW3RvUHJvcGVydHkoaXRlcmF0ZWRTdHJpbmcpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICB2YXIgZmlyc3QgPSBzLmNoYXJDb2RlQXQocG9zaXRpb24pO1xuICAgICAgdmFyIHJlc3VsdFN0cmluZztcbiAgICAgIGlmIChmaXJzdCA8IDB4RDgwMCB8fCBmaXJzdCA+IDB4REJGRiB8fCBwb3NpdGlvbiArIDEgPT09IGxlbikge1xuICAgICAgICByZXN1bHRTdHJpbmcgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGZpcnN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBzZWNvbmQgPSBzLmNoYXJDb2RlQXQocG9zaXRpb24gKyAxKTtcbiAgICAgICAgaWYgKHNlY29uZCA8IDB4REMwMCB8fCBzZWNvbmQgPiAweERGRkYpIHtcbiAgICAgICAgICByZXN1bHRTdHJpbmcgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGZpcnN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRTdHJpbmcgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGZpcnN0KSArIFN0cmluZy5mcm9tQ2hhckNvZGUoc2Vjb25kKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb1t0b1Byb3BlcnR5KHN0cmluZ0l0ZXJhdG9yTmV4dEluZGV4KV0gPSBwb3NpdGlvbiArIHJlc3VsdFN0cmluZy5sZW5ndGg7XG4gICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QocmVzdWx0U3RyaW5nLCBmYWxzZSk7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRfXzIsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWVcbiAgfSksICRfXzIpLCB7fSk7XG4gIGZ1bmN0aW9uIGNyZWF0ZVN0cmluZ0l0ZXJhdG9yKHN0cmluZykge1xuICAgIHZhciBzID0gU3RyaW5nKHN0cmluZyk7XG4gICAgdmFyIGl0ZXJhdG9yID0gT2JqZWN0LmNyZWF0ZShTdHJpbmdJdGVyYXRvci5wcm90b3R5cGUpO1xuICAgIGl0ZXJhdG9yW3RvUHJvcGVydHkoaXRlcmF0ZWRTdHJpbmcpXSA9IHM7XG4gICAgaXRlcmF0b3JbdG9Qcm9wZXJ0eShzdHJpbmdJdGVyYXRvck5leHRJbmRleCldID0gMDtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG4gIH1cbiAgcmV0dXJuIHtnZXQgY3JlYXRlU3RyaW5nSXRlcmF0b3IoKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3RyaW5nSXRlcmF0b3I7XG4gICAgfX07XG59KTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZy5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmcuanNcIjtcbiAgdmFyIGNyZWF0ZVN0cmluZ0l0ZXJhdG9yID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZ0l0ZXJhdG9yLmpzXCIpLmNyZWF0ZVN0cmluZ0l0ZXJhdG9yO1xuICB2YXIgJF9fMSA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIG1heWJlQWRkRnVuY3Rpb25zID0gJF9fMS5tYXliZUFkZEZ1bmN0aW9ucyxcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IgPSAkX18xLm1heWJlQWRkSXRlcmF0b3IsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMS5yZWdpc3RlclBvbHlmaWxsO1xuICB2YXIgJHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgdmFyICRpbmRleE9mID0gU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mO1xuICB2YXIgJGxhc3RJbmRleE9mID0gU3RyaW5nLnByb3RvdHlwZS5sYXN0SW5kZXhPZjtcbiAgZnVuY3Rpb24gc3RhcnRzV2l0aChzZWFyY2gpIHtcbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIGlmICh0aGlzID09IG51bGwgfHwgJHRvU3RyaW5nLmNhbGwoc2VhcmNoKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuICAgIHZhciBzZWFyY2hTdHJpbmcgPSBTdHJpbmcoc2VhcmNoKTtcbiAgICB2YXIgc2VhcmNoTGVuZ3RoID0gc2VhcmNoU3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgcG9zaXRpb24gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHVuZGVmaW5lZDtcbiAgICB2YXIgcG9zID0gcG9zaXRpb24gPyBOdW1iZXIocG9zaXRpb24pIDogMDtcbiAgICBpZiAoaXNOYU4ocG9zKSkge1xuICAgICAgcG9zID0gMDtcbiAgICB9XG4gICAgdmFyIHN0YXJ0ID0gTWF0aC5taW4oTWF0aC5tYXgocG9zLCAwKSwgc3RyaW5nTGVuZ3RoKTtcbiAgICByZXR1cm4gJGluZGV4T2YuY2FsbChzdHJpbmcsIHNlYXJjaFN0cmluZywgcG9zKSA9PSBzdGFydDtcbiAgfVxuICBmdW5jdGlvbiBlbmRzV2l0aChzZWFyY2gpIHtcbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIGlmICh0aGlzID09IG51bGwgfHwgJHRvU3RyaW5nLmNhbGwoc2VhcmNoKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuICAgIHZhciBzZWFyY2hTdHJpbmcgPSBTdHJpbmcoc2VhcmNoKTtcbiAgICB2YXIgc2VhcmNoTGVuZ3RoID0gc2VhcmNoU3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgcG9zID0gc3RyaW5nTGVuZ3RoO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgdmFyIHBvc2l0aW9uID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHBvc2l0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcG9zID0gcG9zaXRpb24gPyBOdW1iZXIocG9zaXRpb24pIDogMDtcbiAgICAgICAgaWYgKGlzTmFOKHBvcykpIHtcbiAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBlbmQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIHZhciBzdGFydCA9IGVuZCAtIHNlYXJjaExlbmd0aDtcbiAgICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiAkbGFzdEluZGV4T2YuY2FsbChzdHJpbmcsIHNlYXJjaFN0cmluZywgc3RhcnQpID09IHN0YXJ0O1xuICB9XG4gIGZ1bmN0aW9uIGluY2x1ZGVzKHNlYXJjaCkge1xuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIGlmIChzZWFyY2ggJiYgJHRvU3RyaW5nLmNhbGwoc2VhcmNoKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuICAgIHZhciBzZWFyY2hTdHJpbmcgPSBTdHJpbmcoc2VhcmNoKTtcbiAgICB2YXIgc2VhcmNoTGVuZ3RoID0gc2VhcmNoU3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgcG9zaXRpb24gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHVuZGVmaW5lZDtcbiAgICB2YXIgcG9zID0gcG9zaXRpb24gPyBOdW1iZXIocG9zaXRpb24pIDogMDtcbiAgICBpZiAocG9zICE9IHBvcykge1xuICAgICAgcG9zID0gMDtcbiAgICB9XG4gICAgdmFyIHN0YXJ0ID0gTWF0aC5taW4oTWF0aC5tYXgocG9zLCAwKSwgc3RyaW5nTGVuZ3RoKTtcbiAgICBpZiAoc2VhcmNoTGVuZ3RoICsgc3RhcnQgPiBzdHJpbmdMZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuICRpbmRleE9mLmNhbGwoc3RyaW5nLCBzZWFyY2hTdHJpbmcsIHBvcykgIT0gLTE7XG4gIH1cbiAgZnVuY3Rpb24gcmVwZWF0KGNvdW50KSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgdmFyIG4gPSBjb3VudCA/IE51bWJlcihjb3VudCkgOiAwO1xuICAgIGlmIChpc05hTihuKSkge1xuICAgICAgbiA9IDA7XG4gICAgfVxuICAgIGlmIChuIDwgMCB8fCBuID09IEluZmluaXR5KSB7XG4gICAgICB0aHJvdyBSYW5nZUVycm9yKCk7XG4gICAgfVxuICAgIGlmIChuID09IDApIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIHdoaWxlIChuLS0pIHtcbiAgICAgIHJlc3VsdCArPSBzdHJpbmc7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gY29kZVBvaW50QXQocG9zaXRpb24pIHtcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICB2YXIgc2l6ZSA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIGluZGV4ID0gcG9zaXRpb24gPyBOdW1iZXIocG9zaXRpb24pIDogMDtcbiAgICBpZiAoaXNOYU4oaW5kZXgpKSB7XG4gICAgICBpbmRleCA9IDA7XG4gICAgfVxuICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gc2l6ZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGZpcnN0ID0gc3RyaW5nLmNoYXJDb2RlQXQoaW5kZXgpO1xuICAgIHZhciBzZWNvbmQ7XG4gICAgaWYgKGZpcnN0ID49IDB4RDgwMCAmJiBmaXJzdCA8PSAweERCRkYgJiYgc2l6ZSA+IGluZGV4ICsgMSkge1xuICAgICAgc2Vjb25kID0gc3RyaW5nLmNoYXJDb2RlQXQoaW5kZXggKyAxKTtcbiAgICAgIGlmIChzZWNvbmQgPj0gMHhEQzAwICYmIHNlY29uZCA8PSAweERGRkYpIHtcbiAgICAgICAgcmV0dXJuIChmaXJzdCAtIDB4RDgwMCkgKiAweDQwMCArIHNlY29uZCAtIDB4REMwMCArIDB4MTAwMDA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmaXJzdDtcbiAgfVxuICBmdW5jdGlvbiByYXcoY2FsbHNpdGUpIHtcbiAgICB2YXIgcmF3ID0gY2FsbHNpdGUucmF3O1xuICAgIHZhciBsZW4gPSByYXcubGVuZ3RoID4+PiAwO1xuICAgIGlmIChsZW4gPT09IDApXG4gICAgICByZXR1cm4gJyc7XG4gICAgdmFyIHMgPSAnJztcbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHMgKz0gcmF3W2ldO1xuICAgICAgaWYgKGkgKyAxID09PSBsZW4pXG4gICAgICAgIHJldHVybiBzO1xuICAgICAgcyArPSBhcmd1bWVudHNbKytpXTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZnJvbUNvZGVQb2ludCgpIHtcbiAgICB2YXIgY29kZVVuaXRzID0gW107XG4gICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgICB2YXIgaGlnaFN1cnJvZ2F0ZTtcbiAgICB2YXIgbG93U3Vycm9nYXRlO1xuICAgIHZhciBpbmRleCA9IC0xO1xuICAgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGlmICghbGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIgY29kZVBvaW50ID0gTnVtYmVyKGFyZ3VtZW50c1tpbmRleF0pO1xuICAgICAgaWYgKCFpc0Zpbml0ZShjb2RlUG9pbnQpIHx8IGNvZGVQb2ludCA8IDAgfHwgY29kZVBvaW50ID4gMHgxMEZGRkYgfHwgZmxvb3IoY29kZVBvaW50KSAhPSBjb2RlUG9pbnQpIHtcbiAgICAgICAgdGhyb3cgUmFuZ2VFcnJvcignSW52YWxpZCBjb2RlIHBvaW50OiAnICsgY29kZVBvaW50KTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlUG9pbnQgPD0gMHhGRkZGKSB7XG4gICAgICAgIGNvZGVVbml0cy5wdXNoKGNvZGVQb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMDtcbiAgICAgICAgaGlnaFN1cnJvZ2F0ZSA9IChjb2RlUG9pbnQgPj4gMTApICsgMHhEODAwO1xuICAgICAgICBsb3dTdXJyb2dhdGUgPSAoY29kZVBvaW50ICUgMHg0MDApICsgMHhEQzAwO1xuICAgICAgICBjb2RlVW5pdHMucHVzaChoaWdoU3Vycm9nYXRlLCBsb3dTdXJyb2dhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBjb2RlVW5pdHMpO1xuICB9XG4gIGZ1bmN0aW9uIHN0cmluZ1Byb3RvdHlwZUl0ZXJhdG9yKCkge1xuICAgIHZhciBvID0gJHRyYWNldXJSdW50aW1lLmNoZWNrT2JqZWN0Q29lcmNpYmxlKHRoaXMpO1xuICAgIHZhciBzID0gU3RyaW5nKG8pO1xuICAgIHJldHVybiBjcmVhdGVTdHJpbmdJdGVyYXRvcihzKTtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbFN0cmluZyhnbG9iYWwpIHtcbiAgICB2YXIgU3RyaW5nID0gZ2xvYmFsLlN0cmluZztcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhTdHJpbmcucHJvdG90eXBlLCBbJ2NvZGVQb2ludEF0JywgY29kZVBvaW50QXQsICdlbmRzV2l0aCcsIGVuZHNXaXRoLCAnaW5jbHVkZXMnLCBpbmNsdWRlcywgJ3JlcGVhdCcsIHJlcGVhdCwgJ3N0YXJ0c1dpdGgnLCBzdGFydHNXaXRoXSk7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoU3RyaW5nLCBbJ2Zyb21Db2RlUG9pbnQnLCBmcm9tQ29kZVBvaW50LCAncmF3JywgcmF3XSk7XG4gICAgbWF5YmVBZGRJdGVyYXRvcihTdHJpbmcucHJvdG90eXBlLCBzdHJpbmdQcm90b3R5cGVJdGVyYXRvciwgU3ltYm9sKTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsU3RyaW5nKTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgc3RhcnRzV2l0aCgpIHtcbiAgICAgIHJldHVybiBzdGFydHNXaXRoO1xuICAgIH0sXG4gICAgZ2V0IGVuZHNXaXRoKCkge1xuICAgICAgcmV0dXJuIGVuZHNXaXRoO1xuICAgIH0sXG4gICAgZ2V0IGluY2x1ZGVzKCkge1xuICAgICAgcmV0dXJuIGluY2x1ZGVzO1xuICAgIH0sXG4gICAgZ2V0IHJlcGVhdCgpIHtcbiAgICAgIHJldHVybiByZXBlYXQ7XG4gICAgfSxcbiAgICBnZXQgY29kZVBvaW50QXQoKSB7XG4gICAgICByZXR1cm4gY29kZVBvaW50QXQ7XG4gICAgfSxcbiAgICBnZXQgcmF3KCkge1xuICAgICAgcmV0dXJuIHJhdztcbiAgICB9LFxuICAgIGdldCBmcm9tQ29kZVBvaW50KCkge1xuICAgICAgcmV0dXJuIGZyb21Db2RlUG9pbnQ7XG4gICAgfSxcbiAgICBnZXQgc3RyaW5nUHJvdG90eXBlSXRlcmF0b3IoKSB7XG4gICAgICByZXR1cm4gc3RyaW5nUHJvdG90eXBlSXRlcmF0b3I7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxTdHJpbmcoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxTdHJpbmc7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nLmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciAkX18yO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yLmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgdG9PYmplY3QgPSAkX18wLnRvT2JqZWN0LFxuICAgICAgdG9VaW50MzIgPSAkX18wLnRvVWludDMyLFxuICAgICAgY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QgPSAkX18wLmNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0O1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9LRVlTID0gMTtcbiAgdmFyIEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTID0gMjtcbiAgdmFyIEFSUkFZX0lURVJBVE9SX0tJTkRfRU5UUklFUyA9IDM7XG4gIHZhciBBcnJheUl0ZXJhdG9yID0gZnVuY3Rpb24gQXJyYXlJdGVyYXRvcigpIHt9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShBcnJheUl0ZXJhdG9yLCAoJF9fMiA9IHt9LCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fMiwgXCJuZXh0XCIsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSB0b09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBhcnJheSA9IGl0ZXJhdG9yLml0ZXJhdG9yT2JqZWN0XztcbiAgICAgIGlmICghYXJyYXkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0IGlzIG5vdCBhbiBBcnJheUl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICB2YXIgaW5kZXggPSBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XztcbiAgICAgIHZhciBpdGVtS2luZCA9IGl0ZXJhdG9yLmFycmF5SXRlcmF0aW9uS2luZF87XG4gICAgICB2YXIgbGVuZ3RoID0gdG9VaW50MzIoYXJyYXkubGVuZ3RoKTtcbiAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRvck5leHRJbmRleF8gPSBJbmZpbml0eTtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IGluZGV4ICsgMTtcbiAgICAgIGlmIChpdGVtS2luZCA9PSBBUlJBWV9JVEVSQVRPUl9LSU5EX1ZBTFVFUylcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KGFycmF5W2luZGV4XSwgZmFsc2UpO1xuICAgICAgaWYgKGl0ZW1LaW5kID09IEFSUkFZX0lURVJBVE9SX0tJTkRfRU5UUklFUylcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KFtpbmRleCwgYXJyYXlbaW5kZXhdXSwgZmFsc2UpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KGluZGV4LCBmYWxzZSk7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRfXzIsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWVcbiAgfSksICRfXzIpLCB7fSk7XG4gIGZ1bmN0aW9uIGNyZWF0ZUFycmF5SXRlcmF0b3IoYXJyYXksIGtpbmQpIHtcbiAgICB2YXIgb2JqZWN0ID0gdG9PYmplY3QoYXJyYXkpO1xuICAgIHZhciBpdGVyYXRvciA9IG5ldyBBcnJheUl0ZXJhdG9yO1xuICAgIGl0ZXJhdG9yLml0ZXJhdG9yT2JqZWN0XyA9IG9iamVjdDtcbiAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IDA7XG4gICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRpb25LaW5kXyA9IGtpbmQ7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xuICB9XG4gIGZ1bmN0aW9uIGVudHJpZXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTKTtcbiAgfVxuICBmdW5jdGlvbiBrZXlzKCkge1xuICAgIHJldHVybiBjcmVhdGVBcnJheUl0ZXJhdG9yKHRoaXMsIEFSUkFZX0lURVJBVE9SX0tJTkRfS0VZUyk7XG4gIH1cbiAgZnVuY3Rpb24gdmFsdWVzKCkge1xuICAgIHJldHVybiBjcmVhdGVBcnJheUl0ZXJhdG9yKHRoaXMsIEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGdldCBlbnRyaWVzKCkge1xuICAgICAgcmV0dXJuIGVudHJpZXM7XG4gICAgfSxcbiAgICBnZXQga2V5cygpIHtcbiAgICAgIHJldHVybiBrZXlzO1xuICAgIH0sXG4gICAgZ2V0IHZhbHVlcygpIHtcbiAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheS5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheS5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yLmpzXCIpLFxuICAgICAgZW50cmllcyA9ICRfXzAuZW50cmllcyxcbiAgICAgIGtleXMgPSAkX18wLmtleXMsXG4gICAgICB2YWx1ZXMgPSAkX18wLnZhbHVlcztcbiAgdmFyICRfXzEgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBjaGVja0l0ZXJhYmxlID0gJF9fMS5jaGVja0l0ZXJhYmxlLFxuICAgICAgaXNDYWxsYWJsZSA9ICRfXzEuaXNDYWxsYWJsZSxcbiAgICAgIGlzQ29uc3RydWN0b3IgPSAkX18xLmlzQ29uc3RydWN0b3IsXG4gICAgICBtYXliZUFkZEZ1bmN0aW9ucyA9ICRfXzEubWF5YmVBZGRGdW5jdGlvbnMsXG4gICAgICBtYXliZUFkZEl0ZXJhdG9yID0gJF9fMS5tYXliZUFkZEl0ZXJhdG9yLFxuICAgICAgcmVnaXN0ZXJQb2x5ZmlsbCA9ICRfXzEucmVnaXN0ZXJQb2x5ZmlsbCxcbiAgICAgIHRvSW50ZWdlciA9ICRfXzEudG9JbnRlZ2VyLFxuICAgICAgdG9MZW5ndGggPSAkX18xLnRvTGVuZ3RoLFxuICAgICAgdG9PYmplY3QgPSAkX18xLnRvT2JqZWN0O1xuICBmdW5jdGlvbiBmcm9tKGFyckxpa2UpIHtcbiAgICB2YXIgbWFwRm4gPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMl07XG4gICAgdmFyIEMgPSB0aGlzO1xuICAgIHZhciBpdGVtcyA9IHRvT2JqZWN0KGFyckxpa2UpO1xuICAgIHZhciBtYXBwaW5nID0gbWFwRm4gIT09IHVuZGVmaW5lZDtcbiAgICB2YXIgayA9IDA7XG4gICAgdmFyIGFycixcbiAgICAgICAgbGVuO1xuICAgIGlmIChtYXBwaW5nICYmICFpc0NhbGxhYmxlKG1hcEZuKSkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIGlmIChjaGVja0l0ZXJhYmxlKGl0ZW1zKSkge1xuICAgICAgYXJyID0gaXNDb25zdHJ1Y3RvcihDKSA/IG5ldyBDKCkgOiBbXTtcbiAgICAgIGZvciAodmFyICRfXzIgPSBpdGVtc1skdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShTeW1ib2wuaXRlcmF0b3IpXSgpLFxuICAgICAgICAgICRfXzM7ICEoJF9fMyA9ICRfXzIubmV4dCgpKS5kb25lOyApIHtcbiAgICAgICAgdmFyIGl0ZW0gPSAkX18zLnZhbHVlO1xuICAgICAgICB7XG4gICAgICAgICAgaWYgKG1hcHBpbmcpIHtcbiAgICAgICAgICAgIGFycltrXSA9IG1hcEZuLmNhbGwodGhpc0FyZywgaXRlbSwgayk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFycltrXSA9IGl0ZW07XG4gICAgICAgICAgfVxuICAgICAgICAgIGsrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXJyLmxlbmd0aCA9IGs7XG4gICAgICByZXR1cm4gYXJyO1xuICAgIH1cbiAgICBsZW4gPSB0b0xlbmd0aChpdGVtcy5sZW5ndGgpO1xuICAgIGFyciA9IGlzQ29uc3RydWN0b3IoQykgPyBuZXcgQyhsZW4pIDogbmV3IEFycmF5KGxlbik7XG4gICAgZm9yICg7IGsgPCBsZW47IGsrKykge1xuICAgICAgaWYgKG1hcHBpbmcpIHtcbiAgICAgICAgYXJyW2tdID0gdHlwZW9mIHRoaXNBcmcgPT09ICd1bmRlZmluZWQnID8gbWFwRm4oaXRlbXNba10sIGspIDogbWFwRm4uY2FsbCh0aGlzQXJnLCBpdGVtc1trXSwgayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcnJba10gPSBpdGVtc1trXTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXJyLmxlbmd0aCA9IGxlbjtcbiAgICByZXR1cm4gYXJyO1xuICB9XG4gIGZ1bmN0aW9uIG9mKCkge1xuICAgIGZvciAodmFyIGl0ZW1zID0gW10sXG4gICAgICAgICRfXzQgPSAwOyAkX180IDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fNCsrKVxuICAgICAgaXRlbXNbJF9fNF0gPSBhcmd1bWVudHNbJF9fNF07XG4gICAgdmFyIEMgPSB0aGlzO1xuICAgIHZhciBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgdmFyIGFyciA9IGlzQ29uc3RydWN0b3IoQykgPyBuZXcgQyhsZW4pIDogbmV3IEFycmF5KGxlbik7XG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBsZW47IGsrKykge1xuICAgICAgYXJyW2tdID0gaXRlbXNba107XG4gICAgfVxuICAgIGFyci5sZW5ndGggPSBsZW47XG4gICAgcmV0dXJuIGFycjtcbiAgfVxuICBmdW5jdGlvbiBmaWxsKHZhbHVlKSB7XG4gICAgdmFyIHN0YXJ0ID0gYXJndW1lbnRzWzFdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1sxXSA6IDA7XG4gICAgdmFyIGVuZCA9IGFyZ3VtZW50c1syXTtcbiAgICB2YXIgb2JqZWN0ID0gdG9PYmplY3QodGhpcyk7XG4gICAgdmFyIGxlbiA9IHRvTGVuZ3RoKG9iamVjdC5sZW5ndGgpO1xuICAgIHZhciBmaWxsU3RhcnQgPSB0b0ludGVnZXIoc3RhcnQpO1xuICAgIHZhciBmaWxsRW5kID0gZW5kICE9PSB1bmRlZmluZWQgPyB0b0ludGVnZXIoZW5kKSA6IGxlbjtcbiAgICBmaWxsU3RhcnQgPSBmaWxsU3RhcnQgPCAwID8gTWF0aC5tYXgobGVuICsgZmlsbFN0YXJ0LCAwKSA6IE1hdGgubWluKGZpbGxTdGFydCwgbGVuKTtcbiAgICBmaWxsRW5kID0gZmlsbEVuZCA8IDAgPyBNYXRoLm1heChsZW4gKyBmaWxsRW5kLCAwKSA6IE1hdGgubWluKGZpbGxFbmQsIGxlbik7XG4gICAgd2hpbGUgKGZpbGxTdGFydCA8IGZpbGxFbmQpIHtcbiAgICAgIG9iamVjdFtmaWxsU3RhcnRdID0gdmFsdWU7XG4gICAgICBmaWxsU3RhcnQrKztcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBmaW5kKHByZWRpY2F0ZSkge1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgIHJldHVybiBmaW5kSGVscGVyKHRoaXMsIHByZWRpY2F0ZSwgdGhpc0FyZyk7XG4gIH1cbiAgZnVuY3Rpb24gZmluZEluZGV4KHByZWRpY2F0ZSkge1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgIHJldHVybiBmaW5kSGVscGVyKHRoaXMsIHByZWRpY2F0ZSwgdGhpc0FyZywgdHJ1ZSk7XG4gIH1cbiAgZnVuY3Rpb24gZmluZEhlbHBlcihzZWxmLCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1syXTtcbiAgICB2YXIgcmV0dXJuSW5kZXggPSBhcmd1bWVudHNbM10gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzNdIDogZmFsc2U7XG4gICAgdmFyIG9iamVjdCA9IHRvT2JqZWN0KHNlbGYpO1xuICAgIHZhciBsZW4gPSB0b0xlbmd0aChvYmplY3QubGVuZ3RoKTtcbiAgICBpZiAoIWlzQ2FsbGFibGUocHJlZGljYXRlKSkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZSA9IG9iamVjdFtpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgb2JqZWN0KSkge1xuICAgICAgICByZXR1cm4gcmV0dXJuSW5kZXggPyBpIDogdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXR1cm5JbmRleCA/IC0xIDogdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsQXJyYXkoZ2xvYmFsKSB7XG4gICAgdmFyICRfXzUgPSBnbG9iYWwsXG4gICAgICAgIEFycmF5ID0gJF9fNS5BcnJheSxcbiAgICAgICAgT2JqZWN0ID0gJF9fNS5PYmplY3QsXG4gICAgICAgIFN5bWJvbCA9ICRfXzUuU3ltYm9sO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKEFycmF5LnByb3RvdHlwZSwgWydlbnRyaWVzJywgZW50cmllcywgJ2tleXMnLCBrZXlzLCAndmFsdWVzJywgdmFsdWVzLCAnZmlsbCcsIGZpbGwsICdmaW5kJywgZmluZCwgJ2ZpbmRJbmRleCcsIGZpbmRJbmRleF0pO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKEFycmF5LCBbJ2Zyb20nLCBmcm9tLCAnb2YnLCBvZl0pO1xuICAgIG1heWJlQWRkSXRlcmF0b3IoQXJyYXkucHJvdG90eXBlLCB2YWx1ZXMsIFN5bWJvbCk7XG4gICAgbWF5YmVBZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YoW10udmFsdWVzKCkpLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sIFN5bWJvbCk7XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbEFycmF5KTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgZnJvbSgpIHtcbiAgICAgIHJldHVybiBmcm9tO1xuICAgIH0sXG4gICAgZ2V0IG9mKCkge1xuICAgICAgcmV0dXJuIG9mO1xuICAgIH0sXG4gICAgZ2V0IGZpbGwoKSB7XG4gICAgICByZXR1cm4gZmlsbDtcbiAgICB9LFxuICAgIGdldCBmaW5kKCkge1xuICAgICAgcmV0dXJuIGZpbmQ7XG4gICAgfSxcbiAgICBnZXQgZmluZEluZGV4KCkge1xuICAgICAgcmV0dXJuIGZpbmRJbmRleDtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbEFycmF5KCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsQXJyYXk7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvQXJyYXkuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL09iamVjdC5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9PYmplY3QuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBtYXliZUFkZEZ1bmN0aW9ucyA9ICRfXzAubWF5YmVBZGRGdW5jdGlvbnMsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMC5yZWdpc3RlclBvbHlmaWxsO1xuICB2YXIgJF9fMSA9ICR0cmFjZXVyUnVudGltZSxcbiAgICAgIGRlZmluZVByb3BlcnR5ID0gJF9fMS5kZWZpbmVQcm9wZXJ0eSxcbiAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9ICRfXzEuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxuICAgICAgZ2V0T3duUHJvcGVydHlOYW1lcyA9ICRfXzEuZ2V0T3duUHJvcGVydHlOYW1lcyxcbiAgICAgIGlzUHJpdmF0ZU5hbWUgPSAkX18xLmlzUHJpdmF0ZU5hbWUsXG4gICAgICBrZXlzID0gJF9fMS5rZXlzO1xuICBmdW5jdGlvbiBpcyhsZWZ0LCByaWdodCkge1xuICAgIGlmIChsZWZ0ID09PSByaWdodClcbiAgICAgIHJldHVybiBsZWZ0ICE9PSAwIHx8IDEgLyBsZWZ0ID09PSAxIC8gcmlnaHQ7XG4gICAgcmV0dXJuIGxlZnQgIT09IGxlZnQgJiYgcmlnaHQgIT09IHJpZ2h0O1xuICB9XG4gIGZ1bmN0aW9uIGFzc2lnbih0YXJnZXQpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIHZhciBwcm9wcyA9IHNvdXJjZSA9PSBudWxsID8gW10gOiBrZXlzKHNvdXJjZSk7XG4gICAgICB2YXIgcCxcbiAgICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGg7XG4gICAgICBmb3IgKHAgPSAwOyBwIDwgbGVuZ3RoOyBwKyspIHtcbiAgICAgICAgdmFyIG5hbWUgPSBwcm9wc1twXTtcbiAgICAgICAgaWYgKGlzUHJpdmF0ZU5hbWUobmFtZSkpXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIHRhcmdldFtuYW1lXSA9IHNvdXJjZVtuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuICBmdW5jdGlvbiBtaXhpbih0YXJnZXQsIHNvdXJjZSkge1xuICAgIHZhciBwcm9wcyA9IGdldE93blByb3BlcnR5TmFtZXMoc291cmNlKTtcbiAgICB2YXIgcCxcbiAgICAgICAgZGVzY3JpcHRvcixcbiAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuICAgIGZvciAocCA9IDA7IHAgPCBsZW5ndGg7IHArKykge1xuICAgICAgdmFyIG5hbWUgPSBwcm9wc1twXTtcbiAgICAgIGlmIChpc1ByaXZhdGVOYW1lKG5hbWUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGRlc2NyaXB0b3IgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBwcm9wc1twXSk7XG4gICAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BzW3BdLCBkZXNjcmlwdG9yKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbE9iamVjdChnbG9iYWwpIHtcbiAgICB2YXIgT2JqZWN0ID0gZ2xvYmFsLk9iamVjdDtcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhPYmplY3QsIFsnYXNzaWduJywgYXNzaWduLCAnaXMnLCBpcywgJ21peGluJywgbWl4aW5dKTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsT2JqZWN0KTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgaXMoKSB7XG4gICAgICByZXR1cm4gaXM7XG4gICAgfSxcbiAgICBnZXQgYXNzaWduKCkge1xuICAgICAgcmV0dXJuIGFzc2lnbjtcbiAgICB9LFxuICAgIGdldCBtaXhpbigpIHtcbiAgICAgIHJldHVybiBtaXhpbjtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbE9iamVjdCgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbE9iamVjdDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9PYmplY3QuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL051bWJlci5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9OdW1iZXIuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBpc051bWJlciA9ICRfXzAuaXNOdW1iZXIsXG4gICAgICBtYXliZUFkZENvbnN0cyA9ICRfXzAubWF5YmVBZGRDb25zdHMsXG4gICAgICBtYXliZUFkZEZ1bmN0aW9ucyA9ICRfXzAubWF5YmVBZGRGdW5jdGlvbnMsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMC5yZWdpc3RlclBvbHlmaWxsLFxuICAgICAgdG9JbnRlZ2VyID0gJF9fMC50b0ludGVnZXI7XG4gIHZhciAkYWJzID0gTWF0aC5hYnM7XG4gIHZhciAkaXNGaW5pdGUgPSBpc0Zpbml0ZTtcbiAgdmFyICRpc05hTiA9IGlzTmFOO1xuICB2YXIgTUFYX1NBRkVfSU5URUdFUiA9IE1hdGgucG93KDIsIDUzKSAtIDE7XG4gIHZhciBNSU5fU0FGRV9JTlRFR0VSID0gLU1hdGgucG93KDIsIDUzKSArIDE7XG4gIHZhciBFUFNJTE9OID0gTWF0aC5wb3coMiwgLTUyKTtcbiAgZnVuY3Rpb24gTnVtYmVySXNGaW5pdGUobnVtYmVyKSB7XG4gICAgcmV0dXJuIGlzTnVtYmVyKG51bWJlcikgJiYgJGlzRmluaXRlKG51bWJlcik7XG4gIH1cbiAgO1xuICBmdW5jdGlvbiBpc0ludGVnZXIobnVtYmVyKSB7XG4gICAgcmV0dXJuIE51bWJlcklzRmluaXRlKG51bWJlcikgJiYgdG9JbnRlZ2VyKG51bWJlcikgPT09IG51bWJlcjtcbiAgfVxuICBmdW5jdGlvbiBOdW1iZXJJc05hTihudW1iZXIpIHtcbiAgICByZXR1cm4gaXNOdW1iZXIobnVtYmVyKSAmJiAkaXNOYU4obnVtYmVyKTtcbiAgfVxuICA7XG4gIGZ1bmN0aW9uIGlzU2FmZUludGVnZXIobnVtYmVyKSB7XG4gICAgaWYgKE51bWJlcklzRmluaXRlKG51bWJlcikpIHtcbiAgICAgIHZhciBpbnRlZ3JhbCA9IHRvSW50ZWdlcihudW1iZXIpO1xuICAgICAgaWYgKGludGVncmFsID09PSBudW1iZXIpXG4gICAgICAgIHJldHVybiAkYWJzKGludGVncmFsKSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxOdW1iZXIoZ2xvYmFsKSB7XG4gICAgdmFyIE51bWJlciA9IGdsb2JhbC5OdW1iZXI7XG4gICAgbWF5YmVBZGRDb25zdHMoTnVtYmVyLCBbJ01BWF9TQUZFX0lOVEVHRVInLCBNQVhfU0FGRV9JTlRFR0VSLCAnTUlOX1NBRkVfSU5URUdFUicsIE1JTl9TQUZFX0lOVEVHRVIsICdFUFNJTE9OJywgRVBTSUxPTl0pO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKE51bWJlciwgWydpc0Zpbml0ZScsIE51bWJlcklzRmluaXRlLCAnaXNJbnRlZ2VyJywgaXNJbnRlZ2VyLCAnaXNOYU4nLCBOdW1iZXJJc05hTiwgJ2lzU2FmZUludGVnZXInLCBpc1NhZmVJbnRlZ2VyXSk7XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbE51bWJlcik7XG4gIHJldHVybiB7XG4gICAgZ2V0IE1BWF9TQUZFX0lOVEVHRVIoKSB7XG4gICAgICByZXR1cm4gTUFYX1NBRkVfSU5URUdFUjtcbiAgICB9LFxuICAgIGdldCBNSU5fU0FGRV9JTlRFR0VSKCkge1xuICAgICAgcmV0dXJuIE1JTl9TQUZFX0lOVEVHRVI7XG4gICAgfSxcbiAgICBnZXQgRVBTSUxPTigpIHtcbiAgICAgIHJldHVybiBFUFNJTE9OO1xuICAgIH0sXG4gICAgZ2V0IGlzRmluaXRlKCkge1xuICAgICAgcmV0dXJuIE51bWJlcklzRmluaXRlO1xuICAgIH0sXG4gICAgZ2V0IGlzSW50ZWdlcigpIHtcbiAgICAgIHJldHVybiBpc0ludGVnZXI7XG4gICAgfSxcbiAgICBnZXQgaXNOYU4oKSB7XG4gICAgICByZXR1cm4gTnVtYmVySXNOYU47XG4gICAgfSxcbiAgICBnZXQgaXNTYWZlSW50ZWdlcigpIHtcbiAgICAgIHJldHVybiBpc1NhZmVJbnRlZ2VyO1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsTnVtYmVyKCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsTnVtYmVyO1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL051bWJlci5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvcG9seWZpbGxzLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3BvbHlmaWxscy5qc1wiO1xuICB2YXIgcG9seWZpbGxBbGwgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIikucG9seWZpbGxBbGw7XG4gIHBvbHlmaWxsQWxsKFJlZmxlY3QuZ2xvYmFsKTtcbiAgdmFyIHNldHVwR2xvYmFscyA9ICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHM7XG4gICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHMgPSBmdW5jdGlvbihnbG9iYWwpIHtcbiAgICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgICBwb2x5ZmlsbEFsbChnbG9iYWwpO1xuICB9O1xuICByZXR1cm4ge307XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9wb2x5ZmlsbHMuanNcIiArICcnKTtcbiJdfQ==
},{"_process":2,"path":1}],4:[function(require,module,exports){
"use strict";
var psiTurk = require('./psiturk');
var setupTrainings = require('./specific/items_t');
var setupTrials = require('./specific/items');
var Questionnaire = require('./specific/ending');
var Experiment = function Experiment() {
  this.count = 0;
  this.trialData = [];
  this.allTrainings = setupTrainings();
  this.switch = true;
  this.allTrials = setupTrials();
};
($traceurRuntime.createClass)(Experiment, {
  next: function() {
    if (this.count < this.allTrainings.length) {
      this.trial = this.allTrainings[this.count];
      this.trialnumber = this.count + 1;
      this.insertLines(this.trial);
      this.trialData.splice(0, 0, this.trialnumber, this.trial.kind, this.trial.option, this.trial.shortExpression, this.trial.color, this.trial.scenario, this.trial.qud, this.trial.value);
      this.start = +new Date();
      this.count++;
    } else if (this.count - this.allTrainings.length < this.allTrials.length) {
      if (this.switch) {
        this.switch = false;
        psiTurk.showPage('congratulations.html');
        $('#nextCongrats').on('click', _.bind(this.save, this));
      } else {
        psiTurk.showPage('item.html');
        $('#nextMessage').on('click', _.bind(this.save, this));
        this.trial = this.allTrials[this.count - this.allTrainings.length];
        this.trialnumber = this.count + 1;
        this.insertLines(this.trial);
        this.trialData.splice(0, 0, this.trialnumber, this.trial.kind, this.trial.option, this.trial.shortExpression, this.trial.color, this.trial.scenario, this.trial.qud, this.trial.value);
        this.start = +new Date();
        this.count++;
      }
    } else
      new Questionnaire().start();
  },
  insertLines: function(t) {
    $('#senderpic').html(t.senderpic);
    $('#qudPic').html(t.qudPic);
    $('#urnPic').html(t.urnPic);
    $('#answerPic').html(t.answerPic);
    $('#description').html(t.description);
    $('#message').html(t.message);
    $('#question').html(t.question);
    $('#polarbutton').html(t.polarbutton);
    $('#betbutton').html(t.betbutton);
    $('#percentage').text(Math.floor(t.percentage));
  },
  save: function(e) {
    e.preventDefault();
    var RT = +new Date() - this.start;
    var input_qud = document.getElementById('nextQud').value;
    var input_bet = document.getElementById('nextBet').value;
    if (document.getElementById('nextCongrats') !== null) {
      var input_congrats = document.getElementById('nextCongrats').value;
    } else {
      var input_congrats = '';
    }
    var input_message = document.getElementById('nextMessage').value;
    if (input_congrats == 'placeholder') {
      this.trialData = [];
      this.next();
    } else {
      this.trialData = this.trialData.concat(input_qud, input_bet, input_message, RT);
      psiTurk.recordTrialData(this.trialData);
      this.trialData = [];
      document.getElementById('nextQud').value = "dots";
      document.getElementById('nextBet').value = "dots";
      document.getElementById('nextMessage').value = "dots";
      this.next();
    }
  },
  start: function() {
    psiTurk.showPage('item_t.html');
    $('#nextBet').on('click', _.bind(this.save, this));
    this.next();
  }
}, {});
module.exports = Experiment;


//# sourceURL=/home/michele/Desktop/experiments/js4-fullpower/static/js/experiment.js
},{"./psiturk":5,"./specific/ending":6,"./specific/items":7,"./specific/items_t":8}],5:[function(require,module,exports){
"use strict";
module.exports = new PsiTurk(uniqueId, adServerLoc, mode);


//# sourceURL=/home/michele/Desktop/experiments/js4-fullpower/static/js/psiturk.js
},{}],6:[function(require,module,exports){
"use strict";
var psiTurk = require('../psiturk');
var Questionnaire = function Questionnaire() {};
($traceurRuntime.createClass)(Questionnaire, {
  save_data: function(language) {
    var comments = $('#comment').val();
    psiTurk.recordTrialData({
      'phase': 'postquestionnaire',
      'status': 'submit'
    });
    psiTurk.recordTrialData([language]);
    psiTurk.recordTrialData([comments]);
    psiTurk.recordUnstructuredData('language', language);
    psiTurk.recordUnstructuredData('comments', comments);
    $('select').each(function(i, val) {
      psiTurk.recordTrialData([this.value]);
    });
  },
  record_responses: function() {
    var language = $('#language').val();
    this.LANGUAGE = false;
    $('select').each(function(i, val) {
      psiTurk.recordUnstructuredData(this.id, this.value);
    });
    if (language === '') {
      alert('Please indicate your native language.');
      $('#language').focus();
      return false;
    } else {
      this.LANGUAGE = true;
      this.save_data(language);
    }
  },
  prompt_resubmit: function() {
    var error = ["<h1>Oops!</h1><p>Something went wrong submitting your HIT.", "This might happen if you lose your internet connection.", "Press the button to resubmit.</p><button id='resubmit'>Resubmit</button>"].join(' ');
    $('body').html(error);
    $('#resubmit').on('click', _.bind(this.resubmit, this));
  },
  resubmit: function() {
    $('body').html('<h1>Trying to resubmit...</h1>');
    var reprompt = setTimeout(_.bind(this.prompt_resubmit, this), 10000);
    if (!this.LANGUAGE)
      this.save_data('NA');
    var self = this;
    psiTurk.saveData({
      success: (function() {
        clearInterval(reprompt);
        psiTurk.completeHIT();
      }),
      error: _.bind(this.prompt_resubmit, this)
    });
  },
  start: function() {
    var $__0 = this;
    psiTurk.showPage('postquestionnaire.html');
    psiTurk.recordTrialData({
      'phase': 'postquestionnaire',
      'status': 'begin'
    });
    $('#next').on('click', (function() {
      $__0.record_responses();
      psiTurk.saveData({
        success: psiTurk.completeHIT,
        error: _.bind($__0.prompt_resubmit, $__0)
      });
    }));
  }
}, {});
module.exports = Questionnaire;


//# sourceURL=/home/michele/Desktop/experiments/js4-fullpower/static/js/specific/ending.js
},{"../psiturk":5}],7:[function(require,module,exports){
"use strict";
function setupTrials() {
  var conditions = _.shuffle(['control', 'control', 'control', 'control', ['dual', 'polar', 3], ['dual', 'polar', 4], ['dual', 'polar', 5], ['dual', 'wh', 3], ['dual', 'wh', 4], ['dual', 'wh', 5], ['plural', 'wh', 3], ['plural', 'wh', 4], ['plural', 'wh', 5], ['plural', 'polar', 3], ['plural', 'polar', 4], ['plural', 'polar', 5]]);
  var scenarios = ['dual', 'plural'];
  var quds = ['polar', 'wh'];
  var controls = _.shuffle([0, 0, 10, 10]);
  var colors = ['red', 'blue', 'white', 'black'];
  var howmany = conditions.length;
  var qudPic = "<img id='qPic' src='/static/images/{Q}-{C}.png'>";
  var urnPic = "<img id='uPic' src='/static/images/{S}-{C}-{V}.png' align='bottom'>";
  var answerPic = "<img id='aPic' src='/static/images/{E}-{C}.png'>";
  var question = {
    'polar': "The receiver asks: <b>will the ball be {C}?</b>",
    'wh': "The receiver asks: <b>which color will the ball be?</b>"
  };
  var res = _.map(_.range(0, howmany), (function(w) {
    var trial = {};
    trial.kind = "trial";
    trial.color = colors[Math.floor(Math.random() * 4)];
    trial.condition = conditions.shift();
    if (trial.condition == 'control') {
      trial.control = true;
      trial.value = controls.shift();
      trial.qud = quds[Math.floor(Math.random() * 2)];
      trial.scenario = scenarios[Math.floor(Math.random() * 2)];
    } else {
      trial.control = false;
      trial.qud = trial.condition[1];
      trial.scenario = trial.condition[0];
      trial.value = trial.condition[2];
    }
    trial.question = question[trial.qud];
    if (trial.qud == 'polar') {
      trial.question = trial.question.replace('{C}', trial.color);
    }
    if (trial.qud == 'polar') {
      trial.qudPic = qudPic.replace('{Q}', trial.qud).replace('{C}', trial.color);
    } else {
      trial.qudPic = qudPic.replace('{Q}', trial.qud).replace('{C}', 'dots');
    }
    ;
    trial.urnPic = urnPic.replace('{S}', trial.scenario).replace('{C}', trial.color).replace('{V}', trial.value);
    trial.answerPic = answerPic.replace('{E}', 'dots').replace('{C}', trial.color);
    trial.v = w;
    trial.percentage = (100 * trial.v) / howmany;
    trial.shortExpression = "nomatter";
    trial.option = "nomatter";
    return trial;
  }));
  console.log(res);
  return res;
}
module.exports = setupTrials;


//# sourceURL=/home/michele/Desktop/experiments/js4-fullpower/static/js/specific/items.js
},{}],8:[function(require,module,exports){
"use strict";
function setupTrainings() {
  var options = _.shuffle(['singlebet', 'multibet', 'singlebet', 'multibet']);
  var colors = ['red', 'black'];
  var expressions = _.shuffle(['certNot', 'probNot', 'prob', 'cert']);
  var howmany = 3;
  var description = {
    'singlebet': "You can bet on <b><font color='{C1}'>{C2}</font></b> or don't bet at all.",
    'multibet': "You can bet on <b><font color='black'>black</font></b> or <b><font color='blue'>blue</font></b> or <b><font color='red'>red</font></b> or <span style='background-color:black;'><b><font color='white'>white</style></font></b></span> or don't bet at all."
  };
  var message = "The sender says: <b>the ball will {E} be {C1}</b>";
  var longExpressions = {
    'certNot': 'certainly not',
    'probNot': 'probably not',
    'prob': 'probably',
    'cert': 'certainly'
  };
  var senderpic = "<img id='imgComic1' src='/static/images/{E}_{C}_sender.png'>";
  var polarbutton = '<button type="button" id="polar" value="{C1}" class="btn btn-primary btn-lg" onclick="report0(this.value)"> will it be {C2}?</button>';
  var betbuttons = {
    'singlebet': '<button type="button" id="{C1}" value="{C2}" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="{C3}">{C4}</font></b></button>',
    'multibet': '<button type="button" id="black" value="black" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="black">black</font></b></button>' + ' ' + '<button type="button" id="blue" value="blue" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="blue">blue</font><b/></button>' + ' ' + '<button type="button" id="red" value="red" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="red">red</font></b></button>' + ' ' + '<button type="button" id="white" value="white" class="btn btn-primary btn-lg" onclick="report(this.value)">bet on <b><font color="white">white</font></b></button>'
  };
  var res = _.map(_.range(0, howmany), (function(w) {
    var trial = {};
    trial.kind = "training";
    trial.option = options.shift();
    trial.color = colors[Math.floor(Math.random() * 2)];
    trial.description = description[trial.option];
    if (trial.option == "singlebet") {
      trial.description = trial.description.replace('{C1}', trial.color).replace('{C2}', trial.color);
    }
    ;
    trial.polarbutton = polarbutton.replace('{C1}', trial.color).replace('{C2}', trial.color);
    trial.shortExpression = expressions.shift();
    trial.expression = longExpressions[trial.shortExpression];
    trial.message = message.replace('{E}', trial.expression).replace('{C1}', trial.color);
    trial.betbutton = betbuttons[trial.option];
    if (trial.option == "singlebet") {
      trial.betbutton = trial.betbutton.replace('{C1}', trial.color).replace('{C2}', trial.color).replace('{C3}', trial.color).replace('{C4}', trial.color);
    }
    ;
    trial.senderpic = senderpic.replace('{E}', trial.shortExpression).replace('{C}', trial.color);
    trial.v = w;
    trial.percentage = (100 * trial.v) / howmany;
    trial.qud = "nomatter";
    trial.scenario = "nomatter";
    trial.value = "nomatter";
    return trial;
  }));
  console.log(res);
  return res;
}
module.exports = setupTrainings;


//# sourceURL=/home/michele/Desktop/experiments/js4-fullpower/static/js/specific/items_t.js
},{}],9:[function(require,module,exports){
"use strict";
var psiTurk = require('./psiturk');
var Experiment = require('./experiment');
var pages = ["instructions/instruction.html", "instructions/instruction0.html", "instructions/instruction1.html", "congratulations.html", "item_t.html", "item.html", "postquestionnaire.html"];
var instructionPages = ["instructions/instruction.html", "instructions/instruction0.html", "instructions/instruction1.html"];
psiTurk.preloadPages(pages);
var currentview;
var exp = new Experiment();
$(window).load((function() {
  psiTurk.doInstructions(instructionPages, function() {
    currentview = exp.start();
  });
}));


//# sourceURL=/home/michele/Desktop/experiments/js4-fullpower/static/js/task.js
},{"./experiment":4,"./psiturk":5}]},{},[3,9])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcGF0aC1icm93c2VyaWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy90cmFjZXVyL2Jpbi90cmFjZXVyLXJ1bnRpbWUuanMiLCIvaG9tZS9taWNoZWxlL0Rlc2t0b3AvZXhwZXJpbWVudHMvanM0LWZ1bGxwb3dlci9zdGF0aWMvanMvZXhwZXJpbWVudC5qcyIsIi9ob21lL21pY2hlbGUvRGVza3RvcC9leHBlcmltZW50cy9qczQtZnVsbHBvd2VyL3N0YXRpYy9qcy9wc2l0dXJrLmpzIiwiL2hvbWUvbWljaGVsZS9EZXNrdG9wL2V4cGVyaW1lbnRzL2pzNC1mdWxscG93ZXIvc3RhdGljL2pzL3NwZWNpZmljL2VuZGluZy5qcyIsIi9ob21lL21pY2hlbGUvRGVza3RvcC9leHBlcmltZW50cy9qczQtZnVsbHBvd2VyL3N0YXRpYy9qcy9zcGVjaWZpYy9pdGVtcy5qcyIsIi9ob21lL21pY2hlbGUvRGVza3RvcC9leHBlcmltZW50cy9qczQtZnVsbHBvd2VyL3N0YXRpYy9qcy9zcGVjaWZpYy9pdGVtc190LmpzIiwiL2hvbWUvbWljaGVsZS9EZXNrdG9wL2V4cGVyaW1lbnRzL2pzNC1mdWxscG93ZXIvc3RhdGljL2pzL3Rhc2suanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbk9BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeGdGQTtBQUFBLEFBQUksRUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFdBQVUsQ0FBQyxDQUFDO0FBQ2xDLEFBQUksRUFBQSxDQUFBLGNBQWEsRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLG9CQUFtQixDQUFDLENBQUM7QUFDbEQsQUFBSSxFQUFBLENBQUEsV0FBVSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsa0JBQWlCLENBQUMsQ0FBQztBQUM3QyxBQUFJLEVBQUEsQ0FBQSxhQUFZLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxtQkFBa0IsQ0FBQyxDQUFDO0FBSGhELEFBQUksRUFBQSxhQUtKLFNBQU0sV0FBUyxDQUVGLEFBQUMsQ0FBRTtBQUNaLEtBQUcsTUFBTSxFQUFJLEVBQUEsQ0FBQztBQUNkLEtBQUcsVUFBVSxFQUFJLEdBQUMsQ0FBQztBQUNuQixLQUFHLGFBQWEsRUFBSSxDQUFBLGNBQWEsQUFBQyxFQUFDLENBQUM7QUFDcEMsS0FBRyxPQUFPLEVBQUUsS0FBRyxDQUFDO0FBQ2hCLEtBQUcsVUFBVSxFQUFJLENBQUEsV0FBVSxBQUFDLEVBQUMsQ0FBQztBQUNoQyxBQWJzQyxDQUFBO0FBQXhDLEFBQUMsZUFBYyxZQUFZLENBQUMsQUFBQztBQWUzQixLQUFHLENBQUgsVUFBSSxBQUFDLENBQUU7QUFDTCxPQUFJLElBQUcsTUFBTSxFQUFJLENBQUEsSUFBRyxhQUFhLE9BQU8sQ0FBRztBQUNyQyxTQUFHLE1BQU0sRUFBSSxDQUFBLElBQUcsYUFBYSxDQUFFLElBQUcsTUFBTSxDQUFDLENBQUM7QUFDMUMsU0FBRyxZQUFZLEVBQUksQ0FBQSxJQUFHLE1BQU0sRUFBRSxFQUFBLENBQUM7QUFDL0IsU0FBRyxZQUFZLEFBQUMsQ0FBQyxJQUFHLE1BQU0sQ0FBQyxDQUFDO0FBQzVCLFNBQUcsVUFBVSxPQUFPLEFBQUMsQ0FBQyxDQUFBLENBQUcsRUFBQSxDQUFHLENBQUEsSUFBRyxZQUFZLENBQUcsQ0FBQSxJQUFHLE1BQU0sS0FBSyxDQUFHLENBQUEsSUFBRyxNQUFNLE9BQU8sQ0FBRyxDQUFBLElBQUcsTUFBTSxnQkFBZ0IsQ0FBRyxDQUFBLElBQUcsTUFBTSxNQUFNLENBQUcsQ0FBQSxJQUFHLE1BQU0sU0FBUyxDQUFHLENBQUEsSUFBRyxNQUFNLElBQUksQ0FBRyxDQUFBLElBQUcsTUFBTSxNQUFNLENBQUMsQ0FBQztBQUN0TCxTQUFHLE1BQU0sRUFBSSxFQUFFLEdBQUksS0FBRyxBQUFDLEVBQUMsQ0FBQztBQUN6QixTQUFHLE1BQU0sRUFBRSxDQUFDO0lBQ2xCLEtBQ0ssS0FBSSxJQUFHLE1BQU0sRUFBRSxDQUFBLElBQUcsYUFBYSxPQUFPLENBQUEsQ0FBSSxDQUFBLElBQUcsVUFBVSxPQUFPLENBQUc7QUFDbEUsU0FBSSxJQUFHLE9BQU8sQ0FBRztBQUNmLFdBQUcsT0FBTyxFQUFFLE1BQUksQ0FBQztBQUNqQixjQUFNLFNBQVMsQUFBQyxDQUFDLHNCQUFxQixDQUFDLENBQUM7QUFDeEMsUUFBQSxBQUFDLENBQUMsZUFBYyxDQUFDLEdBQUcsQUFBQyxDQUFDLE9BQU0sQ0FBRyxDQUFBLENBQUEsS0FBSyxBQUFDLENBQUMsSUFBRyxLQUFLLENBQUcsS0FBRyxDQUFDLENBQUMsQ0FBQztNQUN6RCxLQUNLO0FBQ0gsY0FBTSxTQUFTLEFBQUMsQ0FBQyxXQUFVLENBQUMsQ0FBQztBQUM3QixRQUFBLEFBQUMsQ0FBQyxjQUFhLENBQUMsR0FBRyxBQUFDLENBQUMsT0FBTSxDQUFHLENBQUEsQ0FBQSxLQUFLLEFBQUMsQ0FBQyxJQUFHLEtBQUssQ0FBRyxLQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ3RELFdBQUcsTUFBTSxFQUFJLENBQUEsSUFBRyxVQUFVLENBQUUsSUFBRyxNQUFNLEVBQUUsQ0FBQSxJQUFHLGFBQWEsT0FBTyxDQUFDLENBQUM7QUFDaEUsV0FBRyxZQUFZLEVBQUksQ0FBQSxJQUFHLE1BQU0sRUFBRSxFQUFBLENBQUM7QUFDL0IsV0FBRyxZQUFZLEFBQUMsQ0FBQyxJQUFHLE1BQU0sQ0FBQyxDQUFDO0FBQzVCLFdBQUcsVUFBVSxPQUFPLEFBQUMsQ0FBQyxDQUFBLENBQUcsRUFBQSxDQUFHLENBQUEsSUFBRyxZQUFZLENBQUcsQ0FBQSxJQUFHLE1BQU0sS0FBSyxDQUFHLENBQUEsSUFBRyxNQUFNLE9BQU8sQ0FBRyxDQUFBLElBQUcsTUFBTSxnQkFBZ0IsQ0FBRyxDQUFBLElBQUcsTUFBTSxNQUFNLENBQUcsQ0FBQSxJQUFHLE1BQU0sU0FBUyxDQUFHLENBQUEsSUFBRyxNQUFNLElBQUksQ0FBRyxDQUFBLElBQUcsTUFBTSxNQUFNLENBQUMsQ0FBQztBQUN0TCxXQUFHLE1BQU0sRUFBSSxFQUFFLEdBQUksS0FBRyxBQUFDLEVBQUMsQ0FBQztBQUN6QixXQUFHLE1BQU0sRUFBRSxDQUFDO01BQ2Q7QUFBQSxJQUNKO0FBRUksUUFBSSxjQUFZLEFBQUMsRUFBQyxNQUFNLEFBQUMsRUFBQyxDQUFDO0FBQUEsRUFDakM7QUFFQSxZQUFVLENBQVYsVUFBWSxDQUFBLENBQUc7QUFFYixJQUFBLEFBQUMsQ0FBQyxZQUFXLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxVQUFVLENBQUMsQ0FBQztBQUNqQyxJQUFBLEFBQUMsQ0FBQyxTQUFRLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUMsQ0FBQztBQUMzQixJQUFBLEFBQUMsQ0FBQyxTQUFRLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUMsQ0FBQztBQUMzQixJQUFBLEFBQUMsQ0FBQyxZQUFXLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxVQUFVLENBQUMsQ0FBQztBQUNqQyxJQUFBLEFBQUMsQ0FBQyxjQUFhLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxZQUFZLENBQUMsQ0FBQztBQUNyQyxJQUFBLEFBQUMsQ0FBQyxVQUFTLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxRQUFRLENBQUMsQ0FBQztBQUM3QixJQUFBLEFBQUMsQ0FBQyxXQUFVLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxTQUFTLENBQUMsQ0FBQztBQUMvQixJQUFBLEFBQUMsQ0FBQyxjQUFhLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxZQUFZLENBQUMsQ0FBQztBQUNyQyxJQUFBLEFBQUMsQ0FBQyxZQUFXLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxVQUFVLENBQUMsQ0FBQztBQUNqQyxJQUFBLEFBQUMsQ0FBQyxhQUFZLENBQUMsS0FBSyxBQUFDLENBQUMsSUFBRyxNQUFNLEFBQUMsQ0FBQyxDQUFBLFdBQVcsQ0FBQyxDQUFDLENBQUM7RUFFakQ7QUFHRCxLQUFHLENBQUgsVUFBSyxDQUFBLENBQUc7QUFDTCxJQUFBLGVBQWUsQUFBQyxFQUFDLENBQUM7QUFDckIsQUFBSSxNQUFBLENBQUEsRUFBQyxFQUFJLENBQUEsQ0FBRSxHQUFJLEtBQUcsQUFBQyxFQUFDLENBQUEsQ0FBSSxDQUFBLElBQUcsTUFBTSxDQUFDO0FBQy9CLEFBQUksTUFBQSxDQUFBLFNBQVEsRUFBSSxDQUFBLFFBQU8sZUFBZSxBQUFDLENBQUMsU0FBUSxDQUFDLE1BQU0sQ0FBQztBQUN4RCxBQUFJLE1BQUEsQ0FBQSxTQUFRLEVBQUksQ0FBQSxRQUFPLGVBQWUsQUFBQyxDQUFDLFNBQVEsQ0FBQyxNQUFNLENBQUM7QUFDeEQsT0FBSSxRQUFPLGVBQWUsQUFBQyxDQUFDLGNBQWEsQ0FBQyxDQUFBLEdBQUksS0FBRyxDQUFHO0FBQ2hELEFBQUksUUFBQSxDQUFBLGNBQWEsRUFBRSxDQUFBLFFBQU8sZUFBZSxBQUFDLENBQUMsY0FBYSxDQUFDLE1BQU0sQ0FBQTtJQUMvRCxLQUFPO0FBQ1AsQUFBSSxRQUFBLENBQUEsY0FBYSxFQUFFLEdBQUMsQ0FBQztJQUNyQjtBQUFBLEFBQ0EsTUFBQSxDQUFBLGFBQVksRUFBSSxDQUFBLFFBQU8sZUFBZSxBQUFDLENBQUMsYUFBWSxDQUFDLE1BQU0sQ0FBQztBQUVoRSxPQUFJLGNBQWEsR0FBRyxjQUFZLENBQUU7QUFDN0IsU0FBRyxVQUFVLEVBQUksR0FBQyxDQUFDO0FBQ25CLFNBQUcsS0FBSyxBQUFDLEVBQUMsQ0FBQztJQUNmLEtBQ0s7QUFDRixTQUFHLFVBQVUsRUFBSSxDQUFBLElBQUcsVUFBVSxPQUFPLEFBQUMsQ0FBQyxTQUFRLENBQUUsVUFBUSxDQUFFLGNBQVksQ0FBRyxHQUFDLENBQUMsQ0FBQztBQUM3RSxZQUFNLGdCQUFnQixBQUFDLENBQUMsSUFBRyxVQUFVLENBQUMsQ0FBQztBQUV2QyxTQUFHLFVBQVUsRUFBSSxHQUFDLENBQUM7QUFDbEIsYUFBTyxlQUFlLEFBQUMsQ0FBQyxTQUFRLENBQUMsTUFBTSxFQUFFLE9BQUssQ0FBQTtBQUM5QyxhQUFPLGVBQWUsQUFBQyxDQUFDLFNBQVEsQ0FBQyxNQUFNLEVBQUUsT0FBSyxDQUFBO0FBQzlDLGFBQU8sZUFBZSxBQUFDLENBQUMsYUFBWSxDQUFDLE1BQU0sRUFBRSxPQUFLLENBQUE7QUFDbkQsU0FBRyxLQUFLLEFBQUMsRUFBQyxDQUFDO0lBQ2Q7QUFBQSxFQUNIO0FBSUEsTUFBSSxDQUFKLFVBQUssQUFBQyxDQUFFO0FBQ04sVUFBTSxTQUFTLEFBQUMsQ0FBQyxhQUFZLENBQUMsQ0FBQztBQUMvQixJQUFBLEFBQUMsQ0FBQyxVQUFTLENBQUMsR0FBRyxBQUFDLENBQUMsT0FBTSxDQUFHLENBQUEsQ0FBQSxLQUFLLEFBQUMsQ0FBQyxJQUFHLEtBQUssQ0FBRyxLQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2xELE9BQUcsS0FBSyxBQUFDLEVBQUMsQ0FBQztFQUNiO0FBQUEsS0EvRm1GO0FBa0dyRixLQUFLLFFBQVEsRUFBSSxXQUFTLENBQUM7QUFDM0I7Ozs7QUNuR0E7QUFBQSxLQUFLLFFBQVEsRUFBSSxJQUFJLFFBQU0sQUFBQyxDQUFDLFFBQU8sQ0FBRyxZQUFVLENBQUcsS0FBRyxDQUFDLENBQUM7QUFDekQ7Ozs7QUNEQTtBQUFBLEFBQUksRUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFlBQVcsQ0FBQyxDQUFDO0FBQW5DLEFBQUksRUFBQSxnQkFHSixTQUFNLGNBQVksS0FzRWxCLEFBekV3QyxDQUFBO0FBQXhDLEFBQUMsZUFBYyxZQUFZLENBQUMsQUFBQztBQUszQixVQUFRLENBQVIsVUFBVSxRQUFPLENBQUc7QUFDckIsQUFBSSxNQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsQ0FBQSxBQUFDLENBQUMsVUFBUyxDQUFDLElBQUksQUFBQyxFQUFDLENBQUM7QUFDL0IsVUFBTSxnQkFBZ0IsQUFBQyxDQUFDO0FBQUMsWUFBTSxDQUFFLG9CQUFrQjtBQUFHLGFBQU8sQ0FBRSxTQUFPO0FBQUEsSUFBQyxDQUFDLENBQUM7QUFDekUsVUFBTSxnQkFBZ0IsQUFBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQztBQUN0QyxVQUFNLGdCQUFnQixBQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLFVBQU0sdUJBQXVCLEFBQUMsQ0FBQyxVQUFTLENBQUcsU0FBTyxDQUFDLENBQUM7QUFDcEQsVUFBTSx1QkFBdUIsQUFBQyxDQUFDLFVBQVMsQ0FBRyxTQUFPLENBQUMsQ0FBQztBQUV2RCxJQUFBLEFBQUMsQ0FBQyxRQUFPLENBQUMsS0FBSyxBQUFDLENBQUMsU0FBUyxDQUFBLENBQUcsQ0FBQSxHQUFFLENBQUc7QUFDN0IsWUFBTSxnQkFBZ0IsQUFBQyxDQUFDLENBQUMsSUFBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQztFQUNKO0FBRUEsaUJBQWUsQ0FBZixVQUFnQixBQUFDLENBQUU7QUFFakIsQUFBSSxNQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsQ0FBQSxBQUFDLENBQUMsV0FBVSxDQUFDLElBQUksQUFBQyxFQUFDLENBQUM7QUFDbkMsT0FBRyxTQUFTLEVBQUksTUFBSSxDQUFDO0FBRXJCLElBQUEsQUFBQyxDQUFDLFFBQU8sQ0FBQyxLQUFLLEFBQUMsQ0FBQyxTQUFTLENBQUEsQ0FBRyxDQUFBLEdBQUUsQ0FBRztBQUNoQyxZQUFNLHVCQUF1QixBQUFDLENBQUMsSUFBRyxHQUFHLENBQUcsQ0FBQSxJQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ3JELENBQUMsQ0FBQztBQUVGLE9BQUksUUFBTyxJQUFNLEdBQUMsQ0FBRztBQUNuQixVQUFJLEFBQUMsQ0FBQyx1Q0FBc0MsQ0FBQyxDQUFDO0FBQzlDLE1BQUEsQUFBQyxDQUFDLFdBQVUsQ0FBQyxNQUFNLEFBQUMsRUFBQyxDQUFDO0FBQ3RCLFdBQU8sTUFBSSxDQUFDO0lBQ2QsS0FBTztBQUNILFNBQUcsU0FBUyxFQUFJLEtBQUcsQ0FBQztBQUNwQixTQUFHLFVBQVUsQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDO0lBQzVCO0FBQUEsRUFDRjtBQUVBLGdCQUFjLENBQWQsVUFBZSxBQUFDLENBQUU7QUFDaEIsQUFBSSxNQUFBLENBQUEsS0FBSSxFQUFJLENBQUEsQ0FBQyw0REFBMkQsQ0FDM0QsMERBQXdELENBQ3hELDJFQUF5RSxDQUFDLEtBQUssQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO0FBQ2xHLElBQUEsQUFBQyxDQUFDLE1BQUssQ0FBQyxLQUFLLEFBQUMsQ0FBQyxLQUFJLENBQUMsQ0FBQztBQUNyQixJQUFBLEFBQUMsQ0FBQyxXQUFVLENBQUMsR0FBRyxBQUFDLENBQUMsT0FBTSxDQUFHLENBQUEsQ0FBQSxLQUFLLEFBQUMsQ0FBQyxJQUFHLFNBQVMsQ0FBRyxLQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3pEO0FBRUEsU0FBTyxDQUFQLFVBQVEsQUFBQztBQUNQLElBQUEsQUFBQyxDQUFDLE1BQUssQ0FBQyxLQUFLLEFBQUMsQ0FBQyxnQ0FBK0IsQ0FBQyxDQUFDO0FBQ2hELEFBQUksTUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLFVBQVMsQUFBQyxDQUFDLENBQUEsS0FBSyxBQUFDLENBQUMsSUFBRyxnQkFBZ0IsQ0FBRyxLQUFHLENBQUMsQ0FBRyxNQUFJLENBQUMsQ0FBQztBQUNwRSxPQUFJLENBQUMsSUFBRyxTQUFTO0FBQUcsU0FBRyxVQUFVLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQztBQUFBLEFBRXBDLE1BQUEsQ0FBQSxJQUFHLEVBQUksS0FBRyxDQUFDO0FBQ2YsVUFBTSxTQUFTLEFBQUMsQ0FBQztBQUNmLFlBQU0sR0FBRyxTQUFBLEFBQUMsQ0FBSztBQUNiLG9CQUFZLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQztBQUN2QixjQUFNLFlBQVksQUFBQyxFQUFDLENBQUM7TUFDdkIsQ0FBQTtBQUNBLFVBQUksQ0FBRyxDQUFBLENBQUEsS0FBSyxBQUFDLENBQUMsSUFBRyxnQkFBZ0IsQ0FBRyxLQUFHLENBQUM7QUFBQSxJQUMxQyxDQUFDLENBQUM7RUFDSjtBQUVBLE1BQUksQ0FBSixVQUFLLEFBQUM7O0FBRUosVUFBTSxTQUFTLEFBQUMsQ0FBQyx3QkFBdUIsQ0FBQyxDQUFDO0FBQzFDLFVBQU0sZ0JBQWdCLEFBQUMsQ0FBQztBQUFDLFlBQU0sQ0FBRSxvQkFBa0I7QUFBRyxhQUFPLENBQUUsUUFBTTtBQUFBLElBQUMsQ0FBQyxDQUFDO0FBRXhFLElBQUEsQUFBQyxDQUFDLE9BQU0sQ0FBQyxHQUFHLEFBQUMsQ0FBQyxPQUFNLEdBQUcsU0FBQSxBQUFDLENBQUs7QUFDM0IsMEJBQW9CLEFBQUMsRUFBQyxDQUFDO0FBQ3ZCLFlBQU0sU0FBUyxBQUFDLENBQUM7QUFDZixjQUFNLENBQUcsQ0FBQSxPQUFNLFlBQVk7QUFDM0IsWUFBSSxDQUFHLENBQUEsQ0FBQSxLQUFLLEFBQUMsQ0FBQyxvQkFBbUIsT0FBTztBQUFBLE1BQzFDLENBQUMsQ0FBQztJQUNKLEVBQUMsQ0FBQztFQUNKO0tBeEVtRjtBQTJFckYsS0FBSyxRQUFRLEVBQUksY0FBWSxDQUFDO0FBQzlCOzs7O0FDM0VBO0FBQUEsT0FBUyxZQUFVLENBQUMsQUFBQztBQUVqQixBQUFJLElBQUEsQ0FBQSxVQUFTLEVBQUksQ0FBQSxDQUFBLFFBQVEsQUFBQyxDQUFDLENBQUMsU0FBUSxDQUFFLFVBQVEsQ0FBRSxVQUFRLENBQUUsVUFBUSxDQUFFLEVBQUMsTUFBSyxDQUFFLFFBQU0sQ0FBRSxFQUFBLENBQUMsQ0FBRSxFQUFDLE1BQUssQ0FBRSxRQUFNLENBQUUsRUFBQSxDQUFDLENBQUUsRUFBQyxNQUFLLENBQUUsUUFBTSxDQUFFLEVBQUEsQ0FBQyxDQUFFLEVBQUMsTUFBSyxDQUFFLEtBQUcsQ0FBRSxFQUFBLENBQUMsQ0FBRSxFQUFDLE1BQUssQ0FBRSxLQUFHLENBQUUsRUFBQSxDQUFDLENBQUUsRUFBQyxNQUFLLENBQUUsS0FBRyxDQUFFLEVBQUEsQ0FBQyxDQUFFLEVBQUMsUUFBTyxDQUFFLEtBQUcsQ0FBRSxFQUFBLENBQUMsQ0FBRSxFQUFDLFFBQU8sQ0FBRSxLQUFHLENBQUUsRUFBQSxDQUFDLENBQUUsRUFBQyxRQUFPLENBQUUsS0FBRyxDQUFFLEVBQUEsQ0FBQyxDQUFFLEVBQUMsUUFBTyxDQUFFLFFBQU0sQ0FBRSxFQUFBLENBQUMsQ0FBRSxFQUFDLFFBQU8sQ0FBRSxRQUFNLENBQUUsRUFBQSxDQUFDLENBQUUsRUFBQyxRQUFPLENBQUUsUUFBTSxDQUFFLEVBQUEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUdsUyxBQUFJLElBQUEsQ0FBQSxTQUFRLEVBQUksRUFBQyxNQUFLLENBQUUsU0FBTyxDQUFDLENBQUM7QUFDakMsQUFBSSxJQUFBLENBQUEsSUFBRyxFQUFJLEVBQUMsT0FBTSxDQUFFLEtBQUcsQ0FBQyxDQUFDO0FBQ3pCLEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLENBQUEsUUFBUSxBQUFDLENBQUMsQ0FBQyxDQUFBLENBQUUsRUFBQSxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLEFBQUksSUFBQSxDQUFBLE1BQUssRUFBSSxFQUFDLEtBQUksQ0FBRSxPQUFLLENBQUUsUUFBTSxDQUFFLFFBQU0sQ0FBQyxDQUFDO0FBRTVDLEFBQUksSUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLFVBQVMsT0FBTyxDQUFBO0FBRTdCLEFBQUksSUFBQSxDQUFBLE1BQUssRUFBSSxtREFBaUQsQ0FBQztBQUMvRCxBQUFJLElBQUEsQ0FBQSxNQUFLLEVBQUksc0VBQW9FLENBQUM7QUFDbEYsQUFBSSxJQUFBLENBQUEsU0FBUSxFQUFJLG1EQUFpRCxDQUFDO0FBRWxFLEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSTtBQUNYLFVBQU0sQ0FBSSxrREFBZ0Q7QUFDMUQsT0FBRyxDQUFJLDBEQUF3RDtBQUFBLEVBQ25FLENBQUE7QUFDQSxBQUFJLElBQUEsQ0FBQSxHQUFFLEVBQUksQ0FBQSxDQUFBLElBQUksQUFBQyxDQUFDLENBQUEsTUFBTSxBQUFDLENBQUMsQ0FBQSxDQUFHLFFBQU0sQ0FBQyxHQUFHLFNBQUMsQ0FBQSxDQUFNO0FBRTVDLEFBQUksTUFBQSxDQUFBLEtBQUksRUFBSSxHQUFDLENBQUM7QUFDZCxRQUFJLEtBQUssRUFBRSxRQUFNLENBQUM7QUFDbEIsUUFBSSxNQUFNLEVBQUUsQ0FBQSxNQUFLLENBQUUsSUFBRyxNQUFNLEFBQUMsQ0FBQyxJQUFHLE9BQU8sQUFBQyxFQUFDLENBQUEsQ0FBRSxFQUFBLENBQUMsQ0FBQyxDQUFDO0FBQy9DLFFBQUksVUFBVSxFQUFJLENBQUEsVUFBUyxNQUFNLEFBQUMsRUFBQyxDQUFDO0FBRXBDLE9BQUksS0FBSSxVQUFVLEdBQUcsVUFBUSxDQUFFO0FBQzNCLFVBQUksUUFBUSxFQUFFLEtBQUcsQ0FBQztBQUNsQixVQUFJLE1BQU0sRUFBSSxDQUFBLFFBQU8sTUFBTSxBQUFDLEVBQUMsQ0FBQztBQUM5QixVQUFJLElBQUksRUFBRSxDQUFBLElBQUcsQ0FBRSxJQUFHLE1BQU0sQUFBQyxDQUFDLElBQUcsT0FBTyxBQUFDLEVBQUMsQ0FBQSxDQUFFLEVBQUEsQ0FBQyxDQUFDLENBQUM7QUFDM0MsVUFBSSxTQUFTLEVBQUksQ0FBQSxTQUFRLENBQUUsSUFBRyxNQUFNLEFBQUMsQ0FBQyxJQUFHLE9BQU8sQUFBQyxFQUFDLENBQUEsQ0FBRSxFQUFBLENBQUMsQ0FBQyxDQUFBO0lBQzFELEtBQUs7QUFDRCxVQUFJLFFBQVEsRUFBRSxNQUFJLENBQUM7QUFDbkIsVUFBSSxJQUFJLEVBQUUsQ0FBQSxLQUFJLFVBQVUsQ0FBRSxDQUFBLENBQUMsQ0FBQztBQUM1QixVQUFJLFNBQVMsRUFBSSxDQUFBLEtBQUksVUFBVSxDQUFFLENBQUEsQ0FBQyxDQUFDO0FBQ25DLFVBQUksTUFBTSxFQUFJLENBQUEsS0FBSSxVQUFVLENBQUUsQ0FBQSxDQUFDLENBQUE7SUFDbkM7QUFBQSxBQUdBLFFBQUksU0FBUyxFQUFFLENBQUEsUUFBTyxDQUFFLEtBQUksSUFBSSxDQUFDLENBQUM7QUFFbEMsT0FBSSxLQUFJLElBQUksR0FBRyxRQUFNLENBQUU7QUFBQyxVQUFJLFNBQVMsRUFBRSxDQUFBLEtBQUksU0FBUyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxDQUFBO0lBQUM7QUFBQSxBQUVqRixPQUFJLEtBQUksSUFBSSxHQUFHLFFBQU0sQ0FBRTtBQUNuQixVQUFJLE9BQU8sRUFBRSxDQUFBLE1BQUssUUFBUSxBQUFDLENBQUMsS0FBSSxDQUFHLENBQUEsS0FBSSxJQUFJLENBQUMsUUFBUSxBQUFDLENBQUMsS0FBSSxDQUFFLENBQUEsS0FBSSxNQUFNLENBQUMsQ0FBQztJQUM1RSxLQUFPO0FBQ0gsVUFBSSxPQUFPLEVBQUUsQ0FBQSxNQUFLLFFBQVEsQUFBQyxDQUFDLEtBQUksQ0FBRyxDQUFBLEtBQUksSUFBSSxDQUFDLFFBQVEsQUFBQyxDQUFDLEtBQUksQ0FBRyxPQUFLLENBQUMsQ0FBQztJQUN4RTtBQUFBLEFBQUMsSUFBQTtBQUdELFFBQUksT0FBTyxFQUFFLENBQUEsTUFBSyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsQ0FBQSxLQUFJLFNBQVMsQ0FBQyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxDQUFDO0FBQzFHLFFBQUksVUFBVSxFQUFFLENBQUEsU0FBUSxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsT0FBSyxDQUFDLFFBQVEsQUFBQyxDQUFDLEtBQUksQ0FBRyxDQUFBLEtBQUksTUFBTSxDQUFDLENBQUM7QUFDNUUsUUFBSSxFQUFFLEVBQUUsRUFBQSxDQUFDO0FBQ1QsUUFBSSxXQUFXLEVBQUksQ0FBQSxDQUFDLEdBQUUsRUFBRSxDQUFBLEtBQUksRUFBRSxDQUFDLEVBQUUsUUFBTSxDQUFBO0FBQ3ZDLFFBQUksZ0JBQWdCLEVBQUUsV0FBUyxDQUFDO0FBQ2hDLFFBQUksT0FBTyxFQUFFLFdBQVMsQ0FBQztBQUN2QixTQUFPLE1BQUksQ0FBQztFQUNaLEVBQUMsQ0FBQztBQUVGLFFBQU0sSUFBSSxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7QUFFaEIsT0FBTyxJQUFFLENBQUM7QUFFZDtBQUdBLEtBQUssUUFBUSxFQUFJLFlBQVUsQ0FBQztBQUM1Qjs7OztBQ3BFQTtBQUFBLE9BQVMsZUFBYSxDQUFDLEFBQUM7QUFFcEIsQUFBSSxJQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsQ0FBQSxRQUFRLEFBQUMsQ0FBQyxDQUFDLFdBQVUsQ0FBRSxXQUFTLENBQUUsWUFBVSxDQUFFLFdBQVMsQ0FBQyxDQUFDLENBQUM7QUFDeEUsQUFBSSxJQUFBLENBQUEsTUFBSyxFQUFJLEVBQUMsS0FBSSxDQUFHLFFBQU0sQ0FBQyxDQUFDO0FBQzdCLEFBQUksSUFBQSxDQUFBLFdBQVUsRUFBSSxDQUFBLENBQUEsUUFBUSxBQUFDLENBQUMsQ0FBQyxTQUFRLENBQUUsVUFBUSxDQUFFLE9BQUssQ0FBRSxPQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ25FLEFBQUksSUFBQSxDQUFBLE9BQU0sRUFBSSxFQUFBLENBQUM7QUFFWixBQUFJLElBQUEsQ0FBQSxXQUFVLEVBQUk7QUFDVixjQUFVLENBQUcsNEVBQTBFO0FBQ3ZGLGFBQVMsQ0FBRyw4UEFBNFA7QUFBQSxFQUNoUixDQUFDO0FBQ0QsQUFBSSxJQUFBLENBQUEsT0FBTSxFQUFJLG9EQUFrRCxDQUFDO0FBQ2pFLEFBQUksSUFBQSxDQUFBLGVBQWMsRUFBRTtBQUNoQixZQUFRLENBQUUsZ0JBQWM7QUFDeEIsWUFBUSxDQUFFLGVBQWE7QUFDdkIsU0FBSyxDQUFFLFdBQVM7QUFDaEIsU0FBSyxDQUFFLFlBQVU7QUFBQSxFQUNyQixDQUFDO0FBRUQsQUFBSSxJQUFBLENBQUEsU0FBUSxFQUFJLCtEQUE2RCxDQUFDO0FBRTlFLEFBQUksSUFBQSxDQUFBLFdBQVUsRUFBRSx3SUFBc0ksQ0FBQztBQUN2SixBQUFJLElBQUEsQ0FBQSxVQUFTLEVBQUk7QUFDYixjQUFVLENBQUUsaUtBQStKO0FBQzNLLGFBQVMsQ0FBRSxDQUFBLG9LQUFtSyxFQUNsSyxJQUFFLENBQUEsQ0FDRixpS0FBK0osQ0FBQSxDQUMvSixJQUFFLENBQUEsQ0FDRiw2SkFBMkosQ0FBQSxDQUMzSixJQUFFLENBQUEsQ0FDRixxS0FBbUs7QUFBQSxFQUNuTCxDQUFDO0FBRUQsQUFBSSxJQUFBLENBQUEsR0FBRSxFQUFJLENBQUEsQ0FBQSxJQUFJLEFBQUMsQ0FBQyxDQUFBLE1BQU0sQUFBQyxDQUFDLENBQUEsQ0FBRyxRQUFNLENBQUMsR0FBRyxTQUFDLENBQUEsQ0FBTTtBQUN4QyxBQUFJLE1BQUEsQ0FBQSxLQUFJLEVBQUksR0FBQyxDQUFDO0FBQ2QsUUFBSSxLQUFLLEVBQUUsV0FBUyxDQUFDO0FBQ3JCLFFBQUksT0FBTyxFQUFJLENBQUEsT0FBTSxNQUFNLEFBQUMsRUFBQyxDQUFDO0FBQzlCLFFBQUksTUFBTSxFQUFJLENBQUEsTUFBSyxDQUFFLElBQUcsTUFBTSxBQUFDLENBQUMsSUFBRyxPQUFPLEFBQUMsRUFBQyxDQUFBLENBQUUsRUFBQSxDQUFDLENBQUMsQ0FBQztBQUNqRCxRQUFJLFlBQVksRUFBRSxDQUFBLFdBQVUsQ0FBRSxLQUFJLE9BQU8sQ0FBQyxDQUFDO0FBQ3ZDLE9BQUksS0FBSSxPQUFPLEdBQUcsWUFBVSxDQUFFO0FBQUMsVUFBSSxZQUFZLEVBQUUsQ0FBQSxLQUFJLFlBQVksUUFBUSxBQUFDLENBQUMsTUFBSyxDQUFHLENBQUEsS0FBSSxNQUFNLENBQUMsUUFBUSxBQUFDLENBQUMsTUFBSyxDQUFHLENBQUEsS0FBSSxNQUFNLENBQUMsQ0FBQTtJQUFDO0FBQUEsQUFBQyxJQUFBO0FBQ2pJLFFBQUksWUFBWSxFQUFFLENBQUEsV0FBVSxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZGLFFBQUksZ0JBQWdCLEVBQUksQ0FBQSxXQUFVLE1BQU0sQUFBQyxFQUFDLENBQUM7QUFDM0MsUUFBSSxXQUFXLEVBQUksQ0FBQSxlQUFjLENBQUUsS0FBSSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3pELFFBQUksUUFBUSxFQUFJLENBQUEsT0FBTSxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsQ0FBQSxLQUFJLFdBQVcsQ0FBQyxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxDQUFDO0FBQ3JGLFFBQUksVUFBVSxFQUFFLENBQUEsVUFBUyxDQUFFLEtBQUksT0FBTyxDQUFDLENBQUM7QUFDcEMsT0FBSSxLQUFJLE9BQU8sR0FBRyxZQUFVLENBQUU7QUFBQyxVQUFJLFVBQVUsRUFBRSxDQUFBLEtBQUksVUFBVSxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxRQUFRLEFBQUMsQ0FBQyxNQUFLLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxDQUFBO0lBQUM7QUFBQSxBQUFDLElBQUE7QUFDdkwsUUFBSSxVQUFVLEVBQUksQ0FBQSxTQUFRLFFBQVEsQUFBQyxDQUFDLEtBQUksQ0FBRyxDQUFBLEtBQUksZ0JBQWdCLENBQUMsUUFBUSxBQUFDLENBQUMsS0FBSSxDQUFHLENBQUEsS0FBSSxNQUFNLENBQUMsQ0FBQztBQUM3RixRQUFJLEVBQUUsRUFBRSxFQUFBLENBQUM7QUFDVCxRQUFJLFdBQVcsRUFBSSxDQUFBLENBQUMsR0FBRSxFQUFFLENBQUEsS0FBSSxFQUFFLENBQUMsRUFBRSxRQUFNLENBQUE7QUFDdkMsUUFBSSxJQUFJLEVBQUUsV0FBUyxDQUFDO0FBQ3BCLFFBQUksU0FBUyxFQUFFLFdBQVMsQ0FBQztBQUN6QixRQUFJLE1BQU0sRUFBRSxXQUFTLENBQUM7QUFFdEIsU0FBTyxNQUFJLENBQUM7RUFDaEIsRUFBQyxDQUFDO0FBRUYsUUFBTSxJQUFJLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQztBQUVoQixPQUFPLElBQUUsQ0FBQztBQUVkO0FBR0EsS0FBSyxRQUFRLEVBQUksZUFBYSxDQUFDO0FBQy9COzs7O0FDakVBO0FBQUEsQUFBSSxFQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsV0FBVSxDQUFDLENBQUM7QUFDbEMsQUFBSSxFQUFBLENBQUEsVUFBUyxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsY0FBYSxDQUFDLENBQUM7QUFFeEMsQUFBSSxFQUFBLENBQUEsS0FBSSxFQUFJLEVBQ1gsK0JBQThCLENBQzNCLGlDQUErQixDQUMvQixpQ0FBK0IsQ0FDL0IsdUJBQXFCLENBQ3JCLGNBQVksQ0FDZixZQUFVLENBQ1AseUJBQXVCLENBQzNCLENBQUM7QUFFRCxBQUFJLEVBQUEsQ0FBQSxnQkFBZSxFQUFJLEVBQ3RCLCtCQUE4QixDQUMzQixpQ0FBK0IsQ0FDL0IsaUNBQStCLENBQ25DLENBQUM7QUFFRCxNQUFNLGFBQWEsQUFBQyxDQUFDLEtBQUksQ0FBQyxDQUFDO0FBRzNCLEFBQUksRUFBQSxDQUFBLFdBQVUsQ0FBQztBQUNmLEFBQUksRUFBQSxDQUFBLEdBQUUsRUFBSSxJQUFJLFdBQVMsQUFBQyxFQUFDLENBQUM7QUFHMUIsQUFBQyxDQUFDLE1BQUssQ0FBQyxLQUFLLEFBQUMsRUFBQyxTQUFBLEFBQUMsQ0FBSztBQUNqQixRQUFNLGVBQWUsQUFBQyxDQUNyQixnQkFBZSxDQUNaLFVBQVEsQUFBQyxDQUFFO0FBQUUsY0FBVSxFQUFJLENBQUEsR0FBRSxNQUFNLEFBQUMsRUFBQyxDQUFDO0VBQUUsQ0FDNUMsQ0FBQztBQUNMLEVBQUMsQ0FBQztBQUNGIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuLy8gcmVzb2x2ZXMgLiBhbmQgLi4gZWxlbWVudHMgaW4gYSBwYXRoIGFycmF5IHdpdGggZGlyZWN0b3J5IG5hbWVzIHRoZXJlXG4vLyBtdXN0IGJlIG5vIHNsYXNoZXMsIGVtcHR5IGVsZW1lbnRzLCBvciBkZXZpY2UgbmFtZXMgKGM6XFwpIGluIHRoZSBhcnJheVxuLy8gKHNvIGFsc28gbm8gbGVhZGluZyBhbmQgdHJhaWxpbmcgc2xhc2hlcyAtIGl0IGRvZXMgbm90IGRpc3Rpbmd1aXNoXG4vLyByZWxhdGl2ZSBhbmQgYWJzb2x1dGUgcGF0aHMpXG5mdW5jdGlvbiBub3JtYWxpemVBcnJheShwYXJ0cywgYWxsb3dBYm92ZVJvb3QpIHtcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHBhcnRzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgdmFyIGxhc3QgPSBwYXJ0c1tpXTtcbiAgICBpZiAobGFzdCA9PT0gJy4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwLS07XG4gICAgfVxuICB9XG5cbiAgLy8gaWYgdGhlIHBhdGggaXMgYWxsb3dlZCB0byBnbyBhYm92ZSB0aGUgcm9vdCwgcmVzdG9yZSBsZWFkaW5nIC4uc1xuICBpZiAoYWxsb3dBYm92ZVJvb3QpIHtcbiAgICBmb3IgKDsgdXAtLTsgdXApIHtcbiAgICAgIHBhcnRzLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHBhcnRzO1xufVxuXG4vLyBTcGxpdCBhIGZpbGVuYW1lIGludG8gW3Jvb3QsIGRpciwgYmFzZW5hbWUsIGV4dF0sIHVuaXggdmVyc2lvblxuLy8gJ3Jvb3QnIGlzIGp1c3QgYSBzbGFzaCwgb3Igbm90aGluZy5cbnZhciBzcGxpdFBhdGhSZSA9XG4gICAgL14oXFwvP3wpKFtcXHNcXFNdKj8pKCg/OlxcLnsxLDJ9fFteXFwvXSs/fCkoXFwuW14uXFwvXSp8KSkoPzpbXFwvXSopJC87XG52YXIgc3BsaXRQYXRoID0gZnVuY3Rpb24oZmlsZW5hbWUpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aFJlLmV4ZWMoZmlsZW5hbWUpLnNsaWNlKDEpO1xufTtcblxuLy8gcGF0aC5yZXNvbHZlKFtmcm9tIC4uLl0sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZXNvbHZlID0gZnVuY3Rpb24oKSB7XG4gIHZhciByZXNvbHZlZFBhdGggPSAnJyxcbiAgICAgIHJlc29sdmVkQWJzb2x1dGUgPSBmYWxzZTtcblxuICBmb3IgKHZhciBpID0gYXJndW1lbnRzLmxlbmd0aCAtIDE7IGkgPj0gLTEgJiYgIXJlc29sdmVkQWJzb2x1dGU7IGktLSkge1xuICAgIHZhciBwYXRoID0gKGkgPj0gMCkgPyBhcmd1bWVudHNbaV0gOiBwcm9jZXNzLmN3ZCgpO1xuXG4gICAgLy8gU2tpcCBlbXB0eSBhbmQgaW52YWxpZCBlbnRyaWVzXG4gICAgaWYgKHR5cGVvZiBwYXRoICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGgucmVzb2x2ZSBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9IGVsc2UgaWYgKCFwYXRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICByZXNvbHZlZFBhdGggPSBwYXRoICsgJy8nICsgcmVzb2x2ZWRQYXRoO1xuICAgIHJlc29sdmVkQWJzb2x1dGUgPSBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xuICB9XG5cbiAgLy8gQXQgdGhpcyBwb2ludCB0aGUgcGF0aCBzaG91bGQgYmUgcmVzb2x2ZWQgdG8gYSBmdWxsIGFic29sdXRlIHBhdGgsIGJ1dFxuICAvLyBoYW5kbGUgcmVsYXRpdmUgcGF0aHMgdG8gYmUgc2FmZSAobWlnaHQgaGFwcGVuIHdoZW4gcHJvY2Vzcy5jd2QoKSBmYWlscylcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcmVzb2x2ZWRQYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHJlc29sdmVkUGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFyZXNvbHZlZEFic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgcmV0dXJuICgocmVzb2x2ZWRBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHJlc29sdmVkUGF0aCkgfHwgJy4nO1xufTtcblxuLy8gcGF0aC5ub3JtYWxpemUocGF0aClcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMubm9ybWFsaXplID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgaXNBYnNvbHV0ZSA9IGV4cG9ydHMuaXNBYnNvbHV0ZShwYXRoKSxcbiAgICAgIHRyYWlsaW5nU2xhc2ggPSBzdWJzdHIocGF0aCwgLTEpID09PSAnLyc7XG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocGF0aC5zcGxpdCgnLycpLCBmdW5jdGlvbihwKSB7XG4gICAgcmV0dXJuICEhcDtcbiAgfSksICFpc0Fic29sdXRlKS5qb2luKCcvJyk7XG5cbiAgaWYgKCFwYXRoICYmICFpc0Fic29sdXRlKSB7XG4gICAgcGF0aCA9ICcuJztcbiAgfVxuICBpZiAocGF0aCAmJiB0cmFpbGluZ1NsYXNoKSB7XG4gICAgcGF0aCArPSAnLyc7XG4gIH1cblxuICByZXR1cm4gKGlzQWJzb2x1dGUgPyAnLycgOiAnJykgKyBwYXRoO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5pc0Fic29sdXRlID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuam9pbiA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcGF0aHMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICByZXR1cm4gZXhwb3J0cy5ub3JtYWxpemUoZmlsdGVyKHBhdGhzLCBmdW5jdGlvbihwLCBpbmRleCkge1xuICAgIGlmICh0eXBlb2YgcCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLmpvaW4gbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfVxuICAgIHJldHVybiBwO1xuICB9KS5qb2luKCcvJykpO1xufTtcblxuXG4vLyBwYXRoLnJlbGF0aXZlKGZyb20sIHRvKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5yZWxhdGl2ZSA9IGZ1bmN0aW9uKGZyb20sIHRvKSB7XG4gIGZyb20gPSBleHBvcnRzLnJlc29sdmUoZnJvbSkuc3Vic3RyKDEpO1xuICB0byA9IGV4cG9ydHMucmVzb2x2ZSh0bykuc3Vic3RyKDEpO1xuXG4gIGZ1bmN0aW9uIHRyaW0oYXJyKSB7XG4gICAgdmFyIHN0YXJ0ID0gMDtcbiAgICBmb3IgKDsgc3RhcnQgPCBhcnIubGVuZ3RoOyBzdGFydCsrKSB7XG4gICAgICBpZiAoYXJyW3N0YXJ0XSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIHZhciBlbmQgPSBhcnIubGVuZ3RoIC0gMTtcbiAgICBmb3IgKDsgZW5kID49IDA7IGVuZC0tKSB7XG4gICAgICBpZiAoYXJyW2VuZF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICBpZiAoc3RhcnQgPiBlbmQpIHJldHVybiBbXTtcbiAgICByZXR1cm4gYXJyLnNsaWNlKHN0YXJ0LCBlbmQgLSBzdGFydCArIDEpO1xuICB9XG5cbiAgdmFyIGZyb21QYXJ0cyA9IHRyaW0oZnJvbS5zcGxpdCgnLycpKTtcbiAgdmFyIHRvUGFydHMgPSB0cmltKHRvLnNwbGl0KCcvJykpO1xuXG4gIHZhciBsZW5ndGggPSBNYXRoLm1pbihmcm9tUGFydHMubGVuZ3RoLCB0b1BhcnRzLmxlbmd0aCk7XG4gIHZhciBzYW1lUGFydHNMZW5ndGggPSBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoZnJvbVBhcnRzW2ldICE9PSB0b1BhcnRzW2ldKSB7XG4gICAgICBzYW1lUGFydHNMZW5ndGggPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgdmFyIG91dHB1dFBhcnRzID0gW107XG4gIGZvciAodmFyIGkgPSBzYW1lUGFydHNMZW5ndGg7IGkgPCBmcm9tUGFydHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXRwdXRQYXJ0cy5wdXNoKCcuLicpO1xuICB9XG5cbiAgb3V0cHV0UGFydHMgPSBvdXRwdXRQYXJ0cy5jb25jYXQodG9QYXJ0cy5zbGljZShzYW1lUGFydHNMZW5ndGgpKTtcblxuICByZXR1cm4gb3V0cHV0UGFydHMuam9pbignLycpO1xufTtcblxuZXhwb3J0cy5zZXAgPSAnLyc7XG5leHBvcnRzLmRlbGltaXRlciA9ICc6JztcblxuZXhwb3J0cy5kaXJuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICB2YXIgcmVzdWx0ID0gc3BsaXRQYXRoKHBhdGgpLFxuICAgICAgcm9vdCA9IHJlc3VsdFswXSxcbiAgICAgIGRpciA9IHJlc3VsdFsxXTtcblxuICBpZiAoIXJvb3QgJiYgIWRpcikge1xuICAgIC8vIE5vIGRpcm5hbWUgd2hhdHNvZXZlclxuICAgIHJldHVybiAnLic7XG4gIH1cblxuICBpZiAoZGlyKSB7XG4gICAgLy8gSXQgaGFzIGEgZGlybmFtZSwgc3RyaXAgdHJhaWxpbmcgc2xhc2hcbiAgICBkaXIgPSBkaXIuc3Vic3RyKDAsIGRpci5sZW5ndGggLSAxKTtcbiAgfVxuXG4gIHJldHVybiByb290ICsgZGlyO1xufTtcblxuXG5leHBvcnRzLmJhc2VuYW1lID0gZnVuY3Rpb24ocGF0aCwgZXh0KSB7XG4gIHZhciBmID0gc3BsaXRQYXRoKHBhdGgpWzJdO1xuICAvLyBUT0RPOiBtYWtlIHRoaXMgY29tcGFyaXNvbiBjYXNlLWluc2Vuc2l0aXZlIG9uIHdpbmRvd3M/XG4gIGlmIChleHQgJiYgZi5zdWJzdHIoLTEgKiBleHQubGVuZ3RoKSA9PT0gZXh0KSB7XG4gICAgZiA9IGYuc3Vic3RyKDAsIGYubGVuZ3RoIC0gZXh0Lmxlbmd0aCk7XG4gIH1cbiAgcmV0dXJuIGY7XG59O1xuXG5cbmV4cG9ydHMuZXh0bmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHNwbGl0UGF0aChwYXRoKVszXTtcbn07XG5cbmZ1bmN0aW9uIGZpbHRlciAoeHMsIGYpIHtcbiAgICBpZiAoeHMuZmlsdGVyKSByZXR1cm4geHMuZmlsdGVyKGYpO1xuICAgIHZhciByZXMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGlmIChmKHhzW2ldLCBpLCB4cykpIHJlcy5wdXNoKHhzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlcztcbn1cblxuLy8gU3RyaW5nLnByb3RvdHlwZS5zdWJzdHIgLSBuZWdhdGl2ZSBpbmRleCBkb24ndCB3b3JrIGluIElFOFxudmFyIHN1YnN0ciA9ICdhYicuc3Vic3RyKC0xKSA9PT0gJ2InXG4gICAgPyBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7IHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pIH1cbiAgICA6IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHtcbiAgICAgICAgaWYgKHN0YXJ0IDwgMCkgc3RhcnQgPSBzdHIubGVuZ3RoICsgc3RhcnQ7XG4gICAgICAgIHJldHVybiBzdHIuc3Vic3RyKHN0YXJ0LCBsZW4pO1xuICAgIH1cbjtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJykpXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldDp1dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5d1lYUm9MV0p5YjNkelpYSnBabmt2YVc1a1pYZ3Vhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJanRCUVVGQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRU0lzSW1acGJHVWlPaUpuWlc1bGNtRjBaV1F1YW5NaUxDSnpiM1Z5WTJWU2IyOTBJam9pSWl3aWMyOTFjbU5sYzBOdmJuUmxiblFpT2xzaUx5OGdRMjl3ZVhKcFoyaDBJRXB2ZVdWdWRDd2dTVzVqTGlCaGJtUWdiM1JvWlhJZ1RtOWtaU0JqYjI1MGNtbGlkWFJ2Y25NdVhHNHZMMXh1THk4Z1VHVnliV2x6YzJsdmJpQnBjeUJvWlhKbFlua2daM0poYm5SbFpDd2dabkpsWlNCdlppQmphR0Z5WjJVc0lIUnZJR0Z1ZVNCd1pYSnpiMjRnYjJKMFlXbHVhVzVuSUdGY2JpOHZJR052Y0hrZ2IyWWdkR2hwY3lCemIyWjBkMkZ5WlNCaGJtUWdZWE56YjJOcFlYUmxaQ0JrYjJOMWJXVnVkR0YwYVc5dUlHWnBiR1Z6SUNoMGFHVmNiaTh2SUZ3aVUyOW1kSGRoY21WY0lpa3NJSFJ2SUdSbFlXd2dhVzRnZEdobElGTnZablIzWVhKbElIZHBkR2h2ZFhRZ2NtVnpkSEpwWTNScGIyNHNJR2x1WTJ4MVpHbHVaMXh1THk4Z2QybDBhRzkxZENCc2FXMXBkR0YwYVc5dUlIUm9aU0J5YVdkb2RITWdkRzhnZFhObExDQmpiM0I1TENCdGIyUnBabmtzSUcxbGNtZGxMQ0J3ZFdKc2FYTm9MRnh1THk4Z1pHbHpkSEpwWW5WMFpTd2djM1ZpYkdsalpXNXpaU3dnWVc1a0wyOXlJSE5sYkd3Z1kyOXdhV1Z6SUc5bUlIUm9aU0JUYjJaMGQyRnlaU3dnWVc1a0lIUnZJSEJsY20xcGRGeHVMeThnY0dWeWMyOXVjeUIwYnlCM2FHOXRJSFJvWlNCVGIyWjBkMkZ5WlNCcGN5Qm1kWEp1YVhOb1pXUWdkRzhnWkc4Z2MyOHNJSE4xWW1wbFkzUWdkRzhnZEdobFhHNHZMeUJtYjJ4c2IzZHBibWNnWTI5dVpHbDBhVzl1Y3pwY2JpOHZYRzR2THlCVWFHVWdZV0p2ZG1VZ1kyOXdlWEpwWjJoMElHNXZkR2xqWlNCaGJtUWdkR2hwY3lCd1pYSnRhWE56YVc5dUlHNXZkR2xqWlNCemFHRnNiQ0JpWlNCcGJtTnNkV1JsWkZ4dUx5OGdhVzRnWVd4c0lHTnZjR2xsY3lCdmNpQnpkV0p6ZEdGdWRHbGhiQ0J3YjNKMGFXOXVjeUJ2WmlCMGFHVWdVMjltZEhkaGNtVXVYRzR2TDF4dUx5OGdWRWhGSUZOUFJsUlhRVkpGSUVsVElGQlNUMVpKUkVWRUlGd2lRVk1nU1ZOY0lpd2dWMGxVU0U5VlZDQlhRVkpTUVU1VVdTQlBSaUJCVGxrZ1MwbE9SQ3dnUlZoUVVrVlRVMXh1THk4Z1QxSWdTVTFRVEVsRlJDd2dTVTVEVEZWRVNVNUhJRUpWVkNCT1QxUWdURWxOU1ZSRlJDQlVUeUJVU0VVZ1YwRlNVa0ZPVkVsRlV5QlBSbHh1THk4Z1RVVlNRMGhCVGxSQlFrbE1TVlJaTENCR1NWUk9SVk5USUVaUFVpQkJJRkJCVWxSSlExVk1RVklnVUZWU1VFOVRSU0JCVGtRZ1RrOU9TVTVHVWtsT1IwVk5SVTVVTGlCSlRseHVMeThnVGs4Z1JWWkZUbFFnVTBoQlRFd2dWRWhGSUVGVlZFaFBVbE1nVDFJZ1EwOVFXVkpKUjBoVUlFaFBURVJGVWxNZ1FrVWdURWxCUWt4RklFWlBVaUJCVGxrZ1EweEJTVTBzWEc0dkx5QkVRVTFCUjBWVElFOVNJRTlVU0VWU0lFeEpRVUpKVEVsVVdTd2dWMGhGVkVoRlVpQkpUaUJCVGlCQlExUkpUMDRnVDBZZ1EwOU9WRkpCUTFRc0lGUlBVbFFnVDFKY2JpOHZJRTlVU0VWU1YwbFRSU3dnUVZKSlUwbE9SeUJHVWs5TkxDQlBWVlFnVDBZZ1QxSWdTVTRnUTA5T1RrVkRWRWxQVGlCWFNWUklJRlJJUlNCVFQwWlVWMEZTUlNCUFVpQlVTRVZjYmk4dklGVlRSU0JQVWlCUFZFaEZVaUJFUlVGTVNVNUhVeUJKVGlCVVNFVWdVMDlHVkZkQlVrVXVYRzVjYmk4dklISmxjMjlzZG1WeklDNGdZVzVrSUM0dUlHVnNaVzFsYm5SeklHbHVJR0VnY0dGMGFDQmhjbkpoZVNCM2FYUm9JR1JwY21WamRHOXllU0J1WVcxbGN5QjBhR1Z5WlZ4dUx5OGdiWFZ6ZENCaVpTQnVieUJ6YkdGemFHVnpMQ0JsYlhCMGVTQmxiR1Z0Wlc1MGN5d2diM0lnWkdWMmFXTmxJRzVoYldWeklDaGpPbHhjS1NCcGJpQjBhR1VnWVhKeVlYbGNiaTh2SUNoemJ5QmhiSE52SUc1dklHeGxZV1JwYm1jZ1lXNWtJSFJ5WVdsc2FXNW5JSE5zWVhOb1pYTWdMU0JwZENCa2IyVnpJRzV2ZENCa2FYTjBhVzVuZFdsemFGeHVMeThnY21Wc1lYUnBkbVVnWVc1a0lHRmljMjlzZFhSbElIQmhkR2h6S1Z4dVpuVnVZM1JwYjI0Z2JtOXliV0ZzYVhwbFFYSnlZWGtvY0dGeWRITXNJR0ZzYkc5M1FXSnZkbVZTYjI5MEtTQjdYRzRnSUM4dklHbG1JSFJvWlNCd1lYUm9JSFJ5YVdWeklIUnZJR2R2SUdGaWIzWmxJSFJvWlNCeWIyOTBMQ0JnZFhCZ0lHVnVaSE1nZFhBZ1BpQXdYRzRnSUhaaGNpQjFjQ0E5SURBN1hHNGdJR1p2Y2lBb2RtRnlJR2tnUFNCd1lYSjBjeTVzWlc1bmRHZ2dMU0F4T3lCcElENDlJREE3SUdrdExTa2dlMXh1SUNBZ0lIWmhjaUJzWVhOMElEMGdjR0Z5ZEhOYmFWMDdYRzRnSUNBZ2FXWWdLR3hoYzNRZ1BUMDlJQ2N1SnlrZ2UxeHVJQ0FnSUNBZ2NHRnlkSE11YzNCc2FXTmxLR2tzSURFcE8xeHVJQ0FnSUgwZ1pXeHpaU0JwWmlBb2JHRnpkQ0E5UFQwZ0p5NHVKeWtnZTF4dUlDQWdJQ0FnY0dGeWRITXVjM0JzYVdObEtHa3NJREVwTzF4dUlDQWdJQ0FnZFhBckt6dGNiaUFnSUNCOUlHVnNjMlVnYVdZZ0tIVndLU0I3WEc0Z0lDQWdJQ0J3WVhKMGN5NXpjR3hwWTJVb2FTd2dNU2s3WEc0Z0lDQWdJQ0IxY0MwdE8xeHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lDOHZJR2xtSUhSb1pTQndZWFJvSUdseklHRnNiRzkzWldRZ2RHOGdaMjhnWVdKdmRtVWdkR2hsSUhKdmIzUXNJSEpsYzNSdmNtVWdiR1ZoWkdsdVp5QXVMbk5jYmlBZ2FXWWdLR0ZzYkc5M1FXSnZkbVZTYjI5MEtTQjdYRzRnSUNBZ1ptOXlJQ2c3SUhWd0xTMDdJSFZ3S1NCN1hHNGdJQ0FnSUNCd1lYSjBjeTUxYm5Ob2FXWjBLQ2N1TGljcE8xeHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lISmxkSFZ5YmlCd1lYSjBjenRjYm4xY2JseHVMeThnVTNCc2FYUWdZU0JtYVd4bGJtRnRaU0JwYm5SdklGdHliMjkwTENCa2FYSXNJR0poYzJWdVlXMWxMQ0JsZUhSZExDQjFibWw0SUhabGNuTnBiMjVjYmk4dklDZHliMjkwSnlCcGN5QnFkWE4wSUdFZ2MyeGhjMmdzSUc5eUlHNXZkR2hwYm1jdVhHNTJZWElnYzNCc2FYUlFZWFJvVW1VZ1BWeHVJQ0FnSUM5ZUtGeGNMejk4S1NoYlhGeHpYRnhUWFNvL0tTZ29QenBjWEM1N01Td3lmWHhiWGx4Y0wxMHJQM3dwS0Z4Y0xsdGVMbHhjTDEwcWZDa3BLRDg2VzF4Y0wxMHFLU1F2TzF4dWRtRnlJSE53YkdsMFVHRjBhQ0E5SUdaMWJtTjBhVzl1S0dacGJHVnVZVzFsS1NCN1hHNGdJSEpsZEhWeWJpQnpjR3hwZEZCaGRHaFNaUzVsZUdWaktHWnBiR1Z1WVcxbEtTNXpiR2xqWlNneEtUdGNibjA3WEc1Y2JpOHZJSEJoZEdndWNtVnpiMngyWlNoYlpuSnZiU0F1TGk1ZExDQjBieWxjYmk4dklIQnZjMmw0SUhabGNuTnBiMjVjYm1WNGNHOXlkSE11Y21WemIyeDJaU0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0IyWVhJZ2NtVnpiMngyWldSUVlYUm9JRDBnSnljc1hHNGdJQ0FnSUNCeVpYTnZiSFpsWkVGaWMyOXNkWFJsSUQwZ1ptRnNjMlU3WEc1Y2JpQWdabTl5SUNoMllYSWdhU0E5SUdGeVozVnRaVzUwY3k1c1pXNW5kR2dnTFNBeE95QnBJRDQ5SUMweElDWW1JQ0Z5WlhOdmJIWmxaRUZpYzI5c2RYUmxPeUJwTFMwcElIdGNiaUFnSUNCMllYSWdjR0YwYUNBOUlDaHBJRDQ5SURBcElEOGdZWEpuZFcxbGJuUnpXMmxkSURvZ2NISnZZMlZ6Y3k1amQyUW9LVHRjYmx4dUlDQWdJQzh2SUZOcmFYQWdaVzF3ZEhrZ1lXNWtJR2x1ZG1Gc2FXUWdaVzUwY21sbGMxeHVJQ0FnSUdsbUlDaDBlWEJsYjJZZ2NHRjBhQ0FoUFQwZ0ozTjBjbWx1WnljcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9KMEZ5WjNWdFpXNTBjeUIwYnlCd1lYUm9MbkpsYzI5c2RtVWdiWFZ6ZENCaVpTQnpkSEpwYm1kekp5azdYRzRnSUNBZ2ZTQmxiSE5sSUdsbUlDZ2hjR0YwYUNrZ2UxeHVJQ0FnSUNBZ1kyOXVkR2x1ZFdVN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnY21WemIyeDJaV1JRWVhSb0lEMGdjR0YwYUNBcklDY3ZKeUFySUhKbGMyOXNkbVZrVUdGMGFEdGNiaUFnSUNCeVpYTnZiSFpsWkVGaWMyOXNkWFJsSUQwZ2NHRjBhQzVqYUdGeVFYUW9NQ2tnUFQwOUlDY3ZKenRjYmlBZ2ZWeHVYRzRnSUM4dklFRjBJSFJvYVhNZ2NHOXBiblFnZEdobElIQmhkR2dnYzJodmRXeGtJR0psSUhKbGMyOXNkbVZrSUhSdklHRWdablZzYkNCaFluTnZiSFYwWlNCd1lYUm9MQ0JpZFhSY2JpQWdMeThnYUdGdVpHeGxJSEpsYkdGMGFYWmxJSEJoZEdoeklIUnZJR0psSUhOaFptVWdLRzFwWjJoMElHaGhjSEJsYmlCM2FHVnVJSEJ5YjJObGMzTXVZM2RrS0NrZ1ptRnBiSE1wWEc1Y2JpQWdMeThnVG05eWJXRnNhWHBsSUhSb1pTQndZWFJvWEc0Z0lISmxjMjlzZG1Wa1VHRjBhQ0E5SUc1dmNtMWhiR2w2WlVGeWNtRjVLR1pwYkhSbGNpaHlaWE52YkhabFpGQmhkR2d1YzNCc2FYUW9KeThuS1N3Z1puVnVZM1JwYjI0b2NDa2dlMXh1SUNBZ0lISmxkSFZ5YmlBaElYQTdYRzRnSUgwcExDQWhjbVZ6YjJ4MlpXUkJZbk52YkhWMFpTa3VhbTlwYmlnbkx5Y3BPMXh1WEc0Z0lISmxkSFZ5YmlBb0tISmxjMjlzZG1Wa1FXSnpiMngxZEdVZ1B5QW5MeWNnT2lBbkp5a2dLeUJ5WlhOdmJIWmxaRkJoZEdncElIeDhJQ2N1Snp0Y2JuMDdYRzVjYmk4dklIQmhkR2d1Ym05eWJXRnNhWHBsS0hCaGRHZ3BYRzR2THlCd2IzTnBlQ0IyWlhKemFXOXVYRzVsZUhCdmNuUnpMbTV2Y20xaGJHbDZaU0E5SUdaMWJtTjBhVzl1S0hCaGRHZ3BJSHRjYmlBZ2RtRnlJR2x6UVdKemIyeDFkR1VnUFNCbGVIQnZjblJ6TG1selFXSnpiMngxZEdVb2NHRjBhQ2tzWEc0Z0lDQWdJQ0IwY21GcGJHbHVaMU5zWVhOb0lEMGdjM1ZpYzNSeUtIQmhkR2dzSUMweEtTQTlQVDBnSnk4bk8xeHVYRzRnSUM4dklFNXZjbTFoYkdsNlpTQjBhR1VnY0dGMGFGeHVJQ0J3WVhSb0lEMGdibTl5YldGc2FYcGxRWEp5WVhrb1ptbHNkR1Z5S0hCaGRHZ3VjM0JzYVhRb0p5OG5LU3dnWm5WdVkzUnBiMjRvY0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUFoSVhBN1hHNGdJSDBwTENBaGFYTkJZbk52YkhWMFpTa3VhbTlwYmlnbkx5Y3BPMXh1WEc0Z0lHbG1JQ2doY0dGMGFDQW1KaUFoYVhOQlluTnZiSFYwWlNrZ2UxeHVJQ0FnSUhCaGRHZ2dQU0FuTGljN1hHNGdJSDFjYmlBZ2FXWWdLSEJoZEdnZ0ppWWdkSEpoYVd4cGJtZFRiR0Z6YUNrZ2UxeHVJQ0FnSUhCaGRHZ2dLejBnSnk4bk8xeHVJQ0I5WEc1Y2JpQWdjbVYwZFhKdUlDaHBjMEZpYzI5c2RYUmxJRDhnSnk4bklEb2dKeWNwSUNzZ2NHRjBhRHRjYm4wN1hHNWNiaTh2SUhCdmMybDRJSFpsY25OcGIyNWNibVY0Y0c5eWRITXVhWE5CWW5OdmJIVjBaU0E5SUdaMWJtTjBhVzl1S0hCaGRHZ3BJSHRjYmlBZ2NtVjBkWEp1SUhCaGRHZ3VZMmhoY2tGMEtEQXBJRDA5UFNBbkx5YzdYRzU5TzF4dVhHNHZMeUJ3YjNOcGVDQjJaWEp6YVc5dVhHNWxlSEJ2Y25SekxtcHZhVzRnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnZG1GeUlIQmhkR2h6SUQwZ1FYSnlZWGt1Y0hKdmRHOTBlWEJsTG5Oc2FXTmxMbU5oYkd3b1lYSm5kVzFsYm5SekxDQXdLVHRjYmlBZ2NtVjBkWEp1SUdWNGNHOXlkSE11Ym05eWJXRnNhWHBsS0dacGJIUmxjaWh3WVhSb2N5d2dablZ1WTNScGIyNG9jQ3dnYVc1a1pYZ3BJSHRjYmlBZ0lDQnBaaUFvZEhsd1pXOW1JSEFnSVQwOUlDZHpkSEpwYm1jbktTQjdYRzRnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLQ2RCY21kMWJXVnVkSE1nZEc4Z2NHRjBhQzVxYjJsdUlHMTFjM1FnWW1VZ2MzUnlhVzVuY3ljcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdjRHRjYmlBZ2ZTa3VhbTlwYmlnbkx5Y3BLVHRjYm4wN1hHNWNibHh1THk4Z2NHRjBhQzV5Wld4aGRHbDJaU2htY205dExDQjBieWxjYmk4dklIQnZjMmw0SUhabGNuTnBiMjVjYm1WNGNHOXlkSE11Y21Wc1lYUnBkbVVnUFNCbWRXNWpkR2x2YmlobWNtOXRMQ0IwYnlrZ2UxeHVJQ0JtY205dElEMGdaWGh3YjNKMGN5NXlaWE52YkhabEtHWnliMjBwTG5OMVluTjBjaWd4S1R0Y2JpQWdkRzhnUFNCbGVIQnZjblJ6TG5KbGMyOXNkbVVvZEc4cExuTjFZbk4wY2lneEtUdGNibHh1SUNCbWRXNWpkR2x2YmlCMGNtbHRLR0Z5Y2lrZ2UxeHVJQ0FnSUhaaGNpQnpkR0Z5ZENBOUlEQTdYRzRnSUNBZ1ptOXlJQ2c3SUhOMFlYSjBJRHdnWVhKeUxteGxibWQwYURzZ2MzUmhjblFyS3lrZ2UxeHVJQ0FnSUNBZ2FXWWdLR0Z5Y2x0emRHRnlkRjBnSVQwOUlDY25LU0JpY21WaGF6dGNiaUFnSUNCOVhHNWNiaUFnSUNCMllYSWdaVzVrSUQwZ1lYSnlMbXhsYm1kMGFDQXRJREU3WEc0Z0lDQWdabTl5SUNnN0lHVnVaQ0ErUFNBd095QmxibVF0TFNrZ2UxeHVJQ0FnSUNBZ2FXWWdLR0Z5Y2x0bGJtUmRJQ0U5UFNBbkp5a2dZbkpsWVdzN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnYVdZZ0tITjBZWEowSUQ0Z1pXNWtLU0J5WlhSMWNtNGdXMTA3WEc0Z0lDQWdjbVYwZFhKdUlHRnljaTV6YkdsalpTaHpkR0Z5ZEN3Z1pXNWtJQzBnYzNSaGNuUWdLeUF4S1R0Y2JpQWdmVnh1WEc0Z0lIWmhjaUJtY205dFVHRnlkSE1nUFNCMGNtbHRLR1p5YjIwdWMzQnNhWFFvSnk4bktTazdYRzRnSUhaaGNpQjBiMUJoY25SeklEMGdkSEpwYlNoMGJ5NXpjR3hwZENnbkx5Y3BLVHRjYmx4dUlDQjJZWElnYkdWdVozUm9JRDBnVFdGMGFDNXRhVzRvWm5KdmJWQmhjblJ6TG14bGJtZDBhQ3dnZEc5UVlYSjBjeTVzWlc1bmRHZ3BPMXh1SUNCMllYSWdjMkZ0WlZCaGNuUnpUR1Z1WjNSb0lEMGdiR1Z1WjNSb08xeHVJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUd4bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ2FXWWdLR1p5YjIxUVlYSjBjMXRwWFNBaFBUMGdkRzlRWVhKMGMxdHBYU2tnZTF4dUlDQWdJQ0FnYzJGdFpWQmhjblJ6VEdWdVozUm9JRDBnYVR0Y2JpQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lIMWNiaUFnZlZ4dVhHNGdJSFpoY2lCdmRYUndkWFJRWVhKMGN5QTlJRnRkTzF4dUlDQm1iM0lnS0haaGNpQnBJRDBnYzJGdFpWQmhjblJ6VEdWdVozUm9PeUJwSUR3Z1puSnZiVkJoY25SekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdiM1YwY0hWMFVHRnlkSE11Y0hWemFDZ25MaTRuS1R0Y2JpQWdmVnh1WEc0Z0lHOTFkSEIxZEZCaGNuUnpJRDBnYjNWMGNIVjBVR0Z5ZEhNdVkyOXVZMkYwS0hSdlVHRnlkSE11YzJ4cFkyVW9jMkZ0WlZCaGNuUnpUR1Z1WjNSb0tTazdYRzVjYmlBZ2NtVjBkWEp1SUc5MWRIQjFkRkJoY25SekxtcHZhVzRvSnk4bktUdGNibjA3WEc1Y2JtVjRjRzl5ZEhNdWMyVndJRDBnSnk4bk8xeHVaWGh3YjNKMGN5NWtaV3hwYldsMFpYSWdQU0FuT2ljN1hHNWNibVY0Y0c5eWRITXVaR2x5Ym1GdFpTQTlJR1oxYm1OMGFXOXVLSEJoZEdncElIdGNiaUFnZG1GeUlISmxjM1ZzZENBOUlITndiR2wwVUdGMGFDaHdZWFJvS1N4Y2JpQWdJQ0FnSUhKdmIzUWdQU0J5WlhOMWJIUmJNRjBzWEc0Z0lDQWdJQ0JrYVhJZ1BTQnlaWE4xYkhSYk1WMDdYRzVjYmlBZ2FXWWdLQ0Z5YjI5MElDWW1JQ0ZrYVhJcElIdGNiaUFnSUNBdkx5Qk9ieUJrYVhKdVlXMWxJSGRvWVhSemIyVjJaWEpjYmlBZ0lDQnlaWFIxY200Z0p5NG5PMXh1SUNCOVhHNWNiaUFnYVdZZ0tHUnBjaWtnZTF4dUlDQWdJQzh2SUVsMElHaGhjeUJoSUdScGNtNWhiV1VzSUhOMGNtbHdJSFJ5WVdsc2FXNW5JSE5zWVhOb1hHNGdJQ0FnWkdseUlEMGdaR2x5TG5OMVluTjBjaWd3TENCa2FYSXViR1Z1WjNSb0lDMGdNU2s3WEc0Z0lIMWNibHh1SUNCeVpYUjFjbTRnY205dmRDQXJJR1JwY2p0Y2JuMDdYRzVjYmx4dVpYaHdiM0owY3k1aVlYTmxibUZ0WlNBOUlHWjFibU4wYVc5dUtIQmhkR2dzSUdWNGRDa2dlMXh1SUNCMllYSWdaaUE5SUhOd2JHbDBVR0YwYUNod1lYUm9LVnN5WFR0Y2JpQWdMeThnVkU5RVR6b2diV0ZyWlNCMGFHbHpJR052YlhCaGNtbHpiMjRnWTJGelpTMXBibk5sYm5OcGRHbDJaU0J2YmlCM2FXNWtiM2R6UDF4dUlDQnBaaUFvWlhoMElDWW1JR1l1YzNWaWMzUnlLQzB4SUNvZ1pYaDBMbXhsYm1kMGFDa2dQVDA5SUdWNGRDa2dlMXh1SUNBZ0lHWWdQU0JtTG5OMVluTjBjaWd3TENCbUxteGxibWQwYUNBdElHVjRkQzVzWlc1bmRHZ3BPMXh1SUNCOVhHNGdJSEpsZEhWeWJpQm1PMXh1ZlR0Y2JseHVYRzVsZUhCdmNuUnpMbVY0ZEc1aGJXVWdQU0JtZFc1amRHbHZiaWh3WVhSb0tTQjdYRzRnSUhKbGRIVnliaUJ6Y0d4cGRGQmhkR2dvY0dGMGFDbGJNMTA3WEc1OU8xeHVYRzVtZFc1amRHbHZiaUJtYVd4MFpYSWdLSGh6TENCbUtTQjdYRzRnSUNBZ2FXWWdLSGh6TG1acGJIUmxjaWtnY21WMGRYSnVJSGh6TG1acGJIUmxjaWhtS1R0Y2JpQWdJQ0IyWVhJZ2NtVnpJRDBnVzEwN1hHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCNGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnSUNCcFppQW9aaWg0YzF0cFhTd2dhU3dnZUhNcEtTQnlaWE11Y0hWemFDaDRjMXRwWFNrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnlaWE03WEc1OVhHNWNiaTh2SUZOMGNtbHVaeTV3Y205MGIzUjVjR1V1YzNWaWMzUnlJQzBnYm1WbllYUnBkbVVnYVc1a1pYZ2daRzl1SjNRZ2QyOXlheUJwYmlCSlJUaGNiblpoY2lCemRXSnpkSElnUFNBbllXSW5Mbk4xWW5OMGNpZ3RNU2tnUFQwOUlDZGlKMXh1SUNBZ0lEOGdablZ1WTNScGIyNGdLSE4wY2l3Z2MzUmhjblFzSUd4bGJpa2dleUJ5WlhSMWNtNGdjM1J5TG5OMVluTjBjaWh6ZEdGeWRDd2diR1Z1S1NCOVhHNGdJQ0FnT2lCbWRXNWpkR2x2YmlBb2MzUnlMQ0J6ZEdGeWRDd2diR1Z1S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2h6ZEdGeWRDQThJREFwSUhOMFlYSjBJRDBnYzNSeUxteGxibWQwYUNBcklITjBZWEowTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzNSeUxuTjFZbk4wY2loemRHRnlkQ3dnYkdWdUtUdGNiaUFnSUNCOVhHNDdYRzRpWFgwPSIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG5cbnByb2Nlc3MubmV4dFRpY2sgPSAoZnVuY3Rpb24gKCkge1xuICAgIHZhciBjYW5TZXRJbW1lZGlhdGUgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5zZXRJbW1lZGlhdGU7XG4gICAgdmFyIGNhbk11dGF0aW9uT2JzZXJ2ZXIgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyO1xuICAgIHZhciBjYW5Qb3N0ID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cucG9zdE1lc3NhZ2UgJiYgd2luZG93LmFkZEV2ZW50TGlzdGVuZXJcbiAgICA7XG5cbiAgICBpZiAoY2FuU2V0SW1tZWRpYXRlKSB7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZikgeyByZXR1cm4gd2luZG93LnNldEltbWVkaWF0ZShmKSB9O1xuICAgIH1cblxuICAgIHZhciBxdWV1ZSA9IFtdO1xuXG4gICAgaWYgKGNhbk11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICAgICAgdmFyIGhpZGRlbkRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBxdWV1ZUxpc3QgPSBxdWV1ZS5zbGljZSgpO1xuICAgICAgICAgICAgcXVldWUubGVuZ3RoID0gMDtcbiAgICAgICAgICAgIHF1ZXVlTGlzdC5mb3JFYWNoKGZ1bmN0aW9uIChmbikge1xuICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgb2JzZXJ2ZXIub2JzZXJ2ZShoaWRkZW5EaXYsIHsgYXR0cmlidXRlczogdHJ1ZSB9KTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIGlmICghcXVldWUubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgaGlkZGVuRGl2LnNldEF0dHJpYnV0ZSgneWVzJywgJ25vJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBpZiAoY2FuUG9zdCkge1xuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbWVzc2FnZScsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgdmFyIHNvdXJjZSA9IGV2LnNvdXJjZTtcbiAgICAgICAgICAgIGlmICgoc291cmNlID09PSB3aW5kb3cgfHwgc291cmNlID09PSBudWxsKSAmJiBldi5kYXRhID09PSAncHJvY2Vzcy10aWNrJykge1xuICAgICAgICAgICAgICAgIGV2LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgICAgIGlmIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBmbiA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgIGZuKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTtcblxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICAgICAgd2luZG93LnBvc3RNZXNzYWdlKCdwcm9jZXNzLXRpY2snLCAnKicpO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICBzZXRUaW1lb3V0KGZuLCAwKTtcbiAgICB9O1xufSkoKTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG4vLyBUT0RPKHNodHlsbWFuKVxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG4iLCIoZnVuY3Rpb24gKHByb2Nlc3MsZ2xvYmFsKXtcbihmdW5jdGlvbihnbG9iYWwpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBpZiAoZ2xvYmFsLiR0cmFjZXVyUnVudGltZSkge1xuICAgIHJldHVybjtcbiAgfVxuICB2YXIgJE9iamVjdCA9IE9iamVjdDtcbiAgdmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG4gIHZhciAkY3JlYXRlID0gJE9iamVjdC5jcmVhdGU7XG4gIHZhciAkZGVmaW5lUHJvcGVydGllcyA9ICRPYmplY3QuZGVmaW5lUHJvcGVydGllcztcbiAgdmFyICRkZWZpbmVQcm9wZXJ0eSA9ICRPYmplY3QuZGVmaW5lUHJvcGVydHk7XG4gIHZhciAkZnJlZXplID0gJE9iamVjdC5mcmVlemU7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gJE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlOYW1lcyA9ICRPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcztcbiAgdmFyICRrZXlzID0gJE9iamVjdC5rZXlzO1xuICB2YXIgJGhhc093blByb3BlcnR5ID0gJE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciAkdG9TdHJpbmcgPSAkT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgdmFyICRwcmV2ZW50RXh0ZW5zaW9ucyA9IE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucztcbiAgdmFyICRzZWFsID0gT2JqZWN0LnNlYWw7XG4gIHZhciAkaXNFeHRlbnNpYmxlID0gT2JqZWN0LmlzRXh0ZW5zaWJsZTtcbiAgZnVuY3Rpb24gbm9uRW51bSh2YWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfTtcbiAgfVxuICB2YXIgbWV0aG9kID0gbm9uRW51bTtcbiAgdmFyIGNvdW50ZXIgPSAwO1xuICBmdW5jdGlvbiBuZXdVbmlxdWVTdHJpbmcoKSB7XG4gICAgcmV0dXJuICdfXyQnICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMWU5KSArICckJyArICsrY291bnRlciArICckX18nO1xuICB9XG4gIHZhciBzeW1ib2xJbnRlcm5hbFByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xEYXRhUHJvcGVydHkgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgdmFyIHN5bWJvbFZhbHVlcyA9ICRjcmVhdGUobnVsbCk7XG4gIHZhciBwcml2YXRlTmFtZXMgPSAkY3JlYXRlKG51bGwpO1xuICBmdW5jdGlvbiBpc1ByaXZhdGVOYW1lKHMpIHtcbiAgICByZXR1cm4gcHJpdmF0ZU5hbWVzW3NdO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZVByaXZhdGVOYW1lKCkge1xuICAgIHZhciBzID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gICAgcHJpdmF0ZU5hbWVzW3NdID0gdHJ1ZTtcbiAgICByZXR1cm4gcztcbiAgfVxuICBmdW5jdGlvbiBpc1NoaW1TeW1ib2woc3ltYm9sKSB7XG4gICAgcmV0dXJuIHR5cGVvZiBzeW1ib2wgPT09ICdvYmplY3QnICYmIHN5bWJvbCBpbnN0YW5jZW9mIFN5bWJvbFZhbHVlO1xuICB9XG4gIGZ1bmN0aW9uIHR5cGVPZih2KSB7XG4gICAgaWYgKGlzU2hpbVN5bWJvbCh2KSlcbiAgICAgIHJldHVybiAnc3ltYm9sJztcbiAgICByZXR1cm4gdHlwZW9mIHY7XG4gIH1cbiAgZnVuY3Rpb24gU3ltYm9sKGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIHZhbHVlID0gbmV3IFN5bWJvbFZhbHVlKGRlc2NyaXB0aW9uKTtcbiAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgU3ltYm9sKSlcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdTeW1ib2wgY2Fubm90IGJlIG5ld1xcJ2VkJyk7XG4gIH1cbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbC5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIG5vbkVudW0oU3ltYm9sKSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAndG9TdHJpbmcnLCBtZXRob2QoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN5bWJvbFZhbHVlID0gdGhpc1tzeW1ib2xEYXRhUHJvcGVydHldO1xuICAgIGlmICghZ2V0T3B0aW9uKCdzeW1ib2xzJykpXG4gICAgICByZXR1cm4gc3ltYm9sVmFsdWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgaWYgKCFzeW1ib2xWYWx1ZSlcbiAgICAgIHRocm93IFR5cGVFcnJvcignQ29udmVyc2lvbiBmcm9tIHN5bWJvbCB0byBzdHJpbmcnKTtcbiAgICB2YXIgZGVzYyA9IHN5bWJvbFZhbHVlW3N5bWJvbERlc2NyaXB0aW9uUHJvcGVydHldO1xuICAgIGlmIChkZXNjID09PSB1bmRlZmluZWQpXG4gICAgICBkZXNjID0gJyc7XG4gICAgcmV0dXJuICdTeW1ib2woJyArIGRlc2MgKyAnKSc7XG4gIH0pKTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbC5wcm90b3R5cGUsICd2YWx1ZU9mJywgbWV0aG9kKGZ1bmN0aW9uKCkge1xuICAgIHZhciBzeW1ib2xWYWx1ZSA9IHRoaXNbc3ltYm9sRGF0YVByb3BlcnR5XTtcbiAgICBpZiAoIXN5bWJvbFZhbHVlKVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdDb252ZXJzaW9uIGZyb20gc3ltYm9sIHRvIHN0cmluZycpO1xuICAgIGlmICghZ2V0T3B0aW9uKCdzeW1ib2xzJykpXG4gICAgICByZXR1cm4gc3ltYm9sVmFsdWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgcmV0dXJuIHN5bWJvbFZhbHVlO1xuICB9KSk7XG4gIGZ1bmN0aW9uIFN5bWJvbFZhbHVlKGRlc2NyaXB0aW9uKSB7XG4gICAgdmFyIGtleSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICAgICRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW1ib2xEYXRhUHJvcGVydHksIHt2YWx1ZTogdGhpc30pO1xuICAgICRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW1ib2xJbnRlcm5hbFByb3BlcnR5LCB7dmFsdWU6IGtleX0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5LCB7dmFsdWU6IGRlc2NyaXB0aW9ufSk7XG4gICAgZnJlZXplKHRoaXMpO1xuICAgIHN5bWJvbFZhbHVlc1trZXldID0gdGhpcztcbiAgfVxuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sVmFsdWUucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBub25FbnVtKFN5bWJvbCkpO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sVmFsdWUucHJvdG90eXBlLCAndG9TdHJpbmcnLCB7XG4gICAgdmFsdWU6IFN5bWJvbC5wcm90b3R5cGUudG9TdHJpbmcsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2xWYWx1ZS5wcm90b3R5cGUsICd2YWx1ZU9mJywge1xuICAgIHZhbHVlOiBTeW1ib2wucHJvdG90eXBlLnZhbHVlT2YsXG4gICAgZW51bWVyYWJsZTogZmFsc2VcbiAgfSk7XG4gIHZhciBoYXNoUHJvcGVydHkgPSBjcmVhdGVQcml2YXRlTmFtZSgpO1xuICB2YXIgaGFzaFByb3BlcnR5RGVzY3JpcHRvciA9IHt2YWx1ZTogdW5kZWZpbmVkfTtcbiAgdmFyIGhhc2hPYmplY3RQcm9wZXJ0aWVzID0ge1xuICAgIGhhc2g6IHt2YWx1ZTogdW5kZWZpbmVkfSxcbiAgICBzZWxmOiB7dmFsdWU6IHVuZGVmaW5lZH1cbiAgfTtcbiAgdmFyIGhhc2hDb3VudGVyID0gMDtcbiAgZnVuY3Rpb24gZ2V0T3duSGFzaE9iamVjdChvYmplY3QpIHtcbiAgICB2YXIgaGFzaE9iamVjdCA9IG9iamVjdFtoYXNoUHJvcGVydHldO1xuICAgIGlmIChoYXNoT2JqZWN0ICYmIGhhc2hPYmplY3Quc2VsZiA9PT0gb2JqZWN0KVxuICAgICAgcmV0dXJuIGhhc2hPYmplY3Q7XG4gICAgaWYgKCRpc0V4dGVuc2libGUob2JqZWN0KSkge1xuICAgICAgaGFzaE9iamVjdFByb3BlcnRpZXMuaGFzaC52YWx1ZSA9IGhhc2hDb3VudGVyKys7XG4gICAgICBoYXNoT2JqZWN0UHJvcGVydGllcy5zZWxmLnZhbHVlID0gb2JqZWN0O1xuICAgICAgaGFzaFByb3BlcnR5RGVzY3JpcHRvci52YWx1ZSA9ICRjcmVhdGUobnVsbCwgaGFzaE9iamVjdFByb3BlcnRpZXMpO1xuICAgICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgaGFzaFByb3BlcnR5LCBoYXNoUHJvcGVydHlEZXNjcmlwdG9yKTtcbiAgICAgIHJldHVybiBoYXNoUHJvcGVydHlEZXNjcmlwdG9yLnZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIGZyZWV6ZShvYmplY3QpIHtcbiAgICBnZXRPd25IYXNoT2JqZWN0KG9iamVjdCk7XG4gICAgcmV0dXJuICRmcmVlemUuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuICBmdW5jdGlvbiBwcmV2ZW50RXh0ZW5zaW9ucyhvYmplY3QpIHtcbiAgICBnZXRPd25IYXNoT2JqZWN0KG9iamVjdCk7XG4gICAgcmV0dXJuICRwcmV2ZW50RXh0ZW5zaW9ucy5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG4gIGZ1bmN0aW9uIHNlYWwob2JqZWN0KSB7XG4gICAgZ2V0T3duSGFzaE9iamVjdChvYmplY3QpO1xuICAgIHJldHVybiAkc2VhbC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG4gIGZyZWV6ZShTeW1ib2xWYWx1ZS5wcm90b3R5cGUpO1xuICBmdW5jdGlvbiBpc1N5bWJvbFN0cmluZyhzKSB7XG4gICAgcmV0dXJuIHN5bWJvbFZhbHVlc1tzXSB8fCBwcml2YXRlTmFtZXNbc107XG4gIH1cbiAgZnVuY3Rpb24gdG9Qcm9wZXJ0eShuYW1lKSB7XG4gICAgaWYgKGlzU2hpbVN5bWJvbChuYW1lKSlcbiAgICAgIHJldHVybiBuYW1lW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIHJldHVybiBuYW1lO1xuICB9XG4gIGZ1bmN0aW9uIHJlbW92ZVN5bWJvbEtleXMoYXJyYXkpIHtcbiAgICB2YXIgcnYgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFycmF5Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAoIWlzU3ltYm9sU3RyaW5nKGFycmF5W2ldKSkge1xuICAgICAgICBydi5wdXNoKGFycmF5W2ldKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gIGZ1bmN0aW9uIGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KSB7XG4gICAgcmV0dXJuIHJlbW92ZVN5bWJvbEtleXMoJGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KSk7XG4gIH1cbiAgZnVuY3Rpb24ga2V5cyhvYmplY3QpIHtcbiAgICByZXR1cm4gcmVtb3ZlU3ltYm9sS2V5cygka2V5cyhvYmplY3QpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMob2JqZWN0KSB7XG4gICAgdmFyIHJ2ID0gW107XG4gICAgdmFyIG5hbWVzID0gJGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc3ltYm9sID0gc3ltYm9sVmFsdWVzW25hbWVzW2ldXTtcbiAgICAgIGlmIChzeW1ib2wpIHtcbiAgICAgICAgcnYucHVzaChzeW1ib2wpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcnY7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSkge1xuICAgIHJldHVybiAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgdG9Qcm9wZXJ0eShuYW1lKSk7XG4gIH1cbiAgZnVuY3Rpb24gaGFzT3duUHJvcGVydHkobmFtZSkge1xuICAgIHJldHVybiAkaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCB0b1Byb3BlcnR5KG5hbWUpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRPcHRpb24obmFtZSkge1xuICAgIHJldHVybiBnbG9iYWwudHJhY2V1ciAmJiBnbG9iYWwudHJhY2V1ci5vcHRpb25zW25hbWVdO1xuICB9XG4gIGZ1bmN0aW9uIGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgZGVzY3JpcHRvcikge1xuICAgIGlmIChpc1NoaW1TeW1ib2wobmFtZSkpIHtcbiAgICAgIG5hbWUgPSBuYW1lW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCBkZXNjcmlwdG9yKTtcbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsT2JqZWN0KE9iamVjdCkge1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdkZWZpbmVQcm9wZXJ0eScsIHt2YWx1ZTogZGVmaW5lUHJvcGVydHl9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlOYW1lcycsIHt2YWx1ZTogZ2V0T3duUHJvcGVydHlOYW1lc30pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3InLCB7dmFsdWU6IGdldE93blByb3BlcnR5RGVzY3JpcHRvcn0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QucHJvdG90eXBlLCAnaGFzT3duUHJvcGVydHknLCB7dmFsdWU6IGhhc093blByb3BlcnR5fSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2ZyZWV6ZScsIHt2YWx1ZTogZnJlZXplfSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ3ByZXZlbnRFeHRlbnNpb25zJywge3ZhbHVlOiBwcmV2ZW50RXh0ZW5zaW9uc30pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdzZWFsJywge3ZhbHVlOiBzZWFsfSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2tleXMnLCB7dmFsdWU6IGtleXN9KTtcbiAgfVxuICBmdW5jdGlvbiBleHBvcnRTdGFyKG9iamVjdCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhhcmd1bWVudHNbaV0pO1xuICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBuYW1lcy5sZW5ndGg7IGorKykge1xuICAgICAgICB2YXIgbmFtZSA9IG5hbWVzW2pdO1xuICAgICAgICBpZiAoaXNTeW1ib2xTdHJpbmcobmFtZSkpXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIChmdW5jdGlvbihtb2QsIG5hbWUpIHtcbiAgICAgICAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCB7XG4gICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICByZXR1cm4gbW9kW25hbWVdO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSkoYXJndW1lbnRzW2ldLCBuYW1lc1tqXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cbiAgZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB4ICE9IG51bGwgJiYgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyk7XG4gIH1cbiAgZnVuY3Rpb24gdG9PYmplY3QoeCkge1xuICAgIGlmICh4ID09IG51bGwpXG4gICAgICB0aHJvdyAkVHlwZUVycm9yKCk7XG4gICAgcmV0dXJuICRPYmplY3QoeCk7XG4gIH1cbiAgZnVuY3Rpb24gY2hlY2tPYmplY3RDb2VyY2libGUoYXJndW1lbnQpIHtcbiAgICBpZiAoYXJndW1lbnQgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVmFsdWUgY2Fubm90IGJlIGNvbnZlcnRlZCB0byBhbiBPYmplY3QnKTtcbiAgICB9XG4gICAgcmV0dXJuIGFyZ3VtZW50O1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsU3ltYm9sKGdsb2JhbCwgU3ltYm9sKSB7XG4gICAgaWYgKCFnbG9iYWwuU3ltYm9sKSB7XG4gICAgICBnbG9iYWwuU3ltYm9sID0gU3ltYm9sO1xuICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9IGdldE93blByb3BlcnR5U3ltYm9scztcbiAgICB9XG4gICAgaWYgKCFnbG9iYWwuU3ltYm9sLml0ZXJhdG9yKSB7XG4gICAgICBnbG9iYWwuU3ltYm9sLml0ZXJhdG9yID0gU3ltYm9sKCdTeW1ib2wuaXRlcmF0b3InKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gc2V0dXBHbG9iYWxzKGdsb2JhbCkge1xuICAgIHBvbHlmaWxsU3ltYm9sKGdsb2JhbCwgU3ltYm9sKTtcbiAgICBnbG9iYWwuUmVmbGVjdCA9IGdsb2JhbC5SZWZsZWN0IHx8IHt9O1xuICAgIGdsb2JhbC5SZWZsZWN0Lmdsb2JhbCA9IGdsb2JhbC5SZWZsZWN0Lmdsb2JhbCB8fCBnbG9iYWw7XG4gICAgcG9seWZpbGxPYmplY3QoZ2xvYmFsLk9iamVjdCk7XG4gIH1cbiAgc2V0dXBHbG9iYWxzKGdsb2JhbCk7XG4gIGdsb2JhbC4kdHJhY2V1clJ1bnRpbWUgPSB7XG4gICAgY2hlY2tPYmplY3RDb2VyY2libGU6IGNoZWNrT2JqZWN0Q29lcmNpYmxlLFxuICAgIGNyZWF0ZVByaXZhdGVOYW1lOiBjcmVhdGVQcml2YXRlTmFtZSxcbiAgICBkZWZpbmVQcm9wZXJ0aWVzOiAkZGVmaW5lUHJvcGVydGllcyxcbiAgICBkZWZpbmVQcm9wZXJ0eTogJGRlZmluZVByb3BlcnR5LFxuICAgIGV4cG9ydFN0YXI6IGV4cG9ydFN0YXIsXG4gICAgZ2V0T3duSGFzaE9iamVjdDogZ2V0T3duSGFzaE9iamVjdCxcbiAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IsXG4gICAgZ2V0T3duUHJvcGVydHlOYW1lczogJGdldE93blByb3BlcnR5TmFtZXMsXG4gICAgaXNPYmplY3Q6IGlzT2JqZWN0LFxuICAgIGlzUHJpdmF0ZU5hbWU6IGlzUHJpdmF0ZU5hbWUsXG4gICAgaXNTeW1ib2xTdHJpbmc6IGlzU3ltYm9sU3RyaW5nLFxuICAgIGtleXM6ICRrZXlzLFxuICAgIHNldHVwR2xvYmFsczogc2V0dXBHbG9iYWxzLFxuICAgIHRvT2JqZWN0OiB0b09iamVjdCxcbiAgICB0b1Byb3BlcnR5OiB0b1Byb3BlcnR5LFxuICAgIHR5cGVvZjogdHlwZU9mXG4gIH07XG59KSh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBwYXRoO1xuICBmdW5jdGlvbiByZWxhdGl2ZVJlcXVpcmUoY2FsbGVyUGF0aCwgcmVxdWlyZWRQYXRoKSB7XG4gICAgcGF0aCA9IHBhdGggfHwgdHlwZW9mIHJlcXVpcmUgIT09ICd1bmRlZmluZWQnICYmIHJlcXVpcmUoJ3BhdGgnKTtcbiAgICBmdW5jdGlvbiBpc0RpcmVjdG9yeShwYXRoKSB7XG4gICAgICByZXR1cm4gcGF0aC5zbGljZSgtMSkgPT09ICcvJztcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNBYnNvbHV0ZShwYXRoKSB7XG4gICAgICByZXR1cm4gcGF0aFswXSA9PT0gJy8nO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpc1JlbGF0aXZlKHBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoWzBdID09PSAnLic7XG4gICAgfVxuICAgIGlmIChpc0RpcmVjdG9yeShyZXF1aXJlZFBhdGgpIHx8IGlzQWJzb2x1dGUocmVxdWlyZWRQYXRoKSlcbiAgICAgIHJldHVybjtcbiAgICByZXR1cm4gaXNSZWxhdGl2ZShyZXF1aXJlZFBhdGgpID8gcmVxdWlyZShwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGNhbGxlclBhdGgpLCByZXF1aXJlZFBhdGgpKSA6IHJlcXVpcmUocmVxdWlyZWRQYXRoKTtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUucmVxdWlyZSA9IHJlbGF0aXZlUmVxdWlyZTtcbn0pKCk7XG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgZnVuY3Rpb24gc3ByZWFkKCkge1xuICAgIHZhciBydiA9IFtdLFxuICAgICAgICBqID0gMCxcbiAgICAgICAgaXRlclJlc3VsdDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZhbHVlVG9TcHJlYWQgPSAkdHJhY2V1clJ1bnRpbWUuY2hlY2tPYmplY3RDb2VyY2libGUoYXJndW1lbnRzW2ldKTtcbiAgICAgIGlmICh0eXBlb2YgdmFsdWVUb1NwcmVhZFskdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShTeW1ib2wuaXRlcmF0b3IpXSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3Qgc3ByZWFkIG5vbi1pdGVyYWJsZSBvYmplY3QuJyk7XG4gICAgICB9XG4gICAgICB2YXIgaXRlciA9IHZhbHVlVG9TcHJlYWRbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoU3ltYm9sLml0ZXJhdG9yKV0oKTtcbiAgICAgIHdoaWxlICghKGl0ZXJSZXN1bHQgPSBpdGVyLm5leHQoKSkuZG9uZSkge1xuICAgICAgICBydltqKytdID0gaXRlclJlc3VsdC52YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5zcHJlYWQgPSBzcHJlYWQ7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciAkT2JqZWN0ID0gT2JqZWN0O1xuICB2YXIgJFR5cGVFcnJvciA9IFR5cGVFcnJvcjtcbiAgdmFyICRjcmVhdGUgPSAkT2JqZWN0LmNyZWF0ZTtcbiAgdmFyICRkZWZpbmVQcm9wZXJ0aWVzID0gJHRyYWNldXJSdW50aW1lLmRlZmluZVByb3BlcnRpZXM7XG4gIHZhciAkZGVmaW5lUHJvcGVydHkgPSAkdHJhY2V1clJ1bnRpbWUuZGVmaW5lUHJvcGVydHk7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gJHRyYWNldXJSdW50aW1lLmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbiAgdmFyICRnZXRPd25Qcm9wZXJ0eU5hbWVzID0gJHRyYWNldXJSdW50aW1lLmdldE93blByb3BlcnR5TmFtZXM7XG4gIHZhciAkZ2V0UHJvdG90eXBlT2YgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2Y7XG4gIHZhciAkX18wID0gT2JqZWN0LFxuICAgICAgZ2V0T3duUHJvcGVydHlOYW1lcyA9ICRfXzAuZ2V0T3duUHJvcGVydHlOYW1lcyxcbiAgICAgIGdldE93blByb3BlcnR5U3ltYm9scyA9ICRfXzAuZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xuICBmdW5jdGlvbiBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSkge1xuICAgIHZhciBwcm90byA9ICRnZXRQcm90b3R5cGVPZihob21lT2JqZWN0KTtcbiAgICBkbyB7XG4gICAgICB2YXIgcmVzdWx0ID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihwcm90bywgbmFtZSk7XG4gICAgICBpZiAocmVzdWx0KVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgcHJvdG8gPSAkZ2V0UHJvdG90eXBlT2YocHJvdG8pO1xuICAgIH0gd2hpbGUgKHByb3RvKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyQ29uc3RydWN0b3IoY3Rvcikge1xuICAgIHJldHVybiBjdG9yLl9fcHJvdG9fXztcbiAgfVxuICBmdW5jdGlvbiBzdXBlckNhbGwoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSwgYXJncykge1xuICAgIHJldHVybiBzdXBlckdldChzZWxmLCBob21lT2JqZWN0LCBuYW1lKS5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxuICBmdW5jdGlvbiBzdXBlckdldChzZWxmLCBob21lT2JqZWN0LCBuYW1lKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSk7XG4gICAgaWYgKGRlc2NyaXB0b3IpIHtcbiAgICAgIGlmICghZGVzY3JpcHRvci5nZXQpXG4gICAgICAgIHJldHVybiBkZXNjcmlwdG9yLnZhbHVlO1xuICAgICAgcmV0dXJuIGRlc2NyaXB0b3IuZ2V0LmNhbGwoc2VsZik7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJTZXQoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKTtcbiAgICBpZiAoZGVzY3JpcHRvciAmJiBkZXNjcmlwdG9yLnNldCkge1xuICAgICAgZGVzY3JpcHRvci5zZXQuY2FsbChzZWxmLCB2YWx1ZSk7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHRocm93ICRUeXBlRXJyb3IoKFwic3VwZXIgaGFzIG5vIHNldHRlciAnXCIgKyBuYW1lICsgXCInLlwiKSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0RGVzY3JpcHRvcnMob2JqZWN0KSB7XG4gICAgdmFyIGRlc2NyaXB0b3JzID0ge307XG4gICAgdmFyIG5hbWVzID0gZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0gbmFtZXNbaV07XG4gICAgICBkZXNjcmlwdG9yc1tuYW1lXSA9ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBuYW1lKTtcbiAgICB9XG4gICAgdmFyIHN5bWJvbHMgPSBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMob2JqZWN0KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN5bWJvbHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzeW1ib2wgPSBzeW1ib2xzW2ldO1xuICAgICAgZGVzY3JpcHRvcnNbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoc3ltYm9sKV0gPSAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoc3ltYm9sKSk7XG4gICAgfVxuICAgIHJldHVybiBkZXNjcmlwdG9ycztcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGVDbGFzcyhjdG9yLCBvYmplY3QsIHN0YXRpY09iamVjdCwgc3VwZXJDbGFzcykge1xuICAgICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsICdjb25zdHJ1Y3RvcicsIHtcbiAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMykge1xuICAgICAgaWYgKHR5cGVvZiBzdXBlckNsYXNzID09PSAnZnVuY3Rpb24nKVxuICAgICAgICBjdG9yLl9fcHJvdG9fXyA9IHN1cGVyQ2xhc3M7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9ICRjcmVhdGUoZ2V0UHJvdG9QYXJlbnQoc3VwZXJDbGFzcyksIGdldERlc2NyaXB0b3JzKG9iamVjdCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICBjdG9yLnByb3RvdHlwZSA9IG9iamVjdDtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KGN0b3IsICdwcm90b3R5cGUnLCB7XG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlXG4gICAgfSk7XG4gICAgcmV0dXJuICRkZWZpbmVQcm9wZXJ0aWVzKGN0b3IsIGdldERlc2NyaXB0b3JzKHN0YXRpY09iamVjdCkpO1xuICB9XG4gIGZ1bmN0aW9uIGdldFByb3RvUGFyZW50KHN1cGVyQ2xhc3MpIHtcbiAgICBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIHZhciBwcm90b3R5cGUgPSBzdXBlckNsYXNzLnByb3RvdHlwZTtcbiAgICAgIGlmICgkT2JqZWN0KHByb3RvdHlwZSkgPT09IHByb3RvdHlwZSB8fCBwcm90b3R5cGUgPT09IG51bGwpXG4gICAgICAgIHJldHVybiBzdXBlckNsYXNzLnByb3RvdHlwZTtcbiAgICAgIHRocm93IG5ldyAkVHlwZUVycm9yKCdzdXBlciBwcm90b3R5cGUgbXVzdCBiZSBhbiBPYmplY3Qgb3IgbnVsbCcpO1xuICAgIH1cbiAgICBpZiAoc3VwZXJDbGFzcyA9PT0gbnVsbClcbiAgICAgIHJldHVybiBudWxsO1xuICAgIHRocm93IG5ldyAkVHlwZUVycm9yKChcIlN1cGVyIGV4cHJlc3Npb24gbXVzdCBlaXRoZXIgYmUgbnVsbCBvciBhIGZ1bmN0aW9uLCBub3QgXCIgKyB0eXBlb2Ygc3VwZXJDbGFzcyArIFwiLlwiKSk7XG4gIH1cbiAgZnVuY3Rpb24gZGVmYXVsdFN1cGVyQ2FsbChzZWxmLCBob21lT2JqZWN0LCBhcmdzKSB7XG4gICAgaWYgKCRnZXRQcm90b3R5cGVPZihob21lT2JqZWN0KSAhPT0gbnVsbClcbiAgICAgIHN1cGVyQ2FsbChzZWxmLCBob21lT2JqZWN0LCAnY29uc3RydWN0b3InLCBhcmdzKTtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MgPSBjcmVhdGVDbGFzcztcbiAgJHRyYWNldXJSdW50aW1lLmRlZmF1bHRTdXBlckNhbGwgPSBkZWZhdWx0U3VwZXJDYWxsO1xuICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDYWxsID0gc3VwZXJDYWxsO1xuICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDb25zdHJ1Y3RvciA9IHN1cGVyQ29uc3RydWN0b3I7XG4gICR0cmFjZXVyUnVudGltZS5zdXBlckdldCA9IHN1cGVyR2V0O1xuICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJTZXQgPSBzdXBlclNldDtcbn0pKCk7XG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgaWYgKHR5cGVvZiAkdHJhY2V1clJ1bnRpbWUgIT09ICdvYmplY3QnKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCd0cmFjZXVyIHJ1bnRpbWUgbm90IGZvdW5kLicpO1xuICB9XG4gIHZhciBjcmVhdGVQcml2YXRlTmFtZSA9ICR0cmFjZXVyUnVudGltZS5jcmVhdGVQcml2YXRlTmFtZTtcbiAgdmFyICRkZWZpbmVQcm9wZXJ0aWVzID0gJHRyYWNldXJSdW50aW1lLmRlZmluZVByb3BlcnRpZXM7XG4gIHZhciAkZGVmaW5lUHJvcGVydHkgPSAkdHJhY2V1clJ1bnRpbWUuZGVmaW5lUHJvcGVydHk7XG4gIHZhciAkY3JlYXRlID0gT2JqZWN0LmNyZWF0ZTtcbiAgdmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG4gIGZ1bmN0aW9uIG5vbkVudW0odmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH07XG4gIH1cbiAgdmFyIFNUX05FV0JPUk4gPSAwO1xuICB2YXIgU1RfRVhFQ1VUSU5HID0gMTtcbiAgdmFyIFNUX1NVU1BFTkRFRCA9IDI7XG4gIHZhciBTVF9DTE9TRUQgPSAzO1xuICB2YXIgRU5EX1NUQVRFID0gLTI7XG4gIHZhciBSRVRIUk9XX1NUQVRFID0gLTM7XG4gIGZ1bmN0aW9uIGdldEludGVybmFsRXJyb3Ioc3RhdGUpIHtcbiAgICByZXR1cm4gbmV3IEVycm9yKCdUcmFjZXVyIGNvbXBpbGVyIGJ1ZzogaW52YWxpZCBzdGF0ZSBpbiBzdGF0ZSBtYWNoaW5lOiAnICsgc3RhdGUpO1xuICB9XG4gIGZ1bmN0aW9uIEdlbmVyYXRvckNvbnRleHQoKSB7XG4gICAgdGhpcy5zdGF0ZSA9IDA7XG4gICAgdGhpcy5HU3RhdGUgPSBTVF9ORVdCT1JOO1xuICAgIHRoaXMuc3RvcmVkRXhjZXB0aW9uID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuZmluYWxseUZhbGxUaHJvdWdoID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuc2VudF8gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5yZXR1cm5WYWx1ZSA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnRyeVN0YWNrXyA9IFtdO1xuICB9XG4gIEdlbmVyYXRvckNvbnRleHQucHJvdG90eXBlID0ge1xuICAgIHB1c2hUcnk6IGZ1bmN0aW9uKGNhdGNoU3RhdGUsIGZpbmFsbHlTdGF0ZSkge1xuICAgICAgaWYgKGZpbmFsbHlTdGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICB2YXIgZmluYWxseUZhbGxUaHJvdWdoID0gbnVsbDtcbiAgICAgICAgZm9yICh2YXIgaSA9IHRoaXMudHJ5U3RhY2tfLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgaWYgKHRoaXMudHJ5U3RhY2tfW2ldLmNhdGNoICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGZpbmFsbHlGYWxsVGhyb3VnaCA9IHRoaXMudHJ5U3RhY2tfW2ldLmNhdGNoO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGlmIChmaW5hbGx5RmFsbFRocm91Z2ggPT09IG51bGwpXG4gICAgICAgICAgZmluYWxseUZhbGxUaHJvdWdoID0gUkVUSFJPV19TVEFURTtcbiAgICAgICAgdGhpcy50cnlTdGFja18ucHVzaCh7XG4gICAgICAgICAgZmluYWxseTogZmluYWxseVN0YXRlLFxuICAgICAgICAgIGZpbmFsbHlGYWxsVGhyb3VnaDogZmluYWxseUZhbGxUaHJvdWdoXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgaWYgKGNhdGNoU3RhdGUgIT09IG51bGwpIHtcbiAgICAgICAgdGhpcy50cnlTdGFja18ucHVzaCh7Y2F0Y2g6IGNhdGNoU3RhdGV9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHBvcFRyeTogZnVuY3Rpb24oKSB7XG4gICAgICB0aGlzLnRyeVN0YWNrXy5wb3AoKTtcbiAgICB9LFxuICAgIGdldCBzZW50KCkge1xuICAgICAgdGhpcy5tYXliZVRocm93KCk7XG4gICAgICByZXR1cm4gdGhpcy5zZW50XztcbiAgICB9LFxuICAgIHNldCBzZW50KHYpIHtcbiAgICAgIHRoaXMuc2VudF8gPSB2O1xuICAgIH0sXG4gICAgZ2V0IHNlbnRJZ25vcmVUaHJvdygpIHtcbiAgICAgIHJldHVybiB0aGlzLnNlbnRfO1xuICAgIH0sXG4gICAgbWF5YmVUaHJvdzogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5hY3Rpb24gPT09ICd0aHJvdycpIHtcbiAgICAgICAgdGhpcy5hY3Rpb24gPSAnbmV4dCc7XG4gICAgICAgIHRocm93IHRoaXMuc2VudF87XG4gICAgICB9XG4gICAgfSxcbiAgICBlbmQ6IGZ1bmN0aW9uKCkge1xuICAgICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICAgIGNhc2UgRU5EX1NUQVRFOlxuICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICBjYXNlIFJFVEhST1dfU1RBVEU6XG4gICAgICAgICAgdGhyb3cgdGhpcy5zdG9yZWRFeGNlcHRpb247XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgZ2V0SW50ZXJuYWxFcnJvcih0aGlzLnN0YXRlKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGhhbmRsZUV4Y2VwdGlvbjogZnVuY3Rpb24oZXgpIHtcbiAgICAgIHRoaXMuR1N0YXRlID0gU1RfQ0xPU0VEO1xuICAgICAgdGhpcy5zdGF0ZSA9IEVORF9TVEFURTtcbiAgICAgIHRocm93IGV4O1xuICAgIH1cbiAgfTtcbiAgZnVuY3Rpb24gbmV4dE9yVGhyb3coY3R4LCBtb3ZlTmV4dCwgYWN0aW9uLCB4KSB7XG4gICAgc3dpdGNoIChjdHguR1N0YXRlKSB7XG4gICAgICBjYXNlIFNUX0VYRUNVVElORzpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKChcIlxcXCJcIiArIGFjdGlvbiArIFwiXFxcIiBvbiBleGVjdXRpbmcgZ2VuZXJhdG9yXCIpKTtcbiAgICAgIGNhc2UgU1RfQ0xPU0VEOlxuICAgICAgICBpZiAoYWN0aW9uID09ICduZXh0Jykge1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogdW5kZWZpbmVkLFxuICAgICAgICAgICAgZG9uZTogdHJ1ZVxuICAgICAgICAgIH07XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgeDtcbiAgICAgIGNhc2UgU1RfTkVXQk9STjpcbiAgICAgICAgaWYgKGFjdGlvbiA9PT0gJ3Rocm93Jykge1xuICAgICAgICAgIGN0eC5HU3RhdGUgPSBTVF9DTE9TRUQ7XG4gICAgICAgICAgdGhyb3cgeDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoeCAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgIHRocm93ICRUeXBlRXJyb3IoJ1NlbnQgdmFsdWUgdG8gbmV3Ym9ybiBnZW5lcmF0b3InKTtcbiAgICAgIGNhc2UgU1RfU1VTUEVOREVEOlxuICAgICAgICBjdHguR1N0YXRlID0gU1RfRVhFQ1VUSU5HO1xuICAgICAgICBjdHguYWN0aW9uID0gYWN0aW9uO1xuICAgICAgICBjdHguc2VudCA9IHg7XG4gICAgICAgIHZhciB2YWx1ZSA9IG1vdmVOZXh0KGN0eCk7XG4gICAgICAgIHZhciBkb25lID0gdmFsdWUgPT09IGN0eDtcbiAgICAgICAgaWYgKGRvbmUpXG4gICAgICAgICAgdmFsdWUgPSBjdHgucmV0dXJuVmFsdWU7XG4gICAgICAgIGN0eC5HU3RhdGUgPSBkb25lID8gU1RfQ0xPU0VEIDogU1RfU1VTUEVOREVEO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICBkb25lOiBkb25lXG4gICAgICAgIH07XG4gICAgfVxuICB9XG4gIHZhciBjdHhOYW1lID0gY3JlYXRlUHJpdmF0ZU5hbWUoKTtcbiAgdmFyIG1vdmVOZXh0TmFtZSA9IGNyZWF0ZVByaXZhdGVOYW1lKCk7XG4gIGZ1bmN0aW9uIEdlbmVyYXRvckZ1bmN0aW9uKCkge31cbiAgZnVuY3Rpb24gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUoKSB7fVxuICBHZW5lcmF0b3JGdW5jdGlvbi5wcm90b3R5cGUgPSBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZTtcbiAgJGRlZmluZVByb3BlcnR5KEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBub25FbnVtKEdlbmVyYXRvckZ1bmN0aW9uKSk7XG4gIEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLnByb3RvdHlwZSA9IHtcbiAgICBjb25zdHJ1Y3RvcjogR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUsXG4gICAgbmV4dDogZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIG5leHRPclRocm93KHRoaXNbY3R4TmFtZV0sIHRoaXNbbW92ZU5leHROYW1lXSwgJ25leHQnLCB2KTtcbiAgICB9LFxuICAgIHRocm93OiBmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gbmV4dE9yVGhyb3codGhpc1tjdHhOYW1lXSwgdGhpc1ttb3ZlTmV4dE5hbWVdLCAndGhyb3cnLCB2KTtcbiAgICB9XG4gIH07XG4gICRkZWZpbmVQcm9wZXJ0aWVzKEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLnByb3RvdHlwZSwge1xuICAgIGNvbnN0cnVjdG9yOiB7ZW51bWVyYWJsZTogZmFsc2V9LFxuICAgIG5leHQ6IHtlbnVtZXJhYmxlOiBmYWxzZX0sXG4gICAgdGhyb3c6IHtlbnVtZXJhYmxlOiBmYWxzZX1cbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUsIFN5bWJvbC5pdGVyYXRvciwgbm9uRW51bShmdW5jdGlvbigpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfSkpO1xuICBmdW5jdGlvbiBjcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShpbm5lckZ1bmN0aW9uLCBmdW5jdGlvbk9iamVjdCwgc2VsZikge1xuICAgIHZhciBtb3ZlTmV4dCA9IGdldE1vdmVOZXh0KGlubmVyRnVuY3Rpb24sIHNlbGYpO1xuICAgIHZhciBjdHggPSBuZXcgR2VuZXJhdG9yQ29udGV4dCgpO1xuICAgIHZhciBvYmplY3QgPSAkY3JlYXRlKGZ1bmN0aW9uT2JqZWN0LnByb3RvdHlwZSk7XG4gICAgb2JqZWN0W2N0eE5hbWVdID0gY3R4O1xuICAgIG9iamVjdFttb3ZlTmV4dE5hbWVdID0gbW92ZU5leHQ7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBpbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb25PYmplY3QpIHtcbiAgICBmdW5jdGlvbk9iamVjdC5wcm90b3R5cGUgPSAkY3JlYXRlKEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLnByb3RvdHlwZSk7XG4gICAgZnVuY3Rpb25PYmplY3QuX19wcm90b19fID0gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGU7XG4gICAgcmV0dXJuIGZ1bmN0aW9uT2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIEFzeW5jRnVuY3Rpb25Db250ZXh0KCkge1xuICAgIEdlbmVyYXRvckNvbnRleHQuY2FsbCh0aGlzKTtcbiAgICB0aGlzLmVyciA9IHVuZGVmaW5lZDtcbiAgICB2YXIgY3R4ID0gdGhpcztcbiAgICBjdHgucmVzdWx0ID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICBjdHgucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICBjdHgucmVqZWN0ID0gcmVqZWN0O1xuICAgIH0pO1xuICB9XG4gIEFzeW5jRnVuY3Rpb25Db250ZXh0LnByb3RvdHlwZSA9ICRjcmVhdGUoR2VuZXJhdG9yQ29udGV4dC5wcm90b3R5cGUpO1xuICBBc3luY0Z1bmN0aW9uQ29udGV4dC5wcm90b3R5cGUuZW5kID0gZnVuY3Rpb24oKSB7XG4gICAgc3dpdGNoICh0aGlzLnN0YXRlKSB7XG4gICAgICBjYXNlIEVORF9TVEFURTpcbiAgICAgICAgdGhpcy5yZXNvbHZlKHRoaXMucmV0dXJuVmFsdWUpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgUkVUSFJPV19TVEFURTpcbiAgICAgICAgdGhpcy5yZWplY3QodGhpcy5zdG9yZWRFeGNlcHRpb24pO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRoaXMucmVqZWN0KGdldEludGVybmFsRXJyb3IodGhpcy5zdGF0ZSkpO1xuICAgIH1cbiAgfTtcbiAgQXN5bmNGdW5jdGlvbkNvbnRleHQucHJvdG90eXBlLmhhbmRsZUV4Y2VwdGlvbiA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3RhdGUgPSBSRVRIUk9XX1NUQVRFO1xuICB9O1xuICBmdW5jdGlvbiBhc3luY1dyYXAoaW5uZXJGdW5jdGlvbiwgc2VsZikge1xuICAgIHZhciBtb3ZlTmV4dCA9IGdldE1vdmVOZXh0KGlubmVyRnVuY3Rpb24sIHNlbGYpO1xuICAgIHZhciBjdHggPSBuZXcgQXN5bmNGdW5jdGlvbkNvbnRleHQoKTtcbiAgICBjdHguY3JlYXRlQ2FsbGJhY2sgPSBmdW5jdGlvbihuZXdTdGF0ZSkge1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIGN0eC5zdGF0ZSA9IG5ld1N0YXRlO1xuICAgICAgICBjdHgudmFsdWUgPSB2YWx1ZTtcbiAgICAgICAgbW92ZU5leHQoY3R4KTtcbiAgICAgIH07XG4gICAgfTtcbiAgICBjdHguZXJyYmFjayA9IGZ1bmN0aW9uKGVycikge1xuICAgICAgaGFuZGxlQ2F0Y2goY3R4LCBlcnIpO1xuICAgICAgbW92ZU5leHQoY3R4KTtcbiAgICB9O1xuICAgIG1vdmVOZXh0KGN0eCk7XG4gICAgcmV0dXJuIGN0eC5yZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0TW92ZU5leHQoaW5uZXJGdW5jdGlvbiwgc2VsZikge1xuICAgIHJldHVybiBmdW5jdGlvbihjdHgpIHtcbiAgICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgcmV0dXJuIGlubmVyRnVuY3Rpb24uY2FsbChzZWxmLCBjdHgpO1xuICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgIGhhbmRsZUNhdGNoKGN0eCwgZXgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBoYW5kbGVDYXRjaChjdHgsIGV4KSB7XG4gICAgY3R4LnN0b3JlZEV4Y2VwdGlvbiA9IGV4O1xuICAgIHZhciBsYXN0ID0gY3R4LnRyeVN0YWNrX1tjdHgudHJ5U3RhY2tfLmxlbmd0aCAtIDFdO1xuICAgIGlmICghbGFzdCkge1xuICAgICAgY3R4LmhhbmRsZUV4Y2VwdGlvbihleCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGN0eC5zdGF0ZSA9IGxhc3QuY2F0Y2ggIT09IHVuZGVmaW5lZCA/IGxhc3QuY2F0Y2ggOiBsYXN0LmZpbmFsbHk7XG4gICAgaWYgKGxhc3QuZmluYWxseUZhbGxUaHJvdWdoICE9PSB1bmRlZmluZWQpXG4gICAgICBjdHguZmluYWxseUZhbGxUaHJvdWdoID0gbGFzdC5maW5hbGx5RmFsbFRocm91Z2g7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLmFzeW5jV3JhcCA9IGFzeW5jV3JhcDtcbiAgJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbiA9IGluaXRHZW5lcmF0b3JGdW5jdGlvbjtcbiAgJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlID0gY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2U7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICBmdW5jdGlvbiBidWlsZEZyb21FbmNvZGVkUGFydHMob3B0X3NjaGVtZSwgb3B0X3VzZXJJbmZvLCBvcHRfZG9tYWluLCBvcHRfcG9ydCwgb3B0X3BhdGgsIG9wdF9xdWVyeURhdGEsIG9wdF9mcmFnbWVudCkge1xuICAgIHZhciBvdXQgPSBbXTtcbiAgICBpZiAob3B0X3NjaGVtZSkge1xuICAgICAgb3V0LnB1c2gob3B0X3NjaGVtZSwgJzonKTtcbiAgICB9XG4gICAgaWYgKG9wdF9kb21haW4pIHtcbiAgICAgIG91dC5wdXNoKCcvLycpO1xuICAgICAgaWYgKG9wdF91c2VySW5mbykge1xuICAgICAgICBvdXQucHVzaChvcHRfdXNlckluZm8sICdAJyk7XG4gICAgICB9XG4gICAgICBvdXQucHVzaChvcHRfZG9tYWluKTtcbiAgICAgIGlmIChvcHRfcG9ydCkge1xuICAgICAgICBvdXQucHVzaCgnOicsIG9wdF9wb3J0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG9wdF9wYXRoKSB7XG4gICAgICBvdXQucHVzaChvcHRfcGF0aCk7XG4gICAgfVxuICAgIGlmIChvcHRfcXVlcnlEYXRhKSB7XG4gICAgICBvdXQucHVzaCgnPycsIG9wdF9xdWVyeURhdGEpO1xuICAgIH1cbiAgICBpZiAob3B0X2ZyYWdtZW50KSB7XG4gICAgICBvdXQucHVzaCgnIycsIG9wdF9mcmFnbWVudCk7XG4gICAgfVxuICAgIHJldHVybiBvdXQuam9pbignJyk7XG4gIH1cbiAgO1xuICB2YXIgc3BsaXRSZSA9IG5ldyBSZWdFeHAoJ14nICsgJyg/OicgKyAnKFteOi8/Iy5dKyknICsgJzopPycgKyAnKD86Ly8nICsgJyg/OihbXi8/I10qKUApPycgKyAnKFtcXFxcd1xcXFxkXFxcXC1cXFxcdTAxMDAtXFxcXHVmZmZmLiVdKiknICsgJyg/OjooWzAtOV0rKSk/JyArICcpPycgKyAnKFtePyNdKyk/JyArICcoPzpcXFxcPyhbXiNdKikpPycgKyAnKD86IyguKikpPycgKyAnJCcpO1xuICB2YXIgQ29tcG9uZW50SW5kZXggPSB7XG4gICAgU0NIRU1FOiAxLFxuICAgIFVTRVJfSU5GTzogMixcbiAgICBET01BSU46IDMsXG4gICAgUE9SVDogNCxcbiAgICBQQVRIOiA1LFxuICAgIFFVRVJZX0RBVEE6IDYsXG4gICAgRlJBR01FTlQ6IDdcbiAgfTtcbiAgZnVuY3Rpb24gc3BsaXQodXJpKSB7XG4gICAgcmV0dXJuICh1cmkubWF0Y2goc3BsaXRSZSkpO1xuICB9XG4gIGZ1bmN0aW9uIHJlbW92ZURvdFNlZ21lbnRzKHBhdGgpIHtcbiAgICBpZiAocGF0aCA9PT0gJy8nKVxuICAgICAgcmV0dXJuICcvJztcbiAgICB2YXIgbGVhZGluZ1NsYXNoID0gcGF0aFswXSA9PT0gJy8nID8gJy8nIDogJyc7XG4gICAgdmFyIHRyYWlsaW5nU2xhc2ggPSBwYXRoLnNsaWNlKC0xKSA9PT0gJy8nID8gJy8nIDogJyc7XG4gICAgdmFyIHNlZ21lbnRzID0gcGF0aC5zcGxpdCgnLycpO1xuICAgIHZhciBvdXQgPSBbXTtcbiAgICB2YXIgdXAgPSAwO1xuICAgIGZvciAodmFyIHBvcyA9IDA7IHBvcyA8IHNlZ21lbnRzLmxlbmd0aDsgcG9zKyspIHtcbiAgICAgIHZhciBzZWdtZW50ID0gc2VnbWVudHNbcG9zXTtcbiAgICAgIHN3aXRjaCAoc2VnbWVudCkge1xuICAgICAgICBjYXNlICcnOlxuICAgICAgICBjYXNlICcuJzpcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnLi4nOlxuICAgICAgICAgIGlmIChvdXQubGVuZ3RoKVxuICAgICAgICAgICAgb3V0LnBvcCgpO1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIHVwKys7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgb3V0LnB1c2goc2VnbWVudCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmICghbGVhZGluZ1NsYXNoKSB7XG4gICAgICB3aGlsZSAodXAtLSA+IDApIHtcbiAgICAgICAgb3V0LnVuc2hpZnQoJy4uJyk7XG4gICAgICB9XG4gICAgICBpZiAob3V0Lmxlbmd0aCA9PT0gMClcbiAgICAgICAgb3V0LnB1c2goJy4nKTtcbiAgICB9XG4gICAgcmV0dXJuIGxlYWRpbmdTbGFzaCArIG91dC5qb2luKCcvJykgKyB0cmFpbGluZ1NsYXNoO1xuICB9XG4gIGZ1bmN0aW9uIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKSB7XG4gICAgdmFyIHBhdGggPSBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSB8fCAnJztcbiAgICBwYXRoID0gcmVtb3ZlRG90U2VnbWVudHMocGF0aCk7XG4gICAgcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0gPSBwYXRoO1xuICAgIHJldHVybiBidWlsZEZyb21FbmNvZGVkUGFydHMocGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSwgcGFydHNbQ29tcG9uZW50SW5kZXguVVNFUl9JTkZPXSwgcGFydHNbQ29tcG9uZW50SW5kZXguRE9NQUlOXSwgcGFydHNbQ29tcG9uZW50SW5kZXguUE9SVF0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5RVUVSWV9EQVRBXSwgcGFydHNbQ29tcG9uZW50SW5kZXguRlJBR01FTlRdKTtcbiAgfVxuICBmdW5jdGlvbiBjYW5vbmljYWxpemVVcmwodXJsKSB7XG4gICAgdmFyIHBhcnRzID0gc3BsaXQodXJsKTtcbiAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICB9XG4gIGZ1bmN0aW9uIHJlc29sdmVVcmwoYmFzZSwgdXJsKSB7XG4gICAgdmFyIHBhcnRzID0gc3BsaXQodXJsKTtcbiAgICB2YXIgYmFzZVBhcnRzID0gc3BsaXQoYmFzZSk7XG4gICAgaWYgKHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0pIHtcbiAgICAgIHJldHVybiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0gPSBiYXNlUGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IENvbXBvbmVudEluZGV4LlNDSEVNRTsgaSA8PSBDb21wb25lbnRJbmRleC5QT1JUOyBpKyspIHtcbiAgICAgIGlmICghcGFydHNbaV0pIHtcbiAgICAgICAgcGFydHNbaV0gPSBiYXNlUGFydHNbaV07XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXVswXSA9PSAnLycpIHtcbiAgICAgIHJldHVybiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cyk7XG4gICAgfVxuICAgIHZhciBwYXRoID0gYmFzZVBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdO1xuICAgIHZhciBpbmRleCA9IHBhdGgubGFzdEluZGV4T2YoJy8nKTtcbiAgICBwYXRoID0gcGF0aC5zbGljZSgwLCBpbmRleCArIDEpICsgcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF07XG4gICAgcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0gPSBwYXRoO1xuICAgIHJldHVybiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cyk7XG4gIH1cbiAgZnVuY3Rpb24gaXNBYnNvbHV0ZShuYW1lKSB7XG4gICAgaWYgKCFuYW1lKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChuYW1lWzBdID09PSAnLycpXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB2YXIgcGFydHMgPSBzcGxpdChuYW1lKTtcbiAgICBpZiAocGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSlcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUuY2Fub25pY2FsaXplVXJsID0gY2Fub25pY2FsaXplVXJsO1xuICAkdHJhY2V1clJ1bnRpbWUuaXNBYnNvbHV0ZSA9IGlzQWJzb2x1dGU7XG4gICR0cmFjZXVyUnVudGltZS5yZW1vdmVEb3RTZWdtZW50cyA9IHJlbW92ZURvdFNlZ21lbnRzO1xuICAkdHJhY2V1clJ1bnRpbWUucmVzb2x2ZVVybCA9IHJlc29sdmVVcmw7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciB0eXBlcyA9IHtcbiAgICBhbnk6IHtuYW1lOiAnYW55J30sXG4gICAgYm9vbGVhbjoge25hbWU6ICdib29sZWFuJ30sXG4gICAgbnVtYmVyOiB7bmFtZTogJ251bWJlcid9LFxuICAgIHN0cmluZzoge25hbWU6ICdzdHJpbmcnfSxcbiAgICBzeW1ib2w6IHtuYW1lOiAnc3ltYm9sJ30sXG4gICAgdm9pZDoge25hbWU6ICd2b2lkJ31cbiAgfTtcbiAgdmFyIEdlbmVyaWNUeXBlID0gZnVuY3Rpb24gR2VuZXJpY1R5cGUodHlwZSwgYXJndW1lbnRUeXBlcykge1xuICAgIHRoaXMudHlwZSA9IHR5cGU7XG4gICAgdGhpcy5hcmd1bWVudFR5cGVzID0gYXJndW1lbnRUeXBlcztcbiAgfTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoR2VuZXJpY1R5cGUsIHt9LCB7fSk7XG4gIHZhciB0eXBlUmVnaXN0ZXIgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICBmdW5jdGlvbiBnZW5lcmljVHlwZSh0eXBlKSB7XG4gICAgZm9yICh2YXIgYXJndW1lbnRUeXBlcyA9IFtdLFxuICAgICAgICAkX18xID0gMTsgJF9fMSA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzErKylcbiAgICAgIGFyZ3VtZW50VHlwZXNbJF9fMSAtIDFdID0gYXJndW1lbnRzWyRfXzFdO1xuICAgIHZhciB0eXBlTWFwID0gdHlwZVJlZ2lzdGVyO1xuICAgIHZhciBrZXkgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duSGFzaE9iamVjdCh0eXBlKS5oYXNoO1xuICAgIGlmICghdHlwZU1hcFtrZXldKSB7XG4gICAgICB0eXBlTWFwW2tleV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIH1cbiAgICB0eXBlTWFwID0gdHlwZU1hcFtrZXldO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRUeXBlcy5sZW5ndGggLSAxOyBpKyspIHtcbiAgICAgIGtleSA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25IYXNoT2JqZWN0KGFyZ3VtZW50VHlwZXNbaV0pLmhhc2g7XG4gICAgICBpZiAoIXR5cGVNYXBba2V5XSkge1xuICAgICAgICB0eXBlTWFwW2tleV0gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgICAgfVxuICAgICAgdHlwZU1hcCA9IHR5cGVNYXBba2V5XTtcbiAgICB9XG4gICAgdmFyIHRhaWwgPSBhcmd1bWVudFR5cGVzW2FyZ3VtZW50VHlwZXMubGVuZ3RoIC0gMV07XG4gICAga2V5ID0gJHRyYWNldXJSdW50aW1lLmdldE93bkhhc2hPYmplY3QodGFpbCkuaGFzaDtcbiAgICBpZiAoIXR5cGVNYXBba2V5XSkge1xuICAgICAgdHlwZU1hcFtrZXldID0gbmV3IEdlbmVyaWNUeXBlKHR5cGUsIGFyZ3VtZW50VHlwZXMpO1xuICAgIH1cbiAgICByZXR1cm4gdHlwZU1hcFtrZXldO1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5HZW5lcmljVHlwZSA9IEdlbmVyaWNUeXBlO1xuICAkdHJhY2V1clJ1bnRpbWUuZ2VuZXJpY1R5cGUgPSBnZW5lcmljVHlwZTtcbiAgJHRyYWNldXJSdW50aW1lLnR5cGUgPSB0eXBlcztcbn0pKCk7XG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyICRfXzIgPSAkdHJhY2V1clJ1bnRpbWUsXG4gICAgICBjYW5vbmljYWxpemVVcmwgPSAkX18yLmNhbm9uaWNhbGl6ZVVybCxcbiAgICAgIHJlc29sdmVVcmwgPSAkX18yLnJlc29sdmVVcmwsXG4gICAgICBpc0Fic29sdXRlID0gJF9fMi5pc0Fic29sdXRlO1xuICB2YXIgbW9kdWxlSW5zdGFudGlhdG9ycyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHZhciBiYXNlVVJMO1xuICBpZiAoZ2xvYmFsLmxvY2F0aW9uICYmIGdsb2JhbC5sb2NhdGlvbi5ocmVmKVxuICAgIGJhc2VVUkwgPSByZXNvbHZlVXJsKGdsb2JhbC5sb2NhdGlvbi5ocmVmLCAnLi8nKTtcbiAgZWxzZVxuICAgIGJhc2VVUkwgPSAnJztcbiAgdmFyIFVuY29hdGVkTW9kdWxlRW50cnkgPSBmdW5jdGlvbiBVbmNvYXRlZE1vZHVsZUVudHJ5KHVybCwgdW5jb2F0ZWRNb2R1bGUpIHtcbiAgICB0aGlzLnVybCA9IHVybDtcbiAgICB0aGlzLnZhbHVlXyA9IHVuY29hdGVkTW9kdWxlO1xuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShVbmNvYXRlZE1vZHVsZUVudHJ5LCB7fSwge30pO1xuICB2YXIgTW9kdWxlRXZhbHVhdGlvbkVycm9yID0gZnVuY3Rpb24gTW9kdWxlRXZhbHVhdGlvbkVycm9yKGVycm9uZW91c01vZHVsZU5hbWUsIGNhdXNlKSB7XG4gICAgdGhpcy5tZXNzYWdlID0gdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgJzogJyArIHRoaXMuc3RyaXBDYXVzZShjYXVzZSkgKyAnIGluICcgKyBlcnJvbmVvdXNNb2R1bGVOYW1lO1xuICAgIGlmICghKGNhdXNlIGluc3RhbmNlb2YgJE1vZHVsZUV2YWx1YXRpb25FcnJvcikgJiYgY2F1c2Uuc3RhY2spXG4gICAgICB0aGlzLnN0YWNrID0gdGhpcy5zdHJpcFN0YWNrKGNhdXNlLnN0YWNrKTtcbiAgICBlbHNlXG4gICAgICB0aGlzLnN0YWNrID0gJyc7XG4gIH07XG4gIHZhciAkTW9kdWxlRXZhbHVhdGlvbkVycm9yID0gTW9kdWxlRXZhbHVhdGlvbkVycm9yO1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShNb2R1bGVFdmFsdWF0aW9uRXJyb3IsIHtcbiAgICBzdHJpcEVycm9yOiBmdW5jdGlvbihtZXNzYWdlKSB7XG4gICAgICByZXR1cm4gbWVzc2FnZS5yZXBsYWNlKC8uKkVycm9yOi8sIHRoaXMuY29uc3RydWN0b3IubmFtZSArICc6Jyk7XG4gICAgfSxcbiAgICBzdHJpcENhdXNlOiBmdW5jdGlvbihjYXVzZSkge1xuICAgICAgaWYgKCFjYXVzZSlcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgaWYgKCFjYXVzZS5tZXNzYWdlKVxuICAgICAgICByZXR1cm4gY2F1c2UgKyAnJztcbiAgICAgIHJldHVybiB0aGlzLnN0cmlwRXJyb3IoY2F1c2UubWVzc2FnZSk7XG4gICAgfSxcbiAgICBsb2FkZWRCeTogZnVuY3Rpb24obW9kdWxlTmFtZSkge1xuICAgICAgdGhpcy5zdGFjayArPSAnXFxuIGxvYWRlZCBieSAnICsgbW9kdWxlTmFtZTtcbiAgICB9LFxuICAgIHN0cmlwU3RhY2s6IGZ1bmN0aW9uKGNhdXNlU3RhY2spIHtcbiAgICAgIHZhciBzdGFjayA9IFtdO1xuICAgICAgY2F1c2VTdGFjay5zcGxpdCgnXFxuJykuc29tZSgoZnVuY3Rpb24oZnJhbWUpIHtcbiAgICAgICAgaWYgKC9VbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvci8udGVzdChmcmFtZSkpXG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIHN0YWNrLnB1c2goZnJhbWUpO1xuICAgICAgfSkpO1xuICAgICAgc3RhY2tbMF0gPSB0aGlzLnN0cmlwRXJyb3Ioc3RhY2tbMF0pO1xuICAgICAgcmV0dXJuIHN0YWNrLmpvaW4oJ1xcbicpO1xuICAgIH1cbiAgfSwge30sIEVycm9yKTtcbiAgZnVuY3Rpb24gYmVmb3JlTGluZXMobGluZXMsIG51bWJlcikge1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICB2YXIgZmlyc3QgPSBudW1iZXIgLSAzO1xuICAgIGlmIChmaXJzdCA8IDApXG4gICAgICBmaXJzdCA9IDA7XG4gICAgZm9yICh2YXIgaSA9IGZpcnN0OyBpIDwgbnVtYmVyOyBpKyspIHtcbiAgICAgIHJlc3VsdC5wdXNoKGxpbmVzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBhZnRlckxpbmVzKGxpbmVzLCBudW1iZXIpIHtcbiAgICB2YXIgbGFzdCA9IG51bWJlciArIDE7XG4gICAgaWYgKGxhc3QgPiBsaW5lcy5sZW5ndGggLSAxKVxuICAgICAgbGFzdCA9IGxpbmVzLmxlbmd0aCAtIDE7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSBudW1iZXI7IGkgPD0gbGFzdDsgaSsrKSB7XG4gICAgICByZXN1bHQucHVzaChsaW5lc1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gY29sdW1uU3BhY2luZyhjb2x1bW5zKSB7XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29sdW1ucyAtIDE7IGkrKykge1xuICAgICAgcmVzdWx0ICs9ICctJztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICB2YXIgVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IgPSBmdW5jdGlvbiBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcih1cmwsIGZ1bmMpIHtcbiAgICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJDb25zdHJ1Y3RvcigkVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IpLmNhbGwodGhpcywgdXJsLCBudWxsKTtcbiAgICB0aGlzLmZ1bmMgPSBmdW5jO1xuICB9O1xuICB2YXIgJFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yID0gVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3I7XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yLCB7Z2V0VW5jb2F0ZWRNb2R1bGU6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMudmFsdWVfKVxuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZV87XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgcmVsYXRpdmVSZXF1aXJlO1xuICAgICAgICBpZiAodHlwZW9mICR0cmFjZXVyUnVudGltZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcmVsYXRpdmVSZXF1aXJlID0gJHRyYWNldXJSdW50aW1lLnJlcXVpcmUuYmluZChudWxsLCB0aGlzLnVybCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVfID0gdGhpcy5mdW5jLmNhbGwoZ2xvYmFsLCByZWxhdGl2ZVJlcXVpcmUpO1xuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgaWYgKGV4IGluc3RhbmNlb2YgTW9kdWxlRXZhbHVhdGlvbkVycm9yKSB7XG4gICAgICAgICAgZXgubG9hZGVkQnkodGhpcy51cmwpO1xuICAgICAgICAgIHRocm93IGV4O1xuICAgICAgICB9XG4gICAgICAgIGlmIChleC5zdGFjaykge1xuICAgICAgICAgIHZhciBsaW5lcyA9IHRoaXMuZnVuYy50b1N0cmluZygpLnNwbGl0KCdcXG4nKTtcbiAgICAgICAgICB2YXIgZXZhbGVkID0gW107XG4gICAgICAgICAgZXguc3RhY2suc3BsaXQoJ1xcbicpLnNvbWUoZnVuY3Rpb24oZnJhbWUpIHtcbiAgICAgICAgICAgIGlmIChmcmFtZS5pbmRleE9mKCdVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvci5nZXRVbmNvYXRlZE1vZHVsZScpID4gMClcbiAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB2YXIgbSA9IC8oYXRcXHNbXlxcc10qXFxzKS4qPjooXFxkKik6KFxcZCopXFwpLy5leGVjKGZyYW1lKTtcbiAgICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAgIHZhciBsaW5lID0gcGFyc2VJbnQobVsyXSwgMTApO1xuICAgICAgICAgICAgICBldmFsZWQgPSBldmFsZWQuY29uY2F0KGJlZm9yZUxpbmVzKGxpbmVzLCBsaW5lKSk7XG4gICAgICAgICAgICAgIGV2YWxlZC5wdXNoKGNvbHVtblNwYWNpbmcobVszXSkgKyAnXicpO1xuICAgICAgICAgICAgICBldmFsZWQgPSBldmFsZWQuY29uY2F0KGFmdGVyTGluZXMobGluZXMsIGxpbmUpKTtcbiAgICAgICAgICAgICAgZXZhbGVkLnB1c2goJz0gPSA9ID0gPSA9ID0gPSA9Jyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBldmFsZWQucHVzaChmcmFtZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgZXguc3RhY2sgPSBldmFsZWQuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgICAgdGhyb3cgbmV3IE1vZHVsZUV2YWx1YXRpb25FcnJvcih0aGlzLnVybCwgZXgpO1xuICAgICAgfVxuICAgIH19LCB7fSwgVW5jb2F0ZWRNb2R1bGVFbnRyeSk7XG4gIGZ1bmN0aW9uIGdldFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5hbWUpIHtcbiAgICBpZiAoIW5hbWUpXG4gICAgICByZXR1cm47XG4gICAgdmFyIHVybCA9IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZShuYW1lKTtcbiAgICByZXR1cm4gbW9kdWxlSW5zdGFudGlhdG9yc1t1cmxdO1xuICB9XG4gIDtcbiAgdmFyIG1vZHVsZUluc3RhbmNlcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIHZhciBsaXZlTW9kdWxlU2VudGluZWwgPSB7fTtcbiAgZnVuY3Rpb24gTW9kdWxlKHVuY29hdGVkTW9kdWxlKSB7XG4gICAgdmFyIGlzTGl2ZSA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgY29hdGVkTW9kdWxlID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh1bmNvYXRlZE1vZHVsZSkuZm9yRWFjaCgoZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyIGdldHRlcixcbiAgICAgICAgICB2YWx1ZTtcbiAgICAgIGlmIChpc0xpdmUgPT09IGxpdmVNb2R1bGVTZW50aW5lbCkge1xuICAgICAgICB2YXIgZGVzY3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHVuY29hdGVkTW9kdWxlLCBuYW1lKTtcbiAgICAgICAgaWYgKGRlc2NyLmdldClcbiAgICAgICAgICBnZXR0ZXIgPSBkZXNjci5nZXQ7XG4gICAgICB9XG4gICAgICBpZiAoIWdldHRlcikge1xuICAgICAgICB2YWx1ZSA9IHVuY29hdGVkTW9kdWxlW25hbWVdO1xuICAgICAgICBnZXR0ZXIgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoY29hdGVkTW9kdWxlLCBuYW1lLCB7XG4gICAgICAgIGdldDogZ2V0dGVyLFxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICB9KTtcbiAgICB9KSk7XG4gICAgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zKGNvYXRlZE1vZHVsZSk7XG4gICAgcmV0dXJuIGNvYXRlZE1vZHVsZTtcbiAgfVxuICB2YXIgTW9kdWxlU3RvcmUgPSB7XG4gICAgbm9ybWFsaXplOiBmdW5jdGlvbihuYW1lLCByZWZlcmVyTmFtZSwgcmVmZXJlckFkZHJlc3MpIHtcbiAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ21vZHVsZSBuYW1lIG11c3QgYmUgYSBzdHJpbmcsIG5vdCAnICsgdHlwZW9mIG5hbWUpO1xuICAgICAgaWYgKGlzQWJzb2x1dGUobmFtZSkpXG4gICAgICAgIHJldHVybiBjYW5vbmljYWxpemVVcmwobmFtZSk7XG4gICAgICBpZiAoL1teXFwuXVxcL1xcLlxcLlxcLy8udGVzdChuYW1lKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21vZHVsZSBuYW1lIGVtYmVkcyAvLi4vOiAnICsgbmFtZSk7XG4gICAgICB9XG4gICAgICBpZiAobmFtZVswXSA9PT0gJy4nICYmIHJlZmVyZXJOYW1lKVxuICAgICAgICByZXR1cm4gcmVzb2x2ZVVybChyZWZlcmVyTmFtZSwgbmFtZSk7XG4gICAgICByZXR1cm4gY2Fub25pY2FsaXplVXJsKG5hbWUpO1xuICAgIH0sXG4gICAgZ2V0OiBmdW5jdGlvbihub3JtYWxpemVkTmFtZSkge1xuICAgICAgdmFyIG0gPSBnZXRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSk7XG4gICAgICBpZiAoIW0pXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB2YXIgbW9kdWxlSW5zdGFuY2UgPSBtb2R1bGVJbnN0YW5jZXNbbS51cmxdO1xuICAgICAgaWYgKG1vZHVsZUluc3RhbmNlKVxuICAgICAgICByZXR1cm4gbW9kdWxlSW5zdGFuY2U7XG4gICAgICBtb2R1bGVJbnN0YW5jZSA9IE1vZHVsZShtLmdldFVuY29hdGVkTW9kdWxlKCksIGxpdmVNb2R1bGVTZW50aW5lbCk7XG4gICAgICByZXR1cm4gbW9kdWxlSW5zdGFuY2VzW20udXJsXSA9IG1vZHVsZUluc3RhbmNlO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihub3JtYWxpemVkTmFtZSwgbW9kdWxlKSB7XG4gICAgICBub3JtYWxpemVkTmFtZSA9IFN0cmluZyhub3JtYWxpemVkTmFtZSk7XG4gICAgICBtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSA9IG5ldyBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSwgKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kdWxlO1xuICAgICAgfSkpO1xuICAgICAgbW9kdWxlSW5zdGFuY2VzW25vcm1hbGl6ZWROYW1lXSA9IG1vZHVsZTtcbiAgICB9LFxuICAgIGdldCBiYXNlVVJMKCkge1xuICAgICAgcmV0dXJuIGJhc2VVUkw7XG4gICAgfSxcbiAgICBzZXQgYmFzZVVSTCh2KSB7XG4gICAgICBiYXNlVVJMID0gU3RyaW5nKHYpO1xuICAgIH0sXG4gICAgcmVnaXN0ZXJNb2R1bGU6IGZ1bmN0aW9uKG5hbWUsIGRlcHMsIGZ1bmMpIHtcbiAgICAgIHZhciBub3JtYWxpemVkTmFtZSA9IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZShuYW1lKTtcbiAgICAgIGlmIChtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSlcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdkdXBsaWNhdGUgbW9kdWxlIG5hbWVkICcgKyBub3JtYWxpemVkTmFtZSk7XG4gICAgICBtb2R1bGVJbnN0YW50aWF0b3JzW25vcm1hbGl6ZWROYW1lXSA9IG5ldyBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihub3JtYWxpemVkTmFtZSwgZnVuYyk7XG4gICAgfSxcbiAgICBidW5kbGVTdG9yZTogT2JqZWN0LmNyZWF0ZShudWxsKSxcbiAgICByZWdpc3RlcjogZnVuY3Rpb24obmFtZSwgZGVwcywgZnVuYykge1xuICAgICAgaWYgKCFkZXBzIHx8ICFkZXBzLmxlbmd0aCAmJiAhZnVuYy5sZW5ndGgpIHtcbiAgICAgICAgdGhpcy5yZWdpc3Rlck1vZHVsZShuYW1lLCBkZXBzLCBmdW5jKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuYnVuZGxlU3RvcmVbbmFtZV0gPSB7XG4gICAgICAgICAgZGVwczogZGVwcyxcbiAgICAgICAgICBleGVjdXRlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciAkX18wID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgdmFyIGRlcE1hcCA9IHt9O1xuICAgICAgICAgICAgZGVwcy5mb3JFYWNoKChmdW5jdGlvbihkZXAsIGluZGV4KSB7XG4gICAgICAgICAgICAgIHJldHVybiBkZXBNYXBbZGVwXSA9ICRfXzBbaW5kZXhdO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgdmFyIHJlZ2lzdHJ5RW50cnkgPSBmdW5jLmNhbGwodGhpcywgZGVwTWFwKTtcbiAgICAgICAgICAgIHJlZ2lzdHJ5RW50cnkuZXhlY3V0ZS5jYWxsKHRoaXMpO1xuICAgICAgICAgICAgcmV0dXJuIHJlZ2lzdHJ5RW50cnkuZXhwb3J0cztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSxcbiAgICBnZXRBbm9ueW1vdXNNb2R1bGU6IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgIHJldHVybiBuZXcgTW9kdWxlKGZ1bmMuY2FsbChnbG9iYWwpLCBsaXZlTW9kdWxlU2VudGluZWwpO1xuICAgIH0sXG4gICAgZ2V0Rm9yVGVzdGluZzogZnVuY3Rpb24obmFtZSkge1xuICAgICAgdmFyICRfXzAgPSB0aGlzO1xuICAgICAgaWYgKCF0aGlzLnRlc3RpbmdQcmVmaXhfKSB7XG4gICAgICAgIE9iamVjdC5rZXlzKG1vZHVsZUluc3RhbmNlcykuc29tZSgoZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgdmFyIG0gPSAvKHRyYWNldXJAW15cXC9dKlxcLykvLmV4ZWMoa2V5KTtcbiAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgJF9fMC50ZXN0aW5nUHJlZml4XyA9IG1bMV07XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmdldCh0aGlzLnRlc3RpbmdQcmVmaXhfICsgbmFtZSk7XG4gICAgfVxuICB9O1xuICB2YXIgbW9kdWxlU3RvcmVNb2R1bGUgPSBuZXcgTW9kdWxlKHtNb2R1bGVTdG9yZTogTW9kdWxlU3RvcmV9KTtcbiAgTW9kdWxlU3RvcmUuc2V0KCdAdHJhY2V1ci9zcmMvcnVudGltZS9Nb2R1bGVTdG9yZScsIG1vZHVsZVN0b3JlTW9kdWxlKTtcbiAgTW9kdWxlU3RvcmUuc2V0KCdAdHJhY2V1ci9zcmMvcnVudGltZS9Nb2R1bGVTdG9yZS5qcycsIG1vZHVsZVN0b3JlTW9kdWxlKTtcbiAgdmFyIHNldHVwR2xvYmFscyA9ICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHM7XG4gICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHMgPSBmdW5jdGlvbihnbG9iYWwpIHtcbiAgICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgfTtcbiAgJHRyYWNldXJSdW50aW1lLk1vZHVsZVN0b3JlID0gTW9kdWxlU3RvcmU7XG4gIGdsb2JhbC5TeXN0ZW0gPSB7XG4gICAgcmVnaXN0ZXI6IE1vZHVsZVN0b3JlLnJlZ2lzdGVyLmJpbmQoTW9kdWxlU3RvcmUpLFxuICAgIHJlZ2lzdGVyTW9kdWxlOiBNb2R1bGVTdG9yZS5yZWdpc3Rlck1vZHVsZS5iaW5kKE1vZHVsZVN0b3JlKSxcbiAgICBnZXQ6IE1vZHVsZVN0b3JlLmdldCxcbiAgICBzZXQ6IE1vZHVsZVN0b3JlLnNldCxcbiAgICBub3JtYWxpemU6IE1vZHVsZVN0b3JlLm5vcm1hbGl6ZVxuICB9O1xuICAkdHJhY2V1clJ1bnRpbWUuZ2V0TW9kdWxlSW1wbCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaW5zdGFudGlhdG9yID0gZ2V0VW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IobmFtZSk7XG4gICAgcmV0dXJuIGluc3RhbnRpYXRvciAmJiBpbnN0YW50aWF0b3IuZ2V0VW5jb2F0ZWRNb2R1bGUoKTtcbiAgfTtcbn0pKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiO1xuICB2YXIgJGNlaWwgPSBNYXRoLmNlaWw7XG4gIHZhciAkZmxvb3IgPSBNYXRoLmZsb29yO1xuICB2YXIgJGlzRmluaXRlID0gaXNGaW5pdGU7XG4gIHZhciAkaXNOYU4gPSBpc05hTjtcbiAgdmFyICRwb3cgPSBNYXRoLnBvdztcbiAgdmFyICRtaW4gPSBNYXRoLm1pbjtcbiAgdmFyIHRvT2JqZWN0ID0gJHRyYWNldXJSdW50aW1lLnRvT2JqZWN0O1xuICBmdW5jdGlvbiB0b1VpbnQzMih4KSB7XG4gICAgcmV0dXJuIHggPj4+IDA7XG4gIH1cbiAgZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB4ICYmICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHggPT09ICdmdW5jdGlvbicpO1xuICB9XG4gIGZ1bmN0aW9uIGlzQ2FsbGFibGUoeCkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJztcbiAgfVxuICBmdW5jdGlvbiBpc051bWJlcih4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnbnVtYmVyJztcbiAgfVxuICBmdW5jdGlvbiB0b0ludGVnZXIoeCkge1xuICAgIHggPSAreDtcbiAgICBpZiAoJGlzTmFOKHgpKVxuICAgICAgcmV0dXJuIDA7XG4gICAgaWYgKHggPT09IDAgfHwgISRpc0Zpbml0ZSh4KSlcbiAgICAgIHJldHVybiB4O1xuICAgIHJldHVybiB4ID4gMCA/ICRmbG9vcih4KSA6ICRjZWlsKHgpO1xuICB9XG4gIHZhciBNQVhfU0FGRV9MRU5HVEggPSAkcG93KDIsIDUzKSAtIDE7XG4gIGZ1bmN0aW9uIHRvTGVuZ3RoKHgpIHtcbiAgICB2YXIgbGVuID0gdG9JbnRlZ2VyKHgpO1xuICAgIHJldHVybiBsZW4gPCAwID8gMCA6ICRtaW4obGVuLCBNQVhfU0FGRV9MRU5HVEgpO1xuICB9XG4gIGZ1bmN0aW9uIGNoZWNrSXRlcmFibGUoeCkge1xuICAgIHJldHVybiAhaXNPYmplY3QoeCkgPyB1bmRlZmluZWQgOiB4W1N5bWJvbC5pdGVyYXRvcl07XG4gIH1cbiAgZnVuY3Rpb24gaXNDb25zdHJ1Y3Rvcih4KSB7XG4gICAgcmV0dXJuIGlzQ2FsbGFibGUoeCk7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodmFsdWUsIGRvbmUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgZG9uZTogZG9uZVxuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVEZWZpbmUob2JqZWN0LCBuYW1lLCBkZXNjcikge1xuICAgIGlmICghKG5hbWUgaW4gb2JqZWN0KSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgZGVzY3IpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBtYXliZURlZmluZU1ldGhvZChvYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgbWF5YmVEZWZpbmUob2JqZWN0LCBuYW1lLCB7XG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVEZWZpbmVDb25zdChvYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgbWF5YmVEZWZpbmUob2JqZWN0LCBuYW1lLCB7XG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICBjb25maWd1cmFibGU6IGZhbHNlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2VcbiAgICB9KTtcbiAgfVxuICBmdW5jdGlvbiBtYXliZUFkZEZ1bmN0aW9ucyhvYmplY3QsIGZ1bmN0aW9ucykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZnVuY3Rpb25zLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICB2YXIgbmFtZSA9IGZ1bmN0aW9uc1tpXTtcbiAgICAgIHZhciB2YWx1ZSA9IGZ1bmN0aW9uc1tpICsgMV07XG4gICAgICBtYXliZURlZmluZU1ldGhvZChvYmplY3QsIG5hbWUsIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVBZGRDb25zdHMob2JqZWN0LCBjb25zdHMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbnN0cy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgdmFyIG5hbWUgPSBjb25zdHNbaV07XG4gICAgICB2YXIgdmFsdWUgPSBjb25zdHNbaSArIDFdO1xuICAgICAgbWF5YmVEZWZpbmVDb25zdChvYmplY3QsIG5hbWUsIHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVBZGRJdGVyYXRvcihvYmplY3QsIGZ1bmMsIFN5bWJvbCkge1xuICAgIGlmICghU3ltYm9sIHx8ICFTeW1ib2wuaXRlcmF0b3IgfHwgb2JqZWN0W1N5bWJvbC5pdGVyYXRvcl0pXG4gICAgICByZXR1cm47XG4gICAgaWYgKG9iamVjdFsnQEBpdGVyYXRvciddKVxuICAgICAgZnVuYyA9IG9iamVjdFsnQEBpdGVyYXRvciddO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgICAgdmFsdWU6IGZ1bmMsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gIH1cbiAgdmFyIHBvbHlmaWxscyA9IFtdO1xuICBmdW5jdGlvbiByZWdpc3RlclBvbHlmaWxsKGZ1bmMpIHtcbiAgICBwb2x5ZmlsbHMucHVzaChmdW5jKTtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbEFsbChnbG9iYWwpIHtcbiAgICBwb2x5ZmlsbHMuZm9yRWFjaCgoZnVuY3Rpb24oZikge1xuICAgICAgcmV0dXJuIGYoZ2xvYmFsKTtcbiAgICB9KSk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBnZXQgdG9PYmplY3QoKSB7XG4gICAgICByZXR1cm4gdG9PYmplY3Q7XG4gICAgfSxcbiAgICBnZXQgdG9VaW50MzIoKSB7XG4gICAgICByZXR1cm4gdG9VaW50MzI7XG4gICAgfSxcbiAgICBnZXQgaXNPYmplY3QoKSB7XG4gICAgICByZXR1cm4gaXNPYmplY3Q7XG4gICAgfSxcbiAgICBnZXQgaXNDYWxsYWJsZSgpIHtcbiAgICAgIHJldHVybiBpc0NhbGxhYmxlO1xuICAgIH0sXG4gICAgZ2V0IGlzTnVtYmVyKCkge1xuICAgICAgcmV0dXJuIGlzTnVtYmVyO1xuICAgIH0sXG4gICAgZ2V0IHRvSW50ZWdlcigpIHtcbiAgICAgIHJldHVybiB0b0ludGVnZXI7XG4gICAgfSxcbiAgICBnZXQgdG9MZW5ndGgoKSB7XG4gICAgICByZXR1cm4gdG9MZW5ndGg7XG4gICAgfSxcbiAgICBnZXQgY2hlY2tJdGVyYWJsZSgpIHtcbiAgICAgIHJldHVybiBjaGVja0l0ZXJhYmxlO1xuICAgIH0sXG4gICAgZ2V0IGlzQ29uc3RydWN0b3IoKSB7XG4gICAgICByZXR1cm4gaXNDb25zdHJ1Y3RvcjtcbiAgICB9LFxuICAgIGdldCBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCgpIHtcbiAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdDtcbiAgICB9LFxuICAgIGdldCBtYXliZURlZmluZSgpIHtcbiAgICAgIHJldHVybiBtYXliZURlZmluZTtcbiAgICB9LFxuICAgIGdldCBtYXliZURlZmluZU1ldGhvZCgpIHtcbiAgICAgIHJldHVybiBtYXliZURlZmluZU1ldGhvZDtcbiAgICB9LFxuICAgIGdldCBtYXliZURlZmluZUNvbnN0KCkge1xuICAgICAgcmV0dXJuIG1heWJlRGVmaW5lQ29uc3Q7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVBZGRGdW5jdGlvbnMoKSB7XG4gICAgICByZXR1cm4gbWF5YmVBZGRGdW5jdGlvbnM7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVBZGRDb25zdHMoKSB7XG4gICAgICByZXR1cm4gbWF5YmVBZGRDb25zdHM7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVBZGRJdGVyYXRvcigpIHtcbiAgICAgIHJldHVybiBtYXliZUFkZEl0ZXJhdG9yO1xuICAgIH0sXG4gICAgZ2V0IHJlZ2lzdGVyUG9seWZpbGwoKSB7XG4gICAgICByZXR1cm4gcmVnaXN0ZXJQb2x5ZmlsbDtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbEFsbCgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbEFsbDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL01hcC5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9NYXAuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBpc09iamVjdCA9ICRfXzAuaXNPYmplY3QsXG4gICAgICBtYXliZUFkZEl0ZXJhdG9yID0gJF9fMC5tYXliZUFkZEl0ZXJhdG9yLFxuICAgICAgcmVnaXN0ZXJQb2x5ZmlsbCA9ICRfXzAucmVnaXN0ZXJQb2x5ZmlsbDtcbiAgdmFyIGdldE93bkhhc2hPYmplY3QgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duSGFzaE9iamVjdDtcbiAgdmFyICRoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciBkZWxldGVkU2VudGluZWwgPSB7fTtcbiAgZnVuY3Rpb24gbG9va3VwSW5kZXgobWFwLCBrZXkpIHtcbiAgICBpZiAoaXNPYmplY3Qoa2V5KSkge1xuICAgICAgdmFyIGhhc2hPYmplY3QgPSBnZXRPd25IYXNoT2JqZWN0KGtleSk7XG4gICAgICByZXR1cm4gaGFzaE9iamVjdCAmJiBtYXAub2JqZWN0SW5kZXhfW2hhc2hPYmplY3QuaGFzaF07XG4gICAgfVxuICAgIGlmICh0eXBlb2Yga2V5ID09PSAnc3RyaW5nJylcbiAgICAgIHJldHVybiBtYXAuc3RyaW5nSW5kZXhfW2tleV07XG4gICAgcmV0dXJuIG1hcC5wcmltaXRpdmVJbmRleF9ba2V5XTtcbiAgfVxuICBmdW5jdGlvbiBpbml0TWFwKG1hcCkge1xuICAgIG1hcC5lbnRyaWVzXyA9IFtdO1xuICAgIG1hcC5vYmplY3RJbmRleF8gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIG1hcC5zdHJpbmdJbmRleF8gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIG1hcC5wcmltaXRpdmVJbmRleF8gPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIG1hcC5kZWxldGVkQ291bnRfID0gMDtcbiAgfVxuICB2YXIgTWFwID0gZnVuY3Rpb24gTWFwKCkge1xuICAgIHZhciBpdGVyYWJsZSA9IGFyZ3VtZW50c1swXTtcbiAgICBpZiAoIWlzT2JqZWN0KHRoaXMpKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTWFwIGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgdHlwZScpO1xuICAgIGlmICgkaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCAnZW50cmllc18nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTWFwIGNhbiBub3QgYmUgcmVlbnRyYW50bHkgaW5pdGlhbGlzZWQnKTtcbiAgICB9XG4gICAgaW5pdE1hcCh0aGlzKTtcbiAgICBpZiAoaXRlcmFibGUgIT09IG51bGwgJiYgaXRlcmFibGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9yICh2YXIgJF9fMiA9IGl0ZXJhYmxlWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KFN5bWJvbC5pdGVyYXRvcildKCksXG4gICAgICAgICAgJF9fMzsgISgkX18zID0gJF9fMi5uZXh0KCkpLmRvbmU7ICkge1xuICAgICAgICB2YXIgJF9fNCA9ICRfXzMudmFsdWUsXG4gICAgICAgICAgICBrZXkgPSAkX180WzBdLFxuICAgICAgICAgICAgdmFsdWUgPSAkX180WzFdO1xuICAgICAgICB7XG4gICAgICAgICAgdGhpcy5zZXQoa2V5LCB2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKE1hcCwge1xuICAgIGdldCBzaXplKCkge1xuICAgICAgcmV0dXJuIHRoaXMuZW50cmllc18ubGVuZ3RoIC8gMiAtIHRoaXMuZGVsZXRlZENvdW50XztcbiAgICB9LFxuICAgIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgaW5kZXggPSBsb29rdXBJbmRleCh0aGlzLCBrZXkpO1xuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpXG4gICAgICAgIHJldHVybiB0aGlzLmVudHJpZXNfW2luZGV4ICsgMV07XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIHZhciBvYmplY3RNb2RlID0gaXNPYmplY3Qoa2V5KTtcbiAgICAgIHZhciBzdHJpbmdNb2RlID0gdHlwZW9mIGtleSA9PT0gJ3N0cmluZyc7XG4gICAgICB2YXIgaW5kZXggPSBsb29rdXBJbmRleCh0aGlzLCBrZXkpO1xuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5lbnRyaWVzX1tpbmRleCArIDFdID0gdmFsdWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmRleCA9IHRoaXMuZW50cmllc18ubGVuZ3RoO1xuICAgICAgICB0aGlzLmVudHJpZXNfW2luZGV4XSA9IGtleTtcbiAgICAgICAgdGhpcy5lbnRyaWVzX1tpbmRleCArIDFdID0gdmFsdWU7XG4gICAgICAgIGlmIChvYmplY3RNb2RlKSB7XG4gICAgICAgICAgdmFyIGhhc2hPYmplY3QgPSBnZXRPd25IYXNoT2JqZWN0KGtleSk7XG4gICAgICAgICAgdmFyIGhhc2ggPSBoYXNoT2JqZWN0Lmhhc2g7XG4gICAgICAgICAgdGhpcy5vYmplY3RJbmRleF9baGFzaF0gPSBpbmRleDtcbiAgICAgICAgfSBlbHNlIGlmIChzdHJpbmdNb2RlKSB7XG4gICAgICAgICAgdGhpcy5zdHJpbmdJbmRleF9ba2V5XSA9IGluZGV4O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucHJpbWl0aXZlSW5kZXhfW2tleV0gPSBpbmRleDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBoYXM6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGxvb2t1cEluZGV4KHRoaXMsIGtleSkgIT09IHVuZGVmaW5lZDtcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICB2YXIgb2JqZWN0TW9kZSA9IGlzT2JqZWN0KGtleSk7XG4gICAgICB2YXIgc3RyaW5nTW9kZSA9IHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnO1xuICAgICAgdmFyIGluZGV4O1xuICAgICAgdmFyIGhhc2g7XG4gICAgICBpZiAob2JqZWN0TW9kZSkge1xuICAgICAgICB2YXIgaGFzaE9iamVjdCA9IGdldE93bkhhc2hPYmplY3Qoa2V5KTtcbiAgICAgICAgaWYgKGhhc2hPYmplY3QpIHtcbiAgICAgICAgICBpbmRleCA9IHRoaXMub2JqZWN0SW5kZXhfW2hhc2ggPSBoYXNoT2JqZWN0Lmhhc2hdO1xuICAgICAgICAgIGRlbGV0ZSB0aGlzLm9iamVjdEluZGV4X1toYXNoXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChzdHJpbmdNb2RlKSB7XG4gICAgICAgIGluZGV4ID0gdGhpcy5zdHJpbmdJbmRleF9ba2V5XTtcbiAgICAgICAgZGVsZXRlIHRoaXMuc3RyaW5nSW5kZXhfW2tleV07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmRleCA9IHRoaXMucHJpbWl0aXZlSW5kZXhfW2tleV07XG4gICAgICAgIGRlbGV0ZSB0aGlzLnByaW1pdGl2ZUluZGV4X1trZXldO1xuICAgICAgfVxuICAgICAgaWYgKGluZGV4ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5lbnRyaWVzX1tpbmRleF0gPSBkZWxldGVkU2VudGluZWw7XG4gICAgICAgIHRoaXMuZW50cmllc19baW5kZXggKyAxXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgdGhpcy5kZWxldGVkQ291bnRfKys7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgICAgaW5pdE1hcCh0aGlzKTtcbiAgICB9LFxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKGNhbGxiYWNrRm4pIHtcbiAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmVudHJpZXNfLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgIHZhciBrZXkgPSB0aGlzLmVudHJpZXNfW2ldO1xuICAgICAgICB2YXIgdmFsdWUgPSB0aGlzLmVudHJpZXNfW2kgKyAxXTtcbiAgICAgICAgaWYgKGtleSA9PT0gZGVsZXRlZFNlbnRpbmVsKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICBjYWxsYmFja0ZuLmNhbGwodGhpc0FyZywgdmFsdWUsIGtleSwgdGhpcyk7XG4gICAgICB9XG4gICAgfSxcbiAgICBlbnRyaWVzOiAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uICRfXzUoKSB7XG4gICAgICB2YXIgaSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdmFsdWU7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChpIDwgdGhpcy5lbnRyaWVzXy5sZW5ndGgpID8gOCA6IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICBrZXkgPSB0aGlzLmVudHJpZXNfW2ldO1xuICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZW50cmllc19baSArIDFdO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gOTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoa2V5ID09PSBkZWxldGVkU2VudGluZWwpID8gNCA6IDY7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMjtcbiAgICAgICAgICAgICAgcmV0dXJuIFtrZXksIHZhbHVlXTtcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5tYXliZVRocm93KCk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA0O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiAkY3R4LmVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgIH0sICRfXzUsIHRoaXMpO1xuICAgIH0pLFxuICAgIGtleXM6ICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb24gJF9fNigpIHtcbiAgICAgIHZhciBpLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB2YWx1ZTtcbiAgICAgIHJldHVybiAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UoZnVuY3Rpb24oJGN0eCkge1xuICAgICAgICB3aGlsZSAodHJ1ZSlcbiAgICAgICAgICBzd2l0Y2ggKCRjdHguc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgaSA9IDA7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKGkgPCB0aGlzLmVudHJpZXNfLmxlbmd0aCkgPyA4IDogLTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICAgIGtleSA9IHRoaXMuZW50cmllc19baV07XG4gICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5lbnRyaWVzX1tpICsgMV07XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA5O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChrZXkgPT09IGRlbGV0ZWRTZW50aW5lbCkgPyA0IDogNjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAyO1xuICAgICAgICAgICAgICByZXR1cm4ga2V5O1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAkY3R4Lm1heWJlVGhyb3coKTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDQ7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuICRjdHguZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgfSwgJF9fNiwgdGhpcyk7XG4gICAgfSksXG4gICAgdmFsdWVzOiAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uICRfXzcoKSB7XG4gICAgICB2YXIgaSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdmFsdWU7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChpIDwgdGhpcy5lbnRyaWVzXy5sZW5ndGgpID8gOCA6IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICBrZXkgPSB0aGlzLmVudHJpZXNfW2ldO1xuICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZW50cmllc19baSArIDFdO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gOTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoa2V5ID09PSBkZWxldGVkU2VudGluZWwpID8gNCA6IDY7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMjtcbiAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAkY3R4Lm1heWJlVGhyb3coKTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDQ7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuICRjdHguZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgfSwgJF9fNywgdGhpcyk7XG4gICAgfSlcbiAgfSwge30pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoTWFwLnByb3RvdHlwZSwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBNYXAucHJvdG90eXBlLmVudHJpZXNcbiAgfSk7XG4gIGZ1bmN0aW9uIHBvbHlmaWxsTWFwKGdsb2JhbCkge1xuICAgIHZhciAkX180ID0gZ2xvYmFsLFxuICAgICAgICBPYmplY3QgPSAkX180Lk9iamVjdCxcbiAgICAgICAgU3ltYm9sID0gJF9fNC5TeW1ib2w7XG4gICAgaWYgKCFnbG9iYWwuTWFwKVxuICAgICAgZ2xvYmFsLk1hcCA9IE1hcDtcbiAgICB2YXIgbWFwUHJvdG90eXBlID0gZ2xvYmFsLk1hcC5wcm90b3R5cGU7XG4gICAgaWYgKG1hcFByb3RvdHlwZS5lbnRyaWVzID09PSB1bmRlZmluZWQpXG4gICAgICBnbG9iYWwuTWFwID0gTWFwO1xuICAgIGlmIChtYXBQcm90b3R5cGUuZW50cmllcykge1xuICAgICAgbWF5YmVBZGRJdGVyYXRvcihtYXBQcm90b3R5cGUsIG1hcFByb3RvdHlwZS5lbnRyaWVzLCBTeW1ib2wpO1xuICAgICAgbWF5YmVBZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YobmV3IGdsb2JhbC5NYXAoKS5lbnRyaWVzKCkpLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LCBTeW1ib2wpO1xuICAgIH1cbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsTWFwKTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgTWFwKCkge1xuICAgICAgcmV0dXJuIE1hcDtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbE1hcCgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbE1hcDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9NYXAuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1NldC5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TZXQuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBpc09iamVjdCA9ICRfXzAuaXNPYmplY3QsXG4gICAgICBtYXliZUFkZEl0ZXJhdG9yID0gJF9fMC5tYXliZUFkZEl0ZXJhdG9yLFxuICAgICAgcmVnaXN0ZXJQb2x5ZmlsbCA9ICRfXzAucmVnaXN0ZXJQb2x5ZmlsbDtcbiAgdmFyIE1hcCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9NYXAuanNcIikuTWFwO1xuICB2YXIgZ2V0T3duSGFzaE9iamVjdCA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25IYXNoT2JqZWN0O1xuICB2YXIgJGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgZnVuY3Rpb24gaW5pdFNldChzZXQpIHtcbiAgICBzZXQubWFwXyA9IG5ldyBNYXAoKTtcbiAgfVxuICB2YXIgU2V0ID0gZnVuY3Rpb24gU2V0KCkge1xuICAgIHZhciBpdGVyYWJsZSA9IGFyZ3VtZW50c1swXTtcbiAgICBpZiAoIWlzT2JqZWN0KHRoaXMpKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU2V0IGNhbGxlZCBvbiBpbmNvbXBhdGlibGUgdHlwZScpO1xuICAgIGlmICgkaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCAnbWFwXycpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdTZXQgY2FuIG5vdCBiZSByZWVudHJhbnRseSBpbml0aWFsaXNlZCcpO1xuICAgIH1cbiAgICBpbml0U2V0KHRoaXMpO1xuICAgIGlmIChpdGVyYWJsZSAhPT0gbnVsbCAmJiBpdGVyYWJsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKHZhciAkX180ID0gaXRlcmFibGVbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoU3ltYm9sLml0ZXJhdG9yKV0oKSxcbiAgICAgICAgICAkX181OyAhKCRfXzUgPSAkX180Lm5leHQoKSkuZG9uZTsgKSB7XG4gICAgICAgIHZhciBpdGVtID0gJF9fNS52YWx1ZTtcbiAgICAgICAge1xuICAgICAgICAgIHRoaXMuYWRkKGl0ZW0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTZXQsIHtcbiAgICBnZXQgc2l6ZSgpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcF8uc2l6ZTtcbiAgICB9LFxuICAgIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBfLmhhcyhrZXkpO1xuICAgIH0sXG4gICAgYWRkOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHRoaXMubWFwXy5zZXQoa2V5LCBrZXkpO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwXy5kZWxldGUoa2V5KTtcbiAgICB9LFxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcF8uY2xlYXIoKTtcbiAgICB9LFxuICAgIGZvckVhY2g6IGZ1bmN0aW9uKGNhbGxiYWNrRm4pIHtcbiAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgICAgdmFyICRfXzIgPSB0aGlzO1xuICAgICAgcmV0dXJuIHRoaXMubWFwXy5mb3JFYWNoKChmdW5jdGlvbih2YWx1ZSwga2V5KSB7XG4gICAgICAgIGNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnLCBrZXksIGtleSwgJF9fMik7XG4gICAgICB9KSk7XG4gICAgfSxcbiAgICB2YWx1ZXM6ICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb24gJF9fNygpIHtcbiAgICAgIHZhciAkX184LFxuICAgICAgICAgICRfXzk7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICRfXzggPSB0aGlzLm1hcF8ua2V5cygpW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICAgICAgICAgICAgJGN0eC5zZW50ID0gdm9pZCAwO1xuICAgICAgICAgICAgICAkY3R4LmFjdGlvbiA9ICduZXh0JztcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICRfXzkgPSAkX184WyRjdHguYWN0aW9uXSgkY3R4LnNlbnRJZ25vcmVUaHJvdyk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA5O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9ICgkX185LmRvbmUpID8gMyA6IDI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAkY3R4LnNlbnQgPSAkX185LnZhbHVlO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gLTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIHJldHVybiAkX185LnZhbHVlO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuICRjdHguZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgfSwgJF9fNywgdGhpcyk7XG4gICAgfSksXG4gICAgZW50cmllczogJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbihmdW5jdGlvbiAkX18xMCgpIHtcbiAgICAgIHZhciAkX18xMSxcbiAgICAgICAgICAkX18xMjtcbiAgICAgIHJldHVybiAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UoZnVuY3Rpb24oJGN0eCkge1xuICAgICAgICB3aGlsZSAodHJ1ZSlcbiAgICAgICAgICBzd2l0Y2ggKCRjdHguc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgJF9fMTEgPSB0aGlzLm1hcF8uZW50cmllcygpW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgICAgICAgICAgICAgJGN0eC5zZW50ID0gdm9pZCAwO1xuICAgICAgICAgICAgICAkY3R4LmFjdGlvbiA9ICduZXh0JztcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICRfXzEyID0gJF9fMTFbJGN0eC5hY3Rpb25dKCRjdHguc2VudElnbm9yZVRocm93KTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKCRfXzEyLmRvbmUpID8gMyA6IDI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAkY3R4LnNlbnQgPSAkX18xMi52YWx1ZTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICByZXR1cm4gJF9fMTIudmFsdWU7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICByZXR1cm4gJGN0eC5lbmQoKTtcbiAgICAgICAgICB9XG4gICAgICB9LCAkX18xMCwgdGhpcyk7XG4gICAgfSlcbiAgfSwge30pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU2V0LnByb3RvdHlwZSwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBTZXQucHJvdG90eXBlLnZhbHVlc1xuICB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNldC5wcm90b3R5cGUsICdrZXlzJywge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICB2YWx1ZTogU2V0LnByb3RvdHlwZS52YWx1ZXNcbiAgfSk7XG4gIGZ1bmN0aW9uIHBvbHlmaWxsU2V0KGdsb2JhbCkge1xuICAgIHZhciAkX182ID0gZ2xvYmFsLFxuICAgICAgICBPYmplY3QgPSAkX182Lk9iamVjdCxcbiAgICAgICAgU3ltYm9sID0gJF9fNi5TeW1ib2w7XG4gICAgaWYgKCFnbG9iYWwuU2V0KVxuICAgICAgZ2xvYmFsLlNldCA9IFNldDtcbiAgICB2YXIgc2V0UHJvdG90eXBlID0gZ2xvYmFsLlNldC5wcm90b3R5cGU7XG4gICAgaWYgKHNldFByb3RvdHlwZS52YWx1ZXMpIHtcbiAgICAgIG1heWJlQWRkSXRlcmF0b3Ioc2V0UHJvdG90eXBlLCBzZXRQcm90b3R5cGUudmFsdWVzLCBTeW1ib2wpO1xuICAgICAgbWF5YmVBZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YobmV3IGdsb2JhbC5TZXQoKS52YWx1ZXMoKSksIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sIFN5bWJvbCk7XG4gICAgfVxuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxTZXQpO1xuICByZXR1cm4ge1xuICAgIGdldCBTZXQoKSB7XG4gICAgICByZXR1cm4gU2V0O1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsU2V0KCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsU2V0O1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1NldC5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9ub2RlX21vZHVsZXMvcnN2cC9saWIvcnN2cC9hc2FwLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvbm9kZV9tb2R1bGVzL3JzdnAvbGliL3JzdnAvYXNhcC5qc1wiO1xuICB2YXIgbGVuID0gMDtcbiAgZnVuY3Rpb24gYXNhcChjYWxsYmFjaywgYXJnKSB7XG4gICAgcXVldWVbbGVuXSA9IGNhbGxiYWNrO1xuICAgIHF1ZXVlW2xlbiArIDFdID0gYXJnO1xuICAgIGxlbiArPSAyO1xuICAgIGlmIChsZW4gPT09IDIpIHtcbiAgICAgIHNjaGVkdWxlRmx1c2goKTtcbiAgICB9XG4gIH1cbiAgdmFyICRfX2RlZmF1bHQgPSBhc2FwO1xuICB2YXIgYnJvd3Nlckdsb2JhbCA9ICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJykgPyB3aW5kb3cgOiB7fTtcbiAgdmFyIEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyID0gYnJvd3Nlckdsb2JhbC5NdXRhdGlvbk9ic2VydmVyIHx8IGJyb3dzZXJHbG9iYWwuV2ViS2l0TXV0YXRpb25PYnNlcnZlcjtcbiAgdmFyIGlzV29ya2VyID0gdHlwZW9mIFVpbnQ4Q2xhbXBlZEFycmF5ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgaW1wb3J0U2NyaXB0cyAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIE1lc3NhZ2VDaGFubmVsICE9PSAndW5kZWZpbmVkJztcbiAgZnVuY3Rpb24gdXNlTmV4dFRpY2soKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgcHJvY2Vzcy5uZXh0VGljayhmbHVzaCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiB1c2VNdXRhdGlvbk9ic2VydmVyKCkge1xuICAgIHZhciBpdGVyYXRpb25zID0gMDtcbiAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIoZmx1c2gpO1xuICAgIHZhciBub2RlID0gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoJycpO1xuICAgIG9ic2VydmVyLm9ic2VydmUobm9kZSwge2NoYXJhY3RlckRhdGE6IHRydWV9KTtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBub2RlLmRhdGEgPSAoaXRlcmF0aW9ucyA9ICsraXRlcmF0aW9ucyAlIDIpO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gdXNlTWVzc2FnZUNoYW5uZWwoKSB7XG4gICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICBjaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZsdXNoO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIGNoYW5uZWwucG9ydDIucG9zdE1lc3NhZ2UoMCk7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiB1c2VTZXRUaW1lb3V0KCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHNldFRpbWVvdXQoZmx1c2gsIDEpO1xuICAgIH07XG4gIH1cbiAgdmFyIHF1ZXVlID0gbmV3IEFycmF5KDEwMDApO1xuICBmdW5jdGlvbiBmbHVzaCgpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSArPSAyKSB7XG4gICAgICB2YXIgY2FsbGJhY2sgPSBxdWV1ZVtpXTtcbiAgICAgIHZhciBhcmcgPSBxdWV1ZVtpICsgMV07XG4gICAgICBjYWxsYmFjayhhcmcpO1xuICAgICAgcXVldWVbaV0gPSB1bmRlZmluZWQ7XG4gICAgICBxdWV1ZVtpICsgMV0gPSB1bmRlZmluZWQ7XG4gICAgfVxuICAgIGxlbiA9IDA7XG4gIH1cbiAgdmFyIHNjaGVkdWxlRmx1c2g7XG4gIGlmICh0eXBlb2YgcHJvY2VzcyAhPT0gJ3VuZGVmaW5lZCcgJiYge30udG9TdHJpbmcuY2FsbChwcm9jZXNzKSA9PT0gJ1tvYmplY3QgcHJvY2Vzc10nKSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZU5leHRUaWNrKCk7XG4gIH0gZWxzZSBpZiAoQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIpIHtcbiAgICBzY2hlZHVsZUZsdXNoID0gdXNlTXV0YXRpb25PYnNlcnZlcigpO1xuICB9IGVsc2UgaWYgKGlzV29ya2VyKSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZU1lc3NhZ2VDaGFubmVsKCk7XG4gIH0gZWxzZSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZVNldFRpbWVvdXQoKTtcbiAgfVxuICByZXR1cm4ge2dldCBkZWZhdWx0KCkge1xuICAgICAgcmV0dXJuICRfX2RlZmF1bHQ7XG4gICAgfX07XG59KTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1Byb21pc2UuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvUHJvbWlzZS5qc1wiO1xuICB2YXIgYXN5bmMgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9ub2RlX21vZHVsZXMvcnN2cC9saWIvcnN2cC9hc2FwLmpzXCIpLmRlZmF1bHQ7XG4gIHZhciByZWdpc3RlclBvbHlmaWxsID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciBwcm9taXNlUmF3ID0ge307XG4gIGZ1bmN0aW9uIGlzUHJvbWlzZSh4KSB7XG4gICAgcmV0dXJuIHggJiYgdHlwZW9mIHggPT09ICdvYmplY3QnICYmIHguc3RhdHVzXyAhPT0gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIGlkUmVzb2x2ZUhhbmRsZXIoeCkge1xuICAgIHJldHVybiB4O1xuICB9XG4gIGZ1bmN0aW9uIGlkUmVqZWN0SGFuZGxlcih4KSB7XG4gICAgdGhyb3cgeDtcbiAgfVxuICBmdW5jdGlvbiBjaGFpbihwcm9taXNlKSB7XG4gICAgdmFyIG9uUmVzb2x2ZSA9IGFyZ3VtZW50c1sxXSAhPT0gKHZvaWQgMCkgPyBhcmd1bWVudHNbMV0gOiBpZFJlc29sdmVIYW5kbGVyO1xuICAgIHZhciBvblJlamVjdCA9IGFyZ3VtZW50c1syXSAhPT0gKHZvaWQgMCkgPyBhcmd1bWVudHNbMl0gOiBpZFJlamVjdEhhbmRsZXI7XG4gICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQocHJvbWlzZS5jb25zdHJ1Y3Rvcik7XG4gICAgc3dpdGNoIChwcm9taXNlLnN0YXR1c18pIHtcbiAgICAgIGNhc2UgdW5kZWZpbmVkOlxuICAgICAgICB0aHJvdyBUeXBlRXJyb3I7XG4gICAgICBjYXNlIDA6XG4gICAgICAgIHByb21pc2Uub25SZXNvbHZlXy5wdXNoKG9uUmVzb2x2ZSwgZGVmZXJyZWQpO1xuICAgICAgICBwcm9taXNlLm9uUmVqZWN0Xy5wdXNoKG9uUmVqZWN0LCBkZWZlcnJlZCk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSArMTpcbiAgICAgICAgcHJvbWlzZUVucXVldWUocHJvbWlzZS52YWx1ZV8sIFtvblJlc29sdmUsIGRlZmVycmVkXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAtMTpcbiAgICAgICAgcHJvbWlzZUVucXVldWUocHJvbWlzZS52YWx1ZV8sIFtvblJlamVjdCwgZGVmZXJyZWRdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgfVxuICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICB9XG4gIGZ1bmN0aW9uIGdldERlZmVycmVkKEMpIHtcbiAgICBpZiAodGhpcyA9PT0gJFByb21pc2UpIHtcbiAgICAgIHZhciBwcm9taXNlID0gcHJvbWlzZUluaXQobmV3ICRQcm9taXNlKHByb21pc2VSYXcpKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHByb21pc2U6IHByb21pc2UsXG4gICAgICAgIHJlc29sdmU6IChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgcHJvbWlzZVJlc29sdmUocHJvbWlzZSwgeCk7XG4gICAgICAgIH0pLFxuICAgICAgICByZWplY3Q6IChmdW5jdGlvbihyKSB7XG4gICAgICAgICAgcHJvbWlzZVJlamVjdChwcm9taXNlLCByKTtcbiAgICAgICAgfSlcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciByZXN1bHQgPSB7fTtcbiAgICAgIHJlc3VsdC5wcm9taXNlID0gbmV3IEMoKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICByZXN1bHQucmVzb2x2ZSA9IHJlc29sdmU7XG4gICAgICAgIHJlc3VsdC5yZWplY3QgPSByZWplY3Q7XG4gICAgICB9KSk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlU2V0KHByb21pc2UsIHN0YXR1cywgdmFsdWUsIG9uUmVzb2x2ZSwgb25SZWplY3QpIHtcbiAgICBwcm9taXNlLnN0YXR1c18gPSBzdGF0dXM7XG4gICAgcHJvbWlzZS52YWx1ZV8gPSB2YWx1ZTtcbiAgICBwcm9taXNlLm9uUmVzb2x2ZV8gPSBvblJlc29sdmU7XG4gICAgcHJvbWlzZS5vblJlamVjdF8gPSBvblJlamVjdDtcbiAgICByZXR1cm4gcHJvbWlzZTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlSW5pdChwcm9taXNlKSB7XG4gICAgcmV0dXJuIHByb21pc2VTZXQocHJvbWlzZSwgMCwgdW5kZWZpbmVkLCBbXSwgW10pO1xuICB9XG4gIHZhciBQcm9taXNlID0gZnVuY3Rpb24gUHJvbWlzZShyZXNvbHZlcikge1xuICAgIGlmIChyZXNvbHZlciA9PT0gcHJvbWlzZVJhdylcbiAgICAgIHJldHVybjtcbiAgICBpZiAodHlwZW9mIHJlc29sdmVyICE9PSAnZnVuY3Rpb24nKVxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICB2YXIgcHJvbWlzZSA9IHByb21pc2VJbml0KHRoaXMpO1xuICAgIHRyeSB7XG4gICAgICByZXNvbHZlcigoZnVuY3Rpb24oeCkge1xuICAgICAgICBwcm9taXNlUmVzb2x2ZShwcm9taXNlLCB4KTtcbiAgICAgIH0pLCAoZnVuY3Rpb24ocikge1xuICAgICAgICBwcm9taXNlUmVqZWN0KHByb21pc2UsIHIpO1xuICAgICAgfSkpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHByb21pc2VSZWplY3QocHJvbWlzZSwgZSk7XG4gICAgfVxuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShQcm9taXNlLCB7XG4gICAgY2F0Y2g6IGZ1bmN0aW9uKG9uUmVqZWN0KSB7XG4gICAgICByZXR1cm4gdGhpcy50aGVuKHVuZGVmaW5lZCwgb25SZWplY3QpO1xuICAgIH0sXG4gICAgdGhlbjogZnVuY3Rpb24ob25SZXNvbHZlLCBvblJlamVjdCkge1xuICAgICAgaWYgKHR5cGVvZiBvblJlc29sdmUgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIG9uUmVzb2x2ZSA9IGlkUmVzb2x2ZUhhbmRsZXI7XG4gICAgICBpZiAodHlwZW9mIG9uUmVqZWN0ICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICBvblJlamVjdCA9IGlkUmVqZWN0SGFuZGxlcjtcbiAgICAgIHZhciB0aGF0ID0gdGhpcztcbiAgICAgIHZhciBjb25zdHJ1Y3RvciA9IHRoaXMuY29uc3RydWN0b3I7XG4gICAgICByZXR1cm4gY2hhaW4odGhpcywgZnVuY3Rpb24oeCkge1xuICAgICAgICB4ID0gcHJvbWlzZUNvZXJjZShjb25zdHJ1Y3RvciwgeCk7XG4gICAgICAgIHJldHVybiB4ID09PSB0aGF0ID8gb25SZWplY3QobmV3IFR5cGVFcnJvcikgOiBpc1Byb21pc2UoeCkgPyB4LnRoZW4ob25SZXNvbHZlLCBvblJlamVjdCkgOiBvblJlc29sdmUoeCk7XG4gICAgICB9LCBvblJlamVjdCk7XG4gICAgfVxuICB9LCB7XG4gICAgcmVzb2x2ZTogZnVuY3Rpb24oeCkge1xuICAgICAgaWYgKHRoaXMgPT09ICRQcm9taXNlKSB7XG4gICAgICAgIGlmIChpc1Byb21pc2UoeCkpIHtcbiAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcHJvbWlzZVNldChuZXcgJFByb21pc2UocHJvbWlzZVJhdyksICsxLCB4KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgdGhpcyhmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICByZXNvbHZlKHgpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9LFxuICAgIHJlamVjdDogZnVuY3Rpb24ocikge1xuICAgICAgaWYgKHRoaXMgPT09ICRQcm9taXNlKSB7XG4gICAgICAgIHJldHVybiBwcm9taXNlU2V0KG5ldyAkUHJvbWlzZShwcm9taXNlUmF3KSwgLTEsIHIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyB0aGlzKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICByZWplY3Qocik7XG4gICAgICAgIH0pKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGFsbDogZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgICB2YXIgZGVmZXJyZWQgPSBnZXREZWZlcnJlZCh0aGlzKTtcbiAgICAgIHZhciByZXNvbHV0aW9ucyA9IFtdO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIGNvdW50ID0gdmFsdWVzLmxlbmd0aDtcbiAgICAgICAgaWYgKGNvdW50ID09PSAwKSB7XG4gICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXNvbHV0aW9ucyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHRoaXMucmVzb2x2ZSh2YWx1ZXNbaV0pLnRoZW4oZnVuY3Rpb24oaSwgeCkge1xuICAgICAgICAgICAgICByZXNvbHV0aW9uc1tpXSA9IHg7XG4gICAgICAgICAgICAgIGlmICgtLWNvdW50ID09PSAwKVxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzb2x1dGlvbnMpO1xuICAgICAgICAgICAgfS5iaW5kKHVuZGVmaW5lZCwgaSksIChmdW5jdGlvbihyKSB7XG4gICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyKTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfSxcbiAgICByYWNlOiBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKHRoaXMpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB2YWx1ZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICB0aGlzLnJlc29sdmUodmFsdWVzW2ldKS50aGVuKChmdW5jdGlvbih4KSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHgpO1xuICAgICAgICAgIH0pLCAoZnVuY3Rpb24ocikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHIpO1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9XG4gIH0pO1xuICB2YXIgJFByb21pc2UgPSBQcm9taXNlO1xuICB2YXIgJFByb21pc2VSZWplY3QgPSAkUHJvbWlzZS5yZWplY3Q7XG4gIGZ1bmN0aW9uIHByb21pc2VSZXNvbHZlKHByb21pc2UsIHgpIHtcbiAgICBwcm9taXNlRG9uZShwcm9taXNlLCArMSwgeCwgcHJvbWlzZS5vblJlc29sdmVfKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlUmVqZWN0KHByb21pc2UsIHIpIHtcbiAgICBwcm9taXNlRG9uZShwcm9taXNlLCAtMSwgciwgcHJvbWlzZS5vblJlamVjdF8pO1xuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VEb25lKHByb21pc2UsIHN0YXR1cywgdmFsdWUsIHJlYWN0aW9ucykge1xuICAgIGlmIChwcm9taXNlLnN0YXR1c18gIT09IDApXG4gICAgICByZXR1cm47XG4gICAgcHJvbWlzZUVucXVldWUodmFsdWUsIHJlYWN0aW9ucyk7XG4gICAgcHJvbWlzZVNldChwcm9taXNlLCBzdGF0dXMsIHZhbHVlKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlRW5xdWV1ZSh2YWx1ZSwgdGFza3MpIHtcbiAgICBhc3luYygoZnVuY3Rpb24oKSB7XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRhc2tzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICAgIHByb21pc2VIYW5kbGUodmFsdWUsIHRhc2tzW2ldLCB0YXNrc1tpICsgMV0pO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlSGFuZGxlKHZhbHVlLCBoYW5kbGVyLCBkZWZlcnJlZCkge1xuICAgIHRyeSB7XG4gICAgICB2YXIgcmVzdWx0ID0gaGFuZGxlcih2YWx1ZSk7XG4gICAgICBpZiAocmVzdWx0ID09PSBkZWZlcnJlZC5wcm9taXNlKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgICAgZWxzZSBpZiAoaXNQcm9taXNlKHJlc3VsdCkpXG4gICAgICAgIGNoYWluKHJlc3VsdCwgZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0KTtcbiAgICAgIGVsc2VcbiAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXN1bHQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHt9XG4gICAgfVxuICB9XG4gIHZhciB0aGVuYWJsZVN5bWJvbCA9ICdAQHRoZW5hYmxlJztcbiAgZnVuY3Rpb24gaXNPYmplY3QoeCkge1xuICAgIHJldHVybiB4ICYmICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHggPT09ICdmdW5jdGlvbicpO1xuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VDb2VyY2UoY29uc3RydWN0b3IsIHgpIHtcbiAgICBpZiAoIWlzUHJvbWlzZSh4KSAmJiBpc09iamVjdCh4KSkge1xuICAgICAgdmFyIHRoZW47XG4gICAgICB0cnkge1xuICAgICAgICB0aGVuID0geC50aGVuO1xuICAgICAgfSBjYXRjaCAocikge1xuICAgICAgICB2YXIgcHJvbWlzZSA9ICRQcm9taXNlUmVqZWN0LmNhbGwoY29uc3RydWN0b3IsIHIpO1xuICAgICAgICB4W3RoZW5hYmxlU3ltYm9sXSA9IHByb21pc2U7XG4gICAgICAgIHJldHVybiBwcm9taXNlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVvZiB0aGVuID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHZhciBwID0geFt0aGVuYWJsZVN5bWJvbF07XG4gICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgcmV0dXJuIHA7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQoY29uc3RydWN0b3IpO1xuICAgICAgICAgIHhbdGhlbmFibGVTeW1ib2xdID0gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgdGhlbi5jYWxsKHgsIGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCk7XG4gICAgICAgICAgfSBjYXRjaCAocikge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHIpO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbFByb21pc2UoZ2xvYmFsKSB7XG4gICAgaWYgKCFnbG9iYWwuUHJvbWlzZSlcbiAgICAgIGdsb2JhbC5Qcm9taXNlID0gUHJvbWlzZTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsUHJvbWlzZSk7XG4gIHJldHVybiB7XG4gICAgZ2V0IFByb21pc2UoKSB7XG4gICAgICByZXR1cm4gUHJvbWlzZTtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbFByb21pc2UoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxQcm9taXNlO1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1Byb21pc2UuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZ0l0ZXJhdG9yLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciAkX18yO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdJdGVyYXRvci5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0ID0gJF9fMC5jcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCxcbiAgICAgIGlzT2JqZWN0ID0gJF9fMC5pc09iamVjdDtcbiAgdmFyIHRvUHJvcGVydHkgPSAkdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eTtcbiAgdmFyIGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgdmFyIGl0ZXJhdGVkU3RyaW5nID0gU3ltYm9sKCdpdGVyYXRlZFN0cmluZycpO1xuICB2YXIgc3RyaW5nSXRlcmF0b3JOZXh0SW5kZXggPSBTeW1ib2woJ3N0cmluZ0l0ZXJhdG9yTmV4dEluZGV4Jyk7XG4gIHZhciBTdHJpbmdJdGVyYXRvciA9IGZ1bmN0aW9uIFN0cmluZ0l0ZXJhdG9yKCkge307XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFN0cmluZ0l0ZXJhdG9yLCAoJF9fMiA9IHt9LCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fMiwgXCJuZXh0XCIsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbyA9IHRoaXM7XG4gICAgICBpZiAoIWlzT2JqZWN0KG8pIHx8ICFoYXNPd25Qcm9wZXJ0eS5jYWxsKG8sIGl0ZXJhdGVkU3RyaW5nKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCd0aGlzIG11c3QgYmUgYSBTdHJpbmdJdGVyYXRvciBvYmplY3QnKTtcbiAgICAgIH1cbiAgICAgIHZhciBzID0gb1t0b1Byb3BlcnR5KGl0ZXJhdGVkU3RyaW5nKV07XG4gICAgICBpZiAocyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCh1bmRlZmluZWQsIHRydWUpO1xuICAgICAgfVxuICAgICAgdmFyIHBvc2l0aW9uID0gb1t0b1Byb3BlcnR5KHN0cmluZ0l0ZXJhdG9yTmV4dEluZGV4KV07XG4gICAgICB2YXIgbGVuID0gcy5sZW5ndGg7XG4gICAgICBpZiAocG9zaXRpb24gPj0gbGVuKSB7XG4gICAgICAgIG9bdG9Qcm9wZXJ0eShpdGVyYXRlZFN0cmluZyldID0gdW5kZWZpbmVkO1xuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIHZhciBmaXJzdCA9IHMuY2hhckNvZGVBdChwb3NpdGlvbik7XG4gICAgICB2YXIgcmVzdWx0U3RyaW5nO1xuICAgICAgaWYgKGZpcnN0IDwgMHhEODAwIHx8IGZpcnN0ID4gMHhEQkZGIHx8IHBvc2l0aW9uICsgMSA9PT0gbGVuKSB7XG4gICAgICAgIHJlc3VsdFN0cmluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZmlyc3QpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIHNlY29uZCA9IHMuY2hhckNvZGVBdChwb3NpdGlvbiArIDEpO1xuICAgICAgICBpZiAoc2Vjb25kIDwgMHhEQzAwIHx8IHNlY29uZCA+IDB4REZGRikge1xuICAgICAgICAgIHJlc3VsdFN0cmluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZmlyc3QpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdFN0cmluZyA9IFN0cmluZy5mcm9tQ2hhckNvZGUoZmlyc3QpICsgU3RyaW5nLmZyb21DaGFyQ29kZShzZWNvbmQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBvW3RvUHJvcGVydHkoc3RyaW5nSXRlcmF0b3JOZXh0SW5kZXgpXSA9IHBvc2l0aW9uICsgcmVzdWx0U3RyaW5nLmxlbmd0aDtcbiAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdChyZXN1bHRTdHJpbmcsIGZhbHNlKTtcbiAgICB9LFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlXG4gIH0pLCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fMiwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgJF9fMiksIHt9KTtcbiAgZnVuY3Rpb24gY3JlYXRlU3RyaW5nSXRlcmF0b3Ioc3RyaW5nKSB7XG4gICAgdmFyIHMgPSBTdHJpbmcoc3RyaW5nKTtcbiAgICB2YXIgaXRlcmF0b3IgPSBPYmplY3QuY3JlYXRlKFN0cmluZ0l0ZXJhdG9yLnByb3RvdHlwZSk7XG4gICAgaXRlcmF0b3JbdG9Qcm9wZXJ0eShpdGVyYXRlZFN0cmluZyldID0gcztcbiAgICBpdGVyYXRvclt0b1Byb3BlcnR5KHN0cmluZ0l0ZXJhdG9yTmV4dEluZGV4KV0gPSAwO1xuICAgIHJldHVybiBpdGVyYXRvcjtcbiAgfVxuICByZXR1cm4ge2dldCBjcmVhdGVTdHJpbmdJdGVyYXRvcigpIHtcbiAgICAgIHJldHVybiBjcmVhdGVTdHJpbmdJdGVyYXRvcjtcbiAgICB9fTtcbn0pO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZy5qc1wiO1xuICB2YXIgY3JlYXRlU3RyaW5nSXRlcmF0b3IgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nSXRlcmF0b3IuanNcIikuY3JlYXRlU3RyaW5nSXRlcmF0b3I7XG4gIHZhciAkX18xID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgbWF5YmVBZGRGdW5jdGlvbnMgPSAkX18xLm1heWJlQWRkRnVuY3Rpb25zLFxuICAgICAgbWF5YmVBZGRJdGVyYXRvciA9ICRfXzEubWF5YmVBZGRJdGVyYXRvcixcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18xLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciAkdG9TdHJpbmcgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICB2YXIgJGluZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmluZGV4T2Y7XG4gIHZhciAkbGFzdEluZGV4T2YgPSBTdHJpbmcucHJvdG90eXBlLmxhc3RJbmRleE9mO1xuICBmdW5jdGlvbiBzdGFydHNXaXRoKHNlYXJjaCkge1xuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCB8fCAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdW5kZWZpbmVkO1xuICAgIHZhciBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChpc05hTihwb3MpKSB7XG4gICAgICBwb3MgPSAwO1xuICAgIH1cbiAgICB2YXIgc3RhcnQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIHJldHVybiAkaW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBwb3MpID09IHN0YXJ0O1xuICB9XG4gIGZ1bmN0aW9uIGVuZHNXaXRoKHNlYXJjaCkge1xuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCB8fCAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3MgPSBzdHJpbmdMZW5ndGg7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICB2YXIgcG9zaXRpb24gPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAocG9zaXRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgICAgICBpZiAoaXNOYU4ocG9zKSkge1xuICAgICAgICAgIHBvcyA9IDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgdmFyIGVuZCA9IE1hdGgubWluKE1hdGgubWF4KHBvcywgMCksIHN0cmluZ0xlbmd0aCk7XG4gICAgdmFyIHN0YXJ0ID0gZW5kIC0gc2VhcmNoTGVuZ3RoO1xuICAgIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuICRsYXN0SW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBzdGFydCkgPT0gc3RhcnQ7XG4gIH1cbiAgZnVuY3Rpb24gaW5jbHVkZXMoc2VhcmNoKSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgaWYgKHNlYXJjaCAmJiAkdG9TdHJpbmcuY2FsbChzZWFyY2gpID09ICdbb2JqZWN0IFJlZ0V4cF0nKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZ0xlbmd0aCA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHNlYXJjaFN0cmluZyA9IFN0cmluZyhzZWFyY2gpO1xuICAgIHZhciBzZWFyY2hMZW5ndGggPSBzZWFyY2hTdHJpbmcubGVuZ3RoO1xuICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50cy5sZW5ndGggPiAxID8gYXJndW1lbnRzWzFdIDogdW5kZWZpbmVkO1xuICAgIHZhciBwb3MgPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChwb3MgIT0gcG9zKSB7XG4gICAgICBwb3MgPSAwO1xuICAgIH1cbiAgICB2YXIgc3RhcnQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIGlmIChzZWFyY2hMZW5ndGggKyBzdGFydCA+IHN0cmluZ0xlbmd0aCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gJGluZGV4T2YuY2FsbChzdHJpbmcsIHNlYXJjaFN0cmluZywgcG9zKSAhPSAtMTtcbiAgfVxuICBmdW5jdGlvbiByZXBlYXQoY291bnQpIHtcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICB2YXIgbiA9IGNvdW50ID8gTnVtYmVyKGNvdW50KSA6IDA7XG4gICAgaWYgKGlzTmFOKG4pKSB7XG4gICAgICBuID0gMDtcbiAgICB9XG4gICAgaWYgKG4gPCAwIHx8IG4gPT0gSW5maW5pdHkpIHtcbiAgICAgIHRocm93IFJhbmdlRXJyb3IoKTtcbiAgICB9XG4gICAgaWYgKG4gPT0gMCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gJyc7XG4gICAgd2hpbGUgKG4tLSkge1xuICAgICAgcmVzdWx0ICs9IHN0cmluZztcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBjb2RlUG9pbnRBdChwb3NpdGlvbikge1xuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIHZhciBzaXplID0gc3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgaW5kZXggPSBwb3NpdGlvbiA/IE51bWJlcihwb3NpdGlvbikgOiAwO1xuICAgIGlmIChpc05hTihpbmRleCkpIHtcbiAgICAgIGluZGV4ID0gMDtcbiAgICB9XG4gICAgaWYgKGluZGV4IDwgMCB8fCBpbmRleCA+PSBzaXplKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICB2YXIgZmlyc3QgPSBzdHJpbmcuY2hhckNvZGVBdChpbmRleCk7XG4gICAgdmFyIHNlY29uZDtcbiAgICBpZiAoZmlyc3QgPj0gMHhEODAwICYmIGZpcnN0IDw9IDB4REJGRiAmJiBzaXplID4gaW5kZXggKyAxKSB7XG4gICAgICBzZWNvbmQgPSBzdHJpbmcuY2hhckNvZGVBdChpbmRleCArIDEpO1xuICAgICAgaWYgKHNlY29uZCA+PSAweERDMDAgJiYgc2Vjb25kIDw9IDB4REZGRikge1xuICAgICAgICByZXR1cm4gKGZpcnN0IC0gMHhEODAwKSAqIDB4NDAwICsgc2Vjb25kIC0gMHhEQzAwICsgMHgxMDAwMDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZpcnN0O1xuICB9XG4gIGZ1bmN0aW9uIHJhdyhjYWxsc2l0ZSkge1xuICAgIHZhciByYXcgPSBjYWxsc2l0ZS5yYXc7XG4gICAgdmFyIGxlbiA9IHJhdy5sZW5ndGggPj4+IDA7XG4gICAgaWYgKGxlbiA9PT0gMClcbiAgICAgIHJldHVybiAnJztcbiAgICB2YXIgcyA9ICcnO1xuICAgIHZhciBpID0gMDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgcyArPSByYXdbaV07XG4gICAgICBpZiAoaSArIDEgPT09IGxlbilcbiAgICAgICAgcmV0dXJuIHM7XG4gICAgICBzICs9IGFyZ3VtZW50c1srK2ldO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBmcm9tQ29kZVBvaW50KCkge1xuICAgIHZhciBjb2RlVW5pdHMgPSBbXTtcbiAgICB2YXIgZmxvb3IgPSBNYXRoLmZsb29yO1xuICAgIHZhciBoaWdoU3Vycm9nYXRlO1xuICAgIHZhciBsb3dTdXJyb2dhdGU7XG4gICAgdmFyIGluZGV4ID0gLTE7XG4gICAgdmFyIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgaWYgKCFsZW5ndGgpIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgd2hpbGUgKCsraW5kZXggPCBsZW5ndGgpIHtcbiAgICAgIHZhciBjb2RlUG9pbnQgPSBOdW1iZXIoYXJndW1lbnRzW2luZGV4XSk7XG4gICAgICBpZiAoIWlzRmluaXRlKGNvZGVQb2ludCkgfHwgY29kZVBvaW50IDwgMCB8fCBjb2RlUG9pbnQgPiAweDEwRkZGRiB8fCBmbG9vcihjb2RlUG9pbnQpICE9IGNvZGVQb2ludCkge1xuICAgICAgICB0aHJvdyBSYW5nZUVycm9yKCdJbnZhbGlkIGNvZGUgcG9pbnQ6ICcgKyBjb2RlUG9pbnQpO1xuICAgICAgfVxuICAgICAgaWYgKGNvZGVQb2ludCA8PSAweEZGRkYpIHtcbiAgICAgICAgY29kZVVuaXRzLnB1c2goY29kZVBvaW50KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvZGVQb2ludCAtPSAweDEwMDAwO1xuICAgICAgICBoaWdoU3Vycm9nYXRlID0gKGNvZGVQb2ludCA+PiAxMCkgKyAweEQ4MDA7XG4gICAgICAgIGxvd1N1cnJvZ2F0ZSA9IChjb2RlUG9pbnQgJSAweDQwMCkgKyAweERDMDA7XG4gICAgICAgIGNvZGVVbml0cy5wdXNoKGhpZ2hTdXJyb2dhdGUsIGxvd1N1cnJvZ2F0ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KG51bGwsIGNvZGVVbml0cyk7XG4gIH1cbiAgZnVuY3Rpb24gc3RyaW5nUHJvdG90eXBlSXRlcmF0b3IoKSB7XG4gICAgdmFyIG8gPSAkdHJhY2V1clJ1bnRpbWUuY2hlY2tPYmplY3RDb2VyY2libGUodGhpcyk7XG4gICAgdmFyIHMgPSBTdHJpbmcobyk7XG4gICAgcmV0dXJuIGNyZWF0ZVN0cmluZ0l0ZXJhdG9yKHMpO1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsU3RyaW5nKGdsb2JhbCkge1xuICAgIHZhciBTdHJpbmcgPSBnbG9iYWwuU3RyaW5nO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKFN0cmluZy5wcm90b3R5cGUsIFsnY29kZVBvaW50QXQnLCBjb2RlUG9pbnRBdCwgJ2VuZHNXaXRoJywgZW5kc1dpdGgsICdpbmNsdWRlcycsIGluY2x1ZGVzLCAncmVwZWF0JywgcmVwZWF0LCAnc3RhcnRzV2l0aCcsIHN0YXJ0c1dpdGhdKTtcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhTdHJpbmcsIFsnZnJvbUNvZGVQb2ludCcsIGZyb21Db2RlUG9pbnQsICdyYXcnLCByYXddKTtcbiAgICBtYXliZUFkZEl0ZXJhdG9yKFN0cmluZy5wcm90b3R5cGUsIHN0cmluZ1Byb3RvdHlwZUl0ZXJhdG9yLCBTeW1ib2wpO1xuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxTdHJpbmcpO1xuICByZXR1cm4ge1xuICAgIGdldCBzdGFydHNXaXRoKCkge1xuICAgICAgcmV0dXJuIHN0YXJ0c1dpdGg7XG4gICAgfSxcbiAgICBnZXQgZW5kc1dpdGgoKSB7XG4gICAgICByZXR1cm4gZW5kc1dpdGg7XG4gICAgfSxcbiAgICBnZXQgaW5jbHVkZXMoKSB7XG4gICAgICByZXR1cm4gaW5jbHVkZXM7XG4gICAgfSxcbiAgICBnZXQgcmVwZWF0KCkge1xuICAgICAgcmV0dXJuIHJlcGVhdDtcbiAgICB9LFxuICAgIGdldCBjb2RlUG9pbnRBdCgpIHtcbiAgICAgIHJldHVybiBjb2RlUG9pbnRBdDtcbiAgICB9LFxuICAgIGdldCByYXcoKSB7XG4gICAgICByZXR1cm4gcmF3O1xuICAgIH0sXG4gICAgZ2V0IGZyb21Db2RlUG9pbnQoKSB7XG4gICAgICByZXR1cm4gZnJvbUNvZGVQb2ludDtcbiAgICB9LFxuICAgIGdldCBzdHJpbmdQcm90b3R5cGVJdGVyYXRvcigpIHtcbiAgICAgIHJldHVybiBzdHJpbmdQcm90b3R5cGVJdGVyYXRvcjtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbFN0cmluZygpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbFN0cmluZztcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmcuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3IuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyICRfXzI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3IuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICB0b09iamVjdCA9ICRfXzAudG9PYmplY3QsXG4gICAgICB0b1VpbnQzMiA9ICRfXzAudG9VaW50MzIsXG4gICAgICBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCA9ICRfXzAuY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3Q7XG4gIHZhciBBUlJBWV9JVEVSQVRPUl9LSU5EX0tFWVMgPSAxO1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9WQUxVRVMgPSAyO1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTID0gMztcbiAgdmFyIEFycmF5SXRlcmF0b3IgPSBmdW5jdGlvbiBBcnJheUl0ZXJhdG9yKCkge307XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEFycmF5SXRlcmF0b3IsICgkX18yID0ge30sIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkX18yLCBcIm5leHRcIiwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBpdGVyYXRvciA9IHRvT2JqZWN0KHRoaXMpO1xuICAgICAgdmFyIGFycmF5ID0gaXRlcmF0b3IuaXRlcmF0b3JPYmplY3RfO1xuICAgICAgaWYgKCFhcnJheSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QgaXMgbm90IGFuIEFycmF5SXRlcmF0b3InKTtcbiAgICAgIH1cbiAgICAgIHZhciBpbmRleCA9IGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfO1xuICAgICAgdmFyIGl0ZW1LaW5kID0gaXRlcmF0b3IuYXJyYXlJdGVyYXRpb25LaW5kXztcbiAgICAgIHZhciBsZW5ndGggPSB0b1VpbnQzMihhcnJheS5sZW5ndGgpO1xuICAgICAgaWYgKGluZGV4ID49IGxlbmd0aCkge1xuICAgICAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IEluZmluaXR5O1xuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfID0gaW5kZXggKyAxO1xuICAgICAgaWYgKGl0ZW1LaW5kID09IEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTKVxuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoYXJyYXlbaW5kZXhdLCBmYWxzZSk7XG4gICAgICBpZiAoaXRlbUtpbmQgPT0gQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTKVxuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoW2luZGV4LCBhcnJheVtpbmRleF1dLCBmYWxzZSk7XG4gICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoaW5kZXgsIGZhbHNlKTtcbiAgICB9LFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlXG4gIH0pLCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fMiwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgJF9fMiksIHt9KTtcbiAgZnVuY3Rpb24gY3JlYXRlQXJyYXlJdGVyYXRvcihhcnJheSwga2luZCkge1xuICAgIHZhciBvYmplY3QgPSB0b09iamVjdChhcnJheSk7XG4gICAgdmFyIGl0ZXJhdG9yID0gbmV3IEFycmF5SXRlcmF0b3I7XG4gICAgaXRlcmF0b3IuaXRlcmF0b3JPYmplY3RfID0gb2JqZWN0O1xuICAgIGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfID0gMDtcbiAgICBpdGVyYXRvci5hcnJheUl0ZXJhdGlvbktpbmRfID0ga2luZDtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG4gIH1cbiAgZnVuY3Rpb24gZW50cmllcygpIHtcbiAgICByZXR1cm4gY3JlYXRlQXJyYXlJdGVyYXRvcih0aGlzLCBBUlJBWV9JVEVSQVRPUl9LSU5EX0VOVFJJRVMpO1xuICB9XG4gIGZ1bmN0aW9uIGtleXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9LRVlTKTtcbiAgfVxuICBmdW5jdGlvbiB2YWx1ZXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9WQUxVRVMpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZ2V0IGVudHJpZXMoKSB7XG4gICAgICByZXR1cm4gZW50cmllcztcbiAgICB9LFxuICAgIGdldCBrZXlzKCkge1xuICAgICAgcmV0dXJuIGtleXM7XG4gICAgfSxcbiAgICBnZXQgdmFsdWVzKCkge1xuICAgICAgcmV0dXJuIHZhbHVlcztcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5LmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5LmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5SXRlcmF0b3IuanNcIiksXG4gICAgICBlbnRyaWVzID0gJF9fMC5lbnRyaWVzLFxuICAgICAga2V5cyA9ICRfXzAua2V5cyxcbiAgICAgIHZhbHVlcyA9ICRfXzAudmFsdWVzO1xuICB2YXIgJF9fMSA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIGNoZWNrSXRlcmFibGUgPSAkX18xLmNoZWNrSXRlcmFibGUsXG4gICAgICBpc0NhbGxhYmxlID0gJF9fMS5pc0NhbGxhYmxlLFxuICAgICAgaXNDb25zdHJ1Y3RvciA9ICRfXzEuaXNDb25zdHJ1Y3RvcixcbiAgICAgIG1heWJlQWRkRnVuY3Rpb25zID0gJF9fMS5tYXliZUFkZEZ1bmN0aW9ucyxcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IgPSAkX18xLm1heWJlQWRkSXRlcmF0b3IsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMS5yZWdpc3RlclBvbHlmaWxsLFxuICAgICAgdG9JbnRlZ2VyID0gJF9fMS50b0ludGVnZXIsXG4gICAgICB0b0xlbmd0aCA9ICRfXzEudG9MZW5ndGgsXG4gICAgICB0b09iamVjdCA9ICRfXzEudG9PYmplY3Q7XG4gIGZ1bmN0aW9uIGZyb20oYXJyTGlrZSkge1xuICAgIHZhciBtYXBGbiA9IGFyZ3VtZW50c1sxXTtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1syXTtcbiAgICB2YXIgQyA9IHRoaXM7XG4gICAgdmFyIGl0ZW1zID0gdG9PYmplY3QoYXJyTGlrZSk7XG4gICAgdmFyIG1hcHBpbmcgPSBtYXBGbiAhPT0gdW5kZWZpbmVkO1xuICAgIHZhciBrID0gMDtcbiAgICB2YXIgYXJyLFxuICAgICAgICBsZW47XG4gICAgaWYgKG1hcHBpbmcgJiYgIWlzQ2FsbGFibGUobWFwRm4pKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgaWYgKGNoZWNrSXRlcmFibGUoaXRlbXMpKSB7XG4gICAgICBhcnIgPSBpc0NvbnN0cnVjdG9yKEMpID8gbmV3IEMoKSA6IFtdO1xuICAgICAgZm9yICh2YXIgJF9fMiA9IGl0ZW1zWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KFN5bWJvbC5pdGVyYXRvcildKCksXG4gICAgICAgICAgJF9fMzsgISgkX18zID0gJF9fMi5uZXh0KCkpLmRvbmU7ICkge1xuICAgICAgICB2YXIgaXRlbSA9ICRfXzMudmFsdWU7XG4gICAgICAgIHtcbiAgICAgICAgICBpZiAobWFwcGluZykge1xuICAgICAgICAgICAgYXJyW2tdID0gbWFwRm4uY2FsbCh0aGlzQXJnLCBpdGVtLCBrKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXJyW2tdID0gaXRlbTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaysrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBhcnIubGVuZ3RoID0gaztcbiAgICAgIHJldHVybiBhcnI7XG4gICAgfVxuICAgIGxlbiA9IHRvTGVuZ3RoKGl0ZW1zLmxlbmd0aCk7XG4gICAgYXJyID0gaXNDb25zdHJ1Y3RvcihDKSA/IG5ldyBDKGxlbikgOiBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IgKDsgayA8IGxlbjsgaysrKSB7XG4gICAgICBpZiAobWFwcGluZykge1xuICAgICAgICBhcnJba10gPSB0eXBlb2YgdGhpc0FyZyA9PT0gJ3VuZGVmaW5lZCcgPyBtYXBGbihpdGVtc1trXSwgaykgOiBtYXBGbi5jYWxsKHRoaXNBcmcsIGl0ZW1zW2tdLCBrKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGFycltrXSA9IGl0ZW1zW2tdO1xuICAgICAgfVxuICAgIH1cbiAgICBhcnIubGVuZ3RoID0gbGVuO1xuICAgIHJldHVybiBhcnI7XG4gIH1cbiAgZnVuY3Rpb24gb2YoKSB7XG4gICAgZm9yICh2YXIgaXRlbXMgPSBbXSxcbiAgICAgICAgJF9fNCA9IDA7ICRfXzQgPCBhcmd1bWVudHMubGVuZ3RoOyAkX180KyspXG4gICAgICBpdGVtc1skX180XSA9IGFyZ3VtZW50c1skX180XTtcbiAgICB2YXIgQyA9IHRoaXM7XG4gICAgdmFyIGxlbiA9IGl0ZW1zLmxlbmd0aDtcbiAgICB2YXIgYXJyID0gaXNDb25zdHJ1Y3RvcihDKSA/IG5ldyBDKGxlbikgOiBuZXcgQXJyYXkobGVuKTtcbiAgICBmb3IgKHZhciBrID0gMDsgayA8IGxlbjsgaysrKSB7XG4gICAgICBhcnJba10gPSBpdGVtc1trXTtcbiAgICB9XG4gICAgYXJyLmxlbmd0aCA9IGxlbjtcbiAgICByZXR1cm4gYXJyO1xuICB9XG4gIGZ1bmN0aW9uIGZpbGwodmFsdWUpIHtcbiAgICB2YXIgc3RhcnQgPSBhcmd1bWVudHNbMV0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzFdIDogMDtcbiAgICB2YXIgZW5kID0gYXJndW1lbnRzWzJdO1xuICAgIHZhciBvYmplY3QgPSB0b09iamVjdCh0aGlzKTtcbiAgICB2YXIgbGVuID0gdG9MZW5ndGgob2JqZWN0Lmxlbmd0aCk7XG4gICAgdmFyIGZpbGxTdGFydCA9IHRvSW50ZWdlcihzdGFydCk7XG4gICAgdmFyIGZpbGxFbmQgPSBlbmQgIT09IHVuZGVmaW5lZCA/IHRvSW50ZWdlcihlbmQpIDogbGVuO1xuICAgIGZpbGxTdGFydCA9IGZpbGxTdGFydCA8IDAgPyBNYXRoLm1heChsZW4gKyBmaWxsU3RhcnQsIDApIDogTWF0aC5taW4oZmlsbFN0YXJ0LCBsZW4pO1xuICAgIGZpbGxFbmQgPSBmaWxsRW5kIDwgMCA/IE1hdGgubWF4KGxlbiArIGZpbGxFbmQsIDApIDogTWF0aC5taW4oZmlsbEVuZCwgbGVuKTtcbiAgICB3aGlsZSAoZmlsbFN0YXJ0IDwgZmlsbEVuZCkge1xuICAgICAgb2JqZWN0W2ZpbGxTdGFydF0gPSB2YWx1ZTtcbiAgICAgIGZpbGxTdGFydCsrO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIGZpbmQocHJlZGljYXRlKSB7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgcmV0dXJuIGZpbmRIZWxwZXIodGhpcywgcHJlZGljYXRlLCB0aGlzQXJnKTtcbiAgfVxuICBmdW5jdGlvbiBmaW5kSW5kZXgocHJlZGljYXRlKSB7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgcmV0dXJuIGZpbmRIZWxwZXIodGhpcywgcHJlZGljYXRlLCB0aGlzQXJnLCB0cnVlKTtcbiAgfVxuICBmdW5jdGlvbiBmaW5kSGVscGVyKHNlbGYsIHByZWRpY2F0ZSkge1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzJdO1xuICAgIHZhciByZXR1cm5JbmRleCA9IGFyZ3VtZW50c1szXSAhPT0gKHZvaWQgMCkgPyBhcmd1bWVudHNbM10gOiBmYWxzZTtcbiAgICB2YXIgb2JqZWN0ID0gdG9PYmplY3Qoc2VsZik7XG4gICAgdmFyIGxlbiA9IHRvTGVuZ3RoKG9iamVjdC5sZW5ndGgpO1xuICAgIGlmICghaXNDYWxsYWJsZShwcmVkaWNhdGUpKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgICAgdmFyIHZhbHVlID0gb2JqZWN0W2ldO1xuICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIHZhbHVlLCBpLCBvYmplY3QpKSB7XG4gICAgICAgIHJldHVybiByZXR1cm5JbmRleCA/IGkgOiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJldHVybkluZGV4ID8gLTEgOiB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxBcnJheShnbG9iYWwpIHtcbiAgICB2YXIgJF9fNSA9IGdsb2JhbCxcbiAgICAgICAgQXJyYXkgPSAkX181LkFycmF5LFxuICAgICAgICBPYmplY3QgPSAkX181Lk9iamVjdCxcbiAgICAgICAgU3ltYm9sID0gJF9fNS5TeW1ib2w7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoQXJyYXkucHJvdG90eXBlLCBbJ2VudHJpZXMnLCBlbnRyaWVzLCAna2V5cycsIGtleXMsICd2YWx1ZXMnLCB2YWx1ZXMsICdmaWxsJywgZmlsbCwgJ2ZpbmQnLCBmaW5kLCAnZmluZEluZGV4JywgZmluZEluZGV4XSk7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoQXJyYXksIFsnZnJvbScsIGZyb20sICdvZicsIG9mXSk7XG4gICAgbWF5YmVBZGRJdGVyYXRvcihBcnJheS5wcm90b3R5cGUsIHZhbHVlcywgU3ltYm9sKTtcbiAgICBtYXliZUFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZihbXS52YWx1ZXMoKSksIGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSwgU3ltYm9sKTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsQXJyYXkpO1xuICByZXR1cm4ge1xuICAgIGdldCBmcm9tKCkge1xuICAgICAgcmV0dXJuIGZyb207XG4gICAgfSxcbiAgICBnZXQgb2YoKSB7XG4gICAgICByZXR1cm4gb2Y7XG4gICAgfSxcbiAgICBnZXQgZmlsbCgpIHtcbiAgICAgIHJldHVybiBmaWxsO1xuICAgIH0sXG4gICAgZ2V0IGZpbmQoKSB7XG4gICAgICByZXR1cm4gZmluZDtcbiAgICB9LFxuICAgIGdldCBmaW5kSW5kZXgoKSB7XG4gICAgICByZXR1cm4gZmluZEluZGV4O1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsQXJyYXkoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxBcnJheTtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheS5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvT2JqZWN0LmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL09iamVjdC5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIG1heWJlQWRkRnVuY3Rpb25zID0gJF9fMC5tYXliZUFkZEZ1bmN0aW9ucyxcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18wLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciAkX18xID0gJHRyYWNldXJSdW50aW1lLFxuICAgICAgZGVmaW5lUHJvcGVydHkgPSAkX18xLmRlZmluZVByb3BlcnR5LFxuICAgICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gJF9fMS5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IsXG4gICAgICBnZXRPd25Qcm9wZXJ0eU5hbWVzID0gJF9fMS5nZXRPd25Qcm9wZXJ0eU5hbWVzLFxuICAgICAgaXNQcml2YXRlTmFtZSA9ICRfXzEuaXNQcml2YXRlTmFtZSxcbiAgICAgIGtleXMgPSAkX18xLmtleXM7XG4gIGZ1bmN0aW9uIGlzKGxlZnQsIHJpZ2h0KSB7XG4gICAgaWYgKGxlZnQgPT09IHJpZ2h0KVxuICAgICAgcmV0dXJuIGxlZnQgIT09IDAgfHwgMSAvIGxlZnQgPT09IDEgLyByaWdodDtcbiAgICByZXR1cm4gbGVmdCAhPT0gbGVmdCAmJiByaWdodCAhPT0gcmlnaHQ7XG4gIH1cbiAgZnVuY3Rpb24gYXNzaWduKHRhcmdldCkge1xuICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2ldO1xuICAgICAgdmFyIHByb3BzID0gc291cmNlID09IG51bGwgPyBbXSA6IGtleXMoc291cmNlKTtcbiAgICAgIHZhciBwLFxuICAgICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcbiAgICAgIGZvciAocCA9IDA7IHAgPCBsZW5ndGg7IHArKykge1xuICAgICAgICB2YXIgbmFtZSA9IHByb3BzW3BdO1xuICAgICAgICBpZiAoaXNQcml2YXRlTmFtZShuYW1lKSlcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgdGFyZ2V0W25hbWVdID0gc291cmNlW25hbWVdO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG4gIGZ1bmN0aW9uIG1peGluKHRhcmdldCwgc291cmNlKSB7XG4gICAgdmFyIHByb3BzID0gZ2V0T3duUHJvcGVydHlOYW1lcyhzb3VyY2UpO1xuICAgIHZhciBwLFxuICAgICAgICBkZXNjcmlwdG9yLFxuICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGg7XG4gICAgZm9yIChwID0gMDsgcCA8IGxlbmd0aDsgcCsrKSB7XG4gICAgICB2YXIgbmFtZSA9IHByb3BzW3BdO1xuICAgICAgaWYgKGlzUHJpdmF0ZU5hbWUobmFtZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgZGVzY3JpcHRvciA9IGdldE93blByb3BlcnR5RGVzY3JpcHRvcihzb3VyY2UsIHByb3BzW3BdKTtcbiAgICAgIGRlZmluZVByb3BlcnR5KHRhcmdldCwgcHJvcHNbcF0sIGRlc2NyaXB0b3IpO1xuICAgIH1cbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsT2JqZWN0KGdsb2JhbCkge1xuICAgIHZhciBPYmplY3QgPSBnbG9iYWwuT2JqZWN0O1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKE9iamVjdCwgWydhc3NpZ24nLCBhc3NpZ24sICdpcycsIGlzLCAnbWl4aW4nLCBtaXhpbl0pO1xuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxPYmplY3QpO1xuICByZXR1cm4ge1xuICAgIGdldCBpcygpIHtcbiAgICAgIHJldHVybiBpcztcbiAgICB9LFxuICAgIGdldCBhc3NpZ24oKSB7XG4gICAgICByZXR1cm4gYXNzaWduO1xuICAgIH0sXG4gICAgZ2V0IG1peGluKCkge1xuICAgICAgcmV0dXJuIG1peGluO1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsT2JqZWN0KCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsT2JqZWN0O1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL09iamVjdC5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTnVtYmVyLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL051bWJlci5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIGlzTnVtYmVyID0gJF9fMC5pc051bWJlcixcbiAgICAgIG1heWJlQWRkQ29uc3RzID0gJF9fMC5tYXliZUFkZENvbnN0cyxcbiAgICAgIG1heWJlQWRkRnVuY3Rpb25zID0gJF9fMC5tYXliZUFkZEZ1bmN0aW9ucyxcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18wLnJlZ2lzdGVyUG9seWZpbGwsXG4gICAgICB0b0ludGVnZXIgPSAkX18wLnRvSW50ZWdlcjtcbiAgdmFyICRhYnMgPSBNYXRoLmFicztcbiAgdmFyICRpc0Zpbml0ZSA9IGlzRmluaXRlO1xuICB2YXIgJGlzTmFOID0gaXNOYU47XG4gIHZhciBNQVhfU0FGRV9JTlRFR0VSID0gTWF0aC5wb3coMiwgNTMpIC0gMTtcbiAgdmFyIE1JTl9TQUZFX0lOVEVHRVIgPSAtTWF0aC5wb3coMiwgNTMpICsgMTtcbiAgdmFyIEVQU0lMT04gPSBNYXRoLnBvdygyLCAtNTIpO1xuICBmdW5jdGlvbiBOdW1iZXJJc0Zpbml0ZShudW1iZXIpIHtcbiAgICByZXR1cm4gaXNOdW1iZXIobnVtYmVyKSAmJiAkaXNGaW5pdGUobnVtYmVyKTtcbiAgfVxuICA7XG4gIGZ1bmN0aW9uIGlzSW50ZWdlcihudW1iZXIpIHtcbiAgICByZXR1cm4gTnVtYmVySXNGaW5pdGUobnVtYmVyKSAmJiB0b0ludGVnZXIobnVtYmVyKSA9PT0gbnVtYmVyO1xuICB9XG4gIGZ1bmN0aW9uIE51bWJlcklzTmFOKG51bWJlcikge1xuICAgIHJldHVybiBpc051bWJlcihudW1iZXIpICYmICRpc05hTihudW1iZXIpO1xuICB9XG4gIDtcbiAgZnVuY3Rpb24gaXNTYWZlSW50ZWdlcihudW1iZXIpIHtcbiAgICBpZiAoTnVtYmVySXNGaW5pdGUobnVtYmVyKSkge1xuICAgICAgdmFyIGludGVncmFsID0gdG9JbnRlZ2VyKG51bWJlcik7XG4gICAgICBpZiAoaW50ZWdyYWwgPT09IG51bWJlcilcbiAgICAgICAgcmV0dXJuICRhYnMoaW50ZWdyYWwpIDw9IE1BWF9TQUZFX0lOVEVHRVI7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbE51bWJlcihnbG9iYWwpIHtcbiAgICB2YXIgTnVtYmVyID0gZ2xvYmFsLk51bWJlcjtcbiAgICBtYXliZUFkZENvbnN0cyhOdW1iZXIsIFsnTUFYX1NBRkVfSU5URUdFUicsIE1BWF9TQUZFX0lOVEVHRVIsICdNSU5fU0FGRV9JTlRFR0VSJywgTUlOX1NBRkVfSU5URUdFUiwgJ0VQU0lMT04nLCBFUFNJTE9OXSk7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoTnVtYmVyLCBbJ2lzRmluaXRlJywgTnVtYmVySXNGaW5pdGUsICdpc0ludGVnZXInLCBpc0ludGVnZXIsICdpc05hTicsIE51bWJlcklzTmFOLCAnaXNTYWZlSW50ZWdlcicsIGlzU2FmZUludGVnZXJdKTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsTnVtYmVyKTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgTUFYX1NBRkVfSU5URUdFUigpIHtcbiAgICAgIHJldHVybiBNQVhfU0FGRV9JTlRFR0VSO1xuICAgIH0sXG4gICAgZ2V0IE1JTl9TQUZFX0lOVEVHRVIoKSB7XG4gICAgICByZXR1cm4gTUlOX1NBRkVfSU5URUdFUjtcbiAgICB9LFxuICAgIGdldCBFUFNJTE9OKCkge1xuICAgICAgcmV0dXJuIEVQU0lMT047XG4gICAgfSxcbiAgICBnZXQgaXNGaW5pdGUoKSB7XG4gICAgICByZXR1cm4gTnVtYmVySXNGaW5pdGU7XG4gICAgfSxcbiAgICBnZXQgaXNJbnRlZ2VyKCkge1xuICAgICAgcmV0dXJuIGlzSW50ZWdlcjtcbiAgICB9LFxuICAgIGdldCBpc05hTigpIHtcbiAgICAgIHJldHVybiBOdW1iZXJJc05hTjtcbiAgICB9LFxuICAgIGdldCBpc1NhZmVJbnRlZ2VyKCkge1xuICAgICAgcmV0dXJuIGlzU2FmZUludGVnZXI7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxOdW1iZXIoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxOdW1iZXI7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTnVtYmVyLmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9wb2x5ZmlsbHMuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvcG9seWZpbGxzLmpzXCI7XG4gIHZhciBwb2x5ZmlsbEFsbCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKS5wb2x5ZmlsbEFsbDtcbiAgcG9seWZpbGxBbGwoUmVmbGVjdC5nbG9iYWwpO1xuICB2YXIgc2V0dXBHbG9iYWxzID0gJHRyYWNldXJSdW50aW1lLnNldHVwR2xvYmFscztcbiAgJHRyYWNldXJSdW50aW1lLnNldHVwR2xvYmFscyA9IGZ1bmN0aW9uKGdsb2JhbCkge1xuICAgIHNldHVwR2xvYmFscyhnbG9iYWwpO1xuICAgIHBvbHlmaWxsQWxsKGdsb2JhbCk7XG4gIH07XG4gIHJldHVybiB7fTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3BvbHlmaWxscy5qc1wiICsgJycpO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSx0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09IFwidW5kZWZpbmVkXCIgPyBzZWxmIDogdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiA/IHdpbmRvdyA6IHt9KVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OTBjbUZqWlhWeUwySnBiaTkwY21GalpYVnlMWEoxYm5ScGJXVXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJanRCUVVGQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQklpd2labWxzWlNJNkltZGxibVZ5WVhSbFpDNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUlvWm5WdVkzUnBiMjRvWjJ4dlltRnNLU0I3WEc0Z0lDZDFjMlVnYzNSeWFXTjBKenRjYmlBZ2FXWWdLR2RzYjJKaGJDNGtkSEpoWTJWMWNsSjFiblJwYldVcElIdGNiaUFnSUNCeVpYUjFjbTQ3WEc0Z0lIMWNiaUFnZG1GeUlDUlBZbXBsWTNRZ1BTQlBZbXBsWTNRN1hHNGdJSFpoY2lBa1ZIbHdaVVZ5Y205eUlEMGdWSGx3WlVWeWNtOXlPMXh1SUNCMllYSWdKR055WldGMFpTQTlJQ1JQWW1wbFkzUXVZM0psWVhSbE8xeHVJQ0IyWVhJZ0pHUmxabWx1WlZCeWIzQmxjblJwWlhNZ1BTQWtUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblJwWlhNN1hHNGdJSFpoY2lBa1pHVm1hVzVsVUhKdmNHVnlkSGtnUFNBa1QySnFaV04wTG1SbFptbHVaVkJ5YjNCbGNuUjVPMXh1SUNCMllYSWdKR1p5WldWNlpTQTlJQ1JQWW1wbFkzUXVabkpsWlhwbE8xeHVJQ0IyWVhJZ0pHZGxkRTkzYmxCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2lBOUlDUlBZbXBsWTNRdVoyVjBUM2R1VUhKdmNHVnlkSGxFWlhOamNtbHdkRzl5TzF4dUlDQjJZWElnSkdkbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNZ1BTQWtUMkpxWldOMExtZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTTdYRzRnSUhaaGNpQWthMlY1Y3lBOUlDUlBZbXBsWTNRdWEyVjVjenRjYmlBZ2RtRnlJQ1JvWVhOUGQyNVFjbTl3WlhKMGVTQTlJQ1JQWW1wbFkzUXVjSEp2ZEc5MGVYQmxMbWhoYzA5M2JsQnliM0JsY25SNU8xeHVJQ0IyWVhJZ0pIUnZVM1J5YVc1bklEMGdKRTlpYW1WamRDNXdjbTkwYjNSNWNHVXVkRzlUZEhKcGJtYzdYRzRnSUhaaGNpQWtjSEpsZG1WdWRFVjRkR1Z1YzJsdmJuTWdQU0JQWW1wbFkzUXVjSEpsZG1WdWRFVjRkR1Z1YzJsdmJuTTdYRzRnSUhaaGNpQWtjMlZoYkNBOUlFOWlhbVZqZEM1elpXRnNPMXh1SUNCMllYSWdKR2x6UlhoMFpXNXphV0pzWlNBOUlFOWlhbVZqZEM1cGMwVjRkR1Z1YzJsaWJHVTdYRzRnSUdaMWJtTjBhVzl1SUc1dmJrVnVkVzBvZG1Gc2RXVXBJSHRjYmlBZ0lDQnlaWFIxY200Z2UxeHVJQ0FnSUNBZ1kyOXVabWxuZFhKaFlteGxPaUIwY25WbExGeHVJQ0FnSUNBZ1pXNTFiV1Z5WVdKc1pUb2dabUZzYzJVc1hHNGdJQ0FnSUNCMllXeDFaVG9nZG1Gc2RXVXNYRzRnSUNBZ0lDQjNjbWwwWVdKc1pUb2dkSEoxWlZ4dUlDQWdJSDA3WEc0Z0lIMWNiaUFnZG1GeUlHMWxkR2h2WkNBOUlHNXZia1Z1ZFcwN1hHNGdJSFpoY2lCamIzVnVkR1Z5SUQwZ01EdGNiaUFnWm5WdVkzUnBiMjRnYm1WM1ZXNXBjWFZsVTNSeWFXNW5LQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQW5YMThrSnlBcklFMWhkR2d1Wm14dmIzSW9UV0YwYUM1eVlXNWtiMjBvS1NBcUlERmxPU2tnS3lBbkpDY2dLeUFySzJOdmRXNTBaWElnS3lBbkpGOWZKenRjYmlBZ2ZWeHVJQ0IyWVhJZ2MzbHRZbTlzU1c1MFpYSnVZV3hRY205d1pYSjBlU0E5SUc1bGQxVnVhWEYxWlZOMGNtbHVaeWdwTzF4dUlDQjJZWElnYzNsdFltOXNSR1Z6WTNKcGNIUnBiMjVRY205d1pYSjBlU0E5SUc1bGQxVnVhWEYxWlZOMGNtbHVaeWdwTzF4dUlDQjJZWElnYzNsdFltOXNSR0YwWVZCeWIzQmxjblI1SUQwZ2JtVjNWVzVwY1hWbFUzUnlhVzVuS0NrN1hHNGdJSFpoY2lCemVXMWliMnhXWVd4MVpYTWdQU0FrWTNKbFlYUmxLRzUxYkd3cE8xeHVJQ0IyWVhJZ2NISnBkbUYwWlU1aGJXVnpJRDBnSkdOeVpXRjBaU2h1ZFd4c0tUdGNiaUFnWm5WdVkzUnBiMjRnYVhOUWNtbDJZWFJsVG1GdFpTaHpLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIQnlhWFpoZEdWT1lXMWxjMXR6WFR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCamNtVmhkR1ZRY21sMllYUmxUbUZ0WlNncElIdGNiaUFnSUNCMllYSWdjeUE5SUc1bGQxVnVhWEYxWlZOMGNtbHVaeWdwTzF4dUlDQWdJSEJ5YVhaaGRHVk9ZVzFsYzF0elhTQTlJSFJ5ZFdVN1hHNGdJQ0FnY21WMGRYSnVJSE03WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnYVhOVGFHbHRVM2x0WW05c0tITjViV0p2YkNrZ2UxeHVJQ0FnSUhKbGRIVnliaUIwZVhCbGIyWWdjM2x0WW05c0lEMDlQU0FuYjJKcVpXTjBKeUFtSmlCemVXMWliMndnYVc1emRHRnVZMlZ2WmlCVGVXMWliMnhXWVd4MVpUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQjBlWEJsVDJZb2Rpa2dlMXh1SUNBZ0lHbG1JQ2hwYzFOb2FXMVRlVzFpYjJ3b2Rpa3BYRzRnSUNBZ0lDQnlaWFIxY200Z0ozTjViV0p2YkNjN1hHNGdJQ0FnY21WMGRYSnVJSFI1Y0dWdlppQjJPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJRk41YldKdmJDaGtaWE5qY21sd2RHbHZiaWtnZTF4dUlDQWdJSFpoY2lCMllXeDFaU0E5SUc1bGR5QlRlVzFpYjJ4V1lXeDFaU2hrWlhOamNtbHdkR2x2YmlrN1hHNGdJQ0FnYVdZZ0tDRW9kR2hwY3lCcGJuTjBZVzVqWlc5bUlGTjViV0p2YkNrcFhHNGdJQ0FnSUNCeVpYUjFjbTRnZG1Gc2RXVTdYRzRnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25VM2x0WW05c0lHTmhibTV2ZENCaVpTQnVaWGRjWENkbFpDY3BPMXh1SUNCOVhHNGdJQ1JrWldacGJtVlFjbTl3WlhKMGVTaFRlVzFpYjJ3dWNISnZkRzkwZVhCbExDQW5ZMjl1YzNSeWRXTjBiM0luTENCdWIyNUZiblZ0S0ZONWJXSnZiQ2twTzF4dUlDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb1UzbHRZbTlzTG5CeWIzUnZkSGx3WlN3Z0ozUnZVM1J5YVc1bkp5d2diV1YwYUc5a0tHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lIWmhjaUJ6ZVcxaWIyeFdZV3gxWlNBOUlIUm9hWE5iYzNsdFltOXNSR0YwWVZCeWIzQmxjblI1WFR0Y2JpQWdJQ0JwWmlBb0lXZGxkRTl3ZEdsdmJpZ25jM2x0WW05c2N5Y3BLVnh1SUNBZ0lDQWdjbVYwZFhKdUlITjViV0p2YkZaaGJIVmxXM041YldKdmJFbHVkR1Z5Ym1Gc1VISnZjR1Z5ZEhsZE8xeHVJQ0FnSUdsbUlDZ2hjM2x0WW05c1ZtRnNkV1VwWEc0Z0lDQWdJQ0IwYUhKdmR5QlVlWEJsUlhKeWIzSW9KME52Ym5abGNuTnBiMjRnWm5KdmJTQnplVzFpYjJ3Z2RHOGdjM1J5YVc1bkp5azdYRzRnSUNBZ2RtRnlJR1JsYzJNZ1BTQnplVzFpYjJ4V1lXeDFaVnR6ZVcxaWIyeEVaWE5qY21sd2RHbHZibEJ5YjNCbGNuUjVYVHRjYmlBZ0lDQnBaaUFvWkdWell5QTlQVDBnZFc1a1pXWnBibVZrS1Z4dUlDQWdJQ0FnWkdWell5QTlJQ2NuTzF4dUlDQWdJSEpsZEhWeWJpQW5VM2x0WW05c0tDY2dLeUJrWlhOaklDc2dKeWtuTzF4dUlDQjlLU2s3WEc0Z0lDUmtaV1pwYm1WUWNtOXdaWEowZVNoVGVXMWliMnd1Y0hKdmRHOTBlWEJsTENBbmRtRnNkV1ZQWmljc0lHMWxkR2h2WkNobWRXNWpkR2x2YmlncElIdGNiaUFnSUNCMllYSWdjM2x0WW05c1ZtRnNkV1VnUFNCMGFHbHpXM041YldKdmJFUmhkR0ZRY205d1pYSjBlVjA3WEc0Z0lDQWdhV1lnS0NGemVXMWliMnhXWVd4MVpTbGNiaUFnSUNBZ0lIUm9jbTkzSUZSNWNHVkZjbkp2Y2lnblEyOXVkbVZ5YzJsdmJpQm1jbTl0SUhONWJXSnZiQ0IwYnlCemRISnBibWNuS1R0Y2JpQWdJQ0JwWmlBb0lXZGxkRTl3ZEdsdmJpZ25jM2x0WW05c2N5Y3BLVnh1SUNBZ0lDQWdjbVYwZFhKdUlITjViV0p2YkZaaGJIVmxXM041YldKdmJFbHVkR1Z5Ym1Gc1VISnZjR1Z5ZEhsZE8xeHVJQ0FnSUhKbGRIVnliaUJ6ZVcxaWIyeFdZV3gxWlR0Y2JpQWdmU2twTzF4dUlDQm1kVzVqZEdsdmJpQlRlVzFpYjJ4V1lXeDFaU2hrWlhOamNtbHdkR2x2YmlrZ2UxeHVJQ0FnSUhaaGNpQnJaWGtnUFNCdVpYZFZibWx4ZFdWVGRISnBibWNvS1R0Y2JpQWdJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29kR2hwY3l3Z2MzbHRZbTlzUkdGMFlWQnliM0JsY25SNUxDQjdkbUZzZFdVNklIUm9hWE45S1R0Y2JpQWdJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29kR2hwY3l3Z2MzbHRZbTlzU1c1MFpYSnVZV3hRY205d1pYSjBlU3dnZTNaaGJIVmxPaUJyWlhsOUtUdGNiaUFnSUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvZEdocGN5d2djM2x0WW05c1JHVnpZM0pwY0hScGIyNVFjbTl3WlhKMGVTd2dlM1poYkhWbE9pQmtaWE5qY21sd2RHbHZibjBwTzF4dUlDQWdJR1p5WldWNlpTaDBhR2x6S1R0Y2JpQWdJQ0J6ZVcxaWIyeFdZV3gxWlhOYmEyVjVYU0E5SUhSb2FYTTdYRzRnSUgxY2JpQWdKR1JsWm1sdVpWQnliM0JsY25SNUtGTjViV0p2YkZaaGJIVmxMbkJ5YjNSdmRIbHdaU3dnSjJOdmJuTjBjblZqZEc5eUp5d2dibTl1Ulc1MWJTaFRlVzFpYjJ3cEtUdGNiaUFnSkdSbFptbHVaVkJ5YjNCbGNuUjVLRk41YldKdmJGWmhiSFZsTG5CeWIzUnZkSGx3WlN3Z0ozUnZVM1J5YVc1bkp5d2dlMXh1SUNBZ0lIWmhiSFZsT2lCVGVXMWliMnd1Y0hKdmRHOTBlWEJsTG5SdlUzUnlhVzVuTEZ4dUlDQWdJR1Z1ZFcxbGNtRmliR1U2SUdaaGJITmxYRzRnSUgwcE8xeHVJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29VM2x0WW05c1ZtRnNkV1V1Y0hKdmRHOTBlWEJsTENBbmRtRnNkV1ZQWmljc0lIdGNiaUFnSUNCMllXeDFaVG9nVTNsdFltOXNMbkJ5YjNSdmRIbHdaUzUyWVd4MVpVOW1MRnh1SUNBZ0lHVnVkVzFsY21GaWJHVTZJR1poYkhObFhHNGdJSDBwTzF4dUlDQjJZWElnYUdGemFGQnliM0JsY25SNUlEMGdZM0psWVhSbFVISnBkbUYwWlU1aGJXVW9LVHRjYmlBZ2RtRnlJR2hoYzJoUWNtOXdaWEowZVVSbGMyTnlhWEIwYjNJZ1BTQjdkbUZzZFdVNklIVnVaR1ZtYVc1bFpIMDdYRzRnSUhaaGNpQm9ZWE5vVDJKcVpXTjBVSEp2Y0dWeWRHbGxjeUE5SUh0Y2JpQWdJQ0JvWVhOb09pQjdkbUZzZFdVNklIVnVaR1ZtYVc1bFpIMHNYRzRnSUNBZ2MyVnNaam9nZTNaaGJIVmxPaUIxYm1SbFptbHVaV1I5WEc0Z0lIMDdYRzRnSUhaaGNpQm9ZWE5vUTI5MWJuUmxjaUE5SURBN1hHNGdJR1oxYm1OMGFXOXVJR2RsZEU5M2JraGhjMmhQWW1wbFkzUW9iMkpxWldOMEtTQjdYRzRnSUNBZ2RtRnlJR2hoYzJoUFltcGxZM1FnUFNCdlltcGxZM1JiYUdGemFGQnliM0JsY25SNVhUdGNiaUFnSUNCcFppQW9hR0Z6YUU5aWFtVmpkQ0FtSmlCb1lYTm9UMkpxWldOMExuTmxiR1lnUFQwOUlHOWlhbVZqZENsY2JpQWdJQ0FnSUhKbGRIVnliaUJvWVhOb1QySnFaV04wTzF4dUlDQWdJR2xtSUNna2FYTkZlSFJsYm5OcFlteGxLRzlpYW1WamRDa3BJSHRjYmlBZ0lDQWdJR2hoYzJoUFltcGxZM1JRY205d1pYSjBhV1Z6TG1oaGMyZ3VkbUZzZFdVZ1BTQm9ZWE5vUTI5MWJuUmxjaXNyTzF4dUlDQWdJQ0FnYUdGemFFOWlhbVZqZEZCeWIzQmxjblJwWlhNdWMyVnNaaTUyWVd4MVpTQTlJRzlpYW1WamREdGNiaUFnSUNBZ0lHaGhjMmhRY205d1pYSjBlVVJsYzJOeWFYQjBiM0l1ZG1Gc2RXVWdQU0FrWTNKbFlYUmxLRzUxYkd3c0lHaGhjMmhQWW1wbFkzUlFjbTl3WlhKMGFXVnpLVHRjYmlBZ0lDQWdJQ1JrWldacGJtVlFjbTl3WlhKMGVTaHZZbXBsWTNRc0lHaGhjMmhRY205d1pYSjBlU3dnYUdGemFGQnliM0JsY25SNVJHVnpZM0pwY0hSdmNpazdYRzRnSUNBZ0lDQnlaWFIxY200Z2FHRnphRkJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaTUyWVd4MVpUdGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSFZ1WkdWbWFXNWxaRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJtY21WbGVtVW9iMkpxWldOMEtTQjdYRzRnSUNBZ1oyVjBUM2R1U0dGemFFOWlhbVZqZENodlltcGxZM1FwTzF4dUlDQWdJSEpsZEhWeWJpQWtabkpsWlhwbExtRndjR3g1S0hSb2FYTXNJR0Z5WjNWdFpXNTBjeWs3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY0hKbGRtVnVkRVY0ZEdWdWMybHZibk1vYjJKcVpXTjBLU0I3WEc0Z0lDQWdaMlYwVDNkdVNHRnphRTlpYW1WamRDaHZZbXBsWTNRcE8xeHVJQ0FnSUhKbGRIVnliaUFrY0hKbGRtVnVkRVY0ZEdWdWMybHZibk11WVhCd2JIa29kR2hwY3l3Z1lYSm5kVzFsYm5SektUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnpaV0ZzS0c5aWFtVmpkQ2tnZTF4dUlDQWdJR2RsZEU5M2JraGhjMmhQWW1wbFkzUW9iMkpxWldOMEtUdGNiaUFnSUNCeVpYUjFjbTRnSkhObFlXd3VZWEJ3Ykhrb2RHaHBjeXdnWVhKbmRXMWxiblJ6S1R0Y2JpQWdmVnh1SUNCbWNtVmxlbVVvVTNsdFltOXNWbUZzZFdVdWNISnZkRzkwZVhCbEtUdGNiaUFnWm5WdVkzUnBiMjRnYVhOVGVXMWliMnhUZEhKcGJtY29jeWtnZTF4dUlDQWdJSEpsZEhWeWJpQnplVzFpYjJ4V1lXeDFaWE5iYzEwZ2ZId2djSEpwZG1GMFpVNWhiV1Z6VzNOZE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlIUnZVSEp2Y0dWeWRIa29ibUZ0WlNrZ2UxeHVJQ0FnSUdsbUlDaHBjMU5vYVcxVGVXMWliMndvYm1GdFpTa3BYRzRnSUNBZ0lDQnlaWFIxY200Z2JtRnRaVnR6ZVcxaWIyeEpiblJsY201aGJGQnliM0JsY25SNVhUdGNiaUFnSUNCeVpYUjFjbTRnYm1GdFpUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnlaVzF2ZG1WVGVXMWliMnhMWlhsektHRnljbUY1S1NCN1hHNGdJQ0FnZG1GeUlISjJJRDBnVzEwN1hHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCaGNuSmhlUzVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ2FXWWdLQ0ZwYzFONWJXSnZiRk4wY21sdVp5aGhjbkpoZVZ0cFhTa3BJSHRjYmlBZ0lDQWdJQ0FnY25ZdWNIVnphQ2hoY25KaGVWdHBYU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCeWRqdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQm5aWFJQZDI1UWNtOXdaWEowZVU1aGJXVnpLRzlpYW1WamRDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCeVpXMXZkbVZUZVcxaWIyeExaWGx6S0NSblpYUlBkMjVRY205d1pYSjBlVTVoYldWektHOWlhbVZqZENrcE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHdGxlWE1vYjJKcVpXTjBLU0I3WEc0Z0lDQWdjbVYwZFhKdUlISmxiVzkyWlZONWJXSnZiRXRsZVhNb0pHdGxlWE1vYjJKcVpXTjBLU2s3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWjJWMFQzZHVVSEp2Y0dWeWRIbFRlVzFpYjJ4ektHOWlhbVZqZENrZ2UxeHVJQ0FnSUhaaGNpQnlkaUE5SUZ0ZE8xeHVJQ0FnSUhaaGNpQnVZVzFsY3lBOUlDUm5aWFJQZDI1UWNtOXdaWEowZVU1aGJXVnpLRzlpYW1WamRDazdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnVZVzFsY3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdkbUZ5SUhONWJXSnZiQ0E5SUhONWJXSnZiRlpoYkhWbGMxdHVZVzFsYzF0cFhWMDdYRzRnSUNBZ0lDQnBaaUFvYzNsdFltOXNLU0I3WEc0Z0lDQWdJQ0FnSUhKMkxuQjFjMmdvYzNsdFltOXNLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUhKMk8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHZGxkRTkzYmxCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2lodlltcGxZM1FzSUc1aGJXVXBJSHRjYmlBZ0lDQnlaWFIxY200Z0pHZGxkRTkzYmxCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2lodlltcGxZM1FzSUhSdlVISnZjR1Z5ZEhrb2JtRnRaU2twTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdoaGMwOTNibEJ5YjNCbGNuUjVLRzVoYldVcElIdGNiaUFnSUNCeVpYUjFjbTRnSkdoaGMwOTNibEJ5YjNCbGNuUjVMbU5oYkd3b2RHaHBjeXdnZEc5UWNtOXdaWEowZVNodVlXMWxLU2s3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWjJWMFQzQjBhVzl1S0c1aGJXVXBJSHRjYmlBZ0lDQnlaWFIxY200Z1oyeHZZbUZzTG5SeVlXTmxkWElnSmlZZ1oyeHZZbUZzTG5SeVlXTmxkWEl1YjNCMGFXOXVjMXR1WVcxbFhUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQmtaV1pwYm1WUWNtOXdaWEowZVNodlltcGxZM1FzSUc1aGJXVXNJR1JsYzJOeWFYQjBiM0lwSUh0Y2JpQWdJQ0JwWmlBb2FYTlRhR2x0VTNsdFltOXNLRzVoYldVcEtTQjdYRzRnSUNBZ0lDQnVZVzFsSUQwZ2JtRnRaVnR6ZVcxaWIyeEpiblJsY201aGJGQnliM0JsY25SNVhUdGNiaUFnSUNCOVhHNGdJQ0FnSkdSbFptbHVaVkJ5YjNCbGNuUjVLRzlpYW1WamRDd2dibUZ0WlN3Z1pHVnpZM0pwY0hSdmNpazdYRzRnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ3YjJ4NVptbHNiRTlpYW1WamRDaFBZbXBsWTNRcElIdGNiaUFnSUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvVDJKcVpXTjBMQ0FuWkdWbWFXNWxVSEp2Y0dWeWRIa25MQ0I3ZG1Gc2RXVTZJR1JsWm1sdVpWQnliM0JsY25SNWZTazdYRzRnSUNBZ0pHUmxabWx1WlZCeWIzQmxjblI1S0U5aWFtVmpkQ3dnSjJkbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNbkxDQjdkbUZzZFdVNklHZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTjlLVHRjYmlBZ0lDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb1QySnFaV04wTENBbloyVjBUM2R1VUhKdmNHVnlkSGxFWlhOamNtbHdkRzl5Snl3Z2UzWmhiSFZsT2lCblpYUlBkMjVRY205d1pYSjBlVVJsYzJOeWFYQjBiM0o5S1R0Y2JpQWdJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29UMkpxWldOMExuQnliM1J2ZEhsd1pTd2dKMmhoYzA5M2JsQnliM0JsY25SNUp5d2dlM1poYkhWbE9pQm9ZWE5QZDI1UWNtOXdaWEowZVgwcE8xeHVJQ0FnSUNSa1pXWnBibVZRY205d1pYSjBlU2hQWW1wbFkzUXNJQ2RtY21WbGVtVW5MQ0I3ZG1Gc2RXVTZJR1p5WldWNlpYMHBPMXh1SUNBZ0lDUmtaV1pwYm1WUWNtOXdaWEowZVNoUFltcGxZM1FzSUNkd2NtVjJaVzUwUlhoMFpXNXphVzl1Y3ljc0lIdDJZV3gxWlRvZ2NISmxkbVZ1ZEVWNGRHVnVjMmx2Ym5OOUtUdGNiaUFnSUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvVDJKcVpXTjBMQ0FuYzJWaGJDY3NJSHQyWVd4MVpUb2djMlZoYkgwcE8xeHVJQ0FnSUNSa1pXWnBibVZRY205d1pYSjBlU2hQWW1wbFkzUXNJQ2RyWlhsekp5d2dlM1poYkhWbE9pQnJaWGx6ZlNrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1pYaHdiM0owVTNSaGNpaHZZbXBsWTNRcElIdGNiaUFnSUNCbWIzSWdLSFpoY2lCcElEMGdNVHNnYVNBOElHRnlaM1Z0Wlc1MGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnZG1GeUlHNWhiV1Z6SUQwZ0pHZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTW9ZWEpuZFcxbGJuUnpXMmxkS1R0Y2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUdvZ1BTQXdPeUJxSUR3Z2JtRnRaWE11YkdWdVozUm9PeUJxS3lzcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUc1aGJXVWdQU0J1WVcxbGMxdHFYVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHpVM2x0WW05c1UzUnlhVzVuS0c1aGJXVXBLVnh1SUNBZ0lDQWdJQ0FnSUdOdmJuUnBiblZsTzF4dUlDQWdJQ0FnSUNBb1puVnVZM1JwYjI0b2JXOWtMQ0J1WVcxbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSkdSbFptbHVaVkJ5YjNCbGNuUjVLRzlpYW1WamRDd2dibUZ0WlN3Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWjJWME9pQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHMXZaRnR1WVcxbFhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwc1hHNGdJQ0FnSUNBZ0lDQWdJQ0JsYm5WdFpYSmhZbXhsT2lCMGNuVmxYRzRnSUNBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNBZ0lIMHBLR0Z5WjNWdFpXNTBjMXRwWFN3Z2JtRnRaWE5iYWwwcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdiMkpxWldOME8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHbHpUMkpxWldOMEtIZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z2VDQWhQU0J1ZFd4c0lDWW1JQ2gwZVhCbGIyWWdlQ0E5UFQwZ0oyOWlhbVZqZENjZ2ZId2dkSGx3Wlc5bUlIZ2dQVDA5SUNkbWRXNWpkR2x2YmljcE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlIUnZUMkpxWldOMEtIZ3BJSHRjYmlBZ0lDQnBaaUFvZUNBOVBTQnVkV3hzS1Z4dUlDQWdJQ0FnZEdoeWIzY2dKRlI1Y0dWRmNuSnZjaWdwTzF4dUlDQWdJSEpsZEhWeWJpQWtUMkpxWldOMEtIZ3BPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR05vWldOclQySnFaV04wUTI5bGNtTnBZbXhsS0dGeVozVnRaVzUwS1NCN1hHNGdJQ0FnYVdZZ0tHRnlaM1Z0Wlc1MElEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9KMVpoYkhWbElHTmhibTV2ZENCaVpTQmpiMjUyWlhKMFpXUWdkRzhnWVc0Z1QySnFaV04wSnlrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQmhjbWQxYldWdWREdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQndiMng1Wm1sc2JGTjViV0p2YkNobmJHOWlZV3dzSUZONWJXSnZiQ2tnZTF4dUlDQWdJR2xtSUNnaFoyeHZZbUZzTGxONWJXSnZiQ2tnZTF4dUlDQWdJQ0FnWjJ4dlltRnNMbE41YldKdmJDQTlJRk41YldKdmJEdGNiaUFnSUNBZ0lFOWlhbVZqZEM1blpYUlBkMjVRY205d1pYSjBlVk41YldKdmJITWdQU0JuWlhSUGQyNVFjbTl3WlhKMGVWTjViV0p2YkhNN1hHNGdJQ0FnZlZ4dUlDQWdJR2xtSUNnaFoyeHZZbUZzTGxONWJXSnZiQzVwZEdWeVlYUnZjaWtnZTF4dUlDQWdJQ0FnWjJ4dlltRnNMbE41YldKdmJDNXBkR1Z5WVhSdmNpQTlJRk41YldKdmJDZ25VM2x0WW05c0xtbDBaWEpoZEc5eUp5azdYRzRnSUNBZ2ZWeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlITmxkSFZ3UjJ4dlltRnNjeWhuYkc5aVlXd3BJSHRjYmlBZ0lDQndiMng1Wm1sc2JGTjViV0p2YkNobmJHOWlZV3dzSUZONWJXSnZiQ2s3WEc0Z0lDQWdaMnh2WW1Gc0xsSmxabXhsWTNRZ1BTQm5iRzlpWVd3dVVtVm1iR1ZqZENCOGZDQjdmVHRjYmlBZ0lDQm5iRzlpWVd3dVVtVm1iR1ZqZEM1bmJHOWlZV3dnUFNCbmJHOWlZV3d1VW1WbWJHVmpkQzVuYkc5aVlXd2dmSHdnWjJ4dlltRnNPMXh1SUNBZ0lIQnZiSGxtYVd4c1QySnFaV04wS0dkc2IySmhiQzVQWW1wbFkzUXBPMXh1SUNCOVhHNGdJSE5sZEhWd1IyeHZZbUZzY3lobmJHOWlZV3dwTzF4dUlDQm5iRzlpWVd3dUpIUnlZV05sZFhKU2RXNTBhVzFsSUQwZ2UxeHVJQ0FnSUdOb1pXTnJUMkpxWldOMFEyOWxjbU5wWW14bE9pQmphR1ZqYTA5aWFtVmpkRU52WlhKamFXSnNaU3hjYmlBZ0lDQmpjbVZoZEdWUWNtbDJZWFJsVG1GdFpUb2dZM0psWVhSbFVISnBkbUYwWlU1aGJXVXNYRzRnSUNBZ1pHVm1hVzVsVUhKdmNHVnlkR2xsY3pvZ0pHUmxabWx1WlZCeWIzQmxjblJwWlhNc1hHNGdJQ0FnWkdWbWFXNWxVSEp2Y0dWeWRIazZJQ1JrWldacGJtVlFjbTl3WlhKMGVTeGNiaUFnSUNCbGVIQnZjblJUZEdGeU9pQmxlSEJ2Y25SVGRHRnlMRnh1SUNBZ0lHZGxkRTkzYmtoaGMyaFBZbXBsWTNRNklHZGxkRTkzYmtoaGMyaFBZbXBsWTNRc1hHNGdJQ0FnWjJWMFQzZHVVSEp2Y0dWeWRIbEVaWE5qY21sd2RHOXlPaUFrWjJWMFQzZHVVSEp2Y0dWeWRIbEVaWE5qY21sd2RHOXlMRnh1SUNBZ0lHZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTTZJQ1JuWlhSUGQyNVFjbTl3WlhKMGVVNWhiV1Z6TEZ4dUlDQWdJR2x6VDJKcVpXTjBPaUJwYzA5aWFtVmpkQ3hjYmlBZ0lDQnBjMUJ5YVhaaGRHVk9ZVzFsT2lCcGMxQnlhWFpoZEdWT1lXMWxMRnh1SUNBZ0lHbHpVM2x0WW05c1UzUnlhVzVuT2lCcGMxTjViV0p2YkZOMGNtbHVaeXhjYmlBZ0lDQnJaWGx6T2lBa2EyVjVjeXhjYmlBZ0lDQnpaWFIxY0Vkc2IySmhiSE02SUhObGRIVndSMnh2WW1Gc2N5eGNiaUFnSUNCMGIwOWlhbVZqZERvZ2RHOVBZbXBsWTNRc1hHNGdJQ0FnZEc5UWNtOXdaWEowZVRvZ2RHOVFjbTl3WlhKMGVTeGNiaUFnSUNCMGVYQmxiMlk2SUhSNWNHVlBabHh1SUNCOU8xeHVmU2tvZEhsd1pXOW1JSGRwYm1SdmR5QWhQVDBnSjNWdVpHVm1hVzVsWkNjZ1B5QjNhVzVrYjNjZ09pQjBlWEJsYjJZZ1oyeHZZbUZzSUNFOVBTQW5kVzVrWldacGJtVmtKeUEvSUdkc2IySmhiQ0E2SUhSNWNHVnZaaUJ6Wld4bUlDRTlQU0FuZFc1a1pXWnBibVZrSnlBL0lITmxiR1lnT2lCMGFHbHpLVHRjYmlobWRXNWpkR2x2YmlncElIdGNiaUFnSjNWelpTQnpkSEpwWTNRbk8xeHVJQ0IyWVhJZ2NHRjBhRHRjYmlBZ1puVnVZM1JwYjI0Z2NtVnNZWFJwZG1WU1pYRjFhWEpsS0dOaGJHeGxjbEJoZEdnc0lISmxjWFZwY21Wa1VHRjBhQ2tnZTF4dUlDQWdJSEJoZEdnZ1BTQndZWFJvSUh4OElIUjVjR1Z2WmlCeVpYRjFhWEpsSUNFOVBTQW5kVzVrWldacGJtVmtKeUFtSmlCeVpYRjFhWEpsS0Nkd1lYUm9KeWs3WEc0Z0lDQWdablZ1WTNScGIyNGdhWE5FYVhKbFkzUnZjbmtvY0dGMGFDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIQmhkR2d1YzJ4cFkyVW9MVEVwSUQwOVBTQW5MeWM3WEc0Z0lDQWdmVnh1SUNBZ0lHWjFibU4wYVc5dUlHbHpRV0p6YjJ4MWRHVW9jR0YwYUNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhCaGRHaGJNRjBnUFQwOUlDY3ZKenRjYmlBZ0lDQjlYRzRnSUNBZ1puVnVZM1JwYjI0Z2FYTlNaV3hoZEdsMlpTaHdZWFJvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnY0dGMGFGc3dYU0E5UFQwZ0p5NG5PMXh1SUNBZ0lIMWNiaUFnSUNCcFppQW9hWE5FYVhKbFkzUnZjbmtvY21WeGRXbHlaV1JRWVhSb0tTQjhmQ0JwYzBGaWMyOXNkWFJsS0hKbGNYVnBjbVZrVUdGMGFDa3BYRzRnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnY21WMGRYSnVJR2x6VW1Wc1lYUnBkbVVvY21WeGRXbHlaV1JRWVhSb0tTQS9JSEpsY1hWcGNtVW9jR0YwYUM1eVpYTnZiSFpsS0hCaGRHZ3VaR2x5Ym1GdFpTaGpZV3hzWlhKUVlYUm9LU3dnY21WeGRXbHlaV1JRWVhSb0tTa2dPaUJ5WlhGMWFYSmxLSEpsY1hWcGNtVmtVR0YwYUNrN1hHNGdJSDFjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG5KbGNYVnBjbVVnUFNCeVpXeGhkR2wyWlZKbGNYVnBjbVU3WEc1OUtTZ3BPMXh1S0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNGdJR1oxYm1OMGFXOXVJSE53Y21WaFpDZ3BJSHRjYmlBZ0lDQjJZWElnY25ZZ1BTQmJYU3hjYmlBZ0lDQWdJQ0FnYWlBOUlEQXNYRzRnSUNBZ0lDQWdJR2wwWlhKU1pYTjFiSFE3WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0JoY21kMWJXVnVkSE11YkdWdVozUm9PeUJwS3lzcElIdGNiaUFnSUNBZ0lIWmhjaUIyWVd4MVpWUnZVM0J5WldGa0lEMGdKSFJ5WVdObGRYSlNkVzUwYVcxbExtTm9aV05yVDJKcVpXTjBRMjlsY21OcFlteGxLR0Z5WjNWdFpXNTBjMXRwWFNrN1hHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlIWmhiSFZsVkc5VGNISmxZV1JiSkhSeVlXTmxkWEpTZFc1MGFXMWxMblJ2VUhKdmNHVnlkSGtvVTNsdFltOXNMbWwwWlhKaGRHOXlLVjBnSVQwOUlDZG1kVzVqZEdsdmJpY3BJSHRjYmlBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblEyRnVibTkwSUhOd2NtVmhaQ0J1YjI0dGFYUmxjbUZpYkdVZ2IySnFaV04wTGljcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2RtRnlJR2wwWlhJZ1BTQjJZV3gxWlZSdlUzQnlaV0ZrV3lSMGNtRmpaWFZ5VW5WdWRHbHRaUzUwYjFCeWIzQmxjblI1S0ZONWJXSnZiQzVwZEdWeVlYUnZjaWxkS0NrN1hHNGdJQ0FnSUNCM2FHbHNaU0FvSVNocGRHVnlVbVZ6ZFd4MElEMGdhWFJsY2k1dVpYaDBLQ2twTG1SdmJtVXBJSHRjYmlBZ0lDQWdJQ0FnY25aYmFpc3JYU0E5SUdsMFpYSlNaWE4xYkhRdWRtRnNkV1U3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCeWRqdGNiaUFnZlZ4dUlDQWtkSEpoWTJWMWNsSjFiblJwYldVdWMzQnlaV0ZrSUQwZ2MzQnlaV0ZrTzF4dWZTa29LVHRjYmlobWRXNWpkR2x2YmlncElIdGNiaUFnSjNWelpTQnpkSEpwWTNRbk8xeHVJQ0IyWVhJZ0pFOWlhbVZqZENBOUlFOWlhbVZqZER0Y2JpQWdkbUZ5SUNSVWVYQmxSWEp5YjNJZ1BTQlVlWEJsUlhKeWIzSTdYRzRnSUhaaGNpQWtZM0psWVhSbElEMGdKRTlpYW1WamRDNWpjbVZoZEdVN1hHNGdJSFpoY2lBa1pHVm1hVzVsVUhKdmNHVnlkR2xsY3lBOUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1a1pXWnBibVZRY205d1pYSjBhV1Z6TzF4dUlDQjJZWElnSkdSbFptbHVaVkJ5YjNCbGNuUjVJRDBnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbVJsWm1sdVpWQnliM0JsY25SNU8xeHVJQ0IyWVhJZ0pHZGxkRTkzYmxCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2lBOUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1blpYUlBkMjVRY205d1pYSjBlVVJsYzJOeWFYQjBiM0k3WEc0Z0lIWmhjaUFrWjJWMFQzZHVVSEp2Y0dWeWRIbE9ZVzFsY3lBOUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1blpYUlBkMjVRY205d1pYSjBlVTVoYldWek8xeHVJQ0IyWVhJZ0pHZGxkRkJ5YjNSdmRIbHdaVTltSUQwZ1QySnFaV04wTG1kbGRGQnliM1J2ZEhsd1pVOW1PMXh1SUNCMllYSWdKRjlmTUNBOUlFOWlhbVZqZEN4Y2JpQWdJQ0FnSUdkbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNZ1BTQWtYMTh3TG1kbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNc1hHNGdJQ0FnSUNCblpYUlBkMjVRY205d1pYSjBlVk41YldKdmJITWdQU0FrWDE4d0xtZGxkRTkzYmxCeWIzQmxjblI1VTNsdFltOXNjenRjYmlBZ1puVnVZM1JwYjI0Z2MzVndaWEpFWlhOamNtbHdkRzl5S0dodmJXVlBZbXBsWTNRc0lHNWhiV1VwSUh0Y2JpQWdJQ0IyWVhJZ2NISnZkRzhnUFNBa1oyVjBVSEp2ZEc5MGVYQmxUMllvYUc5dFpVOWlhbVZqZENrN1hHNGdJQ0FnWkc4Z2UxeHVJQ0FnSUNBZ2RtRnlJSEpsYzNWc2RDQTlJQ1JuWlhSUGQyNVFjbTl3WlhKMGVVUmxjMk55YVhCMGIzSW9jSEp2ZEc4c0lHNWhiV1VwTzF4dUlDQWdJQ0FnYVdZZ0tISmxjM1ZzZENsY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhKbGMzVnNkRHRjYmlBZ0lDQWdJSEJ5YjNSdklEMGdKR2RsZEZCeWIzUnZkSGx3WlU5bUtIQnliM1J2S1R0Y2JpQWdJQ0I5SUhkb2FXeGxJQ2h3Y205MGJ5azdYRzRnSUNBZ2NtVjBkWEp1SUhWdVpHVm1hVzVsWkR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCemRYQmxja052Ym5OMGNuVmpkRzl5S0dOMGIzSXBJSHRjYmlBZ0lDQnlaWFIxY200Z1kzUnZjaTVmWDNCeWIzUnZYMTg3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnYzNWd1pYSkRZV3hzS0hObGJHWXNJR2h2YldWUFltcGxZM1FzSUc1aGJXVXNJR0Z5WjNNcElIdGNiaUFnSUNCeVpYUjFjbTRnYzNWd1pYSkhaWFFvYzJWc1ppd2dhRzl0WlU5aWFtVmpkQ3dnYm1GdFpTa3VZWEJ3Ykhrb2MyVnNaaXdnWVhKbmN5azdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjM1Z3WlhKSFpYUW9jMlZzWml3Z2FHOXRaVTlpYW1WamRDd2dibUZ0WlNrZ2UxeHVJQ0FnSUhaaGNpQmtaWE5qY21sd2RHOXlJRDBnYzNWd1pYSkVaWE5qY21sd2RHOXlLR2h2YldWUFltcGxZM1FzSUc1aGJXVXBPMXh1SUNBZ0lHbG1JQ2hrWlhOamNtbHdkRzl5S1NCN1hHNGdJQ0FnSUNCcFppQW9JV1JsYzJOeWFYQjBiM0l1WjJWMEtWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1pHVnpZM0pwY0hSdmNpNTJZV3gxWlR0Y2JpQWdJQ0FnSUhKbGRIVnliaUJrWlhOamNtbHdkRzl5TG1kbGRDNWpZV3hzS0hObGJHWXBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnZFc1a1pXWnBibVZrTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUhOMWNHVnlVMlYwS0hObGJHWXNJR2h2YldWUFltcGxZM1FzSUc1aGJXVXNJSFpoYkhWbEtTQjdYRzRnSUNBZ2RtRnlJR1JsYzJOeWFYQjBiM0lnUFNCemRYQmxja1JsYzJOeWFYQjBiM0lvYUc5dFpVOWlhbVZqZEN3Z2JtRnRaU2s3WEc0Z0lDQWdhV1lnS0dSbGMyTnlhWEIwYjNJZ0ppWWdaR1Z6WTNKcGNIUnZjaTV6WlhRcElIdGNiaUFnSUNBZ0lHUmxjMk55YVhCMGIzSXVjMlYwTG1OaGJHd29jMlZzWml3Z2RtRnNkV1VwTzF4dUlDQWdJQ0FnY21WMGRYSnVJSFpoYkhWbE8xeHVJQ0FnSUgxY2JpQWdJQ0IwYUhKdmR5QWtWSGx3WlVWeWNtOXlLQ2hjSW5OMWNHVnlJR2hoY3lCdWJ5QnpaWFIwWlhJZ0oxd2lJQ3NnYm1GdFpTQXJJRndpSnk1Y0lpa3BPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR2RsZEVSbGMyTnlhWEIwYjNKektHOWlhbVZqZENrZ2UxeHVJQ0FnSUhaaGNpQmtaWE5qY21sd2RHOXljeUE5SUh0OU8xeHVJQ0FnSUhaaGNpQnVZVzFsY3lBOUlHZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTW9iMkpxWldOMEtUdGNiaUFnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElHNWhiV1Z6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQjJZWElnYm1GdFpTQTlJRzVoYldWelcybGRPMXh1SUNBZ0lDQWdaR1Z6WTNKcGNIUnZjbk5iYm1GdFpWMGdQU0FrWjJWMFQzZHVVSEp2Y0dWeWRIbEVaWE5qY21sd2RHOXlLRzlpYW1WamRDd2dibUZ0WlNrN1hHNGdJQ0FnZlZ4dUlDQWdJSFpoY2lCemVXMWliMnh6SUQwZ1oyVjBUM2R1VUhKdmNHVnlkSGxUZVcxaWIyeHpLRzlpYW1WamRDazdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnplVzFpYjJ4ekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2MzbHRZbTlzSUQwZ2MzbHRZbTlzYzF0cFhUdGNiaUFnSUNBZ0lHUmxjMk55YVhCMGIzSnpXeVIwY21GalpYVnlVblZ1ZEdsdFpTNTBiMUJ5YjNCbGNuUjVLSE41YldKdmJDbGRJRDBnSkdkbGRFOTNibEJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaWh2WW1wbFkzUXNJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNTBiMUJ5YjNCbGNuUjVLSE41YldKdmJDa3BPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnWkdWelkzSnBjSFJ2Y25NN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1kzSmxZWFJsUTJ4aGMzTW9ZM1J2Y2l3Z2IySnFaV04wTENCemRHRjBhV05QWW1wbFkzUXNJSE4xY0dWeVEyeGhjM01wSUh0Y2JpQWdJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29iMkpxWldOMExDQW5ZMjl1YzNSeWRXTjBiM0luTENCN1hHNGdJQ0FnSUNCMllXeDFaVG9nWTNSdmNpeGNiaUFnSUNBZ0lHTnZibVpwWjNWeVlXSnNaVG9nZEhKMVpTeGNiaUFnSUNBZ0lHVnVkVzFsY21GaWJHVTZJR1poYkhObExGeHVJQ0FnSUNBZ2QzSnBkR0ZpYkdVNklIUnlkV1ZjYmlBZ0lDQjlLVHRjYmlBZ0lDQnBaaUFvWVhKbmRXMWxiblJ6TG14bGJtZDBhQ0ErSURNcElIdGNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdjM1Z3WlhKRGJHRnpjeUE5UFQwZ0oyWjFibU4wYVc5dUp5bGNiaUFnSUNBZ0lDQWdZM1J2Y2k1ZlgzQnliM1J2WDE4Z1BTQnpkWEJsY2tOc1lYTnpPMXh1SUNBZ0lDQWdZM1J2Y2k1d2NtOTBiM1I1Y0dVZ1BTQWtZM0psWVhSbEtHZGxkRkJ5YjNSdlVHRnlaVzUwS0hOMWNHVnlRMnhoYzNNcExDQm5aWFJFWlhOamNtbHdkRzl5Y3lodlltcGxZM1FwS1R0Y2JpQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdZM1J2Y2k1d2NtOTBiM1I1Y0dVZ1BTQnZZbXBsWTNRN1hHNGdJQ0FnZlZ4dUlDQWdJQ1JrWldacGJtVlFjbTl3WlhKMGVTaGpkRzl5TENBbmNISnZkRzkwZVhCbEp5d2dlMXh1SUNBZ0lDQWdZMjl1Wm1sbmRYSmhZbXhsT2lCbVlXeHpaU3hjYmlBZ0lDQWdJSGR5YVhSaFlteGxPaUJtWVd4elpWeHVJQ0FnSUgwcE8xeHVJQ0FnSUhKbGRIVnliaUFrWkdWbWFXNWxVSEp2Y0dWeWRHbGxjeWhqZEc5eUxDQm5aWFJFWlhOamNtbHdkRzl5Y3loemRHRjBhV05QWW1wbFkzUXBLVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJuWlhSUWNtOTBiMUJoY21WdWRDaHpkWEJsY2tOc1lYTnpLU0I3WEc0Z0lDQWdhV1lnS0hSNWNHVnZaaUJ6ZFhCbGNrTnNZWE56SUQwOVBTQW5ablZ1WTNScGIyNG5LU0I3WEc0Z0lDQWdJQ0IyWVhJZ2NISnZkRzkwZVhCbElEMGdjM1Z3WlhKRGJHRnpjeTV3Y205MGIzUjVjR1U3WEc0Z0lDQWdJQ0JwWmlBb0pFOWlhbVZqZENod2NtOTBiM1I1Y0dVcElEMDlQU0J3Y205MGIzUjVjR1VnZkh3Z2NISnZkRzkwZVhCbElEMDlQU0J1ZFd4c0tWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2MzVndaWEpEYkdGemN5NXdjbTkwYjNSNWNHVTdYRzRnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dKRlI1Y0dWRmNuSnZjaWduYzNWd1pYSWdjSEp2ZEc5MGVYQmxJRzExYzNRZ1ltVWdZVzRnVDJKcVpXTjBJRzl5SUc1MWJHd25LVHRjYmlBZ0lDQjlYRzRnSUNBZ2FXWWdLSE4xY0dWeVEyeGhjM01nUFQwOUlHNTFiR3dwWEc0Z0lDQWdJQ0J5WlhSMWNtNGdiblZzYkR0Y2JpQWdJQ0IwYUhKdmR5QnVaWGNnSkZSNWNHVkZjbkp2Y2lnb1hDSlRkWEJsY2lCbGVIQnlaWE56YVc5dUlHMTFjM1FnWldsMGFHVnlJR0psSUc1MWJHd2diM0lnWVNCbWRXNWpkR2x2Yml3Z2JtOTBJRndpSUNzZ2RIbHdaVzltSUhOMWNHVnlRMnhoYzNNZ0t5QmNJaTVjSWlrcE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHUmxabUYxYkhSVGRYQmxja05oYkd3b2MyVnNaaXdnYUc5dFpVOWlhbVZqZEN3Z1lYSm5jeWtnZTF4dUlDQWdJR2xtSUNna1oyVjBVSEp2ZEc5MGVYQmxUMllvYUc5dFpVOWlhbVZqZENrZ0lUMDlJRzUxYkd3cFhHNGdJQ0FnSUNCemRYQmxja05oYkd3b2MyVnNaaXdnYUc5dFpVOWlhbVZqZEN3Z0oyTnZibk4wY25WamRHOXlKeXdnWVhKbmN5azdYRzRnSUgxY2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExtTnlaV0YwWlVOc1lYTnpJRDBnWTNKbFlYUmxRMnhoYzNNN1hHNGdJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWtaV1poZFd4MFUzVndaWEpEWVd4c0lEMGdaR1ZtWVhWc2RGTjFjR1Z5UTJGc2JEdGNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbk4xY0dWeVEyRnNiQ0E5SUhOMWNHVnlRMkZzYkR0Y2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExuTjFjR1Z5UTI5dWMzUnlkV04wYjNJZ1BTQnpkWEJsY2tOdmJuTjBjblZqZEc5eU8xeHVJQ0FrZEhKaFkyVjFjbEoxYm5ScGJXVXVjM1Z3WlhKSFpYUWdQU0J6ZFhCbGNrZGxkRHRjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG5OMWNHVnlVMlYwSUQwZ2MzVndaWEpUWlhRN1hHNTlLU2dwTzF4dUtHWjFibU4wYVc5dUtDa2dlMXh1SUNBbmRYTmxJSE4wY21samRDYzdYRzRnSUdsbUlDaDBlWEJsYjJZZ0pIUnlZV05sZFhKU2RXNTBhVzFsSUNFOVBTQW5iMkpxWldOMEp5a2dlMXh1SUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnbmRISmhZMlYxY2lCeWRXNTBhVzFsSUc1dmRDQm1iM1Z1WkM0bktUdGNiaUFnZlZ4dUlDQjJZWElnWTNKbFlYUmxVSEpwZG1GMFpVNWhiV1VnUFNBa2RISmhZMlYxY2xKMWJuUnBiV1V1WTNKbFlYUmxVSEpwZG1GMFpVNWhiV1U3WEc0Z0lIWmhjaUFrWkdWbWFXNWxVSEp2Y0dWeWRHbGxjeUE5SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVrWldacGJtVlFjbTl3WlhKMGFXVnpPMXh1SUNCMllYSWdKR1JsWm1sdVpWQnliM0JsY25SNUlEMGdKSFJ5WVdObGRYSlNkVzUwYVcxbExtUmxabWx1WlZCeWIzQmxjblI1TzF4dUlDQjJZWElnSkdOeVpXRjBaU0E5SUU5aWFtVmpkQzVqY21WaGRHVTdYRzRnSUhaaGNpQWtWSGx3WlVWeWNtOXlJRDBnVkhsd1pVVnljbTl5TzF4dUlDQm1kVzVqZEdsdmJpQnViMjVGYm5WdEtIWmhiSFZsS1NCN1hHNGdJQ0FnY21WMGRYSnVJSHRjYmlBZ0lDQWdJR052Ym1acFozVnlZV0pzWlRvZ2RISjFaU3hjYmlBZ0lDQWdJR1Z1ZFcxbGNtRmliR1U2SUdaaGJITmxMRnh1SUNBZ0lDQWdkbUZzZFdVNklIWmhiSFZsTEZ4dUlDQWdJQ0FnZDNKcGRHRmliR1U2SUhSeWRXVmNiaUFnSUNCOU8xeHVJQ0I5WEc0Z0lIWmhjaUJUVkY5T1JWZENUMUpPSUQwZ01EdGNiaUFnZG1GeUlGTlVYMFZZUlVOVlZFbE9SeUE5SURFN1hHNGdJSFpoY2lCVFZGOVRWVk5RUlU1RVJVUWdQU0F5TzF4dUlDQjJZWElnVTFSZlEweFBVMFZFSUQwZ016dGNiaUFnZG1GeUlFVk9SRjlUVkVGVVJTQTlJQzB5TzF4dUlDQjJZWElnVWtWVVNGSlBWMTlUVkVGVVJTQTlJQzB6TzF4dUlDQm1kVzVqZEdsdmJpQm5aWFJKYm5SbGNtNWhiRVZ5Y205eUtITjBZWFJsS1NCN1hHNGdJQ0FnY21WMGRYSnVJRzVsZHlCRmNuSnZjaWduVkhKaFkyVjFjaUJqYjIxd2FXeGxjaUJpZFdjNklHbHVkbUZzYVdRZ2MzUmhkR1VnYVc0Z2MzUmhkR1VnYldGamFHbHVaVG9nSnlBcklITjBZWFJsS1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCSFpXNWxjbUYwYjNKRGIyNTBaWGgwS0NrZ2UxeHVJQ0FnSUhSb2FYTXVjM1JoZEdVZ1BTQXdPMXh1SUNBZ0lIUm9hWE11UjFOMFlYUmxJRDBnVTFSZlRrVlhRazlTVGp0Y2JpQWdJQ0IwYUdsekxuTjBiM0psWkVWNFkyVndkR2x2YmlBOUlIVnVaR1ZtYVc1bFpEdGNiaUFnSUNCMGFHbHpMbVpwYm1Gc2JIbEdZV3hzVkdoeWIzVm5hQ0E5SUhWdVpHVm1hVzVsWkR0Y2JpQWdJQ0IwYUdsekxuTmxiblJmSUQwZ2RXNWtaV1pwYm1Wa08xeHVJQ0FnSUhSb2FYTXVjbVYwZFhKdVZtRnNkV1VnUFNCMWJtUmxabWx1WldRN1hHNGdJQ0FnZEdocGN5NTBjbmxUZEdGamExOGdQU0JiWFR0Y2JpQWdmVnh1SUNCSFpXNWxjbUYwYjNKRGIyNTBaWGgwTG5CeWIzUnZkSGx3WlNBOUlIdGNiaUFnSUNCd2RYTm9WSEo1T2lCbWRXNWpkR2x2YmloallYUmphRk4wWVhSbExDQm1hVzVoYkd4NVUzUmhkR1VwSUh0Y2JpQWdJQ0FnSUdsbUlDaG1hVzVoYkd4NVUzUmhkR1VnSVQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1pwYm1Gc2JIbEdZV3hzVkdoeWIzVm5hQ0E5SUc1MWJHdzdYRzRnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNCMGFHbHpMblJ5ZVZOMFlXTnJYeTVzWlc1bmRHZ2dMU0F4T3lCcElENDlJREE3SUdrdExTa2dlMXh1SUNBZ0lDQWdJQ0FnSUdsbUlDaDBhR2x6TG5SeWVWTjBZV05yWDF0cFhTNWpZWFJqYUNBaFBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQm1hVzVoYkd4NVJtRnNiRlJvY205MVoyZ2dQU0IwYUdsekxuUnllVk4wWVdOclgxdHBYUzVqWVhSamFEdGNiaUFnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnBaaUFvWm1sdVlXeHNlVVpoYkd4VWFISnZkV2RvSUQwOVBTQnVkV3hzS1Z4dUlDQWdJQ0FnSUNBZ0lHWnBibUZzYkhsR1lXeHNWR2h5YjNWbmFDQTlJRkpGVkVoU1QxZGZVMVJCVkVVN1hHNGdJQ0FnSUNBZ0lIUm9hWE11ZEhKNVUzUmhZMnRmTG5CMWMyZ29lMXh1SUNBZ0lDQWdJQ0FnSUdacGJtRnNiSGs2SUdacGJtRnNiSGxUZEdGMFpTeGNiaUFnSUNBZ0lDQWdJQ0JtYVc1aGJHeDVSbUZzYkZSb2NtOTFaMmc2SUdacGJtRnNiSGxHWVd4c1ZHaHliM1ZuYUZ4dUlDQWdJQ0FnSUNCOUtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2hqWVhSamFGTjBZWFJsSUNFOVBTQnVkV3hzS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11ZEhKNVUzUmhZMnRmTG5CMWMyZ29lMk5oZEdOb09pQmpZWFJqYUZOMFlYUmxmU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmlBZ0lDQndiM0JVY25rNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdkR2hwY3k1MGNubFRkR0ZqYTE4dWNHOXdLQ2s3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnYzJWdWRDZ3BJSHRjYmlBZ0lDQWdJSFJvYVhNdWJXRjVZbVZVYUhKdmR5Z3BPMXh1SUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE11YzJWdWRGODdYRzRnSUNBZ2ZTeGNiaUFnSUNCelpYUWdjMlZ1ZENoMktTQjdYRzRnSUNBZ0lDQjBhR2x6TG5ObGJuUmZJRDBnZGp0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCelpXNTBTV2R1YjNKbFZHaHliM2NvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NXpaVzUwWHp0Y2JpQWdJQ0I5TEZ4dUlDQWdJRzFoZVdKbFZHaHliM2M2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2FXWWdLSFJvYVhNdVlXTjBhVzl1SUQwOVBTQW5kR2h5YjNjbktTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVlXTjBhVzl1SUQwZ0oyNWxlSFFuTzF4dUlDQWdJQ0FnSUNCMGFISnZkeUIwYUdsekxuTmxiblJmTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdaVzVrT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lITjNhWFJqYUNBb2RHaHBjeTV6ZEdGMFpTa2dlMXh1SUNBZ0lDQWdJQ0JqWVhObElFVk9SRjlUVkVGVVJUcGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdkR2hwY3p0Y2JpQWdJQ0FnSUNBZ1kyRnpaU0JTUlZSSVVrOVhYMU5VUVZSRk9seHVJQ0FnSUNBZ0lDQWdJSFJvY205M0lIUm9hWE11YzNSdmNtVmtSWGhqWlhCMGFXOXVPMXh1SUNBZ0lDQWdJQ0JrWldaaGRXeDBPbHh1SUNBZ0lDQWdJQ0FnSUhSb2NtOTNJR2RsZEVsdWRHVnlibUZzUlhKeWIzSW9kR2hwY3k1emRHRjBaU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmlBZ0lDQm9ZVzVrYkdWRmVHTmxjSFJwYjI0NklHWjFibU4wYVc5dUtHVjRLU0I3WEc0Z0lDQWdJQ0IwYUdsekxrZFRkR0YwWlNBOUlGTlVYME5NVDFORlJEdGNiaUFnSUNBZ0lIUm9hWE11YzNSaGRHVWdQU0JGVGtSZlUxUkJWRVU3WEc0Z0lDQWdJQ0IwYUhKdmR5QmxlRHRjYmlBZ0lDQjlYRzRnSUgwN1hHNGdJR1oxYm1OMGFXOXVJRzVsZUhSUGNsUm9jbTkzS0dOMGVDd2diVzkyWlU1bGVIUXNJR0ZqZEdsdmJpd2dlQ2tnZTF4dUlDQWdJSE4zYVhSamFDQW9ZM1I0TGtkVGRHRjBaU2tnZTF4dUlDQWdJQ0FnWTJGelpTQlRWRjlGV0VWRFZWUkpUa2M2WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWdvWENKY1hGd2lYQ0lnS3lCaFkzUnBiMjRnS3lCY0lseGNYQ0lnYjI0Z1pYaGxZM1YwYVc1bklHZGxibVZ5WVhSdmNsd2lLU2s3WEc0Z0lDQWdJQ0JqWVhObElGTlVYME5NVDFORlJEcGNiaUFnSUNBZ0lDQWdhV1lnS0dGamRHbHZiaUE5UFNBbmJtVjRkQ2NwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1Gc2RXVTZJSFZ1WkdWbWFXNWxaQ3hjYmlBZ0lDQWdJQ0FnSUNBZ0lHUnZibVU2SUhSeWRXVmNiaUFnSUNBZ0lDQWdJQ0I5TzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIUm9jbTkzSUhnN1hHNGdJQ0FnSUNCallYTmxJRk5VWDA1RlYwSlBVazQ2WEc0Z0lDQWdJQ0FnSUdsbUlDaGhZM1JwYjI0Z1BUMDlJQ2QwYUhKdmR5Y3BJSHRjYmlBZ0lDQWdJQ0FnSUNCamRIZ3VSMU4wWVhSbElEMGdVMVJmUTB4UFUwVkVPMXh1SUNBZ0lDQWdJQ0FnSUhSb2NtOTNJSGc3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2FXWWdLSGdnSVQwOUlIVnVaR1ZtYVc1bFpDbGNiaUFnSUNBZ0lDQWdJQ0IwYUhKdmR5QWtWSGx3WlVWeWNtOXlLQ2RUWlc1MElIWmhiSFZsSUhSdklHNWxkMkp2Y200Z1oyVnVaWEpoZEc5eUp5azdYRzRnSUNBZ0lDQmpZWE5sSUZOVVgxTlZVMUJGVGtSRlJEcGNiaUFnSUNBZ0lDQWdZM1I0TGtkVGRHRjBaU0E5SUZOVVgwVllSVU5WVkVsT1J6dGNiaUFnSUNBZ0lDQWdZM1I0TG1GamRHbHZiaUE5SUdGamRHbHZianRjYmlBZ0lDQWdJQ0FnWTNSNExuTmxiblFnUFNCNE8xeHVJQ0FnSUNBZ0lDQjJZWElnZG1Gc2RXVWdQU0J0YjNabFRtVjRkQ2hqZEhncE8xeHVJQ0FnSUNBZ0lDQjJZWElnWkc5dVpTQTlJSFpoYkhWbElEMDlQU0JqZEhnN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hrYjI1bEtWeHVJQ0FnSUNBZ0lDQWdJSFpoYkhWbElEMGdZM1I0TG5KbGRIVnlibFpoYkhWbE8xeHVJQ0FnSUNBZ0lDQmpkSGd1UjFOMFlYUmxJRDBnWkc5dVpTQS9JRk5VWDBOTVQxTkZSQ0E2SUZOVVgxTlZVMUJGVGtSRlJEdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIdGNiaUFnSUNBZ0lDQWdJQ0IyWVd4MVpUb2dkbUZzZFdVc1hHNGdJQ0FnSUNBZ0lDQWdaRzl1WlRvZ1pHOXVaVnh1SUNBZ0lDQWdJQ0I5TzF4dUlDQWdJSDFjYmlBZ2ZWeHVJQ0IyWVhJZ1kzUjRUbUZ0WlNBOUlHTnlaV0YwWlZCeWFYWmhkR1ZPWVcxbEtDazdYRzRnSUhaaGNpQnRiM1psVG1WNGRFNWhiV1VnUFNCamNtVmhkR1ZRY21sMllYUmxUbUZ0WlNncE8xeHVJQ0JtZFc1amRHbHZiaUJIWlc1bGNtRjBiM0pHZFc1amRHbHZiaWdwSUh0OVhHNGdJR1oxYm1OMGFXOXVJRWRsYm1WeVlYUnZja1oxYm1OMGFXOXVVSEp2ZEc5MGVYQmxLQ2tnZTMxY2JpQWdSMlZ1WlhKaGRHOXlSblZ1WTNScGIyNHVjSEp2ZEc5MGVYQmxJRDBnUjJWdVpYSmhkRzl5Um5WdVkzUnBiMjVRY205MGIzUjVjR1U3WEc0Z0lDUmtaV1pwYm1WUWNtOXdaWEowZVNoSFpXNWxjbUYwYjNKR2RXNWpkR2x2YmxCeWIzUnZkSGx3WlN3Z0oyTnZibk4wY25WamRHOXlKeXdnYm05dVJXNTFiU2hIWlc1bGNtRjBiM0pHZFc1amRHbHZiaWtwTzF4dUlDQkhaVzVsY21GMGIzSkdkVzVqZEdsdmJsQnliM1J2ZEhsd1pTNXdjbTkwYjNSNWNHVWdQU0I3WEc0Z0lDQWdZMjl1YzNSeWRXTjBiM0k2SUVkbGJtVnlZWFJ2Y2taMWJtTjBhVzl1VUhKdmRHOTBlWEJsTEZ4dUlDQWdJRzVsZUhRNklHWjFibU4wYVc5dUtIWXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnVaWGgwVDNKVWFISnZkeWgwYUdselcyTjBlRTVoYldWZExDQjBhR2x6VzIxdmRtVk9aWGgwVG1GdFpWMHNJQ2R1WlhoMEp5d2dkaWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQjBhSEp2ZHpvZ1puVnVZM1JwYjI0b2Rpa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHNWxlSFJQY2xSb2NtOTNLSFJvYVhOYlkzUjRUbUZ0WlYwc0lIUm9hWE5iYlc5MlpVNWxlSFJPWVcxbFhTd2dKM1JvY205M0p5d2dkaWs3WEc0Z0lDQWdmVnh1SUNCOU8xeHVJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRHbGxjeWhIWlc1bGNtRjBiM0pHZFc1amRHbHZibEJ5YjNSdmRIbHdaUzV3Y205MGIzUjVjR1VzSUh0Y2JpQWdJQ0JqYjI1emRISjFZM1J2Y2pvZ2UyVnVkVzFsY21GaWJHVTZJR1poYkhObGZTeGNiaUFnSUNCdVpYaDBPaUI3Wlc1MWJXVnlZV0pzWlRvZ1ptRnNjMlY5TEZ4dUlDQWdJSFJvY205M09pQjdaVzUxYldWeVlXSnNaVG9nWm1Gc2MyVjlYRzRnSUgwcE8xeHVJQ0JQWW1wbFkzUXVaR1ZtYVc1bFVISnZjR1Z5ZEhrb1IyVnVaWEpoZEc5eVJuVnVZM1JwYjI1UWNtOTBiM1I1Y0dVdWNISnZkRzkwZVhCbExDQlRlVzFpYjJ3dWFYUmxjbUYwYjNJc0lHNXZia1Z1ZFcwb1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUhSb2FYTTdYRzRnSUgwcEtUdGNiaUFnWm5WdVkzUnBiMjRnWTNKbFlYUmxSMlZ1WlhKaGRHOXlTVzV6ZEdGdVkyVW9hVzV1WlhKR2RXNWpkR2x2Yml3Z1puVnVZM1JwYjI1UFltcGxZM1FzSUhObGJHWXBJSHRjYmlBZ0lDQjJZWElnYlc5MlpVNWxlSFFnUFNCblpYUk5iM1psVG1WNGRDaHBibTVsY2taMWJtTjBhVzl1TENCelpXeG1LVHRjYmlBZ0lDQjJZWElnWTNSNElEMGdibVYzSUVkbGJtVnlZWFJ2Y2tOdmJuUmxlSFFvS1R0Y2JpQWdJQ0IyWVhJZ2IySnFaV04wSUQwZ0pHTnlaV0YwWlNobWRXNWpkR2x2Yms5aWFtVmpkQzV3Y205MGIzUjVjR1VwTzF4dUlDQWdJRzlpYW1WamRGdGpkSGhPWVcxbFhTQTlJR04wZUR0Y2JpQWdJQ0J2WW1wbFkzUmJiVzkyWlU1bGVIUk9ZVzFsWFNBOUlHMXZkbVZPWlhoME8xeHVJQ0FnSUhKbGRIVnliaUJ2WW1wbFkzUTdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdhVzVwZEVkbGJtVnlZWFJ2Y2taMWJtTjBhVzl1S0daMWJtTjBhVzl1VDJKcVpXTjBLU0I3WEc0Z0lDQWdablZ1WTNScGIyNVBZbXBsWTNRdWNISnZkRzkwZVhCbElEMGdKR055WldGMFpTaEhaVzVsY21GMGIzSkdkVzVqZEdsdmJsQnliM1J2ZEhsd1pTNXdjbTkwYjNSNWNHVXBPMXh1SUNBZ0lHWjFibU4wYVc5dVQySnFaV04wTGw5ZmNISnZkRzlmWHlBOUlFZGxibVZ5WVhSdmNrWjFibU4wYVc5dVVISnZkRzkwZVhCbE8xeHVJQ0FnSUhKbGRIVnliaUJtZFc1amRHbHZiazlpYW1WamREdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQkJjM2x1WTBaMWJtTjBhVzl1UTI5dWRHVjRkQ2dwSUh0Y2JpQWdJQ0JIWlc1bGNtRjBiM0pEYjI1MFpYaDBMbU5oYkd3b2RHaHBjeWs3WEc0Z0lDQWdkR2hwY3k1bGNuSWdQU0IxYm1SbFptbHVaV1E3WEc0Z0lDQWdkbUZ5SUdOMGVDQTlJSFJvYVhNN1hHNGdJQ0FnWTNSNExuSmxjM1ZzZENBOUlHNWxkeUJRY205dGFYTmxLR1oxYm1OMGFXOXVLSEpsYzI5c2RtVXNJSEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdZM1I0TG5KbGMyOXNkbVVnUFNCeVpYTnZiSFpsTzF4dUlDQWdJQ0FnWTNSNExuSmxhbVZqZENBOUlISmxhbVZqZER0Y2JpQWdJQ0I5S1R0Y2JpQWdmVnh1SUNCQmMzbHVZMFoxYm1OMGFXOXVRMjl1ZEdWNGRDNXdjbTkwYjNSNWNHVWdQU0FrWTNKbFlYUmxLRWRsYm1WeVlYUnZja052Ym5SbGVIUXVjSEp2ZEc5MGVYQmxLVHRjYmlBZ1FYTjVibU5HZFc1amRHbHZia052Ym5SbGVIUXVjSEp2ZEc5MGVYQmxMbVZ1WkNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lITjNhWFJqYUNBb2RHaHBjeTV6ZEdGMFpTa2dlMXh1SUNBZ0lDQWdZMkZ6WlNCRlRrUmZVMVJCVkVVNlhHNGdJQ0FnSUNBZ0lIUm9hWE11Y21WemIyeDJaU2gwYUdsekxuSmxkSFZ5YmxaaGJIVmxLVHRjYmlBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQmpZWE5sSUZKRlZFaFNUMWRmVTFSQlZFVTZYRzRnSUNBZ0lDQWdJSFJvYVhNdWNtVnFaV04wS0hSb2FYTXVjM1J2Y21Wa1JYaGpaWEIwYVc5dUtUdGNiaUFnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNCa1pXWmhkV3gwT2x4dUlDQWdJQ0FnSUNCMGFHbHpMbkpsYW1WamRDaG5aWFJKYm5SbGNtNWhiRVZ5Y205eUtIUm9hWE11YzNSaGRHVXBLVHRjYmlBZ0lDQjlYRzRnSUgwN1hHNGdJRUZ6ZVc1alJuVnVZM1JwYjI1RGIyNTBaWGgwTG5CeWIzUnZkSGx3WlM1b1lXNWtiR1ZGZUdObGNIUnBiMjRnUFNCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNCMGFHbHpMbk4wWVhSbElEMGdVa1ZVU0ZKUFYxOVRWRUZVUlR0Y2JpQWdmVHRjYmlBZ1puVnVZM1JwYjI0Z1lYTjVibU5YY21Gd0tHbHVibVZ5Um5WdVkzUnBiMjRzSUhObGJHWXBJSHRjYmlBZ0lDQjJZWElnYlc5MlpVNWxlSFFnUFNCblpYUk5iM1psVG1WNGRDaHBibTVsY2taMWJtTjBhVzl1TENCelpXeG1LVHRjYmlBZ0lDQjJZWElnWTNSNElEMGdibVYzSUVGemVXNWpSblZ1WTNScGIyNURiMjUwWlhoMEtDazdYRzRnSUNBZ1kzUjRMbU55WldGMFpVTmhiR3hpWVdOcklEMGdablZ1WTNScGIyNG9ibVYzVTNSaGRHVXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQm1kVzVqZEdsdmJpaDJZV3gxWlNrZ2UxeHVJQ0FnSUNBZ0lDQmpkSGd1YzNSaGRHVWdQU0J1WlhkVGRHRjBaVHRjYmlBZ0lDQWdJQ0FnWTNSNExuWmhiSFZsSUQwZ2RtRnNkV1U3WEc0Z0lDQWdJQ0FnSUcxdmRtVk9aWGgwS0dOMGVDazdYRzRnSUNBZ0lDQjlPMXh1SUNBZ0lIMDdYRzRnSUNBZ1kzUjRMbVZ5Y21KaFkyc2dQU0JtZFc1amRHbHZiaWhsY25JcElIdGNiaUFnSUNBZ0lHaGhibVJzWlVOaGRHTm9LR04wZUN3Z1pYSnlLVHRjYmlBZ0lDQWdJRzF2ZG1WT1pYaDBLR04wZUNrN1hHNGdJQ0FnZlR0Y2JpQWdJQ0J0YjNabFRtVjRkQ2hqZEhncE8xeHVJQ0FnSUhKbGRIVnliaUJqZEhndWNtVnpkV3gwTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdkbGRFMXZkbVZPWlhoMEtHbHVibVZ5Um5WdVkzUnBiMjRzSUhObGJHWXBJSHRjYmlBZ0lDQnlaWFIxY200Z1puVnVZM1JwYjI0b1kzUjRLU0I3WEc0Z0lDQWdJQ0IzYUdsc1pTQW9kSEoxWlNrZ2UxeHVJQ0FnSUNBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCcGJtNWxja1oxYm1OMGFXOXVMbU5oYkd3b2MyVnNaaXdnWTNSNEtUdGNiaUFnSUNBZ0lDQWdmU0JqWVhSamFDQW9aWGdwSUh0Y2JpQWdJQ0FnSUNBZ0lDQm9ZVzVrYkdWRFlYUmphQ2hqZEhnc0lHVjRLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDA3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnYUdGdVpHeGxRMkYwWTJnb1kzUjRMQ0JsZUNrZ2UxeHVJQ0FnSUdOMGVDNXpkRzl5WldSRmVHTmxjSFJwYjI0Z1BTQmxlRHRjYmlBZ0lDQjJZWElnYkdGemRDQTlJR04wZUM1MGNubFRkR0ZqYTE5YlkzUjRMblJ5ZVZOMFlXTnJYeTVzWlc1bmRHZ2dMU0F4WFR0Y2JpQWdJQ0JwWmlBb0lXeGhjM1FwSUh0Y2JpQWdJQ0FnSUdOMGVDNW9ZVzVrYkdWRmVHTmxjSFJwYjI0b1pYZ3BPMXh1SUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUgxY2JpQWdJQ0JqZEhndWMzUmhkR1VnUFNCc1lYTjBMbU5oZEdOb0lDRTlQU0IxYm1SbFptbHVaV1FnUHlCc1lYTjBMbU5oZEdOb0lEb2diR0Z6ZEM1bWFXNWhiR3g1TzF4dUlDQWdJR2xtSUNoc1lYTjBMbVpwYm1Gc2JIbEdZV3hzVkdoeWIzVm5hQ0FoUFQwZ2RXNWtaV1pwYm1Wa0tWeHVJQ0FnSUNBZ1kzUjRMbVpwYm1Gc2JIbEdZV3hzVkdoeWIzVm5hQ0E5SUd4aGMzUXVabWx1WVd4c2VVWmhiR3hVYUhKdmRXZG9PMXh1SUNCOVhHNGdJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWhjM2x1WTFkeVlYQWdQU0JoYzNsdVkxZHlZWEE3WEc0Z0lDUjBjbUZqWlhWeVVuVnVkR2x0WlM1cGJtbDBSMlZ1WlhKaGRHOXlSblZ1WTNScGIyNGdQU0JwYm1sMFIyVnVaWEpoZEc5eVJuVnVZM1JwYjI0N1hHNGdJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWpjbVZoZEdWSFpXNWxjbUYwYjNKSmJuTjBZVzVqWlNBOUlHTnlaV0YwWlVkbGJtVnlZWFJ2Y2tsdWMzUmhibU5sTzF4dWZTa29LVHRjYmlobWRXNWpkR2x2YmlncElIdGNiaUFnWm5WdVkzUnBiMjRnWW5WcGJHUkdjbTl0Ulc1amIyUmxaRkJoY25SektHOXdkRjl6WTJobGJXVXNJRzl3ZEY5MWMyVnlTVzVtYnl3Z2IzQjBYMlJ2YldGcGJpd2diM0IwWDNCdmNuUXNJRzl3ZEY5d1lYUm9MQ0J2Y0hSZmNYVmxjbmxFWVhSaExDQnZjSFJmWm5KaFoyMWxiblFwSUh0Y2JpQWdJQ0IyWVhJZ2IzVjBJRDBnVzEwN1hHNGdJQ0FnYVdZZ0tHOXdkRjl6WTJobGJXVXBJSHRjYmlBZ0lDQWdJRzkxZEM1d2RYTm9LRzl3ZEY5elkyaGxiV1VzSUNjNkp5azdYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDaHZjSFJmWkc5dFlXbHVLU0I3WEc0Z0lDQWdJQ0J2ZFhRdWNIVnphQ2duTHk4bktUdGNiaUFnSUNBZ0lHbG1JQ2h2Y0hSZmRYTmxja2x1Wm04cElIdGNiaUFnSUNBZ0lDQWdiM1YwTG5CMWMyZ29iM0IwWDNWelpYSkpibVp2TENBblFDY3BPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdiM1YwTG5CMWMyZ29iM0IwWDJSdmJXRnBiaWs3WEc0Z0lDQWdJQ0JwWmlBb2IzQjBYM0J2Y25RcElIdGNiaUFnSUNBZ0lDQWdiM1YwTG5CMWMyZ29Kem9uTENCdmNIUmZjRzl5ZENrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dUlDQWdJR2xtSUNodmNIUmZjR0YwYUNrZ2UxeHVJQ0FnSUNBZ2IzVjBMbkIxYzJnb2IzQjBYM0JoZEdncE8xeHVJQ0FnSUgxY2JpQWdJQ0JwWmlBb2IzQjBYM0YxWlhKNVJHRjBZU2tnZTF4dUlDQWdJQ0FnYjNWMExuQjFjMmdvSno4bkxDQnZjSFJmY1hWbGNubEVZWFJoS1R0Y2JpQWdJQ0I5WEc0Z0lDQWdhV1lnS0c5d2RGOW1jbUZuYldWdWRDa2dlMXh1SUNBZ0lDQWdiM1YwTG5CMWMyZ29KeU1uTENCdmNIUmZabkpoWjIxbGJuUXBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnYjNWMExtcHZhVzRvSnljcE8xeHVJQ0I5WEc0Z0lEdGNiaUFnZG1GeUlITndiR2wwVW1VZ1BTQnVaWGNnVW1WblJYaHdLQ2RlSnlBcklDY29Qem9uSUNzZ0p5aGJYam92UHlNdVhTc3BKeUFySUNjNktUOG5JQ3NnSnlnL09pOHZKeUFySUNjb1B6b29XMTR2UHlOZEtpbEFLVDhuSUNzZ0p5aGJYRnhjWEhkY1hGeGNaRnhjWEZ3dFhGeGNYSFV3TVRBd0xWeGNYRngxWm1abVppNGxYU29wSnlBcklDY29Qem82S0Zzd0xUbGRLeWtwUHljZ0t5QW5LVDhuSUNzZ0p5aGJYajhqWFNzcFB5Y2dLeUFuS0Q4NlhGeGNYRDhvVzE0alhTb3BLVDhuSUNzZ0p5Zy9PaU1vTGlvcEtUOG5JQ3NnSnlRbktUdGNiaUFnZG1GeUlFTnZiWEJ2Ym1WdWRFbHVaR1Y0SUQwZ2UxeHVJQ0FnSUZORFNFVk5SVG9nTVN4Y2JpQWdJQ0JWVTBWU1gwbE9Sazg2SURJc1hHNGdJQ0FnUkU5TlFVbE9PaUF6TEZ4dUlDQWdJRkJQVWxRNklEUXNYRzRnSUNBZ1VFRlVTRG9nTlN4Y2JpQWdJQ0JSVlVWU1dWOUVRVlJCT2lBMkxGeHVJQ0FnSUVaU1FVZE5SVTVVT2lBM1hHNGdJSDA3WEc0Z0lHWjFibU4wYVc5dUlITndiR2wwS0hWeWFTa2dlMXh1SUNBZ0lISmxkSFZ5YmlBb2RYSnBMbTFoZEdOb0tITndiR2wwVW1VcEtUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnlaVzF2ZG1WRWIzUlRaV2R0Wlc1MGN5aHdZWFJvS1NCN1hHNGdJQ0FnYVdZZ0tIQmhkR2dnUFQwOUlDY3ZKeWxjYmlBZ0lDQWdJSEpsZEhWeWJpQW5MeWM3WEc0Z0lDQWdkbUZ5SUd4bFlXUnBibWRUYkdGemFDQTlJSEJoZEdoYk1GMGdQVDA5SUNjdkp5QS9JQ2N2SnlBNklDY25PMXh1SUNBZ0lIWmhjaUIwY21GcGJHbHVaMU5zWVhOb0lEMGdjR0YwYUM1emJHbGpaU2d0TVNrZ1BUMDlJQ2N2SnlBL0lDY3ZKeUE2SUNjbk8xeHVJQ0FnSUhaaGNpQnpaV2R0Wlc1MGN5QTlJSEJoZEdndWMzQnNhWFFvSnk4bktUdGNiaUFnSUNCMllYSWdiM1YwSUQwZ1cxMDdYRzRnSUNBZ2RtRnlJSFZ3SUQwZ01EdGNiaUFnSUNCbWIzSWdLSFpoY2lCd2IzTWdQU0F3T3lCd2IzTWdQQ0J6WldkdFpXNTBjeTVzWlc1bmRHZzdJSEJ2Y3lzcktTQjdYRzRnSUNBZ0lDQjJZWElnYzJWbmJXVnVkQ0E5SUhObFoyMWxiblJ6VzNCdmMxMDdYRzRnSUNBZ0lDQnpkMmwwWTJnZ0tITmxaMjFsYm5RcElIdGNiaUFnSUNBZ0lDQWdZMkZ6WlNBbkp6cGNiaUFnSUNBZ0lDQWdZMkZ6WlNBbkxpYzZYRzRnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJR05oYzJVZ0p5NHVKenBjYmlBZ0lDQWdJQ0FnSUNCcFppQW9iM1YwTG14bGJtZDBhQ2xjYmlBZ0lDQWdJQ0FnSUNBZ0lHOTFkQzV3YjNBb0tUdGNiaUFnSUNBZ0lDQWdJQ0JsYkhObFhHNGdJQ0FnSUNBZ0lDQWdJQ0IxY0Nzck8xeHVJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQmtaV1poZFd4ME9seHVJQ0FnSUNBZ0lDQWdJRzkxZEM1d2RYTm9LSE5sWjIxbGJuUXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNiaUFnSUNCcFppQW9JV3hsWVdScGJtZFRiR0Z6YUNrZ2UxeHVJQ0FnSUNBZ2QyaHBiR1VnS0hWd0xTMGdQaUF3S1NCN1hHNGdJQ0FnSUNBZ0lHOTFkQzUxYm5Ob2FXWjBLQ2N1TGljcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLRzkxZEM1c1pXNW5kR2dnUFQwOUlEQXBYRzRnSUNBZ0lDQWdJRzkxZEM1d2RYTm9LQ2N1SnlrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnNaV0ZrYVc1blUyeGhjMmdnS3lCdmRYUXVhbTlwYmlnbkx5Y3BJQ3NnZEhKaGFXeHBibWRUYkdGemFEdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnFiMmx1UVc1a1EyRnViMjVwWTJGc2FYcGxVR0YwYUNod1lYSjBjeWtnZTF4dUlDQWdJSFpoY2lCd1lYUm9JRDBnY0dGeWRITmJRMjl0Y0c5dVpXNTBTVzVrWlhndVVFRlVTRjBnZkh3Z0p5YzdYRzRnSUNBZ2NHRjBhQ0E5SUhKbGJXOTJaVVJ2ZEZObFoyMWxiblJ6S0hCaGRHZ3BPMXh1SUNBZ0lIQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMbEJCVkVoZElEMGdjR0YwYUR0Y2JpQWdJQ0J5WlhSMWNtNGdZblZwYkdSR2NtOXRSVzVqYjJSbFpGQmhjblJ6S0hCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExsTkRTRVZOUlYwc0lIQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMbFZUUlZKZlNVNUdUMTBzSUhCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExrUlBUVUZKVGwwc0lIQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMbEJQVWxSZExDQndZWEowYzF0RGIyMXdiMjVsYm5SSmJtUmxlQzVRUVZSSVhTd2djR0Z5ZEhOYlEyOXRjRzl1Wlc1MFNXNWtaWGd1VVZWRlVsbGZSRUZVUVYwc0lIQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMa1pTUVVkTlJVNVVYU2s3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWTJGdWIyNXBZMkZzYVhwbFZYSnNLSFZ5YkNrZ2UxeHVJQ0FnSUhaaGNpQndZWEowY3lBOUlITndiR2wwS0hWeWJDazdYRzRnSUNBZ2NtVjBkWEp1SUdwdmFXNUJibVJEWVc1dmJtbGpZV3hwZW1WUVlYUm9LSEJoY25SektUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnlaWE52YkhabFZYSnNLR0poYzJVc0lIVnliQ2tnZTF4dUlDQWdJSFpoY2lCd1lYSjBjeUE5SUhOd2JHbDBLSFZ5YkNrN1hHNGdJQ0FnZG1GeUlHSmhjMlZRWVhKMGN5QTlJSE53YkdsMEtHSmhjMlVwTzF4dUlDQWdJR2xtSUNod1lYSjBjMXREYjIxd2IyNWxiblJKYm1SbGVDNVRRMGhGVFVWZEtTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2FtOXBia0Z1WkVOaGJtOXVhV05oYkdsNlpWQmhkR2dvY0dGeWRITXBPMXh1SUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNCd1lYSjBjMXREYjIxd2IyNWxiblJKYm1SbGVDNVRRMGhGVFVWZElEMGdZbUZ6WlZCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExsTkRTRVZOUlYwN1hHNGdJQ0FnZlZ4dUlDQWdJR1p2Y2lBb2RtRnlJR2tnUFNCRGIyMXdiMjVsYm5SSmJtUmxlQzVUUTBoRlRVVTdJR2tnUEQwZ1EyOXRjRzl1Wlc1MFNXNWtaWGd1VUU5U1ZEc2dhU3NyS1NCN1hHNGdJQ0FnSUNCcFppQW9JWEJoY25SelcybGRLU0I3WEc0Z0lDQWdJQ0FnSUhCaGNuUnpXMmxkSUQwZ1ltRnpaVkJoY25SelcybGRPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNiaUFnSUNCcFppQW9jR0Z5ZEhOYlEyOXRjRzl1Wlc1MFNXNWtaWGd1VUVGVVNGMWJNRjBnUFQwZ0p5OG5LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdhbTlwYmtGdVpFTmhibTl1YVdOaGJHbDZaVkJoZEdnb2NHRnlkSE1wTzF4dUlDQWdJSDFjYmlBZ0lDQjJZWElnY0dGMGFDQTlJR0poYzJWUVlYSjBjMXREYjIxd2IyNWxiblJKYm1SbGVDNVFRVlJJWFR0Y2JpQWdJQ0IyWVhJZ2FXNWtaWGdnUFNCd1lYUm9MbXhoYzNSSmJtUmxlRTltS0Njdkp5azdYRzRnSUNBZ2NHRjBhQ0E5SUhCaGRHZ3VjMnhwWTJVb01Dd2dhVzVrWlhnZ0t5QXhLU0FySUhCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExsQkJWRWhkTzF4dUlDQWdJSEJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGxCQlZFaGRJRDBnY0dGMGFEdGNiaUFnSUNCeVpYUjFjbTRnYW05cGJrRnVaRU5oYm05dWFXTmhiR2w2WlZCaGRHZ29jR0Z5ZEhNcE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHbHpRV0p6YjJ4MWRHVW9ibUZ0WlNrZ2UxeHVJQ0FnSUdsbUlDZ2hibUZ0WlNsY2JpQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnSUNCcFppQW9ibUZ0WlZzd1hTQTlQVDBnSnk4bktWeHVJQ0FnSUNBZ2NtVjBkWEp1SUhSeWRXVTdYRzRnSUNBZ2RtRnlJSEJoY25SeklEMGdjM0JzYVhRb2JtRnRaU2s3WEc0Z0lDQWdhV1lnS0hCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExsTkRTRVZOUlYwcFhHNGdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpUdGNiaUFnSUNCeVpYUjFjbTRnWm1Gc2MyVTdYRzRnSUgxY2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExtTmhibTl1YVdOaGJHbDZaVlZ5YkNBOUlHTmhibTl1YVdOaGJHbDZaVlZ5YkR0Y2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExtbHpRV0p6YjJ4MWRHVWdQU0JwYzBGaWMyOXNkWFJsTzF4dUlDQWtkSEpoWTJWMWNsSjFiblJwYldVdWNtVnRiM1psUkc5MFUyVm5iV1Z1ZEhNZ1BTQnlaVzF2ZG1WRWIzUlRaV2R0Wlc1MGN6dGNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbkpsYzI5c2RtVlZjbXdnUFNCeVpYTnZiSFpsVlhKc08xeHVmU2tvS1R0Y2JpaG1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0ozVnpaU0J6ZEhKcFkzUW5PMXh1SUNCMllYSWdkSGx3WlhNZ1BTQjdYRzRnSUNBZ1lXNTVPaUI3Ym1GdFpUb2dKMkZ1ZVNkOUxGeHVJQ0FnSUdKdmIyeGxZVzQ2SUh0dVlXMWxPaUFuWW05dmJHVmhiaWQ5TEZ4dUlDQWdJRzUxYldKbGNqb2dlMjVoYldVNklDZHVkVzFpWlhJbmZTeGNiaUFnSUNCemRISnBibWM2SUh0dVlXMWxPaUFuYzNSeWFXNW5KMzBzWEc0Z0lDQWdjM2x0WW05c09pQjdibUZ0WlRvZ0ozTjViV0p2YkNkOUxGeHVJQ0FnSUhadmFXUTZJSHR1WVcxbE9pQW5kbTlwWkNkOVhHNGdJSDA3WEc0Z0lIWmhjaUJIWlc1bGNtbGpWSGx3WlNBOUlHWjFibU4wYVc5dUlFZGxibVZ5YVdOVWVYQmxLSFI1Y0dVc0lHRnlaM1Z0Wlc1MFZIbHdaWE1wSUh0Y2JpQWdJQ0IwYUdsekxuUjVjR1VnUFNCMGVYQmxPMXh1SUNBZ0lIUm9hWE11WVhKbmRXMWxiblJVZVhCbGN5QTlJR0Z5WjNWdFpXNTBWSGx3WlhNN1hHNGdJSDA3WEc0Z0lDZ2tkSEpoWTJWMWNsSjFiblJwYldVdVkzSmxZWFJsUTJ4aGMzTXBLRWRsYm1WeWFXTlVlWEJsTENCN2ZTd2dlMzBwTzF4dUlDQjJZWElnZEhsd1pWSmxaMmx6ZEdWeUlEMGdUMkpxWldOMExtTnlaV0YwWlNodWRXeHNLVHRjYmlBZ1puVnVZM1JwYjI0Z1oyVnVaWEpwWTFSNWNHVW9kSGx3WlNrZ2UxeHVJQ0FnSUdadmNpQW9kbUZ5SUdGeVozVnRaVzUwVkhsd1pYTWdQU0JiWFN4Y2JpQWdJQ0FnSUNBZ0pGOWZNU0E5SURFN0lDUmZYekVnUENCaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvT3lBa1gxOHhLeXNwWEc0Z0lDQWdJQ0JoY21kMWJXVnVkRlI1Y0dWeld5UmZYekVnTFNBeFhTQTlJR0Z5WjNWdFpXNTBjMXNrWDE4eFhUdGNiaUFnSUNCMllYSWdkSGx3WlUxaGNDQTlJSFI1Y0dWU1pXZHBjM1JsY2p0Y2JpQWdJQ0IyWVhJZ2EyVjVJRDBnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbWRsZEU5M2JraGhjMmhQWW1wbFkzUW9kSGx3WlNrdWFHRnphRHRjYmlBZ0lDQnBaaUFvSVhSNWNHVk5ZWEJiYTJWNVhTa2dlMXh1SUNBZ0lDQWdkSGx3WlUxaGNGdHJaWGxkSUQwZ1QySnFaV04wTG1OeVpXRjBaU2h1ZFd4c0tUdGNiaUFnSUNCOVhHNGdJQ0FnZEhsd1pVMWhjQ0E5SUhSNWNHVk5ZWEJiYTJWNVhUdGNiaUFnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElHRnlaM1Z0Wlc1MFZIbHdaWE11YkdWdVozUm9JQzBnTVRzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0JyWlhrZ1BTQWtkSEpoWTJWMWNsSjFiblJwYldVdVoyVjBUM2R1U0dGemFFOWlhbVZqZENoaGNtZDFiV1Z1ZEZSNWNHVnpXMmxkS1M1b1lYTm9PMXh1SUNBZ0lDQWdhV1lnS0NGMGVYQmxUV0Z3VzJ0bGVWMHBJSHRjYmlBZ0lDQWdJQ0FnZEhsd1pVMWhjRnRyWlhsZElEMGdUMkpxWldOMExtTnlaV0YwWlNodWRXeHNLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSFI1Y0dWTllYQWdQU0IwZVhCbFRXRndXMnRsZVYwN1hHNGdJQ0FnZlZ4dUlDQWdJSFpoY2lCMFlXbHNJRDBnWVhKbmRXMWxiblJVZVhCbGMxdGhjbWQxYldWdWRGUjVjR1Z6TG14bGJtZDBhQ0F0SURGZE8xeHVJQ0FnSUd0bGVTQTlJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNW5aWFJQZDI1SVlYTm9UMkpxWldOMEtIUmhhV3dwTG1oaGMyZzdYRzRnSUNBZ2FXWWdLQ0YwZVhCbFRXRndXMnRsZVYwcElIdGNiaUFnSUNBZ0lIUjVjR1ZOWVhCYmEyVjVYU0E5SUc1bGR5QkhaVzVsY21salZIbHdaU2gwZVhCbExDQmhjbWQxYldWdWRGUjVjR1Z6S1R0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlIUjVjR1ZOWVhCYmEyVjVYVHRjYmlBZ2ZWeHVJQ0FrZEhKaFkyVjFjbEoxYm5ScGJXVXVSMlZ1WlhKcFkxUjVjR1VnUFNCSFpXNWxjbWxqVkhsd1pUdGNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbWRsYm1WeWFXTlVlWEJsSUQwZ1oyVnVaWEpwWTFSNWNHVTdYRzRnSUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzUwZVhCbElEMGdkSGx3WlhNN1hHNTlLU2dwTzF4dUtHWjFibU4wYVc5dUtHZHNiMkpoYkNrZ2UxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNGdJSFpoY2lBa1gxOHlJRDBnSkhSeVlXTmxkWEpTZFc1MGFXMWxMRnh1SUNBZ0lDQWdZMkZ1YjI1cFkyRnNhWHBsVlhKc0lEMGdKRjlmTWk1allXNXZibWxqWVd4cGVtVlZjbXdzWEc0Z0lDQWdJQ0J5WlhOdmJIWmxWWEpzSUQwZ0pGOWZNaTV5WlhOdmJIWmxWWEpzTEZ4dUlDQWdJQ0FnYVhOQlluTnZiSFYwWlNBOUlDUmZYekl1YVhOQlluTnZiSFYwWlR0Y2JpQWdkbUZ5SUcxdlpIVnNaVWx1YzNSaGJuUnBZWFJ2Y25NZ1BTQlBZbXBsWTNRdVkzSmxZWFJsS0c1MWJHd3BPMXh1SUNCMllYSWdZbUZ6WlZWU1REdGNiaUFnYVdZZ0tHZHNiMkpoYkM1c2IyTmhkR2x2YmlBbUppQm5iRzlpWVd3dWJHOWpZWFJwYjI0dWFISmxaaWxjYmlBZ0lDQmlZWE5sVlZKTUlEMGdjbVZ6YjJ4MlpWVnliQ2huYkc5aVlXd3ViRzlqWVhScGIyNHVhSEpsWml3Z0p5NHZKeWs3WEc0Z0lHVnNjMlZjYmlBZ0lDQmlZWE5sVlZKTUlEMGdKeWM3WEc0Z0lIWmhjaUJWYm1OdllYUmxaRTF2WkhWc1pVVnVkSEo1SUQwZ1puVnVZM1JwYjI0Z1ZXNWpiMkYwWldSTmIyUjFiR1ZGYm5SeWVTaDFjbXdzSUhWdVkyOWhkR1ZrVFc5a2RXeGxLU0I3WEc0Z0lDQWdkR2hwY3k1MWNtd2dQU0IxY213N1hHNGdJQ0FnZEdocGN5NTJZV3gxWlY4Z1BTQjFibU52WVhSbFpFMXZaSFZzWlR0Y2JpQWdmVHRjYmlBZ0tDUjBjbUZqWlhWeVVuVnVkR2x0WlM1amNtVmhkR1ZEYkdGemN5a29WVzVqYjJGMFpXUk5iMlIxYkdWRmJuUnllU3dnZTMwc0lIdDlLVHRjYmlBZ2RtRnlJRTF2WkhWc1pVVjJZV3gxWVhScGIyNUZjbkp2Y2lBOUlHWjFibU4wYVc5dUlFMXZaSFZzWlVWMllXeDFZWFJwYjI1RmNuSnZjaWhsY25KdmJtVnZkWE5OYjJSMWJHVk9ZVzFsTENCallYVnpaU2tnZTF4dUlDQWdJSFJvYVhNdWJXVnpjMkZuWlNBOUlIUm9hWE11WTI5dWMzUnlkV04wYjNJdWJtRnRaU0FySUNjNklDY2dLeUIwYUdsekxuTjBjbWx3UTJGMWMyVW9ZMkYxYzJVcElDc2dKeUJwYmlBbklDc2daWEp5YjI1bGIzVnpUVzlrZFd4bFRtRnRaVHRjYmlBZ0lDQnBaaUFvSVNoallYVnpaU0JwYm5OMFlXNWpaVzltSUNSTmIyUjFiR1ZGZG1Gc2RXRjBhVzl1UlhKeWIzSXBJQ1ltSUdOaGRYTmxMbk4wWVdOcktWeHVJQ0FnSUNBZ2RHaHBjeTV6ZEdGamF5QTlJSFJvYVhNdWMzUnlhWEJUZEdGamF5aGpZWFZ6WlM1emRHRmpheWs3WEc0Z0lDQWdaV3h6WlZ4dUlDQWdJQ0FnZEdocGN5NXpkR0ZqYXlBOUlDY25PMXh1SUNCOU8xeHVJQ0IyWVhJZ0pFMXZaSFZzWlVWMllXeDFZWFJwYjI1RmNuSnZjaUE5SUUxdlpIVnNaVVYyWVd4MVlYUnBiMjVGY25KdmNqdGNiaUFnS0NSMGNtRmpaWFZ5VW5WdWRHbHRaUzVqY21WaGRHVkRiR0Z6Y3lrb1RXOWtkV3hsUlhaaGJIVmhkR2x2YmtWeWNtOXlMQ0I3WEc0Z0lDQWdjM1J5YVhCRmNuSnZjam9nWm5WdVkzUnBiMjRvYldWemMyRm5aU2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRzFsYzNOaFoyVXVjbVZ3YkdGalpTZ3ZMaXBGY25KdmNqb3ZMQ0IwYUdsekxtTnZibk4wY25WamRHOXlMbTVoYldVZ0t5QW5PaWNwTzF4dUlDQWdJSDBzWEc0Z0lDQWdjM1J5YVhCRFlYVnpaVG9nWm5WdVkzUnBiMjRvWTJGMWMyVXBJSHRjYmlBZ0lDQWdJR2xtSUNnaFkyRjFjMlVwWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUFuSnp0Y2JpQWdJQ0FnSUdsbUlDZ2hZMkYxYzJVdWJXVnpjMkZuWlNsY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdOaGRYTmxJQ3NnSnljN1hHNGdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NXpkSEpwY0VWeWNtOXlLR05oZFhObExtMWxjM05oWjJVcE8xeHVJQ0FnSUgwc1hHNGdJQ0FnYkc5aFpHVmtRbms2SUdaMWJtTjBhVzl1S0cxdlpIVnNaVTVoYldVcElIdGNiaUFnSUNBZ0lIUm9hWE11YzNSaFkyc2dLejBnSjF4Y2JpQnNiMkZrWldRZ1lua2dKeUFySUcxdlpIVnNaVTVoYldVN1hHNGdJQ0FnZlN4Y2JpQWdJQ0J6ZEhKcGNGTjBZV05yT2lCbWRXNWpkR2x2YmloallYVnpaVk4wWVdOcktTQjdYRzRnSUNBZ0lDQjJZWElnYzNSaFkyc2dQU0JiWFR0Y2JpQWdJQ0FnSUdOaGRYTmxVM1JoWTJzdWMzQnNhWFFvSjF4Y2JpY3BMbk52YldVb0tHWjFibU4wYVc5dUtHWnlZVzFsS1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2d2Vlc1amIyRjBaV1JOYjJSMWJHVkpibk4wWVc1MGFXRjBiM0l2TG5SbGMzUW9abkpoYldVcEtWeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJQ0FnSUNCemRHRmpheTV3ZFhOb0tHWnlZVzFsS1R0Y2JpQWdJQ0FnSUgwcEtUdGNiaUFnSUNBZ0lITjBZV05yV3pCZElEMGdkR2hwY3k1emRISnBjRVZ5Y205eUtITjBZV05yV3pCZEtUdGNiaUFnSUNBZ0lISmxkSFZ5YmlCemRHRmpheTVxYjJsdUtDZGNYRzRuS1R0Y2JpQWdJQ0I5WEc0Z0lIMHNJSHQ5TENCRmNuSnZjaWs3WEc0Z0lHWjFibU4wYVc5dUlHSmxabTl5WlV4cGJtVnpLR3hwYm1WekxDQnVkVzFpWlhJcElIdGNiaUFnSUNCMllYSWdjbVZ6ZFd4MElEMGdXMTA3WEc0Z0lDQWdkbUZ5SUdacGNuTjBJRDBnYm5WdFltVnlJQzBnTXp0Y2JpQWdJQ0JwWmlBb1ptbHljM1FnUENBd0tWeHVJQ0FnSUNBZ1ptbHljM1FnUFNBd08xeHVJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQm1hWEp6ZERzZ2FTQThJRzUxYldKbGNqc2dhU3NyS1NCN1hHNGdJQ0FnSUNCeVpYTjFiSFF1Y0hWemFDaHNhVzVsYzF0cFhTazdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ5WlhOMWJIUTdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdZV1owWlhKTWFXNWxjeWhzYVc1bGN5d2diblZ0WW1WeUtTQjdYRzRnSUNBZ2RtRnlJR3hoYzNRZ1BTQnVkVzFpWlhJZ0t5QXhPMXh1SUNBZ0lHbG1JQ2hzWVhOMElENGdiR2x1WlhNdWJHVnVaM1JvSUMwZ01TbGNiaUFnSUNBZ0lHeGhjM1FnUFNCc2FXNWxjeTVzWlc1bmRHZ2dMU0F4TzF4dUlDQWdJSFpoY2lCeVpYTjFiSFFnUFNCYlhUdGNiaUFnSUNCbWIzSWdLSFpoY2lCcElEMGdiblZ0WW1WeU95QnBJRHc5SUd4aGMzUTdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ2NtVnpkV3gwTG5CMWMyZ29iR2x1WlhOYmFWMHBPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnY21WemRXeDBPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR052YkhWdGJsTndZV05wYm1jb1kyOXNkVzF1Y3lrZ2UxeHVJQ0FnSUhaaGNpQnlaWE4xYkhRZ1BTQW5KenRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR052YkhWdGJuTWdMU0F4T3lCcEt5c3BJSHRjYmlBZ0lDQWdJSEpsYzNWc2RDQXJQU0FuTFNjN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnlaWE4xYkhRN1hHNGdJSDFjYmlBZ2RtRnlJRlZ1WTI5aGRHVmtUVzlrZFd4bFNXNXpkR0Z1ZEdsaGRHOXlJRDBnWm5WdVkzUnBiMjRnVlc1amIyRjBaV1JOYjJSMWJHVkpibk4wWVc1MGFXRjBiM0lvZFhKc0xDQm1kVzVqS1NCN1hHNGdJQ0FnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbk4xY0dWeVEyOXVjM1J5ZFdOMGIzSW9KRlZ1WTI5aGRHVmtUVzlrZFd4bFNXNXpkR0Z1ZEdsaGRHOXlLUzVqWVd4c0tIUm9hWE1zSUhWeWJDd2diblZzYkNrN1hHNGdJQ0FnZEdocGN5NW1kVzVqSUQwZ1puVnVZenRjYmlBZ2ZUdGNiaUFnZG1GeUlDUlZibU52WVhSbFpFMXZaSFZzWlVsdWMzUmhiblJwWVhSdmNpQTlJRlZ1WTI5aGRHVmtUVzlrZFd4bFNXNXpkR0Z1ZEdsaGRHOXlPMXh1SUNBb0pIUnlZV05sZFhKU2RXNTBhVzFsTG1OeVpXRjBaVU5zWVhOektTaFZibU52WVhSbFpFMXZaSFZzWlVsdWMzUmhiblJwWVhSdmNpd2dlMmRsZEZWdVkyOWhkR1ZrVFc5a2RXeGxPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUdsbUlDaDBhR2x6TG5aaGJIVmxYeWxjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJvYVhNdWRtRnNkV1ZmTzF4dUlDQWdJQ0FnZEhKNUlIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhKbGJHRjBhWFpsVW1WeGRXbHlaVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlBa2RISmhZMlYxY2xKMWJuUnBiV1VnSVQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhKbGJHRjBhWFpsVW1WeGRXbHlaU0E5SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzV5WlhGMWFYSmxMbUpwYm1Rb2JuVnNiQ3dnZEdocGN5NTFjbXdwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGFHbHpMblpoYkhWbFh5QTlJSFJvYVhNdVpuVnVZeTVqWVd4c0tHZHNiMkpoYkN3Z2NtVnNZWFJwZG1WU1pYRjFhWEpsS1R0Y2JpQWdJQ0FnSUgwZ1kyRjBZMmdnS0dWNEtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNobGVDQnBibk4wWVc1alpXOW1JRTF2WkhWc1pVVjJZV3gxWVhScGIyNUZjbkp2Y2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJR1Y0TG14dllXUmxaRUo1S0hSb2FYTXVkWEpzS1R0Y2JpQWdJQ0FnSUNBZ0lDQjBhSEp2ZHlCbGVEdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0JwWmlBb1pYZ3VjM1JoWTJzcElIdGNiaUFnSUNBZ0lDQWdJQ0IyWVhJZ2JHbHVaWE1nUFNCMGFHbHpMbVoxYm1NdWRHOVRkSEpwYm1jb0tTNXpjR3hwZENnblhGeHVKeWs3WEc0Z0lDQWdJQ0FnSUNBZ2RtRnlJR1YyWVd4bFpDQTlJRnRkTzF4dUlDQWdJQ0FnSUNBZ0lHVjRMbk4wWVdOckxuTndiR2wwS0NkY1hHNG5LUzV6YjIxbEtHWjFibU4wYVc5dUtHWnlZVzFsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb1puSmhiV1V1YVc1a1pYaFBaaWduVlc1amIyRjBaV1JOYjJSMWJHVkpibk4wWVc1MGFXRjBiM0l1WjJWMFZXNWpiMkYwWldSTmIyUjFiR1VuS1NBK0lEQXBYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGNuVmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnlJRzBnUFNBdktHRjBYRnh6VzE1Y1hITmRLbHhjY3lrdUtqNDZLRnhjWkNvcE9paGNYR1FxS1Z4Y0tTOHVaWGhsWXlobWNtRnRaU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvYlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllYSWdiR2x1WlNBOUlIQmhjbk5sU1c1MEtHMWJNbDBzSURFd0tUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1pYWmhiR1ZrSUQwZ1pYWmhiR1ZrTG1OdmJtTmhkQ2hpWldadmNtVk1hVzVsY3loc2FXNWxjeXdnYkdsdVpTa3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmxkbUZzWldRdWNIVnphQ2hqYjJ4MWJXNVRjR0ZqYVc1bktHMWJNMTBwSUNzZ0oxNG5LVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdaWFpoYkdWa0lEMGdaWFpoYkdWa0xtTnZibU5oZENoaFpuUmxja3hwYm1WektHeHBibVZ6TENCc2FXNWxLU2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR1YyWVd4bFpDNXdkWE5vS0NjOUlEMGdQU0E5SUQwZ1BTQTlJRDBnUFNjcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdaWFpoYkdWa0xuQjFjMmdvWm5KaGJXVXBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJSDBwTzF4dUlDQWdJQ0FnSUNBZ0lHVjRMbk4wWVdOcklEMGdaWFpoYkdWa0xtcHZhVzRvSjF4Y2JpY3BPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCTmIyUjFiR1ZGZG1Gc2RXRjBhVzl1UlhKeWIzSW9kR2hwY3k1MWNtd3NJR1Y0S1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5ZlN3Z2UzMHNJRlZ1WTI5aGRHVmtUVzlrZFd4bFJXNTBjbmtwTzF4dUlDQm1kVzVqZEdsdmJpQm5aWFJWYm1OdllYUmxaRTF2WkhWc1pVbHVjM1JoYm5ScFlYUnZjaWh1WVcxbEtTQjdYRzRnSUNBZ2FXWWdLQ0Z1WVcxbEtWeHVJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJSFpoY2lCMWNtd2dQU0JOYjJSMWJHVlRkRzl5WlM1dWIzSnRZV3hwZW1Vb2JtRnRaU2s3WEc0Z0lDQWdjbVYwZFhKdUlHMXZaSFZzWlVsdWMzUmhiblJwWVhSdmNuTmJkWEpzWFR0Y2JpQWdmVnh1SUNBN1hHNGdJSFpoY2lCdGIyUjFiR1ZKYm5OMFlXNWpaWE1nUFNCUFltcGxZM1F1WTNKbFlYUmxLRzUxYkd3cE8xeHVJQ0IyWVhJZ2JHbDJaVTF2WkhWc1pWTmxiblJwYm1Wc0lEMGdlMzA3WEc0Z0lHWjFibU4wYVc5dUlFMXZaSFZzWlNoMWJtTnZZWFJsWkUxdlpIVnNaU2tnZTF4dUlDQWdJSFpoY2lCcGMweHBkbVVnUFNCaGNtZDFiV1Z1ZEhOYk1WMDdYRzRnSUNBZ2RtRnlJR052WVhSbFpFMXZaSFZzWlNBOUlFOWlhbVZqZEM1amNtVmhkR1VvYm5Wc2JDazdYRzRnSUNBZ1QySnFaV04wTG1kbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNb2RXNWpiMkYwWldSTmIyUjFiR1VwTG1admNrVmhZMmdvS0daMWJtTjBhVzl1S0c1aGJXVXBJSHRjYmlBZ0lDQWdJSFpoY2lCblpYUjBaWElzWEc0Z0lDQWdJQ0FnSUNBZ2RtRnNkV1U3WEc0Z0lDQWdJQ0JwWmlBb2FYTk1hWFpsSUQwOVBTQnNhWFpsVFc5a2RXeGxVMlZ1ZEdsdVpXd3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHUmxjMk55SUQwZ1QySnFaV04wTG1kbGRFOTNibEJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaWgxYm1OdllYUmxaRTF2WkhWc1pTd2dibUZ0WlNrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hrWlhOamNpNW5aWFFwWEc0Z0lDQWdJQ0FnSUNBZ1oyVjBkR1Z5SUQwZ1pHVnpZM0l1WjJWME8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLQ0ZuWlhSMFpYSXBJSHRjYmlBZ0lDQWdJQ0FnZG1Gc2RXVWdQU0IxYm1OdllYUmxaRTF2WkhWc1pWdHVZVzFsWFR0Y2JpQWdJQ0FnSUNBZ1oyVjBkR1Z5SUQwZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSFpoYkhWbE8xeHVJQ0FnSUNBZ0lDQjlPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblI1S0dOdllYUmxaRTF2WkhWc1pTd2dibUZ0WlN3Z2UxeHVJQ0FnSUNBZ0lDQm5aWFE2SUdkbGRIUmxjaXhjYmlBZ0lDQWdJQ0FnWlc1MWJXVnlZV0pzWlRvZ2RISjFaVnh1SUNBZ0lDQWdmU2s3WEc0Z0lDQWdmU2twTzF4dUlDQWdJRTlpYW1WamRDNXdjbVYyWlc1MFJYaDBaVzV6YVc5dWN5aGpiMkYwWldSTmIyUjFiR1VwTzF4dUlDQWdJSEpsZEhWeWJpQmpiMkYwWldSTmIyUjFiR1U3WEc0Z0lIMWNiaUFnZG1GeUlFMXZaSFZzWlZOMGIzSmxJRDBnZTF4dUlDQWdJRzV2Y20xaGJHbDZaVG9nWm5WdVkzUnBiMjRvYm1GdFpTd2djbVZtWlhKbGNrNWhiV1VzSUhKbFptVnlaWEpCWkdSeVpYTnpLU0I3WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUc1aGJXVWdJVDA5SUNkemRISnBibWNuS1Z4dUlDQWdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1ZIbHdaVVZ5Y205eUtDZHRiMlIxYkdVZ2JtRnRaU0J0ZFhOMElHSmxJR0VnYzNSeWFXNW5MQ0J1YjNRZ0p5QXJJSFI1Y0dWdlppQnVZVzFsS1R0Y2JpQWdJQ0FnSUdsbUlDaHBjMEZpYzI5c2RYUmxLRzVoYldVcEtWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1kyRnViMjVwWTJGc2FYcGxWWEpzS0c1aGJXVXBPMXh1SUNBZ0lDQWdhV1lnS0M5YlhseGNMbDFjWEM5Y1hDNWNYQzVjWEM4dkxuUmxjM1FvYm1GdFpTa3BJSHRjYmlBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUVWeWNtOXlLQ2R0YjJSMWJHVWdibUZ0WlNCbGJXSmxaSE1nTHk0dUx6b2dKeUFySUc1aGJXVXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdhV1lnS0c1aGJXVmJNRjBnUFQwOUlDY3VKeUFtSmlCeVpXWmxjbVZ5VG1GdFpTbGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlISmxjMjlzZG1WVmNtd29jbVZtWlhKbGNrNWhiV1VzSUc1aGJXVXBPMXh1SUNBZ0lDQWdjbVYwZFhKdUlHTmhibTl1YVdOaGJHbDZaVlZ5YkNodVlXMWxLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkRG9nWm5WdVkzUnBiMjRvYm05eWJXRnNhWHBsWkU1aGJXVXBJSHRjYmlBZ0lDQWdJSFpoY2lCdElEMGdaMlYwVlc1amIyRjBaV1JOYjJSMWJHVkpibk4wWVc1MGFXRjBiM0lvYm05eWJXRnNhWHBsWkU1aGJXVXBPMXh1SUNBZ0lDQWdhV1lnS0NGdEtWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RXNWtaV1pwYm1Wa08xeHVJQ0FnSUNBZ2RtRnlJRzF2WkhWc1pVbHVjM1JoYm1ObElEMGdiVzlrZFd4bFNXNXpkR0Z1WTJWelcyMHVkWEpzWFR0Y2JpQWdJQ0FnSUdsbUlDaHRiMlIxYkdWSmJuTjBZVzVqWlNsY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUcxdlpIVnNaVWx1YzNSaGJtTmxPMXh1SUNBZ0lDQWdiVzlrZFd4bFNXNXpkR0Z1WTJVZ1BTQk5iMlIxYkdVb2JTNW5aWFJWYm1OdllYUmxaRTF2WkhWc1pTZ3BMQ0JzYVhabFRXOWtkV3hsVTJWdWRHbHVaV3dwTzF4dUlDQWdJQ0FnY21WMGRYSnVJRzF2WkhWc1pVbHVjM1JoYm1ObGMxdHRMblZ5YkYwZ1BTQnRiMlIxYkdWSmJuTjBZVzVqWlR0Y2JpQWdJQ0I5TEZ4dUlDQWdJSE5sZERvZ1puVnVZM1JwYjI0b2JtOXliV0ZzYVhwbFpFNWhiV1VzSUcxdlpIVnNaU2tnZTF4dUlDQWdJQ0FnYm05eWJXRnNhWHBsWkU1aGJXVWdQU0JUZEhKcGJtY29ibTl5YldGc2FYcGxaRTVoYldVcE8xeHVJQ0FnSUNBZ2JXOWtkV3hsU1c1emRHRnVkR2xoZEc5eWMxdHViM0p0WVd4cGVtVmtUbUZ0WlYwZ1BTQnVaWGNnVlc1amIyRjBaV1JOYjJSMWJHVkpibk4wWVc1MGFXRjBiM0lvYm05eWJXRnNhWHBsWkU1aGJXVXNJQ2htZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUcxdlpIVnNaVHRjYmlBZ0lDQWdJSDBwS1R0Y2JpQWdJQ0FnSUcxdlpIVnNaVWx1YzNSaGJtTmxjMXR1YjNKdFlXeHBlbVZrVG1GdFpWMGdQU0J0YjJSMWJHVTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdZbUZ6WlZWU1RDZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQmlZWE5sVlZKTU8xeHVJQ0FnSUgwc1hHNGdJQ0FnYzJWMElHSmhjMlZWVWt3b2Rpa2dlMXh1SUNBZ0lDQWdZbUZ6WlZWU1RDQTlJRk4wY21sdVp5aDJLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lISmxaMmx6ZEdWeVRXOWtkV3hsT2lCbWRXNWpkR2x2YmlodVlXMWxMQ0JrWlhCekxDQm1kVzVqS1NCN1hHNGdJQ0FnSUNCMllYSWdibTl5YldGc2FYcGxaRTVoYldVZ1BTQk5iMlIxYkdWVGRHOXlaUzV1YjNKdFlXeHBlbVVvYm1GdFpTazdYRzRnSUNBZ0lDQnBaaUFvYlc5a2RXeGxTVzV6ZEdGdWRHbGhkRzl5YzF0dWIzSnRZV3hwZW1Wa1RtRnRaVjBwWEc0Z0lDQWdJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWduWkhWd2JHbGpZWFJsSUcxdlpIVnNaU0J1WVcxbFpDQW5JQ3NnYm05eWJXRnNhWHBsWkU1aGJXVXBPMXh1SUNBZ0lDQWdiVzlrZFd4bFNXNXpkR0Z1ZEdsaGRHOXljMXR1YjNKdFlXeHBlbVZrVG1GdFpWMGdQU0J1WlhjZ1ZXNWpiMkYwWldSTmIyUjFiR1ZKYm5OMFlXNTBhV0YwYjNJb2JtOXliV0ZzYVhwbFpFNWhiV1VzSUdaMWJtTXBPMXh1SUNBZ0lIMHNYRzRnSUNBZ1luVnVaR3hsVTNSdmNtVTZJRTlpYW1WamRDNWpjbVZoZEdVb2JuVnNiQ2tzWEc0Z0lDQWdjbVZuYVhOMFpYSTZJR1oxYm1OMGFXOXVLRzVoYldVc0lHUmxjSE1zSUdaMWJtTXBJSHRjYmlBZ0lDQWdJR2xtSUNnaFpHVndjeUI4ZkNBaFpHVndjeTVzWlc1bmRHZ2dKaVlnSVdaMWJtTXViR1Z1WjNSb0tTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWNtVm5hWE4wWlhKTmIyUjFiR1VvYm1GdFpTd2daR1Z3Y3l3Z1puVnVZeWs3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0IwYUdsekxtSjFibVJzWlZOMGIzSmxXMjVoYldWZElEMGdlMXh1SUNBZ0lDQWdJQ0FnSUdSbGNITTZJR1JsY0hNc1hHNGdJQ0FnSUNBZ0lDQWdaWGhsWTNWMFpUb2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjJZWElnSkY5Zk1DQTlJR0Z5WjNWdFpXNTBjenRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJrWlhCTllYQWdQU0I3ZlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1JsY0hNdVptOXlSV0ZqYUNnb1puVnVZM1JwYjI0b1pHVndMQ0JwYm1SbGVDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z1pHVndUV0Z3VzJSbGNGMGdQU0FrWDE4d1cybHVaR1Y0WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBwS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCeVpXZHBjM1J5ZVVWdWRISjVJRDBnWm5WdVl5NWpZV3hzS0hSb2FYTXNJR1JsY0UxaGNDazdYRzRnSUNBZ0lDQWdJQ0FnSUNCeVpXZHBjM1J5ZVVWdWRISjVMbVY0WldOMWRHVXVZMkZzYkNoMGFHbHpLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCeVpXZHBjM1J5ZVVWdWRISjVMbVY0Y0c5eWRITTdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMFFXNXZibmx0YjNWelRXOWtkV3hsT2lCbWRXNWpkR2x2YmlobWRXNWpLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdibVYzSUUxdlpIVnNaU2htZFc1akxtTmhiR3dvWjJ4dlltRnNLU3dnYkdsMlpVMXZaSFZzWlZObGJuUnBibVZzS1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZEVadmNsUmxjM1JwYm1jNklHWjFibU4wYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0FnSUhaaGNpQWtYMTh3SUQwZ2RHaHBjenRjYmlBZ0lDQWdJR2xtSUNnaGRHaHBjeTUwWlhOMGFXNW5VSEpsWm1sNFh5a2dlMXh1SUNBZ0lDQWdJQ0JQWW1wbFkzUXVhMlY1Y3lodGIyUjFiR1ZKYm5OMFlXNWpaWE1wTG5OdmJXVW9LR1oxYm1OMGFXOXVLR3RsZVNrZ2UxeHVJQ0FnSUNBZ0lDQWdJSFpoY2lCdElEMGdMeWgwY21GalpYVnlRRnRlWEZ3dlhTcGNYQzhwTHk1bGVHVmpLR3RsZVNrN1hHNGdJQ0FnSUNBZ0lDQWdhV1lnS0cwcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNSZlh6QXVkR1Z6ZEdsdVoxQnlaV1pwZUY4Z1BTQnRXekZkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlIUnlkV1U3WEc0Z0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlLU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0J5WlhSMWNtNGdkR2hwY3k1blpYUW9kR2hwY3k1MFpYTjBhVzVuVUhKbFptbDRYeUFySUc1aGJXVXBPMXh1SUNBZ0lIMWNiaUFnZlR0Y2JpQWdkbUZ5SUcxdlpIVnNaVk4wYjNKbFRXOWtkV3hsSUQwZ2JtVjNJRTF2WkhWc1pTaDdUVzlrZFd4bFUzUnZjbVU2SUUxdlpIVnNaVk4wYjNKbGZTazdYRzRnSUUxdlpIVnNaVk4wYjNKbExuTmxkQ2duUUhSeVlXTmxkWEl2YzNKakwzSjFiblJwYldVdlRXOWtkV3hsVTNSdmNtVW5MQ0J0YjJSMWJHVlRkRzl5WlUxdlpIVnNaU2s3WEc0Z0lFMXZaSFZzWlZOMGIzSmxMbk5sZENnblFIUnlZV05sZFhJdmMzSmpMM0oxYm5ScGJXVXZUVzlrZFd4bFUzUnZjbVV1YW5NbkxDQnRiMlIxYkdWVGRHOXlaVTF2WkhWc1pTazdYRzRnSUhaaGNpQnpaWFIxY0Vkc2IySmhiSE1nUFNBa2RISmhZMlYxY2xKMWJuUnBiV1V1YzJWMGRYQkhiRzlpWVd4ek8xeHVJQ0FrZEhKaFkyVjFjbEoxYm5ScGJXVXVjMlYwZFhCSGJHOWlZV3h6SUQwZ1puVnVZM1JwYjI0b1oyeHZZbUZzS1NCN1hHNGdJQ0FnYzJWMGRYQkhiRzlpWVd4ektHZHNiMkpoYkNrN1hHNGdJSDA3WEc0Z0lDUjBjbUZqWlhWeVVuVnVkR2x0WlM1TmIyUjFiR1ZUZEc5eVpTQTlJRTF2WkhWc1pWTjBiM0psTzF4dUlDQm5iRzlpWVd3dVUzbHpkR1Z0SUQwZ2UxeHVJQ0FnSUhKbFoybHpkR1Z5T2lCTmIyUjFiR1ZUZEc5eVpTNXlaV2RwYzNSbGNpNWlhVzVrS0UxdlpIVnNaVk4wYjNKbEtTeGNiaUFnSUNCeVpXZHBjM1JsY2sxdlpIVnNaVG9nVFc5a2RXeGxVM1J2Y21VdWNtVm5hWE4wWlhKTmIyUjFiR1V1WW1sdVpDaE5iMlIxYkdWVGRHOXlaU2tzWEc0Z0lDQWdaMlYwT2lCTmIyUjFiR1ZUZEc5eVpTNW5aWFFzWEc0Z0lDQWdjMlYwT2lCTmIyUjFiR1ZUZEc5eVpTNXpaWFFzWEc0Z0lDQWdibTl5YldGc2FYcGxPaUJOYjJSMWJHVlRkRzl5WlM1dWIzSnRZV3hwZW1WY2JpQWdmVHRjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1kbGRFMXZaSFZzWlVsdGNHd2dQU0JtZFc1amRHbHZiaWh1WVcxbEtTQjdYRzRnSUNBZ2RtRnlJR2x1YzNSaGJuUnBZWFJ2Y2lBOUlHZGxkRlZ1WTI5aGRHVmtUVzlrZFd4bFNXNXpkR0Z1ZEdsaGRHOXlLRzVoYldVcE8xeHVJQ0FnSUhKbGRIVnliaUJwYm5OMFlXNTBhV0YwYjNJZ0ppWWdhVzV6ZEdGdWRHbGhkRzl5TG1kbGRGVnVZMjloZEdWa1RXOWtkV3hsS0NrN1hHNGdJSDA3WEc1OUtTaDBlWEJsYjJZZ2QybHVaRzkzSUNFOVBTQW5kVzVrWldacGJtVmtKeUEvSUhkcGJtUnZkeUE2SUhSNWNHVnZaaUJuYkc5aVlXd2dJVDA5SUNkMWJtUmxabWx1WldRbklEOGdaMnh2WW1Gc0lEb2dkSGx3Wlc5bUlITmxiR1lnSVQwOUlDZDFibVJsWm1sdVpXUW5JRDhnYzJWc1ppQTZJSFJvYVhNcE8xeHVVM2x6ZEdWdExuSmxaMmx6ZEdWeVRXOWtkV3hsS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdmRYUnBiSE11YW5OY0lpd2dXMTBzSUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0JjSW5WelpTQnpkSEpwWTNSY0lqdGNiaUFnZG1GeUlGOWZiVzlrZFd4bFRtRnRaU0E5SUZ3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdmRYUnBiSE11YW5OY0lqdGNiaUFnZG1GeUlDUmpaV2xzSUQwZ1RXRjBhQzVqWldsc08xeHVJQ0IyWVhJZ0pHWnNiMjl5SUQwZ1RXRjBhQzVtYkc5dmNqdGNiaUFnZG1GeUlDUnBjMFpwYm1sMFpTQTlJR2x6Um1sdWFYUmxPMXh1SUNCMllYSWdKR2x6VG1GT0lEMGdhWE5PWVU0N1hHNGdJSFpoY2lBa2NHOTNJRDBnVFdGMGFDNXdiM2M3WEc0Z0lIWmhjaUFrYldsdUlEMGdUV0YwYUM1dGFXNDdYRzRnSUhaaGNpQjBiMDlpYW1WamRDQTlJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNTBiMDlpYW1WamREdGNiaUFnWm5WdVkzUnBiMjRnZEc5VmFXNTBNeklvZUNrZ2UxeHVJQ0FnSUhKbGRIVnliaUI0SUQ0K1BpQXdPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR2x6VDJKcVpXTjBLSGdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdlQ0FtSmlBb2RIbHdaVzltSUhnZ1BUMDlJQ2R2WW1wbFkzUW5JSHg4SUhSNWNHVnZaaUI0SUQwOVBTQW5ablZ1WTNScGIyNG5LVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJwYzBOaGJHeGhZbXhsS0hncElIdGNiaUFnSUNCeVpYUjFjbTRnZEhsd1pXOW1JSGdnUFQwOUlDZG1kVzVqZEdsdmJpYzdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdhWE5PZFcxaVpYSW9lQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQjBlWEJsYjJZZ2VDQTlQVDBnSjI1MWJXSmxjaWM3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnZEc5SmJuUmxaMlZ5S0hncElIdGNiaUFnSUNCNElEMGdLM2c3WEc0Z0lDQWdhV1lnS0NScGMwNWhUaWg0S1NsY2JpQWdJQ0FnSUhKbGRIVnliaUF3TzF4dUlDQWdJR2xtSUNoNElEMDlQU0F3SUh4OElDRWthWE5HYVc1cGRHVW9lQ2twWEc0Z0lDQWdJQ0J5WlhSMWNtNGdlRHRjYmlBZ0lDQnlaWFIxY200Z2VDQStJREFnUHlBa1pteHZiM0lvZUNrZ09pQWtZMlZwYkNoNEtUdGNiaUFnZlZ4dUlDQjJZWElnVFVGWVgxTkJSa1ZmVEVWT1IxUklJRDBnSkhCdmR5Z3lMQ0ExTXlrZ0xTQXhPMXh1SUNCbWRXNWpkR2x2YmlCMGIweGxibWQwYUNoNEtTQjdYRzRnSUNBZ2RtRnlJR3hsYmlBOUlIUnZTVzUwWldkbGNpaDRLVHRjYmlBZ0lDQnlaWFIxY200Z2JHVnVJRHdnTUNBL0lEQWdPaUFrYldsdUtHeGxiaXdnVFVGWVgxTkJSa1ZmVEVWT1IxUklLVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJqYUdWamEwbDBaWEpoWW14bEtIZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z0lXbHpUMkpxWldOMEtIZ3BJRDhnZFc1a1pXWnBibVZrSURvZ2VGdFRlVzFpYjJ3dWFYUmxjbUYwYjNKZE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHbHpRMjl1YzNSeWRXTjBiM0lvZUNrZ2UxeHVJQ0FnSUhKbGRIVnliaUJwYzBOaGJHeGhZbXhsS0hncE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHTnlaV0YwWlVsMFpYSmhkRzl5VW1WemRXeDBUMkpxWldOMEtIWmhiSFZsTENCa2IyNWxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIdGNiaUFnSUNBZ0lIWmhiSFZsT2lCMllXeDFaU3hjYmlBZ0lDQWdJR1J2Ym1VNklHUnZibVZjYmlBZ0lDQjlPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJRzFoZVdKbFJHVm1hVzVsS0c5aWFtVmpkQ3dnYm1GdFpTd2daR1Z6WTNJcElIdGNiaUFnSUNCcFppQW9JU2h1WVcxbElHbHVJRzlpYW1WamRDa3BJSHRjYmlBZ0lDQWdJRTlpYW1WamRDNWtaV1pwYm1WUWNtOXdaWEowZVNodlltcGxZM1FzSUc1aGJXVXNJR1JsYzJOeUtUdGNiaUFnSUNCOVhHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2JXRjVZbVZFWldacGJtVk5aWFJvYjJRb2IySnFaV04wTENCdVlXMWxMQ0IyWVd4MVpTa2dlMXh1SUNBZ0lHMWhlV0psUkdWbWFXNWxLRzlpYW1WamRDd2dibUZ0WlN3Z2UxeHVJQ0FnSUNBZ2RtRnNkV1U2SUhaaGJIVmxMRnh1SUNBZ0lDQWdZMjl1Wm1sbmRYSmhZbXhsT2lCMGNuVmxMRnh1SUNBZ0lDQWdaVzUxYldWeVlXSnNaVG9nWm1Gc2MyVXNYRzRnSUNBZ0lDQjNjbWwwWVdKc1pUb2dkSEoxWlZ4dUlDQWdJSDBwTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUcxaGVXSmxSR1ZtYVc1bFEyOXVjM1FvYjJKcVpXTjBMQ0J1WVcxbExDQjJZV3gxWlNrZ2UxeHVJQ0FnSUcxaGVXSmxSR1ZtYVc1bEtHOWlhbVZqZEN3Z2JtRnRaU3dnZTF4dUlDQWdJQ0FnZG1Gc2RXVTZJSFpoYkhWbExGeHVJQ0FnSUNBZ1kyOXVabWxuZFhKaFlteGxPaUJtWVd4elpTeGNiaUFnSUNBZ0lHVnVkVzFsY21GaWJHVTZJR1poYkhObExGeHVJQ0FnSUNBZ2QzSnBkR0ZpYkdVNklHWmhiSE5sWEc0Z0lDQWdmU2s3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnYldGNVltVkJaR1JHZFc1amRHbHZibk1vYjJKcVpXTjBMQ0JtZFc1amRHbHZibk1wSUh0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUdaMWJtTjBhVzl1Y3k1c1pXNW5kR2c3SUdrZ0t6MGdNaWtnZTF4dUlDQWdJQ0FnZG1GeUlHNWhiV1VnUFNCbWRXNWpkR2x2Ym5OYmFWMDdYRzRnSUNBZ0lDQjJZWElnZG1Gc2RXVWdQU0JtZFc1amRHbHZibk5iYVNBcklERmRPMXh1SUNBZ0lDQWdiV0Y1WW1WRVpXWnBibVZOWlhSb2IyUW9iMkpxWldOMExDQnVZVzFsTENCMllXeDFaU2s3WEc0Z0lDQWdmVnh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJRzFoZVdKbFFXUmtRMjl1YzNSektHOWlhbVZqZEN3Z1kyOXVjM1J6S1NCN1hHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCamIyNXpkSE11YkdWdVozUm9PeUJwSUNzOUlESXBJSHRjYmlBZ0lDQWdJSFpoY2lCdVlXMWxJRDBnWTI5dWMzUnpXMmxkTzF4dUlDQWdJQ0FnZG1GeUlIWmhiSFZsSUQwZ1kyOXVjM1J6VzJrZ0t5QXhYVHRjYmlBZ0lDQWdJRzFoZVdKbFJHVm1hVzVsUTI5dWMzUW9iMkpxWldOMExDQnVZVzFsTENCMllXeDFaU2s3WEc0Z0lDQWdmVnh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJRzFoZVdKbFFXUmtTWFJsY21GMGIzSW9iMkpxWldOMExDQm1kVzVqTENCVGVXMWliMndwSUh0Y2JpQWdJQ0JwWmlBb0lWTjViV0p2YkNCOGZDQWhVM2x0WW05c0xtbDBaWEpoZEc5eUlIeDhJRzlpYW1WamRGdFRlVzFpYjJ3dWFYUmxjbUYwYjNKZEtWeHVJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJR2xtSUNodlltcGxZM1JiSjBCQWFYUmxjbUYwYjNJblhTbGNiaUFnSUNBZ0lHWjFibU1nUFNCdlltcGxZM1JiSjBCQWFYUmxjbUYwYjNJblhUdGNiaUFnSUNCUFltcGxZM1F1WkdWbWFXNWxVSEp2Y0dWeWRIa29iMkpxWldOMExDQlRlVzFpYjJ3dWFYUmxjbUYwYjNJc0lIdGNiaUFnSUNBZ0lIWmhiSFZsT2lCbWRXNWpMRnh1SUNBZ0lDQWdZMjl1Wm1sbmRYSmhZbXhsT2lCMGNuVmxMRnh1SUNBZ0lDQWdaVzUxYldWeVlXSnNaVG9nWm1Gc2MyVXNYRzRnSUNBZ0lDQjNjbWwwWVdKc1pUb2dkSEoxWlZ4dUlDQWdJSDBwTzF4dUlDQjlYRzRnSUhaaGNpQndiMng1Wm1sc2JITWdQU0JiWFR0Y2JpQWdablZ1WTNScGIyNGdjbVZuYVhOMFpYSlFiMng1Wm1sc2JDaG1kVzVqS1NCN1hHNGdJQ0FnY0c5c2VXWnBiR3h6TG5CMWMyZ29ablZ1WXlrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NHOXNlV1pwYkd4QmJHd29aMnh2WW1Gc0tTQjdYRzRnSUNBZ2NHOXNlV1pwYkd4ekxtWnZja1ZoWTJnb0tHWjFibU4wYVc5dUtHWXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQm1LR2RzYjJKaGJDazdYRzRnSUNBZ2ZTa3BPMXh1SUNCOVhHNGdJSEpsZEhWeWJpQjdYRzRnSUNBZ1oyVjBJSFJ2VDJKcVpXTjBLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSFJ2VDJKcVpXTjBPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJSFJ2VldsdWRETXlLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSFJ2VldsdWRETXlPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJR2x6VDJKcVpXTjBLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR2x6VDJKcVpXTjBPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJR2x6UTJGc2JHRmliR1VvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYVhORFlXeHNZV0pzWlR0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCcGMwNTFiV0psY2lncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCcGMwNTFiV0psY2p0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCMGIwbHVkR1ZuWlhJb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2RHOUpiblJsWjJWeU8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElIUnZUR1Z1WjNSb0tDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIUnZUR1Z1WjNSb08xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHTm9aV05yU1hSbGNtRmliR1VvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWTJobFkydEpkR1Z5WVdKc1pUdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQnBjME52Ym5OMGNuVmpkRzl5S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdselEyOXVjM1J5ZFdOMGIzSTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdZM0psWVhSbFNYUmxjbUYwYjNKU1pYTjFiSFJQWW1wbFkzUW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdZM0psWVhSbFNYUmxjbUYwYjNKU1pYTjFiSFJQWW1wbFkzUTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdiV0Y1WW1WRVpXWnBibVVvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYldGNVltVkVaV1pwYm1VN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2JXRjVZbVZFWldacGJtVk5aWFJvYjJRb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2JXRjVZbVZFWldacGJtVk5aWFJvYjJRN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2JXRjVZbVZFWldacGJtVkRiMjV6ZENncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCdFlYbGlaVVJsWm1sdVpVTnZibk4wTzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUcxaGVXSmxRV1JrUm5WdVkzUnBiMjV6S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUcxaGVXSmxRV1JrUm5WdVkzUnBiMjV6TzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUcxaGVXSmxRV1JrUTI5dWMzUnpLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRzFoZVdKbFFXUmtRMjl1YzNSek8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHMWhlV0psUVdSa1NYUmxjbUYwYjNJb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2JXRjVZbVZCWkdSSmRHVnlZWFJ2Y2p0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCeVpXZHBjM1JsY2xCdmJIbG1hV3hzS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhKbFoybHpkR1Z5VUc5c2VXWnBiR3c3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnY0c5c2VXWnBiR3hCYkd3b0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2NHOXNlV1pwYkd4QmJHdzdYRzRnSUNBZ2ZWeHVJQ0I5TzF4dWZTazdYRzVUZVhOMFpXMHVjbVZuYVhOMFpYSk5iMlIxYkdVb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OU5ZWEF1YW5OY0lpd2dXMTBzSUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0JjSW5WelpTQnpkSEpwWTNSY0lqdGNiaUFnZG1GeUlGOWZiVzlrZFd4bFRtRnRaU0E5SUZ3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdlRXRndMbXB6WENJN1hHNGdJSFpoY2lBa1gxOHdJRDBnVTNsemRHVnRMbWRsZENoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwzVjBhV3h6TG1welhDSXBMRnh1SUNBZ0lDQWdhWE5QWW1wbFkzUWdQU0FrWDE4d0xtbHpUMkpxWldOMExGeHVJQ0FnSUNBZ2JXRjVZbVZCWkdSSmRHVnlZWFJ2Y2lBOUlDUmZYekF1YldGNVltVkJaR1JKZEdWeVlYUnZjaXhjYmlBZ0lDQWdJSEpsWjJsemRHVnlVRzlzZVdacGJHd2dQU0FrWDE4d0xuSmxaMmx6ZEdWeVVHOXNlV1pwYkd3N1hHNGdJSFpoY2lCblpYUlBkMjVJWVhOb1QySnFaV04wSUQwZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1kbGRFOTNia2hoYzJoUFltcGxZM1E3WEc0Z0lIWmhjaUFrYUdGelQzZHVVSEp2Y0dWeWRIa2dQU0JQWW1wbFkzUXVjSEp2ZEc5MGVYQmxMbWhoYzA5M2JsQnliM0JsY25SNU8xeHVJQ0IyWVhJZ1pHVnNaWFJsWkZObGJuUnBibVZzSUQwZ2UzMDdYRzRnSUdaMWJtTjBhVzl1SUd4dmIydDFjRWx1WkdWNEtHMWhjQ3dnYTJWNUtTQjdYRzRnSUNBZ2FXWWdLR2x6VDJKcVpXTjBLR3RsZVNrcElIdGNiaUFnSUNBZ0lIWmhjaUJvWVhOb1QySnFaV04wSUQwZ1oyVjBUM2R1U0dGemFFOWlhbVZqZENoclpYa3BPMXh1SUNBZ0lDQWdjbVYwZFhKdUlHaGhjMmhQWW1wbFkzUWdKaVlnYldGd0xtOWlhbVZqZEVsdVpHVjRYMXRvWVhOb1QySnFaV04wTG1oaGMyaGRPMXh1SUNBZ0lIMWNiaUFnSUNCcFppQW9kSGx3Wlc5bUlHdGxlU0E5UFQwZ0ozTjBjbWx1WnljcFhHNGdJQ0FnSUNCeVpYUjFjbTRnYldGd0xuTjBjbWx1WjBsdVpHVjRYMXRyWlhsZE8xeHVJQ0FnSUhKbGRIVnliaUJ0WVhBdWNISnBiV2wwYVhabFNXNWtaWGhmVzJ0bGVWMDdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdhVzVwZEUxaGNDaHRZWEFwSUh0Y2JpQWdJQ0J0WVhBdVpXNTBjbWxsYzE4Z1BTQmJYVHRjYmlBZ0lDQnRZWEF1YjJKcVpXTjBTVzVrWlhoZklEMGdUMkpxWldOMExtTnlaV0YwWlNodWRXeHNLVHRjYmlBZ0lDQnRZWEF1YzNSeWFXNW5TVzVrWlhoZklEMGdUMkpxWldOMExtTnlaV0YwWlNodWRXeHNLVHRjYmlBZ0lDQnRZWEF1Y0hKcGJXbDBhWFpsU1c1a1pYaGZJRDBnVDJKcVpXTjBMbU55WldGMFpTaHVkV3hzS1R0Y2JpQWdJQ0J0WVhBdVpHVnNaWFJsWkVOdmRXNTBYeUE5SURBN1hHNGdJSDFjYmlBZ2RtRnlJRTFoY0NBOUlHWjFibU4wYVc5dUlFMWhjQ2dwSUh0Y2JpQWdJQ0IyWVhJZ2FYUmxjbUZpYkdVZ1BTQmhjbWQxYldWdWRITmJNRjA3WEc0Z0lDQWdhV1lnS0NGcGMwOWlhbVZqZENoMGFHbHpLU2xjYmlBZ0lDQWdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0lvSjAxaGNDQmpZV3hzWldRZ2IyNGdhVzVqYjIxd1lYUnBZbXhsSUhSNWNHVW5LVHRjYmlBZ0lDQnBaaUFvSkdoaGMwOTNibEJ5YjNCbGNuUjVMbU5oYkd3b2RHaHBjeXdnSjJWdWRISnBaWE5mSnlrcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9KMDFoY0NCallXNGdibTkwSUdKbElISmxaVzUwY21GdWRHeDVJR2x1YVhScFlXeHBjMlZrSnlrN1hHNGdJQ0FnZlZ4dUlDQWdJR2x1YVhSTllYQW9kR2hwY3lrN1hHNGdJQ0FnYVdZZ0tHbDBaWEpoWW14bElDRTlQU0J1ZFd4c0lDWW1JR2wwWlhKaFlteGxJQ0U5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlDUmZYeklnUFNCcGRHVnlZV0pzWlZza2RISmhZMlYxY2xKMWJuUnBiV1V1ZEc5UWNtOXdaWEowZVNoVGVXMWliMnd1YVhSbGNtRjBiM0lwWFNncExGeHVJQ0FnSUNBZ0lDQWdJQ1JmWHpNN0lDRW9KRjlmTXlBOUlDUmZYekl1Ym1WNGRDZ3BLUzVrYjI1bE95QXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlDUmZYelFnUFNBa1gxOHpMblpoYkhWbExGeHVJQ0FnSUNBZ0lDQWdJQ0FnYTJWNUlEMGdKRjlmTkZzd1hTeGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGJIVmxJRDBnSkY5Zk5Gc3hYVHRjYmlBZ0lDQWdJQ0FnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9hWE11YzJWMEtHdGxlU3dnZG1Gc2RXVXBPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNCOU8xeHVJQ0FvSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU55WldGMFpVTnNZWE56S1NoTllYQXNJSHRjYmlBZ0lDQm5aWFFnYzJsNlpTZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TG1WdWRISnBaWE5mTG14bGJtZDBhQ0F2SURJZ0xTQjBhR2x6TG1SbGJHVjBaV1JEYjNWdWRGODdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUTZJR1oxYm1OMGFXOXVLR3RsZVNrZ2UxeHVJQ0FnSUNBZ2RtRnlJR2x1WkdWNElEMGdiRzl2YTNWd1NXNWtaWGdvZEdocGN5d2dhMlY1S1R0Y2JpQWdJQ0FnSUdsbUlDaHBibVJsZUNBaFBUMGdkVzVrWldacGJtVmtLVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkR2hwY3k1bGJuUnlhV1Z6WDF0cGJtUmxlQ0FySURGZE8xeHVJQ0FnSUgwc1hHNGdJQ0FnYzJWME9pQm1kVzVqZEdsdmJpaHJaWGtzSUhaaGJIVmxLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2IySnFaV04wVFc5a1pTQTlJR2x6VDJKcVpXTjBLR3RsZVNrN1hHNGdJQ0FnSUNCMllYSWdjM1J5YVc1blRXOWtaU0E5SUhSNWNHVnZaaUJyWlhrZ1BUMDlJQ2R6ZEhKcGJtY25PMXh1SUNBZ0lDQWdkbUZ5SUdsdVpHVjRJRDBnYkc5dmEzVndTVzVrWlhnb2RHaHBjeXdnYTJWNUtUdGNiaUFnSUNBZ0lHbG1JQ2hwYm1SbGVDQWhQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Wlc1MGNtbGxjMTliYVc1a1pYZ2dLeUF4WFNBOUlIWmhiSFZsTzF4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnYVc1a1pYZ2dQU0IwYUdsekxtVnVkSEpwWlhOZkxteGxibWQwYUR0Y2JpQWdJQ0FnSUNBZ2RHaHBjeTVsYm5SeWFXVnpYMXRwYm1SbGVGMGdQU0JyWlhrN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Wlc1MGNtbGxjMTliYVc1a1pYZ2dLeUF4WFNBOUlIWmhiSFZsTzF4dUlDQWdJQ0FnSUNCcFppQW9iMkpxWldOMFRXOWtaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIWmhjaUJvWVhOb1QySnFaV04wSUQwZ1oyVjBUM2R1U0dGemFFOWlhbVZqZENoclpYa3BPMXh1SUNBZ0lDQWdJQ0FnSUhaaGNpQm9ZWE5vSUQwZ2FHRnphRTlpYW1WamRDNW9ZWE5vTzF4dUlDQWdJQ0FnSUNBZ0lIUm9hWE11YjJKcVpXTjBTVzVrWlhoZlcyaGhjMmhkSUQwZ2FXNWtaWGc3WEc0Z0lDQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MzUnlhVzVuVFc5a1pTa2dlMXh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXVjM1J5YVc1blNXNWtaWGhmVzJ0bGVWMGdQU0JwYm1SbGVEdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxuQnlhVzFwZEdsMlpVbHVaR1Y0WDF0clpYbGRJRDBnYVc1a1pYZzdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TzF4dUlDQWdJSDBzWEc0Z0lDQWdhR0Z6T2lCbWRXNWpkR2x2YmloclpYa3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnNiMjlyZFhCSmJtUmxlQ2gwYUdsekxDQnJaWGtwSUNFOVBTQjFibVJsWm1sdVpXUTdYRzRnSUNBZ2ZTeGNiaUFnSUNCa1pXeGxkR1U2SUdaMWJtTjBhVzl1S0d0bGVTa2dlMXh1SUNBZ0lDQWdkbUZ5SUc5aWFtVmpkRTF2WkdVZ1BTQnBjMDlpYW1WamRDaHJaWGtwTzF4dUlDQWdJQ0FnZG1GeUlITjBjbWx1WjAxdlpHVWdQU0IwZVhCbGIyWWdhMlY1SUQwOVBTQW5jM1J5YVc1bkp6dGNiaUFnSUNBZ0lIWmhjaUJwYm1SbGVEdGNiaUFnSUNBZ0lIWmhjaUJvWVhOb08xeHVJQ0FnSUNBZ2FXWWdLRzlpYW1WamRFMXZaR1VwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR2hoYzJoUFltcGxZM1FnUFNCblpYUlBkMjVJWVhOb1QySnFaV04wS0d0bGVTazdYRzRnSUNBZ0lDQWdJR2xtSUNob1lYTm9UMkpxWldOMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnYVc1a1pYZ2dQU0IwYUdsekxtOWlhbVZqZEVsdVpHVjRYMXRvWVhOb0lEMGdhR0Z6YUU5aWFtVmpkQzVvWVhOb1hUdGNiaUFnSUNBZ0lDQWdJQ0JrWld4bGRHVWdkR2hwY3k1dlltcGxZM1JKYm1SbGVGOWJhR0Z6YUYwN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1J5YVc1blRXOWtaU2tnZTF4dUlDQWdJQ0FnSUNCcGJtUmxlQ0E5SUhSb2FYTXVjM1J5YVc1blNXNWtaWGhmVzJ0bGVWMDdYRzRnSUNBZ0lDQWdJR1JsYkdWMFpTQjBhR2x6TG5OMGNtbHVaMGx1WkdWNFgxdHJaWGxkTzF4dUlDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnYVc1a1pYZ2dQU0IwYUdsekxuQnlhVzFwZEdsMlpVbHVaR1Y0WDF0clpYbGRPMXh1SUNBZ0lDQWdJQ0JrWld4bGRHVWdkR2hwY3k1d2NtbHRhWFJwZG1WSmJtUmxlRjliYTJWNVhUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2hwYm1SbGVDQWhQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Wlc1MGNtbGxjMTliYVc1a1pYaGRJRDBnWkdWc1pYUmxaRk5sYm5ScGJtVnNPMXh1SUNBZ0lDQWdJQ0IwYUdsekxtVnVkSEpwWlhOZlcybHVaR1Y0SUNzZ01WMGdQU0IxYm1SbFptbHVaV1E3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVaR1ZzWlhSbFpFTnZkVzUwWHlzck8xeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JpQWdJQ0I5TEZ4dUlDQWdJR05zWldGeU9pQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJR2x1YVhSTllYQW9kR2hwY3lrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JtYjNKRllXTm9PaUJtZFc1amRHbHZiaWhqWVd4c1ltRmphMFp1S1NCN1hHNGdJQ0FnSUNCMllYSWdkR2hwYzBGeVp5QTlJR0Z5WjNWdFpXNTBjMXN4WFR0Y2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2RHaHBjeTVsYm5SeWFXVnpYeTVzWlc1bmRHZzdJR2tnS3owZ01pa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2EyVjVJRDBnZEdocGN5NWxiblJ5YVdWelgxdHBYVHRjYmlBZ0lDQWdJQ0FnZG1GeUlIWmhiSFZsSUQwZ2RHaHBjeTVsYm5SeWFXVnpYMXRwSUNzZ01WMDdYRzRnSUNBZ0lDQWdJR2xtSUNoclpYa2dQVDA5SUdSbGJHVjBaV1JUWlc1MGFXNWxiQ2xjYmlBZ0lDQWdJQ0FnSUNCamIyNTBhVzUxWlR0Y2JpQWdJQ0FnSUNBZ1kyRnNiR0poWTJ0R2JpNWpZV3hzS0hSb2FYTkJjbWNzSUhaaGJIVmxMQ0JyWlhrc0lIUm9hWE1wTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdaVzUwY21sbGN6b2dKSFJ5WVdObGRYSlNkVzUwYVcxbExtbHVhWFJIWlc1bGNtRjBiM0pHZFc1amRHbHZiaWhtZFc1amRHbHZiaUFrWDE4MUtDa2dlMXh1SUNBZ0lDQWdkbUZ5SUdrc1hHNGdJQ0FnSUNBZ0lDQWdhMlY1TEZ4dUlDQWdJQ0FnSUNBZ0lIWmhiSFZsTzF4dUlDQWdJQ0FnY21WMGRYSnVJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWpjbVZoZEdWSFpXNWxjbUYwYjNKSmJuTjBZVzVqWlNobWRXNWpkR2x2Ymlna1kzUjRLU0I3WEc0Z0lDQWdJQ0FnSUhkb2FXeGxJQ2gwY25WbEtWeHVJQ0FnSUNBZ0lDQWdJSE4zYVhSamFDQW9KR04wZUM1emRHRjBaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZMkZ6WlNBd09seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCcElEMGdNRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SURFeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTVRJNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQW9hU0E4SUhSb2FYTXVaVzUwY21sbGMxOHViR1Z1WjNSb0tTQS9JRGdnT2lBdE1qdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURRNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdrZ0t6MGdNanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SURFeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnT0RwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYTJWNUlEMGdkR2hwY3k1bGJuUnlhV1Z6WDF0cFhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnNkV1VnUFNCMGFHbHpMbVZ1ZEhKcFpYTmZXMmtnS3lBeFhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJRGs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJGelpTQTVPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtZM1I0TG5OMFlYUmxJRDBnS0d0bGVTQTlQVDBnWkdWc1pYUmxaRk5sYm5ScGJtVnNLU0EvSURRZ09pQTJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ05qcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJREk3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQmJhMlY1TENCMllXeDFaVjA3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURJNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3ViV0Y1WW1WVWFISnZkeWdwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWTNSNExuTjBZWFJsSUQwZ05EdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmtaV1poZFd4ME9seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnSkdOMGVDNWxibVFvS1R0Y2JpQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlMQ0FrWDE4MUxDQjBhR2x6S1R0Y2JpQWdJQ0I5S1N4Y2JpQWdJQ0JyWlhsek9pQWtkSEpoWTJWMWNsSjFiblJwYldVdWFXNXBkRWRsYm1WeVlYUnZja1oxYm1OMGFXOXVLR1oxYm1OMGFXOXVJQ1JmWHpZb0tTQjdYRzRnSUNBZ0lDQjJZWElnYVN4Y2JpQWdJQ0FnSUNBZ0lDQnJaWGtzWEc0Z0lDQWdJQ0FnSUNBZ2RtRnNkV1U3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdKSFJ5WVdObGRYSlNkVzUwYVcxbExtTnlaV0YwWlVkbGJtVnlZWFJ2Y2tsdWMzUmhibU5sS0daMWJtTjBhVzl1S0NSamRIZ3BJSHRjYmlBZ0lDQWdJQ0FnZDJocGJHVWdLSFJ5ZFdVcFhHNGdJQ0FnSUNBZ0lDQWdjM2RwZEdOb0lDZ2tZM1I0TG5OMFlYUmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURBNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdrZ1BTQXdPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtZM1I0TG5OMFlYUmxJRDBnTVRJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyRnpaU0F4TWpwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlDaHBJRHdnZEdocGN5NWxiblJ5YVdWelh5NXNaVzVuZEdncElEOGdPQ0E2SUMweU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTkRwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYVNBclBTQXlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtZM1I0TG5OMFlYUmxJRDBnTVRJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyRnpaU0E0T2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JyWlhrZ1BTQjBhR2x6TG1WdWRISnBaWE5mVzJsZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCMllXeDFaU0E5SUhSb2FYTXVaVzUwY21sbGMxOWJhU0FySURGZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1kzUjRMbk4wWVhSbElEMGdPVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElEazZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0FvYTJWNUlEMDlQU0JrWld4bGRHVmtVMlZ1ZEdsdVpXd3BJRDhnTkNBNklEWTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdZMkZ6WlNBMk9seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1kzUjRMbk4wWVhSbElEMGdNanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHdGxlVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTWpwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXRZWGxpWlZSb2NtOTNLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBME8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHUmxabUYxYkhRNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFrWTNSNExtVnVaQ2dwTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMHNJQ1JmWHpZc0lIUm9hWE1wTzF4dUlDQWdJSDBwTEZ4dUlDQWdJSFpoYkhWbGN6b2dKSFJ5WVdObGRYSlNkVzUwYVcxbExtbHVhWFJIWlc1bGNtRjBiM0pHZFc1amRHbHZiaWhtZFc1amRHbHZiaUFrWDE4M0tDa2dlMXh1SUNBZ0lDQWdkbUZ5SUdrc1hHNGdJQ0FnSUNBZ0lDQWdhMlY1TEZ4dUlDQWdJQ0FnSUNBZ0lIWmhiSFZsTzF4dUlDQWdJQ0FnY21WMGRYSnVJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWpjbVZoZEdWSFpXNWxjbUYwYjNKSmJuTjBZVzVqWlNobWRXNWpkR2x2Ymlna1kzUjRLU0I3WEc0Z0lDQWdJQ0FnSUhkb2FXeGxJQ2gwY25WbEtWeHVJQ0FnSUNBZ0lDQWdJSE4zYVhSamFDQW9KR04wZUM1emRHRjBaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZMkZ6WlNBd09seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCcElEMGdNRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SURFeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTVRJNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQW9hU0E4SUhSb2FYTXVaVzUwY21sbGMxOHViR1Z1WjNSb0tTQS9JRGdnT2lBdE1qdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURRNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdrZ0t6MGdNanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SURFeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnT0RwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnYTJWNUlEMGdkR2hwY3k1bGJuUnlhV1Z6WDF0cFhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2RtRnNkV1VnUFNCMGFHbHpMbVZ1ZEhKcFpYTmZXMmtnS3lBeFhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJRGs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJGelpTQTVPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtZM1I0TG5OMFlYUmxJRDBnS0d0bGVTQTlQVDBnWkdWc1pYUmxaRk5sYm5ScGJtVnNLU0EvSURRZ09pQTJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ05qcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJREk3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQjJZV3gxWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ01qcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV0WVhsaVpWUm9jbTkzS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQTBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1JsWm1GMWJIUTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBa1kzUjRMbVZ1WkNncE8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDBzSUNSZlh6Y3NJSFJvYVhNcE8xeHVJQ0FnSUgwcFhHNGdJSDBzSUh0OUtUdGNiaUFnVDJKcVpXTjBMbVJsWm1sdVpWQnliM0JsY25SNUtFMWhjQzV3Y205MGIzUjVjR1VzSUZONWJXSnZiQzVwZEdWeVlYUnZjaXdnZTF4dUlDQWdJR052Ym1acFozVnlZV0pzWlRvZ2RISjFaU3hjYmlBZ0lDQjNjbWwwWVdKc1pUb2dkSEoxWlN4Y2JpQWdJQ0IyWVd4MVpUb2dUV0Z3TG5CeWIzUnZkSGx3WlM1bGJuUnlhV1Z6WEc0Z0lIMHBPMXh1SUNCbWRXNWpkR2x2YmlCd2IyeDVabWxzYkUxaGNDaG5iRzlpWVd3cElIdGNiaUFnSUNCMllYSWdKRjlmTkNBOUlHZHNiMkpoYkN4Y2JpQWdJQ0FnSUNBZ1QySnFaV04wSUQwZ0pGOWZOQzVQWW1wbFkzUXNYRzRnSUNBZ0lDQWdJRk41YldKdmJDQTlJQ1JmWHpRdVUzbHRZbTlzTzF4dUlDQWdJR2xtSUNnaFoyeHZZbUZzTGsxaGNDbGNiaUFnSUNBZ0lHZHNiMkpoYkM1TllYQWdQU0JOWVhBN1hHNGdJQ0FnZG1GeUlHMWhjRkJ5YjNSdmRIbHdaU0E5SUdkc2IySmhiQzVOWVhBdWNISnZkRzkwZVhCbE8xeHVJQ0FnSUdsbUlDaHRZWEJRY205MGIzUjVjR1V1Wlc1MGNtbGxjeUE5UFQwZ2RXNWtaV1pwYm1Wa0tWeHVJQ0FnSUNBZ1oyeHZZbUZzTGsxaGNDQTlJRTFoY0R0Y2JpQWdJQ0JwWmlBb2JXRndVSEp2ZEc5MGVYQmxMbVZ1ZEhKcFpYTXBJSHRjYmlBZ0lDQWdJRzFoZVdKbFFXUmtTWFJsY21GMGIzSW9iV0Z3VUhKdmRHOTBlWEJsTENCdFlYQlFjbTkwYjNSNWNHVXVaVzUwY21sbGN5d2dVM2x0WW05c0tUdGNiaUFnSUNBZ0lHMWhlV0psUVdSa1NYUmxjbUYwYjNJb1QySnFaV04wTG1kbGRGQnliM1J2ZEhsd1pVOW1LRzVsZHlCbmJHOWlZV3d1VFdGd0tDa3VaVzUwY21sbGN5Z3BLU3dnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGFHbHpPMXh1SUNBZ0lDQWdmU3dnVTNsdFltOXNLVHRjYmlBZ0lDQjlYRzRnSUgxY2JpQWdjbVZuYVhOMFpYSlFiMng1Wm1sc2JDaHdiMng1Wm1sc2JFMWhjQ2s3WEc0Z0lISmxkSFZ5YmlCN1hHNGdJQ0FnWjJWMElFMWhjQ2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJOWVhBN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2NHOXNlV1pwYkd4TllYQW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdjRzlzZVdacGJHeE5ZWEE3WEc0Z0lDQWdmVnh1SUNCOU8xeHVmU2s3WEc1VGVYTjBaVzB1WjJWMEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZUV0Z3TG1welhDSWdLeUFuSnlrN1hHNVRlWE4wWlcwdWNtVm5hWE4wWlhKTmIyUjFiR1VvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5VFpYUXVhbk5jSWl3Z1cxMHNJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQmNJblZ6WlNCemRISnBZM1JjSWp0Y2JpQWdkbUZ5SUY5ZmJXOWtkV3hsVG1GdFpTQTlJRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12VTJWMExtcHpYQ0k3WEc0Z0lIWmhjaUFrWDE4d0lEMGdVM2x6ZEdWdExtZGxkQ2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDNWMGFXeHpMbXB6WENJcExGeHVJQ0FnSUNBZ2FYTlBZbXBsWTNRZ1BTQWtYMTh3TG1selQySnFaV04wTEZ4dUlDQWdJQ0FnYldGNVltVkJaR1JKZEdWeVlYUnZjaUE5SUNSZlh6QXViV0Y1WW1WQlpHUkpkR1Z5WVhSdmNpeGNiaUFnSUNBZ0lISmxaMmx6ZEdWeVVHOXNlV1pwYkd3Z1BTQWtYMTh3TG5KbFoybHpkR1Z5VUc5c2VXWnBiR3c3WEc0Z0lIWmhjaUJOWVhBZ1BTQlRlWE4wWlcwdVoyVjBLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12VFdGd0xtcHpYQ0lwTGsxaGNEdGNiaUFnZG1GeUlHZGxkRTkzYmtoaGMyaFBZbXBsWTNRZ1BTQWtkSEpoWTJWMWNsSjFiblJwYldVdVoyVjBUM2R1U0dGemFFOWlhbVZqZER0Y2JpQWdkbUZ5SUNSb1lYTlBkMjVRY205d1pYSjBlU0E5SUU5aWFtVmpkQzV3Y205MGIzUjVjR1V1YUdGelQzZHVVSEp2Y0dWeWRIazdYRzRnSUdaMWJtTjBhVzl1SUdsdWFYUlRaWFFvYzJWMEtTQjdYRzRnSUNBZ2MyVjBMbTFoY0Y4Z1BTQnVaWGNnVFdGd0tDazdYRzRnSUgxY2JpQWdkbUZ5SUZObGRDQTlJR1oxYm1OMGFXOXVJRk5sZENncElIdGNiaUFnSUNCMllYSWdhWFJsY21GaWJHVWdQU0JoY21kMWJXVnVkSE5iTUYwN1hHNGdJQ0FnYVdZZ0tDRnBjMDlpYW1WamRDaDBhR2x6S1NsY2JpQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0oxTmxkQ0JqWVd4c1pXUWdiMjRnYVc1amIyMXdZWFJwWW14bElIUjVjR1VuS1R0Y2JpQWdJQ0JwWmlBb0pHaGhjMDkzYmxCeWIzQmxjblI1TG1OaGJHd29kR2hwY3l3Z0oyMWhjRjhuS1NrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25VMlYwSUdOaGJpQnViM1FnWW1VZ2NtVmxiblJ5WVc1MGJIa2dhVzVwZEdsaGJHbHpaV1FuS1R0Y2JpQWdJQ0I5WEc0Z0lDQWdhVzVwZEZObGRDaDBhR2x6S1R0Y2JpQWdJQ0JwWmlBb2FYUmxjbUZpYkdVZ0lUMDlJRzUxYkd3Z0ppWWdhWFJsY21GaWJHVWdJVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ0pGOWZOQ0E5SUdsMFpYSmhZbXhsV3lSMGNtRmpaWFZ5VW5WdWRHbHRaUzUwYjFCeWIzQmxjblI1S0ZONWJXSnZiQzVwZEdWeVlYUnZjaWxkS0Nrc1hHNGdJQ0FnSUNBZ0lDQWdKRjlmTlRzZ0lTZ2tYMTgxSUQwZ0pGOWZOQzV1WlhoMEtDa3BMbVJ2Ym1VN0lDa2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2FYUmxiU0E5SUNSZlh6VXVkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lIdGNiaUFnSUNBZ0lDQWdJQ0IwYUdsekxtRmtaQ2hwZEdWdEtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNiaUFnZlR0Y2JpQWdLQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWpjbVZoZEdWRGJHRnpjeWtvVTJWMExDQjdYRzRnSUNBZ1oyVjBJSE5wZW1Vb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTV0WVhCZkxuTnBlbVU3WEc0Z0lDQWdmU3hjYmlBZ0lDQm9ZWE02SUdaMWJtTjBhVzl1S0d0bGVTa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE11YldGd1h5NW9ZWE1vYTJWNUtUdGNiaUFnSUNCOUxGeHVJQ0FnSUdGa1pEb2dablZ1WTNScGIyNG9hMlY1S1NCN1hHNGdJQ0FnSUNCMGFHbHpMbTFoY0Y4dWMyVjBLR3RsZVN3Z2EyVjVLVHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TzF4dUlDQWdJSDBzWEc0Z0lDQWdaR1ZzWlhSbE9pQm1kVzVqZEdsdmJpaHJaWGtwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxtMWhjRjh1WkdWc1pYUmxLR3RsZVNrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JqYkdWaGNqb2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdkR2hwY3k1dFlYQmZMbU5zWldGeUtDazdYRzRnSUNBZ2ZTeGNiaUFnSUNCbWIzSkZZV05vT2lCbWRXNWpkR2x2YmloallXeHNZbUZqYTBadUtTQjdYRzRnSUNBZ0lDQjJZWElnZEdocGMwRnlaeUE5SUdGeVozVnRaVzUwYzFzeFhUdGNiaUFnSUNBZ0lIWmhjaUFrWDE4eUlEMGdkR2hwY3p0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxtMWhjRjh1Wm05eVJXRmphQ2dvWm5WdVkzUnBiMjRvZG1Gc2RXVXNJR3RsZVNrZ2UxeHVJQ0FnSUNBZ0lDQmpZV3hzWW1GamEwWnVMbU5oYkd3b2RHaHBjMEZ5Wnl3Z2EyVjVMQ0JyWlhrc0lDUmZYeklwTzF4dUlDQWdJQ0FnZlNrcE8xeHVJQ0FnSUgwc1hHNGdJQ0FnZG1Gc2RXVnpPaUFrZEhKaFkyVjFjbEoxYm5ScGJXVXVhVzVwZEVkbGJtVnlZWFJ2Y2taMWJtTjBhVzl1S0daMWJtTjBhVzl1SUNSZlh6Y29LU0I3WEc0Z0lDQWdJQ0IyWVhJZ0pGOWZPQ3hjYmlBZ0lDQWdJQ0FnSUNBa1gxODVPMXh1SUNBZ0lDQWdjbVYwZFhKdUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1amNtVmhkR1ZIWlc1bGNtRjBiM0pKYm5OMFlXNWpaU2htZFc1amRHbHZiaWdrWTNSNEtTQjdYRzRnSUNBZ0lDQWdJSGRvYVd4bElDaDBjblZsS1Z4dUlDQWdJQ0FnSUNBZ0lITjNhWFJqYUNBb0pHTjBlQzV6ZEdGMFpTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyRnpaU0F3T2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWDE4NElEMGdkR2hwY3k1dFlYQmZMbXRsZVhNb0tWdFRlVzFpYjJ3dWFYUmxjbUYwYjNKZEtDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzJWdWRDQTlJSFp2YVdRZ01EdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzVoWTNScGIyNGdQU0FuYm1WNGRDYzdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0F4TWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJREV5T2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWDE4NUlEMGdKRjlmT0Zza1kzUjRMbUZqZEdsdmJsMG9KR04wZUM1elpXNTBTV2R1YjNKbFZHaHliM2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWTNSNExuTjBZWFJsSUQwZ09UdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURrNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQW9KRjlmT1M1a2IyNWxLU0EvSURNZ09pQXlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ016cGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6Wlc1MElEMGdKRjlmT1M1MllXeDFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SUMweU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTWpwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlERXlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z0pGOWZPUzUyWVd4MVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdSbFptRjFiSFE2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQWtZM1I0TG1WdVpDZ3BPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwc0lDUmZYemNzSUhSb2FYTXBPMXh1SUNBZ0lIMHBMRnh1SUNBZ0lHVnVkSEpwWlhNNklDUjBjbUZqWlhWeVVuVnVkR2x0WlM1cGJtbDBSMlZ1WlhKaGRHOXlSblZ1WTNScGIyNG9ablZ1WTNScGIyNGdKRjlmTVRBb0tTQjdYRzRnSUNBZ0lDQjJZWElnSkY5Zk1URXNYRzRnSUNBZ0lDQWdJQ0FnSkY5Zk1USTdYRzRnSUNBZ0lDQnlaWFIxY200Z0pIUnlZV05sZFhKU2RXNTBhVzFsTG1OeVpXRjBaVWRsYm1WeVlYUnZja2x1YzNSaGJtTmxLR1oxYm1OMGFXOXVLQ1JqZEhncElIdGNiaUFnSUNBZ0lDQWdkMmhwYkdVZ0tIUnlkV1VwWEc0Z0lDQWdJQ0FnSUNBZ2MzZHBkR05vSUNna1kzUjRMbk4wWVhSbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJREE2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JmWHpFeElEMGdkR2hwY3k1dFlYQmZMbVZ1ZEhKcFpYTW9LVnRUZVcxaWIyd3VhWFJsY21GMGIzSmRLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMyVnVkQ0E5SUhadmFXUWdNRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1aFkzUnBiMjRnUFNBbmJtVjRkQ2M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBeE1qdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURFeU9seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1gxOHhNaUE5SUNSZlh6RXhXeVJqZEhndVlXTjBhVzl1WFNna1kzUjRMbk5sYm5SSloyNXZjbVZVYUhKdmR5azdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0E1TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdPVHBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SUNna1gxOHhNaTVrYjI1bEtTQS9JRE1nT2lBeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTXpwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpaVzUwSUQwZ0pGOWZNVEl1ZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0F0TWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJREk2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBeE1qdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNSZlh6RXlMblpoYkhWbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWkdWbVlYVnNkRHBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlDUmpkSGd1Wlc1a0tDazdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlN3Z0pGOWZNVEFzSUhSb2FYTXBPMXh1SUNBZ0lIMHBYRzRnSUgwc0lIdDlLVHRjYmlBZ1QySnFaV04wTG1SbFptbHVaVkJ5YjNCbGNuUjVLRk5sZEM1d2NtOTBiM1I1Y0dVc0lGTjViV0p2YkM1cGRHVnlZWFJ2Y2l3Z2UxeHVJQ0FnSUdOdmJtWnBaM1Z5WVdKc1pUb2dkSEoxWlN4Y2JpQWdJQ0IzY21sMFlXSnNaVG9nZEhKMVpTeGNiaUFnSUNCMllXeDFaVG9nVTJWMExuQnliM1J2ZEhsd1pTNTJZV3gxWlhOY2JpQWdmU2s3WEc0Z0lFOWlhbVZqZEM1a1pXWnBibVZRY205d1pYSjBlU2hUWlhRdWNISnZkRzkwZVhCbExDQW5hMlY1Y3ljc0lIdGNiaUFnSUNCamIyNW1hV2QxY21GaWJHVTZJSFJ5ZFdVc1hHNGdJQ0FnZDNKcGRHRmliR1U2SUhSeWRXVXNYRzRnSUNBZ2RtRnNkV1U2SUZObGRDNXdjbTkwYjNSNWNHVXVkbUZzZFdWelhHNGdJSDBwTzF4dUlDQm1kVzVqZEdsdmJpQndiMng1Wm1sc2JGTmxkQ2huYkc5aVlXd3BJSHRjYmlBZ0lDQjJZWElnSkY5Zk5pQTlJR2RzYjJKaGJDeGNiaUFnSUNBZ0lDQWdUMkpxWldOMElEMGdKRjlmTmk1UFltcGxZM1FzWEc0Z0lDQWdJQ0FnSUZONWJXSnZiQ0E5SUNSZlh6WXVVM2x0WW05c08xeHVJQ0FnSUdsbUlDZ2haMnh2WW1Gc0xsTmxkQ2xjYmlBZ0lDQWdJR2RzYjJKaGJDNVRaWFFnUFNCVFpYUTdYRzRnSUNBZ2RtRnlJSE5sZEZCeWIzUnZkSGx3WlNBOUlHZHNiMkpoYkM1VFpYUXVjSEp2ZEc5MGVYQmxPMXh1SUNBZ0lHbG1JQ2h6WlhSUWNtOTBiM1I1Y0dVdWRtRnNkV1Z6S1NCN1hHNGdJQ0FnSUNCdFlYbGlaVUZrWkVsMFpYSmhkRzl5S0hObGRGQnliM1J2ZEhsd1pTd2djMlYwVUhKdmRHOTBlWEJsTG5aaGJIVmxjeXdnVTNsdFltOXNLVHRjYmlBZ0lDQWdJRzFoZVdKbFFXUmtTWFJsY21GMGIzSW9UMkpxWldOMExtZGxkRkJ5YjNSdmRIbHdaVTltS0c1bGR5Qm5iRzlpWVd3dVUyVjBLQ2t1ZG1Gc2RXVnpLQ2twTENCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE03WEc0Z0lDQWdJQ0I5TENCVGVXMWliMndwTzF4dUlDQWdJSDFjYmlBZ2ZWeHVJQ0J5WldkcGMzUmxjbEJ2YkhsbWFXeHNLSEJ2YkhsbWFXeHNVMlYwS1R0Y2JpQWdjbVYwZFhKdUlIdGNiaUFnSUNCblpYUWdVMlYwS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUZObGREdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQndiMng1Wm1sc2JGTmxkQ2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ3YjJ4NVptbHNiRk5sZER0Y2JpQWdJQ0I5WEc0Z0lIMDdYRzU5S1R0Y2JsTjVjM1JsYlM1blpYUW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlUWlhRdWFuTmNJaUFySUNjbktUdGNibE41YzNSbGJTNXlaV2RwYzNSbGNrMXZaSFZzWlNoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2Ym05a1pWOXRiMlIxYkdWekwzSnpkbkF2YkdsaUwzSnpkbkF2WVhOaGNDNXFjMXdpTENCYlhTd2dablZ1WTNScGIyNG9LU0I3WEc0Z0lGd2lkWE5sSUhOMGNtbGpkRndpTzF4dUlDQjJZWElnWDE5dGIyUjFiR1ZPWVcxbElEMGdYQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwyNXZaR1ZmYlc5a2RXeGxjeTl5YzNad0wyeHBZaTl5YzNad0wyRnpZWEF1YW5OY0lqdGNiaUFnZG1GeUlHeGxiaUE5SURBN1hHNGdJR1oxYm1OMGFXOXVJR0Z6WVhBb1kyRnNiR0poWTJzc0lHRnlaeWtnZTF4dUlDQWdJSEYxWlhWbFcyeGxibDBnUFNCallXeHNZbUZqYXp0Y2JpQWdJQ0J4ZFdWMVpWdHNaVzRnS3lBeFhTQTlJR0Z5Wnp0Y2JpQWdJQ0JzWlc0Z0t6MGdNanRjYmlBZ0lDQnBaaUFvYkdWdUlEMDlQU0F5S1NCN1hHNGdJQ0FnSUNCelkyaGxaSFZzWlVac2RYTm9LQ2s3WEc0Z0lDQWdmVnh1SUNCOVhHNGdJSFpoY2lBa1gxOWtaV1poZFd4MElEMGdZWE5oY0R0Y2JpQWdkbUZ5SUdKeWIzZHpaWEpIYkc5aVlXd2dQU0FvZEhsd1pXOW1JSGRwYm1SdmR5QWhQVDBnSjNWdVpHVm1hVzVsWkNjcElEOGdkMmx1Wkc5M0lEb2dlMzA3WEc0Z0lIWmhjaUJDY205M2MyVnlUWFYwWVhScGIyNVBZbk5sY25abGNpQTlJR0p5YjNkelpYSkhiRzlpWVd3dVRYVjBZWFJwYjI1UFluTmxjblpsY2lCOGZDQmljbTkzYzJWeVIyeHZZbUZzTGxkbFlrdHBkRTExZEdGMGFXOXVUMkp6WlhKMlpYSTdYRzRnSUhaaGNpQnBjMWR2Y210bGNpQTlJSFI1Y0dWdlppQlZhVzUwT0VOc1lXMXdaV1JCY25KaGVTQWhQVDBnSjNWdVpHVm1hVzVsWkNjZ0ppWWdkSGx3Wlc5bUlHbHRjRzl5ZEZOamNtbHdkSE1nSVQwOUlDZDFibVJsWm1sdVpXUW5JQ1ltSUhSNWNHVnZaaUJOWlhOellXZGxRMmhoYm01bGJDQWhQVDBnSjNWdVpHVm1hVzVsWkNjN1hHNGdJR1oxYm1OMGFXOXVJSFZ6WlU1bGVIUlVhV05yS0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhCeWIyTmxjM011Ym1WNGRGUnBZMnNvWm14MWMyZ3BPMXh1SUNBZ0lIMDdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdkWE5sVFhWMFlYUnBiMjVQWW5ObGNuWmxjaWdwSUh0Y2JpQWdJQ0IyWVhJZ2FYUmxjbUYwYVc5dWN5QTlJREE3WEc0Z0lDQWdkbUZ5SUc5aWMyVnlkbVZ5SUQwZ2JtVjNJRUp5YjNkelpYSk5kWFJoZEdsdmJrOWljMlZ5ZG1WeUtHWnNkWE5vS1R0Y2JpQWdJQ0IyWVhJZ2JtOWtaU0E5SUdSdlkzVnRaVzUwTG1OeVpXRjBaVlJsZUhST2IyUmxLQ2NuS1R0Y2JpQWdJQ0J2WW5ObGNuWmxjaTV2WW5ObGNuWmxLRzV2WkdVc0lIdGphR0Z5WVdOMFpYSkVZWFJoT2lCMGNuVmxmU2s3WEc0Z0lDQWdjbVYwZFhKdUlHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdibTlrWlM1a1lYUmhJRDBnS0dsMFpYSmhkR2x2Ym5NZ1BTQXJLMmwwWlhKaGRHbHZibk1nSlNBeUtUdGNiaUFnSUNCOU8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlIVnpaVTFsYzNOaFoyVkRhR0Z1Ym1Wc0tDa2dlMXh1SUNBZ0lIWmhjaUJqYUdGdWJtVnNJRDBnYm1WM0lFMWxjM05oWjJWRGFHRnVibVZzS0NrN1hHNGdJQ0FnWTJoaGJtNWxiQzV3YjNKME1TNXZibTFsYzNOaFoyVWdQU0JtYkhWemFEdGNiaUFnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCamFHRnVibVZzTG5CdmNuUXlMbkJ2YzNSTlpYTnpZV2RsS0RBcE8xeHVJQ0FnSUgwN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2RYTmxVMlYwVkdsdFpXOTFkQ2dwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0J6WlhSVWFXMWxiM1YwS0dac2RYTm9MQ0F4S1R0Y2JpQWdJQ0I5TzF4dUlDQjlYRzRnSUhaaGNpQnhkV1YxWlNBOUlHNWxkeUJCY25KaGVTZ3hNREF3S1R0Y2JpQWdablZ1WTNScGIyNGdabXgxYzJnb0tTQjdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQnNaVzQ3SUdrZ0t6MGdNaWtnZTF4dUlDQWdJQ0FnZG1GeUlHTmhiR3hpWVdOcklEMGdjWFZsZFdWYmFWMDdYRzRnSUNBZ0lDQjJZWElnWVhKbklEMGdjWFZsZFdWYmFTQXJJREZkTzF4dUlDQWdJQ0FnWTJGc2JHSmhZMnNvWVhKbktUdGNiaUFnSUNBZ0lIRjFaWFZsVzJsZElEMGdkVzVrWldacGJtVmtPMXh1SUNBZ0lDQWdjWFZsZFdWYmFTQXJJREZkSUQwZ2RXNWtaV1pwYm1Wa08xeHVJQ0FnSUgxY2JpQWdJQ0JzWlc0Z1BTQXdPMXh1SUNCOVhHNGdJSFpoY2lCelkyaGxaSFZzWlVac2RYTm9PMXh1SUNCcFppQW9kSGx3Wlc5bUlIQnliMk5sYzNNZ0lUMDlJQ2QxYm1SbFptbHVaV1FuSUNZbUlIdDlMblJ2VTNSeWFXNW5MbU5oYkd3b2NISnZZMlZ6Y3lrZ1BUMDlJQ2RiYjJKcVpXTjBJSEJ5YjJObGMzTmRKeWtnZTF4dUlDQWdJSE5qYUdWa2RXeGxSbXgxYzJnZ1BTQjFjMlZPWlhoMFZHbGpheWdwTzF4dUlDQjlJR1ZzYzJVZ2FXWWdLRUp5YjNkelpYSk5kWFJoZEdsdmJrOWljMlZ5ZG1WeUtTQjdYRzRnSUNBZ2MyTm9aV1IxYkdWR2JIVnphQ0E5SUhWelpVMTFkR0YwYVc5dVQySnpaWEoyWlhJb0tUdGNiaUFnZlNCbGJITmxJR2xtSUNocGMxZHZjbXRsY2lrZ2UxeHVJQ0FnSUhOamFHVmtkV3hsUm14MWMyZ2dQU0IxYzJWTlpYTnpZV2RsUTJoaGJtNWxiQ2dwTzF4dUlDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUhOamFHVmtkV3hsUm14MWMyZ2dQU0IxYzJWVFpYUlVhVzFsYjNWMEtDazdYRzRnSUgxY2JpQWdjbVYwZFhKdUlIdG5aWFFnWkdWbVlYVnNkQ2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUFrWDE5a1pXWmhkV3gwTzF4dUlDQWdJSDE5TzF4dWZTazdYRzVUZVhOMFpXMHVjbVZuYVhOMFpYSk5iMlIxYkdVb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OVFjbTl0YVhObExtcHpYQ0lzSUZ0ZExDQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ1hDSjFjMlVnYzNSeWFXTjBYQ0k3WEc0Z0lIWmhjaUJmWDIxdlpIVnNaVTVoYldVZ1BTQmNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMMUJ5YjIxcGMyVXVhbk5jSWp0Y2JpQWdkbUZ5SUdGemVXNWpJRDBnVTNsemRHVnRMbWRsZENoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2Ym05a1pWOXRiMlIxYkdWekwzSnpkbkF2YkdsaUwzSnpkbkF2WVhOaGNDNXFjMXdpS1M1a1pXWmhkV3gwTzF4dUlDQjJZWElnY21WbmFYTjBaWEpRYjJ4NVptbHNiQ0E5SUZONWMzUmxiUzVuWlhRb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OTFkR2xzY3k1cWMxd2lLUzV5WldkcGMzUmxjbEJ2YkhsbWFXeHNPMXh1SUNCMllYSWdjSEp2YldselpWSmhkeUE5SUh0OU8xeHVJQ0JtZFc1amRHbHZiaUJwYzFCeWIyMXBjMlVvZUNrZ2UxeHVJQ0FnSUhKbGRIVnliaUI0SUNZbUlIUjVjR1Z2WmlCNElEMDlQU0FuYjJKcVpXTjBKeUFtSmlCNExuTjBZWFIxYzE4Z0lUMDlJSFZ1WkdWbWFXNWxaRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJwWkZKbGMyOXNkbVZJWVc1a2JHVnlLSGdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdlRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJwWkZKbGFtVmpkRWhoYm1Sc1pYSW9lQ2tnZTF4dUlDQWdJSFJvY205M0lIZzdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdZMmhoYVc0b2NISnZiV2x6WlNrZ2UxeHVJQ0FnSUhaaGNpQnZibEpsYzI5c2RtVWdQU0JoY21kMWJXVnVkSE5iTVYwZ0lUMDlJQ2gyYjJsa0lEQXBJRDhnWVhKbmRXMWxiblJ6V3pGZElEb2dhV1JTWlhOdmJIWmxTR0Z1Wkd4bGNqdGNiaUFnSUNCMllYSWdiMjVTWldwbFkzUWdQU0JoY21kMWJXVnVkSE5iTWwwZ0lUMDlJQ2gyYjJsa0lEQXBJRDhnWVhKbmRXMWxiblJ6V3pKZElEb2dhV1JTWldwbFkzUklZVzVrYkdWeU8xeHVJQ0FnSUhaaGNpQmtaV1psY25KbFpDQTlJR2RsZEVSbFptVnljbVZrS0hCeWIyMXBjMlV1WTI5dWMzUnlkV04wYjNJcE8xeHVJQ0FnSUhOM2FYUmphQ0FvY0hKdmJXbHpaUzV6ZEdGMGRYTmZLU0I3WEc0Z0lDQWdJQ0JqWVhObElIVnVaR1ZtYVc1bFpEcGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ1ZIbHdaVVZ5Y205eU8xeHVJQ0FnSUNBZ1kyRnpaU0F3T2x4dUlDQWdJQ0FnSUNCd2NtOXRhWE5sTG05dVVtVnpiMngyWlY4dWNIVnphQ2h2YmxKbGMyOXNkbVVzSUdSbFptVnljbVZrS1R0Y2JpQWdJQ0FnSUNBZ2NISnZiV2x6WlM1dmJsSmxhbVZqZEY4dWNIVnphQ2h2YmxKbGFtVmpkQ3dnWkdWbVpYSnlaV1FwTzF4dUlDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJR05oYzJVZ0t6RTZYRzRnSUNBZ0lDQWdJSEJ5YjIxcGMyVkZibkYxWlhWbEtIQnliMjFwYzJVdWRtRnNkV1ZmTENCYmIyNVNaWE52YkhabExDQmtaV1psY25KbFpGMHBPMXh1SUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lHTmhjMlVnTFRFNlhHNGdJQ0FnSUNBZ0lIQnliMjFwYzJWRmJuRjFaWFZsS0hCeWIyMXBjMlV1ZG1Gc2RXVmZMQ0JiYjI1U1pXcGxZM1FzSUdSbFptVnljbVZrWFNrN1hHNGdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1pHVm1aWEp5WldRdWNISnZiV2x6WlR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCblpYUkVaV1psY25KbFpDaERLU0I3WEc0Z0lDQWdhV1lnS0hSb2FYTWdQVDA5SUNSUWNtOXRhWE5sS1NCN1hHNGdJQ0FnSUNCMllYSWdjSEp2YldselpTQTlJSEJ5YjIxcGMyVkpibWwwS0c1bGR5QWtVSEp2YldselpTaHdjbTl0YVhObFVtRjNLU2s3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdlMXh1SUNBZ0lDQWdJQ0J3Y205dGFYTmxPaUJ3Y205dGFYTmxMRnh1SUNBZ0lDQWdJQ0J5WlhOdmJIWmxPaUFvWm5WdVkzUnBiMjRvZUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEJ5YjIxcGMyVlNaWE52YkhabEtIQnliMjFwYzJVc0lIZ3BPMXh1SUNBZ0lDQWdJQ0I5S1N4Y2JpQWdJQ0FnSUNBZ2NtVnFaV04wT2lBb1puVnVZM1JwYjI0b2Npa2dlMXh1SUNBZ0lDQWdJQ0FnSUhCeWIyMXBjMlZTWldwbFkzUW9jSEp2YldselpTd2djaWs3WEc0Z0lDQWdJQ0FnSUgwcFhHNGdJQ0FnSUNCOU8xeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0IyWVhJZ2NtVnpkV3gwSUQwZ2UzMDdYRzRnSUNBZ0lDQnlaWE4xYkhRdWNISnZiV2x6WlNBOUlHNWxkeUJES0NobWRXNWpkR2x2YmloeVpYTnZiSFpsTENCeVpXcGxZM1FwSUh0Y2JpQWdJQ0FnSUNBZ2NtVnpkV3gwTG5KbGMyOXNkbVVnUFNCeVpYTnZiSFpsTzF4dUlDQWdJQ0FnSUNCeVpYTjFiSFF1Y21WcVpXTjBJRDBnY21WcVpXTjBPMXh1SUNBZ0lDQWdmU2twTzF4dUlDQWdJQ0FnY21WMGRYSnVJSEpsYzNWc2REdGNiaUFnSUNCOVhHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NISnZiV2x6WlZObGRDaHdjbTl0YVhObExDQnpkR0YwZFhNc0lIWmhiSFZsTENCdmJsSmxjMjlzZG1Vc0lHOXVVbVZxWldOMEtTQjdYRzRnSUNBZ2NISnZiV2x6WlM1emRHRjBkWE5mSUQwZ2MzUmhkSFZ6TzF4dUlDQWdJSEJ5YjIxcGMyVXVkbUZzZFdWZklEMGdkbUZzZFdVN1hHNGdJQ0FnY0hKdmJXbHpaUzV2YmxKbGMyOXNkbVZmSUQwZ2IyNVNaWE52YkhabE8xeHVJQ0FnSUhCeWIyMXBjMlV1YjI1U1pXcGxZM1JmSUQwZ2IyNVNaV3BsWTNRN1hHNGdJQ0FnY21WMGRYSnVJSEJ5YjIxcGMyVTdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjSEp2YldselpVbHVhWFFvY0hKdmJXbHpaU2tnZTF4dUlDQWdJSEpsZEhWeWJpQndjbTl0YVhObFUyVjBLSEJ5YjIxcGMyVXNJREFzSUhWdVpHVm1hVzVsWkN3Z1cxMHNJRnRkS1R0Y2JpQWdmVnh1SUNCMllYSWdVSEp2YldselpTQTlJR1oxYm1OMGFXOXVJRkJ5YjIxcGMyVW9jbVZ6YjJ4MlpYSXBJSHRjYmlBZ0lDQnBaaUFvY21WemIyeDJaWElnUFQwOUlIQnliMjFwYzJWU1lYY3BYRzRnSUNBZ0lDQnlaWFIxY200N1hHNGdJQ0FnYVdZZ0tIUjVjR1Z2WmlCeVpYTnZiSFpsY2lBaFBUMGdKMloxYm1OMGFXOXVKeWxjYmlBZ0lDQWdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0k3WEc0Z0lDQWdkbUZ5SUhCeWIyMXBjMlVnUFNCd2NtOXRhWE5sU1c1cGRDaDBhR2x6S1R0Y2JpQWdJQ0IwY25rZ2UxeHVJQ0FnSUNBZ2NtVnpiMngyWlhJb0tHWjFibU4wYVc5dUtIZ3BJSHRjYmlBZ0lDQWdJQ0FnY0hKdmJXbHpaVkpsYzI5c2RtVW9jSEp2YldselpTd2dlQ2s3WEc0Z0lDQWdJQ0I5S1N3Z0tHWjFibU4wYVc5dUtISXBJSHRjYmlBZ0lDQWdJQ0FnY0hKdmJXbHpaVkpsYW1WamRDaHdjbTl0YVhObExDQnlLVHRjYmlBZ0lDQWdJSDBwS1R0Y2JpQWdJQ0I5SUdOaGRHTm9JQ2hsS1NCN1hHNGdJQ0FnSUNCd2NtOXRhWE5sVW1WcVpXTjBLSEJ5YjIxcGMyVXNJR1VwTzF4dUlDQWdJSDFjYmlBZ2ZUdGNiaUFnS0NSMGNtRmpaWFZ5VW5WdWRHbHRaUzVqY21WaGRHVkRiR0Z6Y3lrb1VISnZiV2x6WlN3Z2UxeHVJQ0FnSUdOaGRHTm9PaUJtZFc1amRHbHZiaWh2YmxKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSFJvYVhNdWRHaGxiaWgxYm1SbFptbHVaV1FzSUc5dVVtVnFaV04wS1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSFJvWlc0NklHWjFibU4wYVc5dUtHOXVVbVZ6YjJ4MlpTd2diMjVTWldwbFkzUXBJSHRjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYjI1U1pYTnZiSFpsSUNFOVBTQW5ablZ1WTNScGIyNG5LVnh1SUNBZ0lDQWdJQ0J2YmxKbGMyOXNkbVVnUFNCcFpGSmxjMjlzZG1WSVlXNWtiR1Z5TzF4dUlDQWdJQ0FnYVdZZ0tIUjVjR1Z2WmlCdmJsSmxhbVZqZENBaFBUMGdKMloxYm1OMGFXOXVKeWxjYmlBZ0lDQWdJQ0FnYjI1U1pXcGxZM1FnUFNCcFpGSmxhbVZqZEVoaGJtUnNaWEk3WEc0Z0lDQWdJQ0IyWVhJZ2RHaGhkQ0E5SUhSb2FYTTdYRzRnSUNBZ0lDQjJZWElnWTI5dWMzUnlkV04wYjNJZ1BTQjBhR2x6TG1OdmJuTjBjblZqZEc5eU8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUdOb1lXbHVLSFJvYVhNc0lHWjFibU4wYVc5dUtIZ3BJSHRjYmlBZ0lDQWdJQ0FnZUNBOUlIQnliMjFwYzJWRGIyVnlZMlVvWTI5dWMzUnlkV04wYjNJc0lIZ3BPMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdlQ0E5UFQwZ2RHaGhkQ0EvSUc5dVVtVnFaV04wS0c1bGR5QlVlWEJsUlhKeWIzSXBJRG9nYVhOUWNtOXRhWE5sS0hncElEOGdlQzUwYUdWdUtHOXVVbVZ6YjJ4MlpTd2diMjVTWldwbFkzUXBJRG9nYjI1U1pYTnZiSFpsS0hncE8xeHVJQ0FnSUNBZ2ZTd2diMjVTWldwbFkzUXBPMXh1SUNBZ0lIMWNiaUFnZlN3Z2UxeHVJQ0FnSUhKbGMyOXNkbVU2SUdaMWJtTjBhVzl1S0hncElIdGNiaUFnSUNBZ0lHbG1JQ2gwYUdseklEMDlQU0FrVUhKdmJXbHpaU2tnZTF4dUlDQWdJQ0FnSUNCcFppQW9hWE5RY205dGFYTmxLSGdwS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlIZzdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSEJ5YjIxcGMyVlRaWFFvYm1WM0lDUlFjbTl0YVhObEtIQnliMjFwYzJWU1lYY3BMQ0FyTVN3Z2VDazdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2JtVjNJSFJvYVhNb1puVnVZM1JwYjI0b2NtVnpiMngyWlN3Z2NtVnFaV04wS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVZ6YjJ4MlpTaDRLVHRjYmlBZ0lDQWdJQ0FnZlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JpQWdJQ0J5WldwbFkzUTZJR1oxYm1OMGFXOXVLSElwSUh0Y2JpQWdJQ0FnSUdsbUlDaDBhR2x6SUQwOVBTQWtVSEp2YldselpTa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjSEp2YldselpWTmxkQ2h1WlhjZ0pGQnliMjFwYzJVb2NISnZiV2x6WlZKaGR5a3NJQzB4TENCeUtUdGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCdVpYY2dkR2hwY3lnb1puVnVZM1JwYjI0b2NtVnpiMngyWlN3Z2NtVnFaV04wS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVZxWldOMEtISXBPMXh1SUNBZ0lDQWdJQ0I5S1NrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JpQWdJQ0JoYkd3NklHWjFibU4wYVc5dUtIWmhiSFZsY3lrZ2UxeHVJQ0FnSUNBZ2RtRnlJR1JsWm1WeWNtVmtJRDBnWjJWMFJHVm1aWEp5WldRb2RHaHBjeWs3WEc0Z0lDQWdJQ0IyWVhJZ2NtVnpiMngxZEdsdmJuTWdQU0JiWFR0Y2JpQWdJQ0FnSUhSeWVTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCamIzVnVkQ0E5SUhaaGJIVmxjeTVzWlc1bmRHZzdYRzRnSUNBZ0lDQWdJR2xtSUNoamIzVnVkQ0E5UFQwZ01Da2dlMXh1SUNBZ0lDQWdJQ0FnSUdSbFptVnljbVZrTG5KbGMyOXNkbVVvY21WemIyeDFkR2x2Ym5NcE8xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnZG1Gc2RXVnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IwYUdsekxuSmxjMjlzZG1Vb2RtRnNkV1Z6VzJsZEtTNTBhR1Z1S0daMWJtTjBhVzl1S0drc0lIZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVZ6YjJ4MWRHbHZibk5iYVYwZ1BTQjRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnBaaUFvTFMxamIzVnVkQ0E5UFQwZ01DbGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0lDQmtaV1psY25KbFpDNXlaWE52YkhabEtISmxjMjlzZFhScGIyNXpLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHVZbWx1WkNoMWJtUmxabWx1WldRc0lHa3BMQ0FvWm5WdVkzUnBiMjRvY2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCa1pXWmxjbkpsWkM1eVpXcGxZM1FvY2lrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0I5S1NrN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5SUdOaGRHTm9JQ2hsS1NCN1hHNGdJQ0FnSUNBZ0lHUmxabVZ5Y21Wa0xuSmxhbVZqZENobEtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lISmxkSFZ5YmlCa1pXWmxjbkpsWkM1d2NtOXRhWE5sTzF4dUlDQWdJSDBzWEc0Z0lDQWdjbUZqWlRvZ1puVnVZM1JwYjI0b2RtRnNkV1Z6S1NCN1hHNGdJQ0FnSUNCMllYSWdaR1ZtWlhKeVpXUWdQU0JuWlhSRVpXWmxjbkpsWkNoMGFHbHpLVHRjYmlBZ0lDQWdJSFJ5ZVNCN1hHNGdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dkbUZzZFdWekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2RHaHBjeTV5WlhOdmJIWmxLSFpoYkhWbGMxdHBYU2t1ZEdobGJpZ29ablZ1WTNScGIyNG9lQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaR1ZtWlhKeVpXUXVjbVZ6YjJ4MlpTaDRLVHRjYmlBZ0lDQWdJQ0FnSUNCOUtTd2dLR1oxYm1OMGFXOXVLSElwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1JsWm1WeWNtVmtMbkpsYW1WamRDaHlLVHRjYmlBZ0lDQWdJQ0FnSUNCOUtTazdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDBnWTJGMFkyZ2dLR1VwSUh0Y2JpQWdJQ0FnSUNBZ1pHVm1aWEp5WldRdWNtVnFaV04wS0dVcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2NtVjBkWEp1SUdSbFptVnljbVZrTG5CeWIyMXBjMlU3WEc0Z0lDQWdmVnh1SUNCOUtUdGNiaUFnZG1GeUlDUlFjbTl0YVhObElEMGdVSEp2YldselpUdGNiaUFnZG1GeUlDUlFjbTl0YVhObFVtVnFaV04wSUQwZ0pGQnliMjFwYzJVdWNtVnFaV04wTzF4dUlDQm1kVzVqZEdsdmJpQndjbTl0YVhObFVtVnpiMngyWlNod2NtOXRhWE5sTENCNEtTQjdYRzRnSUNBZ2NISnZiV2x6WlVSdmJtVW9jSEp2YldselpTd2dLekVzSUhnc0lIQnliMjFwYzJVdWIyNVNaWE52YkhabFh5azdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjSEp2YldselpWSmxhbVZqZENod2NtOXRhWE5sTENCeUtTQjdYRzRnSUNBZ2NISnZiV2x6WlVSdmJtVW9jSEp2YldselpTd2dMVEVzSUhJc0lIQnliMjFwYzJVdWIyNVNaV3BsWTNSZktUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQndjbTl0YVhObFJHOXVaU2h3Y205dGFYTmxMQ0J6ZEdGMGRYTXNJSFpoYkhWbExDQnlaV0ZqZEdsdmJuTXBJSHRjYmlBZ0lDQnBaaUFvY0hKdmJXbHpaUzV6ZEdGMGRYTmZJQ0U5UFNBd0tWeHVJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJSEJ5YjIxcGMyVkZibkYxWlhWbEtIWmhiSFZsTENCeVpXRmpkR2x2Ym5NcE8xeHVJQ0FnSUhCeWIyMXBjMlZUWlhRb2NISnZiV2x6WlN3Z2MzUmhkSFZ6TENCMllXeDFaU2s3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY0hKdmJXbHpaVVZ1Y1hWbGRXVW9kbUZzZFdVc0lIUmhjMnR6S1NCN1hHNGdJQ0FnWVhONWJtTW9LR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCMFlYTnJjeTVzWlc1bmRHZzdJR2tnS3owZ01pa2dlMXh1SUNBZ0lDQWdJQ0J3Y205dGFYTmxTR0Z1Wkd4bEtIWmhiSFZsTENCMFlYTnJjMXRwWFN3Z2RHRnphM05iYVNBcklERmRLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlLU2s3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY0hKdmJXbHpaVWhoYm1Sc1pTaDJZV3gxWlN3Z2FHRnVaR3hsY2l3Z1pHVm1aWEp5WldRcElIdGNiaUFnSUNCMGNua2dlMXh1SUNBZ0lDQWdkbUZ5SUhKbGMzVnNkQ0E5SUdoaGJtUnNaWElvZG1Gc2RXVXBPMXh1SUNBZ0lDQWdhV1lnS0hKbGMzVnNkQ0E5UFQwZ1pHVm1aWEp5WldRdWNISnZiV2x6WlNsY2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNqdGNiaUFnSUNBZ0lHVnNjMlVnYVdZZ0tHbHpVSEp2YldselpTaHlaWE4xYkhRcEtWeHVJQ0FnSUNBZ0lDQmphR0ZwYmloeVpYTjFiSFFzSUdSbFptVnljbVZrTG5KbGMyOXNkbVVzSUdSbFptVnljbVZrTG5KbGFtVmpkQ2s3WEc0Z0lDQWdJQ0JsYkhObFhHNGdJQ0FnSUNBZ0lHUmxabVZ5Y21Wa0xuSmxjMjlzZG1Vb2NtVnpkV3gwS1R0Y2JpQWdJQ0I5SUdOaGRHTm9JQ2hsS1NCN1hHNGdJQ0FnSUNCMGNua2dlMXh1SUNBZ0lDQWdJQ0JrWldabGNuSmxaQzV5WldwbFkzUW9aU2s3WEc0Z0lDQWdJQ0I5SUdOaGRHTm9JQ2hsS1NCN2ZWeHVJQ0FnSUgxY2JpQWdmVnh1SUNCMllYSWdkR2hsYm1GaWJHVlRlVzFpYjJ3Z1BTQW5RRUIwYUdWdVlXSnNaU2M3WEc0Z0lHWjFibU4wYVc5dUlHbHpUMkpxWldOMEtIZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z2VDQW1KaUFvZEhsd1pXOW1JSGdnUFQwOUlDZHZZbXBsWTNRbklIeDhJSFI1Y0dWdlppQjRJRDA5UFNBblpuVnVZM1JwYjI0bktUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQndjbTl0YVhObFEyOWxjbU5sS0dOdmJuTjBjblZqZEc5eUxDQjRLU0I3WEc0Z0lDQWdhV1lnS0NGcGMxQnliMjFwYzJVb2VDa2dKaVlnYVhOUFltcGxZM1FvZUNrcElIdGNiaUFnSUNBZ0lIWmhjaUIwYUdWdU8xeHVJQ0FnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnZEdobGJpQTlJSGd1ZEdobGJqdGNiaUFnSUNBZ0lIMGdZMkYwWTJnZ0tISXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlIQnliMjFwYzJVZ1BTQWtVSEp2YldselpWSmxhbVZqZEM1allXeHNLR052Ym5OMGNuVmpkRzl5TENCeUtUdGNiaUFnSUNBZ0lDQWdlRnQwYUdWdVlXSnNaVk41YldKdmJGMGdQU0J3Y205dGFYTmxPMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjSEp2YldselpUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdkR2hsYmlBOVBUMGdKMloxYm1OMGFXOXVKeWtnZTF4dUlDQWdJQ0FnSUNCMllYSWdjQ0E5SUhoYmRHaGxibUZpYkdWVGVXMWliMnhkTzF4dUlDQWdJQ0FnSUNCcFppQW9jQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCd08xeHVJQ0FnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQWdJSFpoY2lCa1pXWmxjbkpsWkNBOUlHZGxkRVJsWm1WeWNtVmtLR052Ym5OMGNuVmpkRzl5S1R0Y2JpQWdJQ0FnSUNBZ0lDQjRXM1JvWlc1aFlteGxVM2x0WW05c1hTQTlJR1JsWm1WeWNtVmtMbkJ5YjIxcGMyVTdYRzRnSUNBZ0lDQWdJQ0FnZEhKNUlIdGNiaUFnSUNBZ0lDQWdJQ0FnSUhSb1pXNHVZMkZzYkNoNExDQmtaV1psY25KbFpDNXlaWE52YkhabExDQmtaV1psY25KbFpDNXlaV3BsWTNRcE8xeHVJQ0FnSUNBZ0lDQWdJSDBnWTJGMFkyZ2dLSElwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1JsWm1WeWNtVmtMbkpsYW1WamRDaHlLVHRjYmlBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlHUmxabVZ5Y21Wa0xuQnliMjFwYzJVN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSGc3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY0c5c2VXWnBiR3hRY205dGFYTmxLR2RzYjJKaGJDa2dlMXh1SUNBZ0lHbG1JQ2doWjJ4dlltRnNMbEJ5YjIxcGMyVXBYRzRnSUNBZ0lDQm5iRzlpWVd3dVVISnZiV2x6WlNBOUlGQnliMjFwYzJVN1hHNGdJSDFjYmlBZ2NtVm5hWE4wWlhKUWIyeDVabWxzYkNod2IyeDVabWxzYkZCeWIyMXBjMlVwTzF4dUlDQnlaWFIxY200Z2UxeHVJQ0FnSUdkbGRDQlFjbTl0YVhObEtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlGQnliMjFwYzJVN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2NHOXNlV1pwYkd4UWNtOXRhWE5sS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhCdmJIbG1hV3hzVUhKdmJXbHpaVHRjYmlBZ0lDQjlYRzRnSUgwN1hHNTlLVHRjYmxONWMzUmxiUzVuWlhRb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OVFjbTl0YVhObExtcHpYQ0lnS3lBbkp5azdYRzVUZVhOMFpXMHVjbVZuYVhOMFpYSk5iMlIxYkdVb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OVRkSEpwYm1kSmRHVnlZWFJ2Y2k1cWMxd2lMQ0JiWFN3Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUZ3aWRYTmxJSE4wY21samRGd2lPMXh1SUNCMllYSWdKRjlmTWp0Y2JpQWdkbUZ5SUY5ZmJXOWtkV3hsVG1GdFpTQTlJRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12VTNSeWFXNW5TWFJsY21GMGIzSXVhbk5jSWp0Y2JpQWdkbUZ5SUNSZlh6QWdQU0JUZVhOMFpXMHVaMlYwS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdmRYUnBiSE11YW5OY0lpa3NYRzRnSUNBZ0lDQmpjbVZoZEdWSmRHVnlZWFJ2Y2xKbGMzVnNkRTlpYW1WamRDQTlJQ1JmWHpBdVkzSmxZWFJsU1hSbGNtRjBiM0pTWlhOMWJIUlBZbXBsWTNRc1hHNGdJQ0FnSUNCcGMwOWlhbVZqZENBOUlDUmZYekF1YVhOUFltcGxZM1E3WEc0Z0lIWmhjaUIwYjFCeWIzQmxjblI1SUQwZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG5SdlVISnZjR1Z5ZEhrN1hHNGdJSFpoY2lCb1lYTlBkMjVRY205d1pYSjBlU0E5SUU5aWFtVmpkQzV3Y205MGIzUjVjR1V1YUdGelQzZHVVSEp2Y0dWeWRIazdYRzRnSUhaaGNpQnBkR1Z5WVhSbFpGTjBjbWx1WnlBOUlGTjViV0p2YkNnbmFYUmxjbUYwWldSVGRISnBibWNuS1R0Y2JpQWdkbUZ5SUhOMGNtbHVaMGwwWlhKaGRHOXlUbVY0ZEVsdVpHVjRJRDBnVTNsdFltOXNLQ2R6ZEhKcGJtZEpkR1Z5WVhSdmNrNWxlSFJKYm1SbGVDY3BPMXh1SUNCMllYSWdVM1J5YVc1blNYUmxjbUYwYjNJZ1BTQm1kVzVqZEdsdmJpQlRkSEpwYm1kSmRHVnlZWFJ2Y2lncElIdDlPMXh1SUNBb0pIUnlZV05sZFhKU2RXNTBhVzFsTG1OeVpXRjBaVU5zWVhOektTaFRkSEpwYm1kSmRHVnlZWFJ2Y2l3Z0tDUmZYeklnUFNCN2ZTd2dUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblI1S0NSZlh6SXNJRndpYm1WNGRGd2lMQ0I3WEc0Z0lDQWdkbUZzZFdVNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdkbUZ5SUc4Z1BTQjBhR2x6TzF4dUlDQWdJQ0FnYVdZZ0tDRnBjMDlpYW1WamRDaHZLU0I4ZkNBaGFHRnpUM2R1VUhKdmNHVnlkSGt1WTJGc2JDaHZMQ0JwZEdWeVlYUmxaRk4wY21sdVp5a3BJSHRjYmlBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnbmRHaHBjeUJ0ZFhOMElHSmxJR0VnVTNSeWFXNW5TWFJsY21GMGIzSWdiMkpxWldOMEp5azdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQjJZWElnY3lBOUlHOWJkRzlRY205d1pYSjBlU2hwZEdWeVlYUmxaRk4wY21sdVp5bGRPMXh1SUNBZ0lDQWdhV1lnS0hNZ1BUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWTNKbFlYUmxTWFJsY21GMGIzSlNaWE4xYkhSUFltcGxZM1FvZFc1a1pXWnBibVZrTENCMGNuVmxLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSFpoY2lCd2IzTnBkR2x2YmlBOUlHOWJkRzlRY205d1pYSjBlU2h6ZEhKcGJtZEpkR1Z5WVhSdmNrNWxlSFJKYm1SbGVDbGRPMXh1SUNBZ0lDQWdkbUZ5SUd4bGJpQTlJSE11YkdWdVozUm9PMXh1SUNBZ0lDQWdhV1lnS0hCdmMybDBhVzl1SUQ0OUlHeGxiaWtnZTF4dUlDQWdJQ0FnSUNCdlczUnZVSEp2Y0dWeWRIa29hWFJsY21GMFpXUlRkSEpwYm1jcFhTQTlJSFZ1WkdWbWFXNWxaRHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR055WldGMFpVbDBaWEpoZEc5eVVtVnpkV3gwVDJKcVpXTjBLSFZ1WkdWbWFXNWxaQ3dnZEhKMVpTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQjJZWElnWm1seWMzUWdQU0J6TG1Ob1lYSkRiMlJsUVhRb2NHOXphWFJwYjI0cE8xeHVJQ0FnSUNBZ2RtRnlJSEpsYzNWc2RGTjBjbWx1Wnp0Y2JpQWdJQ0FnSUdsbUlDaG1hWEp6ZENBOElEQjRSRGd3TUNCOGZDQm1hWEp6ZENBK0lEQjRSRUpHUmlCOGZDQndiM05wZEdsdmJpQXJJREVnUFQwOUlHeGxiaWtnZTF4dUlDQWdJQ0FnSUNCeVpYTjFiSFJUZEhKcGJtY2dQU0JUZEhKcGJtY3Vabkp2YlVOb1lYSkRiMlJsS0dacGNuTjBLVHRjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSFpoY2lCelpXTnZibVFnUFNCekxtTm9ZWEpEYjJSbFFYUW9jRzl6YVhScGIyNGdLeUF4S1R0Y2JpQWdJQ0FnSUNBZ2FXWWdLSE5sWTI5dVpDQThJREI0UkVNd01DQjhmQ0J6WldOdmJtUWdQaUF3ZUVSR1JrWXBJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYTjFiSFJUZEhKcGJtY2dQU0JUZEhKcGJtY3Vabkp2YlVOb1lYSkRiMlJsS0dacGNuTjBLVHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYTjFiSFJUZEhKcGJtY2dQU0JUZEhKcGJtY3Vabkp2YlVOb1lYSkRiMlJsS0dacGNuTjBLU0FySUZOMGNtbHVaeTVtY205dFEyaGhja052WkdVb2MyVmpiMjVrS1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2IxdDBiMUJ5YjNCbGNuUjVLSE4wY21sdVowbDBaWEpoZEc5eVRtVjRkRWx1WkdWNEtWMGdQU0J3YjNOcGRHbHZiaUFySUhKbGMzVnNkRk4wY21sdVp5NXNaVzVuZEdnN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWTNKbFlYUmxTWFJsY21GMGIzSlNaWE4xYkhSUFltcGxZM1FvY21WemRXeDBVM1J5YVc1bkxDQm1ZV3h6WlNrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JqYjI1bWFXZDFjbUZpYkdVNklIUnlkV1VzWEc0Z0lDQWdaVzUxYldWeVlXSnNaVG9nZEhKMVpTeGNiaUFnSUNCM2NtbDBZV0pzWlRvZ2RISjFaVnh1SUNCOUtTd2dUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblI1S0NSZlh6SXNJRk41YldKdmJDNXBkR1Z5WVhSdmNpd2dlMXh1SUNBZ0lIWmhiSFZsT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCMGFHbHpPMXh1SUNBZ0lIMHNYRzRnSUNBZ1kyOXVabWxuZFhKaFlteGxPaUIwY25WbExGeHVJQ0FnSUdWdWRXMWxjbUZpYkdVNklIUnlkV1VzWEc0Z0lDQWdkM0pwZEdGaWJHVTZJSFJ5ZFdWY2JpQWdmU2tzSUNSZlh6SXBMQ0I3ZlNrN1hHNGdJR1oxYm1OMGFXOXVJR055WldGMFpWTjBjbWx1WjBsMFpYSmhkRzl5S0hOMGNtbHVaeWtnZTF4dUlDQWdJSFpoY2lCeklEMGdVM1J5YVc1bktITjBjbWx1WnlrN1hHNGdJQ0FnZG1GeUlHbDBaWEpoZEc5eUlEMGdUMkpxWldOMExtTnlaV0YwWlNoVGRISnBibWRKZEdWeVlYUnZjaTV3Y205MGIzUjVjR1VwTzF4dUlDQWdJR2wwWlhKaGRHOXlXM1J2VUhKdmNHVnlkSGtvYVhSbGNtRjBaV1JUZEhKcGJtY3BYU0E5SUhNN1hHNGdJQ0FnYVhSbGNtRjBiM0piZEc5UWNtOXdaWEowZVNoemRISnBibWRKZEdWeVlYUnZjazVsZUhSSmJtUmxlQ2xkSUQwZ01EdGNiaUFnSUNCeVpYUjFjbTRnYVhSbGNtRjBiM0k3WEc0Z0lIMWNiaUFnY21WMGRYSnVJSHRuWlhRZ1kzSmxZWFJsVTNSeWFXNW5TWFJsY21GMGIzSW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdZM0psWVhSbFUzUnlhVzVuU1hSbGNtRjBiM0k3WEc0Z0lDQWdmWDA3WEc1OUtUdGNibE41YzNSbGJTNXlaV2RwYzNSbGNrMXZaSFZzWlNoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwxTjBjbWx1Wnk1cWMxd2lMQ0JiWFN3Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUZ3aWRYTmxJSE4wY21samRGd2lPMXh1SUNCMllYSWdYMTl0YjJSMWJHVk9ZVzFsSUQwZ1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OVRkSEpwYm1jdWFuTmNJanRjYmlBZ2RtRnlJR055WldGMFpWTjBjbWx1WjBsMFpYSmhkRzl5SUQwZ1UzbHpkR1Z0TG1kbGRDaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMMU4wY21sdVowbDBaWEpoZEc5eUxtcHpYQ0lwTG1OeVpXRjBaVk4wY21sdVowbDBaWEpoZEc5eU8xeHVJQ0IyWVhJZ0pGOWZNU0E5SUZONWMzUmxiUzVuWlhRb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OTFkR2xzY3k1cWMxd2lLU3hjYmlBZ0lDQWdJRzFoZVdKbFFXUmtSblZ1WTNScGIyNXpJRDBnSkY5Zk1TNXRZWGxpWlVGa1pFWjFibU4wYVc5dWN5eGNiaUFnSUNBZ0lHMWhlV0psUVdSa1NYUmxjbUYwYjNJZ1BTQWtYMTh4TG0xaGVXSmxRV1JrU1hSbGNtRjBiM0lzWEc0Z0lDQWdJQ0J5WldkcGMzUmxjbEJ2YkhsbWFXeHNJRDBnSkY5Zk1TNXlaV2RwYzNSbGNsQnZiSGxtYVd4c08xeHVJQ0IyWVhJZ0pIUnZVM1J5YVc1bklEMGdUMkpxWldOMExuQnliM1J2ZEhsd1pTNTBiMU4wY21sdVp6dGNiaUFnZG1GeUlDUnBibVJsZUU5bUlEMGdVM1J5YVc1bkxuQnliM1J2ZEhsd1pTNXBibVJsZUU5bU8xeHVJQ0IyWVhJZ0pHeGhjM1JKYm1SbGVFOW1JRDBnVTNSeWFXNW5MbkJ5YjNSdmRIbHdaUzVzWVhOMFNXNWtaWGhQWmp0Y2JpQWdablZ1WTNScGIyNGdjM1JoY25SelYybDBhQ2h6WldGeVkyZ3BJSHRjYmlBZ0lDQjJZWElnYzNSeWFXNW5JRDBnVTNSeWFXNW5LSFJvYVhNcE8xeHVJQ0FnSUdsbUlDaDBhR2x6SUQwOUlHNTFiR3dnZkh3Z0pIUnZVM1J5YVc1bkxtTmhiR3dvYzJWaGNtTm9LU0E5UFNBblcyOWlhbVZqZENCU1pXZEZlSEJkSnlrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnVkhsd1pVVnljbTl5S0NrN1hHNGdJQ0FnZlZ4dUlDQWdJSFpoY2lCemRISnBibWRNWlc1bmRHZ2dQU0J6ZEhKcGJtY3ViR1Z1WjNSb08xeHVJQ0FnSUhaaGNpQnpaV0Z5WTJoVGRISnBibWNnUFNCVGRISnBibWNvYzJWaGNtTm9LVHRjYmlBZ0lDQjJZWElnYzJWaGNtTm9UR1Z1WjNSb0lEMGdjMlZoY21Ob1UzUnlhVzVuTG14bGJtZDBhRHRjYmlBZ0lDQjJZWElnY0c5emFYUnBiMjRnUFNCaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvSUQ0Z01TQS9JR0Z5WjNWdFpXNTBjMXN4WFNBNklIVnVaR1ZtYVc1bFpEdGNiaUFnSUNCMllYSWdjRzl6SUQwZ2NHOXphWFJwYjI0Z1B5Qk9kVzFpWlhJb2NHOXphWFJwYjI0cElEb2dNRHRjYmlBZ0lDQnBaaUFvYVhOT1lVNG9jRzl6S1NrZ2UxeHVJQ0FnSUNBZ2NHOXpJRDBnTUR0Y2JpQWdJQ0I5WEc0Z0lDQWdkbUZ5SUhOMFlYSjBJRDBnVFdGMGFDNXRhVzRvVFdGMGFDNXRZWGdvY0c5ekxDQXdLU3dnYzNSeWFXNW5UR1Z1WjNSb0tUdGNiaUFnSUNCeVpYUjFjbTRnSkdsdVpHVjRUMll1WTJGc2JDaHpkSEpwYm1jc0lITmxZWEpqYUZOMGNtbHVaeXdnY0c5ektTQTlQU0J6ZEdGeWREdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQmxibVJ6VjJsMGFDaHpaV0Z5WTJncElIdGNiaUFnSUNCMllYSWdjM1J5YVc1bklEMGdVM1J5YVc1bktIUm9hWE1wTzF4dUlDQWdJR2xtSUNoMGFHbHpJRDA5SUc1MWJHd2dmSHdnSkhSdlUzUnlhVzVuTG1OaGJHd29jMlZoY21Ob0tTQTlQU0FuVzI5aWFtVmpkQ0JTWldkRmVIQmRKeWtnZTF4dUlDQWdJQ0FnZEdoeWIzY2dWSGx3WlVWeWNtOXlLQ2s3WEc0Z0lDQWdmVnh1SUNBZ0lIWmhjaUJ6ZEhKcGJtZE1aVzVuZEdnZ1BTQnpkSEpwYm1jdWJHVnVaM1JvTzF4dUlDQWdJSFpoY2lCelpXRnlZMmhUZEhKcGJtY2dQU0JUZEhKcGJtY29jMlZoY21Ob0tUdGNiaUFnSUNCMllYSWdjMlZoY21Ob1RHVnVaM1JvSUQwZ2MyVmhjbU5vVTNSeWFXNW5MbXhsYm1kMGFEdGNiaUFnSUNCMllYSWdjRzl6SUQwZ2MzUnlhVzVuVEdWdVozUm9PMXh1SUNBZ0lHbG1JQ2hoY21kMWJXVnVkSE11YkdWdVozUm9JRDRnTVNrZ2UxeHVJQ0FnSUNBZ2RtRnlJSEJ2YzJsMGFXOXVJRDBnWVhKbmRXMWxiblJ6V3pGZE8xeHVJQ0FnSUNBZ2FXWWdLSEJ2YzJsMGFXOXVJQ0U5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lDQWdjRzl6SUQwZ2NHOXphWFJwYjI0Z1B5Qk9kVzFpWlhJb2NHOXphWFJwYjI0cElEb2dNRHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHpUbUZPS0hCdmN5a3BJSHRjYmlBZ0lDQWdJQ0FnSUNCd2IzTWdQU0F3TzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dUlDQWdJSFpoY2lCbGJtUWdQU0JOWVhSb0xtMXBiaWhOWVhSb0xtMWhlQ2h3YjNNc0lEQXBMQ0J6ZEhKcGJtZE1aVzVuZEdncE8xeHVJQ0FnSUhaaGNpQnpkR0Z5ZENBOUlHVnVaQ0F0SUhObFlYSmphRXhsYm1kMGFEdGNiaUFnSUNCcFppQW9jM1JoY25RZ1BDQXdLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQWtiR0Z6ZEVsdVpHVjRUMll1WTJGc2JDaHpkSEpwYm1jc0lITmxZWEpqYUZOMGNtbHVaeXdnYzNSaGNuUXBJRDA5SUhOMFlYSjBPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR2x1WTJ4MVpHVnpLSE5sWVhKamFDa2dlMXh1SUNBZ0lHbG1JQ2gwYUdseklEMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lIUm9jbTkzSUZSNWNHVkZjbkp2Y2lncE8xeHVJQ0FnSUgxY2JpQWdJQ0IyWVhJZ2MzUnlhVzVuSUQwZ1UzUnlhVzVuS0hSb2FYTXBPMXh1SUNBZ0lHbG1JQ2h6WldGeVkyZ2dKaVlnSkhSdlUzUnlhVzVuTG1OaGJHd29jMlZoY21Ob0tTQTlQU0FuVzI5aWFtVmpkQ0JTWldkRmVIQmRKeWtnZTF4dUlDQWdJQ0FnZEdoeWIzY2dWSGx3WlVWeWNtOXlLQ2s3WEc0Z0lDQWdmVnh1SUNBZ0lIWmhjaUJ6ZEhKcGJtZE1aVzVuZEdnZ1BTQnpkSEpwYm1jdWJHVnVaM1JvTzF4dUlDQWdJSFpoY2lCelpXRnlZMmhUZEhKcGJtY2dQU0JUZEhKcGJtY29jMlZoY21Ob0tUdGNiaUFnSUNCMllYSWdjMlZoY21Ob1RHVnVaM1JvSUQwZ2MyVmhjbU5vVTNSeWFXNW5MbXhsYm1kMGFEdGNiaUFnSUNCMllYSWdjRzl6YVhScGIyNGdQU0JoY21kMWJXVnVkSE11YkdWdVozUm9JRDRnTVNBL0lHRnlaM1Z0Wlc1MGMxc3hYU0E2SUhWdVpHVm1hVzVsWkR0Y2JpQWdJQ0IyWVhJZ2NHOXpJRDBnY0c5emFYUnBiMjRnUHlCT2RXMWlaWElvY0c5emFYUnBiMjRwSURvZ01EdGNiaUFnSUNCcFppQW9jRzl6SUNFOUlIQnZjeWtnZTF4dUlDQWdJQ0FnY0c5eklEMGdNRHRjYmlBZ0lDQjlYRzRnSUNBZ2RtRnlJSE4wWVhKMElEMGdUV0YwYUM1dGFXNG9UV0YwYUM1dFlYZ29jRzl6TENBd0tTd2djM1J5YVc1blRHVnVaM1JvS1R0Y2JpQWdJQ0JwWmlBb2MyVmhjbU5vVEdWdVozUm9JQ3NnYzNSaGNuUWdQaUJ6ZEhKcGJtZE1aVzVuZEdncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbVlXeHpaVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUNScGJtUmxlRTltTG1OaGJHd29jM1J5YVc1bkxDQnpaV0Z5WTJoVGRISnBibWNzSUhCdmN5a2dJVDBnTFRFN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NtVndaV0YwS0dOdmRXNTBLU0I3WEc0Z0lDQWdhV1lnS0hSb2FYTWdQVDBnYm5Wc2JDa2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ1ZIbHdaVVZ5Y205eUtDazdYRzRnSUNBZ2ZWeHVJQ0FnSUhaaGNpQnpkSEpwYm1jZ1BTQlRkSEpwYm1jb2RHaHBjeWs3WEc0Z0lDQWdkbUZ5SUc0Z1BTQmpiM1Z1ZENBL0lFNTFiV0psY2loamIzVnVkQ2tnT2lBd08xeHVJQ0FnSUdsbUlDaHBjMDVoVGlodUtTa2dlMXh1SUNBZ0lDQWdiaUE5SURBN1hHNGdJQ0FnZlZ4dUlDQWdJR2xtSUNodUlEd2dNQ0I4ZkNCdUlEMDlJRWx1Wm1sdWFYUjVLU0I3WEc0Z0lDQWdJQ0IwYUhKdmR5QlNZVzVuWlVWeWNtOXlLQ2s3WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2h1SUQwOUlEQXBJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQW5KenRjYmlBZ0lDQjlYRzRnSUNBZ2RtRnlJSEpsYzNWc2RDQTlJQ2NuTzF4dUlDQWdJSGRvYVd4bElDaHVMUzBwSUh0Y2JpQWdJQ0FnSUhKbGMzVnNkQ0FyUFNCemRISnBibWM3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCeVpYTjFiSFE3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWTI5a1pWQnZhVzUwUVhRb2NHOXphWFJwYjI0cElIdGNiaUFnSUNCcFppQW9kR2hwY3lBOVBTQnVkV3hzS1NCN1hHNGdJQ0FnSUNCMGFISnZkeUJVZVhCbFJYSnliM0lvS1R0Y2JpQWdJQ0I5WEc0Z0lDQWdkbUZ5SUhOMGNtbHVaeUE5SUZOMGNtbHVaeWgwYUdsektUdGNiaUFnSUNCMllYSWdjMmw2WlNBOUlITjBjbWx1Wnk1c1pXNW5kR2c3WEc0Z0lDQWdkbUZ5SUdsdVpHVjRJRDBnY0c5emFYUnBiMjRnUHlCT2RXMWlaWElvY0c5emFYUnBiMjRwSURvZ01EdGNiaUFnSUNCcFppQW9hWE5PWVU0b2FXNWtaWGdwS1NCN1hHNGdJQ0FnSUNCcGJtUmxlQ0E5SURBN1hHNGdJQ0FnZlZ4dUlDQWdJR2xtSUNocGJtUmxlQ0E4SURBZ2ZId2dhVzVrWlhnZ1BqMGdjMmw2WlNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhWdVpHVm1hVzVsWkR0Y2JpQWdJQ0I5WEc0Z0lDQWdkbUZ5SUdacGNuTjBJRDBnYzNSeWFXNW5MbU5vWVhKRGIyUmxRWFFvYVc1a1pYZ3BPMXh1SUNBZ0lIWmhjaUJ6WldOdmJtUTdYRzRnSUNBZ2FXWWdLR1pwY25OMElENDlJREI0UkRnd01DQW1KaUJtYVhKemRDQThQU0F3ZUVSQ1JrWWdKaVlnYzJsNlpTQStJR2x1WkdWNElDc2dNU2tnZTF4dUlDQWdJQ0FnYzJWamIyNWtJRDBnYzNSeWFXNW5MbU5vWVhKRGIyUmxRWFFvYVc1a1pYZ2dLeUF4S1R0Y2JpQWdJQ0FnSUdsbUlDaHpaV052Ym1RZ1BqMGdNSGhFUXpBd0lDWW1JSE5sWTI5dVpDQThQU0F3ZUVSR1JrWXBJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJQ2htYVhKemRDQXRJREI0UkRnd01Da2dLaUF3ZURRd01DQXJJSE5sWTI5dVpDQXRJREI0UkVNd01DQXJJREI0TVRBd01EQTdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJtYVhKemREdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnlZWGNvWTJGc2JITnBkR1VwSUh0Y2JpQWdJQ0IyWVhJZ2NtRjNJRDBnWTJGc2JITnBkR1V1Y21GM08xeHVJQ0FnSUhaaGNpQnNaVzRnUFNCeVlYY3ViR1Z1WjNSb0lENCtQaUF3TzF4dUlDQWdJR2xtSUNoc1pXNGdQVDA5SURBcFhHNGdJQ0FnSUNCeVpYUjFjbTRnSnljN1hHNGdJQ0FnZG1GeUlITWdQU0FuSnp0Y2JpQWdJQ0IyWVhJZ2FTQTlJREE3WEc0Z0lDQWdkMmhwYkdVZ0tIUnlkV1VwSUh0Y2JpQWdJQ0FnSUhNZ0t6MGdjbUYzVzJsZE8xeHVJQ0FnSUNBZ2FXWWdLR2tnS3lBeElEMDlQU0JzWlc0cFhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlCek8xeHVJQ0FnSUNBZ2N5QXJQU0JoY21kMWJXVnVkSE5iS3l0cFhUdGNiaUFnSUNCOVhHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1puSnZiVU52WkdWUWIybHVkQ2dwSUh0Y2JpQWdJQ0IyWVhJZ1kyOWtaVlZ1YVhSeklEMGdXMTA3WEc0Z0lDQWdkbUZ5SUdac2IyOXlJRDBnVFdGMGFDNW1iRzl2Y2p0Y2JpQWdJQ0IyWVhJZ2FHbG5hRk4xY25KdloyRjBaVHRjYmlBZ0lDQjJZWElnYkc5M1UzVnljbTluWVhSbE8xeHVJQ0FnSUhaaGNpQnBibVJsZUNBOUlDMHhPMXh1SUNBZ0lIWmhjaUJzWlc1bmRHZ2dQU0JoY21kMWJXVnVkSE11YkdWdVozUm9PMXh1SUNBZ0lHbG1JQ2doYkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdKeWM3WEc0Z0lDQWdmVnh1SUNBZ0lIZG9hV3hsSUNncksybHVaR1Y0SUR3Z2JHVnVaM1JvS1NCN1hHNGdJQ0FnSUNCMllYSWdZMjlrWlZCdmFXNTBJRDBnVG5WdFltVnlLR0Z5WjNWdFpXNTBjMXRwYm1SbGVGMHBPMXh1SUNBZ0lDQWdhV1lnS0NGcGMwWnBibWwwWlNoamIyUmxVRzlwYm5RcElIeDhJR052WkdWUWIybHVkQ0E4SURBZ2ZId2dZMjlrWlZCdmFXNTBJRDRnTUhneE1FWkdSa1lnZkh3Z1pteHZiM0lvWTI5a1pWQnZhVzUwS1NBaFBTQmpiMlJsVUc5cGJuUXBJSHRjYmlBZ0lDQWdJQ0FnZEdoeWIzY2dVbUZ1WjJWRmNuSnZjaWduU1c1MllXeHBaQ0JqYjJSbElIQnZhVzUwT2lBbklDc2dZMjlrWlZCdmFXNTBLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoamIyUmxVRzlwYm5RZ1BEMGdNSGhHUmtaR0tTQjdYRzRnSUNBZ0lDQWdJR052WkdWVmJtbDBjeTV3ZFhOb0tHTnZaR1ZRYjJsdWRDazdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQmpiMlJsVUc5cGJuUWdMVDBnTUhneE1EQXdNRHRjYmlBZ0lDQWdJQ0FnYUdsbmFGTjFjbkp2WjJGMFpTQTlJQ2hqYjJSbFVHOXBiblFnUGo0Z01UQXBJQ3NnTUhoRU9EQXdPMXh1SUNBZ0lDQWdJQ0JzYjNkVGRYSnliMmRoZEdVZ1BTQW9ZMjlrWlZCdmFXNTBJQ1VnTUhnME1EQXBJQ3NnTUhoRVF6QXdPMXh1SUNBZ0lDQWdJQ0JqYjJSbFZXNXBkSE11Y0hWemFDaG9hV2RvVTNWeWNtOW5ZWFJsTENCc2IzZFRkWEp5YjJkaGRHVXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnVTNSeWFXNW5MbVp5YjIxRGFHRnlRMjlrWlM1aGNIQnNlU2h1ZFd4c0xDQmpiMlJsVlc1cGRITXBPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJSE4wY21sdVoxQnliM1J2ZEhsd1pVbDBaWEpoZEc5eUtDa2dlMXh1SUNBZ0lIWmhjaUJ2SUQwZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1Ob1pXTnJUMkpxWldOMFEyOWxjbU5wWW14bEtIUm9hWE1wTzF4dUlDQWdJSFpoY2lCeklEMGdVM1J5YVc1bktHOHBPMXh1SUNBZ0lISmxkSFZ5YmlCamNtVmhkR1ZUZEhKcGJtZEpkR1Z5WVhSdmNpaHpLVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ3YjJ4NVptbHNiRk4wY21sdVp5aG5iRzlpWVd3cElIdGNiaUFnSUNCMllYSWdVM1J5YVc1bklEMGdaMnh2WW1Gc0xsTjBjbWx1Wnp0Y2JpQWdJQ0J0WVhsaVpVRmtaRVoxYm1OMGFXOXVjeWhUZEhKcGJtY3VjSEp2ZEc5MGVYQmxMQ0JiSjJOdlpHVlFiMmx1ZEVGMEp5d2dZMjlrWlZCdmFXNTBRWFFzSUNkbGJtUnpWMmwwYUNjc0lHVnVaSE5YYVhSb0xDQW5hVzVqYkhWa1pYTW5MQ0JwYm1Oc2RXUmxjeXdnSjNKbGNHVmhkQ2NzSUhKbGNHVmhkQ3dnSjNOMFlYSjBjMWRwZEdnbkxDQnpkR0Z5ZEhOWGFYUm9YU2s3WEc0Z0lDQWdiV0Y1WW1WQlpHUkdkVzVqZEdsdmJuTW9VM1J5YVc1bkxDQmJKMlp5YjIxRGIyUmxVRzlwYm5RbkxDQm1jbTl0UTI5a1pWQnZhVzUwTENBbmNtRjNKeXdnY21GM1hTazdYRzRnSUNBZ2JXRjVZbVZCWkdSSmRHVnlZWFJ2Y2loVGRISnBibWN1Y0hKdmRHOTBlWEJsTENCemRISnBibWRRY205MGIzUjVjR1ZKZEdWeVlYUnZjaXdnVTNsdFltOXNLVHRjYmlBZ2ZWeHVJQ0J5WldkcGMzUmxjbEJ2YkhsbWFXeHNLSEJ2YkhsbWFXeHNVM1J5YVc1bktUdGNiaUFnY21WMGRYSnVJSHRjYmlBZ0lDQm5aWFFnYzNSaGNuUnpWMmwwYUNncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCemRHRnlkSE5YYVhSb08xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHVnVaSE5YYVhSb0tDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHVnVaSE5YYVhSb08xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHbHVZMngxWkdWektDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHbHVZMngxWkdWek8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElISmxjR1ZoZENncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCeVpYQmxZWFE3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnWTI5a1pWQnZhVzUwUVhRb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1kyOWtaVkJ2YVc1MFFYUTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdjbUYzS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhKaGR6dGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQm1jbTl0UTI5a1pWQnZhVzUwS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdaeWIyMURiMlJsVUc5cGJuUTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdjM1J5YVc1blVISnZkRzkwZVhCbFNYUmxjbUYwYjNJb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2MzUnlhVzVuVUhKdmRHOTBlWEJsU1hSbGNtRjBiM0k3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnY0c5c2VXWnBiR3hUZEhKcGJtY29LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdjRzlzZVdacGJHeFRkSEpwYm1jN1hHNGdJQ0FnZlZ4dUlDQjlPMXh1ZlNrN1hHNVRlWE4wWlcwdVoyVjBLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12VTNSeWFXNW5MbXB6WENJZ0t5QW5KeWs3WEc1VGVYTjBaVzB1Y21WbmFYTjBaWEpOYjJSMWJHVW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlCY25KaGVVbDBaWEpoZEc5eUxtcHpYQ0lzSUZ0ZExDQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ1hDSjFjMlVnYzNSeWFXTjBYQ0k3WEc0Z0lIWmhjaUFrWDE4eU8xeHVJQ0IyWVhJZ1gxOXRiMlIxYkdWT1lXMWxJRDBnWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5QmNuSmhlVWwwWlhKaGRHOXlMbXB6WENJN1hHNGdJSFpoY2lBa1gxOHdJRDBnVTNsemRHVnRMbWRsZENoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwzVjBhV3h6TG1welhDSXBMRnh1SUNBZ0lDQWdkRzlQWW1wbFkzUWdQU0FrWDE4d0xuUnZUMkpxWldOMExGeHVJQ0FnSUNBZ2RHOVZhVzUwTXpJZ1BTQWtYMTh3TG5SdlZXbHVkRE15TEZ4dUlDQWdJQ0FnWTNKbFlYUmxTWFJsY21GMGIzSlNaWE4xYkhSUFltcGxZM1FnUFNBa1gxOHdMbU55WldGMFpVbDBaWEpoZEc5eVVtVnpkV3gwVDJKcVpXTjBPMXh1SUNCMllYSWdRVkpTUVZsZlNWUkZVa0ZVVDFKZlMwbE9SRjlMUlZsVElEMGdNVHRjYmlBZ2RtRnlJRUZTVWtGWlgwbFVSVkpCVkU5U1gwdEpUa1JmVmtGTVZVVlRJRDBnTWp0Y2JpQWdkbUZ5SUVGU1VrRlpYMGxVUlZKQlZFOVNYMHRKVGtSZlJVNVVVa2xGVXlBOUlETTdYRzRnSUhaaGNpQkJjbkpoZVVsMFpYSmhkRzl5SUQwZ1puVnVZM1JwYjI0Z1FYSnlZWGxKZEdWeVlYUnZjaWdwSUh0OU8xeHVJQ0FvSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU55WldGMFpVTnNZWE56S1NoQmNuSmhlVWwwWlhKaGRHOXlMQ0FvSkY5Zk1pQTlJSHQ5TENCUFltcGxZM1F1WkdWbWFXNWxVSEp2Y0dWeWRIa29KRjlmTWl3Z1hDSnVaWGgwWENJc0lIdGNiaUFnSUNCMllXeDFaVG9nWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCMllYSWdhWFJsY21GMGIzSWdQU0IwYjA5aWFtVmpkQ2gwYUdsektUdGNiaUFnSUNBZ0lIWmhjaUJoY25KaGVTQTlJR2wwWlhKaGRHOXlMbWwwWlhKaGRHOXlUMkpxWldOMFh6dGNiaUFnSUNBZ0lHbG1JQ2doWVhKeVlYa3BJSHRjYmlBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblQySnFaV04wSUdseklHNXZkQ0JoYmlCQmNuSmhlVWwwWlhKaGRHOXlKeWs3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0IyWVhJZ2FXNWtaWGdnUFNCcGRHVnlZWFJ2Y2k1aGNuSmhlVWwwWlhKaGRHOXlUbVY0ZEVsdVpHVjRYenRjYmlBZ0lDQWdJSFpoY2lCcGRHVnRTMmx1WkNBOUlHbDBaWEpoZEc5eUxtRnljbUY1U1hSbGNtRjBhVzl1UzJsdVpGODdYRzRnSUNBZ0lDQjJZWElnYkdWdVozUm9JRDBnZEc5VmFXNTBNeklvWVhKeVlYa3ViR1Z1WjNSb0tUdGNiaUFnSUNBZ0lHbG1JQ2hwYm1SbGVDQStQU0JzWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJQ0FnYVhSbGNtRjBiM0l1WVhKeVlYbEpkR1Z5WVhSdmNrNWxlSFJKYm1SbGVGOGdQU0JKYm1acGJtbDBlVHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR055WldGMFpVbDBaWEpoZEc5eVVtVnpkV3gwVDJKcVpXTjBLSFZ1WkdWbWFXNWxaQ3dnZEhKMVpTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQnBkR1Z5WVhSdmNpNWhjbkpoZVVsMFpYSmhkRzl5VG1WNGRFbHVaR1Y0WHlBOUlHbHVaR1Y0SUNzZ01UdGNiaUFnSUNBZ0lHbG1JQ2hwZEdWdFMybHVaQ0E5UFNCQlVsSkJXVjlKVkVWU1FWUlBVbDlMU1U1RVgxWkJURlZGVXlsY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdOeVpXRjBaVWwwWlhKaGRHOXlVbVZ6ZFd4MFQySnFaV04wS0dGeWNtRjVXMmx1WkdWNFhTd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ2FXWWdLR2wwWlcxTGFXNWtJRDA5SUVGU1VrRlpYMGxVUlZKQlZFOVNYMHRKVGtSZlJVNVVVa2xGVXlsY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdOeVpXRjBaVWwwWlhKaGRHOXlVbVZ6ZFd4MFQySnFaV04wS0Z0cGJtUmxlQ3dnWVhKeVlYbGJhVzVrWlhoZFhTd2dabUZzYzJVcE8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUdOeVpXRjBaVWwwWlhKaGRHOXlVbVZ6ZFd4MFQySnFaV04wS0dsdVpHVjRMQ0JtWVd4elpTazdYRzRnSUNBZ2ZTeGNiaUFnSUNCamIyNW1hV2QxY21GaWJHVTZJSFJ5ZFdVc1hHNGdJQ0FnWlc1MWJXVnlZV0pzWlRvZ2RISjFaU3hjYmlBZ0lDQjNjbWwwWVdKc1pUb2dkSEoxWlZ4dUlDQjlLU3dnVDJKcVpXTjBMbVJsWm1sdVpWQnliM0JsY25SNUtDUmZYeklzSUZONWJXSnZiQzVwZEdWeVlYUnZjaXdnZTF4dUlDQWdJSFpoYkhWbE9pQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TzF4dUlDQWdJSDBzWEc0Z0lDQWdZMjl1Wm1sbmRYSmhZbXhsT2lCMGNuVmxMRnh1SUNBZ0lHVnVkVzFsY21GaWJHVTZJSFJ5ZFdVc1hHNGdJQ0FnZDNKcGRHRmliR1U2SUhSeWRXVmNiaUFnZlNrc0lDUmZYeklwTENCN2ZTazdYRzRnSUdaMWJtTjBhVzl1SUdOeVpXRjBaVUZ5Y21GNVNYUmxjbUYwYjNJb1lYSnlZWGtzSUd0cGJtUXBJSHRjYmlBZ0lDQjJZWElnYjJKcVpXTjBJRDBnZEc5UFltcGxZM1FvWVhKeVlYa3BPMXh1SUNBZ0lIWmhjaUJwZEdWeVlYUnZjaUE5SUc1bGR5QkJjbkpoZVVsMFpYSmhkRzl5TzF4dUlDQWdJR2wwWlhKaGRHOXlMbWwwWlhKaGRHOXlUMkpxWldOMFh5QTlJRzlpYW1WamREdGNiaUFnSUNCcGRHVnlZWFJ2Y2k1aGNuSmhlVWwwWlhKaGRHOXlUbVY0ZEVsdVpHVjRYeUE5SURBN1hHNGdJQ0FnYVhSbGNtRjBiM0l1WVhKeVlYbEpkR1Z5WVhScGIyNUxhVzVrWHlBOUlHdHBibVE3WEc0Z0lDQWdjbVYwZFhKdUlHbDBaWEpoZEc5eU8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHVnVkSEpwWlhNb0tTQjdYRzRnSUNBZ2NtVjBkWEp1SUdOeVpXRjBaVUZ5Y21GNVNYUmxjbUYwYjNJb2RHaHBjeXdnUVZKU1FWbGZTVlJGVWtGVVQxSmZTMGxPUkY5RlRsUlNTVVZUS1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCclpYbHpLQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQmpjbVZoZEdWQmNuSmhlVWwwWlhKaGRHOXlLSFJvYVhNc0lFRlNVa0ZaWDBsVVJWSkJWRTlTWDB0SlRrUmZTMFZaVXlrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2RtRnNkV1Z6S0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUJqY21WaGRHVkJjbkpoZVVsMFpYSmhkRzl5S0hSb2FYTXNJRUZTVWtGWlgwbFVSVkpCVkU5U1gwdEpUa1JmVmtGTVZVVlRLVHRjYmlBZ2ZWeHVJQ0J5WlhSMWNtNGdlMXh1SUNBZ0lHZGxkQ0JsYm5SeWFXVnpLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR1Z1ZEhKcFpYTTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdhMlY1Y3lncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCclpYbHpPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJSFpoYkhWbGN5Z3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjJZV3gxWlhNN1hHNGdJQ0FnZlZ4dUlDQjlPMXh1ZlNrN1hHNVRlWE4wWlcwdWNtVm5hWE4wWlhKTmIyUjFiR1VvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5QmNuSmhlUzVxYzF3aUxDQmJYU3dnWm5WdVkzUnBiMjRvS1NCN1hHNGdJRndpZFhObElITjBjbWxqZEZ3aU8xeHVJQ0IyWVhJZ1gxOXRiMlIxYkdWT1lXMWxJRDBnWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5QmNuSmhlUzVxYzF3aU8xeHVJQ0IyWVhJZ0pGOWZNQ0E5SUZONWMzUmxiUzVuWlhRb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OUJjbkpoZVVsMFpYSmhkRzl5TG1welhDSXBMRnh1SUNBZ0lDQWdaVzUwY21sbGN5QTlJQ1JmWHpBdVpXNTBjbWxsY3l4Y2JpQWdJQ0FnSUd0bGVYTWdQU0FrWDE4d0xtdGxlWE1zWEc0Z0lDQWdJQ0IyWVd4MVpYTWdQU0FrWDE4d0xuWmhiSFZsY3p0Y2JpQWdkbUZ5SUNSZlh6RWdQU0JUZVhOMFpXMHVaMlYwS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdmRYUnBiSE11YW5OY0lpa3NYRzRnSUNBZ0lDQmphR1ZqYTBsMFpYSmhZbXhsSUQwZ0pGOWZNUzVqYUdWamEwbDBaWEpoWW14bExGeHVJQ0FnSUNBZ2FYTkRZV3hzWVdKc1pTQTlJQ1JmWHpFdWFYTkRZV3hzWVdKc1pTeGNiaUFnSUNBZ0lHbHpRMjl1YzNSeWRXTjBiM0lnUFNBa1gxOHhMbWx6UTI5dWMzUnlkV04wYjNJc1hHNGdJQ0FnSUNCdFlYbGlaVUZrWkVaMWJtTjBhVzl1Y3lBOUlDUmZYekV1YldGNVltVkJaR1JHZFc1amRHbHZibk1zWEc0Z0lDQWdJQ0J0WVhsaVpVRmtaRWwwWlhKaGRHOXlJRDBnSkY5Zk1TNXRZWGxpWlVGa1pFbDBaWEpoZEc5eUxGeHVJQ0FnSUNBZ2NtVm5hWE4wWlhKUWIyeDVabWxzYkNBOUlDUmZYekV1Y21WbmFYTjBaWEpRYjJ4NVptbHNiQ3hjYmlBZ0lDQWdJSFJ2U1c1MFpXZGxjaUE5SUNSZlh6RXVkRzlKYm5SbFoyVnlMRnh1SUNBZ0lDQWdkRzlNWlc1bmRHZ2dQU0FrWDE4eExuUnZUR1Z1WjNSb0xGeHVJQ0FnSUNBZ2RHOVBZbXBsWTNRZ1BTQWtYMTh4TG5SdlQySnFaV04wTzF4dUlDQm1kVzVqZEdsdmJpQm1jbTl0S0dGeWNreHBhMlVwSUh0Y2JpQWdJQ0IyWVhJZ2JXRndSbTRnUFNCaGNtZDFiV1Z1ZEhOYk1WMDdYRzRnSUNBZ2RtRnlJSFJvYVhOQmNtY2dQU0JoY21kMWJXVnVkSE5iTWwwN1hHNGdJQ0FnZG1GeUlFTWdQU0IwYUdsek8xeHVJQ0FnSUhaaGNpQnBkR1Z0Y3lBOUlIUnZUMkpxWldOMEtHRnlja3hwYTJVcE8xeHVJQ0FnSUhaaGNpQnRZWEJ3YVc1bklEMGdiV0Z3Um00Z0lUMDlJSFZ1WkdWbWFXNWxaRHRjYmlBZ0lDQjJZWElnYXlBOUlEQTdYRzRnSUNBZ2RtRnlJR0Z5Y2l4Y2JpQWdJQ0FnSUNBZ2JHVnVPMXh1SUNBZ0lHbG1JQ2h0WVhCd2FXNW5JQ1ltSUNGcGMwTmhiR3hoWW14bEtHMWhjRVp1S1NrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnVkhsd1pVVnljbTl5S0NrN1hHNGdJQ0FnZlZ4dUlDQWdJR2xtSUNoamFHVmphMGwwWlhKaFlteGxLR2wwWlcxektTa2dlMXh1SUNBZ0lDQWdZWEp5SUQwZ2FYTkRiMjV6ZEhKMVkzUnZjaWhES1NBL0lHNWxkeUJES0NrZ09pQmJYVHRjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJQ1JmWHpJZ1BTQnBkR1Z0YzFza2RISmhZMlYxY2xKMWJuUnBiV1V1ZEc5UWNtOXdaWEowZVNoVGVXMWliMnd1YVhSbGNtRjBiM0lwWFNncExGeHVJQ0FnSUNBZ0lDQWdJQ1JmWHpNN0lDRW9KRjlmTXlBOUlDUmZYekl1Ym1WNGRDZ3BLUzVrYjI1bE95QXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHbDBaVzBnUFNBa1gxOHpMblpoYkhWbE8xeHVJQ0FnSUNBZ0lDQjdYRzRnSUNBZ0lDQWdJQ0FnYVdZZ0tHMWhjSEJwYm1jcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdGeWNsdHJYU0E5SUcxaGNFWnVMbU5oYkd3b2RHaHBjMEZ5Wnl3Z2FYUmxiU3dnYXlrN1hHNGdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdGeWNsdHJYU0E5SUdsMFpXMDdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lHc3JLenRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnWVhKeUxteGxibWQwYUNBOUlHczdYRzRnSUNBZ0lDQnlaWFIxY200Z1lYSnlPMXh1SUNBZ0lIMWNiaUFnSUNCc1pXNGdQU0IwYjB4bGJtZDBhQ2hwZEdWdGN5NXNaVzVuZEdncE8xeHVJQ0FnSUdGeWNpQTlJR2x6UTI5dWMzUnlkV04wYjNJb1F5a2dQeUJ1WlhjZ1F5aHNaVzRwSURvZ2JtVjNJRUZ5Y21GNUtHeGxiaWs3WEc0Z0lDQWdabTl5SUNnN0lHc2dQQ0JzWlc0N0lHc3JLeWtnZTF4dUlDQWdJQ0FnYVdZZ0tHMWhjSEJwYm1jcElIdGNiaUFnSUNBZ0lDQWdZWEp5VzJ0ZElEMGdkSGx3Wlc5bUlIUm9hWE5CY21jZ1BUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2JXRndSbTRvYVhSbGJYTmJhMTBzSUdzcElEb2diV0Z3Um00dVkyRnNiQ2gwYUdselFYSm5MQ0JwZEdWdGMxdHJYU3dnYXlrN1hHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCaGNuSmJhMTBnUFNCcGRHVnRjMXRyWFR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc0Z0lDQWdZWEp5TG14bGJtZDBhQ0E5SUd4bGJqdGNiaUFnSUNCeVpYUjFjbTRnWVhKeU8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHOW1LQ2tnZTF4dUlDQWdJR1p2Y2lBb2RtRnlJR2wwWlcxeklEMGdXMTBzWEc0Z0lDQWdJQ0FnSUNSZlh6UWdQU0F3T3lBa1gxODBJRHdnWVhKbmRXMWxiblJ6TG14bGJtZDBhRHNnSkY5Zk5Dc3JLVnh1SUNBZ0lDQWdhWFJsYlhOYkpGOWZORjBnUFNCaGNtZDFiV1Z1ZEhOYkpGOWZORjA3WEc0Z0lDQWdkbUZ5SUVNZ1BTQjBhR2x6TzF4dUlDQWdJSFpoY2lCc1pXNGdQU0JwZEdWdGN5NXNaVzVuZEdnN1hHNGdJQ0FnZG1GeUlHRnljaUE5SUdselEyOXVjM1J5ZFdOMGIzSW9ReWtnUHlCdVpYY2dReWhzWlc0cElEb2dibVYzSUVGeWNtRjVLR3hsYmlrN1hHNGdJQ0FnWm05eUlDaDJZWElnYXlBOUlEQTdJR3NnUENCc1pXNDdJR3NyS3lrZ2UxeHVJQ0FnSUNBZ1lYSnlXMnRkSUQwZ2FYUmxiWE5iYTEwN1hHNGdJQ0FnZlZ4dUlDQWdJR0Z5Y2k1c1pXNW5kR2dnUFNCc1pXNDdYRzRnSUNBZ2NtVjBkWEp1SUdGeWNqdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQm1hV3hzS0haaGJIVmxLU0I3WEc0Z0lDQWdkbUZ5SUhOMFlYSjBJRDBnWVhKbmRXMWxiblJ6V3pGZElDRTlQU0FvZG05cFpDQXdLU0EvSUdGeVozVnRaVzUwYzFzeFhTQTZJREE3WEc0Z0lDQWdkbUZ5SUdWdVpDQTlJR0Z5WjNWdFpXNTBjMXN5WFR0Y2JpQWdJQ0IyWVhJZ2IySnFaV04wSUQwZ2RHOVBZbXBsWTNRb2RHaHBjeWs3WEc0Z0lDQWdkbUZ5SUd4bGJpQTlJSFJ2VEdWdVozUm9LRzlpYW1WamRDNXNaVzVuZEdncE8xeHVJQ0FnSUhaaGNpQm1hV3hzVTNSaGNuUWdQU0IwYjBsdWRHVm5aWElvYzNSaGNuUXBPMXh1SUNBZ0lIWmhjaUJtYVd4c1JXNWtJRDBnWlc1a0lDRTlQU0IxYm1SbFptbHVaV1FnUHlCMGIwbHVkR1ZuWlhJb1pXNWtLU0E2SUd4bGJqdGNiaUFnSUNCbWFXeHNVM1JoY25RZ1BTQm1hV3hzVTNSaGNuUWdQQ0F3SUQ4Z1RXRjBhQzV0WVhnb2JHVnVJQ3NnWm1sc2JGTjBZWEowTENBd0tTQTZJRTFoZEdndWJXbHVLR1pwYkd4VGRHRnlkQ3dnYkdWdUtUdGNiaUFnSUNCbWFXeHNSVzVrSUQwZ1ptbHNiRVZ1WkNBOElEQWdQeUJOWVhSb0xtMWhlQ2hzWlc0Z0t5Qm1hV3hzUlc1a0xDQXdLU0E2SUUxaGRHZ3ViV2x1S0dacGJHeEZibVFzSUd4bGJpazdYRzRnSUNBZ2QyaHBiR1VnS0dacGJHeFRkR0Z5ZENBOElHWnBiR3hGYm1RcElIdGNiaUFnSUNBZ0lHOWlhbVZqZEZ0bWFXeHNVM1JoY25SZElEMGdkbUZzZFdVN1hHNGdJQ0FnSUNCbWFXeHNVM1JoY25Rckt6dGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJRzlpYW1WamREdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQm1hVzVrS0hCeVpXUnBZMkYwWlNrZ2UxeHVJQ0FnSUhaaGNpQjBhR2x6UVhKbklEMGdZWEpuZFcxbGJuUnpXekZkTzF4dUlDQWdJSEpsZEhWeWJpQm1hVzVrU0dWc2NHVnlLSFJvYVhNc0lIQnlaV1JwWTJGMFpTd2dkR2hwYzBGeVp5azdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdabWx1WkVsdVpHVjRLSEJ5WldScFkyRjBaU2tnZTF4dUlDQWdJSFpoY2lCMGFHbHpRWEpuSUQwZ1lYSm5kVzFsYm5Seld6RmRPMXh1SUNBZ0lISmxkSFZ5YmlCbWFXNWtTR1ZzY0dWeUtIUm9hWE1zSUhCeVpXUnBZMkYwWlN3Z2RHaHBjMEZ5Wnl3Z2RISjFaU2s3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWm1sdVpFaGxiSEJsY2loelpXeG1MQ0J3Y21Wa2FXTmhkR1VwSUh0Y2JpQWdJQ0IyWVhJZ2RHaHBjMEZ5WnlBOUlHRnlaM1Z0Wlc1MGMxc3lYVHRjYmlBZ0lDQjJZWElnY21WMGRYSnVTVzVrWlhnZ1BTQmhjbWQxYldWdWRITmJNMTBnSVQwOUlDaDJiMmxrSURBcElEOGdZWEpuZFcxbGJuUnpXek5kSURvZ1ptRnNjMlU3WEc0Z0lDQWdkbUZ5SUc5aWFtVmpkQ0E5SUhSdlQySnFaV04wS0hObGJHWXBPMXh1SUNBZ0lIWmhjaUJzWlc0Z1BTQjBiMHhsYm1kMGFDaHZZbXBsWTNRdWJHVnVaM1JvS1R0Y2JpQWdJQ0JwWmlBb0lXbHpRMkZzYkdGaWJHVW9jSEpsWkdsallYUmxLU2tnZTF4dUlDQWdJQ0FnZEdoeWIzY2dWSGx3WlVWeWNtOXlLQ2s3WEc0Z0lDQWdmVnh1SUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2diR1Z1T3lCcEt5c3BJSHRjYmlBZ0lDQWdJSFpoY2lCMllXeDFaU0E5SUc5aWFtVmpkRnRwWFR0Y2JpQWdJQ0FnSUdsbUlDaHdjbVZrYVdOaGRHVXVZMkZzYkNoMGFHbHpRWEpuTENCMllXeDFaU3dnYVN3Z2IySnFaV04wS1NrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2NtVjBkWEp1U1c1a1pYZ2dQeUJwSURvZ2RtRnNkV1U3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCeVpYUjFjbTVKYm1SbGVDQS9JQzB4SURvZ2RXNWtaV1pwYm1Wa08xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlIQnZiSGxtYVd4c1FYSnlZWGtvWjJ4dlltRnNLU0I3WEc0Z0lDQWdkbUZ5SUNSZlh6VWdQU0JuYkc5aVlXd3NYRzRnSUNBZ0lDQWdJRUZ5Y21GNUlEMGdKRjlmTlM1QmNuSmhlU3hjYmlBZ0lDQWdJQ0FnVDJKcVpXTjBJRDBnSkY5Zk5TNVBZbXBsWTNRc1hHNGdJQ0FnSUNBZ0lGTjViV0p2YkNBOUlDUmZYelV1VTNsdFltOXNPMXh1SUNBZ0lHMWhlV0psUVdSa1JuVnVZM1JwYjI1ektFRnljbUY1TG5CeWIzUnZkSGx3WlN3Z1d5ZGxiblJ5YVdWekp5d2daVzUwY21sbGN5d2dKMnRsZVhNbkxDQnJaWGx6TENBbmRtRnNkV1Z6Snl3Z2RtRnNkV1Z6TENBblptbHNiQ2NzSUdacGJHd3NJQ2RtYVc1a0p5d2dabWx1WkN3Z0oyWnBibVJKYm1SbGVDY3NJR1pwYm1SSmJtUmxlRjBwTzF4dUlDQWdJRzFoZVdKbFFXUmtSblZ1WTNScGIyNXpLRUZ5Y21GNUxDQmJKMlp5YjIwbkxDQm1jbTl0TENBbmIyWW5MQ0J2WmwwcE8xeHVJQ0FnSUcxaGVXSmxRV1JrU1hSbGNtRjBiM0lvUVhKeVlYa3VjSEp2ZEc5MGVYQmxMQ0IyWVd4MVpYTXNJRk41YldKdmJDazdYRzRnSUNBZ2JXRjVZbVZCWkdSSmRHVnlZWFJ2Y2loUFltcGxZM1F1WjJWMFVISnZkRzkwZVhCbFQyWW9XMTB1ZG1Gc2RXVnpLQ2twTENCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCMGFHbHpPMXh1SUNBZ0lIMHNJRk41YldKdmJDazdYRzRnSUgxY2JpQWdjbVZuYVhOMFpYSlFiMng1Wm1sc2JDaHdiMng1Wm1sc2JFRnljbUY1S1R0Y2JpQWdjbVYwZFhKdUlIdGNiaUFnSUNCblpYUWdabkp2YlNncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbWNtOXRPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJRzltS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUc5bU8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHWnBiR3dvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWm1sc2JEdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQm1hVzVrS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdacGJtUTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdabWx1WkVsdVpHVjRLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR1pwYm1SSmJtUmxlRHRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0J3YjJ4NVptbHNiRUZ5Y21GNUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIQnZiSGxtYVd4c1FYSnlZWGs3WEc0Z0lDQWdmVnh1SUNCOU8xeHVmU2s3WEc1VGVYTjBaVzB1WjJWMEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZRWEp5WVhrdWFuTmNJaUFySUNjbktUdGNibE41YzNSbGJTNXlaV2RwYzNSbGNrMXZaSFZzWlNoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwwOWlhbVZqZEM1cWMxd2lMQ0JiWFN3Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUZ3aWRYTmxJSE4wY21samRGd2lPMXh1SUNCMllYSWdYMTl0YjJSMWJHVk9ZVzFsSUQwZ1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OVBZbXBsWTNRdWFuTmNJanRjYmlBZ2RtRnlJQ1JmWHpBZ1BTQlRlWE4wWlcwdVoyVjBLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12ZFhScGJITXVhbk5jSWlrc1hHNGdJQ0FnSUNCdFlYbGlaVUZrWkVaMWJtTjBhVzl1Y3lBOUlDUmZYekF1YldGNVltVkJaR1JHZFc1amRHbHZibk1zWEc0Z0lDQWdJQ0J5WldkcGMzUmxjbEJ2YkhsbWFXeHNJRDBnSkY5Zk1DNXlaV2RwYzNSbGNsQnZiSGxtYVd4c08xeHVJQ0IyWVhJZ0pGOWZNU0E5SUNSMGNtRmpaWFZ5VW5WdWRHbHRaU3hjYmlBZ0lDQWdJR1JsWm1sdVpWQnliM0JsY25SNUlEMGdKRjlmTVM1a1pXWnBibVZRY205d1pYSjBlU3hjYmlBZ0lDQWdJR2RsZEU5M2JsQnliM0JsY25SNVJHVnpZM0pwY0hSdmNpQTlJQ1JmWHpFdVoyVjBUM2R1VUhKdmNHVnlkSGxFWlhOamNtbHdkRzl5TEZ4dUlDQWdJQ0FnWjJWMFQzZHVVSEp2Y0dWeWRIbE9ZVzFsY3lBOUlDUmZYekV1WjJWMFQzZHVVSEp2Y0dWeWRIbE9ZVzFsY3l4Y2JpQWdJQ0FnSUdselVISnBkbUYwWlU1aGJXVWdQU0FrWDE4eExtbHpVSEpwZG1GMFpVNWhiV1VzWEc0Z0lDQWdJQ0JyWlhseklEMGdKRjlmTVM1clpYbHpPMXh1SUNCbWRXNWpkR2x2YmlCcGN5aHNaV1owTENCeWFXZG9kQ2tnZTF4dUlDQWdJR2xtSUNoc1pXWjBJRDA5UFNCeWFXZG9kQ2xjYmlBZ0lDQWdJSEpsZEhWeWJpQnNaV1owSUNFOVBTQXdJSHg4SURFZ0x5QnNaV1owSUQwOVBTQXhJQzhnY21sbmFIUTdYRzRnSUNBZ2NtVjBkWEp1SUd4bFpuUWdJVDA5SUd4bFpuUWdKaVlnY21sbmFIUWdJVDA5SUhKcFoyaDBPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR0Z6YzJsbmJpaDBZWEpuWlhRcElIdGNiaUFnSUNCbWIzSWdLSFpoY2lCcElEMGdNVHNnYVNBOElHRnlaM1Z0Wlc1MGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnZG1GeUlITnZkWEpqWlNBOUlHRnlaM1Z0Wlc1MGMxdHBYVHRjYmlBZ0lDQWdJSFpoY2lCd2NtOXdjeUE5SUhOdmRYSmpaU0E5UFNCdWRXeHNJRDhnVzEwZ09pQnJaWGx6S0hOdmRYSmpaU2s3WEc0Z0lDQWdJQ0IyWVhJZ2NDeGNiaUFnSUNBZ0lDQWdJQ0JzWlc1bmRHZ2dQU0J3Y205d2N5NXNaVzVuZEdnN1hHNGdJQ0FnSUNCbWIzSWdLSEFnUFNBd095QndJRHdnYkdWdVozUm9PeUJ3S3lzcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUc1aGJXVWdQU0J3Y205d2MxdHdYVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tHbHpVSEpwZG1GMFpVNWhiV1VvYm1GdFpTa3BYRzRnSUNBZ0lDQWdJQ0FnWTI5dWRHbHVkV1U3WEc0Z0lDQWdJQ0FnSUhSaGNtZGxkRnR1WVcxbFhTQTlJSE52ZFhKalpWdHVZVzFsWFR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlIUmhjbWRsZER0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCdGFYaHBiaWgwWVhKblpYUXNJSE52ZFhKalpTa2dlMXh1SUNBZ0lIWmhjaUJ3Y205d2N5QTlJR2RsZEU5M2JsQnliM0JsY25SNVRtRnRaWE1vYzI5MWNtTmxLVHRjYmlBZ0lDQjJZWElnY0N4Y2JpQWdJQ0FnSUNBZ1pHVnpZM0pwY0hSdmNpeGNiaUFnSUNBZ0lDQWdiR1Z1WjNSb0lEMGdjSEp2Y0hNdWJHVnVaM1JvTzF4dUlDQWdJR1p2Y2lBb2NDQTlJREE3SUhBZ1BDQnNaVzVuZEdnN0lIQXJLeWtnZTF4dUlDQWdJQ0FnZG1GeUlHNWhiV1VnUFNCd2NtOXdjMXR3WFR0Y2JpQWdJQ0FnSUdsbUlDaHBjMUJ5YVhaaGRHVk9ZVzFsS0c1aGJXVXBLVnh1SUNBZ0lDQWdJQ0JqYjI1MGFXNTFaVHRjYmlBZ0lDQWdJR1JsYzJOeWFYQjBiM0lnUFNCblpYUlBkMjVRY205d1pYSjBlVVJsYzJOeWFYQjBiM0lvYzI5MWNtTmxMQ0J3Y205d2MxdHdYU2s3WEc0Z0lDQWdJQ0JrWldacGJtVlFjbTl3WlhKMGVTaDBZWEpuWlhRc0lIQnliM0J6VzNCZExDQmtaWE5qY21sd2RHOXlLVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUhSaGNtZGxkRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ3YjJ4NVptbHNiRTlpYW1WamRDaG5iRzlpWVd3cElIdGNiaUFnSUNCMllYSWdUMkpxWldOMElEMGdaMnh2WW1Gc0xrOWlhbVZqZER0Y2JpQWdJQ0J0WVhsaVpVRmtaRVoxYm1OMGFXOXVjeWhQWW1wbFkzUXNJRnNuWVhOemFXZHVKeXdnWVhOemFXZHVMQ0FuYVhNbkxDQnBjeXdnSjIxcGVHbHVKeXdnYldsNGFXNWRLVHRjYmlBZ2ZWeHVJQ0J5WldkcGMzUmxjbEJ2YkhsbWFXeHNLSEJ2YkhsbWFXeHNUMkpxWldOMEtUdGNiaUFnY21WMGRYSnVJSHRjYmlBZ0lDQm5aWFFnYVhNb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2FYTTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdZWE56YVdkdUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHRnpjMmxuYmp0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCdGFYaHBiaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ0YVhocGJqdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQndiMng1Wm1sc2JFOWlhbVZqZENncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCd2IyeDVabWxzYkU5aWFtVmpkRHRjYmlBZ0lDQjlYRzRnSUgwN1hHNTlLVHRjYmxONWMzUmxiUzVuWlhRb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OVBZbXBsWTNRdWFuTmNJaUFySUNjbktUdGNibE41YzNSbGJTNXlaV2RwYzNSbGNrMXZaSFZzWlNoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwwNTFiV0psY2k1cWMxd2lMQ0JiWFN3Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUZ3aWRYTmxJSE4wY21samRGd2lPMXh1SUNCMllYSWdYMTl0YjJSMWJHVk9ZVzFsSUQwZ1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OU9kVzFpWlhJdWFuTmNJanRjYmlBZ2RtRnlJQ1JmWHpBZ1BTQlRlWE4wWlcwdVoyVjBLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12ZFhScGJITXVhbk5jSWlrc1hHNGdJQ0FnSUNCcGMwNTFiV0psY2lBOUlDUmZYekF1YVhOT2RXMWlaWElzWEc0Z0lDQWdJQ0J0WVhsaVpVRmtaRU52Ym5OMGN5QTlJQ1JmWHpBdWJXRjVZbVZCWkdSRGIyNXpkSE1zWEc0Z0lDQWdJQ0J0WVhsaVpVRmtaRVoxYm1OMGFXOXVjeUE5SUNSZlh6QXViV0Y1WW1WQlpHUkdkVzVqZEdsdmJuTXNYRzRnSUNBZ0lDQnlaV2RwYzNSbGNsQnZiSGxtYVd4c0lEMGdKRjlmTUM1eVpXZHBjM1JsY2xCdmJIbG1hV3hzTEZ4dUlDQWdJQ0FnZEc5SmJuUmxaMlZ5SUQwZ0pGOWZNQzUwYjBsdWRHVm5aWEk3WEc0Z0lIWmhjaUFrWVdKeklEMGdUV0YwYUM1aFluTTdYRzRnSUhaaGNpQWthWE5HYVc1cGRHVWdQU0JwYzBacGJtbDBaVHRjYmlBZ2RtRnlJQ1JwYzA1aFRpQTlJR2x6VG1GT08xeHVJQ0IyWVhJZ1RVRllYMU5CUmtWZlNVNVVSVWRGVWlBOUlFMWhkR2d1Y0c5M0tESXNJRFV6S1NBdElERTdYRzRnSUhaaGNpQk5TVTVmVTBGR1JWOUpUbFJGUjBWU0lEMGdMVTFoZEdndWNHOTNLRElzSURVektTQXJJREU3WEc0Z0lIWmhjaUJGVUZOSlRFOU9JRDBnVFdGMGFDNXdiM2NvTWl3Z0xUVXlLVHRjYmlBZ1puVnVZM1JwYjI0Z1RuVnRZbVZ5U1hOR2FXNXBkR1VvYm5WdFltVnlLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHbHpUblZ0WW1WeUtHNTFiV0psY2lrZ0ppWWdKR2x6Um1sdWFYUmxLRzUxYldKbGNpazdYRzRnSUgxY2JpQWdPMXh1SUNCbWRXNWpkR2x2YmlCcGMwbHVkR1ZuWlhJb2JuVnRZbVZ5S1NCN1hHNGdJQ0FnY21WMGRYSnVJRTUxYldKbGNrbHpSbWx1YVhSbEtHNTFiV0psY2lrZ0ppWWdkRzlKYm5SbFoyVnlLRzUxYldKbGNpa2dQVDA5SUc1MWJXSmxjanRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJPZFcxaVpYSkpjMDVoVGlodWRXMWlaWElwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdhWE5PZFcxaVpYSW9iblZ0WW1WeUtTQW1KaUFrYVhOT1lVNG9iblZ0WW1WeUtUdGNiaUFnZlZ4dUlDQTdYRzRnSUdaMWJtTjBhVzl1SUdselUyRm1aVWx1ZEdWblpYSW9iblZ0WW1WeUtTQjdYRzRnSUNBZ2FXWWdLRTUxYldKbGNrbHpSbWx1YVhSbEtHNTFiV0psY2lrcElIdGNiaUFnSUNBZ0lIWmhjaUJwYm5SbFozSmhiQ0E5SUhSdlNXNTBaV2RsY2lodWRXMWlaWElwTzF4dUlDQWdJQ0FnYVdZZ0tHbHVkR1ZuY21Gc0lEMDlQU0J1ZFcxaVpYSXBYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQWtZV0p6S0dsdWRHVm5jbUZzS1NBOFBTQk5RVmhmVTBGR1JWOUpUbFJGUjBWU08xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NHOXNlV1pwYkd4T2RXMWlaWElvWjJ4dlltRnNLU0I3WEc0Z0lDQWdkbUZ5SUU1MWJXSmxjaUE5SUdkc2IySmhiQzVPZFcxaVpYSTdYRzRnSUNBZ2JXRjVZbVZCWkdSRGIyNXpkSE1vVG5WdFltVnlMQ0JiSjAxQldGOVRRVVpGWDBsT1ZFVkhSVkluTENCTlFWaGZVMEZHUlY5SlRsUkZSMFZTTENBblRVbE9YMU5CUmtWZlNVNVVSVWRGVWljc0lFMUpUbDlUUVVaRlgwbE9WRVZIUlZJc0lDZEZVRk5KVEU5T0p5d2dSVkJUU1V4UFRsMHBPMXh1SUNBZ0lHMWhlV0psUVdSa1JuVnVZM1JwYjI1ektFNTFiV0psY2l3Z1d5ZHBjMFpwYm1sMFpTY3NJRTUxYldKbGNrbHpSbWx1YVhSbExDQW5hWE5KYm5SbFoyVnlKeXdnYVhOSmJuUmxaMlZ5TENBbmFYTk9ZVTRuTENCT2RXMWlaWEpKYzA1aFRpd2dKMmx6VTJGbVpVbHVkR1ZuWlhJbkxDQnBjMU5oWm1WSmJuUmxaMlZ5WFNrN1hHNGdJSDFjYmlBZ2NtVm5hWE4wWlhKUWIyeDVabWxzYkNod2IyeDVabWxzYkU1MWJXSmxjaWs3WEc0Z0lISmxkSFZ5YmlCN1hHNGdJQ0FnWjJWMElFMUJXRjlUUVVaRlgwbE9WRVZIUlZJb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1RVRllYMU5CUmtWZlNVNVVSVWRGVWp0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCTlNVNWZVMEZHUlY5SlRsUkZSMFZTS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUUxSlRsOVRRVVpGWDBsT1ZFVkhSVkk3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnUlZCVFNVeFBUaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJGVUZOSlRFOU9PMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJR2x6Um1sdWFYUmxLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRTUxYldKbGNrbHpSbWx1YVhSbE8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHbHpTVzUwWldkbGNpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnBjMGx1ZEdWblpYSTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdhWE5PWVU0b0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1RuVnRZbVZ5U1hOT1lVNDdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdhWE5UWVdabFNXNTBaV2RsY2lncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCcGMxTmhabVZKYm5SbFoyVnlPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJSEJ2YkhsbWFXeHNUblZ0WW1WeUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIQnZiSGxtYVd4c1RuVnRZbVZ5TzF4dUlDQWdJSDFjYmlBZ2ZUdGNibjBwTzF4dVUzbHpkR1Z0TG1kbGRDaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMMDUxYldKbGNpNXFjMXdpSUNzZ0p5Y3BPMXh1VTNsemRHVnRMbkpsWjJsemRHVnlUVzlrZFd4bEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZjRzlzZVdacGJHeHpMbXB6WENJc0lGdGRMQ0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdYQ0oxYzJVZ2MzUnlhV04wWENJN1hHNGdJSFpoY2lCZlgyMXZaSFZzWlU1aGJXVWdQU0JjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDNCdmJIbG1hV3hzY3k1cWMxd2lPMXh1SUNCMllYSWdjRzlzZVdacGJHeEJiR3dnUFNCVGVYTjBaVzB1WjJWMEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZkWFJwYkhNdWFuTmNJaWt1Y0c5c2VXWnBiR3hCYkd3N1hHNGdJSEJ2YkhsbWFXeHNRV3hzS0ZKbFpteGxZM1F1WjJ4dlltRnNLVHRjYmlBZ2RtRnlJSE5sZEhWd1IyeHZZbUZzY3lBOUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1elpYUjFjRWRzYjJKaGJITTdYRzRnSUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzV6WlhSMWNFZHNiMkpoYkhNZ1BTQm1kVzVqZEdsdmJpaG5iRzlpWVd3cElIdGNiaUFnSUNCelpYUjFjRWRzYjJKaGJITW9aMnh2WW1Gc0tUdGNiaUFnSUNCd2IyeDVabWxzYkVGc2JDaG5iRzlpWVd3cE8xeHVJQ0I5TzF4dUlDQnlaWFIxY200Z2UzMDdYRzU5S1R0Y2JsTjVjM1JsYlM1blpYUW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTl3YjJ4NVptbHNiSE11YW5OY0lpQXJJQ2NuS1R0Y2JpSmRmUT09IiwidmFyIHBzaVR1cmsgPSByZXF1aXJlKCcuL3BzaXR1cmsnKTtcbnZhciBzZXR1cFRyYWluaW5ncyA9IHJlcXVpcmUoJy4vc3BlY2lmaWMvaXRlbXNfdCcpO1xudmFyIHNldHVwVHJpYWxzID0gcmVxdWlyZSgnLi9zcGVjaWZpYy9pdGVtcycpO1xudmFyIFF1ZXN0aW9ubmFpcmUgPSByZXF1aXJlKCcuL3NwZWNpZmljL2VuZGluZycpO1xuXG5jbGFzcyBFeHBlcmltZW50IHsgLy90aGUgbWFpbiBvYmplY3Qgb2YgdGhlIHdob2xlIHRoaW5nXG4gICBcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5jb3VudCA9IDA7IC8vYSBjb3VudGVyIHRvIGtlZXAgdHJhY2sgb2YgaG93IG1hbnkgdHJpYWxzIHdlcmUgZGlzcGFseWVkXG4gICAgdGhpcy50cmlhbERhdGEgPSBbXTsgLy9pbml0aWFsaXplcyBhIHZlY3RvciB0byBjb2xsZWN0IGRhdGFcbiAgICB0aGlzLmFsbFRyYWluaW5ncyA9IHNldHVwVHJhaW5pbmdzKCk7IC8vY2FsbHMgdGhlIGZ1bmN0aW9uIGRlZmluZWQgaW4gaXRlbXNfdC5qcywgd2hpY2ggY3JlYXRlcyB0aGUgdHJhaW5pbmcgdHJpYWxzXG4gICAgdGhpcy5zd2l0Y2g9dHJ1ZTsgLy9zaW1wbGUgYW5kIGluZWxlZ2FudCB3YXkgdG8gZGlzcGxheSBhICdjb25ncmF0dWxhdGlvbnMhJyBtZXNzYWdlIGFmdGVyIHRoZSB0cmFpbmluZyAgXG4gICAgdGhpcy5hbGxUcmlhbHMgPSBzZXR1cFRyaWFscygpOyAvL2NhbGxzIHRoZSBmdW5jdGlvbiBkZWZpbmVkIGluIGl0ZW1zLmpzLCB3aGljaCBjcmVhdGVzIHRoZSB0cmlhbHNcbiAgfVxuXG4gIG5leHQoKSB7IC8vY2FsbGVkIHdoZW4gdGhlIHN1YmplY3QgY2xpY2tzIFwibmV4dFwiXG4gICAgaWYgKHRoaXMuY291bnQgPCB0aGlzLmFsbFRyYWluaW5ncy5sZW5ndGgpIHsgICAgICBcbiAgICAgICAgICB0aGlzLnRyaWFsID0gdGhpcy5hbGxUcmFpbmluZ3NbdGhpcy5jb3VudF07IC8vcGlja3MgdGhlIHRoaXMuY291bnQtdGggb2JqZWN0IGNvbnN0cnVjdGVkIGJ5IHNldHVwVHJhaW5pbmdzXG4gICAgICAgICAgdGhpcy50cmlhbG51bWJlciA9IHRoaXMuY291bnQrMTsgLy9qdXN0IHRvIG51bWJlciB0aGUgdHJpYWxzIHN0YXJ0aW5nIGZyb20gMSBpbnN0ZWFkIG9mIDBcbiAgICAgICAgICB0aGlzLmluc2VydExpbmVzKHRoaXMudHJpYWwpOyAvL2Z1bmN0aW9uIHVzZWQgdG8gcmVwbGFjZSB0aGUgd2FudGVkIGVsZW1lbnRzIChwaWNrZWQgYnkgaWQsIHNlZSBiZWxvdykgd2l0aCB0aGUgdGV4dC9odG1sLy4uLiBwcm92aWRlZCBpbiBpdGVtcy5qc1xuICAgICAgICAgIHRoaXMudHJpYWxEYXRhLnNwbGljZSgwLCAwLCB0aGlzLnRyaWFsbnVtYmVyLCB0aGlzLnRyaWFsLmtpbmQsIHRoaXMudHJpYWwub3B0aW9uLCB0aGlzLnRyaWFsLnNob3J0RXhwcmVzc2lvbiwgdGhpcy50cmlhbC5jb2xvciwgdGhpcy50cmlhbC5zY2VuYXJpbywgdGhpcy50cmlhbC5xdWQsIHRoaXMudHJpYWwudmFsdWUpOyAgICAgIFxuICAgICAgICAgIHRoaXMuc3RhcnQgPSArIG5ldyBEYXRlKCk7Ly9zdGFydGluZyB0aW1lIG9mIHRoZSB0cmlhbFx0ICAgIFxuICAgICAgICAgIHRoaXMuY291bnQrKzsvL3NlbGYtZXhwbGFuYXRvcnlcbiAgICB9IFxuICAgIGVsc2UgaWYgKHRoaXMuY291bnQtdGhpcy5hbGxUcmFpbmluZ3MubGVuZ3RoIDwgdGhpcy5hbGxUcmlhbHMubGVuZ3RoKSB7XG4gICAgICAgIGlmICh0aGlzLnN3aXRjaCkge1xuICAgICAgICAgIHRoaXMuc3dpdGNoPWZhbHNlOyAvLyBpdCBhY3RpdmF0ZXMgb25seSBvbmNlLCB0byBkaXNwbGF5IHRoZSBmb2xsb3dpbmcgc2xpZGUsIGEgXCJmYWtlXCIgdHJpYWwgc2xpZGUgdG8gdHJhbnNpdGlvbiBmcm9tIHRyYWluaW5nIHRvIHRyaWFscyAgICBcbiAgICAgICAgICBwc2lUdXJrLnNob3dQYWdlKCdjb25ncmF0dWxhdGlvbnMuaHRtbCcpO1xuICAgICAgICAgICQoJyNuZXh0Q29uZ3JhdHMnKS5vbignY2xpY2snLCBfLmJpbmQodGhpcy5zYXZlLCB0aGlzKSk7IC8vd2hlbiBzdWJqZWN0IGNsaWNrcyBcIm5leHRcIiwgdGhlIGZ1bmN0aW9uIFwic2F2ZVwiIGlzIGNhbGxlZCB3aXRoIGFyZ3VtZW50IFwidGhpc1wiICh0aGUgYnV0dG9uIGl0c2VsZikgICAgICAgIFxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHBzaVR1cmsuc2hvd1BhZ2UoJ2l0ZW0uaHRtbCcpO1xuICAgICAgICAgICQoJyNuZXh0TWVzc2FnZScpLm9uKCdjbGljaycsIF8uYmluZCh0aGlzLnNhdmUsIHRoaXMpKTsgLy93aGVuIHN1YmplY3QgY2xpY2tzIFwibmV4dFwiLCB0aGUgZnVuY3Rpb24gXCJzYXZlXCIgaXMgY2FsbGVkIHdpdGggYXJndW1lbnQgXCJ0aGlzXCIgKHRoZSBidXR0b24gaXRzZWxmKVxuICAgICAgICAgIHRoaXMudHJpYWwgPSB0aGlzLmFsbFRyaWFsc1t0aGlzLmNvdW50LXRoaXMuYWxsVHJhaW5pbmdzLmxlbmd0aF07IC8vcGlja3MgdGhlIHRoaXMuY291bnQtdGggb2JqZWN0IGNvbnN0cnVjdGVkIGJ5IHNldHVwVHJpYWxcbiAgICAgICAgICB0aGlzLnRyaWFsbnVtYmVyID0gdGhpcy5jb3VudCsxOyAgICAgICAgICBcbiAgICAgICAgICB0aGlzLmluc2VydExpbmVzKHRoaXMudHJpYWwpOyAvL2Z1bmN0aW9uIHVzZWQgdG8gcmVwbGFjZSB0aGUgd2FudGVkIGVsZW1lbnRzIChwaWNrZWQgYnkgaWQsIHNlZSBiZWxvdykgd2l0aCB0aGUgdGV4dC9odG1sLy4uLiBwcm92aWRlZCBpbiBpdGVtcy5qc1xuICAgICAgICAgIHRoaXMudHJpYWxEYXRhLnNwbGljZSgwLCAwLCB0aGlzLnRyaWFsbnVtYmVyLCB0aGlzLnRyaWFsLmtpbmQsIHRoaXMudHJpYWwub3B0aW9uLCB0aGlzLnRyaWFsLnNob3J0RXhwcmVzc2lvbiwgdGhpcy50cmlhbC5jb2xvciwgdGhpcy50cmlhbC5zY2VuYXJpbywgdGhpcy50cmlhbC5xdWQsIHRoaXMudHJpYWwudmFsdWUpO1xuICAgICAgICAgIHRoaXMuc3RhcnQgPSArIG5ldyBEYXRlKCk7Ly9zdGFydGluZyB0aW1lIG9mIHRoZSB0cmlhbFxuICAgICAgICAgIHRoaXMuY291bnQrKzsvL3NlbGYtZXhwbGFuYXRvcnlcbiAgICAgICAgfVxuICAgIH0gXG4gICAgZWxzZSBcbiAgICAgICAgbmV3IFF1ZXN0aW9ubmFpcmUoKS5zdGFydCgpO1xuICB9XG5cbiAgaW5zZXJ0TGluZXModCkgey8vd2hlcmUgdCBpcyBhIHZhcmlhYmxlcyBmb3IgdHJpYWxzLCBpbiB0aGlzIGNhc2UgaW5zdGFudGlhdGVkIHdpdGggdGhpcy50cmlhbFxuICAgIFxuICAgICQoJyNzZW5kZXJwaWMnKS5odG1sKHQuc2VuZGVycGljKTsgIFxuICAgICQoJyNxdWRQaWMnKS5odG1sKHQucXVkUGljKTtcbiAgICAkKCcjdXJuUGljJykuaHRtbCh0LnVyblBpYyk7ICAgIFxuICAgICQoJyNhbnN3ZXJQaWMnKS5odG1sKHQuYW5zd2VyUGljKTtcbiAgICAkKCcjZGVzY3JpcHRpb24nKS5odG1sKHQuZGVzY3JpcHRpb24pO1xuICAgICQoJyNtZXNzYWdlJykuaHRtbCh0Lm1lc3NhZ2UpO1xuICAgICQoJyNxdWVzdGlvbicpLmh0bWwodC5xdWVzdGlvbik7XG4gICAgJCgnI3BvbGFyYnV0dG9uJykuaHRtbCh0LnBvbGFyYnV0dG9uKTtcbiAgICAkKCcjYmV0YnV0dG9uJykuaHRtbCh0LmJldGJ1dHRvbik7XG4gICAgJCgnI3BlcmNlbnRhZ2UnKS50ZXh0KE1hdGguZmxvb3IodC5wZXJjZW50YWdlKSk7IC8vdXNlZCB0byBkaXNwbGF5IHRoZSBwcm9ncmVzcyB0byB0aGUgc3ViamVjdFxuIFxuICB9XG5cbiAgICAgICBcbiBzYXZlKGUpIHsgLy9mdW5jdGlvbiBjYWxsZWQgd2hlbiB0aGUgc3ViamVjdCBjbGlja3Mgb24gYnV0dG9uIFwibmV4dFwiXG4gICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHR2YXIgUlQgPSArIG5ldyBEYXRlKCkgLSB0aGlzLnN0YXJ0Oy8vIHJlY29yZCByZWFjdGlvbiB0aW1lXG4gICAgdmFyIGlucHV0X3F1ZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCduZXh0UXVkJykudmFsdWU7XG4gICAgdmFyIGlucHV0X2JldCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCduZXh0QmV0JykudmFsdWU7XG4gICAgaWYgKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCduZXh0Q29uZ3JhdHMnKSE9PW51bGwpIHtcbiAgICAgICAgdmFyIGlucHV0X2NvbmdyYXRzPWRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCduZXh0Q29uZ3JhdHMnKS52YWx1ZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgaW5wdXRfY29uZ3JhdHM9Jyc7ICAgIFxuICAgICAgICB9XG4gICAgdmFyIGlucHV0X21lc3NhZ2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmV4dE1lc3NhZ2UnKS52YWx1ZTsgICBcbiAgICAgXG4gICAgaWYgKGlucHV0X2NvbmdyYXRzPT0ncGxhY2Vob2xkZXInKXsgLy90aGUgdmFsdWUgYXNzb2NpYXRlZCB3aXRoIHRoZSBMZXQnZ28hIGJ1dHRvbiBpbiBjb25ncmF0dWxhdGlvbnMgc2xpZGUsbm8gZGF0YSB0byByZWNvcmRcbiAgICAgICAgIHRoaXMudHJpYWxEYXRhID0gW107Ly9lbXB0eSB0aGUgZGF0YSwgZm9yIHRoZSBuZXh0IHRyaWFsXG4gICAgICAgICB0aGlzLm5leHQoKTsgICAgICAgICBcbiAgICAgfVxuICAgICBlbHNlIHtcbiAgICAgICAgdGhpcy50cmlhbERhdGEgPSB0aGlzLnRyaWFsRGF0YS5jb25jYXQoaW5wdXRfcXVkLGlucHV0X2JldCxpbnB1dF9tZXNzYWdlLCBSVCk7Ly9hcHBlbmQgYW5zd2VyIGFuZCBSVCB0byB0aGUgb3RoZXIgZGF0YSBvZiB0aGlzIHRyaWFsIChraW5kLGFjY2VzcyBldGMuKSAgICAgXG4gICAgICAgIHBzaVR1cmsucmVjb3JkVHJpYWxEYXRhKHRoaXMudHJpYWxEYXRhKTtcblx0XHQgICAgXG4gICAgICAgIHRoaXMudHJpYWxEYXRhID0gW107Ly9lbXB0eSB0aGUgZGF0YSwgZm9yIHRoZSBuZXh0IHRyaWFsXG4gICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmV4dFF1ZCcpLnZhbHVlPVwiZG90c1wiIC8vcmVzZXQgdGhlIGJ1dHRvbiB2YWx1ZSB0byBlbXB0eSwgZm9yIHRoZSBuZXh0IHRyaWFsXG4gICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmV4dEJldCcpLnZhbHVlPVwiZG90c1wiIC8vcmVzZXQgdGhlIGJ1dHRvbiB2YWx1ZSB0byBlbXB0eSwgZm9yIHRoZSBuZXh0IHRyaWFsXG4gICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbmV4dE1lc3NhZ2UnKS52YWx1ZT1cImRvdHNcIiAvL3Jlc2V0IHRoZSBidXR0b24gdmFsdWUgdG8gZW1wdHksIGZvciB0aGUgbmV4dCB0cmlhbFxuICAgICAgICB0aGlzLm5leHQoKTtcbiAgICAgfVxuICB9XG4gICAgXG5cblxuICBzdGFydCgpIHtcbiAgICBwc2lUdXJrLnNob3dQYWdlKCdpdGVtX3QuaHRtbCcpO1xuICAgICQoJyNuZXh0QmV0Jykub24oJ2NsaWNrJywgXy5iaW5kKHRoaXMuc2F2ZSwgdGhpcykpOyAvL3doZW4gc3ViamVjdCBjbGlja3MgXCJuZXh0XCIsIHRoZSBmdW5jdGlvbiBcInNhdmVcIiBpcyBjYWxsZWQgd2l0aCBhcmd1bWVudCBcInRoaXNcIiAodGhlIGJ1dHRvbiBpdHNlbGYpXG4gICAgdGhpcy5uZXh0KCk7IC8vZGVmaW5lZCBhYm92ZVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gRXhwZXJpbWVudDtcbiIsIm1vZHVsZS5leHBvcnRzID0gbmV3IFBzaVR1cmsodW5pcXVlSWQsIGFkU2VydmVyTG9jLCBtb2RlKTtcbiIsInZhciBwc2lUdXJrID0gcmVxdWlyZSgnLi4vcHNpdHVyaycpO1xuXG5cbmNsYXNzIFF1ZXN0aW9ubmFpcmUge1xuXG4gIHNhdmVfZGF0YShsYW5ndWFnZSkge1xuXHR2YXIgY29tbWVudHMgPSAkKCcjY29tbWVudCcpLnZhbCgpO1xuICAgIHBzaVR1cmsucmVjb3JkVHJpYWxEYXRhKHsncGhhc2UnOidwb3N0cXVlc3Rpb25uYWlyZScsICdzdGF0dXMnOidzdWJtaXQnfSk7XG4gICAgcHNpVHVyay5yZWNvcmRUcmlhbERhdGEoW2xhbmd1YWdlXSk7XG5cdHBzaVR1cmsucmVjb3JkVHJpYWxEYXRhKFtjb21tZW50c10pO1xuICAgIHBzaVR1cmsucmVjb3JkVW5zdHJ1Y3R1cmVkRGF0YSgnbGFuZ3VhZ2UnLCBsYW5ndWFnZSk7XG4gICAgcHNpVHVyay5yZWNvcmRVbnN0cnVjdHVyZWREYXRhKCdjb21tZW50cycsIGNvbW1lbnRzKTtcbiAgICBcblx0JCgnc2VsZWN0JykuZWFjaChmdW5jdGlvbihpLCB2YWwpIHtcbiAgICAgIHBzaVR1cmsucmVjb3JkVHJpYWxEYXRhKFt0aGlzLnZhbHVlXSk7XG4gICAgfSk7XG4gIH1cblxuICByZWNvcmRfcmVzcG9uc2VzKCkge1xuICAgIC8vIHNhdmUgdGhlaXIgbmF0aXZlIGxhbmd1YWdlXG4gICAgdmFyIGxhbmd1YWdlID0gJCgnI2xhbmd1YWdlJykudmFsKCk7XG4gICAgdGhpcy5MQU5HVUFHRSA9IGZhbHNlO1xuICAgIFxuICAgICQoJ3NlbGVjdCcpLmVhY2goZnVuY3Rpb24oaSwgdmFsKSB7XG4gICAgICBwc2lUdXJrLnJlY29yZFVuc3RydWN0dXJlZERhdGEodGhpcy5pZCwgdGhpcy52YWx1ZSk7XG4gICAgfSk7XG5cbiAgICBpZiAobGFuZ3VhZ2UgPT09ICcnKSB7XG4gICAgICBhbGVydCgnUGxlYXNlIGluZGljYXRlIHlvdXIgbmF0aXZlIGxhbmd1YWdlLicpO1xuICAgICAgJCgnI2xhbmd1YWdlJykuZm9jdXMoKTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLkxBTkdVQUdFID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5zYXZlX2RhdGEobGFuZ3VhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIHByb21wdF9yZXN1Ym1pdCgpIHtcbiAgICB2YXIgZXJyb3IgPSBbXCI8aDE+T29wcyE8L2gxPjxwPlNvbWV0aGluZyB3ZW50IHdyb25nIHN1Ym1pdHRpbmcgeW91ciBISVQuXCIsXG4gICAgICAgICAgICAgICAgIFwiVGhpcyBtaWdodCBoYXBwZW4gaWYgeW91IGxvc2UgeW91ciBpbnRlcm5ldCBjb25uZWN0aW9uLlwiLFxuICAgICAgICAgICAgICAgICBcIlByZXNzIHRoZSBidXR0b24gdG8gcmVzdWJtaXQuPC9wPjxidXR0b24gaWQ9J3Jlc3VibWl0Jz5SZXN1Ym1pdDwvYnV0dG9uPlwiXS5qb2luKCcgJyk7XG4gICAgJCgnYm9keScpLmh0bWwoZXJyb3IpO1xuICAgICQoJyNyZXN1Ym1pdCcpLm9uKCdjbGljaycsIF8uYmluZCh0aGlzLnJlc3VibWl0LCB0aGlzKSk7XG4gIH1cblxuICByZXN1Ym1pdCgpIHtcbiAgICAkKCdib2R5JykuaHRtbCgnPGgxPlRyeWluZyB0byByZXN1Ym1pdC4uLjwvaDE+Jyk7XG4gICAgdmFyIHJlcHJvbXB0ID0gc2V0VGltZW91dChfLmJpbmQodGhpcy5wcm9tcHRfcmVzdWJtaXQsIHRoaXMpLCAxMDAwMCk7XG4gICAgaWYgKCF0aGlzLkxBTkdVQUdFKSB0aGlzLnNhdmVfZGF0YSgnTkEnKTtcblxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICBwc2lUdXJrLnNhdmVEYXRhKHtcbiAgICAgIHN1Y2Nlc3M6ICgpID0+IHtcbiAgICAgICAgY2xlYXJJbnRlcnZhbChyZXByb21wdCk7IFxuICAgICAgICBwc2lUdXJrLmNvbXBsZXRlSElUKCk7XG4gICAgICB9LFxuICAgICAgZXJyb3I6IF8uYmluZCh0aGlzLnByb21wdF9yZXN1Ym1pdCwgdGhpcylcbiAgICB9KTtcbiAgfVxuXG4gIHN0YXJ0KCkge1xuICAgIC8vIExvYWQgdGhlIHF1ZXN0aW9ubmFpcmUgc25pcHBldCBcbiAgICBwc2lUdXJrLnNob3dQYWdlKCdwb3N0cXVlc3Rpb25uYWlyZS5odG1sJyk7XG4gICAgcHNpVHVyay5yZWNvcmRUcmlhbERhdGEoeydwaGFzZSc6J3Bvc3RxdWVzdGlvbm5haXJlJywgJ3N0YXR1cyc6J2JlZ2luJ30pO1xuXG4gICAgJCgnI25leHQnKS5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgICB0aGlzLnJlY29yZF9yZXNwb25zZXMoKTtcbiAgICAgIHBzaVR1cmsuc2F2ZURhdGEoe1xuICAgICAgICBzdWNjZXNzOiBwc2lUdXJrLmNvbXBsZXRlSElULFxuICAgICAgICBlcnJvcjogXy5iaW5kKHRoaXMucHJvbXB0X3Jlc3VibWl0LCB0aGlzKVxuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBRdWVzdGlvbm5haXJlO1xuIiwiLy8gZGVmaW5lIGEgZnVuY3Rpb24gdG8gY29uc3RydWN0IGFjdHVhbCB0cmlhbHNcbmZ1bmN0aW9uIHNldHVwVHJpYWxzKCkge1xuICAgIFxuICAgIHZhciBjb25kaXRpb25zID0gXy5zaHVmZmxlKFsnY29udHJvbCcsJ2NvbnRyb2wnLCdjb250cm9sJywnY29udHJvbCcsWydkdWFsJywncG9sYXInLDNdLFsnZHVhbCcsJ3BvbGFyJyw0XSxbJ2R1YWwnLCdwb2xhcicsNV0sWydkdWFsJywnd2gnLDNdLFsnZHVhbCcsJ3doJyw0XSxbJ2R1YWwnLCd3aCcsNV0sWydwbHVyYWwnLCd3aCcsM10sWydwbHVyYWwnLCd3aCcsNF0sWydwbHVyYWwnLCd3aCcsNV0sWydwbHVyYWwnLCdwb2xhcicsM10sWydwbHVyYWwnLCdwb2xhcicsNF0sWydwbHVyYWwnLCdwb2xhcicsNV1dKVxuICAgIC8vdmFyIGNvbmRpdGlvbnMgPSBfLnNodWZmbGUoWydjb250cm9sJywnY29udHJvbCcsJ2NvbnRyb2wnLCdjb250cm9sJyxbJ2R1YWwnLCdwb2xhcicsNV0sWydkdWFsJywncG9sYXInLDVdLFsnZHVhbCcsJ3BvbGFyJyw1XSxbJ2R1YWwnLCd3aCcsNV0sWydkdWFsJywnd2gnLDVdLFsnZHVhbCcsJ3doJyw1XSxbJ3BsdXJhbCcsJ3doJyw1XSxbJ3BsdXJhbCcsJ3doJyw1XSxbJ3BsdXJhbCcsJ3doJyw1XSxbJ3BsdXJhbCcsJ3BvbGFyJyw1XSxbJ3BsdXJhbCcsJ3BvbGFyJyw1XSxbJ3BsdXJhbCcsJ3BvbGFyJyw1XV0pXG4gICAgXG4gICAgdmFyIHNjZW5hcmlvcyA9IFsnZHVhbCcsJ3BsdXJhbCddOyAvL2R1YWwgc2NlbmFyaW86IGJhbGxzIG9mIHR3byBkaWZmZXJlbnQgY29sb3JzOyBwbHVyYWwgc2NlbmFyaW86ID4yIGRpZmZlcmVudCBjb2xvcnNcbiAgICB2YXIgcXVkcyA9IFsncG9sYXInLCd3aCddOy8vcG9sYXIgcXVkOiB3aWxsIHRoZSBiYWxsIGJlIGJsYWNrL3JlZD8gOyB3aCBxdWQ6IHdoYXQgY29sb3Igd2lsbCB0aGUgYmFsbCBiZT9cbiAgICB2YXIgY29udHJvbHMgPSBfLnNodWZmbGUoWzAsMCwxMCwxMF0pO1xuICAgIHZhciBjb2xvcnMgPSBbJ3JlZCcsJ2JsdWUnLCd3aGl0ZScsJ2JsYWNrJ107XG4gICAgLy92YXIgY29sb3JzID0gWydyZWQnLCdyZWQnLCdyZWQnLCdyZWQnXTtcbiAgXHR2YXIgaG93bWFueSA9IGNvbmRpdGlvbnMubGVuZ3RoIC8vaG93IG1hbnkgdHJpYWxzIGRlcGVuZHMgb24gaG93IG1hbnkgdmFsdWVzIHdlIHdhbnQgdG8gdGVzdFxuXG4gICAgdmFyIHF1ZFBpYyA9IFwiPGltZyBpZD0ncVBpYycgc3JjPScvc3RhdGljL2ltYWdlcy97UX0te0N9LnBuZyc+XCI7IC8vIHRlbXBsYXRlcyBmb3IgcGljdHVyZXMgdXNlZCBpbiBzdGltdWxpOyBFIGZvciBleHByZXNzaW9uLCBWIGZvciB2YWx1ZSwgQyBmb3IgY29sb3IsIFMgZm9yIHNjZW5hcmlvLCBRIGZvciBxdWRcbiAgICB2YXIgdXJuUGljID0gXCI8aW1nIGlkPSd1UGljJyBzcmM9Jy9zdGF0aWMvaW1hZ2VzL3tTfS17Q30te1Z9LnBuZycgYWxpZ249J2JvdHRvbSc+XCI7XG4gICAgdmFyIGFuc3dlclBpYyA9IFwiPGltZyBpZD0nYVBpYycgc3JjPScvc3RhdGljL2ltYWdlcy97RX0te0N9LnBuZyc+XCI7XG4gICAgXG4gICAgdmFyIHF1ZXN0aW9uID0ge1xuICAgICAgICAncG9sYXInIDogXCJUaGUgcmVjZWl2ZXIgYXNrczogPGI+d2lsbCB0aGUgYmFsbCBiZSB7Q30/PC9iPlwiLCAvL3tDfSB0byBiZSByZXBsYWNlZCB3aXRoIHJhbmRvbWx5IHBpY2tlZCBjb2xvclxuICAgICAgICAnd2gnIDogXCJUaGUgcmVjZWl2ZXIgYXNrczogPGI+d2hpY2ggY29sb3Igd2lsbCB0aGUgYmFsbCBiZT88L2I+XCJcbiAgICB9XG4gICAgdmFyIHJlcyA9IF8ubWFwKF8ucmFuZ2UoMCwgaG93bWFueSksICh3KSA9PiB7IC8vdGhpcyBmdW5jdGlvbiBnZW5lcmF0ZXMgfGhvd21hbnl8IHRyaWFscywgZWFjaCBiZWluZyBhbiBvYmplY3Qgd2l0aCBzZXZlcmFsIHByb3BlcnRpZXNcblxuICAgIHZhciB0cmlhbCA9IHt9O1xuICAgIHRyaWFsLmtpbmQ9XCJ0cmlhbFwiO1xuICAgIHRyaWFsLmNvbG9yPWNvbG9yc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqNCldOy8vcmFuZG9tbHkgcGljayBhIGNvbG9yIGZvciB0aGUgdHJpYWxcbiAgICB0cmlhbC5jb25kaXRpb24gPSBjb25kaXRpb25zLnNoaWZ0KCk7Ly9zZWxlY3RzIGEgcHJldmlvdXNseSB1bnNlbGVjdGVkIGNvbmRpdGlvblxuICAgIFxuICAgIGlmICh0cmlhbC5jb25kaXRpb249PSdjb250cm9sJyl7IC8vY29udHJvbCB0cmlhbHMgbmVlZCBub3QgYmUgJ2V4aGF1c3RpdmUnLCB3ZSBzaW1wbHkgcnVuIDQgb2YgdGhlbSB0d28gZm9yIGVhY2ggdmFsdWUgKDAsMTApIGFuZCByYW5kb21pemVkIHBpY2sgb2Ygc2NlbmFyaW8vcXVkXG4gICAgICAgIHRyaWFsLmNvbnRyb2w9dHJ1ZTsgLy8gZmxhZyB0aGlzIGFzIGNvbnRyb2wgdHJpYWxcbiAgICAgICAgdHJpYWwudmFsdWUgPSBjb250cm9scy5zaGlmdCgpOy8vc2VsZWN0IGEgcHJldmlvdXNseSB1bnNlbGVjdGVkIGNvbnRyb2wgdmFsdWVcbiAgICAgICAgdHJpYWwucXVkPXF1ZHNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpKjIpXTsgLy8gcmFuZG9tbHkgcGljayBvbmUgcXVkIGZvciB0aGUgY29udHJvbCB0cmlhbFxuICAgICAgICB0cmlhbC5zY2VuYXJpbyA9IHNjZW5hcmlvc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMildIC8vcmFuZG9tbHkgcGljayBvbmUgc2NlbmFyaW8gICAgICAgIFxuICAgIH1lbHNleyAvL2NyaXRpY2FsIHRyaWFscyBoYXZlIGFsbCB0aGUgaW5mbyBlbmNvZGVkIGluIHRoZSBjb25kaXRpb24gb2JqZWN0XG4gICAgICAgIHRyaWFsLmNvbnRyb2w9ZmFsc2U7IC8vIGZsYWcgdGhpcyBhcyBjcml0aWNhbCB0cmlhbFxuICAgICAgICB0cmlhbC5xdWQ9dHJpYWwuY29uZGl0aW9uWzFdO1xuICAgICAgICB0cmlhbC5zY2VuYXJpbyA9IHRyaWFsLmNvbmRpdGlvblswXTtcbiAgICAgICAgdHJpYWwudmFsdWUgPSB0cmlhbC5jb25kaXRpb25bMl1cbiAgICB9ICAgIFxuICAgICAgICBcbiAgICAgIFxuICAgIHRyaWFsLnF1ZXN0aW9uPXF1ZXN0aW9uW3RyaWFsLnF1ZF07XG4gICAgICAgIFxuICAgIGlmICh0cmlhbC5xdWQ9PSdwb2xhcicpe3RyaWFsLnF1ZXN0aW9uPXRyaWFsLnF1ZXN0aW9uLnJlcGxhY2UoJ3tDfScsIHRyaWFsLmNvbG9yKX1cbiAgICAgICAgXG4gICAgaWYgKHRyaWFsLnF1ZD09J3BvbGFyJyl7XG4gICAgICAgIHRyaWFsLnF1ZFBpYz1xdWRQaWMucmVwbGFjZSgne1F9JywgdHJpYWwucXVkKS5yZXBsYWNlKCd7Q30nLHRyaWFsLmNvbG9yKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB0cmlhbC5xdWRQaWM9cXVkUGljLnJlcGxhY2UoJ3tRfScsIHRyaWFsLnF1ZCkucmVwbGFjZSgne0N9JywgJ2RvdHMnKTtcbiAgICB9O1xuICAgICAgICBcblxuICAgIHRyaWFsLnVyblBpYz11cm5QaWMucmVwbGFjZSgne1N9JywgdHJpYWwuc2NlbmFyaW8pLnJlcGxhY2UoJ3tDfScsIHRyaWFsLmNvbG9yKS5yZXBsYWNlKCd7Vn0nLCB0cmlhbC52YWx1ZSk7XG4gICAgdHJpYWwuYW5zd2VyUGljPWFuc3dlclBpYy5yZXBsYWNlKCd7RX0nLCAnZG90cycpLnJlcGxhY2UoJ3tDfScsIHRyaWFsLmNvbG9yKTtcbiAgICB0cmlhbC52PXc7IC8vdXNlZCB0byBjb3VudCB0aGUgdHJpYWxzXG4gICAgdHJpYWwucGVyY2VudGFnZSA9ICgxMDAqdHJpYWwudikvaG93bWFueSAvL3dlIGRpc3BsYXkgcHJvZ3Jlc3MgdG8gdGhlIHBhcnRpY2lwYW50IGFzICVcbiAgICB0cmlhbC5zaG9ydEV4cHJlc3Npb249XCJub21hdHRlclwiOyAgICBcbiAgICB0cmlhbC5vcHRpb249XCJub21hdHRlclwiOyAgICBcbiAgICByZXR1cm4gdHJpYWw7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhyZXMpOy8vSSBkb24ndCBrbm93IHdoeSB0aGlzIGlzIGhlcmVcblxuICAgIHJldHVybiByZXM7XG4gICAgXG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR1cFRyaWFscztcbiIsIi8vIGRlZmluZSBhIGZ1bmN0aW9uIHRvIGNvbnN0cnVjdCB0cmFpbmluZyB0cmlhbHNcbmZ1bmN0aW9uIHNldHVwVHJhaW5pbmdzKCkge1xuICAgIFxuICAgIHZhciBvcHRpb25zID0gXy5zaHVmZmxlKFsnc2luZ2xlYmV0JywnbXVsdGliZXQnLCdzaW5nbGViZXQnLCdtdWx0aWJldCddKTsgLy9iZXR0aW5nIG9wdGlvbiBvZmZlcmVkIHRvIHN1YmplY3Q7IHNpbmdsZWJldDogZWl0aGVyIGJldCBvbiByZWQsIG9yIGRvbnQgYmV0IGF0IGFsbDsgbXVsdGliZXQ6IGJldCBvbiBYIHdoZXJlIFggb25lIG9mIHRoZSBwb3NzaWJsZSBjb2xvcnMsIG9yIGRvbnQgYmV0IGF0IGFsbFxuICAgIHZhciBjb2xvcnMgPSBbJ3JlZCcsICdibGFjayddOyAvL3R3byBwb3NzaWJsZSBmb2NhbCBjb2xvciwgbm90IHJlYWxseSBpbXBvcnRhbnQgYnV0IHRvIGFkZCBzb21lIHZhcmlhdGlvbnMsIG1ha2UgaXQgbGVzcyBib3JpbmdcbiAgICB2YXIgZXhwcmVzc2lvbnMgPSBfLnNodWZmbGUoWydjZXJ0Tm90JywncHJvYk5vdCcsJ3Byb2InLCdjZXJ0J10pOyAvL2Egc2h1ZmZsZWQgbGlzdCBvZiBleHByZXNzaW9ucywgaWUgdGhlIHJlcGx5cyBzZW50IGJ5IHRoZSBzcGVha2VyXG5cdHZhciBob3dtYW55ID0gMzsgLy9ob3cgbWFueSB0cmlhbHM/IFxuICAgIFxuICAgIHZhciBkZXNjcmlwdGlvbiA9IHsvL2Egc3RydWN0dXJlZCBvYmplY3QsIGZ1bmN0aW9uIG9mIHRoZSBzZWxlY3RlZCBvcHRpb24gIFxuICAgICAgICAgICAgJ3NpbmdsZWJldCc6IFwiWW91IGNhbiBiZXQgb24gPGI+PGZvbnQgY29sb3I9J3tDMX0nPntDMn08L2ZvbnQ+PC9iPiBvciBkb24ndCBiZXQgYXQgYWxsLlwiLFxuICAgICAgICAgICAgJ211bHRpYmV0JzogXCJZb3UgY2FuIGJldCBvbiA8Yj48Zm9udCBjb2xvcj0nYmxhY2snPmJsYWNrPC9mb250PjwvYj4gb3IgPGI+PGZvbnQgY29sb3I9J2JsdWUnPmJsdWU8L2ZvbnQ+PC9iPiBvciA8Yj48Zm9udCBjb2xvcj0ncmVkJz5yZWQ8L2ZvbnQ+PC9iPiBvciA8c3BhbiBzdHlsZT0nYmFja2dyb3VuZC1jb2xvcjpibGFjazsnPjxiPjxmb250IGNvbG9yPSd3aGl0ZSc+d2hpdGU8L3N0eWxlPjwvZm9udD48L2I+PC9zcGFuPiBvciBkb24ndCBiZXQgYXQgYWxsLlwiXG4gICAgfTtcbiAgICB2YXIgbWVzc2FnZSA9IFwiVGhlIHNlbmRlciBzYXlzOiA8Yj50aGUgYmFsbCB3aWxsIHtFfSBiZSB7QzF9PC9iPlwiOyAvL3tFfSB0byBiZSByZXBsYWNlZCB3aXRoIHJhbmRvbWx5IHBpY2tlZCBtZXNzYWdlIGluIGVhY2ggdHJpYWwsIHtDfXMgd2l0aCBwaWNrZWQgY29sb3JcbiAgICB2YXIgbG9uZ0V4cHJlc3Npb25zPXsgLy9kaWN0aW9uYXJ5IGZyb20gYWJicmV2aWF0ZWQgZXhwcmVzc2lvbiB0byByZWFsIGxhbmd1YWdlXG4gICAgICAgICdjZXJ0Tm90JzonY2VydGFpbmx5IG5vdCcsXG4gICAgICAgICdwcm9iTm90JzoncHJvYmFibHkgbm90JyxcbiAgICAgICAgJ3Byb2InOidwcm9iYWJseScsXG4gICAgICAgICdjZXJ0JzonY2VydGFpbmx5JyAgICAgICAgXG4gICAgfTtcbiAgICBcbiAgICB2YXIgc2VuZGVycGljID0gXCI8aW1nIGlkPSdpbWdDb21pYzEnIHNyYz0nL3N0YXRpYy9pbWFnZXMve0V9X3tDfV9zZW5kZXIucG5nJz5cIjsgLy8gdGVtcGxhdGUgZm9yIHN0aW11bGk7IEUgZm9yIGV4cHJlc3Npb24sIEMgZm9yIGNvbG9yXG4gICAgXG4gICAgdmFyIHBvbGFyYnV0dG9uPSc8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBpZD1cInBvbGFyXCIgdmFsdWU9XCJ7QzF9XCIgY2xhc3M9XCJidG4gYnRuLXByaW1hcnkgYnRuLWxnXCIgb25jbGljaz1cInJlcG9ydDAodGhpcy52YWx1ZSlcIj4gd2lsbCBpdCBiZSB7QzJ9PzwvYnV0dG9uPic7IC8vIHtDfXMgdG8gYmUgcmVwbGFjZWQgd2l0aCBwaWNrZWQgY29sb3JcbiAgICB2YXIgYmV0YnV0dG9ucyA9IHsvL2Egc3RydWN0dXJlZCBvYmplY3QsIGZ1bmN0aW9uIG9mIHRoZSBzZWxlY3RlZCBvcHRpb25cbiAgICAgICAgJ3NpbmdsZWJldCc6JzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwie0MxfVwiIHZhbHVlPVwie0MyfVwiIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi1sZ1wiIG9uY2xpY2s9XCJyZXBvcnQodGhpcy52YWx1ZSlcIj5iZXQgb24gPGI+PGZvbnQgY29sb3I9XCJ7QzN9XCI+e0M0fTwvZm9udD48L2I+PC9idXR0b24+JyxcbiAgICAgICAgJ211bHRpYmV0JzonPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJibGFja1wiIHZhbHVlPVwiYmxhY2tcIiBjbGFzcz1cImJ0biBidG4tcHJpbWFyeSBidG4tbGdcIiBvbmNsaWNrPVwicmVwb3J0KHRoaXMudmFsdWUpXCI+YmV0IG9uIDxiPjxmb250IGNvbG9yPVwiYmxhY2tcIj5ibGFjazwvZm9udD48L2I+PC9idXR0b24+JytcbiAgICAgICAgICAgICAgICAgICAgJyAnKyAgICBcbiAgICAgICAgICAgICAgICAgICAgJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwiYmx1ZVwiIHZhbHVlPVwiYmx1ZVwiIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi1sZ1wiIG9uY2xpY2s9XCJyZXBvcnQodGhpcy52YWx1ZSlcIj5iZXQgb24gPGI+PGZvbnQgY29sb3I9XCJibHVlXCI+Ymx1ZTwvZm9udD48Yi8+PC9idXR0b24+JytcbiAgICAgICAgICAgICAgICAgICAgJyAnK1xuICAgICAgICAgICAgICAgICAgICAnPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgaWQ9XCJyZWRcIiB2YWx1ZT1cInJlZFwiIGNsYXNzPVwiYnRuIGJ0bi1wcmltYXJ5IGJ0bi1sZ1wiIG9uY2xpY2s9XCJyZXBvcnQodGhpcy52YWx1ZSlcIj5iZXQgb24gPGI+PGZvbnQgY29sb3I9XCJyZWRcIj5yZWQ8L2ZvbnQ+PC9iPjwvYnV0dG9uPicrXG4gICAgICAgICAgICAgICAgICAgICcgJytcbiAgICAgICAgICAgICAgICAgICAgJzxidXR0b24gdHlwZT1cImJ1dHRvblwiIGlkPVwid2hpdGVcIiB2YWx1ZT1cIndoaXRlXCIgY2xhc3M9XCJidG4gYnRuLXByaW1hcnkgYnRuLWxnXCIgb25jbGljaz1cInJlcG9ydCh0aGlzLnZhbHVlKVwiPmJldCBvbiA8Yj48Zm9udCBjb2xvcj1cIndoaXRlXCI+d2hpdGU8L2ZvbnQ+PC9iPjwvYnV0dG9uPidcbiAgICB9O1xuICAgICAgICAgXG4gICAgdmFyIHJlcyA9IF8ubWFwKF8ucmFuZ2UoMCwgaG93bWFueSksICh3KSA9PiB7IC8vdGhpcyBmdW5jdGlvbiBnZW5lcmF0ZXMgfGhvd21hbnl8IHRyaWFscywgZWFjaCBiZWluZyBhbiBvYmplY3Qgd2l0aCBzZXZlcmFsIHByb3BlcnRpZXNcbiAgICAgICAgdmFyIHRyaWFsID0ge307XG4gICAgICAgIHRyaWFsLmtpbmQ9XCJ0cmFpbmluZ1wiO1xuICAgICAgICB0cmlhbC5vcHRpb24gPSBvcHRpb25zLnNoaWZ0KCk7Ly9zZWxlY3RzIGEgcHJldmlvdXNseSB1bnNlbGVjdGVkIGJldHRpbmcgb3B0aW9uIFxuICAgICAgICB0cmlhbC5jb2xvciA9IGNvbG9yc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkqMildOyAvLyBcbiAgICAgICAgdHJpYWwuZGVzY3JpcHRpb249ZGVzY3JpcHRpb25bdHJpYWwub3B0aW9uXTsgLy9jcmVhdGUgZGVzY3JpcHRpb24gb2YgdGhlIGJldHRpbmcgb3B0aW9uc1xuICAgICAgICAgICAgaWYgKHRyaWFsLm9wdGlvbj09XCJzaW5nbGViZXRcIil7dHJpYWwuZGVzY3JpcHRpb249dHJpYWwuZGVzY3JpcHRpb24ucmVwbGFjZSgne0MxfScsIHRyaWFsLmNvbG9yKS5yZXBsYWNlKCd7QzJ9JywgdHJpYWwuY29sb3IpfTsvL3JlcGxhY2UgY29sb3Igd2l0aCBwaWNrZWQgdHJpYWwgY29sb3JcbiAgICAgICAgdHJpYWwucG9sYXJidXR0b249cG9sYXJidXR0b24ucmVwbGFjZSgne0MxfScsIHRyaWFsLmNvbG9yKS5yZXBsYWNlKCd7QzJ9JywgdHJpYWwuY29sb3IpOyAvL3JlcGxhY2UgY29sb3IgaW4gdGhlIGJ1dHRvbiB3aXRoIHRoZSBwb2xhciBxdWRcbiAgICAgICAgdHJpYWwuc2hvcnRFeHByZXNzaW9uID0gZXhwcmVzc2lvbnMuc2hpZnQoKTsvL3BpY2sgYSBwcmV2aW91c2x5IHVuc2VsZWN0ZWQgZXhwcmVzc2lvblxuICAgICAgICB0cmlhbC5leHByZXNzaW9uID0gbG9uZ0V4cHJlc3Npb25zW3RyaWFsLnNob3J0RXhwcmVzc2lvbl07IFxuICAgICAgICB0cmlhbC5tZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKCd7RX0nLCB0cmlhbC5leHByZXNzaW9uKS5yZXBsYWNlKCd7QzF9JywgdHJpYWwuY29sb3IpOy8vY3JlYXRlIG1lc3NhZ2UgZGlzcGxheWVkIHRvIHBhcnRpY2lwYW50XG4gICAgICAgIHRyaWFsLmJldGJ1dHRvbj1iZXRidXR0b25zW3RyaWFsLm9wdGlvbl07Ly9jcmVhdGUgYnV0dG9ucyB3aXRoIHRoZSBiZXR0aW5nIG9wdGlvbnNcbiAgICAgICAgICAgIGlmICh0cmlhbC5vcHRpb249PVwic2luZ2xlYmV0XCIpe3RyaWFsLmJldGJ1dHRvbj10cmlhbC5iZXRidXR0b24ucmVwbGFjZSgne0MxfScsIHRyaWFsLmNvbG9yKS5yZXBsYWNlKCd7QzJ9JywgdHJpYWwuY29sb3IpLnJlcGxhY2UoJ3tDM30nLCB0cmlhbC5jb2xvcikucmVwbGFjZSgne0M0fScsIHRyaWFsLmNvbG9yKX07Ly9yZXBsYWNlIGZvY2FsIGNvbG9yXG4gICAgICAgIHRyaWFsLnNlbmRlcnBpYyA9IHNlbmRlcnBpYy5yZXBsYWNlKCd7RX0nLCB0cmlhbC5zaG9ydEV4cHJlc3Npb24pLnJlcGxhY2UoJ3tDfScsIHRyaWFsLmNvbG9yKTtcbiAgICAgICAgdHJpYWwudj13OyAvL3VzZWQgdG8gY291bnQgdGhlIHRyaWFsc1xuICAgICAgICB0cmlhbC5wZXJjZW50YWdlID0gKDEwMCp0cmlhbC52KS9ob3dtYW55IC8vd2UgZGlzcGxheSBwcm9ncmVzcyB0byB0aGUgcGFydGljaXBhbnQgYXMgJVxuICAgICAgICB0cmlhbC5xdWQ9XCJub21hdHRlclwiOyAvL3BsYWNlaG9sZGVyIGFzc2lnbm1lbnRzIHRvIHZhcmlhYmxlcyB3aGljaCBkb250IHBsYXkgYW55IHJvbGUgaW4gdGhlc2UgdHJpYWxzXG4gICAgICAgIHRyaWFsLnNjZW5hcmlvPVwibm9tYXR0ZXJcIjtcbiAgICAgICAgdHJpYWwudmFsdWU9XCJub21hdHRlclwiOyAgXG5cbiAgICAgICAgcmV0dXJuIHRyaWFsO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2cocmVzKTsvL0kgZG9uJ3Qga25vdyB3aHkgdGhpcyBpcyBoZXJlXG5cbiAgICByZXR1cm4gcmVzO1xuICAgIFxufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gc2V0dXBUcmFpbmluZ3M7XG4iLCJ2YXIgcHNpVHVyayA9IHJlcXVpcmUoJy4vcHNpdHVyaycpO1xudmFyIEV4cGVyaW1lbnQgPSByZXF1aXJlKCcuL2V4cGVyaW1lbnQnKTtcblxudmFyIHBhZ2VzID0gW1xuXHRcImluc3RydWN0aW9ucy9pbnN0cnVjdGlvbi5odG1sXCIsXG4gICAgXCJpbnN0cnVjdGlvbnMvaW5zdHJ1Y3Rpb24wLmh0bWxcIixcbiAgICBcImluc3RydWN0aW9ucy9pbnN0cnVjdGlvbjEuaHRtbFwiLFxuICAgIFwiY29uZ3JhdHVsYXRpb25zLmh0bWxcIixcbiAgICBcIml0ZW1fdC5odG1sXCIsXG5cdFwiaXRlbS5odG1sXCIsXG4gICAgXCJwb3N0cXVlc3Rpb25uYWlyZS5odG1sXCJcbl07XG5cbnZhciBpbnN0cnVjdGlvblBhZ2VzID0gW1xuXHRcImluc3RydWN0aW9ucy9pbnN0cnVjdGlvbi5odG1sXCIsXG4gICAgXCJpbnN0cnVjdGlvbnMvaW5zdHJ1Y3Rpb24wLmh0bWxcIixcbiAgICBcImluc3RydWN0aW9ucy9pbnN0cnVjdGlvbjEuaHRtbFwiXG5dO1xuXG5wc2lUdXJrLnByZWxvYWRQYWdlcyhwYWdlcyk7XG5cbi8vIFRhc2sgb2JqZWN0IHRvIGtlZXAgdHJhY2sgb2YgdGhlIGN1cnJlbnQgcGhhc2VcbnZhciBjdXJyZW50dmlldztcbnZhciBleHAgPSBuZXcgRXhwZXJpbWVudCgpO1xuXG4vLyBSVU4gVEFTS1xuJCh3aW5kb3cpLmxvYWQoKCkgPT4ge1xuICAgIHBzaVR1cmsuZG9JbnN0cnVjdGlvbnMoXG4gICAgXHRpbnN0cnVjdGlvblBhZ2VzLC8vIGxpc3Qgb2YgaW5zdHJ1Y3Rpb24gcGFnZXMuIHRoZXkgc2hvdWxkIGNvbnRhaW4gYSBidXR0b24gd2l0aCBjbGFzcz1jb250aW51ZS4gd2hlbiBpdCdzIGNsaWNrZWQsIHRoZSBuZXh0IHBhZ2UgaXMgc2hvd24uIGFmdGVyIHRoZSBsYXN0IG9uZSwgdGhlIGZvbGxvd2luZyBmdW5jIGlzIGNhbGxlZFxuICAgICAgICBmdW5jdGlvbigpIHsgY3VycmVudHZpZXcgPSBleHAuc3RhcnQoKTsgfS8vIHN0YXJ0IGlzIGRlZmluZWQgaW4gZXhwZXJpbWVudC5qc1xuICAgICk7XG59KTtcbiJdfQ==
