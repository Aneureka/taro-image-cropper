import Taro, { Component } from '@tarojs/taro'
import { View, Text, Canvas, Button, Image } from '@tarojs/components'
import PropTypes from 'prop-types'

import './index.scss'
import throttle from '../../utils'

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
    this.applyThrottle = this.props.applyThrottleOnAndroid && this.systemInfo.platform === 'android'
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
    this.scale = 1
  }

  componentDidMount () {
    this.initializeCanvas()
    this.initializeCuttingFrame()
    this.initializeImageInfo()
    if (this.applyThrottle) {
      this.moveCuttingFrame = throttle(this.moveCuttingFrame)
      this.moveImage = throttle(this.moveImage)
    }
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
        this.originalImageRatio = res.height / res.width
        if (this.originalImageRatio >= 1) {
          this.initialImageWidth = this.initialCuttingFrameWidth
          this.initialImageHeight = Math.floor(this.initialCuttingFrameWidth * this.originalImageRatio)
          this.initialImageLeft = this.initialCuttingFrameLeft
          this.initialImageTop = Math.floor(this.initialCuttingFrameTop + this.initialCuttingFrameHeight / 2 - this.initialImageHeight / 2)
        } else {
          this.initialImageWidth = Math.floor(this.initialCuttingFrameHeight / this.originalImageRatio)
          this.initialImageHeight = this.initialCuttingFrameHeight
          this.initialImageTop = this.initialCuttingFrameTop
          this.initialImageLeft = Math.floor(this.initialCuttingFrameLeft + this.initialCuttingFrameWidth / 2 - this.initialImageWidth / 2)
        }
        this.setState({
          imageWidth: this.initialImageWidth,
          imageHeight: this.initialImageHeight,
          imageLeft: this.initialImageLeft,
          imageTop: this.initialImageTop
        })
      },
      fail: (err) => {
        console.error(err)
      }
    })
  }

  initializeCuttingFrame = () => {
    this.initialCuttingFrameWidth = Math.floor(this.canvasWidth * 2 / 3)
    this.initialCuttingFrameHeight = this.initialCuttingFrameWidth
    this.initialCuttingFrameLeft = Math.floor((this.canvasWidth - this.initialCuttingFrameWidth) / 2)
    this.initialCuttingFrameTop = Math.floor((this.canvasHeight - this.initialCuttingFrameHeight) / 2)
    this.setState({
      cutLeft: this.initialCuttingFrameLeft,
      cutTop: this.initialCuttingFrameTop,
      cutWidth: this.initialCuttingFrameWidth,
      cutHeight: this.initialCuttingFrameHeight
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

  startMoveCuttingFrame = (e) => {
    if (this.props.fixCuttingFrame) return
    if (e.touches.length >= 2) return
    const newCutTouchX = e.touches[0].clientX
    const newCutTouchY = e.touches[0].clientY
    // cache
    this.startCutX = newCutTouchX
    this.startCutY = newCutTouchY
    this.startCutLeft = this.state.cutLeft
    this.startCutTop = this.state.cutTop
    this.startCutWidth = this.state.cutWidth
    this.startCutHeight = this.state.cutHeight
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
      this.startImageX = e.touches[0].clientX
      this.startImageY = e.touches[0].clientY
    } else {
      const distX = e.touches[0].clientX - e.touches[1].clientX
      const distY = e.touches[0].clientY - e.touches[1].clientY
      this.startImageDistance = Math.sqrt(distX * distX + distY * distY)
      this.startImageScale = this.scale
    }
    this.startImageLeft = this.state.imageLeft
    this.startImageTop = this.state.imageTop
    this.startImageWidth = this.state.imageWidth
    this.startImageHeight = this.state.imageHeight
  }

  moveImage = (e) => {
    if (e.touches.length < 2) {
      const distX = e.touches[0].clientX - this.startImageX
      const distY = e.touches[0].clientY - this.startImageY
      this.setState({
        imageLeft: this.startImageLeft + distX,
        imageTop: this.startImageTop + distY
      })
    } else {
      const distX = e.touches[0].clientX - e.touches[1].clientX
      const distY = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(distX * distX + distY * distY)
      const distDiff = dist - this.startImageDistance
      const scale = this.startImageScale + 0.005 * distDiff
      if (scale <= this.props.minScale || scale >= this.props.maxScale) {
        return
      }
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
    this._rectifyImage()
  }

  // draw image according to current canvas state
  draw = () => {
    let ctx = this.ctx
    ctx.save()
    ctx.drawImage(this.imageSource, this.state.imageLeft, this.state.imageTop, this.state.imageWidth, this.state.imageHeight)
    ctx.restore()
    ctx.draw()
  }

  _rectifyImage = () => {
    let newImageLeft = this.state.imageLeft
    let newImageTop = this.state.imageTop
    let newImageWidth = this.state.imageWidth
    let newImageHeight = this.state.imageHeight
    const curCutLeft = this.state.cutLeft
    const curCutTop = this.state.cutTop
    const curCutWidth = this.state.cutWidth
    const curCutHeight = this.state.cutHeight
    // update image size
    let newTempScale = Math.max(curCutWidth / newImageWidth, curCutHeight / newImageHeight, 1)
    newImageWidth = Math.floor(newImageWidth * newTempScale)
    newImageHeight = Math.floor(newImageHeight * newTempScale)
    this.scale = newImageWidth / this.initialImageWidth
    // update image position
    // left
    if (newImageLeft > curCutLeft) {
      newImageLeft = curCutLeft
    }
    // top
    if (newImageTop > curCutTop) {
      newImageTop = curCutTop
    }
    // right
    if (newImageLeft + newImageWidth < curCutLeft + curCutWidth) {
      newImageLeft = curCutLeft + curCutWidth - newImageWidth
    }
    // 
    if (newImageTop + newImageHeight < curCutTop + curCutHeight) {
      newImageTop = curCutTop + curCutHeight - newImageHeight
    }
    this.setState({
      imageLeft: newImageLeft,
      imageTop: newImageTop,
      imageWidth: newImageWidth,
      imageHeight: newImageHeight
    })
  }

  _calcAndUpdateCuttingFrame = (newCutTouchX, newCutTouchY, cornerId) => {
    let distX = 0
    let distY = 0
    let newCutLeft = this.startCutLeft
    let newCutTop = this.startCutTop
    let newCutWidth = this.startCutWidth
    let newCutHeight = this.startCutHeight
    switch (cornerId) {
      case 'corner-top-left':
        // limit the touched position not to overflow
        newCutTouchX = Math.max(this.startCutX - this.startCutLeft, newCutTouchX)
        newCutTouchX = Math.min(this.startCutLeft + this.startCutWidth - this.props.cuttingFrameMinSize, newCutTouchX)
        newCutTouchY = Math.max(this.startCutY - this.startCutTop, newCutTouchY)
        newCutTouchY = Math.min(this.startCutTop + this.startCutHeight - this.props.cuttingFrameMinSize, newCutTouchY)
        distX = newCutTouchX - this.startCutX
        distY = newCutTouchY - this.startCutY
        if (this.props.fixCuttingFrameRatio) {
          distX = Math.max(-this.startCutTop, distX)
          distY = distX
        }
        newCutLeft += distX
        newCutTop += distY
        newCutWidth -= distX
        newCutHeight -= distY
        this.setState({
          cutLeft: newCutLeft,
          cutTop: newCutTop,
          cutWidth: newCutWidth,
          cutHeight: newCutHeight
        })
        break
      case 'corner-top-right':
        newCutTouchX = Math.max(this.startCutLeft + this.props.cuttingFrameMinSize, newCutTouchX)
        newCutTouchX = Math.min(this.canvasWidth + this.startCutX - this.startCutLeft - this.startCutWidth, newCutTouchX)
        newCutTouchY = Math.max(this.startCutY - this.startCutTop, newCutTouchY)
        newCutTouchY = Math.min(this.startCutTop + this.startCutHeight - this.props.cuttingFrameMinSize, newCutTouchY)
        distX = newCutTouchX - this.startCutX
        distY = newCutTouchY - this.startCutY
        if (this.props.fixCuttingFrameRatio) {
          distX = Math.min(this.startCutTop, distX)
          distY = -distX
        }
        newCutTop += distY
        newCutWidth += distX
        newCutHeight -= distY
        this.setState({
          cutTop: newCutTop,
          cutWidth: newCutWidth,
          cutHeight: newCutHeight,
        })
        break
      case 'corner-bottom-left':
        newCutTouchX = Math.max(this.startCutX - this.startCutLeft, newCutTouchX)
        newCutTouchX = Math.min(this.startCutLeft + this.startCutWidth - this.props.cuttingFrameMinSize, newCutTouchX)
        newCutTouchY = Math.max(this.startCutTop + this.props.cuttingFrameMinSize, newCutTouchY)
        newCutTouchY = Math.min(this.canvasHeight + this.startCutY - this.startCutTop - this.startCutHeight, newCutTouchY)
        distX = newCutTouchX - this.startCutX
        distY = newCutTouchY - this.startCutY
        if (this.props.fixCuttingFrameRatio) {
          distX = Math.max(-this.canvasHeight + this.startCutTop + this.startCutHeight, distX)
          distY = -distX
        }
        newCutLeft += distX
        newCutWidth -= distX
        newCutHeight += distY
        this.setState({
          cutLeft: newCutLeft,
          cutWidth: newCutWidth,
          cutHeight: newCutHeight,
        })
        break
      case 'corner-bottom-right':
        newCutTouchX = Math.max(this.startCutLeft + this.props.cuttingFrameMinSize, newCutTouchX)
        newCutTouchX = Math.min(this.canvasWidth + this.startCutX - this.startCutLeft - this.startCutWidth, newCutTouchX)
        newCutTouchY = Math.max(this.startCutTop + this.props.cuttingFrameMinSize, newCutTouchY)
        newCutTouchY = Math.min(this.canvasHeight + this.startCutY - this.startCutTop - this.startCutHeight, newCutTouchY)
        distX = newCutTouchX - this.startCutX
        distY = newCutTouchY - this.startCutY
        if (this.props.fixCuttingFrameRatio) {
          distX = Math.min(this.canvasHeight - this.startCutTop - this.startCutHeight, distX)
          distY = distX
        }
        newCutWidth += distX
        newCutHeight += distY
        this.setState({
          cutWidth: newCutWidth,
          cutHeight: newCutHeight
        })
        break
      default:
        break
    }
    this._adjustImageWhileMovingCuttingFrame(newCutLeft, newCutTop, newCutWidth, newCutHeight, cornerId)
  }

  _adjustImageWhileMovingCuttingFrame = (newCutLeft, newCutTop, newCutWidth, newCutHeight, cornerId) => {
    console.log(cornerId)
    let newImageLeft = this.state.imageLeft
    let newImageTop = this.state.imageTop
    let newImageWidth = this.state.imageWidth
    let newImageHeight = this.state.imageHeight
    // update image size
    let newTempScale = Math.max(newCutWidth / newImageWidth, newCutHeight / newImageHeight, 1)
    newImageWidth = Math.floor(newImageWidth * newTempScale)
    newImageHeight = Math.floor(newImageHeight * newTempScale)
    this.scale = newImageWidth / this.initialImageWidth
    // update image position
    switch(cornerId) {
      case 'corner-top-left':
        if (newImageLeft > newCutLeft) {
          newImageLeft = newCutLeft
        }
        if (newImageTop > newCutTop) {
          newImageTop = newCutTop
        }
        break
      case 'corner-top-right':
        if (newImageLeft < newCutLeft + newCutWidth - newImageWidth) {
          newImageLeft = newCutLeft + newCutWidth - newImageWidth
        }
        if (newImageTop > newCutTop) {
          newImageTop = newCutTop
        }
        break
      case 'corner-bottom-left':
        if (newImageLeft > newCutLeft) {
          newImageLeft = newCutLeft
        }
        if (newImageTop < newCutTop + newCutHeight - newImageHeight) {
          newImageTop = newCutTop + newCutHeight - newImageHeight
        }
        break
      case 'corner-bottom-right':
        if (newImageLeft < newCutLeft + newCutWidth - newImageWidth) {
          newImageLeft = newCutLeft + newCutWidth - newImageWidth
        }
        if (newImageTop < newCutTop + newCutHeight - newImageHeight) {
          newImageTop = newCutTop + newCutHeight - newImageHeight
        }
        break
      default:
        break
    }
    this.setState({
      imageLeft: newImageLeft,
      imageTop: newImageTop,
      imageWidth: newImageWidth,
      imageHeight: newImageHeight
    })
  }

  render () {
    return (
      <View className='index' style={'width: ' + this.props.width + '; height: ' + this.props.height + 'px; background: ' + this.props.background + ';'}>
        <View className='content'>
          <View className='mask mask-top' style={'height: ' + this.state.cutTop + 'px;'} />
          <View className='content-mid' style={'height: ' + this.state.cutHeight + 'px;'}>
            <View className='mask mask-left' style={'width: ' + this.state.cutLeft + 'px;'} />
            <View className='cutting-frame' style={'width: ' + this.state.cutWidth + 'px; height: ' + this.state.cutHeight + 'px;'}>
              <View className='corner corner-top-left' id='corner-top-left' onTouchStart={this.startMoveCuttingFrame} onTouchMove={this.moveCuttingFrame} />
              <View className='corner corner-top-right' id='corner-top-right' onTouchStart={this.startMoveCuttingFrame} onTouchMove={this.moveCuttingFrame} />
              <View className='corner corner-bottom-left' id='corner-bottom-left' onTouchStart={this.startMoveCuttingFrame} onTouchMove={this.moveCuttingFrame} />
              <View className='corner corner-bottom-right' id='corner-bottom-right' onTouchStart={this.startMoveCuttingFrame} onTouchMove={this.moveCuttingFrame} />
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
  cuttingFrameMinSize: 100,
  applyThrottleOnAndroid: true
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