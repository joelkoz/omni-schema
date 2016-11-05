const OmniSchema = require('../index');
const moment = require('moment');

const Types = OmniSchema.Types;

const TestSchema = OmniSchema.compile({
                      aString: Types.String,
                      aNumber: Types.Number,
                      anInteger: Types.Integer,
                      aBool: Types.Boolean,
                      dateTime: Types.DateTime,
                      anArray: [ Types.DateTime ]
                    });


function convert(label, testObj, sanitize) {
    console.log(`\n\n${label}-----------------\n`)
    console.log('Before convert:\n' + JSON.stringify(testObj));
    let newObj = TestSchema.convert(testObj, sanitize);
    console.log('\nAfter convert:\n' + JSON.stringify(newObj));
}


convert('Conforming', { aString: 'test', 
                        aNumber: 12.34, 
                        anInteger: 4, 
                        aBool: false, 
                        dateTime: moment(), 
                        anArray: [ moment(), moment() ]
                      });


convert('All strings', { aString: 'test', 
                        aNumber: '12.34', 
                        anInteger: '4', 
                        aBool: 'false', 
                        dateTime: '2016-11-05', 
                        anArray: [ '2016-11-03', '2016-11-04' ]
                      });


convert('All numbers', { aString: 1234, 
                        aNumber: 12.34, 
                        anInteger: 4, 
                        aBool: 1, 
                        dateTime: 2016, 
                        anArray: 2017
                      });


convert('All nulls', { aString: null, 
                        aNumber: null, 
                        anInteger: null, 
                        aBool: null, 
                        dateTime: null, 
                        anArray: null
                      });

convert('All blanks', { aString: '', 
                        aNumber: '', 
                        anInteger: '', 
                        aBool: '', 
                        dateTime: '', 
                        anArray: ['']
                      });


convert('All zero', { aString: 0, 
                        aNumber: 0, 
                        anInteger: 0, 
                        aBool: 0, 
                        dateTime: 0, 
                        anArray: 0
                      });



convert('Unknown fields', { aString: 'good', 
                        x1: 3, 
                        x2: 2, 
                        x3: true, 
                        x4: '2016-11-05', 
                        x5: ['2016-11-06']
                      });


convert('Sanitized unknown fields', { aString: 'good', 
                        x1: 3, 
                        x2: 2, 
                        x3: true, 
                        x4: '2016-11-05', 
                        x5: ['2016-11-06']
                      }, true);
