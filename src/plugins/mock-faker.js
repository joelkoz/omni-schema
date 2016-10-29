'use strict';

const OmniTypes = require('../types');
const OmniSchema = require('../schemas');


// mock-faker.js
// An OmniSchema plugin to generate mock data for a record that matches the schema.
// Uses: Faker: https://github.com/stympy/faker
   
const faker = require('faker');

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
OmniSchema.faker = {};

// Our "define..Type" method to decorate the data types with attributes that
// tell us which Faker functions to use for each type...
OmniSchema.faker.defineFakerType = function(name, fakerFunc) {
	let fakerSpec = { fakerSpec: { getMockData: fakerFunc } };
	OmniTypes.defineDataType(name, fakerSpec);
}


let plugin = function() {

	const defineFakerType = OmniSchema.faker.defineFakerType;

	function fakeCurrency() {
		return Number(faker.finance.amount());
	}

	// MUST at least define entries for Javascript primatives...
	defineFakerType('String', faker.lorem.words);
	defineFakerType('Number', faker.random.number);
	defineFakerType('Boolean', faker.random.boolean);
	defineFakerType('DateTime', faker.date.recent);

	// And now, define specialized controls for the specialzed data types that vary
	// from our defaults. Inheritance will take care of the rest...
	defineFakerType('Text',faker.lorem.paragraph);
	defineFakerType('FullName', () => { return `${faker.name.firstName()} ${faker.name.lastName()}`; });
	defineFakerType('FirstName', faker.name.firstName);
	defineFakerType('LastName', faker.name.lastName);
	defineFakerType('Password', faker.internet.password);
	defineFakerType('Phone', faker.phone.phoneNumber);
	defineFakerType('Email', faker.internet.email);
	defineFakerType('Url', faker.internet.url);
	defineFakerType('StreetAddress', faker.address.streetAddress);
	defineFakerType('City', faker.address.city);
	defineFakerType('State', faker.address.stateAbbr);
	defineFakerType('PostalCode', faker.address.zipCode);
	defineFakerType('CreditCardNumber', () => { return '4116817818840415' });

	defineFakerType('Integer', () => { return Math.trunc(faker.random.number()); } );
	defineFakerType('Currency', fakeCurrency );

	defineFakerType('Sex', () => { return faker.random.boolean() ? 'F' : 'M'});

	// Now, mix in functionality to OmniSchema...
	OmniSchema.mixin({

		onSchema: [
			{ 
			  func: function getMockData(uiExclude) {

				let omniSchema = this;
				let mockData = {};
				for (let fieldName in omniSchema) {
					let field = omniSchema[fieldName];
					if ((field instanceof OmniSchema.OmniField) && (!uiExclude || !field.uiExclude)) {
						if (field.isArray) {
							let mockArray = [];
							for (let i = 0; i < 3; i++) {
								if (Math.random() > 0.5) {
									mockArray.push(field.getMockData());
								}
							}
						    mockData[fieldName] = mockArray;
						}
						else {
						    mockData[fieldName] = field.getMockData();
						}
					}
				}
				return mockData;
			  }
			},
		],

		onField: {
			func: function getMockData() {
				if (!this.type.getMockData) {
					throw new Error('getMockData has not been defined for datatype ' + this.type.name);
				}
				return this.type.getMockData(this);
			}
		},

		// For Types, always define in the order of most general to most specific...
		onType: [

			{	matches: 'fakerSpec',

				func: function getMockData(field) {
					return this.fakerSpec.getMockData();
				}

			},

		]

	});
}

module.exports = { plugin };