import Taro, { Component } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import './index.scss'

import ImageCropper from '../../components/ImageCropper'

export default class Crop extends Component {

  config = {
    navigationBarTitleText: '裁剪图片',
  }

  constructor (props) {
    super(props)
    this.state = {
      imgSrc: this.$router.params.imgSrc || '',
    }
  }

  handleReceiveImage = (imgSrc, imgWidth, imgHeight) => {
    Taro.navigateTo({
      url: `/pages/index/index?imgSrc=${imgSrc}&imgWidth=${imgWidth}&imgHeight=${imgHeight}`
    })
  }

  render () {
    return (
      <View className='index'>
        {/* <ImageCropper imageSource='https://tokindle.top/s2a/results/acaa73f3-9513-4b0c-923d-074580dda687.jpg' enableCuttingFrameMoveOut enableCuttingFrameRatioChange /> */}
        <ImageCropper className='cropper' imageSource={this.state.imgSrc} onGetCroppedImage={this.handleReceiveImage} fixCuttingFrameRatio={false} />
      </View>
    )
  }
}
