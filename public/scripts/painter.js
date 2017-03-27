(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports={
    "moose": {
        "width": 26, 
        "height": 15, 
        "colors": [
            "transparent", "white", "black", "navy", "green", "red", "brown",
            "purple", "olive", "yellow", "lime", "teal", "cyan", "blue", "fuchsia",
            "grey", "lightgrey"
        ] 
    }
}

},{}],2:[function(require,module,exports){
(function (global){
/*!
 * deep-diff.
 * Licensed under the MIT License.
 */
;(function(root, factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], function() {
      return factory();
    });
  } else if (typeof exports === 'object') {
    // Node. Does not work with strict CommonJS, but
    // only CommonJS-like environments that support module.exports,
    // like Node.
    module.exports = factory();
  } else {
    // Browser globals (root is window)
    root.DeepDiff = factory();
  }
}(this, function(undefined) {
  'use strict';

  var $scope, conflict, conflictResolution = [];
  if (typeof global === 'object' && global) {
    $scope = global;
  } else if (typeof window !== 'undefined') {
    $scope = window;
  } else {
    $scope = {};
  }
  conflict = $scope.DeepDiff;
  if (conflict) {
    conflictResolution.push(
      function() {
        if ('undefined' !== typeof conflict && $scope.DeepDiff === accumulateDiff) {
          $scope.DeepDiff = conflict;
          conflict = undefined;
        }
      });
  }

  // nodejs compatible on server side and in the browser.
  function inherits(ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  }

  function Diff(kind, path) {
    Object.defineProperty(this, 'kind', {
      value: kind,
      enumerable: true
    });
    if (path && path.length) {
      Object.defineProperty(this, 'path', {
        value: path,
        enumerable: true
      });
    }
  }

  function DiffEdit(path, origin, value) {
    DiffEdit.super_.call(this, 'E', path);
    Object.defineProperty(this, 'lhs', {
      value: origin,
      enumerable: true
    });
    Object.defineProperty(this, 'rhs', {
      value: value,
      enumerable: true
    });
  }
  inherits(DiffEdit, Diff);

  function DiffNew(path, value) {
    DiffNew.super_.call(this, 'N', path);
    Object.defineProperty(this, 'rhs', {
      value: value,
      enumerable: true
    });
  }
  inherits(DiffNew, Diff);

  function DiffDeleted(path, value) {
    DiffDeleted.super_.call(this, 'D', path);
    Object.defineProperty(this, 'lhs', {
      value: value,
      enumerable: true
    });
  }
  inherits(DiffDeleted, Diff);

  function DiffArray(path, index, item) {
    DiffArray.super_.call(this, 'A', path);
    Object.defineProperty(this, 'index', {
      value: index,
      enumerable: true
    });
    Object.defineProperty(this, 'item', {
      value: item,
      enumerable: true
    });
  }
  inherits(DiffArray, Diff);

  function arrayRemove(arr, from, to) {
    var rest = arr.slice((to || from) + 1 || arr.length);
    arr.length = from < 0 ? arr.length + from : from;
    arr.push.apply(arr, rest);
    return arr;
  }

  function realTypeOf(subject) {
    var type = typeof subject;
    if (type !== 'object') {
      return type;
    }

    if (subject === Math) {
      return 'math';
    } else if (subject === null) {
      return 'null';
    } else if (Array.isArray(subject)) {
      return 'array';
    } else if (Object.prototype.toString.call(subject) === '[object Date]') {
      return 'date';
    } else if (typeof subject.toString !== 'undefined' && /^\/.*\//.test(subject.toString())) {
      return 'regexp';
    }
    return 'object';
  }

  function deepDiff(lhs, rhs, changes, prefilter, path, key, stack) {
    path = path || [];
    var currentPath = path.slice(0);
    if (typeof key !== 'undefined') {
      if (prefilter) {
        if (typeof(prefilter) === 'function' && prefilter(currentPath, key)) { return; }
        else if (typeof(prefilter) === 'object') {
          if (prefilter.prefilter && prefilter.prefilter(currentPath, key)) { return; }
          if (prefilter.normalize) {
            var alt = prefilter.normalize(currentPath, key, lhs, rhs);
            if (alt) {
              lhs = alt[0];
              rhs = alt[1];
            }
          }
        }
      }
      currentPath.push(key);
    }

    // Use string comparison for regexes
    if (realTypeOf(lhs) === 'regexp' && realTypeOf(rhs) === 'regexp') {
      lhs = lhs.toString();
      rhs = rhs.toString();
    }

    var ltype = typeof lhs;
    var rtype = typeof rhs;
    if (ltype === 'undefined') {
      if (rtype !== 'undefined') {
        changes(new DiffNew(currentPath, rhs));
      }
    } else if (rtype === 'undefined') {
      changes(new DiffDeleted(currentPath, lhs));
    } else if (realTypeOf(lhs) !== realTypeOf(rhs)) {
      changes(new DiffEdit(currentPath, lhs, rhs));
    } else if (Object.prototype.toString.call(lhs) === '[object Date]' && Object.prototype.toString.call(rhs) === '[object Date]' && ((lhs - rhs) !== 0)) {
      changes(new DiffEdit(currentPath, lhs, rhs));
    } else if (ltype === 'object' && lhs !== null && rhs !== null) {
      stack = stack || [];
      if (stack.indexOf(lhs) < 0) {
        stack.push(lhs);
        if (Array.isArray(lhs)) {
          var i, len = lhs.length;
          for (i = 0; i < lhs.length; i++) {
            if (i >= rhs.length) {
              changes(new DiffArray(currentPath, i, new DiffDeleted(undefined, lhs[i])));
            } else {
              deepDiff(lhs[i], rhs[i], changes, prefilter, currentPath, i, stack);
            }
          }
          while (i < rhs.length) {
            changes(new DiffArray(currentPath, i, new DiffNew(undefined, rhs[i++])));
          }
        } else {
          var akeys = Object.keys(lhs);
          var pkeys = Object.keys(rhs);
          akeys.forEach(function(k, i) {
            var other = pkeys.indexOf(k);
            if (other >= 0) {
              deepDiff(lhs[k], rhs[k], changes, prefilter, currentPath, k, stack);
              pkeys = arrayRemove(pkeys, other);
            } else {
              deepDiff(lhs[k], undefined, changes, prefilter, currentPath, k, stack);
            }
          });
          pkeys.forEach(function(k) {
            deepDiff(undefined, rhs[k], changes, prefilter, currentPath, k, stack);
          });
        }
        stack.length = stack.length - 1;
      }
    } else if (lhs !== rhs) {
      if (!(ltype === 'number' && isNaN(lhs) && isNaN(rhs))) {
        changes(new DiffEdit(currentPath, lhs, rhs));
      }
    }
  }

  function accumulateDiff(lhs, rhs, prefilter, accum) {
    accum = accum || [];
    deepDiff(lhs, rhs,
      function(diff) {
        if (diff) {
          accum.push(diff);
        }
      },
      prefilter);
    return (accum.length) ? accum : undefined;
  }

  function applyArrayChange(arr, index, change) {
    if (change.path && change.path.length) {
      var it = arr[index],
          i, u = change.path.length - 1;
      for (i = 0; i < u; i++) {
        it = it[change.path[i]];
      }
      switch (change.kind) {
        case 'A':
          applyArrayChange(it[change.path[i]], change.index, change.item);
          break;
        case 'D':
          delete it[change.path[i]];
          break;
        case 'E':
        case 'N':
          it[change.path[i]] = change.rhs;
          break;
      }
    } else {
      switch (change.kind) {
        case 'A':
          applyArrayChange(arr[index], change.index, change.item);
          break;
        case 'D':
          arr = arrayRemove(arr, index);
          break;
        case 'E':
        case 'N':
          arr[index] = change.rhs;
          break;
      }
    }
    return arr;
  }

  function applyChange(target, source, change) {
    if (target && source && change && change.kind) {
      var it = target,
          i = -1,
          last = change.path ? change.path.length - 1 : 0;
      while (++i < last) {
        if (typeof it[change.path[i]] === 'undefined') {
          it[change.path[i]] = (typeof change.path[i] === 'number') ? [] : {};
        }
        it = it[change.path[i]];
      }
      switch (change.kind) {
        case 'A':
          applyArrayChange(change.path ? it[change.path[i]] : it, change.index, change.item);
          break;
        case 'D':
          delete it[change.path[i]];
          break;
        case 'E':
        case 'N':
          it[change.path[i]] = change.rhs;
          break;
      }
    }
  }

  function revertArrayChange(arr, index, change) {
    if (change.path && change.path.length) {
      // the structure of the object at the index has changed...
      var it = arr[index],
          i, u = change.path.length - 1;
      for (i = 0; i < u; i++) {
        it = it[change.path[i]];
      }
      switch (change.kind) {
        case 'A':
          revertArrayChange(it[change.path[i]], change.index, change.item);
          break;
        case 'D':
          it[change.path[i]] = change.lhs;
          break;
        case 'E':
          it[change.path[i]] = change.lhs;
          break;
        case 'N':
          delete it[change.path[i]];
          break;
      }
    } else {
      // the array item is different...
      switch (change.kind) {
        case 'A':
          revertArrayChange(arr[index], change.index, change.item);
          break;
        case 'D':
          arr[index] = change.lhs;
          break;
        case 'E':
          arr[index] = change.lhs;
          break;
        case 'N':
          arr = arrayRemove(arr, index);
          break;
      }
    }
    return arr;
  }

  function revertChange(target, source, change) {
    if (target && source && change && change.kind) {
      var it = target,
          i, u;
      u = change.path.length - 1;
      for (i = 0; i < u; i++) {
        if (typeof it[change.path[i]] === 'undefined') {
          it[change.path[i]] = {};
        }
        it = it[change.path[i]];
      }
      switch (change.kind) {
        case 'A':
          // Array was modified...
          // it will be an array...
          revertArrayChange(it[change.path[i]], change.index, change.item);
          break;
        case 'D':
          // Item was deleted...
          it[change.path[i]] = change.lhs;
          break;
        case 'E':
          // Item was edited...
          it[change.path[i]] = change.lhs;
          break;
        case 'N':
          // Item is new...
          delete it[change.path[i]];
          break;
      }
    }
  }

  function applyDiff(target, source, filter) {
    if (target && source) {
      var onChange = function(change) {
        if (!filter || filter(target, source, change)) {
          applyChange(target, source, change);
        }
      };
      deepDiff(target, source, onChange);
    }
  }

  Object.defineProperties(accumulateDiff, {

    diff: {
      value: accumulateDiff,
      enumerable: true
    },
    observableDiff: {
      value: deepDiff,
      enumerable: true
    },
    applyDiff: {
      value: applyDiff,
      enumerable: true
    },
    applyChange: {
      value: applyChange,
      enumerable: true
    },
    revertChange: {
      value: revertChange,
      enumerable: true
    },
    isConflict: {
      value: function() {
        return 'undefined' !== typeof conflict;
      },
      enumerable: true
    },
    noConflict: {
      value: function() {
        if (conflictResolution) {
          conflictResolution.forEach(function(it) {
            it();
          });
          conflictResolution = null;
        }
        return accumulateDiff;
      },
      enumerable: true
    }
  });

  return accumulateDiff;
}));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],3:[function(require,module,exports){
/* FileSaver.js
 * A saveAs() FileSaver implementation.
 * 1.3.2
 * 2016-06-16 18:25:19
 *
 * By Eli Grey, http://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */

/*global self */
/*jslint bitwise: true, indent: 4, laxbreak: true, laxcomma: true, smarttabs: true, plusplus: true */

/*! @source http://purl.eligrey.com/github/FileSaver.js/blob/master/FileSaver.js */

var saveAs = saveAs || (function(view) {
	"use strict";
	// IE <10 is explicitly unsupported
	if (typeof view === "undefined" || typeof navigator !== "undefined" && /MSIE [1-9]\./.test(navigator.userAgent)) {
		return;
	}
	var
		  doc = view.document
		  // only get URL when necessary in case Blob.js hasn't overridden it yet
		, get_URL = function() {
			return view.URL || view.webkitURL || view;
		}
		, save_link = doc.createElementNS("http://www.w3.org/1999/xhtml", "a")
		, can_use_save_link = "download" in save_link
		, click = function(node) {
			var event = new MouseEvent("click");
			node.dispatchEvent(event);
		}
		, is_safari = /constructor/i.test(view.HTMLElement) || view.safari
		, is_chrome_ios =/CriOS\/[\d]+/.test(navigator.userAgent)
		, throw_outside = function(ex) {
			(view.setImmediate || view.setTimeout)(function() {
				throw ex;
			}, 0);
		}
		, force_saveable_type = "application/octet-stream"
		// the Blob API is fundamentally broken as there is no "downloadfinished" event to subscribe to
		, arbitrary_revoke_timeout = 1000 * 40 // in ms
		, revoke = function(file) {
			var revoker = function() {
				if (typeof file === "string") { // file is an object URL
					get_URL().revokeObjectURL(file);
				} else { // file is a File
					file.remove();
				}
			};
			setTimeout(revoker, arbitrary_revoke_timeout);
		}
		, dispatch = function(filesaver, event_types, event) {
			event_types = [].concat(event_types);
			var i = event_types.length;
			while (i--) {
				var listener = filesaver["on" + event_types[i]];
				if (typeof listener === "function") {
					try {
						listener.call(filesaver, event || filesaver);
					} catch (ex) {
						throw_outside(ex);
					}
				}
			}
		}
		, auto_bom = function(blob) {
			// prepend BOM for UTF-8 XML and text/* types (including HTML)
			// note: your browser will automatically convert UTF-16 U+FEFF to EF BB BF
			if (/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(blob.type)) {
				return new Blob([String.fromCharCode(0xFEFF), blob], {type: blob.type});
			}
			return blob;
		}
		, FileSaver = function(blob, name, no_auto_bom) {
			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			// First try a.download, then web filesystem, then object URLs
			var
				  filesaver = this
				, type = blob.type
				, force = type === force_saveable_type
				, object_url
				, dispatch_all = function() {
					dispatch(filesaver, "writestart progress write writeend".split(" "));
				}
				// on any filesys errors revert to saving with object URLs
				, fs_error = function() {
					if ((is_chrome_ios || (force && is_safari)) && view.FileReader) {
						// Safari doesn't allow downloading of blob urls
						var reader = new FileReader();
						reader.onloadend = function() {
							var url = is_chrome_ios ? reader.result : reader.result.replace(/^data:[^;]*;/, 'data:attachment/file;');
							var popup = view.open(url, '_blank');
							if(!popup) view.location.href = url;
							url=undefined; // release reference before dispatching
							filesaver.readyState = filesaver.DONE;
							dispatch_all();
						};
						reader.readAsDataURL(blob);
						filesaver.readyState = filesaver.INIT;
						return;
					}
					// don't create more object URLs than needed
					if (!object_url) {
						object_url = get_URL().createObjectURL(blob);
					}
					if (force) {
						view.location.href = object_url;
					} else {
						var opened = view.open(object_url, "_blank");
						if (!opened) {
							// Apple does not allow window.open, see https://developer.apple.com/library/safari/documentation/Tools/Conceptual/SafariExtensionGuide/WorkingwithWindowsandTabs/WorkingwithWindowsandTabs.html
							view.location.href = object_url;
						}
					}
					filesaver.readyState = filesaver.DONE;
					dispatch_all();
					revoke(object_url);
				}
			;
			filesaver.readyState = filesaver.INIT;

			if (can_use_save_link) {
				object_url = get_URL().createObjectURL(blob);
				setTimeout(function() {
					save_link.href = object_url;
					save_link.download = name;
					click(save_link);
					dispatch_all();
					revoke(object_url);
					filesaver.readyState = filesaver.DONE;
				});
				return;
			}

			fs_error();
		}
		, FS_proto = FileSaver.prototype
		, saveAs = function(blob, name, no_auto_bom) {
			return new FileSaver(blob, name || blob.name || "download", no_auto_bom);
		}
	;
	// IE 10+ (native saveAs)
	if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
		return function(blob, name, no_auto_bom) {
			name = name || blob.name || "download";

			if (!no_auto_bom) {
				blob = auto_bom(blob);
			}
			return navigator.msSaveOrOpenBlob(blob, name);
		};
	}

	FS_proto.abort = function(){};
	FS_proto.readyState = FS_proto.INIT = 0;
	FS_proto.WRITING = 1;
	FS_proto.DONE = 2;

	FS_proto.error =
	FS_proto.onwritestart =
	FS_proto.onprogress =
	FS_proto.onwrite =
	FS_proto.onabort =
	FS_proto.onerror =
	FS_proto.onwriteend =
		null;

	return saveAs;
}(
	   typeof self !== "undefined" && self
	|| typeof window !== "undefined" && window
	|| this.content
));
// `self` is undefined in Firefox for Android content script context
// while `this` is nsIContentFrameMessageManager
// with an attribute `content` that corresponds to the window

if (typeof module !== "undefined" && module.exports) {
  module.exports.saveAs = saveAs;
} else if ((typeof define !== "undefined" && define !== null) && (define.amd !== null)) {
  define("FileSaver.js", function() {
    return saveAs;
  });
}

},{}],4:[function(require,module,exports){
(function (process){
/*
 * gridpaint - a canvas for creating grid-based art in the browser
 * Copyright (C) 2016 Mister Hat
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3.0 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 */

var EventEmitter = require('events'),

    inherits = require('inherits'),

    Canvas = require('./lib/canvas'),
    draw = require('./lib/draw'),
    handlers = require('./lib/handlers'),
    save = require('./lib/save'),
    tools = require('./lib/tools');

var DEFAULT_PALETTE = [ 'transparent', '#fff', '#c0c0c0', '#808080', '#000',
                        '#f00', '#800', '#ff0', '#808000', '#0f0', '#080',
                        '#0ff', '#008080', '#00f', '#000080', '#f0f',
                        '#800080' ];

function GridPaint(options) {
    // use as a constructor without `new`
    if (!(this instanceof GridPaint)) {
        return new GridPaint(options);
    }

    options = options || {};
    EventEmitter.call(this);

    this.width = options.width || 16;
    this.height = options.height || this.width;
    this.cellWidth = options.cellWidth || 16;
    this.cellHeight = options.cellHeight || this.cellWidth;
    this.palette = options.palette || DEFAULT_PALETTE;

    this.canvas = new Canvas(this.width * this.cellWidth,
                             this.height * this.cellHeight);
    this.ctx = this.canvas.getContext('2d');

    this.background = true;
    this.colour = 0;
    this.cursor = { x: -1, y: -1 };
    this.grid = false;
    this.gridColour = '#000';
    this.isApplied = false;
    this.painting = [];
    this.redoHistory = [];
    this.tool = 'pencil';
    this.undoHistory = [];

    if (process.browser) {
        this.canvas.className = 'gridpaint-canvas';
        this.canvas.style.cursor = 'crosshair';

        if (/firefox/i.test(navigator.userAgent)) {
            this.canvas.style.imageRendering = '-moz-crisp-edges';
        } else {
            this.canvas.style.imageRendering = 'pixelated';
        }

        this.dom = this.canvas;

        // cache because creating functions is expensive
        this.boundDraw = this.draw.bind(this);
    }

    this.clear();
}

inherits(GridPaint, EventEmitter);

GridPaint.prototype.resize = function () {
    this.canvas.width = this.width * this.cellWidth;
    this.canvas.height = this.height * this.cellHeight;
};

// perform the current tool's action on the painting
GridPaint.prototype.action = function () {
    this[this.tool]();
    this.emit('action');
};

GridPaint.prototype.applyTool = tools.apply;
GridPaint.prototype.bucket = tools.bucket;
GridPaint.prototype.clear = tools.clear;
GridPaint.prototype.compareChanges = tools.compare;
GridPaint.prototype.contrastGrid = tools.contrast;
GridPaint.prototype.pencil = tools.pencil;
GridPaint.prototype.redo = tools.redo;
GridPaint.prototype.replace = tools.replace;
GridPaint.prototype.undo = tools.undo;

GridPaint.prototype.drawBackground = draw.background;
GridPaint.prototype.drawCursor = draw.cursor;
GridPaint.prototype.drawGrid = draw.grid;
GridPaint.prototype.drawPainting = draw.painting;
GridPaint.prototype.draw = draw.tick;

GridPaint.prototype.saveAs = save;

GridPaint.prototype.attachHandlers = handlers.attach;
GridPaint.prototype.detachHandlers = handlers.detach;

// attach handlers & start draw loop
GridPaint.prototype.init = function () {
    this.attachHandlers();
    this.drawing = true;
    this.draw();
};

// detach handlers & start draw loop
GridPaint.prototype.destroy = function () {
    this.detachHandlers();
    this.drawing = false;
};

module.exports = GridPaint;

}).call(this,require('_process'))
},{"./lib/canvas":6,"./lib/draw":9,"./lib/handlers":10,"./lib/save":12,"./lib/tools":13,"_process":19,"events":18,"inherits":14}],5:[function(require,module,exports){
// fill in surrounding, like-coloured grid units
module.exports = function (replace, x, y) {
    var colour = this.colour;

    x = typeof x !== 'undefined' ? x : this.cursor.x;
    y = typeof y !== 'undefined' ? y : this.cursor.y;
    replace = typeof replace !== 'undefined' ? replace : this.painting[y][x];

    if (replace === colour || this.painting[y][x] !== replace) {
        return;
    }

    this.painting[y][x] = colour;

    if ((y + 1) < this.height) {
        this.bucket(replace, x, y + 1);
    }

    if ((y - 1) > -1) {
        this.bucket(replace, x, y - 1);
    }

    if ((x + 1) < this.width) {
        this.bucket(replace, x + 1, y);
    }

    if ((x - 1) > -1) {
        this.bucket(replace, x - 1, y);
    }
};

},{}],6:[function(require,module,exports){
(function (process){
if (process.browser) {
    module.exports = function (width, height) {
        var c = document.createElement('canvas');
        c.width = width || 300;
        c.height = height || 150;
        return c;
    };
} else {
    module.exports = require('canvas');
}

}).call(this,require('_process'))
},{"_process":19,"canvas":17}],7:[function(require,module,exports){
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// empty all of the grid units
module.exports = function () {
    var i, j;

    // allow the user to undo a clear
    if (Array.isArray(this.painting) && Array.isArray(this.painting[0])) {
        this.oldPainting = clone(this.painting);
    }

    this.painting.length = 0;

    for (i = 0; i < this.height; i += 1) {
        this.painting.push([]);
        for (j = 0; j < this.width; j += 1) {
            this.painting[i].push(0);
        }
    }

    this.compareChanges();
    this.emit('clear');
};

},{}],8:[function(require,module,exports){
// set a contrasting grid colour
module.exports = function () {
    var cw, ch, data, darkCells, i, j, offset, r, g, b, y;

    if (!this.grid) {
        return;
    }

    cw = this.cellWidth;
    ch = this.cellHeight;
    data = this.ctx.getImageData(0, 0, this.canvas.width,
                                 this.canvas.height).data;
    darkCells = 0;

    for (i = 0; i < this.width * cw; i += cw - 1) {
        for (j = 0; j < this.height * ch; j += ch - 1) {
            offset = (j * this.canvas.width + i) * 4;
            r = data[offset];
            g = data[offset + 1];
            b = data[offset + 2];
            y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            darkCells += y < 128;
        }
    }

    if (darkCells > (this.width * this.height) / 2) {
        this.gridColour = '#fff';
    } else {
        this.gridColour = '#000';
    }
};

},{}],9:[function(require,module,exports){
// draw the checkered pattern to indicate transparency
exports.background = function () {
    var odd = false,
        cw = this.cellWidth,
        ch = this.cellHeight,
        i, j;

    for (i = 0; i < this.width * 2; i += 1) {
        for (j = 0; j < this.height * 2; j += 1) {
            this.ctx.fillStyle = odd ? '#999' : '#666';
            this.ctx.fillRect(i * (cw / 2), j * (ch / 2), cw / 2, ch / 2);
            odd = !odd;
        }
        odd = !odd;
    }
};

// overlap the current colour as a crosshair over the position it will be
// applied to
exports.cursor = function () {
    var cw, ch, x, y;

    if (this.cursor.x < 0 || this.cursor.y < 0) {
        return;
    }

    cw = this.cellWidth;
    ch = this.cellHeight;
    x = this.cursor.x;
    y = this.cursor.y;

    this.ctx.globalAlpha = 0.8;
    this.ctx.fillStyle = this.palette[this.colour];
    this.ctx.fillRect(x * cw + cw / 4, y * ch, cw / 2, ch);
    this.ctx.fillRect(x * cw, y * ch + ch / 4, cw, ch / 2);
    this.ctx.globalAlpha = 1;
};

// draw contrasting grid units
exports.grid = function () {
    var cw = this.cellWidth,
        ch = this.cellHeight,
        i;

    this.ctx.strokeStyle = this.gridColour;

    for (i = 0; i < this.width; i += 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(i * cw + 0.5, 0);
        this.ctx.lineTo(i * cw + 0.5, ch * this.height);
        this.ctx.stroke();
    }

    for (i = 0; i < this.height; i += 1) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, i * ch + 0.5);
        this.ctx.lineTo(cw * this.width, i * ch + 0.5);
        this.ctx.stroke();
    }
};

