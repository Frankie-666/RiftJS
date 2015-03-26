(function(undef) {
'use strict';

var global = Function('return this;')();

/*!
 * https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero
 */
function svz(a, b) {
	return a === b || a != a && b != b;
}

/* eslint-disable no-unused-vars */
function isEmpty(obj) {
	for (var any in obj) {
		return false;
	}
	return true;
}
/* eslint-enable no-unused-vars */

function emptyFn() {}

var hasOwn = Object.prototype.hasOwnProperty;
var slice = Array.prototype.slice;

/**
 * @namespace Rift
 */
var _;

if (typeof exports != 'undefined') {
	_ = exports;
} else {
	_ = global.Rift = {};
}

_.global = global;

var isServer = _.isServer = typeof window == 'undefined' && typeof navigator == 'undefined';
var isClient = _.isClient = !isServer;

/**
 * @memberOf Rift
 *
 * @param {*} err
 */
function logError(err) {
	console.error(err === Object(err) && err.stack || err);
}

_.logError = logError;

var $;

if (isClient) {
	$ = _.$ = global.jQuery || global.Zepto || global.ender || global.$;
}

var keyListeningInner = '_rt-listeningInner';

/*!
 * https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 */
if (!Object.assign) {
	Object.defineProperty(Object, 'assign', {
		configurable: true,
		writable: true,
		value: function(obj, source) {
			if (obj == null) {
				throw new TypeError('Can\'t convert ' + obj + ' to an object');
			}

			obj = Object(obj);

			for (var i = 1, l = arguments.length; i < l; i++) {
				source = arguments[i];

				if (source == null) {
					throw new TypeError('Can\'t convert ' + source + ' to an object');
				}

				source = Object(source);

				var keys = Object.keys(source);

				for (var j = 0, m = keys.length; j < m; j++) {
					obj[keys[j]] = source[keys[j]];
				}
			}

			return obj;
		}
	});
}

(function() {

	var uidCounter = 0;

	/**
	 * Генерирует уникальный идентификатор.
	 *
	 * @function next
	 * @memberOf Rift.uid
	 *
	 * @example
	 * nextUID(); // => '1'
	 * nextUID(); // => '2'
	 * nextUID(); // => '3'
	 *
	 * @param {string} [prefix='']
	 * @returns {string}
	 */
	function nextUID(prefix) {
		return (prefix === undef ? '' : prefix) + (++uidCounter);
	}

	/**
	 * @function resetCounter
	 * @memberOf Rift.uid
	 */
	function resetUIDCounter() {
		uidCounter = 0;
	}

	/**
	 * @namespace Rift.uid
	 */
	_.uid = {
		next: nextUID,
		resetCounter: resetUIDCounter
	};

})();

(function() {

	var nextUID = _.uid.next;

	var keyUID = '_rt-uid';

	/**
	 * Получает уникальный идентификатор объекта.
	 *
	 * @memberOf Rift.object
	 *
	 * @param {Object} obj
	 * @param {string} [prefix]
	 * @returns {string}
	 */
	function getUID(obj, prefix) {
		if (!hasOwn.call(obj, keyUID)) {
			Object.defineProperty(obj, keyUID, {
				value: nextUID(prefix)
			});
		}

		return obj[keyUID];
	}

	/**
	 * Получает дескрипторы перечисляемых свойств (в том числе унаследованых).
	 *
	 * @memberOf Rift.object
	 *
	 * @example
	 * var obj = { __proto__: { inheritedProp: 1 }, prop: 1 };
	 *
	 * console.log(Object.getOwnPropertyDescriptor(obj, 'inheritedProp')); // undefined
	 * console.log(getPropertyDescriptors(obj)); // { inheritedProp: { value: 1, ... }, prop: { value: 1, ... } }
	 *
	 * @param {Object} obj
	 * @returns {Object}
	 */
	function getPropertyDescriptors(obj) {
		var names = {};
		var nameCount = 0;

		for (var name in obj) {
			names[name] = true;
			nameCount++;
		}

		if (!nameCount) {
			return {};
		}

		var descrs = {};

		while (true) {
			for (var name in names) {
				if (hasOwn.call(obj, name)) {
					descrs[name] = Object.getOwnPropertyDescriptor(obj, name);
					delete names[name];
					nameCount--;
				}
			}

			if (!nameCount) {
				return descrs;
			}

			obj = Object.getPrototypeOf(obj);
		}
	}

	/**
	 * @memberOf Rift.object
	 *
	 * @param {Object} obj
	 * @returns {Object}
	 */
	function getDataPropertyValues(obj) {
		var descrs = getPropertyDescriptors(obj);
		var values = {};

		for (var name in descrs) {
			if (hasOwn.call(descrs[name], 'value')) {
				values[name] = descrs[name].value;
			}
		}

		return values;
	}

	/**
	 * @memberOf Rift.object
	 *
	 * @param {Object} obj
	 * @param {Object} source
	 * @param {boolean} [skipDontEnum=false]
	 * @returns {Object}
	 */
	function mixin(obj, source, skipDontEnum) {
		var names = Object[skipDontEnum ? 'keys' : 'getOwnPropertyNames'](source);

		for (var i = names.length; i;) {
			Object.defineProperty(obj, names[--i], Object.getOwnPropertyDescriptor(source, names[i]));
		}

		return obj;
	}

	/**
	 * @function clone
	 * @memberOf Rift.object
	 *
	 * @param {Object} obj
	 * @returns {Object}
	 */
	function cloneObject(obj) {
		return mixin(Object.create(Object.getPrototypeOf(obj)), obj);
	}

	/**
	 * @namespace Rift.object
	 */
	_.object = {
		getUID: getUID,
		getPropertyDescriptors: getPropertyDescriptors,
		getDataPropertyValues: getDataPropertyValues,
		mixin: mixin,
		clone: cloneObject
	};

})();

(function() {

	/**
	 * Создаёт простанство имён или возвращает существующее.
	 *
	 * @function create
	 * @memberOf Rift.namespace
	 *
	 * @param {string|Array} id - Имена, разделённые точкой, или массив имён.
	 * @param {Object} [root=global]
	 * @returns {Object}
	 */
	function createNamespace(id, root) {
		if (typeof id == 'string') {
			id = id.split('.');
		}

		var ns = root || global;

		for (var i = 0, l = id.length; i < l; i++) {
			var value = ns[id[i]];

			if (value !== Object(value)) {
				do {
					ns = ns[id[i]] = {};
				} while (++i < l);

				break;
			}

			ns = value;
		}

		return ns;
	}

	/**
	 * @function exec
	 * @memberOf Rift.namespace
	 *
	 * @param {string} id
	 * @param {Object} [root=global]
	 * @returns {*}
	 */
	function execNamespace(id, root) {
		return Function('return this.' + id + ';').call(root || global);
	}

	/**
	 * @namespace Rift.namespace
	 */
	_.namespace = {
		create: createNamespace,
		exec: execNamespace
	};

})();

(function() {

	var reEscapableChars = /([?+|$(){}[^.\-\]\/\\*])/g;

	/**
	 * Экранирует спецсимволы регулярного выражения.
	 *
	 * @function escape
	 * @memberOf Rift.regex
	 *
	 * @example
	 * var re = 'Hello?!*`~World+()[]';
	 * re = new RegExp(escapeRegExp(re));
	 * console.log(re); // /Hello\?!\*`~World\+\(\)\[\]/
	 *
	 * @param {string} str
	 * @returns {string}
	 */
	function escapeRegExp(str) {
		return str.replace(reEscapableChars, '\\$1');
	}

	/**
	 * Вызывает колбэк для каждого найденого в строке совпадения.
	 * Первым аргументом колбэк получает всё совпадение, остальными - запомненные подстроки.
	 *
	 * @function forEach
	 * @memberOf Rift.regex
	 *
	 * @example
	 * forEachMatch(/(\w+)\-(\d+)/g, 'a-1 b-2 c-3', function(match, name, value) {
	 *     console.log(name + '=' + value);
	 * });
	 * // a=1
	 * // b=2
	 * // c=3
	 *
	 * @param {RegExp} re - Регулярное выражение.
	 * @param {string} str - Строка, в которой будет происходить поиск совпадений.
	 * @param {Function} cb - Колбэк, который будет вызван для каждого найденного совпадения.
	 */
	function forEachMatch(re, str, cb) {
		if (re.global) {
			re.lastIndex = 0;

			for (var match; match = re.exec(str);) {
				if (cb.apply(global, match) === false) {
					break;
				}
			}
		} else {
			var match = re.exec(str);

			if (match) {
				cb.apply(global, match);
			}
		}
	}

	/**
	 * @namespace Rift.regex
	 */
	_.regex = {
		escape: escapeRegExp,
		forEach: forEachMatch
	};

})();

(function() {

	var getUID = _.object.getUID;

	/**
	 * @memberOf Rift.value
	 *
	 * @param {*} value
	 * @returns {string}
	 */
	function getHash(value) {
		if (value === undef) {
			return 'undefined';
		}
		if (value === null) {
			return 'null';
		}

		switch (typeof value) {
			case 'boolean': { return '?' + value; }
			case 'number': { return '+' + value; }
			case 'string': { return ';' + value; }
		}

		return '#' + getUID(value);
	}

	var reEscapableChars = RegExp(
		'[' +
			'\\\\' +
			'\'' +
			'\\x00-\\x1f' +
			'\\x7f-\\x9f' +
			'\\u00ad' +
			'\\u0600-\\u0604' +
			'\\u070f\\u17b4\\u17b5' +
			'\\u200c-\\u200f' +
			'\\u2028-\\u202f' +
			'\\u2060-\\u206f' +
			'\\ufeff' +
			'\\ufff0-\\uffff' +
		']',
		'g'
	);
	var conversionDict = {
		'\b': '\\b',
		'\t': '\\t',
		'\n': '\\n',
		'\f': '\\f',
		'\r': '\\r',
		'\'': '\\\'',
		'\\': '\\\\'
	};

	/**
	 * @private
	 *
	 * @param {string} str
	 * @returns {string}
	 */
	function escapeString(str) {
		return str.replace(reEscapableChars, function(chr) {
			return hasOwn.call(conversionDict, chr) ?
				conversionDict[chr] :
				'\\u' + ('0000' + chr.charCodeAt(0).toString(16)).slice(-4);
		});
	}

	var reUnquotablePropName = /^[$_a-zA-Z][$\w]*$/;
	var reScriptTagEnd = /<\/(script\b[^>]*)>/gi;

	/**
	 * @memberOf Rift.value
	 *
	 * @param {*} value
	 * @returns {string}
	 */
	function toString(value) {
		if (value === undef) {
			return 'void 0';
		}
		if (value === null) {
			return 'null';
		}

		var type = typeof value;

		if (type != 'object') {
			return type == 'string' ?
				'\'' + escapeString(value).replace(reScriptTagEnd, "</'+'$1>") + '\'' :
				String(value);
		}

		var js = [];

		if (Array.isArray(value)) {
			for (var i = value.length; i;) {
				js.unshift(--i in value ? toString(value[i]) : '');
			}

			js = '[' + js + (js[js.length - 1] == '' ? ',]' : ']');
		} else {
			for (var name in value) {
				if (hasOwn.call(value, name)) {
					js.push(
						(reUnquotablePropName.test(name) ? name : '\'' + escapeString(name) + '\'') + ':' +
							toString(value[name])
					);
				}
			}

			js = '{' + js + '}';
		}

		return js.replace(reScriptTagEnd, "</'+'$1>");
	}

	/**
	 * @namespace Rift.value
	 */
	_.value = {
		getHash: getHash,
		toString: toString
	};

})();

(function() {

	/**
	 * @function
	 * @memberOf Rift.process
	 *
	 * @example
	 * nextTick(function() {
	 *     console.log('nextTick');
	 * });
	 *
	 * @param {Function} cb - Колбэк, который запустится после освобождения потока выполнения.
	 */
	var nextTick;

	if (global.process && global.process.nextTick) {
		nextTick = global.process.nextTick;
	} else if (global.setImmediate) {
		nextTick = function(cb) {
			setImmediate(cb);
		};
	} else if (global.postMessage && !global.ActiveXObject) {
		var queue;

		global.addEventListener('message', function() {
			if (queue) {
				var q = queue;

				queue = null;

				for (var i = 0, l = q.length; i < l; i++) {
					try {
						q[i]();
					} catch (err) {
						_.logError(err);
					}
				}
			}
		}, false);

		nextTick = function(cb) {
			if (queue) {
				queue.push(cb);
			} else {
				queue = [cb];
				global.postMessage('__tic__', '*');
			}
		};
	} else {
		nextTick = function(cb) {
			setTimeout(cb, 1);
		};
	}

	/**
	 * @namespace Rift.process
	 */
	_.process = {
		nextTick: nextTick
	};

})();

(function() {

	var mixin = _.object.mixin;

	/**
	 * @property {Object<Function>}
	 * @memberOf Rift.Class
	 */
	var classes = {};

	/**
	 * @function getOrError
	 * @memberOf Rift.Class
	 *
	 * @param {string} name
	 * @returns {Function}
	 */
	function getClassOrError(name) {
		if (!hasOwn.call(classes, name)) {
			throw new TypeError('Class "' + name + '" is not defined');
		}

		return classes[name];
	}

	/**
	 * @function register
	 * @memberOf Rift.Class
	 *
	 * @param {string} name
	 * @param {Function} cl
	 * @returns {Function}
	 */
	function regClass(name, cl) {
		if (hasOwn.call(classes, name)) {
			throw new TypeError('Class "' + name + '" is already registered');
		}

		Object.defineProperty(cl, '__class', {
			value: name
		});

		classes[name] = cl;

		return cl;
	}

	/**
	 * @memberOf Rift.Class
	 *
	 * @this {Function} - Родительский класс.
	 * @param {string} [name] - Внутреннее имя.
	 * @param {Object} declaration - Объект-объявление.
	 * @param {Object} [declaration.static] - Статические свойства.
	 * @param {Function} [declaration.constructor] - Конструктор.
	 * @returns {Function}
	 */
	function extend(name, declaration) {
		if (typeof name == 'object') {
			declaration = name;
			name = undef;
		}

		var parent = this;
		var constr;

		if (hasOwn.call(declaration, 'constructor')) {
			constr = declaration.constructor;
			delete declaration.constructor;
		} else {
			constr = function() {
				return parent.apply(this, arguments);
			};
		}

		var proto = Object.create(parent.prototype);

		constr.prototype = proto;

		Object.defineProperty(constr, '$super', {
			writable: true,
			value: parent.prototype
		});

		Object.defineProperty(proto, 'constructor', {
			configurable: true,
			writable: true,
			value: constr
		});

		mixin(constr, parent, true);

		if (hasOwn.call(declaration, 'static')) {
			mixin(constr, declaration.static);
			delete declaration.static;
		}

		if (!constr.extend) {
			constr.extend = extend;
		}

		mixin(proto, declaration);

		if (name) {
			regClass(name, constr);
		}

		return constr;
	}

	/**
	 * @namespace Rift.Class
	 */
	_.Class = {
		classes: classes,
		getOrError: getClassOrError,
		register: regClass,
		extend: extend
	};

})();

(function() {

	var getUID = _.object.getUID;
	var toString = _.value.toString;
	var classes = _.Class.classes;
	var regClass = _.Class.register;

	regClass('Array', Array);
	regClass('Date', Date);

	Object.defineProperties(Date.prototype, {
		collectDumpObject: {
			configurable: true,
			writable: true,
			value: function(data) {
				data.utc = this.toString();
			}
		},

		expandFromDumpObject: {
			configurable: true,
			writable: true,
			value: function(data) {
				this.setTime(new Date(data.utc));
			}
		}
	});

	/**
	 * @private
	 *
	 * @param {Object} obj
	 * @param {Object} objects
	 * @returns {string}
	 */
	function collectDump(obj, objects) {
		var id = getUID(obj);

		if (hasOwn.call(objects, id)) {
			return id;
		}

		var data = {};
		var opts = {};

		if (hasOwn.call(obj.constructor, '__class')) {
			if (obj.collectDumpObject) {
				obj.collectDumpObject(data, opts);
			} else {
				Object.assign(data, obj);
			}

			objects[id] = {
				c: obj.constructor.__class
			};
		} else {
			Object.assign(data, obj);
			objects[id] = {};
		}

		if (!isEmpty(data)) {
			for (var name in data) {
				var value = data[name];

				if (value === Object(value)) {
					data[name] = collectDump(value, objects);
				} else {
					data[name] = value === undef ? {} : { v: value };
				}
			}

			objects[id].d = data;
		}

		if (!isEmpty(opts)) {
			objects[id].o = opts;
		}

		return id;
	}

	/**
	 * Сериализует объект в дамп.
	 *
	 * @memberOf Rift.dump
	 *
	 * @param {Object} obj
	 * @returns {string}
	 */
	function serialize(obj) {
		var objects = {};

		return toString({
			s: objects,
			r: collectDump(obj, objects)
		});
	}

	/**
	 * Восстанавливает объект из дампа.
	 *
	 * @memberOf Rift.dump
	 *
	 * @param {string|Object} dump
	 * @returns {Object}
	 */
	function deserialize(dump) {
		if (typeof dump == 'string') {
			dump = Function('return ' + dump + ';')();
		}

		var objects = dump.s;

		for (var id in objects) {
			var obj = objects[id];

			if (hasOwn.call(obj, 'c')) {
				var cl = classes[obj.c];
				obj.instance = hasOwn.call(obj, 'o') ? new cl(undef, obj.o) : new cl();
			} else {
				obj.instance = {};
			}
		}

		for (var id in objects) {
			var obj = objects[id];

			if (hasOwn.call(obj, 'd')) {
				var data = obj.d;

				for (var name in data) {
					var item = data[name];

					if (typeof item == 'object') {
						data[name] = hasOwn.call(item, 'v') ? item.v : undef;
					} else {
						data[name] = objects[item].instance;
					}
				}

				if (hasOwn.call(obj, 'c') && obj.instance.expandFromDumpObject) {
					obj.instance.expandFromDumpObject(data);
				} else {
					Object.assign(obj.instance, data);
				}
			}
		}

		return objects[dump.r].instance;
	}

	_.dump = {
		serialize: serialize,
		deserialize: deserialize
	};

})();

(function() {

	/**
	 * @class Rift.Event
	 * @extends {Object}
	 *
	 * @param {string} type - Тип.
	 * @param {boolean} [canBubble=false] - Может ли событие всплывать.
	 */
	function Event(type, canBubble) {
		this.type = type;

		if (canBubble) {
			this.bubbles = true;
		}
	}

	Event.extend = _.Class.extend;

	Object.assign(Event.prototype, /** @lends Rift.Event# */{
		/**
		 * Объект, к которому применено событие.
		 *
		 * @type {?Object}
		 * @writable
		 */
		target: null,

		/**
		 * @type {int|undefined}
		 * @writable
		 */
		timestamp: undef,

		/**
		 * Тип события.
		 *
		 * @type {string}
		 */
		type: undef,

		/**
		 * Является ли событие всплывающим.
		 *
		 * @type {boolean}
		 */
		bubbles: false,

		/**
		 * Распространение события на другие объекты остановлено.
		 *
		 * @type {boolean}
		 */
		isPropagationStopped: false,

		/**
		 * Распространение события на другие объекты и его обработка на текущем остановлены.
		 *
		 * @type {boolean}
		 */
		isImmediatePropagationStopped: false,

		/**
		 * Дополнительная информация по событию.
		 *
		 * @type {?Object}
		 * @writable
		 */
		detail: null,

		/**
		 * Останавливает распространение события на другие объекты.
		 */
		stopPropagation: function() {
			this.isPropagationStopped = true;
		},

		/**
		 * Останавливает распространение события на другие объекты, а также его обработку на текущем.
		 */
		stopImmediatePropagation: function() {
			this.isPropagationStopped = true;
			this.isImmediatePropagationStopped = true;
		}
	});

	_.Event = Event;

})();

(function() {

	var Event = _.Event;

	var keyUsed = '_emt-used';

	/**
	 * @private
	 *
	 * @param {Function} method
	 * @returns {Function}
	 */
	function wrapListeningMethod(method) {
		return function _(type, listener, context) {
			if (typeof type == 'object') {
				context = listener;

				var types = type;

				for (type in types) {
					_.call(this, type, types[type], context);
				}
			} else {
				method.call(this, type, listener, context);
			}

			return this;
		};
	}

	/**
	 * @class Rift.EventEmitter
	 * @extends {Object}
	 */
	function EventEmitter() {}

	EventEmitter.extend = _.Class.extend;

	Object.assign(EventEmitter.prototype, /** @lends Rift.EventEmitter# */{
		_events: null,

		/**
		 * @type {?Rift.EventEmitter}
		 * @writable
		 */
		parent: null,

		/**
		 * @type {boolean}
		 * @writable
		 */
		silent: false,

		/**
		 * @param {string} type
		 * @param {Function} listener
		 * @param {Object} [context=this]
		 * @returns {Rift.EventEmitter}
		 */
		on: wrapListeningMethod(function(type, listener, context) {
			var events = this._events || (this._events = {});

			(events[type] || (events[type] = [])).push({
				listener: listener,
				context: context || this
			});
		}),

		/**
		 * @param {string} type
		 * @param {Function} listener
		 * @param {Object} [context=this]
		 * @returns {Rift.EventEmitter}
		 */
		off: wrapListeningMethod(function(type, listener, context) {
			var events = (this._events || (this._events = {}))[type];

			if (!events) {
				return;
			}

			if (!context) {
				context = this;
			}

			for (var i = events.length; i;) {
				var evt = events[--i];

				if (
					evt.context == context && (
						evt.listener == listener || (
							hasOwn.call(evt.listener, keyListeningInner) &&
								evt.listener[keyListeningInner] === listener
						)
					)
				) {
					events.splice(i, 1);
				}
			}

			if (!events.length) {
				delete this._events[type];
			}
		}),

		/**
		 * @param {string} type
		 * @param {Function} listener
		 * @param {Object} [context=this]
		 * @returns {Rift.EventEmitter}
		 */
		once: function(type, listener, context) {
			function outer() {
				this.off(type, outer);
				listener.apply(this, arguments);
			}
			outer[keyListeningInner] = listener;

			return this.on(type, outer, context);
		},

		/**
		 * @param {Rift.Event|string} evt
		 * @param {Object} [detail]
		 * @returns {Rift.Event}
		 */
		emit: function(evt, detail) {
			if (typeof evt == 'string') {
				evt = new Event(evt);
			} else if (hasOwn.call(evt, keyUsed)) {
				throw new TypeError('Attempt to use an object that is no longer usable');
			}

			evt[keyUsed] = true;

			evt.target = this;
			evt.timestamp = Date.now();

			if (detail) {
				evt.detail = detail;
			}

			this._handleEvent(evt);

			return evt;
		},

		/**
		 * @protected
		 *
		 * @param {Rift.Event} evt
		 */
		_handleEvent: function(evt) {
			if (!this.silent || evt.target != this) {
				var type = evt.type;
				var events = (this._events || (this._events = {}))[type];
				var eventCount;

				if (typeof this['on' + type] == 'function') {
					events = events ? events.slice(0) : [];
					events.push({ listener: this['on' + type] });

					eventCount = events.length;
				} else {
					if (events) {
						events = events.slice(0);
						eventCount = events.length;
					} else {
						eventCount = 0;
					}
				}

				if (eventCount) {
					var i = 0;

					do {
						if (evt.isImmediatePropagationStopped) {
							break;
						}

						try {
							if (events[i].listener.call(events[i].context, evt) === false) {
								evt.isPropagationStopped = true;
							}
						} catch (err) {
							this._logError(err);
						}
					} while (++i < eventCount);
				}
			}

			var parent = this.parent;

			if (parent && evt.bubbles && !evt.isPropagationStopped) {
				parent._handleEvent(evt);
			}
		},

		/**
		 * @protected
		 *
		 * @param {*} err
		 */
		_logError: function(err) {
			_.logError(err);
		}
	});

	_.EventEmitter = EventEmitter;

})();

(function() {

	var getHash = _.value.getHash;
	var EventEmitter = _.EventEmitter;

	/**
	 * @class Rift.ActiveDictionary
	 * @extends {Rift.EventEmitter}
	 *
	 * @param {?(Object|Rift.ActiveDictionary|undefined)} [data]
	 * @param {Object|boolean} [opts]
	 * @param {boolean} [opts.handleItemChanges=false]
	 */
	var ActiveDictionary = EventEmitter.extend('Rift.ActiveDictionary', /** @lends Rift.ActiveDictionary# */{
		_inner: null,
		_valueCount: null,

		_handleItemChanges: false,

		constructor: function(data, opts) {
			EventEmitter.call(this);

			this._valueCount = {};

			if (typeof opts == 'boolean') {
				opts = { handleItemChanges: opts };
			} else if (!opts) {
				opts = {};
			}

			var handleItemChanges = opts.handleItemChanges === true;

			if (handleItemChanges) {
				this._handleItemChanges = true;
			}

			if (data) {
				var inner = this._inner = Object.assign(
					Object.create(null),
					data instanceof ActiveDictionary ? data._inner : data
				);
				var valueCount = this._valueCount;

				for (var name in inner) {
					var value = inner[name];
					var valueHash = getHash(value);

					if (hasOwn.call(valueCount, valueHash)) {
						valueCount[valueHash]++;
					} else {
						valueCount[valueHash] = 1;

						if (handleItemChanges && value instanceof EventEmitter) {
							value.on('change', this._onItemChange, this);
						}
					}
				}
			} else {
				this._inner = {};
			}
		},

		/**
		 * @protected
		 *
		 * @param {Rift.Event} evt
		 */
		_onItemChange: function(evt) {
			this._handleEvent(evt);
		},

		/**
		 * Проверяет, имеет ли словарь запись с указанным именем.
		 *
		 * @param {string} name
		 * @returns {boolean}
		 */
		has: function(name) {
			return name in this._inner;
		},

		/**
		 * Получает значение записи.
		 *
		 * @param {string} name
		 * @returns {*}
		 */
		get: function(name) {
			return this._inner[name];
		},

		/**
		 * Устанавлиет значение записи.
		 *
		 * @param {string} name
		 * @param {*} value
		 * @returns {Rift.ActiveDictionary}
		 */
		set: function(name, value) {
			var values;

			if (typeof name == 'string') {
				values = {};
				values[name] = value;
			} else {
				values = name;
			}

			var inner = this._inner;
			var valueCount = this._valueCount;
			var handleItemChanges = this._handleItemChanges;
			var changed = false;
			var removedValueDict = Object.create(null);
			var removedValues = [];
			var addedValues = [];
			var diff = {
				$removedValues: removedValues,
				$addedValues: addedValues
			};

			for (name in values) {
				var hasName = name in inner;
				var oldValue = inner[name];

				value = values[name];

				if (!hasName || !svz(oldValue, value)) {
					changed = true;

					if (hasName) {
						var oldValueHash = getHash(oldValue);

						if (!--valueCount[oldValueHash]) {
							delete valueCount[oldValueHash];

							if (handleItemChanges && oldValue instanceof EventEmitter) {
								oldValue.off('change', this._onItemChange);
							}

							removedValueDict[oldValueHash] = oldValue;
						}
					}

					var valueHash = getHash(value);

					if (hasOwn.call(valueCount, valueHash)) {
						valueCount[valueHash]++;
					} else {
						valueCount[valueHash] = 1;

						if (handleItemChanges && value instanceof EventEmitter) {
							value.on('change', this._onItemChange, this);
						}

						if (valueHash in removedValueDict) {
							delete removedValueDict[valueHash];
						} else {
							addedValues.push(value);
						}
					}

					diff[name] = {
						type: hasName ? 'update' : 'add',
						oldValue: oldValue,
						value: value
					};

					inner[name] = value;
				}
			}

			if (changed) {
				for (var valueHash in removedValueDict) {
					removedValues.push(removedValueDict[valueHash]);
				}

				this.emit('change', { diff: diff });
			}

			return this;
		},

		/**
		 * Удаляет записи.
		 *
		 * @param {...string} names
		 * @returns {Rift.ActiveDictionary}
		 */
		delete: function() {
			var inner = this._inner;
			var valueCount = this._valueCount;
			var handleItemChanges = this._handleItemChanges;
			var changed = false;
			var removedValues = [];
			var diff = {
				$removedValues: removedValues,
				$addedValues: []
			};

			for (var i = 0, l = arguments.length; i < l; i++) {
				var name = arguments[i];

				if (name in inner) {
					changed = true;

					var value = inner[name];
					var valueHash = getHash(value);

					if (!--valueCount[valueHash]) {
						delete valueCount[valueHash];

						if (handleItemChanges && value instanceof EventEmitter) {
							value.off('change', this._onItemChange);
						}

						removedValues.push(value);
					}

					diff[name] = {
						type: 'delete',
						oldValue: value,
						value: undef
					};

					delete inner[name];
				}
			}

			if (changed) {
				this.emit('change', { diff: diff });
			}

			return this;
		},

		/**
		 * @param {*} value
		 * @returns {boolean}
		 */
		contains: function(value) {
			return hasOwn.call(this._valueCount, getHash(value));
		},

		/**
		 * Создает копию словаря.
		 *
		 * @returns {Rift.ActiveDictionary}
		 */
		clone: function() {
			return new this.constructor(this, { handleItemChanges: this._handleItemChanges });
		},

		/**
		 * Преобразует в объект.
		 *
		 * @returns {Object}
		 */
		toObject: function() {
			return Object.assign({}, this._inner);
		},

		/**
		 * @param {Object} data
		 * @param {Object} opts
		 */
		collectDumpObject: function(data, opts) {
			var inner = this._inner;

			for (var name in inner) {
				data[name] = inner[name];
			}

			if (this._handleItemChanges) {
				opts.handleItemChanges = true;
			}
		},

		/**
		 * @param {Object} data
		 */
		expandFromDumpObject: function(data) {
			this.set(data);
		},

		/**
		 * Уничтожает инстанс освобождая занятые им ресурсы.
		 */
		dispose: function() {
			if (this._handleItemChanges) {
				var inner = this._inner;

				for (var name in inner) {
					if (inner[name] instanceof EventEmitter) {
						inner[name].off('change', this._onItemChange);
					}
				}
			}
		}
	});

	_.ActiveDictionary = ActiveDictionary;

	_.$dict = function(obj, opts) {
		return new ActiveDictionary(obj, opts);
	};

})();

(function() {

	var getHash = _.value.getHash;
	var EventEmitter = _.EventEmitter;

	var arrayProto = Array.prototype;
	var push = arrayProto.push;
	var unshift = arrayProto.unshift;
	var concat = arrayProto.concat;
	var slice = arrayProto.slice;
	var splice = arrayProto.splice;
	var map = arrayProto.map;
	var reduce = arrayProto.reduce;

	/**
	 * @class Rift.ActiveArray
	 * @extends {Rift.EventEmitter}
	 *
	 * @param {?(Array|Rift.ActiveArray|undefined)} [data]
	 * @param {Object|boolean} [opts]
	 * @param {boolean} [opts.handleItemChanges=false]
	 */
	var ActiveArray = EventEmitter.extend('Rift.ActiveArray', /** @lends Rift.ActiveArray# */{
		_inner: null,
		_valueCount: null,

		_handleItemChanges: false,

		constructor: function(data, opts) {
			EventEmitter.call(this);

			this._valueCount = {};

			if (typeof opts == 'boolean') {
				opts = { handleItemChanges: opts };
			} else if (!opts) {
				opts = {};
			}

			var handleItemChanges = opts.handleItemChanges === true;

			if (handleItemChanges) {
				this._handleItemChanges = true;
			}

			if (data) {
				var inner = this._inner = (data instanceof ActiveArray ? data._inner : data).slice(0);
				var valueCount = this._valueCount;

				for (var i = inner.length; i;) {
					if (--i in inner) {
						var value = inner[i];
						var valueHash = getHash(value);

						if (hasOwn.call(valueCount, valueHash)) {
							valueCount[valueHash]++;
						} else {
							valueCount[valueHash] = 1;

							if (handleItemChanges && value instanceof EventEmitter) {
								value.on('change', this._onItemChange, this);
							}
						}
					}
				}
			} else {
				this._inner = [];
			}
		},

		/**
		 * @protected
		 *
		 * @param {Rift.Event} evt
		 */
		_onItemChange: function(evt) {
			this._handleEvent(evt);
		},

		/**
		 * Получает значение индекса.
		 *
		 * @param {int} index
		 * @returns {*}
		 */
		get: function(index) {
			return this._inner[index];
		},

		/**
		 * Устанавливает значение индекса.
		 *
		 * @param {int} index
		 * @param {*} value
		 * @returns {Rift.ActiveArray}
		 */
		set: function(index, value) {
			var inner = this._inner;
			var hasIndex = index in inner;
			var oldValue = inner[index];

			if (!hasIndex || !svz(oldValue, value)) {
				var valueCount = this._valueCount;
				var removedValues;
				var addedValues;

				if (hasIndex) {
					var oldValueHash = getHash(oldValue);

					if (!--valueCount[oldValueHash]) {
						delete valueCount[oldValueHash];

						if (this._handleItemChanges && oldValue instanceof EventEmitter) {
							oldValue.off('change', this._onItemChange);
						}

						removedValues = [oldValue];
					}
				}

				var valueHash = getHash(value);

				if (hasOwn.call(valueCount, valueHash)) {
					valueCount[valueHash]++;
				} else {
					valueCount[valueHash] = 1;

					if (this._handleItemChanges && value instanceof EventEmitter) {
						value.on('change', this._onItemChange, this);
					}

					addedValues = [value];
				}

				inner[index] = value;

				this.emit('change', {
					diff: {
						$removedValues: removedValues || [],
						$addedValues: addedValues || []
					}
				});
			}

			return this;
		},

		/**
		 * Удаляет значения индексов.
		 *
		 * @param {...int} indexes
		 * @returns {Rift.ActiveArray}
		 */
		delete: function() {
			var inner = this._inner;
			var valueCount = this._valueCount;
			var handleItemChanges = this._handleItemChanges;
			var changed = false;
			var removedValues = [];

			for (var i = 0, l = arguments.length; i < l; i++) {
				var index = arguments[i];

				if (index in inner) {
					changed = true;

					var value = inner[index];
					var valueHash = getHash(value);

					if (!--valueCount[valueHash]) {
						delete valueCount[valueHash];

						if (handleItemChanges && value instanceof EventEmitter) {
							value.off('change', this._onItemChange);
						}

						removedValues.push(value);
					}

					delete inner[index];
				}
			}

			if (changed) {
				this.emit('change', {
					diff: {
						$removedValues: removedValues,
						$addedValues: []
					}
				});
			}

			return this;
		},

		/**
		 * Длинна массива.
		 *
		 * @type {int}
		 * @writable
		 */
		get length() {
			return this._inner.length;
		},
		set length(len) {
			var inner = this._inner;
			var oldLen = inner.length;

			if (oldLen != len) {
				var changed = false;
				var removedValues = [];

				if (len < oldLen) {
					var valueCount = this._valueCount;
					var handleItemChanges = this._handleItemChanges;
					var i = len;

					do {
						if (i in inner) {
							changed = true;

							var value = inner[i];
							var valueHash = getHash(value);

							if (!--valueCount[valueHash]) {
								delete valueCount[valueHash];

								if (handleItemChanges && value instanceof EventEmitter) {
									value.off('change', this._onItemChange);
								}

								removedValues.push(value);
							}
						}
					} while (++i < oldLen);
				}

				inner.length = len;

				if (changed) {
					this.emit('change', {
						diff: {
							$removedValues: removedValues,
							$addedValues: []
						}
					});
				}
			}
		},

		/**
		 * @param {*} value
		 * @returns {boolean}
		 */
		contains: function(value) {
			return hasOwn.call(this._valueCount, getHash(value));
		},

		/**
		 * @param {*} value
		 * @param {int} [fromIndex=0]
		 * @returns {int}
		 */
		indexOf: function(value, fromIndex) {
			return this._inner.indexOf(value, fromIndex);
		},

		/**
		 * @param {*} value
		 * @param {int} [fromIndex=-1]
		 * @returns {int}
		 */
		lastIndexOf: function(value, fromIndex) {
			return this._inner.lastIndexOf(value, fromIndex);
		},

		/**
		 * Добавляет один или более элементов в конец массива и возвращает новую длину массива.
		 *
		 * @param {...*} values - Элементы, добавляемые в конец массива.
		 * @returns {int}
		 */
		push: function() {
			if (!arguments.length) {
				return this._inner.length;
			}

			push.apply(this._inner, arguments);

			this.emit('change', {
				diff: {
					$removedValues: [],
					$addedValues: this._addValues(arguments)
				}
			});

			return this._inner.length;
		},

		/**
		 * Добавляет один или более элементов в конец массива и возвращает новую длину массива.
		 * Элементы, уже присутствующие в массиве, добавлены не будут. Повторяющиеся элементы, отсутствующие в массиве,
		 * будут добавлены один раз.
		 *
		 * @param {...*} values - Элементы, добавляемые в конец массива.
		 * @returns {int}
		 */
		pushUnique: function() {
			var valueCount = this._valueCount;

			return this.push.apply(this, reduce.call(arguments, function(values, value) {
				if (!hasOwn.call(valueCount, getHash(value)) && values.indexOf(value) == -1) {
					values.push(value);
				}

				return values;
			}, []));
		},

		/**
		 * Удаляет первый элемент из массива и возвращает его значение.
		 *
		 * @returns {*}
		 */
		shift: function() {
			var inner = this._inner;

			if (!inner.length) {
				return;
			}

			if (isEmpty(this._valueCount)) {
				inner.length--;
				return;
			}

			var hasFirst = '0' in inner;
			var value;

			if (hasFirst) {
				value = inner.shift();
			} else {
				inner.length--;
			}

			this.emit('change', {
				diff: {
					$removedValues: hasFirst ? this._removeValue(value) : [],
					$addedValues: []
				}
			});

			return value;
		},

		/**
		 * Добавляет один или более элементов в начало массива и возвращает новую длину массива.
		 *
		 * @example
		 * var arr = [1, 2];
		 *
		 * arr.unshift(0); // => 3
		 * concole.log(arr); // [0, 1, 2]
		 *
		 * arr.unshift(-2, -1); // => 5
		 * concole.log(arr); // [-2, -1, 0, 1, 2]
		 *
		 * @param {...*} values - Элементы, добавляемые в начало массива.
		 * @returns {int}
		 */
		unshift: function() {
			if (!arguments.length) {
				return this._inner.length;
			}

			unshift.apply(this._inner, arguments);

			this.emit('change', {
				diff: {
					$removedValues: [],
					$addedValues: this._addValues(arguments)
				}
			});

			return this._inner.length;
		},

		/**
		 * Удаляет последний элемент из массива и возвращает его значение.
		 *
		 * @returns {*}
		 */
		pop: function() {
			var inner = this._inner;

			if (!inner.length) {
				return;
			}

			if (!(inner.length - 1 in inner)) {
				inner.length--;
				return;
			}

			var value = inner.pop();

			this.emit('change', {
				diff: {
					$removedValues: this._removeValue(value),
					$addedValues: []
				}
			});

			return value;
		},

		/**
		 * @protected
		 *
		 * @param {Arguments} values
		 * @returns {Array}
		 */
		_addValues: function(values) {
			var valueCount = this._valueCount;
			var handleItemChanges = this._handleItemChanges;
			var addedValues = [];

			for (var i = 0, l = values.length; i < l; i++) {
				var value = values[i];
				var valueHash = getHash(value);

				if (hasOwn.call(valueCount, valueHash)) {
					valueCount[valueHash]++;
				} else {
					valueCount[valueHash] = 1;

					if (handleItemChanges && value instanceof EventEmitter) {
						value.on('change', this._onItemChange, this);
					}

					addedValues.push(value);
				}
			}

			return addedValues;
		},

		/**
		 * @protected
		 *
		 * @param {*} value
		 * @returns {Array}
		 */
		_removeValue: function(value) {
			var valueHash = getHash(value);

			if (!--this._valueCount[valueHash]) {
				delete this._valueCount[valueHash];

				if (this._handleItemChanges && value instanceof EventEmitter) {
					value.off('change', this._onItemChange);
				}

				return [value];
			}

			return [];
		},

		/**
		 * Объединяет все элементы массива в строку через разделитель.
		 *
		 * @param {string} [separator]
		 * @returns {string}
		 */
		join: function(separator) {
			return this._inner.join(separator);
		},

		/**
		 * @param {...*} values - Массивы и/или значения, соединяемые в новый массив.
		 * @returns {Rift.ActiveArray}
		 */
		concat: function() {
			return new this.constructor(
				concat.apply(this._inner, map.call(arguments, function(value) {
					return value instanceof ActiveArray ? value._inner : value;
				}))
			);
		},

		/**
		 * Создаёт поверхностную копию части массива.
		 *
		 * @param {int} [startIndex=0]
		 * @param {int} [endIndex=this.length]
		 * @returns {Array}
		 */
		slice: function(startIndex, endIndex) {
			return this._inner.slice(startIndex, endIndex);
		},

		/**
		 * Изменяет содержимое массива, добавляя новые и удаляя старые элементы.
		 *
		 * @param {int} startIndex
		 * @param {int} deleteCount
		 * @param {...*} [values]
		 * @returns {Array} - Удалённые элементы.
		 */
		splice: function(startIndex, deleteCount) {
			var inner = this._inner;
			var removedSlice = splice.apply(inner, arguments);
			var addedSlice = slice.call(arguments, 2);
			var removedSliceLen = removedSlice.length;
			var addedSliceLen = addedSlice.length;

			if (!removedSliceLen && !addedSliceLen) {
				return removedSlice;
			}

			var valueCount = this._valueCount;
			var handleItemChanges = this._handleItemChanges;
			var changed = false;
			var removedValueDict = {};
			var addedValues = [];

			for (var i = 0, l = Math.max(removedSliceLen, addedSliceLen); i < l; i++) {
				var iInRemovedSlice = i in removedSlice;
				var iInAddedSlice = i in addedSlice;

				if (!iInRemovedSlice && !iInAddedSlice) {
					continue;
				}

				var removedValue = removedSlice[i];
				var addedValue = addedSlice[i];

				if (!iInRemovedSlice || !iInAddedSlice || !svz(removedValue, addedValue)) {
					changed = true;

					if (iInRemovedSlice) {
						var removedValueHash = getHash(removedValue);

						if (!--valueCount[removedValueHash]) {
							delete valueCount[removedValueHash];

							if (handleItemChanges && removedValue instanceof EventEmitter) {
								removedValue.off('change', this._onItemChange);
							}

							removedValueDict[removedValueHash] = removedValue;
						}
					}

					if (iInAddedSlice) {
						var addedValueHash = getHash(addedValue);

						if (hasOwn.call(valueCount, addedValueHash)) {
							valueCount[addedValueHash]++;
						} else {
							valueCount[addedValueHash] = 1;

							if (handleItemChanges && addedValue instanceof EventEmitter) {
								addedValue.on('change', this._onItemChange, this);
							}

							if (hasOwn.call(removedValueDict, addedValueHash)) {
								delete removedValueDict[addedValueHash];
							} else {
								addedValues.push(addedValue);
							}
						}
					}
				}
			}

			if (!changed && removedSliceLen > addedSliceLen) {
				for (var i = startIndex + addedSliceLen, l = inner.length; i < l; i++) {
					if (i in inner) {
						changed = true;
						break;
					}
				}
			}

			if (changed) {
				var removedValues = [];

				for (var valueHash in removedValueDict) {
					removedValues.push(removedValueDict[valueHash]);
				}

				this.emit('change', {
					diff: {
						$removedValues: removedValues,
						$addedValues: addedValues
					}
				});
			}

			return removedSlice;
		},

		/**
		 * @method
		 *
		 * @param {Function} cb
		 * @param {Object} [context=global]
		 */
		forEach: null,

		/**
		 * @method
		 *
		 * @param {Function} cb
		 * @param {Object} [context=global]
		 * @returns {Array}
		 */
		map: null,

		/**
		 * @method
		 *
		 * @param {Function} cb
		 * @param {Object} [context=global]
		 * @returns {Array}
		 */
		filter: null,

		/**
		 * @method
		 *
		 * @param {Function} cb
		 * @param {Object} [context=global]
		 * @returns {boolean}
		 */
		every: null,

		/**
		 * @method
		 *
		 * @param {Function} cb
		 * @param {Object} [context=global]
		 * @returns {boolean}
		 */
		some: null,

		/**
		 * @method
		 *
		 * @param {Function} cb
		 * @param {*} [initialValue]
		 * @returns {*}
		 */
		reduce: null,

		/**
		 * @method
		 *
		 * @param {Function} cb
		 * @param {*} [initialValue]
		 * @returns {*}
		 */
		reduceRight: null,

		/**
		 * Создает копию массива.
		 *
		 * @returns {Rift.ActiveArray}
		 */
		clone: function() {
			return new this.constructor(this, { handleItemChanges: this._handleItemChanges });
		},

		/**
		 * Преобразует в обычный массив.
		 *
		 * @returns {Array}
		 */
		toArray: function() {
			return this._inner.slice(0);
		},

		/**
		 * Преобразует в строковое представление.
		 *
		 * @returns {string}
		 */
		toString: function() {
			return this._inner.toString();
		},

		/**
		 * @param {Object} data
		 * @param {Object} opts
		 */
		collectDumpObject: function(data, opts) {
			var inner = this._inner;

			for (var i = inner.length; i;) {
				data[--i] = inner[i];
			}

			if (this._handleItemChanges) {
				opts.handleItemChanges = true;
			}
		},

		/**
		 * @param {Object} data
		 */
		expandFromDumpObject: function(data) {
			for (var index in data) {
				this.set(index, data[index]);
			}
		},

		/**
		 * Уничтожает инстанс освобождая занятые им ресурсы.
		 */
		dispose: function() {
			if (this._handleItemChanges) {
				var inner = this._inner;

				for (var i = inner.length; i;) {
					if (inner[--i] instanceof EventEmitter) {
						inner[i].off('change', this._onItemChange);
					}
				}
			}
		}
	});

	['forEach', 'map', 'filter', 'every', 'some', 'reduce', 'reduceRight'].forEach(function(name) {
		this[name] = function() {
			return arrayProto[name].apply(this._inner, arguments);
		};
	}, ActiveArray.prototype);

	_.ActiveArray = ActiveArray;

	_.$arr = function(arr, opts) {
		return new ActiveArray(arr, opts);
	};

})();

(function() {

	var getUID = _.object.getUID;
	var nextTick = _.process.nextTick;
	var Event = _.Event;
	var EventEmitter = _.EventEmitter;

	var STATE_CHANGES_ACCUMULATION = 0;
	var STATE_CHANGES_HANDLING = 1;
	var STATE_CHILDREN_RECALCULATION = 2;

	var state = STATE_CHANGES_ACCUMULATION;

	/**
	 * @type {Object<{ dataCell: Rift.DataCell, event: Rift.Event, cancellable: boolean }>}
	 * @private
	 */
	var changes = {};

	var changeCount = 0;

	/**
	 * @private
	 */
	var outdatedDataCells = {
		first: null,
		last: null
	};

	var circularityDetectionCounter = {};

	/**
	 * @private
	 *
	 * @param {Rift.DataCell} dc
	 * @returns {boolean}
	 */
	function addOutdatedDataCell(dc) {
		var dcBundle = outdatedDataCells.last;
		var maxParentDepth = dc._maxParentDepth;

		if (dcBundle) {
			while (true) {
				if (maxParentDepth == dcBundle.maxParentDepth) {
					var id = getUID(dc);

					if (hasOwn.call(dcBundle.dataCells, id)) {
						return false;
					}

					dcBundle.dataCells[id] = dc;
					dcBundle.count++;

					return true;
				}

				if (maxParentDepth > dcBundle.maxParentDepth) {
					var next = dcBundle.next;

					(dcBundle.next = (next || outdatedDataCells)[next ? 'prev' : 'last'] =
						outdatedDataCells[maxParentDepth] = {
							maxParentDepth: maxParentDepth,
							dataCells: {},
							count: 1,
							prev: dcBundle,
							next: next
						}
					).dataCells[getUID(dc)] = dc;

					return true;
				}

				if (!dcBundle.prev) {
					(dcBundle.prev = outdatedDataCells.first = outdatedDataCells[maxParentDepth] = {
						maxParentDepth: maxParentDepth,
						dataCells: {},
						count: 1,
						prev: null,
						next: dcBundle
					}).dataCells[getUID(dc)] = dc;

					return true;
				}

				dcBundle = dcBundle.prev;
			}
		}

		(outdatedDataCells.first = outdatedDataCells.last = outdatedDataCells[maxParentDepth] = {
			maxParentDepth: maxParentDepth,
			dataCells: {},
			count: 1,
			prev: null,
			next: null
		}).dataCells[getUID(dc)] = dc;

		return true;
	}

	/**
	 * @private
	 *
	 * @param {Rift.DataCell} dc
	 * @returns {boolean}
	 */
	function removeOutdatedDataCell(dc) {
		var dcBundle = outdatedDataCells[dc._maxParentDepth];

		if (dcBundle) {
			var id = getUID(dc);

			if (hasOwn.call(dcBundle.dataCells, id)) {
				if (--dcBundle.count) {
					delete dcBundle.dataCells[id];
				} else {
					var prev = dcBundle.prev;
					var next = dcBundle.next;

					if (prev) {
						prev.next = next;
					} else {
						outdatedDataCells.first = next;
					}

					if (next) {
						next.prev = prev;
					} else {
						outdatedDataCells.last = prev;
					}

					delete outdatedDataCells[dc._maxParentDepth];
				}

				return true;
			}
		}

		return false;
	}

	/**
	 * @private
	 */
	function handleChanges() {
		state = STATE_CHANGES_HANDLING;

		do {
			for (var changeId in changes) {
				var change = changes[changeId];
				var dc = change.dataCell;
				var children = dc._children;

				for (var childId in children) {
					addOutdatedDataCell(children[childId]);
				}

				delete changes[changeId];
				changeCount--;

				dc._fixedValue = dc._value;
				dc._changed = true;

				dc._handleEvent(change.event);

				if (state != STATE_CHANGES_HANDLING) {
					return;
				}
			}
		} while (changeCount);
	}

	/**
	 * @private
	 */
	function releaseChanges() {
		if (state == STATE_CHANGES_ACCUMULATION) {
			if (changeCount) {
				handleChanges();

				if (state != STATE_CHANGES_HANDLING) {
					return;
				}
			} else {
				return;
			}
		} else if (state == STATE_CHANGES_HANDLING) {
			if (changeCount) {
				handleChanges();

				if (state != STATE_CHANGES_HANDLING) {
					return;
				}
			}
		} else {
			handleChanges();

			if (state != STATE_CHANGES_HANDLING) {
				return;
			}
		}

		state = STATE_CHILDREN_RECALCULATION;

		for (var dcBundle; dcBundle = outdatedDataCells.first;) {
			var dcs = dcBundle.dataCells;

			for (var id in dcs) {
				var dc = dcs[id];

				dc._recalc();

				if (state != STATE_CHILDREN_RECALCULATION) {
					return;
				}

				// кажется, что правильней поставить этот if-else над dc._recalc() , но подумай получше ;)
				if (--dcBundle.count) {
					delete dcs[id];
				} else {
					var prev = dcBundle.prev;
					var next = dcBundle.next;

					if (prev) {
						prev.next = next;
					} else {
						outdatedDataCells.first = next;
					}

					if (next) {
						next.prev = prev;
					} else {
						outdatedDataCells.last = prev;
					}

					delete outdatedDataCells[dc._maxParentDepth];
				}

				if (changeCount) {
					handleChanges();

					if (state != STATE_CHANGES_HANDLING) {
						return;
					}

					state = STATE_CHILDREN_RECALCULATION;

					break;
				}
			}
		}

		state = STATE_CHANGES_ACCUMULATION;
		circularityDetectionCounter = {};
	}

	/**
	 * @private
	 *
	 * @param {Rift.DataCell} dc
	 * @param {Object|undefined} diff
	 * @param {Rift.Event|undefined} [evt]
	 * @param {boolean} [cancellable=true]
	 */
	function addChange(dc, diff, evt, cancellable) {
		if (!evt) {
			evt = new Event('change');
			evt.target = dc;
			evt.timestamp = Date.now();

			if (diff) {
				evt.detail = { diff: diff };
			}
		}

		var id = getUID(dc);

		if (changeCount) {
			if (hasOwn.call(changes, id)) {
				var change = changes[id];

				(evt.detail || (evt.detail = {})).prevEvent = change.event;
				change.event = evt;

				if (cancellable === false) {
					change.cancellable = false;
				}

				return;
			}
		} else {
			if (state == STATE_CHANGES_ACCUMULATION) {
				nextTick(releaseChanges);
			}
		}

		changes[id] = {
			dataCell: dc,
			event: evt,
			cancellable: cancellable !== false
		};

		changeCount++;
	}

	var detectedParents = [];

	/**
	 * @class Rift.DataCell
	 * @extends {Rift.EventEmitter}
	 *
	 * @example
	 * var a = new DataCell(1);
	 * var b = new DataCell(2);
	 *
	 * var c = new DateCell(function() {
	 *     return a.value + b.value;
	 * }, {
	 *     onchange: function() {
	 *         console.log('c.value: ' + c.value);
	 *     }
	 * });
	 *
	 * console.log(c.value); // 3
	 *
	 * a.value = 5;
	 * b.value = 10;
	 *
	 * // c.value: 15
	 *
	 * @param {*|Function} [value] - Значение или функция для его вычисления.
	 * @param {Object} [opts] - Опции.
	 * @param {Function} [opts.get] - Будет использоваться при получении значения.
	 * @param {Function} [opts.set] - Будет использоваться при установке значения.
	 * @param {Function} [opts.onchange] - Инлайновый обработчик изменения значения.
	 */
	var DataCell = EventEmitter.extend(/** @lends Rift.DataCell# */{
		/**
		 * @type {*}
		 */
		initialValue: undef,

		_value: undef,
		_fixedValue: undef,
		_formula: null,
		_get: null,
		_set: null,

		/**
		 * Родительские ячейки.
		 *
		 * @type {Object<Rift.DataCell>}
		 * @protected
		 */
		_parents: null,

		/**
		 * Дочерние ячейки.
		 *
		 * @type {Object<Rift.DataCell>}
		 * @protected
		 */
		_children: null,

		/**
		 * @type {int}
		 * @protected
		 */
		_maxParentDepth: 0,

		/**
		 * @type {?Rift.Event}
		 * @protected
		 */
		_lastErrorEvent: null,

		/**
		 * Является ли ячейка вычисляемой.
		 *
		 * @type {boolean}
		 */
		computable: false,

		_changed: false,

		/**
		 * @type {boolean}
		 */
		get changed() {
			if (changeCount) {
				releaseChanges();
			}

			return this._changed;
		},

		/**
		 * @type {boolean}
		 */
		disposed: false,

		_onChange: null,

		/**
		 * Инлайновый обработчик изменения значения.
		 *
		 * @type {?Function}
		 * @writable
		 */
		get onchange() {
			return this._onChange;
		},
		set onchange(onChange) {
			if (changeCount) {
				releaseChanges();
			}

			this._onChange = onChange;
		},

		_onError: null,

		/**
		 * Инлайновый обработчик ошибки.
		 *
		 * @type {?Function}
		 * @writable
		 */
		get onerror() {
			return this._onError;
		},
		set onerror(onError) {
			if (changeCount) {
				releaseChanges();
			}

			this._onError = onError;
		},

		constructor: function(value, opts) {
			EventEmitter.call(this);

			if (!opts) {
				opts = {};
			}

			if (opts.get) { this._get = opts.get; }
			if (opts.set) { this._set = opts.set; }
			if (opts.onchange) { this._onChange = opts.onchange.bind(this); }
			if (opts.onerror) { this._onError = opts.onerror.bind(this); }

			this._children = {};

			this.computable = typeof value == 'function' && value.constructor == Function;

			if (this.computable) {
				this._formula = value;

				detectedParents.unshift({});

				try {
					this._value = this._fixedValue = this._formula();
				} catch (err) {
					this._handleError(err);
				}

				var parents = this._parents = detectedParents.shift();
				var maxParentDepth = 1;

				for (var id in parents) {
					var parent = parents[id];

					parent._children[getUID(this)] = this;

					if (maxParentDepth <= parent._maxParentDepth) {
						maxParentDepth = parent._maxParentDepth + 1;
					}
				}

				this._maxParentDepth = maxParentDepth;
			} else {
				this.initialValue = this._value = this._fixedValue = value;

				if (value instanceof EventEmitter) {
					value.on('change', this._onValueChange, this);
				}
			}
		},

		/**
		 * @type {*}
		 * @writable
		 */
		get value() {
			if (detectedParents.length) {
				detectedParents[0][getUID(this)] = this;
			}

			if (changeCount || state == STATE_CHANGES_HANDLING) {
				releaseChanges();
			}

			return this._get ? this._get(this._value) : this._value;
		},
		set value(value) {
			if (this.computable) {
				if (!this._set) {
					throw new TypeError('Cannot write to read-only dataСell');
				}

				this._set(value);
			} else {
				var oldValue = this._value;

				if (this._set) {
					var change = {};

					if (oldValue instanceof EventEmitter) {
						oldValue.off('change', this._onValueChange, this);
					}

					this._set(value, change);

					value = this._value;

					if (value instanceof EventEmitter) {
						value.on('change', this._onValueChange, this);
					}

					if (!svz(oldValue, value)) {
						change.type = 'update';
						change.oldValue = oldValue;
						change.value = value;

						addChange(this, { value: change });
					} else {
						if (!isEmpty(change)) {
							addChange(this, { value: change }, undef, value !== this._fixedValue);
						}
					}
				} else {
					if (!svz(oldValue, value)) {
						this._value = value;

						if (svz(value, this._fixedValue)) {
							var id = getUID(this);

							if (changes[id].cancellable) {
								delete changes[id];
								changeCount--;

								return;
							}
						}

						if (oldValue instanceof EventEmitter) {
							oldValue.off('change', this._onValueChange, this);
						}
						if (value instanceof EventEmitter) {
							value.on('change', this._onValueChange, this);
						}

						addChange(this, {
							value: {
								type: 'update',
								oldValue: oldValue,
								value: value
							}
						});
					}
				}
			}
		},

		/**
		 * Обработчик внутреннего изменения значения.
		 *
		 * @protected
		 *
		 * @param {Rift.Event} evt
		 * @param {Object} [evt.detail.diff]
		 */
		_onValueChange: function(evt) {
			addChange(this, undef, evt, this._value !== this._fixedValue);
		},

		/**
		 * @protected
		 */
		_recalc: function() {
			var id = getUID(this);

			if (hasOwn.call(circularityDetectionCounter, id)) {
				if (++circularityDetectionCounter[id] == 10) {
					this._handleError(new RangeError('Circular dependency detected'));
					return;
				}
			} else {
				circularityDetectionCounter[id] = 1;
			}

			var oldValue = this._value;
			var oldParents = this._parents;

			var error;

			detectedParents.unshift({});

			try {
				var value = this._formula();
			} catch (err) {
				error = err;
			}

			if (state != STATE_CHILDREN_RECALCULATION) {
				detectedParents.shift();
				return;
			}

			var parents = this._parents = detectedParents.shift();
			var maxParentDepth = 1;

			for (var parentId in oldParents) {
				if (!hasOwn.call(parents, parentId)) {
					delete oldParents[parentId]._children[id];
				}
			}

			for (var parentId in parents) {
				var parent = parents[parentId];

				if (!hasOwn.call(oldParents, parentId)) {
					parent._children[id] = this;
				}

				if (maxParentDepth <= parent._maxParentDepth) {
					maxParentDepth = parent._maxParentDepth + 1;
				}
			}

			if (this._maxParentDepth != maxParentDepth) {
				if (this._maxParentDepth < maxParentDepth) {
					this._maxParentDepth = maxParentDepth;
					addOutdatedDataCell(this);

					return;
				} else {
					this._maxParentDepth = maxParentDepth;
				}
			}

			if (error) {
				this._handleError(error);
			} else if (!svz(oldValue, value)) {
				this._value = value;

				addChange(this, {
					value: {
						type: 'update',
						oldValue: oldValue,
						value: value
					}
				});
			}
		},

		/**
		 * @protected
		 *
		 * @param {*} err
		 */
		_handleError: function(err) {
			this._logError(err);

			var evt = this.emit('error', { error: err });
			this._handleErrorEvent(evt);
		},

		/**
		 * @protected
		 *
		 * @param {Rift.Event} evt
		 */
		_handleErrorEvent: function(evt) {
			if (this._lastErrorEvent !== evt) {
				this._lastErrorEvent = evt;

				if (evt.target != this) {
					this._handleEvent(evt);
				}

				var children = this._children;

				for (var id in children) {
					if (evt.isPropagationStopped) {
						break;
					}

					children[id]._handleErrorEvent(evt);
				}
			}
		},

		on: function() {
			if (changeCount) {
				releaseChanges();
			}

			DataCell.$super.on.apply(this, arguments);
		},

		off: function() {
			if (changeCount) {
				releaseChanges();
			}

			DataCell.$super.off.apply(this, arguments);
		},

		/**
		 * Уничтожает ячейку данных освобождая занятые ей ресурсы.
		 */
		dispose: function() {
			if (this.disposed) {
				return;
			}

			var id = getUID(this);

			if (id in changes) {
				delete changes[id];
				changeCount--;
			}

			removeOutdatedDataCell(this);

			if (this.computable) {
				var parents = this._parents;

				for (var parentId in parents) {
					delete parents[parentId]._children[id];
				}
			} else {
				if (this._value instanceof EventEmitter) {
					this._value.off('change', this._onValueChange, this);
				}
			}

			var children = this._children;

			for (var childId in children) {
				children[childId].dispose();
			}

			this.disposed = true;
		}
	});

	_.DataCell = DataCell;

})();

(function() {

	var getUID = _.object.getUID;
	var cloneObject = _.object.clone;
	var DataCell = _.DataCell;

	/**
	 * Уничтожает активные свойства инстанса.
	 *
	 * @memberOf Rift.ActiveProperty
	 *
	 * @param {Object} inst
	 */
	function disposeDataCells(inst) {
		var dcs = inst._dataCells;

		if (dcs) {
			for (var id in dcs) {
				dcs[id].dispose();
			}

			inst._dataCells = null;
		}
	}

	/**
	 * @private
	 */
	function exec(prop, id, initialValue, opts, args) {
		var dc = (this._dataCells || (this._dataCells = {}))[id];

		if (!dc) {
			if (typeof initialValue == 'function') {
				initialValue = initialValue.bind(this);
			} else if (initialValue === Object(initialValue)) {
				if (typeof initialValue.clone == 'function') {
					initialValue = initialValue.clone();
				} else if (Array.isArray(initialValue)) {
					initialValue = initialValue.slice(0);
				} else {
					var copy = new initialValue.constructor(initialValue);
					initialValue = copy != initialValue ? copy : cloneObject(initialValue);
				}
			}

			if (opts) {
				var owner = this;

				opts = ['get', 'set', 'onchange', 'onerror'].reduce(function(options, name) {
					if (opts[name]) {
						options[name] = opts[name].bind(owner);
					}

					return options;
				}, {});
			}

			dc = this._dataCells[id] = new DataCell(initialValue, opts);
		}

		switch (args.length) {
			case 0: {
				return dc.value;
			}
			case 1: {
				dc.value = args[0];
				break;
			}
			default: {
				var methodName = args[0];
				args[0] = dc;
				return ActiveProperty.prototype[methodName].apply(prop, args);
			}
		}

		return this;
	}

	/**
	 * @class Rift.ActiveProperty
	 * @extends {Function}
	 *
	 * @example
	 * function User() {}
	 *
	 * User.prototype = {
	 *     firstName: new ActiveProperty(''),
	 *     lastName: new ActiveProperty(''),
	 *
	 *     fullName: new ActiveProperty(function() {
	 *         return (this.firstName() + ' ' + this.lastName()).trim();
	 *     }, {
	 *         set: function(fullName) {
	 *             fullName = fullName.split(' ');
	 *
	 *             this.firstName(fullName[0]);
	 *             this.lastName(fullName[1]);
	 *         },
	 *
	 *         onchange: function(evt) {
	 *             console.log('evt.detail.diff: ' + JSON.stringify(evt.detail.diff));
	 *         }
	 *     }),
	 *
	 *     name: new ActiveProperty(function() {
	 *         return this.firstName() || this.lastName();
	 *     }, {
	 *         set: function(firstName) {
	 *             this.firstName(firstName);
	 *         }
	 *     })
	 * };
	 *
	 * var user = new User();
	 *
	 * console.log(user.fullName()); // => ''
	 * console.log(user.name()); // => ''
	 *
	 * user.firstName('Vasya');
	 * user.lastName('Pupkin');
	 *
	 * // evt.detail.diff: {"value":{"oldValue":"","value":"Vasya Pupkin"}}
	 *
	 * console.log(user.fullName()); // => 'Vasya Pupkin'
	 * console.log(user.name()); // => 'Vasya'
	 *
	 * @param {*|Function} [value] - Значение или функция для его вычисления.
	 * @param {Object} [opts] - Опции.
	 * @param {Function} [opts.get] - Будет использоваться при получении значения.
	 * @param {Function} [opts.set] - Будет использоваться при установке значения.
	 * @param {Function} [opts.onchange] - Инлайновый обработчик изменения значения.
	 * @returns {Function}
	 */
	function ActiveProperty(value, opts) {
		function prop() {
			return exec.call(this, prop, id, value, opts, arguments);
		}

		var id = getUID(prop);

		Object.defineProperty(prop, 'constructor', {
			configurable: true,
			writable: true,
			value: ActiveProperty
		});

		return prop;
	}

	ActiveProperty.disposeDataCells = disposeDataCells;

	Object.assign(ActiveProperty.prototype, /** @lends Rift.ActiveProperty# */{
		/**
		 * @param {Rift.DataCell} dc
		 * @returns {Rift.DataCell}
		 */
		dataCell: function(dc) {
			return dc;
		},

		/**
		 * @param {Rift.DataCell} dc
		 * @param {Function} listener
		 * @param {Object} [context]
		 * @returns {Rift.ActiveProperty}
		 */
		subscribe: function(dc, listener, context) {
			dc.on('change', listener, context);
			return this;
		},

		/**
		 * @param {Rift.DataCell} dc
		 * @param {Function} listener
		 * @param {Object} [context]
		 * @returns {Rift.ActiveProperty}
		 */
		unsubscribe: function(dc, listener, context) {
			dc.off('change', listener, context);
			return this;
		}
	});

	_.ActiveProperty = ActiveProperty;

	_.$prop = function(value, opts) {
		return new ActiveProperty(value, opts);
	};

})();

(function() {

	var getUID = _.object.getUID;
	var getDataPropertyValues = _.object.getDataPropertyValues;
	var getHash = _.value.getHash;
	var EventEmitter = _.EventEmitter;
	var ActiveProperty = _.ActiveProperty;
	var disposeDataCells = _.ActiveProperty.disposeDataCells;

	/**
	 * @private
	 *
	 * @param {Function} method
	 * @returns {Function}
	 */
	function wrapListeningMethod(method) {
		return function _(target, type, listener, context, meta) {
			if (Array.isArray(target) || target instanceof $) {
				for (var i = target.length; i;) {
					_.call(this, target[--i], type, listener, context, meta);
				}
			} else if (typeof type == 'object') {
				meta = context;
				context = listener;

				var types = type;

				for (type in types) {
					_.call(this, target, type, types[type], context, meta);
				}
			} else if (Array.isArray(listener)) {
				var listeners = listener;

				for (var i = 0, l = listeners.length; i < l; i++) {
					_.call(this, target, type, listeners[i], context, meta);
				}
			} else if (typeof listener == 'object') {
				var props = listener;

				for (var name in props) {
					_.call(this, target[name]('dataCell', 0), type, props[name], context, meta);
				}
			} else {
				method.call(this, target, type, listener, context, meta);
			}

			return this;
		};
	}

	/**
	 * @private
	 *
	 * @param {{ target: Object, type: string, listener: Function, context: Object }} listening
	 */
	function removeListener(listening) {
		if (listening.target instanceof EventEmitter) {
			listening.target.off(listening.type, listening.listener, listening.context);
		} else {
			listening.target.removeEventListener(listening.type, listening.listener, false);
		}
	}

	/**
	 * @class Rift.Cleanable
	 * @extends {Rift.EventEmitter}
	 */
	var Cleanable = EventEmitter.extend(/** @lends Rift.Cleanable# */{
		_listening: null,
		_callbacks: null,
		_timeouts: null,
		_dataCells: null,

		/**
		 * Начинает прослушивание события на объекте.
		 *
		 * @param {Rift.EventEmitter|EventTarget} target
		 * @param {string} type
		 * @param {Function} listener
		 * @param {Object|undefined} [context=this]
		 * @param {*} [meta]
		 * @returns {Rift.Cleanable}
		 */
		listen: wrapListeningMethod(function(target, type, listener, context, meta) {
			this._listen(target, type, listener, context, meta);
		}),

		/**
		 * @protected
		 */
		_listen: function(target, type, listener, context, meta) {
			if (!context) {
				context = this;
			}

			var listening = this._listening || (this._listening = {});
			var id = getUID(target) + '-' + type + '-' +
				getUID(hasOwn.call(listener, keyListeningInner) ? listener[keyListeningInner] : listener) + '-' +
				getUID(context) + '-' + (meta !== undef ? getHash(meta) : '');

			if (hasOwn.call(listening, id)) {
				return;
			}

			if (target instanceof EventEmitter) {
				target.on(type, listener, context);
			} else if (typeof target.addEventListener == 'function') {
				if (target != context) {
					listener = listener.bind(context);
				}

				target.addEventListener(type, listener, false);
			} else {
				throw new TypeError('Unable to add a listener');
			}

			listening[id] = {
				target: target,
				type: type,
				listener: listener,
				context: context,
				meta: meta
			};
		},

		/**
		 * Останавливает прослушивание события на объекте.
		 *
		 * @param {Rift.EventEmitter|EventTarget} target
		 * @param {string} type
		 * @param {Function} listener
		 * @param {Object|undefined} [context=this]
		 * @param {*} [meta]
		 * @returns {Rift.Cleanable}
		 */
		stopListening: wrapListeningMethod(function(target, type, listener, context, meta) {
			this._stopListening(target, type, listener, context, meta);
		}),

		/**
		 * @protected
		 */
		_stopListening: function(target, type, listener, context, meta) {
			var listening = this._listening;

			if (!listening) {
				return;
			}

			if (!context) {
				context = this;
			}

			var id = getUID(target) + '-' + type + '-' +
				getUID(hasOwn.call(listener, keyListeningInner) ? listener[keyListeningInner] : listener) + '-' +
				getUID(context) + '-' + (meta !== undef ? getHash(meta) : '');

			if (hasOwn.call(listening, id)) {
				removeListener(listening[id]);
				delete listening[id];
			}
		},

		/**
		 * Останавливает прослушивание всех событий.
		 *
		 * @returns {Rift.Cleanable}
		 */
		stopAllListening: function() {
			var listening = this._listening;

			if (listening) {
				for (var id in listening) {
					removeListener(listening[id]);
					delete listening[id];
				}
			}

			return this;
		},

		/**
		 * Регистрирует колбэк.
		 *
		 * @param {Function} cb
		 * @returns {Function}
		 */
		regCallback: function(cb) {
			var callbacks = this._callbacks || (this._callbacks = {});
			var id = getUID(cb);

			if (hasOwn.call(callbacks, id)) {
				callbacks[id].canceled = true;
			}

			var cleanable = this;

			function outer() {
				if (hasOwn.call(outer, 'canceled') && outer.canceled) {
					return;
				}

				delete callbacks[id];
				cb.apply(cleanable, arguments);
			}

			callbacks[id] = outer;

			return outer;
		},

		/**
		 * Отменяет колбэк.
		 *
		 * @param {Function} cb
		 * @returns {Rift.Cleanable}
		 */
		cancelCallback: function(cb) {
			var callbacks = this._callbacks;

			if (callbacks) {
				var id = getUID(cb);

				if (hasOwn.call(callbacks, id)) {
					callbacks[id].canceled = true;
					delete callbacks[id];
				}
			}

			return this;
		},

		/**
		 * Отменяет все колбэки.
		 *
		 * @returns {Rift.Cleanable}
		 */
		cancelAllCallbacks: function() {
			var callbacks = this._callbacks;

			if (callbacks) {
				for (var id in callbacks) {
					callbacks[id].canceled = true;
					delete callbacks[id];
				}
			}

			return this;
		},

		/**
		 * Устанавливает таймер.
		 *
		 * @param {Function} cb
		 * @param {int} delay
		 * @returns {Rift.Cleanable}
		 */
		setTimeout: function(cb, delay) {
			var timeouts = this._timeouts || (this._timeouts = {});
			var id = getUID(cb);

			if (hasOwn.call(timeouts, id)) {
				clearTimeout(timeouts[id]);
			}

			var cleanable = this;

			timeouts[id] = setTimeout(function() {
				delete timeouts[id];
				cb.call(cleanable);
			}, delay);

			return this;
		},

		/**
		 * Отменяет установленный таймер.
		 *
		 * @param {Function} cb - Колбэк отменяемого таймера.
		 * @returns {Rift.Cleanable}
		 */
		clearTimeout: function(cb) {
			var timeouts = this._timeouts;

			if (timeouts) {
				var id = getUID(cb);

				if (hasOwn.call(timeouts, id)) {
					clearTimeout(timeouts[id]);
					delete timeouts[id];
				}
			}

			return this;
		},

		/**
		 * Отменяет все установленные таймеры.
		 *
		 * @returns {Rift.Cleanable}
		 */
		clearAllTimeouts: function() {
			var timeouts = this._timeouts;

			if (timeouts) {
				for (var id in timeouts) {
					clearTimeout(timeouts[id]);
					delete timeouts[id];
				}
			}

			return this;
		},

		/**
		 * @param {Object} data
		 */
		collectDumpObject: function(data) {
			var dcs = this._dataCells;

			if (!dcs) {
				return;
			}

			var values = getDataPropertyValues(this);

			for (var name in values) {
				var value = values[name];

				if (typeof value == 'function' && value.constructor == ActiveProperty) {
					var id = getUID(value);

					if (hasOwn.call(dcs, id)) {
						var dc = dcs[id];

						if (!dc.computable) {
							var dcValue = dc.value;

							if (dcValue === Object(dcValue) ? dc.changed : dc.initialValue !== dcValue) {
								data[name] = dcValue;
							}
						}
					}
				}
			}
		},

		/**
		 * @param {Object} data
		 */
		expandFromDumpObject: function(data) {
			for (var name in data) {
				this[name](data[name]);
			}
		},

		/**
		 * Останавливает прослушивание всех событий, отменяет все колбэки и все установленные таймеры.
		 */
		clean: function() {
			this
				.stopAllListening()
				.cancelAllCallbacks()
				.clearAllTimeouts();

			disposeDataCells(this);
		},

		/**
		 * Уничтожает инстанс освобождая занятые им ресурсы.
		 */
		dispose: function() {
			this.clean();
		}
	});

	_.Cleanable = Cleanable;

})();

(function() {

	var Cleanable = _.Cleanable;

	/**
	 * @class Rift.BaseModel
	 * @extends {Rift.Cleanable}
	 * @abstract
	 *
	 * @param {?(Object|undefined)} [data] - Начальные данные.
	 * @param {Object} [opts]
	 */
	var BaseModel = Cleanable.extend(/** @lends Rift.BaseModel# */{
		_options: null,

		constructor: function(data, opts) {
			Cleanable.call(this);

			this._options = opts || {};

			if (data) {
				this.setData(data);
			}
		},

		/**
		 * @param {Object} data
		 */
		setData: function(data) {
			for (var name in data) {
				if (name in this) {
					this[name](data[name]);
				}
			}
		},

		/**
		 * @param {Object} data
		 * @param {Object} opts
		 */
		collectDumpObject: function(data, opts) {
			BaseModel.$super.collectDumpObject.call(this, data);
			Object.assign(opts, this._options);
		}
	});

	_.BaseModel = BaseModel;

})();

(function() {

	var reAmpersand = /&/g;
	var reLessThan = /</g;
	var reGreaterThan = />/g;
	var reQuote = /"/g;

	/**
	 * @function escape
	 * @memberOf Rift.html
	 *
	 * @param {*} str
	 * @returns {string}
	 */
	function escapeHTML(str) {
		return str
			.replace(reAmpersand, '&amp;')
			.replace(reLessThan, '&lt;')
			.replace(reGreaterThan, '&gt;')
			.replace(reQuote, '&quot;');
	}

	/**
	 * @namespace Rift.html
	 */
	_.html = {
		escape: escapeHTML
	};

})();

(function() {

	/**
	 * @function push
	 * @memberOf Rift.mods
	 *
	 * @param {Array<string>} cls
	 * @param {Object} mods
	 * @returns {Array<string>}
	 */
	function pushMods(cls, mods) {
		for (var name in mods) {
			var value = mods[name];

			if (value != null && value !== false) {
				cls.push('__' + name + (value === true ? '' : '_' + value));
			}
		}

		return cls;
	}

	/**
	 * @namespace Rift.mods
	 */
	_.mods = {
		push: pushMods
	};

})();

(function() {

	var nextUID = _.uid.next;
	var classes = _.Class.classes;
	var ActiveDictionary = _.ActiveDictionary;
	var ActiveArray = _.ActiveArray;
	var pushMods = _.mods.push;

	/**
	 * @param {Object|Array|Rift.ActiveDictionary|Rift.ActiveArray} [target]
	 * @param {Function} cb
	 * @param {Object} context
	 */
	function each(target, cb, context) {
		if (!target) {
			return;
		}

		if (target instanceof ActiveDictionary) {
			target = target.toObject();
		} else if (target instanceof ActiveArray) {
			target = target.toArray();
		}

		if (Array.isArray(target)) {
			for (var i = 0, l = target.length; i < l; i++) {
				if (i in target) {
					cb.call(context, target[i], i);
				}
			}
		} else {
			for (var name in target) {
				if (hasOwn.call(target, name)) {
					cb.call(context, target[name], name);
				}
			}
		}
	}

	/**
	 * @param {string} viewClass
	 * @param {Object} [opts]
	 * @returns {string}
	 */
	function include(viewClass, opts) {
		if (!hasOwn.call(classes, viewClass)) {
			throw new TypeError('View "' + viewClass + '" is not defined');
		}

		if (opts) {
			opts.parent = this;
			opts.block = null;
		} else {
			opts = { parent: this, block: null };
		}

		var view = this;
		var childRenderings = this._childRenderings;
		var index = childRenderings.count++;
		var mark = childRenderings.marks[index] = '{{_' + nextUID() + '}}';

		new classes[viewClass](opts).render(function(html) {
			childRenderings.results[index] = html;

			if (childRenderings.count == ++childRenderings.readyCount && childRenderings.onready) {
				view._childRenderings = null;
				childRenderings.onready();
			}
		});

		return mark;
	}

	var helpers = {
		/**
		 * @param {string} name
		 * @param {Object} [mods]
		 * @returns {string}
		 */
		el: function(name, mods) {
			var cls = [this.blockName + '_' + name, this._id + '--'];

			if (mods) {
				pushMods(cls, mods);
			}

			return cls.join(' ');
		}
	};

	/**
	 * @namespace Rift.template
	 */
	_.template = {
		defaults: {
			include: include,
			helpers: helpers,
			each: each
		},

		templates: {}
	};

})();

(function() {

	var getUID = _.object.getUID;
	var createNamespace = _.namespace.create;
	var forEachMatch = _.regex.forEach;
	var DataCell = _.DataCell;

	/**
	 * @namespace Rift.domBinding.helpers
	 */
	var helpers = {
		html: function(el, value) {
			el.innerHTML = value;
		},

		text: function(el, value, targetNode) {
			switch (targetNode) {
				case 'first': {
					var node = el.firstChild;

					if (node && node.nodeType == 3) {
						node.nodeValue = value;
					} else {
						el.insertBefore(document.createTextNode(value), node);
					}

					break;
				}
				case 'last': {
					var node = el.lastChild;

					if (node && node.nodeType == 3) {
						node.nodeValue = value;
					} else {
						el.appendChild(document.createTextNode(value));
					}

					break;
				}
				case 'prev': {
					var node = el.previousSibling;

					if (node && node.nodeType == 3) {
						node.nodeValue = value;
					} else {
						el.parentNode.insertBefore(document.createTextNode(value), el);
					}

					break;
				}
				case 'next': {
					var node = el.nextSibling;

					if (node && node.nodeType == 3) {
						node.nodeValue = value;
					} else {
						el.parentNode.insertBefore(document.createTextNode(value), node);
					}

					break;
				}
				default: {
					if (el.childNodes.length == 1 && el.firstChild.nodeType == 3) {
						el.firstChild.nodeValue = value;
					} else {
						while (el.lastChild) {
							el.removeChild(el.lastChild);
						}

						el.appendChild(document.createTextNode(value));
					}

					break;
				}
			}
		},

		prop: function(el, value, id) {
			id = id.split('.');
			var name = id.pop();
			createNamespace(id, el)[name] = value;
		},

		attr: function(el, value, name) {
			el.setAttribute(name, value);
		},

		value: function(el, value) {
			if (el.value != value) {
				el.value = value;
			}
		},

		css: function(el, value, name) {
			el.style[name || 'cssText'] = value;
		},

		show: function(el, value) {
			el.style.display = value ? '' : 'none';
		}
	};

	var reName = '[$_a-zA-Z][$\\w]*';
	var reBindingExpr = RegExp(
		'(' + reName + ')(?:\\(([^)]*)\\))?:\\s*(\\S[\\s\\S]*?)(?=\\s*(?:,\\s*' + reName +
			'(?:\\([^)]*\\))?:\\s*\\S|$))',
		'g'
	);
	var keyDataCells = '_rt-dataCells';

	/**
	 * Привязывает элемент к активным свойствам по атрибуту `rt-bind`.
	 *
	 * @memberOf Rift.domBinding
	 *
	 * @param {HTMLElement} el
	 * @param {Object} context
	 * @param {Object} [opts]
	 * @param {boolean} [opts.applyValues=true]
	 * @returns {Object<Rift.DataCell>}
	 */
	function bindElement(el, context, opts) {
		if (hasOwn.call(el, keyDataCells)) {
			return el[keyDataCells];
		}

		var dcs = el[keyDataCells] = {};

		if (el.hasAttribute('rt-bind')) {
			var applyValues = !opts || opts.applyValues !== false;

			forEachMatch(reBindingExpr, el.getAttribute('rt-bind'), function(match, helper, meta, js) {
				var dc = new DataCell(Function('return ' + js + ';').bind(context), {
					onchange: function() {
						helpers[helper](el, this.value, meta);
					}
				});

				dcs[getUID(dc)] = dc;

				if (applyValues) {
					helpers[helper](el, dc.value, meta);
				}
			});
		}

		return dcs;
	}

	/**
	 * Отвязывает элемент от привязанных к нему активных свойств.
	 *
	 * @memberOf Rift.domBinding
	 *
	 * @param {HTMLElement} el
	 */
	function unbindElement(el) {
		if (hasOwn.call(el, keyDataCells)) {
			var dcs = el[keyDataCells];

			if (dcs) {
				for (var id in dcs) {
					dcs[id].dispose();
				}

				delete el[keyDataCells];
			}
		}
	}

	/**
	 * Привязывает элементы dom-дерева к активным свойствам по атрибуту `rt-bind`.
	 *
	 * @function bind
	 * @memberOf Rift.domBinding
	 *
	 * @param {HTMLElement} el
	 * @param {Object} context
	 * @param {Object} [opts]
	 * @param {boolean} [opts.bindRootElement=true]
	 * @param {boolean} [opts.applyValues=true]
	 * @param {boolean} [opts.removeAttr=false]
	 * @returns {Object<Rift.DataCell>}
	 */
	function bindDOM(el, context, opts) {
		if (!opts) {
			opts = {};
		}

		var removeAttr = opts.removeAttr === true;
		var elementBindingOptions = {
			applyValues: opts.applyValues !== false
		};
		var dcs = {};

		if (opts.bindRootElement !== false && el.hasAttribute('rt-bind')) {
			Object.assign(dcs, bindElement(el, context, elementBindingOptions));

			if (removeAttr) {
				el.removeAttribute('rt-bind');
			}
		}

		var els = el.querySelectorAll('[rt-bind]');

		for (var i = 0, l = els.length; i < l; i++) {
			Object.assign(dcs, bindElement(els[i], context, elementBindingOptions));

			if (removeAttr) {
				el.removeAttribute('rt-bind');
			}
		}

		return dcs;
	}

	/**
	 * @namespace Rift.domBinding
	 */
	_.domBinding = {
		helpers: helpers,
		bindElement: bindElement,
		unbindElement: unbindElement,
		bind: bindDOM
	};

})();

(function() {

	var getUID = _.object.getUID;
	var execNamespace = _.namespace.exec;
	var escapeRegExp = _.regex.escape;
	var getHash = _.value.getHash;
	var toString = _.value.toString;
	var nextTick = _.process.nextTick;
	var classes = _.Class.classes;
	var getClassOrError = _.Class.getOrError;
	var Cleanable = _.Cleanable;
	var escapeHTML = _.html.escape;
	var pushMods = _.mods.push;
	var templates = _.template.templates;
	var bindDOM = _.domBinding.bind;

	var reNameClass = /^(.+?)::(.+)$/;
	var reViewData = /([^,]*),([^,]*),(.*)/;
	var reBlockElement = {};
	var keyView = '_rt-view';
	var keyViewElementName = '_rt-viewElementName';

	/**
	 * @private
	 *
	 * @param {Rift.BaseView} view
	 * @param {Function} cb
	 */
	function renderInner(view, cb) {
		var childRenderings = view._childRenderings = {
			count: 0,
			readyCount: 0,

			marks: [],
			results: [],

			onready: null
		};
		var html;

		try {
			html = view.template.call(view);
		} catch (err) {
			view._logError(err);
			cb('');
			return;
		}

		childRenderings.onready = function() {
			var marks = childRenderings.marks;
			var results = childRenderings.results;

			for (var i = marks.length; i;) {
				html = html.replace(marks[--i], function() {
					return results[i];
				});
			}

			cb(html);
		};

		if (childRenderings.count == childRenderings.readyCount) {
			view._childRenderings = null;
			childRenderings.onready();
		}
	}

	/**
	 * @private
	 *
	 * @param {Rift.BaseView} view
	 */
	function initClient(view) {
		var dcs = bindDOM(view.block[0], view, {
			bindRootElement: false,
			applyValues: false,
			removeAttr: true
		});

		if (view._dataCells) {
			Object.assign(view._dataCells, dcs);
		} else {
			view._dataCells = dcs;
		}

		if (view._initClient != emptyFn) {
			nextTick(function() {
				if (view._initClient.length) {
					try {
						view._initClient(function(err) {
							if (err != null) {
								handleClientInitError(view, err);
								return;
							}

							bindEvents(view);
						});
					} catch (err) {
						handleClientInitError(view, err);
					}
				} else {
					var result;

					try {
						result = view._initClient();
					} catch (err) {
						handleClientInitError(view, err);
						return;
					}

					if (result) {
						result.then(function() {
							bindEvents(view);
						}, function(err) {
							handleClientInitError(view, err);
						});
					} else {
						bindEvents(view);
					}
				}
			});
		} else {
			nextTick(function() {
				bindEvents(view);
			});
		}
	}

	/**
	 * @private
	 *
	 * @param {Rift.BaseView} view
	 */
	function bindEvents(view) {
		if (view._bindEvents != emptyFn) {
			try {
				view._bindEvents();
			} catch (err) {
				handleClientInitError(view, err);
				return;
			}
		}

		view.emit('clientinited');
	}

	/**
	 * @private
	 *
	 * @param {Rift.BaseView} view
	 * @param {*} err
	 */
	function handleClientInitError(view, err) {
		view._logError(err);
		view.emit('clientiniterror', { error: err });
	}

	/**
	 * @private
	 *
	 * @param {HTMLElement} el
	 * @param {Object} attrs
	 */
	function setAttributes(el, attrs) {
		for (var name in attrs) {
			el.setAttribute(name, attrs[name]);
		}
	}

	/**
	 * @private
	 *
	 * @param {Rift.BaseView} view
	 * @param {HTMLElement} el
	 */
	function removeElement(view, el) {
		view.unregElement(el);

		if (el.parentNode) {
			el.parentNode.removeChild(el);
		}
	}

	/**
	 * @class Rift.BaseView
	 * @extends {Rift.Cleanable}
	 *
	 * @param {Object} [opts]
	 * @param {string} [opts.name]
	 * @param {string} [opts.tagName]
	 * @param {Object<boolean|number|string>} [opts.mods]
	 * @param {Object<string>} [opts.attrs]
	 * @param {boolean} [opts.onlyClient=false] - Рендерить только на клиенте.
	 * @param {Rift.BaseApp} [opts.app]
	 * @param {Rift.BaseModel|Rift.ActiveDictionary|Rift.ActiveArray|Rift.ActiveProperty|string} [opts.model]
	 * @param {Rift.BaseView} [opts.parent]
	 * @param {?(HTMLElement|$)} [opts.block]
	 */
	var BaseView = Cleanable.extend(/** @lends Rift.BaseView# */{
		static: {
			_isTemplateInited: false
		},

		_id: undef,

		_options: null,

		/**
		 * @type {string|undefined}
		 */
		name: undef,

		/**
		 * @type {string}
		 */
		tagName: 'div',

		/**
		 * @type {string}
		 */
		blockName: undef,

		/**
		 * @type {Object}
		 */
		mods: null,

		/**
		 * @type {Object<string>}
		 */
		attrs: null,

		/**
		 * @type {boolean}
		 */
		onlyClient: false,

		/**
		 * @type {?Rift.BaseApp}
		 */
		app: null,

		/**
		 * @type {?(Rift.BaseModel|Rift.ActiveDictionary|Rift.ActiveArray|Rift.ActiveProperty)}
		 */
		model: null,

		_parent: null,

		/**
		 * Родительская въюшка.
		 *
		 * @type {?Rift.BaseView}
		 * @writable
		 */
		get parent() {
			return this._parent;
		},
		set parent(parent) {
			if (parent) {
				parent.regChild(this);
			} else if (this._parent) {
				this._parent.unregChild(this);
			}
		},

		/**
		 * Дочерние въюшки.
		 *
		 * @type {Array<Rift.BaseView>}
		 */
		children: null,

		/**
		 * Корневой элемент въюшки.
		 *
		 * @type {?$}
		 */
		block: null,

		/**
		 * Элементы въюшки.
		 *
		 * @type {Object<$>}
		 */
		elements: null,

		/**
		 * @type {*}
		 */
		dataReceivingError: null,

		/**
		 * @type {Function}
		 */
		template: function() { return ''; },

		_childRenderings: null,

		/**
		 * @type {Function}
		 * @writable
		 */
		onclientinited: null,

		/**
		 * @type {Function}
		 * @writable
		 */
		onclientiniterror: null,

		constructor: function(opts) {
			Cleanable.call(this);

			if (!opts) {
				opts = {};
			}

			this._options = opts;

			this.mods = Object.create(this.mods);
			this.attrs = Object.create(this.attrs);

			this.children = [];
			this.elements = {};

			if (!this.blockName) {
				var viewClass = this.constructor;

				while (viewClass.$super.constructor != BaseView) {
					viewClass = viewClass.$super.constructor;
				}

				var cl = viewClass.__class;
				var index = cl.lastIndexOf('.');

				viewClass.prototype.blockName = index == -1 ? cl : cl.slice(index + 1);
			}

			if (!this.constructor._isTemplateInited) {
				var viewClass = this.constructor;

				do {
					var cl = viewClass.__class;
					var index = cl.lastIndexOf('.');
					var name = index == -1 ? cl : cl.slice(index + 1);

					if (hasOwn.call(templates, name)) {
						this.constructor.prototype.template = templates[name];
						break;
					}

					viewClass = viewClass.$super.constructor;
				} while (viewClass != BaseView);

				this.constructor._isTemplateInited = true;
			}

			var block;

			if (isServer) {
				if (opts.block) {
					throw new TypeError('Option "block" can\'t be used on the server side');
				}

				block = null;

				if (opts.block === null) {
					delete opts.block;
				}
			} else {
				if (opts.block !== undef) {
					block = opts.block;
					delete opts.block;
				}
			}

			if (block === null) {
				this._id = getUID(this, isServer ? 's' : 'c');
				this._parseOptions();
			} else {
				var data;
				var rendered = false;

				if (block) {
					if (block instanceof $) {
						block = block[0];
					}

					if (hasOwn.call(block, keyView) && block[keyView]) {
						throw new TypeError(
							'Element is already used as ' + (
								hasOwn.call(block, keyViewElementName) && block[keyViewElementName] ?
									'an element' : 'a block'
							) + ' of view'
						);
					}

					if (block.hasAttribute('rt-v')) {
						data = block.getAttribute('rt-v').match(reViewData);

						if (data[2]) {
							rendered = true;
						}

						if (data[3]) {
							Object.assign(opts, Function('return {' + data[3] + '};')());
						}
					}
				}

				this._id = rendered ? data[2] : getUID(this, 'c');
				this._parseOptions();

				if (!block) {
					block = document.createElement(this.tagName);
				}

				this.block = $(block);
				block[keyView] = this;

				var view = this;

				if (rendered) {
					this._collectElements();

					this.block
						.find('[rt-p=' + this._id + ']')
						.each(function() {
							new classes[this.getAttribute('rt-v').match(reViewData)[1]]({
								parent: view,
								block: this
							});
						});

					initClient(this);
				} else {
					block.className = (block.className + ' ' + pushMods([this.blockName], this.mods).join(' ')).trim();

					setAttributes(block, this.attrs);

					this.renderInner(function(html) {
						block.innerHTML = html;

						var blocks = block.querySelectorAll('[rt-p]');
						var blockDict = {};

						for (var i = blocks.length; i;) {
							blockDict[blocks[--i].getAttribute('rt-v').match(reViewData)[2]] = blocks[i];
						}

						(function _(view) {
							view._collectElements();

							var children = view.children;

							for (var i = 0, l = children.length; i < l; i++) {
								var child = children[i];
								var childBlock = blockDict[child._id];

								child.block = $(childBlock);
								childBlock[keyView] = child;

								_(child);
							}

							initClient(view);
						})(view);
					});
				}
			}
		},

		/**
		 * @protected
		 */
		_parseOptions: function() {
			var opts = this._options;

			if (opts.name) {
				this.name = opts.name;
			}

			if (opts.tagName) {
				this.tagName = opts.tagName;
				delete opts.tagName;
			}

			if (opts.blockName) {
				this.blockName = opts.blockName;
			}

			if (opts.mods) {
				Object.assign(this.mods, opts.mods);
				delete opts.mods;
			}

			if (opts.attrs) {
				Object.assign(this.attrs, opts.attrs);
				delete opts.attrs;
			}

			if (opts.onlyClient !== undef) {
				this.onlyClient = opts.onlyClient;
			}

			if (opts.parent) {
				this.parent = opts.parent;
				delete opts.parent;
			}

			if (opts.app) {
				this.app = opts.app;
				delete opts.app;

				this.model = this.app.model;
			}

			var model = opts.model;

			if (model) {
				if (typeof model == 'string') {
					this.model = execNamespace(model, this._parent || this);
				} else {
					this.model = model;
					delete opts.model;
				}
			} else {
				var parent = this._parent;

				if (parent && parent.model) {
					this.model = parent.model;
				}
			}
		},

		/**
		 * @param {Function} cb
		 */
		render: function(cb) {
			if (this._childRenderings) {
				throw new TypeError('Cannot run the rendering when it is in process');
			}

			if (isServer && this.onlyClient) {
				cb(
					'<' + this.tagName +
						' rt-v="' + [
							this.constructor.__class,
							'',
							isEmpty(this._options) ? '' : escapeHTML(toString(this._options).slice(1, -1))
						] + '"' +
						(this._parent ? ' rt-p="' + this._parent._id + '"' : '') +
						'></' + this.tagName + '>'
				);

				return;
			}

			var view = this;

			this.renderInner(function(html) {
				var cls = [view.blockName];
				var attrs = [];

				pushMods(cls, view.mods);

				var attribs = view.attrs;

				for (var name in attribs) {
					attrs.push(name + '="' + attribs[name] + '"');
				}

				cb(
					'<' + view.tagName +
						' class="' + cls.join(' ') + '"' +
						(attrs.length ? ' ' + attrs.join(' ') : '') +
						' rt-v="' + [
							view.constructor.__class,
							view._id,
							isEmpty(view._options) ? '' : escapeHTML(toString(view._options).slice(1, -1))
						] + '"' +
						(view._parent ? ' rt-p="' + view._parent._id + '"' : '') +
						'>' + html + '</' + view.tagName + '>'
				);
			});
		},

		/**
		 * @param {Function} cb
		 */
		renderInner: function(cb) {
			if (this._childRenderings) {
				throw new TypeError('Cannot run the rendering when it is in process');
			}

			if (this.receiveData != emptyFn) {
				var view = this;

				try {
					if (this.receiveData.length) {
						view.receiveData(function(err) {
							if (err != null) {
								view.dataReceivingError = err;
								view._logError(err);
							}

							renderInner(view, cb);
						});
					} else {
						this.receiveData().then(function() {
							renderInner(view, cb);
						}, function(err) {
							view.dataReceivingError = err;
							view._logError(err);

							renderInner(view, cb);
						});
					}
				} catch (err) {
					this.dataReceivingError = err;
					this._logError(err);

					renderInner(this, cb);
				}
			} else {
				renderInner(this, cb);
			}
		},

		/**
		 * @param {Function} [cb]
		 * @returns {Promise|undefined}
		 */
		receiveData: emptyFn,

		_collectElements: function() {
			var blockName = this.blockName;
			var reBE = hasOwn.call(reBlockElement, blockName) ?
				reBlockElement[blockName] :
				(reBlockElement[blockName] = RegExp('(?:^|\\s)' + escapeRegExp(blockName) + '_([^_\\s]+)(?:\\s|$)'));
			var els = this.elements;

			this.block.find('.' + this._id + '--').each(function() {
				var name = this.className.match(reBE)[1];
				(els[name] || (els[name] = $())).push(this);
			});
		},

		/**
		 * @protected
		 *
		 * @param {Function} [cb]
		 * @returns {Promise|undefined}
		 */
		_initClient: emptyFn,

		/**
		 * @protected
		 */
		_bindEvents: emptyFn,

		/**
		 * Регистрирует дочернюю въюшку.
		 *
		 * @param {Rift.BaseView} child
		 * @returns {Rift.BaseView}
		 */
		regChild: function(child) {
			if (child._parent) {
				if (child._parent != this) {
					throw new TypeError('View is already registered as a child of other view');
				}

				return this;
			}

			child._parent = this;

			var children = this.children;
			var childName = child.name;

			children.push(child);

			if (childName) {
				(hasOwn.call(children, childName) ? children[childName] : (children[childName] = [])).push(child);
			}

			return this;
		},

		/**
		 * Отменяет регистрацию дочерней въюшки.
		 *
		 * @param {Rift.BaseView} child
		 * @returns {Rift.BaseView}
		 */
		unregChild: function(child) {
			if (child._parent !== this) {
				return this;
			}

			child._parent = null;

			var children = this.children;
			var childName = child.name;

			children.splice(children.indexOf(child), 1);

			if (childName) {
				var namedChildren = children[childName];

				namedChildren.splice(namedChildren.indexOf(child), 1);

				if (!namedChildren.length) {
					delete children[childName];
				}
			}

			return this;
		},

		/**
		 * Регистрирует элемент.
		 *
		 * @param {string} name
		 * @param {HTMLElement} el
		 * @returns {Rift.BaseView}
		 */
		regElement: function(name, el) {
			if (hasOwn.call(el, keyView) && el[keyView]) {
				if (!hasOwn.call(el, keyViewElementName) || !el[keyViewElementName]) {
					throw new TypeError('Element can\'t be registered because it is used as a block of view');
				}

				if (el[keyView] != this || el[keyViewElementName] != name) {
					throw new TypeError('Element is already registered as an element of other view');
				}

				return this;
			}

			el[keyView] = this;
			el[keyViewElementName] = name;

			(hasOwn.call(this.elements, name) ? this.elements[name] : (this.elements[name] = $())).push(el);

			return this;
		},

		/**
		 * Отменяет регистрацию элемента.
		 *
		 * @param {HTMLElement} el
		 * @returns {Rift.BaseView}
		 */
		unregElement: function(el) {
			if (!hasOwn.call(el, keyViewElementName)) {
				return this;
			}

			var name = el[keyViewElementName];

			if (!name || el[keyView] != this) {
				return this;
			}

			el[keyView] = null;
			el[keyViewElementName] = undef;

			var els = this.elements[name];

			els.splice(els.indexOf(el), 1);

			if (!els.length) {
				delete this.elements[name];
			}

			return this;
		},

		/**
		 * Создаёт и регистрирует элемент(ы) и/или возвращает именованную $-коллекцию.
		 *
		 * @example
		 * this.$('btnSend'); // получение элемента(ов) по имени
		 *
		 * @example
		 * // создаёт новый элемент `<li class="Module_item __selected">Hi!</li>`,
		 * // добавляет его в коллекцию item и возвращает всю коллекцию
		 * this.$('item', '<li class="__selected">Hi!</li>');
		 *
		 * @example
		 * // то же, что и в предыдущем примере, но описание элемента в виде объекта
		 * this.$('item', { tagName: 'li', mods: { selected: true }, html: 'Hi!' });
		 *
		 * @param {string} name
		 * @param {...({ tagName: string, mods: Object, attrs: Object<string>, html: string }|string|HTMLElement)} [el]
		 * @returns {$}
		 */
		$: function(name) {
			var argCount = arguments.length;

			if (argCount > 1) {
				var i = 1;

				do {
					var el = arguments[i];
					var type = typeof el;

					if (type == 'string' || el instanceof HTMLElement) {
						if (type == 'string') {
							var outer = document.createElement('div');

							outer.innerHTML = el;
							el = outer.childNodes.length == 1 && outer.firstChild.nodeType == 1 ?
								outer.firstChild : outer;
						}

						el.className = (this.blockName + '_' + name + ' ' + el.className).trim();
					} else {
						var elem = document.createElement(el.tagName || 'div');
						var cls = [this.blockName + '_' + name];

						if (el.mods) {
							pushMods(cls, el.mods);
						}

						elem.className = cls.join(' ');

						if (el.attrs) {
							setAttributes(elem, el.attrs);
						}

						if (el.html) {
							elem.innerHTML = el.html;
						}

						el = elem;
					}

					this.regElement(name, el);
				} while (++i < argCount);
			}

			return this.elements[name];
		},

		/**
		 * Удаляет элемент(ы) из dom-дерева и отменяет его(их) регистрацию.
		 *
		 * @param {...(HTMLElement|string|$)} els
		 * @returns {Rift.BaseView}
		 */
		$rm: function() {
			for (var i = arguments.length; i;) {
				var el = arguments[--i];

				if (typeof el == 'string') {
					if (!hasOwn.call(this.elements, el)) {
						continue;
					}

					el = this.elements[el];
				}

				if (el instanceof $) {
					var view = this;

					el.each(function() {
						removeElement(view, this);
					});
				} else {
					removeElement(this, el);
				}
			}

			return this;
		},

		/**
		 * @param {string} children
		 * @param {string} method
		 * @param {...*} [args]
		 * @returns {Array}
		 */
		broadcast: function(children, method) {
			var name;
			var cl;

			if (reNameClass.test(children)) {
				name = RegExp.$1;
				cl = RegExp.$2;
			} else {
				name = children;
				cl = '*';
			}

			children = name == '*' ? this.children : this.children[name];

			if (cl == '*') {
				children = children.slice(0);
			} else {
				cl = getClassOrError(cl);

				children = children.filter(function(child) {
					return child instanceof cl;
				});
			}

			var args = slice.call(arguments, 2);

			return children.map(function(child) {
				return child[method].apply(child, args);
			});
		},

		_listen: function(target, evt, listener, context, meta) {
			var type;
			var cl;

			if (target instanceof BaseView) {
				if (reNameClass.test(evt)) {
					type = RegExp.$1;
					cl = RegExp.$2;

					if (cl != '*') {
						cl = getClassOrError(cl);

						var inner = listener;
						var outer = function(evt) {
							if (evt.target instanceof cl) {
								return inner.call(this, evt);
							}
						};
						outer[keyListeningInner] = inner;

						listener = outer;
					}
				} else {
					type = evt;

					var view = this;
					var inner = listener;
					var outer = function(evt) {
						if (evt.target == view) {
							return inner.call(this, evt);
						}
					};
					outer[keyListeningInner] = inner;

					listener = outer;
				}
			} else {
				type = evt;
			}

			BaseView.$super._listen.call(
				this,
				target,
				type,
				listener,
				context,
				(cl ? (cl === '*' ? '' : getUID(cl)) : '0') + getHash(meta)
			);
		},

		_stopListening: function(target, evt, listener, context, meta) {
			var type;
			var cl;

			if (target instanceof BaseView) {
				if (reNameClass.test(evt)) {
					type = RegExp.$1;
					cl = RegExp.$2;

					if (cl != '*') {
						cl = getClassOrError(cl);
					}
				} else {
					type = evt;
				}
			} else {
				type = evt;
			}

			BaseView.$super._stopListening.call(
				this,
				target,
				type,
				listener,
				context,
				(cl ? (cl === '*' ? '' : getUID(cl)) : '0') + getHash(meta)
			);
		},

		/**
		 * Уничтожает въюшку освобождая занятые ей ресурсы.
		 */
		dispose: function() {
			var block = this.block[0];

			if (block.parentNode) {
				block.parentNode.removeChild(block);
			}

			var children = this.children;

			for (var i = children.length; i;) {
				children[--i].dispose();
			}

			if (this._parent) {
				var parentChildren = this._parent.children;

				parentChildren.splice(parentChildren.indexOf(this), 1);

				if (this.name) {
					parentChildren = parentChildren[this.name];
					parentChildren.splice(parentChildren.indexOf(this), 1);
				}
			}

			block[keyView] = null;

			BaseView.$super.dispose.call(this);
		}
	});

	_.BaseView = BaseView;

})();

(function() {

	var serialize = _.dump.serialize;
	var deserialize = _.dump.deserialize;
	var ActiveProperty = _.ActiveProperty;
	var Cleanable = _.Cleanable;

	/**
	 * @class Rift.ViewState
	 * @extends {Rift.Cleanable}
	 *
	 * @param {Object} fields
	 */
	var ViewState = Cleanable.extend('Rift.ViewState', /** @lends Rift.ViewState# */{
		/**
		 * @type {Array<string>}
		 */
		fields: null,

		constructor: function(fields) {
			Cleanable.call(this);

			this.fields = Object.keys(fields);

			for (var id in fields) {
				this[id] = typeof fields[id] == 'function' ? fields[id] : new ActiveProperty(fields[id]);
			}
		},

		/**
		 * @returns {Object<string>}
		 */
		serializeData: function() {
			var fields = this.fields;
			var data = {};

			for (var i = fields.length; i;) {
				var dc = this[fields[--i]]('dataCell', 0);

				if (!dc.computable) {
					var value = dc.value;

					if (dc.initialValue !== value || value === Object(value)) {
						data[fields[i]] = serialize({ v: value });
					}
				}
			}

			return data;
		},

		/**
		 * @param {Object<string>} data
		 * @returns {Rift.ViewState}
		 */
		updateFromSerializedData: function(data) {
			var deserialized = {};

			for (var id in data) {
				deserialized[id] = deserialize(data[id]).v;
			}

			this.update(deserialized);

			return this;
		},

		/**
		 * @param {Object} data
		 * @returns {Rift.ViewState}
		 */
		update: function(data) {
			var fields = this.fields;

			for (var i = fields.length; i;) {
				var id = fields[--i];
				this[id](hasOwn.call(data, id) ? data[id] : this[id]('dataCell', 0).initialValue);
			}

			return this;
		}
	});

	_.ViewState = ViewState;

})();

(function() {

	var logError = _.logError;
	var escapeRegExp = _.regex.escape;
	var nextTick = _.process.nextTick;

	var reNotLocal = /^(?:\w+:)?\/\//;
	var reSlashes = /[\/\\]+/g;
	var reInsert = /\{([^}]+)\}/g;
	var reOption = /\((?:\?(\S+)\s+)?([^)]+)\)/g;

	/**
	 * @private
	 *
	 * @param {string} str
	 * @returns {number|string}
	 */
	function tryStringAsNumber(str) {
		if (str != '') {
			if (str == 'NaN') {
				return NaN;
			}

			var num = Number(str);

			if (num == num) {
				return num;
			}
		}

		return str;
	}

	/**
	 * Кодирует путь. Символы те же, что и у encodeURIComponent, кроме слеша `/`.
	 * В отличии от encodeURI и encodeURIComponent не трогает уже закодированное:
	 *     encodeURIComponent(' %20'); // => '%20%2520'
	 *     encodePath(' %20'); // => '%20%20'
	 *
	 * @example
	 * encodeURIComponent(' %20/%2F'); // => '%20%2520%2F%252F'
	 * encodePath(' %20/%2F'); // => '%20%20/%2F'
	 *
	 * @private
	 *
	 * @param {string} path
	 * @returns {string}
	 */
	function encodePath(path) {
		path = path.split('/');

		for (var i = path.length; i;) {
			path[--i] = encodeURIComponent(decodeURIComponent(path[i]));
		}

		return path.join('/');
	}

	/**
	 * @private
	 *
	 * @param {string} path
	 * @returns {string}
	 */
	function slashifyPath(path) {
		if (path[0] != '/') {
			path = '/' + path;
		}
		if (path[path.length - 1] != '/') {
			path += '/';
		}

		return path;
	}

	/**
	 * @typedef {{
	 *     rePath: RegExp,
	 *     fields: { type: int, id: string },
	 *     requiredFields: Array<string>,
	 *     pathMap: { requiredFields: Array<string>, pathPart: string=, field: string= },
	 *     callback: Function
	 * }} Router~Route
	 */

	/**
	 * @private
	 */
	function setState(router, route, path, viewStateData, mode) {
		router.currentRoute = route;
		router.currentPath = path;

		if (isClient) {
			if (mode) {
				history[mode == 1 ? 'pushState' : 'replaceState']({
					'_rt-state': {
						routeIndex: router.routes.indexOf(route),
						path: path,
						viewStateData: viewStateData
					}
				}, null, path);
			} else {
				var state = history.state || {};

				state['_rt-state'] = {
					routeIndex: router.routes.indexOf(route),
					path: path,
					viewStateData: viewStateData
				};

				history.replaceState(state, null, path);
			}
		}

		if (route.callback) {
			router._isHistoryPositionFrozen = true;

			try {
				route.callback.call(router.app, path);
			} catch (err) {
				logError(err);
			} finally {
				router._isHistoryPositionFrozen = false;
			}
		}
	}

	/**
	 * @class Rift.Router
	 * @extends {Object}
	 *
	 * @param {Rift.BaseApp} app
	 * @param {Array<{ path: string, callback: Function= }|string>} [routes]
	 */
	function Router(app, routes) {
		this._onViewStateChange = this._onViewStateChange.bind(this);

		this.app = app;

		this.routes = [];

		if (routes) {
			this.addRoutes(routes);
		}
	}

	Object.assign(Router.prototype, /** @lends Rift.Router# */{
		/**
		 * Ссылка на приложение.
		 *
		 * @type {Rift.App}
		 */
		app: null,

		/**
		 * Ссылка на корневой элемент въюшки.
		 *
		 * @type {?HTMLElement}
		 */
		viewBlock: null,

		/**
		 * @type {Array<Router~Route>}
		 * @protected
		 */
		routes: null,

		/**
		 * @type {?Router~Route}
		 */
		currentRoute: null,

		/**
		 * @type {string|undefined}
		 */
		currentPath: undef,

		/**
		 * @type {boolean}
		 */
		started: false,

		_isViewStateChangeHandlingRequired: false,
		_isHistoryPositionFrozen: false,

		/**
		 * @param {Array<{ path: string, callback: Function }|string>} routes
		 * @returns {Rift.Router}
		 */
		addRoutes: function(routes) {
			routes.forEach(function(route) {
				if (typeof route == 'string') {
					route = { path: route };
				}

				this.addRoute(route.path, route.callback);
			}, this);

			return this;
		},

		/**
		 * @param {string} path
		 * @param {Function|undefined} [callback]
		 * @returns {Rift.Router}
		 */
		addRoute: function(path, callback) {
			path = path.split(reOption);

			var rePath = [];
			var fields = [];
			var requiredFields = [];
			var pathMap = [];

			for (var i = 0, l = path.length; i < l;) {
				if (i % 3) {
					rePath.push('(');

					var pathMapItemRequiredFields = [];

					if (path[i]) {
						pathMapItemRequiredFields.push(path[i]);

						fields.push({
							type: 1,
							id: path[i]
						});
					}

					var pathPart = path[i + 1].split(reInsert);

					for (var j = 0, m = pathPart.length; j < m; j++) {
						if (j % 2) {
							var id = pathPart[j];

							pathMapItemRequiredFields.push(id);

							rePath.push('([^\\/]+)');

							fields.push({
								type: 2,
								id: id
							});

							pathMap.push({
								requiredFields: pathMapItemRequiredFields,
								field: id
							});
						} else {
							if (pathPart[j]) {
								var encodedPathPart = encodePath(pathPart[j]);

								rePath.push(escapeRegExp(encodedPathPart).split('\\*').join('.*?'));

								pathMap.push({
									requiredFields: pathMapItemRequiredFields,
									pathPart: encodedPathPart.split('*').join('')
								});
							}
						}
					}

					rePath.push(')?');

					i += 2;
				} else {
					if (path[i]) {
						var pathPart = path[i].split(reInsert);

						for (var j = 0, m = pathPart.length; j < m; j++) {
							if (j % 2) {
								var id = pathPart[j];

								rePath.push('([^\\/]+)');

								fields.push({
									type: 0,
									id: id
								});

								requiredFields.push(id);

								pathMap.push({
									requiredFields: [id],
									field: id
								});
							} else {
								if (pathPart[j]) {
									var encodedPathPart = encodePath(pathPart[j]);

									rePath.push(escapeRegExp(encodedPathPart).split('\\*').join('.*?'));

									pathMap.push({
										requiredFields: [],
										pathPart: encodedPathPart.split('*').join('')
									});
								}
							}
						}
					}

					i++;
				}
			}

			this.routes.push({
				rePath: RegExp('^\\/?' + rePath.join('') + '\\/?$'),
				fields: fields,
				requiredFields: requiredFields,
				pathMap: pathMap,
				callback: callback
			});

			return this;
		},

		/**
		 * @returns {Rift.Router}
		 */
		start: function() {
			if (this.started) {
				return this;
			}

			this.started = true;

			if (isClient) {
				this.viewBlock = this.app.view.block[0];
			}

			this.viewState = this.app.viewState;

			this._bindEvents();

			var match = this._tryViewState();

			if (match) {
				setState(this, match.route, match.path, this.app.viewState.serializeData());
			} else {
				if (isClient) {
					history.replaceState(history.state || {}, null, '/');
				}
			}

			return this;
		},

		/**
		 * @protected
		 */
		_bindEvents: function() {
			if (isClient) {
				window.addEventListener('popstate', this._onWindowPopState.bind(this), false);
				this.viewBlock.addEventListener('click', this._onViewBlockClick.bind(this), false);
			}

			var viewState = this.app.viewState;
			var onViewStateFieldChange = this._onViewStateFieldChange;
			var fields = viewState.fields;

			for (var i = fields.length; i;) {
				viewState[fields[--i]]('subscribe', onViewStateFieldChange, this);
			}
		},

		/**
		 * @protected
		 */
		_onWindowPopState: function() {
			var state = history.state && history.state['_rt-state'];

			if (state) {
				var route = this.currentRoute = this.routes[state.routeIndex];
				var path = this.currentPath = state.path;

				this.app.viewState.updateFromSerializedData(state.viewStateData);

				if (route.callback) {
					this._isHistoryPositionFrozen = true;

					try {
						route.callback.call(this.app, path);
					} catch (err) {
						logError(err);
					} finally {
						this._isHistoryPositionFrozen = false;
					}
				}
			} else {
				this.app.viewState.update({});

				var match = this._tryViewState();

				if (match) {
					setState(this, match.route, match.path, {});
				} else {
					this.currentRoute = null;
					this.currentPath = undef;
				}
			}
		},

		/**
		 * Обработчик клика по корневому элементу въюшки.
		 *
		 * @protected
		 *
		 * @param {MouseEvent} evt
		 */
		_onViewBlockClick: function(evt) {
			var viewBlock = this.viewBlock;
			var el = evt.target;

			while (el.tagName != 'A') {
				if (el == viewBlock) {
					return;
				}

				el = el.parentNode;
			}

			var href = el.getAttribute('href');

			if (!reNotLocal.test(href) && this.route(href)) {
				evt.preventDefault();
			}
		},

		/**
		 * @protected
		 */
		_onViewStateFieldChange: function() {
			if (this._isViewStateChangeHandlingRequired) {
				return;
			}

			this._isViewStateChangeHandlingRequired = true;

			nextTick(this._onViewStateChange);
		},

		/**
		 * Обработчик изменения состояния представления.
		 *
		 * @protected
		 */
		_onViewStateChange: function() {
			if (!this._isViewStateChangeHandlingRequired) {
				return;
			}

			this._isViewStateChangeHandlingRequired = false;

			var match = this._tryViewState(this.currentRoute);

			if (!match) {
				return;
			}

			var path = match.path;

			if (path === this.currentPath) {
				if (isClient) {
					var state = history.state || {};

					if (!state['_rt-state']) {
						state['_rt-state'] = {
							routeIndex: this.routes.indexOf(this.currentRoute),
							path: path
						};
					}

					state['_rt-state'].viewStateData = this.app.viewState.serializeData();

					history.replaceState(state, null, path);
				}
			} else {
				setState(this, match.route, path, this.app.viewState.serializeData(), 1);
			}
		},

		/**
		 * Редиректит по указанному пути.
		 * Если нет подходящего маршрута - возвращает false, редиректа не происходит.
		 *
		 * @param {string} path
		 * @returns {boolean}
		 */
		route: function(path) {
			path = encodePath(path.replace(reSlashes, '/'));

			if (path[0] != '/') {
				var locationPath = location.pathname;
				path = locationPath + (locationPath[locationPath.length - 1] == '/' ? '' : '/') + path;
			}

			if (path[path.length - 1] != '/') {
				path += '/';
			}

			if (path === this.currentPath) {
				return true;
			}

			var match = this._tryPath(path);

			if (!match) {
				return false;
			}

			this.app.viewState.update(match.state);
			setState(this, match.route, path, this.app.viewState.serializeData(), !this._isHistoryPositionFrozen, 2);

			return true;
		},

		/**
		 * @protected
		 *
		 * @param {string} path
		 * @returns {?{ route: Router~Route, state: Object }}
		 */
		_tryPath: function(path) {
			var routes = this.routes;

			for (var i = 0, l = routes.length; i < l; i++) {
				var route = routes[i];
				var match = path.match(route.rePath);

				if (match) {
					return {
						route: route,

						state: route.fields.reduce(function(state, field, index) {
							state[field.id] = field.type == 1 ?
								match[index + 1] !== undef :
								tryStringAsNumber(decodeURIComponent(match[index + 1]));

							return state;
						}, {})
					};
				}
			}

			return null;
		},

		/**
		 * @protected
		 *
		 * @param {Router~Route} [preferredRoute]
		 * @returns {?{ route: Router~Route, path: string }}
		 */
		_tryViewState: function(preferredRoute) {
			var viewState = this.app.viewState;
			var routes = this.routes;
			var resultRoute = null;

			for (var i = 0, l = routes.length; i < l; i++) {
				var route = routes[i];
				var requiredFields = route.requiredFields;
				var j = requiredFields.length;

				while (j--) {
					var value = viewState[requiredFields[j]]();

					if (value == null || value === false || value === '') {
						break;
					}
				}

				if (j == -1) {
					if (requiredFields.length) {
						resultRoute = route;
						break;
					} else if (!resultRoute || route === preferredRoute) {
						resultRoute = route;
					}
				}
			}

			return resultRoute && {
				route: resultRoute,
				path: this._buildPath(resultRoute)
			};
		},

		/**
		 * @protected
		 *
		 * @param {Route} route
		 * @returns {string}
		 */
		_buildPath: function(route) {
			var viewState = this.app.viewState;
			var pathMap = route.pathMap;
			var path = [];

			for (var i = 0, l = pathMap.length; i < l; i++) {
				var pathMapItem = pathMap[i];
				var requiredFields = pathMapItem.requiredFields;
				var j = requiredFields.length;

				while (j--) {
					var value = viewState[requiredFields[j]]();

					if (value == null || value === false || value === '') {
						break;
					}
				}

				if (j == -1) {
					path.push(
						hasOwn.call(pathMapItem, 'pathPart') ? pathMapItem.pathPart : viewState[pathMapItem.field]()
					);
				}
			}

			return slashifyPath(path.join(''));
		}
	});

	_.Router = Router;

})();

