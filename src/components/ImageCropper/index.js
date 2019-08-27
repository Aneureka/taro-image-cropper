import Taro, { Component } from '@tarojs/taro'
import { View, Text, Canvas, Button } from '@tarojs/components'
import PropTypes from 'prop-types'

import './index.scss'


export default class ImageCropper extends Component {

  constructor (props) {
    super(props)
    this.state = {
      curImageLeft: 0,
      curImageTop: 0,
      curImageWidth: 0,
      curImageHeight: 0,
      posX: 0,
      posY: 0,
      dist: 0,
      scale: 1,
    }
    this.canvasId = 'image-cropper'
    this.ctx = null
    this.windowWidth = Taro.getSystemInfoSync().windowWidth
    this.windowHeight = Taro.getSystemInfoSync().windowHeight
    this.canvasWidth = 0
    this.canvasHeight = 0
    this.canvasRatio = 0
    this.originalImageWidth = 0
    this.originalImageHeight = 0
    this.originalImageRatio = 0
    this.initialImageWidth = 0
    this.initialImageHeight = 0
    this.initialImageLeft = 0
    this.initialImageTop = 0
  }

  componentWillMount () {
    console.log(Taro.getSystemInfoSync())
  }

  componentDidMount () {
    this.initializeCanvas()
    this.initializeImageInfo()
  }

  componentWillUnmount () { }

  componentDidShow () {
    console.log(this.canvasHeight, this.canvasWidth)
  }

  componentDidHide () { }

  initializeCanvas = () => {
    this.ctx = Taro.createCanvasContext(this.canvasId, this.$scope)
    // calculate canvas size according to props [width, height]
    const originalWidth = this.props.width
    const originalHeight = this.props.height
    if (originalWidth.search('vw') >= 0 && originalHeight.search('vh') >= 0) {
      this.canvasWidth = Math.floor(parseInt(originalWidth, 10) * this.windowWidth / 100)
      this.canvasHeight = Math.floor(parseInt(originalHeight, 10) * this.windowHeight / 100)
    } else if (originalWidth.search('px') >= 0 && originalHeight.search('px') >= 0) {
      this.canvasHeight = Math.floor(parseInt(originalHeight))
      this.canvasWidth = Math.floor(parseInt(originalWidth))
    } else {
      // default
      this.canvasWidth = this.windowWidth
      this.canvasHeight = this.windowHeight
    }
    this.canvasRatio = this.canvasHeight / this.canvasWidth
  }

  initializeImageInfo = () => {
    let that = this
    Taro.getImageInfo({
      src: that.props.imageSource,
      success: (res) => {
        // convert image source to native if it's from network
        if (that.props.imageSource.search(/tmp/) == -1) {
          that.imageSource = res.path
        } else {
          that.imageSource = that.props.imageSource
        }
        that.originalImageWidth = res.width
        that.originalImageHeight = res.height
        // initialize image size and position
        this.originalImageRatio = that.originalImageHeight / that.originalImageWidth
        if (this.originalImageRatio >= that.canvasRatio) {
          that.initialImageHeight = that.canvasHeight
          that.initialImageWidth = Math.floor(that.originalImageWidth * that.canvasHeight / that.originalImageHeight)
          that.initialImageLeft = Math.floor((that.canvasWidth - that.initialImageWidth) / 2)
          that.initialImageTop = 0
        } else {
          that.initialImageWidth = that.canvasWidth
          that.initialImageHeight = Math.floor(that.originalImageHeight * that.canvasWidth / that.originalImageWidth)
          that.initialImageTop = Math.floor((that.canvasHeight - that.initialImageHeight) / 2)
          that.initialImageLeft = 0
        }
        that.setState({
          curImageWidth: that.initialImageWidth,
          curImageHeight: that.initialImageHeight,
          curImageLeft: that.initialImageLeft,
          curImageTop: that.initialImageTop
        }, () => {
          that.draw()
        })
      },
      fail: (err) => {
        console.error(err)
      }
    })
  }

  // draw image according to current canvas state
  draw = () => {
    let ctx = this.ctx
    // TODO transform canvas
    ctx.drawImage(this.imageSource, this.state.curImageLeft, this.state.curImageTop, this.state.curImageWidth, this.state.curImageHeight)
    ctx.draw()
  }

  handleTouchStart = (e) => {
    if (e.touches.length < 2) {
      // single finger
      // record position
      this.setState({
        posX: e.touches[0].x,
        posY: e.touches[0].y
      })
    } else {
      // two fingers or more, but ignore those with order more than 2
      let distX = e.touches[0].x - e.touches[1].x
      let distY = e.touches[0].y - e.touches[1].y
      let dist = Math.sqrt(distX * distX + distY * distY)
      console.log(`${this.handleTouchStart.name}: dist: ${dist}`)
      this.setState({
        dist,
      })
    }
  }

