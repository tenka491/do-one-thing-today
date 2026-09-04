<script setup>
import { reactive, ref, computed, watch, onMounted, onUnmounted } from "vue";
import { load, save, makeTask } from "./storage.js";
import { loadPrefs, savePrefs } from "./prefs.js";
import * as stats from "./stats.js";

const version = __APP_VERSION__;

const state = reactive(load());
const prefs = reactive(loadPrefs());
const newTask = ref("");
const showHint = ref(false);
const showSettings = ref(false);
const settingsWrap = ref(null);

// Close the settings panel on any click outside it.
const handleClickOutside = (e) => {
  if (showSettings.value && settingsWrap.value && !settingsWrap.value.contains(e.target)) {
    showSettings.value = false;
  }
};
onMounted(() => document.addEventListener("click", handleClickOutside));
onUnmounted(() => document.removeEventListener("click", handleClickOutside));

// Today's date as a local YYYY-MM-DD string — shared with stats.js so the two
// can't disagree on what day it is.
const today = stats.dateStr;

// Persist on any change to the state tree or the display preferences.
watch(state, () => save(state), { deep: true });
watch(prefs, () => savePrefs(prefs), { deep: true });

const anyStatVisible = computed(
  () => prefs.showStreak || prefs.showBest || prefs.showBestDay
);

const todaysTasks = computed(() => state.days[today()]?.tasks ?? []);

// Only one open (uncompleted) task at a time — finish it before adding another.
const hasPendingTask = computed(() => todaysTasks.value.some((t) => !t.completed));

// Today's list, filtered by the "show completed" preference.
const visibleTodaysTasks = computed(() =>
  prefs.showCompleted ? todaysTasks.value : todaysTasks.value.filter((t) => !t.completed)
);

const currentStreak = computed(() => stats.currentStreak(state.days, today()));

const bestStreak = computed(() =>
  Math.max(stats.bestStreak(state.days), state.meta.bestStreakFloor || 0)
);

const bestDay = computed(() => stats.bestDay(state.days));

// Past days (excludes today), most recent first.
const pastDays = computed(() =>
  Object.keys(state.days)
    .filter((date) => date !== today())
    .sort()
    .reverse()
);

const addTask = () => {
  if (hasPendingTask.value) return;
  const text = newTask.value.trim();
  if (!text) {
    showHint.value = true;
    return;
  }
  const key = today();
  if (!state.days[key]) state.days[key] = { tasks: [] };
  state.days[key].tasks.push(makeTask(text, false));
  newTask.value = "";
  showHint.value = false;
};

const toggleTask = (dayKey, id) => {
  const task = state.days[dayKey]?.tasks.find((t) => t.id === id);
  if (!task) return;
  task.completed = !task.completed;
  task.completedAt = task.completed ? Date.now() : null;
};
</script>

<template>
  <main>
    <div class="header">
      <h1>Do One Thing Today</h1>
      <div ref="settingsWrap" class="settings-wrap">
        <button
          class="settings-btn"
          aria-label="Toggle stat visibility"
          @click="showSettings = !showSettings"
        >
          ⚙️
        </button>
        <div v-if="showSettings" class="settings-panel">
          <label class="switch-row">
            <span>Streak</span>
            <span class="switch"><input type="checkbox" v-model="prefs.showStreak" /><span class="slider"></span></span>
          </label>
          <label class="switch-row">
            <span>Best streak</span>
            <span class="switch"><input type="checkbox" v-model="prefs.showBest" /><span class="slider"></span></span>
          </label>
          <label class="switch-row">
            <span>Best day</span>
            <span class="switch"><input type="checkbox" v-model="prefs.showBestDay" /><span class="slider"></span></span>
          </label>
          <hr class="settings-divider" />
          <label class="switch-row">
            <span>Show history</span>
            <span class="switch"><input type="checkbox" v-model="prefs.showHistory" /><span class="slider"></span></span>
          </label>
          <label class="switch-row">
            <span>Show completed</span>
            <span class="switch"><input type="checkbox" v-model="prefs.showCompleted" /><span class="slider"></span></span>
          </label>
        </div>
      </div>
    </div>

    <div v-if="anyStatVisible" class="stats">
      <div v-if="prefs.showStreak" class="stat">
        <div class="stat-label">🔥 Streak</div>
        <div class="stat-value">{{ currentStreak }}</div>
      </div>
      <div v-if="prefs.showBest" class="stat">
        <div class="stat-label">🏆 Best</div>
        <div class="stat-value">{{ bestStreak }}</div>
      </div>
      <div v-if="prefs.showBestDay" class="stat">
        <div class="stat-label">⭐ Best day</div>
        <div class="stat-value">{{ bestDay?.count ?? 0 }}</div>
        <div v-if="bestDay" class="stat-sub">{{ bestDay.date }}</div>
      </div>
    </div>
    <p v-else class="muted">Stats hidden — ⚙️ to show them.</p>

    <div v-if="!hasPendingTask" class="add-row">
      <input
        v-model="newTask"
        placeholder="What’s the one thing?"
        @keyup.enter="addTask"
      />
      <button @click="addTask">Add</button>
    </div>
    <p v-if="hasPendingTask" class="muted">Finish today's task to add another.</p>
    <p v-if="showHint" class="hint">Enter a task first.</p>

    <ul v-if="visibleTodaysTasks.length" class="task-list">
      <li v-for="task in visibleTodaysTasks" :key="task.id" class="task-row">
        <button
          class="toggle"
          :aria-pressed="task.completed"
          @click="toggleTask(today(), task.id)"
        >
          {{ task.completed ? "✓" : "○" }}
        </button>
        <span :class="{ done: task.completed }">{{ task.text }}</span>
      </li>
    </ul>
    <p v-else-if="todaysTasks.length" class="muted">All done for today.</p>
    <p v-else class="muted">No tasks yet today.</p>

    <div v-if="prefs.showHistory" class="history">
      <p v-if="!pastDays.length" class="muted">Nothing here yet.</p>
      <div v-for="date in pastDays" :key="date" class="history-day">
        <h3>{{ date }}</h3>
        <ul class="task-list">
          <li
            v-for="task in state.days[date].tasks"
            :key="task.id"
            class="task-row"
          >
            <span class="toggle-static">{{ task.completed ? "✓" : "○" }}</span>
            <span :class="{ done: task.completed }">{{ task.text }}</span>
          </li>
        </ul>
      </div>
    </div>

    <footer>Local only · No accounts · Zero clutter · v{{ version }}</footer>
  </main>
</template>
