import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import './index.css';


// Imports for Material UI
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import AppTheme from './styles/app-theme';
import injectTapEventPlugin from 'react-tap-event-plugin';


injectTapEventPlugin();

ReactDOM.render(
  <MuiThemeProvider muiTheme={getMuiTheme(AppTheme)}>	
     <App />
  </MuiThemeProvider>,
  document.getElementById('root')
);
