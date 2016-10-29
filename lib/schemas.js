'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var OmniTypes = require('./types');
var _ = require('lodash');

/**
 * Each property in an OmniSchema definition will be an instance of OmniField.
 * Only "schema", "name", and "type" is a required parameter for construction.
 * All other properties have defaults.
 */

var OmniField = function () {
	function OmniField(schema, name, type, isArray, label) {
		_classCallCheck(this, OmniField);

		this._schema = schema;
		this._name = name;
		this._type = type;
		this._isArray = isArray;
		this._label = label;
	}

	_createClass(OmniField, [{
		key: 'schema',
		get: function get() {
			return this._schema;
		}
	}, {
		key: 'name',
		get: function get() {
			return this._name;
		}
	}, {
		key: 'type',
		get: function get() {
			return this._type;
		}
	}, {
		key: 'isArray',
		get: function get() {
			if (typeof this._isArray === 'undefined') {
				return false;
			} else {
				return this._isArray;
			}
		}
	}, {
		key: 'isRequired',
		get: function get() {
			var req1 = _.get(this, 'required');
			var req2 = _.get(this, 'validation.required');

			if (req1 || req2) {
				return true;
			} else {
				return false;
			}
		}
	}, {
		key: 'label',
		get: function get() {

			if (!this._label) {
				return _.capitalize(_.startCase(this.name));
			}
			return this._label;
		}
	}, {
		key: 'uiExclude',
		get: function get() {
			return Boolean(_.get(this, 'ui.exclude'));
		}
	}, {
		key: 'minVal',
		get: function get() {
			return _.get(this, 'validation.min');
		}
	}, {
		key: 'maxVal',
		get: function get() {
			return _.get(this, 'validation.max');
		}
	}]);

	return OmniField;
}();

