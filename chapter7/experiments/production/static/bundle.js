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
var setupTrials = require('./specific/items');
var Questionnaire = require('./specific/ending');
var Experiment = function Experiment() {
  this.count = 0;
  this.trialData = [];
  this.allTrials = setupTrials();
};
($traceurRuntime.createClass)(Experiment, {
  next: function() {
    if (this.count < this.allTrials.length) {
      this.trial = this.allTrials[this.count];
      this.trialnumber = this.count + 1;
      this.insertLines(this.trial);
      this.trialData.splice(0, 0, this.trialnumber, this.trial.value, this.trial.access, this.trial.observation);
      this.start = +new Date();
      this.count++;
    } else
      new Questionnaire().start();
  },
  insertLines: function(t) {
    $('#scenario').text(t.scenario);
    $('#question').html(t.question);
    $('#action').html(t.action);
    $('#item').html(t.item);
    $('#pic').html(t.pic);
    $('#percentage').text(Math.floor(t.percentage));
    $('#percentageBis').text(Math.floor(t.percentageBis));
  },
  save: function(e) {
    var RT = +new Date() - this.start;
    var answer1 = document.getElementById('expression1').value;
    var answer2 = document.getElementById('expression2').value;
    if (answer1 == "" || answer2 == "") {
      alert("Please complete the sentence!");
    } else {
      this.trialData = this.trialData.concat(answer1, answer2, RT);
      psiTurk.recordTrialData(this.trialData);
      this.trialData = [];
      document.getElementById('expression1').value = "";
      document.getElementById('expression2').value = "";
      this.next();
    }
  },
  start: function() {
    psiTurk.showPage('item.html');
    $('#next').on('click', _.bind(this.save, this));
    this.next();
  }
}, {});
module.exports = Experiment;


//# sourceURL=/Users/michele/Dropbox/Documents/Work/experiments/uncertainty/production_nested/static/js/experiment.js
},{"./psiturk":5,"./specific/ending":6,"./specific/items":7}],5:[function(require,module,exports){
"use strict";
module.exports = new PsiTurk(uniqueId, adServerLoc, mode);


//# sourceURL=/Users/michele/Dropbox/Documents/Work/experiments/uncertainty/production_nested/static/js/psiturk.js
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


//# sourceURL=/Users/michele/Dropbox/Documents/Work/experiments/uncertainty/production_nested/static/js/specific/ending.js
},{"../psiturk":5}],7:[function(require,module,exports){
"use strict";
function setupTrials() {
  var values = _.shuffle([20, 22, 41, 42, 43, 80, 82, 84, 86, 88, 102, 103, 105, 107, 108]);
  var howmany = 12;
  var meta = {
    'pic': "<table class='tg1'>" + '<tr>' + '<th class="th1"><img src="/static/images/first.png"></th>' + '<th class="th1"><img src="/static/images/{VALUE}.png"></th>' + '<th class="th1"><img src="/static/images/{VALUEback}.png"</img></th>' + '<th class="th1"><img src="/static/images/last.png"></th>' + '</tr>' + '</table>',
    'scenario': 'You draw {A} balls and observe that {O} of them {COPULA} red.'
  };
  var res = _.map(_.range(0, 12), (function(w) {
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
    trial.pic = meta['pic'].replace('{VALUE}', trial.value).replace('{VALUEback}', trial.valueBack);
    if (trial.access == trial.observation) {
      if (trial.access == 10) {
        trial.scenario = meta['scenario'].replace('{A}', "all the");
      } else {
        trial.scenario = meta['scenario'].replace('{A}', trial.access);
      }
      ;
      trial.scenario = trial.scenario.replace('{O}', "all");
    } else {
      if (trial.access == 10) {
        trial.scenario = meta['scenario'].replace('{A}', "all the");
      } else {
        trial.scenario = meta['scenario'].replace('{A}', trial.access);
      }
      ;
      if (trial.observation === 0) {
        trial.scenario = trial.scenario.replace('{O}', "none");
      } else {
        trial.scenario = trial.scenario.replace('{O}', trial.observation);
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


//# sourceURL=/Users/michele/Dropbox/Documents/Work/experiments/uncertainty/production_nested/static/js/specific/items.js
},{}],8:[function(require,module,exports){
"use strict";
var psiTurk = require('./psiturk');
var Experiment = require('./experiment');
var pages = ["instructions/instruction.html", "instructions/instruction0.html", "instructions/instruction1.html", "instructions/instruction3.html", "instructions/instruction4.html", "item.html", "postquestionnaire.html"];
var instructionPages = ["instructions/instruction.html", "instructions/instruction0.html", "instructions/instruction1.html", "instructions/instruction3.html", "instructions/instruction4.html"];
psiTurk.preloadPages(pages);
var currentview;
var exp = new Experiment();
$(window).load((function() {
  psiTurk.doInstructions(instructionPages, function() {
    currentview = exp.start();
  });
}));


//# sourceURL=/Users/michele/Dropbox/Documents/Work/experiments/uncertainty/production_nested/static/js/task.js
},{"./experiment":4,"./psiturk":5}]},{},[3,8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvcGF0aC1icm93c2VyaWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy90cmFjZXVyL2Jpbi90cmFjZXVyLXJ1bnRpbWUuanMiLCIvVXNlcnMvbWljaGVsZS9Ecm9wYm94L0RvY3VtZW50cy9Xb3JrL2V4cGVyaW1lbnRzL3VuY2VydGFpbnR5L3Byb2R1Y3Rpb25fbmVzdGVkL3N0YXRpYy9qcy9leHBlcmltZW50LmpzIiwiL1VzZXJzL21pY2hlbGUvRHJvcGJveC9Eb2N1bWVudHMvV29yay9leHBlcmltZW50cy91bmNlcnRhaW50eS9wcm9kdWN0aW9uX25lc3RlZC9zdGF0aWMvanMvcHNpdHVyay5qcyIsIi9Vc2Vycy9taWNoZWxlL0Ryb3Bib3gvRG9jdW1lbnRzL1dvcmsvZXhwZXJpbWVudHMvdW5jZXJ0YWludHkvcHJvZHVjdGlvbl9uZXN0ZWQvc3RhdGljL2pzL3NwZWNpZmljL2VuZGluZy5qcyIsIi9Vc2Vycy9taWNoZWxlL0Ryb3Bib3gvRG9jdW1lbnRzL1dvcmsvZXhwZXJpbWVudHMvdW5jZXJ0YWludHkvcHJvZHVjdGlvbl9uZXN0ZWQvc3RhdGljL2pzL3NwZWNpZmljL2l0ZW1zLmpzIiwiL1VzZXJzL21pY2hlbGUvRHJvcGJveC9Eb2N1bWVudHMvV29yay9leHBlcmltZW50cy91bmNlcnRhaW50eS9wcm9kdWN0aW9uX25lc3RlZC9zdGF0aWMvanMvdGFzay5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Z0ZBO0FBQUEsQUFBSSxFQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsV0FBVSxDQUFDLENBQUM7QUFDbEMsQUFBSSxFQUFBLENBQUEsV0FBVSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsa0JBQWlCLENBQUMsQ0FBQztBQUM3QyxBQUFJLEVBQUEsQ0FBQSxhQUFZLEVBQUksQ0FBQSxPQUFNLEFBQUMsQ0FBQyxtQkFBa0IsQ0FBQyxDQUFDO0FBRmhELEFBQUksRUFBQSxhQUlKLFNBQU0sV0FBUyxDQUVGLEFBQUMsQ0FBRTtBQUNaLEtBQUcsTUFBTSxFQUFJLEVBQUEsQ0FBQztBQUNkLEtBQUcsVUFBVSxFQUFJLEdBQUMsQ0FBQztBQUNuQixLQUFHLFVBQVUsRUFBSSxDQUFBLFdBQVUsQUFBQyxFQUFDLENBQUM7QUFDaEMsQUFWc0MsQ0FBQTtBQUF4QyxBQUFDLGVBQWMsWUFBWSxDQUFDLEFBQUM7QUFZM0IsS0FBRyxDQUFILFVBQUksQUFBQyxDQUFFO0FBQ0wsT0FBSSxJQUFHLE1BQU0sRUFBSSxDQUFBLElBQUcsVUFBVSxPQUFPLENBQUc7QUFFdEMsU0FBRyxNQUFNLEVBQUksQ0FBQSxJQUFHLFVBQVUsQ0FBRSxJQUFHLE1BQU0sQ0FBQyxDQUFDO0FBQ3ZDLFNBQUcsWUFBWSxFQUFJLENBQUEsSUFBRyxNQUFNLEVBQUUsRUFBQSxDQUFDO0FBRy9CLFNBQUcsWUFBWSxBQUFDLENBQUMsSUFBRyxNQUFNLENBQUMsQ0FBQztBQUU1QixTQUFHLFVBQVUsT0FBTyxBQUFDLENBQUMsQ0FBQSxDQUFHLEVBQUEsQ0FBRyxDQUFBLElBQUcsWUFBWSxDQUFHLENBQUEsSUFBRyxNQUFNLE1BQU0sQ0FBRyxDQUFBLElBQUcsTUFBTSxPQUFPLENBQUcsQ0FBQSxJQUFHLE1BQU0sWUFBWSxDQUFDLENBQUM7QUFFN0csU0FBRyxNQUFNLEVBQUksRUFBRSxHQUFJLEtBQUcsQUFBQyxFQUFDLENBQUM7QUFFdEIsU0FBRyxNQUFNLEVBQUUsQ0FBQztJQUVkO0FBRUUsUUFBSSxjQUFZLEFBQUMsRUFBQyxNQUFNLEFBQUMsRUFBQyxDQUFDO0FBQUEsRUFDL0I7QUFFQSxZQUFVLENBQVYsVUFBWSxDQUFBLENBQUc7QUFFYixJQUFBLEFBQUMsQ0FBQyxXQUFVLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxTQUFTLENBQUMsQ0FBQztBQUUvQixJQUFBLEFBQUMsQ0FBQyxXQUFVLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxTQUFTLENBQUMsQ0FBQztBQUMvQixJQUFBLEFBQUMsQ0FBQyxTQUFRLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxPQUFPLENBQUMsQ0FBQztBQUMzQixJQUFBLEFBQUMsQ0FBQyxPQUFNLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxLQUFLLENBQUMsQ0FBQztBQUN2QixJQUFBLEFBQUMsQ0FBQyxNQUFLLENBQUMsS0FBSyxBQUFDLENBQUMsQ0FBQSxJQUFJLENBQUMsQ0FBQztBQUVyQixJQUFBLEFBQUMsQ0FBQyxhQUFZLENBQUMsS0FBSyxBQUFDLENBQUMsSUFBRyxNQUFNLEFBQUMsQ0FBQyxDQUFBLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFDL0MsSUFBQSxBQUFDLENBQUMsZ0JBQWUsQ0FBQyxLQUFLLEFBQUMsQ0FBQyxJQUFHLE1BQU0sQUFBQyxDQUFDLENBQUEsY0FBYyxDQUFDLENBQUMsQ0FBQztFQUN2RDtBQUdELEtBQUcsQ0FBSCxVQUFLLENBQUEsQ0FBRztBQUNSLEFBQUksTUFBQSxDQUFBLEVBQUMsRUFBSSxDQUFBLENBQUUsR0FBSSxLQUFHLEFBQUMsRUFBQyxDQUFBLENBQUksQ0FBQSxJQUFHLE1BQU0sQ0FBQztBQUUvQixBQUFJLE1BQUEsQ0FBQSxPQUFNLEVBQUksQ0FBQSxRQUFPLGVBQWUsQUFBQyxDQUFDLGFBQVksQ0FBQyxNQUFNLENBQUM7QUFDMUQsQUFBSSxNQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsUUFBTyxlQUFlLEFBQUMsQ0FBQyxhQUFZLENBQUMsTUFBTSxDQUFDO0FBRTFELE9BQUcsT0FBTSxHQUFHLEdBQUMsQ0FBQSxFQUFLLENBQUEsT0FBTSxHQUFHLEdBQUMsQ0FDekI7QUFDRixVQUFJLEFBQUMsQ0FBQywrQkFBOEIsQ0FBQyxDQUFDO0lBQ3ZDLEtBQ007QUFDRixTQUFHLFVBQVUsRUFBSSxDQUFBLElBQUcsVUFBVSxPQUFPLEFBQUMsQ0FBQyxPQUFNLENBQUcsUUFBTSxDQUFHLEdBQUMsQ0FBQyxDQUFDO0FBQzVELFlBQU0sZ0JBQWdCLEFBQUMsQ0FBQyxJQUFHLFVBQVUsQ0FBQyxDQUFDO0FBRXZDLFNBQUcsVUFBVSxFQUFJLEdBQUMsQ0FBQztBQUNuQixhQUFPLGVBQWUsQUFBQyxDQUFDLGFBQVksQ0FBQyxNQUFNLEVBQUUsR0FBQyxDQUFDO0FBQy9DLGFBQU8sZUFBZSxBQUFDLENBQUMsYUFBWSxDQUFDLE1BQU0sRUFBRSxHQUFDLENBQUM7QUFDL0MsU0FBRyxLQUFLLEFBQUMsRUFBQyxDQUFDO0lBQ2Q7QUFBQSxFQUVIO0FBRUEsTUFBSSxDQUFKLFVBQUssQUFBQyxDQUFFO0FBQ04sVUFBTSxTQUFTLEFBQUMsQ0FBQyxXQUFVLENBQUMsQ0FBQztBQUM3QixJQUFBLEFBQUMsQ0FBQyxPQUFNLENBQUMsR0FBRyxBQUFDLENBQUMsT0FBTSxDQUFHLENBQUEsQ0FBQSxLQUFLLEFBQUMsQ0FBQyxJQUFHLEtBQUssQ0FBRyxLQUFHLENBQUMsQ0FBQyxDQUFDO0FBQy9DLE9BQUcsS0FBSyxBQUFDLEVBQUMsQ0FBQztFQUNiO0FBQUEsS0F4RW1GO0FBNEVyRixLQUFLLFFBQVEsRUFBSSxXQUFTLENBQUM7QUFDM0I7Ozs7QUM3RUE7QUFBQSxLQUFLLFFBQVEsRUFBSSxJQUFJLFFBQU0sQUFBQyxDQUFDLFFBQU8sQ0FBRyxZQUFVLENBQUcsS0FBRyxDQUFDLENBQUM7QUFDekQ7Ozs7QUNEQTtBQUFBLEFBQUksRUFBQSxDQUFBLE9BQU0sRUFBSSxDQUFBLE9BQU0sQUFBQyxDQUFDLFlBQVcsQ0FBQyxDQUFDO0FBQW5DLEFBQUksRUFBQSxnQkFHSixTQUFNLGNBQVksS0FzRWxCLEFBekV3QyxDQUFBO0FBQXhDLEFBQUMsZUFBYyxZQUFZLENBQUMsQUFBQztBQUszQixVQUFRLENBQVIsVUFBVSxRQUFPLENBQUc7QUFDckIsQUFBSSxNQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsQ0FBQSxBQUFDLENBQUMsVUFBUyxDQUFDLElBQUksQUFBQyxFQUFDLENBQUM7QUFDL0IsVUFBTSxnQkFBZ0IsQUFBQyxDQUFDO0FBQUMsWUFBTSxDQUFFLG9CQUFrQjtBQUFHLGFBQU8sQ0FBRSxTQUFPO0FBQUEsSUFBQyxDQUFDLENBQUM7QUFDekUsVUFBTSxnQkFBZ0IsQUFBQyxDQUFDLENBQUMsUUFBTyxDQUFDLENBQUMsQ0FBQztBQUN0QyxVQUFNLGdCQUFnQixBQUFDLENBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLFVBQU0sdUJBQXVCLEFBQUMsQ0FBQyxVQUFTLENBQUcsU0FBTyxDQUFDLENBQUM7QUFDcEQsVUFBTSx1QkFBdUIsQUFBQyxDQUFDLFVBQVMsQ0FBRyxTQUFPLENBQUMsQ0FBQztBQUV2RCxJQUFBLEFBQUMsQ0FBQyxRQUFPLENBQUMsS0FBSyxBQUFDLENBQUMsU0FBUyxDQUFBLENBQUcsQ0FBQSxHQUFFLENBQUc7QUFDN0IsWUFBTSxnQkFBZ0IsQUFBQyxDQUFDLENBQUMsSUFBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3ZDLENBQUMsQ0FBQztFQUNKO0FBRUEsaUJBQWUsQ0FBZixVQUFnQixBQUFDLENBQUU7QUFFakIsQUFBSSxNQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsQ0FBQSxBQUFDLENBQUMsV0FBVSxDQUFDLElBQUksQUFBQyxFQUFDLENBQUM7QUFDbkMsT0FBRyxTQUFTLEVBQUksTUFBSSxDQUFDO0FBRXJCLElBQUEsQUFBQyxDQUFDLFFBQU8sQ0FBQyxLQUFLLEFBQUMsQ0FBQyxTQUFTLENBQUEsQ0FBRyxDQUFBLEdBQUUsQ0FBRztBQUNoQyxZQUFNLHVCQUF1QixBQUFDLENBQUMsSUFBRyxHQUFHLENBQUcsQ0FBQSxJQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ3JELENBQUMsQ0FBQztBQUVGLE9BQUksUUFBTyxJQUFNLEdBQUMsQ0FBRztBQUNuQixVQUFJLEFBQUMsQ0FBQyx1Q0FBc0MsQ0FBQyxDQUFDO0FBQzlDLE1BQUEsQUFBQyxDQUFDLFdBQVUsQ0FBQyxNQUFNLEFBQUMsRUFBQyxDQUFDO0FBQ3RCLFdBQU8sTUFBSSxDQUFDO0lBQ2QsS0FBTztBQUNILFNBQUcsU0FBUyxFQUFJLEtBQUcsQ0FBQztBQUNwQixTQUFHLFVBQVUsQUFBQyxDQUFDLFFBQU8sQ0FBQyxDQUFDO0lBQzVCO0FBQUEsRUFDRjtBQUVBLGdCQUFjLENBQWQsVUFBZSxBQUFDLENBQUU7QUFDaEIsQUFBSSxNQUFBLENBQUEsS0FBSSxFQUFJLENBQUEsQ0FBQyw0REFBMkQsQ0FDM0QsMERBQXdELENBQ3hELDJFQUF5RSxDQUFDLEtBQUssQUFBQyxDQUFDLEdBQUUsQ0FBQyxDQUFDO0FBQ2xHLElBQUEsQUFBQyxDQUFDLE1BQUssQ0FBQyxLQUFLLEFBQUMsQ0FBQyxLQUFJLENBQUMsQ0FBQztBQUNyQixJQUFBLEFBQUMsQ0FBQyxXQUFVLENBQUMsR0FBRyxBQUFDLENBQUMsT0FBTSxDQUFHLENBQUEsQ0FBQSxLQUFLLEFBQUMsQ0FBQyxJQUFHLFNBQVMsQ0FBRyxLQUFHLENBQUMsQ0FBQyxDQUFDO0VBQ3pEO0FBRUEsU0FBTyxDQUFQLFVBQVEsQUFBQztBQUNQLElBQUEsQUFBQyxDQUFDLE1BQUssQ0FBQyxLQUFLLEFBQUMsQ0FBQyxnQ0FBK0IsQ0FBQyxDQUFDO0FBQ2hELEFBQUksTUFBQSxDQUFBLFFBQU8sRUFBSSxDQUFBLFVBQVMsQUFBQyxDQUFDLENBQUEsS0FBSyxBQUFDLENBQUMsSUFBRyxnQkFBZ0IsQ0FBRyxLQUFHLENBQUMsQ0FBRyxNQUFJLENBQUMsQ0FBQztBQUNwRSxPQUFJLENBQUMsSUFBRyxTQUFTO0FBQUcsU0FBRyxVQUFVLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQztBQUFBLEFBRXBDLE1BQUEsQ0FBQSxJQUFHLEVBQUksS0FBRyxDQUFDO0FBQ2YsVUFBTSxTQUFTLEFBQUMsQ0FBQztBQUNmLFlBQU0sR0FBRyxTQUFBLEFBQUMsQ0FBSztBQUNiLG9CQUFZLEFBQUMsQ0FBQyxRQUFPLENBQUMsQ0FBQztBQUN2QixjQUFNLFlBQVksQUFBQyxFQUFDLENBQUM7TUFDdkIsQ0FBQTtBQUNBLFVBQUksQ0FBRyxDQUFBLENBQUEsS0FBSyxBQUFDLENBQUMsSUFBRyxnQkFBZ0IsQ0FBRyxLQUFHLENBQUM7QUFBQSxJQUMxQyxDQUFDLENBQUM7RUFDSjtBQUVBLE1BQUksQ0FBSixVQUFLLEFBQUM7O0FBRUosVUFBTSxTQUFTLEFBQUMsQ0FBQyx3QkFBdUIsQ0FBQyxDQUFDO0FBQzFDLFVBQU0sZ0JBQWdCLEFBQUMsQ0FBQztBQUFDLFlBQU0sQ0FBRSxvQkFBa0I7QUFBRyxhQUFPLENBQUUsUUFBTTtBQUFBLElBQUMsQ0FBQyxDQUFDO0FBRXhFLElBQUEsQUFBQyxDQUFDLE9BQU0sQ0FBQyxHQUFHLEFBQUMsQ0FBQyxPQUFNLEdBQUcsU0FBQSxBQUFDLENBQUs7QUFDM0IsMEJBQW9CLEFBQUMsRUFBQyxDQUFDO0FBQ3ZCLFlBQU0sU0FBUyxBQUFDLENBQUM7QUFDZixjQUFNLENBQUcsQ0FBQSxPQUFNLFlBQVk7QUFDM0IsWUFBSSxDQUFHLENBQUEsQ0FBQSxLQUFLLEFBQUMsQ0FBQyxvQkFBbUIsT0FBTztBQUFBLE1BQzFDLENBQUMsQ0FBQztJQUNKLEVBQUMsQ0FBQztFQUNKO0tBeEVtRjtBQTJFckYsS0FBSyxRQUFRLEVBQUksY0FBWSxDQUFDO0FBQzlCOzs7O0FDNUVBO0FBQUEsT0FBUyxZQUFVLENBQUMsQUFBQztBQUVqQixBQUFJLElBQUEsQ0FBQSxNQUFLLEVBQUksQ0FBQSxDQUFBLFFBQVEsQUFBQyxDQUFDLENBQUMsRUFBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLEdBQUMsQ0FBRSxHQUFDLENBQUUsR0FBQyxDQUFFLElBQUUsQ0FBRSxJQUFFLENBQUUsSUFBRSxDQUFFLElBQUUsQ0FBRSxJQUFFLENBQUMsQ0FBQyxDQUFDO0FBRTlFLEFBQUksSUFBQSxDQUFBLE9BQU0sRUFBSSxHQUFDLENBQUE7QUFFWixBQUFJLElBQUEsQ0FBQSxJQUFHLEVBQUk7QUFFSCxRQUFJLENBQUcsQ0FBQSxxQkFBb0IsRUFDakIsT0FBSyxDQUFBLENBQ0gsNERBQTBELENBQUEsQ0FDMUQsOERBQTRELENBQUEsQ0FDNUQsdUVBQXFFLENBQUEsQ0FDckUsMkRBQXlELENBQUEsQ0FDM0QsUUFBTSxDQUFBLENBQ1IsV0FBUztBQUVqQixhQUFTLENBQUksZ0VBQThEO0FBQUEsRUFFbkYsQ0FBQztBQUlELEFBQUksSUFBQSxDQUFBLEdBQUUsRUFBSSxDQUFBLENBQUEsSUFBSSxBQUFDLENBQUMsQ0FBQSxNQUFNLEFBQUMsQ0FBQyxDQUFBLENBQUcsR0FBQyxDQUFDLEdBQUcsU0FBQyxDQUFBLENBQU07QUFFdkMsQUFBSSxNQUFBLENBQUEsS0FBSSxFQUFJLEdBQUMsQ0FBQztBQUVkLFFBQUksTUFBTSxFQUFJLENBQUEsTUFBSyxNQUFNLEFBQUMsRUFBQyxDQUFDO0FBQzVCLFFBQUksVUFBVSxFQUFJLENBQUEsS0FBSSxNQUFNLEVBQUUsT0FBSyxDQUFBO0FBRW5DLE9BQUksS0FBSSxNQUFNLEdBQUssS0FBRyxDQUFHO0FBQ3JCLFVBQUksT0FBTyxFQUFJLEdBQUMsQ0FBQztBQUNqQixVQUFJLFlBQVksRUFBSSxHQUFDLENBQUM7SUFDMUIsS0FBTztBQUNILFVBQUksT0FBTyxFQUFJLENBQUEsSUFBRyxNQUFNLEFBQUMsQ0FBQyxLQUFJLE1BQU0sRUFBRSxHQUFDLENBQUMsQ0FBQztBQUN6QyxVQUFJLFlBQVksRUFBSSxDQUFBLElBQUcsTUFBTSxBQUFDLENBQUMsRUFBQyxFQUFFLEVBQUMsQ0FBQyxLQUFJLE1BQU0sRUFBRSxHQUFDLENBQUMsRUFBRSxFQUFBLENBQUMsQ0FBQyxDQUFDO0lBQzNEO0FBQUEsQUFBQyxJQUFBO0FBS0QsUUFBSSxJQUFJLEVBQUksQ0FBQSxJQUFHLENBQUUsS0FBSSxDQUFDLFFBQVEsQUFBQyxDQUFDLFNBQVEsQ0FBRyxDQUFBLEtBQUksTUFBTSxDQUFDLFFBQVEsQUFBQyxDQUFDLGFBQVksQ0FBRyxDQUFBLEtBQUksVUFBVSxDQUFDLENBQUM7QUFFL0YsT0FBSSxLQUFJLE9BQU8sR0FBSyxDQUFBLEtBQUksWUFBWSxDQUFHO0FBRW5DLFNBQUksS0FBSSxPQUFPLEdBQUssR0FBQyxDQUFHO0FBQ3BCLFlBQUksU0FBUyxFQUFJLENBQUEsSUFBRyxDQUFFLFVBQVMsQ0FBQyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsVUFBUSxDQUFDLENBQUE7TUFDOUQsS0FBUztBQUNMLFlBQUksU0FBUyxFQUFJLENBQUEsSUFBRyxDQUFFLFVBQVMsQ0FBQyxRQUFRLEFBQUMsQ0FBQyxLQUFJLENBQUcsQ0FBQSxLQUFJLE9BQU8sQ0FBQyxDQUFBO01BQ2pFO0FBQUEsQUFBQyxNQUFBO0FBRUQsVUFBSSxTQUFTLEVBQUksQ0FBQSxLQUFJLFNBQVMsUUFBUSxBQUFDLENBQUMsS0FBSSxDQUFHLE1BQUksQ0FBQyxDQUFBO0lBRXhELEtBQVM7QUFFTCxTQUFJLEtBQUksT0FBTyxHQUFLLEdBQUMsQ0FBRztBQUNwQixZQUFJLFNBQVMsRUFBSSxDQUFBLElBQUcsQ0FBRSxVQUFTLENBQUMsUUFBUSxBQUFDLENBQUMsS0FBSSxDQUFHLFVBQVEsQ0FBQyxDQUFBO01BQzlELEtBQVM7QUFDTCxZQUFJLFNBQVMsRUFBSSxDQUFBLElBQUcsQ0FBRSxVQUFTLENBQUMsUUFBUSxBQUFDLENBQUMsS0FBSSxDQUFHLENBQUEsS0FBSSxPQUFPLENBQUMsQ0FBQTtNQUNqRTtBQUFBLEFBQUMsTUFBQTtBQUVELFNBQUksS0FBSSxZQUFZLElBQU0sRUFBQSxDQUFHO0FBQ3pCLFlBQUksU0FBUyxFQUFJLENBQUEsS0FBSSxTQUFTLFFBQVEsQUFBQyxDQUFDLEtBQUksQ0FBRyxPQUFLLENBQUMsQ0FBQTtNQUN6RCxLQUFTO0FBQ0wsWUFBSSxTQUFTLEVBQUksQ0FBQSxLQUFJLFNBQVMsUUFBUSxBQUFDLENBQUMsS0FBSSxDQUFHLENBQUEsS0FBSSxZQUFZLENBQUMsQ0FBQTtNQUNwRTtBQUFBLElBRUo7QUFBQSxBQUdBLE9BQUksS0FBSSxZQUFZLEdBQUssRUFBQSxDQUFHO0FBQ3hCLFVBQUksU0FBUyxFQUFFLENBQUEsS0FBSSxTQUFTLFFBQVEsQUFBQyxDQUFDLFVBQVMsQ0FBRyxLQUFHLENBQUMsQ0FBQTtJQUMxRCxLQUFTO0FBQ0wsVUFBSSxTQUFTLEVBQUUsQ0FBQSxLQUFJLFNBQVMsUUFBUSxBQUFDLENBQUMsVUFBUyxDQUFHLE1BQUksQ0FBQyxDQUFBO0lBQzNEO0FBQUEsQUFHQSxRQUFJLEVBQUUsRUFBRSxFQUFBLENBQUM7QUFDVCxRQUFJLFdBQVcsRUFBSSxDQUFBLENBQUMsR0FBRSxFQUFFLENBQUEsS0FBSSxFQUFFLENBQUMsRUFBRSxRQUFNLENBQUE7QUFDdkMsUUFBSSxjQUFjLEVBQUksQ0FBQSxDQUFDLEdBQUUsRUFBRSxDQUFBLEtBQUksRUFBRSxDQUFDLEVBQUUsUUFBTSxDQUFBO0FBRTFDLFNBQU8sTUFBSSxDQUFDO0VBQ1osRUFBQyxDQUFDO0FBRUYsUUFBTSxJQUFJLEFBQUMsQ0FBQyxHQUFFLENBQUMsQ0FBQztBQUVoQixPQUFPLElBQUUsQ0FBQztBQUVkO0FBR0EsS0FBSyxRQUFRLEVBQUksWUFBVSxDQUFDO0FBQzVCOzs7O0FDNUZBO0FBQUEsQUFBSSxFQUFBLENBQUEsT0FBTSxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsV0FBVSxDQUFDLENBQUM7QUFDbEMsQUFBSSxFQUFBLENBQUEsVUFBUyxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsY0FBYSxDQUFDLENBQUM7QUFFeEMsQUFBSSxFQUFBLENBQUEsS0FBSSxFQUFJLEVBQ1gsK0JBQThCLENBQzNCLGlDQUErQixDQUMvQixpQ0FBK0IsQ0FDL0IsaUNBQStCLENBQy9CLGlDQUErQixDQUNsQyxZQUFVLENBQ1AseUJBQXVCLENBQzNCLENBQUM7QUFFRCxBQUFJLEVBQUEsQ0FBQSxnQkFBZSxFQUFJLEVBQ3RCLCtCQUE4QixDQUMzQixpQ0FBK0IsQ0FDL0IsaUNBQStCLENBQy9CLGlDQUErQixDQUMvQixpQ0FBK0IsQ0FDbkMsQ0FBQztBQUVELE1BQU0sYUFBYSxBQUFDLENBQUMsS0FBSSxDQUFDLENBQUM7QUFHM0IsQUFBSSxFQUFBLENBQUEsV0FBVSxDQUFDO0FBQ2YsQUFBSSxFQUFBLENBQUEsR0FBRSxFQUFJLElBQUksV0FBUyxBQUFDLEVBQUMsQ0FBQztBQUcxQixBQUFDLENBQUMsTUFBSyxDQUFDLEtBQUssQUFBQyxFQUFDLFNBQUEsQUFBQyxDQUFLO0FBQ2pCLFFBQU0sZUFBZSxBQUFDLENBQ3JCLGdCQUFlLENBQ1osVUFBUSxBQUFDLENBQUU7QUFBRSxjQUFVLEVBQUksQ0FBQSxHQUFFLE1BQU0sQUFBQyxFQUFDLENBQUM7RUFBRSxDQUM1QyxDQUFDO0FBQ0wsRUFBQyxDQUFDO0FBQ0YiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4vLyByZXNvbHZlcyAuIGFuZCAuLiBlbGVtZW50cyBpbiBhIHBhdGggYXJyYXkgd2l0aCBkaXJlY3RvcnkgbmFtZXMgdGhlcmVcbi8vIG11c3QgYmUgbm8gc2xhc2hlcywgZW1wdHkgZWxlbWVudHMsIG9yIGRldmljZSBuYW1lcyAoYzpcXCkgaW4gdGhlIGFycmF5XG4vLyAoc28gYWxzbyBubyBsZWFkaW5nIGFuZCB0cmFpbGluZyBzbGFzaGVzIC0gaXQgZG9lcyBub3QgZGlzdGluZ3Vpc2hcbi8vIHJlbGF0aXZlIGFuZCBhYnNvbHV0ZSBwYXRocylcbmZ1bmN0aW9uIG5vcm1hbGl6ZUFycmF5KHBhcnRzLCBhbGxvd0Fib3ZlUm9vdCkge1xuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gcGFydHMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICB2YXIgbGFzdCA9IHBhcnRzW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICB9IGVsc2UgaWYgKGxhc3QgPT09ICcuLicpIHtcbiAgICAgIHBhcnRzLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgcGFydHMuc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmIChhbGxvd0Fib3ZlUm9vdCkge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgcGFydHMudW5zaGlmdCgnLi4nKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcGFydHM7XG59XG5cbi8vIFNwbGl0IGEgZmlsZW5hbWUgaW50byBbcm9vdCwgZGlyLCBiYXNlbmFtZSwgZXh0XSwgdW5peCB2ZXJzaW9uXG4vLyAncm9vdCcgaXMganVzdCBhIHNsYXNoLCBvciBub3RoaW5nLlxudmFyIHNwbGl0UGF0aFJlID1cbiAgICAvXihcXC8/fCkoW1xcc1xcU10qPykoKD86XFwuezEsMn18W15cXC9dKz98KShcXC5bXi5cXC9dKnwpKSg/OltcXC9dKikkLztcbnZhciBzcGxpdFBhdGggPSBmdW5jdGlvbihmaWxlbmFtZSkge1xuICByZXR1cm4gc3BsaXRQYXRoUmUuZXhlYyhmaWxlbmFtZSkuc2xpY2UoMSk7XG59O1xuXG4vLyBwYXRoLnJlc29sdmUoW2Zyb20gLi4uXSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlc29sdmUgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHJlc29sdmVkUGF0aCA9ICcnLFxuICAgICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IGZhbHNlO1xuXG4gIGZvciAodmFyIGkgPSBhcmd1bWVudHMubGVuZ3RoIC0gMTsgaSA+PSAtMSAmJiAhcmVzb2x2ZWRBYnNvbHV0ZTsgaS0tKSB7XG4gICAgdmFyIHBhdGggPSAoaSA+PSAwKSA/IGFyZ3VtZW50c1tpXSA6IHByb2Nlc3MuY3dkKCk7XG5cbiAgICAvLyBTa2lwIGVtcHR5IGFuZCBpbnZhbGlkIGVudHJpZXNcbiAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudHMgdG8gcGF0aC5yZXNvbHZlIG11c3QgYmUgc3RyaW5ncycpO1xuICAgIH0gZWxzZSBpZiAoIXBhdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIHJlc29sdmVkUGF0aCA9IHBhdGggKyAnLycgKyByZXNvbHZlZFBhdGg7XG4gICAgcmVzb2x2ZWRBYnNvbHV0ZSA9IHBhdGguY2hhckF0KDApID09PSAnLyc7XG4gIH1cblxuICAvLyBBdCB0aGlzIHBvaW50IHRoZSBwYXRoIHNob3VsZCBiZSByZXNvbHZlZCB0byBhIGZ1bGwgYWJzb2x1dGUgcGF0aCwgYnV0XG4gIC8vIGhhbmRsZSByZWxhdGl2ZSBwYXRocyB0byBiZSBzYWZlIChtaWdodCBoYXBwZW4gd2hlbiBwcm9jZXNzLmN3ZCgpIGZhaWxzKVxuXG4gIC8vIE5vcm1hbGl6ZSB0aGUgcGF0aFxuICByZXNvbHZlZFBhdGggPSBub3JtYWxpemVBcnJheShmaWx0ZXIocmVzb2x2ZWRQYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIXJlc29sdmVkQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICByZXR1cm4gKChyZXNvbHZlZEFic29sdXRlID8gJy8nIDogJycpICsgcmVzb2x2ZWRQYXRoKSB8fCAnLic7XG59O1xuXG4vLyBwYXRoLm5vcm1hbGl6ZShwYXRoKVxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5ub3JtYWxpemUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciBpc0Fic29sdXRlID0gZXhwb3J0cy5pc0Fic29sdXRlKHBhdGgpLFxuICAgICAgdHJhaWxpbmdTbGFzaCA9IHN1YnN0cihwYXRoLCAtMSkgPT09ICcvJztcblxuICAvLyBOb3JtYWxpemUgdGhlIHBhdGhcbiAgcGF0aCA9IG5vcm1hbGl6ZUFycmF5KGZpbHRlcihwYXRoLnNwbGl0KCcvJyksIGZ1bmN0aW9uKHApIHtcbiAgICByZXR1cm4gISFwO1xuICB9KSwgIWlzQWJzb2x1dGUpLmpvaW4oJy8nKTtcblxuICBpZiAoIXBhdGggJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBwYXRoID0gJy4nO1xuICB9XG4gIGlmIChwYXRoICYmIHRyYWlsaW5nU2xhc2gpIHtcbiAgICBwYXRoICs9ICcvJztcbiAgfVxuXG4gIHJldHVybiAoaXNBYnNvbHV0ZSA/ICcvJyA6ICcnKSArIHBhdGg7XG59O1xuXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLmlzQWJzb2x1dGUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHJldHVybiBwYXRoLmNoYXJBdCgwKSA9PT0gJy8nO1xufTtcblxuLy8gcG9zaXggdmVyc2lvblxuZXhwb3J0cy5qb2luID0gZnVuY3Rpb24oKSB7XG4gIHZhciBwYXRocyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gIHJldHVybiBleHBvcnRzLm5vcm1hbGl6ZShmaWx0ZXIocGF0aHMsIGZ1bmN0aW9uKHAsIGluZGV4KSB7XG4gICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnRzIHRvIHBhdGguam9pbiBtdXN0IGJlIHN0cmluZ3MnKTtcbiAgICB9XG4gICAgcmV0dXJuIHA7XG4gIH0pLmpvaW4oJy8nKSk7XG59O1xuXG5cbi8vIHBhdGgucmVsYXRpdmUoZnJvbSwgdG8pXG4vLyBwb3NpeCB2ZXJzaW9uXG5leHBvcnRzLnJlbGF0aXZlID0gZnVuY3Rpb24oZnJvbSwgdG8pIHtcbiAgZnJvbSA9IGV4cG9ydHMucmVzb2x2ZShmcm9tKS5zdWJzdHIoMSk7XG4gIHRvID0gZXhwb3J0cy5yZXNvbHZlKHRvKS5zdWJzdHIoMSk7XG5cbiAgZnVuY3Rpb24gdHJpbShhcnIpIHtcbiAgICB2YXIgc3RhcnQgPSAwO1xuICAgIGZvciAoOyBzdGFydCA8IGFyci5sZW5ndGg7IHN0YXJ0KyspIHtcbiAgICAgIGlmIChhcnJbc3RhcnRdICE9PSAnJykgYnJlYWs7XG4gICAgfVxuXG4gICAgdmFyIGVuZCA9IGFyci5sZW5ndGggLSAxO1xuICAgIGZvciAoOyBlbmQgPj0gMDsgZW5kLS0pIHtcbiAgICAgIGlmIChhcnJbZW5kXSAhPT0gJycpIGJyZWFrO1xuICAgIH1cblxuICAgIGlmIChzdGFydCA+IGVuZCkgcmV0dXJuIFtdO1xuICAgIHJldHVybiBhcnIuc2xpY2Uoc3RhcnQsIGVuZCAtIHN0YXJ0ICsgMSk7XG4gIH1cblxuICB2YXIgZnJvbVBhcnRzID0gdHJpbShmcm9tLnNwbGl0KCcvJykpO1xuICB2YXIgdG9QYXJ0cyA9IHRyaW0odG8uc3BsaXQoJy8nKSk7XG5cbiAgdmFyIGxlbmd0aCA9IE1hdGgubWluKGZyb21QYXJ0cy5sZW5ndGgsIHRvUGFydHMubGVuZ3RoKTtcbiAgdmFyIHNhbWVQYXJ0c0xlbmd0aCA9IGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChmcm9tUGFydHNbaV0gIT09IHRvUGFydHNbaV0pIHtcbiAgICAgIHNhbWVQYXJ0c0xlbmd0aCA9IGk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cblxuICB2YXIgb3V0cHV0UGFydHMgPSBbXTtcbiAgZm9yICh2YXIgaSA9IHNhbWVQYXJ0c0xlbmd0aDsgaSA8IGZyb21QYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgIG91dHB1dFBhcnRzLnB1c2goJy4uJyk7XG4gIH1cblxuICBvdXRwdXRQYXJ0cyA9IG91dHB1dFBhcnRzLmNvbmNhdCh0b1BhcnRzLnNsaWNlKHNhbWVQYXJ0c0xlbmd0aCkpO1xuXG4gIHJldHVybiBvdXRwdXRQYXJ0cy5qb2luKCcvJyk7XG59O1xuXG5leHBvcnRzLnNlcCA9ICcvJztcbmV4cG9ydHMuZGVsaW1pdGVyID0gJzonO1xuXG5leHBvcnRzLmRpcm5hbWUgPSBmdW5jdGlvbihwYXRoKSB7XG4gIHZhciByZXN1bHQgPSBzcGxpdFBhdGgocGF0aCksXG4gICAgICByb290ID0gcmVzdWx0WzBdLFxuICAgICAgZGlyID0gcmVzdWx0WzFdO1xuXG4gIGlmICghcm9vdCAmJiAhZGlyKSB7XG4gICAgLy8gTm8gZGlybmFtZSB3aGF0c29ldmVyXG4gICAgcmV0dXJuICcuJztcbiAgfVxuXG4gIGlmIChkaXIpIHtcbiAgICAvLyBJdCBoYXMgYSBkaXJuYW1lLCBzdHJpcCB0cmFpbGluZyBzbGFzaFxuICAgIGRpciA9IGRpci5zdWJzdHIoMCwgZGlyLmxlbmd0aCAtIDEpO1xuICB9XG5cbiAgcmV0dXJuIHJvb3QgKyBkaXI7XG59O1xuXG5cbmV4cG9ydHMuYmFzZW5hbWUgPSBmdW5jdGlvbihwYXRoLCBleHQpIHtcbiAgdmFyIGYgPSBzcGxpdFBhdGgocGF0aClbMl07XG4gIC8vIFRPRE86IG1ha2UgdGhpcyBjb21wYXJpc29uIGNhc2UtaW5zZW5zaXRpdmUgb24gd2luZG93cz9cbiAgaWYgKGV4dCAmJiBmLnN1YnN0cigtMSAqIGV4dC5sZW5ndGgpID09PSBleHQpIHtcbiAgICBmID0gZi5zdWJzdHIoMCwgZi5sZW5ndGggLSBleHQubGVuZ3RoKTtcbiAgfVxuICByZXR1cm4gZjtcbn07XG5cblxuZXhwb3J0cy5leHRuYW1lID0gZnVuY3Rpb24ocGF0aCkge1xuICByZXR1cm4gc3BsaXRQYXRoKHBhdGgpWzNdO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyICh4cywgZikge1xuICAgIGlmICh4cy5maWx0ZXIpIHJldHVybiB4cy5maWx0ZXIoZik7XG4gICAgdmFyIHJlcyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgaWYgKGYoeHNbaV0sIGksIHhzKSkgcmVzLnB1c2goeHNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzO1xufVxuXG4vLyBTdHJpbmcucHJvdG90eXBlLnN1YnN0ciAtIG5lZ2F0aXZlIGluZGV4IGRvbid0IHdvcmsgaW4gSUU4XG52YXIgc3Vic3RyID0gJ2FiJy5zdWJzdHIoLTEpID09PSAnYidcbiAgICA/IGZ1bmN0aW9uIChzdHIsIHN0YXJ0LCBsZW4pIHsgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbikgfVxuICAgIDogZnVuY3Rpb24gKHN0ciwgc3RhcnQsIGxlbikge1xuICAgICAgICBpZiAoc3RhcnQgPCAwKSBzdGFydCA9IHN0ci5sZW5ndGggKyBzdGFydDtcbiAgICAgICAgcmV0dXJuIHN0ci5zdWJzdHIoc3RhcnQsIGxlbik7XG4gICAgfVxuO1xuXG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTl3WVhSb0xXSnliM2R6WlhKcFpua3ZhVzVrWlhndWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklqdEJRVUZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFTSXNJbVpwYkdVaU9pSm5aVzVsY21GMFpXUXVhbk1pTENKemIzVnlZMlZTYjI5MElqb2lJaXdpYzI5MWNtTmxjME52Ym5SbGJuUWlPbHNpTHk4Z1EyOXdlWEpwWjJoMElFcHZlV1Z1ZEN3Z1NXNWpMaUJoYm1RZ2IzUm9aWElnVG05a1pTQmpiMjUwY21saWRYUnZjbk11WEc0dkwxeHVMeThnVUdWeWJXbHpjMmx2YmlCcGN5Qm9aWEpsWW5rZ1ozSmhiblJsWkN3Z1puSmxaU0J2WmlCamFHRnlaMlVzSUhSdklHRnVlU0J3WlhKemIyNGdiMkowWVdsdWFXNW5JR0ZjYmk4dklHTnZjSGtnYjJZZ2RHaHBjeUJ6YjJaMGQyRnlaU0JoYm1RZ1lYTnpiMk5wWVhSbFpDQmtiMk4xYldWdWRHRjBhVzl1SUdacGJHVnpJQ2gwYUdWY2JpOHZJRndpVTI5bWRIZGhjbVZjSWlrc0lIUnZJR1JsWVd3Z2FXNGdkR2hsSUZOdlpuUjNZWEpsSUhkcGRHaHZkWFFnY21WemRISnBZM1JwYjI0c0lHbHVZMngxWkdsdVoxeHVMeThnZDJsMGFHOTFkQ0JzYVcxcGRHRjBhVzl1SUhSb1pTQnlhV2RvZEhNZ2RHOGdkWE5sTENCamIzQjVMQ0J0YjJScFpua3NJRzFsY21kbExDQndkV0pzYVhOb0xGeHVMeThnWkdsemRISnBZblYwWlN3Z2MzVmliR2xqWlc1elpTd2dZVzVrTDI5eUlITmxiR3dnWTI5d2FXVnpJRzltSUhSb1pTQlRiMlowZDJGeVpTd2dZVzVrSUhSdklIQmxjbTFwZEZ4dUx5OGdjR1Z5YzI5dWN5QjBieUIzYUc5dElIUm9aU0JUYjJaMGQyRnlaU0JwY3lCbWRYSnVhWE5vWldRZ2RHOGdaRzhnYzI4c0lITjFZbXBsWTNRZ2RHOGdkR2hsWEc0dkx5Qm1iMnhzYjNkcGJtY2dZMjl1WkdsMGFXOXVjenBjYmk4dlhHNHZMeUJVYUdVZ1lXSnZkbVVnWTI5d2VYSnBaMmgwSUc1dmRHbGpaU0JoYm1RZ2RHaHBjeUJ3WlhKdGFYTnphVzl1SUc1dmRHbGpaU0J6YUdGc2JDQmlaU0JwYm1Oc2RXUmxaRnh1THk4Z2FXNGdZV3hzSUdOdmNHbGxjeUJ2Y2lCemRXSnpkR0Z1ZEdsaGJDQndiM0owYVc5dWN5QnZaaUIwYUdVZ1UyOW1kSGRoY21VdVhHNHZMMXh1THk4Z1ZFaEZJRk5QUmxSWFFWSkZJRWxUSUZCU1QxWkpSRVZFSUZ3aVFWTWdTVk5jSWl3Z1YwbFVTRTlWVkNCWFFWSlNRVTVVV1NCUFJpQkJUbGtnUzBsT1JDd2dSVmhRVWtWVFUxeHVMeThnVDFJZ1NVMVFURWxGUkN3Z1NVNURURlZFU1U1SElFSlZWQ0JPVDFRZ1RFbE5TVlJGUkNCVVR5QlVTRVVnVjBGU1VrRk9WRWxGVXlCUFJseHVMeThnVFVWU1EwaEJUbFJCUWtsTVNWUlpMQ0JHU1ZST1JWTlRJRVpQVWlCQklGQkJVbFJKUTFWTVFWSWdVRlZTVUU5VFJTQkJUa1FnVGs5T1NVNUdVa2xPUjBWTlJVNVVMaUJKVGx4dUx5OGdUazhnUlZaRlRsUWdVMGhCVEV3Z1ZFaEZJRUZWVkVoUFVsTWdUMUlnUTA5UVdWSkpSMGhVSUVoUFRFUkZVbE1nUWtVZ1RFbEJRa3hGSUVaUFVpQkJUbGtnUTB4QlNVMHNYRzR2THlCRVFVMUJSMFZUSUU5U0lFOVVTRVZTSUV4SlFVSkpURWxVV1N3Z1YwaEZWRWhGVWlCSlRpQkJUaUJCUTFSSlQwNGdUMFlnUTA5T1ZGSkJRMVFzSUZSUFVsUWdUMUpjYmk4dklFOVVTRVZTVjBsVFJTd2dRVkpKVTBsT1J5QkdVazlOTENCUFZWUWdUMFlnVDFJZ1NVNGdRMDlPVGtWRFZFbFBUaUJYU1ZSSUlGUklSU0JUVDBaVVYwRlNSU0JQVWlCVVNFVmNiaTh2SUZWVFJTQlBVaUJQVkVoRlVpQkVSVUZNU1U1SFV5QkpUaUJVU0VVZ1UwOUdWRmRCVWtVdVhHNWNiaTh2SUhKbGMyOXNkbVZ6SUM0Z1lXNWtJQzR1SUdWc1pXMWxiblJ6SUdsdUlHRWdjR0YwYUNCaGNuSmhlU0IzYVhSb0lHUnBjbVZqZEc5eWVTQnVZVzFsY3lCMGFHVnlaVnh1THk4Z2JYVnpkQ0JpWlNCdWJ5QnpiR0Z6YUdWekxDQmxiWEIwZVNCbGJHVnRaVzUwY3l3Z2IzSWdaR1YyYVdObElHNWhiV1Z6SUNoak9seGNLU0JwYmlCMGFHVWdZWEp5WVhsY2JpOHZJQ2h6YnlCaGJITnZJRzV2SUd4bFlXUnBibWNnWVc1a0lIUnlZV2xzYVc1bklITnNZWE5vWlhNZ0xTQnBkQ0JrYjJWeklHNXZkQ0JrYVhOMGFXNW5kV2x6YUZ4dUx5OGdjbVZzWVhScGRtVWdZVzVrSUdGaWMyOXNkWFJsSUhCaGRHaHpLVnh1Wm5WdVkzUnBiMjRnYm05eWJXRnNhWHBsUVhKeVlYa29jR0Z5ZEhNc0lHRnNiRzkzUVdKdmRtVlNiMjkwS1NCN1hHNGdJQzh2SUdsbUlIUm9aU0J3WVhSb0lIUnlhV1Z6SUhSdklHZHZJR0ZpYjNabElIUm9aU0J5YjI5MExDQmdkWEJnSUdWdVpITWdkWEFnUGlBd1hHNGdJSFpoY2lCMWNDQTlJREE3WEc0Z0lHWnZjaUFvZG1GeUlHa2dQU0J3WVhKMGN5NXNaVzVuZEdnZ0xTQXhPeUJwSUQ0OUlEQTdJR2t0TFNrZ2UxeHVJQ0FnSUhaaGNpQnNZWE4wSUQwZ2NHRnlkSE5iYVYwN1hHNGdJQ0FnYVdZZ0tHeGhjM1FnUFQwOUlDY3VKeWtnZTF4dUlDQWdJQ0FnY0dGeWRITXVjM0JzYVdObEtHa3NJREVwTzF4dUlDQWdJSDBnWld4elpTQnBaaUFvYkdGemRDQTlQVDBnSnk0dUp5a2dlMXh1SUNBZ0lDQWdjR0Z5ZEhNdWMzQnNhV05sS0drc0lERXBPMXh1SUNBZ0lDQWdkWEFyS3p0Y2JpQWdJQ0I5SUdWc2MyVWdhV1lnS0hWd0tTQjdYRzRnSUNBZ0lDQndZWEowY3k1emNHeHBZMlVvYVN3Z01TazdYRzRnSUNBZ0lDQjFjQzB0TzF4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUM4dklHbG1JSFJvWlNCd1lYUm9JR2x6SUdGc2JHOTNaV1FnZEc4Z1oyOGdZV0p2ZG1VZ2RHaGxJSEp2YjNRc0lISmxjM1J2Y21VZ2JHVmhaR2x1WnlBdUxuTmNiaUFnYVdZZ0tHRnNiRzkzUVdKdmRtVlNiMjkwS1NCN1hHNGdJQ0FnWm05eUlDZzdJSFZ3TFMwN0lIVndLU0I3WEc0Z0lDQWdJQ0J3WVhKMGN5NTFibk5vYVdaMEtDY3VMaWNwTzF4dUlDQWdJSDFjYmlBZ2ZWeHVYRzRnSUhKbGRIVnliaUJ3WVhKMGN6dGNibjFjYmx4dUx5OGdVM0JzYVhRZ1lTQm1hV3hsYm1GdFpTQnBiblJ2SUZ0eWIyOTBMQ0JrYVhJc0lHSmhjMlZ1WVcxbExDQmxlSFJkTENCMWJtbDRJSFpsY25OcGIyNWNiaTh2SUNkeWIyOTBKeUJwY3lCcWRYTjBJR0VnYzJ4aGMyZ3NJRzl5SUc1dmRHaHBibWN1WEc1MllYSWdjM0JzYVhSUVlYUm9VbVVnUFZ4dUlDQWdJQzllS0Z4Y0x6OThLU2hiWEZ4elhGeFRYU28vS1Nnb1B6cGNYQzU3TVN3eWZYeGJYbHhjTDEwclAzd3BLRnhjTGx0ZUxseGNMMTBxZkNrcEtEODZXMXhjTDEwcUtTUXZPMXh1ZG1GeUlITndiR2wwVUdGMGFDQTlJR1oxYm1OMGFXOXVLR1pwYkdWdVlXMWxLU0I3WEc0Z0lISmxkSFZ5YmlCemNHeHBkRkJoZEdoU1pTNWxlR1ZqS0dacGJHVnVZVzFsS1M1emJHbGpaU2d4S1R0Y2JuMDdYRzVjYmk4dklIQmhkR2d1Y21WemIyeDJaU2hiWm5KdmJTQXVMaTVkTENCMGJ5bGNiaTh2SUhCdmMybDRJSFpsY25OcGIyNWNibVY0Y0c5eWRITXVjbVZ6YjJ4MlpTQTlJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQjJZWElnY21WemIyeDJaV1JRWVhSb0lEMGdKeWNzWEc0Z0lDQWdJQ0J5WlhOdmJIWmxaRUZpYzI5c2RYUmxJRDBnWm1Gc2MyVTdYRzVjYmlBZ1ptOXlJQ2gyWVhJZ2FTQTlJR0Z5WjNWdFpXNTBjeTVzWlc1bmRHZ2dMU0F4T3lCcElENDlJQzB4SUNZbUlDRnlaWE52YkhabFpFRmljMjlzZFhSbE95QnBMUzBwSUh0Y2JpQWdJQ0IyWVhJZ2NHRjBhQ0E5SUNocElENDlJREFwSUQ4Z1lYSm5kVzFsYm5SelcybGRJRG9nY0hKdlkyVnpjeTVqZDJRb0tUdGNibHh1SUNBZ0lDOHZJRk5yYVhBZ1pXMXdkSGtnWVc1a0lHbHVkbUZzYVdRZ1pXNTBjbWxsYzF4dUlDQWdJR2xtSUNoMGVYQmxiMllnY0dGMGFDQWhQVDBnSjNOMGNtbHVaeWNwSUh0Y2JpQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0owRnlaM1Z0Wlc1MGN5QjBieUJ3WVhSb0xuSmxjMjlzZG1VZ2JYVnpkQ0JpWlNCemRISnBibWR6SnlrN1hHNGdJQ0FnZlNCbGJITmxJR2xtSUNnaGNHRjBhQ2tnZTF4dUlDQWdJQ0FnWTI5dWRHbHVkV1U3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdjbVZ6YjJ4MlpXUlFZWFJvSUQwZ2NHRjBhQ0FySUNjdkp5QXJJSEpsYzI5c2RtVmtVR0YwYUR0Y2JpQWdJQ0J5WlhOdmJIWmxaRUZpYzI5c2RYUmxJRDBnY0dGMGFDNWphR0Z5UVhRb01Da2dQVDA5SUNjdkp6dGNiaUFnZlZ4dVhHNGdJQzh2SUVGMElIUm9hWE1nY0c5cGJuUWdkR2hsSUhCaGRHZ2djMmh2ZFd4a0lHSmxJSEpsYzI5c2RtVmtJSFJ2SUdFZ1puVnNiQ0JoWW5OdmJIVjBaU0J3WVhSb0xDQmlkWFJjYmlBZ0x5OGdhR0Z1Wkd4bElISmxiR0YwYVhabElIQmhkR2h6SUhSdklHSmxJSE5oWm1VZ0tHMXBaMmgwSUdoaGNIQmxiaUIzYUdWdUlIQnliMk5sYzNNdVkzZGtLQ2tnWm1GcGJITXBYRzVjYmlBZ0x5OGdUbTl5YldGc2FYcGxJSFJvWlNCd1lYUm9YRzRnSUhKbGMyOXNkbVZrVUdGMGFDQTlJRzV2Y20xaGJHbDZaVUZ5Y21GNUtHWnBiSFJsY2loeVpYTnZiSFpsWkZCaGRHZ3VjM0JzYVhRb0p5OG5LU3dnWm5WdVkzUnBiMjRvY0NrZ2UxeHVJQ0FnSUhKbGRIVnliaUFoSVhBN1hHNGdJSDBwTENBaGNtVnpiMngyWldSQlluTnZiSFYwWlNrdWFtOXBiaWduTHljcE8xeHVYRzRnSUhKbGRIVnliaUFvS0hKbGMyOXNkbVZrUVdKemIyeDFkR1VnUHlBbkx5Y2dPaUFuSnlrZ0t5QnlaWE52YkhabFpGQmhkR2dwSUh4OElDY3VKenRjYm4wN1hHNWNiaTh2SUhCaGRHZ3VibTl5YldGc2FYcGxLSEJoZEdncFhHNHZMeUJ3YjNOcGVDQjJaWEp6YVc5dVhHNWxlSEJ2Y25SekxtNXZjbTFoYkdsNlpTQTlJR1oxYm1OMGFXOXVLSEJoZEdncElIdGNiaUFnZG1GeUlHbHpRV0p6YjJ4MWRHVWdQU0JsZUhCdmNuUnpMbWx6UVdKemIyeDFkR1VvY0dGMGFDa3NYRzRnSUNBZ0lDQjBjbUZwYkdsdVoxTnNZWE5vSUQwZ2MzVmljM1J5S0hCaGRHZ3NJQzB4S1NBOVBUMGdKeThuTzF4dVhHNGdJQzh2SUU1dmNtMWhiR2w2WlNCMGFHVWdjR0YwYUZ4dUlDQndZWFJvSUQwZ2JtOXliV0ZzYVhwbFFYSnlZWGtvWm1sc2RHVnlLSEJoZEdndWMzQnNhWFFvSnk4bktTd2dablZ1WTNScGIyNG9jQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQWhJWEE3WEc0Z0lIMHBMQ0FoYVhOQlluTnZiSFYwWlNrdWFtOXBiaWduTHljcE8xeHVYRzRnSUdsbUlDZ2hjR0YwYUNBbUppQWhhWE5CWW5OdmJIVjBaU2tnZTF4dUlDQWdJSEJoZEdnZ1BTQW5MaWM3WEc0Z0lIMWNiaUFnYVdZZ0tIQmhkR2dnSmlZZ2RISmhhV3hwYm1kVGJHRnphQ2tnZTF4dUlDQWdJSEJoZEdnZ0t6MGdKeThuTzF4dUlDQjlYRzVjYmlBZ2NtVjBkWEp1SUNocGMwRmljMjlzZFhSbElEOGdKeThuSURvZ0p5Y3BJQ3NnY0dGMGFEdGNibjA3WEc1Y2JpOHZJSEJ2YzJsNElIWmxjbk5wYjI1Y2JtVjRjRzl5ZEhNdWFYTkJZbk52YkhWMFpTQTlJR1oxYm1OMGFXOXVLSEJoZEdncElIdGNiaUFnY21WMGRYSnVJSEJoZEdndVkyaGhja0YwS0RBcElEMDlQU0FuTHljN1hHNTlPMXh1WEc0dkx5QndiM05wZUNCMlpYSnphVzl1WEc1bGVIQnZjblJ6TG1wdmFXNGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdkbUZ5SUhCaGRHaHpJRDBnUVhKeVlYa3VjSEp2ZEc5MGVYQmxMbk5zYVdObExtTmhiR3dvWVhKbmRXMWxiblJ6TENBd0tUdGNiaUFnY21WMGRYSnVJR1Y0Y0c5eWRITXVibTl5YldGc2FYcGxLR1pwYkhSbGNpaHdZWFJvY3l3Z1puVnVZM1JwYjI0b2NDd2dhVzVrWlhncElIdGNiaUFnSUNCcFppQW9kSGx3Wlc5bUlIQWdJVDA5SUNkemRISnBibWNuS1NCN1hHNGdJQ0FnSUNCMGFISnZkeUJ1WlhjZ1ZIbHdaVVZ5Y205eUtDZEJjbWQxYldWdWRITWdkRzhnY0dGMGFDNXFiMmx1SUcxMWMzUWdZbVVnYzNSeWFXNW5jeWNwTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2NEdGNiaUFnZlNrdWFtOXBiaWduTHljcEtUdGNibjA3WEc1Y2JseHVMeThnY0dGMGFDNXlaV3hoZEdsMlpTaG1jbTl0TENCMGJ5bGNiaTh2SUhCdmMybDRJSFpsY25OcGIyNWNibVY0Y0c5eWRITXVjbVZzWVhScGRtVWdQU0JtZFc1amRHbHZiaWhtY205dExDQjBieWtnZTF4dUlDQm1jbTl0SUQwZ1pYaHdiM0owY3k1eVpYTnZiSFpsS0daeWIyMHBMbk4xWW5OMGNpZ3hLVHRjYmlBZ2RHOGdQU0JsZUhCdmNuUnpMbkpsYzI5c2RtVW9kRzhwTG5OMVluTjBjaWd4S1R0Y2JseHVJQ0JtZFc1amRHbHZiaUIwY21sdEtHRnljaWtnZTF4dUlDQWdJSFpoY2lCemRHRnlkQ0E5SURBN1hHNGdJQ0FnWm05eUlDZzdJSE4wWVhKMElEd2dZWEp5TG14bGJtZDBhRHNnYzNSaGNuUXJLeWtnZTF4dUlDQWdJQ0FnYVdZZ0tHRnljbHR6ZEdGeWRGMGdJVDA5SUNjbktTQmljbVZoYXp0Y2JpQWdJQ0I5WEc1Y2JpQWdJQ0IyWVhJZ1pXNWtJRDBnWVhKeUxteGxibWQwYUNBdElERTdYRzRnSUNBZ1ptOXlJQ2c3SUdWdVpDQStQU0F3T3lCbGJtUXRMU2tnZTF4dUlDQWdJQ0FnYVdZZ0tHRnljbHRsYm1SZElDRTlQU0FuSnlrZ1luSmxZV3M3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdhV1lnS0hOMFlYSjBJRDRnWlc1a0tTQnlaWFIxY200Z1cxMDdYRzRnSUNBZ2NtVjBkWEp1SUdGeWNpNXpiR2xqWlNoemRHRnlkQ3dnWlc1a0lDMGdjM1JoY25RZ0t5QXhLVHRjYmlBZ2ZWeHVYRzRnSUhaaGNpQm1jbTl0VUdGeWRITWdQU0IwY21sdEtHWnliMjB1YzNCc2FYUW9KeThuS1NrN1hHNGdJSFpoY2lCMGIxQmhjblJ6SUQwZ2RISnBiU2gwYnk1emNHeHBkQ2duTHljcEtUdGNibHh1SUNCMllYSWdiR1Z1WjNSb0lEMGdUV0YwYUM1dGFXNG9abkp2YlZCaGNuUnpMbXhsYm1kMGFDd2dkRzlRWVhKMGN5NXNaVzVuZEdncE8xeHVJQ0IyWVhJZ2MyRnRaVkJoY25SelRHVnVaM1JvSUQwZ2JHVnVaM1JvTzF4dUlDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR3hsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnYVdZZ0tHWnliMjFRWVhKMGMxdHBYU0FoUFQwZ2RHOVFZWEowYzF0cFhTa2dlMXh1SUNBZ0lDQWdjMkZ0WlZCaGNuUnpUR1Z1WjNSb0lEMGdhVHRjYmlBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUgxY2JpQWdmVnh1WEc0Z0lIWmhjaUJ2ZFhSd2RYUlFZWEowY3lBOUlGdGRPMXh1SUNCbWIzSWdLSFpoY2lCcElEMGdjMkZ0WlZCaGNuUnpUR1Z1WjNSb095QnBJRHdnWm5KdmJWQmhjblJ6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ2IzVjBjSFYwVUdGeWRITXVjSFZ6YUNnbkxpNG5LVHRjYmlBZ2ZWeHVYRzRnSUc5MWRIQjFkRkJoY25SeklEMGdiM1YwY0hWMFVHRnlkSE11WTI5dVkyRjBLSFJ2VUdGeWRITXVjMnhwWTJVb2MyRnRaVkJoY25SelRHVnVaM1JvS1NrN1hHNWNiaUFnY21WMGRYSnVJRzkxZEhCMWRGQmhjblJ6TG1wdmFXNG9KeThuS1R0Y2JuMDdYRzVjYm1WNGNHOXlkSE11YzJWd0lEMGdKeThuTzF4dVpYaHdiM0owY3k1a1pXeHBiV2wwWlhJZ1BTQW5PaWM3WEc1Y2JtVjRjRzl5ZEhNdVpHbHlibUZ0WlNBOUlHWjFibU4wYVc5dUtIQmhkR2dwSUh0Y2JpQWdkbUZ5SUhKbGMzVnNkQ0E5SUhOd2JHbDBVR0YwYUNod1lYUm9LU3hjYmlBZ0lDQWdJSEp2YjNRZ1BTQnlaWE4xYkhSYk1GMHNYRzRnSUNBZ0lDQmthWElnUFNCeVpYTjFiSFJiTVYwN1hHNWNiaUFnYVdZZ0tDRnliMjkwSUNZbUlDRmthWElwSUh0Y2JpQWdJQ0F2THlCT2J5QmthWEp1WVcxbElIZG9ZWFJ6YjJWMlpYSmNiaUFnSUNCeVpYUjFjbTRnSnk0bk8xeHVJQ0I5WEc1Y2JpQWdhV1lnS0dScGNpa2dlMXh1SUNBZ0lDOHZJRWwwSUdoaGN5QmhJR1JwY201aGJXVXNJSE4wY21sd0lIUnlZV2xzYVc1bklITnNZWE5vWEc0Z0lDQWdaR2x5SUQwZ1pHbHlMbk4xWW5OMGNpZ3dMQ0JrYVhJdWJHVnVaM1JvSUMwZ01TazdYRzRnSUgxY2JseHVJQ0J5WlhSMWNtNGdjbTl2ZENBcklHUnBjanRjYm4wN1hHNWNibHh1Wlhod2IzSjBjeTVpWVhObGJtRnRaU0E5SUdaMWJtTjBhVzl1S0hCaGRHZ3NJR1Y0ZENrZ2UxeHVJQ0IyWVhJZ1ppQTlJSE53YkdsMFVHRjBhQ2h3WVhSb0tWc3lYVHRjYmlBZ0x5OGdWRTlFVHpvZ2JXRnJaU0IwYUdseklHTnZiWEJoY21semIyNGdZMkZ6WlMxcGJuTmxibk5wZEdsMlpTQnZiaUIzYVc1a2IzZHpQMXh1SUNCcFppQW9aWGgwSUNZbUlHWXVjM1ZpYzNSeUtDMHhJQ29nWlhoMExteGxibWQwYUNrZ1BUMDlJR1Y0ZENrZ2UxeHVJQ0FnSUdZZ1BTQm1Mbk4xWW5OMGNpZ3dMQ0JtTG14bGJtZDBhQ0F0SUdWNGRDNXNaVzVuZEdncE8xeHVJQ0I5WEc0Z0lISmxkSFZ5YmlCbU8xeHVmVHRjYmx4dVhHNWxlSEJ2Y25SekxtVjRkRzVoYldVZ1BTQm1kVzVqZEdsdmJpaHdZWFJvS1NCN1hHNGdJSEpsZEhWeWJpQnpjR3hwZEZCaGRHZ29jR0YwYUNsYk0xMDdYRzU5TzF4dVhHNW1kVzVqZEdsdmJpQm1hV3gwWlhJZ0tIaHpMQ0JtS1NCN1hHNGdJQ0FnYVdZZ0tIaHpMbVpwYkhSbGNpa2djbVYwZFhKdUlIaHpMbVpwYkhSbGNpaG1LVHRjYmlBZ0lDQjJZWElnY21WeklEMGdXMTA3WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0I0Y3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb1ppaDRjMXRwWFN3Z2FTd2dlSE1wS1NCeVpYTXVjSFZ6YUNoNGMxdHBYU2s3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCeVpYTTdYRzU5WEc1Y2JpOHZJRk4wY21sdVp5NXdjbTkwYjNSNWNHVXVjM1ZpYzNSeUlDMGdibVZuWVhScGRtVWdhVzVrWlhnZ1pHOXVKM1FnZDI5eWF5QnBiaUJKUlRoY2JuWmhjaUJ6ZFdKemRISWdQU0FuWVdJbkxuTjFZbk4wY2lndE1Ta2dQVDA5SUNkaUoxeHVJQ0FnSUQ4Z1puVnVZM1JwYjI0Z0tITjBjaXdnYzNSaGNuUXNJR3hsYmlrZ2V5QnlaWFIxY200Z2MzUnlMbk4xWW5OMGNpaHpkR0Z5ZEN3Z2JHVnVLU0I5WEc0Z0lDQWdPaUJtZFc1amRHbHZiaUFvYzNSeUxDQnpkR0Z5ZEN3Z2JHVnVLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDaHpkR0Z5ZENBOElEQXBJSE4wWVhKMElEMGdjM1J5TG14bGJtZDBhQ0FySUhOMFlYSjBPMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdjM1J5TG5OMVluTjBjaWh6ZEdGeWRDd2diR1Z1S1R0Y2JpQWdJQ0I5WEc0N1hHNGlYWDA9IiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxucHJvY2Vzcy5uZXh0VGljayA9IChmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGNhblNldEltbWVkaWF0ZSA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93LnNldEltbWVkaWF0ZTtcbiAgICB2YXIgY2FuTXV0YXRpb25PYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnXG4gICAgJiYgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXI7XG4gICAgdmFyIGNhblBvc3QgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJ1xuICAgICYmIHdpbmRvdy5wb3N0TWVzc2FnZSAmJiB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lclxuICAgIDtcblxuICAgIGlmIChjYW5TZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChmKSB7IHJldHVybiB3aW5kb3cuc2V0SW1tZWRpYXRlKGYpIH07XG4gICAgfVxuXG4gICAgdmFyIHF1ZXVlID0gW107XG5cbiAgICBpZiAoY2FuTXV0YXRpb25PYnNlcnZlcikge1xuICAgICAgICB2YXIgaGlkZGVuRGl2ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgICAgdmFyIG9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIHF1ZXVlTGlzdCA9IHF1ZXVlLnNsaWNlKCk7XG4gICAgICAgICAgICBxdWV1ZS5sZW5ndGggPSAwO1xuICAgICAgICAgICAgcXVldWVMaXN0LmZvckVhY2goZnVuY3Rpb24gKGZuKSB7XG4gICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcblxuICAgICAgICBvYnNlcnZlci5vYnNlcnZlKGhpZGRlbkRpdiwgeyBhdHRyaWJ1dGVzOiB0cnVlIH0pO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgaWYgKCFxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBoaWRkZW5EaXYuc2V0QXR0cmlidXRlKCd5ZXMnLCAnbm8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHF1ZXVlLnB1c2goZm4pO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjYW5Qb3N0KSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICB2YXIgc291cmNlID0gZXYuc291cmNlO1xuICAgICAgICAgICAgaWYgKChzb3VyY2UgPT09IHdpbmRvdyB8fCBzb3VyY2UgPT09IG51bGwpICYmIGV2LmRhdGEgPT09ICdwcm9jZXNzLXRpY2snKSB7XG4gICAgICAgICAgICAgICAgZXYuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaWYgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGZuID0gcXVldWUuc2hpZnQoKTtcbiAgICAgICAgICAgICAgICAgICAgZm4oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpO1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiBuZXh0VGljayhmbikge1xuICAgICAgICAgICAgcXVldWUucHVzaChmbik7XG4gICAgICAgICAgICB3aW5kb3cucG9zdE1lc3NhZ2UoJ3Byb2Nlc3MtdGljaycsICcqJyk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIG5leHRUaWNrKGZuKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZm4sIDApO1xuICAgIH07XG59KSgpO1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbiIsIihmdW5jdGlvbiAocHJvY2VzcyxnbG9iYWwpe1xuKGZ1bmN0aW9uKGdsb2JhbCkge1xuICAndXNlIHN0cmljdCc7XG4gIGlmIChnbG9iYWwuJHRyYWNldXJSdW50aW1lKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciAkT2JqZWN0ID0gT2JqZWN0O1xuICB2YXIgJFR5cGVFcnJvciA9IFR5cGVFcnJvcjtcbiAgdmFyICRjcmVhdGUgPSAkT2JqZWN0LmNyZWF0ZTtcbiAgdmFyICRkZWZpbmVQcm9wZXJ0aWVzID0gJE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzO1xuICB2YXIgJGRlZmluZVByb3BlcnR5ID0gJE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcbiAgdmFyICRmcmVlemUgPSAkT2JqZWN0LmZyZWV6ZTtcbiAgdmFyICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPSAkT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcjtcbiAgdmFyICRnZXRPd25Qcm9wZXJ0eU5hbWVzID0gJE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzO1xuICB2YXIgJGtleXMgPSAkT2JqZWN0LmtleXM7XG4gIHZhciAkaGFzT3duUHJvcGVydHkgPSAkT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgdmFyICR0b1N0cmluZyA9ICRPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nO1xuICB2YXIgJHByZXZlbnRFeHRlbnNpb25zID0gT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zO1xuICB2YXIgJHNlYWwgPSBPYmplY3Quc2VhbDtcbiAgdmFyICRpc0V4dGVuc2libGUgPSBPYmplY3QuaXNFeHRlbnNpYmxlO1xuICBmdW5jdGlvbiBub25FbnVtKHZhbHVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9O1xuICB9XG4gIHZhciBtZXRob2QgPSBub25FbnVtO1xuICB2YXIgY291bnRlciA9IDA7XG4gIGZ1bmN0aW9uIG5ld1VuaXF1ZVN0cmluZygpIHtcbiAgICByZXR1cm4gJ19fJCcgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxZTkpICsgJyQnICsgKytjb3VudGVyICsgJyRfXyc7XG4gIH1cbiAgdmFyIHN5bWJvbEludGVybmFsUHJvcGVydHkgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgdmFyIHN5bWJvbERlc2NyaXB0aW9uUHJvcGVydHkgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgdmFyIHN5bWJvbERhdGFQcm9wZXJ0eSA9IG5ld1VuaXF1ZVN0cmluZygpO1xuICB2YXIgc3ltYm9sVmFsdWVzID0gJGNyZWF0ZShudWxsKTtcbiAgdmFyIHByaXZhdGVOYW1lcyA9ICRjcmVhdGUobnVsbCk7XG4gIGZ1bmN0aW9uIGlzUHJpdmF0ZU5hbWUocykge1xuICAgIHJldHVybiBwcml2YXRlTmFtZXNbc107XG4gIH1cbiAgZnVuY3Rpb24gY3JlYXRlUHJpdmF0ZU5hbWUoKSB7XG4gICAgdmFyIHMgPSBuZXdVbmlxdWVTdHJpbmcoKTtcbiAgICBwcml2YXRlTmFtZXNbc10gPSB0cnVlO1xuICAgIHJldHVybiBzO1xuICB9XG4gIGZ1bmN0aW9uIGlzU2hpbVN5bWJvbChzeW1ib2wpIHtcbiAgICByZXR1cm4gdHlwZW9mIHN5bWJvbCA9PT0gJ29iamVjdCcgJiYgc3ltYm9sIGluc3RhbmNlb2YgU3ltYm9sVmFsdWU7XG4gIH1cbiAgZnVuY3Rpb24gdHlwZU9mKHYpIHtcbiAgICBpZiAoaXNTaGltU3ltYm9sKHYpKVxuICAgICAgcmV0dXJuICdzeW1ib2wnO1xuICAgIHJldHVybiB0eXBlb2YgdjtcbiAgfVxuICBmdW5jdGlvbiBTeW1ib2woZGVzY3JpcHRpb24pIHtcbiAgICB2YXIgdmFsdWUgPSBuZXcgU3ltYm9sVmFsdWUoZGVzY3JpcHRpb24pO1xuICAgIGlmICghKHRoaXMgaW5zdGFuY2VvZiBTeW1ib2wpKVxuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1N5bWJvbCBjYW5ub3QgYmUgbmV3XFwnZWQnKTtcbiAgfVxuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sLnByb3RvdHlwZSwgJ2NvbnN0cnVjdG9yJywgbm9uRW51bShTeW1ib2wpKTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbC5wcm90b3R5cGUsICd0b1N0cmluZycsIG1ldGhvZChmdW5jdGlvbigpIHtcbiAgICB2YXIgc3ltYm9sVmFsdWUgPSB0aGlzW3N5bWJvbERhdGFQcm9wZXJ0eV07XG4gICAgaWYgKCFnZXRPcHRpb24oJ3N5bWJvbHMnKSlcbiAgICAgIHJldHVybiBzeW1ib2xWYWx1ZVtzeW1ib2xJbnRlcm5hbFByb3BlcnR5XTtcbiAgICBpZiAoIXN5bWJvbFZhbHVlKVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdDb252ZXJzaW9uIGZyb20gc3ltYm9sIHRvIHN0cmluZycpO1xuICAgIHZhciBkZXNjID0gc3ltYm9sVmFsdWVbc3ltYm9sRGVzY3JpcHRpb25Qcm9wZXJ0eV07XG4gICAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZClcbiAgICAgIGRlc2MgPSAnJztcbiAgICByZXR1cm4gJ1N5bWJvbCgnICsgZGVzYyArICcpJztcbiAgfSkpO1xuICAkZGVmaW5lUHJvcGVydHkoU3ltYm9sLnByb3RvdHlwZSwgJ3ZhbHVlT2YnLCBtZXRob2QoZnVuY3Rpb24oKSB7XG4gICAgdmFyIHN5bWJvbFZhbHVlID0gdGhpc1tzeW1ib2xEYXRhUHJvcGVydHldO1xuICAgIGlmICghc3ltYm9sVmFsdWUpXG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ0NvbnZlcnNpb24gZnJvbSBzeW1ib2wgdG8gc3RyaW5nJyk7XG4gICAgaWYgKCFnZXRPcHRpb24oJ3N5bWJvbHMnKSlcbiAgICAgIHJldHVybiBzeW1ib2xWYWx1ZVtzeW1ib2xJbnRlcm5hbFByb3BlcnR5XTtcbiAgICByZXR1cm4gc3ltYm9sVmFsdWU7XG4gIH0pKTtcbiAgZnVuY3Rpb24gU3ltYm9sVmFsdWUoZGVzY3JpcHRpb24pIHtcbiAgICB2YXIga2V5ID0gbmV3VW5pcXVlU3RyaW5nKCk7XG4gICAgJGRlZmluZVByb3BlcnR5KHRoaXMsIHN5bWJvbERhdGFQcm9wZXJ0eSwge3ZhbHVlOiB0aGlzfSk7XG4gICAgJGRlZmluZVByb3BlcnR5KHRoaXMsIHN5bWJvbEludGVybmFsUHJvcGVydHksIHt2YWx1ZToga2V5fSk7XG4gICAgJGRlZmluZVByb3BlcnR5KHRoaXMsIHN5bWJvbERlc2NyaXB0aW9uUHJvcGVydHksIHt2YWx1ZTogZGVzY3JpcHRpb259KTtcbiAgICBmcmVlemUodGhpcyk7XG4gICAgc3ltYm9sVmFsdWVzW2tleV0gPSB0aGlzO1xuICB9XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2xWYWx1ZS5wcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIG5vbkVudW0oU3ltYm9sKSk7XG4gICRkZWZpbmVQcm9wZXJ0eShTeW1ib2xWYWx1ZS5wcm90b3R5cGUsICd0b1N0cmluZycsIHtcbiAgICB2YWx1ZTogU3ltYm9sLnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KTtcbiAgJGRlZmluZVByb3BlcnR5KFN5bWJvbFZhbHVlLnByb3RvdHlwZSwgJ3ZhbHVlT2YnLCB7XG4gICAgdmFsdWU6IFN5bWJvbC5wcm90b3R5cGUudmFsdWVPZixcbiAgICBlbnVtZXJhYmxlOiBmYWxzZVxuICB9KTtcbiAgdmFyIGhhc2hQcm9wZXJ0eSA9IGNyZWF0ZVByaXZhdGVOYW1lKCk7XG4gIHZhciBoYXNoUHJvcGVydHlEZXNjcmlwdG9yID0ge3ZhbHVlOiB1bmRlZmluZWR9O1xuICB2YXIgaGFzaE9iamVjdFByb3BlcnRpZXMgPSB7XG4gICAgaGFzaDoge3ZhbHVlOiB1bmRlZmluZWR9LFxuICAgIHNlbGY6IHt2YWx1ZTogdW5kZWZpbmVkfVxuICB9O1xuICB2YXIgaGFzaENvdW50ZXIgPSAwO1xuICBmdW5jdGlvbiBnZXRPd25IYXNoT2JqZWN0KG9iamVjdCkge1xuICAgIHZhciBoYXNoT2JqZWN0ID0gb2JqZWN0W2hhc2hQcm9wZXJ0eV07XG4gICAgaWYgKGhhc2hPYmplY3QgJiYgaGFzaE9iamVjdC5zZWxmID09PSBvYmplY3QpXG4gICAgICByZXR1cm4gaGFzaE9iamVjdDtcbiAgICBpZiAoJGlzRXh0ZW5zaWJsZShvYmplY3QpKSB7XG4gICAgICBoYXNoT2JqZWN0UHJvcGVydGllcy5oYXNoLnZhbHVlID0gaGFzaENvdW50ZXIrKztcbiAgICAgIGhhc2hPYmplY3RQcm9wZXJ0aWVzLnNlbGYudmFsdWUgPSBvYmplY3Q7XG4gICAgICBoYXNoUHJvcGVydHlEZXNjcmlwdG9yLnZhbHVlID0gJGNyZWF0ZShudWxsLCBoYXNoT2JqZWN0UHJvcGVydGllcyk7XG4gICAgICAkZGVmaW5lUHJvcGVydHkob2JqZWN0LCBoYXNoUHJvcGVydHksIGhhc2hQcm9wZXJ0eURlc2NyaXB0b3IpO1xuICAgICAgcmV0dXJuIGhhc2hQcm9wZXJ0eURlc2NyaXB0b3IudmFsdWU7XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gZnJlZXplKG9iamVjdCkge1xuICAgIGdldE93bkhhc2hPYmplY3Qob2JqZWN0KTtcbiAgICByZXR1cm4gJGZyZWV6ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG4gIGZ1bmN0aW9uIHByZXZlbnRFeHRlbnNpb25zKG9iamVjdCkge1xuICAgIGdldE93bkhhc2hPYmplY3Qob2JqZWN0KTtcbiAgICByZXR1cm4gJHByZXZlbnRFeHRlbnNpb25zLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cbiAgZnVuY3Rpb24gc2VhbChvYmplY3QpIHtcbiAgICBnZXRPd25IYXNoT2JqZWN0KG9iamVjdCk7XG4gICAgcmV0dXJuICRzZWFsLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cbiAgZnJlZXplKFN5bWJvbFZhbHVlLnByb3RvdHlwZSk7XG4gIGZ1bmN0aW9uIGlzU3ltYm9sU3RyaW5nKHMpIHtcbiAgICByZXR1cm4gc3ltYm9sVmFsdWVzW3NdIHx8IHByaXZhdGVOYW1lc1tzXTtcbiAgfVxuICBmdW5jdGlvbiB0b1Byb3BlcnR5KG5hbWUpIHtcbiAgICBpZiAoaXNTaGltU3ltYm9sKG5hbWUpKVxuICAgICAgcmV0dXJuIG5hbWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgcmV0dXJuIG5hbWU7XG4gIH1cbiAgZnVuY3Rpb24gcmVtb3ZlU3ltYm9sS2V5cyhhcnJheSkge1xuICAgIHZhciBydiA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICAgIGlmICghaXNTeW1ib2xTdHJpbmcoYXJyYXlbaV0pKSB7XG4gICAgICAgIHJ2LnB1c2goYXJyYXlbaV0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcnY7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpIHtcbiAgICByZXR1cm4gcmVtb3ZlU3ltYm9sS2V5cygkZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpKTtcbiAgfVxuICBmdW5jdGlvbiBrZXlzKG9iamVjdCkge1xuICAgIHJldHVybiByZW1vdmVTeW1ib2xLZXlzKCRrZXlzKG9iamVjdCkpO1xuICB9XG4gIGZ1bmN0aW9uIGdldE93blByb3BlcnR5U3ltYm9scyhvYmplY3QpIHtcbiAgICB2YXIgcnYgPSBbXTtcbiAgICB2YXIgbmFtZXMgPSAkZ2V0T3duUHJvcGVydHlOYW1lcyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzeW1ib2wgPSBzeW1ib2xWYWx1ZXNbbmFtZXNbaV1dO1xuICAgICAgaWYgKHN5bWJvbCkge1xuICAgICAgICBydi5wdXNoKHN5bWJvbCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBydjtcbiAgfVxuICBmdW5jdGlvbiBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCBuYW1lKSB7XG4gICAgcmV0dXJuICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCB0b1Byb3BlcnR5KG5hbWUpKTtcbiAgfVxuICBmdW5jdGlvbiBoYXNPd25Qcm9wZXJ0eShuYW1lKSB7XG4gICAgcmV0dXJuICRoYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsIHRvUHJvcGVydHkobmFtZSkpO1xuICB9XG4gIGZ1bmN0aW9uIGdldE9wdGlvbihuYW1lKSB7XG4gICAgcmV0dXJuIGdsb2JhbC50cmFjZXVyICYmIGdsb2JhbC50cmFjZXVyLm9wdGlvbnNbbmFtZV07XG4gIH1cbiAgZnVuY3Rpb24gZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCBkZXNjcmlwdG9yKSB7XG4gICAgaWYgKGlzU2hpbVN5bWJvbChuYW1lKSkge1xuICAgICAgbmFtZSA9IG5hbWVbc3ltYm9sSW50ZXJuYWxQcm9wZXJ0eV07XG4gICAgfVxuICAgICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIGRlc2NyaXB0b3IpO1xuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxPYmplY3QoT2JqZWN0KSB7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2RlZmluZVByb3BlcnR5Jywge3ZhbHVlOiBkZWZpbmVQcm9wZXJ0eX0pO1xuICAgICRkZWZpbmVQcm9wZXJ0eShPYmplY3QsICdnZXRPd25Qcm9wZXJ0eU5hbWVzJywge3ZhbHVlOiBnZXRPd25Qcm9wZXJ0eU5hbWVzfSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ2dldE93blByb3BlcnR5RGVzY3JpcHRvcicsIHt2YWx1ZTogZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yfSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdC5wcm90b3R5cGUsICdoYXNPd25Qcm9wZXJ0eScsIHt2YWx1ZTogaGFzT3duUHJvcGVydHl9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAnZnJlZXplJywge3ZhbHVlOiBmcmVlemV9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAncHJldmVudEV4dGVuc2lvbnMnLCB7dmFsdWU6IHByZXZlbnRFeHRlbnNpb25zfSk7XG4gICAgJGRlZmluZVByb3BlcnR5KE9iamVjdCwgJ3NlYWwnLCB7dmFsdWU6IHNlYWx9KTtcbiAgICAkZGVmaW5lUHJvcGVydHkoT2JqZWN0LCAna2V5cycsIHt2YWx1ZToga2V5c30pO1xuICB9XG4gIGZ1bmN0aW9uIGV4cG9ydFN0YXIob2JqZWN0KSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lcyA9ICRnZXRPd25Qcm9wZXJ0eU5hbWVzKGFyZ3VtZW50c1tpXSk7XG4gICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG5hbWVzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIHZhciBuYW1lID0gbmFtZXNbal07XG4gICAgICAgIGlmIChpc1N5bWJvbFN0cmluZyhuYW1lKSlcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgKGZ1bmN0aW9uKG1vZCwgbmFtZSkge1xuICAgICAgICAgICRkZWZpbmVQcm9wZXJ0eShvYmplY3QsIG5hbWUsIHtcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIHJldHVybiBtb2RbbmFtZV07XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgICAgIH0pO1xuICAgICAgICB9KShhcmd1bWVudHNbaV0sIG5hbWVzW2pdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iamVjdDtcbiAgfVxuICBmdW5jdGlvbiBpc09iamVjdCh4KSB7XG4gICAgcmV0dXJuIHggIT0gbnVsbCAmJiAodHlwZW9mIHggPT09ICdvYmplY3QnIHx8IHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nKTtcbiAgfVxuICBmdW5jdGlvbiB0b09iamVjdCh4KSB7XG4gICAgaWYgKHggPT0gbnVsbClcbiAgICAgIHRocm93ICRUeXBlRXJyb3IoKTtcbiAgICByZXR1cm4gJE9iamVjdCh4KTtcbiAgfVxuICBmdW5jdGlvbiBjaGVja09iamVjdENvZXJjaWJsZShhcmd1bWVudCkge1xuICAgIGlmIChhcmd1bWVudCA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdWYWx1ZSBjYW5ub3QgYmUgY29udmVydGVkIHRvIGFuIE9iamVjdCcpO1xuICAgIH1cbiAgICByZXR1cm4gYXJndW1lbnQ7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxTeW1ib2woZ2xvYmFsLCBTeW1ib2wpIHtcbiAgICBpZiAoIWdsb2JhbC5TeW1ib2wpIHtcbiAgICAgIGdsb2JhbC5TeW1ib2wgPSBTeW1ib2w7XG4gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID0gZ2V0T3duUHJvcGVydHlTeW1ib2xzO1xuICAgIH1cbiAgICBpZiAoIWdsb2JhbC5TeW1ib2wuaXRlcmF0b3IpIHtcbiAgICAgIGdsb2JhbC5TeW1ib2wuaXRlcmF0b3IgPSBTeW1ib2woJ1N5bWJvbC5pdGVyYXRvcicpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBzZXR1cEdsb2JhbHMoZ2xvYmFsKSB7XG4gICAgcG9seWZpbGxTeW1ib2woZ2xvYmFsLCBTeW1ib2wpO1xuICAgIGdsb2JhbC5SZWZsZWN0ID0gZ2xvYmFsLlJlZmxlY3QgfHwge307XG4gICAgZ2xvYmFsLlJlZmxlY3QuZ2xvYmFsID0gZ2xvYmFsLlJlZmxlY3QuZ2xvYmFsIHx8IGdsb2JhbDtcbiAgICBwb2x5ZmlsbE9iamVjdChnbG9iYWwuT2JqZWN0KTtcbiAgfVxuICBzZXR1cEdsb2JhbHMoZ2xvYmFsKTtcbiAgZ2xvYmFsLiR0cmFjZXVyUnVudGltZSA9IHtcbiAgICBjaGVja09iamVjdENvZXJjaWJsZTogY2hlY2tPYmplY3RDb2VyY2libGUsXG4gICAgY3JlYXRlUHJpdmF0ZU5hbWU6IGNyZWF0ZVByaXZhdGVOYW1lLFxuICAgIGRlZmluZVByb3BlcnRpZXM6ICRkZWZpbmVQcm9wZXJ0aWVzLFxuICAgIGRlZmluZVByb3BlcnR5OiAkZGVmaW5lUHJvcGVydHksXG4gICAgZXhwb3J0U3RhcjogZXhwb3J0U3RhcixcbiAgICBnZXRPd25IYXNoT2JqZWN0OiBnZXRPd25IYXNoT2JqZWN0LFxuICAgIGdldE93blByb3BlcnR5RGVzY3JpcHRvcjogJGdldE93blByb3BlcnR5RGVzY3JpcHRvcixcbiAgICBnZXRPd25Qcm9wZXJ0eU5hbWVzOiAkZ2V0T3duUHJvcGVydHlOYW1lcyxcbiAgICBpc09iamVjdDogaXNPYmplY3QsXG4gICAgaXNQcml2YXRlTmFtZTogaXNQcml2YXRlTmFtZSxcbiAgICBpc1N5bWJvbFN0cmluZzogaXNTeW1ib2xTdHJpbmcsXG4gICAga2V5czogJGtleXMsXG4gICAgc2V0dXBHbG9iYWxzOiBzZXR1cEdsb2JhbHMsXG4gICAgdG9PYmplY3Q6IHRvT2JqZWN0LFxuICAgIHRvUHJvcGVydHk6IHRvUHJvcGVydHksXG4gICAgdHlwZW9mOiB0eXBlT2ZcbiAgfTtcbn0pKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnID8gd2luZG93IDogdHlwZW9mIGdsb2JhbCAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gJ3VuZGVmaW5lZCcgPyBzZWxmIDogdGhpcyk7XG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIHBhdGg7XG4gIGZ1bmN0aW9uIHJlbGF0aXZlUmVxdWlyZShjYWxsZXJQYXRoLCByZXF1aXJlZFBhdGgpIHtcbiAgICBwYXRoID0gcGF0aCB8fCB0eXBlb2YgcmVxdWlyZSAhPT0gJ3VuZGVmaW5lZCcgJiYgcmVxdWlyZSgncGF0aCcpO1xuICAgIGZ1bmN0aW9uIGlzRGlyZWN0b3J5KHBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoLnNsaWNlKC0xKSA9PT0gJy8nO1xuICAgIH1cbiAgICBmdW5jdGlvbiBpc0Fic29sdXRlKHBhdGgpIHtcbiAgICAgIHJldHVybiBwYXRoWzBdID09PSAnLyc7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzUmVsYXRpdmUocGF0aCkge1xuICAgICAgcmV0dXJuIHBhdGhbMF0gPT09ICcuJztcbiAgICB9XG4gICAgaWYgKGlzRGlyZWN0b3J5KHJlcXVpcmVkUGF0aCkgfHwgaXNBYnNvbHV0ZShyZXF1aXJlZFBhdGgpKVxuICAgICAgcmV0dXJuO1xuICAgIHJldHVybiBpc1JlbGF0aXZlKHJlcXVpcmVkUGF0aCkgPyByZXF1aXJlKHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoY2FsbGVyUGF0aCksIHJlcXVpcmVkUGF0aCkpIDogcmVxdWlyZShyZXF1aXJlZFBhdGgpO1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5yZXF1aXJlID0gcmVsYXRpdmVSZXF1aXJlO1xufSkoKTtcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBmdW5jdGlvbiBzcHJlYWQoKSB7XG4gICAgdmFyIHJ2ID0gW10sXG4gICAgICAgIGogPSAwLFxuICAgICAgICBpdGVyUmVzdWx0O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdmFsdWVUb1NwcmVhZCA9ICR0cmFjZXVyUnVudGltZS5jaGVja09iamVjdENvZXJjaWJsZShhcmd1bWVudHNbaV0pO1xuICAgICAgaWYgKHR5cGVvZiB2YWx1ZVRvU3ByZWFkWyR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5KFN5bWJvbC5pdGVyYXRvcildICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBzcHJlYWQgbm9uLWl0ZXJhYmxlIG9iamVjdC4nKTtcbiAgICAgIH1cbiAgICAgIHZhciBpdGVyID0gdmFsdWVUb1NwcmVhZFskdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShTeW1ib2wuaXRlcmF0b3IpXSgpO1xuICAgICAgd2hpbGUgKCEoaXRlclJlc3VsdCA9IGl0ZXIubmV4dCgpKS5kb25lKSB7XG4gICAgICAgIHJ2W2orK10gPSBpdGVyUmVzdWx0LnZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcnY7XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLnNwcmVhZCA9IHNwcmVhZDtcbn0pKCk7XG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyICRPYmplY3QgPSBPYmplY3Q7XG4gIHZhciAkVHlwZUVycm9yID0gVHlwZUVycm9yO1xuICB2YXIgJGNyZWF0ZSA9ICRPYmplY3QuY3JlYXRlO1xuICB2YXIgJGRlZmluZVByb3BlcnRpZXMgPSAkdHJhY2V1clJ1bnRpbWUuZGVmaW5lUHJvcGVydGllcztcbiAgdmFyICRkZWZpbmVQcm9wZXJ0eSA9ICR0cmFjZXVyUnVudGltZS5kZWZpbmVQcm9wZXJ0eTtcbiAgdmFyICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yO1xuICB2YXIgJGdldE93blByb3BlcnR5TmFtZXMgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duUHJvcGVydHlOYW1lcztcbiAgdmFyICRnZXRQcm90b3R5cGVPZiA9IE9iamVjdC5nZXRQcm90b3R5cGVPZjtcbiAgdmFyICRfXzAgPSBPYmplY3QsXG4gICAgICBnZXRPd25Qcm9wZXJ0eU5hbWVzID0gJF9fMC5nZXRPd25Qcm9wZXJ0eU5hbWVzLFxuICAgICAgZ2V0T3duUHJvcGVydHlTeW1ib2xzID0gJF9fMC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHM7XG4gIGZ1bmN0aW9uIHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKSB7XG4gICAgdmFyIHByb3RvID0gJGdldFByb3RvdHlwZU9mKGhvbWVPYmplY3QpO1xuICAgIGRvIHtcbiAgICAgIHZhciByZXN1bHQgPSAkZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHByb3RvLCBuYW1lKTtcbiAgICAgIGlmIChyZXN1bHQpXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICBwcm90byA9ICRnZXRQcm90b3R5cGVPZihwcm90byk7XG4gICAgfSB3aGlsZSAocHJvdG8pO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gc3VwZXJDb25zdHJ1Y3RvcihjdG9yKSB7XG4gICAgcmV0dXJuIGN0b3IuX19wcm90b19fO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyQ2FsbChzZWxmLCBob21lT2JqZWN0LCBuYW1lLCBhcmdzKSB7XG4gICAgcmV0dXJuIHN1cGVyR2V0KHNlbGYsIGhvbWVPYmplY3QsIG5hbWUpLmFwcGx5KHNlbGYsIGFyZ3MpO1xuICB9XG4gIGZ1bmN0aW9uIHN1cGVyR2V0KHNlbGYsIGhvbWVPYmplY3QsIG5hbWUpIHtcbiAgICB2YXIgZGVzY3JpcHRvciA9IHN1cGVyRGVzY3JpcHRvcihob21lT2JqZWN0LCBuYW1lKTtcbiAgICBpZiAoZGVzY3JpcHRvcikge1xuICAgICAgaWYgKCFkZXNjcmlwdG9yLmdldClcbiAgICAgICAgcmV0dXJuIGRlc2NyaXB0b3IudmFsdWU7XG4gICAgICByZXR1cm4gZGVzY3JpcHRvci5nZXQuY2FsbChzZWxmKTtcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBzdXBlclNldChzZWxmLCBob21lT2JqZWN0LCBuYW1lLCB2YWx1ZSkge1xuICAgIHZhciBkZXNjcmlwdG9yID0gc3VwZXJEZXNjcmlwdG9yKGhvbWVPYmplY3QsIG5hbWUpO1xuICAgIGlmIChkZXNjcmlwdG9yICYmIGRlc2NyaXB0b3Iuc2V0KSB7XG4gICAgICBkZXNjcmlwdG9yLnNldC5jYWxsKHNlbGYsIHZhbHVlKTtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgdGhyb3cgJFR5cGVFcnJvcigoXCJzdXBlciBoYXMgbm8gc2V0dGVyICdcIiArIG5hbWUgKyBcIicuXCIpKTtcbiAgfVxuICBmdW5jdGlvbiBnZXREZXNjcmlwdG9ycyhvYmplY3QpIHtcbiAgICB2YXIgZGVzY3JpcHRvcnMgPSB7fTtcbiAgICB2YXIgbmFtZXMgPSBnZXRPd25Qcm9wZXJ0eU5hbWVzKG9iamVjdCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgIGRlc2NyaXB0b3JzW25hbWVdID0gJGdldE93blByb3BlcnR5RGVzY3JpcHRvcihvYmplY3QsIG5hbWUpO1xuICAgIH1cbiAgICB2YXIgc3ltYm9scyA9IGdldE93blByb3BlcnR5U3ltYm9scyhvYmplY3QpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3ltYm9scy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHN5bWJvbCA9IHN5bWJvbHNbaV07XG4gICAgICBkZXNjcmlwdG9yc1skdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShzeW1ib2wpXSA9ICRnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqZWN0LCAkdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShzeW1ib2wpKTtcbiAgICB9XG4gICAgcmV0dXJuIGRlc2NyaXB0b3JzO1xuICB9XG4gIGZ1bmN0aW9uIGNyZWF0ZUNsYXNzKGN0b3IsIG9iamVjdCwgc3RhdGljT2JqZWN0LCBzdXBlckNsYXNzKSB7XG4gICAgJGRlZmluZVByb3BlcnR5KG9iamVjdCwgJ2NvbnN0cnVjdG9yJywge1xuICAgICAgdmFsdWU6IGN0b3IsXG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAzKSB7XG4gICAgICBpZiAodHlwZW9mIHN1cGVyQ2xhc3MgPT09ICdmdW5jdGlvbicpXG4gICAgICAgIGN0b3IuX19wcm90b19fID0gc3VwZXJDbGFzcztcbiAgICAgIGN0b3IucHJvdG90eXBlID0gJGNyZWF0ZShnZXRQcm90b1BhcmVudChzdXBlckNsYXNzKSwgZ2V0RGVzY3JpcHRvcnMob2JqZWN0KSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGN0b3IucHJvdG90eXBlID0gb2JqZWN0O1xuICAgIH1cbiAgICAkZGVmaW5lUHJvcGVydHkoY3RvciwgJ3Byb3RvdHlwZScsIHtcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICB3cml0YWJsZTogZmFsc2VcbiAgICB9KTtcbiAgICByZXR1cm4gJGRlZmluZVByb3BlcnRpZXMoY3RvciwgZ2V0RGVzY3JpcHRvcnMoc3RhdGljT2JqZWN0KSk7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0UHJvdG9QYXJlbnQoc3VwZXJDbGFzcykge1xuICAgIGlmICh0eXBlb2Ygc3VwZXJDbGFzcyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgdmFyIHByb3RvdHlwZSA9IHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuICAgICAgaWYgKCRPYmplY3QocHJvdG90eXBlKSA9PT0gcHJvdG90eXBlIHx8IHByb3RvdHlwZSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuIHN1cGVyQ2xhc3MucHJvdG90eXBlO1xuICAgICAgdGhyb3cgbmV3ICRUeXBlRXJyb3IoJ3N1cGVyIHByb3RvdHlwZSBtdXN0IGJlIGFuIE9iamVjdCBvciBudWxsJyk7XG4gICAgfVxuICAgIGlmIChzdXBlckNsYXNzID09PSBudWxsKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgdGhyb3cgbmV3ICRUeXBlRXJyb3IoKFwiU3VwZXIgZXhwcmVzc2lvbiBtdXN0IGVpdGhlciBiZSBudWxsIG9yIGEgZnVuY3Rpb24sIG5vdCBcIiArIHR5cGVvZiBzdXBlckNsYXNzICsgXCIuXCIpKTtcbiAgfVxuICBmdW5jdGlvbiBkZWZhdWx0U3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsIGFyZ3MpIHtcbiAgICBpZiAoJGdldFByb3RvdHlwZU9mKGhvbWVPYmplY3QpICE9PSBudWxsKVxuICAgICAgc3VwZXJDYWxsKHNlbGYsIGhvbWVPYmplY3QsICdjb25zdHJ1Y3RvcicsIGFyZ3MpO1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcyA9IGNyZWF0ZUNsYXNzO1xuICAkdHJhY2V1clJ1bnRpbWUuZGVmYXVsdFN1cGVyQ2FsbCA9IGRlZmF1bHRTdXBlckNhbGw7XG4gICR0cmFjZXVyUnVudGltZS5zdXBlckNhbGwgPSBzdXBlckNhbGw7XG4gICR0cmFjZXVyUnVudGltZS5zdXBlckNvbnN0cnVjdG9yID0gc3VwZXJDb25zdHJ1Y3RvcjtcbiAgJHRyYWNldXJSdW50aW1lLnN1cGVyR2V0ID0gc3VwZXJHZXQ7XG4gICR0cmFjZXVyUnVudGltZS5zdXBlclNldCA9IHN1cGVyU2V0O1xufSkoKTtcbihmdW5jdGlvbigpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBpZiAodHlwZW9mICR0cmFjZXVyUnVudGltZSAhPT0gJ29iamVjdCcpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3RyYWNldXIgcnVudGltZSBub3QgZm91bmQuJyk7XG4gIH1cbiAgdmFyIGNyZWF0ZVByaXZhdGVOYW1lID0gJHRyYWNldXJSdW50aW1lLmNyZWF0ZVByaXZhdGVOYW1lO1xuICB2YXIgJGRlZmluZVByb3BlcnRpZXMgPSAkdHJhY2V1clJ1bnRpbWUuZGVmaW5lUHJvcGVydGllcztcbiAgdmFyICRkZWZpbmVQcm9wZXJ0eSA9ICR0cmFjZXVyUnVudGltZS5kZWZpbmVQcm9wZXJ0eTtcbiAgdmFyICRjcmVhdGUgPSBPYmplY3QuY3JlYXRlO1xuICB2YXIgJFR5cGVFcnJvciA9IFR5cGVFcnJvcjtcbiAgZnVuY3Rpb24gbm9uRW51bSh2YWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfTtcbiAgfVxuICB2YXIgU1RfTkVXQk9STiA9IDA7XG4gIHZhciBTVF9FWEVDVVRJTkcgPSAxO1xuICB2YXIgU1RfU1VTUEVOREVEID0gMjtcbiAgdmFyIFNUX0NMT1NFRCA9IDM7XG4gIHZhciBFTkRfU1RBVEUgPSAtMjtcbiAgdmFyIFJFVEhST1dfU1RBVEUgPSAtMztcbiAgZnVuY3Rpb24gZ2V0SW50ZXJuYWxFcnJvcihzdGF0ZSkge1xuICAgIHJldHVybiBuZXcgRXJyb3IoJ1RyYWNldXIgY29tcGlsZXIgYnVnOiBpbnZhbGlkIHN0YXRlIGluIHN0YXRlIG1hY2hpbmU6ICcgKyBzdGF0ZSk7XG4gIH1cbiAgZnVuY3Rpb24gR2VuZXJhdG9yQ29udGV4dCgpIHtcbiAgICB0aGlzLnN0YXRlID0gMDtcbiAgICB0aGlzLkdTdGF0ZSA9IFNUX05FV0JPUk47XG4gICAgdGhpcy5zdG9yZWRFeGNlcHRpb24gPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5maW5hbGx5RmFsbFRocm91Z2ggPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5zZW50XyA9IHVuZGVmaW5lZDtcbiAgICB0aGlzLnJldHVyblZhbHVlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMudHJ5U3RhY2tfID0gW107XG4gIH1cbiAgR2VuZXJhdG9yQ29udGV4dC5wcm90b3R5cGUgPSB7XG4gICAgcHVzaFRyeTogZnVuY3Rpb24oY2F0Y2hTdGF0ZSwgZmluYWxseVN0YXRlKSB7XG4gICAgICBpZiAoZmluYWxseVN0YXRlICE9PSBudWxsKSB7XG4gICAgICAgIHZhciBmaW5hbGx5RmFsbFRocm91Z2ggPSBudWxsO1xuICAgICAgICBmb3IgKHZhciBpID0gdGhpcy50cnlTdGFja18ubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICBpZiAodGhpcy50cnlTdGFja19baV0uY2F0Y2ggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZmluYWxseUZhbGxUaHJvdWdoID0gdGhpcy50cnlTdGFja19baV0uY2F0Y2g7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGZpbmFsbHlGYWxsVGhyb3VnaCA9PT0gbnVsbClcbiAgICAgICAgICBmaW5hbGx5RmFsbFRocm91Z2ggPSBSRVRIUk9XX1NUQVRFO1xuICAgICAgICB0aGlzLnRyeVN0YWNrXy5wdXNoKHtcbiAgICAgICAgICBmaW5hbGx5OiBmaW5hbGx5U3RhdGUsXG4gICAgICAgICAgZmluYWxseUZhbGxUaHJvdWdoOiBmaW5hbGx5RmFsbFRocm91Z2hcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBpZiAoY2F0Y2hTdGF0ZSAhPT0gbnVsbCkge1xuICAgICAgICB0aGlzLnRyeVN0YWNrXy5wdXNoKHtjYXRjaDogY2F0Y2hTdGF0ZX0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgcG9wVHJ5OiBmdW5jdGlvbigpIHtcbiAgICAgIHRoaXMudHJ5U3RhY2tfLnBvcCgpO1xuICAgIH0sXG4gICAgZ2V0IHNlbnQoKSB7XG4gICAgICB0aGlzLm1heWJlVGhyb3coKTtcbiAgICAgIHJldHVybiB0aGlzLnNlbnRfO1xuICAgIH0sXG4gICAgc2V0IHNlbnQodikge1xuICAgICAgdGhpcy5zZW50XyA9IHY7XG4gICAgfSxcbiAgICBnZXQgc2VudElnbm9yZVRocm93KCkge1xuICAgICAgcmV0dXJuIHRoaXMuc2VudF87XG4gICAgfSxcbiAgICBtYXliZVRocm93OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLmFjdGlvbiA9PT0gJ3Rocm93Jykge1xuICAgICAgICB0aGlzLmFjdGlvbiA9ICduZXh0JztcbiAgICAgICAgdGhyb3cgdGhpcy5zZW50XztcbiAgICAgIH1cbiAgICB9LFxuICAgIGVuZDogZnVuY3Rpb24oKSB7XG4gICAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgICAgY2FzZSBFTkRfU1RBVEU6XG4gICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIGNhc2UgUkVUSFJPV19TVEFURTpcbiAgICAgICAgICB0aHJvdyB0aGlzLnN0b3JlZEV4Y2VwdGlvbjtcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICB0aHJvdyBnZXRJbnRlcm5hbEVycm9yKHRoaXMuc3RhdGUpO1xuICAgICAgfVxuICAgIH0sXG4gICAgaGFuZGxlRXhjZXB0aW9uOiBmdW5jdGlvbihleCkge1xuICAgICAgdGhpcy5HU3RhdGUgPSBTVF9DTE9TRUQ7XG4gICAgICB0aGlzLnN0YXRlID0gRU5EX1NUQVRFO1xuICAgICAgdGhyb3cgZXg7XG4gICAgfVxuICB9O1xuICBmdW5jdGlvbiBuZXh0T3JUaHJvdyhjdHgsIG1vdmVOZXh0LCBhY3Rpb24sIHgpIHtcbiAgICBzd2l0Y2ggKGN0eC5HU3RhdGUpIHtcbiAgICAgIGNhc2UgU1RfRVhFQ1VUSU5HOlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoKFwiXFxcIlwiICsgYWN0aW9uICsgXCJcXFwiIG9uIGV4ZWN1dGluZyBnZW5lcmF0b3JcIikpO1xuICAgICAgY2FzZSBTVF9DTE9TRUQ6XG4gICAgICAgIGlmIChhY3Rpb24gPT0gJ25leHQnKSB7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZhbHVlOiB1bmRlZmluZWQsXG4gICAgICAgICAgICBkb25lOiB0cnVlXG4gICAgICAgICAgfTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyB4O1xuICAgICAgY2FzZSBTVF9ORVdCT1JOOlxuICAgICAgICBpZiAoYWN0aW9uID09PSAndGhyb3cnKSB7XG4gICAgICAgICAgY3R4LkdTdGF0ZSA9IFNUX0NMT1NFRDtcbiAgICAgICAgICB0aHJvdyB4O1xuICAgICAgICB9XG4gICAgICAgIGlmICh4ICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgdGhyb3cgJFR5cGVFcnJvcignU2VudCB2YWx1ZSB0byBuZXdib3JuIGdlbmVyYXRvcicpO1xuICAgICAgY2FzZSBTVF9TVVNQRU5ERUQ6XG4gICAgICAgIGN0eC5HU3RhdGUgPSBTVF9FWEVDVVRJTkc7XG4gICAgICAgIGN0eC5hY3Rpb24gPSBhY3Rpb247XG4gICAgICAgIGN0eC5zZW50ID0geDtcbiAgICAgICAgdmFyIHZhbHVlID0gbW92ZU5leHQoY3R4KTtcbiAgICAgICAgdmFyIGRvbmUgPSB2YWx1ZSA9PT0gY3R4O1xuICAgICAgICBpZiAoZG9uZSlcbiAgICAgICAgICB2YWx1ZSA9IGN0eC5yZXR1cm5WYWx1ZTtcbiAgICAgICAgY3R4LkdTdGF0ZSA9IGRvbmUgPyBTVF9DTE9TRUQgOiBTVF9TVVNQRU5ERUQ7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgIGRvbmU6IGRvbmVcbiAgICAgICAgfTtcbiAgICB9XG4gIH1cbiAgdmFyIGN0eE5hbWUgPSBjcmVhdGVQcml2YXRlTmFtZSgpO1xuICB2YXIgbW92ZU5leHROYW1lID0gY3JlYXRlUHJpdmF0ZU5hbWUoKTtcbiAgZnVuY3Rpb24gR2VuZXJhdG9yRnVuY3Rpb24oKSB7fVxuICBmdW5jdGlvbiBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSgpIHt9XG4gIEdlbmVyYXRvckZ1bmN0aW9uLnByb3RvdHlwZSA9IEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlO1xuICAkZGVmaW5lUHJvcGVydHkoR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUsICdjb25zdHJ1Y3RvcicsIG5vbkVudW0oR2VuZXJhdG9yRnVuY3Rpb24pKTtcbiAgR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUucHJvdG90eXBlID0ge1xuICAgIGNvbnN0cnVjdG9yOiBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZSxcbiAgICBuZXh0OiBmdW5jdGlvbih2KSB7XG4gICAgICByZXR1cm4gbmV4dE9yVGhyb3codGhpc1tjdHhOYW1lXSwgdGhpc1ttb3ZlTmV4dE5hbWVdLCAnbmV4dCcsIHYpO1xuICAgIH0sXG4gICAgdGhyb3c6IGZ1bmN0aW9uKHYpIHtcbiAgICAgIHJldHVybiBuZXh0T3JUaHJvdyh0aGlzW2N0eE5hbWVdLCB0aGlzW21vdmVOZXh0TmFtZV0sICd0aHJvdycsIHYpO1xuICAgIH1cbiAgfTtcbiAgJGRlZmluZVByb3BlcnRpZXMoR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUucHJvdG90eXBlLCB7XG4gICAgY29uc3RydWN0b3I6IHtlbnVtZXJhYmxlOiBmYWxzZX0sXG4gICAgbmV4dDoge2VudW1lcmFibGU6IGZhbHNlfSxcbiAgICB0aHJvdzoge2VudW1lcmFibGU6IGZhbHNlfVxuICB9KTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEdlbmVyYXRvckZ1bmN0aW9uUHJvdG90eXBlLnByb3RvdHlwZSwgU3ltYm9sLml0ZXJhdG9yLCBub25FbnVtKGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9KSk7XG4gIGZ1bmN0aW9uIGNyZWF0ZUdlbmVyYXRvckluc3RhbmNlKGlubmVyRnVuY3Rpb24sIGZ1bmN0aW9uT2JqZWN0LCBzZWxmKSB7XG4gICAgdmFyIG1vdmVOZXh0ID0gZ2V0TW92ZU5leHQoaW5uZXJGdW5jdGlvbiwgc2VsZik7XG4gICAgdmFyIGN0eCA9IG5ldyBHZW5lcmF0b3JDb250ZXh0KCk7XG4gICAgdmFyIG9iamVjdCA9ICRjcmVhdGUoZnVuY3Rpb25PYmplY3QucHJvdG90eXBlKTtcbiAgICBvYmplY3RbY3R4TmFtZV0gPSBjdHg7XG4gICAgb2JqZWN0W21vdmVOZXh0TmFtZV0gPSBtb3ZlTmV4dDtcbiAgICByZXR1cm4gb2JqZWN0O1xuICB9XG4gIGZ1bmN0aW9uIGluaXRHZW5lcmF0b3JGdW5jdGlvbihmdW5jdGlvbk9iamVjdCkge1xuICAgIGZ1bmN0aW9uT2JqZWN0LnByb3RvdHlwZSA9ICRjcmVhdGUoR2VuZXJhdG9yRnVuY3Rpb25Qcm90b3R5cGUucHJvdG90eXBlKTtcbiAgICBmdW5jdGlvbk9iamVjdC5fX3Byb3RvX18gPSBHZW5lcmF0b3JGdW5jdGlvblByb3RvdHlwZTtcbiAgICByZXR1cm4gZnVuY3Rpb25PYmplY3Q7XG4gIH1cbiAgZnVuY3Rpb24gQXN5bmNGdW5jdGlvbkNvbnRleHQoKSB7XG4gICAgR2VuZXJhdG9yQ29udGV4dC5jYWxsKHRoaXMpO1xuICAgIHRoaXMuZXJyID0gdW5kZWZpbmVkO1xuICAgIHZhciBjdHggPSB0aGlzO1xuICAgIGN0eC5yZXN1bHQgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgIGN0eC5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIGN0eC5yZWplY3QgPSByZWplY3Q7XG4gICAgfSk7XG4gIH1cbiAgQXN5bmNGdW5jdGlvbkNvbnRleHQucHJvdG90eXBlID0gJGNyZWF0ZShHZW5lcmF0b3JDb250ZXh0LnByb3RvdHlwZSk7XG4gIEFzeW5jRnVuY3Rpb25Db250ZXh0LnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbigpIHtcbiAgICBzd2l0Y2ggKHRoaXMuc3RhdGUpIHtcbiAgICAgIGNhc2UgRU5EX1NUQVRFOlxuICAgICAgICB0aGlzLnJlc29sdmUodGhpcy5yZXR1cm5WYWx1ZSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBSRVRIUk9XX1NUQVRFOlxuICAgICAgICB0aGlzLnJlamVjdCh0aGlzLnN0b3JlZEV4Y2VwdGlvbik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhpcy5yZWplY3QoZ2V0SW50ZXJuYWxFcnJvcih0aGlzLnN0YXRlKSk7XG4gICAgfVxuICB9O1xuICBBc3luY0Z1bmN0aW9uQ29udGV4dC5wcm90b3R5cGUuaGFuZGxlRXhjZXB0aW9uID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zdGF0ZSA9IFJFVEhST1dfU1RBVEU7XG4gIH07XG4gIGZ1bmN0aW9uIGFzeW5jV3JhcChpbm5lckZ1bmN0aW9uLCBzZWxmKSB7XG4gICAgdmFyIG1vdmVOZXh0ID0gZ2V0TW92ZU5leHQoaW5uZXJGdW5jdGlvbiwgc2VsZik7XG4gICAgdmFyIGN0eCA9IG5ldyBBc3luY0Z1bmN0aW9uQ29udGV4dCgpO1xuICAgIGN0eC5jcmVhdGVDYWxsYmFjayA9IGZ1bmN0aW9uKG5ld1N0YXRlKSB7XG4gICAgICByZXR1cm4gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgY3R4LnN0YXRlID0gbmV3U3RhdGU7XG4gICAgICAgIGN0eC52YWx1ZSA9IHZhbHVlO1xuICAgICAgICBtb3ZlTmV4dChjdHgpO1xuICAgICAgfTtcbiAgICB9O1xuICAgIGN0eC5lcnJiYWNrID0gZnVuY3Rpb24oZXJyKSB7XG4gICAgICBoYW5kbGVDYXRjaChjdHgsIGVycik7XG4gICAgICBtb3ZlTmV4dChjdHgpO1xuICAgIH07XG4gICAgbW92ZU5leHQoY3R4KTtcbiAgICByZXR1cm4gY3R4LnJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBnZXRNb3ZlTmV4dChpbm5lckZ1bmN0aW9uLCBzZWxmKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKGN0eCkge1xuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gaW5uZXJGdW5jdGlvbi5jYWxsKHNlbGYsIGN0eCk7XG4gICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgaGFuZGxlQ2F0Y2goY3R4LCBleCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIGhhbmRsZUNhdGNoKGN0eCwgZXgpIHtcbiAgICBjdHguc3RvcmVkRXhjZXB0aW9uID0gZXg7XG4gICAgdmFyIGxhc3QgPSBjdHgudHJ5U3RhY2tfW2N0eC50cnlTdGFja18ubGVuZ3RoIC0gMV07XG4gICAgaWYgKCFsYXN0KSB7XG4gICAgICBjdHguaGFuZGxlRXhjZXB0aW9uKGV4KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY3R4LnN0YXRlID0gbGFzdC5jYXRjaCAhPT0gdW5kZWZpbmVkID8gbGFzdC5jYXRjaCA6IGxhc3QuZmluYWxseTtcbiAgICBpZiAobGFzdC5maW5hbGx5RmFsbFRocm91Z2ggIT09IHVuZGVmaW5lZClcbiAgICAgIGN0eC5maW5hbGx5RmFsbFRocm91Z2ggPSBsYXN0LmZpbmFsbHlGYWxsVGhyb3VnaDtcbiAgfVxuICAkdHJhY2V1clJ1bnRpbWUuYXN5bmNXcmFwID0gYXN5bmNXcmFwO1xuICAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uID0gaW5pdEdlbmVyYXRvckZ1bmN0aW9uO1xuICAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UgPSBjcmVhdGVHZW5lcmF0b3JJbnN0YW5jZTtcbn0pKCk7XG4oZnVuY3Rpb24oKSB7XG4gIGZ1bmN0aW9uIGJ1aWxkRnJvbUVuY29kZWRQYXJ0cyhvcHRfc2NoZW1lLCBvcHRfdXNlckluZm8sIG9wdF9kb21haW4sIG9wdF9wb3J0LCBvcHRfcGF0aCwgb3B0X3F1ZXJ5RGF0YSwgb3B0X2ZyYWdtZW50KSB7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIGlmIChvcHRfc2NoZW1lKSB7XG4gICAgICBvdXQucHVzaChvcHRfc2NoZW1lLCAnOicpO1xuICAgIH1cbiAgICBpZiAob3B0X2RvbWFpbikge1xuICAgICAgb3V0LnB1c2goJy8vJyk7XG4gICAgICBpZiAob3B0X3VzZXJJbmZvKSB7XG4gICAgICAgIG91dC5wdXNoKG9wdF91c2VySW5mbywgJ0AnKTtcbiAgICAgIH1cbiAgICAgIG91dC5wdXNoKG9wdF9kb21haW4pO1xuICAgICAgaWYgKG9wdF9wb3J0KSB7XG4gICAgICAgIG91dC5wdXNoKCc6Jywgb3B0X3BvcnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAob3B0X3BhdGgpIHtcbiAgICAgIG91dC5wdXNoKG9wdF9wYXRoKTtcbiAgICB9XG4gICAgaWYgKG9wdF9xdWVyeURhdGEpIHtcbiAgICAgIG91dC5wdXNoKCc/Jywgb3B0X3F1ZXJ5RGF0YSk7XG4gICAgfVxuICAgIGlmIChvcHRfZnJhZ21lbnQpIHtcbiAgICAgIG91dC5wdXNoKCcjJywgb3B0X2ZyYWdtZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIG91dC5qb2luKCcnKTtcbiAgfVxuICA7XG4gIHZhciBzcGxpdFJlID0gbmV3IFJlZ0V4cCgnXicgKyAnKD86JyArICcoW146Lz8jLl0rKScgKyAnOik/JyArICcoPzovLycgKyAnKD86KFteLz8jXSopQCk/JyArICcoW1xcXFx3XFxcXGRcXFxcLVxcXFx1MDEwMC1cXFxcdWZmZmYuJV0qKScgKyAnKD86OihbMC05XSspKT8nICsgJyk/JyArICcoW14/I10rKT8nICsgJyg/OlxcXFw/KFteI10qKSk/JyArICcoPzojKC4qKSk/JyArICckJyk7XG4gIHZhciBDb21wb25lbnRJbmRleCA9IHtcbiAgICBTQ0hFTUU6IDEsXG4gICAgVVNFUl9JTkZPOiAyLFxuICAgIERPTUFJTjogMyxcbiAgICBQT1JUOiA0LFxuICAgIFBBVEg6IDUsXG4gICAgUVVFUllfREFUQTogNixcbiAgICBGUkFHTUVOVDogN1xuICB9O1xuICBmdW5jdGlvbiBzcGxpdCh1cmkpIHtcbiAgICByZXR1cm4gKHVyaS5tYXRjaChzcGxpdFJlKSk7XG4gIH1cbiAgZnVuY3Rpb24gcmVtb3ZlRG90U2VnbWVudHMocGF0aCkge1xuICAgIGlmIChwYXRoID09PSAnLycpXG4gICAgICByZXR1cm4gJy8nO1xuICAgIHZhciBsZWFkaW5nU2xhc2ggPSBwYXRoWzBdID09PSAnLycgPyAnLycgOiAnJztcbiAgICB2YXIgdHJhaWxpbmdTbGFzaCA9IHBhdGguc2xpY2UoLTEpID09PSAnLycgPyAnLycgOiAnJztcbiAgICB2YXIgc2VnbWVudHMgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgdmFyIG91dCA9IFtdO1xuICAgIHZhciB1cCA9IDA7XG4gICAgZm9yICh2YXIgcG9zID0gMDsgcG9zIDwgc2VnbWVudHMubGVuZ3RoOyBwb3MrKykge1xuICAgICAgdmFyIHNlZ21lbnQgPSBzZWdtZW50c1twb3NdO1xuICAgICAgc3dpdGNoIChzZWdtZW50KSB7XG4gICAgICAgIGNhc2UgJyc6XG4gICAgICAgIGNhc2UgJy4nOlxuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICcuLic6XG4gICAgICAgICAgaWYgKG91dC5sZW5ndGgpXG4gICAgICAgICAgICBvdXQucG9wKCk7XG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgdXArKztcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICBvdXQucHVzaChzZWdtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFsZWFkaW5nU2xhc2gpIHtcbiAgICAgIHdoaWxlICh1cC0tID4gMCkge1xuICAgICAgICBvdXQudW5zaGlmdCgnLi4nKTtcbiAgICAgIH1cbiAgICAgIGlmIChvdXQubGVuZ3RoID09PSAwKVxuICAgICAgICBvdXQucHVzaCgnLicpO1xuICAgIH1cbiAgICByZXR1cm4gbGVhZGluZ1NsYXNoICsgb3V0LmpvaW4oJy8nKSArIHRyYWlsaW5nU2xhc2g7XG4gIH1cbiAgZnVuY3Rpb24gam9pbkFuZENhbm9uaWNhbGl6ZVBhdGgocGFydHMpIHtcbiAgICB2YXIgcGF0aCA9IHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdIHx8ICcnO1xuICAgIHBhdGggPSByZW1vdmVEb3RTZWdtZW50cyhwYXRoKTtcbiAgICBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSA9IHBhdGg7XG4gICAgcmV0dXJuIGJ1aWxkRnJvbUVuY29kZWRQYXJ0cyhwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5VU0VSX0lORk9dLCBwYXJ0c1tDb21wb25lbnRJbmRleC5ET01BSU5dLCBwYXJ0c1tDb21wb25lbnRJbmRleC5QT1JUXSwgcGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF0sIHBhcnRzW0NvbXBvbmVudEluZGV4LlFVRVJZX0RBVEFdLCBwYXJ0c1tDb21wb25lbnRJbmRleC5GUkFHTUVOVF0pO1xuICB9XG4gIGZ1bmN0aW9uIGNhbm9uaWNhbGl6ZVVybCh1cmwpIHtcbiAgICB2YXIgcGFydHMgPSBzcGxpdCh1cmwpO1xuICAgIHJldHVybiBqb2luQW5kQ2Fub25pY2FsaXplUGF0aChwYXJ0cyk7XG4gIH1cbiAgZnVuY3Rpb24gcmVzb2x2ZVVybChiYXNlLCB1cmwpIHtcbiAgICB2YXIgcGFydHMgPSBzcGxpdCh1cmwpO1xuICAgIHZhciBiYXNlUGFydHMgPSBzcGxpdChiYXNlKTtcbiAgICBpZiAocGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSkge1xuICAgICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcGFydHNbQ29tcG9uZW50SW5kZXguU0NIRU1FXSA9IGJhc2VQYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gQ29tcG9uZW50SW5kZXguU0NIRU1FOyBpIDw9IENvbXBvbmVudEluZGV4LlBPUlQ7IGkrKykge1xuICAgICAgaWYgKCFwYXJ0c1tpXSkge1xuICAgICAgICBwYXJ0c1tpXSA9IGJhc2VQYXJ0c1tpXTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHBhcnRzW0NvbXBvbmVudEluZGV4LlBBVEhdWzBdID09ICcvJykge1xuICAgICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgICB9XG4gICAgdmFyIHBhdGggPSBiYXNlUGFydHNbQ29tcG9uZW50SW5kZXguUEFUSF07XG4gICAgdmFyIGluZGV4ID0gcGF0aC5sYXN0SW5kZXhPZignLycpO1xuICAgIHBhdGggPSBwYXRoLnNsaWNlKDAsIGluZGV4ICsgMSkgKyBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXTtcbiAgICBwYXJ0c1tDb21wb25lbnRJbmRleC5QQVRIXSA9IHBhdGg7XG4gICAgcmV0dXJuIGpvaW5BbmRDYW5vbmljYWxpemVQYXRoKHBhcnRzKTtcbiAgfVxuICBmdW5jdGlvbiBpc0Fic29sdXRlKG5hbWUpIHtcbiAgICBpZiAoIW5hbWUpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG5hbWVbMF0gPT09ICcvJylcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIHZhciBwYXJ0cyA9IHNwbGl0KG5hbWUpO1xuICAgIGlmIChwYXJ0c1tDb21wb25lbnRJbmRleC5TQ0hFTUVdKVxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gICR0cmFjZXVyUnVudGltZS5jYW5vbmljYWxpemVVcmwgPSBjYW5vbmljYWxpemVVcmw7XG4gICR0cmFjZXVyUnVudGltZS5pc0Fic29sdXRlID0gaXNBYnNvbHV0ZTtcbiAgJHRyYWNldXJSdW50aW1lLnJlbW92ZURvdFNlZ21lbnRzID0gcmVtb3ZlRG90U2VnbWVudHM7XG4gICR0cmFjZXVyUnVudGltZS5yZXNvbHZlVXJsID0gcmVzb2x2ZVVybDtcbn0pKCk7XG4oZnVuY3Rpb24oKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIHR5cGVzID0ge1xuICAgIGFueToge25hbWU6ICdhbnknfSxcbiAgICBib29sZWFuOiB7bmFtZTogJ2Jvb2xlYW4nfSxcbiAgICBudW1iZXI6IHtuYW1lOiAnbnVtYmVyJ30sXG4gICAgc3RyaW5nOiB7bmFtZTogJ3N0cmluZyd9LFxuICAgIHN5bWJvbDoge25hbWU6ICdzeW1ib2wnfSxcbiAgICB2b2lkOiB7bmFtZTogJ3ZvaWQnfVxuICB9O1xuICB2YXIgR2VuZXJpY1R5cGUgPSBmdW5jdGlvbiBHZW5lcmljVHlwZSh0eXBlLCBhcmd1bWVudFR5cGVzKSB7XG4gICAgdGhpcy50eXBlID0gdHlwZTtcbiAgICB0aGlzLmFyZ3VtZW50VHlwZXMgPSBhcmd1bWVudFR5cGVzO1xuICB9O1xuICAoJHRyYWNldXJSdW50aW1lLmNyZWF0ZUNsYXNzKShHZW5lcmljVHlwZSwge30sIHt9KTtcbiAgdmFyIHR5cGVSZWdpc3RlciA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gIGZ1bmN0aW9uIGdlbmVyaWNUeXBlKHR5cGUpIHtcbiAgICBmb3IgKHZhciBhcmd1bWVudFR5cGVzID0gW10sXG4gICAgICAgICRfXzEgPSAxOyAkX18xIDwgYXJndW1lbnRzLmxlbmd0aDsgJF9fMSsrKVxuICAgICAgYXJndW1lbnRUeXBlc1skX18xIC0gMV0gPSBhcmd1bWVudHNbJF9fMV07XG4gICAgdmFyIHR5cGVNYXAgPSB0eXBlUmVnaXN0ZXI7XG4gICAgdmFyIGtleSA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25IYXNoT2JqZWN0KHR5cGUpLmhhc2g7XG4gICAgaWYgKCF0eXBlTWFwW2tleV0pIHtcbiAgICAgIHR5cGVNYXBba2V5XSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgfVxuICAgIHR5cGVNYXAgPSB0eXBlTWFwW2tleV07XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudFR5cGVzLmxlbmd0aCAtIDE7IGkrKykge1xuICAgICAga2V5ID0gJHRyYWNldXJSdW50aW1lLmdldE93bkhhc2hPYmplY3QoYXJndW1lbnRUeXBlc1tpXSkuaGFzaDtcbiAgICAgIGlmICghdHlwZU1hcFtrZXldKSB7XG4gICAgICAgIHR5cGVNYXBba2V5XSA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgICB9XG4gICAgICB0eXBlTWFwID0gdHlwZU1hcFtrZXldO1xuICAgIH1cbiAgICB2YXIgdGFpbCA9IGFyZ3VtZW50VHlwZXNbYXJndW1lbnRUeXBlcy5sZW5ndGggLSAxXTtcbiAgICBrZXkgPSAkdHJhY2V1clJ1bnRpbWUuZ2V0T3duSGFzaE9iamVjdCh0YWlsKS5oYXNoO1xuICAgIGlmICghdHlwZU1hcFtrZXldKSB7XG4gICAgICB0eXBlTWFwW2tleV0gPSBuZXcgR2VuZXJpY1R5cGUodHlwZSwgYXJndW1lbnRUeXBlcyk7XG4gICAgfVxuICAgIHJldHVybiB0eXBlTWFwW2tleV07XG4gIH1cbiAgJHRyYWNldXJSdW50aW1lLkdlbmVyaWNUeXBlID0gR2VuZXJpY1R5cGU7XG4gICR0cmFjZXVyUnVudGltZS5nZW5lcmljVHlwZSA9IGdlbmVyaWNUeXBlO1xuICAkdHJhY2V1clJ1bnRpbWUudHlwZSA9IHR5cGVzO1xufSkoKTtcbihmdW5jdGlvbihnbG9iYWwpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgJF9fMiA9ICR0cmFjZXVyUnVudGltZSxcbiAgICAgIGNhbm9uaWNhbGl6ZVVybCA9ICRfXzIuY2Fub25pY2FsaXplVXJsLFxuICAgICAgcmVzb2x2ZVVybCA9ICRfXzIucmVzb2x2ZVVybCxcbiAgICAgIGlzQWJzb2x1dGUgPSAkX18yLmlzQWJzb2x1dGU7XG4gIHZhciBtb2R1bGVJbnN0YW50aWF0b3JzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdmFyIGJhc2VVUkw7XG4gIGlmIChnbG9iYWwubG9jYXRpb24gJiYgZ2xvYmFsLmxvY2F0aW9uLmhyZWYpXG4gICAgYmFzZVVSTCA9IHJlc29sdmVVcmwoZ2xvYmFsLmxvY2F0aW9uLmhyZWYsICcuLycpO1xuICBlbHNlXG4gICAgYmFzZVVSTCA9ICcnO1xuICB2YXIgVW5jb2F0ZWRNb2R1bGVFbnRyeSA9IGZ1bmN0aW9uIFVuY29hdGVkTW9kdWxlRW50cnkodXJsLCB1bmNvYXRlZE1vZHVsZSkge1xuICAgIHRoaXMudXJsID0gdXJsO1xuICAgIHRoaXMudmFsdWVfID0gdW5jb2F0ZWRNb2R1bGU7XG4gIH07XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFVuY29hdGVkTW9kdWxlRW50cnksIHt9LCB7fSk7XG4gIHZhciBNb2R1bGVFdmFsdWF0aW9uRXJyb3IgPSBmdW5jdGlvbiBNb2R1bGVFdmFsdWF0aW9uRXJyb3IoZXJyb25lb3VzTW9kdWxlTmFtZSwgY2F1c2UpIHtcbiAgICB0aGlzLm1lc3NhZ2UgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWUgKyAnOiAnICsgdGhpcy5zdHJpcENhdXNlKGNhdXNlKSArICcgaW4gJyArIGVycm9uZW91c01vZHVsZU5hbWU7XG4gICAgaWYgKCEoY2F1c2UgaW5zdGFuY2VvZiAkTW9kdWxlRXZhbHVhdGlvbkVycm9yKSAmJiBjYXVzZS5zdGFjaylcbiAgICAgIHRoaXMuc3RhY2sgPSB0aGlzLnN0cmlwU3RhY2soY2F1c2Uuc3RhY2spO1xuICAgIGVsc2VcbiAgICAgIHRoaXMuc3RhY2sgPSAnJztcbiAgfTtcbiAgdmFyICRNb2R1bGVFdmFsdWF0aW9uRXJyb3IgPSBNb2R1bGVFdmFsdWF0aW9uRXJyb3I7XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKE1vZHVsZUV2YWx1YXRpb25FcnJvciwge1xuICAgIHN0cmlwRXJyb3I6IGZ1bmN0aW9uKG1lc3NhZ2UpIHtcbiAgICAgIHJldHVybiBtZXNzYWdlLnJlcGxhY2UoLy4qRXJyb3I6LywgdGhpcy5jb25zdHJ1Y3Rvci5uYW1lICsgJzonKTtcbiAgICB9LFxuICAgIHN0cmlwQ2F1c2U6IGZ1bmN0aW9uKGNhdXNlKSB7XG4gICAgICBpZiAoIWNhdXNlKVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgICBpZiAoIWNhdXNlLm1lc3NhZ2UpXG4gICAgICAgIHJldHVybiBjYXVzZSArICcnO1xuICAgICAgcmV0dXJuIHRoaXMuc3RyaXBFcnJvcihjYXVzZS5tZXNzYWdlKTtcbiAgICB9LFxuICAgIGxvYWRlZEJ5OiBmdW5jdGlvbihtb2R1bGVOYW1lKSB7XG4gICAgICB0aGlzLnN0YWNrICs9ICdcXG4gbG9hZGVkIGJ5ICcgKyBtb2R1bGVOYW1lO1xuICAgIH0sXG4gICAgc3RyaXBTdGFjazogZnVuY3Rpb24oY2F1c2VTdGFjaykge1xuICAgICAgdmFyIHN0YWNrID0gW107XG4gICAgICBjYXVzZVN0YWNrLnNwbGl0KCdcXG4nKS5zb21lKChmdW5jdGlvbihmcmFtZSkge1xuICAgICAgICBpZiAoL1VuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yLy50ZXN0KGZyYW1lKSlcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgc3RhY2sucHVzaChmcmFtZSk7XG4gICAgICB9KSk7XG4gICAgICBzdGFja1swXSA9IHRoaXMuc3RyaXBFcnJvcihzdGFja1swXSk7XG4gICAgICByZXR1cm4gc3RhY2suam9pbignXFxuJyk7XG4gICAgfVxuICB9LCB7fSwgRXJyb3IpO1xuICBmdW5jdGlvbiBiZWZvcmVMaW5lcyhsaW5lcywgbnVtYmVyKSB7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIHZhciBmaXJzdCA9IG51bWJlciAtIDM7XG4gICAgaWYgKGZpcnN0IDwgMClcbiAgICAgIGZpcnN0ID0gMDtcbiAgICBmb3IgKHZhciBpID0gZmlyc3Q7IGkgPCBudW1iZXI7IGkrKykge1xuICAgICAgcmVzdWx0LnB1c2gobGluZXNbaV0pO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIGFmdGVyTGluZXMobGluZXMsIG51bWJlcikge1xuICAgIHZhciBsYXN0ID0gbnVtYmVyICsgMTtcbiAgICBpZiAobGFzdCA+IGxpbmVzLmxlbmd0aCAtIDEpXG4gICAgICBsYXN0ID0gbGluZXMubGVuZ3RoIC0gMTtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IG51bWJlcjsgaSA8PSBsYXN0OyBpKyspIHtcbiAgICAgIHJlc3VsdC5wdXNoKGxpbmVzW2ldKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuICBmdW5jdGlvbiBjb2x1bW5TcGFjaW5nKGNvbHVtbnMpIHtcbiAgICB2YXIgcmVzdWx0ID0gJyc7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjb2x1bW5zIC0gMTsgaSsrKSB7XG4gICAgICByZXN1bHQgKz0gJy0nO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIHZhciBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvciA9IGZ1bmN0aW9uIFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKHVybCwgZnVuYykge1xuICAgICR0cmFjZXVyUnVudGltZS5zdXBlckNvbnN0cnVjdG9yKCRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcikuY2FsbCh0aGlzLCB1cmwsIG51bGwpO1xuICAgIHRoaXMuZnVuYyA9IGZ1bmM7XG4gIH07XG4gIHZhciAkVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IgPSBVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcjtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoVW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IsIHtnZXRVbmNvYXRlZE1vZHVsZTogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy52YWx1ZV8pXG4gICAgICAgIHJldHVybiB0aGlzLnZhbHVlXztcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciByZWxhdGl2ZVJlcXVpcmU7XG4gICAgICAgIGlmICh0eXBlb2YgJHRyYWNldXJSdW50aW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICByZWxhdGl2ZVJlcXVpcmUgPSAkdHJhY2V1clJ1bnRpbWUucmVxdWlyZS5iaW5kKG51bGwsIHRoaXMudXJsKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZV8gPSB0aGlzLmZ1bmMuY2FsbChnbG9iYWwsIHJlbGF0aXZlUmVxdWlyZSk7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBpZiAoZXggaW5zdGFuY2VvZiBNb2R1bGVFdmFsdWF0aW9uRXJyb3IpIHtcbiAgICAgICAgICBleC5sb2FkZWRCeSh0aGlzLnVybCk7XG4gICAgICAgICAgdGhyb3cgZXg7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGV4LnN0YWNrKSB7XG4gICAgICAgICAgdmFyIGxpbmVzID0gdGhpcy5mdW5jLnRvU3RyaW5nKCkuc3BsaXQoJ1xcbicpO1xuICAgICAgICAgIHZhciBldmFsZWQgPSBbXTtcbiAgICAgICAgICBleC5zdGFjay5zcGxpdCgnXFxuJykuc29tZShmdW5jdGlvbihmcmFtZSkge1xuICAgICAgICAgICAgaWYgKGZyYW1lLmluZGV4T2YoJ1VuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yLmdldFVuY29hdGVkTW9kdWxlJykgPiAwKVxuICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIHZhciBtID0gLyhhdFxcc1teXFxzXSpcXHMpLio+OihcXGQqKTooXFxkKilcXCkvLmV4ZWMoZnJhbWUpO1xuICAgICAgICAgICAgaWYgKG0pIHtcbiAgICAgICAgICAgICAgdmFyIGxpbmUgPSBwYXJzZUludChtWzJdLCAxMCk7XG4gICAgICAgICAgICAgIGV2YWxlZCA9IGV2YWxlZC5jb25jYXQoYmVmb3JlTGluZXMobGluZXMsIGxpbmUpKTtcbiAgICAgICAgICAgICAgZXZhbGVkLnB1c2goY29sdW1uU3BhY2luZyhtWzNdKSArICdeJyk7XG4gICAgICAgICAgICAgIGV2YWxlZCA9IGV2YWxlZC5jb25jYXQoYWZ0ZXJMaW5lcyhsaW5lcywgbGluZSkpO1xuICAgICAgICAgICAgICBldmFsZWQucHVzaCgnPSA9ID0gPSA9ID0gPSA9ID0nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGV2YWxlZC5wdXNoKGZyYW1lKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBleC5zdGFjayA9IGV2YWxlZC5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgICB0aHJvdyBuZXcgTW9kdWxlRXZhbHVhdGlvbkVycm9yKHRoaXMudXJsLCBleCk7XG4gICAgICB9XG4gICAgfX0sIHt9LCBVbmNvYXRlZE1vZHVsZUVudHJ5KTtcbiAgZnVuY3Rpb24gZ2V0VW5jb2F0ZWRNb2R1bGVJbnN0YW50aWF0b3IobmFtZSkge1xuICAgIGlmICghbmFtZSlcbiAgICAgIHJldHVybjtcbiAgICB2YXIgdXJsID0gTW9kdWxlU3RvcmUubm9ybWFsaXplKG5hbWUpO1xuICAgIHJldHVybiBtb2R1bGVJbnN0YW50aWF0b3JzW3VybF07XG4gIH1cbiAgO1xuICB2YXIgbW9kdWxlSW5zdGFuY2VzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgdmFyIGxpdmVNb2R1bGVTZW50aW5lbCA9IHt9O1xuICBmdW5jdGlvbiBNb2R1bGUodW5jb2F0ZWRNb2R1bGUpIHtcbiAgICB2YXIgaXNMaXZlID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciBjb2F0ZWRNb2R1bGUgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHVuY29hdGVkTW9kdWxlKS5mb3JFYWNoKChmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgZ2V0dGVyLFxuICAgICAgICAgIHZhbHVlO1xuICAgICAgaWYgKGlzTGl2ZSA9PT0gbGl2ZU1vZHVsZVNlbnRpbmVsKSB7XG4gICAgICAgIHZhciBkZXNjciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodW5jb2F0ZWRNb2R1bGUsIG5hbWUpO1xuICAgICAgICBpZiAoZGVzY3IuZ2V0KVxuICAgICAgICAgIGdldHRlciA9IGRlc2NyLmdldDtcbiAgICAgIH1cbiAgICAgIGlmICghZ2V0dGVyKSB7XG4gICAgICAgIHZhbHVlID0gdW5jb2F0ZWRNb2R1bGVbbmFtZV07XG4gICAgICAgIGdldHRlciA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb2F0ZWRNb2R1bGUsIG5hbWUsIHtcbiAgICAgICAgZ2V0OiBnZXR0ZXIsXG4gICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgIH0pO1xuICAgIH0pKTtcbiAgICBPYmplY3QucHJldmVudEV4dGVuc2lvbnMoY29hdGVkTW9kdWxlKTtcbiAgICByZXR1cm4gY29hdGVkTW9kdWxlO1xuICB9XG4gIHZhciBNb2R1bGVTdG9yZSA9IHtcbiAgICBub3JtYWxpemU6IGZ1bmN0aW9uKG5hbWUsIHJlZmVyZXJOYW1lLCByZWZlcmVyQWRkcmVzcykge1xuICAgICAgaWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJylcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbW9kdWxlIG5hbWUgbXVzdCBiZSBhIHN0cmluZywgbm90ICcgKyB0eXBlb2YgbmFtZSk7XG4gICAgICBpZiAoaXNBYnNvbHV0ZShuYW1lKSlcbiAgICAgICAgcmV0dXJuIGNhbm9uaWNhbGl6ZVVybChuYW1lKTtcbiAgICAgIGlmICgvW15cXC5dXFwvXFwuXFwuXFwvLy50ZXN0KG5hbWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignbW9kdWxlIG5hbWUgZW1iZWRzIC8uLi86ICcgKyBuYW1lKTtcbiAgICAgIH1cbiAgICAgIGlmIChuYW1lWzBdID09PSAnLicgJiYgcmVmZXJlck5hbWUpXG4gICAgICAgIHJldHVybiByZXNvbHZlVXJsKHJlZmVyZXJOYW1lLCBuYW1lKTtcbiAgICAgIHJldHVybiBjYW5vbmljYWxpemVVcmwobmFtZSk7XG4gICAgfSxcbiAgICBnZXQ6IGZ1bmN0aW9uKG5vcm1hbGl6ZWROYW1lKSB7XG4gICAgICB2YXIgbSA9IGdldFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5vcm1hbGl6ZWROYW1lKTtcbiAgICAgIGlmICghbSlcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIHZhciBtb2R1bGVJbnN0YW5jZSA9IG1vZHVsZUluc3RhbmNlc1ttLnVybF07XG4gICAgICBpZiAobW9kdWxlSW5zdGFuY2UpXG4gICAgICAgIHJldHVybiBtb2R1bGVJbnN0YW5jZTtcbiAgICAgIG1vZHVsZUluc3RhbmNlID0gTW9kdWxlKG0uZ2V0VW5jb2F0ZWRNb2R1bGUoKSwgbGl2ZU1vZHVsZVNlbnRpbmVsKTtcbiAgICAgIHJldHVybiBtb2R1bGVJbnN0YW5jZXNbbS51cmxdID0gbW9kdWxlSW5zdGFuY2U7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKG5vcm1hbGl6ZWROYW1lLCBtb2R1bGUpIHtcbiAgICAgIG5vcm1hbGl6ZWROYW1lID0gU3RyaW5nKG5vcm1hbGl6ZWROYW1lKTtcbiAgICAgIG1vZHVsZUluc3RhbnRpYXRvcnNbbm9ybWFsaXplZE5hbWVdID0gbmV3IFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5vcm1hbGl6ZWROYW1lLCAoZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2R1bGU7XG4gICAgICB9KSk7XG4gICAgICBtb2R1bGVJbnN0YW5jZXNbbm9ybWFsaXplZE5hbWVdID0gbW9kdWxlO1xuICAgIH0sXG4gICAgZ2V0IGJhc2VVUkwoKSB7XG4gICAgICByZXR1cm4gYmFzZVVSTDtcbiAgICB9LFxuICAgIHNldCBiYXNlVVJMKHYpIHtcbiAgICAgIGJhc2VVUkwgPSBTdHJpbmcodik7XG4gICAgfSxcbiAgICByZWdpc3Rlck1vZHVsZTogZnVuY3Rpb24obmFtZSwgZGVwcywgZnVuYykge1xuICAgICAgdmFyIG5vcm1hbGl6ZWROYW1lID0gTW9kdWxlU3RvcmUubm9ybWFsaXplKG5hbWUpO1xuICAgICAgaWYgKG1vZHVsZUluc3RhbnRpYXRvcnNbbm9ybWFsaXplZE5hbWVdKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2R1cGxpY2F0ZSBtb2R1bGUgbmFtZWQgJyArIG5vcm1hbGl6ZWROYW1lKTtcbiAgICAgIG1vZHVsZUluc3RhbnRpYXRvcnNbbm9ybWFsaXplZE5hbWVdID0gbmV3IFVuY29hdGVkTW9kdWxlSW5zdGFudGlhdG9yKG5vcm1hbGl6ZWROYW1lLCBmdW5jKTtcbiAgICB9LFxuICAgIGJ1bmRsZVN0b3JlOiBPYmplY3QuY3JlYXRlKG51bGwpLFxuICAgIHJlZ2lzdGVyOiBmdW5jdGlvbihuYW1lLCBkZXBzLCBmdW5jKSB7XG4gICAgICBpZiAoIWRlcHMgfHwgIWRlcHMubGVuZ3RoICYmICFmdW5jLmxlbmd0aCkge1xuICAgICAgICB0aGlzLnJlZ2lzdGVyTW9kdWxlKG5hbWUsIGRlcHMsIGZ1bmMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5idW5kbGVTdG9yZVtuYW1lXSA9IHtcbiAgICAgICAgICBkZXBzOiBkZXBzLFxuICAgICAgICAgIGV4ZWN1dGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyICRfXzAgPSBhcmd1bWVudHM7XG4gICAgICAgICAgICB2YXIgZGVwTWFwID0ge307XG4gICAgICAgICAgICBkZXBzLmZvckVhY2goKGZ1bmN0aW9uKGRlcCwgaW5kZXgpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGRlcE1hcFtkZXBdID0gJF9fMFtpbmRleF07XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB2YXIgcmVnaXN0cnlFbnRyeSA9IGZ1bmMuY2FsbCh0aGlzLCBkZXBNYXApO1xuICAgICAgICAgICAgcmVnaXN0cnlFbnRyeS5leGVjdXRlLmNhbGwodGhpcyk7XG4gICAgICAgICAgICByZXR1cm4gcmVnaXN0cnlFbnRyeS5leHBvcnRzO1xuICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGdldEFub255bW91c01vZHVsZTogZnVuY3Rpb24oZnVuYykge1xuICAgICAgcmV0dXJuIG5ldyBNb2R1bGUoZnVuYy5jYWxsKGdsb2JhbCksIGxpdmVNb2R1bGVTZW50aW5lbCk7XG4gICAgfSxcbiAgICBnZXRGb3JUZXN0aW5nOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgICB2YXIgJF9fMCA9IHRoaXM7XG4gICAgICBpZiAoIXRoaXMudGVzdGluZ1ByZWZpeF8pIHtcbiAgICAgICAgT2JqZWN0LmtleXMobW9kdWxlSW5zdGFuY2VzKS5zb21lKChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICB2YXIgbSA9IC8odHJhY2V1ckBbXlxcL10qXFwvKS8uZXhlYyhrZXkpO1xuICAgICAgICAgIGlmIChtKSB7XG4gICAgICAgICAgICAkX18wLnRlc3RpbmdQcmVmaXhfID0gbVsxXTtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuZ2V0KHRoaXMudGVzdGluZ1ByZWZpeF8gKyBuYW1lKTtcbiAgICB9XG4gIH07XG4gIHZhciBtb2R1bGVTdG9yZU1vZHVsZSA9IG5ldyBNb2R1bGUoe01vZHVsZVN0b3JlOiBNb2R1bGVTdG9yZX0pO1xuICBNb2R1bGVTdG9yZS5zZXQoJ0B0cmFjZXVyL3NyYy9ydW50aW1lL01vZHVsZVN0b3JlJywgbW9kdWxlU3RvcmVNb2R1bGUpO1xuICBNb2R1bGVTdG9yZS5zZXQoJ0B0cmFjZXVyL3NyYy9ydW50aW1lL01vZHVsZVN0b3JlLmpzJywgbW9kdWxlU3RvcmVNb2R1bGUpO1xuICB2YXIgc2V0dXBHbG9iYWxzID0gJHRyYWNldXJSdW50aW1lLnNldHVwR2xvYmFscztcbiAgJHRyYWNldXJSdW50aW1lLnNldHVwR2xvYmFscyA9IGZ1bmN0aW9uKGdsb2JhbCkge1xuICAgIHNldHVwR2xvYmFscyhnbG9iYWwpO1xuICB9O1xuICAkdHJhY2V1clJ1bnRpbWUuTW9kdWxlU3RvcmUgPSBNb2R1bGVTdG9yZTtcbiAgZ2xvYmFsLlN5c3RlbSA9IHtcbiAgICByZWdpc3RlcjogTW9kdWxlU3RvcmUucmVnaXN0ZXIuYmluZChNb2R1bGVTdG9yZSksXG4gICAgcmVnaXN0ZXJNb2R1bGU6IE1vZHVsZVN0b3JlLnJlZ2lzdGVyTW9kdWxlLmJpbmQoTW9kdWxlU3RvcmUpLFxuICAgIGdldDogTW9kdWxlU3RvcmUuZ2V0LFxuICAgIHNldDogTW9kdWxlU3RvcmUuc2V0LFxuICAgIG5vcm1hbGl6ZTogTW9kdWxlU3RvcmUubm9ybWFsaXplXG4gIH07XG4gICR0cmFjZXVyUnVudGltZS5nZXRNb2R1bGVJbXBsID0gZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBpbnN0YW50aWF0b3IgPSBnZXRVbmNvYXRlZE1vZHVsZUluc3RhbnRpYXRvcihuYW1lKTtcbiAgICByZXR1cm4gaW5zdGFudGlhdG9yICYmIGluc3RhbnRpYXRvci5nZXRVbmNvYXRlZE1vZHVsZSgpO1xuICB9O1xufSkodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiB0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmICE9PSAndW5kZWZpbmVkJyA/IHNlbGYgOiB0aGlzKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCI7XG4gIHZhciAkY2VpbCA9IE1hdGguY2VpbDtcbiAgdmFyICRmbG9vciA9IE1hdGguZmxvb3I7XG4gIHZhciAkaXNGaW5pdGUgPSBpc0Zpbml0ZTtcbiAgdmFyICRpc05hTiA9IGlzTmFOO1xuICB2YXIgJHBvdyA9IE1hdGgucG93O1xuICB2YXIgJG1pbiA9IE1hdGgubWluO1xuICB2YXIgdG9PYmplY3QgPSAkdHJhY2V1clJ1bnRpbWUudG9PYmplY3Q7XG4gIGZ1bmN0aW9uIHRvVWludDMyKHgpIHtcbiAgICByZXR1cm4geCA+Pj4gMDtcbiAgfVxuICBmdW5jdGlvbiBpc09iamVjdCh4KSB7XG4gICAgcmV0dXJuIHggJiYgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyk7XG4gIH1cbiAgZnVuY3Rpb24gaXNDYWxsYWJsZSh4KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nO1xuICB9XG4gIGZ1bmN0aW9uIGlzTnVtYmVyKHgpIHtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdudW1iZXInO1xuICB9XG4gIGZ1bmN0aW9uIHRvSW50ZWdlcih4KSB7XG4gICAgeCA9ICt4O1xuICAgIGlmICgkaXNOYU4oeCkpXG4gICAgICByZXR1cm4gMDtcbiAgICBpZiAoeCA9PT0gMCB8fCAhJGlzRmluaXRlKHgpKVxuICAgICAgcmV0dXJuIHg7XG4gICAgcmV0dXJuIHggPiAwID8gJGZsb29yKHgpIDogJGNlaWwoeCk7XG4gIH1cbiAgdmFyIE1BWF9TQUZFX0xFTkdUSCA9ICRwb3coMiwgNTMpIC0gMTtcbiAgZnVuY3Rpb24gdG9MZW5ndGgoeCkge1xuICAgIHZhciBsZW4gPSB0b0ludGVnZXIoeCk7XG4gICAgcmV0dXJuIGxlbiA8IDAgPyAwIDogJG1pbihsZW4sIE1BWF9TQUZFX0xFTkdUSCk7XG4gIH1cbiAgZnVuY3Rpb24gY2hlY2tJdGVyYWJsZSh4KSB7XG4gICAgcmV0dXJuICFpc09iamVjdCh4KSA/IHVuZGVmaW5lZCA6IHhbU3ltYm9sLml0ZXJhdG9yXTtcbiAgfVxuICBmdW5jdGlvbiBpc0NvbnN0cnVjdG9yKHgpIHtcbiAgICByZXR1cm4gaXNDYWxsYWJsZSh4KTtcbiAgfVxuICBmdW5jdGlvbiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCh2YWx1ZSwgZG9uZSkge1xuICAgIHJldHVybiB7XG4gICAgICB2YWx1ZTogdmFsdWUsXG4gICAgICBkb25lOiBkb25lXG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiBtYXliZURlZmluZShvYmplY3QsIG5hbWUsIGRlc2NyKSB7XG4gICAgaWYgKCEobmFtZSBpbiBvYmplY3QpKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqZWN0LCBuYW1lLCBkZXNjcik7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIG1heWJlRGVmaW5lTWV0aG9kKG9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICBtYXliZURlZmluZShvYmplY3QsIG5hbWUsIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgfVxuICBmdW5jdGlvbiBtYXliZURlZmluZUNvbnN0KG9iamVjdCwgbmFtZSwgdmFsdWUpIHtcbiAgICBtYXliZURlZmluZShvYmplY3QsIG5hbWUsIHtcbiAgICAgIHZhbHVlOiB2YWx1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogZmFsc2UsXG4gICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgIHdyaXRhYmxlOiBmYWxzZVxuICAgIH0pO1xuICB9XG4gIGZ1bmN0aW9uIG1heWJlQWRkRnVuY3Rpb25zKG9iamVjdCwgZnVuY3Rpb25zKSB7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBmdW5jdGlvbnMubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgIHZhciBuYW1lID0gZnVuY3Rpb25zW2ldO1xuICAgICAgdmFyIHZhbHVlID0gZnVuY3Rpb25zW2kgKyAxXTtcbiAgICAgIG1heWJlRGVmaW5lTWV0aG9kKG9iamVjdCwgbmFtZSwgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBtYXliZUFkZENvbnN0cyhvYmplY3QsIGNvbnN0cykge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY29uc3RzLmxlbmd0aDsgaSArPSAyKSB7XG4gICAgICB2YXIgbmFtZSA9IGNvbnN0c1tpXTtcbiAgICAgIHZhciB2YWx1ZSA9IGNvbnN0c1tpICsgMV07XG4gICAgICBtYXliZURlZmluZUNvbnN0KG9iamVjdCwgbmFtZSwgdmFsdWUpO1xuICAgIH1cbiAgfVxuICBmdW5jdGlvbiBtYXliZUFkZEl0ZXJhdG9yKG9iamVjdCwgZnVuYywgU3ltYm9sKSB7XG4gICAgaWYgKCFTeW1ib2wgfHwgIVN5bWJvbC5pdGVyYXRvciB8fCBvYmplY3RbU3ltYm9sLml0ZXJhdG9yXSlcbiAgICAgIHJldHVybjtcbiAgICBpZiAob2JqZWN0WydAQGl0ZXJhdG9yJ10pXG4gICAgICBmdW5jID0gb2JqZWN0WydAQGl0ZXJhdG9yJ107XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iamVjdCwgU3ltYm9sLml0ZXJhdG9yLCB7XG4gICAgICB2YWx1ZTogZnVuYyxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IGZhbHNlLFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9KTtcbiAgfVxuICB2YXIgcG9seWZpbGxzID0gW107XG4gIGZ1bmN0aW9uIHJlZ2lzdGVyUG9seWZpbGwoZnVuYykge1xuICAgIHBvbHlmaWxscy5wdXNoKGZ1bmMpO1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsQWxsKGdsb2JhbCkge1xuICAgIHBvbHlmaWxscy5mb3JFYWNoKChmdW5jdGlvbihmKSB7XG4gICAgICByZXR1cm4gZihnbG9iYWwpO1xuICAgIH0pKTtcbiAgfVxuICByZXR1cm4ge1xuICAgIGdldCB0b09iamVjdCgpIHtcbiAgICAgIHJldHVybiB0b09iamVjdDtcbiAgICB9LFxuICAgIGdldCB0b1VpbnQzMigpIHtcbiAgICAgIHJldHVybiB0b1VpbnQzMjtcbiAgICB9LFxuICAgIGdldCBpc09iamVjdCgpIHtcbiAgICAgIHJldHVybiBpc09iamVjdDtcbiAgICB9LFxuICAgIGdldCBpc0NhbGxhYmxlKCkge1xuICAgICAgcmV0dXJuIGlzQ2FsbGFibGU7XG4gICAgfSxcbiAgICBnZXQgaXNOdW1iZXIoKSB7XG4gICAgICByZXR1cm4gaXNOdW1iZXI7XG4gICAgfSxcbiAgICBnZXQgdG9JbnRlZ2VyKCkge1xuICAgICAgcmV0dXJuIHRvSW50ZWdlcjtcbiAgICB9LFxuICAgIGdldCB0b0xlbmd0aCgpIHtcbiAgICAgIHJldHVybiB0b0xlbmd0aDtcbiAgICB9LFxuICAgIGdldCBjaGVja0l0ZXJhYmxlKCkge1xuICAgICAgcmV0dXJuIGNoZWNrSXRlcmFibGU7XG4gICAgfSxcbiAgICBnZXQgaXNDb25zdHJ1Y3RvcigpIHtcbiAgICAgIHJldHVybiBpc0NvbnN0cnVjdG9yO1xuICAgIH0sXG4gICAgZ2V0IGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0O1xuICAgIH0sXG4gICAgZ2V0IG1heWJlRGVmaW5lKCkge1xuICAgICAgcmV0dXJuIG1heWJlRGVmaW5lO1xuICAgIH0sXG4gICAgZ2V0IG1heWJlRGVmaW5lTWV0aG9kKCkge1xuICAgICAgcmV0dXJuIG1heWJlRGVmaW5lTWV0aG9kO1xuICAgIH0sXG4gICAgZ2V0IG1heWJlRGVmaW5lQ29uc3QoKSB7XG4gICAgICByZXR1cm4gbWF5YmVEZWZpbmVDb25zdDtcbiAgICB9LFxuICAgIGdldCBtYXliZUFkZEZ1bmN0aW9ucygpIHtcbiAgICAgIHJldHVybiBtYXliZUFkZEZ1bmN0aW9ucztcbiAgICB9LFxuICAgIGdldCBtYXliZUFkZENvbnN0cygpIHtcbiAgICAgIHJldHVybiBtYXliZUFkZENvbnN0cztcbiAgICB9LFxuICAgIGdldCBtYXliZUFkZEl0ZXJhdG9yKCkge1xuICAgICAgcmV0dXJuIG1heWJlQWRkSXRlcmF0b3I7XG4gICAgfSxcbiAgICBnZXQgcmVnaXN0ZXJQb2x5ZmlsbCgpIHtcbiAgICAgIHJldHVybiByZWdpc3RlclBvbHlmaWxsO1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsQWxsKCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsQWxsO1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTWFwLmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL01hcC5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIGlzT2JqZWN0ID0gJF9fMC5pc09iamVjdCxcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IgPSAkX18wLm1heWJlQWRkSXRlcmF0b3IsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMC5yZWdpc3RlclBvbHlmaWxsO1xuICB2YXIgZ2V0T3duSGFzaE9iamVjdCA9ICR0cmFjZXVyUnVudGltZS5nZXRPd25IYXNoT2JqZWN0O1xuICB2YXIgJGhhc093blByb3BlcnR5ID0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcbiAgdmFyIGRlbGV0ZWRTZW50aW5lbCA9IHt9O1xuICBmdW5jdGlvbiBsb29rdXBJbmRleChtYXAsIGtleSkge1xuICAgIGlmIChpc09iamVjdChrZXkpKSB7XG4gICAgICB2YXIgaGFzaE9iamVjdCA9IGdldE93bkhhc2hPYmplY3Qoa2V5KTtcbiAgICAgIHJldHVybiBoYXNoT2JqZWN0ICYmIG1hcC5vYmplY3RJbmRleF9baGFzaE9iamVjdC5oYXNoXTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiBrZXkgPT09ICdzdHJpbmcnKVxuICAgICAgcmV0dXJuIG1hcC5zdHJpbmdJbmRleF9ba2V5XTtcbiAgICByZXR1cm4gbWFwLnByaW1pdGl2ZUluZGV4X1trZXldO1xuICB9XG4gIGZ1bmN0aW9uIGluaXRNYXAobWFwKSB7XG4gICAgbWFwLmVudHJpZXNfID0gW107XG4gICAgbWFwLm9iamVjdEluZGV4XyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgbWFwLnN0cmluZ0luZGV4XyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgbWFwLnByaW1pdGl2ZUluZGV4XyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgbWFwLmRlbGV0ZWRDb3VudF8gPSAwO1xuICB9XG4gIHZhciBNYXAgPSBmdW5jdGlvbiBNYXAoKSB7XG4gICAgdmFyIGl0ZXJhYmxlID0gYXJndW1lbnRzWzBdO1xuICAgIGlmICghaXNPYmplY3QodGhpcykpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNYXAgY2FsbGVkIG9uIGluY29tcGF0aWJsZSB0eXBlJyk7XG4gICAgaWYgKCRoYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsICdlbnRyaWVzXycpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNYXAgY2FuIG5vdCBiZSByZWVudHJhbnRseSBpbml0aWFsaXNlZCcpO1xuICAgIH1cbiAgICBpbml0TWFwKHRoaXMpO1xuICAgIGlmIChpdGVyYWJsZSAhPT0gbnVsbCAmJiBpdGVyYWJsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBmb3IgKHZhciAkX18yID0gaXRlcmFibGVbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoU3ltYm9sLml0ZXJhdG9yKV0oKSxcbiAgICAgICAgICAkX18zOyAhKCRfXzMgPSAkX18yLm5leHQoKSkuZG9uZTsgKSB7XG4gICAgICAgIHZhciAkX180ID0gJF9fMy52YWx1ZSxcbiAgICAgICAgICAgIGtleSA9ICRfXzRbMF0sXG4gICAgICAgICAgICB2YWx1ZSA9ICRfXzRbMV07XG4gICAgICAgIHtcbiAgICAgICAgICB0aGlzLnNldChrZXksIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoTWFwLCB7XG4gICAgZ2V0IHNpemUoKSB7XG4gICAgICByZXR1cm4gdGhpcy5lbnRyaWVzXy5sZW5ndGggLyAyIC0gdGhpcy5kZWxldGVkQ291bnRfO1xuICAgIH0sXG4gICAgZ2V0OiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBpbmRleCA9IGxvb2t1cEluZGV4KHRoaXMsIGtleSk7XG4gICAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZClcbiAgICAgICAgcmV0dXJuIHRoaXMuZW50cmllc19baW5kZXggKyAxXTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgdmFyIG9iamVjdE1vZGUgPSBpc09iamVjdChrZXkpO1xuICAgICAgdmFyIHN0cmluZ01vZGUgPSB0eXBlb2Yga2V5ID09PSAnc3RyaW5nJztcbiAgICAgIHZhciBpbmRleCA9IGxvb2t1cEluZGV4KHRoaXMsIGtleSk7XG4gICAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmVudHJpZXNfW2luZGV4ICsgMV0gPSB2YWx1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluZGV4ID0gdGhpcy5lbnRyaWVzXy5sZW5ndGg7XG4gICAgICAgIHRoaXMuZW50cmllc19baW5kZXhdID0ga2V5O1xuICAgICAgICB0aGlzLmVudHJpZXNfW2luZGV4ICsgMV0gPSB2YWx1ZTtcbiAgICAgICAgaWYgKG9iamVjdE1vZGUpIHtcbiAgICAgICAgICB2YXIgaGFzaE9iamVjdCA9IGdldE93bkhhc2hPYmplY3Qoa2V5KTtcbiAgICAgICAgICB2YXIgaGFzaCA9IGhhc2hPYmplY3QuaGFzaDtcbiAgICAgICAgICB0aGlzLm9iamVjdEluZGV4X1toYXNoXSA9IGluZGV4O1xuICAgICAgICB9IGVsc2UgaWYgKHN0cmluZ01vZGUpIHtcbiAgICAgICAgICB0aGlzLnN0cmluZ0luZGV4X1trZXldID0gaW5kZXg7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5wcmltaXRpdmVJbmRleF9ba2V5XSA9IGluZGV4O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGhhczogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gbG9va3VwSW5kZXgodGhpcywga2V5KSAhPT0gdW5kZWZpbmVkO1xuICAgIH0sXG4gICAgZGVsZXRlOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHZhciBvYmplY3RNb2RlID0gaXNPYmplY3Qoa2V5KTtcbiAgICAgIHZhciBzdHJpbmdNb2RlID0gdHlwZW9mIGtleSA9PT0gJ3N0cmluZyc7XG4gICAgICB2YXIgaW5kZXg7XG4gICAgICB2YXIgaGFzaDtcbiAgICAgIGlmIChvYmplY3RNb2RlKSB7XG4gICAgICAgIHZhciBoYXNoT2JqZWN0ID0gZ2V0T3duSGFzaE9iamVjdChrZXkpO1xuICAgICAgICBpZiAoaGFzaE9iamVjdCkge1xuICAgICAgICAgIGluZGV4ID0gdGhpcy5vYmplY3RJbmRleF9baGFzaCA9IGhhc2hPYmplY3QuaGFzaF07XG4gICAgICAgICAgZGVsZXRlIHRoaXMub2JqZWN0SW5kZXhfW2hhc2hdO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHN0cmluZ01vZGUpIHtcbiAgICAgICAgaW5kZXggPSB0aGlzLnN0cmluZ0luZGV4X1trZXldO1xuICAgICAgICBkZWxldGUgdGhpcy5zdHJpbmdJbmRleF9ba2V5XTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGluZGV4ID0gdGhpcy5wcmltaXRpdmVJbmRleF9ba2V5XTtcbiAgICAgICAgZGVsZXRlIHRoaXMucHJpbWl0aXZlSW5kZXhfW2tleV07XG4gICAgICB9XG4gICAgICBpZiAoaW5kZXggIT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aGlzLmVudHJpZXNfW2luZGV4XSA9IGRlbGV0ZWRTZW50aW5lbDtcbiAgICAgICAgdGhpcy5lbnRyaWVzX1tpbmRleCArIDFdID0gdW5kZWZpbmVkO1xuICAgICAgICB0aGlzLmRlbGV0ZWRDb3VudF8rKztcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcbiAgICBjbGVhcjogZnVuY3Rpb24oKSB7XG4gICAgICBpbml0TWFwKHRoaXMpO1xuICAgIH0sXG4gICAgZm9yRWFjaDogZnVuY3Rpb24oY2FsbGJhY2tGbikge1xuICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMuZW50cmllc18ubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgdmFyIGtleSA9IHRoaXMuZW50cmllc19baV07XG4gICAgICAgIHZhciB2YWx1ZSA9IHRoaXMuZW50cmllc19baSArIDFdO1xuICAgICAgICBpZiAoa2V5ID09PSBkZWxldGVkU2VudGluZWwpXG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIGNhbGxiYWNrRm4uY2FsbCh0aGlzQXJnLCB2YWx1ZSwga2V5LCB0aGlzKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGVudHJpZXM6ICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb24gJF9fNSgpIHtcbiAgICAgIHZhciBpLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB2YWx1ZTtcbiAgICAgIHJldHVybiAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UoZnVuY3Rpb24oJGN0eCkge1xuICAgICAgICB3aGlsZSAodHJ1ZSlcbiAgICAgICAgICBzd2l0Y2ggKCRjdHguc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgaSA9IDA7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKGkgPCB0aGlzLmVudHJpZXNfLmxlbmd0aCkgPyA4IDogLTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICAgIGtleSA9IHRoaXMuZW50cmllc19baV07XG4gICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5lbnRyaWVzX1tpICsgMV07XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA5O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChrZXkgPT09IGRlbGV0ZWRTZW50aW5lbCkgPyA0IDogNjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAyO1xuICAgICAgICAgICAgICByZXR1cm4gW2tleSwgdmFsdWVdO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAkY3R4Lm1heWJlVGhyb3coKTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDQ7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgcmV0dXJuICRjdHguZW5kKCk7XG4gICAgICAgICAgfVxuICAgICAgfSwgJF9fNSwgdGhpcyk7XG4gICAgfSksXG4gICAga2V5czogJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbihmdW5jdGlvbiAkX182KCkge1xuICAgICAgdmFyIGksXG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHZhbHVlO1xuICAgICAgcmV0dXJuICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShmdW5jdGlvbigkY3R4KSB7XG4gICAgICAgIHdoaWxlICh0cnVlKVxuICAgICAgICAgIHN3aXRjaCAoJGN0eC5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICBpID0gMDtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgMTI6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoaSA8IHRoaXMuZW50cmllc18ubGVuZ3RoKSA/IDggOiAtMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgIGkgKz0gMjtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDEyO1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAga2V5ID0gdGhpcy5lbnRyaWVzX1tpXTtcbiAgICAgICAgICAgICAgdmFsdWUgPSB0aGlzLmVudHJpZXNfW2kgKyAxXTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKGtleSA9PT0gZGVsZXRlZFNlbnRpbmVsKSA/IDQgOiA2O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDI7XG4gICAgICAgICAgICAgIHJldHVybiBrZXk7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICRjdHgubWF5YmVUaHJvdygpO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gNDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICByZXR1cm4gJGN0eC5lbmQoKTtcbiAgICAgICAgICB9XG4gICAgICB9LCAkX182LCB0aGlzKTtcbiAgICB9KSxcbiAgICB2YWx1ZXM6ICR0cmFjZXVyUnVudGltZS5pbml0R2VuZXJhdG9yRnVuY3Rpb24oZnVuY3Rpb24gJF9fNygpIHtcbiAgICAgIHZhciBpLFxuICAgICAgICAgIGtleSxcbiAgICAgICAgICB2YWx1ZTtcbiAgICAgIHJldHVybiAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UoZnVuY3Rpb24oJGN0eCkge1xuICAgICAgICB3aGlsZSAodHJ1ZSlcbiAgICAgICAgICBzd2l0Y2ggKCRjdHguc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgaSA9IDA7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDEyOlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKGkgPCB0aGlzLmVudHJpZXNfLmxlbmd0aCkgPyA4IDogLTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICBpICs9IDI7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDg6XG4gICAgICAgICAgICAgIGtleSA9IHRoaXMuZW50cmllc19baV07XG4gICAgICAgICAgICAgIHZhbHVlID0gdGhpcy5lbnRyaWVzX1tpICsgMV07XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSA5O1xuICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IChrZXkgPT09IGRlbGV0ZWRTZW50aW5lbCkgPyA0IDogNjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDY6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAyO1xuICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICRjdHgubWF5YmVUaHJvdygpO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gNDtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICByZXR1cm4gJGN0eC5lbmQoKTtcbiAgICAgICAgICB9XG4gICAgICB9LCAkX183LCB0aGlzKTtcbiAgICB9KVxuICB9LCB7fSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShNYXAucHJvdG90eXBlLCBTeW1ib2wuaXRlcmF0b3IsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IE1hcC5wcm90b3R5cGUuZW50cmllc1xuICB9KTtcbiAgZnVuY3Rpb24gcG9seWZpbGxNYXAoZ2xvYmFsKSB7XG4gICAgdmFyICRfXzQgPSBnbG9iYWwsXG4gICAgICAgIE9iamVjdCA9ICRfXzQuT2JqZWN0LFxuICAgICAgICBTeW1ib2wgPSAkX180LlN5bWJvbDtcbiAgICBpZiAoIWdsb2JhbC5NYXApXG4gICAgICBnbG9iYWwuTWFwID0gTWFwO1xuICAgIHZhciBtYXBQcm90b3R5cGUgPSBnbG9iYWwuTWFwLnByb3RvdHlwZTtcbiAgICBpZiAobWFwUHJvdG90eXBlLmVudHJpZXMgPT09IHVuZGVmaW5lZClcbiAgICAgIGdsb2JhbC5NYXAgPSBNYXA7XG4gICAgaWYgKG1hcFByb3RvdHlwZS5lbnRyaWVzKSB7XG4gICAgICBtYXliZUFkZEl0ZXJhdG9yKG1hcFByb3RvdHlwZSwgbWFwUHJvdG90eXBlLmVudHJpZXMsIFN5bWJvbCk7XG4gICAgICBtYXliZUFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZihuZXcgZ2xvYmFsLk1hcCgpLmVudHJpZXMoKSksIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgIH0sIFN5bWJvbCk7XG4gICAgfVxuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxNYXApO1xuICByZXR1cm4ge1xuICAgIGdldCBNYXAoKSB7XG4gICAgICByZXR1cm4gTWFwO1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsTWFwKCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsTWFwO1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL01hcC5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU2V0LmpzXCIsIFtdLCBmdW5jdGlvbigpIHtcbiAgXCJ1c2Ugc3RyaWN0XCI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1NldC5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIGlzT2JqZWN0ID0gJF9fMC5pc09iamVjdCxcbiAgICAgIG1heWJlQWRkSXRlcmF0b3IgPSAkX18wLm1heWJlQWRkSXRlcmF0b3IsXG4gICAgICByZWdpc3RlclBvbHlmaWxsID0gJF9fMC5yZWdpc3RlclBvbHlmaWxsO1xuICB2YXIgTWFwID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL01hcC5qc1wiKS5NYXA7XG4gIHZhciBnZXRPd25IYXNoT2JqZWN0ID0gJHRyYWNldXJSdW50aW1lLmdldE93bkhhc2hPYmplY3Q7XG4gIHZhciAkaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuICBmdW5jdGlvbiBpbml0U2V0KHNldCkge1xuICAgIHNldC5tYXBfID0gbmV3IE1hcCgpO1xuICB9XG4gIHZhciBTZXQgPSBmdW5jdGlvbiBTZXQoKSB7XG4gICAgdmFyIGl0ZXJhYmxlID0gYXJndW1lbnRzWzBdO1xuICAgIGlmICghaXNPYmplY3QodGhpcykpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdTZXQgY2FsbGVkIG9uIGluY29tcGF0aWJsZSB0eXBlJyk7XG4gICAgaWYgKCRoYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsICdtYXBfJykpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1NldCBjYW4gbm90IGJlIHJlZW50cmFudGx5IGluaXRpYWxpc2VkJyk7XG4gICAgfVxuICAgIGluaXRTZXQodGhpcyk7XG4gICAgaWYgKGl0ZXJhYmxlICE9PSBudWxsICYmIGl0ZXJhYmxlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGZvciAodmFyICRfXzQgPSBpdGVyYWJsZVskdHJhY2V1clJ1bnRpbWUudG9Qcm9wZXJ0eShTeW1ib2wuaXRlcmF0b3IpXSgpLFxuICAgICAgICAgICRfXzU7ICEoJF9fNSA9ICRfXzQubmV4dCgpKS5kb25lOyApIHtcbiAgICAgICAgdmFyIGl0ZW0gPSAkX181LnZhbHVlO1xuICAgICAgICB7XG4gICAgICAgICAgdGhpcy5hZGQoaXRlbSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFNldCwge1xuICAgIGdldCBzaXplKCkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwXy5zaXplO1xuICAgIH0sXG4gICAgaGFzOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiB0aGlzLm1hcF8uaGFzKGtleSk7XG4gICAgfSxcbiAgICBhZGQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgdGhpcy5tYXBfLnNldChrZXksIGtleSk7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGRlbGV0ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGhpcy5tYXBfLmRlbGV0ZShrZXkpO1xuICAgIH0sXG4gICAgY2xlYXI6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMubWFwXy5jbGVhcigpO1xuICAgIH0sXG4gICAgZm9yRWFjaDogZnVuY3Rpb24oY2FsbGJhY2tGbikge1xuICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG4gICAgICB2YXIgJF9fMiA9IHRoaXM7XG4gICAgICByZXR1cm4gdGhpcy5tYXBfLmZvckVhY2goKGZ1bmN0aW9uKHZhbHVlLCBrZXkpIHtcbiAgICAgICAgY2FsbGJhY2tGbi5jYWxsKHRoaXNBcmcsIGtleSwga2V5LCAkX18yKTtcbiAgICAgIH0pKTtcbiAgICB9LFxuICAgIHZhbHVlczogJHRyYWNldXJSdW50aW1lLmluaXRHZW5lcmF0b3JGdW5jdGlvbihmdW5jdGlvbiAkX183KCkge1xuICAgICAgdmFyICRfXzgsXG4gICAgICAgICAgJF9fOTtcbiAgICAgIHJldHVybiAkdHJhY2V1clJ1bnRpbWUuY3JlYXRlR2VuZXJhdG9ySW5zdGFuY2UoZnVuY3Rpb24oJGN0eCkge1xuICAgICAgICB3aGlsZSAodHJ1ZSlcbiAgICAgICAgICBzd2l0Y2ggKCRjdHguc3RhdGUpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgJF9fOCA9IHRoaXMubWFwXy5rZXlzKClbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgICAgICAgICAgICAkY3R4LnNlbnQgPSB2b2lkIDA7XG4gICAgICAgICAgICAgICRjdHguYWN0aW9uID0gJ25leHQnO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgJF9fOSA9ICRfXzhbJGN0eC5hY3Rpb25dKCRjdHguc2VudElnbm9yZVRocm93KTtcbiAgICAgICAgICAgICAgJGN0eC5zdGF0ZSA9IDk7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gKCRfXzkuZG9uZSkgPyAzIDogMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICRjdHguc2VudCA9ICRfXzkudmFsdWU7XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAtMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAxMjtcbiAgICAgICAgICAgICAgcmV0dXJuICRfXzkudmFsdWU7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICByZXR1cm4gJGN0eC5lbmQoKTtcbiAgICAgICAgICB9XG4gICAgICB9LCAkX183LCB0aGlzKTtcbiAgICB9KSxcbiAgICBlbnRyaWVzOiAkdHJhY2V1clJ1bnRpbWUuaW5pdEdlbmVyYXRvckZ1bmN0aW9uKGZ1bmN0aW9uICRfXzEwKCkge1xuICAgICAgdmFyICRfXzExLFxuICAgICAgICAgICRfXzEyO1xuICAgICAgcmV0dXJuICR0cmFjZXVyUnVudGltZS5jcmVhdGVHZW5lcmF0b3JJbnN0YW5jZShmdW5jdGlvbigkY3R4KSB7XG4gICAgICAgIHdoaWxlICh0cnVlKVxuICAgICAgICAgIHN3aXRjaCAoJGN0eC5zdGF0ZSkge1xuICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAkX18xMSA9IHRoaXMubWFwXy5lbnRyaWVzKClbU3ltYm9sLml0ZXJhdG9yXSgpO1xuICAgICAgICAgICAgICAkY3R4LnNlbnQgPSB2b2lkIDA7XG4gICAgICAgICAgICAgICRjdHguYWN0aW9uID0gJ25leHQnO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAxMjpcbiAgICAgICAgICAgICAgJF9fMTIgPSAkX18xMVskY3R4LmFjdGlvbl0oJGN0eC5zZW50SWdub3JlVGhyb3cpO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gOTtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICRjdHguc3RhdGUgPSAoJF9fMTIuZG9uZSkgPyAzIDogMjtcbiAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICRjdHguc2VudCA9ICRfXzEyLnZhbHVlO1xuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gLTI7XG4gICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAkY3R4LnN0YXRlID0gMTI7XG4gICAgICAgICAgICAgIHJldHVybiAkX18xMi52YWx1ZTtcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgIHJldHVybiAkY3R4LmVuZCgpO1xuICAgICAgICAgIH1cbiAgICAgIH0sICRfXzEwLCB0aGlzKTtcbiAgICB9KVxuICB9LCB7fSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTZXQucHJvdG90eXBlLCBTeW1ib2wuaXRlcmF0b3IsIHtcbiAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWUsXG4gICAgdmFsdWU6IFNldC5wcm90b3R5cGUudmFsdWVzXG4gIH0pO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU2V0LnByb3RvdHlwZSwgJ2tleXMnLCB7XG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgIHZhbHVlOiBTZXQucHJvdG90eXBlLnZhbHVlc1xuICB9KTtcbiAgZnVuY3Rpb24gcG9seWZpbGxTZXQoZ2xvYmFsKSB7XG4gICAgdmFyICRfXzYgPSBnbG9iYWwsXG4gICAgICAgIE9iamVjdCA9ICRfXzYuT2JqZWN0LFxuICAgICAgICBTeW1ib2wgPSAkX182LlN5bWJvbDtcbiAgICBpZiAoIWdsb2JhbC5TZXQpXG4gICAgICBnbG9iYWwuU2V0ID0gU2V0O1xuICAgIHZhciBzZXRQcm90b3R5cGUgPSBnbG9iYWwuU2V0LnByb3RvdHlwZTtcbiAgICBpZiAoc2V0UHJvdG90eXBlLnZhbHVlcykge1xuICAgICAgbWF5YmVBZGRJdGVyYXRvcihzZXRQcm90b3R5cGUsIHNldFByb3RvdHlwZS52YWx1ZXMsIFN5bWJvbCk7XG4gICAgICBtYXliZUFkZEl0ZXJhdG9yKE9iamVjdC5nZXRQcm90b3R5cGVPZihuZXcgZ2xvYmFsLlNldCgpLnZhbHVlcygpKSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgfSwgU3ltYm9sKTtcbiAgICB9XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbFNldCk7XG4gIHJldHVybiB7XG4gICAgZ2V0IFNldCgpIHtcbiAgICAgIHJldHVybiBTZXQ7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxTZXQoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxTZXQ7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU2V0LmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L25vZGVfbW9kdWxlcy9yc3ZwL2xpYi9yc3ZwL2FzYXAuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9ub2RlX21vZHVsZXMvcnN2cC9saWIvcnN2cC9hc2FwLmpzXCI7XG4gIHZhciBsZW4gPSAwO1xuICBmdW5jdGlvbiBhc2FwKGNhbGxiYWNrLCBhcmcpIHtcbiAgICBxdWV1ZVtsZW5dID0gY2FsbGJhY2s7XG4gICAgcXVldWVbbGVuICsgMV0gPSBhcmc7XG4gICAgbGVuICs9IDI7XG4gICAgaWYgKGxlbiA9PT0gMikge1xuICAgICAgc2NoZWR1bGVGbHVzaCgpO1xuICAgIH1cbiAgfVxuICB2YXIgJF9fZGVmYXVsdCA9IGFzYXA7XG4gIHZhciBicm93c2VyR2xvYmFsID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKSA/IHdpbmRvdyA6IHt9O1xuICB2YXIgQnJvd3Nlck11dGF0aW9uT2JzZXJ2ZXIgPSBicm93c2VyR2xvYmFsLk11dGF0aW9uT2JzZXJ2ZXIgfHwgYnJvd3Nlckdsb2JhbC5XZWJLaXRNdXRhdGlvbk9ic2VydmVyO1xuICB2YXIgaXNXb3JrZXIgPSB0eXBlb2YgVWludDhDbGFtcGVkQXJyYXkgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBpbXBvcnRTY3JpcHRzICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgTWVzc2FnZUNoYW5uZWwgIT09ICd1bmRlZmluZWQnO1xuICBmdW5jdGlvbiB1c2VOZXh0VGljaygpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICBwcm9jZXNzLm5leHRUaWNrKGZsdXNoKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIHVzZU11dGF0aW9uT2JzZXJ2ZXIoKSB7XG4gICAgdmFyIGl0ZXJhdGlvbnMgPSAwO1xuICAgIHZhciBvYnNlcnZlciA9IG5ldyBCcm93c2VyTXV0YXRpb25PYnNlcnZlcihmbHVzaCk7XG4gICAgdmFyIG5vZGUgPSBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZSgnJyk7XG4gICAgb2JzZXJ2ZXIub2JzZXJ2ZShub2RlLCB7Y2hhcmFjdGVyRGF0YTogdHJ1ZX0pO1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIG5vZGUuZGF0YSA9IChpdGVyYXRpb25zID0gKytpdGVyYXRpb25zICUgMik7XG4gICAgfTtcbiAgfVxuICBmdW5jdGlvbiB1c2VNZXNzYWdlQ2hhbm5lbCgpIHtcbiAgICB2YXIgY2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuICAgIGNoYW5uZWwucG9ydDEub25tZXNzYWdlID0gZmx1c2g7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgY2hhbm5lbC5wb3J0Mi5wb3N0TWVzc2FnZSgwKTtcbiAgICB9O1xuICB9XG4gIGZ1bmN0aW9uIHVzZVNldFRpbWVvdXQoKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgc2V0VGltZW91dChmbHVzaCwgMSk7XG4gICAgfTtcbiAgfVxuICB2YXIgcXVldWUgPSBuZXcgQXJyYXkoMTAwMCk7XG4gIGZ1bmN0aW9uIGZsdXNoKCkge1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyBpICs9IDIpIHtcbiAgICAgIHZhciBjYWxsYmFjayA9IHF1ZXVlW2ldO1xuICAgICAgdmFyIGFyZyA9IHF1ZXVlW2kgKyAxXTtcbiAgICAgIGNhbGxiYWNrKGFyZyk7XG4gICAgICBxdWV1ZVtpXSA9IHVuZGVmaW5lZDtcbiAgICAgIHF1ZXVlW2kgKyAxXSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gICAgbGVuID0gMDtcbiAgfVxuICB2YXIgc2NoZWR1bGVGbHVzaDtcbiAgaWYgKHR5cGVvZiBwcm9jZXNzICE9PSAndW5kZWZpbmVkJyAmJiB7fS50b1N0cmluZy5jYWxsKHByb2Nlc3MpID09PSAnW29iamVjdCBwcm9jZXNzXScpIHtcbiAgICBzY2hlZHVsZUZsdXNoID0gdXNlTmV4dFRpY2soKTtcbiAgfSBlbHNlIGlmIChCcm93c2VyTXV0YXRpb25PYnNlcnZlcikge1xuICAgIHNjaGVkdWxlRmx1c2ggPSB1c2VNdXRhdGlvbk9ic2VydmVyKCk7XG4gIH0gZWxzZSBpZiAoaXNXb3JrZXIpIHtcbiAgICBzY2hlZHVsZUZsdXNoID0gdXNlTWVzc2FnZUNoYW5uZWwoKTtcbiAgfSBlbHNlIHtcbiAgICBzY2hlZHVsZUZsdXNoID0gdXNlU2V0VGltZW91dCgpO1xuICB9XG4gIHJldHVybiB7Z2V0IGRlZmF1bHQoKSB7XG4gICAgICByZXR1cm4gJF9fZGVmYXVsdDtcbiAgICB9fTtcbn0pO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvUHJvbWlzZS5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9Qcm9taXNlLmpzXCI7XG4gIHZhciBhc3luYyA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L25vZGVfbW9kdWxlcy9yc3ZwL2xpYi9yc3ZwL2FzYXAuanNcIikuZGVmYXVsdDtcbiAgdmFyIHJlZ2lzdGVyUG9seWZpbGwgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIikucmVnaXN0ZXJQb2x5ZmlsbDtcbiAgdmFyIHByb21pc2VSYXcgPSB7fTtcbiAgZnVuY3Rpb24gaXNQcm9taXNlKHgpIHtcbiAgICByZXR1cm4geCAmJiB0eXBlb2YgeCA9PT0gJ29iamVjdCcgJiYgeC5zdGF0dXNfICE9PSB1bmRlZmluZWQ7XG4gIH1cbiAgZnVuY3Rpb24gaWRSZXNvbHZlSGFuZGxlcih4KSB7XG4gICAgcmV0dXJuIHg7XG4gIH1cbiAgZnVuY3Rpb24gaWRSZWplY3RIYW5kbGVyKHgpIHtcbiAgICB0aHJvdyB4O1xuICB9XG4gIGZ1bmN0aW9uIGNoYWluKHByb21pc2UpIHtcbiAgICB2YXIgb25SZXNvbHZlID0gYXJndW1lbnRzWzFdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1sxXSA6IGlkUmVzb2x2ZUhhbmRsZXI7XG4gICAgdmFyIG9uUmVqZWN0ID0gYXJndW1lbnRzWzJdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1syXSA6IGlkUmVqZWN0SGFuZGxlcjtcbiAgICB2YXIgZGVmZXJyZWQgPSBnZXREZWZlcnJlZChwcm9taXNlLmNvbnN0cnVjdG9yKTtcbiAgICBzd2l0Y2ggKHByb21pc2Uuc3RhdHVzXykge1xuICAgICAgY2FzZSB1bmRlZmluZWQ6XG4gICAgICAgIHRocm93IFR5cGVFcnJvcjtcbiAgICAgIGNhc2UgMDpcbiAgICAgICAgcHJvbWlzZS5vblJlc29sdmVfLnB1c2gob25SZXNvbHZlLCBkZWZlcnJlZCk7XG4gICAgICAgIHByb21pc2Uub25SZWplY3RfLnB1c2gob25SZWplY3QsIGRlZmVycmVkKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlICsxOlxuICAgICAgICBwcm9taXNlRW5xdWV1ZShwcm9taXNlLnZhbHVlXywgW29uUmVzb2x2ZSwgZGVmZXJyZWRdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIC0xOlxuICAgICAgICBwcm9taXNlRW5xdWV1ZShwcm9taXNlLnZhbHVlXywgW29uUmVqZWN0LCBkZWZlcnJlZF0pO1xuICAgICAgICBicmVhaztcbiAgICB9XG4gICAgcmV0dXJuIGRlZmVycmVkLnByb21pc2U7XG4gIH1cbiAgZnVuY3Rpb24gZ2V0RGVmZXJyZWQoQykge1xuICAgIGlmICh0aGlzID09PSAkUHJvbWlzZSkge1xuICAgICAgdmFyIHByb21pc2UgPSBwcm9taXNlSW5pdChuZXcgJFByb21pc2UocHJvbWlzZVJhdykpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcHJvbWlzZTogcHJvbWlzZSxcbiAgICAgICAgcmVzb2x2ZTogKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICBwcm9taXNlUmVzb2x2ZShwcm9taXNlLCB4KTtcbiAgICAgICAgfSksXG4gICAgICAgIHJlamVjdDogKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgICBwcm9taXNlUmVqZWN0KHByb21pc2UsIHIpO1xuICAgICAgICB9KVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHJlc3VsdCA9IHt9O1xuICAgICAgcmVzdWx0LnByb21pc2UgPSBuZXcgQygoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHJlc3VsdC5yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgICAgcmVzdWx0LnJlamVjdCA9IHJlamVjdDtcbiAgICAgIH0pKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VTZXQocHJvbWlzZSwgc3RhdHVzLCB2YWx1ZSwgb25SZXNvbHZlLCBvblJlamVjdCkge1xuICAgIHByb21pc2Uuc3RhdHVzXyA9IHN0YXR1cztcbiAgICBwcm9taXNlLnZhbHVlXyA9IHZhbHVlO1xuICAgIHByb21pc2Uub25SZXNvbHZlXyA9IG9uUmVzb2x2ZTtcbiAgICBwcm9taXNlLm9uUmVqZWN0XyA9IG9uUmVqZWN0O1xuICAgIHJldHVybiBwcm9taXNlO1xuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VJbml0KHByb21pc2UpIHtcbiAgICByZXR1cm4gcHJvbWlzZVNldChwcm9taXNlLCAwLCB1bmRlZmluZWQsIFtdLCBbXSk7XG4gIH1cbiAgdmFyIFByb21pc2UgPSBmdW5jdGlvbiBQcm9taXNlKHJlc29sdmVyKSB7XG4gICAgaWYgKHJlc29sdmVyID09PSBwcm9taXNlUmF3KVxuICAgICAgcmV0dXJuO1xuICAgIGlmICh0eXBlb2YgcmVzb2x2ZXIgIT09ICdmdW5jdGlvbicpXG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yO1xuICAgIHZhciBwcm9taXNlID0gcHJvbWlzZUluaXQodGhpcyk7XG4gICAgdHJ5IHtcbiAgICAgIHJlc29sdmVyKChmdW5jdGlvbih4KSB7XG4gICAgICAgIHByb21pc2VSZXNvbHZlKHByb21pc2UsIHgpO1xuICAgICAgfSksIChmdW5jdGlvbihyKSB7XG4gICAgICAgIHByb21pc2VSZWplY3QocHJvbWlzZSwgcik7XG4gICAgICB9KSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgcHJvbWlzZVJlamVjdChwcm9taXNlLCBlKTtcbiAgICB9XG4gIH07XG4gICgkdHJhY2V1clJ1bnRpbWUuY3JlYXRlQ2xhc3MpKFByb21pc2UsIHtcbiAgICBjYXRjaDogZnVuY3Rpb24ob25SZWplY3QpIHtcbiAgICAgIHJldHVybiB0aGlzLnRoZW4odW5kZWZpbmVkLCBvblJlamVjdCk7XG4gICAgfSxcbiAgICB0aGVuOiBmdW5jdGlvbihvblJlc29sdmUsIG9uUmVqZWN0KSB7XG4gICAgICBpZiAodHlwZW9mIG9uUmVzb2x2ZSAhPT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgb25SZXNvbHZlID0gaWRSZXNvbHZlSGFuZGxlcjtcbiAgICAgIGlmICh0eXBlb2Ygb25SZWplY3QgIT09ICdmdW5jdGlvbicpXG4gICAgICAgIG9uUmVqZWN0ID0gaWRSZWplY3RIYW5kbGVyO1xuICAgICAgdmFyIHRoYXQgPSB0aGlzO1xuICAgICAgdmFyIGNvbnN0cnVjdG9yID0gdGhpcy5jb25zdHJ1Y3RvcjtcbiAgICAgIHJldHVybiBjaGFpbih0aGlzLCBmdW5jdGlvbih4KSB7XG4gICAgICAgIHggPSBwcm9taXNlQ29lcmNlKGNvbnN0cnVjdG9yLCB4KTtcbiAgICAgICAgcmV0dXJuIHggPT09IHRoYXQgPyBvblJlamVjdChuZXcgVHlwZUVycm9yKSA6IGlzUHJvbWlzZSh4KSA/IHgudGhlbihvblJlc29sdmUsIG9uUmVqZWN0KSA6IG9uUmVzb2x2ZSh4KTtcbiAgICAgIH0sIG9uUmVqZWN0KTtcbiAgICB9XG4gIH0sIHtcbiAgICByZXNvbHZlOiBmdW5jdGlvbih4KSB7XG4gICAgICBpZiAodGhpcyA9PT0gJFByb21pc2UpIHtcbiAgICAgICAgaWYgKGlzUHJvbWlzZSh4KSkge1xuICAgICAgICAgIHJldHVybiB4O1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwcm9taXNlU2V0KG5ldyAkUHJvbWlzZShwcm9taXNlUmF3KSwgKzEsIHgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG5ldyB0aGlzKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIHJlc29sdmUoeCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVqZWN0OiBmdW5jdGlvbihyKSB7XG4gICAgICBpZiAodGhpcyA9PT0gJFByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIHByb21pc2VTZXQobmV3ICRQcm9taXNlKHByb21pc2VSYXcpLCAtMSwgcik7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IHRoaXMoKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgIHJlamVjdChyKTtcbiAgICAgICAgfSkpO1xuICAgICAgfVxuICAgIH0sXG4gICAgYWxsOiBmdW5jdGlvbih2YWx1ZXMpIHtcbiAgICAgIHZhciBkZWZlcnJlZCA9IGdldERlZmVycmVkKHRoaXMpO1xuICAgICAgdmFyIHJlc29sdXRpb25zID0gW107XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgY291bnQgPSB2YWx1ZXMubGVuZ3RoO1xuICAgICAgICBpZiAoY291bnQgPT09IDApIHtcbiAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc29sdXRpb25zKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdGhpcy5yZXNvbHZlKHZhbHVlc1tpXSkudGhlbihmdW5jdGlvbihpLCB4KSB7XG4gICAgICAgICAgICAgIHJlc29sdXRpb25zW2ldID0geDtcbiAgICAgICAgICAgICAgaWYgKC0tY291bnQgPT09IDApXG4gICAgICAgICAgICAgICAgZGVmZXJyZWQucmVzb2x2ZShyZXNvbHV0aW9ucyk7XG4gICAgICAgICAgICB9LmJpbmQodW5kZWZpbmVkLCBpKSwgKGZ1bmN0aW9uKHIpIHtcbiAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHIpO1xuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBkZWZlcnJlZC5yZWplY3QoZSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gZGVmZXJyZWQucHJvbWlzZTtcbiAgICB9LFxuICAgIHJhY2U6IGZ1bmN0aW9uKHZhbHVlcykge1xuICAgICAgdmFyIGRlZmVycmVkID0gZ2V0RGVmZXJyZWQodGhpcyk7XG4gICAgICB0cnkge1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbHVlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgIHRoaXMucmVzb2x2ZSh2YWx1ZXNbaV0pLnRoZW4oKGZ1bmN0aW9uKHgpIHtcbiAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoeCk7XG4gICAgICAgICAgfSksIChmdW5jdGlvbihyKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3Qocik7XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGRlZmVycmVkLnJlamVjdChlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgIH1cbiAgfSk7XG4gIHZhciAkUHJvbWlzZSA9IFByb21pc2U7XG4gIHZhciAkUHJvbWlzZVJlamVjdCA9ICRQcm9taXNlLnJlamVjdDtcbiAgZnVuY3Rpb24gcHJvbWlzZVJlc29sdmUocHJvbWlzZSwgeCkge1xuICAgIHByb21pc2VEb25lKHByb21pc2UsICsxLCB4LCBwcm9taXNlLm9uUmVzb2x2ZV8pO1xuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VSZWplY3QocHJvbWlzZSwgcikge1xuICAgIHByb21pc2VEb25lKHByb21pc2UsIC0xLCByLCBwcm9taXNlLm9uUmVqZWN0Xyk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZURvbmUocHJvbWlzZSwgc3RhdHVzLCB2YWx1ZSwgcmVhY3Rpb25zKSB7XG4gICAgaWYgKHByb21pc2Uuc3RhdHVzXyAhPT0gMClcbiAgICAgIHJldHVybjtcbiAgICBwcm9taXNlRW5xdWV1ZSh2YWx1ZSwgcmVhY3Rpb25zKTtcbiAgICBwcm9taXNlU2V0KHByb21pc2UsIHN0YXR1cywgdmFsdWUpO1xuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VFbnF1ZXVlKHZhbHVlLCB0YXNrcykge1xuICAgIGFzeW5jKChmdW5jdGlvbigpIHtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGFza3MubGVuZ3RoOyBpICs9IDIpIHtcbiAgICAgICAgcHJvbWlzZUhhbmRsZSh2YWx1ZSwgdGFza3NbaV0sIHRhc2tzW2kgKyAxXSk7XG4gICAgICB9XG4gICAgfSkpO1xuICB9XG4gIGZ1bmN0aW9uIHByb21pc2VIYW5kbGUodmFsdWUsIGhhbmRsZXIsIGRlZmVycmVkKSB7XG4gICAgdHJ5IHtcbiAgICAgIHZhciByZXN1bHQgPSBoYW5kbGVyKHZhbHVlKTtcbiAgICAgIGlmIChyZXN1bHQgPT09IGRlZmVycmVkLnByb21pc2UpXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3I7XG4gICAgICBlbHNlIGlmIChpc1Byb21pc2UocmVzdWx0KSlcbiAgICAgICAgY2hhaW4ocmVzdWx0LCBkZWZlcnJlZC5yZXNvbHZlLCBkZWZlcnJlZC5yZWplY3QpO1xuICAgICAgZWxzZVxuICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlc3VsdCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgZGVmZXJyZWQucmVqZWN0KGUpO1xuICAgICAgfSBjYXRjaCAoZSkge31cbiAgICB9XG4gIH1cbiAgdmFyIHRoZW5hYmxlU3ltYm9sID0gJ0BAdGhlbmFibGUnO1xuICBmdW5jdGlvbiBpc09iamVjdCh4KSB7XG4gICAgcmV0dXJuIHggJiYgKHR5cGVvZiB4ID09PSAnb2JqZWN0JyB8fCB0eXBlb2YgeCA9PT0gJ2Z1bmN0aW9uJyk7XG4gIH1cbiAgZnVuY3Rpb24gcHJvbWlzZUNvZXJjZShjb25zdHJ1Y3RvciwgeCkge1xuICAgIGlmICghaXNQcm9taXNlKHgpICYmIGlzT2JqZWN0KHgpKSB7XG4gICAgICB2YXIgdGhlbjtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoZW4gPSB4LnRoZW47XG4gICAgICB9IGNhdGNoIChyKSB7XG4gICAgICAgIHZhciBwcm9taXNlID0gJFByb21pc2VSZWplY3QuY2FsbChjb25zdHJ1Y3Rvciwgcik7XG4gICAgICAgIHhbdGhlbmFibGVTeW1ib2xdID0gcHJvbWlzZTtcbiAgICAgICAgcmV0dXJuIHByb21pc2U7XG4gICAgICB9XG4gICAgICBpZiAodHlwZW9mIHRoZW4gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIHAgPSB4W3RoZW5hYmxlU3ltYm9sXTtcbiAgICAgICAgaWYgKHApIHtcbiAgICAgICAgICByZXR1cm4gcDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB2YXIgZGVmZXJyZWQgPSBnZXREZWZlcnJlZChjb25zdHJ1Y3Rvcik7XG4gICAgICAgICAgeFt0aGVuYWJsZVN5bWJvbF0gPSBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICB0aGVuLmNhbGwoeCwgZGVmZXJyZWQucmVzb2x2ZSwgZGVmZXJyZWQucmVqZWN0KTtcbiAgICAgICAgICB9IGNhdGNoIChyKSB7XG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3Qocik7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiBkZWZlcnJlZC5wcm9taXNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB4O1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsUHJvbWlzZShnbG9iYWwpIHtcbiAgICBpZiAoIWdsb2JhbC5Qcm9taXNlKVxuICAgICAgZ2xvYmFsLlByb21pc2UgPSBQcm9taXNlO1xuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxQcm9taXNlKTtcbiAgcmV0dXJuIHtcbiAgICBnZXQgUHJvbWlzZSgpIHtcbiAgICAgIHJldHVybiBQcm9taXNlO1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsUHJvbWlzZSgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbFByb21pc2U7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvUHJvbWlzZS5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nSXRlcmF0b3IuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyICRfXzI7XG4gIHZhciBfX21vZHVsZU5hbWUgPSBcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZ0l0ZXJhdG9yLmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgY3JlYXRlSXRlcmF0b3JSZXN1bHRPYmplY3QgPSAkX18wLmNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0LFxuICAgICAgaXNPYmplY3QgPSAkX18wLmlzT2JqZWN0O1xuICB2YXIgdG9Qcm9wZXJ0eSA9ICR0cmFjZXVyUnVudGltZS50b1Byb3BlcnR5O1xuICB2YXIgaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuICB2YXIgaXRlcmF0ZWRTdHJpbmcgPSBTeW1ib2woJ2l0ZXJhdGVkU3RyaW5nJyk7XG4gIHZhciBzdHJpbmdJdGVyYXRvck5leHRJbmRleCA9IFN5bWJvbCgnc3RyaW5nSXRlcmF0b3JOZXh0SW5kZXgnKTtcbiAgdmFyIFN0cmluZ0l0ZXJhdG9yID0gZnVuY3Rpb24gU3RyaW5nSXRlcmF0b3IoKSB7fTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoU3RyaW5nSXRlcmF0b3IsICgkX18yID0ge30sIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkX18yLCBcIm5leHRcIiwge1xuICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBvID0gdGhpcztcbiAgICAgIGlmICghaXNPYmplY3QobykgfHwgIWhhc093blByb3BlcnR5LmNhbGwobywgaXRlcmF0ZWRTdHJpbmcpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3RoaXMgbXVzdCBiZSBhIFN0cmluZ0l0ZXJhdG9yIG9iamVjdCcpO1xuICAgICAgfVxuICAgICAgdmFyIHMgPSBvW3RvUHJvcGVydHkoaXRlcmF0ZWRTdHJpbmcpXTtcbiAgICAgIGlmIChzID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHVuZGVmaW5lZCwgdHJ1ZSk7XG4gICAgICB9XG4gICAgICB2YXIgcG9zaXRpb24gPSBvW3RvUHJvcGVydHkoc3RyaW5nSXRlcmF0b3JOZXh0SW5kZXgpXTtcbiAgICAgIHZhciBsZW4gPSBzLmxlbmd0aDtcbiAgICAgIGlmIChwb3NpdGlvbiA+PSBsZW4pIHtcbiAgICAgICAgb1t0b1Byb3BlcnR5KGl0ZXJhdGVkU3RyaW5nKV0gPSB1bmRlZmluZWQ7XG4gICAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCh1bmRlZmluZWQsIHRydWUpO1xuICAgICAgfVxuICAgICAgdmFyIGZpcnN0ID0gcy5jaGFyQ29kZUF0KHBvc2l0aW9uKTtcbiAgICAgIHZhciByZXN1bHRTdHJpbmc7XG4gICAgICBpZiAoZmlyc3QgPCAweEQ4MDAgfHwgZmlyc3QgPiAweERCRkYgfHwgcG9zaXRpb24gKyAxID09PSBsZW4pIHtcbiAgICAgICAgcmVzdWx0U3RyaW5nID0gU3RyaW5nLmZyb21DaGFyQ29kZShmaXJzdCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc2Vjb25kID0gcy5jaGFyQ29kZUF0KHBvc2l0aW9uICsgMSk7XG4gICAgICAgIGlmIChzZWNvbmQgPCAweERDMDAgfHwgc2Vjb25kID4gMHhERkZGKSB7XG4gICAgICAgICAgcmVzdWx0U3RyaW5nID0gU3RyaW5nLmZyb21DaGFyQ29kZShmaXJzdCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0U3RyaW5nID0gU3RyaW5nLmZyb21DaGFyQ29kZShmaXJzdCkgKyBTdHJpbmcuZnJvbUNoYXJDb2RlKHNlY29uZCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIG9bdG9Qcm9wZXJ0eShzdHJpbmdJdGVyYXRvck5leHRJbmRleCldID0gcG9zaXRpb24gKyByZXN1bHRTdHJpbmcubGVuZ3RoO1xuICAgICAgcmV0dXJuIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0KHJlc3VsdFN0cmluZywgZmFsc2UpO1xuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWVcbiAgfSksIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkX18yLCBTeW1ib2wuaXRlcmF0b3IsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlXG4gIH0pLCAkX18yKSwge30pO1xuICBmdW5jdGlvbiBjcmVhdGVTdHJpbmdJdGVyYXRvcihzdHJpbmcpIHtcbiAgICB2YXIgcyA9IFN0cmluZyhzdHJpbmcpO1xuICAgIHZhciBpdGVyYXRvciA9IE9iamVjdC5jcmVhdGUoU3RyaW5nSXRlcmF0b3IucHJvdG90eXBlKTtcbiAgICBpdGVyYXRvclt0b1Byb3BlcnR5KGl0ZXJhdGVkU3RyaW5nKV0gPSBzO1xuICAgIGl0ZXJhdG9yW3RvUHJvcGVydHkoc3RyaW5nSXRlcmF0b3JOZXh0SW5kZXgpXSA9IDA7XG4gICAgcmV0dXJuIGl0ZXJhdG9yO1xuICB9XG4gIHJldHVybiB7Z2V0IGNyZWF0ZVN0cmluZ0l0ZXJhdG9yKCkge1xuICAgICAgcmV0dXJuIGNyZWF0ZVN0cmluZ0l0ZXJhdG9yO1xuICAgIH19O1xufSk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmcuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvU3RyaW5nLmpzXCI7XG4gIHZhciBjcmVhdGVTdHJpbmdJdGVyYXRvciA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9TdHJpbmdJdGVyYXRvci5qc1wiKS5jcmVhdGVTdHJpbmdJdGVyYXRvcjtcbiAgdmFyICRfXzEgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvdXRpbHMuanNcIiksXG4gICAgICBtYXliZUFkZEZ1bmN0aW9ucyA9ICRfXzEubWF5YmVBZGRGdW5jdGlvbnMsXG4gICAgICBtYXliZUFkZEl0ZXJhdG9yID0gJF9fMS5tYXliZUFkZEl0ZXJhdG9yLFxuICAgICAgcmVnaXN0ZXJQb2x5ZmlsbCA9ICRfXzEucmVnaXN0ZXJQb2x5ZmlsbDtcbiAgdmFyICR0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG4gIHZhciAkaW5kZXhPZiA9IFN0cmluZy5wcm90b3R5cGUuaW5kZXhPZjtcbiAgdmFyICRsYXN0SW5kZXhPZiA9IFN0cmluZy5wcm90b3R5cGUubGFzdEluZGV4T2Y7XG4gIGZ1bmN0aW9uIHN0YXJ0c1dpdGgoc2VhcmNoKSB7XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICBpZiAodGhpcyA9PSBudWxsIHx8ICR0b1N0cmluZy5jYWxsKHNlYXJjaCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgc2VhcmNoU3RyaW5nID0gU3RyaW5nKHNlYXJjaCk7XG4gICAgdmFyIHNlYXJjaExlbmd0aCA9IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHBvc2l0aW9uID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB1bmRlZmluZWQ7XG4gICAgdmFyIHBvcyA9IHBvc2l0aW9uID8gTnVtYmVyKHBvc2l0aW9uKSA6IDA7XG4gICAgaWYgKGlzTmFOKHBvcykpIHtcbiAgICAgIHBvcyA9IDA7XG4gICAgfVxuICAgIHZhciBzdGFydCA9IE1hdGgubWluKE1hdGgubWF4KHBvcywgMCksIHN0cmluZ0xlbmd0aCk7XG4gICAgcmV0dXJuICRpbmRleE9mLmNhbGwoc3RyaW5nLCBzZWFyY2hTdHJpbmcsIHBvcykgPT0gc3RhcnQ7XG4gIH1cbiAgZnVuY3Rpb24gZW5kc1dpdGgoc2VhcmNoKSB7XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICBpZiAodGhpcyA9PSBudWxsIHx8ICR0b1N0cmluZy5jYWxsKHNlYXJjaCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgc2VhcmNoU3RyaW5nID0gU3RyaW5nKHNlYXJjaCk7XG4gICAgdmFyIHNlYXJjaExlbmd0aCA9IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHBvcyA9IHN0cmluZ0xlbmd0aDtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+IDEpIHtcbiAgICAgIHZhciBwb3NpdGlvbiA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChwb3NpdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBvcyA9IHBvc2l0aW9uID8gTnVtYmVyKHBvc2l0aW9uKSA6IDA7XG4gICAgICAgIGlmIChpc05hTihwb3MpKSB7XG4gICAgICAgICAgcG9zID0gMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICB2YXIgZW5kID0gTWF0aC5taW4oTWF0aC5tYXgocG9zLCAwKSwgc3RyaW5nTGVuZ3RoKTtcbiAgICB2YXIgc3RhcnQgPSBlbmQgLSBzZWFyY2hMZW5ndGg7XG4gICAgaWYgKHN0YXJ0IDwgMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gJGxhc3RJbmRleE9mLmNhbGwoc3RyaW5nLCBzZWFyY2hTdHJpbmcsIHN0YXJ0KSA9PSBzdGFydDtcbiAgfVxuICBmdW5jdGlvbiBpbmNsdWRlcyhzZWFyY2gpIHtcbiAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoKTtcbiAgICB9XG4gICAgdmFyIHN0cmluZyA9IFN0cmluZyh0aGlzKTtcbiAgICBpZiAoc2VhcmNoICYmICR0b1N0cmluZy5jYWxsKHNlYXJjaCkgPT0gJ1tvYmplY3QgUmVnRXhwXScpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nTGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcbiAgICB2YXIgc2VhcmNoU3RyaW5nID0gU3RyaW5nKHNlYXJjaCk7XG4gICAgdmFyIHNlYXJjaExlbmd0aCA9IHNlYXJjaFN0cmluZy5sZW5ndGg7XG4gICAgdmFyIHBvc2l0aW9uID0gYXJndW1lbnRzLmxlbmd0aCA+IDEgPyBhcmd1bWVudHNbMV0gOiB1bmRlZmluZWQ7XG4gICAgdmFyIHBvcyA9IHBvc2l0aW9uID8gTnVtYmVyKHBvc2l0aW9uKSA6IDA7XG4gICAgaWYgKHBvcyAhPSBwb3MpIHtcbiAgICAgIHBvcyA9IDA7XG4gICAgfVxuICAgIHZhciBzdGFydCA9IE1hdGgubWluKE1hdGgubWF4KHBvcywgMCksIHN0cmluZ0xlbmd0aCk7XG4gICAgaWYgKHNlYXJjaExlbmd0aCArIHN0YXJ0ID4gc3RyaW5nTGVuZ3RoKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiAkaW5kZXhPZi5jYWxsKHN0cmluZywgc2VhcmNoU3RyaW5nLCBwb3MpICE9IC0xO1xuICB9XG4gIGZ1bmN0aW9uIHJlcGVhdChjb3VudCkge1xuICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICB2YXIgc3RyaW5nID0gU3RyaW5nKHRoaXMpO1xuICAgIHZhciBuID0gY291bnQgPyBOdW1iZXIoY291bnQpIDogMDtcbiAgICBpZiAoaXNOYU4obikpIHtcbiAgICAgIG4gPSAwO1xuICAgIH1cbiAgICBpZiAobiA8IDAgfHwgbiA9PSBJbmZpbml0eSkge1xuICAgICAgdGhyb3cgUmFuZ2VFcnJvcigpO1xuICAgIH1cbiAgICBpZiAobiA9PSAwKSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICAgIHZhciByZXN1bHQgPSAnJztcbiAgICB3aGlsZSAobi0tKSB7XG4gICAgICByZXN1bHQgKz0gc3RyaW5nO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG4gIGZ1bmN0aW9uIGNvZGVQb2ludEF0KHBvc2l0aW9uKSB7XG4gICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCk7XG4gICAgfVxuICAgIHZhciBzdHJpbmcgPSBTdHJpbmcodGhpcyk7XG4gICAgdmFyIHNpemUgPSBzdHJpbmcubGVuZ3RoO1xuICAgIHZhciBpbmRleCA9IHBvc2l0aW9uID8gTnVtYmVyKHBvc2l0aW9uKSA6IDA7XG4gICAgaWYgKGlzTmFOKGluZGV4KSkge1xuICAgICAgaW5kZXggPSAwO1xuICAgIH1cbiAgICBpZiAoaW5kZXggPCAwIHx8IGluZGV4ID49IHNpemUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHZhciBmaXJzdCA9IHN0cmluZy5jaGFyQ29kZUF0KGluZGV4KTtcbiAgICB2YXIgc2Vjb25kO1xuICAgIGlmIChmaXJzdCA+PSAweEQ4MDAgJiYgZmlyc3QgPD0gMHhEQkZGICYmIHNpemUgPiBpbmRleCArIDEpIHtcbiAgICAgIHNlY29uZCA9IHN0cmluZy5jaGFyQ29kZUF0KGluZGV4ICsgMSk7XG4gICAgICBpZiAoc2Vjb25kID49IDB4REMwMCAmJiBzZWNvbmQgPD0gMHhERkZGKSB7XG4gICAgICAgIHJldHVybiAoZmlyc3QgLSAweEQ4MDApICogMHg0MDAgKyBzZWNvbmQgLSAweERDMDAgKyAweDEwMDAwO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmlyc3Q7XG4gIH1cbiAgZnVuY3Rpb24gcmF3KGNhbGxzaXRlKSB7XG4gICAgdmFyIHJhdyA9IGNhbGxzaXRlLnJhdztcbiAgICB2YXIgbGVuID0gcmF3Lmxlbmd0aCA+Pj4gMDtcbiAgICBpZiAobGVuID09PSAwKVxuICAgICAgcmV0dXJuICcnO1xuICAgIHZhciBzID0gJyc7XG4gICAgdmFyIGkgPSAwO1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBzICs9IHJhd1tpXTtcbiAgICAgIGlmIChpICsgMSA9PT0gbGVuKVxuICAgICAgICByZXR1cm4gcztcbiAgICAgIHMgKz0gYXJndW1lbnRzWysraV07XG4gICAgfVxuICB9XG4gIGZ1bmN0aW9uIGZyb21Db2RlUG9pbnQoKSB7XG4gICAgdmFyIGNvZGVVbml0cyA9IFtdO1xuICAgIHZhciBmbG9vciA9IE1hdGguZmxvb3I7XG4gICAgdmFyIGhpZ2hTdXJyb2dhdGU7XG4gICAgdmFyIGxvd1N1cnJvZ2F0ZTtcbiAgICB2YXIgaW5kZXggPSAtMTtcbiAgICB2YXIgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBpZiAoIWxlbmd0aCkge1xuICAgICAgcmV0dXJuICcnO1xuICAgIH1cbiAgICB3aGlsZSAoKytpbmRleCA8IGxlbmd0aCkge1xuICAgICAgdmFyIGNvZGVQb2ludCA9IE51bWJlcihhcmd1bWVudHNbaW5kZXhdKTtcbiAgICAgIGlmICghaXNGaW5pdGUoY29kZVBvaW50KSB8fCBjb2RlUG9pbnQgPCAwIHx8IGNvZGVQb2ludCA+IDB4MTBGRkZGIHx8IGZsb29yKGNvZGVQb2ludCkgIT0gY29kZVBvaW50KSB7XG4gICAgICAgIHRocm93IFJhbmdlRXJyb3IoJ0ludmFsaWQgY29kZSBwb2ludDogJyArIGNvZGVQb2ludCk7XG4gICAgICB9XG4gICAgICBpZiAoY29kZVBvaW50IDw9IDB4RkZGRikge1xuICAgICAgICBjb2RlVW5pdHMucHVzaChjb2RlUG9pbnQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29kZVBvaW50IC09IDB4MTAwMDA7XG4gICAgICAgIGhpZ2hTdXJyb2dhdGUgPSAoY29kZVBvaW50ID4+IDEwKSArIDB4RDgwMDtcbiAgICAgICAgbG93U3Vycm9nYXRlID0gKGNvZGVQb2ludCAlIDB4NDAwKSArIDB4REMwMDtcbiAgICAgICAgY29kZVVuaXRzLnB1c2goaGlnaFN1cnJvZ2F0ZSwgbG93U3Vycm9nYXRlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkobnVsbCwgY29kZVVuaXRzKTtcbiAgfVxuICBmdW5jdGlvbiBzdHJpbmdQcm90b3R5cGVJdGVyYXRvcigpIHtcbiAgICB2YXIgbyA9ICR0cmFjZXVyUnVudGltZS5jaGVja09iamVjdENvZXJjaWJsZSh0aGlzKTtcbiAgICB2YXIgcyA9IFN0cmluZyhvKTtcbiAgICByZXR1cm4gY3JlYXRlU3RyaW5nSXRlcmF0b3Iocyk7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxTdHJpbmcoZ2xvYmFsKSB7XG4gICAgdmFyIFN0cmluZyA9IGdsb2JhbC5TdHJpbmc7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoU3RyaW5nLnByb3RvdHlwZSwgWydjb2RlUG9pbnRBdCcsIGNvZGVQb2ludEF0LCAnZW5kc1dpdGgnLCBlbmRzV2l0aCwgJ2luY2x1ZGVzJywgaW5jbHVkZXMsICdyZXBlYXQnLCByZXBlYXQsICdzdGFydHNXaXRoJywgc3RhcnRzV2l0aF0pO1xuICAgIG1heWJlQWRkRnVuY3Rpb25zKFN0cmluZywgWydmcm9tQ29kZVBvaW50JywgZnJvbUNvZGVQb2ludCwgJ3JhdycsIHJhd10pO1xuICAgIG1heWJlQWRkSXRlcmF0b3IoU3RyaW5nLnByb3RvdHlwZSwgc3RyaW5nUHJvdG90eXBlSXRlcmF0b3IsIFN5bWJvbCk7XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbFN0cmluZyk7XG4gIHJldHVybiB7XG4gICAgZ2V0IHN0YXJ0c1dpdGgoKSB7XG4gICAgICByZXR1cm4gc3RhcnRzV2l0aDtcbiAgICB9LFxuICAgIGdldCBlbmRzV2l0aCgpIHtcbiAgICAgIHJldHVybiBlbmRzV2l0aDtcbiAgICB9LFxuICAgIGdldCBpbmNsdWRlcygpIHtcbiAgICAgIHJldHVybiBpbmNsdWRlcztcbiAgICB9LFxuICAgIGdldCByZXBlYXQoKSB7XG4gICAgICByZXR1cm4gcmVwZWF0O1xuICAgIH0sXG4gICAgZ2V0IGNvZGVQb2ludEF0KCkge1xuICAgICAgcmV0dXJuIGNvZGVQb2ludEF0O1xuICAgIH0sXG4gICAgZ2V0IHJhdygpIHtcbiAgICAgIHJldHVybiByYXc7XG4gICAgfSxcbiAgICBnZXQgZnJvbUNvZGVQb2ludCgpIHtcbiAgICAgIHJldHVybiBmcm9tQ29kZVBvaW50O1xuICAgIH0sXG4gICAgZ2V0IHN0cmluZ1Byb3RvdHlwZUl0ZXJhdG9yKCkge1xuICAgICAgcmV0dXJuIHN0cmluZ1Byb3RvdHlwZUl0ZXJhdG9yO1xuICAgIH0sXG4gICAgZ2V0IHBvbHlmaWxsU3RyaW5nKCkge1xuICAgICAgcmV0dXJuIHBvbHlmaWxsU3RyaW5nO1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL1N0cmluZy5qc1wiICsgJycpO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvQXJyYXlJdGVyYXRvci5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgJF9fMjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvQXJyYXlJdGVyYXRvci5qc1wiO1xuICB2YXIgJF9fMCA9IFN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy91dGlscy5qc1wiKSxcbiAgICAgIHRvT2JqZWN0ID0gJF9fMC50b09iamVjdCxcbiAgICAgIHRvVWludDMyID0gJF9fMC50b1VpbnQzMixcbiAgICAgIGNyZWF0ZUl0ZXJhdG9yUmVzdWx0T2JqZWN0ID0gJF9fMC5jcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdDtcbiAgdmFyIEFSUkFZX0lURVJBVE9SX0tJTkRfS0VZUyA9IDE7XG4gIHZhciBBUlJBWV9JVEVSQVRPUl9LSU5EX1ZBTFVFUyA9IDI7XG4gIHZhciBBUlJBWV9JVEVSQVRPUl9LSU5EX0VOVFJJRVMgPSAzO1xuICB2YXIgQXJyYXlJdGVyYXRvciA9IGZ1bmN0aW9uIEFycmF5SXRlcmF0b3IoKSB7fTtcbiAgKCR0cmFjZXVyUnVudGltZS5jcmVhdGVDbGFzcykoQXJyYXlJdGVyYXRvciwgKCRfXzIgPSB7fSwgT2JqZWN0LmRlZmluZVByb3BlcnR5KCRfXzIsIFwibmV4dFwiLCB7XG4gICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGl0ZXJhdG9yID0gdG9PYmplY3QodGhpcyk7XG4gICAgICB2YXIgYXJyYXkgPSBpdGVyYXRvci5pdGVyYXRvck9iamVjdF87XG4gICAgICBpZiAoIWFycmF5KSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ09iamVjdCBpcyBub3QgYW4gQXJyYXlJdGVyYXRvcicpO1xuICAgICAgfVxuICAgICAgdmFyIGluZGV4ID0gaXRlcmF0b3IuYXJyYXlJdGVyYXRvck5leHRJbmRleF87XG4gICAgICB2YXIgaXRlbUtpbmQgPSBpdGVyYXRvci5hcnJheUl0ZXJhdGlvbktpbmRfO1xuICAgICAgdmFyIGxlbmd0aCA9IHRvVWludDMyKGFycmF5Lmxlbmd0aCk7XG4gICAgICBpZiAoaW5kZXggPj0gbGVuZ3RoKSB7XG4gICAgICAgIGl0ZXJhdG9yLmFycmF5SXRlcmF0b3JOZXh0SW5kZXhfID0gSW5maW5pdHk7XG4gICAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdCh1bmRlZmluZWQsIHRydWUpO1xuICAgICAgfVxuICAgICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRvck5leHRJbmRleF8gPSBpbmRleCArIDE7XG4gICAgICBpZiAoaXRlbUtpbmQgPT0gQVJSQVlfSVRFUkFUT1JfS0lORF9WQUxVRVMpXG4gICAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdChhcnJheVtpbmRleF0sIGZhbHNlKTtcbiAgICAgIGlmIChpdGVtS2luZCA9PSBBUlJBWV9JVEVSQVRPUl9LSU5EX0VOVFJJRVMpXG4gICAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdChbaW5kZXgsIGFycmF5W2luZGV4XV0sIGZhbHNlKTtcbiAgICAgIHJldHVybiBjcmVhdGVJdGVyYXRvclJlc3VsdE9iamVjdChpbmRleCwgZmFsc2UpO1xuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgd3JpdGFibGU6IHRydWVcbiAgfSksIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSgkX18yLCBTeW1ib2wuaXRlcmF0b3IsIHtcbiAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LFxuICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgIHdyaXRhYmxlOiB0cnVlXG4gIH0pLCAkX18yKSwge30pO1xuICBmdW5jdGlvbiBjcmVhdGVBcnJheUl0ZXJhdG9yKGFycmF5LCBraW5kKSB7XG4gICAgdmFyIG9iamVjdCA9IHRvT2JqZWN0KGFycmF5KTtcbiAgICB2YXIgaXRlcmF0b3IgPSBuZXcgQXJyYXlJdGVyYXRvcjtcbiAgICBpdGVyYXRvci5pdGVyYXRvck9iamVjdF8gPSBvYmplY3Q7XG4gICAgaXRlcmF0b3IuYXJyYXlJdGVyYXRvck5leHRJbmRleF8gPSAwO1xuICAgIGl0ZXJhdG9yLmFycmF5SXRlcmF0aW9uS2luZF8gPSBraW5kO1xuICAgIHJldHVybiBpdGVyYXRvcjtcbiAgfVxuICBmdW5jdGlvbiBlbnRyaWVzKCkge1xuICAgIHJldHVybiBjcmVhdGVBcnJheUl0ZXJhdG9yKHRoaXMsIEFSUkFZX0lURVJBVE9SX0tJTkRfRU5UUklFUyk7XG4gIH1cbiAgZnVuY3Rpb24ga2V5cygpIHtcbiAgICByZXR1cm4gY3JlYXRlQXJyYXlJdGVyYXRvcih0aGlzLCBBUlJBWV9JVEVSQVRPUl9LSU5EX0tFWVMpO1xuICB9XG4gIGZ1bmN0aW9uIHZhbHVlcygpIHtcbiAgICByZXR1cm4gY3JlYXRlQXJyYXlJdGVyYXRvcih0aGlzLCBBUlJBWV9JVEVSQVRPUl9LSU5EX1ZBTFVFUyk7XG4gIH1cbiAgcmV0dXJuIHtcbiAgICBnZXQgZW50cmllcygpIHtcbiAgICAgIHJldHVybiBlbnRyaWVzO1xuICAgIH0sXG4gICAgZ2V0IGtleXMoKSB7XG4gICAgICByZXR1cm4ga2V5cztcbiAgICB9LFxuICAgIGdldCB2YWx1ZXMoKSB7XG4gICAgICByZXR1cm4gdmFsdWVzO1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLnJlZ2lzdGVyTW9kdWxlKFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvQXJyYXkuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvQXJyYXkuanNcIjtcbiAgdmFyICRfXzAgPSBTeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvQXJyYXlJdGVyYXRvci5qc1wiKSxcbiAgICAgIGVudHJpZXMgPSAkX18wLmVudHJpZXMsXG4gICAgICBrZXlzID0gJF9fMC5rZXlzLFxuICAgICAgdmFsdWVzID0gJF9fMC52YWx1ZXM7XG4gIHZhciAkX18xID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgY2hlY2tJdGVyYWJsZSA9ICRfXzEuY2hlY2tJdGVyYWJsZSxcbiAgICAgIGlzQ2FsbGFibGUgPSAkX18xLmlzQ2FsbGFibGUsXG4gICAgICBpc0NvbnN0cnVjdG9yID0gJF9fMS5pc0NvbnN0cnVjdG9yLFxuICAgICAgbWF5YmVBZGRGdW5jdGlvbnMgPSAkX18xLm1heWJlQWRkRnVuY3Rpb25zLFxuICAgICAgbWF5YmVBZGRJdGVyYXRvciA9ICRfXzEubWF5YmVBZGRJdGVyYXRvcixcbiAgICAgIHJlZ2lzdGVyUG9seWZpbGwgPSAkX18xLnJlZ2lzdGVyUG9seWZpbGwsXG4gICAgICB0b0ludGVnZXIgPSAkX18xLnRvSW50ZWdlcixcbiAgICAgIHRvTGVuZ3RoID0gJF9fMS50b0xlbmd0aCxcbiAgICAgIHRvT2JqZWN0ID0gJF9fMS50b09iamVjdDtcbiAgZnVuY3Rpb24gZnJvbShhcnJMaWtlKSB7XG4gICAgdmFyIG1hcEZuID0gYXJndW1lbnRzWzFdO1xuICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzJdO1xuICAgIHZhciBDID0gdGhpcztcbiAgICB2YXIgaXRlbXMgPSB0b09iamVjdChhcnJMaWtlKTtcbiAgICB2YXIgbWFwcGluZyA9IG1hcEZuICE9PSB1bmRlZmluZWQ7XG4gICAgdmFyIGsgPSAwO1xuICAgIHZhciBhcnIsXG4gICAgICAgIGxlbjtcbiAgICBpZiAobWFwcGluZyAmJiAhaXNDYWxsYWJsZShtYXBGbikpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICBpZiAoY2hlY2tJdGVyYWJsZShpdGVtcykpIHtcbiAgICAgIGFyciA9IGlzQ29uc3RydWN0b3IoQykgPyBuZXcgQygpIDogW107XG4gICAgICBmb3IgKHZhciAkX18yID0gaXRlbXNbJHRyYWNldXJSdW50aW1lLnRvUHJvcGVydHkoU3ltYm9sLml0ZXJhdG9yKV0oKSxcbiAgICAgICAgICAkX18zOyAhKCRfXzMgPSAkX18yLm5leHQoKSkuZG9uZTsgKSB7XG4gICAgICAgIHZhciBpdGVtID0gJF9fMy52YWx1ZTtcbiAgICAgICAge1xuICAgICAgICAgIGlmIChtYXBwaW5nKSB7XG4gICAgICAgICAgICBhcnJba10gPSBtYXBGbi5jYWxsKHRoaXNBcmcsIGl0ZW0sIGspO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhcnJba10gPSBpdGVtO1xuICAgICAgICAgIH1cbiAgICAgICAgICBrKys7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFyci5sZW5ndGggPSBrO1xuICAgICAgcmV0dXJuIGFycjtcbiAgICB9XG4gICAgbGVuID0gdG9MZW5ndGgoaXRlbXMubGVuZ3RoKTtcbiAgICBhcnIgPSBpc0NvbnN0cnVjdG9yKEMpID8gbmV3IEMobGVuKSA6IG5ldyBBcnJheShsZW4pO1xuICAgIGZvciAoOyBrIDwgbGVuOyBrKyspIHtcbiAgICAgIGlmIChtYXBwaW5nKSB7XG4gICAgICAgIGFycltrXSA9IHR5cGVvZiB0aGlzQXJnID09PSAndW5kZWZpbmVkJyA/IG1hcEZuKGl0ZW1zW2tdLCBrKSA6IG1hcEZuLmNhbGwodGhpc0FyZywgaXRlbXNba10sIGspO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgYXJyW2tdID0gaXRlbXNba107XG4gICAgICB9XG4gICAgfVxuICAgIGFyci5sZW5ndGggPSBsZW47XG4gICAgcmV0dXJuIGFycjtcbiAgfVxuICBmdW5jdGlvbiBvZigpIHtcbiAgICBmb3IgKHZhciBpdGVtcyA9IFtdLFxuICAgICAgICAkX180ID0gMDsgJF9fNCA8IGFyZ3VtZW50cy5sZW5ndGg7ICRfXzQrKylcbiAgICAgIGl0ZW1zWyRfXzRdID0gYXJndW1lbnRzWyRfXzRdO1xuICAgIHZhciBDID0gdGhpcztcbiAgICB2YXIgbGVuID0gaXRlbXMubGVuZ3RoO1xuICAgIHZhciBhcnIgPSBpc0NvbnN0cnVjdG9yKEMpID8gbmV3IEMobGVuKSA6IG5ldyBBcnJheShsZW4pO1xuICAgIGZvciAodmFyIGsgPSAwOyBrIDwgbGVuOyBrKyspIHtcbiAgICAgIGFycltrXSA9IGl0ZW1zW2tdO1xuICAgIH1cbiAgICBhcnIubGVuZ3RoID0gbGVuO1xuICAgIHJldHVybiBhcnI7XG4gIH1cbiAgZnVuY3Rpb24gZmlsbCh2YWx1ZSkge1xuICAgIHZhciBzdGFydCA9IGFyZ3VtZW50c1sxXSAhPT0gKHZvaWQgMCkgPyBhcmd1bWVudHNbMV0gOiAwO1xuICAgIHZhciBlbmQgPSBhcmd1bWVudHNbMl07XG4gICAgdmFyIG9iamVjdCA9IHRvT2JqZWN0KHRoaXMpO1xuICAgIHZhciBsZW4gPSB0b0xlbmd0aChvYmplY3QubGVuZ3RoKTtcbiAgICB2YXIgZmlsbFN0YXJ0ID0gdG9JbnRlZ2VyKHN0YXJ0KTtcbiAgICB2YXIgZmlsbEVuZCA9IGVuZCAhPT0gdW5kZWZpbmVkID8gdG9JbnRlZ2VyKGVuZCkgOiBsZW47XG4gICAgZmlsbFN0YXJ0ID0gZmlsbFN0YXJ0IDwgMCA/IE1hdGgubWF4KGxlbiArIGZpbGxTdGFydCwgMCkgOiBNYXRoLm1pbihmaWxsU3RhcnQsIGxlbik7XG4gICAgZmlsbEVuZCA9IGZpbGxFbmQgPCAwID8gTWF0aC5tYXgobGVuICsgZmlsbEVuZCwgMCkgOiBNYXRoLm1pbihmaWxsRW5kLCBsZW4pO1xuICAgIHdoaWxlIChmaWxsU3RhcnQgPCBmaWxsRW5kKSB7XG4gICAgICBvYmplY3RbZmlsbFN0YXJ0XSA9IHZhbHVlO1xuICAgICAgZmlsbFN0YXJ0Kys7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3Q7XG4gIH1cbiAgZnVuY3Rpb24gZmluZChwcmVkaWNhdGUpIHtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICByZXR1cm4gZmluZEhlbHBlcih0aGlzLCBwcmVkaWNhdGUsIHRoaXNBcmcpO1xuICB9XG4gIGZ1bmN0aW9uIGZpbmRJbmRleChwcmVkaWNhdGUpIHtcbiAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcbiAgICByZXR1cm4gZmluZEhlbHBlcih0aGlzLCBwcmVkaWNhdGUsIHRoaXNBcmcsIHRydWUpO1xuICB9XG4gIGZ1bmN0aW9uIGZpbmRIZWxwZXIoc2VsZiwgcHJlZGljYXRlKSB7XG4gICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMl07XG4gICAgdmFyIHJldHVybkluZGV4ID0gYXJndW1lbnRzWzNdICE9PSAodm9pZCAwKSA/IGFyZ3VtZW50c1szXSA6IGZhbHNlO1xuICAgIHZhciBvYmplY3QgPSB0b09iamVjdChzZWxmKTtcbiAgICB2YXIgbGVuID0gdG9MZW5ndGgob2JqZWN0Lmxlbmd0aCk7XG4gICAgaWYgKCFpc0NhbGxhYmxlKHByZWRpY2F0ZSkpIHtcbiAgICAgIHRocm93IFR5cGVFcnJvcigpO1xuICAgIH1cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICB2YXIgdmFsdWUgPSBvYmplY3RbaV07XG4gICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywgdmFsdWUsIGksIG9iamVjdCkpIHtcbiAgICAgICAgcmV0dXJuIHJldHVybkluZGV4ID8gaSA6IHZhbHVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmV0dXJuSW5kZXggPyAtMSA6IHVuZGVmaW5lZDtcbiAgfVxuICBmdW5jdGlvbiBwb2x5ZmlsbEFycmF5KGdsb2JhbCkge1xuICAgIHZhciAkX181ID0gZ2xvYmFsLFxuICAgICAgICBBcnJheSA9ICRfXzUuQXJyYXksXG4gICAgICAgIE9iamVjdCA9ICRfXzUuT2JqZWN0LFxuICAgICAgICBTeW1ib2wgPSAkX181LlN5bWJvbDtcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhBcnJheS5wcm90b3R5cGUsIFsnZW50cmllcycsIGVudHJpZXMsICdrZXlzJywga2V5cywgJ3ZhbHVlcycsIHZhbHVlcywgJ2ZpbGwnLCBmaWxsLCAnZmluZCcsIGZpbmQsICdmaW5kSW5kZXgnLCBmaW5kSW5kZXhdKTtcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhBcnJheSwgWydmcm9tJywgZnJvbSwgJ29mJywgb2ZdKTtcbiAgICBtYXliZUFkZEl0ZXJhdG9yKEFycmF5LnByb3RvdHlwZSwgdmFsdWVzLCBTeW1ib2wpO1xuICAgIG1heWJlQWRkSXRlcmF0b3IoT2JqZWN0LmdldFByb3RvdHlwZU9mKFtdLnZhbHVlcygpKSwgZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9LCBTeW1ib2wpO1xuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxBcnJheSk7XG4gIHJldHVybiB7XG4gICAgZ2V0IGZyb20oKSB7XG4gICAgICByZXR1cm4gZnJvbTtcbiAgICB9LFxuICAgIGdldCBvZigpIHtcbiAgICAgIHJldHVybiBvZjtcbiAgICB9LFxuICAgIGdldCBmaWxsKCkge1xuICAgICAgcmV0dXJuIGZpbGw7XG4gICAgfSxcbiAgICBnZXQgZmluZCgpIHtcbiAgICAgIHJldHVybiBmaW5kO1xuICAgIH0sXG4gICAgZ2V0IGZpbmRJbmRleCgpIHtcbiAgICAgIHJldHVybiBmaW5kSW5kZXg7XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxBcnJheSgpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbEFycmF5O1xuICAgIH1cbiAgfTtcbn0pO1xuU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL0FycmF5LmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9PYmplY3QuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvT2JqZWN0LmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgbWF5YmVBZGRGdW5jdGlvbnMgPSAkX18wLm1heWJlQWRkRnVuY3Rpb25zLFxuICAgICAgcmVnaXN0ZXJQb2x5ZmlsbCA9ICRfXzAucmVnaXN0ZXJQb2x5ZmlsbDtcbiAgdmFyICRfXzEgPSAkdHJhY2V1clJ1bnRpbWUsXG4gICAgICBkZWZpbmVQcm9wZXJ0eSA9ICRfXzEuZGVmaW5lUHJvcGVydHksXG4gICAgICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPSAkX18xLmdldE93blByb3BlcnR5RGVzY3JpcHRvcixcbiAgICAgIGdldE93blByb3BlcnR5TmFtZXMgPSAkX18xLmdldE93blByb3BlcnR5TmFtZXMsXG4gICAgICBpc1ByaXZhdGVOYW1lID0gJF9fMS5pc1ByaXZhdGVOYW1lLFxuICAgICAga2V5cyA9ICRfXzEua2V5cztcbiAgZnVuY3Rpb24gaXMobGVmdCwgcmlnaHQpIHtcbiAgICBpZiAobGVmdCA9PT0gcmlnaHQpXG4gICAgICByZXR1cm4gbGVmdCAhPT0gMCB8fCAxIC8gbGVmdCA9PT0gMSAvIHJpZ2h0O1xuICAgIHJldHVybiBsZWZ0ICE9PSBsZWZ0ICYmIHJpZ2h0ICE9PSByaWdodDtcbiAgfVxuICBmdW5jdGlvbiBhc3NpZ24odGFyZ2V0KSB7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICB2YXIgcHJvcHMgPSBzb3VyY2UgPT0gbnVsbCA/IFtdIDoga2V5cyhzb3VyY2UpO1xuICAgICAgdmFyIHAsXG4gICAgICAgICAgbGVuZ3RoID0gcHJvcHMubGVuZ3RoO1xuICAgICAgZm9yIChwID0gMDsgcCA8IGxlbmd0aDsgcCsrKSB7XG4gICAgICAgIHZhciBuYW1lID0gcHJvcHNbcF07XG4gICAgICAgIGlmIChpc1ByaXZhdGVOYW1lKG5hbWUpKVxuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB0YXJnZXRbbmFtZV0gPSBzb3VyY2VbbmFtZV07XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cbiAgZnVuY3Rpb24gbWl4aW4odGFyZ2V0LCBzb3VyY2UpIHtcbiAgICB2YXIgcHJvcHMgPSBnZXRPd25Qcm9wZXJ0eU5hbWVzKHNvdXJjZSk7XG4gICAgdmFyIHAsXG4gICAgICAgIGRlc2NyaXB0b3IsXG4gICAgICAgIGxlbmd0aCA9IHByb3BzLmxlbmd0aDtcbiAgICBmb3IgKHAgPSAwOyBwIDwgbGVuZ3RoOyBwKyspIHtcbiAgICAgIHZhciBuYW1lID0gcHJvcHNbcF07XG4gICAgICBpZiAoaXNQcml2YXRlTmFtZShuYW1lKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBkZXNjcmlwdG9yID0gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHNvdXJjZSwgcHJvcHNbcF0pO1xuICAgICAgZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBwcm9wc1twXSwgZGVzY3JpcHRvcik7XG4gICAgfVxuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cbiAgZnVuY3Rpb24gcG9seWZpbGxPYmplY3QoZ2xvYmFsKSB7XG4gICAgdmFyIE9iamVjdCA9IGdsb2JhbC5PYmplY3Q7XG4gICAgbWF5YmVBZGRGdW5jdGlvbnMoT2JqZWN0LCBbJ2Fzc2lnbicsIGFzc2lnbiwgJ2lzJywgaXMsICdtaXhpbicsIG1peGluXSk7XG4gIH1cbiAgcmVnaXN0ZXJQb2x5ZmlsbChwb2x5ZmlsbE9iamVjdCk7XG4gIHJldHVybiB7XG4gICAgZ2V0IGlzKCkge1xuICAgICAgcmV0dXJuIGlzO1xuICAgIH0sXG4gICAgZ2V0IGFzc2lnbigpIHtcbiAgICAgIHJldHVybiBhc3NpZ247XG4gICAgfSxcbiAgICBnZXQgbWl4aW4oKSB7XG4gICAgICByZXR1cm4gbWl4aW47XG4gICAgfSxcbiAgICBnZXQgcG9seWZpbGxPYmplY3QoKSB7XG4gICAgICByZXR1cm4gcG9seWZpbGxPYmplY3Q7XG4gICAgfVxuICB9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvT2JqZWN0LmpzXCIgKyAnJyk7XG5TeXN0ZW0ucmVnaXN0ZXJNb2R1bGUoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9OdW1iZXIuanNcIiwgW10sIGZ1bmN0aW9uKCkge1xuICBcInVzZSBzdHJpY3RcIjtcbiAgdmFyIF9fbW9kdWxlTmFtZSA9IFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvTnVtYmVyLmpzXCI7XG4gIHZhciAkX18wID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLFxuICAgICAgaXNOdW1iZXIgPSAkX18wLmlzTnVtYmVyLFxuICAgICAgbWF5YmVBZGRDb25zdHMgPSAkX18wLm1heWJlQWRkQ29uc3RzLFxuICAgICAgbWF5YmVBZGRGdW5jdGlvbnMgPSAkX18wLm1heWJlQWRkRnVuY3Rpb25zLFxuICAgICAgcmVnaXN0ZXJQb2x5ZmlsbCA9ICRfXzAucmVnaXN0ZXJQb2x5ZmlsbCxcbiAgICAgIHRvSW50ZWdlciA9ICRfXzAudG9JbnRlZ2VyO1xuICB2YXIgJGFicyA9IE1hdGguYWJzO1xuICB2YXIgJGlzRmluaXRlID0gaXNGaW5pdGU7XG4gIHZhciAkaXNOYU4gPSBpc05hTjtcbiAgdmFyIE1BWF9TQUZFX0lOVEVHRVIgPSBNYXRoLnBvdygyLCA1MykgLSAxO1xuICB2YXIgTUlOX1NBRkVfSU5URUdFUiA9IC1NYXRoLnBvdygyLCA1MykgKyAxO1xuICB2YXIgRVBTSUxPTiA9IE1hdGgucG93KDIsIC01Mik7XG4gIGZ1bmN0aW9uIE51bWJlcklzRmluaXRlKG51bWJlcikge1xuICAgIHJldHVybiBpc051bWJlcihudW1iZXIpICYmICRpc0Zpbml0ZShudW1iZXIpO1xuICB9XG4gIDtcbiAgZnVuY3Rpb24gaXNJbnRlZ2VyKG51bWJlcikge1xuICAgIHJldHVybiBOdW1iZXJJc0Zpbml0ZShudW1iZXIpICYmIHRvSW50ZWdlcihudW1iZXIpID09PSBudW1iZXI7XG4gIH1cbiAgZnVuY3Rpb24gTnVtYmVySXNOYU4obnVtYmVyKSB7XG4gICAgcmV0dXJuIGlzTnVtYmVyKG51bWJlcikgJiYgJGlzTmFOKG51bWJlcik7XG4gIH1cbiAgO1xuICBmdW5jdGlvbiBpc1NhZmVJbnRlZ2VyKG51bWJlcikge1xuICAgIGlmIChOdW1iZXJJc0Zpbml0ZShudW1iZXIpKSB7XG4gICAgICB2YXIgaW50ZWdyYWwgPSB0b0ludGVnZXIobnVtYmVyKTtcbiAgICAgIGlmIChpbnRlZ3JhbCA9PT0gbnVtYmVyKVxuICAgICAgICByZXR1cm4gJGFicyhpbnRlZ3JhbCkgPD0gTUFYX1NBRkVfSU5URUdFUjtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGZ1bmN0aW9uIHBvbHlmaWxsTnVtYmVyKGdsb2JhbCkge1xuICAgIHZhciBOdW1iZXIgPSBnbG9iYWwuTnVtYmVyO1xuICAgIG1heWJlQWRkQ29uc3RzKE51bWJlciwgWydNQVhfU0FGRV9JTlRFR0VSJywgTUFYX1NBRkVfSU5URUdFUiwgJ01JTl9TQUZFX0lOVEVHRVInLCBNSU5fU0FGRV9JTlRFR0VSLCAnRVBTSUxPTicsIEVQU0lMT05dKTtcbiAgICBtYXliZUFkZEZ1bmN0aW9ucyhOdW1iZXIsIFsnaXNGaW5pdGUnLCBOdW1iZXJJc0Zpbml0ZSwgJ2lzSW50ZWdlcicsIGlzSW50ZWdlciwgJ2lzTmFOJywgTnVtYmVySXNOYU4sICdpc1NhZmVJbnRlZ2VyJywgaXNTYWZlSW50ZWdlcl0pO1xuICB9XG4gIHJlZ2lzdGVyUG9seWZpbGwocG9seWZpbGxOdW1iZXIpO1xuICByZXR1cm4ge1xuICAgIGdldCBNQVhfU0FGRV9JTlRFR0VSKCkge1xuICAgICAgcmV0dXJuIE1BWF9TQUZFX0lOVEVHRVI7XG4gICAgfSxcbiAgICBnZXQgTUlOX1NBRkVfSU5URUdFUigpIHtcbiAgICAgIHJldHVybiBNSU5fU0FGRV9JTlRFR0VSO1xuICAgIH0sXG4gICAgZ2V0IEVQU0lMT04oKSB7XG4gICAgICByZXR1cm4gRVBTSUxPTjtcbiAgICB9LFxuICAgIGdldCBpc0Zpbml0ZSgpIHtcbiAgICAgIHJldHVybiBOdW1iZXJJc0Zpbml0ZTtcbiAgICB9LFxuICAgIGdldCBpc0ludGVnZXIoKSB7XG4gICAgICByZXR1cm4gaXNJbnRlZ2VyO1xuICAgIH0sXG4gICAgZ2V0IGlzTmFOKCkge1xuICAgICAgcmV0dXJuIE51bWJlcklzTmFOO1xuICAgIH0sXG4gICAgZ2V0IGlzU2FmZUludGVnZXIoKSB7XG4gICAgICByZXR1cm4gaXNTYWZlSW50ZWdlcjtcbiAgICB9LFxuICAgIGdldCBwb2x5ZmlsbE51bWJlcigpIHtcbiAgICAgIHJldHVybiBwb2x5ZmlsbE51bWJlcjtcbiAgICB9XG4gIH07XG59KTtcblN5c3RlbS5nZXQoXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9OdW1iZXIuanNcIiArICcnKTtcblN5c3RlbS5yZWdpc3Rlck1vZHVsZShcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3BvbHlmaWxscy5qc1wiLCBbXSwgZnVuY3Rpb24oKSB7XG4gIFwidXNlIHN0cmljdFwiO1xuICB2YXIgX19tb2R1bGVOYW1lID0gXCJ0cmFjZXVyLXJ1bnRpbWVAMC4wLjc5L3NyYy9ydW50aW1lL3BvbHlmaWxscy9wb2x5ZmlsbHMuanNcIjtcbiAgdmFyIHBvbHlmaWxsQWxsID0gU3lzdGVtLmdldChcInRyYWNldXItcnVudGltZUAwLjAuNzkvc3JjL3J1bnRpbWUvcG9seWZpbGxzL3V0aWxzLmpzXCIpLnBvbHlmaWxsQWxsO1xuICBwb2x5ZmlsbEFsbChSZWZsZWN0Lmdsb2JhbCk7XG4gIHZhciBzZXR1cEdsb2JhbHMgPSAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzO1xuICAkdHJhY2V1clJ1bnRpbWUuc2V0dXBHbG9iYWxzID0gZnVuY3Rpb24oZ2xvYmFsKSB7XG4gICAgc2V0dXBHbG9iYWxzKGdsb2JhbCk7XG4gICAgcG9seWZpbGxBbGwoZ2xvYmFsKTtcbiAgfTtcbiAgcmV0dXJuIHt9O1xufSk7XG5TeXN0ZW0uZ2V0KFwidHJhY2V1ci1ydW50aW1lQDAuMC43OS9zcmMvcnVudGltZS9wb2x5ZmlsbHMvcG9seWZpbGxzLmpzXCIgKyAnJyk7XG5cbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpLHR5cGVvZiBnbG9iYWwgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWwgOiB0eXBlb2Ygc2VsZiAhPT0gXCJ1bmRlZmluZWRcIiA/IHNlbGYgOiB0eXBlb2Ygd2luZG93ICE9PSBcInVuZGVmaW5lZFwiID8gd2luZG93IDoge30pXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldDp1dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbTV2WkdWZmJXOWtkV3hsY3k5MGNtRmpaWFZ5TDJKcGJpOTBjbUZqWlhWeUxYSjFiblJwYldVdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklqdEJRVUZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CSWl3aVptbHNaU0k2SW1kbGJtVnlZWFJsWkM1cWN5SXNJbk52ZFhKalpWSnZiM1FpT2lJaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SW9ablZ1WTNScGIyNG9aMnh2WW1Gc0tTQjdYRzRnSUNkMWMyVWdjM1J5YVdOMEp6dGNiaUFnYVdZZ0tHZHNiMkpoYkM0a2RISmhZMlYxY2xKMWJuUnBiV1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNDdYRzRnSUgxY2JpQWdkbUZ5SUNSUFltcGxZM1FnUFNCUFltcGxZM1E3WEc0Z0lIWmhjaUFrVkhsd1pVVnljbTl5SUQwZ1ZIbHdaVVZ5Y205eU8xeHVJQ0IyWVhJZ0pHTnlaV0YwWlNBOUlDUlBZbXBsWTNRdVkzSmxZWFJsTzF4dUlDQjJZWElnSkdSbFptbHVaVkJ5YjNCbGNuUnBaWE1nUFNBa1QySnFaV04wTG1SbFptbHVaVkJ5YjNCbGNuUnBaWE03WEc0Z0lIWmhjaUFrWkdWbWFXNWxVSEp2Y0dWeWRIa2dQU0FrVDJKcVpXTjBMbVJsWm1sdVpWQnliM0JsY25SNU8xeHVJQ0IyWVhJZ0pHWnlaV1Y2WlNBOUlDUlBZbXBsWTNRdVpuSmxaWHBsTzF4dUlDQjJZWElnSkdkbGRFOTNibEJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaUE5SUNSUFltcGxZM1F1WjJWMFQzZHVVSEp2Y0dWeWRIbEVaWE5qY21sd2RHOXlPMXh1SUNCMllYSWdKR2RsZEU5M2JsQnliM0JsY25SNVRtRnRaWE1nUFNBa1QySnFaV04wTG1kbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNN1hHNGdJSFpoY2lBa2EyVjVjeUE5SUNSUFltcGxZM1F1YTJWNWN6dGNiaUFnZG1GeUlDUm9ZWE5QZDI1UWNtOXdaWEowZVNBOUlDUlBZbXBsWTNRdWNISnZkRzkwZVhCbExtaGhjMDkzYmxCeWIzQmxjblI1TzF4dUlDQjJZWElnSkhSdlUzUnlhVzVuSUQwZ0pFOWlhbVZqZEM1d2NtOTBiM1I1Y0dVdWRHOVRkSEpwYm1jN1hHNGdJSFpoY2lBa2NISmxkbVZ1ZEVWNGRHVnVjMmx2Ym5NZ1BTQlBZbXBsWTNRdWNISmxkbVZ1ZEVWNGRHVnVjMmx2Ym5NN1hHNGdJSFpoY2lBa2MyVmhiQ0E5SUU5aWFtVmpkQzV6WldGc08xeHVJQ0IyWVhJZ0pHbHpSWGgwWlc1emFXSnNaU0E5SUU5aWFtVmpkQzVwYzBWNGRHVnVjMmxpYkdVN1hHNGdJR1oxYm1OMGFXOXVJRzV2YmtWdWRXMG9kbUZzZFdVcElIdGNiaUFnSUNCeVpYUjFjbTRnZTF4dUlDQWdJQ0FnWTI5dVptbG5kWEpoWW14bE9pQjBjblZsTEZ4dUlDQWdJQ0FnWlc1MWJXVnlZV0pzWlRvZ1ptRnNjMlVzWEc0Z0lDQWdJQ0IyWVd4MVpUb2dkbUZzZFdVc1hHNGdJQ0FnSUNCM2NtbDBZV0pzWlRvZ2RISjFaVnh1SUNBZ0lIMDdYRzRnSUgxY2JpQWdkbUZ5SUcxbGRHaHZaQ0E5SUc1dmJrVnVkVzA3WEc0Z0lIWmhjaUJqYjNWdWRHVnlJRDBnTUR0Y2JpQWdablZ1WTNScGIyNGdibVYzVlc1cGNYVmxVM1J5YVc1bktDa2dlMXh1SUNBZ0lISmxkSFZ5YmlBblgxOGtKeUFySUUxaGRHZ3VabXh2YjNJb1RXRjBhQzV5WVc1a2IyMG9LU0FxSURGbE9Ta2dLeUFuSkNjZ0t5QXJLMk52ZFc1MFpYSWdLeUFuSkY5Zkp6dGNiaUFnZlZ4dUlDQjJZWElnYzNsdFltOXNTVzUwWlhKdVlXeFFjbTl3WlhKMGVTQTlJRzVsZDFWdWFYRjFaVk4wY21sdVp5Z3BPMXh1SUNCMllYSWdjM2x0WW05c1JHVnpZM0pwY0hScGIyNVFjbTl3WlhKMGVTQTlJRzVsZDFWdWFYRjFaVk4wY21sdVp5Z3BPMXh1SUNCMllYSWdjM2x0WW05c1JHRjBZVkJ5YjNCbGNuUjVJRDBnYm1WM1ZXNXBjWFZsVTNSeWFXNW5LQ2s3WEc0Z0lIWmhjaUJ6ZVcxaWIyeFdZV3gxWlhNZ1BTQWtZM0psWVhSbEtHNTFiR3dwTzF4dUlDQjJZWElnY0hKcGRtRjBaVTVoYldWeklEMGdKR055WldGMFpTaHVkV3hzS1R0Y2JpQWdablZ1WTNScGIyNGdhWE5RY21sMllYUmxUbUZ0WlNoektTQjdYRzRnSUNBZ2NtVjBkWEp1SUhCeWFYWmhkR1ZPWVcxbGMxdHpYVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJqY21WaGRHVlFjbWwyWVhSbFRtRnRaU2dwSUh0Y2JpQWdJQ0IyWVhJZ2N5QTlJRzVsZDFWdWFYRjFaVk4wY21sdVp5Z3BPMXh1SUNBZ0lIQnlhWFpoZEdWT1lXMWxjMXR6WFNBOUlIUnlkV1U3WEc0Z0lDQWdjbVYwZFhKdUlITTdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdhWE5UYUdsdFUzbHRZbTlzS0hONWJXSnZiQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQjBlWEJsYjJZZ2MzbHRZbTlzSUQwOVBTQW5iMkpxWldOMEp5QW1KaUJ6ZVcxaWIyd2dhVzV6ZEdGdVkyVnZaaUJUZVcxaWIyeFdZV3gxWlR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCMGVYQmxUMllvZGlrZ2UxeHVJQ0FnSUdsbUlDaHBjMU5vYVcxVGVXMWliMndvZGlrcFhHNGdJQ0FnSUNCeVpYUjFjbTRnSjNONWJXSnZiQ2M3WEc0Z0lDQWdjbVYwZFhKdUlIUjVjR1Z2WmlCMk8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlGTjViV0p2YkNoa1pYTmpjbWx3ZEdsdmJpa2dlMXh1SUNBZ0lIWmhjaUIyWVd4MVpTQTlJRzVsZHlCVGVXMWliMnhXWVd4MVpTaGtaWE5qY21sd2RHbHZiaWs3WEc0Z0lDQWdhV1lnS0NFb2RHaHBjeUJwYm5OMFlXNWpaVzltSUZONWJXSnZiQ2twWEc0Z0lDQWdJQ0J5WlhSMWNtNGdkbUZzZFdVN1hHNGdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblUzbHRZbTlzSUdOaGJtNXZkQ0JpWlNCdVpYZGNYQ2RsWkNjcE8xeHVJQ0I5WEc0Z0lDUmtaV1pwYm1WUWNtOXdaWEowZVNoVGVXMWliMnd1Y0hKdmRHOTBlWEJsTENBblkyOXVjM1J5ZFdOMGIzSW5MQ0J1YjI1RmJuVnRLRk41YldKdmJDa3BPMXh1SUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvVTNsdFltOXNMbkJ5YjNSdmRIbHdaU3dnSjNSdlUzUnlhVzVuSnl3Z2JXVjBhRzlrS0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUhaaGNpQnplVzFpYjJ4V1lXeDFaU0E5SUhSb2FYTmJjM2x0WW05c1JHRjBZVkJ5YjNCbGNuUjVYVHRjYmlBZ0lDQnBaaUFvSVdkbGRFOXdkR2x2YmlnbmMzbHRZbTlzY3ljcEtWeHVJQ0FnSUNBZ2NtVjBkWEp1SUhONWJXSnZiRlpoYkhWbFczTjViV0p2YkVsdWRHVnlibUZzVUhKdmNHVnlkSGxkTzF4dUlDQWdJR2xtSUNnaGMzbHRZbTlzVm1Gc2RXVXBYRzRnSUNBZ0lDQjBhSEp2ZHlCVWVYQmxSWEp5YjNJb0owTnZiblpsY25OcGIyNGdabkp2YlNCemVXMWliMndnZEc4Z2MzUnlhVzVuSnlrN1hHNGdJQ0FnZG1GeUlHUmxjMk1nUFNCemVXMWliMnhXWVd4MVpWdHplVzFpYjJ4RVpYTmpjbWx3ZEdsdmJsQnliM0JsY25SNVhUdGNiaUFnSUNCcFppQW9aR1Z6WXlBOVBUMGdkVzVrWldacGJtVmtLVnh1SUNBZ0lDQWdaR1Z6WXlBOUlDY25PMXh1SUNBZ0lISmxkSFZ5YmlBblUzbHRZbTlzS0NjZ0t5QmtaWE5qSUNzZ0p5a25PMXh1SUNCOUtTazdYRzRnSUNSa1pXWnBibVZRY205d1pYSjBlU2hUZVcxaWIyd3VjSEp2ZEc5MGVYQmxMQ0FuZG1Gc2RXVlBaaWNzSUcxbGRHaHZaQ2htZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0IyWVhJZ2MzbHRZbTlzVm1Gc2RXVWdQU0IwYUdselczTjViV0p2YkVSaGRHRlFjbTl3WlhKMGVWMDdYRzRnSUNBZ2FXWWdLQ0Z6ZVcxaWIyeFdZV3gxWlNsY2JpQWdJQ0FnSUhSb2NtOTNJRlI1Y0dWRmNuSnZjaWduUTI5dWRtVnljMmx2YmlCbWNtOXRJSE41YldKdmJDQjBieUJ6ZEhKcGJtY25LVHRjYmlBZ0lDQnBaaUFvSVdkbGRFOXdkR2x2YmlnbmMzbHRZbTlzY3ljcEtWeHVJQ0FnSUNBZ2NtVjBkWEp1SUhONWJXSnZiRlpoYkhWbFczTjViV0p2YkVsdWRHVnlibUZzVUhKdmNHVnlkSGxkTzF4dUlDQWdJSEpsZEhWeWJpQnplVzFpYjJ4V1lXeDFaVHRjYmlBZ2ZTa3BPMXh1SUNCbWRXNWpkR2x2YmlCVGVXMWliMnhXWVd4MVpTaGtaWE5qY21sd2RHbHZiaWtnZTF4dUlDQWdJSFpoY2lCclpYa2dQU0J1WlhkVmJtbHhkV1ZUZEhKcGJtY29LVHRjYmlBZ0lDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb2RHaHBjeXdnYzNsdFltOXNSR0YwWVZCeWIzQmxjblI1TENCN2RtRnNkV1U2SUhSb2FYTjlLVHRjYmlBZ0lDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb2RHaHBjeXdnYzNsdFltOXNTVzUwWlhKdVlXeFFjbTl3WlhKMGVTd2dlM1poYkhWbE9pQnJaWGw5S1R0Y2JpQWdJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29kR2hwY3l3Z2MzbHRZbTlzUkdWelkzSnBjSFJwYjI1UWNtOXdaWEowZVN3Z2UzWmhiSFZsT2lCa1pYTmpjbWx3ZEdsdmJuMHBPMXh1SUNBZ0lHWnlaV1Y2WlNoMGFHbHpLVHRjYmlBZ0lDQnplVzFpYjJ4V1lXeDFaWE5iYTJWNVhTQTlJSFJvYVhNN1hHNGdJSDFjYmlBZ0pHUmxabWx1WlZCeWIzQmxjblI1S0ZONWJXSnZiRlpoYkhWbExuQnliM1J2ZEhsd1pTd2dKMk52Ym5OMGNuVmpkRzl5Snl3Z2JtOXVSVzUxYlNoVGVXMWliMndwS1R0Y2JpQWdKR1JsWm1sdVpWQnliM0JsY25SNUtGTjViV0p2YkZaaGJIVmxMbkJ5YjNSdmRIbHdaU3dnSjNSdlUzUnlhVzVuSnl3Z2UxeHVJQ0FnSUhaaGJIVmxPaUJUZVcxaWIyd3VjSEp2ZEc5MGVYQmxMblJ2VTNSeWFXNW5MRnh1SUNBZ0lHVnVkVzFsY21GaWJHVTZJR1poYkhObFhHNGdJSDBwTzF4dUlDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb1UzbHRZbTlzVm1Gc2RXVXVjSEp2ZEc5MGVYQmxMQ0FuZG1Gc2RXVlBaaWNzSUh0Y2JpQWdJQ0IyWVd4MVpUb2dVM2x0WW05c0xuQnliM1J2ZEhsd1pTNTJZV3gxWlU5bUxGeHVJQ0FnSUdWdWRXMWxjbUZpYkdVNklHWmhiSE5sWEc0Z0lIMHBPMXh1SUNCMllYSWdhR0Z6YUZCeWIzQmxjblI1SUQwZ1kzSmxZWFJsVUhKcGRtRjBaVTVoYldVb0tUdGNiaUFnZG1GeUlHaGhjMmhRY205d1pYSjBlVVJsYzJOeWFYQjBiM0lnUFNCN2RtRnNkV1U2SUhWdVpHVm1hVzVsWkgwN1hHNGdJSFpoY2lCb1lYTm9UMkpxWldOMFVISnZjR1Z5ZEdsbGN5QTlJSHRjYmlBZ0lDQm9ZWE5vT2lCN2RtRnNkV1U2SUhWdVpHVm1hVzVsWkgwc1hHNGdJQ0FnYzJWc1pqb2dlM1poYkhWbE9pQjFibVJsWm1sdVpXUjlYRzRnSUgwN1hHNGdJSFpoY2lCb1lYTm9RMjkxYm5SbGNpQTlJREE3WEc0Z0lHWjFibU4wYVc5dUlHZGxkRTkzYmtoaGMyaFBZbXBsWTNRb2IySnFaV04wS1NCN1hHNGdJQ0FnZG1GeUlHaGhjMmhQWW1wbFkzUWdQU0J2WW1wbFkzUmJhR0Z6YUZCeWIzQmxjblI1WFR0Y2JpQWdJQ0JwWmlBb2FHRnphRTlpYW1WamRDQW1KaUJvWVhOb1QySnFaV04wTG5ObGJHWWdQVDA5SUc5aWFtVmpkQ2xjYmlBZ0lDQWdJSEpsZEhWeWJpQm9ZWE5vVDJKcVpXTjBPMXh1SUNBZ0lHbG1JQ2drYVhORmVIUmxibk5wWW14bEtHOWlhbVZqZENrcElIdGNiaUFnSUNBZ0lHaGhjMmhQWW1wbFkzUlFjbTl3WlhKMGFXVnpMbWhoYzJndWRtRnNkV1VnUFNCb1lYTm9RMjkxYm5SbGNpc3JPMXh1SUNBZ0lDQWdhR0Z6YUU5aWFtVmpkRkJ5YjNCbGNuUnBaWE11YzJWc1ppNTJZV3gxWlNBOUlHOWlhbVZqZER0Y2JpQWdJQ0FnSUdoaGMyaFFjbTl3WlhKMGVVUmxjMk55YVhCMGIzSXVkbUZzZFdVZ1BTQWtZM0psWVhSbEtHNTFiR3dzSUdoaGMyaFBZbXBsWTNSUWNtOXdaWEowYVdWektUdGNiaUFnSUNBZ0lDUmtaV1pwYm1WUWNtOXdaWEowZVNodlltcGxZM1FzSUdoaGMyaFFjbTl3WlhKMGVTd2dhR0Z6YUZCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2lrN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYUdGemFGQnliM0JsY25SNVJHVnpZM0pwY0hSdmNpNTJZV3gxWlR0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlIVnVaR1ZtYVc1bFpEdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQm1jbVZsZW1Vb2IySnFaV04wS1NCN1hHNGdJQ0FnWjJWMFQzZHVTR0Z6YUU5aWFtVmpkQ2h2WW1wbFkzUXBPMXh1SUNBZ0lISmxkSFZ5YmlBa1puSmxaWHBsTG1Gd2NHeDVLSFJvYVhNc0lHRnlaM1Z0Wlc1MGN5azdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjSEpsZG1WdWRFVjRkR1Z1YzJsdmJuTW9iMkpxWldOMEtTQjdYRzRnSUNBZ1oyVjBUM2R1U0dGemFFOWlhbVZqZENodlltcGxZM1FwTzF4dUlDQWdJSEpsZEhWeWJpQWtjSEpsZG1WdWRFVjRkR1Z1YzJsdmJuTXVZWEJ3Ykhrb2RHaHBjeXdnWVhKbmRXMWxiblJ6S1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCelpXRnNLRzlpYW1WamRDa2dlMXh1SUNBZ0lHZGxkRTkzYmtoaGMyaFBZbXBsWTNRb2IySnFaV04wS1R0Y2JpQWdJQ0J5WlhSMWNtNGdKSE5sWVd3dVlYQndiSGtvZEdocGN5d2dZWEpuZFcxbGJuUnpLVHRjYmlBZ2ZWeHVJQ0JtY21WbGVtVW9VM2x0WW05c1ZtRnNkV1V1Y0hKdmRHOTBlWEJsS1R0Y2JpQWdablZ1WTNScGIyNGdhWE5UZVcxaWIyeFRkSEpwYm1jb2N5a2dlMXh1SUNBZ0lISmxkSFZ5YmlCemVXMWliMnhXWVd4MVpYTmJjMTBnZkh3Z2NISnBkbUYwWlU1aGJXVnpXM05kTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUhSdlVISnZjR1Z5ZEhrb2JtRnRaU2tnZTF4dUlDQWdJR2xtSUNocGMxTm9hVzFUZVcxaWIyd29ibUZ0WlNrcFhHNGdJQ0FnSUNCeVpYUjFjbTRnYm1GdFpWdHplVzFpYjJ4SmJuUmxjbTVoYkZCeWIzQmxjblI1WFR0Y2JpQWdJQ0J5WlhSMWNtNGdibUZ0WlR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCeVpXMXZkbVZUZVcxaWIyeExaWGx6S0dGeWNtRjVLU0I3WEc0Z0lDQWdkbUZ5SUhKMklEMGdXMTA3WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0JoY25KaGVTNXNaVzVuZEdnN0lHa3JLeWtnZTF4dUlDQWdJQ0FnYVdZZ0tDRnBjMU41YldKdmJGTjBjbWx1WnloaGNuSmhlVnRwWFNrcElIdGNiaUFnSUNBZ0lDQWdjbll1Y0hWemFDaGhjbkpoZVZ0cFhTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ5ZGp0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCblpYUlBkMjVRY205d1pYSjBlVTVoYldWektHOWlhbVZqZENrZ2UxeHVJQ0FnSUhKbGRIVnliaUJ5WlcxdmRtVlRlVzFpYjJ4TFpYbHpLQ1JuWlhSUGQyNVFjbTl3WlhKMGVVNWhiV1Z6S0c5aWFtVmpkQ2twTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUd0bGVYTW9iMkpxWldOMEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUhKbGJXOTJaVk41YldKdmJFdGxlWE1vSkd0bGVYTW9iMkpxWldOMEtTazdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdaMlYwVDNkdVVISnZjR1Z5ZEhsVGVXMWliMnh6S0c5aWFtVmpkQ2tnZTF4dUlDQWdJSFpoY2lCeWRpQTlJRnRkTzF4dUlDQWdJSFpoY2lCdVlXMWxjeUE5SUNSblpYUlBkMjVRY205d1pYSjBlVTVoYldWektHOWlhbVZqZENrN1hHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCdVlXMWxjeTVzWlc1bmRHZzdJR2tyS3lrZ2UxeHVJQ0FnSUNBZ2RtRnlJSE41YldKdmJDQTlJSE41YldKdmJGWmhiSFZsYzF0dVlXMWxjMXRwWFYwN1hHNGdJQ0FnSUNCcFppQW9jM2x0WW05c0tTQjdYRzRnSUNBZ0lDQWdJSEoyTG5CMWMyZ29jM2x0WW05c0tUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSEoyTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdkbGRFOTNibEJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaWh2WW1wbFkzUXNJRzVoYldVcElIdGNiaUFnSUNCeVpYUjFjbTRnSkdkbGRFOTNibEJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaWh2WW1wbFkzUXNJSFJ2VUhKdmNHVnlkSGtvYm1GdFpTa3BPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR2hoYzA5M2JsQnliM0JsY25SNUtHNWhiV1VwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdKR2hoYzA5M2JsQnliM0JsY25SNUxtTmhiR3dvZEdocGN5d2dkRzlRY205d1pYSjBlU2h1WVcxbEtTazdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdaMlYwVDNCMGFXOXVLRzVoYldVcElIdGNiaUFnSUNCeVpYUjFjbTRnWjJ4dlltRnNMblJ5WVdObGRYSWdKaVlnWjJ4dlltRnNMblJ5WVdObGRYSXViM0IwYVc5dWMxdHVZVzFsWFR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCa1pXWnBibVZRY205d1pYSjBlU2h2WW1wbFkzUXNJRzVoYldVc0lHUmxjMk55YVhCMGIzSXBJSHRjYmlBZ0lDQnBaaUFvYVhOVGFHbHRVM2x0WW05c0tHNWhiV1VwS1NCN1hHNGdJQ0FnSUNCdVlXMWxJRDBnYm1GdFpWdHplVzFpYjJ4SmJuUmxjbTVoYkZCeWIzQmxjblI1WFR0Y2JpQWdJQ0I5WEc0Z0lDQWdKR1JsWm1sdVpWQnliM0JsY25SNUtHOWlhbVZqZEN3Z2JtRnRaU3dnWkdWelkzSnBjSFJ2Y2lrN1hHNGdJQ0FnY21WMGRYSnVJRzlpYW1WamREdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQndiMng1Wm1sc2JFOWlhbVZqZENoUFltcGxZM1FwSUh0Y2JpQWdJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29UMkpxWldOMExDQW5aR1ZtYVc1bFVISnZjR1Z5ZEhrbkxDQjdkbUZzZFdVNklHUmxabWx1WlZCeWIzQmxjblI1ZlNrN1hHNGdJQ0FnSkdSbFptbHVaVkJ5YjNCbGNuUjVLRTlpYW1WamRDd2dKMmRsZEU5M2JsQnliM0JsY25SNVRtRnRaWE1uTENCN2RtRnNkV1U2SUdkbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhOOUtUdGNiaUFnSUNBa1pHVm1hVzVsVUhKdmNHVnlkSGtvVDJKcVpXTjBMQ0FuWjJWMFQzZHVVSEp2Y0dWeWRIbEVaWE5qY21sd2RHOXlKeXdnZTNaaGJIVmxPaUJuWlhSUGQyNVFjbTl3WlhKMGVVUmxjMk55YVhCMGIzSjlLVHRjYmlBZ0lDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb1QySnFaV04wTG5CeWIzUnZkSGx3WlN3Z0oyaGhjMDkzYmxCeWIzQmxjblI1Snl3Z2UzWmhiSFZsT2lCb1lYTlBkMjVRY205d1pYSjBlWDBwTzF4dUlDQWdJQ1JrWldacGJtVlFjbTl3WlhKMGVTaFBZbXBsWTNRc0lDZG1jbVZsZW1VbkxDQjdkbUZzZFdVNklHWnlaV1Y2WlgwcE8xeHVJQ0FnSUNSa1pXWnBibVZRY205d1pYSjBlU2hQWW1wbFkzUXNJQ2R3Y21WMlpXNTBSWGgwWlc1emFXOXVjeWNzSUh0MllXeDFaVG9nY0hKbGRtVnVkRVY0ZEdWdWMybHZibk45S1R0Y2JpQWdJQ0FrWkdWbWFXNWxVSEp2Y0dWeWRIa29UMkpxWldOMExDQW5jMlZoYkNjc0lIdDJZV3gxWlRvZ2MyVmhiSDBwTzF4dUlDQWdJQ1JrWldacGJtVlFjbTl3WlhKMGVTaFBZbXBsWTNRc0lDZHJaWGx6Snl3Z2UzWmhiSFZsT2lCclpYbHpmU2s3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWlhod2IzSjBVM1JoY2lodlltcGxZM1FwSUh0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Uc2dhU0E4SUdGeVozVnRaVzUwY3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdkbUZ5SUc1aGJXVnpJRDBnSkdkbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNb1lYSm5kVzFsYm5SelcybGRLVHRjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJR29nUFNBd095QnFJRHdnYm1GdFpYTXViR1Z1WjNSb095QnFLeXNwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJRzVoYldVZ1BTQnVZVzFsYzF0cVhUdGNiaUFnSUNBZ0lDQWdhV1lnS0dselUzbHRZbTlzVTNSeWFXNW5LRzVoYldVcEtWeHVJQ0FnSUNBZ0lDQWdJR052Ym5ScGJuVmxPMXh1SUNBZ0lDQWdJQ0FvWm5WdVkzUnBiMjRvYlc5a0xDQnVZVzFsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdKR1JsWm1sdVpWQnliM0JsY25SNUtHOWlhbVZqZEN3Z2JtRnRaU3dnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdaMlYwT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUcxdlpGdHVZVzFsWFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJSDBzWEc0Z0lDQWdJQ0FnSUNBZ0lDQmxiblZ0WlhKaFlteGxPaUIwY25WbFhHNGdJQ0FnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0FnSUgwcEtHRnlaM1Z0Wlc1MGMxdHBYU3dnYm1GdFpYTmJhbDBwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z2IySnFaV04wTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdselQySnFaV04wS0hncElIdGNiaUFnSUNCeVpYUjFjbTRnZUNBaFBTQnVkV3hzSUNZbUlDaDBlWEJsYjJZZ2VDQTlQVDBnSjI5aWFtVmpkQ2NnZkh3Z2RIbHdaVzltSUhnZ1BUMDlJQ2RtZFc1amRHbHZiaWNwTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUhSdlQySnFaV04wS0hncElIdGNiaUFnSUNCcFppQW9lQ0E5UFNCdWRXeHNLVnh1SUNBZ0lDQWdkR2h5YjNjZ0pGUjVjR1ZGY25KdmNpZ3BPMXh1SUNBZ0lISmxkSFZ5YmlBa1QySnFaV04wS0hncE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHTm9aV05yVDJKcVpXTjBRMjlsY21OcFlteGxLR0Z5WjNWdFpXNTBLU0I3WEc0Z0lDQWdhV1lnS0dGeVozVnRaVzUwSUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0oxWmhiSFZsSUdOaGJtNXZkQ0JpWlNCamIyNTJaWEowWldRZ2RHOGdZVzRnVDJKcVpXTjBKeWs3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCaGNtZDFiV1Z1ZER0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCd2IyeDVabWxzYkZONWJXSnZiQ2huYkc5aVlXd3NJRk41YldKdmJDa2dlMXh1SUNBZ0lHbG1JQ2doWjJ4dlltRnNMbE41YldKdmJDa2dlMXh1SUNBZ0lDQWdaMnh2WW1Gc0xsTjViV0p2YkNBOUlGTjViV0p2YkR0Y2JpQWdJQ0FnSUU5aWFtVmpkQzVuWlhSUGQyNVFjbTl3WlhKMGVWTjViV0p2YkhNZ1BTQm5aWFJQZDI1UWNtOXdaWEowZVZONWJXSnZiSE03WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2doWjJ4dlltRnNMbE41YldKdmJDNXBkR1Z5WVhSdmNpa2dlMXh1SUNBZ0lDQWdaMnh2WW1Gc0xsTjViV0p2YkM1cGRHVnlZWFJ2Y2lBOUlGTjViV0p2YkNnblUzbHRZbTlzTG1sMFpYSmhkRzl5SnlrN1hHNGdJQ0FnZlZ4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUhObGRIVndSMnh2WW1Gc2N5aG5iRzlpWVd3cElIdGNiaUFnSUNCd2IyeDVabWxzYkZONWJXSnZiQ2huYkc5aVlXd3NJRk41YldKdmJDazdYRzRnSUNBZ1oyeHZZbUZzTGxKbFpteGxZM1FnUFNCbmJHOWlZV3d1VW1WbWJHVmpkQ0I4ZkNCN2ZUdGNiaUFnSUNCbmJHOWlZV3d1VW1WbWJHVmpkQzVuYkc5aVlXd2dQU0JuYkc5aVlXd3VVbVZtYkdWamRDNW5iRzlpWVd3Z2ZId2daMnh2WW1Gc08xeHVJQ0FnSUhCdmJIbG1hV3hzVDJKcVpXTjBLR2RzYjJKaGJDNVBZbXBsWTNRcE8xeHVJQ0I5WEc0Z0lITmxkSFZ3UjJ4dlltRnNjeWhuYkc5aVlXd3BPMXh1SUNCbmJHOWlZV3d1SkhSeVlXTmxkWEpTZFc1MGFXMWxJRDBnZTF4dUlDQWdJR05vWldOclQySnFaV04wUTI5bGNtTnBZbXhsT2lCamFHVmphMDlpYW1WamRFTnZaWEpqYVdKc1pTeGNiaUFnSUNCamNtVmhkR1ZRY21sMllYUmxUbUZ0WlRvZ1kzSmxZWFJsVUhKcGRtRjBaVTVoYldVc1hHNGdJQ0FnWkdWbWFXNWxVSEp2Y0dWeWRHbGxjem9nSkdSbFptbHVaVkJ5YjNCbGNuUnBaWE1zWEc0Z0lDQWdaR1ZtYVc1bFVISnZjR1Z5ZEhrNklDUmtaV1pwYm1WUWNtOXdaWEowZVN4Y2JpQWdJQ0JsZUhCdmNuUlRkR0Z5T2lCbGVIQnZjblJUZEdGeUxGeHVJQ0FnSUdkbGRFOTNia2hoYzJoUFltcGxZM1E2SUdkbGRFOTNia2hoYzJoUFltcGxZM1FzWEc0Z0lDQWdaMlYwVDNkdVVISnZjR1Z5ZEhsRVpYTmpjbWx3ZEc5eU9pQWtaMlYwVDNkdVVISnZjR1Z5ZEhsRVpYTmpjbWx3ZEc5eUxGeHVJQ0FnSUdkbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNNklDUm5aWFJQZDI1UWNtOXdaWEowZVU1aGJXVnpMRnh1SUNBZ0lHbHpUMkpxWldOME9pQnBjMDlpYW1WamRDeGNiaUFnSUNCcGMxQnlhWFpoZEdWT1lXMWxPaUJwYzFCeWFYWmhkR1ZPWVcxbExGeHVJQ0FnSUdselUzbHRZbTlzVTNSeWFXNW5PaUJwYzFONWJXSnZiRk4wY21sdVp5eGNiaUFnSUNCclpYbHpPaUFrYTJWNWN5eGNiaUFnSUNCelpYUjFjRWRzYjJKaGJITTZJSE5sZEhWd1IyeHZZbUZzY3l4Y2JpQWdJQ0IwYjA5aWFtVmpkRG9nZEc5UFltcGxZM1FzWEc0Z0lDQWdkRzlRY205d1pYSjBlVG9nZEc5UWNtOXdaWEowZVN4Y2JpQWdJQ0IwZVhCbGIyWTZJSFI1Y0dWUFpseHVJQ0I5TzF4dWZTa29kSGx3Wlc5bUlIZHBibVJ2ZHlBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NnUHlCM2FXNWtiM2NnT2lCMGVYQmxiMllnWjJ4dlltRnNJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5QS9JR2RzYjJKaGJDQTZJSFI1Y0dWdlppQnpaV3htSUNFOVBTQW5kVzVrWldacGJtVmtKeUEvSUhObGJHWWdPaUIwYUdsektUdGNiaWhtZFc1amRHbHZiaWdwSUh0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dUlDQjJZWElnY0dGMGFEdGNiaUFnWm5WdVkzUnBiMjRnY21Wc1lYUnBkbVZTWlhGMWFYSmxLR05oYkd4bGNsQmhkR2dzSUhKbGNYVnBjbVZrVUdGMGFDa2dlMXh1SUNBZ0lIQmhkR2dnUFNCd1lYUm9JSHg4SUhSNWNHVnZaaUJ5WlhGMWFYSmxJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5QW1KaUJ5WlhGMWFYSmxLQ2R3WVhSb0p5azdYRzRnSUNBZ1puVnVZM1JwYjI0Z2FYTkVhWEpsWTNSdmNua29jR0YwYUNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhCaGRHZ3VjMnhwWTJVb0xURXBJRDA5UFNBbkx5YzdYRzRnSUNBZ2ZWeHVJQ0FnSUdaMWJtTjBhVzl1SUdselFXSnpiMngxZEdVb2NHRjBhQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSEJoZEdoYk1GMGdQVDA5SUNjdkp6dGNiaUFnSUNCOVhHNGdJQ0FnWm5WdVkzUnBiMjRnYVhOU1pXeGhkR2wyWlNod1lYUm9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdjR0YwYUZzd1hTQTlQVDBnSnk0bk8xeHVJQ0FnSUgxY2JpQWdJQ0JwWmlBb2FYTkVhWEpsWTNSdmNua29jbVZ4ZFdseVpXUlFZWFJvS1NCOGZDQnBjMEZpYzI5c2RYUmxLSEpsY1hWcGNtVmtVR0YwYUNrcFhHNGdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdjbVYwZFhKdUlHbHpVbVZzWVhScGRtVW9jbVZ4ZFdseVpXUlFZWFJvS1NBL0lISmxjWFZwY21Vb2NHRjBhQzV5WlhOdmJIWmxLSEJoZEdndVpHbHlibUZ0WlNoallXeHNaWEpRWVhSb0tTd2djbVZ4ZFdseVpXUlFZWFJvS1NrZ09pQnlaWEYxYVhKbEtISmxjWFZwY21Wa1VHRjBhQ2s3WEc0Z0lIMWNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbkpsY1hWcGNtVWdQU0J5Wld4aGRHbDJaVkpsY1hWcGNtVTdYRzU5S1NncE8xeHVLR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc0Z0lHWjFibU4wYVc5dUlITndjbVZoWkNncElIdGNiaUFnSUNCMllYSWdjbllnUFNCYlhTeGNiaUFnSUNBZ0lDQWdhaUE5SURBc1hHNGdJQ0FnSUNBZ0lHbDBaWEpTWlhOMWJIUTdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FTQTlJREE3SUdrZ1BDQmhjbWQxYldWdWRITXViR1Z1WjNSb095QnBLeXNwSUh0Y2JpQWdJQ0FnSUhaaGNpQjJZV3gxWlZSdlUzQnlaV0ZrSUQwZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1Ob1pXTnJUMkpxWldOMFEyOWxjbU5wWW14bEtHRnlaM1Z0Wlc1MGMxdHBYU2s3WEc0Z0lDQWdJQ0JwWmlBb2RIbHdaVzltSUhaaGJIVmxWRzlUY0hKbFlXUmJKSFJ5WVdObGRYSlNkVzUwYVcxbExuUnZVSEp2Y0dWeWRIa29VM2x0WW05c0xtbDBaWEpoZEc5eUtWMGdJVDA5SUNkbWRXNWpkR2x2YmljcElIdGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduUTJGdWJtOTBJSE53Y21WaFpDQnViMjR0YVhSbGNtRmliR1VnYjJKcVpXTjBMaWNwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnZG1GeUlHbDBaWElnUFNCMllXeDFaVlJ2VTNCeVpXRmtXeVIwY21GalpYVnlVblZ1ZEdsdFpTNTBiMUJ5YjNCbGNuUjVLRk41YldKdmJDNXBkR1Z5WVhSdmNpbGRLQ2s3WEc0Z0lDQWdJQ0IzYUdsc1pTQW9JU2hwZEdWeVVtVnpkV3gwSUQwZ2FYUmxjaTV1WlhoMEtDa3BMbVJ2Ym1VcElIdGNiaUFnSUNBZ0lDQWdjblpiYWlzclhTQTlJR2wwWlhKU1pYTjFiSFF1ZG1Gc2RXVTdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ5ZGp0Y2JpQWdmVnh1SUNBa2RISmhZMlYxY2xKMWJuUnBiV1V1YzNCeVpXRmtJRDBnYzNCeVpXRmtPMXh1ZlNrb0tUdGNiaWhtZFc1amRHbHZiaWdwSUh0Y2JpQWdKM1Z6WlNCemRISnBZM1FuTzF4dUlDQjJZWElnSkU5aWFtVmpkQ0E5SUU5aWFtVmpkRHRjYmlBZ2RtRnlJQ1JVZVhCbFJYSnliM0lnUFNCVWVYQmxSWEp5YjNJN1hHNGdJSFpoY2lBa1kzSmxZWFJsSUQwZ0pFOWlhbVZqZEM1amNtVmhkR1U3WEc0Z0lIWmhjaUFrWkdWbWFXNWxVSEp2Y0dWeWRHbGxjeUE5SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVrWldacGJtVlFjbTl3WlhKMGFXVnpPMXh1SUNCMllYSWdKR1JsWm1sdVpWQnliM0JsY25SNUlEMGdKSFJ5WVdObGRYSlNkVzUwYVcxbExtUmxabWx1WlZCeWIzQmxjblI1TzF4dUlDQjJZWElnSkdkbGRFOTNibEJ5YjNCbGNuUjVSR1Z6WTNKcGNIUnZjaUE5SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVuWlhSUGQyNVFjbTl3WlhKMGVVUmxjMk55YVhCMGIzSTdYRzRnSUhaaGNpQWtaMlYwVDNkdVVISnZjR1Z5ZEhsT1lXMWxjeUE5SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVuWlhSUGQyNVFjbTl3WlhKMGVVNWhiV1Z6TzF4dUlDQjJZWElnSkdkbGRGQnliM1J2ZEhsd1pVOW1JRDBnVDJKcVpXTjBMbWRsZEZCeWIzUnZkSGx3WlU5bU8xeHVJQ0IyWVhJZ0pGOWZNQ0E5SUU5aWFtVmpkQ3hjYmlBZ0lDQWdJR2RsZEU5M2JsQnliM0JsY25SNVRtRnRaWE1nUFNBa1gxOHdMbWRsZEU5M2JsQnliM0JsY25SNVRtRnRaWE1zWEc0Z0lDQWdJQ0JuWlhSUGQyNVFjbTl3WlhKMGVWTjViV0p2YkhNZ1BTQWtYMTh3TG1kbGRFOTNibEJ5YjNCbGNuUjVVM2x0WW05c2N6dGNiaUFnWm5WdVkzUnBiMjRnYzNWd1pYSkVaWE5qY21sd2RHOXlLR2h2YldWUFltcGxZM1FzSUc1aGJXVXBJSHRjYmlBZ0lDQjJZWElnY0hKdmRHOGdQU0FrWjJWMFVISnZkRzkwZVhCbFQyWW9hRzl0WlU5aWFtVmpkQ2s3WEc0Z0lDQWdaRzhnZTF4dUlDQWdJQ0FnZG1GeUlISmxjM1ZzZENBOUlDUm5aWFJQZDI1UWNtOXdaWEowZVVSbGMyTnlhWEIwYjNJb2NISnZkRzhzSUc1aGJXVXBPMXh1SUNBZ0lDQWdhV1lnS0hKbGMzVnNkQ2xjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJSEpsYzNWc2REdGNiaUFnSUNBZ0lIQnliM1J2SUQwZ0pHZGxkRkJ5YjNSdmRIbHdaVTltS0hCeWIzUnZLVHRjYmlBZ0lDQjlJSGRvYVd4bElDaHdjbTkwYnlrN1hHNGdJQ0FnY21WMGRYSnVJSFZ1WkdWbWFXNWxaRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ6ZFhCbGNrTnZibk4wY25WamRHOXlLR04wYjNJcElIdGNiaUFnSUNCeVpYUjFjbTRnWTNSdmNpNWZYM0J5YjNSdlgxODdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjM1Z3WlhKRFlXeHNLSE5sYkdZc0lHaHZiV1ZQWW1wbFkzUXNJRzVoYldVc0lHRnlaM01wSUh0Y2JpQWdJQ0J5WlhSMWNtNGdjM1Z3WlhKSFpYUW9jMlZzWml3Z2FHOXRaVTlpYW1WamRDd2dibUZ0WlNrdVlYQndiSGtvYzJWc1ppd2dZWEpuY3lrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2MzVndaWEpIWlhRb2MyVnNaaXdnYUc5dFpVOWlhbVZqZEN3Z2JtRnRaU2tnZTF4dUlDQWdJSFpoY2lCa1pYTmpjbWx3ZEc5eUlEMGdjM1Z3WlhKRVpYTmpjbWx3ZEc5eUtHaHZiV1ZQWW1wbFkzUXNJRzVoYldVcE8xeHVJQ0FnSUdsbUlDaGtaWE5qY21sd2RHOXlLU0I3WEc0Z0lDQWdJQ0JwWmlBb0lXUmxjMk55YVhCMGIzSXVaMlYwS1Z4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWkdWelkzSnBjSFJ2Y2k1MllXeDFaVHRjYmlBZ0lDQWdJSEpsZEhWeWJpQmtaWE5qY21sd2RHOXlMbWRsZEM1allXeHNLSE5sYkdZcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdkVzVrWldacGJtVmtPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJSE4xY0dWeVUyVjBLSE5sYkdZc0lHaHZiV1ZQWW1wbFkzUXNJRzVoYldVc0lIWmhiSFZsS1NCN1hHNGdJQ0FnZG1GeUlHUmxjMk55YVhCMGIzSWdQU0J6ZFhCbGNrUmxjMk55YVhCMGIzSW9hRzl0WlU5aWFtVmpkQ3dnYm1GdFpTazdYRzRnSUNBZ2FXWWdLR1JsYzJOeWFYQjBiM0lnSmlZZ1pHVnpZM0pwY0hSdmNpNXpaWFFwSUh0Y2JpQWdJQ0FnSUdSbGMyTnlhWEIwYjNJdWMyVjBMbU5oYkd3b2MyVnNaaXdnZG1Gc2RXVXBPMXh1SUNBZ0lDQWdjbVYwZFhKdUlIWmhiSFZsTzF4dUlDQWdJSDFjYmlBZ0lDQjBhSEp2ZHlBa1ZIbHdaVVZ5Y205eUtDaGNJbk4xY0dWeUlHaGhjeUJ1YnlCelpYUjBaWElnSjF3aUlDc2dibUZ0WlNBcklGd2lKeTVjSWlrcE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHZGxkRVJsYzJOeWFYQjBiM0p6S0c5aWFtVmpkQ2tnZTF4dUlDQWdJSFpoY2lCa1pYTmpjbWx3ZEc5eWN5QTlJSHQ5TzF4dUlDQWdJSFpoY2lCdVlXMWxjeUE5SUdkbGRFOTNibEJ5YjNCbGNuUjVUbUZ0WlhNb2IySnFaV04wS1R0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUc1aGJXVnpMbXhsYm1kMGFEc2dhU3NyS1NCN1hHNGdJQ0FnSUNCMllYSWdibUZ0WlNBOUlHNWhiV1Z6VzJsZE8xeHVJQ0FnSUNBZ1pHVnpZM0pwY0hSdmNuTmJibUZ0WlYwZ1BTQWtaMlYwVDNkdVVISnZjR1Z5ZEhsRVpYTmpjbWx3ZEc5eUtHOWlhbVZqZEN3Z2JtRnRaU2s3WEc0Z0lDQWdmVnh1SUNBZ0lIWmhjaUJ6ZVcxaWIyeHpJRDBnWjJWMFQzZHVVSEp2Y0dWeWRIbFRlVzFpYjJ4ektHOWlhbVZqZENrN1hHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCemVXMWliMnh6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQjJZWElnYzNsdFltOXNJRDBnYzNsdFltOXNjMXRwWFR0Y2JpQWdJQ0FnSUdSbGMyTnlhWEIwYjNKeld5UjBjbUZqWlhWeVVuVnVkR2x0WlM1MGIxQnliM0JsY25SNUtITjViV0p2YkNsZElEMGdKR2RsZEU5M2JsQnliM0JsY25SNVJHVnpZM0pwY0hSdmNpaHZZbXBsWTNRc0lDUjBjbUZqWlhWeVVuVnVkR2x0WlM1MGIxQnliM0JsY25SNUtITjViV0p2YkNrcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdaR1Z6WTNKcGNIUnZjbk03WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWTNKbFlYUmxRMnhoYzNNb1kzUnZjaXdnYjJKcVpXTjBMQ0J6ZEdGMGFXTlBZbXBsWTNRc0lITjFjR1Z5UTJ4aGMzTXBJSHRjYmlBZ0lDQWtaR1ZtYVc1bFVISnZjR1Z5ZEhrb2IySnFaV04wTENBblkyOXVjM1J5ZFdOMGIzSW5MQ0I3WEc0Z0lDQWdJQ0IyWVd4MVpUb2dZM1J2Y2l4Y2JpQWdJQ0FnSUdOdmJtWnBaM1Z5WVdKc1pUb2dkSEoxWlN4Y2JpQWdJQ0FnSUdWdWRXMWxjbUZpYkdVNklHWmhiSE5sTEZ4dUlDQWdJQ0FnZDNKcGRHRmliR1U2SUhSeWRXVmNiaUFnSUNCOUtUdGNiaUFnSUNCcFppQW9ZWEpuZFcxbGJuUnpMbXhsYm1kMGFDQStJRE1wSUh0Y2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2MzVndaWEpEYkdGemN5QTlQVDBnSjJaMWJtTjBhVzl1SnlsY2JpQWdJQ0FnSUNBZ1kzUnZjaTVmWDNCeWIzUnZYMThnUFNCemRYQmxja05zWVhOek8xeHVJQ0FnSUNBZ1kzUnZjaTV3Y205MGIzUjVjR1VnUFNBa1kzSmxZWFJsS0dkbGRGQnliM1J2VUdGeVpXNTBLSE4xY0dWeVEyeGhjM01wTENCblpYUkVaWE5qY21sd2RHOXljeWh2WW1wbFkzUXBLVHRjYmlBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ1kzUnZjaTV3Y205MGIzUjVjR1VnUFNCdlltcGxZM1E3WEc0Z0lDQWdmVnh1SUNBZ0lDUmtaV1pwYm1WUWNtOXdaWEowZVNoamRHOXlMQ0FuY0hKdmRHOTBlWEJsSnl3Z2UxeHVJQ0FnSUNBZ1kyOXVabWxuZFhKaFlteGxPaUJtWVd4elpTeGNiaUFnSUNBZ0lIZHlhWFJoWW14bE9pQm1ZV3h6WlZ4dUlDQWdJSDBwTzF4dUlDQWdJSEpsZEhWeWJpQWtaR1ZtYVc1bFVISnZjR1Z5ZEdsbGN5aGpkRzl5TENCblpYUkVaWE5qY21sd2RHOXljeWh6ZEdGMGFXTlBZbXBsWTNRcEtUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQm5aWFJRY205MGIxQmhjbVZ1ZENoemRYQmxja05zWVhOektTQjdYRzRnSUNBZ2FXWWdLSFI1Y0dWdlppQnpkWEJsY2tOc1lYTnpJRDA5UFNBblpuVnVZM1JwYjI0bktTQjdYRzRnSUNBZ0lDQjJZWElnY0hKdmRHOTBlWEJsSUQwZ2MzVndaWEpEYkdGemN5NXdjbTkwYjNSNWNHVTdYRzRnSUNBZ0lDQnBaaUFvSkU5aWFtVmpkQ2h3Y205MGIzUjVjR1VwSUQwOVBTQndjbTkwYjNSNWNHVWdmSHdnY0hKdmRHOTBlWEJsSUQwOVBTQnVkV3hzS1Z4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYzNWd1pYSkRiR0Z6Y3k1d2NtOTBiM1I1Y0dVN1hHNGdJQ0FnSUNCMGFISnZkeUJ1WlhjZ0pGUjVjR1ZGY25KdmNpZ25jM1Z3WlhJZ2NISnZkRzkwZVhCbElHMTFjM1FnWW1VZ1lXNGdUMkpxWldOMElHOXlJRzUxYkd3bktUdGNiaUFnSUNCOVhHNGdJQ0FnYVdZZ0tITjFjR1Z5UTJ4aGMzTWdQVDA5SUc1MWJHd3BYRzRnSUNBZ0lDQnlaWFIxY200Z2JuVnNiRHRjYmlBZ0lDQjBhSEp2ZHlCdVpYY2dKRlI1Y0dWRmNuSnZjaWdvWENKVGRYQmxjaUJsZUhCeVpYTnphVzl1SUcxMWMzUWdaV2wwYUdWeUlHSmxJRzUxYkd3Z2IzSWdZU0JtZFc1amRHbHZiaXdnYm05MElGd2lJQ3NnZEhsd1pXOW1JSE4xY0dWeVEyeGhjM01nS3lCY0lpNWNJaWtwTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdSbFptRjFiSFJUZFhCbGNrTmhiR3dvYzJWc1ppd2dhRzl0WlU5aWFtVmpkQ3dnWVhKbmN5a2dlMXh1SUNBZ0lHbG1JQ2drWjJWMFVISnZkRzkwZVhCbFQyWW9hRzl0WlU5aWFtVmpkQ2tnSVQwOUlHNTFiR3dwWEc0Z0lDQWdJQ0J6ZFhCbGNrTmhiR3dvYzJWc1ppd2dhRzl0WlU5aWFtVmpkQ3dnSjJOdmJuTjBjblZqZEc5eUp5d2dZWEpuY3lrN1hHNGdJSDFjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1OeVpXRjBaVU5zWVhOeklEMGdZM0psWVhSbFEyeGhjM003WEc0Z0lDUjBjbUZqWlhWeVVuVnVkR2x0WlM1a1pXWmhkV3gwVTNWd1pYSkRZV3hzSUQwZ1pHVm1ZWFZzZEZOMWNHVnlRMkZzYkR0Y2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExuTjFjR1Z5UTJGc2JDQTlJSE4xY0dWeVEyRnNiRHRjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG5OMWNHVnlRMjl1YzNSeWRXTjBiM0lnUFNCemRYQmxja052Ym5OMGNuVmpkRzl5TzF4dUlDQWtkSEpoWTJWMWNsSjFiblJwYldVdWMzVndaWEpIWlhRZ1BTQnpkWEJsY2tkbGREdGNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbk4xY0dWeVUyVjBJRDBnYzNWd1pYSlRaWFE3WEc1OUtTZ3BPMXh1S0daMWJtTjBhVzl1S0NrZ2UxeHVJQ0FuZFhObElITjBjbWxqZENjN1hHNGdJR2xtSUNoMGVYQmxiMllnSkhSeVlXTmxkWEpTZFc1MGFXMWxJQ0U5UFNBbmIySnFaV04wSnlrZ2UxeHVJQ0FnSUhSb2NtOTNJRzVsZHlCRmNuSnZjaWduZEhKaFkyVjFjaUJ5ZFc1MGFXMWxJRzV2ZENCbWIzVnVaQzRuS1R0Y2JpQWdmVnh1SUNCMllYSWdZM0psWVhSbFVISnBkbUYwWlU1aGJXVWdQU0FrZEhKaFkyVjFjbEoxYm5ScGJXVXVZM0psWVhSbFVISnBkbUYwWlU1aGJXVTdYRzRnSUhaaGNpQWtaR1ZtYVc1bFVISnZjR1Z5ZEdsbGN5QTlJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWtaV1pwYm1WUWNtOXdaWEowYVdWek8xeHVJQ0IyWVhJZ0pHUmxabWx1WlZCeWIzQmxjblI1SUQwZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1SbFptbHVaVkJ5YjNCbGNuUjVPMXh1SUNCMllYSWdKR055WldGMFpTQTlJRTlpYW1WamRDNWpjbVZoZEdVN1hHNGdJSFpoY2lBa1ZIbHdaVVZ5Y205eUlEMGdWSGx3WlVWeWNtOXlPMXh1SUNCbWRXNWpkR2x2YmlCdWIyNUZiblZ0S0haaGJIVmxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlIdGNiaUFnSUNBZ0lHTnZibVpwWjNWeVlXSnNaVG9nZEhKMVpTeGNiaUFnSUNBZ0lHVnVkVzFsY21GaWJHVTZJR1poYkhObExGeHVJQ0FnSUNBZ2RtRnNkV1U2SUhaaGJIVmxMRnh1SUNBZ0lDQWdkM0pwZEdGaWJHVTZJSFJ5ZFdWY2JpQWdJQ0I5TzF4dUlDQjlYRzRnSUhaaGNpQlRWRjlPUlZkQ1QxSk9JRDBnTUR0Y2JpQWdkbUZ5SUZOVVgwVllSVU5WVkVsT1J5QTlJREU3WEc0Z0lIWmhjaUJUVkY5VFZWTlFSVTVFUlVRZ1BTQXlPMXh1SUNCMllYSWdVMVJmUTB4UFUwVkVJRDBnTXp0Y2JpQWdkbUZ5SUVWT1JGOVRWRUZVUlNBOUlDMHlPMXh1SUNCMllYSWdVa1ZVU0ZKUFYxOVRWRUZVUlNBOUlDMHpPMXh1SUNCbWRXNWpkR2x2YmlCblpYUkpiblJsY201aGJFVnljbTl5S0hOMFlYUmxLU0I3WEc0Z0lDQWdjbVYwZFhKdUlHNWxkeUJGY25KdmNpZ25WSEpoWTJWMWNpQmpiMjF3YVd4bGNpQmlkV2M2SUdsdWRtRnNhV1FnYzNSaGRHVWdhVzRnYzNSaGRHVWdiV0ZqYUdsdVpUb2dKeUFySUhOMFlYUmxLVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJIWlc1bGNtRjBiM0pEYjI1MFpYaDBLQ2tnZTF4dUlDQWdJSFJvYVhNdWMzUmhkR1VnUFNBd08xeHVJQ0FnSUhSb2FYTXVSMU4wWVhSbElEMGdVMVJmVGtWWFFrOVNUanRjYmlBZ0lDQjBhR2x6TG5OMGIzSmxaRVY0WTJWd2RHbHZiaUE5SUhWdVpHVm1hVzVsWkR0Y2JpQWdJQ0IwYUdsekxtWnBibUZzYkhsR1lXeHNWR2h5YjNWbmFDQTlJSFZ1WkdWbWFXNWxaRHRjYmlBZ0lDQjBhR2x6TG5ObGJuUmZJRDBnZFc1a1pXWnBibVZrTzF4dUlDQWdJSFJvYVhNdWNtVjBkWEp1Vm1Gc2RXVWdQU0IxYm1SbFptbHVaV1E3WEc0Z0lDQWdkR2hwY3k1MGNubFRkR0ZqYTE4Z1BTQmJYVHRjYmlBZ2ZWeHVJQ0JIWlc1bGNtRjBiM0pEYjI1MFpYaDBMbkJ5YjNSdmRIbHdaU0E5SUh0Y2JpQWdJQ0J3ZFhOb1ZISjVPaUJtZFc1amRHbHZiaWhqWVhSamFGTjBZWFJsTENCbWFXNWhiR3g1VTNSaGRHVXBJSHRjYmlBZ0lDQWdJR2xtSUNobWFXNWhiR3g1VTNSaGRHVWdJVDA5SUc1MWJHd3BJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHWnBibUZzYkhsR1lXeHNWR2h5YjNWbmFDQTlJRzUxYkd3N1hHNGdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0IwYUdsekxuUnllVk4wWVdOclh5NXNaVzVuZEdnZ0xTQXhPeUJwSUQ0OUlEQTdJR2t0TFNrZ2UxeHVJQ0FnSUNBZ0lDQWdJR2xtSUNoMGFHbHpMblJ5ZVZOMFlXTnJYMXRwWFM1allYUmphQ0FoUFQwZ2RXNWtaV1pwYm1Wa0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCbWFXNWhiR3g1Um1Gc2JGUm9jbTkxWjJnZ1BTQjBhR2x6TG5SeWVWTjBZV05yWDF0cFhTNWpZWFJqYUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCcFppQW9abWx1WVd4c2VVWmhiR3hVYUhKdmRXZG9JRDA5UFNCdWRXeHNLVnh1SUNBZ0lDQWdJQ0FnSUdacGJtRnNiSGxHWVd4c1ZHaHliM1ZuYUNBOUlGSkZWRWhTVDFkZlUxUkJWRVU3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVkSEo1VTNSaFkydGZMbkIxYzJnb2UxeHVJQ0FnSUNBZ0lDQWdJR1pwYm1Gc2JIazZJR1pwYm1Gc2JIbFRkR0YwWlN4Y2JpQWdJQ0FnSUNBZ0lDQm1hVzVoYkd4NVJtRnNiRlJvY205MVoyZzZJR1pwYm1Gc2JIbEdZV3hzVkdoeWIzVm5hRnh1SUNBZ0lDQWdJQ0I5S1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDaGpZWFJqYUZOMFlYUmxJQ0U5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVkSEo1VTNSaFkydGZMbkIxYzJnb2UyTmhkR05vT2lCallYUmphRk4wWVhSbGZTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCd2IzQlVjbms2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2RHaHBjeTUwY25sVGRHRmphMTh1Y0c5d0tDazdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdjMlZ1ZENncElIdGNiaUFnSUNBZ0lIUm9hWE11YldGNVltVlVhSEp2ZHlncE8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUhSb2FYTXVjMlZ1ZEY4N1hHNGdJQ0FnZlN4Y2JpQWdJQ0J6WlhRZ2MyVnVkQ2gyS1NCN1hHNGdJQ0FnSUNCMGFHbHpMbk5sYm5SZklEMGdkanRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0J6Wlc1MFNXZHViM0psVkdoeWIzY29LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdkR2hwY3k1elpXNTBYenRjYmlBZ0lDQjlMRnh1SUNBZ0lHMWhlV0psVkdoeWIzYzZJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQWdJQ0FnYVdZZ0tIUm9hWE11WVdOMGFXOXVJRDA5UFNBbmRHaHliM2NuS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11WVdOMGFXOXVJRDBnSjI1bGVIUW5PMXh1SUNBZ0lDQWdJQ0IwYUhKdmR5QjBhR2x6TG5ObGJuUmZPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ1pXNWtPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhOM2FYUmphQ0FvZEdocGN5NXpkR0YwWlNrZ2UxeHVJQ0FnSUNBZ0lDQmpZWE5sSUVWT1JGOVRWRUZVUlRwY2JpQWdJQ0FnSUNBZ0lDQnlaWFIxY200Z2RHaHBjenRjYmlBZ0lDQWdJQ0FnWTJGelpTQlNSVlJJVWs5WFgxTlVRVlJGT2x4dUlDQWdJQ0FnSUNBZ0lIUm9jbTkzSUhSb2FYTXVjM1J2Y21Wa1JYaGpaWEIwYVc5dU8xeHVJQ0FnSUNBZ0lDQmtaV1poZFd4ME9seHVJQ0FnSUNBZ0lDQWdJSFJvY205M0lHZGxkRWx1ZEdWeWJtRnNSWEp5YjNJb2RHaHBjeTV6ZEdGMFpTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZTeGNiaUFnSUNCb1lXNWtiR1ZGZUdObGNIUnBiMjQ2SUdaMWJtTjBhVzl1S0dWNEtTQjdYRzRnSUNBZ0lDQjBhR2x6TGtkVGRHRjBaU0E5SUZOVVgwTk1UMU5GUkR0Y2JpQWdJQ0FnSUhSb2FYTXVjM1JoZEdVZ1BTQkZUa1JmVTFSQlZFVTdYRzRnSUNBZ0lDQjBhSEp2ZHlCbGVEdGNiaUFnSUNCOVhHNGdJSDA3WEc0Z0lHWjFibU4wYVc5dUlHNWxlSFJQY2xSb2NtOTNLR04wZUN3Z2JXOTJaVTVsZUhRc0lHRmpkR2x2Yml3Z2VDa2dlMXh1SUNBZ0lITjNhWFJqYUNBb1kzUjRMa2RUZEdGMFpTa2dlMXh1SUNBZ0lDQWdZMkZ6WlNCVFZGOUZXRVZEVlZSSlRrYzZYRzRnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ29YQ0pjWEZ3aVhDSWdLeUJoWTNScGIyNGdLeUJjSWx4Y1hDSWdiMjRnWlhobFkzVjBhVzVuSUdkbGJtVnlZWFJ2Y2x3aUtTazdYRzRnSUNBZ0lDQmpZWE5sSUZOVVgwTk1UMU5GUkRwY2JpQWdJQ0FnSUNBZ2FXWWdLR0ZqZEdsdmJpQTlQU0FuYm1WNGRDY3BJSHRjYmlBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdkbUZzZFdVNklIVnVaR1ZtYVc1bFpDeGNiaUFnSUNBZ0lDQWdJQ0FnSUdSdmJtVTZJSFJ5ZFdWY2JpQWdJQ0FnSUNBZ0lDQjlPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhSb2NtOTNJSGc3WEc0Z0lDQWdJQ0JqWVhObElGTlVYMDVGVjBKUFVrNDZYRzRnSUNBZ0lDQWdJR2xtSUNoaFkzUnBiMjRnUFQwOUlDZDBhSEp2ZHljcElIdGNiaUFnSUNBZ0lDQWdJQ0JqZEhndVIxTjBZWFJsSUQwZ1UxUmZRMHhQVTBWRU8xeHVJQ0FnSUNBZ0lDQWdJSFJvY205M0lIZzdYRzRnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJQ0FnYVdZZ0tIZ2dJVDA5SUhWdVpHVm1hVzVsWkNsY2JpQWdJQ0FnSUNBZ0lDQjBhSEp2ZHlBa1ZIbHdaVVZ5Y205eUtDZFRaVzUwSUhaaGJIVmxJSFJ2SUc1bGQySnZjbTRnWjJWdVpYSmhkRzl5SnlrN1hHNGdJQ0FnSUNCallYTmxJRk5VWDFOVlUxQkZUa1JGUkRwY2JpQWdJQ0FnSUNBZ1kzUjRMa2RUZEdGMFpTQTlJRk5VWDBWWVJVTlZWRWxPUnp0Y2JpQWdJQ0FnSUNBZ1kzUjRMbUZqZEdsdmJpQTlJR0ZqZEdsdmJqdGNiaUFnSUNBZ0lDQWdZM1I0TG5ObGJuUWdQU0I0TzF4dUlDQWdJQ0FnSUNCMllYSWdkbUZzZFdVZ1BTQnRiM1psVG1WNGRDaGpkSGdwTzF4dUlDQWdJQ0FnSUNCMllYSWdaRzl1WlNBOUlIWmhiSFZsSUQwOVBTQmpkSGc3WEc0Z0lDQWdJQ0FnSUdsbUlDaGtiMjVsS1Z4dUlDQWdJQ0FnSUNBZ0lIWmhiSFZsSUQwZ1kzUjRMbkpsZEhWeWJsWmhiSFZsTzF4dUlDQWdJQ0FnSUNCamRIZ3VSMU4wWVhSbElEMGdaRzl1WlNBL0lGTlVYME5NVDFORlJDQTZJRk5VWDFOVlUxQkZUa1JGUkR0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUh0Y2JpQWdJQ0FnSUNBZ0lDQjJZV3gxWlRvZ2RtRnNkV1VzWEc0Z0lDQWdJQ0FnSUNBZ1pHOXVaVG9nWkc5dVpWeHVJQ0FnSUNBZ0lDQjlPMXh1SUNBZ0lIMWNiaUFnZlZ4dUlDQjJZWElnWTNSNFRtRnRaU0E5SUdOeVpXRjBaVkJ5YVhaaGRHVk9ZVzFsS0NrN1hHNGdJSFpoY2lCdGIzWmxUbVY0ZEU1aGJXVWdQU0JqY21WaGRHVlFjbWwyWVhSbFRtRnRaU2dwTzF4dUlDQm1kVzVqZEdsdmJpQkhaVzVsY21GMGIzSkdkVzVqZEdsdmJpZ3BJSHQ5WEc0Z0lHWjFibU4wYVc5dUlFZGxibVZ5WVhSdmNrWjFibU4wYVc5dVVISnZkRzkwZVhCbEtDa2dlMzFjYmlBZ1IyVnVaWEpoZEc5eVJuVnVZM1JwYjI0dWNISnZkRzkwZVhCbElEMGdSMlZ1WlhKaGRHOXlSblZ1WTNScGIyNVFjbTkwYjNSNWNHVTdYRzRnSUNSa1pXWnBibVZRY205d1pYSjBlU2hIWlc1bGNtRjBiM0pHZFc1amRHbHZibEJ5YjNSdmRIbHdaU3dnSjJOdmJuTjBjblZqZEc5eUp5d2dibTl1Ulc1MWJTaEhaVzVsY21GMGIzSkdkVzVqZEdsdmJpa3BPMXh1SUNCSFpXNWxjbUYwYjNKR2RXNWpkR2x2YmxCeWIzUnZkSGx3WlM1d2NtOTBiM1I1Y0dVZ1BTQjdYRzRnSUNBZ1kyOXVjM1J5ZFdOMGIzSTZJRWRsYm1WeVlYUnZja1oxYm1OMGFXOXVVSEp2ZEc5MGVYQmxMRnh1SUNBZ0lHNWxlSFE2SUdaMWJtTjBhVzl1S0hZcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCdVpYaDBUM0pVYUhKdmR5aDBhR2x6VzJOMGVFNWhiV1ZkTENCMGFHbHpXMjF2ZG1WT1pYaDBUbUZ0WlYwc0lDZHVaWGgwSnl3Z2RpazdYRzRnSUNBZ2ZTeGNiaUFnSUNCMGFISnZkem9nWm5WdVkzUnBiMjRvZGlrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUc1bGVIUlBjbFJvY205M0tIUm9hWE5iWTNSNFRtRnRaVjBzSUhSb2FYTmJiVzkyWlU1bGVIUk9ZVzFsWFN3Z0ozUm9jbTkzSnl3Z2RpazdYRzRnSUNBZ2ZWeHVJQ0I5TzF4dUlDQWtaR1ZtYVc1bFVISnZjR1Z5ZEdsbGN5aEhaVzVsY21GMGIzSkdkVzVqZEdsdmJsQnliM1J2ZEhsd1pTNXdjbTkwYjNSNWNHVXNJSHRjYmlBZ0lDQmpiMjV6ZEhKMVkzUnZjam9nZTJWdWRXMWxjbUZpYkdVNklHWmhiSE5sZlN4Y2JpQWdJQ0J1WlhoME9pQjdaVzUxYldWeVlXSnNaVG9nWm1Gc2MyVjlMRnh1SUNBZ0lIUm9jbTkzT2lCN1pXNTFiV1Z5WVdKc1pUb2dabUZzYzJWOVhHNGdJSDBwTzF4dUlDQlBZbXBsWTNRdVpHVm1hVzVsVUhKdmNHVnlkSGtvUjJWdVpYSmhkRzl5Um5WdVkzUnBiMjVRY205MGIzUjVjR1V1Y0hKdmRHOTBlWEJsTENCVGVXMWliMnd1YVhSbGNtRjBiM0lzSUc1dmJrVnVkVzBvWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnY21WMGRYSnVJSFJvYVhNN1hHNGdJSDBwS1R0Y2JpQWdablZ1WTNScGIyNGdZM0psWVhSbFIyVnVaWEpoZEc5eVNXNXpkR0Z1WTJVb2FXNXVaWEpHZFc1amRHbHZiaXdnWm5WdVkzUnBiMjVQWW1wbFkzUXNJSE5sYkdZcElIdGNiaUFnSUNCMllYSWdiVzkyWlU1bGVIUWdQU0JuWlhSTmIzWmxUbVY0ZENocGJtNWxja1oxYm1OMGFXOXVMQ0J6Wld4bUtUdGNiaUFnSUNCMllYSWdZM1I0SUQwZ2JtVjNJRWRsYm1WeVlYUnZja052Ym5SbGVIUW9LVHRjYmlBZ0lDQjJZWElnYjJKcVpXTjBJRDBnSkdOeVpXRjBaU2htZFc1amRHbHZiazlpYW1WamRDNXdjbTkwYjNSNWNHVXBPMXh1SUNBZ0lHOWlhbVZqZEZ0amRIaE9ZVzFsWFNBOUlHTjBlRHRjYmlBZ0lDQnZZbXBsWTNSYmJXOTJaVTVsZUhST1lXMWxYU0E5SUcxdmRtVk9aWGgwTzF4dUlDQWdJSEpsZEhWeWJpQnZZbXBsWTNRN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2FXNXBkRWRsYm1WeVlYUnZja1oxYm1OMGFXOXVLR1oxYm1OMGFXOXVUMkpxWldOMEtTQjdYRzRnSUNBZ1puVnVZM1JwYjI1UFltcGxZM1F1Y0hKdmRHOTBlWEJsSUQwZ0pHTnlaV0YwWlNoSFpXNWxjbUYwYjNKR2RXNWpkR2x2YmxCeWIzUnZkSGx3WlM1d2NtOTBiM1I1Y0dVcE8xeHVJQ0FnSUdaMWJtTjBhVzl1VDJKcVpXTjBMbDlmY0hKdmRHOWZYeUE5SUVkbGJtVnlZWFJ2Y2taMWJtTjBhVzl1VUhKdmRHOTBlWEJsTzF4dUlDQWdJSEpsZEhWeWJpQm1kVzVqZEdsdmJrOWlhbVZqZER0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCQmMzbHVZMFoxYm1OMGFXOXVRMjl1ZEdWNGRDZ3BJSHRjYmlBZ0lDQkhaVzVsY21GMGIzSkRiMjUwWlhoMExtTmhiR3dvZEdocGN5azdYRzRnSUNBZ2RHaHBjeTVsY25JZ1BTQjFibVJsWm1sdVpXUTdYRzRnSUNBZ2RtRnlJR04wZUNBOUlIUm9hWE03WEc0Z0lDQWdZM1I0TG5KbGMzVnNkQ0E5SUc1bGR5QlFjbTl0YVhObEtHWjFibU4wYVc5dUtISmxjMjlzZG1Vc0lISmxhbVZqZENrZ2UxeHVJQ0FnSUNBZ1kzUjRMbkpsYzI5c2RtVWdQU0J5WlhOdmJIWmxPMXh1SUNBZ0lDQWdZM1I0TG5KbGFtVmpkQ0E5SUhKbGFtVmpkRHRjYmlBZ0lDQjlLVHRjYmlBZ2ZWeHVJQ0JCYzNsdVkwWjFibU4wYVc5dVEyOXVkR1Y0ZEM1d2NtOTBiM1I1Y0dVZ1BTQWtZM0psWVhSbEtFZGxibVZ5WVhSdmNrTnZiblJsZUhRdWNISnZkRzkwZVhCbEtUdGNiaUFnUVhONWJtTkdkVzVqZEdsdmJrTnZiblJsZUhRdWNISnZkRzkwZVhCbExtVnVaQ0E5SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUhOM2FYUmphQ0FvZEdocGN5NXpkR0YwWlNrZ2UxeHVJQ0FnSUNBZ1kyRnpaU0JGVGtSZlUxUkJWRVU2WEc0Z0lDQWdJQ0FnSUhSb2FYTXVjbVZ6YjJ4MlpTaDBhR2x6TG5KbGRIVnlibFpoYkhWbEtUdGNiaUFnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNCallYTmxJRkpGVkVoU1QxZGZVMVJCVkVVNlhHNGdJQ0FnSUNBZ0lIUm9hWE11Y21WcVpXTjBLSFJvYVhNdWMzUnZjbVZrUlhoalpYQjBhVzl1S1R0Y2JpQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0JrWldaaGRXeDBPbHh1SUNBZ0lDQWdJQ0IwYUdsekxuSmxhbVZqZENoblpYUkpiblJsY201aGJFVnljbTl5S0hSb2FYTXVjM1JoZEdVcEtUdGNiaUFnSUNCOVhHNGdJSDA3WEc0Z0lFRnplVzVqUm5WdVkzUnBiMjVEYjI1MFpYaDBMbkJ5YjNSdmRIbHdaUzVvWVc1a2JHVkZlR05sY0hScGIyNGdQU0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0IwYUdsekxuTjBZWFJsSUQwZ1VrVlVTRkpQVjE5VFZFRlVSVHRjYmlBZ2ZUdGNiaUFnWm5WdVkzUnBiMjRnWVhONWJtTlhjbUZ3S0dsdWJtVnlSblZ1WTNScGIyNHNJSE5sYkdZcElIdGNiaUFnSUNCMllYSWdiVzkyWlU1bGVIUWdQU0JuWlhSTmIzWmxUbVY0ZENocGJtNWxja1oxYm1OMGFXOXVMQ0J6Wld4bUtUdGNiaUFnSUNCMllYSWdZM1I0SUQwZ2JtVjNJRUZ6ZVc1alJuVnVZM1JwYjI1RGIyNTBaWGgwS0NrN1hHNGdJQ0FnWTNSNExtTnlaV0YwWlVOaGJHeGlZV05ySUQwZ1puVnVZM1JwYjI0b2JtVjNVM1JoZEdVcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbWRXNWpkR2x2YmloMllXeDFaU2tnZTF4dUlDQWdJQ0FnSUNCamRIZ3VjM1JoZEdVZ1BTQnVaWGRUZEdGMFpUdGNiaUFnSUNBZ0lDQWdZM1I0TG5aaGJIVmxJRDBnZG1Gc2RXVTdYRzRnSUNBZ0lDQWdJRzF2ZG1WT1pYaDBLR04wZUNrN1hHNGdJQ0FnSUNCOU8xeHVJQ0FnSUgwN1hHNGdJQ0FnWTNSNExtVnljbUpoWTJzZ1BTQm1kVzVqZEdsdmJpaGxjbklwSUh0Y2JpQWdJQ0FnSUdoaGJtUnNaVU5oZEdOb0tHTjBlQ3dnWlhKeUtUdGNiaUFnSUNBZ0lHMXZkbVZPWlhoMEtHTjBlQ2s3WEc0Z0lDQWdmVHRjYmlBZ0lDQnRiM1psVG1WNGRDaGpkSGdwTzF4dUlDQWdJSEpsZEhWeWJpQmpkSGd1Y21WemRXeDBPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJR2RsZEUxdmRtVk9aWGgwS0dsdWJtVnlSblZ1WTNScGIyNHNJSE5sYkdZcElIdGNiaUFnSUNCeVpYUjFjbTRnWm5WdVkzUnBiMjRvWTNSNEtTQjdYRzRnSUNBZ0lDQjNhR2xzWlNBb2RISjFaU2tnZTF4dUlDQWdJQ0FnSUNCMGNua2dlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJwYm01bGNrWjFibU4wYVc5dUxtTmhiR3dvYzJWc1ppd2dZM1I0S1R0Y2JpQWdJQ0FnSUNBZ2ZTQmpZWFJqYUNBb1pYZ3BJSHRjYmlBZ0lDQWdJQ0FnSUNCb1lXNWtiR1ZEWVhSamFDaGpkSGdzSUdWNEtUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1SUNBZ0lIMDdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdhR0Z1Wkd4bFEyRjBZMmdvWTNSNExDQmxlQ2tnZTF4dUlDQWdJR04wZUM1emRHOXlaV1JGZUdObGNIUnBiMjRnUFNCbGVEdGNiaUFnSUNCMllYSWdiR0Z6ZENBOUlHTjBlQzUwY25sVGRHRmphMTliWTNSNExuUnllVk4wWVdOclh5NXNaVzVuZEdnZ0xTQXhYVHRjYmlBZ0lDQnBaaUFvSVd4aGMzUXBJSHRjYmlBZ0lDQWdJR04wZUM1b1lXNWtiR1ZGZUdObGNIUnBiMjRvWlhncE8xeHVJQ0FnSUNBZ2NtVjBkWEp1TzF4dUlDQWdJSDFjYmlBZ0lDQmpkSGd1YzNSaGRHVWdQU0JzWVhOMExtTmhkR05vSUNFOVBTQjFibVJsWm1sdVpXUWdQeUJzWVhOMExtTmhkR05vSURvZ2JHRnpkQzVtYVc1aGJHeDVPMXh1SUNBZ0lHbG1JQ2hzWVhOMExtWnBibUZzYkhsR1lXeHNWR2h5YjNWbmFDQWhQVDBnZFc1a1pXWnBibVZrS1Z4dUlDQWdJQ0FnWTNSNExtWnBibUZzYkhsR1lXeHNWR2h5YjNWbmFDQTlJR3hoYzNRdVptbHVZV3hzZVVaaGJHeFVhSEp2ZFdkb08xeHVJQ0I5WEc0Z0lDUjBjbUZqWlhWeVVuVnVkR2x0WlM1aGMzbHVZMWR5WVhBZ1BTQmhjM2x1WTFkeVlYQTdYRzRnSUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVwYm1sMFIyVnVaWEpoZEc5eVJuVnVZM1JwYjI0Z1BTQnBibWwwUjJWdVpYSmhkRzl5Um5WdVkzUnBiMjQ3WEc0Z0lDUjBjbUZqWlhWeVVuVnVkR2x0WlM1amNtVmhkR1ZIWlc1bGNtRjBiM0pKYm5OMFlXNWpaU0E5SUdOeVpXRjBaVWRsYm1WeVlYUnZja2x1YzNSaGJtTmxPMXh1ZlNrb0tUdGNiaWhtZFc1amRHbHZiaWdwSUh0Y2JpQWdablZ1WTNScGIyNGdZblZwYkdSR2NtOXRSVzVqYjJSbFpGQmhjblJ6S0c5d2RGOXpZMmhsYldVc0lHOXdkRjkxYzJWeVNXNW1ieXdnYjNCMFgyUnZiV0ZwYml3Z2IzQjBYM0J2Y25Rc0lHOXdkRjl3WVhSb0xDQnZjSFJmY1hWbGNubEVZWFJoTENCdmNIUmZabkpoWjIxbGJuUXBJSHRjYmlBZ0lDQjJZWElnYjNWMElEMGdXMTA3WEc0Z0lDQWdhV1lnS0c5d2RGOXpZMmhsYldVcElIdGNiaUFnSUNBZ0lHOTFkQzV3ZFhOb0tHOXdkRjl6WTJobGJXVXNJQ2M2SnlrN1hHNGdJQ0FnZlZ4dUlDQWdJR2xtSUNodmNIUmZaRzl0WVdsdUtTQjdYRzRnSUNBZ0lDQnZkWFF1Y0hWemFDZ25MeThuS1R0Y2JpQWdJQ0FnSUdsbUlDaHZjSFJmZFhObGNrbHVabThwSUh0Y2JpQWdJQ0FnSUNBZ2IzVjBMbkIxYzJnb2IzQjBYM1Z6WlhKSmJtWnZMQ0FuUUNjcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2IzVjBMbkIxYzJnb2IzQjBYMlJ2YldGcGJpazdYRzRnSUNBZ0lDQnBaaUFvYjNCMFgzQnZjblFwSUh0Y2JpQWdJQ0FnSUNBZ2IzVjBMbkIxYzJnb0p6b25MQ0J2Y0hSZmNHOXlkQ2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2h2Y0hSZmNHRjBhQ2tnZTF4dUlDQWdJQ0FnYjNWMExuQjFjMmdvYjNCMFgzQmhkR2dwTzF4dUlDQWdJSDFjYmlBZ0lDQnBaaUFvYjNCMFgzRjFaWEo1UkdGMFlTa2dlMXh1SUNBZ0lDQWdiM1YwTG5CMWMyZ29KejhuTENCdmNIUmZjWFZsY25sRVlYUmhLVHRjYmlBZ0lDQjlYRzRnSUNBZ2FXWWdLRzl3ZEY5bWNtRm5iV1Z1ZENrZ2UxeHVJQ0FnSUNBZ2IzVjBMbkIxYzJnb0p5TW5MQ0J2Y0hSZlpuSmhaMjFsYm5RcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdiM1YwTG1wdmFXNG9KeWNwTzF4dUlDQjlYRzRnSUR0Y2JpQWdkbUZ5SUhOd2JHbDBVbVVnUFNCdVpYY2dVbVZuUlhod0tDZGVKeUFySUNjb1B6b25JQ3NnSnloYlhqb3ZQeU11WFNzcEp5QXJJQ2M2S1Q4bklDc2dKeWcvT2k4dkp5QXJJQ2NvUHpvb1cxNHZQeU5kS2lsQUtUOG5JQ3NnSnloYlhGeGNYSGRjWEZ4Y1pGeGNYRnd0WEZ4Y1hIVXdNVEF3TFZ4Y1hGeDFabVptWmk0bFhTb3BKeUFySUNjb1B6bzZLRnN3TFRsZEt5a3BQeWNnS3lBbktUOG5JQ3NnSnloYlhqOGpYU3NwUHljZ0t5QW5LRDg2WEZ4Y1hEOG9XMTRqWFNvcEtUOG5JQ3NnSnlnL09pTW9MaW9wS1Q4bklDc2dKeVFuS1R0Y2JpQWdkbUZ5SUVOdmJYQnZibVZ1ZEVsdVpHVjRJRDBnZTF4dUlDQWdJRk5EU0VWTlJUb2dNU3hjYmlBZ0lDQlZVMFZTWDBsT1JrODZJRElzWEc0Z0lDQWdSRTlOUVVsT09pQXpMRnh1SUNBZ0lGQlBVbFE2SURRc1hHNGdJQ0FnVUVGVVNEb2dOU3hjYmlBZ0lDQlJWVVZTV1Y5RVFWUkJPaUEyTEZ4dUlDQWdJRVpTUVVkTlJVNVVPaUEzWEc0Z0lIMDdYRzRnSUdaMWJtTjBhVzl1SUhOd2JHbDBLSFZ5YVNrZ2UxeHVJQ0FnSUhKbGRIVnliaUFvZFhKcExtMWhkR05vS0hOd2JHbDBVbVVwS1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCeVpXMXZkbVZFYjNSVFpXZHRaVzUwY3lod1lYUm9LU0I3WEc0Z0lDQWdhV1lnS0hCaGRHZ2dQVDA5SUNjdkp5bGNiaUFnSUNBZ0lISmxkSFZ5YmlBbkx5YzdYRzRnSUNBZ2RtRnlJR3hsWVdScGJtZFRiR0Z6YUNBOUlIQmhkR2hiTUYwZ1BUMDlJQ2N2SnlBL0lDY3ZKeUE2SUNjbk8xeHVJQ0FnSUhaaGNpQjBjbUZwYkdsdVoxTnNZWE5vSUQwZ2NHRjBhQzV6YkdsalpTZ3RNU2tnUFQwOUlDY3ZKeUEvSUNjdkp5QTZJQ2NuTzF4dUlDQWdJSFpoY2lCelpXZHRaVzUwY3lBOUlIQmhkR2d1YzNCc2FYUW9KeThuS1R0Y2JpQWdJQ0IyWVhJZ2IzVjBJRDBnVzEwN1hHNGdJQ0FnZG1GeUlIVndJRDBnTUR0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJ3YjNNZ1BTQXdPeUJ3YjNNZ1BDQnpaV2R0Wlc1MGN5NXNaVzVuZEdnN0lIQnZjeXNyS1NCN1hHNGdJQ0FnSUNCMllYSWdjMlZuYldWdWRDQTlJSE5sWjIxbGJuUnpXM0J2YzEwN1hHNGdJQ0FnSUNCemQybDBZMmdnS0hObFoyMWxiblFwSUh0Y2JpQWdJQ0FnSUNBZ1kyRnpaU0FuSnpwY2JpQWdJQ0FnSUNBZ1kyRnpaU0FuTGljNlhHNGdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lHTmhjMlVnSnk0dUp6cGNiaUFnSUNBZ0lDQWdJQ0JwWmlBb2IzVjBMbXhsYm1kMGFDbGNiaUFnSUNBZ0lDQWdJQ0FnSUc5MWRDNXdiM0FvS1R0Y2JpQWdJQ0FnSUNBZ0lDQmxiSE5sWEc0Z0lDQWdJQ0FnSUNBZ0lDQjFjQ3NyTzF4dUlDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNCa1pXWmhkV3gwT2x4dUlDQWdJQ0FnSUNBZ0lHOTFkQzV3ZFhOb0tITmxaMjFsYm5RcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JpQWdJQ0JwWmlBb0lXeGxZV1JwYm1kVGJHRnphQ2tnZTF4dUlDQWdJQ0FnZDJocGJHVWdLSFZ3TFMwZ1BpQXdLU0I3WEc0Z0lDQWdJQ0FnSUc5MWRDNTFibk5vYVdaMEtDY3VMaWNwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tHOTFkQzVzWlc1bmRHZ2dQVDA5SURBcFhHNGdJQ0FnSUNBZ0lHOTFkQzV3ZFhOb0tDY3VKeWs3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCc1pXRmthVzVuVTJ4aGMyZ2dLeUJ2ZFhRdWFtOXBiaWduTHljcElDc2dkSEpoYVd4cGJtZFRiR0Z6YUR0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCcWIybHVRVzVrUTJGdWIyNXBZMkZzYVhwbFVHRjBhQ2h3WVhKMGN5a2dlMXh1SUNBZ0lIWmhjaUJ3WVhSb0lEMGdjR0Z5ZEhOYlEyOXRjRzl1Wlc1MFNXNWtaWGd1VUVGVVNGMGdmSHdnSnljN1hHNGdJQ0FnY0dGMGFDQTlJSEpsYlc5MlpVUnZkRk5sWjIxbGJuUnpLSEJoZEdncE8xeHVJQ0FnSUhCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExsQkJWRWhkSUQwZ2NHRjBhRHRjYmlBZ0lDQnlaWFIxY200Z1luVnBiR1JHY205dFJXNWpiMlJsWkZCaGNuUnpLSEJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGxORFNFVk5SVjBzSUhCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExsVlRSVkpmU1U1R1QxMHNJSEJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGtSUFRVRkpUbDBzSUhCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExsQlBVbFJkTENCd1lYSjBjMXREYjIxd2IyNWxiblJKYm1SbGVDNVFRVlJJWFN3Z2NHRnlkSE5iUTI5dGNHOXVaVzUwU1c1a1pYZ3VVVlZGVWxsZlJFRlVRVjBzSUhCaGNuUnpXME52YlhCdmJtVnVkRWx1WkdWNExrWlNRVWROUlU1VVhTazdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdZMkZ1YjI1cFkyRnNhWHBsVlhKc0tIVnliQ2tnZTF4dUlDQWdJSFpoY2lCd1lYSjBjeUE5SUhOd2JHbDBLSFZ5YkNrN1hHNGdJQ0FnY21WMGRYSnVJR3B2YVc1QmJtUkRZVzV2Ym1sallXeHBlbVZRWVhSb0tIQmhjblJ6S1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCeVpYTnZiSFpsVlhKc0tHSmhjMlVzSUhWeWJDa2dlMXh1SUNBZ0lIWmhjaUJ3WVhKMGN5QTlJSE53YkdsMEtIVnliQ2s3WEc0Z0lDQWdkbUZ5SUdKaGMyVlFZWEowY3lBOUlITndiR2wwS0dKaGMyVXBPMXh1SUNBZ0lHbG1JQ2h3WVhKMGMxdERiMjF3YjI1bGJuUkpibVJsZUM1VFEwaEZUVVZkS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYW05cGJrRnVaRU5oYm05dWFXTmhiR2w2WlZCaGRHZ29jR0Z5ZEhNcE8xeHVJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0J3WVhKMGMxdERiMjF3YjI1bGJuUkpibVJsZUM1VFEwaEZUVVZkSUQwZ1ltRnpaVkJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGxORFNFVk5SVjA3WEc0Z0lDQWdmVnh1SUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0JEYjIxd2IyNWxiblJKYm1SbGVDNVRRMGhGVFVVN0lHa2dQRDBnUTI5dGNHOXVaVzUwU1c1a1pYZ3VVRTlTVkRzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0JwWmlBb0lYQmhjblJ6VzJsZEtTQjdYRzRnSUNBZ0lDQWdJSEJoY25SelcybGRJRDBnWW1GelpWQmhjblJ6VzJsZE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JpQWdJQ0JwWmlBb2NHRnlkSE5iUTI5dGNHOXVaVzUwU1c1a1pYZ3VVRUZVU0YxYk1GMGdQVDBnSnk4bktTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2FtOXBia0Z1WkVOaGJtOXVhV05oYkdsNlpWQmhkR2dvY0dGeWRITXBPMXh1SUNBZ0lIMWNiaUFnSUNCMllYSWdjR0YwYUNBOUlHSmhjMlZRWVhKMGMxdERiMjF3YjI1bGJuUkpibVJsZUM1UVFWUklYVHRjYmlBZ0lDQjJZWElnYVc1a1pYZ2dQU0J3WVhSb0xteGhjM1JKYm1SbGVFOW1LQ2N2SnlrN1hHNGdJQ0FnY0dGMGFDQTlJSEJoZEdndWMyeHBZMlVvTUN3Z2FXNWtaWGdnS3lBeEtTQXJJSEJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGxCQlZFaGRPMXh1SUNBZ0lIQmhjblJ6VzBOdmJYQnZibVZ1ZEVsdVpHVjRMbEJCVkVoZElEMGdjR0YwYUR0Y2JpQWdJQ0J5WlhSMWNtNGdhbTlwYmtGdVpFTmhibTl1YVdOaGJHbDZaVkJoZEdnb2NHRnlkSE1wTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdselFXSnpiMngxZEdVb2JtRnRaU2tnZTF4dUlDQWdJR2xtSUNnaGJtRnRaU2xjYmlBZ0lDQWdJSEpsZEhWeWJpQm1ZV3h6WlR0Y2JpQWdJQ0JwWmlBb2JtRnRaVnN3WFNBOVBUMGdKeThuS1Z4dUlDQWdJQ0FnY21WMGRYSnVJSFJ5ZFdVN1hHNGdJQ0FnZG1GeUlIQmhjblJ6SUQwZ2MzQnNhWFFvYm1GdFpTazdYRzRnSUNBZ2FXWWdLSEJoY25SelcwTnZiWEJ2Ym1WdWRFbHVaR1Y0TGxORFNFVk5SVjBwWEc0Z0lDQWdJQ0J5WlhSMWNtNGdkSEoxWlR0Y2JpQWdJQ0J5WlhSMWNtNGdabUZzYzJVN1hHNGdJSDFjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1OaGJtOXVhV05oYkdsNlpWVnliQ0E5SUdOaGJtOXVhV05oYkdsNlpWVnliRHRjYmlBZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1selFXSnpiMngxZEdVZ1BTQnBjMEZpYzI5c2RYUmxPMXh1SUNBa2RISmhZMlYxY2xKMWJuUnBiV1V1Y21WdGIzWmxSRzkwVTJWbmJXVnVkSE1nUFNCeVpXMXZkbVZFYjNSVFpXZHRaVzUwY3p0Y2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExuSmxjMjlzZG1WVmNtd2dQU0J5WlhOdmJIWmxWWEpzTzF4dWZTa29LVHRjYmlobWRXNWpkR2x2YmlncElIdGNiaUFnSjNWelpTQnpkSEpwWTNRbk8xeHVJQ0IyWVhJZ2RIbHdaWE1nUFNCN1hHNGdJQ0FnWVc1NU9pQjdibUZ0WlRvZ0oyRnVlU2Q5TEZ4dUlDQWdJR0p2YjJ4bFlXNDZJSHR1WVcxbE9pQW5ZbTl2YkdWaGJpZDlMRnh1SUNBZ0lHNTFiV0psY2pvZ2UyNWhiV1U2SUNkdWRXMWlaWEluZlN4Y2JpQWdJQ0J6ZEhKcGJtYzZJSHR1WVcxbE9pQW5jM1J5YVc1bkozMHNYRzRnSUNBZ2MzbHRZbTlzT2lCN2JtRnRaVG9nSjNONWJXSnZiQ2Q5TEZ4dUlDQWdJSFp2YVdRNklIdHVZVzFsT2lBbmRtOXBaQ2Q5WEc0Z0lIMDdYRzRnSUhaaGNpQkhaVzVsY21salZIbHdaU0E5SUdaMWJtTjBhVzl1SUVkbGJtVnlhV05VZVhCbEtIUjVjR1VzSUdGeVozVnRaVzUwVkhsd1pYTXBJSHRjYmlBZ0lDQjBhR2x6TG5SNWNHVWdQU0IwZVhCbE8xeHVJQ0FnSUhSb2FYTXVZWEpuZFcxbGJuUlVlWEJsY3lBOUlHRnlaM1Z0Wlc1MFZIbHdaWE03WEc0Z0lIMDdYRzRnSUNna2RISmhZMlYxY2xKMWJuUnBiV1V1WTNKbFlYUmxRMnhoYzNNcEtFZGxibVZ5YVdOVWVYQmxMQ0I3ZlN3Z2UzMHBPMXh1SUNCMllYSWdkSGx3WlZKbFoybHpkR1Z5SUQwZ1QySnFaV04wTG1OeVpXRjBaU2h1ZFd4c0tUdGNiaUFnWm5WdVkzUnBiMjRnWjJWdVpYSnBZMVI1Y0dVb2RIbHdaU2tnZTF4dUlDQWdJR1p2Y2lBb2RtRnlJR0Z5WjNWdFpXNTBWSGx3WlhNZ1BTQmJYU3hjYmlBZ0lDQWdJQ0FnSkY5Zk1TQTlJREU3SUNSZlh6RWdQQ0JoY21kMWJXVnVkSE11YkdWdVozUm9PeUFrWDE4eEt5c3BYRzRnSUNBZ0lDQmhjbWQxYldWdWRGUjVjR1Z6V3lSZlh6RWdMU0F4WFNBOUlHRnlaM1Z0Wlc1MGMxc2tYMTh4WFR0Y2JpQWdJQ0IyWVhJZ2RIbHdaVTFoY0NBOUlIUjVjR1ZTWldkcGMzUmxjanRjYmlBZ0lDQjJZWElnYTJWNUlEMGdKSFJ5WVdObGRYSlNkVzUwYVcxbExtZGxkRTkzYmtoaGMyaFBZbXBsWTNRb2RIbHdaU2t1YUdGemFEdGNiaUFnSUNCcFppQW9JWFI1Y0dWTllYQmJhMlY1WFNrZ2UxeHVJQ0FnSUNBZ2RIbHdaVTFoY0Z0clpYbGRJRDBnVDJKcVpXTjBMbU55WldGMFpTaHVkV3hzS1R0Y2JpQWdJQ0I5WEc0Z0lDQWdkSGx3WlUxaGNDQTlJSFI1Y0dWTllYQmJhMlY1WFR0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Ec2dhU0E4SUdGeVozVnRaVzUwVkhsd1pYTXViR1Z1WjNSb0lDMGdNVHNnYVNzcktTQjdYRzRnSUNBZ0lDQnJaWGtnUFNBa2RISmhZMlYxY2xKMWJuUnBiV1V1WjJWMFQzZHVTR0Z6YUU5aWFtVmpkQ2hoY21kMWJXVnVkRlI1Y0dWelcybGRLUzVvWVhOb08xeHVJQ0FnSUNBZ2FXWWdLQ0YwZVhCbFRXRndXMnRsZVYwcElIdGNiaUFnSUNBZ0lDQWdkSGx3WlUxaGNGdHJaWGxkSUQwZ1QySnFaV04wTG1OeVpXRjBaU2h1ZFd4c0tUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lIUjVjR1ZOWVhBZ1BTQjBlWEJsVFdGd1cydGxlVjA3WEc0Z0lDQWdmVnh1SUNBZ0lIWmhjaUIwWVdsc0lEMGdZWEpuZFcxbGJuUlVlWEJsYzF0aGNtZDFiV1Z1ZEZSNWNHVnpMbXhsYm1kMGFDQXRJREZkTzF4dUlDQWdJR3RsZVNBOUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1blpYUlBkMjVJWVhOb1QySnFaV04wS0hSaGFXd3BMbWhoYzJnN1hHNGdJQ0FnYVdZZ0tDRjBlWEJsVFdGd1cydGxlVjBwSUh0Y2JpQWdJQ0FnSUhSNWNHVk5ZWEJiYTJWNVhTQTlJRzVsZHlCSFpXNWxjbWxqVkhsd1pTaDBlWEJsTENCaGNtZDFiV1Z1ZEZSNWNHVnpLVHRjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUhSNWNHVk5ZWEJiYTJWNVhUdGNiaUFnZlZ4dUlDQWtkSEpoWTJWMWNsSjFiblJwYldVdVIyVnVaWEpwWTFSNWNHVWdQU0JIWlc1bGNtbGpWSGx3WlR0Y2JpQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExtZGxibVZ5YVdOVWVYQmxJRDBnWjJWdVpYSnBZMVI1Y0dVN1hHNGdJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNTBlWEJsSUQwZ2RIbHdaWE03WEc1OUtTZ3BPMXh1S0daMWJtTjBhVzl1S0dkc2IySmhiQ2tnZTF4dUlDQW5kWE5sSUhOMGNtbGpkQ2M3WEc0Z0lIWmhjaUFrWDE4eUlEMGdKSFJ5WVdObGRYSlNkVzUwYVcxbExGeHVJQ0FnSUNBZ1kyRnViMjVwWTJGc2FYcGxWWEpzSUQwZ0pGOWZNaTVqWVc1dmJtbGpZV3hwZW1WVmNtd3NYRzRnSUNBZ0lDQnlaWE52YkhabFZYSnNJRDBnSkY5Zk1pNXlaWE52YkhabFZYSnNMRnh1SUNBZ0lDQWdhWE5CWW5OdmJIVjBaU0E5SUNSZlh6SXVhWE5CWW5OdmJIVjBaVHRjYmlBZ2RtRnlJRzF2WkhWc1pVbHVjM1JoYm5ScFlYUnZjbk1nUFNCUFltcGxZM1F1WTNKbFlYUmxLRzUxYkd3cE8xeHVJQ0IyWVhJZ1ltRnpaVlZTVER0Y2JpQWdhV1lnS0dkc2IySmhiQzVzYjJOaGRHbHZiaUFtSmlCbmJHOWlZV3d1Ykc5allYUnBiMjR1YUhKbFppbGNiaUFnSUNCaVlYTmxWVkpNSUQwZ2NtVnpiMngyWlZWeWJDaG5iRzlpWVd3dWJHOWpZWFJwYjI0dWFISmxaaXdnSnk0dkp5azdYRzRnSUdWc2MyVmNiaUFnSUNCaVlYTmxWVkpNSUQwZ0p5YzdYRzRnSUhaaGNpQlZibU52WVhSbFpFMXZaSFZzWlVWdWRISjVJRDBnWm5WdVkzUnBiMjRnVlc1amIyRjBaV1JOYjJSMWJHVkZiblJ5ZVNoMWNtd3NJSFZ1WTI5aGRHVmtUVzlrZFd4bEtTQjdYRzRnSUNBZ2RHaHBjeTUxY213Z1BTQjFjbXc3WEc0Z0lDQWdkR2hwY3k1MllXeDFaVjhnUFNCMWJtTnZZWFJsWkUxdlpIVnNaVHRjYmlBZ2ZUdGNiaUFnS0NSMGNtRmpaWFZ5VW5WdWRHbHRaUzVqY21WaGRHVkRiR0Z6Y3lrb1ZXNWpiMkYwWldSTmIyUjFiR1ZGYm5SeWVTd2dlMzBzSUh0OUtUdGNiaUFnZG1GeUlFMXZaSFZzWlVWMllXeDFZWFJwYjI1RmNuSnZjaUE5SUdaMWJtTjBhVzl1SUUxdlpIVnNaVVYyWVd4MVlYUnBiMjVGY25KdmNpaGxjbkp2Ym1WdmRYTk5iMlIxYkdWT1lXMWxMQ0JqWVhWelpTa2dlMXh1SUNBZ0lIUm9hWE11YldWemMyRm5aU0E5SUhSb2FYTXVZMjl1YzNSeWRXTjBiM0l1Ym1GdFpTQXJJQ2M2SUNjZ0t5QjBhR2x6TG5OMGNtbHdRMkYxYzJVb1kyRjFjMlVwSUNzZ0p5QnBiaUFuSUNzZ1pYSnliMjVsYjNWelRXOWtkV3hsVG1GdFpUdGNiaUFnSUNCcFppQW9JU2hqWVhWelpTQnBibk4wWVc1alpXOW1JQ1JOYjJSMWJHVkZkbUZzZFdGMGFXOXVSWEp5YjNJcElDWW1JR05oZFhObExuTjBZV05yS1Z4dUlDQWdJQ0FnZEdocGN5NXpkR0ZqYXlBOUlIUm9hWE11YzNSeWFYQlRkR0ZqYXloallYVnpaUzV6ZEdGamF5azdYRzRnSUNBZ1pXeHpaVnh1SUNBZ0lDQWdkR2hwY3k1emRHRmpheUE5SUNjbk8xeHVJQ0I5TzF4dUlDQjJZWElnSkUxdlpIVnNaVVYyWVd4MVlYUnBiMjVGY25KdmNpQTlJRTF2WkhWc1pVVjJZV3gxWVhScGIyNUZjbkp2Y2p0Y2JpQWdLQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWpjbVZoZEdWRGJHRnpjeWtvVFc5a2RXeGxSWFpoYkhWaGRHbHZia1Z5Y205eUxDQjdYRzRnSUNBZ2MzUnlhWEJGY25KdmNqb2dablZ1WTNScGIyNG9iV1Z6YzJGblpTa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHMWxjM05oWjJVdWNtVndiR0ZqWlNndkxpcEZjbkp2Y2pvdkxDQjBhR2x6TG1OdmJuTjBjblZqZEc5eUxtNWhiV1VnS3lBbk9pY3BPMXh1SUNBZ0lIMHNYRzRnSUNBZ2MzUnlhWEJEWVhWelpUb2dablZ1WTNScGIyNG9ZMkYxYzJVcElIdGNiaUFnSUNBZ0lHbG1JQ2doWTJGMWMyVXBYRzRnSUNBZ0lDQWdJSEpsZEhWeWJpQW5KenRjYmlBZ0lDQWdJR2xtSUNnaFkyRjFjMlV1YldWemMyRm5aU2xjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR05oZFhObElDc2dKeWM3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdkR2hwY3k1emRISnBjRVZ5Y205eUtHTmhkWE5sTG0xbGMzTmhaMlVwTzF4dUlDQWdJSDBzWEc0Z0lDQWdiRzloWkdWa1FuazZJR1oxYm1OMGFXOXVLRzF2WkhWc1pVNWhiV1VwSUh0Y2JpQWdJQ0FnSUhSb2FYTXVjM1JoWTJzZ0t6MGdKMXhjYmlCc2IyRmtaV1FnWW5rZ0p5QXJJRzF2WkhWc1pVNWhiV1U3WEc0Z0lDQWdmU3hjYmlBZ0lDQnpkSEpwY0ZOMFlXTnJPaUJtZFc1amRHbHZiaWhqWVhWelpWTjBZV05yS1NCN1hHNGdJQ0FnSUNCMllYSWdjM1JoWTJzZ1BTQmJYVHRjYmlBZ0lDQWdJR05oZFhObFUzUmhZMnN1YzNCc2FYUW9KMXhjYmljcExuTnZiV1VvS0daMWJtTjBhVzl1S0daeVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUdsbUlDZ3ZWVzVqYjJGMFpXUk5iMlIxYkdWSmJuTjBZVzUwYVdGMGIzSXZMblJsYzNRb1puSmhiV1VwS1Z4dUlDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCMGNuVmxPMXh1SUNBZ0lDQWdJQ0J6ZEdGamF5NXdkWE5vS0daeVlXMWxLVHRjYmlBZ0lDQWdJSDBwS1R0Y2JpQWdJQ0FnSUhOMFlXTnJXekJkSUQwZ2RHaHBjeTV6ZEhKcGNFVnljbTl5S0hOMFlXTnJXekJkS1R0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6ZEdGamF5NXFiMmx1S0NkY1hHNG5LVHRjYmlBZ0lDQjlYRzRnSUgwc0lIdDlMQ0JGY25KdmNpazdYRzRnSUdaMWJtTjBhVzl1SUdKbFptOXlaVXhwYm1WektHeHBibVZ6TENCdWRXMWlaWElwSUh0Y2JpQWdJQ0IyWVhJZ2NtVnpkV3gwSUQwZ1cxMDdYRzRnSUNBZ2RtRnlJR1pwY25OMElEMGdiblZ0WW1WeUlDMGdNenRjYmlBZ0lDQnBaaUFvWm1seWMzUWdQQ0F3S1Z4dUlDQWdJQ0FnWm1seWMzUWdQU0F3TzF4dUlDQWdJR1p2Y2lBb2RtRnlJR2tnUFNCbWFYSnpkRHNnYVNBOElHNTFiV0psY2pzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0J5WlhOMWJIUXVjSFZ6YUNoc2FXNWxjMXRwWFNrN1hHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQnlaWE4xYkhRN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1lXWjBaWEpNYVc1bGN5aHNhVzVsY3l3Z2JuVnRZbVZ5S1NCN1hHNGdJQ0FnZG1GeUlHeGhjM1FnUFNCdWRXMWlaWElnS3lBeE8xeHVJQ0FnSUdsbUlDaHNZWE4wSUQ0Z2JHbHVaWE11YkdWdVozUm9JQzBnTVNsY2JpQWdJQ0FnSUd4aGMzUWdQU0JzYVc1bGN5NXNaVzVuZEdnZ0xTQXhPMXh1SUNBZ0lIWmhjaUJ5WlhOMWJIUWdQU0JiWFR0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ2JuVnRZbVZ5T3lCcElEdzlJR3hoYzNRN0lHa3JLeWtnZTF4dUlDQWdJQ0FnY21WemRXeDBMbkIxYzJnb2JHbHVaWE5iYVYwcE8xeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdjbVZ6ZFd4ME8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHTnZiSFZ0YmxOd1lXTnBibWNvWTI5c2RXMXVjeWtnZTF4dUlDQWdJSFpoY2lCeVpYTjFiSFFnUFNBbkp6dGNiaUFnSUNCbWIzSWdLSFpoY2lCcElEMGdNRHNnYVNBOElHTnZiSFZ0Ym5NZ0xTQXhPeUJwS3lzcElIdGNiaUFnSUNBZ0lISmxjM1ZzZENBclBTQW5MU2M3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlCeVpYTjFiSFE3WEc0Z0lIMWNiaUFnZG1GeUlGVnVZMjloZEdWa1RXOWtkV3hsU1c1emRHRnVkR2xoZEc5eUlEMGdablZ1WTNScGIyNGdWVzVqYjJGMFpXUk5iMlIxYkdWSmJuTjBZVzUwYVdGMGIzSW9kWEpzTENCbWRXNWpLU0I3WEc0Z0lDQWdKSFJ5WVdObGRYSlNkVzUwYVcxbExuTjFjR1Z5UTI5dWMzUnlkV04wYjNJb0pGVnVZMjloZEdWa1RXOWtkV3hsU1c1emRHRnVkR2xoZEc5eUtTNWpZV3hzS0hSb2FYTXNJSFZ5YkN3Z2JuVnNiQ2s3WEc0Z0lDQWdkR2hwY3k1bWRXNWpJRDBnWm5WdVl6dGNiaUFnZlR0Y2JpQWdkbUZ5SUNSVmJtTnZZWFJsWkUxdlpIVnNaVWx1YzNSaGJuUnBZWFJ2Y2lBOUlGVnVZMjloZEdWa1RXOWtkV3hsU1c1emRHRnVkR2xoZEc5eU8xeHVJQ0FvSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU55WldGMFpVTnNZWE56S1NoVmJtTnZZWFJsWkUxdlpIVnNaVWx1YzNSaGJuUnBZWFJ2Y2l3Z2UyZGxkRlZ1WTI5aGRHVmtUVzlrZFd4bE9pQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJR2xtSUNoMGFHbHpMblpoYkhWbFh5bGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE11ZG1Gc2RXVmZPMXh1SUNBZ0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJSEpsYkdGMGFYWmxVbVZ4ZFdseVpUdGNiaUFnSUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUFrZEhKaFkyVjFjbEoxYm5ScGJXVWdJVDA5SUhWdVpHVm1hVzVsWkNrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEpsYkdGMGFYWmxVbVZ4ZFdseVpTQTlJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNXlaWEYxYVhKbExtSnBibVFvYm5Wc2JDd2dkR2hwY3k1MWNtd3BPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIwYUdsekxuWmhiSFZsWHlBOUlIUm9hWE11Wm5WdVl5NWpZV3hzS0dkc2IySmhiQ3dnY21Wc1lYUnBkbVZTWlhGMWFYSmxLVHRjYmlBZ0lDQWdJSDBnWTJGMFkyZ2dLR1Y0S1NCN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hsZUNCcGJuTjBZVzVqWlc5bUlFMXZaSFZzWlVWMllXeDFZWFJwYjI1RmNuSnZjaWtnZTF4dUlDQWdJQ0FnSUNBZ0lHVjRMbXh2WVdSbFpFSjVLSFJvYVhNdWRYSnNLVHRjYmlBZ0lDQWdJQ0FnSUNCMGFISnZkeUJsZUR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQnBaaUFvWlhndWMzUmhZMnNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQjJZWElnYkdsdVpYTWdQU0IwYUdsekxtWjFibU11ZEc5VGRISnBibWNvS1M1emNHeHBkQ2duWEZ4dUp5azdYRzRnSUNBZ0lDQWdJQ0FnZG1GeUlHVjJZV3hsWkNBOUlGdGRPMXh1SUNBZ0lDQWdJQ0FnSUdWNExuTjBZV05yTG5Od2JHbDBLQ2RjWEc0bktTNXpiMjFsS0daMWJtTjBhVzl1S0daeVlXMWxLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQnBaaUFvWm5KaGJXVXVhVzVrWlhoUFppZ25WVzVqYjJGMFpXUk5iMlIxYkdWSmJuTjBZVzUwYVdGMGIzSXVaMlYwVlc1amIyRjBaV1JOYjJSMWJHVW5LU0ErSURBcFhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUIwY25WbE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZG1GeUlHMGdQU0F2S0dGMFhGeHpXMTVjWEhOZEtseGNjeWt1S2o0NktGeGNaQ29wT2loY1hHUXFLVnhjS1M4dVpYaGxZeWhtY21GdFpTazdYRzRnSUNBZ0lDQWdJQ0FnSUNCcFppQW9iU2tnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVhJZ2JHbHVaU0E5SUhCaGNuTmxTVzUwS0cxYk1sMHNJREV3S1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWlhaaGJHVmtJRDBnWlhaaGJHVmtMbU52Ym1OaGRDaGlaV1p2Y21WTWFXNWxjeWhzYVc1bGN5d2diR2x1WlNrcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCbGRtRnNaV1F1Y0hWemFDaGpiMngxYlc1VGNHRmphVzVuS0cxYk0xMHBJQ3NnSjE0bktUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1pYWmhiR1ZrSUQwZ1pYWmhiR1ZrTG1OdmJtTmhkQ2hoWm5SbGNreHBibVZ6S0d4cGJtVnpMQ0JzYVc1bEtTazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHVjJZV3hsWkM1d2RYTm9LQ2M5SUQwZ1BTQTlJRDBnUFNBOUlEMGdQU2NwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1pYWmhiR1ZrTG5CMWMyZ29abkpoYldVcE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNBZ0lIMHBPMXh1SUNBZ0lDQWdJQ0FnSUdWNExuTjBZV05ySUQwZ1pYWmhiR1ZrTG1wdmFXNG9KMXhjYmljcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJOYjJSMWJHVkZkbUZzZFdGMGFXOXVSWEp5YjNJb2RHaHBjeTUxY213c0lHVjRLVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlmU3dnZTMwc0lGVnVZMjloZEdWa1RXOWtkV3hsUlc1MGNua3BPMXh1SUNCbWRXNWpkR2x2YmlCblpYUlZibU52WVhSbFpFMXZaSFZzWlVsdWMzUmhiblJwWVhSdmNpaHVZVzFsS1NCN1hHNGdJQ0FnYVdZZ0tDRnVZVzFsS1Z4dUlDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lIWmhjaUIxY213Z1BTQk5iMlIxYkdWVGRHOXlaUzV1YjNKdFlXeHBlbVVvYm1GdFpTazdYRzRnSUNBZ2NtVjBkWEp1SUcxdlpIVnNaVWx1YzNSaGJuUnBZWFJ2Y25OYmRYSnNYVHRjYmlBZ2ZWeHVJQ0E3WEc0Z0lIWmhjaUJ0YjJSMWJHVkpibk4wWVc1alpYTWdQU0JQWW1wbFkzUXVZM0psWVhSbEtHNTFiR3dwTzF4dUlDQjJZWElnYkdsMlpVMXZaSFZzWlZObGJuUnBibVZzSUQwZ2UzMDdYRzRnSUdaMWJtTjBhVzl1SUUxdlpIVnNaU2gxYm1OdllYUmxaRTF2WkhWc1pTa2dlMXh1SUNBZ0lIWmhjaUJwYzB4cGRtVWdQU0JoY21kMWJXVnVkSE5iTVYwN1hHNGdJQ0FnZG1GeUlHTnZZWFJsWkUxdlpIVnNaU0E5SUU5aWFtVmpkQzVqY21WaGRHVW9iblZzYkNrN1hHNGdJQ0FnVDJKcVpXTjBMbWRsZEU5M2JsQnliM0JsY25SNVRtRnRaWE1vZFc1amIyRjBaV1JOYjJSMWJHVXBMbVp2Y2tWaFkyZ29LR1oxYm1OMGFXOXVLRzVoYldVcElIdGNiaUFnSUNBZ0lIWmhjaUJuWlhSMFpYSXNYRzRnSUNBZ0lDQWdJQ0FnZG1Gc2RXVTdYRzRnSUNBZ0lDQnBaaUFvYVhOTWFYWmxJRDA5UFNCc2FYWmxUVzlrZFd4bFUyVnVkR2x1Wld3cElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUdSbGMyTnlJRDBnVDJKcVpXTjBMbWRsZEU5M2JsQnliM0JsY25SNVJHVnpZM0pwY0hSdmNpaDFibU52WVhSbFpFMXZaSFZzWlN3Z2JtRnRaU2s3WEc0Z0lDQWdJQ0FnSUdsbUlDaGtaWE5qY2k1blpYUXBYRzRnSUNBZ0lDQWdJQ0FnWjJWMGRHVnlJRDBnWkdWelkzSXVaMlYwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYVdZZ0tDRm5aWFIwWlhJcElIdGNiaUFnSUNBZ0lDQWdkbUZzZFdVZ1BTQjFibU52WVhSbFpFMXZaSFZzWlZ0dVlXMWxYVHRjYmlBZ0lDQWdJQ0FnWjJWMGRHVnlJRDBnWm5WdVkzUnBiMjRvS1NCN1hHNGdJQ0FnSUNBZ0lDQWdjbVYwZFhKdUlIWmhiSFZsTzF4dUlDQWdJQ0FnSUNCOU8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ1QySnFaV04wTG1SbFptbHVaVkJ5YjNCbGNuUjVLR052WVhSbFpFMXZaSFZzWlN3Z2JtRnRaU3dnZTF4dUlDQWdJQ0FnSUNCblpYUTZJR2RsZEhSbGNpeGNiaUFnSUNBZ0lDQWdaVzUxYldWeVlXSnNaVG9nZEhKMVpWeHVJQ0FnSUNBZ2ZTazdYRzRnSUNBZ2ZTa3BPMXh1SUNBZ0lFOWlhbVZqZEM1d2NtVjJaVzUwUlhoMFpXNXphVzl1Y3loamIyRjBaV1JOYjJSMWJHVXBPMXh1SUNBZ0lISmxkSFZ5YmlCamIyRjBaV1JOYjJSMWJHVTdYRzRnSUgxY2JpQWdkbUZ5SUUxdlpIVnNaVk4wYjNKbElEMGdlMXh1SUNBZ0lHNXZjbTFoYkdsNlpUb2dablZ1WTNScGIyNG9ibUZ0WlN3Z2NtVm1aWEpsY2s1aGJXVXNJSEpsWm1WeVpYSkJaR1J5WlhOektTQjdYRzRnSUNBZ0lDQnBaaUFvZEhsd1pXOW1JRzVoYldVZ0lUMDlJQ2R6ZEhKcGJtY25LVnh1SUNBZ0lDQWdJQ0IwYUhKdmR5QnVaWGNnVkhsd1pVVnljbTl5S0NkdGIyUjFiR1VnYm1GdFpTQnRkWE4wSUdKbElHRWdjM1J5YVc1bkxDQnViM1FnSnlBcklIUjVjR1Z2WmlCdVlXMWxLVHRjYmlBZ0lDQWdJR2xtSUNocGMwRmljMjlzZFhSbEtHNWhiV1VwS1Z4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnWTJGdWIyNXBZMkZzYVhwbFZYSnNLRzVoYldVcE8xeHVJQ0FnSUNBZ2FXWWdLQzliWGx4Y0xsMWNYQzljWEM1Y1hDNWNYQzh2TG5SbGMzUW9ibUZ0WlNrcElIdGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRVZ5Y205eUtDZHRiMlIxYkdVZ2JtRnRaU0JsYldKbFpITWdMeTR1THpvZ0p5QXJJRzVoYldVcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2FXWWdLRzVoYldWYk1GMGdQVDA5SUNjdUp5QW1KaUJ5WldabGNtVnlUbUZ0WlNsY2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhKbGMyOXNkbVZWY213b2NtVm1aWEpsY2s1aGJXVXNJRzVoYldVcE8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUdOaGJtOXVhV05oYkdsNlpWVnliQ2h1WVcxbEtUdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGREb2dablZ1WTNScGIyNG9ibTl5YldGc2FYcGxaRTVoYldVcElIdGNiaUFnSUNBZ0lIWmhjaUJ0SUQwZ1oyVjBWVzVqYjJGMFpXUk5iMlIxYkdWSmJuTjBZVzUwYVdGMGIzSW9ibTl5YldGc2FYcGxaRTVoYldVcE8xeHVJQ0FnSUNBZ2FXWWdLQ0Z0S1Z4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZFc1a1pXWnBibVZrTzF4dUlDQWdJQ0FnZG1GeUlHMXZaSFZzWlVsdWMzUmhibU5sSUQwZ2JXOWtkV3hsU1c1emRHRnVZMlZ6VzIwdWRYSnNYVHRjYmlBZ0lDQWdJR2xtSUNodGIyUjFiR1ZKYm5OMFlXNWpaU2xjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzF2WkhWc1pVbHVjM1JoYm1ObE8xeHVJQ0FnSUNBZ2JXOWtkV3hsU1c1emRHRnVZMlVnUFNCTmIyUjFiR1VvYlM1blpYUlZibU52WVhSbFpFMXZaSFZzWlNncExDQnNhWFpsVFc5a2RXeGxVMlZ1ZEdsdVpXd3BPMXh1SUNBZ0lDQWdjbVYwZFhKdUlHMXZaSFZzWlVsdWMzUmhibU5sYzF0dExuVnliRjBnUFNCdGIyUjFiR1ZKYm5OMFlXNWpaVHRjYmlBZ0lDQjlMRnh1SUNBZ0lITmxkRG9nWm5WdVkzUnBiMjRvYm05eWJXRnNhWHBsWkU1aGJXVXNJRzF2WkhWc1pTa2dlMXh1SUNBZ0lDQWdibTl5YldGc2FYcGxaRTVoYldVZ1BTQlRkSEpwYm1jb2JtOXliV0ZzYVhwbFpFNWhiV1VwTzF4dUlDQWdJQ0FnYlc5a2RXeGxTVzV6ZEdGdWRHbGhkRzl5YzF0dWIzSnRZV3hwZW1Wa1RtRnRaVjBnUFNCdVpYY2dWVzVqYjJGMFpXUk5iMlIxYkdWSmJuTjBZVzUwYVdGMGIzSW9ibTl5YldGc2FYcGxaRTVoYldVc0lDaG1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJRzF2WkhWc1pUdGNiaUFnSUNBZ0lIMHBLVHRjYmlBZ0lDQWdJRzF2WkhWc1pVbHVjM1JoYm1ObGMxdHViM0p0WVd4cGVtVmtUbUZ0WlYwZ1BTQnRiMlIxYkdVN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ1ltRnpaVlZTVENncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCaVlYTmxWVkpNTzF4dUlDQWdJSDBzWEc0Z0lDQWdjMlYwSUdKaGMyVlZVa3dvZGlrZ2UxeHVJQ0FnSUNBZ1ltRnpaVlZTVENBOUlGTjBjbWx1WnloMktUdGNiaUFnSUNCOUxGeHVJQ0FnSUhKbFoybHpkR1Z5VFc5a2RXeGxPaUJtZFc1amRHbHZiaWh1WVcxbExDQmtaWEJ6TENCbWRXNWpLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2JtOXliV0ZzYVhwbFpFNWhiV1VnUFNCTmIyUjFiR1ZUZEc5eVpTNXViM0p0WVd4cGVtVW9ibUZ0WlNrN1hHNGdJQ0FnSUNCcFppQW9iVzlrZFd4bFNXNXpkR0Z1ZEdsaGRHOXljMXR1YjNKdFlXeHBlbVZrVG1GdFpWMHBYRzRnSUNBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25aSFZ3YkdsallYUmxJRzF2WkhWc1pTQnVZVzFsWkNBbklDc2dibTl5YldGc2FYcGxaRTVoYldVcE8xeHVJQ0FnSUNBZ2JXOWtkV3hsU1c1emRHRnVkR2xoZEc5eWMxdHViM0p0WVd4cGVtVmtUbUZ0WlYwZ1BTQnVaWGNnVlc1amIyRjBaV1JOYjJSMWJHVkpibk4wWVc1MGFXRjBiM0lvYm05eWJXRnNhWHBsWkU1aGJXVXNJR1oxYm1NcE8xeHVJQ0FnSUgwc1hHNGdJQ0FnWW5WdVpHeGxVM1J2Y21VNklFOWlhbVZqZEM1amNtVmhkR1VvYm5Wc2JDa3NYRzRnSUNBZ2NtVm5hWE4wWlhJNklHWjFibU4wYVc5dUtHNWhiV1VzSUdSbGNITXNJR1oxYm1NcElIdGNiaUFnSUNBZ0lHbG1JQ2doWkdWd2N5QjhmQ0FoWkdWd2N5NXNaVzVuZEdnZ0ppWWdJV1oxYm1NdWJHVnVaM1JvS1NCN1hHNGdJQ0FnSUNBZ0lIUm9hWE11Y21WbmFYTjBaWEpOYjJSMWJHVW9ibUZ0WlN3Z1pHVndjeXdnWm5WdVl5azdYRzRnSUNBZ0lDQjlJR1ZzYzJVZ2UxeHVJQ0FnSUNBZ0lDQjBhR2x6TG1KMWJtUnNaVk4wYjNKbFcyNWhiV1ZkSUQwZ2UxeHVJQ0FnSUNBZ0lDQWdJR1JsY0hNNklHUmxjSE1zWEc0Z0lDQWdJQ0FnSUNBZ1pYaGxZM1YwWlRvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCMllYSWdKRjlmTUNBOUlHRnlaM1Z0Wlc1MGN6dGNiaUFnSUNBZ0lDQWdJQ0FnSUhaaGNpQmtaWEJOWVhBZ1BTQjdmVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHUmxjSE11Wm05eVJXRmphQ2dvWm5WdVkzUnBiMjRvWkdWd0xDQnBibVJsZUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnWkdWd1RXRndXMlJsY0YwZ1BTQWtYMTh3VzJsdVpHVjRYVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIMHBLVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lIWmhjaUJ5WldkcGMzUnllVVZ1ZEhKNUlEMGdablZ1WXk1allXeHNLSFJvYVhNc0lHUmxjRTFoY0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0J5WldkcGMzUnllVVZ1ZEhKNUxtVjRaV04xZEdVdVkyRnNiQ2gwYUdsektUdGNiaUFnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJ5WldkcGMzUnllVVZ1ZEhKNUxtVjRjRzl5ZEhNN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0I5TzF4dUlDQWdJQ0FnZlZ4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwUVc1dmJubHRiM1Z6VFc5a2RXeGxPaUJtZFc1amRHbHZiaWhtZFc1aktTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2JtVjNJRTF2WkhWc1pTaG1kVzVqTG1OaGJHd29aMnh2WW1Gc0tTd2diR2wyWlUxdlpIVnNaVk5sYm5ScGJtVnNLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkRVp2Y2xSbGMzUnBibWM2SUdaMWJtTjBhVzl1S0c1aGJXVXBJSHRjYmlBZ0lDQWdJSFpoY2lBa1gxOHdJRDBnZEdocGN6dGNiaUFnSUNBZ0lHbG1JQ2doZEdocGN5NTBaWE4wYVc1blVISmxabWw0WHlrZ2UxeHVJQ0FnSUNBZ0lDQlBZbXBsWTNRdWEyVjVjeWh0YjJSMWJHVkpibk4wWVc1alpYTXBMbk52YldVb0tHWjFibU4wYVc5dUtHdGxlU2tnZTF4dUlDQWdJQ0FnSUNBZ0lIWmhjaUJ0SUQwZ0x5aDBjbUZqWlhWeVFGdGVYRnd2WFNwY1hDOHBMeTVsZUdWaktHdGxlU2s3WEc0Z0lDQWdJQ0FnSUNBZ2FXWWdLRzBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ1JmWHpBdWRHVnpkR2x1WjFCeVpXWnBlRjhnUFNCdFd6RmRPMXh1SUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSeWRXVTdYRzRnSUNBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnSUNCOUtTazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTVuWlhRb2RHaHBjeTUwWlhOMGFXNW5VSEpsWm1sNFh5QXJJRzVoYldVcE8xeHVJQ0FnSUgxY2JpQWdmVHRjYmlBZ2RtRnlJRzF2WkhWc1pWTjBiM0psVFc5a2RXeGxJRDBnYm1WM0lFMXZaSFZzWlNoN1RXOWtkV3hsVTNSdmNtVTZJRTF2WkhWc1pWTjBiM0psZlNrN1hHNGdJRTF2WkhWc1pWTjBiM0psTG5ObGRDZ25RSFJ5WVdObGRYSXZjM0pqTDNKMWJuUnBiV1V2VFc5a2RXeGxVM1J2Y21VbkxDQnRiMlIxYkdWVGRHOXlaVTF2WkhWc1pTazdYRzRnSUUxdlpIVnNaVk4wYjNKbExuTmxkQ2duUUhSeVlXTmxkWEl2YzNKakwzSjFiblJwYldVdlRXOWtkV3hsVTNSdmNtVXVhbk1uTENCdGIyUjFiR1ZUZEc5eVpVMXZaSFZzWlNrN1hHNGdJSFpoY2lCelpYUjFjRWRzYjJKaGJITWdQU0FrZEhKaFkyVjFjbEoxYm5ScGJXVXVjMlYwZFhCSGJHOWlZV3h6TzF4dUlDQWtkSEpoWTJWMWNsSjFiblJwYldVdWMyVjBkWEJIYkc5aVlXeHpJRDBnWm5WdVkzUnBiMjRvWjJ4dlltRnNLU0I3WEc0Z0lDQWdjMlYwZFhCSGJHOWlZV3h6S0dkc2IySmhiQ2s3WEc0Z0lIMDdYRzRnSUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVOYjJSMWJHVlRkRzl5WlNBOUlFMXZaSFZzWlZOMGIzSmxPMXh1SUNCbmJHOWlZV3d1VTNsemRHVnRJRDBnZTF4dUlDQWdJSEpsWjJsemRHVnlPaUJOYjJSMWJHVlRkRzl5WlM1eVpXZHBjM1JsY2k1aWFXNWtLRTF2WkhWc1pWTjBiM0psS1N4Y2JpQWdJQ0J5WldkcGMzUmxjazF2WkhWc1pUb2dUVzlrZFd4bFUzUnZjbVV1Y21WbmFYTjBaWEpOYjJSMWJHVXVZbWx1WkNoTmIyUjFiR1ZUZEc5eVpTa3NYRzRnSUNBZ1oyVjBPaUJOYjJSMWJHVlRkRzl5WlM1blpYUXNYRzRnSUNBZ2MyVjBPaUJOYjJSMWJHVlRkRzl5WlM1elpYUXNYRzRnSUNBZ2JtOXliV0ZzYVhwbE9pQk5iMlIxYkdWVGRHOXlaUzV1YjNKdFlXeHBlbVZjYmlBZ2ZUdGNiaUFnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbWRsZEUxdlpIVnNaVWx0Y0d3Z1BTQm1kVzVqZEdsdmJpaHVZVzFsS1NCN1hHNGdJQ0FnZG1GeUlHbHVjM1JoYm5ScFlYUnZjaUE5SUdkbGRGVnVZMjloZEdWa1RXOWtkV3hsU1c1emRHRnVkR2xoZEc5eUtHNWhiV1VwTzF4dUlDQWdJSEpsZEhWeWJpQnBibk4wWVc1MGFXRjBiM0lnSmlZZ2FXNXpkR0Z1ZEdsaGRHOXlMbWRsZEZWdVkyOWhkR1ZrVFc5a2RXeGxLQ2s3WEc0Z0lIMDdYRzU5S1NoMGVYQmxiMllnZDJsdVpHOTNJQ0U5UFNBbmRXNWtaV1pwYm1Wa0p5QS9JSGRwYm1SdmR5QTZJSFI1Y0dWdlppQm5iRzlpWVd3Z0lUMDlJQ2QxYm1SbFptbHVaV1FuSUQ4Z1oyeHZZbUZzSURvZ2RIbHdaVzltSUhObGJHWWdJVDA5SUNkMWJtUmxabWx1WldRbklEOGdjMlZzWmlBNklIUm9hWE1wTzF4dVUzbHpkR1Z0TG5KbFoybHpkR1Z5VFc5a2RXeGxLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12ZFhScGJITXVhbk5jSWl3Z1cxMHNJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQmNJblZ6WlNCemRISnBZM1JjSWp0Y2JpQWdkbUZ5SUY5ZmJXOWtkV3hsVG1GdFpTQTlJRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12ZFhScGJITXVhbk5jSWp0Y2JpQWdkbUZ5SUNSalpXbHNJRDBnVFdGMGFDNWpaV2xzTzF4dUlDQjJZWElnSkdac2IyOXlJRDBnVFdGMGFDNW1iRzl2Y2p0Y2JpQWdkbUZ5SUNScGMwWnBibWwwWlNBOUlHbHpSbWx1YVhSbE8xeHVJQ0IyWVhJZ0pHbHpUbUZPSUQwZ2FYTk9ZVTQ3WEc0Z0lIWmhjaUFrY0c5M0lEMGdUV0YwYUM1d2IzYzdYRzRnSUhaaGNpQWtiV2x1SUQwZ1RXRjBhQzV0YVc0N1hHNGdJSFpoY2lCMGIwOWlhbVZqZENBOUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1MGIwOWlhbVZqZER0Y2JpQWdablZ1WTNScGIyNGdkRzlWYVc1ME16SW9lQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQjRJRDQrUGlBd08xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHbHpUMkpxWldOMEtIZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z2VDQW1KaUFvZEhsd1pXOW1JSGdnUFQwOUlDZHZZbXBsWTNRbklIeDhJSFI1Y0dWdlppQjRJRDA5UFNBblpuVnVZM1JwYjI0bktUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnBjME5oYkd4aFlteGxLSGdwSUh0Y2JpQWdJQ0J5WlhSMWNtNGdkSGx3Wlc5bUlIZ2dQVDA5SUNkbWRXNWpkR2x2YmljN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2FYTk9kVzFpWlhJb2VDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCMGVYQmxiMllnZUNBOVBUMGdKMjUxYldKbGNpYzdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdkRzlKYm5SbFoyVnlLSGdwSUh0Y2JpQWdJQ0I0SUQwZ0szZzdYRzRnSUNBZ2FXWWdLQ1JwYzA1aFRpaDRLU2xjYmlBZ0lDQWdJSEpsZEhWeWJpQXdPMXh1SUNBZ0lHbG1JQ2g0SUQwOVBTQXdJSHg4SUNFa2FYTkdhVzVwZEdVb2VDa3BYRzRnSUNBZ0lDQnlaWFIxY200Z2VEdGNiaUFnSUNCeVpYUjFjbTRnZUNBK0lEQWdQeUFrWm14dmIzSW9lQ2tnT2lBa1kyVnBiQ2g0S1R0Y2JpQWdmVnh1SUNCMllYSWdUVUZZWDFOQlJrVmZURVZPUjFSSUlEMGdKSEJ2ZHlneUxDQTFNeWtnTFNBeE8xeHVJQ0JtZFc1amRHbHZiaUIwYjB4bGJtZDBhQ2g0S1NCN1hHNGdJQ0FnZG1GeUlHeGxiaUE5SUhSdlNXNTBaV2RsY2loNEtUdGNiaUFnSUNCeVpYUjFjbTRnYkdWdUlEd2dNQ0EvSURBZ09pQWtiV2x1S0d4bGJpd2dUVUZZWDFOQlJrVmZURVZPUjFSSUtUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQmphR1ZqYTBsMFpYSmhZbXhsS0hncElIdGNiaUFnSUNCeVpYUjFjbTRnSVdselQySnFaV04wS0hncElEOGdkVzVrWldacGJtVmtJRG9nZUZ0VGVXMWliMnd1YVhSbGNtRjBiM0pkTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdselEyOXVjM1J5ZFdOMGIzSW9lQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQnBjME5oYkd4aFlteGxLSGdwTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdOeVpXRjBaVWwwWlhKaGRHOXlVbVZ6ZFd4MFQySnFaV04wS0haaGJIVmxMQ0JrYjI1bEtTQjdYRzRnSUNBZ2NtVjBkWEp1SUh0Y2JpQWdJQ0FnSUhaaGJIVmxPaUIyWVd4MVpTeGNiaUFnSUNBZ0lHUnZibVU2SUdSdmJtVmNiaUFnSUNCOU8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHMWhlV0psUkdWbWFXNWxLRzlpYW1WamRDd2dibUZ0WlN3Z1pHVnpZM0lwSUh0Y2JpQWdJQ0JwWmlBb0lTaHVZVzFsSUdsdUlHOWlhbVZqZENrcElIdGNiaUFnSUNBZ0lFOWlhbVZqZEM1a1pXWnBibVZRY205d1pYSjBlU2h2WW1wbFkzUXNJRzVoYldVc0lHUmxjMk55S1R0Y2JpQWdJQ0I5WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnYldGNVltVkVaV1pwYm1WTlpYUm9iMlFvYjJKcVpXTjBMQ0J1WVcxbExDQjJZV3gxWlNrZ2UxeHVJQ0FnSUcxaGVXSmxSR1ZtYVc1bEtHOWlhbVZqZEN3Z2JtRnRaU3dnZTF4dUlDQWdJQ0FnZG1Gc2RXVTZJSFpoYkhWbExGeHVJQ0FnSUNBZ1kyOXVabWxuZFhKaFlteGxPaUIwY25WbExGeHVJQ0FnSUNBZ1pXNTFiV1Z5WVdKc1pUb2dabUZzYzJVc1hHNGdJQ0FnSUNCM2NtbDBZV0pzWlRvZ2RISjFaVnh1SUNBZ0lIMHBPMXh1SUNCOVhHNGdJR1oxYm1OMGFXOXVJRzFoZVdKbFJHVm1hVzVsUTI5dWMzUW9iMkpxWldOMExDQnVZVzFsTENCMllXeDFaU2tnZTF4dUlDQWdJRzFoZVdKbFJHVm1hVzVsS0c5aWFtVmpkQ3dnYm1GdFpTd2dlMXh1SUNBZ0lDQWdkbUZzZFdVNklIWmhiSFZsTEZ4dUlDQWdJQ0FnWTI5dVptbG5kWEpoWW14bE9pQm1ZV3h6WlN4Y2JpQWdJQ0FnSUdWdWRXMWxjbUZpYkdVNklHWmhiSE5sTEZ4dUlDQWdJQ0FnZDNKcGRHRmliR1U2SUdaaGJITmxYRzRnSUNBZ2ZTazdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdiV0Y1WW1WQlpHUkdkVzVqZEdsdmJuTW9iMkpxWldOMExDQm1kVzVqZEdsdmJuTXBJSHRjYmlBZ0lDQm1iM0lnS0haaGNpQnBJRDBnTURzZ2FTQThJR1oxYm1OMGFXOXVjeTVzWlc1bmRHZzdJR2tnS3owZ01pa2dlMXh1SUNBZ0lDQWdkbUZ5SUc1aGJXVWdQU0JtZFc1amRHbHZibk5iYVYwN1hHNGdJQ0FnSUNCMllYSWdkbUZzZFdVZ1BTQm1kVzVqZEdsdmJuTmJhU0FySURGZE8xeHVJQ0FnSUNBZ2JXRjVZbVZFWldacGJtVk5aWFJvYjJRb2IySnFaV04wTENCdVlXMWxMQ0IyWVd4MVpTazdYRzRnSUNBZ2ZWeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHMWhlV0psUVdSa1EyOXVjM1J6S0c5aWFtVmpkQ3dnWTI5dWMzUnpLU0I3WEc0Z0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0JqYjI1emRITXViR1Z1WjNSb095QnBJQ3M5SURJcElIdGNiaUFnSUNBZ0lIWmhjaUJ1WVcxbElEMGdZMjl1YzNSelcybGRPMXh1SUNBZ0lDQWdkbUZ5SUhaaGJIVmxJRDBnWTI5dWMzUnpXMmtnS3lBeFhUdGNiaUFnSUNBZ0lHMWhlV0psUkdWbWFXNWxRMjl1YzNRb2IySnFaV04wTENCdVlXMWxMQ0IyWVd4MVpTazdYRzRnSUNBZ2ZWeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHMWhlV0psUVdSa1NYUmxjbUYwYjNJb2IySnFaV04wTENCbWRXNWpMQ0JUZVcxaWIyd3BJSHRjYmlBZ0lDQnBaaUFvSVZONWJXSnZiQ0I4ZkNBaFUzbHRZbTlzTG1sMFpYSmhkRzl5SUh4OElHOWlhbVZqZEZ0VGVXMWliMnd1YVhSbGNtRjBiM0pkS1Z4dUlDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lHbG1JQ2h2WW1wbFkzUmJKMEJBYVhSbGNtRjBiM0luWFNsY2JpQWdJQ0FnSUdaMWJtTWdQU0J2WW1wbFkzUmJKMEJBYVhSbGNtRjBiM0luWFR0Y2JpQWdJQ0JQWW1wbFkzUXVaR1ZtYVc1bFVISnZjR1Z5ZEhrb2IySnFaV04wTENCVGVXMWliMnd1YVhSbGNtRjBiM0lzSUh0Y2JpQWdJQ0FnSUhaaGJIVmxPaUJtZFc1akxGeHVJQ0FnSUNBZ1kyOXVabWxuZFhKaFlteGxPaUIwY25WbExGeHVJQ0FnSUNBZ1pXNTFiV1Z5WVdKc1pUb2dabUZzYzJVc1hHNGdJQ0FnSUNCM2NtbDBZV0pzWlRvZ2RISjFaVnh1SUNBZ0lIMHBPMXh1SUNCOVhHNGdJSFpoY2lCd2IyeDVabWxzYkhNZ1BTQmJYVHRjYmlBZ1puVnVZM1JwYjI0Z2NtVm5hWE4wWlhKUWIyeDVabWxzYkNobWRXNWpLU0I3WEc0Z0lDQWdjRzlzZVdacGJHeHpMbkIxYzJnb1puVnVZeWs3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY0c5c2VXWnBiR3hCYkd3b1oyeHZZbUZzS1NCN1hHNGdJQ0FnY0c5c2VXWnBiR3h6TG1admNrVmhZMmdvS0daMWJtTjBhVzl1S0dZcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCbUtHZHNiMkpoYkNrN1hHNGdJQ0FnZlNrcE8xeHVJQ0I5WEc0Z0lISmxkSFZ5YmlCN1hHNGdJQ0FnWjJWMElIUnZUMkpxWldOMEtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIUnZUMkpxWldOME8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElIUnZWV2x1ZERNeUtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIUnZWV2x1ZERNeU8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHbHpUMkpxWldOMEtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHbHpUMkpxWldOME8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHbHpRMkZzYkdGaWJHVW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdhWE5EWVd4c1lXSnNaVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0JwYzA1MWJXSmxjaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJwYzA1MWJXSmxjanRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0IwYjBsdWRHVm5aWElvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnZEc5SmJuUmxaMlZ5TzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUhSdlRHVnVaM1JvS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhSdlRHVnVaM1JvTzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUdOb1pXTnJTWFJsY21GaWJHVW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdZMmhsWTJ0SmRHVnlZV0pzWlR0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCcGMwTnZibk4wY25WamRHOXlLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR2x6UTI5dWMzUnlkV04wYjNJN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ1kzSmxZWFJsU1hSbGNtRjBiM0pTWlhOMWJIUlBZbXBsWTNRb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1kzSmxZWFJsU1hSbGNtRjBiM0pTWlhOMWJIUlBZbXBsWTNRN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2JXRjVZbVZFWldacGJtVW9LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdiV0Y1WW1WRVpXWnBibVU3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnYldGNVltVkVaV1pwYm1WTlpYUm9iMlFvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYldGNVltVkVaV1pwYm1WTlpYUm9iMlE3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnYldGNVltVkVaV1pwYm1WRGIyNXpkQ2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ0WVhsaVpVUmxabWx1WlVOdmJuTjBPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJRzFoZVdKbFFXUmtSblZ1WTNScGIyNXpLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRzFoZVdKbFFXUmtSblZ1WTNScGIyNXpPMXh1SUNBZ0lIMHNYRzRnSUNBZ1oyVjBJRzFoZVdKbFFXUmtRMjl1YzNSektDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHMWhlV0psUVdSa1EyOXVjM1J6TzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUcxaGVXSmxRV1JrU1hSbGNtRjBiM0lvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYldGNVltVkJaR1JKZEdWeVlYUnZjanRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0J5WldkcGMzUmxjbEJ2YkhsbWFXeHNLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSEpsWjJsemRHVnlVRzlzZVdacGJHdzdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdjRzlzZVdacGJHeEJiR3dvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnY0c5c2VXWnBiR3hCYkd3N1hHNGdJQ0FnZlZ4dUlDQjlPMXh1ZlNrN1hHNVRlWE4wWlcwdWNtVm5hWE4wWlhKTmIyUjFiR1VvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5TllYQXVhbk5jSWl3Z1cxMHNJR1oxYm1OMGFXOXVLQ2tnZTF4dUlDQmNJblZ6WlNCemRISnBZM1JjSWp0Y2JpQWdkbUZ5SUY5ZmJXOWtkV3hsVG1GdFpTQTlJRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12VFdGd0xtcHpYQ0k3WEc0Z0lIWmhjaUFrWDE4d0lEMGdVM2x6ZEdWdExtZGxkQ2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDNWMGFXeHpMbXB6WENJcExGeHVJQ0FnSUNBZ2FYTlBZbXBsWTNRZ1BTQWtYMTh3TG1selQySnFaV04wTEZ4dUlDQWdJQ0FnYldGNVltVkJaR1JKZEdWeVlYUnZjaUE5SUNSZlh6QXViV0Y1WW1WQlpHUkpkR1Z5WVhSdmNpeGNiaUFnSUNBZ0lISmxaMmx6ZEdWeVVHOXNlV1pwYkd3Z1BTQWtYMTh3TG5KbFoybHpkR1Z5VUc5c2VXWnBiR3c3WEc0Z0lIWmhjaUJuWlhSUGQyNUlZWE5vVDJKcVpXTjBJRDBnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbWRsZEU5M2JraGhjMmhQWW1wbFkzUTdYRzRnSUhaaGNpQWthR0Z6VDNkdVVISnZjR1Z5ZEhrZ1BTQlBZbXBsWTNRdWNISnZkRzkwZVhCbExtaGhjMDkzYmxCeWIzQmxjblI1TzF4dUlDQjJZWElnWkdWc1pYUmxaRk5sYm5ScGJtVnNJRDBnZTMwN1hHNGdJR1oxYm1OMGFXOXVJR3h2YjJ0MWNFbHVaR1Y0S0cxaGNDd2dhMlY1S1NCN1hHNGdJQ0FnYVdZZ0tHbHpUMkpxWldOMEtHdGxlU2twSUh0Y2JpQWdJQ0FnSUhaaGNpQm9ZWE5vVDJKcVpXTjBJRDBnWjJWMFQzZHVTR0Z6YUU5aWFtVmpkQ2hyWlhrcE8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUdoaGMyaFBZbXBsWTNRZ0ppWWdiV0Z3TG05aWFtVmpkRWx1WkdWNFgxdG9ZWE5vVDJKcVpXTjBMbWhoYzJoZE8xeHVJQ0FnSUgxY2JpQWdJQ0JwWmlBb2RIbHdaVzltSUd0bGVTQTlQVDBnSjNOMGNtbHVaeWNwWEc0Z0lDQWdJQ0J5WlhSMWNtNGdiV0Z3TG5OMGNtbHVaMGx1WkdWNFgxdHJaWGxkTzF4dUlDQWdJSEpsZEhWeWJpQnRZWEF1Y0hKcGJXbDBhWFpsU1c1a1pYaGZXMnRsZVYwN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2FXNXBkRTFoY0NodFlYQXBJSHRjYmlBZ0lDQnRZWEF1Wlc1MGNtbGxjMThnUFNCYlhUdGNiaUFnSUNCdFlYQXViMkpxWldOMFNXNWtaWGhmSUQwZ1QySnFaV04wTG1OeVpXRjBaU2h1ZFd4c0tUdGNiaUFnSUNCdFlYQXVjM1J5YVc1blNXNWtaWGhmSUQwZ1QySnFaV04wTG1OeVpXRjBaU2h1ZFd4c0tUdGNiaUFnSUNCdFlYQXVjSEpwYldsMGFYWmxTVzVrWlhoZklEMGdUMkpxWldOMExtTnlaV0YwWlNodWRXeHNLVHRjYmlBZ0lDQnRZWEF1WkdWc1pYUmxaRU52ZFc1MFh5QTlJREE3WEc0Z0lIMWNiaUFnZG1GeUlFMWhjQ0E5SUdaMWJtTjBhVzl1SUUxaGNDZ3BJSHRjYmlBZ0lDQjJZWElnYVhSbGNtRmliR1VnUFNCaGNtZDFiV1Z1ZEhOYk1GMDdYRzRnSUNBZ2FXWWdLQ0ZwYzA5aWFtVmpkQ2gwYUdsektTbGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSW9KMDFoY0NCallXeHNaV1FnYjI0Z2FXNWpiMjF3WVhScFlteGxJSFI1Y0dVbktUdGNiaUFnSUNCcFppQW9KR2hoYzA5M2JsQnliM0JsY25SNUxtTmhiR3dvZEdocGN5d2dKMlZ1ZEhKcFpYTmZKeWtwSUh0Y2JpQWdJQ0FnSUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0owMWhjQ0JqWVc0Z2JtOTBJR0psSUhKbFpXNTBjbUZ1ZEd4NUlHbHVhWFJwWVd4cGMyVmtKeWs3WEc0Z0lDQWdmVnh1SUNBZ0lHbHVhWFJOWVhBb2RHaHBjeWs3WEc0Z0lDQWdhV1lnS0dsMFpYSmhZbXhsSUNFOVBTQnVkV3hzSUNZbUlHbDBaWEpoWW14bElDRTlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUdadmNpQW9kbUZ5SUNSZlh6SWdQU0JwZEdWeVlXSnNaVnNrZEhKaFkyVjFjbEoxYm5ScGJXVXVkRzlRY205d1pYSjBlU2hUZVcxaWIyd3VhWFJsY21GMGIzSXBYU2dwTEZ4dUlDQWdJQ0FnSUNBZ0lDUmZYek03SUNFb0pGOWZNeUE5SUNSZlh6SXVibVY0ZENncEtTNWtiMjVsT3lBcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUNSZlh6UWdQU0FrWDE4ekxuWmhiSFZsTEZ4dUlDQWdJQ0FnSUNBZ0lDQWdhMlY1SUQwZ0pGOWZORnN3WFN4Y2JpQWdJQ0FnSUNBZ0lDQWdJSFpoYkhWbElEMGdKRjlmTkZzeFhUdGNiaUFnSUNBZ0lDQWdlMXh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXVjMlYwS0d0bGVTd2dkbUZzZFdVcE8xeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVJQ0I5TzF4dUlDQW9KSFJ5WVdObGRYSlNkVzUwYVcxbExtTnlaV0YwWlVOc1lYTnpLU2hOWVhBc0lIdGNiaUFnSUNCblpYUWdjMmw2WlNncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCMGFHbHpMbVZ1ZEhKcFpYTmZMbXhsYm1kMGFDQXZJRElnTFNCMGFHbHpMbVJsYkdWMFpXUkRiM1Z1ZEY4N1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRNklHWjFibU4wYVc5dUtHdGxlU2tnZTF4dUlDQWdJQ0FnZG1GeUlHbHVaR1Y0SUQwZ2JHOXZhM1Z3U1c1a1pYZ29kR2hwY3l3Z2EyVjVLVHRjYmlBZ0lDQWdJR2xtSUNocGJtUmxlQ0FoUFQwZ2RXNWtaV1pwYm1Wa0tWeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTVsYm5SeWFXVnpYMXRwYm1SbGVDQXJJREZkTzF4dUlDQWdJSDBzWEc0Z0lDQWdjMlYwT2lCbWRXNWpkR2x2YmloclpYa3NJSFpoYkhWbEtTQjdYRzRnSUNBZ0lDQjJZWElnYjJKcVpXTjBUVzlrWlNBOUlHbHpUMkpxWldOMEtHdGxlU2s3WEc0Z0lDQWdJQ0IyWVhJZ2MzUnlhVzVuVFc5a1pTQTlJSFI1Y0dWdlppQnJaWGtnUFQwOUlDZHpkSEpwYm1jbk8xeHVJQ0FnSUNBZ2RtRnlJR2x1WkdWNElEMGdiRzl2YTNWd1NXNWtaWGdvZEdocGN5d2dhMlY1S1R0Y2JpQWdJQ0FnSUdsbUlDaHBibVJsZUNBaFBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVaVzUwY21sbGMxOWJhVzVrWlhnZ0t5QXhYU0E5SUhaaGJIVmxPMXh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdhVzVrWlhnZ1BTQjBhR2x6TG1WdWRISnBaWE5mTG14bGJtZDBhRHRjYmlBZ0lDQWdJQ0FnZEdocGN5NWxiblJ5YVdWelgxdHBibVJsZUYwZ1BTQnJaWGs3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVaVzUwY21sbGMxOWJhVzVrWlhnZ0t5QXhYU0E5SUhaaGJIVmxPMXh1SUNBZ0lDQWdJQ0JwWmlBb2IySnFaV04wVFc5a1pTa2dlMXh1SUNBZ0lDQWdJQ0FnSUhaaGNpQm9ZWE5vVDJKcVpXTjBJRDBnWjJWMFQzZHVTR0Z6YUU5aWFtVmpkQ2hyWlhrcE8xeHVJQ0FnSUNBZ0lDQWdJSFpoY2lCb1lYTm9JRDBnYUdGemFFOWlhbVZqZEM1b1lYTm9PMXh1SUNBZ0lDQWdJQ0FnSUhSb2FYTXViMkpxWldOMFNXNWtaWGhmVzJoaGMyaGRJRDBnYVc1a1pYZzdYRzRnSUNBZ0lDQWdJSDBnWld4elpTQnBaaUFvYzNSeWFXNW5UVzlrWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJSFJvYVhNdWMzUnlhVzVuU1c1a1pYaGZXMnRsZVYwZ1BTQnBibVJsZUR0Y2JpQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQjBhR2x6TG5CeWFXMXBkR2wyWlVsdVpHVjRYMXRyWlhsZElEMGdhVzVrWlhnN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lISmxkSFZ5YmlCMGFHbHpPMXh1SUNBZ0lIMHNYRzRnSUNBZ2FHRnpPaUJtZFc1amRHbHZiaWhyWlhrcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCc2IyOXJkWEJKYm1SbGVDaDBhR2x6TENCclpYa3BJQ0U5UFNCMWJtUmxabWx1WldRN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JrWld4bGRHVTZJR1oxYm1OMGFXOXVLR3RsZVNrZ2UxeHVJQ0FnSUNBZ2RtRnlJRzlpYW1WamRFMXZaR1VnUFNCcGMwOWlhbVZqZENoclpYa3BPMXh1SUNBZ0lDQWdkbUZ5SUhOMGNtbHVaMDF2WkdVZ1BTQjBlWEJsYjJZZ2EyVjVJRDA5UFNBbmMzUnlhVzVuSnp0Y2JpQWdJQ0FnSUhaaGNpQnBibVJsZUR0Y2JpQWdJQ0FnSUhaaGNpQm9ZWE5vTzF4dUlDQWdJQ0FnYVdZZ0tHOWlhbVZqZEUxdlpHVXBJSHRjYmlBZ0lDQWdJQ0FnZG1GeUlHaGhjMmhQWW1wbFkzUWdQU0JuWlhSUGQyNUlZWE5vVDJKcVpXTjBLR3RsZVNrN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hvWVhOb1QySnFaV04wS1NCN1hHNGdJQ0FnSUNBZ0lDQWdhVzVrWlhnZ1BTQjBhR2x6TG05aWFtVmpkRWx1WkdWNFgxdG9ZWE5vSUQwZ2FHRnphRTlpYW1WamRDNW9ZWE5vWFR0Y2JpQWdJQ0FnSUNBZ0lDQmtaV3hsZEdVZ2RHaHBjeTV2WW1wbFkzUkpibVJsZUY5YmFHRnphRjA3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwZ1pXeHpaU0JwWmlBb2MzUnlhVzVuVFc5a1pTa2dlMXh1SUNBZ0lDQWdJQ0JwYm1SbGVDQTlJSFJvYVhNdWMzUnlhVzVuU1c1a1pYaGZXMnRsZVYwN1hHNGdJQ0FnSUNBZ0lHUmxiR1YwWlNCMGFHbHpMbk4wY21sdVowbHVaR1Y0WDF0clpYbGRPMXh1SUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdhVzVrWlhnZ1BTQjBhR2x6TG5CeWFXMXBkR2wyWlVsdVpHVjRYMXRyWlhsZE8xeHVJQ0FnSUNBZ0lDQmtaV3hsZEdVZ2RHaHBjeTV3Y21sdGFYUnBkbVZKYm1SbGVGOWJhMlY1WFR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDaHBibVJsZUNBaFBUMGdkVzVrWldacGJtVmtLU0I3WEc0Z0lDQWdJQ0FnSUhSb2FYTXVaVzUwY21sbGMxOWJhVzVrWlhoZElEMGdaR1ZzWlhSbFpGTmxiblJwYm1Wc08xeHVJQ0FnSUNBZ0lDQjBhR2x6TG1WdWRISnBaWE5mVzJsdVpHVjRJQ3NnTVYwZ1BTQjFibVJsWm1sdVpXUTdYRzRnSUNBZ0lDQWdJSFJvYVhNdVpHVnNaWFJsWkVOdmRXNTBYeXNyTzF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnZEhKMVpUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lISmxkSFZ5YmlCbVlXeHpaVHRjYmlBZ0lDQjlMRnh1SUNBZ0lHTnNaV0Z5T2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lHbHVhWFJOWVhBb2RHaHBjeWs3WEc0Z0lDQWdmU3hjYmlBZ0lDQm1iM0pGWVdOb09pQm1kVzVqZEdsdmJpaGpZV3hzWW1GamEwWnVLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2RHaHBjMEZ5WnlBOUlHRnlaM1Z0Wlc1MGMxc3hYVHRjYmlBZ0lDQWdJR1p2Y2lBb2RtRnlJR2tnUFNBd095QnBJRHdnZEdocGN5NWxiblJ5YVdWelh5NXNaVzVuZEdnN0lHa2dLejBnTWlrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYTJWNUlEMGdkR2hwY3k1bGJuUnlhV1Z6WDF0cFhUdGNiaUFnSUNBZ0lDQWdkbUZ5SUhaaGJIVmxJRDBnZEdocGN5NWxiblJ5YVdWelgxdHBJQ3NnTVYwN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hyWlhrZ1BUMDlJR1JsYkdWMFpXUlRaVzUwYVc1bGJDbGNiaUFnSUNBZ0lDQWdJQ0JqYjI1MGFXNTFaVHRjYmlBZ0lDQWdJQ0FnWTJGc2JHSmhZMnRHYmk1allXeHNLSFJvYVhOQmNtY3NJSFpoYkhWbExDQnJaWGtzSUhSb2FYTXBPMXh1SUNBZ0lDQWdmVnh1SUNBZ0lIMHNYRzRnSUNBZ1pXNTBjbWxsY3pvZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1sdWFYUkhaVzVsY21GMGIzSkdkVzVqZEdsdmJpaG1kVzVqZEdsdmJpQWtYMTgxS0NrZ2UxeHVJQ0FnSUNBZ2RtRnlJR2tzWEc0Z0lDQWdJQ0FnSUNBZ2EyVjVMRnh1SUNBZ0lDQWdJQ0FnSUhaaGJIVmxPMXh1SUNBZ0lDQWdjbVYwZFhKdUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1amNtVmhkR1ZIWlc1bGNtRjBiM0pKYm5OMFlXNWpaU2htZFc1amRHbHZiaWdrWTNSNEtTQjdYRzRnSUNBZ0lDQWdJSGRvYVd4bElDaDBjblZsS1Z4dUlDQWdJQ0FnSUNBZ0lITjNhWFJqYUNBb0pHTjBlQzV6ZEdGMFpTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyRnpaU0F3T2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JwSUQwZ01EdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJREV5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdNVEk2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBb2FTQThJSFJvYVhNdVpXNTBjbWxsYzE4dWJHVnVaM1JvS1NBL0lEZ2dPaUF0TWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJRFE2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR2tnS3owZ01qdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJREV5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdPRHBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdhMlY1SUQwZ2RHaHBjeTVsYm5SeWFXVnpYMXRwWFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1Gc2RXVWdQU0IwYUdsekxtVnVkSEpwWlhOZlcya2dLeUF4WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlEazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdZMkZ6WlNBNU9seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1kzUjRMbk4wWVhSbElEMGdLR3RsZVNBOVBUMGdaR1ZzWlhSbFpGTmxiblJwYm1Wc0tTQS9JRFFnT2lBMk8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTmpwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlESTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCYmEyVjVMQ0IyWVd4MVpWMDdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJREk2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWJXRjVZbVZVYUhKdmR5Z3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtZM1I0TG5OMFlYUmxJRDBnTkR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNCa1pXWmhkV3gwT2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0J5WlhSMWNtNGdKR04wZUM1bGJtUW9LVHRjYmlBZ0lDQWdJQ0FnSUNCOVhHNGdJQ0FnSUNCOUxDQWtYMTgxTENCMGFHbHpLVHRjYmlBZ0lDQjlLU3hjYmlBZ0lDQnJaWGx6T2lBa2RISmhZMlYxY2xKMWJuUnBiV1V1YVc1cGRFZGxibVZ5WVhSdmNrWjFibU4wYVc5dUtHWjFibU4wYVc5dUlDUmZYellvS1NCN1hHNGdJQ0FnSUNCMllYSWdhU3hjYmlBZ0lDQWdJQ0FnSUNCclpYa3NYRzRnSUNBZ0lDQWdJQ0FnZG1Gc2RXVTdYRzRnSUNBZ0lDQnlaWFIxY200Z0pIUnlZV05sZFhKU2RXNTBhVzFsTG1OeVpXRjBaVWRsYm1WeVlYUnZja2x1YzNSaGJtTmxLR1oxYm1OMGFXOXVLQ1JqZEhncElIdGNiaUFnSUNBZ0lDQWdkMmhwYkdVZ0tIUnlkV1VwWEc0Z0lDQWdJQ0FnSUNBZ2MzZHBkR05vSUNna1kzUjRMbk4wWVhSbEtTQjdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJREE2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR2tnUFNBd08xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1kzUjRMbk4wWVhSbElEMGdNVEk3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJGelpTQXhNanBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SUNocElEd2dkR2hwY3k1bGJuUnlhV1Z6WHk1c1pXNW5kR2dwSUQ4Z09DQTZJQzB5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdORHBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdhU0FyUFNBeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1kzUjRMbk4wWVhSbElEMGdNVEk3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR0p5WldGck8xeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJGelpTQTRPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQnJaWGtnUFNCMGFHbHpMbVZ1ZEhKcFpYTmZXMmxkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0IyWVd4MVpTQTlJSFJvYVhNdVpXNTBjbWxsYzE5YmFTQXJJREZkTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWTNSNExuTjBZWFJsSUQwZ09UdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ1luSmxZV3M3WEc0Z0lDQWdJQ0FnSUNBZ0lDQmpZWE5sSURrNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQW9hMlY1SUQwOVBTQmtaV3hsZEdWa1UyVnVkR2x1Wld3cElEOGdOQ0E2SURZN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyRnpaU0EyT2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWTNSNExuTjBZWFJsSUQwZ01qdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUd0bGVUdGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdNanBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1dFlYbGlaVlJvY205M0tDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0EwTzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdSbFptRjFiSFE2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJSEpsZEhWeWJpQWtZM1I0TG1WdVpDZ3BPMXh1SUNBZ0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgwc0lDUmZYellzSUhSb2FYTXBPMXh1SUNBZ0lIMHBMRnh1SUNBZ0lIWmhiSFZsY3pvZ0pIUnlZV05sZFhKU2RXNTBhVzFsTG1sdWFYUkhaVzVsY21GMGIzSkdkVzVqZEdsdmJpaG1kVzVqZEdsdmJpQWtYMTgzS0NrZ2UxeHVJQ0FnSUNBZ2RtRnlJR2tzWEc0Z0lDQWdJQ0FnSUNBZ2EyVjVMRnh1SUNBZ0lDQWdJQ0FnSUhaaGJIVmxPMXh1SUNBZ0lDQWdjbVYwZFhKdUlDUjBjbUZqWlhWeVVuVnVkR2x0WlM1amNtVmhkR1ZIWlc1bGNtRjBiM0pKYm5OMFlXNWpaU2htZFc1amRHbHZiaWdrWTNSNEtTQjdYRzRnSUNBZ0lDQWdJSGRvYVd4bElDaDBjblZsS1Z4dUlDQWdJQ0FnSUNBZ0lITjNhWFJqYUNBb0pHTjBlQzV6ZEdGMFpTa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1kyRnpaU0F3T2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JwSUQwZ01EdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJREV5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdNVEk2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBb2FTQThJSFJvYVhNdVpXNTBjbWxsYzE4dWJHVnVaM1JvS1NBL0lEZ2dPaUF0TWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJRFE2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJR2tnS3owZ01qdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJREV5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdPRHBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdhMlY1SUQwZ2RHaHBjeTVsYm5SeWFXVnpYMXRwWFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnZG1Gc2RXVWdQU0IwYUdsekxtVnVkSEpwWlhOZlcya2dLeUF4WFR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlEazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lHSnlaV0ZyTzF4dUlDQWdJQ0FnSUNBZ0lDQWdZMkZ6WlNBNU9seHVJQ0FnSUNBZ0lDQWdJQ0FnSUNBa1kzUjRMbk4wWVhSbElEMGdLR3RsZVNBOVBUMGdaR1ZzWlhSbFpGTmxiblJwYm1Wc0tTQS9JRFFnT2lBMk8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTmpwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpkR0YwWlNBOUlESTdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlCMllXeDFaVHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTWpwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXRZWGxpWlZSb2NtOTNLQ2s3WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBME8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHUmxabUYxYkhRNlhHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUFrWTNSNExtVnVaQ2dwTzF4dUlDQWdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMHNJQ1JmWHpjc0lIUm9hWE1wTzF4dUlDQWdJSDBwWEc0Z0lIMHNJSHQ5S1R0Y2JpQWdUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblI1S0UxaGNDNXdjbTkwYjNSNWNHVXNJRk41YldKdmJDNXBkR1Z5WVhSdmNpd2dlMXh1SUNBZ0lHTnZibVpwWjNWeVlXSnNaVG9nZEhKMVpTeGNiaUFnSUNCM2NtbDBZV0pzWlRvZ2RISjFaU3hjYmlBZ0lDQjJZV3gxWlRvZ1RXRndMbkJ5YjNSdmRIbHdaUzVsYm5SeWFXVnpYRzRnSUgwcE8xeHVJQ0JtZFc1amRHbHZiaUJ3YjJ4NVptbHNiRTFoY0NobmJHOWlZV3dwSUh0Y2JpQWdJQ0IyWVhJZ0pGOWZOQ0E5SUdkc2IySmhiQ3hjYmlBZ0lDQWdJQ0FnVDJKcVpXTjBJRDBnSkY5Zk5DNVBZbXBsWTNRc1hHNGdJQ0FnSUNBZ0lGTjViV0p2YkNBOUlDUmZYelF1VTNsdFltOXNPMXh1SUNBZ0lHbG1JQ2doWjJ4dlltRnNMazFoY0NsY2JpQWdJQ0FnSUdkc2IySmhiQzVOWVhBZ1BTQk5ZWEE3WEc0Z0lDQWdkbUZ5SUcxaGNGQnliM1J2ZEhsd1pTQTlJR2RzYjJKaGJDNU5ZWEF1Y0hKdmRHOTBlWEJsTzF4dUlDQWdJR2xtSUNodFlYQlFjbTkwYjNSNWNHVXVaVzUwY21sbGN5QTlQVDBnZFc1a1pXWnBibVZrS1Z4dUlDQWdJQ0FnWjJ4dlltRnNMazFoY0NBOUlFMWhjRHRjYmlBZ0lDQnBaaUFvYldGd1VISnZkRzkwZVhCbExtVnVkSEpwWlhNcElIdGNiaUFnSUNBZ0lHMWhlV0psUVdSa1NYUmxjbUYwYjNJb2JXRndVSEp2ZEc5MGVYQmxMQ0J0WVhCUWNtOTBiM1I1Y0dVdVpXNTBjbWxsY3l3Z1UzbHRZbTlzS1R0Y2JpQWdJQ0FnSUcxaGVXSmxRV1JrU1hSbGNtRjBiM0lvVDJKcVpXTjBMbWRsZEZCeWIzUnZkSGx3WlU5bUtHNWxkeUJuYkc5aVlXd3VUV0Z3S0NrdVpXNTBjbWxsY3lncEtTd2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUIwYUdsek8xeHVJQ0FnSUNBZ2ZTd2dVM2x0WW05c0tUdGNiaUFnSUNCOVhHNGdJSDFjYmlBZ2NtVm5hWE4wWlhKUWIyeDVabWxzYkNod2IyeDVabWxzYkUxaGNDazdYRzRnSUhKbGRIVnliaUI3WEc0Z0lDQWdaMlYwSUUxaGNDZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQk5ZWEE3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnY0c5c2VXWnBiR3hOWVhBb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2NHOXNlV1pwYkd4TllYQTdYRzRnSUNBZ2ZWeHVJQ0I5TzF4dWZTazdYRzVUZVhOMFpXMHVaMlYwS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdlRXRndMbXB6WENJZ0t5QW5KeWs3WEc1VGVYTjBaVzB1Y21WbmFYTjBaWEpOYjJSMWJHVW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlUWlhRdWFuTmNJaXdnVzEwc0lHWjFibU4wYVc5dUtDa2dlMXh1SUNCY0luVnpaU0J6ZEhKcFkzUmNJanRjYmlBZ2RtRnlJRjlmYlc5a2RXeGxUbUZ0WlNBOUlGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZVMlYwTG1welhDSTdYRzRnSUhaaGNpQWtYMTh3SUQwZ1UzbHpkR1Z0TG1kbGRDaGNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMM1YwYVd4ekxtcHpYQ0lwTEZ4dUlDQWdJQ0FnYVhOUFltcGxZM1FnUFNBa1gxOHdMbWx6VDJKcVpXTjBMRnh1SUNBZ0lDQWdiV0Y1WW1WQlpHUkpkR1Z5WVhSdmNpQTlJQ1JmWHpBdWJXRjVZbVZCWkdSSmRHVnlZWFJ2Y2l4Y2JpQWdJQ0FnSUhKbFoybHpkR1Z5VUc5c2VXWnBiR3dnUFNBa1gxOHdMbkpsWjJsemRHVnlVRzlzZVdacGJHdzdYRzRnSUhaaGNpQk5ZWEFnUFNCVGVYTjBaVzB1WjJWMEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZUV0Z3TG1welhDSXBMazFoY0R0Y2JpQWdkbUZ5SUdkbGRFOTNia2hoYzJoUFltcGxZM1FnUFNBa2RISmhZMlYxY2xKMWJuUnBiV1V1WjJWMFQzZHVTR0Z6YUU5aWFtVmpkRHRjYmlBZ2RtRnlJQ1JvWVhOUGQyNVFjbTl3WlhKMGVTQTlJRTlpYW1WamRDNXdjbTkwYjNSNWNHVXVhR0Z6VDNkdVVISnZjR1Z5ZEhrN1hHNGdJR1oxYm1OMGFXOXVJR2x1YVhSVFpYUW9jMlYwS1NCN1hHNGdJQ0FnYzJWMExtMWhjRjhnUFNCdVpYY2dUV0Z3S0NrN1hHNGdJSDFjYmlBZ2RtRnlJRk5sZENBOUlHWjFibU4wYVc5dUlGTmxkQ2dwSUh0Y2JpQWdJQ0IyWVhJZ2FYUmxjbUZpYkdVZ1BTQmhjbWQxYldWdWRITmJNRjA3WEc0Z0lDQWdhV1lnS0NGcGMwOWlhbVZqZENoMGFHbHpLU2xjYmlBZ0lDQWdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0lvSjFObGRDQmpZV3hzWldRZ2IyNGdhVzVqYjIxd1lYUnBZbXhsSUhSNWNHVW5LVHRjYmlBZ0lDQnBaaUFvSkdoaGMwOTNibEJ5YjNCbGNuUjVMbU5oYkd3b2RHaHBjeXdnSjIxaGNGOG5LU2tnZTF4dUlDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2lnblUyVjBJR05oYmlCdWIzUWdZbVVnY21WbGJuUnlZVzUwYkhrZ2FXNXBkR2xoYkdselpXUW5LVHRjYmlBZ0lDQjlYRzRnSUNBZ2FXNXBkRk5sZENoMGFHbHpLVHRjYmlBZ0lDQnBaaUFvYVhSbGNtRmliR1VnSVQwOUlHNTFiR3dnSmlZZ2FYUmxjbUZpYkdVZ0lUMDlJSFZ1WkdWbWFXNWxaQ2tnZTF4dUlDQWdJQ0FnWm05eUlDaDJZWElnSkY5Zk5DQTlJR2wwWlhKaFlteGxXeVIwY21GalpYVnlVblZ1ZEdsdFpTNTBiMUJ5YjNCbGNuUjVLRk41YldKdmJDNXBkR1Z5WVhSdmNpbGRLQ2tzWEc0Z0lDQWdJQ0FnSUNBZ0pGOWZOVHNnSVNna1gxODFJRDBnSkY5Zk5DNXVaWGgwS0NrcExtUnZibVU3SUNrZ2UxeHVJQ0FnSUNBZ0lDQjJZWElnYVhSbGJTQTlJQ1JmWHpVdWRtRnNkV1U3WEc0Z0lDQWdJQ0FnSUh0Y2JpQWdJQ0FnSUNBZ0lDQjBhR2x6TG1Ga1pDaHBkR1Z0S1R0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JpQWdmVHRjYmlBZ0tDUjBjbUZqWlhWeVVuVnVkR2x0WlM1amNtVmhkR1ZEYkdGemN5a29VMlYwTENCN1hHNGdJQ0FnWjJWMElITnBlbVVvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnZEdocGN5NXRZWEJmTG5OcGVtVTdYRzRnSUNBZ2ZTeGNiaUFnSUNCb1lYTTZJR1oxYm1OMGFXOXVLR3RsZVNrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhSb2FYTXViV0Z3WHk1b1lYTW9hMlY1S1R0Y2JpQWdJQ0I5TEZ4dUlDQWdJR0ZrWkRvZ1puVnVZM1JwYjI0b2EyVjVLU0I3WEc0Z0lDQWdJQ0IwYUdsekxtMWhjRjh1YzJWMEtHdGxlU3dnYTJWNUtUdGNiaUFnSUNBZ0lISmxkSFZ5YmlCMGFHbHpPMXh1SUNBZ0lIMHNYRzRnSUNBZ1pHVnNaWFJsT2lCbWRXNWpkR2x2YmloclpYa3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TG0xaGNGOHVaR1ZzWlhSbEtHdGxlU2s3WEc0Z0lDQWdmU3hjYmlBZ0lDQmpiR1ZoY2pvZ1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2RHaHBjeTV0WVhCZkxtTnNaV0Z5S0NrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JtYjNKRllXTm9PaUJtZFc1amRHbHZiaWhqWVd4c1ltRmphMFp1S1NCN1hHNGdJQ0FnSUNCMllYSWdkR2hwYzBGeVp5QTlJR0Z5WjNWdFpXNTBjMXN4WFR0Y2JpQWdJQ0FnSUhaaGNpQWtYMTh5SUQwZ2RHaHBjenRjYmlBZ0lDQWdJSEpsZEhWeWJpQjBhR2x6TG0xaGNGOHVabTl5UldGamFDZ29ablZ1WTNScGIyNG9kbUZzZFdVc0lHdGxlU2tnZTF4dUlDQWdJQ0FnSUNCallXeHNZbUZqYTBadUxtTmhiR3dvZEdocGMwRnlaeXdnYTJWNUxDQnJaWGtzSUNSZlh6SXBPMXh1SUNBZ0lDQWdmU2twTzF4dUlDQWdJSDBzWEc0Z0lDQWdkbUZzZFdWek9pQWtkSEpoWTJWMWNsSjFiblJwYldVdWFXNXBkRWRsYm1WeVlYUnZja1oxYm1OMGFXOXVLR1oxYm1OMGFXOXVJQ1JmWHpjb0tTQjdYRzRnSUNBZ0lDQjJZWElnSkY5Zk9DeGNiaUFnSUNBZ0lDQWdJQ0FrWDE4NU8xeHVJQ0FnSUNBZ2NtVjBkWEp1SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVqY21WaGRHVkhaVzVsY21GMGIzSkpibk4wWVc1alpTaG1kVzVqZEdsdmJpZ2tZM1I0S1NCN1hHNGdJQ0FnSUNBZ0lIZG9hV3hsSUNoMGNuVmxLVnh1SUNBZ0lDQWdJQ0FnSUhOM2FYUmphQ0FvSkdOMGVDNXpkR0YwWlNrZ2UxeHVJQ0FnSUNBZ0lDQWdJQ0FnWTJGelpTQXdPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtYMTg0SUQwZ2RHaHBjeTV0WVhCZkxtdGxlWE1vS1Z0VGVXMWliMnd1YVhSbGNtRjBiM0pkS0NrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjMlZ1ZENBOUlIWnZhV1FnTUR0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNWhZM1JwYjI0Z1BTQW5ibVY0ZENjN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQXhNanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElERXlPbHh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtYMTg1SUQwZ0pGOWZPRnNrWTNSNExtRmpkR2x2Ymwwb0pHTjBlQzV6Wlc1MFNXZHViM0psVkdoeWIzY3BPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQWtZM1I0TG5OMFlYUmxJRDBnT1R0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJRGs2WEc0Z0lDQWdJQ0FnSUNBZ0lDQWdJQ1JqZEhndWMzUmhkR1VnUFNBb0pGOWZPUzVrYjI1bEtTQS9JRE1nT2lBeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBZ0lDQWdJQ0FnSUNBZ0lHTmhjMlVnTXpwY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSkdOMGVDNXpaVzUwSUQwZ0pGOWZPUzUyWVd4MVpUdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJQzB5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdNanBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1emRHRjBaU0E5SURFeU8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCeVpYUjFjbTRnSkY5Zk9TNTJZV3gxWlR0Y2JpQWdJQ0FnSUNBZ0lDQWdJR1JsWm1GMWJIUTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lISmxkSFZ5YmlBa1kzUjRMbVZ1WkNncE8xeHVJQ0FnSUNBZ0lDQWdJSDFjYmlBZ0lDQWdJSDBzSUNSZlh6Y3NJSFJvYVhNcE8xeHVJQ0FnSUgwcExGeHVJQ0FnSUdWdWRISnBaWE02SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzVwYm1sMFIyVnVaWEpoZEc5eVJuVnVZM1JwYjI0b1puVnVZM1JwYjI0Z0pGOWZNVEFvS1NCN1hHNGdJQ0FnSUNCMllYSWdKRjlmTVRFc1hHNGdJQ0FnSUNBZ0lDQWdKRjlmTVRJN1hHNGdJQ0FnSUNCeVpYUjFjbTRnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU55WldGMFpVZGxibVZ5WVhSdmNrbHVjM1JoYm1ObEtHWjFibU4wYVc5dUtDUmpkSGdwSUh0Y2JpQWdJQ0FnSUNBZ2QyaHBiR1VnS0hSeWRXVXBYRzRnSUNBZ0lDQWdJQ0FnYzNkcGRHTm9JQ2drWTNSNExuTjBZWFJsS1NCN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElEQTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmZYekV4SUQwZ2RHaHBjeTV0WVhCZkxtVnVkSEpwWlhNb0tWdFRlVzFpYjJ3dWFYUmxjbUYwYjNKZEtDazdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzJWdWRDQTlJSFp2YVdRZ01EdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzVoWTNScGIyNGdQU0FuYm1WNGRDYzdYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0F4TWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnWW5KbFlXczdYRzRnSUNBZ0lDQWdJQ0FnSUNCallYTmxJREV5T2x4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0FrWDE4eE1pQTlJQ1JmWHpFeFd5UmpkSGd1WVdOMGFXOXVYU2drWTNSNExuTmxiblJKWjI1dmNtVlVhSEp2ZHlrN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQTVPMXh1SUNBZ0lDQWdJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUNBZ0lDQWdJR05oYzJVZ09UcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ0pHTjBlQzV6ZEdGMFpTQTlJQ2drWDE4eE1pNWtiMjVsS1NBL0lETWdPaUF5TzF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lDQWdJQ0FnSUdOaGMyVWdNenBjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdKR04wZUM1elpXNTBJRDBnSkY5Zk1USXVkbUZzZFdVN1hHNGdJQ0FnSUNBZ0lDQWdJQ0FnSUNSamRIZ3VjM1JoZEdVZ1BTQXRNanRjYmlBZ0lDQWdJQ0FnSUNBZ0lDQWdZbkpsWVdzN1hHNGdJQ0FnSUNBZ0lDQWdJQ0JqWVhObElESTZYRzRnSUNBZ0lDQWdJQ0FnSUNBZ0lDUmpkSGd1YzNSaGRHVWdQU0F4TWp0Y2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnY21WMGRYSnVJQ1JmWHpFeUxuWmhiSFZsTzF4dUlDQWdJQ0FnSUNBZ0lDQWdaR1ZtWVhWc2REcGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUNSamRIZ3VaVzVrS0NrN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmU3dnSkY5Zk1UQXNJSFJvYVhNcE8xeHVJQ0FnSUgwcFhHNGdJSDBzSUh0OUtUdGNiaUFnVDJKcVpXTjBMbVJsWm1sdVpWQnliM0JsY25SNUtGTmxkQzV3Y205MGIzUjVjR1VzSUZONWJXSnZiQzVwZEdWeVlYUnZjaXdnZTF4dUlDQWdJR052Ym1acFozVnlZV0pzWlRvZ2RISjFaU3hjYmlBZ0lDQjNjbWwwWVdKc1pUb2dkSEoxWlN4Y2JpQWdJQ0IyWVd4MVpUb2dVMlYwTG5CeWIzUnZkSGx3WlM1MllXeDFaWE5jYmlBZ2ZTazdYRzRnSUU5aWFtVmpkQzVrWldacGJtVlFjbTl3WlhKMGVTaFRaWFF1Y0hKdmRHOTBlWEJsTENBbmEyVjVjeWNzSUh0Y2JpQWdJQ0JqYjI1bWFXZDFjbUZpYkdVNklIUnlkV1VzWEc0Z0lDQWdkM0pwZEdGaWJHVTZJSFJ5ZFdVc1hHNGdJQ0FnZG1Gc2RXVTZJRk5sZEM1d2NtOTBiM1I1Y0dVdWRtRnNkV1Z6WEc0Z0lIMHBPMXh1SUNCbWRXNWpkR2x2YmlCd2IyeDVabWxzYkZObGRDaG5iRzlpWVd3cElIdGNiaUFnSUNCMllYSWdKRjlmTmlBOUlHZHNiMkpoYkN4Y2JpQWdJQ0FnSUNBZ1QySnFaV04wSUQwZ0pGOWZOaTVQWW1wbFkzUXNYRzRnSUNBZ0lDQWdJRk41YldKdmJDQTlJQ1JmWHpZdVUzbHRZbTlzTzF4dUlDQWdJR2xtSUNnaFoyeHZZbUZzTGxObGRDbGNiaUFnSUNBZ0lHZHNiMkpoYkM1VFpYUWdQU0JUWlhRN1hHNGdJQ0FnZG1GeUlITmxkRkJ5YjNSdmRIbHdaU0E5SUdkc2IySmhiQzVUWlhRdWNISnZkRzkwZVhCbE8xeHVJQ0FnSUdsbUlDaHpaWFJRY205MGIzUjVjR1V1ZG1Gc2RXVnpLU0I3WEc0Z0lDQWdJQ0J0WVhsaVpVRmtaRWwwWlhKaGRHOXlLSE5sZEZCeWIzUnZkSGx3WlN3Z2MyVjBVSEp2ZEc5MGVYQmxMblpoYkhWbGN5d2dVM2x0WW05c0tUdGNiaUFnSUNBZ0lHMWhlV0psUVdSa1NYUmxjbUYwYjNJb1QySnFaV04wTG1kbGRGQnliM1J2ZEhsd1pVOW1LRzVsZHlCbmJHOWlZV3d1VTJWMEtDa3VkbUZzZFdWektDa3BMQ0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUhSb2FYTTdYRzRnSUNBZ0lDQjlMQ0JUZVcxaWIyd3BPMXh1SUNBZ0lIMWNiaUFnZlZ4dUlDQnlaV2RwYzNSbGNsQnZiSGxtYVd4c0tIQnZiSGxtYVd4c1UyVjBLVHRjYmlBZ2NtVjBkWEp1SUh0Y2JpQWdJQ0JuWlhRZ1UyVjBLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRk5sZER0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCd2IyeDVabWxzYkZObGRDZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQndiMng1Wm1sc2JGTmxkRHRjYmlBZ0lDQjlYRzRnSUgwN1hHNTlLVHRjYmxONWMzUmxiUzVuWlhRb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OVRaWFF1YW5OY0lpQXJJQ2NuS1R0Y2JsTjVjM1JsYlM1eVpXZHBjM1JsY2sxdlpIVnNaU2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZibTlrWlY5dGIyUjFiR1Z6TDNKemRuQXZiR2xpTDNKemRuQXZZWE5oY0M1cWMxd2lMQ0JiWFN3Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUZ3aWRYTmxJSE4wY21samRGd2lPMXh1SUNCMllYSWdYMTl0YjJSMWJHVk9ZVzFsSUQwZ1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDI1dlpHVmZiVzlrZFd4bGN5OXljM1p3TDJ4cFlpOXljM1p3TDJGellYQXVhbk5jSWp0Y2JpQWdkbUZ5SUd4bGJpQTlJREE3WEc0Z0lHWjFibU4wYVc5dUlHRnpZWEFvWTJGc2JHSmhZMnNzSUdGeVp5a2dlMXh1SUNBZ0lIRjFaWFZsVzJ4bGJsMGdQU0JqWVd4c1ltRmphenRjYmlBZ0lDQnhkV1YxWlZ0c1pXNGdLeUF4WFNBOUlHRnlaenRjYmlBZ0lDQnNaVzRnS3owZ01qdGNiaUFnSUNCcFppQW9iR1Z1SUQwOVBTQXlLU0I3WEc0Z0lDQWdJQ0J6WTJobFpIVnNaVVpzZFhOb0tDazdYRzRnSUNBZ2ZWeHVJQ0I5WEc0Z0lIWmhjaUFrWDE5a1pXWmhkV3gwSUQwZ1lYTmhjRHRjYmlBZ2RtRnlJR0p5YjNkelpYSkhiRzlpWVd3Z1BTQW9kSGx3Wlc5bUlIZHBibVJ2ZHlBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NwSUQ4Z2QybHVaRzkzSURvZ2UzMDdYRzRnSUhaaGNpQkNjbTkzYzJWeVRYVjBZWFJwYjI1UFluTmxjblpsY2lBOUlHSnliM2R6WlhKSGJHOWlZV3d1VFhWMFlYUnBiMjVQWW5ObGNuWmxjaUI4ZkNCaWNtOTNjMlZ5UjJ4dlltRnNMbGRsWWt0cGRFMTFkR0YwYVc5dVQySnpaWEoyWlhJN1hHNGdJSFpoY2lCcGMxZHZjbXRsY2lBOUlIUjVjR1Z2WmlCVmFXNTBPRU5zWVcxd1pXUkJjbkpoZVNBaFBUMGdKM1Z1WkdWbWFXNWxaQ2NnSmlZZ2RIbHdaVzltSUdsdGNHOXlkRk5qY21sd2RITWdJVDA5SUNkMWJtUmxabWx1WldRbklDWW1JSFI1Y0dWdlppQk5aWE56WVdkbFEyaGhibTVsYkNBaFBUMGdKM1Z1WkdWbWFXNWxaQ2M3WEc0Z0lHWjFibU4wYVc5dUlIVnpaVTVsZUhSVWFXTnJLQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ0lDQWdJSEJ5YjJObGMzTXVibVY0ZEZScFkyc29abXgxYzJncE8xeHVJQ0FnSUgwN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2RYTmxUWFYwWVhScGIyNVBZbk5sY25abGNpZ3BJSHRjYmlBZ0lDQjJZWElnYVhSbGNtRjBhVzl1Y3lBOUlEQTdYRzRnSUNBZ2RtRnlJRzlpYzJWeWRtVnlJRDBnYm1WM0lFSnliM2R6WlhKTmRYUmhkR2x2Yms5aWMyVnlkbVZ5S0dac2RYTm9LVHRjYmlBZ0lDQjJZWElnYm05a1pTQTlJR1J2WTNWdFpXNTBMbU55WldGMFpWUmxlSFJPYjJSbEtDY25LVHRjYmlBZ0lDQnZZbk5sY25abGNpNXZZbk5sY25abEtHNXZaR1VzSUh0amFHRnlZV04wWlhKRVlYUmhPaUIwY25WbGZTazdYRzRnSUNBZ2NtVjBkWEp1SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2JtOWtaUzVrWVhSaElEMGdLR2wwWlhKaGRHbHZibk1nUFNBcksybDBaWEpoZEdsdmJuTWdKU0F5S1R0Y2JpQWdJQ0I5TzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUhWelpVMWxjM05oWjJWRGFHRnVibVZzS0NrZ2UxeHVJQ0FnSUhaaGNpQmphR0Z1Ym1Wc0lEMGdibVYzSUUxbGMzTmhaMlZEYUdGdWJtVnNLQ2s3WEc0Z0lDQWdZMmhoYm01bGJDNXdiM0owTVM1dmJtMWxjM05oWjJVZ1BTQm1iSFZ6YUR0Y2JpQWdJQ0J5WlhSMWNtNGdablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0JqYUdGdWJtVnNMbkJ2Y25ReUxuQnZjM1JOWlhOellXZGxLREFwTzF4dUlDQWdJSDA3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnZFhObFUyVjBWR2x0Wlc5MWRDZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z1puVnVZM1JwYjI0b0tTQjdYRzRnSUNBZ0lDQnpaWFJVYVcxbGIzVjBLR1pzZFhOb0xDQXhLVHRjYmlBZ0lDQjlPMXh1SUNCOVhHNGdJSFpoY2lCeGRXVjFaU0E5SUc1bGR5QkJjbkpoZVNneE1EQXdLVHRjYmlBZ1puVnVZM1JwYjI0Z1pteDFjMmdvS1NCN1hHNGdJQ0FnWm05eUlDaDJZWElnYVNBOUlEQTdJR2tnUENCc1pXNDdJR2tnS3owZ01pa2dlMXh1SUNBZ0lDQWdkbUZ5SUdOaGJHeGlZV05ySUQwZ2NYVmxkV1ZiYVYwN1hHNGdJQ0FnSUNCMllYSWdZWEpuSUQwZ2NYVmxkV1ZiYVNBcklERmRPMXh1SUNBZ0lDQWdZMkZzYkdKaFkyc29ZWEpuS1R0Y2JpQWdJQ0FnSUhGMVpYVmxXMmxkSUQwZ2RXNWtaV1pwYm1Wa08xeHVJQ0FnSUNBZ2NYVmxkV1ZiYVNBcklERmRJRDBnZFc1a1pXWnBibVZrTzF4dUlDQWdJSDFjYmlBZ0lDQnNaVzRnUFNBd08xeHVJQ0I5WEc0Z0lIWmhjaUJ6WTJobFpIVnNaVVpzZFhOb08xeHVJQ0JwWmlBb2RIbHdaVzltSUhCeWIyTmxjM01nSVQwOUlDZDFibVJsWm1sdVpXUW5JQ1ltSUh0OUxuUnZVM1J5YVc1bkxtTmhiR3dvY0hKdlkyVnpjeWtnUFQwOUlDZGJiMkpxWldOMElIQnliMk5sYzNOZEp5a2dlMXh1SUNBZ0lITmphR1ZrZFd4bFJteDFjMmdnUFNCMWMyVk9aWGgwVkdsamF5Z3BPMXh1SUNCOUlHVnNjMlVnYVdZZ0tFSnliM2R6WlhKTmRYUmhkR2x2Yms5aWMyVnlkbVZ5S1NCN1hHNGdJQ0FnYzJOb1pXUjFiR1ZHYkhWemFDQTlJSFZ6WlUxMWRHRjBhVzl1VDJKelpYSjJaWElvS1R0Y2JpQWdmU0JsYkhObElHbG1JQ2hwYzFkdmNtdGxjaWtnZTF4dUlDQWdJSE5qYUdWa2RXeGxSbXgxYzJnZ1BTQjFjMlZOWlhOellXZGxRMmhoYm01bGJDZ3BPMXh1SUNCOUlHVnNjMlVnZTF4dUlDQWdJSE5qYUdWa2RXeGxSbXgxYzJnZ1BTQjFjMlZUWlhSVWFXMWxiM1YwS0NrN1hHNGdJSDFjYmlBZ2NtVjBkWEp1SUh0blpYUWdaR1ZtWVhWc2RDZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQWtYMTlrWldaaGRXeDBPMXh1SUNBZ0lIMTlPMXh1ZlNrN1hHNVRlWE4wWlcwdWNtVm5hWE4wWlhKTmIyUjFiR1VvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5UWNtOXRhWE5sTG1welhDSXNJRnRkTENCbWRXNWpkR2x2YmlncElIdGNiaUFnWENKMWMyVWdjM1J5YVdOMFhDSTdYRzRnSUhaaGNpQmZYMjF2WkhWc1pVNWhiV1VnUFNCY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwxQnliMjFwYzJVdWFuTmNJanRjYmlBZ2RtRnlJR0Z6ZVc1aklEMGdVM2x6ZEdWdExtZGxkQ2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZibTlrWlY5dGIyUjFiR1Z6TDNKemRuQXZiR2xpTDNKemRuQXZZWE5oY0M1cWMxd2lLUzVrWldaaGRXeDBPMXh1SUNCMllYSWdjbVZuYVhOMFpYSlFiMng1Wm1sc2JDQTlJRk41YzNSbGJTNW5aWFFvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5MWRHbHNjeTVxYzF3aUtTNXlaV2RwYzNSbGNsQnZiSGxtYVd4c08xeHVJQ0IyWVhJZ2NISnZiV2x6WlZKaGR5QTlJSHQ5TzF4dUlDQm1kVzVqZEdsdmJpQnBjMUJ5YjIxcGMyVW9lQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQjRJQ1ltSUhSNWNHVnZaaUI0SUQwOVBTQW5iMkpxWldOMEp5QW1KaUI0TG5OMFlYUjFjMThnSVQwOUlIVnVaR1ZtYVc1bFpEdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnBaRkpsYzI5c2RtVklZVzVrYkdWeUtIZ3BJSHRjYmlBZ0lDQnlaWFIxY200Z2VEdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQnBaRkpsYW1WamRFaGhibVJzWlhJb2VDa2dlMXh1SUNBZ0lIUm9jbTkzSUhnN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1kyaGhhVzRvY0hKdmJXbHpaU2tnZTF4dUlDQWdJSFpoY2lCdmJsSmxjMjlzZG1VZ1BTQmhjbWQxYldWdWRITmJNVjBnSVQwOUlDaDJiMmxrSURBcElEOGdZWEpuZFcxbGJuUnpXekZkSURvZ2FXUlNaWE52YkhabFNHRnVaR3hsY2p0Y2JpQWdJQ0IyWVhJZ2IyNVNaV3BsWTNRZ1BTQmhjbWQxYldWdWRITmJNbDBnSVQwOUlDaDJiMmxrSURBcElEOGdZWEpuZFcxbGJuUnpXekpkSURvZ2FXUlNaV3BsWTNSSVlXNWtiR1Z5TzF4dUlDQWdJSFpoY2lCa1pXWmxjbkpsWkNBOUlHZGxkRVJsWm1WeWNtVmtLSEJ5YjIxcGMyVXVZMjl1YzNSeWRXTjBiM0lwTzF4dUlDQWdJSE4zYVhSamFDQW9jSEp2YldselpTNXpkR0YwZFhOZktTQjdYRzRnSUNBZ0lDQmpZWE5sSUhWdVpHVm1hVzVsWkRwY2JpQWdJQ0FnSUNBZ2RHaHliM2NnVkhsd1pVVnljbTl5TzF4dUlDQWdJQ0FnWTJGelpTQXdPbHh1SUNBZ0lDQWdJQ0J3Y205dGFYTmxMbTl1VW1WemIyeDJaVjh1Y0hWemFDaHZibEpsYzI5c2RtVXNJR1JsWm1WeWNtVmtLVHRjYmlBZ0lDQWdJQ0FnY0hKdmJXbHpaUzV2YmxKbGFtVmpkRjh1Y0hWemFDaHZibEpsYW1WamRDd2daR1ZtWlhKeVpXUXBPMXh1SUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFnSUNBZ0lHTmhjMlVnS3pFNlhHNGdJQ0FnSUNBZ0lIQnliMjFwYzJWRmJuRjFaWFZsS0hCeWIyMXBjMlV1ZG1Gc2RXVmZMQ0JiYjI1U1pYTnZiSFpsTENCa1pXWmxjbkpsWkYwcE8xeHVJQ0FnSUNBZ0lDQmljbVZoYXp0Y2JpQWdJQ0FnSUdOaGMyVWdMVEU2WEc0Z0lDQWdJQ0FnSUhCeWIyMXBjMlZGYm5GMVpYVmxLSEJ5YjIxcGMyVXVkbUZzZFdWZkxDQmJiMjVTWldwbFkzUXNJR1JsWm1WeWNtVmtYU2s3WEc0Z0lDQWdJQ0FnSUdKeVpXRnJPMXh1SUNBZ0lIMWNiaUFnSUNCeVpYUjFjbTRnWkdWbVpYSnlaV1F1Y0hKdmJXbHpaVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJuWlhSRVpXWmxjbkpsWkNoREtTQjdYRzRnSUNBZ2FXWWdLSFJvYVhNZ1BUMDlJQ1JRY205dGFYTmxLU0I3WEc0Z0lDQWdJQ0IyWVhJZ2NISnZiV2x6WlNBOUlIQnliMjFwYzJWSmJtbDBLRzVsZHlBa1VISnZiV2x6WlNod2NtOXRhWE5sVW1GM0tTazdYRzRnSUNBZ0lDQnlaWFIxY200Z2UxeHVJQ0FnSUNBZ0lDQndjbTl0YVhObE9pQndjbTl0YVhObExGeHVJQ0FnSUNBZ0lDQnlaWE52YkhabE9pQW9ablZ1WTNScGIyNG9lQ2tnZTF4dUlDQWdJQ0FnSUNBZ0lIQnliMjFwYzJWU1pYTnZiSFpsS0hCeWIyMXBjMlVzSUhncE8xeHVJQ0FnSUNBZ0lDQjlLU3hjYmlBZ0lDQWdJQ0FnY21WcVpXTjBPaUFvWm5WdVkzUnBiMjRvY2lrZ2UxeHVJQ0FnSUNBZ0lDQWdJSEJ5YjIxcGMyVlNaV3BsWTNRb2NISnZiV2x6WlN3Z2NpazdYRzRnSUNBZ0lDQWdJSDBwWEc0Z0lDQWdJQ0I5TzF4dUlDQWdJSDBnWld4elpTQjdYRzRnSUNBZ0lDQjJZWElnY21WemRXeDBJRDBnZTMwN1hHNGdJQ0FnSUNCeVpYTjFiSFF1Y0hKdmJXbHpaU0E5SUc1bGR5QkRLQ2htZFc1amRHbHZiaWh5WlhOdmJIWmxMQ0J5WldwbFkzUXBJSHRjYmlBZ0lDQWdJQ0FnY21WemRXeDBMbkpsYzI5c2RtVWdQU0J5WlhOdmJIWmxPMXh1SUNBZ0lDQWdJQ0J5WlhOMWJIUXVjbVZxWldOMElEMGdjbVZxWldOME8xeHVJQ0FnSUNBZ2ZTa3BPMXh1SUNBZ0lDQWdjbVYwZFhKdUlISmxjM1ZzZER0Y2JpQWdJQ0I5WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY0hKdmJXbHpaVk5sZENod2NtOXRhWE5sTENCemRHRjBkWE1zSUhaaGJIVmxMQ0J2YmxKbGMyOXNkbVVzSUc5dVVtVnFaV04wS1NCN1hHNGdJQ0FnY0hKdmJXbHpaUzV6ZEdGMGRYTmZJRDBnYzNSaGRIVnpPMXh1SUNBZ0lIQnliMjFwYzJVdWRtRnNkV1ZmSUQwZ2RtRnNkV1U3WEc0Z0lDQWdjSEp2YldselpTNXZibEpsYzI5c2RtVmZJRDBnYjI1U1pYTnZiSFpsTzF4dUlDQWdJSEJ5YjIxcGMyVXViMjVTWldwbFkzUmZJRDBnYjI1U1pXcGxZM1E3WEc0Z0lDQWdjbVYwZFhKdUlIQnliMjFwYzJVN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NISnZiV2x6WlVsdWFYUW9jSEp2YldselpTa2dlMXh1SUNBZ0lISmxkSFZ5YmlCd2NtOXRhWE5sVTJWMEtIQnliMjFwYzJVc0lEQXNJSFZ1WkdWbWFXNWxaQ3dnVzEwc0lGdGRLVHRjYmlBZ2ZWeHVJQ0IyWVhJZ1VISnZiV2x6WlNBOUlHWjFibU4wYVc5dUlGQnliMjFwYzJVb2NtVnpiMngyWlhJcElIdGNiaUFnSUNCcFppQW9jbVZ6YjJ4MlpYSWdQVDA5SUhCeWIyMXBjMlZTWVhjcFhHNGdJQ0FnSUNCeVpYUjFjbTQ3WEc0Z0lDQWdhV1lnS0hSNWNHVnZaaUJ5WlhOdmJIWmxjaUFoUFQwZ0oyWjFibU4wYVc5dUp5bGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QlVlWEJsUlhKeWIzSTdYRzRnSUNBZ2RtRnlJSEJ5YjIxcGMyVWdQU0J3Y205dGFYTmxTVzVwZENoMGFHbHpLVHRjYmlBZ0lDQjBjbmtnZTF4dUlDQWdJQ0FnY21WemIyeDJaWElvS0daMWJtTjBhVzl1S0hncElIdGNiaUFnSUNBZ0lDQWdjSEp2YldselpWSmxjMjlzZG1Vb2NISnZiV2x6WlN3Z2VDazdYRzRnSUNBZ0lDQjlLU3dnS0daMWJtTjBhVzl1S0hJcElIdGNiaUFnSUNBZ0lDQWdjSEp2YldselpWSmxhbVZqZENod2NtOXRhWE5sTENCeUtUdGNiaUFnSUNBZ0lIMHBLVHRjYmlBZ0lDQjlJR05oZEdOb0lDaGxLU0I3WEc0Z0lDQWdJQ0J3Y205dGFYTmxVbVZxWldOMEtIQnliMjFwYzJVc0lHVXBPMXh1SUNBZ0lIMWNiaUFnZlR0Y2JpQWdLQ1IwY21GalpYVnlVblZ1ZEdsdFpTNWpjbVZoZEdWRGJHRnpjeWtvVUhKdmJXbHpaU3dnZTF4dUlDQWdJR05oZEdOb09pQm1kVzVqZEdsdmJpaHZibEpsYW1WamRDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlIUm9hWE11ZEdobGJpaDFibVJsWm1sdVpXUXNJRzl1VW1WcVpXTjBLVHRjYmlBZ0lDQjlMRnh1SUNBZ0lIUm9aVzQ2SUdaMWJtTjBhVzl1S0c5dVVtVnpiMngyWlN3Z2IyNVNaV3BsWTNRcElIdGNiaUFnSUNBZ0lHbG1JQ2gwZVhCbGIyWWdiMjVTWlhOdmJIWmxJQ0U5UFNBblpuVnVZM1JwYjI0bktWeHVJQ0FnSUNBZ0lDQnZibEpsYzI5c2RtVWdQU0JwWkZKbGMyOXNkbVZJWVc1a2JHVnlPMXh1SUNBZ0lDQWdhV1lnS0hSNWNHVnZaaUJ2YmxKbGFtVmpkQ0FoUFQwZ0oyWjFibU4wYVc5dUp5bGNiaUFnSUNBZ0lDQWdiMjVTWldwbFkzUWdQU0JwWkZKbGFtVmpkRWhoYm1Sc1pYSTdYRzRnSUNBZ0lDQjJZWElnZEdoaGRDQTlJSFJvYVhNN1hHNGdJQ0FnSUNCMllYSWdZMjl1YzNSeWRXTjBiM0lnUFNCMGFHbHpMbU52Ym5OMGNuVmpkRzl5TzF4dUlDQWdJQ0FnY21WMGRYSnVJR05vWVdsdUtIUm9hWE1zSUdaMWJtTjBhVzl1S0hncElIdGNiaUFnSUNBZ0lDQWdlQ0E5SUhCeWIyMXBjMlZEYjJWeVkyVW9ZMjl1YzNSeWRXTjBiM0lzSUhncE8xeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2VDQTlQVDBnZEdoaGRDQS9JRzl1VW1WcVpXTjBLRzVsZHlCVWVYQmxSWEp5YjNJcElEb2dhWE5RY205dGFYTmxLSGdwSUQ4Z2VDNTBhR1Z1S0c5dVVtVnpiMngyWlN3Z2IyNVNaV3BsWTNRcElEb2diMjVTWlhOdmJIWmxLSGdwTzF4dUlDQWdJQ0FnZlN3Z2IyNVNaV3BsWTNRcE8xeHVJQ0FnSUgxY2JpQWdmU3dnZTF4dUlDQWdJSEpsYzI5c2RtVTZJR1oxYm1OMGFXOXVLSGdwSUh0Y2JpQWdJQ0FnSUdsbUlDaDBhR2x6SUQwOVBTQWtVSEp2YldselpTa2dlMXh1SUNBZ0lDQWdJQ0JwWmlBb2FYTlFjbTl0YVhObEtIZ3BLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUhnN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlIQnliMjFwYzJWVFpYUW9ibVYzSUNSUWNtOXRhWE5sS0hCeWIyMXBjMlZTWVhjcExDQXJNU3dnZUNrN1hHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnYm1WM0lIUm9hWE1vWm5WdVkzUnBiMjRvY21WemIyeDJaU3dnY21WcVpXTjBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVnpiMngyWlNoNEtUdGNiaUFnSUNBZ0lDQWdmU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmlBZ0lDQnlaV3BsWTNRNklHWjFibU4wYVc5dUtISXBJSHRjYmlBZ0lDQWdJR2xtSUNoMGFHbHpJRDA5UFNBa1VISnZiV2x6WlNrZ2UxeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2NISnZiV2x6WlZObGRDaHVaWGNnSkZCeWIyMXBjMlVvY0hKdmJXbHpaVkpoZHlrc0lDMHhMQ0J5S1R0Y2JpQWdJQ0FnSUgwZ1pXeHpaU0I3WEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ1WlhjZ2RHaHBjeWdvWm5WdVkzUnBiMjRvY21WemIyeDJaU3dnY21WcVpXTjBLU0I3WEc0Z0lDQWdJQ0FnSUNBZ2NtVnFaV04wS0hJcE8xeHVJQ0FnSUNBZ0lDQjlLU2s3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmU3hjYmlBZ0lDQmhiR3c2SUdaMWJtTjBhVzl1S0haaGJIVmxjeWtnZTF4dUlDQWdJQ0FnZG1GeUlHUmxabVZ5Y21Wa0lEMGdaMlYwUkdWbVpYSnlaV1FvZEdocGN5azdYRzRnSUNBZ0lDQjJZWElnY21WemIyeDFkR2x2Ym5NZ1BTQmJYVHRjYmlBZ0lDQWdJSFJ5ZVNCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJqYjNWdWRDQTlJSFpoYkhWbGN5NXNaVzVuZEdnN1hHNGdJQ0FnSUNBZ0lHbG1JQ2hqYjNWdWRDQTlQVDBnTUNrZ2UxeHVJQ0FnSUNBZ0lDQWdJR1JsWm1WeWNtVmtMbkpsYzI5c2RtVW9jbVZ6YjJ4MWRHbHZibk1wTzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lHWnZjaUFvZG1GeUlHa2dQU0F3T3lCcElEd2dkbUZzZFdWekxteGxibWQwYURzZ2FTc3JLU0I3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjBhR2x6TG5KbGMyOXNkbVVvZG1Gc2RXVnpXMmxkS1M1MGFHVnVLR1oxYm1OMGFXOXVLR2tzSUhncElIdGNiaUFnSUNBZ0lDQWdJQ0FnSUNBZ2NtVnpiMngxZEdsdmJuTmJhVjBnUFNCNE8xeHVJQ0FnSUNBZ0lDQWdJQ0FnSUNCcFppQW9MUzFqYjNWdWRDQTlQVDBnTUNsY2JpQWdJQ0FnSUNBZ0lDQWdJQ0FnSUNCa1pXWmxjbkpsWkM1eVpYTnZiSFpsS0hKbGMyOXNkWFJwYjI1ektUdGNiaUFnSUNBZ0lDQWdJQ0FnSUgwdVltbHVaQ2gxYm1SbFptbHVaV1FzSUdrcExDQW9ablZ1WTNScGIyNG9jaWtnZTF4dUlDQWdJQ0FnSUNBZ0lDQWdJQ0JrWldabGNuSmxaQzV5WldwbFkzUW9jaWs3WEc0Z0lDQWdJQ0FnSUNBZ0lDQjlLU2s3WEc0Z0lDQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjlYRzRnSUNBZ0lDQjlJR05oZEdOb0lDaGxLU0I3WEc0Z0lDQWdJQ0FnSUdSbFptVnljbVZrTG5KbGFtVmpkQ2hsS1R0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUhKbGRIVnliaUJrWldabGNuSmxaQzV3Y205dGFYTmxPMXh1SUNBZ0lIMHNYRzRnSUNBZ2NtRmpaVG9nWm5WdVkzUnBiMjRvZG1Gc2RXVnpLU0I3WEc0Z0lDQWdJQ0IyWVhJZ1pHVm1aWEp5WldRZ1BTQm5aWFJFWldabGNuSmxaQ2gwYUdsektUdGNiaUFnSUNBZ0lIUnllU0I3WEc0Z0lDQWdJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2RtRnNkV1Z6TG14bGJtZDBhRHNnYVNzcktTQjdYRzRnSUNBZ0lDQWdJQ0FnZEdocGN5NXlaWE52YkhabEtIWmhiSFZsYzF0cFhTa3VkR2hsYmlnb1puVnVZM1JwYjI0b2VDa2dlMXh1SUNBZ0lDQWdJQ0FnSUNBZ1pHVm1aWEp5WldRdWNtVnpiMngyWlNoNEtUdGNiaUFnSUNBZ0lDQWdJQ0I5S1N3Z0tHWjFibU4wYVc5dUtISXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHUmxabVZ5Y21Wa0xuSmxhbVZqZENoeUtUdGNiaUFnSUNBZ0lDQWdJQ0I5S1NrN1hHNGdJQ0FnSUNBZ0lIMWNiaUFnSUNBZ0lIMGdZMkYwWTJnZ0tHVXBJSHRjYmlBZ0lDQWdJQ0FnWkdWbVpYSnlaV1F1Y21WcVpXTjBLR1VwTzF4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnY21WMGRYSnVJR1JsWm1WeWNtVmtMbkJ5YjIxcGMyVTdYRzRnSUNBZ2ZWeHVJQ0I5S1R0Y2JpQWdkbUZ5SUNSUWNtOXRhWE5sSUQwZ1VISnZiV2x6WlR0Y2JpQWdkbUZ5SUNSUWNtOXRhWE5sVW1WcVpXTjBJRDBnSkZCeWIyMXBjMlV1Y21WcVpXTjBPMXh1SUNCbWRXNWpkR2x2YmlCd2NtOXRhWE5sVW1WemIyeDJaU2h3Y205dGFYTmxMQ0I0S1NCN1hHNGdJQ0FnY0hKdmJXbHpaVVJ2Ym1Vb2NISnZiV2x6WlN3Z0t6RXNJSGdzSUhCeWIyMXBjMlV1YjI1U1pYTnZiSFpsWHlrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z2NISnZiV2x6WlZKbGFtVmpkQ2h3Y205dGFYTmxMQ0J5S1NCN1hHNGdJQ0FnY0hKdmJXbHpaVVJ2Ym1Vb2NISnZiV2x6WlN3Z0xURXNJSElzSUhCeWIyMXBjMlV1YjI1U1pXcGxZM1JmS1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCd2NtOXRhWE5sUkc5dVpTaHdjbTl0YVhObExDQnpkR0YwZFhNc0lIWmhiSFZsTENCeVpXRmpkR2x2Ym5NcElIdGNiaUFnSUNCcFppQW9jSEp2YldselpTNXpkR0YwZFhOZklDRTlQU0F3S1Z4dUlDQWdJQ0FnY21WMGRYSnVPMXh1SUNBZ0lIQnliMjFwYzJWRmJuRjFaWFZsS0haaGJIVmxMQ0J5WldGamRHbHZibk1wTzF4dUlDQWdJSEJ5YjIxcGMyVlRaWFFvY0hKdmJXbHpaU3dnYzNSaGRIVnpMQ0IyWVd4MVpTazdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjSEp2YldselpVVnVjWFZsZFdVb2RtRnNkV1VzSUhSaGMydHpLU0I3WEc0Z0lDQWdZWE41Ym1Nb0tHWjFibU4wYVc5dUtDa2dlMXh1SUNBZ0lDQWdabTl5SUNoMllYSWdhU0E5SURBN0lHa2dQQ0IwWVhOcmN5NXNaVzVuZEdnN0lHa2dLejBnTWlrZ2UxeHVJQ0FnSUNBZ0lDQndjbTl0YVhObFNHRnVaR3hsS0haaGJIVmxMQ0IwWVhOcmMxdHBYU3dnZEdGemEzTmJhU0FySURGZEtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNCOUtTazdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjSEp2YldselpVaGhibVJzWlNoMllXeDFaU3dnYUdGdVpHeGxjaXdnWkdWbVpYSnlaV1FwSUh0Y2JpQWdJQ0IwY25rZ2UxeHVJQ0FnSUNBZ2RtRnlJSEpsYzNWc2RDQTlJR2hoYm1Sc1pYSW9kbUZzZFdVcE8xeHVJQ0FnSUNBZ2FXWWdLSEpsYzNWc2RDQTlQVDBnWkdWbVpYSnlaV1F1Y0hKdmJXbHpaU2xjYmlBZ0lDQWdJQ0FnZEdoeWIzY2dibVYzSUZSNWNHVkZjbkp2Y2p0Y2JpQWdJQ0FnSUdWc2MyVWdhV1lnS0dselVISnZiV2x6WlNoeVpYTjFiSFFwS1Z4dUlDQWdJQ0FnSUNCamFHRnBiaWh5WlhOMWJIUXNJR1JsWm1WeWNtVmtMbkpsYzI5c2RtVXNJR1JsWm1WeWNtVmtMbkpsYW1WamRDazdYRzRnSUNBZ0lDQmxiSE5sWEc0Z0lDQWdJQ0FnSUdSbFptVnljbVZrTG5KbGMyOXNkbVVvY21WemRXeDBLVHRjYmlBZ0lDQjlJR05oZEdOb0lDaGxLU0I3WEc0Z0lDQWdJQ0IwY25rZ2UxeHVJQ0FnSUNBZ0lDQmtaV1psY25KbFpDNXlaV3BsWTNRb1pTazdYRzRnSUNBZ0lDQjlJR05oZEdOb0lDaGxLU0I3ZlZ4dUlDQWdJSDFjYmlBZ2ZWeHVJQ0IyWVhJZ2RHaGxibUZpYkdWVGVXMWliMndnUFNBblFFQjBhR1Z1WVdKc1pTYzdYRzRnSUdaMWJtTjBhVzl1SUdselQySnFaV04wS0hncElIdGNiaUFnSUNCeVpYUjFjbTRnZUNBbUppQW9kSGx3Wlc5bUlIZ2dQVDA5SUNkdlltcGxZM1FuSUh4OElIUjVjR1Z2WmlCNElEMDlQU0FuWm5WdVkzUnBiMjRuS1R0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCd2NtOXRhWE5sUTI5bGNtTmxLR052Ym5OMGNuVmpkRzl5TENCNEtTQjdYRzRnSUNBZ2FXWWdLQ0ZwYzFCeWIyMXBjMlVvZUNrZ0ppWWdhWE5QWW1wbFkzUW9lQ2twSUh0Y2JpQWdJQ0FnSUhaaGNpQjBhR1Z1TzF4dUlDQWdJQ0FnZEhKNUlIdGNiaUFnSUNBZ0lDQWdkR2hsYmlBOUlIZ3VkR2hsYmp0Y2JpQWdJQ0FnSUgwZ1kyRjBZMmdnS0hJcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUhCeWIyMXBjMlVnUFNBa1VISnZiV2x6WlZKbGFtVmpkQzVqWVd4c0tHTnZibk4wY25WamRHOXlMQ0J5S1R0Y2JpQWdJQ0FnSUNBZ2VGdDBhR1Z1WVdKc1pWTjViV0p2YkYwZ1BTQndjbTl0YVhObE8xeHVJQ0FnSUNBZ0lDQnlaWFIxY200Z2NISnZiV2x6WlR0Y2JpQWdJQ0FnSUgxY2JpQWdJQ0FnSUdsbUlDaDBlWEJsYjJZZ2RHaGxiaUE5UFQwZ0oyWjFibU4wYVc5dUp5a2dlMXh1SUNBZ0lDQWdJQ0IyWVhJZ2NDQTlJSGhiZEdobGJtRmliR1ZUZVcxaWIyeGRPMXh1SUNBZ0lDQWdJQ0JwWmlBb2NDa2dlMXh1SUNBZ0lDQWdJQ0FnSUhKbGRIVnliaUJ3TzF4dUlDQWdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNBZ0lIWmhjaUJrWldabGNuSmxaQ0E5SUdkbGRFUmxabVZ5Y21Wa0tHTnZibk4wY25WamRHOXlLVHRjYmlBZ0lDQWdJQ0FnSUNCNFczUm9aVzVoWW14bFUzbHRZbTlzWFNBOUlHUmxabVZ5Y21Wa0xuQnliMjFwYzJVN1hHNGdJQ0FnSUNBZ0lDQWdkSEo1SUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJSFJvWlc0dVkyRnNiQ2g0TENCa1pXWmxjbkpsWkM1eVpYTnZiSFpsTENCa1pXWmxjbkpsWkM1eVpXcGxZM1FwTzF4dUlDQWdJQ0FnSUNBZ0lIMGdZMkYwWTJnZ0tISXBJSHRjYmlBZ0lDQWdJQ0FnSUNBZ0lHUmxabVZ5Y21Wa0xuSmxhbVZqZENoeUtUdGNiaUFnSUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0FnSUNBZ2NtVjBkWEp1SUdSbFptVnljbVZrTG5CeWIyMXBjMlU3WEc0Z0lDQWdJQ0FnSUgxY2JpQWdJQ0FnSUgxY2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlIZzdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdjRzlzZVdacGJHeFFjbTl0YVhObEtHZHNiMkpoYkNrZ2UxeHVJQ0FnSUdsbUlDZ2haMnh2WW1Gc0xsQnliMjFwYzJVcFhHNGdJQ0FnSUNCbmJHOWlZV3d1VUhKdmJXbHpaU0E5SUZCeWIyMXBjMlU3WEc0Z0lIMWNiaUFnY21WbmFYTjBaWEpRYjJ4NVptbHNiQ2h3YjJ4NVptbHNiRkJ5YjIxcGMyVXBPMXh1SUNCeVpYUjFjbTRnZTF4dUlDQWdJR2RsZENCUWNtOXRhWE5sS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUZCeWIyMXBjMlU3WEc0Z0lDQWdmU3hjYmlBZ0lDQm5aWFFnY0c5c2VXWnBiR3hRY205dGFYTmxLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSEJ2YkhsbWFXeHNVSEp2YldselpUdGNiaUFnSUNCOVhHNGdJSDA3WEc1OUtUdGNibE41YzNSbGJTNW5aWFFvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5UWNtOXRhWE5sTG1welhDSWdLeUFuSnlrN1hHNVRlWE4wWlcwdWNtVm5hWE4wWlhKTmIyUjFiR1VvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5VGRISnBibWRKZEdWeVlYUnZjaTVxYzF3aUxDQmJYU3dnWm5WdVkzUnBiMjRvS1NCN1hHNGdJRndpZFhObElITjBjbWxqZEZ3aU8xeHVJQ0IyWVhJZ0pGOWZNanRjYmlBZ2RtRnlJRjlmYlc5a2RXeGxUbUZ0WlNBOUlGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZVM1J5YVc1blNYUmxjbUYwYjNJdWFuTmNJanRjYmlBZ2RtRnlJQ1JmWHpBZ1BTQlRlWE4wWlcwdVoyVjBLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12ZFhScGJITXVhbk5jSWlrc1hHNGdJQ0FnSUNCamNtVmhkR1ZKZEdWeVlYUnZjbEpsYzNWc2RFOWlhbVZqZENBOUlDUmZYekF1WTNKbFlYUmxTWFJsY21GMGIzSlNaWE4xYkhSUFltcGxZM1FzWEc0Z0lDQWdJQ0JwYzA5aWFtVmpkQ0E5SUNSZlh6QXVhWE5QWW1wbFkzUTdYRzRnSUhaaGNpQjBiMUJ5YjNCbGNuUjVJRDBnSkhSeVlXTmxkWEpTZFc1MGFXMWxMblJ2VUhKdmNHVnlkSGs3WEc0Z0lIWmhjaUJvWVhOUGQyNVFjbTl3WlhKMGVTQTlJRTlpYW1WamRDNXdjbTkwYjNSNWNHVXVhR0Z6VDNkdVVISnZjR1Z5ZEhrN1hHNGdJSFpoY2lCcGRHVnlZWFJsWkZOMGNtbHVaeUE5SUZONWJXSnZiQ2duYVhSbGNtRjBaV1JUZEhKcGJtY25LVHRjYmlBZ2RtRnlJSE4wY21sdVowbDBaWEpoZEc5eVRtVjRkRWx1WkdWNElEMGdVM2x0WW05c0tDZHpkSEpwYm1kSmRHVnlZWFJ2Y2s1bGVIUkpibVJsZUNjcE8xeHVJQ0IyWVhJZ1UzUnlhVzVuU1hSbGNtRjBiM0lnUFNCbWRXNWpkR2x2YmlCVGRISnBibWRKZEdWeVlYUnZjaWdwSUh0OU8xeHVJQ0FvSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU55WldGMFpVTnNZWE56S1NoVGRISnBibWRKZEdWeVlYUnZjaXdnS0NSZlh6SWdQU0I3ZlN3Z1QySnFaV04wTG1SbFptbHVaVkJ5YjNCbGNuUjVLQ1JmWHpJc0lGd2libVY0ZEZ3aUxDQjdYRzRnSUNBZ2RtRnNkV1U2SUdaMWJtTjBhVzl1S0NrZ2UxeHVJQ0FnSUNBZ2RtRnlJRzhnUFNCMGFHbHpPMXh1SUNBZ0lDQWdhV1lnS0NGcGMwOWlhbVZqZENodktTQjhmQ0FoYUdGelQzZHVVSEp2Y0dWeWRIa3VZMkZzYkNodkxDQnBkR1Z5WVhSbFpGTjBjbWx1WnlrcElIdGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduZEdocGN5QnRkWE4wSUdKbElHRWdVM1J5YVc1blNYUmxjbUYwYjNJZ2IySnFaV04wSnlrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCMllYSWdjeUE5SUc5YmRHOVFjbTl3WlhKMGVTaHBkR1Z5WVhSbFpGTjBjbWx1WnlsZE8xeHVJQ0FnSUNBZ2FXWWdLSE1nUFQwOUlIVnVaR1ZtYVc1bFpDa2dlMXh1SUNBZ0lDQWdJQ0J5WlhSMWNtNGdZM0psWVhSbFNYUmxjbUYwYjNKU1pYTjFiSFJQWW1wbFkzUW9kVzVrWldacGJtVmtMQ0IwY25WbEtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lIWmhjaUJ3YjNOcGRHbHZiaUE5SUc5YmRHOVFjbTl3WlhKMGVTaHpkSEpwYm1kSmRHVnlZWFJ2Y2s1bGVIUkpibVJsZUNsZE8xeHVJQ0FnSUNBZ2RtRnlJR3hsYmlBOUlITXViR1Z1WjNSb08xeHVJQ0FnSUNBZ2FXWWdLSEJ2YzJsMGFXOXVJRDQ5SUd4bGJpa2dlMXh1SUNBZ0lDQWdJQ0J2VzNSdlVISnZjR1Z5ZEhrb2FYUmxjbUYwWldSVGRISnBibWNwWFNBOUlIVnVaR1ZtYVc1bFpEdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHTnlaV0YwWlVsMFpYSmhkRzl5VW1WemRXeDBUMkpxWldOMEtIVnVaR1ZtYVc1bFpDd2dkSEoxWlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCMllYSWdabWx5YzNRZ1BTQnpMbU5vWVhKRGIyUmxRWFFvY0c5emFYUnBiMjRwTzF4dUlDQWdJQ0FnZG1GeUlISmxjM1ZzZEZOMGNtbHVaenRjYmlBZ0lDQWdJR2xtSUNobWFYSnpkQ0E4SURCNFJEZ3dNQ0I4ZkNCbWFYSnpkQ0ErSURCNFJFSkdSaUI4ZkNCd2IzTnBkR2x2YmlBcklERWdQVDA5SUd4bGJpa2dlMXh1SUNBZ0lDQWdJQ0J5WlhOMWJIUlRkSEpwYm1jZ1BTQlRkSEpwYm1jdVpuSnZiVU5vWVhKRGIyUmxLR1pwY25OMEtUdGNiaUFnSUNBZ0lIMGdaV3h6WlNCN1hHNGdJQ0FnSUNBZ0lIWmhjaUJ6WldOdmJtUWdQU0J6TG1Ob1lYSkRiMlJsUVhRb2NHOXphWFJwYjI0Z0t5QXhLVHRjYmlBZ0lDQWdJQ0FnYVdZZ0tITmxZMjl1WkNBOElEQjRSRU13TUNCOGZDQnpaV052Ym1RZ1BpQXdlRVJHUmtZcElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhOMWJIUlRkSEpwYm1jZ1BTQlRkSEpwYm1jdVpuSnZiVU5vWVhKRGIyUmxLR1pwY25OMEtUdGNiaUFnSUNBZ0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lDQWdJQ0J5WlhOMWJIUlRkSEpwYm1jZ1BTQlRkSEpwYm1jdVpuSnZiVU5vWVhKRGIyUmxLR1pwY25OMEtTQXJJRk4wY21sdVp5NW1jbTl0UTJoaGNrTnZaR1VvYzJWamIyNWtLVHRjYmlBZ0lDQWdJQ0FnZlZ4dUlDQWdJQ0FnZlZ4dUlDQWdJQ0FnYjF0MGIxQnliM0JsY25SNUtITjBjbWx1WjBsMFpYSmhkRzl5VG1WNGRFbHVaR1Y0S1YwZ1BTQndiM05wZEdsdmJpQXJJSEpsYzNWc2RGTjBjbWx1Wnk1c1pXNW5kR2c3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdZM0psWVhSbFNYUmxjbUYwYjNKU1pYTjFiSFJQWW1wbFkzUW9jbVZ6ZFd4MFUzUnlhVzVuTENCbVlXeHpaU2s3WEc0Z0lDQWdmU3hjYmlBZ0lDQmpiMjVtYVdkMWNtRmliR1U2SUhSeWRXVXNYRzRnSUNBZ1pXNTFiV1Z5WVdKc1pUb2dkSEoxWlN4Y2JpQWdJQ0IzY21sMFlXSnNaVG9nZEhKMVpWeHVJQ0I5S1N3Z1QySnFaV04wTG1SbFptbHVaVkJ5YjNCbGNuUjVLQ1JmWHpJc0lGTjViV0p2YkM1cGRHVnlZWFJ2Y2l3Z2UxeHVJQ0FnSUhaaGJIVmxPaUJtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsek8xeHVJQ0FnSUgwc1hHNGdJQ0FnWTI5dVptbG5kWEpoWW14bE9pQjBjblZsTEZ4dUlDQWdJR1Z1ZFcxbGNtRmliR1U2SUhSeWRXVXNYRzRnSUNBZ2QzSnBkR0ZpYkdVNklIUnlkV1ZjYmlBZ2ZTa3NJQ1JmWHpJcExDQjdmU2s3WEc0Z0lHWjFibU4wYVc5dUlHTnlaV0YwWlZOMGNtbHVaMGwwWlhKaGRHOXlLSE4wY21sdVp5a2dlMXh1SUNBZ0lIWmhjaUJ6SUQwZ1UzUnlhVzVuS0hOMGNtbHVaeWs3WEc0Z0lDQWdkbUZ5SUdsMFpYSmhkRzl5SUQwZ1QySnFaV04wTG1OeVpXRjBaU2hUZEhKcGJtZEpkR1Z5WVhSdmNpNXdjbTkwYjNSNWNHVXBPMXh1SUNBZ0lHbDBaWEpoZEc5eVczUnZVSEp2Y0dWeWRIa29hWFJsY21GMFpXUlRkSEpwYm1jcFhTQTlJSE03WEc0Z0lDQWdhWFJsY21GMGIzSmJkRzlRY205d1pYSjBlU2h6ZEhKcGJtZEpkR1Z5WVhSdmNrNWxlSFJKYm1SbGVDbGRJRDBnTUR0Y2JpQWdJQ0J5WlhSMWNtNGdhWFJsY21GMGIzSTdYRzRnSUgxY2JpQWdjbVYwZFhKdUlIdG5aWFFnWTNKbFlYUmxVM1J5YVc1blNYUmxjbUYwYjNJb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1kzSmxZWFJsVTNSeWFXNW5TWFJsY21GMGIzSTdYRzRnSUNBZ2ZYMDdYRzU5S1R0Y2JsTjVjM1JsYlM1eVpXZHBjM1JsY2sxdlpIVnNaU2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDFOMGNtbHVaeTVxYzF3aUxDQmJYU3dnWm5WdVkzUnBiMjRvS1NCN1hHNGdJRndpZFhObElITjBjbWxqZEZ3aU8xeHVJQ0IyWVhJZ1gxOXRiMlIxYkdWT1lXMWxJRDBnWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5VGRISnBibWN1YW5OY0lqdGNiaUFnZG1GeUlHTnlaV0YwWlZOMGNtbHVaMGwwWlhKaGRHOXlJRDBnVTNsemRHVnRMbWRsZENoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwxTjBjbWx1WjBsMFpYSmhkRzl5TG1welhDSXBMbU55WldGMFpWTjBjbWx1WjBsMFpYSmhkRzl5TzF4dUlDQjJZWElnSkY5Zk1TQTlJRk41YzNSbGJTNW5aWFFvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5MWRHbHNjeTVxYzF3aUtTeGNiaUFnSUNBZ0lHMWhlV0psUVdSa1JuVnVZM1JwYjI1eklEMGdKRjlmTVM1dFlYbGlaVUZrWkVaMWJtTjBhVzl1Y3l4Y2JpQWdJQ0FnSUcxaGVXSmxRV1JrU1hSbGNtRjBiM0lnUFNBa1gxOHhMbTFoZVdKbFFXUmtTWFJsY21GMGIzSXNYRzRnSUNBZ0lDQnlaV2RwYzNSbGNsQnZiSGxtYVd4c0lEMGdKRjlmTVM1eVpXZHBjM1JsY2xCdmJIbG1hV3hzTzF4dUlDQjJZWElnSkhSdlUzUnlhVzVuSUQwZ1QySnFaV04wTG5CeWIzUnZkSGx3WlM1MGIxTjBjbWx1Wnp0Y2JpQWdkbUZ5SUNScGJtUmxlRTltSUQwZ1UzUnlhVzVuTG5CeWIzUnZkSGx3WlM1cGJtUmxlRTltTzF4dUlDQjJZWElnSkd4aGMzUkpibVJsZUU5bUlEMGdVM1J5YVc1bkxuQnliM1J2ZEhsd1pTNXNZWE4wU1c1a1pYaFBaanRjYmlBZ1puVnVZM1JwYjI0Z2MzUmhjblJ6VjJsMGFDaHpaV0Z5WTJncElIdGNiaUFnSUNCMllYSWdjM1J5YVc1bklEMGdVM1J5YVc1bktIUm9hWE1wTzF4dUlDQWdJR2xtSUNoMGFHbHpJRDA5SUc1MWJHd2dmSHdnSkhSdlUzUnlhVzVuTG1OaGJHd29jMlZoY21Ob0tTQTlQU0FuVzI5aWFtVmpkQ0JTWldkRmVIQmRKeWtnZTF4dUlDQWdJQ0FnZEdoeWIzY2dWSGx3WlVWeWNtOXlLQ2s3WEc0Z0lDQWdmVnh1SUNBZ0lIWmhjaUJ6ZEhKcGJtZE1aVzVuZEdnZ1BTQnpkSEpwYm1jdWJHVnVaM1JvTzF4dUlDQWdJSFpoY2lCelpXRnlZMmhUZEhKcGJtY2dQU0JUZEhKcGJtY29jMlZoY21Ob0tUdGNiaUFnSUNCMllYSWdjMlZoY21Ob1RHVnVaM1JvSUQwZ2MyVmhjbU5vVTNSeWFXNW5MbXhsYm1kMGFEdGNiaUFnSUNCMllYSWdjRzl6YVhScGIyNGdQU0JoY21kMWJXVnVkSE11YkdWdVozUm9JRDRnTVNBL0lHRnlaM1Z0Wlc1MGMxc3hYU0E2SUhWdVpHVm1hVzVsWkR0Y2JpQWdJQ0IyWVhJZ2NHOXpJRDBnY0c5emFYUnBiMjRnUHlCT2RXMWlaWElvY0c5emFYUnBiMjRwSURvZ01EdGNiaUFnSUNCcFppQW9hWE5PWVU0b2NHOXpLU2tnZTF4dUlDQWdJQ0FnY0c5eklEMGdNRHRjYmlBZ0lDQjlYRzRnSUNBZ2RtRnlJSE4wWVhKMElEMGdUV0YwYUM1dGFXNG9UV0YwYUM1dFlYZ29jRzl6TENBd0tTd2djM1J5YVc1blRHVnVaM1JvS1R0Y2JpQWdJQ0J5WlhSMWNtNGdKR2x1WkdWNFQyWXVZMkZzYkNoemRISnBibWNzSUhObFlYSmphRk4wY21sdVp5d2djRzl6S1NBOVBTQnpkR0Z5ZER0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCbGJtUnpWMmwwYUNoelpXRnlZMmdwSUh0Y2JpQWdJQ0IyWVhJZ2MzUnlhVzVuSUQwZ1UzUnlhVzVuS0hSb2FYTXBPMXh1SUNBZ0lHbG1JQ2gwYUdseklEMDlJRzUxYkd3Z2ZId2dKSFJ2VTNSeWFXNW5MbU5oYkd3b2MyVmhjbU5vS1NBOVBTQW5XMjlpYW1WamRDQlNaV2RGZUhCZEp5a2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ1ZIbHdaVVZ5Y205eUtDazdYRzRnSUNBZ2ZWeHVJQ0FnSUhaaGNpQnpkSEpwYm1kTVpXNW5kR2dnUFNCemRISnBibWN1YkdWdVozUm9PMXh1SUNBZ0lIWmhjaUJ6WldGeVkyaFRkSEpwYm1jZ1BTQlRkSEpwYm1jb2MyVmhjbU5vS1R0Y2JpQWdJQ0IyWVhJZ2MyVmhjbU5vVEdWdVozUm9JRDBnYzJWaGNtTm9VM1J5YVc1bkxteGxibWQwYUR0Y2JpQWdJQ0IyWVhJZ2NHOXpJRDBnYzNSeWFXNW5UR1Z1WjNSb08xeHVJQ0FnSUdsbUlDaGhjbWQxYldWdWRITXViR1Z1WjNSb0lENGdNU2tnZTF4dUlDQWdJQ0FnZG1GeUlIQnZjMmwwYVc5dUlEMGdZWEpuZFcxbGJuUnpXekZkTzF4dUlDQWdJQ0FnYVdZZ0tIQnZjMmwwYVc5dUlDRTlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUNBZ2NHOXpJRDBnY0c5emFYUnBiMjRnUHlCT2RXMWlaWElvY0c5emFYUnBiMjRwSURvZ01EdGNiaUFnSUNBZ0lDQWdhV1lnS0dselRtRk9LSEJ2Y3lrcElIdGNiaUFnSUNBZ0lDQWdJQ0J3YjNNZ1BTQXdPMXh1SUNBZ0lDQWdJQ0I5WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdmVnh1SUNBZ0lIWmhjaUJsYm1RZ1BTQk5ZWFJvTG0xcGJpaE5ZWFJvTG0xaGVDaHdiM01zSURBcExDQnpkSEpwYm1kTVpXNW5kR2dwTzF4dUlDQWdJSFpoY2lCemRHRnlkQ0E5SUdWdVpDQXRJSE5sWVhKamFFeGxibWQwYUR0Y2JpQWdJQ0JwWmlBb2MzUmhjblFnUENBd0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z1ptRnNjMlU3WEc0Z0lDQWdmVnh1SUNBZ0lISmxkSFZ5YmlBa2JHRnpkRWx1WkdWNFQyWXVZMkZzYkNoemRISnBibWNzSUhObFlYSmphRk4wY21sdVp5d2djM1JoY25RcElEMDlJSE4wWVhKME8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHbHVZMngxWkdWektITmxZWEpqYUNrZ2UxeHVJQ0FnSUdsbUlDaDBhR2x6SUQwOUlHNTFiR3dwSUh0Y2JpQWdJQ0FnSUhSb2NtOTNJRlI1Y0dWRmNuSnZjaWdwTzF4dUlDQWdJSDFjYmlBZ0lDQjJZWElnYzNSeWFXNW5JRDBnVTNSeWFXNW5LSFJvYVhNcE8xeHVJQ0FnSUdsbUlDaHpaV0Z5WTJnZ0ppWWdKSFJ2VTNSeWFXNW5MbU5oYkd3b2MyVmhjbU5vS1NBOVBTQW5XMjlpYW1WamRDQlNaV2RGZUhCZEp5a2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ1ZIbHdaVVZ5Y205eUtDazdYRzRnSUNBZ2ZWeHVJQ0FnSUhaaGNpQnpkSEpwYm1kTVpXNW5kR2dnUFNCemRISnBibWN1YkdWdVozUm9PMXh1SUNBZ0lIWmhjaUJ6WldGeVkyaFRkSEpwYm1jZ1BTQlRkSEpwYm1jb2MyVmhjbU5vS1R0Y2JpQWdJQ0IyWVhJZ2MyVmhjbU5vVEdWdVozUm9JRDBnYzJWaGNtTm9VM1J5YVc1bkxteGxibWQwYUR0Y2JpQWdJQ0IyWVhJZ2NHOXphWFJwYjI0Z1BTQmhjbWQxYldWdWRITXViR1Z1WjNSb0lENGdNU0EvSUdGeVozVnRaVzUwYzFzeFhTQTZJSFZ1WkdWbWFXNWxaRHRjYmlBZ0lDQjJZWElnY0c5eklEMGdjRzl6YVhScGIyNGdQeUJPZFcxaVpYSW9jRzl6YVhScGIyNHBJRG9nTUR0Y2JpQWdJQ0JwWmlBb2NHOXpJQ0U5SUhCdmN5a2dlMXh1SUNBZ0lDQWdjRzl6SUQwZ01EdGNiaUFnSUNCOVhHNGdJQ0FnZG1GeUlITjBZWEowSUQwZ1RXRjBhQzV0YVc0b1RXRjBhQzV0WVhnb2NHOXpMQ0F3S1N3Z2MzUnlhVzVuVEdWdVozUm9LVHRjYmlBZ0lDQnBaaUFvYzJWaGNtTm9UR1Z1WjNSb0lDc2djM1JoY25RZ1BpQnpkSEpwYm1kTVpXNW5kR2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJtWVd4elpUdGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJQ1JwYm1SbGVFOW1MbU5oYkd3b2MzUnlhVzVuTENCelpXRnlZMmhUZEhKcGJtY3NJSEJ2Y3lrZ0lUMGdMVEU3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY21Wd1pXRjBLR052ZFc1MEtTQjdYRzRnSUNBZ2FXWWdLSFJvYVhNZ1BUMGdiblZzYkNrZ2UxeHVJQ0FnSUNBZ2RHaHliM2NnVkhsd1pVVnljbTl5S0NrN1hHNGdJQ0FnZlZ4dUlDQWdJSFpoY2lCemRISnBibWNnUFNCVGRISnBibWNvZEdocGN5azdYRzRnSUNBZ2RtRnlJRzRnUFNCamIzVnVkQ0EvSUU1MWJXSmxjaWhqYjNWdWRDa2dPaUF3TzF4dUlDQWdJR2xtSUNocGMwNWhUaWh1S1NrZ2UxeHVJQ0FnSUNBZ2JpQTlJREE3WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2h1SUR3Z01DQjhmQ0J1SUQwOUlFbHVabWx1YVhSNUtTQjdYRzRnSUNBZ0lDQjBhSEp2ZHlCU1lXNW5aVVZ5Y205eUtDazdYRzRnSUNBZ2ZWeHVJQ0FnSUdsbUlDaHVJRDA5SURBcElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlBbkp6dGNiaUFnSUNCOVhHNGdJQ0FnZG1GeUlISmxjM1ZzZENBOUlDY25PMXh1SUNBZ0lIZG9hV3hsSUNodUxTMHBJSHRjYmlBZ0lDQWdJSEpsYzNWc2RDQXJQU0J6ZEhKcGJtYzdYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ5WlhOMWJIUTdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdZMjlrWlZCdmFXNTBRWFFvY0c5emFYUnBiMjRwSUh0Y2JpQWdJQ0JwWmlBb2RHaHBjeUE5UFNCdWRXeHNLU0I3WEc0Z0lDQWdJQ0IwYUhKdmR5QlVlWEJsUlhKeWIzSW9LVHRjYmlBZ0lDQjlYRzRnSUNBZ2RtRnlJSE4wY21sdVp5QTlJRk4wY21sdVp5aDBhR2x6S1R0Y2JpQWdJQ0IyWVhJZ2MybDZaU0E5SUhOMGNtbHVaeTVzWlc1bmRHZzdYRzRnSUNBZ2RtRnlJR2x1WkdWNElEMGdjRzl6YVhScGIyNGdQeUJPZFcxaVpYSW9jRzl6YVhScGIyNHBJRG9nTUR0Y2JpQWdJQ0JwWmlBb2FYTk9ZVTRvYVc1a1pYZ3BLU0I3WEc0Z0lDQWdJQ0JwYm1SbGVDQTlJREE3WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2hwYm1SbGVDQThJREFnZkh3Z2FXNWtaWGdnUGowZ2MybDZaU2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSFZ1WkdWbWFXNWxaRHRjYmlBZ0lDQjlYRzRnSUNBZ2RtRnlJR1pwY25OMElEMGdjM1J5YVc1bkxtTm9ZWEpEYjJSbFFYUW9hVzVrWlhncE8xeHVJQ0FnSUhaaGNpQnpaV052Ym1RN1hHNGdJQ0FnYVdZZ0tHWnBjbk4wSUQ0OUlEQjRSRGd3TUNBbUppQm1hWEp6ZENBOFBTQXdlRVJDUmtZZ0ppWWdjMmw2WlNBK0lHbHVaR1Y0SUNzZ01Ta2dlMXh1SUNBZ0lDQWdjMlZqYjI1a0lEMGdjM1J5YVc1bkxtTm9ZWEpEYjJSbFFYUW9hVzVrWlhnZ0t5QXhLVHRjYmlBZ0lDQWdJR2xtSUNoelpXTnZibVFnUGowZ01IaEVRekF3SUNZbUlITmxZMjl1WkNBOFBTQXdlRVJHUmtZcElIdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlDaG1hWEp6ZENBdElEQjRSRGd3TUNrZ0tpQXdlRFF3TUNBcklITmxZMjl1WkNBdElEQjRSRU13TUNBcklEQjRNVEF3TURBN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlZ4dUlDQWdJSEpsZEhWeWJpQm1hWEp6ZER0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCeVlYY29ZMkZzYkhOcGRHVXBJSHRjYmlBZ0lDQjJZWElnY21GM0lEMGdZMkZzYkhOcGRHVXVjbUYzTzF4dUlDQWdJSFpoY2lCc1pXNGdQU0J5WVhjdWJHVnVaM1JvSUQ0K1BpQXdPMXh1SUNBZ0lHbG1JQ2hzWlc0Z1BUMDlJREFwWEc0Z0lDQWdJQ0J5WlhSMWNtNGdKeWM3WEc0Z0lDQWdkbUZ5SUhNZ1BTQW5KenRjYmlBZ0lDQjJZWElnYVNBOUlEQTdYRzRnSUNBZ2QyaHBiR1VnS0hSeWRXVXBJSHRjYmlBZ0lDQWdJSE1nS3owZ2NtRjNXMmxkTzF4dUlDQWdJQ0FnYVdZZ0tHa2dLeUF4SUQwOVBTQnNaVzRwWEc0Z0lDQWdJQ0FnSUhKbGRIVnliaUJ6TzF4dUlDQWdJQ0FnY3lBclBTQmhjbWQxYldWdWRITmJLeXRwWFR0Y2JpQWdJQ0I5WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnWm5KdmJVTnZaR1ZRYjJsdWRDZ3BJSHRjYmlBZ0lDQjJZWElnWTI5a1pWVnVhWFJ6SUQwZ1cxMDdYRzRnSUNBZ2RtRnlJR1pzYjI5eUlEMGdUV0YwYUM1bWJHOXZjanRjYmlBZ0lDQjJZWElnYUdsbmFGTjFjbkp2WjJGMFpUdGNiaUFnSUNCMllYSWdiRzkzVTNWeWNtOW5ZWFJsTzF4dUlDQWdJSFpoY2lCcGJtUmxlQ0E5SUMweE8xeHVJQ0FnSUhaaGNpQnNaVzVuZEdnZ1BTQmhjbWQxYldWdWRITXViR1Z1WjNSb08xeHVJQ0FnSUdsbUlDZ2hiR1Z1WjNSb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z0p5YzdYRzRnSUNBZ2ZWeHVJQ0FnSUhkb2FXeGxJQ2dySzJsdVpHVjRJRHdnYkdWdVozUm9LU0I3WEc0Z0lDQWdJQ0IyWVhJZ1kyOWtaVkJ2YVc1MElEMGdUblZ0WW1WeUtHRnlaM1Z0Wlc1MGMxdHBibVJsZUYwcE8xeHVJQ0FnSUNBZ2FXWWdLQ0ZwYzBacGJtbDBaU2hqYjJSbFVHOXBiblFwSUh4OElHTnZaR1ZRYjJsdWRDQThJREFnZkh3Z1kyOWtaVkJ2YVc1MElENGdNSGd4TUVaR1JrWWdmSHdnWm14dmIzSW9ZMjlrWlZCdmFXNTBLU0FoUFNCamIyUmxVRzlwYm5RcElIdGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ1VtRnVaMlZGY25KdmNpZ25TVzUyWVd4cFpDQmpiMlJsSUhCdmFXNTBPaUFuSUNzZ1kyOWtaVkJ2YVc1MEtUdGNiaUFnSUNBZ0lIMWNiaUFnSUNBZ0lHbG1JQ2hqYjJSbFVHOXBiblFnUEQwZ01IaEdSa1pHS1NCN1hHNGdJQ0FnSUNBZ0lHTnZaR1ZWYm1sMGN5NXdkWE5vS0dOdlpHVlFiMmx1ZENrN1hHNGdJQ0FnSUNCOUlHVnNjMlVnZTF4dUlDQWdJQ0FnSUNCamIyUmxVRzlwYm5RZ0xUMGdNSGd4TURBd01EdGNiaUFnSUNBZ0lDQWdhR2xuYUZOMWNuSnZaMkYwWlNBOUlDaGpiMlJsVUc5cGJuUWdQajRnTVRBcElDc2dNSGhFT0RBd08xeHVJQ0FnSUNBZ0lDQnNiM2RUZFhKeWIyZGhkR1VnUFNBb1kyOWtaVkJ2YVc1MElDVWdNSGcwTURBcElDc2dNSGhFUXpBd08xeHVJQ0FnSUNBZ0lDQmpiMlJsVlc1cGRITXVjSFZ6YUNob2FXZG9VM1Z5Y205bllYUmxMQ0JzYjNkVGRYSnliMmRoZEdVcE8xeHVJQ0FnSUNBZ2ZWeHVJQ0FnSUgxY2JpQWdJQ0J5WlhSMWNtNGdVM1J5YVc1bkxtWnliMjFEYUdGeVEyOWtaUzVoY0hCc2VTaHVkV3hzTENCamIyUmxWVzVwZEhNcE8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlITjBjbWx1WjFCeWIzUnZkSGx3WlVsMFpYSmhkRzl5S0NrZ2UxeHVJQ0FnSUhaaGNpQnZJRDBnSkhSeVlXTmxkWEpTZFc1MGFXMWxMbU5vWldOclQySnFaV04wUTI5bGNtTnBZbXhsS0hSb2FYTXBPMXh1SUNBZ0lIWmhjaUJ6SUQwZ1UzUnlhVzVuS0c4cE8xeHVJQ0FnSUhKbGRIVnliaUJqY21WaGRHVlRkSEpwYm1kSmRHVnlZWFJ2Y2loektUdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQndiMng1Wm1sc2JGTjBjbWx1WnlobmJHOWlZV3dwSUh0Y2JpQWdJQ0IyWVhJZ1UzUnlhVzVuSUQwZ1oyeHZZbUZzTGxOMGNtbHVaenRjYmlBZ0lDQnRZWGxpWlVGa1pFWjFibU4wYVc5dWN5aFRkSEpwYm1jdWNISnZkRzkwZVhCbExDQmJKMk52WkdWUWIybHVkRUYwSnl3Z1kyOWtaVkJ2YVc1MFFYUXNJQ2RsYm1SelYybDBhQ2NzSUdWdVpITlhhWFJvTENBbmFXNWpiSFZrWlhNbkxDQnBibU5zZFdSbGN5d2dKM0psY0dWaGRDY3NJSEpsY0dWaGRDd2dKM04wWVhKMGMxZHBkR2duTENCemRHRnlkSE5YYVhSb1hTazdYRzRnSUNBZ2JXRjVZbVZCWkdSR2RXNWpkR2x2Ym5Nb1UzUnlhVzVuTENCYkoyWnliMjFEYjJSbFVHOXBiblFuTENCbWNtOXRRMjlrWlZCdmFXNTBMQ0FuY21GM0p5d2djbUYzWFNrN1hHNGdJQ0FnYldGNVltVkJaR1JKZEdWeVlYUnZjaWhUZEhKcGJtY3VjSEp2ZEc5MGVYQmxMQ0J6ZEhKcGJtZFFjbTkwYjNSNWNHVkpkR1Z5WVhSdmNpd2dVM2x0WW05c0tUdGNiaUFnZlZ4dUlDQnlaV2RwYzNSbGNsQnZiSGxtYVd4c0tIQnZiSGxtYVd4c1UzUnlhVzVuS1R0Y2JpQWdjbVYwZFhKdUlIdGNiaUFnSUNCblpYUWdjM1JoY25SelYybDBhQ2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ6ZEdGeWRITlhhWFJvTzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUdWdVpITlhhWFJvS0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdWdVpITlhhWFJvTzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUdsdVkyeDFaR1Z6S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdsdVkyeDFaR1Z6TzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUhKbGNHVmhkQ2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ5WlhCbFlYUTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdZMjlrWlZCdmFXNTBRWFFvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWTI5a1pWQnZhVzUwUVhRN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2NtRjNLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJSEpoZHp0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCbWNtOXRRMjlrWlZCdmFXNTBLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR1p5YjIxRGIyUmxVRzlwYm5RN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2MzUnlhVzVuVUhKdmRHOTBlWEJsU1hSbGNtRjBiM0lvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYzNSeWFXNW5VSEp2ZEc5MGVYQmxTWFJsY21GMGIzSTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdjRzlzZVdacGJHeFRkSEpwYm1jb0tTQjdYRzRnSUNBZ0lDQnlaWFIxY200Z2NHOXNlV1pwYkd4VGRISnBibWM3WEc0Z0lDQWdmVnh1SUNCOU8xeHVmU2s3WEc1VGVYTjBaVzB1WjJWMEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZVM1J5YVc1bkxtcHpYQ0lnS3lBbkp5azdYRzVUZVhOMFpXMHVjbVZuYVhOMFpYSk5iMlIxYkdVb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OUJjbkpoZVVsMFpYSmhkRzl5TG1welhDSXNJRnRkTENCbWRXNWpkR2x2YmlncElIdGNiaUFnWENKMWMyVWdjM1J5YVdOMFhDSTdYRzRnSUhaaGNpQWtYMTh5TzF4dUlDQjJZWElnWDE5dGIyUjFiR1ZPWVcxbElEMGdYQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlCY25KaGVVbDBaWEpoZEc5eUxtcHpYQ0k3WEc0Z0lIWmhjaUFrWDE4d0lEMGdVM2x6ZEdWdExtZGxkQ2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDNWMGFXeHpMbXB6WENJcExGeHVJQ0FnSUNBZ2RHOVBZbXBsWTNRZ1BTQWtYMTh3TG5SdlQySnFaV04wTEZ4dUlDQWdJQ0FnZEc5VmFXNTBNeklnUFNBa1gxOHdMblJ2VldsdWRETXlMRnh1SUNBZ0lDQWdZM0psWVhSbFNYUmxjbUYwYjNKU1pYTjFiSFJQWW1wbFkzUWdQU0FrWDE4d0xtTnlaV0YwWlVsMFpYSmhkRzl5VW1WemRXeDBUMkpxWldOME8xeHVJQ0IyWVhJZ1FWSlNRVmxmU1ZSRlVrRlVUMUpmUzBsT1JGOUxSVmxUSUQwZ01UdGNiaUFnZG1GeUlFRlNVa0ZaWDBsVVJWSkJWRTlTWDB0SlRrUmZWa0ZNVlVWVElEMGdNanRjYmlBZ2RtRnlJRUZTVWtGWlgwbFVSVkpCVkU5U1gwdEpUa1JmUlU1VVVrbEZVeUE5SURNN1hHNGdJSFpoY2lCQmNuSmhlVWwwWlhKaGRHOXlJRDBnWm5WdVkzUnBiMjRnUVhKeVlYbEpkR1Z5WVhSdmNpZ3BJSHQ5TzF4dUlDQW9KSFJ5WVdObGRYSlNkVzUwYVcxbExtTnlaV0YwWlVOc1lYTnpLU2hCY25KaGVVbDBaWEpoZEc5eUxDQW9KRjlmTWlBOUlIdDlMQ0JQWW1wbFkzUXVaR1ZtYVc1bFVISnZjR1Z5ZEhrb0pGOWZNaXdnWENKdVpYaDBYQ0lzSUh0Y2JpQWdJQ0IyWVd4MVpUb2dablZ1WTNScGIyNG9LU0I3WEc0Z0lDQWdJQ0IyWVhJZ2FYUmxjbUYwYjNJZ1BTQjBiMDlpYW1WamRDaDBhR2x6S1R0Y2JpQWdJQ0FnSUhaaGNpQmhjbkpoZVNBOUlHbDBaWEpoZEc5eUxtbDBaWEpoZEc5eVQySnFaV04wWHp0Y2JpQWdJQ0FnSUdsbUlDZ2hZWEp5WVhrcElIdGNiaUFnSUNBZ0lDQWdkR2h5YjNjZ2JtVjNJRlI1Y0dWRmNuSnZjaWduVDJKcVpXTjBJR2x6SUc1dmRDQmhiaUJCY25KaGVVbDBaWEpoZEc5eUp5azdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQjJZWElnYVc1a1pYZ2dQU0JwZEdWeVlYUnZjaTVoY25KaGVVbDBaWEpoZEc5eVRtVjRkRWx1WkdWNFh6dGNiaUFnSUNBZ0lIWmhjaUJwZEdWdFMybHVaQ0E5SUdsMFpYSmhkRzl5TG1GeWNtRjVTWFJsY21GMGFXOXVTMmx1WkY4N1hHNGdJQ0FnSUNCMllYSWdiR1Z1WjNSb0lEMGdkRzlWYVc1ME16SW9ZWEp5WVhrdWJHVnVaM1JvS1R0Y2JpQWdJQ0FnSUdsbUlDaHBibVJsZUNBK1BTQnNaVzVuZEdncElIdGNiaUFnSUNBZ0lDQWdhWFJsY21GMGIzSXVZWEp5WVhsSmRHVnlZWFJ2Y2s1bGVIUkpibVJsZUY4Z1BTQkpibVpwYm1sMGVUdGNiaUFnSUNBZ0lDQWdjbVYwZFhKdUlHTnlaV0YwWlVsMFpYSmhkRzl5VW1WemRXeDBUMkpxWldOMEtIVnVaR1ZtYVc1bFpDd2dkSEoxWlNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnSUNCcGRHVnlZWFJ2Y2k1aGNuSmhlVWwwWlhKaGRHOXlUbVY0ZEVsdVpHVjRYeUE5SUdsdVpHVjRJQ3NnTVR0Y2JpQWdJQ0FnSUdsbUlDaHBkR1Z0UzJsdVpDQTlQU0JCVWxKQldWOUpWRVZTUVZSUFVsOUxTVTVFWDFaQlRGVkZVeWxjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR055WldGMFpVbDBaWEpoZEc5eVVtVnpkV3gwVDJKcVpXTjBLR0Z5Y21GNVcybHVaR1Y0WFN3Z1ptRnNjMlVwTzF4dUlDQWdJQ0FnYVdZZ0tHbDBaVzFMYVc1a0lEMDlJRUZTVWtGWlgwbFVSVkpCVkU5U1gwdEpUa1JmUlU1VVVrbEZVeWxjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR055WldGMFpVbDBaWEpoZEc5eVVtVnpkV3gwVDJKcVpXTjBLRnRwYm1SbGVDd2dZWEp5WVhsYmFXNWtaWGhkWFN3Z1ptRnNjMlVwTzF4dUlDQWdJQ0FnY21WMGRYSnVJR055WldGMFpVbDBaWEpoZEc5eVVtVnpkV3gwVDJKcVpXTjBLR2x1WkdWNExDQm1ZV3h6WlNrN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JqYjI1bWFXZDFjbUZpYkdVNklIUnlkV1VzWEc0Z0lDQWdaVzUxYldWeVlXSnNaVG9nZEhKMVpTeGNiaUFnSUNCM2NtbDBZV0pzWlRvZ2RISjFaVnh1SUNCOUtTd2dUMkpxWldOMExtUmxabWx1WlZCeWIzQmxjblI1S0NSZlh6SXNJRk41YldKdmJDNXBkR1Z5WVhSdmNpd2dlMXh1SUNBZ0lIWmhiSFZsT2lCbWRXNWpkR2x2YmlncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCMGFHbHpPMXh1SUNBZ0lIMHNYRzRnSUNBZ1kyOXVabWxuZFhKaFlteGxPaUIwY25WbExGeHVJQ0FnSUdWdWRXMWxjbUZpYkdVNklIUnlkV1VzWEc0Z0lDQWdkM0pwZEdGaWJHVTZJSFJ5ZFdWY2JpQWdmU2tzSUNSZlh6SXBMQ0I3ZlNrN1hHNGdJR1oxYm1OMGFXOXVJR055WldGMFpVRnljbUY1U1hSbGNtRjBiM0lvWVhKeVlYa3NJR3RwYm1RcElIdGNiaUFnSUNCMllYSWdiMkpxWldOMElEMGdkRzlQWW1wbFkzUW9ZWEp5WVhrcE8xeHVJQ0FnSUhaaGNpQnBkR1Z5WVhSdmNpQTlJRzVsZHlCQmNuSmhlVWwwWlhKaGRHOXlPMXh1SUNBZ0lHbDBaWEpoZEc5eUxtbDBaWEpoZEc5eVQySnFaV04wWHlBOUlHOWlhbVZqZER0Y2JpQWdJQ0JwZEdWeVlYUnZjaTVoY25KaGVVbDBaWEpoZEc5eVRtVjRkRWx1WkdWNFh5QTlJREE3WEc0Z0lDQWdhWFJsY21GMGIzSXVZWEp5WVhsSmRHVnlZWFJwYjI1TGFXNWtYeUE5SUd0cGJtUTdYRzRnSUNBZ2NtVjBkWEp1SUdsMFpYSmhkRzl5TzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUdWdWRISnBaWE1vS1NCN1hHNGdJQ0FnY21WMGRYSnVJR055WldGMFpVRnljbUY1U1hSbGNtRjBiM0lvZEdocGN5d2dRVkpTUVZsZlNWUkZVa0ZVVDFKZlMwbE9SRjlGVGxSU1NVVlRLVHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJyWlhsektDa2dlMXh1SUNBZ0lISmxkSFZ5YmlCamNtVmhkR1ZCY25KaGVVbDBaWEpoZEc5eUtIUm9hWE1zSUVGU1VrRlpYMGxVUlZKQlZFOVNYMHRKVGtSZlMwVlpVeWs3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnZG1Gc2RXVnpLQ2tnZTF4dUlDQWdJSEpsZEhWeWJpQmpjbVZoZEdWQmNuSmhlVWwwWlhKaGRHOXlLSFJvYVhNc0lFRlNVa0ZaWDBsVVJWSkJWRTlTWDB0SlRrUmZWa0ZNVlVWVEtUdGNiaUFnZlZ4dUlDQnlaWFIxY200Z2UxeHVJQ0FnSUdkbGRDQmxiblJ5YVdWektDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHVnVkSEpwWlhNN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2EyVjVjeWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJyWlhsek8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElIWmhiSFZsY3lncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCMllXeDFaWE03WEc0Z0lDQWdmVnh1SUNCOU8xeHVmU2s3WEc1VGVYTjBaVzB1Y21WbmFYTjBaWEpOYjJSMWJHVW9YQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlCY25KaGVTNXFjMXdpTENCYlhTd2dablZ1WTNScGIyNG9LU0I3WEc0Z0lGd2lkWE5sSUhOMGNtbGpkRndpTzF4dUlDQjJZWElnWDE5dGIyUjFiR1ZPWVcxbElEMGdYQ0owY21GalpYVnlMWEoxYm5ScGJXVkFNQzR3TGpjNUwzTnlZeTl5ZFc1MGFXMWxMM0J2YkhsbWFXeHNjeTlCY25KaGVTNXFjMXdpTzF4dUlDQjJZWElnSkY5Zk1DQTlJRk41YzNSbGJTNW5aWFFvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5QmNuSmhlVWwwWlhKaGRHOXlMbXB6WENJcExGeHVJQ0FnSUNBZ1pXNTBjbWxsY3lBOUlDUmZYekF1Wlc1MGNtbGxjeXhjYmlBZ0lDQWdJR3RsZVhNZ1BTQWtYMTh3TG10bGVYTXNYRzRnSUNBZ0lDQjJZV3gxWlhNZ1BTQWtYMTh3TG5aaGJIVmxjenRjYmlBZ2RtRnlJQ1JmWHpFZ1BTQlRlWE4wWlcwdVoyVjBLRndpZEhKaFkyVjFjaTF5ZFc1MGFXMWxRREF1TUM0M09TOXpjbU12Y25WdWRHbHRaUzl3YjJ4NVptbHNiSE12ZFhScGJITXVhbk5jSWlrc1hHNGdJQ0FnSUNCamFHVmphMGwwWlhKaFlteGxJRDBnSkY5Zk1TNWphR1ZqYTBsMFpYSmhZbXhsTEZ4dUlDQWdJQ0FnYVhORFlXeHNZV0pzWlNBOUlDUmZYekV1YVhORFlXeHNZV0pzWlN4Y2JpQWdJQ0FnSUdselEyOXVjM1J5ZFdOMGIzSWdQU0FrWDE4eExtbHpRMjl1YzNSeWRXTjBiM0lzWEc0Z0lDQWdJQ0J0WVhsaVpVRmtaRVoxYm1OMGFXOXVjeUE5SUNSZlh6RXViV0Y1WW1WQlpHUkdkVzVqZEdsdmJuTXNYRzRnSUNBZ0lDQnRZWGxpWlVGa1pFbDBaWEpoZEc5eUlEMGdKRjlmTVM1dFlYbGlaVUZrWkVsMFpYSmhkRzl5TEZ4dUlDQWdJQ0FnY21WbmFYTjBaWEpRYjJ4NVptbHNiQ0E5SUNSZlh6RXVjbVZuYVhOMFpYSlFiMng1Wm1sc2JDeGNiaUFnSUNBZ0lIUnZTVzUwWldkbGNpQTlJQ1JmWHpFdWRHOUpiblJsWjJWeUxGeHVJQ0FnSUNBZ2RHOU1aVzVuZEdnZ1BTQWtYMTh4TG5SdlRHVnVaM1JvTEZ4dUlDQWdJQ0FnZEc5UFltcGxZM1FnUFNBa1gxOHhMblJ2VDJKcVpXTjBPMXh1SUNCbWRXNWpkR2x2YmlCbWNtOXRLR0Z5Y2t4cGEyVXBJSHRjYmlBZ0lDQjJZWElnYldGd1JtNGdQU0JoY21kMWJXVnVkSE5iTVYwN1hHNGdJQ0FnZG1GeUlIUm9hWE5CY21jZ1BTQmhjbWQxYldWdWRITmJNbDA3WEc0Z0lDQWdkbUZ5SUVNZ1BTQjBhR2x6TzF4dUlDQWdJSFpoY2lCcGRHVnRjeUE5SUhSdlQySnFaV04wS0dGeWNreHBhMlVwTzF4dUlDQWdJSFpoY2lCdFlYQndhVzVuSUQwZ2JXRndSbTRnSVQwOUlIVnVaR1ZtYVc1bFpEdGNiaUFnSUNCMllYSWdheUE5SURBN1hHNGdJQ0FnZG1GeUlHRnljaXhjYmlBZ0lDQWdJQ0FnYkdWdU8xeHVJQ0FnSUdsbUlDaHRZWEJ3YVc1bklDWW1JQ0ZwYzBOaGJHeGhZbXhsS0cxaGNFWnVLU2tnZTF4dUlDQWdJQ0FnZEdoeWIzY2dWSGx3WlVWeWNtOXlLQ2s3WEc0Z0lDQWdmVnh1SUNBZ0lHbG1JQ2hqYUdWamEwbDBaWEpoWW14bEtHbDBaVzF6S1NrZ2UxeHVJQ0FnSUNBZ1lYSnlJRDBnYVhORGIyNXpkSEoxWTNSdmNpaERLU0EvSUc1bGR5QkRLQ2tnT2lCYlhUdGNiaUFnSUNBZ0lHWnZjaUFvZG1GeUlDUmZYeklnUFNCcGRHVnRjMXNrZEhKaFkyVjFjbEoxYm5ScGJXVXVkRzlRY205d1pYSjBlU2hUZVcxaWIyd3VhWFJsY21GMGIzSXBYU2dwTEZ4dUlDQWdJQ0FnSUNBZ0lDUmZYek03SUNFb0pGOWZNeUE5SUNSZlh6SXVibVY0ZENncEtTNWtiMjVsT3lBcElIdGNiaUFnSUNBZ0lDQWdkbUZ5SUdsMFpXMGdQU0FrWDE4ekxuWmhiSFZsTzF4dUlDQWdJQ0FnSUNCN1hHNGdJQ0FnSUNBZ0lDQWdhV1lnS0cxaGNIQnBibWNwSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR0Z5Y2x0clhTQTlJRzFoY0VadUxtTmhiR3dvZEdocGMwRnlaeXdnYVhSbGJTd2dheWs3WEc0Z0lDQWdJQ0FnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUNBZ0lDQWdJR0Z5Y2x0clhTQTlJR2wwWlcwN1hHNGdJQ0FnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0FnSUdzckt6dGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdmVnh1SUNBZ0lDQWdZWEp5TG14bGJtZDBhQ0E5SUdzN1hHNGdJQ0FnSUNCeVpYUjFjbTRnWVhKeU8xeHVJQ0FnSUgxY2JpQWdJQ0JzWlc0Z1BTQjBiMHhsYm1kMGFDaHBkR1Z0Y3k1c1pXNW5kR2dwTzF4dUlDQWdJR0Z5Y2lBOUlHbHpRMjl1YzNSeWRXTjBiM0lvUXlrZ1B5QnVaWGNnUXloc1pXNHBJRG9nYm1WM0lFRnljbUY1S0d4bGJpazdYRzRnSUNBZ1ptOXlJQ2c3SUdzZ1BDQnNaVzQ3SUdzckt5a2dlMXh1SUNBZ0lDQWdhV1lnS0cxaGNIQnBibWNwSUh0Y2JpQWdJQ0FnSUNBZ1lYSnlXMnRkSUQwZ2RIbHdaVzltSUhSb2FYTkJjbWNnUFQwOUlDZDFibVJsWm1sdVpXUW5JRDhnYldGd1JtNG9hWFJsYlhOYmExMHNJR3NwSURvZ2JXRndSbTR1WTJGc2JDaDBhR2x6UVhKbkxDQnBkR1Z0YzF0clhTd2dheWs3WEc0Z0lDQWdJQ0I5SUdWc2MyVWdlMXh1SUNBZ0lDQWdJQ0JoY25KYmExMGdQU0JwZEdWdGMxdHJYVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzRnSUNBZ1lYSnlMbXhsYm1kMGFDQTlJR3hsYmp0Y2JpQWdJQ0J5WlhSMWNtNGdZWEp5TzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUc5bUtDa2dlMXh1SUNBZ0lHWnZjaUFvZG1GeUlHbDBaVzF6SUQwZ1cxMHNYRzRnSUNBZ0lDQWdJQ1JmWHpRZ1BTQXdPeUFrWDE4MElEd2dZWEpuZFcxbGJuUnpMbXhsYm1kMGFEc2dKRjlmTkNzcktWeHVJQ0FnSUNBZ2FYUmxiWE5iSkY5Zk5GMGdQU0JoY21kMWJXVnVkSE5iSkY5Zk5GMDdYRzRnSUNBZ2RtRnlJRU1nUFNCMGFHbHpPMXh1SUNBZ0lIWmhjaUJzWlc0Z1BTQnBkR1Z0Y3k1c1pXNW5kR2c3WEc0Z0lDQWdkbUZ5SUdGeWNpQTlJR2x6UTI5dWMzUnlkV04wYjNJb1F5a2dQeUJ1WlhjZ1F5aHNaVzRwSURvZ2JtVjNJRUZ5Y21GNUtHeGxiaWs3WEc0Z0lDQWdabTl5SUNoMllYSWdheUE5SURBN0lHc2dQQ0JzWlc0N0lHc3JLeWtnZTF4dUlDQWdJQ0FnWVhKeVcydGRJRDBnYVhSbGJYTmJhMTA3WEc0Z0lDQWdmVnh1SUNBZ0lHRnljaTVzWlc1bmRHZ2dQU0JzWlc0N1hHNGdJQ0FnY21WMGRYSnVJR0Z5Y2p0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCbWFXeHNLSFpoYkhWbEtTQjdYRzRnSUNBZ2RtRnlJSE4wWVhKMElEMGdZWEpuZFcxbGJuUnpXekZkSUNFOVBTQW9kbTlwWkNBd0tTQS9JR0Z5WjNWdFpXNTBjMXN4WFNBNklEQTdYRzRnSUNBZ2RtRnlJR1Z1WkNBOUlHRnlaM1Z0Wlc1MGMxc3lYVHRjYmlBZ0lDQjJZWElnYjJKcVpXTjBJRDBnZEc5UFltcGxZM1FvZEdocGN5azdYRzRnSUNBZ2RtRnlJR3hsYmlBOUlIUnZUR1Z1WjNSb0tHOWlhbVZqZEM1c1pXNW5kR2dwTzF4dUlDQWdJSFpoY2lCbWFXeHNVM1JoY25RZ1BTQjBiMGx1ZEdWblpYSW9jM1JoY25RcE8xeHVJQ0FnSUhaaGNpQm1hV3hzUlc1a0lEMGdaVzVrSUNFOVBTQjFibVJsWm1sdVpXUWdQeUIwYjBsdWRHVm5aWElvWlc1a0tTQTZJR3hsYmp0Y2JpQWdJQ0JtYVd4c1UzUmhjblFnUFNCbWFXeHNVM1JoY25RZ1BDQXdJRDhnVFdGMGFDNXRZWGdvYkdWdUlDc2dabWxzYkZOMFlYSjBMQ0F3S1NBNklFMWhkR2d1YldsdUtHWnBiR3hUZEdGeWRDd2diR1Z1S1R0Y2JpQWdJQ0JtYVd4c1JXNWtJRDBnWm1sc2JFVnVaQ0E4SURBZ1B5Qk5ZWFJvTG0xaGVDaHNaVzRnS3lCbWFXeHNSVzVrTENBd0tTQTZJRTFoZEdndWJXbHVLR1pwYkd4RmJtUXNJR3hsYmlrN1hHNGdJQ0FnZDJocGJHVWdLR1pwYkd4VGRHRnlkQ0E4SUdacGJHeEZibVFwSUh0Y2JpQWdJQ0FnSUc5aWFtVmpkRnRtYVd4c1UzUmhjblJkSUQwZ2RtRnNkV1U3WEc0Z0lDQWdJQ0JtYVd4c1UzUmhjblFyS3p0Y2JpQWdJQ0I5WEc0Z0lDQWdjbVYwZFhKdUlHOWlhbVZqZER0Y2JpQWdmVnh1SUNCbWRXNWpkR2x2YmlCbWFXNWtLSEJ5WldScFkyRjBaU2tnZTF4dUlDQWdJSFpoY2lCMGFHbHpRWEpuSUQwZ1lYSm5kVzFsYm5Seld6RmRPMXh1SUNBZ0lISmxkSFZ5YmlCbWFXNWtTR1ZzY0dWeUtIUm9hWE1zSUhCeVpXUnBZMkYwWlN3Z2RHaHBjMEZ5WnlrN1hHNGdJSDFjYmlBZ1puVnVZM1JwYjI0Z1ptbHVaRWx1WkdWNEtIQnlaV1JwWTJGMFpTa2dlMXh1SUNBZ0lIWmhjaUIwYUdselFYSm5JRDBnWVhKbmRXMWxiblJ6V3pGZE8xeHVJQ0FnSUhKbGRIVnliaUJtYVc1a1NHVnNjR1Z5S0hSb2FYTXNJSEJ5WldScFkyRjBaU3dnZEdocGMwRnlaeXdnZEhKMVpTazdYRzRnSUgxY2JpQWdablZ1WTNScGIyNGdabWx1WkVobGJIQmxjaWh6Wld4bUxDQndjbVZrYVdOaGRHVXBJSHRjYmlBZ0lDQjJZWElnZEdocGMwRnlaeUE5SUdGeVozVnRaVzUwYzFzeVhUdGNiaUFnSUNCMllYSWdjbVYwZFhKdVNXNWtaWGdnUFNCaGNtZDFiV1Z1ZEhOYk0xMGdJVDA5SUNoMmIybGtJREFwSUQ4Z1lYSm5kVzFsYm5Seld6TmRJRG9nWm1Gc2MyVTdYRzRnSUNBZ2RtRnlJRzlpYW1WamRDQTlJSFJ2VDJKcVpXTjBLSE5sYkdZcE8xeHVJQ0FnSUhaaGNpQnNaVzRnUFNCMGIweGxibWQwYUNodlltcGxZM1F1YkdWdVozUm9LVHRjYmlBZ0lDQnBaaUFvSVdselEyRnNiR0ZpYkdVb2NISmxaR2xqWVhSbEtTa2dlMXh1SUNBZ0lDQWdkR2h5YjNjZ1ZIbHdaVVZ5Y205eUtDazdYRzRnSUNBZ2ZWeHVJQ0FnSUdadmNpQW9kbUZ5SUdrZ1BTQXdPeUJwSUR3Z2JHVnVPeUJwS3lzcElIdGNiaUFnSUNBZ0lIWmhjaUIyWVd4MVpTQTlJRzlpYW1WamRGdHBYVHRjYmlBZ0lDQWdJR2xtSUNod2NtVmthV05oZEdVdVkyRnNiQ2gwYUdselFYSm5MQ0IyWVd4MVpTd2dhU3dnYjJKcVpXTjBLU2tnZTF4dUlDQWdJQ0FnSUNCeVpYUjFjbTRnY21WMGRYSnVTVzVrWlhnZ1B5QnBJRG9nZG1Gc2RXVTdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZWeHVJQ0FnSUhKbGRIVnliaUJ5WlhSMWNtNUpibVJsZUNBL0lDMHhJRG9nZFc1a1pXWnBibVZrTzF4dUlDQjlYRzRnSUdaMWJtTjBhVzl1SUhCdmJIbG1hV3hzUVhKeVlYa29aMnh2WW1Gc0tTQjdYRzRnSUNBZ2RtRnlJQ1JmWHpVZ1BTQm5iRzlpWVd3c1hHNGdJQ0FnSUNBZ0lFRnljbUY1SUQwZ0pGOWZOUzVCY25KaGVTeGNiaUFnSUNBZ0lDQWdUMkpxWldOMElEMGdKRjlmTlM1UFltcGxZM1FzWEc0Z0lDQWdJQ0FnSUZONWJXSnZiQ0E5SUNSZlh6VXVVM2x0WW05c08xeHVJQ0FnSUcxaGVXSmxRV1JrUm5WdVkzUnBiMjV6S0VGeWNtRjVMbkJ5YjNSdmRIbHdaU3dnV3lkbGJuUnlhV1Z6Snl3Z1pXNTBjbWxsY3l3Z0oydGxlWE1uTENCclpYbHpMQ0FuZG1Gc2RXVnpKeXdnZG1Gc2RXVnpMQ0FuWm1sc2JDY3NJR1pwYkd3c0lDZG1hVzVrSnl3Z1ptbHVaQ3dnSjJacGJtUkpibVJsZUNjc0lHWnBibVJKYm1SbGVGMHBPMXh1SUNBZ0lHMWhlV0psUVdSa1JuVnVZM1JwYjI1ektFRnljbUY1TENCYkoyWnliMjBuTENCbWNtOXRMQ0FuYjJZbkxDQnZabDBwTzF4dUlDQWdJRzFoZVdKbFFXUmtTWFJsY21GMGIzSW9RWEp5WVhrdWNISnZkRzkwZVhCbExDQjJZV3gxWlhNc0lGTjViV0p2YkNrN1hHNGdJQ0FnYldGNVltVkJaR1JKZEdWeVlYUnZjaWhQWW1wbFkzUXVaMlYwVUhKdmRHOTBlWEJsVDJZb1cxMHVkbUZzZFdWektDa3BMQ0JtZFc1amRHbHZiaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUIwYUdsek8xeHVJQ0FnSUgwc0lGTjViV0p2YkNrN1hHNGdJSDFjYmlBZ2NtVm5hWE4wWlhKUWIyeDVabWxzYkNod2IyeDVabWxzYkVGeWNtRjVLVHRjYmlBZ2NtVjBkWEp1SUh0Y2JpQWdJQ0JuWlhRZ1puSnZiU2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJtY205dE8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHOW1LQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRzltTzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUdacGJHd29LU0I3WEc0Z0lDQWdJQ0J5WlhSMWNtNGdabWxzYkR0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCbWFXNWtLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJR1pwYm1RN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ1ptbHVaRWx1WkdWNEtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlHWnBibVJKYm1SbGVEdGNiaUFnSUNCOUxGeHVJQ0FnSUdkbGRDQndiMng1Wm1sc2JFRnljbUY1S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhCdmJIbG1hV3hzUVhKeVlYazdYRzRnSUNBZ2ZWeHVJQ0I5TzF4dWZTazdYRzVUZVhOMFpXMHVaMlYwS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdlFYSnlZWGt1YW5OY0lpQXJJQ2NuS1R0Y2JsTjVjM1JsYlM1eVpXZHBjM1JsY2sxdlpIVnNaU2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDA5aWFtVmpkQzVxYzF3aUxDQmJYU3dnWm5WdVkzUnBiMjRvS1NCN1hHNGdJRndpZFhObElITjBjbWxqZEZ3aU8xeHVJQ0IyWVhJZ1gxOXRiMlIxYkdWT1lXMWxJRDBnWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5UFltcGxZM1F1YW5OY0lqdGNiaUFnZG1GeUlDUmZYekFnUFNCVGVYTjBaVzB1WjJWMEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZkWFJwYkhNdWFuTmNJaWtzWEc0Z0lDQWdJQ0J0WVhsaVpVRmtaRVoxYm1OMGFXOXVjeUE5SUNSZlh6QXViV0Y1WW1WQlpHUkdkVzVqZEdsdmJuTXNYRzRnSUNBZ0lDQnlaV2RwYzNSbGNsQnZiSGxtYVd4c0lEMGdKRjlmTUM1eVpXZHBjM1JsY2xCdmJIbG1hV3hzTzF4dUlDQjJZWElnSkY5Zk1TQTlJQ1IwY21GalpYVnlVblZ1ZEdsdFpTeGNiaUFnSUNBZ0lHUmxabWx1WlZCeWIzQmxjblI1SUQwZ0pGOWZNUzVrWldacGJtVlFjbTl3WlhKMGVTeGNiaUFnSUNBZ0lHZGxkRTkzYmxCeWIzQmxjblI1UkdWelkzSnBjSFJ2Y2lBOUlDUmZYekV1WjJWMFQzZHVVSEp2Y0dWeWRIbEVaWE5qY21sd2RHOXlMRnh1SUNBZ0lDQWdaMlYwVDNkdVVISnZjR1Z5ZEhsT1lXMWxjeUE5SUNSZlh6RXVaMlYwVDNkdVVISnZjR1Z5ZEhsT1lXMWxjeXhjYmlBZ0lDQWdJR2x6VUhKcGRtRjBaVTVoYldVZ1BTQWtYMTh4TG1selVISnBkbUYwWlU1aGJXVXNYRzRnSUNBZ0lDQnJaWGx6SUQwZ0pGOWZNUzVyWlhsek8xeHVJQ0JtZFc1amRHbHZiaUJwY3loc1pXWjBMQ0J5YVdkb2RDa2dlMXh1SUNBZ0lHbG1JQ2hzWldaMElEMDlQU0J5YVdkb2RDbGNiaUFnSUNBZ0lISmxkSFZ5YmlCc1pXWjBJQ0U5UFNBd0lIeDhJREVnTHlCc1pXWjBJRDA5UFNBeElDOGdjbWxuYUhRN1hHNGdJQ0FnY21WMGRYSnVJR3hsWm5RZ0lUMDlJR3hsWm5RZ0ppWWdjbWxuYUhRZ0lUMDlJSEpwWjJoME8xeHVJQ0I5WEc0Z0lHWjFibU4wYVc5dUlHRnpjMmxuYmloMFlYSm5aWFFwSUh0Y2JpQWdJQ0JtYjNJZ0tIWmhjaUJwSUQwZ01Uc2dhU0E4SUdGeVozVnRaVzUwY3k1c1pXNW5kR2c3SUdrckt5a2dlMXh1SUNBZ0lDQWdkbUZ5SUhOdmRYSmpaU0E5SUdGeVozVnRaVzUwYzF0cFhUdGNiaUFnSUNBZ0lIWmhjaUJ3Y205d2N5QTlJSE52ZFhKalpTQTlQU0J1ZFd4c0lEOGdXMTBnT2lCclpYbHpLSE52ZFhKalpTazdYRzRnSUNBZ0lDQjJZWElnY0N4Y2JpQWdJQ0FnSUNBZ0lDQnNaVzVuZEdnZ1BTQndjbTl3Y3k1c1pXNW5kR2c3WEc0Z0lDQWdJQ0JtYjNJZ0tIQWdQU0F3T3lCd0lEd2diR1Z1WjNSb095QndLeXNwSUh0Y2JpQWdJQ0FnSUNBZ2RtRnlJRzVoYldVZ1BTQndjbTl3YzF0d1hUdGNiaUFnSUNBZ0lDQWdhV1lnS0dselVISnBkbUYwWlU1aGJXVW9ibUZ0WlNrcFhHNGdJQ0FnSUNBZ0lDQWdZMjl1ZEdsdWRXVTdYRzRnSUNBZ0lDQWdJSFJoY21kbGRGdHVZVzFsWFNBOUlITnZkWEpqWlZ0dVlXMWxYVHRjYmlBZ0lDQWdJSDFjYmlBZ0lDQjlYRzRnSUNBZ2NtVjBkWEp1SUhSaGNtZGxkRHRjYmlBZ2ZWeHVJQ0JtZFc1amRHbHZiaUJ0YVhocGJpaDBZWEpuWlhRc0lITnZkWEpqWlNrZ2UxeHVJQ0FnSUhaaGNpQndjbTl3Y3lBOUlHZGxkRTkzYmxCeWIzQmxjblI1VG1GdFpYTW9jMjkxY21ObEtUdGNiaUFnSUNCMllYSWdjQ3hjYmlBZ0lDQWdJQ0FnWkdWelkzSnBjSFJ2Y2l4Y2JpQWdJQ0FnSUNBZ2JHVnVaM1JvSUQwZ2NISnZjSE11YkdWdVozUm9PMXh1SUNBZ0lHWnZjaUFvY0NBOUlEQTdJSEFnUENCc1pXNW5kR2c3SUhBckt5a2dlMXh1SUNBZ0lDQWdkbUZ5SUc1aGJXVWdQU0J3Y205d2MxdHdYVHRjYmlBZ0lDQWdJR2xtSUNocGMxQnlhWFpoZEdWT1lXMWxLRzVoYldVcEtWeHVJQ0FnSUNBZ0lDQmpiMjUwYVc1MVpUdGNiaUFnSUNBZ0lHUmxjMk55YVhCMGIzSWdQU0JuWlhSUGQyNVFjbTl3WlhKMGVVUmxjMk55YVhCMGIzSW9jMjkxY21ObExDQndjbTl3YzF0d1hTazdYRzRnSUNBZ0lDQmtaV1pwYm1WUWNtOXdaWEowZVNoMFlYSm5aWFFzSUhCeWIzQnpXM0JkTENCa1pYTmpjbWx3ZEc5eUtUdGNiaUFnSUNCOVhHNGdJQ0FnY21WMGRYSnVJSFJoY21kbGREdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQndiMng1Wm1sc2JFOWlhbVZqZENobmJHOWlZV3dwSUh0Y2JpQWdJQ0IyWVhJZ1QySnFaV04wSUQwZ1oyeHZZbUZzTGs5aWFtVmpkRHRjYmlBZ0lDQnRZWGxpWlVGa1pFWjFibU4wYVc5dWN5aFBZbXBsWTNRc0lGc25ZWE56YVdkdUp5d2dZWE56YVdkdUxDQW5hWE1uTENCcGN5d2dKMjFwZUdsdUp5d2diV2w0YVc1ZEtUdGNiaUFnZlZ4dUlDQnlaV2RwYzNSbGNsQnZiSGxtYVd4c0tIQnZiSGxtYVd4c1QySnFaV04wS1R0Y2JpQWdjbVYwZFhKdUlIdGNiaUFnSUNCblpYUWdhWE1vS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnYVhNN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ1lYTnphV2R1S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUdGemMybG5ianRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0J0YVhocGJpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQnRhWGhwYmp0Y2JpQWdJQ0I5TEZ4dUlDQWdJR2RsZENCd2IyeDVabWxzYkU5aWFtVmpkQ2dwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJ3YjJ4NVptbHNiRTlpYW1WamREdGNiaUFnSUNCOVhHNGdJSDA3WEc1OUtUdGNibE41YzNSbGJTNW5aWFFvWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5UFltcGxZM1F1YW5OY0lpQXJJQ2NuS1R0Y2JsTjVjM1JsYlM1eVpXZHBjM1JsY2sxdlpIVnNaU2hjSW5SeVlXTmxkWEl0Y25WdWRHbHRaVUF3TGpBdU56a3ZjM0pqTDNKMWJuUnBiV1V2Y0c5c2VXWnBiR3h6TDA1MWJXSmxjaTVxYzF3aUxDQmJYU3dnWm5WdVkzUnBiMjRvS1NCN1hHNGdJRndpZFhObElITjBjbWxqZEZ3aU8xeHVJQ0IyWVhJZ1gxOXRiMlIxYkdWT1lXMWxJRDBnWENKMGNtRmpaWFZ5TFhKMWJuUnBiV1ZBTUM0d0xqYzVMM055WXk5eWRXNTBhVzFsTDNCdmJIbG1hV3hzY3k5T2RXMWlaWEl1YW5OY0lqdGNiaUFnZG1GeUlDUmZYekFnUFNCVGVYTjBaVzB1WjJWMEtGd2lkSEpoWTJWMWNpMXlkVzUwYVcxbFFEQXVNQzQzT1M5emNtTXZjblZ1ZEdsdFpTOXdiMng1Wm1sc2JITXZkWFJwYkhNdWFuTmNJaWtzWEc0Z0lDQWdJQ0JwYzA1MWJXSmxjaUE5SUNSZlh6QXVhWE5PZFcxaVpYSXNYRzRnSUNBZ0lDQnRZWGxpWlVGa1pFTnZibk4wY3lBOUlDUmZYekF1YldGNVltVkJaR1JEYjI1emRITXNYRzRnSUNBZ0lDQnRZWGxpWlVGa1pFWjFibU4wYVc5dWN5QTlJQ1JmWHpBdWJXRjVZbVZCWkdSR2RXNWpkR2x2Ym5Nc1hHNGdJQ0FnSUNCeVpXZHBjM1JsY2xCdmJIbG1hV3hzSUQwZ0pGOWZNQzV5WldkcGMzUmxjbEJ2YkhsbWFXeHNMRnh1SUNBZ0lDQWdkRzlKYm5SbFoyVnlJRDBnSkY5Zk1DNTBiMGx1ZEdWblpYSTdYRzRnSUhaaGNpQWtZV0p6SUQwZ1RXRjBhQzVoWW5NN1hHNGdJSFpoY2lBa2FYTkdhVzVwZEdVZ1BTQnBjMFpwYm1sMFpUdGNiaUFnZG1GeUlDUnBjMDVoVGlBOUlHbHpUbUZPTzF4dUlDQjJZWElnVFVGWVgxTkJSa1ZmU1U1VVJVZEZVaUE5SUUxaGRHZ3VjRzkzS0RJc0lEVXpLU0F0SURFN1hHNGdJSFpoY2lCTlNVNWZVMEZHUlY5SlRsUkZSMFZTSUQwZ0xVMWhkR2d1Y0c5M0tESXNJRFV6S1NBcklERTdYRzRnSUhaaGNpQkZVRk5KVEU5T0lEMGdUV0YwYUM1d2IzY29NaXdnTFRVeUtUdGNiaUFnWm5WdVkzUnBiMjRnVG5WdFltVnlTWE5HYVc1cGRHVW9iblZ0WW1WeUtTQjdYRzRnSUNBZ2NtVjBkWEp1SUdselRuVnRZbVZ5S0c1MWJXSmxjaWtnSmlZZ0pHbHpSbWx1YVhSbEtHNTFiV0psY2lrN1hHNGdJSDFjYmlBZ08xeHVJQ0JtZFc1amRHbHZiaUJwYzBsdWRHVm5aWElvYm5WdFltVnlLU0I3WEc0Z0lDQWdjbVYwZFhKdUlFNTFiV0psY2tselJtbHVhWFJsS0c1MWJXSmxjaWtnSmlZZ2RHOUpiblJsWjJWeUtHNTFiV0psY2lrZ1BUMDlJRzUxYldKbGNqdGNiaUFnZlZ4dUlDQm1kVzVqZEdsdmJpQk9kVzFpWlhKSmMwNWhUaWh1ZFcxaVpYSXBJSHRjYmlBZ0lDQnlaWFIxY200Z2FYTk9kVzFpWlhJb2JuVnRZbVZ5S1NBbUppQWthWE5PWVU0b2JuVnRZbVZ5S1R0Y2JpQWdmVnh1SUNBN1hHNGdJR1oxYm1OMGFXOXVJR2x6VTJGbVpVbHVkR1ZuWlhJb2JuVnRZbVZ5S1NCN1hHNGdJQ0FnYVdZZ0tFNTFiV0psY2tselJtbHVhWFJsS0c1MWJXSmxjaWtwSUh0Y2JpQWdJQ0FnSUhaaGNpQnBiblJsWjNKaGJDQTlJSFJ2U1c1MFpXZGxjaWh1ZFcxaVpYSXBPMXh1SUNBZ0lDQWdhV1lnS0dsdWRHVm5jbUZzSUQwOVBTQnVkVzFpWlhJcFhHNGdJQ0FnSUNBZ0lISmxkSFZ5YmlBa1lXSnpLR2x1ZEdWbmNtRnNLU0E4UFNCTlFWaGZVMEZHUlY5SlRsUkZSMFZTTzF4dUlDQWdJSDFjYmlBZ0lDQnlaWFIxY200Z1ptRnNjMlU3WEc0Z0lIMWNiaUFnWm5WdVkzUnBiMjRnY0c5c2VXWnBiR3hPZFcxaVpYSW9aMnh2WW1Gc0tTQjdYRzRnSUNBZ2RtRnlJRTUxYldKbGNpQTlJR2RzYjJKaGJDNU9kVzFpWlhJN1hHNGdJQ0FnYldGNVltVkJaR1JEYjI1emRITW9UblZ0WW1WeUxDQmJKMDFCV0Y5VFFVWkZYMGxPVkVWSFJWSW5MQ0JOUVZoZlUwRkdSVjlKVGxSRlIwVlNMQ0FuVFVsT1gxTkJSa1ZmU1U1VVJVZEZVaWNzSUUxSlRsOVRRVVpGWDBsT1ZFVkhSVklzSUNkRlVGTkpURTlPSnl3Z1JWQlRTVXhQVGwwcE8xeHVJQ0FnSUcxaGVXSmxRV1JrUm5WdVkzUnBiMjV6S0U1MWJXSmxjaXdnV3lkcGMwWnBibWwwWlNjc0lFNTFiV0psY2tselJtbHVhWFJsTENBbmFYTkpiblJsWjJWeUp5d2dhWE5KYm5SbFoyVnlMQ0FuYVhOT1lVNG5MQ0JPZFcxaVpYSkpjMDVoVGl3Z0oybHpVMkZtWlVsdWRHVm5aWEluTENCcGMxTmhabVZKYm5SbFoyVnlYU2s3WEc0Z0lIMWNiaUFnY21WbmFYTjBaWEpRYjJ4NVptbHNiQ2h3YjJ4NVptbHNiRTUxYldKbGNpazdYRzRnSUhKbGRIVnliaUI3WEc0Z0lDQWdaMlYwSUUxQldGOVRRVVpGWDBsT1ZFVkhSVklvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnVFVGWVgxTkJSa1ZmU1U1VVJVZEZVanRjYmlBZ0lDQjlMRnh1SUNBZ0lHZGxkQ0JOU1U1ZlUwRkdSVjlKVGxSRlIwVlNLQ2tnZTF4dUlDQWdJQ0FnY21WMGRYSnVJRTFKVGw5VFFVWkZYMGxPVkVWSFJWSTdYRzRnSUNBZ2ZTeGNiaUFnSUNCblpYUWdSVkJUU1V4UFRpZ3BJSHRjYmlBZ0lDQWdJSEpsZEhWeWJpQkZVRk5KVEU5T08xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElHbHpSbWx1YVhSbEtDa2dlMXh1SUNBZ0lDQWdjbVYwZFhKdUlFNTFiV0psY2tselJtbHVhWFJsTzF4dUlDQWdJSDBzWEc0Z0lDQWdaMlYwSUdselNXNTBaV2RsY2lncElIdGNiaUFnSUNBZ0lISmxkSFZ5YmlCcGMwbHVkR1ZuWlhJN1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2FYTk9ZVTRvS1NCN1hHNGdJQ0FnSUNCeVpYUjFjbTRnVG5WdFltVnlTWE5PWVU0N1hHNGdJQ0FnZlN4Y2JpQWdJQ0JuWlhRZ2FYTlRZV1psU1c1MFpXZGxjaWdwSUh0Y2JpQWdJQ0FnSUhKbGRIVnliaUJwYzFOaFptVkpiblJsWjJWeU8xeHVJQ0FnSUgwc1hHNGdJQ0FnWjJWMElIQnZiSGxtYVd4c1RuVnRZbVZ5S0NrZ2UxeHVJQ0FnSUNBZ2NtVjBkWEp1SUhCdmJIbG1hV3hzVG5WdFltVnlPMXh1SUNBZ0lIMWNiaUFnZlR0Y2JuMHBPMXh1VTNsemRHVnRMbWRsZENoY0luUnlZV05sZFhJdGNuVnVkR2x0WlVBd0xqQXVOemt2YzNKakwzSjFiblJwYldVdmNHOXNlV1pwYkd4ekwwNTFiV0psY2k1cWMxd2lJQ3NnSnljcE8xeHVVM2x6ZEdWdExuSmxaMmx6ZEdWeVRXOWtkV3hsS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdmNHOXNlV1pwYkd4ekxtcHpYQ0lzSUZ0ZExDQm1kVzVqZEdsdmJpZ3BJSHRjYmlBZ1hDSjFjMlVnYzNSeWFXTjBYQ0k3WEc0Z0lIWmhjaUJmWDIxdlpIVnNaVTVoYldVZ1BTQmNJblJ5WVdObGRYSXRjblZ1ZEdsdFpVQXdMakF1TnprdmMzSmpMM0oxYm5ScGJXVXZjRzlzZVdacGJHeHpMM0J2YkhsbWFXeHNjeTVxYzF3aU8xeHVJQ0IyWVhJZ2NHOXNlV1pwYkd4QmJHd2dQU0JUZVhOMFpXMHVaMlYwS0Z3aWRISmhZMlYxY2kxeWRXNTBhVzFsUURBdU1DNDNPUzl6Y21NdmNuVnVkR2x0WlM5d2IyeDVabWxzYkhNdmRYUnBiSE11YW5OY0lpa3VjRzlzZVdacGJHeEJiR3c3WEc0Z0lIQnZiSGxtYVd4c1FXeHNLRkpsWm14bFkzUXVaMnh2WW1Gc0tUdGNiaUFnZG1GeUlITmxkSFZ3UjJ4dlltRnNjeUE5SUNSMGNtRmpaWFZ5VW5WdWRHbHRaUzV6WlhSMWNFZHNiMkpoYkhNN1hHNGdJQ1IwY21GalpYVnlVblZ1ZEdsdFpTNXpaWFIxY0Vkc2IySmhiSE1nUFNCbWRXNWpkR2x2YmlobmJHOWlZV3dwSUh0Y2JpQWdJQ0J6WlhSMWNFZHNiMkpoYkhNb1oyeHZZbUZzS1R0Y2JpQWdJQ0J3YjJ4NVptbHNiRUZzYkNobmJHOWlZV3dwTzF4dUlDQjlPMXh1SUNCeVpYUjFjbTRnZTMwN1hHNTlLVHRjYmxONWMzUmxiUzVuWlhRb1hDSjBjbUZqWlhWeUxYSjFiblJwYldWQU1DNHdMamM1TDNOeVl5OXlkVzUwYVcxbEwzQnZiSGxtYVd4c2N5OXdiMng1Wm1sc2JITXVhbk5jSWlBcklDY25LVHRjYmlKZGZRPT0iLCJ2YXIgcHNpVHVyayA9IHJlcXVpcmUoJy4vcHNpdHVyaycpO1xudmFyIHNldHVwVHJpYWxzID0gcmVxdWlyZSgnLi9zcGVjaWZpYy9pdGVtcycpO1xudmFyIFF1ZXN0aW9ubmFpcmUgPSByZXF1aXJlKCcuL3NwZWNpZmljL2VuZGluZycpO1xuXG5jbGFzcyBFeHBlcmltZW50IHsgLy90aGUgbWFpbiBvYmplY3Qgb2YgdGhlIHdob2xlIHRoaW5nXG4gICBcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5jb3VudCA9IDA7IC8vYSBjb3VudGVyIHRvIGtlZXAgdHJhY2sgb2YgaG93IG1hbnkgdHJpYWxzIHdlcmUgZGlzcGFseWVkXG4gICAgdGhpcy50cmlhbERhdGEgPSBbXTsgLy9pbml0aWFsaXplcyBhIHZlY3RvciB0byBjb2xsZWN0IGRhdGFcbiAgICB0aGlzLmFsbFRyaWFscyA9IHNldHVwVHJpYWxzKCk7IC8vY2FsbHMgdGhlIGZ1bmN0aW9uIGRlZmluZWQgaW4gaXRlbXMuanMsIHdoaWNoIGNyZWF0ZXMgMTIgdHJpYWxzXG4gIH1cblxuICBuZXh0KCkgeyAvL2NhbGxlZCB3aGVuIHRoZSBzdWJqZWN0IGNsaWNrcyBcIm5leHRcIlxuICAgIGlmICh0aGlzLmNvdW50IDwgdGhpcy5hbGxUcmlhbHMubGVuZ3RoKSB7IC8vYWxsVHJpYWxzIGhhcyBsZW5ndGggMTJcbiAgICAgIFxuICAgICAgdGhpcy50cmlhbCA9IHRoaXMuYWxsVHJpYWxzW3RoaXMuY291bnRdOyAvL3BpY2tzIHRoZSB0aGlzLmNvdW50LXRoIG9iamVjdCBjb25zdHJ1Y3RlZCBieSBzZXR1cFRyaWFsXG4gICAgICB0aGlzLnRyaWFsbnVtYmVyID0gdGhpcy5jb3VudCsxOyAvL2p1c3QgdG8gbnVtYmVyIHRoZSB0cmlhbHMgc3RhcnRpbmcgZnJvbSAxIGluc3RlYWQgb2YgMFxuICAgICAgICAgIFxuICAgICAgICBcbiAgICAgIHRoaXMuaW5zZXJ0TGluZXModGhpcy50cmlhbCk7IC8vZnVuY3Rpb24gdXNlZCB0byByZXBsYWNlIHRoZSB3YW50ZWQgZWxlbWVudHMgKHBpY2tlZCBieSBpZCwgc2VlIGJlbG93KSB3aXRoIHRoZSB0ZXh0L2h0bWwvLi4uIHByb3ZpZGVkIGluIGl0ZW1zLmpzXG4gICAgICAgIFxuICAgICAgdGhpcy50cmlhbERhdGEuc3BsaWNlKDAsIDAsIHRoaXMudHJpYWxudW1iZXIsIHRoaXMudHJpYWwudmFsdWUsIHRoaXMudHJpYWwuYWNjZXNzLCB0aGlzLnRyaWFsLm9ic2VydmF0aW9uKTsgLy9jb25jYXRlbmF0ZSB0aGUgcmVnaXN0ZXJlZCBkYXRhXG4gICAgICBcblx0ICB0aGlzLnN0YXJ0ID0gKyBuZXcgRGF0ZSgpOy8vc3RhcnRpbmcgdGltZSBvZiB0aGUgdHJpYWxcblx0ICAgIFxuICAgICAgdGhpcy5jb3VudCsrOy8vc2VsZi1leHBsYW5hdG9yeVxuXG4gICAgfVxuICAgIGVsc2VcbiAgICAgIG5ldyBRdWVzdGlvbm5haXJlKCkuc3RhcnQoKTsvL3doZW4gdGhpcy5jb3VudCBlcXVhbHMgdGhlIHRyaWFscywgZGlzcGxheSBmaW5hbCBxdWVzdGlvbm5haXJlXG4gIH1cblxuICBpbnNlcnRMaW5lcyh0KSB7Ly93aGVyZSB0IGlzIGEgdmFyaWFibGVzIGZvciB0cmlhbHMsIGluIHRoaXMgY2FzZSBpbnN0YW50aWF0ZWQgd2l0aCB0aGlzLnRyaWFsXG4gICAgXG4gICAgJCgnI3NjZW5hcmlvJykudGV4dCh0LnNjZW5hcmlvKTtcbiAgICAgIFxuICAgICQoJyNxdWVzdGlvbicpLmh0bWwodC5xdWVzdGlvbik7ICAgICAgXG4gICAgJCgnI2FjdGlvbicpLmh0bWwodC5hY3Rpb24pOyAvL25vdGljZSB0aGUgbWV0aG9kIC5odG1sIHRvIHRyYW5mb3JtIHRoZSB0ZXh0IHByb3ZpZGVkIGluIGl0ZW1zLmpzIGludG8gaHRtbCBzbmlwcGV0ICAgICAgICBcbiAgICAkKCcjaXRlbScpLmh0bWwodC5pdGVtKTtcbiAgICAkKCcjcGljJykuaHRtbCh0LnBpYyk7ICBcbiAgICAgIFxuICAgICQoJyNwZXJjZW50YWdlJykudGV4dChNYXRoLmZsb29yKHQucGVyY2VudGFnZSkpOyAvL3VzZWQgdG8gZGlzcGxheSB0aGUgcHJvZ3Jlc3MgdG8gdGhlIHN1YmplY3RcbiAgICAkKCcjcGVyY2VudGFnZUJpcycpLnRleHQoTWF0aC5mbG9vcih0LnBlcmNlbnRhZ2VCaXMpKTsgLy9zYW1lXG4gIH1cblxuICAgIFxuIHNhdmUoZSkgeyAvL2Z1bmN0aW9uIGNhbGxlZCB3aGVuIHRoZSBzdWJqZWN0IGNsaWNrcyBvbiBidXR0b24gXCJuZXh0XCIsIGNoZWNrcyBzdHVmZiBhbmQgcmVjb3JkcyBhbnN3ZXJzXG5cdHZhciBSVCA9ICsgbmV3IERhdGUoKSAtIHRoaXMuc3RhcnQ7Ly8gcmVjb3JkIHJlYWN0aW9uIHRpbWVcbiAgICBcbiAgICB2YXIgYW5zd2VyMSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdleHByZXNzaW9uMScpLnZhbHVlOyAvL2dldCB0aGUgdmFsdWUgc2VsZWN0ZWQgaW4gdGhlIG1lbnVzIGJ5IHRoZSBwYXJ0aWNpcGFudFxuICAgIHZhciBhbnN3ZXIyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2V4cHJlc3Npb24yJykudmFsdWU7XG4gICAgIFxuICAgIGlmKGFuc3dlcjE9PVwiXCIgfHwgYW5zd2VyMj09XCJcIikgLy9jaGVjazogdGhlIHN1YmplY3QgbXVzdCBhbHdheXMgY2hvb3NlIHNvbWV0aGluZyBpbiBib3RoIG1lbnVzXG4gICAgICAge1xuICAgICBhbGVydChcIlBsZWFzZSBjb21wbGV0ZSB0aGUgc2VudGVuY2UhXCIpOyAgICAgICBcbiAgICB9XG4gICAgIGVsc2Uge1xuICAgICAgICB0aGlzLnRyaWFsRGF0YSA9IHRoaXMudHJpYWxEYXRhLmNvbmNhdChhbnN3ZXIxLCBhbnN3ZXIyLCBSVCk7Ly9hcHBlbmQgYW5zd2VyIGFuZCBSVCB0byB0aGUgb3RoZXIgZGF0YSBvZiB0aGlzIHRyaWFsXG4gICAgICAgIHBzaVR1cmsucmVjb3JkVHJpYWxEYXRhKHRoaXMudHJpYWxEYXRhKTtcblx0XHQgICAgXG4gICAgICAgIHRoaXMudHJpYWxEYXRhID0gW107Ly9lbXB0eSB0aGUgZGF0YSwgZm9yIHRoZSBuZXh0IHRyaWFsXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdleHByZXNzaW9uMScpLnZhbHVlPVwiXCI7IC8vcmVzZXQgdGhlIG1lbnUgdmFsdWUgdG8gZGVmYXVsdCwgZm9yIHRoZSBuZXh0IHRyaWFsXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdleHByZXNzaW9uMicpLnZhbHVlPVwiXCI7IC8vcmVzZXQgdGhlIGJ1dHRvbiB2YWx1ZSB0byBlbXB0eSwgZm9yIHRoZSBuZXh0IHRyaWFsXG4gICAgICAgIHRoaXMubmV4dCgpO1xuICAgICB9IFxuXG4gIH1cblxuICBzdGFydCgpIHtcbiAgICBwc2lUdXJrLnNob3dQYWdlKCdpdGVtLmh0bWwnKTtcbiAgICAkKCcjbmV4dCcpLm9uKCdjbGljaycsIF8uYmluZCh0aGlzLnNhdmUsIHRoaXMpKTsgLy93aGVuIHN1YmplY3QgY2xpY2tzIFwibmV4dFwiLCB0aGUgZnVuY3Rpb24gXCJzYXZlXCIgaXMgY2FsbGVkICh0aGUgXCJ0aGlzXCIgYXJndW1lbnQgaXMgYm9ndXMgaGVyZSlcbiAgICB0aGlzLm5leHQoKTsgLy9kZWZpbmVkIGFib3ZlXG4gIH1cbn1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IEV4cGVyaW1lbnQ7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IG5ldyBQc2lUdXJrKHVuaXF1ZUlkLCBhZFNlcnZlckxvYywgbW9kZSk7XG4iLCJ2YXIgcHNpVHVyayA9IHJlcXVpcmUoJy4uL3BzaXR1cmsnKTtcblxuXG5jbGFzcyBRdWVzdGlvbm5haXJlIHtcblxuICBzYXZlX2RhdGEobGFuZ3VhZ2UpIHtcblx0dmFyIGNvbW1lbnRzID0gJCgnI2NvbW1lbnQnKS52YWwoKTtcbiAgICBwc2lUdXJrLnJlY29yZFRyaWFsRGF0YSh7J3BoYXNlJzoncG9zdHF1ZXN0aW9ubmFpcmUnLCAnc3RhdHVzJzonc3VibWl0J30pO1xuICAgIHBzaVR1cmsucmVjb3JkVHJpYWxEYXRhKFtsYW5ndWFnZV0pO1xuXHRwc2lUdXJrLnJlY29yZFRyaWFsRGF0YShbY29tbWVudHNdKTtcbiAgICBwc2lUdXJrLnJlY29yZFVuc3RydWN0dXJlZERhdGEoJ2xhbmd1YWdlJywgbGFuZ3VhZ2UpO1xuICAgIHBzaVR1cmsucmVjb3JkVW5zdHJ1Y3R1cmVkRGF0YSgnY29tbWVudHMnLCBjb21tZW50cyk7XG4gICAgXG5cdCQoJ3NlbGVjdCcpLmVhY2goZnVuY3Rpb24oaSwgdmFsKSB7XG4gICAgICBwc2lUdXJrLnJlY29yZFRyaWFsRGF0YShbdGhpcy52YWx1ZV0pO1xuICAgIH0pO1xuICB9XG5cbiAgcmVjb3JkX3Jlc3BvbnNlcygpIHtcbiAgICAvLyBzYXZlIHRoZWlyIG5hdGl2ZSBsYW5ndWFnZVxuICAgIHZhciBsYW5ndWFnZSA9ICQoJyNsYW5ndWFnZScpLnZhbCgpO1xuICAgIHRoaXMuTEFOR1VBR0UgPSBmYWxzZTtcbiAgICBcbiAgICAkKCdzZWxlY3QnKS5lYWNoKGZ1bmN0aW9uKGksIHZhbCkge1xuICAgICAgcHNpVHVyay5yZWNvcmRVbnN0cnVjdHVyZWREYXRhKHRoaXMuaWQsIHRoaXMudmFsdWUpO1xuICAgIH0pO1xuXG4gICAgaWYgKGxhbmd1YWdlID09PSAnJykge1xuICAgICAgYWxlcnQoJ1BsZWFzZSBpbmRpY2F0ZSB5b3VyIG5hdGl2ZSBsYW5ndWFnZS4nKTtcbiAgICAgICQoJyNsYW5ndWFnZScpLmZvY3VzKCk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5MQU5HVUFHRSA9IHRydWU7XG4gICAgICAgIHRoaXMuc2F2ZV9kYXRhKGxhbmd1YWdlKTtcbiAgICB9XG4gIH1cblxuICBwcm9tcHRfcmVzdWJtaXQoKSB7XG4gICAgdmFyIGVycm9yID0gW1wiPGgxPk9vcHMhPC9oMT48cD5Tb21ldGhpbmcgd2VudCB3cm9uZyBzdWJtaXR0aW5nIHlvdXIgSElULlwiLFxuICAgICAgICAgICAgICAgICBcIlRoaXMgbWlnaHQgaGFwcGVuIGlmIHlvdSBsb3NlIHlvdXIgaW50ZXJuZXQgY29ubmVjdGlvbi5cIixcbiAgICAgICAgICAgICAgICAgXCJQcmVzcyB0aGUgYnV0dG9uIHRvIHJlc3VibWl0LjwvcD48YnV0dG9uIGlkPSdyZXN1Ym1pdCc+UmVzdWJtaXQ8L2J1dHRvbj5cIl0uam9pbignICcpO1xuICAgICQoJ2JvZHknKS5odG1sKGVycm9yKTtcbiAgICAkKCcjcmVzdWJtaXQnKS5vbignY2xpY2snLCBfLmJpbmQodGhpcy5yZXN1Ym1pdCwgdGhpcykpO1xuICB9XG5cbiAgcmVzdWJtaXQoKSB7XG4gICAgJCgnYm9keScpLmh0bWwoJzxoMT5UcnlpbmcgdG8gcmVzdWJtaXQuLi48L2gxPicpO1xuICAgIHZhciByZXByb21wdCA9IHNldFRpbWVvdXQoXy5iaW5kKHRoaXMucHJvbXB0X3Jlc3VibWl0LCB0aGlzKSwgMTAwMDApO1xuICAgIGlmICghdGhpcy5MQU5HVUFHRSkgdGhpcy5zYXZlX2RhdGEoJ05BJyk7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgcHNpVHVyay5zYXZlRGF0YSh7XG4gICAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwocmVwcm9tcHQpOyBcbiAgICAgICAgcHNpVHVyay5jb21wbGV0ZUhJVCgpO1xuICAgICAgfSxcbiAgICAgIGVycm9yOiBfLmJpbmQodGhpcy5wcm9tcHRfcmVzdWJtaXQsIHRoaXMpXG4gICAgfSk7XG4gIH1cblxuICBzdGFydCgpIHtcbiAgICAvLyBMb2FkIHRoZSBxdWVzdGlvbm5haXJlIHNuaXBwZXQgXG4gICAgcHNpVHVyay5zaG93UGFnZSgncG9zdHF1ZXN0aW9ubmFpcmUuaHRtbCcpO1xuICAgIHBzaVR1cmsucmVjb3JkVHJpYWxEYXRhKHsncGhhc2UnOidwb3N0cXVlc3Rpb25uYWlyZScsICdzdGF0dXMnOidiZWdpbid9KTtcblxuICAgICQoJyNuZXh0Jykub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdGhpcy5yZWNvcmRfcmVzcG9uc2VzKCk7XG4gICAgICBwc2lUdXJrLnNhdmVEYXRhKHtcbiAgICAgICAgc3VjY2VzczogcHNpVHVyay5jb21wbGV0ZUhJVCxcbiAgICAgICAgZXJyb3I6IF8uYmluZCh0aGlzLnByb21wdF9yZXN1Ym1pdCwgdGhpcylcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gUXVlc3Rpb25uYWlyZTtcbiIsImZ1bmN0aW9uIHNldHVwVHJpYWxzKCkge1xuICAgIFxuICAgIHZhciB2YWx1ZXMgPSBfLnNodWZmbGUoWzIwLDIyLDQxLDQyLDQzLDgwLDgyLDg0LDg2LDg4LDEwMiwxMDMsMTA1LDEwNywxMDhdKTsgLy9hIHNodWZmbGVkIGxpc3Qgb2YgdmFsdWVzLCB0aGV5IGFyZSB1c2VkIHRvIGNvZGUgPEFDQ0VTLE9CU0VSVkFUSU9OPiBwYWlycy5cblx0XG5cdHZhciBob3dtYW55ID0gMTIgLy9ob3cgbWFueSB0cmlhbHM/XG5cbiAgICB2YXIgbWV0YSA9IHsgLy9hIHN0cnVjdHVyZWQgb2JqZWN0IHdpdGggdGhlIG1hdGVyaWFscyBuZWVkZWQgZm9yIHRoZSBleHAgICBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICdwaWMnOiBcIjx0YWJsZSBjbGFzcz0ndGcxJz5cIitcbiAgICAgICAgICAgICAgICAgICAgICAnPHRyPicrXG4gICAgICAgICAgICAgICAgICAgICAgICAnPHRoIGNsYXNzPVwidGgxXCI+PGltZyBzcmM9XCIvc3RhdGljL2ltYWdlcy9maXJzdC5wbmdcIj48L3RoPicrXG4gICAgICAgICAgICAgICAgICAgICAgICAnPHRoIGNsYXNzPVwidGgxXCI+PGltZyBzcmM9XCIvc3RhdGljL2ltYWdlcy97VkFMVUV9LnBuZ1wiPjwvdGg+JytcbiAgICAgICAgICAgICAgICAgICAgICAgICc8dGggY2xhc3M9XCJ0aDFcIj48aW1nIHNyYz1cIi9zdGF0aWMvaW1hZ2VzL3tWQUxVRWJhY2t9LnBuZ1wiPC9pbWc+PC90aD4nK1xuICAgICAgICAgICAgICAgICAgICAgICAgJzx0aCBjbGFzcz1cInRoMVwiPjxpbWcgc3JjPVwiL3N0YXRpYy9pbWFnZXMvbGFzdC5wbmdcIj48L3RoPicrXG4gICAgICAgICAgICAgICAgICAgICAgJzwvdHI+JytcbiAgICAgICAgICAgICAgICAgICAgJzwvdGFibGU+JyxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJ3NjZW5hcmlvJyA6ICdZb3UgZHJhdyB7QX0gYmFsbHMgYW5kIG9ic2VydmUgdGhhdCB7T30gb2YgdGhlbSB7Q09QVUxBfSByZWQuJ1xuXG4gICAgfTtcbiAgXG4gICAgXG5cbiAgICB2YXIgcmVzID0gXy5tYXAoXy5yYW5nZSgwLCAxMiksICh3KSA9PiB7IC8vdGhpcyBmdW5jdGlvbiBnZW5lcmF0ZXMgMTIgdHJpYWxzLCBpZSAxMiBvYmplY3RzIHdpdGggc2V2ZXJhbCBwcm9wZXJ0aWVzXG5cbiAgICB2YXIgdHJpYWwgPSB7fTtcbiAgICBcbiAgICB0cmlhbC52YWx1ZSA9IHZhbHVlcy5zaGlmdCgpOy8vc2VsZWN0cyBhIHByZXZpb3VzbHkgdW5zZWxlY3RlZCB2YWx1ZSAoaXQgYWN0dWFsbHkgcmVtb3ZlcyB0aGUgdmFsdWUgZnJvbSB0aGUgdmVjdG9yKVxuICAgIHRyaWFsLnZhbHVlQmFjayA9IHRyaWFsLnZhbHVlK1wiYmFja1wiXG5cbiAgICBpZiAodHJpYWwudmFsdWUgPT0gMTAxMCkgeyAvL2FkIGhvYyB0cmVhdG1lbnQgb2YgMTAxMCB2YWx1ZSwgdG8gc3BsaXQgaXQgaW50byAxMCBhbmQgMTBcbiAgICAgICAgdHJpYWwuYWNjZXNzID0gMTA7XG4gICAgICAgIHRyaWFsLm9ic2VydmF0aW9uID0gMTA7XG4gICAgfSBlbHNlIHsgLy8gZ2VuZXJhbCB0cmVhdG1lbnQgb2Ygb3RoZXIgdmFsdWVzXG4gICAgICAgIHRyaWFsLmFjY2VzcyA9IE1hdGguZmxvb3IodHJpYWwudmFsdWUvMTApOy8vdGhlIGludGVnZXIgcGFydCBvZiB0cmlhbC52YWx1ZSBkaXZpZGVkIGJ5IDEwIFxuICAgICAgICB0cmlhbC5vYnNlcnZhdGlvbiA9IE1hdGgucm91bmQoMTAqKCh0cmlhbC52YWx1ZS8xMCklMSkpOyAvL2l0J3MgdGhlIGRlY2ltYWwgcGFydCBvZiB0cmlhbC52YWx1ZS8xMCwgdGltZXMgMTAgICAgICAgIFxuICAgIH07XG4gICAgXG4gICAgICAgICAgICBcbiAgICAvL3doYXQgZm9sbG93cyBidWlsZHMgdGhlIGRlc2NyaXB0aW9ucy9pdGVtcy9zdHVmZiB0aGF0IHdpbGwgYmUgZGlzcGxheWVkIG9uIHRoZSBzY3JlZW4sIHJlcGxhY2luZyB3aGF0J3MgbmVlZGVkIGRlcGVuZGluZyBvbiBhY2Nlc3Mvb2JzZXJ2YXRpb24va2luZFxuICAgIFxuICAgIHRyaWFsLnBpYyA9IG1ldGFbJ3BpYyddLnJlcGxhY2UoJ3tWQUxVRX0nLCB0cmlhbC52YWx1ZSkucmVwbGFjZSgne1ZBTFVFYmFja30nLCB0cmlhbC52YWx1ZUJhY2spO1xuICAgICAgICBcbiAgICBpZiAodHJpYWwuYWNjZXNzID09IHRyaWFsLm9ic2VydmF0aW9uKSB7XG4gICAgICAgIFxuICAgICAgICBpZiAodHJpYWwuYWNjZXNzID09IDEwKSB7XG4gICAgICAgICAgICB0cmlhbC5zY2VuYXJpbyA9IG1ldGFbJ3NjZW5hcmlvJ10ucmVwbGFjZSgne0F9JywgXCJhbGwgdGhlXCIpXG4gICAgICAgIH0gICBlbHNlIHtcbiAgICAgICAgICAgIHRyaWFsLnNjZW5hcmlvID0gbWV0YVsnc2NlbmFyaW8nXS5yZXBsYWNlKCd7QX0nLCB0cmlhbC5hY2Nlc3MpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICB0cmlhbC5zY2VuYXJpbyA9IHRyaWFsLnNjZW5hcmlvLnJlcGxhY2UoJ3tPfScsIFwiYWxsXCIpXG4gICAgICAgIFxuICAgIH0gICBlbHNlIHsgLy9pZSBpZiBhY2Nlc3MhPW9ic2VydmF0aW9uXG4gICAgICAgIFxuICAgICAgICBpZiAodHJpYWwuYWNjZXNzID09IDEwKSB7XG4gICAgICAgICAgICB0cmlhbC5zY2VuYXJpbyA9IG1ldGFbJ3NjZW5hcmlvJ10ucmVwbGFjZSgne0F9JywgXCJhbGwgdGhlXCIpXG4gICAgICAgIH0gICBlbHNlIHtcbiAgICAgICAgICAgIHRyaWFsLnNjZW5hcmlvID0gbWV0YVsnc2NlbmFyaW8nXS5yZXBsYWNlKCd7QX0nLCB0cmlhbC5hY2Nlc3MpXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICBpZiAodHJpYWwub2JzZXJ2YXRpb24gPT09IDApIHtcbiAgICAgICAgICAgIHRyaWFsLnNjZW5hcmlvID0gdHJpYWwuc2NlbmFyaW8ucmVwbGFjZSgne099JywgXCJub25lXCIpXG4gICAgICAgIH0gICBlbHNlIHtcbiAgICAgICAgICAgIHRyaWFsLnNjZW5hcmlvID0gdHJpYWwuc2NlbmFyaW8ucmVwbGFjZSgne099JywgdHJpYWwub2JzZXJ2YXRpb24pXG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgfSBcbiAgICBcbiAgICAgICAgXG4gICAgaWYgKHRyaWFsLm9ic2VydmF0aW9uID09IDEpIHtcbiAgICAgICAgdHJpYWwuc2NlbmFyaW89dHJpYWwuc2NlbmFyaW8ucmVwbGFjZSgne0NPUFVMQX0nLCBcImlzXCIpXG4gICAgfSAgIGVsc2Uge1xuICAgICAgICB0cmlhbC5zY2VuYXJpbz10cmlhbC5zY2VuYXJpby5yZXBsYWNlKCd7Q09QVUxBfScsIFwiYXJlXCIpXG4gICAgfVxuICAgICAgICBcbiAgICBcbiAgICB0cmlhbC52PXc7IC8vdXNlZCB0byBjb3VudCB0aGUgdHJpYWxzXG4gICAgdHJpYWwucGVyY2VudGFnZSA9ICgxMDAqdHJpYWwudikvaG93bWFueVxuICAgIHRyaWFsLnBlcmNlbnRhZ2VCaXMgPSAoMTAwKnRyaWFsLnYpL2hvd21hbnlcbiAgICAgICAgXG4gICAgcmV0dXJuIHRyaWFsO1xuICAgIH0pO1xuXG4gICAgY29uc29sZS5sb2cocmVzKTsvL0kgZG9uJ3Qga25vdyB3aHkgSSBoYXZlIHRoaXNcblxuICAgIHJldHVybiByZXM7XG4gICAgXG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSBzZXR1cFRyaWFscztcbiIsInZhciBwc2lUdXJrID0gcmVxdWlyZSgnLi9wc2l0dXJrJyk7XG52YXIgRXhwZXJpbWVudCA9IHJlcXVpcmUoJy4vZXhwZXJpbWVudCcpO1xuXG52YXIgcGFnZXMgPSBbXG5cdFwiaW5zdHJ1Y3Rpb25zL2luc3RydWN0aW9uLmh0bWxcIixcbiAgICBcImluc3RydWN0aW9ucy9pbnN0cnVjdGlvbjAuaHRtbFwiLFxuICAgIFwiaW5zdHJ1Y3Rpb25zL2luc3RydWN0aW9uMS5odG1sXCIsXG4gICAgXCJpbnN0cnVjdGlvbnMvaW5zdHJ1Y3Rpb24zLmh0bWxcIixcbiAgICBcImluc3RydWN0aW9ucy9pbnN0cnVjdGlvbjQuaHRtbFwiLFxuXHRcIml0ZW0uaHRtbFwiLFxuICAgIFwicG9zdHF1ZXN0aW9ubmFpcmUuaHRtbFwiXG5dO1xuXG52YXIgaW5zdHJ1Y3Rpb25QYWdlcyA9IFtcblx0XCJpbnN0cnVjdGlvbnMvaW5zdHJ1Y3Rpb24uaHRtbFwiLFxuICAgIFwiaW5zdHJ1Y3Rpb25zL2luc3RydWN0aW9uMC5odG1sXCIsXG4gICAgXCJpbnN0cnVjdGlvbnMvaW5zdHJ1Y3Rpb24xLmh0bWxcIixcbiAgICBcImluc3RydWN0aW9ucy9pbnN0cnVjdGlvbjMuaHRtbFwiLFxuICAgIFwiaW5zdHJ1Y3Rpb25zL2luc3RydWN0aW9uNC5odG1sXCIsXG5dO1xuXG5wc2lUdXJrLnByZWxvYWRQYWdlcyhwYWdlcyk7XG5cbi8vIFRhc2sgb2JqZWN0IHRvIGtlZXAgdHJhY2sgb2YgdGhlIGN1cnJlbnQgcGhhc2VcbnZhciBjdXJyZW50dmlldztcbnZhciBleHAgPSBuZXcgRXhwZXJpbWVudCgpO1xuXG4vLyBSVU4gVEFTS1xuJCh3aW5kb3cpLmxvYWQoKCkgPT4ge1xuICAgIHBzaVR1cmsuZG9JbnN0cnVjdGlvbnMoXG4gICAgXHRpbnN0cnVjdGlvblBhZ2VzLC8vIGxpc3Qgb2YgaW5zdHJ1Y3Rpb24gcGFnZXMuIHRoZXkgc2hvdWxkIGNvbnRhaW4gYSBidXR0b24gd2l0aCBjbGFzcz1jb250aW51ZS4gd2hlbiBpdCdzIGNsaWNrZWQsIHRoZSBuZXh0IHBhZ2UgaXMgc2hvd24uIGFmdGVyIHRoZSBsYXN0IG9uZSwgdGhlIGZvbGxvd2luZyBmdW5jIGlzIGNhbGxlZFxuICAgICAgICBmdW5jdGlvbigpIHsgY3VycmVudHZpZXcgPSBleHAuc3RhcnQoKTsgfS8vIHN0YXJ0IGlzIGRlZmluZWQgaW4gZXhwZXJpbWVudC5qc1xuICAgICk7XG59KTtcbiJdfQ==
