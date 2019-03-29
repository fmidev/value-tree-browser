import React, { Component } from 'react'

// Adapted from https://medium.com/@caspg/responsive-chart-with-react-and-d3v4-afd717e57583
export default ChartComponent => (
  class ResponsiveChart extends Component {
    constructor(props) {
      super(props)

      this.state = {
        containerWidth: null,
        containerHeight: null
      }

      this.fitParentContainer = this.fitParentContainer.bind(this)
    }

    componentDidMount() {
      this.fitParentContainer()
      window.addEventListener('resize', this.fitParentContainer)
    }

    componentWillUnmount() {
      window.removeEventListener('resize', this.fitParentContainer)
    }

    fitParentContainer() {
      const { containerWidth, containerHeight } = this.state

      const rect = this.chartContainer.getBoundingClientRect()

      const currentContainerWidth = rect.width;
      const currentContainerHeight = rect.height;

      var shouldResize = containerWidth !== currentContainerWidth;
      if (!shouldResize && this.props.fitHeight) {
        shouldResize = containerHeight !== currentContainerHeight;
      }

      if (shouldResize) {
        this.setState({
          containerWidth: currentContainerWidth,
          containerHeight: currentContainerHeight
        })
      }
    }

    renderChart() {
      const parentWidth = this.state.containerWidth;
      const parentHeight = this.state.containerHeight;

      if (this.props.fitHeight) {
        return (
          <ChartComponent {...this.props} parentWidth={parentWidth} parentHeight={parentHeight} />
        )
      } else {
        return (
          <ChartComponent {...this.props} parentWidth={parentWidth} />
        )
      }
    }

    render() {
      const { containerWidth } = this.state
      const shouldRenderChart = containerWidth !== null

      return (
        <div
          ref={(el) => { this.chartContainer = el }}
          className="ResponsiveWrapper"
        >
          {shouldRenderChart && this.renderChart()}
        </div>
      )
    }
  }
)