// draw the grid units onto a canvas
exports.painting = function (ctx, scale) {
    var cw = this.cellWidth,
        ch = this.cellHeight,
        i, j;

    // this is just so we can re-use this function on the export
    ctx = ctx || this.ctx;
    scale = scale || 1;

    for (i = 0; i < this.height; i += 1) {
        for (j = 0; j < this.width; j += 1) {
            ctx.fillStyle = this.palette[this.painting[i][j]] || 'transparent';
            ctx.fillRect(j * cw * scale, i * ch * scale, cw * scale,
                         ch * scale);
        }
    }
};

exports.tick = function () {
    if (this.background) {
        this.drawBackground();
    } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.drawPainting();
    this.drawCursor();

    if (this.grid) {
        this.drawGrid();
    }

    if (this.drawing) {
        window.requestAnimationFrame(this.boundDraw);
    }
};

},{}],10:[function(require,module,exports){
(function (process){
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

var handlers = {
    mousemove: function (e) {
        var cw = this.cellWidth,
            ch = this.cellHeight,
            rect = this.canvas.getBoundingClientRect(),
            x = e.pageX - rect.left - window.scrollX,
            y = e.pageY - rect.top - window.scrollY;

        this.cursor.x = Math.floor(x / this.width * (this.width / cw));
        this.cursor.y = Math.floor(y / this.height * (this.height / ch));

        if (this.isApplied) {
            this.action();
        }

        this.emit('move');
    },
    mousedown: function () {
        // create a clone to compare changes for undo history
        this.oldPainting = clone(this.painting);
        this.applyTool(true);
    },
    mouseup: function () {
        if (this.isApplied) {
            this.applyTool(false);
            this.compareChanges();
        }
    }
};

// activate event handlers
module.exports.attach = function () {
    var that;

    if (!process.browser) {
        return;
    }

    that = this;
    this.events = {};

    Object.keys(handlers).forEach(function (e) {
        that.events[e] = handlers[e].bind(that);
        that.canvas.addEventListener(e, that.events[e], false);
    });

    // in case the user drags away from the canvas element
    window.addEventListener('mouseup', that.events.mouseup, false);
};

// remove all the event listeners & cease the draw loop
module.exports.detach = function () {
    var that;

    if (!process.browser) {
        return;
    }

    that = this;

    Object.keys(handlers).forEach(function (e) {
        that.canvas.removeEventListener(e, that.events[e], false);
    });

    window.removeEventListener('mouseup', that.events.mouseup, false);
};

}).call(this,require('_process'))
},{"_process":19}],11:[function(require,module,exports){
function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// replace all of a certain colour with another
module.exports = function (old, replace) {
    var i, j, c;

    if (old === replace) {
        return;
    }

    if (typeof old === 'string') {
        old = this.palette.indexOf(old);
    }

    if (typeof replace === 'string') {
        replace = this.palette.indexOf(replace);
    }

    this.oldPainting = clone(this.painting);
    this.painting.length = 0;

    for (i = 0; i < this.height; i += 1) {
        this.painting.push([]);
        for (j = 0; j < this.width; j += 1) {
            c = this.oldPainting[i][j];
            this.painting[i].push(c === old ? replace : c);
        }
    }

    this.compareChanges();
    this.emit('replace');
};

},{}],12:[function(require,module,exports){
(function (process){
var FileSaver = require('file-saver'),

    Canvas = require('./canvas');

// export the painting to file
module.exports = function (file, scale) {
    var exported = new Canvas(),
        eCtx = exported.getContext('2d');

    file = file || 'painting.png';
    scale = scale || 1;

    exported.width = this.width * this.cellWidth * scale;
    exported.height = this.height * this.cellHeight * scale;
    this.drawPainting(eCtx, scale);

    if (process.title === 'browser') {
        exported.toBlob(function (blob) {
            FileSaver.saveAs(blob, file);
        });
    } else {
        exported.pngStream().pipe(require('fs').createWriteStream('./' + file));
    }
};

}).call(this,require('_process'))
},{"./canvas":6,"_process":19,"file-saver":3,"fs":16}],13:[function(require,module,exports){
var FileSaver = require('file-saver'),
    deepDiff = require('deep-diff'),

    bucket = require('./bucket'),
    clear = require('./clear'),
    contrast = require('./contrast'),
    replace = require('./replace');

var MAX_HISTORY = 99;

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function pushHistory(top, bottom, doChange) {
    var that, changes;

    if (!top.length) {
        return;
    }

    that = this;
    changes = top.pop();

    bottom.push(clone(changes));

    if (!changes) {
        return;
    }

    changes.forEach(function (change) {
        doChange(that.painting, that.painting, change);
    });

    setTimeout(this.contrastGrid.bind(this), 100);
}

// activated when the user's finger or mouse is pressed
exports.apply = function (isApplied) {
    if (typeof isApplied !== 'undefined') {
        this.isApplied = isApplied;
    } else {
        this.isApplied = !this.isApplied;
    }

    // activate the tool for initial mouse press
    if (this.isApplied) {
        this.action();
    }

    this.emit('applyTool', this.isApplied);
};

exports.bucket = bucket;
exports.clear = clear;

// compared oldPainting to painting & push the changes to history
exports.compare = function () {
    var changes = deepDiff.diff(this.oldPainting, this.painting);

    if (!changes) {
        return;
    }

    this.contrastGrid();

    changes = changes.filter(function (change) {
        return change.kind === 'E';
    });

    if (changes.length) {
        this.undoHistory.push(changes);
        this.undoHistory.splice(0, this.undoHistory.length - MAX_HISTORY);
        this.redoHistory.length = 0;
    }
};

exports.contrast = contrast;

// fill in grid units one by one
exports.pencil = function () {
    var x = this.cursor.x,
        y = this.cursor.y;

    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
        this.painting[y][x] = this.colour;
    }
};

// redo the last painting action performed (if any)
exports.redo = function () {
    pushHistory.bind(this, this.redoHistory, this.undoHistory,
                     deepDiff.applyChange)();
    this.emit('redo');
};

exports.replace = replace;

// undo the last painting action performed (if any)
exports.undo = function () {
    pushHistory.bind(this, this.undoHistory, this.redoHistory,
                     deepDiff.revertChange)();
    this.emit('undo');
};

},{"./bucket":5,"./clear":7,"./contrast":8,"./replace":11,"deep-diff":2,"file-saver":3}],14:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],15:[function(require,module,exports){
const GridPaint = require('gridpaint'),
      config = require('./config');

let painter = new GridPaint({
    width: config.moose.width,
    height: config.moose.height,
    cellWidth: 16,
    cellHeight: 24
});

function start() {
    let container = document.getElementById('moose-canvas'),
        tools = document.getElementById('moose-tools'),
        palette = document.getElementById('moose-palette');

    if (!container || !tools || !palette) {
        return alert('unable to load gridpainter');
    }

    let actions = [ 'pencil', 'bucket', 'undo', 'redo', 'clear', 'saveAs' ];
    actions.forEach((action, i) => {
        let button = document.createElement('a');
        button.classList.add('button');
        button.innerText = action;
        button.onclick = () => {
            if (i < 2) {
                painter.tool = action;
            } else {
                painter[action]();
            }
        };
        tools.appendChild(button);
    });

    container.appendChild(painter.dom);

    painter.palette.forEach((color, i) => {
        let button = document.createElement('button');
        button.style.backgroundColor = color;
        button.style.border = '1px solid #000';
        button.style.marginRight = '4px';
        button.style.color = 'white';
        button.innerText = '\xa0';
        button.title = 'switch to ' + color;
        button.onclick = () => painter.colour = i;
        palette.appendChild(button);
    });

    painter.init();
}

if (window.attachEvent) {
    window.attachEvent('onload', start);
} else {
    if (window.onload) {
        let curronload = window.onload;

        window.onload = (event) => {
            curronload(event);
            start();
        };
    } else {
        window.onload = start;
    }
}

},{"./config":1,"gridpaint":4}],16:[function(require,module,exports){

},{}],17:[function(require,module,exports){
arguments[4][16][0].apply(exports,arguments)
},{"dup":16}],18:[function(require,module,exports){
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

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],19:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

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

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[15]);
