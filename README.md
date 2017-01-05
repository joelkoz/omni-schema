OmniSchema.js
=============
One Schema to Rule them All!

OmniSchema is a universal, extendible schema framework that allows you to practice DRY for data definitions in your Javascript projects. Rather than manage one set of schemas for your database, another for your validations, and yet another set of code for your user interfaces, OmniSchema allows you to define a master schema for any particular entity, then request that it generate automatically a schema for use with your tool of choice.  OmniSchema supports a flexible "plugin" system that allows you decide exactly what you want it to generate for you at runtime. Select from one of the many pre-built plugins, or write your own using OmniSchema's sophisticated yet simple mixin system. 


Motivation
-----------
As you look around the Javascript universe, you'll see thousands of useful libraries for storing, checking, and manipulating data. It seems that all of them have their own way of describing what the data is. What this means is that you end up describing the same data definition (for example, an address book entry) over and over to different libraries using their own dialects. OmniSchema attempts to solve this problem by allowing you to define your schemas at a very high level. For example, OmniSchema's data types are things like `FirstName`, `Email`, and `Phone`. While these three data elements may be stored in a database in exactly the same format (as a string), your UI may need to present and format them in different ways, and your validators have yet another way of determining if they are valid.  


Philosophies
------------
1. Describe data elements at a very high level using fine grained data types like `FirstName` and `Email`.

2. Use generic/conceptual attributes on your data or field definitions that may apply to different libraries vs. library specific attributes. For example, many libraries, be it for ui, data storage, or validation, have a concept of a field being "required". You should only have to describe this once, regardless of whether or not a library thinks the attribute is called "required", "isRequired", "req", or something else. Keeping things generic allows the same schema to serve different purposes, as well as allows different libraries for the same purpose (such as validation) to be swapped out for each other.

3. Make defining new data types easy. At some point, you are going to run into domain specific types of data. You should be able to define domain specific data types and easily add domain specific behavior when needed, yet still be able to fall back on the "default" behavior for those parts of the framework where your data type behaves like some other pre-defined data type.  That is, you may want to have a special control generated for your UI, but for data storage, your database considers your field "just another string or number."  OmniTypes (data types used by OmniSchema) supports inheritance.

4. Defining behavior for data types should also be easy.  Whether you are adding new UI behavior for a custom data type to a pre-exisitng plugin, or you are creating a new plugin for OmniSchema to work with your favorite library, coding the plugin should be fast and easy.  OmniSchema relies on Object Oriented Programming concepts to minimize the amount of coding you need to do, as well as a sophisticated matching descriptor in its mixin system to allow you to zero in on a specific data type or group types that you need to add behavior to.

5. Only use the functionality you need.  With all this capability, there is no need to include the kitchen sink
in your node_modules directory if all you want is a simple validator client side. For this reason, the OmniSchema core is VERY lightweight, and requires only "lodash" and "moment".  All other dependencies are optional and depends on which plugins you "plug in" to your project. This superset of dependencies are saved as development dependencies in the project's package.json.


Installation
------------

```
npm install omni-schema
```


Usage
------------

