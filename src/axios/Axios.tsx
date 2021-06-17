import { AxiosRequestConfig, AxiosResponse } from "./types";
import AxiosInterceptorManager, {
  Interceptor,
} from "./AxiosInterceptorManager";
import qs from "qs";
import parseHeaders from "parse-headers";

const defaults: AxiosRequestConfig = {
  method: "get",
  timeout: 0,
  headers: {
    common: {
      name: "requestName",
      accept: "application/json",
    },
  },
  transformRequest: (data: any, headers: any) => {
    headers["common"]["content-type"] = "application/json";
    return JSON.stringify(data);
  },
  transformResponse: (response: any) => {
    return response.data;
  },
};

const getStyleMethods = ["get", "head", "delete", "options"];
getStyleMethods.forEach((method: string) => {
  defaults.headers![method] = {};
});

const postStyleMethods = ["put", "post", "patch"];
postStyleMethods.forEach((method: string) => {
  defaults.headers![method] = {
    "content-type": "application/json",
  };
});

const allMethods = [...getStyleMethods, ...postStyleMethods];
export default class Axios<T> {
  public defaults: AxiosRequestConfig = defaults;
  public interceptors = {
    request: new AxiosInterceptorManager<AxiosRequestConfig>(),
    response: new AxiosInterceptorManager<AxiosResponse<T>>(),
  };

  request(
    config: AxiosRequestConfig
  ): Promise<AxiosRequestConfig | AxiosResponse<T>> {
    config.headers = Object.assign(this.defaults.headers, config.headers);
    if (config.transformRequest && config.data) {
      config.data = config.transformRequest(config.data, config.headers);
    }
    const chain: Array<
      Interceptor<AxiosRequestConfig> | Interceptor<AxiosResponse<T>>
    > = [{ onFulfilled: this.dispatchRequest }];

    this.interceptors.request.interceptors.forEach(
      (interceptor: Interceptor<AxiosRequestConfig> | null) => {
        // 向数组的左侧添加一个元素
        interceptor && chain.unshift(interceptor);
      }
    );

    this.interceptors.response.interceptors.forEach(
      (interceptor: Interceptor<AxiosResponse<T>> | null) => {
        interceptor && chain.push(interceptor);
      }
    );

    let promise: Promise<any> = Promise.resolve(config);
    while (chain.length) {
      const { onFulfilled, onRejected } = chain.shift()!;
      promise = promise.then(onFulfilled, onRejected);
    }

    return promise;
  }

  dispatchRequest<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return new Promise<AxiosResponse<T>>((resolve, reject) => {
      let { method, url, params, headers, data, timeout } = config;
      const request = new XMLHttpRequest();
      if (params) {
        params = qs.stringify(params);
        url += (url!.indexOf("?") === -1 ? "?" : "&") + params;
      }

      request.open(method!, url!, true);
      request.responseType = "json";
      request.onreadystatechange = () => {
        if (request.readyState === 4 && request.status != 0) {
          if (request.status >= 200 && request.status < 300) {
            let response: AxiosResponse<T> = {
              data: request.response ? request.response : request.responseText,
              status: request.status,
              statusText: request.statusText,
              headers: parseHeaders(request.getAllResponseHeaders()),
              config,
              request,
            };
            if (config.transformResponse) {
              response = config.transformResponse(response);
            }
            resolve(response);
          } else {
            reject(`Error: Request failed with status code ${request.status}`);
          }
        }
      };

      if (headers) {
        for (let key in headers) {
          if (key === "common" || allMethods.includes(key)) {
            if (key === "common" || key === config.method) {
              for (let key2 in headers[key]) {
                request.setRequestHeader(key2, headers[key][key2]);
              }
            }
          } else {
            request.setRequestHeader(key, headers[key]);
          }
        }
      }

      let body: string | null = "";

      if (data) {
        body = JSON.stringify(data);
      }
      request.onerror = () => reject("net:error");
      if (timeout) {
        request.timeout = timeout;
        request.ontimeout = () => reject("Error: timeout");
      }

      if (config.cancelToken) {
        config.cancelToken.then((message: string) => {
          request.abort();
          reject(message);
        });
      }

      request.send(body);
    });
  }
}
