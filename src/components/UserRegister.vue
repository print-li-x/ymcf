<template>
  <div class="user-register">
    <n-card title="用户注册" style="max-width: 400px; margin: 50px auto;">
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
        <n-form-item label="确认密码" path="confirmPassword">
          <n-input
            v-model:value="formValue.confirmPassword"
            type="password"
            placeholder="请再次输入密码"
            show-password-on="mousedown"
          />
        </n-form-item>
        <n-form-item>
          <n-button
            :loading="loading"
            type="primary"
            style="width: 100%;"
            @click="handleRegister"
          >
            注册
          </n-button>
        </n-form-item>
      </n-form>
      <n-p style="text-align: center; color: #999;">
        已有账号？<n-a href="#" @click.prevent="$emit('showLogin')">直接登录</n-a>
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
  confirmPassword: '',
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
  confirmPassword: [
    {
      required: true,
      message: '请再次输入密码',
      trigger: ['blur', 'input'],
    },
    {
      validator: (rule, value) => value === formValue.value.password,
      message: '两次输入的密码不一致',
      trigger: ['blur', 'input'],
    },
  ],
};

const emit = defineEmits(['registerSuccess', 'showLogin']);

const handleRegister = (e) => {
  e.preventDefault();
  formRef.value?.validate(async (errors) => {
    if (!errors) {
      loading.value = true;
      try {
        await axios.post('http://localhost:8000/users/create', {
          username: formValue.value.username,
          password: formValue.value.password,
        });
        message.success('注册成功！请登录');
        emit('registerSuccess'); 
      } catch (error) {
        message.error('注册失败，请检查用户名是否已存在或网络服务');
        console.error('Register error:', error);
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>