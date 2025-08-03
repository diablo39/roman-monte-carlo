<script setup lang="ts">
import { RouterView } from 'vue-router'
import { ref } from 'vue'

const drawer = ref(null)
</script>

<script lang="ts">
export default {
  data: () => ({
    drawer: null,
  }),
}
</script>

<template>
  <v-app>
    <v-navigation-drawer v-model="drawer">
      <v-list>
        <v-list-item to="/" prepend-icon="mdi-home">Home</v-list-item>
        <v-list-item to="/monte-carlo" prepend-icon="mdi-simulate"
          >Monte Carlo Simulation</v-list-item
        >
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <RouterView />
    </v-main>
  </v-app>
</template>

<style scoped></style>