```javascript
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

// Defining a schema with a collection name of "People"...
const PersonSchema = OmniSchema.compile({
                          firstName: Types.FirstName, // The simplest way to declare a field
                          lastName: { type: 'LastName', required: true }, // If you need to vary from the defaults
                          sex: {type: 'Sex', ui: { presentation: 'radio' } }, // Adding a hint to one of the plugins
                          birthdate: { type: 'Date' },
                      }, 'People');


// Defining a schema of a single address.  We will embed this in the ContactSchema below
const AddressSchema = OmniSchema.compile({
   street: { type: 'StreetAddress' },
   city: { type: 'City' },
   state: { type: 'State' },
   zip: { type: 'PostalCode' }
}, 'Address');


// ContactSchema is a collection named "Contacts" that inherits/extends the properties of PersonSchema
const ContactSchema = OmniSchema.compile({
                          phone: [{ type: 'Phone' }], // Define an array of something by wrapping it in brackets
                          email: { type: 'Email', db: { unique: true} },
                          addresses: [{ type: AddressSchema, db: { persistence: 'embed'} }], // How to reference another schema
                          favorite: { type: 'YesNo', label: 'Add this person to your favorites?' },
                          balance: { type: 'Currency', default: 123.45 },
                          age: { type: 'Integer', validation: { min: 13, max: 110 }},
                          ownerId: { type: 'Integer', ui: { exclude: true }}, // Internal field - no user editing
                      }, 'Contacts', PersonSchema); 

console.log(`The fields in our schema are ${JSON.stringify(ContactSchema.getFieldList())}`);

console.log(`\nThe fields to be displayed in the UI are ${JSON.stringify(ContactSchema.getFieldList(true))}\n`);

console.log(`\nA new blank default record for editing looks like this:\n${JSON.stringify(ContactSchema.getDefaultRecord(true))}\n`);


// First, connect to database
// let uri = 'mongodb://localhost:27017/OmniSchemaExample'; // save to a MongoDB database
let uri = 'nedb://memory'; // save to an in memory NeDB database
connect(uri).then(() => {

    // Create a Camo document to store our data...
    let Contact = ContactSchema.getCamoClass();

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
        console.log('\n\nValidating the db record with a UI validator...');


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
        console.log('Trying again with a UI record...');
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

```

Data types
-------------------------------

The following data types are already defined in OmniSchema. You can use them directly for the `type`
property of your field definition, or use them as the `baseType` parameter when defining a new data type with
OmniSchema.defineDataType():


| Data type | Javascript type | Base data type | Notes |
| --------- | :-------------: | :------------: | ------|
| String |string | DataType | |
| Number | number | DataType | |
| Boolean | boolean | DataType | |
| Object | object | DataType | dont use directly |
| DateTime | Date | Object | |
| Text | string | String | presents in UI as multi-line text |
| FullName | string | String | use to generate realistic mock data |
| FirstName | string | String |  use to generate realistic mock data |
| LastName | string | String |  use to generate realistic mock data |
| Password | string | String | present in UI as password field |
| Phone | string | String | use to generate realistic mock data |
| Email | string | String | requires proper format for ui and db validation |
| Url | string | String |  requires proper format for ui and db validation |
| StreetAddress | string | String |   use to generate realistic mock data |
| City | string | String |   use to generate realistic mock data |
| State | string | String |   use to generate realistic mock data |
| PostalCode | string | String |   use to generate realistic mock data |
| CreditCardNumber | string | String | requires proper format for ui and db validation |
| Integer | number | Number | requires proper format for ui and db validation |
| Decimal | number | Number | requires proper format for ui and db validation |
| Currency | number | Number | requires proper format for ui and db validation |
| Date | Date | DateTime | The 'date' part only of a DateTime
| Time | Date | DateTime | The 'time' part only of a DateTime
| YesNo | boolean | Boolean | presents in UI as enumeration of "Yes" and "No"
| Sex | string | String | presents in UI as enumeration of "Male" and "Female"
| OnOff | boolean | Boolean | presents in UI as a toggle. Also is enumeration of "On and "Off" 


To define your own data types, use one of the following methods:

```javascript
OmniSchema.defineDataType(name, props, baseType, toString, fromString)
OmniSchema.defineStringType(name, props, toString, fromString)
OmniSchema.defineNumericType(name, props, toString, fromString)
OmniSchema.defineBooleanType(name, props, toString, fromString)
OmniSchema.defineObjectType(name, jsClassName, props, baseType, toString, fromString)
OmniSchema.defineEnumerationType(name, optionSpec, props, baseType)
```

All of the above allow you to specify a 'name' of a new data type, or a pre-existing data type. If a pre-existing data type is used, your specification is merged into the pre-existing data type. For this reason, it is common to define a "namespace" property when creating properties for a specific plugin (like a UI or DB plugin).  See the source code in `types.js`, as well as in
`plugins/*.js` for examples on how to use.


