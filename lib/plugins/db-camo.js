'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var OmniTypes = require('../types');
var OmniSchema = require('../schemas');
var _ = require('lodash');

// db-camo.js
// An OmniSchema plugin to generate a Camo document, enabling ODM for MongoDB or NeDB
// Uses: Camo - https://github.com/scottwrobinson/camo

var Document = require('camo').Document;

// Hints for effective plugin development:
// 1. Store all plugin specific properties for data types inside a name spaced property
//
// 2. Be sure to define plugin properties for AT LEAST the data types 
//    String, Number, and Boolean (they are the Javascript primatives).
//
// 3. If multiple onType functionality specifications are used, be sure
//    to list them in the order of most general to most specific
//
// 4. Try to define onType functionality that matches 'enumValues'
//	  to ensure there is default behavior for any enumerations.
//
// 5. Create a namespace off of the OmniSchema type to prevent name clashes
//    from other plugins.

// Our namespace for this plugin
OmniSchema.camo = {};

// Our "define..Type" method to decorate the data types with attributes that
// tell us which Camo schema types to use for each OmniType...
OmniSchema.camo.defineDbType = function (name, camoType, props) {
	var camodb = { camodb: Object.assign({ type: camoType }, props) };
	OmniTypes.defineDataType(name, camodb);
};

var plugin = function plugin() {

	var defineDbType = OmniSchema.camo.defineDbType;

	// MUST at least define entries for Javascript primatives...
	defineDbType('String', String);
	defineDbType('Number', Number);
	defineDbType('Boolean', Boolean);
	defineDbType('Object', Object);
	defineDbType('DateTime', Date);

	// And now, define specialized controls for the specialzed data types that vary
	// from our defaults. Inheritance will take care of the rest...
	defineDbType('Integer', Number, { validate: Number.isInteger });

	// Now, mix in functionality to OmniSchema...
	OmniSchema.mixin({

		onSchema: [{ func: function getCamoSchema() {

				// Build the schema...
				var omniSchema = this;
				var camoSchemaDef = {};
				for (var fieldName in omniSchema) {
					var field = omniSchema[fieldName];
					if (field instanceof OmniSchema.OmniField) {
						// Do NOT add "_id" field to schema - it is
						// used internally by camo...
						if (field.name !== '_id' && field.name !== '_schema') {
							var camoField = field.getCamoField();
							camoSchemaDef[fieldName] = camoField;
						}
					}
				}

				return camoSchemaDef;
			} }, { func: function getCamoClass(className) {

				// Return a class definition that inherits from camoDocument...
				return function (camoSchemaDef) {

					// Create and return a 'class' that inherits from _Document...
					var _schemaDef = camoSchemaDef;
					var _className = className;

					var DynamicCamoDoc = function (_Document) {
						_inherits(DynamicCamoDoc, _Document);

						function DynamicCamoDoc() {
							_classCallCheck(this, DynamicCamoDoc);

							var _this = _possibleConstructorReturn(this, (DynamicCamoDoc.__proto__ || Object.getPrototypeOf(DynamicCamoDoc)).call(this));

							_this.schema(_schemaDef);
							return _this;
						}

						_createClass(DynamicCamoDoc, null, [{
							key: 'collectionName',
							value: function collectionName() {
								return _className;
							}
						}]);

						return DynamicCamoDoc;
					}(Document);

					return DynamicCamoDoc;
				}(this.getCamoSchema());
			} }],

		onField: {
			func: function getCamoField() {
				if (!this.type.getCamoField) {
					throw new Error('getCamoField has not been defined for datatype ' + this.type.name);
				}
				return this.type.getCamoField(this);
			}
		},

		// For Types, always define in the order of most general to most specific...
		onType: [{ matches: 'camodb',

			func: function getCamoField(field) {

				var camoField = Object.assign({}, this.camodb);

				if (field.isArray) {
					camoField.type = [camoField.type];
				}

				if (field.isRequired) {
					camoField.required = true;
				}

				if (typeof field.minVal !== 'undefined') {
					camoField.min = field.minVal;
				}

				if (typeof field.maxVal !== 'undefined') {
					camoField.max = field.maxVal;
				}

				if (_.get(field, 'db.unique')) {
					camoField.unique = true;
				}

				if (this.camodb.type === String && this.enumValues) {
					camoField.choices = this.enumValues.map(function (ev) {
						return ev.value;
					});
				}

				return camoField;
			}

		}]

	});
};

module.exports = { plugin: plugin };