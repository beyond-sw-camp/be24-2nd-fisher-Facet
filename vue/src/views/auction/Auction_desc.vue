<script setup>
import { onMounted, reactive, ref, onUnmounted, watch } from 'vue'
import api from '@/api/auction'
import { useRoute } from 'vue-router'

const route = useRoute()
const auctionDesc_list = reactive([])
const auctionId = ref(null)
const auctionDesc = ref(null)
const startPrice = ref()
const inputPrice = ref('')
const currentPrice = ref(startPrice.value)
let countdown = ref('')
let isDone = ref(false)

// list.json 파일 불러오기
const getlist = async () => {
  const res = await api.auctionList()
  console.log(res.code)

  if (res.code == 2000) {
    console.log('list', res.result)
    auctionDesc_list.push(...res.result)
  } else {
    alert('상품 list.json 파일을 불러오지 못함')
  }
}


// desc.json 파일 불러오기 
const getDesc = async () => {
  console.log(route.params.idx)
  auctionId.value = Number(route.params.idx)

  const res = await api.desc(auctionId.value)

  if (res.code == 2000) {
    console.log('desc', res.result)

    auctionDesc.value = res.result
    startPrice.value = auctionDesc.value.auction_info.start_price
    currentPrice.value = startPrice.value
  } else {
    alert('해당 상품에 대한 desc.json 파일을 불러오지 못함')
  }
}



// 3. 카운트다운 로직
const startCountdown = () => {
  let hours = 0,
    minutes = 0,
    seconds = 20

  setInterval(() => {
    seconds--
    if (seconds < 0) {
      seconds = 59
      minutes--
      if (minutes < 0) {
        minutes = 59
        hours--
      }
    }
    if (hours < 0) return
    const h = hours.toString().padStart(2, '0')
    const m = minutes.toString().padStart(2, '0')
    const s = seconds.toString().padStart(2, '0')
    if (h == 0 && m == 0 && s == 0) {
      isDone.value = true;
    }
    countdown.value = `${h}:${m}:${s}`
  }, 1000)
}

// 시작하자마자 카운트다운 시작
onMounted(() => {
  startCountdown()
  // loadInitialPrice()
})

// 웹소켓
let socket = null
const messages = reactive([])
const message = ref('')
onMounted(() => {
  const wsUri = 'ws://127.0.0.1:8080/ws/chat'
  socket = new WebSocket(wsUri)

  socket.addEventListener('open', () => {
    console.log('CONNECTED')
  })

  socket.addEventListener('message', (e) => {
    const data = JSON.parse(e.data)
    console.log('받은 데이터:', data.payload)
    currentPrice.value = data.payload
  })
  socket.addEventListener('close', (e) => {
    console.log('CLOSED')
  })
})

const send = () => {


  if (currentPrice.value < Number(inputPrice.value)) {
    currentPrice.value = Number(inputPrice.value)
    socket.send(inputPrice.value)
  } else {
    alert("현재 입찰가보다 높은 금액을 입력하세요.")
  }
}

const currentTab = ref('Detail')
onMounted(() => {
  if (socket){ socket.close()}
  getlist()
  getDesc()
})


// URL의 파라미터(num)가 바뀔 때마다 getDesc를 다시 실행합니다.
watch(
  () => route.params.num,
  () => {
    getDesc()
  },
)

</script>

