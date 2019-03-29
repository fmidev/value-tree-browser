import ReactGA from "react-ga";
import React, { Component } from "react";
import { Link, withRouter } from "react-router-dom";
import {  Navbar } from "react-bootstrap";
import Routes from "./Routes";
import "./App.css";

ReactGA.initialize('UA-9509467-52');
ReactGA.pageview('/app');

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    const childProps = {};
    return (
      <div className="App container">
        <Navbar fluid collapseOnSelect>
          <Navbar.Header>
            <Navbar.Brand>
              <Link to="/">Arctic Observations Value Tree</Link>
            </Navbar.Brand>
            <Navbar.Toggle />
          </Navbar.Header>
        </Navbar>
        <Routes childProps={childProps} />
      </div>
    );
  }
}

export default withRouter(App);