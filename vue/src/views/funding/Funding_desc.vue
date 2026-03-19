<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/api/funding'
import { useRewardStore } from '@/stores/rewardStore';

const rewardStore = useRewardStore();
const route = useRoute()
const router = useRouter()

// --- 상태 관리 (State) ---
const fundingDesc = ref(null)
const fundingDetail = ref(null)
const mainImage = ref('')  // 메인 이미지
const activeTab = ref('story')

// 리워드 선택 관련
const isRewardOpen = ref(false)   // 리워드 드롭다운 여부
const isSizeOpen = ref(false)     // 사이즈 드롭다운 여부
const selectedReward = ref(null)  // 현재 선택 중인 리워드 객체
const selectedSize = ref('')      // 현재 선택된 사이즈 문구
const quantity = ref(1)           // 현재 설정 중인 수량
const currentSelected = ref([])   // 최종 담긴 리워드 리스트 (장바구니)

// 가상 사이즈 데이터 (DB에 없을 경우 대비)
const sizeOptions = [
  { label: 'S (9-11호)', status: '재고소량' },
  { label: 'M (12-14호)', status: '판매중' },
  { label: 'L (15-17호)', status: '판매중' }
]

// --- 상품 상세 정보 불러오기  ---
const getDesc = async () => {
  const idx = route.params.idx
  const res = await api.FundingDesc(idx)
  fundingDesc.value = res.result
  mainImage.value = res.result.img

  // 시간 계산 카운트다운 시작
  calculateTimeLeft()
  timerInterval = setInterval(calculateTimeLeft, 1000)
}

// --- 추천 리스트 불러오기 ---
const getDetail = async () => {
  const res = await api.fundingDetail()
  fundingDetail.value = res.result
}


// --- 리워드 선택 (첫 번째 드롭다운) ---
const selectReward = (item) => {
  selectedReward.value = item
  selectedSize.value = '' // 리워드 바뀌면 사이즈 초기화
  quantity.value = 1      // 수량 초기화
  isRewardOpen.value = false
}

// --- 사이즈 선택 (두 번째 드롭다운) ---
const selectSize = (sizeLabel) => {
  selectedSize.value = sizeLabel
  isSizeOpen.value = false
}

// --- 리스트에 추가 (장바구니 담기) ---
const addToList = () => {
  if (!selectedReward.value || !selectedSize.value) return

  currentSelected.value.push({
    UUid: Date.now(), // 고유 ID
    idx: selectedReward.value.idx,
    title: selectedReward.value.title,
    price: selectedReward.value.price,
    contents: selectedReward.value.contents,
    size: selectedSize.value,
    count: quantity.value
  })

  // 선택 영역 초기화
  selectedReward.value = null
  selectedSize.value = ''
  quantity.value = 1
}

// --- 리스트에서 제거 ---
const removeReward = (id) => {
  currentSelected.value = currentSelected.value.filter(i => i.id !== id)
}

// --- 총 금액 계산 ---
const totalPrice = computed(() => {
  return currentSelected.value.reduce((acc, i) => acc + (i.price * i.count), 0)
})



// --- 피니아 저장 및 결제 이동 ---
const selectAndGo = () => {
  if (currentSelected.value.length === 0) return
  rewardStore.updateRewards(currentSelected.value, totalPrice.value)
  router.push({ name: 'payment' })
}

// --- 메인 이미지 변경 ---
const changeMainImage = (newSrc) => { mainImage.value = newSrc }

// --- 실시간 시간 계산 ---
const timeLeft = ref('')
let timerInterval = null

