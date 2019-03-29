import React from 'react';
import ReactFauxDOM from 'react-faux-dom';
import d3 from 'd3';
import 'd3-plugins-sankey-fixed';
import ResponsiveWrapper from './ResponsiveWrapper'

import * as TextCutter from "../utils/TextCutter";

import _ from 'lodash';

class SankeyChart extends React.Component {

  render() {
    // ========================================================================
    // Set units, margin, sizes
    // ========================================================================
    var margin = { top: 10, right: 0, bottom: 10, left: 0 };
    var width = Math.max(this.props.parentWidth, 690 - margin.left - margin.right);
    var height = (this.props.parentHeight || 600) - margin.top - margin.bottom;


    var formatNumber = d3.format(",.0f"); // zero decimal places
    var formatNumberDecimals = d3.format(",.1f"); // zero decimal places
    
    var format = (d) => {
      if (d >= 1 || d === 0) {
        return formatNumber(d);
      } else {
        return formatNumberDecimals(d);
      }
    }

    // Calculate length of longest link
    function calculateLongestChain(nodes, links) {
      const linkLengthCache = {}; // cache: index => max chain length "right" of this node
      function calculateChainLength(nodeIndex) {
        var ret = linkLengthCache[nodeIndex];
        if (!ret) {
          const linksFromThisNode = _.filter(links, l => l.source === nodeIndex);
          ret = (_.max(_.map(linksFromThisNode, l => calculateChainLength(l.target))) || 0) + 1;
          linkLengthCache[nodeIndex] = ret;
        }
        return ret;
      }
      return _.reduce(nodes, (longest, node, idx) => {
        return Math.max(calculateChainLength(idx), longest);
      }, 1);
    }

    // Calculate depth of each node (right to left, just as above)
    const nodeDepth = (function(nodes, links) {
      const linkLengthCache = {}; // cache: index => max chain length "left" of this node
      function calculateChainLength(nodeIndex) {
        var ret = linkLengthCache[nodeIndex];
        if (!ret) {
          const linksFromThisNode = _.filter(links, l => l.source === nodeIndex);
          ret = (_.max(_.map(linksFromThisNode, l => calculateChainLength(l.target))) || 0) + 1;
          linkLengthCache[nodeIndex] = ret;
        }
        return ret;
      }
      return _.reduce(nodes, (memo, node, idx) => {
        memo[idx] = calculateChainLength(idx) - 1;
        return memo;
      }, {});
    })(this.props.nodes, this.props.links);

    const longestChain = calculateLongestChain(this.props.nodes, this.props.links);

    var fontSize = 0.8;

    const maxLabelWidth = width/Math.max(1, longestChain-1);

    if (maxLabelWidth > 300) {
      fontSize = 0.8+(maxLabelWidth-300)/500;
    }

    const approxLetterWidth = 10*fontSize;
    const maxLabelWidthLetters = Math.floor(maxLabelWidth / approxLetterWidth);

    // ========================================================================
    // Set the sankey diagram properties
    // ========================================================================
    var sankey = d3.sankey()
    .size([width, height])
    .nodeWidth(15)
    .nodePadding(15);

    var path = sankey.link();

    var graph = {
      nodes: _.map(this.props.nodes, (n, i) => _.extend({}, n, {
        idx: i,
        realIdx: i,
        hidden: this.props.hiddenNodes.indexOf(i) !== -1,
        highlighted: this.props.highlightedNodeIndeces && this.props.highlightedNodeIndeces.indexOf(i) !== -1,
        depth: nodeDepth[i]
      })),
      links: _.map(this.props.links, (l, i) => _.extend({}, l, {
        idx: i,
        realIdx: i,
        value: Number(l.value),
        hidden: l.hidden ||
            this.props.hiddenNodes.indexOf(l.source) !== -1 || 
            this.props.hiddenNodes.indexOf(l.target) !== -1,
        highlighted: this.props.highlightedLinkIndeces &&
            this.props.highlightedLinkIndeces.indexOf(i) !== -1,
        virtualLink: false,
        replacedByVirtual: false
      }))
    };

    _.each(this.props.hiddenDepths, hideDepth => {
      _.each(_.filter(graph.nodes, n => n.depth === hideDepth), n => {

        // 1. Hide node
        n.hidden = true;

        // 2. Hide all links from or to this node
        var sourceLinks = _.filter(graph.links, { target: n.realIdx }); // Links pointing to this node ("left")
        var targetLinks = _.filter(graph.links, { source: n.realIdx }); // Links pointing from this node ("right")

        var sourceValue = _.sum(_.map(sourceLinks, l => l.value || 0));
        var targetValue = _.sum(_.map(targetLinks, l => l.value || 0));

        _.each(sourceLinks, l => l.hidden = true);
        _.each(targetLinks, l => l.hidden = true);

        // 3. Add links connecting all source nodes in (2) to the target nodes in (3)
        _.each(sourceLinks, source => {
          if (source.replacedByVirtual) return;
          _.each(targetLinks, target => {
            if (target.replacedByVirtual) return

            // Value of this virtual link is proportional the value of this source and this node compared to the 
            const value = ((source.value || 0) / sourceValue) * ((target.value || 0) / targetValue) * targetValue;

            graph.links.push({
              value: value,
              source: source.source,
              target: target.target,
              color: target.color,
              idx: graph.links.length,
              realIdx: graph.links.length,
              hidden: false,
              highlighted: false,
              virtualLink: true
            });
          });
        });

        // 4. Mark each link as replacedByVirtual to avoid counting them "twice"
        _.each(sourceLinks, l => l.replacedByVirtual = true);
        _.each(targetLinks, l => l.replacedByVirtual = true);
      });

    });

    graph.links = _.filter(graph.links, l => !l.hidden);

    var indexesToRemove = _.sortBy(_.map(_.filter(graph.nodes, n => n.hidden), n => n.idx )).reverse();
    
    graph.nodes = _.filter(graph.nodes, n => !n.hidden);

    _.each(indexesToRemove, i => {
      _.each(graph.links, l => {
        if (l.target >= i) {
          l.target--;
        }
        if (l.source >= i) {
          l.source--;
        }
      });
      _.each(graph.nodes, n => {
        if (n.idx >= i) {
          n.idx--;
        }
      })
    });

    sankey.nodes(graph.nodes)
      .links(graph.links)
      .layout(32);

    // ========================================================================
    // Initialize and append the svg canvas to faux-DOM
    // ========================================================================
    var svgNode = ReactFauxDOM.createElement('div');
    svgNode.setAttribute('class', 'SankeyChart');

    var svg = d3.select(svgNode).append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("style")
      .text(
        "* { font-family: \"Open Sans\", sans-serif; }\n"+
        ".node rect  { fill: #888888; shape-rendering: crispEdges; }\n"+
        ".node       { fill-opacity: .7; }\n"+
        ".node:hover { cursor: pointer; fill-opacity: 1; }\n"+
        ".node text  { fill: #222222; stroke: none; }\n"+
        ".link       { stroke: #cccccc; stroke-opacity: .4; fill: none; }\n"+
        ".link:hover { stroke-opacity: .6; cursor: pointer; }\n"+
        ".link-path textPath { fill: #777; cursor: pointer; }");

    var defs = svg.append('defs').selectAll('path');

    // ========================================================================
    // Add links
    // ========================================================================
    var link = svg.append("g").selectAll(".link")
      .data(graph.links)
      .enter().append("path")
      .attr("class", "link")
      .on("click", this.props.editLink) // register eventListener
      .attr("d", path)
      .style("stroke", d => d.color)
      .style("stroke-width", (d) => Math.max(1, d.dy))
        .style("stroke-dasharray", (d) => d.highlighted ? "5,5" : "")
    // add link titles
    link.append("title")
      .text((d) => {
        var text = d.source.name + " → " + d.target.name + " (weight " + format(d.value) + ")";
        if (d.description) {
          text += "\nDescription: " + d.description;
        }
        return text;
      });

    defs
      .data(graph.links)
      .enter().append("path")
      .attr("id", d => "link-path-" + d.realIdx)
      .attr("d", path);

    // ========================================================================
    // Add nodes
    // ========================================================================
    var node = svg.append("g").selectAll(".node")
      .data(_.filter(graph.nodes, n => !n.hidden))
      .enter().append("g")
      .attr("class", "node")
      .on('click', this.props.editNode) // register eventListener
      .attr("transform", (d) => "translate(" + d.x + "," + d.y + ")")
      .on("contextmenu", event => {
        this.props.rightClickNode(event);
        d3.event.preventDefault();
      });

    function nodeTitle(d, simple) {
      var targetSum = _.reduce(d.targetLinks, (memo, l) => { return Number(l.value) + memo; },  0);
      var sourceSum = _.reduce(d.sourceLinks, (memo, l) => { return Number(l.value) + memo; },  0);
      
      if (simple) {
        if (Math.abs(targetSum-sourceSum) < 0.01) {
          return "W "+format(targetSum);
        } else if (targetSum < 0.01 && sourceSum > 0.01) {
          return "R "+format(sourceSum);
        } else if (sourceSum < 0.01 && targetSum > 0.01) {
          return "L "+format(targetSum);
        }
        return "L " + format(targetSum) + ", R " +format(sourceSum);
      }
      var text = d.name + " (L " + format(targetSum) + ", R " +format(sourceSum)+ ")";
      if (d.description) {
        text +="\nDescription: " + d.description;
      }
      return text;
    }

    // add nodes rect
    node.append("rect")
      .attr("height", (d) => d.dy)
      .attr("width", sankey.nodeWidth())
      .append("title")
      .text(nodeTitle);

    // add nodes text
    node.append("text")
      .attr("x", -6)
      .attr("y", (d) => d.dy / 2)
      .attr("dy", ".35em")
        .attr("font-weight", (d) => d.highlighted ? "bold" : "normal")
        .attr("font-size", `${fontSize}em`)
      .attr("text-anchor", "end")
      .text((d) => { if (d.highlighted) return d.name; else return TextCutter.cut(d.name, maxLabelWidthLetters); })
      .filter((d) => d.x < width / 2)
      .attr("x", 6 + sankey.nodeWidth())
      .attr("text-anchor", "start");

    // Add sticky labels
    node
      .filter(d => d.stickyLabel)
      .append("text")
      .attr("x", sankey.nodeWidth()/2)
      .attr("y", (d) => d.dy*2/3 )
      .attr("font-size", `${fontSize}em`)
      .attr("text-anchor", "middle")

      .text(d => nodeTitle(d, true))

    svg.append("g").selectAll(".link-path")
      .data(_.filter(graph.links, l => l.stickyLabel))
      .enter().append("text")
      .attr("class", "link-path")
      .attr("text-anchor", "middle")
      .attr("font-size", `${fontSize}em`)
      .append("textPath")
      .attr("xlink:href", d => '#link-path-'+d.realIdx)
      .attr("startOffset", "50%")
      .on("click", this.props.editLink) // register eventListener
      .text(d => ' → '+format(d.value)+' → ');

    // Above D3 manipaluation equal to following jsx if didn't rely on faux-dom 
    // ------------------------------------------------------------------------
    // var links = graph.links.map((link, i) => {
    //   return (
    //     <g>
    //       <path key={i} className="link" onClick={()=>{this.props.openModal(link)}} d={path(link)} style={{strokeWidth: Math.max(1, link.dy)}}>
    //         <title>{link.source.name + " → " + link.target.name + "\n Weight: " + format(link.value)}</title>
    //       </path>
    //     </g>
    //   );
    // });

    // var nodes = graph.nodes.map((node, i) => {
    //   return (
    //     <g key={i} className="node" onClick={()=>{this.props.openModal(node)}} transform={"translate(" + node.x + "," + node.y + ")"}>
    //       <rect height={node.dy} width={sankey.nodeWidth()}>
    //         <title>{node.name + "\n" + format(node.value)}</title>
    //       </rect>
    //       { (node.x >= width / 2) ? 
    //         <text x={-6} y={node.dy / 2} dy={".35em"} textAnchor={"end"} >{node.name}</text> :
    //         <text x={6 + sankey.nodeWidth()} y={node.dy / 2} dy={".35em"} textAnchor={"start"} >{node.name}</text>
    //       }
    //     </g>
    //   );
    // });

    // ========================================================================
    // Render the faux-DOM to React elements
    // ========================================================================
    return svgNode.toReact();

    // JSX rendering return if didn't rely on faux-dom
    // ------------------------------------------------------------------------
    // return (
    //   <svg width={width + margin.left + margin.right} height={height + margin.top + margin.bottom}>
    //     <g transform={"translate(" + margin.left + "," + margin.top + ")"}>
    //       {links}
    //       {nodes}
    //     </g>
    //   </svg>
    // );
  }
}

export default ResponsiveWrapper(SankeyChart);