<template>
  <div class="container mx-auto flex flex-col items-center bg-gray-100 p-4">
    <div
      v-if="!isLoaded"
      class="fixed w-100 h-100 bg-purple-800 inset-0 z-50 flex items-center justify-center"
    >
      <loading-sign-icon />
    </div>
    <div class="container">
      <add-ticker 
        :tickers="tickers"
        @add-ticker="add"
      />
      <template v-if="tickers.length">
        <div>
          <button
            v-if="page > 1"
            @click="page--"
            class="my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Prev
          </button>
          <span class="m-2 border-black border-size-2 border-spacing-2">{{ page }}</span>
          <button
            v-if="hasNextPage"
            @click="page++"
            class="my-4 inline-flex items-center py-2 px-4 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-full text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Next
          </button>
          <div>Filter: <input v-model="filter" /></div>
        </div>
        <hr class="w-full border-t border-gray-600 my-4" />
        <dl class="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div
            v-for="(t, index) in paginatedTickers"
            :key="index"
            @click="select(t)"
            :class="{
              'border-4': selectedTicker === t,
            }"
            class="bg-white overflow-hidden shadow rounded-lg border-purple-800 border-solid cursor-pointer"
          >
            <div
              class="px-4 py-5 sm:p-6 text-center"
              :class="{ 'bg-red-100': t.status === 'invalid' }"
            >
              <dt class="text-sm font-medium text-gray-500 truncate">{{ t.name }}-USD</dt>
              <dd class="mt-1 text-3xl font-semibold text-gray-900">
                {{ t.price }}
              </dd>
            </div>
            <div class="w-full border-t border-gray-200"></div>
            <button
              @click.stop="handleDelete(t)"
              class="flex items-center justify-center font-medium w-full bg-gray-100 px-4 py-4 sm:px-6 text-md text-gray-500 hover:text-gray-600 hover:bg-gray-200 hover:opacity-20 transition-all focus:outline-none"
            >
              <delete-sign-icon />Удалить
            </button>
          </div>
        </dl>
        <hr class="w-full border-t border-gray-600 my-4" />
      </template>
      <section v-if="selectedTicker" class="relative">
        <h3 class="text-lg leading-6 font-medium text-gray-900 my-8">
          {{ selectedTicker.name }} - USD
        </h3>
        <div class="flex items-end border-gray-600 border-b border-l h-64" ref="graph">
          <div
            v-for="(bar, index) in normalizedGraph"
            :key="index"
            :style="{ height: `${bar}%`, width: `${graphItemWidth}px` }"
            class="bg-purple-800 border h-24"
          ></div>
        </div>
        <button
          @click="selectedTicker = null"
          type="button"
          class="absolute top-0 right-0"
        >
          <close-sign-icon />
        </button>
      </section>
    </div>
  </div>
</template>

<script>
import { cryptoApi } from "@/services/crypto-api";
import CloseSignIcon from "@/components/CloseSignIcon.vue";
import DeleteSignIcon from "@/components/DeleteSignIcon.vue";
import LoadingSignIcon from "@/components/LoadingSignIcon.vue";
import AddTicker from "@/components/AddTicker.vue";

