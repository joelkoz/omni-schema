'use strict';

const OmniTypes = require('../types');
const OmniSchema = require('../schemas');
const _ = require('lodash');

// validation-joi.js
// An OmniSchema plugin to generate a Joi validators for quick validation of your schemas
// Uses: Joi - https://github.com/hapijs/joi

const Joi = require('joi');

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
OmniSchema.joi = {};

// Our "define..Type" method to decorate the data types with attributes that
// tell us which Joi validators to use for each type...
OmniSchema.joi.defineJoiType = function(name, joiType, props) {
	let joiSpec = { joiSpec: Object.assign({ type: joiType }, props) };
	OmniTypes.defineDataType(name, joiSpec);
}


function omitDeep(input, props) {

  function omitDeepOnOwnProps(obj) {
    if ((!_.isArray(obj) && !_.isObject(obj)) || obj instanceof Date) {
      return obj;
    }

    if (_.isArray(obj)) {
      return omitDeep(obj, props);
    }

    const o = {};
    _.forOwn(obj, (value, key) => {
      o[key] = omitDeep(value, props);
    });

    return _.omit(o, props);
  }

  if (typeof input === "undefined") {
    return {};
  }

  if (_.isArray(input)) {
    return input.map(omitDeepOnOwnProps);
  }

  return omitDeepOnOwnProps(input);

};


let plugin = function() {

	const defineJoiType = OmniSchema.joi.defineJoiType;

	// MUST at least define entries for Javascript primatives...
	defineJoiType('String', 'string');
	defineJoiType('Number', 'number');
	defineJoiType('Boolean', 'boolean');
	defineJoiType('Object', 'any');
	defineJoiType('DateTime', 'date');

	// And now, define specialized controls for the specialzed data types that vary
	// from our defaults. Inheritance will take care of the rest...
	defineJoiType('Email', 'string', { addOnSpec: '.email()' });
	defineJoiType('CreditCardNumber', 'string', { addOnSpec: '.creditCard()' });
	defineJoiType('Integer', 'number', { addOnSpec: '.integer()' });
	defineJoiType('Currency', 'number', { addOnSpec: '.precision(2)' });

	// Now, mix in functionality to OmniSchema...
	OmniSchema.mixin({

		onSchema: [
			{ 
			  func: function getJoiSchemaDef(uiExclude) {

				let omniSchema = this;
				let joiSchemaDef = {};
				let fl = this.getFieldList();
				for (let fieldName of fl) {
					let field = omniSchema.getField(fieldName);
					if ((field instanceof OmniSchema.OmniField) && (!uiExclude || !field.uiExclude)) {
						let joiField = field.getJoiField(uiExclude);
						if (joiField) {
					    	joiSchemaDef[fieldName] = joiField;
					    }
					}
				}
				return joiSchemaDef;
			  }
			},

			{ 
			  func: function getValidator(uiExclude) {
			  	let joiSchemaDef = this.getJoiSchemaDef(uiExclude);
				return {
					schemaDef: joiSchemaDef,

					schema: Joi.object(joiSchemaDef),

					validate: function validate(value, ignoreFields) {
						this.lastError = undefined;
						let val2 = omitDeep(value, ignoreFields);
						let result  = this.schema.validate(val2);
						if (result.error === null) {
							return result.value;
						}
						else {
							throw new Error(result.error);
						}
					},

					isValid: function isValid(value, ignoreFields) {
						try {
							let result = this.validate(value, ignoreFields);
							return result;
						}
						catch (error) {
							this.lastError = error.message;
							return false;
						}
					}
				}
			  }
			}
		],

		onField: {
			func: function getJoiField(uiExclude) {
				if (this.type instanceof OmniSchema) {
					// Handle references to other schemas...
					if (this.isArray) {
						return Joi.array().items(this.type.getJoiSchemaDef(uiExclude));
					}
					else {
						return this.type.getJoiSchemaDef(uiExclude);
					}
				}
				else if (!this.type.getJoiField) {
					throw new Error('getJoiField has not been defined for datatype ' + this.type.name);
				}
				return this.type.getJoiField(this);
			}
		},

		// For Types, always define in the order of most general to most specific...
		onType: [

			{	matches: 'joiSpec',

				func: function getJoiField(field, controlProps) {

					let joiFieldCode = `Joi.${this.joiSpec.type}()`;
					let allowAlreadySpecified = false;

					if (this.joiSpec.addOnSpec) {
						joiFieldCode = joiFieldCode.concat(this.joiSpec.addOnSpec);
					}

					let joiField = eval(joiFieldCode);

					if (_.has(field, 'validation.min')) {
					    joiField = joiField.min(field.validation.min);
					}

					if (_.has(field, 'validation.max')) {
					    joiField = joiField.max(field.validation.max);
					}

					if (this.joiSpec.type === 'string' && this.enumValues) {
						let enumVals = this.enumValues.map(function(ev) { return ev.value });
						if (!field.isRequired) {
							enumVals.push(null);
						}
						joiField = joiField.valid(enumVals);
						allowAlreadySpecified = true;
					}

					if (field.isRequired) {
						joiField = joiField.required();
					}
					else {
						joiField = joiField.optional();
						if (!allowAlreadySpecified) {
						    joiField = joiField.allow(null);
						}
					}

					joiField = joiField.label(field.label);

					if (field.isArray) {
						return Joi.array().items(joiField);
					}
					else {
						return joiField;
					}
				}

			},

		]

	});
}

module.exports = { plugin };