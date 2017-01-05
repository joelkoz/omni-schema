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
OmniSchema.mongoose.schemas = {};
OmniSchema.mongoose.models = {};

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

		onSchema: [
			{	func: function getMongooseSchema() {

					// If we have already defined this schema, return the singleton...
					if (this.collectionName && OmniSchema.mongoose.schemas[this.collectionName]) {
						return OmniSchema.mongoose.schemas[this.collectionName];
					}

					let omniSchema = this;
					let mongooseSchemaDef = {};
					let fl = this.getFieldList();
					let hasVirtualFields = false;
					for (let fieldName of fl) {
						if (fieldName !== '_id') {
							let field = omniSchema.getField(fieldName);
							if (field instanceof OmniSchema.OmniField) {
								let mongooseField = field.getMongooseField();
								if (mongooseField) {
							    	mongooseSchemaDef[fieldName] = mongooseField;
							    }
							}

							if (field.type instanceof OmniSchema && field.foreignKeyField) {
								hasVirtualFields = true;
							}

						}
					}


					let options = {};

					if (omniSchema.hasChildren || omniSchema.isSubClass) {
						// This schema is part of a hierarchy...
						options.discriminatorKey = '_type_';
					}

					if (omniSchema.isSubClass) {
						options._id = false;
					}

					if (hasVirtualFields) {
						options.toJSON = { virtuals: true };
					}

					let finalSchema = new mongoose.Schema(mongooseSchemaDef, options);

					// If there are schema references with a foreign key, those
					// need to be optimized as "virtual" fields...
					if (hasVirtualFields) {
						for (let fieldName of fl) {
							let field = omniSchema.getField(fieldName);
							if (field.type instanceof OmniSchema && field.foreignKeyField) {
								// Define a "virtual" field for this one...
								finalSchema.virtual(fieldName, { ref: field.type.collectionName, localField: '_id', foreignField: field.foreignKeyField });
							}						
						} // for
					}

					if (this.collectionName) {
						OmniSchema.mongoose.schemas[this.collectionName] = finalSchema;
					}

					return finalSchema;
				}
			},

			{	func: function getMongooseModel(className) {

					if (className === undefined) {
						className = this.collectionName;
					}

					if (className && OmniSchema.mongoose.models[className]) {
						return OmniSchema.mongoose.models[className];
					}

					let model;

					if (this.isSubClass) {
						let rootModel = this.rootSchema.getMongooseModel();
						if (!rootModel) {
							throw new Error(`Can not create Mongoose model for ${className}: the root mongoose schema for ${this.rootSchema.collectionName} has not been defined yet.`);
						}
						model = rootModel.discriminator(className, this.getMongooseSchema());
					}
					else {
						model = mongoose.model(className, this.getMongooseSchema());
					}

					OmniSchema.mongoose.models[className] = model;

					return model;

				}

			},
		],

		onField: {
			func: function getMongooseField() {

				if (this.type instanceof OmniSchema) {
					// We have a reference to another schema...
					if (this.persistence === 'embed') {
						// Embedded schemas are defined directly in this schema...
						let mschema = this.type.getMongooseSchema();
						if (this.isArray) {
							return [mschema];
						}
						else {
							return mschema;
						}
					}
					else {

						if (this.foreignKeyField) {
							// Fields that have foreign keys are optimized as virtual fields.
							// see getMongooseSchema()
							return undefined;
						}

						let ref = { ref: this.type.collectionName, type: mongoose.Schema.Types.ObjectId };
						if (this.isArray) {
							return [ref];
						}
						else {
							return ref;
						}
					}
				}

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