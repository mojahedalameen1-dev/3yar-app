<template>
  <v-card class="rounded-xl elevation-0 border" :loading="loading">
    <v-card-title class="d-flex align-center py-4 px-6">
      <v-icon color="primary" class="me-2">mdi-chart-bar</v-icon>
      <span class="text-h6 font-weight-bold">تحليل المصاريف</span>
      <v-spacer></v-spacer>
      <div class="text-caption text-medium-emphasis">آخر 6 أشهر</div>
    </v-card-title>
    
    <v-card-text class="pb-6">
      <div v-if="hasData" style="height: 250px; position: relative;">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div v-else class="d-flex flex-column align-center justify-center py-8 text-medium-emphasis">
        <v-icon size="48" class="mb-2 opacity-50">mdi-chart-line-variant</v-icon>
        <p>لا توجد بيانات كافية للرسم البياني</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
} from 'chart.js'
import { Bar } from 'vue-chartjs'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  },
  loading: Boolean
})

const hasData = computed(() => props.records && props.records.length > 0)

const chartData = computed(() => {
  // 1. Prepare last 6 months labels
  const months = []
  const costMap = {}
  
  for (let i = 5; i >= 0; i--) {
    const d = dayjs().subtract(i, 'month')
    const key = d.format('YYYY-MM')
    months.push({
      key: key,
      label: d.locale('ar').format('MMMM') // e.g. "يناير"
    })
    costMap[key] = 0 // Init
  }

  // 2. Fill data
  props.records.forEach(record => {
    const key = dayjs(record.date).format('YYYY-MM')
    if (costMap[key] !== undefined) {
      costMap[key] += Number(record.cost || 0)
    }
  })

  // 3. Construct Chart.js data
  return {
    labels: months.map(m => m.label),
    datasets: [
      {
        label: 'مصاريف الصيانة (ريال)',
        backgroundColor: '#0D3C61', // Primary Navy
        borderRadius: 6,
        data: months.map(m => costMap[m.key])
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: '#1E1E1E',
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (context) => ` ${context.raw.toLocaleString()} ريال`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0,0,0,0.05)'
      },
      ticks: {
        font: { family: 'Tajawal' }
      }
    },
    x: {
      grid: { display: false },
      ticks: {
        font: { family: 'Tajawal' }
      }
    }
  },
  font: {
    family: 'Tajawal'
  }
}
</script>
