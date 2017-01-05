import React, { Component } from 'react';
import './App.css';
import OmniSchema from 'omni-schema';

import FormsyFromSchema from 'omni-schema/lib/plugins/ui-react-formsy-materialui';

FormsyFromSchema.plugin();

const Types = OmniSchema.Types;

const PersonSchema = OmniSchema.compile({
                          firstName: Types.FirstName, // The simplest way to declare a field
                          lastName: { type: 'LastName', required: true }, // If you need to vary from the defaults
                          sex: {type: 'Sex', ui: { presentation: 'radio' } }, // Adding a hint to one of the plugins
                          birthdate: { type: 'Date' },
                      }, 'People');


const AddressSchema = OmniSchema.compile({
   street: { type: 'StreetAddress' },
   city: { type: 'City' },
   state: { type: 'State' },
   zip: { type: 'PostalCode' }
}, 'Addresses');


const ContactSchema = OmniSchema.compile({
                          phone: [{ type: 'Phone' }], // Define an array of something by wrapping it in brackets
                          email: { type: 'Email', db: { unique: true} },
                          addresses: [{ type: AddressSchema, db: { persistence: 'embed'} }], // How to reference another schema
                          favorite: { type: 'YesNo', label: 'Add this person to your favorites?' },
                          balance: { type: 'Currency', default: 123.45 },
                          age: { type: 'Integer', validation: { min: 13, max: 110 }},
                          someFlag: { type: 'OnOff' },
                          ownerId: { type: 'Integer', ui: { exclude: true }}, // Internal field - no user editing
                      }, 'Contacts', PersonSchema);


const ContactEditor = ContactSchema.getReactMUIFormComponent();


const mockData = {
   firstName: 'John',
   lastName: 'Doe',
   email: 'jdoe@example.com',
   sex: 'M',
   favorite: false,
   someFlag: false
};

class App extends Component {


  onSubmit(model) {
    console.log('Form subbmited:');
    console.log(JSON.stringify(model));
  }


  onCancel(resetForm) {
    console.log('Form was canceled. Resetting.');
    resetForm();
  }

  render() {
    return (
      <div className="App">
        <ContactEditor
             submitButtonName='Save'
             onSubmit={this.onSubmit}
             cancelButtonName='Cancel'
             onCancel={this.onCancel}
             defaultValues={mockData}
             className="myFormClass"
             style={{ width: '50%', minWidth: '300px', padding: '15px' }}
             />
      </div>
    );
  }
}

export default App;