var OmniSchema = function () {
	function OmniSchema() {
		_classCallCheck(this, OmniSchema);
	}

	_createClass(OmniSchema, null, [{
		key: 'compile',


		/**
   * An OmniSchema factory method that compiles a schema template and returns
   * an OmniSchema definition.
   * @param templateObj {object} The schema descriptor to translate into
   * an OmniSchema instance. Here is an example template:
   * <code>
   *	{	firstName: { type: 'FirstName', required: true },
   *		lastName: { type: OmniTypes.LastName }, 
   *		phones: [{ type: 'Phone' }],
   *		email: { type: 'Email', required: true },
   *		birthdate: { type: 'Date' },
   *		ownerId: { type: 'Integer', uiExclude: true }
   *	}
   *</code>
   */
		value: function compile(templateObj) {

			var schema = new OmniSchema();

			// eslint-disable-next-line
			for (var fieldName in templateObj) {

				var prop = templateObj[fieldName];
				var isArray = void 0;
				if (_.isArray(prop)) {
					isArray = true;
					prop = prop[0];
				} else {
					isArray = false;
				}

				var omniType = void 0,
				    required = void 0,
				    label = void 0,
				    uiExclude = void 0,
				    otherProps = void 0;

				if (prop instanceof OmniTypes.DataType) {
					omniType = prop;
					otherProps = {};
				} else {
					var type = prop.type;
					label = prop.label;

					if (type instanceof OmniTypes.DataType) {
						omniType = type;
					} else {
						omniType = OmniTypes[type];
						if (!omniType) {
							throw new Error('Could not locate omniType named ' + type);
						}
					}
					otherProps = _.omit(prop, ['type', 'label']);
				}

				// Create the field definition...
				var omniField = new OmniField(schema, fieldName, omniType, isArray, label);

				// Merge in any other properties not already compiled...
				Object.assign(omniField, otherProps);

				schema[fieldName] = omniField;
			} // for

			return schema;
		}

		/**
   * DataTypeMatches is a helper function for mixin() that is used
   * to determine if a specific data type matches the "match specification".
   * A match specification can be:
   * 1. An object - each property of the object must be present in the data type and the values must match
   * 2. A string - the specified string is a path to a property that must exist in the data type (indenpendent)
   *      of its value.
   * 3. A function - a function that takes a single parameter (the data type), and returns TRUE if the
   *      data type matches
   * 4. An array consisting of one or more of the above 3 types.  ALL entries must match for the data type
   *      to be considered a match (i.e. joined with "logical And").
   * 5. An object with a single member property named "$or", "$and", or $not. These are expected to have a value
   *      that is an array of two or more of the above entries. The entries will be joined with logical
   *      "or", "and", or "not" (i.e. negated truth)
   */

	}, {
		key: 'DataTypeMatches',
		value: function DataTypeMatches(dataType, matchSpec) {
			if (typeof matchSpec === 'undefined') {
				return typeof dataType.jsType !== 'undefined';
			} else if (typeof matchSpec === 'function') {
				return matchSpec(dataType);
			} else if (typeof matchSpec === 'string') {
				return _.get(dataType, matchSpec);
			} else if (Array.isArray(matchSpec)) {
				for (var i = 0; i < matchSpec.length; i++) {
					var subSpec = matchSpec[i];
					if (!OmniSchema.DataTypeMatches(dataType, subSpec)) {
						return false;
					}
				} // for
				return true;
			} else if ((typeof matchSpec === 'undefined' ? 'undefined' : _typeof(matchSpec)) === 'object') {

				if (matchSpec.hasOwnProperty('$or') && Array.isArray(matchSpec['$or'])) {
					var orList = matchSpec['$or'];
					for (var _i = 0; _i < orList.length; _i++) {
						var _subSpec = orList[_i];
						if (OmniSchema.DataTypeMatches(dataType, _subSpec)) {
							return true;
						}
					} // for
					return false;
				}

				if (matchSpec.hasOwnProperty('$and') && Array.isArray(matchSpec['$and'])) {
					// Using $and is a long hand for the already specified array processing above
					return OmniSchema.DataTypeMatches(dataType, matchSpec['$and']);
				}

				if (matchSpec.hasOwnProperty('$not')) {
					// Return a logical "not" of the specification.
					return !OmniSchema.DataTypeMatches(dataType, matchSpec['$not']);
				}
			}

			return _.isMatch(dataType, matchSpec);
		}

		/**
   * mixin() is the primary means for plugins to extend the functionality of
   * OmniSchema.  It is used to decorate the various base classes of a schema
   * or its data types with additional getters, setters, and/or methods.  See
   * the readme.me file for specifics on the mixin specification.
   * @param spec {object} The mixin specification that adheres to the OmniSchema
   *   plugin mixin specification
   */

	}, {
		key: 'mixin',
		value: function mixin(spec) {

			// Apply part of a specification to a specific object.
			function applySpec(obj, subSpec) {

				if (_.has(subSpec, 'matches')) {
					// This is a conditional subSpec - see if it matches first...
					if (!OmniSchema.DataTypeMatches(obj, subSpec.matches)) {
						// It does not match, so do not apply the subSpec...
						return;
					}
				}

				if (_.has(subSpec, 'get')) {
					var name = subSpec.get.name;
					Object.defineProperty(obj, name, { get: subSpec.get });
				}

				if (_.has(subSpec, 'set')) {
					var _name = subSpec.set.name;
					Object.defineProperty(obj, _name, { set: subSpec.set });
				}

				if (_.has(subSpec, 'func')) {
					var _name2 = subSpec.func.name;
					obj[_name2] = subSpec.func;
				}
			}

			// Make sure obj is an array so we can iterate over it if there
			// is more than one.
			function castArray(obj) {
				if (_.isArray(obj)) {
					return obj;
				} else {
					return [obj];
				}
			}

			if (_.has(spec, 'onSchema')) {
				castArray(spec.onSchema).forEach(function (subSpec) {
					applySpec(OmniSchema.prototype, subSpec);
				});
			}

			if (_.has(spec, 'onField')) {
				castArray(spec.onField).forEach(function (subSpec) {
					applySpec(OmniField.prototype, subSpec);
				});
			}

			if (_.has(spec, 'onType')) {
				castArray(spec.onType).forEach(function (subSpec) {
					_.forEach(OmniTypes, function (value, key, obj) {
						applySpec(value, subSpec);
					});
				});
			}
		}
	}, {
		key: 'Types',
		get: function get() {
			return OmniTypes;
		}
	}]);

	return OmniSchema;
}();

OmniSchema.OmniField = OmniField;

module.exports = OmniSchema;