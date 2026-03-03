import api from '@/plugins/axiosinterceptor'

// get은 가져오기, post은 보낼때
const auctionList = async (page) => {
  const res = await api.get(`/auction/list?page=${page}`)
  return res.data
}

const desc = async (ListId) => {
  const res = await api.get(`/json/course/detail/${ListId}`)
  console.log('detail_list', res.data)
  return res.data
}


export default { auctionList,desc }
