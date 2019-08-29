import Taro, { Component } from '@tarojs/taro'
import { View, Image, Button } from '@tarojs/components'
import './index.scss'

export default class Index extends Component {

  config = {
    navigationBarTitleText: 'Taro 图片裁剪工具',
  }

  constructor (props) {
    super(props)
    this.state = {
      imageSource: '',
    }
  }

  componentDidMount () {
    const params = this.$router.params || {}
    this.setState({
      imageSource: params.imgSrc,
    })
  }

  componentWillUnmount () {
    this.setState({
      imageSource: ''
    })
  }

  uploadImage = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: 'original',
      success: (res) => {
        const imgSrc = res.tempFilePaths[0]
        Taro.navigateTo({
          url: `/pages/crop/index?imgSrc=${imgSrc}`
        })
      }
    })
  }

  render () {
    return (
      <View className='index'>
        <Button className='button' onClick={this.uploadImage}>上传图片</Button>
        <Image className='img' src={this.state.imageSource} mode='widthFix' />
      </View>
    )
  }
}