<template>
  <!-- 경매가 종료되었을 때 화면 -->
  <div :class="!isDone ? 'block' : 'hidden'" v-if="auctionDesc != null">
    <main class="max-w-7xl mx-auto py-12 px-6 lg:px-10 pb-60">
      <nav class="text-[10px] text-gray-400 mb-8 uppercase tracking-[0.2em]">
        Home / Auction / {{ auctionDesc.category }} / <span class="text-gray-600">{{ auctionDesc.name }}</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div class="space-y-6">
          <div class="bg-gray-50 rounded-sm overflow-hidden border border-gray-100 group">
            <img :src="auctionDesc.img" alt="Main Product"
              class="w-full aspect-[4/4.5] object-cover group-hover:scale-[1.02] transition duration-700" />
          </div>
          <div class="grid grid-cols-4 gap-4">
            <div class="border border-accent p-1 bg-white" v-for="item in auctionDesc.img_detail">
              <RouterLink to="/auction/Main_auction">
                <img :src="item"
                  class="w-full aspect-square grayscale object-cover hover:grayscale-0 transition cursor-pointer" />
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="flex flex-col">
          <div class="mb-4">
            <span
              class="inline-block px-3 py-1 bg-[#F5F2F0] accent-text text-[10px] font-bold rounded-full mb-3 tracking-widest uppercase">Live
              Auction</span>
            <h1 class="text-4xl font-light tracking-tight mb-3 text-gray-900">
              {{ auctionDesc.name }}
            </h1>
            <p class="text-gray-500 text-sm leading-relaxed font-light">
              {{ auctionDesc.history }}
            </p>
          </div>

          <div class="bg-white p-8 border border-gray-100 rounded-sm mb-8 space-y-6 shadow-sm">
            <div class="flex justify-between items-end border-b border-gray-50 pb-6">
              <div>
                <p class="text-gray-400 text-[10px] uppercase tracking-[0.2em] mb-2 font-medium">
                  현재 입찰가
                </p>
                <p id="currentPrice" class="text-3xl font-bold accent-text">
                  ₩ {{ Number(currentPrice).toLocaleString() }}
                </p>
              </div>
              <div class="text-right">
                <p class="text-gray-400 text-[10px] uppercase tracking-[0.2em] mb-2 font-medium">
                  남은 시간
                </p>
                <p class="text-xl font-mono text-gray-800 tracking-wider" id="countdown">
                  {{ countdown }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-y-4 gap-x-8 text-sm pt-2">
              <div class="flex justify-between border-b border-gray-50 pb-2">
                <span class="text-gray-400 font-light">시작가</span>
                <span class="text-gray-700 font-medium">₩ {{
                  Number(startPrice).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between border-b border-gray-50 pb-2">
                <span class="text-gray-400 font-light">입찰 단위</span>
                <span class="text-gray-700 font-medium">
                  ₩ {{ Number(auctionDesc.auction_info.bid_unit).toLocaleString() }}</span>
              </div>
              <div class="flex justify-between border-b border-gray-50 pb-2">
                <span class="text-gray-400 font-light">총 입찰수</span>
                <span id="bidCount" class="text-gray-700 font-medium">
                  {{ Number(auctionDesc.auction_info.bid_unit).toLocaleString() }}회</span>
              </div>
              <div class="flex justify-between border-b border-gray-50 pb-2">
                <span class="text-gray-400 font-light">종료 예정</span>
                <span class="text-gray-700 font-medium">{{ auctionDesc.auction_info.end_date }}</span>
              </div>
            </div>

            <div class="pt-6">
              <div class="flex items-center space-x-2 mb-4">
                <input v-model="inputPrice" type="number" placeholder="입찰 금액을 입력하세요" step="50000" id="message"
                  class="flex-1 bg-white border border-gray-200 px-4 py-3 text-gray-800 focus:outline-none focus:border-[#A39382] transition-all placeholder:text-gray-300" />
                <span class="text-gray-400 text-xs font-bold tracking-widest">KRW</span>
              </div>
              <button @click="send" class="w-full py-4 bid-button font-bold text-xs tracking-[0.3em] uppercase"
                id="send">
                Place a Bid
              </button>
            </div>
          </div>

          <div class="flex border-b border-gray-100 mb-6">
            <button v-for="tabBtn in ['Detail', 'History', 'Shipping']" :key="tabBtn" @click="currentTab = tabBtn"
              class="px-6 py-3 text-[11px] font-bold tab-active uppercase tracking-[0.2em]">
              {{ tabBtn }}
            </button>

          </div>

          <div v-if="currentTab === 'Detail'" class="text-sm text-gray-500 leading-relaxed space-y-3 font-light">
            <p class="flex items-center">
              <span class="w-1.5 h-1.5 accent-bg rounded-full mr-3"></span>
              • 원산지: {{ auctionDesc.detail.origin }}
            </p>
            <p class="flex items-center">
              <span class="w-1.5 h-1.5 accent-bg rounded-full mr-3"></span>
              • 소재: {{ auctionDesc.detail.material }}
            </p>
            <p class="flex items-center">
              <span class="w-1.5 h-1.5 accent-bg rounded-full mr-3"></span>
              • 사이즈: {{ auctionDesc.detail.size }}
            </p>
          </div>
          <div v-if="currentTab === 'History'" class="text-sm text-gray-500 leading-relaxed space-y-3 font-light">
            <p class="flex items-center">
              <span class="w-1.5 h-1.5 accent-bg rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
              • 상품 설명: {{ auctionDesc.history }}
            </p>
          </div>
          <div v-if="currentTab === 'Shipping'" class="text-sm text-gray-500 leading-relaxed font-light">
            <p class="flex items-center">
              <span class="w-1.5 h-1.5 accent-bg rounded-full mr-3"></span>
              • 배송방법: {{ auctionDesc.shipping.method }}
            </p>
            <p class="flex items-center">
              <span class="w-1.5 h-1.5 accent-bg rounded-full mr-3"></span>
              • 배송비: {{ Number(auctionDesc.shipping.fee).toLocaleString() }} KRW
            </p>
            <p class="flex items-center">
              <span class="w-1.5 h-1.5 accent-bg rounded-full mr-3"></span>
              • 예상 소요 시간: {{ auctionDesc.shipping.estimated_time }}
            </p>
          </div>
        </div>
      </div>

      <section class="mt-32">
        <h2 class="text-xl font-light mb-12 tracking-[0.4em] text-center uppercase text-gray-800">
          Related Artifacts
        </h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div class="group cursor-pointer" v-for="item in auctionDesc_list.slice(0, 4)">
            <RouterLink :to="`/auction/auction_desc/${item.idx}`">
              <div class="aspect-square bg-gray-50 mb-4 overflow-hidden border border-gray-100 relative">
                <img :src="item.img" alt="Related"
                  class="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-110 transition duration-700" />
                <div
                  class="absolute top-0 right-0 accent-bg px-3 py-1 text-[9px] text-white font-bold tracking-widest uppercase">
                  Upcoming
                </div>
              </div>
              <h3
                class="text-[10px] uppercase tracking-widest text-gray-400 mb-1 group-hover:text-black transition-colors">
                {{ item.name }}
              </h3>
              <p class="text-sm font-bold text-gray-800">₩ {{ item.price.toLocaleString() }}</p>
            </RouterLink>
          </div>
        </div>
      </section>
    </main>
  </div>
  <!-- 경매가 종료되었을 때 화면 -->
  <div :class="isDone ? 'block' : 'hidden'">
    <div id="auctionStatus" class="bg-[#2B2B2B] text-white border-b border-black">
      <div class="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p class="text-sm font-light">
            🔒 <span class="font-semibold">경매 종료</span> · 입찰이 마감된 상품입니다
          </p>
        </div>
        <div class="text-sm font-medium accent-text">Final Price ₩ 4,250,000</div>
      </div>
    </div>
    <main class="max-w-7xl mx-auto py-16 px-6 lg:px-10 pb-40">
      <nav class="text-[10px] text-gray-400 mb-8 uppercase tracking-[0.2em]">
        Home / Auction / Ring / <span class="text-gray-600">Midnight Sapphire Ring</span>
      </nav>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <!-- Product Image (종료 오버레이) -->
        <div class="space-y-6">
          <div class="relative bg-gray-50 border border-gray-100 overflow-hidden">
            <img src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=1200&q=80"
              class="w-full object-cover grayscale" alt="product" />

            <div class="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-center">
              <p class="luxury-font text-3xl tracking-[0.35em] text-white mb-3">AUCTION CLOSED</p>
              <p class="text-sm text-gray-300">This auction has ended</p>
            </div>
          </div>
        </div>

        <!-- Right -->
        <div class="flex flex-col">
          <span
            class="inline-block px-3 py-1 bg-gray-200 text-gray-600 text-[10px] font-bold rounded-full mb-4 tracking-widest uppercase">
            Auction Closed
          </span>

          <h1 class="text-4xl font-light mb-4">Midnight Sapphire Emerald Ring</h1>

          <p class="text-gray-500 text-sm leading-relaxed mb-10">
            깊은 바다의 색을 닮은 사파이어와 정교한 에메랄드 컷이 조화를 이루는 단 하나의 작품입니다.
          </p>

          <!-- 종료 상태 카드 -->
          <div class="border border-gray-200 bg-[#FAF9F8] p-8 space-y-4">
            <p class="text-[10px] uppercase tracking-[0.25em] text-gray-400 font-bold">
              Final Result
            </p>

            <div class="flex justify-between items-end">
              <div>
                <p class="text-3xl font-bold accent-text">₩ 4,250,000</p>
                <p class="text-sm text-gray-500 mt-1">최종 낙찰가</p>
              </div>
              <div class="text-right text-sm text-gray-600">
                <p>총 입찰수 28회</p>
                <p>종료일 01.05 18:00</p>
              </div>
            </div>

            <div class="mt-6 border-t border-gray-200 pt-6 text-sm text-gray-600 leading-relaxed">
              이 경매는 종료되었습니다.<br />
              낙찰자는 마이페이지에서 주문 및 배송 상태를 확인할 수 있습니다.
            </div>

            <a href="./orders.html"
              class="inline-block mt-6 px-6 py-4 text-[11px] font-bold uppercase tracking-[0.3em] border border-gray-300 hover:border-[#A39382] hover:text-[#A39382] transition">
              주문 / 배송 확인
            </a>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Cormorant+Garamond:ital,wght@0,300;0,500;1,300&family=Noto+Sans+KR:wght@100;300;400;500;700&display=swap');

body {
  font-family: 'Noto Sans KR', sans-serif;
  background-color: #ffffff;
  color: #1a1a1a;
  margin: 0;
  word-break: keep-all;
}

.font-serif-luxury {
  font-family: 'Cormorant Garamond', serif;
}

.luxury-font {
  font-family: 'Cinzel', serif;
}

:root {
  --accent-color: #a39382;
  --accent-hover: #8e7f70;
  --bg-light: #ffffff;
  --text-main: #1a1a1a;
  --border-color: #eeeeee;
}

.accent-text {
  color: var(--accent-color);
}

.accent-bg {
  background-color: var(--accent-color);
}

.border-accent {
  border-color: var(--accent-color);
}

.bid-button {
  transition: all 0.3s ease;
  background-color: transparent;
  border: 1px solid var(--accent-color);
  color: var(--accent-color);
}

.bid-button:hover {
  background-color: var(--accent-color);
  color: #fff;
  box-shadow: 0 0 15px rgba(163, 147, 130, 0.4);
}

.tab-active {
  border-bottom: 2px solid var(--accent-color);
  color: var(--accent-color);
}

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: #f8f8f8;
}

::-webkit-scrollbar-thumb {
  background: var(--accent-color);
  border-radius: 3px;
}
</style>
