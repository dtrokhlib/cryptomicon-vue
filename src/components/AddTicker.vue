<template>
  <section>
    <div class="flex">
      <div class="max-w-xs">
        <label for="wallet" class="block text-sm font-medium text-gray-700"
          >Тикер</label
        >
        <div class="mt-1 relative rounded-md shadow-md">
          <input
            v-model="ticker"
            @keydown.enter="addTicker"
            type="text"
            name="wallet"
            id="wallet"
            class="block w-full pr-10 border-gray-300 text-gray-900 focus:outline-none focus:ring-gray-500 focus:border-gray-500 sm:text-sm rounded-md"
            placeholder="Например DOGE"
          />
        </div>
        <div class="flex bg-white shadow-md p-1 rounded-md shadow-md flex-wrap">
          <span
            v-for="(coins, index) in currentMatchCoins"
            :key="index"
            @click="addFromSuggestion(coins)"
            class="inline-flex items-center px-2 m-1 rounded-md text-xs font-medium bg-gray-300 text-gray-800 cursor-pointer"
          >
            {{ coins }}
          </span>
        </div>
        <div v-if="0" class="text-sm text-red-600">
          Such ticker was already added
        </div>
      </div>
    </div>
    <button
      @click="addTicker"
      type="button"
      class="my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
    >
      <plus-sign-icon />
      Добавить
    </button>
  </section>
</template>

<script>
import PlusSignIcon from '@/components/PlusSignIcon.vue';
import { cryptoApi } from '@/services/crypto-api';

export default {
  props: {
    tickers: {
      type: Array,
      required: true,
    }
  },

  emits:  {
    'add-ticker': value => typeof value === 'string' && value.length > 0,
  },

  components: {
    PlusSignIcon,
  },

  data() {
    return {
      ticker: "",
      coinsList: [],
    }
  },

  async mounted() {
    this.coinsList = await cryptoApi.getCoinList();
  },

  computed: {
    currentMatchCoins() {
      return this.coinsList
        .filter((coin) => !this.tickers.find((t) => t.name === coin))
        .filter((coin) => coin.startsWith(this.ticker || ""))
        .slice(0, 3);
    },
  },

  methods: {
    addTicker() {
      if(this.ticker.length === 0) {
        return;
      }
      this.$emit('add-ticker', this.ticker);
      this.ticker = '';
    },
    addFromSuggestion(suggestion) {
      this.ticker = suggestion;
      this.addTicker();
    },
  }
}
</script>