export default {
  name: "App",
  components: {
    CloseSignIcon,
    DeleteSignIcon,
    LoadingSignIcon,
    AddTicker,
  },
  data() {
    return {
      tickers: [],
      selectedTicker: null,
      graph: [],
      isLoaded: false,
      page: 1,
      filter: "",
      maxGraphElements: 10,
      graphItemWidth: 38,
    };
  },
  async created() {
    this.assignQueryParams();
    this.assignTickersFromStorage();
  },
  async mounted() {
    this.isLoaded = true;
    window.addEventListener("resize", this.calculateMaxGraphElements);
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.calculateMaxGraphElements);
  },
  computed: {
    hasNextPage() {
      return this.tickers.length > this.page * 6;
    },
    filteredTickers() {
      return this.tickers.filter((t) => t.name.includes(this.filter));
    },
    paginatedTickers() {
      const start = (this.page - 1) * 6;
      const end = this.page * 6;
      return this.filteredTickers.slice(start, end);
    },
    normalizedGraph() {
      const maxValue = Math.max(...this.graph);
      const minValue = Math.min(...this.graph);
      if (maxValue === minValue) {
        return this.graph.map(() => 50);
      }
      return this.graph.map(
        (price) => (5 + (price - minValue) * 95) / (maxValue - minValue)
      );
    },
    pageStateOptions() {
      return {
        filter: this.filter,
        page: this.page,
      };
    },
  },
  watch: {
    paginatedTickers() {
      if (this.paginatedTickers.length === 0 && this.page > 1) {
        this.page -= 1;
      }
    },
    pageStateOptions(value) {
      history.pushState(
        null,
        document.title,
        `${window.history.pathname}?filter=${value.filter}&page=${value.page}`
      );
    },
    filter() {
      this.page = 1;
    },
    selectedTicker() {
      this.graph = [];
      this.$nextTick().then(this.calculateMaxGraphElements);
    },
    tickers() {
      localStorage.setItem("cryptonomicon-list", JSON.stringify(this.tickers));
    },
  },
  methods: {
    updateTicker(tickerName, price) {
      this.tickers
        .filter((t) => t.name === tickerName)
        .forEach((t) => {
          t.price = price;
          if (t === this.selectedTicker) {
            this.graph.push(price);
            this.graph.length > this.maxGraphElements && this.updateGraphSize();
          }
        });
    },
    calculateMaxGraphElements() {
      if (!this.$refs.graph) {
        return this.maxGraphElements;
      }
      this.maxGraphElements = parseInt(
        this.$refs.graph.clientWidth / this.graphItemWidth
      );
      this.updateGraphSize();
    },
    updateGraphSize() {
      this.graph = this.graph.slice(0, this.maxGraphElements - 1);
    },
    add(ticker) {
      console.log(ticker);
      if (this.getTicker(ticker)) {
        return;
      }
      const currentTicker = {
        name: ticker,
        price: "-",
      };
      this.tickers = [...this.tickers, currentTicker];
      cryptoApi.addTicker(
        currentTicker.name,
        (newPrice) => this.updateTicker(currentTicker.name, newPrice),
        (status) => this.changeTickerStatus(currentTicker.name, status)
      );
    },
    getTicker(tickerName) {
      return this.tickers.find((t) => t.name === tickerName);
    },
    clearTicker() {
      this.ticker = "";
    },
    handleDelete(tickerToRemove) {
      this.tickers = this.tickers.filter((t) => t !== tickerToRemove);
      if (this.selectedTicker === tickerToRemove) {
        this.selectedTicker = null;
      }
      cryptoApi.removeTicker(tickerToRemove.name);
    },
    select(ticker) {
      this.selectedTicker = ticker;
    },
    assignQueryParams() {
      const windowData = Object.fromEntries(
        new URL(window.location).searchParams.entries()
      );
      if (windowData.filter) {
        this.filter = windowData.filter;
      }
      if (windowData.page) {
        this.page = windowData.page;
      }
    },
    changeTickerStatus(tickerName, status) {
      this.tickers
        .filter((t) => t.name === tickerName)
        .forEach((t) => {
          t.status = status;
        });
    },
    assignTickersFromStorage() {
      const storageData = localStorage.getItem("cryptonomicon-list");
      if (storageData) {
        this.tickers = JSON.parse(storageData);
        this.tickers.forEach((ticker) => {
          cryptoApi.addTicker(
            ticker.name,
            (newPrice) => this.updateTicker(ticker.name, newPrice),
            (status) => this.changeTickerStatus(ticker.name, status)
          );
        });
      }
    },
  },
};
</script>

<style></style>
