import Taro, { Component } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import './index.scss'

import ImageCropper from '../../components/ImageCropper'

export default class Index extends Component {

  config = {
    navigationBarTitleText: 'Taro 图片裁剪工具',
  }

  componentWillMount () { }

  componentDidMount () { }

  componentWillUnmount () { }

  componentDidShow () { }

  componentDidHide () { }

  render () {
    return (
      <View className='index'>
        {/* <ImageCropper imageSource='https://tokindle.top/s2a/results/acaa73f3-9513-4b0c-923d-074580dda687.jpg' enableCuttingFrameMoveOut enableCuttingFrameRatioChange /> */}
        <ImageCropper imageSource='https://tokindle.top/s2a/results/test.jpg' enableCuttingFrameMoveOut enableCuttingFrameRatioChange />
      </View>
    )
  }
}
