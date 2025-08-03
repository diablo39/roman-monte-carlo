<script setup lang="ts">
import { ref } from 'vue'

const numSimulations = ref(150)
const numExperiments = ref(1000)
const probabilityTable = ref(`0.1\t20\n0.2\t10`)

function parseProbabilityTable(tableText: string): Array<{ probability: number; value: number }> {
  if (!tableText) return []
  // Split the input text into lines and then parse each line into an object
  // with probability and value properties.
  // Assuming the input format is "probability\tvalue" for each line.
  // Example input: "0.1\t20\n0.2\t10"
  if (!tableText.trim()) return []
  if (!tableText.includes('\t')) {
    throw new Error('Invalid format: Please ensure the table is tab-separated.')
  }
  const lines = tableText.trim().split('\n')
  if (lines.length === 0) return []
  let probabilityArray: Array<{ probability: number; value: number }> = []

  for (let i = 0; i < lines.length; i++) {
    const [probability, value] = lines[i].split('\t').map((item: string) => item.trim())
    probabilityArray.push({
      probability: parseFloat(probability.replace(',', '.')),
      value: parseFloat(value),
    })
  }
  // Validate the parsed values
  for (const item of probabilityArray) {
    if (isNaN(item.probability) || isNaN(item.value)) {
      throw new Error('Invalid format: Please ensure all values are numbers.')
    }
    if (item.probability < 0 || item.probability > 1) {
      throw new Error('Invalid probability value: Must be between 0 and 1.')
    }
  }
  // Ensure the total probability does not exceed 1
  const totalProbability = probabilityArray.reduce((sum, item) => sum + item.probability, 0)
  if (totalProbability > 1) {
    throw new Error('Total probability exceeds 1. Please adjust your input.')
  }

  if (probabilityArray.length === 0) {
    throw new Error('No valid entries found in the probability table.')
  }

  if (probabilityArray.length > 1000) {
    throw new Error('Too many entries in the probability table. Please limit to 1000 entries.')
  }

  if (probabilityArray.some((item) => item.value < 0)) {
    throw new Error('Invalid value: Values must be non-negative.')
  }

  if (probabilityArray.some((item) => item.probability < 0)) {
    throw new Error('Invalid probability: Probabilities must be non-negative.')
  }

  if (probabilityArray.some((item) => isNaN(item.value))) {
    throw new Error('Invalid value: Values must be numbers.')
  }

  if (probabilityArray.some((item) => isNaN(item.probability))) {
    throw new Error('Invalid probability: Probabilities must be numbers.')
  }

  // Sort the array by probability in ascending order
  probabilityArray = probabilityArray.sort((a, b) => a.probability - b.probability)
  return probabilityArray
}

// Monte Carlo simulation script
function monteCarloFromProbabilities(
  probabilityArray: Array<{ probability: number; value: number }>,
  numSimulations: number,
) {
  const simulation = []
  if (numSimulations <= 0) {
    throw new Error('Number of simulations must be greater than 0.')
  }

  if (probabilityArray.length === 0) {
    throw new Error('Probability array is empty. Please provide valid probabilities and values.')
  }

  for (let i = 0; i < numSimulations; i++) {
    const randomValue = Math.random()
    for (let j = 0; j < probabilityArray.length; j++) {
      if (randomValue <= probabilityArray[j].probability) {
        simulation.push(probabilityArray[j].value)
        break
      }
    }
  }
  return simulation
}

// function calculateAverage(simulation: Array<number>) {
//   const sum = simulation.reduce((acc, value) => acc + value, 0)
//   return sum / simulation.length
// }

function calculateSum(simulation: Array<number>) {
  return simulation.reduce((acc, value) => acc + value, 0)
}

function runSimulation() {
  const probabilityArray = parseProbabilityTable(probabilityTable.value)
  console.log('Parsed probability array:', probabilityArray)

  const growingProbabilityArray: Array<{ probability: number; value: number }> = []

  for (let i = 0; i < probabilityArray.length; i++) {
    const currentProbability = probabilityArray[i].probability
    const currentValue = probabilityArray[i].value

    if (i === 0) {
      growingProbabilityArray.push({
        probability: currentProbability,
        value: currentValue,
      })
    } else {
      const previousProbability = growingProbabilityArray[i - 1].probability
      const probabilitySum = (previousProbability * 10000 + currentProbability * 10000) / 10000
      growingProbabilityArray.push({
        probability: probabilitySum,
        value: currentValue,
      })
    }
  }

  console.log('Growing probability array:', growingProbabilityArray)

  // Simulate the Monte Carlo process
  const simulationsResults: Record<number, number> = {}
  for (let i = 0; i < numExperiments.value; i++) {
    const values = monteCarloFromProbabilities(growingProbabilityArray, numSimulations.value)
    const sum = calculateSum(values)

    if (!simulationsResults[sum]) {
      simulationsResults[sum] = 0
    }
    simulationsResults[sum]++
  }

  // let csvContent = 'data:text/csv;charset=utf-8,'
  // for (const row in simulationsResults) {
  //   csvContent += `${row},${simulationsResults[row]}\r\n`
  // }
  let resultSum = 0
  Object.entries(simulationsResults).forEach(([, value]) => {
    resultSum += value
  })
  console.log('Total simulations:', resultSum)
  console.log('Simulation results:', simulationsResults)

  // Display results in the HTML
  const resultsDiv = document.getElementById('results')
  if (resultsDiv) {
    resultsDiv.innerHTML = ''
    for (const [sum, count] of Object.entries(simulationsResults)) {
      const resultItem = document.createElement('div')
      resultItem.textContent = `Sum: ${sum}, Count: ${count}`
      resultsDiv.appendChild(resultItem)
    }
    const totalItem = document.createElement('div')
    totalItem.textContent = `Total Simulations: ${resultSum}`
    resultsDiv.appendChild(totalItem)
  } else {
    console.error('Results div not found')
  }
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
