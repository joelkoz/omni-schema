const OmniSchema = require('../index');
const OmniHtml5 = require('../plugins/ui-html5');
const OmniJoi = require('../plugins/validation-joi');
const OmniFaker = require('../plugins/mock-faker');
const OmniCamo = require('../plugins/db-camo');

const connect = require('camo').connect;

OmniHtml5.plugin();
OmniJoi.plugin();
OmniFaker.plugin();
OmniCamo.plugin();

const Types = OmniSchema.Types;

const ContactSchema = OmniSchema.compile({
                     		  firstName: Types.FirstName, // The simplest way to declare a field
                      		lastName: { type: 'LastName', required: true }, // If you need to vary from the defaults
                      		sex: {type: 'Sex', ui: { presentation: 'radio' } }, // Adding a hint to one of the plugins
                      		phone: [{ type: 'Phone' }], // Define an array of something by wrapping it in brackets
                      		email: { type: 'Email' },
                      		birthdate: { type: 'Date' },
                      		favorite: { type: 'YesNo', label: 'Add this person to your favorites?' },
                      		balance: { type: 'Currency'},
                          age: { type: 'Integer', validation: { min: 0 }},
                          ownerId: { type: 'Integer', ui: { exclude: true }}, // Internal field - no user editing
                  	  });

console.log(`The fields in our schema are ${JSON.stringify(ContactSchema.getFieldList())}`);
console.log(`\nThe fields to be displayed in the UI are ${JSON.stringify(ContactSchema.getFieldList(true))}\n`);

// First, connect to database
// let uri = 'mongodb://localhost:27017/OmniSchemaExample'; // save to a MongoDB database
let uri = 'nedb://memory'; // save to an in memory NeDB database
connect(uri).then(() => {

    // Create a Camo document to store our data...
    let Contact = ContactSchema.getCamoClass('contacts');


    // Next, generate some mock data with the Faker plugin...
    let mockRecord = ContactSchema.getMockData();
    console.log('\nMock record values:');
    console.log(JSON.stringify(mockRecord));


    // Save it to our database...
    console.log('\n\nSaving record to database...');
    let dbRecord = Contact.create(mockRecord);
    dbRecord.save().then(() => {
        console.log('\n\nDatabase record values:');
        console.log(JSON.stringify(dbRecord));

        // Create a sanitized version of the record that contains only fields
        // that are to be used for UI editing purposes...
        let uiRecord = ContactSchema.sanitize(dbRecord, true);
        console.log('\n\nSanitized record value we can let the user see:');
        console.log(JSON.stringify(uiRecord));

        // Now, show some HTML that will edit the record...
        console.log('\n\nHTML to edit the above data...')
        console.log(ContactSchema.getHtmlForm('Save', { method: 'POST', action: '/contact/save'}, uiRecord));


        // Now, see if it is valid using the Joi validator plugin...
        console.log('\n\nNow validating record...');


        // Pass TRUE to getValidator() to indicate we want a validator
        // for UI purposes (i.e. to NOT include fields marked with "ui.exclude: true")
        // Our first attempt will be to validate the record from the database, 
        // so lets specify we want to explicitly ignore '_id' and '_schema' (which 
        // are internal fields used by Camo documents).  Our mock DB record 
        // still includes the "ownerId" field, so this first validation will 
        // fail. It will complain about ownerId, but will NOT complain 
        // about the presence of _id nor _schema.
        let uiValidator = ContactSchema.getValidator(true);
        if (uiValidator.isValid(dbRecord, ['_id', '_schema'])) {
          console.log('Record is valid.');
        }
        else {
          console.log('As expected, the record is not valid -- ' + uiValidator.lastError);
        }

        // Now, lets try to validate the sanitized UI record instead.
        // Also - let's use the alternative "try/catch" version of 
        // validation from the plugin...
        try {
            let validatedRecord = uiValidator.validate(uiRecord);
            console.log('Record validated correctly');
        }
        catch (error) {
          console.log('WARNING - ui record not valid -- ' + error.message);
        }

    })
    .catch((error) => {
        console.log(error);
    });
})
.catch((error) => {
  console.log(error);
});
