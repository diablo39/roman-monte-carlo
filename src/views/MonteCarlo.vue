<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'
import annotationPlugin from 'chartjs-plugin-annotation'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, annotationPlugin)

const chartData = ref({
  labels: ['January', 'February', 'March'],
  datasets: [
    {
      label: 'Simulation Results',
      backgroundColor: '#42A5F5',
      data: [40, 20, 12],
    },
  ],
})
const chartOptions = ref({
  responsive: true,
  plugins: {
    title: {
      display: true,
      text: 'Monte Carlo Simulation Results',
    },
  },
})

const numSimulations = ref(150)
const numExperiments = ref(1000)
const probabilityTable = ref(`0.1\t20
0.2\t10
0.1\t20
0.2\t10
0.1\t20
0.2\t10
0.1\t20`)
const loadChartData = ref(false)
const tab = ref(null)
const results = ref<{ value: number; count: number; probability: number; percentile: number }[]>([])

// Function to find a specific percentile value
function findPercentileValue(targetPercentile: number): number | null {
  if (results.value.length === 0) return null

  // Find the first result where percentile >= target percentile
  const result = results.value.find((item) => item.percentile >= targetPercentile)
  return result ? result.value : null
}

// Computed property for common percentiles
const percentileStats = computed(() => {
  if (results.value.length === 0) return null

  return {
    p25: findPercentileValue(25),
    p50: findPercentileValue(50), // median
    p75: findPercentileValue(75),
    p85: findPercentileValue(85),
    p90: findPercentileValue(90),
    p95: findPercentileValue(95),
  }
})

