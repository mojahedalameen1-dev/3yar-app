<template>
  <v-card class="rounded-xl elevation-0 border" :loading="loading">
    <v-card-title class="d-flex align-center py-4 px-6">
      <v-icon color="primary" class="me-2">mdi-chart-bar</v-icon>
      <span class="text-h6 font-weight-bold">تحليل المصاريف</span>
      <v-spacer></v-spacer>
      <div class="text-caption text-medium-emphasis">آخر 6 أشهر</div>
    </v-card-title>
    
    <v-card-text class="pb-6">
      <div v-if="insights.trendHasCostData" role="img" :aria-label="chartSummary" style="height: 250px; position: relative;">
        <span class="sr-only">{{ chartSummary }}</span>
        <Bar :data="chartData" :options="chartOptions" aria-hidden="true" />
      </div>
      <div v-else class="empty-chart-state d-flex flex-column align-center justify-center py-10">
        <div class="empty-icon mb-4">
          <v-icon size="48" color="white">mdi-chart-areaspline</v-icon>
        </div>
        <h4 class="text-h6 font-weight-bold mb-2">{{ emptyTitle }}</h4>
        <p class="text-body-2 text-medium-emphasis mb-4 text-center" style="max-width: 280px;">
          {{ emptyDescription }}
        </p>
        <v-btn 
          v-if="records.length === 0"
          color="primary" 
          variant="tonal"
          prepend-icon="mdi-plus"
          @click="emit('add-record')"
        >
          سجّل أول صيانة
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'
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
import { computeMaintenanceCostInsightsV1 } from '@/lib/maintenance-cost-insights-v1'

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

const insights = computed(() => computeMaintenanceCostInsightsV1(props.records))
const emptyTitle = computed(() => {
  if (props.records.length === 0) return 'لا توجد سجلات صيانة بعد'
  if (insights.value.knownCostRecords === 0) return 'لا توجد تكاليف مسجلة'
  return 'لا توجد تكاليف مسجلة خلال آخر 6 أشهر'
})
const emptyDescription = computed(() => {
  if (props.records.length === 0) return 'سجّل أول صيانة لسيارتك لتبدأ في متابعة مصاريفها.'
  if (insights.value.knownCostRecords === 0) return 'أضف تكلفة لبعض عمليات الصيانة لعرض تحليل المصاريف.'
  return 'توجد تكاليف مسجلة، لكن لا توجد عمليات بتكلفة معروفة ضمن الفترة المعروضة.'
})
const chartSummary = computed(() => {
  const total = insights.value.monthlyTrend.reduce((sum, bucket) => sum + bucket.totalCost, 0)
  return `مصاريف الصيانة خلال آخر 6 أشهر، الإجمالي ${total.toLocaleString('ar-SA')} ريال سعودي.`
})

const chartData = computed(() => {
  return {
    labels: insights.value.monthlyTrend.map(bucket => dayjs(bucket.date).locale('ar').format('MMM YY')),
    datasets: [
      {
        label: 'مصاريف الصيانة (ريال)',
        backgroundColor: '#0D3C61', // Primary Navy
        borderRadius: 6,
        data: insights.value.monthlyTrend.map(bucket => bucket.totalCost)
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top'
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
