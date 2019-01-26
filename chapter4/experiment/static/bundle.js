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
function sliderLabel(i) {
  return 'slider' + i.toString();
}
var responses = [];
var nResponses = 0;
function resetRadio() {
  $('#radios').children().children().prop('checked', false);
}
function resetSlider() {
  _.each($('.slider'), function(slider) {
    $(slider).slider('option', 'value', 0.5);
    $(slider).css({
      'background': '',
      'border-color': ''
    });
  });
  responses = [];
  nResponses = 0;
}
function changeCreator(i) {
  return function(value) {
    $('#' + sliderLabel(i)).css({"background": "#99D6EB"});
    $('#' + sliderLabel(i) + ' .ui-slider-handle').css({
      "background": "#667D94",
      "border-color": "#001F29"
    });
    if (responses[i] === undefined) {
      responses[i] = 1;
      nResponses += 1;
    }
  };
}
function slideCreator(i) {
  return function() {
    $('#' + sliderLabel(i) + ' .ui-slider-handle').css({
      "background": "#E0F5FF",
      "border-color": "#001F29"
    });
  };
}
function insertBins(nbins, toclone) {
  var i = 0;
  while (nbins--) {
    var clone = toclone.clone();
    clone.attr('id', 'bin' + nbins);
    clone.insertAfter($('#bin-after'));
  }
}
function insertSliders(nbins, toclone) {
  var i = 0;
  while (nbins--) {
    var clone = toclone.clone();
    clone.children().attr('id', 'slider' + nbins);
    clone.insertAfter($('#slider-after'));
  }
}
function insertRadio() {
  var i = -1;
  var input = '<input type="radio" name="answer" />';
  var el = $('#bins').clone();
  $(el).attr('id', 'radios');
  $(el).children().html(input).attr('id', function() {
    return 'radio' + i++;
  });
  $(el).insertBefore($('#bins'));
  $('#radios > td[width="150"]').children().attr('type', 'hidden');
}
function createSliders(nbins) {
  var i;
  var attr = {
    "width": "12px",
    "height": "360px",
    "position": "relative",
    "margin": "5px"
  };
  for (i = 0; i < nbins; i++) {
    var label = sliderLabel(i);
    $('#' + label).attr(attr);
    $('#' + label + ' .ui-slider-handle').attr({"background": "#FAFAFA"});
    $('#' + label).slider({
      animate: true,
      orientation: "vertical",
      max: 1,
      min: 0,
      step: 0.01,
      value: 0.5,
      slide: slideCreator(i),
      change: changeCreator(i)
    });
  }
}
var psiTurk = require('./psiturk');
var setupTrials = require('./specific/items');
var Questionnaire = require('./specific/ending');
var Experiment = function() {
  var count = 0;
  var nbins = 11;
  var bins = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  var MAXBINS = 11;
  var bin_clone = $('<td class="toclone" id="bin-toclone" align="center" width="100"></td>');
  var slider_clone = $('<td class="toclone" rowspan="5" width="100" align="center"> <div class="slider ui-slider ui-slider-vertical ui-widget ui-widget-content ui-corner-all" id="slider-clone" width="12px" height="360px" position="relative" margin="5px" aria-disabled="false"> <a class="ui-slider-handle ui-state-default ui-corner-all" href="#" style="bottom: 50%;"></a> </div> </td>');
  var trialData = [];
  var start = +new Date();
  var allTrials = setupTrials();
  var next = function() {
    if (count < allTrials.length) {
      var trial = allTrials[count++];
      trialData.splice(0, 0, parseInt(count), trial.value, trial.access, trial.observation);
      resetSlider();
      insertBins(nbins, bin_clone);
      insertSliders(nbins, slider_clone);
      createSliders(nbins);
      $('#pic').html(trial.pic);
      $('#scenario').text(trial.scenario);
      $('#percentage').text(Math.floor(trial.percentage));
      $('#percentageBis').text(Math.floor(trial.percentageBis));
      _.each(bins, function(bin, i) {
        $('#bin' + i).html(bin);
      });
    } else {
      new Questionnaire().start();
    }
  };
  var save = function(e) {
    e.preventDefault();
    if (nResponses < nbins) {
      var mess = ['Please rate every quantity.', 'If you think that a slider is placed correctly,', 'just click on it.', 'You can only proceed if all sliders have been checked or moved.'].join(' ');
      alert(mess);
      return false;
    }
    var RT = +new Date() - start;
    var ratings = _.map($('.slider'), function(slider) {
      return $(slider).slider('option', 'value');
    });
    while (_.size(ratings) < MAXBINS) {
      ratings.push('NA');
    }
    trialData.splice(0, 0, RT);
    trialData = trialData.concat(ratings);
    console.log(trialData);
    console.log(_.size(trialData));
    psiTurk.recordTrialData(trialData);
    trialData = [];
    $('.toclone').remove();
    next();
  };
  psiTurk.showPage('item.html');
  $('#answered').on('click', save);
  next();
};
module.exports = Experiment;


//# sourceURL=/Users/michele/Dropbox/Documents/Experiments/uncertainty/beliefs/js/static/js/experiment.js
},{"./psiturk":5,"./specific/ending":6,"./specific/items":7}],5:[function(require,module,exports){
"use strict";
module.exports = new PsiTurk(uniqueId, adServerLoc, mode);


//# sourceURL=/Users/michele/Dropbox/Documents/Experiments/uncertainty/beliefs/js/static/js/psiturk.js
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


//# sourceURL=/Users/michele/Dropbox/Documents/Experiments/uncertainty/beliefs/js/static/js/specific/ending.js
},{"../psiturk":5}],7:[function(require,module,exports){
"use strict";
function getRandom(arr, n) {
  var result = new Array(n),
      len = arr.length,
      taken = new Array(len);
  if (n > len)
    throw new RangeError("getRandom: more elements taken than available");
  while (n--) {
    var x = Math.floor(Math.random() * len);
    result[n] = arr[x in taken ? taken[x] : x];
    taken[x] = --len;
  }
  return result;
}
function setupTrials() {
  var allvalues = [10, 11, 20, 21, 22, 30, 31, 32, 33, 40, 41, 42, 43, 44, 50, 51, 52, 53, 54, 55, 60, 61, 62, 63, 64, 65, 66, 70, 71, 72, 73, 74, 75, 76, 77, 80, 81, 82, 83, 84, 85, 86, 87, 88, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 1010];
  var values = getRandom(allvalues, 13);
  var howmany = values.length;
  var pic = '<table class="tg1">' + '<tr>' + '<th class="th1"><img src="/static/images/{VALUE}.png" height="210" width="126"></th>' + '</tr>' + '</table>';
  var scenario = 'You draw {A} balls and observe that {O} of them {COPULA} red.';
  var res = _.map(_.range(0, howmany), (function(w) {
    var trial = {};
    trial.value = values.shift();
    trial.valueBack = trial.value + "back";
    if (trial.value == 1010) {
      trial.access = 10;
      trial.observation = 10;
    } else {
      trial.access = Math.floor(trial.value / 10);
      trial.observation = Math.round(10 * ((trial.value / 10) % 1));
    }
    ;
    trial.pic = pic.replace('{VALUE}', trial.value).replace('{VALUEback}', trial.valueBack);
    if (trial.value == 10) {
      trial.scenario = 'You draw one ball and observe that it is not red.';
    } else if (trial.value == 11) {
      trial.scenario = 'You draw one ball and observe that it is red.';
    } else {
      if (trial.access == trial.observation) {
        if (trial.access == 10) {
          trial.scenario = scenario.replace('{A}', "all the");
        } else {
          trial.scenario = scenario.replace('{A}', trial.access);
        }
        ;
        trial.scenario = trial.scenario.replace('{O}', "all");
      } else {
        if (trial.access == 10) {
          trial.scenario = scenario.replace('{A}', "all the");
        } else {
          trial.scenario = scenario.replace('{A}', trial.access);
        }
        ;
        if (trial.observation === 0) {
          trial.scenario = trial.scenario.replace('{O}', "none");
        } else {
          trial.scenario = trial.scenario.replace('{O}', trial.observation);
        }
      }
    }
    if (trial.observation == 1) {
      trial.scenario = trial.scenario.replace('{COPULA}', "is");
    } else {
      trial.scenario = trial.scenario.replace('{COPULA}', "are");
    }
    trial.v = w;
    trial.percentage = (100 * trial.v) / howmany;
    trial.percentageBis = (100 * trial.v) / howmany;
    return trial;
  }));
  console.log(res);
  return res;
}
module.exports = setupTrials;


//# sourceURL=/Users/michele/Dropbox/Documents/Experiments/uncertainty/beliefs/js/static/js/specific/items.js
},{}],8:[function(require,module,exports){
"use strict";
var psiTurk = require('./psiturk');
var Experiment = require('./experiment');
var pages = ["instructions/instruction.html", "instructions/instruction1.html", "instructions/instruction2.html", "item.html", "postquestionnaire.html"];
var instructionPages = ["instructions/instruction.html", "instructions/instruction1.html", "instructions/instruction2.html"];
psiTurk.preloadPages(pages);
var currentview;
$(window).load((function() {
  psiTurk.doInstructions(instructionPages, function() {
    currentview = new Experiment();
  });
}));


//# sourceURL=/Users/michele/Dropbox/Documents/Experiments/uncertainty/beliefs/js/static/js/task.js
},{"./experiment":4,"./psiturk":5}]},{},[3,8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcGF0aC1icm93c2VyaWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy90cmFjZXVyL2Jpbi90cmFjZXVyLXJ1bnRpbWUuanMiLCIvVXNlcnMvbWljaGVsZS9Ecm9wYm94L0RvY3VtZW50cy9FeHBlcmltZW50cy91bmNlcnRhaW50eS9iZWxpZWZzL2pzL3N0YXRpYy9qcy9leHBlcmltZW50LmpzIiwiL1VzZXJzL21pY2hlbGUvRHJvcGJveC9Eb2N1bWVudHMvRXhwZXJpbWVudHMvdW5jZXJ0YWludHkvYmVsaWVmcy9qcy9zdGF0aWMvanMvcHNpdHVyay5qcyIsIi9Vc2Vycy9taWNoZWxlL0Ryb3Bib3gvRG9jdW1lbnRzL0V4cGVyaW1lbnRzL3VuY2VydGFpbnR5L2JlbGllZnMvanMvc3RhdGljL2pzL3NwZWNpZmljL2VuZGluZy5qcyIsIi9Vc2Vycy9taWNoZWxlL0Ryb3Bib3gvRG9jdW1lbnRzL0V4cGVyaW1lbnRzL3VuY2VydGFpbnR5L2JlbGllZnMvanMvc3RhdGljL2pzL3NwZWNpZmljL2l0ZW1zLmpzIiwiL1VzZXJzL21pY2hlbGUvRHJvcGJveC9Eb2N1bWVudHMvRXhwZXJpbWVudHMvdW5jZXJ0YWludHkvYmVsaWVmcy9qcy9zdGF0aWMvanMvdGFzay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2Z0ZBO0FBQUEsT0FBUyxZQUFVLENBQUUsQ0FBQSxDQUFHO0FBQ3RCLE9BQU8sQ0FBQSxRQUFPLEVBQUksQ0FBQSxDQUFBLFNBQVMsQUFBQyxFQUFDLENBQUM7QUFDaEM7QUFBQSxBQUVJLEVBQUEsQ0FBQSxTQUFRLEVBQUksR0FBQyxDQUFDO0FBQ2xCLEFBQUksRUFBQSxDQUFBLFVBQVMsRUFBSSxFQUFBLENBQUM7QUFHbEIsT0FBUyxXQUFTLENBQUMsQUFBQyxDQUFFO0FBQ3BCLEVBQUEsQUFBQyxDQUFDLFNBQVEsQ0FBQyxTQUFTLEFBQUMsRUFBQyxTQUFTLEFBQUMsRUFBQyxLQUFLLEFBQUMsQ0FBQyxTQUFRLENBQUcsTUFBSSxDQUFDLENBQUM7QUFDM0Q7QUFBQSxBQUdBLE9BQVMsWUFBVSxDQUFDLEFBQUMsQ0FBRTtBQUVyQixFQUFBLEtBQUssQUFBQyxDQUFDLENBQUEsQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFHLFVBQVMsTUFBSyxDQUFHO0FBQ3BDLElBQUEsQUFBQyxDQUFDLE1BQUssQ0FBQyxPQUFPLEFBQUMsQ0FBQyxRQUFPLENBQUcsUUFBTSxDQUFHLElBQUUsQ0FBQyxDQUFDO0FBQ3hDLElBQUEsQUFBQyxDQUFDLE1BQUssQ0FBQyxJQUFJLEFBQUMsQ0FBQztBQUFFLGlCQUFXLENBQUcsR0FBQztBQUFHLG1CQUFhLENBQUcsR0FBQztBQUFBLElBQUUsQ0FBQyxDQUFDO0VBQ3pELENBQUMsQ0FBQztBQUVGLFVBQVEsRUFBSSxHQUFDLENBQUM7QUFDZCxXQUFTLEVBQUksRUFBQSxDQUFDO0FBQ2hCO0FBQUEsQUFHQSxPQUFTLGNBQVksQ0FBRSxDQUFBLENBQUc7QUFDeEIsT0FBTyxVQUFTLEtBQUksQ0FBRztBQUNqQixJQUFBLEFBQUMsQ0FBQyxHQUFFLEVBQUksQ0FBQSxXQUFVLEFBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQyxJQUFJLEFBQUMsQ0FBQyxDQUFDLFlBQVcsQ0FBRSxVQUFRLENBQUMsQ0FBQyxDQUFDO0FBQ3JELElBQUEsQUFBQyxDQUFDLEdBQUUsRUFBSSxDQUFBLFdBQVUsQUFBQyxDQUFDLENBQUEsQ0FBQyxDQUFBLENBQUkscUJBQW1CLENBQUMsSUFBSSxBQUFDLENBQUM7QUFDakQsaUJBQVcsQ0FBRSxVQUFRO0FBQ3JCLG1CQUFhLENBQUcsVUFBUTtBQUFBLElBQzFCLENBQUMsQ0FBQztBQUVGLE9BQUksU0FBUSxDQUFFLENBQUEsQ0FBQyxJQUFNLFVBQVEsQ0FBRztBQUM5QixjQUFRLENBQUUsQ0FBQSxDQUFDLEVBQUksRUFBQSxDQUFDO0FBQ2hCLGVBQVMsR0FBSyxFQUFBLENBQUM7SUFDakI7QUFBQSxFQUNOLENBQUM7QUFDSDtBQUFBLEFBR0EsT0FBUyxhQUFXLENBQUUsQ0FBQSxDQUFHO0FBQ3ZCLE9BQU8sVUFBUSxBQUFDLENBQUU7QUFDaEIsSUFBQSxBQUFDLENBQUMsR0FBRSxFQUFJLENBQUEsV0FBVSxBQUFDLENBQUMsQ0FBQSxDQUFDLENBQUEsQ0FBSSxxQkFBbUIsQ0FBQyxJQUFJLEFBQUMsQ0FBQztBQUM1QyxpQkFBVyxDQUFFLFVBQVE7QUFDckIsbUJBQWEsQ0FBRyxVQUFRO0FBQUEsSUFDL0IsQ0FBQyxDQUFDO0VBQ0osQ0FBQztBQUNIO0FBQUEsQUFHQSxPQUFTLFdBQVMsQ0FBRSxLQUFJLENBQUcsQ0FBQSxPQUFNLENBQUc7QUFDbEMsQUFBSSxJQUFBLENBQUEsQ0FBQSxFQUFJLEVBQUEsQ0FBQztBQUdULFFBQU8sS0FBSSxFQUFFLENBQUc7QUFDZCxBQUFJLE1BQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxPQUFNLE1BQU0sQUFBQyxFQUFDLENBQUM7QUFDM0IsUUFBSSxLQUFLLEFBQUMsQ0FBQyxJQUFHLENBQUcsQ0FBQSxLQUFJLEVBQUksTUFBSSxDQUFDLENBQUM7QUFDL0IsUUFBSSxZQUFZLEFBQUMsQ0FBQyxDQUFBLEFBQUMsQ0FBQyxZQUFXLENBQUMsQ0FBQyxDQUFDO0VBQ3BDO0FBQUEsQUFDRjtBQUFBLEFBR0EsT0FBUyxjQUFZLENBQUUsS0FBSSxDQUFHLENBQUEsT0FBTSxDQUFHO0FBR3JDLEFBQUksSUFBQSxDQUFBLENBQUEsRUFBSSxFQUFBLENBQUM7QUFHVCxRQUFPLEtBQUksRUFBRSxDQUFHO0FBQ2QsQUFBSSxNQUFBLENBQUEsS0FBSSxFQUFJLENBQUEsT0FBTSxNQUFNLEFBQUMsRUFBQyxDQUFDO0FBRTNCLFFBQUksU0FBUyxBQUFDLEVBQUMsS0FBSyxBQUFDLENBQUMsSUFBRyxDQUFHLENBQUEsUUFBTyxFQUFJLE1BQUksQ0FBQyxDQUFDO0FBQzdDLFFBQUksWUFBWSxBQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsZUFBYyxDQUFDLENBQUMsQ0FBQztFQUN2QztBQUFBLEFBQ0Y7QUFBQSxBQUdBLE9BQVMsWUFBVSxDQUFDLEFBQUMsQ0FBRTtBQUdyQixBQUFJLElBQUEsQ0FBQSxDQUFBLEVBQUksRUFBQyxDQUFBLENBQUM7QUFDVixBQUFJLElBQUEsQ0FBQSxLQUFJLEVBQUksdUNBQXFDLENBQUM7QUFDbEQsQUFBSSxJQUFBLENBQUEsRUFBQyxFQUFJLENBQUEsQ0FBQSxBQUFDLENBQUMsT0FBTSxDQUFDLE1BQU0sQUFBQyxFQUFDLENBQUM7QUFDM0IsRUFBQSxBQUFDLENBQUMsRUFBQyxDQUFDLEtBQUssQUFBQyxDQUFDLElBQUcsQ0FBRyxTQUFPLENBQUMsQ0FBQztBQUUxQixFQUFBLEFBQUMsQ0FBQyxFQUFDLENBQUMsU0FBUyxBQUFDLEVBQUMsS0FBSyxBQUFDLENBQUMsS0FBSSxDQUFDLEtBQUssQUFBQyxDQUFDLElBQUcsQ0FBRyxVQUFRLEFBQUMsQ0FBRTtBQUNqRCxTQUFPLENBQUEsT0FBTSxFQUFJLENBQUEsQ0FBQSxFQUFFLENBQUM7RUFDdEIsQ0FBQyxDQUFDO0FBRUYsRUFBQSxBQUFDLENBQUMsRUFBQyxDQUFDLGFBQWEsQUFBQyxDQUFDLENBQUEsQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDLENBQUM7QUFDOUIsRUFBQSxBQUFDLENBQUMsMkJBQTBCLENBQUMsU0FBUyxBQUFDLEVBQUMsS0FBSyxBQUFDLENBQUMsTUFBSyxDQUFHLFNBQU8sQ0FBQyxDQUFDO0FBQ2xFO0FBQUEsQUFHQSxPQUFTLGNBQVksQ0FBRSxLQUFJLENBQUc7QUFDNUIsQUFBSSxJQUFBLENBQUEsQ0FBQSxDQUFDO0FBQ0wsQUFBSSxJQUFBLENBQUEsSUFBRyxFQUFJO0FBQ1AsVUFBTSxDQUFFLE9BQUs7QUFDYixXQUFPLENBQUUsUUFBTTtBQUNmLGFBQVMsQ0FBRSxXQUFTO0FBQ3BCLFdBQU8sQ0FBRSxNQUFJO0FBQUEsRUFDakIsQ0FBQztBQUVELE1BQUssQ0FBQSxFQUFJLEVBQUEsQ0FBRyxDQUFBLENBQUEsRUFBSSxNQUFJLENBQUcsQ0FBQSxDQUFBLEVBQUUsQ0FBRztBQUMxQixBQUFJLE1BQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxXQUFVLEFBQUMsQ0FBQyxDQUFBLENBQUMsQ0FBQztBQUMxQixJQUFBLEFBQUMsQ0FBQyxHQUFFLEVBQUksTUFBSSxDQUFDLEtBQUssQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO0FBQ3pCLElBQUEsQUFBQyxDQUFDLEdBQUUsRUFBSSxNQUFJLENBQUEsQ0FBSSxxQkFBbUIsQ0FBQyxLQUFLLEFBQUMsQ0FBQyxDQUFDLFlBQVcsQ0FBRyxVQUFRLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLElBQUEsQUFBQyxDQUFDLEdBQUUsRUFBSSxNQUFJLENBQUMsT0FBTyxBQUFDLENBQUM7QUFDcEIsWUFBTSxDQUFHLEtBQUc7QUFDWixnQkFBVSxDQUFHLFdBQVM7QUFDdEIsUUFBRSxDQUFHLEVBQUE7QUFBSSxRQUFFLENBQUcsRUFBQTtBQUFHLFNBQUcsQ0FBRyxLQUFHO0FBQUcsVUFBSSxDQUFHLElBQUU7QUFDdEMsVUFBSSxDQUFHLENBQUEsWUFBVyxBQUFDLENBQUMsQ0FBQSxDQUFDO0FBQ3JCLFdBQUssQ0FBRyxDQUFBLGFBQVksQUFBQyxDQUFDLENBQUEsQ0FBQztBQUFBLElBQ3pCLENBQUMsQ0FBQztFQUNKO0FBQUEsQUFDRjtBQUFBLEFBTUksRUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFdBQVUsQ0FBQyxDQUFDO0FBQ2xDLEFBQUksRUFBQSxDQUFBLFdBQVUsRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLGtCQUFpQixDQUFDLENBQUM7QUFDN0MsQUFBSSxFQUFBLENBQUEsYUFBWSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsbUJBQWtCLENBQUMsQ0FBQztBQUVoRCxBQUFJLEVBQUEsQ0FBQSxVQUFTLEVBQUksVUFBUSxBQUFDLENBQUU7QUFFMUIsQUFBSSxJQUFBLENBQUEsS0FBSSxFQUFJLEVBQUEsQ0FBQztBQUNiLEFBQUksSUFBQSxDQUFBLEtBQUksRUFBSSxHQUFDLENBQUM7QUFDZCxBQUFJLElBQUEsQ0FBQSxJQUFHLEVBQUksRUFBQyxHQUFFLENBQUcsSUFBRSxDQUFHLElBQUUsQ0FBRyxJQUFFLENBQUcsSUFBRSxDQUFHLElBQUUsQ0FBRyxJQUFFLENBQUcsSUFBRSxDQUFHLElBQUUsQ0FBRyxJQUFFLENBQUcsS0FBRyxDQUFDLENBQUE7QUFDbEUsQUFBSSxJQUFBLENBQUEsT0FBTSxFQUFJLEdBQUMsQ0FBQztBQUVoQixBQUFJLElBQUEsQ0FBQSxTQUFRLEVBQUksQ0FBQSxDQUFBLEFBQUMsQ0FBQyx1RUFBc0UsQ0FBQyxDQUFDO0FBQzFGLEFBQUksSUFBQSxDQUFBLFlBQVcsRUFBSSxDQUFBLENBQUEsQUFBQyxDQUFDLHlXQUF3VyxDQUFDLENBQUM7QUFFL1gsQUFBSSxJQUFBLENBQUEsU0FBUSxFQUFJLEdBQUMsQ0FBQztBQUNsQixBQUFJLElBQUEsQ0FBQSxLQUFJLEVBQUksRUFBRSxHQUFJLEtBQUcsQUFBQyxFQUFDLENBQUM7QUFFeEIsQUFBSSxJQUFBLENBQUEsU0FBUSxFQUFJLENBQUEsV0FBVSxBQUFDLEVBQUMsQ0FBQztBQUU3QixBQUFJLElBQUEsQ0FBQSxJQUFHLEVBQUksVUFBUSxBQUFDLENBQUU7QUFHcEIsT0FBSSxLQUFJLEVBQUksQ0FBQSxTQUFRLE9BQU8sQ0FBRztBQUU1QixBQUFJLFFBQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxTQUFRLENBQUUsS0FBSSxFQUFFLENBQUMsQ0FBQztBQUM5QixjQUFRLE9BQU8sQUFBQyxDQUFDLENBQUEsQ0FBRyxFQUFBLENBQUcsQ0FBQSxRQUFPLEFBQUMsQ0FBQyxLQUFJLENBQUMsQ0FBRyxDQUFBLEtBQUksTUFBTSxDQUFHLENBQUEsS0FBSSxPQUFPLENBQUcsQ0FBQSxLQUFJLFlBQVksQ0FBQyxDQUFDO0FBRXJGLGdCQUFVLEFBQUMsRUFBQyxDQUFDO0FBR2IsZUFBUyxBQUFDLENBQUMsS0FBSSxDQUFHLFVBQVEsQ0FBQyxDQUFDO0FBQzVCLGtCQUFZLEFBQUMsQ0FBQyxLQUFJLENBQUcsYUFBVyxDQUFDLENBQUM7QUFDbEMsa0JBQVksQUFBQyxDQUFDLEtBQUksQ0FBQyxDQUFDO0FBRXBCLE1BQUEsQUFBQyxDQUFDLE1BQUssQ0FBQyxLQUFLLEFBQUMsQ0FBQyxLQUFJLElBQUksQ0FBQyxDQUFDO0FBQ3pCLE1BQUEsQUFBQyxDQUFDLFdBQVUsQ0FBQyxLQUFLLEFBQUMsQ0FBQyxLQUFJLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLE1BQUEsQUFBQyxDQUFDLGFBQVksQ0FBQyxLQUFLLEFBQUMsQ0FBQyxJQUFHLE1BQU0sQUFBQyxDQUFDLEtBQUksV0FBVyxDQUFDLENBQUMsQ0FBQztBQUNuRCxNQUFBLEFBQUMsQ0FBQyxnQkFBZSxDQUFDLEtBQUssQUFBQyxDQUFDLElBQUcsTUFBTSxBQUFDLENBQUMsS0FBSSxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBRXpELE1BQUEsS0FBSyxBQUFDLENBQUMsSUFBRyxDQUFHLFVBQVMsR0FBRSxDQUFHLENBQUEsQ0FBQSxDQUFHO0FBQzVCLFFBQUEsQUFBQyxDQUFDLE1BQUssRUFBSSxFQUFBLENBQUMsS0FBSyxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7TUFDekIsQ0FBQyxDQUFDO0lBQ0osS0FFSztBQUVILFFBQUksY0FBWSxBQUFDLEVBQUMsTUFBTSxBQUFDLEVBQUMsQ0FBQztJQUM3QjtBQUFBLEVBQ0YsQ0FBQztBQUdELEFBQUksSUFBQSxDQUFBLElBQUcsRUFBSSxVQUFTLENBQUEsQ0FBRztBQUNyQixJQUFBLGVBQWUsQUFBQyxFQUFDLENBQUM7QUFDbEIsT0FBSSxVQUFTLEVBQUksTUFBSSxDQUFHO0FBQ3RCLEFBQUksUUFBQSxDQUFBLElBQUcsRUFBSSxDQUFBLENBQUMsNkJBQTRCLENBQUcsa0RBQWdELENBQy9FLG9CQUFrQixDQUFHLGtFQUFnRSxDQUFDLEtBQUssQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO0FBQzdHLFVBQUksQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO0FBQ1gsV0FBTyxNQUFJLENBQUM7SUFDZDtBQUFBLEFBRUksTUFBQSxDQUFBLEVBQUMsRUFBSSxDQUFBLENBQUUsR0FBSSxLQUFHLEFBQUMsRUFBQyxDQUFBLENBQUksTUFBSSxDQUFDO0FBRzdCLEFBQUksTUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLENBQUEsSUFBSSxBQUFDLENBQUMsQ0FBQSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUcsVUFBUyxNQUFLLENBQUc7QUFDakQsV0FBTyxDQUFBLENBQUEsQUFBQyxDQUFDLE1BQUssQ0FBQyxPQUFPLEFBQUMsQ0FBQyxRQUFPLENBQUcsUUFBTSxDQUFDLENBQUM7SUFDNUMsQ0FBQyxDQUFDO0FBRUYsVUFBTyxDQUFBLEtBQUssQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFBLENBQUksUUFBTSxDQUFHO0FBQ2hDLFlBQU0sS0FBSyxBQUFDLENBQUMsSUFBRyxDQUFDLENBQUM7SUFDcEI7QUFBQSxBQUdBLFlBQVEsT0FBTyxBQUFDLENBQUMsQ0FBQSxDQUFHLEVBQUEsQ0FBRyxHQUFDLENBQUMsQ0FBQztBQUMxQixZQUFRLEVBQUksQ0FBQSxTQUFRLE9BQU8sQUFBQyxDQUFDLE9BQU0sQ0FBQyxDQUFDO0FBQ3JDLFVBQU0sSUFBSSxBQUFDLENBQUMsU0FBUSxDQUFDLENBQUM7QUFDdEIsVUFBTSxJQUFJLEFBQUMsQ0FBQyxDQUFBLEtBQUssQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFDLENBQUM7QUFDOUIsVUFBTSxnQkFBZ0IsQUFBQyxDQUFDLFNBQVEsQ0FBQyxDQUFDO0FBR2xDLFlBQVEsRUFBSSxHQUFDLENBQUM7QUFDZCxJQUFBLEFBQUMsQ0FBQyxVQUFTLENBQUMsT0FBTyxBQUFDLEVBQUMsQ0FBQztBQUN0QixPQUFHLEFBQUMsRUFBQyxDQUFDO0VBQ1IsQ0FBQztBQUVELFFBQU0sU0FBUyxBQUFDLENBQUMsV0FBVSxDQUFDLENBQUM7QUFDN0IsRUFBQSxBQUFDLENBQUMsV0FBVSxDQUFDLEdBQUcsQUFBQyxDQUFDLE9BQU0sQ0FBRyxLQUFHLENBQUMsQ0FBQztBQVVoQyxLQUFHLEFBQUMsRUFBQyxDQUFDO0FBQ1IsQ0FBQTtBQUVBLEtBQUssUUFBUSxFQUFJLFdBQVMsQ0FBQztBQUMzQjs7OztBQzlOQTtBQUFBLEtBQUssUUFBUSxFQUFJLElBQUksUUFBTSxBQUFDLENBQUMsUUFBTyxDQUFHLFlBQVUsQ0FBRyxLQUFHLENBQUMsQ0FBQztBQUN6RDs7OztBQ0RBO0FBQUEsQUFBSSxFQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsWUFBVyxDQUFDLENBQUM7QUFBbkMsQUFBSSxFQUFBLGdCQUdKLFNBQU0sY0FBWSxLQXNFbEIsQUF6RXdDLENBQUE7QUFBeEMsQUFBQyxlQUFjLFlBQVksQ0FBQyxBQUFDO0FBSzNCLFVBQVEsQ0FBUixVQUFVLFFBQU8sQ0FBRztBQUNyQixBQUFJLE1BQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxDQUFBLEFBQUMsQ0FBQyxVQUFTLENBQUMsSUFBSSxBQUFDLEVBQUMsQ0FBQztBQUMvQixVQUFNLGdCQUFnQixBQUFDLENBQUM7QUFBQyxZQUFNLENBQUUsb0JBQWtCO0FBQUcsYUFBTyxDQUFFLFNBQU87QUFBQSxJQUFDLENBQUMsQ0FBQztBQUN6RSxVQUFNLGdCQUFnQixBQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLFVBQU0sZ0JBQWdCLEFBQUMsQ0FBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDLENBQUM7QUFDaEMsVUFBTSx1QkFBdUIsQUFBQyxDQUFDLFVBQVMsQ0FBRyxTQUFPLENBQUMsQ0FBQztBQUNwRCxVQUFNLHVCQUF1QixBQUFDLENBQUMsVUFBUyxDQUFHLFNBQU8sQ0FBQyxDQUFDO0FBRXZELElBQUEsQUFBQyxDQUFDLFFBQU8sQ0FBQyxLQUFLLEFBQUMsQ0FBQyxTQUFTLENBQUEsQ0FBRyxDQUFBLEdBQUUsQ0FBRztBQUM3QixZQUFNLGdCQUFnQixBQUFDLENBQUMsQ0FBQyxJQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDdkMsQ0FBQyxDQUFDO0VBQ0o7QUFFQSxpQkFBZSxDQUFmLFVBQWdCLEFBQUMsQ0FBRTtBQUVqQixBQUFJLE1BQUEsQ0FBQSxRQUFPLEVBQUksQ0FBQSxDQUFBLEFBQUMsQ0FBQyxXQUFVLENBQUMsSUFBSSxBQUFDLEVBQUMsQ0FBQztBQUNuQyxPQUFHLFNBQVMsRUFBSSxNQUFJLENBQUM7QUFFckIsSUFBQSxBQUFDLENBQUMsUUFBTyxDQUFDLEtBQUssQUFBQyxDQUFDLFNBQVMsQ0FBQSxDQUFHLENBQUEsR0FBRSxDQUFHO0FBQ2hDLFlBQU0sdUJBQXVCLEFBQUMsQ0FBQyxJQUFHLEdBQUcsQ0FBRyxDQUFBLElBQUcsTUFBTSxDQUFDLENBQUM7SUFDckQsQ0FBQyxDQUFDO0FBRUYsT0FBSSxRQUFPLElBQU0sR0FBQyxDQUFHO0FBQ25CLFVBQUksQUFBQyxDQUFDLHVDQUFzQyxDQUFDLENBQUM7QUFDOUMsTUFBQSxBQUFDLENBQUMsV0FBVSxDQUFDLE1BQU0sQUFBQyxFQUFDLENBQUM7QUFDdEIsV0FBTyxNQUFJLENBQUM7SUFDZCxLQUFPO0FBQ0gsU0FBRyxTQUFTLEVBQUksS0FBRyxDQUFDO0FBQ3BCLFNBQUcsVUFBVSxBQUFDLENBQUMsUUFBTyxDQUFDLENBQUM7SUFDNUI7QUFBQSxFQUNGO0FBRUEsZ0JBQWMsQ0FBZCxVQUFlLEFBQUMsQ0FBRTtBQUNoQixBQUFJLE1BQUEsQ0FBQSxLQUFJLEVBQUksQ0FBQSxDQUFDLDREQUEyRCxDQUMzRCwwREFBd0QsQ0FDeEQsMkVBQXlFLENBQUMsS0FBSyxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7QUFDbEcsSUFBQSxBQUFDLENBQUMsTUFBSyxDQUFDLEtBQUssQUFBQyxDQUFDLEtBQUksQ0FBQyxDQUFDO0FBQ3JCLElBQUEsQUFBQyxDQUFDLFdBQVUsQ0FBQyxHQUFHLEFBQUMsQ0FBQyxPQUFNLENBQUcsQ0FBQSxDQUFBLEtBQUssQUFBQyxDQUFDLElBQUcsU0FBUyxDQUFHLEtBQUcsQ0FBQyxDQUFDLENBQUM7RUFDekQ7QUFFQSxTQUFPLENBQVAsVUFBUSxBQUFDO0FBQ1AsSUFBQSxBQUFDLENBQUMsTUFBSyxDQUFDLEtBQUssQUFBQyxDQUFDLGdDQUErQixDQUFDLENBQUM7QUFDaEQsQUFBSSxNQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsVUFBUyxBQUFDLENBQUMsQ0FBQSxLQUFLLEFBQUMsQ0FBQyxJQUFHLGdCQUFnQixDQUFHLEtBQUcsQ0FBQyxDQUFHLE1BQUksQ0FBQyxDQUFDO0FBQ3BFLE9BQUksQ0FBQyxJQUFHLFNBQVM7QUFBRyxTQUFHLFVBQVUsQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO0FBQUEsQUFFcEMsTUFBQSxDQUFBLElBQUcsRUFBSSxLQUFHLENBQUM7QUFDZixVQUFNLFNBQVMsQUFBQyxDQUFDO0FBQ2YsWUFBTSxHQUFHLFNBQUEsQUFBQyxDQUFLO0FBQ2Isb0JBQVksQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDO0FBQ3ZCLGNBQU0sWUFBWSxBQUFDLEVBQUMsQ0FBQztNQUN2QixDQUFBO0FBQ0EsVUFBSSxDQUFHLENBQUEsQ0FBQSxLQUFLLEFBQUMsQ0FBQyxJQUFHLGdCQUFnQixDQUFHLEtBQUcsQ0FBQztBQUFBLElBQzFDLENBQUMsQ0FBQztFQUNKO0FBRUEsTUFBSSxDQUFKLFVBQUssQUFBQzs7QUFFSixVQUFNLFNBQVMsQUFBQyxDQUFDLHdCQUF1QixDQUFDLENBQUM7QUFDMUMsVUFBTSxnQkFBZ0IsQUFBQyxDQUFDO0FBQUMsWUFBTSxDQUFFLG9CQUFrQjtBQUFHLGFBQU8sQ0FBRSxRQUFNO0FBQUEsSUFBQyxDQUFDLENBQUM7QUFFeEUsSUFBQSxBQUFDLENBQUMsT0FBTSxDQUFDLEdBQUcsQUFBQyxDQUFDLE9BQU0sR0FBRyxTQUFBLEFBQUMsQ0FBSztBQUMzQiwwQkFBb0IsQUFBQyxFQUFDLENBQUM7QUFDdkIsWUFBTSxTQUFTLEFBQUMsQ0FBQztBQUNmLGNBQU0sQ0FBRyxDQUFBLE9BQU0sWUFBWTtBQUMzQixZQUFJLENBQUcsQ0FBQSxDQUFBLEtBQUssQUFBQyxDQUFDLG9CQUFtQixPQUFPO0FBQUEsTUFDMUMsQ0FBQyxDQUFDO0lBQ0osRUFBQyxDQUFDO0VBQ0o7S0F4RW1GO0FBMkVyRixLQUFLLFFBQVEsRUFBSSxjQUFZLENBQUM7QUFDOUI7Ozs7QUM1RUE7QUFBQSxPQUFTLFVBQVEsQ0FBRSxHQUFFLENBQUcsQ0FBQSxDQUFBLENBQUc7QUFDdkIsQUFBSSxJQUFBLENBQUEsTUFBSyxFQUFJLElBQUksTUFBSSxBQUFDLENBQUMsQ0FBQSxDQUFDO0FBQ3BCLFFBQUUsRUFBSSxDQUFBLEdBQUUsT0FBTztBQUNmLFVBQUksRUFBSSxJQUFJLE1BQUksQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO0FBQzFCLEtBQUksQ0FBQSxFQUFJLElBQUU7QUFDTixRQUFNLElBQUksV0FBUyxBQUFDLENBQUMsK0NBQThDLENBQUMsQ0FBQztBQUFBLEFBQ3pFLFFBQU8sQ0FBQSxFQUFFLENBQUc7QUFDUixBQUFJLE1BQUEsQ0FBQSxDQUFBLEVBQUksQ0FBQSxJQUFHLE1BQU0sQUFBQyxDQUFDLElBQUcsT0FBTyxBQUFDLEVBQUMsQ0FBQSxDQUFJLElBQUUsQ0FBQyxDQUFDO0FBQ3ZDLFNBQUssQ0FBRSxDQUFBLENBQUMsRUFBSSxDQUFBLEdBQUUsQ0FBRSxDQUFBLEdBQUssTUFBSSxDQUFBLENBQUksQ0FBQSxLQUFJLENBQUUsQ0FBQSxDQUFDLEVBQUksRUFBQSxDQUFDLENBQUM7QUFDMUMsUUFBSSxDQUFFLENBQUEsQ0FBQyxFQUFJLEdBQUUsR0FBRSxDQUFDO0VBQ3BCO0FBQUEsQUFDQSxPQUFPLE9BQUssQ0FBQztBQUNqQjtBQUFBLEFBRUEsT0FBUyxZQUFVLENBQUMsQUFBQztBQUVqQixBQUFJLElBQUEsQ0FBQSxTQUFRLEVBQUksRUFBQyxFQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FDL0UsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsSUFBRSxDQUNuRixJQUFFLENBQUUsSUFBRSxDQUFFLElBQUUsQ0FBRSxJQUFFLENBQUUsSUFBRSxDQUFFLElBQUUsQ0FBRSxJQUFFLENBQUUsSUFBRSxDQUFFLElBQUUsQ0FBRSxLQUFHLENBQUMsQ0FBQTtBQUN6RCxBQUFJLElBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxTQUFRLEFBQUMsQ0FBQyxTQUFRLENBQUcsR0FBQyxDQUFDLENBQUM7QUFFeEMsQUFBSSxJQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsTUFBSyxPQUFPLENBQUE7QUFFdkIsQUFBSSxJQUFBLENBQUEsR0FBRSxFQUFJLENBQUEscUJBQW9CLEVBQ1osT0FBSyxDQUFBLENBQ0gsdUZBQXFGLENBQUEsQ0FDdkYsUUFBTSxDQUFBLENBQ1IsV0FBUyxDQUFDO0FBRTFCLEFBQUksSUFBQSxDQUFBLFFBQU8sRUFBSSxnRUFBOEQsQ0FBQztBQUc5RSxBQUFJLElBQUEsQ0FBQSxHQUFFLEVBQUksQ0FBQSxDQUFBLElBQUksQUFBQyxDQUFDLENBQUEsTUFBTSxBQUFDLENBQUMsQ0FBQSxDQUFHLFFBQU0sQ0FBQyxHQUFHLFNBQUMsQ0FBQSxDQUFNO0FBRTVDLEFBQUksTUFBQSxDQUFBLEtBQUksRUFBSSxHQUFDLENBQUM7QUFFZCxRQUFJLE1BQU0sRUFBSSxDQUFBLE1BQUssTUFBTSxBQUFDLEVBQUMsQ0FBQztBQUM1QixRQUFJLFVBQVUsRUFBSSxDQUFBLEtBQUksTUFBTSxFQUFFLE9BQUssQ0FBQTtBQUVuQyxPQUFJLEtBQUksTUFBTSxHQUFLLEtBQUcsQ0FBRztBQUNyQixVQUFJLE9BQU8sRUFBSSxHQUFDLENBQUM7QUFDakIsVUFBSSxZQUFZLEVBQUksR0FBQyxDQUFDO0lBQzFCLEtBQU87QUFDSCxVQUFJLE9BQU8sRUFBSSxDQUFBLElBQUcsTUFBTSxBQUFDLENBQUMsS0FBSSxNQUFNLEVBQUUsR0FBQyxDQUFDLENBQUM7QUFDekMsVUFBSSxZQUFZLEVBQUksQ0FBQSxJQUFHLE1BQU0sQUFBQyxDQUFDLEVBQUMsRUFBRSxFQUFDLENBQUMsS0FBSSxNQUFNLEVBQUUsR0FBQyxDQUFDLEVBQUUsRUFBQSxDQUFDLENBQUMsQ0FBQztJQUMzRDtBQUFBLEFBQUMsSUFBQTtBQUtELFFBQUksSUFBSSxFQUFJLENBQUEsR0FBRSxRQUFRLEFBQUMsQ0FBQyxTQUFRLENBQUcsQ0FBQSxLQUFJLE1BQU0sQ0FBQyxRQUFRLEFBQUMsQ0FBQyxhQUFZLENBQUcsQ0FBQSxLQUFJLFVBQVUsQ0FBQyxDQUFDO0FBRW5GLE9BQUksS0FBSSxNQUFNLEdBQUcsR0FBQyxDQUNmO0FBQ0EsVUFBSSxTQUFTLEVBQUksb0RBQWtELENBQUE7SUFDbkUsS0FDTSxLQUFJLEtBQUksTUFBTSxHQUFHLEdBQUMsQ0FDZjtBQUNBLFVBQUksU0FBUyxFQUFJLGdEQUE4QyxDQUFBO0lBQy9ELEtBRUE7QUFBQyxTQUFJLEtBQUksT0FBTyxHQUFLLENBQUEsS0FBSSxZQUFZLENBQUc7QUFFcEMsV0FBSSxLQUFJLE9BQU8sR0FBSyxHQUFDLENBQUc7QUFDcEIsY0FBSSxTQUFTLEVBQUksQ0FBQSxRQUFPLFFBQVEsQUFBQyxDQUFDLEtBQUksQ0FBRyxVQUFRLENBQUMsQ0FBQTtRQUN0RCxLQUFTO0FBQ0wsY0FBSSxTQUFTLEVBQUksQ0FBQSxRQUFPLFFBQVEsQUFBQyxDQUFDLEtBQUksQ0FBRyxDQUFBLEtBQUksT0FBTyxDQUFDLENBQUE7UUFDekQ7QUFBQSxBQUFDLFFBQUE7QUFFRCxZQUFJLFNBQVMsRUFBSSxDQUFBLEtBQUksU0FBUyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsTUFBSSxDQUFDLENBQUE7TUFFeEQsS0FBUztBQUVMLFdBQUksS0FBSSxPQUFPLEdBQUssR0FBQyxDQUFHO0FBQ3BCLGNBQUksU0FBUyxFQUFJLENBQUEsUUFBTyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsVUFBUSxDQUFDLENBQUE7UUFDdEQsS0FBUztBQUNMLGNBQUksU0FBUyxFQUFJLENBQUEsUUFBTyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsQ0FBQSxLQUFJLE9BQU8sQ0FBQyxDQUFBO1FBQ3pEO0FBQUEsQUFBQyxRQUFBO0FBRUQsV0FBSSxLQUFJLFlBQVksSUFBTSxFQUFBLENBQUc7QUFDekIsY0FBSSxTQUFTLEVBQUksQ0FBQSxLQUFJLFNBQVMsUUFBUSxBQUFDLENBQUMsS0FBSSxDQUFHLE9BQUssQ0FBQyxDQUFBO1FBQ3pELEtBQVM7QUFDTCxjQUFJLFNBQVMsRUFBSSxDQUFBLEtBQUksU0FBUyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsQ0FBQSxLQUFJLFlBQVksQ0FBQyxDQUFBO1FBQ3BFO0FBQUEsTUFDSjtBQUFBLElBQ2hCO0FBQUEsQUFHQSxPQUFJLEtBQUksWUFBWSxHQUFLLEVBQUEsQ0FBRztBQUN4QixVQUFJLFNBQVMsRUFBRSxDQUFBLEtBQUksU0FBUyxRQUFRLEFBQUMsQ0FBQyxVQUFTLENBQUcsS0FBRyxDQUFDLENBQUE7SUFDMUQsS0FBUztBQUNMLFVBQUksU0FBUyxFQUFFLENBQUEsS0FBSSxTQUFTLFFBQVEsQUFBQyxDQUFDLFVBQVMsQ0FBRyxNQUFJLENBQUMsQ0FBQTtJQUMzRDtBQUFBLEFBRUEsUUFBSSxFQUFFLEVBQUUsRUFBQSxDQUFDO0FBQ1QsUUFBSSxXQUFXLEVBQUksQ0FBQSxDQUFDLEdBQUUsRUFBRSxDQUFBLEtBQUksRUFBRSxDQUFDLEVBQUUsUUFBTSxDQUFBO0FBQ3ZDLFFBQUksY0FBYyxFQUFJLENBQUEsQ0FBQyxHQUFFLEVBQUUsQ0FBQSxLQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQU0sQ0FBQTtBQUUxQyxTQUFPLE1BQUksQ0FBQztFQUNaLEVBQUMsQ0FBQztBQUVGLFFBQU0sSUFBSSxBQUFDLENBQUMsR0FBRSxDQUFDLENBQUM7QUFFaEIsT0FBTyxJQUFFLENBQUM7QUFFZDtBQUdBLEtBQUssUUFBUSxFQUFJLFlBQVUsQ0FBQztBQUM1Qjs7OztBQzdHQTtBQUFBLEFBQUksRUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFdBQVUsQ0FBQyxDQUFDO0FBQ2xDLEFBQUksRUFBQSxDQUFBLFVBQVMsRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLGNBQWEsQ0FBQyxDQUFDO0FBRXhDLEFBQUksRUFBQSxDQUFBLEtBQUksRUFBSSxFQUNYLCtCQUE4QixDQUMzQixpQ0FBK0IsQ0FDL0IsaUNBQStCLENBQ2xDLFlBQVUsQ0FDUCx5QkFBdUIsQ0FDM0IsQ0FBQztBQUVELEFBQUksRUFBQSxDQUFBLGdCQUFlLEVBQUksRUFDdEIsK0JBQThCLENBQzNCLGlDQUErQixDQUMvQixpQ0FBK0IsQ0FDbkMsQ0FBQztBQUVELE1BQU0sYUFBYSxBQUFDLENBQUMsS0FBSSxDQUFDLENBQUM7QUFHM0IsQUFBSSxFQUFBLENBQUEsV0FBVSxDQUFDO0FBR2YsQUFBQyxDQUFDLE1BQUssQ0FBQyxLQUFLLEFBQUMsRUFBQyxTQUFBLEFBQUMsQ0FBSztBQUNqQixRQUFNLGVBQWUsQUFBQyxDQUNyQixnQkFBZSxDQUNaLFVBQVEsQUFBQyxDQUFFO0FBQUUsY0FBVSxFQUFJLElBQUksV0FBUyxBQUFDLEVBQUMsQ0FBQztFQUFFLENBQ2pELENBQUM7QUFDTCxFQUFDLENBQUM7QUFDRiIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbi8vIHJlc29sdmVzIC4gYW5kIC4uIGVsZW1lbnRzIGluIGEgcGF0aCBhcnJheSB3aXRoIGRpcmVjdG9yeSBuYW1lcyB0aGVyZVxuLy8gbXVzdCBiZSBubyBzbGFzaGVzLCBlbXB0eSBlbGVtZW50cywgb3IgZGV2aWNlIG5hbWVzIChjOlxcKSBpbiB0aGUgYXJyYXlcbi8vIChzbyBhbHNvIG5vIGxlYWRpbmcgYW5kIHRyYWlsaW5nIHNsYXNoZXMgLSBpdCBkb2VzIG5vdCBkaXN0aW5ndWlzaFxuLy8gcmVsYXRpdmUgYW5kIGFic29sdXRlIHBhdGhzKVxuZnVuY3Rpb24gbm9ybWFsaXplQXJyYXkocGFydHMsIGFsbG93QWJvdmVSb290KSB7XG4gIC8vIGlmIHRoZSBwYXRoIHRyaWVzIHRvIGdvIGFib3ZlIHRoZSByb290LCBgdXBgIGVuZHMgdXAgPiAwXG4gIHZhciB1cCA9IDA7XG4gIGZvciAodmFyIGkgPSBwYXJ0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIHZhciBsYXN0ID0gcGFydHNbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXArKztcbiAgICB9IGVsc2UgaWYgKHVwKSB7XG4gICAgICBwYXJ0cy5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKGFsbG93QWJvdmVSb290KSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBwYXJ0cy51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwYXJ0cztcbn1cblxuLy8gU3BsaXQgYSBmaWxlbmFtZSBpbnRvIFtyb290LCBkaXIsIGJhc2VuYW1lLCBleHRdLCB1bml4IHZlcnNpb25cbi8vICdyb290JyBpcyBqdXN0IGEgc2xhc2gsIG9yIG5vdGhpbmcuXG52YXIgc3BsaXRQYXRoUmUgPVxuICAgIC9eKFxcLz98KShbXFxzXFxTXSo/KSgoPzpcXC57MSwyfXxbXlxcL10rP3wpKFxcLlteLlxcL10qfCkpKD86W1xcL10qKSQvO1xudmFyIHNwbGl0UGF0aCA9IGZ1bmN0aW9uKGZpbGVuYW1lKSB7XG4gIHJldHVybiBzcGxpdFBhdGhSZS5leGVjKGZpbGVuYW1lKS5zbGljZSgxKTtcbn07XG5cbi8vIHBhdGgucmVzb2x2ZShbZnJvbSAuLi5dLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVzb2x2ZSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgcmVzb2x2ZWRQYXRoID0gJycsXG4gICAgICByZXNvbHZlZEFic29sdXRlID0gZmFsc2U7XG5cbiAgZm9yICh2YXIgaSA9IGFyZ3VtZW50cy5sZW5ndGggLSAxOyBpID49IC0xICYmICFyZXNvbHZlZEFic29sdXRlOyBpLS0pIHtcbiAgICB2YXIgcGF0aCA9IChpID49IDApID8gYXJndW1lbnRzW2ldIDogcHJvY2Vzcy5jd2QoKTtcblxuICAgIC8vIFNraXAgZW1wdHkgYW5kIGludmFsaWQgZW50cmllc1xuICAgIGlmICh0eXBlb2YgcGF0aCAhPT0gJ3N0cmluZycpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50cyB0byBwYXRoLnJlc29sdmUgbXVzdCBiZSBzdHJpbmdzJyk7XG4gICAgfSBlbHNlIGlmICghcGF0aCkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuXG4gICAgcmVzb2x2ZWRQYXRoID0gcGF0aCArICcvJyArIHJlc29sdmVkUGF0aDtcbiAgICByZXNvbHZlZEFic29sdXRlID0gcGF0aC5jaGFyQXQoMCkgPT09ICcvJztcbiAgfVxuXG4gIC8vIEF0IHRoaXMgcG9pbnQgdGhlIHBhdGggc2hvdWxkIGJlIHJlc29sdmVkIHRvIGEgZnVsbCBhYnNvbHV0ZSBwYXRoLCBidXRcbiAgLy8gaGFuZGxlIHJlbGF0aXZlIHBhdGhzIHRvIGJlIHNhZmUgKG1pZ2h0IGhhcHBlbiB3aGVuIHByb2Nlc3MuY3dkKCkgZmFpbHMpXG5cbiAgLy8gTm9ybWFsaXplIHRoZSBwYXRoXG4gIHJlc29sdmVkUGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihyZXNvbHZlZFBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhcmVzb2x2ZWRBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIHJldHVybiAoKHJlc29sdmVkQWJzb2x1dGUgPyAnLycgOiAnJykgKyByZXNvbHZlZFBhdGgpIHx8ICcuJztcbn07XG5cbi8vIHBhdGgubm9ybWFsaXplKHBhdGgpXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLm5vcm1hbGl6ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIGlzQWJzb2x1dGUgPSBleHBvcnRzLmlzQWJzb2x1dGUocGF0aCksXG4gICAgICB0cmFpbGluZ1NsYXNoID0gc3Vic3RyKHBhdGgsIC0xKSA9PT0gJy8nO1xuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICBwYXRoID0gbm9ybWFsaXplQXJyYXkoZmlsdGVyKHBhdGguc3BsaXQoJy8nKSwgZnVuY3Rpb24ocCkge1xuICAgIHJldHVybiAhIXA7XG4gIH0pLCAhaXNBYnNvbHV0ZSkuam9pbignLycpO1xuXG4gIGlmICghcGF0aCAmJiAhaXNBYnNvbHV0ZSkge1xuICAgIHBhdGggPSAnLic7XG4gIH1cbiAgaWYgKHBhdGggJiYgdHJhaWxpbmdTbGFzaCkge1xuICAgIHBhdGggKz0gJy8nO1xuICB9XG5cbiAgcmV0dXJuIChpc0Fic29sdXRlID8gJy8nIDogJycpICsgcGF0aDtcbn07XG5cbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMuaXNBYnNvbHV0ZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgcmV0dXJuIHBhdGguY2hhckF0KDApID09PSAnLyc7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmpvaW4gPSBmdW5jdGlvbigpIHtcbiAgdmFyIHBhdGhzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgcmV0dXJuIGV4cG9ydHMubm9ybWFsaXplKGZpbHRlcihwYXRocywgZnVuY3Rpb24ocCwgaW5kZXgpIHtcbiAgICBpZiAodHlwZW9mIHAgIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5qb2luIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH1cbiAgICByZXR1cm4gcDtcbiAgfSkuam9pbignLycpKTtcbn07XG5cblxuLy8gcGF0aC5yZWxhdGl2ZShmcm9tLCB0bylcbi8vIHBvc2l4IHZlcnNpb25cbmV4cG9ydHMucmVsYXRpdmUgPSBmdW5jdGlvbihmcm9tLCB0bykge1xuICBmcm9tID0gZXhwb3J0cy5yZXNvbHZlKGZyb20pLnN1YnN0cigxKTtcbiAgdG8gPSBleHBvcnRzLnJlc29sdmUodG8pLnN1YnN0cigxKTtcblxuICBmdW5jdGlvbiB0cmltKGFycikge1xuICAgIHZhciBzdGFydCA9IDA7XG4gICAgZm9yICg7IHN0YXJ0IDwgYXJyLmxlbmd0aDsgc3RhcnQrKykge1xuICAgICAgaWYgKGFycltzdGFydF0gIT09ICcnKSBicmVhaztcbiAgICB9XG5cbiAgICB2YXIgZW5kID0gYXJyLmxlbmd0aCAtIDE7XG4gICAgZm9yICg7IGVuZCA+PSAwOyBlbmQtLSkge1xuICAgICAgaWYgKGFycltlbmRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgaWYgKHN0YXJ0ID4gZW5kKSByZXR1cm4gW107XG4gICAgcmV0dXJuIGFyci5zbGljZShzdGFydCwgZW5kIC0gc3RhcnQgKyAxKTtcbiAgfVxuXG4gIHZhciBmcm9tUGFydHMgPSB0cmltKGZyb20uc3BsaXQoJy8nKSk7XG4gIHZhciB0b1BhcnRzID0gdHJpbSh0by5zcGxpdCgnLycpKTtcblxuICB2YXIgbGVuZ3RoID0gTWF0aC5taW4oZnJvbVBhcnRzLmxlbmd0aCwgdG9QYXJ0cy5sZW5ndGgpO1xuICB2YXIgc2FtZVBhcnRzTGVuZ3RoID0gbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGZyb21QYXJ0c1tpXSAhPT0gdG9QYXJ0c1tpXSkge1xuICAgICAgc2FtZVBhcnRzTGVuZ3RoID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHZhciBvdXRwdXRQYXJ0cyA9IFtdO1xuICBmb3IgKHZhciBpID0gc2FtZVBhcnRzTGVuZ3RoOyBpIDwgZnJvbVBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0cHV0UGFydHMucHVzaCgnLi4nKTtcbiAgfVxuXG4gIG91dHB1dFBhcnRzID0gb3V0cHV0UGFydHMuY29uY2F0KHRvUGFydHMuc2xpY2Uoc2FtZVBhcnRzTGVuZ3RoKSk7XG5cbiAgcmV0dXJuIG91dHB1dFBhcnRzLmpvaW4oJy8nKTtcbn07XG5cbmV4cG9ydHMuc2VwID0gJy8nO1xuZXhwb3J0cy5kZWxpbWl0ZXIgPSAnOic7XG5cbmV4cG9ydHMuZGlybmFtZSA9IGZ1bmN0aW9uKHBhdGgpIHtcbiAgdmFyIHJlc3VsdCA9IHNwbGl0UGF0aChwYXRoKSxcbiAgICAgIHJvb3QgPSByZXN1bHRbMF0sXG4gICAgICBkaXIgPSByZXN1bHRbMV07XG5cbiAgaWYgKCFyb290ICYmICFkaXIpIHtcbiAgICAvLyBObyBkaXJuYW1lIHdoYXRzb2V2ZXJcbiAgICByZXR1cm4gJy4nO1xuICB9XG5cbiAgaWYgKGRpcikge1xuICAgIC8vIEl0IGhhcyBhIGRpcm5hbWUsIHN0cmlwIHRyYWlsaW5nIHNsYXNoXG4gICAgZGlyID0gZGlyLnN1YnN0cigwLCBkaXIubGVuZ3RoIC0gMSk7XG4gIH1cblxuICByZXR1cm4gcm9vdCArIGRpcjtcbn07XG5cblxuZXhwb3J0cy5iYXNlbmFtZSA9IGZ1bmN0aW9uKHBhdGgsIGV4dCkge1xuICB2YXIgZiA9IHNwbGl0UGF0aChwYXRoKVsyXTtcbiAgLy8gVE9ETzogbWFrZSB0aGlzIGNvbXBhcmlzb24gY2FzZS1pbnNlbnNpdGl2ZSBvbiB3aW5kb3dzP1xuICBpZiAoZXh0ICYmIGYuc3Vic3RyKC0xICogZXh0Lmxlbmd0aCkgPT09IGV4dCkge1xuICAgIGYgPSBmLnN1YnN0cigwLCBmLmxlbmd0aCAtIGV4dC5sZW5ndGgpO1xuICB9XG4gIHJldHVybiBmO1xufTtcblxuXG5leHBvcnRzLmV4dG5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBzcGxpdFBhdGgocGF0aClbM107XG59O1xuXG5mdW5jdGlvbiBmaWx0ZXIgKHhzLCBmKSB7XG4gICAgaWYgKHhzLmZpbHRlcikgcmV0dXJuIHhzLmZpbHRlcihmKTtcbiAgICB2YXIgcmVzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB4cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoZih4c1tpXSwgaSwgeHMpKSByZXMucHVzaCh4c1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXM7XG59XG5cbi8vIFN0cmluZy5wcm90b3R5cGUuc3Vic3RyIC0gbmVnYXRpdmUgaW5kZXggZG9uJ3Qgd29yayBpbiBJRThcbnZhciBzdWJzdHIgPSAnYWInLnN1YnN0cigtMSkgPT09ICdiJ1xuICAgID8gZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikgeyByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKSB9XG4gICAgOiBmdW5jdGlvbiAoc3RyLCBzdGFydCwgbGVuKSB7XG4gICAgICAgIGlmIChzdGFydCA8IDApIHN0YXJ0ID0gc3RyLmxlbmd0aCArIHN0YXJ0O1xuICAgICAgICByZXR1cm4gc3RyLnN1YnN0cihzdGFydCwgbGVuKTtcbiAgICB9XG47XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OXdZWFJvTFdKeWIzZHpaWEpwWm5rdmFXNWtaWGd1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWp0QlFVRkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVNJc0ltWnBiR1VpT2lKblpXNWxjbUYwWldRdWFuTWlMQ0p6YjNWeVkyVlNiMjkwSWpvaUlpd2ljMjkxY21ObGMwTnZiblJsYm5RaU9sc2lMeThnUTI5d2VYSnBaMmgwSUVwdmVXVnVkQ3dnU1c1akxpQmhibVFnYjNSb1pYSWdUbTlrWlNCamIyNTBjbWxpZFhSdmNuTXVYRzR2TDF4dUx5OGdVR1Z5YldsemMybHZiaUJwY3lCb1pYSmxZbmtnWjNKaGJuUmxaQ3dnWm5KbFpTQnZaaUJqYUdGeVoyVXNJSFJ2SUdGdWVTQndaWEp6YjI0Z2IySjBZV2x1YVc1bklHRmNiaTh2SUdOdmNIa2diMllnZEdocGN5QnpiMlowZDJGeVpTQmhibVFnWVhOemIyTnBZWFJsWkNCa2IyTjFiV1Z1ZEdGMGFXOXVJR1pwYkdWeklDaDBhR1ZjYmk4dklGd2lVMjltZEhkaGNtVmNJaWtzSUhSdklHUmxZV3dnYVc0Z2RHaGxJRk52Wm5SM1lYSmxJSGRwZEdodmRYUWdjbVZ6ZEhKcFkzUnBiMjRzSUdsdVkyeDFaR2x1WjF4dUx5OGdkMmwwYUc5MWRDQnNhVzFwZEdGMGFXOXVJSFJvWlNCeWFXZG9kSE1nZEc4Z2RYTmxMQ0JqYjNCNUxDQnRiMlJwWm5rc0lHMWxjbWRsTENCd2RXSnNhWE5vTEZ4dUx5OGdaR2x6ZEhKcFluVjBaU3dnYzNWaWJHbGpaVzV6WlN3Z1lXNWtMMjl5SUhObGJHd2dZMjl3YVdWeklHOW1JSFJvWlNCVGIyWjBkMkZ5WlN3Z1lXNWtJSFJ2SUhCbGNtMXBkRnh1THk4Z2NHVnljMjl1Y3lCMGJ5QjNhRzl0SUhSb1pTQlRiMlowZDJGeVpTQnBjeUJtZFhKdWFYTm9aV1FnZEc4Z1pHOGdjMjhzSUhOMVltcGxZM1FnZEc4Z2RHaGxYRzR2THlCbWIyeHNiM2RwYm1jZ1kyOXVaR2wwYVc5dWN6cGNiaTh2WEc0dkx5QlVhR1VnWVdKdmRtVWdZMjl3ZVhKcFoyaDBJRzV2ZEdsalpTQmhibVFnZEdocGN5QndaWEp0YVhOemFXOXVJRzV2ZEdsalpTQnphR0ZzYkNCaVpTQnBibU5zZFdSbFpGeHVMeThnYVc0Z1lXeHNJR052Y0dsbGN5QnZjaUJ6ZFdKemRHRnVkR2xoYkNCd2IzSjBhVzl1Y3lCdlppQjBhR1VnVTI5bWRIZGhjbVV1WEc0dkwxeHVMeThnVkVoRklGTlBSbFJYUVZKRklFbFRJRkJTVDFaSlJFVkVJRndpUVZNZ1NWTmNJaXdnVjBsVVNFOVZWQ0JYUVZKU1FVNVVXU0JQUmlCQlRsa2dTMGxPUkN3Z1JWaFFVa1ZUVTF4dUx5OGdUMUlnU1UxUVRFbEZSQ3dnU1U1RFRGVkVTVTVISUVKVlZDQk9UMVFnVEVsTlNWUkZSQ0JVVHlCVVNFVWdWMEZTVWtGT1ZFbEZVeUJQUmx4dUx5OGdUVVZTUTBoQlRsUkJRa2xNU1ZSWkxDQkdTVlJPUlZOVElFWlBVaUJCSUZCQlVsUkpRMVZNUVZJZ1VGVlNVRTlUUlNCQlRrUWdUazlPU1U1R1VrbE9SMFZOUlU1VUxpQkpUbHh1THk4Z1RrOGdSVlpGVGxRZ1UwaEJURXdnVkVoRklFRlZWRWhQVWxNZ1QxSWdRMDlRV1ZKSlIwaFVJRWhQVEVSRlVsTWdRa1VnVEVsQlFreEZJRVpQVWlCQlRsa2dRMHhCU1Uwc1hHNHZMeUJFUVUxQlIwVlRJRTlTSUU5VVNFVlNJRXhKUVVKSlRFbFVXU3dnVjBoRlZFaEZVaUJKVGlCQlRpQkJRMVJKVDA0Z1QwWWdRMDlPVkZKQlExUXNJRlJQVWxRZ1QxSmNiaTh2SUU5VVNFVlNWMGxUUlN3Z1FWSkpVMGxPUnlCR1VrOU5MQ0JQVlZRZ1QwWWdUMUlnU1U0Z1EwOU9Ua1ZEVkVsUFRpQlhTVlJJSUZSSVJTQlRUMFpVVjBGU1JTQlBVaUJVU0VWY2JpOHZJRlZUUlNCUFVpQlBWRWhGVWlCRVJVRk1TVTVIVXlCSlRpQlVTRVVnVTA5R1ZGZEJVa1V1WEc1Y2JpOHZJSEpsYzI5c2RtVnpJQzRnWVc1a0lDNHVJR1ZzWlcxbGJuUnpJR2x1SUdFZ2NHRjBhQ0JoY25KaGVTQjNhWFJvSUdScGNtVmpkRzl5ZVNCdVlXMWxjeUIwYUdWeVpWeHVMeThnYlhWemRDQmlaU0J1YnlCemJHRnphR1Z6TENCbGJYQjBlU0JsYkdWdFpXNTBjeXdnYjNJZ1pHVjJhV05sSUc1aGJXVnpJQ2hqT2x4Y0tTQnBiaUIwYUdVZ1lYSnlZWGxjYmk4dklDaHpieUJoYkhOdklHNXZJR3hsWVdScGJtY2dZVzVrSUhSeVlXbHNhVzVuSUhOc1lYTm9aWE1nTFNCcGRDQmtiMlZ6SUc1dmRDQmthWE4wYVc1bmRXbHphRnh1THk4Z2NtVnNZWFJwZG1VZ1lXNWtJR0ZpYzI5c2RYUmxJSEJoZEdoektWeHVablZ1WTNScGIyNGdibTl5YldGc2FYcGxRWEp5WVhrb2NHRnlkSE1zSUdGc2JHOTNRV0p2ZG1WU2IyOTBLU0I3WEc0Z0lDOHZJR2xtSUhSb1pTQndZWFJvSUhSeWFXVnpJSFJ2SUdkdklHRmliM1psSUhSb1pTQnliMjkwTENCZ2RYQmdJR1Z1WkhNZ2RYQWdQaUF3WEc0Z0lIWmhjaUIxY0NBOUlEQTdYRzRnSUdadmNpQW9kbUZ5SUdrZ1BTQndZWEowY3k1c1pXNW5kR2dnTFNBeE95QnBJRDQ5SURBN0lHa3RMU2tnZTF4dUlDQWdJSFpoY2lCc1lYTjBJRDBnY0dGeWRITmJhVjA3WEc0Z0lDQWdhV1lnS0d4aGMzUWdQVDA5SUNjdUp5a2dlMXh1SUNBZ0lDQWdjR0Z5ZEhNdWMzQnNhV05sS0drc0lERXBPMXh1SUNBZ0lIMGdaV3h6WlNCcFppQW9iR0Z6ZENBOVBUMGdKeTR1SnlrZ2UxeHVJQ0FnSUNBZ2NHRnlkSE11YzNCc2FXTmxLR2tzSURFcE8xeHVJQ0FnSUNBZ2RYQXJLenRjYmlBZ0lDQjlJR1ZzYzJVZ2FXWWdLSFZ3S1NCN1hHNGdJQ0FnSUNCd1lYSjBjeTV6Y0d4cFkyVW9hU3dnTVNrN1hHNGdJQ0FnSUNCMWNDMHRPMXh1SUNBZ0lIMWNiaUFnZlZ4dVhHNGdJQzh2SUdsbUlIUm9aU0J3WVhSb0lHbHpJR0ZzYkc5M1pXUWdkRzhnWjI4Z1lXSnZkbVVnZEdobElISnZiM1FzSUhKbGMzUnZjbVVnYkdWaFpHbHVaeUF1TG5OY2JpQWdhV1lnS0dGc2JHOTNRV0p2ZG1WU2IyOTBLU0I3WEc0Z0lDQWdabTl5SUNnN0lIVndMUzA3SUhWd0tTQjdYRzRnSUNBZ0lDQndZWEowY3k1MWJuTm9hV1owS0NjdUxpY3BPMXh1SUNBZ0lIMWNiaUFnZlZ4dVhHNGdJSEpsZEhWeWJpQndZWEowY3p0Y2JuMWNibHh1THk4Z1UzQnNhWFFnWVNCbWFXeGxibUZ0WlNCcGJuUnZJRnR5YjI5MExDQmthWElzSUdKaGMyVnVZVzFsTENCbGVIUmRMQ0IxYm1sNElIWmxjbk5wYjI1Y2JpOHZJQ2R5YjI5MEp5QnBjeUJxZFhOMElHRWdjMnhoYzJnc0lHOXlJRzV2ZEdocGJtY3VYRzUyWVhJZ2MzQnNhWFJRWVhSb1VtVWdQVnh1SUNBZ0lDOWVLRnhjTHo5OEtTaGJYRnh6WEZ4VFhTby9LU2dvUHpwY1hDNTdNU3d5Zlh4YlhseGNMMTByUDN3cEtGeGNMbHRlTGx4Y0wxMHFmQ2twS0Q4NlcxeGNMMTBxS1NRdk8xeHVkbUZ5SUhOd2JHbDBVR0YwYUNBOUlHWjFibU4wYVc5dUtHWnBiR1Z1WVcxbEtTQjdYRzRnSUhKbGRIVnliaUJ6Y0d4cGRGQmhkR2hTWlM1bGVHVmpLR1pwYkdWdVlXMWxLUzV6YkdsalpTZ3hLVHRjYm4wN1hHNWNiaTh2SUhCaGRHZ3VjbVZ6YjJ4MlpTaGJabkp2YlNBdUxpNWRMQ0IwYnlsY2JpOHZJSEJ2YzJsNElIWmxjbk5wYjI1Y2JtVjRjRzl5ZEhNdWNtVnpiMngyWlNBOUlHWjFibU4wYVc5dUtDa2dlMXh1SUNCMllYSWdjbVZ6YjJ4MlpXUlFZWFJvSUQwZ0p5Y3NYRzRnSUNBZ0lDQnlaWE52YkhabFpFRmljMjlzZFhSbElEMGdabUZzYzJVN1hHNWNiaUFnWm05eUlDaDJZWElnYVNBOUlHRnlaM1Z0Wlc1MGN5NXNaVzVuZEdnZ0xTQXhPeUJwSUQ0OUlDMHhJQ1ltSUNGeVpYTnZiSFpsWkVGaWMyOXNkWFJsT3lCcExTMHBJSHRjYmlBZ0lDQjJZWElnY0dGMGFDQTlJQ2hwSUQ0OUlEQXBJRDhnWVhKbmRXMWxiblJ6VzJsZElEb2djSEp2WTJWemN5NWpkMlFvS1R0Y2JseHVJQ0FnSUM4dklGTnJhWEFnWlcxd2RIa2dZVzVrSUdsdWRtRnNhV1FnWlc1MGNtbGxjMXh1SUNBZ0lHbG1JQ2gwZVhCbGIyWWdjR0YwYUNBaFBUMGdKM04wY21sdVp5Y3BJSHRjYmlBZ0lDQWdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0lvSjBGeVozVnRaVzUwY3lCMGJ5QndZWFJvTG5KbGMyOXNkbVVnYlhWemRDQmlaU0J6ZEhKcGJtZHpKeWs3WEc0Z0lDQWdmU0JsYkhObElHbG1JQ2doY0dGMGFDa2dlMXh1SUNBZ0lDQWdZMjl1ZEdsdWRXVTdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2NtVnpiMngyWldSUVlYUm9JRDBnY0dGMGFDQXJJQ2N2SnlBcklISmxjMjlzZG1Wa1VHRjBhRHRjYmlBZ0lDQnlaWE52YkhabFpFRmljMjlzZFhSbElEMGdjR0YwYUM1amFHRnlRWFFvTUNrZ1BUMDlJQ2N2Snp0Y2JpQWdmVnh1WEc0Z0lDOHZJRUYwSUhSb2FYTWdjRzlwYm5RZ2RHaGxJSEJoZEdnZ2MyaHZkV3hrSUdKbElISmxjMjlzZG1Wa0lIUnZJR0VnWm5Wc2JDQmhZbk52YkhWMFpTQndZWFJvTENCaWRYUmNiaUFnTHk4Z2FHRnVaR3hsSUhKbGJHRjBhWFpsSUhCaGRHaHpJSFJ2SUdKbElITmhabVVnS0cxcFoyaDBJR2hoY0hCbGJpQjNhR1Z1SUhCeWIyTmxjM011WTNka0tDa2dabUZwYkhNcFhHNWNiaUFnTHk4Z1RtOXliV0ZzYVhwbElIUm9aU0J3WVhSb1hHNGdJSEpsYzI5c2RtVmtVR0YwYUNBOUlHNXZjbTFoYkdsNlpVRnljbUY1S0dacGJIUmxjaWh5WlhOdmJIWmxaRkJoZEdndWMzQnNhWFFvSnk4bktTd2dablZ1WTNScGIyNG9jQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQWhJWEE3WEc0Z0lIMHBMQ0FoY21WemIyeDJaV1JCWW5OdmJIVjBaU2t1YW05cGJpZ25MeWNwTzF4dVhHNGdJSEpsZEhWeWJpQW9LSEpsYzI5c2RtVmtRV0p6YjJ4MWRHVWdQeUFuTHljZ09pQW5KeWtnS3lCeVpYTnZiSFpsWkZCaGRHZ3BJSHg4SUNjdUp6dGNibjA3WEc1Y2JpOHZJSEJoZEdndWJtOXliV0ZzYVhwbEtIQmhkR2dwWEc0dkx5QndiM05wZUNCMlpYSnphVzl1WEc1bGVIQnZjblJ6TG01dmNtMWhiR2w2WlNBOUlHWjFibU4wYVc5dUtIQmhkR2dwSUh0Y2JpQWdkbUZ5SUdselFXSnpiMngxZEdVZ1BTQmxlSEJ2Y25SekxtbHpRV0p6YjJ4MWRHVW9jR0YwYUNrc1hHNGdJQ0FnSUNCMGNtRnBiR2x1WjFOc1lYTm9JRDBnYzNWaWMzUnlLSEJoZEdnc0lDMHhLU0E5UFQwZ0p5OG5PMXh1WEc0Z0lDOHZJRTV2Y20xaGJHbDZaU0IwYUdVZ2NHRjBhRnh1SUNCd1lYUm9JRDBnYm05eWJXRnNhWHBsUVhKeVlYa29abWxzZEdWeUtIQmhkR2d1YzNCc2FYUW9KeThuS1N3Z1puVnVZM1JwYjI0b2NDa2dlMXh1SUNBZ0lISmxkSFZ5YmlBaElYQTdYRzRnSUgwcExDQWhhWE5CWW5OdmJIVjBaU2t1YW05cGJpZ25MeWNwTzF4dVhHNGdJR2xtSUNnaGNHRjBhQ0FtSmlBaGFYTkJZbk52YkhWMFpTa2dlMXh1SUNBZ0lIQmhkR2dnUFNBbkxpYzdYRzRnSUgxY2JpQWdhV1lnS0hCaGRHZ2dKaVlnZEhKaGFXeHBibWRUYkdGemFDa2dlMXh1SUNBZ0lIQmhkR2dnS3owZ0p5OG5PMXh1SUNCOVhHNWNiaUFnY21WMGRYSnVJQ2hwYzBGaWMyOXNkWFJsSUQ4Z0p5OG5JRG9nSnljcElDc2djR0YwYUR0Y2JuMDdYRzVjYmk4dklIQnZjMmw0SUhabGNuTnBiMjVjYm1WNGNHOXlkSE11YVhOQlluTnZiSFYwWlNBOUlHWjFibU4wYVc5dUtIQmhkR2dwSUh0Y2JpQWdjbVYwZFhKdUlIQmhkR2d1WTJoaGNrRjBLREFwSUQwOVBTQW5MeWM3WEc1OU8xeHVYRzR2THlCd2IzTnBlQ0IyWlhKemFXOXVYRzVsZUhCdmNuUnpMbXB2YVc0Z1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ2RtRnlJSEJoZEdoeklEMGdRWEp5WVhrdWNISnZkRzkwZVhCbExuTnNhV05sTG1OaGJHd29ZWEpuZFcxbGJuUnpMQ0F3S1R0Y2JpQWdjbVYwZFhKdUlHVjRjRzl5ZEhNdWJtOXliV0ZzYVhwbEtHWnBiSFJsY2lod1lYUm9jeXdnWm5WdVkzUnBiMjRvY0N3Z2FXNWtaWGdwSUh0Y2JpQWdJQ0JwWmlBb2RIbHdaVzltSUhBZ0lUMDlJQ2R6ZEhKcGJtY25LU0I3WEc0Z0lDQWdJQ0IwYUhKdmR5QnVaWGNnVkhsd1pVVnljbTl5S0NkQmNtZDFiV1Z1ZEhNZ2RHOGdjR0YwYUM1cWIybHVJRzExYzNRZ1ltVWdjM1J5YVc1bmN5Y3BPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnY0R0Y2JpQWdmU2t1YW05cGJpZ25MeWNwS1R0Y2JuMDdYRzVjYmx4dUx5OGdjR0YwYUM1eVpXeGhkR2wyWlNobWNtOXRMQ0IwYnlsY2JpOHZJSEJ2YzJsNElIWmxjbk5wYjI1Y2JtVjRjRzl5ZEhNdWNtVnNZWFJwZG1VZ1BTQm1kVzVqZEdsdmJpaG1jbTl0TENCMGJ5a2dlMXh1SUNCbWNtOXRJRDBnWlhod2IzSjBjeTV5WlhOdmJIWmxLR1p5YjIwcExuTjFZbk4wY2lneEtUdGNiaUFnZEc4Z1BTQmxlSEJ2Y25SekxuSmxjMjlzZG1Vb2RHOHBMbk4xWW5OMGNpZ3hLVHRjYmx4dUlDQm1kVzVqZEdsdmJpQjBjbWx0S0dGeWNpa2dlMXh1SUNBZ0lIWmhjaUJ6ZEdGeWRDQTlJREE3WEc0Z0lDQWdabTl5SUNnN0lITjBZWEowSUR3Z1lYSnlMbXhsYm1kMGFEc2djM1JoY25Rckt5a2dlMXh1SUNBZ0lDQWdhV1lnS0dGeWNsdHpkR0Z5ZEYwZ0lUMDlJQ2NuS1NCaWNtVmhhenRjYmlBZ0lDQjlYRzVjYmlBZ0lDQjJZWElnWlc1a0lEMGdZWEp5TG14bGJtZDBhQ0F0SURFN1hHNGdJQ0FnWm05eUlDZzdJR1Z1WkNBK1BTQXdPeUJsYm1RdExTa2dlMXh1SUNBZ0lDQWdhV1lnS0dGeWNsdGxibVJkSUNFOVBTQW5KeWtnWW5KbFlXczdYRzRnSUNBZ2ZWeHVYRzRnSUNBZ2FXWWdLSE4wWVhKMElENGdaVzVrS1NCeVpYUjFjbTRnVzEwN1hHNGdJQ0FnY21WMGRYSnVJR0Z5Y2k1emJHbGpaU2h6ZEdGeWRDd2daVzVrSUMwZ2MzUmhjblFnS3lBeEtUdGNiaUFnZlZ4dVhHNGdJSFpoY2lCbWNtOXRVR0Z5ZEhNZ1BTQjBjbWx0S0daeWIyMHVjM0JzYVhRb0p5OG5LU2s3WEc0Z0lIWmhjaUIwYjFCaGNuUnpJRDBnZEhKcGJTaDBieTV6Y0d4cGRDZ25MeWNwS1R0Y2JseHVJQ0IyWVhJZ2JHVnVaM1JvSUQwZ1RXRjBhQzV0YVc0b1puSnZiVkJoY25SekxteGxibWQwYUN3Z2RHOVFZWEowY3k1c1pXNW5kR2dwTzF4dUlDQjJZWElnYzJGdFpWQmhjblJ6VEdWdVozUm9JRDBnYkdWdVozUm9PMXh1SUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElHeGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdhV1lnS0daeWIyMVFZWEowYzF0cFhTQWhQVDBnZEc5UVlYSjBjMXRwWFNrZ2UxeHVJQ0FnSUNBZ2MyRnRaVkJoY25SelRHVnVaM1JvSUQwZ2FUdGNiaUFnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUhaaGNpQnZkWFJ3ZFhSUVlYSjBjeUE5SUZ0ZE8xeHVJQ0JtYjNJZ0tIWmhjaUJwSUQwZ2MyRnRaVkJoY25SelRHVnVaM1JvT3lCcElEd2dabkp2YlZCaGNuUnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnYjNWMGNIVjBVR0Z5ZEhNdWNIVnphQ2duTGk0bktUdGNiaUFnZlZ4dVhHNGdJRzkxZEhCMWRGQmhjblJ6SUQwZ2IzVjBjSFYwVUdGeWRITXVZMjl1WTJGMEtIUnZVR0Z5ZEhNdWMyeHBZMlVvYzJGdFpWQmhjblJ6VEdWdVozUm9LU2s3WEc1Y2JpQWdjbVYwZFhKdUlHOTFkSEIxZEZCaGNuUnpMbXB2YVc0b0p5OG5LVHRjYm4wN1hHNWNibVY0Y0c5eWRITXVjMlZ3SUQwZ0p5OG5PMXh1Wlhod2IzSjBjeTVrWld4cGJXbDBaWElnUFNBbk9pYzdYRzVjYm1WNGNHOXlkSE11WkdseWJtRnRaU0E5SUdaMWJtTjBhVzl1S0hCaGRHZ3BJSHRjYmlBZ2RtRnlJSEpsYzNWc2RDQTlJSE53YkdsMFVHRjBhQ2h3WVhSb0tTeGNiaUFnSUNBZ0lISnZiM1FnUFNCeVpYTjFiSFJiTUYwc1hHNGdJQ0FnSUNCa2FYSWdQU0J5WlhOMWJIUmJNVjA3WEc1Y2JpQWdhV1lnS0NGeWIyOTBJQ1ltSUNGa2FYSXBJSHRjYmlBZ0lDQXZMeUJPYnlCa2FYSnVZVzFsSUhkb1lYUnpiMlYyWlhKY2JpQWdJQ0J5WlhSMWNtNGdKeTRuTzF4dUlDQjlYRzVjYmlBZ2FXWWdLR1JwY2lrZ2UxeHVJQ0FnSUM4dklFbDBJR2hoY3lCaElHUnBjbTVoYldVc0lITjBjbWx3SUhSeVlXbHNhVzVuSUhOc1lYTm9YRzRnSUNBZ1pHbHlJRDBnWkdseUxuTjFZbk4wY2lnd0xDQmthWEl1YkdWdVozUm9JQzBnTVNrN1hHNGdJSDFjYmx4dUlDQnlaWFIxY200Z2NtOXZkQ0FySUdScGNqdGNibjA3WEc1Y2JseHVaWGh3YjNKMGN5NWlZWE5sYm1GdFpTQTlJR1oxYm1OMGFXOXVLSEJoZEdnc0lHVjRkQ2tnZTF4dUlDQjJZWElnWmlBOUlITndiR2wwVUdGMGFDaHdZWFJvS1ZzeVhUdGNiaUFnTHk4Z1ZFOUVUem9nYldGclpTQjBhR2x6SUdOdmJYQmhjbWx6YjI0Z1kyRnpaUzFwYm5ObGJuTnBkR2wyWlNCdmJpQjNhVzVrYjNkelAxeHVJQ0JwWmlBb1pYaDBJQ1ltSUdZdWMzVmljM1J5S0MweElDb2daWGgwTG14bGJtZDBhQ2tnUFQwOUlHVjRkQ2tnZTF4dUlDQWdJR1lnUFNCbUxuTjFZbk4wY2lnd0xDQm1MbXhsYm1kMGFDQXRJR1Y0ZEM1c1pXNW5kR2dwTzF4dUlDQjlYRzRnSUhKbGRIVnliaUJtTzF4dWZUdGNibHh1WEc1bGVIQnZjblJ6TG1WNGRHNWhiV1VnUFNCbWRXNWpkR2x2Ymlod1lYUm9LU0I3WEc0Z0lISmxkSFZ5YmlCemNHeHBkRkJoZEdnb2NHRjBhQ2xiTTEwN1hHNTlPMXh1WEc1bWRXNWpkR2x2YmlCbWFXeDBaWElnS0hoekxDQm1LU0I3WEc0Z0lDQWdhV1lnS0hoekxtWnBiSFJsY2lrZ2NtVjBkWEp1SUhoekxtWnBiSFJsY2lobUtUdGNiaUFnSUNCMllYSWdjbVZ6SUQwZ1cxMDdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQjRjeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvWmloNGMxdHBYU3dnYVN3Z2VITXBLU0J5WlhNdWNIVnphQ2g0YzF0cFhTazdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ5WlhNN1hHNTlYRzVjYmk4dklGTjBjbWx1Wnk1d2NtOTBiM1I1Y0dVdWMzVmljM1J5SUMwZ2JtVm5ZWFJwZG1VZ2FXNWtaWGdnWkc5dUozUWdkMjl5YXlCcGJpQkpSVGhjYm5aaGNpQnpkV0p6ZEhJZ1BTQW5ZV0luTG5OMVluTjBjaWd0TVNrZ1BUMDlJQ2RpSjF4dUlDQWdJRDhnWm5WdVkzUnBiMjRnS0hOMGNpd2djM1JoY25Rc0lHeGxiaWtnZXlCeVpYUjFjbTRnYzNSeUxuTjFZbk4wY2loemRHRnlkQ3dnYkdWdUtTQjlYRzRnSUNBZ09pQm1kVzVqZEdsdmJpQW9jM1J5TENCemRHRnlkQ3dnYkdWdUtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNoemRHRnlkQ0E4SURBcElITjBZWEowSUQwZ2MzUnlMbXhsYm1kMGFDQXJJSE4wWVhKME8xeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2MzUnlMbk4xWW5OMGNpaHpkR0Z5ZEN3Z2JHVnVLVHRjYmlBZ0lDQjlYRzQ3WEc0aVhYMD0iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcblxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG5wcm9jZXNzLm5leHRUaWNrID0gKGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgY2FuU2V0SW1tZWRpYXRlID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuc2V0SW1tZWRpYXRlO1xuICAgIHZhciBjYW5NdXRhdGlvbk9ic2VydmVyID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCdcbiAgICAmJiB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcjtcbiAgICB2YXIgY2FuUG9zdCA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnBvc3RNZXNzYWdlICYmIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyXG4gICAgO1xuXG4gICAgaWYgKGNhblNldEltbWVkaWF0ZSkge1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGYpIHsgcmV0dXJuIHdpbmRvdy5zZXRJbW1lZGlhdGUoZikgfTtcbiAgICB9XG5cbiAgICB2YXIgcXVldWUgPSBbXTtcblxuICAgIGlmIChjYW5NdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgICAgIHZhciBoaWRkZW5EaXYgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgICB2YXIgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgcXVldWVMaXN0ID0gcXVldWUuc2xpY2UoKTtcbiAgICAgICAgICAgIHF1ZXVlLmxlbmd0aCA9IDA7XG4gICAgICAgICAgICBxdWV1ZUxpc3QuZm9yRWFjaChmdW5jdGlvbiAoZm4pIHtcbiAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG9ic2VydmVyLm9ic2VydmUoaGlkZGVuRGl2LCB7IGF0dHJpYnV0ZXM6IHRydWUgfSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBpZiAoIXF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIGhpZGRlbkRpdi5zZXRBdHRyaWJ1dGUoJ3llcycsICdubycpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGNhblBvc3QpIHtcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgIHZhciBzb3VyY2UgPSBldi5zb3VyY2U7XG4gICAgICAgICAgICBpZiAoKHNvdXJjZSA9PT0gd2luZG93IHx8IHNvdXJjZSA9PT0gbnVsbCkgJiYgZXYuZGF0YSA9PT0gJ3Byb2Nlc3MtdGljaycpIHtcbiAgICAgICAgICAgICAgICBldi5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICBpZiAocXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZm4gPSBxdWV1ZS5zaGlmdCgpO1xuICAgICAgICAgICAgICAgICAgICBmbigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGZuKTtcbiAgICAgICAgICAgIHdpbmRvdy5wb3N0TWVzc2FnZSgncHJvY2Vzcy10aWNrJywgJyonKTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4gZnVuY3Rpb24gbmV4dFRpY2soZm4pIHtcbiAgICAgICAgc2V0VGltZW91dChmbiwgMCk7XG4gICAgfTtcbn0pKCk7XG5cbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzLGdsb2JhbCl7XG4oZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgaWYgKGdsb2JhbC4kdHJhY2V1clJ1bnRpbWUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdmFyICRPYmplY3QgPSBPYmplY3Q7XG4gIHZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuICB2YXIgJGNyZWF0ZSA9ICRPYmplY3QuY3JlYXRlO1xuICB2YXIgJGRlZmluZVByb3BlcnRpZXMgPSAkT2JqZWN0LmRlZmluZVByb3BlcnRpZXM7XG4gIHZhciAkZGVmaW5lUHJvcGVydHkgPSAkT2JqZWN0LmRlZmluZVByb3BlcnR5O1xuICB2YXIgJGZyZWV6ZSA9ICRPYmplY3QuZnJlZXplO1xuICB2YXIgJGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9ICRPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuICB2YXIgJGdldE93blByb3BlcnR5TmFtZXMgPSAkT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXM7XG4gIHZhciAka2V5cyA9ICRPYmplY3Qua2V5cztcbiAgdmFyICRoYXNPd25Qcm9wZXJ0eSA9ICRPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuICB2YXIgJHRvU3RyaW5nID0gJE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIHZhciAkcHJldmVudEV4dGVuc2lvbnMgPSBPYmplY3QucHJldmVudEV4dGVuc2lvbnM7XG4gIHZhciAkc2VhbCA9IE9iamVjdC5zZWFsO1xuICB2YXIgJGlzRXh0ZW5zaWJsZSA9IE9iamVjdC5pc0V4dGVuc2libGU7XG4gIGZ1bmN0aW9uIG5vbkVudW0odmFsdWUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH07XG4gIH1cbiAgdmFyIG1ldGhvZCA9IG5vbkVudW07XG4gIHZhciBjb3VudGVyID0gMDtcbiAgZnVuY3Rpb24gbmV3VW5pcXVlU3RyaW5nKCkge1xuICAgIHJldHVybiAnX18kJyArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDFlOSkgKyAnJCcgKyArK2NvdW50ZXIgKyAnJF9fJztcbiAgfVxuICB2YXIgc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICB2YXIgc3ltYm9sRGVzY3JpcHRpb25Qcm9wZXJ0eSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICB2YXIgc3ltYm9sRGF0YVByb3BlcnR5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gIHZhciBzeW1ib2xWYWx1ZXMgPSAkY3JlYXRlKG51bGwpO1xuICB2YXIgcHJpdmF0ZU5hbWVzID0gJGNyZWF0ZShudWxsKTtcbiAgZnVuY3Rpb24gaXNQcml2YXRlTmFtZShzKSB7XG4gICAgcmV0dXJuIHByaXZhdGVOYW1lc1tzXTtcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGVQcml2YXRlTmFtZSgpIHtcbiAgICB2YXIgcyA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICAgIHByaXZhdGVOYW1lc1tzXSA9IHRydWU7XG4gICAgcmV0dXJuIHM7XG4gIH1cbiAgZnVuY3Rpb24gaXNTaGltU3ltYm9sKHN5bWJvbCkge1xuICAgIHJldHVybiB0eXBlb2Ygc3ltYm9sID09PSAnb2JqZWN0JyAmJiBzeW1ib2wgaW5zdGFuY2VvZiBTeW1ib2xWYWx1ZTtcbiAgfVxuICBmdW5jdGlvbiB0eXBlT2Yodikge1xuICAgIGlmIChpc1NoaW1TeW1ib2wodikpXG4gICAgICByZXR1cm4gJ3N5bWJvbCc7XG4gICAgcmV0dXJuIHR5cGVvZiB2O1xuICB9XG4gIGZ1bmN0aW9uIFN5bWJvbChkZXNjcmlwdGlvbikge1xuICAgIHZhciB2YWx1ZSA9IG5ldyBTeW1ib2xWYWx1ZShkZXNjcmlwdGlvbik7XG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFN5bWJvbCkpXG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU3ltYm9sIGNhbm5vdCBiZSBuZXdcXCdlZCcpO1xuICB9XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAnY29uc3RydWN0b3InLCBub25FbnVtKFN5bWJvbCkpO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sLnByb3RvdHlwZSwgJ3RvU3RyaW5nJywgbWV0aG9kKGZ1bmN0aW9uKCkge1xuICAgIHZhciBzeW1ib2xWYWx1ZSA9IHRoaXNbc3ltYm9sRGF0YVByb3BlcnR5XTtcbiAgICBpZiAoIWdldE9wdGlvbignc3ltYm9scycpKVxuICAgICAgcmV0dXJuIHN5bWJvbFZhbHVlW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIGlmICghc3ltYm9sVmFsdWUpXG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ0NvbnZlcnNpb24gZnJvbSBzeW1ib2wgdG8gc3RyaW5nJyk7XG4gICAgdmFyIGRlc2MgPSBzeW1ib2xWYWx1ZVtzeW1ib2xEZXNjcmlwdGlvblByb3BlcnR5XTtcbiAgICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKVxuICAgICAgZGVzYyA9ICcnO1xuICAgIHJldHVybiAnU3ltYm9sKCcgKyBkZXNjICsgJyknO1xuICB9KSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2wucHJvdG90eXBlLCAndmFsdWVPZicsIG1ldGhvZChmdW5jdGlvbigpIHtcbiAgICB2YXIgc3ltYm9sVmFsdWUgPSB0aGlzW3N5bWJvbERhdGFQcm9wZXJ0eV07XG4gICAgaWYgKCFzeW1ib2xWYWx1ZSlcbiAgICAgIHRocm93IFR5cGVFcnJvcignQ29udmVyc2lvbiBmcm9tIHN5bWJvbCB0byBzdHJpbmcnKTtcbiAgICBpZiAoIWdldE9wdGlvbignc3ltYm9scycpKVxuICAgICAgcmV0dXJuIHN5bWJvbFZhbHVlW3N5bWJvbEludGVybmFsUHJvcGVydHldO1xuICAgIHJldHVybiBzeW1ib2xWYWx1ZTtcbiAgfSkpO1xuICBmdW5jdGlvbiBTeW1ib2xWYWx1ZShkZXNjcmlwdGlvbikge1xuICAgIHZhciBrZXkgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sRGF0YVByb3BlcnR5LCB7dmFsdWU6IHRoaXN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eSwge3ZhbHVlOiBrZXl9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkodGhpcywgc3ltYm9sRGVzY3JpcHRpb25Qcm9wZXJ0eSwge3ZhbHVlOiBkZXNjcmlwdGlvbn0pO1xuICAgIGZyZWV6ZSh0aGlzKTtcbiAgICBzeW1ib2xWYWx1ZXNba2V5XSA9IHRoaXM7XG4gIH1cbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbFZhbHVlLnByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgbm9uRW51bShTeW1ib2wpKTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbFZhbHVlLnByb3RvdHlwZSwgJ3RvU3RyaW5nJywge1xuICAgIHZhbHVlOiBTeW1ib2wucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sVmFsdWUucHJvdG90eXBlLCAndmFsdWVPZicsIHtcbiAgICB2YWx1ZTogU3ltYm9sLnByb3RvdHlwZS52YWx1ZU9mLFxuICAgIGVudW1lcmFibGU6IGZhbHNlXG4gIH0pO1xuICB2YXIgaGFzaFByb3BlcnR5ID0gY3JlYXRlUHJpdmF0ZU5hbWUoKTtcbiAgdmFyIGhhc2hQcm9wZXJ0eURlc2NyaXB0b3IgPSB7dmFsdWU6IHVuZGVmaW5lZH07XG4gIHZhciBoYXNoT2JqZWN0UHJvcGVydGllcyA9IHtcbiAgICBoYXNoOiB7dmFsdWU6IHVuZGVmaW5lZH0sXG4gICAgc2VsZjoge3ZhbHVlOiB1bmRlZmluZWR9XG4gIH07XG4gIHZhciBoYXNoQ291bnRlciA9IDA7XG4gIGZ1bmN0aW9uIGdldE93bkhhc2hPYmplY3Qob2JqZWN0KSB7XG4gICAgdmFyIGhhc2hPYmplY3QgPSBvYmplY3RbaGFzaFByb3BlcnR5XTtcbiAgICBpZiAoaGFzaE9iamVjdCAmJiBoYXNoT2JqZWN0LnNlbGYgPT09IG9iamVjdClcbiAgICAgIHJldHVybiBoYXNoT2JqZWN0O1xuICAgIGlmICgkaXNFeHRlbnNpYmxlKG9iamVjdCkpIHtcbiAgICAgIGhhc2hPYmplY3RQcm9wZXJ0aWVzLmhhc2gudmFsdWUgPSBoYXNoQ291bnRlcisrO1xuICAgICAgaGFzaE9iamVjdFByb3BlcnRpZXMuc2VsZi52YWx1ZSA9IG9iamVjdDtcbiAgICAgIGhhc2hQcm9wZXJ0eURlc2NyaXB0b3IudmFsdWUgPSAkY3JlYXRlKG51bGwsIGhhc2hPYmplY3RQcm9wZXJ0aWVzKTtcbiAgICAgICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIGhhc2hQcm9wZXJ0eSwgaGFzaFByb3BlcnR5RGVzY3JpcHRvcik7XG4gICAgICByZXR1cm4gaGFzaFByb3BlcnR5RGVzY3JpcHRvci52YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBmcmVlemUob2JqZWN0KSB7XG4gICAgZ2V0T3duSGFzaE9iamVjdChvYmplY3QpO1xuICAgIHJldHVybiAkZnJlZXplLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cbiAgZnVuY3Rpb24gcHJldmVudEV4dGVuc2lvbnMob2JqZWN0KSB7XG4gICAgZ2V0T3duSGFzaE9iamVjdChvYmplY3QpO1xuICAgIHJldHVybiAkcHJldmVudEV4dGVuc2lvbnMuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuICBmdW5jdGlvbiBzZWFsKG9iamVjdCkge1xuICAgIGdldE93bkhhc2hPYmplY3Qob2JqZWN0KTtcbiAgICByZXR1cm4gJHNlYWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuICBmcmVlemUoU3ltYm9sVmFsdWUucHJvdG90eXBlKTtcbiAgZnVuY3Rpb24gaXNTeW1ib2xTdHJpbmcocykge1xuICAgIHJldHVybiBzeW1ib2xWYWx1ZXNbc10gfHwgcHJpdmF0ZU5hbWVzW3NdO1xuICB9XG4gIGZ1bmN0aW9uIHRvUHJvcGVydHkobmFtZSkge1xuICAgIGlmIChpc1NoaW1TeW1ib2wobmFtZSkpXG4gICAgICByZXR1cm4gbmFtZVtzeW1ib2xJbnRlcm5hbFByb3BlcnR5XTtcbiAgICByZXR1cm4gbmFtZTtcbiAgfVxuICBmdW5jdGlvbiByZW1vdmVTeW1ib2xLZXlzKGFycmF5KSB7XG4gICAgdmFyIHJ2ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFpc1N5bWJvbFN0cmluZyhhcnJheVtpXSkpIHtcbiAgICAgICAgcnYucHVzaChhcnJheVtpXSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydjtcbiAgfVxuICBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkge1xuICAgIHJldHVybiByZW1vdmVTeW1ib2xLZXlzKCRnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCkpO1xuICB9XG4gIGZ1bmN0aW9uIGtleXMob2JqZWN0KSB7XG4gICAgcmV0dXJuIHJlbW92ZVN5bWJvbEtleXMoJGtleXMob2JqZWN0KSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iamVjdCkge1xuICAgIHZhciBydiA9IFtdO1xuICAgIHZhciBuYW1lcyA9ICRnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHN5bWJvbCA9IHN5bWJvbFZhbHVlc1tuYW1lc1tpXV07XG4gICAgICBpZiAoc3ltYm9sKSB7XG4gICAgICAgIHJ2LnB1c2goc3ltYm9sKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJ2O1xuICB9XG4gIGZ1bmN0aW9uIGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpIHtcbiAgICByZXR1cm4gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIHRvUHJvcGVydHkobmFtZSkpO1xuICB9XG4gIGZ1bmN0aW9uIGhhc093blByb3BlcnR5KG5hbWUpIHtcbiAgICByZXR1cm4gJGhhc093blByb3BlcnR5LmNhbGwodGhpcywgdG9Qcm9wZXJ0eShuYW1lKSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3B0aW9uKG5hbWUpIHtcbiAgICByZXR1cm4gZ2xvYmFsLnRyYWNldXIgJiYgZ2xvYmFsLnRyYWNldXIub3B0aW9uc1tuYW1lXTtcbiAgfVxuICBmdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIGRlc2NyaXB0b3IpIHtcbiAgICBpZiAoaXNTaGltU3ltYm9sKG5hbWUpKSB7XG4gICAgICBuYW1lID0gbmFtZVtzeW1ib2xJbnRlcm5hbFByb3BlcnR5XTtcbiAgICB9XG4gICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwgZGVzY3JpcHRvcik7XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbE9iamVjdChPYmplY3QpIHtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZGVmaW5lUHJvcGVydHknLCB7dmFsdWU6IGRlZmluZVByb3BlcnR5fSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2dldE93blByb3BlcnR5TmFtZXMnLCB7dmFsdWU6IGdldE93blByb3BlcnR5TmFtZXN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yJywge3ZhbHVlOiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3J9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgJ2hhc093blByb3BlcnR5Jywge3ZhbHVlOiBoYXNPd25Qcm9wZXJ0eX0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdmcmVlemUnLCB7dmFsdWU6IGZyZWV6ZX0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdwcmV2ZW50RXh0ZW5zaW9ucycsIHt2YWx1ZTogcHJldmVudEV4dGVuc2lvbnN9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnc2VhbCcsIHt2YWx1ZTogc2VhbH0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdrZXlzJywge3ZhbHVlOiBrZXlzfSk7XG4gIH1cbiAgZnVuY3Rpb24gZXhwb3J0U3RhcihvYmplY3QpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5hbWVzID0gJGdldE93blByb3BlcnR5TmFtZXMoYXJndW1lbnRzW2ldKTtcbiAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbmFtZXMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgdmFyIG5hbWUgPSBuYW1lc1tqXTtcbiAgICAgICAgaWYgKGlzU3ltYm9sU3RyaW5nKG5hbWUpKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAoZnVuY3Rpb24obW9kLCBuYW1lKSB7XG4gICAgICAgICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgbmFtZSwge1xuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIG1vZFtuYW1lXTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pKGFyZ3VtZW50c1tpXSwgbmFtZXNbal0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcbiAgICByZXR1cm4geCAhPSBudWxsICYmICh0eXBlb2YgeCA9PT0gJ29iamVjdCcgfHwgdHlwZW9mIHggPT09ICdmdW5jdGlvbicpO1xuICB9XG4gIGZ1bmN0aW9uIHRvT2JqZWN0KHgpIHtcbiAgICBpZiAoeCA9PSBudWxsKVxuICAgICAgdGhyb3cgJFR5cGVFcnJvcigpO1xuICAgIHJldHVybiAkT2JqZWN0KHgpO1xuICB9XG4gIGZ1bmN0aW9uIGNoZWNrT2JqZWN0Q29lcmNpYmxlKGFyZ3VtZW50KSB7XG4gICAgaWYgKGFyZ3VtZW50ID09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1ZhbHVlIGNhbm5vdCBiZSBjb252ZXJ0ZWQgdG8gYW4gT2JqZWN0Jyk7XG4gICAgfVxuICAgIHJldHVybiBhcmd1bWVudDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbFN5bWJvbChnbG9iYWwsIFN5bWJvbCkge1xuICAgIGlmICghZ2xvYmFsLlN5bWJvbCkge1xuICAgICAgZ2xvYmFsLlN5bWJvbCA9IFN5bWJvbDtcbiAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBnZXRPd25Qcm9wZXJ0eVN5bWJvbHM7XG4gICAgfVxuICAgIGlmICghZ2xvYmFsLlN5bWJvbC5pdGVyYXRvcikge1xuICAgICAgZ2xvYmFsLlN5bWJvbC5pdGVyYXRvciA9IFN5bWJvbCgnU3ltYm9sLml0ZXJhdG9yJyk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIHNldHVwR2xvYmFscyhnbG9iYWwpIHtcbiAgICBwb2x5ZmlsbFN5bWJvbChnbG9iYWwsIFN5bWJvbCk7XG4gICAgZ2xvYmFsLlJlZmxlY3QgPSBnbG9iYWwuUmVmbGVjdCB8fCB7fTtcbiAgICBnbG9iYWwuUmVmbGVjdC5nbG9iYWwgPSBnbG9iYWwuUmVmbGVjdC5nbG9iYWwgfHwgZ2xvYmFsO1xuICAgIHBvbHlmaWxsT2JqZWN0KGdsb2JhbC5PYmplY3QpO1xuICB9XG4gIHNldHVwR2xvYmFscyhnbG9iYWwpO1xuICBnbG9iYWwuJHRyYWNldXJSdW50aW1lID0ge1xuICAgIGNoZWNrT2JqZWN0Q29lcmNpYmxlOiBjaGVja09iamVjdENvZXJjaWJsZSxcbiAgICBjcmVhdGVQcml2YXRlTmFtZTogY3JlYXRlUHJpdmF0ZU5hbWUsXG4gICAgZGVmaW5lUHJvcGVydGllczogJGRlZmluZVByb3BlcnRpZXMsXG4gICAgZGVmaW5lUHJvcGVydHk6ICRkZWZpbmVQcm9wZXJ0eSxcbiAgICBleHBvcnRTdGFyOiBleHBvcnRTdGFyLFxuICAgIGdldE93bkhhc2hPYmplY3Q6IGdldE93bkhhc2hPYmplY3QsXG4gICAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOiAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxuICAgIGdldE93blByb3BlcnR5TmFtZXM6ICRnZXRPd25Qcm9wZXJ0eU5hbWVzLFxuICAgIGlzT2JqZWN0OiBpc09iamVjdCxcbiAgICBpc1ByaXZhdGVOYW1lOiBpc1ByaXZhdGVOYW1lLFxuICAgIGlzU3ltYm9sU3RyaW5nOiBpc1N5bWJvbFN0cmluZyxcbiAgICBrZXlzOiAka2V5cyxcbiAgICBzZXR1cEdsb2JhbHM6IHNldHVwR2xvYmFscyxcbiAgICB0b09iamVjdDogdG9PYmplY3QsXG4gICAgdG9Qcm9wZXJ0eTogdG9Qcm9wZXJ0eSxcbiAgICB0eXBlb2Y6IHR5cGVPZlxuICB9O1xufSkodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgcGF0aDtcbiAgZnVuY3Rpb24gcmVsYXRpdmVSZXF1aXJlKGNhbGxlclBhdGgsIHJlcXVpcmVkUGF0aCkge1xuICAgIHBhdGggPSBwYXRoIHx8IHR5cGVvZiByZXF1aXJlICE9PSAndW5kZWZpbmVkJyAmJiByZXF1aXJlKCdwYXRoJyk7XG4gICAgZnVuY3Rpb24gaXNEaXJlY3RvcnkocGF0aCkge1xuICAgICAgcmV0dXJuIHBhdGguc2xpY2UoLTEpID09PSAnLyc7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzQWJzb2x1dGUocGF0aCkge1xuICAgICAgcmV0dXJuIHBhdGhbMF0gPT09ICcvJztcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNSZWxhdGl2ZShwYXRoKSB7XG4gICAgICByZXR1cm4gcGF0aFswXSA9PT0gJy4nO1xuICAgIH1cbiAgICBpZiAoaXNEaXJlY3RvcnkocmVxdWlyZWRQYXRoKSB8fCBpc0Fic29sdXRlKHJlcXVpcmVkUGF0aCkpXG4gICAgICByZXR1cm47XG4gICAgcmV0dXJuIGlzUmVsYXRpdmUocmVxdWlyZWRQYXRoKSA/IHJlcXVpcmUocGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShjYWxsZXJQYXRoKSwgcmVxdWlyZWRQYXRoKSkgOiByZXF1aXJlKHJlcXVpcmVkUGF0aCk7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLnJlcXVpcmUgPSByZWxhdGl2ZVJlcXVpcmU7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGZ1bmN0aW9uIHNwcmVhZCgpIHtcbiAgICB2YXIgcnYgPSBbXSxcbiAgICAgICAgaiA9IDAsXG4gICAgICAgIGl0ZXJSZXN1bHQ7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZVRvU3ByZWFkID0gJHRyYWNldXJSdW50aW1lLmNoZWNrT2JqZWN0Q29lcmNpYmxlKGFyZ3VtZW50c1tpXSk7XG4gICAgICBpZiAodHlwZW9mIHZhbHVlVG9TcHJlYWRbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoU3ltYm9sLml0ZXJhdG9yKV0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IHNwcmVhZCBub24taXRlcmFibGUgb2JqZWN0LicpO1xuICAgICAgfVxuICAgICAgdmFyIGl0ZXIgPSB2YWx1ZVRvU3ByZWFkWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KFN5bWJvbC5pdGVyYXRvcildKCk7XG4gICAgICB3aGlsZSAoIShpdGVyUmVzdWx0ID0gaXRlci5uZXh0KCkpLmRvbmUpIHtcbiAgICAgICAgcnZbaisrXSA9IGl0ZXJSZXN1bHQudmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydjtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUuc3ByZWFkID0gc3ByZWFkO1xufSkoKTtcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgJE9iamVjdCA9IE9iamVjdDtcbiAgdmFyICRUeXBlRXJyb3IgPSBUeXBlRXJyb3I7XG4gIHZhciAkY3JlYXRlID0gJE9iamVjdC5jcmVhdGU7XG4gIHZhciAkZGVmaW5lUHJvcGVydGllcyA9ICR0cmFjZXVyUnVudGltZS5kZWZpbmVQcm9wZXJ0aWVzO1xuICB2YXIgJGRlZmluZVByb3BlcnR5ID0gJHRyYWNldXJSdW50aW1lLmRlZmluZVByb3BlcnR5O1xuICB2YXIgJGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I7XG4gIHZhciAkZ2V0T3duUHJvcGVydHlOYW1lcyA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25Qcm9wZXJ0eU5hbWVzO1xuICB2YXIgJGdldFByb3RvdHlwZU9mID0gT2JqZWN0LmdldFByb3RvdHlwZU9mO1xuICB2YXIgJF9fMCA9IE9iamVjdCxcbiAgICAgIGdldE93blByb3BlcnR5TmFtZXMgPSAkX18wLmdldE93blByb3BlcnR5TmFtZXMsXG4gICAgICBnZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSAkX18wLmdldE93blByb3BlcnR5U3ltYm9scztcbiAgZnVuY3Rpb24gc3VwZXJEZXNjcmlwdG9yKGhvbWVPYmplY3QsIG5hbWUpIHtcbiAgICB2YXIgcHJvdG8gPSAkZ2V0UHJvdG90eXBlT2YoaG9tZU9iamVjdCk7XG4gICAgZG8ge1xuICAgICAgdmFyIHJlc3VsdCA9ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocHJvdG8sIG5hbWUpO1xuICAgICAgaWYgKHJlc3VsdClcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICAgIHByb3RvID0gJGdldFByb3RvdHlwZU9mKHByb3RvKTtcbiAgICB9IHdoaWxlIChwcm90byk7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBzdXBlckNvbnN0cnVjdG9yKGN0b3IpIHtcbiAgICByZXR1cm4gY3Rvci5fX3Byb3RvX187XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsIG5hbWUsIGFyZ3MpIHtcbiAgICByZXR1cm4gc3VwZXJHZXQoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSkuYXBwbHkoc2VsZiwgYXJncyk7XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJHZXQoc2VsZiwgaG9tZU9iamVjdCwgbmFtZSkge1xuICAgIHZhciBkZXNjcmlwdG9yID0gc3VwZXJEZXNjcmlwdG9yKGhvbWVPYmplY3QsIG5hbWUpO1xuICAgIGlmIChkZXNjcmlwdG9yKSB7XG4gICAgICBpZiAoIWRlc2NyaXB0b3IuZ2V0KVxuICAgICAgICByZXR1cm4gZGVzY3JpcHRvci52YWx1ZTtcbiAgICAgIHJldHVybiBkZXNjcmlwdG9yLmdldC5jYWxsKHNlbGYpO1xuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyU2V0KHNlbGYsIGhvbWVPYmplY3QsIG5hbWUsIHZhbHVlKSB7XG4gICAgdmFyIGRlc2NyaXB0b3IgPSBzdXBlckRlc2NyaXB0b3IoaG9tZU9iamVjdCwgbmFtZSk7XG4gICAgaWYgKGRlc2NyaXB0b3IgJiYgZGVzY3JpcHRvci5zZXQpIHtcbiAgICAgIGRlc2NyaXB0b3Iuc2V0LmNhbGwoc2VsZiwgdmFsdWUpO1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICB0aHJvdyAkVHlwZUVycm9yKChcInN1cGVyIGhhcyBubyBzZXR0ZXIgJ1wiICsgbmFtZSArIFwiJy5cIikpO1xuICB9XG4gIGZ1bmN0aW9uIGdldERlc2NyaXB0b3JzKG9iamVjdCkge1xuICAgIHZhciBkZXNjcmlwdG9ycyA9IHt9O1xuICAgIHZhciBuYW1lcyA9IGdldE93blByb3BlcnR5TmFtZXMob2JqZWN0KTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgZGVzY3JpcHRvcnNbbmFtZV0gPSAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG9iamVjdCwgbmFtZSk7XG4gICAgfVxuICAgIHZhciBzeW1ib2xzID0gZ2V0T3duUHJvcGVydHlTeW1ib2xzKG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzeW1ib2xzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgc3ltYm9sID0gc3ltYm9sc1tpXTtcbiAgICAgIGRlc2NyaXB0b3JzWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KHN5bWJvbCldID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsICR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KHN5bWJvbCkpO1xuICAgIH1cbiAgICByZXR1cm4gZGVzY3JpcHRvcnM7XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlQ2xhc3MoY3Rvciwgb2JqZWN0LCBzdGF0aWNPYmplY3QsIHN1cGVyQ2xhc3MpIHtcbiAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCAnY29uc3RydWN0b3InLCB7XG4gICAgICB2YWx1ZTogY3RvcixcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDMpIHtcbiAgICAgIGlmICh0eXBlb2Ygc3VwZXJDbGFzcyA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgY3Rvci5fX3Byb3RvX18gPSBzdXBlckNsYXNzO1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSAkY3JlYXRlKGdldFByb3RvUGFyZW50KHN1cGVyQ2xhc3MpLCBnZXREZXNjcmlwdG9ycyhvYmplY3QpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3Rvci5wcm90b3R5cGUgPSBvYmplY3Q7XG4gICAgfVxuICAgICRkZWZpbmVQcm9wZXJ0eShjdG9yLCAncHJvdG90eXBlJywge1xuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZVxuICAgIH0pO1xuICAgIHJldHVybiAkZGVmaW5lUHJvcGVydGllcyhjdG9yLCBnZXREZXNjcmlwdG9ycyhzdGF0aWNPYmplY3QpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXRQcm90b1BhcmVudChzdXBlckNsYXNzKSB7XG4gICAgaWYgKHR5cGVvZiBzdXBlckNsYXNzID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICB2YXIgcHJvdG90eXBlID0gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4gICAgICBpZiAoJE9iamVjdChwcm90b3R5cGUpID09PSBwcm90b3R5cGUgfHwgcHJvdG90eXBlID09PSBudWxsKVxuICAgICAgICByZXR1cm4gc3VwZXJDbGFzcy5wcm90b3R5cGU7XG4gICAgICB0aHJvdyBuZXcgJFR5cGVFcnJvcignc3VwZXIgcHJvdG90eXBlIG11c3QgYmUgYW4gT2JqZWN0IG9yIG51bGwnKTtcbiAgICB9XG4gICAgaWYgKHN1cGVyQ2xhc3MgPT09IG51bGwpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB0aHJvdyBuZXcgJFR5cGVFcnJvcigoXCJTdXBlciBleHByZXNzaW9uIG11c3QgZWl0aGVyIGJlIG51bGwgb3IgYSBmdW5jdGlvbiwgbm90IFwiICsgdHlwZW9mIHN1cGVyQ2xhc3MgKyBcIi5cIikpO1xuICB9XG4gIGZ1bmN0aW9uIGRlZmF1bHRTdXBlckNhbGwoc2VsZiwgaG9tZU9iamVjdCwgYXJncykge1xuICAgIGlmICgkZ2V0UHJvdG90eXBlT2YoaG9tZU9iamVjdCkgIT09IG51bGwpXG4gICAgICBzdXBlckNhbGwoc2VsZiwgaG9tZU9iamVjdCwgJ2NvbnN0cnVjdG9yJywgYXJncyk7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzID0gY3JlYXRlQ2xhc3M7XG4gICR0cmFjZXVyUnVudGltZS5kZWZhdWx0U3VwZXJDYWxsID0gZGVmYXVsdFN1cGVyQ2FsbDtcbiAgJHRyYWNldXJSdW50aW1lLnN1cGVyQ2FsbCA9IHN1cGVyQ2FsbDtcbiAgJHRyYWNldXJSdW50aW1lLnN1cGVyQ29uc3RydWN0b3IgPSBzdXBlckNvbnN0cnVjdG9yO1xuICAkdHJhY2V1clJ1bnRpbWUuc3VwZXJHZXQgPSBzdXBlckdldDtcbiAgJHRyYWNldXJSdW50aW1lLnN1cGVyU2V0ID0gc3VwZXJTZXQ7XG59KSgpO1xuKGZ1bmN0aW9uKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGlmICh0eXBlb2YgJHRyYWNldXJSdW50aW1lICE9PSAnb2JqZWN0Jykge1xuICAgIHRocm93IG5ldyBFcnJvcigndHJhY2V1ciBydW50aW1lIG5vdCBmb3VuZC4nKTtcbiAgfVxuICB2YXIgY3JlYXRlUHJpdmF0ZU5hbWUgPSAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlUHJpdmF0ZU5hbWU7XG4gIHZhciAkZGVmaW5lUHJvcGVydGllcyA9ICR0cmFjZXVyUnVudGltZS5kZWZpbmVQcm9wZXJ0aWVzO1xuICB2YXIgJGRlZmluZVByb3BlcnR5ID0gJHRyYWNldXJSdW50aW1lLmRlZmluZVByb3BlcnR5O1xuICB2YXIgJGNyZWF0ZSA9IE9iamVjdC5jcmVhdGU7XG4gIHZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuICBmdW5jdGlvbiBub25FbnVtKHZhbHVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9O1xuICB9XG4gIHZhciBTVF9ORVdCT1JOID0gMDtcbiAgdmFyIFNUX0VYRUNVVElORyA9IDE7XG4gIHZhciBTVF9TVVNQRU5ERUQgPSAyO1xuICB2YXIgU1RfQ0xPU0VEID0gMztcbiAgdmFyIEVORF9TVEFURSA9IC0yO1xuICB2YXIgUkVUSFJPV19TVEFURSA9IC0zO1xuICBmdW5jdGlvbiBnZXRJbnRlcm5hbEVycm9yKHN0YXRlKSB7XG4gICAgcmV0dXJuIG5ldyBFcnJvcignVHJhY2V1ciBjb21waWxlciBidWc6IGludmFsaWQgc3RhdGUgaW4gc3RhdGUgbWFjaGluZTogJyArIHN0YXRlKTtcbiAgfVxuICBmdW5jdGlvbiBHZW5lcmF0b3JDb250ZXh0KCkge1xuICAgIHRoaXMuc3RhdGUgPSAwO1xuICAgIHRoaXMuR1N0YXRlID0gU1RfTkVXQk9STjtcbiAgICB0aGlzLnN0b3JlZEV4Y2VwdGlvbiA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLmZpbmFsbHlGYWxsVGhyb3VnaCA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnNlbnRfID0gdW5kZWZpbmVkO1xuICAgIHRoaXMucmV0dXJuVmFsdWUgPSB1bmRlZmluZWQ7XG4gICAgdGhpcy50cnlTdGFja18gPSBbXTtcbiAgfVxuICBHZW5lcmF0b3JDb250ZXh0LnByb3RvdHlwZSA9IHtcbiAgICBwdXNoVHJ5OiBmdW5jdGlvbihjYXRjaFN0YXRlLCBmaW5hbGx5U3RhdGUpIHtcbiAgICAgIGlmIChmaW5hbGx5U3RhdGUgIT09IG51bGwpIHtcbiAgICAgICAgdmFyIGZpbmFsbHlGYWxsVGhyb3VnaCA9IG51bGw7XG4gICAgICAgIGZvciAodmFyIGkgPSB0aGlzLnRyeVN0YWNrXy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIGlmICh0aGlzLnRyeVN0YWNrX1tpXS5jYXRjaCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBmaW5hbGx5RmFsbFRocm91Z2ggPSB0aGlzLnRyeVN0YWNrX1tpXS5jYXRjaDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZmluYWxseUZhbGxUaHJvdWdoID09PSBudWxsKVxuICAgICAgICAgIGZpbmFsbHlGYWxsVGhyb3VnaCA9IFJFVEhST1dfU1RBVEU7XG4gICAgICAgIHRoaXMudHJ5U3RhY2tfLnB1c2goe1xuICAgICAgICAgIGZpbmFsbHk6IGZpbmFsbHlTdGF0ZSxcbiAgICAgICAgICBmaW5hbGx5RmFsbFRocm91Z2g6IGZpbmFsbHlGYWxsVGhyb3VnaFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGlmIChjYXRjaFN0YXRlICE9PSBudWxsKSB7XG4gICAgICAgIHRoaXMudHJ5U3RhY2tfLnB1c2goe2NhdGNoOiBjYXRjaFN0YXRlfSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBwb3BUcnk6IGZ1bmN0aW9uKCkge1xuICAgICAgdGhpcy50cnlTdGFja18ucG9wKCk7XG4gICAgfSxcbiAgICBnZXQgc2VudCgpIHtcbiAgICAgIHRoaXMubWF5YmVUaHJvdygpO1xuICAgICAgcmV0dXJuIHRoaXMuc2VudF87XG4gICAgfSxcbiAgICBzZXQgc2VudCh2KSB7XG4gICAgICB0aGlzLnNlbnRfID0gdjtcbiAgICB9LFxuICAgIGdldCBzZW50SWdub3JlVGhyb3coKSB7XG4gICAgICByZXR1cm4gdGhpcy5zZW50XztcbiAgICB9LFxuICAgIG1heWJlVGhyb3c6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuYWN0aW9uID09PSAndGhyb3cnKSB7XG4gICAgICAgIHRoaXMuYWN0aW9uID0gJ25leHQnO1xuICAgICAgICB0aHJvdyB0aGlzLnNlbnRfO1xuICAgICAgfVxuICAgIH0sXG4gICAgZW5kOiBmdW5jdGlvbigpIHtcbiAgICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgICBjYXNlIEVORF9TVEFURTpcbiAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgY2FzZSBSRVRIUk9XX1NUQVRFOlxuICAgICAgICAgIHRocm93IHRoaXMuc3RvcmVkRXhjZXB0aW9uO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIHRocm93IGdldEludGVybmFsRXJyb3IodGhpcy5zdGF0ZSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBoYW5kbGVFeGNlcHRpb246IGZ1bmN0aW9uKGV4KSB7XG4gICAgICB0aGlzLkdTdGF0ZSA9IFNUX0NMT1NFRDtcbiAgICAgIHRoaXMuc3RhdGUgPSBFTkRfU1RBVEU7XG4gICAgICB0aHJvdyBleDtcbiAgICB9XG4gIH07XG4gIGZ1bmN0aW9uIG5leHRPclRocm93KGN0eCwgbW92ZU5leHQsIGFjdGlvbiwgeCkge1xuICAgIHN3aXRjaCAoY3R4LkdTdGF0ZSkge1xuICAgICAgY2FzZSBTVF9FWEVDVVRJTkc6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcigoXCJcXFwiXCIgKyBhY3Rpb24gKyBcIlxcXCIgb24gZXhlY3V0aW5nIGdlbmVyYXRvclwiKSk7XG4gICAgICBjYXNlIFNUX0NMT1NFRDpcbiAgICAgICAgaWYgKGFjdGlvbiA9PSAnbmV4dCcpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgdmFsdWU6IHVuZGVmaW5lZCxcbiAgICAgICAgICAgIGRvbmU6IHRydWVcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICAgIHRocm93IHg7XG4gICAgICBjYXNlIFNUX05FV0JPUk46XG4gICAgICAgIGlmIChhY3Rpb24gPT09ICd0aHJvdycpIHtcbiAgICAgICAgICBjdHguR1N0YXRlID0gU1RfQ0xPU0VEO1xuICAgICAgICAgIHRocm93IHg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHggIT09IHVuZGVmaW5lZClcbiAgICAgICAgICB0aHJvdyAkVHlwZUVycm9yKCdTZW50IHZhbHVlIHRvIG5ld2Jvcm4gZ2VuZXJhdG9yJyk7XG4gICAgICBjYXNlIFNUX1NVU1BFTkRFRDpcbiAgICAgICAgY3R4LkdTdGF0ZSA9IFNUX0VYRUNVVElORztcbiAgICAgICAgY3R4LmFjdGlvbiA9IGFjdGlvbjtcbiAgICAgICAgY3R4LnNlbnQgPSB4O1xuICAgICAgICB2YXIgdmFsdWUgPSBtb3ZlTmV4dChjdHgpO1xuICAgICAgICB2YXIgZG9uZSA9IHZhbHVlID09PSBjdHg7XG4gICAgICAgIGlmIChkb25lKVxuICAgICAgICAgIHZhbHVlID0gY3R4LnJldHVyblZhbHVlO1xuICAgICAgICBjdHguR1N0YXRlID0gZG9uZSA/IFNUX0NMT1NFRCA6IFNUX1NVU1BFTkRFRDtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgZG9uZTogZG9uZVxuICAgICAgICB9O1xuICAgIH1cbiAgfVxuICB2YXIgY3R4TmFtZSA9IGNyZWF0ZVByaXZhdGVOYW1lKCk7XG4gIHZhciBtb3ZlTmV4dE5hbWUgPSBjcmVhdGVQcml2YXRlTmFtZSgpO1xuICBmdW5jdGlvbiBHZW5lcmF0b3JGdW5jdGlvbigpIHt9XG4gIGZ1bmN0aW9uIEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlKCkge31cbiAgR2VuZXJhdG9yRnVuY3Rpb24ucHJvdG90eXBlID0gR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGU7XG4gICRkZWZpbmVQcm9wZXJ0eShHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgbm9uRW51bShHZW5lcmF0b3JGdW5jdGlvbikpO1xuICBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUgPSB7XG4gICAgY29uc3RydWN0b3I6IEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLFxuICAgIG5leHQ6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiBuZXh0T3JUaHJvdyh0aGlzW2N0eE5hbWVdLCB0aGlzW21vdmVOZXh0TmFtZV0sICduZXh0Jywgdik7XG4gICAgfSxcbiAgICB0aHJvdzogZnVuY3Rpb24odikge1xuICAgICAgcmV0dXJuIG5leHRPclRocm93KHRoaXNbY3R4TmFtZV0sIHRoaXNbbW92ZU5leHROYW1lXSwgJ3Rocm93Jywgdik7XG4gICAgfVxuICB9O1xuICAkZGVmaW5lUHJvcGVydGllcyhHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUsIHtcbiAgICBjb25zdHJ1Y3Rvcjoge2VudW1lcmFibGU6IGZhbHNlfSxcbiAgICBuZXh0OiB7ZW51bWVyYWJsZTogZmFsc2V9LFxuICAgIHRocm93OiB7ZW51bWVyYWJsZTogZmFsc2V9XG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUucHJvdG90eXBlLCBTeW1ib2wuaXRlcmF0b3IsIG5vbkVudW0oZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH0pKTtcbiAgZnVuY3Rpb24gY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UoaW5uZXJGdW5jdGlvbiwgZnVuY3Rpb25PYmplY3QsIHNlbGYpIHtcbiAgICB2YXIgbW92ZU5leHQgPSBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKTtcbiAgICB2YXIgY3R4ID0gbmV3IEdlbmVyYXRvckNvbnRleHQoKTtcbiAgICB2YXIgb2JqZWN0ID0gJGNyZWF0ZShmdW5jdGlvbk9iamVjdC5wcm90b3R5cGUpO1xuICAgIG9iamVjdFtjdHhOYW1lXSA9IGN0eDtcbiAgICBvYmplY3RbbW92ZU5leHROYW1lXSA9IG1vdmVOZXh0O1xuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cbiAgZnVuY3Rpb24gaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uT2JqZWN0KSB7XG4gICAgZnVuY3Rpb25PYmplY3QucHJvdG90eXBlID0gJGNyZWF0ZShHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZS5wcm90b3R5cGUpO1xuICAgIGZ1bmN0aW9uT2JqZWN0Ll9fcHJvdG9fXyA9IEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlO1xuICAgIHJldHVybiBmdW5jdGlvbk9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBBc3luY0Z1bmN0aW9uQ29udGV4dCgpIHtcbiAgICBHZW5lcmF0b3JDb250ZXh0LmNhbGwodGhpcyk7XG4gICAgdGhpcy5lcnIgPSB1bmRlZmluZWQ7XG4gICAgdmFyIGN0eCA9IHRoaXM7XG4gICAgY3R4LnJlc3VsdCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgY3R4LnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgY3R4LnJlamVjdCA9IHJlamVjdDtcbiAgICB9KTtcbiAgfVxuICBBc3luY0Z1bmN0aW9uQ29udGV4dC5wcm90b3R5cGUgPSAkY3JlYXRlKEdlbmVyYXRvckNvbnRleHQucHJvdG90eXBlKTtcbiAgQXN5bmNGdW5jdGlvbkNvbnRleHQucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uKCkge1xuICAgIHN3aXRjaCAodGhpcy5zdGF0ZSkge1xuICAgICAgY2FzZSBFTkRfU1RBVEU6XG4gICAgICAgIHRoaXMucmVzb2x2ZSh0aGlzLnJldHVyblZhbHVlKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFJFVEhST1dfU1RBVEU6XG4gICAgICAgIHRoaXMucmVqZWN0KHRoaXMuc3RvcmVkRXhjZXB0aW9uKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aGlzLnJlamVjdChnZXRJbnRlcm5hbEVycm9yKHRoaXMuc3RhdGUpKTtcbiAgICB9XG4gIH07XG4gIEFzeW5jRnVuY3Rpb25Db250ZXh0LnByb3RvdHlwZS5oYW5kbGVFeGNlcHRpb24gPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnN0YXRlID0gUkVUSFJPV19TVEFURTtcbiAgfTtcbiAgZnVuY3Rpb24gYXN5bmNXcmFwKGlubmVyRnVuY3Rpb24sIHNlbGYpIHtcbiAgICB2YXIgbW92ZU5leHQgPSBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKTtcbiAgICB2YXIgY3R4ID0gbmV3IEFzeW5jRnVuY3Rpb25Db250ZXh0KCk7XG4gICAgY3R4LmNyZWF0ZUNhbGxiYWNrID0gZnVuY3Rpb24obmV3U3RhdGUpIHtcbiAgICAgIHJldHVybiBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICBjdHguc3RhdGUgPSBuZXdTdGF0ZTtcbiAgICAgICAgY3R4LnZhbHVlID0gdmFsdWU7XG4gICAgICAgIG1vdmVOZXh0KGN0eCk7XG4gICAgICB9O1xuICAgIH07XG4gICAgY3R4LmVycmJhY2sgPSBmdW5jdGlvbihlcnIpIHtcbiAgICAgIGhhbmRsZUNhdGNoKGN0eCwgZXJyKTtcbiAgICAgIG1vdmVOZXh0KGN0eCk7XG4gICAgfTtcbiAgICBtb3ZlTmV4dChjdHgpO1xuICAgIHJldHVybiBjdHgucmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIGdldE1vdmVOZXh0KGlubmVyRnVuY3Rpb24sIHNlbGYpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oY3R4KSB7XG4gICAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBpbm5lckZ1bmN0aW9uLmNhbGwoc2VsZiwgY3R4KTtcbiAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICBoYW5kbGVDYXRjaChjdHgsIGV4KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gaGFuZGxlQ2F0Y2goY3R4LCBleCkge1xuICAgIGN0eC5zdG9yZWRFeGNlcHRpb24gPSBleDtcbiAgICB2YXIgbGFzdCA9IGN0eC50cnlTdGFja19bY3R4LnRyeVN0YWNrXy5sZW5ndGggLSAxXTtcbiAgICBpZiAoIWxhc3QpIHtcbiAgICAgIGN0eC5oYW5kbGVFeGNlcHRpb24oZXgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjdHguc3RhdGUgPSBsYXN0LmNhdGNoICE9PSB1bmRlZmluZWQgPyBsYXN0LmNhdGNoIDogbGFzdC5maW5hbGx5O1xuICAgIGlmIChsYXN0LmZpbmFsbHlGYWxsVGhyb3VnaCAhPT0gdW5kZWZpbmVkKVxuICAgICAgY3R4LmZpbmFsbHlGYWxsVGhyb3VnaCA9IGxhc3QuZmluYWxseUZhbGxUaHJvdWdoO1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5hc3luY1dyYXAgPSBhc3luY1dyYXA7XG4gICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24gPSBpbml0R2VuZXJhdG9yRnVuY3Rpb247XG4gICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZSA9IGNyZWF0ZUdlbmVyYXRvckluc3RhbmNlO1xufSkoKTtcbihmdW5jdGlvbigpIHtcbiAgZnVuY3Rpb24gYnVpbGRGcm9tRW5jb2RlZFBhcnRzKG9wdF9zY2hlbWUsIG9wdF91c2VySW5mbywgb3B0X2RvbWFpbiwgb3B0X3BvcnQsIG9wdF9wYXRoLCBvcHRfcXVlcnlEYXRhLCBvcHRfZnJhZ21lbnQpIHtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgaWYgKG9wdF9zY2hlbWUpIHtcbiAgICAgIG91dC5wdXNoKG9wdF9zY2hlbWUsICc6Jyk7XG4gICAgfVxuICAgIGlmIChvcHRfZG9tYWluKSB7XG4gICAgICBvdXQucHVzaCgnLy8nKTtcbiAgICAgIGlmIChvcHRfdXNlckluZm8pIHtcbiAgICAgICAgb3V0LnB1c2gob3B0X3VzZXJJbmZvLCAnQCcpO1xuICAgICAgfVxuICAgICAgb3V0LnB1c2gob3B0X2RvbWFpbik7XG4gICAgICBpZiAob3B0X3BvcnQpIHtcbiAgICAgICAgb3V0LnB1c2goJzonLCBvcHRfcG9ydCk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChvcHRfcGF0aCkge1xuICAgICAgb3V0LnB1c2gob3B0X3BhdGgpO1xuICAgIH1cbiAgICBpZiAob3B0X3F1ZXJ5RGF0YSkge1xuICAgICAgb3V0LnB1c2goJz8nLCBvcHRfcXVlcnlEYXRhKTtcbiAgICB9XG4gICAgaWYgKG9wdF9mcmFnbWVudCkge1xuICAgICAgb3V0LnB1c2goJyMnLCBvcHRfZnJhZ21lbnQpO1xuICAgIH1cbiAgICByZXR1cm4gb3V0LmpvaW4oJycpO1xuICB9XG4gIDtcbiAgdmFyIHNwbGl0UmUgPSBuZXcgUmVnRXhwKCdeJyArICcoPzonICsgJyhbXjovPyMuXSspJyArICc6KT8nICsgJyg/Oi8vJyArICcoPzooW14vPyNdKilAKT8nICsgJyhbXFxcXHdcXFxcZFxcXFwtXFxcXHUwMTAwLVxcXFx1ZmZmZi4lXSopJyArICcoPzo6KFswLTldKykpPycgKyAnKT8nICsgJyhbXj8jXSspPycgKyAnKD86XFxcXD8oW14jXSopKT8nICsgJyg/OiMoLiopKT8nICsgJyQnKTtcbiAgdmFyIENvbXBvbmVudEluZGV4ID0ge1xuICAgIFNDSEVNRTogMSxcbiAgICBVU0VSX0lORk86IDIsXG4gICAgRE9NQUlOOiAzLFxuICAgIFBPUlQ6IDQsXG4gICAgUEFUSDogNSxcbiAgICBRVUVSWV9EQVRBOiA2LFxuICAgIEZSQUdNRU5UOiA3XG4gIH07XG4gIGZ1bmN0aW9uIHNwbGl0KHVyaSkge1xuICAgIHJldHVybiAodXJpLm1hdGNoKHNwbGl0UmUpKTtcbiAgfVxuICBmdW5jdGlvbiByZW1vdmVEb3RTZWdtZW50cyhwYXRoKSB7XG4gICAgaWYgKHBhdGggPT09ICcvJylcbiAgICAgIHJldHVybiAnLyc7XG4gICAgdmFyIGxlYWRpbmdTbGFzaCA9IHBhdGhbMF0gPT09ICcvJyA/ICcvJyA6ICcnO1xuICAgIHZhciB0cmFpbGluZ1NsYXNoID0gcGF0aC5zbGljZSgtMSkgPT09ICcvJyA/ICcvJyA6ICcnO1xuICAgIHZhciBzZWdtZW50cyA9IHBhdGguc3BsaXQoJy8nKTtcbiAgICB2YXIgb3V0ID0gW107XG4gICAgdmFyIHVwID0gMDtcbiAgICBmb3IgKHZhciBwb3MgPSAwOyBwb3MgPCBzZWdtZW50cy5sZW5ndGg7IHBvcysrKSB7XG4gICAgICB2YXIgc2VnbWVudCA9IHNlZ21lbnRzW3Bvc107XG4gICAgICBzd2l0Y2ggKHNlZ21lbnQpIHtcbiAgICAgICAgY2FzZSAnJzpcbiAgICAgICAgY2FzZSAnLic6XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJy4uJzpcbiAgICAgICAgICBpZiAob3V0Lmxlbmd0aClcbiAgICAgICAgICAgIG91dC5wb3AoKTtcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICB1cCsrO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgIG91dC5wdXNoKHNlZ21lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoIWxlYWRpbmdTbGFzaCkge1xuICAgICAgd2hpbGUgKHVwLS0gPiAwKSB7XG4gICAgICAgIG91dC51bnNoaWZ0KCcuLicpO1xuICAgICAgfVxuICAgICAgaWYgKG91dC5sZW5ndGggPT09IDApXG4gICAgICAgIG91dC5wdXNoKCcuJyk7XG4gICAgfVxuICAgIHJldHVybiBsZWFkaW5nU2xhc2ggKyBvdXQuam9pbignLycpICsgdHJhaWxpbmdTbGFzaDtcbiAgfVxuICBmdW5jdGlvbiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cykge1xuICAgIHZhciBwYXRoID0gcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0gfHwgJyc7XG4gICAgcGF0aCA9IHJlbW92ZURvdFNlZ21lbnRzKHBhdGgpO1xuICAgIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdID0gcGF0aDtcbiAgICByZXR1cm4gYnVpbGRGcm9tRW5jb2RlZFBhcnRzKHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlVTRVJfSU5GT10sIHBhcnRzW0NvbXBvbmVudEluZGV4LkRPTUFJTl0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlBPUlRdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSwgcGFydHNbQ29tcG9uZW50SW5kZXguUVVFUllfREFUQV0sIHBhcnRzW0NvbXBvbmVudEluZGV4LkZSQUdNRU5UXSk7XG4gIH1cbiAgZnVuY3Rpb24gY2Fub25pY2FsaXplVXJsKHVybCkge1xuICAgIHZhciBwYXJ0cyA9IHNwbGl0KHVybCk7XG4gICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgfVxuICBmdW5jdGlvbiByZXNvbHZlVXJsKGJhc2UsIHVybCkge1xuICAgIHZhciBwYXJ0cyA9IHNwbGl0KHVybCk7XG4gICAgdmFyIGJhc2VQYXJ0cyA9IHNwbGl0KGJhc2UpO1xuICAgIGlmIChwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdKSB7XG4gICAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdID0gYmFzZVBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV07XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSBDb21wb25lbnRJbmRleC5TQ0hFTUU7IGkgPD0gQ29tcG9uZW50SW5kZXguUE9SVDsgaSsrKSB7XG4gICAgICBpZiAoIXBhcnRzW2ldKSB7XG4gICAgICAgIHBhcnRzW2ldID0gYmFzZVBhcnRzW2ldO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF1bMF0gPT0gJy8nKSB7XG4gICAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICAgIH1cbiAgICB2YXIgcGF0aCA9IGJhc2VQYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXTtcbiAgICB2YXIgaW5kZXggPSBwYXRoLmxhc3RJbmRleE9mKCcvJyk7XG4gICAgcGF0aCA9IHBhdGguc2xpY2UoMCwgaW5kZXggKyAxKSArIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdO1xuICAgIHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdID0gcGF0aDtcbiAgICByZXR1cm4gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpO1xuICB9XG4gIGZ1bmN0aW9uIGlzQWJzb2x1dGUobmFtZSkge1xuICAgIGlmICghbmFtZSlcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBpZiAobmFtZVswXSA9PT0gJy8nKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgdmFyIHBhcnRzID0gc3BsaXQobmFtZSk7XG4gICAgaWYgKHBhcnRzW0NvbXBvbmVudEluZGV4LlNDSEVNRV0pXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLmNhbm9uaWNhbGl6ZVVybCA9IGNhbm9uaWNhbGl6ZVVybDtcbiAgJHRyYWNldXJSdW50aW1lLmlzQWJzb2x1dGUgPSBpc0Fic29sdXRlO1xuICAkdHJhY2V1clJ1bnRpbWUucmVtb3ZlRG90U2VnbWVudHMgPSByZW1vdmVEb3RTZWdtZW50cztcbiAgJHRyYWNldXJSdW50aW1lLnJlc29sdmVVcmwgPSByZXNvbHZlVXJsO1xufSkoKTtcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgdHlwZXMgPSB7XG4gICAgYW55OiB7bmFtZTogJ2FueSd9LFxuICAgIGJvb2xlYW46IHtuYW1lOiAnYm9vbGVhbid9LFxuICAgIG51bWJlcjoge25hbWU6ICdudW1iZXInfSxcbiAgICBzdHJpbmc6IHtuYW1lOiAnc3RyaW5nJ30sXG4gICAgc3ltYm9sOiB7bmFtZTogJ3N5bWJvbCd9LFxuICAgIHZvaWQ6IHtuYW1lOiAndm9pZCd9XG4gIH07XG4gIHZhciBHZW5lcmljVHlwZSA9IGZ1bmN0aW9uIEdlbmVyaWNUeXBlKHR5cGUsIGFyZ3VtZW50VHlwZXMpIHtcbiAgICB0aGlzLnR5cGUgPSB0eXBlO1xuICAgIHRoaXMuYXJndW1lbnRUeXBlcyA9IGFyZ3VtZW50VHlwZXM7XG4gIH07XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKEdlbmVyaWNUeXBlLCB7fSwge30pO1xuICB2YXIgdHlwZVJlZ2lzdGVyID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgZnVuY3Rpb24gZ2VuZXJpY1R5cGUodHlwZSkge1xuICAgIGZvciAodmFyIGFyZ3VtZW50VHlwZXMgPSBbXSxcbiAgICAgICAgJF9fMSA9IDE7ICRfXzEgPCBhcmd1bWVudHMubGVuZ3RoOyAkX18xKyspXG4gICAgICBhcmd1bWVudFR5cGVzWyRfXzEgLSAxXSA9IGFyZ3VtZW50c1skX18xXTtcbiAgICB2YXIgdHlwZU1hcCA9IHR5cGVSZWdpc3RlcjtcbiAgICB2YXIga2V5ID0gJHRyYWNldXJSdW50aW1lLmdldE93bkhhc2hPYmplY3QodHlwZSkuaGFzaDtcbiAgICBpZiAoIXR5cGVNYXBba2V5XSkge1xuICAgICAgdHlwZU1hcFtrZXldID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB9XG4gICAgdHlwZU1hcCA9IHR5cGVNYXBba2V5XTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50VHlwZXMubGVuZ3RoIC0gMTsgaSsrKSB7XG4gICAgICBrZXkgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duSGFzaE9iamVjdChhcmd1bWVudFR5cGVzW2ldKS5oYXNoO1xuICAgICAgaWYgKCF0eXBlTWFwW2tleV0pIHtcbiAgICAgICAgdHlwZU1hcFtrZXldID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICAgIH1cbiAgICAgIHR5cGVNYXAgPSB0eXBlTWFwW2tleV07XG4gICAgfVxuICAgIHZhciB0YWlsID0gYXJndW1lbnRUeXBlc1thcmd1bWVudFR5cGVzLmxlbmd0aCAtIDFdO1xuICAgIGtleSA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25IYXNoT2JqZWN0KHRhaWwpLmhhc2g7XG4gICAgaWYgKCF0eXBlTWFwW2tleV0pIHtcbiAgICAgIHR5cGVNYXBba2V5XSA9IG5ldyBHZW5lcmljVHlwZSh0eXBlLCBhcmd1bWVudFR5cGVzKTtcbiAgICB9XG4gICAgcmV0dXJuIHR5cGVNYXBba2V5XTtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUuR2VuZXJpY1R5cGUgPSBHZW5lcmljVHlwZTtcbiAgJHRyYWNldXJSdW50aW1lLmdlbmVyaWNUeXBlID0gZ2VuZXJpY1R5cGU7XG4gICR0cmFjZXVyUnVudGltZS50eXBlID0gdHlwZXM7XG59KSgpO1xuKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciAkX18yID0gJHRyYWNldXJSdW50aW1lLFxuICAgICAgY2Fub25pY2FsaXplVXJsID0gJF9fMi5jYW5vbmljYWxpemVVcmwsXG4gICAgICByZXNvbHZlVXJsID0gJF9fMi5yZXNvbHZlVXJsLFxuICAgICAgaXNBYnNvbHV0ZSA9ICRfXzIuaXNBYnNvbHV0ZTtcbiAgdmFyIG1vZHVsZUluc3RhbnRpYXRvcnMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgYmFzZVVSTDtcbiAgaWYgKGdsb2JhbC5sb2NhdGlvbiAmJiBnbG9iYWwubG9jYXRpb24uaHJlZilcbiAgICBiYXNlVVJMID0gcmVzb2x2ZVVybChnbG9iYWwubG9jYXRpb24uaHJlZiwgJy4vJyk7XG4gIGVsc2VcbiAgICBiYXNlVVJMID0gJyc7XG4gIHZhciBVbmNvYXRlZE1vZHVsZUVudHJ5ID0gZnVuY3Rpb24gVW5jb2F0ZWRNb2R1bGVFbnRyeSh1cmwsIHVuY29hdGVkTW9kdWxlKSB7XG4gICAgdGhpcy51cmwgPSB1cmw7XG4gICAgdGhpcy52YWx1ZV8gPSB1bmNvYXRlZE1vZHVsZTtcbiAgfTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVW5jb2F0ZWRNb2R1bGVFbnRyeSwge30sIHt9KTtcbiAgdmFyIE1vZHVsZUV2YWx1YXRpb25FcnJvciA9IGZ1bmN0aW9uIE1vZHVsZUV2YWx1YXRpb25FcnJvcihlcnJvbmVvdXNNb2R1bGVOYW1lLCBjYXVzZSkge1xuICAgIHRoaXMubWVzc2FnZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZSArICc6ICcgKyB0aGlzLnN0cmlwQ2F1c2UoY2F1c2UpICsgJyBpbiAnICsgZXJyb25lb3VzTW9kdWxlTmFtZTtcbiAgICBpZiAoIShjYXVzZSBpbnN0YW5jZW9mICRNb2R1bGVFdmFsdWF0aW9uRXJyb3IpICYmIGNhdXNlLnN0YWNrKVxuICAgICAgdGhpcy5zdGFjayA9IHRoaXMuc3RyaXBTdGFjayhjYXVzZS5zdGFjayk7XG4gICAgZWxzZVxuICAgICAgdGhpcy5zdGFjayA9ICcnO1xuICB9O1xuICB2YXIgJE1vZHVsZUV2YWx1YXRpb25FcnJvciA9IE1vZHVsZUV2YWx1YXRpb25FcnJvcjtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoTW9kdWxlRXZhbHVhdGlvbkVycm9yLCB7XG4gICAgc3RyaXBFcnJvcjogZnVuY3Rpb24obWVzc2FnZSkge1xuICAgICAgcmV0dXJuIG1lc3NhZ2UucmVwbGFjZSgvLipFcnJvcjovLCB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyAnOicpO1xuICAgIH0sXG4gICAgc3RyaXBDYXVzZTogZnVuY3Rpb24oY2F1c2UpIHtcbiAgICAgIGlmICghY2F1c2UpXG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIGlmICghY2F1c2UubWVzc2FnZSlcbiAgICAgICAgcmV0dXJuIGNhdXNlICsgJyc7XG4gICAgICByZXR1cm4gdGhpcy5zdHJpcEVycm9yKGNhdXNlLm1lc3NhZ2UpO1xuICAgIH0sXG4gICAgbG9hZGVkQnk6IGZ1bmN0aW9uKG1vZHVsZU5hbWUpIHtcbiAgICAgIHRoaXMuc3RhY2sgKz0gJ1xcbiBsb2FkZWQgYnkgJyArIG1vZHVsZU5hbWU7XG4gICAgfSxcbiAgICBzdHJpcFN0YWNrOiBmdW5jdGlvbihjYXVzZVN0YWNrKSB7XG4gICAgICB2YXIgc3RhY2sgPSBbXTtcbiAgICAgIGNhdXNlU3RhY2suc3BsaXQoJ1xcbicpLnNvbWUoKGZ1bmN0aW9uKGZyYW1lKSB7XG4gICAgICAgIGlmICgvVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IvLnRlc3QoZnJhbWUpKVxuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICBzdGFjay5wdXNoKGZyYW1lKTtcbiAgICAgIH0pKTtcbiAgICAgIHN0YWNrWzBdID0gdGhpcy5zdHJpcEVycm9yKHN0YWNrWzBdKTtcbiAgICAgIHJldHVybiBzdGFjay5qb2luKCdcXG4nKTtcbiAgICB9XG4gIH0sIHt9LCBFcnJvcik7XG4gIGZ1bmN0aW9uIGJlZm9yZUxpbmVzKGxpbmVzLCBudW1iZXIpIHtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgdmFyIGZpcnN0ID0gbnVtYmVyIC0gMztcbiAgICBpZiAoZmlyc3QgPCAwKVxuICAgICAgZmlyc3QgPSAwO1xuICAgIGZvciAodmFyIGkgPSBmaXJzdDsgaSA8IG51bWJlcjsgaSsrKSB7XG4gICAgICByZXN1bHQucHVzaChsaW5lc1tpXSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gYWZ0ZXJMaW5lcyhsaW5lcywgbnVtYmVyKSB7XG4gICAgdmFyIGxhc3QgPSBudW1iZXIgKyAxO1xuICAgIGlmIChsYXN0ID4gbGluZXMubGVuZ3RoIC0gMSlcbiAgICAgIGxhc3QgPSBsaW5lcy5sZW5ndGggLSAxO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gbnVtYmVyOyBpIDw9IGxhc3Q7IGkrKykge1xuICAgICAgcmVzdWx0LnB1c2gobGluZXNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIGNvbHVtblNwYWNpbmcoY29sdW1ucykge1xuICAgIHZhciByZXN1bHQgPSAnJztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNvbHVtbnMgLSAxOyBpKyspIHtcbiAgICAgIHJlc3VsdCArPSAnLSc7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgdmFyIFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yID0gZnVuY3Rpb24gVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IodXJsLCBmdW5jKSB7XG4gICAgJHRyYWNldXJSdW50aW1lLnN1cGVyQ29uc3RydWN0b3IoJFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKS5jYWxsKHRoaXMsIHVybCwgbnVsbCk7XG4gICAgdGhpcy5mdW5jID0gZnVuYztcbiAgfTtcbiAgdmFyICRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvciA9IFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yO1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvciwge2dldFVuY29hdGVkTW9kdWxlOiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLnZhbHVlXylcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWVfO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIHJlbGF0aXZlUmVxdWlyZTtcbiAgICAgICAgaWYgKHR5cGVvZiAkdHJhY2V1clJ1bnRpbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJlbGF0aXZlUmVxdWlyZSA9ICR0cmFjZXVyUnVudGltZS5yZXF1aXJlLmJpbmQobnVsbCwgdGhpcy51cmwpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlXyA9IHRoaXMuZnVuYy5jYWxsKGdsb2JhbCwgcmVsYXRpdmVSZXF1aXJlKTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIGlmIChleCBpbnN0YW5jZW9mIE1vZHVsZUV2YWx1YXRpb25FcnJvcikge1xuICAgICAgICAgIGV4LmxvYWRlZEJ5KHRoaXMudXJsKTtcbiAgICAgICAgICB0aHJvdyBleDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZXguc3RhY2spIHtcbiAgICAgICAgICB2YXIgbGluZXMgPSB0aGlzLmZ1bmMudG9TdHJpbmcoKS5zcGxpdCgnXFxuJyk7XG4gICAgICAgICAgdmFyIGV2YWxlZCA9IFtdO1xuICAgICAgICAgIGV4LnN0YWNrLnNwbGl0KCdcXG4nKS5zb21lKGZ1bmN0aW9uKGZyYW1lKSB7XG4gICAgICAgICAgICBpZiAoZnJhbWUuaW5kZXhPZignVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IuZ2V0VW5jb2F0ZWRNb2R1bGUnKSA+IDApXG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgdmFyIG0gPSAvKGF0XFxzW15cXHNdKlxccykuKj46KFxcZCopOihcXGQqKVxcKS8uZXhlYyhmcmFtZSk7XG4gICAgICAgICAgICBpZiAobSkge1xuICAgICAgICAgICAgICB2YXIgbGluZSA9IHBhcnNlSW50KG1bMl0sIDEwKTtcbiAgICAgICAgICAgICAgZXZhbGVkID0gZXZhbGVkLmNvbmNhdChiZWZvcmVMaW5lcyhsaW5lcywgbGluZSkpO1xuICAgICAgICAgICAgICBldmFsZWQucHVzaChjb2x1bW5TcGFjaW5nKG1bM10pICsgJ14nKTtcbiAgICAgICAgICAgICAgZXZhbGVkID0gZXZhbGVkLmNvbmNhdChhZnRlckxpbmVzKGxpbmVzLCBsaW5lKSk7XG4gICAgICAgICAgICAgIGV2YWxlZC5wdXNoKCc9ID0gPSA9ID0gPSA9ID0gPScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZXZhbGVkLnB1c2goZnJhbWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGV4LnN0YWNrID0gZXZhbGVkLmpvaW4oJ1xcbicpO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IG5ldyBNb2R1bGVFdmFsdWF0aW9uRXJyb3IodGhpcy51cmwsIGV4KTtcbiAgICAgIH1cbiAgICB9fSwge30sIFVuY29hdGVkTW9kdWxlRW50cnkpO1xuICBmdW5jdGlvbiBnZXRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihuYW1lKSB7XG4gICAgaWYgKCFuYW1lKVxuICAgICAgcmV0dXJuO1xuICAgIHZhciB1cmwgPSBNb2R1bGVTdG9yZS5ub3JtYWxpemUobmFtZSk7XG4gICAgcmV0dXJuIG1vZHVsZUluc3RhbnRpYXRvcnNbdXJsXTtcbiAgfVxuICA7XG4gIHZhciBtb2R1bGVJbnN0YW5jZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICB2YXIgbGl2ZU1vZHVsZVNlbnRpbmVsID0ge307XG4gIGZ1bmN0aW9uIE1vZHVsZSh1bmNvYXRlZE1vZHVsZSkge1xuICAgIHZhciBpc0xpdmUgPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIGNvYXRlZE1vZHVsZSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModW5jb2F0ZWRNb2R1bGUpLmZvckVhY2goKGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciBnZXR0ZXIsXG4gICAgICAgICAgdmFsdWU7XG4gICAgICBpZiAoaXNMaXZlID09PSBsaXZlTW9kdWxlU2VudGluZWwpIHtcbiAgICAgICAgdmFyIGRlc2NyID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih1bmNvYXRlZE1vZHVsZSwgbmFtZSk7XG4gICAgICAgIGlmIChkZXNjci5nZXQpXG4gICAgICAgICAgZ2V0dGVyID0gZGVzY3IuZ2V0O1xuICAgICAgfVxuICAgICAgaWYgKCFnZXR0ZXIpIHtcbiAgICAgICAgdmFsdWUgPSB1bmNvYXRlZE1vZHVsZVtuYW1lXTtcbiAgICAgICAgZ2V0dGVyID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvYXRlZE1vZHVsZSwgbmFtZSwge1xuICAgICAgICBnZXQ6IGdldHRlcixcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgfSk7XG4gICAgfSkpO1xuICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyhjb2F0ZWRNb2R1bGUpO1xuICAgIHJldHVybiBjb2F0ZWRNb2R1bGU7XG4gIH1cbiAgdmFyIE1vZHVsZVN0b3JlID0ge1xuICAgIG5vcm1hbGl6ZTogZnVuY3Rpb24obmFtZSwgcmVmZXJlck5hbWUsIHJlZmVyZXJBZGRyZXNzKSB7XG4gICAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnKVxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdtb2R1bGUgbmFtZSBtdXN0IGJlIGEgc3RyaW5nLCBub3QgJyArIHR5cGVvZiBuYW1lKTtcbiAgICAgIGlmIChpc0Fic29sdXRlKG5hbWUpKVxuICAgICAgICByZXR1cm4gY2Fub25pY2FsaXplVXJsKG5hbWUpO1xuICAgICAgaWYgKC9bXlxcLl1cXC9cXC5cXC5cXC8vLnRlc3QobmFtZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtb2R1bGUgbmFtZSBlbWJlZHMgLy4uLzogJyArIG5hbWUpO1xuICAgICAgfVxuICAgICAgaWYgKG5hbWVbMF0gPT09ICcuJyAmJiByZWZlcmVyTmFtZSlcbiAgICAgICAgcmV0dXJuIHJlc29sdmVVcmwocmVmZXJlck5hbWUsIG5hbWUpO1xuICAgICAgcmV0dXJuIGNhbm9uaWNhbGl6ZVVybChuYW1lKTtcbiAgICB9LFxuICAgIGdldDogZnVuY3Rpb24obm9ybWFsaXplZE5hbWUpIHtcbiAgICAgIHZhciBtID0gZ2V0VW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3Iobm9ybWFsaXplZE5hbWUpO1xuICAgICAgaWYgKCFtKVxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgdmFyIG1vZHVsZUluc3RhbmNlID0gbW9kdWxlSW5zdGFuY2VzW20udXJsXTtcbiAgICAgIGlmIChtb2R1bGVJbnN0YW5jZSlcbiAgICAgICAgcmV0dXJuIG1vZHVsZUluc3RhbmNlO1xuICAgICAgbW9kdWxlSW5zdGFuY2UgPSBNb2R1bGUobS5nZXRVbmNvYXRlZE1vZHVsZSgpLCBsaXZlTW9kdWxlU2VudGluZWwpO1xuICAgICAgcmV0dXJuIG1vZHVsZUluc3RhbmNlc1ttLnVybF0gPSBtb2R1bGVJbnN0YW5jZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24obm9ybWFsaXplZE5hbWUsIG1vZHVsZSkge1xuICAgICAgbm9ybWFsaXplZE5hbWUgPSBTdHJpbmcobm9ybWFsaXplZE5hbWUpO1xuICAgICAgbW9kdWxlSW5zdGFudGlhdG9yc1tub3JtYWxpemVkTmFtZV0gPSBuZXcgVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3Iobm9ybWFsaXplZE5hbWUsIChmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZHVsZTtcbiAgICAgIH0pKTtcbiAgICAgIG1vZHVsZUluc3RhbmNlc1tub3JtYWxpemVkTmFtZV0gPSBtb2R1bGU7XG4gICAgfSxcbiAgICBnZXQgYmFzZVVSTCgpIHtcbiAgICAgIHJldHVybiBiYXNlVVJMO1xuICAgIH0sXG4gICAgc2V0IGJhc2VVUkwodikge1xuICAgICAgYmFzZVVSTCA9IFN0cmluZyh2KTtcbiAgICB9LFxuICAgIHJlZ2lzdGVyTW9kdWxlOiBmdW5jdGlvbihuYW1lLCBkZXBzLCBmdW5jKSB7XG4gICAgICB2YXIgbm9ybWFsaXplZE5hbWUgPSBNb2R1bGVTdG9yZS5ub3JtYWxpemUobmFtZSk7XG4gICAgICBpZiAobW9kdWxlSW5zdGFudGlhdG9yc1tub3JtYWxpemVkTmFtZV0pXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZHVwbGljYXRlIG1vZHVsZSBuYW1lZCAnICsgbm9ybWFsaXplZE5hbWUpO1xuICAgICAgbW9kdWxlSW5zdGFudGlhdG9yc1tub3JtYWxpemVkTmFtZV0gPSBuZXcgVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3Iobm9ybWFsaXplZE5hbWUsIGZ1bmMpO1xuICAgIH0sXG4gICAgYnVuZGxlU3RvcmU6IE9iamVjdC5jcmVhdGUobnVsbCksXG4gICAgcmVnaXN0ZXI6IGZ1bmN0aW9uKG5hbWUsIGRlcHMsIGZ1bmMpIHtcbiAgICAgIGlmICghZGVwcyB8fCAhZGVwcy5sZW5ndGggJiYgIWZ1bmMubGVuZ3RoKSB7XG4gICAgICAgIHRoaXMucmVnaXN0ZXJNb2R1bGUobmFtZSwgZGVwcywgZnVuYyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmJ1bmRsZVN0b3JlW25hbWVdID0ge1xuICAgICAgICAgIGRlcHM6IGRlcHMsXG4gICAgICAgICAgZXhlY3V0ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgJF9fMCA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgIHZhciBkZXBNYXAgPSB7fTtcbiAgICAgICAgICAgIGRlcHMuZm9yRWFjaCgoZnVuY3Rpb24oZGVwLCBpbmRleCkge1xuICAgICAgICAgICAgICByZXR1cm4gZGVwTWFwW2RlcF0gPSAkX18wW2luZGV4XTtcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIHZhciByZWdpc3RyeUVudHJ5ID0gZnVuYy5jYWxsKHRoaXMsIGRlcE1hcCk7XG4gICAgICAgICAgICByZWdpc3RyeUVudHJ5LmV4ZWN1dGUuY2FsbCh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiByZWdpc3RyeUVudHJ5LmV4cG9ydHM7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0sXG4gICAgZ2V0QW5vbnltb3VzTW9kdWxlOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICByZXR1cm4gbmV3IE1vZHVsZShmdW5jLmNhbGwoZ2xvYmFsKSwgbGl2ZU1vZHVsZVNlbnRpbmVsKTtcbiAgICB9LFxuICAgIGdldEZvclRlc3Rpbmc6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIHZhciAkX18wID0gdGhpcztcbiAgICAgIGlmICghdGhpcy50ZXN0aW5nUHJlZml4Xykge1xuICAgICAgICBPYmplY3Qua2V5cyhtb2R1bGVJbnN0YW5jZXMpLnNvbWUoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgIHZhciBtID0gLyh0cmFjZXVyQFteXFwvXSpcXC8pLy5leGVjKGtleSk7XG4gICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICRfXzAudGVzdGluZ1ByZWZpeF8gPSBtWzFdO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5nZXQodGhpcy50ZXN0aW5nUHJlZml4XyArIG5hbWUpO1xuICAgIH1cbiAgfTtcbiAgdmFyIG1vZHVsZVN0b3JlTW9kdWxlID0gbmV3IE1vZHVsZSh7TW9kdWxlU3RvcmU6IE1vZHVsZVN0b3JlfSk7XG4gIE1vZHVsZVN0b3JlLnNldCgnQHRyYWNldXIvc3JjL3J1bnRpbWUvTW9kdWxlU3RvcmUnLCBtb2R1bGVTdG9yZU1vZHVsZSk7XG4gIE1vZHVsZVN0b3JlLnNldCgnQHRyYWNldXIvc3JjL3J1bnRpbWUvTW9kdWxlU3RvcmUuanMnLCBtb2R1bGVTdG9yZU1vZHVsZSk7XG4gIHZhciBzZXR1cEdsb2JhbHMgPSAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzO1xuICAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzID0gZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICAgc2V0dXBHbG9iYWxzKGdsb2JhbCk7XG4gIH07XG4gICR0cmFjZXVyUnVudGltZS5Nb2R1bGVTdG9yZSA9IE1vZHVsZVN0b3JlO1xuICBnbG9iYWwuU3lzdGVtID0ge1xuICAgIHJlZ2lzdGVyOiBNb2R1bGVTdG9yZS5yZWdpc3Rlci5iaW5kKE1vZHVsZVN0b3JlKSxcbiAgICByZWdpc3Rlck1vZHVsZTogTW9kdWxlU3RvcmUucmVnaXN0ZXJNb2R1bGUuYmluZChNb2R1bGVTdG9yZSksXG4gICAgZ2V0OiBNb2R1bGVTdG9yZS5nZXQsXG4gICAgc2V0OiBNb2R1bGVTdG9yZS5zZXQsXG4gICAgbm9ybWFsaXplOiBNb2R1bGVTdG9yZS5ub3JtYWxpemVcbiAgfTtcbiAgJHRyYWNldXJSdW50aW1lLmdldE1vZHVsZUltcGwgPSBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGluc3RhbnRpYXRvciA9IGdldFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5hbWUpO1xuICAgIHJldHVybiBpbnN0YW50aWF0b3IgJiYgaW5zdGFudGlhdG9yLmdldFVuY29hdGVkTW9kdWxlKCk7XG4gIH07XG59KSh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnID8gc2VsZiA6IHRoaXMpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIjtcbiAgdmFyICRjZWlsID0gTWF0aC5jZWlsO1xuICB2YXIgJGZsb29yID0gTWF0aC5mbG9vcjtcbiAgdmFyICRpc0Zpbml0ZSA9IGlzRmluaXRlO1xuICB2YXIgJGlzTmFOID0gaXNOYU47XG4gIHZhciAkcG93ID0gTWF0aC5wb3c7XG4gIHZhciAkbWluID0gTWF0aC5taW47XG4gIHZhciB0b09iamVjdCA9ICR0cmFjZXVyUnVudGltZS50b09iamVjdDtcbiAgZnVuY3Rpb24gdG9VaW50MzIoeCkge1xuICAgIHJldHVybiB4ID4+PiAwO1xuICB9XG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcbiAgICByZXR1cm4geCAmJiAodHlwZW9mIHggPT09ICdvYmplY3QnIHx8IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKTtcbiAgfVxuICBmdW5jdGlvbiBpc0NhbGxhYmxlKHgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbic7XG4gIH1cbiAgZnVuY3Rpb24gaXNOdW1iZXIoeCkge1xuICAgIHJldHVybiB0eXBlb2YgeCA9PT0gJ251bWJlcic7XG4gIH1cbiAgZnVuY3Rpb24gdG9JbnRlZ2VyKHgpIHtcbiAgICB4ID0gK3g7XG4gICAgaWYgKCRpc05hTih4KSlcbiAgICAgIHJldHVybiAwO1xuICAgIGlmICh4ID09PSAwIHx8ICEkaXNGaW5pdGUoeCkpXG4gICAgICByZXR1cm4geDtcbiAgICByZXR1cm4geCA+IDAgPyAkZmxvb3IoeCkgOiAkY2VpbCh4KTtcbiAgfVxuICB2YXIgTUFYX1NBRkVfTEVOR1RIID0gJHBvdygyLCA1MykgLSAxO1xuICBmdW5jdGlvbiB0b0xlbmd0aCh4KSB7XG4gICAgdmFyIGxlbiA9IHRvSW50ZWdlcih4KTtcbiAgICByZXR1cm4gbGVuIDwgMCA/IDAgOiAkbWluKGxlbiwgTUFYX1NBRkVfTEVOR1RIKTtcbiAgfVxuICBmdW5jdGlvbiBjaGVja0l0ZXJhYmxlKHgpIHtcbiAgICByZXR1cm4gIWlzT2JqZWN0KHgpID8gdW5kZWZpbmVkIDogeFtTeW1ib2wuaXRlcmF0b3JdO1xuICB9XG4gIGZ1bmN0aW9uIGlzQ29uc3RydWN0b3IoeCkge1xuICAgIHJldHVybiBpc0NhbGxhYmxlKHgpO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHZhbHVlLCBkb25lKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGRvbmU6IGRvbmVcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIG1heWJlRGVmaW5lKG9iamVjdCwgbmFtZSwgZGVzY3IpIHtcbiAgICBpZiAoIShuYW1lIGluIG9iamVjdCkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIGRlc2NyKTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVEZWZpbmVNZXRob2Qob2JqZWN0LCBuYW1lLCB2YWx1ZSkge1xuICAgIG1heWJlRGVmaW5lKG9iamVjdCwgbmFtZSwge1xuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9XG4gIGZ1bmN0aW9uIG1heWJlRGVmaW5lQ29uc3Qob2JqZWN0LCBuYW1lLCB2YWx1ZSkge1xuICAgIG1heWJlRGVmaW5lKG9iamVjdCwgbmFtZSwge1xuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgY29uZmlndXJhYmxlOiBmYWxzZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IGZhbHNlXG4gICAgfSk7XG4gIH1cbiAgZnVuY3Rpb24gbWF5YmVBZGRGdW5jdGlvbnMob2JqZWN0LCBmdW5jdGlvbnMpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZ1bmN0aW9ucy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgdmFyIG5hbWUgPSBmdW5jdGlvbnNbaV07XG4gICAgICB2YXIgdmFsdWUgPSBmdW5jdGlvbnNbaSArIDFdO1xuICAgICAgbWF5YmVEZWZpbmVNZXRob2Qob2JqZWN0LCBuYW1lLCB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG1heWJlQWRkQ29uc3RzKG9iamVjdCwgY29uc3RzKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb25zdHMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgIHZhciBuYW1lID0gY29uc3RzW2ldO1xuICAgICAgdmFyIHZhbHVlID0gY29uc3RzW2kgKyAxXTtcbiAgICAgIG1heWJlRGVmaW5lQ29uc3Qob2JqZWN0LCBuYW1lLCB2YWx1ZSk7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG1heWJlQWRkSXRlcmF0b3Iob2JqZWN0LCBmdW5jLCBTeW1ib2wpIHtcbiAgICBpZiAoIVN5bWJvbCB8fCAhU3ltYm9sLml0ZXJhdG9yIHx8IG9iamVjdFtTeW1ib2wuaXRlcmF0b3JdKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChvYmplY3RbJ0BAaXRlcmF0b3InXSlcbiAgICAgIGZ1bmMgPSBvYmplY3RbJ0BAaXRlcmF0b3InXTtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBTeW1ib2wuaXRlcmF0b3IsIHtcbiAgICAgIHZhbHVlOiBmdW5jLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0pO1xuICB9XG4gIHZhciBwb2x5ZmlsbHMgPSBbXTtcbiAgZnVuY3Rpb24gcmVnaXN0ZXJQb2x5ZmlsbChmdW5jKSB7XG4gICAgcG9seWZpbGxzLnB1c2goZnVuYyk7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxBbGwoZ2xvYmFsKSB7XG4gICAgcG9seWZpbGxzLmZvckVhY2goKGZ1bmN0aW9uKGYpIHtcbiAgICAgIHJldHVybiBmKGdsb2JhbCk7XG4gICAgfSkpO1xuICB9XG4gIHJldHVybiB7XG4gICAgZ2V0IHRvT2JqZWN0KCkge1xuICAgICAgcmV0dXJuIHRvT2JqZWN0O1xuICAgIH0sXG4gICAgZ2V0IHRvVWludDMyKCkge1xuICAgICAgcmV0dXJuIHRvVWludDMyO1xuICAgIH0sXG4gICAgZ2V0IGlzT2JqZWN0KCkge1xuICAgICAgcmV0dXJuIGlzT2JqZWN0O1xuICAgIH0sXG4gICAgZ2V0IGlzQ2FsbGFibGUoKSB7XG4gICAgICByZXR1cm4gaXNDYWxsYWJsZTtcbiAgICB9LFxuICAgIGdldCBpc051bWJlcigpIHtcbiAgICAgIHJldHVybiBpc051bWJlcjtcbiAgICB9LFxuICAgIGdldCB0b0ludGVnZXIoKSB7XG4gICAgICByZXR1cm4gdG9JbnRlZ2VyO1xuICAgIH0sXG4gICAgZ2V0IHRvTGVuZ3RoKCkge1xuICAgICAgcmV0dXJuIHRvTGVuZ3RoO1xuICAgIH0sXG4gICAgZ2V0IGNoZWNrSXRlcmFibGUoKSB7XG4gICAgICByZXR1cm4gY2hlY2tJdGVyYWJsZTtcbiAgICB9LFxuICAgIGdldCBpc0NvbnN0cnVjdG9yKCkge1xuICAgICAgcmV0dXJuIGlzQ29uc3RydWN0b3I7XG4gICAgfSxcbiAgICBnZXQgY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QoKSB7XG4gICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3Q7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVEZWZpbmUoKSB7XG4gICAgICByZXR1cm4gbWF5YmVEZWZpbmU7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVEZWZpbmVNZXRob2QoKSB7XG4gICAgICByZXR1cm4gbWF5YmVEZWZpbmVNZXRob2Q7XG4gICAgfSxcbiAgICBnZXQgbWF5YmVEZWZpbmVDb25zdCgpIHtcbiAgICAgIHJldHVybiBtYXliZURlZmluZUNvbnN0O1xuICAgIH0sXG4gICAgZ2V0IG1heWJlQWRkRnVuY3Rpb25zKCkge1xuICAgICAgcmV0dXJuIG1heWJlQWRkRnVuY3Rpb25zO1xuICAgIH0sXG4gICAgZ2V0IG1heWJlQWRkQ29uc3RzKCkge1xuICAgICAgcmV0dXJuIG1heWJlQWRkQ29uc3RzO1xuICAgIH0sXG4gICAgZ2V0IG1heWJlQWRkSXRlcmF0b3IoKSB7XG4gICAgICByZXR1cm4gbWF5YmVBZGRJdGVyYXRvcjtcbiAgICB9LFxuICAgIGdldCByZWdpc3RlclBvbHlmaWxsKCkge1xuICAgICAgcmV0dXJuIHJlZ2lzdGVyUG9seWZpbGw7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxBbGwoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxBbGw7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9NYXAuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTWFwLmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgaXNPYmplY3QgPSAkX18wLmlzT2JqZWN0LFxuICAgICAgbWF5YmVBZGRJdGVyYXRvciA9ICRfXzAubWF5YmVBZGRJdGVyYXRvcixcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18wLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciBnZXRPd25IYXNoT2JqZWN0ID0gJHRyYWNldXJSdW50aW1lLmdldE93bkhhc2hPYmplY3Q7XG4gIHZhciAkaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuICB2YXIgZGVsZXRlZFNlbnRpbmVsID0ge307XG4gIGZ1bmN0aW9uIGxvb2t1cEluZGV4KG1hcCwga2V5KSB7XG4gICAgaWYgKGlzT2JqZWN0KGtleSkpIHtcbiAgICAgIHZhciBoYXNoT2JqZWN0ID0gZ2V0T3duSGFzaE9iamVjdChrZXkpO1xuICAgICAgcmV0dXJuIGhhc2hPYmplY3QgJiYgbWFwLm9iamVjdEluZGV4X1toYXNoT2JqZWN0Lmhhc2hdO1xuICAgIH1cbiAgICBpZiAodHlwZW9mIGtleSA9PT0gJ3N0cmluZycpXG4gICAgICByZXR1cm4gbWFwLnN0cmluZ0luZGV4X1trZXldO1xuICAgIHJldHVybiBtYXAucHJpbWl0aXZlSW5kZXhfW2tleV07XG4gIH1cbiAgZnVuY3Rpb24gaW5pdE1hcChtYXApIHtcbiAgICBtYXAuZW50cmllc18gPSBbXTtcbiAgICBtYXAub2JqZWN0SW5kZXhfID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBtYXAuc3RyaW5nSW5kZXhfID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBtYXAucHJpbWl0aXZlSW5kZXhfID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBtYXAuZGVsZXRlZENvdW50XyA9IDA7XG4gIH1cbiAgdmFyIE1hcCA9IGZ1bmN0aW9uIE1hcCgpIHtcbiAgICB2YXIgaXRlcmFibGUgPSBhcmd1bWVudHNbMF07XG4gICAgaWYgKCFpc09iamVjdCh0aGlzKSlcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01hcCBjYWxsZWQgb24gaW5jb21wYXRpYmxlIHR5cGUnKTtcbiAgICBpZiAoJGhhc093blByb3BlcnR5LmNhbGwodGhpcywgJ2VudHJpZXNfJykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01hcCBjYW4gbm90IGJlIHJlZW50cmFudGx5IGluaXRpYWxpc2VkJyk7XG4gICAgfVxuICAgIGluaXRNYXAodGhpcyk7XG4gICAgaWYgKGl0ZXJhYmxlICE9PSBudWxsICYmIGl0ZXJhYmxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvciAodmFyICRfXzIgPSBpdGVyYWJsZVskdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShTeW1ib2wuaXRlcmF0b3IpXSgpLFxuICAgICAgICAgICRfXzM7ICEoJF9fMyA9ICRfXzIubmV4dCgpKS5kb25lOyApIHtcbiAgICAgICAgdmFyICRfXzQgPSAkX18zLnZhbHVlLFxuICAgICAgICAgICAga2V5ID0gJF9fNFswXSxcbiAgICAgICAgICAgIHZhbHVlID0gJF9fNFsxXTtcbiAgICAgICAge1xuICAgICAgICAgIHRoaXMuc2V0KGtleSwgdmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShNYXAsIHtcbiAgICBnZXQgc2l6ZSgpIHtcbiAgICAgIHJldHVybiB0aGlzLmVudHJpZXNfLmxlbmd0aCAvIDIgLSB0aGlzLmRlbGV0ZWRDb3VudF87XG4gICAgfSxcbiAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIGluZGV4ID0gbG9va3VwSW5kZXgodGhpcywga2V5KTtcbiAgICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKVxuICAgICAgICByZXR1cm4gdGhpcy5lbnRyaWVzX1tpbmRleCArIDFdO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICB2YXIgb2JqZWN0TW9kZSA9IGlzT2JqZWN0KGtleSk7XG4gICAgICB2YXIgc3RyaW5nTW9kZSA9IHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnO1xuICAgICAgdmFyIGluZGV4ID0gbG9va3VwSW5kZXgodGhpcywga2V5KTtcbiAgICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZW50cmllc19baW5kZXggKyAxXSA9IHZhbHVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLmVudHJpZXNfLmxlbmd0aDtcbiAgICAgICAgdGhpcy5lbnRyaWVzX1tpbmRleF0gPSBrZXk7XG4gICAgICAgIHRoaXMuZW50cmllc19baW5kZXggKyAxXSA9IHZhbHVlO1xuICAgICAgICBpZiAob2JqZWN0TW9kZSkge1xuICAgICAgICAgIHZhciBoYXNoT2JqZWN0ID0gZ2V0T3duSGFzaE9iamVjdChrZXkpO1xuICAgICAgICAgIHZhciBoYXNoID0gaGFzaE9iamVjdC5oYXNoO1xuICAgICAgICAgIHRoaXMub2JqZWN0SW5kZXhfW2hhc2hdID0gaW5kZXg7XG4gICAgICAgIH0gZWxzZSBpZiAoc3RyaW5nTW9kZSkge1xuICAgICAgICAgIHRoaXMuc3RyaW5nSW5kZXhfW2tleV0gPSBpbmRleDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLnByaW1pdGl2ZUluZGV4X1trZXldID0gaW5kZXg7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBsb29rdXBJbmRleCh0aGlzLCBrZXkpICE9PSB1bmRlZmluZWQ7XG4gICAgfSxcbiAgICBkZWxldGU6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdmFyIG9iamVjdE1vZGUgPSBpc09iamVjdChrZXkpO1xuICAgICAgdmFyIHN0cmluZ01vZGUgPSB0eXBlb2Yga2V5ID09PSAnc3RyaW5nJztcbiAgICAgIHZhciBpbmRleDtcbiAgICAgIHZhciBoYXNoO1xuICAgICAgaWYgKG9iamVjdE1vZGUpIHtcbiAgICAgICAgdmFyIGhhc2hPYmplY3QgPSBnZXRPd25IYXNoT2JqZWN0KGtleSk7XG4gICAgICAgIGlmIChoYXNoT2JqZWN0KSB7XG4gICAgICAgICAgaW5kZXggPSB0aGlzLm9iamVjdEluZGV4X1toYXNoID0gaGFzaE9iamVjdC5oYXNoXTtcbiAgICAgICAgICBkZWxldGUgdGhpcy5vYmplY3RJbmRleF9baGFzaF07XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoc3RyaW5nTW9kZSkge1xuICAgICAgICBpbmRleCA9IHRoaXMuc3RyaW5nSW5kZXhfW2tleV07XG4gICAgICAgIGRlbGV0ZSB0aGlzLnN0cmluZ0luZGV4X1trZXldO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLnByaW1pdGl2ZUluZGV4X1trZXldO1xuICAgICAgICBkZWxldGUgdGhpcy5wcmltaXRpdmVJbmRleF9ba2V5XTtcbiAgICAgIH1cbiAgICAgIGlmIChpbmRleCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRoaXMuZW50cmllc19baW5kZXhdID0gZGVsZXRlZFNlbnRpbmVsO1xuICAgICAgICB0aGlzLmVudHJpZXNfW2luZGV4ICsgMV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIHRoaXMuZGVsZXRlZENvdW50XysrO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9LFxuICAgIGNsZWFyOiBmdW5jdGlvbigpIHtcbiAgICAgIGluaXRNYXAodGhpcyk7XG4gICAgfSxcbiAgICBmb3JFYWNoOiBmdW5jdGlvbihjYWxsYmFja0ZuKSB7XG4gICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5lbnRyaWVzXy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICB2YXIga2V5ID0gdGhpcy5lbnRyaWVzX1tpXTtcbiAgICAgICAgdmFyIHZhbHVlID0gdGhpcy5lbnRyaWVzX1tpICsgMV07XG4gICAgICAgIGlmIChrZXkgPT09IGRlbGV0ZWRTZW50aW5lbClcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgY2FsbGJhY2tGbi5jYWxsKHRoaXNBcmcsIHZhbHVlLCBrZXksIHRoaXMpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZW50cmllczogJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbihmdW5jdGlvbiAkX181KCkge1xuICAgICAgdmFyIGksXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHZhbHVlO1xuICAgICAgcmV0dXJuICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShmdW5jdGlvbigkY3R4KSB7XG4gICAgICAgIHdoaWxlICh0cnVlKVxuICAgICAgICAgIHN3aXRjaCAoJGN0eC5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICBpID0gMDtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoaSA8IHRoaXMuZW50cmllc18ubGVuZ3RoKSA/IDggOiAtMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAga2V5ID0gdGhpcy5lbnRyaWVzX1tpXTtcbiAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmVudHJpZXNfW2kgKyAxXTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKGtleSA9PT0gZGVsZXRlZFNlbnRpbmVsKSA/IDQgOiA2O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDI7XG4gICAgICAgICAgICAgIHJldHVybiBba2V5LCB2YWx1ZV07XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICRjdHgubWF5YmVUaHJvdygpO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gNDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICByZXR1cm4gJGN0eC5lbmQoKTtcbiAgICAgICAgICB9XG4gICAgICB9LCAkX181LCB0aGlzKTtcbiAgICB9KSxcbiAgICBrZXlzOiAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uICRfXzYoKSB7XG4gICAgICB2YXIgaSxcbiAgICAgICAgICBrZXksXG4gICAgICAgICAgdmFsdWU7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgIGkgPSAwO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChpIDwgdGhpcy5lbnRyaWVzXy5sZW5ndGgpID8gOCA6IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgaSArPSAyO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICBrZXkgPSB0aGlzLmVudHJpZXNfW2ldO1xuICAgICAgICAgICAgICB2YWx1ZSA9IHRoaXMuZW50cmllc19baSArIDFdO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gOTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoa2V5ID09PSBkZWxldGVkU2VudGluZWwpID8gNCA6IDY7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMjtcbiAgICAgICAgICAgICAgcmV0dXJuIGtleTtcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5tYXliZVRocm93KCk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA0O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiAkY3R4LmVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgIH0sICRfXzYsIHRoaXMpO1xuICAgIH0pLFxuICAgIHZhbHVlczogJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbihmdW5jdGlvbiAkX183KCkge1xuICAgICAgdmFyIGksXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHZhbHVlO1xuICAgICAgcmV0dXJuICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShmdW5jdGlvbigkY3R4KSB7XG4gICAgICAgIHdoaWxlICh0cnVlKVxuICAgICAgICAgIHN3aXRjaCAoJGN0eC5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICBpID0gMDtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoaSA8IHRoaXMuZW50cmllc18ubGVuZ3RoKSA/IDggOiAtMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAga2V5ID0gdGhpcy5lbnRyaWVzX1tpXTtcbiAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmVudHJpZXNfW2kgKyAxXTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKGtleSA9PT0gZGVsZXRlZFNlbnRpbmVsKSA/IDQgOiA2O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDI7XG4gICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5tYXliZVRocm93KCk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA0O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiAkY3R4LmVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgIH0sICRfXzcsIHRoaXMpO1xuICAgIH0pXG4gIH0sIHt9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KE1hcC5wcm90b3R5cGUsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICB2YWx1ZTogTWFwLnByb3RvdHlwZS5lbnRyaWVzXG4gIH0pO1xuICBmdW5jdGlvbiBwb2x5ZmlsbE1hcChnbG9iYWwpIHtcbiAgICB2YXIgJF9fNCA9IGdsb2JhbCxcbiAgICAgICAgT2JqZWN0ID0gJF9fNC5PYmplY3QsXG4gICAgICAgIFN5bWJvbCA9ICRfXzQuU3ltYm9sO1xuICAgIGlmICghZ2xvYmFsLk1hcClcbiAgICAgIGdsb2JhbC5NYXAgPSBNYXA7XG4gICAgdmFyIG1hcFByb3RvdHlwZSA9IGdsb2JhbC5NYXAucHJvdG90eXBlO1xuICAgIGlmIChtYXBQcm90b3R5cGUuZW50cmllcyA9PT0gdW5kZWZpbmVkKVxuICAgICAgZ2xvYmFsLk1hcCA9IE1hcDtcbiAgICBpZiAobWFwUHJvdG90eXBlLmVudHJpZXMpIHtcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IobWFwUHJvdG90eXBlLCBtYXBQcm90b3R5cGUuZW50cmllcywgU3ltYm9sKTtcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKG5ldyBnbG9iYWwuTWFwKCkuZW50cmllcygpKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSwgU3ltYm9sKTtcbiAgICB9XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbE1hcCk7XG4gIHJldHVybiB7XG4gICAgZ2V0IE1hcCgpIHtcbiAgICAgIHJldHVybiBNYXA7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxNYXAoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxNYXA7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTWFwLmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TZXQuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU2V0LmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgaXNPYmplY3QgPSAkX18wLmlzT2JqZWN0LFxuICAgICAgbWF5YmVBZGRJdGVyYXRvciA9ICRfXzAubWF5YmVBZGRJdGVyYXRvcixcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18wLnJlZ2lzdGVyUG9seWZpbGw7XG4gIHZhciBNYXAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTWFwLmpzXCIpLk1hcDtcbiAgdmFyIGdldE93bkhhc2hPYmplY3QgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duSGFzaE9iamVjdDtcbiAgdmFyICRoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIGZ1bmN0aW9uIGluaXRTZXQoc2V0KSB7XG4gICAgc2V0Lm1hcF8gPSBuZXcgTWFwKCk7XG4gIH1cbiAgdmFyIFNldCA9IGZ1bmN0aW9uIFNldCgpIHtcbiAgICB2YXIgaXRlcmFibGUgPSBhcmd1bWVudHNbMF07XG4gICAgaWYgKCFpc09iamVjdCh0aGlzKSlcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1NldCBjYWxsZWQgb24gaW5jb21wYXRpYmxlIHR5cGUnKTtcbiAgICBpZiAoJGhhc093blByb3BlcnR5LmNhbGwodGhpcywgJ21hcF8nKSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignU2V0IGNhbiBub3QgYmUgcmVlbnRyYW50bHkgaW5pdGlhbGlzZWQnKTtcbiAgICB9XG4gICAgaW5pdFNldCh0aGlzKTtcbiAgICBpZiAoaXRlcmFibGUgIT09IG51bGwgJiYgaXRlcmFibGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgZm9yICh2YXIgJF9fNCA9IGl0ZXJhYmxlWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KFN5bWJvbC5pdGVyYXRvcildKCksXG4gICAgICAgICAgJF9fNTsgISgkX181ID0gJF9fNC5uZXh0KCkpLmRvbmU7ICkge1xuICAgICAgICB2YXIgaXRlbSA9ICRfXzUudmFsdWU7XG4gICAgICAgIHtcbiAgICAgICAgICB0aGlzLmFkZChpdGVtKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoU2V0LCB7XG4gICAgZ2V0IHNpemUoKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBfLnNpemU7XG4gICAgfSxcbiAgICBoYXM6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwXy5oYXMoa2V5KTtcbiAgICB9LFxuICAgIGFkZDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICB0aGlzLm1hcF8uc2V0KGtleSwga2V5KTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgZGVsZXRlOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcF8uZGVsZXRlKGtleSk7XG4gICAgfSxcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBfLmNsZWFyKCk7XG4gICAgfSxcbiAgICBmb3JFYWNoOiBmdW5jdGlvbihjYWxsYmFja0ZuKSB7XG4gICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIHZhciAkX18yID0gdGhpcztcbiAgICAgIHJldHVybiB0aGlzLm1hcF8uZm9yRWFjaCgoZnVuY3Rpb24odmFsdWUsIGtleSkge1xuICAgICAgICBjYWxsYmFja0ZuLmNhbGwodGhpc0FyZywga2V5LCBrZXksICRfXzIpO1xuICAgICAgfSkpO1xuICAgIH0sXG4gICAgdmFsdWVzOiAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uICRfXzcoKSB7XG4gICAgICB2YXIgJF9fOCxcbiAgICAgICAgICAkX185O1xuICAgICAgcmV0dXJuICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShmdW5jdGlvbigkY3R4KSB7XG4gICAgICAgIHdoaWxlICh0cnVlKVxuICAgICAgICAgIHN3aXRjaCAoJGN0eC5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAkX184ID0gdGhpcy5tYXBfLmtleXMoKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgICAgICAgICAgICRjdHguc2VudCA9IHZvaWQgMDtcbiAgICAgICAgICAgICAgJGN0eC5hY3Rpb24gPSAnbmV4dCc7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAkX185ID0gJF9fOFskY3R4LmFjdGlvbl0oJGN0eC5zZW50SWdub3JlVGhyb3cpO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gOTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoJF9fOS5kb25lKSA/IDMgOiAyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgJGN0eC5zZW50ID0gJF9fOS52YWx1ZTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IC0yO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICByZXR1cm4gJF9fOS52YWx1ZTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiAkY3R4LmVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgIH0sICRfXzcsIHRoaXMpO1xuICAgIH0pLFxuICAgIGVudHJpZXM6ICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb24gJF9fMTAoKSB7XG4gICAgICB2YXIgJF9fMTEsXG4gICAgICAgICAgJF9fMTI7XG4gICAgICByZXR1cm4gJHRyYWNldXJSdW50aW1lLmNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGZ1bmN0aW9uKCRjdHgpIHtcbiAgICAgICAgd2hpbGUgKHRydWUpXG4gICAgICAgICAgc3dpdGNoICgkY3R4LnN0YXRlKSB7XG4gICAgICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICAgICRfXzExID0gdGhpcy5tYXBfLmVudHJpZXMoKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gICAgICAgICAgICAgICRjdHguc2VudCA9IHZvaWQgMDtcbiAgICAgICAgICAgICAgJGN0eC5hY3Rpb24gPSAnbmV4dCc7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAkX18xMiA9ICRfXzExWyRjdHguYWN0aW9uXSgkY3R4LnNlbnRJZ25vcmVUaHJvdyk7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA5O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9ICgkX18xMi5kb25lKSA/IDMgOiAyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgJGN0eC5zZW50ID0gJF9fMTIudmFsdWU7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAtMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgcmV0dXJuICRfXzEyLnZhbHVlO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuICRjdHguZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgfSwgJF9fMTAsIHRoaXMpO1xuICAgIH0pXG4gIH0sIHt9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNldC5wcm90b3R5cGUsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICB2YWx1ZTogU2V0LnByb3RvdHlwZS52YWx1ZXNcbiAgfSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTZXQucHJvdG90eXBlLCAna2V5cycsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IFNldC5wcm90b3R5cGUudmFsdWVzXG4gIH0pO1xuICBmdW5jdGlvbiBwb2x5ZmlsbFNldChnbG9iYWwpIHtcbiAgICB2YXIgJF9fNiA9IGdsb2JhbCxcbiAgICAgICAgT2JqZWN0ID0gJF9fNi5PYmplY3QsXG4gICAgICAgIFN5bWJvbCA9ICRfXzYuU3ltYm9sO1xuICAgIGlmICghZ2xvYmFsLlNldClcbiAgICAgIGdsb2JhbC5TZXQgPSBTZXQ7XG4gICAgdmFyIHNldFByb3RvdHlwZSA9IGdsb2JhbC5TZXQucHJvdG90eXBlO1xuICAgIGlmIChzZXRQcm90b3R5cGUudmFsdWVzKSB7XG4gICAgICBtYXliZUFkZEl0ZXJhdG9yKHNldFByb3RvdHlwZSwgc2V0UHJvdG90eXBlLnZhbHVlcywgU3ltYm9sKTtcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKG5ldyBnbG9iYWwuU2V0KCkudmFsdWVzKCkpLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICB9LCBTeW1ib2wpO1xuICAgIH1cbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsU2V0KTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgU2V0KCkge1xuICAgICAgcmV0dXJuIFNldDtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbFNldCgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbFNldDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TZXQuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvbm9kZV9tb2R1bGVzL3JzdnAvbGliL3JzdnAvYXNhcC5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L25vZGVfbW9kdWxlcy9yc3ZwL2xpYi9yc3ZwL2FzYXAuanNcIjtcbiAgdmFyIGxlbiA9IDA7XG4gIGZ1bmN0aW9uIGFzYXAoY2FsbGJhY2ssIGFyZykge1xuICAgIHF1ZXVlW2xlbl0gPSBjYWxsYmFjaztcbiAgICBxdWV1ZVtsZW4gKyAxXSA9IGFyZztcbiAgICBsZW4gKz0gMjtcbiAgICBpZiAobGVuID09PSAyKSB7XG4gICAgICBzY2hlZHVsZUZsdXNoKCk7XG4gICAgfVxuICB9XG4gIHZhciAkX19kZWZhdWx0ID0gYXNhcDtcbiAgdmFyIGJyb3dzZXJHbG9iYWwgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpID8gd2luZG93IDoge307XG4gIHZhciBCcm93c2VyTXV0YXRpb25PYnNlcnZlciA9IGJyb3dzZXJHbG9iYWwuTXV0YXRpb25PYnNlcnZlciB8fCBicm93c2VyR2xvYmFsLldlYktpdE11dGF0aW9uT2JzZXJ2ZXI7XG4gIHZhciBpc1dvcmtlciA9IHR5cGVvZiBVaW50OENsYW1wZWRBcnJheSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGltcG9ydFNjcmlwdHMgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBNZXNzYWdlQ2hhbm5lbCAhPT0gJ3VuZGVmaW5lZCc7XG4gIGZ1bmN0aW9uIHVzZU5leHRUaWNrKCkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHByb2Nlc3MubmV4dFRpY2soZmx1c2gpO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gdXNlTXV0YXRpb25PYnNlcnZlcigpIHtcbiAgICB2YXIgaXRlcmF0aW9ucyA9IDA7XG4gICAgdmFyIG9ic2VydmVyID0gbmV3IEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKGZsdXNoKTtcbiAgICB2YXIgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICBvYnNlcnZlci5vYnNlcnZlKG5vZGUsIHtjaGFyYWN0ZXJEYXRhOiB0cnVlfSk7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgbm9kZS5kYXRhID0gKGl0ZXJhdGlvbnMgPSArK2l0ZXJhdGlvbnMgJSAyKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIHVzZU1lc3NhZ2VDaGFubmVsKCkge1xuICAgIHZhciBjaGFubmVsID0gbmV3IE1lc3NhZ2VDaGFubmVsKCk7XG4gICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmbHVzaDtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKDApO1xuICAgIH07XG4gIH1cbiAgZnVuY3Rpb24gdXNlU2V0VGltZW91dCgpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBzZXRUaW1lb3V0KGZsdXNoLCAxKTtcbiAgICB9O1xuICB9XG4gIHZhciBxdWV1ZSA9IG5ldyBBcnJheSgxMDAwKTtcbiAgZnVuY3Rpb24gZmx1c2goKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkgKz0gMikge1xuICAgICAgdmFyIGNhbGxiYWNrID0gcXVldWVbaV07XG4gICAgICB2YXIgYXJnID0gcXVldWVbaSArIDFdO1xuICAgICAgY2FsbGJhY2soYXJnKTtcbiAgICAgIHF1ZXVlW2ldID0gdW5kZWZpbmVkO1xuICAgICAgcXVldWVbaSArIDFdID0gdW5kZWZpbmVkO1xuICAgIH1cbiAgICBsZW4gPSAwO1xuICB9XG4gIHZhciBzY2hlZHVsZUZsdXNoO1xuICBpZiAodHlwZW9mIHByb2Nlc3MgIT09ICd1bmRlZmluZWQnICYmIHt9LnRvU3RyaW5nLmNhbGwocHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJykge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VOZXh0VGljaygpO1xuICB9IGVsc2UgaWYgKEJyb3dzZXJNdXRhdGlvbk9ic2VydmVyKSB7XG4gICAgc2NoZWR1bGVGbHVzaCA9IHVzZU11dGF0aW9uT2JzZXJ2ZXIoKTtcbiAgfSBlbHNlIGlmIChpc1dvcmtlcikge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VNZXNzYWdlQ2hhbm5lbCgpO1xuICB9IGVsc2Uge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VTZXRUaW1lb3V0KCk7XG4gIH1cbiAgcmV0dXJuIHtnZXQgZGVmYXVsdCgpIHtcbiAgICAgIHJldHVybiAkX19kZWZhdWx0O1xuICAgIH19O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9Qcm9taXNlLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1Byb21pc2UuanNcIjtcbiAgdmFyIGFzeW5jID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvbm9kZV9tb2R1bGVzL3JzdnAvbGliL3JzdnAvYXNhcC5qc1wiKS5kZWZhdWx0O1xuICB2YXIgcmVnaXN0ZXJQb2x5ZmlsbCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKS5yZWdpc3RlclBvbHlmaWxsO1xuICB2YXIgcHJvbWlzZVJhdyA9IHt9O1xuICBmdW5jdGlvbiBpc1Byb21pc2UoeCkge1xuICAgIHJldHVybiB4ICYmIHR5cGVvZiB4ID09PSAnb2JqZWN0JyAmJiB4LnN0YXR1c18gIT09IHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBpZFJlc29sdmVIYW5kbGVyKHgpIHtcbiAgICByZXR1cm4geDtcbiAgfVxuICBmdW5jdGlvbiBpZFJlamVjdEhhbmRsZXIoeCkge1xuICAgIHRocm93IHg7XG4gIH1cbiAgZnVuY3Rpb24gY2hhaW4ocHJvbWlzZSkge1xuICAgIHZhciBvblJlc29sdmUgPSBhcmd1bWVudHNbMV0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzFdIDogaWRSZXNvbHZlSGFuZGxlcjtcbiAgICB2YXIgb25SZWplY3QgPSBhcmd1bWVudHNbMl0gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzJdIDogaWRSZWplY3RIYW5kbGVyO1xuICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKHByb21pc2UuY29uc3RydWN0b3IpO1xuICAgIHN3aXRjaCAocHJvbWlzZS5zdGF0dXNfKSB7XG4gICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yO1xuICAgICAgY2FzZSAwOlxuICAgICAgICBwcm9taXNlLm9uUmVzb2x2ZV8ucHVzaChvblJlc29sdmUsIGRlZmVycmVkKTtcbiAgICAgICAgcHJvbWlzZS5vblJlamVjdF8ucHVzaChvblJlamVjdCwgZGVmZXJyZWQpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgKzE6XG4gICAgICAgIHByb21pc2VFbnF1ZXVlKHByb21pc2UudmFsdWVfLCBbb25SZXNvbHZlLCBkZWZlcnJlZF0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgLTE6XG4gICAgICAgIHByb21pc2VFbnF1ZXVlKHByb21pc2UudmFsdWVfLCBbb25SZWplY3QsIGRlZmVycmVkXSk7XG4gICAgICAgIGJyZWFrO1xuICAgIH1cbiAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgfVxuICBmdW5jdGlvbiBnZXREZWZlcnJlZChDKSB7XG4gICAgaWYgKHRoaXMgPT09ICRQcm9taXNlKSB7XG4gICAgICB2YXIgcHJvbWlzZSA9IHByb21pc2VJbml0KG5ldyAkUHJvbWlzZShwcm9taXNlUmF3KSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBwcm9taXNlOiBwcm9taXNlLFxuICAgICAgICByZXNvbHZlOiAoZnVuY3Rpb24oeCkge1xuICAgICAgICAgIHByb21pc2VSZXNvbHZlKHByb21pc2UsIHgpO1xuICAgICAgICB9KSxcbiAgICAgICAgcmVqZWN0OiAoZnVuY3Rpb24ocikge1xuICAgICAgICAgIHByb21pc2VSZWplY3QocHJvbWlzZSwgcik7XG4gICAgICAgIH0pXG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcmVzdWx0ID0ge307XG4gICAgICByZXN1bHQucHJvbWlzZSA9IG5ldyBDKChmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgcmVzdWx0LnJlc29sdmUgPSByZXNvbHZlO1xuICAgICAgICByZXN1bHQucmVqZWN0ID0gcmVqZWN0O1xuICAgICAgfSkpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZVNldChwcm9taXNlLCBzdGF0dXMsIHZhbHVlLCBvblJlc29sdmUsIG9uUmVqZWN0KSB7XG4gICAgcHJvbWlzZS5zdGF0dXNfID0gc3RhdHVzO1xuICAgIHByb21pc2UudmFsdWVfID0gdmFsdWU7XG4gICAgcHJvbWlzZS5vblJlc29sdmVfID0gb25SZXNvbHZlO1xuICAgIHByb21pc2Uub25SZWplY3RfID0gb25SZWplY3Q7XG4gICAgcmV0dXJuIHByb21pc2U7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZUluaXQocHJvbWlzZSkge1xuICAgIHJldHVybiBwcm9taXNlU2V0KHByb21pc2UsIDAsIHVuZGVmaW5lZCwgW10sIFtdKTtcbiAgfVxuICB2YXIgUHJvbWlzZSA9IGZ1bmN0aW9uIFByb21pc2UocmVzb2x2ZXIpIHtcbiAgICBpZiAocmVzb2x2ZXIgPT09IHByb21pc2VSYXcpXG4gICAgICByZXR1cm47XG4gICAgaWYgKHR5cGVvZiByZXNvbHZlciAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgdmFyIHByb21pc2UgPSBwcm9taXNlSW5pdCh0aGlzKTtcbiAgICB0cnkge1xuICAgICAgcmVzb2x2ZXIoKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgcHJvbWlzZVJlc29sdmUocHJvbWlzZSwgeCk7XG4gICAgICB9KSwgKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgcHJvbWlzZVJlamVjdChwcm9taXNlLCByKTtcbiAgICAgIH0pKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBwcm9taXNlUmVqZWN0KHByb21pc2UsIGUpO1xuICAgIH1cbiAgfTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoUHJvbWlzZSwge1xuICAgIGNhdGNoOiBmdW5jdGlvbihvblJlamVjdCkge1xuICAgICAgcmV0dXJuIHRoaXMudGhlbih1bmRlZmluZWQsIG9uUmVqZWN0KTtcbiAgICB9LFxuICAgIHRoZW46IGZ1bmN0aW9uKG9uUmVzb2x2ZSwgb25SZWplY3QpIHtcbiAgICAgIGlmICh0eXBlb2Ygb25SZXNvbHZlICE9PSAnZnVuY3Rpb24nKVxuICAgICAgICBvblJlc29sdmUgPSBpZFJlc29sdmVIYW5kbGVyO1xuICAgICAgaWYgKHR5cGVvZiBvblJlamVjdCAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgb25SZWplY3QgPSBpZFJlamVjdEhhbmRsZXI7XG4gICAgICB2YXIgdGhhdCA9IHRoaXM7XG4gICAgICB2YXIgY29uc3RydWN0b3IgPSB0aGlzLmNvbnN0cnVjdG9yO1xuICAgICAgcmV0dXJuIGNoYWluKHRoaXMsIGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgeCA9IHByb21pc2VDb2VyY2UoY29uc3RydWN0b3IsIHgpO1xuICAgICAgICByZXR1cm4geCA9PT0gdGhhdCA/IG9uUmVqZWN0KG5ldyBUeXBlRXJyb3IpIDogaXNQcm9taXNlKHgpID8geC50aGVuKG9uUmVzb2x2ZSwgb25SZWplY3QpIDogb25SZXNvbHZlKHgpO1xuICAgICAgfSwgb25SZWplY3QpO1xuICAgIH1cbiAgfSwge1xuICAgIHJlc29sdmU6IGZ1bmN0aW9uKHgpIHtcbiAgICAgIGlmICh0aGlzID09PSAkUHJvbWlzZSkge1xuICAgICAgICBpZiAoaXNQcm9taXNlKHgpKSB7XG4gICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHByb21pc2VTZXQobmV3ICRQcm9taXNlKHByb21pc2VSYXcpLCArMSwgeCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IHRoaXMoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgcmVzb2x2ZSh4KTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSxcbiAgICByZWplY3Q6IGZ1bmN0aW9uKHIpIHtcbiAgICAgIGlmICh0aGlzID09PSAkUHJvbWlzZSkge1xuICAgICAgICByZXR1cm4gcHJvbWlzZVNldChuZXcgJFByb21pc2UocHJvbWlzZVJhdyksIC0xLCByKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBuZXcgdGhpcygoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgcmVqZWN0KHIpO1xuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfSxcbiAgICBhbGw6IGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQodGhpcyk7XG4gICAgICB2YXIgcmVzb2x1dGlvbnMgPSBbXTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBjb3VudCA9IHZhbHVlcy5sZW5ndGg7XG4gICAgICAgIGlmIChjb3VudCA9PT0gMCkge1xuICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzb2x1dGlvbnMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB0aGlzLnJlc29sdmUodmFsdWVzW2ldKS50aGVuKGZ1bmN0aW9uKGksIHgpIHtcbiAgICAgICAgICAgICAgcmVzb2x1dGlvbnNbaV0gPSB4O1xuICAgICAgICAgICAgICBpZiAoLS1jb3VudCA9PT0gMClcbiAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc29sdXRpb25zKTtcbiAgICAgICAgICAgIH0uYmluZCh1bmRlZmluZWQsIGkpLCAoZnVuY3Rpb24ocikge1xuICAgICAgICAgICAgICBkZWZlcnJlZC5yZWplY3Qocik7XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH0sXG4gICAgcmFjZTogZnVuY3Rpb24odmFsdWVzKSB7XG4gICAgICB2YXIgZGVmZXJyZWQgPSBnZXREZWZlcnJlZCh0aGlzKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgdGhpcy5yZXNvbHZlKHZhbHVlc1tpXSkudGhlbigoZnVuY3Rpb24oeCkge1xuICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZSh4KTtcbiAgICAgICAgICB9KSwgKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyKTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgfVxuICB9KTtcbiAgdmFyICRQcm9taXNlID0gUHJvbWlzZTtcbiAgdmFyICRQcm9taXNlUmVqZWN0ID0gJFByb21pc2UucmVqZWN0O1xuICBmdW5jdGlvbiBwcm9taXNlUmVzb2x2ZShwcm9taXNlLCB4KSB7XG4gICAgcHJvbWlzZURvbmUocHJvbWlzZSwgKzEsIHgsIHByb21pc2Uub25SZXNvbHZlXyk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZVJlamVjdChwcm9taXNlLCByKSB7XG4gICAgcHJvbWlzZURvbmUocHJvbWlzZSwgLTEsIHIsIHByb21pc2Uub25SZWplY3RfKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlRG9uZShwcm9taXNlLCBzdGF0dXMsIHZhbHVlLCByZWFjdGlvbnMpIHtcbiAgICBpZiAocHJvbWlzZS5zdGF0dXNfICE9PSAwKVxuICAgICAgcmV0dXJuO1xuICAgIHByb21pc2VFbnF1ZXVlKHZhbHVlLCByZWFjdGlvbnMpO1xuICAgIHByb21pc2VTZXQocHJvbWlzZSwgc3RhdHVzLCB2YWx1ZSk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZUVucXVldWUodmFsdWUsIHRhc2tzKSB7XG4gICAgYXN5bmMoKGZ1bmN0aW9uKCkge1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0YXNrcy5sZW5ndGg7IGkgKz0gMikge1xuICAgICAgICBwcm9taXNlSGFuZGxlKHZhbHVlLCB0YXNrc1tpXSwgdGFza3NbaSArIDFdKTtcbiAgICAgIH1cbiAgICB9KSk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZUhhbmRsZSh2YWx1ZSwgaGFuZGxlciwgZGVmZXJyZWQpIHtcbiAgICB0cnkge1xuICAgICAgdmFyIHJlc3VsdCA9IGhhbmRsZXIodmFsdWUpO1xuICAgICAgaWYgKHJlc3VsdCA9PT0gZGVmZXJyZWQucHJvbWlzZSlcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcjtcbiAgICAgIGVsc2UgaWYgKGlzUHJvbWlzZShyZXN1bHQpKVxuICAgICAgICBjaGFpbihyZXN1bHQsIGRlZmVycmVkLnJlc29sdmUsIGRlZmVycmVkLnJlamVjdCk7XG4gICAgICBlbHNlXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzdWx0KTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB0cnkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSk7XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgfVxuICB2YXIgdGhlbmFibGVTeW1ib2wgPSAnQEB0aGVuYWJsZSc7XG4gIGZ1bmN0aW9uIGlzT2JqZWN0KHgpIHtcbiAgICByZXR1cm4geCAmJiAodHlwZW9mIHggPT09ICdvYmplY3QnIHx8IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKTtcbiAgfVxuICBmdW5jdGlvbiBwcm9taXNlQ29lcmNlKGNvbnN0cnVjdG9yLCB4KSB7XG4gICAgaWYgKCFpc1Byb21pc2UoeCkgJiYgaXNPYmplY3QoeCkpIHtcbiAgICAgIHZhciB0aGVuO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhlbiA9IHgudGhlbjtcbiAgICAgIH0gY2F0Y2ggKHIpIHtcbiAgICAgICAgdmFyIHByb21pc2UgPSAkUHJvbWlzZVJlamVjdC5jYWxsKGNvbnN0cnVjdG9yLCByKTtcbiAgICAgICAgeFt0aGVuYWJsZVN5bWJvbF0gPSBwcm9taXNlO1xuICAgICAgICByZXR1cm4gcHJvbWlzZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlb2YgdGhlbiA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICB2YXIgcCA9IHhbdGhlbmFibGVTeW1ib2xdO1xuICAgICAgICBpZiAocCkge1xuICAgICAgICAgIHJldHVybiBwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKGNvbnN0cnVjdG9yKTtcbiAgICAgICAgICB4W3RoZW5hYmxlU3ltYm9sXSA9IGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHRoZW4uY2FsbCh4LCBkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgICAgIH0gY2F0Y2ggKHIpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHg7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxQcm9taXNlKGdsb2JhbCkge1xuICAgIGlmICghZ2xvYmFsLlByb21pc2UpXG4gICAgICBnbG9iYWwuUHJvbWlzZSA9IFByb21pc2U7XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbFByb21pc2UpO1xuICByZXR1cm4ge1xuICAgIGdldCBQcm9taXNlKCkge1xuICAgICAgcmV0dXJuIFByb21pc2U7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxQcm9taXNlKCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsUHJvbWlzZTtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9Qcm9taXNlLmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdJdGVyYXRvci5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgJF9fMjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nSXRlcmF0b3IuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCA9ICRfXzAuY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QsXG4gICAgICBpc09iamVjdCA9ICRfXzAuaXNPYmplY3Q7XG4gIHZhciB0b1Byb3BlcnR5ID0gJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHk7XG4gIHZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG4gIHZhciBpdGVyYXRlZFN0cmluZyA9IFN5bWJvbCgnaXRlcmF0ZWRTdHJpbmcnKTtcbiAgdmFyIHN0cmluZ0l0ZXJhdG9yTmV4dEluZGV4ID0gU3ltYm9sKCdzdHJpbmdJdGVyYXRvck5leHRJbmRleCcpO1xuICB2YXIgU3RyaW5nSXRlcmF0b3IgPSBmdW5jdGlvbiBTdHJpbmdJdGVyYXRvcigpIHt9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShTdHJpbmdJdGVyYXRvciwgKCRfXzIgPSB7fSwgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRfXzIsIFwibmV4dFwiLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG8gPSB0aGlzO1xuICAgICAgaWYgKCFpc09iamVjdChvKSB8fCAhaGFzT3duUHJvcGVydHkuY2FsbChvLCBpdGVyYXRlZFN0cmluZykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigndGhpcyBtdXN0IGJlIGEgU3RyaW5nSXRlcmF0b3Igb2JqZWN0Jyk7XG4gICAgICB9XG4gICAgICB2YXIgcyA9IG9bdG9Qcm9wZXJ0eShpdGVyYXRlZFN0cmluZyldO1xuICAgICAgaWYgKHMgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QodW5kZWZpbmVkLCB0cnVlKTtcbiAgICAgIH1cbiAgICAgIHZhciBwb3NpdGlvbiA9IG9bdG9Qcm9wZXJ0eShzdHJpbmdJdGVyYXRvck5leHRJbmRleCldO1xuICAgICAgdmFyIGxlbiA9IHMubGVuZ3RoO1xuICAgICAgaWYgKHBvc2l0aW9uID49IGxlbikge1xuICAgICAgICBvW3RvUHJvcGVydHkoaXRlcmF0ZWRTdHJpbmcpXSA9IHVuZGVmaW5lZDtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICB2YXIgZmlyc3QgPSBzLmNoYXJDb2RlQXQocG9zaXRpb24pO1xuICAgICAgdmFyIHJlc3VsdFN0cmluZztcbiAgICAgIGlmIChmaXJzdCA8IDB4RDgwMCB8fCBmaXJzdCA+IDB4REJGRiB8fCBwb3NpdGlvbiArIDEgPT09IGxlbikge1xuICAgICAgICByZXN1bHRTdHJpbmcgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGZpcnN0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBzZWNvbmQgPSBzLmNoYXJDb2RlQXQocG9zaXRpb24gKyAxKTtcbiAgICAgICAgaWYgKHNlY29uZCA8IDB4REMwMCB8fCBzZWNvbmQgPiAweERGRkYpIHtcbiAgICAgICAgICByZXN1bHRTdHJpbmcgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGZpcnN0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHRTdHJpbmcgPSBTdHJpbmcuZnJvbUNoYXJDb2RlKGZpcnN0KSArIFN0cmluZy5mcm9tQ2hhckNvZGUoc2Vjb25kKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgb1t0b1Byb3BlcnR5KHN0cmluZ0l0ZXJhdG9yTmV4dEluZGV4KV0gPSBwb3NpdGlvbiArIHJlc3VsdFN0cmluZy5sZW5ndGg7XG4gICAgICByZXR1cm4gY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QocmVzdWx0U3RyaW5nLCBmYWxzZSk7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRfXzIsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWVcbiAgfSksICRfXzIpLCB7fSk7XG4gIGZ1bmN0aW9uIGNyZWF0ZVN0cmluZ0l0ZXJhdG9yKHN0cmluZykge1xuICAgIHZhciBzID0gU3RyaW5nKHN0cmluZyk7XG4gICAgdmFyIGl0ZXJhdG9yID0gT2JqZWN0LmNyZWF0ZShTdHJpbmdJdGVyYXRvci5wcm90b3R5cGUpO1xuICAgIGl0ZXJhdG9yW3RvUHJvcGVydHkoaXRlcmF0ZWRTdHJpbmcpXSA9IHM7XG4gICAgaXRlcmF0b3JbdG9Qcm9wZXJ0eShzdHJpbmdJdGVyYXRvck5leHRJbmRleCldID0gMDtcbiAgICByZXR1cm4gaXRlcmF0b3I7XG4gIH1cbiAgcmV0dXJuIHtnZXQgY3JlYXRlU3RyaW5nSXRlcmF0b3IoKSB7XG4gICAgICByZXR1cm4gY3JlYXRlU3RyaW5nSXRlcmF0b3I7XG4gICAgfX07XG59KTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZy5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmcuanNcIjtcbiAgdmFyIGNyZWF0ZVN0cmluZ0l0ZXJhdG9yID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZ0l0ZXJhdG9yLmpzXCIpLmNyZWF0ZVN0cmluZ0l0ZXJhdG9yO1xuICB2YXIgJF9fMSA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIG1heWJlQWRkRnVuY3Rpb25zID0gJF9fMS5tYXliZUFkZEZ1bmN0aW9ucyxcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IgPSAkX18xLm1heWJlQWRkSXRlcmF0b3IsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMS5yZWdpc3RlclBvbHlmaWxsO1xuICB2YXIgJHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcbiAgdmFyICRpbmRleE9mID0gU3RyaW5nLnByb3RvdHlwZS5pbmRleE9mO1xuICB2YXIgJGxhc3RJbmRleE9mID0gU3RyaW5nLnByb3RvdHlwZS5sYXN0SW5kZXhPZjtcbiAgZnVuY3Rpb24gc3RhcnRzV2l0aChzZWFyY2gpIHtcbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIGlmICh0aGlzID09IG51bGwgfHwgJHRvU3RyaW5nLmNhbGwoc2VhcmNoKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuICAgIHZhciBzZWFyY2hTdHJpbmcgPSBTdHJpbmcoc2VhcmNoKTtcbiAgICB2YXIgc2VhcmNoTGVuZ3RoID0gc2VhcmNoU3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgcG9zaXRpb24gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHVuZGVmaW5lZDtcbiAgICB2YXIgcG9zID0gcG9zaXRpb24gPyBOdW1iZXIocG9zaXRpb24pIDogMDtcbiAgICBpZiAoaXNOYU4ocG9zKSkge1xuICAgICAgcG9zID0gMDtcbiAgICB9XG4gICAgdmFyIHN0YXJ0ID0gTWF0aC5taW4oTWF0aC5tYXgocG9zLCAwKSwgc3RyaW5nTGVuZ3RoKTtcbiAgICByZXR1cm4gJGluZGV4T2YuY2FsbChzdHJpbmcsIHNlYXJjaFN0cmluZywgcG9zKSA9PSBzdGFydDtcbiAgfVxuICBmdW5jdGlvbiBlbmRzV2l0aChzZWFyY2gpIHtcbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIGlmICh0aGlzID09IG51bGwgfHwgJHRvU3RyaW5nLmNhbGwoc2VhcmNoKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuICAgIHZhciBzZWFyY2hTdHJpbmcgPSBTdHJpbmcoc2VhcmNoKTtcbiAgICB2YXIgc2VhcmNoTGVuZ3RoID0gc2VhcmNoU3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgcG9zID0gc3RyaW5nTGVuZ3RoO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgdmFyIHBvc2l0aW9uID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKHBvc2l0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcG9zID0gcG9zaXRpb24gPyBOdW1iZXIocG9zaXRpb24pIDogMDtcbiAgICAgICAgaWYgKGlzTmFOKHBvcykpIHtcbiAgICAgICAgICBwb3MgPSAwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHZhciBlbmQgPSBNYXRoLm1pbihNYXRoLm1heChwb3MsIDApLCBzdHJpbmdMZW5ndGgpO1xuICAgIHZhciBzdGFydCA9IGVuZCAtIHNlYXJjaExlbmd0aDtcbiAgICBpZiAoc3RhcnQgPCAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiAkbGFzdEluZGV4T2YuY2FsbChzdHJpbmcsIHNlYXJjaFN0cmluZywgc3RhcnQpID09IHN0YXJ0O1xuICB9XG4gIGZ1bmN0aW9uIGluY2x1ZGVzKHNlYXJjaCkge1xuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIGlmIChzZWFyY2ggJiYgJHRvU3RyaW5nLmNhbGwoc2VhcmNoKSA9PSAnW29iamVjdCBSZWdFeHBdJykge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmdMZW5ndGggPSBzdHJpbmcubGVuZ3RoO1xuICAgIHZhciBzZWFyY2hTdHJpbmcgPSBTdHJpbmcoc2VhcmNoKTtcbiAgICB2YXIgc2VhcmNoTGVuZ3RoID0gc2VhcmNoU3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgcG9zaXRpb24gPSBhcmd1bWVudHMubGVuZ3RoID4gMSA/IGFyZ3VtZW50c1sxXSA6IHVuZGVmaW5lZDtcbiAgICB2YXIgcG9zID0gcG9zaXRpb24gPyBOdW1iZXIocG9zaXRpb24pIDogMDtcbiAgICBpZiAocG9zICE9IHBvcykge1xuICAgICAgcG9zID0gMDtcbiAgICB9XG4gICAgdmFyIHN0YXJ0ID0gTWF0aC5taW4oTWF0aC5tYXgocG9zLCAwKSwgc3RyaW5nTGVuZ3RoKTtcbiAgICBpZiAoc2VhcmNoTGVuZ3RoICsgc3RhcnQgPiBzdHJpbmdMZW5ndGgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuICRpbmRleE9mLmNhbGwoc3RyaW5nLCBzZWFyY2hTdHJpbmcsIHBvcykgIT0gLTE7XG4gIH1cbiAgZnVuY3Rpb24gcmVwZWF0KGNvdW50KSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgdmFyIG4gPSBjb3VudCA/IE51bWJlcihjb3VudCkgOiAwO1xuICAgIGlmIChpc05hTihuKSkge1xuICAgICAgbiA9IDA7XG4gICAgfVxuICAgIGlmIChuIDwgMCB8fCBuID09IEluZmluaXR5KSB7XG4gICAgICB0aHJvdyBSYW5nZUVycm9yKCk7XG4gICAgfVxuICAgIGlmIChuID09IDApIHtcbiAgICAgIHJldHVybiAnJztcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9ICcnO1xuICAgIHdoaWxlIChuLS0pIHtcbiAgICAgIHJlc3VsdCArPSBzdHJpbmc7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cbiAgZnVuY3Rpb24gY29kZVBvaW50QXQocG9zaXRpb24pIHtcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICB2YXIgc2l6ZSA9IHN0cmluZy5sZW5ndGg7XG4gICAgdmFyIGluZGV4ID0gcG9zaXRpb24gPyBOdW1iZXIocG9zaXRpb24pIDogMDtcbiAgICBpZiAoaXNOYU4oaW5kZXgpKSB7XG4gICAgICBpbmRleCA9IDA7XG4gICAgfVxuICAgIGlmIChpbmRleCA8IDAgfHwgaW5kZXggPj0gc2l6ZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgdmFyIGZpcnN0ID0gc3RyaW5nLmNoYXJDb2RlQXQoaW5kZXgpO1xuICAgIHZhciBzZWNvbmQ7XG4gICAgaWYgKGZpcnN0ID49IDB4RDgwMCAmJiBmaXJzdCA8PSAweERCRkYgJiYgc2l6ZSA+IGluZGV4ICsgMSkge1xuICAgICAgc2Vjb25kID0gc3RyaW5nLmNoYXJDb2RlQXQoaW5kZXggKyAxKTtcbiAgICAgIGlmIChzZWNvbmQgPj0gMHhEQzAwICYmIHNlY29uZCA8PSAweERGRkYpIHtcbiAgICAgICAgcmV0dXJuIChmaXJzdCAtIDB4RDgwMCkgKiAweDQwMCArIHNlY29uZCAtIDB4REMwMCArIDB4MTAwMDA7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmaXJzdDtcbiAgfVxuICBmdW5jdGlvbiByYXcoY2FsbHNpdGUpIHtcbiAgICB2YXIgcmF3ID0gY2FsbHNpdGUucmF3O1xuICAgIHZhciBsZW4gPSByYXcubGVuZ3RoID4+PiAwO1xuICAgIGlmIChsZW4gPT09IDApXG4gICAgICByZXR1cm4gJyc7XG4gICAgdmFyIHMgPSAnJztcbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIHMgKz0gcmF3W2ldO1xuICAgICAgaWYgKGkgKyAxID09PSBsZW4pXG4gICAgICAgIHJldHVybiBzO1xuICAgICAgcyArPSBhcmd1bWVudHNbKytpXTtcbiAgICB9XG4gIH1cbiAgZnVuY3Rpb24gZnJvbUNvZGVQb2ludCgpIHtcbiAgICB2YXIgY29kZVVuaXRzID0gW107XG4gICAgdmFyIGZsb29yID0gTWF0aC5mbG9vcjtcbiAgICB2YXIgaGlnaFN1cnJvZ2F0ZTtcbiAgICB2YXIgbG93U3Vycm9nYXRlO1xuICAgIHZhciBpbmRleCA9IC0xO1xuICAgIHZhciBsZW5ndGggPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGlmICghbGVuZ3RoKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHdoaWxlICgrK2luZGV4IDwgbGVuZ3RoKSB7XG4gICAgICB2YXIgY29kZVBvaW50ID0gTnVtYmVyKGFyZ3VtZW50c1tpbmRleF0pO1xuICAgICAgaWYgKCFpc0Zpbml0ZShjb2RlUG9pbnQpIHx8IGNvZGVQb2ludCA8IDAgfHwgY29kZVBvaW50ID4gMHgxMEZGRkYgfHwgZmxvb3IoY29kZVBvaW50KSAhPSBjb2RlUG9pbnQpIHtcbiAgICAgICAgdGhyb3cgUmFuZ2VFcnJvcignSW52YWxpZCBjb2RlIHBvaW50OiAnICsgY29kZVBvaW50KTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlUG9pbnQgPD0gMHhGRkZGKSB7XG4gICAgICAgIGNvZGVVbml0cy5wdXNoKGNvZGVQb2ludCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb2RlUG9pbnQgLT0gMHgxMDAwMDtcbiAgICAgICAgaGlnaFN1cnJvZ2F0ZSA9IChjb2RlUG9pbnQgPj4gMTApICsgMHhEODAwO1xuICAgICAgICBsb3dTdXJyb2dhdGUgPSAoY29kZVBvaW50ICUgMHg0MDApICsgMHhEQzAwO1xuICAgICAgICBjb2RlVW5pdHMucHVzaChoaWdoU3Vycm9nYXRlLCBsb3dTdXJyb2dhdGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShudWxsLCBjb2RlVW5pdHMpO1xuICB9XG4gIGZ1bmN0aW9uIHN0cmluZ1Byb3RvdHlwZUl0ZXJhdG9yKCkge1xuICAgIHZhciBvID0gJHRyYWNldXJSdW50aW1lLmNoZWNrT2JqZWN0Q29lcmNpYmxlKHRoaXMpO1xuICAgIHZhciBzID0gU3RyaW5nKG8pO1xuICAgIHJldHVybiBjcmVhdGVTdHJpbmdJdGVyYXRvcihzKTtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbFN0cmluZyhnbG9iYWwpIHtcbiAgICB2YXIgU3RyaW5nID0gZ2xvYmFsLlN0cmluZztcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhTdHJpbmcucHJvdG90eXBlLCBbJ2NvZGVQb2ludEF0JywgY29kZVBvaW50QXQsICdlbmRzV2l0aCcsIGVuZHNXaXRoLCAnaW5jbHVkZXMnLCBpbmNsdWRlcywgJ3JlcGVhdCcsIHJlcGVhdCwgJ3N0YXJ0c1dpdGgnLCBzdGFydHNXaXRoXSk7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoU3RyaW5nLCBbJ2Zyb21Db2RlUG9pbnQnLCBmcm9tQ29kZVBvaW50LCAncmF3JywgcmF3XSk7XG4gICAgbWF5YmVBZGRJdGVyYXRvcihTdHJpbmcucHJvdG90eXBlLCBzdHJpbmdQcm90b3R5cGVJdGVyYXRvciwgU3ltYm9sKTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsU3RyaW5nKTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgc3RhcnRzV2l0aCgpIHtcbiAgICAgIHJldHVybiBzdGFydHNXaXRoO1xuICAgIH0sXG4gICAgZ2V0IGVuZHNXaXRoKCkge1xuICAgICAgcmV0dXJuIGVuZHNXaXRoO1xuICAgIH0sXG4gICAgZ2V0IGluY2x1ZGVzKCkge1xuICAgICAgcmV0dXJuIGluY2x1ZGVzO1xuICAgIH0sXG4gICAgZ2V0IHJlcGVhdCgpIHtcbiAgICAgIHJldHVybiByZXBlYXQ7XG4gICAgfSxcbiAgICBnZXQgY29kZVBvaW50QXQoKSB7XG4gICAgICByZXR1cm4gY29kZVBvaW50QXQ7XG4gICAgfSxcbiAgICBnZXQgcmF3KCkge1xuICAgICAgcmV0dXJuIHJhdztcbiAgICB9LFxuICAgIGdldCBmcm9tQ29kZVBvaW50KCkge1xuICAgICAgcmV0dXJuIGZyb21Db2RlUG9pbnQ7XG4gICAgfSxcbiAgICBnZXQgc3RyaW5nUHJvdG90eXBlSXRlcmF0b3IoKSB7XG4gICAgICByZXR1cm4gc3RyaW5nUHJvdG90eXBlSXRlcmF0b3I7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxTdHJpbmcoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxTdHJpbmc7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nLmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciAkX18yO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yLmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgdG9PYmplY3QgPSAkX18wLnRvT2JqZWN0LFxuICAgICAgdG9VaW50MzIgPSAkX18wLnRvVWludDMyLFxuICAgICAgY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QgPSAkX18wLmNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0O1xuICB2YXIgQVJSQVlfSVRFUkFUT1JfS0lORF9LRVlTID0gMTtcbiAgdmFyIEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTID0gMjtcbiAgdmFyIEFSUkFZX0lURVJBVE9SX0tJTkRfRU5UUklFUyA9IDM7XG4gIHZhciBBcnJheUl0ZXJhdG9yID0gZnVuY3Rpb24gQXJyYXlJdGVyYXRvcigpIHt9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShBcnJheUl0ZXJhdG9yLCAoJF9fMiA9IHt9LCBPYmplY3QuZGVmaW5lUHJvcGVydHkoJF9fMiwgXCJuZXh0XCIsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgaXRlcmF0b3IgPSB0b09iamVjdCh0aGlzKTtcbiAgICAgIHZhciBhcnJheSA9IGl0ZXJhdG9yLml0ZXJhdG9yT2JqZWN0XztcbiAgICAgIGlmICghYXJyYXkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0IGlzIG5vdCBhbiBBcnJheUl0ZXJhdG9yJyk7XG4gICAgICB9XG4gICAgICB2YXIgaW5kZXggPSBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XztcbiAgICAgIHZhciBpdGVtS2luZCA9IGl0ZXJhdG9yLmFycmF5SXRlcmF0aW9uS2luZF87XG4gICAgICB2YXIgbGVuZ3RoID0gdG9VaW50MzIoYXJyYXkubGVuZ3RoKTtcbiAgICAgIGlmIChpbmRleCA+PSBsZW5ndGgpIHtcbiAgICAgICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRvck5leHRJbmRleF8gPSBJbmZpbml0eTtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IGluZGV4ICsgMTtcbiAgICAgIGlmIChpdGVtS2luZCA9PSBBUlJBWV9JVEVSQVRPUl9LSU5EX1ZBTFVFUylcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KGFycmF5W2luZGV4XSwgZmFsc2UpO1xuICAgICAgaWYgKGl0ZW1LaW5kID09IEFSUkFZX0lURVJBVE9SX0tJTkRfRU5UUklFUylcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KFtpbmRleCwgYXJyYXlbaW5kZXhdXSwgZmFsc2UpO1xuICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KGluZGV4LCBmYWxzZSk7XG4gICAgfSxcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB3cml0YWJsZTogdHJ1ZVxuICB9KSwgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRfXzIsIFN5bWJvbC5pdGVyYXRvciwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWVcbiAgfSksICRfXzIpLCB7fSk7XG4gIGZ1bmN0aW9uIGNyZWF0ZUFycmF5SXRlcmF0b3IoYXJyYXksIGtpbmQpIHtcbiAgICB2YXIgb2JqZWN0ID0gdG9PYmplY3QoYXJyYXkpO1xuICAgIHZhciBpdGVyYXRvciA9IG5ldyBBcnJheUl0ZXJhdG9yO1xuICAgIGl0ZXJhdG9yLml0ZXJhdG9yT2JqZWN0XyA9IG9iamVjdDtcbiAgICBpdGVyYXRvci5hcnJheUl0ZXJhdG9yTmV4dEluZGV4XyA9IDA7XG4gICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRpb25LaW5kXyA9IGtpbmQ7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xuICB9XG4gIGZ1bmN0aW9uIGVudHJpZXMoKSB7XG4gICAgcmV0dXJuIGNyZWF0ZUFycmF5SXRlcmF0b3IodGhpcywgQVJSQVlfSVRFUkFUT1JfS0lORF9FTlRSSUVTKTtcbiAgfVxuICBmdW5jdGlvbiBrZXlzKCkge1xuICAgIHJldHVybiBjcmVhdGVBcnJheUl0ZXJhdG9yKHRoaXMsIEFSUkFZX0lURVJBVE9SX0tJTkRfS0VZUyk7XG4gIH1cbiAgZnVuY3Rpb24gdmFsdWVzKCkge1xuICAgIHJldHVybiBjcmVhdGVBcnJheUl0ZXJhdG9yKHRoaXMsIEFSUkFZX0lURVJBVE9SX0tJTkRfVkFMVUVTKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGdldCBlbnRyaWVzKCkge1xuICAgICAgcmV0dXJuIGVudHJpZXM7XG4gICAgfSxcbiAgICBnZXQga2V5cygpIHtcbiAgICAgIHJldHVybiBrZXlzO1xuICAgIH0sXG4gICAgZ2V0IHZhbHVlcygpIHtcbiAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheS5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheS5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9BcnJheUl0ZXJhdG9yLmpzXCIpLFxuICAgICAgZW50cmllcyA9ICRfXzAuZW50cmllcyxcbiAgICAgIGtleXMgPSAkX18wLmtleXMsXG4gICAgICB2YWx1ZXMgPSAkX18wLnZhbHVlcztcbiAgdmFyICRfXzEgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBjaGVja0l0ZXJhYmxlID0gJF9fMS5jaGVja0l0ZXJhYmxlLFxuICAgICAgaXNDYWxsYWJsZSA9ICRfXzEuaXNDYWxsYWJsZSxcbiAgICAgIGlzQ29uc3RydWN0b3IgPSAkX18xLmlzQ29uc3RydWN0b3IsXG4gICAgICBtYXliZUFkZEZ1bmN0aW9ucyA9ICRfXzEubWF5YmVBZGRGdW5jdGlvbnMsXG4gICAgICBtYXliZUFkZEl0ZXJhdG9yID0gJF9fMS5tYXliZUFkZEl0ZXJhdG9yLFxuICAgICAgcmVnaXN0ZXJQb2x5ZmlsbCA9ICRfXzEucmVnaXN0ZXJQb2x5ZmlsbCxcbiAgICAgIHRvSW50ZWdlciA9ICRfXzEudG9JbnRlZ2VyLFxuICAgICAgdG9MZW5ndGggPSAkX18xLnRvTGVuZ3RoLFxuICAgICAgdG9PYmplY3QgPSAkX18xLnRvT2JqZWN0O1xuICBmdW5jdGlvbiBmcm9tKGFyckxpa2UpIHtcbiAgICB2YXIgbWFwRm4gPSBhcmd1bWVudHNbMV07XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMl07XG4gICAgdmFyIEMgPSB0aGlzO1xuICAgIHZhciBpdGVtcyA9IHRvT2JqZWN0KGFyckxpa2UpO1xuICAgIHZhciBtYXBwaW5nID0gbWFwRm4gIT09IHVuZGVmaW5lZDtcbiAgICB2YXIgayA9IDA7XG4gICAgdmFyIGFycixcbiAgICAgICAgbGVuO1xuICAgIGlmIChtYXBwaW5nICYmICFpc0NhbGxhYmxlKG1hcEZuKSkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIGlmIChjaGVja0l0ZXJhYmxlKGl0ZW1zKSkge1xuICAgICAgYXJyID0gaXNDb25zdHJ1Y3RvcihDKSA/IG5ldyBDKCkgOiBbXTtcbiAgICAgIGZvciAodmFyICRfXzIgPSBpdGVtc1skdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShTeW1ib2wuaXRlcmF0b3IpXSgpLFxuICAgICAgICAgICRfXzM7ICEoJF9fMyA9ICRfXzIubmV4dCgpKS5kb25lOyApIHtcbiAgICAgICAgdmFyIGl0ZW0gPSAkX18zLnZhbHVlO1xuICAgICAgICB7XG4gICAgICAgICAgaWYgKG1hcHBpbmcpIHtcbiAgICAgICAgICAgIGFycltrXSA9IG1hcEZuLmNhbGwodGhpc0FyZywgaXRlbSwgayk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFycltrXSA9IGl0ZW07XG4gICAgICAgICAgfVxuICAgICAgICAgIGsrKztcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXJyLmxlbmd0aCA9IGs7XG4gICAgICByZXR1cm4gYXJyO1xuICAgIH1cbiAgICBsZW4gPSB0b0xlbmd0aChpdGVtcy5sZW5ndGgpO1xuICAgIGFyciA9IGlzQ29uc3RydWN0b3IoQykgPyBuZXcgQyhsZW4pIDogbmV3IEFycmF5KGxlbik7XG4gICAgZm9yICg7IGsgPCBsZW47IGsrKykge1xuICAgICAgaWYgKG1hcHBpbmcpIHtcbiAgICAgICAgYXJyW2tdID0gdHlwZW9mIHRoaXNBcmcgPT09ICd1bmRlZmluZWQnID8gbWFwRm4oaXRlbXNba10sIGspIDogbWFwRm4uY2FsbCh0aGlzQXJnLCBpdGVtc1trXSwgayk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhcnJba10gPSBpdGVtc1trXTtcbiAgICAgIH1cbiAgICB9XG4gICAgYXJyLmxlbmd0aCA9IGxlbjtcbiAgICByZXR1cm4gYXJyO1xuICB9XG4gIGZ1bmN0aW9uIG9mKCkge1xuICAgIGZvciAodmFyIGl0ZW1zID0gW10sXG4gICAgICAgICRfXzQgPSAwOyAkX180IDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fNCsrKVxuICAgICAgaXRlbXNbJF9fNF0gPSBhcmd1bWVudHNbJF9fNF07XG4gICAgdmFyIEMgPSB0aGlzO1xuICAgIHZhciBsZW4gPSBpdGVtcy5sZW5ndGg7XG4gICAgdmFyIGFyciA9IGlzQ29uc3RydWN0b3IoQykgPyBuZXcgQyhsZW4pIDogbmV3IEFycmF5KGxlbik7XG4gICAgZm9yICh2YXIgayA9IDA7IGsgPCBsZW47IGsrKykge1xuICAgICAgYXJyW2tdID0gaXRlbXNba107XG4gICAgfVxuICAgIGFyci5sZW5ndGggPSBsZW47XG4gICAgcmV0dXJuIGFycjtcbiAgfVxuICBmdW5jdGlvbiBmaWxsKHZhbHVlKSB7XG4gICAgdmFyIHN0YXJ0ID0gYXJndW1lbnRzWzFdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1sxXSA6IDA7XG4gICAgdmFyIGVuZCA9IGFyZ3VtZW50c1syXTtcbiAgICB2YXIgb2JqZWN0ID0gdG9PYmplY3QodGhpcyk7XG4gICAgdmFyIGxlbiA9IHRvTGVuZ3RoKG9iamVjdC5sZW5ndGgpO1xuICAgIHZhciBmaWxsU3RhcnQgPSB0b0ludGVnZXIoc3RhcnQpO1xuICAgIHZhciBmaWxsRW5kID0gZW5kICE9PSB1bmRlZmluZWQgPyB0b0ludGVnZXIoZW5kKSA6IGxlbjtcbiAgICBmaWxsU3RhcnQgPSBmaWxsU3RhcnQgPCAwID8gTWF0aC5tYXgobGVuICsgZmlsbFN0YXJ0LCAwKSA6IE1hdGgubWluKGZpbGxTdGFydCwgbGVuKTtcbiAgICBmaWxsRW5kID0gZmlsbEVuZCA8IDAgPyBNYXRoLm1heChsZW4gKyBmaWxsRW5kLCAwKSA6IE1hdGgubWluKGZpbGxFbmQsIGxlbik7XG4gICAgd2hpbGUgKGZpbGxTdGFydCA8IGZpbGxFbmQpIHtcbiAgICAgIG9iamVjdFtmaWxsU3RhcnRdID0gdmFsdWU7XG4gICAgICBmaWxsU3RhcnQrKztcbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBmaW5kKHByZWRpY2F0ZSkge1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgIHJldHVybiBmaW5kSGVscGVyKHRoaXMsIHByZWRpY2F0ZSwgdGhpc0FyZyk7XG4gIH1cbiAgZnVuY3Rpb24gZmluZEluZGV4KHByZWRpY2F0ZSkge1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuICAgIHJldHVybiBmaW5kSGVscGVyKHRoaXMsIHByZWRpY2F0ZSwgdGhpc0FyZywgdHJ1ZSk7XG4gIH1cbiAgZnVuY3Rpb24gZmluZEhlbHBlcihzZWxmLCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1syXTtcbiAgICB2YXIgcmV0dXJuSW5kZXggPSBhcmd1bWVudHNbM10gIT09ICh2b2lkIDApID8gYXJndW1lbnRzWzNdIDogZmFsc2U7XG4gICAgdmFyIG9iamVjdCA9IHRvT2JqZWN0KHNlbGYpO1xuICAgIHZhciBsZW4gPSB0b0xlbmd0aChvYmplY3QubGVuZ3RoKTtcbiAgICBpZiAoIWlzQ2FsbGFibGUocHJlZGljYXRlKSkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIHZhciB2YWx1ZSA9IG9iamVjdFtpXTtcbiAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCB2YWx1ZSwgaSwgb2JqZWN0KSkge1xuICAgICAgICByZXR1cm4gcmV0dXJuSW5kZXggPyBpIDogdmFsdWU7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXR1cm5JbmRleCA/IC0xIDogdW5kZWZpbmVkO1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsQXJyYXkoZ2xvYmFsKSB7XG4gICAgdmFyICRfXzUgPSBnbG9iYWwsXG4gICAgICAgIEFycmF5ID0gJF9fNS5BcnJheSxcbiAgICAgICAgT2JqZWN0ID0gJF9fNS5PYmplY3QsXG4gICAgICAgIFN5bWJvbCA9ICRfXzUuU3ltYm9sO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKEFycmF5LnByb3RvdHlwZSwgWydlbnRyaWVzJywgZW50cmllcywgJ2tleXMnLCBrZXlzLCAndmFsdWVzJywgdmFsdWVzLCAnZmlsbCcsIGZpbGwsICdmaW5kJywgZmluZCwgJ2ZpbmRJbmRleCcsIGZpbmRJbmRleF0pO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKEFycmF5LCBbJ2Zyb20nLCBmcm9tLCAnb2YnLCBvZl0pO1xuICAgIG1heWJlQWRkSXRlcmF0b3IoQXJyYXkucHJvdG90eXBlLCB2YWx1ZXMsIFN5bWJvbCk7XG4gICAgbWF5YmVBZGRJdGVyYXRvcihPYmplY3QuZ2V0UHJvdG90eXBlT2YoW10udmFsdWVzKCkpLCBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH0sIFN5bWJvbCk7XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbEFycmF5KTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgZnJvbSgpIHtcbiAgICAgIHJldHVybiBmcm9tO1xuICAgIH0sXG4gICAgZ2V0IG9mKCkge1xuICAgICAgcmV0dXJuIG9mO1xuICAgIH0sXG4gICAgZ2V0IGZpbGwoKSB7XG4gICAgICByZXR1cm4gZmlsbDtcbiAgICB9LFxuICAgIGdldCBmaW5kKCkge1xuICAgICAgcmV0dXJuIGZpbmQ7XG4gICAgfSxcbiAgICBnZXQgZmluZEluZGV4KCkge1xuICAgICAgcmV0dXJuIGZpbmRJbmRleDtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbEFycmF5KCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsQXJyYXk7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvQXJyYXkuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL09iamVjdC5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9PYmplY3QuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBtYXliZUFkZEZ1bmN0aW9ucyA9ICRfXzAubWF5YmVBZGRGdW5jdGlvbnMsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMC5yZWdpc3RlclBvbHlmaWxsO1xuICB2YXIgJF9fMSA9ICR0cmFjZXVyUnVudGltZSxcbiAgICAgIGRlZmluZVByb3BlcnR5ID0gJF9fMS5kZWZpbmVQcm9wZXJ0eSxcbiAgICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvciA9ICRfXzEuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxuICAgICAgZ2V0T3duUHJvcGVydHlOYW1lcyA9ICRfXzEuZ2V0T3duUHJvcGVydHlOYW1lcyxcbiAgICAgIGlzUHJpdmF0ZU5hbWUgPSAkX18xLmlzUHJpdmF0ZU5hbWUsXG4gICAgICBrZXlzID0gJF9fMS5rZXlzO1xuICBmdW5jdGlvbiBpcyhsZWZ0LCByaWdodCkge1xuICAgIGlmIChsZWZ0ID09PSByaWdodClcbiAgICAgIHJldHVybiBsZWZ0ICE9PSAwIHx8IDEgLyBsZWZ0ID09PSAxIC8gcmlnaHQ7XG4gICAgcmV0dXJuIGxlZnQgIT09IGxlZnQgJiYgcmlnaHQgIT09IHJpZ2h0O1xuICB9XG4gIGZ1bmN0aW9uIGFzc2lnbih0YXJnZXQpIHtcbiAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgIHZhciBwcm9wcyA9IHNvdXJjZSA9PSBudWxsID8gW10gOiBrZXlzKHNvdXJjZSk7XG4gICAgICB2YXIgcCxcbiAgICAgICAgICBsZW5ndGggPSBwcm9wcy5sZW5ndGg7XG4gICAgICBmb3IgKHAgPSAwOyBwIDwgbGVuZ3RoOyBwKyspIHtcbiAgICAgICAgdmFyIG5hbWUgPSBwcm9wc1twXTtcbiAgICAgICAgaWYgKGlzUHJpdmF0ZU5hbWUobmFtZSkpXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIHRhcmdldFtuYW1lXSA9IHNvdXJjZVtuYW1lXTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuICBmdW5jdGlvbiBtaXhpbih0YXJnZXQsIHNvdXJjZSkge1xuICAgIHZhciBwcm9wcyA9IGdldE93blByb3BlcnR5TmFtZXMoc291cmNlKTtcbiAgICB2YXIgcCxcbiAgICAgICAgZGVzY3JpcHRvcixcbiAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuICAgIGZvciAocCA9IDA7IHAgPCBsZW5ndGg7IHArKykge1xuICAgICAgdmFyIG5hbWUgPSBwcm9wc1twXTtcbiAgICAgIGlmIChpc1ByaXZhdGVOYW1lKG5hbWUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIGRlc2NyaXB0b3IgPSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc291cmNlLCBwcm9wc1twXSk7XG4gICAgICBkZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIHByb3BzW3BdLCBkZXNjcmlwdG9yKTtcbiAgICB9XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbE9iamVjdChnbG9iYWwpIHtcbiAgICB2YXIgT2JqZWN0ID0gZ2xvYmFsLk9iamVjdDtcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhPYmplY3QsIFsnYXNzaWduJywgYXNzaWduLCAnaXMnLCBpcywgJ21peGluJywgbWl4aW5dKTtcbiAgfVxuICByZWdpc3RlclBvbHlmaWxsKHBvbHlmaWxsT2JqZWN0KTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgaXMoKSB7XG4gICAgICByZXR1cm4gaXM7XG4gICAgfSxcbiAgICBnZXQgYXNzaWduKCkge1xuICAgICAgcmV0dXJuIGFzc2lnbjtcbiAgICB9LFxuICAgIGdldCBtaXhpbigpIHtcbiAgICAgIHJldHVybiBtaXhpbjtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbE9iamVjdCgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbE9iamVjdDtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9PYmplY3QuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL051bWJlci5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9OdW1iZXIuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBpc051bWJlciA9ICRfXzAuaXNOdW1iZXIsXG4gICAgICBtYXliZUFkZENvbnN0cyA9ICRfXzAubWF5YmVBZGRDb25zdHMsXG4gICAgICBtYXliZUFkZEZ1bmN0aW9ucyA9ICRfXzAubWF5YmVBZGRGdW5jdGlvbnMsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMC5yZWdpc3RlclBvbHlmaWxsLFxuICAgICAgdG9JbnRlZ2VyID0gJF9fMC50b0ludGVnZXI7XG4gIHZhciAkYWJzID0gTWF0aC5hYnM7XG4gIHZhciAkaXNGaW5pdGUgPSBpc0Zpbml0ZTtcbiAgdmFyICRpc05hTiA9IGlzTmFOO1xuICB2YXIgTUFYX1NBRkVfSU5URUdFUiA9IE1hdGgucG93KDIsIDUzKSAtIDE7XG4gIHZhciBNSU5fU0FGRV9JTlRFR0VSID0gLU1hdGgucG93KDIsIDUzKSArIDE7XG4gIHZhciBFUFNJTE9OID0gTWF0aC5wb3coMiwgLTUyKTtcbiAgZnVuY3Rpb24gTnVtYmVySXNGaW5pdGUobnVtYmVyKSB7XG4gICAgcmV0dXJuIGlzTnVtYmVyKG51bWJlcikgJiYgJGlzRmluaXRlKG51bWJlcik7XG4gIH1cbiAgO1xuICBmdW5jdGlvbiBpc0ludGVnZXIobnVtYmVyKSB7XG4gICAgcmV0dXJuIE51bWJlcklzRmluaXRlKG51bWJlcikgJiYgdG9JbnRlZ2VyKG51bWJlcikgPT09IG51bWJlcjtcbiAgfVxuICBmdW5jdGlvbiBOdW1iZXJJc05hTihudW1iZXIpIHtcbiAgICByZXR1cm4gaXNOdW1iZXIobnVtYmVyKSAmJiAkaXNOYU4obnVtYmVyKTtcbiAgfVxuICA7XG4gIGZ1bmN0aW9uIGlzU2FmZUludGVnZXIobnVtYmVyKSB7XG4gICAgaWYgKE51bWJlcklzRmluaXRlKG51bWJlcikpIHtcbiAgICAgIHZhciBpbnRlZ3JhbCA9IHRvSW50ZWdlcihudW1iZXIpO1xuICAgICAgaWYgKGludGVncmFsID09PSBudW1iZXIpXG4gICAgICAgIHJldHVybiAkYWJzKGludGVncmFsKSA8PSBNQVhfU0FGRV9JTlRFR0VSO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxOdW1iZXIoZ2xvYmFsKSB7XG4gICAgdmFyIE51bWJlciA9IGdsb2JhbC5OdW1iZXI7XG4gICAgbWF5YmVBZGRDb25zdHMoTnVtYmVyLCBbJ01BWF9TQUZFX0lOVEVHRVInLCBNQVhfU0FGRV9JTlRFR0VSLCAnTUlOX1NBRkVfSU5URUdFUicsIE1JTl9TQUZFX0lOVEVHRVIsICdFUFNJTE9OJywgRVBTSUxPTl0pO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKE51bWJlciwgWydpc0Zpbml0ZScsIE51bWJlcklzRmluaXRlLCAnaXNJbnRlZ2VyJywgaXNJbnRlZ2VyLCAnaXNOYU4nLCBOdW1iZXJJc05hTiwgJ2lzU2FmZUludGVnZXInLCBpc1NhZmVJbnRlZ2VyXSk7XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbE51bWJlcik7XG4gIHJldHVybiB7XG4gICAgZ2V0IE1BWF9TQUZFX0lOVEVHRVIoKSB7XG4gICAgICByZXR1cm4gTUFYX1NBRkVfSU5URUdFUjtcbiAgICB9LFxuICAgIGdldCBNSU5fU0FGRV9JTlRFR0VSKCkge1xuICAgICAgcmV0dXJuIE1JTl9TQUZFX0lOVEVHRVI7XG4gICAgfSxcbiAgICBnZXQgRVBTSUxPTigpIHtcbiAgICAgIHJldHVybiBFUFNJTE9OO1xuICAgIH0sXG4gICAgZ2V0IGlzRmluaXRlKCkge1xuICAgICAgcmV0dXJuIE51bWJlcklzRmluaXRlO1xuICAgIH0sXG4gICAgZ2V0IGlzSW50ZWdlcigpIHtcbiAgICAgIHJldHVybiBpc0ludGVnZXI7XG4gICAgfSxcbiAgICBnZXQgaXNOYU4oKSB7XG4gICAgICByZXR1cm4gTnVtYmVySXNOYU47XG4gICAgfSxcbiAgICBnZXQgaXNTYWZlSW50ZWdlcigpIHtcbiAgICAgIHJldHVybiBpc1NhZmVJbnRlZ2VyO1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsTnVtYmVyKCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsTnVtYmVyO1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL051bWJlci5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvcG9seWZpbGxzLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3BvbHlmaWxscy5qc1wiO1xuICB2YXIgcG9seWZpbGxBbGwgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIikucG9seWZpbGxBbGw7XG4gIHBvbHlmaWxsQWxsKFJlZmxlY3QuZ2xvYmFsKTtcbiAgdmFyIHNldHVwR2xvYmFscyA9ICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHM7XG4gICR0cmFjZXVyUnVudGltZS5zZXR1cEdsb2JhbHMgPSBmdW5jdGlvbihnbG9iYWwpIHtcbiAgICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgICBwb2x5ZmlsbEFsbChnbG9iYWwpO1xuICB9O1xuICByZXR1cm4ge307XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9wb2x5ZmlsbHMuanNcIiArICcnKTtcblxufSkuY2FsbCh0aGlzLHJlcXVpcmUoJ19wcm9jZXNzJyksdHlwZW9mIGdsb2JhbCAhPT0gXCJ1bmRlZmluZWRcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSBcInVuZGVmaW5lZFwiID8gc2VsZiA6IHR5cGVvZiB3aW5kb3cgIT09IFwidW5kZWZpbmVkXCIgPyB3aW5kb3cgOiB7fSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTkwY21GalpYVnlMMkpwYmk5MGNtRmpaWFZ5TFhKMWJuUnBiV1V1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWp0QlFVRkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJJaXdpWm1sc1pTSTZJbWRsYm1WeVlYUmxaQzVxY3lJc0luTnZkWEpqWlZKdmIzUWlPaUlpTENKemIzVnlZMlZ6UTI5dWRHVnVkQ0k2V3lJb1puVnVZM1JwYjI0b1oyeHZZbUZzS1NCN1hHNGdJQ2QxYzJVZ2MzUnlhV04wSnp0Y2JpQWdhV1lnS0dkc2IySmhiQzRrZEhKaFkyVjFjbEoxYm5ScGJXVXBJSHRjYmlBZ0lDQnlaWFIxY200N1hHNGdJSDFjYmlBZ2RtRnlJQ1JQWW1wbFkzUWdQU0JQWW1wbFkzUTdYRzRnSUhaaGNpQWtWSGx3WlVWeWNtOXlJRDBnVkhsd1pVVnljbTl5TzF4dUlDQjJZWElnSkdOeVpXRjBaU0E5SUNSUFltcGxZM1F1WTNKbFlYUmxPMXh1SUNCMllYSWdKR1JsWm1sdVpWQnliM0JsY25ScFpYTWdQU0FrVDJKcVpXTjBMbVJsWm1sdVpWQnliM0JsY25ScFpYTTdYRzRnSUhaaGNpQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrZ1BTQWtUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblI1TzF4dUlDQjJZWElnSkdaeVpXVjZaU0E5SUNSUFltcGxZM1F1Wm5KbFpYcGxPMXh1SUNCMllYSWdKR2RsZEU5M2JsQnliM0JsY25SNVJHVnpZM0pwY0hSdmNpQTlJQ1JQWW1wbFkzUXVaMlYwVDNkdVVISnZjR1Z5ZEhsRVpYTmpjbWx3ZEc5eU8xeHVJQ0IyWVhJZ0pHZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTWdQU0FrVDJKcVpXTjBMbWRsZEU5M2JsQnliM0JsY25SNVRtRnRaWE03WEc0Z0lIWmhjaUFrYTJWNWN5QTlJQ1JQWW1wbFkzUXVhMlY1Y3p0Y2JpQWdkbUZ5SUNSb1lYTlBkMjVRY205d1pYSjBlU0E5SUNSUFltcGxZM1F1Y0hKdmRHOTBlWEJsTG1oaGMwOTNibEJ5YjNCbGNuUjVPMXh1SUNCMllYSWdKSFJ2VTNSeWFXNW5JRDBnSkU5aWFtVmpkQzV3Y205MGIzUjVjR1V1ZEc5VGRISnBibWM3WEc0Z0lIWmhjaUFrY0hKbGRtVnVkRVY0ZEdWdWMybHZibk1nUFNCUFltcGxZM1F1Y0hKbGRtVnVkRVY0ZEdWdWMybHZibk03WEc0Z0lIWmhjaUFrYzJWaGJDQTlJRTlpYW1WamRDNXpaV0ZzTzF4dUlDQjJZWElnSkdselJYaDBaVzV6YVdKc1pTQTlJRTlpYW1WamRDNXBjMFY0ZEdWdWMybGliR1U3WEc0Z0lHWjFibU4wYVc5dUlHNXZia1Z1ZFcwb2RtRnNkV1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdlMXh1SUNBZ0lDQWdZMjl1Wm1sbmRYSmhZbXhsT2lCMGNuVmxMRnh1SUNBZ0lDQWdaVzUxYldWeVlXSnNaVG9nWm1Gc2MyVXNYRzRnSUNBZ0lDQjJZV3gxWlRvZ2RtRnNkV1VzWEc0Z0lDQWdJQ0IzY21sMFlXSnNaVG9nZEhKMVpWeHVJQ0FnSUgwN1hHNGdJSDFjYmlBZ2RtRnlJRzFsZEdodlpDQTlJRzV2YmtWdWRXMDdYRzRnSUhaaGNpQmpiM1Z1ZEdWeUlEMGdNRHRjYmlBZ1puVnVZM1JwYjI0Z2JtVjNWVzVwY1hWbFUzUnlhVzVuS0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUFuWDE4a0p5QXJJRTFoZEdndVpteHZiM0lvVFdGMGFDNXlZVzVrYjIwb0tTQXFJREZsT1NrZ0t5QW5KQ2NnS3lBcksyTnZkVzUwWlhJZ0t5QW5KRjlmSnp0Y2JpQWdmVnh1SUNCMllYSWdjM2x0WW05c1NXNTBaWEp1WVd4UWNtOXdaWEowZVNBOUlHNWxkMVZ1YVhGMVpWTjBjbWx1WnlncE8xeHVJQ0IyWVhJZ2MzbHRZbTlzUkdWelkzSnBjSFJwYjI1UWNtOXdaWEowZVNBOUlHNWxkMVZ1YVhGMVpWTjBjbWx1WnlncE8xeHVJQ0IyWVhJZ2MzbHRZbTlzUkdGMFlWQnliM0JsY25SNUlEMGdibVYzVlc1cGNYVmxVM1J5YVc1bktDazdYRzRnSUhaaGNpQnplVzFpYjJ4V1lXeDFaWE1nUFNBa1kzSmxZWFJsS0c1MWJHd3BPMXh1SUNCMllYSWdjSEpwZG1GMFpVNWhiV1Z6SUQwZ0pHTnlaV0YwWlNodWRXeHNLVHRjYmlBZ1puVnVZM1JwYjI0Z2FYTlFjbWwyWVhSbFRtRnRaU2h6S1NCN1hHNGdJQ0FnY21WMGRYSnVJSEJ5YVhaaGRHVk9ZVzFsYzF0elhUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQmpjbVZoZEdWUWNtbDJZWFJsVG1GdFpTZ3BJSHRjYmlBZ0lDQjJZWElnY3lBOUlHNWxkMVZ1YVhGMVpWTjBjbWx1WnlncE8xeHVJQ0FnSUhCeWFYWmhkR1ZPWVcxbGMxdHpYU0E5SUhSeWRXVTdYRzRnSUNBZ2NtVjBkWEp1SUhNN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2FYTlRhR2x0VTNsdFltOXNLSE41YldKdmJDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCMGVYQmxiMllnYzNsdFltOXNJRDA5UFNBbmIySnFaV04wSnlBbUppQnplVzFpYjJ3Z2FXNXpkR0Z1WTJWdlppQlRlVzFpYjJ4V1lXeDFaVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUIwZVhCbFQyWW9kaWtnZTF4dUlDQWdJR2xtSUNocGMxTm9hVzFUZVcxaWIyd29kaWtwWEc0Z0lDQWdJQ0J5WlhSMWNtNGdKM041YldKdmJDYzdYRzRnSUNBZ2NtVjBkWEp1SUhSNWNHVnZaaUIyTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUZONWJXSnZiQ2hrWlhOamNtbHdkR2x2YmlrZ2UxeHVJQ0FnSUhaaGNpQjJZV3gxWlNBOUlHNWxkeUJUZVcxaWIyeFdZV3gxWlNoa1pYTmpjbWx3ZEdsdmJpazdYRzRnSUNBZ2FXWWdLQ0VvZEdocGN5QnBibk4wWVc1alpXOW1JRk41YldKdmJDa3BYRzRnSUNBZ0lDQnlaWFIxY200Z2RtRnNkV1U3WEc0Z0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduVTNsdFltOXNJR05oYm01dmRDQmlaU0J1WlhkY1hDZGxaQ2NwTzF4dUlDQjlYRzRnSUNSa1pXWnBibVZRY205d1pYSjBlU2hUZVcxaWIyd3VjSEp2ZEc5MGVYQmxMQ0FuWTI5dWMzUnlkV04wYjNJbkxDQnViMjVGYm5WdEtGTjViV0p2YkNrcE8xeHVJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29VM2x0WW05c0xuQnliM1J2ZEhsd1pTd2dKM1J2VTNSeWFXNW5KeXdnYldWMGFHOWtLR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJSFpoY2lCemVXMWliMnhXWVd4MVpTQTlJSFJvYVhOYmMzbHRZbTlzUkdGMFlWQnliM0JsY25SNVhUdGNiaUFnSUNCcFppQW9JV2RsZEU5d2RHbHZiaWduYzNsdFltOXNjeWNwS1Z4dUlDQWdJQ0FnY21WMGRYSnVJSE41YldKdmJGWmhiSFZsVzNONWJXSnZiRWx1ZEdWeWJtRnNVSEp2Y0dWeWRIbGRPMXh1SUNBZ0lHbG1JQ2doYzNsdFltOXNWbUZzZFdVcFhHNGdJQ0FnSUNCMGFISnZkeUJVZVhCbFJYSnliM0lvSjBOdmJuWmxjbk5wYjI0Z1puSnZiU0J6ZVcxaWIyd2dkRzhnYzNSeWFXNW5KeWs3WEc0Z0lDQWdkbUZ5SUdSbGMyTWdQU0J6ZVcxaWIyeFdZV3gxWlZ0emVXMWliMnhFWlhOamNtbHdkR2x2YmxCeWIzQmxjblI1WFR0Y2JpQWdJQ0JwWmlBb1pHVnpZeUE5UFQwZ2RXNWtaV1pwYm1Wa0tWeHVJQ0FnSUNBZ1pHVnpZeUE5SUNjbk8xeHVJQ0FnSUhKbGRIVnliaUFuVTNsdFltOXNLQ2NnS3lCa1pYTmpJQ3NnSnlrbk8xeHVJQ0I5S1NrN1hHNGdJQ1JrWldacGJtVlFjbTl3WlhKMGVTaFRlVzFpYjJ3dWNISnZkRzkwZVhCbExDQW5kbUZzZFdWUFppY3NJRzFsZEdodlpDaG1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQjJZWElnYzNsdFltOXNWbUZzZFdVZ1BTQjBhR2x6VzNONWJXSnZiRVJoZEdGUWNtOXdaWEowZVYwN1hHNGdJQ0FnYVdZZ0tDRnplVzFpYjJ4V1lXeDFaU2xjYmlBZ0lDQWdJSFJvY205M0lGUjVjR1ZGY25KdmNpZ25RMjl1ZG1WeWMybHZiaUJtY205dElITjViV0p2YkNCMGJ5QnpkSEpwYm1jbktUdGNiaUFnSUNCcFppQW9JV2RsZEU5d2RHbHZiaWduYzNsdFltOXNjeWNwS1Z4dUlDQWdJQ0FnY21WMGRYSnVJSE41YldKdmJGWmhiSFZsVzNONWJXSnZiRWx1ZEdWeWJtRnNVSEp2Y0dWeWRIbGRPMXh1SUNBZ0lISmxkSFZ5YmlCemVXMWliMnhXWVd4MVpUdGNiaUFnZlNrcE8xeHVJQ0JtZFc1amRHbHZiaUJUZVcxaWIyeFdZV3gxWlNoa1pYTmpjbWx3ZEdsdmJpa2dlMXh1SUNBZ0lIWmhjaUJyWlhrZ1BTQnVaWGRWYm1seGRXVlRkSEpwYm1jb0tUdGNiaUFnSUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvZEdocGN5d2djM2x0WW05c1JHRjBZVkJ5YjNCbGNuUjVMQ0I3ZG1Gc2RXVTZJSFJvYVhOOUtUdGNiaUFnSUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvZEdocGN5d2djM2x0WW05c1NXNTBaWEp1WVd4UWNtOXdaWEowZVN3Z2UzWmhiSFZsT2lCclpYbDlLVHRjYmlBZ0lDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb2RHaHBjeXdnYzNsdFltOXNSR1Z6WTNKcGNIUnBiMjVRY205d1pYSjBlU3dnZTNaaGJIVmxPaUJrWlhOamNtbHdkR2x2Ym4wcE8xeHVJQ0FnSUdaeVpXVjZaU2gwYUdsektUdGNiaUFnSUNCemVXMWliMnhXWVd4MVpYTmJhMlY1WFNBOUlIUm9hWE03WEc0Z0lIMWNiaUFnSkdSbFptbHVaVkJ5YjNCbGNuUjVLRk41YldKdmJGWmhiSFZsTG5CeWIzUnZkSGx3WlN3Z0oyTnZibk4wY25WamRHOXlKeXdnYm05dVJXNTFiU2hUZVcxaWIyd3BLVHRjYmlBZ0pHUmxabWx1WlZCeWIzQmxjblI1S0ZONWJXSnZiRlpoYkhWbExuQnliM1J2ZEhsd1pTd2dKM1J2VTNSeWFXNW5KeXdnZTF4dUlDQWdJSFpoYkhWbE9pQlRlVzFpYjJ3dWNISnZkRzkwZVhCbExuUnZVM1J5YVc1bkxGeHVJQ0FnSUdWdWRXMWxjbUZpYkdVNklHWmhiSE5sWEc0Z0lIMHBPMXh1SUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvVTNsdFltOXNWbUZzZFdVdWNISnZkRzkwZVhCbExDQW5kbUZzZFdWUFppY3NJSHRjYmlBZ0lDQjJZV3gxWlRvZ1UzbHRZbTlzTG5CeWIzUnZkSGx3WlM1MllXeDFaVTltTEZ4dUlDQWdJR1Z1ZFcxbGNtRmliR1U2SUdaaGJITmxYRzRnSUgwcE8xeHVJQ0IyWVhJZ2FHRnphRkJ5YjNCbGNuUjVJRDBnWTNKbFlYUmxVSEpwZG1GMFpVNWhiV1VvS1R0Y2JpQWdkbUZ5SUdoaGMyaFFjbTl3WlhKMGVVUmxjMk55YVhCMGIzSWdQU0I3ZG1Gc2RXVTZJSFZ1WkdWbWFXNWxaSDA3WEc0Z0lIWmhjaUJvWVhOb1QySnFaV04wVUhKdmNHVnlkR2xsY3lBOUlIdGNiaUFnSUNCb1lYTm9PaUI3ZG1Gc2RXVTZJSFZ1WkdWbWFXNWxaSDBzWEc0Z0lDQWdjMlZzWmpvZ2UzWmhiSFZsT2lCMWJtUmxabWx1WldSOVhHNGdJSDA3WEc0Z0lIWmhjaUJvWVhOb1EyOTFiblJsY2lBOUlEQTdYRzRnSUdaMWJtTjBhVzl1SUdkbGRFOTNia2hoYzJoUFltcGxZM1FvYjJKcVpXTjBLU0I3WEc0Z0lDQWdkbUZ5SUdoaGMyaFBZbXBsWTNRZ1BTQnZZbXBsWTNSYmFHRnphRkJ5YjNCbGNuUjVYVHRjYmlBZ0lDQnBaaUFvYUdGemFFOWlhbVZqZENBbUppQm9ZWE5vVDJKcVpXTjBMbk5sYkdZZ1BUMDlJRzlpYW1WamRDbGNiaUFnSUNBZ0lISmxkSFZ5YmlCb1lYTm9UMkpxWldOME8xeHVJQ0FnSUdsbUlDZ2thWE5GZUhSbGJuTnBZbXhsS0c5aWFtVmpkQ2twSUh0Y2JpQWdJQ0FnSUdoaGMyaFBZbXBsWTNSUWNtOXdaWEowYVdWekxtaGhjMmd1ZG1Gc2RXVWdQU0JvWVhOb1EyOTFiblJsY2lzck8xeHVJQ0FnSUNBZ2FHRnphRTlpYW1WamRGQnliM0JsY25ScFpYTXVjMlZzWmk1MllXeDFaU0E5SUc5aWFtVmpkRHRjYmlBZ0lDQWdJR2hoYzJoUWNtOXdaWEowZVVSbGMyTnlhWEIwYjNJdWRtRnNkV1VnUFNBa1kzSmxZWFJsS0c1MWJHd3NJR2hoYzJoUFltcGxZM1JRY205d1pYSjBhV1Z6S1R0Y2JpQWdJQ0FnSUNSa1pXWnBibVZRY205d1pYSjBlU2h2WW1wbFkzUXNJR2hoYzJoUWNtOXdaWEowZVN3Z2FHRnphRkJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaWs3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdhR0Z6YUZCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2k1MllXeDFaVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUhWdVpHVm1hVzVsWkR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCbWNtVmxlbVVvYjJKcVpXTjBLU0I3WEc0Z0lDQWdaMlYwVDNkdVNHRnphRTlpYW1WamRDaHZZbXBsWTNRcE8xeHVJQ0FnSUhKbGRIVnliaUFrWm5KbFpYcGxMbUZ3Y0d4NUtIUm9hWE1zSUdGeVozVnRaVzUwY3lrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NISmxkbVZ1ZEVWNGRHVnVjMmx2Ym5Nb2IySnFaV04wS1NCN1hHNGdJQ0FnWjJWMFQzZHVTR0Z6YUU5aWFtVmpkQ2h2WW1wbFkzUXBPMXh1SUNBZ0lISmxkSFZ5YmlBa2NISmxkbVZ1ZEVWNGRHVnVjMmx2Ym5NdVlYQndiSGtvZEdocGN5d2dZWEpuZFcxbGJuUnpLVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ6WldGc0tHOWlhbVZqZENrZ2UxeHVJQ0FnSUdkbGRFOTNia2hoYzJoUFltcGxZM1FvYjJKcVpXTjBLVHRjYmlBZ0lDQnlaWFIxY200Z0pITmxZV3d1WVhCd2JIa29kR2hwY3l3Z1lYSm5kVzFsYm5SektUdGNiaUFnZlZ4dUlDQm1jbVZsZW1Vb1UzbHRZbTlzVm1Gc2RXVXVjSEp2ZEc5MGVYQmxLVHRjYmlBZ1puVnVZM1JwYjI0Z2FYTlRlVzFpYjJ4VGRISnBibWNvY3lrZ2UxeHVJQ0FnSUhKbGRIVnliaUJ6ZVcxaWIyeFdZV3gxWlhOYmMxMGdmSHdnY0hKcGRtRjBaVTVoYldWelczTmRPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJSFJ2VUhKdmNHVnlkSGtvYm1GdFpTa2dlMXh1SUNBZ0lHbG1JQ2hwYzFOb2FXMVRlVzFpYjJ3b2JtRnRaU2twWEc0Z0lDQWdJQ0J5WlhSMWNtNGdibUZ0WlZ0emVXMWliMnhKYm5SbGNtNWhiRkJ5YjNCbGNuUjVYVHRjYmlBZ0lDQnlaWFIxY200Z2JtRnRaVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ5WlcxdmRtVlRlVzFpYjJ4TFpYbHpLR0Z5Y21GNUtTQjdYRzRnSUNBZ2RtRnlJSEoySUQwZ1cxMDdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQmhjbkpoZVM1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdhV1lnS0NGcGMxTjViV0p2YkZOMGNtbHVaeWhoY25KaGVWdHBYU2twSUh0Y2JpQWdJQ0FnSUNBZ2NuWXVjSFZ6YUNoaGNuSmhlVnRwWFNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnlkanRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJuWlhSUGQyNVFjbTl3WlhKMGVVNWhiV1Z6S0c5aWFtVmpkQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQnlaVzF2ZG1WVGVXMWliMnhMWlhsektDUm5aWFJQZDI1UWNtOXdaWEowZVU1aGJXVnpLRzlpYW1WamRDa3BPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR3RsZVhNb2IySnFaV04wS1NCN1hHNGdJQ0FnY21WMGRYSnVJSEpsYlc5MlpWTjViV0p2YkV0bGVYTW9KR3RsZVhNb2IySnFaV04wS1NrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1oyVjBUM2R1VUhKdmNHVnlkSGxUZVcxaWIyeHpLRzlpYW1WamRDa2dlMXh1SUNBZ0lIWmhjaUJ5ZGlBOUlGdGRPMXh1SUNBZ0lIWmhjaUJ1WVcxbGN5QTlJQ1JuWlhSUGQyNVFjbTl3WlhKMGVVNWhiV1Z6S0c5aWFtVmpkQ2s3WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J1WVcxbGN5NXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnZG1GeUlITjViV0p2YkNBOUlITjViV0p2YkZaaGJIVmxjMXR1WVcxbGMxdHBYVjA3WEc0Z0lDQWdJQ0JwWmlBb2MzbHRZbTlzS1NCN1hHNGdJQ0FnSUNBZ0lISjJMbkIxYzJnb2MzbHRZbTlzS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlISjJPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR2RsZEU5M2JsQnliM0JsY25SNVJHVnpZM0pwY0hSdmNpaHZZbXBsWTNRc0lHNWhiV1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdKR2RsZEU5M2JsQnliM0JsY25SNVJHVnpZM0pwY0hSdmNpaHZZbXBsWTNRc0lIUnZVSEp2Y0dWeWRIa29ibUZ0WlNrcE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHaGhjMDkzYmxCeWIzQmxjblI1S0c1aGJXVXBJSHRjYmlBZ0lDQnlaWFIxY200Z0pHaGhjMDkzYmxCeWIzQmxjblI1TG1OaGJHd29kR2hwY3l3Z2RHOVFjbTl3WlhKMGVTaHVZVzFsS1NrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1oyVjBUM0IwYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdaMnh2WW1Gc0xuUnlZV05sZFhJZ0ppWWdaMnh2WW1Gc0xuUnlZV05sZFhJdWIzQjBhVzl1YzF0dVlXMWxYVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJrWldacGJtVlFjbTl3WlhKMGVTaHZZbXBsWTNRc0lHNWhiV1VzSUdSbGMyTnlhWEIwYjNJcElIdGNiaUFnSUNCcFppQW9hWE5UYUdsdFUzbHRZbTlzS0c1aGJXVXBLU0I3WEc0Z0lDQWdJQ0J1WVcxbElEMGdibUZ0WlZ0emVXMWliMnhKYm5SbGNtNWhiRkJ5YjNCbGNuUjVYVHRjYmlBZ0lDQjlYRzRnSUNBZ0pHUmxabWx1WlZCeWIzQmxjblI1S0c5aWFtVmpkQ3dnYm1GdFpTd2daR1Z6WTNKcGNIUnZjaWs3WEc0Z0lDQWdjbVYwZFhKdUlHOWlhbVZqZER0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCd2IyeDVabWxzYkU5aWFtVmpkQ2hQWW1wbFkzUXBJSHRjYmlBZ0lDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb1QySnFaV04wTENBblpHVm1hVzVsVUhKdmNHVnlkSGtuTENCN2RtRnNkV1U2SUdSbFptbHVaVkJ5YjNCbGNuUjVmU2s3WEc0Z0lDQWdKR1JsWm1sdVpWQnliM0JsY25SNUtFOWlhbVZqZEN3Z0oyZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTW5MQ0I3ZG1Gc2RXVTZJR2RsZEU5M2JsQnliM0JsY25SNVRtRnRaWE45S1R0Y2JpQWdJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29UMkpxWldOMExDQW5aMlYwVDNkdVVISnZjR1Z5ZEhsRVpYTmpjbWx3ZEc5eUp5d2dlM1poYkhWbE9pQm5aWFJQZDI1UWNtOXdaWEowZVVSbGMyTnlhWEIwYjNKOUtUdGNiaUFnSUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvVDJKcVpXTjBMbkJ5YjNSdmRIbHdaU3dnSjJoaGMwOTNibEJ5YjNCbGNuUjVKeXdnZTNaaGJIVmxPaUJvWVhOUGQyNVFjbTl3WlhKMGVYMHBPMXh1SUNBZ0lDUmtaV1pwYm1WUWNtOXdaWEowZVNoUFltcGxZM1FzSUNkbWNtVmxlbVVuTENCN2RtRnNkV1U2SUdaeVpXVjZaWDBwTzF4dUlDQWdJQ1JrWldacGJtVlFjbTl3WlhKMGVTaFBZbXBsWTNRc0lDZHdjbVYyWlc1MFJYaDBaVzV6YVc5dWN5Y3NJSHQyWVd4MVpUb2djSEpsZG1WdWRFVjRkR1Z1YzJsdmJuTjlLVHRjYmlBZ0lDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb1QySnFaV04wTENBbmMyVmhiQ2NzSUh0MllXeDFaVG9nYzJWaGJIMHBPMXh1SUNBZ0lDUmtaV1pwYm1WUWNtOXdaWEowZVNoUFltcGxZM1FzSUNkclpYbHpKeXdnZTNaaGJIVmxPaUJyWlhsemZTazdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdaWGh3YjNKMFUzUmhjaWh2WW1wbFkzUXBJSHRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTVRzZ2FTQThJR0Z5WjNWdFpXNTBjeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ2RtRnlJRzVoYldWeklEMGdKR2RsZEU5M2JsQnliM0JsY25SNVRtRnRaWE1vWVhKbmRXMWxiblJ6VzJsZEtUdGNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHb2dQU0F3T3lCcUlEd2dibUZ0WlhNdWJHVnVaM1JvT3lCcUt5c3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHNWhiV1VnUFNCdVlXMWxjMXRxWFR0Y2JpQWdJQ0FnSUNBZ2FXWWdLR2x6VTNsdFltOXNVM1J5YVc1bktHNWhiV1VwS1Z4dUlDQWdJQ0FnSUNBZ0lHTnZiblJwYm5WbE8xeHVJQ0FnSUNBZ0lDQW9ablZ1WTNScGIyNG9iVzlrTENCdVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0pHUmxabWx1WlZCeWIzQmxjblI1S0c5aWFtVmpkQ3dnYm1GdFpTd2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1oyVjBPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJRzF2WkZ0dVlXMWxYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHNYRzRnSUNBZ0lDQWdJQ0FnSUNCbGJuVnRaWEpoWW14bE9pQjBjblZsWEc0Z0lDQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQWdJSDBwS0dGeVozVnRaVzUwYzF0cFhTd2dibUZ0WlhOYmFsMHBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnYjJKcVpXTjBPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR2x6VDJKcVpXTjBLSGdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdlQ0FoUFNCdWRXeHNJQ1ltSUNoMGVYQmxiMllnZUNBOVBUMGdKMjlpYW1WamRDY2dmSHdnZEhsd1pXOW1JSGdnUFQwOUlDZG1kVzVqZEdsdmJpY3BPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJSFJ2VDJKcVpXTjBLSGdwSUh0Y2JpQWdJQ0JwWmlBb2VDQTlQU0J1ZFd4c0tWeHVJQ0FnSUNBZ2RHaHliM2NnSkZSNWNHVkZjbkp2Y2lncE8xeHVJQ0FnSUhKbGRIVnliaUFrVDJKcVpXTjBLSGdwTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdOb1pXTnJUMkpxWldOMFEyOWxjbU5wWW14bEtHRnlaM1Z0Wlc1MEtTQjdYRzRnSUNBZ2FXWWdLR0Z5WjNWdFpXNTBJRDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0lvSjFaaGJIVmxJR05oYm01dmRDQmlaU0JqYjI1MlpYSjBaV1FnZEc4Z1lXNGdUMkpxWldOMEp5azdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJoY21kMWJXVnVkRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ3YjJ4NVptbHNiRk41YldKdmJDaG5iRzlpWVd3c0lGTjViV0p2YkNrZ2UxeHVJQ0FnSUdsbUlDZ2haMnh2WW1Gc0xsTjViV0p2YkNrZ2UxeHVJQ0FnSUNBZ1oyeHZZbUZzTGxONWJXSnZiQ0E5SUZONWJXSnZiRHRjYmlBZ0lDQWdJRTlpYW1WamRDNW5aWFJQZDI1UWNtOXdaWEowZVZONWJXSnZiSE1nUFNCblpYUlBkMjVRY205d1pYSjBlVk41YldKdmJITTdYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDZ2haMnh2WW1Gc0xsTjViV0p2YkM1cGRHVnlZWFJ2Y2lrZ2UxeHVJQ0FnSUNBZ1oyeHZZbUZzTGxONWJXSnZiQzVwZEdWeVlYUnZjaUE5SUZONWJXSnZiQ2duVTNsdFltOXNMbWwwWlhKaGRHOXlKeWs3WEc0Z0lDQWdmVnh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJSE5sZEhWd1IyeHZZbUZzY3lobmJHOWlZV3dwSUh0Y2JpQWdJQ0J3YjJ4NVptbHNiRk41YldKdmJDaG5iRzlpWVd3c0lGTjViV0p2YkNrN1hHNGdJQ0FnWjJ4dlltRnNMbEpsWm14bFkzUWdQU0JuYkc5aVlXd3VVbVZtYkdWamRDQjhmQ0I3ZlR0Y2JpQWdJQ0JuYkc5aVlXd3VVbVZtYkdWamRDNW5iRzlpWVd3Z1BTQm5iRzlpWVd3dVVtVm1iR1ZqZEM1bmJHOWlZV3dnZkh3Z1oyeHZZbUZzTzF4dUlDQWdJSEJ2YkhsbWFXeHNUMkpxWldOMEtHZHNiMkpoYkM1UFltcGxZM1FwTzF4dUlDQjlYRzRnSUhObGRIVndSMnh2WW1Gc2N5aG5iRzlpWVd3cE8xeHVJQ0JuYkc5aVlXd3VKSFJ5WVdObGRYSlNkVzUwYVcxbElEMGdlMXh1SUNBZ0lHTm9aV05yVDJKcVpXTjBRMjlsY21OcFlteGxPaUJqYUdWamEwOWlhbVZqZEVOdlpYSmphV0pzWlN4Y2JpQWdJQ0JqY21WaGRHVlFjbWwyWVhSbFRtRnRaVG9nWTNKbFlYUmxVSEpwZG1GMFpVNWhiV1VzWEc0Z0lDQWdaR1ZtYVc1bFVISnZjR1Z5ZEdsbGN6b2dKR1JsWm1sdVpWQnliM0JsY25ScFpYTXNYRzRnSUNBZ1pHVm1hVzVsVUhKdmNHVnlkSGs2SUNSa1pXWnBibVZRY205d1pYSjBlU3hjYmlBZ0lDQmxlSEJ2Y25SVGRHRnlPaUJsZUhCdmNuUlRkR0Z5TEZ4dUlDQWdJR2RsZEU5M2JraGhjMmhQWW1wbFkzUTZJR2RsZEU5M2JraGhjMmhQWW1wbFkzUXNYRzRnSUNBZ1oyVjBUM2R1VUhKdmNHVnlkSGxFWlhOamNtbHdkRzl5T2lBa1oyVjBUM2R1VUhKdmNHVnlkSGxFWlhOamNtbHdkRzl5TEZ4dUlDQWdJR2RsZEU5M2JsQnliM0JsY25SNVRtRnRaWE02SUNSblpYUlBkMjVRY205d1pYSjBlVTVoYldWekxGeHVJQ0FnSUdselQySnFaV04wT2lCcGMwOWlhbVZqZEN4Y2JpQWdJQ0JwYzFCeWFYWmhkR1ZPWVcxbE9pQnBjMUJ5YVhaaGRHVk9ZVzFsTEZ4dUlDQWdJR2x6VTNsdFltOXNVM1J5YVc1bk9pQnBjMU41YldKdmJGTjBjbWx1Wnl4Y2JpQWdJQ0JyWlhsek9pQWthMlY1Y3l4Y2JpQWdJQ0J6WlhSMWNFZHNiMkpoYkhNNklITmxkSFZ3UjJ4dlltRnNjeXhjYmlBZ0lDQjBiMDlpYW1WamREb2dkRzlQWW1wbFkzUXNYRzRnSUNBZ2RHOVFjbTl3WlhKMGVUb2dkRzlRY205d1pYSjBlU3hjYmlBZ0lDQjBlWEJsYjJZNklIUjVjR1ZQWmx4dUlDQjlPMXh1ZlNrb2RIbHdaVzltSUhkcGJtUnZkeUFoUFQwZ0ozVnVaR1ZtYVc1bFpDY2dQeUIzYVc1a2IzY2dPaUIwZVhCbGIyWWdaMnh2WW1Gc0lDRTlQU0FuZFc1a1pXWnBibVZrSnlBL0lHZHNiMkpoYkNBNklIUjVjR1Z2WmlCelpXeG1JQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5QS9JSE5sYkdZZ09pQjBhR2x6S1R0Y2JpaG1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0ozVnpaU0J6ZEhKcFkzUW5PMXh1SUNCMllYSWdjR0YwYUR0Y2JpQWdablZ1WTNScGIyNGdjbVZzWVhScGRtVlNaWEYxYVhKbEtHTmhiR3hsY2xCaGRHZ3NJSEpsY1hWcGNtVmtVR0YwYUNrZ2UxeHVJQ0FnSUhCaGRHZ2dQU0J3WVhSb0lIeDhJSFI1Y0dWdlppQnlaWEYxYVhKbElDRTlQU0FuZFc1a1pXWnBibVZrSnlBbUppQnlaWEYxYVhKbEtDZHdZWFJvSnlrN1hHNGdJQ0FnWm5WdVkzUnBiMjRnYVhORWFYSmxZM1J2Y25rb2NHRjBhQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSEJoZEdndWMyeHBZMlVvTFRFcElEMDlQU0FuTHljN1hHNGdJQ0FnZlZ4dUlDQWdJR1oxYm1OMGFXOXVJR2x6UVdKemIyeDFkR1VvY0dGMGFDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIQmhkR2hiTUYwZ1BUMDlJQ2N2Snp0Y2JpQWdJQ0I5WEc0Z0lDQWdablZ1WTNScGIyNGdhWE5TWld4aGRHbDJaU2h3WVhSb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2NHRjBhRnN3WFNBOVBUMGdKeTRuTzF4dUlDQWdJSDFjYmlBZ0lDQnBaaUFvYVhORWFYSmxZM1J2Y25rb2NtVnhkV2x5WldSUVlYUm9LU0I4ZkNCcGMwRmljMjlzZFhSbEtISmxjWFZwY21Wa1VHRjBhQ2twWEc0Z0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ2NtVjBkWEp1SUdselVtVnNZWFJwZG1Vb2NtVnhkV2x5WldSUVlYUm9LU0EvSUhKbGNYVnBjbVVvY0dGMGFDNXlaWE52YkhabEtIQmhkR2d1WkdseWJtRnRaU2hqWVd4c1pYSlFZWFJvS1N3Z2NtVnhkV2x5WldSUVlYUm9LU2tnT2lCeVpYRjFhWEpsS0hKbGNYVnBjbVZrVUdGMGFDazdYRzRnSUgxY2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExuSmxjWFZwY21VZ1BTQnlaV3hoZEdsMlpWSmxjWFZwY21VN1hHNTlLU2dwTzF4dUtHWjFibU4wYVc5dUtDa2dlMXh1SUNBbmRYTmxJSE4wY21samRDYzdYRzRnSUdaMWJtTjBhVzl1SUhOd2NtVmhaQ2dwSUh0Y2JpQWdJQ0IyWVhJZ2NuWWdQU0JiWFN4Y2JpQWdJQ0FnSUNBZ2FpQTlJREFzWEc0Z0lDQWdJQ0FnSUdsMFpYSlNaWE4xYkhRN1hHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvT3lCcEt5c3BJSHRjYmlBZ0lDQWdJSFpoY2lCMllXeDFaVlJ2VTNCeVpXRmtJRDBnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU5vWldOclQySnFaV04wUTI5bGNtTnBZbXhsS0dGeVozVnRaVzUwYzF0cFhTazdYRzRnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JSFpoYkhWbFZHOVRjSEpsWVdSYkpIUnlZV05sZFhKU2RXNTBhVzFsTG5SdlVISnZjR1Z5ZEhrb1UzbHRZbTlzTG1sMFpYSmhkRzl5S1YwZ0lUMDlJQ2RtZFc1amRHbHZiaWNwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25RMkZ1Ym05MElITndjbVZoWkNCdWIyNHRhWFJsY21GaWJHVWdiMkpxWldOMExpY3BPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdkbUZ5SUdsMFpYSWdQU0IyWVd4MVpWUnZVM0J5WldGa1d5UjBjbUZqWlhWeVVuVnVkR2x0WlM1MGIxQnliM0JsY25SNUtGTjViV0p2YkM1cGRHVnlZWFJ2Y2lsZEtDazdYRzRnSUNBZ0lDQjNhR2xzWlNBb0lTaHBkR1Z5VW1WemRXeDBJRDBnYVhSbGNpNXVaWGgwS0NrcExtUnZibVVwSUh0Y2JpQWdJQ0FnSUNBZ2NuWmJhaXNyWFNBOUlHbDBaWEpTWlhOMWJIUXVkbUZzZFdVN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnlkanRjYmlBZ2ZWeHVJQ0FrZEhKaFkyVjFjbEoxYm5ScGJXVXVjM0J5WldGa0lEMGdjM0J5WldGa08xeHVmU2tvS1R0Y2JpaG1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0ozVnpaU0J6ZEhKcFkzUW5PMXh1SUNCMllYSWdKRTlpYW1WamRDQTlJRTlpYW1WamREdGNiaUFnZG1GeUlDUlVlWEJsUlhKeWIzSWdQU0JVZVhCbFJYSnliM0k3WEc0Z0lIWmhjaUFrWTNKbFlYUmxJRDBnSkU5aWFtVmpkQzVqY21WaGRHVTdYRzRnSUhaaGNpQWtaR1ZtYVc1bFVISnZjR1Z5ZEdsbGN5QTlJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWtaV1pwYm1WUWNtOXdaWEowYVdWek8xeHVJQ0IyWVhJZ0pHUmxabWx1WlZCeWIzQmxjblI1SUQwZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1SbFptbHVaVkJ5YjNCbGNuUjVPMXh1SUNCMllYSWdKR2RsZEU5M2JsQnliM0JsY25SNVJHVnpZM0pwY0hSdmNpQTlJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNW5aWFJQZDI1UWNtOXdaWEowZVVSbGMyTnlhWEIwYjNJN1hHNGdJSFpoY2lBa1oyVjBUM2R1VUhKdmNHVnlkSGxPWVcxbGN5QTlJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNW5aWFJQZDI1UWNtOXdaWEowZVU1aGJXVnpPMXh1SUNCMllYSWdKR2RsZEZCeWIzUnZkSGx3WlU5bUlEMGdUMkpxWldOMExtZGxkRkJ5YjNSdmRIbHdaVTltTzF4dUlDQjJZWElnSkY5Zk1DQTlJRTlpYW1WamRDeGNiaUFnSUNBZ0lHZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTWdQU0FrWDE4d0xtZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTXNYRzRnSUNBZ0lDQm5aWFJQZDI1UWNtOXdaWEowZVZONWJXSnZiSE1nUFNBa1gxOHdMbWRsZEU5M2JsQnliM0JsY25SNVUzbHRZbTlzY3p0Y2JpQWdablZ1WTNScGIyNGdjM1Z3WlhKRVpYTmpjbWx3ZEc5eUtHaHZiV1ZQWW1wbFkzUXNJRzVoYldVcElIdGNiaUFnSUNCMllYSWdjSEp2ZEc4Z1BTQWtaMlYwVUhKdmRHOTBlWEJsVDJZb2FHOXRaVTlpYW1WamRDazdYRzRnSUNBZ1pHOGdlMXh1SUNBZ0lDQWdkbUZ5SUhKbGMzVnNkQ0E5SUNSblpYUlBkMjVRY205d1pYSjBlVVJsYzJOeWFYQjBiM0lvY0hKdmRHOHNJRzVoYldVcE8xeHVJQ0FnSUNBZ2FXWWdLSEpsYzNWc2RDbGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlISmxjM1ZzZER0Y2JpQWdJQ0FnSUhCeWIzUnZJRDBnSkdkbGRGQnliM1J2ZEhsd1pVOW1LSEJ5YjNSdktUdGNiaUFnSUNCOUlIZG9hV3hsSUNod2NtOTBieWs3WEc0Z0lDQWdjbVYwZFhKdUlIVnVaR1ZtYVc1bFpEdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnpkWEJsY2tOdmJuTjBjblZqZEc5eUtHTjBiM0lwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdZM1J2Y2k1ZlgzQnliM1J2WDE4N1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2MzVndaWEpEWVd4c0tITmxiR1lzSUdodmJXVlBZbXBsWTNRc0lHNWhiV1VzSUdGeVozTXBJSHRjYmlBZ0lDQnlaWFIxY200Z2MzVndaWEpIWlhRb2MyVnNaaXdnYUc5dFpVOWlhbVZqZEN3Z2JtRnRaU2t1WVhCd2JIa29jMlZzWml3Z1lYSm5jeWs3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnYzNWd1pYSkhaWFFvYzJWc1ppd2dhRzl0WlU5aWFtVmpkQ3dnYm1GdFpTa2dlMXh1SUNBZ0lIWmhjaUJrWlhOamNtbHdkRzl5SUQwZ2MzVndaWEpFWlhOamNtbHdkRzl5S0dodmJXVlBZbXBsWTNRc0lHNWhiV1VwTzF4dUlDQWdJR2xtSUNoa1pYTmpjbWx3ZEc5eUtTQjdYRzRnSUNBZ0lDQnBaaUFvSVdSbGMyTnlhWEIwYjNJdVoyVjBLVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdaR1Z6WTNKcGNIUnZjaTUyWVd4MVpUdGNiaUFnSUNBZ0lISmxkSFZ5YmlCa1pYTmpjbWx3ZEc5eUxtZGxkQzVqWVd4c0tITmxiR1lwTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2RXNWtaV1pwYm1Wa08xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlITjFjR1Z5VTJWMEtITmxiR1lzSUdodmJXVlBZbXBsWTNRc0lHNWhiV1VzSUhaaGJIVmxLU0I3WEc0Z0lDQWdkbUZ5SUdSbGMyTnlhWEIwYjNJZ1BTQnpkWEJsY2tSbGMyTnlhWEIwYjNJb2FHOXRaVTlpYW1WamRDd2dibUZ0WlNrN1hHNGdJQ0FnYVdZZ0tHUmxjMk55YVhCMGIzSWdKaVlnWkdWelkzSnBjSFJ2Y2k1elpYUXBJSHRjYmlBZ0lDQWdJR1JsYzJOeWFYQjBiM0l1YzJWMExtTmhiR3dvYzJWc1ppd2dkbUZzZFdVcE8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUhaaGJIVmxPMXh1SUNBZ0lIMWNiaUFnSUNCMGFISnZkeUFrVkhsd1pVVnljbTl5S0NoY0luTjFjR1Z5SUdoaGN5QnVieUJ6WlhSMFpYSWdKMXdpSUNzZ2JtRnRaU0FySUZ3aUp5NWNJaWtwTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdkbGRFUmxjMk55YVhCMGIzSnpLRzlpYW1WamRDa2dlMXh1SUNBZ0lIWmhjaUJrWlhOamNtbHdkRzl5Y3lBOUlIdDlPMXh1SUNBZ0lIWmhjaUJ1WVcxbGN5QTlJR2RsZEU5M2JsQnliM0JsY25SNVRtRnRaWE1vYjJKcVpXTjBLVHRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJRzVoYldWekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2JtRnRaU0E5SUc1aGJXVnpXMmxkTzF4dUlDQWdJQ0FnWkdWelkzSnBjSFJ2Y25OYmJtRnRaVjBnUFNBa1oyVjBUM2R1VUhKdmNHVnlkSGxFWlhOamNtbHdkRzl5S0c5aWFtVmpkQ3dnYm1GdFpTazdYRzRnSUNBZ2ZWeHVJQ0FnSUhaaGNpQnplVzFpYjJ4eklEMGdaMlYwVDNkdVVISnZjR1Z5ZEhsVGVXMWliMnh6S0c5aWFtVmpkQ2s3WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0J6ZVcxaWIyeHpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNCMllYSWdjM2x0WW05c0lEMGdjM2x0WW05c2MxdHBYVHRjYmlBZ0lDQWdJR1JsYzJOeWFYQjBiM0p6V3lSMGNtRmpaWFZ5VW5WdWRHbHRaUzUwYjFCeWIzQmxjblI1S0hONWJXSnZiQ2xkSUQwZ0pHZGxkRTkzYmxCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2lodlltcGxZM1FzSUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzUwYjFCeWIzQmxjblI1S0hONWJXSnZiQ2twTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1pHVnpZM0pwY0hSdmNuTTdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdZM0psWVhSbFEyeGhjM01vWTNSdmNpd2diMkpxWldOMExDQnpkR0YwYVdOUFltcGxZM1FzSUhOMWNHVnlRMnhoYzNNcElIdGNiaUFnSUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvYjJKcVpXTjBMQ0FuWTI5dWMzUnlkV04wYjNJbkxDQjdYRzRnSUNBZ0lDQjJZV3gxWlRvZ1kzUnZjaXhjYmlBZ0lDQWdJR052Ym1acFozVnlZV0pzWlRvZ2RISjFaU3hjYmlBZ0lDQWdJR1Z1ZFcxbGNtRmliR1U2SUdaaGJITmxMRnh1SUNBZ0lDQWdkM0pwZEdGaWJHVTZJSFJ5ZFdWY2JpQWdJQ0I5S1R0Y2JpQWdJQ0JwWmlBb1lYSm5kVzFsYm5SekxteGxibWQwYUNBK0lETXBJSHRjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnYzNWd1pYSkRiR0Z6Y3lBOVBUMGdKMloxYm1OMGFXOXVKeWxjYmlBZ0lDQWdJQ0FnWTNSdmNpNWZYM0J5YjNSdlgxOGdQU0J6ZFhCbGNrTnNZWE56TzF4dUlDQWdJQ0FnWTNSdmNpNXdjbTkwYjNSNWNHVWdQU0FrWTNKbFlYUmxLR2RsZEZCeWIzUnZVR0Z5Wlc1MEtITjFjR1Z5UTJ4aGMzTXBMQ0JuWlhSRVpYTmpjbWx3ZEc5eWN5aHZZbXBsWTNRcEtUdGNiaUFnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnWTNSdmNpNXdjbTkwYjNSNWNHVWdQU0J2WW1wbFkzUTdYRzRnSUNBZ2ZWeHVJQ0FnSUNSa1pXWnBibVZRY205d1pYSjBlU2hqZEc5eUxDQW5jSEp2ZEc5MGVYQmxKeXdnZTF4dUlDQWdJQ0FnWTI5dVptbG5kWEpoWW14bE9pQm1ZV3h6WlN4Y2JpQWdJQ0FnSUhkeWFYUmhZbXhsT2lCbVlXeHpaVnh1SUNBZ0lIMHBPMXh1SUNBZ0lISmxkSFZ5YmlBa1pHVm1hVzVsVUhKdmNHVnlkR2xsY3loamRHOXlMQ0JuWlhSRVpYTmpjbWx3ZEc5eWN5aHpkR0YwYVdOUFltcGxZM1FwS1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCblpYUlFjbTkwYjFCaGNtVnVkQ2h6ZFhCbGNrTnNZWE56S1NCN1hHNGdJQ0FnYVdZZ0tIUjVjR1Z2WmlCemRYQmxja05zWVhOeklEMDlQU0FuWm5WdVkzUnBiMjRuS1NCN1hHNGdJQ0FnSUNCMllYSWdjSEp2ZEc5MGVYQmxJRDBnYzNWd1pYSkRiR0Z6Y3k1d2NtOTBiM1I1Y0dVN1hHNGdJQ0FnSUNCcFppQW9KRTlpYW1WamRDaHdjbTkwYjNSNWNHVXBJRDA5UFNCd2NtOTBiM1I1Y0dVZ2ZId2djSEp2ZEc5MGVYQmxJRDA5UFNCdWRXeHNLVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjM1Z3WlhKRGJHRnpjeTV3Y205MGIzUjVjR1U3WEc0Z0lDQWdJQ0IwYUhKdmR5QnVaWGNnSkZSNWNHVkZjbkp2Y2lnbmMzVndaWElnY0hKdmRHOTBlWEJsSUcxMWMzUWdZbVVnWVc0Z1QySnFaV04wSUc5eUlHNTFiR3duS1R0Y2JpQWdJQ0I5WEc0Z0lDQWdhV1lnS0hOMWNHVnlRMnhoYzNNZ1BUMDlJRzUxYkd3cFhHNGdJQ0FnSUNCeVpYUjFjbTRnYm5Wc2JEdGNiaUFnSUNCMGFISnZkeUJ1WlhjZ0pGUjVjR1ZGY25KdmNpZ29YQ0pUZFhCbGNpQmxlSEJ5WlhOemFXOXVJRzExYzNRZ1pXbDBhR1Z5SUdKbElHNTFiR3dnYjNJZ1lTQm1kVzVqZEdsdmJpd2dibTkwSUZ3aUlDc2dkSGx3Wlc5bUlITjFjR1Z5UTJ4aGMzTWdLeUJjSWk1Y0lpa3BPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR1JsWm1GMWJIUlRkWEJsY2tOaGJHd29jMlZzWml3Z2FHOXRaVTlpYW1WamRDd2dZWEpuY3lrZ2UxeHVJQ0FnSUdsbUlDZ2taMlYwVUhKdmRHOTBlWEJsVDJZb2FHOXRaVTlpYW1WamRDa2dJVDA5SUc1MWJHd3BYRzRnSUNBZ0lDQnpkWEJsY2tOaGJHd29jMlZzWml3Z2FHOXRaVTlpYW1WamRDd2dKMk52Ym5OMGNuVmpkRzl5Snl3Z1lYSm5jeWs3WEc0Z0lIMWNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU55WldGMFpVTnNZWE56SUQwZ1kzSmxZWFJsUTJ4aGMzTTdYRzRnSUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVrWldaaGRXeDBVM1Z3WlhKRFlXeHNJRDBnWkdWbVlYVnNkRk4xY0dWeVEyRnNiRHRjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG5OMWNHVnlRMkZzYkNBOUlITjFjR1Z5UTJGc2JEdGNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbk4xY0dWeVEyOXVjM1J5ZFdOMGIzSWdQU0J6ZFhCbGNrTnZibk4wY25WamRHOXlPMXh1SUNBa2RISmhZMlYxY2xKMWJuUnBiV1V1YzNWd1pYSkhaWFFnUFNCemRYQmxja2RsZER0Y2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExuTjFjR1Z5VTJWMElEMGdjM1Z3WlhKVFpYUTdYRzU5S1NncE8xeHVLR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc0Z0lHbG1JQ2gwZVhCbGIyWWdKSFJ5WVdObGRYSlNkVzUwYVcxbElDRTlQU0FuYjJKcVpXTjBKeWtnZTF4dUlDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25kSEpoWTJWMWNpQnlkVzUwYVcxbElHNXZkQ0JtYjNWdVpDNG5LVHRjYmlBZ2ZWeHVJQ0IyWVhJZ1kzSmxZWFJsVUhKcGRtRjBaVTVoYldVZ1BTQWtkSEpoWTJWMWNsSjFiblJwYldVdVkzSmxZWFJsVUhKcGRtRjBaVTVoYldVN1hHNGdJSFpoY2lBa1pHVm1hVzVsVUhKdmNHVnlkR2xsY3lBOUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1a1pXWnBibVZRY205d1pYSjBhV1Z6TzF4dUlDQjJZWElnSkdSbFptbHVaVkJ5YjNCbGNuUjVJRDBnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbVJsWm1sdVpWQnliM0JsY25SNU8xeHVJQ0IyWVhJZ0pHTnlaV0YwWlNBOUlFOWlhbVZqZEM1amNtVmhkR1U3WEc0Z0lIWmhjaUFrVkhsd1pVVnljbTl5SUQwZ1ZIbHdaVVZ5Y205eU8xeHVJQ0JtZFc1amRHbHZiaUJ1YjI1RmJuVnRLSFpoYkhWbEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUh0Y2JpQWdJQ0FnSUdOdmJtWnBaM1Z5WVdKc1pUb2dkSEoxWlN4Y2JpQWdJQ0FnSUdWdWRXMWxjbUZpYkdVNklHWmhiSE5sTEZ4dUlDQWdJQ0FnZG1Gc2RXVTZJSFpoYkhWbExGeHVJQ0FnSUNBZ2QzSnBkR0ZpYkdVNklIUnlkV1ZjYmlBZ0lDQjlPMXh1SUNCOVhHNGdJSFpoY2lCVFZGOU9SVmRDVDFKT0lEMGdNRHRjYmlBZ2RtRnlJRk5VWDBWWVJVTlZWRWxPUnlBOUlERTdYRzRnSUhaaGNpQlRWRjlUVlZOUVJVNUVSVVFnUFNBeU8xeHVJQ0IyWVhJZ1UxUmZRMHhQVTBWRUlEMGdNenRjYmlBZ2RtRnlJRVZPUkY5VFZFRlVSU0E5SUMweU8xeHVJQ0IyWVhJZ1VrVlVTRkpQVjE5VFZFRlVSU0E5SUMwek8xeHVJQ0JtZFc1amRHbHZiaUJuWlhSSmJuUmxjbTVoYkVWeWNtOXlLSE4wWVhSbEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUc1bGR5QkZjbkp2Y2lnblZISmhZMlYxY2lCamIyMXdhV3hsY2lCaWRXYzZJR2x1ZG1Gc2FXUWdjM1JoZEdVZ2FXNGdjM1JoZEdVZ2JXRmphR2x1WlRvZ0p5QXJJSE4wWVhSbEtUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQkhaVzVsY21GMGIzSkRiMjUwWlhoMEtDa2dlMXh1SUNBZ0lIUm9hWE11YzNSaGRHVWdQU0F3TzF4dUlDQWdJSFJvYVhNdVIxTjBZWFJsSUQwZ1UxUmZUa1ZYUWs5U1RqdGNiaUFnSUNCMGFHbHpMbk4wYjNKbFpFVjRZMlZ3ZEdsdmJpQTlJSFZ1WkdWbWFXNWxaRHRjYmlBZ0lDQjBhR2x6TG1acGJtRnNiSGxHWVd4c1ZHaHliM1ZuYUNBOUlIVnVaR1ZtYVc1bFpEdGNiaUFnSUNCMGFHbHpMbk5sYm5SZklEMGdkVzVrWldacGJtVmtPMXh1SUNBZ0lIUm9hWE11Y21WMGRYSnVWbUZzZFdVZ1BTQjFibVJsWm1sdVpXUTdYRzRnSUNBZ2RHaHBjeTUwY25sVGRHRmphMThnUFNCYlhUdGNiaUFnZlZ4dUlDQkhaVzVsY21GMGIzSkRiMjUwWlhoMExuQnliM1J2ZEhsd1pTQTlJSHRjYmlBZ0lDQndkWE5vVkhKNU9pQm1kVzVqZEdsdmJpaGpZWFJqYUZOMFlYUmxMQ0JtYVc1aGJHeDVVM1JoZEdVcElIdGNiaUFnSUNBZ0lHbG1JQ2htYVc1aGJHeDVVM1JoZEdVZ0lUMDlJRzUxYkd3cElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUdacGJtRnNiSGxHWVd4c1ZHaHliM1ZuYUNBOUlHNTFiR3c3WEc0Z0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQjBhR2x6TG5SeWVWTjBZV05yWHk1c1pXNW5kR2dnTFNBeE95QnBJRDQ5SURBN0lHa3RMU2tnZTF4dUlDQWdJQ0FnSUNBZ0lHbG1JQ2gwYUdsekxuUnllVk4wWVdOclgxdHBYUzVqWVhSamFDQWhQVDBnZFc1a1pXWnBibVZrS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JtYVc1aGJHeDVSbUZzYkZSb2NtOTFaMmdnUFNCMGFHbHpMblJ5ZVZOMFlXTnJYMXRwWFM1allYUmphRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0JwWmlBb1ptbHVZV3hzZVVaaGJHeFVhSEp2ZFdkb0lEMDlQU0J1ZFd4c0tWeHVJQ0FnSUNBZ0lDQWdJR1pwYm1Gc2JIbEdZV3hzVkdoeWIzVm5hQ0E5SUZKRlZFaFNUMWRmVTFSQlZFVTdYRzRnSUNBZ0lDQWdJSFJvYVhNdWRISjVVM1JoWTJ0ZkxuQjFjMmdvZTF4dUlDQWdJQ0FnSUNBZ0lHWnBibUZzYkhrNklHWnBibUZzYkhsVGRHRjBaU3hjYmlBZ0lDQWdJQ0FnSUNCbWFXNWhiR3g1Um1Gc2JGUm9jbTkxWjJnNklHWnBibUZzYkhsR1lXeHNWR2h5YjNWbmFGeHVJQ0FnSUNBZ0lDQjlLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoallYUmphRk4wWVhSbElDRTlQU0J1ZFd4c0tTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdWRISjVVM1JoWTJ0ZkxuQjFjMmdvZTJOaGRHTm9PaUJqWVhSamFGTjBZWFJsZlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JpQWdJQ0J3YjNCVWNuazZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnZEdocGN5NTBjbmxUZEdGamExOHVjRzl3S0NrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2MyVnVkQ2dwSUh0Y2JpQWdJQ0FnSUhSb2FYTXViV0Y1WW1WVWFISnZkeWdwTzF4dUlDQWdJQ0FnY21WMGRYSnVJSFJvYVhNdWMyVnVkRjg3WEc0Z0lDQWdmU3hjYmlBZ0lDQnpaWFFnYzJWdWRDaDJLU0I3WEc0Z0lDQWdJQ0IwYUdsekxuTmxiblJmSUQwZ2RqdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQnpaVzUwU1dkdWIzSmxWR2h5YjNjb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTV6Wlc1MFh6dGNiaUFnSUNCOUxGeHVJQ0FnSUcxaGVXSmxWR2h5YjNjNklHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdhV1lnS0hSb2FYTXVZV04wYVc5dUlEMDlQU0FuZEdoeWIzY25LU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVZV04wYVc5dUlEMGdKMjVsZUhRbk8xeHVJQ0FnSUNBZ0lDQjBhSEp2ZHlCMGFHbHpMbk5sYm5SZk8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNGdJQ0FnWlc1a09pQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSE4zYVhSamFDQW9kR2hwY3k1emRHRjBaU2tnZTF4dUlDQWdJQ0FnSUNCallYTmxJRVZPUkY5VFZFRlVSVHBjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnZEdocGN6dGNiaUFnSUNBZ0lDQWdZMkZ6WlNCU1JWUklVazlYWDFOVVFWUkZPbHh1SUNBZ0lDQWdJQ0FnSUhSb2NtOTNJSFJvYVhNdWMzUnZjbVZrUlhoalpYQjBhVzl1TzF4dUlDQWdJQ0FnSUNCa1pXWmhkV3gwT2x4dUlDQWdJQ0FnSUNBZ0lIUm9jbTkzSUdkbGRFbHVkR1Z5Ym1Gc1JYSnliM0lvZEdocGN5NXpkR0YwWlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlN4Y2JpQWdJQ0JvWVc1a2JHVkZlR05sY0hScGIyNDZJR1oxYm1OMGFXOXVLR1Y0S1NCN1hHNGdJQ0FnSUNCMGFHbHpMa2RUZEdGMFpTQTlJRk5VWDBOTVQxTkZSRHRjYmlBZ0lDQWdJSFJvYVhNdWMzUmhkR1VnUFNCRlRrUmZVMVJCVkVVN1hHNGdJQ0FnSUNCMGFISnZkeUJsZUR0Y2JpQWdJQ0I5WEc0Z0lIMDdYRzRnSUdaMWJtTjBhVzl1SUc1bGVIUlBjbFJvY205M0tHTjBlQ3dnYlc5MlpVNWxlSFFzSUdGamRHbHZiaXdnZUNrZ2UxeHVJQ0FnSUhOM2FYUmphQ0FvWTNSNExrZFRkR0YwWlNrZ2UxeHVJQ0FnSUNBZ1kyRnpaU0JUVkY5RldFVkRWVlJKVGtjNlhHNGdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnb1hDSmNYRndpWENJZ0t5QmhZM1JwYjI0Z0t5QmNJbHhjWENJZ2IyNGdaWGhsWTNWMGFXNW5JR2RsYm1WeVlYUnZjbHdpS1NrN1hHNGdJQ0FnSUNCallYTmxJRk5VWDBOTVQxTkZSRHBjYmlBZ0lDQWdJQ0FnYVdZZ0tHRmpkR2x2YmlBOVBTQW5ibVY0ZENjcElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdlMXh1SUNBZ0lDQWdJQ0FnSUNBZ2RtRnNkV1U2SUhWdVpHVm1hVzVsWkN4Y2JpQWdJQ0FnSUNBZ0lDQWdJR1J2Ym1VNklIUnlkV1ZjYmlBZ0lDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSFJvY205M0lIZzdYRzRnSUNBZ0lDQmpZWE5sSUZOVVgwNUZWMEpQVWs0NlhHNGdJQ0FnSUNBZ0lHbG1JQ2hoWTNScGIyNGdQVDA5SUNkMGFISnZkeWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQmpkSGd1UjFOMFlYUmxJRDBnVTFSZlEweFBVMFZFTzF4dUlDQWdJQ0FnSUNBZ0lIUm9jbTkzSUhnN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdhV1lnS0hnZ0lUMDlJSFZ1WkdWbWFXNWxaQ2xjYmlBZ0lDQWdJQ0FnSUNCMGFISnZkeUFrVkhsd1pVVnljbTl5S0NkVFpXNTBJSFpoYkhWbElIUnZJRzVsZDJKdmNtNGdaMlZ1WlhKaGRHOXlKeWs3WEc0Z0lDQWdJQ0JqWVhObElGTlVYMU5WVTFCRlRrUkZSRHBjYmlBZ0lDQWdJQ0FnWTNSNExrZFRkR0YwWlNBOUlGTlVYMFZZUlVOVlZFbE9SenRjYmlBZ0lDQWdJQ0FnWTNSNExtRmpkR2x2YmlBOUlHRmpkR2x2Ymp0Y2JpQWdJQ0FnSUNBZ1kzUjRMbk5sYm5RZ1BTQjRPMXh1SUNBZ0lDQWdJQ0IyWVhJZ2RtRnNkV1VnUFNCdGIzWmxUbVY0ZENoamRIZ3BPMXh1SUNBZ0lDQWdJQ0IyWVhJZ1pHOXVaU0E5SUhaaGJIVmxJRDA5UFNCamRIZzdYRzRnSUNBZ0lDQWdJR2xtSUNoa2IyNWxLVnh1SUNBZ0lDQWdJQ0FnSUhaaGJIVmxJRDBnWTNSNExuSmxkSFZ5YmxaaGJIVmxPMXh1SUNBZ0lDQWdJQ0JqZEhndVIxTjBZWFJsSUQwZ1pHOXVaU0EvSUZOVVgwTk1UMU5GUkNBNklGTlVYMU5WVTFCRlRrUkZSRHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSHRjYmlBZ0lDQWdJQ0FnSUNCMllXeDFaVG9nZG1Gc2RXVXNYRzRnSUNBZ0lDQWdJQ0FnWkc5dVpUb2daRzl1WlZ4dUlDQWdJQ0FnSUNCOU8xeHVJQ0FnSUgxY2JpQWdmVnh1SUNCMllYSWdZM1I0VG1GdFpTQTlJR055WldGMFpWQnlhWFpoZEdWT1lXMWxLQ2s3WEc0Z0lIWmhjaUJ0YjNabFRtVjRkRTVoYldVZ1BTQmpjbVZoZEdWUWNtbDJZWFJsVG1GdFpTZ3BPMXh1SUNCbWRXNWpkR2x2YmlCSFpXNWxjbUYwYjNKR2RXNWpkR2x2YmlncElIdDlYRzRnSUdaMWJtTjBhVzl1SUVkbGJtVnlZWFJ2Y2taMWJtTjBhVzl1VUhKdmRHOTBlWEJsS0NrZ2UzMWNiaUFnUjJWdVpYSmhkRzl5Um5WdVkzUnBiMjR1Y0hKdmRHOTBlWEJsSUQwZ1IyVnVaWEpoZEc5eVJuVnVZM1JwYjI1UWNtOTBiM1I1Y0dVN1hHNGdJQ1JrWldacGJtVlFjbTl3WlhKMGVTaEhaVzVsY21GMGIzSkdkVzVqZEdsdmJsQnliM1J2ZEhsd1pTd2dKMk52Ym5OMGNuVmpkRzl5Snl3Z2JtOXVSVzUxYlNoSFpXNWxjbUYwYjNKR2RXNWpkR2x2YmlrcE8xeHVJQ0JIWlc1bGNtRjBiM0pHZFc1amRHbHZibEJ5YjNSdmRIbHdaUzV3Y205MGIzUjVjR1VnUFNCN1hHNGdJQ0FnWTI5dWMzUnlkV04wYjNJNklFZGxibVZ5WVhSdmNrWjFibU4wYVc5dVVISnZkRzkwZVhCbExGeHVJQ0FnSUc1bGVIUTZJR1oxYm1OMGFXOXVLSFlwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ1WlhoMFQzSlVhSEp2ZHloMGFHbHpXMk4wZUU1aGJXVmRMQ0IwYUdselcyMXZkbVZPWlhoMFRtRnRaVjBzSUNkdVpYaDBKeXdnZGlrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0IwYUhKdmR6b2dablZ1WTNScGIyNG9kaWtnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRzVsZUhSUGNsUm9jbTkzS0hSb2FYTmJZM1I0VG1GdFpWMHNJSFJvYVhOYmJXOTJaVTVsZUhST1lXMWxYU3dnSjNSb2NtOTNKeXdnZGlrN1hHNGdJQ0FnZlZ4dUlDQjlPMXh1SUNBa1pHVm1hVzVsVUhKdmNHVnlkR2xsY3loSFpXNWxjbUYwYjNKR2RXNWpkR2x2YmxCeWIzUnZkSGx3WlM1d2NtOTBiM1I1Y0dVc0lIdGNiaUFnSUNCamIyNXpkSEoxWTNSdmNqb2dlMlZ1ZFcxbGNtRmliR1U2SUdaaGJITmxmU3hjYmlBZ0lDQnVaWGgwT2lCN1pXNTFiV1Z5WVdKc1pUb2dabUZzYzJWOUxGeHVJQ0FnSUhSb2NtOTNPaUI3Wlc1MWJXVnlZV0pzWlRvZ1ptRnNjMlY5WEc0Z0lIMHBPMXh1SUNCUFltcGxZM1F1WkdWbWFXNWxVSEp2Y0dWeWRIa29SMlZ1WlhKaGRHOXlSblZ1WTNScGIyNVFjbTkwYjNSNWNHVXVjSEp2ZEc5MGVYQmxMQ0JUZVcxaWIyd3VhWFJsY21GMGIzSXNJRzV2YmtWdWRXMG9ablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE03WEc0Z0lIMHBLVHRjYmlBZ1puVnVZM1JwYjI0Z1kzSmxZWFJsUjJWdVpYSmhkRzl5U1c1emRHRnVZMlVvYVc1dVpYSkdkVzVqZEdsdmJpd2dablZ1WTNScGIyNVBZbXBsWTNRc0lITmxiR1lwSUh0Y2JpQWdJQ0IyWVhJZ2JXOTJaVTVsZUhRZ1BTQm5aWFJOYjNabFRtVjRkQ2hwYm01bGNrWjFibU4wYVc5dUxDQnpaV3htS1R0Y2JpQWdJQ0IyWVhJZ1kzUjRJRDBnYm1WM0lFZGxibVZ5WVhSdmNrTnZiblJsZUhRb0tUdGNiaUFnSUNCMllYSWdiMkpxWldOMElEMGdKR055WldGMFpTaG1kVzVqZEdsdmJrOWlhbVZqZEM1d2NtOTBiM1I1Y0dVcE8xeHVJQ0FnSUc5aWFtVmpkRnRqZEhoT1lXMWxYU0E5SUdOMGVEdGNiaUFnSUNCdlltcGxZM1JiYlc5MlpVNWxlSFJPWVcxbFhTQTlJRzF2ZG1WT1pYaDBPMXh1SUNBZ0lISmxkSFZ5YmlCdlltcGxZM1E3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnYVc1cGRFZGxibVZ5WVhSdmNrWjFibU4wYVc5dUtHWjFibU4wYVc5dVQySnFaV04wS1NCN1hHNGdJQ0FnWm5WdVkzUnBiMjVQWW1wbFkzUXVjSEp2ZEc5MGVYQmxJRDBnSkdOeVpXRjBaU2hIWlc1bGNtRjBiM0pHZFc1amRHbHZibEJ5YjNSdmRIbHdaUzV3Y205MGIzUjVjR1VwTzF4dUlDQWdJR1oxYm1OMGFXOXVUMkpxWldOMExsOWZjSEp2ZEc5Zlh5QTlJRWRsYm1WeVlYUnZja1oxYm1OMGFXOXVVSEp2ZEc5MGVYQmxPMXh1SUNBZ0lISmxkSFZ5YmlCbWRXNWpkR2x2Yms5aWFtVmpkRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJCYzNsdVkwWjFibU4wYVc5dVEyOXVkR1Y0ZENncElIdGNiaUFnSUNCSFpXNWxjbUYwYjNKRGIyNTBaWGgwTG1OaGJHd29kR2hwY3lrN1hHNGdJQ0FnZEdocGN5NWxjbklnUFNCMWJtUmxabWx1WldRN1hHNGdJQ0FnZG1GeUlHTjBlQ0E5SUhSb2FYTTdYRzRnSUNBZ1kzUjRMbkpsYzNWc2RDQTlJRzVsZHlCUWNtOXRhWE5sS0daMWJtTjBhVzl1S0hKbGMyOXNkbVVzSUhKbGFtVmpkQ2tnZTF4dUlDQWdJQ0FnWTNSNExuSmxjMjlzZG1VZ1BTQnlaWE52YkhabE8xeHVJQ0FnSUNBZ1kzUjRMbkpsYW1WamRDQTlJSEpsYW1WamREdGNiaUFnSUNCOUtUdGNiaUFnZlZ4dUlDQkJjM2x1WTBaMWJtTjBhVzl1UTI5dWRHVjRkQzV3Y205MGIzUjVjR1VnUFNBa1kzSmxZWFJsS0VkbGJtVnlZWFJ2Y2tOdmJuUmxlSFF1Y0hKdmRHOTBlWEJsS1R0Y2JpQWdRWE41Ym1OR2RXNWpkR2x2YmtOdmJuUmxlSFF1Y0hKdmRHOTBlWEJsTG1WdVpDQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJSE4zYVhSamFDQW9kR2hwY3k1emRHRjBaU2tnZTF4dUlDQWdJQ0FnWTJGelpTQkZUa1JmVTFSQlZFVTZYRzRnSUNBZ0lDQWdJSFJvYVhNdWNtVnpiMngyWlNoMGFHbHpMbkpsZEhWeWJsWmhiSFZsS1R0Y2JpQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0JqWVhObElGSkZWRWhTVDFkZlUxUkJWRVU2WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjbVZxWldOMEtIUm9hWE11YzNSdmNtVmtSWGhqWlhCMGFXOXVLVHRjYmlBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQmtaV1poZFd4ME9seHVJQ0FnSUNBZ0lDQjBhR2x6TG5KbGFtVmpkQ2huWlhSSmJuUmxjbTVoYkVWeWNtOXlLSFJvYVhNdWMzUmhkR1VwS1R0Y2JpQWdJQ0I5WEc0Z0lIMDdYRzRnSUVGemVXNWpSblZ1WTNScGIyNURiMjUwWlhoMExuQnliM1J2ZEhsd1pTNW9ZVzVrYkdWRmVHTmxjSFJwYjI0Z1BTQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQjBhR2x6TG5OMFlYUmxJRDBnVWtWVVNGSlBWMTlUVkVGVVJUdGNiaUFnZlR0Y2JpQWdablZ1WTNScGIyNGdZWE41Ym1OWGNtRndLR2x1Ym1WeVJuVnVZM1JwYjI0c0lITmxiR1lwSUh0Y2JpQWdJQ0IyWVhJZ2JXOTJaVTVsZUhRZ1BTQm5aWFJOYjNabFRtVjRkQ2hwYm01bGNrWjFibU4wYVc5dUxDQnpaV3htS1R0Y2JpQWdJQ0IyWVhJZ1kzUjRJRDBnYm1WM0lFRnplVzVqUm5WdVkzUnBiMjVEYjI1MFpYaDBLQ2s3WEc0Z0lDQWdZM1I0TG1OeVpXRjBaVU5oYkd4aVlXTnJJRDBnWm5WdVkzUnBiMjRvYm1WM1UzUmhkR1VwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJtZFc1amRHbHZiaWgyWVd4MVpTa2dlMXh1SUNBZ0lDQWdJQ0JqZEhndWMzUmhkR1VnUFNCdVpYZFRkR0YwWlR0Y2JpQWdJQ0FnSUNBZ1kzUjRMblpoYkhWbElEMGdkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lHMXZkbVZPWlhoMEtHTjBlQ2s3WEc0Z0lDQWdJQ0I5TzF4dUlDQWdJSDA3WEc0Z0lDQWdZM1I0TG1WeWNtSmhZMnNnUFNCbWRXNWpkR2x2YmlobGNuSXBJSHRjYmlBZ0lDQWdJR2hoYm1Sc1pVTmhkR05vS0dOMGVDd2daWEp5S1R0Y2JpQWdJQ0FnSUcxdmRtVk9aWGgwS0dOMGVDazdYRzRnSUNBZ2ZUdGNiaUFnSUNCdGIzWmxUbVY0ZENoamRIZ3BPMXh1SUNBZ0lISmxkSFZ5YmlCamRIZ3VjbVZ6ZFd4ME8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHZGxkRTF2ZG1WT1pYaDBLR2x1Ym1WeVJuVnVZM1JwYjI0c0lITmxiR1lwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdablZ1WTNScGIyNG9ZM1I0S1NCN1hHNGdJQ0FnSUNCM2FHbHNaU0FvZEhKMVpTa2dlMXh1SUNBZ0lDQWdJQ0IwY25rZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQnBibTVsY2taMWJtTjBhVzl1TG1OaGJHd29jMlZzWml3Z1kzUjRLVHRjYmlBZ0lDQWdJQ0FnZlNCallYUmphQ0FvWlhncElIdGNiaUFnSUNBZ0lDQWdJQ0JvWVc1a2JHVkRZWFJqYUNoamRIZ3NJR1Y0S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2FHRnVaR3hsUTJGMFkyZ29ZM1I0TENCbGVDa2dlMXh1SUNBZ0lHTjBlQzV6ZEc5eVpXUkZlR05sY0hScGIyNGdQU0JsZUR0Y2JpQWdJQ0IyWVhJZ2JHRnpkQ0E5SUdOMGVDNTBjbmxUZEdGamExOWJZM1I0TG5SeWVWTjBZV05yWHk1c1pXNW5kR2dnTFNBeFhUdGNiaUFnSUNCcFppQW9JV3hoYzNRcElIdGNiaUFnSUNBZ0lHTjBlQzVvWVc1a2JHVkZlR05sY0hScGIyNG9aWGdwTzF4dUlDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lIMWNiaUFnSUNCamRIZ3VjM1JoZEdVZ1BTQnNZWE4wTG1OaGRHTm9JQ0U5UFNCMWJtUmxabWx1WldRZ1B5QnNZWE4wTG1OaGRHTm9JRG9nYkdGemRDNW1hVzVoYkd4NU8xeHVJQ0FnSUdsbUlDaHNZWE4wTG1acGJtRnNiSGxHWVd4c1ZHaHliM1ZuYUNBaFBUMGdkVzVrWldacGJtVmtLVnh1SUNBZ0lDQWdZM1I0TG1acGJtRnNiSGxHWVd4c1ZHaHliM1ZuYUNBOUlHeGhjM1F1Wm1sdVlXeHNlVVpoYkd4VWFISnZkV2RvTzF4dUlDQjlYRzRnSUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVoYzNsdVkxZHlZWEFnUFNCaGMzbHVZMWR5WVhBN1hHNGdJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNXBibWwwUjJWdVpYSmhkRzl5Um5WdVkzUnBiMjRnUFNCcGJtbDBSMlZ1WlhKaGRHOXlSblZ1WTNScGIyNDdYRzRnSUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVqY21WaGRHVkhaVzVsY21GMGIzSkpibk4wWVc1alpTQTlJR055WldGMFpVZGxibVZ5WVhSdmNrbHVjM1JoYm1ObE8xeHVmU2tvS1R0Y2JpaG1kVzVqZEdsdmJpZ3BJSHRjYmlBZ1puVnVZM1JwYjI0Z1luVnBiR1JHY205dFJXNWpiMlJsWkZCaGNuUnpLRzl3ZEY5elkyaGxiV1VzSUc5d2RGOTFjMlZ5U1c1bWJ5d2diM0IwWDJSdmJXRnBiaXdnYjNCMFgzQnZjblFzSUc5d2RGOXdZWFJvTENCdmNIUmZjWFZsY25sRVlYUmhMQ0J2Y0hSZlpuSmhaMjFsYm5RcElIdGNiaUFnSUNCMllYSWdiM1YwSUQwZ1cxMDdYRzRnSUNBZ2FXWWdLRzl3ZEY5elkyaGxiV1VwSUh0Y2JpQWdJQ0FnSUc5MWRDNXdkWE5vS0c5d2RGOXpZMmhsYldVc0lDYzZKeWs3WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2h2Y0hSZlpHOXRZV2x1S1NCN1hHNGdJQ0FnSUNCdmRYUXVjSFZ6YUNnbkx5OG5LVHRjYmlBZ0lDQWdJR2xtSUNodmNIUmZkWE5sY2tsdVptOHBJSHRjYmlBZ0lDQWdJQ0FnYjNWMExuQjFjMmdvYjNCMFgzVnpaWEpKYm1adkxDQW5RQ2NwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYjNWMExuQjFjMmdvYjNCMFgyUnZiV0ZwYmlrN1hHNGdJQ0FnSUNCcFppQW9iM0IwWDNCdmNuUXBJSHRjYmlBZ0lDQWdJQ0FnYjNWMExuQjFjMmdvSnpvbkxDQnZjSFJmY0c5eWRDazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDaHZjSFJmY0dGMGFDa2dlMXh1SUNBZ0lDQWdiM1YwTG5CMWMyZ29iM0IwWDNCaGRHZ3BPMXh1SUNBZ0lIMWNiaUFnSUNCcFppQW9iM0IwWDNGMVpYSjVSR0YwWVNrZ2UxeHVJQ0FnSUNBZ2IzVjBMbkIxYzJnb0p6OG5MQ0J2Y0hSZmNYVmxjbmxFWVhSaEtUdGNiaUFnSUNCOVhHNGdJQ0FnYVdZZ0tHOXdkRjltY21GbmJXVnVkQ2tnZTF4dUlDQWdJQ0FnYjNWMExuQjFjMmdvSnlNbkxDQnZjSFJmWm5KaFoyMWxiblFwTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2IzVjBMbXB2YVc0b0p5Y3BPMXh1SUNCOVhHNGdJRHRjYmlBZ2RtRnlJSE53YkdsMFVtVWdQU0J1WlhjZ1VtVm5SWGh3S0NkZUp5QXJJQ2NvUHpvbklDc2dKeWhiWGpvdlB5TXVYU3NwSnlBcklDYzZLVDhuSUNzZ0p5Zy9PaTh2SnlBcklDY29Qem9vVzE0dlB5TmRLaWxBS1Q4bklDc2dKeWhiWEZ4Y1hIZGNYRnhjWkZ4Y1hGd3RYRnhjWEhVd01UQXdMVnhjWEZ4MVptWm1aaTRsWFNvcEp5QXJJQ2NvUHpvNktGc3dMVGxkS3lrcFB5Y2dLeUFuS1Q4bklDc2dKeWhiWGo4alhTc3BQeWNnS3lBbktEODZYRnhjWEQ4b1cxNGpYU29wS1Q4bklDc2dKeWcvT2lNb0xpb3BLVDhuSUNzZ0p5UW5LVHRjYmlBZ2RtRnlJRU52YlhCdmJtVnVkRWx1WkdWNElEMGdlMXh1SUNBZ0lGTkRTRVZOUlRvZ01TeGNiaUFnSUNCVlUwVlNYMGxPUms4NklESXNYRzRnSUNBZ1JFOU5RVWxPT2lBekxGeHVJQ0FnSUZCUFVsUTZJRFFzWEc0Z0lDQWdVRUZVU0RvZ05TeGNiaUFnSUNCUlZVVlNXVjlFUVZSQk9pQTJMRnh1SUNBZ0lFWlNRVWROUlU1VU9pQTNYRzRnSUgwN1hHNGdJR1oxYm1OMGFXOXVJSE53YkdsMEtIVnlhU2tnZTF4dUlDQWdJSEpsZEhWeWJpQW9kWEpwTG0xaGRHTm9LSE53YkdsMFVtVXBLVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ5WlcxdmRtVkViM1JUWldkdFpXNTBjeWh3WVhSb0tTQjdYRzRnSUNBZ2FXWWdLSEJoZEdnZ1BUMDlJQ2N2SnlsY2JpQWdJQ0FnSUhKbGRIVnliaUFuTHljN1hHNGdJQ0FnZG1GeUlHeGxZV1JwYm1kVGJHRnphQ0E5SUhCaGRHaGJNRjBnUFQwOUlDY3ZKeUEvSUNjdkp5QTZJQ2NuTzF4dUlDQWdJSFpoY2lCMGNtRnBiR2x1WjFOc1lYTm9JRDBnY0dGMGFDNXpiR2xqWlNndE1Ta2dQVDA5SUNjdkp5QS9JQ2N2SnlBNklDY25PMXh1SUNBZ0lIWmhjaUJ6WldkdFpXNTBjeUE5SUhCaGRHZ3VjM0JzYVhRb0p5OG5LVHRjYmlBZ0lDQjJZWElnYjNWMElEMGdXMTA3WEc0Z0lDQWdkbUZ5SUhWd0lEMGdNRHRjYmlBZ0lDQm1iM0lnS0haaGNpQndiM01nUFNBd095QndiM01nUENCelpXZHRaVzUwY3k1c1pXNW5kR2c3SUhCdmN5c3JLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2MyVm5iV1Z1ZENBOUlITmxaMjFsYm5SelczQnZjMTA3WEc0Z0lDQWdJQ0J6ZDJsMFkyZ2dLSE5sWjIxbGJuUXBJSHRjYmlBZ0lDQWdJQ0FnWTJGelpTQW5KenBjYmlBZ0lDQWdJQ0FnWTJGelpTQW5MaWM2WEc0Z0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUdOaGMyVWdKeTR1SnpwY2JpQWdJQ0FnSUNBZ0lDQnBaaUFvYjNWMExteGxibWQwYUNsY2JpQWdJQ0FnSUNBZ0lDQWdJRzkxZEM1d2IzQW9LVHRjYmlBZ0lDQWdJQ0FnSUNCbGJITmxYRzRnSUNBZ0lDQWdJQ0FnSUNCMWNDc3JPMXh1SUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0JrWldaaGRXeDBPbHh1SUNBZ0lDQWdJQ0FnSUc5MWRDNXdkWE5vS0hObFoyMWxiblFwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmlBZ0lDQnBaaUFvSVd4bFlXUnBibWRUYkdGemFDa2dlMXh1SUNBZ0lDQWdkMmhwYkdVZ0tIVndMUzBnUGlBd0tTQjdYRzRnSUNBZ0lDQWdJRzkxZEM1MWJuTm9hV1owS0NjdUxpY3BPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdhV1lnS0c5MWRDNXNaVzVuZEdnZ1BUMDlJREFwWEc0Z0lDQWdJQ0FnSUc5MWRDNXdkWE5vS0NjdUp5azdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJzWldGa2FXNW5VMnhoYzJnZ0t5QnZkWFF1YW05cGJpZ25MeWNwSUNzZ2RISmhhV3hwYm1kVGJHRnphRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJxYjJsdVFXNWtRMkZ1YjI1cFkyRnNhWHBsVUdGMGFDaHdZWEowY3lrZ2UxeHVJQ0FnSUhaaGNpQndZWFJvSUQwZ2NHRnlkSE5iUTI5dGNHOXVaVzUwU1c1a1pYZ3VVRUZVU0YwZ2ZId2dKeWM3WEc0Z0lDQWdjR0YwYUNBOUlISmxiVzkyWlVSdmRGTmxaMjFsYm5SektIQmhkR2dwTzF4dUlDQWdJSEJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGxCQlZFaGRJRDBnY0dGMGFEdGNiaUFnSUNCeVpYUjFjbTRnWW5WcGJHUkdjbTl0Ulc1amIyUmxaRkJoY25SektIQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMbE5EU0VWTlJWMHNJSEJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGxWVFJWSmZTVTVHVDEwc0lIQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMa1JQVFVGSlRsMHNJSEJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGxCUFVsUmRMQ0J3WVhKMGMxdERiMjF3YjI1bGJuUkpibVJsZUM1UVFWUklYU3dnY0dGeWRITmJRMjl0Y0c5dVpXNTBTVzVrWlhndVVWVkZVbGxmUkVGVVFWMHNJSEJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGtaU1FVZE5SVTVVWFNrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1kyRnViMjVwWTJGc2FYcGxWWEpzS0hWeWJDa2dlMXh1SUNBZ0lIWmhjaUJ3WVhKMGN5QTlJSE53YkdsMEtIVnliQ2s3WEc0Z0lDQWdjbVYwZFhKdUlHcHZhVzVCYm1SRFlXNXZibWxqWVd4cGVtVlFZWFJvS0hCaGNuUnpLVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ5WlhOdmJIWmxWWEpzS0dKaGMyVXNJSFZ5YkNrZ2UxeHVJQ0FnSUhaaGNpQndZWEowY3lBOUlITndiR2wwS0hWeWJDazdYRzRnSUNBZ2RtRnlJR0poYzJWUVlYSjBjeUE5SUhOd2JHbDBLR0poYzJVcE8xeHVJQ0FnSUdsbUlDaHdZWEowYzF0RGIyMXdiMjVsYm5SSmJtUmxlQzVUUTBoRlRVVmRLU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdhbTlwYmtGdVpFTmhibTl1YVdOaGJHbDZaVkJoZEdnb2NHRnlkSE1wTzF4dUlDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQndZWEowYzF0RGIyMXdiMjVsYm5SSmJtUmxlQzVUUTBoRlRVVmRJRDBnWW1GelpWQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMbE5EU0VWTlJWMDdYRzRnSUNBZ2ZWeHVJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQkRiMjF3YjI1bGJuUkpibVJsZUM1VFEwaEZUVVU3SUdrZ1BEMGdRMjl0Y0c5dVpXNTBTVzVrWlhndVVFOVNWRHNnYVNzcktTQjdYRzRnSUNBZ0lDQnBaaUFvSVhCaGNuUnpXMmxkS1NCN1hHNGdJQ0FnSUNBZ0lIQmhjblJ6VzJsZElEMGdZbUZ6WlZCaGNuUnpXMmxkTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmlBZ0lDQnBaaUFvY0dGeWRITmJRMjl0Y0c5dVpXNTBTVzVrWlhndVVFRlVTRjFiTUYwZ1BUMGdKeThuS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYW05cGJrRnVaRU5oYm05dWFXTmhiR2w2WlZCaGRHZ29jR0Z5ZEhNcE8xeHVJQ0FnSUgxY2JpQWdJQ0IyWVhJZ2NHRjBhQ0E5SUdKaGMyVlFZWEowYzF0RGIyMXdiMjVsYm5SSmJtUmxlQzVRUVZSSVhUdGNiaUFnSUNCMllYSWdhVzVrWlhnZ1BTQndZWFJvTG14aGMzUkpibVJsZUU5bUtDY3ZKeWs3WEc0Z0lDQWdjR0YwYUNBOUlIQmhkR2d1YzJ4cFkyVW9NQ3dnYVc1a1pYZ2dLeUF4S1NBcklIQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMbEJCVkVoZE8xeHVJQ0FnSUhCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExsQkJWRWhkSUQwZ2NHRjBhRHRjYmlBZ0lDQnlaWFIxY200Z2FtOXBia0Z1WkVOaGJtOXVhV05oYkdsNlpWQmhkR2dvY0dGeWRITXBPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR2x6UVdKemIyeDFkR1VvYm1GdFpTa2dlMXh1SUNBZ0lHbG1JQ2doYm1GdFpTbGNiaUFnSUNBZ0lISmxkSFZ5YmlCbVlXeHpaVHRjYmlBZ0lDQnBaaUFvYm1GdFpWc3dYU0E5UFQwZ0p5OG5LVnh1SUNBZ0lDQWdjbVYwZFhKdUlIUnlkV1U3WEc0Z0lDQWdkbUZ5SUhCaGNuUnpJRDBnYzNCc2FYUW9ibUZ0WlNrN1hHNGdJQ0FnYVdZZ0tIQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMbE5EU0VWTlJWMHBYRzRnSUNBZ0lDQnlaWFIxY200Z2RISjFaVHRjYmlBZ0lDQnlaWFIxY200Z1ptRnNjMlU3WEc0Z0lIMWNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU5oYm05dWFXTmhiR2w2WlZWeWJDQTlJR05oYm05dWFXTmhiR2w2WlZWeWJEdGNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbWx6UVdKemIyeDFkR1VnUFNCcGMwRmljMjlzZFhSbE8xeHVJQ0FrZEhKaFkyVjFjbEoxYm5ScGJXVXVjbVZ0YjNabFJHOTBVMlZuYldWdWRITWdQU0J5WlcxdmRtVkViM1JUWldkdFpXNTBjenRjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG5KbGMyOXNkbVZWY213Z1BTQnlaWE52YkhabFZYSnNPMXh1ZlNrb0tUdGNiaWhtZFc1amRHbHZiaWdwSUh0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dUlDQjJZWElnZEhsd1pYTWdQU0I3WEc0Z0lDQWdZVzU1T2lCN2JtRnRaVG9nSjJGdWVTZDlMRnh1SUNBZ0lHSnZiMnhsWVc0NklIdHVZVzFsT2lBblltOXZiR1ZoYmlkOUxGeHVJQ0FnSUc1MWJXSmxjam9nZTI1aGJXVTZJQ2R1ZFcxaVpYSW5mU3hjYmlBZ0lDQnpkSEpwYm1jNklIdHVZVzFsT2lBbmMzUnlhVzVuSjMwc1hHNGdJQ0FnYzNsdFltOXNPaUI3Ym1GdFpUb2dKM041YldKdmJDZDlMRnh1SUNBZ0lIWnZhV1E2SUh0dVlXMWxPaUFuZG05cFpDZDlYRzRnSUgwN1hHNGdJSFpoY2lCSFpXNWxjbWxqVkhsd1pTQTlJR1oxYm1OMGFXOXVJRWRsYm1WeWFXTlVlWEJsS0hSNWNHVXNJR0Z5WjNWdFpXNTBWSGx3WlhNcElIdGNiaUFnSUNCMGFHbHpMblI1Y0dVZ1BTQjBlWEJsTzF4dUlDQWdJSFJvYVhNdVlYSm5kVzFsYm5SVWVYQmxjeUE5SUdGeVozVnRaVzUwVkhsd1pYTTdYRzRnSUgwN1hHNGdJQ2drZEhKaFkyVjFjbEoxYm5ScGJXVXVZM0psWVhSbFEyeGhjM01wS0VkbGJtVnlhV05VZVhCbExDQjdmU3dnZTMwcE8xeHVJQ0IyWVhJZ2RIbHdaVkpsWjJsemRHVnlJRDBnVDJKcVpXTjBMbU55WldGMFpTaHVkV3hzS1R0Y2JpQWdablZ1WTNScGIyNGdaMlZ1WlhKcFkxUjVjR1VvZEhsd1pTa2dlMXh1SUNBZ0lHWnZjaUFvZG1GeUlHRnlaM1Z0Wlc1MFZIbHdaWE1nUFNCYlhTeGNiaUFnSUNBZ0lDQWdKRjlmTVNBOUlERTdJQ1JmWHpFZ1BDQmhjbWQxYldWdWRITXViR1Z1WjNSb095QWtYMTh4S3lzcFhHNGdJQ0FnSUNCaGNtZDFiV1Z1ZEZSNWNHVnpXeVJmWHpFZ0xTQXhYU0E5SUdGeVozVnRaVzUwYzFza1gxOHhYVHRjYmlBZ0lDQjJZWElnZEhsd1pVMWhjQ0E5SUhSNWNHVlNaV2RwYzNSbGNqdGNiaUFnSUNCMllYSWdhMlY1SUQwZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1kbGRFOTNia2hoYzJoUFltcGxZM1FvZEhsd1pTa3VhR0Z6YUR0Y2JpQWdJQ0JwWmlBb0lYUjVjR1ZOWVhCYmEyVjVYU2tnZTF4dUlDQWdJQ0FnZEhsd1pVMWhjRnRyWlhsZElEMGdUMkpxWldOMExtTnlaV0YwWlNodWRXeHNLVHRjYmlBZ0lDQjlYRzRnSUNBZ2RIbHdaVTFoY0NBOUlIUjVjR1ZOWVhCYmEyVjVYVHRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR0Z5WjNWdFpXNTBWSGx3WlhNdWJHVnVaM1JvSUMwZ01Uc2dhU3NyS1NCN1hHNGdJQ0FnSUNCclpYa2dQU0FrZEhKaFkyVjFjbEoxYm5ScGJXVXVaMlYwVDNkdVNHRnphRTlpYW1WamRDaGhjbWQxYldWdWRGUjVjR1Z6VzJsZEtTNW9ZWE5vTzF4dUlDQWdJQ0FnYVdZZ0tDRjBlWEJsVFdGd1cydGxlVjBwSUh0Y2JpQWdJQ0FnSUNBZ2RIbHdaVTFoY0Z0clpYbGRJRDBnVDJKcVpXTjBMbU55WldGMFpTaHVkV3hzS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhSNWNHVk5ZWEFnUFNCMGVYQmxUV0Z3VzJ0bGVWMDdYRzRnSUNBZ2ZWeHVJQ0FnSUhaaGNpQjBZV2xzSUQwZ1lYSm5kVzFsYm5SVWVYQmxjMXRoY21kMWJXVnVkRlI1Y0dWekxteGxibWQwYUNBdElERmRPMXh1SUNBZ0lHdGxlU0E5SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVuWlhSUGQyNUlZWE5vVDJKcVpXTjBLSFJoYVd3cExtaGhjMmc3WEc0Z0lDQWdhV1lnS0NGMGVYQmxUV0Z3VzJ0bGVWMHBJSHRjYmlBZ0lDQWdJSFI1Y0dWTllYQmJhMlY1WFNBOUlHNWxkeUJIWlc1bGNtbGpWSGx3WlNoMGVYQmxMQ0JoY21kMWJXVnVkRlI1Y0dWektUdGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSFI1Y0dWTllYQmJhMlY1WFR0Y2JpQWdmVnh1SUNBa2RISmhZMlYxY2xKMWJuUnBiV1V1UjJWdVpYSnBZMVI1Y0dVZ1BTQkhaVzVsY21salZIbHdaVHRjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1kbGJtVnlhV05VZVhCbElEMGdaMlZ1WlhKcFkxUjVjR1U3WEc0Z0lDUjBjbUZqWlhWeVVuVnVkR2x0WlM1MGVYQmxJRDBnZEhsd1pYTTdYRzU5S1NncE8xeHVLR1oxYm1OMGFXOXVLR2RzYjJKaGJDa2dlMXh1SUNBbmRYTmxJSE4wY21samRDYzdYRzRnSUhaaGNpQWtYMTh5SUQwZ0pIUnlZV05sZFhKU2RXNTBhVzFsTEZ4dUlDQWdJQ0FnWTJGdWIyNXBZMkZzYVhwbFZYSnNJRDBnSkY5Zk1pNWpZVzV2Ym1sallXeHBlbVZWY213c1hHNGdJQ0FnSUNCeVpYTnZiSFpsVlhKc0lEMGdKRjlmTWk1eVpYTnZiSFpsVlhKc0xGeHVJQ0FnSUNBZ2FYTkJZbk52YkhWMFpTQTlJQ1JmWHpJdWFYTkJZbk52YkhWMFpUdGNiaUFnZG1GeUlHMXZaSFZzWlVsdWMzUmhiblJwWVhSdmNuTWdQU0JQWW1wbFkzUXVZM0psWVhSbEtHNTFiR3dwTzF4dUlDQjJZWElnWW1GelpWVlNURHRjYmlBZ2FXWWdLR2RzYjJKaGJDNXNiMk5oZEdsdmJpQW1KaUJuYkc5aVlXd3ViRzlqWVhScGIyNHVhSEpsWmlsY2JpQWdJQ0JpWVhObFZWSk1JRDBnY21WemIyeDJaVlZ5YkNobmJHOWlZV3d1Ykc5allYUnBiMjR1YUhKbFppd2dKeTR2SnlrN1hHNGdJR1ZzYzJWY2JpQWdJQ0JpWVhObFZWSk1JRDBnSnljN1hHNGdJSFpoY2lCVmJtTnZZWFJsWkUxdlpIVnNaVVZ1ZEhKNUlEMGdablZ1WTNScGIyNGdWVzVqYjJGMFpXUk5iMlIxYkdWRmJuUnllU2gxY213c0lIVnVZMjloZEdWa1RXOWtkV3hsS1NCN1hHNGdJQ0FnZEdocGN5NTFjbXdnUFNCMWNtdzdYRzRnSUNBZ2RHaHBjeTUyWVd4MVpWOGdQU0IxYm1OdllYUmxaRTF2WkhWc1pUdGNiaUFnZlR0Y2JpQWdLQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWpjbVZoZEdWRGJHRnpjeWtvVlc1amIyRjBaV1JOYjJSMWJHVkZiblJ5ZVN3Z2UzMHNJSHQ5S1R0Y2JpQWdkbUZ5SUUxdlpIVnNaVVYyWVd4MVlYUnBiMjVGY25KdmNpQTlJR1oxYm1OMGFXOXVJRTF2WkhWc1pVVjJZV3gxWVhScGIyNUZjbkp2Y2lobGNuSnZibVZ2ZFhOTmIyUjFiR1ZPWVcxbExDQmpZWFZ6WlNrZ2UxeHVJQ0FnSUhSb2FYTXViV1Z6YzJGblpTQTlJSFJvYVhNdVkyOXVjM1J5ZFdOMGIzSXVibUZ0WlNBcklDYzZJQ2NnS3lCMGFHbHpMbk4wY21sd1EyRjFjMlVvWTJGMWMyVXBJQ3NnSnlCcGJpQW5JQ3NnWlhKeWIyNWxiM1Z6VFc5a2RXeGxUbUZ0WlR0Y2JpQWdJQ0JwWmlBb0lTaGpZWFZ6WlNCcGJuTjBZVzVqWlc5bUlDUk5iMlIxYkdWRmRtRnNkV0YwYVc5dVJYSnliM0lwSUNZbUlHTmhkWE5sTG5OMFlXTnJLVnh1SUNBZ0lDQWdkR2hwY3k1emRHRmpheUE5SUhSb2FYTXVjM1J5YVhCVGRHRmpheWhqWVhWelpTNXpkR0ZqYXlrN1hHNGdJQ0FnWld4elpWeHVJQ0FnSUNBZ2RHaHBjeTV6ZEdGamF5QTlJQ2NuTzF4dUlDQjlPMXh1SUNCMllYSWdKRTF2WkhWc1pVVjJZV3gxWVhScGIyNUZjbkp2Y2lBOUlFMXZaSFZzWlVWMllXeDFZWFJwYjI1RmNuSnZjanRjYmlBZ0tDUjBjbUZqWlhWeVVuVnVkR2x0WlM1amNtVmhkR1ZEYkdGemN5a29UVzlrZFd4bFJYWmhiSFZoZEdsdmJrVnljbTl5TENCN1hHNGdJQ0FnYzNSeWFYQkZjbkp2Y2pvZ1puVnVZM1JwYjI0b2JXVnpjMkZuWlNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUcxbGMzTmhaMlV1Y21Wd2JHRmpaU2d2TGlwRmNuSnZjam92TENCMGFHbHpMbU52Ym5OMGNuVmpkRzl5TG01aGJXVWdLeUFuT2ljcE8xeHVJQ0FnSUgwc1hHNGdJQ0FnYzNSeWFYQkRZWFZ6WlRvZ1puVnVZM1JwYjI0b1kyRjFjMlVwSUh0Y2JpQWdJQ0FnSUdsbUlDZ2hZMkYxYzJVcFhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlBbkp6dGNiaUFnSUNBZ0lHbG1JQ2doWTJGMWMyVXViV1Z6YzJGblpTbGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHTmhkWE5sSUNzZ0p5YzdYRzRnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTV6ZEhKcGNFVnljbTl5S0dOaGRYTmxMbTFsYzNOaFoyVXBPMXh1SUNBZ0lIMHNYRzRnSUNBZ2JHOWhaR1ZrUW5rNklHWjFibU4wYVc5dUtHMXZaSFZzWlU1aGJXVXBJSHRjYmlBZ0lDQWdJSFJvYVhNdWMzUmhZMnNnS3owZ0oxeGNiaUJzYjJGa1pXUWdZbmtnSnlBcklHMXZaSFZzWlU1aGJXVTdYRzRnSUNBZ2ZTeGNiaUFnSUNCemRISnBjRk4wWVdOck9pQm1kVzVqZEdsdmJpaGpZWFZ6WlZOMFlXTnJLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2MzUmhZMnNnUFNCYlhUdGNiaUFnSUNBZ0lHTmhkWE5sVTNSaFkyc3VjM0JzYVhRb0oxeGNiaWNwTG5OdmJXVW9LR1oxYm1OMGFXOXVLR1p5WVcxbEtTQjdYRzRnSUNBZ0lDQWdJR2xtSUNndlZXNWpiMkYwWldSTmIyUjFiR1ZKYm5OMFlXNTBhV0YwYjNJdkxuUmxjM1FvWm5KaGJXVXBLVnh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUNBZ0lDQnpkR0ZqYXk1d2RYTm9LR1p5WVcxbEtUdGNiaUFnSUNBZ0lIMHBLVHRjYmlBZ0lDQWdJSE4wWVdOcld6QmRJRDBnZEdocGN5NXpkSEpwY0VWeWNtOXlLSE4wWVdOcld6QmRLVHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnpkR0ZqYXk1cWIybHVLQ2RjWEc0bktUdGNiaUFnSUNCOVhHNGdJSDBzSUh0OUxDQkZjbkp2Y2lrN1hHNGdJR1oxYm1OMGFXOXVJR0psWm05eVpVeHBibVZ6S0d4cGJtVnpMQ0J1ZFcxaVpYSXBJSHRjYmlBZ0lDQjJZWElnY21WemRXeDBJRDBnVzEwN1hHNGdJQ0FnZG1GeUlHWnBjbk4wSUQwZ2JuVnRZbVZ5SUMwZ016dGNiaUFnSUNCcFppQW9abWx5YzNRZ1BDQXdLVnh1SUNBZ0lDQWdabWx5YzNRZ1BTQXdPMXh1SUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0JtYVhKemREc2dhU0E4SUc1MWJXSmxjanNnYVNzcktTQjdYRzRnSUNBZ0lDQnlaWE4xYkhRdWNIVnphQ2hzYVc1bGMxdHBYU2s3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCeVpYTjFiSFE3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWVdaMFpYSk1hVzVsY3loc2FXNWxjeXdnYm5WdFltVnlLU0I3WEc0Z0lDQWdkbUZ5SUd4aGMzUWdQU0J1ZFcxaVpYSWdLeUF4TzF4dUlDQWdJR2xtSUNoc1lYTjBJRDRnYkdsdVpYTXViR1Z1WjNSb0lDMGdNU2xjYmlBZ0lDQWdJR3hoYzNRZ1BTQnNhVzVsY3k1c1pXNW5kR2dnTFNBeE8xeHVJQ0FnSUhaaGNpQnlaWE4xYkhRZ1BTQmJYVHRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnYm5WdFltVnlPeUJwSUR3OUlHeGhjM1E3SUdrckt5a2dlMXh1SUNBZ0lDQWdjbVZ6ZFd4MExuQjFjMmdvYkdsdVpYTmJhVjBwTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2NtVnpkV3gwTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdOdmJIVnRibE53WVdOcGJtY29ZMjlzZFcxdWN5a2dlMXh1SUNBZ0lIWmhjaUJ5WlhOMWJIUWdQU0FuSnp0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUdOdmJIVnRibk1nTFNBeE95QnBLeXNwSUh0Y2JpQWdJQ0FnSUhKbGMzVnNkQ0FyUFNBbkxTYzdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ5WlhOMWJIUTdYRzRnSUgxY2JpQWdkbUZ5SUZWdVkyOWhkR1ZrVFc5a2RXeGxTVzV6ZEdGdWRHbGhkRzl5SUQwZ1puVnVZM1JwYjI0Z1ZXNWpiMkYwWldSTmIyUjFiR1ZKYm5OMFlXNTBhV0YwYjNJb2RYSnNMQ0JtZFc1aktTQjdYRzRnSUNBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG5OMWNHVnlRMjl1YzNSeWRXTjBiM0lvSkZWdVkyOWhkR1ZrVFc5a2RXeGxTVzV6ZEdGdWRHbGhkRzl5S1M1allXeHNLSFJvYVhNc0lIVnliQ3dnYm5Wc2JDazdYRzRnSUNBZ2RHaHBjeTVtZFc1aklEMGdablZ1WXp0Y2JpQWdmVHRjYmlBZ2RtRnlJQ1JWYm1OdllYUmxaRTF2WkhWc1pVbHVjM1JoYm5ScFlYUnZjaUE5SUZWdVkyOWhkR1ZrVFc5a2RXeGxTVzV6ZEdGdWRHbGhkRzl5TzF4dUlDQW9KSFJ5WVdObGRYSlNkVzUwYVcxbExtTnlaV0YwWlVOc1lYTnpLU2hWYm1OdllYUmxaRTF2WkhWc1pVbHVjM1JoYm5ScFlYUnZjaXdnZTJkbGRGVnVZMjloZEdWa1RXOWtkV3hsT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lHbG1JQ2gwYUdsekxuWmhiSFZsWHlsY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSb2FYTXVkbUZzZFdWZk8xeHVJQ0FnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlISmxiR0YwYVhabFVtVnhkV2x5WlR0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQWtkSEpoWTJWMWNsSjFiblJwYldVZ0lUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lISmxiR0YwYVhabFVtVnhkV2x5WlNBOUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1eVpYRjFhWEpsTG1KcGJtUW9iblZzYkN3Z2RHaHBjeTUxY213cE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TG5aaGJIVmxYeUE5SUhSb2FYTXVablZ1WXk1allXeHNLR2RzYjJKaGJDd2djbVZzWVhScGRtVlNaWEYxYVhKbEtUdGNiaUFnSUNBZ0lIMGdZMkYwWTJnZ0tHVjRLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaGxlQ0JwYm5OMFlXNWpaVzltSUUxdlpIVnNaVVYyWVd4MVlYUnBiMjVGY25KdmNpa2dlMXh1SUNBZ0lDQWdJQ0FnSUdWNExteHZZV1JsWkVKNUtIUm9hWE11ZFhKc0tUdGNiaUFnSUNBZ0lDQWdJQ0IwYUhKdmR5QmxlRHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCcFppQW9aWGd1YzNSaFkyc3BJSHRjYmlBZ0lDQWdJQ0FnSUNCMllYSWdiR2x1WlhNZ1BTQjBhR2x6TG1aMWJtTXVkRzlUZEhKcGJtY29LUzV6Y0d4cGRDZ25YRnh1SnlrN1hHNGdJQ0FnSUNBZ0lDQWdkbUZ5SUdWMllXeGxaQ0E5SUZ0ZE8xeHVJQ0FnSUNBZ0lDQWdJR1Y0TG5OMFlXTnJMbk53YkdsMEtDZGNYRzRuS1M1emIyMWxLR1oxYm1OMGFXOXVLR1p5WVcxbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9abkpoYldVdWFXNWtaWGhQWmlnblZXNWpiMkYwWldSTmIyUjFiR1ZKYm5OMFlXNTBhV0YwYjNJdVoyVjBWVzVqYjJGMFpXUk5iMlIxYkdVbktTQStJREFwWEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQjBjblZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZ5SUcwZ1BTQXZLR0YwWEZ4elcxNWNYSE5kS2x4Y2N5a3VLajQ2S0Z4Y1pDb3BPaWhjWEdRcUtWeGNLUzh1WlhobFl5aG1jbUZ0WlNrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb2JTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZWElnYkdsdVpTQTlJSEJoY25ObFNXNTBLRzFiTWwwc0lERXdLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdaWFpoYkdWa0lEMGdaWFpoYkdWa0xtTnZibU5oZENoaVpXWnZjbVZNYVc1bGN5aHNhVzVsY3l3Z2JHbHVaU2twTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JsZG1Gc1pXUXVjSFZ6YUNoamIyeDFiVzVUY0dGamFXNW5LRzFiTTEwcElDc2dKMTRuS1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhaaGJHVmtJRDBnWlhaaGJHVmtMbU52Ym1OaGRDaGhablJsY2t4cGJtVnpLR3hwYm1WekxDQnNhVzVsS1NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdWMllXeGxaQzV3ZFhOb0tDYzlJRDBnUFNBOUlEMGdQU0E5SUQwZ1BTY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhaaGJHVmtMbkIxYzJnb1puSmhiV1VwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUgwcE8xeHVJQ0FnSUNBZ0lDQWdJR1Y0TG5OMFlXTnJJRDBnWlhaaGJHVmtMbXB2YVc0b0oxeGNiaWNwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5Qk5iMlIxYkdWRmRtRnNkV0YwYVc5dVJYSnliM0lvZEdocGN5NTFjbXdzSUdWNEtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOWZTd2dlMzBzSUZWdVkyOWhkR1ZrVFc5a2RXeGxSVzUwY25rcE8xeHVJQ0JtZFc1amRHbHZiaUJuWlhSVmJtTnZZWFJsWkUxdlpIVnNaVWx1YzNSaGJuUnBZWFJ2Y2lodVlXMWxLU0I3WEc0Z0lDQWdhV1lnS0NGdVlXMWxLVnh1SUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUhaaGNpQjFjbXdnUFNCTmIyUjFiR1ZUZEc5eVpTNXViM0p0WVd4cGVtVW9ibUZ0WlNrN1hHNGdJQ0FnY21WMGRYSnVJRzF2WkhWc1pVbHVjM1JoYm5ScFlYUnZjbk5iZFhKc1hUdGNiaUFnZlZ4dUlDQTdYRzRnSUhaaGNpQnRiMlIxYkdWSmJuTjBZVzVqWlhNZ1BTQlBZbXBsWTNRdVkzSmxZWFJsS0c1MWJHd3BPMXh1SUNCMllYSWdiR2wyWlUxdlpIVnNaVk5sYm5ScGJtVnNJRDBnZTMwN1hHNGdJR1oxYm1OMGFXOXVJRTF2WkhWc1pTaDFibU52WVhSbFpFMXZaSFZzWlNrZ2UxeHVJQ0FnSUhaaGNpQnBjMHhwZG1VZ1BTQmhjbWQxYldWdWRITmJNVjA3WEc0Z0lDQWdkbUZ5SUdOdllYUmxaRTF2WkhWc1pTQTlJRTlpYW1WamRDNWpjbVZoZEdVb2JuVnNiQ2s3WEc0Z0lDQWdUMkpxWldOMExtZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTW9kVzVqYjJGMFpXUk5iMlIxYkdVcExtWnZja1ZoWTJnb0tHWjFibU4wYVc5dUtHNWhiV1VwSUh0Y2JpQWdJQ0FnSUhaaGNpQm5aWFIwWlhJc1hHNGdJQ0FnSUNBZ0lDQWdkbUZzZFdVN1hHNGdJQ0FnSUNCcFppQW9hWE5NYVhabElEMDlQU0JzYVhabFRXOWtkV3hsVTJWdWRHbHVaV3dwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR1JsYzJOeUlEMGdUMkpxWldOMExtZGxkRTkzYmxCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2loMWJtTnZZWFJsWkUxdlpIVnNaU3dnYm1GdFpTazdYRzRnSUNBZ0lDQWdJR2xtSUNoa1pYTmpjaTVuWlhRcFhHNGdJQ0FnSUNBZ0lDQWdaMlYwZEdWeUlEMGdaR1Z6WTNJdVoyVjBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdhV1lnS0NGblpYUjBaWElwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnNkV1VnUFNCMWJtTnZZWFJsWkUxdlpIVnNaVnR1WVcxbFhUdGNiaUFnSUNBZ0lDQWdaMlYwZEdWeUlEMGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhaaGJIVmxPMXh1SUNBZ0lDQWdJQ0I5TzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnVDJKcVpXTjBMbVJsWm1sdVpWQnliM0JsY25SNUtHTnZZWFJsWkUxdlpIVnNaU3dnYm1GdFpTd2dlMXh1SUNBZ0lDQWdJQ0JuWlhRNklHZGxkSFJsY2l4Y2JpQWdJQ0FnSUNBZ1pXNTFiV1Z5WVdKc1pUb2dkSEoxWlZ4dUlDQWdJQ0FnZlNrN1hHNGdJQ0FnZlNrcE8xeHVJQ0FnSUU5aWFtVmpkQzV3Y21WMlpXNTBSWGgwWlc1emFXOXVjeWhqYjJGMFpXUk5iMlIxYkdVcE8xeHVJQ0FnSUhKbGRIVnliaUJqYjJGMFpXUk5iMlIxYkdVN1hHNGdJSDFjYmlBZ2RtRnlJRTF2WkhWc1pWTjBiM0psSUQwZ2UxeHVJQ0FnSUc1dmNtMWhiR2w2WlRvZ1puVnVZM1JwYjI0b2JtRnRaU3dnY21WbVpYSmxjazVoYldVc0lISmxabVZ5WlhKQlpHUnlaWE56S1NCN1hHNGdJQ0FnSUNCcFppQW9kSGx3Wlc5bUlHNWhiV1VnSVQwOUlDZHpkSEpwYm1jbktWeHVJQ0FnSUNBZ0lDQjBhSEp2ZHlCdVpYY2dWSGx3WlVWeWNtOXlLQ2R0YjJSMWJHVWdibUZ0WlNCdGRYTjBJR0psSUdFZ2MzUnlhVzVuTENCdWIzUWdKeUFySUhSNWNHVnZaaUJ1WVcxbEtUdGNiaUFnSUNBZ0lHbG1JQ2hwYzBGaWMyOXNkWFJsS0c1aGJXVXBLVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdZMkZ1YjI1cFkyRnNhWHBsVlhKc0tHNWhiV1VwTzF4dUlDQWdJQ0FnYVdZZ0tDOWJYbHhjTGwxY1hDOWNYQzVjWEM1Y1hDOHZMblJsYzNRb2JtRnRaU2twSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lFVnljbTl5S0NkdGIyUjFiR1VnYm1GdFpTQmxiV0psWkhNZ0x5NHVMem9nSnlBcklHNWhiV1VwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tHNWhiV1ZiTUYwZ1BUMDlJQ2N1SnlBbUppQnlaV1psY21WeVRtRnRaU2xjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSEpsYzI5c2RtVlZjbXdvY21WbVpYSmxjazVoYldVc0lHNWhiV1VwTzF4dUlDQWdJQ0FnY21WMGRYSnVJR05oYm05dWFXTmhiR2w2WlZWeWJDaHVZVzFsS1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZERvZ1puVnVZM1JwYjI0b2JtOXliV0ZzYVhwbFpFNWhiV1VwSUh0Y2JpQWdJQ0FnSUhaaGNpQnRJRDBnWjJWMFZXNWpiMkYwWldSTmIyUjFiR1ZKYm5OMFlXNTBhV0YwYjNJb2JtOXliV0ZzYVhwbFpFNWhiV1VwTzF4dUlDQWdJQ0FnYVdZZ0tDRnRLVnh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkVzVrWldacGJtVmtPMXh1SUNBZ0lDQWdkbUZ5SUcxdlpIVnNaVWx1YzNSaGJtTmxJRDBnYlc5a2RXeGxTVzV6ZEdGdVkyVnpXMjB1ZFhKc1hUdGNiaUFnSUNBZ0lHbG1JQ2h0YjJSMWJHVkpibk4wWVc1alpTbGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHMXZaSFZzWlVsdWMzUmhibU5sTzF4dUlDQWdJQ0FnYlc5a2RXeGxTVzV6ZEdGdVkyVWdQU0JOYjJSMWJHVW9iUzVuWlhSVmJtTnZZWFJsWkUxdlpIVnNaU2dwTENCc2FYWmxUVzlrZFd4bFUyVnVkR2x1Wld3cE8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUcxdlpIVnNaVWx1YzNSaGJtTmxjMXR0TG5WeWJGMGdQU0J0YjJSMWJHVkpibk4wWVc1alpUdGNiaUFnSUNCOUxGeHVJQ0FnSUhObGREb2dablZ1WTNScGIyNG9ibTl5YldGc2FYcGxaRTVoYldVc0lHMXZaSFZzWlNrZ2UxeHVJQ0FnSUNBZ2JtOXliV0ZzYVhwbFpFNWhiV1VnUFNCVGRISnBibWNvYm05eWJXRnNhWHBsWkU1aGJXVXBPMXh1SUNBZ0lDQWdiVzlrZFd4bFNXNXpkR0Z1ZEdsaGRHOXljMXR1YjNKdFlXeHBlbVZrVG1GdFpWMGdQU0J1WlhjZ1ZXNWpiMkYwWldSTmIyUjFiR1ZKYm5OMFlXNTBhV0YwYjNJb2JtOXliV0ZzYVhwbFpFNWhiV1VzSUNobWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHMXZaSFZzWlR0Y2JpQWdJQ0FnSUgwcEtUdGNiaUFnSUNBZ0lHMXZaSFZzWlVsdWMzUmhibU5sYzF0dWIzSnRZV3hwZW1Wa1RtRnRaVjBnUFNCdGIyUjFiR1U3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnWW1GelpWVlNUQ2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJpWVhObFZWSk1PMXh1SUNBZ0lIMHNYRzRnSUNBZ2MyVjBJR0poYzJWVlVrd29kaWtnZTF4dUlDQWdJQ0FnWW1GelpWVlNUQ0E5SUZOMGNtbHVaeWgyS1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJSEpsWjJsemRHVnlUVzlrZFd4bE9pQm1kVzVqZEdsdmJpaHVZVzFsTENCa1pYQnpMQ0JtZFc1aktTQjdYRzRnSUNBZ0lDQjJZWElnYm05eWJXRnNhWHBsWkU1aGJXVWdQU0JOYjJSMWJHVlRkRzl5WlM1dWIzSnRZV3hwZW1Vb2JtRnRaU2s3WEc0Z0lDQWdJQ0JwWmlBb2JXOWtkV3hsU1c1emRHRnVkR2xoZEc5eWMxdHViM0p0WVd4cGVtVmtUbUZ0WlYwcFhHNGdJQ0FnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnblpIVndiR2xqWVhSbElHMXZaSFZzWlNCdVlXMWxaQ0FuSUNzZ2JtOXliV0ZzYVhwbFpFNWhiV1VwTzF4dUlDQWdJQ0FnYlc5a2RXeGxTVzV6ZEdGdWRHbGhkRzl5YzF0dWIzSnRZV3hwZW1Wa1RtRnRaVjBnUFNCdVpYY2dWVzVqYjJGMFpXUk5iMlIxYkdWSmJuTjBZVzUwYVdGMGIzSW9ibTl5YldGc2FYcGxaRTVoYldVc0lHWjFibU1wTzF4dUlDQWdJSDBzWEc0Z0lDQWdZblZ1Wkd4bFUzUnZjbVU2SUU5aWFtVmpkQzVqY21WaGRHVW9iblZzYkNrc1hHNGdJQ0FnY21WbmFYTjBaWEk2SUdaMWJtTjBhVzl1S0c1aGJXVXNJR1JsY0hNc0lHWjFibU1wSUh0Y2JpQWdJQ0FnSUdsbUlDZ2haR1Z3Y3lCOGZDQWhaR1Z3Y3k1c1pXNW5kR2dnSmlZZ0lXWjFibU11YkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjbVZuYVhOMFpYSk5iMlIxYkdVb2JtRnRaU3dnWkdWd2N5d2dablZ1WXlrN1hHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCMGFHbHpMbUoxYm1Sc1pWTjBiM0psVzI1aGJXVmRJRDBnZTF4dUlDQWdJQ0FnSUNBZ0lHUmxjSE02SUdSbGNITXNYRzRnSUNBZ0lDQWdJQ0FnWlhobFkzVjBaVG9nWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ0pGOWZNQ0E5SUdGeVozVnRaVzUwY3p0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoY2lCa1pYQk5ZWEFnUFNCN2ZUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdSbGNITXVabTl5UldGamFDZ29ablZ1WTNScGIyNG9aR1Z3TENCcGJtUmxlQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdaR1Z3VFdGd1cyUmxjRjBnUFNBa1gxOHdXMmx1WkdWNFhUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwcEtUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQnlaV2RwYzNSeWVVVnVkSEo1SUQwZ1puVnVZeTVqWVd4c0tIUm9hWE1zSUdSbGNFMWhjQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnlaV2RwYzNSeWVVVnVkSEo1TG1WNFpXTjFkR1V1WTJGc2JDaDBhR2x6S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQnlaV2RwYzNSeWVVVnVkSEo1TG1WNGNHOXlkSE03WEc0Z0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBRVzV2Ym5sdGIzVnpUVzlrZFd4bE9pQm1kVzVqZEdsdmJpaG1kVzVqS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYm1WM0lFMXZaSFZzWlNobWRXNWpMbU5oYkd3b1oyeHZZbUZzS1N3Z2JHbDJaVTF2WkhWc1pWTmxiblJwYm1Wc0tUdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRFWnZjbFJsYzNScGJtYzZJR1oxYm1OMGFXOXVLRzVoYldVcElIdGNiaUFnSUNBZ0lIWmhjaUFrWDE4d0lEMGdkR2hwY3p0Y2JpQWdJQ0FnSUdsbUlDZ2hkR2hwY3k1MFpYTjBhVzVuVUhKbFptbDRYeWtnZTF4dUlDQWdJQ0FnSUNCUFltcGxZM1F1YTJWNWN5aHRiMlIxYkdWSmJuTjBZVzVqWlhNcExuTnZiV1VvS0daMWJtTjBhVzl1S0d0bGVTa2dlMXh1SUNBZ0lDQWdJQ0FnSUhaaGNpQnRJRDBnTHloMGNtRmpaWFZ5UUZ0ZVhGd3ZYU3BjWEM4cEx5NWxlR1ZqS0d0bGVTazdYRzRnSUNBZ0lDQWdJQ0FnYVdZZ0tHMHBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDUmZYekF1ZEdWemRHbHVaMUJ5WldacGVGOGdQU0J0V3pGZE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSFJ5ZFdVN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5S1NrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NW5aWFFvZEdocGN5NTBaWE4wYVc1blVISmxabWw0WHlBcklHNWhiV1VwTzF4dUlDQWdJSDFjYmlBZ2ZUdGNiaUFnZG1GeUlHMXZaSFZzWlZOMGIzSmxUVzlrZFd4bElEMGdibVYzSUUxdlpIVnNaU2g3VFc5a2RXeGxVM1J2Y21VNklFMXZaSFZzWlZOMGIzSmxmU2s3WEc0Z0lFMXZaSFZzWlZOMGIzSmxMbk5sZENnblFIUnlZV05sZFhJdmMzSmpMM0oxYm5ScGJXVXZUVzlrZFd4bFUzUnZjbVVuTENCdGIyUjFiR1ZUZEc5eVpVMXZaSFZzWlNrN1hHNGdJRTF2WkhWc1pWTjBiM0psTG5ObGRDZ25RSFJ5WVdObGRYSXZjM0pqTDNKMWJuUnBiV1V2VFc5a2RXeGxVM1J2Y21VdWFuTW5MQ0J0YjJSMWJHVlRkRzl5WlUxdlpIVnNaU2s3WEc0Z0lIWmhjaUJ6WlhSMWNFZHNiMkpoYkhNZ1BTQWtkSEpoWTJWMWNsSjFiblJwYldVdWMyVjBkWEJIYkc5aVlXeHpPMXh1SUNBa2RISmhZMlYxY2xKMWJuUnBiV1V1YzJWMGRYQkhiRzlpWVd4eklEMGdablZ1WTNScGIyNG9aMnh2WW1Gc0tTQjdYRzRnSUNBZ2MyVjBkWEJIYkc5aVlXeHpLR2RzYjJKaGJDazdYRzRnSUgwN1hHNGdJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNU5iMlIxYkdWVGRHOXlaU0E5SUUxdlpIVnNaVk4wYjNKbE8xeHVJQ0JuYkc5aVlXd3VVM2x6ZEdWdElEMGdlMXh1SUNBZ0lISmxaMmx6ZEdWeU9pQk5iMlIxYkdWVGRHOXlaUzV5WldkcGMzUmxjaTVpYVc1a0tFMXZaSFZzWlZOMGIzSmxLU3hjYmlBZ0lDQnlaV2RwYzNSbGNrMXZaSFZzWlRvZ1RXOWtkV3hsVTNSdmNtVXVjbVZuYVhOMFpYSk5iMlIxYkdVdVltbHVaQ2hOYjJSMWJHVlRkRzl5WlNrc1hHNGdJQ0FnWjJWME9pQk5iMlIxYkdWVGRHOXlaUzVuWlhRc1hHNGdJQ0FnYzJWME9pQk5iMlIxYkdWVGRHOXlaUzV6WlhRc1hHNGdJQ0FnYm05eWJXRnNhWHBsT2lCTmIyUjFiR1ZUZEc5eVpTNXViM0p0WVd4cGVtVmNiaUFnZlR0Y2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExtZGxkRTF2WkhWc1pVbHRjR3dnUFNCbWRXNWpkR2x2YmlodVlXMWxLU0I3WEc0Z0lDQWdkbUZ5SUdsdWMzUmhiblJwWVhSdmNpQTlJR2RsZEZWdVkyOWhkR1ZrVFc5a2RXeGxTVzV6ZEdGdWRHbGhkRzl5S0c1aGJXVXBPMXh1SUNBZ0lISmxkSFZ5YmlCcGJuTjBZVzUwYVdGMGIzSWdKaVlnYVc1emRHRnVkR2xoZEc5eUxtZGxkRlZ1WTI5aGRHVmtUVzlrZFd4bEtDazdYRzRnSUgwN1hHNTlLU2gwZVhCbGIyWWdkMmx1Wkc5M0lDRTlQU0FuZFc1a1pXWnBibVZrSnlBL0lIZHBibVJ2ZHlBNklIUjVjR1Z2WmlCbmJHOWlZV3dnSVQwOUlDZDFibVJsWm1sdVpXUW5JRDhnWjJ4dlltRnNJRG9nZEhsd1pXOW1JSE5sYkdZZ0lUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z2MyVnNaaUE2SUhSb2FYTXBPMXh1VTNsemRHVnRMbkpsWjJsemRHVnlUVzlrZFd4bEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZkWFJwYkhNdWFuTmNJaXdnVzEwc0lHWjFibU4wYVc5dUtDa2dlMXh1SUNCY0luVnpaU0J6ZEhKcFkzUmNJanRjYmlBZ2RtRnlJRjlmYlc5a2RXeGxUbUZ0WlNBOUlGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZkWFJwYkhNdWFuTmNJanRjYmlBZ2RtRnlJQ1JqWldsc0lEMGdUV0YwYUM1alpXbHNPMXh1SUNCMllYSWdKR1pzYjI5eUlEMGdUV0YwYUM1bWJHOXZjanRjYmlBZ2RtRnlJQ1JwYzBacGJtbDBaU0E5SUdselJtbHVhWFJsTzF4dUlDQjJZWElnSkdselRtRk9JRDBnYVhOT1lVNDdYRzRnSUhaaGNpQWtjRzkzSUQwZ1RXRjBhQzV3YjNjN1hHNGdJSFpoY2lBa2JXbHVJRDBnVFdGMGFDNXRhVzQ3WEc0Z0lIWmhjaUIwYjA5aWFtVmpkQ0E5SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzUwYjA5aWFtVmpkRHRjYmlBZ1puVnVZM1JwYjI0Z2RHOVZhVzUwTXpJb2VDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCNElENCtQaUF3TzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdselQySnFaV04wS0hncElIdGNiaUFnSUNCeVpYUjFjbTRnZUNBbUppQW9kSGx3Wlc5bUlIZ2dQVDA5SUNkdlltcGxZM1FuSUh4OElIUjVjR1Z2WmlCNElEMDlQU0FuWm5WdVkzUnBiMjRuS1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCcGMwTmhiR3hoWW14bEtIZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z2RIbHdaVzltSUhnZ1BUMDlJQ2RtZFc1amRHbHZiaWM3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnYVhOT2RXMWlaWElvZUNrZ2UxeHVJQ0FnSUhKbGRIVnliaUIwZVhCbGIyWWdlQ0E5UFQwZ0oyNTFiV0psY2ljN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2RHOUpiblJsWjJWeUtIZ3BJSHRjYmlBZ0lDQjRJRDBnSzNnN1hHNGdJQ0FnYVdZZ0tDUnBjMDVoVGloNEtTbGNiaUFnSUNBZ0lISmxkSFZ5YmlBd08xeHVJQ0FnSUdsbUlDaDRJRDA5UFNBd0lIeDhJQ0VrYVhOR2FXNXBkR1VvZUNrcFhHNGdJQ0FnSUNCeVpYUjFjbTRnZUR0Y2JpQWdJQ0J5WlhSMWNtNGdlQ0ErSURBZ1B5QWtabXh2YjNJb2VDa2dPaUFrWTJWcGJDaDRLVHRjYmlBZ2ZWeHVJQ0IyWVhJZ1RVRllYMU5CUmtWZlRFVk9SMVJJSUQwZ0pIQnZkeWd5TENBMU15a2dMU0F4TzF4dUlDQm1kVzVqZEdsdmJpQjBiMHhsYm1kMGFDaDRLU0I3WEc0Z0lDQWdkbUZ5SUd4bGJpQTlJSFJ2U1c1MFpXZGxjaWg0S1R0Y2JpQWdJQ0J5WlhSMWNtNGdiR1Z1SUR3Z01DQS9JREFnT2lBa2JXbHVLR3hsYml3Z1RVRllYMU5CUmtWZlRFVk9SMVJJS1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCamFHVmphMGwwWlhKaFlteGxLSGdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdJV2x6VDJKcVpXTjBLSGdwSUQ4Z2RXNWtaV1pwYm1Wa0lEb2dlRnRUZVcxaWIyd3VhWFJsY21GMGIzSmRPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR2x6UTI5dWMzUnlkV04wYjNJb2VDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCcGMwTmhiR3hoWW14bEtIZ3BPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR055WldGMFpVbDBaWEpoZEc5eVVtVnpkV3gwVDJKcVpXTjBLSFpoYkhWbExDQmtiMjVsS1NCN1hHNGdJQ0FnY21WMGRYSnVJSHRjYmlBZ0lDQWdJSFpoYkhWbE9pQjJZV3gxWlN4Y2JpQWdJQ0FnSUdSdmJtVTZJR1J2Ym1WY2JpQWdJQ0I5TzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUcxaGVXSmxSR1ZtYVc1bEtHOWlhbVZqZEN3Z2JtRnRaU3dnWkdWelkzSXBJSHRjYmlBZ0lDQnBaaUFvSVNodVlXMWxJR2x1SUc5aWFtVmpkQ2twSUh0Y2JpQWdJQ0FnSUU5aWFtVmpkQzVrWldacGJtVlFjbTl3WlhKMGVTaHZZbXBsWTNRc0lHNWhiV1VzSUdSbGMyTnlLVHRjYmlBZ0lDQjlYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdiV0Y1WW1WRVpXWnBibVZOWlhSb2IyUW9iMkpxWldOMExDQnVZVzFsTENCMllXeDFaU2tnZTF4dUlDQWdJRzFoZVdKbFJHVm1hVzVsS0c5aWFtVmpkQ3dnYm1GdFpTd2dlMXh1SUNBZ0lDQWdkbUZzZFdVNklIWmhiSFZsTEZ4dUlDQWdJQ0FnWTI5dVptbG5kWEpoWW14bE9pQjBjblZsTEZ4dUlDQWdJQ0FnWlc1MWJXVnlZV0pzWlRvZ1ptRnNjMlVzWEc0Z0lDQWdJQ0IzY21sMFlXSnNaVG9nZEhKMVpWeHVJQ0FnSUgwcE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHMWhlV0psUkdWbWFXNWxRMjl1YzNRb2IySnFaV04wTENCdVlXMWxMQ0IyWVd4MVpTa2dlMXh1SUNBZ0lHMWhlV0psUkdWbWFXNWxLRzlpYW1WamRDd2dibUZ0WlN3Z2UxeHVJQ0FnSUNBZ2RtRnNkV1U2SUhaaGJIVmxMRnh1SUNBZ0lDQWdZMjl1Wm1sbmRYSmhZbXhsT2lCbVlXeHpaU3hjYmlBZ0lDQWdJR1Z1ZFcxbGNtRmliR1U2SUdaaGJITmxMRnh1SUNBZ0lDQWdkM0pwZEdGaWJHVTZJR1poYkhObFhHNGdJQ0FnZlNrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2JXRjVZbVZCWkdSR2RXNWpkR2x2Ym5Nb2IySnFaV04wTENCbWRXNWpkR2x2Ym5NcElIdGNiaUFnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElHWjFibU4wYVc5dWN5NXNaVzVuZEdnN0lHa2dLejBnTWlrZ2UxeHVJQ0FnSUNBZ2RtRnlJRzVoYldVZ1BTQm1kVzVqZEdsdmJuTmJhVjA3WEc0Z0lDQWdJQ0IyWVhJZ2RtRnNkV1VnUFNCbWRXNWpkR2x2Ym5OYmFTQXJJREZkTzF4dUlDQWdJQ0FnYldGNVltVkVaV1pwYm1WTlpYUm9iMlFvYjJKcVpXTjBMQ0J1WVcxbExDQjJZV3gxWlNrN1hHNGdJQ0FnZlZ4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUcxaGVXSmxRV1JrUTI5dWMzUnpLRzlpYW1WamRDd2dZMjl1YzNSektTQjdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQmpiMjV6ZEhNdWJHVnVaM1JvT3lCcElDczlJRElwSUh0Y2JpQWdJQ0FnSUhaaGNpQnVZVzFsSUQwZ1kyOXVjM1J6VzJsZE8xeHVJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdZMjl1YzNSelcya2dLeUF4WFR0Y2JpQWdJQ0FnSUcxaGVXSmxSR1ZtYVc1bFEyOXVjM1FvYjJKcVpXTjBMQ0J1WVcxbExDQjJZV3gxWlNrN1hHNGdJQ0FnZlZ4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUcxaGVXSmxRV1JrU1hSbGNtRjBiM0lvYjJKcVpXTjBMQ0JtZFc1akxDQlRlVzFpYjJ3cElIdGNiaUFnSUNCcFppQW9JVk41YldKdmJDQjhmQ0FoVTNsdFltOXNMbWwwWlhKaGRHOXlJSHg4SUc5aWFtVmpkRnRUZVcxaWIyd3VhWFJsY21GMGIzSmRLVnh1SUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUdsbUlDaHZZbXBsWTNSYkowQkFhWFJsY21GMGIzSW5YU2xjYmlBZ0lDQWdJR1oxYm1NZ1BTQnZZbXBsWTNSYkowQkFhWFJsY21GMGIzSW5YVHRjYmlBZ0lDQlBZbXBsWTNRdVpHVm1hVzVsVUhKdmNHVnlkSGtvYjJKcVpXTjBMQ0JUZVcxaWIyd3VhWFJsY21GMGIzSXNJSHRjYmlBZ0lDQWdJSFpoYkhWbE9pQm1kVzVqTEZ4dUlDQWdJQ0FnWTI5dVptbG5kWEpoWW14bE9pQjBjblZsTEZ4dUlDQWdJQ0FnWlc1MWJXVnlZV0pzWlRvZ1ptRnNjMlVzWEc0Z0lDQWdJQ0IzY21sMFlXSnNaVG9nZEhKMVpWeHVJQ0FnSUgwcE8xeHVJQ0I5WEc0Z0lIWmhjaUJ3YjJ4NVptbHNiSE1nUFNCYlhUdGNiaUFnWm5WdVkzUnBiMjRnY21WbmFYTjBaWEpRYjJ4NVptbHNiQ2htZFc1aktTQjdYRzRnSUNBZ2NHOXNlV1pwYkd4ekxuQjFjMmdvWm5WdVl5azdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjRzlzZVdacGJHeEJiR3dvWjJ4dlltRnNLU0I3WEc0Z0lDQWdjRzlzZVdacGJHeHpMbVp2Y2tWaFkyZ29LR1oxYm1OMGFXOXVLR1lwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJtS0dkc2IySmhiQ2s3WEc0Z0lDQWdmU2twTzF4dUlDQjlYRzRnSUhKbGRIVnliaUI3WEc0Z0lDQWdaMlYwSUhSdlQySnFaV04wS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhSdlQySnFaV04wTzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUhSdlZXbHVkRE15S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhSdlZXbHVkRE15TzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUdselQySnFaV04wS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdselQySnFaV04wTzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUdselEyRnNiR0ZpYkdVb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2FYTkRZV3hzWVdKc1pUdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQnBjMDUxYldKbGNpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnBjMDUxYldKbGNqdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQjBiMGx1ZEdWblpYSW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdkRzlKYm5SbFoyVnlPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJSFJ2VEdWdVozUm9LQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSFJ2VEdWdVozUm9PMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJR05vWldOclNYUmxjbUZpYkdVb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1kyaGxZMnRKZEdWeVlXSnNaVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0JwYzBOdmJuTjBjblZqZEc5eUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHbHpRMjl1YzNSeWRXTjBiM0k3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnWTNKbFlYUmxTWFJsY21GMGIzSlNaWE4xYkhSUFltcGxZM1FvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWTNKbFlYUmxTWFJsY21GMGIzSlNaWE4xYkhSUFltcGxZM1E3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnYldGNVltVkVaV1pwYm1Vb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2JXRjVZbVZFWldacGJtVTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdiV0Y1WW1WRVpXWnBibVZOWlhSb2IyUW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiV0Y1WW1WRVpXWnBibVZOWlhSb2IyUTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdiV0Y1WW1WRVpXWnBibVZEYjI1emRDZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnRZWGxpWlVSbFptbHVaVU52Ym5OME8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHMWhlV0psUVdSa1JuVnVZM1JwYjI1ektDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHMWhlV0psUVdSa1JuVnVZM1JwYjI1ek8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHMWhlV0psUVdSa1EyOXVjM1J6S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUcxaGVXSmxRV1JrUTI5dWMzUnpPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJRzFoZVdKbFFXUmtTWFJsY21GMGIzSW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiV0Y1WW1WQlpHUkpkR1Z5WVhSdmNqdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQnlaV2RwYzNSbGNsQnZiSGxtYVd4c0tDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlISmxaMmx6ZEdWeVVHOXNlV1pwYkd3N1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2NHOXNlV1pwYkd4QmJHd29LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdjRzlzZVdacGJHeEJiR3c3WEc0Z0lDQWdmVnh1SUNCOU8xeHVmU2s3WEc1VGVYTjBaVzB1Y21WbmFYTjBaWEpOYjJSMWJHVW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlOWVhBdWFuTmNJaXdnVzEwc0lHWjFibU4wYVc5dUtDa2dlMXh1SUNCY0luVnpaU0J6ZEhKcFkzUmNJanRjYmlBZ2RtRnlJRjlmYlc5a2RXeGxUbUZ0WlNBOUlGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZUV0Z3TG1welhDSTdYRzRnSUhaaGNpQWtYMTh3SUQwZ1UzbHpkR1Z0TG1kbGRDaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMM1YwYVd4ekxtcHpYQ0lwTEZ4dUlDQWdJQ0FnYVhOUFltcGxZM1FnUFNBa1gxOHdMbWx6VDJKcVpXTjBMRnh1SUNBZ0lDQWdiV0Y1WW1WQlpHUkpkR1Z5WVhSdmNpQTlJQ1JmWHpBdWJXRjVZbVZCWkdSSmRHVnlZWFJ2Y2l4Y2JpQWdJQ0FnSUhKbFoybHpkR1Z5VUc5c2VXWnBiR3dnUFNBa1gxOHdMbkpsWjJsemRHVnlVRzlzZVdacGJHdzdYRzRnSUhaaGNpQm5aWFJQZDI1SVlYTm9UMkpxWldOMElEMGdKSFJ5WVdObGRYSlNkVzUwYVcxbExtZGxkRTkzYmtoaGMyaFBZbXBsWTNRN1hHNGdJSFpoY2lBa2FHRnpUM2R1VUhKdmNHVnlkSGtnUFNCUFltcGxZM1F1Y0hKdmRHOTBlWEJsTG1oaGMwOTNibEJ5YjNCbGNuUjVPMXh1SUNCMllYSWdaR1ZzWlhSbFpGTmxiblJwYm1Wc0lEMGdlMzA3WEc0Z0lHWjFibU4wYVc5dUlHeHZiMnQxY0VsdVpHVjRLRzFoY0N3Z2EyVjVLU0I3WEc0Z0lDQWdhV1lnS0dselQySnFaV04wS0d0bGVTa3BJSHRjYmlBZ0lDQWdJSFpoY2lCb1lYTm9UMkpxWldOMElEMGdaMlYwVDNkdVNHRnphRTlpYW1WamRDaHJaWGtwTzF4dUlDQWdJQ0FnY21WMGRYSnVJR2hoYzJoUFltcGxZM1FnSmlZZ2JXRndMbTlpYW1WamRFbHVaR1Y0WDF0b1lYTm9UMkpxWldOMExtaGhjMmhkTzF4dUlDQWdJSDFjYmlBZ0lDQnBaaUFvZEhsd1pXOW1JR3RsZVNBOVBUMGdKM04wY21sdVp5Y3BYRzRnSUNBZ0lDQnlaWFIxY200Z2JXRndMbk4wY21sdVowbHVaR1Y0WDF0clpYbGRPMXh1SUNBZ0lISmxkSFZ5YmlCdFlYQXVjSEpwYldsMGFYWmxTVzVrWlhoZlcydGxlVjA3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnYVc1cGRFMWhjQ2h0WVhBcElIdGNiaUFnSUNCdFlYQXVaVzUwY21sbGMxOGdQU0JiWFR0Y2JpQWdJQ0J0WVhBdWIySnFaV04wU1c1a1pYaGZJRDBnVDJKcVpXTjBMbU55WldGMFpTaHVkV3hzS1R0Y2JpQWdJQ0J0WVhBdWMzUnlhVzVuU1c1a1pYaGZJRDBnVDJKcVpXTjBMbU55WldGMFpTaHVkV3hzS1R0Y2JpQWdJQ0J0WVhBdWNISnBiV2wwYVhabFNXNWtaWGhmSUQwZ1QySnFaV04wTG1OeVpXRjBaU2h1ZFd4c0tUdGNiaUFnSUNCdFlYQXVaR1ZzWlhSbFpFTnZkVzUwWHlBOUlEQTdYRzRnSUgxY2JpQWdkbUZ5SUUxaGNDQTlJR1oxYm1OMGFXOXVJRTFoY0NncElIdGNiaUFnSUNCMllYSWdhWFJsY21GaWJHVWdQU0JoY21kMWJXVnVkSE5iTUYwN1hHNGdJQ0FnYVdZZ0tDRnBjMDlpYW1WamRDaDBhR2x6S1NsY2JpQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0owMWhjQ0JqWVd4c1pXUWdiMjRnYVc1amIyMXdZWFJwWW14bElIUjVjR1VuS1R0Y2JpQWdJQ0JwWmlBb0pHaGhjMDkzYmxCeWIzQmxjblI1TG1OaGJHd29kR2hwY3l3Z0oyVnVkSEpwWlhOZkp5a3BJSHRjYmlBZ0lDQWdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0lvSjAxaGNDQmpZVzRnYm05MElHSmxJSEpsWlc1MGNtRnVkR3g1SUdsdWFYUnBZV3hwYzJWa0p5azdYRzRnSUNBZ2ZWeHVJQ0FnSUdsdWFYUk5ZWEFvZEdocGN5azdYRzRnSUNBZ2FXWWdLR2wwWlhKaFlteGxJQ0U5UFNCdWRXeHNJQ1ltSUdsMFpYSmhZbXhsSUNFOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJQ1JmWHpJZ1BTQnBkR1Z5WVdKc1pWc2tkSEpoWTJWMWNsSjFiblJwYldVdWRHOVFjbTl3WlhKMGVTaFRlVzFpYjJ3dWFYUmxjbUYwYjNJcFhTZ3BMRnh1SUNBZ0lDQWdJQ0FnSUNSZlh6TTdJQ0VvSkY5Zk15QTlJQ1JmWHpJdWJtVjRkQ2dwS1M1a2IyNWxPeUFwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJQ1JmWHpRZ1BTQWtYMTh6TG5aaGJIVmxMRnh1SUNBZ0lDQWdJQ0FnSUNBZ2EyVjVJRDBnSkY5Zk5Gc3dYU3hjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhiSFZsSUQwZ0pGOWZORnN4WFR0Y2JpQWdJQ0FnSUNBZ2UxeHVJQ0FnSUNBZ0lDQWdJSFJvYVhNdWMyVjBLR3RsZVN3Z2RtRnNkV1VwTzF4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dUlDQjlPMXh1SUNBb0pIUnlZV05sZFhKU2RXNTBhVzFsTG1OeVpXRjBaVU5zWVhOektTaE5ZWEFzSUh0Y2JpQWdJQ0JuWlhRZ2MybDZaU2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxtVnVkSEpwWlhOZkxteGxibWQwYUNBdklESWdMU0IwYUdsekxtUmxiR1YwWldSRGIzVnVkRjg3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFE2SUdaMWJtTjBhVzl1S0d0bGVTa2dlMXh1SUNBZ0lDQWdkbUZ5SUdsdVpHVjRJRDBnYkc5dmEzVndTVzVrWlhnb2RHaHBjeXdnYTJWNUtUdGNiaUFnSUNBZ0lHbG1JQ2hwYm1SbGVDQWhQVDBnZFc1a1pXWnBibVZrS1Z4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NWxiblJ5YVdWelgxdHBibVJsZUNBcklERmRPMXh1SUNBZ0lIMHNYRzRnSUNBZ2MyVjBPaUJtZFc1amRHbHZiaWhyWlhrc0lIWmhiSFZsS1NCN1hHNGdJQ0FnSUNCMllYSWdiMkpxWldOMFRXOWtaU0E5SUdselQySnFaV04wS0d0bGVTazdYRzRnSUNBZ0lDQjJZWElnYzNSeWFXNW5UVzlrWlNBOUlIUjVjR1Z2WmlCclpYa2dQVDA5SUNkemRISnBibWNuTzF4dUlDQWdJQ0FnZG1GeUlHbHVaR1Y0SUQwZ2JHOXZhM1Z3U1c1a1pYZ29kR2hwY3l3Z2EyVjVLVHRjYmlBZ0lDQWdJR2xtSUNocGJtUmxlQ0FoUFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVpXNTBjbWxsYzE5YmFXNWtaWGdnS3lBeFhTQTlJSFpoYkhWbE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2FXNWtaWGdnUFNCMGFHbHpMbVZ1ZEhKcFpYTmZMbXhsYm1kMGFEdGNiaUFnSUNBZ0lDQWdkR2hwY3k1bGJuUnlhV1Z6WDF0cGJtUmxlRjBnUFNCclpYazdYRzRnSUNBZ0lDQWdJSFJvYVhNdVpXNTBjbWxsYzE5YmFXNWtaWGdnS3lBeFhTQTlJSFpoYkhWbE8xeHVJQ0FnSUNBZ0lDQnBaaUFvYjJKcVpXTjBUVzlrWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJSFpoY2lCb1lYTm9UMkpxWldOMElEMGdaMlYwVDNkdVNHRnphRTlpYW1WamRDaHJaWGtwTzF4dUlDQWdJQ0FnSUNBZ0lIWmhjaUJvWVhOb0lEMGdhR0Z6YUU5aWFtVmpkQzVvWVhOb08xeHVJQ0FnSUNBZ0lDQWdJSFJvYVhNdWIySnFaV04wU1c1a1pYaGZXMmhoYzJoZElEMGdhVzVrWlhnN1hHNGdJQ0FnSUNBZ0lIMGdaV3h6WlNCcFppQW9jM1J5YVc1blRXOWtaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIUm9hWE11YzNSeWFXNW5TVzVrWlhoZlcydGxlVjBnUFNCcGJtUmxlRHRjYmlBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMbkJ5YVcxcGRHbDJaVWx1WkdWNFgxdHJaWGxkSUQwZ2FXNWtaWGc3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsek8xeHVJQ0FnSUgwc1hHNGdJQ0FnYUdGek9pQm1kVzVqZEdsdmJpaHJaWGtwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJzYjI5cmRYQkpibVJsZUNoMGFHbHpMQ0JyWlhrcElDRTlQU0IxYm1SbFptbHVaV1E3WEc0Z0lDQWdmU3hjYmlBZ0lDQmtaV3hsZEdVNklHWjFibU4wYVc5dUtHdGxlU2tnZTF4dUlDQWdJQ0FnZG1GeUlHOWlhbVZqZEUxdlpHVWdQU0JwYzA5aWFtVmpkQ2hyWlhrcE8xeHVJQ0FnSUNBZ2RtRnlJSE4wY21sdVowMXZaR1VnUFNCMGVYQmxiMllnYTJWNUlEMDlQU0FuYzNSeWFXNW5KenRjYmlBZ0lDQWdJSFpoY2lCcGJtUmxlRHRjYmlBZ0lDQWdJSFpoY2lCb1lYTm9PMXh1SUNBZ0lDQWdhV1lnS0c5aWFtVmpkRTF2WkdVcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUdoaGMyaFBZbXBsWTNRZ1BTQm5aWFJQZDI1SVlYTm9UMkpxWldOMEtHdGxlU2s3WEc0Z0lDQWdJQ0FnSUdsbUlDaG9ZWE5vVDJKcVpXTjBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2FXNWtaWGdnUFNCMGFHbHpMbTlpYW1WamRFbHVaR1Y0WDF0b1lYTm9JRDBnYUdGemFFOWlhbVZqZEM1b1lYTm9YVHRjYmlBZ0lDQWdJQ0FnSUNCa1pXeGxkR1VnZEdocGN5NXZZbXBsWTNSSmJtUmxlRjliYUdGemFGMDdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDBnWld4elpTQnBaaUFvYzNSeWFXNW5UVzlrWlNrZ2UxeHVJQ0FnSUNBZ0lDQnBibVJsZUNBOUlIUm9hWE11YzNSeWFXNW5TVzVrWlhoZlcydGxlVjA3WEc0Z0lDQWdJQ0FnSUdSbGJHVjBaU0IwYUdsekxuTjBjbWx1WjBsdVpHVjRYMXRyWlhsZE8xeHVJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ2FXNWtaWGdnUFNCMGFHbHpMbkJ5YVcxcGRHbDJaVWx1WkdWNFgxdHJaWGxkTzF4dUlDQWdJQ0FnSUNCa1pXeGxkR1VnZEdocGN5NXdjbWx0YVhScGRtVkpibVJsZUY5YmEyVjVYVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNocGJtUmxlQ0FoUFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJSFJvYVhNdVpXNTBjbWxsYzE5YmFXNWtaWGhkSUQwZ1pHVnNaWFJsWkZObGJuUnBibVZzTzF4dUlDQWdJQ0FnSUNCMGFHbHpMbVZ1ZEhKcFpYTmZXMmx1WkdWNElDc2dNVjBnUFNCMWJtUmxabWx1WldRN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WkdWc1pYUmxaRU52ZFc1MFh5c3JPMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdkSEoxWlR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnSUNCOUxGeHVJQ0FnSUdOc1pXRnlPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUdsdWFYUk5ZWEFvZEdocGN5azdYRzRnSUNBZ2ZTeGNiaUFnSUNCbWIzSkZZV05vT2lCbWRXNWpkR2x2YmloallXeHNZbUZqYTBadUtTQjdYRzRnSUNBZ0lDQjJZWElnZEdocGMwRnlaeUE5SUdGeVozVnRaVzUwYzFzeFhUdGNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dkR2hwY3k1bGJuUnlhV1Z6WHk1c1pXNW5kR2c3SUdrZ0t6MGdNaWtnZTF4dUlDQWdJQ0FnSUNCMllYSWdhMlY1SUQwZ2RHaHBjeTVsYm5SeWFXVnpYMXRwWFR0Y2JpQWdJQ0FnSUNBZ2RtRnlJSFpoYkhWbElEMGdkR2hwY3k1bGJuUnlhV1Z6WDF0cElDc2dNVjA3WEc0Z0lDQWdJQ0FnSUdsbUlDaHJaWGtnUFQwOUlHUmxiR1YwWldSVFpXNTBhVzVsYkNsY2JpQWdJQ0FnSUNBZ0lDQmpiMjUwYVc1MVpUdGNiaUFnSUNBZ0lDQWdZMkZzYkdKaFkydEdiaTVqWVd4c0tIUm9hWE5CY21jc0lIWmhiSFZsTENCclpYa3NJSFJvYVhNcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgwc1hHNGdJQ0FnWlc1MGNtbGxjem9nSkhSeVlXTmxkWEpTZFc1MGFXMWxMbWx1YVhSSFpXNWxjbUYwYjNKR2RXNWpkR2x2YmlobWRXNWpkR2x2YmlBa1gxODFLQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHa3NYRzRnSUNBZ0lDQWdJQ0FnYTJWNUxGeHVJQ0FnSUNBZ0lDQWdJSFpoYkhWbE8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVqY21WaGRHVkhaVzVsY21GMGIzSkpibk4wWVc1alpTaG1kVzVqZEdsdmJpZ2tZM1I0S1NCN1hHNGdJQ0FnSUNBZ0lIZG9hV3hsSUNoMGNuVmxLVnh1SUNBZ0lDQWdJQ0FnSUhOM2FYUmphQ0FvSkdOMGVDNXpkR0YwWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJGelpTQXdPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnBJRDBnTUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlERXlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ01USTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0FvYVNBOElIUm9hWE11Wlc1MGNtbGxjMTh1YkdWdVozUm9LU0EvSURnZ09pQXRNanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElEUTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHa2dLejBnTWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlERXlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ09EcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2EyVjVJRDBnZEdocGN5NWxiblJ5YVdWelgxdHBYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZzZFdVZ1BTQjBhR2x6TG1WdWRISnBaWE5mVzJrZ0t5QXhYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SURrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyRnpaU0E1T2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWTNSNExuTjBZWFJsSUQwZ0tHdGxlU0E5UFQwZ1pHVnNaWFJsWkZObGJuUnBibVZzS1NBL0lEUWdPaUEyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdOanBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SURJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJiYTJWNUxDQjJZV3gxWlYwN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElESTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YldGNVltVlVhSEp2ZHlncE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1kzUjRMbk4wWVhSbElEMGdORHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JrWldaaGRXeDBPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z0pHTjBlQzVsYm1Rb0tUdGNiaUFnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5TENBa1gxODFMQ0IwYUdsektUdGNiaUFnSUNCOUtTeGNiaUFnSUNCclpYbHpPaUFrZEhKaFkyVjFjbEoxYm5ScGJXVXVhVzVwZEVkbGJtVnlZWFJ2Y2taMWJtTjBhVzl1S0daMWJtTjBhVzl1SUNSZlh6WW9LU0I3WEc0Z0lDQWdJQ0IyWVhJZ2FTeGNiaUFnSUNBZ0lDQWdJQ0JyWlhrc1hHNGdJQ0FnSUNBZ0lDQWdkbUZzZFdVN1hHNGdJQ0FnSUNCeVpYUjFjbTRnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU55WldGMFpVZGxibVZ5WVhSdmNrbHVjM1JoYm1ObEtHWjFibU4wYVc5dUtDUmpkSGdwSUh0Y2JpQWdJQ0FnSUNBZ2QyaHBiR1VnS0hSeWRXVXBYRzRnSUNBZ0lDQWdJQ0FnYzNkcGRHTm9JQ2drWTNSNExuTjBZWFJsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElEQTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHa2dQU0F3TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWTNSNExuTjBZWFJsSUQwZ01USTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdZMkZ6WlNBeE1qcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJQ2hwSUR3Z2RHaHBjeTVsYm5SeWFXVnpYeTVzWlc1bmRHZ3BJRDhnT0NBNklDMHlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ05EcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2FTQXJQU0F5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWTNSNExuTjBZWFJsSUQwZ01USTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdZMkZ6WlNBNE9seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCclpYa2dQU0IwYUdsekxtVnVkSEpwWlhOZlcybGRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQjJZV3gxWlNBOUlIUm9hWE11Wlc1MGNtbGxjMTliYVNBcklERmRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtZM1I0TG5OMFlYUmxJRDBnT1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJRGs2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBb2EyVjVJRDA5UFNCa1pXeGxkR1ZrVTJWdWRHbHVaV3dwSUQ4Z05DQTZJRFk3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJGelpTQTJPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtZM1I0TG5OMFlYUmxJRDBnTWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR3RsZVR0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ01qcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV0WVhsaVpWUm9jbTkzS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQTBPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1JsWm1GMWJIUTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBa1kzUjRMbVZ1WkNncE8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDBzSUNSZlh6WXNJSFJvYVhNcE8xeHVJQ0FnSUgwcExGeHVJQ0FnSUhaaGJIVmxjem9nSkhSeVlXTmxkWEpTZFc1MGFXMWxMbWx1YVhSSFpXNWxjbUYwYjNKR2RXNWpkR2x2YmlobWRXNWpkR2x2YmlBa1gxODNLQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHa3NYRzRnSUNBZ0lDQWdJQ0FnYTJWNUxGeHVJQ0FnSUNBZ0lDQWdJSFpoYkhWbE8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVqY21WaGRHVkhaVzVsY21GMGIzSkpibk4wWVc1alpTaG1kVzVqZEdsdmJpZ2tZM1I0S1NCN1hHNGdJQ0FnSUNBZ0lIZG9hV3hsSUNoMGNuVmxLVnh1SUNBZ0lDQWdJQ0FnSUhOM2FYUmphQ0FvSkdOMGVDNXpkR0YwWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJGelpTQXdPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnBJRDBnTUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlERXlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ01USTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0FvYVNBOElIUm9hWE11Wlc1MGNtbGxjMTh1YkdWdVozUm9LU0EvSURnZ09pQXRNanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElEUTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHa2dLejBnTWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlERXlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ09EcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2EyVjVJRDBnZEdocGN5NWxiblJ5YVdWelgxdHBYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdkbUZzZFdVZ1BTQjBhR2x6TG1WdWRISnBaWE5mVzJrZ0t5QXhYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SURrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyRnpaU0E1T2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWTNSNExuTjBZWFJsSUQwZ0tHdGxlU0E5UFQwZ1pHVnNaWFJsWkZObGJuUnBibVZzS1NBL0lEUWdPaUEyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdOanBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SURJN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUIyWVd4MVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdNanBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1dFlYbGlaVlJvY205M0tDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0EwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdSbFptRjFiSFE2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQWtZM1I0TG1WdVpDZ3BPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwc0lDUmZYemNzSUhSb2FYTXBPMXh1SUNBZ0lIMHBYRzRnSUgwc0lIdDlLVHRjYmlBZ1QySnFaV04wTG1SbFptbHVaVkJ5YjNCbGNuUjVLRTFoY0M1d2NtOTBiM1I1Y0dVc0lGTjViV0p2YkM1cGRHVnlZWFJ2Y2l3Z2UxeHVJQ0FnSUdOdmJtWnBaM1Z5WVdKc1pUb2dkSEoxWlN4Y2JpQWdJQ0IzY21sMFlXSnNaVG9nZEhKMVpTeGNiaUFnSUNCMllXeDFaVG9nVFdGd0xuQnliM1J2ZEhsd1pTNWxiblJ5YVdWelhHNGdJSDBwTzF4dUlDQm1kVzVqZEdsdmJpQndiMng1Wm1sc2JFMWhjQ2huYkc5aVlXd3BJSHRjYmlBZ0lDQjJZWElnSkY5Zk5DQTlJR2RzYjJKaGJDeGNiaUFnSUNBZ0lDQWdUMkpxWldOMElEMGdKRjlmTkM1UFltcGxZM1FzWEc0Z0lDQWdJQ0FnSUZONWJXSnZiQ0E5SUNSZlh6UXVVM2x0WW05c08xeHVJQ0FnSUdsbUlDZ2haMnh2WW1Gc0xrMWhjQ2xjYmlBZ0lDQWdJR2RzYjJKaGJDNU5ZWEFnUFNCTllYQTdYRzRnSUNBZ2RtRnlJRzFoY0ZCeWIzUnZkSGx3WlNBOUlHZHNiMkpoYkM1TllYQXVjSEp2ZEc5MGVYQmxPMXh1SUNBZ0lHbG1JQ2h0WVhCUWNtOTBiM1I1Y0dVdVpXNTBjbWxsY3lBOVBUMGdkVzVrWldacGJtVmtLVnh1SUNBZ0lDQWdaMnh2WW1Gc0xrMWhjQ0E5SUUxaGNEdGNiaUFnSUNCcFppQW9iV0Z3VUhKdmRHOTBlWEJsTG1WdWRISnBaWE1wSUh0Y2JpQWdJQ0FnSUcxaGVXSmxRV1JrU1hSbGNtRjBiM0lvYldGd1VISnZkRzkwZVhCbExDQnRZWEJRY205MGIzUjVjR1V1Wlc1MGNtbGxjeXdnVTNsdFltOXNLVHRjYmlBZ0lDQWdJRzFoZVdKbFFXUmtTWFJsY21GMGIzSW9UMkpxWldOMExtZGxkRkJ5YjNSdmRIbHdaVTltS0c1bGR5Qm5iRzlpWVd3dVRXRndLQ2t1Wlc1MGNtbGxjeWdwS1N3Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TzF4dUlDQWdJQ0FnZlN3Z1UzbHRZbTlzS1R0Y2JpQWdJQ0I5WEc0Z0lIMWNiaUFnY21WbmFYTjBaWEpRYjJ4NVptbHNiQ2h3YjJ4NVptbHNiRTFoY0NrN1hHNGdJSEpsZEhWeWJpQjdYRzRnSUNBZ1oyVjBJRTFoY0NncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCTllYQTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdjRzlzZVdacGJHeE5ZWEFvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnY0c5c2VXWnBiR3hOWVhBN1hHNGdJQ0FnZlZ4dUlDQjlPMXh1ZlNrN1hHNVRlWE4wWlcwdVoyVjBLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12VFdGd0xtcHpYQ0lnS3lBbkp5azdYRzVUZVhOMFpXMHVjbVZuYVhOMFpYSk5iMlIxYkdVb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OVRaWFF1YW5OY0lpd2dXMTBzSUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0JjSW5WelpTQnpkSEpwWTNSY0lqdGNiaUFnZG1GeUlGOWZiVzlrZFd4bFRtRnRaU0E5SUZ3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdlUyVjBMbXB6WENJN1hHNGdJSFpoY2lBa1gxOHdJRDBnVTNsemRHVnRMbWRsZENoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwzVjBhV3h6TG1welhDSXBMRnh1SUNBZ0lDQWdhWE5QWW1wbFkzUWdQU0FrWDE4d0xtbHpUMkpxWldOMExGeHVJQ0FnSUNBZ2JXRjVZbVZCWkdSSmRHVnlZWFJ2Y2lBOUlDUmZYekF1YldGNVltVkJaR1JKZEdWeVlYUnZjaXhjYmlBZ0lDQWdJSEpsWjJsemRHVnlVRzlzZVdacGJHd2dQU0FrWDE4d0xuSmxaMmx6ZEdWeVVHOXNlV1pwYkd3N1hHNGdJSFpoY2lCTllYQWdQU0JUZVhOMFpXMHVaMlYwS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdlRXRndMbXB6WENJcExrMWhjRHRjYmlBZ2RtRnlJR2RsZEU5M2JraGhjMmhQWW1wbFkzUWdQU0FrZEhKaFkyVjFjbEoxYm5ScGJXVXVaMlYwVDNkdVNHRnphRTlpYW1WamREdGNiaUFnZG1GeUlDUm9ZWE5QZDI1UWNtOXdaWEowZVNBOUlFOWlhbVZqZEM1d2NtOTBiM1I1Y0dVdWFHRnpUM2R1VUhKdmNHVnlkSGs3WEc0Z0lHWjFibU4wYVc5dUlHbHVhWFJUWlhRb2MyVjBLU0I3WEc0Z0lDQWdjMlYwTG0xaGNGOGdQU0J1WlhjZ1RXRndLQ2s3WEc0Z0lIMWNiaUFnZG1GeUlGTmxkQ0E5SUdaMWJtTjBhVzl1SUZObGRDZ3BJSHRjYmlBZ0lDQjJZWElnYVhSbGNtRmliR1VnUFNCaGNtZDFiV1Z1ZEhOYk1GMDdYRzRnSUNBZ2FXWWdLQ0ZwYzA5aWFtVmpkQ2gwYUdsektTbGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9KMU5sZENCallXeHNaV1FnYjI0Z2FXNWpiMjF3WVhScFlteGxJSFI1Y0dVbktUdGNiaUFnSUNCcFppQW9KR2hoYzA5M2JsQnliM0JsY25SNUxtTmhiR3dvZEdocGN5d2dKMjFoY0Y4bktTa2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduVTJWMElHTmhiaUJ1YjNRZ1ltVWdjbVZsYm5SeVlXNTBiSGtnYVc1cGRHbGhiR2x6WldRbktUdGNiaUFnSUNCOVhHNGdJQ0FnYVc1cGRGTmxkQ2gwYUdsektUdGNiaUFnSUNCcFppQW9hWFJsY21GaWJHVWdJVDA5SUc1MWJHd2dKaVlnYVhSbGNtRmliR1VnSVQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdabTl5SUNoMllYSWdKRjlmTkNBOUlHbDBaWEpoWW14bFd5UjBjbUZqWlhWeVVuVnVkR2x0WlM1MGIxQnliM0JsY25SNUtGTjViV0p2YkM1cGRHVnlZWFJ2Y2lsZEtDa3NYRzRnSUNBZ0lDQWdJQ0FnSkY5Zk5Uc2dJU2drWDE4MUlEMGdKRjlmTkM1dVpYaDBLQ2twTG1SdmJtVTdJQ2tnZTF4dUlDQWdJQ0FnSUNCMllYSWdhWFJsYlNBOUlDUmZYelV1ZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJSHRjYmlBZ0lDQWdJQ0FnSUNCMGFHbHpMbUZrWkNocGRHVnRLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmlBZ2ZUdGNiaUFnS0NSMGNtRmpaWFZ5VW5WdWRHbHRaUzVqY21WaGRHVkRiR0Z6Y3lrb1UyVjBMQ0I3WEc0Z0lDQWdaMlYwSUhOcGVtVW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdkR2hwY3k1dFlYQmZMbk5wZW1VN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JvWVhNNklHWjFibU4wYVc5dUtHdGxlU2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSFJvYVhNdWJXRndYeTVvWVhNb2EyVjVLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHRmtaRG9nWm5WdVkzUnBiMjRvYTJWNUtTQjdYRzRnSUNBZ0lDQjBhR2x6TG0xaGNGOHVjMlYwS0d0bGVTd2dhMlY1S1R0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsek8xeHVJQ0FnSUgwc1hHNGdJQ0FnWkdWc1pYUmxPaUJtZFc1amRHbHZiaWhyWlhrcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCMGFHbHpMbTFoY0Y4dVpHVnNaWFJsS0d0bGVTazdYRzRnSUNBZ2ZTeGNiaUFnSUNCamJHVmhjam9nWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NXRZWEJmTG1Oc1pXRnlLQ2s3WEc0Z0lDQWdmU3hjYmlBZ0lDQm1iM0pGWVdOb09pQm1kVzVqZEdsdmJpaGpZV3hzWW1GamEwWnVLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RHaHBjMEZ5WnlBOUlHRnlaM1Z0Wlc1MGMxc3hYVHRjYmlBZ0lDQWdJSFpoY2lBa1gxOHlJRDBnZEdocGN6dGNiaUFnSUNBZ0lISmxkSFZ5YmlCMGFHbHpMbTFoY0Y4dVptOXlSV0ZqYUNnb1puVnVZM1JwYjI0b2RtRnNkV1VzSUd0bGVTa2dlMXh1SUNBZ0lDQWdJQ0JqWVd4c1ltRmphMFp1TG1OaGJHd29kR2hwYzBGeVp5d2dhMlY1TENCclpYa3NJQ1JmWHpJcE8xeHVJQ0FnSUNBZ2ZTa3BPMXh1SUNBZ0lIMHNYRzRnSUNBZ2RtRnNkV1Z6T2lBa2RISmhZMlYxY2xKMWJuUnBiV1V1YVc1cGRFZGxibVZ5WVhSdmNrWjFibU4wYVc5dUtHWjFibU4wYVc5dUlDUmZYemNvS1NCN1hHNGdJQ0FnSUNCMllYSWdKRjlmT0N4Y2JpQWdJQ0FnSUNBZ0lDQWtYMTg1TzF4dUlDQWdJQ0FnY21WMGRYSnVJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWpjbVZoZEdWSFpXNWxjbUYwYjNKSmJuTjBZVzVqWlNobWRXNWpkR2x2Ymlna1kzUjRLU0I3WEc0Z0lDQWdJQ0FnSUhkb2FXeGxJQ2gwY25WbEtWeHVJQ0FnSUNBZ0lDQWdJSE4zYVhSamFDQW9KR04wZUM1emRHRjBaU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdZMkZ6WlNBd09seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1gxODRJRDBnZEdocGN5NXRZWEJmTG10bGVYTW9LVnRUZVcxaWIyd3VhWFJsY21GMGIzSmRLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMyVnVkQ0E5SUhadmFXUWdNRHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1aFkzUnBiMjRnUFNBbmJtVjRkQ2M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBeE1qdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURFeU9seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1gxODVJRDBnSkY5Zk9Gc2tZM1I0TG1GamRHbHZibDBvSkdOMGVDNXpaVzUwU1dkdWIzSmxWR2h5YjNjcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1kzUjRMbk4wWVhSbElEMGdPVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElEazZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0FvSkY5Zk9TNWtiMjVsS1NBL0lETWdPaUF5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdNenBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1elpXNTBJRDBnSkY5Zk9TNTJZV3gxWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlDMHlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ01qcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJREV5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdKRjlmT1M1MllXeDFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHUmxabUYxYkhRNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFrWTNSNExtVnVaQ2dwTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMHNJQ1JmWHpjc0lIUm9hWE1wTzF4dUlDQWdJSDBwTEZ4dUlDQWdJR1Z1ZEhKcFpYTTZJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNXBibWwwUjJWdVpYSmhkRzl5Um5WdVkzUnBiMjRvWm5WdVkzUnBiMjRnSkY5Zk1UQW9LU0I3WEc0Z0lDQWdJQ0IyWVhJZ0pGOWZNVEVzWEc0Z0lDQWdJQ0FnSUNBZ0pGOWZNVEk3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdKSFJ5WVdObGRYSlNkVzUwYVcxbExtTnlaV0YwWlVkbGJtVnlZWFJ2Y2tsdWMzUmhibU5sS0daMWJtTjBhVzl1S0NSamRIZ3BJSHRjYmlBZ0lDQWdJQ0FnZDJocGJHVWdLSFJ5ZFdVcFhHNGdJQ0FnSUNBZ0lDQWdjM2RwZEdOb0lDZ2tZM1I0TG5OMFlYUmxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURBNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSZlh6RXhJRDBnZEdocGN5NXRZWEJmTG1WdWRISnBaWE1vS1Z0VGVXMWliMnd1YVhSbGNtRjBiM0pkS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjMlZ1ZENBOUlIWnZhV1FnTUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNWhZM1JwYjI0Z1BTQW5ibVY0ZENjN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQXhNanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElERXlPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtYMTh4TWlBOUlDUmZYekV4V3lSamRIZ3VZV04wYVc5dVhTZ2tZM1I0TG5ObGJuUkpaMjV2Y21WVWFISnZkeWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBNU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnT1RwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlDZ2tYMTh4TWk1a2IyNWxLU0EvSURNZ09pQXlPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ016cGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6Wlc1MElEMGdKRjlmTVRJdWRtRnNkV1U3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBdE1qdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURJNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQXhNanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlDUmZYekV5TG5aaGJIVmxPMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pHVm1ZWFZzZERwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ1JqZEhndVpXNWtLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZTd2dKRjlmTVRBc0lIUm9hWE1wTzF4dUlDQWdJSDBwWEc0Z0lIMHNJSHQ5S1R0Y2JpQWdUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblI1S0ZObGRDNXdjbTkwYjNSNWNHVXNJRk41YldKdmJDNXBkR1Z5WVhSdmNpd2dlMXh1SUNBZ0lHTnZibVpwWjNWeVlXSnNaVG9nZEhKMVpTeGNiaUFnSUNCM2NtbDBZV0pzWlRvZ2RISjFaU3hjYmlBZ0lDQjJZV3gxWlRvZ1UyVjBMbkJ5YjNSdmRIbHdaUzUyWVd4MVpYTmNiaUFnZlNrN1hHNGdJRTlpYW1WamRDNWtaV1pwYm1WUWNtOXdaWEowZVNoVFpYUXVjSEp2ZEc5MGVYQmxMQ0FuYTJWNWN5Y3NJSHRjYmlBZ0lDQmpiMjVtYVdkMWNtRmliR1U2SUhSeWRXVXNYRzRnSUNBZ2QzSnBkR0ZpYkdVNklIUnlkV1VzWEc0Z0lDQWdkbUZzZFdVNklGTmxkQzV3Y205MGIzUjVjR1V1ZG1Gc2RXVnpYRzRnSUgwcE8xeHVJQ0JtZFc1amRHbHZiaUJ3YjJ4NVptbHNiRk5sZENobmJHOWlZV3dwSUh0Y2JpQWdJQ0IyWVhJZ0pGOWZOaUE5SUdkc2IySmhiQ3hjYmlBZ0lDQWdJQ0FnVDJKcVpXTjBJRDBnSkY5Zk5pNVBZbXBsWTNRc1hHNGdJQ0FnSUNBZ0lGTjViV0p2YkNBOUlDUmZYell1VTNsdFltOXNPMXh1SUNBZ0lHbG1JQ2doWjJ4dlltRnNMbE5sZENsY2JpQWdJQ0FnSUdkc2IySmhiQzVUWlhRZ1BTQlRaWFE3WEc0Z0lDQWdkbUZ5SUhObGRGQnliM1J2ZEhsd1pTQTlJR2RzYjJKaGJDNVRaWFF1Y0hKdmRHOTBlWEJsTzF4dUlDQWdJR2xtSUNoelpYUlFjbTkwYjNSNWNHVXVkbUZzZFdWektTQjdYRzRnSUNBZ0lDQnRZWGxpWlVGa1pFbDBaWEpoZEc5eUtITmxkRkJ5YjNSdmRIbHdaU3dnYzJWMFVISnZkRzkwZVhCbExuWmhiSFZsY3l3Z1UzbHRZbTlzS1R0Y2JpQWdJQ0FnSUcxaGVXSmxRV1JrU1hSbGNtRjBiM0lvVDJKcVpXTjBMbWRsZEZCeWIzUnZkSGx3WlU5bUtHNWxkeUJuYkc5aVlXd3VVMlYwS0NrdWRtRnNkV1Z6S0NrcExDQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSFJvYVhNN1hHNGdJQ0FnSUNCOUxDQlRlVzFpYjJ3cE8xeHVJQ0FnSUgxY2JpQWdmVnh1SUNCeVpXZHBjM1JsY2xCdmJIbG1hV3hzS0hCdmJIbG1hV3hzVTJWMEtUdGNiaUFnY21WMGRYSnVJSHRjYmlBZ0lDQm5aWFFnVTJWMEtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlGTmxkRHRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0J3YjJ4NVptbHNiRk5sZENncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCd2IyeDVabWxzYkZObGREdGNiaUFnSUNCOVhHNGdJSDA3WEc1OUtUdGNibE41YzNSbGJTNW5aWFFvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5VFpYUXVhbk5jSWlBcklDY25LVHRjYmxONWMzUmxiUzV5WldkcGMzUmxjazF2WkhWc1pTaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmJtOWtaVjl0YjJSMWJHVnpMM0p6ZG5BdmJHbGlMM0p6ZG5BdllYTmhjQzVxYzF3aUxDQmJYU3dnWm5WdVkzUnBiMjRvS1NCN1hHNGdJRndpZFhObElITjBjbWxqZEZ3aU8xeHVJQ0IyWVhJZ1gxOXRiMlIxYkdWT1lXMWxJRDBnWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMMjV2WkdWZmJXOWtkV3hsY3k5eWMzWndMMnhwWWk5eWMzWndMMkZ6WVhBdWFuTmNJanRjYmlBZ2RtRnlJR3hsYmlBOUlEQTdYRzRnSUdaMWJtTjBhVzl1SUdGellYQW9ZMkZzYkdKaFkyc3NJR0Z5WnlrZ2UxeHVJQ0FnSUhGMVpYVmxXMnhsYmwwZ1BTQmpZV3hzWW1GamF6dGNiaUFnSUNCeGRXVjFaVnRzWlc0Z0t5QXhYU0E5SUdGeVp6dGNiaUFnSUNCc1pXNGdLejBnTWp0Y2JpQWdJQ0JwWmlBb2JHVnVJRDA5UFNBeUtTQjdYRzRnSUNBZ0lDQnpZMmhsWkhWc1pVWnNkWE5vS0NrN1hHNGdJQ0FnZlZ4dUlDQjlYRzRnSUhaaGNpQWtYMTlrWldaaGRXeDBJRDBnWVhOaGNEdGNiaUFnZG1GeUlHSnliM2R6WlhKSGJHOWlZV3dnUFNBb2RIbHdaVzltSUhkcGJtUnZkeUFoUFQwZ0ozVnVaR1ZtYVc1bFpDY3BJRDhnZDJsdVpHOTNJRG9nZTMwN1hHNGdJSFpoY2lCQ2NtOTNjMlZ5VFhWMFlYUnBiMjVQWW5ObGNuWmxjaUE5SUdKeWIzZHpaWEpIYkc5aVlXd3VUWFYwWVhScGIyNVBZbk5sY25abGNpQjhmQ0JpY205M2MyVnlSMnh2WW1Gc0xsZGxZa3RwZEUxMWRHRjBhVzl1VDJKelpYSjJaWEk3WEc0Z0lIWmhjaUJwYzFkdmNtdGxjaUE5SUhSNWNHVnZaaUJWYVc1ME9FTnNZVzF3WldSQmNuSmhlU0FoUFQwZ0ozVnVaR1ZtYVc1bFpDY2dKaVlnZEhsd1pXOW1JR2x0Y0c5eWRGTmpjbWx3ZEhNZ0lUMDlJQ2QxYm1SbFptbHVaV1FuSUNZbUlIUjVjR1Z2WmlCTlpYTnpZV2RsUTJoaGJtNWxiQ0FoUFQwZ0ozVnVaR1ZtYVc1bFpDYzdYRzRnSUdaMWJtTjBhVzl1SUhWelpVNWxlSFJVYVdOcktDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lIQnliMk5sYzNNdWJtVjRkRlJwWTJzb1pteDFjMmdwTzF4dUlDQWdJSDA3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnZFhObFRYVjBZWFJwYjI1UFluTmxjblpsY2lncElIdGNiaUFnSUNCMllYSWdhWFJsY21GMGFXOXVjeUE5SURBN1hHNGdJQ0FnZG1GeUlHOWljMlZ5ZG1WeUlEMGdibVYzSUVKeWIzZHpaWEpOZFhSaGRHbHZiazlpYzJWeWRtVnlLR1pzZFhOb0tUdGNiaUFnSUNCMllYSWdibTlrWlNBOUlHUnZZM1Z0Wlc1MExtTnlaV0YwWlZSbGVIUk9iMlJsS0NjbktUdGNiaUFnSUNCdlluTmxjblpsY2k1dlluTmxjblpsS0c1dlpHVXNJSHRqYUdGeVlXTjBaWEpFWVhSaE9pQjBjblZsZlNrN1hHNGdJQ0FnY21WMGRYSnVJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnYm05a1pTNWtZWFJoSUQwZ0tHbDBaWEpoZEdsdmJuTWdQU0FySzJsMFpYSmhkR2x2Ym5NZ0pTQXlLVHRjYmlBZ0lDQjlPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJSFZ6WlUxbGMzTmhaMlZEYUdGdWJtVnNLQ2tnZTF4dUlDQWdJSFpoY2lCamFHRnVibVZzSUQwZ2JtVjNJRTFsYzNOaFoyVkRhR0Z1Ym1Wc0tDazdYRzRnSUNBZ1kyaGhibTVsYkM1d2IzSjBNUzV2Ym0xbGMzTmhaMlVnUFNCbWJIVnphRHRjYmlBZ0lDQnlaWFIxY200Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQmphR0Z1Ym1Wc0xuQnZjblF5TG5CdmMzUk5aWE56WVdkbEtEQXBPMXh1SUNBZ0lIMDdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdkWE5sVTJWMFZHbHRaVzkxZENncElIdGNiaUFnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNCelpYUlVhVzFsYjNWMEtHWnNkWE5vTENBeEtUdGNiaUFnSUNCOU8xeHVJQ0I5WEc0Z0lIWmhjaUJ4ZFdWMVpTQTlJRzVsZHlCQmNuSmhlU2d4TURBd0tUdGNiaUFnWm5WdVkzUnBiMjRnWm14MWMyZ29LU0I3WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0JzWlc0N0lHa2dLejBnTWlrZ2UxeHVJQ0FnSUNBZ2RtRnlJR05oYkd4aVlXTnJJRDBnY1hWbGRXVmJhVjA3WEc0Z0lDQWdJQ0IyWVhJZ1lYSm5JRDBnY1hWbGRXVmJhU0FySURGZE8xeHVJQ0FnSUNBZ1kyRnNiR0poWTJzb1lYSm5LVHRjYmlBZ0lDQWdJSEYxWlhWbFcybGRJRDBnZFc1a1pXWnBibVZrTzF4dUlDQWdJQ0FnY1hWbGRXVmJhU0FySURGZElEMGdkVzVrWldacGJtVmtPMXh1SUNBZ0lIMWNiaUFnSUNCc1pXNGdQU0F3TzF4dUlDQjlYRzRnSUhaaGNpQnpZMmhsWkhWc1pVWnNkWE5vTzF4dUlDQnBaaUFvZEhsd1pXOW1JSEJ5YjJObGMzTWdJVDA5SUNkMWJtUmxabWx1WldRbklDWW1JSHQ5TG5SdlUzUnlhVzVuTG1OaGJHd29jSEp2WTJWemN5a2dQVDA5SUNkYmIySnFaV04wSUhCeWIyTmxjM05kSnlrZ2UxeHVJQ0FnSUhOamFHVmtkV3hsUm14MWMyZ2dQU0IxYzJWT1pYaDBWR2xqYXlncE8xeHVJQ0I5SUdWc2MyVWdhV1lnS0VKeWIzZHpaWEpOZFhSaGRHbHZiazlpYzJWeWRtVnlLU0I3WEc0Z0lDQWdjMk5vWldSMWJHVkdiSFZ6YUNBOUlIVnpaVTExZEdGMGFXOXVUMkp6WlhKMlpYSW9LVHRjYmlBZ2ZTQmxiSE5sSUdsbUlDaHBjMWR2Y210bGNpa2dlMXh1SUNBZ0lITmphR1ZrZFd4bFJteDFjMmdnUFNCMWMyVk5aWE56WVdkbFEyaGhibTVsYkNncE8xeHVJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lITmphR1ZrZFd4bFJteDFjMmdnUFNCMWMyVlRaWFJVYVcxbGIzVjBLQ2s3WEc0Z0lIMWNiaUFnY21WMGRYSnVJSHRuWlhRZ1pHVm1ZWFZzZENncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlBa1gxOWtaV1poZFd4ME8xeHVJQ0FnSUgxOU8xeHVmU2s3WEc1VGVYTjBaVzB1Y21WbmFYTjBaWEpOYjJSMWJHVW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlRY205dGFYTmxMbXB6WENJc0lGdGRMQ0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdYQ0oxYzJVZ2MzUnlhV04wWENJN1hHNGdJSFpoY2lCZlgyMXZaSFZzWlU1aGJXVWdQU0JjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDFCeWIyMXBjMlV1YW5OY0lqdGNiaUFnZG1GeUlHRnplVzVqSUQwZ1UzbHpkR1Z0TG1kbGRDaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmJtOWtaVjl0YjJSMWJHVnpMM0p6ZG5BdmJHbGlMM0p6ZG5BdllYTmhjQzVxYzF3aUtTNWtaV1poZFd4ME8xeHVJQ0IyWVhJZ2NtVm5hWE4wWlhKUWIyeDVabWxzYkNBOUlGTjVjM1JsYlM1blpYUW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTkxZEdsc2N5NXFjMXdpS1M1eVpXZHBjM1JsY2xCdmJIbG1hV3hzTzF4dUlDQjJZWElnY0hKdmJXbHpaVkpoZHlBOUlIdDlPMXh1SUNCbWRXNWpkR2x2YmlCcGMxQnliMjFwYzJVb2VDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCNElDWW1JSFI1Y0dWdlppQjRJRDA5UFNBbmIySnFaV04wSnlBbUppQjRMbk4wWVhSMWMxOGdJVDA5SUhWdVpHVm1hVzVsWkR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCcFpGSmxjMjlzZG1WSVlXNWtiR1Z5S0hncElIdGNiaUFnSUNCeVpYUjFjbTRnZUR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCcFpGSmxhbVZqZEVoaGJtUnNaWElvZUNrZ2UxeHVJQ0FnSUhSb2NtOTNJSGc3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWTJoaGFXNG9jSEp2YldselpTa2dlMXh1SUNBZ0lIWmhjaUJ2YmxKbGMyOXNkbVVnUFNCaGNtZDFiV1Z1ZEhOYk1WMGdJVDA5SUNoMmIybGtJREFwSUQ4Z1lYSm5kVzFsYm5Seld6RmRJRG9nYVdSU1pYTnZiSFpsU0dGdVpHeGxjanRjYmlBZ0lDQjJZWElnYjI1U1pXcGxZM1FnUFNCaGNtZDFiV1Z1ZEhOYk1sMGdJVDA5SUNoMmIybGtJREFwSUQ4Z1lYSm5kVzFsYm5Seld6SmRJRG9nYVdSU1pXcGxZM1JJWVc1a2JHVnlPMXh1SUNBZ0lIWmhjaUJrWldabGNuSmxaQ0E5SUdkbGRFUmxabVZ5Y21Wa0tIQnliMjFwYzJVdVkyOXVjM1J5ZFdOMGIzSXBPMXh1SUNBZ0lITjNhWFJqYUNBb2NISnZiV2x6WlM1emRHRjBkWE5mS1NCN1hHNGdJQ0FnSUNCallYTmxJSFZ1WkdWbWFXNWxaRHBjYmlBZ0lDQWdJQ0FnZEdoeWIzY2dWSGx3WlVWeWNtOXlPMXh1SUNBZ0lDQWdZMkZ6WlNBd09seHVJQ0FnSUNBZ0lDQndjbTl0YVhObExtOXVVbVZ6YjJ4MlpWOHVjSFZ6YUNodmJsSmxjMjlzZG1Vc0lHUmxabVZ5Y21Wa0tUdGNiaUFnSUNBZ0lDQWdjSEp2YldselpTNXZibEpsYW1WamRGOHVjSFZ6YUNodmJsSmxhbVZqZEN3Z1pHVm1aWEp5WldRcE8xeHVJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUdOaGMyVWdLekU2WEc0Z0lDQWdJQ0FnSUhCeWIyMXBjMlZGYm5GMVpYVmxLSEJ5YjIxcGMyVXVkbUZzZFdWZkxDQmJiMjVTWlhOdmJIWmxMQ0JrWldabGNuSmxaRjBwTzF4dUlDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJR05oYzJVZ0xURTZYRzRnSUNBZ0lDQWdJSEJ5YjIxcGMyVkZibkYxWlhWbEtIQnliMjFwYzJVdWRtRnNkV1ZmTENCYmIyNVNaV3BsWTNRc0lHUmxabVZ5Y21Wa1hTazdYRzRnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdaR1ZtWlhKeVpXUXVjSEp2YldselpUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQm5aWFJFWldabGNuSmxaQ2hES1NCN1hHNGdJQ0FnYVdZZ0tIUm9hWE1nUFQwOUlDUlFjbTl0YVhObEtTQjdYRzRnSUNBZ0lDQjJZWElnY0hKdmJXbHpaU0E5SUhCeWIyMXBjMlZKYm1sMEtHNWxkeUFrVUhKdmJXbHpaU2h3Y205dGFYTmxVbUYzS1NrN1hHNGdJQ0FnSUNCeVpYUjFjbTRnZTF4dUlDQWdJQ0FnSUNCd2NtOXRhWE5sT2lCd2NtOXRhWE5sTEZ4dUlDQWdJQ0FnSUNCeVpYTnZiSFpsT2lBb1puVnVZM1JwYjI0b2VDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhCeWIyMXBjMlZTWlhOdmJIWmxLSEJ5YjIxcGMyVXNJSGdwTzF4dUlDQWdJQ0FnSUNCOUtTeGNiaUFnSUNBZ0lDQWdjbVZxWldOME9pQW9ablZ1WTNScGIyNG9jaWtnZTF4dUlDQWdJQ0FnSUNBZ0lIQnliMjFwYzJWU1pXcGxZM1FvY0hKdmJXbHpaU3dnY2lrN1hHNGdJQ0FnSUNBZ0lIMHBYRzRnSUNBZ0lDQjlPMXh1SUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNCMllYSWdjbVZ6ZFd4MElEMGdlMzA3WEc0Z0lDQWdJQ0J5WlhOMWJIUXVjSEp2YldselpTQTlJRzVsZHlCREtDaG1kVzVqZEdsdmJpaHlaWE52YkhabExDQnlaV3BsWTNRcElIdGNiaUFnSUNBZ0lDQWdjbVZ6ZFd4MExuSmxjMjlzZG1VZ1BTQnlaWE52YkhabE8xeHVJQ0FnSUNBZ0lDQnlaWE4xYkhRdWNtVnFaV04wSUQwZ2NtVnFaV04wTzF4dUlDQWdJQ0FnZlNrcE8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUhKbGMzVnNkRHRjYmlBZ0lDQjlYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjSEp2YldselpWTmxkQ2h3Y205dGFYTmxMQ0J6ZEdGMGRYTXNJSFpoYkhWbExDQnZibEpsYzI5c2RtVXNJRzl1VW1WcVpXTjBLU0I3WEc0Z0lDQWdjSEp2YldselpTNXpkR0YwZFhOZklEMGdjM1JoZEhWek8xeHVJQ0FnSUhCeWIyMXBjMlV1ZG1Gc2RXVmZJRDBnZG1Gc2RXVTdYRzRnSUNBZ2NISnZiV2x6WlM1dmJsSmxjMjlzZG1WZklEMGdiMjVTWlhOdmJIWmxPMXh1SUNBZ0lIQnliMjFwYzJVdWIyNVNaV3BsWTNSZklEMGdiMjVTWldwbFkzUTdYRzRnSUNBZ2NtVjBkWEp1SUhCeWIyMXBjMlU3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY0hKdmJXbHpaVWx1YVhRb2NISnZiV2x6WlNrZ2UxeHVJQ0FnSUhKbGRIVnliaUJ3Y205dGFYTmxVMlYwS0hCeWIyMXBjMlVzSURBc0lIVnVaR1ZtYVc1bFpDd2dXMTBzSUZ0ZEtUdGNiaUFnZlZ4dUlDQjJZWElnVUhKdmJXbHpaU0E5SUdaMWJtTjBhVzl1SUZCeWIyMXBjMlVvY21WemIyeDJaWElwSUh0Y2JpQWdJQ0JwWmlBb2NtVnpiMngyWlhJZ1BUMDlJSEJ5YjIxcGMyVlNZWGNwWEc0Z0lDQWdJQ0J5WlhSMWNtNDdYRzRnSUNBZ2FXWWdLSFI1Y0dWdlppQnlaWE52YkhabGNpQWhQVDBnSjJaMWJtTjBhVzl1SnlsY2JpQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJN1hHNGdJQ0FnZG1GeUlIQnliMjFwYzJVZ1BTQndjbTl0YVhObFNXNXBkQ2gwYUdsektUdGNiaUFnSUNCMGNua2dlMXh1SUNBZ0lDQWdjbVZ6YjJ4MlpYSW9LR1oxYm1OMGFXOXVLSGdwSUh0Y2JpQWdJQ0FnSUNBZ2NISnZiV2x6WlZKbGMyOXNkbVVvY0hKdmJXbHpaU3dnZUNrN1hHNGdJQ0FnSUNCOUtTd2dLR1oxYm1OMGFXOXVLSElwSUh0Y2JpQWdJQ0FnSUNBZ2NISnZiV2x6WlZKbGFtVmpkQ2h3Y205dGFYTmxMQ0J5S1R0Y2JpQWdJQ0FnSUgwcEtUdGNiaUFnSUNCOUlHTmhkR05vSUNobEtTQjdYRzRnSUNBZ0lDQndjbTl0YVhObFVtVnFaV04wS0hCeWIyMXBjMlVzSUdVcE8xeHVJQ0FnSUgxY2JpQWdmVHRjYmlBZ0tDUjBjbUZqWlhWeVVuVnVkR2x0WlM1amNtVmhkR1ZEYkdGemN5a29VSEp2YldselpTd2dlMXh1SUNBZ0lHTmhkR05vT2lCbWRXNWpkR2x2YmlodmJsSmxhbVZqZENrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhSb2FYTXVkR2hsYmloMWJtUmxabWx1WldRc0lHOXVVbVZxWldOMEtUdGNiaUFnSUNCOUxGeHVJQ0FnSUhSb1pXNDZJR1oxYm1OMGFXOXVLRzl1VW1WemIyeDJaU3dnYjI1U1pXcGxZM1FwSUh0Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2IyNVNaWE52YkhabElDRTlQU0FuWm5WdVkzUnBiMjRuS1Z4dUlDQWdJQ0FnSUNCdmJsSmxjMjlzZG1VZ1BTQnBaRkpsYzI5c2RtVklZVzVrYkdWeU8xeHVJQ0FnSUNBZ2FXWWdLSFI1Y0dWdlppQnZibEpsYW1WamRDQWhQVDBnSjJaMWJtTjBhVzl1SnlsY2JpQWdJQ0FnSUNBZ2IyNVNaV3BsWTNRZ1BTQnBaRkpsYW1WamRFaGhibVJzWlhJN1hHNGdJQ0FnSUNCMllYSWdkR2hoZENBOUlIUm9hWE03WEc0Z0lDQWdJQ0IyWVhJZ1kyOXVjM1J5ZFdOMGIzSWdQU0IwYUdsekxtTnZibk4wY25WamRHOXlPMXh1SUNBZ0lDQWdjbVYwZFhKdUlHTm9ZV2x1S0hSb2FYTXNJR1oxYm1OMGFXOXVLSGdwSUh0Y2JpQWdJQ0FnSUNBZ2VDQTlJSEJ5YjIxcGMyVkRiMlZ5WTJVb1kyOXVjM1J5ZFdOMGIzSXNJSGdwTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZUNBOVBUMGdkR2hoZENBL0lHOXVVbVZxWldOMEtHNWxkeUJVZVhCbFJYSnliM0lwSURvZ2FYTlFjbTl0YVhObEtIZ3BJRDhnZUM1MGFHVnVLRzl1VW1WemIyeDJaU3dnYjI1U1pXcGxZM1FwSURvZ2IyNVNaWE52YkhabEtIZ3BPMXh1SUNBZ0lDQWdmU3dnYjI1U1pXcGxZM1FwTzF4dUlDQWdJSDFjYmlBZ2ZTd2dlMXh1SUNBZ0lISmxjMjlzZG1VNklHWjFibU4wYVc5dUtIZ3BJSHRjYmlBZ0lDQWdJR2xtSUNoMGFHbHpJRDA5UFNBa1VISnZiV2x6WlNrZ2UxeHVJQ0FnSUNBZ0lDQnBaaUFvYVhOUWNtOXRhWE5sS0hncEtTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJSGc3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhCeWIyMXBjMlZUWlhRb2JtVjNJQ1JRY205dGFYTmxLSEJ5YjIxcGMyVlNZWGNwTENBck1Td2dlQ2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdibVYzSUhSb2FYTW9ablZ1WTNScGIyNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WemIyeDJaU2g0S1R0Y2JpQWdJQ0FnSUNBZ2ZTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCeVpXcGxZM1E2SUdaMWJtTjBhVzl1S0hJcElIdGNiaUFnSUNBZ0lHbG1JQ2gwYUdseklEMDlQU0FrVUhKdmJXbHpaU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnY0hKdmJXbHpaVk5sZENodVpYY2dKRkJ5YjIxcGMyVW9jSEp2YldselpWSmhkeWtzSUMweExDQnlLVHRjYmlBZ0lDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnVaWGNnZEdocGN5Z29ablZ1WTNScGIyNG9jbVZ6YjJ4MlpTd2djbVZxWldOMEtTQjdYRzRnSUNBZ0lDQWdJQ0FnY21WcVpXTjBLSElwTzF4dUlDQWdJQ0FnSUNCOUtTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCaGJHdzZJR1oxYm1OMGFXOXVLSFpoYkhWbGN5a2dlMXh1SUNBZ0lDQWdkbUZ5SUdSbFptVnljbVZrSUQwZ1oyVjBSR1ZtWlhKeVpXUW9kR2hwY3lrN1hHNGdJQ0FnSUNCMllYSWdjbVZ6YjJ4MWRHbHZibk1nUFNCYlhUdGNiaUFnSUNBZ0lIUnllU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQmpiM1Z1ZENBOUlIWmhiSFZsY3k1c1pXNW5kR2c3WEc0Z0lDQWdJQ0FnSUdsbUlDaGpiM1Z1ZENBOVBUMGdNQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lHUmxabVZ5Y21Wa0xuSmxjMjlzZG1Vb2NtVnpiMngxZEdsdmJuTXBPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2RtRnNkV1Z6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMGFHbHpMbkpsYzI5c2RtVW9kbUZzZFdWelcybGRLUzUwYUdWdUtHWjFibU4wYVc5dUtHa3NJSGdwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WemIyeDFkR2x2Ym5OYmFWMGdQU0I0TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JwWmlBb0xTMWpiM1Z1ZENBOVBUMGdNQ2xjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdJQ0JrWldabGNuSmxaQzV5WlhOdmJIWmxLSEpsYzI5c2RYUnBiMjV6S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDB1WW1sdVpDaDFibVJsWm1sdVpXUXNJR2twTENBb1puVnVZM1JwYjI0b2Npa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmtaV1psY25KbFpDNXlaV3BsWTNRb2NpazdYRzRnSUNBZ0lDQWdJQ0FnSUNCOUtTazdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOUlHTmhkR05vSUNobEtTQjdYRzRnSUNBZ0lDQWdJR1JsWm1WeWNtVmtMbkpsYW1WamRDaGxLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJSEpsZEhWeWJpQmtaV1psY25KbFpDNXdjbTl0YVhObE8xeHVJQ0FnSUgwc1hHNGdJQ0FnY21GalpUb2dablZ1WTNScGIyNG9kbUZzZFdWektTQjdYRzRnSUNBZ0lDQjJZWElnWkdWbVpYSnlaV1FnUFNCblpYUkVaV1psY25KbFpDaDBhR2x6S1R0Y2JpQWdJQ0FnSUhSeWVTQjdYRzRnSUNBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnZG1Gc2RXVnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNBZ0lDQWdkR2hwY3k1eVpYTnZiSFpsS0haaGJIVmxjMXRwWFNrdWRHaGxiaWdvWm5WdVkzUnBiMjRvZUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWkdWbVpYSnlaV1F1Y21WemIyeDJaU2g0S1R0Y2JpQWdJQ0FnSUNBZ0lDQjlLU3dnS0daMWJtTjBhVzl1S0hJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdSbFptVnljbVZrTG5KbGFtVmpkQ2h5S1R0Y2JpQWdJQ0FnSUNBZ0lDQjlLU2s3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwZ1kyRjBZMmdnS0dVcElIdGNiaUFnSUNBZ0lDQWdaR1ZtWlhKeVpXUXVjbVZxWldOMEtHVXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdjbVYwZFhKdUlHUmxabVZ5Y21Wa0xuQnliMjFwYzJVN1hHNGdJQ0FnZlZ4dUlDQjlLVHRjYmlBZ2RtRnlJQ1JRY205dGFYTmxJRDBnVUhKdmJXbHpaVHRjYmlBZ2RtRnlJQ1JRY205dGFYTmxVbVZxWldOMElEMGdKRkJ5YjIxcGMyVXVjbVZxWldOME8xeHVJQ0JtZFc1amRHbHZiaUJ3Y205dGFYTmxVbVZ6YjJ4MlpTaHdjbTl0YVhObExDQjRLU0I3WEc0Z0lDQWdjSEp2YldselpVUnZibVVvY0hKdmJXbHpaU3dnS3pFc0lIZ3NJSEJ5YjIxcGMyVXViMjVTWlhOdmJIWmxYeWs3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY0hKdmJXbHpaVkpsYW1WamRDaHdjbTl0YVhObExDQnlLU0I3WEc0Z0lDQWdjSEp2YldselpVUnZibVVvY0hKdmJXbHpaU3dnTFRFc0lISXNJSEJ5YjIxcGMyVXViMjVTWldwbFkzUmZLVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ3Y205dGFYTmxSRzl1WlNod2NtOXRhWE5sTENCemRHRjBkWE1zSUhaaGJIVmxMQ0J5WldGamRHbHZibk1wSUh0Y2JpQWdJQ0JwWmlBb2NISnZiV2x6WlM1emRHRjBkWE5mSUNFOVBTQXdLVnh1SUNBZ0lDQWdjbVYwZFhKdU8xeHVJQ0FnSUhCeWIyMXBjMlZGYm5GMVpYVmxLSFpoYkhWbExDQnlaV0ZqZEdsdmJuTXBPMXh1SUNBZ0lIQnliMjFwYzJWVFpYUW9jSEp2YldselpTd2djM1JoZEhWekxDQjJZV3gxWlNrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NISnZiV2x6WlVWdWNYVmxkV1VvZG1Gc2RXVXNJSFJoYzJ0ektTQjdYRzRnSUNBZ1lYTjVibU1vS0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQjBZWE5yY3k1c1pXNW5kR2c3SUdrZ0t6MGdNaWtnZTF4dUlDQWdJQ0FnSUNCd2NtOXRhWE5sU0dGdVpHeGxLSFpoYkhWbExDQjBZWE5yYzF0cFhTd2dkR0Z6YTNOYmFTQXJJREZkS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0I5S1NrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NISnZiV2x6WlVoaGJtUnNaU2gyWVd4MVpTd2dhR0Z1Wkd4bGNpd2daR1ZtWlhKeVpXUXBJSHRjYmlBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnZG1GeUlISmxjM1ZzZENBOUlHaGhibVJzWlhJb2RtRnNkV1VwTzF4dUlDQWdJQ0FnYVdZZ0tISmxjM1ZzZENBOVBUMGdaR1ZtWlhKeVpXUXVjSEp2YldselpTbGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjanRjYmlBZ0lDQWdJR1ZzYzJVZ2FXWWdLR2x6VUhKdmJXbHpaU2h5WlhOMWJIUXBLVnh1SUNBZ0lDQWdJQ0JqYUdGcGJpaHlaWE4xYkhRc0lHUmxabVZ5Y21Wa0xuSmxjMjlzZG1Vc0lHUmxabVZ5Y21Wa0xuSmxhbVZqZENrN1hHNGdJQ0FnSUNCbGJITmxYRzRnSUNBZ0lDQWdJR1JsWm1WeWNtVmtMbkpsYzI5c2RtVW9jbVZ6ZFd4MEtUdGNiaUFnSUNCOUlHTmhkR05vSUNobEtTQjdYRzRnSUNBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnSUNCa1pXWmxjbkpsWkM1eVpXcGxZM1FvWlNrN1hHNGdJQ0FnSUNCOUlHTmhkR05vSUNobEtTQjdmVnh1SUNBZ0lIMWNiaUFnZlZ4dUlDQjJZWElnZEdobGJtRmliR1ZUZVcxaWIyd2dQU0FuUUVCMGFHVnVZV0pzWlNjN1hHNGdJR1oxYm1OMGFXOXVJR2x6VDJKcVpXTjBLSGdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdlQ0FtSmlBb2RIbHdaVzltSUhnZ1BUMDlJQ2R2WW1wbFkzUW5JSHg4SUhSNWNHVnZaaUI0SUQwOVBTQW5ablZ1WTNScGIyNG5LVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ3Y205dGFYTmxRMjlsY21ObEtHTnZibk4wY25WamRHOXlMQ0I0S1NCN1hHNGdJQ0FnYVdZZ0tDRnBjMUJ5YjIxcGMyVW9lQ2tnSmlZZ2FYTlBZbXBsWTNRb2VDa3BJSHRjYmlBZ0lDQWdJSFpoY2lCMGFHVnVPMXh1SUNBZ0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUNBZ2RHaGxiaUE5SUhndWRHaGxianRjYmlBZ0lDQWdJSDBnWTJGMFkyZ2dLSElwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSEJ5YjIxcGMyVWdQU0FrVUhKdmJXbHpaVkpsYW1WamRDNWpZV3hzS0dOdmJuTjBjblZqZEc5eUxDQnlLVHRjYmlBZ0lDQWdJQ0FnZUZ0MGFHVnVZV0pzWlZONWJXSnZiRjBnUFNCd2NtOXRhWE5sTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnY0hKdmJXbHpaVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQWdJR2xtSUNoMGVYQmxiMllnZEdobGJpQTlQVDBnSjJaMWJtTjBhVzl1SnlrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnY0NBOUlIaGJkR2hsYm1GaWJHVlRlVzFpYjJ4ZE8xeHVJQ0FnSUNBZ0lDQnBaaUFvY0NrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQndPMXh1SUNBZ0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0FnSUhaaGNpQmtaV1psY25KbFpDQTlJR2RsZEVSbFptVnljbVZrS0dOdmJuTjBjblZqZEc5eUtUdGNiaUFnSUNBZ0lDQWdJQ0I0VzNSb1pXNWhZbXhsVTNsdFltOXNYU0E5SUdSbFptVnljbVZrTG5CeWIyMXBjMlU3WEc0Z0lDQWdJQ0FnSUNBZ2RISjVJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIUm9aVzR1WTJGc2JDaDRMQ0JrWldabGNuSmxaQzV5WlhOdmJIWmxMQ0JrWldabGNuSmxaQzV5WldwbFkzUXBPMXh1SUNBZ0lDQWdJQ0FnSUgwZ1kyRjBZMmdnS0hJcElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUdSbFptVnljbVZrTG5KbGFtVmpkQ2h5S1R0Y2JpQWdJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJR1JsWm1WeWNtVmtMbkJ5YjIxcGMyVTdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUhnN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NHOXNlV1pwYkd4UWNtOXRhWE5sS0dkc2IySmhiQ2tnZTF4dUlDQWdJR2xtSUNnaFoyeHZZbUZzTGxCeWIyMXBjMlVwWEc0Z0lDQWdJQ0JuYkc5aVlXd3VVSEp2YldselpTQTlJRkJ5YjIxcGMyVTdYRzRnSUgxY2JpQWdjbVZuYVhOMFpYSlFiMng1Wm1sc2JDaHdiMng1Wm1sc2JGQnliMjFwYzJVcE8xeHVJQ0J5WlhSMWNtNGdlMXh1SUNBZ0lHZGxkQ0JRY205dGFYTmxLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRkJ5YjIxcGMyVTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdjRzlzZVdacGJHeFFjbTl0YVhObEtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIQnZiSGxtYVd4c1VISnZiV2x6WlR0Y2JpQWdJQ0I5WEc0Z0lIMDdYRzU5S1R0Y2JsTjVjM1JsYlM1blpYUW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlRY205dGFYTmxMbXB6WENJZ0t5QW5KeWs3WEc1VGVYTjBaVzB1Y21WbmFYTjBaWEpOYjJSMWJHVW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlUZEhKcGJtZEpkR1Z5WVhSdmNpNXFjMXdpTENCYlhTd2dablZ1WTNScGIyNG9LU0I3WEc0Z0lGd2lkWE5sSUhOMGNtbGpkRndpTzF4dUlDQjJZWElnSkY5Zk1qdGNiaUFnZG1GeUlGOWZiVzlrZFd4bFRtRnRaU0E5SUZ3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdlUzUnlhVzVuU1hSbGNtRjBiM0l1YW5OY0lqdGNiaUFnZG1GeUlDUmZYekFnUFNCVGVYTjBaVzB1WjJWMEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZkWFJwYkhNdWFuTmNJaWtzWEc0Z0lDQWdJQ0JqY21WaGRHVkpkR1Z5WVhSdmNsSmxjM1ZzZEU5aWFtVmpkQ0E5SUNSZlh6QXVZM0psWVhSbFNYUmxjbUYwYjNKU1pYTjFiSFJQWW1wbFkzUXNYRzRnSUNBZ0lDQnBjMDlpYW1WamRDQTlJQ1JmWHpBdWFYTlBZbXBsWTNRN1hHNGdJSFpoY2lCMGIxQnliM0JsY25SNUlEMGdKSFJ5WVdObGRYSlNkVzUwYVcxbExuUnZVSEp2Y0dWeWRIazdYRzRnSUhaaGNpQm9ZWE5QZDI1UWNtOXdaWEowZVNBOUlFOWlhbVZqZEM1d2NtOTBiM1I1Y0dVdWFHRnpUM2R1VUhKdmNHVnlkSGs3WEc0Z0lIWmhjaUJwZEdWeVlYUmxaRk4wY21sdVp5QTlJRk41YldKdmJDZ25hWFJsY21GMFpXUlRkSEpwYm1jbktUdGNiaUFnZG1GeUlITjBjbWx1WjBsMFpYSmhkRzl5VG1WNGRFbHVaR1Y0SUQwZ1UzbHRZbTlzS0NkemRISnBibWRKZEdWeVlYUnZjazVsZUhSSmJtUmxlQ2NwTzF4dUlDQjJZWElnVTNSeWFXNW5TWFJsY21GMGIzSWdQU0JtZFc1amRHbHZiaUJUZEhKcGJtZEpkR1Z5WVhSdmNpZ3BJSHQ5TzF4dUlDQW9KSFJ5WVdObGRYSlNkVzUwYVcxbExtTnlaV0YwWlVOc1lYTnpLU2hUZEhKcGJtZEpkR1Z5WVhSdmNpd2dLQ1JmWHpJZ1BTQjdmU3dnVDJKcVpXTjBMbVJsWm1sdVpWQnliM0JsY25SNUtDUmZYeklzSUZ3aWJtVjRkRndpTENCN1hHNGdJQ0FnZG1Gc2RXVTZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnZG1GeUlHOGdQU0IwYUdsek8xeHVJQ0FnSUNBZ2FXWWdLQ0ZwYzA5aWFtVmpkQ2h2S1NCOGZDQWhhR0Z6VDNkdVVISnZjR1Z5ZEhrdVkyRnNiQ2h2TENCcGRHVnlZWFJsWkZOMGNtbHVaeWtwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25kR2hwY3lCdGRYTjBJR0psSUdFZ1UzUnlhVzVuU1hSbGNtRjBiM0lnYjJKcVpXTjBKeWs3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0IyWVhJZ2N5QTlJRzliZEc5UWNtOXdaWEowZVNocGRHVnlZWFJsWkZOMGNtbHVaeWxkTzF4dUlDQWdJQ0FnYVdZZ0tITWdQVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z1kzSmxZWFJsU1hSbGNtRjBiM0pTWlhOMWJIUlBZbXBsWTNRb2RXNWtaV1pwYm1Wa0xDQjBjblZsS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhaaGNpQndiM05wZEdsdmJpQTlJRzliZEc5UWNtOXdaWEowZVNoemRISnBibWRKZEdWeVlYUnZjazVsZUhSSmJtUmxlQ2xkTzF4dUlDQWdJQ0FnZG1GeUlHeGxiaUE5SUhNdWJHVnVaM1JvTzF4dUlDQWdJQ0FnYVdZZ0tIQnZjMmwwYVc5dUlENDlJR3hsYmlrZ2UxeHVJQ0FnSUNBZ0lDQnZXM1J2VUhKdmNHVnlkSGtvYVhSbGNtRjBaV1JUZEhKcGJtY3BYU0E5SUhWdVpHVm1hVzVsWkR0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdOeVpXRjBaVWwwWlhKaGRHOXlVbVZ6ZFd4MFQySnFaV04wS0hWdVpHVm1hVzVsWkN3Z2RISjFaU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0IyWVhJZ1ptbHljM1FnUFNCekxtTm9ZWEpEYjJSbFFYUW9jRzl6YVhScGIyNHBPMXh1SUNBZ0lDQWdkbUZ5SUhKbGMzVnNkRk4wY21sdVp6dGNiaUFnSUNBZ0lHbG1JQ2htYVhKemRDQThJREI0UkRnd01DQjhmQ0JtYVhKemRDQStJREI0UkVKR1JpQjhmQ0J3YjNOcGRHbHZiaUFySURFZ1BUMDlJR3hsYmlrZ2UxeHVJQ0FnSUNBZ0lDQnlaWE4xYkhSVGRISnBibWNnUFNCVGRISnBibWN1Wm5KdmJVTm9ZWEpEYjJSbEtHWnBjbk4wS1R0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhaaGNpQnpaV052Ym1RZ1BTQnpMbU5vWVhKRGIyUmxRWFFvY0c5emFYUnBiMjRnS3lBeEtUdGNiaUFnSUNBZ0lDQWdhV1lnS0hObFkyOXVaQ0E4SURCNFJFTXdNQ0I4ZkNCelpXTnZibVFnUGlBd2VFUkdSa1lwSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWE4xYkhSVGRISnBibWNnUFNCVGRISnBibWN1Wm5KdmJVTm9ZWEpEYjJSbEtHWnBjbk4wS1R0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQnlaWE4xYkhSVGRISnBibWNnUFNCVGRISnBibWN1Wm5KdmJVTm9ZWEpEYjJSbEtHWnBjbk4wS1NBcklGTjBjbWx1Wnk1bWNtOXRRMmhoY2tOdlpHVW9jMlZqYjI1a0tUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdiMXQwYjFCeWIzQmxjblI1S0hOMGNtbHVaMGwwWlhKaGRHOXlUbVY0ZEVsdVpHVjRLVjBnUFNCd2IzTnBkR2x2YmlBcklISmxjM1ZzZEZOMGNtbHVaeTVzWlc1bmRHZzdYRzRnSUNBZ0lDQnlaWFIxY200Z1kzSmxZWFJsU1hSbGNtRjBiM0pTWlhOMWJIUlBZbXBsWTNRb2NtVnpkV3gwVTNSeWFXNW5MQ0JtWVd4elpTazdYRzRnSUNBZ2ZTeGNiaUFnSUNCamIyNW1hV2QxY21GaWJHVTZJSFJ5ZFdVc1hHNGdJQ0FnWlc1MWJXVnlZV0pzWlRvZ2RISjFaU3hjYmlBZ0lDQjNjbWwwWVdKc1pUb2dkSEoxWlZ4dUlDQjlLU3dnVDJKcVpXTjBMbVJsWm1sdVpWQnliM0JsY25SNUtDUmZYeklzSUZONWJXSnZiQzVwZEdWeVlYUnZjaXdnZTF4dUlDQWdJSFpoYkhWbE9pQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TzF4dUlDQWdJSDBzWEc0Z0lDQWdZMjl1Wm1sbmRYSmhZbXhsT2lCMGNuVmxMRnh1SUNBZ0lHVnVkVzFsY21GaWJHVTZJSFJ5ZFdVc1hHNGdJQ0FnZDNKcGRHRmliR1U2SUhSeWRXVmNiaUFnZlNrc0lDUmZYeklwTENCN2ZTazdYRzRnSUdaMWJtTjBhVzl1SUdOeVpXRjBaVk4wY21sdVowbDBaWEpoZEc5eUtITjBjbWx1WnlrZ2UxeHVJQ0FnSUhaaGNpQnpJRDBnVTNSeWFXNW5LSE4wY21sdVp5azdYRzRnSUNBZ2RtRnlJR2wwWlhKaGRHOXlJRDBnVDJKcVpXTjBMbU55WldGMFpTaFRkSEpwYm1kSmRHVnlZWFJ2Y2k1d2NtOTBiM1I1Y0dVcE8xeHVJQ0FnSUdsMFpYSmhkRzl5VzNSdlVISnZjR1Z5ZEhrb2FYUmxjbUYwWldSVGRISnBibWNwWFNBOUlITTdYRzRnSUNBZ2FYUmxjbUYwYjNKYmRHOVFjbTl3WlhKMGVTaHpkSEpwYm1kSmRHVnlZWFJ2Y2s1bGVIUkpibVJsZUNsZElEMGdNRHRjYmlBZ0lDQnlaWFIxY200Z2FYUmxjbUYwYjNJN1hHNGdJSDFjYmlBZ2NtVjBkWEp1SUh0blpYUWdZM0psWVhSbFUzUnlhVzVuU1hSbGNtRjBiM0lvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWTNKbFlYUmxVM1J5YVc1blNYUmxjbUYwYjNJN1hHNGdJQ0FnZlgwN1hHNTlLVHRjYmxONWMzUmxiUzV5WldkcGMzUmxjazF2WkhWc1pTaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMMU4wY21sdVp5NXFjMXdpTENCYlhTd2dablZ1WTNScGIyNG9LU0I3WEc0Z0lGd2lkWE5sSUhOMGNtbGpkRndpTzF4dUlDQjJZWElnWDE5dGIyUjFiR1ZPWVcxbElEMGdYQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlUZEhKcGJtY3Vhbk5jSWp0Y2JpQWdkbUZ5SUdOeVpXRjBaVk4wY21sdVowbDBaWEpoZEc5eUlEMGdVM2x6ZEdWdExtZGxkQ2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDFOMGNtbHVaMGwwWlhKaGRHOXlMbXB6WENJcExtTnlaV0YwWlZOMGNtbHVaMGwwWlhKaGRHOXlPMXh1SUNCMllYSWdKRjlmTVNBOUlGTjVjM1JsYlM1blpYUW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTkxZEdsc2N5NXFjMXdpS1N4Y2JpQWdJQ0FnSUcxaGVXSmxRV1JrUm5WdVkzUnBiMjV6SUQwZ0pGOWZNUzV0WVhsaVpVRmtaRVoxYm1OMGFXOXVjeXhjYmlBZ0lDQWdJRzFoZVdKbFFXUmtTWFJsY21GMGIzSWdQU0FrWDE4eExtMWhlV0psUVdSa1NYUmxjbUYwYjNJc1hHNGdJQ0FnSUNCeVpXZHBjM1JsY2xCdmJIbG1hV3hzSUQwZ0pGOWZNUzV5WldkcGMzUmxjbEJ2YkhsbWFXeHNPMXh1SUNCMllYSWdKSFJ2VTNSeWFXNW5JRDBnVDJKcVpXTjBMbkJ5YjNSdmRIbHdaUzUwYjFOMGNtbHVaenRjYmlBZ2RtRnlJQ1JwYm1SbGVFOW1JRDBnVTNSeWFXNW5MbkJ5YjNSdmRIbHdaUzVwYm1SbGVFOW1PMXh1SUNCMllYSWdKR3hoYzNSSmJtUmxlRTltSUQwZ1UzUnlhVzVuTG5CeWIzUnZkSGx3WlM1c1lYTjBTVzVrWlhoUFpqdGNiaUFnWm5WdVkzUnBiMjRnYzNSaGNuUnpWMmwwYUNoelpXRnlZMmdwSUh0Y2JpQWdJQ0IyWVhJZ2MzUnlhVzVuSUQwZ1UzUnlhVzVuS0hSb2FYTXBPMXh1SUNBZ0lHbG1JQ2gwYUdseklEMDlJRzUxYkd3Z2ZId2dKSFJ2VTNSeWFXNW5MbU5oYkd3b2MyVmhjbU5vS1NBOVBTQW5XMjlpYW1WamRDQlNaV2RGZUhCZEp5a2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ1ZIbHdaVVZ5Y205eUtDazdYRzRnSUNBZ2ZWeHVJQ0FnSUhaaGNpQnpkSEpwYm1kTVpXNW5kR2dnUFNCemRISnBibWN1YkdWdVozUm9PMXh1SUNBZ0lIWmhjaUJ6WldGeVkyaFRkSEpwYm1jZ1BTQlRkSEpwYm1jb2MyVmhjbU5vS1R0Y2JpQWdJQ0IyWVhJZ2MyVmhjbU5vVEdWdVozUm9JRDBnYzJWaGNtTm9VM1J5YVc1bkxteGxibWQwYUR0Y2JpQWdJQ0IyWVhJZ2NHOXphWFJwYjI0Z1BTQmhjbWQxYldWdWRITXViR1Z1WjNSb0lENGdNU0EvSUdGeVozVnRaVzUwYzFzeFhTQTZJSFZ1WkdWbWFXNWxaRHRjYmlBZ0lDQjJZWElnY0c5eklEMGdjRzl6YVhScGIyNGdQeUJPZFcxaVpYSW9jRzl6YVhScGIyNHBJRG9nTUR0Y2JpQWdJQ0JwWmlBb2FYTk9ZVTRvY0c5ektTa2dlMXh1SUNBZ0lDQWdjRzl6SUQwZ01EdGNiaUFnSUNCOVhHNGdJQ0FnZG1GeUlITjBZWEowSUQwZ1RXRjBhQzV0YVc0b1RXRjBhQzV0WVhnb2NHOXpMQ0F3S1N3Z2MzUnlhVzVuVEdWdVozUm9LVHRjYmlBZ0lDQnlaWFIxY200Z0pHbHVaR1Y0VDJZdVkyRnNiQ2h6ZEhKcGJtY3NJSE5sWVhKamFGTjBjbWx1Wnl3Z2NHOXpLU0E5UFNCemRHRnlkRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJsYm1SelYybDBhQ2h6WldGeVkyZ3BJSHRjYmlBZ0lDQjJZWElnYzNSeWFXNW5JRDBnVTNSeWFXNW5LSFJvYVhNcE8xeHVJQ0FnSUdsbUlDaDBhR2x6SUQwOUlHNTFiR3dnZkh3Z0pIUnZVM1J5YVc1bkxtTmhiR3dvYzJWaGNtTm9LU0E5UFNBblcyOWlhbVZqZENCU1pXZEZlSEJkSnlrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnVkhsd1pVVnljbTl5S0NrN1hHNGdJQ0FnZlZ4dUlDQWdJSFpoY2lCemRISnBibWRNWlc1bmRHZ2dQU0J6ZEhKcGJtY3ViR1Z1WjNSb08xeHVJQ0FnSUhaaGNpQnpaV0Z5WTJoVGRISnBibWNnUFNCVGRISnBibWNvYzJWaGNtTm9LVHRjYmlBZ0lDQjJZWElnYzJWaGNtTm9UR1Z1WjNSb0lEMGdjMlZoY21Ob1UzUnlhVzVuTG14bGJtZDBhRHRjYmlBZ0lDQjJZWElnY0c5eklEMGdjM1J5YVc1blRHVnVaM1JvTzF4dUlDQWdJR2xtSUNoaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvSUQ0Z01Ta2dlMXh1SUNBZ0lDQWdkbUZ5SUhCdmMybDBhVzl1SUQwZ1lYSm5kVzFsYm5Seld6RmRPMXh1SUNBZ0lDQWdhV1lnS0hCdmMybDBhVzl1SUNFOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJQ0FnY0c5eklEMGdjRzl6YVhScGIyNGdQeUJPZFcxaVpYSW9jRzl6YVhScGIyNHBJRG9nTUR0Y2JpQWdJQ0FnSUNBZ2FXWWdLR2x6VG1GT0tIQnZjeWtwSUh0Y2JpQWdJQ0FnSUNBZ0lDQndiM01nUFNBd08xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVJQ0FnSUhaaGNpQmxibVFnUFNCTllYUm9MbTFwYmloTllYUm9MbTFoZUNod2IzTXNJREFwTENCemRISnBibWRNWlc1bmRHZ3BPMXh1SUNBZ0lIWmhjaUJ6ZEdGeWRDQTlJR1Z1WkNBdElITmxZWEpqYUV4bGJtZDBhRHRjYmlBZ0lDQnBaaUFvYzNSaGNuUWdQQ0F3S1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWm1Gc2MyVTdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUFrYkdGemRFbHVaR1Y0VDJZdVkyRnNiQ2h6ZEhKcGJtY3NJSE5sWVhKamFGTjBjbWx1Wnl3Z2MzUmhjblFwSUQwOUlITjBZWEowTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdsdVkyeDFaR1Z6S0hObFlYSmphQ2tnZTF4dUlDQWdJR2xtSUNoMGFHbHpJRDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJSFJvY205M0lGUjVjR1ZGY25KdmNpZ3BPMXh1SUNBZ0lIMWNiaUFnSUNCMllYSWdjM1J5YVc1bklEMGdVM1J5YVc1bktIUm9hWE1wTzF4dUlDQWdJR2xtSUNoelpXRnlZMmdnSmlZZ0pIUnZVM1J5YVc1bkxtTmhiR3dvYzJWaGNtTm9LU0E5UFNBblcyOWlhbVZqZENCU1pXZEZlSEJkSnlrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnVkhsd1pVVnljbTl5S0NrN1hHNGdJQ0FnZlZ4dUlDQWdJSFpoY2lCemRISnBibWRNWlc1bmRHZ2dQU0J6ZEhKcGJtY3ViR1Z1WjNSb08xeHVJQ0FnSUhaaGNpQnpaV0Z5WTJoVGRISnBibWNnUFNCVGRISnBibWNvYzJWaGNtTm9LVHRjYmlBZ0lDQjJZWElnYzJWaGNtTm9UR1Z1WjNSb0lEMGdjMlZoY21Ob1UzUnlhVzVuTG14bGJtZDBhRHRjYmlBZ0lDQjJZWElnY0c5emFYUnBiMjRnUFNCaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvSUQ0Z01TQS9JR0Z5WjNWdFpXNTBjMXN4WFNBNklIVnVaR1ZtYVc1bFpEdGNiaUFnSUNCMllYSWdjRzl6SUQwZ2NHOXphWFJwYjI0Z1B5Qk9kVzFpWlhJb2NHOXphWFJwYjI0cElEb2dNRHRjYmlBZ0lDQnBaaUFvY0c5eklDRTlJSEJ2Y3lrZ2UxeHVJQ0FnSUNBZ2NHOXpJRDBnTUR0Y2JpQWdJQ0I5WEc0Z0lDQWdkbUZ5SUhOMFlYSjBJRDBnVFdGMGFDNXRhVzRvVFdGMGFDNXRZWGdvY0c5ekxDQXdLU3dnYzNSeWFXNW5UR1Z1WjNSb0tUdGNiaUFnSUNCcFppQW9jMlZoY21Ob1RHVnVaM1JvSUNzZ2MzUmhjblFnUGlCemRISnBibWRNWlc1bmRHZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlDUnBibVJsZUU5bUxtTmhiR3dvYzNSeWFXNW5MQ0J6WldGeVkyaFRkSEpwYm1jc0lIQnZjeWtnSVQwZ0xURTdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjbVZ3WldGMEtHTnZkVzUwS1NCN1hHNGdJQ0FnYVdZZ0tIUm9hWE1nUFQwZ2JuVnNiQ2tnZTF4dUlDQWdJQ0FnZEdoeWIzY2dWSGx3WlVWeWNtOXlLQ2s3WEc0Z0lDQWdmVnh1SUNBZ0lIWmhjaUJ6ZEhKcGJtY2dQU0JUZEhKcGJtY29kR2hwY3lrN1hHNGdJQ0FnZG1GeUlHNGdQU0JqYjNWdWRDQS9JRTUxYldKbGNpaGpiM1Z1ZENrZ09pQXdPMXh1SUNBZ0lHbG1JQ2hwYzA1aFRpaHVLU2tnZTF4dUlDQWdJQ0FnYmlBOUlEQTdYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDaHVJRHdnTUNCOGZDQnVJRDA5SUVsdVptbHVhWFI1S1NCN1hHNGdJQ0FnSUNCMGFISnZkeUJTWVc1blpVVnljbTl5S0NrN1hHNGdJQ0FnZlZ4dUlDQWdJR2xtSUNodUlEMDlJREFwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUFuSnp0Y2JpQWdJQ0I5WEc0Z0lDQWdkbUZ5SUhKbGMzVnNkQ0E5SUNjbk8xeHVJQ0FnSUhkb2FXeGxJQ2h1TFMwcElIdGNiaUFnSUNBZ0lISmxjM1ZzZENBclBTQnpkSEpwYm1jN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnlaWE4xYkhRN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1kyOWtaVkJ2YVc1MFFYUW9jRzl6YVhScGIyNHBJSHRjYmlBZ0lDQnBaaUFvZEdocGN5QTlQU0J1ZFd4c0tTQjdYRzRnSUNBZ0lDQjBhSEp2ZHlCVWVYQmxSWEp5YjNJb0tUdGNiaUFnSUNCOVhHNGdJQ0FnZG1GeUlITjBjbWx1WnlBOUlGTjBjbWx1WnloMGFHbHpLVHRjYmlBZ0lDQjJZWElnYzJsNlpTQTlJSE4wY21sdVp5NXNaVzVuZEdnN1hHNGdJQ0FnZG1GeUlHbHVaR1Y0SUQwZ2NHOXphWFJwYjI0Z1B5Qk9kVzFpWlhJb2NHOXphWFJwYjI0cElEb2dNRHRjYmlBZ0lDQnBaaUFvYVhOT1lVNG9hVzVrWlhncEtTQjdYRzRnSUNBZ0lDQnBibVJsZUNBOUlEQTdYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDaHBibVJsZUNBOElEQWdmSHdnYVc1a1pYZ2dQajBnYzJsNlpTa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIVnVaR1ZtYVc1bFpEdGNiaUFnSUNCOVhHNGdJQ0FnZG1GeUlHWnBjbk4wSUQwZ2MzUnlhVzVuTG1Ob1lYSkRiMlJsUVhRb2FXNWtaWGdwTzF4dUlDQWdJSFpoY2lCelpXTnZibVE3WEc0Z0lDQWdhV1lnS0dacGNuTjBJRDQ5SURCNFJEZ3dNQ0FtSmlCbWFYSnpkQ0E4UFNBd2VFUkNSa1lnSmlZZ2MybDZaU0ErSUdsdVpHVjRJQ3NnTVNrZ2UxeHVJQ0FnSUNBZ2MyVmpiMjVrSUQwZ2MzUnlhVzVuTG1Ob1lYSkRiMlJsUVhRb2FXNWtaWGdnS3lBeEtUdGNiaUFnSUNBZ0lHbG1JQ2h6WldOdmJtUWdQajBnTUhoRVF6QXdJQ1ltSUhObFkyOXVaQ0E4UFNBd2VFUkdSa1lwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUNobWFYSnpkQ0F0SURCNFJEZ3dNQ2tnS2lBd2VEUXdNQ0FySUhObFkyOXVaQ0F0SURCNFJFTXdNQ0FySURCNE1UQXdNREE3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCbWFYSnpkRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ5WVhjb1kyRnNiSE5wZEdVcElIdGNiaUFnSUNCMllYSWdjbUYzSUQwZ1kyRnNiSE5wZEdVdWNtRjNPMXh1SUNBZ0lIWmhjaUJzWlc0Z1BTQnlZWGN1YkdWdVozUm9JRDQrUGlBd08xeHVJQ0FnSUdsbUlDaHNaVzRnUFQwOUlEQXBYRzRnSUNBZ0lDQnlaWFIxY200Z0p5YzdYRzRnSUNBZ2RtRnlJSE1nUFNBbkp6dGNiaUFnSUNCMllYSWdhU0E5SURBN1hHNGdJQ0FnZDJocGJHVWdLSFJ5ZFdVcElIdGNiaUFnSUNBZ0lITWdLejBnY21GM1cybGRPMXh1SUNBZ0lDQWdhV1lnS0drZ0t5QXhJRDA5UFNCc1pXNHBYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQnpPMXh1SUNBZ0lDQWdjeUFyUFNCaGNtZDFiV1Z1ZEhOYkt5dHBYVHRjYmlBZ0lDQjlYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdabkp2YlVOdlpHVlFiMmx1ZENncElIdGNiaUFnSUNCMllYSWdZMjlrWlZWdWFYUnpJRDBnVzEwN1hHNGdJQ0FnZG1GeUlHWnNiMjl5SUQwZ1RXRjBhQzVtYkc5dmNqdGNiaUFnSUNCMllYSWdhR2xuYUZOMWNuSnZaMkYwWlR0Y2JpQWdJQ0IyWVhJZ2JHOTNVM1Z5Y205bllYUmxPMXh1SUNBZ0lIWmhjaUJwYm1SbGVDQTlJQzB4TzF4dUlDQWdJSFpoY2lCc1pXNW5kR2dnUFNCaGNtZDFiV1Z1ZEhNdWJHVnVaM1JvTzF4dUlDQWdJR2xtSUNnaGJHVnVaM1JvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnSnljN1hHNGdJQ0FnZlZ4dUlDQWdJSGRvYVd4bElDZ3JLMmx1WkdWNElEd2diR1Z1WjNSb0tTQjdYRzRnSUNBZ0lDQjJZWElnWTI5a1pWQnZhVzUwSUQwZ1RuVnRZbVZ5S0dGeVozVnRaVzUwYzF0cGJtUmxlRjBwTzF4dUlDQWdJQ0FnYVdZZ0tDRnBjMFpwYm1sMFpTaGpiMlJsVUc5cGJuUXBJSHg4SUdOdlpHVlFiMmx1ZENBOElEQWdmSHdnWTI5a1pWQnZhVzUwSUQ0Z01IZ3hNRVpHUmtZZ2ZId2dabXh2YjNJb1kyOWtaVkJ2YVc1MEtTQWhQU0JqYjJSbFVHOXBiblFwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnVW1GdVoyVkZjbkp2Y2lnblNXNTJZV3hwWkNCamIyUmxJSEJ2YVc1ME9pQW5JQ3NnWTI5a1pWQnZhVzUwS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDaGpiMlJsVUc5cGJuUWdQRDBnTUhoR1JrWkdLU0I3WEc0Z0lDQWdJQ0FnSUdOdlpHVlZibWwwY3k1d2RYTm9LR052WkdWUWIybHVkQ2s3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0JqYjJSbFVHOXBiblFnTFQwZ01IZ3hNREF3TUR0Y2JpQWdJQ0FnSUNBZ2FHbG5hRk4xY25KdloyRjBaU0E5SUNoamIyUmxVRzlwYm5RZ1BqNGdNVEFwSUNzZ01IaEVPREF3TzF4dUlDQWdJQ0FnSUNCc2IzZFRkWEp5YjJkaGRHVWdQU0FvWTI5a1pWQnZhVzUwSUNVZ01IZzBNREFwSUNzZ01IaEVRekF3TzF4dUlDQWdJQ0FnSUNCamIyUmxWVzVwZEhNdWNIVnphQ2hvYVdkb1UzVnljbTluWVhSbExDQnNiM2RUZFhKeWIyZGhkR1VwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1UzUnlhVzVuTG1aeWIyMURhR0Z5UTI5a1pTNWhjSEJzZVNodWRXeHNMQ0JqYjJSbFZXNXBkSE1wTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUhOMGNtbHVaMUJ5YjNSdmRIbHdaVWwwWlhKaGRHOXlLQ2tnZTF4dUlDQWdJSFpoY2lCdklEMGdKSFJ5WVdObGRYSlNkVzUwYVcxbExtTm9aV05yVDJKcVpXTjBRMjlsY21OcFlteGxLSFJvYVhNcE8xeHVJQ0FnSUhaaGNpQnpJRDBnVTNSeWFXNW5LRzhwTzF4dUlDQWdJSEpsZEhWeWJpQmpjbVZoZEdWVGRISnBibWRKZEdWeVlYUnZjaWh6S1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCd2IyeDVabWxzYkZOMGNtbHVaeWhuYkc5aVlXd3BJSHRjYmlBZ0lDQjJZWElnVTNSeWFXNW5JRDBnWjJ4dlltRnNMbE4wY21sdVp6dGNiaUFnSUNCdFlYbGlaVUZrWkVaMWJtTjBhVzl1Y3loVGRISnBibWN1Y0hKdmRHOTBlWEJsTENCYkoyTnZaR1ZRYjJsdWRFRjBKeXdnWTI5a1pWQnZhVzUwUVhRc0lDZGxibVJ6VjJsMGFDY3NJR1Z1WkhOWGFYUm9MQ0FuYVc1amJIVmtaWE1uTENCcGJtTnNkV1JsY3l3Z0ozSmxjR1ZoZENjc0lISmxjR1ZoZEN3Z0ozTjBZWEowYzFkcGRHZ25MQ0J6ZEdGeWRITlhhWFJvWFNrN1hHNGdJQ0FnYldGNVltVkJaR1JHZFc1amRHbHZibk1vVTNSeWFXNW5MQ0JiSjJaeWIyMURiMlJsVUc5cGJuUW5MQ0JtY205dFEyOWtaVkJ2YVc1MExDQW5jbUYzSnl3Z2NtRjNYU2s3WEc0Z0lDQWdiV0Y1WW1WQlpHUkpkR1Z5WVhSdmNpaFRkSEpwYm1jdWNISnZkRzkwZVhCbExDQnpkSEpwYm1kUWNtOTBiM1I1Y0dWSmRHVnlZWFJ2Y2l3Z1UzbHRZbTlzS1R0Y2JpQWdmVnh1SUNCeVpXZHBjM1JsY2xCdmJIbG1hV3hzS0hCdmJIbG1hV3hzVTNSeWFXNW5LVHRjYmlBZ2NtVjBkWEp1SUh0Y2JpQWdJQ0JuWlhRZ2MzUmhjblJ6VjJsMGFDZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnpkR0Z5ZEhOWGFYUm9PMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJR1Z1WkhOWGFYUm9LQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR1Z1WkhOWGFYUm9PMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJR2x1WTJ4MVpHVnpLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR2x1WTJ4MVpHVnpPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJSEpsY0dWaGRDZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnlaWEJsWVhRN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ1kyOWtaVkJ2YVc1MFFYUW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdZMjlrWlZCdmFXNTBRWFE3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnY21GM0tDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlISmhkenRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0JtY205dFEyOWtaVkJ2YVc1MEtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWnliMjFEYjJSbFVHOXBiblE3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnYzNSeWFXNW5VSEp2ZEc5MGVYQmxTWFJsY21GMGIzSW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdjM1J5YVc1blVISnZkRzkwZVhCbFNYUmxjbUYwYjNJN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2NHOXNlV1pwYkd4VGRISnBibWNvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnY0c5c2VXWnBiR3hUZEhKcGJtYzdYRzRnSUNBZ2ZWeHVJQ0I5TzF4dWZTazdYRzVUZVhOMFpXMHVaMlYwS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdlUzUnlhVzVuTG1welhDSWdLeUFuSnlrN1hHNVRlWE4wWlcwdWNtVm5hWE4wWlhKTmIyUjFiR1VvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5QmNuSmhlVWwwWlhKaGRHOXlMbXB6WENJc0lGdGRMQ0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdYQ0oxYzJVZ2MzUnlhV04wWENJN1hHNGdJSFpoY2lBa1gxOHlPMXh1SUNCMllYSWdYMTl0YjJSMWJHVk9ZVzFsSUQwZ1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OUJjbkpoZVVsMFpYSmhkRzl5TG1welhDSTdYRzRnSUhaaGNpQWtYMTh3SUQwZ1UzbHpkR1Z0TG1kbGRDaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMM1YwYVd4ekxtcHpYQ0lwTEZ4dUlDQWdJQ0FnZEc5UFltcGxZM1FnUFNBa1gxOHdMblJ2VDJKcVpXTjBMRnh1SUNBZ0lDQWdkRzlWYVc1ME16SWdQU0FrWDE4d0xuUnZWV2x1ZERNeUxGeHVJQ0FnSUNBZ1kzSmxZWFJsU1hSbGNtRjBiM0pTWlhOMWJIUlBZbXBsWTNRZ1BTQWtYMTh3TG1OeVpXRjBaVWwwWlhKaGRHOXlVbVZ6ZFd4MFQySnFaV04wTzF4dUlDQjJZWElnUVZKU1FWbGZTVlJGVWtGVVQxSmZTMGxPUkY5TFJWbFRJRDBnTVR0Y2JpQWdkbUZ5SUVGU1VrRlpYMGxVUlZKQlZFOVNYMHRKVGtSZlZrRk1WVVZUSUQwZ01qdGNiaUFnZG1GeUlFRlNVa0ZaWDBsVVJWSkJWRTlTWDB0SlRrUmZSVTVVVWtsRlV5QTlJRE03WEc0Z0lIWmhjaUJCY25KaGVVbDBaWEpoZEc5eUlEMGdablZ1WTNScGIyNGdRWEp5WVhsSmRHVnlZWFJ2Y2lncElIdDlPMXh1SUNBb0pIUnlZV05sZFhKU2RXNTBhVzFsTG1OeVpXRjBaVU5zWVhOektTaEJjbkpoZVVsMFpYSmhkRzl5TENBb0pGOWZNaUE5SUh0OUxDQlBZbXBsWTNRdVpHVm1hVzVsVUhKdmNHVnlkSGtvSkY5Zk1pd2dYQ0p1WlhoMFhDSXNJSHRjYmlBZ0lDQjJZV3gxWlRvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQjJZWElnYVhSbGNtRjBiM0lnUFNCMGIwOWlhbVZqZENoMGFHbHpLVHRjYmlBZ0lDQWdJSFpoY2lCaGNuSmhlU0E5SUdsMFpYSmhkRzl5TG1sMFpYSmhkRzl5VDJKcVpXTjBYenRjYmlBZ0lDQWdJR2xtSUNnaFlYSnlZWGtwSUh0Y2JpQWdJQ0FnSUNBZ2RHaHliM2NnYm1WM0lGUjVjR1ZGY25KdmNpZ25UMkpxWldOMElHbHpJRzV2ZENCaGJpQkJjbkpoZVVsMFpYSmhkRzl5SnlrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCMllYSWdhVzVrWlhnZ1BTQnBkR1Z5WVhSdmNpNWhjbkpoZVVsMFpYSmhkRzl5VG1WNGRFbHVaR1Y0WHp0Y2JpQWdJQ0FnSUhaaGNpQnBkR1Z0UzJsdVpDQTlJR2wwWlhKaGRHOXlMbUZ5Y21GNVNYUmxjbUYwYVc5dVMybHVaRjg3WEc0Z0lDQWdJQ0IyWVhJZ2JHVnVaM1JvSUQwZ2RHOVZhVzUwTXpJb1lYSnlZWGt1YkdWdVozUm9LVHRjYmlBZ0lDQWdJR2xtSUNocGJtUmxlQ0ErUFNCc1pXNW5kR2dwSUh0Y2JpQWdJQ0FnSUNBZ2FYUmxjbUYwYjNJdVlYSnlZWGxKZEdWeVlYUnZjazVsZUhSSmJtUmxlRjhnUFNCSmJtWnBibWwwZVR0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdOeVpXRjBaVWwwWlhKaGRHOXlVbVZ6ZFd4MFQySnFaV04wS0hWdVpHVm1hVzVsWkN3Z2RISjFaU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0JwZEdWeVlYUnZjaTVoY25KaGVVbDBaWEpoZEc5eVRtVjRkRWx1WkdWNFh5QTlJR2x1WkdWNElDc2dNVHRjYmlBZ0lDQWdJR2xtSUNocGRHVnRTMmx1WkNBOVBTQkJVbEpCV1Y5SlZFVlNRVlJQVWw5TFNVNUVYMVpCVEZWRlV5bGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHTnlaV0YwWlVsMFpYSmhkRzl5VW1WemRXeDBUMkpxWldOMEtHRnljbUY1VzJsdVpHVjRYU3dnWm1Gc2MyVXBPMXh1SUNBZ0lDQWdhV1lnS0dsMFpXMUxhVzVrSUQwOUlFRlNVa0ZaWDBsVVJWSkJWRTlTWDB0SlRrUmZSVTVVVWtsRlV5bGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHTnlaV0YwWlVsMFpYSmhkRzl5VW1WemRXeDBUMkpxWldOMEtGdHBibVJsZUN3Z1lYSnlZWGxiYVc1a1pYaGRYU3dnWm1Gc2MyVXBPMXh1SUNBZ0lDQWdjbVYwZFhKdUlHTnlaV0YwWlVsMFpYSmhkRzl5VW1WemRXeDBUMkpxWldOMEtHbHVaR1Y0TENCbVlXeHpaU2s3WEc0Z0lDQWdmU3hjYmlBZ0lDQmpiMjVtYVdkMWNtRmliR1U2SUhSeWRXVXNYRzRnSUNBZ1pXNTFiV1Z5WVdKc1pUb2dkSEoxWlN4Y2JpQWdJQ0IzY21sMFlXSnNaVG9nZEhKMVpWeHVJQ0I5S1N3Z1QySnFaV04wTG1SbFptbHVaVkJ5YjNCbGNuUjVLQ1JmWHpJc0lGTjViV0p2YkM1cGRHVnlZWFJ2Y2l3Z2UxeHVJQ0FnSUhaaGJIVmxPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsek8xeHVJQ0FnSUgwc1hHNGdJQ0FnWTI5dVptbG5kWEpoWW14bE9pQjBjblZsTEZ4dUlDQWdJR1Z1ZFcxbGNtRmliR1U2SUhSeWRXVXNYRzRnSUNBZ2QzSnBkR0ZpYkdVNklIUnlkV1ZjYmlBZ2ZTa3NJQ1JmWHpJcExDQjdmU2s3WEc0Z0lHWjFibU4wYVc5dUlHTnlaV0YwWlVGeWNtRjVTWFJsY21GMGIzSW9ZWEp5WVhrc0lHdHBibVFwSUh0Y2JpQWdJQ0IyWVhJZ2IySnFaV04wSUQwZ2RHOVBZbXBsWTNRb1lYSnlZWGtwTzF4dUlDQWdJSFpoY2lCcGRHVnlZWFJ2Y2lBOUlHNWxkeUJCY25KaGVVbDBaWEpoZEc5eU8xeHVJQ0FnSUdsMFpYSmhkRzl5TG1sMFpYSmhkRzl5VDJKcVpXTjBYeUE5SUc5aWFtVmpkRHRjYmlBZ0lDQnBkR1Z5WVhSdmNpNWhjbkpoZVVsMFpYSmhkRzl5VG1WNGRFbHVaR1Y0WHlBOUlEQTdYRzRnSUNBZ2FYUmxjbUYwYjNJdVlYSnlZWGxKZEdWeVlYUnBiMjVMYVc1a1h5QTlJR3RwYm1RN1hHNGdJQ0FnY21WMGRYSnVJR2wwWlhKaGRHOXlPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR1Z1ZEhKcFpYTW9LU0I3WEc0Z0lDQWdjbVYwZFhKdUlHTnlaV0YwWlVGeWNtRjVTWFJsY21GMGIzSW9kR2hwY3l3Z1FWSlNRVmxmU1ZSRlVrRlVUMUpmUzBsT1JGOUZUbFJTU1VWVEtUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnJaWGx6S0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUJqY21WaGRHVkJjbkpoZVVsMFpYSmhkRzl5S0hSb2FYTXNJRUZTVWtGWlgwbFVSVkpCVkU5U1gwdEpUa1JmUzBWWlV5azdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdkbUZzZFdWektDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCamNtVmhkR1ZCY25KaGVVbDBaWEpoZEc5eUtIUm9hWE1zSUVGU1VrRlpYMGxVUlZKQlZFOVNYMHRKVGtSZlZrRk1WVVZUS1R0Y2JpQWdmVnh1SUNCeVpYUjFjbTRnZTF4dUlDQWdJR2RsZENCbGJuUnlhV1Z6S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdWdWRISnBaWE03WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnYTJWNWN5Z3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnJaWGx6TzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUhaaGJIVmxjeWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIyWVd4MVpYTTdYRzRnSUNBZ2ZWeHVJQ0I5TzF4dWZTazdYRzVUZVhOMFpXMHVjbVZuYVhOMFpYSk5iMlIxYkdVb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OUJjbkpoZVM1cWMxd2lMQ0JiWFN3Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUZ3aWRYTmxJSE4wY21samRGd2lPMXh1SUNCMllYSWdYMTl0YjJSMWJHVk9ZVzFsSUQwZ1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OUJjbkpoZVM1cWMxd2lPMXh1SUNCMllYSWdKRjlmTUNBOUlGTjVjM1JsYlM1blpYUW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlCY25KaGVVbDBaWEpoZEc5eUxtcHpYQ0lwTEZ4dUlDQWdJQ0FnWlc1MGNtbGxjeUE5SUNSZlh6QXVaVzUwY21sbGN5eGNiaUFnSUNBZ0lHdGxlWE1nUFNBa1gxOHdMbXRsZVhNc1hHNGdJQ0FnSUNCMllXeDFaWE1nUFNBa1gxOHdMblpoYkhWbGN6dGNiaUFnZG1GeUlDUmZYekVnUFNCVGVYTjBaVzB1WjJWMEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZkWFJwYkhNdWFuTmNJaWtzWEc0Z0lDQWdJQ0JqYUdWamEwbDBaWEpoWW14bElEMGdKRjlmTVM1amFHVmphMGwwWlhKaFlteGxMRnh1SUNBZ0lDQWdhWE5EWVd4c1lXSnNaU0E5SUNSZlh6RXVhWE5EWVd4c1lXSnNaU3hjYmlBZ0lDQWdJR2x6UTI5dWMzUnlkV04wYjNJZ1BTQWtYMTh4TG1selEyOXVjM1J5ZFdOMGIzSXNYRzRnSUNBZ0lDQnRZWGxpWlVGa1pFWjFibU4wYVc5dWN5QTlJQ1JmWHpFdWJXRjVZbVZCWkdSR2RXNWpkR2x2Ym5Nc1hHNGdJQ0FnSUNCdFlYbGlaVUZrWkVsMFpYSmhkRzl5SUQwZ0pGOWZNUzV0WVhsaVpVRmtaRWwwWlhKaGRHOXlMRnh1SUNBZ0lDQWdjbVZuYVhOMFpYSlFiMng1Wm1sc2JDQTlJQ1JmWHpFdWNtVm5hWE4wWlhKUWIyeDVabWxzYkN4Y2JpQWdJQ0FnSUhSdlNXNTBaV2RsY2lBOUlDUmZYekV1ZEc5SmJuUmxaMlZ5TEZ4dUlDQWdJQ0FnZEc5TVpXNW5kR2dnUFNBa1gxOHhMblJ2VEdWdVozUm9MRnh1SUNBZ0lDQWdkRzlQWW1wbFkzUWdQU0FrWDE4eExuUnZUMkpxWldOME8xeHVJQ0JtZFc1amRHbHZiaUJtY205dEtHRnlja3hwYTJVcElIdGNiaUFnSUNCMllYSWdiV0Z3Um00Z1BTQmhjbWQxYldWdWRITmJNVjA3WEc0Z0lDQWdkbUZ5SUhSb2FYTkJjbWNnUFNCaGNtZDFiV1Z1ZEhOYk1sMDdYRzRnSUNBZ2RtRnlJRU1nUFNCMGFHbHpPMXh1SUNBZ0lIWmhjaUJwZEdWdGN5QTlJSFJ2VDJKcVpXTjBLR0Z5Y2t4cGEyVXBPMXh1SUNBZ0lIWmhjaUJ0WVhCd2FXNW5JRDBnYldGd1JtNGdJVDA5SUhWdVpHVm1hVzVsWkR0Y2JpQWdJQ0IyWVhJZ2F5QTlJREE3WEc0Z0lDQWdkbUZ5SUdGeWNpeGNiaUFnSUNBZ0lDQWdiR1Z1TzF4dUlDQWdJR2xtSUNodFlYQndhVzVuSUNZbUlDRnBjME5oYkd4aFlteGxLRzFoY0VadUtTa2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ1ZIbHdaVVZ5Y205eUtDazdYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDaGphR1ZqYTBsMFpYSmhZbXhsS0dsMFpXMXpLU2tnZTF4dUlDQWdJQ0FnWVhKeUlEMGdhWE5EYjI1emRISjFZM1J2Y2loREtTQS9JRzVsZHlCREtDa2dPaUJiWFR0Y2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUNSZlh6SWdQU0JwZEdWdGMxc2tkSEpoWTJWMWNsSjFiblJwYldVdWRHOVFjbTl3WlhKMGVTaFRlVzFpYjJ3dWFYUmxjbUYwYjNJcFhTZ3BMRnh1SUNBZ0lDQWdJQ0FnSUNSZlh6TTdJQ0VvSkY5Zk15QTlJQ1JmWHpJdWJtVjRkQ2dwS1M1a2IyNWxPeUFwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJR2wwWlcwZ1BTQWtYMTh6TG5aaGJIVmxPMXh1SUNBZ0lDQWdJQ0I3WEc0Z0lDQWdJQ0FnSUNBZ2FXWWdLRzFoY0hCcGJtY3BJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHRnljbHRyWFNBOUlHMWhjRVp1TG1OaGJHd29kR2hwYzBGeVp5d2dhWFJsYlN3Z2F5azdYRzRnSUNBZ0lDQWdJQ0FnZlNCbGJITmxJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHRnljbHRyWFNBOUlHbDBaVzA3WEc0Z0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQWdJR3NyS3p0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ1lYSnlMbXhsYm1kMGFDQTlJR3M3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdZWEp5TzF4dUlDQWdJSDFjYmlBZ0lDQnNaVzRnUFNCMGIweGxibWQwYUNocGRHVnRjeTVzWlc1bmRHZ3BPMXh1SUNBZ0lHRnljaUE5SUdselEyOXVjM1J5ZFdOMGIzSW9ReWtnUHlCdVpYY2dReWhzWlc0cElEb2dibVYzSUVGeWNtRjVLR3hsYmlrN1hHNGdJQ0FnWm05eUlDZzdJR3NnUENCc1pXNDdJR3NyS3lrZ2UxeHVJQ0FnSUNBZ2FXWWdLRzFoY0hCcGJtY3BJSHRjYmlBZ0lDQWdJQ0FnWVhKeVcydGRJRDBnZEhsd1pXOW1JSFJvYVhOQmNtY2dQVDA5SUNkMWJtUmxabWx1WldRbklEOGdiV0Z3Um00b2FYUmxiWE5iYTEwc0lHc3BJRG9nYldGd1JtNHVZMkZzYkNoMGFHbHpRWEpuTENCcGRHVnRjMXRyWFN3Z2F5azdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQmhjbkpiYTEwZ1BTQnBkR1Z0YzF0clhUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNGdJQ0FnWVhKeUxteGxibWQwYUNBOUlHeGxianRjYmlBZ0lDQnlaWFIxY200Z1lYSnlPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJRzltS0NrZ2UxeHVJQ0FnSUdadmNpQW9kbUZ5SUdsMFpXMXpJRDBnVzEwc1hHNGdJQ0FnSUNBZ0lDUmZYelFnUFNBd095QWtYMTgwSUR3Z1lYSm5kVzFsYm5SekxteGxibWQwYURzZ0pGOWZOQ3NyS1Z4dUlDQWdJQ0FnYVhSbGJYTmJKRjlmTkYwZ1BTQmhjbWQxYldWdWRITmJKRjlmTkYwN1hHNGdJQ0FnZG1GeUlFTWdQU0IwYUdsek8xeHVJQ0FnSUhaaGNpQnNaVzRnUFNCcGRHVnRjeTVzWlc1bmRHZzdYRzRnSUNBZ2RtRnlJR0Z5Y2lBOUlHbHpRMjl1YzNSeWRXTjBiM0lvUXlrZ1B5QnVaWGNnUXloc1pXNHBJRG9nYm1WM0lFRnljbUY1S0d4bGJpazdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2F5QTlJREE3SUdzZ1BDQnNaVzQ3SUdzckt5a2dlMXh1SUNBZ0lDQWdZWEp5VzJ0ZElEMGdhWFJsYlhOYmExMDdYRzRnSUNBZ2ZWeHVJQ0FnSUdGeWNpNXNaVzVuZEdnZ1BTQnNaVzQ3WEc0Z0lDQWdjbVYwZFhKdUlHRnljanRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJtYVd4c0tIWmhiSFZsS1NCN1hHNGdJQ0FnZG1GeUlITjBZWEowSUQwZ1lYSm5kVzFsYm5Seld6RmRJQ0U5UFNBb2RtOXBaQ0F3S1NBL0lHRnlaM1Z0Wlc1MGMxc3hYU0E2SURBN1hHNGdJQ0FnZG1GeUlHVnVaQ0E5SUdGeVozVnRaVzUwYzFzeVhUdGNiaUFnSUNCMllYSWdiMkpxWldOMElEMGdkRzlQWW1wbFkzUW9kR2hwY3lrN1hHNGdJQ0FnZG1GeUlHeGxiaUE5SUhSdlRHVnVaM1JvS0c5aWFtVmpkQzVzWlc1bmRHZ3BPMXh1SUNBZ0lIWmhjaUJtYVd4c1UzUmhjblFnUFNCMGIwbHVkR1ZuWlhJb2MzUmhjblFwTzF4dUlDQWdJSFpoY2lCbWFXeHNSVzVrSUQwZ1pXNWtJQ0U5UFNCMWJtUmxabWx1WldRZ1B5QjBiMGx1ZEdWblpYSW9aVzVrS1NBNklHeGxianRjYmlBZ0lDQm1hV3hzVTNSaGNuUWdQU0JtYVd4c1UzUmhjblFnUENBd0lEOGdUV0YwYUM1dFlYZ29iR1Z1SUNzZ1ptbHNiRk4wWVhKMExDQXdLU0E2SUUxaGRHZ3ViV2x1S0dacGJHeFRkR0Z5ZEN3Z2JHVnVLVHRjYmlBZ0lDQm1hV3hzUlc1a0lEMGdabWxzYkVWdVpDQThJREFnUHlCTllYUm9MbTFoZUNoc1pXNGdLeUJtYVd4c1JXNWtMQ0F3S1NBNklFMWhkR2d1YldsdUtHWnBiR3hGYm1Rc0lHeGxiaWs3WEc0Z0lDQWdkMmhwYkdVZ0tHWnBiR3hUZEdGeWRDQThJR1pwYkd4RmJtUXBJSHRjYmlBZ0lDQWdJRzlpYW1WamRGdG1hV3hzVTNSaGNuUmRJRDBnZG1Gc2RXVTdYRzRnSUNBZ0lDQm1hV3hzVTNSaGNuUXJLenRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUc5aWFtVmpkRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJtYVc1a0tIQnlaV1JwWTJGMFpTa2dlMXh1SUNBZ0lIWmhjaUIwYUdselFYSm5JRDBnWVhKbmRXMWxiblJ6V3pGZE8xeHVJQ0FnSUhKbGRIVnliaUJtYVc1a1NHVnNjR1Z5S0hSb2FYTXNJSEJ5WldScFkyRjBaU3dnZEdocGMwRnlaeWs3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWm1sdVpFbHVaR1Y0S0hCeVpXUnBZMkYwWlNrZ2UxeHVJQ0FnSUhaaGNpQjBhR2x6UVhKbklEMGdZWEpuZFcxbGJuUnpXekZkTzF4dUlDQWdJSEpsZEhWeWJpQm1hVzVrU0dWc2NHVnlLSFJvYVhNc0lIQnlaV1JwWTJGMFpTd2dkR2hwYzBGeVp5d2dkSEoxWlNrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1ptbHVaRWhsYkhCbGNpaHpaV3htTENCd2NtVmthV05oZEdVcElIdGNiaUFnSUNCMllYSWdkR2hwYzBGeVp5QTlJR0Z5WjNWdFpXNTBjMXN5WFR0Y2JpQWdJQ0IyWVhJZ2NtVjBkWEp1U1c1a1pYZ2dQU0JoY21kMWJXVnVkSE5iTTEwZ0lUMDlJQ2gyYjJsa0lEQXBJRDhnWVhKbmRXMWxiblJ6V3pOZElEb2dabUZzYzJVN1hHNGdJQ0FnZG1GeUlHOWlhbVZqZENBOUlIUnZUMkpxWldOMEtITmxiR1lwTzF4dUlDQWdJSFpoY2lCc1pXNGdQU0IwYjB4bGJtZDBhQ2h2WW1wbFkzUXViR1Z1WjNSb0tUdGNiaUFnSUNCcFppQW9JV2x6UTJGc2JHRmliR1VvY0hKbFpHbGpZWFJsS1NrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnVkhsd1pVVnljbTl5S0NrN1hHNGdJQ0FnZlZ4dUlDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnYkdWdU95QnBLeXNwSUh0Y2JpQWdJQ0FnSUhaaGNpQjJZV3gxWlNBOUlHOWlhbVZqZEZ0cFhUdGNiaUFnSUNBZ0lHbG1JQ2h3Y21Wa2FXTmhkR1V1WTJGc2JDaDBhR2x6UVhKbkxDQjJZV3gxWlN3Z2FTd2diMkpxWldOMEtTa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjbVYwZFhKdVNXNWtaWGdnUHlCcElEb2dkbUZzZFdVN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnlaWFIxY201SmJtUmxlQ0EvSUMweElEb2dkVzVrWldacGJtVmtPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJSEJ2YkhsbWFXeHNRWEp5WVhrb1oyeHZZbUZzS1NCN1hHNGdJQ0FnZG1GeUlDUmZYelVnUFNCbmJHOWlZV3dzWEc0Z0lDQWdJQ0FnSUVGeWNtRjVJRDBnSkY5Zk5TNUJjbkpoZVN4Y2JpQWdJQ0FnSUNBZ1QySnFaV04wSUQwZ0pGOWZOUzVQWW1wbFkzUXNYRzRnSUNBZ0lDQWdJRk41YldKdmJDQTlJQ1JmWHpVdVUzbHRZbTlzTzF4dUlDQWdJRzFoZVdKbFFXUmtSblZ1WTNScGIyNXpLRUZ5Y21GNUxuQnliM1J2ZEhsd1pTd2dXeWRsYm5SeWFXVnpKeXdnWlc1MGNtbGxjeXdnSjJ0bGVYTW5MQ0JyWlhsekxDQW5kbUZzZFdWekp5d2dkbUZzZFdWekxDQW5abWxzYkNjc0lHWnBiR3dzSUNkbWFXNWtKeXdnWm1sdVpDd2dKMlpwYm1SSmJtUmxlQ2NzSUdacGJtUkpibVJsZUYwcE8xeHVJQ0FnSUcxaGVXSmxRV1JrUm5WdVkzUnBiMjV6S0VGeWNtRjVMQ0JiSjJaeWIyMG5MQ0JtY205dExDQW5iMlluTENCdlpsMHBPMXh1SUNBZ0lHMWhlV0psUVdSa1NYUmxjbUYwYjNJb1FYSnlZWGt1Y0hKdmRHOTBlWEJsTENCMllXeDFaWE1zSUZONWJXSnZiQ2s3WEc0Z0lDQWdiV0Y1WW1WQlpHUkpkR1Z5WVhSdmNpaFBZbXBsWTNRdVoyVjBVSEp2ZEc5MGVYQmxUMllvVzEwdWRtRnNkV1Z6S0NrcExDQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TzF4dUlDQWdJSDBzSUZONWJXSnZiQ2s3WEc0Z0lIMWNiaUFnY21WbmFYTjBaWEpRYjJ4NVptbHNiQ2h3YjJ4NVptbHNiRUZ5Y21GNUtUdGNiaUFnY21WMGRYSnVJSHRjYmlBZ0lDQm5aWFFnWm5KdmJTZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQm1jbTl0TzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUc5bUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHOW1PMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJR1pwYkd3b0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1ptbHNiRHRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0JtYVc1a0tDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWnBibVE3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnWm1sdVpFbHVaR1Y0S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdacGJtUkpibVJsZUR0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCd2IyeDVabWxzYkVGeWNtRjVLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSEJ2YkhsbWFXeHNRWEp5WVhrN1hHNGdJQ0FnZlZ4dUlDQjlPMXh1ZlNrN1hHNVRlWE4wWlcwdVoyVjBLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12UVhKeVlYa3Vhbk5jSWlBcklDY25LVHRjYmxONWMzUmxiUzV5WldkcGMzUmxjazF2WkhWc1pTaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMMDlpYW1WamRDNXFjMXdpTENCYlhTd2dablZ1WTNScGIyNG9LU0I3WEc0Z0lGd2lkWE5sSUhOMGNtbGpkRndpTzF4dUlDQjJZWElnWDE5dGIyUjFiR1ZPWVcxbElEMGdYQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlQWW1wbFkzUXVhbk5jSWp0Y2JpQWdkbUZ5SUNSZlh6QWdQU0JUZVhOMFpXMHVaMlYwS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdmRYUnBiSE11YW5OY0lpa3NYRzRnSUNBZ0lDQnRZWGxpWlVGa1pFWjFibU4wYVc5dWN5QTlJQ1JmWHpBdWJXRjVZbVZCWkdSR2RXNWpkR2x2Ym5Nc1hHNGdJQ0FnSUNCeVpXZHBjM1JsY2xCdmJIbG1hV3hzSUQwZ0pGOWZNQzV5WldkcGMzUmxjbEJ2YkhsbWFXeHNPMXh1SUNCMllYSWdKRjlmTVNBOUlDUjBjbUZqWlhWeVVuVnVkR2x0WlN4Y2JpQWdJQ0FnSUdSbFptbHVaVkJ5YjNCbGNuUjVJRDBnSkY5Zk1TNWtaV1pwYm1WUWNtOXdaWEowZVN4Y2JpQWdJQ0FnSUdkbGRFOTNibEJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaUE5SUNSZlh6RXVaMlYwVDNkdVVISnZjR1Z5ZEhsRVpYTmpjbWx3ZEc5eUxGeHVJQ0FnSUNBZ1oyVjBUM2R1VUhKdmNHVnlkSGxPWVcxbGN5QTlJQ1JmWHpFdVoyVjBUM2R1VUhKdmNHVnlkSGxPWVcxbGN5eGNiaUFnSUNBZ0lHbHpVSEpwZG1GMFpVNWhiV1VnUFNBa1gxOHhMbWx6VUhKcGRtRjBaVTVoYldVc1hHNGdJQ0FnSUNCclpYbHpJRDBnSkY5Zk1TNXJaWGx6TzF4dUlDQm1kVzVqZEdsdmJpQnBjeWhzWldaMExDQnlhV2RvZENrZ2UxeHVJQ0FnSUdsbUlDaHNaV1owSUQwOVBTQnlhV2RvZENsY2JpQWdJQ0FnSUhKbGRIVnliaUJzWldaMElDRTlQU0F3SUh4OElERWdMeUJzWldaMElEMDlQU0F4SUM4Z2NtbG5hSFE3WEc0Z0lDQWdjbVYwZFhKdUlHeGxablFnSVQwOUlHeGxablFnSmlZZ2NtbG5hSFFnSVQwOUlISnBaMmgwTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdGemMybG5iaWgwWVhKblpYUXBJSHRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTVRzZ2FTQThJR0Z5WjNWdFpXNTBjeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE52ZFhKalpTQTlJR0Z5WjNWdFpXNTBjMXRwWFR0Y2JpQWdJQ0FnSUhaaGNpQndjbTl3Y3lBOUlITnZkWEpqWlNBOVBTQnVkV3hzSUQ4Z1cxMGdPaUJyWlhsektITnZkWEpqWlNrN1hHNGdJQ0FnSUNCMllYSWdjQ3hjYmlBZ0lDQWdJQ0FnSUNCc1pXNW5kR2dnUFNCd2NtOXdjeTVzWlc1bmRHZzdYRzRnSUNBZ0lDQm1iM0lnS0hBZ1BTQXdPeUJ3SUR3Z2JHVnVaM1JvT3lCd0t5c3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHNWhiV1VnUFNCd2NtOXdjMXR3WFR0Y2JpQWdJQ0FnSUNBZ2FXWWdLR2x6VUhKcGRtRjBaVTVoYldVb2JtRnRaU2twWEc0Z0lDQWdJQ0FnSUNBZ1kyOXVkR2x1ZFdVN1hHNGdJQ0FnSUNBZ0lIUmhjbWRsZEZ0dVlXMWxYU0E5SUhOdmRYSmpaVnR1WVcxbFhUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSFJoY21kbGREdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnRhWGhwYmloMFlYSm5aWFFzSUhOdmRYSmpaU2tnZTF4dUlDQWdJSFpoY2lCd2NtOXdjeUE5SUdkbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNb2MyOTFjbU5sS1R0Y2JpQWdJQ0IyWVhJZ2NDeGNiaUFnSUNBZ0lDQWdaR1Z6WTNKcGNIUnZjaXhjYmlBZ0lDQWdJQ0FnYkdWdVozUm9JRDBnY0hKdmNITXViR1Z1WjNSb08xeHVJQ0FnSUdadmNpQW9jQ0E5SURBN0lIQWdQQ0JzWlc1bmRHZzdJSEFyS3lrZ2UxeHVJQ0FnSUNBZ2RtRnlJRzVoYldVZ1BTQndjbTl3YzF0d1hUdGNiaUFnSUNBZ0lHbG1JQ2hwYzFCeWFYWmhkR1ZPWVcxbEtHNWhiV1VwS1Z4dUlDQWdJQ0FnSUNCamIyNTBhVzUxWlR0Y2JpQWdJQ0FnSUdSbGMyTnlhWEIwYjNJZ1BTQm5aWFJQZDI1UWNtOXdaWEowZVVSbGMyTnlhWEIwYjNJb2MyOTFjbU5sTENCd2NtOXdjMXR3WFNrN1hHNGdJQ0FnSUNCa1pXWnBibVZRY205d1pYSjBlU2gwWVhKblpYUXNJSEJ5YjNCelczQmRMQ0JrWlhOamNtbHdkRzl5S1R0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlIUmhjbWRsZER0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCd2IyeDVabWxzYkU5aWFtVmpkQ2huYkc5aVlXd3BJSHRjYmlBZ0lDQjJZWElnVDJKcVpXTjBJRDBnWjJ4dlltRnNMazlpYW1WamREdGNiaUFnSUNCdFlYbGlaVUZrWkVaMWJtTjBhVzl1Y3loUFltcGxZM1FzSUZzbllYTnphV2R1Snl3Z1lYTnphV2R1TENBbmFYTW5MQ0JwY3l3Z0oyMXBlR2x1Snl3Z2JXbDRhVzVkS1R0Y2JpQWdmVnh1SUNCeVpXZHBjM1JsY2xCdmJIbG1hV3hzS0hCdmJIbG1hV3hzVDJKcVpXTjBLVHRjYmlBZ2NtVjBkWEp1SUh0Y2JpQWdJQ0JuWlhRZ2FYTW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdhWE03WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnWVhOemFXZHVLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR0Z6YzJsbmJqdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQnRhWGhwYmlncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCdGFYaHBianRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0J3YjJ4NVptbHNiRTlpYW1WamRDZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQndiMng1Wm1sc2JFOWlhbVZqZER0Y2JpQWdJQ0I5WEc0Z0lIMDdYRzU5S1R0Y2JsTjVjM1JsYlM1blpYUW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlQWW1wbFkzUXVhbk5jSWlBcklDY25LVHRjYmxONWMzUmxiUzV5WldkcGMzUmxjazF2WkhWc1pTaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMMDUxYldKbGNpNXFjMXdpTENCYlhTd2dablZ1WTNScGIyNG9LU0I3WEc0Z0lGd2lkWE5sSUhOMGNtbGpkRndpTzF4dUlDQjJZWElnWDE5dGIyUjFiR1ZPWVcxbElEMGdYQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlPZFcxaVpYSXVhbk5jSWp0Y2JpQWdkbUZ5SUNSZlh6QWdQU0JUZVhOMFpXMHVaMlYwS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdmRYUnBiSE11YW5OY0lpa3NYRzRnSUNBZ0lDQnBjMDUxYldKbGNpQTlJQ1JmWHpBdWFYTk9kVzFpWlhJc1hHNGdJQ0FnSUNCdFlYbGlaVUZrWkVOdmJuTjBjeUE5SUNSZlh6QXViV0Y1WW1WQlpHUkRiMjV6ZEhNc1hHNGdJQ0FnSUNCdFlYbGlaVUZrWkVaMWJtTjBhVzl1Y3lBOUlDUmZYekF1YldGNVltVkJaR1JHZFc1amRHbHZibk1zWEc0Z0lDQWdJQ0J5WldkcGMzUmxjbEJ2YkhsbWFXeHNJRDBnSkY5Zk1DNXlaV2RwYzNSbGNsQnZiSGxtYVd4c0xGeHVJQ0FnSUNBZ2RHOUpiblJsWjJWeUlEMGdKRjlmTUM1MGIwbHVkR1ZuWlhJN1hHNGdJSFpoY2lBa1lXSnpJRDBnVFdGMGFDNWhZbk03WEc0Z0lIWmhjaUFrYVhOR2FXNXBkR1VnUFNCcGMwWnBibWwwWlR0Y2JpQWdkbUZ5SUNScGMwNWhUaUE5SUdselRtRk9PMXh1SUNCMllYSWdUVUZZWDFOQlJrVmZTVTVVUlVkRlVpQTlJRTFoZEdndWNHOTNLRElzSURVektTQXRJREU3WEc0Z0lIWmhjaUJOU1U1ZlUwRkdSVjlKVGxSRlIwVlNJRDBnTFUxaGRHZ3VjRzkzS0RJc0lEVXpLU0FySURFN1hHNGdJSFpoY2lCRlVGTkpURTlPSUQwZ1RXRjBhQzV3YjNjb01pd2dMVFV5S1R0Y2JpQWdablZ1WTNScGIyNGdUblZ0WW1WeVNYTkdhVzVwZEdVb2JuVnRZbVZ5S1NCN1hHNGdJQ0FnY21WMGRYSnVJR2x6VG5WdFltVnlLRzUxYldKbGNpa2dKaVlnSkdselJtbHVhWFJsS0c1MWJXSmxjaWs3WEc0Z0lIMWNiaUFnTzF4dUlDQm1kVzVqZEdsdmJpQnBjMGx1ZEdWblpYSW9iblZ0WW1WeUtTQjdYRzRnSUNBZ2NtVjBkWEp1SUU1MWJXSmxja2x6Um1sdWFYUmxLRzUxYldKbGNpa2dKaVlnZEc5SmJuUmxaMlZ5S0c1MWJXSmxjaWtnUFQwOUlHNTFiV0psY2p0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCT2RXMWlaWEpKYzA1aFRpaHVkVzFpWlhJcElIdGNiaUFnSUNCeVpYUjFjbTRnYVhOT2RXMWlaWElvYm5WdFltVnlLU0FtSmlBa2FYTk9ZVTRvYm5WdFltVnlLVHRjYmlBZ2ZWeHVJQ0E3WEc0Z0lHWjFibU4wYVc5dUlHbHpVMkZtWlVsdWRHVm5aWElvYm5WdFltVnlLU0I3WEc0Z0lDQWdhV1lnS0U1MWJXSmxja2x6Um1sdWFYUmxLRzUxYldKbGNpa3BJSHRjYmlBZ0lDQWdJSFpoY2lCcGJuUmxaM0poYkNBOUlIUnZTVzUwWldkbGNpaHVkVzFpWlhJcE8xeHVJQ0FnSUNBZ2FXWWdLR2x1ZEdWbmNtRnNJRDA5UFNCdWRXMWlaWElwWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUFrWVdKektHbHVkR1ZuY21Gc0tTQThQU0JOUVZoZlUwRkdSVjlKVGxSRlIwVlNPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnWm1Gc2MyVTdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjRzlzZVdacGJHeE9kVzFpWlhJb1oyeHZZbUZzS1NCN1hHNGdJQ0FnZG1GeUlFNTFiV0psY2lBOUlHZHNiMkpoYkM1T2RXMWlaWEk3WEc0Z0lDQWdiV0Y1WW1WQlpHUkRiMjV6ZEhNb1RuVnRZbVZ5TENCYkowMUJXRjlUUVVaRlgwbE9WRVZIUlZJbkxDQk5RVmhmVTBGR1JWOUpUbFJGUjBWU0xDQW5UVWxPWDFOQlJrVmZTVTVVUlVkRlVpY3NJRTFKVGw5VFFVWkZYMGxPVkVWSFJWSXNJQ2RGVUZOSlRFOU9KeXdnUlZCVFNVeFBUbDBwTzF4dUlDQWdJRzFoZVdKbFFXUmtSblZ1WTNScGIyNXpLRTUxYldKbGNpd2dXeWRwYzBacGJtbDBaU2NzSUU1MWJXSmxja2x6Um1sdWFYUmxMQ0FuYVhOSmJuUmxaMlZ5Snl3Z2FYTkpiblJsWjJWeUxDQW5hWE5PWVU0bkxDQk9kVzFpWlhKSmMwNWhUaXdnSjJselUyRm1aVWx1ZEdWblpYSW5MQ0JwYzFOaFptVkpiblJsWjJWeVhTazdYRzRnSUgxY2JpQWdjbVZuYVhOMFpYSlFiMng1Wm1sc2JDaHdiMng1Wm1sc2JFNTFiV0psY2lrN1hHNGdJSEpsZEhWeWJpQjdYRzRnSUNBZ1oyVjBJRTFCV0Y5VFFVWkZYMGxPVkVWSFJWSW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdUVUZZWDFOQlJrVmZTVTVVUlVkRlVqdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQk5TVTVmVTBGR1JWOUpUbFJGUjBWU0tDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlFMUpUbDlUUVVaRlgwbE9WRVZIUlZJN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ1JWQlRTVXhQVGlncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCRlVGTkpURTlPTzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUdselJtbHVhWFJsS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUU1MWJXSmxja2x6Um1sdWFYUmxPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJR2x6U1c1MFpXZGxjaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJwYzBsdWRHVm5aWEk3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnYVhOT1lVNG9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdUblZ0WW1WeVNYTk9ZVTQ3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnYVhOVFlXWmxTVzUwWldkbGNpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnBjMU5oWm1WSmJuUmxaMlZ5TzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUhCdmJIbG1hV3hzVG5WdFltVnlLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSEJ2YkhsbWFXeHNUblZ0WW1WeU8xeHVJQ0FnSUgxY2JpQWdmVHRjYm4wcE8xeHVVM2x6ZEdWdExtZGxkQ2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDA1MWJXSmxjaTVxYzF3aUlDc2dKeWNwTzF4dVUzbHpkR1Z0TG5KbFoybHpkR1Z5VFc5a2RXeGxLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12Y0c5c2VXWnBiR3h6TG1welhDSXNJRnRkTENCbWRXNWpkR2x2YmlncElIdGNiaUFnWENKMWMyVWdjM1J5YVdOMFhDSTdYRzRnSUhaaGNpQmZYMjF2WkhWc1pVNWhiV1VnUFNCY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwzQnZiSGxtYVd4c2N5NXFjMXdpTzF4dUlDQjJZWElnY0c5c2VXWnBiR3hCYkd3Z1BTQlRlWE4wWlcwdVoyVjBLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12ZFhScGJITXVhbk5jSWlrdWNHOXNlV1pwYkd4QmJHdzdYRzRnSUhCdmJIbG1hV3hzUVd4c0tGSmxabXhsWTNRdVoyeHZZbUZzS1R0Y2JpQWdkbUZ5SUhObGRIVndSMnh2WW1Gc2N5QTlJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNXpaWFIxY0Vkc2IySmhiSE03WEc0Z0lDUjBjbUZqWlhWeVVuVnVkR2x0WlM1elpYUjFjRWRzYjJKaGJITWdQU0JtZFc1amRHbHZiaWhuYkc5aVlXd3BJSHRjYmlBZ0lDQnpaWFIxY0Vkc2IySmhiSE1vWjJ4dlltRnNLVHRjYmlBZ0lDQndiMng1Wm1sc2JFRnNiQ2huYkc5aVlXd3BPMXh1SUNCOU8xeHVJQ0J5WlhSMWNtNGdlMzA3WEc1OUtUdGNibE41YzNSbGJTNW5aWFFvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5d2IyeDVabWxzYkhNdWFuTmNJaUFySUNjbktUdGNiaUpkZlE9PSIsIi8vLyBTbGlkZXIgcmVsYXRlZCBnb29kaWVzIC8vL1xuZnVuY3Rpb24gc2xpZGVyTGFiZWwoaSkge1xuICByZXR1cm4gJ3NsaWRlcicgKyBpLnRvU3RyaW5nKCk7XG59XG5cbnZhciByZXNwb25zZXMgPSBbXTtcbnZhciBuUmVzcG9uc2VzID0gMDtcblxuXG5mdW5jdGlvbiByZXNldFJhZGlvKCkge1xuICAkKCcjcmFkaW9zJykuY2hpbGRyZW4oKS5jaGlsZHJlbigpLnByb3AoJ2NoZWNrZWQnLCBmYWxzZSk7XG59XG5cblxuZnVuY3Rpb24gcmVzZXRTbGlkZXIoKSB7XG4gIC8vIGdldHMgY2FsbGVkIG9uIGFmdGVyIGVhY2ggaXRlbVxuICBfLmVhY2goJCgnLnNsaWRlcicpLCBmdW5jdGlvbihzbGlkZXIpIHtcbiAgICAkKHNsaWRlcikuc2xpZGVyKCdvcHRpb24nLCAndmFsdWUnLCAwLjUpO1xuICAgICQoc2xpZGVyKS5jc3MoeyAnYmFja2dyb3VuZCc6ICcnLCAnYm9yZGVyLWNvbG9yJzogJycgfSk7XG4gIH0pO1xuXG4gIHJlc3BvbnNlcyA9IFtdO1xuICBuUmVzcG9uc2VzID0gMDtcbn1cblxuXG5mdW5jdGlvbiBjaGFuZ2VDcmVhdG9yKGkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICQoJyMnICsgc2xpZGVyTGFiZWwoaSkpLmNzcyh7XCJiYWNrZ3JvdW5kXCI6XCIjOTlENkVCXCJ9KTtcbiAgICAgICAgJCgnIycgKyBzbGlkZXJMYWJlbChpKSArICcgLnVpLXNsaWRlci1oYW5kbGUnKS5jc3Moe1xuICAgICAgICAgIFwiYmFja2dyb3VuZFwiOlwiIzY2N0Q5NFwiLFxuICAgICAgICAgIFwiYm9yZGVyLWNvbG9yXCI6IFwiIzAwMUYyOVwiXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGlmIChyZXNwb25zZXNbaV0gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHJlc3BvbnNlc1tpXSA9IDE7XG4gICAgICAgICAgblJlc3BvbnNlcyArPSAxO1xuICAgICAgICB9XG4gIH07XG59XG5cblxuZnVuY3Rpb24gc2xpZGVDcmVhdG9yKGkpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICQoJyMnICsgc2xpZGVyTGFiZWwoaSkgKyAnIC51aS1zbGlkZXItaGFuZGxlJykuY3NzKHtcbiAgICAgICAgICAgXCJiYWNrZ3JvdW5kXCI6XCIjRTBGNUZGXCIsXG4gICAgICAgICAgIFwiYm9yZGVyLWNvbG9yXCI6IFwiIzAwMUYyOVwiXG4gICAgfSk7XG4gIH07XG59XG5cblxuZnVuY3Rpb24gaW5zZXJ0QmlucyhuYmlucywgdG9jbG9uZSkge1xuICB2YXIgaSA9IDA7XG4gIC8vdmFyIHRvY2xvbmUgPSAkKCcjYmluLXRvY2xvbmUnKTtcblxuICB3aGlsZSAobmJpbnMtLSkge1xuICAgIHZhciBjbG9uZSA9IHRvY2xvbmUuY2xvbmUoKTtcbiAgICBjbG9uZS5hdHRyKCdpZCcsICdiaW4nICsgbmJpbnMpO1xuICAgIGNsb25lLmluc2VydEFmdGVyKCQoJyNiaW4tYWZ0ZXInKSk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBpbnNlcnRTbGlkZXJzKG5iaW5zLCB0b2Nsb25lKSB7XG4gIC8vIGNsb25lIHRoZSBzbGlkZXIgdGhhdCBpcyBpbiB0aGUgaXRlbS5odG1sIGZpbGVcbiAgLy8gKm5iaW5zKiB0aW1lcyBhbmQgdGhlbiByZW1vdmUgdGhlIHNsaWRlciB0aGF0IGlzIGluIGl0ZW0uaHRtbFxuICB2YXIgaSA9IDA7XG4gIC8vdmFyIHRvY2xvbmUgPSAkKCcudG9jbG9uZScpO1xuXG4gIHdoaWxlIChuYmlucy0tKSB7XG4gICAgdmFyIGNsb25lID0gdG9jbG9uZS5jbG9uZSgpO1xuICAgIFxuICAgIGNsb25lLmNoaWxkcmVuKCkuYXR0cignaWQnLCAnc2xpZGVyJyArIG5iaW5zKTtcbiAgICBjbG9uZS5pbnNlcnRBZnRlcigkKCcjc2xpZGVyLWFmdGVyJykpO1xuICB9XG59XG5cblxuZnVuY3Rpb24gaW5zZXJ0UmFkaW8oKSB7XG4gIC8vIGNsb25lIHRoZSBiaW5zLCBjaGFuZ2UgdGhlIGh0bWwgb2YgdGhlIHJlc3BlY3RpdmUgZWxlbWVudHNcbiAgLy8gdG8gcmFkaW8gaW5wdXQgZWxlbWVudHM7IGluc2VydCBpdCBiZWZvcmUgdGhlIGJpbnNcbiAgdmFyIGkgPSAtMTtcbiAgdmFyIGlucHV0ID0gJzxpbnB1dCB0eXBlPVwicmFkaW9cIiBuYW1lPVwiYW5zd2VyXCIgLz4nO1xuICB2YXIgZWwgPSAkKCcjYmlucycpLmNsb25lKCk7XG4gICQoZWwpLmF0dHIoJ2lkJywgJ3JhZGlvcycpO1xuICBcbiAgJChlbCkuY2hpbGRyZW4oKS5odG1sKGlucHV0KS5hdHRyKCdpZCcsIGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiAncmFkaW8nICsgaSsrO1xuICB9KTtcblxuICAkKGVsKS5pbnNlcnRCZWZvcmUoJCgnI2JpbnMnKSk7XG4gICQoJyNyYWRpb3MgPiB0ZFt3aWR0aD1cIjE1MFwiXScpLmNoaWxkcmVuKCkuYXR0cigndHlwZScsICdoaWRkZW4nKTtcbn1cblxuXG5mdW5jdGlvbiBjcmVhdGVTbGlkZXJzKG5iaW5zKSB7XG4gIHZhciBpO1xuICB2YXIgYXR0ciA9IHtcbiAgICAgIFwid2lkdGhcIjpcIjEycHhcIixcbiAgICAgIFwiaGVpZ2h0XCI6XCIzNjBweFwiLFxuICAgICAgXCJwb3NpdGlvblwiOlwicmVsYXRpdmVcIixcbiAgICAgIFwibWFyZ2luXCI6XCI1cHhcIlxuICB9O1xuXG4gIGZvciAoaSA9IDA7IGkgPCBuYmluczsgaSsrKSB7XG4gICAgdmFyIGxhYmVsID0gc2xpZGVyTGFiZWwoaSk7XG4gICAgJCgnIycgKyBsYWJlbCkuYXR0cihhdHRyKTtcbiAgICAkKCcjJyArIGxhYmVsICsgJyAudWktc2xpZGVyLWhhbmRsZScpLmF0dHIoe1wiYmFja2dyb3VuZFwiOiBcIiNGQUZBRkFcIn0pO1xuICAgICQoJyMnICsgbGFiZWwpLnNsaWRlcih7XG4gICAgICBhbmltYXRlOiB0cnVlLFxuICAgICAgb3JpZW50YXRpb246IFwidmVydGljYWxcIixcbiAgICAgIG1heDogMSAsIG1pbjogMCwgc3RlcDogMC4wMSwgdmFsdWU6IDAuNSxcbiAgICAgIHNsaWRlOiBzbGlkZUNyZWF0b3IoaSksXG4gICAgICBjaGFuZ2U6IGNoYW5nZUNyZWF0b3IoaSlcbiAgICB9KTtcbiAgfVxufVxuXG4vLy8gZW5kIG9mIHNsaWRlciByZWxhdGVkIGdvb2RpZXMvLy9cblxuXG5cbnZhciBwc2lUdXJrID0gcmVxdWlyZSgnLi9wc2l0dXJrJyk7XG52YXIgc2V0dXBUcmlhbHMgPSByZXF1aXJlKCcuL3NwZWNpZmljL2l0ZW1zJyk7XG52YXIgUXVlc3Rpb25uYWlyZSA9IHJlcXVpcmUoJy4vc3BlY2lmaWMvZW5kaW5nJyk7XG5cbnZhciBFeHBlcmltZW50ID0gZnVuY3Rpb24oKSB7IC8vdGhlIG1haW4gb2JqZWN0IG9mIHRoZSB3aG9sZSB0aGluZ1xuICAgIFxuICB2YXIgY291bnQgPSAwO1xuICB2YXIgbmJpbnMgPSAxMTtcbiAgdmFyIGJpbnMgPSBbXCIwXCIsIFwiMVwiLCBcIjJcIiwgXCIzXCIsIFwiNFwiLCBcIjVcIiwgXCI2XCIsIFwiN1wiLCBcIjhcIiwgXCI5XCIsIFwiMTBcIl1cbiAgdmFyIE1BWEJJTlMgPSAxMTtcbiAgICBcbiAgdmFyIGJpbl9jbG9uZSA9ICQoJzx0ZCBjbGFzcz1cInRvY2xvbmVcIiBpZD1cImJpbi10b2Nsb25lXCIgYWxpZ249XCJjZW50ZXJcIiB3aWR0aD1cIjEwMFwiPjwvdGQ+Jyk7XG4gIHZhciBzbGlkZXJfY2xvbmUgPSAkKCc8dGQgY2xhc3M9XCJ0b2Nsb25lXCIgcm93c3Bhbj1cIjVcIiB3aWR0aD1cIjEwMFwiIGFsaWduPVwiY2VudGVyXCI+IDxkaXYgY2xhc3M9XCJzbGlkZXIgdWktc2xpZGVyIHVpLXNsaWRlci12ZXJ0aWNhbCB1aS13aWRnZXQgdWktd2lkZ2V0LWNvbnRlbnQgdWktY29ybmVyLWFsbFwiIGlkPVwic2xpZGVyLWNsb25lXCIgd2lkdGg9XCIxMnB4XCIgaGVpZ2h0PVwiMzYwcHhcIiBwb3NpdGlvbj1cInJlbGF0aXZlXCIgbWFyZ2luPVwiNXB4XCIgYXJpYS1kaXNhYmxlZD1cImZhbHNlXCI+IDxhIGNsYXNzPVwidWktc2xpZGVyLWhhbmRsZSB1aS1zdGF0ZS1kZWZhdWx0IHVpLWNvcm5lci1hbGxcIiBocmVmPVwiI1wiIHN0eWxlPVwiYm90dG9tOiA1MCU7XCI+PC9hPiA8L2Rpdj4gPC90ZD4nKTtcblxuICB2YXIgdHJpYWxEYXRhID0gW107XG4gIHZhciBzdGFydCA9ICsgbmV3IERhdGUoKTsgICAgXG4gICAgXG4gIHZhciBhbGxUcmlhbHMgPSBzZXR1cFRyaWFscygpOy8vY2FsbHMgdGhlIGZ1bmN0aW9uIGRlZmluZWQgaW4gaXRlbXMuanMsIHdoaWNoIGNyZWF0ZXMgYSBudW1iZXIgb2YgdHJpYWxzXG4gICAgXG4gIHZhciBuZXh0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICAvLyBpZiB0aGVyZSBhcmUgaXRlbXMgbGVmdCwgc3RhcnQgYSBuZXcgdHJpYWxcbiAgICBpZiAoY291bnQgPCBhbGxUcmlhbHMubGVuZ3RoKSB7XG5cbiAgICAgIHZhciB0cmlhbCA9IGFsbFRyaWFsc1tjb3VudCsrXTtcbiAgICAgIHRyaWFsRGF0YS5zcGxpY2UoMCwgMCwgcGFyc2VJbnQoY291bnQpLCB0cmlhbC52YWx1ZSwgdHJpYWwuYWNjZXNzLCB0cmlhbC5vYnNlcnZhdGlvbik7XG4gICAgICBcbiAgICAgIHJlc2V0U2xpZGVyKCk7XG5cbiAgICAgIC8vIGluc2VydCBhbGwgdGhlIHNsaWRlcnMgaW50byB0aGUgcGFnZVxuICAgICAgaW5zZXJ0QmlucyhuYmlucywgYmluX2Nsb25lKTtcbiAgICAgIGluc2VydFNsaWRlcnMobmJpbnMsIHNsaWRlcl9jbG9uZSk7XG4gICAgICBjcmVhdGVTbGlkZXJzKG5iaW5zKTtcblxuICAgICAgJCgnI3BpYycpLmh0bWwodHJpYWwucGljKTtcbiAgICAgICQoJyNzY2VuYXJpbycpLnRleHQodHJpYWwuc2NlbmFyaW8pO1xuICAgICAgJCgnI3BlcmNlbnRhZ2UnKS50ZXh0KE1hdGguZmxvb3IodHJpYWwucGVyY2VudGFnZSkpOyAvL3VzZWQgdG8gZGlzcGxheSB0aGUgcHJvZ3Jlc3MgdG8gdGhlIHN1YmplY3RcbiAgICAgICQoJyNwZXJjZW50YWdlQmlzJykudGV4dChNYXRoLmZsb29yKHRyaWFsLnBlcmNlbnRhZ2VCaXMpKTsgLy9zYW1lXG5cbiAgICAgIF8uZWFjaChiaW5zLCBmdW5jdGlvbihiaW4sIGkpIHtcbiAgICAgICAgJCgnI2JpbicgKyBpKS5odG1sKGJpbik7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBlbHNlIHtcbiAgICAgIC8vIGVuZCB0aGUgZXhwZXJpbWVudCAmIHNob3cgcG9zdC1xdWVzdGlvbm5haXJlXG4gICAgICBuZXcgUXVlc3Rpb25uYWlyZSgpLnN0YXJ0KCk7XG4gICAgfVxuICB9OyAgICBcblxuICAgICAgIFxuICB2YXIgc2F2ZSA9IGZ1bmN0aW9uKGUpIHtcbiAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgaWYgKG5SZXNwb25zZXMgPCBuYmlucykge1xuICAgICAgdmFyIG1lc3MgPSBbJ1BsZWFzZSByYXRlIGV2ZXJ5IHF1YW50aXR5LicsICdJZiB5b3UgdGhpbmsgdGhhdCBhIHNsaWRlciBpcyBwbGFjZWQgY29ycmVjdGx5LCcsXG4gICAgICAgICAgICAgICAgICAnanVzdCBjbGljayBvbiBpdC4nLCAnWW91IGNhbiBvbmx5IHByb2NlZWQgaWYgYWxsIHNsaWRlcnMgaGF2ZSBiZWVuIGNoZWNrZWQgb3IgbW92ZWQuJ10uam9pbignICcpO1xuICAgICAgYWxlcnQobWVzcyk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgdmFyIFJUID0gKyBuZXcgRGF0ZSgpIC0gc3RhcnQ7XG5cbiAgICAvLyBnZXQgdGhlIHJhdGluZ3NcbiAgICB2YXIgcmF0aW5ncyA9IF8ubWFwKCQoJy5zbGlkZXInKSwgZnVuY3Rpb24oc2xpZGVyKSB7XG4gICAgICByZXR1cm4gJChzbGlkZXIpLnNsaWRlcignb3B0aW9uJywgJ3ZhbHVlJyk7XG4gICAgfSk7XG5cbiAgICB3aGlsZSAoXy5zaXplKHJhdGluZ3MpIDwgTUFYQklOUykge1xuICAgICAgcmF0aW5ncy5wdXNoKCdOQScpO1xuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcmF0aW5ncyB0byB0aGUgdHJpYWwgZGF0YSAmIHNhdmUgdG8gc2VydmVyXG4gICAgdHJpYWxEYXRhLnNwbGljZSgwLCAwLCBSVCk7XG4gICAgdHJpYWxEYXRhID0gdHJpYWxEYXRhLmNvbmNhdChyYXRpbmdzKTtcbiAgICBjb25zb2xlLmxvZyh0cmlhbERhdGEpO1xuICAgIGNvbnNvbGUubG9nKF8uc2l6ZSh0cmlhbERhdGEpKTtcbiAgICBwc2lUdXJrLnJlY29yZFRyaWFsRGF0YSh0cmlhbERhdGEpO1xuXG5cbiAgICB0cmlhbERhdGEgPSBbXTsgLy8gcmVzZXQgZm9yIG5leHQgdHJpYWxcbiAgICAkKCcudG9jbG9uZScpLnJlbW92ZSgpOyAvLyByZW1vdmUgYWxsIHNsaWRlcnMgYW5kIGJpbnNcbiAgICBuZXh0KCk7XG4gIH07XG4gICAgXG4gIHBzaVR1cmsuc2hvd1BhZ2UoJ2l0ZW0uaHRtbCcpO1xuICAkKCcjYW5zd2VyZWQnKS5vbignY2xpY2snLCBzYXZlKTtcblxuLyogIC8vIHNlY3JldCBzaG9ydGN1dC4gcHJlc3MgJzknIGFuZCBhbGwgc2xpZGVycyBhcmUgbWFya2VkIVxuICAkKCdib2R5Jykub24oJ2tleXByZXNzJywgZnVuY3Rpb24oZSkge1xuICAgIGlmIChlLndoaWNoID09IDU3IHx8IGUuY29kZSA9PSA1Nykge1xuICAgICAgblJlc3BvbnNlcyA9IG5iaW5zO1xuICAgICAgJCgnLnNsaWRlcicpLmNzcyh7J2JhY2tncm91bmQnOiAnIzk5RDZFQid9KTtcbiAgICB9XG4gIH0pOyovXG5cbiAgbmV4dCgpOyAvLyBzdGFydCBleHBlcmltZW50ICAgIFxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IEV4cGVyaW1lbnQ7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IG5ldyBQc2lUdXJrKHVuaXF1ZUlkLCBhZFNlcnZlckxvYywgbW9kZSk7XG4iLCJ2YXIgcHNpVHVyayA9IHJlcXVpcmUoJy4uL3BzaXR1cmsnKTtcblxuXG5jbGFzcyBRdWVzdGlvbm5haXJlIHtcblxuICBzYXZlX2RhdGEobGFuZ3VhZ2UpIHtcblx0dmFyIGNvbW1lbnRzID0gJCgnI2NvbW1lbnQnKS52YWwoKTtcbiAgICBwc2lUdXJrLnJlY29yZFRyaWFsRGF0YSh7J3BoYXNlJzoncG9zdHF1ZXN0aW9ubmFpcmUnLCAnc3RhdHVzJzonc3VibWl0J30pO1xuICAgIHBzaVR1cmsucmVjb3JkVHJpYWxEYXRhKFtsYW5ndWFnZV0pO1xuXHRwc2lUdXJrLnJlY29yZFRyaWFsRGF0YShbY29tbWVudHNdKTtcbiAgICBwc2lUdXJrLnJlY29yZFVuc3RydWN0dXJlZERhdGEoJ2xhbmd1YWdlJywgbGFuZ3VhZ2UpO1xuICAgIHBzaVR1cmsucmVjb3JkVW5zdHJ1Y3R1cmVkRGF0YSgnY29tbWVudHMnLCBjb21tZW50cyk7XG4gICAgXG5cdCQoJ3NlbGVjdCcpLmVhY2goZnVuY3Rpb24oaSwgdmFsKSB7XG4gICAgICBwc2lUdXJrLnJlY29yZFRyaWFsRGF0YShbdGhpcy52YWx1ZV0pO1xuICAgIH0pO1xuICB9XG5cbiAgcmVjb3JkX3Jlc3BvbnNlcygpIHtcbiAgICAvLyBzYXZlIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZVxuICAgIHZhciBsYW5ndWFnZSA9ICQoJyNsYW5ndWFnZScpLnZhbCgpO1xuICAgIHRoaXMuTEFOR1VBR0UgPSBmYWxzZTtcbiAgICBcbiAgICAkKCdzZWxlY3QnKS5lYWNoKGZ1bmN0aW9uKGksIHZhbCkge1xuICAgICAgcHNpVHVyay5yZWNvcmRVbnN0cnVjdHVyZWREYXRhKHRoaXMuaWQsIHRoaXMudmFsdWUpO1xuICAgIH0pO1xuXG4gICAgaWYgKGxhbmd1YWdlID09PSAnJykge1xuICAgICAgYWxlcnQoJ1BsZWFzZSBpbmRpY2F0ZSB5b3VyIG5hdGl2ZSBsYW5ndWFnZS4nKTtcbiAgICAgICQoJyNsYW5ndWFnZScpLmZvY3VzKCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5MQU5HVUFHRSA9IHRydWU7XG4gICAgICAgIHRoaXMuc2F2ZV9kYXRhKGxhbmd1YWdlKTtcbiAgICB9XG4gIH1cblxuICBwcm9tcHRfcmVzdWJtaXQoKSB7XG4gICAgdmFyIGVycm9yID0gW1wiPGgxPk9vcHMhPC9oMT48cD5Tb21ldGhpbmcgd2VudCB3cm9uZyBzdWJtaXR0aW5nIHlvdXIgSElULlwiLFxuICAgICAgICAgICAgICAgICBcIlRoaXMgbWlnaHQgaGFwcGVuIGlmIHlvdSBsb3NlIHlvdXIgaW50ZXJuZXQgY29ubmVjdGlvbi5cIixcbiAgICAgICAgICAgICAgICAgXCJQcmVzcyB0aGUgYnV0dG9uIHRvIHJlc3VibWl0LjwvcD48YnV0dG9uIGlkPSdyZXN1Ym1pdCc+UmVzdWJtaXQ8L2J1dHRvbj5cIl0uam9pbignICcpO1xuICAgICQoJ2JvZHknKS5odG1sKGVycm9yKTtcbiAgICAkKCcjcmVzdWJtaXQnKS5vbignY2xpY2snLCBfLmJpbmQodGhpcy5yZXN1Ym1pdCwgdGhpcykpO1xuICB9XG5cbiAgcmVzdWJtaXQoKSB7XG4gICAgJCgnYm9keScpLmh0bWwoJzxoMT5UcnlpbmcgdG8gcmVzdWJtaXQuLi48L2gxPicpO1xuICAgIHZhciByZXByb21wdCA9IHNldFRpbWVvdXQoXy5iaW5kKHRoaXMucHJvbXB0X3Jlc3VibWl0LCB0aGlzKSwgMTAwMDApO1xuICAgIGlmICghdGhpcy5MQU5HVUFHRSkgdGhpcy5zYXZlX2RhdGEoJ05BJyk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcHNpVHVyay5zYXZlRGF0YSh7XG4gICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwocmVwcm9tcHQpOyBcbiAgICAgICAgcHNpVHVyay5jb21wbGV0ZUhJVCgpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiBfLmJpbmQodGhpcy5wcm9tcHRfcmVzdWJtaXQsIHRoaXMpXG4gICAgfSk7XG4gIH1cblxuICBzdGFydCgpIHtcbiAgICAvLyBMb2FkIHRoZSBxdWVzdGlvbm5haXJlIHNuaXBwZXQgXG4gICAgcHNpVHVyay5zaG93UGFnZSgncG9zdHF1ZXN0aW9ubmFpcmUuaHRtbCcpO1xuICAgIHBzaVR1cmsucmVjb3JkVHJpYWxEYXRhKHsncGhhc2UnOidwb3N0cXVlc3Rpb25uYWlyZScsICdzdGF0dXMnOidiZWdpbid9KTtcblxuICAgICQoJyNuZXh0Jykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5yZWNvcmRfcmVzcG9uc2VzKCk7XG4gICAgICBwc2lUdXJrLnNhdmVEYXRhKHtcbiAgICAgICAgc3VjY2VzczogcHNpVHVyay5jb21wbGV0ZUhJVCxcbiAgICAgICAgZXJyb3I6IF8uYmluZCh0aGlzLnByb21wdF9yZXN1Ym1pdCwgdGhpcylcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUXVlc3Rpb25uYWlyZTtcbiIsImZ1bmN0aW9uIGdldFJhbmRvbShhcnIsIG4pIHtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IEFycmF5KG4pLFxuICAgICAgICBsZW4gPSBhcnIubGVuZ3RoLFxuICAgICAgICB0YWtlbiA9IG5ldyBBcnJheShsZW4pO1xuICAgIGlmIChuID4gbGVuKVxuICAgICAgICB0aHJvdyBuZXcgUmFuZ2VFcnJvcihcImdldFJhbmRvbTogbW9yZSBlbGVtZW50cyB0YWtlbiB0aGFuIGF2YWlsYWJsZVwiKTtcbiAgICB3aGlsZSAobi0tKSB7XG4gICAgICAgIHZhciB4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbGVuKTtcbiAgICAgICAgcmVzdWx0W25dID0gYXJyW3ggaW4gdGFrZW4gPyB0YWtlblt4XSA6IHhdO1xuICAgICAgICB0YWtlblt4XSA9IC0tbGVuO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5mdW5jdGlvbiBzZXR1cFRyaWFscygpIHtcbiAgICBcbiAgICB2YXIgYWxsdmFsdWVzID0gWzEwLDExLDIwLDIxLDIyLDMwLDMxLDMyLDMzLDQwLDQxLDQyLDQzLDQ0LDUwLDUxLDUyLDUzLDU0LDU1LDYwLDYxLDYyLDYzLDY0LDY1LDY2LFxuICAgICAgICAgICAgICAgICAgICAgNzAsNzEsNzIsNzMsNzQsNzUsNzYsNzcsODAsODEsODIsODMsODQsODUsODYsODcsODgsOTAsOTEsOTIsOTMsOTQsOTUsOTYsOTcsOTgsOTksMTAwLFxuICAgICAgICAgICAgICAgICAgICAgMTAxLDEwMiwxMDMsMTA0LDEwNSwxMDYsMTA3LDEwOCwxMDksMTAxMF0gLy9hIGxpc3Qgb2YgdmFsdWVzLCB0aGV5IGFyZSB1c2VkIHRvIGNvZGUgPEFDQ0VTLE9CU0VSVkFUSU9OPiBwYWlycy5cbiAgICB2YXIgdmFsdWVzID0gZ2V0UmFuZG9tKGFsbHZhbHVlcywgMTMpOyAvL2V2ZXJ5IHBhcnRpY2lwYW50IHNlZXMgYSBjZXJ0YWluIG51bWJlciBvZiB1cm4gY29uZmlndXJhdGlvbnMgYXQgcmFuZG9tXG5cdFxuXHR2YXIgaG93bWFueSA9IHZhbHVlcy5sZW5ndGhcblxuICAgIHZhciBwaWMgPSAnPHRhYmxlIGNsYXNzPVwidGcxXCI+JytcbiAgICAgICAgICAgICAgICAgICAgICAnPHRyPicrXG4gICAgICAgICAgICAgICAgICAgICAgICAnPHRoIGNsYXNzPVwidGgxXCI+PGltZyBzcmM9XCIvc3RhdGljL2ltYWdlcy97VkFMVUV9LnBuZ1wiIGhlaWdodD1cIjIxMFwiIHdpZHRoPVwiMTI2XCI+PC90aD4nK1xuICAgICAgICAgICAgICAgICAgICAgICc8L3RyPicrXG4gICAgICAgICAgICAgICAgICAgICc8L3RhYmxlPic7XG4gICAgICAgICAgICBcbiAgICB2YXIgc2NlbmFyaW8gPSAnWW91IGRyYXcge0F9IGJhbGxzIGFuZCBvYnNlcnZlIHRoYXQge099IG9mIHRoZW0ge0NPUFVMQX0gcmVkLic7ICAgICAgICAgXG4gXG5cbiAgICB2YXIgcmVzID0gXy5tYXAoXy5yYW5nZSgwLCBob3dtYW55KSwgKHcpID0+IHsgLy90aGlzIGZ1bmN0aW9uIGdlbmVyYXRlcyB8aG93bWFueXwgdHJpYWxzLCBpZSBhIG51bWJlciBvZiBvYmplY3RzIHdpdGggc2V2ZXJhbCBwcm9wZXJ0aWVzXG5cbiAgICB2YXIgdHJpYWwgPSB7fTtcbiAgICBcbiAgICB0cmlhbC52YWx1ZSA9IHZhbHVlcy5zaGlmdCgpOy8vc2VsZWN0cyBhIHByZXZpb3VzbHkgdW5zZWxlY3RlZCB2YWx1ZSAoaXQgYWN0dWFsbHkgcmVtb3ZlcyB0aGUgdmFsdWUgZnJvbSB0aGUgdmVjdG9yKVxuICAgIHRyaWFsLnZhbHVlQmFjayA9IHRyaWFsLnZhbHVlK1wiYmFja1wiXG5cbiAgICBpZiAodHJpYWwudmFsdWUgPT0gMTAxMCkgeyAvL2FkIGhvYyB0cmVhdG1lbnQgb2YgMTAxMCB2YWx1ZSwgdG8gc3BsaXQgaXQgaW50byAxMCBhbmQgMTBcbiAgICAgICAgdHJpYWwuYWNjZXNzID0gMTA7XG4gICAgICAgIHRyaWFsLm9ic2VydmF0aW9uID0gMTA7XG4gICAgfSBlbHNlIHsgLy8gZ2VuZXJhbCB0cmVhdG1lbnQgb2Ygb3RoZXIgdmFsdWVzXG4gICAgICAgIHRyaWFsLmFjY2VzcyA9IE1hdGguZmxvb3IodHJpYWwudmFsdWUvMTApOy8vdGhlIGludGVnZXIgcGFydCBvZiB0cmlhbC52YWx1ZSBkaXZpZGVkIGJ5IDEwIFxuICAgICAgICB0cmlhbC5vYnNlcnZhdGlvbiA9IE1hdGgucm91bmQoMTAqKCh0cmlhbC52YWx1ZS8xMCklMSkpOyAvL2l0J3MgdGhlIGRlY2ltYWwgcGFydCBvZiB0cmlhbC52YWx1ZSBkaXZpZGVkIGJ5IDEwLCB0aW1lcyAxMCAgICAgICAgXG4gICAgfTtcbiAgICBcbiAgICBcbiAgICAvL3doYXQgZm9sbG93cyBidWlsZHMgdGhlIGRlc2NyaXB0aW9ucy9pdGVtcy9zdHVmZiB0aGF0IHdpbGwgYmUgZGlzcGxheWVkIG9uIHRoZSBzY3JlZW4sIHJlcGxhY2luZyB3aGF0J3MgbmVlZGVkIGRlcGVuZGluZyBvbiBhY2Nlc3Mvb2JzZXJ2YXRpb24va2luZFxuICAgIFxuICAgIHRyaWFsLnBpYyA9IHBpYy5yZXBsYWNlKCd7VkFMVUV9JywgdHJpYWwudmFsdWUpLnJlcGxhY2UoJ3tWQUxVRWJhY2t9JywgdHJpYWwudmFsdWVCYWNrKTtcbiAgICAgICAgXG4gICAgICAgIGlmICh0cmlhbC52YWx1ZT09MTApXG4gICAgICAgICAgIHtcbiAgICAgICAgICAgdHJpYWwuc2NlbmFyaW8gPSAnWW91IGRyYXcgb25lIGJhbGwgYW5kIG9ic2VydmUgdGhhdCBpdCBpcyBub3QgcmVkLidcbiAgICAgICAgICAgfSBcbiAgICAgICAgICAgIGVsc2UgaWYgKHRyaWFsLnZhbHVlPT0xMSlcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0cmlhbC5zY2VuYXJpbyA9ICdZb3UgZHJhdyBvbmUgYmFsbCBhbmQgb2JzZXJ2ZSB0aGF0IGl0IGlzIHJlZC4nXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIHtpZiAodHJpYWwuYWNjZXNzID09IHRyaWFsLm9ic2VydmF0aW9uKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0cmlhbC5hY2Nlc3MgPT0gMTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmlhbC5zY2VuYXJpbyA9IHNjZW5hcmlvLnJlcGxhY2UoJ3tBfScsIFwiYWxsIHRoZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWFsLnNjZW5hcmlvID0gc2NlbmFyaW8ucmVwbGFjZSgne0F9JywgdHJpYWwuYWNjZXNzKVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgdHJpYWwuc2NlbmFyaW8gPSB0cmlhbC5zY2VuYXJpby5yZXBsYWNlKCd7T30nLCBcImFsbFwiKVxuXG4gICAgICAgICAgICAgICAgICAgIH0gICBlbHNlIHsgLy9pZSBpZiBhY2Nlc3MhPW9ic2VydmF0aW9uXG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0cmlhbC5hY2Nlc3MgPT0gMTApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmlhbC5zY2VuYXJpbyA9IHNjZW5hcmlvLnJlcGxhY2UoJ3tBfScsIFwiYWxsIHRoZVwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgfSAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyaWFsLnNjZW5hcmlvID0gc2NlbmFyaW8ucmVwbGFjZSgne0F9JywgdHJpYWwuYWNjZXNzKVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRyaWFsLm9ic2VydmF0aW9uID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJpYWwuc2NlbmFyaW8gPSB0cmlhbC5zY2VuYXJpby5yZXBsYWNlKCd7T30nLCBcIm5vbmVcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cmlhbC5zY2VuYXJpbyA9IHRyaWFsLnNjZW5hcmlvLnJlcGxhY2UoJ3tPfScsIHRyaWFsLm9ic2VydmF0aW9uKVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IFxuICAgIH0gXG4gICAgXG4gICAgICAgIFxuICAgIGlmICh0cmlhbC5vYnNlcnZhdGlvbiA9PSAxKSB7XG4gICAgICAgIHRyaWFsLnNjZW5hcmlvPXRyaWFsLnNjZW5hcmlvLnJlcGxhY2UoJ3tDT1BVTEF9JywgXCJpc1wiKVxuICAgIH0gICBlbHNlIHtcbiAgICAgICAgdHJpYWwuc2NlbmFyaW89dHJpYWwuc2NlbmFyaW8ucmVwbGFjZSgne0NPUFVMQX0nLCBcImFyZVwiKVxuICAgIH0gICAgICAgIFxuICAgIFxuICAgIHRyaWFsLnY9dzsgLy91c2VkIHRvIGNvdW50IHRoZSB0cmlhbHNcbiAgICB0cmlhbC5wZXJjZW50YWdlID0gKDEwMCp0cmlhbC52KS9ob3dtYW55XG4gICAgdHJpYWwucGVyY2VudGFnZUJpcyA9ICgxMDAqdHJpYWwudikvaG93bWFueVxuICAgICAgICBcbiAgICByZXR1cm4gdHJpYWw7XG4gICAgfSk7XG5cbiAgICBjb25zb2xlLmxvZyhyZXMpOy8vSSBkb24ndCBrbm93IHdoeSBJIGhhdmUgdGhpc1xuXG4gICAgcmV0dXJuIHJlcztcbiAgICBcbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldHVwVHJpYWxzO1xuIiwidmFyIHBzaVR1cmsgPSByZXF1aXJlKCcuL3BzaXR1cmsnKTtcbnZhciBFeHBlcmltZW50ID0gcmVxdWlyZSgnLi9leHBlcmltZW50Jyk7XG5cbnZhciBwYWdlcyA9IFtcblx0XCJpbnN0cnVjdGlvbnMvaW5zdHJ1Y3Rpb24uaHRtbFwiLFxuICAgIFwiaW5zdHJ1Y3Rpb25zL2luc3RydWN0aW9uMS5odG1sXCIsXG4gICAgXCJpbnN0cnVjdGlvbnMvaW5zdHJ1Y3Rpb24yLmh0bWxcIixcblx0XCJpdGVtLmh0bWxcIixcbiAgICBcInBvc3RxdWVzdGlvbm5haXJlLmh0bWxcIlxuXTtcblxudmFyIGluc3RydWN0aW9uUGFnZXMgPSBbXG5cdFwiaW5zdHJ1Y3Rpb25zL2luc3RydWN0aW9uLmh0bWxcIixcbiAgICBcImluc3RydWN0aW9ucy9pbnN0cnVjdGlvbjEuaHRtbFwiLFxuICAgIFwiaW5zdHJ1Y3Rpb25zL2luc3RydWN0aW9uMi5odG1sXCJcbl07XG5cbnBzaVR1cmsucHJlbG9hZFBhZ2VzKHBhZ2VzKTtcblxuLy8gVGFzayBvYmplY3QgdG8ga2VlcCB0cmFjayBvZiB0aGUgY3VycmVudCBwaGFzZVxudmFyIGN1cnJlbnR2aWV3O1xuXG4vLyBSVU4gVEFTS1xuJCh3aW5kb3cpLmxvYWQoKCkgPT4ge1xuICAgIHBzaVR1cmsuZG9JbnN0cnVjdGlvbnMoXG4gICAgXHRpbnN0cnVjdGlvblBhZ2VzLC8vIGxpc3Qgb2YgaW5zdHJ1Y3Rpb24gcGFnZXMuIHRoZXkgc2hvdWxkIGNvbnRhaW4gYSBidXR0b24gd2l0aCBjbGFzcz1jb250aW51ZS4gd2hlbiBpdCdzIGNsaWNrZWQsIHRoZSBuZXh0IHBhZ2UgaXMgc2hvd24uIGFmdGVyIHRoZSBsYXN0IG9uZSwgdGhlIGZvbGxvd2luZyBmdW5jIGlzIGNhbGxlZFxuICAgICAgICBmdW5jdGlvbigpIHsgY3VycmVudHZpZXcgPSBuZXcgRXhwZXJpbWVudCgpOyB9Ly8gc3RhcnQgaXMgZGVmaW5lZCBpbiBleHBlcmltZW50LmpzXG4gICAgKTtcbn0pO1xuIl19