Schema field properties
-------------------------

The following properties are defined as "universal" properties that can be used by one or more
plugins.  You are free to create your own of course if writing your own plugins, but if possible,
using one of the below will make your plugin more useful to pre existing schema definitions:

| Property | Possible values | Notes |
| -------- | --------------- | ----- |
| type | A string that matches any data type defined in OmniSchema.Types, or any OmniSchema.Type value | The only required field
| label | any string | If not specified, a label will be formulated from the field name
| required | boolean | A shortcut property for `validation.required`
| db.unique | boolean | If true, this field should be considered 'unique' in any collection of these entries. Primary used in databases.
| db.persistence | string | Used in conjunction with fields that are other schemas, this property specifies how the field should be stored in a database.  The value 'embed' specifies that it should be a sub-document of the containing document. 'reference' (the default) indicates the value should be stored in a separate collection and be simply referenced by the containing document using its id. |
| db.foreignKeyField | string | Used in conjunction with fields that are other schemas, this is an optimization used by the Mongoose plugin to specify that the defining field should be derived by using the reference stored in the other schema (see `Referencing Other Schemas` below).
| ui.exclude | boolean | If true, this field will be excluded from any generated user interfaces and UI validations
| ui.presentation | 'select', radio', 'toggle', 'checkbox' | For enumerations, a way to specify the UI presentation if you do not like the default value.  'toggle' and 'checkbox' are only valid for enumerations that are also boolean values
| validation.min | number | For numbers, the minimum allowed number.  For strings, the minimum allowed length
| validation.max | number | For numbers, the maximum allowed number. For strings, the maximum allowed length
| validation.required | boolean | If true, the field is required to have a value to pass ui and db validation
| default | a value or a function | If a function, it is called (with zero arguments) to compute a default value. Otherwise, the value is used as is.


Referencing Other Schemas
-------------------------

OmniSchema supports the ability for a field in a schema to have a data type that is actually another schema. This
allows the database plugins to do the equivalent of *relational joins*.  The simplest way to specify this relationship
is to use one schema as the "type" field of another, like this:

```javascript

  const AddressSchema = OmniSchema.compile({
     street: { type: 'StreetAddress' },
     city: { type: 'City' },
     state: { type: 'State' },
     zip: { type: 'PostalCode' }
  }, 'Address');


  const PersonSchema = OmniSchema.compile({
                            firstName: { type: 'FirstName' },
                            lastName: { type: 'LastName', required: true },
                            address: { type: AddressSchema, db: { persistence: 'embed'} }
                        }, 'People');
```

In the above example, the "People" collection will have fields such as `firstName`, `lastName` as well as address fields 
`address.street`, `address.state`, etc.  The `db.persistence = 'embed'` setting indicates to the database plugins that
when storing the data, the `address` data should be stored directly inside the `People` collection as one single document. 


Handling circular References to Other Schemas
---------------------------------------------

Sometimes you have one schema that references another, which in turn references the first schema. This presents a
problem when defining your schemas, as there is no way to supply a compiled schema value to each schema, since they
depend on the other already being compiled.

OmniSchema supports an alternative schema specification that allows you to specify the other schema as a string using its
collection name. To use this alternative specification, define your field type NOT with the `type` property, but instead 
use the `schema` property, like this:


```javascript

  const TransactionSchema = OmniSchema.compile({  
                             date: { type: 'Date' }, 
                             item: { type: 'String' }, 
                             amount: { type: 'Currency' },
                             customer: { schema: 'Customer' }
                           }, 'Transactions');

  const CustomerSchema = OmniSchema.compile({
                            accountNumber: { type: 'String' },
                            orderCount: { type: 'String' },
                            lastOrderDate: { type: 'String' },
                            transactions: [ { type: TransactionSchema }],
                        }, 'Customer');

```

