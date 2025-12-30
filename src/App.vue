<script setup>
import { ref, onMounted } from "vue";

const STORAGE_KEY = "do-one-thing-today";

const task = ref("");
const taskEntered = ref(false);
const completed = ref(false);
const streak = ref(0);
const lastCompletedDate = ref(null);

// Helper to get today's date string
const today = () => new Date().toISOString().split("T")[0];

onMounted(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const data = JSON.parse(saved);
    // Only load task if it's for today
    if (data.savedDate === today()) {
      task.value = data.task || "";
      completed.value = data.completed || false;
    }
    streak.value = data.streak || 0;
    lastCompletedDate.value = data.lastCompletedDate || null;
  }
});

// Save current state to localStorage
const saveState = () => {
  const toSave = {
    savedDate: today(),
    task: task.value,
    completed: completed.value,
    streak: streak.value,
    lastCompletedDate: lastCompletedDate.value,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
};

// Mark the task done and update streak
const markDone = () => {
  if (completed.value) return;

  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  streak.value = lastCompletedDate.value === yesterday ? streak.value + 1 : 1;

  completed.value = true;
  lastCompletedDate.value = today();
  saveState();
};

// Save task when pressing Enter or clicking button
const saveTask = () => {
  if (!task.value.trim()) {
    alert("Please enter a task for today.");
    return;
  }
  saveState();
  taskEntered.value = true;
};
</script>

<template>
  <main>
    <h1>Do One Thing Today</h1>

    <div class="streak">
      🔥 Streak: <strong>{{ streak }}</strong>
    </div>

    <div v-if="!taskEntered">
      <input
        v-model="task"
        placeholder="What’s the one thing?"
        @keyup.enter="saveTask"
      />
      <button @click="saveTask">Save</button>
    </div>

    <div v-else>
      <p :class="{ done: completed }">{{ task }}</p>
      <button @click="markDone">
        {{ completed ? "Done ✓" : "Mark Done" }}
      </button>
    </div>

    <footer>Local only · No accounts · Zero clutter</footer>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #fff;
}

main {
  max-width: 420px;
  margin: 40px auto;
  padding: 20px;
}

input {
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  font-size: 1em;
}

button {
  padding: 10px 14px;
  cursor: pointer;
  font-size: 1em;
}

.done {
  text-decoration: line-through;
  color: #888;
}

.streak {
  margin-bottom: 20px;
  font-size: 1.1em;
}

footer {
  margin-top: 40px;
  font-size: 0.85em;
  color: #777;
}
</style>
