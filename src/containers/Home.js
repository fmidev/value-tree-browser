import React, { Component } from "react";
import { PageHeader, ListGroup, ListGroupItem } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import "./Home.css";

import * as _ from "lodash";

import * as Data from '../data/DataSource';

export default class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isLoading: true,
      notes: []
    };
  }

  async componentDidMount() {
    try {
      const valuetrees = await this.valuetrees();
      //valuetrees = ;
      this.setState({ valuetrees: _.sortBy(valuetrees, 'treeName') });
    } catch (e) {
      alert(e);
    }

    this.setState({ isLoading: false });
  }

  valuetrees() {
    return Data.valuetrees();
  }

  renderValuetreeList(valuetrees) {
    return valuetrees.map(
      (valuetree, i) =>
          <LinkContainer key={valuetree.valuetreeId} to={`/valuetree/${valuetree.valuetreeId}`}>
            <ListGroupItem header={valuetree.treeName}>
              {[
                "Created: " + new Date(valuetree.createdAt).toLocaleString(),
                "Updated: " + new Date(valuetree.updatedAt).toLocaleString()
              ].join(', ')}
            </ListGroupItem>
          </LinkContainer>
          
    );
  }

  renderValuetrees() {
    return (
      <div className="valuetrees">
        <PageHeader>Value trees</PageHeader>
        <ListGroup>
          {!this.state.isLoading && this.renderValuetreeList(this.state.valuetrees)}
        </ListGroup>
      </div>
    );
  }

  render() {
    return (
      <div className="Home">
        {this.renderValuetrees()}
      </div>
    );
  }
}