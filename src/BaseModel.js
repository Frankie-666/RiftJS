var Disposable = require('./Disposable');

/**
 * @class Rift.BaseModel
 * @extends {Rift.Disposable}
 * @abstract
 * @typesign new (data?: Object): Rift.BaseModel;
 */
var BaseModel = Disposable.extend({
	/**
	 * @typesign (data: Object, nameMap?: Object<string>): Rift.BaseModel;
	 */
	setData: function(data, nameMap) {
		if (!nameMap) {
			nameMap = {};
		}

		for (var name in data) {
			if (name in this) {
				var value = data[nameMap[name] || name];

				if (typeof this[name] == 'function') {
					this[name](value);
				} else {
					this[name] = value;
				}
			}
		}

		return this;
	}
});

module.exports = BaseModel;