(function() {

	var deserialize = _.dump.deserialize;
	var ViewState = _.ViewState;
	var Router = _.Router;

	/**
	 * @private
	 */
	function collectViewStateFields(viewState, routes) {
		var fields = Object.assign({}, viewState);

		for (var i = routes.length; i;) {
			var routeFields = routes[--i].fields;

			for (var j = routeFields.length; j;) {
				var id = routeFields[--j].id;

				if (!hasOwn.call(fields, id)) {
					fields[id] = undef;
				}
			}
		}

		return fields;
	}

	/**
	 * @class Rift.BaseApp
	 * @extends {Object}
	 */
	function BaseApp() {}

	BaseApp.extend = _.Class.extend;

	Object.assign(BaseApp.prototype, /** @lends Rift.BaseApp# */{
		/**
		 * @type {Rift.BaseModel}
		 */
		model: null,

		/**
		 * @type {Rift.BaseView}
		 */
		view: null,

		/**
		 * @type {Rift.ViewState}
		 */
		viewState: null,

		/**
		 * @type {Rift.Router}
		 */
		router: null,

		/**
		 * @param {Function|Object} model
		 * @param {Function} viewClass
		 * @param {?HTMLElement} viewBlock
		 * @param {Object} viewState
		 * @param {?Object} viewStateData
		 * @param {Rift.Router} routes
		 * @param {string|undefined} [path='/']
		 */
		_init: function(model, viewClass, viewBlock, viewState, viewStateData, routes, path) {
			this.model = typeof model == 'function' ? new model() : deserialize(model);

			var router = this.router = new Router(this, routes);

			this.viewState = new ViewState(collectViewStateFields(viewState, router.routes));

			if (isServer) {
				router.route(path || '/');
			} else {
				this.viewState.updateFromSerializedData(viewStateData);
			}

			this.view = new viewClass({ app: this, block: viewBlock });
			router.start();
		}
	});

	_.BaseApp = BaseApp;

})();

})();
