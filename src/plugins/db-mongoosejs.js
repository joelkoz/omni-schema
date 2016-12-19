'use strict';

const OmniTypes = require('../types');
const OmniSchema = require('../schemas');
const _ = require('lodash');

// db-mongoosejs.js
// An OmniSchema plugin to generate a Mongoose schema, enabling ODM for MongoDB
// Uses: Mongoose: http://mongoosejs.com/

const mongoose = require('mongoose');

// Hints for effective plugin development:
// 1. Store all plugin specific properties inside a name spaced property
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
OmniSchema.mongoose = {};

// Our "define..Type" method to decorate the data types with attributes that
// tell us which Mongoose schema types to use for each type...
OmniSchema.mongoose.defineDbType = function(name, mongooseType, props) {
	let mongoosedb = { mongoosedb: Object.assign({ type: mongooseType }, props) };
	OmniTypes.defineDataType(name, mongoosedb);
}


let plugin = function() {

	const defineDbType = OmniSchema.mongoose.defineDbType;

	// MUST at least define entries for Javascript primatives...
	defineDbType('String', String, { minValProperty: 'minlength', maxValProperty: 'maxlength'});
	defineDbType('Number', Number, { minValProperty: 'min', maxValProperty: 'max'});
	defineDbType('Boolean', Boolean);
	defineDbType('Object', Object);
	defineDbType('DateTime', Date);

	// And now, define specialized controls for the specialzed data types that vary
	// from our defaults. Inheritance will take care of the rest...
	defineDbType('Email', String, { match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/ });

	// Now, mix in functionality to OmniSchema...
	OmniSchema.mixin({

		onSchema: {
			func: function getMongooseSchema() {

				let omniSchema = this;
				let mongooseSchemaDef = {};
				let fl = this.getFieldList();
				for (let fieldName of fl) {
					if (fieldName !== '_id') {
						let field = omniSchema.getField(fieldName);
						if (field instanceof OmniSchema.OmniField) {
							let mongooseField = field.getMongooseField();
						    mongooseSchemaDef[fieldName] = mongooseField;
						}
					}
				}
				return new mongoose.Schema(mongooseSchemaDef);
			}
		},

		onField: {
			func: function getMongooseField() {
				if (!this.type.getMongooseField) {
					throw new Error('getMongooseField has not been defined for datatype ' + this.type.name);
				}
				return this.type.getMongooseField(this);
			}
		},

		// For Types, always define in the order of most general to most specific...
		onType: [

			{	matches: 'mongoosedb',

				func: function getMongooseField(field, controlProps) {

					let mongooseField = {
						type: this.mongoosedb.type
					};

					if (field.isRequired) {
						mongooseField.required = true;
					}

					if (_.has(field, 'validation.min') && this.mongoosedb.minValProperty) {
					    mongooseField[this.mongoosedb.minValProperty] = field.validation.min;
					}

					if (_.has(field, 'validation.max') && this.mongoosedb.maxValProperty) {
					   mongooseField[this.mongoosedb.maxValProperty] = field.validation.max;
					}

					if (_.has(field, 'db.unique')) {
					   mongooseField.unique = field.db.unique;
					}

					if (this.mongoosedb.type === String && this.mongoosedb.match) {
						mongooseField.match = this.mongoosedb.match;
					}

					if (this.mongoosedb.type === String && this.enumValues) {
						mongooseField.enum = this.enumValues.map(function(ev) { return ev.value });
					}

					if (field.isArray) {
						mongooseField.type = [mongooseField.type];
					}
					
					return mongooseField;
				}

			},

		]

	});
}

module.exports = { plugin };