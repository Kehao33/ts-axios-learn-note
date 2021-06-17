import axios, { AxiosResponse } from "./axios";
import { isCancel } from "./axios/cancel";
const baseURL = "http://localhost:8080";
// 他指向的是服务器返回的对象
interface User {
  name: string;
  password: string;
}

const user: User = { name: "jakeQuc", password: "test1234" };
const cancelToken = axios.cancelToken;
const source = cancelToken.source();

axios({
  method: "post",
  url: baseURL + "/post",
  headers: {},
  cancelToken: source.token,
  timeout: 1000,
  data: user,
})
  .then((response: AxiosResponse<User>) => {
    console.log(response);
  })
  .catch((err: any) => {
    isCancel(err)
      ? console.log("isCancel 取消请求")
      : console.log("err: ", err);
  });

source.cancel("用户取消了请求");
