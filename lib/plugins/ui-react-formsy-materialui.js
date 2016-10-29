'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var OmniTypes = require('../types');
var OmniSchema = require('../schemas');
var React = require('react');
var _ = require('lodash');
var moment = require('moment');

// ui-react-formsy-materialui.js
// An OmniSchema plugin to React components from Material UI to create a UI for editing
// records that match the schema.
// Uses: React - https://facebook.github.io/react/
//       Material UI - http://www.material-ui.com/#/
//       Formsy - https://github.com/christianalfoni/formsy-react
//       Formsy-Material-UI - https://github.com/mbrookes/formsy-material-ui

var Formsy = require('formsy-react');
var FormsyCheckbox = require('formsy-material-ui/lib/FormsyCheckbox').default; // eslint-disable-line
var FormsyDate = require('formsy-material-ui/lib/FormsyDate').default; // eslint-disable-line
var FormsyRadio = require('formsy-material-ui/lib/FormsyRadio').default; // eslint-disable-line
var FormsyRadioGroup = require('formsy-material-ui/lib/FormsyRadioGroup').default;
var FormsySelect = require('formsy-material-ui/lib/FormsySelect').default;
var FormsyText = require('formsy-material-ui/lib/FormsyText').default; // eslint-disable-line
var FormsyTime = require('formsy-material-ui/lib/FormsyTime').default; // eslint-disable-line
var FormsyToggle = require('formsy-material-ui/lib/FormsyToggle').default;

var MenuItem = require('material-ui/MenuItem').default;
var RaisedButton = require('material-ui/RaisedButton').default;
var fade = require('material-ui/utils/colorManipulator').fade;

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
OmniSchema.react_mui = {};

// Our "define..Type" method to decorate the data types with attributes that
// tell us which React components to use, and what properties to use on them.
OmniSchema.react_mui.defineFormsyType = function (name, elementType, props) {
	var reactMuiSpec = { reactMuiSpec: Object.assign({ elementType: elementType }, props) };
	OmniTypes.defineDataType(name, reactMuiSpec);
};