  handleTouchMove = (e) => {
    if (e.touches.length < 2) {
      // single finger
      const distX = e.touches[0].x - this.state.posX
      const distY = e.touches[0].y - this.state.posY
      this.setState((prevState) => {
        return {
          posX: e.touches[0].x,
          posY: e.touches[0].y,
          curImageLeft: prevState.curImageLeft + distX,
          curImageTop: prevState.curImageTop + distY
        }
      }, () => {
        this.draw()
      })
    } else {
      // two fingers or more, but ignore those with order more than 2
      // console.log(e.touches)
      const distX = e.touches[0].x - e.touches[1].x
      const distY = e.touches[0].y - e.touches[1].y
      const dist = Math.sqrt(distX * distX + distY * distY)
      const distDiff = dist - this.state.dist 
      const scale = this.state.scale + 0.005 * distDiff
      console.log(`${this.handleTouchMove.name}: dist: ${dist}`)
      console.log(`${this.handleTouchMove.name}: scale: ${scale}`)
      // limit scale to rational range
      if (scale <= this.props.minScale || scale >= this.props.maxScale) {
        return
      }
      this.setState({
        dist: dist,
        scale: scale,
        curImageWidth: Math.floor(scale * this.initialImageWidth),
        curImageHeight: Math.floor(scale * this.initialImageHeight),
        curImageLeft: Math.floor((this.canvasWidth - Math.floor(scale * this.initialImageWidth)) / 2),
        curImageTop: Math.floor((this.canvasHeight - Math.floor(scale * this.initialImageHeight)) / 2),
      }, () => {
        this.draw()
      })
    }
  }

  handleTouchEnd = () => {
    // restore to initial state if needed
    this.resetImageInCanvasIfNeeded()
  }

  resetImageInCanvasIfNeeded = () => {
    this.setState((prevState) => {
      // rescale if scale less than 1
      if (prevState.scale < 1) {
        return {
          curImageWidth: this.initialImageWidth,
          curImageHeight: this.initialImageHeight,
          curImageLeft: this.initialImageLeft,
          curImageTop: this.initialImageTop,
          scale: 1
        }
      } else {
        let newState = {
          curImageWidth: Math.floor(this.initialImageWidth * prevState.scale),
          curImageHeight: Math.floor(this.initialImageHeight * prevState.scale),
          scale: prevState.scale
        }
        newState.curImageLeft = prevState.curImageLeft
        newState.curImageTop = prevState.curImageTop
        
        if (prevState.curImageWidth < this.canvasWidth) {
          newState.curImageLeft = Math.floor((this.canvasWidth - prevState.curImageWidth) / 2)
        } else {
          if (prevState.curImageLeft > 0) {
            newState.curImageLeft = 0
          } else if (prevState.curImageLeft + prevState.curImageWidth < this.canvasWidth) {
            newState.curImageLeft = this.canvasWidth - prevState.curImageWidth
          }
        }

        if (prevState.curImageHeight < this.canvasHeight) {
          newState.curImageTop = Math.floor((this.canvasHeight - prevState.curImageHeight) / 2)
        } else {
          if (prevState.curImageTop > 0) {
            newState.curImageTop = 0
          } else if (prevState.curImageTop + prevState.curImageHeight < this.canvasHeight) {
            newState.curImageTop = this.canvasHeight - prevState.curImageHeight
          }
        }
        return newState
      }
    }, () => {
      this.draw()
    })
  }

  initializeCanvasSize = () => {
    
  }

  render () {
    return (
      <View className='index' style={'width: ' + this.props.width + '; height: ' + this.props.height + ';'}>
        <Canvas 
          canvasId={this.canvasId}
          disableScroll 
          className='image-cropper-canvas' 
          onTouchStart={this.handleTouchStart}
          onTouchMove={this.handleTouchMove}
          onTouchEnd={this.handleTouchEnd}
        >
        </Canvas>
      </View>
    )
  }
}
  
ImageCropper.defaultProps = {
  width: '100vw',  
  height: '100vh',
  imageSource: '',
  imageWidth: 0,
  imageHeight: 0,
  enableCuttingFrameMoveOut: false,
  enableCuttingFrameRatioChange: false,
  minScale: 0.5,
  maxScale: 3,
}

ImageCropper.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  imageSource: PropTypes.string,
  imageWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  imageHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  disableCuttingFrameMoveOut: PropTypes.bool,
  disableCuttingFrameRatioChange: PropTypes.bool,
  minScale: PropTypes.number,
  maxScale: PropTypes.number
}