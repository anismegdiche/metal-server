declare module '#auth-utils' {
  interface User {
    username: string
    roles: string[]
  }

  interface SecureSessionData {
    token: string
  }
}

export {}
