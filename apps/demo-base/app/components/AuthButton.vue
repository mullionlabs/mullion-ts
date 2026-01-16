<template>
  <div class="auth-button">
    <UButton
      v-if="!isAuthenticated"
      icon="i-lucide-log-in"
      label="Sign In"
      color="primary"
      variant="solid"
      size="sm"
      @click="signIn"
    />
    <UButton
      v-else
      icon="i-lucide-log-out"
      label="Sign Out"
      color="neutral"
      variant="ghost"
      size="sm"
      @click="signOut"
    />
  </div>
</template>

<script lang="ts" setup>
defineOptions({
  name: 'AuthButton',
});

const { isAuthenticated, signIn, signOut, fetchUser } = useAuth();

// Fetch user on mount (client-side only)
onMounted(() => {
  fetchUser();
});
</script>

<style lang="scss">
.auth-button {
  display: flex;
  align-items: center;
}
</style>
