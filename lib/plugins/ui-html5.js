'use strict';

var OmniTypes = require('../types');
var OmniSchema = require('../schemas');
var _ = require('lodash');

// ui-html5.js
// An OmniSchema plugin to generate a UI in pure HTML for editing records that match the schema.


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
OmniSchema.html5 = {};

// Our "define..Type" method to decorate the data types with attributes that
// tell us which HTML elements and attributes to use for each type...
OmniSchema.html5.defineHtmlType = function (name, elementName, props) {
	var htmlSpec = { htmlSpec: Object.assign({ elementName: elementName }, props) };
	OmniTypes.defineDataType(name, htmlSpec);
};

OmniSchema.html5.getPropsAsAttributeString = function (props, ignoreProps) {

	if (!props) {
		// If we have no attributes, return a single blank space...
		return ' ';
	}

	var attribs = '';

	_.forOwn(_.omit(props, ignoreProps), function (value, key) {
		attribs = attribs.concat(' ' + key + '="' + value + '"');
	});

	return attribs;
};

var plugin = function plugin() {

	var defineHtmlType = OmniSchema.html5.defineHtmlType;

	// MUST at least define controls for Javascript primatives...
	defineHtmlType('String', 'input', { type: 'text' });
	defineHtmlType('Number', 'input', { type: 'number' });
	defineHtmlType('Boolean', 'input', { type: 'checkbox' });

	// And now, define specialized controls for the specialzed data types that vary
	// from our defaults. Inheritance will take care of the rest...
	defineHtmlType('Text', 'textarea', { rows: 3 });
	defineHtmlType('FullName', 'input', { type: 'text', autocomplete: 'name' });
	defineHtmlType('FirstName', 'input', { type: 'text', autocomplete: 'given-name' });
	defineHtmlType('LastName', 'input', { type: 'text', autocomplete: 'family-name' });
	defineHtmlType('Password', 'input', { type: 'password' });
	defineHtmlType('Phone', 'input', { type: 'tel' });
	defineHtmlType('Email', 'input', { type: 'email', autocomplete: 'email' });
	defineHtmlType('Url', 'input', { type: 'url' });
	defineHtmlType('StreetAddress', 'input', { type: 'text', autocomplete: 'address-line1' });
	defineHtmlType('PostalCode', 'input', { type: 'text', autocomplete: 'postal-code' });

	defineHtmlType('Integer', 'input', { type: 'range', min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER });

	defineHtmlType('Date', 'input', { type: 'date' });
	defineHtmlType('Time', 'input', { type: 'time' });
	defineHtmlType('DateTime', 'input', { type: 'datetime-local' });

	function getEnumAsSelect(field, controlProps, defaultValue) {
		var code = '<select size="1" name="' + field.name + '" ' + (field.isRequired ? 'required="required"' : '') + '>\n';
		var dt = field.type;
		var strDefault = void 0;
		if (typeof defaultValue !== 'undefined' && defaultValue !== null) {
			strDefault = defaultValue.toString();
		}
		_.forEach(dt.enumValues, function (ev, i) {
			code = code.concat('  <option value="' + ev.value + '" ' + (ev.value === strDefault ? 'selected' : '') + '>' + ev.label + '</option>\n');
		});
		code = code.concat('</select>\n');
		return code;
	}

	function getEnumAsRadio(field, controlProps, defaultValue) {
		var code = '';
		var dt = field.type;
		_.forEach(dt.enumValues, function (ev, i) {
			var mergedProps = Object.assign({}, controlProps, { type: 'radio' });
			if (ev.value === defaultValue) {
				mergedProps.checked = true;
			}
			code = code.concat('<input' + OmniSchema.html5.getPropsAsAttributeString(mergedProps, 'elementName') + ' ' + (field.isRequired ? 'required="required" ' : '') + 'name="' + field.name + '" value="' + ev.value + '" />');
			code = code.concat('&nbsp;' + ev.label + '<br/>\n');
		});
		return code;
	}

	function getEnumAsCheckbox(field, controlProps, defaultValue) {
		var mergedProps = Object.assign({}, controlProps, { type: 'checkbox' });
		if (defaultValue) {
			mergedProps.checked = true;
		}
		return '<input' + OmniSchema.html5.getPropsAsAttributeString(mergedProps, 'elementName') + ' ' + (field.isRequired ? 'required="required" ' : '') + 'name="' + field.name + '" />';
	}

	// Now, mix in functionality to OmniSchema...
	OmniSchema.mixin({

		onSchema: {
			func: function getHtmlForm(submitButtonName, formProps, defaultData) {

				var schema = this;
				var code = '<form' + OmniSchema.html5.getPropsAsAttributeString(formProps) + ' >\n';
				for (var fieldName in schema) {
					var field = schema[fieldName];
					if (field instanceof OmniSchema.OmniField && !field.uiExclude) {
						var defaultValue = _.get(defaultData, field.name);
						code = code.concat(field.getHtml(defaultValue), '\n');
					}
				}
				if (submitButtonName) {
					code = code.concat('<input type="submit" value="' + submitButtonName + '" />\n');
				} else if (!_.isNull(submitButtonName)) {
					code = code.concat('<input type="submit" />\n');
				}
				code = code.concat('</form>\n');
				return code;
			}
		},

		onField: {
			func: function getHtml(defaultValue) {
				if (!this.type.getHtml) {
					throw new Error('getHtml has not been defined for datatype ' + this.type.name);
				}
				return '<label>' + this.label + ' ' + this.type.getHtml(this, {}, defaultValue) + '</label>';
			}
		},

		// For Types, always define in the order of most general to most specific...
		onType: [{ matches: {
				htmlSpec: { elementName: 'input' }
			},

			func: function getHtml(field, controlProps, defaultValue) {
				if (typeof defaultValue !== 'undefined') {
					controlProps.value = defaultValue;
				}
				var mergedProps = Object.assign({}, this.htmlSpec, controlProps);
				return '<input' + OmniSchema.html5.getPropsAsAttributeString(mergedProps, 'elementName') + ' ' + (field.isRequired ? 'required="required" ' : '') + 'name="' + field.name + '" />';
			}
		}, { matches: 'enumValues',

			func: function getHtml(field, controlProps, defaultValue) {
				var presentation = _.get(field, 'ui.presentation');
				if (presentation) {
					// User has explicitly requested a presentation for this enumeration...
					switch (presentation) {
						case 'select':
							return getEnumAsSelect(field, Object.assign({}, this.htmlSpec, controlProps), defaultValue);

						case 'radio':
							return getEnumAsRadio(field, Object.assign({}, this.htmlSpec, controlProps), defaultValue);

						case 'checkbox':
							if (field.type.jsType === 'boolean') {
								return getBoolAsCheckbox(field, Object.assign({}, this.htmlSpec, controlProps), defaultValue);
							}
							break;

						default:
							break;
					} // switch
				}

				// Return default presentation...
				return getEnumAsSelect(field, Object.assign({}, this.htmlSpec, controlProps), defaultValue);
			}

		}]

	});
};

module.exports = { plugin: plugin };