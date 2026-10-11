<template>
  <time class="clock" :datetime="currentTime">
    {{ currentTime }}
  </time>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const beijingTimeZone = 'Asia/Shanghai'
const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: beijingTimeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const currentTime = ref(formatCurrentTime())
let updateTimer: number | undefined

function formatCurrentTime() {
  return timeFormatter.format(new Date())
}

function updateTime() {
  currentTime.value = formatCurrentTime()
}

onMounted(() => {
  updateTimer = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  if (updateTimer !== undefined) {
    window.clearInterval(updateTimer)
  }
})
</script>

<style scoped>
.clock {
  color: #fff;
  font-size: clamp(4rem, 5vw, 6rem);
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 6px 16px rgb(15 23 42 / 42%);
  white-space: nowrap;
}
</style>
