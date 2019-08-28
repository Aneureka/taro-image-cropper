import Taro, { Component } from '@tarojs/taro'
import { View, Text, Canvas, Button, CoverView } from '@tarojs/components'
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
      masked: true,
      cutLeft: 0,
      cutTop: 0,
      cutWidth: 0,
      cutHeight: 0,
      moveThrottle: null,
      moveThrottleFlag: true,
    }
    this.canvasId = 'image-cropper'
    this.ctx = null
    this.systemInfo = Taro.getSystemInfoSync()
    this.windowWidth = this.systemInfo.windowWidth
    this.windowHeight = this.systemInfo.windowHeight
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
    this.initializeCuttingFrame()
    console.log(this.state)
  }

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

  initializeCuttingFrame = () => {
    this.setState({
      cutLeft: Math.floor(this.canvasWidth / 4),
      cutTop: Math.floor((this.canvasHeight - Math.floor(this.canvasWidth / 2)) / 2),
      cutWidth: Math.floor(this.canvasWidth / 2),
      cutHeight: Math.floor(this.canvasWidth / 2),
    }, () => {
      console.log('initialize')
      console.log(this.state)
    })
  }

  // draw image according to current canvas state
  draw = () => {
    let ctx = this.ctx
    ctx.save()
    ctx.drawImage(this.imageSource, this.state.curImageLeft, this.state.curImageTop, this.state.curImageWidth, this.state.curImageHeight)
    ctx.restore()
    ctx.draw()
  }


  touchImage = (e) => {
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
      console.log(`${this.touchImage.name}: dist: ${dist}`)
      this.setState({
        dist,
      })
    }
  }

  moveImage = (e) => {
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
      console.log(`${this.moveImage.name}: dist: ${dist}`)
      console.log(`${this.moveImage.name}: scale: ${scale}`)
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

  dropImage = () => {
    // restore to initial state if needed
    this.resetImageInCanvasIfNeeded()
  }


  startMoveCuttingFrame = (e) => {
    if (this.props.fixCuttingFrame) return
    if (e.touches.length >= 2) return
    console.log(e)
  }

  moveCuttingFrame = (e) => {
    console.log(e)
    if (this.props.fixCuttingFrame) return
    if (e.touches.length >= 2) return
    console.log(e)
    // set throttle (on android platform)
    if (!this.state.moveThrottleFlag) return
    this._setMoveThrottle()
    const newCutTouchX = e.touches[0].clientX
    const newCutTouchY = e.touches[0].clientY
    const targetId = e.target.id
    this._calcAndUpdateCuttingFrame(newCutTouchX, newCutTouchY, targetId)
  }

  stopMoveCuttingFrame = (e) => {
    console.log(e)
  }

  moveCuttingFrame2 = (e) => {
    // console.log(e)
    if (e.touches.length >= 2) {
      return
    }
    if (!this.state.moveThrottleFlag) {
      return
    }
    this._setMoveThrottle()
    // calculate dist
    let cutPosX = e.touches[0].clientX
    let cutPosY = e.touches[0].clientY
    const targetId = e.target.id
    if (targetId === 'border-top') {
      cutPosY = Math.max(cutPosY, 0)
      cutPosY = Math.min(cutPosY, this.state.cutTop + this.state.cutHeight - this.props.cuttingFrameMinSize)
      const newCutHeight = this.state.cutHeight + this.state.cutTop - cutPosY
      this.setState({
        cutTop: cutPosY,
        cutHeight: newCutHeight
      })
    } else if (targetId === 'border-left') {
      cutPosX = Math.max(cutPosX, 0)
      cutPosX = Math.min(cutPosX, this.state.cutLeft + this.state.cutWidth - this.props.cuttingFrameMinSize)
      const newCutWidth = this.state.cutWidth + this.state.cutLeft - cutPosX
      this.setState({
        cutLeft: cutPosX,
        cutWidth: newCutWidth
      })
    } else if (targetId === 'border-right') {
      let newCutWidth = cutPosX - this.state.cutLeft
      newCutWidth = Math.max(newCutWidth, this.props.cuttingFrameMinSize)
      newCutWidth = Math.min(newCutWidth, this.canvasWidth - this.state.cutLeft)
      this.setState({
        cutWidth: newCutWidth
      })
    } else if (targetId === 'border-bottom') {
      let newCutHeight = cutPosY - this.state.cutTop
      newCutHeight = Math.max(newCutHeight, this.props.cuttingFrameMinSize)
      newCutHeight = Math.min(newCutHeight, this.canvasHeight - this.state.cutTop)
      this.setState({
        cutHeight: newCutHeight
      })
    }
    console.log(cutPosX, cutPosY)
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

  removeMask = () => {
    this.setState({
      masked: false
    })
  }

  _setMoveThrottle = () => {
    // should throttle on android platform
    let that = this
    this.setState({
      moveThrottleFlag: false
    }, () => {
      if (that.systemInfo.platform === 'android') {
        clearTimeout(that.state.moveThrottle)
        this.setState({
          moveThrottle: setTimeout(() => {that.setState({moveThrottleFlag: true})}, 15)
        })
      } else {
        that.setState({
          moveThrottleFlag: true
        })
      }
    })
  }

  _calcAndUpdateCuttingFrame = (newCutTouchX, newCutTouchY, cornerId) => {
    let distX = 0
    let distY = 0
    switch (cornerId) {
      case 'corner-top-left' :
        // limit the touched position not to overflow
        newCutTouchX = Math.max(0, newCutTouchX)
        newCutTouchX = Math.min(this.state.cutLeft + this.state.cutWidth - this.props.cuttingFrameMinSize, newCutTouchX)
        newCutTouchY = Math.max(0, newCutTouchY)
        newCutTouchY = Math.min(this.state.cutTop + this.state.cutHeight - this.props.cuttingFrameMinSize, newCutTouchY)
        distX = newCutTouchX - this.state.cutLeft
        distY = newCutTouchY - this.state.cutTop
        if (this.props.fixCuttingFrameRatio) {
          // limit distX
          distX = Math.max(-this.state.cutTop, distX)
          distY = distX
        }
        this.setState((prevState) => {
          return {
            cutLeft: prevState.cutLeft + distX,
            cutTop: prevState.cutTop + distY,
            cutWidth: prevState.cutWidth - distX,
            cutHeight: prevState.cutHeight - distY
          }
        })
        break
      case 'corner-top-right' :
        newCutTouchX = Math.max(this.state.cutLeft + this.props.cuttingFrameMinSize, newCutTouchX)
        newCutTouchX = Math.min(this.canvasWidth, newCutTouchX)
        newCutTouchY = Math.max(0, newCutTouchY)
        newCutTouchY = Math.min(this.state.cutTop + this.state.cutHeight - this.props.cuttingFrameMinSize, newCutTouchY)
        distX = newCutTouchX - this.state.cutLeft - this.state.cutWidth
        distY = newCutTouchY - this.state.cutTop
        if (this.props.fixCuttingFrameRatio) {
          distX = Math.min(this.state.cutTop, distX)
          distY = -distX
        }
        this.setState((prevState) => {
          return {
            cutTop: prevState.cutTop + distY,
            cutWidth: prevState.cutWidth + distX,
            cutHeight: prevState.cutHeight - distY
          }
        })
        break
      case 'corner-bottom-left':
        newCutTouchX = Math.max(0, newCutTouchX)
        newCutTouchX = Math.min(this.state.cutLeft + this.state.cutWidth - this.props.cuttingFrameMinSize, newCutTouchX)
        newCutTouchY = Math.max(this.state.cutTop + this.props.cuttingFrameMinSize, newCutTouchY)
        newCutTouchY = Math.min(this.canvasHeight, newCutTouchY)
        distX = newCutTouchX - this.state.cutLeft
        distY = newCutTouchY - this.state.cutTop - this.state.cutHeight
        if (this.props.fixCuttingFrameRatio) {
          distX = Math.max(-this.canvasHeight + this.state.cutTop + this.state.cutHeight, distX)
          distY = -distX
        }
        this.setState((prevState) => {
          return {
            cutLeft: prevState.cutLeft + distX,
            cutWidth: prevState.cutWidth - distX,
            cutHeight: prevState.cutHeight + distY
          }
        })
        break
      case 'corner-bottom-right':
        newCutTouchX = Math.max(this.state.cutLeft + this.props.cuttingFrameMinSize, newCutTouchX)
        newCutTouchX = Math.min(this.canvasWidth, newCutTouchX)
        newCutTouchY = Math.max(this.state.cutTop + this.props.cuttingFrameMinSize, newCutTouchY)
        newCutTouchY = Math.min(this.canvasHeight, newCutTouchY)
        distX = newCutTouchX - this.state.cutLeft - this.state.cutWidth
        distY = newCutTouchY - this.state.cutTop - this.state.cutHeight
        if (this.props.fixCuttingFrameRatio) {
          distX = Math.min(this.canvasHeight - this.state.cutTop - this.state.cutHeight, distX)
          distY = distX
        }
        this.setState((prevState) => {
          return {
            cutWidth: prevState.cutWidth + distX,
            cutHeight: prevState.cutHeight + distY
          }
        })
      default:
        break;
    }

  }

  render () {
    return (
      <View className='index' style={'width: ' + this.props.width + '; height: ' + this.props.height + 'px; background: ' + this.props.background + ';'}>
        <View className='content'>
          <View className='mask mask-top' style={'height: ' + this.state.cutTop + 'px;'} />
          <View className='content-mid' style={'height: ' + this.state.cutHeight + 'px;'}>
            <View className='mask mask-left' style={'width: ' + this.state.cutLeft + 'px;'} />
            <View className='cutting-frame' style={'width: ' + this.state.cutWidth + 'px; height: ' + this.state.cutHeight + 'px;'}>
              <View className='corner corner-top-left' id='corner-top-left' onTouchStart={this.startMoveCuttingFrame} onTouchMove={this.moveCuttingFrame} onTouchEnd={this.stopMoveCuttingFrame} />
              <View className='corner corner-top-right' id='corner-top-right' onTouchStart={this.startMoveCuttingFrame} onTouchMove={this.moveCuttingFrame} onTouchEnd={this.stopMoveCuttingFrame} />
              <View className='corner corner-bottom-left' id='corner-bottom-left' onTouchStart={this.startMoveCuttingFrame} onTouchMove={this.moveCuttingFrame} onTouchEnd={this.stopMoveCuttingFrame} />
              <View className='corner corner-bottom-right' id='corner-bottom-right' onTouchStart={this.startMoveCuttingFrame} onTouchMove={this.moveCuttingFrame} onTouchEnd={this.stopMoveCuttingFrame} />
            </View>
            <View className='mask mask-right' />
          </View>
          <View className='mask mask-bottom' />
        </View>
        
        {/* <Canvas 
          canvasId={this.canvasId}
          disableScroll 
          className='image-cropper-canvas' 
          onTouchStart={this.touchImage}
          onTouchMove={this.moveImage}
          onTouchEnd={this.dropImage}
        >
        </Canvas> */}
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
  fixCuttingFrame: false,
  fixCuttingFrameRatio: true,
  minScale: 0.5,
  maxScale: 3,
  background: 'rgba(0, 0, 0, 0.8)',
  cuttingFrameColor: 'white',
  cuttingFrameBorderSize: 30,
  cuttingFrameBorderColor: 'white',
  cuttingFrameMinSize: 100
}

ImageCropper.propTypes = {
  width: PropTypes.string,
  height: PropTypes.string,
  imageSource: PropTypes.string,
  imageWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  imageHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  disableCuttingFrameMoveOut: PropTypes.bool,
  fixCuttingFrameRatio: PropTypes.bool,
  minScale: PropTypes.number,
  maxScale: PropTypes.number,
  background: PropTypes.string
}