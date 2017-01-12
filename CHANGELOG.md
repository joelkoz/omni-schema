## 2.0.3
###### _Jan 12, 2017_
- Fixed stack overflow on mock data generation involving recursive schemas

## 2.0.2
###### _Jan 7, 2017_
- Documentation improvements


## 2.0.0
###### _Jan 5, 2017_

- Added support for schema inheritance
- Added support for schema fields (i.e. fields that reference other schemas)


## 1.5.0
###### _Nov 5, 2016_

- Added support for optional remove button to the React form returned by the ui-react-formsy-materialui plugin

## 1.4.1
###### _Nov 4, 2016_

- Added "convert()" method to convert object fields to property data type if necessary
- Fixed React plugin to handle DatePicker and TimePicker values when stored as moment()
- Default DateTime should not be today's date - it is now "undefined" by default.

## 1.3.3
###### _Nov 4, 2016_

- Ignore '_id' field in an OmniSchema when generating Mongoose schema


## 1.3.1
###### _Nov 2, 2016_

- Added support for 'default' property in schema definition
- Added getDefaultRecord(uiOnly) method to OmniSchema class
- Added above to usage example
- Updated docs for above
- Added data types and default properties to docs

## 1.2.0
###### _Oct 31, 2016_
- added forEachField(callBack, uiOnly) method to OmniSchema class
- added getFieldList(uiOnly) method to OmniSchema class


## 1.1.0
###### _Oct 31, 2016_
- added sanitize(obj, uiOnly) method to OmniSchema class
