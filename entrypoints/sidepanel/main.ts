// 侧边栏应用入口：安装 Ant Design Vue、全局样式并挂载根组件。
import { createApp } from 'vue';
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App from './App.vue';
import './style.css';

createApp(App).use(Antd).mount('#app');
