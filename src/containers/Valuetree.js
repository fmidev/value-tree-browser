import React, { Component } from "react";
import { Button, DropdownButton, FormGroup, MenuItem, ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { Link } from "react-router-dom";
import SankeyChart from "../components/SankeyChart";
import Draggable from 'react-draggable';

import * as Data from '../data/DataSource';

import * as jsFileDownload from 'js-file-download';

import * as _ from "lodash";

import "./Valuetree.css";

class Valuetree extends Component {
  constructor(props) {
    super(props);

    this.file = null;

    this.state = {
      isLoading: null,
      isDeleting: null,
      valuetree: null,
      content: { nodes: [], links: [] },
      hiddenNodes: [],
      lastEditNodeIndeces: [],
      lastEditLinkIndeces: [],
      hiddenDepths: [],
      treeName: "",
      publish: null,
      fullScreenMode: true,
      focusOnNode: null
    };
  }

  async componentDidMount() {
    try {
      const valuetree = await this.getValuetree();
      const { content, treeName, publish } = valuetree;

      _.each(content.links, l => {
        l.originalValue = l.value = Number(l.value);
        l.stickyLabel = false;
      });

      _.each(content.nodes, n => {
        n.stickyLabel = false;
      });

      this.setState({
        valuetree,
        content,
        treeName,
        publish
      });
    } catch (e) {
      alert(e);
    }
  }

  validateForm() {
    return this.state.treeName.length > 0;
  }

  handleChange = event => {
    this.setState({
      [event.target.id]: event.target.value
    });
  };

  getValuetree() {
    return Data.getValuetree(this.props.match.params.id);
  }

  prepareDownloadValuetree() {
    var svg = document.getElementsByTagName('svg')[0];

    //get svg source.
    var serializer = new XMLSerializer();
    var source = serializer.serializeToString(svg);

    //add name spaces.
    if(!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if(!source.match(/^<svg[^>]+"http:\/\/www\.w3\.org\/1999\/xlink"/)) {
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    //add xml declaration
    source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

    jsFileDownload(source, `${this.state.treeName}.svg`);
  }

  getSubtreeLinks = (nodeIdx) => {
      let outboundLinks = this.state.content.links.filter(link => {
        return link.source === nodeIdx;
      });
      if (_.isEmpty(outboundLinks)) {
        return outboundLinks;
      }
      let retval = outboundLinks.slice();
      outboundLinks.forEach(link => {
        retval = retval.concat(this.getSubtreeLinks(link.target))
      });
      return retval;
  };

  resetHightlight = () => {
      this.setState({
          lastEditLinkIndeces: [],
          lastEditNodeIndeces: []
      });
  };

  hideOrShowNode = event => {
    const idx = event.realIdx || event.idx;
    const hiddenNodes = this.state.hiddenNodes;
    const tmp = hiddenNodes.indexOf(idx);
    if (tmp === -1) {
      // Hide node
      hiddenNodes.push(idx);
    } else {
      // Show node
      hiddenNodes.splice(tmp, 1);
    }
    this.setState({ hiddenNodes });
      this.resetHightlight();
  };

  depthVisibilityButtonVariant(depth) {
    if (this.state.hiddenDepths.indexOf(depth) === -1) {
      return "default";
    } else {
      return "info";
    }
  }

  switchDepthVisibility(depth) {
    var hiddenDepths = this.state.hiddenDepths;
    if (hiddenDepths.indexOf(depth) === -1) {
      hiddenDepths.push(depth);
    } else {
      hiddenDepths = _.without(hiddenDepths, depth);
    }

    hiddenDepths = _.orderBy(hiddenDepths);

    this.setState({ hiddenDepths });
  }

  toggleFullScreenMode(value) {
    const fullScreenMode = _.find(value) ? true : false;
    const changed = this.state.fullScreenMode !== fullScreenMode;
    this.setState({ fullScreenMode });
    if (changed) {
      setTimeout(d => window.dispatchEvent(new Event('resize')) );
    }
  }

  getClassNames() {
    var ret = 'Valuetree';
    if (this.state.fullScreenMode) {
      ret += ' FullScreenMode'
    }
    return ret;
  }

  selectNodeToFocusOn = (node, i) => {
    if (_.isNumber(i)) {
      _.each(this.state.content.links, l => l.stickyLabel = false);
      this.focusOnNode(i);
      this.setState({ focusOnNode: i});
    } else {
      const { content, hiddenNodes } = this.state;
      _.each(content.links, l => { l.hidden = false; l.value = l.originalValue; l.stickyLabel = false; });
      hiddenNodes.splice(0);

      this.setState({ focusOnNode: null, content, hiddenNodes });
    }
    
  }

  focusOnNode = nodeIdx => {
    const content = this.state.content;

    // Reset all links and nodes
    _.each(content.links, l => { l.hidden = true; l.value = null; });

    var allIndexes = _.map(content.nodes, (n, i) => i);

    var partOfChain = {};
    partOfChain[nodeIdx] = true;

    function process(target, source, startIdx) {

      // 1. Unhide all links leading to startIdx (this helps us identify relevant links later on)
      var x, tmp = [startIdx];
      while (tmp.length > 0) {
        x = tmp.pop();
        _.each(_.filter(content.links, l => l[target] === x), l => {
          l.hidden = false;
          tmp.push(l[source]);
        });
      }

      // 2. Set all links that 'target' startIdx to have the weights they currently have
      _.each(_.filter(content.links, l => l[target] === startIdx), l => {
        l.value = l.originalValue;
      });

      // 3. Collect initial list of nodes to process by looking at all links whose 'target' is node at startIdx
      var processList = _.map(_.uniq(_.map(_.filter(content.links, l => l[target] === startIdx), l => l[source])), i => { return { idx: i, iterations: 0 }});

      processList = _.shuffle(processList);

      // 4. Process until the list is complete:
      //     a) shift the first element
      //     b) check if can process by checking if all nodes that link to this node are complete already
      //           if not, push element to the end of the list, and return to the start of the loop (a)
      //     c) set sum of outgoing links to match the sum of incoming links
      while(processList.length > 0) {
        // a) + infinite loop safety
        const e = processList.shift();
        if (++e.iterations > 1000) {
          window.alert('(CODE 001) Something is weird with the data, or there is a programming error!');
          throw 'aborting processing due to infinite loop';
        }
        // b)
        const linksThatContribute = _.filter(content.links, l => l[source] === e.idx && !l.hidden);
        if (_.find(linksThatContribute, l => l.value === null)) {
          // Incoming links not processed yet, push back to process list
          processList.push(e);
          continue;  
        }

        const outgoingLinks = _.filter(content.links, l => l[target] === e.idx);

        const contributionWeight = _.reduce(linksThatContribute, (memo, l) => memo + l.value, 0);
        const outgoingTotal = _.reduce(outgoingLinks, (memo, l) => memo + l.originalValue, 0);

        // c) set sum of outgoing links to match the sum of incoming links
        _.each(outgoingLinks, l => {
          l.hidden = false;
          l.value = l.originalValue * contributionWeight / outgoingTotal;
        });

        partOfChain[e.idx] = true;

        var newNodesToProcess = _.uniq(_.map(_.filter(content.links, l => l[target] === e.idx), l => l[source]));
        _.each(newNodesToProcess, i => {
          if (partOfChain[i] === true) {
            // Already completed
            window.alert('(CODE 002) Something is weird with the data, or there is a programming error!');
            throw 'aborting processing due to attempting to re-process node';
          }
          if (_.find(processList, p => p.idx === i)) {
            // Already queued
            return;
          }
          processList.push({ idx: i, iterations: 0 });
        });
      }
    }

    // Left-hand side
    process('target', 'source', nodeIdx);
    // Right-hand side
    process('source', 'target', nodeIdx);

    // Show sticky labels for links with value > 1
    _.each(_.filter(content.links, l => l.value >= 1), l => l.stickyLabel = true);

    // Give values to non-processed links so Sankey does not wig out
    _.each(_.filter(content.links, l => l.value === null), l => l.value = l.originalValue);


    // Hide nodes etc.
    const { hiddenNodes, lastEditNodeIndeces } = this.state;
    lastEditNodeIndeces.splice(0);
    lastEditNodeIndeces.push(nodeIdx);

    hiddenNodes.splice(0);

    _.each(allIndexes, i => {
      if (!partOfChain[i] && hiddenNodes.indexOf(i) === -1) {
        hiddenNodes.push(i);
      }
    });

    _.each(content.links, l => l.hidden = false);

    this.setState({ hiddenNodes, lastEditNodeIndeces, content });
  }

  showHideNodeLabel = event => {
    const content = this.state.content;
    const nodeIdx = event.realIdx;
    
    content.nodes[nodeIdx].stickyLabel = !content.nodes[nodeIdx].stickyLabel;
    this.setState({ content });
  }

  showHideLinkLabel = event => {
    const content = this.state.content;
    const linkIdx = event.realIdx;

    content.links[linkIdx].stickyLabel = !content.links[linkIdx].stickyLabel;
    this.setState({ content });
  }

  render() {
    return (
      <div className={this.getClassNames()}>
        {this.state.valuetree &&
          <form onSubmit={this.handleSubmit}>
            <h2>{this.state.treeName}</h2>
            <SankeyChart
              nodes={this.state.content.nodes}
              links={this.state.content.links}
              hiddenNodes={this.state.hiddenNodes}
              highlightedNodeIndeces={this.state.lastEditNodeIndeces}
              highlightedLinkIndeces={this.state.lastEditLinkIndeces}
              hiddenDepths={this.state.hiddenDepths}
              editNode={this.showHideNodeLabel}
              editLink={this.showHideLinkLabel}
              rightClickNode={this.hideOrShowNode}
              fitHeight={this.state.fullScreenMode}
            />
            <Draggable>
              <div className="ControlBox">
              {this.state.hiddenNodes.length === 0 &&
                <div className="hiddenNodes">
                  <p>You can temporarily hide nodes by right clicking</p>
                </div>
              }
              {this.state.hiddenNodes.length > 0 &&
                <div className="hiddenNodes">
                  <p>You can temporarily hide nodes by right clicking them. Restore nodes by clicking the buttons below.</p>
                  {this.state.hiddenNodes.map(idx => {
                    return <Button 
                      onClick={() => this.hideOrShowNode({ idx })}
                      key={idx}>{this.state.content.nodes[idx].name}</Button>;
                   })}
                </div>
              }
              <FormGroup>
                <span>Hide tree levels from view </span>
                {_.map([7,6,5,4,3,2,1,0], depth =>
                  <Button
                    key={depth}
                    bsStyle={this.depthVisibilityButtonVariant(depth)}
                    onClick={() => this.switchDepthVisibility(depth)}>{depth+1}</Button>
                 )}
              </FormGroup>
              <FormGroup>
                <DropdownButton bsSize="large" title={this.state.focusOnNode ? this.state.content.nodes[this.state.focusOnNode].name : "Select node to focus tree on"} id="focus-on-node">
                <MenuItem onSelect={() => this.selectNodeToFocusOn(null, null)} key={null}>None</MenuItem>
                  {
                    this.state.content.nodes.map((node, i) => 
                       <MenuItem onSelect={() => this.selectNodeToFocusOn(node, i)} key={i}>{node.name}</MenuItem>
                    )
                  
                  }
                </DropdownButton>
              </FormGroup>
              <FormGroup>
                <Button bsSize="large" bsStyle="info" onClick={this.prepareDownloadValuetree.bind(this)}>Download SVG</Button>
              </FormGroup>
              <FormGroup>
                <ToggleButtonGroup type="checkbox" value={this.state.fullScreenMode} onChange={this.toggleFullScreenMode.bind(this)}>
                  <ToggleButton value={true}>Full Screen Mode</ToggleButton>
                </ToggleButtonGroup>
              </FormGroup>
              <FormGroup>
                <Link to={`/`}>Back to tree list</Link>
              </FormGroup>
              </div>
            </Draggable>
          </form>}
      </div>
    );
  }

}

export default Valuetree;