'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var moment = require('moment');

var DataType = function () {

	/**
  * The consturctor
  * @param {string} name The name of this datatype
  * @param {object} props If specified, a list of additional properties to merge into this
  *    datatype definition.
  */
	function DataType(name, props) {
		_classCallCheck(this, DataType);

		this.className = Object.getPrototypeOf(this).constructor.name;
		this._name = name;
		this.mergeProps(props);
	}

	_createClass(DataType, [{
		key: 'mergeProps',
		value: function mergeProps(props) {
			if (props) {
				Object.assign(this, props);
			}
		}

		/**
   * Returns the name of this data type
   */

	}, {
		key: 'name',
		get: function get() {
			return this._name;
		}
	}]);

	return DataType;
}();

var OmniTypes = {
	DataType: DataType
};

/**
 * Defines a new data type with the specified name, or merges the specified
 * props in with a pre-existing data type of the same name.
 * @param name {string} The name of the property to add or update
 * @param props {object} The properties to attach (or add) to the data type
 * @param baseType Another data type that serves as the base data type. The
 *   new data type will inherit behaviors from this baseType of a particular
 *   plugin does not explicity define behaviors for the data type.
 */
function defineDataType(name, props, baseType, toString, fromString) {
	if (OmniTypes[name]) {
		// Update an existing type definition...
		OmniTypes[name].mergeProps(props);
	} else {
		// Define a new type definition...
		var dataType = new DataType(name, props);
		if (baseType) {
			Object.setPrototypeOf(dataType, baseType);
			dataType.className = baseType.name;
		}
		OmniTypes[name] = dataType;
	}

	if (typeof toString === 'function') {
		OmniTypes[name].toString = toString;
	}

	if (typeof fromString === 'function') {
		OmniTypes[name].fromString = fromString;
	}
}

function defineJSType(name, jsType, props, toString, fromString) {
	if (!props) {
		defineDataType(name, { jsType: jsType }, null, toString, fromString);
	} else {
		defineDataType(name, Object.assign({ jsType: jsType }, props), null, toString, fromString);
	}
}

function defineStringType(name, props, toString, fromString) {
	defineDataType(name, props, OmniTypes.String, toString, fromString);
}

function defineNumericType(name, props, toString, fromString) {
	defineDataType(name, props, OmniTypes.Number, toString, fromString);
}

function defineBooleanType(name, props, toString, fromString) {
	defineDataType(name, props, OmniTypes.Boolean, toString, fromString);
}

function defineObjectType(name, jsClassName, props, baseType, toString, fromString) {
	defineDataType(name, Object.assign({ jsType: 'object', jsClassName: jsClassName }, props), baseType, toString, fromString);
}

function defineEnumerationType(name, optionSpec, props, baseType) {

	var values = [];

	var optionList = optionSpec.split('|');

	optionList.forEach(function (optionValStr) {
		var valueSpec = optionValStr.split(':');
		var label = valueSpec[0];
		if (valueSpec.length > 1) {
			values.push({ label: label, value: valueSpec[1] });
		} else {
			values.push({ label: label, value: label });
		}
	});

	defineDataType(name, Object.assign({ enumValues: values }, props), baseType);
}

// The Javascript primatives...
defineJSType('String', 'string', null, function toString(str) {
	return str;
}, function fromString(str) {
	return str;
});

defineJSType('Number', 'number', null, function toString(num) {

	if (num) {
		return num.toString();
	} else {
		return undefined;
	}
}, function fromString(str) {
	if (str) {
		return Number(str);
	} else {
		return undefined;
	}
});

defineJSType('Boolean', 'boolean', null, function toString(b) {
	return b ? 'true' : 'false';
}, function fromString(str) {

	if (typeof str !== 'undefined') {

		if (str == null) {
			return null;
		}

		var n = Number.parseFloat(str);
		if (!Number.isNaN(n)) {
			return n !== 0;
		}

		if (typeof str === 'boolean') {
			return str;
		}

		var lcs = str.toLowerCase();
		return lcs === 'true' || lcs === 'yes' || lcs === 'y' || lcs === 't';
	} else {
		return undefined;
	}
});

defineJSType('Object', 'object', { jsClassName: 'Object' });

defineObjectType('DateTime', 'Date', null, OmniTypes.Object, function toString(d) {
	if (typeof d !== 'undefined') {
		return moment(d).format();
	} else {
		return undefined;
	}
}, function fromString(str) {
	if (typeof str === 'string') {
		return moment(str);
	} else {
		return str;
	}
});

// Higher order string types...
defineStringType('Text');
defineStringType('FullName');
defineStringType('FirstName');
defineStringType('LastName');
defineStringType('Password');
defineStringType('Phone');
defineStringType('Email');
defineStringType('Url');
defineStringType('StreetAddress');
defineStringType('City');
defineStringType('State');
defineStringType('PostalCode');
defineStringType('CreditCardNumber');

// Higher order numeric types
defineNumericType('Integer', { precision: 0 });
defineNumericType('Decimal', { precision: 9 });
defineNumericType('Currency', { precision: 2 });

// The date type...
defineObjectType('Date', 'Date', null, OmniTypes.DateTime);
defineObjectType('Time', 'Date', null, OmniTypes.DateTime);

// Common enumerations...
defineEnumerationType('YesNo', 'No:false|Yes:true', null, OmniTypes.Boolean);
defineEnumerationType('Sex', 'Female:F|Male:M', null, OmniTypes.String);
defineEnumerationType('OnOff', 'Off:false|On:true', null, OmniTypes.Boolean);

Object.assign(OmniTypes, {
	defineDataType: defineDataType,
	defineStringType: defineStringType,
	defineNumericType: defineNumericType,
	defineBooleanType: defineBooleanType,
	defineEnumerationType: defineEnumerationType
});

module.exports = OmniTypes;