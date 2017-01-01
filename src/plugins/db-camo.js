'use strict';

const OmniTypes = require('../types');
const OmniSchema = require('../schemas');
const _ = require('lodash');

// db-camo.js
// An OmniSchema plugin to generate a Camo document, enabling ODM for MongoDB or NeDB
// Uses: Camo - https://github.com/scottwrobinson/camo

const Document = require('camo').Document;
const EmbeddedDocument = require('camo').EmbeddedDocument;


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
OmniSchema.camo.schemas = {};
OmniSchema.camo.models = {};
OmniSchema.camo.embedded = {};

// Our "define..Type" method to decorate the data types with attributes that
// tell us which Camo schema types to use for each OmniType...
OmniSchema.camo.defineDbType = function(name, camoType, props) {
	let camodb = { camodb: Object.assign({ type: camoType }, props) };
	OmniTypes.defineDataType(name, camodb);
}


let plugin = function() {

	const defineDbType = OmniSchema.camo.defineDbType;

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

		onSchema: [

			{ func: function getCamoSchema() {

				// If we have already defined this schema, return the singleton...
				if (this.collectionName && OmniSchema.camo.schemas[this.collectionName]) {
					return OmniSchema.camo.schemas[this.collectionName];
				}

				// Build the schema...
				let omniSchema = this;
				let camoSchemaDef = {};
				let fl = this.getFieldList();
				for (let fieldName of fl) {
					let field = omniSchema.getField(fieldName);
					if (field instanceof OmniSchema.OmniField) {
						// Do NOT add "_id" field to schema - it is
						// used internally by camo...
						if (field.name !== '_id' && field.name !== '_schema') {
						    let camoField = field.getCamoField();
						    if (camoField) {
					        	camoSchemaDef[fieldName] = camoField;
					        }
					    }
					}
				}

				OmniSchema.camo.schemas[this.collectionName] = camoSchemaDef;

				return camoSchemaDef;

			}},

			{ func: function getCamoClass(className) {

				if (className === undefined) {
					className = this.collectionName;
				}

				if (className && OmniSchema.camo.models[className]) {
					return OmniSchema.camo.models[className];
				}

				// Return a class definition that inherits from camoDocument...
				return function (camoSchemaDef) {

					// Create and return a 'class' that inherits from _Document...
					let _schemaDef = camoSchemaDef;
					let _className = className;

					class DynamicCamoDoc extends Document {
						
						constructor() {
							super();
						    this.schema(_schemaDef);
						};

						static collectionName() {
							return _className;
						}
					}

					// Change the name of the constructor to the class name...
					Object.defineProperty(DynamicCamoDoc.prototype.constructor, 'name', {value: className, configurable: true});

					OmniSchema.camo.models[className] = DynamicCamoDoc;

					return DynamicCamoDoc;

				}(this.getCamoSchema());
			}},

			{ func: function getEmbeddedCamoClass(className) {

				if (className === undefined) {
					className = this.collectionName;
				}

				if (className && OmniSchema.camo.models[className]) {
					return OmniSchema.camo.embedded[className];
				}

				// Return a class definition that inherits from camoDocument...
				return function (camoSchemaDef) {

					// Create and return a 'class' that inherits from _Document...
					let _schemaDef = camoSchemaDef;
					let _className = className;

					class DynamicCamoDoc extends EmbeddedDocument {
						
						constructor() {
							super();
						    this.schema(_schemaDef);
						};

						static collectionName() {
							return _className;
						}
					}

					// Change the name of the constructor to the class name...
					Object.defineProperty(DynamicCamoDoc.prototype.constructor, 'name', {value: className, configurable: true});

					OmniSchema.camo.embedded[className] = DynamicCamoDoc;

					return DynamicCamoDoc;

				}(this.getCamoSchema());
			}},



		],

		onField: {
			func: function getCamoField() {
				if (this.type instanceof OmniSchema) {
					if (this.persistence === 'embed') {
						return this.type.getEmbeddedCamoClass();
					}
					else {
						return this.type.getCamoClass();
					}
				}
				else if (!this.type.getCamoField) {
					throw new Error('getCamoField has not been defined for datatype ' + this.type.name);
				}
				return this.type.getCamoField(this);
			}
		},

		// For Types, always define in the order of most general to most specific...
		onType: [

			{	matches: 'camodb',

				func: function getCamoField(field) {

					let camoField = Object.assign({}, this.camodb);

					if (field.isArray) {
						camoField.type = [camoField.type];
					}

					if (field.isRequired) {
						camoField.required = true;
					}

					if (_.has(field, 'validation.min')) {
					    camoField.min = field.validation.min;
					}

					if (_.has(field, 'validation.max')) {
					   camoField.max = field.validation.max;
					}

					if (_.has(field, 'db.unique')) {
					   camoField.unique = field.db.unique;
					}

					if (this.camodb.type === String && this.enumValues) {
						camoField.choices = this.enumValues.map(function(ev) { return ev.value });
					}

					return camoField;
				}

			},

		]

	});
}

module.exports = { plugin };