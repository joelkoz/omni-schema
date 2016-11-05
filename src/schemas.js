
const OmniTypes =require('./types');
const _ = require('lodash');


/**
 * Each property in an OmniSchema definition will be an instance of OmniField.
 * Only "schema", "name", and "type" is a required parameter for construction.
 * All other properties have defaults.
 */
class OmniField {
	constructor(schema, name, type, isArray, label) {
		this._schema = schema;
		this._name = name;
		this._type = type;
		this._isArray = isArray;
		this._label = label;
	}

	get schema() {
		return this._schema;
	}


	get name() {
		return this._name;
	}


	get type() {
		return this._type;
	}


	get isArray() {
		if (typeof this._isArray === 'undefined') {
			return false;
		}
		else {
			return this._isArray;
		}
	}


	get isRequired() {
		let req1 = _.get(this, 'required');
		let req2 = _.get(this, 'validation.required');

		if (req1 || req2) {
			return true;
		}
		else {
			return false;
		}
	}


	get label() {

		if (!this._label) {
			return _.capitalize(_.startCase(this.name));
		}
		return this._label;
	}


	get uiExclude() {
		return Boolean(_.get(this, 'ui.exclude'));
	}


	get minVal() {
		return _.get(this, 'validation.min');
	}


	get maxVal() {
		return _.get(this, 'validation.max');
	}


	get defaultValue() {
		if (this.isArray) {
			return [];
		}
		else if (typeof this.default !== 'undefined') {
			if (typeof this.default === 'function') {
				return this.default();
			}
			else {
				return this.default;
			}
		}
		else {
			return this.type.defaultValue;
		}
	}
}



class OmniSchema {


