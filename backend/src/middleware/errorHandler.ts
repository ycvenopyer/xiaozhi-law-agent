import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import multer from 'multer'
import { createLogger } from '../config/logger'

const logger = createLogger('ErrorHandler')

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ status: 'error', message: '文件超过 4 MiB，请压缩或拆分后重试。' })
  }
  if ('type' in err && err.type === 'entity.too.large') {
    return res.status(413).json({ status: 'error', message: '请求内容超过 5 MiB，请减少图片、附件或历史消息后重试。' })
  }
  // Zod validation errors
  if (err instanceof ZodError) {
    logger.warn(
      {
        method: req.method,
        url: req.url,
        errors: err.errors,
      },
      'Validation error'
    )

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
  }

  // Application errors
  if (err instanceof AppError) {
    logger.warn(
      {
        method: req.method,
        url: req.url,
        statusCode: err.statusCode,
      },
      err.message
    )

    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    })
  }

  // Unknown errors
  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
    },
    'Unhandled error'
  )

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  })
}
