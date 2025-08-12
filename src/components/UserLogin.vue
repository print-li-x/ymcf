<template>
  <div class="user-login">
    <n-card title="用户登录" style="max-width: 400px; margin: 50px auto;">
      <n-form
        ref="formRef"
        :model="formValue"
        :rules="rules"
        label-placement="left"
        :label-width="80"
      >
        <n-form-item label="用户名" path="username">
          <n-input v-model:value="formValue.username" placeholder="请输入用户名" />
        </n-form-item>
        <n-form-item label="密码" path="password">
          <n-input
            v-model:value="formValue.password"
            type="password"
            placeholder="请输入密码"
            show-password-on="mousedown"
          />
        </n-form-item>
        <n-form-item>
          <n-button
            :loading="loading"
            type="primary"
            style="width: 100%;"
            @click="handleLogin"
          >
            登录
          </n-button>
        </n-form-item>
      </n-form>
      <n-p style="text-align: center; color: #999;">
        还没有账号？<n-a href="#" @click.prevent="$emit('showRegister')">注册新用户</n-a>
      </n-p>
    </n-card>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { NCard, NForm, NFormItem, NInput, NButton, NP, NA, useMessage } from 'naive-ui';
import axios from 'axios';

const message = useMessage();
const formRef = ref(null);
const loading = ref(false);

const formValue = ref({
  username: '',
  password: '',
});

const rules = {
  username: {
    required: true,
    message: '请输入用户名',
    trigger: ['blur', 'input'],
  },
  password: {
    required: true,
    message: '请输入密码',
    trigger: ['blur', 'input'],
  },
};

const emit = defineEmits(['loginSuccess', 'showRegister']);

const handleLogin = (e) => {
  e.preventDefault();
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      loading.value = true;
      try {
        const response = await axios.post('http://localhost:8000/users/login', formValue.value);
        if (response.data.username) {
          message.success('登录成功！');
          emit('loginSuccess', response.data.username); 
        } else {
          message.error('登录失败，请检查用户名或密码');
        }
      } catch (error) {
        message.error('登录失败，请检查网络或后端服务');
        console.error('Login error:', error);
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>