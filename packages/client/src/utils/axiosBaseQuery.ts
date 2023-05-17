import type { BaseQueryFn } from '@reduxjs/toolkit/query'
import type { AxiosRequestConfig, AxiosError } from 'axios'
import { request } from './request'

export const axiosBaseQuery: BaseQueryFn<
  {
    url: string
    method: AxiosRequestConfig['method']
    data?: AxiosRequestConfig['data']
    params?: AxiosRequestConfig['params']
  },
  unknown,
  unknown
> = async ({ url, method, data, params }) => {
  try {
    const result = await request({ url: url, method, data, params })
    return { data: result.data }
  } catch (axiosError) {
    const err = axiosError as AxiosError
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data || err.message,
      },
    }
  }
}