Notice that the `Transaction.customer` field's reference to the `Customer` schema is done via a string instead of using
the actual compiled schema definition such as is done with the `Customer.transactions` field.  This mechanism works
because OmniSchema and its plugins keep track of compiled schemas and models internally, provided you specify a
collection name when you compile the schema.

Note that this auto-definition is not purely automatic. The plugins, for example, do not automatically make a call and request framework specific schemas and models just because you have an OmniSchema definition for one.  For example, when using the MongooseJS plugin, if you are requesting models, you will have to do this for the above:

```javascript

  const Transaction = TransactionSchema.getMongooseModel();
  const Customer = CustomerSchema.getMongooseModel();

```

...even if you only need to use the `Customer` model in your code.  It is the call to getMongooseModel() that causes the
plugin to save a copy of the model in mongoose format, and since a mongoose `Customer` model needs the mongoose `Transaction` model, it is
important that the `Transaction` model be requested and cached at least once prior to requesting the `Customer` model.


Optimizing references using foreign keys
----------------------------------------

There is actually a potential problem with the above `Transaction` and `Customer` schema definitions. As currently
specified, `Customer.transactions` is an array that you need to populate each time you create a `Transaction`.  That is because, as defined, the transactions are stored as an array of transaction ids in the Customer document.  Not only is
this time consuming and error prone, unbounded arrays is a MongoDB anti-pattern.  The last thing you want is an array for 10,000 ids if a customer has 10,000 separate transactions.

Mongoose solves this problem with a feature called "virtual fields." A virtual field is a way to specify data that is not really stored directly in the document, but it is instead computed from other data in the data store.  In this example, what we want to do is specify that the `Customer.transactions` array actually be populated by a second *join* type query on the `Transactions` collection.  One simple addition to our OmniSchema definition takes care of this:


```javascript

  const CustomerSchema = OmniSchema.compile({
     ...
     transactions: [ { type: TransactionSchema, db: { foreignKeyField: 'customer' } }],
     ...
  }, 'Customer');    

```

The `db.foreignKeyField` property above specifies that the `transactions` field can be computed by matching the
object id of the current schema (i.e. the `Customer` collection) to the `customer` field in the `Transaction` collection.

Note that this feature is currently only supported by the mongoose plugin.  Camo does not have such a feature at this time. Also note that for Mongoose models, these virtual fields are not automatically populated. You must explicitly request they be populated by calling the `populate()` method like this:


```javascript

      let query = Customer.findOne({_id: customerId }).populate('transactions');
      
      query.exec().then( (result) => { console.log(JSON.stringify(result)) } );

```


Pre existing OmniSchema Plugins
-------------------------------

You can use these plugins to get to work right away, or use them as a guide to make your own:


----
`db-camo.js`

A plugin to generate a Camo document, enabling ODM for MongoDB or NeDB

Uses: *[Camo](https://github.com/scottwrobinson/camo)*

----
`db-mongoosejs.js`

A plugin to generate a Mongoose schema, enabling ODM for MongoDB

Uses: *[Mongoose](http://mongoosejs.com)*

----
`mock-faker.js`

A plugin to generate mock data for a record that matches the schema.

Uses: *[Faker](https://github.com/stympy/faker)*

----
`ui-html5.js`

A plugin to generate a UI in pure HTML for editing records that match the schema.

----
`ui-react-formsy-materialui.js`

A plugin to generate React components using Material UI to create a UI for editing records that match the schema.

Uses: *[React](https://facebook.github.io/react)*
      *[Material UI](http://www.material-ui.com)*
      *[Formsy](https://github.com/christianalfoni/formsy-react)*
      *[Formsy-Material-UI](https://github.com/mbrookes/formsy-material-ui)*

----

Known Issues
-------------------------------
1. The UI plugins don't support editing array fields yet.


Road Map
------------------------------

1. Support array editing in UI

2. Documentation for creating plugins

3. Create unit tests for existing code
