<template>
  <section class="relative">
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
    <button @click="unselectTicker" type="button" class="absolute top-0 right-0">
      <close-sign-icon />
    </button>
  </section>
</template>
<script>
import CloseSignIcon from "@/components/CloseSignIcon.vue";

export default {
  components: {
    CloseSignIcon,
  },

  emits: {
    unselectTicker: null,
  },

  props: {
    graphPriceValue: {
      required: true,
    },
    selectedTicker: {
      required: true,
    },
  },

  data() {
    return {
      graphItems: [],
      maxGraphElements: 10,
      graphItemWidth: 38,
    }
  },

  async mounted() {
    window.addEventListener("resize", this.calculateMaxGraphElements);
  },

  beforeUnmount() {
    window.removeEventListener("resize", this.calculateMaxGraphElements);
  },

  watch: {
    graphPriceValue() {
      this.graphItems.push(this.graphPriceValue);
    },

    graphItems() {
      this.graphItems.length > this.maxGraphElements && this.updateGraphSize();
    }
  },

  computed: {
    normalizedGraph() {
      const maxValue = Math.max(...this.graphItems);
      const minValue = Math.min(...this.graphItems);

      if (maxValue === minValue) {
        return this.graphItems.map(() => 50);
      }
      return this.graphItems.map(
        (price) => (5 + (price - minValue) * 95) / (maxValue - minValue)
      );
    },
  },

  methods: {
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
      this.graphItems = this.graphItems.slice(0, this.maxGraphElements - 1);
    },

    unselectTicker() {
      this.$emit('unselect-ticker');
    },
  }
}
</script>