const calculateTimeLeft = () => {
  if (!fundingDesc.value?.endDays) return
  const targetDate = new Date(fundingDesc.value.endDays).getTime()
  const distance = targetDate - new Date().getTime()

  if (distance < 0) {
    timeLeft.value = "펀딩 종료"
    clearInterval(timerInterval)
    return
  }

  // 일, 시, 분, 초 계산
  const days = Math.floor(distance / (1000 * 60 * 60 * 24))
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((distance % (1000 * 60)) / 1000)

  // 00 형식으로 맞추기 (예: 04일 05:06:07)
  timeLeft.value = `${String(days).padStart(2, '0')}일 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

// --- 현재 퍼센트 계산 ---
const calculatedPercent = computed(() => {
  // 데이터가 없거나 목표 금액이 0인 경우 방어 로직
  if (!fundingDesc.value || !fundingDesc.value.targetPrice || fundingDesc.value.targetPrice === 0) {
    return 0;
  }

  // 현재 모인 금액 (DB 필드명이 'raised'라고 가정)
  const raised = fundingDesc.value.targetPrice; // 실제 DB에서 넘어오는 '현재 모금액' 필드명으로 수정하세요.
  // 목표 금액 (DB 필드명이 'goalPrice'라고 가정)
  const goal = 10800000; // 이 부분도 DB 필드(fundingDesc.value.goalPrice)로 교체 가능합니다.

  return Math.floor((raised / goal) * 100);
});

onMounted(() => {
  getDesc()
  getDetail()
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>

<template>
  <main v-if="fundingDetail && fundingDesc" class="max-w-[1440px] mx-auto px-4 md:px-10 py-8">
    <nav class="text-[10px] text-gray-400 mb-6 uppercase tracking-[0.2em]">
      Home / Funding / Handmade /
      <span class="text-gray-600">{{ fundingDesc.name }}</span>
    </nav>

    <section
      class="relative overflow-hidden rounded-md border border-[#2A2A2A] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#252525] to-[#111111] shadow-sm h-[260px] md:h-[340px] mb-10 flex items-end">
      <div class="absolute inset-0 banner-gradient"></div>
      <div class="absolute left-6 md:left-10 bottom-8 md:bottom-10 text-white max-w-3xl">
        <div class="flex items-center space-x-2 mb-4">
          <span
            class="inline-flex items-center rounded-full bg-zinc-800/50 px-4 py-1.5 text-xs font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700/50 uppercase tracking-widest">Handmade</span>
          <span
            class="inline-flex items-center rounded-full bg-zinc-200 px-4 py-1.5 text-xs font-medium text-zinc-800 ring-1 ring-inset ring-zinc-300 uppercase tracking-widest">{{
              fundingDesc.category }}</span>
          <span
            class="inline-flex items-center rounded-full bg-zinc-500 px-4 py-1.5 text-xs font-medium text-white ring-1 ring-inset ring-zinc-400">{{
              fundingDesc.brand }}</span>
        </div>
        <h1 class="text-3xl md:text-5xl font-light font-serif-luxury italic leading-tight">{{ fundingDesc.name }}</h1>
        <p class="text-sm md:text-[14px] font-light text-gray-200 leading-loose mt-4 opacity-95">
          작가의 섬세한 손길로 탄생하는 수공예 주얼리. 펀딩을 통해 팀의 창작 활동을 응원하고 소장해 보세요.
        </p>
      </div>
    </section>

    <section class="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div class="lg:col-span-8">
        <section class="mb-10">
          <div class="border border-gray-100 bg-gray-50 rounded-md overflow-hidden aspect-square">
            <img :src="mainImage" class="w-full h-full object-cover transition-opacity duration-300" alt="Main" />
          </div>
          <div class="mt-4 flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
            <button
              class="thumb shrink-0 border border-[#A39382] rounded-md overflow-hidden w-24 aspect-square bg-white"
              @click="changeMainImage(fundingDesc.img)">
              <img :src="fundingDesc.img" class="w-full h-full object-cover" alt="Thumb Main" />
            </button>
            <div v-for="img in fundingDesc.fundImgList" :key="img.idx">
              <button
                class="thumb shrink-0 border border-gray-200 rounded-md overflow-hidden w-24 aspect-square bg-white hover:border-[#A39382]"
                @click="changeMainImage(img.imgDetail)">
                <img :src="img.imgDetail" class="w-full h-full object-cover" alt="Thumb Detail" />
              </button>
            </div>
          </div>
        </section>

        <div class="flex border-b border-gray-100 mb-6">
          <button v-for="tab in ['story', 'maker', 'process', 'shipping']" :key="tab" @click="activeTab = tab"
            :class="['px-6 py-3 text-[11px] uppercase tracking-[0.2em] transition-colors', activeTab === tab ? 'border-b-2 border-[#A39382] text-black font-bold' : 'text-gray-400 font-medium']">
            {{ tab }}
          </button>
        </div>

        <!-- 탭 -->
        <div v-show="activeTab === 'story'" class="space-y-10">
          <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-6 border border-gray-100 rounded-md bg-white">
              <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">Key Point</p>
              <p class="text-sm text-gray-700 leading-relaxed font-light">{{ fundingDesc.fundStory?.keyPoint }}</p>
            </div>
            <div class="p-6 border border-gray-100 rounded-md bg-white">
              <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">Material</p>
              <p class="text-sm text-gray-700 leading-relaxed font-light">{{ fundingDesc.fundStory?.material }}</p>
            </div>
            <div class="p-6 border border-gray-100 rounded-md bg-white">
              <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">Handmade</p>
              <p class="text-sm text-gray-700 leading-relaxed font-light">{{ fundingDesc.fundStory?.handMade }}</p>
            </div>
          </section>
          <section class="p-8 border border-gray-100 rounded-md bg-white">
            <h2 class="text-xl font-light tracking-[0.25em] uppercase text-gray-900 mb-5">Project Story</h2>
            <p class="text-sm text-gray-600 leading-relaxed font-light">{{ fundingDesc.fundStory?.projectStory }}</p>
          </section>
        </div>

        <div v-show="activeTab === 'maker'" class="p-8 border border-gray-100 rounded-md bg-white">
          <h2 class="text-2xl font-light text-gray-900 mb-6">{{ fundingDesc.brand }}</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="p-5 bg-gray-50 rounded-md border border-gray-100">
              <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">Experience</p>
              <p class="text-sm text-gray-700 font-light">{{ fundingDesc.fundMaker?.experience }}</p>
            </div>
            <div class="p-5 bg-gray-50 rounded-md border border-gray-100">
              <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">Style</p>
              <p class="text-sm text-gray-700 font-light">{{ fundingDesc.fundMaker?.style }}</p>
            </div>
            <div class="p-5 bg-gray-50 rounded-md border border-gray-100">
              <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2">Promise</p>
              <p class="text-sm text-gray-700 font-light">{{ fundingDesc.fundMaker?.promise }}</p>
            </div>
          </div>
        </div>

        <div v-show="activeTab === 'process'" class="p-8 border border-gray-100 rounded-md bg-white">
          <h2 class="text-xl font-light tracking-[0.25em] uppercase text-gray-900 mb-8">Making Process</h2>
          <div class="space-y-8">
            <div v-for="(proc, index) in fundingDesc.fundProcessList" :key="proc.idx"
              class="flex items-start space-x-4">
              <div
                class="w-8 h-8 rounded-full bg-[#A39382] text-white flex items-center justify-center text-sm font-bold shrink-0">
                {{ index + 1 }}</div>
              <div>
                <p class="text-sm font-medium text-gray-900">{{ proc.title }}</p>
                <p class="text-sm text-gray-600 font-light leading-relaxed mt-1">{{ proc.contents }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>


      <!-- 사이드 정보 -->
      <aside class="lg:col-span-4 lg:sticky lg:top-10 self-start space-y-6">
        <div class="border border-gray-100 rounded-md bg-white p-7 shadow-sm space-y-6">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2 font-medium">Funding Progress</p>
              <p class="text-3xl font-bold text-[#A39382]">{{ calculatedPercent }}%</p>
            </div>
            <div class="text-right">
              <p class="text-[10px] text-gray-400 uppercase tracking-[0.2em] mb-2 font-medium">Time Left</p>
              <p class="text-lg font-mono text-gray-800 tracking-wider">{{ timeLeft }}</p>
            </div>
            
          </div>
          <div class="w-full h-[4px] rounded-full overflow-hidden bg-gray-100">
              <div id="progress-fill" class="h-full" :style="{
                width: Math.min(calculatedPercent, 100) + '%',
                backgroundColor: '#a39382'
              }"></div>
            </div>
          <div>
            <div class="flex justify-between mt-3 text-sm">
              <div class="space-x-2">
                <span class="text-gray-400 text-[11px]">모인 금액</span>
                <span class="text-gray-900 font-medium" id="raised">
                  ₩ {{ Number(fundingDesc.targetPrice).toLocaleString() }}</span>
              </div>
              <div class="space-x-2">
                <span class="text-gray-400 text-[11px]">목표</span>
                <span class="text-gray-900 font-medium" id="goal">₩ 10,800,000</span>
              </div>
            </div>
            <div class="flex justify-between mt-2 text-sm">
              <div class="space-x-2">
                <span class="text-gray-400 text-[11px]">서포터</span>
                <span class="text-gray-900 font-medium" id="supporters">{{ fundingDesc.supporters }}명</span>
              </div>
              <div class="space-x-2">
                <span class="text-gray-400 text-[11px]">종료</span>
                <span class="text-gray-900 font-medium">{{ fundingDesc.endDays }}</span>
              </div>
            </div>
          </div>

          <div class="flex space-x-2 pt-1 border border-gray-200 ">
            <button class="flex-1 py-3 text-[11px] font-bold tracking-widest uppercase ghost-btn rounded-sm ">
              ❤️ 위시리스트
            </button>
          </div>

        </div>

        <!-- 리워드 선택  -->
        <div class="space-y-3 pt-4 border-t border-gray-50">
          <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Reward Selection</p>

          <div class="relative">
            <button @click="isRewardOpen = !isRewardOpen"
              class="w-full flex items-center justify-between p-4 border border-gray-200 rounded-sm bg-white hover:border-gray-300 shadow-sm text-left">
              <span :class="selectedReward ? 'text-gray-900 font-bold' : 'text-gray-400 text-sm'">
                {{ selectedReward ? selectedReward.title : '리워드를 선택해주세요' }}
              </span>
              <span class="text-gray-400 transition-transform" :class="{ 'rotate-180': isRewardOpen }">▼</span>
            </button>

            <div v-if="isRewardOpen"
              class="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-sm shadow-2xl max-h-[300px] overflow-y-auto">
              <div v-for="item in fundingDesc.fundingRewardsList" :key="item.idx" @click="selectReward(item)"
                class="p-4 border-b border-gray-50 hover:bg-stone-50 cursor-pointer flex gap-4">
                <div class="flex-1">
                  <p class="text-[16px] font-bold text-gray-900 mb-1">{{ item.title }}</p>
                  <p class="text-[13px] text-gray-400  mb-1">{{ item.contents }}</p>
                  <p class="text-sm font-bold text-[#A39382]">₩ {{ item.price.toLocaleString() }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 사이즈 선택 -->
          <div v-if="selectedReward" class="relative animate-fadeIn">
            <button @click="isSizeOpen = !isSizeOpen"
              class="w-full flex items-center justify-between p-4 border border-gray-200 rounded-sm bg-white hover:border-gray-300 shadow-sm text-left">
              <span :class="selectedSize ? 'text-gray-900 font-bold' : 'text-gray-400 text-sm'">
                {{ selectedSize ? selectedSize : '호수(사이즈) 선택' }}
              </span>
              <span class="text-gray-400">▼</span>
            </button>

            <div v-if="isSizeOpen"
              class="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl">
              <div v-for="size in sizeOptions" :key="size.label" @click="selectSize(size.label)"
                class="p-4 border-b border-gray-50 hover:bg-stone-50 cursor-pointer flex justify-between">
                <span class="text-sm">{{ size.label }}</span>
                <span class="text-[9px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-bold">{{ size.status
                }}</span>
              </div>
            </div>
          </div>

          <!-- 수량 선택 및 추가 -->
          <div v-if="selectedSize" class="bg-stone-50 p-6 rounded-xl border border-stone-100 space-y-4 animate-fadeIn">
            <div class="flex items-center justify-between">
              <p class="text-xs font-bold text-gray-500 uppercase tracking-widest">수량</p>
              <div class="flex items-center border border-gray-200 bg-white rounded-sm">
                <button @click="quantity > 1 ? quantity-- : null"
                  class="w-8 h-8 flex items-center justify-center">-</button>
                <span class="w-10 text-center text-sm font-bold">{{ quantity }}</span>
                <button @click="quantity++" class="w-8 h-8 flex items-center justify-center">+</button>
              </div>
            </div>
            <button @click="addToList"
              class="w-full py-4 bg-[#A39382] text-white text-[11px] font-bold tracking-[0.2em] uppercase rounded-sm">리워드
              선택하기</button>
          </div>
        </div>

        <!-- 선택 리워드 확인  -->
        <div class="pt-6 border-t border-gray-100">
          <p class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Selected List</p>
          <div v-if="currentSelected.length === 0" class="text-sm text-gray-300 italic">추가된 리워드가 없습니다.</div>
          <div class="space-y-2">
            <div v-for="reward in currentSelected" :key="reward.id"
              class="flex items-center justify-between bg-gray-50 p-3 rounded-md border border-gray-100">
              <div class="flex-1 pr-2">
                <p class="text-[12px] font-medium text-gray-800 line-clamp-1">{{ reward.title }}</p>
                <p class="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{{ reward.contents }}</p>
                <p class="text-[11px] text-gray-500">{{ reward.size }} / {{ reward.count }}개</p>
              </div>
              <div class="text-right flex items-center gap-3">
                <span class="text-xs font-bold">₩{{ (reward.price * reward.count).toLocaleString() }}</span>
                <button @click="removeReward(reward.id)" class="text-gray-300 hover:text-red-500 text-lg">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- 총 결제 금액 -->
        <div class="flex items-center justify-between pt-4 border-t border-gray-100">
          <p class="text-[11px] uppercase tracking-[0.2em] text-gray-400">Total Amount</p>
          <p class="text-xl font-bold text-[#A39382]">₩ {{ totalPrice.toLocaleString() }}</p>
        </div>

        <!-- 결제하기 -->
        <RouterLink :to="{ name: 'payment' }">
          <button @click="selectAndGo" :disabled="currentSelected.length === 0"
            class=" mt-4 w-full py-4 bg-[#9B8A7E] text-white font-bold text-xs tracking-[0.3em] uppercase rounded-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#8e7f74] transition-colors">
            Support this Project
          </button>
        </RouterLink>
        
      </aside>
    </section>

    <!-- 추천 상품 리스트 -->
    <section class="mt-24">
      <h2 class="text-2xl font-bold mb-8">함께 보면 좋은 수공예 펀딩</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div v-for="product in fundingDetail.fundingList" :key="product.idx" class="group cursor-pointer">
          <div class="aspect-video overflow-hidden bg-gray-100 mb-4 relative rounded-md">
            <img :src="product.img"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Related">
          </div>
          <h3 class="text-md font-bold group-hover:text-[#A39382] transition-colors line-clamp-2">{{ product.brand }} —
            {{ product.name }}</h3>
          <p class="text-[12px] text-gray-400 mt-2">{{ product.category }} | {{ product.percent }}% 달성</p>
        </div>
      </div>
    </section>
  </main>
</template>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,500;1,300&family=Noto+Sans+KR:wght@100;300;400;500;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Cormorant+Garamond:ital,wght@0,300;0,500;1,300&family=Noto+Sans+KR:wght@100;300;400;500;700&display=swap');

:root {
  /* ✅ CSS 변수도 동일한 색상으로 업데이트 */
  --accent-color: #9B8A7E;
  --accent-hover: #8e7f70;
  --bg-light: #ffffff;
  --text-main: #1a1a1a;
  --border-color: #eeeeee;
}

body {
  font-family: 'Noto Sans KR', sans-serif;
  background: var(--bg-light);
  color: var(--text-main);
  margin: 0;
  word-break: keep-all;
}

.font-serif-luxury {
  font-family: 'Cormorant Garamond', serif;
}

.luxury-font {
  font-family: 'Cinzel', serif;
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

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.banner-gradient {
  background: linear-gradient(to right, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0) 62%);
}

.tab-active {
  border-bottom: 2px solid var(--accent-color);
  color: var(--accent-color);
}

/* ✅ primary-btn 색상을 브라운 톤으로 고정 */
.primary-btn {
  background: #9B8A7E;
  color: #fff;
  transition: all 0.2s ease;
}

.primary-btn:hover {
  opacity: 0.92;
  background: #8e7f74;
}

.ghost-btn {
  border: 1px solid var(--border-color);
  transition: all 0.2s ease;
}

.ghost-btn:hover {
  border-color: var(--accent-color);
  color: var(--accent-color);
}

.reward-card {
  border: 1px solid #f1f1f1;
  transition: all 0.2s ease;
}

.reward-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
}

.reward-selected {
  border-color: var(--accent-color) !important;
  box-shadow: 0 12px 35px rgba(163, 147, 130, 0.18) !important;
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

/* ✅ 시안처럼 번호를 스타일링하기 위한 CSS 추가 */
.process-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #9B8A7E;
  /* --accent-color 값 직접 적용 */
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  font-family: 'Cinzel', serif;
  /* 숫자 폰트 스타일 */
  margin-top: -2px;
  /* 제목 텍스트와 높이를 맞추기 위한 미세 조정 */
}

/* 타블렛/모바일 대응을 위한 미세 조정 */
@media (max-width: 768px) {
  .process-item {
    gap: 1rem;
  }

  .process-number {
    width: 32px;
    height: 32px;
    font-size: 14px;
  }
}
</style>