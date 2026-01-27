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
      <div v-else class="empty-chart-state d-flex flex-column align-center justify-center py-10">
        <div class="empty-icon mb-4">
          <v-icon size="48" color="white">mdi-chart-areaspline</v-icon>
        </div>
        <h4 class="text-h6 font-weight-bold mb-2">لا توجد مصاريف مسجلة</h4>
        <p class="text-body-2 text-medium-emphasis mb-4 text-center" style="max-width: 280px;">
          سجّل أول صيانة لسيارتك لتبدأ في رؤية تحليل المصاريف
        </p>
        <v-btn 
          color="primary" 
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="$emit('add-record')"
        >
          أضف أول صيانة
        </v-btn>
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

const emit = defineEmits(['add-record'])

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

<style scoped>
.empty-chart-state {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.03), rgba(var(--v-theme-primary), 0.08));
  border-radius: 16px;
  margin: 0 16px 16px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)), #1565C0);
  box-shadow: 0 8px 24px rgba(var(--v-theme-primary), 0.3);
}
</style>
