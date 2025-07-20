<template>
  <q-page class="flex flex-center column">

    <div class="row justify-center q-gutter-xl btn-row">
      <q-btn
        to="/send"
        unelevated
        size="xl"
        icon="send"
        label="Send a File"
        class="big-btn"
      />

      <q-btn
        to="/request/PLACEHOLDER"
        unelevated
        size="xl"
        icon="download"
        label="Receive a File"
        class="big-btn"
      />
    </div>
  </q-page>
</template>

<script setup>
// no extra logic
</script>

<style scoped lang="scss">
.btn-row {
  flex-wrap: nowrap;
  margin-top: 2rem;
}

.big-btn {
  min-width: 400px;
  min-height: 130px;
  font-size: 1.5rem;
  background: #f6f7f8;
  color: #455a64;
  border: 2px solid #c4c6c8;
  border-radius: 20px;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
  transition: transform .2s, box-shadow .2s, background .2s;

  &:hover {
    background: #ffffff;
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
  }
  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 10px rgba(0,0,0,0.2) inset;
  }
}
</style>
