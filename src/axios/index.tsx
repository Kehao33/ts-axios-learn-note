import Axios from "./Axios";
import { AxiosInstance } from "./types";
import { CancelToken, isCancel } from "./cancel";
// 可以创建一个axios的实例，axios其实就是一个函数
// 定义一个类的时候，一个类的原型， Axios.prototype一个类的实例
const createInstance = (): AxiosInstance => {
  const context: Axios<any> = new Axios(); // this指上下文
  // 让request方法里的this永远执行context也是是new Axios();
  let instance = Axios.prototype.request.bind(context);
  instance = Object.assign(instance, Axios.prototype, context);
  return instance as AxiosInstance;
};

const axios = createInstance();
axios.cancelToken = new CancelToken();
axios.isCancel = isCancel;

export default axios;
export * from "./types";
