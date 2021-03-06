var cellx = require('cellx');

exports.nextTick = cellx.nextTick;
exports.EventEmitter = cellx.EventEmitter;
exports.ObservableMap = cellx.ObservableMap;
exports.map = cellx.map;
exports.ObservableList = cellx.ObservableList;
exports.list = cellx.list;
exports.Cell = cellx.Cell;
exports.cellx = exports.cell = cellx;

exports.env = require('./env');
exports.uid = require('./uid');
exports.object = require('./object');
exports.regex = require('./regex');

var Class = exports.Class = require('./Class');
cellx.EventEmitter.extend = Class.extend;

exports.proxy = require('./proxy');

exports.Disposable = require('./Disposable');
exports.BaseModel = require('./BaseModel');

exports.domBinding = require('./domBinding');

var BaseView = require('./BaseView');

exports.viewClasses = BaseView.viewClasses;
exports.registerViewClass = BaseView.registerViewClass;
exports.BaseView = BaseView;

exports.templateRuntime = require('./templateRuntime');

exports.ViewList = require('./ViewList');
exports.ViewSwitch = require('./ViewSwitch');

exports.Router = require('./Router');
exports.BaseApp = require('./BaseApp');

var d = exports.d = require('./d');
d.observable = cellx.d.observable;
d.computed = cellx.d.computed;

exports.rt = exports;
