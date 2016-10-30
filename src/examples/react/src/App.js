import React, { Component } from 'react';
import './App.css';
import OmniSchema from 'omni-schema';

import FormsyFromSchema from 'omni-schema/lib/plugins/ui-react-formsy-materialui';

FormsyFromSchema.plugin();

const ContactSchema = OmniSchema.compile({
                      firstName: { type: 'FirstName', required: true },
                      lastName: OmniSchema.Types.LastName, 
                      sex: {type: 'Sex', ui: { presentation: 'radio' } },
                      phones: { type: 'Phone' },
                      email: { type: 'Email', required: true },
                      birthdate: { type: 'Date' },
                      favorite: { type: 'YesNo', required: true },
                      balance: { type: 'Currency'},
                      age: { type: 'Integer', validation: { min: 0 }},
                      someFlag: { type: 'OnOff' },
                      ownerId: { type: 'Integer', ui: { exclude: true }}
                  });

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