function parseProbabilityTable(tableText: string): Array<{ probability: number; value: number }> {
  if (!tableText) return []
  // Split the input text into lines and then parse each line into an object
  // with probability and value properties.
  // Assuming the input format is "probability\tvalue" for each line.
  // Example input: "0.1\t20\n0.2\t10"
  if (!tableText.trim()) return []
  if (!tableText.includes('\t') && !tableText.includes(' ')) {
    throw new Error('Invalid format: Please ensure the table is tab-separated or space separated.')
  }
  const lines = tableText.trim().split('\n')
  if (lines.length === 0) return []
  let probabilityArray: Array<{ probability: number; value: number }> = []

  for (let i = 0; i < lines.length; i++) {
    const [probability, value] = lines[i]
      .replace(' ', '\t')
      .split('\t')
      .map((item: string) => item.trim())
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
  const totalProbability = probabilityArray.reduce(
    (sum, item) => (sum * 1000 + item.probability * 1000) / 1000,
    0,
  )
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
  return simulation.reduce((acc, value) => (acc * 1000 + value * 1000) / 1000, 0)
}

async function runSimulation() {
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

  // Update chart data
  loadChartData.value = false
  await nextTick()

  chartData.value.labels = Object.keys(simulationsResults).map(String)
  chartData.value.datasets[0].data = Object.values(simulationsResults)

  loadChartData.value = true

  let resultSum = 0
  Object.entries(simulationsResults).forEach(([, value]) => {
    resultSum += value
  })
  console.log('Total simulations:', resultSum)
  console.log('Simulation results:', simulationsResults)

  // Create results array and sort by value
  const sortedResults = Object.entries(simulationsResults)
    .map(([value, count]) => ({
      value: parseInt(value),
      count: count,
      probability: count / resultSum,
      percentile: 0,
    }))
    .sort((a, b) => a.value - b.value)

  // Calculate percentiles
  let cumulativeCount = 0
  for (const result of sortedResults) {
    cumulativeCount += result.count
    result.percentile = (cumulativeCount / resultSum) * 100
  }

  results.value = sortedResults
}
</script>

<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <p>
          Enter the number of items and experiments, then paste the probability-value table below,
          and click "Run Simulation" to see the results.
        </p>

        <v-number-input
          :reverse="false"
          controlVariant="default"
          label="Number of items:"
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
          rows="10"
          cols="30"
          v-model="probabilityTable"
          label="Enter probability-value pairs (e.g., 0.1 20, 0.2 10) as separator use single space or tab. Each value schould be set in new line"
        ></v-textarea>

        <v-btn id="runSimulation" color="primary" @click="runSimulation">Run Simulation</v-btn>
      </v-col>
    </v-row>
  </v-container>
  <v-container v-if="results.length > 0">
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-tabs v-model="tab" color="primary" background-color="lighten-3">
            <v-tab value="summary">Summary</v-tab>
            <v-tab value="one">Data</v-tab>
            <v-tab value="two">Chart</v-tab>
          </v-tabs>

          <v-card-text>
            <v-tabs-window v-model="tab">
              <v-tabs-window-item value="summary">
                <v-container>
                  <v-row>
                    <v-col cols="12">
                      <v-row v-if="percentileStats">
                        <v-col cols="12" md="6">
                          <v-card class="mb-4" elevation="2">
                            <v-card-title class="bg-blue-grey-lighten-4">
                              Key Percentiles
                            </v-card-title>
                            <v-card-text>
                              <v-table density="compact">
                                <thead>
                                  <tr>
                                    <th class="text-left">Percentile</th>
                                    <th class="text-left">Value</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>25th</td>
                                    <td>
                                      <strong>{{ percentileStats.p25 }}</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>50th (Median)</td>
                                    <td>
                                      <strong>{{ percentileStats.p50 }}</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>75th</td>
                                    <td>
                                      <strong>{{ percentileStats.p75 }}</strong>
                                    </td>
                                  </tr>
                                  <tr class="bg-orange-lighten-5">
                                    <td>85th</td>
                                    <td>
                                      <strong>{{ percentileStats.p85 }}</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>90th</td>
                                    <td>
                                      <strong>{{ percentileStats.p90 }}</strong>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td>95th</td>
                                    <td>
                                      <strong>{{ percentileStats.p95 }}</strong>
                                    </td>
                                  </tr>
                                </tbody>
                              </v-table>
                            </v-card-text>
                          </v-card>
                        </v-col>

                        <v-col cols="12" md="6">
                          <v-card class="mb-4" elevation="2">
                            <v-card-title class="bg-green-lighten-4">
                              Simulation Parameters
                            </v-card-title>
                            <v-card-text>
                              <v-list density="compact">
                                <v-list-item>
                                  <v-list-item-title
                                    >Number of Items per Simulation:</v-list-item-title
                                  >
                                  <v-list-item-subtitle>{{ numSimulations }}</v-list-item-subtitle>
                                </v-list-item>
                                <v-list-item>
                                  <v-list-item-title>Number of Experiments:</v-list-item-title>
                                  <v-list-item-subtitle>{{ numExperiments }}</v-list-item-subtitle>
                                </v-list-item>
                                <v-list-item>
                                  <v-list-item-title>Total Results:</v-list-item-title>
                                  <v-list-item-subtitle
                                    >{{ results.length }} unique outcomes</v-list-item-subtitle
                                  >
                                </v-list-item>
                              </v-list>
                            </v-card-text>
                          </v-card>
                        </v-col>
                      </v-row>

                      <v-alert v-else type="info" class="mt-4">
                        No simulation results available. Please run a simulation first.
                      </v-alert>
                    </v-col>
                  </v-row>
                </v-container>
              </v-tabs-window-item>

              <v-tabs-window-item value="one">
                <v-container>
                  <v-row>
                    <v-col cols="12">
                      <v-table density="compact">
                        <thead>
                          <tr>
                            <th class="text-left">Value</th>
                            <th class="text-left">Count</th>
                            <th class="text-left">Probability</th>
                            <th class="text-left">Percentile</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="item in results" :key="item.value">
                            <td>{{ item.value }}</td>
                            <td>{{ item.count }}</td>
                            <td>{{ item.probability }}</td>
                            <td>{{ item.percentile.toFixed(2) }}</td>
                          </tr>
                        </tbody>
                      </v-table>
                    </v-col>
                  </v-row>
                </v-container>
              </v-tabs-window-item>

              <v-tabs-window-item value="two">
                <v-container>
                  <v-row>
                    <v-col cols="12">
                      <Bar
                        v-if="loadChartData"
                        id="my-chart-id"
                        :options="chartOptions"
                        :data="chartData"
                        :height="100"
                      />
                    </v-col>
                  </v-row>
                </v-container>
              </v-tabs-window-item>
            </v-tabs-window>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
