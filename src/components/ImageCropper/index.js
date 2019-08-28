import Taro, { Component } from '@tarojs/taro'
import { View, Text, Canvas, Button, Image } from '@tarojs/components'
import PropTypes from 'prop-types'

import './index.scss'


export default class ImageCropper extends Component {

  constructor (props) {
    super(props)
    this.state = {
      imgSrc: this.props.imageSource,
      imageLeft: 0,
      imageTop: 0,
      imageWidth: 0,
      imageHeight: 0,
      cutLeft: 0,
      cutTop: 0,
      cutWidth: 0,
      cutHeight: 0,
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
    this.posX = 0
    this.posY = 0
    this.dist = 0
    this.scale = 1
  }

  componentDidMount () {
    this.initializeCanvas()
    this.initializeImageInfo()
    this.initializeCuttingFrame()
  }

  initializeImageInfo = () => {
    Taro.getImageInfo({
      src: this.props.imageSource,
      success: (res) => {
        // convert image source to native if it's from network
        if (this.props.imageSource.search(/tmp/) == -1) {
          this.setState({
            imgSrc: res.path
          })
        } else {
          this.setState({
            imgSrc: this.props.imageSource
          })
        }
        this.originalImageWidth = res.width
        this.originalImageHeight = res.height
        this.originalImageRatio = this.originalImageHeight / this.originalImageWidth
        // initialize image size and position
        if (this.originalImageRatio >= this.canvasRatio) {
          this.initialImageHeight = this.canvasHeight
          this.initialImageWidth = Math.floor(this.originalImageWidth * this.canvasHeight / this.originalImageHeight)
          this.initialImageLeft = Math.floor((this.canvasWidth - this.initialImageWidth) / 2)
          this.initialImageTop = 0
        } else {
          this.initialImageWidth = this.canvasWidth
          this.initialImageHeight = Math.floor(this.originalImageHeight * this.canvasWidth / this.originalImageWidth)
          this.initialImageTop = Math.floor((this.canvasHeight - this.initialImageHeight) / 2)
          this.initialImageLeft = 0
        }
        this.setState({
          imageWidth: this.initialImageWidth,
          imageHeight: this.initialImageHeight,
          imageLeft: this.initialImageLeft,
          imageTop: this.initialImageTop
        }, () => {
          console.log(this.state)
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
    })
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

  moveCuttingFrame = (e) => {
    if (this.props.fixCuttingFrame) return
    if (e.touches.length >= 2) return
    const newCutTouchX = e.touches[0].clientX
    const newCutTouchY = e.touches[0].clientY
    const targetId = e.target.id
    this._calcAndUpdateCuttingFrame(newCutTouchX, newCutTouchY, targetId)
  }

  startMoveImage = (e) => {
    if (e.touches.length < 2) {
      this.posX = e.touches[0].clientX
      this.posY = e.touches[0].clientY
    } else {
      const distX = e.touches[0].clientX - e.touches[1].clientX
      const distY = e.touches[0].clientY - e.touches[1].clientY
      this.dist = Math.sqrt(distX * distX + distY * distY)
    }
  }

  moveImage = (e) => {
    if (e.touches.length < 2) {
      const distX = e.touches[0].clientX - this.posX
      const distY = e.touches[0].clientY - this.posY
      this.posX = e.touches[0].clientX
      this.posY = e.touches[0].clientY
      this.setState((prevState) => {
        return {
          imageLeft: prevState.imageLeft + distX,
          imageTop: prevState.imageTop + distY
        }
      })
    } else {
      const distX = e.touches[0].clientX - e.touches[1].clientX
      const distY = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(distX * distX + distY * distY)
      const distDiff = dist - this.dist
      const scale = this.scale + 0.005 * distDiff
      if (scale <= this.props.minScale || scale >= this.props.maxScale) {
        return
      }
      this.dist = dist
      this.scale = scale
      this.setState({
        imageWidth: Math.floor(scale * this.initialImageWidth),
        imageHeight: Math.floor(scale * this.initialImageHeight),
        imageLeft: Math.floor((this.canvasWidth - Math.floor(scale * this.initialImageWidth)) / 2),
        imageTop: Math.floor((this.canvasHeight - Math.floor(scale * this.initialImageHeight)) / 2),
      })
    }
  }

  stopMoveImage = () => {
    // reset position or size of the image if needed
    console.log('stop!')
    this._resetImageInCanvasIfNeeded()
  }

  // draw image according to current canvas state
  draw = () => {
    let ctx = this.ctx
    ctx.save()
    ctx.drawImage(this.imageSource, this.state.imageLeft, this.state.imageTop, this.state.imageWidth, this.state.imageHeight)
    ctx.restore()
    ctx.draw()
  }

  _resetImageInCanvasIfNeeded = () => {
    this.setState((prevState) => {
      // rescale if scale less than 1
      if (this.scale < 1) {
        this.scale = 1
        return {
          imageWidth: this.initialImageWidth,
          imageHeight: this.initialImageHeight,
          imageLeft: this.initialImageLeft,
          imageTop: this.initialImageTop,
        }
      } else {
        let newState = {
          imageLeft: prevState.imageLeft,
          imageTop: prevState.imageTop
        }
        if (prevState.imageWidth < this.canvasWidth) {
          newState.imageLeft = Math.floor((this.canvasWidth - prevState.imageWidth) / 2)
        } else {
          if (prevState.imageLeft > 0) {
            newState.imageLeft = 0
          } else if (prevState.imageLeft + prevState.imageWidth < this.canvasWidth) {
            newState.imageLeft = this.canvasWidth - prevState.imageWidth
          }
        }

        if (prevState.imageHeight < this.canvasHeight) {
          newState.imageTop = Math.floor((this.canvasHeight - prevState.imageHeight) / 2)
        } else {
          if (prevState.imageTop > 0) {
            newState.imageTop = 0
          } else if (prevState.imageTop + prevState.imageHeight < this.canvasHeight) {
            newState.imageTop = this.canvasHeight - prevState.imageHeight
          }
        }
        return newState
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
        break
      default:
        break
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
              <View className='corner corner-top-left' id='corner-top-left' onTouchMove={this.moveCuttingFrame} />
              <View className='corner corner-top-right' id='corner-top-right' onTouchMove={this.moveCuttingFrame} />
              <View className='corner corner-bottom-left' id='corner-bottom-left' onTouchMove={this.moveCuttingFrame} />
              <View className='corner corner-bottom-right' id='corner-bottom-right' onTouchMove={this.moveCuttingFrame} />
            </View>
            <View className='mask mask-right' />
          </View>
          <View className='mask mask-bottom' />
        </View>
        <Image 
          className='img' 
          src={this.state.imgSrc}
          style={'left: ' + this.state.imageLeft + 'px; top: ' + this.state.imageTop + 'px; width: ' + this.imageWidth + 'px; height: ' + this.state.imageHeight + 'px;'}
          onTouchStart={this.startMoveImage}
          onTouchMove={this.moveImage}
          onTouchEnd={this.stopMoveImage}
        />
        
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
  maxScale: 2,
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