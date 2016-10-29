'use strict';

const OmniSchema = require('../schemas');
const _ = require('lodash');
const OmniHtml5 = require('../plugins/html5');


// This script lists the data types that are selecting using various
// "matching specifications."  A matching specification is a key part 
// of how plugins attach functionality to the different data types.


// Connect the Html5 plugin
OmniHtml5.plugin();


// showTypes() lists all of the data types defined in OmniSchema
// that match the specified specification...
let showTypes = function(matchSpec) {

	if (typeof matchSpec === 'function') {
		console.log(`Matching: function ${matchSpec.name}`);
	}
	else {
	    console.log('Matching: ' + JSON.stringify(matchSpec));
	}
	console.log('');

    _.keys(OmniSchema.Types).forEach(function (key) {
    	let type = OmniSchema.Types[key];
    	if (OmniSchema.DataTypeMatches(type, matchSpec)) {
    		console.log(`    ${type.name} - ${JSON.stringify(type)}`);
    	}
    });

    console.log('--\n\n\n');
}


showTypes({ name: 'LastName'}); // Select the "LastName" data type only

showTypes({ jsType: 'boolean' }); // Select all data types that are represented as a javascript "boolean"
showTypes({ jsType: 'string', htmlSpec: { elementName: 'textarea'}}); // select string datatypes with a UI that uses <textarea> for input

showTypes('enumValues'); // Show all data types that are enumerations.
showTypes([ 'enumValues', { jsType: 'boolean'} ]); // All enumerations that are stored as a javascript "boolean"

showTypes({ htmlSpec: { autocomplete: 'email'}}); // All data types that have an "autocomplete" property set to 'email'
showTypes('htmlSpec.autocomplete'); // Show all data types that have an "autocomplete" property on their html spec (regardless of its value)

// An example of using a specialized function for specification matching.
// This one is equivelant to [ 'enumValues', { jsType: 'string'} ]
showTypes(function isEnumeratedString(dt) {
	return (dt.jsType === 'string' && dt.enumValues);
});
