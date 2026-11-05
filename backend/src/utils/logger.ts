export const logger = {
  info: (tag: string, message: string, data?: any) => {
    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
    console.log(
      `\x1b[36m[${time}] [INFO] [${tag}]\x1b[0m ${message}`,
      data !== undefined ? data : "",
    );
  },
  success: (tag: string, message: string, data?: any) => {
    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
    console.log(
      `\x1b[32m[${time}] [SUCCESS] [${tag}]\x1b[0m ${message}`,
      data !== undefined ? data : "",
    );
  },
  warn: (tag: string, message: string, data?: any) => {
    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
    console.warn(
      `\x1b[33m[${time}] [WARN] [${tag}]\x1b[0m ${message}`,
      data !== undefined ? data : "",
    );
  },
  error: (tag: string, message: string, error?: any) => {
    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
    console.error(
      `\x1b[31m[${time}] [ERROR] [${tag}]\x1b[0m ${message}`,
      error !== undefined ? error : "",
    );
  },
  ml: (message: string, data?: any) => {
    const time = new Date().toLocaleTimeString("id-ID", { hour12: false });
    console.log(
      `\x1b[35m[${time}] [ML-NATIVE] \x1b[0m${message}`,
      data !== undefined ? data : "",
    );
  },
};
