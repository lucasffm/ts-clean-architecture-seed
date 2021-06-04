export type HttpRequest = {
  body: any;
  params: any;
};

export type HttpResponse<T = any> = {
  data?: T;
  headers?: any;
  status?: number;
};