var plugin = function plugin() {

	// We will used a validation rule to enforce "isRequired" so we can use Material-UI's error
	// message feature...
	Formsy.addValidationRule('isRequired', function (model, value, otherField) {

		if (typeof value === 'boolean') {
			return value;
		} else return value && typeof value === 'string' ? value.trim().length > 0 : false;
	});

	var defineFormsyType = OmniSchema.react_mui.defineFormsyType;

	// MUST at least define controls for Javascript primatives...
	defineFormsyType('String', 'FormsyText', { type: 'text', labelProperty: 'floatingLabelText', updateImmediately: true });
	defineFormsyType('Number', 'FormsyText', { type: 'number', validations: { isNumeric: true }, validationErrors: { isNumeric: 'A valid number is required' }, labelProperty: 'floatingLabelText', updateImmediately: true });
	defineFormsyType('Boolean', 'FormsyCheckbox', { labelProperty: 'label', style: { marginTop: '15px', marginBottom: '-20px', textAlign: 'left', display: 'block' } });
	defineFormsyType('DateTime', 'FormsyText', { type: 'datetime-local', labelProperty: 'floatingLabelText' });

	// And now, define specialized controls for the specialzed data types that vary
	// from our defaults. Inheritance will take care of the rest...
	defineFormsyType('Text', 'FormsyText', { type: 'text', multiLine: true, rows: 3, labelProperty: 'floatingLabelText', updateImmediately: true });
	defineFormsyType('Password', 'FormsyText', { type: 'password', labelProperty: 'floatingLabelText', updateImmediately: true });
	defineFormsyType('Phone', 'FormsyText', { type: 'tel', labelProperty: 'floatingLabelText', updateImmediately: true });
	defineFormsyType('Email', 'FormsyText', { type: 'email', validations: { isEmail: true }, validationErrors: { isEmail: 'A valid email address is required' }, labelProperty: 'floatingLabelText', updateImmediately: true });
	defineFormsyType('Url', 'FormsyText', { type: 'url', validations: { isUrl: true }, validationErrors: { isUrl: 'A valid URL is required' }, labelProperty: 'floatingLabelText', updateImmediately: true });
	defineFormsyType('State', 'FormsyText', { type: 'text', labelProperty: 'floatingLabelText' });
	defineFormsyType('CreditCardNumber', 'FormsyText', { type: 'text', validations: { isCreditCard: true }, validationErrors: { isCreditCard: 'A valid credit card number is required' }, labelProperty: 'floatingLabelText', updateImmediately: true });

	defineFormsyType('Integer', 'FormsyText', { type: 'number', validations: { isInt: true }, validationErrors: { isInt: 'A valid non-decimal number is required' }, labelProperty: 'floatingLabelText', updateImmediately: true });

	defineFormsyType('Date', 'FormsyDate', { firstDayOfWeek: 1, mode: 'landscape', autoOk: true, labelProperty: 'floatingLabelText', formatDate: function formatDate(dt) {
			return moment(dt).format('MM-DD-YYYY');
		} });
	defineFormsyType('Time', 'FormsyTime', { type: 'time', labelProperty: 'floatingLabelText' });

	// Helper functions for our mixins...
	function getFormsyControl(strControlName) {
		return eval(strControlName); // eslint-disable-line
	}

	function addRequiredValidator(field, props) {
		if (field.isRequired) {
			props.validations = Object.assign({ isRequired: true }, props.validations);
			props.validationErrors = Object.assign({ isRequired: field.label + ' is required.' }, props.validationErrors);
		}
	}

	function getEnumAsSelect(field, controlProps, muiTheme) {
		var dt = field.type;
		function getChildren() {
			var children = [];

			dt.enumValues.forEach(function (ev) {
				children.push(React.createElement(MenuItem, { value: ev.value, primaryText: ev.label }));
			});

			return children;
		}

		var mergedProps = Object.assign({ name: field.name,
			floatingLabelText: field.label,
			labelStyle: { top: '20px' },
			errorStyle: { marginTop: '15px' },
			hintStyle: { bottom: '6px' }
		}, _.omit(dt.reactMuiSpec, ['elementType', 'updateImmediately', 'labelProperty']), controlProps, typeof controlProps.value !== 'undefined' ? { value: controlProps.value.toString() } : undefined);

		addRequiredValidator(field, mergedProps);

		return React.createElement.apply(undefined, [FormsySelect, mergedProps].concat(getChildren()));
	}

	function getEnumAsRadio(field, controlProps, muiTheme) {
		var dt = field.type;
		function getChildren() {
			var children = [];

			dt.enumValues.forEach(function (ev) {
				children.push(React.createElement(FormsyRadio, { value: ev.value,
					label: ev.label
				}));
			});

			return children;
		}

		var mergedProps = Object.assign({ name: field.name,
			floatingLabelText: field.label,
			labelPosition: 'right' }, _.omit(dt.reactMuiSpec, ['elementType']), controlProps);

		addRequiredValidator(field, mergedProps);

		return React.createElement('label', { style: { display: 'block',
				textAlign: 'left',
				marginTop: '15px',
				color: fade(muiTheme.textField.floatingLabelColor, 0.5) } }, field.label, React.createElement.apply(undefined, [FormsyRadioGroup, mergedProps].concat(getChildren())));
	}

	function getBoolAsCheckbox(field, controlProps, muiTheme) {
		var dt = field.type;
		var dataTypeSpec = dt.reactMuiSpec;
		var mergedProps = Object.assign({ name: field.name }, _.omit(dataTypeSpec, ['elementType', 'labelProperty']), controlProps, { label: field.label, style: { marginTop: '15px', marginBottom: '-20px', textAlign: 'left', display: 'block' } });

		addRequiredValidator(field, mergedProps);
		return React.createElement(FormsyCheckbox, mergedProps);
	}

	function getBoolAsToggle(field, controlProps, muiTheme) {
		var dt = field.type;

		var mergedProps = Object.assign(_.omit(dt.reactMuiSpec, ['elementType', 'updateImmediately', 'labelProperty']), controlProps);

		// Create or clone the style property so we can (potentially) modify it...
		mergedProps.style = Object.assign({}, mergedProps.style);

		if (!mergedProps.style.marginTop) {
			mergedProps.style.marginTop = '25px';
		}

		return React.createElement(FormsyToggle, Object.assign({ name: field.name,
			required: field.isRequired,
			label: field.label,
			labelStyle: { color: fade(muiTheme.textField.floatingLabelColor, 0.5) } }, mergedProps));
	}

	// Now, mix in functionality to OmniSchema...
	OmniSchema.mixin({

		onSchema: {
			func: function getReactMUIFormComponent() {

				var schema = this;

				function getInputControls(controlProps, defaultValues, muiTheme) {
					var children = [];

					// eslint-disable-next-line
					for (var fieldName in schema) {
						var field = schema[fieldName];
						if (field instanceof OmniSchema.OmniField && !field.uiExclude) {
							var mergedProps = Object.assign({ style: { display: 'block',
									textAlign: 'left',
									width: '100%'
								}
							}, controlProps, typeof _.get(defaultValues, fieldName) !== 'undefined' ? { value: defaultValues[fieldName] } : undefined);
							children.push(field.getReactMUIComponent(mergedProps, muiTheme));
						}
					}

					// Finally, push a submit button...
					children.push();
					return children;
				}

				var formClass = React.createClass({
					displayName: 'formClass',

					getInitialState: function getInitialState() {
						return {
							canSubmit: false
						};
					},

					enableSubmit: function enableSubmit() {
						this.setState({
							canSubmit: true
						});
					},

					disableSubmit: function disableSubmit() {
						this.setState({
							canSubmit: false
						});
					},

					propTypes: {
						submitButtonName: React.PropTypes.string,
						onSubmit: React.PropTypes.func,
						cancelButtonName: React.PropTypes.string,
						onCancel: React.PropTypes.func,
						controlProps: React.PropTypes.object,
						defaultValues: React.PropTypes.object
					},

					contextTypes: {
						muiTheme: React.PropTypes.object.isRequired
					},

					handleCancelButton: function handleCancelButton() {
						this.props.onCancel(this.refs.form.reset);
					},
					onValidSubmit: function onValidSubmit(model, resetForm, invalidateForm) {
						// Convert fields to their appropriate data type...
						// eslint-disable-next-line
						for (var fieldName in model) {
							var field = schema[fieldName];
							if (field instanceof OmniSchema.OmniField) {
								var modelVal = model[fieldName];
								if (typeof modelVal === 'string' && typeof field.type.fromString === 'function') {
									model[fieldName] = field.type.fromString(modelVal);
								}
							}
						} // for

						this.props.onSubmit(model, resetForm, invalidateForm);
					},


					render: function render() {
						// This odd way of formulating and calling
						// createElement is so the children are passed
						// as individual arguments as opposed to an array.
						// This allows React to create key values for us and
						// avoids the strange warning in the logs.
						var propTypes = Object.getPrototypeOf(this).constructor.propTypes;
						var formsyProps = Object.assign({ style: { width: '50%',
								padding: '15px' }
						}, _.omit(this.props, _.keys(propTypes)));
						var createArgs = [Formsy.Form, Object.assign({ onValid: this.enableSubmit,
							onInvalid: this.disableSubmit,
							onValidSubmit: this.onValidSubmit,
							ref: 'form' }, formsyProps)].concat(getInputControls(this.props.controlProps, this.props.defaultValues, this.context.muiTheme), React.createElement('div', { style: { display: 'block', textAlign: 'right', marginTop: '25px' } }, this.props.cancelButtonName ? React.createElement(RaisedButton, { type: 'button',
							style: { marginRight: '25px' },
							label: this.props.cancelButtonName,
							onClick: this.handleCancelButton }) : undefined, this.props.submitButtonName ? React.createElement(RaisedButton, { type: 'submit', style: { textAlign: 'left' }, label: this.props.submitButtonName, disabled: !this.state.canSubmit }) : undefined));

						return React.createElement.apply(undefined, createArgs);
					}

				});

				return formClass;
			}
		},

		onField: {
			func: function getReactMUIComponent(controlProps, muiTheme) {
				if (!this.type.getReactMUIComponent) {
					throw new Error('getReactMUIComponent has not been defined for datatype ' + this.type.name);
				}
				return this.type.getReactMUIComponent(this, controlProps, muiTheme);
			}
		},

		onType: [{ matches: ['reactMuiSpec.elementType', 'reactMuiSpec.labelProperty'],

			func: function getReactMUIComponent(field, controlProps, muiTheme) {
				var dataTypeSpec = this.reactMuiSpec;
				var component = getFormsyControl(dataTypeSpec.elementType);
				var mergedProps = Object.assign({ name: field.name }, _.omit(dataTypeSpec, ['elementType', 'labelProperty']), controlProps, _defineProperty({}, dataTypeSpec.labelProperty, field.label));

				addRequiredValidator(field, mergedProps);
				return React.createElement(component, mergedProps);
			}
		}, { matches: 'enumValues',

			func: function getReactMUIComponent(field, controlProps, muiTheme) {

				var presentation = _.get(field, 'ui.presentation');
				if (presentation) {
					// User has explicitly requested a presentation for this enumeration...
					switch (presentation) {
						case 'select':
							return getEnumAsSelect(field, controlProps, muiTheme);

						case 'radio':
							return getEnumAsRadio(field, controlProps, muiTheme);

						case 'toggle':
							if (field.type.jsType === 'boolean') {
								return getBoolAsToggle(field, controlProps, muiTheme);
							}
							break;

						case 'checkbox':
							if (field.type.jsType === 'boolean') {
								return getBoolAsCheckbox(field, controlProps, muiTheme);
							}
							break;

						default:
							break;
					} // switch
				}

				// Return default presentations...
				if (field.type.name === 'OnOff') {
					return getBoolAsToggle(field, controlProps, muiTheme);
				} else {
					return getEnumAsSelect(field, controlProps, muiTheme);
				}
			}
		},

		// At this point, if the data type does not have a match, make it a string, provided
		// it has a "fromString" method so its value can be marshalled back and forth...
		{ matches: [{ $not: 'getReactMUIComponent' }, 'fromString'],

			func: function getReactMUIComponent(field, controlProps, muiTheme) {
				var dataTypeSpec = this.reactMuiSpec;
				var mergedProps = Object.assign({ name: field.name }, _.omit(dataTypeSpec, ['elementType', 'labelProperty']), controlProps, _defineProperty({}, dataTypeSpec.labelProperty, field.label));

				addRequiredValidator(field, mergedProps);
				return React.createElement(FormsyText, mergedProps);
			}
		}]

	});
};

module.exports = { plugin: plugin };