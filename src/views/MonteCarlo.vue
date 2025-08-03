<script setup lang="ts">
import { ref } from 'vue'

const numSimulations = ref(150)
const numExperiments = ref(1000)
const probabilityTable = ref(`0.1\t20\n0.2\t10`)

function runSimulation() {
  const resultsDiv = document.getElementById('results')
  if (!resultsDiv) return

  resultsDiv.innerHTML = 'Running simulation...'

  // Simulate the Monte Carlo process
  setTimeout(() => {
    resultsDiv.innerHTML = `Simulation completed with ${numSimulations.value} features and ${numExperiments.value} experiments.`
  }, 1000)
}
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <h1>Monte Carlo Simulation</h1>
        <p>
          Enter the number of simulations and experiments, then paste the probability-value table
          below, and click "Run Simulation" to see the results.
        </p>

        <v-number-input
          :reverse="false"
          controlVariant="default"
          label="Number of features:"
          :hideInput="false"
          :inset="false"
          variant="solo"
          v-model="numSimulations"
          :min="1"
          :max="100000"
          :step="1"
          id="numSimulations"
        ></v-number-input>

        <v-number-input
          :reverse="false"
          controlVariant="default"
          label="Number of experiments:"
          :hideInput="false"
          :inset="false"
          variant="solo"
          v-model="numExperiments"
          :min="1"
          :max="100000"
          :step="1"
          id="numExperiments"
        ></v-number-input>

        <label for="probabilityTable">Probability-Value Table:</label><br />
        <v-textarea
          id="probabilityTable"
          rows="5"
          cols="30"
          v-model="probabilityTable"
          label="Enter probability-value pairs (e.g., 0.1 20, 0.2 10)"
        ></v-textarea>

        <v-btn id="runSimulation" color="primary" @click="runSimulation">Run Simulation</v-btn>

        <h2>Simulation Results:</h2>
        <div id="results"></div>
      </v-col>
    </v-row>
  </v-container>
</template>
