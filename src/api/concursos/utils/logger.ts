import { Request, Response, NextFunction } from 'express';

interface LogData {
    [key: string]: unknown;
}

class Logger {
    getTimestamp(): string {
        return new Date().toISOString();
    }

    formatMessage(level: string, message: string, data?: LogData): string {
        const timestamp = this.getTimestamp();
        const dataStr = data ? ` ${JSON.stringify(data)}` : '';
        return `[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr}`;
    }

    error(message: string, data?: LogData): void {
        console.error(this.formatMessage('error', message, data));
    }

    warn(message: string, data?: LogData): void {
        console.warn(this.formatMessage('warn', message, data));
    }

    info(message: string, data?: LogData): void {
        console.info(this.formatMessage('info', message, data));
    }

    http(message: string, data?: LogData): void {
        console.log(this.formatMessage('http', message, data));
    }

    debug(message: string, data?: LogData): void {
        console.debug(this.formatMessage('debug', message, data));
    }
}

const logger = new Logger();

// Função para logar requisições HTTP
export const logRequest = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData: LogData = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
        };
        
        if (res.statusCode >= 400) {
            logger.warn('HTTP Request', logData);
        } else {
            logger.http('HTTP Request', logData);
        }
    });
    next();
};

// Função para logar erros
export const logError = (error: Error, req?: Request) => {
    const errorData: LogData = {
        message: error.message,
        stack: error.stack,
        url: req?.originalUrl,
        method: req?.method,
        ip: req?.ip,
        userAgent: req?.get('User-Agent'),
    };
    logger.error('Error occurred', errorData);
};

// Função para logar informações de segurança
export const logSecurity = (event: string, data: LogData) => {
    logger.warn(`Security Event: ${event}`, data);
};

// Função para logar informações de performance
export const logPerformance = (operation: string, duration: number, metadata: LogData) => {
    const perfData: LogData = {
        operation,
        duration: `${duration}ms`,
        ...metadata,
    };
    
    if (duration > 1000) {
        logger.warn('Slow operation detected', perfData);
    } else {
        logger.info('Performance log', perfData);
    }
};

// Função para logar informações de negócio
export const logBusiness = (event: string, data: LogData) => {
    logger.info(`Business Event: ${event}`, data);
};

// Função para logar informações de debug
export const logDebug = (message: string, data?: LogData) => {
    logger.debug(message, data);
};

// Função para logar informações gerais
export const logInfo = (message: string, data?: LogData) => {
    logger.info(message, data);
};

// Função para logar avisos
export const logWarn = (message: string, data?: LogData) => {
    logger.warn(message, data);
};

// Função para logar erros
export const logErrorMsg = (message: string, data?: LogData) => {
    logger.error(message, data);
};

// Exportar o logger padrão
export default logger;