	static get Types() {
		return OmniTypes;
	}

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
	 *		ownerId: { type: 'Integer', ui: { exclude: true } }
	 *	}
	 *</code>
	 */
    static compile(templateObj) {

		let schema = new OmniSchema();

		// eslint-disable-next-line
		for (let fieldName in templateObj) {

			let prop = templateObj[fieldName]
			let isArray;
			if (_.isArray(prop)) {
				isArray = true;
				prop = prop[0];
			}
			else {
				isArray = false;
			}

			let omniType, required, label, otherProps;

			if (prop instanceof OmniTypes.DataType) {
				omniType = prop;
				otherProps = {};
			}
			else {
				let type = prop.type;
				label = prop.label;

				if (type instanceof OmniTypes.DataType) {
					omniType = type;
				}
				else {
				    omniType = OmniTypes[type];
					if (!omniType) {
						throw new Error('Could not locate omniType named ' + type);
					}
				}
				otherProps = _.omit(prop, ['type', 'label']);
			}

			// Create the field definition...
			let omniField = new OmniField(schema, fieldName, omniType, isArray, label);

			// Merge in any other properties not already compiled...
			Object.assign(omniField, otherProps);

			schema[fieldName] = omniField;

		} // for

		return schema;
	}


	/**
	 * Calls the callBack function for each field definition in the schema, passing
	 * the OmniField definition as the sole parameter.  If uiOnly is TRUE,
	 * the callback will only be called for fields that are marked as part of the UI
	 * (i.e. do NOT have the ui.exclude property set to true).
	 */
	forEachField(callBack, uiOnly) {
		for (let fieldName in this) {
			let field = this[fieldName];
			if ((field instanceof OmniSchema.OmniField) && (!uiOnly || !field.uiExclude)) {
				callBack(field);
			}
		} // for
	}



	/**
	 * Returns an array of field names for the defined fields in this schema.
	 * if uiOnly is TRUE, the list returned will be for only those fields
	 * that are not excluded from the user interface with the 'ui.exclude'
	 * property.
	 */
	getFieldList(uiOnly) {

		let propName;
		if (uiOnly) {
			propName = '__uiKeyList';
		}
		else {
			propName = '__fullKeyList';
		}

		// Return a memoirized list
		if (!this[propName]) {
			let uiKeys = [];
			this.forEachField(function (field) { uiKeys.push(field.name); }, uiOnly);
			Object.defineProperty(this, propName, { configurable: true, 
												    enumerable: false, 
													writeable: true, 
													value: uiKeys });
		}

		return this[propName];
	}


	/**
	* Returns a copy of obj that contains only fields that are present in this
	* schema.  If uiOnly is TRUE, the returned object will include only
	* fields that are part of the UI definition (i.e. do NOT have the ui.exclude
	* property set to TRUE)
	*/
	sanitize(obj, uiOnly) {
		return _.pick(obj, this.getFieldList(uiOnly));
	}


	/**
	 * Examines each field in obj and attempts to convert it to
	 * its appropriate type if necessary and possible. The new
	 * converted object is returned (obj is left untouched).
	 * If there are fields in obj that are not part of the
	 * schema, they are left untouched unless the sanitize
	 * parameter is true, in which case the field will be left
	 * out of the returned object. Type conversion is predicated
	 * on the schema data type having a fromString() method available
	 * to convert it to its appropriate value.
	 */
	convert(obj, sanitize) {

		let model = {};

		// eslint-disable-next-line
		for (let fieldName in obj) {
			let field = this[fieldName];
			if (field instanceof OmniSchema.OmniField) {
				let modelVal = obj[fieldName];
				if (modelVal === null) {
					model[fieldName] = null;
				}
				else if (!field.isArray) {
					// Process a single value...
					model[fieldName] = this.convertValue(modelVal, field);
				}
				else {
					// Process an array of values...
					if (Array.isArray(modelVal)) {
						model[fieldName] = [];
						modelVal.forEach(function (entry) {
							model[fieldName].push(this.convertValue(entry, field));
						}.bind(this));
					}
					else if (!sanitize) {
						model[fieldName] = [this.convertValue(modelVal, field)]
					}
				}
			}
			else if (!sanitize) {
				model[fieldName] = obj[fieldName];
			}
		} // for

		return model;
	}


	convertValue(modelVal, field) {

		if (modelVal !== null) {
			if (typeof modelVal !== field.type.jsType &&
				typeof field.type.fromString === 'function') {
				return field.type.fromString(modelVal.toString());
			}
		}

		return modelVal;
	}


	/**
	 * Creates a record that matches the schema, using the fields default values.
	 * if uiOnly is TRUE, the returned record will include only fields that are part
	 * of the UI definition.
	 */
	getDefaultRecord(uiOnly) {
		let rec = {};
		this.forEachField(function (field) { rec[field.name] = field.defaultValue; }, uiOnly);
		return rec;
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
	static DataTypeMatches(dataType, matchSpec) {
		if (typeof matchSpec === 'undefined') {
			return (typeof dataType.jsType !== 'undefined');
		}
		else if (typeof matchSpec === 'function') {
			return matchSpec(dataType);
		}
		else if (typeof matchSpec === 'string') {
			return _.get(dataType, matchSpec);
		}
		else if (Array.isArray(matchSpec)) {
			for (let i = 0; i < matchSpec.length; i++) {
				let subSpec = matchSpec[i];
				if (!OmniSchema.DataTypeMatches(dataType, subSpec)) {
					return false;
				}
			} // for
			return true;
		}
		else if (typeof matchSpec === 'object') {

			if (matchSpec.hasOwnProperty('$or') && Array.isArray(matchSpec['$or'])) {
				let orList = matchSpec['$or'];
				for (let i = 0; i < orList.length; i++) {
					let subSpec = orList[i];
					if (OmniSchema.DataTypeMatches(dataType, subSpec)) {
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
	static mixin(spec) {

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
				let name = subSpec.get.name;
				Object.defineProperty(obj, name, { get: subSpec.get });
			}

			if (_.has(subSpec, 'set')) {
				let name = subSpec.set.name;
				Object.defineProperty(obj, name, { set: subSpec.set });
			}

			if (_.has(subSpec, 'func')) {
				let name = subSpec.func.name;
				obj[name] = subSpec.func;
			}
		}


		// Make sure obj is an array so we can iterate over it if there
		// is more than one.
		function castArray(obj) {
			if (_.isArray(obj)) {
				return obj;
			}
			else {
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
				_.forEach(OmniTypes, function(value, key, obj) {
					applySpec(value, subSpec);
				});
			});
		}

	}
}

OmniSchema.OmniField = OmniField;

module.exports = OmniSchema;