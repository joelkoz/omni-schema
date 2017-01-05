const OmniSchema = require('../index');
const OmniMongoose = require('../plugins/db-mongoosejs');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;

OmniMongoose.plugin();


mongoose.connect('mongodb://localhost/mongoose-example', { promiseLibrary: global.Promise });
mongoose.connection.on('error', function(error) {
	console.log(`Mongoose connection error: ${error}`);
});

let customerId;

// Create test data using straight mongoosejs code (and no OmniSchema plugin code)
// let createTestData = function() {

// const MongooseSchema = mongoose.Schema;

// 	let AddressSchema = new MongooseSchema({ street: String, 
// 											 city: String, 
// 											 state: String, 
// 											 zip: String });



// 	let PersonSchema = new MongooseSchema( { firstName: String, 
// 											 lastName: String, 
// 											 address: AddressSchema }, 
// 										   { discriminatorKey: '_type_' });
// 	let Person = mongoose.model('People', PersonSchema);



// 	let CustomerSchema = new MongooseSchema( { accountNumber: String, 
// 											   orderCount: Number, 
// 											   lastOrderDate: Date }, 
// 											 { discriminatorKey: '_type_', _id: false, toJSON: { virtuals: true } });
// 	CustomerSchema.virtual('transactions', { ref: 'Transactions', localField: '_id', foreignField: 'customer' });
// 	let Customer = Person.discriminator('Customer', CustomerSchema);



// 	let TransactionSchema = new MongooseSchema( { customer: { ref: 'Customer', type: MongooseSchema.Types.ObjectId }, 
// 												  date: Date, 
// 												  item: String, 
// 												  amount: Number });
// 	let Transaction = mongoose.model('Transactions', TransactionSchema);


// 	let customer = new Customer({
// 		firstName: 'John',
// 		lastName: 'Doe',
// 		address: {
// 			street: '1234 Main St',
// 			city: 'Boca Raton',
// 			state: 'FL',
// 			zip: '33498'
// 		}
// 	});

// 	return customer.save()

// 	.then((cust) => {
// 			customerId = cust._id;
// 			let now = new Date();
// 			return Transaction.insertMany([ { customer: cust, date: now, item: 'ITEM001', amount: 101.01 },
// 											{ customer: cust, date: now, item: 'ITEM002', amount: 102.02 },
// 											{ customer: cust, date: now, item: 'ITEM003', amount: 103.03 },
// 											{ customer: cust, date: now, item: 'ITEM004', amount: 104.04 },
// 				                          ]);
// 	})

// 	.then(() => {
// 			console.log('Data created. Retrieving customer...');
// 			return Customer.find({_id: customerId }).populate('transactions').exec();
// 	})

// 	.then((cust) => {
// 			console.log('Retrieved customer with Mongoose code: ');
// 			console.log(JSON.stringify(cust));
// 	})

// 	.catch((error) => {
// 		console.log(`Mongoose save error: ${error}`);
// 	});

// }


let testOmniPlugin = function() {

	const AddressSchema = OmniSchema.compile({
	   street: { type: 'StreetAddress' },
	   city: { type: 'City' },
	   state: { type: 'State' },
	   zip: { type: 'PostalCode' }
	}, 'Addresses');


	const PersonSchema = OmniSchema.compile({
	                          firstName: { type: 'FirstName' },
	                          lastName: { type: 'LastName', required: true },
	                          address: { type: AddressSchema, db: { persistence: 'embed'} }
	                      }, 'People');


	const TransactionSchema = OmniSchema.compile({ customer: { schema: 'Customer' }, 
	  									     	   date: { type: 'Date' }, 
											       item: { type: 'String' }, 
											       amount: { type: 'Currency' }
											     }, 'Transactions');

	const CustomerSchema = OmniSchema.compile({
	                      		accountNumber: { type: 'String' },
	                      		orderCount: { type: 'String' },
	                      		lastOrderDate: { type: 'String' },
	                      		transactions: [ { type: TransactionSchema, db: { foreignKeyField: 'customer' } }],
	                  	  }, 'Customer', PersonSchema);


	const Transaction = TransactionSchema.getMongooseModel();
	const Customer = CustomerSchema.getMongooseModel();

	let customer = new Customer({
		firstName: 'John',
		lastName: 'Doe',
		address: {
			street: '1234 Main St',
			city: 'Boca Raton',
			state: 'FL',
			zip: '33498'
		}
	});

	return customer.save()

	.then((cust) => {
			customerId = cust._id;
			let now = new Date();
			return Transaction.insertMany([ { customer: cust, date: now, item: 'ITEM001', amount: 101.01 },
											{ customer: cust, date: now, item: 'ITEM002', amount: 102.02 },
											{ customer: cust, date: now, item: 'ITEM003', amount: 103.03 },
											{ customer: cust, date: now, item: 'ITEM004', amount: 104.04 },
				                          ]);
	})

	.then(() => {
			console.log('Data created. Retrieving customer...');
			return Customer.find({_id: customerId }).populate('transactions').exec();
	})

	.then((cust) => {
			console.log('Retrieved customer with plugin code: ');
			console.log(JSON.stringify(cust));
	})

	.catch((error) => {
		console.log(`testOmniPlugin() save error: ${error}`);
	});


}


testOmniPlugin()

.then(() => {
		console.log("disconnecting...");
		mongoose.disconnect();
})

.catch((error) => {
	console.log(`General error: ${error}`);
})
