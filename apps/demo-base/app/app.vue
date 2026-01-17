<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'App',
});

const {fetchUser} = useAuth();
await useAsyncData('UserData', fetchUser);
</script>
